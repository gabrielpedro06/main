// Manual de utilizador — Marketing. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "marketing",
  titulo: "Marketing",
  icone: "Palette",
  rota: "/dashboard/marketing",
  papeis: ["admin", "administrador", "gestor", "marketing", "marketing plus"],
  resumo:
    "Planeia os conteúdos de cada marca, desde a ideia até à publicação. Aqui tens o quadro de produção, o calendário editorial, a estratégia, as personas, o guia de marca, os recursos e um assistente de ideias com IA.",
  paginas: [
    {
      titulo: "Onde encontrar",
      texto:
        "No menu lateral, abre o grupo **COMERCIAL** e carrega em **Marketing**. Tudo o que vês na página pertence à marca escolhida no topo.",
    },
    {
      titulo: "Topo da página",
      texto:
        "Em cima tens três botões: **Ideias com IA** (abre o assistente), **Nova ideia** (leva-te ao banco de ideias) e **Novo conteúdo** (cria uma peça na etapa Briefing). Por baixo estão os botões das marcas, cada um com o número de conteúdos em curso, e a roda dentada **Gerir marcas**. Ao lado vês os indicadores: em curso, para aprovar, nos próximos 7 dias, publicados este mês e, se existirem, com entrega atrasada.",
    },
    {
      titulo: "Separadores",
      texto:
        "**Fluxo** é o quadro de produção. **Calendário** mostra as datas de entrega e de publicação. **Ideias** é o banco de ideias. **Personas** guarda as buyer personas. **Estratégia** tem os ciclos de estratégia. **Marca** é o guia de marca. **Recursos** reúne catálogo, turmas, campanhas, leads, métricas e outros dados. **Arquivo** guarda o que foi posto de lado.",
    },
    {
      titulo: "Pesquisa e filtros",
      texto:
        "Nos separadores Fluxo, Calendário, Ideias e Arquivo podes procurar por tema, hook ou hashtag e filtrar por pessoa (**Toda a equipa**, **Os meus** ou um colega), por canal e por campanha. O botão **Importar** também está nesta barra.",
    },
    {
      titulo: "Fluxo (quadro)",
      texto:
        "Cada coluna é uma etapa: **Briefing**, **Curadoria**, **Criação**, **Revisão**, **Aprovação**, **Alterações necessárias**, **Agendamento / Programação** e **Publicado / Agendado**. Cada cartão mostra o formato, a prioridade, a campanha, os canais, as personas, a data e os responsáveis. Avisos a vermelho indicam alterações pedidas, peças em aprovação sem aprovador (**Sem aprovador: abra e envie**) ou campos por preencher no texto.",
    },
    {
      titulo: "Calendário",
      texto:
        "Vista mensal. Cada conteúdo pode aparecer até três vezes: **Entrega** (copy e design prontos), **1.ª publicação** (com hora e canal) e **2.ª publicação** (repost ou lembrete). Uma entrega aparece como **ATRASADA** se a data passou e a peça ainda não saiu da produção, ou como **já entregue** se já avançou. As bandeiras são pontos de controlo da estratégia. À direita, a lista **Sem data** mostra as peças ainda sem 1.ª publicação.",
    },
    {
      titulo: "Painel do conteúdo",
      texto:
        "Ao abrir um conteúdo vês, no topo, o título e as etapas (podes carregar numa para mudar de etapa). O índice leva-te às secções **Planeamento**, **Criativo**, **Copy**, **Design**, **Notas**, **Aprovação** e **Resultados**. As alterações são gravadas sozinhas, não há botão de guardar. O botão **Guia da marca** abre um resumo do guia enquanto escreves; o número ao lado indica palavras a evitar que estão no texto.",
    },
  ],
  tarefas: [
    {
      titulo: "Como escolher ou criar uma marca",
      passos: [
        "Carrega no nome da marca, no topo da página, para mudares para ela.",
        "Para criar ou editar, carrega na roda dentada **Gerir marcas**.",
        "Escolhe **Nova marca** ou uma marca da lista.",
        "Preenche o **Nome**, arrasta o logo (PNG, SVG, JPG ou WebP, até 2 MB) e escolhe a **Cor da marca**.",
        "Carrega em **Criar marca** ou em **Guardar**.",
      ],
      nota:
        "**Ocultar** esconde a marca sem apagar nada. O botão de eliminar só aparece quando a marca não tem conteúdos.",
    },
    {
      titulo: "Como criar um conteúdo",
      passos: [
        "Carrega em **Novo conteúdo** no topo, ou no **+** de uma coluna do Fluxo para o criar já nessa etapa.",
        "Escreve o tema no campo **Tema / assunto**.",
        "Em **Planeamento**, escolhe os **Responsáveis**, a **Campanha / série**, a **Prioridade**, as datas, os **Canais** e os **Formatos**.",
        "Preenche o **Criativo**, a **Copy** e o **Design** à medida que a peça avança.",
        "Fecha o painel. Tudo fica gravado.",
      ],
    },
    {
      titulo: "Como mudar um conteúdo de etapa",
      passos: [
        "No separador **Fluxo**, arrasta o cartão para outra coluna (também podes mudar a ordem dentro da coluna).",
        "Em alternativa, abre o conteúdo e carrega na etapa pretendida no topo do painel.",
      ],
      nota:
        "Se largares o cartão na coluna **Aprovação**, a etapa não muda logo: abre-se a secção Aprovação para escolheres quem aprova.",
    },
    {
      titulo: "Como definir as datas de entrega e de publicação",
      passos: [
        "Abre o conteúdo e vai a **Planeamento**.",
        "Preenche a **Data de entrega** (dia em que copy e design ficam prontos).",
        "Preenche a **1.ª publicação** e, se houver repost ou lembrete, a **2.ª publicação**.",
      ],
    },
    {
      titulo: "Como usar o calendário editorial",
      passos: [
        "Abre o separador **Calendário**. Usa as setas para mudar de mês e **Hoje** para voltar ao mês atual.",
        "Na legenda, carrega em **Entrega**, **1.ª publicação** ou **2.ª publicação** para mostrar ou esconder esse tipo de data. Fica sempre pelo menos um ativo.",
        "Arrasta um item para outro dia para mudar só essa data. Nas publicações a hora mantém-se.",
        "Arrasta um conteúdo da lista **Sem data** para um dia para lhe definir a 1.ª publicação.",
        "Carrega no **+** de um dia para criar um conteúdo novo com publicação nesse dia às 10:00.",
        "Carrega num item para abrir o conteúdo.",
      ],
      nota:
        "Uma entrega com **ATRASADA** quer dizer que a data já passou e a peça ainda está em produção. Os mesmos atrasos aparecem no topo da página em **com entrega atrasada**.",
    },
    {
      titulo: "Como escrever a copy",
      passos: [
        "Abre o conteúdo e vai a **Copy**.",
        "Carrega em **Escrever copy** e escreve o texto da publicação.",
        "Para outra rede ou formato, carrega em **Adicionar outra versão** e dá-lhe um nome (ex.: Instagram, LinkedIn).",
        "Preenche **Call to action**, **CTA 2** e **Hashtags**.",
        "Usa o ícone de copiar para levar o texto para a plataforma.",
      ],
      nota:
        "Se o texto tiver palavras que a marca evita, ou campos por preencher entre parênteses retos (ex.: [confirmar: preço]), aparece um aviso por cima.",
    },
    {
      titulo: "Como juntar designs e ficheiros",
      passos: [
        "Abre o conteúdo e vai a **Design e ficheiros**.",
        "Carrega em **Adicionar link (Canva, Brevo, Drive…)**, dá-lhe um nome e cola o endereço.",
        "Em **Ficheiros**, carrega em **Anexar ficheiros** ou arrasta-os para lá.",
      ],
    },
    {
      titulo: "Como enviar um conteúdo para aprovação",
      passos: [
        "Abre o conteúdo e vai à secção **Aprovação**.",
        "Em **Quem aprova**, escolhe uma ou mais pessoas.",
        "Carrega em **Enviar para aprovação**.",
        "O conteúdo passa para a etapa Aprovação e as pessoas escolhidas recebem o pedido nas notificações do Dashboard.",
      ],
      nota: "Basta uma pessoa aprovar. Uma ideia tem de passar primeiro para o fluxo.",
    },
    {
      titulo: "Como aprovar ou pedir alterações",
      passos: [
        "No Dashboard, abre a notificação **Rever e aprovar**, ou abre o conteúdo na secção **Aprovação**.",
        "Revê o texto, os designs e o briefing.",
        "Se estiver bem, carrega em **Aprovar**. O conteúdo passa para Agendamento / Programação.",
        "Se não, escreve o que tem de mudar e carrega em **Pedir alterações**. O conteúdo passa para Alterações necessárias.",
      ],
      nota: "Em ambos os casos a equipa de marketing é avisada.",
    },
    {
      titulo: "Como reenviar depois de alterações",
      passos: [
        "Faz as correções pedidas (o pedido aparece no cartão e na secção Aprovação).",
        "Na secção **Aprovação**, confirma **Quem aprova**.",
        "Carrega em **Reenviar para aprovação**.",
      ],
    },
    {
      titulo: "Como guardar e desenvolver ideias",
      passos: [
        "Abre o separador **Ideias** (ou carrega em **Nova ideia**).",
        "Escreve a ideia e carrega em **Guardar ideia**.",
        "Carrega numa ideia para lhe juntar detalhes.",
        "Quando estiver pronta, carrega em **Para o fluxo**. A ideia entra na primeira etapa do quadro.",
      ],
    },
    {
      titulo: "Como pedir ideias ao assistente com IA",
      passos: [
        "Carrega em **Ideias com IA** no topo, ou em **Assistente de ideias** no separador Ideias.",
        "Se quiseres ideias com datas e notícias atuais, marca **Pesquisar na web** antes da primeira mensagem.",
        "Escolhe uma sugestão ou escreve o que procuras e carrega em Enviar (ou Enter).",
        "Em cada ideia, carrega em **Ver copy e detalhes** para ver tudo.",
        "Carrega em **Guardar** numa ideia, ou em **Guardar todas**. As ideias vão para o Banco de Ideias.",
        "Para pedir ajustes, escreve na mesma conversa (ex.: torna a 2 mais curta). Para recomeçar, carrega em **Nova conversa**.",
      ],
      nota:
        "O assistente já conhece o guia da marca, as personas, a estratégia ativa e o que já está no fluxo. As ideias são propostas: confirma factos e datas antes de publicar. A conversa perde-se se recarregares a página.",
    },
    {
      titulo: "Como arquivar, restaurar ou eliminar um conteúdo",
      passos: [
        "Abre o conteúdo.",
        "No fundo do painel, carrega em **Arquivar**. O conteúdo vai para o separador Arquivo.",
        "Para o recuperar, no separador **Arquivo** carrega em **Restaurar**. Volta à etapa onde estava.",
        "Para apagar de vez, carrega em **Eliminar** e depois em **Confirmar eliminação**.",
      ],
    },
    {
      titulo: "Como importar conteúdos do Notion",
      passos: [
        "No Notion, exporta o Fluxo de Conteúdos ou o Banco de Ideias em Markdown & CSV.",
        "Escolhe a marca certa e carrega em **Importar**.",
        "Arrasta o ficheiro .csv para a janela ou carrega para o escolher.",
        "Revê o resumo. Decide se marcas **não importar arquivados** e **importar mesmo assim** (para títulos repetidos).",
        "Carrega em **Importar**.",
      ],
      nota:
        "Importa primeiro as personas, no separador Personas, para que fiquem ligadas aos conteúdos. Os ficheiros do Notion ficam como por carregar: tens de os anexar à mão.",
    },
    {
      titulo: "Como criar uma persona",
      passos: [
        "Abre o separador **Personas**.",
        "Carrega em **Nova persona**, ou em **Importar CSV do Notion** para trazer as da base Buyer Personas.",
        "Preenche as secções **Quem é**, **Onde está e como compra**, **O que procura** e **Como ativar**.",
      ],
      nota: "A vista **Matriz de ativação** mostra lado a lado o gatilho, a formação âncora, o canal e a mensagem-chave de cada persona.",
    },
    {
      titulo: "Como preparar a estratégia de um ciclo",
      passos: [
        "Abre o separador **Estratégia** e carrega em **Criar primeiro ciclo** (ou **Novo ciclo**).",
        "Dá um nome e define o início e o fim. Carrega em **Criar ciclo**.",
        "Em cada secção, carrega em **Editar**, preenche e carrega em **Guardar**.",
        "Em Objetivos e KPIs, dá a cada objetivo uma **Frente** (nome curto). As frentes aparecem depois nos conteúdos.",
        "Em Análise geral e decisões, junta **Pontos de controlo** com data. Aparecem como bandeiras no calendário.",
      ],
      nota:
        "**Duplicar** cria o ciclo seguinte com a mesma estrutura. Em Desempenho de publicações podes usar **Importar dos conteúdos com resultados** e em Etapas por frente **Gerar etapas para cada frente**.",
    },
    {
      titulo: "Como preencher o guia de marca",
      passos: [
        "Abre o separador **Marca**.",
        "Numa secção vazia, carrega em **Preencher**. Numa secção já preenchida, carrega em **Editar**.",
        "Preenche e carrega em **Guardar**.",
        "Em **Ficheiros**, arrasta guias, logótipos ou posts de referência (até 20 MB cada).",
      ],
      nota:
        "As **Palavras que evitamos** da secção Voz são assinaladas automaticamente no texto de cada conteúdo.",
    },
    {
      titulo: "Como registar recursos (catálogo, campanhas, leads…)",
      passos: [
        "Abre o separador **Recursos**.",
        "Escolhe o tipo: **Catálogo**, **Turmas**, **Campanhas**, **Leads**, **Métricas**, **Ativos**, **Factos**, **Regras** ou **Canais**.",
        "Carrega em **Adicionar** e preenche a ficha.",
        "Em **Resultados** vês as metas das campanhas, as leads, as métricas dos canais e o desempenho por peça.",
      ],
      nota:
        "Uma campanha liga-se aos conteúdos pelo nome: tem de ser igual ao campo **Campanha / série** das peças. Se mudares o nome da campanha aqui, as peças são atualizadas.",
    },
    {
      titulo: "Como registar os resultados de uma publicação",
      passos: [
        "Abre o conteúdo e vai a **Resultados**.",
        "Escolhe a **Métrica principal** e escreve o **Resultado**.",
        "Preenche as **Métricas da publicação**, o **Link da publicação** e a verba, se houver.",
        "Escolhe a **Avaliação** e escreve as **Notas / análise**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Tenho de carregar em Guardar no painel do conteúdo?",
      resposta:
        "Não. Escolhas e datas ficam gravadas logo. Os textos ficam gravados quando sais do campo ou fechas o painel.",
    },
    {
      pergunta: "Arrastei um cartão para Aprovação e ele não mudou de coluna. Porquê?",
      resposta:
        "Para enviar para aprovação tens de escolher quem aprova. Abre-se a secção Aprovação: escolhe as pessoas e carrega em **Enviar para aprovação**.",
    },
    {
      pergunta: "O que quer dizer ATRASADA no calendário?",
      resposta:
        "A data de entrega já passou e a peça ainda está numa etapa de produção (até Alterações necessárias). Avança a peça ou muda a data de entrega.",
    },
    {
      pergunta: "Porque não vejo a data de entrega de algumas peças no calendário?",
      resposta:
        "As ideias e os conteúdos arquivados não mostram entrega. Confirma também, na legenda, que **Entrega** está ativa.",
    },
    {
      pergunta: "Quantas pessoas têm de aprovar?",
      resposta: "Basta uma das pessoas escolhidas aprovar ou pedir alterações.",
    },
    {
      pergunta: "O que é o aviso Por preencher num cartão?",
      resposta:
        "O texto tem algo entre parênteses retos (ex.: [confirmar: preço]). Substitui por informação confirmada antes de publicar.",
    },
    {
      pergunta: "Perdi a conversa com o assistente de ideias. Posso recuperá-la?",
      resposta:
        "Não. A conversa só existe enquanto a página está aberta. As ideias que guardaste continuam no Banco de Ideias.",
    },
    {
      pergunta: "Não consigo eliminar uma marca. Porquê?",
      resposta: "Só podes eliminar uma marca sem conteúdos. Em alternativa, usa **Ocultar**.",
    },
    {
      pergunta: "Os ficheiros anexados ficam privados?",
      resposta:
        "Não totalmente: quem tiver o link do ficheiro consegue abri-lo. Não anexes documentos com dados pessoais ou confidenciais.",
    },
    {
      pergunta: "Onde envio campanhas de email?",
      resposta: "Não é nesta página. O envio de campanhas por email está em **Leads** e no **TransferGest**.",
    },
  ],
};
