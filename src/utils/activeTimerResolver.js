const getSingle = (value) => (Array.isArray(value) ? value[0] : value);

const getClientDisplayName = (client) => {
  if (!client) return "";
  return client.sigla?.trim() || client.marca || "";
};

const buildActiveTimerTitle = ({ clientName, projectName, itemTitle }) => {
  const prefix = [clientName, projectName].filter(Boolean).join(" - ");
  if (prefix && itemTitle) return `${prefix} - ${itemTitle}`;
  if (itemTitle) return itemTitle;
  return "Tempo a decorrer...";
};

export async function resolveActiveTimerMeta(supabase, activeLog) {
  if (!activeLog) {
    return {
      title: "",
      route: "",
      projectId: null,
      locationLabel: ""
    };
  }

  let projectId = activeLog.projeto_id || null;
  let clientName = "";
  let projectName = "";
  let itemTitle = "Tempo a decorrer...";

  if (activeLog.subtarefa_id) {
    const { data } = await supabase
      .from("subtarefas")
      .select("titulo, tarefas(atividades(projeto_id, titulo, projetos(id, titulo, clientes(marca, sigla))))")
      .eq("id", activeLog.subtarefa_id)
      .maybeSingle();

    const task = getSingle(data?.tarefas);
    const activity = getSingle(task?.atividades);
    const project = getSingle(activity?.projetos);

    itemTitle = data?.titulo || itemTitle;
    projectId = project?.id || activity?.projeto_id || projectId;
    projectName = project?.titulo || "";
    clientName = getClientDisplayName(getSingle(project?.clientes));
  } else if (activeLog.task_id || activeLog.tarefa_id) {
    const taskId = activeLog.task_id || activeLog.tarefa_id;
    const { data } = await supabase
      .from("tarefas")
      .select("titulo, atividades(projeto_id, titulo, projetos(id, titulo, clientes(marca, sigla)))")
      .eq("id", taskId)
      .maybeSingle();

    const activity = getSingle(data?.atividades);
    const project = getSingle(activity?.projetos);

    itemTitle = data?.titulo || itemTitle;
    projectId = project?.id || activity?.projeto_id || projectId;
    projectName = project?.titulo || "";
    clientName = getClientDisplayName(getSingle(project?.clientes));
  } else if (activeLog.atividade_id) {
    const { data } = await supabase
      .from("atividades")
      .select("titulo, projeto_id, projetos(id, titulo, clientes(marca, sigla))")
      .eq("id", activeLog.atividade_id)
      .maybeSingle();

    const project = getSingle(data?.projetos);

    itemTitle = data?.titulo || itemTitle;
    projectId = project?.id || data?.projeto_id || projectId;
    projectName = project?.titulo || "";
    clientName = getClientDisplayName(getSingle(project?.clientes));
  } else if (activeLog.projeto_id) {
    const { data } = await supabase
      .from("projetos")
      .select("id, titulo, clientes(marca, sigla)")
      .eq("id", activeLog.projeto_id)
      .maybeSingle();

    itemTitle = data?.titulo || "Projeto em curso";
    projectId = data?.id || projectId;
    projectName = data?.titulo || "";
    clientName = getClientDisplayName(getSingle(data?.clientes));
  }

  const title = buildActiveTimerTitle({ clientName, projectName, itemTitle });

  let route = "/dashboard/tarefas";
  if (projectId) {
    route = `/dashboard/projetos/${projectId}`;
  } else if (activeLog.atividade_id) {
    route = "/dashboard/atividades";
  } else if (activeLog.task_id || activeLog.tarefa_id || activeLog.subtarefa_id) {
    route = "/dashboard/minhas-tarefas";
  }

  const locationLabel = [clientName, projectName].filter(Boolean).join(" - ");

  return {
    title,
    route,
    projectId,
    locationLabel
  };
}
