// =====================================================================
// Gestos de toque: "arrastar para fechar" (swipe-to-dismiss).
// O elemento segue o dedo; se for largado longe o suficiente (ou depressa),
// sai do ecrã e chama aoFechar; senão volta ao sítio com uma mola.
// As animações usam transições CSS, por isso podem ser interrompidas: se o dedo
// voltar a agarrar a meio da animação, o elemento continua de onde está.
// Usado por ToastGlobal (para o lado), GestosJanelas (janelas, para baixo) e
// pela gaveta do menu no Dashboard (para a esquerda).
// =====================================================================

const MOLA = "transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.15), opacity 0.32s ease";
const SAIR = "transform 0.22s cubic-bezier(0.4, 0, 1, 1), opacity 0.22s ease";

/** Há algum elemento com scroll entre o alvo e a raiz que ainda não está no topo/início? */
function haScrollPorTras(alvo, raiz, eixo, sentido) {
  for (let n = alvo; n && n !== raiz.parentElement; n = n.parentElement) {
    const st = getComputedStyle(n);
    if (eixo === "y" && /(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 1) {
      if (sentido > 0 ? n.scrollTop > 0 : n.scrollTop + n.clientHeight < n.scrollHeight - 1) return true;
    }
    if (eixo === "x" && /(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
  }
  return false;
}

const eCampo = (el) => el?.closest?.("input, textarea, select, [contenteditable='true'], input[type='range'], [data-sem-arrastar]");

/**
 * Liga o gesto a um elemento.
 * @param {HTMLElement} el elemento que se move
 * @param {object} op
 * @param {"x"|"y"} [op.eixo="y"]
 * @param {1|-1} [op.sentido=1] 1 = para baixo/direita fecha; -1 = para cima/esquerda
 * @param {boolean} [op.ambos=false] (só x) fecha para os dois lados
 * @param {() => void} op.aoFechar
 * @param {HTMLElement} [op.fundo] elemento que vai ficando transparente (ex.: o fundo escuro)
 * @param {() => void} [op.aoComecar] chamado ao começar a arrastar (ex.: pausar contagem)
 * @param {() => void} [op.aoCancelar] chamado quando volta ao sítio
 * @returns {() => void} desliga o gesto
 */
export function arrastarParaFechar(el, { eixo = "y", sentido = 1, ambos = false, aoFechar, fundo, aoComecar, aoCancelar } = {}) {
  let inicio = null; // { x, y, t }
  let ativo = false;
  let desl = 0;
  let ultimo = { d: 0, t: 0 };
  let vel = 0;

  const tamanho = () => (eixo === "y" ? el.offsetHeight : el.offsetWidth) || 300;

  let limpar = null;
  const aplicar = (d, transicao) => {
    clearTimeout(limpar);
    el.style.transition = transicao || "none";
    // De volta ao sítio: no fim, devolve o controlo às transições/estilos do próprio elemento
    if (!d && transicao) {
      limpar = setTimeout(() => {
        el.style.transition = "";
        if (fundo) fundo.style.transition = "";
      }, 360);
    }
    el.style.transform = d ? (eixo === "y" ? `translate3d(0, ${d}px, 0)` : `translate3d(${d}px, 0, 0)`) : "";
    const progresso = Math.min(1, Math.abs(d) / tamanho());
    if (eixo === "x") el.style.opacity = d ? String(1 - progresso * 0.8) : "";
    if (fundo) {
      fundo.style.transition = transicao ? "opacity 0.3s ease" : "none";
      fundo.style.opacity = d ? String(1 - progresso * 0.9) : "";
    }
  };

  const onStart = (e) => {
    if (e.touches.length !== 1 || eCampo(e.target)) return;
    const t = e.touches[0];
    inicio = { x: t.clientX, y: t.clientY, alvo: e.target };
    // Se estava a meio de uma animação, continua da posição atual (interrompível)
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    desl = eixo === "y" ? m.m42 : m.m41;
    ultimo = { d: desl, t: e.timeStamp };
    vel = 0;
    ativo = false;
  };

  const onMove = (e) => {
    if (!inicio) return;
    const t = e.touches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    const principal = eixo === "y" ? dy : dx;
    const outro = eixo === "y" ? dx : dy;

    if (!ativo) {
      if (Math.abs(principal) < 8) return;
      // movimento sobretudo no outro eixo, ou no sentido errado: deixa o scroll normal
      const sentidoCerto = ambos || Math.sign(principal) === sentido;
      if (Math.abs(outro) > Math.abs(principal) || !sentidoCerto || haScrollPorTras(inicio.alvo, el, eixo, Math.sign(principal))) {
        inicio = null;
        return;
      }
      ativo = true;
      el.style.animation = "none"; // animações CSS sobrepõem-se ao transform inline
      el.style.willChange = "transform";
      aoComecar?.();
      inicio.base = desl - principal;
    }
    e.preventDefault();
    let d = inicio.base + principal;
    // no sentido "errado" resiste (efeito elástico)
    if (!ambos && Math.sign(d) !== sentido && d !== 0) d = d / 4;
    desl = d;
    const dt = e.timeStamp - ultimo.t;
    if (dt > 0) vel = (d - ultimo.d) / dt;
    ultimo = { d, t: e.timeStamp };
    aplicar(d);
  };

  const onEnd = () => {
    if (!inicio) return;
    const estava = ativo;
    inicio = null;
    ativo = false;
    if (!estava) return;
    el.style.willChange = "";
    const longe = Math.abs(desl) > tamanho() * (eixo === "y" ? 0.28 : 0.35);
    const rapido = Math.abs(vel) > 0.55;
    const sentidoOk = ambos ? true : Math.sign(desl) === sentido;
    if (sentidoOk && (longe || (rapido && Math.sign(vel) === Math.sign(desl))) && desl !== 0) {
      const fora = Math.sign(desl) * (tamanho() + 40);
      aplicar(fora, SAIR);
      setTimeout(() => {
        aoFechar?.();
        // se a janela recusou fechar (continua no ecrã), volta ao sítio
        setTimeout(() => { if (el.isConnected) aplicar(0, MOLA); }, 120);
      }, 200);
    } else {
      aplicar(0, MOLA);
      aoCancelar?.();
    }
  };

  el.addEventListener("touchstart", onStart, { passive: true });
  el.addEventListener("touchmove", onMove, { passive: false });
  el.addEventListener("touchend", onEnd);
  el.addEventListener("touchcancel", onEnd);
  return () => {
    el.removeEventListener("touchstart", onStart);
    el.removeEventListener("touchmove", onMove);
    el.removeEventListener("touchend", onEnd);
    el.removeEventListener("touchcancel", onEnd);
  };
}
