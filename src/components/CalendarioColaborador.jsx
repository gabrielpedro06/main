import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import "../styles/calendario-colaborador.css";
import {
  calcularDiasUteis,
  calcularDiasUteisNoMes,
  buildToleranciasSkipSet,
  formatAbsenceTypeLabel,
  getAnnualVacationLimitFromProfile,
  getAttendanceCalculationStartDate,
  getFeriados,
  isCollaboratorStatusType,
  isVacationType,
  normalizeAbsenceType,
  parseLocalDate,
  sincronizarSaldoFeriasPerfil,
} from "../utils/feriasSaldo";

export default function CalendarioColaborador({
  userId,
  userName = "Colaborador",
  dataAdmissao = null,
  estadoTemporario = null,
  onVacationBalanceUpdated = null,
  onMonthChange = null,
}) {
  const KM_REQUEST_TYPE = "Pedido de Km's";
  const TOLERANCIA_TIPO = "Tolerância de Ponto";

  const [dataAtual, setDataAtual] = useState(new Date());
  const [diasDoMes, setDiasDoMes] = useState([]);
  const [assiduidade, setAssiduidade] = useState([]);
  const [ausencias, setAusencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diaSelected, setDiaSelected] = useState(null);
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState({ show: false, type: "success", message: "" });
  const [toleranciaLoading, setToleranciaLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    hora_entrada: "09:00",
    hora_saida: "18:00",
    tempo_pausa: "0",
    observacoes: "",
  });

  // Estado para modal de apagar assiduidade
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 💡 NOVO: Estados para preenchimento em lote do mês
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const mesAtual = dataAtual.getMonth();
  const anoAtual = dataAtual.getFullYear();
  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

  const timeToSeconds = (value) => {
    if (!value) return null;
    const [h = "0", m = "0", s = "0"] = String(value).split(":");
    const hh = Number(h) || 0;
    const mm = Number(m) || 0;
    const ss = Number(s) || 0;
    return hh * 3600 + mm * 60 + ss;
  };

  const formatDurationFromSeconds = (seconds) => {
    const safe = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatMinutesFromSeconds = (seconds) => Math.floor((Number(seconds) || 0) / 60);

  const toLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isToleranceType = (tipo = "") => normalizeAbsenceType(tipo).includes("tolerancia");

  const getEstadoTemporarioAtivoNoDia = (dataStr) => {
    const tipo = String(estadoTemporario?.tipo || "").trim();
    if (!tipo || !isCollaboratorStatusType(tipo) || !estadoTemporario?.data_inicio) return null;

    const dataDia = parseLocalDate(dataStr);
    const dataInicio = parseLocalDate(estadoTemporario.data_inicio);
    const dataFim = parseLocalDate(estadoTemporario.data_fim || estadoTemporario.data_inicio);

    if (!dataDia || !dataInicio || !dataFim) return null;
    if (dataDia < dataInicio || dataDia > dataFim) return null;

    return {
      id: `estado-temporario-${dataStr}`,
      user_id: userId,
      tipo,
      motivo: estadoTemporario.motivo || "",
      data_inicio: estadoTemporario.data_inicio,
      data_fim: estadoTemporario.data_fim || estadoTemporario.data_inicio,
      is_parcial: false,
      estado: "aprovado",
    };
  };

  const getTemporaryStatusStyle = (tipo = "") => {
    const normalized = normalizeAbsenceType(tipo);
    if (isVacationType(normalized)) {
      return { cor: "#fefce8", textoCor: "#854d0e", badge: "Férias" };
    }

    if (normalized.includes("licenca")) {
      return { cor: "#eff6ff", textoCor: "#1d4ed8", badge: "Licença" };
    }

    if (normalized.includes("doenca") || normalized.includes("acidente") || normalized.includes("obrigacao legal")) {
      return { cor: "#faf5ff", textoCor: "#6b21a8", badge: "Baixa" };
    }

    if (normalized.includes("casamento") || normalized.includes("falecimento")) {
      return { cor: "#fff7ed", textoCor: "#c2410c", badge: formatAbsenceTypeLabel(tipo) };
    }

    return { cor: "#f0f9ff", textoCor: "#0c4a6e", badge: formatAbsenceTypeLabel(tipo) };
  };

  const isMissingColumnError = (error) => {
    if (!error) return false;
    return error.code === "42703" || /column .* does not exist/i.test(error.message || "");
  };

  // Ícones inline para facilitar
  const Icons = {
    Activity: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
    Calendar: ({ size = 14, color = "currentColor" }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    ),
  };

  async function atualizarSaldoFeriasLegacy(data, movimento, excludeToleranceId = null) {
    let query = supabase
      .from("ferias")
      .select("id")
      .in("tipo", ["Tolerância de Ponto", "Tolerancia de Ponto", "tolerancia", "tolerância"])
      .neq("estado", "cancelado")
      .neq("estado", "rejeitado")
      .lte("data_inicio", data)
      .gte("data_fim", data)
      .or(`user_id.is.null,user_id.eq.${userId}`);

    if (excludeToleranceId) query = query.neq("id", excludeToleranceId);

    const { data: outrasTolerancias, error: toleranciaError } = await query;
    if (toleranciaError) throw toleranciaError;

    if ((outrasTolerancias || []).length > 0) return;

    const { data: feriasDia, error: feriasError } = await supabase
      .from("ferias")
      .select("id, tipo, is_parcial")
      .eq("user_id", userId)
      .eq("estado", "aprovado")
      .lte("data_inicio", data)
      .gte("data_fim", data);
    if (feriasError) throw feriasError;

    const temFerias = (feriasDia || []).some((pedido) => !pedido.is_parcial && isVacationType(pedido.tipo));
    if (!temFerias) return;

    const { data: profileAtual, error: profileError } = await supabase
      .from("profiles")
      .select("dias_ferias")
      .eq("id", userId)
      .single();
    if (profileError) throw profileError;

    const saldoAtual = Number(profileAtual?.dias_ferias) || 0;
    const delta = movimento === "add" ? 1 : -1;
    const novoSaldo = Math.max(0, saldoAtual + delta);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ dias_ferias: novoSaldo })
      .eq("id", userId);
    if (updateError) throw updateError;
  }

  async function sincronizarSaldoFeriasDoColaborador({ data, movimento, excludeToleranceId = null }) {
    let profile = null;
    let profileError = null;

    ({ data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("dias_ferias, dias_ferias_total")
      .eq("id", userId)
      .single());

    if (profileError && isMissingColumnError(profileError)) {
      ({ data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("dias_ferias")
        .eq("id", userId)
        .single());

      if (profileError) throw profileError;

      await atualizarSaldoFeriasLegacy(data, movimento, excludeToleranceId);
      return;
    }

    if (profileError) throw profileError;

    await sincronizarSaldoFeriasPerfil({
      supabaseClient: supabase,
      userId,
      diasLimiteAnual: getAnnualVacationLimitFromProfile(profile),
    });
  }

  // ====== CARREGA DADOS DO MÊS ======
  useEffect(() => {
    if (!userId) return;
    fetchDadosMes();
  }, [mesAtual, anoAtual, userId, dataAdmissao]);

  async function fetchDadosMes() {
    setLoading(true);
    const inicioMesStr = toLocalDateString(new Date(anoAtual, mesAtual, 1));
    const fimMesStr = toLocalDateString(new Date(anoAtual, mesAtual + 1, 0));
    const dataInicioCalculo = getAttendanceCalculationStartDate(dataAdmissao);
    const inicioAssiduidadeConsulta = inicioMesStr < dataInicioCalculo ? dataInicioCalculo : inicioMesStr;

    try {
      const { data: assiduidadeData } = await supabase
        .from("assiduidade")
        .select("*")
        .eq("user_id", userId)
        .gte("data_registo", inicioAssiduidadeConsulta)
        .lte("data_registo", fimMesStr);

      const { data: ausenciasData } = await supabase
        .from("ferias")
        .select("*")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .neq("estado", "rejeitado")
        .neq("estado", "cancelado")
        .lte("data_inicio", fimMesStr)
        .gte("data_fim", inicioMesStr);

      const ausenciasReais = (ausenciasData || []).filter((a) => a.tipo !== KM_REQUEST_TYPE);

      setAssiduidade(assiduidadeData || []);
      setAusencias(ausenciasReais);

      construirCalendario(assiduidadeData || [], ausenciasReais);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }

    setLoading(false);
  }

  function construirCalendario(assidData, ausenciaData) {
    const diasTotais = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const diaInicio = new Date(anoAtual, mesAtual, 1).getDay();
    const dataInicioCalculo = getAttendanceCalculationStartDate(dataAdmissao);
    const diasVazios = Array(diaInicio).fill(null);
    const diasPreenchidos = Array.from({ length: diasTotais }, (_, i) => i + 1);


    // Pré-calcular feriados do mês
    const feriadosMes = getFeriados(anoAtual).filter((f) => f.m === mesAtual);

    const dias = [...diasVazios, ...diasPreenchidos].map((dia) => {
      if (!dia) return null;

      const dataStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const hojeStr = new Date().toISOString().split("T")[0];
      const diaSemana = new Date(anoAtual, mesAtual, dia).getDay();
      const isFimSemana = diaSemana === 0 || diaSemana === 6;

      const assidDia = assidData.find((a) => a.data_registo === dataStr);
      const estadoTemporarioDia = getEstadoTemporarioAtivoNoDia(dataStr);
      const estadoTemporarioBarra = estadoTemporarioDia && !isFimSemana
        ? getTemporaryStatusStyle(estadoTemporarioDia.tipo)
        : null;

      const ausenciasDia = ausenciaData.filter((a) => {
        const dataInicio = parseLocalDate(a.data_inicio);
        const dataFim = parseLocalDate(a.data_fim || a.data_inicio);
        const dataDia = parseLocalDate(dataStr);
        if (!dataInicio || !dataFim || !dataDia) return false;
        return dataDia >= dataInicio && dataDia <= dataFim;
      });

      const ausenciasDiaInteiras = ausenciasDia.filter((a) => !a.is_parcial);
      const ausenciasDiaParciais = ausenciasDia.filter((a) => a.is_parcial);
      const toleranciaDia = ausenciasDiaInteiras.find((a) => isToleranceType(a.tipo));

      // Novo: identificar feriado
      const feriadoObj = feriadosMes.find((f) => f.d === dia);
      const isFeriado = !!feriadoObj;

      let tipo = "normal";
      let cor = "#f8fafc";
      let textoCor = "#475569";
      let badge = "";

      if (isFeriado) {
        tipo = "feriado";
        cor = "#fef9c3";
        textoCor = "#b45309";
        badge = feriadoObj.nome || "Feriado";
      } else if (isFimSemana && !assidDia) {
        tipo = "fimSemana";
        cor = "#f1f5f9";
        textoCor = "#94a3b8";
        badge = "Fim de Semana";
      } else if (toleranciaDia) {
        tipo = "tolerancia";
        cor = "var(--color-borderColorLight)";
        textoCor = "var(--color-btnPrimaryHover)";
        badge = "Tolerância de Ponto";
      } else if (ausenciasDiaInteiras.length > 0) {
        tipo = "ausencia";
        const tipoAusencia = ausenciasDiaInteiras[0].tipo || "";
        const tipoNormalizado = normalizeAbsenceType(tipoAusencia);

        if (isVacationType(tipoNormalizado)) {
          cor = "#fefce8";
          textoCor = "#854d0e";
          badge = "Férias";
        } else if (tipoNormalizado.includes("doenca") || tipoNormalizado.includes("acidente") || tipoNormalizado.includes("baixa")) {
          cor = "#faf5ff";
          textoCor = "#6b21a8";
          badge = "Doença";
        } else if (tipoNormalizado.includes("injustificada")) {
          cor = "#fee2e2";
          textoCor = "#991b1b";
          badge = "Injustificada";
        } else {
          cor = "#f0f9ff";
          textoCor = "#0c4a6e";
          badge = tipoAusencia.length > 22 ? `${tipoAusencia.substring(0, 22)}...` : tipoAusencia;
        }
      } else if (assidDia) {
        const entradaSeg = timeToSeconds(assidDia.hora_entrada);
        const saidaSeg = timeToSeconds(assidDia.hora_saida);
        const pausaSeg = Number(assidDia.tempo_pausa_acumulado) || 0;
        const totalLiquidoSeg = entradaSeg !== null && saidaSeg !== null ? Math.max(0, saidaSeg - entradaSeg - pausaSeg) : 0;

        const horaEntrada = assidDia.hora_entrada ? parseInt(assidDia.hora_entrada.split(":")[0], 10) : null;
        const horaSaida = assidDia.hora_saida ? parseInt(assidDia.hora_saida.split(":")[0], 10) : null;

        // 💡 NOVO: Detetar se a ausência parcial é do tipo "Férias"
        const isFeriasParcial = ausenciasDiaParciais.length > 0 && isVacationType(normalizeAbsenceType(ausenciasDiaParciais[0].tipo));
        const sufixoParcial = ausenciasDiaParciais.length > 0 ? (isFeriasParcial ? " + Férias Parciais" : " + Parcial") : "";
        const labelParcialCompleto = isFeriasParcial ? "Férias Parciais" : "Ausência Parcial";

        if (horaEntrada === 9 && horaSaida === 18 && !assidDia.tempo_pausa_acumulado) {
          tipo = "completoSemPausa";
          cor = "#d1fae5";
          textoCor = "#065f46";
          badge = isFimSemana
            ? `${formatDurationFromSeconds(totalLiquidoSeg)}${sufixoParcial}`
            : ausenciasDiaParciais.length > 0 ? `Dia Completo + ${labelParcialCompleto}` : "Dia Completo";
        } else if (totalLiquidoSeg >= 8 * 3600) {
          tipo = "completoComPausa";
          cor = "#dcfce7";
          textoCor = "#166534";
          badge = `${formatDurationFromSeconds(totalLiquidoSeg)}${pausaSeg > 0 ? ` (Pausa: ${formatMinutesFromSeconds(pausaSeg)}min)` : ""}${sufixoParcial}`;
        } else if (totalLiquidoSeg > 0) {
          tipo = "parcial";
          cor = "#fee2e2";
          textoCor = "#991b1b";
          badge = `${formatDurationFromSeconds(totalLiquidoSeg)}${sufixoParcial}`;
        } else {
          tipo = "vazio";
          cor = "#f8fafc";
          textoCor = "#cbd5e1";
          badge = "Sem dados";
        }
      } else if (ausenciasDiaParciais.length > 0) {
        const parcial = ausenciasDiaParciais[0];
        const isFeriasParcial = isVacationType(normalizeAbsenceType(parcial.tipo));
        
        tipo = "ausenciaParcial";
        // 💡 Dá a cor amarela/laranja igual à das Férias normais se for Férias!
        cor = isFeriasParcial ? "#fefce8" : "var(--color-bgSecondary)";
        textoCor = isFeriasParcial ? "#854d0e" : "var(--color-btnPrimaryHover)";
        badge = `${isFeriasParcial ? "Férias Parciais" : "Ausência Parcial"} ${formatarHora(parcial.hora_inicio)}-${formatarHora(parcial.hora_fim)}`;
      } else if (estadoTemporarioBarra) {
        tipo = "estadoTemporario";
        const statusStyle = estadoTemporarioBarra;
        cor = statusStyle.cor;
        textoCor = statusStyle.textoCor;
        badge = statusStyle.badge;
      } else {
        const isPassadoOuHoje = dataStr <= hojeStr;
        const isAfterAttendanceStart = dataStr >= dataInicioCalculo;
        if (isPassadoOuHoje && isAfterAttendanceStart) {
          tipo = "faltaInjustificada";
          cor = "#fee2e2";
          textoCor = "#991b1b";
          badge = "Falta injustificada";
        }
      }

      return { dia, dataStr, tipo, cor, textoCor, badge, assidDia, ausenciasDia, ausenciasDiaInteiras, ausenciasDiaParciais, toleranciaDia, estadoTemporarioDia, estadoTemporarioBarra, isFimSemana, isFeriado, feriadoNome: feriadoObj?.nome };
    });

    setDiasDoMes(dias);
  }

  function formatarHora(hora) {
    return hora ? hora.slice(0, 5) : "--:--";
  }

  function handlePrevMonth() {
    const novaData = new Date(dataAtual);
    novaData.setMonth(novaData.getMonth() - 1);
    setDataAtual(novaData);
    setDiaSelected(null);
    if (typeof onMonthChange === 'function') onMonthChange(novaData);
  }

  function handleNextMonth() {
    const novaData = new Date(dataAtual);
    novaData.setDate(1); // Corrige bug de salto de mês
    novaData.setMonth(novaData.getMonth() + 1);
    setDataAtual(novaData);
    setDiaSelected(null);
    if (typeof onMonthChange === 'function') onMonthChange(novaData);
  }

  function handleToday() {
    const today = new Date();
    setDataAtual(today);
    setDiaSelected(null);
    if (typeof onMonthChange === 'function') onMonthChange(today);
  }

  function openEditForDay(diaObj) {
    const ass = diaObj?.assidDia;
    setEditForm({
      hora_entrada: ass?.hora_entrada ? String(ass.hora_entrada).slice(0, 5) : "09:00",
      hora_saida: ass?.hora_saida ? String(ass.hora_saida).slice(0, 5) : "18:00",
      tempo_pausa: ass?.tempo_pausa_acumulado ? String(formatMinutesFromSeconds(ass.tempo_pausa_acumulado)) : "60",
      observacoes: ass?.observacoes || "",
    });
    setIsEditingDay(true);
    setSaveFeedback({ show: false, type: "success", message: "" });
  }

  // ====== FUNÇÃO PARA PREENCHER MÊS COMPLETO EM LOTE ======
  async function handleBulkFillMonth() {
      setBulkLoading(true);
      setSaveFeedback({ show: false, type: "success", message: "" });

      const dataInicioCalculo = getAttendanceCalculationStartDate(dataAdmissao);
      const feriadosMes = getFeriados(anoAtual).filter(f => f.m === mesAtual).map(f => f.d);

      // Identifica os dias que podem ser preenchidos
      const diasParaPreencher = diasDoMes.filter(diaObj => {
          if (!diaObj) return false;
          if (diaObj.isFimSemana) return false; // Ignora fins de semana
          if (feriadosMes.includes(diaObj.dia)) return false; // Ignora feriados
          if (diaObj.dataStr < dataInicioCalculo) return false; // Ignora antes da admissão
          if (diaObj.assidDia) return false; // Ignora dias que já têm marcação
          if (diaObj.ausenciasDiaInteiras?.length > 0) return false; // Ignora dias com ausência justificada/férias
          return true;
      });

      if (diasParaPreencher.length === 0) {
          setSaveFeedback({ show: true, type: "error", message: "Não existem dias úteis livres para preencher neste mês." });
          setShowBulkModal(false);
          setBulkLoading(false);
          setBulkInput("");
          return;
      }

      const payload = diasParaPreencher.map(diaObj => ({
          user_id: userId,
          data_registo: diaObj.dataStr,
          hora_entrada: "09:00",
          hora_saida: "18:00",
          tempo_pausa_acumulado: 3600, // 60 minutos
          observacoes: "Preenchimento automático (Mês completo)",
          motivo_alteracao: "Lançamento em lote RH"
      }));

      try {
          const { error } = await supabase.from("assiduidade").insert(payload);
          if (error) throw error;

          setSaveFeedback({ show: true, type: "success", message: `Sucesso! Foram preenchidos ${payload.length} dias úteis.` });
          setShowBulkModal(false);
          setBulkInput("");
          fetchDadosMes();
      } catch (error) {
          setSaveFeedback({ show: true, type: "error", message: `Erro ao preencher o mês: ${error.message}` });
      } finally {
          setBulkLoading(false);
      }
  }

  async function handleSaveDayAssiduidade(dataStr) {
    if (!editForm.hora_entrada || !editForm.hora_saida) {
      setSaveFeedback({ show: true, type: "error", message: "Preencha hora de entrada e saída." });
      return;
    }

    const entradaSeg = timeToSeconds(editForm.hora_entrada);
    const saidaSeg = timeToSeconds(editForm.hora_saida);
    if (entradaSeg === null || saidaSeg === null || saidaSeg <= entradaSeg) {
      setSaveFeedback({ show: true, type: "error", message: "A hora de saída deve ser superior à entrada." });
      return;
    }

    const pausaMin = Math.max(0, Number(editForm.tempo_pausa) || 0);
    const pausaSeg = Math.round(pausaMin * 60);

    setSavingDay(true);
    setSaveFeedback({ show: false, type: "success", message: "" });

    try {
      const { data: existentes, error: searchError } = await supabase
        .from("assiduidade")
        .select("id")
        .eq("user_id", userId)
        .eq("data_registo", dataStr)
        .limit(2);

      if (searchError) throw searchError;

      if ((existentes || []).length > 1) {
        setSaveFeedback({ show: true, type: "error", message: "Erro: Existem múltiplos registos para este dia. Contacte o administrador." });
        setSavingDay(false);
        return;
      }

      const existente = (existentes || [])[0];
      const payload = {
        user_id: userId,
        data_registo: dataStr,
        hora_entrada: editForm.hora_entrada,
        hora_saida: editForm.hora_saida,
        tempo_pausa_acumulado: pausaSeg,
        observacoes: editForm.observacoes || null,
        motivo_alteracao: "Ajuste manual RH no calendário",
      };

      let dbError = null;
      if (existente?.id) {
        const { error } = await supabase.from("assiduidade").update(payload).eq("id", existente.id);
        dbError = error;
      } else {
        const { error } = await supabase.from("assiduidade").insert([payload]);
        dbError = error;
      }

      if (dbError) throw dbError;

      setSaveFeedback({ show: true, type: "success", message: "Assiduidade guardada com sucesso." });
      setIsEditingDay(false);
      fetchDadosMes();
    } catch (error) {
      setSaveFeedback({ show: true, type: "error", message: `Erro ao guardar: ${error.message}` });
    } finally {
      setSavingDay(false);
    }
  }

  async function handleDeleteAssiduidade(diaObj) {
    if (!diaObj?.assidDia?.id) return;
    setDeleteLoading(true);
    setSaveFeedback({ show: false, type: "success", message: "" });
    try {
      const { error } = await supabase.from("assiduidade").delete().eq("id", diaObj.assidDia.id);
      if (error) throw error;
      setSaveFeedback({ show: true, type: "success", message: "Assiduidade apagada com sucesso." });
      setShowDeleteModal(false);
      setDeleteInput("");
      setDeleteTarget(null);
      fetchDadosMes();
    } catch (error) {
      setSaveFeedback({ show: true, type: "error", message: `Erro ao apagar: ${error.message}` });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleToggleTolerancia(diaObj) {
    if (!diaObj?.dataStr) return;
    setToleranciaLoading(true);
    setSaveFeedback({ show: false, type: "success", message: "" });

    try {
      if (diaObj.toleranciaDia?.id) {
        const { error } = await supabase.from("ferias").update({ estado: "cancelado" }).eq("id", diaObj.toleranciaDia.id);
        if (error) throw error;
        setSaveFeedback({ show: true, type: "success", message: "Tolerância removida." });

        await sincronizarSaldoFeriasDoColaborador({
          data: diaObj.dataStr,
          movimento: "remove",
          excludeToleranceId: diaObj.toleranciaDia.id,
        });
      } else {
        const payload = {
          user_id: userId,
          tipo: TOLERANCIA_TIPO,
          data_inicio: diaObj.dataStr,
          data_fim: diaObj.dataStr,
          is_parcial: false,
          estado: "aprovado",
          motivo: "Lançamento manual RH",
        };
        const { data: insertedTolerance, error } = await supabase
          .from("ferias")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        setSaveFeedback({ show: true, type: "success", message: "Tolerância lançada com sucesso." });

        await sincronizarSaldoFeriasDoColaborador({
          data: diaObj.dataStr,
          movimento: "add",
          excludeToleranceId: insertedTolerance?.id || null,
        });
      }

      if (typeof onVacationBalanceUpdated === "function") {
        await Promise.resolve(onVacationBalanceUpdated());
      }

      fetchDadosMes();
    } catch (error) {
      setSaveFeedback({ show: true, type: "error", message: `Erro na tolerância: ${error.message}` });
    } finally {
      setToleranciaLoading(false);
    }
  }

  // ====== CALCULA TOTAIS DO MÊS ======
  const totaisDoMes = () => {
    let totalHorasSeg = 0;
    let totalPausasSeg = 0;
    let diasTrabalhados = 0;
    let diasAusencia = { "Férias": 0, "Doença": 0, "Falta": 0, "Outro": 0 };

    const toleranciasAtivas = (ausencias || []).filter((a) => !a.is_parcial && isToleranceType(a.tipo));
    const toleranciaSkipSet = buildToleranciasSkipSet(
      toleranciasAtivas.map((a) => ({
        user_id: a.user_id,
        data: a.data_inicio,
        data_inicio: a.data_inicio,
        data_fim: a.data_fim || a.data_inicio,
      })),
      userId,
    );
    const feriadosMesSet = new Set(
      getFeriados(anoAtual)
        .filter((f) => f.m === mesAtual)
        .map((f) => `${anoAtual}-${String(f.m + 1).padStart(2, "0")}-${String(f.d).padStart(2, "0")}`),
    );
    const diasFolga = Array.from(toleranciaSkipSet).filter((dateKey) => {
      const data = parseLocalDate(dateKey);
      if (!data) return false;
      if (data.getFullYear() !== anoAtual || data.getMonth() !== mesAtual) return false;
      const day = data.getDay();
      if (day === 0 || day === 6) return false;
      return !feriadosMesSet.has(dateKey);
    }).length;

    assiduidade.forEach((a) => {
      if (a.hora_entrada && a.hora_saida) {
        const entradaSeg = timeToSeconds(a.hora_entrada);
        const saidaSeg = timeToSeconds(a.hora_saida);
        const pausaSeg = Number(a.tempo_pausa_acumulado) || 0;
        totalHorasSeg += Math.max(0, (saidaSeg || 0) - (entradaSeg || 0) - pausaSeg);
        totalPausasSeg += pausaSeg;
        diasTrabalhados += 1;
      }
    });

    if (estadoTemporario?.tipo && estadoTemporario?.data_inicio) {
      const tipoEstado = normalizeAbsenceType(estadoTemporario.tipo);
      const skipDatesEstado = isVacationType(tipoEstado)
        ? buildToleranciasSkipSet(
            (ausencias || [])
              .filter((a) => !a.is_parcial && isToleranceType(a.tipo))
              .map((a) => ({
                user_id: a.user_id,
                data: a.data_inicio,
                data_inicio: a.data_inicio,
                data_fim: a.data_fim || a.data_inicio,
              })),
            userId,
          )
        : null;
      const diasEstado = calcularDiasUteisNoMes(
        estadoTemporario.data_inicio,
        estadoTemporario.data_fim || estadoTemporario.data_inicio,
        anoAtual,
        mesAtual,
        skipDatesEstado,
      );

      if (diasEstado > 0) {
        if (isVacationType(tipoEstado)) diasAusencia["Férias"] += diasEstado;
        else if (tipoEstado.includes("doenca") || tipoEstado.includes("acidente") || tipoEstado.includes("baixa") || tipoEstado.includes("obrigacao legal")) diasAusencia["Doença"] += diasEstado;
        else if (tipoEstado.includes("falta")) diasAusencia["Falta"] += diasEstado;
        else diasAusencia["Outro"] += diasEstado;
      }
    }

    ausencias.forEach((a) => {
      if (a.is_parcial) return;

      const tipoNormalizado = normalizeAbsenceType(a.tipo);
      if (isToleranceType(tipoNormalizado)) return;

      const dias = calcularDiasUteisNoMes(
        a.data_inicio,
        a.data_fim || a.data_inicio,
        anoAtual,
        mesAtual,
        isVacationType(tipoNormalizado) ? toleranciaSkipSet : null,
      );
      let categoria = "Outro";

      if (dias <= 0) return;

      if (isVacationType(tipoNormalizado)) categoria = "Férias";
      else if (tipoNormalizado.includes("doenca") || tipoNormalizado.includes("acidente") || tipoNormalizado.includes("baixa")) categoria = "Doença";
      else if (tipoNormalizado.includes("falta")) categoria = "Falta";

      diasAusencia[categoria] = (diasAusencia[categoria] || 0) + dias;
    });

    return { totalHorasSeg, totalPausasSeg, diasTrabalhados, diasAusencia, diasFolga };
  };

  const totais = totaisDoMes();
  const totalDiasAusencia = Object.values(totais.diasAusencia).reduce((a, b) => a + b, 0);
  const temResumoAusencias = totalDiasAusencia > 0 || totais.diasFolga > 0;

  if (loading) {
    return (
      <div className="cc-card cc-loading">
        <span className="cc-spinner" /> A carregar calendário...
      </div>
    );
  }

  const hojeStrCC = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();
  const isBulkConfirmValid = bulkInput.trim().toUpperCase() === "SIM" || bulkInput.trim().toUpperCase() === "CONFIRMO";
  const getDayHours = (dia) => {
    if (!dia?.assidDia) return null;
    const entradaSeg = timeToSeconds(dia.assidDia.hora_entrada);
    const saidaSeg = timeToSeconds(dia.assidDia.hora_saida);
    if (entradaSeg === null || saidaSeg === null) return null;
    const pausaSeg = Number(dia.assidDia.tempo_pausa_acumulado) || 0;
    return Math.max(0, saidaSeg - entradaSeg - pausaSeg);
  };
  const diaSelecionadoObj = diaSelected ? diasDoMes.find((d) => d && d.dia === diaSelected) : null;

  return (
    <div className="cc-card">
      {/* Header e Botões de Navegação */}
      <div className="cc-head">
        <div className="cc-title">
          <span className="cc-title-ico"><Icons.Calendar size={18} /></span>
          <div>
            <h3>Calendário - {userName}</h3>
            <p>Clica num dia para ver ou editar a assiduidade.</p>
          </div>
        </div>
        <div className="cc-nav">
          {/* BOTÃO: Preencher Mês */}
          <button type="button" onClick={() => setShowBulkModal(true)} title="Preencher Mês Completo" className="cc-fill-btn">
            <Icons.Calendar size={16} /> <span>Preencher mês</span>
          </button>
          <div className="cc-month">
            <button type="button" onClick={handlePrevMonth} aria-label="Mês anterior" title="← Anterior">‹</button>
            <button type="button" onClick={handleToday} className="cc-month-label" title="Ir para hoje">{nomesMeses[mesAtual]} {anoAtual}</button>
            <button type="button" onClick={handleNextMonth} aria-label="Mês seguinte" title="Próximo →">›</button>
          </div>
        </div>
      </div>

      {saveFeedback.show && (
        <div className={`cc-feedback ${saveFeedback.type === "error" ? "is-error" : ""}`}>
          {saveFeedback.message}
        </div>
      )}

      {/* Calendário */}
      <div className="cc-grid">
        {diasSemana.map((dia, i) => (
          <div key={`wd-${i}`} className="cc-wd">{dia}</div>
        ))}
        {diasDoMes.map((dia, i) => {
          if (!dia) {
            return <div key={`empty-${i}`} className="cc-empty-day"></div>;
          }

          const isSelected = diaSelected === dia.dia;
          const isToday = dia.dataStr === hojeStrCC;
          const horas = getDayHours(dia);

          return (
            <button
              type="button"
              key={dia.dataStr}
              onClick={() => setDiaSelected(isSelected ? null : dia.dia)}
              className={`cc-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${dia.assidDia ? "has-work" : ""}`}
              style={{ background: dia.cor, color: dia.textoCor }}
            >
              <span className="cc-day-num">{dia.dia}</span>
              {dia.badge ? <span className={`cc-day-badge ${horas !== null ? "is-work" : ""}`}>{dia.badge}</span> : null}
            </button>
          );
        })}
      </div>

      {/* Detalhes do Dia Selecionado */}
      {diaSelecionadoObj && (
        <div className="cc-detail" key={diaSelecionadoObj.dataStr}>
          <div className="cc-detail-head">
            <h4>Dia {diaSelected} de {nomesMeses[mesAtual]} de {anoAtual}</h4>
            <button type="button" className="cc-detail-close" onClick={() => setDiaSelected(null)} aria-label="Fechar">×</button>
          </div>

          {(() => {
            const diaObj = diaSelecionadoObj;

            if (diaObj.estadoTemporarioDia) {
              const statusStyle = getTemporaryStatusStyle(diaObj.estadoTemporarioDia.tipo);
              return (
                <div className="cc-detail-body">
                  <p className="cc-detail-label">Estado temporário: {formatAbsenceTypeLabel(diaObj.estadoTemporarioDia.tipo)}</p>
                  <div className="cc-status" style={{ background: statusStyle.cor, color: statusStyle.textoCor }}>
                    <strong>{statusStyle.badge}</strong>
                    <span>
                      {new Date(`${diaObj.estadoTemporarioDia.data_inicio}T00:00:00`).toLocaleDateString("pt-PT")}
                      {diaObj.estadoTemporarioDia.data_fim && diaObj.estadoTemporarioDia.data_fim !== diaObj.estadoTemporarioDia.data_inicio
                        ? ` a ${new Date(`${diaObj.estadoTemporarioDia.data_fim}T00:00:00`).toLocaleDateString("pt-PT")}`
                        : ""}
                    </span>
                    {diaObj.estadoTemporarioDia.motivo && <em>{diaObj.estadoTemporarioDia.motivo}</em>}
                  </div>
                </div>
              );
            }

            if (diaObj.ausenciasDiaInteiras.length > 0 && !diaObj.assidDia) {
              const ausencia = diaObj.ausenciasDiaInteiras[0];
              return (
                <div className="cc-detail-body">
                  <p className="cc-detail-label">Ausência: {formatAbsenceTypeLabel(ausencia.tipo)}</p>
                  {ausencia.motivo && <p className="cc-detail-text">Motivo: {ausencia.motivo}</p>}
                  {ausencia.is_parcial && (
                    <p className="cc-detail-text">Horário: {formatarHora(ausencia.hora_inicio)} - {formatarHora(ausencia.hora_fim)}</p>
                  )}
                  {isToleranceType(ausencia.tipo) ? (
                    <div className="cc-actions">
                      <button type="button" className="cc-btn" onClick={() => handleToggleTolerancia(diaObj)} disabled={toleranciaLoading}>
                        {toleranciaLoading ? "A processar..." : "Remover Tolerância"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            }

            if (isEditingDay) {
              return (
                <div className="cc-detail-body">
                  <div className="cc-form-grid">
                    <label className="cc-field">
                      <span>Entrada *</span>
                      <input type="time" className="cc-input" value={editForm.hora_entrada} onChange={(e) => setEditForm({ ...editForm, hora_entrada: e.target.value })} required />
                    </label>
                    <label className="cc-field">
                      <span>Saída *</span>
                      <input type="time" className="cc-input" value={editForm.hora_saida} onChange={(e) => setEditForm({ ...editForm, hora_saida: e.target.value })} required />
                    </label>
                    <label className="cc-field">
                      <span>Pausa (minutos)</span>
                      <input type="number" min="0" className="cc-input" value={editForm.tempo_pausa} onChange={(e) => setEditForm({ ...editForm, tempo_pausa: e.target.value })} />
                    </label>
                  </div>
                  <label className="cc-field">
                    <span>Observações</span>
                    <textarea rows="3" className="cc-input is-area" value={editForm.observacoes} onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })} />
                  </label>
                  <div className="cc-actions">
                    <button type="button" className="cc-btn" onClick={() => handleToggleTolerancia(diaObj)} disabled={savingDay || toleranciaLoading}>
                      {diaObj.toleranciaDia ? "Remover Tolerância" : "Dar Tolerância"}
                    </button>
                    <span className="cc-spacer" />
                    <button type="button" className="cc-btn" onClick={() => setIsEditingDay(false)} disabled={savingDay}>
                      Cancelar
                    </button>
                    <button type="button" className="cc-btn is-primary" onClick={() => handleSaveDayAssiduidade(diaObj.dataStr)} disabled={savingDay}>
                      {savingDay ? "A guardar..." : "Guardar"}
                    </button>
                  </div>
                </div>
              );
            }

            if (diaObj.assidDia) {
              const ass = diaObj.assidDia;
              const entradaSeg = timeToSeconds(ass.hora_entrada);
              const saidaSeg = timeToSeconds(ass.hora_saida);
              const pausaSeg = Number(ass.tempo_pausa_acumulado) || 0;
              const totalLiquidoSeg = entradaSeg !== null && saidaSeg !== null ? Math.max(0, saidaSeg - entradaSeg - pausaSeg) : 0;

              return (
                <div className="cc-detail-body">
                  <div className="cc-times">
                    <div className="is-in"><span>Entrada</span><strong>{formatarHora(ass.hora_entrada)}</strong></div>
                    <div className="is-out"><span>Saída</span><strong>{formatarHora(ass.hora_saida)}</strong></div>
                    <div className="is-total"><span>Total de Horas</span><strong>{formatDurationFromSeconds(totalLiquidoSeg)}</strong></div>
                    {pausaSeg > 0 && (
                      <div className="is-pause"><span>Tempo de Pausa</span><strong>{formatMinutesFromSeconds(pausaSeg)} minutos</strong></div>
                    )}
                  </div>

                  {ass.motivo_alteracao && (
                    <div className="cc-note is-orange">
                      <span>Alteração à Assiduidade</span>
                      <p>{ass.motivo_alteracao}</p>
                    </div>
                  )}

                  {ass.observacoes && (
                    <div className="cc-note">
                      <span>Observações</span>
                      <p>{ass.observacoes}</p>
                    </div>
                  )}

                  {diaObj.ausenciasDiaParciais.length > 0 && (
                    <div className="cc-note is-brand">
                      <span>Ausência Parcial</span>
                      {diaObj.ausenciasDiaParciais.map((a) => (
                        <div key={a.id} className="cc-note-item">
                          <div>{a.tipo} - {formatarHora(a.hora_inicio)} às {formatarHora(a.hora_fim)}</div>
                          {a.motivo && <small>Motivo: {a.motivo}</small>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="cc-actions">
                    <button type="button" className="cc-btn" onClick={() => handleToggleTolerancia(diaObj)} disabled={toleranciaLoading}>
                      {diaObj.toleranciaDia ? "Remover Tolerância" : "Dar Tolerância"}
                    </button>
                    <span className="cc-spacer" />
                    <button type="button" className="cc-btn" onClick={() => openEditForDay(diaObj)}>
                      Editar Assiduidade
                    </button>
                    <button type="button" className="cc-btn is-danger" onClick={e => { e.stopPropagation(); setShowDeleteModal(true); setDeleteTarget(diaObj); setDeleteInput(""); }}>
                      Apagar Assiduidade
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div className="cc-detail-body">
                <p className="cc-detail-text is-muted">
                  {diaObj.isFimSemana ? "Este é um fim de semana sem registos." : "Sem registos para este dia."}
                </p>
                <div className="cc-actions">
                  <button type="button" className="cc-btn" onClick={() => handleToggleTolerancia(diaObj)} disabled={toleranciaLoading}>
                    {diaObj.toleranciaDia ? "Remover Tolerância" : "Dar Tolerância"}
                  </button>
                  <span className="cc-spacer" />
                  <button type="button" className="cc-btn is-danger" onClick={e => { e.stopPropagation(); setShowDeleteModal(true); setDeleteTarget(diaObj); setDeleteInput(""); }} disabled={!diaObj.assidDia}>
                    Apagar Assiduidade
                  </button>
                  <button type="button" className="cc-btn is-primary" onClick={() => openEditForDay(diaObj)}>
                    Registar Assiduidade
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Resumo do Mês */}
      <div className="cc-summary">
        <h4>Resumo do Mês</h4>
        <div className="cc-summary-grid">
          <div className="is-brand"><span>Total de Horas</span><strong>{formatDurationFromSeconds(totais.totalHorasSeg)}</strong></div>
          <div className="is-brand"><span>Dias Trabalhados</span><strong>{totais.diasTrabalhados}</strong></div>
          {totais.totalPausasSeg > 0 && (
            <div className="is-amber"><span>Total Pausas</span><strong>{formatMinutesFromSeconds(totais.totalPausasSeg)}min</strong></div>
          )}
          {totalDiasAusencia > 0 && (
            <div className="is-red"><span>Dias Ausência</span><strong>{totalDiasAusencia}</strong></div>
          )}
          {totais.diasFolga > 0 && (
            <div className="is-green"><span>Dias Tolerância</span><strong>{totais.diasFolga}</strong></div>
          )}
        </div>

        {temResumoAusencias && (
          <div className="cc-chips">
            {Object.entries(totais.diasAusencia).map(([tipo, dias]) =>
              dias > 0 ? <span key={tipo} className="cc-chip is-red">{tipo}: {dias}d</span> : null
            )}
            {totais.diasFolga > 0 ? <span key="Tolerância" className="cc-chip is-green">Tolerância: {totais.diasFolga}d</span> : null}
          </div>
        )}
      </div>

      {/* Modal de confirmação para apagar assiduidade individual */}
      {showDeleteModal && createPortal(
        <div className="cc-overlay">
          <div className="cc-modal">
            <span className="cc-modal-ico is-danger">!</span>
            <h3>Apagar Assiduidade</h3>
            <p>Tem a certeza que quer apagar este registo de assiduidade? Esta ação é <b>irreversível</b>.<br/>Para confirmar, escreva <b>APAGAR</b> abaixo:</p>
            <input
              type="text"
              className="cc-input"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Digite APAGAR para confirmar"
              autoFocus
              disabled={deleteLoading}
            />
            <div className="cc-modal-actions">
              <button type="button" className="cc-btn" onClick={() => { setShowDeleteModal(false); setDeleteInput(""); setDeleteTarget(null); }} disabled={deleteLoading}>
                Cancelar
              </button>
              <button type="button" className="cc-btn is-danger-solid" onClick={() => handleDeleteAssiduidade(deleteTarget)} disabled={deleteInput !== "APAGAR" || deleteLoading}>
                {deleteLoading ? "A apagar..." : "Apagar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de confirmação para preenchimento em lote do mês */}
      {showBulkModal && createPortal(
        <div className="cc-overlay">
          <div className="cc-modal">
            <span className="cc-modal-ico is-green"><Icons.Calendar size={24} /></span>
            <h3>Preencher Mês Completo</h3>
            <p>
              Confirma que quer marcar assiduidade das <b>09:00 - 18:00</b> com <b>60 minutos</b> de pausa para <b>todos os dias úteis</b> do mês de {nomesMeses[mesAtual]} para o colaborador {userName}?
            </p>
            <p className="cc-modal-note">
              Nota: O sistema ignora fins de semana, feriados, e dias que já tenham ausências ou registos de assiduidade marcados.
            </p>
            <p className="cc-modal-strong">Para confirmar, escreva "SIM" ou "CONFIRMO" abaixo:</p>
            <input
              type="text"
              className="cc-input"
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              placeholder="Digite SIM para confirmar"
              autoFocus
              disabled={bulkLoading}
            />
            <div className="cc-modal-actions">
              <button type="button" className="cc-btn" onClick={() => { setShowBulkModal(false); setBulkInput(""); }} disabled={bulkLoading}>
                Cancelar
              </button>
              <button type="button" className="cc-btn is-green-solid" onClick={handleBulkFillMonth} disabled={!isBulkConfirmValid || bulkLoading}>
                {bulkLoading ? "A preencher..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
