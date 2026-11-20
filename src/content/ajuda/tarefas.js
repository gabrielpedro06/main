// Manual de utilizador — Tarefas. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "tarefas",
  titulo: "Tarefas",
  icone: "ListChecks",
  rota: "/dashboard/tarefas",
  papeis: undefined,
  resumo: "Tarefas reúne o trabalho de todos os projetos num só sítio: atividades, tarefas e passos, organizados por projeto, por prazo ou por estado. Daqui também ligas o cronómetro e registas tempo.",
  paginas: [
    {
      titulo: "Cabeçalho",
      texto: "Mostra quantas tarefas estão **atrasadas**, quantas são **para hoje**, quantas estão **em curso** e quantas estão **abertas**. Se tens um cronómetro ligado, aparece o nome do item e o botão **Parar**. À direita estão **Tempo manual** e **Nova tarefa**.",
    },
    {
      titulo: "Barra de filtros",
      texto: "Usa **Procurar tarefa, atividade, projeto, cliente…** para encontrar um item. Liga **Concluídas** para ver também o que já está feito. Escolhe a vista: **Projetos**, **Prazos** ou **Estados**.",
    },
    {
      titulo: "Vista Projetos",
      texto: "Mostra os projetos com as suas atividades e tarefas, em árvore. Dentro de cada atividade podes acrescentar tarefas em **Adicionar tarefa (Enter)** e, em cada tarefa, passos em **Novo passo (Enter)**.",
    },
    {
      titulo: "Vista Prazos",
      texto: "Quadro com colunas por prazo: **Atrasadas**, **Hoje**, **Amanhã**, **Próximas**, **Sem prazo** e **Concluídas**.",
    },
    {
      titulo: "Vista Estados",
      texto: "Quadro com colunas por estado: **Pendente**, **Em curso**, **Em análise**, **Concluídas** e **Canceladas**.",
    },
    {
      titulo: "Cartões",
      texto: "Cada cartão mostra o estado, o prazo, o tempo gasto e, se houver, a etiqueta **Entregável**. O círculo marca como concluído, o play liga o cronómetro e o contador de passos mostra os passos da tarefa. Carrega no título para abrir os detalhes.",
    },
  ],
  tarefas: [
    {
      titulo: "Como criar uma tarefa num projeto",
      passos: [
        "Abre **Tarefas** na barra lateral (grupo **PLANEAMENTO**) e carrega em **Nova tarefa**.",
        "Escreve o **Título**.",
        "Em **Atividade / projeto**, escolhe a atividade onde a tarefa entra.",
        "Escolhe o **Responsável principal** e a **Prioridade**.",
        "Se mais pessoas vão trabalhar nela, marca-as em **Outros colaboradores envolvidos**.",
        "Preenche a **Data de início** e o **Prazo limite**.",
        "Carrega em **Criar**.",
      ],
      nota: "Para criar rapidamente, escreve o nome em **Adicionar tarefa** dentro da atividade e carrega em Enter.",
    },
    {
      titulo: "Como editar uma tarefa ou atividade",
      passos: [
        "Carrega no título do cartão.",
        "Altera o que precisas: responsável, colaboradores, datas, estado, notas.",
        "Carrega em **Guardar alterações**.",
      ],
      nota: "Na mesma janela, o caixote do lixo (**Apagar**) apaga o item depois de confirmares em **Sim, apagar**.",
    },
    {
      titulo: "Como concluir uma tarefa ou atividade",
      passos: [
        "Carrega no círculo do cartão.",
        "Para reabrir, liga **Concluídas**, encontra o item e carrega outra vez no círculo.",
      ],
      nota: "Ao concluir uma atividade, as tarefas dentro dela também ficam concluídas. Se for a última atividade do projeto, o projeto passa a **Concluído**.",
    },
    {
      titulo: "Como iniciar a próxima etapa de um projeto",
      passos: [
        "Quando concluis a última atividade de um projeto, aparece a janela **Projeto concluído**.",
        "Carrega em **Iniciar próxima etapa** para criar um projeto novo já preenchido com os dados deste (por exemplo, a gestão depois da candidatura).",
        "Revê os passos do novo projeto e carrega em **Concluir e Criar**.",
      ],
      nota: "Se não quiseres agora, carrega em **Agora não**.",
    },
    {
      titulo: "Como anexar um entregável",
      passos: [
        "Abre a tarefa carregando no título.",
        "Marca **Requer documento entregável**.",
        "Preenche o **Nome / tipo de documento** e a **Data p/ entrega**.",
        "Arrasta o ficheiro para a zona **Arrasta um ficheiro ou clica para escolher**, ou carrega nela para o escolher.",
        "Carrega em **Guardar alterações**.",
      ],
    },
    {
      titulo: "Como usar o cronómetro",
      passos: [
        "Carrega no play do cartão.",
        "Se ainda não picaste o ponto hoje, a app pergunta se queres picar agora.",
        "Se tinhas outro cronómetro ligado, confirma se o queres terminar.",
        "Para parar, carrega em **Parar** no cabeçalho (ou no botão do cartão). Escreve uma nota se quiseres, escolhe o novo estado e carrega em **Guardar e parar**.",
      ],
      nota: "Carrega no nome do cronómetro no cabeçalho para ires direto ao item em curso.",
    },
    {
      titulo: "Como registar tempo à mão",
      passos: [
        "Carrega em **Tempo manual**.",
        "Escolhe o **Colaborador** e indica o **Tempo** em minutos.",
        "Em **Onde registar**, escolhe **Atividade**, **Tarefa** ou **Passo** e depois o **Item**.",
        "Carrega em **Guardar**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Porque não vejo as tarefas de toda a equipa?",
      resposta: "Só vês as atividades e tarefas em que és responsável ou em que foste incluído. Os administradores e gestores veem tudo e podem filtrar por cliente e por projeto.",
    },
    {
      pergunta: "Posso filtrar por cliente ou por projeto?",
      resposta: "Sim. Aparecem dois filtros na barra: **Todos os clientes** e **Todos os projetos**.",
      papeis: ["admin", "administrador", "gestor"],
    },
    {
      pergunta: "As tarefas avulsas aparecem aqui?",
      resposta: "Não. Aqui só aparecem tarefas de projetos. As tarefas avulsas estão na **Agenda**.",
    },
    {
      pergunta: "Onde vejo e organizo todas as atividades de um projeto?",
      resposta: "Abre o projeto em **Projetos** e vai ao separador **Atividades**. Aí também mudas a ordem, repetes blocos e apagas atividades.",
    },
  ],
};
