const RAW_TRANSFERGEST_API_BASE = import.meta.env.VITE_TRANSFERGEST_API_BASE || import.meta.env.VITE_MARKETING_API_BASE || "";

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const isLocalHost = (hostname) => {
  const normalized = String(hostname || "").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
};

const resolveTransfergestApiBase = (rawBase) => {
  const base = trimTrailingSlash(rawBase);
  if (!base) return "";

  if (typeof window === "undefined") {
    return base;
  }

  try {
    const parsedBase = new URL(base, window.location.origin);
    const appHost = window.location.hostname;

    // If the app is remote, ignore localhost API bases and fallback to same-origin /api routes.
    if (isLocalHost(parsedBase.hostname) && !isLocalHost(appHost)) {
      return "";
    }

    if (parsedBase.origin === window.location.origin) {
      return "";
    }

    return trimTrailingSlash(parsedBase.toString());
  } catch {
    return base;
  }
};

const DEFAULT_TRANSFERGEST_API_BASE = resolveTransfergestApiBase(RAW_TRANSFERGEST_API_BASE);

function getNetworkHelpMessage() {
  return "Nao foi possivel ligar a API TransferGest. Se estiveres em dev local inicia 'npm run dev:server' (ou 'npm run dev:full'). Em producao confirma que VITE_TRANSFERGEST_API_BASE nao aponta para localhost.";
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
