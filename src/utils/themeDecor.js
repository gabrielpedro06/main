// Preferência "decorações animadas" dos temas de celebração (por dispositivo)
const KEY = "bz-theme-decor";
const EVENT = "bz-theme-decor-change";

export function isDecorEnabled() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setDecorEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* sem storage */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function onDecorChange(cb) {
  const handler = (e) => cb(Boolean(e.detail));
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
