// Manual de utilizador — Propostas. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "propostas",
  titulo: "Propostas",
  icone: "FileText",
  rota: "/dashboard/propostas",
  papeis: ["admin", "administrador"],
  resumo: "Em Propostas crias, acompanhas e exportas em PDF as propostas comerciais. Há dois tipos: propostas de financiamento e propostas de formação. O tipo depende da empresa consultora escolhida.",
  paginas: [
    {
      titulo: "Lista de propostas",
      texto: "Filtra por tipo (**Todas**, **Financiamento**, **Formação**) e por estado. Usa **Procurar por ID, cliente, curso ou tipo de projeto…** e alterna entre **Cards** e **Lista**. Cada proposta tem os botões **Editar**, **Duplicar** e **Apagar**.",
    },
    {
      titulo: "Estados",
      texto: "Uma proposta pode estar **Em preparação**, **Revisão**, **Enviada**, **Análise**, **Ganha** ou **Perdida**.",
    },
    {
      titulo: "Proposta de financiamento",
      texto: "Preenche-se por passos: **Identificação e Textos**, **Cliente**, **Tipo de Projeto**, **Programa**, um passo por cada serviço escolhido, **Revisão de Descrições**, **Orçamento e Fecho** e **Revisão Final**. O orçamento é calculado automaticamente.",
    },
    {
      titulo: "Proposta de formação",
      texto: "Preenche-se em cinco passos: **Empresa Consultora**, **Cliente**, **Cursos**, **Condições** e **Revisão**. A duração de cada curso é a soma dos seus módulos.",
    },
  ],
  tarefas: [
    {
      titulo: "Como criar uma proposta",
      passos: [
        "Abre **Propostas** na barra lateral (grupo **COMERCIAL**) e carrega em **+ Nova Proposta**.",
        "Em **Empresa consultora**, escolhe a empresa. Se a empresa disponibiliza cursos, abre a proposta de formação; senão, abre a de financiamento.",
        "Preenche cada passo e avança com **Próximo →**. Para voltar, usa **← Anterior**. Também podes saltar para um passo na lista **Passos**.",
        "No último passo, carrega em **Guardar Proposta**.",
      ],
      nota: "Para começar de novo, carrega em **Limpar** no topo. O formulário volta ao início.",
    },
    {
      titulo: "Como preencher uma proposta de financiamento",
      passos: [
        "Em **Identificação e Textos**, escolhe a empresa e a **Pessoa da consultora (responsável)**, revê a **Data de Emissão**, a **Validade (dias)** e os textos de apresentação.",
        "Em **Cliente**, escolhe o cliente em **Selecionar Cliente** e o contacto em **Selecionar Contacto**.",
        "Em **Tipo de Projeto**, escolhe um ou mais tipos.",
        "Em **Programa**, escolhe o programa e o aviso, se o tipo de projeto o exigir.",
        "Em cada passo de serviço, confirma as atividades e tarefas incluídas.",
        "Em **Orçamento e Fecho**, escolhe o **Modo de honorário**, os valores, a **Taxa de IVA (%)** e o **Plano de Pagamentos**.",
        "Em **Revisão Final**, confere o **Resumo Financeiro** e carrega em **Guardar Proposta** ou **Gerar PDF**.",
      ],
      nota: "As parcelas do plano de pagamentos não podem passar dos 100%.",
    },
    {
      titulo: "Como preencher uma proposta de formação",
      passos: [
        "Em **Empresa Consultora**, confirma a empresa, a **Pessoa da consultora** e a referência da proposta.",
        "Em **Cliente**, escolhe o cliente e o contacto.",
        "Em **Cursos**, escolhe os cursos em **Cursos disponíveis**. Podes editar ou remover módulos de cada curso.",
        "Em **Condições**, revê os textos da entidade, os textos dos cursos e a secção **Obrigações e Termos**.",
        "Em **Revisão**, confere o **Resumo Financeiro** e carrega em **Guardar Proposta** ou **Gerar PDF**.",
      ],
      nota: "Só aparecem os cursos ativos em **Cursos**.",
    },
    {
      titulo: "Como gerar o PDF de uma proposta",
      passos: [
        "Abre a proposta com **Editar**.",
        "Vai até ao último passo.",
        "Carrega em **Gerar PDF**.",
      ],
      nota: "Ao gerar o PDF, a proposta também é guardada.",
    },
    {
      titulo: "Como mudar o estado de uma proposta",
      passos: [
        "Na lista, em vista **Cards**, escolhe o novo estado no campo **Estado** da proposta.",
        "Ou abre a proposta com **Editar** e muda o **Estado** no primeiro passo. Depois guarda.",
      ],
    },
    {
      titulo: "Como duplicar uma proposta",
      passos: [
        "Na lista, carrega em **Duplicar** na proposta que queres copiar.",
        "A cópia fica com um número novo e no estado **Em preparação**.",
        "Abre a cópia com **Editar** e ajusta o que for preciso.",
      ],
    },
    {
      titulo: "Como apagar uma proposta",
      passos: [
        "Na lista, carrega em **Apagar**.",
        "Escreve **APAGAR** na caixa de confirmação e confirma.",
      ],
      nota: "Não pode ser desfeito.",
    },
  ],
  faq: [
    {
      pergunta: "Porque não vejo a empresa consultora na lista?",
      resposta: "Só aparecem entidades ativas marcadas como **Entidade Consultora**. Em **Entidades**, abre a ficha, vai a **Funções**, liga **Entidade Consultora** e guarda.",
    },
    {
      pergunta: "Como passo a fazer propostas de formação em vez de financiamento?",
      resposta: "O tipo depende da empresa consultora. Se a empresa tiver **Disponibiliza Cursos?** ligado em **Entidades**, as propostas novas são de formação.",
    },
    {
      pergunta: "Onde mudo os textos que aparecem em todas as propostas?",
      resposta: "Na ficha da empresa consultora em **Entidades**, separador **Configurações**.",
    },
    {
      pergunta: "Porque é que a pessoa responsável não aparece para escolher?",
      resposta: "Na ficha da empresa consultora, separador **Pessoas**, a pessoa tem de ter marcado **Pode fazer propostas comerciais**.",
    },
  ],
};
