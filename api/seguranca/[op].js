// =====================================================================
// Uma única função do Vercel para os alertas de segurança:
//   POST /api/seguranca/tentativa  login/2FA falhado (sem sessão)
//   POST /api/seguranca/login      login com sucesso (com sessão)
//   POST /api/seguranca/recolher   pg_cron do Supabase, a cada 10 min (segredo no cabeçalho)
// Código em api/_lib/alertasSeguranca.js
// =====================================================================
import seguranca from "../_lib/alertasSeguranca.js";

export const config = { runtime: "nodejs", maxDuration: 60 };

export default function handler(req, res) {
  return seguranca(String(req.query?.op || ""), req, res);
}
