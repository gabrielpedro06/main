// Garante que o colaborador "picou o ponto" (assiduidade) antes de arrancar um
// cronómetro de tarefa. Usado pelas páginas de tarefas/projetos/atividades.

/**
 * Já existe registo de assiduidade hoje (data local) para o utilizador?
 * Em caso de erro devolve true para não bloquear o trabalho.
 * @param {object} supabase cliente Supabase
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
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

/**
 * Cria a entrada do dia em `assiduidade` com a hora atual e dispara o evento
 * `attendance-updated` (o WidgetAssiduidade ouve-o e atualiza o relógio).
 * Se o insert falhar porque outro separador já picou, conta como sucesso.
 * @param {object} supabase
 * @param {string} userId
 * @returns {Promise<boolean>} true se o dia ficou iniciado
 */
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
