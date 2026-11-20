/* global process */
// =====================================================================
// Ativar / desativar o acesso de um colaborador ao Bizin.
// Desativar = profiles.ativo = false + conta bloqueada no Supabase Auth
// (deixa de conseguir entrar e de renovar a sessão). Reativar = o contrário.
//
//   acao "definir"      { userId, ativo }  → admin, administrador ou gestor (quem usa os RH)
//   acao "sincronizar"  {}                 → admin: bloqueia todas as contas já inativas
//   acao "papel"        { userId, papel, password } → admin: muda o papel (confirma a palavra-passe
//                                          da conta de quem pede, verificada no Supabase)
//
// Precisa de SUPABASE_SERVICE_ROLE_KEY no servidor (nunca no browser).
// =====================================================================
import { createClient } from "@supabase/supabase-js";

// (config da função: ver api/admin/[op].js)

const PAPEIS_RH = ["admin", "administrador", "gestor"];
const PAPEIS_ADMIN = ["admin", "administrador"];
const BLOQUEIO = "876000h";
const PAPEIS_VALIDOS = ["colaborador", "gestor", "marketing", "marketing plus", "admin"]; // ~100 anos (até ser reativado)

async function bloquear(admin, userId, bloqueado) {
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: bloqueado ? BLOQUEIO : "none" });
  if (error) throw error;
}

/**
 * POST /api/admin/contas — usado por RecursosHumanos.jsx, AdminDashboard.jsx e SegurancaMFA.jsx.
 * Ações e permissões descritas no cabeçalho. Toca em profiles (ativo, role, tipo),
 * auth.users (ban_duration) e audit_log.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    res.status(503).json({ ok: false, error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY no servidor." });
    return;
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { data: quem, error: quemErr } = token ? await admin.auth.getUser(token) : { data: null, error: true };
  if (quemErr || !quem?.user) {
    res.status(401).json({ ok: false, error: "Sessão expirada. Volte a entrar." });
    return;
  }
  const { data: perfil } = await admin.from("profiles").select("role, tipo, nome").eq("id", quem.user.id).single();
  const papel = String(perfil?.role || perfil?.tipo || "").toLowerCase();

  const { acao, userId, ativo, papel: novoPapel, password } = req.body || {};
  const registar = (acaoAudit, registo, detalhes) => admin.from("audit_log").insert({
    user_id: quem.user.id,
    user_email: quem.user.email,
    operacao: "EVENTO",
    acao: acaoAudit,
    tabela: "profiles",
    registo_id: registo,
    detalhes: { ...detalhes, por: perfil?.nome || null },
  }).then(() => {}, () => {});

  try {
    if (acao === "definir") {
      if (!PAPEIS_RH.includes(papel)) {
        res.status(403).json({ ok: false, error: "Sem permissão para ativar ou desativar colaboradores." });
        return;
      }
      if (!userId || typeof ativo !== "boolean") {
        res.status(400).json({ ok: false, error: "Pedido incompleto." });
        return;
      }
      if (userId === quem.user.id && !ativo) {
        res.status(400).json({ ok: false, error: "Não pode desativar a sua própria conta." });
        return;
      }
      // Um gestor não pode desativar (nem bloquear) administradores
      if (!PAPEIS_ADMIN.includes(papel)) {
        const { data: alvo } = await admin.from("profiles").select("role, tipo").eq("id", userId).maybeSingle();
        const papelAlvo = String(alvo?.role || alvo?.tipo || "").toLowerCase();
        if (PAPEIS_ADMIN.includes(papelAlvo)) {
          res.status(403).json({ ok: false, error: "Só um administrador pode desativar outro administrador." });
          return;
        }
      }
      const { error } = await admin.from("profiles").update({ ativo }).eq("id", userId);
      if (error) throw error;
      await bloquear(admin, userId, !ativo);
      await registar(ativo ? "colaborador_reativado" : "colaborador_desativado", userId, { conta_bloqueada: !ativo });
      res.status(200).json({ ok: true });
      return;
    }

    if (acao === "sincronizar") {
      if (!PAPEIS_ADMIN.includes(papel)) {
        res.status(403).json({ ok: false, error: "Só administradores." });
        return;
      }
      const { data: inativos, error } = await admin.from("profiles").select("id").eq("ativo", false);
      if (error) throw error;
      let bloqueados = 0;
      for (const p of inativos || []) {
        if (p.id === quem.user.id) continue;
        await bloquear(admin, p.id, true);
        bloqueados += 1;
      }
      await registar("contas_inativas_bloqueadas", null, { total: bloqueados });
      res.status(200).json({ ok: true, bloqueados });
      return;
    }

    if (acao === "papel") {
      if (!PAPEIS_ADMIN.includes(papel)) {
        res.status(403).json({ ok: false, error: "Só administradores podem mudar papéis." });
        return;
      }
      if (!userId || !PAPEIS_VALIDOS.includes(String(novoPapel || ""))) {
        res.status(400).json({ ok: false, error: "Papel inválido." });
        return;
      }
      if (userId === quem.user.id && novoPapel !== "admin") {
        res.status(400).json({ ok: false, error: "Não pode retirar a si próprio o papel de administrador." });
        return;
      }
      // Confirma a palavra-passe da conta de quem pede (re-autenticação)
      const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (!anon || typeof password !== "string" || !password) {
        res.status(400).json({ ok: false, error: "Introduza a sua palavra-passe." });
        return;
      }
      const verif = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: passErr } = await verif.auth.signInWithPassword({ email: quem.user.email, password });
      if (passErr) {
        await registar("mudanca_papel_recusada", userId, { motivo: "palavra_passe_errada" });
        res.status(403).json({ ok: false, error: "Palavra-passe incorreta." });
        return;
      }
      const { data: antes } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
      const { data: depois, error } = await admin.from("profiles").update({ role: novoPapel, tipo: novoPapel }).eq("id", userId).select("*").single();
      if (error) throw error;
      await registar("papel_alterado", userId, { de: antes?.role || null, para: novoPapel });
      res.status(200).json({ ok: true, perfil: depois });
      return;
    }

    res.status(400).json({ ok: false, error: "Ação desconhecida." });
  } catch (err) {
    console.error("[admin/contas]", err);
    res.status(500).json({ ok: false, error: "Não foi possível concluir. Tente de novo." });
  }
}
