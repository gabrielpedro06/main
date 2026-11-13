// Conversões de cor e extração da paleta de um logo (Marketing → marcas)

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export { clamp };

export function normalizarHex(v) {
  let s = String(v || "").trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split("").map((c) => c + c).join("");
  return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : null;
}

export function hexParaRgb(hex) {
  const h = normalizarHex(hex) || "#000000";
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}
export const rgbParaHex = (r, g, b) => `#${[r, g, b].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("")}`;

export function rgbParaHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvParaRgb({ h, s, v }) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export const hexParaHsv = (hex) => rgbParaHsv(...hexParaRgb(hex));
export const hsvParaHex = (hsv) => rgbParaHex(...hsvParaRgb(hsv));

/** Cor do texto por cima de um fundo (branco ou escuro) */
export function textoSobre(hex) {
  const [r, g, b] = hexParaRgb(hex).map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#0f172a" : "#ffffff";
}

/**
 * Lê uma imagem (URL ou object URL) e devolve até `max` cores dominantes, por ordem de presença.
 * Ignora transparências e brancos/quase brancos (fundos). Falha em silêncio (devolve []).
 */
export function extrairCores(src, max = 6) {
  return new Promise((resolve) => {
    if (!src) { resolve([]); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const N = 72;
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        const w = ratio >= 1 ? N : Math.max(8, Math.round(N * ratio));
        const h = ratio >= 1 ? Math.max(8, Math.round(N / ratio)) : N;
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;
        const baldes = new Map();
        for (let i = 0; i < px.length; i += 4) {
          const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
          if (a < 200) continue;
          if (r > 235 && g > 235 && b > 235) continue; // fundo branco
          const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
          const e = baldes.get(k) || { n: 0, r: 0, g: 0, b: 0 };
          e.n++; e.r += r; e.g += g; e.b += b;
          baldes.set(k, e);
        }
        const ordenados = [...baldes.values()].sort((a, b) => b.n - a.n).map((e) => [e.r / e.n, e.g / e.n, e.b / e.n]);
        const out = [];
        for (const c of ordenados) {
          if (out.every((o) => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) > 48)) out.push(c);
          if (out.length >= max) break;
        }
        resolve(out.map((c) => rgbParaHex(...c)));
      } catch {
        resolve([]); // imagem sem CORS: não dá para ler os píxeis
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}
