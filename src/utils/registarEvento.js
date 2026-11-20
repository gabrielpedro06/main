// Registo manual de eventos sem alteração de dados (RPC registar_evento → audit_log).
// Os textos legíveis de cada `acao` estão em utils/auditoria.js (EVENTOS).
import { supabase } from "../services/supabase";

/**
 * Regista um evento da aplicação no registo de atividade (public.audit_log).
 * Nunca lança erro: o registo não pode interromper o que o utilizador está a fazer.
 * As alterações de dados (criar, editar, apagar) já ficam registadas automaticamente
 * na base de dados; isto é só para ações que não mudam tabelas (login, logout, exportar…).
 *
 * @param {string} acao   chave do evento; para aparecer legível nos Registos tem de existir
 *                        em EVENTOS de utils/auditoria.js (ex.: "login", "exportacao").
 * @param {object} [detalhes] JSON livre guardado em audit_log (nunca pôr segredos aqui).
 * @returns {Promise<void>}
 */
export async function registarEvento(acao, detalhes = {}) {
  try {
    const { error } = await supabase.rpc("registar_evento", { p_acao: acao, p_detalhes: detalhes || {} });
    if (error) console.warn("registar_evento:", error.message);
  } catch (e) {
    console.warn("registar_evento:", e?.message || e);
  }
}
