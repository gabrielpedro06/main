// =====================================================================
// GET|POST /api/cae-descriptions — devolve a designação oficial de códigos CAE
// (rev. 4) a partir do CSV em src/data (ver server/caeCatalog.js).
// Sem autenticação: só lê um catálogo público, não toca na base de dados.
// Usado em src/pages/Clientes.jsx para descrever os CAE de uma entidade.
// =====================================================================
import { getCaeDescriptions } from "../server/caeCatalog.js";

export const config = {
  runtime: "nodejs",
};

function normalizeCodes(rawCodes) {
  if (Array.isArray(rawCodes)) return rawCodes;
  if (typeof rawCodes === "string") {
    return rawCodes.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Entrada: `codes` na query (GET, "47111,62010") ou no corpo (POST, string ou lista).
 * Saída: `{ ok, total, caes: [{ codigo, descricao|null }] }` (códigos inválidos são ignorados).
 */
export default function handler(req, res) {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  const rawCodes = method === "GET" ? req.query?.codes : req.body?.codes;
  const codes = normalizeCodes(rawCodes);

  const results = getCaeDescriptions(codes);
  res.status(200).json({ ok: true, total: results.length, caes: results });
}
