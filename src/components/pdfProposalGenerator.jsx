import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================================
// CONFIGURAÇÕES E PALETA DE CORES
// ============================================================================
const COLORS = {
  primary: [43, 49, 57],      // Antracite escuro
  secondary: [110, 119, 129], // Cinza ardósia
  accent: [168, 199, 58],     // Verde
  white: [255, 255, 255],
  border: [230, 230, 230],
  light: [248, 249, 250],
};

const buildDefaultCartaApresentacao = (nomeEmpresa) => `Desde já agradeço a consulta e a oportunidade que concederam à ${nomeEmpresa} para vos apresentar os nossos serviços.

O nosso compromisso é oferecer o nosso melhor conhecimento e dedicar os melhores recursos a este projeto, de modo a atingir os objetivos pretendidos e os resultados esperados no prazo desejado.

Com vista a dar seguimento ao processo, remetemos a nossa proposta de prestação de serviços, onde apresentamos as opções e planos de colaboração.`;

const DEFAULT_SERVICOS_INTRO = 'A prestação dos serviços de consultoria propostos será orientada de forma a implementar os serviços que visam a submissão do pedido de financiamento, bem como a assessoria na gestão do projeto financiado.';

// ============================================================================
// FUNÇÕES AUXILIARES
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

const normalizeModoHonorario = (modo, item = {}) => {
  const key = String(modo || '').trim().toLowerCase();
  if (key === 'fixo' || key === 'variavel' || key === 'ambos') return key;

  const hasFixed = Number(item?.valor_fixo || item?.num_horas || 0) > 0 || Number(item?.base_eur_hora || 0) > 0;
  const hasVariable = Array.isArray(item?.valores_variaveis) && item.valores_variaveis.length > 0;

  if (hasFixed && hasVariable) return 'ambos';
  if (hasVariable) return 'variavel';
  return 'fixo';
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
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
  });

const getLogoPath = (empresaConsultora) => {
  if (!empresaConsultora) return '/neomarca.png';
  const nome = (empresaConsultora.nome || '').toLowerCase();
  if (nome.includes('factortriplo')) return '/factortriplo.png';
  if (nome.includes('2siglas') || nome.includes('2 siglas')) return '/2siglas.png';
  if (nome.includes('geoflicks')) return '/geoflicks.png';
  return '/neomarca.png';
};

