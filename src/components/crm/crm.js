// =====================================================================
// CRM das Leads: constantes e contas partilhadas (sem React).
// Tabelas: marketing_leads (campos do CRM na migração 083) e
// marketing_leads_interacoes (histórico). Ver docs/modulos/clientes-e-comercial.md.
// =====================================================================
import { supabase } from "../../services/supabase";

/** Etapas do funil, por ordem. `prob` = probabilidade por omissão (%) */
export const ETAPAS = [
  { valor: "novo", label: "Novo", cor: "#64748b", prob: 10 },
  { valor: "contactado", label: "Contactado", cor: "#0ea5e9", prob: 25 },
  { valor: "reuniao", label: "Reunião", cor: "#8b5cf6", prob: 50 },
  { valor: "proposta", label: "Proposta", cor: "#f59e0b", prob: 70 },
  { valor: "convertido", label: "Ganho", cor: "#16a34a", prob: 100 },
  { valor: "perdido", label: "Perdido", cor: "#ef4444", prob: 0 },
];
export const ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.valor, e]));
/** Etapas "em aberto" (contam para o funil, para esquecidas e lembretes) */
export const ABERTAS = ["novo", "contactado", "reuniao", "proposta"];

/** Tipos de interação no histórico */
export const TIPOS_INTERACAO = [
  { valor: "chamada", label: "Chamada" },
  { valor: "email", label: "Email" },
  { valor: "reuniao", label: "Reunião" },
  { valor: "proposta", label: "Proposta" },
  { valor: "nota", label: "Nota" },
];

/** Origens sugeridas (o campo aceita outras). "Importação CSV" e "Prospeção" são postas sozinhas. */
export const ORIGENS = ["Site", "Referência", "Evento", "Campanha email", "Redes sociais", "Contacto direto", "Prospeção", "Importação CSV", "Outra"];
export const SEM_ORIGEM = "Sem origem";

/** Estados das propostas comerciais (migração 027) */
export const ESTADOS_PROPOSTA = {
  em_preparacao: { label: "Em preparação", cor: "#64748b" },
  revisao: { label: "Em revisão", cor: "#0ea5e9" },
  enviada: { label: "Enviada", cor: "#8b5cf6" },
  analise: { label: "Em análise", cor: "#f59e0b" },
  ganha: { label: "Ganha", cor: "#16a34a" },
  perdida: { label: "Perdida", cor: "#ef4444" },
  // nomes antigos
  em_analise: { label: "Em análise", cor: "#f59e0b" },
  aprovada: { label: "Ganha", cor: "#16a34a" },
  arquivada: { label: "Perdida", cor: "#ef4444" },
};

/** Papéis que podem criar propostas (rota /dashboard/propostas) */
export const PAPEIS_PROPOSTAS = ["admin", "administrador"];

/**
 * Devolve o id da entidade (tabela clientes) desta lead: a já ligada, a que
 * tiver o mesmo NIF, ou uma nova (marca/entidade = nome da lead). Grava
 * marketing_leads.cliente_id. Lança erro se falhar.
 */
export async function garantirEntidade(lead) {
  if (lead.cliente_id) return lead.cliente_id;
  let id = null;
  const nif = String(lead.nif || "").trim();
  if (nif) {
    const { data, error } = await supabase.from("clientes").select("id").eq("nif", nif).limit(1);
    if (error) throw error;
    id = data?.[0]?.id ?? null;
  }
  if (!id) {
    const { data, error } = await supabase
      .from("clientes")
      .insert([{ marca: lead.nome, entidade: lead.nome, nif: nif || null, ativo: true }])
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }
  const { error: e2 } = await supabase.from("marketing_leads").update({ cliente_id: id }).eq("id", lead.id);
  if (e2) throw e2;
  return id;
}


/** Dias sem contacto até a lead contar como "esquecida" */
export const DIAS_ESQUECIDA = 7;

const DIA = 86400000;

/** Data de hoje (YYYY-MM-DD) na hora local */
export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Último sinal de vida: contacto registado, mudança de etapa ou criação */
export function ultimoMovimento(lead) {
  const datas = [lead.ultimo_contacto_em, lead.estado_desde, lead.created_at].filter(Boolean).map((d) => new Date(d).getTime());
  return datas.length ? Math.max(...datas) : null;
}

/** Dias desde o último movimento (null se não houver datas) */
export function diasParado(lead) {
  const t = ultimoMovimento(lead);
  return t == null ? null : Math.floor((Date.now() - t) / DIA);
}

export const estaAberta = (lead) => lead.ativo !== false && ABERTAS.includes(lead.estado);

/**
 * "Por tratar": ainda em Novo e sem responsável (ex.: acabada de importar por
 * CSV). É fila de trabalho, não conta como esquecida nem pede próximo passo.
 */
export const porTratar = (lead) => estaAberta(lead) && lead.estado === "novo" && !lead.responsavel_id;

/** Já trabalhada (tem responsável ou passou de Novo), em aberto e sem movimento há DIAS_ESQUECIDA+ dias */
export function estaEsquecida(lead) {
  if (!estaAberta(lead) || porTratar(lead)) return false;
  const d = diasParado(lead);
  return d != null && d >= DIAS_ESQUECIDA;
}

/** "atrasada" (data passou), "hoje", "breve" (≤3 dias) ou null */
export function estadoAcao(lead) {
  if (!lead.proxima_acao_em || !estaAberta(lead)) return null;
  const hoje = hojeISO();
  if (lead.proxima_acao_em < hoje) return "atrasada";
  if (lead.proxima_acao_em === hoje) return "hoje";
  const dif = (new Date(lead.proxima_acao_em) - new Date(hoje)) / DIA;
  return dif <= 3 ? "breve" : null;
}

