import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import gerarRelatorioRecursosHumanos from "../components/pdfRecursosHumanos";
import gerarRelatorioIndividual from "../components/pdfIndividual";
import gerarRelatorioDeslocacoesMensais from "../components/pdfDeslocacoesMensais";
import CalendarioColaborador from "../components/CalendarioColaborador";
import {
    calcularDiasUteis as calcularDiasUteisFerias,
    buildToleranciasSkipSet,
    calcularDiasUteisNoMes,
    formatAbsenceTypeLabel,
    getAnnualVacationLimitFromProfile,
    getAttendanceCalculationStartDate,
    getFeriados,
    isVacationType,
    normalizeAbsenceType,
    parseLocalDate,
    sincronizarSaldoFeriasPerfil,
    validarSaldoFeriasParaIntervalo,
} from "../utils/feriasSaldo";
import "./../styles/dashboard.css"; 

// --- ÍCONES SVG ESTILO SAAS ---
const Icons = {
  Users: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Chart: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  Inbox: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>,
  Check: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  X: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Eye: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Sun: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  HeartPulse: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M12 5 9.04 9.2a1.2 1.2 0 0 0-1.2.9"></path><path d="M13 10h-2"></path><path d="M12 11v2"></path></svg>,
  Clock: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    Calendar: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Flag: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>,
  Cake: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"></path><path d="M2 21h20"></path><path d="M7 8v3"></path><path d="M12 8v3"></path><path d="M17 8v3"></path><path d="M7 4h.01"></path><path d="M12 4h.01"></path><path d="M17 4h.01"></path></svg>,
  Currency: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="18" x2="12" y2="6"></line></svg>,
  User: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Edit: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Paperclip: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>,
  Trash: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  ChevronLeft: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
  ChevronRight: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
  Info: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
  Alert: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  FileText: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Download: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const composeEventHandlers = (originalHandler, nextHandler) => (event) => {
    if (typeof originalHandler === "function") {
        originalHandler(event);
    }
    if (!event.defaultPrevented) {
        nextHandler(event);
    }
};

const ModernTooltip = ({ content, children }) => {
    const triggerRef = useRef(null);
    const tooltipIdRef = useRef(`rh-tooltip-${Math.random().toString(36).slice(2, 10)}`);
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, placement: "top" });

    const updatePosition = () => {
        const node = triggerRef.current;
        if (!node) return;

        const rect = node.getBoundingClientRect();
        const shouldRenderTop = rect.top > 90;

        setPosition({
            top: shouldRenderTop ? rect.top - 10 : rect.bottom + 10,
            left: rect.left + (rect.width / 2),
            placement: shouldRenderTop ? "top" : "bottom",
        });
    };

    useEffect(() => {
        if (!isOpen) return undefined;

        updatePosition();
        const onViewportChange = () => updatePosition();
        window.addEventListener("scroll", onViewportChange, true);
        window.addEventListener("resize", onViewportChange);

        return () => {
            window.removeEventListener("scroll", onViewportChange, true);
            window.removeEventListener("resize", onViewportChange);
        };
    }, [isOpen]);

    if (!content || !React.isValidElement(children)) {
        return children;
    }

    const child = React.Children.only(children);
    const handleOpen = () => {
        updatePosition();
        setIsOpen(true);
    };
    const handleClose = () => setIsOpen(false);

    const childRef = child.ref;
    const setMergedRef = (node) => {
        triggerRef.current = node;
        if (typeof childRef === "function") {
            childRef(node);
        } else if (childRef && typeof childRef === "object") {
            childRef.current = node;
        }
    };

    return (
        <>
            {React.cloneElement(child, {
                ref: setMergedRef,
                onMouseEnter: composeEventHandlers(child.props.onMouseEnter, handleOpen),
                onMouseLeave: composeEventHandlers(child.props.onMouseLeave, handleClose),
                onFocus: composeEventHandlers(child.props.onFocus, handleOpen),
                onBlur: composeEventHandlers(child.props.onBlur, handleClose),
                "aria-describedby": isOpen ? tooltipIdRef.current : child.props["aria-describedby"],
            })}
            {isOpen && createPortal(
                <div
                    id={tooltipIdRef.current}
                    role="tooltip"
                    style={{
                        position: "fixed",
                        left: position.left,
                        top: position.top,
                        transform: position.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
                        zIndex: 12000,
                        pointerEvents: "none",
                        maxWidth: "300px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #bfdbfe",
                        background: "#eff6ff",
                        boxShadow: "0 10px 22px rgba(29, 78, 216, 0.14)",
                        color: "#1d4ed8",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        lineHeight: 1.35,
                        textAlign: "left",
                    }}
                >
                    {content}
                    <span
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            left: "50%",
                            width: "9px",
                            height: "9px",
                            borderRadius: "1px",
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            transform: "translateX(-50%) rotate(45deg)",
                            ...(position.placement === "top"
                                ? { bottom: "-5px", borderTop: "none", borderLeft: "none" }
                                : { top: "-5px", borderBottom: "none", borderRight: "none" }),
                        }}
                    />
                </div>,
                document.body,
            )}
        </>
    );
};

const EMPRESAS_INTERNAS = ["Neomarca", "Geoflicks", "2 Siglas", "Fator Triplo"];

const toUniqueCompanies = (values = []) => [...new Set((values || []).filter(Boolean))];

const getProfileCompanies = (profile) => {
    if (Array.isArray(profile?.empresas_internas) && profile.empresas_internas.length > 0) {
            return toUniqueCompanies(profile.empresas_internas);
    }

    if (profile?.empresa_interna) {
            return [profile.empresa_interna];
    }

    return [];
};

const formatCompaniesLabel = (profile) => {
    const companies = getProfileCompanies(profile);
    return companies.length > 0 ? companies.join(" • ") : "Sem Empresa";
};

const isMissingTableError = (error) => {
    if (!error) return false;
    return error.code === "42P01" || /does not exist|relation .* does not exist/i.test(error.message || "");
};

const isMissingColumnError = (error) => {
    if (!error) return false;
    return error.code === "42703" || /column .* does not exist/i.test(error.message || "");
};

const MIN_SA_WORK_SECONDS = 4 * 60 * 60;

const timeToSeconds = (timeValue) => {
    if (!timeValue || typeof timeValue !== "string") return null;

    const [hours = "0", minutes = "0", seconds = "0"] = timeValue.split(":");
    const h = Number(hours);
    const m = Number(minutes);
    const s = Number(seconds);

    if (![h, m, s].every(Number.isFinite)) return null;
    return (h * 3600) + (m * 60) + s;
};

