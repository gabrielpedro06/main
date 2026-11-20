// Manual de utilizador — Organizador de PDFs. Conteúdo mostrado na página Ajuda (src/pages/Ajuda.jsx).
export default {
  id: "organizador-pdf",
  titulo: "Organizador de PDFs",
  icone: "FileStack",
  rota: "/dashboard/organizador-pdf",
  papeis: undefined,
  resumo:
    "Separa, identifica e arruma faturas e talões digitalizados. Carregas os PDFs, revês o que foi lido e descarregas um ZIP organizado por ano e categoria, com um resumo em Excel.",
  paginas: [
    {
      titulo: "Onde encontrar",
      texto:
        "No menu lateral, abre o grupo **GESTÃO** e carrega em **Organizador de PDFs**. A página chama-se **Organizador de faturas** e está disponível para todos os colaboradores.",
    },
    {
      titulo: "Como funciona",
      texto:
        "O organizador lê cada página no teu computador. Primeiro procura o QR fiscal da AT, que traz o NIF, a data, o número e o total da fatura. Se não houver QR, lê o texto da página e, se for uma digitalização, reconhece o texto da imagem. Depois separa as páginas em documentos e propõe a categoria, o fornecedor e o nome de cada ficheiro.",
    },
    {
      titulo: "Resumo e botões",
      texto:
        "Depois de carregares os PDFs vês quantos documentos e páginas há, quantos têm QR fiscal, quantos estão para rever e o total. Os botões são **Adicionar PDFs**, **Pedir à IA** (só aparece se houver documentos para rever), **Mais** e **Exportar ZIP**.",
    },
    {
      titulo: "Cartão de cada documento",
      texto:
        "Cada documento mostra uma miniatura, o fornecedor, a **Data**, a **Categoria**, o **Nº documento**, o **Total (€)**, o **NIF** e o **Tipo**. As etiquetas indicam a origem dos dados: **QR fiscal**, **Lido do texto** ou **IA**. **Rever** indica campos a confirmar e **Duplicado** indica uma fatura repetida. Em baixo vês a pasta e o nome com que o ficheiro vai ficar no ZIP.",
    },
    {
      titulo: "Filtros",
      texto:
        "Usa **Todos**, **Para rever** e, se existirem, **Duplicados** para escolher o que vês na lista.",
    },
    {
      titulo: "Estrutura do ZIP",
      texto:
        "No fundo da página, abre **Estrutura do ZIP** para veres como os ficheiros vão ficar arrumados: uma pasta por ano, uma subpasta por categoria e o ficheiro resumo.csv.",
    },
  ],
  tarefas: [
    {
      titulo: "Como carregar os PDFs",
      passos: [
        "Arrasta os PDFs para a página ou carrega na área **Arraste os PDFs para aqui ou clique para escolher**.",
        "Espera que a barra de progresso termine. Na primeira vez demora um pouco mais.",
        "Para juntar mais ficheiros depois, carrega em **Adicionar PDFs**.",
      ],
      nota:
        "Podes digitalizar vários talões no mesmo PDF: o organizador separa-os. Se precisares de parar, carrega em **Cancelar**.",
    },
    {
      titulo: "Como rever e corrigir os dados",
      passos: [
        "Carrega em **Para rever** para veres só os documentos com dúvidas.",
        "Carrega na miniatura para ver a página em grande.",
        "Corrige o fornecedor, a **Data**, a **Categoria**, o **Nº documento** ou o **Total (€)**.",
        "Se quiseres, muda o nome do ficheiro no campo por baixo.",
      ],
      nota:
        "Quando corriges o nome de um fornecedor, fica memorizado neste computador para esse NIF e é usado automaticamente da próxima vez.",
    },
    {
      titulo: "Como separar ou juntar documentos",
      passos: [
        "Carrega no número de páginas de um documento (**Ver páginas**) para as mostrar.",
        "Para separar, carrega na tesoura entre duas páginas (**Separar aqui**).",
        "Para juntar um documento ao anterior, carrega em **Juntar ao documento anterior**.",
        "Em cada página podes **Rodar 90°** ou **Retirar página**.",
      ],
      nota:
        "Em **Mais** tens opções para todo o lote: **Recalcular separações**, **1 página = 1 documento** e **Juntar tudo num documento**. As páginas retiradas aparecem no fundo, com o botão **Repor**.",
    },
    {
      titulo: "Como pedir sugestões à IA",
      passos: [
        "Carrega em **Pedir à IA**. O número indica quantos documentos estão para rever.",
        "Lê a janela de confirmação, que explica o que vai ser enviado.",
        "Carrega em **Enviar à IA** e espera pela resposta.",
        "Revê os documentos marcados com **IA** e corrige o que for preciso antes de exportar.",
      ],
      nota:
        "Só é enviado o texto lido das páginas, nunca as imagens. Antes de sair do computador são tapados os dados pessoais: NIF de pessoas, NISS, nomes de trabalhadores e de transferências, IBAN, números de conta e de cartão, emails e telemóveis. Os NIF de empresas, valores, datas e números de documento mantêm-se. Documentos muito grandes não são enviados.",
    },
    {
      titulo: "Como tratar páginas que saem em branco",
      passos: [
        "Abre **Mais**.",
        "Carrega em **Reler … página(s) em branco** (no lugar dos pontos aparece o número de páginas) para tentar outra vez.",
        "Se continuarem em branco e forem mesmo vazias, carrega em **Retirar … página(s) em branco**.",
      ],
      nota: "Estas opções só aparecem quando há páginas em branco.",
    },
    {
      titulo: "Como descarregar o ZIP",
      passos: [
        "Confirma que não há documentos para rever, ou que já os verificaste.",
        "Carrega em **Exportar ZIP**.",
        "Abre o ficheiro descarregado: tem uma pasta por ano e categoria e o resumo.csv, que abre no Excel.",
      ],
      nota:
        "Cada PDF fica com um nome do tipo data, fornecedor, tipo e número. O resumo.csv lista todos os documentos com data, fornecedor, NIF, tipo, número, ATCUD, total, categoria, ficheiro e páginas.",
    },
    {
      titulo: "Como começar de novo",
      passos: [
        "Abre **Mais** e carrega em **Limpar tudo**.",
        "Confirma em **Limpar tudo**.",
      ],
      nota: "Apaga os documentos e as correções do organizador. Os teus PDFs originais não são afetados.",
    },
  ],
  faq: [
    {
      pergunta: "Os meus documentos são enviados para algum lado?",
      resposta:
        "Não. A leitura, a separação e o ZIP são feitos no teu computador. A única exceção é **Pedir à IA**: aí é enviado só o texto dos documentos para rever, com os dados pessoais tapados, e só depois de confirmares.",
    },
    {
      pergunta: "O que quer dizer Rever num documento?",
      resposta:
        "O organizador não tem a certeza de alguns campos (a etiqueta indica quais). Confirma-os na imagem e corrige se for preciso.",
    },
    {
      pergunta: "Porque é que uma fatura aparece como Duplicado?",
      resposta:
        "Há outro documento com o mesmo código ATCUD, ou seja, a mesma fatura foi carregada duas vezes. Retira uma das cópias com **Retirar documento**.",
    },
    {
      pergunta: "Se fechar a página perco o trabalho?",
      resposta:
        "Não. O trabalho fica guardado neste navegador até carregares em **Limpar tudo**. Noutro computador não aparece.",
    },
    {
      pergunta: "Uma fatura sem QR fica bem identificada?",
      resposta:
        "Nem sempre. Sem QR, os dados vêm do texto da página e podem precisar de revisão. Usa **Pedir à IA** ou corrige à mão.",
    },
    {
      pergunta: "Duas faturas ficaram juntas num só documento. O que faço?",
      resposta:
        "Abre as páginas do documento e carrega na tesoura entre elas (**Separar aqui**).",
    },
  ],
};
