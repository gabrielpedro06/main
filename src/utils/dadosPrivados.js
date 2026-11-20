import { supabase } from "../services/supabase";

// =====================================================================
// Dados pessoais sensíveis (migração 072): vivem em public.profiles_privado,
// que só o próprio e os RH conseguem ler. Estas funções juntam-nos ao perfil
// e separam-nos ao guardar. Se a tabela ainda não existir, usam profiles.
// =====================================================================

/**
 * Colunas que vivem em profiles_privado e não em profiles.
 * Ao acrescentar um campo sensível novo: migração + esta lista.
 */
export const CAMPOS_PRIVADOS = [
  "nif", "niss", "ncc", "validade_cc", "morada", "concelho", "estado_civil",
  "nacionalidade", "sexo", "nr_dependentes", "valor_sa",
];

const semTabela = (error) => error?.code === "42P01"
  || (/profiles_privado/.test(error?.message || "") && /does not exist|schema cache/i.test(error?.message || ""));

/** Junta os dados privados a uma lista de perfis (só os que a pessoa pode ver). */
export async function juntarPrivados(perfis) {
  const lista = Array.isArray(perfis) ? perfis : [];
  const ids = lista.map((p) => p?.id).filter(Boolean);
  if (!ids.length) return lista;
  const { data, error } = await supabase
    .from("profiles_privado")
    .select(["id", ...CAMPOS_PRIVADOS].join(", "))
    .in("id", ids);
  if (error) {
    if (!semTabela(error)) console.error("Erro ao ler dados privados:", error);
    return lista;
  }
  const porId = new Map((data || []).map((r) => [String(r.id), r]));
  return lista.map((p) => {
    const priv = porId.get(String(p.id));
    if (!priv) return p;
    const { id: _id, ...campos } = priv;
    return { ...p, ...campos };
  });
}

/** Igual a juntarPrivados, para um só perfil. */
export async function juntarPrivado(perfil) {
  if (!perfil?.id) return perfil;
  const [r] = await juntarPrivados([perfil]);
  return r;
}

/** Separa um payload de perfil em { publico, privado }. */
export function separarPrivados(payload) {
  const publico = {};
  const privado = {};
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (CAMPOS_PRIVADOS.includes(k)) privado[k] = v === "" ? null : v;
    else publico[k] = v;
  });
  return { publico, privado };
}

/**
 * Guarda os dados privados de uma pessoa. Devolve { error }.
 * Sem a tabela nova (migração por correr), grava em profiles como antes.
 */
export async function guardarPrivados(userId, privado) {
  if (!userId || !privado || !Object.keys(privado).length) return { error: null };
  const { error } = await supabase.from("profiles_privado").upsert({ id: userId, ...privado }, { onConflict: "id" });
  if (error && semTabela(error)) {
    return supabase.from("profiles").update(privado).eq("id", userId);
  }
  return { error };
}
