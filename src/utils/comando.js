// Utilitários do Command Menu (components/CommandMenu.jsx), num ficheiro à parte
// para poderem ser usados por botões noutros componentes.

const eMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Texto do atalho para mostrar (⌘K no Mac, Ctrl K no resto). */
export const ATALHO_COMANDO = eMac ? "⌘K" : "Ctrl K";

/** Abre o Command Menu a partir de qualquer sítio (botões "Pesquisar"). */
export const abrirComando = () => window.dispatchEvent(new Event("bz:comando"));
