// Modelo dos "Recursos" da marca (tabela marketing_recursos).
// Campos com k em COLUNAS vão para colunas próprias; os restantes ficam em `dados`.
import { CANAIS } from "../../constants/marketing";

export const COLUNAS = ["titulo", "estado", "data", "data_fim"];

const est = (id, label, cor) => ({ id, label, cor });

export const TIPOS_CONVERSAO = [
  { id: "lead", label: "Lead / contacto" },
  { id: "inscricao", label: "Inscrição" },
  { id: "proposta", label: "Proposta enviada" },
  { id: "proposta_aceite", label: "Proposta aceite" },
  { id: "diagnostico", label: "Diagnóstico marcado" },
  { id: "vale", label: "Vale-formação" },
  { id: "venda", label: "Venda" },
];

export const TIPOS = {
  oferta: {
    label: "Catálogo",
    singular: "curso/serviço",
    icon: "Package",
    dica: "Uma ficha por curso ou serviço: a fonte única para datas, preço e duração nas peças.",
    estados: [est("ativa", "Ativa", "#10b981"), est("em_preparacao", "Em preparação", "#f59e0b"), est("suspensa", "Suspensa", "#94a3b8")],
    resumo: ["duracao", "preco", "modalidade"],
    campos: [
      { k: "titulo", label: "Nome", tipo: "text", wide: true },
      { k: "estado", label: "Estado", tipo: "estado" },
      { k: "codigo", label: "Sigla / código", tipo: "text" },
      { k: "area", label: "Área de formação", tipo: "text", hint: "ex.: 862" },
      { k: "duracao", label: "Duração", tipo: "text" },
      { k: "preco", label: "Preço", tipo: "text" },
      { k: "modalidade", label: "Modalidade", tipo: "text", hint: "presencial, online, b-learning…" },
      { k: "certificado", label: "Certificado / habilitação", tipo: "text", wide: true },
      { k: "publico", label: "Para quem", tipo: "text", wide: true },
      { k: "personas", label: "Personas", tipo: "text" },
      { k: "url", label: "Página do curso", tipo: "url" },
      { k: "notas", label: "Notas", tipo: "area", wide: true },
    ],
  },
  turma: {
    label: "Turmas",
    singular: "turma/evento",
    icon: "Calendar",
    dica: "Agenda de turmas e eventos: datas, local, vagas e se ainda há lugar.",
    estados: [est("planeada", "Planeada", "#94a3b8"), est("aberta", "Inscrições abertas", "#10b981"), est("esgotada", "Esgotada", "#f97316"), est("decorrida", "Decorrida", "#64748b"), est("cancelada", "Cancelada", "#ef4444")],
    resumo: ["local", "vagas"],
    datas: true,
    campos: [
      { k: "titulo", label: "Turma / evento", tipo: "text", wide: true },
      { k: "estado", label: "Estado", tipo: "estado" },
      { k: "oferta", label: "Curso", tipo: "oferta" },
      { k: "data", label: "Início", tipo: "date" },
      { k: "data_fim", label: "Fim", tipo: "date" },
      { k: "local", label: "Local", tipo: "text" },
      { k: "horario", label: "Horário", tipo: "text" },
      { k: "vagas", label: "Vagas", tipo: "number" },
      { k: "inscritos", label: "Inscritos", tipo: "number" },
      { k: "inscricoes_ate", label: "Inscrições até", tipo: "text" },
      { k: "notas", label: "Notas", tipo: "area", wide: true },
    ],
  },
  campanha: {
    label: "Campanhas",
    singular: "campanha",
    icon: "Flag",
    dica: "Agrupa peças com objetivo, período, orçamento e meta. As peças ligam-se pelo campo «Campanha / série».",
    estados: [est("planeada", "Planeada", "#94a3b8"), est("ativa", "Ativa", "#10b981"), est("concluida", "Concluída", "#6366f1"), est("cancelada", "Cancelada", "#ef4444")],
    resumo: ["kpi", "meta"],
    datas: true,
    campos: [
      { k: "titulo", label: "Nome", tipo: "text", wide: true, hint: "igual ao campo «Campanha / série» das peças" },
      { k: "estado", label: "Estado", tipo: "estado" },
      { k: "frente", label: "Frente da estratégia", tipo: "frente" },
      { k: "data", label: "Início", tipo: "date" },
      { k: "data_fim", label: "Fim", tipo: "date" },
      { k: "objetivo", label: "Objetivo", tipo: "text", wide: true },
      { k: "kpi", label: "KPI", tipo: "text" },
      { k: "meta", label: "Meta (número)", tipo: "text", hint: "ex.: 50" },
      { k: "conversao", label: "Conta como resultado", tipo: "select", opcoes: TIPOS_CONVERSAO, hint: "tipo de registo que soma para a meta" },
      { k: "orcamento", label: "Orçamento", tipo: "text" },
      { k: "gasto", label: "Gasto (€)", tipo: "number" },
      { k: "personas", label: "Personas", tipo: "text" },
      { k: "notas", label: "Notas", tipo: "area", wide: true },
    ],
  },
  lead: {
    label: "Leads",
    singular: "registo",
    icon: "Chart",
    dica: "Cada lead, inscrição, proposta ou venda que veio do marketing. É daqui que saem os números das metas.",
    estados: TIPOS_CONVERSAO.map((t, i) => est(t.id, t.label, ["#0ea5e9", "#10b981", "#f59e0b", "#16a34a", "#8b5cf6", "#ec4899", "#14b8a6"][i])),
    resumo: ["canal", "campanha", "quantidade"],
    estadoLabel: "Tipo",
    campos: [
      { k: "titulo", label: "Quem / descrição", tipo: "text", wide: true, hint: "empresa ou pessoa (sem dados sensíveis)" },
      { k: "estado", label: "Tipo", tipo: "estado" },
      { k: "data", label: "Data", tipo: "date" },
      { k: "quantidade", label: "Quantidade", tipo: "number", hint: "ex.: 4 formandos" },
      { k: "valor", label: "Valor (€)", tipo: "number" },
      { k: "canal", label: "Canal de origem", tipo: "canal" },
      { k: "campanha", label: "Campanha", tipo: "campanha" },
      { k: "oferta", label: "Curso", tipo: "oferta" },
      { k: "utm", label: "UTM / peça de origem", tipo: "text" },
      { k: "notas", label: "Notas", tipo: "area", wide: true },
    ],
  },
  ativo: {
    label: "Ativos",
    singular: "ativo",
    icon: "Image",
    dica: "Logótipos, selos, templates, fotografias e documentos. Fotografias de pessoas só com autorização registada.",
    estados: [est("aprovado", "Aprovado", "#10b981"), est("por_autorizar", "Por autorizar", "#f59e0b"), est("expirado", "Autorização expirada", "#ef4444"), est("obsoleto", "Obsoleto", "#94a3b8")],
    resumo: ["categoria", "autorizacao"],
    campos: [
      { k: "titulo", label: "Nome", tipo: "text", wide: true },
      { k: "estado", label: "Estado", tipo: "estado" },
      { k: "categoria", label: "Categoria", tipo: "select", opcoes: ["Logótipo", "Selo", "Template", "Fotografia", "Vídeo", "Documento", "Ícone", "Outro"].map((x) => ({ id: x, label: x })) },
      { k: "url", label: "Link / ficheiro", tipo: "url", wide: true },
      { k: "autorizacao", label: "Autorização de imagem", tipo: "select", opcoes: [{ id: "nao_aplica", label: "Não se aplica" }, { id: "sim", label: "Autorizado" }, { id: "pendente", label: "Pendente" }, { id: "recusada", label: "Recusada" }] },
      { k: "data_fim", label: "Autorização válida até", tipo: "date" },
      { k: "pessoas", label: "Pessoas que aparecem", tipo: "text", wide: true },
      { k: "notas", label: "Notas / onde usar", tipo: "area", wide: true },
    ],
  },
  facto: {
    label: "Factos",
    singular: "facto",
    icon: "Scale",
    dica: "Legislação e dados verificados, com fonte e data de revisão — e a lista do que a equipa ainda tem de confirmar.",
    estados: [est("a_confirmar", "A confirmar", "#ef4444"), est("a_rever", "Rever", "#f59e0b"), est("verificado", "Verificado", "#10b981"), est("desatualizado", "Desatualizado", "#94a3b8")],
    resumo: ["referencia", "rever_em"],
    campos: [
      { k: "titulo", label: "Facto / pergunta", tipo: "text", wide: true },
      { k: "estado", label: "Estado", tipo: "estado" },
      { k: "data", label: "Verificado em", tipo: "date" },
      { k: "referencia", label: "Referência", tipo: "text", wide: true, hint: "diploma, entidade…" },
      { k: "resumo", label: "O que diz / o que falta", tipo: "area", wide: true },
      { k: "fonte", label: "Fonte (link)", tipo: "url" },
      { k: "rever_em", label: "Rever em", tipo: "dateDados" },
      { k: "resposta", label: "Resposta / decisão", tipo: "area", wide: true },
    ],
  },
  regra: {
    label: "Regras",
    singular: "regra",
    icon: "Shield",
    dica: "Regras de comunicação da marca. Aparecem no Guia da marca ao escrever cada peça e no assistente de ideias.",
    estados: [est("nunca", "Nunca", "#ef4444"), est("sempre", "Sempre", "#10b981"), est("confirmar", "Confirmar antes", "#f59e0b")],
    resumo: ["porque"],
    campos: [
      { k: "titulo", label: "Regra", tipo: "text", wide: true },
      { k: "estado", label: "Tipo", tipo: "estado" },
      { k: "porque", label: "Porquê / exemplo", tipo: "area", wide: true },
    ],
  },
  canal: {
    label: "Canais",
    singular: "canal",
    icon: "Radio",
    dica: "Conta, link na bio, frequência e melhores horários de cada canal.",
    estados: [est("ativo", "Ativo", "#10b981"), est("pausado", "Pausado", "#94a3b8")],
    resumo: ["conta", "frequencia"],
    campos: [
      { k: "titulo", label: "Nome", tipo: "text" },
      { k: "estado", label: "Estado", tipo: "estado" },
      { k: "canal", label: "Canal", tipo: "canal" },
      { k: "conta", label: "Conta / endereço", tipo: "text" },
      { k: "url", label: "Link do perfil", tipo: "url" },
      { k: "link_bio", label: "Link na bio atual", tipo: "url" },
      { k: "frequencia", label: "Frequência", tipo: "text" },
      { k: "horarios", label: "Melhores horários", tipo: "text" },
      { k: "responsavel", label: "Responsável", tipo: "text" },
      { k: "tom", label: "Tom neste canal", tipo: "text", wide: true },
      { k: "notas", label: "Notas", tipo: "area", wide: true },
    ],
  },
};

