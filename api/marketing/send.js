import { sendTransactionalCampaign } from "../../server/brevoCampaignSender.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  const {
    emails,
    templateId,
    params,
    recipientParamsByEmail,
    subject,
    htmlContent,
    batchSize,
    batchDelayMs,
    maxRetries,
    requestTimeoutMs,
  } = req.body || {};

  if (!Array.isArray(emails)) {
    res.status(400).json({ ok: false, error: "emails must be an array." });
    return;
  }

  try {
    const summary = await sendTransactionalCampaign({
      emails,
      templateId,
      params,
      recipientParamsByEmail,
      subject,
      htmlContent,
      options: {
        batchSize,
        batchDelayMs,
        maxRetries,
        requestTimeoutMs,
      },
    });

    res.status(200).json({ ok: true, summary });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;
    res.status(statusCode).json({
      ok: false,
      error: error.message || "Unexpected error while sending campaign.",
      details: error.details || null,
    });
  }
}
