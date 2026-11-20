// =====================================================================
// Férias, ausências e dias úteis — regras de negócio dos RH.
// Usado por Ausências, RH, AprovarPedido, CalendarioColaborador, WidgetCalendar,
// decisaoPedido e PDFs de RH.
//
// Tabelas: `ferias` (pedidos de ausência, tolerâncias e pedidos de km, distinguidos
// por `tipo`), `vacation_balances` (saldo anual por user_id+ano), `profiles`
// (data_admissao, dias_ferias_total; `dias_ferias` é o campo antigo).
//
// Regras principais:
//  - 22 dias por ano; no ano de admissão, ver calcularFeriasAnoAdmissao.
//  - Dias não gozados transitam para o ano seguinte e expiram a 31 de março.
//  - Parciais contam horas/8. Fins de semana, feriados (getFeriados) e tolerâncias não contam.
//  - Se `vacation_balances` não existir (migração antiga), cai para cálculos sobre `ferias`.
// =====================================================================
import { uuidSeguro } from "./filtroSeguro";

/** Dias de férias por ano completo de trabalho. */
export const ANNUAL_VACATION_DAYS = 22;
/** Data a partir da qual a assiduidade é contabilizada (antes disto não havia registos fiáveis). */
export const ATTENDANCE_GLOBAL_CUTOFF = "2026-03-01";
/** Tipo canónico em `ferias.tipo` para tolerâncias de ponto (user_id null = para todos). */
export const TOLERANCIA_TIPO = "Tolerância de Ponto";
export const TOLERANCIA_TIPOS = [
  TOLERANCIA_TIPO,
  "Tolerancia de Ponto",
  "tolerancia",
  "tolerância",
];

/** Número positivo recebido, ou 22 se inválido/vazio. */
export const resolveAnnualVacationLimit = (value) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  return ANNUAL_VACATION_DAYS;
};

export const getAnnualVacationLimitFromProfile = (profile = null) =>
  resolveAnnualVacationLimit(profile?.dias_ferias_total ?? profile?.dias_ferias);

/**
 * Limite de dias para um ano concreto:
 * antes do ano de admissão → 0; ano de admissão → `diasLimiteAnual` (definido nos RH);
 * anos seguintes → 22.
 * @param {{ diasLimiteAnual: number, dataAdmissao?: string|null, ano?: number }} p
 * @returns {number}
 */
export const getAnnualVacationLimitForYear = ({
  diasLimiteAnual,
  dataAdmissao = null,
  ano = getCurrentYear(),
}) => {
  const anoAdmissao = parseLocalDate(dataAdmissao)?.getFullYear();
  // Antes de entrar na empresa não há direito a férias (evita "transitar" dias de anos em que não trabalhava)
  if (anoAdmissao && ano < anoAdmissao) return 0;
  if (anoAdmissao && anoAdmissao !== ano) return ANNUAL_VACATION_DAYS;
  return resolveAnnualVacationLimit(diasLimiteAnual);
};

const removeAccents = (value = "") =>
  String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Tipo de ausência sem acentos, minúsculas e sem espaços nas pontas (para comparar). */
export const normalizeAbsenceType = (tipo = "") =>
  removeAccents(tipo).trim().toLowerCase();

/** Tipos que podem ser "estado temporário" do colaborador (ex.: de baixa, de licença). */
export const COLLABORATOR_STATUS_TYPES = [
  "Férias",
  "Assistência à família",
  "Outros - Assuntos pessoais",
  "Ausência sem motivo - injustificada",
  "Doença, acidente e obrigação legal",
  "Casamento",
  "Deslocação a estabelecimento de ensino",
  "Licença maternal/paternal",
  "Licença sem vencimento",
  "Falecimento de familiar",
  "Prestação de provas de avaliação",
  "Candidato a cargo público",
];

export const isCollaboratorStatusType = (tipo = "") => {
  const normalized = normalizeAbsenceType(tipo);
  return COLLABORATOR_STATUS_TYPES.some((statusType) => normalizeAbsenceType(statusType) === normalized);
};

/** O tipo é de férias? (qualquer variante que contenha "ferias", com ou sem acento) */
export const isVacationType = (tipo = "") =>
  normalizeAbsenceType(tipo).includes("ferias");

