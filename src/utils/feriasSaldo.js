export const ANNUAL_VACATION_DAYS = 22;
export const ATTENDANCE_GLOBAL_CUTOFF = "2026-03-01";
export const TOLERANCIA_TIPO = "Tolerância de Ponto";
export const TOLERANCIA_TIPOS = [
  TOLERANCIA_TIPO,
  "Tolerancia de Ponto",
  "tolerancia",
  "tolerância",
];

export const resolveAnnualVacationLimit = (value) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  return ANNUAL_VACATION_DAYS;
};

export const getAnnualVacationLimitFromProfile = (profile = null) =>
  resolveAnnualVacationLimit(profile?.dias_ferias_total ?? profile?.dias_ferias);

const removeAccents = (value = "") =>
  String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const normalizeAbsenceType = (tipo = "") =>
  removeAccents(tipo).trim().toLowerCase();

export const isVacationType = (tipo = "") =>
  normalizeAbsenceType(tipo).includes("ferias");

export const formatAbsenceTypeLabel = (tipo = "") => {
  const trimmed = String(tipo ?? "").trim();
  if (!trimmed) return "";

  return isVacationType(trimmed) ? "Férias" : trimmed;
};

export const parseLocalDate = (dateValue) => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    const normalized = new Date(dateValue);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

