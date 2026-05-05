import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Cores baseadas na identidade visual da Neomarca
const COLORS = {
  primary: [43, 49, 57], // Antracite escuro
  secondary: [110, 119, 129], // Cinza ardósia
  accent: [168, 199, 58], // Verde
  white: [255, 255, 255],
  border: [230, 230, 230],
  light: [248, 249, 250],
};

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

const formatEstadoLabel = (estado) => {
  const key = String(estado || '').trim().toLowerCase();
  const map = {
    em_preparacao: 'Em preparação',
    revisao: 'Revisão',
    enviada: 'Enviada',
    analise: 'Análise',
    ganha: 'Ganha',
    perdida: 'Perdida',
  };
  return map[key] || safeValue(estado);
};

const formatModoHonorarioLabel = (modo) => {
  const key = String(modo || '').trim().toLowerCase();
  const map = {
    fixo: 'Fixo',
    variavel: 'Variável',
    ambos: 'Ambos',
  };
  return map[key] || safeValue(modo);
};

const normalizeModoHonorario = (modo, item = {}) => {
  const key = String(modo || '').trim().toLowerCase();
  if (key === 'fixo' || key === 'variavel' || key === 'ambos') {
    return key;
  }

  const hasFixed = Number(item?.valor_fixo || item?.num_horas || 0) > 0 || Number(item?.base_eur_hora || 0) > 0;
  const hasVariable = Array.isArray(item?.valores_variaveis) && item.valores_variaveis.length > 0;

  if (hasFixed && hasVariable) return 'ambos';
  if (hasVariable) return 'variavel';
  return 'fixo';
};

