// =====================================================================
// PDF dos Ativos TI (botão "PDF" em AtivosTIDashboard).
// Uma folha por colaborador, como termo de entrega: cabeçalho com o logótipo,
// cartão com o nome, tabela do material, declaração e linha para o colaborador
// assinar no fim da folha. No fim, uma folha com o material em stock (sem assinatura).
// Mesmo estilo do PDF dos RH (pdfRecursosHumanos.jsx). Logótipos: /logo1.png e /logos_all.png.
// =====================================================================
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const C = {
  navy: [27, 41, 82],
  green: [70, 159, 97],
  lime: [136, 191, 104],
  ink: [36, 53, 79],
  muted: [96, 113, 133],
  subtle: [244, 249, 243],
  line: [218, 229, 217],
  white: [255, 255, 255],
};

const DECLARACAO =
  "Declaro que recebi os equipamentos acima indicados, em bom estado de funcionamento, " +
  "e comprometo-me a utilizá-los apenas para fins profissionais, a zelar pela sua boa " +
  "conservação e a devolvê-los quando me forem pedidos ou no fim da minha relação com a empresa.";

const carregarImagem = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
  });

/**
 * Gera e descarrega "inventario_ativos_ti.pdf".
 * @param {object} p
 * @param {{nome: string, itens: object[]}[]} p.porPessoa equipamentos em uso, agrupados por colaborador
 * @param {object[]} p.emStock equipamentos com estado "em_stock"
 * @param {(estado: string) => string} p.estadoTxt texto do estado (ESTADO_MAP_EQUIP)
 */
