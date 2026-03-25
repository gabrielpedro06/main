export async function concludeActivityWithChildren(supabase, atividadeId) {
  if (!supabase || !atividadeId) {
    return { error: new Error("Missing supabase client or atividadeId"), taskIds: [] };
  }

  const dataConclusao = new Date().toISOString();

  const { error: atividadeError } = await supabase
    .from("atividades")
    .update({ estado: "concluido" })
    .eq("id", atividadeId);

  if (atividadeError) {
    return { error: atividadeError, taskIds: [] };
  }

  const { data: tarefasData, error: tarefasFetchError } = await supabase
    .from("tarefas")
    .select("id")
    .eq("atividade_id", atividadeId);

  if (tarefasFetchError) {
    return { error: tarefasFetchError, taskIds: [] };
  }

  const taskIds = (tarefasData || []).map((t) => t.id).filter(Boolean);

  if (!taskIds.length) {
    return { error: null, taskIds: [] };
  }

  const { error: tarefasUpdateError } = await supabase
    .from("tarefas")
    .update({ estado: "concluido", data_conclusao: dataConclusao })
    .eq("atividade_id", atividadeId);

  if (tarefasUpdateError) {
    return { error: tarefasUpdateError, taskIds };
  }

  const { error: subtarefasUpdateError } = await supabase
    .from("subtarefas")
    .update({ estado: "concluido" })
    .in("tarefa_id", taskIds);

  if (subtarefasUpdateError) {
    return { error: subtarefasUpdateError, taskIds };
  }

  return { error: null, taskIds };
}
