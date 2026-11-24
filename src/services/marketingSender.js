// Cliente do browser para as campanhas de marketing (usado em pages/GestaoLeads.jsx):
// GET /api/health e POST /api/notificacoes/marketing (com sessão). Por omissão usa a mesma
// origem; VITE_MARKETING_API_BASE só serve para apontar para outro servidor.
import { postAutenticado } from "../utils/apiAutenticada";
import { cabecalhoIdempotencia } from "../utils/idempotencia";
const DEFAULT_MARKETING_API_BASE = import.meta.env.VITE_MARKETING_API_BASE || "";

export async function checkMarketingApiHealth() {
  const endpoint = `${DEFAULT_MARKETING_API_BASE}/api/health`;

  const response = await fetch(endpoint, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("API de marketing indisponivel.");
  }

  return response.json().catch(() => ({ ok: true }));
}

/**
 * Envia uma campanha pelo servidor (Brevo). `payload` = { emails, templateId|subject+htmlContent, params, ... }.
 * @returns {Promise<object>} o `summary` de sendTransactionalCampaign; lança Error com .status/.details
 */
export async function sendMarketingCampaign(payload) {
  const endpoint = `${DEFAULT_MARKETING_API_BASE}/api/notificacoes/marketing`;

  const response = await postAutenticado(endpoint, payload, await cabecalhoIdempotencia("campanha_marketing", payload));

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.ok) {
    let message = data?.error || "Falha ao enviar campanha.";

    if (response.status === 500 && !data?.error) {
      message = "Erro interno na API de marketing. Confirma se o backend esta a correr e se BREVO_API_KEY existe no .env.";
    }

    const error = new Error(message);
    error.details = data?.details || null;
    error.status = response.status;
    throw error;
  }

  // repetido = o servidor reconheceu este envio como repetição e NÃO voltou a enviar
  return data.repetido ? { ...data.summary, repetido: true, repetidoDesde: data.repetidoDesde } : data.summary;
}
