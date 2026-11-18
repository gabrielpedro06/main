import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

const COLS = "user_id, medalhas(id, nome, data, descricao, imagem_url)";
const maisRecentes = (a, b) => String(b.data).localeCompare(String(a.data));

/** Medalhas de um colaborador (null = a carregar; [] = nenhuma ou módulo ainda não ativo). */
export function useMedalhas(userId) {
  const [res, setRes] = useState({ userId: null, lista: null });
  useEffect(() => {
    if (!userId) return undefined;
    let vivo = true;
    supabase
      .from("medalhas_colaboradores")
      .select(COLS)
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!vivo) return;
        const ms = error ? [] : (data || []).map((r) => r.medalhas).filter(Boolean);
        setRes({ userId, lista: ms.sort(maisRecentes) });
      });
    return () => { vivo = false; };
  }, [userId]);
  if (!userId) return [];
  return res.userId === userId ? res.lista : null;
}

/** Medalhas de vários colaboradores de uma vez: Map(user_id → medalhas, mais recente primeiro). */
export function useMedalhasEquipa(userIds) {
  const chave = [...new Set((userIds || []).filter(Boolean).map(String))].sort().join(",");
  const [mapa, setMapa] = useState(() => new Map());
  useEffect(() => {
    if (!chave) return undefined;
    let vivo = true;
    supabase
      .from("medalhas_colaboradores")
      .select(COLS)
      .in("user_id", chave.split(","))
      .then(({ data, error }) => {
        if (!vivo || error) return;
        const m = new Map();
        for (const r of data || []) {
          if (!r.medalhas) continue;
          const k = String(r.user_id);
          m.set(k, [...(m.get(k) || []), r.medalhas]);
        }
        m.forEach((lista) => lista.sort(maisRecentes));
        setMapa(m);
      });
    return () => { vivo = false; };
  }, [chave]);
  return mapa;
}
