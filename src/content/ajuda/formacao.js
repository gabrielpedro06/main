// Manual de utilizador — Cursos e Ações de Formação. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "formacao",
  titulo: "Cursos e Ações de Formação",
  icone: "GraduationCap",
  rota: "/dashboard/acoes-formacao",
  papeis: undefined,
  resumo: "Em Cursos guardas o catálogo de cursos com os seus módulos, textos e preço, usados nas propostas de formação. Em Ações de Formação acompanhas cada formação realizada: planeamento, checklist, certificados, homologações e estatísticas.",
  paginas: [
    {
      titulo: "Cursos",
      texto: "Abre **Cursos** na barra lateral (grupo **PRODUÇÃO**). Os cursos estão separados em **Ativos** e **Inativos**. Usa **Procurar por curso…** para encontrar um curso. Cada cartão tem **Ver Curso**, **Editar** e **Eliminar**.",
    },
    {
      titulo: "Ficha do curso",
      texto: "Tem o **Nome do Curso**, a **Duração total** (soma dos módulos), os **Textos do Curso** (**Enquadramento**, **Objetivos Pedagógicos**, **Metodologia**, **Texto Honorários**, **Plano de Pagamento**), os módulos, **Preço e Considerações** e a opção **Curso Ativo**.",
    },
    {
      titulo: "Ações de Formação",
      texto: "Abre **Ações de Formação** na barra lateral (grupo **PRODUÇÃO**). No topo vês o número de **formações**, **em andamento**, **inscritos**, **certificados** e **h de volume** do ano escolhido. Os botões são **Download** (exporta o ano para Excel), **Definições** (roda dentada) e **Nova Formação**.",
    },
    {
      titulo: "Separadores das Ações de Formação",
      texto: "**Formações**: tabela com as formações do ano. **Checklist**: o estado de cada passo de cada formação. **CCDR** e **DGADR**: o acompanhamento das homologações de cada entidade. **Estatísticas**: totais, comparativo com anos anteriores e gráficos. Escolhe o ano no seletor ao lado da pesquisa.",
    },
    {
      titulo: "Estados da checklist",
      texto: "Cada círculo da checklist pode estar **Concluído**, **Falta assinar**, **Incompleto**, **Em falta** ou **N/A**.",
    },
  ],
  tarefas: [
    {
      titulo: "Como criar um curso",
      passos: [
        "Em **Cursos**, carrega em **Novo Curso**.",
        "Escreve o **Nome do Curso**.",
        "Preenche os **Textos do Curso** que vão aparecer nas propostas.",
        "Para cada módulo, carrega em **+ Criar novo módulo**, escreve o nome, a duração em horas e, se quiseres, o conteúdo. Carrega em **Adicionar Módulo**.",
        "Em **Preço e Considerações**, preenche o **Valor (€)** e as **Considerações**.",
        "Confirma que **Curso Ativo** está marcado e carrega em **Criar Curso**.",
      ],
      nota: "A **Duração total** é calculada sozinha pela soma dos módulos.",
    },
    {
      titulo: "Como editar um curso",
      passos: [
        "No cartão do curso, carrega em **Editar** (ou em **Ver Curso** e depois em **Editar**).",
        "Altera os textos, o preço ou os módulos (**Editar módulo**, **Remover módulo**).",
        "Carrega em **Guardar Alterações**.",
      ],
      nota: "Para tirar um curso das propostas sem o apagar, desmarca **Curso Ativo**.",
    },
    {
      titulo: "Como criar uma ação de formação",
      passos: [
        "Em **Ações de Formação**, escolhe o ano e carrega em **Nova Formação**.",
        "Em **Dados Gerais**, o **Código** é preenchido automaticamente. Preenche o **Nome do Curso**, o **Nome do Formador**, a **Área de Formação**, a **Homologação**, a **Carga (h)**, o **Local** e o **Regime**.",
        "Se já souberes, preenche a **Data início** e a **Data fim**.",
        "Carrega em **Guardar**.",
      ],
      nota: "Na criação basta preencher os campos obrigatórios. Os dados de execução, certificados e homologações preenches depois.",
    },
    {
      titulo: "Como atualizar os dados de uma formação",
      passos: [
        "No separador **Formações**, faz duplo clique numa célula para a editar diretamente.",
        "Para ver todos os campos, carrega em **Abrir edição completa** na linha da formação.",
        "Atualiza participantes, certificados, documentos e pagamento do formador e carrega em **Guardar**.",
      ],
    },
    {
      titulo: "Como atualizar a checklist",
      passos: [
        "Abre o separador **Checklist**.",
        "Carrega no círculo do passo. Cada clique passa ao estado seguinte.",
        "Para deixar uma nota, faz duplo clique na coluna **Notas** da formação.",
      ],
    },
    {
      titulo: "Como acompanhar uma homologação",
      passos: [
        "Abre o separador **CCDR** ou **DGADR**, conforme a entidade.",
        "Faz duplo clique na célula que queres preencher, por exemplo **Nº Homologação** ou **Data Envio Cert.**.",
      ],
    },
    {
      titulo: "Como gerir áreas de formação e homologações",
      passos: [
        "Carrega em **Definições** (roda dentada).",
        "Em **Áreas de Formação**, escreve o nome em **Nova área** e carrega em **Adicionar**.",
        "Em **Homologações**, preenche o **Código** e o **Nome da homologação** e carrega em **Adicionar**.",
      ],
    },
    {
      titulo: "Como exportar as formações para Excel",
      passos: [
        "Escolhe o ano no seletor.",
        "Carrega em **Download**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Porque é que um curso não aparece nas propostas de formação?",
      resposta: "Só aparecem os cursos ativos. Abre o curso, marca **Curso Ativo** e guarda.",
    },
    {
      pergunta: "Não encontro uma formação. O que faço?",
      resposta: "Confirma o ano escolhido no seletor. A página mostra só as formações desse ano.",
    },
    {
      pergunta: "Uma área ou homologação não aparece para escolher. Porquê?",
      resposta: "Pode estar desativada. Abre **Definições** e liga o interruptor ao lado do nome.",
    },
  ],
};