const romanize = (num) => {
  const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '', i;
  for (i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
};

// ============================================================================
// GERAÇÃO DO PDF
// ============================================================================
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
    textosProposta,
    notasExclusoes,
    condicoesGerais,
    entidadeConfig = {}, // Recebe a config da nova aba
    proposalData = {},
    totais,
    formatDatePt,
    formatCurrency: fmtCurrency,
  } = params;

  const proposal = proposalData || {};
  const sourceEmpresaConsultora = proposal.empresa_consultora || empresaConsultora;
  const sourceCliente = proposal.cliente || cliente;
  const sourcePrograma = proposal.programa || programa;
  const sourceSelectedPrograma = proposal.selected_programa || selectedPrograma;
  const sourceSelectedAviso = proposal.selected_aviso || selectedAviso;
  const sourceTipoProjeto = proposal.tipo_projeto || tipoProjeto;
  const sourceTiposProjetoSelecionados = proposal.tipos_projeto || tiposProjetoSelecionados;
  const sourceModeloEstrutura = proposal.modelo_estrutura || modeloEstrutura;
  const sourceOrcamentoLinhas = proposal.servicos || orcamentoLinhas;
  const sourceOrcamentoTiposProjeto = proposal.orcamento?.tipos_projeto || orcamentoTiposProjeto;
  const sourceNotasExclusoes = proposal.orcamento?.notas || notasExclusoes;
  const sourceCondicoesGerais = proposal.condicoes_gerais || condicoesGerais;
  const sourceEntidadeConfig = proposal.entidade_config || entidadeConfig;
  const sourceTotais = proposal.totais || totais;

  const config = { ...sourceCondicoesGerais, ...sourceEntidadeConfig };

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 22; 
  const marginY = 25;
  const contentWidth = pageWidth - marginX * 2;

  let currentY = marginY;
  const footerY = pageHeight - 15;
  const pageReserve = 25;

  // Carregar Imagens
  const logoBase64 = await loadImage(getLogoPath(sourceEmpresaConsultora));
  const capaBase64 = await loadImage('/capaconsultoria.png'); 
  const certificacoesBase64 = await loadImage(config.imagem_certificacoes);

  // Ordenações e Nomes
  const orderedTipoIds = (Array.isArray(sourceOrcamentoTiposProjeto) && sourceOrcamentoTiposProjeto.length > 0
    ? sourceOrcamentoTiposProjeto : Array.isArray(sourceOrcamentoLinhas) ? sourceOrcamentoLinhas : [])
    .map((item) => String(item?.tipo_projeto_id || item?.id || '')).filter(Boolean);

  const orderedTipoNames = (Array.isArray(sourceOrcamentoTiposProjeto) && sourceOrcamentoTiposProjeto.length > 0
    ? sourceOrcamentoTiposProjeto : Array.isArray(sourceOrcamentoLinhas) ? sourceOrcamentoLinhas : [])
    .map((item) => safeValue(item?.nome)).filter((name) => name && name !== '—');

  const getTipoProjetoNome = (id) => {
    if (!id || id === 'default') return 'Serviços do Projeto';
    const inOrcamento = (sourceOrcamentoTiposProjeto || []).find(t => String(t.tipo_projeto_id || t.id) === String(id));
    if (inOrcamento && inOrcamento.nome) return inOrcamento.nome;
    const inSelecionados = (sourceTiposProjetoSelecionados || []).find(t => String(t.id) === String(id));
    if (inSelecionados && inSelecionados.nome) return inSelecionados.nome;
    return 'Serviços';
  };

  const getTipoOrderIndex = (tipoProjetoId) => {
    const id = String(tipoProjetoId || '');
    if (!id || orderedTipoIds.length === 0) return Number.MAX_SAFE_INTEGER;
    const idx = orderedTipoIds.indexOf(id);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const orderedModeloEstrutura = (Array.isArray(sourceModeloEstrutura) ? [...sourceModeloEstrutura] : []).sort((a, b) => {
    const tipoOrderA = getTipoOrderIndex(a?.tipo_projeto_id);
    const tipoOrderB = getTipoOrderIndex(b?.tipo_projeto_id);
    if (tipoOrderA !== tipoOrderB) return tipoOrderA - tipoOrderB;
    return Number(a?.ordem || 0) - Number(b?.ordem || 0);
  });

  const cartaApresentacao = String(textosProposta?.carta_apresentacao || '').trim() || buildDefaultCartaApresentacao(sourceEmpresaConsultora?.nome?.toUpperCase() || 'nossa empresa');
  const servicosIntroducao = String(textosProposta?.servicos_introducao || config.texto_como_ajudamos || config.texto_processo_trabalho || '').trim() || DEFAULT_SERVICOS_INTRO;

  let sectionCounter = 1;

  // ============================================================================
  // FUNÇÕES DE DESENHO (SINGLE COLUMN FOCUS)
  // ============================================================================

  const drawPageHeader = () => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    doc.text('Proposta de Consultoria', pageWidth - marginX, 15, { align: 'right' });
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - marginX - 35, 17, pageWidth - marginX, 17);
  };

  const drawPageFooter = () => {
    const totalPages = doc.getNumberOfPages();
    const currentPage = doc.getCurrentPageInfo().pageNumber;
    if (currentPage === 1) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    
    const empresaNome = sourceEmpresaConsultora?.nome || 'Consultora';
    const numDoc = proposta?.numero || proposta?.db_id || propostaNumero || '—';
    
    doc.text(`${empresaNome} © ${new Date().getFullYear()} | Proposta nº ${numDoc}`, marginX, footerY);
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
    ensureSpace(15);
    currentY += 5;
    doc.setFillColor(...COLORS.accent);
    doc.rect(marginX, currentY - 4.5, 3, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${sectionCounter}. ${text.toUpperCase()}`, marginX + 6, currentY);
    sectionCounter += 1;
    currentY += 8;
  };

  const drawTitle = (text) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text(text, marginX, currentY);
    currentY += 6;
  };

  const drawParagraph = (text, options = {}) => {
    if (!text) return;
    const body = String(text).replace(/\r\n/g, '\n').trim();
    const width = Number(options.width || contentWidth);
    const paragraphs = body.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);

    paragraphs.forEach((paragraph, paragraphIndex) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(Number(options.size || 10));
      doc.setTextColor(...(options.color || COLORS.secondary));

      const lines = doc.splitTextToSize(paragraph, width);
      lines.forEach((line) => {
        if (currentY > pageHeight - pageReserve) addNewPage();
        const isLastLine = lines.indexOf(line) === lines.length - 1;
        if (!isLastLine && line.includes(' ')) {
             doc.text(line, marginX, currentY, { maxWidth: width, align: 'justify' });
        } else {
             doc.text(line, marginX, currentY);
        }
        currentY += Number(options.lineHeight || 5);
      });

      if (paragraphIndex < paragraphs.length - 1) currentY += Number(options.paragraphGap || 4);
    });
    currentY += Number(options.gap || 4);
  };

  // ----------------------------------------------------------------------------
  // NOVA FUNÇÃO: Linha de Campo Única (Substitui as Colunas Duplas)
  // Faz com que Label e Valor fluam perfeitamente na horizontal e vertical
  // ----------------------------------------------------------------------------
  const drawFieldLine = (label, value) => {
    if (!value || value === '—') return;
    ensureSpace(8);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.primary);
    const labelText = `${label}: `;
    const labelWidth = doc.getTextWidth(labelText);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);
    
    const valueStr = String(value).trim();
    const inlineLines = doc.splitTextToSize(valueStr, contentWidth - labelWidth);

    // Se o texto for curto, escreve na frente da Label.
    // Se for comprido (várias linhas), escreve debaixo da Label ocupando toda a largura.
    if (inlineLines.length === 1) {
        doc.text(labelText, marginX, currentY);
        doc.text(inlineLines[0], marginX + labelWidth, currentY);
        currentY += 6;
    } else {
        doc.text(labelText, marginX, currentY);
        currentY += 5;
        const fullWidthLines = doc.splitTextToSize(valueStr, contentWidth);
        doc.text(fullWidthLines, marginX, currentY);
        currentY += (fullWidthLines.length * 4.5) + 3;
    }
  };

  const renderKeyList = (title, items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    drawTitle(title);
    items.forEach((item) => {
      drawParagraph(`• ${item}`, { size: 9.5, lineHeight: 4.5, gap: 1 });
    });
    currentY += 3;
  };

  let hasStartedMainSection = false;
  const startMainSection = (title) => {
    if (hasStartedMainSection && currentY > marginY + 0.5) addNewPage();
    drawSectionTitle(title);
    hasStartedMainSection = true;
  };

  // ============================================================================
  // PÁGINA 1: CAPA
  // ============================================================================

  doc.setFillColor(...COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  const rightPadding = 15;
  const contentX = (pageWidth / 2) + rightPadding;

  if (capaBase64) {
      const props = doc.getImageProperties(capaBase64);
      const imageRatio = props.width / props.height;
      const targetWidth = pageWidth / 2;
      const targetHeight = targetWidth / imageRatio;
      const renderHeight = targetHeight < pageHeight ? pageHeight : targetHeight;
      const renderWidth = renderHeight * imageRatio;
      const xOffset = targetWidth < renderWidth ? (targetWidth - renderWidth) / 2 : 0;

      doc.addImage(capaBase64, 'PNG', xOffset, 0, renderWidth, renderHeight, undefined, 'FAST');
      doc.setDrawColor(...COLORS.accent);
      doc.setLineWidth(1.5);
      doc.line(pageWidth / 2, 0, pageWidth / 2, pageHeight);
  } else {
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, pageWidth / 2, pageHeight, 'F');
      doc.setFillColor(...COLORS.accent);
      doc.rect((pageWidth / 2) - 2, 0, 4, pageHeight, 'F');
  }

  if (logoBase64) doc.addImage(logoBase64, 'PNG', contentX, 25, 50, 50, undefined, 'FAST');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.secondary);
  doc.text('PROPOSTA DE PRESTAÇÃO', contentX, 100);
  doc.text('DE SERVIÇOS', contentX, 105);

  const projectName = selectedPrograma?.descricao || programa?.codigo || programa?.nome || 'Consultoria para apoio ao Financiamento';
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.accent); 
  const splitProject = doc.splitTextToSize(projectName, (pageWidth / 2) - rightPadding - 10);
  doc.text(splitProject, contentX, 120);

  const clientName = sourceCliente?.nome || 'Cliente';
  const propNum = proposta?.numero || proposta?.db_id || propostaNumero || '—';
  const dateFormatted = formatDatePt ? formatDatePt(proposta?.data || new Date()) : formatDate(proposta?.data || new Date());

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primary);
  doc.text(clientName, contentX, 240);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);
  doc.text(`Proposta nº. ${propNum}`, contentX, 246);
  doc.text(dateFormatted, contentX, 251);


  // ============================================================================
  // CARTA DE APRESENTAÇÃO
  // ============================================================================
  addNewPage();
  startMainSection('ÂMBITO DA PROPOSTA');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);

  const empresaLocalidade = sourceEmpresaConsultora?.morada?.split(',')[0] || 'Faro';
  doc.text(`${empresaLocalidade}, ${dateFormatted}`, marginX, currentY);
  currentY += 12;

  const contactoNome = sourceCliente?.contacto_nome || 'A/C Direção';
  doc.text(`Estimado(a) ${contactoNome},`, marginX, currentY);
  currentY += 10;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(`${sourceCliente?.nome || 'Empresa Cliente'}`, marginX, currentY);
  currentY += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  const clienteCidade = sourceCliente?.distrito_cidade?.split('/')[0]?.trim() || '';
  if (clienteCidade) {
    doc.text(clienteCidade, marginX, currentY);
    currentY += 10;
  } else currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`Assunto: Proposta nº ${propNum} - ${projectName}`, marginX, currentY);
  currentY += 12;

  // Corpo principal da Carta
  drawParagraph(cartaApresentacao, { size: 10, lineHeight: 5.5, gap: 4, color: COLORS.secondary });

  // Injeção de textos configurados da aba Entidade
  if (config.texto_compromisso) drawParagraph(config.texto_compromisso, { size: 10, lineHeight: 5.5, gap: 4, color: COLORS.secondary });
  if (config.texto_esperamos_que_corresponda) drawParagraph(config.texto_esperamos_que_corresponda, { size: 10, lineHeight: 5.5, gap: 4, color: COLORS.secondary });
  if (config.texto_para_aprovacao) drawParagraph(config.texto_para_aprovacao, { size: 10, lineHeight: 5.5, gap: 10, color: COLORS.secondary });

  // Assinatura Configurada
  const signatarioNome = config.signatario_nome || empresaConsultora?.nome_signatario || 'A GERÊNCIA';
  const signatarioCargo = config.signatario_cargo || empresaConsultora?.cargo_signatario || 'Direção';
  const signatarioTel = config.signatario_telefone || empresaConsultora?.telefone || '—';
  const signatarioEmail = config.signatario_email || empresaConsultora?.email || '—';

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(signatarioNome.toUpperCase(), marginX, currentY);
  currentY += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  doc.text(signatarioCargo, marginX, currentY);
  currentY += 5;
  doc.text(`T. ${signatarioTel} | E. ${signatarioEmail}`, marginX, currentY);

  const numeroLabel = propNum && propNum !== '—' ? propNum : 'Por atribuir';
  const tipoProjetoLabel = orderedTipoNames.length > 0 ? orderedTipoNames.join(' + ') : safeValue(sourceTipoProjeto?.nome);


  // ============================================================================
  // APRESENTAÇÃO E PROCESSO DA EMPRESA (Se configurado)
  // ============================================================================
  const temApresentacao = config.texto_apresentacao_empresa || config.texto_como_ajudamos;
  if (temApresentacao) {
      startMainSection('SOBRE NÓS');
      
      if (config.texto_apresentacao_empresa) {
          drawTitle('Apresentação da Entidade');
          drawParagraph(config.texto_apresentacao_empresa, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
      }
      
      if (config.texto_como_ajudamos) {
          drawTitle('Como Ajudamos o seu Negócio');
          drawParagraph(config.texto_como_ajudamos, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
      }
  }


  // ============================================================================
  // ENQUADRAMENTO DO PROJETO (Totalmente numa coluna!)
  // ============================================================================
  startMainSection('ENQUADRAMENTO DO PROJETO');

  drawTitle('Detalhes Gerais');
  drawFieldLine('Número da Proposta', numeroLabel);
  drawFieldLine('Estado Atual', formatEstadoLabel(proposta?.estado));
  drawFieldLine('Data de Emissão', dateFormatted);
  drawFieldLine('Validade da Proposta', `${Number(proposta?.validade || 30)} dias`);
  drawFieldLine('NIPC do Cliente', cliente?.nipc);
  if (cliente?.setor_atividade) {
      drawFieldLine('Setor de Atividade', cliente.setor_atividade);
  }

  currentY += 6;
  drawTitle('Detalhes de Financiamento');
  drawFieldLine('Tipo de projeto', tipoProjetoLabel);
  drawFieldLine('Investimento Elegível Previsto', fmtCurrency ? fmtCurrency(proposta?.investimento || 0) : formatCurrency(proposta?.investimento || 0));
    if (sourcePrograma?.pct) drawFieldLine('Taxa de Incentivo', `${sourcePrograma.pct}%`);

    if (sourcePrograma?.codigo || sourcePrograma?.nome || sourceSelectedAviso?.nome || sourceSelectedAviso?.codigo || sourceSelectedPrograma?.aviso) {
    currentY += 6;
    drawTitle('Programa e Aviso');
    drawFieldLine('Código do Programa', sourcePrograma?.codigo || sourcePrograma?.nome);
    drawFieldLine('Designação do Aviso', sourceSelectedAviso?.nome || sourceSelectedAviso?.codigo || sourceSelectedPrograma?.aviso);

    currentY += 4;
    if (sourceSelectedPrograma?.objetivos) {
        drawTitle('Objetivos:');
      drawParagraph(sourceSelectedPrograma.objetivos, { size: 9, lineHeight: 4.5, color: COLORS.secondary });
    }
    if (sourceSelectedPrograma?.acoes_elegiveis) {
        drawTitle('Ações elegíveis:');
      drawParagraph(sourceSelectedPrograma.acoes_elegiveis, { size: 9, lineHeight: 4.5, color: COLORS.secondary });
    }
    if (sourceSelectedPrograma?.descricao) {
        drawTitle('Descrição:');
      drawParagraph(sourceSelectedPrograma.descricao, { size: 9, lineHeight: 4.5, color: COLORS.secondary });
    }
    if (sourceSelectedPrograma?.condicoes_especificas) {
        drawTitle('Condições específicas:');
      drawParagraph(sourceSelectedPrograma.condicoes_especificas, { size: 9, lineHeight: 4.5, color: COLORS.secondary });
    }
    if (sourceSelectedAviso?.fases && sourceSelectedAviso.fases.length > 0) {
      renderKeyList('Prazos / Fases do Aviso', sourceSelectedAviso.fases.map((fase) => `${fase.nome || 'Fase'} — ${formatDate(fase.prazo)}`));
    }
  }

  // Financiamento Custom Texts
  if (config.texto_demonstracao_financiamento) {
      startMainSection('SOBRE O FINANCIAMENTO');
      drawParagraph(config.texto_demonstracao_financiamento, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
  }

  if (config.texto_processo_trabalho) {
      startMainSection('PROCESSO DE TRABALHO');
      drawParagraph(config.texto_processo_trabalho, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
  }


  // ============================================================================
  // SERVIÇOS 
  // ============================================================================
  startMainSection('MÉTODO E SERVIÇOS A PRESTAR');
  
  drawParagraph(servicosIntroducao, { size: 10, lineHeight: 5, gap: 8 });

  if (!orderedModeloEstrutura || orderedModeloEstrutura.length === 0) {
    drawFieldLine('Status', 'Sem atividades registadas');
  } else {
    const atividadesPorTipo = {};
    orderedModeloEstrutura.forEach(atividade => {
       const id = atividade.tipo_projeto_id || 'default';
       if (!atividadesPorTipo[id]) atividadesPorTipo[id] = [];
       atividadesPorTipo[id].push(atividade);
    });

    let tipoCounter = 1;
    const idsToIterate = orderedTipoIds.length > 0 ? orderedTipoIds : Object.keys(atividadesPorTipo);
    
    idsToIterate.forEach(tipoId => {
      if (!atividadesPorTipo[tipoId] || atividadesPorTipo[tipoId].length === 0) return;
      const tipoNome = getTipoProjetoNome(tipoId);

      ensureSpace(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.accent);
      doc.text(`${romanize(tipoCounter)} - ${tipoNome.toUpperCase()}`, marginX, currentY);
      currentY += 8;
      tipoCounter++;

      atividadesPorTipo[tipoId].forEach((atividade) => {
        ensureSpace(12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.primary);
        doc.text(safeValue(atividade.nome), marginX, currentY);
        currentY += 6;
        
        if (atividade.descricao) {
          drawParagraph(atividade.descricao, { size: 9, lineHeight: 4.5, color: COLORS.secondary, gap: 2 });
        }

        const tarefas = (atividade.tarefas || []).filter((t) => t.selecionado !== false);
        if (tarefas.length > 0) {
          tarefas.forEach((t) => {
            ensureSpace(6);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...COLORS.secondary);
            const lines = doc.splitTextToSize(`• ${t.nome}`, contentWidth - 5);
            doc.text(lines, marginX + 3, currentY);
            currentY += lines.length * 4.5;
          });
          currentY += 4;
        }
      });
      currentY += 6;
    });
  }


  // ============================================================================
  // DOCUMENTAÇÃO
  // ============================================================================
  if (config.texto_documentos_empresa || config.texto_documentos_incentivo) {
      startMainSection('DOCUMENTAÇÃO NECESSÁRIA');
      
      if (config.texto_documentos_empresa) {
          drawTitle('Documentação da Empresa');
          drawParagraph(config.texto_documentos_empresa, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
      }
      if (config.texto_documentos_incentivo) {
          drawTitle('Documentação de Incentivo');
          drawParagraph(config.texto_documentos_incentivo, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
      }
  }


  // ============================================================================
  // ORÇAMENTO E PAGAMENTO
  // ============================================================================
  startMainSection('HONORÁRIOS E CONDIÇÕES');
  
  const orcamentoTabelaRows = [];
  const orcamentoTableStyles = [];

  if (Array.isArray(orcamentoTiposProjeto) && orcamentoTiposProjeto.length > 0) {
    orcamentoTiposProjeto.forEach((item) => {
      const modo = normalizeModoHonorario(item.modo_honorario, item);
      const pagamentoTexto = (item.plano_pagamentos || []).length > 0
        ? (item.plano_pagamentos || []).map((pag) => `${Number(pag.percentagem || 0)}% ${safeValue(pag.descricao)}`).join('\n')
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
          orcamentoTabelaRows.push([ safeValue(variavel.servico || variavel.variavel || item.nome), subtotalTexto, safeValue(variavel.descricao) ]);
          orcamentoTableStyles.push('variable');
        });
      }
    });
  }

  if (orcamentoTabelaRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Serviço', 'Valor / Honorário', 'Condições de Pagamento']],
      body: orcamentoTabelaRows,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, valign: 'middle', textColor: COLORS.primary, overflow: 'linebreak' },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 55, halign: 'center' },
        2: { cellWidth: contentWidth - 110 },
      },
      alternateRowStyles: { fillColor: COLORS.light },
      didParseCell: (hookData) => {
        const rowType = orcamentoTableStyles[hookData.row.index];
        if (rowType === 'fixed') hookData.cell.styles.fontStyle = 'bold';
        if (hookData.section === 'body' && hookData.column.index === 1 && rowType === 'variable') {
          hookData.cell.styles.fontStyle = 'normal';
          hookData.cell.styles.textColor = COLORS.secondary;
        }
      },
    });
    currentY = doc.lastAutoTable.finalY + 12;
  }

  if (sourceTotais) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX + contentWidth / 2, right: marginX },
      body: [
        ['Total s/ IVA', fmtCurrency ? fmtCurrency(sourceTotais.totalSemIva) : formatCurrency(sourceTotais.totalSemIva)],
        [`IVA (${Number(proposta?.iva || 23)}%)`, fmtCurrency ? fmtCurrency(sourceTotais.totalIva) : formatCurrency(sourceTotais.totalIva)],
        ['Total c/ IVA', fmtCurrency ? fmtCurrency(sourceTotais.totalComIva) : formatCurrency(sourceTotais.totalComIva)],
      ],
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 4, textColor: COLORS.primary },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', fontStyle: 'bold', textColor: COLORS.accent } },
      alternateRowStyles: { fillColor: COLORS.light },
    });
    currentY = doc.lastAutoTable.finalY + 15;
  }

  if (config.texto_plano_pagamento) {
      drawTitle('Condições de Pagamento');
      drawParagraph(config.texto_plano_pagamento, { size: 9, lineHeight: 4.5, color: COLORS.secondary });
  }


  // ============================================================================
  // TERMOS E CONDIÇÕES E CERTIFICAÇÕES
  // ============================================================================
  startMainSection('TERMOS E CONDIÇÕES');

  if (sourceNotasExclusoes && sourceNotasExclusoes.length > 0) {
    drawTitle('Notas e Exclusões da Proposta');
    sourceNotasExclusoes.forEach((nota, index) => {
      drawParagraph(`${index + 1}. ${nota}`, { size: 9, lineHeight: 4.5, gap: 2, color: COLORS.secondary });
    });
    currentY += 4;
  }

  if (config.texto_exclusoes) {
      drawTitle('Exclusões e Condições Especiais');
      drawParagraph(config.texto_exclusoes, { size: 9, lineHeight: 4.5, color: COLORS.secondary });
  }

  drawTitle('Informação Legal');
  const legalBody = String(config.termos_gerais || condicoesGerais?.termos_gerais || '').trim() || 'Sem termos gerais definidos.';
  drawParagraph(legalBody, { size: 9, lineHeight: 4.5, color: COLORS.secondary });

  // Certificações no Fim
  if (certificacoesBase64) {
      ensureSpace(40);
      drawTitle('As Nossas Certificações');
      
      const props = doc.getImageProperties(certificacoesBase64);
      const ratio = props.width / props.height;
      const w = 140; // max width
      const h = w / ratio;
      
      doc.addImage(certificacoesBase64, 'PNG', marginX, currentY, w, h, undefined, 'FAST');
      currentY += h + 10;
  }

  // ============================================================================
  // RODAPÉS
  // ============================================================================
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    drawPageFooter();
  }

  doc.save(`Proposta-${propNum}.pdf`);
};