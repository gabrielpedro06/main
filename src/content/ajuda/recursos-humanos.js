// Manual de utilizador — Recursos Humanos. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "recursos-humanos",
  titulo: "Recursos Humanos",
  icone: "Briefcase",
  rota: "/dashboard/rh",
  papeis: ["admin", "administrador", "gestor"],
  resumo:
    "Painel dos RH: aprovar pedidos de ausência e de km, gerir a ficha de cada colaborador, saldos de férias, assiduidade, subsídio de alimentação, tolerâncias, formação, medalhas e relatórios PDF.",
  paginas: [
    {
      titulo: "Como chegar a esta página",
      texto:
        "No menu lateral, abre o grupo **GESTÃO** e carrega em **Recursos Humanos**. A página chama-se **Gestão de RH**. No topo vês quantos colaboradores há, quantos **pedidos pendentes**, quantos estão **ausentes hoje** e os aniversários do mês.",
    },
    {
      titulo: "Separadores",
      texto:
        "**Gestão**: equipa, ficha de cada colaborador, calendário e PDFs. **Processamento**: subsídio de alimentação de toda a equipa no mês. **Pedidos**: pedidos à espera de decisão (o número vermelho indica quantos). **Tolerâncias**: dias dispensados. **Formação**: horas de formação por colaborador. **Medalhas**: medalhas dos eventos internos. **Colab. Inativos**: colaboradores desativados.",
    },
    {
      titulo: "Gestão — barra de cima",
      texto:
        "**S.A. GLOBAL** e **€/KM** permitem mudar, para todos, o valor diário do subsídio de alimentação e o valor pago por quilómetro; carrega em **Aplicar** para gravar. A lista de colaboradores abre a ficha de uma pessoa; **Visão Geral Global** volta ao resumo da equipa. **Exportar PDF RH** gera o relatório geral do mês (só na visão global). **Ausência Manual** regista uma ausência em nome de alguém.",
    },
    {
      titulo: "Gestão — Visão Geral Global",
      texto:
        "**Equipa hoje** mostra cada colaborador com o estado do dia (**A trabalhar**, **Férias**, **Baixa**, **Sem registo**) e os dias de férias disponíveis; carrega num nome para abrir a ficha. O **Resumo Global do Mês** mostra férias, faltas e baixas, quem está ausente hoje, estados temporários ativos e aniversariantes. O calendário mostra o mês da equipa, com setas para mudar de mês.",
    },
    {
      titulo: "Gestão — ficha do colaborador",
      texto:
        "No topo da ficha tens **Relatório PDF** e **Deslocações PDF**. O separador **Financeiro** mostra o **Valor S.A. Diário**, as **Férias disponíveis** do ano, o **Limite Anual de Férias** e, a partir de dezembro, também o saldo do ano seguinte. O separador **Pessoal** mostra os dados pessoais e os botões **Editar Informações** e **Estado temporário**. Mais abaixo vês o **Processamento** do mês, o calendário do colaborador e o **Histórico de Ausências**.",
    },
    {
      titulo: "Calendário do colaborador",
      texto:
        "Carrega num dia para ver ou editar a assiduidade. Podes **Editar Assiduidade**, **Apagar Assiduidade**, **Registar Assiduidade** num dia sem registo e **Dar Tolerância** ou **Remover Tolerância**. O botão **Preencher mês** marca 09:00–18:00 com 60 minutos de pausa em todos os dias úteis livres do mês. Em baixo vês o **Resumo do Mês**.",
    },
    {
      titulo: "Pedidos",
      texto:
        "Tem duas tabelas: **Ausências Pendentes** e **Deslocações Pendentes**. Cada linha mostra **Novo Pedido** ou **Cancelamento**. Em **Ações** tens o olho (**Ver Detalhes do Pedido**), o visto (**Aprovar**) e a cruz (**Rejeitar**); nos cancelamentos tens **Aceitar** e **Recusar**. Podes procurar por colaborador, tipo, origem ou destino e filtrar por **Todos**, **Férias**, **Outras ausências** e **Cancelamentos**. Nas deslocações vês também os km **Já aprovados no mês**.",
    },
    {
      titulo: "Página de um pedido (vinda do email)",
      texto:
        "Mostra o colaborador, o tipo, o período, a duração, as observações e o anexo (**Ver anexo**). Nas férias mostra o saldo: **Disponível**, **Este pedido** e **Fica com**, com os dias transitados quando se aplicam. Mostra também quem está **Também ausentes nesses dias**. Em baixo tens os botões para decidir.",
    },
    {
      titulo: "Processamento",
      texto:
        "Tabela de toda a equipa ativa para o mês: dias úteis, dias trabalhados (5 horas ou mais), dias descontados, férias, faltas, baixas, S.A. diário e total. Usa as setas para mudar de mês e **Exportar Excel** para descarregar. Carrega numa linha para abrir a ficha do colaborador.",
    },
  ],
  tarefas: [
    {
      titulo: "Como ver os km pedidos por mês",
      passos: [
        "Em **Recursos Humanos**, abre o separador **Km's**.",
        "Cada linha é um colaborador e cada coluna um mês, de janeiro até ao mês atual. Em cada célula vês os km e, por baixo, o valor em euros.",
        "Por omissão contam **Todos os pedidos**, incluindo os que ainda estão pendentes (assinalados a laranja com \"pend.\"). Escolhe **Só aprovados** para ver apenas o que já foi aprovado.",
        "Usa as setas ao lado do ano para ver anos anteriores.",
        "Carrega em **Excel** para descarregar a tabela.",
      ],
      nota: "O valor em euros usa o €/km atual definido nos RH. Os pedidos rejeitados ou cancelados não contam.",
    },
    {
      titulo: "Como aprovar ou rejeitar um pedido no painel",
      passos: [
        "Abre o separador **Pedidos**.",
        "Encontra o pedido em **Ausências Pendentes** ou **Deslocações Pendentes**.",
        "Se quiseres ver tudo antes, carrega no olho (**Ver Detalhes do Pedido**) e abre o documento em **Abrir Documento**.",
        "Carrega no visto (**Aprovar**) ou na cruz (**Rejeitar**). Na janela de detalhes os botões chamam-se **Aprovar Ausência** (ou **Aprovar Deslocação**) e **Rejeitar**.",
        "Na janela **Confirmar Ação**, carrega em **Confirmar**.",
      ],
      nota:
        "Nas férias, a app confirma o saldo antes de aprovar e recusa se o colaborador não tiver dias suficientes. Ao aprovar km, a janela mostra os km e o valor já aprovados no mês e o total depois de aprovar.",
    },
    {
      titulo: "Como aprovar um pedido a partir do email",
      passos: [
        "No email do novo pedido, carrega em **Aprovar**, **Rejeitar** ou **Ver detalhes**.",
        "Se for preciso, entra na app com o teu email, palavra-passe e código de segurança.",
        "A página do pedido abre. Se escolheste Aprovar ou Rejeitar, aparece logo a confirmação.",
        "Revê o saldo e quem mais está ausente nesses dias.",
        "Carrega em **Aprovar** ou **Rejeitar** para confirmar. Para desistir, carrega em **Cancelar**.",
      ],
      nota:
        "Nada muda só por abrires o link: tens sempre de confirmar. Se outra pessoa já tiver decidido, a página avisa que o pedido já foi tratado.",
    },
    {
      titulo: "Como aprovar vários pedidos de uma vez",
      passos: [
        "No separador **Pedidos**, marca as caixas dos pedidos novos (ou a caixa do cabeçalho para todos).",
        "Carrega em **Aprovar Selecionados** (ausências) ou **Aprovar** (deslocações).",
        "Revê o resumo da janela **Aprovação em Massa**. Nos km aparece o total por colaborador e o valor.",
        "Carrega em **Confirmar Aprovação**.",
      ],
      nota:
        "Só os pedidos novos podem ser selecionados; os cancelamentos decidem-se um a um. Se um pedido falhar, os anteriores já ficaram aprovados.",
    },
    {
      titulo: "Como tratar um pedido de cancelamento",
      passos: [
        "No separador **Pedidos**, filtra por **Cancelamentos**.",
        "Na linha do pedido, carrega em **Aceitar** para cancelar ou em **Recusar** para manter.",
        "Carrega em **Confirmar**.",
      ],
      nota:
        "Ao aceitar, o pedido passa a cancelado e os dias de férias voltam ao saldo. Ao recusar, o pedido continua aprovado. Na janela de detalhes estes botões chamam-se **Aceitar Cancelamento** e **Manter Férias**.",
    },
    {
      titulo: "Como registar uma ausência em nome de um colaborador",
      passos: [
        "No separador **Gestão**, carrega em **Ausência Manual**.",
        "Escolhe o **Colaborador** (se já tiveres uma ficha aberta, fica preenchido).",
        "Escolhe o **Motivo da Ausência**.",
        "Preenche **Data Início** e **Data Fim**, ou liga **Ausência Parcial (Apenas algumas horas)** e preenche **Data**, **Saída** e **Regresso**.",
        "Se quiseres, escreve em **Notas / Observações** e anexa um documento.",
        "Carrega em **Registar Ausência**.",
      ],
      nota:
        "A ausência fica logo aprovada e não é enviado email. Nas férias, a app confirma o saldo do colaborador. Também podes escolher **Pedido de Km's** e preencher **De**, **Para** e **Km total**.",
    },
    {
      titulo: "Como corrigir ou cancelar uma ausência do histórico",
      passos: [
        "No separador **Gestão**, abre a ficha do colaborador.",
        "Em **Histórico de Ausências**, encontra o registo.",
        "Para corrigir, carrega no lápis (**Editar Registo**), muda os dados e carrega em **Guardar Alterações**.",
        "Para cancelar uma ausência aprovada, carrega no caixote (**Cancelar e devolver dias**) e depois em **Confirmar**.",
      ],
    },
    {
      titulo: "Como editar a ficha de um colaborador",
      passos: [
        "No separador **Gestão**, escolhe o colaborador na lista ou em **Equipa hoje**.",
        "No separador **Pessoal**, carrega em **Editar Informações** (ou em **Editar Dados Financeiros** no separador **Financeiro**).",
        "Altera os campos de **Identificação**, **Contactos & Morada** e **Empresas & Contrato**.",
        "Do lado esquerdo, altera o **Valor S.A. Diário (€)** e o **Limite Anual**, se for preciso.",
        "Carrega em **Guardar alterações**.",
      ],
    },
    {
      titulo: "Como definir a data de admissão e os dias de férias do primeiro ano",
      passos: [
        "Abre a ficha do colaborador e carrega em **Editar Informações**.",
        "Preenche a **Data Admissão**.",
        "O **Limite Anual** é preenchido sozinho com o valor calculado.",
        "Se mudares o **Limite Anual** à mão, aparece o botão **Pela data de admissão: X dias · usar**. Carrega nele para voltar ao valor calculado.",
        "Carrega em **Guardar alterações**.",
      ],
      nota:
        "Regra do ano de admissão: 2 dias por cada mês completo até dezembro; no mês de entrada, 2 dias se entrou até ao 1.º dia útil, 1 dia se entrou até dia 15, 0 se entrou depois; máximo 20. Se a admissão é de um ano anterior, o valor sugerido é 22. O valor que fica é o que estiver no campo.",
    },
    {
      titulo: "Como marcar um estado temporário (licença, baixa…)",
      passos: [
        "Abre a ficha do colaborador e, no separador **Pessoal**, carrega em **Estado temporário**.",
        "Na secção **Estado temporário**, escolhe o **Tipo**.",
        "Preenche **Início**, **Fim** e, se quiseres, **Motivo / observações**.",
        "Carrega em **Guardar alterações**.",
      ],
      nota:
        "Os dias dentro do período ficam marcados automaticamente. Para terminar, carrega em **Limpar estado temporário** e guarda.",
    },
    {
      titulo: "Como mudar o S.A. ou o valor por km para todos",
      passos: [
        "No separador **Gestão**, altera **S.A. GLOBAL** e/ou **€/KM**.",
        "Carrega em **Aplicar**.",
        "Confirma na janela que aparece.",
      ],
      nota: "O **S.A. GLOBAL** substitui o valor diário de subsídio de alimentação de todos os colaboradores.",
    },
    {
      titulo: "Como criar uma tolerância de ponto",
      passos: [
        "Abre o separador **Tolerâncias**.",
        "Carrega em **Nova Tolerância**.",
        "Escreve a **Designação** (por exemplo, Véspera de Natal) e a **Data**.",
        "Em **Âmbito**, escolhe **Global** (toda a empresa) ou **Individual** (escolhe o colaborador).",
        "Carrega em **Guardar Tolerância**.",
      ],
      nota:
        "Nesse dia ninguém precisa de marcar férias. Para apagar, carrega no caixote ao lado da tolerância. Também podes dar uma tolerância a uma pessoa no calendário dela, com **Dar Tolerância**.",
    },
    {
      titulo: "Como corrigir a assiduidade de um dia",
      passos: [
        "Abre a ficha do colaborador.",
        "No calendário, carrega no dia.",
        "Carrega em **Editar Assiduidade** (ou **Registar Assiduidade** se o dia não tiver registo).",
        "Preenche **Entrada**, **Saída**, **Pausa (minutos)** e **Observações**.",
        "Carrega em **Guardar**.",
      ],
      nota:
        "Para apagar o registo, carrega em **Apagar Assiduidade** e escreve APAGAR para confirmar. Para preencher o mês todo, usa **Preencher mês** e escreve SIM ou CONFIRMO.",
    },
    {
      titulo: "Como tirar os relatórios PDF",
      passos: [
        "Escolhe o mês: na visão global usa as setas do calendário; na ficha do colaborador usa as setas do calendário dele.",
        "Para o relatório de toda a equipa, em **Visão Geral Global** carrega em **Exportar PDF RH**. Sai um PDF por empresa.",
        "Para o relatório de uma pessoa, abre a ficha e carrega em **Relatório PDF**.",
        "Para o mapa de deslocações de uma pessoa, abre a ficha e carrega em **Deslocações PDF**.",
      ],
      nota:
        "O relatório geral e o mapa de deslocações só incluem registos aprovados. O mapa de deslocações usa o valor **€/KM** atual.",
    },
    {
      titulo: "Como exportar o subsídio de alimentação do mês",
      passos: [
        "Abre o separador **Processamento**.",
        "Usa as setas para escolher o mês.",
        "Confirma os valores e o **TOTAL S.A. PAGAR**.",
        "Carrega em **Exportar Excel**.",
      ],
    },
    {
      titulo: "Como registar uma formação",
      passos: [
        "Abre o separador **Formação**.",
        "Carrega em **Registar Nova Formação**.",
        "Preenche **Nome da Ação de Formação**, **Data Início**, **Data Fim** e **Total de Horas**.",
        "Marca os colaboradores (ou **Selecionar Todos**).",
        "Carrega em **Guardar Formação**.",
      ],
      nota: "A tabela mostra o progresso de cada pessoa face ao mínimo legal de 40 horas por ano.",
    },
    {
      titulo: "Como criar e atribuir uma medalha",
      passos: [
        "Abre o separador **Medalhas**.",
        "Carrega em **Nova medalha**.",
        "Carrega a imagem (PNG, até 2 MB), escreve o **Nome**, a **Data** e, se quiseres, a descrição.",
        "Em **Atribuir a**, marca os colaboradores.",
        "Carrega em **Criar medalha**.",
      ],
      nota: "As medalhas aparecem no perfil de cada colaborador. Para mudar ou apagar, usa **Editar** ou **Eliminar** no cartão da medalha.",
    },
    {
      titulo: "Como desativar um colaborador",
      passos: [
        "Abre a ficha do colaborador e carrega em **Editar Informações**.",
        "No topo da janela, carrega em **Desativar**.",
        "Confirma em **Desativar**.",
      ],
      nota:
        "O colaborador deixa de conseguir entrar na app e sai das listas. Os dados históricos mantêm-se.",
    },
    {
      titulo: "Como reativar um colaborador",
      passos: [
        "Abre o separador **Colab. Inativos**.",
        "Na linha do colaborador, carrega em **Reativar**.",
        "Confirma em **Reativar**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Quem recebe o email de um novo pedido?",
      resposta:
        "Os utilizadores com papel de administrador. Os gestores podem decidir pedidos, mas não recebem o email; veem os pedidos no separador **Pedidos**.",
    },
    {
      pergunta: "Como é calculado o saldo de férias?",
      resposta:
        "Disponíveis = dias atribuídos no ano + dias transitados do ano anterior − dias gozados. Os dias transitados só podem ser usados até **31 de março**; depois expiram.",
    },
    {
      pergunta: "Quando são criados os saldos do ano seguinte?",
      resposta:
        "Automaticamente a **1 de dezembro**. A partir daí os colaboradores podem marcar férias do ano seguinte e a ficha mostra também o saldo desse ano.",
    },
    {
      pergunta: "O que é o Limite Anual?",
      resposta:
        "São os dias de férias atribuídos no ano de admissão. Nos anos seguintes cada colaborador tem 22 dias.",
    },
    {
      pergunta: "Posso mudar à mão as Férias Disponíveis?",
      resposta:
        "Não. São calculadas automaticamente (limite anual + transitados − gozados). Para as corrigir, ajusta o **Limite Anual** ou as ausências do colaborador.",
    },
    {
      pergunta: "Quando é que um dia dá direito a subsídio de alimentação?",
      resposta:
        "No ecrã, um dia útil conta quando o colaborador trabalhou 5 horas ou mais (entrada a saída, sem pausas). Dias com ausência de dia inteiro ou com menos de 5 horas são descontados.",
    },
    {
      pergunta: "Duas pessoas podem decidir o mesmo pedido ao mesmo tempo?",
      resposta:
        "Na página aberta pelo email, não: se alguém já decidiu, aparece o aviso de que o pedido já foi tratado. No separador **Pedidos**, confirma sempre que o pedido ainda está pendente antes de decidir.",
    },
    {
      pergunta: "O que acontece quando cancelo uma ausência aprovada?",
      resposta: "Passa a cancelada e, se for férias, os dias voltam ao saldo do colaborador.",
    },
  ],
};
