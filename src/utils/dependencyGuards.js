const normalizeId = (value) => {
    if (value === null || value === undefined) return null;
    const asString = String(value).trim();
    return asString || null;
};

const normalizeState = (estado) => String(estado || "").trim().toLowerCase();

export const isConcludedState = (estado) => normalizeState(estado) === "concluido";

export const buildDependencyMaps = (atividades = [], tarefas = []) => {
    const activityById = new Map();
    const taskById = new Map();

    (atividades || []).forEach((atividade) => {
        const id = normalizeId(atividade?.id);
        if (!id) return;
        activityById.set(id, atividade);
    });

    (tarefas || []).forEach((tarefa) => {
        const id = normalizeId(tarefa?.id);
        if (!id) return;
        taskById.set(id, tarefa);
    });

    return { activityById, taskById };
};

export const getActivityBlockReason = (atividade, activityById) => {
    if (atividade?.ignorar_dependencia === true) return null;

    const dependencyId = normalizeId(atividade?.depende_de_atividade_id);
    if (!dependencyId) return null;

    const dependency = activityById?.get?.(dependencyId);
    if (!dependency) return null;

    if (isConcludedState(dependency.estado)) return null;

    return `Depende da atividade "${dependency.titulo || "sem titulo"}"`;
};

export const getTaskBlockReason = (tarefa, taskById, activityById) => {
    if (tarefa?.ignorar_dependencia === true) return null;

    const parentActivityId = normalizeId(tarefa?.atividade_id);
    if (parentActivityId) {
        const parentActivity = activityById?.get?.(parentActivityId);
        const parentActivityReason = getActivityBlockReason(parentActivity, activityById);
        if (parentActivityReason) {
            return parentActivityReason;
        }
    }

    const dependencyId = normalizeId(tarefa?.depende_de_tarefa_id);
    if (!dependencyId) return null;

    const dependency = taskById?.get?.(dependencyId);
    if (!dependency) return null;

    if (isConcludedState(dependency.estado)) return null;

    return `Depende da tarefa "${dependency.titulo || "sem titulo"}"`;
};
