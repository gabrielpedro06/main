// =====================================================================
// Tamanho da interface no computador: 80% (por omissão), 90% ou 100%.
// Equivale ao zoom do browser, mas é a app que o aplica (atributo
// data-tamanho no <html>, CSS em styles/tamanho-interface.css) e fica
// guardado por pessoa neste browser (localStorage). No telemóvel não muda nada.
// Escolhe-se no menu da conta (AccountMenu.jsx).
//
// Código que posiciona coisas com coordenadas (getBoundingClientRect,
// clientX, innerWidth) tem de dividir por zoomUI(): essas medidas vêm em
// píxeis do ecrã e o CSS (left/top em px) é multiplicado pelo zoom.
// =====================================================================

const CHAVE = "bz-tamanho-interface";
export const TAMANHOS = [
  { valor: "80", label: "Compacto (80%)" },
  { valor: "90", label: "Médio (90%)" },
  { valor: "100", label: "Grande (100%)" },
];
const POR_OMISSAO = "80";

/** Tamanho escolhido ("80" | "90" | "100"). */
export function lerTamanho() {
  try {
    const v = localStorage.getItem(CHAVE);
    if (TAMANHOS.some((t) => t.valor === v)) return v;
  } catch { /* sem armazenamento */ }
  return POR_OMISSAO;
}

/** Aplica (e guarda) o tamanho. */
export function definirTamanho(valor) {
  const v = TAMANHOS.some((t) => t.valor === valor) ? valor : POR_OMISSAO;
  try { localStorage.setItem(CHAVE, v); } catch { /* sem armazenamento */ }
  document.documentElement.dataset.tamanho = v;
  window.dispatchEvent(new Event("bz:tamanho"));
}

/** Zoom efetivo da app neste momento (1 = sem zoom; no telemóvel é sempre 1). */
export function zoomUI() {
  if (typeof document === "undefined") return 1;
  const z = parseFloat(getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(z) && z > 0 ? z : 1;
}

/** Converte uma medida do ecrã (rect, clientX, innerWidth) para px de CSS. */
export const paraCss = (n) => n / zoomUI();

// Aplica logo ao carregar (antes de a app desenhar, para não "saltar")
if (typeof document !== "undefined") {
  document.documentElement.dataset.tamanho = lerTamanho();
}

/** getBoundingClientRect() em px de CSS (para posicionar menus/dicas com left/top). */
export function rectCss(el) {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  const z = zoomUI();
  if (z === 1) return r;
  return {
    left: r.left / z, top: r.top / z, right: r.right / z, bottom: r.bottom / z,
    width: r.width / z, height: r.height / z, x: r.x / z, y: r.y / z,
  };
}

/** Largura/altura da janela em px de CSS. */
export const larguraEcra = () => window.innerWidth / zoomUI();
export const alturaEcra = () => window.innerHeight / zoomUI();