const getEffectiveWorkedSeconds = (attendanceRow) => {
    const entradaSeg = timeToSeconds(attendanceRow?.hora_entrada);
    const saidaSeg = timeToSeconds(attendanceRow?.hora_saida);

    if (entradaSeg === null || saidaSeg === null || saidaSeg <= entradaSeg) return 0;

    const pausaSeg = Math.max(0, Number(attendanceRow?.tempo_pausa_acumulado) || 0);
    return Math.max(0, saidaSeg - entradaSeg - pausaSeg);
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

export default function RecursosHumanos() {
    const DEFAULT_KM_RATE = 0.4;
    const KM_RATE_STORAGE_KEY = "rh_km_reembolso_eur";
    const KM_RATE_SETTING_KEY = "rh_km_reembolso_eur";
    const KM_REQUEST_TYPE = "Pedido de Km's";
    const TOLERANCIA_TIPO = "Tolerância de Ponto";
    const TOLERANCIA_TIPOS = [
        TOLERANCIA_TIPO,
        "Tolerancia de Ponto",
        "tolerancia",
        "tolerância",
    ];
    const isToleranceType = (tipo = "") => normalizeAbsenceType(tipo).includes("tolerancia");

  const { user } = useAuth();
  
  const [colaboradores, setColaboradores] = useState([]);
    const [hasDiasFeriasTotalColumn, setHasDiasFeriasTotalColumn] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); 
  
  // Dados
  const [pedidosPendentes, setPedidosPendentes] = useState([]); 
  const [pedidosKmPendentes, setPedidosKmPendentes] = useState([]); 
  const [assiduidadeMes, setAssiduidadeMes] = useState([]);
  const [ausenciasMes, setAusenciasMes] = useState([]);
  const [historicoUser, setHistoricoUser] = useState([]); 

  // UI States
  const [activeView, setActiveView] = useState("gestao"); 
  const [globalSA, setGlobalSA] = useState(10.20); 
    const [valorKmReembolso, setValorKmReembolso] = useState(String(DEFAULT_KM_RATE.toFixed(2)));
    const [hasKmRateSettingTable, setHasKmRateSettingTable] = useState(true);
    const [isSavingKmRate, setIsSavingKmRate] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
    const [isGeneratingRhPdf, setIsGeneratingRhPdf] = useState(false);
    const [isGeneratingIndividualPdf, setIsGeneratingIndividualPdf] = useState(false);
        const [isGeneratingDeslocacoesPdf, setIsGeneratingDeslocacoesPdf] = useState(false);

  // Tolerâncias de Ponto
  const [tolerancias, setTolerancias] = useState([]);
  const [showToleranciaModal, setShowToleranciaModal] = useState(false);
  const [newTolerancia, setNewTolerancia] = useState({ nome: '', data: '', tipo: 'global', user_id: '' });
  const [isSubmittingTolerancia, setIsSubmittingTolerancia] = useState(false);
  
  // UI Abas do Colaborador
  const [userTab, setUserTab] = useState("financeiro"); 
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [tempUserProfile, setTempUserProfile] = useState({}); 

  // Modais de Ausência
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [isEditingAbsence, setIsEditingAbsence] = useState(false);
  const [editingAbsenceData, setEditingAbsenceData] = useState(null);
  
  const [newAbsence, setNewAbsence] = useState({ 
      user_id: "", tipo: "Férias", data_inicio: "", data_fim: "", 
      is_parcial: false, hora_inicio: "", hora_fim: "", motivo: "",
      km_origem: "", km_destino: "", km_total: ""
  });
  
  const [absenceFile, setAbsenceFile] = useState(null); 
  const [diasUteisModal, setDiasUteisModal] = useState(0); 

  const [confirmModal, setConfirmModal] = useState({ show: false, pedido: null, acao: null });
  const [detailsModal, setDetailsModal] = useState({ show: false, pedido: null }); // NOVO: Modal de Detalhes
    const [showBulkSAConfirmModal, setShowBulkSAConfirmModal] = useState(false);
    const [pendingGlobalUpdates, setPendingGlobalUpdates] = useState({ sa: false, km: false });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [isApplyingBulkSA, setIsApplyingBulkSA] = useState(false);

  const toLocalDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const parseKmRate = (rawValue) => {
      const normalized = String(rawValue ?? "").replace(",", ".");
      const parsed = Number(normalized);
      if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_KM_RATE;
      return parsed;
  };

  const saveKmRateSetting = async (rawValue, { showError = true } = {}) => {
      const normalized = String(rawValue ?? "").replace(",", ".").trim();
      const parsed = Number(normalized);

      if (!Number.isFinite(parsed) || parsed <= 0) {
          if (showError) showNotification("Introduza um valor €/KM válido.", "error");
          setValorKmReembolso(DEFAULT_KM_RATE.toFixed(2));
          localStorage.setItem(KM_RATE_STORAGE_KEY, DEFAULT_KM_RATE.toString());
          return false;
      }

      setValorKmReembolso(parsed.toFixed(2));
      localStorage.setItem(KM_RATE_STORAGE_KEY, parsed.toString());

      if (!hasKmRateSettingTable) return true;

      try {
          setIsSavingKmRate(true);
          const { error } = await supabase
              .from("app_settings")
              .upsert(
                  { setting_key: KM_RATE_SETTING_KEY, setting_value: parsed.toString() },
                  { onConflict: "setting_key" },
              );

          if (error) {
              if (isMissingTableError(error)) {
                  setHasKmRateSettingTable(false);
                  return true;
              }
              throw error;
          }
          return true;
      } catch (error) {
          if (showError) showNotification("Não foi possível guardar o valor €/KM na Supabase.", "error");
          return false;
      } finally {
          setIsSavingKmRate(false);
      }
  };

  const getAttendanceStartForUser = (userId) => {
      const profile = colaboradores.find((c) => c.id === userId);
      return getAttendanceCalculationStartDate(profile?.data_admissao);
  };

    useEffect(() => {
        async function initRhData() {
                try {
                        await detectarColunaDiasFeriasTotal();
                        fetchColaboradores();
                        fetchPedidosPendentes();
                        fetchPedidosKmPendentes();
                        fetchTolerancias();
                } catch (error) {
                        console.error("Erro ao inicializar RH:", error);
                        showNotification("Erro ao iniciar dados de RH.", "error");
                }
        }

        initRhData();
    }, []);

  useEffect(() => {
      const savedRate = localStorage.getItem(KM_RATE_STORAGE_KEY);
      if (!savedRate) return;
      const parsed = Number(savedRate);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      setValorKmReembolso(parsed.toFixed(2));
  }, []);

  useEffect(() => {
      let isMounted = true;

      const fetchKmRateSetting = async () => {
          const { data, error } = await supabase
              .from("app_settings")
              .select("setting_value")
              .eq("setting_key", KM_RATE_SETTING_KEY)
              .maybeSingle();

          if (error) {
              if (isMissingTableError(error)) {
                  if (isMounted) setHasKmRateSettingTable(false);
                  return;
              }
              return;
          }

          const parsed = Number(data?.setting_value);
          if (!Number.isFinite(parsed) || parsed <= 0) return;

          if (!isMounted) return;
          setValorKmReembolso(parsed.toFixed(2));
          localStorage.setItem(KM_RATE_STORAGE_KEY, parsed.toString());
      };

      fetchKmRateSetting();

      return () => {
          isMounted = false;
      };
  }, []);

  useEffect(() => {
            fetchDadosMensais();
        }, [selectedUser, currentDate, colaboradores]);

    useEffect(() => {
        if (!selectedUser) {
                setHistoricoUser([]);
                setTempUserProfile({});
                setIsEditingUser(false);
                return;
    }

        fetchHistoricoUser(selectedUser);
    }, [selectedUser]);

    useEffect(() => {
            if (!selectedUser || isEditingUser) return;

            const u = colaboradores.find((c) => c.id === selectedUser);
            setTempUserProfile(
                    u
                            ? {
                                        ...u,
                            dias_ferias_total:
                                u.dias_ferias_total ?? u.dias_ferias ?? 22,
                                        empresas_internas: getProfileCompanies(u),
                                }
                            : {},
            );
    }, [selectedUser, colaboradores, isEditingUser]);

  useEffect(() => {
      if (!newAbsence.is_parcial && newAbsence.data_inicio && newAbsence.data_fim) {
          const inicio = new Date(newAbsence.data_inicio);
          const fim = new Date(newAbsence.data_fim);
          
          if (inicio <= fim) {
              const skipDates = buildToleranciasSkipSet(tolerancias, newAbsence.user_id || null);
              setDiasUteisModal(calcularDiasUteisFerias(newAbsence.data_inicio, newAbsence.data_fim, skipDates));
          } else {
              setDiasUteisModal(0);
          }
      } else {
          setDiasUteisModal(0);
      }
  }, [newAbsence.data_inicio, newAbsence.data_fim, newAbsence.is_parcial, newAbsence.user_id, tolerancias]);

  const showNotification = (msg, type = 'success') => {
      setNotification({ show: true, message: msg, type });
  };

  async function getDiasLimiteAnualAtualPorUserId(userId) {
      const selectColumns = hasDiasFeriasTotalColumn
          ? "dias_ferias_total, dias_ferias"
          : "dias_ferias";

      const { data, error } = await supabase
          .from("profiles")
          .select(selectColumns)
          .eq("id", userId)
          .single();
      if (error) throw error;

      return getAnnualVacationLimitFromProfile(data);
  }

  const getDiasDisponiveisPorUserId = (userId) => {
      const profile = colaboradores.find((c) => c.id === userId);
      const value = Number(profile?.dias_ferias);
      return Number.isFinite(value) ? value : 0;
  };

  const calcularDiasFeriasComTolerancias = (userId, dataInicio, dataFim) => {
      const skipDates = buildToleranciasSkipSet(tolerancias, userId || null);
      return calcularDiasUteisFerias(dataInicio, dataFim || dataInicio, skipDates);
  };

  async function detectarColunaDiasFeriasTotal() {
      const { error } = await supabase
          .from("profiles")
          .select("dias_ferias_total")
          .limit(1);

      if (error && isMissingColumnError(error)) {
          setHasDiasFeriasTotalColumn(false);
          return false;
      }

      if (error) throw error;

      setHasDiasFeriasTotalColumn(true);
      return true;
  }

  async function atualizarSaldoFeriasDireto(userId, delta) {
      if (!userId || !Number.isFinite(delta) || delta === 0) return;

      const { data, error } = await supabase
          .from("profiles")
          .select("dias_ferias")
          .eq("id", userId)
          .single();
      if (error) throw error;

      const atual = Number(data?.dias_ferias) || 0;
      const novoSaldo = Math.max(0, atual + delta);
      const { error: updateError } = await supabase
          .from("profiles")
          .update({ dias_ferias: novoSaldo })
          .eq("id", userId);
      if (updateError) throw updateError;
  }

  async function temFeriasAprovadasNoDia(userId, data) {
      const { data: pedidos, error } = await supabase
          .from("ferias")
          .select("id, tipo, is_parcial")
          .eq("user_id", userId)
          .eq("estado", "aprovado")
          .lte("data_inicio", data)
          .gte("data_fim", data);
      if (error) throw error;

      return (pedidos || []).some((pedido) => !pedido.is_parcial && isVacationType(pedido.tipo));
  }

  async function existeOutraToleranciaAtivaNoDia({ userId, data, excludeToleranceId = null }) {
      let query = supabase
          .from("ferias")
          .select("id")
          .in("tipo", TOLERANCIA_TIPOS)
          .neq("estado", "cancelado")
          .neq("estado", "rejeitado")
          .lte("data_inicio", data)
          .gte("data_fim", data);

      if (excludeToleranceId) query = query.neq("id", excludeToleranceId);
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);

      const { data: matches, error } = await query;
      if (error) throw error;

      return (matches || []).length > 0;
  }

  async function aplicarAjusteToleranciaLegacy({ userId, data, movimento, excludeToleranceId = null }) {
      const existeOutra = await existeOutraToleranciaAtivaNoDia({
          userId,
          data,
          excludeToleranceId,
      });

      if (movimento === "add" && existeOutra) return;
      if (movimento === "remove" && existeOutra) return;

      const temFerias = await temFeriasAprovadasNoDia(userId, data);
      if (!temFerias) return;

      const delta = movimento === "add" ? 1 : -1;
      await atualizarSaldoFeriasDireto(userId, delta);
  }

  async function sincronizarSaldoFeriasDosPerfis(userIds = []) {
      if (!hasDiasFeriasTotalColumn) return;

      const idsUnicos = [...new Set((userIds || []).filter(Boolean))];
      if (idsUnicos.length === 0) return;

      await Promise.all(
          idsUnicos.map(async (userId) => {
              const diasLimiteAnual = await getDiasLimiteAnualAtualPorUserId(userId);
              return sincronizarSaldoFeriasPerfil({
                  supabaseClient: supabase,
                  userId,
                  diasLimiteAnual,
              });
          }),
      );
  }

  async function fetchTolerancias() {
    try {
        const { data, error } = await supabase
            .from("ferias")
            .select("id, user_id, tipo, motivo, data_inicio, estado")
            .in("tipo", TOLERANCIA_TIPOS)
            .neq("estado", "cancelado")
            .neq("estado", "rejeitado")
            .order("data_inicio", { ascending: true });
        if (error) throw error;

        const mapped = (data || []).map((item) => ({
            id: item.id,
            user_id: item.user_id,
            nome: item.motivo || item.tipo || TOLERANCIA_TIPO,
            data: item.data_inicio,
        }));

        setTolerancias(mapped);
    } catch (error) {
        console.error("Erro ao carregar tolerâncias:", error);
    }
  }

  async function handleSaveTolerancia(e) {
    e.preventDefault();
    if (newTolerancia.tipo === 'individual' && !newTolerancia.user_id) {
        return showNotification("Selecione um colaborador.", "error");
    }
    setIsSubmittingTolerancia(true);
    try {
        const payload = {
            tipo: TOLERANCIA_TIPO,
            motivo: newTolerancia.nome.trim() || TOLERANCIA_TIPO,
            data_inicio: newTolerancia.data,
            data_fim: newTolerancia.data,
            is_parcial: false,
            estado: "aprovado",
            user_id: newTolerancia.tipo === 'individual' ? newTolerancia.user_id : null,
        };
        const { data: insertedTolerance, error } = await supabase
            .from("ferias")
            .insert([payload])
            .select("id, data_inicio")
            .single();
        if (error) throw error;

        const colaboradoresAfetados = payload.user_id
            ? [payload.user_id]
            : (colaboradores || []).map((c) => c.id);

        if (hasDiasFeriasTotalColumn) {
            await sincronizarSaldoFeriasDosPerfis(colaboradoresAfetados);
        } else {
            for (const userId of colaboradoresAfetados) {
                await aplicarAjusteToleranciaLegacy({
                    userId,
                    data: payload.data_inicio,
                    movimento: "add",
                    excludeToleranceId: insertedTolerance?.id || null,
                });
            }
        }

        setShowToleranciaModal(false);
        fetchTolerancias();
        fetchColaboradores();
        showNotification("Tolerância adicionada com sucesso!", "success");
    } catch (err) {
        showNotification("Erro ao guardar tolerância: " + err.message, "error");
    } finally {
        setIsSubmittingTolerancia(false);
    }
  }

  async function handleDeleteTolerancia(id) {
    if (!window.confirm("Eliminar esta tolerância?")) return;
    try {
                let toleranciaAlvo = tolerancias.find((t) => t.id === id);
                if (!toleranciaAlvo) {
                    const { data: dbTolerance } = await supabase
                        .from("ferias")
                        .select("id, user_id, data_inicio")
                        .eq("id", id)
                        .single();
                    if (dbTolerance) {
                        toleranciaAlvo = {
                            id: dbTolerance.id,
                            user_id: dbTolerance.user_id,
                            data: dbTolerance.data_inicio,
                        };
                    }
                }
                const { error } = await supabase
                        .from("ferias")
                        .update({ estado: "cancelado" })
                        .eq("id", id);
        if (error) throw error;

        const colaboradoresAfetados = toleranciaAlvo?.user_id
            ? [toleranciaAlvo.user_id]
            : (colaboradores || []).map((c) => c.id);

        if (hasDiasFeriasTotalColumn) {
            await sincronizarSaldoFeriasDosPerfis(colaboradoresAfetados);
        } else if (toleranciaAlvo?.data) {
            for (const userId of colaboradoresAfetados) {
                await aplicarAjusteToleranciaLegacy({
                    userId,
                    data: toleranciaAlvo.data,
                    movimento: "remove",
                    excludeToleranceId: id,
                });
            }
        }

        fetchTolerancias();
        fetchColaboradores();
        showNotification("Tolerância eliminada.", "success");
    } catch (err) {
        showNotification("Erro ao eliminar tolerância: " + err.message, "error");
    }
  }

  async function fetchColaboradores() {
    try {
        const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("*").order("nome");
        if (profilesError) throw profilesError;

        const { data: relData, error: relError } = await supabase
            .from("profile_empresas")
            .select("user_id, empresa");

        const hasRelationTable = !relError;
        const relationByUser = new Map();

        if (hasRelationTable) {
            (relData || []).forEach((row) => {
                if (!relationByUser.has(row.user_id)) relationByUser.set(row.user_id, []);
                relationByUser.get(row.user_id).push(row.empresa);
            });
        }

        const mappedProfiles = (profilesData || []).map((profile) => {
            const relationCompanies = hasRelationTable ? toUniqueCompanies(relationByUser.get(profile.id) || []) : [];
            const fallbackCompanies = getProfileCompanies(profile);
            const empresasInternas = relationCompanies.length > 0 ? relationCompanies : fallbackCompanies;

            return {
                ...profile,
                empresas_internas: empresasInternas,
                dias_ferias_total: hasDiasFeriasTotalColumn
                    ? (profile.dias_ferias_total ?? null)
                    : null,
                empresa_interna: empresasInternas[0] || profile.empresa_interna || ""
            };
        });

        setColaboradores(mappedProfiles);
    } catch (error) {
        console.error(error);
        showNotification("Erro ao carregar colaboradores.", "error");
    }
  }

  async function fetchPedidosPendentes() {
    const { data, error } = await supabase
        .from("ferias")
        .select("*, profiles(nome, empresa_interna)")
        .in("estado", ["pendente", "pedido_cancelamento"]) 
        .neq("tipo", KM_REQUEST_TYPE)
        .order("created_at", { ascending: false });
    if(!error && data) setPedidosPendentes(data);
  }

  async function fetchPedidosKmPendentes() {
    const { data, error } = await supabase
        .from("ferias")
        .select("*, profiles(nome, empresa_interna)")
        .in("estado", ["pendente", "pedido_cancelamento"]) 
        .eq("tipo", KM_REQUEST_TYPE)
        .order("created_at", { ascending: false });
    if(!error && data) setPedidosKmPendentes(data);
  }

  async function fetchHistoricoUser(userId) {
      const { data } = await supabase
          .from("ferias")
          .select("*")
          .eq("user_id", userId)
          .order("data_inicio", { ascending: false });
      if (data) setHistoricoUser(data);
  }

  async function fetchDadosMensais() {
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
                const endOfMonth = toLocalDateString(new Date(year, month, 0));
        const startOfAttendanceWindow = selectedUser
            ? getAttendanceStartForUser(selectedUser)
            : getAttendanceCalculationStartDate(startOfMonth);

        let qAssiduidade = supabase.from("assiduidade").select("*").gte("data_registo", startOfAttendanceWindow).lte("data_registo", endOfMonth);
        if (selectedUser) qAssiduidade = qAssiduidade.eq("user_id", selectedUser);
        const { data: dAssiduidade } = await qAssiduidade;
        setAssiduidadeMes(dAssiduidade || []);

        let qFerias = supabase
            .from("ferias")
            .select("*")
            .neq('estado', 'rejeitado')
            .neq('estado', 'cancelado')
            .lte("data_inicio", endOfMonth)
            .gte("data_fim", startOfAttendanceWindow);
        if (selectedUser) qFerias = qFerias.or(`user_id.eq.${selectedUser},user_id.is.null`);
        const { data: dFerias } = await qFerias;
        setAusenciasMes(dFerias || []);
    } catch (err) { console.error(err); }
  }

  function calcularDiasUteis(dataInicio, dataFim) {
      return calcularDiasUteisFerias(dataInicio, dataFim);
  }

  function abrirModalConfirmacao(pedido, acao) {
      setConfirmModal({ show: true, pedido, acao });
      setDetailsModal({ show: false, pedido: null }); // Fecha o de detalhes se estiver aberto
  }

  function abrirModalDetalhes(pedido) {
      setDetailsModal({ show: true, pedido });
  }

  async function executarAcaoRH() {
      const { pedido, acao } = confirmModal;
      try {
          const eFerias = isVacationType(pedido.tipo);
          const profile = colaboradores.find((c) => c.id === pedido.user_id);
          const diasLimiteAnual = getAnnualVacationLimitFromProfile(profile);
          const diasPedidoFerias =
              eFerias && !pedido.is_parcial
                  ? calcularDiasFeriasComTolerancias(
                        pedido.user_id,
                        pedido.data_inicio,
                        pedido.data_fim || pedido.data_inicio,
                    )
                  : 0;
          let novoEstadoDB = '';

          if (acao === 'aprovar') {
              if (diasPedidoFerias > 0) {
                  if (!hasDiasFeriasTotalColumn) {
                      const saldoAtual = getDiasDisponiveisPorUserId(pedido.user_id);
                      if (diasPedidoFerias > saldoAtual) {
                          throw new Error(`Saldo insuficiente: pedido de ${diasPedidoFerias} dia(s), disponível ${saldoAtual}.`);
                      }
                  } else {
                      const saldoCheck = await validarSaldoFeriasParaIntervalo({
                          supabaseClient: supabase,
                          userId: pedido.user_id,
                          dataInicio: pedido.data_inicio,
                          dataFim: pedido.data_fim || pedido.data_inicio,
                          excluirPedidoId: pedido.id,
                          diasLimiteAnual,
                          tolerancias,
                      });

                      if (!saldoCheck.ok) {
                          throw new Error(`Saldo insuficiente para ${saldoCheck.ano}: pedido de ${saldoCheck.diasPedidoNoAno} dia(s), disponível ${saldoCheck.diasDisponiveis}.`);
                      }
                  }
              }
              novoEstadoDB = 'aprovado';
          } 
          else if (acao === 'rejeitar') novoEstadoDB = 'rejeitado';
          else if (acao === 'aceitar_cancelamento' || acao === 'cancelar_direto') {
              novoEstadoDB = 'cancelado';
          }
          else if (acao === 'recusar_cancelamento') novoEstadoDB = 'aprovado';

          const { error } = await supabase.from("ferias").update({ estado: novoEstadoDB }).eq("id", pedido.id);
          if(error) throw error;
          
          const isKmRequest = pedido.tipo === KM_REQUEST_TYPE;
          if (!isKmRequest && pedido.user_id) {
              if (hasDiasFeriasTotalColumn) {
                  await sincronizarSaldoFeriasDosPerfis([pedido.user_id]);
              } else if (diasPedidoFerias > 0) {
                  if (acao === 'aprovar') {
                      await atualizarSaldoFeriasDireto(pedido.user_id, -diasPedidoFerias);
                  }
                  if (acao === 'aceitar_cancelamento' || acao === 'cancelar_direto') {
                      await atualizarSaldoFeriasDireto(pedido.user_id, diasPedidoFerias);
                  }
              }
          }

          if (isKmRequest) {
              setPedidosKmPendentes(pedidosKmPendentes.filter(p => p.id !== pedido.id));
          } else {
              setPedidosPendentes(pedidosPendentes.filter(p => p.id !== pedido.id));
          }
          if (selectedUser) fetchHistoricoUser(selectedUser);
          fetchDadosMensais();
          fetchColaboradores();
          
          setConfirmModal({ show: false, pedido: null, acao: null });
          showNotification("Ação executada com sucesso!", "success"); 
      } catch (error) {
          showNotification("Erro ao processar: " + error.message, "error"); 
      }
  }

  const handleCCChange = (e) => {
      let value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (value.length > 12) value = value.slice(0, 12);
      let formattedValue = value;
      if (value.length > 8) formattedValue = value.slice(0, 8) + ' - ' + value.slice(8);
      if (value.length > 9) formattedValue = value.slice(0, 8) + ' - ' + value.slice(8, 9) + ' - ' + value.slice(9);
      if (value.length > 11) formattedValue = value.slice(0, 8) + ' - ' + value.slice(8, 9) + ' - ' + value.slice(9, 11) + ' - ' + value.slice(11);
      setTempUserProfile({ ...tempUserProfile, ncc: formattedValue });
  };

  const handleToggleEmpresaInterna = (empresa) => {
      setTempUserProfile((prev) => {
          const selected = toUniqueCompanies(prev.empresas_internas || []);
          const nextCompanies = selected.includes(empresa)
              ? selected.filter((item) => item !== empresa)
              : [...selected, empresa];

          return {
              ...prev,
              empresas_internas: nextCompanies,
              empresa_interna: nextCompanies[0] || ""
          };
      });
  };

  const openUserEditor = () => {
      if (!selectedUser) return;

      const u = colaboradores.find((c) => c.id === selectedUser);
      if (u) {
          setTempUserProfile({
              ...u,
              dias_ferias_total:
                  u.dias_ferias_total ?? u.dias_ferias ?? 22,
              empresas_internas: getProfileCompanies(u),
          });
      }

      setIsEditingUser(true);
  };

  async function handleUpdateUserProfile() {
      if(!selectedUser) return;
      try {
          const empresasSelecionadas = toUniqueCompanies(tempUserProfile.empresas_internas || []);
          const empresaPrincipal = empresasSelecionadas[0] || null;
          const diasFeriasTotalParsed = Number(tempUserProfile.dias_ferias_total);

          if (hasDiasFeriasTotalColumn && (!Number.isFinite(diasFeriasTotalParsed) || diasFeriasTotalParsed <= 0)) {
              throw new Error("Defina um limite anual de férias válido.");
          }

          const profilePayload = {
              valor_sa: tempUserProfile.valor_sa,
              dias_ferias: tempUserProfile.dias_ferias,
              dias_ferias_total: hasDiasFeriasTotalColumn ? diasFeriasTotalParsed : null,
              empresa_interna: empresaPrincipal,
              funcao: tempUserProfile.funcao,
              nome_completo: tempUserProfile.nome_completo,
              nif: tempUserProfile.nif,
              niss: tempUserProfile.niss,
              ncc: tempUserProfile.ncc,
              validade_cc: tempUserProfile.validade_cc || null,
              nr_dependentes: tempUserProfile.nr_dependentes,
              estado_civil: tempUserProfile.estado_civil,
              morada: tempUserProfile.morada,
              telemovel: tempUserProfile.telemovel,
              data_nascimento: tempUserProfile.data_nascimento,
              data_admissao: tempUserProfile.data_admissao || null,
              tipo_contrato: tempUserProfile.tipo_contrato,
              nacionalidade: tempUserProfile.nacionalidade,
              sexo: tempUserProfile.sexo,
              concelho: tempUserProfile.concelho,
          };

          let { error } = await supabase
              .from("profiles")
              .update(profilePayload)
              .eq("id", selectedUser);

          if (error && isMissingColumnError(error)) {
              const legacyPayload = { ...profilePayload };
              delete legacyPayload.dias_ferias_total;
              const legacyResult = await supabase
                  .from("profiles")
                  .update(legacyPayload)
                  .eq("id", selectedUser);
              error = legacyResult.error;
          }

          if(error) throw error;

          const { error: deleteRelError } = await supabase
              .from("profile_empresas")
              .delete()
              .eq("user_id", selectedUser);

          const relationTableMissing = isMissingTableError(deleteRelError);
          if (deleteRelError && !relationTableMissing) throw deleteRelError;

          if (!relationTableMissing && empresasSelecionadas.length > 0) {
              const payload = empresasSelecionadas.map((empresa) => ({ user_id: selectedUser, empresa }));
              const { error: insertRelError } = await supabase.from("profile_empresas").insert(payload);
              if (insertRelError) throw insertRelError;
          }

          if (hasDiasFeriasTotalColumn) {
              await sincronizarSaldoFeriasDosPerfis([selectedUser]);
          }

          setIsEditingUser(false);
          fetchColaboradores();
          if (relationTableMissing && empresasSelecionadas.length > 1) {
              showNotification("Dados guardados. Para multiempresa completo, falta aplicar a migration profile_empresas.", "error");
          } else {
              showNotification("Dados atualizados com sucesso!", "success");
          }
      } catch (err) { showNotification("Erro ao atualizar: " + err.message, "error"); }
  }

  async function handleDeleteUser(id) {
      if(!window.confirm("ATENÇÃO: Tem a certeza que quer apagar este colaborador?\n\nIsto irá apagar todos os dados de férias, assiduidade e perfil desta pessoa permanentemente.")) return;
      try {
          const { error } = await supabase.from("profiles").delete().eq("id", id);
          if (error) throw error;

          showNotification("Colaborador apagado com sucesso!", "success");
          setSelectedUser(null);
          fetchColaboradores();
      } catch (err) { showNotification("Erro ao apagar: " + err.message, "error"); }
  }

  async function handleBulkUpdateSA() {
      if (!pendingGlobalUpdates.sa && !pendingGlobalUpdates.km) {
          showNotification("Não existem alterações por aplicar.", "error");
          return;
      }

      if (pendingGlobalUpdates.sa) {
          const valorSA = Number(globalSA);
          if (!Number.isFinite(valorSA) || valorSA < 0) {
              showNotification("Introduza um valor de S.A. válido.", "error");
              return;
          }
      }

      if (pendingGlobalUpdates.km) {
          const valorKm = Number(String(valorKmReembolso).replace(",", "."));
          if (!Number.isFinite(valorKm) || valorKm <= 0) {
              showNotification("Introduza um valor €/KM válido.", "error");
              return;
          }
      }

      setShowBulkSAConfirmModal(true);
  }

  async function confirmarBulkUpdateSA() {
      if (!pendingGlobalUpdates.sa && !pendingGlobalUpdates.km) {
          setShowBulkSAConfirmModal(false);
          return;
      }

      try {
          setIsApplyingBulkSA(true);

          if (pendingGlobalUpdates.sa) {
              const valorSA = Number(globalSA);
              if (!Number.isFinite(valorSA) || valorSA < 0) {
                  throw new Error("Introduza um valor de S.A. válido.");
              }

              const { error } = await supabase
                  .from("profiles")
                  .update({ valor_sa: valorSA })
                  .neq('id', '00000000-0000-0000-0000-000000000000');

              if (error) throw error;
          }

          if (pendingGlobalUpdates.km) {
              const saved = await saveKmRateSetting(valorKmReembolso, { showError: false });
              if (!saved) throw new Error("Não foi possível guardar o valor €/KM.");
          }

          setShowBulkSAConfirmModal(false);
          if (pendingGlobalUpdates.sa) fetchColaboradores();
          if (pendingGlobalUpdates.sa && pendingGlobalUpdates.km) {
              showNotification("S.A. e €/KM atualizados com sucesso!", "success");
          } else if (pendingGlobalUpdates.sa) {
              showNotification("S.A. atualizado para todos!", "success");
          } else {
              showNotification("Valor €/KM atualizado com sucesso!", "success");
          }
          setPendingGlobalUpdates({ sa: false, km: false });
      } catch (err) {
          showNotification("Erro ao aplicar alterações globais: " + err.message, "error");
      } finally {
          setIsApplyingBulkSA(false);
      }
  }

  // --- FUNÇÕES DE MODAL DE AUSÊNCIA (NOVO / EDITAR) ---
  const closeAbsenceModal = () => {
      setShowAbsenceModal(false);
      setAbsenceFile(null);
      setIsEditingAbsence(false);
      setEditingAbsenceData(null);
      setNewAbsence({ 
          user_id: selectedUser || "", 
          tipo: "Férias", data_inicio: "", data_fim: "", 
          is_parcial: false, hora_inicio: "", hora_fim: "", motivo: "",
          km_origem: "", km_destino: "", km_total: ""
      });
  };

  const handleEditClick = (absenceData) => {
      setIsEditingAbsence(true);
      setEditingAbsenceData(absenceData);
      setNewAbsence({
          user_id: absenceData.user_id,
          tipo: absenceData.tipo === KM_REQUEST_TYPE ? KM_REQUEST_TYPE : formatAbsenceTypeLabel(absenceData.tipo),
          data_inicio: absenceData.data_inicio,
          data_fim: absenceData.data_fim,
          is_parcial: absenceData.is_parcial || false,
          hora_inicio: absenceData.hora_inicio || "",
          hora_fim: absenceData.hora_fim || "",
          motivo: absenceData.motivo || "",
          km_origem: absenceData.km_origem || "",
          km_destino: absenceData.km_destino || "",
          km_total: absenceData.km_total ?? ""
      });
      setShowAbsenceModal(true);
  };

  async function handleSaveAbsence(e) {
      e.preventDefault();
      const isKmRequest = newAbsence.tipo === KM_REQUEST_TYPE;
      
      if (!newAbsence.user_id) return showNotification("Selecione um colaborador!", "error");
      if (!newAbsence.data_inicio || (!isKmRequest && !newAbsence.is_parcial && !newAbsence.data_fim)) return showNotification("Selecione as datas!", "error");
      if (!isKmRequest && !newAbsence.is_parcial && diasUteisModal === 0) return showNotification("O período não contém dias úteis.", "error");
      if (!isKmRequest && !newAbsence.is_parcial && parseLocalDate(newAbsence.data_inicio) > parseLocalDate(newAbsence.data_fim)) return showNotification("A data de fim é inválida.", "error");
      if (isKmRequest) {
          const kmTotal = Number(newAbsence.km_total);
          if (!newAbsence.km_origem.trim() || !newAbsence.km_destino.trim()) return showNotification("Preencha os campos De e Para.", "error");
          if (!Number.isFinite(kmTotal) || kmTotal <= 0) return showNotification("Introduza um Km total válido.", "error");
      }

      setIsSubmitting(true);
      try {
          const normalizedTipo = newAbsence.tipo === KM_REQUEST_TYPE ? KM_REQUEST_TYPE : formatAbsenceTypeLabel(newAbsence.tipo);
          const isNewFerias = !newAbsence.is_parcial && isVacationType(normalizedTipo);
          const dataFimFinal = isKmRequest
              ? newAbsence.data_inicio
              : (newAbsence.is_parcial ? newAbsence.data_inicio : newAbsence.data_fim);

          const profile = colaboradores.find((c) => c.id === newAbsence.user_id);
          const diasLimiteAnual = getAnnualVacationLimitFromProfile(profile);

          const diasFeriasAntigos =
              isEditingAbsence &&
              editingAbsenceData?.estado === 'aprovado' &&
              !editingAbsenceData?.is_parcial &&
              isVacationType(editingAbsenceData?.tipo)
                  ? calcularDiasFeriasComTolerancias(
                        editingAbsenceData.user_id,
                        editingAbsenceData.data_inicio,
                        editingAbsenceData.data_fim || editingAbsenceData.data_inicio,
                    )
                  : 0;

          const diasFeriasNovos = isNewFerias
              ? calcularDiasFeriasComTolerancias(newAbsence.user_id, newAbsence.data_inicio, dataFimFinal)
              : 0;

          let anexo_url = isEditingAbsence ? editingAbsenceData.anexo_url : null;
          if (absenceFile) {
              const fileExt = absenceFile.name.split('.').pop();
              const fileName = `${newAbsence.user_id}_RH_${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from("rh_anexos").upload(fileName, absenceFile);
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from("rh_anexos").getPublicUrl(fileName);
              anexo_url = publicUrl;
          }

          if (isNewFerias) {
              if (!hasDiasFeriasTotalColumn) {
                  const deltasPorUser = new Map();
                  if (diasFeriasAntigos > 0 && editingAbsenceData?.user_id) {
                      deltasPorUser.set(
                          editingAbsenceData.user_id,
                          (deltasPorUser.get(editingAbsenceData.user_id) || 0) + diasFeriasAntigos,
                      );
                  }
                  if (diasFeriasNovos > 0) {
                      deltasPorUser.set(
                          newAbsence.user_id,
                          (deltasPorUser.get(newAbsence.user_id) || 0) - diasFeriasNovos,
                      );
                  }

                  for (const [userId, delta] of deltasPorUser.entries()) {
                      if (delta >= 0) continue;
                      const saldoAtual = getDiasDisponiveisPorUserId(userId);
                      if (saldoAtual < Math.abs(delta)) {
                          throw new Error(`Saldo insuficiente: pedido de ${Math.abs(delta)} dia(s), disponível ${saldoAtual}.`);
                      }
                  }
              } else {
                  const saldoCheck = await validarSaldoFeriasParaIntervalo({
                      supabaseClient: supabase,
                      userId: newAbsence.user_id,
                      dataInicio: newAbsence.data_inicio,
                      dataFim: dataFimFinal,
                      excluirPedidoId: isEditingAbsence ? editingAbsenceData.id : null,
                      diasLimiteAnual,
                      tolerancias,
                  });

                  if (!saldoCheck.ok) {
                      throw new Error(`Saldo insuficiente para ${saldoCheck.ano}: pedido de ${saldoCheck.diasPedidoNoAno} dia(s), disponível ${saldoCheck.diasDisponiveis}.`);
                  }
              }
          }

          const payload = { 
              user_id: newAbsence.user_id, 
              tipo: normalizedTipo,
              data_inicio: newAbsence.data_inicio, 
              data_fim: dataFimFinal,
              is_parcial: isKmRequest ? false : newAbsence.is_parcial,
              hora_inicio: isKmRequest ? null : (newAbsence.is_parcial ? newAbsence.hora_inicio : null),
              hora_fim: isKmRequest ? null : (newAbsence.is_parcial ? newAbsence.hora_fim || null : null),
              motivo: newAbsence.motivo || "", 
              anexo_url: anexo_url,
              km_origem: isKmRequest ? newAbsence.km_origem.trim() : null,
              km_destino: isKmRequest ? newAbsence.km_destino.trim() : null,
              km_total: isKmRequest ? Number(newAbsence.km_total) : null,
              estado: 'aprovado' 
          };

          let dbError;
          if (isEditingAbsence) {
              const { error } = await supabase.from("ferias").update(payload).eq("id", editingAbsenceData.id);
              dbError = error;
          } else {
              const { error } = await supabase.from("ferias").insert([payload]);
              dbError = error;
          }

          if(dbError) throw new Error("Erro ao gravar ausência: " + dbError.message);

          if (!hasDiasFeriasTotalColumn) {
              const deltasPorUser = new Map();
              if (diasFeriasAntigos > 0 && editingAbsenceData?.user_id) {
                  deltasPorUser.set(
                      editingAbsenceData.user_id,
                      (deltasPorUser.get(editingAbsenceData.user_id) || 0) + diasFeriasAntigos,
                  );
              }
              if (diasFeriasNovos > 0) {
                  deltasPorUser.set(
                      newAbsence.user_id,
                      (deltasPorUser.get(newAbsence.user_id) || 0) - diasFeriasNovos,
                  );
              }
              for (const [userId, delta] of deltasPorUser.entries()) {
                  await atualizarSaldoFeriasDireto(userId, delta);
              }
          }

          const colaboradoresAfetados = [newAbsence.user_id];
          if (
              isEditingAbsence &&
              editingAbsenceData?.user_id &&
              editingAbsenceData.user_id !== newAbsence.user_id
          ) {
              colaboradoresAfetados.push(editingAbsenceData.user_id);
          }
          if (hasDiasFeriasTotalColumn) {
              await sincronizarSaldoFeriasDosPerfis(colaboradoresAfetados);
          }

          closeAbsenceModal();
          fetchDadosMensais();
          if(selectedUser) fetchHistoricoUser(selectedUser);
          fetchColaboradores(); 
          showNotification(isEditingAbsence ? "Ausência atualizada!" : "Ausência registada e aprovada!", "success"); 

      } catch(err) { 
          showNotification(err.message, "error"); 
      } finally {
          setIsSubmitting(false);
      }
  }

  const downloadIndividualPDF = async () => {
      if (!selectedUser || isGeneratingIndividualPdf) return;

      try {
          setIsGeneratingIndividualPdf(true);

          const user = colaboradores.find((c) => c.id === selectedUser);
          if (!user) throw new Error("Colaborador não encontrado.");

          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const feriadosDoMes = getFeriados(year)
              .filter((f) => f.m === currentDate.getMonth())
              .map((f) => `${year}-${String(f.m + 1).padStart(2, '0')}-${String(f.d).padStart(2, '0')}`);

          const ausenciasComFaltasAuto = [
              ...(ausenciasMes || []),
              ...faltasInjustificadasAutomaticas,
          ];

          await gerarRelatorioIndividual({
              colaborador: user,
              assiduidade: assiduidadeMes,
              ausencias: ausenciasComFaltasAuto,
              ano: year,
              mes: month,
              feriados: feriadosDoMes,
          });
      } catch (err) {
          showNotification("Erro ao gerar relatório individual: " + err.message, "error");
      } finally {
          setIsGeneratingIndividualPdf(false);
      }
  };

  const downloadRHGeneralPDF = async () => {
      if (isGeneratingRhPdf) return;

      try {
          setIsGeneratingRhPdf(true);

          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
          const endOfMonth = toLocalDateString(new Date(year, month, 0));

          const [{ data: assiduidadeData, error: assiduidadeError }, { data: ausenciasData, error: ausenciasError }] = await Promise.all([
              supabase
                  .from("assiduidade")
                  .select("*")
                  .gte("data_registo", startOfMonth)
                  .lte("data_registo", endOfMonth),
              supabase
                  .from("ferias")
                  .select("*")
                  .eq("estado", "aprovado")
                  .lte("data_inicio", endOfMonth)
                  .gte("data_fim", startOfMonth),
          ]);

          if (assiduidadeError) throw assiduidadeError;
          if (ausenciasError) throw ausenciasError;

          const feriadosDoMes = getFeriados(year)
              .filter((f) => f.m === currentDate.getMonth())
              .map((f) => `${year}-${String(f.m + 1).padStart(2, '0')}-${String(f.d).padStart(2, '0')}`);

          const diasUteisMes = calcularDiasUteis(startOfMonth, endOfMonth);

          await gerarRelatorioRecursosHumanos({
              colaboradores,
              assiduidade: assiduidadeData || [],
              ausencias: ausenciasData || [],
              ano: year,
              mes: month,
              diasUteisMes,
              feriados: feriadosDoMes,
          });
      } catch (err) {
          showNotification("Erro ao gerar PDF de RH: " + err.message, "error");
      } finally {
          setIsGeneratingRhPdf(false);
      }
  };

  const downloadSelectedUserDeslocacoesPDF = async () => {
      if (!selectedUser || isGeneratingDeslocacoesPdf) return;

      try {
          setIsGeneratingDeslocacoesPdf(true);

          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
          const endOfMonth = toLocalDateString(new Date(year, month, 0));

          const { data: deslocacoesData, error: deslocacoesError } = await supabase
              .from("ferias")
              .select("*")
              .eq("estado", "aprovado")
              .eq("tipo", KM_REQUEST_TYPE)
              .eq("user_id", selectedUser)
              .gte("data_inicio", startOfMonth)
              .lte("data_inicio", endOfMonth);

          if (deslocacoesError) throw deslocacoesError;

          await gerarRelatorioDeslocacoesMensais({
              colaboradores,
              deslocacoes: deslocacoesData || [],
              ano: year,
              mes: month,
              valorPorKm: parseKmRate(valorKmReembolso),
          });
      } catch (err) {
          showNotification("Erro ao gerar PDF de deslocacoes: " + err.message, "error");
      } finally {
          setIsGeneratingDeslocacoesPdf(false);
      }
  };

  const getStats = () => {
      let countTrabalho = 0, countFerias = 0, countFaltas = 0, countBaixas = 0;
      countTrabalho = countMealAllowanceEligibleDays(assiduidadeMes);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const toleranciasDoMes = (ausenciasMes || []).filter(
          (a) => !a.is_parcial && isToleranceType(a.tipo),
      );
      const skipSetByUser = new Map();
      const getSkipSetForUser = (targetUserId) => {
          const cacheKey = targetUserId || "__global__";
          if (!skipSetByUser.has(cacheKey)) {
              const toleranciasNormalizadas = toleranciasDoMes.map((item) => ({
                  user_id: item.user_id,
                  data: item.data_inicio,
                  data_inicio: item.data_inicio,
                  data_fim: item.data_fim || item.data_inicio,
              }));
              skipSetByUser.set(
                  cacheKey,
                  buildToleranciasSkipSet(toleranciasNormalizadas, targetUserId || null),
              );
          }
          return skipSetByUser.get(cacheKey);
      };

      ausenciasMes.forEach(a => {
          if (!a.is_parcial) {
              const tipoNormalizado = normalizeAbsenceType(a.tipo);
              if (isToleranceType(tipoNormalizado)) return;

              const dataInicioCalculo = getAttendanceStartForUser(a.user_id);
              const dataInicioAjustada = a.data_inicio < dataInicioCalculo ? dataInicioCalculo : a.data_inicio;
              const dias = calcularDiasUteisNoMes(
                  dataInicioAjustada,
                  a.data_fim || a.data_inicio,
                  year,
                  month,
                  isVacationType(tipoNormalizado) ? getSkipSetForUser(a.user_id) : null,
              );
              if (dias <= 0) return;
              if (isVacationType(tipoNormalizado)) countFerias += dias;
              else if (tipoNormalizado.includes('falta')) countFaltas += dias;
              else if (tipoNormalizado.includes('baixa') || tipoNormalizado.includes('doenca') || tipoNormalizado.includes('acidente')) countBaixas += dias;
          }
      });

      countFaltas += faltasInjustificadasAutomaticas.length;

      let valorSA = "0.00";
      if (selectedUser) {
          const profile = colaboradores.find(c => c.id === selectedUser);
          const diarioSA = Number(profile?.valor_sa) || 0;
          valorSA = (countTrabalho * diarioSA).toFixed(2);
      }
      return { countTrabalho, countFerias, countFaltas, countBaixas, valorSA };
  };

  const gerarFaltasInjustificadasAutomaticas = () => {
      if (!selectedUser) return [];

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const hojeStr = new Date().toISOString().split('T')[0];
      const dataInicioCalculo = getAttendanceStartForUser(selectedUser);
      const feriadosSet = new Set(
          getFeriados(year)
              .filter(f => f.m === month)
              .map(f => `${year}-${String(f.m + 1).padStart(2, '0')}-${String(f.d).padStart(2, '0')}`)
      );

      const datasComAssiduidade = new Set((assiduidadeMes || []).map(a => a.data_registo));

      const temJustificacaoNoDia = (dateStr) => {
          return (ausenciasMes || []).some((a) => {
              if (a.tipo === KM_REQUEST_TYPE) return false;
              const estado = (a.estado || '').toLowerCase();
              if (estado === 'rejeitado' || estado === 'cancelado') return false;
              return a.data_inicio <= dateStr && a.data_fim >= dateStr;
          });
      };

      const faltas = [];
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayOfWeek = new Date(year, month, d).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = feriadosSet.has(dateStr);
          const isPastOrToday = dateStr <= hojeStr;
          const isAfterAttendanceStart = dateStr >= dataInicioCalculo;

          if (!isPastOrToday || !isAfterAttendanceStart || isWeekend || isHoliday) continue;
          if (datasComAssiduidade.has(dateStr)) continue;
          if (temJustificacaoNoDia(dateStr)) continue;

          faltas.push({
              id: `auto-falta-${dateStr}`,
              user_id: selectedUser,
              tipo: 'Falta injustificada (automática)',
              data_inicio: dateStr,
              data_fim: dateStr,
              is_parcial: false,
              estado: 'aprovado',
              motivo: 'Gerado automaticamente por ausência sem assiduidade e sem justificação.'
          });
      }

      return faltas;
  };

  const faltasInjustificadasAutomaticas = gerarFaltasInjustificadasAutomaticas();

  const stats = getStats();
  const currentUserProfile = colaboradores.find(c => c.id === selectedUser);
  const modalHasSAUpdate = pendingGlobalUpdates.sa;
  const modalHasKmUpdate = pendingGlobalUpdates.km;
  const modalTitle = modalHasSAUpdate && modalHasKmUpdate
      ? "Aplicar alterações globais"
      : modalHasKmUpdate
          ? "Atualizar €/KM Global"
          : "Atualizar S.A. Global";
  const modalDescription = modalHasSAUpdate && modalHasKmUpdate
      ? `Tem a certeza que quer alterar o S.A. de TODOS para ${Number(globalSA).toFixed(2)}€ e o €/KM para ${parseKmRate(valorKmReembolso).toFixed(2)}€?`
      : modalHasKmUpdate
          ? `Tem a certeza que quer alterar o €/KM global para ${parseKmRate(valorKmReembolso).toFixed(2)}€?`
          : `Tem a certeza que quer alterar o S.A. de TODOS para ${Number(globalSA).toFixed(2)}€?`;

  const getAusentesHoje = () => {
      const today = new Date().toISOString().split('T')[0];
      const lista = ausenciasMes.filter(a => a.tipo !== KM_REQUEST_TYPE && a.data_inicio <= today && a.data_fim >= today);
      return lista.map(a => {
          const user = colaboradores.find(c => c.id === a.user_id);
          const infoHora = a.is_parcial ? `( ${a.hora_inicio?.slice(0,5)})` : '';
          const nomeUser = a.user_id ? (user?.nome || 'Desconhecido') : 'Global';
          return { ...a, nomeUser, infoHora };
      });
  };
  const ausentesHoje = getAusentesHoje();

  const getAniversariantesDoMes = () => {
      const mesAtual = currentDate.getMonth();
      return colaboradores
          .filter(c => {
              if(!c.data_nascimento) return false;
              const d = new Date(c.data_nascimento);
              return d.getMonth() === mesAtual;
          })
          .sort((a, b) => new Date(a.data_nascimento).getDate() - new Date(b.data_nascimento).getDate());
  };
  const aniversariantes = getAniversariantesDoMes();

  const renderCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay(); 
      const feriadosDoMes = getFeriados(year).filter(f => f.m === month);

      const days = [];
      for (let i = 0; i < firstDayOfWeek; i++) days.push(<div key={`empty-${i}`}></div>);
      
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          let content = null;
          let cellStyle = { background: '#fff', minHeight: '80px', position: 'relative' }; 
          let cellBorderColor = '#f1f5f9';
          
          const feriado = feriadosDoMes.find(f => f.d === d);
          const toleranciaGlobalNoDia = !selectedUser
              ? ausenciasMes.find(
                    a =>
                        a.user_id === null &&
                        !a.is_parcial &&
                        isToleranceType(a.tipo) &&
                        a.data_inicio <= dateStr &&
                        a.data_fim >= dateStr,
                )
              : null;
          if (feriado) {
              cellStyle.background = '#fee2e2';
              cellBorderColor = '#fca5a5';
          }
          else if (toleranciaGlobalNoDia) {
              cellStyle.background = '#dbeafe';
              cellBorderColor = '#93c5fd';
          }

          if (selectedUser) {
              const trabalhou = assiduidadeMes.some(a => a.data_registo === dateStr);
              const ausencia = ausenciasMes.find(a => a.tipo !== KM_REQUEST_TYPE && a.data_inicio <= dateStr && a.data_fim >= dateStr);
              
              if (trabalhou) { 
                  cellStyle.background = '#f0fdf4';
                  cellBorderColor = '#bbf7d0'; 
                  content = <div style={{display:'flex', justifyContent:'center'}}><Icons.Check color="#16a34a" size={20} /></div>; 
              } 
              else if (ausencia) {
                  const tipoNormalizado = normalizeAbsenceType(ausencia.tipo);
                  if (isToleranceType(tipoNormalizado)) {
                      cellStyle.background = '#eff6ff';
                      cellBorderColor = '#bfdbfe';
                      content = <div style={{display:'flex', justifyContent:'center'}}><Icons.Clock color="#3b82f6" size={20}/></div>;
                  }
                  else if (isVacationType(tipoNormalizado)) { 
                      cellStyle.background = '#fefce8'; 
                      content = <div style={{display:'flex', justifyContent:'center'}}>{ausencia.is_parcial ? <Icons.Clock color="#ca8a04" size={20}/> : <Icons.Sun color="#ca8a04" size={20}/>}</div>; 
                  }
                  else if (tipoNormalizado.includes('falta')) { 
                      cellStyle.background = '#fef2f2'; 
                      content = <div style={{display:'flex', justifyContent:'center'}}>{ausencia.is_parcial ? <Icons.Clock color="#ef4444" size={20}/> : <Icons.X color="#ef4444" size={20}/>}</div>; 
                  }
                  else { 
                      cellStyle.background = '#faf5ff'; 
                      content = <div style={{display:'flex', justifyContent:'center'}}>{ausencia.is_parcial ? <Icons.Clock color="#a855f7" size={20}/> : <Icons.HeartPulse color="#a855f7" size={20}/>}</div>; 
                  }
              } else if (feriado) {
                  content = <div style={{display:'flex', justifyContent:'center', marginTop:'5px'}}><Icons.Flag color="#991b1b" size={16}/></div>;
              }
          } else {
              const ausentesNoDia = ausenciasMes.filter(a => a.tipo !== KM_REQUEST_TYPE && a.data_inicio <= dateStr && a.data_fim >= dateStr);
              const ausentesNoDiaParaBarras = ausentesNoDia.filter(
                  a => !(toleranciaGlobalNoDia && a.user_id === null && !a.is_parcial && isToleranceType(a.tipo)),
              );
              let bars = [];
              if (ausentesNoDiaParaBarras.length > 0) {
                  bars = ausentesNoDiaParaBarras.map((a, i) => {
                      const user = colaboradores.find(c => c.id === a.user_id);
                      const tipoNormalizado = normalizeAbsenceType(a.tipo);
                      let barColor = '#fcd34d'; 
                      if (isToleranceType(tipoNormalizado)) barColor = '#3b82f6';
                      if (tipoNormalizado.includes('falta')) barColor = '#fca5a5';
                      if (tipoNormalizado.includes('baixa') || tipoNormalizado.includes('doenca') || tipoNormalizado.includes('acidente')) barColor = '#d8b4fe';
                      if (a.is_parcial) barColor = '#94a3b8';
                      const ownerLabel = a.user_id ? (user?.nome || 'Desconhecido') : 'Global';
                      return (
                          <ModernTooltip key={i} content={`${ownerLabel}: ${formatAbsenceTypeLabel(a.tipo)} ${a.is_parcial ? '(Horas)' : ''}`}>
                              <div style={{height: '6px', background: barColor, borderRadius: '3px', width: '100%'}} />
                          </ModernTooltip>
                      );
                  });
              }
              content = (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginTop:'5px'}}>
                      {feriado && (
                          <ModernTooltip content={feriado.nome}>
                              <div style={{fontSize: '0.7rem', color: '#991b1b', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display:'flex', alignItems:'center', gap:'4px'}}><Icons.Flag size={10} color="#991b1b"/> {feriado.nome}</div>
                          </ModernTooltip>
                      )}
                      {toleranciaGlobalNoDia && (
                          <ModernTooltip content={toleranciaGlobalNoDia.motivo || formatAbsenceTypeLabel(toleranciaGlobalNoDia.tipo)}>
                              <div style={{fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display:'flex', alignItems:'center', gap:'4px'}}>
                                  <Icons.Flag size={10} color="#1d4ed8"/> {toleranciaGlobalNoDia.motivo || 'Tolerância de Ponto'}
                              </div>
                          </ModernTooltip>
                      )}
                      {bars}
                  </div>
              );
          }

          const tituloDia = feriado
              ? `Feriado: ${feriado.nome}`
              : (toleranciaGlobalNoDia
                    ? `Global: ${toleranciaGlobalNoDia.motivo || formatAbsenceTypeLabel(toleranciaGlobalNoDia.tipo)}`
                    : '');
          const numeroDiaCor = feriado ? '#ef4444' : (toleranciaGlobalNoDia ? '#2563eb' : '#94a3b8');
          
          days.push(
              <ModernTooltip key={d} content={tituloDia}>
                  <div style={{border:`1px solid ${cellBorderColor}`, borderRadius:'8px', padding:'5px', display:'flex', flexDirection:'column', justifyContent:'space-between', outline:'none', boxShadow:'none', ...cellStyle}}>
                      <span style={{fontSize:'0.75rem', color: numeroDiaCor, fontWeight:'bold'}}>{d}</span>
                      <div style={{textAlign:'center', fontSize:'1.2rem', width: '100%'}}>{content}</div>
                  </div>
              </ModernTooltip>
          );
      }
      return days;
  };

  const changeMonth = (delta) => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + delta)));
  
    const readOnlyGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: '20px', rowGap: '10px', fontSize: '0.9rem', color: '#334151' };
  const readOnlyItemStyle = { display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' };
  const labelStyle = { color: '#64748b', fontSize: '0.75rem', marginBottom: '2px' };
  const inputStyle = { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%', marginBottom: '10px' };

  return (
    <div className="page-container" style={{padding: '20px'}}>
      
      <div style={{marginBottom: '20px', background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'20px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <div style={{background:'#eff6ff', padding:'12px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <Icons.Users size={28} color="#2563eb" />
                </div>
                <div>
                    <h1 style={{margin:0, fontSize:'1.4rem', color:'#1e293b'}}>Gestão de RH</h1>
                    <p style={{margin:'5px 0 0 0', color:'#64748b', fontSize:'0.9rem'}}>Aprovações, salários e dados pessoais.</p>
                </div>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
                <button className={activeView === 'gestao' ? 'btn-primary' : 'btn-small'} onClick={() => setActiveView('gestao')} style={{padding: '10px 20px', display:'flex', alignItems:'center', gap:'8px'}}>
                    <Icons.Chart size={18} /> Gestão
                </button>
                <button className={activeView === 'pedidos' ? 'btn-primary' : 'btn-small'} onClick={() => setActiveView('pedidos')} style={{padding: '10px 20px', position: 'relative', display:'flex', alignItems:'center', gap:'8px'}}>
                    <Icons.Inbox size={18} /> Pedidos
                    {(pedidosPendentes.length + pedidosKmPendentes.length) > 0 && <span style={{position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 'bold'}}>{pedidosPendentes.length + pedidosKmPendentes.length}</span>}
                </button>
                <button className={activeView === 'tolerancias' ? 'btn-primary' : 'btn-small'} onClick={() => setActiveView('tolerancias')} style={{padding: '10px 20px', display:'flex', alignItems:'center', gap:'8px'}}>
                    <Icons.Clock size={18} /> Tolerâncias
                </button>
            </div>
        </div>
      </div>

      {activeView === 'pedidos' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
              {/* TABELA DE AUSÊNCIAS (Férias, Baixas, etc.) */}
              <div className="card" style={{padding: '25px', borderRadius: '12px', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom: '20px'}}>
                      <Icons.Flag size={24} color="#1e293b" />
                      <h3 style={{margin: 0, color: '#1e293b'}}>Ausências Pendentes</h3>
                  </div>
                  {pedidosPendentes.length > 0 ? (
                      <div className="table-responsive">
                        <table className="data-table" style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                            <thead>
                                <tr style={{borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    <th style={{padding: '12px'}}>Colaborador</th>
                                    <th style={{padding: '12px'}}>Tipo</th>
                                    <th style={{padding: '12px'}}>Período</th>
                                    <th style={{padding: '12px'}}>Duração</th>
                                    <th style={{padding: '12px'}}>Estado</th>
                                    <th style={{padding: '12px', textAlign: 'center'}}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidosPendentes.map(p => (
                                    <tr key={p.id} style={{background: p.estado === 'pedido_cancelamento' ? '#fefce8' : 'transparent', borderBottom: '1px solid #f1f5f9'}}>
                                        <td style={{padding: '12px', fontWeight: 'bold', color: '#2563eb'}}>{p.profiles?.nome}</td>
                                        <td style={{padding: '12px', color: '#334155'}}>{formatAbsenceTypeLabel(p.tipo)}</td>
                                        <td style={{padding: '12px', color: '#334155'}}>
                                          {p.is_parcial ? (
                                              <>
                                                  <div style={{fontWeight: '500'}}>{new Date(p.data_inicio).toLocaleDateString('pt-PT')}</div>
                                                  <div style={{fontSize: '0.8rem', color: '#64748b', display:'flex', alignItems:'center', gap:'4px'}}><Icons.Clock size={12}/> {p.hora_inicio?.slice(0,5)} às {p.hora_fim?.slice(0,5) || '...'}</div>
                                              </>
                                          ) : (
                                              `${new Date(p.data_inicio).toLocaleDateString('pt-PT')} a ${new Date(p.data_fim).toLocaleDateString('pt-PT')}`
                                          )}
                                        </td>
                                        <td style={{padding: '12px'}}>{p.is_parcial ? <span style={{color: '#94a3b8', fontSize:'0.85rem'}}>Horas</span> : <span style={{fontSize:'0.9rem', fontWeight:'500'}}>{calcularDiasUteis(p.data_inicio, p.data_fim)} dias</span>}</td>
                                        <td style={{padding: '12px'}}>
                                            {p.estado === 'pendente' ? 
                                                <span style={{background: '#dbeafe', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold'}}>Novo Pedido</span> : 
                                                <span style={{background: '#fef08a', color: '#854d0e', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'4px', width:'max-content'}}><Icons.Alert size={12}/> Cancelamento</span>
                                            }
                                        </td>
                                        <td style={{padding: '12px', textAlign: 'center'}}>
                                            <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                                <ModernTooltip content="Ver Detalhes do Pedido">
                                                    <button className="btn-small" style={{background: '#f8fafc', borderColor: '#cbd5e1', color: '#475569', display:'flex', alignItems:'center', padding:'6px'}} onClick={() => abrirModalDetalhes(p)}>
                                                        <Icons.Eye size={16} />
                                                    </button>
                                                </ModernTooltip>
                                                
                                                {p.estado === 'pendente' ? (
                                                    <>
                                                        <ModernTooltip content="Aprovar">
                                                            <button className="btn-small" style={{background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a', display:'flex', alignItems:'center', padding:'6px'}} onClick={() => abrirModalConfirmacao(p, 'aprovar')}>
                                                                <Icons.Check size={16} />
                                                            </button>
                                                        </ModernTooltip>
                                                        <ModernTooltip content="Rejeitar">
                                                            <button className="btn-small" style={{background: '#fef2f2', borderColor: '#fecaca', color: '#ef4444', display:'flex', alignItems:'center', padding:'6px'}} onClick={() => abrirModalConfirmacao(p, 'rejeitar')}>
                                                                <Icons.X size={16} />
                                                            </button>
                                                        </ModernTooltip>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ModernTooltip content="Aceitar Cancelamento">
                                                            <button className="btn-small" style={{background: '#fef2f2', borderColor: '#fecaca', color: '#ef4444', fontWeight:'bold', fontSize:'0.8rem'}} onClick={() => abrirModalConfirmacao(p, 'aceitar_cancelamento')}>Aceitar</button>
                                                        </ModernTooltip>
                                                        <ModernTooltip content="Recusar Cancelamento">
                                                            <button className="btn-small" style={{background: '#f8fafc', borderColor: '#cbd5e1', color: '#64748b', fontSize:'0.8rem'}} onClick={() => abrirModalConfirmacao(p, 'recusar_cancelamento')}>Recusar</button>
                                                        </ModernTooltip>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  ) : <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px'}}>
                        <Icons.Flag size={40} color="#cbd5e1" />
                        <span style={{fontSize:'0.95rem'}}>Não há ausências pendentes.</span>
                    </div>}
              </div>

              {/* TABELA DE PEDIDOS DE KM's */}
              <div className="card" style={{padding: '25px', borderRadius: '12px', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom: '20px'}}>
                      <Icons.Inbox size={24} color="#1e293b" />
                      <h3 style={{margin: 0, color: '#1e293b'}}>Deslocações Pendentes</h3>
                  </div>
                  {pedidosKmPendentes.length > 0 ? (
                      <div className="table-responsive">
                        <table className="data-table" style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                            <thead>
                                <tr style={{borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                    <th style={{padding: '12px'}}>Colaborador</th>
                                    <th style={{padding: '12px'}}>Origem</th>
                                    <th style={{padding: '12px'}}>Destino</th>
                                    <th style={{padding: '12px'}}>Distância</th>
                                    <th style={{padding: '12px'}}>Data</th>
                                    <th style={{padding: '12px'}}>Estado</th>
                                    <th style={{padding: '12px', textAlign: 'center'}}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidosKmPendentes.map(p => (
                                    <tr key={p.id} style={{background: p.estado === 'pedido_cancelamento' ? '#fefce8' : 'transparent', borderBottom: '1px solid #f1f5f9'}}>
                                        <td style={{padding: '12px', fontWeight: 'bold', color: '#2563eb'}}>{p.profiles?.nome}</td>
                                        <td style={{padding: '12px', color: '#334155', fontWeight: '500'}}>{p.km_origem || '-'}</td>
                                        <td style={{padding: '12px', color: '#334155', fontWeight: '500'}}>{p.km_destino || '-'}</td>
                                        <td style={{padding: '12px'}}><span style={{fontSize:'0.95rem', fontWeight:'600', color: '#16a34a'}}>{p.km_total ?? 0} km</span></td>
                                        <td style={{padding: '12px', color: '#334155'}}>{new Date(p.data_inicio).toLocaleDateString('pt-PT')}</td>
                                        <td style={{padding: '12px'}}>
                                            {p.estado === 'pendente' ? 
                                                <span style={{background: '#dbeafe', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold'}}>Novo Pedido</span> : 
                                                <span style={{background: '#fef08a', color: '#854d0e', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'4px', width:'max-content'}}><Icons.Alert size={12}/> Cancelamento</span>
                                            }
                                        </td>
                                        <td style={{padding: '12px', textAlign: 'center'}}>
                                            <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                                <ModernTooltip content="Ver Detalhes do Pedido">
                                                    <button className="btn-small" style={{background: '#f8fafc', borderColor: '#cbd5e1', color: '#475569', display:'flex', alignItems:'center', padding:'6px'}} onClick={() => abrirModalDetalhes(p)}>
                                                        <Icons.Eye size={16} />
                                                    </button>
                                                </ModernTooltip>
                                                
                                                {p.estado === 'pendente' ? (
                                                    <>
                                                        <ModernTooltip content="Aprovar">
                                                            <button className="btn-small" style={{background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a', display:'flex', alignItems:'center', padding:'6px'}} onClick={() => abrirModalConfirmacao(p, 'aprovar')}>
                                                                <Icons.Check size={16} />
                                                            </button>
                                                        </ModernTooltip>
                                                        <ModernTooltip content="Rejeitar">
                                                            <button className="btn-small" style={{background: '#fef2f2', borderColor: '#fecaca', color: '#ef4444', display:'flex', alignItems:'center', padding:'6px'}} onClick={() => abrirModalConfirmacao(p, 'rejeitar')}>
                                                                <Icons.X size={16} />
                                                            </button>
                                                        </ModernTooltip>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ModernTooltip content="Aceitar Cancelamento">
                                                            <button className="btn-small" style={{background: '#fef2f2', borderColor: '#fecaca', color: '#ef4444', fontWeight:'bold', fontSize:'0.8rem'}} onClick={() => abrirModalConfirmacao(p, 'aceitar_cancelamento')}>Aceitar</button>
                                                        </ModernTooltip>
                                                        <ModernTooltip content="Recusar Cancelamento">
                                                            <button className="btn-small" style={{background: '#f8fafc', borderColor: '#cbd5e1', color: '#64748b', fontSize:'0.8rem'}} onClick={() => abrirModalConfirmacao(p, 'recusar_cancelamento')}>Recusar</button>
                                                        </ModernTooltip>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  ) : <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px'}}>
                        <Icons.Inbox size={40} color="#cbd5e1" />
                        <span style={{fontSize:'0.95rem'}}>Não há deslocações pendentes.</span>
                    </div>}
              </div>
          </div>
      )}

      {activeView === 'tolerancias' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div className="card" style={{padding: '25px', borderRadius: '12px', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                          <Icons.Clock size={24} color="#1e293b" />
                          <div>
                              <h3 style={{margin: 0, color: '#1e293b'}}>Tolerâncias de Ponto</h3>
                              <p style={{margin:'4px 0 0 0', color:'#64748b', fontSize:'0.85rem'}}>Dias dispensados que não contam como férias para os colaboradores.</p>
                          </div>
                      </div>
                      <button className="btn-primary" onClick={() => { setNewTolerancia({ nome: '', data: '', tipo: 'global', user_id: '' }); setShowToleranciaModal(true); }} style={{padding: '10px 20px', display:'flex', alignItems:'center', gap:'8px'}}>
                          <Icons.Flag size={16} /> Nova Tolerância
                      </button>
                  </div>
                  {tolerancias.length > 0 ? (
                      <div className="table-responsive">
                          <table className="data-table" style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                              <thead>
                                  <tr style={{borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase'}}>
                                      <th style={{padding: '12px'}}>Designação</th>
                                      <th style={{padding: '12px'}}>Data</th>
                                      <th style={{padding: '12px'}}>Âmbito</th>
                                      <th style={{padding: '12px', textAlign: 'center'}}>Ações</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {tolerancias.map(t => {
                                      const colab = t.user_id ? colaboradores.find(c => c.id === t.user_id) : null;
                                      return (
                                          <tr key={t.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                                              <td style={{padding: '12px', fontWeight: '500', color: '#1e293b'}}>{t.nome}</td>
                                              <td style={{padding: '12px', color: '#475569'}}>{t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-PT') : '-'}</td>
                                              <td style={{padding: '12px'}}>
                                                  {t.user_id ? (
                                                      <span style={{background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', display:'inline-flex', alignItems:'center', gap:'4px'}}>
                                                          <Icons.User size={12} /> {colab?.nome || 'Individual'}
                                                      </span>
                                                  ) : (
                                                      <span style={{background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', display:'inline-flex', alignItems:'center', gap:'4px'}}>
                                                          <Icons.Users size={12} /> Global
                                                      </span>
                                                  )}
                                              </td>
                                              <td style={{padding: '12px', textAlign: 'center'}}>
                                                  <ModernTooltip content="Eliminar">
                                                      <button className="btn-small" style={{background: '#fef2f2', borderColor: '#fecaca', color: '#ef4444', display:'flex', alignItems:'center', padding:'6px', margin:'0 auto'}} onClick={() => handleDeleteTolerancia(t.id)}>
                                                          <Icons.Trash size={16} />
                                                      </button>
                                                  </ModernTooltip>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  ) : (
                      <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px'}}>
                          <Icons.Clock size={40} color="#cbd5e1" />
                          <span style={{fontSize:'0.95rem'}}>Nenhuma tolerância definida. Adicione dias dispensados que não devem contar como férias.</span>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeView === 'gestao' && (
          <>
            <div className="rh-toolbar" style={{marginBottom: '20px', background:'white', padding:'15px 20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'15px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'}}>
                <div style={{background:'#f8fafc', padding:'10px 15px', borderRadius:'8px', display:'flex', alignItems:'center', gap:'10px', border:'1px solid #e2e8f0'}}>
                    <span style={{fontSize:'0.8rem', fontWeight:'bold', color:'#475569'}}>S.A. GLOBAL:</span>
                    <input
                        type="number"
                        step="0.01"
                        value={globalSA}
                        onChange={e => {
                            setGlobalSA(e.target.value);
                            setPendingGlobalUpdates((prev) => ({ ...prev, sa: true }));
                        }}
                        style={{width:'60px', padding:'5px', borderRadius:'4px', border:'1px solid #cbd5e1'}}
                    />
                    <span style={{fontSize:'0.8rem', fontWeight:'bold', color:'#475569'}}>€/KM:</span>
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={valorKmReembolso}
                        onChange={e => {
                            setValorKmReembolso(e.target.value);
                            setPendingGlobalUpdates((prev) => ({ ...prev, km: true }));
                        }}
                        style={{width:'72px', padding:'5px', borderRadius:'4px', border:'1px solid #cbd5e1'}}
                    />
                    {isSavingKmRate && <span style={{fontSize:'0.72rem', color:'#64748b'}}>a guardar...</span>}
                    <button onClick={handleBulkUpdateSA} className="btn-small" style={{background:'#2563eb', color:'white', border:'none', padding:'6px 12px', fontWeight:'500'}}>Aplicar</button>
                </div>
                <div className="rh-toolbar-actions" style={{display:'flex', gap:'15px', alignItems:'center'}}>
                    <select className="rh-user-select" value={selectedUser || ""} onChange={(e) => {
                        setIsEditingUser(false);
                        setSelectedUser(e.target.value || null);
                    }} style={{padding: '10px 15px', borderRadius: '8px', minWidth: '250px', border:'1px solid #cbd5e1', color:'#1e293b', fontWeight:'500'}}>
                        <option value="">Visão Geral Global</option>
                        {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    {!selectedUser && (
                        <>
                            <button
                                onClick={downloadRHGeneralPDF}
                                disabled={isGeneratingRhPdf || colaboradores.length === 0}
                                className="btn-small"
                                style={{
                                    padding: '10px 14px',
                                    display:'flex',
                                    alignItems:'center',
                                    gap:'8px',
                                    background:'#eff6ff',
                                    color:'#1d4ed8',
                                    borderColor:'#bfdbfe',
                                    opacity: isGeneratingRhPdf ? 0.7 : 1,
                                    cursor: isGeneratingRhPdf ? 'wait' : 'pointer'
                                }}
                            >
                                <Icons.Download size={16} /> {isGeneratingRhPdf ? 'A gerar PDF...' : 'Exportar PDF RH'}
                            </button>
                        </>
                    )}
                    <button onClick={() => { 
                      setIsEditingAbsence(false);
                      setEditingAbsenceData(null);
                                            setNewAbsence({ user_id: selectedUser || "", tipo: "Férias", data_inicio: "", data_fim: "", is_parcial: false, hora_inicio: "", hora_fim: "", motivo: "", km_origem: "", km_destino: "", km_total: "" }); 
                      setAbsenceFile(null); 
                      setShowAbsenceModal(true); 
                    }} className="btn-primary" style={{padding: '10px 20px', display:'flex', alignItems:'center', gap:'8px'}}>
                        <Icons.Edit size={16} /> Ausência Manual
                    </button>
                </div>
            </div>

            <div className="rh-grid" style={{display:'grid', gridTemplateColumns: '400px 1fr', gap: '20px'}}>
                <div style={{minWidth: 0}}>
                    {selectedUser ? (
                        <>
                            <div className="card" style={{marginBottom: '20px', padding:'25px', background:'white', borderRadius:'12px', borderTop:'4px solid #2563eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'20px'}}>
                                    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                        <div style={{background:'#eff6ff', width:'45px', height:'45px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                            <Icons.User size={24} color="#2563eb" />
                                        </div>
                                        <div>
                                            <h3 style={{margin:0, color:'#1e293b', fontSize:'1.2rem'}}>{currentUserProfile?.nome}</h3>
                                            <div style={{marginTop:'5px'}}>
                                                <span style={{fontSize:'0.75rem', background:'#f1f5f9', color:'#475569', padding:'3px 10px', borderRadius:'12px', fontWeight:'600'}}>
                                                    {formatCompaniesLabel(currentUserProfile)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{display:'flex', flexDirection:'column', gap:'8px', alignItems:'stretch'}}>
                                        <button
                                            onClick={downloadIndividualPDF}
                                            disabled={isGeneratingIndividualPdf}
                                            className="btn-small"
                                            style={{display:'flex', alignItems:'center', gap:'6px', justifyContent:'center', background:'#f0fdf4', color:'#16a34a', borderColor:'#bbf7d0', opacity: isGeneratingIndividualPdf ? 0.7 : 1, cursor: isGeneratingIndividualPdf ? 'wait' : 'pointer'}}
                                        >
                                            <Icons.Download size={14} /> {isGeneratingIndividualPdf ? 'A gerar PDF...' : 'Relatório PDF'}
                                        </button>
                                        <button
                                            onClick={downloadSelectedUserDeslocacoesPDF}
                                            disabled={isGeneratingDeslocacoesPdf}
                                            className="btn-small"
                                            style={{display:'flex', alignItems:'center', gap:'6px', justifyContent:'center', background:'#fff7ed', color:'#c2410c', borderColor:'#fed7aa', opacity: isGeneratingDeslocacoesPdf ? 0.7 : 1, cursor: isGeneratingDeslocacoesPdf ? 'wait' : 'pointer'}}
                                        >
                                            <Icons.Download size={14} /> {isGeneratingDeslocacoesPdf ? 'A gerar PDF...' : 'Deslocações PDF'}
                                        </button>
                                    </div>
                                </div>

                                <div className="tabs rh-user-tabs" style={{marginBottom:'20px', display:'flex', background:'#f8fafc', padding:'4px', borderRadius:'8px'}}>
                                    <button type="button" className={userTab === 'financeiro' ? 'active' : ''} onClick={() => setUserTab('financeiro')} style={{flex:1, borderRadius:'6px', padding:'8px', display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', background: userTab === 'financeiro' ? 'white' : 'transparent', border: userTab === 'financeiro' ? '1px solid #e2e8f0' : 'none', color: userTab === 'financeiro' ? '#2563eb' : '#64748b', fontWeight:'bold', boxShadow: userTab === 'financeiro' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition:'0.2s'}}>
                                        <Icons.Currency size={16} /> Financeiro
                                    </button>
                                    <button type="button" className={userTab === 'dados' ? 'active' : ''} onClick={() => setUserTab('dados')} style={{flex:1, borderRadius:'6px', padding:'8px', display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', background: userTab === 'dados' ? 'white' : 'transparent', border: userTab === 'dados' ? '1px solid #e2e8f0' : 'none', color: userTab === 'dados' ? '#2563eb' : '#64748b', fontWeight:'bold', boxShadow: userTab === 'dados' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition:'0.2s'}}>
                                        <Icons.FileText size={16} /> Pessoal
                                    </button>
                                </div>

                                {userTab === 'financeiro' && (
                                    !isEditingUser ? (
                                        <div>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', padding:'10px', background:'#f8fafc', borderRadius:'8px'}}>
                                                <span style={{color:'#64748b', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'6px'}}><Icons.Currency size={16}/> Valor S.A. Diário</span>
                                                <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>{Number(currentUserProfile?.valor_sa || 0).toFixed(2)} €</span>
                                            </div>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', padding:'10px', background:'#eff6ff', borderRadius:'8px', border:'1px dashed #bfdbfe'}}>
                                                <span style={{color:'#1e40af', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'6px'}}><Icons.Sun size={16}/> Férias Disponíveis</span>
                                                <span style={{fontWeight:'bold', color:'#2563eb', fontSize:'1.1rem'}}>{currentUserProfile?.dias_ferias ?? '--'} dias</span>
                                            </div>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', padding:'10px', background:'#ecfeff', borderRadius:'8px', border:'1px dashed #a5f3fc'}}>
                                                <span style={{color:'#0e7490', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'6px'}}><Icons.Flag size={16}/> Limite Anual de Férias</span>
                                                <span style={{fontWeight:'bold', color:'#0f766e', fontSize:'1.1rem'}}>
                                                    {hasDiasFeriasTotalColumn ? (currentUserProfile?.dias_ferias_total ?? '--') : '--'} dias
                                                </span>
                                            </div>
                                            <button type="button" onClick={openUserEditor} style={{width:'100%', marginTop:'10px', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', cursor:'pointer', color:'#475569', fontWeight:'600', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', transition:'0.2s'}} className="hover-bg-gray">
                                                <Icons.Edit size={16} /> Editar Dados Financeiros
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                                            <label style={{fontSize:'0.8rem', fontWeight:'600', color:'#475569'}}>Valor S.A. Diário (€):</label>
                                            <input type="number" step="0.01" value={tempUserProfile.valor_sa || 0} onChange={e => setTempUserProfile({...tempUserProfile, valor_sa: e.target.value})} style={{...inputStyle, marginTop:'5px', marginBottom:'15px'}} />
                                            
                                            {hasDiasFeriasTotalColumn && (
                                                <>
                                                    <label style={{fontSize:'0.8rem', fontWeight:'600', color:'#475569'}}>Limite Anual de Férias:</label>
                                                    <input type="number" value={tempUserProfile.dias_ferias_total || 0} onChange={e => setTempUserProfile({...tempUserProfile, dias_ferias_total: e.target.value})} style={{...inputStyle, marginTop:'5px', marginBottom:'15px'}} />
                                                    <label style={{fontSize:'0.8rem', fontWeight:'600', color:'#475569'}}>Saldo Atual de Férias:</label>
                                                    <input type="number" value={tempUserProfile.dias_ferias || 0} readOnly disabled style={{...inputStyle, marginTop:'5px', marginBottom:'6px', background:'#f1f5f9', color:'#64748b', cursor:'not-allowed'}} />
                                                    <p style={{margin:'0 0 15px 0', fontSize:'0.75rem', color:'#64748b'}}>
                                                        O saldo atual e recalculado automaticamente a partir do limite anual e dos pedidos aprovados.
                                                    </p>
                                                </>
                                            )}

                                            {!hasDiasFeriasTotalColumn && (
                                                <>
                                                    <label style={{fontSize:'0.8rem', fontWeight:'600', color:'#475569'}}>Saldo Atual de Férias:</label>
                                                    <input type="number" value={tempUserProfile.dias_ferias || 0} onChange={e => setTempUserProfile({...tempUserProfile, dias_ferias: e.target.value})} style={{...inputStyle, marginTop:'5px', marginBottom:'15px'}} />
                                                </>
                                            )}
                                            
                                            <div style={{display:'flex', gap:'10px'}}>
                                                <button type="button" onClick={() => setIsEditingUser(false)} style={{flex:1, padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px', background:'white', color:'#475569', fontWeight:'600'}}>Cancelar</button>
                                                <button type="button" onClick={handleUpdateUserProfile} style={{flex:1, padding:'10px', background:'#2563eb', borderRadius:'6px', color:'white', border:'none', fontWeight:'bold'}}>Guardar</button>
                                            </div>
                                        </div>
                                    )
                                )}

                                {userTab === 'dados' && (
                                    !isEditingUser ? (
                                        <>
                                            <div className="rh-readonly-grid" style={readOnlyGridStyle}>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Nome Completo</span><b>{currentUserProfile?.nome_completo || '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Telemóvel</span><b>{currentUserProfile?.telemovel || '-'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>NIF</span><b>{currentUserProfile?.nif || '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>NISS</span><b>{currentUserProfile?.niss || '-'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>NCC</span><b>{currentUserProfile?.ncc || '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Validade CC</span><b>{currentUserProfile?.validade_cc ? new Date(currentUserProfile.validade_cc).toLocaleDateString('pt-PT') : '-'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Data Nasc.</span><b>{currentUserProfile?.data_nascimento ? new Date(currentUserProfile.data_nascimento).toLocaleDateString('pt-PT') : '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Data Admissão</span><b>{currentUserProfile?.data_admissao ? new Date(currentUserProfile.data_admissao).toLocaleDateString('pt-PT') : '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Dependentes</span><b>{currentUserProfile?.nr_dependentes || '0'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Estado Civil</span><b>{currentUserProfile?.estado_civil || '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Nacionalidade</span><b>{currentUserProfile?.nacionalidade || '-'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Sexo</span><b>{currentUserProfile?.sexo || '-'}</b></div>
                                            </div>
                                            <div style={{...readOnlyItemStyle, marginTop:'10px'}}><span style={labelStyle}>Morada</span><b>{currentUserProfile?.morada || '-'}</b></div>
                                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'15px', paddingBottom:'8px', borderBottom:'1px dashed #e2e8f0', fontSize:'0.9rem'}}><span style={labelStyle}>Concelho:</span> <b style={{color:'#1e293b'}}>{currentUserProfile?.concelho || '-'}</b></div>
                                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'8px', paddingBottom:'8px', borderBottom:'1px dashed #e2e8f0', fontSize:'0.9rem'}}><span style={labelStyle}>Empresas:</span> <b style={{color:'#1e293b'}}>{formatCompaniesLabel(currentUserProfile)}</b></div>
                                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'8px', fontSize:'0.9rem'}}><span style={labelStyle}>Contrato:</span> <b style={{color:'#1e293b'}}>{currentUserProfile?.tipo_contrato || '-'}</b></div>
                                            <button type="button" onClick={openUserEditor} style={{width:'100%', marginTop:'20px', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', cursor:'pointer', color:'#475569', fontWeight:'600', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', transition:'0.2s'}}>
                                                <Icons.Edit size={16} /> Editar Informações
                                            </button>
                                        </>
                                    ) : (
                                        <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', maxHeight:'450px', overflowY:'auto', border:'1px solid #e2e8f0'}}>
                                            <label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Nome Completo</label>
                                            <input type="text" value={tempUserProfile.nome_completo || ''} onChange={e => setTempUserProfile({...tempUserProfile, nome_completo: e.target.value})} style={{width:'100%', marginBottom:'10px', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} />
                                            
                                            <div className="rh-user-form-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>NIF</label><input type="text" value={tempUserProfile.nif || ''} onChange={e => setTempUserProfile({...tempUserProfile, nif: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>NISS</label><input type="text" value={tempUserProfile.niss || ''} onChange={e => setTempUserProfile({...tempUserProfile, niss: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                                
                                                <div style={{gridColumn:'1 / -1'}}>
                                                    <label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>CC (Formato auto)</label>
                                                    <input type="text" value={tempUserProfile.ncc || ''} onChange={handleCCChange} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px', fontFamily: 'monospace'}} />
                                                </div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Validade CC</label><input type="date" value={tempUserProfile.validade_cc || ''} onChange={e => setTempUserProfile({...tempUserProfile, validade_cc: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Dependentes</label><input type="number" value={tempUserProfile.nr_dependentes || 0} onChange={e => setTempUserProfile({...tempUserProfile, nr_dependentes: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Estado Civil</label><select value={tempUserProfile.estado_civil || ''} onChange={e => setTempUserProfile({...tempUserProfile, estado_civil: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px', background:'white'}}><option value="">-</option><option value="Solteiro">Solteiro</option><option value="Casado">Casado</option><option value="Divorciado">Divorciado</option><option value="União Facto">União Facto</option></select></div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Data Nasc.</label><input type="date" value={tempUserProfile.data_nascimento || ''} onChange={e => setTempUserProfile({...tempUserProfile, data_nascimento: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Data Admissão</label><input type="date" value={tempUserProfile.data_admissao || ''} onChange={e => setTempUserProfile({...tempUserProfile, data_admissao: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Nacionalidade</label><input type="text" value={tempUserProfile.nacionalidade || ''} onChange={e => setTempUserProfile({...tempUserProfile, nacionalidade: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Sexo</label><select value={tempUserProfile.sexo || ''} onChange={e => setTempUserProfile({...tempUserProfile, sexo: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px', background:'white'}}><option value="">-</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option></select></div>
                                            </div>
                                            <label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Morada</label>
                                            <input type="text" value={tempUserProfile.morada || ''} onChange={e => setTempUserProfile({...tempUserProfile, morada: e.target.value})} style={{width:'100%', marginBottom:'10px', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} />
                                            
                                            <div className="rh-user-form-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Telemóvel</label><input type="text" value={tempUserProfile.telemovel || ''} onChange={e => setTempUserProfile({...tempUserProfile, telemovel: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                                <div><label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Concelho</label><input type="text" value={tempUserProfile.concelho || ''} onChange={e => setTempUserProfile({...tempUserProfile, concelho: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px'}} /></div>
                                            </div>
                                            
                                            <label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Empresas Internas</label>
                                            <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'14px', padding:'10px', background:'#ffffff', border:'1px solid #cbd5e1', borderRadius:'8px'}}>
                                                {EMPRESAS_INTERNAS.map((empresa) => {
                                                    const isSelected = (tempUserProfile.empresas_internas || []).includes(empresa);
                                                    return (
                                                        <div
                                                            key={empresa}
                                                            onClick={() => handleToggleEmpresaInterna(empresa)}
                                                            style={{
                                                                padding:'7px 14px',
                                                                borderRadius:'20px',
                                                                fontSize:'0.8rem',
                                                                fontWeight:'600',
                                                                cursor:'pointer',
                                                                transition:'all 0.2s ease',
                                                                border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                                                background: isSelected ? '#eff6ff' : '#f8fafc',
                                                                color: isSelected ? '#2563eb' : '#64748b',
                                                                userSelect:'none'
                                                            }}
                                                        >
                                                            {empresa}
                                                        </div>
                                                    );
                                                })}
                                                {(tempUserProfile.empresas_internas || []).length === 0 && (
                                                    <span style={{color:'#94a3b8', fontSize:'0.82rem', fontStyle:'italic'}}>Selecione pelo menos uma empresa.</span>
                                                )}
                                            </div>
                                            
                                            <label style={{fontSize:'0.75rem', fontWeight:'600', color:'#475569'}}>Contrato</label>
                                            <select value={tempUserProfile.tipo_contrato || ''} onChange={e => setTempUserProfile({...tempUserProfile, tipo_contrato: e.target.value})} style={{width:'100%', marginBottom:'20px', padding:'8px', border:'1px solid #cbd5e1', borderRadius:'6px', background:'white'}}>
                                                <option value="">Selecione...</option><option value="Termo Certo">Termo Certo</option><option value="Sem Termo">Sem Termo</option><option value="Termo Incerto">Termo Incerto</option><option value="Estágio Profissional">Estágio Profissional</option><option value="Estágio Curricular">Estágio Curricular</option><option value="Prestação de Serviços">Prestação de Serviços</option><option value="N/a">N/a</option>
                                            </select>
                                            
                                            <div style={{display:'flex', gap:'10px'}}>
                                                <button type="button" onClick={() => setIsEditingUser(false)} style={{flex:1, padding:'10px', border:'1px solid #cbd5e1', borderRadius:'6px', background:'white', color:'#475569', fontWeight:'600'}}>Cancelar</button>
                                                <button type="button" onClick={handleUpdateUserProfile} style={{flex:1, padding:'10px', background:'#2563eb', color:'white', border:'none', borderRadius:'6px', fontWeight:'bold'}}>Gravar</button>
                                            </div>
                                            <div style={{marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', textAlign: 'center'}}>
                                                <button type="button" onClick={() => handleDeleteUser(selectedUser)} style={{background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px 15px', borderRadius: '6px', fontSize: '0.85rem', fontWeight:'bold', cursor: 'pointer', width: '100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
                                                    <Icons.Trash size={16} /> Apagar Colaborador
                                                </button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="card" style={{padding:'25px', background:'white', borderRadius:'12px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                                <h4 style={{margin:'0 0 20px 0', color:'#1e293b', fontSize:'1.1rem', display:'flex', alignItems:'center', gap:'8px'}}>
                                    <Icons.Chart size={18} color="#64748b"/>
                                    Processamento {currentDate.toLocaleDateString('pt-PT', {month:'long'})}
                                </h4>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', fontSize:'0.9rem', color:'#334155'}}><span>Dias Trabalhados (&gt;=4h) ({stats.countTrabalho})</span><span style={{fontWeight:'600'}}>+ {stats.valorSA} €</span></div>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', fontSize:'0.9rem', color:'#334155'}}><span>Férias ({stats.countFerias})</span><span style={{color:'#94a3b8'}}>-</span></div>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', fontSize:'0.9rem', color:'#ef4444', fontWeight:'500'}}><span>Faltas ({stats.countFaltas})</span><span style={{color:'#fca5a5'}}>-</span></div>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', fontSize:'0.9rem', color:'#8b5cf6'}}><span>Baixas ({stats.countBaixas})</span><span style={{color:'#c4b5fd'}}>-</span></div>
                                <div style={{marginTop:'20px', paddingTop:'15px', borderTop:'2px dashed #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontWeight:'bold', color:'#475569', fontSize:'0.9rem'}}>TOTAL S.A. PAGAR:</span><span style={{fontSize:'1.5rem', fontWeight:'800', color:'#16a34a'}}>{stats.valorSA} €</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card" style={{padding:'30px', background:'white', borderRadius:'12px', color:'#64748b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                            <h3 style={{margin:'0', color:'#1e293b', display:'flex', alignItems:'center', gap:'10px', fontSize:'1.2rem'}}>
                                <Icons.Chart size={24} color="#3b82f6"/> 
                                Resumo Global do Mês
                            </h3>
                            <ul style={{listStyle:'none', padding:0, marginTop:'25px'}}>
                                <li style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #f1f5f9'}}>
                                    <span style={{display:'flex', alignItems:'center', gap:'8px'}}><Icons.Sun size={18} color="#eab308"/> Férias Marcadas</span> 
                                    <span style={{fontWeight:'bold', color:'#1e293b'}}>{stats.countFerias} dias</span>
                                </li>
                                <li style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #f1f5f9'}}>
                                    <span style={{display:'flex', alignItems:'center', gap:'8px'}}><Icons.X size={18} color="#ef4444"/> Faltas</span> 
                                    <span style={{fontWeight:'bold', color:'#1e293b'}}>{stats.countFaltas} dias</span>
                                </li>
                                <li style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #f1f5f9'}}>
                                    <span style={{display:'flex', alignItems:'center', gap:'8px'}}><Icons.HeartPulse size={18} color="#8b5cf6"/> Baixas Médicas</span> 
                                    <span style={{fontWeight:'bold', color:'#1e293b'}}>{stats.countBaixas} dias</span>
                                </li>
                            </ul>
                            
                            <div style={{marginTop:'30px', paddingTop:'20px', borderTop:'2px solid #f8fafc'}}>
                                <h5 style={{margin:'0 0 15px 0', color:'#64748b', textTransform:'uppercase', fontSize:'0.75rem', fontWeight:'700', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:'6px'}}>
                                    <Icons.Clock size={14}/> Ausentes Hoje
                                </h5>
                                {ausentesHoje.length === 0 ? <div style={{background:'#f0fdf4', padding:'12px', borderRadius:'8px', color:'#166534', fontWeight:'600', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'8px'}}><Icons.Check size={18}/> Todos presentes!</div> : 
                                    ausentesHoje.map(a => <div key={a.id} style={{padding:'10px', border:'1px solid #e2e8f0', borderRadius:'8px', marginBottom:'8px', fontSize:'0.9rem', color:'#334155'}}><b style={{color:'#1e293b'}}>{a.nomeUser}</b> {a.infoHora} - {formatAbsenceTypeLabel(a.tipo)}</div>)
                                }
                            </div>
                            
                            <div style={{marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #f8fafc'}}>
                                <h5 style={{margin:'0 0 15px 0', color:'#64748b', textTransform:'uppercase', fontSize:'0.75rem', fontWeight:'700', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:'6px'}}>
                                    <Icons.Cake size={14}/> Aniversariantes de {currentDate.toLocaleDateString('pt-PT', {month:'long'})}
                                </h5>
                                {aniversariantes.length === 0 ? (
                                    <div style={{padding:'12px', borderRadius:'8px', color:'#94a3b8', fontSize:'0.9rem', fontStyle:'italic', background:'#f8fafc'}}>Ninguém faz anos este mês.</div>
                                ) : (
                                    <ul style={{listStyle:'none', padding:0}}>
                                        {aniversariantes.map(c => (
                                            <li key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f1f5f9', fontSize:'0.9rem'}}>
                                                <span style={{color:'#1e293b', fontWeight:'500'}}>{c.nome}</span>
                                                <span style={{fontWeight:'bold', color:'#eab308', background:'#fefce8', padding:'4px 8px', borderRadius:'6px'}}>Dia {new Date(c.data_nascimento).getDate()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:'20px', minWidth: 0}}>
                    {selectedUser ? (
                        <CalendarioColaborador
                            userId={selectedUser}
                            userName={currentUserProfile?.nome || 'Colaborador'}
                            dataAdmissao={currentUserProfile?.data_admissao}
                            onVacationBalanceUpdated={async () => {
                                await fetchColaboradores();
                                if (selectedUser) await fetchHistoricoUser(selectedUser);
                                await fetchDadosMensais();
                            }}
                        />
                    ) : (
                        <div className="card" style={{padding:'25px', background:'white', borderRadius:'12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
                                <button onClick={() => changeMonth(-1)} className="btn-small" style={{display:'flex', alignItems:'center', justifyContent:'center', padding:'8px', borderRadius:'50%'}}>
                                    <Icons.ChevronLeft size={18} color="#475569"/>
                                </button>
                                <h2 style={{margin:0, fontSize:'1.2rem', color:'#1e293b', textTransform:'capitalize'}}>{currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h2>
                                <button onClick={() => changeMonth(1)} className="btn-small" style={{display:'flex', alignItems:'center', justifyContent:'center', padding:'8px', borderRadius:'50%'}}>
                                    <Icons.ChevronRight size={18} color="#475569"/>
                                </button>
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px'}}>
                                {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={`wd-${i}`} style={{textAlign:'center', fontWeight:'800', color:'#94a3b8', fontSize:'0.8rem', paddingBottom:'10px'}}>{d}</div>)}
                                {renderCalendar()}
                            </div>
                        </div>
                    )}

                    {selectedUser && historicoUser.length > 0 && (
                        <div className="card" style={{padding:'25px', background:'white', borderRadius:'12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                            <h3 style={{marginTop:0, marginBottom:'20px', fontSize:'1.1rem', color:'#1e293b', display:'flex', alignItems:'center', gap:'8px'}}>
                                <Icons.Clock size={18} color="#64748b"/> Histórico de Ausências
                            </h3>
                            <div className="table-responsive" style={{maxHeight:'350px', overflowY:'auto'}}>
                                <table className="data-table" style={{fontSize:'0.9rem', width:'100%', borderCollapse:'collapse'}}>
                                    <thead>
                                        <tr style={{borderBottom:'2px solid #f1f5f9', color:'#64748b'}}>
                                            <th style={{padding:'10px', textAlign:'left'}}>Tipo</th>
                                            <th style={{padding:'10px', textAlign:'left'}}>Período</th>
                                            <th style={{padding:'10px', textAlign:'center'}}>Anexo</th>
                                            <th style={{padding:'10px', textAlign:'center'}}>Estado</th>
                                            <th style={{padding:'10px', textAlign:'center'}}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historicoUser.map(h => (
                                            <tr key={h.id} style={{borderBottom:'1px solid #f8fafc'}}>
                                                <td style={{padding:'10px', color:'#334155', fontWeight:'500'}}>{formatAbsenceTypeLabel(h.tipo)}</td>
                                                <td style={{padding:'10px', color:'#475569'}}>
                                                  {h.tipo === KM_REQUEST_TYPE ? (
                                                      <>
                                                          <div>{new Date(h.data_inicio).toLocaleDateString('pt-PT')}</div>
                                                          <div style={{fontSize: '0.8rem', color: '#94a3b8'}}>De {h.km_origem || '-'} para {h.km_destino || '-'} ({h.km_total ?? '-'} km)</div>
                                                      </>
                                                  ) : h.is_parcial ? (
                                                      <>
                                                          <div>{new Date(h.data_inicio).toLocaleDateString('pt-PT')}</div>
                                                          <div style={{fontSize: '0.8rem', color: '#94a3b8', display:'flex', alignItems:'center', gap:'4px'}}><Icons.Clock size={12}/> {h.hora_inicio?.slice(0,5)} às {h.hora_fim?.slice(0,5) || '...'}</div>
                                                      </>
                                                  ) : (
                                                      `${new Date(h.data_inicio).toLocaleDateString('pt-PT')} a ${new Date(h.data_fim).toLocaleDateString('pt-PT')}`
                                                  )}
                                                </td>
                                                <td style={{padding:'10px', textAlign:'center'}}>
                                                    {h.anexo_url ? <a href={h.anexo_url} target="_blank" rel="noreferrer" style={{color:'#2563eb', display:'inline-flex', alignItems:'center', gap:'4px', background:'#eff6ff', padding:'4px 8px', borderRadius:'6px', textDecoration:'none', fontSize:'0.8rem', fontWeight:'600'}}><Icons.Paperclip size={14}/> Ver</a> : <span style={{color:'#cbd5e1'}}>-</span>}
                                                </td>
                                                <td style={{padding:'10px', textAlign:'center'}}>
                                                    <span style={{background: h.estado === 'aprovado' ? '#dcfce7' : '#fee2e2', color: h.estado === 'aprovado' ? '#166534' : '#991b1b', padding:'4px 8px', borderRadius:'6px', fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase'}}>
                                                        {h.estado}
                                                    </span>
                                                </td>
                                                <td style={{padding:'10px', textAlign: 'center'}}>
                                                    <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                                                        <ModernTooltip content="Editar Registo">
                                                            <button className="btn-small" style={{color:'#3b82f6', background:'#eff6ff', borderColor:'#bfdbfe', padding:'6px'}} onClick={() => handleEditClick(h)}>
                                                                <Icons.Edit size={14} />
                                                            </button>
                                                        </ModernTooltip>
                                                        {h.estado === 'aprovado' && (
                                                            <ModernTooltip content="Cancelar e devolver dias">
                                                                <button className="btn-small" style={{color:'#ef4444', background:'#fef2f2', borderColor:'#fecaca', padding:'6px'}} onClick={() => abrirModalConfirmacao(h, 'cancelar_direto')}>
                                                                    <Icons.Trash size={14} />
                                                                </button>
                                                            </ModernTooltip>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </>
      )}

      {/* --- MODAIS EXISTENTES E NOVO MODAL DE DETALHES ABAIXO --- */}

      {/* NOVO MODAL: DETALHES DO PEDIDO (Ver Detalhes) */}
      {detailsModal.show && detailsModal.pedido && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'500px', maxWidth:'90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight:'90vh', overflowY:'auto'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:'1px solid #f1f5f9', paddingBottom:'15px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display:'flex', alignItems:'center', gap:'8px'}}>
                              <Icons.FileText size={20} color="#3b82f6" />
                              Detalhes do Pedido
                          </h3>
                          <button onClick={() => setDetailsModal({show: false, pedido: null})} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8'}}><Icons.X size={20}/></button>
                      </div>
                      
                      <div style={{display:'flex', flexDirection:'column', gap:'15px', marginBottom:'25px'}}>
                          <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                              <div style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'600', textTransform:'uppercase'}}>Colaborador</div>
                              <div style={{fontSize:'1.1rem', fontWeight:'bold', color:'#1e293b'}}>{detailsModal.pedido.profiles?.nome}</div>
                          </div>
                          
                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                              <div>
                                  <div style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'600'}}>{detailsModal.pedido.tipo === KM_REQUEST_TYPE ? 'Tipo de Pedido' : 'Tipo de Ausência'}</div>
                                  <div style={{fontWeight:'500', color:'#334155', marginTop:'2px'}}>{formatAbsenceTypeLabel(detailsModal.pedido.tipo)}</div>
                              </div>
                              <div>
                                  <div style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'600'}}>Estado Atual</div>
                                  <div style={{marginTop:'2px'}}>
                                      <span style={{background: detailsModal.pedido.estado === 'pendente' ? '#dbeafe' : (detailsModal.pedido.estado === 'pedido_cancelamento' ? '#fef08a' : '#f1f5f9'), color: detailsModal.pedido.estado === 'pendente' ? '#1e40af' : (detailsModal.pedido.estado === 'pedido_cancelamento' ? '#854d0e' : '#475569'), padding:'2px 8px', borderRadius:'6px', fontSize:'0.8rem', fontWeight:'700'}}>
                                          {detailsModal.pedido.estado.replace('_', ' ')}
                                      </span>
                                  </div>
                              </div>
                          </div>

                          <div style={{background:'#eff6ff', padding:'15px', borderRadius:'8px', border:'1px solid #bfdbfe', display:'flex', gap:'15px'}}>
                              <div style={{flex:1}}>
                                  <div style={{fontSize:'0.8rem', color:'#1e40af', fontWeight:'600'}}>Período</div>
                                  <div style={{fontWeight:'bold', color:'#1e3a8a', marginTop:'4px'}}>
                                      {detailsModal.pedido.is_parcial 
                                        ? new Date(detailsModal.pedido.data_inicio).toLocaleDateString('pt-PT')
                                        : `${new Date(detailsModal.pedido.data_inicio).toLocaleDateString('pt-PT')} a ${new Date(detailsModal.pedido.data_fim).toLocaleDateString('pt-PT')}`
                                      }
                                  </div>
                                  {detailsModal.pedido.is_parcial && (
                                      <div style={{fontSize:'0.85rem', color:'#3b82f6', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                                          <Icons.Clock size={14}/> {detailsModal.pedido.hora_inicio?.slice(0,5)} às {detailsModal.pedido.hora_fim?.slice(0,5) || '?'}
                                      </div>
                                  )}
                              </div>
                              <div style={{borderLeft:'1px solid #93c5fd', paddingLeft:'15px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                  <div style={{fontSize:'0.8rem', color:'#1e40af', fontWeight:'600'}}>Duração</div>
                                  <div style={{fontWeight:'bold', color:'#1e3a8a', fontSize:'1.1rem'}}>
                                      {detailsModal.pedido.tipo === KM_REQUEST_TYPE ? `${detailsModal.pedido.km_total ?? 0} km` : (detailsModal.pedido.is_parcial ? 'Horas' : `${calcularDiasUteis(detailsModal.pedido.data_inicio, detailsModal.pedido.data_fim)} dias úteis`)}
                                  </div>
                              </div>
                          </div>

                          {detailsModal.pedido.tipo === KM_REQUEST_TYPE && (
                              <div style={{background:'#f8fafc', padding:'12px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                                  <div style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'600', marginBottom:'4px'}}>Detalhe da Deslocação</div>
                                  <div style={{fontSize:'0.9rem', color:'#334155'}}>De <b>{detailsModal.pedido.km_origem || '-'}</b> para <b>{detailsModal.pedido.km_destino || '-'}</b></div>
                              </div>
                          )}

                          {detailsModal.pedido.motivo && (
                              <div>
                                  <div style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'600'}}>Observações / Motivo</div>
                                  <div style={{background:'#f8fafc', padding:'10px', borderRadius:'6px', border:'1px solid #e2e8f0', marginTop:'4px', fontSize:'0.9rem', color:'#334155', fontStyle:'italic'}}>
                                      "{detailsModal.pedido.motivo}"
                                  </div>
                              </div>
                          )}

                          {detailsModal.pedido.anexo_url && (
                              <div>
                                  <div style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'600'}}>Documento Anexo</div>
                                  <a href={detailsModal.pedido.anexo_url} target="_blank" rel="noreferrer" style={{display:'inline-flex', alignItems:'center', gap:'6px', background:'#f0fdf4', color:'#16a34a', padding:'8px 12px', borderRadius:'6px', border:'1px solid #bbf7d0', textDecoration:'none', marginTop:'4px', fontSize:'0.9rem', fontWeight:'600'}}>
                                      <Icons.Paperclip size={16}/> Abrir Documento
                                  </a>
                              </div>
                          )}
                          
                          <div style={{fontSize:'0.75rem', color:'#94a3b8', textAlign:'right', marginTop:'10px'}}>
                              Pedido efetuado a {new Date(detailsModal.pedido.created_at).toLocaleString('pt-PT')}
                          </div>
                      </div>

                      {/* Botões de Ação Rápidos dentro do Modal */}
                      {detailsModal.pedido.estado === 'pendente' || detailsModal.pedido.estado === 'pedido_cancelamento' ? (
                          <div style={{display: 'flex', gap: '10px', paddingTop:'15px', borderTop:'1px solid #f1f5f9'}}>
                              {detailsModal.pedido.estado === 'pendente' ? (
                                  <>
                                      <button onClick={() => abrirModalConfirmacao(detailsModal.pedido, 'rejeitar')} style={{padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color:'#ef4444', fontWeight:'bold', flex: 1, display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                                          <Icons.X size={18}/> Rejeitar
                                      </button>
                                      <button onClick={() => abrirModalConfirmacao(detailsModal.pedido, 'aprovar')} style={{padding: '12px', borderRadius: '8px', border: 'none', background: '#16a34a', color: 'white', fontWeight:'bold', flex: 2, display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                                          <Icons.Check size={18}/> {detailsModal.pedido.tipo === KM_REQUEST_TYPE ? 'Aprovar Deslocação' : 'Aprovar Ausência'}
                                      </button>
                                  </>
                              ) : (
                                  <>
                                      <button onClick={() => abrirModalConfirmacao(detailsModal.pedido, 'recusar_cancelamento')} style={{padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color:'#475569', fontWeight:'bold', flex: 1, cursor:'pointer'}}>Manter Férias</button>
                                      <button onClick={() => abrirModalConfirmacao(detailsModal.pedido, 'aceitar_cancelamento')} style={{padding: '12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight:'bold', flex: 1, cursor:'pointer'}}>Aceitar Cancelamento</button>
                                  </>
                              )}
                          </div>
                      ) : null}
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* Modal de Criar/Editar Ausência */}
      {showAbsenceModal && (
          <ModalPortal>
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                        <h3 style={{margin: 0, display:'flex', alignItems:'center', gap:'8px', color:'#1e293b'}}>
                            {isEditingAbsence ? <Icons.Edit size={20} color="#3b82f6"/> : <Icons.Sun size={20} color="#3b82f6"/>}
                            {isEditingAbsence ? 'Editar Ausência' : 'Registar Ausência'}
                        </h3>
                        <button type="button" onClick={closeAbsenceModal} style={{background:'none', border:'none', cursor:'pointer', color: '#94a3b8'}}><Icons.X size={20}/></button>
                    </div>
                    
                    <form onSubmit={handleSaveAbsence}>
                        <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Colaborador</label>
                        <select required value={newAbsence.user_id} onChange={e => setNewAbsence({...newAbsence, user_id: e.target.value})} style={{...inputStyle, background: isEditingAbsence || !!selectedUser ? '#f8fafc' : 'white'}} disabled={isEditingAbsence || !!selectedUser}>
                            <option value="">Selecione Colaborador...</option>
                            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        
                        <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Motivo da Ausência</label>
                        <select value={newAbsence.tipo} onChange={e => setNewAbsence({...newAbsence, tipo: e.target.value})} style={inputStyle} required>
                            <option value="Férias">Férias</option>
                            <option value={KM_REQUEST_TYPE}>{KM_REQUEST_TYPE}</option>
                            <option value="Assistência à família">Assistência à família</option>
                            <option value="Outros - Assuntos pessoais">Outros - Assuntos pessoais</option>
                            <option value="Ausência sem motivo - injustificada">Ausência sem motivo - injustificada</option>
                            <option value="Doença, acidente e obrigação legal">Doença, acidente e obrigação legal</option>
                            <option value="Casamento">Casamento</option>
                            <option value="Deslocação a estabelecimento de ensino">Deslocação a estabelecimento de ensino</option>
                            <option value="Licença maternal/paternal">Licença maternal/paternal</option>
                            <option value="Licença sem vencimento">Licença sem vencimento</option>
                            <option value="Falecimento de familiar">Falecimento de familiar</option>
                            <option value="Prestação de provas de avaliação">Prestação de provas de avaliação</option>
                            <option value="Candidato a cargo público">Candidato a cargo público</option>
                        </select>
                        
                        {newAbsence.tipo !== KM_REQUEST_TYPE && (
                        <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '15px', color: '#1e293b', fontWeight: '600', fontSize: '0.9rem', background: newAbsence.is_parcial ? '#eff6ff' : '#f8fafc', padding: '12px', borderRadius: '8px', border: newAbsence.is_parcial ? '1px solid #bfdbfe' : '1px solid #e2e8f0', transition:'0.2s'}}>
                            <input 
                                type="checkbox" 
                                checked={newAbsence.is_parcial} 
                                onChange={e => setNewAbsence({...newAbsence, is_parcial: e.target.checked, data_fim: e.target.checked ? newAbsence.data_inicio : newAbsence.data_fim})} 
                                style={{width: '18px', height: '18px', accentColor:'#2563eb'}} 
                            />
                            <Icons.Clock size={18} color={newAbsence.is_parcial ? '#2563eb' : '#64748b'}/> 
                            Ausência Parcial (Apenas algumas horas)
                        </label>
                        )}

                        {newAbsence.tipo === KM_REQUEST_TYPE ? (
                            <>
                                <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Data da Deslocação</label>
                                <input type="date" required value={newAbsence.data_inicio} onChange={e=>setNewAbsence({...newAbsence, data_inicio: e.target.value, data_fim: e.target.value})} style={inputStyle}/>

                                <div style={{display:'flex', gap:'15px'}}>
                                      <div style={{flex:1}}>
                                          <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>De</label>
                                          <input type="text" required value={newAbsence.km_origem} onChange={e=>setNewAbsence({...newAbsence, km_origem: e.target.value})} style={inputStyle} placeholder="Ex: Portimão"/>
                                      </div>
                                      <div style={{flex:1}}>
                                          <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Para</label>
                                          <input type="text" required value={newAbsence.km_destino} onChange={e=>setNewAbsence({...newAbsence, km_destino: e.target.value})} style={inputStyle} placeholder="Ex: Faro"/>
                                      </div>
                                </div>

                                <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Km total</label>
                                <input type="number" min="0" step="0.1" required value={newAbsence.km_total} onChange={e=>setNewAbsence({...newAbsence, km_total: e.target.value})} style={inputStyle} placeholder="Ex: 72"/>
                            </>
                        ) : !newAbsence.is_parcial ? (
                            <div style={{display:'flex', gap:'15px'}}>
                                  <div style={{flex:1}}>
                                      <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Data Início</label>
                                      <input type="date" required value={newAbsence.data_inicio} onChange={e=>setNewAbsence({...newAbsence, data_inicio: e.target.value})} style={inputStyle}/>
                                  </div>
                                  <div style={{flex:1}}>
                                      <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Data Fim</label>
                                      <input type="date" required value={newAbsence.data_fim} onChange={e=>setNewAbsence({...newAbsence, data_fim: e.target.value})} style={inputStyle}/>
                                  </div>
                            </div>
                        ) : (
                            <div style={{display: 'flex', gap: '15px'}}>
                                <div style={{flex: 1.5}}>
                                    <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Data</label>
                                    <input type="date" value={newAbsence.data_inicio} onChange={e => setNewAbsence({...newAbsence, data_inicio: e.target.value, data_fim: e.target.value})} required style={inputStyle}/>
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Saída</label>
                                    <input type="time" value={newAbsence.hora_inicio} onChange={e => setNewAbsence({...newAbsence, hora_inicio: e.target.value})} required style={inputStyle}/>
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Regresso</label>
                                    <input type="time" value={newAbsence.hora_fim} onChange={e => setNewAbsence({...newAbsence, hora_fim: e.target.value})} style={inputStyle}/>
                                </div>
                            </div>
                        )}

                        {newAbsence.tipo !== KM_REQUEST_TYPE && !newAbsence.is_parcial && newAbsence.data_inicio && newAbsence.data_fim && (
                            <div style={{background: diasUteisModal > 0 ? '#eff6ff' : '#fee2e2', color: diasUteisModal > 0 ? '#1e40af' : '#991b1b', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', display: 'flex', gap: '10px', border: diasUteisModal > 0 ? '1px solid #bfdbfe' : '1px solid #fecaca'}}>
                                <span style={{marginTop:'2px'}}>{diasUteisModal > 0 ? <Icons.Info size={16}/> : <Icons.Alert size={16}/>}</span>
                                <span>
                                    {diasUteisModal > 0 
                                        ? (isVacationType(newAbsence.tipo) 
                                            ? <span>Este registo consumirá <b>{diasUteisModal} dia(s) útil(eis)</b> de férias do colaborador.</span> 
                                            : <span>Registará <b>{diasUteisModal} dia(s) útil(eis)</b> de ausência. Tratando-se de justificação, não desconta férias.</span>)
                                        : <span>Atenção: O período selecionado calha num fim de semana ou feriado. Não há dias úteis a contabilizar.</span>}
                                </span>
                            </div>
                        )}
                        {newAbsence.tipo !== KM_REQUEST_TYPE && newAbsence.is_parcial && newAbsence.data_inicio && (
                            <div style={{background: '#eff6ff', color: '#1e40af', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', display: 'flex', gap: '10px', border:'1px solid #bfdbfe'}}>
                                <span style={{marginTop:'2px'}}><Icons.Info size={16}/></span>
                                <span>Ausência parcial de horas. <b>Não será deduzido nenhum dia de férias ao colaborador.</b></span>
                            </div>
                        )}

                        {newAbsence.tipo === KM_REQUEST_TYPE && (
                            <div style={{background: '#eff6ff', color: '#1e40af', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', display: 'flex', gap: '10px', border:'1px solid #bfdbfe'}}>
                                <span style={{marginTop:'2px'}}><Icons.Info size={16}/></span>
                                <span>Este pedido de Km's entra no fluxo de aprovação e no relatório mensal.</span>
                            </div>
                        )}

                        <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Notas / Observações</label>
                        <input type="text" placeholder="Mais detalhes (Opcional)..." value={newAbsence.motivo} onChange={e=>setNewAbsence({...newAbsence, motivo: e.target.value})} style={inputStyle}/>
                        
                        <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Anexar Documento (Atestados, PDFs - Opcional)</label>
                        {isEditingAbsence && editingAbsenceData?.anexo_url && <div style={{fontSize:'0.8rem', color:'#64748b', marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px'}}><Icons.Paperclip size={14}/> Ficheiro atual: <a href={editingAbsenceData.anexo_url} target="_blank" rel="noreferrer" style={{color:'#2563eb'}}>Ver documento</a></div>}
                        <input type="file" accept=".pdf, image/*" onChange={e => setAbsenceFile(e.target.files[0])} style={{...inputStyle, background: '#f8fafc'}} />
                        
                        <div style={{display:'flex', gap:'10px', marginTop:'15px', paddingTop:'15px', borderTop:'1px solid #e2e8f0'}}>
                            <button type="button" onClick={closeAbsenceModal} style={{flex:1, padding:'12px', background:'white', border:'1px solid #cbd5e1', borderRadius:'8px', cursor:'pointer', color: '#475569', fontWeight:'bold'}}>Cancelar</button>
                            <button type="submit" style={{flex:2, padding:'12px', background:'#2563eb', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', opacity: isSubmitting || (newAbsence.tipo !== KM_REQUEST_TYPE && !newAbsence.is_parcial && diasUteisModal === 0) ? 0.7 : 1}} disabled={isSubmitting || (newAbsence.tipo !== KM_REQUEST_TYPE && !newAbsence.is_parcial && diasUteisModal === 0)}>
                                {isSubmitting ? "A Gravar..." : (isEditingAbsence ? "Atualizar Registo" : "Gravar e Aprovar Automaticamente")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
          </ModalPortal>
      )}

      {/* Modal Confirmação (Ações) */}
      {confirmModal.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{display:'flex', justifyContent:'center', marginBottom: '15px'}}>
                          {['aprovar', 'aceitar_cancelamento', 'cancelar_direto'].includes(confirmModal.acao) 
                              ? <div style={{background:'#dcfce7', padding:'15px', borderRadius:'50%', color:'#16a34a'}}><Icons.Check size={32}/></div> 
                              : <div style={{background:'#fee2e2', padding:'15px', borderRadius:'50%', color:'#ef4444'}}><Icons.X size={32}/></div>}
                      </div>
                      <h3 style={{marginTop: 0, color: '#1e293b'}}>Confirmar Ação</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5', fontSize:'0.95rem'}}>
                          {confirmModal.acao === 'aprovar' && <span>Tens a certeza que queres aprovar o pedido de <b>{formatAbsenceTypeLabel(confirmModal.pedido?.tipo)}</b>?</span>}
                          {confirmModal.acao === 'rejeitar' && <span>Tens a certeza que queres rejeitar este pedido?</span>}
                          {(confirmModal.acao === 'aceitar_cancelamento' || confirmModal.acao === 'cancelar_direto') && <span>Tens a certeza que queres cancelar e devolver os dias ao colaborador (se férias)?</span>}
                          {confirmModal.acao === 'recusar_cancelamento' && <span>Queres recusar o pedido de cancelamento e manter o registo aprovado?</span>}
                      </p>
                      <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                          <button onClick={() => setConfirmModal({ show: false, pedido: null, acao: null })} style={{padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color:'#475569', fontWeight:'bold', flex: 1, cursor:'pointer'}}>Voltar</button>
                          <button onClick={executarAcaoRH} style={{padding: '12px', borderRadius: '8px', border: 'none', flex: 1, color: 'white', background: ['aprovar', 'recusar_cancelamento'].includes(confirmModal.acao) ? '#16a34a' : '#ef4444', fontWeight:'bold', cursor:'pointer'}}>
                              Confirmar
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* Modal Confirmação S.A. Global */}
      {showBulkSAConfirmModal && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'430px', maxWidth:'92%', textAlign:'center', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{display:'flex', justifyContent:'center', marginBottom:'15px'}}>
                          <div style={{background:'#eff6ff', padding:'15px', borderRadius:'50%', color:'#2563eb'}}><Icons.Currency size={30}/></div>
                      </div>
                      <h3 style={{marginTop:0, color:'#1e293b'}}>{modalTitle}</h3>
                      <p style={{color:'#64748b', marginBottom:'25px', lineHeight:'1.5', fontSize:'0.95rem'}}>
                          {modalDescription}
                      </p>
                      <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                          <button
                              type="button"
                              onClick={() => setShowBulkSAConfirmModal(false)}
                              disabled={isApplyingBulkSA}
                              style={{padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', color:'#475569', fontWeight:'bold', flex:1, cursor:'pointer', opacity: isApplyingBulkSA ? 0.7 : 1}}
                          >
                              Cancelar
                          </button>
                          <button
                              type="button"
                              onClick={confirmarBulkUpdateSA}
                              disabled={isApplyingBulkSA}
                              style={{padding:'12px', borderRadius:'8px', border:'none', flex:1, color:'white', background:'#2563eb', fontWeight:'bold', cursor:'pointer', opacity: isApplyingBulkSA ? 0.7 : 1}}
                          >
                              {isApplyingBulkSA ? 'A aplicar...' : 'Confirmar'}
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* Modal de Notificação */}
      {notification.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'350px', textAlign: 'center', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)'}}>
                      <div style={{display:'flex', justifyContent:'center', marginBottom: '15px'}}>
                          {notification.type === 'success' 
                              ? <div style={{background:'#dcfce7', padding:'15px', borderRadius:'50%', color:'#16a34a'}}><Icons.Check size={32}/></div> 
                              : <div style={{background:'#fee2e2', padding:'15px', borderRadius:'50%', color:'#ef4444'}}><Icons.Alert size={32}/></div>}
                      </div>
                      <h3 style={{marginTop: 0, color:'#1e293b'}}>{notification.type === 'success' ? 'Sucesso!' : 'Erro'}</h3>
                      <p style={{color:'#475569', fontSize:'0.95rem', marginBottom:'25px'}}>{notification.message}</p>
                      <button onClick={() => setNotification({ show: false, message: '', type: 'success' })} style={{width: '100%', padding:'12px', background:'#2563eb', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* Modal Nova Tolerância */}
      {showToleranciaModal && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'460px', maxWidth:'90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                          <h3 style={{margin: 0, display:'flex', alignItems:'center', gap:'8px', color:'#1e293b'}}>
                              <Icons.Clock size={20} color="#3b82f6"/> Nova Tolerância de Ponto
                          </h3>
                          <button type="button" onClick={() => setShowToleranciaModal(false)} style={{background:'none', border:'none', cursor:'pointer', color: '#94a3b8'}}><Icons.X size={20}/></button>
                      </div>
                      <form onSubmit={handleSaveTolerancia}>
                          <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Designação</label>
                          <input type="text" required placeholder="Ex: Véspera de Natal" value={newTolerancia.nome} onChange={e => setNewTolerancia({...newTolerancia, nome: e.target.value})} style={{...inputStyle, marginTop:'4px'}}/>

                          <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Data</label>
                          <input type="date" required value={newTolerancia.data} onChange={e => setNewTolerancia({...newTolerancia, data: e.target.value})} style={{...inputStyle, marginTop:'4px'}}/>

                          <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569', display:'block', marginBottom:'8px'}}>Âmbito</label>
                          <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                              <button type="button" onClick={() => setNewTolerancia({...newTolerancia, tipo: 'global', user_id: ''})} style={{flex:1, padding:'12px 10px', borderRadius:'8px', border: newTolerancia.tipo === 'global' ? '2px solid #2563eb' : '1px solid #e2e8f0', background: newTolerancia.tipo === 'global' ? '#eff6ff' : '#f8fafc', color: newTolerancia.tipo === 'global' ? '#1d4ed8' : '#475569', fontWeight:'600', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', transition:'0.2s'}}>
                                  <Icons.Users size={18} color={newTolerancia.tipo === 'global' ? '#2563eb' : '#94a3b8'}/>
                                  <span style={{fontSize:'0.85rem'}}>Global</span>
                                  <span style={{fontSize:'0.72rem', opacity:0.7}}>Toda a empresa</span>
                              </button>
                              <button type="button" onClick={() => setNewTolerancia({...newTolerancia, tipo: 'individual'})} style={{flex:1, padding:'12px 10px', borderRadius:'8px', border: newTolerancia.tipo === 'individual' ? '2px solid #16a34a' : '1px solid #e2e8f0', background: newTolerancia.tipo === 'individual' ? '#f0fdf4' : '#f8fafc', color: newTolerancia.tipo === 'individual' ? '#166534' : '#475569', fontWeight:'600', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', transition:'0.2s'}}>
                                  <Icons.User size={18} color={newTolerancia.tipo === 'individual' ? '#16a34a' : '#94a3b8'}/>
                                  <span style={{fontSize:'0.85rem'}}>Individual</span>
                                  <span style={{fontSize:'0.72rem', opacity:0.7}}>Um colaborador</span>
                              </button>
                          </div>

                          {newTolerancia.tipo === 'individual' && (
                              <>
                                  <label style={{fontSize: '0.8rem', fontWeight: 'bold', color:'#475569'}}>Colaborador</label>
                                  <select required value={newTolerancia.user_id} onChange={e => setNewTolerancia({...newTolerancia, user_id: e.target.value})} style={{...inputStyle, marginTop:'4px', background:'white'}}>
                                      <option value="">Selecione Colaborador...</option>
                                      {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                  </select>
                              </>
                          )}

                          <div style={{display:'flex', gap:'10px', marginTop:'10px', paddingTop:'15px', borderTop:'1px solid #e2e8f0'}}>
                              <button type="button" onClick={() => setShowToleranciaModal(false)} style={{flex:1, padding:'12px', background:'white', border:'1px solid #cbd5e1', borderRadius:'8px', cursor:'pointer', color: '#475569', fontWeight:'bold'}}>Cancelar</button>
                              <button type="submit" disabled={isSubmittingTolerancia} style={{flex:2, padding:'12px', background:'#2563eb', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', opacity: isSubmittingTolerancia ? 0.7 : 1}}>
                                  {isSubmittingTolerancia ? 'A guardar...' : 'Guardar Tolerância'}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      <style>{`
          .btn-small:hover { opacity: 0.8; transform: translateY(-1px); }
          .hover-bg-gray:hover { background: #f8fafc !important; }
          @media (max-width: 1180px) {
              .rh-grid { grid-template-columns: 1fr !important; }
          }
          @media (max-width: 900px) {
              .rh-toolbar { align-items: stretch !important; }
              .rh-toolbar-actions {
                  width: 100%;
                  flex-wrap: wrap;
              }
              .rh-toolbar-actions > * {
                  flex: 1 1 220px;
              }
              .rh-user-select {
                  min-width: 0 !important;
                  width: 100%;
              }
          }
          @media (max-width: 720px) {
              .rh-user-tabs {
                  flex-direction: column;
              }
              .rh-readonly-grid,
              .rh-user-form-grid {
                  grid-template-columns: 1fr !important;
              }
          }
      `}</style>
    </div>
  );
}