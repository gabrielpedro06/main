// =====================================================================
// Uma única função do Vercel para todos os emails da app (exigem sessão):
//   POST /api/notificacoes/marketing | transfergest | cc-alerta | projeto-criado | pedido-ausencia
// Código em api/_lib/notificacoes.js
// =====================================================================
import notificar from "../_lib/notificacoes.js";

export const config = { runtime: "nodejs", maxDuration: 60 };

export default function handler(req, res) {
  return notificar(String(req.query?.tipo || ""), req, res);
}
