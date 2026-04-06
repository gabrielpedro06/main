import { lookupSicaeCaesByNif } from "../server/sicaeCaeLookup.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  const nif = method === "GET" ? req.query?.nif : req.body?.nif;

  try {
    const data = await lookupSicaeCaesByNif(nif);
    res.status(200).json({ ok: true, ...data });
  } catch (error) {
    const statusCode = typeof error.status === "number" ? Math.min(Math.max(error.status, 400), 502) : 500;
    res.status(statusCode).json({
      ok: false,
      error: error.message || "Erro inesperado na consulta SICAE.",
      details: error.details || null,
    });
  }
}
