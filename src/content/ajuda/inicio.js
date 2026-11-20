// Manual de utilizador — Início. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "inicio",
  titulo: "Início",
  icone: "House",
  rota: "/dashboard",
  papeis: undefined,
  resumo: "A página Início é o teu ponto de partida do dia: picar o ponto, ver as tarefas mais urgentes, controlar o cronómetro de trabalho, ler as notificações e ver quem da equipa está online.",
  paginas: [
    {
      titulo: "Barra lateral (menu)",
      texto: "À esquerda tens o menu com todas as áreas da app: **Início**, **Comunicação Interna** e os grupos **PLANEAMENTO**, **PRODUÇÃO**, **COMERCIAL** e **GESTÃO**. Carrega no nome de um grupo para o abrir ou fechar. Carrega no logótipo, no topo, para encolher ou alargar o menu. Só vês as áreas a que tens acesso.",
    },
    {
      titulo: "Cartão com o teu nome",
      texto: "No fundo da barra lateral está o cartão com a tua foto, o teu nome e o teu papel. Carrega nele para abrir o menu da conta: **O meu perfil**, **Férias & ausências**, **Pedido de deslocação**, **Ajuda**, **Tema**, **Som das notificações** e **Terminar sessão**.",
    },
    {
      titulo: "No telemóvel",
      texto: "Em ecrãs pequenos o menu fica escondido. No fundo do ecrã aparece uma barra com **Início**, **Agenda**, **Tarefas**, **Projetos** e **Menu**. Carrega em **Menu** (ou no ícone de três riscos, no topo) para abrir o menu completo.",
    },
    {
      titulo: "Cabeçalho",
      texto: "No topo vês a data, a hora, uma saudação com o teu nome e a frase do dia. O botão **Notificações** (com o sino) mostra quantas novidades tens por ver.",
    },
    {
      titulo: "Foco de hoje / A trabalhar agora",
      texto: "Se não tens nenhum cronómetro ligado, este cartão mostra quantas prioridades tens para hoje e um botão para as abrir. Se tens um cronómetro a contar, mostra **A trabalhar agora**, o nome da tarefa, o tempo decorrido e o botão **Parar**. Carrega no cartão para ir para essa tarefa.",
    },
    {
      titulo: "Números do topo",
      texto: "Quatro atalhos: **Horas este mês** (abre o teu histórico de assiduidade), **Projetos ativos**, **Entidades** e **Publicações**. Carrega em qualquer um para abrir a página correspondente.",
    },
    {
      titulo: "Continuar onde paraste",
      texto: "Mostra as últimas tarefas em que trabalhaste. Carrega no cartão para abrir a tarefa ou no botão de play para retomar o cronómetro.",
    },
    {
      titulo: "As minhas tarefas",
      texto: "Lista as tarefas em que és responsável ou em que foste incluído, em três separadores: **Para hoje** (prazo hoje ou atrasado), **Próximas** e **Em análise**. Cada linha mostra a entidade, o projeto e o prazo. O botão de play liga o cronómetro. **Ver todas** abre a página Tarefas.",
    },
    {
      titulo: "Cartão de assiduidade (ponto)",
      texto: "Mostra o teu estado (**Fora de serviço**, **A trabalhar** ou **Em pausa**), as horas feitas hoje num círculo de 8 horas, o que **Falta** (ou as horas **Extra**), a **Saída prevista** e o **Progresso**. Os botões mudam conforme o estado: **Iniciar dia de trabalho**, **Pausar**, **Retomar** e **Terminar**. O ícone de calendário, no canto, mostra os **Últimos registos**.",
    },
    {
      titulo: "Equipa online",
      texto: "Mostra os colegas que já picaram o ponto hoje e ainda não saíram, com a hora de entrada. Se um colega tem medalhas, aparece um pequeno emblema no avatar (com o número de medalhas, se tiver mais do que uma). Carrega num colega para ver o cartão de perfil, com contactos, aniversário e medalhas.",
    },
    {
      titulo: "Aniversários",
      texto: "Mostra os próximos aniversários da equipa. Quem faz anos hoje aparece com a indicação **Faz anos hoje!**.",
    },
    {
      titulo: "Calendário",
      texto: "Em **PLANEAMENTO** > **Calendário**, na barra lateral, abre uma janela com feriados, aniversários, férias e baixas aprovadas e os teus eventos pessoais. Tem as vistas **Dia**, **Mês** e **Ano** e o botão **Hoje**.",
    },
  ],
  tarefas: [
    {
      titulo: "Como picar o ponto de entrada",
      passos: [
        "Abre **Início** na barra lateral.",
        "No cartão de assiduidade, carrega em **Iniciar dia de trabalho**.",
        "Na janela **Bom dia! Vamos focar?**, carrega em **Iniciar Dia**.",
      ],
      nota: "Se já tinhas terminado o dia e voltas a iniciar, a app pergunta **Retomar Sessão?**. Carrega em **Confirmar Retoma** e o intervalo fica registado como pausa.",
    },
    {
      titulo: "Como fazer uma pausa",
      passos: [
        "No cartão de assiduidade, carrega em **Pausar**.",
        "Quando voltares, carrega em **Retomar**.",
      ],
      nota: "Ao pausar, qualquer cronómetro de tarefa que esteja a contar é parado automaticamente.",
    },
    {
      titulo: "Como picar o ponto de saída",
      passos: [
        "No cartão de assiduidade, carrega em **Terminar**.",
        "Na janela **Terminar Registo**, revê a lista de tarefas trabalhadas hoje e desmarca o que não terminaste.",
        "Se quiseres, escreve um resumo em **Notas Adicionais (Opcional)**.",
        "Carrega em **Confirmar Saída**.",
      ],
      nota: "Ao terminar o dia, o cronómetro de tarefa que estiver ligado também é parado.",
    },
    {
      titulo: "Como corrigir ou acrescentar um registo de ponto",
      passos: [
        "Carrega em **Horas este mês**, nos números do topo (ou em **Ver histórico** nos **Últimos registos** do cartão de assiduidade).",
        "Na janela **Histórico de Assiduidade**, usa as setas para escolher o mês.",
        "Para corrigir um dia, carrega no ícone de lápis (**Editar este registo**), altera as horas ou a pausa, preenche o **Motivo da Correção** e carrega em **Guardar**.",
        "Para um dia que falta, carrega em **Inserir Registo**, preenche **Data**, **Entrada**, **Saída** e o **Motivo (Obrigatório)** e carrega em **Inserir Registo**.",
      ],
      nota: "O motivo é sempre obrigatório. Se o dia já tiver registo, não podes criar outro: edita o que existe.",
    },
    {
      titulo: "Como ligar o cronómetro numa tarefa",
      passos: [
        "Em **As minhas tarefas** ou em **Continuar onde paraste**, carrega no botão de play da tarefa.",
        "Se ainda não picaste o ponto, a app pergunta se queres começar. Carrega em **Sim, iniciar ponto** (ou **Não iniciar agora**).",
        "Se já tinhas outro cronómetro ligado, escolhe **Sim, Trocar** para passar para a nova tarefa ou **Manter Atual** para ficar como estava.",
      ],
      nota: "Só podes ter um cronómetro ligado de cada vez.",
    },
    {
      titulo: "Como parar o cronómetro",
      passos: [
        "Carrega em **Parar** no cartão **A trabalhar agora** (ou no botão de stop da tarefa).",
        "Se quiseres, escreve uma nota breve.",
        "Escolhe o novo estado da tarefa: **Pendente**, **Em curso**, **Em analise**, **Concluido** ou **Cancelado**.",
        "Se escolheres **Em analise**, indica em **Encaminhar para** quem tem de responder e a **Data expectavel de resposta**.",
        "Carrega em **Guardar e parar**.",
      ],
    },
    {
      titulo: "Como ver e tratar as notificações",
      passos: [
        "No topo do Início, carrega em **Notificações** (o sino).",
        "Em cada notificação, carrega no botão principal (por exemplo **Abrir projeto** ou **Rever e aprovar**) para ir ao assunto.",
        "Carrega em **Lida** para a tirar da lista, ou em **Marcar todas como lidas**.",
      ],
      nota: "Os pedidos de aprovação de conteúdos de marketing só desaparecem depois de aprovares ou pedires alterações.",
    },
    {
      titulo: "Como adicionar um evento pessoal ao calendário",
      passos: [
        "Na barra lateral, abre **PLANEAMENTO** > **Calendário**.",
        "Escolhe a vista **Dia** (ou, na vista **Mês**, escolhe o dia e carrega em **Abrir dia**).",
        "Carrega numa hora, escreve o título e carrega em **Enter** ou em **Adicionar**.",
      ],
      nota: "Podes arrastar os teus eventos para mudar a hora, e editá-los ou apagá-los com os botões do próprio evento.",
    },
    {
      titulo: "Como ver o perfil de um colega",
      passos: [
        "Em **Equipa online**, carrega na foto do colega.",
        "Vês os contactos, o aniversário e a vitrine de medalhas.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Esqueci-me de picar o ponto. O que faço?",
      resposta: "Abre o **Histórico de Assiduidade** (carrega em **Horas este mês**) e usa **Inserir Registo** ou edita o registo do dia. Tens de indicar sempre o motivo.",
    },
    {
      pergunta: "Porque é que o meu cronómetro parou sozinho?",
      resposta: "O cronómetro de tarefa para automaticamente quando carregas em **Pausar** ou **Terminar** no cartão de assiduidade.",
    },
    {
      pergunta: "Como é calculada a saída prevista?",
      resposta: "É a hora de entrada mais 8 horas de trabalho mais 1 hora de almoço (ou as pausas que já fizeste, se forem mais), e nunca antes das 18:00.",
    },
    {
      pergunta: "Porque é que um colega não aparece na Equipa online?",
      resposta: "Só aparece quem picou o ponto hoje e ainda não terminou o dia.",
    },
    {
      pergunta: "Como ganho medalhas?",
      resposta: "As medalhas são atribuídas pelos Recursos Humanos. Aparecem no teu avatar e no teu cartão de perfil.",
    },
    {
      pergunta: "Apareceu um aviso sobre o Cartão de Cidadão. O que significa?",
      resposta: "A validade do teu Cartão de Cidadão está a terminar ou já terminou. Carrega em **Atualizar Agora**, atualiza os dados no teu perfil e informa os Recursos Humanos.",
    },
    {
      pergunta: "Não vejo uma área que um colega vê no menu. Porquê?",
      resposta: "O menu mostra apenas as áreas permitidas para o teu papel. Se precisares de acesso, fala com a tua chefia ou com um administrador.",
    },
  ],
};
