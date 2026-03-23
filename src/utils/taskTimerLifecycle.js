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