export const formatAbsenceTypeLabel = (tipo = "") => {
  const trimmed = String(tipo ?? "").trim();
  if (!trimmed) return "";

  return isVacationType(trimmed) ? "Férias" : trimmed;
};

/**
 * "AAAA-MM-DD" (ou Date) → Date à meia-noite LOCAL. Evita o desvio de fuso de
 * `new Date("AAAA-MM-DD")`, que é interpretado em UTC.
 * @returns {Date|null}
 */
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

/** Date/string → "AAAA-MM-DD" local ("" se inválida). */
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

/**
 * Tolerâncias de ponto não canceladas/rejeitadas (linhas de `ferias` com tipo de tolerância).
 * Com userId: só as globais (user_id null) e as desse utilizador.
 * @returns {Promise<Array<{ id, user_id, nome, data, data_inicio, data_fim }>>}
 * @throws erro do Supabase
 */
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
    query = query.or(`user_id.is.null,user_id.eq.${uuidSeguro(userId)}`);
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

/** Início da contagem de assiduidade: a mais tardia entre a admissão e ATTENDANCE_GLOBAL_CUTOFF. */
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

/**
 * Feriados de um ano: nacionais + Carnaval (tolerância habitual) + feriado municipal
 * de Faro (7 de setembro). Páscoa pelo algoritmo de Meeus/Butcher.
 * @param {number} ano
 * @returns {Array<{ d: number, m: number, nome: string }>} m é 0-based (como Date)
 */
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

/**
 * Férias do ano de admissão (regra dos RH da Bizin):
 *  - mês de entrada: 2 dias se entra no 1.º dia útil do mês (ou antes dele, ex. num fim de semana);
 *    1 dia se entra até dia 15; 0 dias se entra depois do dia 15;
 *  - cada mês seguinte até dezembro: 2 dias;
 *  - no máximo 20 dias.
 * Devolve null se a data não for válida.
 * Nos anos seguintes ao da admissão aplicam-se os 22 dias (ANNUAL_VACATION_DAYS).
 *
 * Exemplos: admissão 2026-03-02 (1.º dia útil de março) → 2 + 2×9 = 20;
 *           2026-09-10 → 1 + 2×3 = 7; 2026-11-20 → 0 + 2×1 = 2.
 * Só é usada para SUGERIR o valor no painel de RH (RecursosHumanos.jsx); o valor
 * efetivo é o que os RH gravam em profiles.dias_ferias_total.
 * @param {string|Date} dataAdmissao
 * @returns {number|null}
 */
export const calcularFeriasAnoAdmissao = (dataAdmissao) => {
  const d = parseLocalDate(dataAdmissao);
  if (!d) return null;
  const ano = d.getFullYear();
  const mes = d.getMonth();
  const primeiroUtil = new Date(ano, mes, 1);
  while (isWeekend(primeiroUtil) || isHoliday(primeiroUtil)) primeiroUtil.setDate(primeiroUtil.getDate() + 1);
  const dia = d.getDate();
  const diasMesEntrada = dia <= primeiroUtil.getDate() ? 2 : dia <= 15 ? 1 : 0;
  return Math.min(20, diasMesEntrada + 2 * (11 - mes));
};

/**
 * Dias úteis entre duas datas (inclusive), sem fins de semana, feriados e `skipDates`.
 * @param {string|Date} dataInicio
 * @param {string|Date} [dataFim] por omissão = dataInicio
 * @param {Set<string>|null} [skipDates] chaves "AAAA-MM-DD" (ver buildToleranciasSkipSet)
 * @returns {number}
 */
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

/** Dias úteis da interseção entre [dataInicio, dataFim] e [periodoInicio, periodoFim]. */
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

/** Dias úteis do intervalo que caem no mês `mes` (0-based) de `ano`. */
export const calcularDiasUteisNoMes = (dataInicio, dataFim, ano, mes, skipDates = null) => {
  const inicioMes = new Date(ano, mes, 1);
  const fimMes = new Date(ano, mes + 1, 0);

  return calcularDiasUteisNoPeriodo(dataInicio, dataFim, inicioMes, fimMes, skipDates);
};

/** Anos civis tocados pelo intervalo (ex.: 2026-12-28 a 2027-01-03 → [2026, 2027]). */
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

