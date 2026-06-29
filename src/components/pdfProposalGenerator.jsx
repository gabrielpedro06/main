import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../services/supabase';

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

const buildDefaultCartaApresentacao = (nomeEmpresa) => `Desde já agradeço a consulta e a oportunidade que concederam à ${nomeEmpresa} para vos apresentar os nossos serviços.`;

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

// Nova função de sanitização de texto (remove lixo invisível, corrige bullets e bytes nulos)
const sanitizeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/\0/g, '')                     // Remove bytes nulos (resolve o problema do espaçamento A p o i o)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove caracteres invisíveis/zero-width
    .replace(/[•▪]/g, '-')                // Substitui bullets estranhos do Word por hífen/traço
    .replace(/[“”]/g, '"')                  // Normaliza aspas
    .replace(/[‘’]/g, "'")                  // Normaliza pelicas
    .replace(/\u00A0/g, ' ');               // Substitui non-breaking spaces por espaços normais
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

  const isSelected = (item) => item?.selecionado !== false;
  const visibleOrcamentoTiposProjeto = (Array.isArray(sourceOrcamentoTiposProjeto) ? sourceOrcamentoTiposProjeto : []).filter(isSelected);

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
  const orderedTipoIds = (visibleOrcamentoTiposProjeto.length > 0
    ? visibleOrcamentoTiposProjeto : Array.isArray(sourceOrcamentoLinhas) ? sourceOrcamentoLinhas : [])
    .map((item) => String(item?.tipo_projeto_id || item?.id || '')).filter(Boolean);

  const orderedTipoNames = (visibleOrcamentoTiposProjeto.length > 0
    ? visibleOrcamentoTiposProjeto : Array.isArray(sourceOrcamentoLinhas) ? sourceOrcamentoLinhas : [])
    .map((item) => safeValue(item?.nome)).filter((name) => name && name !== '—');

  const getTipoProjetoNome = (id) => {
    if (!id || id === 'default') return 'Serviços do Projeto';
    const inOrcamento = (visibleOrcamentoTiposProjeto || []).find(t => String(t.tipo_projeto_id || t.id) === String(id));
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

  const visibleModeloEstrutura = orderedModeloEstrutura
    .filter(isSelected)
    .map((atividade) => ({
      ...atividade,
      tarefas: (Array.isArray(atividade?.tarefas) ? atividade.tarefas : []).filter(isSelected),
    }));

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
    // Aplicamos a sanitização para remover bytes nulos e bullets estranhos
    const body = sanitizeText(text).replace(/\r\n/g, '\n').trim();
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
  // Linha de Campo Única (Substitui as Colunas Duplas)
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
    
    // Aplicamos a sanitização no valor que estamos a tentar desenhar
    const valueStr = sanitizeText(value).trim();
    const inlineLines = doc.splitTextToSize(valueStr, contentWidth - labelWidth);

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
      // Sanitizamos para o caso de a lista também vir com caracteres estranhos
      const cleanItem = sanitizeText(item);
      drawParagraph(`- ${cleanItem}`, { size: 9.5, lineHeight: 4.5, gap: 1 });
    });
    currentY += 3;
  };

  const startMainSection = (title) => {
    ensureSpace(20);
    drawSectionTitle(title);
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

  const projectName = sourceSelectedPrograma?.descricao || sourcePrograma?.codigo || sourcePrograma?.nome || 'Consultoria para apoio ao Financiamento';
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
  let clienteCP = sourceCliente?.codigo_postal || sourceCliente?.cp || '';

  // Se o CP não veio na memória (propostas antigas), o PDF vai buscá-lo à BD neste milissegundo:
  if (!clienteCP && sourceCliente?.id) {
    try {
      const { data: moradaDB } = await supabase
        .from('moradas_cliente')
        .select('codigo_postal')
        .eq('cliente_id', sourceCliente.id)
        .maybeSingle();

      if (moradaDB?.codigo_postal) {
        clienteCP = moradaDB.codigo_postal;
      }
    } catch (err) {
      console.error("Erro ao procurar CP no Supabase:", err);
    }
  }

  const textoLocalizacao = [clienteCP, clienteCidade].filter(Boolean).join(' ');

  if (textoLocalizacao) {
    doc.text(textoLocalizacao, marginX, currentY);
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
  const signatarioNome = config.signatario_nome || sourceEmpresaConsultora?.nome_signatario || 'A GERÊNCIA';
  const signatarioCargo = config.signatario_cargo || sourceEmpresaConsultora?.cargo_signatario || 'Direção';
  const signatarioTel = config.signatario_telefone || sourceEmpresaConsultora?.telefone || '—';
  const signatarioEmail = config.signatario_email || sourceEmpresaConsultora?.email || '—';

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
      addNewPage();
      startMainSection('SOBRE NÓS');
      
      if (config.texto_apresentacao_empresa) {
          drawTitle('Apresentação da Entidade');
          drawParagraph(config.texto_apresentacao_empresa, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
      }
      
      if (config.texto_como_ajudamos) {
          drawTitle('Como Ajudamos o seu Negócio');
          drawParagraph(config.texto_como_ajudamos, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
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

      if (servicosIntroducao) {
          startMainSection('MÉTODO DE TRABALHO');
          drawParagraph(servicosIntroducao, { size: 9.5, lineHeight: 5, color: COLORS.secondary });
      }
  }


// ============================================================================
  // ENQUADRAMENTO DO PROJETO (Totalmente numa coluna!)
  // ============================================================================
  addNewPage();
  startMainSection('ENQUADRAMENTO DO PROJETO');

  if (sourcePrograma?.codigo || sourcePrograma?.nome || sourceSelectedAviso?.nome || sourceSelectedAviso?.codigo || sourceSelectedPrograma?.aviso) {
    // 1. Garantir que o bloco todo cabe na página antes de começar, 
    // para evitar que a caixa se parta a meio entre duas páginas (40 unidades costumam chegar)
    ensureSpace(40); 

    const boxPadding = 5; 
    const startBoxY = currentY;

    // 2. Padding superior interno (empurra o texto um pouco para baixo)
    currentY += boxPadding + 2;

    // 3. Renderizar os textos
    drawTitle('Programa e Aviso');
    drawFieldLine('Código do Programa', sourcePrograma?.codigo || sourcePrograma?.nome);
    drawFieldLine('Designação do Aviso', sourceSelectedAviso?.nome || sourceSelectedAviso?.codigo || sourceSelectedPrograma?.aviso);
    if (sourcePrograma?.pct) drawFieldLine('Taxa de Incentivo', `${sourcePrograma.pct}%`);

    // 4. Padding inferior interno (o drawFieldLine já deixa um ligeiro espaço, ajustamos apenas +2)
    const endBoxY = currentY + 2;

    // 5. Desenhar o Retângulo
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.6);
    doc.rect(
      marginX - boxPadding,             // X inicial (ligeiramente à esquerda da margem normal)
      startBoxY,                        // Y inicial
      contentWidth + (boxPadding * 2),  // Largura (largura do conteúdo + padding dos dois lados)
      endBoxY - startBoxY,              // Altura calculada
      'S'                               // 'S' significa Stroke (apenas borda)
    );

    // 6. Espaçamento exterior abaixo da caixa antes do próximo título ("Objetivos")
    currentY += 8;
  }
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
      drawTitle('Prazos / Fases do Aviso');
      const fasesRows = sourceSelectedAviso.fases.map((fase) => [
        sanitizeText(fase.nome || 'Fase'),
        formatDate(fase.prazo),
      ]);
      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX + 100 },
        head: [['Fase', 'Prazo']],
        body: fasesRows,
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, valign: 'middle', textColor: COLORS.secondary },
        headStyles: { fillColor: COLORS.accent, textColor: COLORS.white, fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'left' },
        },
        alternateRowStyles: { fillColor: COLORS.light },
      });
      currentY = doc.lastAutoTable.finalY + 8;
    }


  // ============================================================================
  // SERVIÇOS 
  // ============================================================================
  addNewPage();
  startMainSection('SERVIÇOS A PRESTAR');

  if (!visibleModeloEstrutura || visibleModeloEstrutura.length === 0) {
    drawFieldLine('Status', 'Sem atividades registadas');
  } else {
    const atividadesPorTipo = {};
    visibleModeloEstrutura.forEach(atividade => {
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
            const tNome = sanitizeText(t.nome);
            const lines = doc.splitTextToSize(`- ${tNome}`, contentWidth - 5);
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
      addNewPage();
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

  if (Array.isArray(visibleOrcamentoTiposProjeto) && visibleOrcamentoTiposProjeto.length > 0) {
    visibleOrcamentoTiposProjeto.forEach((item) => {
      const modo = normalizeModoHonorario(item.modo_honorario, item);
      const pagamentoTexto = (item.plano_pagamentos || []).length > 0
        ? (item.plano_pagamentos || []).map((pag) => `${Number(pag.percentagem || 0)}% ${sanitizeText(pag.descricao)}`).join('\n')
        : '—';

      if (modo !== 'variavel') {
        orcamentoTabelaRows.push([
          `Módulo ${safeValue(item.ordem)} - ${sanitizeText(item.nome)}`,
          fmtCurrency ? fmtCurrency(item.valor_fixo || item.valor || 0) : formatCurrency(item.valor_fixo || item.valor || 0),
          pagamentoTexto,
        ]);
        orcamentoTableStyles.push('fixed');
      }

      if (modo !== 'fixo' && Array.isArray(item.valores_variaveis) && item.valores_variaveis.length > 0) {
        item.valores_variaveis.forEach((variavel) => {
          const subtotalTexto = `${fmtCurrency ? fmtCurrency(variavel.valor_base || 0) : formatCurrency(variavel.valor_base || 0)} + ${Number(variavel.percentagem || 0)}% ${sanitizeText(variavel.variavel)}`;
          orcamentoTabelaRows.push([ sanitizeText(variavel.servico || variavel.variavel || item.nome), subtotalTexto, sanitizeText(variavel.descricao) ]);
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
  addNewPage();
  startMainSection('TERMOS E CONDIÇÕES');


  // Preparar os textos configurados
  const legalBody = String(config.termos_gerais || sourceCondicoesGerais?.termos_gerais || '').trim() || 'Sem termos gerais definidos.';

  // 1. Informação Legal (Termos Gerais)
  drawTitle('Informação Legal');
  drawParagraph(legalBody, { size: 9, lineHeight: 4.5, color: COLORS.secondary });

  // 2. Notas Específicas do Orçamento (Array)
  if (sourceNotasExclusoes && sourceNotasExclusoes.length > 0) {
    startMainSection('Notas e Exclusões da Proposta');
    sourceNotasExclusoes.forEach((nota, index) => {
      drawParagraph(`${index + 1}. ${nota}`, { size: 9, lineHeight: 4.5, gap: 2, color: COLORS.secondary });
    });
    currentY += 4;
  }

  // ============================================================================
  // RODAPÉ COM INFORMAÇÕES DA NEOMARCA
  // ============================================================================
  addNewPage();
  
  // Calcular o centro da página (altura e largura)
  const centerY = pageHeight / 2 - 30;
  const centerX = pageWidth / 2;
  
  // Logo da Neomarca (centrado horizontalmente)
  if (logoBase64) {
    const logoWidth = 40;
    const logoHeight = 40;
    doc.addImage(logoBase64, 'PNG', centerX - logoWidth / 2, centerY, logoWidth, logoHeight);
    currentY = centerY + logoHeight + 12;
  } else {
    currentY = centerY + 12;
  }

  // Informações da Neomarca (centradas)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text('NEOMARCA, INOVAÇÃO E DESENVOLVIMENTO, LDA.', centerX, currentY, { align: 'center' });
  currentY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.secondary);
  doc.text('NIPC: 503 495 140', centerX, currentY, { align: 'center' });
  currentY += 5;
  
  doc.text('Rua Horta Machado, 2 - 8000-362 FARO', centerX, currentY, { align: 'center' });
  currentY += 5;
  
  doc.text('T. 280 098 720 | info@neomarca.pt | www.neomarca.pt', centerX, currentY, { align: 'center' });

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