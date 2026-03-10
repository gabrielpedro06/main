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

// Backward-compatible palette alias used by the generator body.
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
const clamp  = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));

const formatDuration = (minutes) => {
    const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
    const hours = Math.round((safeMinutes / 60) * 100) / 100;
    const fractionDigits = Number.isInteger(hours) ? 0 : Number.isInteger(hours * 10) ? 1 : 2;
    const formattedHours = hours.toLocaleString('pt-PT', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });

    return `${formattedHours} h`;
};

const normalizeStatus = (status) => (status || '').toString().trim().toLowerCase();
const norm = (s) => (s || '').toString().trim().toLowerCase();

const getStatusMeta = (status) => {
    const v = norm(status);
    if (v === 'concluido')    return { label: 'Concluído',    color: C.success };
    if (v === 'em_progresso') return { label: 'Em Progresso', color: C.blue    };
    if (v === 'bloqueado')    return { label: 'Bloqueado',    color: C.danger  };
    if (v === 'pausado')      return { label: 'Pausado',      color: C.warning };
    if (v === 'em_validacao') return { label: 'Em Validação', color: C.warning };
    if (!v)                   return { label: '—',            color: C.muted   };
    return { label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), color: C.muted };
};

const uniqueNames = (values) => [...new Set(values.filter(Boolean))];
const unique = (arr) => [...new Set(arr.filter(Boolean))];
const toWrappedLines = (doc, value, width) => {
    const lines = doc.splitTextToSize((value ?? '-').toString(), width);
    return Array.isArray(lines) ? lines : [lines];
};

