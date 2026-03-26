import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { isVacationType } from "../utils/feriasSaldo";

const C = {
	navy: [27, 41, 82],
	blue: [70, 159, 97],
	gold: [136, 191, 104],
	ink: [36, 53, 79],
	muted: [96, 113, 133],
	subtle: [244, 249, 243],
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
	surface: C.subtle,
	white: C.white,
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

const toDateLabel = (year, month) => {
	const d = new Date(year, month - 1, 1);
	return d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
};

const toCompanyKey = (name) => (name || "Sem Empresa").trim() || "Sem Empresa";

const getColaboradorCompanies = (colaborador) => {
	if (Array.isArray(colaborador?.empresas_internas) && colaborador.empresas_internas.length > 0) {
		return [...new Set(colaborador.empresas_internas.map(toCompanyKey))];
	}

	return [toCompanyKey(colaborador?.empresa_interna)];
};

const toSafeFileNamePart = (value) => {
	const normalized = (value || "Sem_Empresa")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");

	return normalized || "Sem_Empresa";
};

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


// Conta os dias SA pagos: dias úteis do mês menos só ausências/faltas/<4h, incluindo ausências futuras já marcadas
const countMealAllowancePaidDays = (
	attendanceRows = [],
	ausenciasRows = [],
	{ startDate = "", endDate = "", feriadosSet = new Set() } = {},
) => {
	// 1. Lista de todos os dias úteis do mês
	const allBusinessDays = [];
	let d = new Date(startDate);
	const end = new Date(endDate);
	while (d <= end) {
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		const day = d.getDay();
		if (day !== 0 && day !== 6 && !feriadosSet.has(key)) allBusinessDays.push(key);
		d.setDate(d.getDate() + 1);
	}

	// 2. Map de assiduidade por dia
	const workedSecondsByDay = new Map();
	(attendanceRows || []).forEach((row) => {
		if (!row?.data_registo) return;
		const effectiveSeconds = getEffectiveWorkedSeconds(row);
		workedSecondsByDay.set(row.data_registo, effectiveSeconds);
	});

	// 3. Função para saber se há ausência de dia inteiro (não parcial, não rejeitada/cancelada, não KM)
	const isFullDayAbsence = (dateStr) => {
		return (ausenciasRows || []).some((a) => {
			if (a.is_parcial) return false;
			if (!a.data_inicio || !a.data_fim) return false;
			const estado = (a.estado || '').toLowerCase();
			if (estado === 'rejeitado' || estado === 'cancelado') return false;
			const tipo = (a.tipo || '').toLowerCase();
			if (tipo.includes('pedido de km')) return false;
			return a.data_inicio <= dateStr && a.data_fim >= dateStr;
		});
	};

	// 4. Só considerar como pago:
	// - Dias úteis com ausência de dia inteiro já marcada: NÃO pago
	// - Dias anteriores a hoje: só pago se tem registo >=4h
	// - Dias futuros e o próprio dia: pago, exceto se ausência de dia inteiro
	let paidDays = 0;
	const todayStr = new Date().toISOString().split('T')[0];
	allBusinessDays.forEach((key) => {
		if (isFullDayAbsence(key)) {
			// ausência de dia inteiro, não conta como pago
			return;
		}
		if (key < todayStr) {
			const worked = workedSecondsByDay.get(key);
			if (worked !== undefined && worked >= MIN_SA_WORK_SECONDS) {
				paidDays += 1; // trabalhou >=4h
			}
			// Dias anteriores a hoje, sem registo ou <4h, não contam como pagos
		} else {
			// futuro ou hoje, pago (exceto ausência já tratada acima)
			paidDays += 1;
		}
	});
	return paidDays;
};

const formatHours = (seconds) => {
	const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
	const h = Math.floor(safeSeconds / 3600);
	const m = Math.floor((safeSeconds % 3600) / 60);
	return `${h}h${String(m).padStart(2, "0")}m`;
};

const normalize = (v) => (v || "").toString().trim().toLowerCase();

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
		if (f.date) {
			set.add(f.date);
		}
	});
	return set;
};