/** Dias úteis do intervalo que pertencem ao ano `ano` (pedidos que atravessam o ano). */
export const calcularDiasFeriasNoAno = (dataInicio, dataFim, ano, skipDates = null) => {
  const intervaloAno = clampRangeToYear(dataInicio, dataFim, ano);
  if (!intervaloAno) return 0;

  return calcularDiasUteis(intervaloAno.inicio, intervaloAno.fim, skipDates);
};

export const getCurrentYear = () => new Date().getFullYear();

/**
 * Marcar férias do ano seguinte só é permitido a partir de 1 de dezembro.
 * @returns {boolean} true se o pedido é para um ano futuro e ainda não abriu
 */
export const isVacationBookingBeforeAnnualOpening = (
  dataInicio,
  dataReferencia = new Date(),
) => {
  const inicio = parseLocalDate(dataInicio);
  const referencia = parseLocalDate(dataReferencia);
  if (!inicio || !referencia) return false;

  const abertura = new Date(referencia.getFullYear(), 11, 1);
  return inicio.getFullYear() > referencia.getFullYear() && referencia < abertura;
};

/** Já estamos em dezembro (mostrar também o saldo do ano seguinte nos RH)? */
export const isAnnualVacationOpeningAvailable = (dataReferencia = new Date()) => {
  const referencia = parseLocalDate(dataReferencia);
  if (!referencia) return false;

  return referencia >= new Date(referencia.getFullYear(), 11, 1);
};

const getFirstDayOfYear = (ano) => `${ano}-01-01`;
const getLastDayOfYear = (ano) => `${ano}-12-31`;
const getCarryoverDeadline = (ano) => `${ano}-03-31`;

const getPedidoDays = (pedido, ano, skipDates) => {
  if (!isVacationType(pedido.tipo)) return 0;

  if (pedido.is_parcial) {
    const anoPedido = parseLocalDate(pedido.data_inicio)?.getFullYear();
    if (anoPedido !== ano || !pedido.hora_inicio || !pedido.hora_fim) return 0;

    const [hInicio, mInicio] = pedido.hora_inicio.split(":").map(Number);
    const [hFim, mFim] = pedido.hora_fim.split(":").map(Number);
    const diferencaHoras = (hFim - hInicio) + ((mFim - mInicio) / 60);
    return diferencaHoras > 0 ? diferencaHoras / 8 : 0;
  }

  return calcularDiasFeriasNoAno(
    pedido.data_inicio,
    pedido.data_fim || pedido.data_inicio,
    ano,
    skipDates,
  );
};

const getPedidoDaysBeforeCarryoverDeadline = (pedido, ano, skipDates) => {
  if (pedido.is_parcial) {
    const dataPedido = parseLocalDate(pedido.data_inicio);
    if (!dataPedido || dataPedido.getFullYear() !== ano || dataPedido > parseLocalDate(getCarryoverDeadline(ano))) {
      return 0;
    }

    const [hInicio, mInicio] = String(pedido.hora_inicio || "").split(":").map(Number);
    const [hFim, mFim] = String(pedido.hora_fim || "").split(":").map(Number);
    const diferencaHoras = (hFim - hInicio) + ((mFim - mInicio) / 60);
    return diferencaHoras > 0 ? diferencaHoras / 8 : 0;
  }

  return calcularDiasUteisNoPeriodo(
    pedido.data_inicio,
    pedido.data_fim || pedido.data_inicio,
    getFirstDayOfYear(ano),
    getCarryoverDeadline(ano),
    skipDates,
  );
};

async function obterPedidosFeriasAno({
  supabaseClient,
  userId,
  ano,
  incluirPendentes = false,
}) {
  const { data, error } = await supabaseClient
    .from("ferias")
    .select("id, tipo, data_inicio, data_fim, is_parcial, hora_inicio, hora_fim, estado")
    .eq("user_id", userId)
    .in("estado", incluirPendentes ? ["aprovado", "pendente"] : ["aprovado"])
    .lte("data_inicio", getLastDayOfYear(ano))
    .gte("data_fim", getFirstDayOfYear(ano));

  if (error) throw error;
  return data || [];
}

/**
 * Saldo calculado só a partir dos pedidos APROVADOS em `ferias` (sem transitados).
 * Nota: o parâmetro `dataAdmissao` é aceite mas não é usado aqui.
 * @returns {Promise<{ ano, diasConsumidos, diasLimite, diasRestantes }>}
 */
