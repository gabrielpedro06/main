// Manual de utilizador — Pedido de Km's. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "pedido-km",
  titulo: "Pedido de Km's",
  icone: "Car",
  rota: "/dashboard/pedido-km",
  papeis: undefined,
  resumo:
    "Regista as deslocações que fizeste em viatura para os RH aprovarem. O mapa calcula os quilómetros por ti.",
  paginas: [
    {
      titulo: "Como chegar a esta página",
      texto:
        "No fundo do menu lateral, carrega no teu nome (o cartão com a tua foto). No menu que abre, escolhe **Pedido de deslocação**. A página chama-se **Pedidos de Km's**.",
    },
    {
      titulo: "Topo da página",
      texto:
        "Mostra o total de **km aprovados** neste ano e quantos pedidos tens **Pendentes** e **Aprovados**. O botão **Nova deslocação** abre o formulário.",
    },
    {
      titulo: "O meu histórico",
      texto:
        "Lista as tuas deslocações com a data, o percurso (partida e destino), a indicação **Ida e volta** quando se aplica, a matrícula e os km. Usa os filtros **Todos**, **Pendentes**, **Aprovados** e **Arquivados**. Num pedido **Pendente** podes editar (lápis) ou cancelar (caixote). Num pedido **Aprovado** tens **Pedir cancelamento**.",
    },
    {
      titulo: "Formulário Nova deslocação",
      texto:
        "Preenche a **Data da deslocação** e o **Veículo utilizado**. Depois indica a **Partida** (A) e o **Destino** (B), escrevendo a morada ou clicando no mapa. A app calcula a rota mais rápida e preenche **Km a pedir**. O interruptor **Ida e volta** duplica a distância. Podes ainda escrever **Notas** e juntar um **Documento**. No fim, carrega em **Submeter pedido**.",
    },
    {
      titulo: "Ferramentas do mapa",
      texto:
        "O botão de mira ao lado da **Partida** usa a tua localização atual. O botão de setas entre os campos troca a partida com o destino. No canto do mapa tens **Ver percurso completo** e **Limpar**. Depois de marcados, podes arrastar os pinos A e B para ajustar o local.",
    },
  ],
  tarefas: [
    {
      titulo: "Como registar os teus veículos",
      passos: [
        "Carrega no teu nome no fundo do menu lateral e escolhe **O meu perfil**.",
        "Vai à secção **Veículos e deslocações**.",
        "Escreve a matrícula e, se quiseres, a marca e o modelo.",
        "Carrega em **Adicionar**.",
        "Carrega em **Guardar alterações**.",
      ],
      nota: "Os veículos registados aparecem depois na lista **Veículo utilizado** dos pedidos de Km's.",
    },
    {
      titulo: "Como pedir os km de uma deslocação",
      passos: [
        "Abre **Pedido de deslocação** a partir do teu nome no fundo do menu lateral.",
        "Carrega em **Nova deslocação**.",
        "Preenche a **Data da deslocação**.",
        "Em **Veículo utilizado**, escolhe a matrícula. Se o carro não estiver registado, escolhe **Outro veículo**.",
        "Em **Partida**, escreve a morada, cidade ou empresa e escolhe uma sugestão da lista.",
        "Em **Destino**, faz o mesmo.",
        "Se voltaste ao ponto de partida, liga **Ida e volta**.",
        "Confirma o valor em **Km a pedir**.",
        "Carrega em **Submeter pedido**.",
      ],
      nota: "O pedido fica **Pendente** até os RH o aprovarem. Os administradores recebem um email com o pedido.",
    },
    {
      titulo: "Como marcar a partida e o destino no mapa",
      passos: [
        "No formulário **Nova deslocação**, clica no mapa para marcar a partida (A).",
        "Clica de novo no mapa para marcar o destino (B).",
        "Espera que a app calcule a rota.",
        "Se precisares, arrasta os pinos para os ajustar.",
      ],
    },
    {
      titulo: "Como corrigir os km à mão",
      passos: [
        "Em **Km a pedir**, escreve o valor certo.",
        "A app mostra **Editado à mão** e a distância da rota calculada.",
        "Se quiseres voltar ao valor da rota, carrega em **repor**.",
      ],
      nota: "Se a rota não puder ser calculada, escreve os km à mão.",
    },
    {
      titulo: "Como alterar ou cancelar uma deslocação",
      passos: [
        "No histórico, procura o pedido.",
        "Se estiver **Pendente**, carrega no lápis para editar ou no caixote para cancelar.",
        "Se estiver **Aprovado**, carrega em **Pedir cancelamento** e confirma em **Sim, cancelar**.",
      ],
    },
  ],
  faq: [
    {
      pergunta: "A app dá erro ao submeter. O que falta?",
      resposta:
        "Tens de preencher a data, o veículo, a partida, o destino e um total de km maior que zero.",
    },
    {
      pergunta: "O que faz o interruptor Ida e volta?",
      resposta:
        "Duplica a distância da rota. Quando está desligado, a app conta **Só ida**.",
    },
    {
      pergunta: "Posso pedir km num dia em que tive uma ausência?",
      resposta: "Sim. Os pedidos de km não chocam com as tuas ausências nem gastam dias de férias.",
    },
    {
      pergunta: "Como é calculado o valor a receber?",
      resposta:
        "Os RH multiplicam os km aprovados pelo valor por quilómetro definido na empresa. As deslocações aprovadas entram no relatório mensal de deslocações.",
    },
    {
      pergunta: "As moradas que uso muitas vezes ficam guardadas?",
      resposta:
        "Sim. Ao clicar num campo vazio de **Partida** ou **Destino**, a app mostra os teus locais **Recentes** neste computador.",
    },
    {
      pergunta: "O botão da localização não funciona. Porquê?",
      resposta:
        "O browser tem de te dar permissão para usar a localização. Verifica as permissões do browser ou escreve a morada à mão.",
    },
  ],
};
