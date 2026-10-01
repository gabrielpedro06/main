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

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function buildDetailsBlock(details, safeType) {
  if (!details) return "";

  const {
    data_inicio, data_fim, is_parcial, hora_inicio, hora_fim,
    motivo, km_origem, km_destino, km_total, veiculo, isKmRequest,
  } = details;

  const rows = [];

  // Tipo
  rows.push(`
    <tr>
      <td style="padding:10px 14px;color:#64748b;font-size:0.82rem;font-weight:600;white-space:nowrap;width:140px">Tipo de ausência</td>
      <td style="padding:10px 14px;color:#0f172a;font-weight:700">${escapeHtml(safeType)}</td>
    </tr>`);

  // Período
  if (isKmRequest) {
    rows.push(`
    <tr style="background:#f8fafc">
      <td style="padding:10px 14px;color:#64748b;font-size:0.82rem;font-weight:600">Data</td>
      <td style="padding:10px 14px;color:#0f172a;font-weight:700">${escapeHtml(formatDate(data_inicio))}</td>
    </tr>`);
  } else if (data_inicio) {
    const dataFim = data_fim && data_fim !== data_inicio ? ` → ${formatDate(data_fim)}` : "";
    let periodoVal = escapeHtml(formatDate(data_inicio) + dataFim);
    if (is_parcial && hora_inicio) {
      const hFim = hora_fim ? ` às ${hora_fim}` : "";
      periodoVal += `<br><span style="color:#64748b;font-size:0.82rem">${escapeHtml(hora_inicio)}${escapeHtml(hFim)}</span>`;
    }
    rows.push(`
    <tr style="background:#f8fafc">
      <td style="padding:10px 14px;color:#64748b;font-size:0.82rem;font-weight:600">Período</td>
      <td style="padding:10px 14px;color:#0f172a;font-weight:700">${periodoVal}</td>
    </tr>`);
  }

  // KM específico
  if (isKmRequest) {
    if (km_origem || km_destino) {
      rows.push(`
    <tr>
      <td style="padding:10px 14px;color:#64748b;font-size:0.82rem;font-weight:600">Percurso</td>
      <td style="padding:10px 14px;color:#0f172a;font-weight:700">${escapeHtml(km_origem || "—")} → ${escapeHtml(km_destino || "—")}</td>
    </tr>`);
    }
    if (km_total) {
      rows.push(`
    <tr style="background:#f8fafc">
      <td style="padding:10px 14px;color:#64748b;font-size:0.82rem;font-weight:600">Km total</td>
      <td style="padding:10px 14px;color:#0f172a;font-weight:700">${escapeHtml(String(km_total))} km</td>
    </tr>`);
    }
    if (veiculo) {
      rows.push(`
    <tr>
      <td style="padding:10px 14px;color:#64748b;font-size:0.82rem;font-weight:600">Veículo</td>
      <td style="padding:10px 14px;color:#0f172a;font-weight:700">${escapeHtml(veiculo)}</td>
    </tr>`);
    }
  }

  // Estado
  rows.push(`
    <tr ${isKmRequest || (km_total) ? "" : 'style="background:#f8fafc"'}>
      <td style="padding:10px 14px;color:#64748b;font-size:0.82rem;font-weight:600">Estado</td>
      <td style="padding:10px 14px"><span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:999px;font-size:0.78rem;font-weight:700">pendente</span></td>
    </tr>`);

  const tableBlock = `
  <table cellpadding="0" cellspacing="0" width="100%" style="border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin:20px 0;border-collapse:collapse">
    <tbody>
      ${rows.join("")}
    </tbody>
  </table>`;

  // Motivo / Observações
  const motivoBlock = motivo
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:#f8fafc;border-left:3px solid #cbd5e1;border-radius:0 8px 8px 0">
        <div style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Observações / Motivo</div>
        <div style="color:#1e293b;font-size:0.9rem;line-height:1.55;white-space:pre-line">"${escapeHtml(motivo)}"</div>
       </div>`
    : "";

  return tableBlock + motivoBlock;
}

function buildActionButtons(requestId, adminEmail, safeRequestUrl, apiBase, safeRequestUrlDisplay) {
  const token = requestId ? buildActionToken(requestId, adminEmail) : null;
  if (!token) {
    return `<p style="margin:20px 0">
      <a href="${safeRequestUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">
        Abrir pedidos para aprovar
      </a></p>`;
  }

  // Nota: NÃO usar escapeHtml nas URLs — o & deve ficar como & para que o
  // tracker de clicks do Brevo redirecione corretamente.
  const approveUrl = `${apiBase}/api/absence-notifications/action?token=${encodeURIComponent(token)}&action=approve`;
  const rejectUrl  = `${apiBase}/api/absence-notifications/action?token=${encodeURIComponent(token)}&action=reject`;

  return `
  <table cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr>
      <td style="padding-right:10px">
        <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold;font-size:15px">✅ Aprovar</a>
      </td>
      <td>
        <a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold;font-size:15px">❌ Rejeitar</a>
      </td>
    </tr>
  </table>
  <p style="margin:6px 0 0;color:#64748b;font-size:12px">
    Ou acede ao painel completo: <a href="${safeRequestUrl}" style="color:#0f172a">${safeRequestUrlDisplay}</a>
  </p>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  // Diagnóstico: verificar se a chave Brevo está configurada
  if (!process.env.BREVO_API_KEY) {
    console.error("[absence-notifications] ERRO: BREVO_API_KEY não está definida nas variáveis de ambiente.");
    res.status(500).json({ ok: false, error: "Serviço de email não configurado (BREVO_API_KEY em falta)." });
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
    details,
  } = req.body || {};

  const validEmails = [...new Set((Array.isArray(emails) ? emails : []).filter(Boolean))];

  console.log(`[absence-notifications] Pedido recebido — tipo: ${requestType}, destinatários: ${validEmails.length}, requestId: ${requestId || "n/a"}`);

  if (validEmails.length === 0 || !requestUrl) {
    res.status(400).json({ ok: false, error: "emails and requestUrl are required." });
    return;
  }

  const safeType = escapeHtml(requestType || "ausência");
  const safeRequesterName = escapeHtml(requesterName || "Um colaborador");
  // Nota: requestUrl vai em hrefs — não escapar & para não quebrar o tracker do Brevo
  const safeRequestUrl = requestUrl || "";
  const safeRequestUrlDisplay = escapeHtml(requestUrl || "");

  // Construir URL base absoluta a partir dos headers da request
  // (funciona em Vercel produção e em localhost)
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers["x-forwarded-host"] || req.headers.host || "";
  const apiBase = process.env.MARKETING_API_BASE
    || (host ? `${proto}://${host}` : "");

  const subject = isEditing
    ? `Pedido de ${requestType || "ausência"} atualizado — ação necessária`
    : `Novo pedido de ${requestType || "ausência"} — ação necessária`;

  const detailsBlock = buildDetailsBlock(details, safeType);

  try {
    const results = await Promise.allSettled(
      validEmails.map((adminEmail) => {
        const actionButtons = buildActionButtons(requestId, adminEmail, safeRequestUrl, apiBase, safeRequestUrlDisplay);

        const htmlContent = `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:580px">

            <div style="background:#0f172a;border-radius:14px 14px 0 0;padding:20px 24px;margin-bottom:0">
              <div style="color:#94a3b8;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">
                ${isEditing ? "Pedido atualizado" : "Novo pedido"}
              </div>
              <div style="color:#fff;font-size:1.2rem;font-weight:800">${safeType}</div>
            </div>

            <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:24px">

              <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f1f5f9">
                <div style="width:40px;height:40px;border-radius:10px;background:#f0f4ff;display:flex;align-items:center;justify-content:center;font-size:1.1rem">👤</div>
                <div>
                  <div style="font-size:0.72rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Colaborador</div>
                  <div style="font-size:1rem;font-weight:800;color:#0f172a">${safeRequesterName}</div>
                </div>
              </div>

              ${detailsBlock}

              <div style="border-top:1px solid #f1f5f9;padding-top:20px">
                <div style="font-size:0.82rem;color:#475569;margin-bottom:8px">Podes aprovar ou rejeitar diretamente:</div>
                ${actionButtons}
              </div>

            </div>

            <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;text-align:center">
              Este email foi enviado automaticamente pelo sistema de RH. Não respondas diretamente.
            </p>
          </div>`;

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
      console.warn(`[absence-notifications] ${failed.length} email(s) failed to send.`, failed.map(f => f.reason?.message));
    }

    res.status(200).json({ ok: true, sent: validEmails.length - failed.length, failed: failed.length });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;
    res.status(statusCode).json({ ok: false, error: error.message || "Unexpected error while sending absence notification." });
  }
}
