// Manual de utilizador — Leads. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "leads",
  titulo: "Leads",
  icone: "Target",
  rota: "/dashboard/leads",
  papeis: ["admin", "administrador", "gestor", "marketing"],
  resumo:
    "Gere as empresas com quem queres trabalhar: prospects (contactos ainda frios) e leads (contactos em acompanhamento comercial). Daqui também envias campanhas por email.",
  paginas: [
    {
      titulo: "Onde encontrar",
      texto:
        "No menu lateral, abre o grupo **COMERCIAL** e carrega em **Leads**. A página chama-se **Marketing Hub**.",
    },
    {
      titulo: "Separadores Leads e Prospects",
      texto:
        "**Prospects** são empresas que ainda não foram trabalhadas. **Leads** são empresas em acompanhamento, com um estado: **Novo**, **Contactado**, **Reunião**, **Proposta**, **Ganho** ou **Perdido**. Os botões do topo atuam sempre sobre o separador aberto.",
    },
    {
      titulo: "Botões do topo",
      texto:
        "**Campanha** abre o envio de email. **Copiar Emails** copia os emails da lista que estás a ver. **Exportar CSV** descarrega essa lista. **Importar** carrega um ficheiro CSV. **Novo Lead** ou **Novo Prospect** cria um registo à mão.",
    },
    {
      titulo: "Filtros",
      texto:
        "Podes pesquisar por nome da empresa ou NIF e filtrar por **Localidade** e **CAE**. Marca **Arquivo** para veres também os registos arquivados.",
    },
    {
      titulo: "Áreas de Negócio (Setores)",
      texto:
        "Ao abrir, vês um cartão por setor com o número de empresas. Carrega em **Ver Mais** para entrar no setor, ou em **Sem Setor Definido** para ver as empresas sem setor. Para voltar, carrega em **Voltar aos Setores**.",
    },
    {
      titulo: "Vistas",
      texto:
        "Dentro de um setor podes escolher **Lista** ou **Cartões**. Nas Leads, a vista Cartões é um quadro com uma coluna por estado. Nas Prospects é uma grelha de cartões. O aviso **Faltam Contactos** indica que a empresa não tem email nem telefone.",
    },
  ],
  tarefas: [
    {
      titulo: "Como adicionar uma empresa",
      passos: [
        "Escolhe o separador **Leads** ou **Prospects**.",
        "Carrega em **Novo Lead** ou **Novo Prospect**.",
        "Preenche o **Nome da Empresa** (obrigatório), o **NIF**, a **Localidade**, o **Setor** e o **Código CAE**.",
        "Em **Informação de Contacto**, preenche a pessoa responsável, o email e o telefone.",
        "Carrega em **Adicionar Registo**.",
      ],
      nota:
        "Se o NIF já existir, aparece o aviso **NIF já existe!**. Para criar um setor novo, escolhe **Outro (Criar novo)…** e escreve o nome.",
    },
    {
      titulo: "Como editar ou completar os dados",
      passos: [
        "Na Lista, carrega no ícone do olho (**Ver / Completar Dados**). No quadro, carrega no lápis do cartão.",
        "Altera o que precisas.",
        "Carrega em **Guardar Alterações**.",
      ],
    },
    {
      titulo: "Como mudar o estado de uma lead",
      passos: [
        "No separador **Leads**, entra num setor.",
        "Na vista **Cartões**, arrasta o cartão para a coluna do novo estado.",
        "Na vista **Lista**, escolhe o estado na coluna **Estado**.",
      ],
      nota: "A alteração fica gravada logo.",
    },
    {
      titulo: "Como passar um prospect a lead",
      passos: [
        "No separador **Prospects**, encontra a empresa.",
        "Carrega no ícone do foguetão (**Mover para Leads** ou **Promover a Lead**).",
        "Confirma em **Promover a Lead**.",
      ],
      nota: "A empresa entra nas Leads com o estado Novo e o prospect fica arquivado.",
    },
    {
      titulo: "Como tornar uma lead cliente",
      passos: [
        "Põe a lead no estado **Ganho**.",
        "Carrega em **Cliente** (no cartão) ou no ícone do aperto de mão (**Criar Cliente Oficial**).",
        "Confirma em **Tornar Cliente**.",
      ],
      nota:
        "A empresa é criada em Entidades e a lead fica arquivada. Se aparecer um erro de NIF, a empresa provavelmente já existe em Entidades.",
    },
    {
      titulo: "Como arquivar ou restaurar um registo",
      passos: [
        "Carrega no ícone de arquivar do registo e confirma em **Arquivar**.",
        "Para o recuperar, marca **Arquivo** nos filtros, encontra o registo e carrega em **Restaurar**. Confirma em **Reativar**.",
      ],
    },
    {
      titulo: "Como importar empresas de um ficheiro CSV",
      passos: [
        "Escolhe o separador de destino (**Leads** ou **Prospects**).",
        "Carrega em **Importar**.",
        "Prepara o ficheiro com as colunas nesta ordem exata: Nome, NIF, Localidade, Contacto, Email, Titular, CAE. A primeira linha é o cabeçalho e as colunas são separadas por ponto e vírgula.",
        "Se quiseres, escolhe um setor em **Atribuir Setor em Lote (Opcional)**.",
        "Carrega para escolher o ficheiro e depois em **Carregar Dados**.",
      ],
      nota: "Empresas com um NIF que já exista nesse separador não são importadas.",
    },
    {
      titulo: "Como exportar ou copiar emails",
      passos: [
        "Aplica os filtros que quiseres e, se for o caso, entra num setor.",
        "Carrega em **Exportar CSV** para descarregar a lista.",
        "Ou carrega em **Copiar Emails** para copiar todos os emails, separados por ponto e vírgula.",
      ],
      nota: "Só sai o que estás a ver: o separador aberto, com os filtros e o setor escolhidos.",
    },
    {
      titulo: "Como enviar uma campanha por email",
      passos: [
        "Filtra a lista até ficares só com as empresas a quem queres enviar (separador, setor, localidade, CAE).",
        "Carrega em **Campanha**.",
        "Confirma, em **Destino atual**, quantos emails vão receber.",
        "Em **Template Brevo (principal)**, escreve o número do template em **Template ID**. Cada email leva o nome do titular ou da empresa.",
        "Em alternativa, escolhe **HTML (secundário)**, escreve o **Assunto da campanha** e cola o HTML.",
        "Carrega em **Enviar Agora**.",
        "No fim, lê o **Resumo**: enviados, inválidos, repetidos e falhados.",
      ],
      nota:
        "O envio começa logo, sem pedido de confirmação. Revê o número de destinatários antes de carregar. Se a caixa **Arquivo** estiver marcada, os arquivados também recebem. Deixa os campos Batch size, Delay e Retries como estão, salvo indicação em contrário.",
    },
  ],
  faq: [
    {
      pergunta: "Qual é a diferença entre prospect e lead?",
      resposta:
        "Um prospect é uma empresa que ainda não foi trabalhada. Uma lead é uma empresa em acompanhamento comercial, com estado. Quando começas a trabalhar um prospect, passa-o a lead.",
    },
    {
      pergunta: "Porque não aparece o botão para tornar cliente?",
      resposta: "Só aparece nas leads ativas com o estado **Ganho**.",
    },
    {
      pergunta: "A quem é enviada a campanha?",
      resposta:
        "A todos os emails da lista que estás a ver no momento, sem repetidos. Por isso, filtra primeiro e confirma o número em **Destino atual**.",
    },
    {
      pergunta: "Devo usar template ou HTML?",
      resposta:
        "Usa sempre o template do Brevo. Com template, cada pessoa recebe o seu próprio email. No modo HTML, os destinatários de um mesmo lote podem ver os endereços uns dos outros.",
    },
    {
      pergunta: "A importação não trouxe todas as linhas. Porquê?",
      resposta:
        "As empresas cujo NIF já existe nesse separador são ignoradas. Confirma também se as colunas estão na ordem certa e separadas por ponto e vírgula.",
    },
    {
      pergunta: "Não vejo o setor que procuro.",
      resposta:
        "Os setores sem empresas não aparecem. Experimenta limpar a pesquisa e os filtros, ou marcar **Arquivo**.",
    },
  ],
};
