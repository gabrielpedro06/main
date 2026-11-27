/**
 * Organizador de PDFs — leitura do QR code fiscal da AT e separação de documentos.
 * Tudo corre no browser: nenhum ficheiro ou dado sai do computador.
 *
 * O QR fiscal (Portaria 195/2020) tem campos separados por "*":
 *   A: NIF emitente · B: NIF adquirente · D: tipo (FT, FS, FR, NC…) · F: data AAAAMMDD
 *   G: identificação do documento · H: ATCUD · O: total com impostos
 */
import jsQR from "jsqr";
import {
  PDF_CATEGORIES,
  computeBreaks,
  classifyCategory,
  extractEntity,
  extractDocumentDate,
  extractDocumentNumber,
  extractNif,
  extractAtcud,
  extractNifs,
  isBlankPage,
  isKnownName,
  nameForNif,
  pageKind,
  pageAmounts,
} from "./pdfOrganizerEngine";

export { PDF_CATEGORIES, isBlankPage };

export const TIPOS_DOC = {
  FT: "Fatura",
  FS: "Fatura simplificada",
  FR: "Fatura-recibo",
  NC: "Nota de crédito",
  ND: "Nota de débito",
  RC: "Recibo",
  RG: "Recibo",
  GT: "Guia de transporte",
  GR: "Guia de remessa",
  GA: "Guia de ativos",
  GC: "Guia de consignação",
  GD: "Guia de devolução",
};

// ---------------------------------------------------------------------
// QR fiscal
// ---------------------------------------------------------------------
/**
 * Lê o texto de um QR fiscal da AT.
 * @param {string} raw texto do QR ("A:123456789*B:…")
 * @returns {object|null} { nifEmitente, nifCliente, tipo, data (AAAA-MM-DD), numero, atcud, total }
 *   (+ iva), ou null se não for um QR fiscal. NIF cliente 999999990 (consumidor final) → "".
 */
export function parseFiscalQr(raw) {
  if (!raw || !/^A:\d{9}\*B:/.test(raw)) return null;
  const f = {};
  raw.split("*").forEach((part) => {
    const i = part.indexOf(":");
    if (i > 0) f[part.slice(0, i)] = part.slice(i + 1);
  });
  const d = f.F || "";
  const total = Number(String(f.O || "").replace(",", "."));
  return {
    nifEmitente: f.A || "",
    nifCliente: f.B && f.B !== "999999990" ? f.B : "",
    tipo: (f.D || "").toUpperCase(),
    data: /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "",
    numero: (f.G || "").trim(),
    atcud: (f.H || "").trim().toUpperCase(),
    total: Number.isFinite(total) ? total : null,
    iva: Number.isFinite(Number(f.N)) ? Number(f.N) : null,
  };
}

function tryRegion(ctx, x, y, w, h, inversion = "dontInvert", binarize = false) {
  if (w < 60 || h < 60) return null;
  const img = ctx.getImageData(x, y, w, h);
  if (binarize) {
    // Preto só onde TODOS os canais são escuros: o fundo cor-de-rosa/colorido fica branco
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.max(d[i], d[i + 1], d[i + 2]) < 125 ? 0 : 255;
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
    }
  }
  const hit = jsQR(img.data, w, h, { inversionAttempts: inversion });
  return hit ? parseFiscalQr(hit.data) : null;
}

/**
 * Zona com tinta (a tira do talão numa folha A4 digitalizada).
 * Devolve { x, w } em pixéis do canvas, ou null se a página estiver toda ocupada.
 */
