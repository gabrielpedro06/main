/* global process, Buffer */
/**
 * api/absence-notifications/action.js
 *
 * Links dos emails ANTIGOS ("Aprovar" / "Rejeitar" com token).
 * Já não alteram nada: só reencaminham para a página do pedido dentro do Bizin,
 * onde é preciso login + 2FA para decidir. Os emails novos já apontam diretamente
 * para a app. Se o token não for válido, abre o painel de RH.
 */

import crypto from "crypto";

export const config = { runtime: "nodejs" };

const SECRET = process.env.ABSENCE_ACTION_SECRET || "";

/** Lê o pedido e a ação de um token assinado (o prazo já não interessa: só redireciona). */
function lerToken(token) {
  if (SECRET.length < 32) return null;
  const [data, sig] = String(token || "").split(".");
  if (!data || !sig) return null;
  const esperado = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(esperado, "base64url"))) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    const id = String(payload.pedidoId || "");
    if (!/^[\w-]{1,64}$/.test(id)) return null;
    return { id, acao: payload.action === "approve" ? "aprovar" : payload.action === "reject" ? "rejeitar" : "" };
  } catch {
    return null;
  }
}

function baseDaApp(req) {
  const fixa = String(process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (fixa) return fixa;
  const host = String(req.headers?.host || "").trim();
  return /^[\w.-]+(:\d+)?$/.test(host) ? `https://${host}` : "";
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const params = req.method === "POST" ? (req.body || {}) : (req.query || {});
  const alvo = lerToken(params.token);
  const caminho = alvo
    ? `/#/dashboard/pedidos/${encodeURIComponent(alvo.id)}${alvo.acao ? `?acao=${alvo.acao}` : ""}`
    : "/#/dashboard/rh";
  res.statusCode = 303;
  res.setHeader("Location", `${baseDaApp(req)}${caminho}`);
  res.end();
}
