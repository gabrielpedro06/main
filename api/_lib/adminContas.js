/* global process */
// =====================================================================
// Ativar / desativar o acesso de um colaborador ao Bizin.
// Desativar = profiles.ativo = false + conta bloqueada no Supabase Auth
// (deixa de conseguir entrar e de renovar a sessão). Reativar = o contrário.
//
//   acao "definir"      { userId, ativo }  → admin, administrador ou gestor (quem usa os RH)
//   acao "sincronizar"  {}                 → admin: bloqueia todas as contas já inativas
//
// Precisa de SUPABASE_SERVICE_ROLE_KEY no servidor (nunca no browser).
// =====================================================================
import { createClient } from "@supabase/supabase-js";

// (config da função: ver api/admin/[op].js)

const PAPEIS_RH = ["admin", "administrador", "gestor"];
const PAPEIS_ADMIN = ["admin", "administrador"];
const BLOQUEIO = "876000h"; // ~100 anos (até ser reativado)

async function bloquear(admin, userId, bloqueado) {
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: bloqueado ? BLOQUEIO : "none" });
  if (error) throw error;
}

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

  const { acao, userId, ativo } = req.body || {};
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

    res.status(400).json({ ok: false, error: "Ação desconhecida." });
  } catch (err) {
    console.error("[admin/contas]", err);
    res.status(500).json({ ok: false, error: `Não foi possível concluir: ${err?.message || err}` });
  }
}
