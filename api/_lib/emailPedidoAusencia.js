// =====================================================================
// Email "novo pedido de ausência" enviado aos administradores.
// Os dados vêm SEMPRE da base de dados (nunca do browser) e tudo é escapado.
// Os botões abrem a página do pedido DENTRO do Bizin (pede login + 2FA);
// a decisão é sempre tomada lá, nunca pelo próprio link.
// =====================================================================
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


function buildActionButtons(requestUrl) {
  if (!requestUrl) return "";
  const link = (acao) => escapeHtml(`${requestUrl}?acao=${acao}`);
  return `
  <table cellpadding="0" cellspacing="0" style="margin:24px 0 10px">
    <tr>
      <td style="padding-right:10px">
        <a href="${link("aprovar")}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold;font-size:15px">Aprovar</a>
      </td>
      <td style="padding-right:10px">
        <a href="${link("rejeitar")}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold;font-size:15px">Rejeitar</a>
      </td>
      <td>
        <a href="${escapeHtml(requestUrl)}" style="display:inline-block;background:#f1f5f9;color:#0f172a;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold;font-size:15px">Ver detalhes</a>
      </td>
    </tr>
  </table>
  <p style="margin:0;color:#64748b;font-size:12px">Os botões abrem o pedido no Bizin (com login e código 2FA). Confirma lá a decisão.</p>`;
}

export function construirEmailPedido({ pedido, isKm, isEditing, requesterName, requestUrl }) {
  const requestType = pedido.tipo || "ausência";
  const safeType = escapeHtml(requestType);
  const safeRequesterName = escapeHtml(requesterName || "Um colaborador");
  const details = { ...pedido, isKmRequest: isKm };
  const detailsBlock = buildDetailsBlock(details, safeType);
  const actionButtons = buildActionButtons(requestUrl);
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
                <div style="font-size:0.82rem;color:#475569;margin-bottom:8px">Decide no Bizin:</div>
                ${actionButtons}
              </div>

            </div>

            <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;text-align:center">
              Este email foi enviado automaticamente pelo sistema de RH. Não respondas diretamente.
            </p>
          </div>`;
  return { subject, htmlContent };
}
