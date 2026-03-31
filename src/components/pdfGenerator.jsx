import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const C = {
    navy:    [27,  41,  82],
    blue:    [70,  159, 97],
    gold:    [136, 191, 104],
    ink:     [36,  53,  79],
    muted:   [96,  113, 133],
    subtle:  [244, 249, 243],
    line:    [218, 229, 217],
    success: [70,  159, 97],
    warning: [136, 191, 104],
    danger:  [204, 92,  92],
    white:   [255, 255, 255],
};

const COLORS = {
    brandDark: C.navy,
    brand: C.blue,
    accent: C.gold,
    ink: C.ink,
    slate: C.muted,
    border: C.line,
    surface: C.subtle,
    surfaceBlue: [232, 244, 231],
    success: C.success,
    warning: C.warning,
    danger: C.danger,
};

const loadLogo = (url) =>
    new Promise((resolve) => {
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

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value || 0)));

const formatDuration = (minutes) => {
    const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
    const hours = Math.round((safeMinutes / 60) * 100) / 100;
    const fractionDigits = Number.isInteger(hours) ? 0 : Number.isInteger(hours * 10) ? 1 : 2;
    return `${hours.toLocaleString('pt-PT', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} h`;
};

const formatDate = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-PT');
};

const formatCurrency = (value) => {
    const num = Number(value);
    if (Number.isNaN(num) || num === 0) return '0,00 €';
    return num.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
};

const normalizeStatus = (status) => (status || '').toString().trim().toLowerCase();

const getStatusMeta = (status) => {
    const v = normalizeStatus(status);
    if (v === 'concluido')    return { label: 'Concluído',    color: C.success };
    if (v === 'em_progresso' || v === 'em_curso') return { label: 'Em Progresso', color: C.blue    };
    if (v === 'bloqueado')    return { label: 'Bloqueado',    color: C.danger  };
    if (v === 'pausado')      return { label: 'Pausado',      color: C.warning };
    if (v === 'em_validacao' || v === 'em_analise') return { label: 'Em Análise', color: C.warning };
    if (!v)                   return { label: '—',            color: C.muted   };
    return { label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), color: C.muted };
};

const uniqueNames = (values) => [...new Set(values.filter(Boolean))];
const toWrappedLines = (doc, value, width) => {
    const lines = doc.splitTextToSize((value ?? '-').toString(), width);
    return Array.isArray(lines) ? lines : [lines];
};

