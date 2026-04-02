import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { isVacationType } from "../utils/feriasSaldo";

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

const normalize = (v) => (v || "").toString().trim().toLowerCase();

const timeToSeconds = (timeValue) => {
	if (!timeValue || typeof timeValue !== "string") return 0;
	const [hours = "0", minutes = "0", seconds = "0"] = timeValue.split(":");
	return (Number(hours) * 3600) + (Number(minutes) * 60) + Number(seconds);
};

const MIN_SA_WORK_SECONDS = 4 * 60 * 60;

const getEffectiveWorkedSeconds = (attendanceRow) => {
	if (!attendanceRow?.hora_entrada || !attendanceRow?.hora_saida) return 0;

	const raw = timeToSeconds(attendanceRow.hora_saida) - timeToSeconds(attendanceRow.hora_entrada);
	const pauseSeconds = Math.max(0, Number(attendanceRow.tempo_pausa_acumulado) || 0);
	return Math.max(0, raw - pauseSeconds);
};

const countMealAllowanceEligibleDays = (attendanceRows = []) => {
	const totalSecondsByDay = new Map();

	(attendanceRows || []).forEach((row) => {
		if (!row?.data_registo) return;

		const effectiveSeconds = getEffectiveWorkedSeconds(row);
		if (effectiveSeconds <= 0) return;

		totalSecondsByDay.set(
			row.data_registo,
			(totalSecondsByDay.get(row.data_registo) || 0) + effectiveSeconds,
		);
	});

	let eligibleDays = 0;
	totalSecondsByDay.forEach((totalSeconds) => {
		if (totalSeconds >= MIN_SA_WORK_SECONDS) eligibleDays += 1;
	});

	return eligibleDays;
};

const formatHours = (seconds) => {
	const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
	const h = Math.floor(safeSeconds / 3600);
	const m = Math.floor((safeSeconds % 3600) / 60);
	return `${h}h${String(m).padStart(2, "0")}m`;
};

const overlapsMonth = (startDate, endDate, monthStart, monthEnd) => {
	if (!startDate || !endDate) return false;
	return startDate <= monthEnd && endDate >= monthStart;
};

const calcBusinessDaysInRange = (startDate, endDate, feriadosSet) => {
	let count = 0;
	const current = new Date(startDate);
	const end = new Date(endDate);

	while (current <= end) {
		const day = current.getDay();
		const yyyy = current.getFullYear();
		const mm = String(current.getMonth() + 1).padStart(2, "0");
		const dd = String(current.getDate()).padStart(2, "0");
		const key = `${yyyy}-${mm}-${dd}`;
		const isWeekend = day === 0 || day === 6;
		const isHoliday = feriadosSet.has(key);

		if (!isWeekend && !isHoliday) count += 1;
		current.setDate(current.getDate() + 1);
	}

	return count;
};

const createFeriadosSet = (feriados = []) => {
	const set = new Set();
	(feriados || []).forEach((f) => {
		if (!f) return;
		if (typeof f === "string") {
			set.add(f);
			return;
		}
		if (f.date) set.add(f.date);
	});
	return set;
};

const toMonthLabel = (year, month) => {
	const d = new Date(year, month - 1, 1);
	return d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
};

const toFileSafeName = (name) =>
	(name || "Colaborador")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9_-]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "");

const getColaboradorCompaniesLabel = (colaborador) => {
	if (Array.isArray(colaborador?.empresas_internas) && colaborador.empresas_internas.length > 0) {
		return [...new Set(colaborador.empresas_internas.filter(Boolean))].join(" • ");
	}

	return colaborador?.empresa_interna || "Sem Empresa";
};

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