export function inkStrip(canvas) {
  const SW = 300;
  const W = canvas.width;
  const H = canvas.height;
  const { data } = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H);
  // Tinta por coluna medida na resolução completa (uma redução por média apaga o texto fino),
  // agrupada em 300 colunas. Ignora 4% de cima e de baixo (carimbos e bordas do scanner).
  const ink = new Array(SW).fill(0);
  const y0 = Math.floor(H * 0.04);
  const y1 = Math.floor(H * 0.96);
  const STEP = 3;
  for (let y = y0; y < y1; y += STEP) {
    const row = y * W;
    for (let x = 0; x < W; x += 1) {
      const i = (row + x) * 4;
      if (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11 < 140) ink[Math.min(SW - 1, Math.floor((x * SW) / W))] += 1;
    }
  }
  const min = ((y1 - y0) / STEP) * (W / SW) * 0.004;
  const runs = [];
  let cur = null;
  ink.forEach((v, x) => {
    if (v > min) {
      if (cur && x - cur.end <= 12) { cur.end = x; cur.sum += v; } else { cur = { start: x, end: x, sum: v }; runs.push(cur); }
    }
  });
  // Linhas finas (rebordo do scanner, margens ponteadas) não são conteúdo
  const real = runs.filter((r) => r.end - r.start + 1 >= SW * 0.04);
  if (!real.length) return null;
  real.sort((a, b) => b.sum - a.sum);
  const best = real[0];
  const width = best.end - best.start + 1;
  if (width > SW * 0.8) return null;
  // Só recorta quando o conteúdo está concentrado numa tira (talão).
  // Documentos de página inteira (extratos, guias) têm o texto espalhado: lê-se a página toda.
  const totalInk = real.reduce((s, r) => s + r.sum, 0);
  if (best.sum < totalInk * 0.7) return null;
  const k = canvas.width / SW;
  const m = Math.round(SW * 0.05); // margem generosa: cortar texto é pior do que ler um pouco de branco
  const x = Math.max(0, Math.round((best.start - m) * k));
  const xe = Math.min(canvas.width, Math.round((best.end + m + 1) * k));
  return { x, w: xe - x };
}

/** Novo canvas só com a tira {x, w} (de inkStrip); sem tira devolve o original. */
export function cropCanvas(canvas, strip) {
  if (!strip) return canvas;
  const c = document.createElement("canvas");
  c.width = strip.w;
  c.height = canvas.height;
  c.getContext("2d").drawImage(canvas, strip.x, 0, strip.w, canvas.height, 0, 0, strip.w, canvas.height);
  return c;
}

/**
 * Procura o QR fiscal na página (imagem inteira e depois por zonas,
 * porque há talões com mais do que um QR — ex.: inquéritos de satisfação).
 */
