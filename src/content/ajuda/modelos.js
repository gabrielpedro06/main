// Manual de utilizador — Modelos de Projetos. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "modelos",
  titulo: "Modelos de Projetos",
  icone: "ClipboardList",
  rota: "/dashboard/modelos",
  papeis: undefined,
  resumo: "Os modelos definem a estrutura base de cada tipo de projeto: etapas, tarefas e passos, com prazos e dependências. Quando crias um projeto, a estrutura do modelo é copiada para o projeto.",
  paginas: [
    {
      titulo: "Três colunas",
      texto: "A página tem três colunas. **1. Tipos de Projetos**: a lista de modelos. **2. Atividades**: as etapas do modelo escolhido. **3. Tarefas**: as tarefas da etapa escolhida, cada uma com os seus passos. Carrega num modelo e depois numa etapa para ver o conteúdo.",
    },
    {
      titulo: "Etiquetas",
      texto: "Num modelo, **Programa** quer dizer que o tipo de projeto requer programa de financiamento e **Formação** que é um projeto de formação. Numa etapa ou tarefa, **Nota** indica que tem guia ou notas e a seta (↳) mostra de que item depende.",
    },
    {
      titulo: "Contadores do topo",
      texto: "Mostram quantos **Modelos** existem, quantas **etapas** tem o modelo escolhido e o total de **dias previstos**.",
    },
  ],
  tarefas: [
    {
      titulo: "Como criar um modelo",
      passos: [
        "Abre **Modelos** na barra lateral (grupo **PRODUÇÃO**).",
        "Na coluna **1. Tipos de Projetos**, carrega em **Novo**.",
        "Escreve o **Nome**.",
        "Liga **Este tipo de projeto requer programa de financiamento** ou **É um projeto de Formação**, se for o caso.",
        "Se quiseres, preenche **Default Num Horas** e **Default Base (EUR/h)**.",
        "Carrega em **Guardar Alterações**.",
      ],
      nota: "Para ligar a opção do programa de financiamento, tem de existir pelo menos um programa ativo em **Programas/Avisos**.",
    },
    {
      titulo: "Como acrescentar etapas a um modelo",
      passos: [
        "Escolhe o modelo na coluna **1. Tipos de Projetos**.",
        "Na coluna **2. Atividades**, carrega em **Etapa**.",
        "Escreve o **Nome** e o **Prazo Previsto (Dias)**.",
        "Se quiseres, escreve instruções em **Guia / Notas** e escolhe em **Depende da Etapa** a etapa que tem de estar concluída antes.",
        "Carrega em **Guardar Alterações**.",
      ],
    },
    {
      titulo: "Como acrescentar tarefas e passos",
      passos: [
        "Escolhe a etapa na coluna **2. Atividades**.",
        "Na coluna **3. Tarefas**, carrega em **Tarefa**, preenche o **Nome** e o **Prazo Previsto (Dias)** e, se for preciso, **Depende da Tarefa (mesma etapa)**.",
        "Carrega em **Guardar Alterações**.",
        "Para acrescentar um passo a uma tarefa, carrega em **+ Passo** nessa tarefa.",
      ],
    },
    {
      titulo: "Como pedir informação adicional numa etapa ou tarefa",
      passos: [
        "Ao criar ou editar a etapa ou tarefa, liga **Exige informação adicional?**.",
        "Em **Campos necessários**, marca o que é preciso: **Valor do Investimento**, **Valor do Financiamento**, **Valor do Incentivo** ou **Data prevista de aprovação**.",
        "Carrega em **Guardar Alterações**.",
      ],
    },
    {
      titulo: "Como mudar a ordem",
      passos: [
        "Arrasta a etapa, tarefa ou passo para a nova posição.",
      ],
      nota: "Se a nova ordem deixar uma dependência sem sentido, a app remove-a e avisa-te.",
    },
    {
      titulo: "Como editar ou apagar um item",
      passos: [
        "Carrega no lápis (**Editar**) do item, altera e carrega em **Guardar Alterações**.",
        "Para apagar, carrega no caixote do lixo (**Apagar**) e confirma em **Sim, Apagar**.",
      ],
      nota: "Ao apagar, todos os sub-itens também são apagados. Não pode ser desfeito.",
    },
  ],
  faq: [
    {
      pergunta: "Se eu mudar um modelo, os projetos já criados mudam?",
      resposta: "Não. O modelo só é usado no momento em que o projeto é criado. Os projetos existentes alteram-se no próprio projeto.",
    },
    {
      pergunta: "Porque não consigo escolher uma etapa em Depende da Etapa?",
      resposta: "Só podes depender de etapas que estão antes na ordem. O mesmo vale para as tarefas, que só podem depender de tarefas anteriores da mesma etapa.",
    },
    {
      pergunta: "Para que servem os prazos previstos em dias?",
      resposta: "Ao criar um projeto, as datas de cada atividade, tarefa e passo são calculadas em sequência a partir destes dias.",
    },
  ],
};
