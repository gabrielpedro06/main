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
