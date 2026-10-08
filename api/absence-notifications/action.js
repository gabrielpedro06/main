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

  const novoEstado = action === "approve" ? "aprovado" : "rejeitado";
  const { error: updateError } = await supabase
    .from("ferias")
    .update({ estado: novoEstado })
    .eq("id", pedidoId);

  if (updateError) {
    console.error("[absence-action] Erro ao atualizar ferias:", updateError);
    res.status(500).send(htmlPage("Erro ao processar", "Não foi possível atualizar o pedido. Tenta novamente mais tarde.", "#dc2626"));
    return;
  }

  if (action === "approve" && String(pedido.tipo || "").toLowerCase().includes("fer")) {
    const anoPedido = Number(String(pedido.data_inicio || "").slice(0, 4));
    if (!Number.isInteger(anoPedido) || anoPedido < 2000) {
      console.error("[absence-action] Data de início inválida para sincronizar saldo:", pedido.data_inicio);
      res.status(500).send(htmlPage("Erro ao processar", "O pedido foi aprovado, mas não foi possível sincronizar o saldo de férias.", "#dc2626"));
      return;
    }

    const { data: saldo, error: balanceReadError } = await supabase
      .from("vacation_balances")
      .select("dias_atribuidos, dias_transitados")
      .eq("user_id", pedido.user_id)
      .eq("ano", anoPedido)
      .maybeSingle();

    if (balanceReadError || !saldo) {
      console.error("[absence-action] Saldo anual não encontrado:", balanceReadError);
      res.status(500).send(htmlPage("Erro ao processar", "O pedido foi aprovado, mas não foi possível localizar o saldo anual de férias.", "#dc2626"));
      return;
    }

    const { data: pedidosAprovados, error: approvedRequestsError } = await supabase
      .from("ferias")
      .select("data_inicio, data_fim, is_parcial, hora_inicio, hora_fim")
      .eq("user_id", pedido.user_id)
      .eq("estado", "aprovado")
      .ilike("tipo", "%fer%")
      .lte("data_inicio", `${anoPedido}-12-31`)
      .gte("data_fim", `${anoPedido}-01-01`);

    if (approvedRequestsError) {
      console.error("[absence-action] Erro ao calcular férias aprovadas:", approvedRequestsError);
      res.status(500).send(htmlPage("Erro ao processar", "O pedido foi aprovado, mas não foi possível calcular os dias gozados.", "#dc2626"));
      return;
    }

    const diasGozados = (pedidosAprovados || []).reduce((total, item) => {
      if (item.is_parcial) {
        const [horaInicio, minutoInicio] = String(item.hora_inicio || "").split(":").map(Number);
        const [horaFim, minutoFim] = String(item.hora_fim || "").split(":").map(Number);
        const horas = (horaFim * 60 + minutoFim - horaInicio * 60 - minutoInicio) / 60;
        return total + (Number.isFinite(horas) && horas > 0 ? horas / 8 : 0);
      }

      const inicio = new Date(`${item.data_inicio}T00:00:00`);
      const fim = new Date(`${item.data_fim || item.data_inicio}T00:00:00`);
      let dias = 0;
      for (const data = new Date(inicio); data <= fim; data.setDate(data.getDate() + 1)) {
        const diaSemana = data.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) dias += 1;
      }
      return total + dias;
    }, 0);

    const { error: balanceError } = await supabase
      .from("vacation_balances")
      .update({
        dias_gozados: diasGozados,
        atualizado_em: new Date().toISOString(),
      })
      .eq("user_id", pedido.user_id)
      .eq("ano", anoPedido);

    if (balanceError) {
      console.error("[absence-action] Erro ao sincronizar vacation_balances:", balanceError);
      res.status(500).send(htmlPage("Erro ao processar", "O pedido foi aprovado, mas não foi possível sincronizar o saldo de férias.", "#dc2626"));
      return;
    }
  }

  const successTitle = action === "approve" ? "✅ Pedido Aprovado" : "❌ Pedido Rejeitado";
  const successMsg = action === "approve"
    ? "O pedido foi aprovado com sucesso. O colaborador será notificado."
    : "O pedido foi rejeitado. O colaborador será notificado.";

  res.status(200).send(htmlPage(successTitle, successMsg, action === "approve" ? "#16a34a" : "#dc2626"));
}


