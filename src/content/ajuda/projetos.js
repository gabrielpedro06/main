// Manual de utilizador — Projetos. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "projetos",
  titulo: "Projetos",
  icone: "Rocket",
  rota: "/dashboard/projetos",
  papeis: undefined,
  resumo: "Em Projetos vês a carteira de projetos dos clientes e crias projetos novos. Dentro de cada projeto organizas as atividades, tarefas e passos, contas o tempo, acompanhas os pedidos de reembolso e geras o relatório em PDF.",
  paginas: [
    {
      titulo: "Cabeçalho da página",
      texto: "Mostra quantos projetos estão **ativos**, **em atraso**, quantos **terminam em 7 dias** e quantos estão **em curso**. Escolhe o âmbito: **Os meus** (só os projetos onde estás), **Empresa** (todos) ou **Vista geral** (tabela financeira). O botão **Novo projeto** abre o assistente de criação. Se tens um cronómetro ligado, aparece aqui com o botão **Parar**.",
    },
    {
      titulo: "Navegar pela carteira",
      texto: "Escolhe por onde começar: **Tipos**, **Estados** ou **Programas**. Carrega num cartão para abrir a lista de projetos e usa **Voltar** para regressar. A caixa **Procurar projeto, código ou cliente…** procura em toda a carteira. Liga **Arquivados** para ver também os projetos encerrados ou cancelados. Alterna entre **Cartões** e **Lista**.",
    },
    {
      titulo: "Cartão de projeto",
      texto: "Cada cartão mostra o nome, o código, o cliente, o responsável, o prazo e, quando há investimento, a **Taxa de execução**. O botão de play liga o cronómetro e o lápis (**Editar projeto**) abre a ficha para editar. Carrega no cartão para abrir o detalhe do projeto.",
    },
    {
      titulo: "Vista geral",
      texto: "Tabela com todos os projetos agrupados por programa. Tem três vistas: **Overview**, **Investimento** e **Incentivo** (estas duas mostram os pedidos de reembolso mês a mês). Filtra por tipo, programa, estado ou entidade e usa **Limpar filtros** para recomeçar. Exporta com **Exportar CSV** ou **Exportar PDF**. A etiqueta **+3 meses** avisa que já passaram 3 meses desde o último pedido de reembolso; **Datas a retificar** avisa que a data de início é posterior à data de fim.",
    },
    {
      titulo: "Detalhe do projeto",
      texto: "No topo vês o estado, o código, o tipo, as entidades (carrega numa para abrir a ficha da entidade), o organismo, o **Responsável**, a **Deadline final**, o **Tempo registado** e os **Blocos de atividades**. O círculo mostra a percentagem de tarefas concluídas. Usa **Portfólio** para voltar à lista e **Gerar PDF** para o relatório do projeto.",
    },
    {
      titulo: "Separadores do projeto",
      texto: "**Atividades**: blocos de atividades, tarefas e passos. **Gantt**: cronograma com janela **Neste mes**, **2 meses**, **6 meses** ou **Total**, que podes exportar em PDF. **Seguimento**: percurso do projeto (Pendente, Em curso, Em análise, Concluído, Encerrado) e o histórico de mudanças de estado. **Relatório de tempos**: tempo gasto por colaborador e por atividade. **Execução financeira**: valores por entidade e pedidos de reembolso. **Configurações e dados**: a ficha do projeto, arquivar ou apagar.",
    },
    {
      titulo: "Estados do projeto",
      texto: "Um projeto pode estar **Pendente**, **Em Curso**, **Em Análise**, **Concluído**, **Encerrado** ou **Cancelado**. Os projetos **Encerrado** e **Cancelado** saem das listas normais e não aceitam cronómetro.",
    },
  ],
  tarefas: [
    {
      titulo: "Como criar um projeto",
      passos: [
        "Abre **Projetos** na barra lateral (grupo **PRODUÇÃO**) e carrega em **Novo projeto**.",
        "Passo **Base & Entidade**: escolhe o **Tipo de Projeto (Modelo)**, o **Responsável Global**, escreve o **Título do Projeto** e escolhe a **Entidade Lider**. Se o projeto tiver várias entidades, escolhe **Parceria (Vários Clientes/Entidades)** e acrescenta as **Entidades Parceiras**.",
        "Carrega em **Seguinte**.",
        "Passo **Organismo & Equipa**: em **Envolve Entidade Financiadora?** escolhe **Sim** se houver organismo, e escolhe o **Organismo Lider / Principal** e a **Pessoa do Organismo**. Marca os **Colaboradores Internos** que vão trabalhar no projeto.",
        "Passo **Planeamento**: escolhe o **Programa** e o **Aviso**, preenche o **Código de Projeto**, o **Número do Projeto**, a **Data Início Base** e a **Data Fim**. As **Fases do Projeto** vêm do aviso.",
        "Passo **Atividades**: revê a estrutura que vem do modelo e desmarca o que não se aplica a este projeto.",
        "Passo **Finanças & Notas**: preenche o **Investimento elegível (€)** e o **Incentivo (€)** (por entidade, se for parceria), a **Descrição Geral**, as **Observações Internas** e o **Estado do Projeto**.",
        "Carrega em **Concluir e Criar**. O projeto abre logo no detalhe.",
      ],
      nota: "Nos projetos de formação não aparecem os campos do organismo, do programa nem dos valores de investimento.",
    },
    {
      titulo: "Como editar os dados de um projeto",
      passos: [
        "Abre o projeto e vai ao separador **Configurações e dados**.",
        "Carrega em **Editar ficha**.",
        "Altera o que precisas: nome, estado, entidades, organismo, equipa, datas, programa e aviso, notas.",
        "Carrega em **Gravar**. Para desistir, carrega em **Cancelar**.",
      ],
      nota: "Também podes carregar no lápis **Editar projeto** no cartão do projeto, na lista de projetos.",
    },
    {
      titulo: "Como mudar a equipa do projeto",
      passos: [
        "Abre o projeto e vai a **Configurações e dados**.",
        "Carrega em **Editar ficha**.",
        "Muda o **Responsável global** e marca ou desmarca as pessoas em **Equipa interna** e **Pessoas das entidades**.",
        "Carrega em **Gravar**.",
      ],
      nota: "Para mudar quem trabalha numa atividade ou tarefa concreta, abre-a e muda o responsável e os **Outros Colaboradores Envolvidos**.",
    },
    {
      titulo: "Como ver ou alterar os prazos das fases",
      passos: [
        "Ao criar o projeto, no passo **Planeamento**, escolhe o **Programa** e o **Aviso**. As fases do aviso aparecem em **Fases do Projeto**.",
        "Ajusta o **Nome da fase** e a **Data de término** se for preciso.",
        "Depois de criado, vês as fases em **Configurações e dados**, no cartão **Programa e aviso**.",
      ],
      nota: "As fases servem só de referência. Não mudam as datas do projeto.",
    },
    {
      titulo: "Como adicionar atividades, tarefas e passos",
      passos: [
        "Abre o projeto no separador **Atividades**.",
        "Para uma atividade nova: no fundo, escreve em **Nome de um novo bloco de atividades…**, escolhe o responsável se quiseres e carrega em **Criar bloco**.",
        "Para uma tarefa nova: dentro da atividade, escreve em **Adicionar tarefa (Enter)…** e carrega em Enter.",
        "Para um passo novo: na tarefa, carrega no **+** (ou em **Novo passo**), escreve o nome e carrega em Enter.",
      ],
    },
    {
      titulo: "Como editar uma atividade ou tarefa",
      passos: [
        "Na atividade, carrega no lápis **Editar atividade**. Numa tarefa, carrega no título.",
        "Altera o título, o responsável, os **Outros Colaboradores Envolvidos**, as datas, o estado e as notas.",
        "Carrega em **Guardar Alterações** (atividade) ou **Guardar Tarefa** (tarefa).",
      ],
    },
    {
      titulo: "Como concluir uma atividade, tarefa ou passo",
      passos: [
        "Carrega no quadrado ou círculo à esquerda do item.",
        "Para reabrir, carrega outra vez.",
      ],
      nota: "Ao concluir uma atividade, as tarefas e passos dentro dela também ficam concluídos.",
    },
    {
      titulo: "Como reordenar atividades e tarefas",
      passos: [
        "Agarra no ícone de arrastar à esquerda do item (**Arraste para reordenar**).",
        "Larga-o na nova posição. As tarefas só mudam de lugar dentro da mesma atividade.",
      ],
    },
    {
      titulo: "Como repetir um bloco de atividade",
      passos: [
        "Na atividade que queres copiar, carrega no botão **Repetir este bloco de atividade**.",
        "É criada uma cópia da atividade com todas as tarefas e passos.",
      ],
    },
    {
      titulo: "Como desbloquear um item com dependência",
      passos: [
        "Um item com a etiqueta **Bloqueada por dependência** ou **Dependência** só pode avançar depois de concluído o item de que depende.",
        "Para avançar mesmo assim, carrega no cadeado ao lado (**Desbloquear atividade manualmente** ou **Desbloquear tarefa manualmente**).",
      ],
      nota: "O desbloqueio fica para sempre. As dependências vêm do modelo do projeto.",
    },
    {
      titulo: "Como anexar um entregável a uma tarefa",
      passos: [
        "Carrega no título da tarefa para abrir os **Detalhes da Tarefa**.",
        "Marca **Requer documento entregavel?**.",
        "Preenche o **Nome / Tipo de Documento** e a **Data p/ Entrega**.",
        "Carrega em **Clique para anexar um documento** ou arrasta o ficheiro para essa zona.",
        "Carrega em **Guardar Tarefa**.",
      ],
      nota: "Depois de anexado, usa **Ver documento atual** para o abrir.",
    },
    {
      titulo: "Como usar o cronómetro num projeto",
      passos: [
        "No separador **Atividades**, carrega no botão de play da tarefa (ou da atividade, se não tiver tarefas).",
        "Se ainda não picaste o ponto hoje, a app pergunta se queres picar agora.",
        "Se já tinhas outro cronómetro ligado, confirma se o queres terminar.",
        "Para parar, carrega no botão de parar. Escreve uma nota se quiseres e escolhe o novo **Estado da tarefa/atividade**.",
        "Carrega em **Guardar e parar**.",
      ],
      nota: "Na lista de projetos, o play do cartão pede-te para escolheres a atividade e, se quiseres, a tarefa.",
    },
    {
      titulo: "Como encaminhar uma tarefa para análise",
      passos: [
        "Ao parar o cronómetro, escolhe o estado **Em analise**.",
        "Em **Encaminhar para**, escolhe **Proprio**, **Colega**, **Cliente**, **Contabilista** ou **Organismo**.",
        "Se for um colega ou alguém do cliente, escolhe a pessoa.",
        "Indica a **Data expectavel de resposta** e carrega em **Guardar e parar**.",
      ],
      nota: "O colega escolhido passa a ver a tarefa e recebe um alerta.",
    },
    {
      titulo: "Como registar tempo esquecido",
      passos: [
        "Abre o projeto no separador **Relatório de tempos**.",
        "Carrega em **Adicionar Tempo**.",
        "Escolhe o **Colaborador**, a **Data do Registo** e a **Hora de Início**.",
        "Em **Tipo**, escolhe **Atividade**, **Tarefa** ou **Passo** e escolhe o **Item**.",
        "Indica o **Tempo (minutos)** e carrega em **Guardar**.",
      ],
      nota: "Em **Registos Individuais** podes editar ou apagar registos.",
    },
    {
      titulo: "Como registar um pedido de reembolso",
      passos: [
        "Abre o projeto no separador **Execução financeira**.",
        "Se o projeto tiver várias entidades, escolhe a entidade.",
        "Carrega em **Novo pedido**.",
        "Preenche o **Pedido**, a **Data Pedido**, o **Valor Investimento** e o **Valor Incentivo**. Quando for pago, preenche o **Valor Pago** e a **Data Pagamento**.",
        "Carrega em **Guardar**.",
      ],
      nota: "A **Taxa de execução** é calculada com o investimento pedido face ao investimento elegível.",
    },
    {
      titulo: "Como gerar o relatório PDF do projeto",
      passos: [
        "Abre o projeto.",
        "Carrega em **Gerar PDF**, no topo.",
      ],
      nota: "Para o cronograma, vai ao separador **Gantt**, escolhe a janela e carrega em **Exportar PDF**.",
    },
    {
      titulo: "Como arquivar um projeto",
      passos: [
        "Abre o projeto no separador **Configurações e dados**.",
        "Carrega em **Editar ficha**.",
        "Em **Arquivar ou apagar**, carrega em **Arquivar** e confirma.",
      ],
      nota: "O projeto passa a **Encerrado** e sai das listas normais, mas fica guardado. Para o ver, liga **Arquivados** na lista de projetos.",
    },
    {
      titulo: "Como apagar um projeto de vez",
      passos: [
        "Abre o projeto no separador **Configurações e dados**.",
        "Carrega em **Editar ficha**.",
        "Em **Arquivar ou apagar**, carrega em **Apagar permanentemente**.",
        "Escreve **APAGAR** na caixa e confirma.",
      ],
      nota: "Apaga o projeto, as atividades, as tarefas, os passos e os tempos registados. Não pode ser desfeito. Na dúvida, arquiva.",
    },
  ],
  faq: [
    {
      pergunta: "Qual é a diferença entre concluir e arquivar um projeto?",
      resposta: "**Concluído** quer dizer que o trabalho terminou, mas o projeto continua nas listas. **Arquivar** passa-o a **Encerrado**: sai das listas normais e deixa de aceitar cronómetro.",
    },
    {
      pergunta: "Porque não consigo avançar no assistente de novo projeto?",
      resposta: "No primeiro passo tens de preencher o **Tipo de Projeto (Modelo)**, o **Responsável Global**, o **Título do Projeto** e a **Entidade Lider**. Para criar, também precisas da **Data Fim** e, fora dos projetos de formação, do investimento e do incentivo acima de 0.",
    },
    {
      pergunta: "Porque não consigo ligar o cronómetro neste projeto?",
      resposta: "Os projetos **Encerrado** ou **Cancelado** não aceitam cronómetro. Também não podes contar tempo numa tarefa já concluída ou bloqueada por dependência.",
    },
    {
      pergunta: "Posso mudar as atividades do modelo depois de criar o projeto?",
      resposta: "Sim. A escolha do modelo só conta na criação. Depois, acrescenta, edita ou apaga atividades e tarefas no separador **Atividades** do projeto.",
    },
    {
      pergunta: "Onde vejo quem mudou o estado do projeto?",
      resposta: "No separador **Seguimento**. Carrega em **Ver detalhe** para ver **O que aconteceu**, filtrado por **Projeto**, **Atividades** ou **Tarefas**.",
    },
    {
      pergunta: "O organismo que procuro não aparece na lista. Porquê?",
      resposta: "Só aparecem as entidades marcadas como entidade financiadora. Em **Entidades**, abre a ficha do organismo, vai ao separador **Funções**, liga **É Entidade Financiadora?** e carrega em **Guardar Funções**.",
    },
    {
      pergunta: "Não encontro um projeto na lista. O que faço?",
      resposta: "Confirma se estás em **Os meus** ou **Empresa** e usa a pesquisa. Se o projeto estiver encerrado ou cancelado, liga **Arquivados**.",
    },
  ],
};
