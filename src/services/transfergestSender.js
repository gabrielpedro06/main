const DEFAULT_TRANSFERGEST_API_BASE = import.meta.env.VITE_TRANSFERGEST_API_BASE || import.meta.env.VITE_MARKETING_API_BASE || "";

function getNetworkHelpMessage() {
  return "Nao foi possivel ligar a API TransferGest. Inicia o servidor local com 'npm run dev:server' (ou 'npm run dev:full').";
}

export async function checkTransfergestApiHealth() {
  const endpoint = `${DEFAULT_TRANSFERGEST_API_BASE}/api/health`;

  let response;
  try {
    response = await fetch(endpoint, { method: "GET" });
  } catch {
    throw new Error(getNetworkHelpMessage());
  }

  if (!response.ok) {
    throw new Error("API TransferGest indisponivel.");
  }

  return response.json().catch(() => ({ ok: true }));
}

export async function sendTransfergestCampaign(payload) {
  const endpoint = `${DEFAULT_TRANSFERGEST_API_BASE}/api/transfergest/send`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(getNetworkHelpMessage());
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.ok) {
    let message = data?.error || "Falha ao enviar campanha TransferGest.";
    if (response.status === 500 && !data?.error) {
      message = "Erro interno na API TransferGest. Confirma variaveis TRANSFERGEST_BREVO_* no .env.";
    }

    const error = new Error(message);
    error.details = data?.details || null;
    error.status = response.status;
    throw error;
  }

  return data.summary;
}