export const generateRecursosHumanosPDF = async ({
	colaboradores = [],
	assiduidade = [],
	ausencias = [],
	ano,
	mes,
	diasUteisMes = 0,
	feriados = [],
}) => {
	const monthLabelText = toDateLabel(ano, mes);
	const issuedDate = new Date();
	const issueDateStr = issuedDate.toLocaleDateString("pt-PT");
	const issueTimeStr = issuedDate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

	const logoTopBase64 = await loadImage("/logo1.png");
	const logosFooterBase64 = await loadImage("/logos_all.png");

	const monthStart = `${ano}-${String(mes).padStart(2, "0")}-01`;
	const monthEndDate = new Date(ano, mes, 0);
	const monthEnd = `${ano}-${String(mes).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
	const feriadosSet = createFeriadosSet(feriados);

	const companies = new Map();
	(colaboradores || []).forEach((colaborador) => {
		const companyList = getColaboradorCompanies(colaborador);
		companyList.forEach((company) => {
			if (!companies.has(company)) companies.set(company, []);
			companies.get(company).push(colaborador);
		});
	});

	const orderedCompanies = Array.from(companies.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-PT"));

	orderedCompanies.forEach(([companyName, employees]) => {
		const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const marginX = 14;

		// Logos mais pequenos — 65% da largura, centrados, proporção real 2700×449
		const LOGO_W = pageWidth * 0.65;
		const LOGO_FOOTER_H = Math.round(LOGO_W * (449 / 2700) * 10) / 10;
		const LOGO_X = (pageWidth - LOGO_W) / 2;
		const FOOTER_TOTAL_H = LOGO_FOOTER_H + 13; // logos + espaço + linha de texto

		const drawPageHeader = () => {
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
		doc.setFontSize(18);
		doc.setTextColor(255, 255, 255);
		doc.text("Registo Geral RH", logoTopBase64 ? marginX + 34 : marginX, 16);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.setTextColor(219, 234, 254);
		doc.text("Uma identidade visual do Grupo Bizin", logoTopBase64 ? marginX + 34 : marginX, 22);
		doc.text(`Mês de referência: ${monthLabelText}`, logoTopBase64 ? marginX + 34 : marginX, 27);

		doc.setFont("helvetica", "bold");
		doc.setTextColor(255, 255, 255);
		doc.text(`Emitido em ${issueDateStr} às ${issueTimeStr}`, pageWidth - marginX, 16, { align: "right" });
		doc.text(`Empresa: ${companyName}`, pageWidth - marginX, 22, { align: "right" });
		};

		const drawSummaryCards = () => {
		const cardY = 44;
		const cardH = 28;
		const badgeW = 46;
		const gap = 5;
		const companyW = pageWidth - marginX * 2 - badgeW - gap;
		const companyX = marginX;                        // empresa à esquerda
		const badgeX   = marginX + companyW + gap;       // badge à direita

		// ── Card Empresa (esquerda) ─────────────────────────────────
		doc.setFillColor(255, 255, 255);
		doc.setDrawColor(...COLORS.border);
		doc.setLineWidth(0.45);
		doc.roundedRect(companyX, cardY, companyW, cardH, 2.5, 2.5, "FD");

		// Acento verde interno, no espírito dos cards do dashboard
		doc.setFillColor(...COLORS.brand);
		doc.roundedRect(companyX + 1.8, cardY + 3.2, 4.6, cardH - 6.4, 1.9, 1.9, "F");

		// Rótulo EMPRESA discreto
		doc.setFont("helvetica", "normal");
		doc.setFontSize(7);
		doc.setTextColor(...COLORS.slate);
		doc.text("EMPRESA", companyX + 14, cardY + 8);

		// Nome da empresa em destaque
		doc.setFont("helvetica", "bold");
		doc.setFontSize(16);
		doc.setTextColor(...COLORS.brandDark);
		doc.text(companyName, companyX + 14, cardY + 20, { maxWidth: companyW - 18 });

		// ── Badge Dias Úteis (direita) ──────────────────────────────
		doc.setFillColor(...COLORS.brandDark);
		doc.roundedRect(badgeX, cardY, badgeW, cardH, 2.5, 2.5, "F");

		// Número grande
		doc.setFont("helvetica", "bold");
		doc.setFontSize(24);
		doc.setTextColor(255, 255, 255);
		doc.text(String(diasUteisMes), badgeX + badgeW / 2, cardY + 14, { align: "center" });

		// Rótulo pequeno em baixo
		doc.setFont("helvetica", "bold");
		doc.setFontSize(6.5);
		doc.setTextColor(...COLORS.accent);
		doc.text("DIAS ÚTEIS", badgeX + badgeW / 2, cardY + 22, { align: "center" });
		};

		const drawPageFooter = (pageNumber, totalPages) => {
		const textY = pageHeight - 6;
		const logoY = textY - LOGO_FOOTER_H - 3;

		// Logos centrados e mais pequenos (acima do texto)
		if (logosFooterBase64) {
			doc.addImage(logosFooterBase64, "PNG", LOGO_X, logoY, LOGO_W, LOGO_FOOTER_H, "", "FAST");
		}

		// Texto de rodapé na base da página
		doc.setFont("helvetica", "normal");
		doc.setFontSize(7.5);
		doc.setTextColor(...COLORS.slate);
		doc.text("Documento interno RH - Grupo Bizin", marginX, textY);
		doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - marginX, textY, { align: "right" });
		};

		drawPageHeader();
		drawSummaryCards();
		const tableStartY = 80;

		const rows = employees.map((employee) => {
			const userAssiduidade = (assiduidade || []).filter((a) => a.user_id === employee.id);
			const userAusencias = (ausencias || []).filter((a) => a.user_id === employee.id);

			// Dias SA pagos = dias úteis do mês menos só ausências/faltas/<4h
			const workedDays = employee.valor_sa === 0 ? 0 : countMealAllowancePaidDays(
				userAssiduidade,
				userAusencias,
				{ startDate: monthStart, endDate: monthEnd, feriadosSet }
			);

			const totalSeconds = userAssiduidade.reduce((acc, row) => {
				return acc + getEffectiveWorkedSeconds(row);
			}, 0);


			let faltasJustificadas = 0;
			let faltasInjustificadas = 0;
			let ferias = 0;
			let kmsTotais = 0;

			// Corrigir: somar todos os pedidos de km aprovados do colaborador neste mês
			kmsTotais = (userAusencias || []).reduce((acc, a) => {
				const tipo = (a.tipo || '').toLowerCase();
				const estado = (a.estado || '').toLowerCase();
				if (!tipo.includes('pedido de km')) return acc;
				if (estado === 'rejeitado' || estado === 'cancelado') return acc;
				// Só contar pedidos que abrangem pelo menos 1 dia do mês
				if (!overlapsMonth(a.data_inicio, a.data_fim || a.data_inicio, monthStart, monthEnd)) return acc;
				return acc + (Number(a.km_total) || 0);
			}, 0);

			// Para cada dia útil do mês, verificar se há ausência de dia inteiro e classificar corretamente
			let d = new Date(monthStart);
			const end = new Date(monthEnd);
			const hojeStr = new Date().toISOString().split('T')[0];
			while (d <= end) {
				const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
				const day = d.getDay();
				if (day === 0 || day === 6 || feriadosSet.has(dateStr)) {
					d.setDate(d.getDate() + 1);
					continue;
				}
				// 1. Verificar ausência de dia inteiro (não parcial, não rejeitada/cancelada, não KM)
				const ausencia = (userAusencias || []).find((a) => {
					if (a.is_parcial) return false;
					if (!a.data_inicio || !a.data_fim) return false;
					const estado = (a.estado || '').toLowerCase();
					if (estado === 'rejeitado' || estado === 'cancelado') return false;
					const tipo = (a.tipo || '').toLowerCase();
					if (tipo.includes('pedido de km')) return false;
					return a.data_inicio <= dateStr && a.data_fim >= dateStr;
				});
				if (ausencia) {
					const tipo = normalize(ausencia.tipo);
					if (isVacationType(tipo)) ferias += 1;
					else if (tipo.includes('falta')) {
						if (tipo.includes('injust')) faltasInjustificadas += 1;
						else if (tipo.includes('just')) faltasJustificadas += 1;
						else faltasInjustificadas += 1;
					} else if (tipo.includes('baixa') || tipo.includes('doenca') || tipo.includes('acidente')) {
						// Se quiseres contar baixas, podes adicionar aqui
					}
				} else {
					// 2. Se não há ausência, e o dia é anterior a hoje, e não tem registo >=4h, é falta injustificada automática
					if (dateStr < hojeStr) {
						const assid = (userAssiduidade || []).find(a => a.data_registo === dateStr);
						const worked = assid ? getEffectiveWorkedSeconds(assid) : 0;
						if (worked < MIN_SA_WORK_SECONDS) {
							faltasInjustificadas += 1;
						}
					}
				}
				d.setDate(d.getDate() + 1);
			}

			const saDiario = Number(employee.valor_sa) || 0;
			const subsidioAlimentacao = workedDays * saDiario;

			return [
				employee.nome || "-",
				String(faltasJustificadas),
				String(faltasInjustificadas),
				String(ferias),
				`${kmsTotais.toFixed(1)} km`,
				String(workedDays),
				`${subsidioAlimentacao.toFixed(2)} €`,
				formatHours(totalSeconds),
			];
		});

		const tableWidth = pageWidth - marginX * 2;
		const tableRadius = 0;
		const headerHeight = 13;
		const createTableOptions = () => ({
			startY: tableStartY,
			tableWidth: pageWidth - marginX * 2,
			head: [[
				"Colaborador",
				"Faltas Just.",
				"Faltas Injust.",
				"Férias",
				"Pedidos Km's",
				"Dias >=4h",
				"Subsídio Alimentação",
				"Total Horas",
			]],
			body: rows,
			styles: {
				fontSize: 9.5,
				textColor: COLORS.ink,
				lineColor: COLORS.border,
				lineWidth: 0.12,
				fillColor: [255, 255, 255],
				cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
			},
			headStyles: {
				fillColor: COLORS.brandDark,
				textColor: COLORS.white,
				fontStyle: "bold",
				fontSize: 9.5,
				minCellHeight: 10,
				lineColor: COLORS.border,
				lineWidth: { top: 0, right: 0.12, bottom: 0.12, left: 0.12 },
			},
			alternateRowStyles: {
				fillColor: [250, 253, 249],
			},
			bodyStyles: {
				valign: "middle",
				minCellHeight: 9,
			},
			columnStyles: {
				0: { cellWidth: "auto" },
				1: { halign: "center", cellWidth: 18 },
				2: { halign: "center", cellWidth: 20 },
				3: { halign: "center", cellWidth: 14 },
				4: { halign: "center", cellWidth: 18 },
				5: { halign: "center", cellWidth: 22 },
				6: { halign: "right", cellWidth: 24 },
				7: { halign: "right", cellWidth: 20 },
			},
			didParseCell: (data) => {
				const lineWidth = { top: 0.12, right: 0.12, bottom: 0.12, left: 0.12 };

				if (data.row.section === "head") {
					lineWidth.top = 0;
					if (data.column.index === 0) lineWidth.left = 0;
					if (data.column.index === 7) lineWidth.right = 0;
				}

				if (data.row.section === "body" && data.row.index === rows.length - 1) {
					lineWidth.bottom = 0;
				}

				if (data.column.index === 0) {
					lineWidth.left = 0;
				}

				if (data.column.index === 7) {
					lineWidth.right = 0;
				}

				data.cell.styles.lineWidth = lineWidth;
			},
			margin: { left: marginX, right: marginX, bottom: FOOTER_TOTAL_H },
		});

		const measureDoc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
		autoTable(measureDoc, createTableOptions());
		const tableHeight = measureDoc.lastAutoTable.finalY - tableStartY;

		doc.setFillColor(255, 255, 255);
		doc.setDrawColor(...COLORS.border);
		doc.setLineWidth(0.45);
		doc.rect(marginX, tableStartY, tableWidth, tableHeight, "FD");

		doc.setFillColor(...COLORS.brandDark);
		doc.rect(marginX, tableStartY, tableWidth, headerHeight, "F");

		autoTable(doc, createTableOptions());

		doc.setDrawColor(...COLORS.border);
		doc.setLineWidth(0.45);
		doc.setLineJoin("round");
		doc.setLineCap("round");
		doc.rect(marginX, tableStartY, tableWidth, tableHeight, "S");

		drawPageFooter(1, 1);

		const monthSuffix = `${String(mes).padStart(2, "0")}_${ano}`;
		const companyFileName = toSafeFileNamePart(companyName);
		doc.save(`${companyFileName}_relatorio_${monthSuffix}.pdf`);
	});
};

const gerarRelatorioRecursosHumanos = (payload) => generateRecursosHumanosPDF(payload);

export default gerarRelatorioRecursosHumanos;
