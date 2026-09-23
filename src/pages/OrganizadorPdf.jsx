import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Download,
  FileArchive,
  FilePlus2,
  FolderOpen,
  Save,
  Trash2,
  Upload,
  X,
  Scissors,
  RotateCw,
  Sparkles,
  Eye,
  Merge,
  CheckCircle2,
  AlertCircle,
  FileText,
  Ban,
  Undo2,
} from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { createWorker } from "tesseract.js";
import {
  PDF_CATEGORIES,
  extractGroupMetadata,
  isBlankPage,
  shouldBreakPage,
  scoreOcrText,
} from "../utils/pdfOrganizerEngine";
import "./organizadorPdf.css";

const DB_NAME = "bizin-pdf-organizer";
const STORE_NAME = "sessions";
const SESSION_ID = "current";
const SUGGESTIONS_VERSION = 30;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Operações IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSession(value) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(value, SESSION_ID);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  database.close();
}

async function readSession() {
  const database = await openDatabase();
  const value = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(SESSION_ID);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value;
}

async function clearSession() {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(SESSION_ID);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  database.close();
}

function safePart(value, fallback) {
  return String(value || fallback).trim().replace(/[\\/:*?"<>|]/g, "-") || fallback;
}

function shouldUseOcr(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const words = clean.match(/[A-Za-zÀ-ÿ]{3,}/g) || [];
  const readableWords = words.filter((w) => /[aeiouáéíóúâêôãõ]/i.test(w)).length;
  // Se o texto tiver menos de 35 caracteres ou se menos de 30% das palavras forem legíveis
  return clean.length < 35 || (words.length > 5 && readableWords / words.length < 0.3);
}

function rotateCanvas(sourceCanvas, deg) {
  const rotated = document.createElement("canvas");
  const quarterTurn = Math.abs(deg) % 180 === 90;
  rotated.width = quarterTurn ? sourceCanvas.height : sourceCanvas.width;
  rotated.height = quarterTurn ? sourceCanvas.width : sourceCanvas.height;
  const ctx = rotated.getContext("2d");
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
  return rotated;
}

/**
 * Determina o ângulo de rotação que garante que a página é apresentada na vertical (portrait).
 * Evita que faturas e recibos digitalizados fiquem deitados na horizontal.
 */
function getPortraitAngle(page) {
  const nativeVp = page.getViewport({ scale: 1 });
  if (nativeVp.width <= nativeVp.height) {
    return page.rotate || 0;
  }
  for (const r of [0, 90, 270, 180]) {
    const vp = page.getViewport({ scale: 1, rotation: r });
    if (vp.width <= vp.height) {
      return r;
    }
  }
  return page.rotate || 0;
}

/**
 * Lê o ficheiro PDF, extrai o texto de cada página e executa OCR inteligente apenas se necessário
 */
async function readPdf(file, onProgress) {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const pages = [];
  let worker = null;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.(pageNumber, pdf.numPages, "A analisar página...");
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let text = content.items.map((item) => item.str || "").join(" ").trim();
    const basePortraitRotation = getPortraitAngle(page);
    let bestRotation = basePortraitRotation;

    // Se o texto for escasso (documento digitalizado / imagem) ou de baixa qualidade, recorrer ao OCR
    if (shouldUseOcr(text) || scoreOcrText(text) < 20) {
      onProgress?.(pageNumber, pdf.numPages, "A aplicar OCR com deteção inteligente de rotação...");
      if (!worker) {
        worker = await createWorker("por+eng");
      }

      // Renderiza o canvas já na orientação vertical portrait correta
      const renderViewport = page.getViewport({ scale: 1.25 * 1.25, rotation: basePortraitRotation });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: renderViewport }).promise;

      // O canvas já está na vertical! Testa 0° (vertical direito) primeiro, depois 180°
      const rotationsToTry = [0, 180, 270, 90];
      let bestScore = -1;
      let bestCandidate = "";
      let bestRotOffset = 0;

      for (const rot of rotationsToTry) {
        const rotatedImage = rot !== 0 ? rotateCanvas(canvas, rot) : canvas;
        const result = await worker.recognize(rotatedImage);
        const candidate = result.data.text.trim();
        const score = scoreOcrText(candidate);

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
          bestRotOffset = rot;
        }

        // Se encontrámos excelente texto fiscal/contabilístico em português (> 60 pontos),
        // aceitamos imediatamente e poupamos tempo!
        if (score >= 60) {
          break;
        }
      }

      text = bestCandidate || text;
      bestRotation = (basePortraitRotation + bestRotOffset) % 360;
    }

    pages.push({
      pageNumber,
      text,
      rotation: bestRotation, // Guarda a orientação correta absoluta para miniatura e exportação
      aspect: 0.7,
    });
  }

  if (worker) {
    await worker.terminate();
  }

  return { bytes, pageCount: pdf.numPages, pages };
}

