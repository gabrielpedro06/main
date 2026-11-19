// Textos legíveis para o registo de auditoria (audit_log): usados nos Registos e no Admin

/** Nomes legíveis das tabelas (as que não estiverem aqui aparecem pelo nome técnico) */
export const TABELAS = {
  projetos: "Projetos", tarefas: "Tarefas", subtarefas: "Subtarefas", atividades: "Atividades",
  task_logs: "Registos de tempo", assiduidade: "Assiduidade", ferias: "Férias", vacation_balances: "Saldo de férias",
  profiles: "Utilizadores", profiles_privado: "Dados pessoais (privados)", profile_empresas: "Empresas do utilizador", clientes: "Clientes", contactos_cliente: "Contactos de cliente",
  moradas_cliente: "Moradas de cliente", caes_cliente: "CAEs de cliente", acessos: "Acessos", acessos_cliente: "Acessos de cliente",
  tipos_acessos: "Tipos de acesso", projeto_entidades: "Entidades do projeto", tipos_projeto: "Tipos de projeto",
  template_tarefas: "Modelos de tarefas", template_atividades: "Modelos de atividades", template_subtarefas: "Modelos de subtarefas",
  propostas_comerciais: "Propostas comerciais", proposta_cursos: "Cursos da proposta", programas_financiamento: "Programas de financiamento",
  pedidos_reembolso: "Pedidos de reembolso", rh_anexos: "Anexos RH", rh_settings: "Definições RH",
  avisos: "Avisos", forum_posts: "Fórum: publicações", forum_comments: "Fórum: comentários", forum_reactions: "Fórum: reações",
  forum_comment_likes: "Fórum: gostos", forum_media: "Fórum: ficheiros", chat_rooms: "Chat: salas", chat_participants: "Chat: participantes",
  documents: "Documentos", documentos: "Documentos", equipamentos: "Equipamentos", software: "Software",
  cursos: "Cursos", formacoes: "Formações", acoes_formacao: "Ações de formação", acoes_formacao_checklist: "Checklist das ações",
  areas_formacao: "Áreas de formação", homologacoes_formacao: "Homologações", entidade_configuracoes: "Configurações da entidade",
  transfergest_registos: "TransferGest", app_settings: "Definições da aplicação", agenda: "Agenda",
  marketing_marcas: "Marketing: marcas", marketing_conteudos: "Marketing: conteúdos", marketing_personas: "Marketing: personas",
  marketing_ciclos: "Marketing: estratégia", marketing_recursos: "Marketing: recursos", marketing_leads: "Leads", marketing_prospects: "Prospects",
  medalhas: "Medalhas", medalhas_colaboradores: "Medalhas atribuídas",
};
export const nomeTabela = (t) => TABELAS[t] || t || "—";

export const VERBO = { INSERT: "criou", UPDATE: "alterou", DELETE: "eliminou", EVENTO: "" };
export const EVENTOS = { login: "entrou na aplicação", logout: "saiu da aplicação", exportar_registos: "exportou o registo de atividade",
  exportacao: "exportou dados para Excel/CSV",
  sessao_expirada: "teve a sessão terminada (2FA expirado)", acesso_negado: "tentou entrar com a conta desativada",
  mfa_reposto: "repôs o MFA de um colaborador", credencial_revelada: "viu ou copiou uma palavra-passe do cofre", colaborador_desativado: "desativou um colaborador",
  colaborador_reativado: "reativou um colaborador", contas_inativas_bloqueadas: "bloqueou as contas inativas",
};

/** Nome legível do registo (título, nome…) a partir dos dados guardados */
export const rotuloRegisto = (r) => {
  const d = r.dados_depois || r.dados_antes || {};
  return d.titulo || d.nome || d.name || d.title || d.assunto || d.designacao || d.descricao || d.email || null;
};
