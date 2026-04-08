export async function closeAllActiveTaskLogsForUser(supabase, userId, options = {}) {
  if (!supabase || !userId) {
    return { closedCount: 0, errors: [] };
  }

  const stopTimestamp = new Date().toISOString();
  const note = typeof options.note === "string" ? options.note.trim() : "";

  const { data: activeLogs, error: fetchError } = await supabase
    .from("task_logs")
    .select("id, start_time")
    .eq("user_id", userId)
    .is("end_time", null);

  if (fetchError) {
    return { closedCount: 0, errors: [fetchError] };
  }

  if (!Array.isArray(activeLogs) || activeLogs.length === 0) {
    return { closedCount: 0, errors: [] };
  }

  let closedCount = 0;
  const errors = [];

  await Promise.all(
    activeLogs.map(async (log) => {
      const startMs = new Date(log.start_time).getTime();
      const nowMs = new Date(stopTimestamp).getTime();
      const diffMins = Number.isFinite(startMs)
        ? Math.max(1, Math.floor((nowMs - startMs) / 60000))
        : 1;

      const payload = {
        end_time: stopTimestamp,
        duration_minutes: diffMins,
      };

      if (note) {
        payload.observacoes = note;
      }

      let { error } = await supabase
        .from("task_logs")
        .update(payload)
        .eq("id", log.id);

      if (error && note) {
        const retry = await supabase
          .from("task_logs")
          .update({ end_time: stopTimestamp, duration_minutes: diffMins })
          .eq("id", log.id);
        error = retry.error;
      }

      if (error) {
        errors.push(error);
        return;
      }

      closedCount += 1;
    })
  );

  return { closedCount, errors };
}

function normalizeEstado(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "manter") return "";
  return raw.replace(/\s+/g, "_");
}

function normalizeDestino(value) {
  const raw = String(value || "").trim().toLowerCase();
  const allowed = new Set(["proprio", "colega", "cliente", "contabilista", "organismo"]);
  return allowed.has(raw) ? raw : "proprio";
}

function normalizeOptionalId(value) {
  const raw = String(value || "").trim();
  return raw || "";
}

function parsePgArrayLiteral(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [];

  return trimmed
    .slice(1, -1)
    .split(",")
    .map((part) => part.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    const parsedLiteral = parsePgArrayLiteral(value);
    if (parsedLiteral.length > 0) return parsedLiteral;

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      // No-op.
    }
  }
  return [];
}

function resolveLogTarget(logEntry) {
  if (!logEntry) return null;
  if (logEntry.task_id || logEntry.tarefa_id) {
    return { table: "tarefas", id: logEntry.task_id || logEntry.tarefa_id };
  }
  if (logEntry.atividade_id) {
    return { table: "atividades", id: logEntry.atividade_id };
  }
  if (logEntry.subtarefa_id) {
    return { table: "subtarefas", id: logEntry.subtarefa_id };
  }
  if (logEntry.projeto_id) {
    return { table: "projetos", id: logEntry.projeto_id };
  }
  return null;
}

function buildAnalysisPayload(nextStatus, statusMeta = {}) {
  if (nextStatus !== "em_analise") return {};

  const destination = normalizeDestino(statusMeta.analysisDestination);
  const destinationUserId = normalizeOptionalId(statusMeta.analysisDestinationUserId);
  const isColleague = destination === "colega";

  const payload = {
    analise_destino: destination,
    analise_data_envio: new Date().toISOString(),
    analise_data_retorno: null,
    analise_destino_user_id: isColleague ? destinationUserId || null : null,
    analise_alerta_pendente: isColleague && Boolean(destinationUserId),
  };

  const dueDate = String(statusMeta.analysisExpectedDate || "").trim();
  payload.analise_data_prevista = dueDate || null;
  return payload;
}

export async function applyStopStatusUpdateForLogTarget(supabase, logEntry, statusMeta = {}) {
  if (!supabase || !logEntry) return { applied: false, skipped: true, reason: "missing-input" };

  const target = resolveLogTarget(logEntry);
  if (!target?.table || !target?.id) return { applied: false, skipped: true, reason: "missing-target" };

  const nextStatus = normalizeEstado(statusMeta.nextStatus);
  if (!nextStatus) return { applied: false, skipped: true, reason: "keep-current" };

  const payload = { estado: nextStatus };

  if (nextStatus === "concluido" && target.table === "tarefas") {
    payload.data_conclusao = new Date().toISOString();
  }

  const supportsAnalysisFields = target.table === "tarefas" || target.table === "atividades";

  let currentRow = null;
  if (supportsAnalysisFields) {
    const { data, error: readError } = await supabase
      .from(target.table)
      .select("estado, analise_data_envio, analise_data_retorno, colaboradores_extra")
      .eq("id", target.id)
      .maybeSingle();

    if (readError && readError.code !== "42703") {
      return { applied: false, skipped: false, error: readError };
    }

    currentRow = data || null;

    const currentEstado = normalizeEstado(currentRow?.estado);
    const wasInAnalysis = currentEstado === "em_analise";
    const leavingAnalysis = wasInAnalysis && nextStatus !== "em_analise";

    if (nextStatus === "em_analise") {
      const analysisPayload = buildAnalysisPayload(nextStatus, statusMeta);
      Object.assign(payload, analysisPayload);

      if (analysisPayload.analise_destino === "colega" && analysisPayload.analise_destino_user_id) {
        const currentCollaborators = toArray(currentRow?.colaboradores_extra);
        const normalizedTarget = String(analysisPayload.analise_destino_user_id);
        if (!currentCollaborators.some((id) => String(id) === normalizedTarget)) {
          payload.colaboradores_extra = [...currentCollaborators, normalizedTarget];
        }
      }
    } else if (leavingAnalysis && !currentRow?.analise_data_retorno) {
      payload.analise_data_retorno = new Date().toISOString();
      payload.analise_alerta_pendente = false;
    }
  }

  let { error } = await supabase
    .from(target.table)
    .update(payload)
    .eq("id", target.id);

  // If migration is not applied yet, keep flow alive by updating only estado.
  if (error && supportsAnalysisFields && error.code === "42703") {
    const fallback = await supabase
      .from(target.table)
      .update({ estado: nextStatus })
      .eq("id", target.id);
    error = fallback.error;
  }

  if (error) return { applied: false, skipped: false, error };
  return { applied: true, skipped: false, targetTable: target.table, targetId: target.id, nextStatus };
}
