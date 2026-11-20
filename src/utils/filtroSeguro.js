// Valores que entram em filtros de texto do Supabase (.or("user_id.eq.…")).
// O Supabase já não permite SQL Injection (não há SQL montado à mão), mas um valor
// com vírgulas ou parênteses podia mudar o filtro. Aqui só passam UUIDs e datas válidas.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;
const NENHUM = "00000000-0000-0000-0000-000000000000";

/**
 * UUID válido, ou um UUID que não corresponde a ninguém.
 * Usar SEMPRE ao interpolar ids em `.or("user_id.eq.${…}")`.
 * @param {unknown} v
 * @returns {string}
 */
export const uuidSeguro = (v) => (UUID_RE.test(String(v ?? "")) ? String(v) : NENHUM);

/** Data ISO (AAAA-MM-DD…) válida, ou 1970-01-01. */
export const dataSegura = (v) => (DATA_RE.test(String(v ?? "")) ? String(v) : "1970-01-01");