export const generateProjectPDF = async (
    projeto    = {},
    atividades = [],
    logs       = [],
    staff      = [],
    clientes   = [],
) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    const staffNameById = new Map((staff || []).map((item) => [item.id, item.nome]));
    const clienteById = new Map((clientes || []).map((item) => [item.id, item.marca]));

    const getNameById = (id) => staffNameById.get(id) || 'Não atribuído';

    const getTeamLabel = (responsavelId, extras = []) => {
        const responsavel = getNameById(responsavelId);
        const extrasNames = uniqueNames((extras || []).map((id) => staffNameById.get(id)));
        if (extrasNames.length === 0) return responsavel;
        return `${responsavel} (+ ${extrasNames.join(', ')})`;
    };

    const getTaskTime = (taskId) => {
        return (logs || [])
            .filter((log) => log.task_id === taskId)
            .reduce((acc, item) => acc + (item.duration_minutes || 0), 0);
    };

    const getActivityTime = (atividade) => {
        if ((atividade?.tarefas || []).length > 0) {
            return (atividade.tarefas || []).reduce((acc, tarefa) => acc + getTaskTime(tarefa.id), 0);
        }

        return (logs || [])
            .filter((log) => log.atividade_id === atividade.id)
            .reduce((acc, item) => acc + (item.duration_minutes || 0), 0);
    };

    const getClientDisplay = () => {
        const principal = projeto.cliente_texto || projeto.clientes?.marca;
        if (projeto.is_parceria && Array.isArray(projeto.parceiros_ids) && projeto.parceiros_ids.length > 0) {
            const parceiros = uniqueNames(projeto.parceiros_ids.map((id) => clienteById.get(id)));
            if (parceiros.length > 0) {
                return `Parceria: ${parceiros.join(', ')}`;
            }
        }
        return principal || 'Não definido';
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
        ...(projeto.colaboradores || []).map((id) => staffNameById.get(id)),
        ...(atividades || []).flatMap((atividade) => [
            staffNameById.get(atividade.responsavel_id),
            ...((atividade.colaboradores_extra || atividade.colaboradores || []).map((id) => staffNameById.get(id))),
            ...((atividade.tarefas || []).flatMap((task) => [
                staffNameById.get(task.responsavel_id),
                ...((task.colaboradores_extra || []).map((id) => staffNameById.get(id))),
            ])),
        ]),
    ]);

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

    // Banner principal
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

    // Cartão de identidade do projeto
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
    const projectTitleLines = toWrappedLines(
        doc,
        projeto.titulo || 'Projeto sem título',
        Math.max(48, identityCardWidth - identityPadding * 2 - statusBadgeWidth - 4)
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const leftPrimaryLines = toWrappedLines(doc, `Cliente: ${getClientDisplay()}`, infoColWidth);
    const leftSecondaryLines = toWrappedLines(doc, `Responsável: ${getTeamLabel(projeto.responsavel_id, projeto.colaboradores || [])}`, infoColWidth);
    const rightPrimaryLines = toWrappedLines(doc, `Programa: ${projeto.programa || '-'}`, infoColWidth);
    const rightSecondaryLines = toWrappedLines(
        doc,
        `Prazo: ${projeto.data_fim ? new Date(projeto.data_fim).toLocaleDateString('pt-PT') : 'Sem prazo'}`,
        infoColWidth
    );

    const leftInfoHeight = ((leftPrimaryLines.length + leftSecondaryLines.length) * infoLineHeight) + infoGapY;
    const rightInfoHeight = ((rightPrimaryLines.length + rightSecondaryLines.length) * infoLineHeight) + infoGapY;
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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(...projectStatus.color);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(identityCardX + identityCardWidth - identityPadding - statusBadgeWidth, identityCardY + 4, statusBadgeWidth, statusBadgeHeight, 2, 2, 'F');
    doc.text(projectStatus.label.toUpperCase(), identityCardX + identityCardWidth - identityPadding - (statusBadgeWidth / 2), identityCardY + 8.8, { align: 'center' });

    currentY += identityCardHeight + 8;

    ensureSpace(31);

    doc.setFillColor(...COLORS.surfaceBlue);
    doc.roundedRect(marginX, currentY - 5.3, 43, 4.7, 1.4, 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.brand);
    doc.text('RESUMO', marginX + 2, currentY - 2.2);

    const cardGap = 4;
    const cardWidth = (pageWidth - marginX * 2 - cardGap * 3) / 4;
    const cardHeight = 24;

    const drawMetricCard = (x, title, value, detail, highlight) => {
        doc.setFillColor(...COLORS.surface);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

        doc.setFillColor(...highlight);
        doc.rect(x, currentY, cardWidth, 1.4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.slate);
        doc.text(title.toUpperCase(), x + 2.5, currentY + 6.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...COLORS.brandDark);
        doc.text(value, x + 2.5, currentY + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.slate);
        doc.text(detail, x + 2.5, currentY + 19.5);
    };

    drawMetricCard(marginX, 'Tempo registado', formatDuration(totalMinutes), 'acumulado no projeto', COLORS.brand);
    drawMetricCard(
        marginX + (cardWidth + cardGap),
        'Atividades',
        `${atividadesConcluidas}/${totalAtividades}`,
        `${progressAtividades}% concluídas`,
        COLORS.success
    );
    drawMetricCard(
        marginX + (cardWidth + cardGap) * 2,
        'Tarefas',
        `${tarefasConcluidas}/${totalTarefas}`,
        `${progressTarefas}% concluídas`,
        COLORS.brand
    );
    drawMetricCard(
        marginX + (cardWidth + cardGap) * 3,
        'Equipa envolvida',
        `${teamMembers.length}`,
        teamMembers.length > 1 ? 'colaboradores ativos' : 'colaborador ativo',
        COLORS.accent
    );

    currentY += 31;

    ensureSpace(26);

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

    ensureSpace(18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.brandDark);
    doc.text('Detalhamento Operacional', marginX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.slate);
    doc.text('Visão por atividade e tarefas executadas', marginX, currentY + 5);

    const tableRows = [];

    (atividades || []).forEach((atividade) => {
        const activityStatus = getStatusMeta(atividade.estado);
        tableRows.push([
            {
                content: `ATV  ${atividade.titulo || 'Sem título'}`,
                styles: { fontStyle: 'bold', fillColor: COLORS.surface, textColor: COLORS.brandDark },
            },
            {
                content: activityStatus.label,
                styles: { fillColor: COLORS.surface, textColor: activityStatus.color, fontStyle: 'bold', halign: 'center' },
            },
            {
                content: getTeamLabel(atividade.responsavel_id, atividade.colaboradores_extra || atividade.colaboradores || []),
                styles: { fillColor: COLORS.surface, textColor: COLORS.ink, fontStyle: 'bold' },
            },
            {
                content: formatDuration(getActivityTime(atividade)),
                styles: { fillColor: COLORS.surface, textColor: COLORS.brandDark, fontStyle: 'bold', halign: 'right' },
            },
        ]);

        (atividade.tarefas || []).forEach((tarefa) => {
            const taskStatus = getStatusMeta(tarefa.estado);
            tableRows.push([
                { content: `- ${tarefa.titulo || 'Sem título'}`, styles: { textColor: COLORS.ink } },
                {
                    content: taskStatus.label,
                    styles: { textColor: taskStatus.color, halign: 'center', fontStyle: normalizeStatus(tarefa.estado) === 'concluido' ? 'bold' : 'normal' },
                },
                {
                    content: getTeamLabel(tarefa.responsavel_id, tarefa.colaboradores_extra || []),
                    styles: { textColor: COLORS.slate },
                },
                { content: formatDuration(getTaskTime(tarefa.id)), styles: { textColor: COLORS.slate, halign: 'right' } },
            ]);

            (tarefa.subtarefas || []).forEach((passo) => {
                const passoStatus = getStatusMeta(passo.estado);
                const isDone = normalizeStatus(passo.estado) === 'concluido';
                tableRows.push([
                    {
                        content: `    · ${passo.titulo || 'Sem título'}`,
                        styles: { textColor: isDone ? COLORS.success : COLORS.slate, fontStyle: isDone ? 'bold' : 'normal', fontSize: 8 },
                    },
                    {
                        content: passoStatus.label,
                        styles: { textColor: isDone ? COLORS.success : COLORS.slate, halign: 'center', fontStyle: isDone ? 'bold' : 'normal', fontSize: 8 },
                    },
                    { content: '', styles: { textColor: COLORS.slate, fontSize: 8 } },
                    { content: '', styles: { textColor: COLORS.slate, halign: 'right', fontSize: 8 } },
                ]);
            });
        });
    });

    if (tableRows.length === 0) {
        tableRows.push([
            { content: 'Sem atividades registadas', styles: { textColor: COLORS.slate, fontStyle: 'italic' } },
            { content: '-', styles: { textColor: COLORS.slate, halign: 'center' } },
            { content: '-', styles: { textColor: COLORS.slate } },
            { content: '-', styles: { textColor: COLORS.slate, halign: 'right' } },
        ]);
    }

    autoTable(doc, {
        startY: currentY + 9,
        head: [['Atividade / Tarefa / Passo', 'Estado', 'Responsável / Equipa', 'Tempo']],
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
        alternateRowStyles: {
            fillColor: [252, 252, 253],
        },
        columnStyles: {
            0: { cellWidth: 74 },
            1: { cellWidth: 28 },
            2: { cellWidth: 56 },
            3: { cellWidth: 24, halign: 'right' },
        },
    });

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

const gerarRelatorioProjeto = async (projeto, atividades, logs, staff, clientes) => {
    return generateProjectPDF(projeto, atividades, logs, staff, clientes);
};

export default gerarRelatorioProjeto;