// Põe o modo de cor (claro/escuro) no <html> ANTES de a app desenhar, para não haver
// um "flash" branco ao abrir em modo escuro. O ThemeContext depois mantém-no atualizado.
try {
  const modo = localStorage.getItem("app-modo");
  const escuro = modo === "escuro" || (modo === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.modo = escuro ? "escuro" : "claro";
  document.documentElement.style.colorScheme = escuro ? "dark" : "light";
} catch { /* sem armazenamento: claro */ }
