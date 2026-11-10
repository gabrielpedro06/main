export const BRAND_INTRO_KEY = "bz-intro-played";

/** Marca a intro da marca para voltar a tocar (chamado no login). */
export const resetBrandIntro = () => {
  try { sessionStorage.removeItem(BRAND_INTRO_KEY); } catch { /* ignora */ }
};