export const formatDateKey = (dateValue) => {
  const date = parseLocalDate(dateValue);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Builds a Set of date strings (YYYY-MM-DD) that should be skipped when
 * counting working days for a given user, based on the tolerâncias list.
 * A tolerância applies if it is global (user_id === null) or if it belongs
 * to the specific user being evaluated.
 */
export const buildToleranciasSkipSet = (tolerancias = [], userId = null) => {
  const skipSet = new Set();
  for (const t of tolerancias) {
    if (t.user_id === null || t.user_id === userId) {
      const key = formatDateKey(t.data ?? t.data_inicio ?? t.data_fim);
      if (key) skipSet.add(key);
    }
  }
  return skipSet;
};

export async function obterToleranciasAtivas({
  supabaseClient,
  userId = null,
}) {
  let query = supabaseClient
    .from("ferias")
    .select("id, user_id, tipo, motivo, data_inicio, data_fim")
    .in("tipo", TOLERANCIA_TIPOS)
    .neq("estado", "cancelado")
    .neq("estado", "rejeitado");

  if (userId) {
    query = query.or(`user_id.is.null,user_id.eq.${userId}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((item) => ({
    id: item.id,
    user_id: item.user_id,
    nome: item.motivo || item.tipo || TOLERANCIA_TIPO,
    data: item.data_inicio,
    data_inicio: item.data_inicio,
    data_fim: item.data_fim,
  }));
}

export const getAttendanceCalculationStartDate = (
  dataAdmissao,
  globalCutoff = ATTENDANCE_GLOBAL_CUTOFF,
) => {
  const cutoffDate = parseLocalDate(globalCutoff);
  const admissionDate = parseLocalDate(dataAdmissao);

  if (!cutoffDate && !admissionDate) return "";
  if (!cutoffDate) return formatDateKey(admissionDate);
  if (!admissionDate) return formatDateKey(cutoffDate);

  return formatDateKey(admissionDate > cutoffDate ? admissionDate : cutoffDate);
};

export const getFeriados = (ano) => {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;

  const pascoa = new Date(ano, mesPascoa, diaPascoa);
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  const carnaval = new Date(pascoa);
  carnaval.setDate(pascoa.getDate() - 47);
  const corpoDeus = new Date(pascoa);
  corpoDeus.setDate(pascoa.getDate() + 60);

  return [
    { d: 1, m: 0, nome: "Ano Novo" },
    { d: carnaval.getDate(), m: carnaval.getMonth(), nome: "Carnaval" },
    { d: sextaSanta.getDate(), m: sextaSanta.getMonth(), nome: "Sexta-feira Santa" },
    { d: pascoa.getDate(), m: pascoa.getMonth(), nome: "Pascoa" },
    { d: 25, m: 3, nome: "Dia da Liberdade" },
    { d: 1, m: 4, nome: "Dia do Trabalhador" },
    { d: corpoDeus.getDate(), m: corpoDeus.getMonth(), nome: "Corpo de Deus" },
    { d: 10, m: 5, nome: "Dia de Portugal" },
    { d: 15, m: 7, nome: "Assuncao de N. Senhora" },
    { d: 7, m: 8, nome: "Feriado de Faro" },
    { d: 5, m: 9, nome: "Implantacao da Republica" },
    { d: 1, m: 10, nome: "Todos os Santos" },
    { d: 1, m: 11, nome: "Restauracao da Independencia" },
    { d: 8, m: 11, nome: "Imaculada Conceicao" },
    { d: 25, m: 11, nome: "Natal" },
  ];
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const isHoliday = (date) => {
  const feriados = getFeriados(date.getFullYear());
  return feriados.some((f) => f.d === date.getDate() && f.m === date.getMonth());
};

export const calcularDiasUteis = (dataInicio, dataFim, skipDates = null) => {
  const inicio = parseLocalDate(dataInicio);
  const fim = parseLocalDate(dataFim || dataInicio);

  if (!inicio || !fim || inicio > fim) return 0;

  let count = 0;
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (!isWeekend(d) && !isHoliday(d) && (!skipDates || !skipDates.has(formatDateKey(d)))) count += 1;
  }

  return count;
};

export const calcularDiasUteisNoPeriodo = (
  dataInicio,
  dataFim,
  periodoInicio,
  periodoFim,
  skipDates = null,
) => {
  const inicio = parseLocalDate(dataInicio);
  const fim = parseLocalDate(dataFim || dataInicio);
  const inicioPeriodo = parseLocalDate(periodoInicio);
  const fimPeriodo = parseLocalDate(periodoFim);

  if (!inicio || !fim || !inicioPeriodo || !fimPeriodo || inicio > fim || inicioPeriodo > fimPeriodo) {
    return 0;
  }

  const inicioFinal = inicio < inicioPeriodo ? inicioPeriodo : inicio;
  const fimFinal = fim > fimPeriodo ? fimPeriodo : fim;

  if (inicioFinal > fimFinal) return 0;

  return calcularDiasUteis(inicioFinal, fimFinal, skipDates);
};

export const calcularDiasUteisNoMes = (dataInicio, dataFim, ano, mes, skipDates = null) => {
  const inicioMes = new Date(ano, mes, 1);
  const fimMes = new Date(ano, mes + 1, 0);

  return calcularDiasUteisNoPeriodo(dataInicio, dataFim, inicioMes, fimMes, skipDates);
};

export const getYearsInRange = (dataInicio, dataFim) => {
  const inicio = parseLocalDate(dataInicio);
  const fim = parseLocalDate(dataFim || dataInicio);

  if (!inicio || !fim || inicio > fim) return [];

  const years = [];
  for (let year = inicio.getFullYear(); year <= fim.getFullYear(); year += 1) {
    years.push(year);
  }

  return years;
};

const clampRangeToYear = (dataInicio, dataFim, ano) => {
  const inicio = parseLocalDate(dataInicio);
  const fim = parseLocalDate(dataFim || dataInicio);

  if (!inicio || !fim || inicio > fim) return null;

  const inicioAno = new Date(ano, 0, 1);
  const fimAno = new Date(ano, 11, 31);

  const inicioFinal = inicio < inicioAno ? inicioAno : inicio;
  const fimFinal = fim > fimAno ? fimAno : fim;

  if (inicioFinal > fimFinal) return null;

  return { inicio: inicioFinal, fim: fimFinal };
};

export const calcularDiasFeriasNoAno = (dataInicio, dataFim, ano, skipDates = null) => {
  const intervaloAno = clampRangeToYear(dataInicio, dataFim, ano);
  if (!intervaloAno) return 0;

  return calcularDiasUteis(intervaloAno.inicio, intervaloAno.fim, skipDates);
};

export const getCurrentYear = () => new Date().getFullYear();

export async function obterSaldoFeriasAno({
  supabaseClient,
  userId,
  ano = getCurrentYear(),
  excluirPedidoId = null,
  diasLimiteAnual = ANNUAL_VACATION_DAYS,
  tolerancias = [],
}) {
  const inicioAno = `${ano}-01-01`;
  const fimAno = `${ano}-12-31`;

  const { data, error } = await supabaseClient
    .from("ferias")
    .select("id, tipo, data_inicio, data_fim, is_parcial")
    .eq("user_id", userId)
    .eq("estado", "aprovado")
    .lte("data_inicio", fimAno)
    .gte("data_fim", inicioAno);

  if (error) throw error;

  const diasLimite = resolveAnnualVacationLimit(diasLimiteAnual);
  const skipDates = buildToleranciasSkipSet(tolerancias, userId);

  let diasConsumidos = 0;
  for (const pedido of data || []) {
    if (excluirPedidoId && pedido.id === excluirPedidoId) continue;
    if (pedido.is_parcial || !isVacationType(pedido.tipo)) continue;

    diasConsumidos += calcularDiasFeriasNoAno(
      pedido.data_inicio,
      pedido.data_fim || pedido.data_inicio,
      ano,
      skipDates,
    );
  }

  return {
    ano,
    diasConsumidos,
    diasLimite,
    diasRestantes: Math.max(0, diasLimite - diasConsumidos),
  };
}

export async function validarSaldoFeriasParaIntervalo({
  supabaseClient,
  userId,
  dataInicio,
  dataFim,
  excluirPedidoId = null,
  diasLimiteAnual = ANNUAL_VACATION_DAYS,
  tolerancias = [],
}) {
  const anos = getYearsInRange(dataInicio, dataFim || dataInicio);
  const skipDates = buildToleranciasSkipSet(tolerancias, userId);
  const detalhes = [];

  for (const ano of anos) {
    const diasPedidoNoAno = calcularDiasFeriasNoAno(dataInicio, dataFim || dataInicio, ano, skipDates);
    if (diasPedidoNoAno <= 0) continue;

    const saldoAno = await obterSaldoFeriasAno({
      supabaseClient,
      userId,
      ano,
      excluirPedidoId,
      diasLimiteAnual,
      tolerancias,
    });

    const detalhe = {
      ano,
      diasPedidoNoAno,
      diasDisponiveis: saldoAno.diasRestantes,
    };
    detalhes.push(detalhe);

    if (diasPedidoNoAno > saldoAno.diasRestantes) {
      return {
        ok: false,
        ...detalhe,
        detalhes,
      };
    }
  }

  return { ok: true, detalhes };
}

export async function sincronizarSaldoFeriasPerfil({
  supabaseClient,
  userId,
  ano = getCurrentYear(),
  diasLimiteAnual = ANNUAL_VACATION_DAYS,
  tolerancias = null,
}) {
  const toleranciasAtivas = Array.isArray(tolerancias)
    ? tolerancias
    : await obterToleranciasAtivas({ supabaseClient, userId });

  const saldo = await obterSaldoFeriasAno({
    supabaseClient,
    userId,
    ano,
    diasLimiteAnual,
    tolerancias: toleranciasAtivas,
  });

  const { error } = await supabaseClient
    .from("profiles")
    .update({ dias_ferias: saldo.diasRestantes })
    .eq("id", userId);

  if (error) throw error;

  return saldo;
}
