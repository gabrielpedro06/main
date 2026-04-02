import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const C = {
    navy: [27, 41, 82],
    blue: [70, 159, 97],
    gold: [136, 191, 104],
    ink: [36, 53, 79],
    muted: [96, 113, 133],
    line: [218, 229, 217],
    white: [255, 255, 255],
};

const COLORS = {
    brandDark: C.navy,
    brand: C.blue,
    accent: C.gold,
    ink: C.ink,
    slate: C.muted,
    border: C.line,
    white: C.white,
};

const DEFAULT_REEMBOLSO_POR_KM = 0.4;

const loadImage = (url) =>
    new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(null);
                return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
    });

const toMonthLabel = (year, month) => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
};

const toDateLabel = (dateValue) => {
    if (!dateValue) return "-";
    const d = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateValue;
    return d.toLocaleDateString("pt-PT");
};

const toFileSafeName = (name) =>
    (name || "colaborador")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

const getProfileCompanies = (profile) => {
    if (Array.isArray(profile?.empresas_internas) && profile.empresas_internas.length > 0) {
        return [...new Set(profile.empresas_internas.filter(Boolean))];
    }

    if (profile?.empresa_interna) {
        return [profile.empresa_interna];
    }

    return [];
};

const getCompanyLabel = (profile) => {
    const companies = getProfileCompanies(profile);
    return companies.length > 0 ? companies.join(" • ") : "Sem Empresa";
};

const isKmType = (tipo = "") => (tipo || "").toString().toLowerCase().includes("pedido de km");

