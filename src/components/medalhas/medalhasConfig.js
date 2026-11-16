// Medalhas: utilitários partilhados (RH e cartão de perfil)

export const MEDALHAS_BUCKET = "medalhas";
export const MEDALHA_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const MEDALHA_TIPOS = ["image/png", "image/webp", "image/jpeg"];

export const fmtDataMedalha = (iso, opts = { day: "numeric", month: "long", year: "numeric" }) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-PT", opts);
};

// Erro típico quando a migração 067 ainda não foi corrida
export const faltaMigracao = (err) => /does not exist|schema cache|bucket not found/i.test(String(err?.message || err || ""));
