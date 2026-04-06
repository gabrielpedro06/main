import fs from "node:fs";

const CSV_FILE_URL = new URL("../src/data/CAE rev4.xlsx - Table 1.csv", import.meta.url);

let cachedMap = null;

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function loadCaeCatalogMap() {
  if (cachedMap) return cachedMap;

  const raw = fs.readFileSync(CSV_FILE_URL, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    cachedMap = new Map();
    return cachedMap;
  }

  const headers = rows[0].map((value) => String(value || "").trim().toLowerCase());
  const idxClasse = headers.indexOf("classe");
  const idxSubclasse = headers.indexOf("subclasse");
  const idxDesignacao = headers.indexOf("designacao");

  const map = new Map();

  for (let i = 1; i < rows.length; i += 1) {
    const cols = rows[i];
    const classe = String(cols[idxClasse] || "").trim();
    const subclasse = String(cols[idxSubclasse] || "").trim();
    const designacao = String(cols[idxDesignacao] || "").trim();

    const candidates = [subclasse, classe].filter((value) => /^\d{5}$/.test(value));
    if (candidates.length === 0 || !designacao) continue;

    for (const code of candidates) {
      if (!map.has(code)) {
        map.set(code, designacao);
      }
    }
  }

  cachedMap = map;
  return cachedMap;
}

export function getCaeDescription(code) {
  const key = String(code || "").trim();
  if (!/^\d{5}$/.test(key)) return null;
  return loadCaeCatalogMap().get(key) || null;
}
