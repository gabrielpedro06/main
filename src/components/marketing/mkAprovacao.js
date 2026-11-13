// Circuito de aprovação de conteúdos de marketing.
// Enviar para aprovação → notifica os aprovadores (sino do Dashboard).
// Aprovar / pedir alterações → muda a etapa e avisa a equipa de marketing.
// Basta uma decisão: a primeira pessoa a decidir fecha o pedido.
import { supabase } from "../../services/supabase";

export const ROLES_MARKETING = ["marketing", "marketing plus"];
export const TIPOS_NOTIF_MK = ["mk_aprovacao", "mk_aprovado", "mk_alteracoes"];

const linkConteudo = (id) => `/dashboard/marketing?conteudo=${id}`;
const agora = () => new Date().toISOString();
const hist = (c, entrada) => [...(Array.isArray(c.historico_aprovacao) ? c.historico_aprovacao : []), entrada];
const nomeCurto = (n) => (n || "").split(" ")[0] || "Alguém";

async function notificar(userIds, base) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  const { error } = await supabase.from("notificacoes_projetos").insert(ids.map((user_id) => ({ user_id, ...base })));
  if (error) console.error("Erro ao criar notificações de marketing:", error);
}

/** Equipa de marketing (perfis ativos com role de marketing), sem a pessoa indicada */
async function equipaMarketing(excluir) {
  const { data, error } = await supabase.from("profiles").select("id").eq("ativo", true).in("role", ROLES_MARKETING);
  if (error) { console.error("Erro ao carregar a equipa de marketing:", error); return []; }
  return (data || []).map((p) => p.id).filter((id) => id !== excluir);
}

/** Fecha (marca como lidos) os pedidos de aprovação pendentes desta peça para o próprio utilizador */
async function fecharPedidosProprios(conteudoId, userId) {
  await supabase
    .from("notificacoes_projetos")
    .update({ is_read: true, read_at: agora() })
    .eq("conteudo_id", conteudoId)
    .eq("user_id", userId)
    .eq("tipo", "mk_aprovacao")
    .eq("is_read", false);
}

/** Envia a peça para aprovação. Devolve o patch aplicado (ou lança erro). */
export async function enviarParaAprovacao(conteudo, aprovadores, user) {
  const ids = [...new Set((aprovadores || []).filter(Boolean))];
  if (!ids.length) throw new Error("Escolha pelo menos uma pessoa para aprovar.");
  const patch = {
    estado: "aprovacao",
    aprovadores: ids,
    enviado_aprovacao_por: user?.id || null,
    enviado_aprovacao_em: agora(),
    aprovado_por: null,
    aprovado_em: null,
    historico_aprovacao: hist(conteudo, { tipo: "enviado", por: user?.id || null, em: agora(), para: ids }),
  };
  const { error } = await supabase.from("marketing_conteudos").update(patch).eq("id", conteudo.id);
  if (error) throw error;
  await notificar(ids, {
    conteudo_id: conteudo.id,
    created_by: user?.id || null,
    tipo: "mk_aprovacao",
    titulo: "Conteúdo para aprovar",
    mensagem: `${nomeCurto(user?.nome)} pediu a sua aprovação: «${conteudo.titulo || "Sem título"}».`,
    link: linkConteudo(conteudo.id),
  });
  return patch;
}

/** Lê o estado atual (para não decidir sobre algo que outra pessoa já decidiu) */
async function estadoAtual(id) {
  const { data, error } = await supabase.from("marketing_conteudos").select("id, estado, titulo, historico_aprovacao, aprovado_por").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Este conteúdo já não existe.");
  return data;
}

export async function aprovar(conteudo, user) {
  const atual = await estadoAtual(conteudo.id);
  if (atual.estado !== "aprovacao") {
    await fecharPedidosProprios(conteudo.id, user?.id);
    throw new Error("Este conteúdo já não está à espera de aprovação (outra pessoa já decidiu ou foi alterado).");
  }
  const patch = {
    estado: "programacao",
    aprovado_por: user?.id || null,
    aprovado_em: agora(),
    historico_aprovacao: hist(atual, { tipo: "aprovado", por: user?.id || null, em: agora() }),
  };
  const { error } = await supabase.from("marketing_conteudos").update(patch).eq("id", conteudo.id);
  if (error) throw error;
  await fecharPedidosProprios(conteudo.id, user?.id);
  await notificar(await equipaMarketing(user?.id), {
    conteudo_id: conteudo.id,
    created_by: user?.id || null,
    tipo: "mk_aprovado",
    titulo: "Conteúdo aprovado",
    mensagem: `${nomeCurto(user?.nome)} aprovou «${atual.titulo || "Sem título"}». Já pode ser agendado.`,
    link: linkConteudo(conteudo.id),
  });
  return patch;
}

export async function pedirAlteracoes(conteudo, texto, user) {
  const t = String(texto || "").trim();
  if (!t) throw new Error("Descreva as alterações necessárias.");
  const atual = await estadoAtual(conteudo.id);
  if (atual.estado !== "aprovacao") {
    await fecharPedidosProprios(conteudo.id, user?.id);
    throw new Error("Este conteúdo já não está à espera de aprovação (outra pessoa já decidiu ou foi alterado).");
  }
  const patch = {
    estado: "alteracoes",
    alteracoes: t,
    aprovado_por: null,
    aprovado_em: null,
    historico_aprovacao: hist(atual, { tipo: "alteracoes", por: user?.id || null, em: agora(), texto: t }),
  };
  const { error } = await supabase.from("marketing_conteudos").update(patch).eq("id", conteudo.id);
  if (error) throw error;
  await fecharPedidosProprios(conteudo.id, user?.id);
  await notificar(await equipaMarketing(user?.id), {
    conteudo_id: conteudo.id,
    created_by: user?.id || null,
    tipo: "mk_alteracoes",
    titulo: "Alterações necessárias",
    mensagem: `${nomeCurto(user?.nome)} pediu alterações em «${atual.titulo || "Sem título"}»: ${t.length > 140 ? `${t.slice(0, 140)}…` : t}`,
    link: linkConteudo(conteudo.id),
  });
  return patch;
}