export async function gerarPdfAtivosTI({ porPessoa, emStock, estadoTxt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MX = 14;

  const agora = new Date();
  const dataTxt = agora.toLocaleDateString("pt-PT");
  const horaTxt = agora.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  const [logoTopo, logosRodape] = await Promise.all([
    carregarImagem("/logo1.png"),
    carregarImagem("/logos_all.png"),
  ]);

  // Rodapé: logótipos centrados (proporção real 2700×449) + linha de texto
  const LOGO_W = W * 0.5;
  const LOGO_H = Math.round(LOGO_W * (449 / 2700) * 10) / 10;
  const RODAPE_H = LOGO_H + 13;
  const LIMITE_Y = H - RODAPE_H - 2; // nada desce abaixo disto

  const cabecalho = (titulo, subtitulo) => {
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, W, 34, "F");
    doc.setFillColor(...C.green);
    doc.rect(0, 34, W, 1.6, "F");
    doc.setFillColor(...C.lime);
    doc.rect(W - 60, 0, 60, 1.6, "F");

    const tx = logoTopo ? MX + 33 : MX;
    if (logoTopo) {
      doc.setFillColor(...C.white);
      doc.roundedRect(MX, 8, 27, 18, 2, 2, "F");
      doc.addImage(logoTopo, "PNG", MX + 2, 10, 23, 14, "", "FAST");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...C.white);
    doc.text(titulo, tx, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(205, 226, 210);
    doc.text(subtitulo, tx, 22.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.white);
    doc.text(`Emitido a ${dataTxt}`, W - MX, 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(205, 226, 210);
    doc.text(`às ${horaTxt}`, W - MX, 22.5, { align: "right" });
  };

  // Cartão com o nome à esquerda e o total à direita
  const cartao = (rotulo, nome, total, totalRotulo) => {
    const y = 42;
    const h = 24;
    const badgeW = 40;
    const gap = 4;
    const w = W - MX * 2 - badgeW - gap;

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.4);
    doc.roundedRect(MX, y, w, h, 2.5, 2.5, "FD");
    doc.setFillColor(...C.green);
    doc.roundedRect(MX + 1.8, y + 3, 4, h - 6, 1.8, 1.8, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(rotulo, MX + 12, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...C.navy);
    const nomeLinha = doc.splitTextToSize(nome, w - 16)[0];
    doc.text(nomeLinha, MX + 12, y + 17.5);

    const bx = MX + w + gap;
    doc.setFillColor(...C.navy);
    doc.roundedRect(bx, y, badgeW, h, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...C.white);
    doc.text(String(total), bx + badgeW / 2, y + 12.5, { align: "center" });
    doc.setFontSize(6.5);
    doc.setTextColor(...C.lime);
    doc.text(totalRotulo, bx + badgeW / 2, y + 19, { align: "center" });
    return y + h;
  };

  const tabela = (itens, startY, titulo, subtitulo, corCabecalho) => {
    autoTable(doc, {
      startY,
      head: [["Nº Inv.", "Tipo", "Modelo", "Descrição", "Estado"]],
      body: itens.map((item) => [
        item.num_inventario || "—",
        item.tipo || "—",
        item.modelo || "—",
        item.nome_pc || "—",
        estadoTxt(item.estado),
      ]),
      theme: "plain",
      margin: { left: MX, right: MX, top: 44, bottom: H - LIMITE_Y },
      styles: {
        font: "helvetica",
        fontSize: 8.8,
        textColor: C.ink,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        lineColor: C.line,
        lineWidth: { bottom: 0.25 },
        valign: "middle",
      },
      headStyles: {
        fillColor: corCabecalho,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 8,
        lineWidth: 0,
      },
      alternateRowStyles: { fillColor: C.subtle },
      columnStyles: {
        0: { fontStyle: "bold", textColor: C.navy, cellWidth: 26 },
        4: { cellWidth: 26 },
      },
      // Páginas de continuação da mesma tabela também levam o cabeçalho
      didDrawPage: (d) => { if (d.pageNumber > 1) cabecalho(titulo, subtitulo); },
    });
    return doc.lastAutoTable.finalY;
  };

  // Declaração + linha de assinatura, presa ao fundo da folha
  const BLOCO_ASSIN_H = 52;
  const assinatura = (nome, fimTabela, totalItens) => {
    let topo = LIMITE_Y - BLOCO_ASSIN_H;
    if (fimTabela + 4 > topo) {
      // Não cabe por baixo da tabela: passa para uma folha nova, com uma nota
      doc.addPage();
      cabecalho("Termo de Entrega de Equipamentos", `Ativos TI · ${nome}`);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text(
        `Continuação: assinatura referente aos ${totalItens} equipamentos listados na(s) página(s) anterior(es).`,
        MX, 46,
      );
      topo = LIMITE_Y - BLOCO_ASSIN_H;
    }

    // Caixa da declaração
    doc.setFillColor(...C.subtle);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(MX, topo, W - MX * 2, 22, 2, 2, "FD");
    doc.setFillColor(...C.green);
    doc.roundedRect(MX + 1.6, topo + 3.5, 1.4, 15, 0.7, 0.7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.green);
    doc.text("DECLARAÇÃO DE RECEÇÃO", MX + 6, topo + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.3);
    doc.setTextColor(...C.ink);
    doc.text(doc.splitTextToSize(DECLARACAO, W - MX * 2 - 12), MX + 6, topo + 11, { lineHeightFactor: 1.35 });

    // Assinatura do colaborador (esquerda) e data (direita)
    const linhaY = topo + 40;
    const assinW = 108;
    const dataX = W - MX - 52;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text("ASSINATURA DO COLABORADOR", MX, topo + 28.5);
    doc.text("DATA", dataX, topo + 28.5);

    doc.setDrawColor(...C.navy);
    doc.setLineWidth(0.45);
    doc.line(MX, linhaY, MX + assinW, linhaY);
    doc.line(dataX, linhaY, W - MX, linhaY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text("/", dataX + 17, linhaY - 1.5, { align: "center" });
    doc.text("/", dataX + 34, linhaY - 1.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.navy);
    doc.text(nome, MX, linhaY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text("Colaborador(a)", MX, linhaY + 9.5);
    doc.text("dd / mm / aaaa", dataX, linhaY + 5);
  };

  const rodapes = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      const textoY = H - 6;
      if (logosRodape) {
        doc.addImage(logosRodape, "PNG", (W - LOGO_W) / 2, textoY - LOGO_H - 3, LOGO_W, LOGO_H, "", "FAST");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text("Inventário de Ativos TI · Documento interno · Grupo Bizin", MX, textoY);
      doc.text(`Página ${i} de ${total}`, W - MX, textoY, { align: "right" });
    }
  };

  let primeira = true;
  const novaFolha = () => { if (!primeira) doc.addPage(); primeira = false; };

  // 1. Uma folha por colaborador, com assinatura
  porPessoa.forEach((pessoa) => {
    novaFolha();
    const titulo = "Termo de Entrega de Equipamentos";
    const subtitulo = `Ativos TI · ${pessoa.nome}`;
    cabecalho(titulo, subtitulo);
    const fimCartao = cartao("COLABORADOR(A)", pessoa.nome, pessoa.itens.length,
      pessoa.itens.length === 1 ? "EQUIPAMENTO" : "EQUIPAMENTOS");
    const fim = tabela(pessoa.itens, fimCartao + 7, titulo, subtitulo, C.green);
    assinatura(pessoa.nome, fim, pessoa.itens.length);
  });

  // 2. Material em stock (sem assinatura)
  if (emStock.length > 0) {
    novaFolha();
    const titulo = "Equipamentos em Stock";
    const subtitulo = "Ativos TI · disponíveis para atribuir";
    cabecalho(titulo, subtitulo);
    const fimCartao = cartao("INVENTÁRIO", "Em stock (disponíveis)", emStock.length,
      emStock.length === 1 ? "EQUIPAMENTO" : "EQUIPAMENTOS");
    tabela(emStock, fimCartao + 7, titulo, subtitulo, C.muted);
  }

  rodapes();
  doc.save("inventario_ativos_ti.pdf");
}
