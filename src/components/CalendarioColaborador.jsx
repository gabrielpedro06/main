import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import {
  calcularDiasUteis,
  calcularDiasUteisNoMes,
  buildToleranciasSkipSet,
  formatAbsenceTypeLabel,
  getAnnualVacationLimitFromProfile,
  getAttendanceCalculationStartDate,
  getFeriados,
  isVacationType,
  normalizeAbsenceType,
  parseLocalDate,
  sincronizarSaldoFeriasPerfil,
} from "../utils/feriasSaldo";

export default function CalendarioColaborador({
  userId,
  userName = "Colaborador",
  dataAdmissao = null,
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

  const isMissingColumnError = (error) => {
    if (!error) return false;
    return error.code === "42703" || /column .* does not exist/i.test(error.message || "");
  };

  // Ícones inline para facilitar
  const Icons = {
    Activity: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
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
        cor = "#dbeafe";
        textoCor = "#1e40af";
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

        if (horaEntrada === 9 && horaSaida === 18 && !assidDia.tempo_pausa_acumulado) {
          tipo = "completoSemPausa";
          cor = "#d1fae5";
          textoCor = "#065f46";
          badge = isFimSemana
            ? `${formatDurationFromSeconds(totalLiquidoSeg)}${ausenciasDiaParciais.length > 0 ? " + Parcial" : ""}`
            : ausenciasDiaParciais.length > 0 ? "Dia Completo + Ausência Parcial" : "Dia Completo";
        } else if (totalLiquidoSeg >= 8 * 3600) {
          tipo = "completoComPausa";
          cor = "#dcfce7";
          textoCor = "#166534";
          badge = `${formatDurationFromSeconds(totalLiquidoSeg)}${pausaSeg > 0 ? ` (Pausa: ${formatMinutesFromSeconds(pausaSeg)}min)` : ""}${ausenciasDiaParciais.length > 0 ? " + Parcial" : ""}`;
        } else if (totalLiquidoSeg > 0) {
          tipo = "parcial";
          cor = "#fee2e2";
          textoCor = "#991b1b";
          badge = `${formatDurationFromSeconds(totalLiquidoSeg)}${ausenciasDiaParciais.length > 0 ? " + Parcial" : ""}`;
        } else {
          tipo = "vazio";
          cor = "#f8fafc";
          textoCor = "#cbd5e1";
          badge = "Sem dados";
        }
      } else if (ausenciasDiaParciais.length > 0) {
        const parcial = ausenciasDiaParciais[0];
        tipo = "ausenciaParcial";
        cor = "#eff6ff";
        textoCor = "#1e40af";
        badge = `Ausência Parcial ${formatarHora(parcial.hora_inicio)}-${formatarHora(parcial.hora_fim)}`;
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

      return { dia, dataStr, tipo, cor, textoCor, badge, assidDia, ausenciasDia, ausenciasDiaInteiras, ausenciasDiaParciais, toleranciaDia, isFimSemana, isFeriado, feriadoNome: feriadoObj?.nome };
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
    return <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>Carregando calendário...</div>;
  }

  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      {/* Header e Botões de Navegação */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#1e293b" }}>Calendário - {userName}</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          
          {/* BOTÃO: Preencher Mês com tooltip global */}
          <button
            onClick={() => setShowBulkModal(true)}
            title="Preencher Mês Completo"
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              padding: "6px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "10px"
            }}
          >
            <Icons.Activity size={18} color="white" />
          </button>

          <button
            onClick={handlePrevMonth}
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            ← Anterior
          </button>
          <button
            onClick={handleToday}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "600",
            }}
          >
            {nomesMeses[mesAtual]} {anoAtual}
          </button>
          <button
            onClick={handleNextMonth}
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Próximo →
          </button>
        </div>
      </div>

      {saveFeedback.show && (
        <div style={{ marginBottom: "16px", padding: "12px", borderRadius: "6px", background: saveFeedback.type === "error" ? "#fef2f2" : "#f0fdf4", color: saveFeedback.type === "error" ? "#991b1b" : "#166534", border: `1px solid ${saveFeedback.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
          {saveFeedback.message}
        </div>
      )}

      {/* Tabela de Dias da Semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", marginBottom: "10px" }}>
        {diasSemana.map((dia, i) => (
          <div key={`wd-${i}`} style={{ textAlign: "center", fontWeight: "bold", fontSize: "0.8rem", color: "#94a3b8" }}>
            {dia}
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {diasDoMes.map((dia, i) => {
          if (!dia) {
            return <div key={`empty-${i}`}></div>;
          }

          const isSelected = diaSelected === dia.dia;

          return (
            <div
              key={dia.dataStr}
              onClick={() => setDiaSelected(isSelected ? null : dia.dia)}
              style={{
                background: dia.cor,
                border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px",
                cursor: "pointer",
                minHeight: "60px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s",
                boxShadow: isSelected ? "0 2px 8px rgba(37, 99, 235, 0.2)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "0.95rem", color: dia.textoCor }}>{dia.dia}</div>
              <div style={{ fontSize: "0.7rem", color: dia.textoCor, fontWeight: "500" }}>{dia.badge}</div>
            </div>
          );
        })}
      </div>

      {/* Detalhes do Dia Selecionado */}
      {diaSelected && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "15px", marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#1e40af", display: "flex", alignItems: "center", gap: "8px" }}>
            Dia {diaSelected} de {nomesMeses[mesAtual]} de {anoAtual}
          </h4>

          {(() => {
            const diaObj = diasDoMes.find((d) => d && d.dia === diaSelected);
            if (!diaObj) return null;

            if (diaObj.ausenciasDiaInteiras.length > 0) {
              const ausencia = diaObj.ausenciasDiaInteiras[0];
              return (
                <div>
                  <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#475569" }}>
                    Ausência: {formatAbsenceTypeLabel(ausencia.tipo)}
                  </p>
                  {ausencia.motivo && <p style={{ margin: "0", color: "#64748b", fontSize: "0.9rem" }}>Motivo: {ausencia.motivo}</p>}
                  {ausencia.is_parcial && (
                    <p style={{ margin: "8px 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                      Horário: {formatarHora(ausencia.hora_inicio)} - {formatarHora(ausencia.hora_fim)}
                    </p>
                  )}

                  {isToleranceType(ausencia.tipo) ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleTolerancia(diaObj)}
                        disabled={toleranciaLoading}
                        style={{ background: "white", border: "1px solid #cbd5e1", color: "#334155", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                      >
                        {toleranciaLoading ? "A processar..." : "Remover Tolerância"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            }

            if (isEditingDay) {
              return (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b" }}>Entrada *</span>
                      <input
                        type="time"
                        value={editForm.hora_entrada}
                        onChange={(e) => setEditForm({ ...editForm, hora_entrada: e.target.value })}
                        style={{ width: "100%", marginTop: "5px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                        required
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b" }}>Saída *</span>
                      <input
                        type="time"
                        value={editForm.hora_saida}
                        onChange={(e) => setEditForm({ ...editForm, hora_saida: e.target.value })}
                        style={{ width: "100%", marginTop: "5px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b" }}>Pausa (minutos)</span>
                    <input
                      type="number"
                      min="0"
                      value={editForm.tempo_pausa}
                      onChange={(e) => setEditForm({ ...editForm, tempo_pausa: e.target.value })}
                      style={{ width: "100%", marginTop: "5px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b" }}>Observações</span>
                    <textarea
                      rows="4"
                      value={editForm.observacoes}
                      onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                      style={{ width: "100%", marginTop: "5px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleTolerancia(diaObj)}
                      style={{ background: "white", border: "1px solid #cbd5e1", color: "#334155", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                      disabled={savingDay || toleranciaLoading}
                    >
                      {diaObj.toleranciaDia ? "Remover Tolerância" : "Dar Tolerância"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingDay(false)}
                      style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                      disabled={savingDay}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDayAssiduidade(diaObj.dataStr)}
                      style={{ background: "#2563eb", border: "none", color: "white", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "700" }}
                      disabled={savingDay}
                    >
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
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b" }}>Entrada</span>
                      <p style={{ margin: "4px 0 0 0", fontSize: "1rem", fontWeight: "bold", color: "#2563eb" }}>
                        {formatarHora(ass.hora_entrada)}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b" }}>Saída</span>
                      <p style={{ margin: "4px 0 0 0", fontSize: "1rem", fontWeight: "bold", color: "#ef4444" }}>
                        {formatarHora(ass.hora_saida)}
                      </p>
                    </div>
                  </div>

                  <div style={{ background: "white", borderRadius: "6px", padding: "10px", marginBottom: "12px", textAlign: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b", display: "block" }}>Total de Horas</span>
                    <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#2563eb" }}>{formatDurationFromSeconds(totalLiquidoSeg)}</span>
                  </div>

                  {pausaSeg > 0 && (
                    <div style={{ background: "#fef3c7", borderRadius: "6px", padding: "8px", marginBottom: "12px", textAlign: "center" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#92400e", display: "block" }}>Tempo de Pausa</span>
                      <span style={{ fontSize: "1rem", fontWeight: "bold", color: "#92400e" }}>{formatMinutesFromSeconds(pausaSeg)} minutos</span>
                    </div>
                  )}

                  {ass.observacoes && (
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b" }}>Observações</span>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#475569", padding: "8px", background: "white", borderRadius: "4px" }}>
                        {ass.observacoes}
                      </p>
                    </div>
                  )}

                  {diaObj.ausenciasDiaParciais.length > 0 && (
                    <div style={{ marginTop: "12px", padding: "10px", borderRadius: "6px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#1e40af", display: "block", marginBottom: "6px" }}>Ausência Parcial</span>
                      {diaObj.ausenciasDiaParciais.map((a) => (
                        <div key={a.id} style={{ fontSize: "0.9rem", color: "#334155", marginBottom: "4px" }}>
                          {a.tipo} - {formatarHora(a.hora_inicio)} às {formatarHora(a.hora_fim)}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => openEditForDay(diaObj)}
                      style={{ background: "white", border: "1px solid #cbd5e1", color: "#334155", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                    >
                      Editar Assiduidade
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setShowDeleteModal(true); setDeleteTarget(diaObj); setDeleteInput(""); }}
                      style={{ background: "#ef4444", border: "none", color: "white", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                    >
                      Apagar Assiduidade
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleTolerancia(diaObj)}
                      style={{ background: "white", border: "1px solid #cbd5e1", color: "#334155", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                      disabled={toleranciaLoading}
                    >
                      {diaObj.toleranciaDia ? "Remover Tolerância" : "Dar Tolerância"}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div>
                <p style={{ color: "#94a3b8", margin: "0 0 10px 0" }}>
                  {diaObj.isFimSemana ? "Este é um fim de semana sem registos." : "Sem registos para este dia."}
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => openEditForDay(diaObj)}
                    style={{ background: "white", border: "1px solid #cbd5e1", color: "#334155", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                  >
                    Registar Assiduidade
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setShowDeleteModal(true); setDeleteTarget(diaObj); setDeleteInput(""); }}
                    style={{ background: "#ef4444", border: "none", color: "white", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                    disabled={!diaObj.assidDia}
                  >
                    Apagar Assiduidade
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleTolerancia(diaObj)}
                    style={{ background: "white", border: "1px solid #cbd5e1", color: "#334155", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                    disabled={toleranciaLoading}
                  >
                    {diaObj.toleranciaDia ? "Remover Tolerância" : "Dar Tolerância"}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Resumo do Mês */}
      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "15px", border: "1px solid #e2e8f0" }}>
        <h4 style={{ margin: "0 0 12px 0", color: "#1e293b" }}>Resumo do Mês</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          <div style={{ background: "white", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b", display: "block" }}>Total de Horas</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#2563eb" }}>{formatDurationFromSeconds(totais.totalHorasSeg)}</span>
          </div>
          <div style={{ background: "white", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b", display: "block" }}>Dias Trabalhados</span>
            <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#2563eb" }}>{totais.diasTrabalhados}</span>
          </div>
          {totais.totalPausasSeg > 0 && (
            <div style={{ background: "white", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b", display: "block" }}>Total Pausas</span>
              <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#eab308" }}>{formatMinutesFromSeconds(totais.totalPausasSeg)}min</span>
            </div>
          )}
          {totalDiasAusencia > 0 && (
            <div style={{ background: "white", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b", display: "block" }}>Dias Ausência</span>
              <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#ef4444" }}>
                {totalDiasAusencia}
              </span>
            </div>
          )}
          {totais.diasFolga > 0 && (
            <div style={{ background: "white", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b", display: "block" }}>Dias Tolerância</span>
              <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#16a34a" }}>{totais.diasFolga}</span>
            </div>
          )}
        </div>

        {temResumoAusencias && (
          <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(totais.diasAusencia).map(([tipo, dias]) =>
              dias > 0 ? (
                <span
                  key={tipo}
                  style={{
                    fontSize: "0.8rem",
                    background: "#fee2e2",
                    color: "#991b1b",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontWeight: "500",
                  }}
                >
                  {tipo}: {dias}d
                </span>
              ) : null
            )}
            {totais.diasFolga > 0 ? (
              <span
                key="Tolerância"
                style={{
                  fontSize: "0.8rem",
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontWeight: "500",
                }}
              >
                Tolerância: {totais.diasFolga}d
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Modal de confirmação para apagar assiduidade individual */}
      {showDeleteModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.25)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "white", borderRadius: "10px", padding: 32, minWidth: 320, boxShadow: "0 2px 16px rgba(0,0,0,0.15)" }}>
            <h3 style={{ color: "#ef4444", marginTop: 0 }}>Apagar Assiduidade</h3>
            <p>Tem a certeza que quer apagar este registo de assiduidade? Esta ação é <b>irreversível</b>.<br/>Para confirmar, escreva <b>APAGAR</b> abaixo:</p>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Digite APAGAR para confirmar"
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", marginBottom: 16 }}
              autoFocus
              disabled={deleteLoading}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteInput(""); setDeleteTarget(null); }}
                style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAssiduidade(deleteTarget)}
                style={{ background: "#ef4444", border: "none", color: "white", padding: "8px 12px", borderRadius: "6px", cursor: deleteInput !== "APAGAR" || deleteLoading ? "not-allowed" : "pointer", fontWeight: "700", opacity: deleteInput !== "APAGAR" ? 0.6 : 1 }}
                disabled={deleteInput !== "APAGAR" || deleteLoading}
              >
                {deleteLoading ? "A apagar..." : "Apagar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação para preenchimento em lote do mês */}
      {showBulkModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "white", borderRadius: "10px", padding: 32, minWidth: 320, maxWidth: 500, boxShadow: "0 2px 16px rgba(0,0,0,0.15)" }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <Icons.Activity color="#10b981" size={24} />
                <h3 style={{ color: "#065f46", margin: 0 }}>Preencher Mês Completo</h3>
            </div>
            <p style={{color: '#475569', lineHeight: 1.5, fontSize: '0.95rem'}}>
                Confirma que quer marcar assiduidade das <b>09:00 - 18:00</b> com <b>60 minutos</b> de pausa para <b>todos os dias úteis</b> do mês de {nomesMeses[mesAtual]} para o colaborador {userName}?
            </p>
            <p style={{fontSize: '0.85rem', color: '#64748b'}}>
                <i>Nota: O sistema ignora fins de semana, feriados, e dias que já tenham ausências ou registos de assiduidade marcados.</i>
            </p>
            <p style={{marginTop: '20px', fontWeight: 'bold'}}>Para confirmar, escreva "SIM" ou "CONFIRMO" abaixo:</p>
            
            <input
              type="text"
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              placeholder="Digite SIM para confirmar"
              style={{ width: "100%", padding: '10px 12px', borderRadius: 6, border: "1px solid #cbd5e1", marginBottom: 20, fontSize: '1rem' }}
              autoFocus
              disabled={bulkLoading}
            />
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => { setShowBulkModal(false); setBulkInput(""); }}
                style={{ flex: 1, background: "white", border: "1px solid #cbd5e1", color: "#475569", padding: "10px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", transition: "0.2s" }}
                disabled={bulkLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkFillMonth}
                style={{ 
                    flex: 1, background: "#10b981", border: "none", color: "white", padding: "10px 12px", borderRadius: "6px", 
                    cursor: (bulkInput.trim().toUpperCase() !== "SIM" && bulkInput.trim().toUpperCase() !== "CONFIRMO") || bulkLoading ? "not-allowed" : "pointer", 
                    fontWeight: "700", 
                    opacity: (bulkInput.trim().toUpperCase() !== "SIM" && bulkInput.trim().toUpperCase() !== "CONFIRMO") ? 0.5 : 1,
                    transition: "0.2s" 
                }}
                disabled={(bulkInput.trim().toUpperCase() !== "SIM" && bulkInput.trim().toUpperCase() !== "CONFIRMO") || bulkLoading}
              >
                {bulkLoading ? "A preencher..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}