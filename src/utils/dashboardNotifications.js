// Cria notificações internas (sino do Início) para um ou mais utilizadores.
// Apesar do nome, a tabela é public.notificacoes_projetos (serve para todos os tipos).

/**
 * Insere uma notificação por destinatário em `notificacoes_projetos` e dispara
 * o evento `project-notifications-updated` para o sino recarregar.
 *
 * @param {object} p
 * @param {object} p.supabaseClient cliente Supabase (passado para facilitar testes)
 * @param {string[]} p.recipientIds  ids de utilizador; duplicados/vazios são ignorados
 * @param {string|null} [p.createdBy] autor
 * @param {string} p.type    coluna `tipo` (ex.: "absence_status_changed"; ver TIPO em NotificationsPanel)
 * @param {string} p.title   coluna `titulo`
 * @param {string} p.message coluna `mensagem`
 * @param {string} [p.link="/dashboard/ferias"] rota aberta ao clicar
 * @throws erro do Supabase se o insert falhar
 */
export async function createDashboardNotifications({
    supabaseClient,
    recipientIds,
    createdBy = null,
    type,
    title,
    message,
    link = "/dashboard/ferias",
}) {
    const uniqueRecipientIds = [...new Set((recipientIds || []).filter(Boolean).map(String))];
    if (!supabaseClient || uniqueRecipientIds.length === 0) return;

    const payload = uniqueRecipientIds.map((userId) => ({
        user_id: userId,
        project_id: null,
        created_by: createdBy || null,
        tipo: type,
        titulo: title,
        mensagem: message,
        link,
        is_read: false,
    }));

    const { error } = await supabaseClient.from("notificacoes_projetos").insert(payload);
    if (error) throw error;

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("project-notifications-updated"));
    }
}