export async function obterSaldoFeriasAno({
  supabaseClient,
  userId,
  ano = getCurrentYear(),
  excluirPedidoId = null,
  diasLimiteAnual = ANNUAL_VACATION_DAYS,
  dataAdmissao = null,
  tolerancias = [],
}) {
  const diasLimite = resolveAnnualVacationLimit(diasLimiteAnual);
  const skipDates = buildToleranciasSkipSet(tolerancias, userId);
  const data = await obterPedidosFeriasAno({ supabaseClient, userId, ano });
  const diasConsumidos = data
    .filter((pedido) => !excluirPedidoId || pedido.id !== excluirPedidoId)
    .reduce((total, pedido) => total + getPedidoDays(pedido, ano, skipDates), 0);

  return {
    ano,
    diasConsumidos,
    diasLimite,
    diasRestantes: Math.max(0, diasLimite - diasConsumidos),
  };
}

const isMissingVacationBalanceTableError = (error) =>
  error?.code === "42P01" || /relation .*vacation_balances.* does not exist/i.test(error?.message || "");

async function obterSaldoFeriasTabela({ supabaseClient, userId, ano }) {
  const { data, error } = await supabaseClient
    .from("vacation_balances")
    .select("ano, dias_atribuidos, dias_transitados, dias_gozados, dias_disponiveis, transito_expira_em")
    .eq("user_id", userId)
    .eq("ano", ano)
    .maybeSingle();

  if (error) {
    if (isMissingVacationBalanceTableError(error)) return null;
    throw error;
  }

  return data;
}

/**
 * Saldo de um ano para mostrar ao utilizador, incluindo dias transitados do ano anterior
 * (válidos só até 31 de março do próprio ano).
 * 1) Se houver linha em `vacation_balances` para o ano, é a fonte de verdade.
 * 2) Senão, calcula a partir de `ferias` e só transita dias de um saldo REAL do ano anterior.
 * @returns {Promise<{ ano, diasLimite, diasConsumidos, diasRestantes, diasTransitados, diasDisponiveis }>}
 */
export async function obterSaldoFeriasAnoComTransicao({
  supabaseClient,
  userId,
  ano = getCurrentYear(),
  diasLimiteAnual = ANNUAL_VACATION_DAYS,
  dataAdmissao = null,
  tolerancias = [],
  dataReferencia = new Date(),
}) {
  const saldoTabela = await obterSaldoFeriasTabela({ supabaseClient, userId, ano });
  if (saldoTabela) {
    const referencia = parseLocalDate(dataReferencia);
    const transitoValido = referencia
      && referencia.getFullYear() === ano
      && referencia <= parseLocalDate(getCarryoverDeadline(ano));
    const diasTransitados = transitoValido ? Number(saldoTabela.dias_transitados) || 0 : 0;
    const diasLimite = Number(saldoTabela.dias_atribuidos) || ANNUAL_VACATION_DAYS;
    const diasConsumidos = Number(saldoTabela.dias_gozados) || 0;

    return {
      ano,
      diasLimite,
      diasConsumidos,
      diasRestantes: Math.max(0, diasLimite - diasConsumidos),
      diasTransitados,
      diasDisponiveis: Math.max(0, diasLimite + diasTransitados - diasConsumidos),
    };
  }

  const saldoAno = await obterSaldoFeriasAno({
    supabaseClient,
    userId,
    ano,
    diasLimiteAnual: getAnnualVacationLimitForYear({ diasLimiteAnual, dataAdmissao, ano }),
    tolerancias,
  });

  // Só transitam dias de um saldo REAL do ano anterior (nunca de anos estimados)
  const hoje = parseLocalDate(dataReferencia);
  const saldoAnoAnterior = await obterSaldoFeriasTabela({ supabaseClient, userId, ano: ano - 1 });
  const diasTransitados = saldoAnoAnterior && hoje && hoje.getFullYear() === ano && hoje <= parseLocalDate(getCarryoverDeadline(ano))
    ? Math.max(0, Number(saldoAnoAnterior.dias_disponiveis) || 0)
    : 0;

  return {
    ...saldoAno,
    diasTransitados,
    diasDisponiveis: saldoAno.diasRestantes + diasTransitados,
  };
}