export function findFiscalQr(canvas, strip = null) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;
  const full = tryRegion(ctx, 0, 0, W, H);
  if (full) return full;
  // Tira do talão, inteira e por terços (o QR fica proporcionalmente maior)
  if (strip) {
    const bands = [[0, 1], [0, 0.4], [0.3, 0.4], [0.55, 0.45]];
    for (const [ry, rh] of bands) {
      const hit = tryRegion(ctx, strip.x, Math.floor(ry * H), strip.w, Math.floor(rh * H));
      if (hit) return hit;
    }
    // Talões com fundo impresso a cores (ex.: Burger King): converter para preto e branco
    for (const [ry, rh] of [[0, 1], [0.45, 0.55], [0.25, 0.5]]) {
      const bw = tryRegion(ctx, strip.x, Math.floor(ry * H), strip.w, Math.floor(rh * H), "dontInvert", true);
      if (bw) return bw;
    }
    const inv = tryRegion(ctx, strip.x, 0, strip.w, H, "attemptBoth");
    if (inv) return inv;
  }
  const cols = [[0, 0.55], [0.45, 0.55]];
  const rows = [[0, 0.4], [0.3, 0.4], [0.6, 0.4]];
  for (const [cx, cw] of cols) {
    for (const [ry, rh] of rows) {
      const hit = tryRegion(ctx, Math.floor(cx * W), Math.floor(ry * H), Math.floor(cw * W), Math.floor(rh * H));
      if (hit) return hit;
    }
  }
  // Último recurso para QR pequenos (ex.: Wok to Walk): ampliar a zona do talão para o dobro
  if (strip) {
    for (const [ry, rh] of [[0.5, 0.5], [0.25, 0.5], [0, 0.5]]) {
      const sy = Math.floor(ry * H);
      const sh = Math.floor(rh * H);
      const big = document.createElement("canvas");
      big.width = strip.w * 2;
      big.height = sh * 2;
      const bctx = big.getContext("2d", { willReadFrequently: true });
      bctx.imageSmoothingEnabled = false;
      bctx.drawImage(canvas, strip.x, sy, strip.w, sh, 0, 0, big.width, big.height);
      const hit = tryRegion(bctx, 0, 0, big.width, big.height) || tryRegion(bctx, 0, 0, big.width, big.height, "dontInvert", true);
      big.width = 0;
      if (hit) return hit;
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// Separação: o QR manda; o texto só decide onde não há QR
// ---------------------------------------------------------------------
const qrKey = (p) => (p.qr ? (p.qr.atcud || `${p.qr.nifEmitente}|${p.qr.numero}`) : "");

/**
 * Quebras de documento: parte das regras de texto (computeBreaks) e corrige-as com o QR —
 * páginas com o mesmo QR (ATCUD ou NIF+nº) ficam juntas; um QR diferente começa documento novo.
 * @param {Array<{ fileId: string, text: string, qr: object|null }>} pages por ordem
 * @returns {boolean[]} true = a página começa um documento
 */
export function segmentPages(pages) {
  const base = computeBreaks(pages);
  const out = [];
  let keys = new Set();
  pages.forEach((p, i) => {
    const newFile = i === 0 || pages[i - 1].fileId !== p.fileId;
    const key = qrKey(p);
    let brk = newFile || base[i];
    if (!newFile && key) {
      if (keys.has(key)) brk = false;
      else if (keys.size) brk = true;
    }
    if (brk) keys = new Set();
    if (key) keys.add(key);
    out.push(brk);
  });
  return out;
}

// ---------------------------------------------------------------------
// Metadados de um documento
// ---------------------------------------------------------------------
function categoryFor(tipo, text) {
  const byText = classifyCategory(text);
  if (["Extratos bancários", "Vencimentos", "Contratos", "Impostos / Estado"].includes(byText)) return byText;
  if (["GT", "GR", "GA", "GC", "GD"].includes(tipo)) return "Guias";
  if (tipo === "FS") return "Gastos";
  if (["FT", "FR", "NC", "ND", "RC", "RG"].includes(tipo)) return byText === "Gastos" ? "Gastos" : "Faturas";
  return byText;
}

function totalFromText(text) {
  const m = text.match(/\b(?:total(?:\s*a\s*pagar|\s*do\s*documento|\s*venda|\s*em\s*eur)?|valor\s*a\s*pagar)\s*:?\s*(?:eur\s*|[€εE£Ffer]\s*)?(\d{1,6}[.,]\d{2})\b/i); // € lido pelo OCR como F, E, £…
  return m ? Number(m[1].replace(",", ".")) : null;
}

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();

const LEGAL = /[\s,]*(?:-\s*)?(?:sociedade\s+unipessoal,?\s*)?(?:unipessoal,?\s*)?(?:lda|limitada|s\.?\s?a|sgps|e\.?i\.?r\.?l)\.?\s*$/i;
const NOISE = /^(?:original|duplicado|triplicado|segunda\s*via|2\.?a?\s*via|o\s*seu\s*pedido|pedido|order|documento\s*de\s*venda|fa[ck]?tura|recibo|tal[aã]o|cliente|mesa|bk\s*n|tel|telf|tlf|telefone|e-?mail|www|http|capital|registo|regist|mat(?:r[ií]cula)?\.?\s*cons|nif|n\.?i\.?f|nipc|n\.?\s*contrib|contribuinte|cont\.|sede|c\.?r\.?c|conservat|processad|atcud|copyright|obrigad|volte|iva|total|data|hora|operador|empregado|func)/i;
const BAD_WORDS = /\b(?:rua|r\.|av\.?|avenida|travessa|estrada|largo|pra[cç]a|lote|loja|piso|urb\.?|urbaniza|edif[ií]cio|apartado|chamada|rede\s*fixa|total|iva|taxa|base|eur|euros|pagamento|visa|multibanco|troco|qtd|quantidade|pre[cç]o|artigo|descri[cç][aã]o|valor|data|hora|cliente|morada)\b/i;
const GENERIC = /^(?:restaurante|snack[- ]?bar|caf[eé]|pastelaria|padaria|bar|loja|posto|gasolineira|supermercado)$/i;

function goodLine(line) {
  const l = clean(line).replace(/^[*#=\-_.\s>]+|[*#=\-_.\s<]+$/g, "");
  if (l.length < 3 || l.length > 70) return "";
  if (NOISE.test(l) || BAD_WORDS.test(l) || GENERIC.test(l)) return "";
  if (/\d{4}-\d{3}/.test(l) || (l.match(/\d/g) || []).length > 2) return "";
  const letters = l.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 4 || letters.length / l.replace(/\s/g, "").length < 0.7) return "";
  const vowels = letters.replace(/[^aeiouáàãâéêíóôõúAEIOUÁÀÃÂÉÊÍÓÔÕÚ]/g, "").length;
  if (vowels / letters.length < 0.25) return "";
  return l;
}

function prettyName(raw) {
  let n = clean(raw).replace(LEGAL, "").replace(/[,.;:\-–\s]+$/, "");
  // Lixo do OCR no fim da linha: "Yummy Sweel tda 6" → "Yummy Sweel"
  const words = n.split(" ");
  while (words.length > 1 && (/\d/.test(words[words.length - 1]) || /^[a-zà-ÿ|‘’'.]{1,3}$/.test(words[words.length - 1]))) words.pop();
  n = words.join(" ");
  // "Qualitalhos, Ind e Com. de Carnes" → "Qualitalhos"
  const firstPart = n.split(",")[0].trim();
  if (firstPart.length >= 4 && firstPart !== n) n = firstPart;
  if (n === n.toUpperCase()) {
    n = n.toLowerCase().replace(/(^|[\s&/-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase())
      .replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (w) => w.toLowerCase());
  }
  return n.slice(0, 50);
}

/**
 * Nome do emissor a partir das linhas do topo do talão/fatura:
 * prefere a marca (ex.: "Hora Doce") que aparece logo acima da firma legal ("P & S Martins, Lda").
 */
export function headerName(text, nif = "") {
  const lines = String(text || "").split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";
  let nifIdx = -1;
  if (nif) nifIdx = lines.findIndex((l) => l.replace(/\s/g, "").includes(nif));
  // Se o OCR leu mal o NIF, usa a 1.ª linha com "Contribuinte/NIF/NIPC" como fim do cabeçalho
  const labelIdx = lines.findIndex((l) => /\b(?:contrib|n\.?\s*i\.?\s*f|nipc)/i.test(l));
  // O emissor está sempre no topo: o cabeçalho acaba na 1.ª linha de NIF/Contribuinte
  // (assim um NIF de cliente mal lido mais abaixo não desloca a procura)
  const cands = [nifIdx, labelIdx].filter((i) => i > 0);
  const end = cands.length ? Math.min(...cands) : Math.min(lines.length, 8);
  // linha da firma legal mais próxima acima do NIF
  let legalIdx = -1;
  for (let i = end - 1; i >= Math.max(0, end - 7); i -= 1) {
    if (LEGAL.test(lines[i]) && goodLine(lines[i].replace(LEGAL, ""))) { legalIdx = i; break; }
  }
  const anchor = legalIdx >= 0 ? legalIdx : end;
  for (let i = Math.max(0, anchor - 9); i < anchor; i += 1) {
    const g = goodLine(lines[i]);
    if (g) return prettyName(g);
  }
  if (legalIdx >= 0) return prettyName(lines[legalIdx]);
  return "";
}

function tipoFromText(text) {
  if (/fa[ck]?tura\s*simp/i.test(text) || /\bFS\s*\d/.test(text)) return "FS";
  if (/fa[ck]?tura\s*[/-]?\s*recibo/i.test(text)) return "FR";
  if (/nota\s*de\s*cr[eé]dito/i.test(text)) return "NC";
  if (/guia\s*de\s*remessa/i.test(text)) return "GR";
  if (/guia\s*de\s*transporte/i.test(text)) return "GT";
  if (/\bfa[ck]?tura\b/i.test(text)) return "FT";
  return "";
}

function numberFromText(text) {
  const n = extractDocumentNumber(text);
  if (n) return n;
  const pats = [
    /\bfa[ck]?tura\s*[:.]\s*([A-Z0-9][A-Z0-9-]{0,12}\s*\/\s*\d{2,10})\b/i, // Factura : FAC-N/80942
    /\bn\.?\s*[ºo°]\s*[:.]?\s*([A-Z0-9]{1,4}(?:\s[A-Z0-9]{1,4})?\s*\/\s*\d{2,10})\b/i, // Nº 1 A/105395, Nº F2/483
    /\bn\.?\s*[ºo°]?\s*[:.]?\s*([A-Z]{1,4}\s?\d{0,6}\s*\/\s*\d{2,10})\b/i,
  ];
  for (const re of pats) {
    const m = text.match(re);
    if (m) return m[1].replace(/\s+/g, " ").trim();
  }
  return "";
}

/**
 * Data com tolerância a erros de OCR: "Data:2026 08 31", "Data:2O26-O8-3l", "Emitida em 2026.08.28".
 * Só aceita datas rotuladas (Data / Emitida em / Emissão) para não apanhar validades ou outras datas.
 */
function looseDate(text) {
  const fix = (s) => s.replace(/[Oo]/g, "0").replace(/[lIi|]/g, "1").replace(/[Ss]/g, "5");
  const max = new Date().getFullYear() + 1;
  const ok = (y, mo, d) => {
    const Y = Number(y); const M = Number(mo); const D = Number(d);
    if (Y < 2000 || Y > max || M < 1 || M > 12 || D < 1 || D > 31) return "";
    return `${Y}-${String(M).padStart(2, "0")}-${String(D).padStart(2, "0")}`;
  };
  const label = /(?:data(?:\s*de\s*emiss[aã]o)?|emitid[ao]\s*em|emiss[aã]o)\s*[:.]?\s*([0-9OoIl|Ss]{4})[\s/.-]+([0-9OoIl|Ss]{1,2})[\s/.-]+([0-9OoIl|Ss]{1,2})(?![0-9])/i;
  const m = text.match(label);
  if (m) {
    const r = ok(fix(m[1]), fix(m[2]), fix(m[3]));
    if (r) return r;
  }
  const m2 = text.match(/(?:data(?:\s*de\s*emiss[aã]o)?|emitid[ao]\s*em)\s*[:.]?\s*([0-9OoIl|]{1,2})[\s/.-]+([0-9OoIl|]{1,2})[\s/.-]+([0-9OoIl|]{4})(?![0-9])/i);
  if (m2) {
    const r = ok(fix(m2[3]), fix(m2[2]), fix(m2[1]));
    if (r) return r;
  }
  return "";
}

/**
 * NIF do emissor quando não há QR: primeiro os rotulados (NIF, NIPC, Contrib., N.C.),
 * ignorando o NIF do cliente e números de telefone.
 */
function emitterNifFromText(text, clientNifs) {
  const t = String(text || "").replace(/(\d)\s(?=\d)/g, "$1");
  const re = /(?:n\.?\s*i\.?\s*f|nipc|contrib(?:uinte)?|n\.?\s*c\.?|cont\.?\s*n?)\.?\s*[ºo°]?\s*[:.]?\s*(?:PT)?\s*([1235689]\d{8})(?!\d)/gi;
  let m;
  while ((m = re.exec(t))) {
    if (!clientNifs.has(m[1]) && extractNifs(m[1]).length) return m[1];
  }
  const phone = /(?:tel|tlf|telf|telefone|fax|tm)\.?\s*[:.]?\s*(?:\+?351)?\s*$/i;
  const all = extractNifs(t).filter((n) => !clientNifs.has(n));
  return all.find((n) => !phone.test(t.slice(Math.max(0, t.indexOf(n) - 16), t.indexOf(n)))) || "";
}

/**
 * learned: { nif: "Nome" } — nomes corrigidos pelo utilizador
 */
const KIND_LABEL = { extrato: "Extrato bancário", pagamento: "Comprovativo de pagamento", declRem: "Declaração de remunerações" };
const isoFrom = (y, mo, d) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_NOME = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Mês a que o pagamento/declaração se refere ("Período 2026/6", "2026 / junho", "Ano/Mês de referência 2026/06")
function periodoRef(text) {
  const m = String(text || "").match(/(?:per[ií]odo|ano\s*\/\s*m[eêé]s\s*de\s*refer[eê]ncia)[^\d]{0,40}(20\d{2})\s*\/\s*(\d{1,2}|[a-zçã]{4,9})\b/i);
  if (!m) return "";
  let mes = Number(m[2]);
  if (!mes) mes = MESES.indexOf(m[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")) + 1;
  return mes >= 1 && mes <= 12 ? `${MESES_NOME[mes - 1]}_${m[1]}` : "";
}

// Extratos, pagamentos ao Estado e declarações (não são faturas)
function kindMeta(kind, pages, text) {
  const meta = { tipo: "", tipoLabel: KIND_LABEL[kind], label: "", nif: "", numero: "", atcud: "", total: null };
  if (kind === "extrato") {
    meta.category = "Extratos bancários";
    meta.label = "Extrato";
    meta.entity = extractEntity(text, "Extratos bancários") || "Banco";
    const per = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\s*a\s*(20\d{2})-(\d{2})-(\d{2})/);
    meta.date = per ? isoFrom(per[4], per[5], per[6]) : "";
    meta.numero = per ? `${per[1]}-${per[2]}` : "";
  } else if (kind === "pagamento") {
    meta.category = "Impostos / Estado";
    const ss = (text.match(/seguran[cç]a\s*social|seg\.?\s*social|niss/gi) || []).length;
    const at = (text.match(/autoridade\s*tribut|finan[cç]as|pagamentos?\s*ao\s*estado|multi-?\s*imposto|\bIRS\b|\bIRC\b|\bIVA\b/gi) || []).length;
    meta.entity = ss > at ? "Segurança Social" : at ? "Autoridade Tributária" : "Pagamento";
    // Que imposto/contribuição foi pago
    const sub = ss > at ? "Contribuicoes_SS"
      : /reten[cç][oõ]es\s*na\s*fonte/i.test(text) ? "Retencoes_Fonte"
        : /declara[cç][aã]o\s*mensal\s*de\s*remunera/i.test(text) ? "IRS_Remuneracoes"
          : /\bIVA\b|imposto\s*sobre\s*o\s*valor/i.test(text) ? "IVA"
            : /\bIRC\b|pagamento\s*por\s*conta/i.test(text) ? "IRC"
              : "";
    meta.label = ["Pagamento", sub, periodoRef(text)].filter(Boolean).join("_");
    // valor que se repete em mais páginas (o do pagamento)
    const count = new Map();
    pages.forEach((p) => pageAmounts(p.text).forEach((v) => count.set(v, (count.get(v) || 0) + 1)));
    const best = [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    meta.total = best && best[1] > 1 ? best[0] / 100 : null;
    const d = text.match(/(?:data\s*movimento|data)\s*:?\s*(20\d{2})[-/](\d{2})[-/](\d{2})/i);
    meta.date = d ? isoFrom(d[1], d[2], d[3]) : "";
    const n = text.match(/(?:n[uú]mero\s*do\s*documento|identifica[cç][aã]o\s*da\s*declara[cç][aã]o)\s*:?\s*(\d{6,15})/i);
    meta.numero = n ? n[1] : "";
  } else {
    meta.category = "Impostos / Estado";
    meta.entity = "Segurança Social";
    // Uma declaração por taxa contributiva (ex.: 23,90 e 33,30): a taxa distingue os ficheiros
    const taxas = [...new Set([...text.matchAll(/taxa\s*contributiva\s*:?\s*(\d{1,2}[.,]\d{2})/gi)].map((t) => t[1].replace(".", ",")))];
    meta.label = ["Declaracao_Remuneracoes", periodoRef(text), taxas.length === 1 ? `Taxa_${taxas[0].replace(",", "_")}` : ""]
      .filter(Boolean).join("_");
    const d = text.match(/data\s*de\s*entrega\s*:?\s*(20\d{2})[-/](\d{2})[-/](\d{2})/i);
    meta.date = d ? isoFrom(d[1], d[2], d[3]) : "";
    // Várias declarações do mesmo mês (uma por taxa contributiva): soma as contribuições
    const totais = [...text.matchAll(/total\s*de\s*contribui[cç][oõ]es\s*:?\s*([\d.]+,\d{2})/gi)]
      .map((t) => Number(t[1].replace(/\./g, "").replace(",", ".")));
    meta.total = totais.length ? Math.round(totais.reduce((s, v) => s + v, 0) * 100) / 100 : null;
  }
  return meta;
}

/**
 * Metadados de um documento (conjunto de páginas): categoria, fornecedor, NIF, data,
 * número, ATCUD, total e confiança ("alta" só com QR e nada em falta).
 * @param {Array<{ text: string, qr: object|null }>} pages
 * @param {Record<string,string>} [learned] { nif: "Nome" } corrigidos pelo utilizador
 * @param {Set<string>} [clientNifs] NIF do cliente (empresa do utilizador) a ignorar como emissor
 * @returns {object} inclui `missing` (campos por preencher) e `isBlank`
 */
export function buildDocMeta(pages, learned = {}, clientNifs = new Set()) {
  {
    const kinds = pages.map((p) => pageKind(p.text)).filter(Boolean);
    const kind = kinds[0];
    if (kind && !pages.some((p) => p.qr)) {
      const text = pages.map((p) => p.text || "").join("\n");
      const k = kindMeta(kind, pages, text);
      const missing = [!k.entity && "fornecedor", !k.date && "data"].filter(Boolean);
      return {
        ...k,
        nifCliente: "",
        year: (k.date || "").slice(0, 4),
        hasQr: false,
        confidence: missing.length ? "baixa" : "media",
        missing,
        isBlank: false,
      };
    }
  }
  const rawText = pages.map((p) => p.text || "").join("\n");
  const text = rawText;
  const qr = pages.find((p) => p.qr)?.qr || null;
  const tipo = qr?.tipo || tipoFromText(text);
  const category = categoryFor(tipo, text);
  const textNifs = extractNifs(text).filter((n) => !clientNifs.has(n));
  const nif = qr?.nifEmitente || emitterNifFromText(text, clientNifs) || (clientNifs.has(extractNif(text)) ? "" : extractNif(text));
  const known = learned[nif] || nameForNif(nif) || textNifs.map((n) => learned[n] || nameForNif(n)).find(Boolean);
  // Marca escrita no talão (catálogo) > nome memorizado/NIF > cabeçalho > outras regras.
  // A marca ganha porque a mesma empresa pode ter várias marcas com o mesmo NIF
  // (ex.: R.C. Sanches II explora o Wok to Walk e o Talho Burger).
  const fromText = extractEntity(text, category);
  const brand = isKnownName(fromText) && fromText !== nameForNif(nif) ? fromText : "";
  const entity = clean(brand || known || (isKnownName(fromText) ? fromText : "") || headerName(rawText, nif) || fromText);
  const textDate = extractDocumentDate(text);
  const date = qr?.data || looseDate(text) || textDate.dateStr || "";
  const year = (date || "").slice(0, 4) || textDate.year || "";
  const numero = clean(qr?.numero || numberFromText(text));
  const atcud = qr?.atcud || extractAtcud(text);
  const total = qr?.total ?? totalFromText(text);

  const missing = [];
  if (!entity) missing.push("fornecedor");
  if (!date) missing.push("data");
  if (!numero && !atcud) missing.push("nº");
  const confidence = qr ? (missing.length ? "media" : "alta") : (missing.length ? "baixa" : "media");

  return {
    category,
    tipo,
    tipoLabel: TIPOS_DOC[tipo] || "",
    nif,
    nifCliente: qr?.nifCliente || "",
    entity,
    date,
    year,
    numero,
    atcud,
    total,
    hasQr: Boolean(qr),
    confidence,
    missing,
    isBlank: pages.every((p) => isBlankPage(p.text)),
  };
}

const slug = (s) => clean(s).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_");

/** Nome do ficheiro: data_Fornecedor_Tipo_Numero (máx. 90 caracteres, sem extensão). */
export function buildFilename(m) {
  const parts = [];
  parts.push(m.date || m.year || "sem-data");
  parts.push(slug(m.entity) || "Fornecedor");
  if (m.label) parts.push(slug(m.label));
  else if (m.tipo) parts.push(m.tipo);
  else parts.push(slug(m.category === "Outros" ? "Documento" : m.category));
  if (m.numero) parts.push(slug(m.numero.replace(/^(FT|FS|FR|NC|ND|RC|RG|GT|GR)\s*/i, "")));
  return parts.join("_").slice(0, 90);
}

/** Pasta no ZIP: "Ano/Categoria" (ex.: "2026/Faturas"). */
export function buildFolder(m) {
  return [m.year || "Sem data", m.category || "Outros"].map((s) => String(s).replace(/[\\/:*?"<>|]+/g, "-")).join("/");
}
