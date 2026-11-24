// =====================================================================
// View Transitions entre páginas (API do browser document.startViewTransition).
// O browser tira uma "fotografia" da página antiga, a app muda de página, e as
// duas são animadas (a antiga sai, a nova entra). Só a área de conteúdo
// (.dashboard-main) é animada; a barra lateral fica parada.
// - Links internos: Dashboard.jsx interceta os cliques e chama navegarComTransicao.
// - Código: navegarComTransicao(navigate, "/dashboard/projetos").
// Sem suporte (Firefox antigo, Safari < 18) ou com "reduzir movimento": navega normalmente.
// Estilos: secção "Transição entre páginas" em styles/refinamentos.css.
// =====================================================================

let aoMudar = null;
let emCurso = false;

const suportado = () =>
  typeof document !== "undefined" &&
  typeof document.startViewTransition === "function" &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Vai haver View Transition se navegar agora? */
export const podeTransicao = () =>
  suportado() && !emCurso && !document.documentElement.classList.contains("bz-theme-transition");

/** Chamado pelo Dashboard quando a nova página já está no ecrã (fim da "fotografia" nova). */
export function paginaMudou() {
  const f = aoMudar;
  aoMudar = null;
  f?.();
}

/**
 * Navega com animação de transição.
 * @param {(to: string, opts?: object) => void} navigate de useNavigate()
 * @param {string} destino ex.: "/dashboard/projetos"
 * @param {object} [opcoes] passadas ao navigate (ex.: { state })
 */
export function navegarComTransicao(navigate, destino, opcoes) {
  // Sem suporte, já a meio de outra transição, ou durante a transição do tema
  if (!podeTransicao()) {
    navigate(destino, opcoes);
    return;
  }
  emCurso = true;
  const html = document.documentElement;
  html.classList.add("bz-vt-pagina");
  let vt;
  try {
    vt = document.startViewTransition(() => new Promise((resolver) => {
      aoMudar = resolver;
      navigate(destino, opcoes);
      // Se a página nova demorar (ficheiro ainda a descarregar), não fica à espera
      setTimeout(paginaMudou, 450);
    }));
  } catch {
    html.classList.remove("bz-vt-pagina");
    emCurso = false;
    navigate(destino, opcoes);
    return;
  }
  vt.finished.finally(() => {
    html.classList.remove("bz-vt-pagina");
    emCurso = false;
  });
}
