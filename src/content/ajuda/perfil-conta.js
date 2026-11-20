// Manual de utilizador — Perfil e conta. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "perfil-conta",
  titulo: "Perfil e conta",
  icone: "UserCog",
  rota: "/dashboard/perfil",
  papeis: undefined,
  resumo: "Como entrar na app com a verificação em dois passos, recuperar a password, atualizar os teus dados e a tua foto, mudar o tema e terminar sessão.",
  paginas: [
    {
      titulo: "Ecrã de entrada",
      texto: "Em **Entrar na sua conta** escreve o **Email** e a **Password** e carrega em **Entrar**. Se o Caps Lock estiver ligado, aparece um aviso. O link **Esqueceu a palavra-passe?** serve para recuperar o acesso.",
    },
    {
      titulo: "Verificação em dois passos (2FA)",
      texto: "Todas as contas usam verificação em dois passos. Depois da password, a app pede o **Código de segurança**: o código de 6 dígitos que aparece na app autenticadora do teu telemóvel (Google Authenticator, Microsoft Authenticator ou Authy). O código muda a cada poucos segundos, por isso usa sempre o que está à vista.",
    },
    {
      titulo: "Menu da conta",
      texto: "Carrega no cartão com o teu nome, no fundo da barra lateral. Aí tens **O meu perfil**, **Férias & ausências**, **Pedido de deslocação**, **Ajuda**, **Tema**, **Som das notificações** e **Terminar sessão**.",
    },
    {
      titulo: "O meu perfil",
      texto: "No topo vês a tua foto e a percentagem do perfil preenchida. As secções são: **Informação básica**, **Dados pessoais**, **Fiscal e civil**, **Veículos**, **Empresa** e **Segurança**. Quando alteras alguma coisa aparece, em baixo, a barra **Tens alterações por guardar** com os botões **Descartar** e **Guardar alterações**.",
    },
    {
      titulo: "Dados fiscais e civis",
      texto: "Esta secção é privada: só tu e os Recursos Humanos a veem. Tem o NIF, o NISS e o Cartão de Cidadão. Ao alterar o número ou a validade do cartão, os Recursos Humanos são avisados automaticamente.",
    },
    {
      titulo: "Dados da empresa",
      texto: "Mostra a empresa, a função, o tipo de contrato e a data em que entraste. Estes dados são só de leitura: quem os altera são os Recursos Humanos.",
    },
    {
      titulo: "Segurança",
      texto: "Aqui mudas a password e vês o estado da **Autenticação de dois fatores** (**Ativa** ou **Por configurar**). O botão **Mudar de telemóvel** serve para passar o 2FA para um telemóvel novo.",
    },
    {
      titulo: "Tema",
      texto: "Em **Tema**, no menu da conta, escolhes as cores da app. Há o separador **Celebrações** (temas de épocas festivas) e o separador **Básicos**. O interruptor **Decorações animadas** liga ou desliga a neve, os confettis e os enfeites. A escolha fica guardada neste dispositivo.",
    },
  ],
  tarefas: [
    {
      titulo: "Como entrar pela primeira vez (configurar o 2FA)",
      passos: [
        "Instala no telemóvel uma app autenticadora (Google Authenticator, Microsoft Authenticator ou Authy).",
        "Na app Bizin, escreve o email e a password e carrega em **Entrar**.",
        "No ecrã **Ative a verificação em dois passos**, carrega em **Começar configuração**.",
        "Na app autenticadora, lê o QR code que aparece no ecrã. Se não conseguires, copia a chave com **Copiar** e introdu-la à mão.",
        "Escreve o código de 6 dígitos que aparece na app autenticadora.",
        "Carrega em **Ativar e entrar**.",
      ],
    },
    {
      titulo: "Como entrar no dia a dia",
      passos: [
        "Escreve o **Email** e a **Password** e carrega em **Entrar**.",
        "Abre a app autenticadora no telemóvel.",
        "Escreve o código de 6 dígitos da Bizin Manager e carrega em **Verificar e entrar**.",
      ],
    },
    {
      titulo: "Como recuperar a password",
      passos: [
        "No ecrã de entrada, carrega em **Esqueceu a palavra-passe?**.",
        "Escreve o teu email e carrega em **Enviar link de recuperação**.",
        "Abre o email que recebeste e carrega no link (vê também a pasta de spam).",
        "Escreve a **Nova password** e repete-a em **Confirmar password**.",
        "Se for pedido, escreve o código da app autenticadora.",
        "Carrega em **Atualizar password**.",
      ],
      nota: "A nova password tem de ter pelo menos 8 caracteres, com letras e números. Se o email não chegar, usa **Reenviar email**.",
    },
    {
      titulo: "Como alterar os teus dados",
      passos: [
        "Carrega no cartão com o teu nome e escolhe **O meu perfil**.",
        "Escolhe a secção (por exemplo **Dados pessoais**).",
        "Altera os campos que quiseres.",
        "Carrega em **Guardar alterações**.",
      ],
      nota: "O **Email de login** não pode ser alterado aqui.",
    },
    {
      titulo: "Como mudar a foto de perfil",
      passos: [
        "Em **O meu perfil**, carrega na tua foto (**Alterar foto**) e escolhe uma imagem.",
        "Na janela **Recortar foto**, arrasta a imagem para a posicionar e usa a roda do rato para aproximar.",
        "Carrega em **Usar esta foto**.",
        "Carrega em **Guardar alterações**.",
      ],
    },
    {
      titulo: "Como adicionar um veículo",
      passos: [
        "Em **O meu perfil**, abre **Veículos**.",
        "Escreve a matrícula e a marca e modelo.",
        "Carrega em **Adicionar**.",
        "Carrega em **Guardar alterações**.",
      ],
      nota: "Os veículos registados aparecem depois nos pedidos de deslocação.",
    },
    {
      titulo: "Como mudar a password (com sessão iniciada)",
      passos: [
        "Em **O meu perfil**, abre **Segurança**.",
        "Escreve a nova password em **Nova password**.",
        "Carrega em **Guardar alterações**.",
      ],
      nota: "Se deixares o campo em branco, a password atual mantém-se.",
    },
    {
      titulo: "Como passar o 2FA para um telemóvel novo",
      passos: [
        "Instala a app autenticadora no telemóvel novo.",
        "Em **O meu perfil** > **Segurança**, carrega em **Mudar de telemóvel**.",
        "Lê o novo QR code com o telemóvel novo.",
        "Escreve o código de 6 dígitos e carrega em **Confirmar**.",
      ],
      nota: "O telemóvel antigo deixa de funcionar assim que confirmares. Precisas de ter sessão iniciada para isto.",
    },
    {
      titulo: "Como mudar o tema",
      passos: [
        "Carrega no cartão com o teu nome e escolhe **Tema**.",
        "Escolhe um tema em **Celebrações** ou em **Básicos**.",
        "A mudança é imediata.",
      ],
    },
    {
      titulo: "Como terminar sessão",
      passos: [
        "Carrega no cartão com o teu nome, no fundo da barra lateral.",
        "Carrega em **Terminar sessão**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "Perdi o telemóvel (ou apaguei a app autenticadora). Como entro?",
      resposta: "Fala com um administrador. Ele pode repor o teu 2FA e, na próxima entrada, voltas a configurá-lo com o QR code, como da primeira vez.",
    },
    {
      pergunta: "Um colega perdeu o telemóvel do 2FA. Como o ajudo?",
      resposta: "Abre **Admin**, vai ao separador **Segurança**, procura a pessoa e carrega em **Repor MFA**. Na próxima entrada, o colega volta a configurar o 2FA com a app autenticadora.",
      papeis: ["admin", "administrador"],
    },
    {
      pergunta: "Diz \"Código inválido ou expirado\". O que faço?",
      resposta: "Os códigos mudam a cada poucos segundos. Escreve o código que está à vista na app nesse momento. Confirma também que a hora do telemóvel está certa.",
    },
    {
      pergunta: "Diz que a minha conta está desativada.",
      resposta: "A tua conta foi desativada. Se achas que é um engano, fala com os Recursos Humanos.",
    },
    {
      pergunta: "Ainda não tenho conta. Como peço uma?",
      resposta: "Pede um convite aos Recursos Humanos.",
    },
    {
      pergunta: "Posso desligar a verificação em dois passos?",
      resposta: "Não. É obrigatória para todas as contas. Só podes mudá-la de telemóvel.",
    },
    {
      pergunta: "Porque não consigo alterar a minha função ou o tipo de contrato?",
      resposta: "Os dados da empresa são geridos pelos Recursos Humanos. Se algo estiver errado, fala com eles.",
    },
    {
      pergunta: "Mudei de tema mas noutro computador está diferente. Porquê?",
      resposta: "O tema fica guardado em cada dispositivo. Escolhe-o também no outro computador.",
    },
  ],
};
