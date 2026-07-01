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

// Nova função para notificações de projetos (com identificador de remetente)
export async function sendProjectNotification(payload) {
  const endpoint = `${DEFAULT_MARKETING_API_BASE}/api/project-notifications/send-created`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    // Adicionamos o senderType: "PROJECT" automaticamente aqui
    body: JSON.stringify({ ...payload, senderType: "PROJECT" }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Falha ao enviar notificação de projeto.");
  }

  return data;
}

// Mantemos a função original de campanhas de marketing
export async function sendMarketingCampaign(payload) {
  const endpoint = `${DEFAULT_MARKETING_API_BASE}/api/marketing/send`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

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

  return data.summary;
}