/**
 * api/absence-notifications/action.js
 *
 * Handles approve / reject actions triggered directly from email links.
 * The link contains a HMAC-signed token: ?token=<base64url>&action=approve|reject
 *
 * Token payload (JSON): { pedidoId, adminEmail, exp }
 * The secret is ABSENCE_ACTION_SECRET (set in env).
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const config = { runtime: "nodejs" };

const SECRET = process.env.ABSENCE_ACTION_SECRET || "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function escapeHtml(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token) {
  const [data, sig] = (token || "").split(".");
  if (!data || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// Exported helper — used by send-request.js to build signed action tokens
export function buildActionToken(pedidoId, adminEmail) {
  if (!SECRET) return null;
  return signToken({ pedidoId, adminEmail, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }); // 7 days TTL
}

function htmlPage(title, message, color) {
  const safeColor = escapeHtml(color || "#16a34a");
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
  <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;}
  .card{background:white;border-radius:16px;padding:40px 48px;box-shadow:0 8px 32px rgba(0,0,0,0.10);text-align:center;max-width:420px;}
  h2{color:${safeColor};margin:0 0 12px;} p{color:#475569;margin:0;}</style></head>
  <body><div class="card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p></div></body></html>`;
}

export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : (req.body || {});
  const { token, action } = params;

  if (!token || !["approve", "reject"].includes(action)) {
    res.status(400).send(htmlPage("Pedido inválido", "Parâmetros em falta ou ação desconhecida.", "#dc2626"));
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).send(htmlPage("Link expirado ou inválido", "Este link já não é válido. Por favor, acede ao painel de RH para gerir o pedido.", "#dc2626"));
    return;
  }

  const { pedidoId } = payload;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.status(500).send(htmlPage("Erro de configuração", "Configuração do servidor em falta. Contacta o administrador.", "#dc2626"));
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch the request to make sure it still exists and is pending
  const { data: pedido, error: fetchError } = await supabase
    .from("ferias")
    .select("id, estado, tipo, user_id, data_inicio")
    .eq("id", pedidoId)
    .single();

  if (fetchError || !pedido) {
    res.status(404).send(htmlPage("Pedido não encontrado", "Este pedido não existe ou foi eliminado.", "#dc2626"));
    return;
  }

  if (pedido.estado !== "pendente") {
    const estadoLabel = pedido.estado === "aprovado" ? "aprovado" : pedido.estado === "rejeitado" ? "rejeitado" : pedido.estado;
    res.status(200).send(htmlPage(
      "Pedido já processado",
      `Este pedido já foi ${escapeHtml(estadoLabel)} anteriormente. Sem alterações.`,
      "#64748b"
    ));
    return;
  }

  if (action === "approve") {
    const { error: approvalError } = await supabase.rpc("aprovar_pedido_ferias_por_email", {
      p_pedido_id: Number(pedidoId),
    });
    if (approvalError) {
      const functionMissing = approvalError.code === "42883"
        || approvalError.code === "PGRST202"
        || /aprovar_pedido_ferias_por_email|function .* does not exist/i.test(approvalError.message || "");

      if (!functionMissing) {
        console.error("[absence-action] Erro ao aprovar e sincronizar férias:", approvalError);
        res.status(500).send(htmlPage("Erro ao processar", "Não foi possível aprovar o pedido e atualizar o saldo de férias.", "#dc2626"));
        return;
      }

      console.warn("[absence-action] RPC de aprovação não encontrada; a usar fallback compatível.");
      const { error: fallbackUpdateError } = await supabase
        .from("ferias")
        .update({ estado: "aprovado" })
        .eq("id", pedidoId)
        .eq("estado", "pendente");

      if (fallbackUpdateError) {
        console.error("[absence-action] Erro no fallback de aprovação:", fallbackUpdateError);
        res.status(500).send(htmlPage("Erro ao processar", "Não foi possível aprovar o pedido.", "#dc2626"));
        return;
      }

      const anoPedido = Number(String(pedido.data_inicio || "").slice(0, 4));
      const { error: syncError } = await supabase.rpc("provisionar_saldos_ferias", {
        p_ano: anoPedido,
      });

      if (syncError) {
        await supabase.from("ferias").update({ estado: "pendente" }).eq("id", pedidoId).eq("estado", "aprovado");
        console.error("[absence-action] Erro no fallback de sincronização:", syncError);
        res.status(500).send(htmlPage("Erro ao processar", "Não foi possível atualizar o saldo de férias.", "#dc2626"));
        return;
      }
    }
  } else {
    const { error: rejectionError } = await supabase
      .from("ferias")
      .update({ estado: "rejeitado" })
      .eq("id", pedidoId);
    if (rejectionError) {
      console.error("[absence-action] Erro ao rejeitar ferias:", rejectionError);
      res.status(500).send(htmlPage("Erro ao processar", "Não foi possível atualizar o pedido. Tenta novamente mais tarde.", "#dc2626"));
      return;
    }
  }

  const successTitle = action === "approve" ? "✅ Pedido Aprovado" : "❌ Pedido Rejeitado";
  const successMsg = action === "approve"
    ? "O pedido foi aprovado com sucesso. O colaborador será notificado."
    : "O pedido foi rejeitado. O colaborador será notificado.";

  res.status(200).send(htmlPage(successTitle, successMsg, action === "approve" ? "#16a34a" : "#dc2626"));
}
