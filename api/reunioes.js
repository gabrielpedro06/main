// POST /api/reunioes — token de videochamada (JaaS) para uma conversa do chat.
// Código em api/_lib/reunioes.js. (11.ª função do Vercel; o limite Hobby é 12.)
import reunioes from "./_lib/reunioes.js";

export const config = { runtime: "nodejs", maxDuration: 15 };

export default function handler(req, res) {
  return reunioes(req, res);
}