// Extrator de Iniciais Inteligente (Ex: João Pedro Silva -> JS)
const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const generateProjectPDF = async (
    projeto = {},
    atividades = [],
    logs = [],
    staff = [],
    clientes = [],
    entidadePessoas = [] // NOVO PARÂMETRO
) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    // --- LÓGICA INTELIGENTE DE NOMES E SIGLAS ---
    const formatClientName = (client) => {
        if (!client) return '';
        const marca = client.marca?.trim() || '';
        const sigla = client.sigla?.trim() || '';
        if (marca && sigla) return `${marca} (${sigla})`;
        return marca || sigla;
    };

    const clienteById = new Map((clientes || []).map((item) => [item.id, formatClientName(item)]));

    // Mapeamento de pessoas para o formato "Nome (SIGLA)" ou "Nome (INICIAIS)"
    const personLabelById = new Map();
    (staff || []).forEach(s => {
        personLabelById.set(s.id, `${s.nome || s.email} (${getInitials(s.nome || s.email)})`);
    });
    (entidadePessoas || []).forEach(p => {
        const siglaEntidade = p.clientes?.sigla || getInitials(p.clientes?.marca) || getInitials(p.nome_contacto);
        personLabelById.set(p.id, `${p.nome_contacto || p.email} (${siglaEntidade})`);
    });

    const getNameById = (id) => personLabelById.get(id) || 'Não atribuído';

    const getTeamLabel = (responsavelId, extras = []) => {
        const responsavel = getNameById(responsavelId);
        const extrasNames = uniqueNames((extras || []).map((id) => personLabelById.get(id)));
        if (extrasNames.length === 0) return responsavel;
        return `${responsavel} (+ ${extrasNames.join(', ')})`;
    };

    // --- TEMPOS E PROGRESSO ---
    const getTaskTime = (taskId) => {
        return (logs || []).filter((log) => log.task_id === taskId).reduce((acc, item) => acc + (item.duration_minutes || 0), 0);
    };

    const getTaskTimePerUser = (taskId) => {
        const taskLogs = (logs || []).filter((l) => l.task_id === taskId && (l.duration_minutes || 0) > 0);
        const byUser = {};
        taskLogs.forEach((l) => {
            const key = l.user_id;
            if (!byUser[key]) byUser[key] = { nome: l.profiles?.nome || 'Utilizador', total: 0 };
            byUser[key].total += (l.duration_minutes || 0);
        });
        return Object.values(byUser).sort((a, b) => b.total - a.total);
    };

    const getActivityTime = (atividade) => {
        if ((atividade?.tarefas || []).length > 0) {
            return (atividade.tarefas || []).reduce((acc, tarefa) => acc + getTaskTime(tarefa.id), 0);
        }
        return (logs || []).filter((log) => log.atividade_id === atividade.id).reduce((acc, item) => acc + (item.duration_minutes || 0), 0);
    };

    const getMainEntityDisplay = () => projeto.cliente_texto || formatClientName(projeto.clientes) || 'Não definido';

    const getPartnersDisplay = () => {
        if (!projeto.is_parceria || !Array.isArray(projeto.parceiros_ids) || projeto.parceiros_ids.length === 0) return '-';
        const parceiros = uniqueNames(projeto.parceiros_ids.map((id) => clienteById.get(id)));
        return parceiros.length > 0 ? parceiros.join(', ') : '-';
    };

    const getProjectTeamDisplay = () => {
        const team = uniqueNames((projeto.colaboradores || []).map((id) => personLabelById.get(id)));
        return team.length > 0 ? team.join(', ') : '-';
    };

    const totalMinutes = (atividades || []).reduce((acc, atividade) => acc + getActivityTime(atividade), 0);
    const totalAtividades = (atividades || []).length;
    const atividadesConcluidas = (atividades || []).filter((item) => normalizeStatus(item.estado) === 'concluido').length;
    const allTasks = (atividades || []).flatMap((atividade) => atividade.tarefas || []);
    const totalTarefas = allTasks.length;
    const tarefasConcluidas = allTasks.filter((task) => normalizeStatus(task.estado) === 'concluido').length;
    const progressAtividades = clampPercent(totalAtividades ? (atividadesConcluidas / totalAtividades) * 100 : 0);
    const progressTarefas = clampPercent(totalTarefas ? (tarefasConcluidas / totalTarefas) * 100 : 0);

    const teamMembers = uniqueNames([
        getNameById(projeto.responsavel_id),
        ...(projeto.colaboradores || []).map((id) => personLabelById.get(id)),
        ...(atividades || []).flatMap((atividade) => [
            personLabelById.get(atividade.responsavel_id),
            ...((atividade.colaboradores_extra || atividade.colaboradores || []).map((id) => personLabelById.get(id))),
            ...((atividade.tarefas || []).flatMap((task) => [
                personLabelById.get(task.responsavel_id),
                ...((task.colaboradores_extra || []).map((id) => personLabelById.get(id))),
            ])),
        ]),
    ]).filter(n => n !== 'Não atribuído');

    const projectStatus = getStatusMeta(projeto.estado);
    const issueDate = new Date();
    const issueDateStr = issueDate.toLocaleDateString('pt-PT');
    const issueTimeStr = issueDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const reportTitle = 'Relatório de Projeto';

    const footerReserve = 20;
    const nextPageTopY = 20;

    const drawContinuationHeader = () => {
        doc.setFillColor(...COLORS.brandDark);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFillColor(...COLORS.accent);
        doc.rect(pageWidth - 44, 0, 44, 1.4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(projeto.titulo || 'Projeto', marginX, 7.2, { maxWidth: pageWidth - marginX * 2 - 38 });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(219, 234, 254);
        doc.text('Continuação do Relatório', pageWidth - marginX, 7.2, { align: 'right' });
    };

    const drawTextLines = (lines, x, startY, lineHeight = 4.4) => {
        lines.forEach((line, index) => {
            doc.text(line, x, startY + (index * lineHeight));
        });
    };

    let currentY = 16;

    const ensureSpace = (requiredHeight) => {
        if (currentY + requiredHeight <= pageHeight - footerReserve) return;
        doc.addPage();
        drawContinuationHeader();
        currentY = nextPageTopY;
    };

    // --- BANNER PRINCIPAL ---
    doc.setFillColor(...COLORS.brandDark);
    doc.rect(0, 0, pageWidth, 36, 'F');
    doc.setFillColor(...COLORS.brand);
    doc.rect(0, 36, pageWidth, 2, 'F');
    doc.setFillColor(...COLORS.accent);
    doc.rect(pageWidth - 64, 0, 64, 2, 'F');

    const logoBase64 = await loadLogo('/logo1.png');
    if (logoBase64) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(marginX, 8, 28, 18, 2, 2, 'F');
        doc.addImage(logoBase64, 'PNG', marginX + 2, 10, 24, 14, '', 'FAST');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(reportTitle, logoBase64 ? marginX + 34 : marginX, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(219, 234, 254);
    doc.text('Uma identidade visual do Grupo Bizin', logoBase64 ? marginX + 34 : marginX, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`Emitido em ${issueDateStr} às ${issueTimeStr}`, pageWidth - marginX, 16, { align: 'right' });
    doc.text(`Código: ${projeto.codigo_projeto || '-'}`, pageWidth - marginX, 22, { align: 'right' });

    currentY = 46;

    // --- CARTÃO DE IDENTIDADE ---
    const identityCardX = marginX;
    const identityCardY = currentY;
    const identityCardWidth = pageWidth - marginX * 2;
    const identityPadding = 4;
    const statusBadgeWidth = 40;
    const statusBadgeHeight = 7;
    const titleLineHeight = 5.8;
    const infoLineHeight = 4.4;
    const infoGapX = 6;
    const infoGapY = 1.6;

    const infoColWidth = (identityCardWidth - identityPadding * 2 - infoGapX) / 2;
    const leftColX = identityCardX + identityPadding;
    const rightColX = leftColX + infoColWidth + infoGapX;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.brandDark);
    const projectTitleLines = toWrappedLines(doc, projeto.titulo || 'Projeto sem título', Math.max(48, identityCardWidth - identityPadding * 2 - statusBadgeWidth - 4));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const leftPrimaryLines = toWrappedLines(doc, `Entidade Responsável: ${getMainEntityDisplay()}`, infoColWidth);
    const leftSecondaryLines = toWrappedLines(doc, `Parceiros: ${getPartnersDisplay()}`, infoColWidth);
    const rightPrimaryLines = toWrappedLines(doc, `Coordenador: ${getNameById(projeto.responsavel_id)}`, infoColWidth);
    const rightSecondaryLines = toWrappedLines(doc, `Equipa: ${getProjectTeamDisplay()}`, infoColWidth);
    const rightTertiaryLines = toWrappedLines(doc, `Data de Início: ${formatDate(projeto.data_inicio)}`, infoColWidth);
    const rightQuaternaryLines = toWrappedLines(doc, `Data de Fim: ${formatDate(projeto.data_fim)}`, infoColWidth);

    const leftInfoHeight = ((leftPrimaryLines.length + leftSecondaryLines.length) * infoLineHeight) + infoGapY;
    const rightInfoHeight = ((rightPrimaryLines.length + rightSecondaryLines.length + rightTertiaryLines.length + rightQuaternaryLines.length) * infoLineHeight) + (infoGapY * 3);
    const infoBlockHeight = Math.max(leftInfoHeight, rightInfoHeight);
    const identityCardHeight = Math.max(36, 6 + (projectTitleLines.length * titleLineHeight) + 2 + infoBlockHeight + 4);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(identityCardX, identityCardY, identityCardWidth, identityCardHeight, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.brandDark);
    drawTextLines(projectTitleLines, leftColX, identityCardY + 9, titleLineHeight);

    const infoY = identityCardY + 7 + (projectTitleLines.length * titleLineHeight) + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.slate);
    drawTextLines(leftPrimaryLines, leftColX, infoY, infoLineHeight);
    drawTextLines(leftSecondaryLines, leftColX, infoY + (leftPrimaryLines.length * infoLineHeight) + infoGapY, infoLineHeight);

    drawTextLines(rightPrimaryLines, rightColX, infoY, infoLineHeight);
    drawTextLines(rightSecondaryLines, rightColX, infoY + (rightPrimaryLines.length * infoLineHeight) + infoGapY, infoLineHeight);
    drawTextLines(rightTertiaryLines, rightColX, infoY + ((rightPrimaryLines.length + rightSecondaryLines.length) * infoLineHeight) + (infoGapY * 2), infoLineHeight);
    drawTextLines(rightQuaternaryLines, rightColX, infoY + ((rightPrimaryLines.length + rightSecondaryLines.length + rightTertiaryLines.length) * infoLineHeight) + (infoGapY * 3), infoLineHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(...projectStatus.color);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(identityCardX + identityCardWidth - identityPadding - statusBadgeWidth, identityCardY + 4, statusBadgeWidth, statusBadgeHeight, 2, 2, 'F');
    doc.text(projectStatus.label.toUpperCase(), identityCardX + identityCardWidth - identityPadding - (statusBadgeWidth / 2), identityCardY + 8.8, { align: 'center' });

    currentY += identityCardHeight + 8;
    ensureSpace(62);

    doc.setFillColor(...COLORS.surfaceBlue);
    doc.roundedRect(marginX, currentY - 5.3, 43, 4.7, 1.4, 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.brand);
    doc.text('RESUMO E FINANCEIRO', marginX + 2, currentY - 2.2);

    // --- CARTÕES DE MÉTRICAS (Agora em 2 Linhas) ---
    const cardGap = 4;
    const cardWidth = (pageWidth - marginX * 2 - cardGap * 3) / 4;
    const cardHeight = 24;

    const drawMetricCard = (x, y, title, value, detail, highlight) => {
        doc.setFillColor(...COLORS.surface);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
        doc.setFillColor(...highlight);
        doc.rect(x, y, cardWidth, 1.4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.slate);
        doc.text(title.toUpperCase(), x + 2.5, y + 6.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(...COLORS.brandDark);
        doc.text(value, x + 2.5, y + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.slate);
        doc.text(detail, x + 2.5, y + 19.5);
    };

    // Linha 1: Métricas de Operação
    drawMetricCard(marginX, currentY, 'Tempo registado', formatDuration(totalMinutes), 'acumulado no projeto', COLORS.brand);
    drawMetricCard(marginX + (cardWidth + cardGap), currentY, 'Atividades', `${atividadesConcluidas}/${totalAtividades}`, `${progressAtividades}% concluídas`, COLORS.success);
    drawMetricCard(marginX + (cardWidth + cardGap) * 2, currentY, 'Tarefas', `${tarefasConcluidas}/${totalTarefas}`, `${progressTarefas}% concluídas`, COLORS.brand);
    drawMetricCard(marginX + (cardWidth + cardGap) * 3, currentY, 'Equipa envolvida', `${teamMembers.length}`, teamMembers.length === 1 ? 'pessoa alocada' : 'pessoas alocadas', COLORS.accent);

    currentY += cardHeight + cardGap;

    // Linha 2: Métricas Financeiras e de Execução
    const inv = Number(projeto.investimento || 0);
    const inc = Number(projeto.incentivo || 0);
    const financRate = inv > 0 ? clampPercent((inc / inv) * 100) + '%' : '-';
    
    drawMetricCard(marginX, currentY, 'Investimento', formatCurrency(inv), 'Valor global do projeto', COLORS.ink);
    drawMetricCard(marginX + (cardWidth + cardGap), currentY, 'Incentivo', formatCurrency(inc), 'Apoio aprovado', COLORS.brand);
    drawMetricCard(marginX + (cardWidth + cardGap) * 2, currentY, 'Financiamento', financRate, 'Taxa de financiamento', COLORS.accent);
    drawMetricCard(marginX + (cardWidth + cardGap) * 3, currentY, 'Execução Global', `${progressTarefas}%`, 'Taxa de execução física', COLORS.success);

    currentY += 31;
    ensureSpace(26);

    // --- BARRAS DE PROGRESSO ---
    const drawProgressBar = (y, label, pct, color) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.ink);
        doc.text(label, marginX, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.slate);
        doc.text(`${pct}%`, pageWidth - marginX, y, { align: 'right' });

        doc.setFillColor(...COLORS.surfaceBlue);
        doc.roundedRect(marginX, y + 2, pageWidth - marginX * 2, 4, 2, 2, 'F');

        const progressWidth = ((pageWidth - marginX * 2) * pct) / 100;
        doc.setFillColor(...color);
        doc.roundedRect(marginX, y + 2, Math.max(2, progressWidth), 4, 2, 2, 'F');
    };

    drawProgressBar(currentY, 'Conclusão de Atividades', progressAtividades, COLORS.success);
    drawProgressBar(currentY + 11, 'Conclusão de Tarefas', progressTarefas, COLORS.brand);

    currentY += 26;

    // --- GRÁFICO GANTT ---
    ensureSpace(50);
    
    // 1. Agrupar Atividades e Tarefas que tenham datas válidas
    const ganttItems = [];
    (atividades || []).forEach((ativ) => {
        if (ativ.data_inicio && ativ.data_fim) {
            ganttItems.push({ ...ativ, type: 'atividade' });
        }
        (ativ.tarefas || []).forEach((tar) => {
            if (tar.data_inicio && tar.data_fim) {
                ganttItems.push({ ...tar, type: 'tarefa' });
            }
        });
    });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.brandDark);
    doc.text('Cronograma (Gantt)', marginX, currentY);
    currentY += 6;

    if (ganttItems.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.slate);
        doc.text('Não existem atividades ou tarefas com datas de início e fim para desenhar o gráfico.', marginX, currentY);
        currentY += 12;
    } else {
        // Encontrar a data mais antiga e a mais recente de TODOS os itens
        let minTime = Math.min(...ganttItems.map(item => new Date(item.data_inicio).getTime()));
        let maxTime = Math.max(...ganttItems.map(item => new Date(item.data_fim).getTime()));
        if (minTime === maxTime) maxTime += 86400000 * 30; // Garante uma janela de 30 dias se for igual
        const totalDuration = maxTime - minTime;

        const chartX = marginX + 60;
        const chartW = pageWidth - marginX - chartX;

        // Desenhar Eixo do Tempo (Datas)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.slate);
        doc.text(new Date(minTime).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' }), chartX, currentY - 1);
        doc.text(new Date(maxTime).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' }), chartX + chartW, currentY - 1, { align: 'right' });
        
        doc.setDrawColor(...COLORS.border);
        doc.line(chartX, currentY, chartX + chartW, currentY);
        currentY += 4;

        ganttItems.forEach((item) => {
            ensureSpace(12);
            const isTask = item.type === 'tarefa';
            const isDone = normalizeStatus(item.estado) === 'concluido';

            // Estilo do texto (Tarefas são mais pequenas e indentadas)
            doc.setFont('helvetica', isTask ? 'normal' : 'bold');
            doc.setFontSize(isTask ? 7.2 : 7.5);
            doc.setTextColor(...(isTask ? COLORS.slate : COLORS.ink));
            
            const indent = isTask ? 4 : 0;
            const prefix = isTask ? '- ' : '';
            const itemNameLines = doc.splitTextToSize(prefix + (item.titulo || 'Sem título'), 55 - indent);
            doc.text(itemNameLines[0] + (itemNameLines.length > 1 ? '...' : ''), marginX + indent, currentY + 3);

            // Calha de Fundo Cinzenta
            doc.setFillColor(...COLORS.surface);
            doc.rect(chartX, currentY, chartW, 4, 'F');

            // Calcular a Posição e o Tamanho da Barra
            const sTime = new Date(item.data_inicio).getTime();
            const eTime = new Date(item.data_fim).getTime();
            const sX = chartX + ((sTime - minTime) / totalDuration) * chartW;
            const eX = chartX + ((eTime - minTime) / totalDuration) * chartW;
            const bW = Math.max(eX - sX, 1.5); // Largura mínima para ser visível

            // Diferenciação Visual (Atividade = Barra grossa; Tarefa = Barra fina e centrada)
            const barHeight = isTask ? 1.6 : 4;
            const barY = isTask ? currentY + 1.2 : currentY;
            const barColor = isDone ? COLORS.success : (isTask ? COLORS.slate : COLORS.brand);

            doc.setFillColor(...barColor);
            doc.roundedRect(sX, barY, bW, barHeight, isTask ? 0.5 : 1, isTask ? 0.5 : 1, 'F');

            currentY += isTask ? 6 : 8; // Tarefas têm um espaçamento ligeiramente menor
        });
        currentY += 8;
    }

    // --- LISTAGEM DE ATIVIDADES ---
    ensureSpace(18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.brandDark);
    doc.text('Atividades do projeto', marginX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate);
    doc.text('Visão por atividade e tarefas executadas', marginX, currentY + 5);

    const tableRows = [];

    (atividades || []).forEach((atividade) => {
        tableRows.push([
            {
                content: `ATV  ${atividade.titulo || 'Sem título'}`,
                styles: { fontStyle: 'bold', fillColor: COLORS.surface, textColor: COLORS.brandDark },
            },
            {
                content: getTeamLabel(atividade.responsavel_id, atividade.colaboradores_extra || atividade.colaboradores || []),
                styles: { fillColor: COLORS.surface, textColor: COLORS.ink, fontStyle: 'bold' },
            },
            {
                content: formatDate(atividade.data_inicio),
                styles: { fillColor: COLORS.surface, textColor: COLORS.brandDark, fontStyle: 'bold', halign: 'center' },
            },
            {
                content: formatDate(atividade.data_fim),
                styles: { fillColor: COLORS.surface, textColor: COLORS.brandDark, fontStyle: 'bold', halign: 'center' },
            },
            {
                content: formatDuration(getActivityTime(atividade)),
                styles: { fillColor: COLORS.surface, textColor: COLORS.brandDark, fontStyle: 'bold', halign: 'right' },
            },
        ]);

        (atividade.tarefas || []).forEach((tarefa) => {
            const userBreakdown = getTaskTimePerUser(tarefa.id);
            tableRows.push([
                { content: `- ${tarefa.titulo || 'Sem título'}`, styles: { textColor: COLORS.ink } },
                {
                    content: getTeamLabel(tarefa.responsavel_id, tarefa.colaboradores_extra || []),
                    styles: { textColor: COLORS.slate },
                },
                {
                    content: formatDate(tarefa.data_inicio),
                    styles: { textColor: COLORS.slate, halign: 'center' },
                },
                {
                    content: formatDate(tarefa.data_fim),
                    styles: { textColor: COLORS.slate, halign: 'center' },
                },
                {
                    content: formatDuration(getTaskTime(tarefa.id)),
                    styles: { textColor: COLORS.slate, halign: 'right', fontStyle: userBreakdown.length > 1 ? 'bold' : 'normal' },
                },
            ]);

            userBreakdown.forEach((u) => {
                tableRows.push([
                    { content: `      > ${u.nome}`, styles: { textColor: COLORS.slate, fontSize: 7.5, fontStyle: 'italic' } },
                    { content: '', styles: { textColor: COLORS.slate, fontSize: 7.5 } },
                    { content: '', styles: { textColor: COLORS.slate, fontSize: 7.5 } },
                    { content: '', styles: { textColor: COLORS.slate, fontSize: 7.5 } },
                    { content: formatDuration(u.total), styles: { textColor: COLORS.slate, fontSize: 7.5, halign: 'right', fontStyle: 'italic' } },
                ]);
            });

            (tarefa.subtarefas || []).forEach((passo) => {
                const isDone = normalizeStatus(passo.estado) === 'concluido';
                tableRows.push([
                    {
                        content: `    · ${passo.titulo || 'Sem título'}`,
                        styles: { textColor: isDone ? COLORS.success : COLORS.slate, fontStyle: isDone ? 'bold' : 'normal', fontSize: 8 },
                    },
                    { content: '', styles: { textColor: COLORS.slate, halign: 'center', fontSize: 8 } },
                    { content: formatDate(passo.data_inicio), styles: { textColor: COLORS.slate, fontSize: 8, halign: 'center' } },
                    { content: formatDate(passo.data_fim), styles: { textColor: COLORS.slate, fontSize: 8, halign: 'center' } },
                    { content: '', styles: { textColor: COLORS.slate, halign: 'right', fontSize: 8 } },
                ]);
            });
        });
    });

    if (tableRows.length === 0) {
        tableRows.push([
            { content: 'Sem atividades registadas', styles: { textColor: COLORS.slate, fontStyle: 'italic' } },
            { content: '-', styles: { textColor: COLORS.slate } },
            { content: '-', styles: { textColor: COLORS.slate, halign: 'center' } },
            { content: '-', styles: { textColor: COLORS.slate, halign: 'center' } },
            { content: '-', styles: { textColor: COLORS.slate, halign: 'right' } },
        ]);
    }

    autoTable(doc, {
        startY: currentY + 9,
        head: [['Atividade / Tarefa / Passo', 'Responsável / Equipa', 'Data Início', 'Data Fim', 'Tempo']],
        body: tableRows,
        margin: { left: marginX, right: marginX, bottom: 24 },
        theme: 'plain',
        headStyles: {
            fillColor: COLORS.brandDark,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 3,
        },
        styles: {
            fontSize: 8.7,
            cellPadding: 2.6,
            textColor: COLORS.ink,
            lineColor: COLORS.border,
            lineWidth: 0.2,
            overflow: 'linebreak',
        },
        showHead: 'everyPage',
        rowPageBreak: 'avoid',
        alternateRowStyles: { fillColor: [252, 252, 253] },
        columnStyles: {
            0: { cellWidth: 56 },
            1: { cellWidth: 48 },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 28, halign: 'right' },
        },
    });

    // --- RODAPÉ ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        const footerY = pageHeight - 15;

        doc.setFillColor(...COLORS.surfaceBlue);
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.2);
        doc.roundedRect(marginX, footerY - 2.4, pageWidth - marginX * 2, 9.6, 2, 2, 'FD');

        doc.setFillColor(...COLORS.brandDark);
        doc.roundedRect(marginX + 2, footerY, 22, 4.8, 1.2, 1.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.3);
        doc.setTextColor(255, 255, 255);
        doc.text('BIZIN', marginX + 13, footerY + 3.3, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.3);
        doc.setTextColor(...COLORS.slate);
        doc.text('Documento de Projeto | Gestão de Projetos', marginX + 27, footerY + 3.3);

        doc.setFillColor(...COLORS.brand);
        doc.roundedRect(pageWidth - marginX - 26, footerY, 24, 4.8, 1.2, 1.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(255, 255, 255);
        doc.text(`${page}/${pageCount}`, pageWidth - marginX - 14, footerY + 3.3, { align: 'center' });
    }

    const safeName = (projeto.titulo || 'Projeto').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Relatorio_Projeto_${safeName}.pdf`);
};

const gerarRelatorioProjeto = async (projeto, atividades, logs, staff, clientes, entidadePessoas) => {
    return generateProjectPDF(projeto, atividades, logs, staff, clientes, entidadePessoas);
};

export default gerarRelatorioProjeto;