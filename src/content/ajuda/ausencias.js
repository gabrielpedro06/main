// Manual de utilizador — Ausências e férias. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "ausencias",
  titulo: "Ausências e férias",
  icone: "CalendarDays",
  rota: "/dashboard/ferias",
  papeis: undefined,
  resumo:
    "Marca férias, justifica ausências e acompanha o estado dos teus pedidos. Os RH recebem cada pedido e aprovam ou rejeitam.",
  paginas: [
    {
      titulo: "Como chegar a esta página",
      texto:
        "No fundo do menu lateral, carrega no teu nome (o cartão com a tua foto). No menu que abre, escolhe **Férias & ausências**. A página chama-se **Férias & Ausências**.",
    },
    {
      titulo: "Topo da página",
      texto:
        "O círculo mostra os dias de férias que ainda tens disponíveis neste ano (por exemplo, 12 de 22 dias). Ao lado vês quantos pedidos tens **Pendentes** e **Aprovados**. O botão **Novo pedido** abre o formulário para pedir férias ou outra ausência. Por baixo há um lembrete: os dias de férias não gozados transitam até 31 de março do ano seguinte e depois expiram.",
    },
    {
      titulo: "O meu histórico",
      texto:
        "Lista todos os teus pedidos, do mais recente para o mais antigo. Usa os filtros **Todos**, **Pendentes**, **Aprovados** e **Arquivados** (rejeitados e cancelados). Cada linha mostra o motivo, as datas, a duração em dias úteis ou horas, as tuas notas e o estado.",
    },
    {
      titulo: "Botões de cada pedido",
      texto:
        "**Documento** abre o ficheiro anexado e o botão de setas ao lado substitui-o. **Anexar** junta um documento a um pedido que ainda não tem. Num pedido **Pendente** tens o lápis (**Editar pedido**) e o caixote (**Cancelar pedido**). Num pedido **Aprovado** tens **Pedir cancelamento**.",
    },
    {
      titulo: "Estados de um pedido",
      texto:
        "**Pendente**: à espera de decisão dos RH. **Aprovado**: aceite; se for férias, os dias saem do teu saldo. **Rejeitado**: não foi aceite. **Cancelado**: cancelaste-o tu ou os RH. **A cancelar**: pediste o cancelamento de um pedido aprovado e os RH ainda não decidiram.",
    },
    {
      titulo: "Formulário Novo pedido de ausência",
      texto:
        "Escolhe o **Motivo da ausência**. Depois escolhe **Dias completos** (datas **De** e **Até**) ou **Algumas horas** (**Dia**, **Saída** e **Regresso**). A caixa de resumo diz quantos dias úteis o pedido ocupa e se desconta férias. Podes escrever **Notas** e juntar um **Documento** (PDF, JPG ou PNG). Carrega em **Submeter pedido** para enviar.",
    },
  ],
  tarefas: [
    {
      titulo: "Como pedir férias",
      passos: [
        "Abre **Férias & ausências** a partir do teu nome no fundo do menu lateral.",
        "Carrega em **Novo pedido**.",
        "Em **Motivo da ausência**, deixa **Férias**.",
        "Escolhe **Dias completos** e preenche as datas **De** e **Até**.",
        "Confirma na caixa de resumo quantos dias o pedido consome do teu saldo.",
        "Se quiseres, escreve uma nota em **Notas**.",
        "Carrega em **Submeter pedido**.",
      ],
      nota:
        "Os fins de semana, feriados e tolerâncias de ponto não contam como dias de férias. Se não tiveres saldo suficiente, a app avisa e o pedido não avança.",
    },
    {
      titulo: "Como pedir uma ausência de algumas horas",
      passos: [
        "Carrega em **Novo pedido**.",
        "Escolhe o **Motivo da ausência**.",
        "Carrega em **Algumas horas**.",
        "Preenche o **Dia**, a hora de **Saída** e a hora de **Regresso**.",
        "Confirma o resumo e carrega em **Submeter pedido**.",
      ],
      nota:
        "As horas contam como fração de dia: 8 horas são 1 dia, 4 horas são meio dia. Se puseres 8 horas ou mais, o pedido passa sozinho a dia completo.",
    },
    {
      titulo: "Como justificar uma falta (doença, assistência à família, etc.)",
      passos: [
        "Carrega em **Novo pedido**.",
        "Em **Motivo da ausência**, escolhe o motivo certo (podes escrever em **Procurar motivo…**).",
        "Preenche as datas ou as horas.",
        "Em **Documento**, arrasta o ficheiro ou clica para o escolher (por exemplo, o atestado).",
        "Carrega em **Submeter pedido**.",
      ],
      nota:
        "Só o motivo **Férias** desconta do saldo de férias. Os outros motivos ficam registados como ausência, sem gastar dias de férias.",
    },
    {
      titulo: "Como anexar um documento a um pedido já feito",
      passos: [
        "No **O meu histórico**, procura o pedido.",
        "Carrega em **Anexar** (ou no botão de setas ao lado de **Documento** para substituir).",
        "Arrasta o ficheiro ou clica para o escolher.",
        "Carrega em **Guardar documento**.",
      ],
      nota:
        "Anexa o documento enquanto o pedido está **Pendente**. Se o pedido já estiver aprovado e a app der erro, envia o documento diretamente aos RH.",
    },
    {
      titulo: "Como alterar um pedido pendente",
      passos: [
        "No **O meu histórico**, procura o pedido com o estado **Pendente**.",
        "Carrega no lápis (**Editar pedido**).",
        "Muda o que precisares.",
        "Carrega em **Guardar alterações**.",
      ],
      nota: "O pedido continua **Pendente** e os RH recebem um novo aviso por email.",
    },
    {
      titulo: "Como cancelar um pedido pendente",
      passos: [
        "No **O meu histórico**, procura o pedido com o estado **Pendente**.",
        "Carrega no caixote (**Cancelar pedido**).",
        "Confirma em **Sim, cancelar**.",
      ],
      nota: "O pedido passa logo a **Cancelado**.",
    },
    {
      titulo: "Como cancelar férias já aprovadas",
      passos: [
        "No **O meu histórico**, procura o pedido com o estado **Aprovado**.",
        "Carrega em **Pedir cancelamento**.",
        "Confirma em **Sim, cancelar**.",
        "O pedido fica **A cancelar** até os RH decidirem.",
      ],
      nota:
        "Se os RH aceitarem, o pedido passa a **Cancelado** e os dias de férias voltam ao teu saldo. Se recusarem, o pedido continua **Aprovado**.",
    },
  ],
  faq: [
    {
      pergunta: "Como é calculado o meu saldo de férias?",
      resposta:
        "Disponíveis = dias atribuídos no ano + dias transitados do ano anterior − dias já gozados. Os pedidos ainda pendentes também ficam reservados quando fazes um novo pedido.",
    },
    {
      pergunta: "Quantos dias de férias tenho por ano?",
      resposta:
        "22 dias por ano. No ano em que entraste na empresa a conta é diferente: ganhas 2 dias por cada mês completo até dezembro. No mês de entrada ganhas 2 dias se entraste até ao 1.º dia útil do mês, 1 dia se entraste até dia 15, e 0 se entraste depois. No ano de entrada o máximo é 20 dias.",
    },
    {
      pergunta: "O que acontece aos dias que não gozei?",
      resposta:
        "Passam para o ano seguinte (dias transitados). Só os podes usar em férias até **31 de março**. Depois dessa data expiram.",
    },
    {
      pergunta: "Quando posso marcar férias para o próximo ano?",
      resposta:
        "A partir de **1 de dezembro**. Nesse dia os saldos do ano seguinte são criados automaticamente. Antes disso a app não deixa marcar férias para o ano seguinte.",
    },
    {
      pergunta: "Os feriados e fins de semana contam como férias?",
      resposta:
        "Não. A app só conta dias úteis. Ficam de fora os sábados, domingos, feriados nacionais, o Carnaval, o feriado municipal de Faro (7 de setembro) e as tolerâncias de ponto dadas pelos RH.",
    },
    {
      pergunta: "O que é uma tolerância de ponto?",
      resposta:
        "É um dia dispensado pelos RH (por exemplo, a véspera de Natal), para toda a empresa ou só para ti. Nesse dia não precisas de marcar férias e ele não desconta do teu saldo.",
    },
    {
      pergunta: "Porque é que a app diz que o período só tem fins de semana ou feriados?",
      resposta:
        "As datas que escolheste não têm nenhum dia útil, por isso não precisas de marcar nada. O botão **Submeter pedido** fica bloqueado.",
    },
    {
      pergunta: "Porque é que a app diz que já tenho um pedido para estas datas?",
      resposta:
        "Já tens outro pedido ativo (pendente, aprovado ou a cancelar) que apanha esses dias. Vê o teu histórico e altera ou cancela o pedido antigo.",
    },
    {
      pergunta: "Quem fica a saber do meu pedido?",
      resposta:
        "Quando submetes ou alteras um pedido, os administradores recebem um email com os detalhes. Se o email falhar, a app avisa que o pedido ficou guardado; nesse caso fala diretamente com os RH.",
    },
    {
      pergunta: "Como sei se o meu pedido foi aprovado?",
      resposta:
        "Abre **Férias & ausências** e vê o estado do pedido em **O meu histórico**.",
    },
    {
      pergunta: "Que ficheiros posso anexar?",
      resposta: "PDF ou imagem (JPG ou PNG). O ecrã indica um máximo de 5 MB.",
    },
  ],
};
