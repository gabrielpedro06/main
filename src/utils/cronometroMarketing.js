// =====================================================================
// Cronómetro das peças de Marketing (marketing_conteudos).
// Usa a MESMA tabela e as mesmas regras dos cronómetros das tarefas
// (task_logs, migração 082 acrescenta conteudo_id):
//   - cada pessoa só tem um cronómetro ativo (end_time null): começar este
//     termina o que estiver a correr (tarefa, atividade ou outra peça), depois
//     de perguntar;
//   - se ainda não picou o ponto hoje, pergunta se quer picar;
//   - aparece no widget de assiduidade e no Início (activeTimerResolver.js),
//     e fecha sozinho ao pausar/terminar o dia ou terminar sessão.
//
//   const crono = useCronometroMarketing(user?.id);
//   crono.tempoDe(conteudoId) → { total, meu, porPessoa, aCorrer: [{ user_id, start_time }] } (minutos)
//   crono.tempoDe([id1, id2…]) → o mesmo, somado (ex.: total de uma campanha)
//   crono.meuAtivo              → linha de task_logs a correr (ou null)
//   crono.iniciar(conteudo) / crono.parar()
// =====================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { closeAllActiveTaskLogsForUser } from "./taskTimerLifecycle";
import { resolveActiveTimerMeta } from "./activeTimerResolver";
import { hasAttendanceStartedToday, startAttendanceNow } from "./attendanceGuard";
import { confirmar } from "./dialogo";
import { toast } from "./toast";

const colunaEmFalta = (e) => /conteudo_id/i.test(e?.message || "") || e?.code === "42703" || e?.code === "PGRST204";

/** Minutos de um registo (a correr: até agora). */
export const minutosDe = (log, agora = Date.now()) => {
  if (log.end_time) return Number(log.duration_minutes) || 0;
  const ini = new Date(log.start_time).getTime();
  return Number.isFinite(ini) ? Math.max(0, (agora - ini) / 60000) : 0;
};

