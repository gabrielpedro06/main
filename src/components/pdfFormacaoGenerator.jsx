import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================================
// CONFIGURAÇÕES E PALETA DE CORES
// ============================================================================
const COLORS_BY_BRAND = {
  default: {
    primary: [43, 49, 57],
    secondary: [110, 119, 129],
    accent: [168, 199, 58],
    white: [255, 255, 255],
    border: [230, 230, 230],
    light: [248, 249, 250],
  },
  twoSiglas: {
    primary: [0, 170, 190],    // Teal/Ciano da 2SIGLAS
    secondary: [70, 70, 70],   // Cinzento escuro para texto principal
    accent: [0, 140, 160],     // Tom mais escuro para detalhes
    white: [255, 255, 255],
    border: [200, 200, 200],
    light: [240, 248, 250],    // Fundo subtil para tabelas
  },
};

const getPdfColors = (empresaConsultora) => {
  const nome = String(empresaConsultora?.nome || '').toLowerCase();
  if (nome.includes('2siglas') || nome.includes('2 siglas') || nome.includes('duas siglas')) {
    return COLORS_BY_BRAND.twoSiglas;
  }
  return COLORS_BY_BRAND.default;
};

// ============================================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E LIMPEZA
// ============================================================================
const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-PT');
};

const formatCurrency = (value) => {
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return '0,00 €';
  return num.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
};

const safeValue = (value) => {
  const text = String(value ?? '').trim();
  return text || '—';
};

const cleanTextToBullets = (text) => {
  if (!text) return '';

  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/^(\s*)(%[aª]?|▪)\s*/gim, '$1• ')
    .trim();
};

const loadImage = (url) =>
  new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
  });

const getLogoPath = (empresaConsultora) => {
  if (!empresaConsultora) return '/neomarca.png';
  const nome = (empresaConsultora.nome || '').toLowerCase();
  if (nome.includes('2siglas') || nome.includes('2 siglas') || nome.includes('duas siglas')) return '/2siglas.png';
  return '/neomarca.png';
};

