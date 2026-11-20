/**
 * Controlo da animação de entrada (components/BrandIntro.jsx).
 * A flag vive em sessionStorage: toca uma vez por separador e volta a tocar após login.
 */

/** Chave em sessionStorage; "1" = a intro já tocou neste separador. */
export const BRAND_INTRO_KEY = "bz-intro-played";

/** Marca a intro da marca para voltar a tocar (chamado no login). */
export const resetBrandIntro = () => {
  try { sessionStorage.removeItem(BRAND_INTRO_KEY); } catch { /* ignora */ }
};
