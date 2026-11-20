// Dependências entre atividades/tarefas de um projeto:
//   atividades.depende_de_atividade_id, tarefas.depende_de_tarefa_id
// Um item fica bloqueado até a dependência estar "concluido", salvo se tiver
// ignorar_dependencia = true. Funções puras (não tocam no Supabase).
const normalizeId = (value) => {
    if (value === null || value === undefined) return null;
    const asString = String(value).trim();
    return asString || null;
};

const normalizeState = (estado) => String(estado || "").trim().toLowerCase();

export const isConcludedState = (estado) => normalizeState(estado) === "concluido";

/**
 * Índices por id para as funções abaixo.
 * @returns {{ activityById: Map<string, object>, taskById: Map<string, object> }}
 */
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

/** Motivo do bloqueio da atividade (texto para mostrar) ou null se pode avançar. */
export const getActivityBlockReason = (atividade, activityById) => {
    if (atividade?.ignorar_dependencia === true) return null;

    const dependencyId = normalizeId(atividade?.depende_de_atividade_id);
    if (!dependencyId) return null;

    const dependency = activityById?.get?.(dependencyId);
    if (!dependency) return null;

    if (isConcludedState(dependency.estado)) return null;

    return `Depende da atividade "${dependency.titulo || "sem titulo"}"`;
};

/**
 * Motivo do bloqueio da tarefa ou null. Verifica primeiro a atividade-mãe
 * (se a atividade está bloqueada, a tarefa também está) e depois a tarefa de que depende.
 */
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
