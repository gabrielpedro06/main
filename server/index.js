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
