// =====================================================================
// Chaves de idempotência para pedidos ao servidor (ver api/_lib/idempotencia.js).
// A chave é uma impressão digital (SHA-256) do conteúdo do pedido: o MESMO envio
// (mesmos destinatários, template, texto…) dá sempre a mesma chave. Assim, um
// duplo clique, um "tentar outra vez" depois de a rede falhar, ou carregar em
// Enviar duas vezes por engano não reenviam nada durante 15 minutos.
//
//   const r = await postAutenticado(url, corpo, await cabecalhoIdempotencia("campanha", corpo));
// =====================================================================

/** JSON com as chaves dos objetos ordenadas (o mesmo conteúdo dá sempre o mesmo texto). */
function jsonEstavel(v) {
  if (Array.isArray(v)) return `[${v.map(jsonEstavel).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${jsonEstavel(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/**
 * Impressão digital (hex) de um conteúdo.
 * @param {string} tipo ex.: "campanha_marketing"
 * @param {any} conteudo
 */
export async function chaveIdempotencia(tipo, conteudo) {
  const texto = `${tipo}|${jsonEstavel(conteudo)}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Sem crypto.subtle (http não seguro): hash simples, chega para detetar repetições
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return `djb2-${(h >>> 0).toString(16)}-${texto.length}`;
}

/** Cabeçalho pronto a juntar ao pedido: { "Idempotency-Key": "…" }. */
export async function cabecalhoIdempotencia(tipo, conteudo) {
  return { "Idempotency-Key": await chaveIdempotencia(tipo, conteudo) };
}
