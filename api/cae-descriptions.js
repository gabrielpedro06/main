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
