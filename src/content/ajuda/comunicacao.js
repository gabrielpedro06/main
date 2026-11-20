// Manual de utilizador — Comunicação Interna. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "comunicacao",
  titulo: "Comunicação Interna",
  icone: "MessagesSquare",
  rota: "/dashboard/forum",
  papeis: undefined,
  resumo: "A Comunicação Interna junta o fórum da equipa (publicações, comentários e reações) e os chats internos, privados ou de grupo, onde também podes enviar ficheiros.",
  paginas: [
    {
      titulo: "Aviso de mensagens por ler",
      texto: "Na barra lateral, o item **Comunicação Interna** mostra um número quando há mensagens de chat ou publicações novas por ver. Quando chega uma mensagem nova, o item abana e a app toca um som. Se a app estiver em segundo plano e o navegador o permitir, aparece também uma notificação do Windows.",
    },
    {
      titulo: "Coluna da esquerda",
      texto: "Mostra o teu cartão, com o número de publicações e conversas, e o botão **As minhas publicações**. Por baixo, em **Feed**, filtra as publicações por tipo: **Tudo**, **Avisos**, **Dúvidas**, **Ideias** e **Geral**.",
    },
    {
      titulo: "Feed de publicações",
      texto: "No topo está a caixa **Em que estás a pensar?** e os atalhos **Foto**, **Aviso**, **Dúvida** e **Ideia**. Por baixo aparecem as publicações, das mais recentes para as mais antigas. Os avisos têm a faixa **Aviso importante**. Em cada publicação podes reagir (**Gostar**), **Comentar** ou **Abrir discussão**.",
    },
    {
      titulo: "Chats internos",
      texto: "Na coluna da direita está a lista das tuas conversas, com o botão **Novo chat**. Cada conversa indica se é **Grupo** ou **Conversa privada** e mostra quantas mensagens tens por ler.",
    },
    {
      titulo: "Janela de conversa",
      texto: "Mostra as mensagens, quem está a escrever e, nas tuas mensagens, os vistos (dois vistos quando já foram lidas). Em baixo tens o botão de emojis, a caixa **Escreve uma mensagem…**, o clipe para **Anexar ficheiro** e o botão de enviar. Nos grupos aparece também **Adicionar pessoas**.",
    },
  ],
  tarefas: [
    {
      titulo: "Como fazer uma videochamada",
      passos: [
        "Abre a conversa (com uma pessoa ou um grupo) no chat da **Comunicação Interna**.",
        "No topo da conversa, carrega em **Chamada**.",
        "Na primeira vez, o browser pede acesso à câmara e ao microfone: carrega em **Permitir**.",
        "Confirma o teu nome, liga ou desliga a câmara e entra na reunião.",
        "Os outros veem na conversa um cartão **Videochamada** e entram carregando em **Entrar**.",
        "Para sair, usa o botão vermelho do Jitsi ou **Sair** no topo da janela. Podes **minimizar** a chamada para continuar a usar o Bizin.",
      ],
      nota: "Só entram as pessoas que fazem parte da conversa. Se saíres por engano, carrega em **Voltar a entrar** no cartão.",
    },
    {
      titulo: "Como criar uma publicação",
      passos: [
        "Abre **Comunicação Interna** na barra lateral.",
        "Carrega em **Em que estás a pensar?** (ou num dos atalhos **Foto**, **Aviso**, **Dúvida** ou **Ideia**).",
        "Escolhe a categoria e escreve um título em **Dá um título à publicação**.",
        "Escreve o texto. Para juntar mais conteúdo, usa **Foto** ou **Novo parágrafo** em **Adicionar à publicação**.",
        "Carrega em **Publicar**.",
      ],
      nota: "Podes arrastar uma imagem para a janela ou colá-la com Ctrl+V. Em cada imagem escolhes o tamanho e em cada parágrafo o alinhamento.",
    },
    {
      titulo: "Como comentar ou responder",
      passos: [
        "Na publicação, carrega em **Comentar**.",
        "Escreve em **Escreve um comentário…** e carrega no botão de enviar.",
        "Para responder a um comentário específico, carrega em **Responder** por baixo dele.",
      ],
      nota: "Para dar gosto a um comentário, carrega no coração ao lado (ou faz duplo clique no comentário).",
    },
    {
      titulo: "Como reagir a uma publicação",
      passos: [
        "Carrega em **Gostar** para dar um gosto rápido.",
        "Para escolher outra reação, passa o rato por cima de **Gostar** (no telemóvel, carrega sem largar) e escolhe o emoji.",
      ],
    },
    {
      titulo: "Como editar ou apagar uma publicação",
      passos: [
        "Na tua publicação, carrega no ícone de lápis (**Editar Publicação**) ou no caixote do lixo (**Apagar Publicação**).",
        "Para editar, faz as alterações e carrega em **Guardar alterações**.",
        "Para apagar, confirma com **Sim, apagar**.",
      ],
      nota: "Apagar uma publicação apaga também todos os comentários. Não pode ser desfeito.",
    },
    {
      titulo: "Como ver só as publicações de uma pessoa",
      passos: [
        "Carrega no nome ou na foto do autor de uma publicação.",
        "Para ver as tuas, carrega em **As minhas publicações**.",
        "Para voltar a ver tudo, carrega em **Ver tudo**.",
      ],
    },
    {
      titulo: "Como iniciar uma conversa privada",
      passos: [
        "Na coluna dos chats, carrega em **Novo chat**.",
        "Escolhe **Privado**.",
        "Procura o colega em **Procurar colega…** e seleciona-o.",
        "Carrega em **Criar chat**.",
      ],
      nota: "Se já tiveres uma conversa com essa pessoa, a app abre a conversa existente.",
    },
    {
      titulo: "Como criar um grupo",
      passos: [
        "Carrega em **Novo chat** e escolhe **Grupo**.",
        "Escreve o **Nome do grupo**.",
        "Seleciona os membros.",
        "Carrega em **Criar chat**.",
      ],
    },
    {
      titulo: "Como adicionar pessoas a um grupo",
      passos: [
        "Abre a conversa do grupo.",
        "Carrega em **Adicionar pessoas**.",
        "Seleciona os colegas e carrega em **Adicionar**.",
      ],
    },
    {
      titulo: "Como enviar um ficheiro no chat",
      passos: [
        "Abre a conversa.",
        "Carrega no clipe (**Anexar ficheiro**), ou arrasta o ficheiro para a conversa, ou cola-o com Ctrl+V.",
        "Se quiseres, escreve uma legenda.",
        "Carrega no botão de enviar.",
      ],
      nota: "Os ficheiros do chat só podem ser abertos pelas pessoas dessa conversa.",
    },
    {
      titulo: "Como desligar o som das mensagens",
      passos: [
        "Carrega no cartão com o teu nome, no fundo da barra lateral.",
        "Desliga **Som das notificações**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Como mudo de linha numa mensagem sem a enviar?",
      resposta: "Carrega em Shift+Enter. O Enter sozinho envia a mensagem.",
    },
    {
      pergunta: "Como sei se a outra pessoa já leu a minha mensagem?",
      resposta: "Nas tuas mensagens aparecem dois vistos quando a mensagem já foi lida.",
    },
    {
      pergunta: "Quem pode editar ou apagar uma publicação ou um comentário?",
      resposta: "As publicações podem ser editadas e apagadas pelo autor. Os comentários podem ser apagados (não editados) pelo autor. Os administradores e gestores também podem fazê-lo em publicações e comentários de qualquer pessoa.",
    },
    {
      pergunta: "Posso sair de um grupo ou apagar uma conversa?",
      resposta: "Não. De momento a página não tem nenhuma opção para sair de um grupo nem para apagar uma conversa.",
    },
    {
      pergunta: "Não recebo a notificação do Windows quando chegam mensagens. Porquê?",
      resposta: "A notificação do Windows só aparece com a app em segundo plano e se o navegador tiver autorização para mostrar notificações. Com a app à vista, ouves apenas o som (se estiver ligado).",
    },
  ],
};
