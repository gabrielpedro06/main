// Manual de utilizador — Ativos TI. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "ativos-ti",
  titulo: "Ativos TI",
  icone: "Monitor",
  rota: "/dashboard/ativos-ti",
  papeis: ["admin", "administrador", "gestor", "marketing plus"],
  resumo:
    "Inventário do material informático, do software e licenças e dos acessos a plataformas da organização. Aqui sabes quem tem cada equipamento e quando acaba cada garantia.",
  paginas: [
    {
      titulo: "Onde encontrar",
      texto: "No menu lateral, abre o grupo **GESTÃO** e carrega em **Ativos TI**.",
    },
    {
      titulo: "Topo da página",
      texto:
        "Tens os botões **Excel**, **PDF** e **Novo Registo**. Por baixo estão os separadores e os totais de equipamentos em uso e em stock. Se houver garantias a acabar, aparece **garantias a rever**: carrega para ver esses equipamentos.",
    },
    {
      titulo: "Separadores",
      texto:
        "**Painel** é o resumo: estado do parque, equipamentos por entidade, garantias, equipamento por colaborador, software, acessos e equipamentos recentes. **Equipamentos** tem o material ativo. **Abatidos** tem o material retirado de uso. **Software** tem as licenças e aplicações. **Acessos** tem os utilizadores e palavras-passe das plataformas.",
    },
    {
      titulo: "Estados do equipamento",
      texto:
        "**Em stock** (disponível), **Em uso** (atribuído a alguém), **Em reparação**, **Reservado** e **Abatido** (retirado de uso).",
    },
    {
      titulo: "Garantias",
      texto:
        "Cada equipamento mostra quanto tempo de garantia falta. Uma garantia é dada como a acabar nos últimos 90 dias. Os equipamentos sem prazo registado aparecem como **Sem garantia**.",
    },
    {
      titulo: "Vistas dos equipamentos",
      texto:
        "No separador Equipamentos escolhes **Lista**, **Cartões** ou **Pessoas**. A vista Pessoas mostra o kit de cada colaborador e, à parte, o material **Sem colaborador**. À esquerda tens **Filtros** por categoria, estado, garantia e entidade.",
    },
  ],
  tarefas: [
    {
      titulo: "Como registar um equipamento",
      passos: [
        "Carrega em **Novo Registo**.",
        "Escolhe **Equipamento** e o tipo (por exemplo, Portátil ou Monitor).",
        "Confirma o **Nº Inventário** sugerido e preenche o **Modelo** e, se quiseres, a **Descrição**.",
        "Em **Atribuição**, escolhe o colaborador, o **Estado** e a **Entidade**.",
        "Em **Compra & garantia**, preenche o fornecedor, a fatura, a **Data de aquisição** e o **Prazo de garantia**.",
        "Carrega em **Guardar**.",
      ],
      nota:
        "Depois de preencheres a data de aquisição, podes usar **Garantia rápida** (+1, +2 ou +3 anos) para calcular o prazo.",
    },
    {
      titulo: "Como atribuir um equipamento a um colaborador",
      passos: [
        "Carrega no equipamento para abrir o detalhe.",
        "Em **Atribuído a**, carrega em **Atribuir** (ou **Reatribuir** se já tiver dono).",
        "Escolhe o colaborador na lista.",
      ],
      nota:
        "Também podes fazê-lo na vista **Pessoas**: escolhe a pessoa e usa **Atribuir do stock…**. O equipamento passa a Em uso.",
    },
    {
      titulo: "Como devolver um equipamento ao stock",
      passos: [
        "Abre o detalhe do equipamento.",
        "Carrega em **Devolver ao stock**.",
      ],
      nota: "O equipamento fica sem colaborador e passa a Em stock.",
    },
    {
      titulo: "Como abater ou reativar um equipamento",
      passos: [
        "Abre o detalhe do equipamento.",
        "Carrega em **Abater** e confirma em **Inativar**.",
        "Para o recuperar, vai ao separador **Abatidos**, abre-o, carrega em **Reativar** e confirma.",
      ],
    },
    {
      titulo: "Como encontrar um equipamento",
      passos: [
        "Abre o separador **Equipamentos**.",
        "Escreve na pesquisa um número de inventário, modelo, colaborador, fornecedor ou fatura.",
        "Usa os **Filtros** à esquerda e a ordenação, se precisares.",
        "Carrega em **Limpar tudo** para voltar a ver todos.",
      ],
    },
    {
      titulo: "Como registar software ou uma licença",
      passos: [
        "Carrega em **Novo Registo** e escolhe **Software**.",
        "Escolhe o tipo e preenche o **Nome**, a **Versão** e a **Chave de licença**, se houver.",
        "Escolhe a **Entidade** e o **Estado**.",
        "Preenche o fornecedor, a fatura, a **Data de aquisição** e a **Data de expiração**.",
        "Carrega em **Guardar**.",
      ],
    },
    {
      titulo: "Como registar um acesso a uma plataforma",
      passos: [
        "Carrega em **Novo Registo** e escolhe **Acesso**.",
        "Preenche o **Nome da plataforma / sistema**, o **URL de acesso** e o **Utilizador / Email**.",
        "Escreve a **Palavra-passe**.",
        "Escolhe o **Estado** e carrega em **Guardar**.",
      ],
      nota:
        "Ao editar um acesso, se deixares a palavra-passe em branco mantém-se a que estava guardada.",
    },
    {
      titulo: "Como ver ou copiar uma palavra-passe",
      passos: [
        "Abre o separador **Acessos** e encontra a plataforma.",
        "Carrega no olho (**Mostrar**) para ver a palavra-passe, ou no ícone de copiar (**Copiar palavra-passe**).",
        "Carrega outra vez no olho (**Ocultar**) quando terminares.",
      ],
      nota:
        "Cada vez que revelas ou copias uma palavra-passe fica registado. Usa só quando precisas e não a partilhes por chat ou email.",
    },
    {
      titulo: "Como inativar ou reativar um acesso ou software",
      passos: [
        "No cartão do acesso, carrega no botão de ligar/desligar (**Marcar como inativo** ou **Reativar acesso**).",
        "No software, usa **Arquivar software** ou **Reativar software**.",
        "Confirma na janela que aparece.",
      ],
    },
    {
      titulo: "Como exportar a lista de equipamentos",
      passos: [
        "Carrega em **Excel** para descarregar uma folha com o material atribuído e o material em stock.",
        "Carrega em **PDF** para descarregar uma página por colaborador e uma página com o material em stock.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Qual é a diferença entre Abatido e Em stock?",
      resposta:
        "Em stock é material disponível para atribuir. Abatido é material retirado de uso (avariado, vendido, abatido ao inventário). Os abatidos aparecem no separador Abatidos.",
    },
    {
      pergunta: "O que quer dizer A rever nos acessos?",
      resposta:
        "São acessos expirados, bloqueados ou inativos. Confirma se ainda são precisos e atualiza ou inativa-os.",
    },
    {
      pergunta: "Porque não aparece a palavra-passe de um acesso?",
      resposta:
        "Se aparece um traço, não há palavra-passe guardada. Edita o acesso e escreve-a.",
    },
    {
      pergunta: "O número de inventário é obrigatório?",
      resposta:
        "Sim. A aplicação sugere o número seguinte. Confirma que não está repetido, sobretudo se outra pessoa estiver a registar material ao mesmo tempo.",
    },
    {
      pergunta: "Onde vejo todo o equipamento de uma pessoa?",
      resposta:
        "No separador **Equipamentos**, escolhe a vista **Pessoas** e carrega no nome. No Painel também tens **Equipamento por colaborador**.",
    },
  ],
};
