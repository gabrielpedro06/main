// GET /api/health — verificação simples de que as funções do servidor respondem.
// Usado por src/services/marketingSender.js e transfergestSender.js antes de enviar campanhas.
// O nome "marketing-email-sender" é histórico (era o único serviço da API).
export const config = {
  runtime: "nodejs",
};

export default function handler(_req, res) {
  res.status(200).json({ ok: true, service: "marketing-email-sender" });
}
