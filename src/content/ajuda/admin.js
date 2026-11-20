// Manual de utilizador — Administração. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "admin",
  titulo: "Administração",
  icone: "Shield",
  rota: "/dashboard/admin",
  papeis: ["admin", "administrador"],
  resumo:
    "Painel reservado aos administradores. Mostra o que se passa na empresa (horas, projetos, equipa) e permite mudar o papel de cada pessoa e repor a autenticação de dois fatores.",
  paginas: [
    {
      titulo: "Onde encontrar",
      texto: "No menu lateral, abre o grupo **GESTÃO** e carrega em **Admin**.",
    },
    {
      titulo: "Visão geral",
      texto:
        "Resumo do dia: colaboradores ativos, quem está online, horas desta semana, projetos em curso, tarefas em atraso e pedidos por aprovar. Tens ainda as horas registadas por dia, projetos por estado, projetos com mais horas este mês, a área comercial dos últimos 90 dias, a atividade recente, os aniversários dos próximos 30 dias e atalhos para outras áreas.",
    },
    {
      titulo: "Tempo & Projetos",
      texto:
        "Horas registadas por colaborador, projeto, atividade e tarefa, com gráficos. Mostra também a **Equipa Online** e o **Financiamento de Projetos** (investimento, incentivo e autofinanciamento).",
    },
    {
      titulo: "Equipa & Assiduidade",
      texto:
        "Tabela com cada colaborador: presença, tempo em tarefas e o que está a fazer agora.",
    },
    {
      titulo: "Gestão individual",
      texto:
        "Escolhe um colaborador para veres as atividades, tarefas e subtarefas abertas, o registo de tempo e a **Tag de Perfil** (o papel da pessoa na aplicação).",
    },
    {
      titulo: "Segurança",
      texto:
        "Lista de todas as pessoas com o estado da autenticação de dois fatores (MFA): **Ativo desde** uma data ou **Por configurar**, e a última entrada. Aqui repões o MFA e bloqueias contas de pessoas inativas que ainda conseguem entrar.",
    },
    {
      titulo: "Filtros de período",
      texto:
        "Nos separadores Tempo & Projetos, Equipa & Assiduidade e Gestão individual podes escolher o **Período** (**Dia**, **Mês** ou **Intervalo**) e um projeto. Em Tempo & Projetos podes também filtrar por colaborador.",
    },
  ],
  tarefas: [
    {
      titulo: "Como mudar o papel de uma pessoa",
      passos: [
        "Abre o separador **Gestão individual**.",
        "Em **Selecionar Colaborador**, escolhe a pessoa.",
        "Em **Tag de Perfil**, escolhe o novo papel: **Colaborador**, **Gestor**, **Marketing** ou **Admin**.",
        "Na janela **Confirmar alteração de perfil**, escreve a tua palavra-passe do Bizin.",
        "Carrega em **Confirmar**.",
      ],
      nota:
        "O papel define o que a pessoa vê no menu e as páginas a que tem acesso. A alteração fica registada.",
    },
    {
      titulo: "Como repor o MFA de uma pessoa",
      passos: [
        "Confirma primeiro com a própria pessoa (por exemplo, por telefone) que perdeu ou trocou de telemóvel.",
        "Abre o separador **Segurança**.",
        "Procura a pessoa por nome ou email.",
        "Carrega em **Repor MFA** e confirma em **Repor MFA**.",
        "Avisa a pessoa: na próxima entrada, depois da palavra-passe, vai ler um QR novo com a app de autenticação.",
      ],
      nota:
        "A app de autenticação antiga deixa de funcionar no Bizin. A reposição fica registada no histórico.",
    },
    {
      titulo: "Como bloquear contas de pessoas inativas",
      passos: [
        "Abre o separador **Segurança**.",
        "Se aparecer o aviso de que há colaboradores inativos que ainda conseguem entrar no Bizin, confirma os nomes.",
        "Carrega em **Bloquear acesso**.",
      ],
      nota:
        "Na lista, **Inativo · ainda entra** indica uma conta desativada que ainda não foi bloqueada. **Inativo · bloqueado** indica que já está tudo bem.",
    },
    {
      titulo: "Como desativar a conta de um colaborador que saiu",
      passos: [
        "Vai a **Recursos Humanos** e abre o colaborador para editar.",
        "Carrega em **Desativar** e confirma.",
        "A pessoa deixa de conseguir entrar na aplicação. Os dados históricos mantêm-se.",
      ],
      nota:
        "Para reativar, em Recursos Humanos abre **Colab. Inativos** e carrega em **Reativar**.",
    },
    {
      titulo: "Como ver as horas de um projeto ou de uma pessoa",
      passos: [
        "Abre o separador **Tempo & Projetos**.",
        "Escolhe o **Período** e as datas.",
        "Carrega no botão do projeto para escolher um projeto ou **Todos os Projetos**.",
        "Se quiseres, escolhe um colaborador na lista.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Porque me pede a palavra-passe para mudar um papel?",
      resposta:
        "É uma proteção extra: mudar papéis dá ou retira acessos, por isso confirmas que és mesmo tu.",
    },
    {
      pergunta: "Não encontro o papel Marketing plus na Tag de Perfil.",
      resposta:
        "Esse papel não está disponível nesta lista. Pede a quem gere a aplicação para o atribuir.",
    },
    {
      pergunta: "Uma pessoa diz que não consegue entrar porque mudou de telemóvel. O que faço?",
      resposta:
        "Confirma a identidade da pessoa e, no separador **Segurança**, carrega em **Repor MFA**. Na próxima entrada ela configura a app de autenticação de novo.",
    },
    {
      pergunta: "O botão Repor MFA está desativado. Porquê?",
      resposta: "A pessoa ainda não configurou o MFA, por isso não há nada para repor.",
    },
    {
      pergunta: "Onde vejo quem alterou o quê?",
      resposta:
        "No menu **Registos**. Na Visão geral, a caixa **Atividade recente** mostra as últimas alterações e leva-te lá.",
    },
  ],
};
