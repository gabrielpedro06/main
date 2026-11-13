// Utilitários da aba Marketing

const pad = (n) => String(n).padStart(2, "0");

/** ISO (timestamptz) → valor para <input type="datetime-local"> */
export function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de <input type="datetime-local"> → ISO */
export function fromLocalInput(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Date → "YYYY-MM-DD" (hora local) */
export const diaKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const hojeKey = () => diaKey(new Date());

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function fmtData(iso, { hora = true } = {}) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  const dia = `${d.getDate()} ${MESES[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""}`;
  if (!hora || iso.length === 10) return dia;
  return `${dia}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Dias até à data (negativo = passou). Aceita "YYYY-MM-DD" ou ISO. */
export function diasAte(valor) {
  if (!valor) return null;
  const d = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

export function iniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const PALETA = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#4f46e5", "#be123c", "#0d9488", "#9333ea"];
export function corPessoa(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

export const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Reconhece o tipo de link para mostrar um ícone/etiqueta */
export function tipoLink(url) {
  const u = String(url || "").toLowerCase();
  if (u.includes("canva")) return { label: "Canva", cor: "#00c4cc" };
  if (u.includes("brevo") || u.includes("sendinblue")) return { label: "Brevo", cor: "#0b996e" };
  if (u.includes("drive.google") || u.includes("docs.google")) return { label: "Drive", cor: "#1a73e8" };
  if (u.includes("figma")) return { label: "Figma", cor: "#a259ff" };
  if (u.includes("instagram")) return { label: "Instagram", cor: "#e1306c" };
  if (u.includes("facebook")) return { label: "Facebook", cor: "#1877f2" };
  if (u.includes("linkedin")) return { label: "LinkedIn", cor: "#0a66c2" };
  if (u.includes("youtube") || u.includes("youtu.be")) return { label: "YouTube", cor: "#ff0000" };
  if (u.includes("sharepoint") || u.includes("onedrive")) return { label: "OneDrive", cor: "#0078d4" };
  return { label: "Link", cor: "#64748b" };
}

export function urlSegura(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[a-z]+:/i.test(u)) return ""; // javascript:, data:, etc.
  return `https://${u}`;
}

/** Termos da lista "evitamos" que aparecem no texto */
export function termosEvitados(guia, textos) {
  const t = norm(textos.filter(Boolean).join(" \n "));
  if (!t.trim()) return [];
  return (guia?.voz?.evitamos || []).filter((x) => x && t.includes(norm(x).trim()));
}