/**
 * Valida se um pedido de férias cabe no saldo, ano a ano (um pedido pode atravessar o ano).
 * Conta aprovados + pendentes (excepto `excluirPedidoId`, o próprio pedido ao aprovar/editar).
 * Os transitados só entram se o pedido (ou consumos) cair até 31 de março.
 * Se `vacation_balances` disser dias_disponiveis <= 0, recusa logo.
 * @returns {Promise<{ ok: boolean, ano?, diasPedidoNoAno?, diasDisponiveis?, diasTransitados?, detalhes: object[] }>}
 *   quando ok=false, os campos do topo são os do ano que falhou
 */
export async function validarSaldoFeriasParaIntervalo({
  supabaseClient,
  userId,
  dataInicio,
  dataFim,
  is_parcial = false, // ADICIONADO
  hora_inicio = null, // ADICIONADO
  hora_fim = null,    // ADICIONADO
  excluirPedidoId = null,
  diasLimiteAnual = ANNUAL_VACATION_DAYS,
  dataAdmissao = null,
  tolerancias = [],
}) {
  const anos = getYearsInRange(dataInicio, dataFim || dataInicio);
  const skipDates = buildToleranciasSkipSet(tolerancias, userId);
  const detalhes = [];

  for (const ano of anos) {
    // NOVA LÓGICA: Calcular o valor exato do pedido atual
    let diasPedidoNoAno = 0;
    if (is_parcial) {
      const anoPedido = new Date(dataInicio).getFullYear();
      if (anoPedido === ano && hora_inicio && hora_fim) {
        const [hI, mI] = hora_inicio.split(':').map(Number);
        const [hF, mF] = hora_fim.split(':').map(Number);
        const diferenca = (hF - hI) + ((mF - mI) / 60);
        if (diferenca > 0) diasPedidoNoAno = diferenca / 8;
      }
    } else {
      diasPedidoNoAno = calcularDiasFeriasNoAno(dataInicio, dataFim || dataInicio, ano, skipDates);
    }

    if (diasPedidoNoAno <= 0) continue;

    const saldoAno = await obterSaldoFeriasAno({
      supabaseClient,
      userId,
      ano,
      excluirPedidoId,
      diasLimiteAnual: getAnnualVacationLimitForYear({ diasLimiteAnual, dataAdmissao, ano }),
      tolerancias,
    });
    const saldoTabela = await obterSaldoFeriasTabela({ supabaseClient, userId, ano });
    const diasDisponiveisTabela = Number(saldoTabela?.dias_disponiveis);
    if (saldoTabela && Number.isFinite(diasDisponiveisTabela) && diasDisponiveisTabela <= 0) {
      const detalheSemSaldo = {
        ano,
        diasPedidoNoAno,
        diasDisponiveis: 0,
        diasTransitados: 0,
      };
      detalhes.push(detalheSemSaldo);
      return {
        ok: false,
        ...detalheSemSaldo,
        detalhes,
      };
    }
    const diasLimiteAno = Number(saldoTabela?.dias_atribuidos)
      || getAnnualVacationLimitForYear({ diasLimiteAnual, dataAdmissao, ano });

    const pedidosAno = await obterPedidosFeriasAno({
      supabaseClient,
      userId,
      ano,
      incluirPendentes: true,
    });
    const diasPendentes = pedidosAno
      .filter((pedido) => pedido.estado === "pendente")
      .filter((pedido) => !excluirPedidoId || pedido.id !== excluirPedidoId)
      .reduce((total, pedido) => total + getPedidoDays(pedido, ano, skipDates), 0);
    const diasConsumidosAntesDoPrazo = pedidosAno
      .filter((pedido) => pedido.estado === "aprovado")
      .filter((pedido) => !excluirPedidoId || pedido.id !== excluirPedidoId)
      .reduce(
        (total, pedido) => total + getPedidoDaysBeforeCarryoverDeadline(pedido, ano, skipDates),
        0,
      );

    const diasPedidoAntesDoPrazo = calcularDiasUteisNoPeriodo(
      dataInicio,
      dataFim || dataInicio,
      getFirstDayOfYear(ano),
      getCarryoverDeadline(ano),
      skipDates,
    );

    let diasTransitados = 0;
    if (saldoTabela && (diasConsumidosAntesDoPrazo + diasPedidoAntesDoPrazo) > 0) {
      diasTransitados = Number(saldoTabela.dias_transitados) || 0;
    } else if ((diasConsumidosAntesDoPrazo + diasPedidoAntesDoPrazo) > 0) {
      // Só transitam dias de um saldo REAL do ano anterior (nunca de anos estimados)
      const saldoAnoAnterior = await obterSaldoFeriasTabela({ supabaseClient, userId, ano: ano - 1 });
      diasTransitados = Math.max(0, Number(saldoAnoAnterior?.dias_disponiveis) || 0);
    }

    const diasDisponiveis = Math.max(
      0,
      diasLimiteAno + diasTransitados - saldoAno.diasConsumidos - diasPendentes,
    );

    const detalhe = {
      ano,
      diasPedidoNoAno,
      diasDisponiveis,
      diasTransitados,
    };
    detalhes.push(detalhe);

    if (diasPedidoNoAno > diasDisponiveis) {
      return {
        ok: false,
        ...detalhe,
        detalhes,
      };
    }
  }

  return { ok: true, detalhes };
}

