// =====================================================================
// "Amazon safe triangle" para menus que abrem ao passar o rato.
// Problema: o menu abre por cima do botão; ao levar o rato na diagonal até
// um item do menu, o cursor sai do botão (passa por cima de outro) e o menu
// fecha antes de lá chegar.
// Solução: enquanto o rato se mexe no botão, desenhamos um triângulo
// invisível do cursor até à base do menu (::after do painel, CSS em
// styles/refinamentos.css). Como pertence ao menu, mantém o :hover.
// Se o rato parar ~0,5 s fora do botão e do menu, o triângulo desaparece
// (deixa de "roubar" os cliques aos botões por baixo).
//
// Uso (sem JS na página): <div data-triangulo> <button data-triangulo-gatilho> + <div data-triangulo-painel> </div>
// Ligado uma vez em main.jsx (instalarTrianguloSeguro()).
// Só para rato (no toque não há hover).
// =====================================================================

import { zoomUI } from "./tamanhoInterface";

let instalado = false;

export function instalarTrianguloSeguro() {
  if (instalado || typeof document === "undefined") return;
  instalado = true;

  let painelAtivo = null;
  let timer = null;

  const esconder = (painel) => {
    painel?.style.removeProperty("--st-h");
    painel?.style.removeProperty("--st-x");
  };

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const alvo = e.target instanceof Element ? e.target : null;
    const grupo = alvo?.closest("[data-triangulo]");
    const painel = grupo?.querySelector("[data-triangulo-painel]");

    // Fora de qualquer grupo: o triângulo antigo apaga-se daqui a pouco
    if (!painel) {
      if (painelAtivo && !timer) {
        const p = painelAtivo;
        timer = setTimeout(() => { esconder(p); if (painelAtivo === p) painelAtivo = null; timer = null; }, 500);
      }
      return;
    }

    if (painelAtivo && painelAtivo !== painel) esconder(painelAtivo);
    painelAtivo = painel;

    // Em cima do próprio menu (ou do triângulo): não mexe, só adia o fim
    if (painel.contains(alvo)) {
      clearTimeout(timer);
      timer = setTimeout(() => { esconder(painel); timer = null; }, 500);
      return;
    }

    // No botão: o triângulo vai do cursor à base do menu
    clearTimeout(timer);
    timer = null;
    const r = painel.getBoundingClientRect();
    const z = zoomUI(); // medidas do ecrã → px de CSS (tamanho da interface)
    const altura = Math.max(0, Math.round((e.clientY - r.bottom) / z));
    painel.style.setProperty("--st-x", `${Math.round((e.clientX - r.left) / z)}px`);
    painel.style.setProperty("--st-h", `${altura}px`);
  }, { passive: true });
}
