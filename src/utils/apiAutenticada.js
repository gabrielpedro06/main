// Chamadas às rotas do servidor do Bizin (api/* na Vercel ou server/ em dev)
// com o JWT da sessão Supabase no cabeçalho Authorization. O servidor valida o
// token antes de usar chaves privadas (nif.pt, email, IA…).
import { supabase } from "../services/supabase";

/**
 * POST para as rotas do servidor do Bizin com a sessão do utilizador
 * (o servidor recusa pedidos sem sessão válida).
 * @param {string} url  URL completo (normalmente `${VITE_MARKETING_API_BASE}/api/...`)
 * @param {object} body serializado em JSON
 * @returns {Promise<Response>} Response do fetch; não lança em 4xx/5xx (verificar `r.ok`)
 */
export async function postAutenticado(url, body) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: JSON.stringify(body),
  });
}

/** GET para as rotas do servidor do Bizin com a sessão do utilizador. */
export async function getAutenticado(url) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(url, { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
}

/**
 * Consulta de NIF pelo servidor (a chave do nif.pt fica no servidor).
 * @param {string} nif
 * @returns {Promise<Response>} JSON devolvido por api/nif
 */
export function consultarNif(nif) {
  const base = import.meta.env.VITE_MARKETING_API_BASE || "";
  return getAutenticado(`${base}/api/nif?q=${encodeURIComponent(nif)}`);
}
