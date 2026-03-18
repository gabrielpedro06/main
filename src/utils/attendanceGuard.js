export async function hasAttendanceStartedToday(supabase, userId) {
  if (!supabase || !userId) return true;

  const today = new Date().toLocaleDateString("en-CA");
  const { data, error } = await supabase
    .from("assiduidade")
    .select("id")
    .eq("user_id", userId)
    .eq("data_registo", today)
    .limit(1);

  if (error) {
    console.error("Erro ao verificar picagem do dia:", error);
    return true;
  }

  return Array.isArray(data) && data.length > 0;
}

export async function startAttendanceNow(supabase, userId) {
  if (!supabase || !userId) return false;

  const now = new Date();
  const horaAtual = now.toLocaleTimeString("pt-PT", { hour12: false });
  const dataAtual = now.toLocaleDateString("en-CA");

  const { error } = await supabase.from("assiduidade").insert([
    {
      user_id: userId,
      data_registo: dataAtual,
      hora_entrada: horaAtual,
      tempo_pausa_acumulado: 0,
      tarefas_planeadas: JSON.stringify([])
    }
  ]);

  if (error) {
    const alreadyStarted = await hasAttendanceStartedToday(supabase, userId);
    if (alreadyStarted) {
      window.dispatchEvent(new Event("attendance-updated"));
      return true;
    }

    console.error("Erro ao iniciar picagem:", error);
    return false;
  }

  window.dispatchEvent(new Event("attendance-updated"));
  return true;
}
