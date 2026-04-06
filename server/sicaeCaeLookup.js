import { getCaeDescription } from "./caeCatalog.js";

const NIF_REGEX = /^\d{9}$/;
const CAE_REGEX = /\b\d{5}\b/g;

function normalizeNif(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 9);
}

function extractCaesFromHtml(html) {
  const raw = String(html || "");

  // Prefer chunks where CAE appears to reduce false positives.
  const caeChunks = raw.match(/.{0,200}CAE.{0,400}/gi) || [];
  const source = caeChunks.length > 0 ? caeChunks.join(" ") : raw;

  const matches = source.match(CAE_REGEX) || [];
  return [...new Set(matches)].filter((code) => /^\d{5}$/.test(code));
}

export async function lookupSicaeCaesByNif(inputNif) {
  const nif = normalizeNif(inputNif);
  if (!NIF_REGEX.test(nif)) {
    const error = new Error("NIF inválido. Envia um NIF com 9 dígitos.");
    error.status = 400;
    throw error;
  }

  const sourceUrl = `http://www.sicae.pt/Detalhe.aspx?NIPC=${nif}`;
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    const error = new Error("Falha ao consultar o SICAE.");
    error.status = 502;
    error.details = { upstreamStatus: response.status };
    throw error;
  }

  const html = await response.text();
  const caes = extractCaesFromHtml(html).map((codigo) => ({
    codigo,
    descricao: getCaeDescription(codigo),
    fonte: "sicae",
  }));

  return {
    nif,
    total: caes.length,
    caes,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
  };
}