export const generateIndividualRHPDF = async ({
	colaborador,
	assiduidade = [],
	ausencias = [],
	ano,
	mes,
	feriados = [],
}) => {
	if (!colaborador) throw new Error("Colaborador inválido para gerar relatório.");

	const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const marginX = 14;
	const monthLabel = toMonthLabel(ano, mes);
	const issuedDate = new Date();
	const issueDateStr = issuedDate.toLocaleDateString("pt-PT");
	const issueTimeStr = issuedDate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
	const monthStart = `${ano}-${String(mes).padStart(2, "0")}-01`;
	const monthEndDate = new Date(ano, mes, 0);
	const monthEnd = `${ano}-${String(mes).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
	const feriadosSet = createFeriadosSet(feriados);

	const logoTopBase64 = await loadImage("/logo1.png");
	const logosFooterBase64 = await loadImage("/logos_all.png");

	const diasTrabalhados = countMealAllowanceEligibleDays(assiduidade || []);
	const totalSeconds = (assiduidade || []).reduce((acc, row) => {
		return acc + getEffectiveWorkedSeconds(row);
	}, 0);

	let faltasJustificadas = 0;
	let faltasInjustificadas = 0;
	let feriasDias = 0;
	let baixasDias = 0;
	let kmsTotais = 0;

	(ausencias || []).forEach((ausencia) => {
		const start = ausencia.data_inicio;
		const end = ausencia.data_fim || ausencia.data_inicio;
		if (!overlapsMonth(start, end, monthStart, monthEnd)) return;

		const tipo = normalize(ausencia.tipo);
		if (tipo.includes("pedido de km")) {
			kmsTotais += Number(ausencia.km_total) || 0;
			return;
		}

		const rangeStart = start < monthStart ? monthStart : start;
		const rangeEnd = end > monthEnd ? monthEnd : end;
		const dias = ausencia.is_parcial ? 0 : calcBusinessDaysInRange(rangeStart, rangeEnd, feriadosSet);

		if (isVacationType(tipo)) {
			feriasDias += dias;
			return;
		}

		if (tipo.includes("falta")) {
			if (tipo.includes("injust")) faltasInjustificadas += dias;
			else if (tipo.includes("just")) faltasJustificadas += dias;
			else faltasInjustificadas += dias;
			return;
		}

		if (tipo.includes("baixa")) baixasDias += dias;
	});

	const subsidioDiario = Number(colaborador.valor_sa) || 0;
	const subsidioTotal = diasTrabalhados * subsidioDiario;

	const drawHeader = () => {
		doc.setFillColor(...COLORS.brandDark);
		doc.rect(0, 0, pageWidth, 34, "F");
		doc.setFillColor(...COLORS.brand);
		doc.rect(0, 34, pageWidth, 2, "F");
		doc.setFillColor(...COLORS.accent);
		doc.rect(pageWidth - 64, 0, 64, 2, "F");

		if (logoTopBase64) {
			doc.setFillColor(255, 255, 255);
			doc.roundedRect(marginX, 8, 28, 18, 2, 2, "F");
			doc.addImage(logoTopBase64, "PNG", marginX + 2, 10, 24, 14, "", "FAST");
		}

		doc.setFont("helvetica", "bold");
		doc.setFontSize(16);
		doc.setTextColor(255, 255, 255);
		doc.text("Relatório Individual RH", logoTopBase64 ? marginX + 34 : marginX, 15);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.setTextColor(219, 234, 254);
		doc.text(`Referência: ${monthLabel}`, logoTopBase64 ? marginX + 34 : marginX, 21);

		doc.setFont("helvetica", "bold");
		doc.setTextColor(255, 255, 255);
		doc.text(`Emitido em ${issueDateStr} às ${issueTimeStr}`, pageWidth - marginX, 15, { align: "right" });
		doc.text(colaborador.nome || "Colaborador", pageWidth - marginX, 21, { align: "right" });
	};

	const drawFooter = (page, total) => {
		const LOGO_W = pageWidth * 0.65;
		const LOGO_H = Math.round(LOGO_W * (449 / 2700) * 10) / 10;
		const LOGO_X = (pageWidth - LOGO_W) / 2;
		const textY = pageHeight - 6;
		const logoY = textY - LOGO_H - 3;

		if (logosFooterBase64) {
			doc.addImage(logosFooterBase64, "PNG", LOGO_X, logoY, LOGO_W, LOGO_H, "", "FAST");
		}

		doc.setFont("helvetica", "normal");
		doc.setFontSize(7.5);
		doc.setTextColor(...COLORS.slate);
		doc.text("Documento interno RH - Grupo Bizin", marginX, textY);
		doc.text(`Página ${page} de ${total}`, pageWidth - marginX, textY, { align: "right" });
	};

	drawHeader();

	doc.setFillColor(255, 255, 255);
	doc.setDrawColor(...COLORS.border);
	doc.setLineWidth(0.45);
	doc.roundedRect(marginX, 42, pageWidth - marginX * 2, 20, 2.5, 2.5, "FD");

	doc.setFont("helvetica", "normal");
	doc.setFontSize(8);
	doc.setTextColor(...COLORS.slate);
	doc.text("COLABORADOR", marginX + 4, 48);
	doc.text("EMPRESA", marginX + 4, 54);

	doc.setFont("helvetica", "bold");
	doc.setFontSize(11);
	doc.setTextColor(...COLORS.brandDark);
	doc.text(colaborador.nome || "-", marginX + 30, 48);
	doc.text(getColaboradorCompaniesLabel(colaborador), marginX + 30, 54);

	const metricTitles = [
		"Dias >=4h",
		"Total de Horas",
		"Subsídio Alimentação",
		"Férias (dias)",
		"Km's",
		"Faltas Just.",
		"Faltas Injust.",
		"Baixas",
	];
	const metricValues = [
		String(diasTrabalhados),
		formatHours(totalSeconds),
		`${subsidioTotal.toFixed(2)} €`,
		String(feriasDias),
		`${kmsTotais.toFixed(1)} km`,
		String(faltasJustificadas),
		String(faltasInjustificadas),
		String(baixasDias),
	];

	autoTable(doc, {
		startY: 68,
		head: [metricTitles],
		body: [metricValues],
		theme: "grid",
		margin: { left: marginX, right: marginX, bottom: 28 },
		headStyles: {
			fillColor: COLORS.brandDark,
			textColor: COLORS.white,
			fontStyle: "bold",
			fontSize: 8,
			halign: "center",
		},
		bodyStyles: {
			fontSize: 9,
			textColor: COLORS.ink,
			fontStyle: "bold",
			halign: "center",
		},
		styles: {
			lineColor: COLORS.border,
			lineWidth: 0.15,
			cellPadding: 2.8,
		},
	});

	const linhasAssiduidade = (assiduidade || [])
		.slice()
		.sort((a, b) => (a.data_registo || "").localeCompare(b.data_registo || ""))
		.map((a) => {
			const bruto = timeToSeconds(a.hora_saida) - timeToSeconds(a.hora_entrada);
			const pausa = Number(a.tempo_pausa_acumulado) || 0;
			const liquido = Math.max(0, bruto - pausa);
			return [
				a.data_registo || "-",
				a.hora_entrada || "--:--",
				a.hora_saida || "--:--",
				formatHours(liquido),
				a.observacoes || "-",
			];
		});

	const linhasAusencias = (ausencias || [])
		.slice()
		.sort((a, b) => (a.data_inicio || "").localeCompare(b.data_inicio || ""))
		.filter((a) => !normalize(a.tipo).includes("pedido de km"))
		.map((a) => {
			const inicio = a.data_inicio || "-";
			const fim = a.data_fim || a.data_inicio || "-";
			const dias = a.is_parcial ? "Parcial" : String(calcBusinessDaysInRange(inicio, fim, feriadosSet));
			return [
				a.tipo || "Ausência",
				inicio,
				fim,
				dias,
				a.motivo || "-",
			];
		});

	const linhasKms = (ausencias || [])
		.slice()
		.sort((a, b) => (a.data_inicio || "").localeCompare(b.data_inicio || ""))
		.filter((a) => normalize(a.tipo).includes("pedido de km"))
		.map((a) => [
			a.data_inicio || "-",
			a.km_origem || "-",
			a.km_destino || "-",
			`${Number(a.km_total) || 0}`,
			a.motivo || "-",
		]);

	autoTable(doc, {
		startY: doc.lastAutoTable.finalY + 8,
		head: [["Registos de Assiduidade", "Entrada", "Saída", "Horas", "Observações"]],
		body: linhasAssiduidade.length > 0 ? linhasAssiduidade : [["Sem registos no período", "-", "-", "-", "-"]],
		margin: { left: marginX, right: marginX, bottom: 28 },
		theme: "grid",
		headStyles: {
			fillColor: COLORS.brand,
			textColor: COLORS.white,
			fontStyle: "bold",
			fontSize: 8,
		},
		styles: {
			fontSize: 8,
			textColor: COLORS.ink,
			lineColor: COLORS.border,
			lineWidth: 0.12,
			cellPadding: 2.2,
		},
		columnStyles: {
			0: { cellWidth: 36 },
			1: { cellWidth: 22, halign: "center" },
			2: { cellWidth: 22, halign: "center" },
			3: { cellWidth: 22, halign: "right" },
			4: { cellWidth: "auto" },
		},
	});

	autoTable(doc, {
		startY: doc.lastAutoTable.finalY + 8,
		head: [["Ausência", "Início", "Fim", "Dias", "Motivo"]],
		body: linhasAusencias.length > 0 ? linhasAusencias : [["Sem ausências no período", "-", "-", "-", "-"]],
		margin: { left: marginX, right: marginX, bottom: 28 },
		theme: "grid",
		headStyles: {
			fillColor: COLORS.brandDark,
			textColor: COLORS.white,
			fontStyle: "bold",
			fontSize: 8,
		},
		styles: {
			fontSize: 8,
			textColor: COLORS.ink,
			lineColor: COLORS.border,
			lineWidth: 0.12,
			cellPadding: 2.2,
		},
		columnStyles: {
			0: { cellWidth: 34 },
			1: { cellWidth: 22, halign: "center" },
			2: { cellWidth: 22, halign: "center" },
			3: { cellWidth: 16, halign: "center" },
			4: { cellWidth: "auto" },
		},
	});

	autoTable(doc, {
		startY: doc.lastAutoTable.finalY + 8,
		head: [["Pedido Km's", "De", "Para", "Km total", "Notas"]],
		body: linhasKms.length > 0 ? linhasKms : [["Sem pedidos de Km's no período", "-", "-", "-", "-"]],
		margin: { left: marginX, right: marginX, bottom: 28 },
		theme: "grid",
		headStyles: {
			fillColor: COLORS.brand,
			textColor: COLORS.white,
			fontStyle: "bold",
			fontSize: 8,
		},
		styles: {
			fontSize: 8,
			textColor: COLORS.ink,
			lineColor: COLORS.border,
			lineWidth: 0.12,
			cellPadding: 2.2,
		},
		columnStyles: {
			0: { cellWidth: 24, halign: "center" },
			1: { cellWidth: 30 },
			2: { cellWidth: 30 },
			3: { cellWidth: 20, halign: "center" },
			4: { cellWidth: "auto" },
		},
	});

	const totalPages = doc.internal.getNumberOfPages();
	for (let page = 1; page <= totalPages; page += 1) {
		doc.setPage(page);
		drawFooter(page, totalPages);
	}

	const monthRef = `${ano}-${String(mes).padStart(2, "0")}`;
	const safeName = toFileSafeName(colaborador.nome || "colaborador");
	doc.save(`Relatorio_Individual_RH_${safeName}_${monthRef}.pdf`);
};

const gerarRelatorioIndividual = (payload) => generateIndividualRHPDF(payload);

export default gerarRelatorioIndividual;