/** Probabilidade efetiva: a da lead ou a da etapa */
export const probabilidade = (lead) => (lead.probabilidade ?? ETAPA[lead.estado]?.prob ?? 0);

/** Valor ponderado (valor × probabilidade) */
export const ponderado = (lead) => (Number(lead.valor) || 0) * probabilidade(lead) / 100;

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtCompacto = new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 });
/** 12 500 € (ou "—" se vazio) */
export const euros = (v) => (v == null || v === "" ? "—" : fmtEuro.format(Number(v) || 0));
/** 12,5 mil € — para totais de coluna */
export const eurosCurtos = (v) => `${fmtCompacto.format(Number(v) || 0)} €`;

const fmtData = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" });
const fmtDataAno = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric" });
/** "12 dez" (ou com ano se não for este ano) */
export function dataCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return (d.getFullYear() === new Date().getFullYear() ? fmtData : fmtDataAno).format(d).replace(".", "");
}

/** "hoje", "ontem", "há 3 dias", "há 2 sem.", "há 4 meses" */
export function haQuanto(iso) {
  if (!iso) return "";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 14) return `há ${dias} dias`;
  if (dias < 60) return `há ${Math.floor(dias / 7)} sem.`;
  return `há ${Math.floor(dias / 30)} meses`;
}

/** Iniciais para o avatar ("Ana Martins" → "AM") */
export const iniciais = (nome) => (nome || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

/**
 * Lembretes da próxima ação: cria uma notificação no sino para cada lead do
 * utilizador cuja ação chegou (data ≤ hoje) e ainda não foi lembrada para essa
 * data (lembrete_enviado_para). Chamado no Início (DashboardHome), no máximo
 * uma vez por dia e por browser. Devolve quantos lembretes criou.
 */
export async function gerarLembretesLeads(userId) {
  if (!userId) return 0;
  const chave = `bz-crm-lembretes-${userId}`;
  const hoje = hojeISO();
  try { if (localStorage.getItem(chave) === hoje) return 0; } catch { /* sem storage: segue */ }

  const { data, error } = await supabase
    .from("marketing_leads")
    .select("id, nome, proxima_acao, proxima_acao_em, lembrete_enviado_para, estado, ativo")
    .eq("responsavel_id", userId)
    .lte("proxima_acao_em", hoje)
    .in("estado", ABERTAS)
    .not("ativo", "is", false);
  if (error) {
    // sem a migração 083 (colunas em falta) não faz nada
    return 0;
  }
  const porLembrar = (data || []).filter((l) => l.lembrete_enviado_para !== l.proxima_acao_em);
  if (porLembrar.length) {
    const { error: e } = await supabase.from("notificacoes_projetos").insert(porLembrar.map((l) => ({
      user_id: userId,
      project_id: null,
      created_by: userId,
      tipo: "crm_lembrete",
      titulo: l.proxima_acao_em < hoje ? `Ação em atraso: ${l.nome}` : `Hoje: ${l.nome}`,
      mensagem: l.proxima_acao || "Próximo passo com esta lead.",
      link: `/dashboard/leads?lead=${l.id}`,
      is_read: false,
    })));
    if (e) { console.error("Erro ao criar lembretes do CRM:", e); return 0; }
    await Promise.all(porLembrar.map((l) =>
      supabase.from("marketing_leads").update({ lembrete_enviado_para: l.proxima_acao_em }).eq("id", l.id)));
  }
  try { localStorage.setItem(chave, hoje); } catch { /* ignora */ }
  return porLembrar.length;
}

/** Avisa (sino) a pessoa a quem foi atribuída uma lead por outra pessoa */
export async function avisarAtribuicao({ lead, responsavelId, autorId, autorNome }) {
  if (!responsavelId || responsavelId === autorId) return;
  const { error } = await supabase.from("notificacoes_projetos").insert([{
    user_id: responsavelId,
    project_id: null,
    created_by: autorId || null,
    tipo: "crm_atribuida",
    titulo: `Lead atribuída: ${lead.nome}`,
    mensagem: `${(autorNome || "Alguém").split(" ")[0]} passou-te esta lead.`,
    link: `/dashboard/leads?lead=${lead.id}`,
    is_read: false,
  }]);
  if (error) console.error("Erro ao avisar atribuição:", error);
}

// ---------- registo rápido de chamadas ----------
// Ao tocar num número (tel:) na ficha guarda-se a chamada; quando a pessoa volta
// à app, o CrmLeads mostra "Como correu?" (RegistoChamada.jsx).
const CHAVE_CHAMADA = "bz-crm-chamada";

/** Guarda a chamada que vai começar */
export function iniciarChamada({ leadId, leadNome, pessoa, telefone }) {
  try { localStorage.setItem(CHAVE_CHAMADA, JSON.stringify({ leadId, leadNome, pessoa, telefone, em: Date.now() })); } catch { /* sem storage */ }
}

/** Chamada por registar (só se tiver começado há menos de 3 horas) */
export function chamadaPendente() {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE_CHAMADA) || "null");
    if (!c || Date.now() - c.em > 3 * 3600000) return null;
    return c;
  } catch { return null; }
}

export function esquecerChamada() {
  try { localStorage.removeItem(CHAVE_CHAMADA); } catch { /* ignora */ }
}
