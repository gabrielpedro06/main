import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  FolderOpen,
  FolderTree,
  Layers,
  Lock,
  Merge,
  MoreHorizontal,
  QrCode,
  RotateCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { createWorker } from "tesseract.js";
import { scoreOcrText } from "../utils/pdfOrganizerEngine";
import { redigir } from "../utils/iaRedacao";
import { supabase } from "../services/supabase";
import {
  PDF_CATEGORIES,
  TIPOS_DOC,
  buildDocMeta,
  buildFilename,
  buildFolder,
  cropCanvas,
  findFiscalQr,
  inkStrip,
  isBlankPage,
  segmentPages,
} from "../utils/faturasQr";
import "./organizadorPdf.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Descodificadores do pdf.js (JBIG2/JPEG2000 em WebAssembly, perfis de cor, fontes).
// Sem eles, digitalizações a preto e branco (ex.: comprovativos do banco) aparecem em branco.
// URL absoluto: o worker do pdf.js resolve caminhos relativos a partir do seu próprio ficheiro
const PDFJS_BASE = new URL(`${import.meta.env.BASE_URL || "/"}pdfjs/`, window.location.href).href;

// Confirma que o descodificador JBIG2 está publicado (se faltar, o servidor devolve HTML em vez de WebAssembly)
let decodersCheck = null;
const checkDecoders = () => {
  if (!decodersCheck) {
    decodersCheck = fetch(`${PDFJS_BASE}wasm/jbig2.wasm`, { cache: "force-cache" })
      .then(async (r) => {
        if (!r.ok) return false;
        const b = new Uint8Array(await r.arrayBuffer());
        return b[0] === 0 && b[1] === 0x61 && b[2] === 0x73 && b[3] === 0x6d; // "\0asm"
      })
      .catch(() => false);
  }
  return decodersCheck;
};
const openPdf = (data) => pdfjsLib.getDocument({
  data,
  wasmUrl: `${PDFJS_BASE}wasm/`,
  iccUrl: `${PDFJS_BASE}iccs/`,
  standardFontDataUrl: `${PDFJS_BASE}standard_fonts/`,
  cMapUrl: `${PDFJS_BASE}cmaps/`,
  cMapPacked: true,
});

// =====================================================================
// Organizador de faturas (v2)
// 1. Lê cada página: texto, QR fiscal da AT e (se preciso) OCR — tudo local
// 2. Separa documentos (o QR fiscal manda; o texto decide onde não há QR)
// 3. Revisão rápida e exportação em ZIP organizado + resumo.csv
// =====================================================================

const DB_NAME = "bizin-pdf-organizer";
const STORE = "sessions";
const STATE_KEY = "v2-state";
const FILES_KEY = "v2-files";
const LEARNED_KEY = "bz-pdf-fornecedores";

// ---------------- IndexedDB ----------------
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbDo(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
const dbGet = (k) => dbDo("readonly", (s) => s.get(k));
const dbPut = (k, v) => dbDo("readwrite", (s) => s.put(v, k));
const dbDel = (k) => dbDo("readwrite", (s) => s.delete(k));

// ---------------- Utilidades ----------------
const readLearned = () => {
  try { return JSON.parse(localStorage.getItem(LEARNED_KEY) || "{}") || {}; } catch { return {}; }
};
const fmtEur = (v) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("pt-PT", { style: "currency", currency: "EUR" }));
const fmtData = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT") : iso || "—");
const isPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");

function portraitRotation(page) {
  const vp = page.getViewport({ scale: 1 });
  if (vp.width <= vp.height) return page.rotate || 0;
  for (const r of [90, 270, 0, 180]) {
    const v = page.getViewport({ scale: 1, rotation: r });
    if (v.width <= v.height) return r;
  }
  return page.rotate || 0;
}

function rotate180(src) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d");
  ctx.translate(c.width, c.height);
  ctx.rotate(Math.PI);
  ctx.drawImage(src, 0, 0);
  return c;
}

/**
 * Páginas digitalizadas muito claras (texto cinzento-claro): estica o contraste
 * para que miniatura, QR e OCR "vejam" o texto. Não mexe em páginas já nítidas.
 */
function enhanceContrast(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 16) hist[(d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8] += 1;
  const total = d.length / 16;
  // tom mais escuro "real" (0,3% mais escuro) e fundo (percentil 60)
  let acc = 0; let dark = 0; let light = 255;
  for (let v = 0; v < 256; v += 1) { acc += hist[v]; if (acc >= total * 0.003) { dark = v; break; } }
  acc = 0;
  for (let v = 0; v < 256; v += 1) { acc += hist[v]; if (acc >= total * 0.6) { light = v; break; } }
  if (dark < 90 || light - dark < 25) return false; // já tem preto suficiente (ou página vazia)
  const lo = dark;
  const hi = Math.max(lo + 20, light - 8);
  const k = 255 / (hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const v = (d[i + c] - lo) * k;
      d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  ctx.putImageData(img, 0, 0);
  return true;
}

function stepDown(canvas, width) {
  let src = canvas;
  let w = canvas.width;
  let h = canvas.height;
  while (w / 2 >= width) {
    const c = document.createElement("canvas");
    c.width = Math.round(w / 2);
    c.height = Math.round(h / 2);
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, c.width, c.height);
    if (src !== canvas) src.width = 0;
    src = c;
    w = c.width;
    h = c.height;
  }
  const out = document.createElement("canvas");
  out.width = width;
  out.height = Math.round((h / w) * width);
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(src, 0, 0, out.width, out.height);
  if (src !== canvas) src.width = 0;
  return out;
}

function thumbOf(canvas, width = 240) {
  const t = stepDown(canvas, width);
  const url = t.toDataURL("image/jpeg", 0.75);
  t.width = 0;
  return url;
}

/**
 * Texto muito fino (traços de 1 píxel, pontilhados): engrossa os traços escuros
 * (filtro de mínimo 3x3). Ajuda o OCR e a miniatura em digitalizações de baixa qualidade.
 */
