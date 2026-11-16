/* global process */
// =====================================================================
// Admin → Segurança: ver o estado do MFA de cada pessoa e repor o MFA
// (apaga os fatores; na próxima entrada a pessoa configura a app de novo).
//
// Só administradores. Precisa da chave de serviço do Supabase no servidor:
//   SUPABASE_SERVICE_ROLE_KEY   (nunca no browser)
//   VITE_SUPABASE_URL           (já existe)
// =====================================================================
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 30 };

const PAPEIS_ADMIN = ["admin", "administrador"];

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

  // Quem está a pedir: sessão válida e papel de administrador
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { data: quem, error: quemErr } = token ? await admin.auth.getUser(token) : { data: null, error: true };
  if (quemErr || !quem?.user) {
    res.status(401).json({ ok: false, error: "Sessão expirada. Volte a entrar." });
    return;
  }
  const { data: perfil } = await admin.from("profiles").select("role, tipo, nome").eq("id", quem.user.id).single();
  const papel = String(perfil?.role || perfil?.tipo || "").toLowerCase();
  if (!PAPEIS_ADMIN.includes(papel)) {
    res.status(403).json({ ok: false, error: "Só administradores podem gerir o MFA." });
    return;
  }

  const { acao, userId } = req.body || {};

  try {
    if (acao === "estado") {
      // Estado de todos: { userId: { fatores, verificado, ultimo } }
      const estado = {};
      for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        (data?.users || []).forEach((u) => {
          const fs = u.factors || [];
          const ok = fs.filter((f) => f.status === "verified");
          estado[u.id] = {
            fatores: fs.length,
            verificado: ok.length > 0,
            desde: ok.map((f) => f.created_at).sort()[0] || null,
            ultimoLogin: u.last_sign_in_at || null,
          };
        });
        if ((data?.users || []).length < 200) break;
      }
      res.status(200).json({ ok: true, estado });
      return;
    }

    if (acao === "repor") {
      if (!userId || typeof userId !== "string") {
        res.status(400).json({ ok: false, error: "Falta indicar a pessoa." });
        return;
      }
      const { data: alvo, error: alvoErr } = await admin.auth.admin.getUserById(userId);
      if (alvoErr || !alvo?.user) {
        res.status(404).json({ ok: false, error: "Utilizador não encontrado." });
        return;
      }
      const fatores = alvo.user.factors || [];
      for (const f of fatores) {
        const { error } = await admin.auth.admin.mfa.deleteFactor({ userId, id: f.id });
        if (error) throw error;
      }
      // Registo de auditoria (não bloqueia se a tabela não existir)
      await admin.from("audit_log").insert({
        user_id: quem.user.id,
        user_email: quem.user.email,
        operacao: "EVENTO",
        acao: "mfa_reposto",
        tabela: "auth.mfa_factors",
        registo_id: userId,
        detalhes: { alvo_email: alvo.user.email, fatores_removidos: fatores.length, por: perfil?.nome || null },
      }).then(() => {}, () => {});
      res.status(200).json({ ok: true, removidos: fatores.length });
      return;
    }

    res.status(400).json({ ok: false, error: "Ação desconhecida." });
  } catch (err) {
    console.error("[admin/mfa]", err);
    res.status(500).json({ ok: false, error: `Não foi possível concluir: ${err?.message || err}` });
  }
}
