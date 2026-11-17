// =====================================================================
// Uma única função do Vercel para as rotas de administração
// (o plano Hobby só permite 12 funções por deploy):
//   POST /api/admin/mfa     → estado do MFA e "Repor MFA"
//   POST /api/admin/contas  → ativar/desativar acesso de colaboradores
// O código de cada rota está em api/_lib/ (pastas com "_" não contam como função).
// =====================================================================
import adminMfa from "../_lib/adminMfa.js";
import adminContas from "../_lib/adminContas.js";

export const config = { runtime: "nodejs", maxDuration: 60 };

const ROTAS = { mfa: adminMfa, contas: adminContas };

export default async function handler(req, res) {
  const op = String(req.query?.op || "");
  const rota = ROTAS[op];
  if (!rota) {
    res.status(404).json({ ok: false, error: "Rota de administração desconhecida." });
    return;
  }
  return rota(req, res);
}