function thickenStrokes(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const g = new Uint8Array(W * H);
  for (let i = 0, j = 0; j < g.length; i += 4, j += 1) g[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    const row = y * W;
    for (let x = 0; x < W; x += 1) {
      const a = g[row + x];
      const l = x > 0 ? g[row + x - 1] : a;
      const r = x < W - 1 ? g[row + x + 1] : a;
      tmp[row + x] = a < l ? (a < r ? a : r) : (l < r ? l : r);
    }
  }
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      const a = tmp[i];
      const u = y > 0 ? tmp[i - W] : a;
      const dn = y < H - 1 ? tmp[i + W] : a;
      const v = a < u ? (a < dn ? a : dn) : (u < dn ? u : dn);
      const k = i * 4;
      d[k] = v; d[k + 1] = v; d[k + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Mantém as quebras de linha (servem para encontrar o nome no cabeçalho)
const tidy = (t) => String(t || "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

const textIsWeak = (t) => {
  const c = (t || "").replace(/\s+/g, " ").trim();
  return c.length < 60 || scoreOcrText(c) < 40;
};

// Fração de "tinta" numa página (para detetar desenhos que saíram em branco)
function inkRatio(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let ink = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 4 * 7) { // 1 em cada 7 píxeis
    n += 1;
    if (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 160) ink += 1;
  }
  return n ? ink / n : 0;
}

const wait = (ms) => new Promise((r) => { window.setTimeout(r, ms); });

/**
 * Lê uma página: desenha (3x), reforça contraste, procura o QR fiscal e faz OCR se não houver texto.
 * Se a página sair em branco (descodificador de imagens ainda a carregar), volta a desenhar.
 */
async function readPdfPage(pdf, n, getOcr) {
  let page = await pdf.getPage(n);
  const content = await page.getTextContent();
  let text = tidy(content.items.map((it) => (it.str || "") + (it.hasEOL ? "\n" : " ")).join(""));
  let rotation = portraitRotation(page);
  const vp = page.getViewport({ scale: 3, rotation });
  let canvas = null;
  let blankRender = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (canvas) {
      // A imagem saiu em branco: descarta a imagem já descodificada (senão o pdf.js reutiliza-a) e volta a ler
      canvas.width = 0;
      page.cleanup();
      await wait(400 * attempt);
      page = await pdf.getPage(n);
    }
    canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp, intent: "print" }).promise;
    blankRender = inkRatio(canvas) <= 0.0005;
    if (!blankRender || text.length > 40) break;
  }

  // Digitalizações desbotadas: reforça o contraste
  enhanceContrast(canvas);
  const strip = inkStrip(canvas);
  const qr = findFiscalQr(canvas, strip);
  if (inkRatio(canvas) < 0.03) thickenStrokes(canvas);

  if (textIsWeak(text)) {
    const worker = await getOcr();
    // OCR só na tira do talão: mais rápido e sem o carimbo do scanner ao lado
    const area = cropCanvas(canvas, strip);
    const a = (await worker.recognize(area)).data.text || "";
    let best = a;
    if (scoreOcrText(a) < 40) {
      const flipped = rotate180(area);
      const b = (await worker.recognize(flipped)).data.text || "";
      // Só vira se ao contrário se ler claramente melhor (OCR fraco não deve virar páginas direitas)
      if (scoreOcrText(b) >= 40 && scoreOcrText(b) > scoreOcrText(a) + 15) {
        best = b;
        rotation = (rotation + 180) % 360;
        const fullFlip = rotate180(canvas);
        canvas.width = 0;
        canvas = fullFlip;
      }
      flipped.width = 0;
    }
    if (area !== canvas) {
      area.width = 0;
      // Rede de segurança: se a tira escolhida não tinha texto, lê a página inteira
      if (textIsWeak(best)) {
        const full = (await worker.recognize(canvas)).data.text || "";
        if (scoreOcrText(full) > scoreOcrText(best)) best = full;
      }
    }
    text = tidy(best) || text;
  }

  const thumb = thumbOf(canvas);
  canvas.width = 0;
  page.cleanup();
  return { text, qr, rotation, thumb, thumbRot: rotation, blankRender };
}

// "Pedir à IA": rota no servidor (mesma base da API do Marketing)
const IA_API = `${import.meta.env.VITE_MARKETING_API_BASE || ""}/api/organizador/ia`;
const IA_MAX_PAGINAS = 40;

// Página sem conteúdo lido ou cuja imagem saiu em branco ao desenhar
const needsReread = (p) => !p.qr && (isBlankPage(p.text) || Boolean(p.blankRender));

const DECODERS_MISSING = "Faltam os descodificadores de imagem do leitor de PDF (pasta public/pdfjs não publicada). "
  + "Páginas digitalizadas podem sair em branco: publiquem essa pasta e usem Mais → Reler páginas em branco.";

// Pré-visualização grande: um documento pdf.js por ficheiro
const docCache = new Map();
function pdfOf(file) {
  if (!docCache.has(file.id)) {
    const task = openPdf(file.bytes.slice(0));
    task.promise.catch(() => docCache.delete(file.id));
    docCache.set(file.id, task);
  }
  return docCache.get(file.id).promise;
}
function releaseDocs() {
  docCache.forEach((t) => t.destroy().catch(() => {}));
  docCache.clear();
}