export const generateDeslocacoesMensaisPDF = async ({
    colaboradores = [],
    deslocacoes = [],
    ano,
    mes,
    valorPorKm = DEFAULT_REEMBOLSO_POR_KM,
}) => {
    const monthRef = `${ano}-${String(mes).padStart(2, "0")}`;
    const monthLabel = toMonthLabel(ano, mes);
    const issuedDate = new Date();
    const issueDateStr = issuedDate.toLocaleDateString("pt-PT");
    const issueTimeStr = issuedDate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

    const logoTopBase64 = await loadImage("/logo1.png");
    const logosFooterBase64 = await loadImage("/logos_all.png");

    const deslocacoesDoMes = (deslocacoes || []).filter((item) => {
        if (!item || !isKmType(item.tipo)) return false;
        if (!item.data_inicio) return false;
        return item.data_inicio.startsWith(monthRef);
    });

    if (deslocacoesDoMes.length === 0) {
        throw new Error("Nao existem deslocacoes aprovadas neste mes.");
    }

    const deslocacoesPorUser = new Map();
    deslocacoesDoMes.forEach((item) => {
        if (!item.user_id) return;
        if (!deslocacoesPorUser.has(item.user_id)) deslocacoesPorUser.set(item.user_id, []);
        deslocacoesPorUser.get(item.user_id).push(item);
    });

    const orderedUsers = Array.from(deslocacoesPorUser.keys()).sort((a, b) => {
        const nameA = colaboradores.find((c) => c.id === a)?.nome || "";
        const nameB = colaboradores.find((c) => c.id === b)?.nome || "";
        return nameA.localeCompare(nameB, "pt-PT");
    });

    orderedUsers.forEach((userId) => {
        const colaborador = colaboradores.find((c) => c.id === userId) || {};
        const rows = (deslocacoesPorUser.get(userId) || [])
            .slice()
            .sort((a, b) => (a.data_inicio || "").localeCompare(b.data_inicio || ""));

        const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 14;
        const LOGO_W = pageWidth * 0.65;
        const LOGO_H = Math.round(LOGO_W * (449 / 2700) * 10) / 10;
        const LOGO_X = (pageWidth - LOGO_W) / 2;
        const FOOTER_TOTAL_H = LOGO_H + 13;

        const drawHeader = () => {
            doc.setFillColor(...COLORS.brandDark);
            doc.rect(0, 0, pageWidth, 36, "F");
            doc.setFillColor(...COLORS.brand);
            doc.rect(0, 36, pageWidth, 2, "F");
            doc.setFillColor(...COLORS.accent);
            doc.rect(pageWidth - 64, 0, 64, 2, "F");

            if (logoTopBase64) {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(marginX, 8, 28, 18, 2, 2, "F");
                doc.addImage(logoTopBase64, "PNG", marginX + 2, 10, 24, 14, "", "FAST");
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(17);
            doc.setTextColor(255, 255, 255);
            doc.text("Mapa Mensal de Deslocacoes", logoTopBase64 ? marginX + 34 : marginX, 16);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(219, 234, 254);
            doc.text("Documento para contabilidade", logoTopBase64 ? marginX + 34 : marginX, 22);
            doc.text(`Referencia: ${monthLabel}`, logoTopBase64 ? marginX + 34 : marginX, 27);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(`Emitido em ${issueDateStr} as ${issueTimeStr}`, pageWidth - marginX, 16, { align: "right" });
            doc.text(colaborador?.nome || "Colaborador", pageWidth - marginX, 22, { align: "right" });
        };

        const drawFooter = (page, total) => {
            const textY = pageHeight - 6;
            const logoY = textY - LOGO_H - 3;

            if (logosFooterBase64) {
                doc.addImage(logosFooterBase64, "PNG", LOGO_X, logoY, LOGO_W, LOGO_H, "", "FAST");
            }

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(...COLORS.slate);
            doc.text("Documento interno RH - Grupo Bizin", marginX, textY);
            doc.text(`Pagina ${page} de ${total}`, pageWidth - marginX, textY, { align: "right" });
        };

        drawHeader();

        doc.setDrawColor(...COLORS.border);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(marginX, 42, pageWidth - marginX * 2, 38, 2.5, 2.5, "FD");

        const companyLabel = getCompanyLabel(colaborador);
        // const morada = colaborador?.morada || "-"; // Removido conforme pedido
        // 💡 Recolhe todas as viaturas usadas nestes pedidos específicos
        const viaturasUsadas = [...new Set(rows.map(r => r.veiculo).filter(Boolean))];
        const viatura = viaturasUsadas.length > 0 ? viaturasUsadas.join(" • ") : "-";
        const nif = colaborador?.nif || "-";

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.ink);
        doc.text("Colaborador:", marginX + 4, 50);
        doc.text("NIF:", marginX + 4, 57);
        doc.text("Empresa:", marginX + 4, 64);

        const rightColX = pageWidth / 2 + 6;
        doc.text("Mês/ano:", rightColX, 50);
        doc.text("Viatura:", rightColX, 57);
        doc.text("Valor por Km:", rightColX, 64);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.slate);
        doc.text(colaborador?.nome || "-", marginX + 30, 50, { maxWidth: pageWidth / 2 - 34 });
        doc.text(nif, marginX + 30, 57, { maxWidth: pageWidth / 2 - 34 });
        doc.text(companyLabel, marginX + 30, 64, { maxWidth: pageWidth / 2 - 34 });

        doc.text(monthLabel, rightColX + 22, 50);
        doc.text(viatura, rightColX + 22, 57, { maxWidth: pageWidth - rightColX - 26 });
        doc.text(`${Number(valorPorKm).toFixed(2)} EUR`, rightColX + 22, 64);

        const bodyRows = rows.map((item) => {
            const kms = Number(item.km_total) || 0;
            const reembolso = kms * Number(valorPorKm || 0);
            
            // 💡 Junta o trajeto com o carro utilizado por baixo
            const percursoEVeiculo = item.veiculo 
                ? `${item.km_origem || "-"} - ${item.km_destino || "-"}\n(Viatura: ${item.veiculo})`
                : `${item.km_origem || "-"} - ${item.km_destino || "-"}`;

            return [
                toDateLabel(item.data_inicio),
                percursoEVeiculo,
                kms.toFixed(1),
                `${reembolso.toFixed(2)} EUR`,
            ];
        });

        autoTable(doc, {
            startY: 78,
            head: [["Dia da Deslocacao", "Percurso", "Kms", "Reembolso"]],
            body: bodyRows,
            margin: { left: marginX, right: marginX, bottom: FOOTER_TOTAL_H },
            theme: "grid",
            headStyles: {
                fillColor: COLORS.brandDark,
                textColor: COLORS.white,
                fontStyle: "bold",
                fontSize: 8.5,
            },
            styles: {
                fontSize: 8.5,
                textColor: COLORS.ink,
                lineColor: COLORS.border,
                lineWidth: 0.12,
                cellPadding: 2.4,
            },
            alternateRowStyles: {
                fillColor: [250, 253, 249],
            },
            columnStyles: {
                0: { cellWidth: 34 },
                1: { cellWidth: "auto" },
                2: { cellWidth: 22, halign: "right" },
                3: { cellWidth: 28, halign: "right" },
            },
        });

        const totalKms = rows.reduce((acc, item) => acc + (Number(item.km_total) || 0), 0);
        const totalReembolso = totalKms * Number(valorPorKm || 0);

        let totalsY = doc.lastAutoTable.finalY + 8;
        if (totalsY > pageHeight - FOOTER_TOTAL_H - 4) {
            doc.addPage();
            drawHeader();
            totalsY = 52;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.brandDark);
        doc.text(`Total Kms: ${totalKms.toFixed(1)} km`, marginX, totalsY);
        doc.text(`Total Reembolso: ${totalReembolso.toFixed(2)} EUR`, pageWidth - marginX, totalsY, { align: "right" });

        const totalPages = doc.internal.getNumberOfPages();
        for (let page = 1; page <= totalPages; page += 1) {
            doc.setPage(page);
            drawFooter(page, totalPages);
        }

        const safeName = toFileSafeName(colaborador?.nome || "colaborador");
        doc.save(`Mapa_Deslocacoes_${safeName}_${monthRef}.pdf`);
    });
};

const gerarRelatorioDeslocacoesMensais = (payload) => generateDeslocacoesMensaisPDF(payload);

export default gerarRelatorioDeslocacoesMensais;