// ============================================================================
// GERAÇÃO DO PDF
// ============================================================================
export const generateFormacaoPDF = async (params) => {
  const {
    propostaNumero,
    proposta,
    cliente,
    empresaConsultora,
    cursosSelecionados,
    condicoes,
    totais,
  } = params;

  const COLORS = getPdfColors(empresaConsultora);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 25;
  const marginY = 30;
  const contentWidth = pageWidth - marginX * 2;

  let currentY = marginY;
  const footerY = pageHeight - 15;
  const pageReserve = 25;
  let sectionCounter = 1;

  // Carrega a imagem do logotipo
  const logoPath = getLogoPath(empresaConsultora);
  const logoBase64 = await loadImage(logoPath);

  // Carrega a imagem de certificações (se existir)
  const certificacoesBase64 = await loadImage(condicoes?.imagem_certificacoes);

  // --- HELPER FUNCTIONS ---
  const drawPageHeader = () => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.text('Formação profissional', pageWidth - marginX, 15, { align: 'right' });
    
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - marginX - 35, 17, pageWidth - marginX, 17);
  };

  const drawPageFooter = () => {
    const totalPages = doc.getNumberOfPages();
    const currentPage = doc.getCurrentPageInfo().pageNumber;
    
    if (currentPage === 1) return; // Ignora a capa

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);

    const currentYear = new Date().getFullYear();
    const empresaNome = empresaConsultora?.nome?.toUpperCase() || 'CONSULTORA';
    const numDoc = proposta?.numero || propostaNumero || '—';
    const footerText = `${empresaNome} ${currentYear} | Proposta nº ${numDoc}`;

    doc.text(footerText, marginX, footerY);
    doc.text(`Pág. ${currentPage} de ${totalPages}`, pageWidth - marginX, footerY, { align: 'right' });

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);
  };

  const addNewPage = () => {
    doc.addPage();
    drawPageHeader();
    currentY = marginY;
  };

  const ensureSpace = (requiredHeight) => {
    if (currentY + requiredHeight <= pageHeight - pageReserve) return;
    addNewPage();
  };

  const drawSectionTitle = (text) => {
    ensureSpace(20);
    currentY += 5;
    doc.setFillColor(...COLORS.accent);
    doc.rect(marginX, currentY - 4.5, 3, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${sectionCounter}. ${text.toUpperCase()}`, marginX + 6, currentY);
    sectionCounter++;
    currentY += 8;
  };

  const drawTitle = (text) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.secondary);
    doc.text(text, marginX, currentY);
    currentY += 6;
  };

  const drawJustifiedLine = (lineText, textX, textWidth, lineHeight, color, isLastLine = false) => {
    const words = lineText.trim().split(/\s+/).filter(Boolean);
    const textOptions = {
      align: 'left',
    };

    if (isLastLine || words.length <= 1) {
      doc.text(lineText, textX, currentY, textOptions);
      currentY += lineHeight;
      return;
    }

    const totalWordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
    const availableSpace = textWidth - totalWordsWidth;
    const gaps = words.length - 1;
    const extraSpace = gaps > 0 ? availableSpace / gaps : 0;

    if (!Number.isFinite(extraSpace) || extraSpace <= 0) {
      doc.text(lineText, textX, currentY, textOptions);
      currentY += lineHeight;
      return;
    }

    doc.setTextColor(...color);
    let cursorX = textX;
    words.forEach((word, index) => {
      doc.text(word, cursorX, currentY, textOptions);
      cursorX += doc.getTextWidth(word);
      if (index < words.length - 1) cursorX += extraSpace;
    });
    currentY += lineHeight;
  };

  const drawParagraph = (text, options = {}) => {
    if (!text) return;
    const body = cleanTextToBullets(text);

    const paragraphs = body
        .split(/\n\s*\n/g)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    paragraphs.forEach((paragraph, paragraphIndex) => {
        const lines = paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

        lines.forEach((lineText) => {
        const isBullet = lineText.startsWith('•');
        const textX = isBullet ? marginX + 5 : marginX;
        const wrapWidth = isBullet ? contentWidth - 5 : contentWidth;
        
        // ========================================================
        // CORREÇÃO CRÍTICA: Definir a fonte e o tamanho ANTES 
        // de pedir ao jsPDF para calcular as quebras de linha.
        // ========================================================
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Number(options.size || 10));
        doc.setTextColor(...(options.color || COLORS.secondary));

        // Agora o cálculo da largura baseia-se na fonte correta
        const wrappedLines = doc.splitTextToSize(lineText, wrapWidth);
        const lineHeight = Number(options.lineHeight || 5);
        const requiredHeight = wrappedLines.length * lineHeight;

        if (currentY + requiredHeight > pageHeight - pageReserve) addNewPage();

        wrappedLines.forEach((wrapLine, wrapIndex) => {
            const isLastLine = wrapIndex === wrappedLines.length - 1;
            
            // Já não precisamos de definir a fonte aqui dentro
            drawJustifiedLine(
            wrapLine, 
            textX, 
            wrapWidth, 
            lineHeight, 
            options.color || COLORS.secondary, 
            isLastLine
            );
        });

        currentY += 1;
        });

        if (paragraphIndex < paragraphs.length - 1) {
        currentY += Number(options.paragraphGap || 4);
        }
    });

    currentY += Number(options.gap || 4);
    };

    // ============================================================================
    // 1º PÁGINA 1: CAPA (ESTILO RÉPLICA PROFISSIONAL)
    // ============================================================================

    // 1. Fundo e Estrutura Split
    doc.setFillColor(255, 255, 255); // Fundo Branco Total
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // 2. Imagem Lateral (capaformacao.png / image_866335.png)
    // Ocupa exatamente a metade esquerda para dar o efeito de design moderno
    const capaBase64 = await loadImage('/capaformacao.png'); 

    if (capaBase64) {
        // 1. Obter dimensões reais da imagem para calcular a proporção
        const props = doc.getImageProperties(capaBase64);
        const imageRatio = props.width / props.height;
        const targetWidth = pageWidth;
        
        // 3. Calcular a altura proporcional para NÃO ESTICAR
        const targetHeight = targetWidth / imageRatio;

        // 4. CALCULAR O CENTRO VERTICAL (Altura)
        // Fórmula: (Altura Total - Altura da Imagem) / 2
        const x = 0; 
        const y = (pageHeight - targetHeight) / 2;

        // 5. Desenhar a imagem
        doc.addImage(capaBase64, 'PNG', x, y, targetWidth, targetHeight, undefined, 'FAST');
    }

    // Configuração de Posicionamento para o lado direito
    const rightPadding = 15;
    const contentX = (pageWidth / 2) + rightPadding;
    const rightColumnWidth = (pageWidth / 2) - (rightPadding * 2);

    // 3. Logótipo 2SIGLAS (Centrado no topo da página)
    if (logoBase64) {
        const logoW = 45; // Largura do logo
        const logoH = 45; // Altura do logo
        
        // CÁLCULO PARA CENTRAR: (Largura da Página - Largura do Logo) / 2
        const logoX = (pageWidth - logoW) / 2;
        
        // Y = 10 para ficar bem no topo. Ajusta conforme necessário.
        const logoY = 10; 

        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
    }

    // 4. Títulos Principais (Centro da metade direita)
    doc.setFont('helvetica', 'bold');

    // Título: PROPOSTA DE PRESTAÇÃO DE SERVIÇOS 
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text('PROPOSTA DE PRESTAÇÃO', contentX, 100);
    doc.text('DE SERVIÇOS', contentX, 105);

    // Subtítulo: Formação profissional (Com a cor da marca) [cite: 331]
    doc.setFontSize(22);
    doc.setTextColor(0, 170, 190); // Azul/Teal da 2SIGLAS
    doc.text('Formação', contentX, 120);
    doc.text('profissional', contentX, 127);


    // 5. Bloco de Informação da Proposta (Rodapé Centrado)
    doc.setFont('helvetica', 'bold'); // Negrito!

    const propID = proposta?.numero || "2SIG-2026-001"; 
    const dataProp = formatDate(proposta?.data || "2026-05-07"); 
    const website = "www.2siglas.pt";

    // O truque aqui é passar o centerX e adicionar { align: 'center' }
    // O jsPDF trata de alinhar tudo perfeitamente pelo meio
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`PROPOSTA N° ${propID}`, contentX, 170);

    doc.setFontSize(12);
    doc.setTextColor(0, 170, 190);
    doc.text(dataProp, contentX, 177);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text(website, contentX, 212);

  // ============================================================================
  // 2º PÁGINA 2: ÂMBITO DA PROPOSTA
  // ============================================================================
  addNewPage();
  drawSectionTitle('ÂMBITO DA PROPOSTA');

  const contactoNome = cliente?.contacto_nome || 'A/C Administração';
  const contactoCargo = cliente?.contacto_cargo || '';
  const clientName = cliente?.nome || 'Empresa Cliente';
  const clienteMorada = cliente?.morada || '';
  const clienteLocalidade = cliente?.distrito_cidade || '';

  doc.setFont('helvetica', 'bold');
  doc.text(`Exmo(a). Senhor(a) ${contactoNome}`, marginX, currentY);
  currentY += 5;
  if (contactoCargo) {
    doc.text(contactoCargo, marginX, currentY);
    currentY += 5;
  }
  doc.text(clientName, marginX, currentY);
  currentY += 5;
  
  doc.setFont('helvetica', 'normal');
  if(clienteMorada) { doc.text(clienteMorada, marginX, currentY); currentY += 5; }
  currentY += 10;

  if (condicoes?.compromisso) drawParagraph(condicoes.compromisso);
  if (condicoes?.esperamos_que_corresponda) drawParagraph(condicoes.esperamos_que_corresponda);
  if (condicoes?.para_aprovacao) drawParagraph(condicoes.para_aprovacao);

  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(`${empresaConsultora?.nome_signatario?.toUpperCase() || 'DIREÇÃO COMERCIAL'}`, marginX, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${empresaConsultora?.telefone || ''} | ${empresaConsultora?.email || 'geral@empresa.pt'}`, marginX, currentY);

  // ============================================================================
  // PÁGINAS SEGUINTES: INFORMAÇÕES GERAIS E CONDIÇÕES
  // ============================================================================
  addNewPage();
  if (condicoes?.apresentacao_empresa) {
    drawSectionTitle('APRESENTAÇÃO');
    drawParagraph(condicoes.apresentacao_empresa);
  }

  if (condicoes?.areas_formacao) {
    drawSectionTitle('ÁREAS DE FORMAÇÃO');
    drawParagraph(condicoes.areas_formacao);
  }

  if (condicoes?.proposta_formacao) {
    drawSectionTitle('PROPOSTA DE FORMAÇÃO');
    drawParagraph(condicoes.proposta_formacao);
  }
    if (condicoes?.coordenacao_formacao) {
    drawSectionTitle('COORDENAÇÃO DA FORMAÇÃO');
    drawParagraph(condicoes.coordenacao_formacao);
  }

  addNewPage();
  if (condicoes?.descricao_servico) {
    drawSectionTitle('DESCRIÇÃO DO SERVIÇO A PRESTAR');
    drawParagraph(condicoes.descricao_servico);
  }

  if (condicoes?.obrigacoes_consultora) {
    const nomeConsultora = empresaConsultora?.nome || 'CONSULTORA';
    drawSectionTitle(`OBRIGAÇÕES DA ${nomeConsultora.toUpperCase()}`);
    drawParagraph(condicoes.obrigacoes_consultora);
  }

  if (condicoes?.obrigacoes_cliente) {
    drawSectionTitle('OBRIGAÇÕES DO CLIENTE');
    drawParagraph(condicoes.obrigacoes_cliente);
  }

  if (condicoes?.condicoes_realizacao) {
    drawSectionTitle('CONDIÇÕES DE REALIZAÇÃO');
    drawParagraph(condicoes.condicoes_realizacao);
  }


  // ============================================================================
  // 10º A 15º - CURSOS (AGORA COM OS MÓDULOS)
  // ============================================================================
  if (cursosSelecionados && cursosSelecionados.length > 0) {
    cursosSelecionados.forEach((curso) => {
      addNewPage();
      
      // 10º CURSO
      drawSectionTitle('CURSO');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.secondary);
      doc.text(safeValue(curso.nome), marginX, currentY);
      currentY += 15;

      // 11º DURAÇÃO
      drawTitle('DURAÇÃO');
      drawParagraph(`${Number(curso.duracao_horas || 0)} horas`);
      
      // 12º ENQUADRAMENTO DO CURSO
      if (curso.texto_enquadramento) {
        drawTitle('ENQUADRAMENTO DO CURSO');
        drawParagraph(curso.texto_enquadramento);
      }

      // 13º OBJETIVOS PEDAGÓGICOS
      if (curso.objetivos_pedagogicos) {
        drawTitle('OBJETIVOS PEDAGÓGICOS');
        drawParagraph(curso.objetivos_pedagogicos);
      }

      // ==========================================
      // 14º ELENCO MODULAR (Aqui está a correção!)
      // ==========================================
      const temModulosNoArray = curso.modulos && curso.modulos.length > 0;
      const temTextoModular = !!curso.elenco_modular;

      if (temModulosNoArray || temTextoModular) {
        drawTitle('ELENCO MODULAR');

        // Se existir um texto de introdução do elenco
        if (temTextoModular) {
          drawParagraph(curso.elenco_modular);
        }

        // Se existir o array de módulos, renderiza como tabela pequena alinhada à esquerda
        if (temModulosNoArray) {
          const modulosRows = curso.modulos.map((modulo, index) => [
            safeValue(modulo.nome || modulo.titulo || `Módulo ${index + 1}`),
            modulo.duracao_horas ? `${Number(modulo.duracao_horas)}h` : '—',
          ]);

          ensureSpace(40);
          autoTable(doc, {
            startY: currentY,
            margin: { left: marginX, right: marginX + 70 },
            head: [['Módulo', 'Duração']],
            body: modulosRows,
            styles: {
              font: 'helvetica',
              fontSize: 10,
              cellPadding: { top: 1.8, right: 4, bottom: 1.8, left: 4 },
              valign: 'middle',
              textColor: COLORS.secondary,
            },
            headStyles: { 
              fillColor: COLORS.accent, 
              textColor: COLORS.white, 
              fontStyle: 'bold',
              fontSize: 10,
              cellPadding: { top: 1.8, right: 4, bottom: 1.8, left: 4 },
              valign: 'middle' 
            },
            columnStyles: {
              0: { halign: 'left', cellWidth: 85 },
              1: { halign: 'center', cellWidth: 30 },
            },
            alternateRowStyles: { fillColor: COLORS.light },
            theme: 'grid',
          });
          currentY = doc.lastAutoTable.finalY + 8;
        }
      }

      // Mostrar considerações do curso logo a seguir aos módulos (se existir)
      if (curso.consideracoes) {
        drawTitle('CONSIDERAÇÕES');
        drawParagraph(curso.consideracoes);
      }

      // 15º METODOLOGIA
      if (curso.metodologia) {
        addNewPage();
        drawTitle('METODOLOGIA');
        drawParagraph(curso.metodologia);
      }
    });

    // ============================================================================
    // 16º PROPOSTA DE HONORÁRIOS
    // ============================================================================
    ensureSpace(40);
    drawSectionTitle('PROPOSTA DE HONORÁRIOS');
    
    const orcamentoRows = cursosSelecionados.map((curso, index) => [
      `${index + 1}`,
      safeValue(curso.nome),
      `${Number(curso.duracao_horas || 0)}h`,
      formatCurrency(Number(curso.valor || 0)),
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      pageBreak: 'avoid',
      margin: { left: marginX, right: marginX },
      head: [['#', 'Curso', 'Duração', 'Valor']],
      body: orcamentoRows,
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 3,
        valign: 'middle',
        textColor: COLORS.secondary,
      },
      headStyles: { 
        fillColor: COLORS.primary, 
        textColor: COLORS.white, 
        fontStyle: 'bold',
        valign: 'middle' 
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: contentWidth - 65 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: COLORS.light },
      theme: 'grid',
    });
    currentY = doc.lastAutoTable.finalY + 10;
  }

  // ============================================================================
  // CONDIÇÕES FINAIS
  // ============================================================================

  if (condicoes?.plano_pagamento) {
    drawSectionTitle('PLANO DE PAGAMENTO');
    drawParagraph(condicoes.plano_pagamento);
  }

  if (condicoes?.termos_gerais) {
    addNewPage();
    drawSectionTitle('TERMOS E CONDIÇÕES');
    drawParagraph(condicoes.termos_gerais);
  }

  if (condicoes?.notas) {
    drawSectionTitle('EXCLUSÕES DA PROPOSTA');
    drawParagraph(condicoes.notas);
  }

  if (certificacoesBase64) {
    addNewPage();
    drawSectionTitle('CERTIFICAÇÕES E HOMOLOGAÇÕES');
    ensureSpace(50);
    doc.addImage(certificacoesBase64, 'PNG', marginX, currentY, 150, 40, undefined, 'FAST');
    currentY += 45;
  }

  // ============================================================================
  // APLICAR RODAPÉS
  // ============================================================================
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    drawPageFooter();
  }

  // Use either propostaNumero from params or the fallback propID you created earlier
  const numDocumento = proposta?.numero || propostaNumero || 'SemNumero';
  doc.save(`Proposta-Formacao-${numDocumento}.pdf`);
};