// =====================================================================
export default function OrganizadorPdf() {
  const inputRef = useRef(null);
  const cancelRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [files, setFiles] = useState([]);
  const [pages, setPages] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [learned, setLearned] = useState(readLearned);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [expanded, setExpanded] = useState(() => new Set());
  const [zoom, setZoom] = useState(null);
  const [menu, setMenu] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const busy = Boolean(progress);

  // Pré-visualização: fecha com Esc e não deixa a página de trás fazer scroll
  const zoomOpen = Boolean(zoom);
  // Diálogo de confirmação (substitui o window.confirm): askConfirm({...}) → Promise<boolean>
  const [dialog, setDialog] = useState(null);
  const askConfirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const closeDialog = useCallback((value) => {
    setDialog((d) => { d?.resolve(value); return null; });
  }, []);
  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => { if (e.key === "Escape") closeDialog(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, closeDialog]);

  useEffect(() => {
    if (!zoomOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setZoom(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoomOpen]);

  // ---------------- Sessão guardada ----------------
  useEffect(() => {
    let alive = true;
    Promise.all([dbGet(STATE_KEY), dbGet(FILES_KEY)])
      .then(([state, saved]) => {
        if (!alive) return;
        if (state && Array.isArray(saved)) {
          setFiles(saved);
          setPages(state.pages || []);
          setOverrides(state.overrides || {});
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; releaseDocs(); };
  }, []);

  useEffect(() => {
    if (!ready || busy) return undefined;
    const t = window.setTimeout(() => {
      dbPut(STATE_KEY, { pages, overrides, savedAt: Date.now() }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(t);
  }, [pages, overrides, ready, busy]);

  useEffect(() => {
    if (!ready) return;
    dbPut(FILES_KEY, files).catch(() => {});
  }, [files, ready]);

  useEffect(() => {
    if (!busy) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  // ---------------- Documentos ----------------
  const docs = useMemo(() => {
    // NIF do cliente (a própria empresa): vem no campo B dos QR lidos
    const clientNifs = new Set(pages.map((p) => p.qr?.nifCliente).filter(Boolean));
    const groups = [];
    pages.forEach((p, i) => {
      if (i === 0 || p.breakBefore || !groups.length) groups.push({ key: p.id, all: [] });
      groups[groups.length - 1].all.push(p);
    });
    const list = groups
      .map((g) => ({ ...g, pages: g.all.filter((p) => !p.excluded) }))
      .filter((g) => g.pages.length)
      .map((g) => {
        const auto = buildDocMeta(g.pages, learned, clientNifs);
        const o = overrides[g.key] || {};
        const m = { ...auto, ...o };
        if (o.date !== undefined) m.year = (o.date || "").slice(0, 4) || auto.year;
        if (o.entity !== undefined || o.date !== undefined || o.numero !== undefined) {
          m.missing = [!m.entity && "fornecedor", !m.date && "data", !m.numero && !m.atcud && "nº"].filter(Boolean);
          if (!m.missing.length) m.confidence = "alta";
        }
        if (o.aiDuvida) m.confidence = "media";
        return { ...g, meta: m, filename: o.filename || buildFilename(m), folder: buildFolder(m) };
      });
    const seen = new Map();
    list.forEach((d) => {
      if (d.meta.atcud) seen.set(d.meta.atcud, (seen.get(d.meta.atcud) || 0) + 1);
    });
    return list.map((d, i) => ({ ...d, index: i, duplicate: Boolean(d.meta.atcud && seen.get(d.meta.atcud) > 1) }));
  }, [pages, overrides, learned]);

  const stats = useMemo(() => ({
    docs: docs.length,
    pages: pages.filter((p) => !p.excluded).length,
    excluded: pages.filter((p) => p.excluded).length,
    qr: docs.filter((d) => d.meta.hasQr).length,
    review: docs.filter((d) => d.meta.confidence !== "alta").length,
    dup: docs.filter((d) => d.duplicate).length,
    blank: pages.filter((p) => !p.excluded && needsReread(p)).length,
    total: docs.reduce((s, d) => s + (Number(d.meta.total) || 0), 0),
  }), [docs, pages]);

  // Estrutura do ZIP: Ano → Categoria → ficheiros (com nomes repetidos numerados, como na exportação)
  const tree = useMemo(() => {
    const years = new Map();
    const used = new Set();
    docs.forEach((d) => {
      const [year, category] = d.folder.split("/");
      let name = `${d.filename}.pdf`;
      for (let n = 2; used.has(`${d.folder}/${name}`.toLowerCase()); n += 1) name = `${d.filename} (${n}).pdf`;
      used.add(`${d.folder}/${name}`.toLowerCase());
      if (!years.has(year)) years.set(year, new Map());
      const cats = years.get(year);
      if (!cats.has(category)) cats.set(category, []);
      cats.get(category).push({ name, doc: d });
    });
    const sum = (list) => list.reduce((s, f) => s + (Number(f.doc.meta.total) || 0), 0);
    return [...years.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, cats]) => {
        const categories = [...cats.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([category, files]) => ({ category, files: files.sort((a, b) => a.name.localeCompare(b.name)), total: sum(files) }));
        return { year, categories, count: categories.reduce((s, c) => s + c.files.length, 0), total: categories.reduce((s, c) => s + c.total, 0) };
      });
  }, [docs]);
  const [treeOpen, setTreeOpen] = useState(true);

  const visible = docs.filter((d) =>
    filter === "rever" ? d.meta.confidence !== "alta" : filter === "duplicados" ? d.duplicate : true);

  // ---------------- Importação ----------------
  async function importFiles(list) {
    const selected = Array.from(list || []).filter(isPdf);
    if (!selected.length) {
      if (list?.length) setNotice({ type: "error", text: "Só são aceites ficheiros PDF." });
      return;
    }
    if (busy) return;
    cancelRef.current = false;
    setNotice(null);

    let ocr = null;
    const getOcr = async () => {
      if (!ocr) {
        setProgress((p) => ({ ...p, label: "A preparar o reconhecimento de texto (na 1.ª vez demora mais)…" }));
        ocr = await createWorker("por+eng");
      }
      return ocr;
    };

    const newFiles = [];
    const newPages = [];
    const tasks = [];
    try {
      // Abre tudo primeiro, para a barra de progresso contar as páginas reais
      const loaded = [];
      let totalPages = 0;
      for (const file of selected) {
        const bytes = await file.arrayBuffer();
        const task = openPdf(bytes.slice(0));
        tasks.push(task);
        const pdf = await task.promise;
        totalPages += pdf.numPages;
        loaded.push({ file, bytes, pdf });
      }
      let done = 0;
      setProgress({ done, total: totalPages, label: "A analisar…" });

      for (const { file, bytes, pdf } of loaded) {
        const fileId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        newFiles.push({ id: fileId, name: file.name, size: file.size, bytes });

        for (let n = 1; n <= pdf.numPages; n += 1) {
          if (cancelRef.current) throw new Error("cancelado");
          setProgress({ done, total: totalPages, label: `${file.name} · página ${n} de ${pdf.numPages}` });
          const read = await readPdfPage(pdf, n, getOcr);
          newPages.push({
            id: `${fileId}-${n}`,
            fileId,
            fileName: file.name,
            pageNumber: n,
            ...read,
            breakBefore: false,
            excluded: false,
            engine: 3,
          });
          done += 1;
        }
      }

      const breaks = segmentPages(newPages);
      newPages.forEach((p, i) => { p.breakBefore = breaks[i]; });
      setFiles((c) => [...c, ...newFiles]);
      setPages((c) => [...c, ...newPages]);
      const comQr = newPages.filter((p) => p.qr).length;
      const brancas = newPages.filter((p) => p.blankRender && isBlankPage(p.text)).length;
      if (brancas && !(await checkDecoders())) setNotice({ type: "error", text: DECODERS_MISSING });
      else setNotice({ type: "ok", text: `${newPages.length} página(s) analisada(s). QR fiscal lido em ${comQr}.${brancas ? ` ${brancas} saíram em branco — usem Mais → Reler.` : ""}` });
    } catch (err) {
      if (err?.message === "cancelado") setNotice({ type: "warn", text: "Importação cancelada." });
      else setNotice({ type: "error", text: `Não foi possível ler o PDF: ${err?.message || err}` });
    } finally {
      tasks.forEach((t) => t.destroy().catch(() => {}));
      if (ocr) await ocr.terminate().catch(() => {});
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // ---------------- Ações ----------------
  const updatePages = (fn) => setPages((curr) => fn(curr));
  // Editar à mão um campo conta como confirmação: tira a dúvida deixada pela IA
  const setField = (key, patch) => setOverrides((o) => ({ ...o, [key]: { ...(o[key] || {}), aiDuvida: false, ...patch } }));

  const learnEntity = useCallback((doc, name) => {
    const nif = doc.meta.nif;
    const value = String(name || "").trim();
    if (!nif || !value) return;
    setLearned((curr) => {
      const next = { ...curr, [nif]: value };
      try { localStorage.setItem(LEARNED_KEY, JSON.stringify(next)); } catch { /* ignora */ }
      return next;
    });
  }, []);

  const splitAt = (pageId) => updatePages((c) => c.map((p) => (p.id === pageId ? { ...p, breakBefore: true } : p)));
  const mergePrev = (doc) => updatePages((c) => c.map((p) => (p.id === doc.key ? { ...p, breakBefore: false } : p)));
  const rotatePage = (pageId) => updatePages((c) => c.map((p) => (p.id === pageId ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p)));
  const toggleExclude = (pageId) => updatePages((c) => c.map((p) => (p.id === pageId ? { ...p, excluded: !p.excluded } : p)));
  const removeDoc = (doc) => {
    const ids = new Set(doc.pages.map((p) => p.id));
    updatePages((c) => c.map((p) => (ids.has(p.id) ? { ...p, excluded: true } : p)));
  };
  const toggleExpand = (key) => setExpanded((s) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  function resegment() {
    setMenu(false);
    updatePages((c) => {
      const active = c.filter((p) => !p.excluded);
      const b = segmentPages(active);
      const map = new Map(active.map((p, i) => [p.id, b[i]]));
      return c.map((p) => ({ ...p, breakBefore: p.excluded ? false : map.get(p.id) }));
    });
    setNotice({ type: "ok", text: "Separações recalculadas." });
  }
  function onePerPage() {
    setMenu(false);
    updatePages((c) => c.map((p) => ({ ...p, breakBefore: true })));
  }
  async function joinAll() {
    setMenu(false);
    const ok = await askConfirm({
      icon: <Merge size={20} />,
      title: "Juntar tudo num documento?",
      body: <p>Todas as páginas passam a ser um único documento. Pode voltar a separá-las com a tesoura entre páginas ou com <b>Recalcular separações</b>.</p>,
      okLabel: "Juntar tudo",
    });
    if (!ok) return;
    updatePages((c) => c.map((p, i) => ({ ...p, breakBefore: i === 0 })));
  }
  async function rereadBlanks() {
    setMenu(false);
    const targets = pages.filter((p) => !p.excluded && needsReread(p));
    if (!targets.length) { setNotice({ type: "ok", text: "Não há páginas em branco para reler." }); return; }
    if (!(await checkDecoders())) { setNotice({ type: "error", text: DECODERS_MISSING }); return; }
    let ocr = null;
    const getOcr = async () => { if (!ocr) ocr = await createWorker("por+eng"); return ocr; };
    const fileMap = new Map(files.map((f) => [f.id, f]));
    const updates = new Map();
    const opened = new Map(); // documento novo (sem imagens em cache da leitura anterior)
    try {
      for (let i = 0; i < targets.length; i += 1) {
        const p = targets[i];
        setProgress({ done: i, total: targets.length, label: `A reler ${p.fileName} · página ${p.pageNumber}` });
        const f = fileMap.get(p.fileId);
        if (!f) continue;
        if (!opened.has(f.id)) opened.set(f.id, openPdf(f.bytes.slice(0)));
        const pdf = await opened.get(f.id).promise;
        updates.set(p.id, await readPdfPage(pdf, p.pageNumber, getOcr));
      }
      setPages((curr) => {
        const next = curr.map((p) => (updates.has(p.id) ? { ...p, ...updates.get(p.id), engine: 3 } : p));
        const active = next.filter((p) => !p.excluded);
        const b = segmentPages(active);
        const map = new Map(active.map((p, i) => [p.id, b[i]]));
        return next.map((p) => ({ ...p, breakBefore: p.excluded ? false : map.get(p.id) }));
      });
      const fixed = [...updates.values()].filter((u) => !u.blankRender || !isBlankPage(u.text)).length;
      setNotice({ type: "ok", text: `${fixed} de ${targets.length} página(s) relida(s) com conteúdo. Separações recalculadas.` });
    } catch (err) {
      setNotice({ type: "error", text: `Erro ao reler: ${err?.message || err}` });
    } finally {
      opened.forEach((t) => t.destroy().catch(() => {}));
      if (ocr) await ocr.terminate().catch(() => {});
      setProgress(null);
    }
  }

  /**
   * Pedir à IA: envia o TEXTO (sem imagens, com dados pessoais tapados) dos documentos
   * para rever — e dos vizinhos, para a IA poder juntar ou separar — e aplica a resposta.
   */
  async function askAi() {
    setMenu(false);
    const review = docs.filter((d) => d.meta.confidence !== "alta");
    if (!review.length) { setNotice({ type: "ok", text: "Não há documentos para rever." }); return; }
    const sameFile = (a, b) => a && b && a.pages[0].fileId === b.pages[0].fileId;

    // Janelas: cada documento a rever + o anterior e o seguinte do mesmo ficheiro
    const idx = new Set();
    review.forEach((d) => [d.index - 1, d.index, d.index + 1].forEach((k) => { if (sameFile(docs[k], d)) idx.add(k); }));
    const ranges = [];
    [...idx].sort((a, b) => a - b).forEach((k) => {
      const last = ranges[ranges.length - 1];
      if (last && last[last.length - 1] === k - 1 && sameFile(docs[k], docs[k - 1])) last.push(k);
      else ranges.push([k]);
    });
    // Blocos de até 40 páginas, sempre cortados na fronteira de um documento
    const chunks = [];
    let skipped = 0;
    ranges.forEach((r) => {
      let cur = [];
      r.forEach((k) => {
        const ps = docs[k].pages;
        if (ps.length > IA_MAX_PAGINAS) { skipped += 1; return; }
        if (cur.length + ps.length > IA_MAX_PAGINAS) { chunks.push(cur); cur = []; }
        cur.push(...ps);
      });
      if (cur.length) chunks.push(cur);
    });
    if (!chunks.length) { setNotice({ type: "warn", text: "Os documentos para rever são demasiado grandes para enviar à IA." }); return; }

    const totalPages = chunks.reduce((s, c) => s + c.length, 0);
    const ok = await askConfirm({
      tone: "ai",
      icon: <Sparkles size={20} />,
      title: "Pedir à IA?",
      body: (
        <>
          <p>A IA (Claude, da Anthropic) vai separar e identificar <b>{review.length} documento(s) para rever</b>, com os documentos vizinhos — <b>{totalPages} página(s)</b> no total.</p>
          <ul className="pdfo-dialog-list">
            <li><ShieldCheck size={15} /> Só vai o <b>texto lido</b> — nenhuma imagem sai do computador.</li>
            <li><Lock size={15} /> Antes de sair são tapados: NIF de pessoas, NISS, nomes de trabalhadores e de transferências, IBAN, nºs de conta e de cartão, emails e telemóveis.</li>
            <li><CheckCircle2 size={15} /> O resultado fica marcado com <b>IA</b> para confirmar antes de exportar.</li>
          </ul>
        </>
      ),
      okLabel: "Enviar à IA",
    });
    if (!ok) return;

    const { data: { session } } = await supabase.auth.getSession();
    let custo = 0;
    let feitos = 0;
    try {
      for (let c = 0; c < chunks.length; c += 1) {
        const chunk = chunks[c];
        setProgress({ done: c, total: chunks.length, label: `A IA está a analisar ${chunk.length} página(s)…` });
        const resp = await fetch(IA_API, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
          body: JSON.stringify({
            paginas: chunk.map((p) => ({
              texto: redigir(p.text),
              qr: p.qr ? { nifEmitente: p.qr.nifEmitente, data: p.qr.data, numero: p.qr.numero, total: p.qr.total, tipo: p.qr.tipo } : null,
            })),
          }),
        });
        const out = await resp.json().catch(() => ({ ok: false, error: `Erro ${resp.status} do servidor.` }));
        if (!resp.ok || !out.ok) throw new Error(out.error || `Erro ${resp.status} do servidor.`);
        custo += out.uso?.custo_usd || 0;

        const starts = new Set();
        const patch = {};
        out.documentos.forEach((d) => {
          const first = chunk[d.paginas[0] - 1];
          starts.add(first.id);
          const fields = { ai: true, aiDuvida: d.confianca !== "alta", category: d.categoria };
          if (d.entidade) fields.entity = d.entidade;
          if (d.data) fields.date = d.data;
          if (d.numero) fields.numero = d.numero;
          if (d.total != null) fields.total = d.total;
          if (d.descricao) fields.label = d.descricao;
          patch[first.id] = fields;
        });
        const ids = new Set(chunk.map((p) => p.id));
        setPages((curr) => {
          const a = curr.findIndex((p) => p.id === chunk[0].id);
          const b = curr.findIndex((p) => p.id === chunk[chunk.length - 1].id);
          return curr.map((p, i) => {
            if (ids.has(p.id)) return { ...p, breakBefore: starts.has(p.id) };
            if (i > a && i <= b && p.excluded) return { ...p, breakBefore: false }; // páginas retiradas não cortam
            return p;
          });
        });
        setOverrides((o) => {
          const next = { ...o };
          Object.entries(patch).forEach(([k, v]) => { next[k] = { ...(o[k] || {}), filename: undefined, ...v }; });
          return next;
        });
        feitos += out.documentos.length;
      }
      setNotice({
        type: "ok",
        text: `A IA reviu ${totalPages} página(s) e devolveu ${feitos} documento(s). Confirme os marcados com "IA".`
          + `${skipped ? ` ${skipped} documento(s) grande(s) de mais ficaram de fora.` : ""} Custo: ~${custo.toFixed(4)} US$.`,
      });
    } catch (err) {
      setNotice({ type: "error", text: `Pedir à IA: ${err?.message || err}` });
    } finally {
      setProgress(null);
    }
  }

  function removeBlanks() {
    setMenu(false);
    updatePages((c) => c.map((p) => (!p.excluded && !p.qr && isBlankPage(p.text) ? { ...p, excluded: true } : p)));
  }
  async function clearAll() {
    setMenu(false);
    const ok = await askConfirm({
      tone: "danger",
      icon: <Trash2 size={20} />,
      title: "Limpar tudo?",
      body: <p>Apaga todos os documentos e correções deste organizador. Os seus ficheiros PDF originais não são afetados.</p>,
      okLabel: "Limpar tudo",
    });
    if (!ok) return;
    await Promise.all([dbDel(STATE_KEY), dbDel(FILES_KEY)]).catch(() => {});
    releaseDocs();
    setFiles([]);
    setPages([]);
    setOverrides({});
    setExpanded(new Set());
    setNotice(null);
  }

  async function openZoom(page) {
    const file = files.find((f) => f.id === page.fileId);
    if (!file) return;
    setZoom({ page, src: null });
    try {
      const pdf = await pdfOf(file);
      const pg = await pdf.getPage(page.pageNumber);
      const vp = pg.getViewport({ scale: 1.6, rotation: page.rotation || 0 });
      const c = document.createElement("canvas");
      c.width = Math.ceil(vp.width);
      c.height = Math.ceil(vp.height);
      await pg.render({ canvasContext: c.getContext("2d"), viewport: vp, intent: "print" }).promise;
      const src = c.toDataURL("image/jpeg", 0.88);
      c.width = 0;
      setZoom((z) => (z && z.page.id === page.id ? { ...z, src } : z));
    } catch {
      setZoom(null);
    }
  }

  // ---------------- Exportação ----------------
  async function exportZip() {
    if (!docs.length || busy) return;
    setMenu(false);
    try {
      const zip = new JSZip();
      const fileMap = new Map(files.map((f) => [f.id, f]));
      const sources = new Map();
      const source = (f) => {
        if (!sources.has(f.id)) sources.set(f.id, PDFDocument.load(f.bytes, { ignoreEncryption: true }));
        return sources.get(f.id);
      };
      const used = new Set();
      const rows = [["Data", "Fornecedor", "NIF fornecedor", "Tipo", "Número", "ATCUD", "Total (EUR)", "Categoria", "Ficheiro", "Páginas"]];

      for (let i = 0; i < docs.length; i += 1) {
        const d = docs[i];
        setProgress({ done: i, total: docs.length, label: `A criar ${d.filename}.pdf` });
        const out = await PDFDocument.create();
        for (const p of d.pages) {
          const f = fileMap.get(p.fileId);
          if (!f) continue;
          const [copy] = await out.copyPages(await source(f), [p.pageNumber - 1]);
          copy.setRotation(degrees((((p.rotation || 0) % 360) + 360) % 360));
          out.addPage(copy);
        }
        let path = `${d.folder}/${d.filename}.pdf`;
        for (let n = 2; used.has(path.toLowerCase()); n += 1) path = `${d.folder}/${d.filename} (${n}).pdf`;
        used.add(path.toLowerCase());
        zip.file(path, await out.save());
        const m = d.meta;
        const total = m.total == null || Number.isNaN(Number(m.total)) ? "" : Number(m.total).toFixed(2).replace(".", ",");
        rows.push([m.date, m.entity, m.nif, TIPOS_DOC[m.tipo] || m.tipo || m.category, m.numero, m.atcud, total, m.category, path, String(d.pages.length)]);
      }
      const csv = String.fromCharCode(0xfeff) + rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
      zip.file("resumo.csv", csv);

      setProgress({ done: docs.length, total: docs.length, label: "A comprimir o ZIP…" });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documentos-organizados-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setNotice({ type: "ok", text: `ZIP criado com ${docs.length} documento(s) e o resumo.csv.` });
    } catch (err) {
      setNotice({ type: "error", text: `Erro ao criar o ZIP: ${err?.message || err}` });
    } finally {
      setProgress(null);
    }
  }

  // ---------------- Render ----------------
  if (!ready) return <div className="po page-container"><p className="pdfo-muted">A carregar…</p></div>;

  const hasDocs = pages.length > 0;
  // Páginas importadas com a leitura antiga (sem tira do talão / linhas): convém voltar a importar
  const stale = !busy && pages.some((p) => (p.engine || 0) < 3);
  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;
  const thumbStyle = (p) => ({ transform: `rotate(${(p.rotation || 0) - (p.thumbRot || 0)}deg)` });

  return (
    <div
      className={`pdfo page-container ${dragOver ? "is-drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); importFiles(e.dataTransfer?.files); }}
    >
      <header className="pdfo-hero">
        <span className="pdfo-hero-ico" aria-hidden="true"><FolderTree size={26} /></span>
        <div className="pdfo-hero-text">
          <span className="pdfo-eyebrow">Ferramenta</span>
          <h1>Organizador de faturas</h1>
          <p>Separa, identifica e arruma faturas e talões digitalizados.</p>
        </div>
        <ul className="pdfo-hero-badges">
          <li><QrCode size={14} /> Lê o QR fiscal da AT</li>
          <li><Download size={14} /> ZIP por ano e categoria</li>
          <li className="is-lock"><Lock size={14} /> 100% local · nada é enviado</li>
        </ul>
      </header>

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => importFiles(e.target.files)} />

      {notice && !busy && (
        <div className={`pdfo-notice is-${notice.type}`} role="status">
          {notice.type === "ok" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fechar"><X size={15} /></button>
        </div>
      )}

      {stale && (
        <div className="pdfo-notice is-warn" role="status">
          <AlertTriangle size={17} />
          <span>Estes documentos foram lidos com a versão anterior do organizador. Volte a importar o PDF para usar a leitura nova (QR e nomes mais certos).</span>
          <button
            type="button"
            className="pdfo-btn"
            onClick={async () => {
              await Promise.all([dbDel(STATE_KEY), dbDel(FILES_KEY)]).catch(() => {});
              releaseDocs();
              setFiles([]);
              setPages([]);
              setOverrides({});
              setExpanded(new Set());
              inputRef.current?.click();
            }}
          >
            <Upload size={14} /> Limpar e importar de novo
          </button>
        </div>
      )}

      {busy && (
        <section className="pdfo-progress">
          <div className="pdfo-progress-top">
            <strong>{progress.label}</strong>
            <span>{progress.done} / {progress.total}</span>
          </div>
          <div className="pdfo-bar"><i style={{ width: `${pct}%` }} /></div>
          <button type="button" className="pdfo-link" onClick={() => { cancelRef.current = true; }}>Cancelar</button>
        </section>
      )}

      {!hasDocs && !busy && (
        <button type="button" className="pdfo-drop" onClick={() => inputRef.current?.click()}>
          <span className="pdfo-drop-ico"><Upload size={28} /></span>
          <strong>Arraste os PDFs para aqui ou clique para escolher</strong>
          <span>Pode juntar vários talões no mesmo PDF digitalizado: o organizador separa-os.</span>
          <ol className="pdfo-how">
            <li><QrCode size={16} /> Lê o QR fiscal de cada fatura</li>
            <li><Layers size={16} /> Separa e dá nome a cada documento</li>
            <li><Download size={16} /> Exporta ZIP por ano/categoria + resumo.csv</li>
          </ol>
        </button>
      )}

      {hasDocs && (
        <>
          <section className="pdfo-summary">
            <div className="pdfo-kpis">
              <div><strong>{stats.docs}</strong><span>documentos</span></div>
              <div><strong>{stats.pages}</strong><span>páginas</span></div>
              <div className="is-good"><strong>{stats.qr}</strong><span>com QR fiscal</span></div>
              <div className={stats.review ? "is-warn" : ""}><strong>{stats.review}</strong><span>para rever</span></div>
              <div><strong>{fmtEur(stats.total)}</strong><span>total</span></div>
            </div>
            <div className="pdfo-actions">
              <button type="button" className="pdfo-btn" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={15} /> Adicionar PDFs</button>
              {stats.review > 0 && (
                <button type="button" className="pdfo-btn is-ai" onClick={askAi} disabled={busy} title="Envia só o texto (sem imagens e com dados pessoais tapados) dos documentos para rever">
                  <Sparkles size={15} /> Pedir à IA ({stats.review})
                </button>
              )}
              <div className="pdfo-menu-wrap">
                <button type="button" className="pdfo-btn" onClick={() => setMenu((v) => !v)} aria-expanded={menu}><MoreHorizontal size={16} /> Mais</button>
                {menu && (
                  <div className="pdfo-menu" role="menu">
                    <button type="button" onClick={resegment}><RotateCw size={14} /> Recalcular separações</button>
                    {stats.blank > 0 && <button type="button" onClick={rereadBlanks}><RotateCw size={14} /> Reler {stats.blank} página(s) em branco</button>}
                    <button type="button" onClick={onePerPage}><Scissors size={14} /> 1 página = 1 documento</button>
                    <button type="button" onClick={joinAll}><Merge size={14} /> Juntar tudo num documento</button>
                    {stats.blank > 0 && <button type="button" onClick={removeBlanks}><Trash2 size={14} /> Retirar {stats.blank} página(s) em branco</button>}
                    <hr />
                    <button type="button" className="is-danger" onClick={clearAll}><Trash2 size={14} /> Limpar tudo</button>
                  </div>
                )}
              </div>
              <button type="button" className="pdfo-btn is-primary" onClick={exportZip} disabled={busy}><Download size={15} /> Exportar ZIP</button>
            </div>
          </section>

          <nav className="pdfo-tabs" role="tablist">
            <button type="button" className={filter === "todos" ? "is-on" : ""} onClick={() => setFilter("todos")}>Todos <span>{stats.docs}</span></button>
            <button type="button" className={filter === "rever" ? "is-on" : ""} onClick={() => setFilter("rever")}>Para rever <span>{stats.review}</span></button>
            {stats.dup > 0 && <button type="button" className={filter === "duplicados" ? "is-on" : ""} onClick={() => setFilter("duplicados")}>Duplicados <span>{stats.dup}</span></button>}
          </nav>

          <section className="pdfo-list">
            {visible.length === 0 && <p className="pdfo-empty">Nada para mostrar aqui.</p>}
            {visible.map((d) => {
              const m = d.meta;
              const open = expanded.has(d.key);
              const first = d.pages[0];
              return (
                <article key={d.key} className={`pdfo-doc is-${m.confidence} ${d.duplicate ? "is-dup" : ""}`}>
                  <button type="button" className="pdfo-thumb" onClick={() => openZoom(first)} title="Ver em grande">
                    {first.thumb ? <img src={first.thumb} alt="" style={thumbStyle(first)} /> : <FileText size={22} />}
                    {d.pages.length > 1 && <span className="pdfo-thumb-count">{d.pages.length} pág.</span>}
                  </button>

                  <div className="pdfo-doc-main">
                    <div className="pdfo-doc-head">
                      <span className="pdfo-num">{d.index + 1}</span>
                      <input
                        className="pdfo-entity"
                        value={m.entity || ""}
                        placeholder="Fornecedor desconhecido"
                        onChange={(e) => setField(d.key, { entity: e.target.value })}
                        onBlur={(e) => { if (overrides[d.key]?.entity !== undefined) learnEntity(d, e.target.value); }}
                        title="Se corrigir, o nome fica memorizado para este NIF"
                      />
                      {m.hasQr
                        ? <span className="pdfo-pill is-qr"><QrCode size={12} /> QR fiscal</span>
                        : <span className="pdfo-pill is-text">Lido do texto</span>}
                      {m.ai && <span className="pdfo-pill is-ai" title="Separação e dados propostos pela IA"><Sparkles size={12} /> IA</span>}
                      {m.confidence !== "alta" && (
                        <span className="pdfo-pill is-warn" title="Confirme estes campos">
                          <AlertTriangle size={12} /> Rever{m.missing.length ? `: ${m.missing.join(", ")}` : ""}
                        </span>
                      )}
                      {d.duplicate && <span className="pdfo-pill is-dup"><Copy size={12} /> Duplicado</span>}
                    </div>

                    <div className="pdfo-fields">
                      <label><span>Data</span>
                        <input type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(m.date || "") ? m.date : ""} onChange={(e) => setField(d.key, { date: e.target.value })} />
                      </label>
                      <label><span>Categoria</span>
                        <select value={m.category} onChange={(e) => setField(d.key, { category: e.target.value })}>
                          {PDF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>
                      <label><span>Nº documento</span>
                        <input value={m.numero || ""} placeholder="—" onChange={(e) => setField(d.key, { numero: e.target.value })} />
                      </label>
                      <label className="is-num"><span>Total (€)</span>
                        <input
                          defaultValue={m.total == null ? "" : String(m.total).replace(".", ",")}
                          key={`${d.key}-${m.total}`}
                          placeholder="—"
                          onBlur={(e) => {
                            const v = e.target.value.trim().replace(/\s/g, "").replace(",", ".");
                            if (v === "") setField(d.key, { total: null });
                            else if (!Number.isNaN(Number(v))) setField(d.key, { total: Number(v) });
                          }}
                        />
                      </label>
                      <div className="pdfo-ro"><span>NIF</span><strong>{m.nif || "—"}</strong></div>
                      <div className="pdfo-ro"><span>Tipo</span><strong>{m.tipoLabel || "—"}</strong></div>
                    </div>

                    <div className="pdfo-path" title="Onde fica no ZIP">
                      <span>{d.folder}/</span>
                      <input value={d.filename} onChange={(e) => setField(d.key, { filename: e.target.value })} aria-label="Nome do ficheiro" />
                      <span>.pdf</span>
                    </div>
                  </div>

                  <div className="pdfo-doc-side">
                    <button type="button" className="pdfo-icon" onClick={() => toggleExpand(d.key)} title="Ver páginas">
                      <ChevronDown size={16} className={open ? "is-open" : ""} /> {d.pages.length}
                    </button>
                    {d.index > 0 && <button type="button" className="pdfo-icon" onClick={() => mergePrev(d)} title="Juntar ao documento anterior"><Merge size={15} /></button>}
                    <button type="button" className="pdfo-icon is-danger" onClick={() => removeDoc(d)} title="Retirar documento"><Trash2 size={15} /></button>
                  </div>

                  {open && (
                    <div className="pdfo-pages">
                      {d.pages.map((p, i) => (
                        <div key={p.id} className="pdfo-page-wrap">
                          {i > 0 && (
                            <button type="button" className="pdfo-split" onClick={() => splitAt(p.id)} title="Separar aqui">
                              <Scissors size={13} />
                            </button>
                          )}
                          <div className="pdfo-page">
                            <button type="button" className="pdfo-page-img" onClick={() => openZoom(p)}>
                              {p.thumb ? <img src={p.thumb} alt="" style={thumbStyle(p)} /> : <FileText size={18} />}
                            </button>
                            <div className="pdfo-page-bar">
                              <span title={p.fileName}>p.{p.pageNumber}{p.qr ? " · QR" : ""}</span>
                              <button type="button" onClick={() => rotatePage(p.id)} title="Rodar 90°"><RotateCw size={12} /></button>
                              <button type="button" onClick={() => toggleExclude(p.id)} title="Retirar página"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <section className="pdfo-tree">
            <button type="button" className="pdfo-tree-head" onClick={() => setTreeOpen((v) => !v)} aria-expanded={treeOpen}>
              <FolderTree size={18} />
              <strong>Estrutura do ZIP</strong>
              <span>{stats.docs} ficheiro(s) + resumo.csv</span>
              <ChevronDown size={16} className={treeOpen ? "is-open" : ""} />
            </button>
            {treeOpen && (
              <div className="pdfo-tree-body">
                {tree.map((y) => (
                  <div key={y.year} className="pdfo-tree-node">
                    <div className="pdfo-tree-folder is-year">
                      <FolderOpen size={17} /><strong>{y.year}</strong>
                      <em>{y.count} doc. · {fmtEur(y.total)}</em>
                    </div>
                    <div className="pdfo-tree-children">
                      {y.categories.map((c) => (
                        <div key={c.category} className="pdfo-tree-node">
                          <div className="pdfo-tree-folder">
                            <FolderOpen size={15} /><strong>{c.category}</strong>
                            <em>{c.files.length} doc. · {fmtEur(c.total)}</em>
                          </div>
                          <ul className="pdfo-tree-files">
                            {c.files.map((f) => (
                              <li key={f.doc.key} className={f.doc.meta.confidence !== "alta" ? "is-warn" : ""}>
                                <span className="pdfo-tree-pdf">PDF</span>
                                <span className="pdfo-tree-name" title={f.name}>{f.name}</span>
                                <em>{f.doc.pages.length} pág. · {fmtEur(f.doc.meta.total)}</em>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="pdfo-tree-folder is-csv">
                  <FileText size={15} /><strong>resumo.csv</strong>
                  <em>lista de todos os documentos (abre no Excel)</em>
                </div>
              </div>
            )}
          </section>

          {stats.excluded > 0 && (
            <section className="pdfo-excluded">
              <div>
                <strong>{stats.excluded} página(s) retirada(s)</strong>
                <button type="button" className="pdfo-link" onClick={() => updatePages((c) => c.map((p) => ({ ...p, excluded: false })))}>
                  <Undo2 size={13} /> Repor todas
                </button>
              </div>
              <ul>
                {pages.filter((p) => p.excluded).map((p) => (
                  <li key={p.id}>
                    {p.fileName} · p.{p.pageNumber}
                    <button type="button" onClick={() => toggleExclude(p.id)}>Repor</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="pdfo-foot"><ShieldCheck size={14} /> Os nomes de fornecedores que corrigir ficam memorizados neste computador (pelo NIF) e são usados automaticamente da próxima vez.</p>
        </>
      )}

      {dialog && createPortal(
        <div className="pdfo-dialog-back" onClick={() => closeDialog(false)}>
          <div
            className={`pdfo-dialog${dialog.tone ? ` is-${dialog.tone}` : ""}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pdfo-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="pdfo-dialog-x" onClick={() => closeDialog(false)} aria-label="Fechar"><X size={16} /></button>
            {dialog.icon && <span className="pdfo-dialog-ico">{dialog.icon}</span>}
            <h3 id="pdfo-dialog-title">{dialog.title}</h3>
            <div className="pdfo-dialog-body">{dialog.body}</div>
            <div className="pdfo-dialog-actions">
              <button type="button" className="pdfo-btn" onClick={() => closeDialog(false)}>{dialog.cancelLabel || "Cancelar"}</button>
              <button type="button" className="pdfo-btn is-primary" onClick={() => closeDialog(true)} autoFocus>{dialog.okLabel || "Confirmar"}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {zoom && createPortal(
        <div className="pdfo-modal" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          <div className="pdfo-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pdfo-modal-head">
              <span>{zoom.page.fileName} · página {zoom.page.pageNumber}{zoom.page.qr ? ` · ${fmtData(zoom.page.qr.data)} · ${fmtEur(zoom.page.qr.total)}` : ""}</span>
              <button type="button" onClick={() => { rotatePage(zoom.page.id); openZoom({ ...zoom.page, rotation: ((zoom.page.rotation || 0) + 90) % 360 }); }}>
                <RotateCw size={15} /> Rodar
              </button>
              <button type="button" onClick={() => setZoom((z) => ({ ...z, showText: !z.showText }))}>
                <FileText size={15} /> {zoom.showText ? "Ver imagem" : "Texto lido"}
              </button>
              <button type="button" onClick={() => setZoom(null)} aria-label="Fechar"><X size={18} /></button>
            </div>
            {zoom.showText ? (
              <div className="pdfo-modal-text">
                <p>
                  Leitura: {zoom.page.qr ? "QR fiscal lido ✓" : "sem QR (só texto)"} · versão {zoom.page.engine || 1}
                  <button
                    type="button"
                    onClick={() => {
                      const info = `[QR: ${zoom.page.qr ? JSON.stringify(zoom.page.qr) : "não lido"} | versão ${zoom.page.engine || 1}]\n${zoom.page.text || ""}`;
                      navigator.clipboard?.writeText(info).catch(() => {});
                    }}
                  >
                    <Copy size={13} /> Copiar
                  </button>
                </p>
                <pre>{zoom.page.text || "(sem texto)"}</pre>
              </div>
            ) : zoom.src ? (
              <div className="pdfo-modal-scroll"><img src={zoom.src} alt="" /></div>
            ) : <div className="pdfo-modal-loading">A carregar…</div>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