/**
 * Renderiza uma miniatura da página com a rotação aplicada
 */
async function renderPagePreview(bytes, pageNumber, scale = 0.28, rotation = 0) {
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function OrganizadorPdf() {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState("idle");
  const [statusText, setStatusText] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [loadedLocal, setLoadedLocal] = useState(false);
  const [documentMeta, setDocumentMeta] = useState({});
  const [previews, setPreviews] = useState({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(null);
  const previewCacheRef = useRef(new Map());

  // Páginas ativas (não excluídas pelo utilizador)
  const activePages = useMemo(() => pages.filter((p) => !p.excluded), [pages]);

  // Agrupamento de páginas por quebra
  const groups = useMemo(() => {
    const list = [];
    activePages.forEach((page, index) => {
      if (page.breakBefore || index === 0 || !list.length) {
        list.push([]);
      }
      list[list.length - 1].push(page);
    });
    return list;
  }, [activePages]);

  // Documentos resultantes combinados com metadados
  const documents = useMemo(() => {
    return groups.map((group, groupIndex) => {
      const firstPage = group[0];
      const key = firstPage?.id || `doc-${groupIndex}`;
      const autoMeta = extractGroupMetadata(group, firstPage?.fileName || "documento.pdf");
      const userMeta = documentMeta[key] || {};

      return {
        id: key,
        pages: group,
        year: userMeta.year || autoMeta.year,
        category: userMeta.category || autoMeta.category,
        entity: userMeta.entity || autoMeta.entity,
        person: userMeta.person || autoMeta.person,
        docNumber: userMeta.docNumber || autoMeta.docNumber,
        filename: userMeta.filename || autoMeta.filename,
        isBlank: autoMeta.isBlank,
      };
    });
  }, [documentMeta, groups]);

  // Árvore de pastas do ZIP
  const folderTree = useMemo(() => {
    const years = new Map();
    documents.forEach((item) => {
      const year = safePart(item.year, "Sem ano");
      const category = safePart(item.category, "Outros");
      const entityOrPerson = (item.entity || item.person || "").trim();
      const entityFolder = entityOrPerson ? safePart(entityOrPerson, "") : "__direct__";

      if (!years.has(year)) years.set(year, new Map());
      const categoriesByYear = years.get(year);
      if (!categoriesByYear.has(category)) categoriesByYear.set(category, new Map());
      const entitiesByCategory = categoriesByYear.get(category);
      if (!entitiesByCategory.has(entityFolder)) entitiesByCategory.set(entityFolder, []);
      entitiesByCategory.get(entityFolder).push(item);
    });
    return years;
  }, [documents]);

  // Restaurar sessão do IndexedDB
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const session = await readSession();
        if (!session) {
          if (!cancelled) setLoadedLocal(true);
          return;
        }

        const restoredFiles = session.files || [];
        let restoredPages = session.pages || [];

        // Se a sessão local é de uma versão anterior, re-analisar com o motor atualizado!
        if (session.suggestionsVersion !== SUGGESTIONS_VERSION && restoredFiles.length) {
          setStatus("loading");
          setStatusText("A atualizar a orientação e datas dos documentos...");
          const newPages = [];
          for (const file of restoredFiles) {
            const pdf = await pdfjsLib.getDocument({ data: file.bytes.slice(0) }).promise;
            const existingFilePages = restoredPages.filter((p) => p.fileId === file.id);
            const hasExistingOcr = existingFilePages.length === pdf.numPages && existingFilePages.some((p) => (p.text || "").length > 20);

            if (hasExistingOcr) {
              // Já temos o texto extraído! Apenas atualizamos a rotação portrait e mantemos o texto existente
              for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                const pdfPage = await pdf.getPage(pageNumber);
                const portraitRot = getPortraitAngle(pdfPage);
                const existingPage = existingFilePages.find((p) => p.pageNumber === pageNumber) || {};
                newPages.push({
                  ...existingPage,
                  rotation: portraitRot,
                  aspect: 0.7,
                });
              }
            } else {
              // Se não tínhamos texto completo, recorre ao leitor completo com OCR
              const blob = new Blob([file.bytes], { type: file.type || "application/pdf" });
              const parsed = await readPdf(blob, (pageNum, total, msg) => {
                if (!cancelled) setStatusText(`${file.name}: ${msg} (${pageNum}/${total})`);
              });
              parsed.pages.forEach((page) => {
                newPages.push({
                  id: `${file.id}-${page.pageNumber}`,
                  fileId: file.id,
                  fileName: file.name,
                  pageNumber: page.pageNumber,
                  text: page.text,
                  rotation: page.rotation || 0,
                  aspect: page.aspect,
                  breakBefore: true,
                  excluded: false,
                });
              });
            }
          }

          // Recalcula quebras com as páginas atualizadas
          newPages.forEach((page, index) => {
            const prevPage = index > 0 ? newPages[index - 1] : null;
            const isBreak = shouldBreakPage(page, prevPage, index, index === 0);
            page.breakBefore = isBreak;
          });

          if (newPages.length) {
            restoredPages = newPages;
          }
        } else if (restoredFiles.length && restoredPages.length) {
          // Assegura que nenhuma página fica na horizontal (rotation 0) se o PDF requerer orientação portrait
          for (const file of restoredFiles) {
            const filePages = restoredPages.filter((p) => p.fileId === file.id);
            if (filePages.some((p) => !p.rotation)) {
              try {
                const pdf = await pdfjsLib.getDocument({ data: file.bytes.slice(0) }).promise;
                for (const p of filePages) {
                  if (!p.rotation) {
                    const pdfPage = await pdf.getPage(p.pageNumber);
                    const portraitRot = getPortraitAngle(pdfPage);
                    if (portraitRot) {
                      p.rotation = portraitRot;
                    }
                  }
                }
              } catch {
                // Silencioso se o ficheiro estiver indisponível
              }
            }
          }
        }

        if (!cancelled) {
          setFiles(restoredFiles);
          setPages(restoredPages);
          setDocumentMeta(session.suggestionsVersion === SUGGESTIONS_VERSION ? (session.documentMeta || {}) : {});
          setSavedAt(session.savedAt || null);
          setLoadedLocal(true);
          if (session.suggestionsVersion !== SUGGESTIONS_VERSION && restoredFiles.length) {
            setStatus("success");
            setStatusText("Organização e rotações atualizadas com sucesso!");
          }
        }
      } catch {
        if (!cancelled) setLoadedLocal(true);
      }
    }
    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // Gravação automática em IndexedDB
  useEffect(() => {
    if (!files.length || !pages.length) return undefined;
    const timer = window.setTimeout(() => {
      saveSession({
        files,
        pages,
        documentMeta,
        suggestionsVersion: SUGGESTIONS_VERSION,
        savedAt: new Date().toISOString(),
      })
        .then(() => setSavedAt(new Date().toISOString()))
        .catch(() => setStatusText("Não foi possível gravar a sessão local."));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [documentMeta, files, pages]);

  // Alerta ao fechar aba se houver trabalho em curso
  useEffect(() => {
    const warnBeforeExit = (event) => {
      if (pages.length) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [pages.length]);

  // Geração de miniaturas (previews) com rotação e cache de alta performance
  useEffect(() => {
    if (!files.length || !pages.length) {
      setPreviews({});
      previewCacheRef.current.clear();
      return undefined;
    }

    let cancelled = false;
    const fileMap = new Map(files.map((file) => [file.id, file]));
    setPreviewLoading(true);

    const renderPromises = pages.map(async (page) => {
      const source = fileMap.get(page.fileId);
      if (!source) return [page.id, null];

      const cacheKey = `${page.fileId}-${page.pageNumber}-${page.rotation || 0}`;
      if (previewCacheRef.current.has(cacheKey)) {
        return [page.id, previewCacheRef.current.get(cacheKey)];
      }

      try {
        const url = await renderPagePreview(source.bytes, page.pageNumber, 0.28, page.rotation || 0);
        previewCacheRef.current.set(cacheKey, url);
        return [page.id, url];
      } catch {
        return [page.id, null];
      }
    });

    Promise.all(renderPromises).then((entries) => {
      if (cancelled) return;
      setPreviews(Object.fromEntries(entries));
      setPreviewLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [files, pages]);

  // Importar ficheiros PDF com análise inteligente
  async function importFiles(event) {
    const selected = Array.from(event.target.files || []).filter((file) => file.type === "application/pdf");
    if (!selected.length) return;

    setStatus("loading");
    setStatusText("A analisar documentos com o novo motor inteligente...");

    try {
      const newFiles = [];
      const newPages = [];

      for (const file of selected) {
        const fileId = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`;
        const parsed = await readPdf(file, (pageNum, total, msg) => {
          setStatusText(`${file.name}: ${msg} (${pageNum}/${total})`);
        });

        newFiles.push({
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          bytes: parsed.bytes,
        });

        // Avaliação de quebras com o motor heurístico
        parsed.pages.forEach((page, index) => {
          const prevPage = index > 0 ? parsed.pages[index - 1] : null;
          const isBreak = shouldBreakPage(page, prevPage, index, index === 0);
          const pageId = `${fileId}-${page.pageNumber}`;

          newPages.push({
            id: pageId,
            fileId,
            fileName: file.name,
            pageNumber: page.pageNumber,
            text: page.text,
            rotation: page.rotation || 0,
            aspect: page.aspect,
            breakBefore: isBreak,
            excluded: false,
          });
        });
      }

      setFiles((curr) => [...curr, ...newFiles]);
      setPages((curr) => [...curr, ...newPages]);
      setStatus("success");
      setStatusText("Documentos importados e organizados com inteligência fiscal portuguesa!");
    } catch (error) {
      setStatus("error");
      setStatusText(`Erro ao importar PDF: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  // Ações de Página e Documento
  const splitAtPage = useCallback((pageId) => {
    setPages((curr) =>
      curr.map((p) => (p.id === pageId ? { ...p, breakBefore: true } : p))
    );
  }, []);

  const mergeWithPrevious = useCallback((docIndex) => {
    if (docIndex <= 0) return;
    const targetDoc = documents[docIndex];
    if (!targetDoc || !targetDoc.pages.length) return;
    const firstPageId = targetDoc.pages[0].id;

    setPages((curr) =>
      curr.map((p) => (p.id === firstPageId ? { ...p, breakBefore: false } : p))
    );
  }, [documents]);

  const rotatePage = useCallback((pageId) => {
    setPages((curr) =>
      curr.map((p) =>
        p.id === pageId ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p
      )
    );
  }, []);

  const rotateDocument = useCallback((doc) => {
    const pageIds = new Set(doc.pages.map((p) => p.id));
    setPages((curr) =>
      curr.map((p) =>
        pageIds.has(p.id) ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p
      )
    );
  }, []);

  const toggleExcludePage = useCallback((pageId) => {
    setPages((curr) =>
      curr.map((p) => (p.id === pageId ? { ...p, excluded: !p.excluded } : p))
    );
  }, []);

  const deleteDocument = useCallback((doc) => {
    if (!window.confirm(`Tem a certeza de que quer excluir o documento "${doc.filename}" (${doc.pages.length} páginas)?`)) return;
    const pageIds = new Set(doc.pages.map((p) => p.id));
    setPages((curr) => curr.map((p) => (pageIds.has(p.id) ? { ...p, excluded: true } : p)));
  }, []);

  // Remover automaticamente todas as páginas em branco
  const removeBlankPages = useCallback(() => {
    let count = 0;
    setPages((curr) =>
      curr.map((p) => {
        if (!p.excluded && isBlankPage(p.text)) {
          count += 1;
          return { ...p, excluded: true };
        }
        return p;
      })
    );
    setStatus("success");
    setStatusText(count > 0 ? `${count} páginas em branco foram removidas automaticamente.` : "Nenhuma página em branco encontrada.");
  }, []);

  // Reanalisar tudo com o motor heurístico
  const reanalyzeAll = useCallback(() => {
    setStatus("loading");
    setStatusText("A reavaliar todas as quebras e metadados...");

    setPages((curr) => {
      const active = curr.filter((p) => !p.excluded);
      const newPages = curr.map((page) => {
        if (page.excluded) return page;
        const activeIdx = active.findIndex((a) => a.id === page.id);
        const prevPage = activeIdx > 0 ? active[activeIdx - 1] : null;
        const isNewFile = prevPage ? prevPage.fileId !== page.fileId : true;
        const shouldBreak = shouldBreakPage(page, prevPage, activeIdx, isNewFile);
        return { ...page, breakBefore: shouldBreak };
      });
      return newPages;
    });

    // Limpar overrides para recalcular metadados com precisão
    setDocumentMeta({});
    setStatus("success");
    setStatusText("Reanálise completa! Todos os documentos foram reorganizados.");
  }, []);

  // Reprocessar OCR e rotação para todos os ficheiros carregados
  const rescanOcr = useCallback(async () => {
    if (!files.length) return;
    setStatus("loading");
    setStatusText("A reprocessar OCR e deteção de rotação para todas as páginas...");
    try {
      const updatedPages = [];
      for (const file of files) {
        const blob = new Blob([file.bytes], { type: file.type || "application/pdf" });
        const parsed = await readPdf(blob, (p, tot, msg) => {
          setStatusText(`${file.name}: ${msg} (${p}/${tot})`);
        });
        parsed.pages.forEach((page, index) => {
          const prevPage = index > 0 ? parsed.pages[index - 1] : null;
          const isBreak = shouldBreakPage(page, prevPage, index, index === 0);
          updatedPages.push({
            id: `${file.id}-${page.pageNumber}`,
            fileId: file.id,
            fileName: file.name,
            pageNumber: page.pageNumber,
            text: page.text,
            rotation: page.rotation || 0,
            aspect: page.aspect,
            breakBefore: isBreak,
            excluded: false,
          });
        });
      }
      setPages(updatedPages);
      setDocumentMeta({});
      setStatus("success");
      setStatusText("OCR e rotações recalculadas com sucesso!");
    } catch (err) {
      setStatus("error");
      setStatusText(`Erro ao reprocessar OCR: ${err.message}`);
    }
  }, [files]);

  // Unir todos os documentos em 1
  const mergeAll = useCallback(() => {
    if (!window.confirm("Pretende juntar todas as páginas num único documento?")) return;
    setPages((curr) =>
      curr.map((p, index) => ({ ...p, breakBefore: index === 0 }))
    );
  }, []);

  // Separar todas as páginas individualmente
  const splitAll = useCallback(() => {
    if (!window.confirm("Pretende separar cada página num documento individual?")) return;
    setPages((curr) => curr.map((p) => ({ ...p, breakBefore: true })));
  }, []);

  // Abrir Zoom de Pré-visualização
  async function openPreview(page) {
    const source = files.find((file) => file.id === page.fileId);
    if (!source) return;
    setPreviewZoom({ pageId: page.id, src: null, title: `${page.fileName} · Página ${page.pageNumber}` });
    try {
      const src = await renderPagePreview(source.bytes, page.pageNumber, 1.0, page.rotation || 0);
      setPreviewZoom((curr) => (curr ? { ...curr, src } : null));
    } catch {
      setPreviewZoom(null);
    }
  }

  // Apagar sessão local
  async function forgetLocalSession() {
    if (!window.confirm("Tem a certeza de que quer apagar toda a organização guardada?")) return;
    await clearSession();
    setFiles([]);
    setPages([]);
    setDocumentMeta({});
    setSavedAt(null);
    setStatus("idle");
    setStatusText("Sessão limpa.");
  }

  // Exportar ZIP com rotação real e estrutura organizada
  async function exportZip() {
    if (!documents.length) return;
    if (!window.confirm(`Tem a certeza de que quer gerar o ZIP com ${documents.length} documento(s)?`)) return;

    setStatus("loading");
    setStatusText("A construir os PDFs finais com alta qualidade e a estruturar as pastas...");

    try {
      const zip = new JSZip();
      const fileMap = new Map(files.map((file) => [file.id, file]));

      for (const doc of documents) {
        if (!doc.pages.length) continue;
        const outputPdf = await PDFDocument.create();

        for (const page of doc.pages) {
          const source = fileMap.get(page.fileId);
          if (!source) continue;
          const sourcePdf = await PDFDocument.load(source.bytes);
          const [copiedPage] = await outputPdf.copyPages(sourcePdf, [page.pageNumber - 1]);

          // Aplicação da rotação absoluta definida para a página (0, 90, 180 ou 270 graus)
          const targetRotation = ((Number(page.rotation) || 0) % 360 + 360) % 360;
          copiedPage.setRotation(degrees(targetRotation));
          outputPdf.addPage(copiedPage);
        }

        const pdfBytes = await outputPdf.save();
        const folderParts = [safePart(doc.year, "Sem ano"), safePart(doc.category, "Outros")];
        const entityOrPerson = doc.entity || doc.person;
        if (entityOrPerson && entityOrPerson.trim()) {
          folderParts.push(safePart(entityOrPerson, ""));
        }
        const folder = folderParts.join("/");
        zip.file(`${folder}/${safePart(doc.filename, "documento")}.pdf`, pdfBytes);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `organizacao-pdf-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setStatus("success");
      setStatusText("ZIP transferido com sucesso! Todos os ficheiros foram processados localmente.");
    } catch (error) {
      setStatus("error");
      setStatusText(`Erro ao gerar ZIP: ${error.message}`);
    }
  }

  if (!loadedLocal) {
    return (
      <div className="pdf-organizer page-container">
        <p>A carregar o organizador de documentos...</p>
      </div>
    );
  }

  const blankCount = pages.filter((p) => !p.excluded && isBlankPage(p.text)).length;
  const excludedCount = pages.filter((p) => p.excluded).length;

  return (
    <div className="pdf-organizer page-container">
      {/* Header */}
      <header className="pdf-organizer-header">
        <div>
          <span className="eyebrow">Ferramenta Inteligente</span>
          <h1>Organizador de PDFs</h1>
          <p>Deteção inteligente de faturas, contratos, extratos e vencimentos com processamento 100% privado.</p>
        </div>
        <div className="pdf-privacy-badge">
          <FolderOpen size={16} /> Processamento 100% Local (Privado)
        </div>
      </header>

      {/* Toolbar Principal */}
      <section className="pdf-organizer-toolbar">
        <button className="pdf-btn pdf-btn-primary" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> Importar PDFs
        </button>
        <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={importFiles} />

        {pages.length > 0 && (
          <>
            <button className="pdf-btn pdf-btn-ai" onClick={reanalyzeAll} title="Recalcular divisões e metadados com as regras inteligentes">
              <Sparkles size={16} /> Reanalisar com IA
            </button>

            <button className="pdf-btn pdf-btn-ai" onClick={rescanOcr} title="Re-executar OCR e auto-rotação dos PDFs a partir do ficheiro original">
              <RotateCw size={15} /> Re-executar OCR / Rotação
            </button>

            {blankCount > 0 && (
              <button className="pdf-btn pdf-btn-secondary" onClick={removeBlankPages} title="Excluir páginas em branco detetadas">
                <Ban size={15} /> Limpar {blankCount} Página(s) em Branco
              </button>
            )}

            <button className="pdf-btn pdf-btn-secondary" onClick={mergeAll} title="Unir todas as páginas num único ficheiro">
              <Merge size={15} /> Unir Tudo
            </button>

            <button className="pdf-btn pdf-btn-secondary" onClick={splitAll} title="Separar todas as páginas individualmente">
              <Scissors size={15} /> Separar Todas
            </button>

            <button className="pdf-btn pdf-btn-primary" onClick={exportZip}>
              <Download size={16} /> Rever e Transferir ZIP
            </button>

            <button className="pdf-btn pdf-btn-danger" onClick={forgetLocalSession} title="Apagar sessão guardada neste navegador">
              <Trash2 size={15} /> Limpar Sessão
            </button>
          </>
        )}
      </section>

      {/* Status Banner */}
      {statusText && (
        <div className={`pdf-status ${status}`} role="status">
          {status === "success" && <CheckCircle2 size={18} />}
          {status === "error" && <AlertCircle size={18} />}
          {status === "loading" && <Sparkles size={18} />}
          <span>{statusText}</span>
        </div>
      )}

      {/* Empty State */}
      {!pages.length ? (
        <section className="pdf-empty-state" onClick={() => inputRef.current?.click()}>
          <div className="pdf-empty-icon-wrap">
            <FilePlus2 size={32} />
          </div>
          <h2>Importa os teus ficheiros PDF</h2>
          <p>
            Arrasta ou seleciona os PDFs que queres organizar. O novo motor inteligente deteta automaticamente se uma fatura ou contrato tem várias páginas, identifica NIFs, números de fatura e emissores portugueses.
          </p>
          <button className="pdf-btn pdf-btn-primary" type="button">
            <Upload size={16} /> Selecionar PDFs do Computador
          </button>
          {savedAt && (
            <p className="pdf-muted" style={{ marginTop: "16px" }}>
              <Save size={14} /> Última sessão guardada localmente em {new Date(savedAt).toLocaleString("pt-PT")}
            </p>
          )}
        </section>
      ) : (
        <>
          {/* Summary / Stats Bar */}
          <section className="pdf-stats-bar">
            <div className="pdf-stats-group">
              <div className="pdf-stats-item">
                <strong>{activePages.length}</strong> páginas ativas
              </div>
              <span>•</span>
              <div className="pdf-stats-item">
                <strong>{documents.length}</strong> documentos detetados
              </div>
              {excludedCount > 0 && (
                <>
                  <span>•</span>
                  <div className="pdf-stats-item" style={{ color: "#b91c1c" }}>
                    <strong>{excludedCount}</strong> página(s) excluída(s)
                  </div>
                </>
              )}
            </div>
            <div>
              {savedAt ? `Guardado às ${new Date(savedAt).toLocaleTimeString("pt-PT")}` : "A guardar..."}
            </div>
          </section>

          {/* Lista de Documentos Agrupados (Document Cards) */}
          <section className="pdf-documents-container">
            {documents.map((doc, docIndex) => (
              <div className={`pdf-doc-card ${doc.isBlank ? "is-blank-doc" : ""}`} key={doc.id}>
                {/* Header do Documento */}
                <div className="pdf-doc-header">
                  <div className="pdf-doc-index-badge">{docIndex + 1}</div>

                  <div className="pdf-doc-meta-inputs">
                    {/* Nome do Ficheiro */}
                    <input
                      className="pdf-input-title"
                      value={doc.filename}
                      placeholder="Nome do Documento"
                      aria-label="Nome do Documento"
                      onChange={(e) =>
                        setDocumentMeta((curr) => ({
                          ...curr,
                          [doc.id]: { ...doc, filename: e.target.value },
                        }))
                      }
                    />

                    {/* Categoria */}
                    <select
                      className="pdf-select-category"
                      value={doc.category}
                      aria-label="Categoria"
                      onChange={(e) =>
                        setDocumentMeta((curr) => ({
                          ...curr,
                          [doc.id]: { ...doc, category: e.target.value },
                        }))
                      }
                    >
                      {PDF_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    {/* Ano */}
                    <input
                      className="pdf-input-chip year"
                      value={doc.year}
                      placeholder="Ano"
                      aria-label="Ano"
                      onChange={(e) =>
                        setDocumentMeta((curr) => ({
                          ...curr,
                          [doc.id]: { ...doc, year: e.target.value },
                        }))
                      }
                    />

                    {/* Entidade / Fornecedor */}
                    <input
                      className="pdf-input-chip entity"
                      value={doc.entity}
                      placeholder="Entidade / Fornecedor"
                      aria-label="Entidade"
                      onChange={(e) =>
                        setDocumentMeta((curr) => ({
                          ...curr,
                          [doc.id]: { ...doc, entity: e.target.value, person: e.target.value },
                        }))
                      }
                    />

                    {/* Nº de Documento (opcional) */}
                    {doc.docNumber && (
                      <input
                        className="pdf-input-chip doc-num"
                        value={doc.docNumber}
                        placeholder="Nº Doc"
                        aria-label="Número de documento"
                        onChange={(e) =>
                          setDocumentMeta((curr) => ({
                            ...curr,
                            [doc.id]: { ...doc, docNumber: e.target.value },
                          }))
                        }
                      />
                    )}
                  </div>

                  {/* Ações do Documento */}
                  <div className="pdf-doc-actions">
                    {docIndex > 0 && (
                      <button
                        className="pdf-btn-icon-subtle merge-btn"
                        onClick={() => mergeWithPrevious(docIndex)}
                        title="Fundir este documento com o anterior"
                      >
                        <Merge size={14} /> Fundir com Anterior
                      </button>
                    )}
                    <button
                      className="pdf-btn-icon-subtle"
                      onClick={() => rotateDocument(doc)}
                      title="Rodar todas as páginas deste documento (+90°)"
                    >
                      <RotateCw size={14} /> Rodar Doc
                    </button>
                    <button
                      className="pdf-btn-icon-subtle delete-doc-btn"
                      onClick={() => deleteDocument(doc)}
                      title="Excluir documento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Carrossel / Faixa de Páginas do Documento */}
                <div className="pdf-doc-pages-body">
                  {doc.pages.map((page, pageIdx) => {
                    const isBlank = isBlankPage(page.text);
                    return (
                      <div className="pdf-page-item-wrap" key={page.id}>
                        {/* Se não for a primeira página deste documento, permitir dividir aqui */}
                        {pageIdx > 0 && (
                          <div className="pdf-split-handle-wrap">
                            <button
                              className="pdf-split-btn"
                              onClick={() => splitAtPage(page.id)}
                              title="Dividir aqui (criar novo documento a partir desta página)"
                            >
                              <Scissors size={14} />
                              <span>Dividir</span>
                            </button>
                          </div>
                        )}

                        {/* Cartão da Página */}
                        <div className={`pdf-page-card ${isBlank ? "is-blank" : ""}`}>
                          <div
                            className="pdf-page-thumb"
                            onClick={() => previews[page.id] && openPreview(page)}
                            title="Clique para ampliar"
                          >
                            {previews[page.id] ? (
                              <img src={previews[page.id]} alt={`Página ${page.pageNumber}`} />
                            ) : (
                              <span className="pdf-page-thumb-placeholder">
                                {previewLoading ? "..." : "PDF"}
                              </span>
                            )}
                          </div>

                          <div className="pdf-page-info">
                            <span className="pdf-page-badge">Pág. {pageIdx + 1} de {doc.pages.length}</span>
                            <span className="pdf-page-source" title={page.fileName}>
                              orig: {page.pageNumber}
                              {page.rotation ? ` · ${page.rotation}°` : ""}
                            </span>
                            {isBlank && (
                              <span style={{ fontSize: "0.65rem", color: "#e11d48", fontWeight: 700 }}>
                                Possível Vazio
                              </span>
                            )}
                          </div>

                          <div className="pdf-page-controls">
                            <button
                              className="pdf-page-btn"
                              onClick={() => rotatePage(page.id)}
                              title={`Rodar 90º (atualmente ${page.rotation || 0}º)`}
                            >
                              <RotateCw size={13} />
                            </button>
                            <button
                              className="pdf-page-btn delete"
                              onClick={() => toggleExcludePage(page.id)}
                              title="Excluir esta página"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* Páginas Excluídas (se houver) */}
          {excludedCount > 0 && (
            <section style={{ margin: "16px 0", padding: "14px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <strong style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  {excludedCount} Página(s) Excluída(s) / Descartada(s)
                </strong>
                <button
                  className="pdf-btn pdf-btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  onClick={() => setPages((curr) => curr.map((p) => ({ ...p, excluded: false })))}
                >
                  <Undo2 size={12} /> Restaurar Todas
                </button>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {pages.filter((p) => p.excluded).map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.75rem" }}>
                    <span>{p.fileName} · pág. {p.pageNumber}</span>
                    <button
                      type="button"
                      style={{ border: "none", background: "none", color: "#2563eb", cursor: "pointer", fontWeight: 700 }}
                      onClick={() => toggleExcludePage(p.id)}
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Árvore de Pastas do ZIP */}
          <section className="pdf-tree-panel">
            <div className="pdf-panel-heading">
              <div>
                <span className="eyebrow">Estrutura Final</span>
                <h2>Pré-visualização das Pastas do ZIP</h2>
              </div>
              <span className="pdf-hint">Os PDFs serão organizados exatamente nesta hierarquia</span>
            </div>

            <div className="pdf-tree">
              {Array.from(folderTree.entries()).map(([year, categoriesByYear]) => {
                const totalYearDocs = Array.from(categoriesByYear.values()).reduce(
                  (tot, entities) => tot + Array.from(entities.values()).reduce((cnt, items) => cnt + items.length, 0),
                  0
                );

                return (
                  <div className="pdf-tree-level pdf-tree-year" key={year}>
                    <div className="pdf-tree-folder">
                      <FolderOpen size={18} />
                      <strong>{year}</strong>
                      <span>{totalYearDocs} documento(s)</span>
                    </div>

                    <div className="pdf-tree-children">
                      {Array.from(categoriesByYear.entries()).map(([category, entitiesByCategory]) => {
                        const totalCatDocs = Array.from(entitiesByCategory.values()).reduce(
                          (tot, items) => tot + items.length,
                          0
                        );

                        return (
                          <div className="pdf-tree-level" key={`${year}-${category}`}>
                            <div className="pdf-tree-folder">
                              <FolderOpen size={16} />
                              <strong>{category}</strong>
                              <span>{totalCatDocs} documento(s)</span>
                            </div>

                            <div className="pdf-tree-children">
                              {Array.from(entitiesByCategory.entries()).map(([entity, items]) => (
                                <div className="pdf-tree-level" key={`${year}-${category}-${entity}`}>
                                  {entity !== "__direct__" && (
                                    <div className="pdf-tree-folder">
                                      <FolderOpen size={15} />
                                      <strong>{entity}</strong>
                                      <span>{items.length} documento(s)</span>
                                    </div>
                                  )}

                                  <div className="pdf-tree-files">
                                    {items.map((item) => (
                                      <div className="pdf-tree-file" key={`tree-${item.id}`}>
                                        <span className="pdf-tree-file-icon">PDF</span>
                                        <strong>{safePart(item.filename, "documento")}.pdf</strong>
                                        <span>{item.pages.length} pág.</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Botão de Exportação no Final */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "24px" }}>
            <button className="pdf-btn pdf-btn-primary" style={{ padding: "12px 24px", fontSize: "1rem" }} onClick={exportZip}>
              <Download size={20} /> Transferir ZIP Organizado
            </button>
          </div>
        </>
      )}

      {/* Modal de Zoom */}
      {previewZoom && (
        <div className="pdf-preview-modal" role="dialog" aria-modal="true" onClick={() => setPreviewZoom(null)}>
          <div className="pdf-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <span className="pdf-preview-title">{previewZoom.title}</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  className="pdf-btn pdf-btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                  onClick={async () => {
                    if (!previewZoom.pageId) return;
                    rotatePage(previewZoom.pageId);
                    const targetPage = pages.find((p) => p.id === previewZoom.pageId);
                    const source = files.find((f) => f.id === targetPage?.fileId);
                    if (source && targetPage) {
                      const newRot = ((targetPage.rotation || 0) + 90) % 360;
                      const src = await renderPagePreview(source.bytes, targetPage.pageNumber, 1.0, newRot);
                      setPreviewZoom((curr) => (curr ? { ...curr, src } : null));
                    }
                  }}
                  title="Rodar 90 graus"
                >
                  <RotateCw size={14} /> Rodar 90°
                </button>
                <button
                  type="button"
                  className="pdf-preview-close"
                  onClick={() => setPreviewZoom(null)}
                  aria-label="Fechar pré-visualização"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            {previewZoom.src ? (
              <img src={previewZoom.src} alt={previewZoom.title} />
            ) : (
              <div className="pdf-preview-loading">A carregar pré-visualização...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