/**
 * Recalcula e grava (upsert) a linha de `vacation_balances` do utilizador para `ano`.
 * Chamar depois de aprovar/cancelar/editar férias. Se a tabela não existir, grava
 * `profiles.dias_ferias` (modelo antigo).
 * Efeitos: upsert em vacation_balances (onConflict user_id,ano); pode ler profiles.data_admissao.
 * @returns {Promise<object>} o saldo calculado (ver obterSaldoFeriasAno)
 */
export async function sincronizarSaldoFeriasPerfil({
  supabaseClient,
  userId,
  ano = getCurrentYear(),
  diasLimiteAnual = ANNUAL_VACATION_DAYS,
  dataAdmissao = null,
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

  // Data de admissão: se não vier, lê do perfil (o painel de RH não a passava)
  let admissao = dataAdmissao;
  if (!admissao) {
    const { data: perfil } = await supabaseClient.from("profiles").select("data_admissao").eq("id", userId).maybeSingle();
    admissao = perfil?.data_admissao || null;
  }
  const anoAdmissao = parseLocalDate(admissao)?.getFullYear() || null;

  const diasLimite = getAnnualVacationLimitForYear({ diasLimiteAnual, dataAdmissao: admissao, ano });
  const saldoExistente = await obterSaldoFeriasTabela({ supabaseClient, userId, ano });

  // Dias atribuídos:
  //  - ano de admissão → o "limite anual" definido nos RH (atualiza se for alterado);
  //  - anos anteriores à admissão → 0;
  //  - restantes → mantém o que já estava gravado (ou o limite, se ainda não houver saldo).
  let diasAtribuidos;
  if (anoAdmissao && ano < anoAdmissao) diasAtribuidos = 0;
  else if (anoAdmissao && ano === anoAdmissao) diasAtribuidos = resolveAnnualVacationLimit(diasLimiteAnual);
  else diasAtribuidos = saldoExistente?.dias_atribuidos ?? diasLimite;

  // Dias transitados: só de um saldo REAL do ano anterior; nunca no ano de admissão.
  let diasTransitados = Number(saldoExistente?.dias_transitados) || 0;
  if (anoAdmissao && ano <= anoAdmissao) {
    diasTransitados = 0;
  } else if (!saldoExistente && ano > 1) {
    const saldoAnoAnterior = await obterSaldoFeriasTabela({ supabaseClient, userId, ano: ano - 1 });
    diasTransitados = Math.max(0, Number(saldoAnoAnterior?.dias_disponiveis) || 0);
  }

  const { error } = await supabaseClient
    .from("vacation_balances")
    .upsert({
      user_id: userId,
      ano,
      dias_atribuidos: diasAtribuidos,
      dias_transitados: diasTransitados,
      dias_gozados: saldo.diasConsumidos,
      transito_expira_em: `${ano + 1}-03-31`,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "user_id,ano" });

  if (error && !isMissingVacationBalanceTableError(error)) throw error;
  if (error && isMissingVacationBalanceTableError(error)) {
    const { error: legacyError } = await supabaseClient
      .from("profiles")
      .update({ dias_ferias: saldo.diasRestantes })
      .eq("id", userId);
    if (legacyError) throw legacyError;
  }

  return saldo;
}
