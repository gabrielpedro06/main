// Manual de utilizador — TransferGest. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "transfergest",
  titulo: "TransferGest",
  icone: "ArrowLeftRight",
  rota: "/dashboard/transfergest",
  papeis: ["admin", "administrador", "gestor"],
  resumo:
    "Base de contactos de empresas organizada por campanha. Aqui acompanhas o estado de cada contacto, importas e exportas listas e envias campanhas por email.",
  paginas: [
    {
      titulo: "Onde encontrar",
      texto: "No menu lateral, abre o grupo **COMERCIAL** e carrega em **TransferGest**.",
    },
    {
      titulo: "Escolha da campanha",
      texto:
        "Ao abrir, vês um cartão por campanha. Carrega em **Todas as Campanhas** para ver todos os registos, ou numa campanha para ver só os dela. Depois podes mudar de campanha na lista por baixo do título. Para voltar a este menu, carrega no ícone quadrado ao lado do título (**Voltar ao menu de campanhas**).",
    },
    {
      titulo: "Estados",
      texto:
        "Cada registo tem um estado: **NOVO**, **CONTACTADO**, **REUNIÃO** ou **CANCELADO**. Os separadores por cima da lista (**TODOS** e um por estado) mostram quantos registos há em cada um. Em cada cartão vês também desde quando está nesse estado.",
    },
    {
      titulo: "Botões do topo",
      texto:
        "**Importar CSV** e **Exportar CSV** estão sempre disponíveis. **Alterar Estado** e **Campanha Email** só ficam ativos depois de escolheres uma campanha e selecionares registos. **+ Novo Registo** cria um contacto à mão.",
    },
    {
      titulo: "Cartões",
      texto:
        "Cada cartão mostra a denominação, o NIF, o ano, as NUT, o contacto, o registo, a localidade, o target e a classificação. A etiqueta **SIM** ou **NAO** indica se a empresa tem interesse em campanhas de email. Em baixo tens **Mais info**, **Editar** e **Arquivar**.",
    },
  ],
  tarefas: [
    {
      titulo: "Como procurar registos",
      passos: [
        "Escolhe a campanha.",
        "Escreve na caixa de pesquisa um nome, NIF, número de registo ou email.",
        "Para filtrar por campo, usa por exemplo localidade:porto, ano:2026, target:industria ou interesse:sim. Podes juntar vários.",
        "Carrega num separador de estado para ver só esse estado.",
      ],
      nota: "Marca **Mostrar arquivo** para veres também os registos arquivados.",
    },
    {
      titulo: "Como criar ou editar um registo",
      passos: [
        "Carrega em **+ Novo Registo**, ou em **Editar** num cartão.",
        "Em **Associar a Campanha**, escreve ou escolhe a campanha.",
        "Preenche a **Denominacao** (obrigatória) e os restantes campos.",
        "Escolhe o **Estado**.",
        "Carrega em **Guardar**.",
      ],
      nota: "Quando mudas o estado, a data da mudança fica registada.",
    },
    {
      titulo: "Como ver todos os dados de um registo",
      passos: [
        "Carrega em **Mais info** no cartão.",
        "Vês a identificação, o contacto, a geografia, o enquadramento, a classificação, o estado e as observações.",
        "Carrega em **Editar** para alterar ou em **Fechar** para sair.",
      ],
    },
    {
      titulo: "Como mudar o estado de vários registos de uma vez",
      passos: [
        "Escolhe a campanha.",
        "Marca a caixa de cada registo, ou **Selecionar todos** para escolher todos os que estão visíveis.",
        "Carrega em **Alterar Estado**.",
        "Escolhe o **Novo estado** e a **Data do estado**.",
        "Carrega em **Aplicar**.",
      ],
    },
    {
      titulo: "Como enviar uma campanha por email",
      passos: [
        "Escolhe a campanha e seleciona os registos que vão receber o email.",
        "Carrega em **Campanha Email**.",
        "Confirma o número em **Destinatarios validos selecionados** (só contam registos com email).",
        "Em **Template Brevo**, escreve o número do template em **Template ID**. Em alternativa, escolhe **HTML manual** e preenche o **Assunto** e o HTML.",
        "Se quiseres, marca **Marcar selecionados como CONTACTADO apos envio**.",
        "Carrega em **Enviar**.",
        "No fim, lê o **Resumo**: enviados, inválidos, repetidos e falhados.",
      ],
      nota:
        "O envio começa logo, sem pedido de confirmação. Deixa os restantes números (tamanho dos lotes, pausa e tentativas) como estão, salvo indicação em contrário.",
    },
    {
      titulo: "Como importar um ficheiro CSV",
      passos: [
        "Carrega em **Importar CSV**.",
        "Em **Para que campanha vai este ficheiro?**, escreve um nome novo ou escolhe uma campanha da lista.",
        "Confirma que o ficheiro tem no cabeçalho todas as colunas indicadas na janela.",
        "Escolhe o ficheiro em **Ficheiro CSV**.",
        "Carrega em **Importar**.",
      ],
      nota:
        "Os registos entram com o estado NOVO. Empresas cujo número de contribuinte já existe, em qualquer campanha, não são importadas.",
    },
    {
      titulo: "Como exportar a lista",
      passos: [
        "Escolhe a campanha e aplica a pesquisa ou o separador de estado que quiseres.",
        "Carrega em **Exportar CSV**.",
      ],
      nota: "O ficheiro tem só os registos que estás a ver.",
    },
    {
      titulo: "Como arquivar ou restaurar um registo",
      passos: [
        "Carrega em **Arquivar** no cartão e confirma.",
        "Para o recuperar, marca **Mostrar arquivo**, encontra o registo e carrega em **Restaurar**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Porque estão desativados os botões Alterar Estado e Campanha Email?",
      resposta: "Tens de escolher uma campanha e selecionar pelo menos um registo.",
    },
    {
      pergunta: "Selecionei registos mas o número de destinatários é menor. Porquê?",
      resposta: "Só contam os registos com um email válido.",
    },
    {
      pergunta: "Devo usar Template Brevo ou HTML manual?",
      resposta:
        "Usa sempre o template do Brevo. Com template, cada pessoa recebe o seu email com o seu nome. No modo HTML manual, os destinatários de um mesmo lote podem ver os endereços uns dos outros.",
    },
    {
      pergunta: "A importação deu erro ou não trouxe todas as linhas. Porquê?",
      resposta:
        "Confirma se o cabeçalho tem todas as colunas pedidas. Os números de contribuinte que já existem são ignorados. Se o mesmo número de contribuinte aparecer duas vezes no próprio ficheiro, a importação pode falhar: retira a linha repetida e tenta outra vez.",
    },
    {
      pergunta: "Posso ter a mesma empresa em duas campanhas?",
      resposta: "Não. Cada número de contribuinte só pode existir uma vez no TransferGest.",
    },
  ],
};
