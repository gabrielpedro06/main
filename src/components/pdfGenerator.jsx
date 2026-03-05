import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

const gerarRelatorioProjeto = (projeto, atividades, logs, staff) => {
    
    // Inicia o Documento
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Cores Base do PDF
    const primaryColor = [37, 99, 235]; // #2563eb
    const darkColor = [15, 23, 42];     // #0f172a
    const grayColor = [100, 116, 139];  // #64748b
    const lightGray = [248, 250, 252];  // #f8fafc

    // --- FUNÇÕES AUXILIARES ---
    const getTaskTime = (taskId) => logs.filter(l => l.task_id === taskId).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    const getActivityTime = (ativ) => {
        if (ativ.tarefas?.length > 0) {
            return ativ.tarefas.reduce((acc, t) => acc + getTaskTime(t.id), 0);
        } else {
            return logs.filter(l => l.atividade_id === ativ.id).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        }
    };
    const formatTime = (mins) => {
        if (mins === 0) return "0h 0m";
        const h = Math.floor(mins / 60); const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const getStaffNames = (responsavelId, colaboradoresArray) => {
        const resp = staff.find(s => s.id === responsavelId)?.nome || '-';
        if (!colaboradoresArray || colaboradoresArray.length === 0) return resp;
        const extras = colaboradoresArray.map(id => staff.find(s => s.id === id)?.nome).filter(Boolean);
        if (extras.length === 0) return resp;
        return `${resp}\n(+ ${extras.join(', ')})`;
    };

    // ==========================================
    // CABEÇALHO DO DOCUMENTO (Faixa Azul)
    // ==========================================
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text('Relatorio de Execucao', 14, 20); // Removido acentos para evitar conflitos de fonte base

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, pageWidth - 14, 20, { align: 'right' });

    // ==========================================
    // DADOS GERAIS DO PROJETO
    // ==========================================
    let currentY = 40;

    doc.setFontSize(16);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.text(projeto.titulo || 'Projeto sem Titulo', 14, currentY);
    currentY += 8;

    doc.setFillColor(...lightGray);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, 35, 3, 3, 'FD'); 

    doc.setFontSize(10);
    doc.setTextColor(...grayColor);
    
    const leftColX = 18;
    const rightColX = pageWidth / 2 + 10;
    let boxY = currentY + 8;
    const lineSpace = 7;

    let clienteName = projeto.cliente_texto || projeto.clientes?.marca || 'Nao definido';
    if (projeto.is_parceria && projeto.parceiros_ids?.length > 0) {
        clienteName = `Parceria: ` + projeto.parceiros_ids.map(id => staff.find(c => c.id === id)?.marca || '').join(', ');
    }

    doc.text(`Cliente/Local:`, leftColX, boxY); 
    doc.setFont("helvetica", "bold"); doc.setTextColor(...darkColor); doc.text(`${clienteName}`, leftColX + 24, boxY); 
    doc.setFont("helvetica", "normal"); doc.setTextColor(...grayColor);
    
    doc.text(`Responsavel:`, leftColX, boxY + lineSpace); 
    doc.setFont("helvetica", "bold"); doc.setTextColor(...darkColor); doc.text(`${getStaffNames(projeto.responsavel_id, projeto.colaboradores)}`, leftColX + 24, boxY + lineSpace); 
    doc.setFont("helvetica", "normal"); doc.setTextColor(...grayColor);

    doc.text(`Programa:`, leftColX, boxY + (lineSpace * 2)); 
    doc.setTextColor(...darkColor); doc.text(`${projeto.programa || '-'} (${projeto.aviso || '-'})`, leftColX + 24, boxY + (lineSpace * 2)); 

    doc.setTextColor(...grayColor);
    doc.text(`Codigo:`, rightColX, boxY); 
    doc.setTextColor(...darkColor); doc.text(`${projeto.codigo_projeto || '-'}`, rightColX + 15, boxY); 
    
    doc.setTextColor(...grayColor);
    doc.text(`Deadline:`, rightColX, boxY + lineSpace); 
    doc.setTextColor(...darkColor); doc.text(`${projeto.data_fim ? new Date(projeto.data_fim).toLocaleDateString('pt-PT') : '-'}`, rightColX + 18, boxY + lineSpace); 
    
    doc.setTextColor(...grayColor);
    doc.text(`Estado:`, rightColX, boxY + (lineSpace * 2)); 
    doc.setFont("helvetica", "bold"); doc.setTextColor(...primaryColor); doc.text(`${(projeto.estado || '').toUpperCase().replace('_', ' ')}`, rightColX + 15, boxY + (lineSpace * 2)); 
    doc.setFont("helvetica", "normal");

    currentY += 45;

    // ==========================================
    // ESTATÍSTICAS / KPIs
    // ==========================================
    const totalTimeMins = atividades.reduce((acc, a) => acc + getActivityTime(a), 0);
    const totalAtividades = atividades.length;
    const ativsConcluidas = atividades.filter(a => a.estado === 'concluido').length;
    
    let totalTarefas = 0;
    let tarefasConcluidas = 0;
    atividades.forEach(a => {
        if(a.tarefas) {
            totalTarefas += a.tarefas.length;
            tarefasConcluidas += a.tarefas.filter(t => t.estado === 'concluido').length;
        }
    });

    const boxWidth = (pageWidth - 28 - 20) / 3; 
    const boxHeight = 22;

    const drawKPIBox = (x, title, value) => {
        doc.setFillColor(...lightGray);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, currentY, boxWidth, boxHeight, 2, 2, 'FD');
        
        doc.setFontSize(9);
        doc.setTextColor(...grayColor);
        doc.text(title, x + (boxWidth / 2), currentY + 8, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(value, x + (boxWidth / 2), currentY + 16, { align: 'center' });
        doc.setFont("helvetica", "normal");
    };

    drawKPIBox(14, 'TEMPO TOTAL', formatTime(totalTimeMins));
    drawKPIBox(14 + boxWidth + 10, 'ATIVIDADES', `${ativsConcluidas} de ${totalAtividades}`);
    drawKPIBox(14 + (boxWidth * 2) + 20, 'TAREFAS', `${tarefasConcluidas} de ${totalTarefas}`);

    currentY += 35;

    // ==========================================
    // TABELA DE ATIVIDADES E TAREFAS (Sem Emojis!)
    // ==========================================
    doc.setFontSize(12);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.text('Estrutura de Execucao', 14, currentY);
    currentY += 5;

    const tableData = [];

    atividades.forEach(ativ => {
        const ativTime = getActivityTime(ativ);
        
        // 1. Linha Principal (Atividade) - Sem emoji, tudo em maiúsculas
        tableData.push([
            { content: ativ.titulo.toUpperCase(), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: (ativ.estado || '').toUpperCase().replace('_', ' '), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: getStaffNames(ativ.responsavel_id, ativ.colaboradores), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: formatTime(ativTime), styles: { fontStyle: 'bold', textColor: primaryColor, fillColor: [241, 245, 249], halign: 'right' } }
        ]);

        if (ativ.tarefas && ativ.tarefas.length > 0) {
            ativ.tarefas.forEach(tar => {
                const taskTime = getTaskTime(tar.id);
                
                // 2. Linha Secundária (Tarefa) - Sem emoji, usa sinal de MAIOR ">"
                tableData.push([
                    { content: `   > ${tar.titulo}`, styles: { textColor: [51, 65, 85], fontStyle: 'bold' } },
                    (tar.estado || '').toUpperCase().replace('_', ' '),
                    getStaffNames(tar.responsavel_id, tar.colaboradores),
                    { content: formatTime(taskTime), styles: { halign: 'right', fontStyle: 'bold' } }
                ]);

                // 3. Linha Terciária (Subtarefas) - Caixas de texto simples [X] e [ ]
                if (tar.subtarefas && tar.subtarefas.length > 0) {
                    tar.subtarefas.forEach(sub => {
                        const checkIcon = sub.estado === 'concluido' ? '[X]' : '[  ]';
                        tableData.push([
                            { content: `        ${checkIcon} ${sub.titulo}`, styles: { textColor: [100, 116, 139], fontSize: 8 } },
                            { content: (sub.estado || '').toUpperCase(), styles: { textColor: [100, 116, 139], fontSize: 8 } },
                            { content: '-', styles: { textColor: [100, 116, 139], fontSize: 8, halign: 'center' } },
                            { content: '-', styles: { textColor: [100, 116, 139], fontSize: 8, halign: 'right' } }
                        ]);
                    });
                }
            });
        }
    });

    autoTable(doc, {
        startY: currentY,
        head: [['Atividade / Tarefa / Passo', 'Estado', 'Equipa Associada', 'Tempo Gasto']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 5, lineColor: [226, 232, 240] },
        columnStyles: {
            0: { cellWidth: 85 },
            1: { cellWidth: 30 },
            2: { cellWidth: 45 },
            3: { cellWidth: 22, halign: 'right' }
        },
    });

    // ==========================================
    // RODAPÉ COM NÚMERO DE PÁGINAS
    // ==========================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...grayColor);
        doc.text(
            `Pagina ${i} de ${pageCount}  |  Gerado via Sistema de Gestao`, 
            pageWidth / 2, 
            pageHeight - 10, 
            { align: 'center' }
        );
    }

    doc.save(`Relatorio_${projeto.codigo_projeto || 'Projeto'}.pdf`);
};

export default gerarRelatorioProjeto;