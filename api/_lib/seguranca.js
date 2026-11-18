/* global process */
// =====================================================================
// Segurança partilhada pelas rotas do servidor (api/ e server/index.js)
//  - autenticar(req): confirma a sessão Supabase e lê o papel na BD
//  - temPapel / PAPEIS: verificação de papel feita no servidor
//  - escapeHtml: escapar tudo o que entra em HTML de emails
//  - emailsInternos: só deixa enviar para pessoas registadas no Bizin
//  - urlDaApp: só aceita links para a própria aplicação
// (pasta com "_": não conta como função no Vercel)
// =====================================================================
import { createClient } from "@supabase/supabase-js";

export const PAPEIS = {
  admin: ["admin", "administrador"],
  gestao: ["admin", "administrador", "gestor"],
  marketing: ["admin", "administrador", "gestor", "marketing", "marketing plus"],
};

const SUPABASE_URL = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";

/** Cliente com a chave de serviço (ignora RLS) — só usar depois de autenticar e autorizar. */
export function clienteServico() {
  const url = SUPABASE_URL();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

/**
 * Confirma o token Supabase do pedido e devolve { user, perfil, papel, admin }.
 * Lança ErroHttp(401) se não houver sessão válida ou se a conta estiver desativada.
 */
export async function autenticar(req) {
  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new ErroHttp(401, "Sessão em falta. Volte a entrar no Bizin.");

  const admin = clienteServico();
  let user = null;
  let perfil = null;
  if (admin) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) throw new ErroHttp(401, "Sessão expirada. Volte a entrar.");
    user = data.user;
    const r = await admin.from("profiles").select("id, nome, email, role, tipo, ativo").eq("id", user.id).maybeSingle();
    perfil = r.data;
  } else {
    // Sem chave de serviço: usa a sessão do próprio utilizador (RLS)
    const url = SUPABASE_URL();
    const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) throw new ErroHttp(503, "Servidor sem configuração do Supabase.");
    const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) throw new ErroHttp(401, "Sessão expirada. Volte a entrar.");
    user = data.user;
    const r = await sb.from("profiles").select("id, nome, email, role, tipo, ativo").eq("id", user.id).maybeSingle();
    perfil = r.data;
  }
  if (perfil?.ativo === false) throw new ErroHttp(403, "Conta desativada.");
  const papel = String(perfil?.role || perfil?.tipo || "").toLowerCase();
  return { user, perfil, papel, admin };
}

export function exigirPapel(ctx, lista) {
  if (!lista.includes(ctx.papel)) throw new ErroHttp(403, "Sem permissão para esta ação.");
}

/** Resposta de erro uniforme, sem detalhes internos para o cliente. */
export function responderErro(res, err, contexto = "api") {
  if (err instanceof ErroHttp) {
    res.status(err.status).json({ ok: false, error: err.message });
    return;
  }
  console.error(`[${contexto}]`, err);
  res.status(500).json({ ok: false, error: "Ocorreu um erro no servidor. Tente de novo." });
}

export function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;
export const emailValido = (e) => typeof e === "string" && e.length <= 254 && EMAIL_RE.test(e.trim());

/** Filtra a lista para emails de pessoas ativas registadas no Bizin (profiles.email). */
export async function emailsInternos(admin, emails) {
  const lista = [...new Set((Array.isArray(emails) ? emails : [emails]).filter(emailValido).map((e) => e.trim().toLowerCase()))];
  if (!lista.length) return [];
  if (!admin) throw new ErroHttp(503, "Falta configurar SUPABASE_SERVICE_ROLE_KEY no servidor.");
  const { data, error } = await admin.from("profiles").select("email, ativo").in("email", lista);
  if (error) throw error;
  const ok = new Set((data || []).filter((p) => p.ativo !== false && p.email).map((p) => p.email.trim().toLowerCase()));
  return lista.filter((e) => ok.has(e));
}

/** Origem da aplicação (para links nos emails). APP_URL tem prioridade. */
export function origemApp(req) {
  const fixa = String(process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (fixa) return fixa;
  const origin = String(req.headers?.origin || "").trim();
  return /^https?:\/\/[^/\s]+$/i.test(origin) ? origin : "";
}

/** Só aceita URLs http(s) que apontem para a própria aplicação. */
export function urlDaApp(req, url) {
  const base = origemApp(req);
  try {
    const u = new URL(String(url || ""));
    if (!/^https?:$/.test(u.protocol)) return "";
    if (base && u.origin !== new URL(base).origin) return "";
    return u.toString();
  } catch {
    return "";
  }
}

/** Limita um número a um intervalo (parâmetros vindos do cliente). */
export const limitar = (v, min, max, omissao) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : omissao;
};

/** Regista no histórico de auditoria (nunca bloqueia a resposta). */
export async function auditar(admin, ctx, acao, detalhes = {}, registoId = null, tabela = null) {
  if (!admin) return;
  try {
    await admin.from("audit_log").insert({
      user_id: ctx?.user?.id || null,
      user_email: ctx?.user?.email || null,
      operacao: "EVENTO",
      acao,
      tabela,
      registo_id: registoId ? String(registoId) : null,
      detalhes,
    });
  } catch {
    /* ignora */
  }
}

/**
 * Limite diário por pessoa (conta eventos no audit_log desde a meia-noite UTC).
 * Sem chave de serviço não limita (não bloqueia a app). Regista o uso se permitido.
 */
export async function consumirQuota(ctx, acao, limiteDiario) {
  const admin = ctx.admin || clienteServico();
  if (!admin) return;
  const inicio = new Date();
  inicio.setUTCHours(0, 0, 0, 0);
  const { count, error } = await admin
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.user.id)
    .eq("acao", acao)
    .gte("created_at", inicio.toISOString());
  if (!error && (count || 0) >= limiteDiario) {
    throw new ErroHttp(429, `Atingiu o limite diário (${limiteDiario}) deste assistente. Volte a tentar amanhã.`);
  }
  await auditar(admin, ctx, acao, {});
}
