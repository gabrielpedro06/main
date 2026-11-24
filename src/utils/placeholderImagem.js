// =====================================================================
// Placeholders desfocados para as fotos de perfil (a ideia do BlurHash).
// Enquanto a foto descarrega, aparece uma versão muito desfocada com as
// cores dela, em vez de um buraco branco/cinzento.
//
// Como funciona (sem coluna nova na base de dados):
//  - Ao carregar uma foto (Perfil.jsx), reduzimos a imagem a 4×4 píxeis e
//    guardamos essas 16 cores (48 bytes → 64 caracteres) no NOME do ficheiro:
//    "<user>-<data>-ph<código>.jpg". O código viaja com o avatar_url para todo o lado.
//  - instalarPlaceholders() (main.jsx) vigia as <img> da página: se o src é
//    um avatar ainda por carregar, põe por trás o mosaico 4×4 ampliado (o
//    browser suaviza-o = desfocado). Quando a foto chega, tapa-o.
//  - Fotos antigas (sem código): fundo neutro suave em vez do branco.
// Estilos: .bz-ph em styles/refinamentos.css.
// =====================================================================

const LADO = 4;
const RE_CODIGO = /-ph([A-Za-z0-9_-]{64})\.[a-z]+(?:[?#]|$)/;
const RE_AVATAR = /\/avatars\//;

/**
 * Código do placeholder (64 caracteres seguros para nomes de ficheiro).
 * @param {CanvasImageSource} fonte canvas ou imagem já carregada
 */
export function codigoPlaceholder(fonte) {
  try {
    const c = document.createElement("canvas");
    c.width = LADO; c.height = LADO;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(fonte, 0, 0, LADO, LADO);
    const px = ctx.getImageData(0, 0, LADO, LADO).data;
    let bin = "";
    for (let i = 0; i < px.length; i += 4) bin += String.fromCharCode(px[i], px[i + 1], px[i + 2]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_");
  } catch {
    return null; // canvas "contaminado" ou sem suporte: sem placeholder
  }
}

const cache = new Map();

/** Imagem (data URL) do placeholder de um URL, ou null se o URL não tiver código. */
export function placeholderDeUrl(url) {
  const m = RE_CODIGO.exec(String(url || ""));
  if (!m) return null;
  const codigo = m[1];
  if (cache.has(codigo)) return cache.get(codigo);
  let out = null;
  try {
    const bin = atob(codigo.replace(/-/g, "+").replace(/_/g, "/"));
    const c = document.createElement("canvas");
    c.width = LADO; c.height = LADO;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(LADO, LADO);
    for (let i = 0, j = 0; i < bin.length; i += 3, j += 4) {
      img.data[j] = bin.charCodeAt(i);
      img.data[j + 1] = bin.charCodeAt(i + 1);
      img.data[j + 2] = bin.charCodeAt(i + 2);
      img.data[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    out = c.toDataURL("image/png");
  } catch { /* código inválido */ }
  cache.set(codigo, out);
  return out;
}

function limpar(img) {
  img.classList.remove("bz-ph", "bz-ph-neutro");
  img.style.removeProperty("background-image");
}

function tratar(img) {
  const src = img.currentSrc || img.getAttribute("src") || "";
  if (!RE_AVATAR.test(src)) return;
  if (img.complete && img.naturalWidth > 0) { limpar(img); return; }
  const ph = placeholderDeUrl(src);
  img.classList.add("bz-ph");
  if (ph) {
    img.classList.remove("bz-ph-neutro");
    img.style.backgroundImage = `url("${ph}")`;
  } else {
    img.classList.add("bz-ph-neutro");
    img.style.removeProperty("background-image");
  }
  if (!img.dataset.bzPh) {
    img.dataset.bzPh = "1";
    img.addEventListener("load", () => limpar(img));
    img.addEventListener("error", () => limpar(img));
  }
}

let instalado = false;

/** Liga os placeholders a todas as fotos de perfil da app (chamar uma vez). */
export function instalarPlaceholders() {
  if (instalado || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  instalado = true;
  const varrer = (raiz) => {
    if (raiz.nodeType !== 1) return;
    if (raiz.tagName === "IMG") tratar(raiz);
    else raiz.querySelectorAll?.("img").forEach(tratar);
  };
  new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      if (m.type === "attributes") { if (m.target.tagName === "IMG") tratar(m.target); }
      else m.addedNodes.forEach(varrer);
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  varrer(document.body);
}