export const ORDEM_TIPOS = ["oferta", "turma", "campanha", "lead", "ativo", "facto", "regra", "canal"];

export const estadoDe = (tipo, id) => TIPOS[tipo]?.estados.find((e) => e.id === id) || null;

/** Valor de um campo (coluna ou dados) */
export const valorDe = (r, k) => (COLUNAS.includes(k) ? r[k] : r?.dados?.[k]);

/** Patch para gravar um campo (coluna ou dentro de dados) */
export const patchCampo = (r, k, v) => (COLUNAS.includes(k) ? { [k]: v } : { dados: { ...(r.dados || {}), [k]: v } });

/** Primeiro número de um texto ("50 leads · 3 pilotos" → 50) */
export const numeroDe = (v) => {
  const m = String(v ?? "").replace(/\s/g, "").match(/\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(",", ".")) : null;
};

export const CANAIS_IDS = CANAIS.map((c) => c.id);

export const METRICAS_PECA = [
  { k: "alcance", label: "Alcance" },
  { k: "visualizacoes", label: "Visualizações" },
  { k: "interacoes", label: "Interações" },
  { k: "guardados", label: "Guardados" },
  { k: "partilhas", label: "Partilhas" },
  { k: "comentarios", label: "Comentários" },
  { k: "cliques", label: "Cliques" },
  { k: "leads", label: "Leads" },
];

/** Placeholders por preencher num texto: [datas], [preço], [TELEFONE]… */
export const PLACEHOLDER_RE = /\[(?:[^\]\n]{1,40})\]/g;
export function placeholdersDe(item) {
  const textos = [item?.cta, item?.cta_2, item?.headline, ...((item?.copies || []).map((c) => c?.texto))].filter(Boolean).join("\n");
  const achados = textos.match(PLACEHOLDER_RE) || [];
  // ignora marcações de guião comuns ("[Legenda Instagram]", "[Texto dos slides]"…)
  return [...new Set(achados)].filter((p) => !/legenda|texto|vers[aã]o|guião|guiao|stories|slides|mensagem|carrossel|reel|feed/i.test(p));
}
