// =====================================================================
// Animação ao FECHAR janelas, para todas as janelas da app de uma vez.
// As janelas são do React: ao fechar, o elemento é retirado do ecrã e
// desaparecia de repente. Aqui, quando um fundo de janela (utils/janelas.js)
// sai do DOM, pomos no mesmo sítio uma cópia "fantasma" (sem cliques, escondida
// dos leitores de ecrã) e animamo-la para fora: fundo a desvanecer, caixa a
// descer/encolher um pouco. Dura ~170 ms e depois é apagada.
//
// Interrompível: usa a Web Animations API. Se abrir outra janela durante a
// saída, o fantasma desaparece logo (nunca tapa a janela nova).
// Não anima: com "reduzir movimento", fechos por gesto (a janela já saiu a
// deslizar), janelas que são substituídas por outra igual (re-render) e
// janelas muito grandes (> 600 elementos, para não pesar).
// Ligado em main.jsx (instalarSaidaJanelas()).
// =====================================================================
import { SELETOR_JANELAS } from "./janelas";

const DURACAO = 170;
const MAX_ELEMENTOS = 600;
const fantasmas = new Set();

const reduzir = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A caixa da janela (primeiro filho com tamanho), para a animar à parte do fundo. */
function caixaDe(fundo) {
  for (const f of fundo.children) {
    if (f.nodeType === 1 && !f.hasAttribute("hidden")) return f;
  }
  return null;
}

function limparTodos() {
  fantasmas.forEach((g) => g.remove());
  fantasmas.clear();
}

function animarSaida(el, pai, proximo) {
  if (!pai?.isConnected) return; // a página inteira mudou: não há onde animar
  if (el.dataset.semSaida !== undefined || el.dataset.fechadoPorGesto !== undefined) return;
  if (el.getElementsByTagName("*").length > MAX_ELEMENTOS) return;
  // Janelas que já têm a sua própria animação de saída (ex.: painel das Entidades)
  const SAIDA_PROPRIA = ".is-closing, .is-leaving, .is-saindo";
  if (el.matches(SAIDA_PROPRIA) || el.querySelector(SAIDA_PROPRIA)) return;

  const g = el.cloneNode(true);
  g.setAttribute("aria-hidden", "true");
  g.inert = true;
  g.removeAttribute("id");
  g.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  g.querySelectorAll("video, audio, iframe").forEach((n) => n.remove());
  g.style.pointerEvents = "none";
  // As animações de ENTRADA (CSS) não podem voltar a correr na cópia
  g.style.animation = "none";
  g.querySelectorAll("*").forEach((n) => { n.style.animation = "none"; });
  g.classList.add("bz-janela-fantasma");

  try {
    pai.insertBefore(g, proximo && proximo.parentNode === pai ? proximo : null);
  } catch {
    return;
  }
  fantasmas.add(g);

  const anims = [g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DURACAO, easing: "ease-in", fill: "forwards" })];
  const caixa = caixaDe(g);
  if (caixa) {
    anims.push(caixa.animate(
      [{ transform: "translateY(0) scale(1)" }, { transform: "translateY(10px) scale(0.97)" }],
      { duration: DURACAO, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards", composite: "add" },
    ));
  }
  Promise.all(anims.map((a) => a.finished)).catch(() => {}).finally(() => {
    g.remove();
    fantasmas.delete(g);
  });
}

let instalado = false;

export function instalarSaidaJanelas() {
  if (instalado || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  if (typeof Element === "undefined" || !Element.prototype.animate) return;
  instalado = true;

  new MutationObserver((mudancas) => {
    if (reduzir()) return;
    const saidas = [];
    let entrouJanela = false;
    for (const m of mudancas) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1 || n.classList.contains("bz-janela-fantasma")) return;
        if (n.matches(SELETOR_JANELAS) || n.querySelector?.(SELETOR_JANELAS)) entrouJanela = true;
      });
      m.removedNodes.forEach((n) => {
        if (n.nodeType !== 1 || n.classList.contains("bz-janela-fantasma")) return;
        if (n.matches(SELETOR_JANELAS)) saidas.push({ el: n, pai: m.target, proximo: m.nextSibling });
      });
    }
    // Abriu uma janela (nova ou a mesma redesenhada): nada de fantasmas por cima
    if (entrouJanela) { limparTodos(); return; }
    saidas.forEach(({ el, pai, proximo }) => animarSaida(el, pai, proximo));
  }).observe(document.body, { childList: true, subtree: true });
}
