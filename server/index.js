import "dotenv/config";
import cors from "cors";
import express from "express";
import { sendTransactionalCampaign } from "./brevoCampaignSender.js";
import { getCaeDescriptions } from "./caeCatalog.js";
import { lookupSicaeCaesByNif } from "./sicaeCaeLookup.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "marketing-email-sender" });
});

app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
  res.status(204).end();
});

app.post("/api/marketing/send", async (req, res) => {
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
    return res.status(400).json({
      ok: false,
      error: "emails must be an array.",
    });
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

    return res.status(200).json({
      ok: true,
      summary,
    });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;

    return res.status(statusCode).json({
      ok: false,
      error: error.message || "Unexpected error while sending campaign.",
      details: error.details || null,
    });
  }
});

app.post("/api/transfergest/send", async (req, res) => {
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
    return res.status(400).json({
      ok: false,
      error: "emails must be an array.",
    });
  }

  try {
    const summary = await sendTransactionalCampaign({
      senderProfile: "transfergest",
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

    return res.status(200).json({
      ok: true,
      summary,
    });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;

    return res.status(statusCode).json({
      ok: false,
      error: error.message || "Unexpected error while sending campaign.",
      details: error.details || null,
    });
  }
});

app.post("/api/project-notifications/send-created", async (req, res) => {
  const { email, projectTitle, projectUrl, responsibleName, clientName } = req.body || {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({ ok: false, error: "email is required." });
  }

  if (!projectTitle || !projectUrl) {
    return res.status(400).json({ ok: false, error: "projectTitle and projectUrl are required." });
  }

  const safeProjectTitle = String(projectTitle).trim();
  const safeProjectUrl = String(projectUrl).trim();
  const safeResponsibleName = String(responsibleName || "Responsável").trim() || "Responsável";
  const safeClientName = String(clientName || "").trim();

  const subject = `Novo projeto atribuído: ${safeProjectTitle}`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b">
      <h2 style="margin:0 0 12px 0;color:#0f172a">Foi criado um novo projeto</h2>
      <p style="margin:0 0 8px 0">Olá, ${safeResponsibleName}.</p>
      <p style="margin:0 0 8px 0">Foi criado o projeto <strong>${safeProjectTitle}</strong>${safeClientName ? ` para ${safeClientName}` : ""}.</p>
      <p style="margin:0 0 20px 0">Podes abrir diretamente aqui:</p>
      <p style="margin:0 0 24px 0"><a href="${safeProjectUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Abrir projeto</a></p>
      <p style="margin:0;color:#64748b;font-size:12px">Se o botão não funcionar, copia este link: ${safeProjectUrl}</p>
    </div>
  `;

  try {
    const summary = await sendTransactionalCampaign({
      senderProfile: "marketing",
      emails: [email],
      subject,
      htmlContent,
    });

    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;
    return res.status(statusCode).json({
      ok: false,
      error: error.message || "Unexpected error while sending project notification.",
      details: error.details || null,
    });
  }
});

app.get("/api/sicae-caes", async (req, res) => {
  try {
    const data = await lookupSicaeCaesByNif(req.query?.nif);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;
    return res.status(statusCode).json({
      ok: false,
      error: error.message || "Erro inesperado na consulta SICAE.",
      details: error.details || null,
    });
  }
});

app.get("/api/cae-descriptions", (req, res) => {
  const rawCodes = req.query?.codes;
  const codes = typeof rawCodes === "string"
    ? rawCodes.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const caes = getCaeDescriptions(codes);
  return res.status(200).json({ ok: true, total: caes.length, caes });
});

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`[Marketing Mail API] Running on http://localhost:${PORT}`);
});
