import { supabase } from "../services/supabase";

// =====================================================================
// Cofre de palavras-passe (migração 072, Supabase Vault).
// As listas nunca trazem a palavra-passe: pede-se ao cofre quando é preciso
// (mostrar ou copiar) e cada pedido fica no histórico de atividade.
//   tabela: "acessos_cliente" (Clientes) | "acessos" (Ativos TI)
// =====================================================================

const CAMPO_ANTIGO = { acessos_cliente: "codigo", acessos: "password" };

/**
 * Tira a palavra-passe antiga das linhas e marca se há uma guardada.
 * @param {object[]} linhas linhas lidas de `acessos_cliente` ou `acessos`
 * @param {"acessos_cliente"|"acessos"} tabela
 * @returns {object[]} linhas sem o campo antigo e com `tem_palavra_passe: boolean`
 */
export function semPalavraPasse(linhas, tabela) {
  const campo = CAMPO_ANTIGO[tabela];
  return (linhas || []).map((l) => {
    const { [campo]: antiga, ...resto } = l || {};
    return { ...resto, tem_palavra_passe: Boolean(l?.segredo_id || antiga) };
  });
}

/**
 * Pede a palavra-passe ao cofre (RPC cofre_revelar). Fica registado em audit_log
 * como "credencial_revelada". Só chamar quando o utilizador carrega em mostrar/copiar.
 * @param {"acessos_cliente"|"acessos"} tabela
 * @param {string|number} id id da linha
 * @returns {Promise<string>} a palavra-passe ("" se não houver)
 * @throws Error com mensagem legível se o RPC falhar (ex.: sem permissão)
 */
export async function revelarPalavraPasse(tabela, id) {
  const { data, error } = await supabase.rpc("cofre_revelar", { p_tabela: tabela, p_id: String(id) });
  if (error) throw new Error(error.message || "Não foi possível obter a palavra-passe.");
  return data || "";
}

/**
 * Guarda a palavra-passe no cofre (valor vazio = remover). RPC cofre_guardar.
 * @param {"acessos_cliente"|"acessos"} tabela
 * @param {string|number} id
 * @param {string} valor
 * @throws Error com mensagem legível
 */
export async function guardarPalavraPasse(tabela, id, valor) {
  const { error } = await supabase.rpc("cofre_guardar", { p_tabela: tabela, p_id: String(id), p_valor: valor ?? "" });
  if (error) throw new Error(error.message || "Não foi possível guardar a palavra-passe.");
}
