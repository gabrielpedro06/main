/* global process */
// =====================================================================
// Servidor Express SÓ PARA DESENVOLVIMENTO LOCAL (porta 8787, apenas 127.0.0.1).
// Replica as rotas de api/ (que no Vercel são funções serverless) reutilizando os
// mesmos handlers. O Vite (vite.config.js) faz proxy de /api → http://localhost:8787.
// Arranque: `npm run dev:server` ou `npm run dev:full` (Vite + este servidor).
// Lê o .env da raiz via dotenv. Ao acrescentar uma rota em api/, acrescentá-la aqui também.
// =====================================================================
import "dotenv/config";
import cors from "cors";
import express from "express";
import { getCaeDescriptions } from "./caeCatalog.js";
import { lookupSicaeCaesByNif } from "./sicaeCaeLookup.js";
import absenceAction from "../api/absence-notifications/action.js";
import notificar from "../api/_lib/notificacoes.js";
import nifLookup from "../api/_lib/nif.js";
import marketingIdeias from "../api/marketing/ideias.js";
import organizadorIa from "../api/organizador/ia.js";
import adminMfa from "../api/_lib/adminMfa.js";
import adminContas from "../api/_lib/adminContas.js";
import seguranca from "../api/_lib/alertasSeguranca.js";
import reunioes from "../api/_lib/reunioes.js";

const app = express();

// Só a própria app (dev) pode chamar esta API a partir do browser
const ORIGENS = String(process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || ORIGENS.includes(origin)) }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "marketing-email-sender" });
});

app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
  res.status(204).end();
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

app.post("/api/notificacoes/:tipo", (req, res) => notificar(req.params.tipo, req, res));
app.get("/api/nif", (req, res) => nifLookup(req, res));
app.post("/api/marketing/ideias", (req, res) => marketingIdeias(req, res));
app.post("/api/organizador/ia", (req, res) => organizadorIa(req, res));
app.post("/api/admin/mfa", (req, res) => adminMfa(req, res));
app.post("/api/admin/contas", (req, res) => adminContas(req, res));
app.post("/api/seguranca/:op", (req, res) => seguranca(req.params.op, req, res));
app.post("/api/reunioes", (req, res) => reunioes(req, res));
app.all("/api/absence-notifications/action", express.urlencoded({ extended: false }), (req, res) => absenceAction(req, res));

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, "127.0.0.1", () => { // só aceita ligações do próprio computador
  console.log(`[Marketing Mail API] Running on http://localhost:${PORT}`);
});
