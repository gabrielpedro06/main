import { supabase } from "../services/supabase";

// =====================================================================
// Cofre de palavras-passe (migração 072, Supabase Vault).
// As listas nunca trazem a palavra-passe: pede-se ao cofre quando é preciso
// (mostrar ou copiar) e cada pedido fica no histórico de atividade.
//   tabela: "acessos_cliente" (Clientes) | "acessos" (Ativos TI)
// =====================================================================

const CAMPO_ANTIGO = { acessos_cliente: "codigo", acessos: "password" };

/** Tira a palavra-passe antiga das linhas e marca se há uma guardada. */
export function semPalavraPasse(linhas, tabela) {
  const campo = CAMPO_ANTIGO[tabela];
  return (linhas || []).map((l) => {
    const { [campo]: antiga, ...resto } = l || {};
    return { ...resto, tem_palavra_passe: Boolean(l?.segredo_id || antiga) };
  });
}

export async function revelarPalavraPasse(tabela, id) {
  const { data, error } = await supabase.rpc("cofre_revelar", { p_tabela: tabela, p_id: String(id) });
  if (error) throw new Error(error.message || "Não foi possível obter a palavra-passe.");
  return data || "";
}

/** Guarda a palavra-passe no cofre (valor vazio = remover). */
export async function guardarPalavraPasse(tabela, id, valor) {
  const { error } = await supabase.rpc("cofre_guardar", { p_tabela: tabela, p_id: String(id), p_valor: valor ?? "" });
  if (error) throw new Error(error.message || "Não foi possível guardar a palavra-passe.");
}
