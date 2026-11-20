// Manual de utilizador — Programas e Avisos. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "programas-avisos",
  titulo: "Programas e Avisos",
  icone: "Megaphone",
  rota: "/dashboard/avisos",
  papeis: undefined,
  resumo: "Aqui geres os programas de financiamento e os respetivos avisos, com as fases e os prazos de candidatura. Os projetos usam esta informação para trazer as fases do aviso.",
  paginas: [
    {
      titulo: "Cabeçalho",
      texto: "Mostra os separadores **Ativos** e **Inativos**, quantos **avisos em uso** existem e quantos **prazos nos próximos 30 dias**. O botão **Novo Programa** cria um programa.",
    },
    {
      titulo: "Próximos prazos",
      texto: "A faixa **Próximos prazos** mostra as fases que terminam **nos próximos 60 dias**. Carrega num prazo para abrir o aviso.",
    },
    {
      titulo: "Lista de programas",
      texto: "Usa **Procurar por Programa, Sigla ou Código…** e alterna entre **Cards** e **Lista**. Cada programa mostra a **Entidade Financiadora**, o **Incentivo (%)**, o **Investimento Mínimo (€)**, os **Avisos Associados** e o **Próximo prazo**. Os botões são **Ver Detalhes**, **Editar Programa** e **Arquivar (Mover para Inativos)**; nos inativos aparece **Reativar programa**.",
    },
    {
      titulo: "Ficha do programa",
      texto: "Tem as secções **Identificação Geral**, **Condições Financeiras & Geográficas**, **Avisos Associados**, **Textos de Enquadramento** e **Estado do Programa** (**Ativo** ou **Inativo**).",
    },
  ],
  tarefas: [
    {
      titulo: "Como criar um programa",
      passos: [
        "Abre **Programas/Avisos** na barra lateral (grupo **COMERCIAL**) e carrega em **Novo Programa**.",
        "Em **Identificação Geral**, preenche o **Nome do Programa**, a **Sigla / Código** e escolhe a **Entidade Financiadora**.",
        "Em **Condições Financeiras & Geográficas**, preenche o **Incentivo (%)**, o **Tipo de Incentivo**, o **Investimento Mínimo (€)** e a **Área Geográfica**.",
        "Se quiseres, preenche os **Textos de Enquadramento**: **Objetivos**, **Entidades Elegíveis**, **Ações Elegíveis**, **Condições Específicas** e **Descrição Completa**.",
        "Carrega em **Criar Programa**.",
      ],
      nota: "A **Entidade Financiadora** tem de estar registada em **Entidades** como organismo.",
    },
    {
      titulo: "Como associar um aviso a um programa",
      passos: [
        "Abre o programa com **Editar Programa**.",
        "Em **Avisos Associados**, carrega em **Adicionar Aviso**.",
        "Escolhe um aviso em **Selecione um aviso existente da lista…**.",
        "Ou, para um aviso novo, carrega em **Criar Novo de Raiz**, escreve o **Código do Novo Aviso** e preenche as **Fases & Prazos do Novo Aviso** (usa **+ Adicionar Fase** para mais fases).",
        "Carrega em **Atualizar Programa**.",
      ],
    },
    {
      titulo: "Como alterar as fases e prazos de um aviso",
      passos: [
        "Abre o programa com **Editar Programa**.",
        "No aviso, carrega em **Editar/Gerir este aviso**.",
        "Em **Fases & Datas de Limite**, muda o nome ou a data de cada fase. Usa **+ Adicionar Fase** ou **Remover fase**.",
        "Carrega em **Gravar Alterações**.",
      ],
      nota: "Também podes abrir o aviso carregando num prazo em **Próximos prazos**.",
    },
    {
      titulo: "Como retirar um aviso de um programa",
      passos: [
        "Abre o programa com **Editar Programa**.",
        "No aviso, carrega em **Remover aviso do programa**.",
        "Carrega em **Atualizar Programa**.",
      ],
    },
    {
      titulo: "Como arquivar ou reativar um programa",
      passos: [
        "Carrega em **Arquivar (Mover para Inativos)** e confirma.",
        "Para o recuperar, abre o separador **Inativos** e carrega em **Reativar programa**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Abri um programa e não consigo mudar nada. Porquê?",
      resposta: "Abriste com **Ver Detalhes**, que é só de consulta. Carrega em **Editar** no fundo da janela.",
    },
    {
      pergunta: "Se mudar os prazos de um aviso, os projetos existentes mudam?",
      resposta: "Não. As fases são copiadas para o projeto quando o crias com esse aviso, e cada projeto fica com a sua própria cópia.",
    },
    {
      pergunta: "Um programa arquivado continua disponível nos projetos?",
      resposta: "Não aparece para escolher em projetos novos. Os projetos que já o usam mantêm-no.",
    },
  ],
};
