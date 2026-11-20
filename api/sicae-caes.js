// =====================================================================
// GET|POST /api/sicae-caes?nif=<NIF> — lê os CAE de uma empresa no site público
// do SICAE (sicae.pt) e junta a designação de cada código (server/caeCatalog.js).
// Sem autenticação e sem base de dados. Usado em src/pages/Clientes.jsx; se esta
// rota falhar, a página tenta a edge function supabase/functions/fetch-caes-sicae.
// =====================================================================
import { lookupSicaeCaesByNif } from "../server/sicaeCaeLookup.js";

export const config = {
  runtime: "nodejs",
};

/**
 * Saída: `{ ok: true, nif, total, caes: [{ codigo, descricao, fonte }], sourceUrl, fetchedAt }`
 * ou `{ ok: false, error, details }` (400 NIF inválido, 502 SICAE indisponível).
 */
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
