// Manual de utilizador — Agenda. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "agenda",
  titulo: "Agenda",
  icone: "CalendarCheck",
  rota: "/dashboard/minhas-tarefas",
  papeis: undefined,
  resumo: "A Agenda é o teu quadro pessoal de tarefas. Reúne as tarefas em que és responsável ou em que foste incluído, organizadas por prazo, e permite criar tarefas avulsas, contar tempo e anexar documentos.",
  paginas: [
    {
      titulo: "Cabeçalho",
      texto: "Mostra quantas tarefas estão **atrasadas**, quantas são **para hoje** e quantas vêm **a seguir**. Se tens um cronómetro ligado, aparece o nome da tarefa e o botão **Parar**. À direita estão os botões **Histórico**, **Tempo manual** e **Adicionar tarefa**.",
    },
    {
      titulo: "Colunas do quadro",
      texto: "As tarefas estão em cinco colunas, conforme o prazo: **Atrasadas**, **Para hoje**, **Amanhã**, **Mais tarde** e **Sem data**. O número ao lado do título indica quantas tarefas tem cada coluna.",
    },
    {
      titulo: "Cartão de tarefa",
      texto: "Cada cartão mostra o título e pequenas etiquetas: quem te atribuiu a tarefa (**De** …), se tem notas, quantos documentos tem anexados e com quantos colegas está partilhada. O círculo serve para marcar como concluída e o botão de play liga o cronómetro. Carrega no título para abrir os detalhes.",
    },
    {
      titulo: "Adicionar avulsa",
      texto: "No fundo de cada coluna há um campo **Adicionar avulsa…** para criar rapidamente uma tarefa que não pertence a nenhum projeto.",
    },
    {
      titulo: "Detalhes da tarefa",
      texto: "A janela de detalhes tem o título, o **Responsável**, a **Data limite** (com atalhos **Hoje**, **Amanhã**, **Próx. semana** e **Sem data**), **Partilhar com**, **Documentos e entregáveis** e **Notas**. No topo vês o projeto a que pertence ou a indicação **Tarefa avulsa**.",
    },
    {
      titulo: "Histórico",
      texto: "O botão **Histórico** abre o **Arquivo de concluídas**, separado em **Esta Semana**, **Semana Passada** e **Mais Antigas**. Daqui podes restaurar uma tarefa ou apagá-la de vez.",
    },
  ],
  tarefas: [
    {
      titulo: "Como criar uma tarefa rápida",
      passos: [
        "Abre **Agenda** na barra lateral (grupo **PLANEAMENTO**).",
        "Carrega em **Adicionar tarefa**.",
        "Escreve o que vais fazer e carrega em **Enter**.",
      ],
      nota: "A tarefa fica sem data. Também podes escrever diretamente em **Adicionar avulsa…**, no fundo da coluna que quiseres.",
    },
    {
      titulo: "Como mudar o prazo de uma tarefa",
      passos: [
        "Arrasta o cartão para outra coluna (por exemplo, de **Sem data** para **Amanhã**).",
        "Em alternativa, carrega no título da tarefa, escolhe a **Data limite** e carrega em **Guardar**.",
      ],
    },
    {
      titulo: "Como marcar uma tarefa como concluída",
      passos: [
        "Carrega no círculo à esquerda do cartão (**Marcar como concluído**).",
        "A tarefa sai do quadro e passa para o **Histórico**.",
      ],
    },
    {
      titulo: "Como restaurar uma tarefa concluída",
      passos: [
        "Carrega em **Histórico**.",
        "Escolhe o separador do período certo.",
        "Carrega em **Restaurar** na tarefa pretendida.",
      ],
    },
    {
      titulo: "Como partilhar uma tarefa com colegas",
      passos: [
        "Carrega no título da tarefa para abrir os detalhes.",
        "Em **Partilhar com**, carrega no nome de cada colega que queres incluir.",
        "Carrega em **Guardar**.",
      ],
    },
    {
      titulo: "Como anexar um documento a uma tarefa",
      passos: [
        "Abre os detalhes da tarefa.",
        "Em **Documentos e entregáveis**, carrega em **Adicionar documento** (ou arrasta o ficheiro para essa zona).",
        "Dá um nome ao documento e, se quiseres, uma data limite.",
        "Carrega em **Guardar**.",
      ],
    },
    {
      titulo: "Como contar tempo numa tarefa",
      passos: [
        "Carrega no botão de play no cartão da tarefa.",
        "Quando acabares, carrega em **Parar** no cabeçalho (ou no botão de stop do cartão).",
        "Escreve uma nota, se quiseres, escolhe o estado da tarefa e carrega em **Guardar e parar**.",
      ],
      nota: "Se ainda não picaste o ponto, a app pergunta se o queres fazer antes de ligar o cronómetro.",
    },
    {
      titulo: "Como registar tempo à mão",
      passos: [
        "Carrega em **Tempo manual**.",
        "Escolhe o **Colaborador** e a **Tarefa**.",
        "Indica a **Duração** em minutos (ou carrega num dos atalhos).",
        "Carrega em **Registar tempo**.",
      ],
      nota: "Na mesma janela vês a lista de **Registos**, que podes editar ou apagar.",
    },
    {
      titulo: "Como apagar uma tarefa",
      passos: [
        "Abre os detalhes da tarefa.",
        "Carrega no ícone do caixote do lixo (**Apagar tarefa**).",
        "Confirma.",
      ],
      nota: "Esta ação não pode ser desfeita. Se só quiseres tirá-la do quadro, marca-a como concluída.",
    },
  ],
  faq: [
    {
      pergunta: "Que tarefas aparecem na minha Agenda?",
      resposta: "As tarefas por concluir em que és responsável ou em que foste incluído como colaborador, incluindo as tarefas avulsas que criaste.",
    },
    {
      pergunta: "Qual é a diferença entre uma tarefa avulsa e uma tarefa de projeto?",
      resposta: "A tarefa avulsa não pertence a nenhum projeto: é criada na Agenda para organizares o teu trabalho. As tarefas de projeto são criadas dentro de um projeto e mostram o nome do projeto no cartão.",
    },
    {
      pergunta: "Marquei uma tarefa como concluída por engano. Como a recupero?",
      resposta: "Abre o **Histórico** e carrega em **Restaurar** na tarefa.",
    },
    {
      pergunta: "Onde vejo feriados, aniversários e férias da equipa?",
      resposta: "Em **PLANEAMENTO** > **Calendário**, na barra lateral.",
    },
  ],
};