/** "2h 05m", "45m", "0m". */
export function formatarMinutos(min) {
  const m = Math.max(0, Math.floor(min || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${String(r).padStart(2, "0")}m` : `${r}m`;
}

/** "01:02:03" a partir de uma data de início (para o relógio a andar). */
export function relogio(inicio, agora = Date.now()) {
  const s = Math.max(0, Math.floor((agora - new Date(inicio).getTime()) / 1000));
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

const avisarMudanca = (reason) => window.dispatchEvent(new CustomEvent("task-logs-updated", { detail: { reason } }));

export function useCronometroMarketing(userId) {
  const [logs, setLogs] = useState([]); // task_logs com conteudo_id
  const [meuAtivo, setMeuAtivo] = useState(null); // o meu cronómetro a correr (de qualquer tipo)
  const [semColuna, setSemColuna] = useState(false);
  const [aMudar, setAMudar] = useState(false);

  const carregar = useCallback(async () => {
    if (!userId) return;
    const [r, a] = await Promise.all([
      supabase.from("task_logs")
        .select("id, user_id, conteudo_id, start_time, end_time, duration_minutes")
        .not("conteudo_id", "is", null)
        .order("start_time", { ascending: false })
        .limit(10000),
      supabase.from("task_logs").select("*").eq("user_id", userId).is("end_time", null)
        .order("start_time", { ascending: false }).limit(1),
    ]);
    if (r.error) {
      if (colunaEmFalta(r.error)) setSemColuna(true);
      else console.error("Cronómetro marketing:", r.error);
    } else {
      setSemColuna(false);
      setLogs(r.data || []);
    }
    setMeuAtivo(a.data?.[0] || null);
  }, [userId]);

  useEffect(() => {
    carregar();
    // Outras partes da app (assiduidade, tarefas, logout) mexem nos cronómetros
    const aoMudar = () => carregar();
    window.addEventListener("task-logs-updated", aoMudar);
    window.addEventListener("focus", aoMudar);
    return () => {
      window.removeEventListener("task-logs-updated", aoMudar);
      window.removeEventListener("focus", aoMudar);
    };
  }, [carregar]);

  /** Tempos agrupados por peça. */
  const porConteudo = useMemo(() => {
    const mapa = new Map();
    for (const l of logs) {
      let t = mapa.get(l.conteudo_id);
      if (!t) { t = { logs: [] }; mapa.set(l.conteudo_id, t); }
      t.logs.push(l);
    }
    return mapa;
  }, [logs]);

  /**
   * Totais de uma peça, em minutos (os que estão a correr contam até agora).
   * Devolve também `calcular(agora)` para os componentes recalcularem com o relógio a andar.
   */
  const tempoDe = useCallback((conteudoId, agora = Date.now()) => {
    // Aceita um id ou uma lista de ids (ex.: todas as peças de uma campanha)
    const ids = Array.isArray(conteudoId) ? conteudoId : [conteudoId];
    const lista = ids.flatMap((id) => porConteudo.get(id)?.logs || []);
    const calcular = (quando) => {
      const out = { total: 0, meu: 0, porPessoa: {} };
      for (const l of lista) {
        const m = minutosDe(l, quando);
        out.total += m;
        if (l.user_id === userId) out.meu += m;
        out.porPessoa[l.user_id] = (out.porPessoa[l.user_id] || 0) + m;
      }
      return out;
    };
    const aCorrer = lista.filter((l) => !l.end_time).map((l) => ({ user_id: l.user_id, start_time: l.start_time, meu: l.user_id === userId }));
    return { ...calcular(agora), aCorrer, calcular };
  }, [porConteudo, userId]);

  const parar = useCallback(async () => {
    if (!userId || aMudar) return;
    setAMudar(true);
    try {
      const inicio = meuAtivo?.start_time;
      const r = await closeAllActiveTaskLogsForUser(supabase, userId);
      if (r.errors?.length) throw r.errors[0];
      const min = inicio ? Math.max(1, Math.floor((Date.now() - new Date(inicio).getTime()) / 60000)) : null;
      toast(min ? `Tempo guardado: ${formatarMinutos(min)}.` : "Cronómetro parado.");
      avisarMudanca("marketing-stop");
      await carregar();
    } catch (e) {
      toast("Não foi possível parar o cronómetro: " + (e?.message || e), { tipo: "erro" });
    } finally {
      setAMudar(false);
    }
  }, [userId, aMudar, meuAtivo, carregar]);

  const iniciar = useCallback(async (conteudo) => {
    if (!userId || !conteudo?.id || aMudar) return;
    if (semColuna) {
      toast("Falta correr a migração 082 no Supabase para cronometrar o Marketing.", { tipo: "erro" });
      return;
    }
    if (meuAtivo?.conteudo_id === conteudo.id) return;

    // Já há outro cronómetro a correr (tarefa, atividade ou outra peça)?
    if (meuAtivo) {
      const meta = await resolveActiveTimerMeta(supabase, meuAtivo).catch(() => null);
      const ok = await confirmar("Já tens um cronómetro a correr", {
        mensagem: `«${meta?.title || "Tempo a decorrer…"}» vai ser terminado e o tempo fica guardado. Começar a cronometrar «${conteudo.titulo || "esta peça"}»?`,
        botao: "Trocar",
      });
      if (!ok) return;
    }

    // Ainda não picou o ponto hoje?
    if (!(await hasAttendanceStartedToday(supabase, userId))) {
      const picar = await confirmar("Ainda não picaste o ponto hoje", {
        mensagem: "Queres iniciar a picagem agora? O cronómetro começa na mesma.",
        botao: "Picar o ponto",
      });
      if (picar && !(await startAttendanceNow(supabase, userId))) {
        toast("Não foi possível picar o ponto agora. O cronómetro começa na mesma.", { tipo: "aviso" });
      }
    }

    setAMudar(true);
    try {
      await closeAllActiveTaskLogsForUser(supabase, userId);
      const { error } = await supabase.from("task_logs")
        .insert([{ user_id: userId, conteudo_id: conteudo.id, start_time: new Date().toISOString() }]);
      if (error) {
        if (colunaEmFalta(error)) {
          setSemColuna(true);
          toast("Falta correr a migração 082 no Supabase para cronometrar o Marketing.", { tipo: "erro" });
          return;
        }
        throw error;
      }
      toast("Cronómetro a correr.");
      avisarMudanca("marketing-start");
      await carregar();
    } catch (e) {
      toast("Não foi possível iniciar o cronómetro: " + (e?.message || e), { tipo: "erro" });
    } finally {
      setAMudar(false);
    }
  }, [userId, aMudar, semColuna, meuAtivo, carregar]);

  return { tempoDe, meuAtivo, iniciar, parar, aMudar, semColuna, recarregar: carregar };
}

/** Relógio que atualiza a cada segundo enquanto `ativo` (para mostrar o tempo a andar). */
export function useAgora(ativo, intervalo = 1000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ativo) return undefined;
    const t = setInterval(() => setAgora(Date.now()), intervalo);
    return () => clearInterval(t);
  }, [ativo, intervalo]);
  return agora;
}
