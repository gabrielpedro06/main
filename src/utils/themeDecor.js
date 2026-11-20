// Preferência "decorações animadas" dos temas de celebração (por dispositivo)
// Guardada em localStorage; a mudança é avisada por um CustomEvent na window
// para o ThemeDecor (montado no Dashboard) reagir sem recarregar.
const KEY = "bz-theme-decor";
const EVENT = "bz-theme-decor-change";

/** @returns {boolean} true salvo se o utilizador as desligou ("off"). */
export function isDecorEnabled() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

/** Grava a preferência e avisa os ouvintes (onDecorChange). @param {boolean} on */
export function setDecorEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* sem storage */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

/**
 * Subscreve mudanças da preferência.
 * @param {(on: boolean) => void} cb
 * @returns {() => void} cancela a subscrição
 */
export function onDecorChange(cb) {
  const handler = (e) => cb(Boolean(e.detail));
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