const loadImage = (url) =>
  new Promise((resolve) => {
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
  if (nome.includes('neomarca')) return '/neomarca.png';
  if (nome.includes('factortriplo')) return '/factortriplo.png';
  if (nome.includes('2siglas') || nome.includes('2 siglas')) return '/2siglas.png';
  if (nome.includes('geoflicks')) return '/geoflicks.png';
  return '/neomarca.png';
};

export const generateProposalPDF = async (params) => {
  const {
    propostaNumero,
    proposta,
    cliente,
    empresaConsultora,
    tipoProjeto,
    tiposProjetoSelecionados,
    programa,
    selectedPrograma,
    selectedAviso,
    modeloEstrutura,
    orcamentoLinhas,
    orcamentoTiposProjeto,
    servicosConfig,
    notasExclusoes,
    condicoesGerais,
    totais,
    formatDatePt,
    formatCurrency: fmtCurrency,
  } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20; 
  const marginY = 20;
  const contentWidth = pageWidth - marginX * 2;

  let currentY = marginY;
  const footerY = pageHeight - 12;
  const pageReserve = 20;

  const logoPath = getLogoPath(empresaConsultora);
  const logoBase64 = await loadImage(logoPath);

  // Keep PDF ordering consistent with the order defined in the Services step.
  const orderedTipoIds = (Array.isArray(orcamentoTiposProjeto) && orcamentoTiposProjeto.length > 0
    ? orcamentoTiposProjeto
    : Array.isArray(orcamentoLinhas) ? orcamentoLinhas : [])
    .map((item) => String(item?.tipo_projeto_id || item?.id || ''))
    .filter(Boolean);

  const orderedTipoNames = (Array.isArray(orcamentoTiposProjeto) && orcamentoTiposProjeto.length > 0
    ? orcamentoTiposProjeto
    : Array.isArray(orcamentoLinhas) ? orcamentoLinhas : [])
    .map((item) => safeValue(item?.nome))
    .filter((name) => name && name !== '—');

  const getTipoOrderIndex = (tipoProjetoId) => {
    const id = String(tipoProjetoId || '');
    if (!id || orderedTipoIds.length === 0) return Number.MAX_SAFE_INTEGER;
    const idx = orderedTipoIds.indexOf(id);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const orderedModeloEstrutura = (Array.isArray(modeloEstrutura) ? [...modeloEstrutura] : []).sort((a, b) => {
    const tipoOrderA = getTipoOrderIndex(a?.tipo_projeto_id);
    const tipoOrderB = getTipoOrderIndex(b?.tipo_projeto_id);
    if (tipoOrderA !== tipoOrderB) return tipoOrderA - tipoOrderB;
    return Number(a?.ordem || 0) - Number(b?.ordem || 0);
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const ensureSpace = (requiredHeight) => {
    if (currentY + requiredHeight <= pageHeight - pageReserve) return;
    addNewPage();
  };

  const addNewPage = () => {
    doc.addPage();
    currentY = marginY;
  };

  const drawPageFooter = () => {
    const totalPages = doc.getNumberOfPages();
    const currentPage = doc.getCurrentPageInfo().pageNumber;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    
    const currentYear = new Date().getFullYear();
    const empresaNome = empresaConsultora?.nome || 'Consultora';
    const numDoc = proposta?.numero || proposta?.db_id || propostaNumero || '—';
    const footerText = `${empresaNome} © ${currentYear} | Proposta nº ${numDoc} | Pg. ${currentPage} de ${totalPages}`;
    
    doc.text(footerText, marginX, footerY);
    
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);
  };

  const drawSectionTitle = (text) => {
    ensureSpace(15);
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.secondary);
    doc.text(text.toUpperCase(), marginX, currentY);
    currentY += 8;
  };

  const drawTitle = (text) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text(text, marginX, currentY);
    currentY += 5;
  };

  const drawParagraph = (text, options = {}) => {
    const body = safeValue(text);
    const width = Number(options.width || contentWidth);
    const lines = doc.splitTextToSize(body, width);
    lines.forEach((line) => {
      if (currentY > pageHeight - pageReserve) addNewPage();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(Number(options.size || 9.5));
      doc.setTextColor(...(options.color || COLORS.primary));
      doc.text(line, marginX, currentY);
      currentY += Number(options.lineHeight || 4.2);
    });
    currentY += Number(options.gap || 2);
  };

  const drawDetailsTable = (rows) => {
    const tableRows = (Array.isArray(rows) ? rows : []).map((row) => [safeValue(row.label), safeValue(row.value)]);
    if (tableRows.length === 0) return;
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      body: tableRows,
      styles: { font: 'helvetica', fontSize: 8.7, cellPadding: 3, textColor: COLORS.primary, valign: 'top' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 52 },
        1: { cellWidth: contentWidth - 52 },
      },
      alternateRowStyles: { fillColor: COLORS.light },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  };

  const renderKeyList = (title, items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    drawTitle(title);
    items.forEach((item, index) => {
      drawParagraph(`${index + 1}. ${item}`);
    });
  };

  const renderServiceBlock = (servico) => {
    if (!servico) return;
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text(safeValue(servico.nome), marginX, currentY);
    currentY += 5;

    const details = [];
    if (servico.codigo) details.push(`Código: ${servico.codigo}`);
    if (servico.descricao) details.push(`Descrição: ${servico.descricao}`);
    if (servico.honorario_tipo) details.push(`Honorário: ${servico.honorario_tipo}`);
    if (servico.honorario_valor != null) details.push(`Valor base: ${formatCurrency(servico.honorario_valor)}`);
    if (servico.honorario_minimo != null) details.push(`Mínimo: ${formatCurrency(servico.honorario_minimo)}`);
    if (servico.premio_aprovacao) {
      const premioTexto = [servico.premio_fixo != null ? formatCurrency(servico.premio_fixo) : null, servico.premio_pct != null ? `${servico.premio_pct}%` : null].filter(Boolean).join(' + ');
      if (premioTexto) details.push(`Prémio de aprovação: ${premioTexto}`);
    }
    if (servico.condicoes) details.push(`Condições: ${servico.condicoes}`);

    if (details.length > 0) {
      details.forEach((line) => drawParagraph(line, { size: 8.6, gap: 1.2 }));
    }

    if (Array.isArray(servico.entregaveis) && servico.entregaveis.length > 0) {
      renderKeyList('Entregáveis', servico.entregaveis);
    }

    if (Array.isArray(servico.atividades) && servico.atividades.length > 0) {
      renderKeyList('Atividades', servico.atividades);
    }

    currentY += 2;
  };

  // Starts each major section on its own page to avoid overlap and improve readability.
  let hasStartedMainSection = false;
  const startMainSection = (title) => {
    // Avoid creating an extra blank page if we are already at the top
    // due to a previous automatic page break.
    if (hasStartedMainSection && currentY > marginY + 0.5) {
      addNewPage();
    }
    drawSectionTitle(title);
    hasStartedMainSection = true;
  };

  const drawFieldValue = (label, value, x, width, startY) => {
    const isIsolated = startY !== undefined;
    let localY = isIsolated ? startY : currentY;
    const safeLabel = label ? `${label}:` : '';
    const safeVal = safeValue(value);

    if (safeLabel) {
      if (localY > pageHeight - pageReserve) {
        addNewPage();
        localY = currentY;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.primary);
      doc.text(safeLabel, x, localY);
      localY += 4;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.primary);
    const lines = doc.splitTextToSize(safeVal, width - 4);

    for (let i = 0; i < lines.length; i++) {
      if (localY > pageHeight - pageReserve) {
        addNewPage();
        localY = currentY;
      }
      doc.text(lines[i], x, localY);
      localY += 4;
    }
    
    if (!isIsolated) {
      currentY = localY + 2;
    }
    
    return localY + 2;
  };

  const drawTwoColumn = (leftItems = [], rightItems = []) => {
    const colWidth = (contentWidth - 10) / 2;
    const maxRows = Math.max(leftItems.length, rightItems.length);

    for (let i = 0; i < maxRows; i++) {
      const leftItem = leftItems[i];
      const rightItem = rightItems[i];

      let neededLeft = 0;
      let neededRight = 0;

      if (leftItem) {
        const lLines = doc.splitTextToSize(safeValue(leftItem.value), colWidth - 4);
        neededLeft = (leftItem.label ? 4 : 0) + (lLines.length * 4) + 2;
      }
      if (rightItem) {
        const rLines = doc.splitTextToSize(safeValue(rightItem.value), colWidth - 4);
        neededRight = (rightItem.label ? 4 : 0) + (rLines.length * 4) + 2;
      }

      const maxNeeded = Math.max(neededLeft, neededRight);

      if (maxNeeded < (pageHeight - marginY - pageReserve) && currentY + maxNeeded > pageHeight - pageReserve) {
        addNewPage();
      }

      const startY = currentY;
      let endYLeft = startY;
      let endYRight = startY;

      if (leftItem) {
        endYLeft = drawFieldValue(leftItem.label, leftItem.value, marginX, colWidth, startY);
      }
      if (rightItem) {
        endYRight = drawFieldValue(rightItem.label, rightItem.value, marginX + colWidth + 10, colWidth, startY);
      }

      currentY = Math.max(endYLeft, endYRight) + 3;
    }
    currentY += 4;
  };

  // ============================================================================
  // COVER PAGE 
  // ============================================================================

  doc.setFillColor(...COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 25, 60, 50, 50);
  }

  const projectName = selectedPrograma?.descricao || programa?.nome || 'Consultoria para apoio ao Financiamento';
  const clientName = cliente?.nome || 'CLIENTE';
  const propNum = proposta?.numero || proposta?.db_id || propostaNumero || '—';
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  const splitProject = doc.splitTextToSize(projectName, contentWidth - 20);
  doc.text(splitProject, pageWidth / 2, 140, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(...COLORS.secondary);
  doc.text(clientName, pageWidth / 2, 160, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text(`Proposta nº. ${propNum}`, pageWidth / 2, 175, { align: 'center' });
  
  const dateFormatted = formatDatePt ? formatDatePt(proposta?.data || new Date()) : formatDate(proposta?.data || new Date());
  doc.text(dateFormatted, pageWidth / 2, 182, { align: 'center' });

  // ============================================================================
  // CARTA DE APRESENTAÇÃO (Página 2)
  // ============================================================================
  doc.addPage();
  currentY = marginY;

  startMainSection('CONTEXTO');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);

  // Data e Localidade
  const empresaLocalidade = empresaConsultora?.morada?.split(',')[0] || 'Faro';
  doc.text(`${empresaLocalidade}, ${dateFormatted}`, marginX, currentY);
  currentY += 10;

  // Saudação
  const contactoNome = cliente?.contacto_nome || 'Sr(a).';
  doc.text(`Estimado(a) ${contactoNome},`, marginX, currentY);
  currentY += 8;

  // Dados do Cliente
  doc.setFont('helvetica', 'bold');
  doc.text(`${cliente?.nome || 'Empresa Cliente'}`, marginX, currentY);
  currentY += 5;
  const clienteCidade = cliente?.distrito_cidade?.split('/')[0]?.trim() || '';
  if (clienteCidade) {
    doc.text(clienteCidade, marginX, currentY);
    currentY += 8;
  } else {
    currentY += 3;
  }

  // Assunto
  doc.text(`Proposta nº ${propNum} - ${projectName}`, marginX, currentY);
  currentY += 10;

  // Corpo da Carta
  doc.setFont('helvetica', 'normal');
  const nomeEmpresa = empresaConsultora?.nome?.toUpperCase() || 'nossa empresa';
  
  const letterText = `Desde já agradeço a consulta e a oportunidade que concederam à ${nomeEmpresa} para vos apresentar os nossos serviços.

O nosso compromisso é oferecer o nosso melhor conhecimento e dedicar os melhores recursos a este projeto, de modo a atingir os objetivos pretendidos e os resultados esperados no prazo desejado.

Com vista a dar seguimento ao processo, remetemos a nossa proposta de prestação de serviços, onde apresentamos as opções e planos de colaboração.

Como sempre, e numa perspetiva de cooperação aberta e ativa com os nossos clientes, estamos disponíveis para avaliar em conjunto a solução que melhor se adeque ao vosso projeto.

Por favor, leia a proposta para garantir que entende todos os detalhes do serviço proposto pela ${nomeEmpresa}.

Para aprovação desta proposta pedimos que nos envie um email a confirmar a adjudicação.

Após a aceitação da proposta será redigido o Contrato de Prestação de Serviços a subscrever com a ${nomeEmpresa}.

Gratos pela vossa atenção, ficamos ao dispor para qualquer questão adicional.`;

  const splitLetter = doc.splitTextToSize(letterText, contentWidth);
  
  // Imprimir a carta com espaçamento confortável
  for (let i = 0; i < splitLetter.length; i++) {
    if (currentY > pageHeight - pageReserve) {
      addNewPage();
    }
    doc.text(splitLetter[i], marginX, currentY);
    currentY += 5; 
  }
  currentY += 10;

  // Assinatura
  doc.setFont('helvetica', 'bold');
  doc.text(`${empresaConsultora?.nome_signatario || 'A Gerência'}`, marginX, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${empresaConsultora?.cargo_signatario || 'Direção'}`, marginX, currentY);
  currentY += 5;
  doc.text(`T. ${empresaConsultora?.telefone || '—'}`, marginX, currentY);
  currentY += 5;
  doc.text(`E: ${empresaConsultora?.email || '—'}`, marginX, currentY);

  const numeroLabel = propNum && propNum !== '—' ? propNum : 'Por atribuir';
  const tipoProjetoLabel = orderedTipoNames.length > 0 ? orderedTipoNames.join(' + ') : safeValue(tipoProjeto?.nome);
  
  // ============================================================================
  // CONTEÚDO TÉCNICO (Página 3 em diante)
  // ============================================================================
  startMainSection('ENQUADRAMENTO');

  drawTitle('Detalhes da Proposta');
  drawTwoColumn(
    [
      { label: 'Número', value: numeroLabel },
      { label: 'Estado', value: formatEstadoLabel(proposta?.estado) },
    ],
    [
      { label: 'Data', value: dateFormatted },
      { label: 'Validade', value: `${Number(proposta?.validade || 30)} dias` },
      { label: 'NIPC Cliente', value: cliente?.nipc },
    ]
  );

  if (cliente?.setor_atividade) {
    drawTitle('Setor de Atividade');
    drawFieldValue(null, cliente.setor_atividade, marginX, contentWidth);
    currentY += 4;
  }

  drawTitle('Enquadramento de Financiamento');
  drawTwoColumn(
    [
      {
        label: 'Tipo de projeto',
        value: orderedTipoNames.length > 0 ? orderedTipoNames.join(' + ') : tipoProjeto?.nome,
      },
    ],
    [
      { label: 'Investimento elegível', value: fmtCurrency ? fmtCurrency(proposta?.investimento || 0) : formatCurrency(proposta?.investimento || 0) },
      { label: 'Taxa de incentivo', value: programa?.pct ? `${programa.pct}%` : '—' },
    ]
  );

  if (programa?.nome || selectedAviso?.nome || selectedAviso?.codigo || selectedPrograma?.aviso) {
    drawTitle('Programa e Aviso');
    drawTwoColumn(
      [
        { label: 'Programa', value: programa?.nome || '—' },
        { label: 'Objetivos', value: selectedPrograma?.objetivos || '—' },
      ],
      [
        { label: 'Aviso', value: selectedAviso?.nome || selectedAviso?.codigo || selectedPrograma?.aviso || '—' },
        { label: 'Ações elegíveis', value: selectedPrograma?.acoes_elegiveis || '—' },
      ]
    );
    if (selectedPrograma?.descricao || selectedPrograma?.objetivos || selectedPrograma?.acoes_elegiveis || selectedPrograma?.condicoes_especificas) {
      if (selectedPrograma?.descricao) drawParagraph(`Descrição: ${selectedPrograma.descricao}`);
      if (selectedPrograma?.condicoes_especificas) drawParagraph(`Condições específicas: ${selectedPrograma.condicoes_especificas}`);
      if (selectedAviso?.fases && selectedAviso.fases.length > 0) {
        renderKeyList('Prazos / Fases do Aviso', selectedAviso.fases.map((fase) => `${fase.nome || 'Fase'} — ${formatDate(fase.prazo)}`));
      }
    }
  }

  startMainSection('ATIVIDADES');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  const txtAtividades = doc.splitTextToSize("A prestação dos serviços de consultoria propostos será orientada de forma a implementar as atividades que visam a submissão do pedido de financiamento, bem como a assessoria na gestão do projeto financiado.", contentWidth);
  doc.text(txtAtividades, marginX, currentY);
  currentY += txtAtividades.length * 4 + 6;

  if (!orderedModeloEstrutura || orderedModeloEstrutura.length === 0) {
    drawFieldValue('', 'Sem etapas registadas', marginX, contentWidth);
  } else {
    orderedModeloEstrutura.forEach((atividade, index) => {
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLORS.primary);
      doc.text(`FASE ${index + 1} - ${safeValue(atividade.nome).toUpperCase()}`, marginX, currentY);
      currentY += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      if (atividade.descricao) {
        const lines = doc.splitTextToSize(safeValue(atividade.descricao), contentWidth);
        doc.text(lines, marginX, currentY);
        currentY += lines.length * 4 + 2;
      }

      const tarefas = (atividade.tarefas || []).filter((t) => t.selecionado !== false);
      if (tarefas.length > 0) {
        tarefas.forEach((t) => {
          ensureSpace(5);
          const lines = doc.splitTextToSize(`• ${t.nome}`, contentWidth - 5);
          doc.text(lines, marginX + 3, currentY);
          currentY += lines.length * 4;
        });
        currentY += 4;
      }
    });
  }

  startMainSection('ORÇAMENTO');
  const orcamentoTabelaRows = [];
  const orcamentoTableStyles = [];

  if (Array.isArray(orcamentoTiposProjeto) && orcamentoTiposProjeto.length > 0) {
    orcamentoTiposProjeto.forEach((item) => {
      const modo = normalizeModoHonorario(item.modo_honorario, item);
      const pagamentoTexto = (item.plano_pagamentos || []).length > 0
        ? (item.plano_pagamentos || [])
            .map((pag) => `${Number(pag.percentagem || 0)}% ${safeValue(pag.descricao)}`)
            .join('\n')
        : '—';

      if (modo !== 'variavel') {
        orcamentoTabelaRows.push([
          `Módulo ${safeValue(item.ordem)} - ${safeValue(item.nome)}`,
          fmtCurrency ? fmtCurrency(item.valor_fixo || item.valor || 0) : formatCurrency(item.valor_fixo || item.valor || 0),
          pagamentoTexto,
        ]);
        orcamentoTableStyles.push('fixed');
      }

      if (modo !== 'fixo' && Array.isArray(item.valores_variaveis) && item.valores_variaveis.length > 0) {
        item.valores_variaveis.forEach((variavel) => {
          const subtotalTexto = `${fmtCurrency ? fmtCurrency(variavel.valor_base || 0) : formatCurrency(variavel.valor_base || 0)} + ${Number(variavel.percentagem || 0)}% ${safeValue(variavel.variavel)}`;
          orcamentoTabelaRows.push([
            safeValue(variavel.servico || variavel.variavel || item.nome),
            subtotalTexto,
            safeValue(variavel.descricao),
          ]);
          orcamentoTableStyles.push('variable');
        });
      }
    });
  }

  if (orcamentoTabelaRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Serviço', 'Subtotal', 'Condições de Pagamento']],
      body: orcamentoTabelaRows,
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 4,
        valign: 'middle',
        textColor: COLORS.primary,
        overflow: 'linebreak',
      },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 58, fontStyle: 'bold' },
        1: { cellWidth: 72, halign: 'center' },
        2: { cellWidth: contentWidth - 130 },
      },
      alternateRowStyles: { fillColor: COLORS.light },
      didParseCell: (hookData) => {
        const rowType = orcamentoTableStyles[hookData.row.index];
        if (rowType === 'fixed') {
          hookData.cell.styles.fontStyle = 'bold';
        }
        if (hookData.section === 'body' && hookData.column.index === 1 && rowType === 'variable') {
          hookData.cell.styles.fontStyle = 'normal';
        }
      },
    });
    currentY = doc.lastAutoTable.finalY + 10;
  } else {
    drawFieldValue('', 'Sem serviços configurados', marginX, contentWidth);
  }

  if (totais) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX + contentWidth / 2, right: marginX },
      body: [
        ['Total s/ IVA', fmtCurrency ? fmtCurrency(totais.totalSemIva) : formatCurrency(totais.totalSemIva)],
        [`IVA (${Number(proposta?.iva || 23)}%)`, fmtCurrency ? fmtCurrency(totais.totalIva) : formatCurrency(totais.totalIva)],
        ['Total c/ IVA', fmtCurrency ? fmtCurrency(totais.totalComIva) : formatCurrency(totais.totalComIva)],
      ],
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: COLORS.primary },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: COLORS.light },
    });
    currentY = doc.lastAutoTable.finalY + 10;
  }

  startMainSection('TERMOS GERAIS');

  if (notasExclusoes && notasExclusoes.length > 0) {
    drawTitle('Notas e Exclusões');
    notasExclusoes.forEach((nota, index) => {
      const lines = doc.splitTextToSize(`${index + 1}. ${nota}`, contentWidth);
      lines.forEach((line) => {
        if (currentY > pageHeight - pageReserve) addNewPage();
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(line, marginX, currentY);
        currentY += 4;
      });
      currentY += 2;
    });
    currentY += 2;
  }

  drawTitle('Informação Legal');
  const legalBody = String(condicoesGerais?.termos_gerais || '').trim() || 'Sem termos gerais definidos.';
  const linesLegal = doc.splitTextToSize(legalBody, contentWidth);
  linesLegal.forEach((line) => {
    if (currentY > pageHeight - pageReserve) addNewPage();
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(line, marginX, currentY);
    currentY += 4;
  });
  currentY += 2;

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    drawPageFooter();
  }

  doc.save(`Proposta-${propNum}.pdf`);
};
