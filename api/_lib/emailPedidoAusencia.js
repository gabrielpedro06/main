// =====================================================================
// Email "novo pedido de ausência" enviado aos administradores.
// Os dados vêm SEMPRE da base de dados (nunca do browser) e tudo é escapado.
// Cada botão (Aprovar / Rejeitar) tem o seu próprio token assinado.
// =====================================================================
import { buildActionToken } from "../absence-notifications/action.js";
import { escapeHtml } from "./seguranca.js";

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
    motivo, km_origem, km_destino, km_total, veiculo, km_ida_volta, isKmRequest,
  } = details;

  const rows = [];

  // Tipo
  rows.push(`
    <tr>
      <td style="padding:10px 14px;color:#64748b;font-size:0.82rem;font-weight:600;white-space:nowrap;width:140px">Tipo de ausência</td>
      <td style="padding:10px 14px;color:#0f172a;font-weight:700">${safeType}</td>
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
      <td style="padding:10px 14px;color:#0f172a;font-weight:700">${escapeHtml(km_origem || "—")} ${km_ida_volta ? "⇄" : "→"} ${escapeHtml(km_destino || "—")}${km_ida_volta ? ' <span style="color:#64748b;font-weight:600">(ida e volta)</span>' : ""}</td>
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
  const tAprovar = requestId && apiBase ? buildActionToken(requestId, adminEmail, "approve") : null;
  const tRejeitar = requestId && apiBase ? buildActionToken(requestId, adminEmail, "reject") : null;
  if (!tAprovar || !tRejeitar) {
    return safeRequestUrl ? `<p style="margin:20px 0">
      <a href="${safeRequestUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">
        Abrir pedidos para aprovar
      </a></p>` : "";
  }
  // O link abre uma página de confirmação (o pedido só muda depois de carregar no botão dessa página)
  const approveUrl = `${apiBase}/api/absence-notifications/action?token=${encodeURIComponent(tAprovar)}`;
  const rejectUrl = `${apiBase}/api/absence-notifications/action?token=${encodeURIComponent(tRejeitar)}`;
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
  ${safeRequestUrl ? `<p style="margin:6px 0 0;color:#64748b;font-size:12px">
    Ou acede ao painel completo: <a href="${safeRequestUrl}" style="color:#0f172a">${safeRequestUrlDisplay}</a>
  </p>` : ""}`;
}

export function construirEmailPedido({ pedido, isKm, isEditing, requesterName, requestUrl, apiBase, adminEmail }) {
  const requestType = pedido.tipo || "ausência";
  const safeType = escapeHtml(requestType);
  const safeRequesterName = escapeHtml(requesterName || "Um colaborador");
  const safeRequestUrl = escapeHtml(requestUrl || "");
  const safeRequestUrlDisplay = safeRequestUrl;
  const details = { ...pedido, isKmRequest: isKm };
  const detailsBlock = buildDetailsBlock(details, safeType);
  const actionButtons = buildActionButtons(pedido.id, adminEmail, safeRequestUrl, apiBase, safeRequestUrlDisplay);
  const subject = isEditing
    ? `Pedido de ${requestType} atualizado — ação necessária`
    : `Novo pedido de ${requestType} — ação necessária`;
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
  return { subject, htmlContent };
}
