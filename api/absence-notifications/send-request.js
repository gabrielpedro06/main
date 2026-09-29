import { sendTransactionalCampaign } from "../../server/brevoCampaignSender.js";
import { buildActionToken } from "./action.js";

export const config = {
  runtime: "nodejs",
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  const {
    emails,
    requestType,
    requesterName,
    dateLabel,
    requestUrl,
    requestId,
    isEditing,
  } = req.body || {};
  const validEmails = [...new Set((Array.isArray(emails) ? emails : []).filter(Boolean))];

  if (validEmails.length === 0 || !requestUrl) {
    res.status(400).json({ ok: false, error: "emails and requestUrl are required." });
    return;
  }

  const safeType = escapeHtml(requestType || "ausência");
  const safeRequesterName = escapeHtml(requesterName || "Um colaborador");
  const safeDateLabel = escapeHtml(dateLabel || "");
  const safeRequestUrl = escapeHtml(requestUrl);
  const subject = isEditing
    ? `Pedido de ${requestType || "ausência"} atualizado — ação necessária`
    : `Novo pedido de ${requestType || "ausência"} — ação necessária`;

  // Build per-email action links if action secret is configured
  const apiBase = process.env.VITE_MARKETING_API_BASE || process.env.MARKETING_API_BASE || "";

  const buildActionButtons = (adminEmail) => {
    const token = requestId ? buildActionToken(requestId, adminEmail) : null;
    if (!token) {
      // Fallback: just open the RH panel
      return `
        <p style="margin:20px 0">
          <a href="${safeRequestUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">
            Abrir pedidos para aprovar
          </a>
        </p>`;
    }

    const approveUrl = escapeHtml(`${apiBase}/api/absence-notifications/action?token=${encodeURIComponent(token)}&action=approve`);
    const rejectUrl  = escapeHtml(`${apiBase}/api/absence-notifications/action?token=${encodeURIComponent(token)}&action=reject`);

    return `
      <table cellpadding="0" cellspacing="0" style="margin:24px 0">
        <tr>
          <td style="padding-right:10px">
            <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:15px">
              ✅ Aprovar
            </a>
          </td>
          <td>
            <a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:15px">
              ❌ Rejeitar
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:8px 0 0;color:#64748b;font-size:12px">
        Ou acede ao painel completo: <a href="${safeRequestUrl}" style="color:#0f172a">${safeRequestUrl}</a>
      </p>`;
  };

  try {
    // Send individual emails per admin so each has a unique action token
    const results = await Promise.allSettled(
      validEmails.map((adminEmail) => {
        const actionButtons = buildActionButtons(adminEmail);
        const htmlContent = `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:560px">
            <h2 style="margin:0 0 12px;color:#0f172a">Pedido de ${safeType}</h2>
            <p>O colaborador <strong>${safeRequesterName}</strong> ${isEditing ? "atualizou" : "criou"} um pedido de <strong>${safeType}</strong>${safeDateLabel ? ` para ${safeDateLabel}` : ""}.</p>
            <p style="color:#475569;font-size:14px">Podes aprovar ou rejeitar diretamente por aqui:</p>
            ${actionButtons}
            <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0">
            <p style="margin:0;color:#94a3b8;font-size:11px">Este email foi enviado automaticamente pelo sistema de RH. Não respondas diretamente.</p>
          </div>
        `;
        return sendTransactionalCampaign({
          senderProfile: "marketing",
          emails: [adminEmail],
          subject,
          htmlContent,
        });
      })
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.warn(`[absence-notifications] ${failed.length} email(s) failed to send.`, failed);
    }

    res.status(200).json({ ok: true, sent: validEmails.length - failed.length, failed: failed.length });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;
    res.status(statusCode).json({ ok: false, error: error.message || "Unexpected error while sending absence notification." });
  }
}
