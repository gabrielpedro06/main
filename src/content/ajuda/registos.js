// Manual de utilizador — Registos. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "registos",
  titulo: "Registos",
  icone: "History",
  rota: "/dashboard/registos",
  papeis: ["admin", "administrador"],
  resumo:
    "Histórico de tudo o que é criado, alterado ou eliminado na aplicação, por quem e quando, e alertas de segurança. Só os administradores têm acesso.",
  paginas: [
    {
      titulo: "Onde encontrar",
      texto:
        "No menu lateral, abre o grupo **GESTÃO** e carrega em **Registos**. A página chama-se **Registo de atividade** e tem dois separadores: **Atividade** e **Alertas de segurança**.",
    },
    {
      titulo: "Atividade",
      texto:
        "Cada linha diz quem fez o quê e quando. As cores distinguem criações, alterações, eliminações e eventos (por exemplo, entradas e saídas da aplicação ou exportações). Nas alterações vês logo os nomes dos campos alterados. Carrega numa linha para ver o detalhe. As palavras-passe e outros dados secretos aparecem sempre ocultos.",
    },
    {
      titulo: "Filtros",
      texto:
        "Escolhe o tipo de operação (**Tudo**, **Criações**, **Alterações**, **Eliminações**, **Eventos**), o período (**Hoje**, **7 dias**, **30 dias**, **90 dias**, **Tudo**), a pessoa (**Todas as pessoas** ou uma pessoa) e a área (**Todas as áreas** ou uma área da aplicação).",
    },
    {
      titulo: "Alertas de segurança",
      texto:
        "Lista os alertas gerados automaticamente quando acontece algo fora do normal. Cada alerta tem uma gravidade (**Alta**, **Média** ou **Baixa**), um título e uma mensagem. O número ao lado do separador indica quantos alertas estão por ver. Em baixo vês as **Tentativas de entrada falhadas** dos últimos 7 dias, com o email, o motivo, o IP e o país.",
    },
    {
      titulo: "Avisos por email e notificação",
      texto:
        "Quando surge um alerta novo, os administradores recebem um email e uma notificação no sino. A notificação abre diretamente os Alertas de segurança.",
    },
  ],
  tarefas: [
    {
      titulo: "Como saber quem alterou um registo",
      passos: [
        "Abre o separador **Atividade**.",
        "Escolhe a área e, se souberes, a pessoa e o período.",
        "Carrega na linha para ver a tabela **Campo**, **Antes** e **Depois**.",
        "Carrega em **Ver histórico deste registo** para veres todas as alterações a esse registo.",
        "Para voltar à lista completa, carrega no **×** do filtro Histórico.",
      ],
    },
    {
      titulo: "Como ver mais linhas",
      passos: [
        "Desce até ao fim da lista.",
        "Carrega em **Carregar mais**. Aparecem mais 50 linhas de cada vez.",
      ],
    },
    {
      titulo: "Como exportar o registo",
      passos: [
        "Aplica os filtros que quiseres.",
        "Carrega em **Carregar mais** até teres todas as linhas que precisas.",
        "Carrega em **Exportar CSV**.",
      ],
      nota:
        "Só são exportadas as linhas já carregadas no ecrã. A própria exportação fica registada.",
    },
    {
      titulo: "Como tratar um alerta de segurança",
      passos: [
        "Abre o separador **Alertas de segurança**. Por omissão vês os alertas **Por ver**.",
        "Carrega no alerta para ver a conta, o IP, o país e outros detalhes.",
        "Segue as indicações da pergunta frequente sobre esse tipo de alerta.",
        "Quando estiver resolvido, carrega em **Marcar como visto**.",
      ],
      nota:
        "Se houver vários alertas já tratados, usa **Marcar todos como vistos**. Carrega em **Todos** para ver também os já vistos e em **Atualizar** para recarregar a lista.",
    },
  ],
  faq: [
    {
      pergunta: "O que faço com o alerta Várias tentativas falhadas na mesma conta?",
      resposta:
        "Houve pelo menos 5 tentativas falhadas na mesma conta em 15 minutos. Fala com a pessoa: se foi ela que se enganou, não há mais nada a fazer. Se não foi ela, pede-lhe para mudar a palavra-passe e confirma que tem o MFA ativo em **Admin**, separador **Segurança**.",
    },
    {
      pergunta: "O que faço com o alerta Várias tentativas falhadas do mesmo IP?",
      resposta:
        "O mesmo endereço tentou entrar pelo menos 5 vezes sem sucesso em pouco tempo. Vê nas **Tentativas de entrada falhadas** que contas foram tentadas. Se não reconheceres o IP ou o país, avisa as pessoas dessas contas para mudarem a palavra-passe.",
    },
    {
      pergunta: "O que faço com o alerta Tentativa de entrar com conta desativada?",
      resposta:
        "Alguém tentou entrar com a conta de um colaborador desativado. Confirma que a pessoa saiu mesmo da empresa e que a conta está bloqueada (em **Admin**, separador **Segurança**). Se a tentativa não fizer sentido, informa a direção.",
    },
    {
      pergunta: "O que faço com o alerta Entrada a partir de fora de Portugal?",
      resposta:
        "Uma pessoa entrou com sucesso a partir de outro país. Confirma com ela se estava em viagem ou a usar uma ligação de outro país. Se não foi ela, pede-lhe para mudar a palavra-passe e repõe o MFA em **Admin**, separador **Segurança**.",
    },
    {
      pergunta: "O que faço com o alerta Muitos registos apagados?",
      resposta:
        "Uma pessoa apagou muitos registos em 10 minutos. No separador **Atividade**, filtra por essa pessoa e por **Eliminações** para ver o que foi apagado e confirma com ela se era intencional.",
    },
    {
      pergunta: "O que faço com o alerta Muitas palavras-passe vistas?",
      resposta:
        "Uma pessoa viu ou copiou 10 ou mais palavras-passe dos Ativos TI numa hora. Confirma com ela o motivo. Se não houver justificação, muda as palavras-passe dessas plataformas.",
    },
    {
      pergunta: "O que faço com o alerta Exportação grande de dados?",
      resposta:
        "Alguém exportou 500 ou mais linhas de uma vez. Confirma com a pessoa para que precisava dos dados e onde os guardou.",
    },
    {
      pergunta: "O que fazer com os alertas Muitos pedidos recusados pela base de dados, Leitura invulgar de dados sensíveis ou Muitos ficheiros descarregados?",
      resposta:
        "Indicam acessos invulgares a partir de um endereço (IP), que podem não ter passado pelos botões da aplicação. Abre o alerta, anota o IP e a hora e informa de imediato quem gere a aplicação.",
    },
    {
      pergunta: "O que quer dizer a faixa no topo dos alertas?",
      resposta:
        "Mostra quando foi a última recolha automática de dados para os alertas. Se indicar uma falha, avisa quem gere a aplicação: alguns alertas podem não estar a ser gerados.",
    },
    {
      pergunta: "Posso apagar ou corrigir uma linha do registo?",
      resposta: "Não. Ninguém pode alterar nem apagar o registo de atividade a partir da aplicação.",
    },
    {
      pergunta: "Abri o CSV no Excel e uma célula aparece estranha. É normal?",
      resposta:
        "O ficheiro mostra os valores tal como foram gravados. Se uma célula parecer uma fórmula, não a executes: abre o ficheiro só para leitura.",
    },
  ],
};
