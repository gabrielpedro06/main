// Manual de utilizador — Entidades. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "entidades",
  titulo: "Entidades",
  icone: "Building2",
  rota: "/dashboard/clientes",
  papeis: undefined,
  resumo: "Em Entidades guardas a ficha de cada cliente, parceiro ou organismo: dados base, CAE, moradas, pessoas de contacto, documentos, acessos a portais e os projetos associados.",
  paginas: [
    {
      titulo: "Lista de entidades",
      texto: "No topo escolhes o que ver: **Entidades** (clientes ativos), **Organismos** (entidades financiadoras) ou **Arquivados**. Usa **Procurar por Entidade, Sigla, NIF ou Nome de Pessoa…** para encontrar uma ficha. Alterna entre **Cards** e **Lista**. O botão **Exportar Excel** descarrega as entidades visíveis e os respetivos contactos.",
    },
    {
      titulo: "Botões de cada entidade",
      texto: "**Ver Perfil** abre a ficha só para consulta. O lápis (**Edição Rápida**) abre a ficha para editar. **Arquivar Entidade** tira a entidade da lista ativa; nos arquivados aparece **Reativar Entidade**.",
    },
    {
      titulo: "Separadores da ficha",
      texto: "**Geral**: dados base (nome, NIF, sigla, entidade legal, website, foto). **Funções**: se é **Entidade Consultora**, **É Entidade Financiadora?** e **Disponibiliza Cursos?**. **Moradas**, **Pessoas**, **Projetos**, **Atividade** (objeto social e lista de CAE), **Documentos** (certidão permanente e RCBE), **Plano** (plano de subscrição) e **Acessos** (credenciais de portais). As entidades consultoras têm ainda **Configurações**, com os textos usados nas propostas.",
    },
  ],
  tarefas: [
    {
      titulo: "Como criar uma entidade",
      passos: [
        "Abre **Entidades** na barra lateral (grupo **COMERCIAL**) e carrega em **Nova Entidade**.",
        "No separador **Geral**, escreve o **NIF**. Ao chegar aos 9 dígitos, a app procura os dados e preenche o que encontrar.",
        "Confirma ou completa a **Marca / Nome Comercial**, a **Sigla**, a **Entidade Legal** e o **Website**.",
        "Carrega em **Guardar Dados Base**.",
        "Depois de guardada, preenche os outros separadores (pessoas, moradas, documentos, acessos).",
      ],
      nota: "Se já existir uma entidade com o mesmo NIF, a app avisa-te.",
    },
    {
      titulo: "Como marcar uma entidade como organismo financiador",
      passos: [
        "Abre a ficha com **Edição Rápida**.",
        "Vai ao separador **Funções**.",
        "Liga **É Entidade Financiadora?**.",
        "Carrega em **Guardar Funções**.",
      ],
      nota: "Só os organismos aparecem para escolher como entidade financiadora nos projetos e nos programas.",
    },
    {
      titulo: "Como importar os CAE pelo NIF",
      passos: [
        "Abre a ficha com **Edição Rápida** e vai ao separador **Atividade**.",
        "Carrega em **Procurar CAE pelo NIF**.",
        "Os CAE encontrados são guardados automaticamente.",
      ],
      nota: "Para acrescentar um CAE à mão, carrega em **Adicionar CAE**, escreve o código e a descrição e carrega em **Guardar CAE**.",
    },
    {
      titulo: "Como adicionar uma pessoa de contacto",
      passos: [
        "Abre a ficha com **Edição Rápida** e vai ao separador **Pessoas**.",
        "Carrega em **Adicionar Pessoa**.",
        "Preenche o **Nome Completo**, o cargo, o email e o **Telefone / Telemóvel**.",
        "Se esta pessoa assina propostas, marca **Pode fazer propostas comerciais**.",
        "Carrega em **Guardar Pessoa**.",
      ],
    },
    {
      titulo: "Como adicionar uma morada",
      passos: [
        "No separador **Moradas**, carrega em **Adicionar Morada**.",
        "Escreve a **Rua / Lote / Porta** e o **Cód. Postal**. A localidade, o distrito e a região são preenchidos automaticamente.",
        "Se quiseres, indica em **Tipo / Notas Opcionais** se é a sede, o armazém, etc.",
        "Carrega em **Guardar Morada**.",
      ],
    },
    {
      titulo: "Como guardar os códigos da certidão permanente e do RCBE",
      passos: [
        "No separador **Documentos**, preenche o **Código Certidão Permanente** e o **Código RCBE**.",
        "Indica a **Data de Validade** de cada um.",
        "Carrega em **Guardar Documentos**.",
      ],
      nota: "Cada documento mostra se está válido, se expira em breve ou se já expirou.",
    },
    {
      titulo: "Como guardar um acesso a um portal",
      passos: [
        "No separador **Acessos**, carrega em **Nova Credencial**.",
        "Escolhe o **Tipo de Acesso** e preenche o **Utilizador / NIF** e a **Password**.",
        "Carrega em **Guardar Acesso**.",
      ],
      nota: "Para mudar uma credencial, carrega em **Editar**. Se deixares a password em branco, fica a atual.",
    },
    {
      titulo: "Como usar um acesso guardado",
      passos: [
        "No separador **Acessos**, encontra a credencial.",
        "Carrega em **Copiar utilizador** e **Copiar password** (o olho mostra ou esconde a password).",
        "Carrega em **Abrir Portal de Login** para abrir o site.",
      ],
      nota: "Estas credenciais são confidenciais. Não as partilhes fora da plataforma.",
    },
    {
      titulo: "Como ver ou criar projetos de uma entidade",
      passos: [
        "Abre a ficha e vai ao separador **Projetos**.",
        "Vês o **Histórico de Projetos** com o total de investimento e incentivo. Carrega num projeto para o abrir ou em **Iniciar** para ligar o cronómetro.",
        "Para criar um projeto novo já com esta entidade, carrega em **Novo Projeto**.",
      ],
    },
    {
      titulo: "Como arquivar ou reativar uma entidade",
      passos: [
        "Na lista, carrega em **Arquivar Entidade** (ou, dentro da ficha, em **Desativar**).",
        "Confirma.",
        "Para a recuperar, abre **Arquivados** e carrega em **Reativar Entidade**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Porque não consigo adicionar pessoas ou moradas numa entidade nova?",
      resposta: "Primeiro tens de gravar os dados base. No separador **Geral**, carrega em **Guardar Dados Base** e depois volta ao separador que querias.",
    },
    {
      pergunta: "Abri a ficha e não consigo editar nada. Porquê?",
      resposta: "Abriste com **Ver Perfil**, que é só de consulta. Fecha e abre com o lápis **Edição Rápida**.",
    },
    {
      pergunta: "A pesquisa pelo NIF não preencheu nada. O que faço?",
      resposta: "O serviço de consulta pode estar indisponível ou ter atingido o limite diário. Preenche os dados à mão e carrega em **Guardar Dados Base**.",
    },
    {
      pergunta: "Onde aparece o separador Configurações?",
      resposta: "Só nas entidades marcadas como **Entidade Consultora** no separador **Funções**. Aí defines os textos que aparecem nas propostas.",
    },
  ],
};
