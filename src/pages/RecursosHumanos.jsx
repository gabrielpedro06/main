import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import gerarRelatorioRecursosHumanos from "../components/pdfRecursosHumanos";
import gerarRelatorioIndividual from "../components/pdfIndividual";
import gerarRelatorioDeslocacoesMensais from "../components/pdfDeslocacoesMensais";
import CalendarioColaborador from "../components/CalendarioColaborador";
import FancySelect from "../components/FancySelect";
import * as XLSX from "xlsx";
import {
    calcularDiasUteis as calcularDiasUteisFerias,
    buildToleranciasSkipSet,
    calcularDiasUteisNoMes,
    COLLABORATOR_STATUS_TYPES,
    formatAbsenceTypeLabel,
    getAnnualVacationLimitFromProfile,
    getAttendanceCalculationStartDate,
    getFeriados,
    isAnnualVacationOpeningAvailable,
    isCollaboratorStatusType,
    isVacationType,
    normalizeAbsenceType,
    obterSaldoFeriasAnoComTransicao,
    parseLocalDate,
    sincronizarSaldoFeriasPerfil,
    validarSaldoFeriasParaIntervalo,
} from "../utils/feriasSaldo";
import { createDashboardNotifications } from "../utils/dashboardNotifications";
import "./../styles/dashboard.css"; 
import "./../styles/rh.css";

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

Icons.Search = ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;

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
                        border: "1px solid var(--color-borderColor)",
                        background: "var(--color-bgSecondary)",
                        boxShadow: "0 10px 22px rgba(29, 78, 216, 0.14)",
                        color: "var(--color-btnPrimaryDark)",
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
                            border: "1px solid var(--color-borderColor)",
                            background: "var(--color-bgSecondary)",
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

const isMissingFunctionError = (error) => {
    if (!error) return false;
    return error.code === "42883" || /function .* does not exist/i.test(error.message || "");
};

const MIN_SA_WORK_SECONDS = 5 * 60 * 60;

const timeToSeconds = (timeValue) => {
    if (!timeValue || typeof timeValue !== "string") return null;

    const [hours = "0", minutes = "0", seconds = "0"] = timeValue.split(":");
    const h = Number(hours);
    const m = Number(minutes);
    const s = Number(seconds);

    if (![h, m, s].every(Number.isFinite)) return null;
    return (h * 3600) + (m * 60) + s;
};

const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
    }).format(Number(value) || 0);

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

const clampDateToRange = (dateValue, startDate, endDate) => {
    if (!dateValue) return null;
    if (startDate && dateValue < startDate) return null;
    if (endDate && dateValue > endDate) return null;
    return dateValue;
};

const isBusinessDayDate = (dateValue, holidaySet = new Set()) => {
    const parsed = parseLocalDate(dateValue);
    if (!parsed) return false;

    const day = parsed.getDay();
    if (day === 0 || day === 6) return false;

    return !holidaySet.has(dateValue);
};

const createHolidaySetForMonth = (year, month) => {
    return new Set(
        getFeriados(year)
            .filter((f) => f.m === month)
            .map((f) => `${year}-${String(f.m + 1).padStart(2, "0")}-${String(f.d).padStart(2, "0")}`),
    );
};

const countMealAllowanceEligibleDaysInPeriod = (
    attendanceRows = [],
    { startDate = "", endDate = "", holidaySet = new Set() } = {},
) => {
    const totalSecondsByDay = new Map();

    const hojeStr = new Date().toISOString().split('T')[0];
    (attendanceRows || []).forEach((row) => {
        const dayKey = clampDateToRange(row?.data_registo, startDate, endDate);
        if (!dayKey || !isBusinessDayDate(dayKey, holidaySet)) return;
        // Só considerar dias anteriores ao dia de hoje
        if (dayKey >= hojeStr) return;

        const effectiveSeconds = getEffectiveWorkedSeconds(row);
        if (effectiveSeconds <= 0) return;

        totalSecondsByDay.set(dayKey, (totalSecondsByDay.get(dayKey) || 0) + effectiveSeconds);
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
        const [saldoFeriasAnoSelecionado, setSaldoFeriasAnoSelecionado] = useState(null);
        const [saldoFeriasAnoSeguinte, setSaldoFeriasAnoSeguinte] = useState(null);
    const [isGeneratingRhPdf, setIsGeneratingRhPdf] = useState(false);
    const [isGeneratingIndividualPdf, setIsGeneratingIndividualPdf] = useState(false);
        const [isGeneratingDeslocacoesPdf, setIsGeneratingDeslocacoesPdf] = useState(false);

  // Tolerâncias de Ponto
  const [tolerancias, setTolerancias] = useState([]);
  const [showToleranciaModal, setShowToleranciaModal] = useState(false);
  const [newTolerancia, setNewTolerancia] = useState({ nome: '', data: '', tipo: 'global', user_id: '' });
  const [isSubmittingTolerancia, setIsSubmittingTolerancia] = useState(false);
  
  // --- FORMAÇÕES ---
  const [formacoes, setFormacoes] = useState([]);
  const [showFormacaoModal, setShowFormacaoModal] = useState(false);
  const [newFormacao, setNewFormacao] = useState({
      nome: '', data_inicio: '', data_fim: '', total_horas: '', user_ids: []
  });
  const [isSubmittingFormacao, setIsSubmittingFormacao] = useState(false);
  const [deleteFormacaoModal, setDeleteFormacaoModal] = useState({ show: false, grupo: null });

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
    // States para seleção múltipla
  const [selectedPedidosPendentes, setSelectedPedidosPendentes] = useState([]);
  const [selectedPedidosKm, setSelectedPedidosKm] = useState([]);
  const [pedidosBusca, setPedidosBusca] = useState('');
  const dadosMensaisReqRef = useRef(0);
  const [pedidosTipoFiltro, setPedidosTipoFiltro] = useState('todos');
    const [bulkApproveModal, setBulkApproveModal] = useState({ show: false, tipo: null, pedidos: [] });
    const [userStatusModal, setUserStatusModal] = useState({ show: false, profile: null, nextActive: true });

  const toLocalDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  // --- NOVA FUNÇÃO HELPER PARA CALCULAR DIAS TENDO EM CONTA HORAS DECIMAIS ---
  const getDiasDoPedido = (pedido, userId) => {
      if (!isVacationType(pedido.tipo)) return 0;
      if (pedido.is_parcial && pedido.hora_inicio && pedido.hora_fim) {
          const [hI, mI] = pedido.hora_inicio.split(':').map(Number);
          const [hF, mF] = pedido.hora_fim.split(':').map(Number);
          const diferenca = (hF - hI) + ((mF - mI) / 60);
          return diferenca > 0 ? (diferenca / 8) : 0;
      }
      
      return calcularDiasFeriasComTolerancias(userId, pedido.data_inicio, pedido.data_fim || pedido.data_inicio);
  };

  const getDuracaoAusenciaUI = (pedido) => {
      if (pedido.is_parcial && pedido.hora_inicio && pedido.hora_fim) {
          const [hI, mI] = pedido.hora_inicio.split(':').map(Number);
          const [hF, mF] = pedido.hora_fim.split(':').map(Number);
          const diferenca = (hF - hI) + ((mF - mI) / 60);
          return diferenca > 0 ? (diferenca / 8) : 0;
      }
      return calcularDiasUteis(pedido.data_inicio, pedido.data_fim || pedido.data_inicio);
  };

  const getTemporaryStatusFromProfile = (profile) => {
      const tipo = String(profile?.estado_temporario_tipo || '').trim();
      if (!tipo || !isCollaboratorStatusType(tipo)) return null;

      return {
          tipo,
          data_inicio: profile?.estado_temporario_inicio || '',
          data_fim: profile?.estado_temporario_fim || '',
          motivo: profile?.estado_temporario_motivo || '',
      };
  };

  const getTemporaryStatusStyle = (tipo = '') => {
      const normalized = normalizeAbsenceType(tipo);

      if (normalized.includes('ferias')) {
          return { cor: '#fefce8', textoCor: '#854d0e', badge: 'Férias' };
      }

      if (normalized.includes('licenca')) {
          return { cor: '#eff6ff', textoCor: '#1d4ed8', badge: 'Licença' };
      }

      if (normalized.includes('doenca') || normalized.includes('acidente') || normalized.includes('obrigacao legal')) {
          return { cor: '#faf5ff', textoCor: '#6b21a8', badge: 'Baixa' };
      }

      if (normalized.includes('casamento') || normalized.includes('falecimento')) {
          return { cor: '#fff7ed', textoCor: '#c2410c', badge: formatAbsenceTypeLabel(tipo) };
      }

      return { cor: '#f0f9ff', textoCor: '#0c4a6e', badge: formatAbsenceTypeLabel(tipo) };
  };

  const isTemporaryStatusActiveOnDate = (estado, dateValue) => {
      if (!estado?.tipo || !estado?.data_inicio || !dateValue) return false;

      const data = parseLocalDate(dateValue);
      const inicio = parseLocalDate(estado.data_inicio);
      const fim = parseLocalDate(estado.data_fim || estado.data_inicio);
      if (!data || !inicio || !fim) return false;

      return data >= inicio && data <= fim;
  };

  const formatTemporaryStatusRange = (estado) => {
      if (!estado?.data_inicio) return '';

      const inicio = new Date(`${estado.data_inicio}T00:00:00`);
      const fim = estado.data_fim ? new Date(`${estado.data_fim}T00:00:00`) : null;
      if (fim && estado.data_fim !== estado.data_inicio) {
          return `${inicio.toLocaleDateString('pt-PT')} a ${fim.toLocaleDateString('pt-PT')}`;
      }

      return inicio.toLocaleDateString('pt-PT');
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
        async function provisionarSaldosFeriasAnoSeguinte() {
            const hoje = new Date();
            if (hoje.getMonth() !== 11) return;

            const { error } = await supabase.rpc("provisionar_saldos_ferias", {
                p_ano: hoje.getFullYear() + 1,
            });
            if (error && !isMissingFunctionError(error)) {
                console.error("Erro ao provisionar saldos anuais de férias:", error);
            }
        }

        async function initRhData() {
                try {
                        await provisionarSaldosFeriasAnoSeguinte();
                        await detectarColunaDiasFeriasTotal();
                        fetchColaboradores();
                        fetchPedidosPendentes();
                        fetchPedidosKmPendentes();
                        fetchTolerancias();
                        fetchFormacoes();
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

  const isProcessamentoView = activeView === 'processamento';
  useEffect(() => {
            fetchDadosMensais();
        }, [selectedUser, currentDate, colaboradores, isProcessamentoView]);

    useEffect(() => {
        if (!selectedUser) {
            setSaldoFeriasAnoSelecionado(null);
            setSaldoFeriasAnoSeguinte(null);
            return;
        }

        let isMounted = true;
        const profile = colaboradores.find((colaborador) => colaborador.id === selectedUser);
        const anoSelecionado = currentDate.getFullYear();
        const anoSeguinte = anoSelecionado + 1;
        const isNextVacationYearAvailable = isAnnualVacationOpeningAvailable();
        const saldoAtualPromise = obterSaldoFeriasAnoComTransicao({
            supabaseClient: supabase,
            userId: selectedUser,
            ano: anoSelecionado,
            diasLimiteAnual: getAnnualVacationLimitFromProfile(profile),
            dataAdmissao: profile?.data_admissao,
            tolerancias,
            dataReferencia: currentDate,
        });
        const saldoSeguintePromise = isNextVacationYearAvailable
            ? obterSaldoFeriasAnoComTransicao({
                supabaseClient: supabase,
                userId: selectedUser,
                ano: anoSeguinte,
                diasLimiteAnual: getAnnualVacationLimitFromProfile(profile),
                dataAdmissao: profile?.data_admissao,
                tolerancias,
                dataReferencia: new Date(anoSeguinte, 0, 1),
            })
            : Promise.resolve(null);

        Promise.all([saldoAtualPromise, saldoSeguintePromise]).then(([saldoAtual, saldoSeguinte]) => {
            if (!isMounted) return;
            setSaldoFeriasAnoSelecionado(saldoAtual);
            setSaldoFeriasAnoSeguinte(saldoSeguinte);
        }).catch((error) => {
            console.error("Erro ao carregar saldo anual de férias:", error);
            if (isMounted) {
                setSaldoFeriasAnoSelecionado(null);
                setSaldoFeriasAnoSeguinte(null);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [selectedUser, currentDate, colaboradores, tolerancias]);

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
                        estado_temporario_tipo: u.estado_temporario_tipo || '',
                        estado_temporario_inicio: u.estado_temporario_inicio || '',
                        estado_temporario_fim: u.estado_temporario_fim || '',
                        estado_temporario_motivo: u.estado_temporario_motivo || '',
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
      } else if (newAbsence.is_parcial && newAbsence.data_inicio && newAbsence.hora_inicio && newAbsence.hora_fim) {
          const [hInicio, mInicio] = newAbsence.hora_inicio.split(':').map(Number);
          const [hFim, mFim] = newAbsence.hora_fim.split(':').map(Number);
          const diferencaHoras = (hFim - hInicio) + ((mFim - mInicio) / 60);

          if (diferencaHoras >= 8) {
              showNotification("O intervalo inserido é de 8 horas ou mais. O pedido foi automaticamente alterado para um dia completo.", "success");
              setNewAbsence(prev => ({
                  ...prev,
                  is_parcial: false,
                  hora_inicio: "",
                  hora_fim: "",
                  data_fim: prev.data_inicio
              }));
          } else if (diferencaHoras > 0) {
              setDiasUteisModal(diferencaHoras / 8);
          } else {
              setDiasUteisModal(0);
          }
      } else {
          setDiasUteisModal(0);
      }
  }, [newAbsence.data_inicio, newAbsence.data_fim, newAbsence.is_parcial, newAbsence.hora_inicio, newAbsence.hora_fim, newAbsence.user_id, tolerancias]);

  const showNotification = (msg, type = 'success') => {
      setNotification({ show: true, message: msg, type });
  };

  const colaboradoresAtivos = colaboradores.filter((c) => c.ativo !== false);
  const colaboradoresInativos = colaboradores.filter((c) => c.ativo === false);

  const openUserStatusModal = (profile) => {
      if (!profile) return;
      setUserStatusModal({
          show: true,
          profile,
          nextActive: profile.ativo === false,
      });
  };

  const closeUserStatusModal = () => {
      setUserStatusModal({ show: false, profile: null, nextActive: true });
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

  async function sincronizarSaldoFeriasDosPerfis(userIds = [], ano = new Date().getFullYear()) {
      if (!hasDiasFeriasTotalColumn) return;

      const idsUnicos = [...new Set((userIds || []).filter(Boolean))];
      if (idsUnicos.length === 0) return;

      await Promise.all(
          idsUnicos.map(async (userId) => {
              const diasLimiteAnual = await getDiasLimiteAnualAtualPorUserId(userId);
              return sincronizarSaldoFeriasPerfil({
                  supabaseClient: supabase,
                  userId,
                  ano,
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
                ativo: profile.ativo !== false,
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
    const reqId = ++dadosMensaisReqRef.current;
    const scopeUser = activeView === 'processamento' ? null : selectedUser;
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
                const endOfMonth = toLocalDateString(new Date(year, month, 0));
        const startOfAttendanceWindow = scopeUser
            ? getAttendanceStartForUser(scopeUser)
            : getAttendanceCalculationStartDate(startOfMonth);

        let qAssiduidade = supabase.from("assiduidade").select("*").gte("data_registo", startOfAttendanceWindow).lte("data_registo", endOfMonth);
        if (scopeUser) qAssiduidade = qAssiduidade.eq("user_id", scopeUser);
        const { data: dAssiduidade } = await qAssiduidade;
        if (reqId !== dadosMensaisReqRef.current) return;

        let qFerias = supabase
            .from("ferias")
            .select("*")
            .neq('estado', 'rejeitado')
            .neq('estado', 'cancelado')
            .lte("data_inicio", endOfMonth)
            .gte("data_fim", startOfAttendanceWindow);
        if (scopeUser) qFerias = qFerias.or(`user_id.eq.${scopeUser},user_id.is.null`);
        const { data: dFerias } = await qFerias;
        if (reqId !== dadosMensaisReqRef.current) return;
        setAssiduidadeMes(dAssiduidade || []);
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

  async function notificarAlteracaoPedido(pedido, novoEstado, acao) {
      if (!pedido?.user_id) return;

      const tipoPedido = formatAbsenceTypeLabel(pedido.tipo);
      const dataPedido = pedido.data_inicio ? new Date(pedido.data_inicio).toLocaleDateString("pt-PT") : "";
      const isCancelamentoRecusado = acao === "recusar_cancelamento";
      const estadoLabel = novoEstado === "aprovado" ? "aprovado" : novoEstado === "rejeitado" ? "recusado" : "cancelado";
      const title = isCancelamentoRecusado
          ? "Pedido de cancelamento recusado"
          : `Pedido de ausência ${estadoLabel}`;
      const message = isCancelamentoRecusado
          ? `O pedido de cancelamento do seu pedido de ${tipoPedido} de ${dataPedido} foi recusado. O pedido original mantém-se aprovado.`
          : `O seu pedido de ${tipoPedido} de ${dataPedido} foi ${estadoLabel}.`;

      try {
          await createDashboardNotifications({
              supabaseClient: supabase,
              recipientIds: [pedido.user_id],
              createdBy: user?.id,
              type: "absence_status_changed",
              title,
              message,
          });
      } catch (notificationError) {
          console.error("Erro ao notificar colaborador sobre pedido de ausência:", notificationError);
      }
  }

  async function executarAcaoRH() {
      const { pedido, acao } = confirmModal;
      try {
          const eFerias = isVacationType(pedido.tipo);
          const profile = colaboradores.find((c) => c.id === pedido.user_id);
          const diasLimiteAnual = getAnnualVacationLimitFromProfile(profile);
          const diasPedidoFerias = eFerias ? getDiasDoPedido(pedido, pedido.user_id) : 0;

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
                        is_parcial: pedido.is_parcial, // ADICIONADO
                        hora_inicio: pedido.hora_inicio, // ADICIONADO
                        hora_fim: pedido.hora_fim, // ADICIONADO
                        excluirPedidoId: pedido.id,
                        diasLimiteAnual,
                        dataAdmissao: profile?.data_admissao,
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
          await notificarAlteracaoPedido(pedido, novoEstadoDB, acao);
          
          const isKmRequest = pedido.tipo === KM_REQUEST_TYPE;
          if (!isKmRequest && pedido.user_id) {
              if (hasDiasFeriasTotalColumn) {
                  const anoPedido = parseLocalDate(pedido.data_inicio)?.getFullYear() || new Date().getFullYear();
                  await sincronizarSaldoFeriasDosPerfis([pedido.user_id], anoPedido);
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

// --- FUNÇÕES DE SELEÇÃO E APROVAÇÃO EM MASSA ---
  const handleSelectAll = (e, lista, setter) => {
      if (e.target.checked) {
          const validIds = lista.filter(p => p.estado === 'pendente').map(p => p.id);
          setter(validIds);
      } else {
          setter([]);
      }
  };

  const handleSelectOne = (e, id, setter) => {
      if (e.target.checked) {
          setter(prev => [...prev, id]);
      } else {
          setter(prev => prev.filter(item => item !== id));
      }
  };

  // 1. Apenas abre o modal e guarda os pedidos que vão ser aprovados
  function abrirModalAprovacaoMassa(tipoTabela) {
      const ids = tipoTabela === 'ausencias' ? selectedPedidosPendentes : selectedPedidosKm;
      const pedidosList = tipoTabela === 'ausencias' ? pedidosPendentes : pedidosKmPendentes;
      const pedidos = pedidosList.filter(p => ids.includes(p.id) && p.estado === 'pendente');

      if(pedidos.length === 0) return showNotification("Selecione apenas novos pedidos válidos.", "error");

      setBulkApproveModal({ show: true, tipo: tipoTabela, pedidos });
  }

  // 2. Executa a aprovação de facto (substitui o antigo handleAprovarEmMassa)
  async function executarAprovarEmMassa() {
      const { tipo, pedidos } = bulkApproveModal;
      const ids = pedidos.map(p => p.id);
      
      setIsSubmitting(true);
      const usersToSync = new Map();

      try {
          for (const pedido of pedidos) {
              const eFerias = isVacationType(pedido.tipo);
              const isKmRequest = pedido.tipo === KM_REQUEST_TYPE;
              const profile = colaboradores.find((c) => c.id === pedido.user_id);
              const diasLimiteAnual = getAnnualVacationLimitFromProfile(profile);
              const diasPedidoFerias = eFerias ? getDiasDoPedido(pedido, pedido.user_id) : 0;

              // Validações de saldo para férias
              if (diasPedidoFerias > 0 && !isKmRequest) {
                  if (!hasDiasFeriasTotalColumn) {
                      const saldoAtual = getDiasDisponiveisPorUserId(pedido.user_id);
                      if (diasPedidoFerias > saldoAtual) {
                          throw new Error(`Saldo insuficiente para ${profile.nome}. Abortado.`);
                      }
                  } else {
                      const saldoCheck = await validarSaldoFeriasParaIntervalo({
                        supabaseClient: supabase,
                        userId: pedido.user_id,
                        dataInicio: pedido.data_inicio,
                        dataFim: pedido.data_fim || pedido.data_inicio,
                        is_parcial: pedido.is_parcial, // ADICIONADO
                        hora_inicio: pedido.hora_inicio, // ADICIONADO
                        hora_fim: pedido.hora_fim, // ADICIONADO
                        excluirPedidoId: pedido.id,
                        diasLimiteAnual,
                        dataAdmissao: profile?.data_admissao,
                        tolerancias,
                    });
                      if (!saldoCheck.ok) throw new Error(`Saldo insuficiente para ${profile.nome}. Abortado.`);
                  }
              }

              // Update na Base de Dados
              const { error } = await supabase.from("ferias").update({ estado: 'aprovado' }).eq("id", pedido.id);
              if (error) throw error;
              await notificarAlteracaoPedido(pedido, "aprovado", "aprovar");

              // Gestão de saldos locais
              if (!isKmRequest && pedido.user_id) {
                  if (hasDiasFeriasTotalColumn) {
                      const anoPedido = parseLocalDate(pedido.data_inicio)?.getFullYear() || new Date().getFullYear();
                      const anosDoUser = usersToSync.get(pedido.user_id) || new Set();
                      anosDoUser.add(anoPedido);
                      usersToSync.set(pedido.user_id, anosDoUser);
                  } else if (diasPedidoFerias > 0) {
                      await atualizarSaldoFeriasDireto(pedido.user_id, -diasPedidoFerias);
                  }
              }
          }

          if (usersToSync.size > 0) {
              for (const [userId, anos] of usersToSync.entries()) {
                  for (const ano of anos) {
                      await sincronizarSaldoFeriasDosPerfis([userId], ano);
                  }
              }
          }

          if (tipo === 'ausencias') {
              setSelectedPedidosPendentes([]);
              setPedidosPendentes(prev => prev.filter(p => !ids.includes(p.id)));
          } else {
              setSelectedPedidosKm([]);
              setPedidosKmPendentes(prev => prev.filter(p => !ids.includes(p.id)));
          }

          if (selectedUser) fetchHistoricoUser(selectedUser);
          fetchDadosMensais();
          fetchColaboradores();
          
          showNotification(`Foram aprovados ${pedidos.length} pedido(s) com sucesso!`, "success");
          setBulkApproveModal({ show: false, tipo: null, pedidos: [] }); // Fecha o modal no fim
      } catch (error) {
          showNotification("Erro na aprovação múltipla: " + error.message, "error");
      } finally {
          setIsSubmitting(false);
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
              estado_temporario_tipo: u.estado_temporario_tipo || '',
              estado_temporario_inicio: u.estado_temporario_inicio || '',
              estado_temporario_fim: u.estado_temporario_fim || '',
              estado_temporario_motivo: u.estado_temporario_motivo || '',
          });
      }

      setIsEditingUser(true);
  };

  const openUserTemporaryStatusEditor = () => {
      setUserTab('dados');
      openUserEditor();
  };

  const closeUserEditor = () => {
      setIsEditingUser(false);
  };

  async function handleUpdateUserProfile() {
      if(!selectedUser) return;
      try {
          const empresasSelecionadas = toUniqueCompanies(tempUserProfile.empresas_internas || []);
          const empresaPrincipal = empresasSelecionadas[0] || null;
          const diasFeriasTotalParsed = Number(tempUserProfile.dias_ferias_total);
          const estadoTemporarioTipo = String(tempUserProfile.estado_temporario_tipo || '').trim();
          const estadoTemporarioInicio = tempUserProfile.estado_temporario_inicio || null;
          const estadoTemporarioFim = tempUserProfile.estado_temporario_fim || null;
          const estadoTemporarioMotivo = String(tempUserProfile.estado_temporario_motivo || '').trim();

          if (hasDiasFeriasTotalColumn && (!Number.isFinite(diasFeriasTotalParsed) || diasFeriasTotalParsed <= 0)) {
              throw new Error("Defina um limite anual de férias válido.");
          }

          if (estadoTemporarioTipo && !isCollaboratorStatusType(estadoTemporarioTipo)) {
              throw new Error("Selecione um estado temporário válido.");
          }

          if (estadoTemporarioTipo && !estadoTemporarioInicio) {
              throw new Error("Indique a data de início do estado temporário.");
          }

          if (estadoTemporarioTipo && estadoTemporarioFim && estadoTemporarioFim < estadoTemporarioInicio) {
              throw new Error("A data de fim do estado temporário não pode ser anterior à data de início.");
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
              email_pessoal: tempUserProfile.email_pessoal,
              data_nascimento: tempUserProfile.data_nascimento,
              data_admissao: tempUserProfile.data_admissao || null,
              tipo_contrato: tempUserProfile.tipo_contrato,
              nacionalidade: tempUserProfile.nacionalidade,
              sexo: tempUserProfile.sexo,
              concelho: tempUserProfile.concelho,
              estado_temporario_tipo: estadoTemporarioTipo || null,
              estado_temporario_inicio: estadoTemporarioTipo ? estadoTemporarioInicio : null,
              estado_temporario_fim: estadoTemporarioTipo ? (estadoTemporarioFim || null) : null,
              estado_temporario_motivo: estadoTemporarioTipo ? (estadoTemporarioMotivo || null) : null,
          };

          let { error } = await supabase
              .from("profiles")
              .update(profilePayload)
              .eq("id", selectedUser);

          if (error && isMissingColumnError(error)) {
              const legacyPayload = { ...profilePayload };
              delete legacyPayload.dias_ferias_total;
              delete legacyPayload.estado_temporario_tipo;
              delete legacyPayload.estado_temporario_inicio;
              delete legacyPayload.estado_temporario_fim;
              delete legacyPayload.estado_temporario_motivo;
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

  async function handleToggleUserActive() {
      const profile = userStatusModal.profile;
      if (!profile) return;

      const nextActive = userStatusModal.nextActive;
      const actionLabel = nextActive ? "reativado" : "desativado";

      try {
          const { error } = await supabase
              .from("profiles")
              .update({ ativo: nextActive })
              .eq("id", profile.id);
          if (error) throw error;

          setColaboradores((prev) => prev.map((c) => (c.id === profile.id ? { ...c, ativo: nextActive } : c)));
          if (selectedUser === profile.id && !nextActive) {
              setSelectedUser(null);
              setIsEditingUser(false);
          }

          closeUserStatusModal();
          showNotification(`Colaborador ${actionLabel} com sucesso!`, "success");
          fetchColaboradores();
      } catch (err) { showNotification("Erro ao alterar estado do colaborador: " + err.message, "error"); }
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
      if (!isKmRequest && diasUteisModal <= 0) return showNotification("O período não contém dias úteis válidos.", "error");
      if (!isKmRequest && !newAbsence.is_parcial && parseLocalDate(newAbsence.data_inicio) > parseLocalDate(newAbsence.data_fim)) return showNotification("A data de fim é inválida.", "error");
      if (isKmRequest) {
          const kmTotal = Number(newAbsence.km_total);
          if (!newAbsence.km_origem.trim() || !newAbsence.km_destino.trim()) return showNotification("Preencha os campos De e Para.", "error");
          if (!Number.isFinite(kmTotal) || kmTotal <= 0) return showNotification("Introduza um Km total válido.", "error");
      }

      setIsSubmitting(true);
      try {
          const normalizedTipo = newAbsence.tipo === KM_REQUEST_TYPE ? KM_REQUEST_TYPE : formatAbsenceTypeLabel(newAbsence.tipo);
          const isNewFerias = isVacationType(normalizedTipo);
          const dataFimFinal = isKmRequest
              ? newAbsence.data_inicio
              : (newAbsence.is_parcial ? newAbsence.data_inicio : newAbsence.data_fim);

          const profile = colaboradores.find((c) => c.id === newAbsence.user_id);
          const diasLimiteAnual = getAnnualVacationLimitFromProfile(profile);

          const diasFeriasAntigos =
              isEditingAbsence &&
              editingAbsenceData?.estado === 'aprovado' &&
              isVacationType(editingAbsenceData?.tipo)
                  ? getDiasDoPedido(editingAbsenceData, editingAbsenceData.user_id)
                  : 0;

          const fakeNewPedido = {
               tipo: normalizedTipo,
               is_parcial: isKmRequest ? false : newAbsence.is_parcial,
               hora_inicio: isKmRequest ? null : (newAbsence.is_parcial ? newAbsence.hora_inicio : null),
               hora_fim: isKmRequest ? null : (newAbsence.is_parcial ? newAbsence.hora_fim : null),
               data_inicio: newAbsence.data_inicio,
               data_fim: dataFimFinal
          };
          const diasFeriasNovos = isNewFerias ? getDiasDoPedido(fakeNewPedido, newAbsence.user_id) : 0;

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
                    is_parcial: isKmRequest ? false : newAbsence.is_parcial, // ADICIONADO
                    hora_inicio: isKmRequest ? null : (newAbsence.is_parcial ? newAbsence.hora_inicio : null), // ADICIONADO
                    hora_fim: isKmRequest ? null : (newAbsence.is_parcial ? newAbsence.hora_fim || null : null), // ADICIONADO
                    excluirPedidoId: isEditingAbsence ? editingAbsenceData.id : null,
                    diasLimiteAnual,
                    dataAdmissao: profile?.data_admissao,
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
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = toLocalDateString(new Date(year, month + 1, 0));
      const attendanceStart = selectedUser ? getAttendanceStartForUser(selectedUser) : monthStart;
      const effectiveMonthStart = attendanceStart && attendanceStart > monthStart ? attendanceStart : monthStart;
      const holidaySet = createHolidaySetForMonth(year, month);
      const diasUteisMes = calcularDiasUteis(effectiveMonthStart, monthEnd);

      countTrabalho = countMealAllowanceEligibleDaysInPeriod(assiduidadeMes, {
          startDate: effectiveMonthStart,
          endDate: monthEnd,
          holidaySet,
      });

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

            // Corrigir: só descontar dias úteis anteriores a hoje, sem registo nem ausência
            const hojeStr = new Date().toISOString().split('T')[0];
                        let diasDescontadosSA = 0;
                        for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const dayOfWeek = new Date(year, month, d).getDay();
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                const isHoliday = holidaySet.has(dateStr);
                                const isAfterAttendanceStart = dateStr >= effectiveMonthStart;
                                if (!isAfterAttendanceStart || isWeekend || isHoliday) continue;
                                // Se existe ausência de dia inteiro (não parcial, não rejeitada/cancelada, não KM) já marcada para este dia, desconta já
                                const ausenciaDiaInteira = (ausenciasMes || []).find((a) => {
                                    if (a.is_parcial) return false;
                                    if (a.tipo === KM_REQUEST_TYPE) return false;
                                    const estado = (a.estado || '').toLowerCase();
                                    if (estado === 'rejeitado' || estado === 'cancelado') return false;
                                    return a.data_inicio <= dateStr && a.data_fim >= dateStr;
                                });
                                if (ausenciaDiaInteira) {
                                    diasDescontadosSA++;
                                    continue;
                                }
                                // Para os restantes dias, só descontar se for anterior a hoje e não tiver registo >=5h nem ausência
                                const isPast = dateStr < hojeStr;
                                if (!isPast) continue;
                                const assid = (assiduidadeMes || []).find(a => a.data_registo === dateStr);
                                const worked = assid ? getEffectiveWorkedSeconds(assid) : 0;
                                if (worked >= MIN_SA_WORK_SECONDS) continue;
                                diasDescontadosSA++;
                        }

      let valorSA = "0.00";
      if (selectedUser) {
          const profile = colaboradores.find(c => c.id === selectedUser);
          const diarioSA = Number(profile?.valor_sa) || 0;
          valorSA = ((diasUteisMes - diasDescontadosSA) * diarioSA).toFixed(2);
      }
      return { countTrabalho, countFerias, countFaltas, countBaixas, valorSA, diasUteisMes, diasDescontadosSA };
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
          const isPast = dateStr < hojeStr; // Só dias anteriores ao dia de hoje
          const isAfterAttendanceStart = dateStr >= dataInicioCalculo;

          if (!isPast || !isAfterAttendanceStart || isWeekend || isHoliday) continue;
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

  // ---------------------------------------------------------------------------
  // PROCESSAMENTO POR COLABORADOR (mesma lógica do getStats, aplicada a cada um)
  // Só é usado na Visão Global, onde assiduidadeMes/ausenciasMes têm toda a equipa.
  // ---------------------------------------------------------------------------
  const computeProcessamentoFor = (uid) => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = toLocalDateString(new Date(year, month + 1, 0));
      const attendanceStart = getAttendanceStartForUser(uid);
      const effectiveMonthStart = attendanceStart && attendanceStart > monthStart ? attendanceStart : monthStart;
      const holidaySet = createHolidaySetForMonth(year, month);
      const diasUteisMes = calcularDiasUteis(effectiveMonthStart, monthEnd);
      const assidU = (assiduidadeMes || []).filter((a) => a.user_id === uid);
      const ausU = (ausenciasMes || []).filter((a) => a.user_id === uid || a.user_id === null || a.user_id === undefined);

      const countTrabalho = countMealAllowanceEligibleDaysInPeriod(assidU, {
          startDate: effectiveMonthStart,
          endDate: monthEnd,
          holidaySet,
      });

      const toleranciasDoMes = ausU.filter((a) => !a.is_parcial && isToleranceType(a.tipo));
      const skipSet = buildToleranciasSkipSet(
          toleranciasDoMes.map((item) => ({
              user_id: item.user_id,
              data: item.data_inicio,
              data_inicio: item.data_inicio,
              data_fim: item.data_fim || item.data_inicio,
          })),
          uid,
      );

      let countFerias = 0, countFaltas = 0, countBaixas = 0;
      ausU.forEach((a) => {
          if (a.is_parcial) return;
          const tipoNormalizado = normalizeAbsenceType(a.tipo);
          if (isToleranceType(tipoNormalizado)) return;
          const dataInicioCalculo = getAttendanceStartForUser(a.user_id);
          const dataInicioAjustada = a.data_inicio < dataInicioCalculo ? dataInicioCalculo : a.data_inicio;
          const dias = calcularDiasUteisNoMes(
              dataInicioAjustada,
              a.data_fim || a.data_inicio,
              year,
              month,
              isVacationType(tipoNormalizado) ? skipSet : null,
          );
          if (dias <= 0) return;
          if (isVacationType(tipoNormalizado)) countFerias += dias;
          else if (tipoNormalizado.includes('falta')) countFaltas += dias;
          else if (tipoNormalizado.includes('baixa') || tipoNormalizado.includes('doenca') || tipoNormalizado.includes('acidente')) countBaixas += dias;
      });

      // Faltas injustificadas automáticas (mesma regra da ficha individual)
      const hojeStr = new Date().toISOString().split('T')[0];
      const datasComAssiduidade = new Set(assidU.map((a) => a.data_registo));
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let diasDescontadosSA = 0;
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayOfWeek = new Date(year, month, d).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = holidaySet.has(dateStr);
          if (dateStr < effectiveMonthStart || isWeekend || isHoliday) continue;

          const temJustificacao = ausU.some((a) => {
              if (a.tipo === KM_REQUEST_TYPE) return false;
              const estado = (a.estado || '').toLowerCase();
              if (estado === 'rejeitado' || estado === 'cancelado') return false;
              return a.data_inicio <= dateStr && a.data_fim >= dateStr;
          });
          if (dateStr < hojeStr && dateStr >= attendanceStart && !datasComAssiduidade.has(dateStr) && !temJustificacao) {
              countFaltas += 1;
          }

          const ausenciaDiaInteira = ausU.find((a) => {
              if (a.is_parcial) return false;
              if (a.tipo === KM_REQUEST_TYPE) return false;
              const estado = (a.estado || '').toLowerCase();
              if (estado === 'rejeitado' || estado === 'cancelado') return false;
              return a.data_inicio <= dateStr && a.data_fim >= dateStr;
          });
          if (ausenciaDiaInteira) { diasDescontadosSA++; continue; }
          if (!(dateStr < hojeStr)) continue;
          const assid = assidU.find((a) => a.data_registo === dateStr);
          const worked = assid ? getEffectiveWorkedSeconds(assid) : 0;
          if (worked >= MIN_SA_WORK_SECONDS) continue;
          diasDescontadosSA++;
      }

      const profile = colaboradores.find((c) => c.id === uid);
      const diarioSA = Number(profile?.valor_sa) || 0;
      const valorSA = (diasUteisMes - diasDescontadosSA) * diarioSA;
      return { countTrabalho, countFerias, countFaltas, countBaixas, valorSA, diarioSA, diasUteisMes, diasDescontadosSA };
  };

  const processamentoEquipa = activeView === 'processamento'
      ? [...colaboradoresAtivos]
          .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-PT'))
          .map((colab) => ({ colab, ...computeProcessamentoFor(colab.id) }))
      : [];
  const processamentoTotal = processamentoEquipa.reduce((sum, item) => sum + item.valorSA, 0);

  // ---------------------------------------------------------------------------
  // ESTADO DE HOJE DE CADA COLABORADOR (grelha da equipa)
  // ---------------------------------------------------------------------------
  const getEstadoHoje = (colab) => {
      const todayStr = toLocalDateString(new Date());
      const weekday = new Date().getDay();
      const estadoTemp = getTemporaryStatusFromProfile(colab);
      if (estadoTemp && isTemporaryStatusActiveOnDate(estadoTemp, todayStr)) {
          return { tone: 'temp', label: formatAbsenceTypeLabel(estadoTemp.tipo) };
      }
      const ausencias = (ausenciasMes || []).filter((a) => a.tipo !== KM_REQUEST_TYPE && a.data_inicio <= todayStr && a.data_fim >= todayStr && (a.user_id === colab.id || a.user_id === null));
      const inteira = ausencias.find((a) => !a.is_parcial);
      if (inteira) {
          const t = normalizeAbsenceType(inteira.tipo);
          if (isToleranceType(t)) return { tone: 'tol', label: 'Tolerância' };
          if (isVacationType(t)) return { tone: 'vac', label: 'Férias' };
          if (t.includes('baixa') || t.includes('doenca') || t.includes('acidente')) return { tone: 'sick', label: 'Baixa' };
          if (t.includes('falta')) return { tone: 'bad', label: 'Falta' };
          return { tone: 'temp', label: formatAbsenceTypeLabel(inteira.tipo) };
      }
      const assid = (assiduidadeMes || []).find((a) => a.user_id === colab.id && a.data_registo === todayStr);
      const parcial = ausencias.find((a) => a.is_parcial);
      if (parcial && !assid) return { tone: 'part', label: `Ausente ${parcial.hora_inicio?.slice(0, 5) || ''}–${parcial.hora_fim?.slice(0, 5) || ''}` };
      if (assid?.hora_entrada && !assid?.hora_saida) return { tone: 'work', label: `A trabalhar desde ${String(assid.hora_entrada).slice(0, 5)}` };
      if (assid?.hora_saida) return { tone: 'done', label: `Saiu às ${String(assid.hora_saida).slice(0, 5)}` };
      if (weekday === 0 || weekday === 6) return { tone: 'off', label: 'Fim de semana' };
      return { tone: 'none', label: 'Sem registo hoje' };
  };

  // ---------------------------------------------------------------------------
  // FILTROS DOS PEDIDOS
  // ---------------------------------------------------------------------------
  const pedidosBuscaNorm = String(pedidosBusca || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const matchPedidoBusca = (p) => {
      if (!pedidosBuscaNorm) return true;
      const texto = `${p.profiles?.nome || ''} ${p.tipo || ''} ${p.km_origem || ''} ${p.km_destino || ''} ${p.motivo || ''}`
          .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return texto.includes(pedidosBuscaNorm);
  };
  const pedidosPendentesFiltrados = pedidosPendentes.filter((p) => {
      if (!matchPedidoBusca(p)) return false;
      if (pedidosTipoFiltro === 'ferias') return isVacationType(p.tipo) && p.estado === 'pendente';
      if (pedidosTipoFiltro === 'outras') return !isVacationType(p.tipo) && p.estado === 'pendente';
      if (pedidosTipoFiltro === 'cancel') return p.estado === 'pedido_cancelamento';
      return true;
  });
  const pedidosKmFiltrados = pedidosTipoFiltro === 'ferias' || pedidosTipoFiltro === 'outras'
      ? []
      : pedidosKmPendentes.filter((p) => matchPedidoBusca(p) && (pedidosTipoFiltro === 'cancel' ? p.estado === 'pedido_cancelamento' : true));

  const exportarProcessamentoExcel = () => {
      const mesLabel = currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
      const linhas = processamentoEquipa.map((item) => ({
          'Colaborador': item.colab.nome,
          'Empresas': formatCompaniesLabel(item.colab),
          'Dias úteis do mês': item.diasUteisMes,
          'Dias Trabalhados (>=5h)': item.countTrabalho,
          'Dias Descontados (<5h / ausência)': item.diasDescontadosSA,
          'Férias': item.countFerias,
          'Faltas': item.countFaltas,
          'Baixas': item.countBaixas,
          'Valor S.A. Diário (€)': Number(item.diarioSA.toFixed(2)),
          'TOTAL S.A. PAGAR (€)': Number(item.valorSA.toFixed(2)),
      }));
      linhas.push({ 'Colaborador': 'TOTAL', 'TOTAL S.A. PAGAR (€)': Number(processamentoTotal.toFixed(2)) });
      const ws = XLSX.utils.json_to_sheet(linhas);
      ws['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Processamento');
      XLSX.writeFile(wb, `Processamento_SA_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`);
      showNotification(`Processamento de ${mesLabel} exportado.`, 'success');
  };
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
      const estadosHoje = colaboradores
          .map((colaborador) => {
              const estado = getTemporaryStatusFromProfile(colaborador);
              if (!estado || !isTemporaryStatusActiveOnDate(estado, today)) return null;

              return {
                  id: `estado-${colaborador.id}-${today}`,
                  user_id: colaborador.id,
                  tipo: estado.tipo,
                  data_inicio: estado.data_inicio,
                  data_fim: estado.data_fim || estado.data_inicio,
                  motivo: estado.motivo,
              };
          })
          .filter(Boolean);

      return [...lista, ...estadosHoje].map(a => {
          const user = colaboradores.find(c => c.id === a.user_id);
          const infoHora = a.data_inicio && a.data_fim && a.data_inicio !== a.data_fim
              ? `(${new Date(`${a.data_inicio}T00:00:00`).toLocaleDateString('pt-PT')} - ${new Date(`${a.data_fim}T00:00:00`).toLocaleDateString('pt-PT')})`
              : (a.is_parcial ? `( ${a.hora_inicio?.slice(0,5)})` : '');
          const nomeUser = a.user_id ? (user?.nome || 'Desconhecido') : 'Global';
          return { ...a, nomeUser, infoHora };
      });
  };
  const ausentesHoje = getAusentesHoje();

  const estadosTemporariosHoje = colaboradores
      .map((colaborador) => {
          const estado = getTemporaryStatusFromProfile(colaborador);
          if (!estado || !isTemporaryStatusActiveOnDate(estado, new Date().toISOString().split('T')[0])) return null;

          return {
              id: `estado-temporario-${colaborador.id}`,
              nomeUser: colaborador?.nome || 'Desconhecido',
              estado,
              tipo: estado.tipo,
          };
      })
      .filter(Boolean);

  const totalKmSelecionados = pedidosKmPendentes
      .filter(p => selectedPedidosKm.includes(p.id))
      .reduce((sum, p) => sum + (Number(p.km_total) || 0), 0);

  const calcularTotalKmAprovadosNoMes = (userId, dataReferencia, todosOsDados) => {
    if (!userId || !dataReferencia) return 0;
    
    const data = new Date(dataReferencia);
    const ano = data.getFullYear();
    const mes = data.getMonth();

    return todosOsDados
        .filter(p => 
            p.user_id === userId && 
            p.tipo === "Pedido de Km's" && 
            p.estado === 'aprovado' &&
            new Date(p.data_inicio).getFullYear() === ano &&
            new Date(p.data_inicio).getMonth() === mes
        )
        .reduce((acc, curr) => acc + (Number(curr.km_total) || 0), 0);
  };

  const getAniversariantesDoMes = () => {
      const mesAtual = currentDate.getMonth();
      return colaboradores
          .filter(c => {
              if (c.ativo === false) return false;
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
          const dayOfWeek = new Date(year, month, d).getDay();
          
          // Definição das condições base do dia
          const isFimSemana = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado
          const feriado = feriadosDoMes.find(f => f.d === d);
          const assidDia = assiduidadeMes.some(a => a.data_registo === dateStr);

          // Configurações padrão de estilo da célula
          let tipo = "util";
          let cor = "#fff";
          let textoCor = "#94a3b8";
          let badge = "";
          let cellBorderColor = '#f1f5f9';
          let content = null;
          
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
          const estadosTemporariosGlobalNoDia = !selectedUser
              ? colaboradores
                    .map((colaborador) => {
                        const estado = getTemporaryStatusFromProfile(colaborador);
                        if (!estado || !isTemporaryStatusActiveOnDate(estado, dateStr)) return null;

                        return {
                            id: `estado-${colaborador.id}-${dateStr}`,
                            nome: colaborador.nome || 'Desconhecido',
                            colabId: colaborador.id,
                            avatarUrl: colaborador.avatar_url,
                            tipo: estado.tipo,
                            estado,
                        };
                    })
                    .filter(Boolean)
              : [];

          // Aplicação da sua configuração para Fim de Semana (caso não haja assiduidade registada)
          if (isFimSemana && !assidDia) {
              tipo = "fimSemana";
              cor = "#f1f5f9"; // Fundo cinza suave como na imagem_1d8661.png
              textoCor = "#94a3b8";
              badge = "Fim de Semana";
              cellBorderColor = '#e2e8f0';
          }
          // Prioridade visual para Feriados
          else if (feriado) {
              tipo = "feriado";
              cor = "#fee2e2"; 
              textoCor = "#ef4444";
              cellBorderColor = '#fca5a5';
              badge = feriado.nome;
          }
          // Tolerância de Ponto Global
          else if (toleranciaGlobalNoDia) {
              tipo = "tolerancia";
              cor = 'var(--color-borderColorLight)';
              textoCor = 'var(--color-btnPrimary)';
              cellBorderColor = 'var(--color-borderColorLight)';
              badge = toleranciaGlobalNoDia.motivo || 'Tolerância de Ponto';
          }

          // Se houver um utilizador selecionado (Visão Individual)
          if (selectedUser) {
              const ausencia = ausenciasMes.find(a => a.tipo !== KM_REQUEST_TYPE && a.data_inicio <= dateStr && a.data_fim >= dateStr);
              
              if (assidDia) { 
                  cor = '#f0fdf4';
                  cellBorderColor = '#bbf7d0'; 
                  textoCor = '#16a34a';
                  content = <div style={{display:'flex', justifyContent:'center'}}><Icons.Check color="#16a34a" size={20} /></div>; 
              } 
              // Só mostra ausência/férias se NÃO for fim de semana nem feriado
              else if (ausencia && !isFimSemana && !feriado) {
                  const tipoNormalizado = normalizeAbsenceType(ausencia.tipo);
                  if (isToleranceType(tipoNormalizado)) {
                      cor = 'var(--color-bgSecondary)';
                      cellBorderColor = 'var(--color-borderColor)';
                      content = <div style={{display:'flex', justifyContent:'center'}}><Icons.Clock color="var(--color-btnPrimary)" size={20}/></div>;
                  }
                  else if (isVacationType(tipoNormalizado)) { 
                      cor = '#fefce8'; 
                      content = <div style={{display:'flex', justifyContent:'center'}}>{ausencia.is_parcial ? <Icons.Clock color="#ca8a04" size={20}/> : <Icons.Sun color="#ca8a04" size={20}/>}</div>; 
                  }
                  else if (tipoNormalizado.includes('falta')) { 
                      cor = '#fef2f2'; 
                      content = <div style={{display:'flex', justifyContent:'center'}}>{ausencia.is_parcial ? <Icons.Clock color="#ef4444" size={20}/> : <Icons.X color="#ef4444" size={20}/>}</div>; 
                  }
                  else { 
                      cor = '#faf5ff'; 
                      content = <div style={{display:'flex', justifyContent:'center'}}>{ausencia.is_parcial ? <Icons.Clock color="#a855f7" size={20}/> : <Icons.HeartPulse color="#a855f7" size={20}/>}</div>; 
                  }
              } else if (feriado) {
                  content = <div style={{display:'flex', justifyContent:'center', marginTop:'5px'}}><Icons.Flag color="#991b1b" size={16}/></div>;
              }
          } 
          // Se não houver utilizador selecionado (Visão Global)
          else {
              let bars = [];
              let estadosBars = [];

              // BLOQUEIO CRÍTICO: Só renderiza barras de férias/ausências em dias úteis de trabalho
              if (!isFimSemana && !feriado) {
                  const ausentesNoDia = ausenciasMes.filter(a => a.tipo !== KM_REQUEST_TYPE && a.data_inicio <= dateStr && a.data_fim >= dateStr);
                  const ausentesNoDiaParaBarras = ausentesNoDia.filter(
                      a => !(toleranciaGlobalNoDia && a.user_id === null && !a.is_parcial && isToleranceType(a.tipo)),
                  );

                  if (ausentesNoDiaParaBarras.length > 0) {
                      bars = ausentesNoDiaParaBarras.map((a, i) => {
                          const user = colaboradores.find(c => c.id === a.user_id);
                          const tipoNormalizado = normalizeAbsenceType(a.tipo);
                          let barColor = '#fcd34d'; 
                          if (isToleranceType(tipoNormalizado)) barColor = 'var(--color-btnPrimary)';
                          if (tipoNormalizado.includes('falta')) barColor = '#fca5a5';
                          if (tipoNormalizado.includes('baixa') || tipoNormalizado.includes('doenca') || tipoNormalizado.includes('acidente')) barColor = '#d8b4fe';
                          if (a.is_parcial) barColor = '#94a3b8';
                          const ownerLabel = a.user_id ? (user?.nome || 'Desconhecido') : 'Global';
                          return (
                              <ModernTooltip key={i} content={`${ownerLabel}: ${formatAbsenceTypeLabel(a.tipo)} ${a.is_parcial ? '(Horas)' : ''}`}>
                                  <span className="rh-day-av" style={{ '--r': barColor }}>{renderRhAvatar(ownerLabel, a.user_id || 'global', 'xs', user?.avatar_url)}</span>
                              </ModernTooltip>
                          );
                      });
                  }

                  if (estadosTemporariosGlobalNoDia.length > 0) {
                      estadosBars = estadosTemporariosGlobalNoDia.map((estado, i) => {
                          const estadoStyle = getTemporaryStatusStyle(estado.tipo);
                          return (
                              <ModernTooltip key={`estado-${i}`} content={`${estado.nome}: ${formatAbsenceTypeLabel(estado.tipo)}`}>
                                  <span className="rh-day-av" style={{ '--r': estadoStyle.textoCor }}>{renderRhAvatar(estado.nome, estado.colabId || estado.nome, 'xs', estado.avatarUrl)}</span>
                              </ModernTooltip>
                          );
                      });
                  }
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
                              <div style={{fontSize: '0.7rem', color: 'var(--color-btnPrimaryDark)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display:'flex', alignItems:'center', gap:'4px'}}>
                                  <Icons.Flag size={10} color="var(--color-btnPrimaryDark)"/> {toleranciaGlobalNoDia.motivo || 'Tolerância de Ponto'}
                              </div>
                          </ModernTooltip>
                      )}
                      {/* Apresentação do Badge de Fim de Semana conforme a sua config */}
                      {badge && !feriado && !toleranciaGlobalNoDia && (
                          <span style={{fontSize: '0.7rem', color: textoCor, fontStyle: 'italic'}}>{badge}</span>
                      )}
                      {(bars.length + estadosBars.length) > 0 && (
                          <div className="rh-day-people">
                              {[...bars, ...estadosBars].slice(0, 4)}
                              {bars.length + estadosBars.length > 4 && <span className="rh-day-more">+{bars.length + estadosBars.length - 4}</span>}
                          </div>
                      )}
                  </div>
              );
          }

          const isTodayCell = dateStr === toLocalDateString(new Date());
          days.push(
              <div key={d} className={`rh-day is-${tipo} ${isTodayCell ? 'is-today' : ''}`} style={{ background: cor, borderColor: cellBorderColor }}>
                  <span className="rh-day-num" style={{ color: isTodayCell ? undefined : textoCor }}>{d}</span>
                  <div className="rh-day-body">{content}</div>
              </div>
          );
      }
      return days;
  };

    const changeMonth = (delta) => {
        const newDate = new Date(currentDate);
        newDate.setDate(1); // Evita problemas com meses de menos dias
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };
  

  // Função para ir buscar as formações
  async function fetchFormacoes() {
      try {
          const { data, error } = await supabase
              .from("formacoes")
              .select("*, profiles(nome)")
              .order("data_inicio", { ascending: false });
          if (error) throw error;
          setFormacoes(data || []);
      } catch (error) {
          console.error("Erro ao carregar formações:", error);
      }
  }

  // Função para guardar nova formação para múltiplos colaboradores
  async function handleSaveFormacao(e) {
      e.preventDefault();
      if (newFormacao.user_ids.length === 0) return showNotification("Selecione pelo menos um colaborador.", "error");
      
      // --- NOVA VALIDAÇÃO ---
      if (new Date(newFormacao.data_inicio) > new Date(newFormacao.data_fim)) {
          return showNotification("A data de fim não pode ser anterior à data de início.", "error");
      }
      // ----------------------

      setIsSubmittingFormacao(true);
      try {
          const anoFormacao = new Date(newFormacao.data_inicio).getFullYear();
          
          const payload = newFormacao.user_ids.map(userId => ({
              user_id: userId,
              nome: newFormacao.nome,
              data_inicio: newFormacao.data_inicio,
              data_fim: newFormacao.data_fim,
              total_horas: Number(newFormacao.total_horas),
              ano: anoFormacao
          }));

          const { error } = await supabase.from("formacoes").insert(payload);
          if (error) throw error;

          showNotification("Formação registada com sucesso!", "success");
          setShowFormacaoModal(false);
          setNewFormacao({ nome: '', data_inicio: '', data_fim: '', total_horas: '', user_ids: [] });
          fetchFormacoes();
      } catch (err) {
          showNotification("Erro ao guardar formação: " + err.message, "error");
      } finally {
          setIsSubmittingFormacao(false);
      }
  }

  // Função para apagar registo
  async function handleDeleteFormacao(id) {
      if (!window.confirm("Eliminar este registo de formação?")) return;
      try {
          const { error } = await supabase.from("formacoes").delete().eq("id", id);
          if (error) throw error;
          showNotification("Registo eliminado.", "success");
          fetchFormacoes();
      } catch (err) {
          showNotification("Erro ao eliminar.", "error");
      }
  }

  async function confirmarDeleteFormacao() {
      if (!deleteFormacaoModal.grupo) return;
      setIsSubmittingFormacao(true);
      try {
          // Apaga todas as linhas (IDs) que pertencem a este grupo de formação
          const { error } = await supabase
              .from("formacoes")
              .delete()
              .in("id", deleteFormacaoModal.grupo.ids);
              
          if (error) throw error;
          
          showNotification("Ação de formação eliminada com sucesso.", "success");
          setDeleteFormacaoModal({ show: false, grupo: null });
          fetchFormacoes();
      } catch (err) {
          showNotification("Erro ao eliminar a formação.", "error");
      } finally {
          setIsSubmittingFormacao(false);
      }
  }

  // Lidar com checkboxes de seleção múltipla no Modal
  const handleToggleUserFormacao = (userId) => {
      setNewFormacao(prev => {
          const ids = prev.user_ids.includes(userId) 
              ? prev.user_ids.filter(id => id !== userId) 
              : [...prev.user_ids, userId];
          return { ...prev, user_ids: ids };
      });
  };

  const rhInitials = (nome) => {
      const parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '?';
      return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  };
  const RH_AVATAR_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];
  const rhColorFor = (key) => {
      const s = String(key || '');
      let h = 0;
      for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return RH_AVATAR_COLORS[h % RH_AVATAR_COLORS.length];
  };
  const renderRhAvatar = (nome, key, size = 'sm', url = null) => (
      <span className={`rh-avatar is-${size}`} style={{ '--c': rhColorFor(key || nome) }}>
          {url ? <img src={url} alt="" /> : rhInitials(nome)}
      </span>
  );
  const formatPeriodo = (p) => (p.is_parcial
      ? (
          <div className="rh-periodo">
              <strong>{new Date(p.data_inicio).toLocaleDateString('pt-PT')}</strong>
              <small><Icons.Clock size={12}/> {p.hora_inicio?.slice(0,5)} às {p.hora_fim?.slice(0,5) || '...'}</small>
          </div>
      )
      : <span className="rh-periodo-line">{`${new Date(p.data_inicio).toLocaleDateString('pt-PT')} a ${new Date(p.data_fim).toLocaleDateString('pt-PT')}`}</span>);
  const renderEstadoPedido = (p) => (p.estado === 'pendente'
      ? <span className="rh-tag is-new">Novo Pedido</span>
      : <span className="rh-tag is-cancel"><Icons.Alert size={12}/> Cancelamento</span>);
  const renderPedidoAcoes = (p) => (
      <div className="rh-row-actions">
          <ModernTooltip content="Ver Detalhes do Pedido">
              <button type="button" className="rh-icon-btn" onClick={() => abrirModalDetalhes(p)}><Icons.Eye size={16} /></button>
          </ModernTooltip>
          {p.estado === 'pendente' ? (
              <>
                  <ModernTooltip content="Aprovar">
                      <button type="button" className="rh-icon-btn is-ok" onClick={() => abrirModalConfirmacao(p, 'aprovar')}><Icons.Check size={16} /></button>
                  </ModernTooltip>
                  <ModernTooltip content="Rejeitar">
                      <button type="button" className="rh-icon-btn is-bad" onClick={() => abrirModalConfirmacao(p, 'rejeitar')}><Icons.X size={16} /></button>
                  </ModernTooltip>
              </>
          ) : (
              <>
                  <ModernTooltip content="Aceitar Cancelamento">
                      <button type="button" className="rh-pill-btn is-bad" onClick={() => abrirModalConfirmacao(p, 'aceitar_cancelamento')}>Aceitar</button>
                  </ModernTooltip>
                  <ModernTooltip content="Recusar Cancelamento">
                      <button type="button" className="rh-pill-btn" onClick={() => abrirModalConfirmacao(p, 'recusar_cancelamento')}>Recusar</button>
                  </ModernTooltip>
              </>
          )}
      </div>
  );
  const renderInativosList = () => (
      <div className="rh-people-list">
          {colaboradoresInativos.length > 0 ? (
              colaboradoresInativos.map((colaborador) => (
                  <div key={colaborador.id} className="rh-person-row is-off">
                      {renderRhAvatar(colaborador.nome, colaborador.id, 'md', colaborador.avatar_url)}
                      <div className="rh-person-row-main">
                          <div className="rh-person-row-name">
                              <strong>{colaborador.nome}</strong>
                              <span className="rh-tag is-off">Desativado</span>
                          </div>
                          <small>{formatCompaniesLabel(colaborador)}</small>
                      </div>
                      <button type="button" className="rh-btn is-ok-soft" onClick={() => openUserStatusModal(colaborador)}>
                          <Icons.Check size={15} /> Reativar
                      </button>
                  </div>
              ))
          ) : (
              <div className="rh-empty is-small">
                  <span className="rh-empty-ico"><Icons.Users size={26} /></span>
                  <p>Não há colaboradores desativados.</p>
              </div>
          )}
      </div>
  );
  const setTemp = (key) => (e) => setTempUserProfile({ ...tempUserProfile, [key]: e.target.value });
  const temporaryStatusAtual = getTemporaryStatusFromProfile(currentUserProfile);
  const totalPedidos = pedidosPendentes.length + pedidosKmPendentes.length;
  const formacaoAno = currentDate.getFullYear();
  const horasPorColab = colaboradoresAtivos.map((colab) => ({
      colab,
      horas: formacoes.filter(f => f.user_id === colab.id && f.ano === formacaoAno).reduce((sum, f) => sum + Number(f.total_horas), 0),
  }));
  const formacaoCumpridos = horasPorColab.filter((item) => item.horas >= 40).length;
  const formacaoTotalHoras = horasPorColab.reduce((sum, item) => sum + item.horas, 0);
  const RH_VIEWS = [
      { id: 'gestao', label: 'Gestão', icon: Icons.Chart },
      { id: 'processamento', label: 'Processamento', icon: Icons.Currency },
      { id: 'pedidos', label: 'Pedidos', icon: Icons.Inbox, badge: totalPedidos },
      { id: 'tolerancias', label: 'Tolerâncias', icon: Icons.Clock },
      { id: 'formacoes', label: 'Formação', icon: Icons.FileText },
      { id: 'inativos', label: 'Colab. Inativos', icon: Icons.User },
  ];

  return (
    <div className="page-container rh-page">

      {/* HERO */}
      <header className="rh-hero">
        <div className="rh-hero-bg"><span className="rh-orb rh-orb-a" /><span className="rh-orb rh-orb-b" /></div>
        <div className="rh-hero-row">
            <div className="rh-hero-main">
                <span className="rh-hero-icon"><Icons.Users size={26} /></span>
                <div>
                    <h1>Gestão de RH</h1>
                    <p>Aprovações, salários e dados pessoais.</p>
                </div>
            </div>
            <div className="rh-hero-stats">
                <span className="rh-stat"><strong>{colaboradoresAtivos.length}</strong> colaboradores</span>
                <span className={`rh-stat ${totalPedidos > 0 ? 'is-alert' : ''}`}><strong>{totalPedidos}</strong> pedidos pendentes</span>
                <span className="rh-stat"><strong>{ausentesHoje.length}</strong> ausentes hoje</span>
                {aniversariantes.length > 0 && <span className="rh-stat"><Icons.Cake size={13} /> <strong>{aniversariantes.length}</strong> aniversários</span>}
            </div>
        </div>
        <div className="rh-hero-tools">
            <div className="rh-scope" role="tablist">
                {RH_VIEWS.map((view) => {
                    const ViewIcon = view.icon;
                    return (
                        <button key={view.id} type="button" role="tab" aria-selected={activeView === view.id} className={activeView === view.id ? 'is-on' : ''} onClick={() => setActiveView(view.id)}>
                            <ViewIcon size={16} /> {view.label}
                            {view.badge > 0 && <em className="is-alert">{view.badge}</em>}
                            {view.id === 'inativos' && colaboradoresInativos.length > 0 && <em>{colaboradoresInativos.length}</em>}
                        </button>
                    );
                })}
            </div>
        </div>
      </header>

      {activeView === 'pedidos' && (
          <div className="rh-stack bz-tab-panel">
              <div className="rh-toolbar is-pedidos">
                  <label className="rh-search">
                      <Icons.Search size={16} />
                      <input type="text" value={pedidosBusca} onChange={(e) => setPedidosBusca(e.target.value)} placeholder="Procurar por colaborador, tipo, origem ou destino..." />
                      {pedidosBusca && <button type="button" className="rh-search-clear" onClick={() => setPedidosBusca('')} aria-label="Limpar"><Icons.X size={13} /></button>}
                  </label>
                  <div className="rh-seg">
                      {[
                          { id: 'todos', label: 'Todos', n: pedidosPendentes.length + pedidosKmPendentes.length },
                          { id: 'ferias', label: 'Férias', n: pedidosPendentes.filter((p) => isVacationType(p.tipo) && p.estado === 'pendente').length },
                          { id: 'outras', label: 'Outras ausências', n: pedidosPendentes.filter((p) => !isVacationType(p.tipo) && p.estado === 'pendente').length },
                          { id: 'cancel', label: 'Cancelamentos', n: [...pedidosPendentes, ...pedidosKmPendentes].filter((p) => p.estado === 'pedido_cancelamento').length },
                      ].map((f) => (
                          <button key={f.id} type="button" className={pedidosTipoFiltro === f.id ? 'is-on' : ''} onClick={() => setPedidosTipoFiltro(f.id)}>
                              {f.label} <em>{f.n}</em>
                          </button>
                      ))}
                  </div>
              </div>

              {/* TABELA DE AUSÊNCIAS (Férias, Baixas, etc.) */}
              <section className="rh-card">
                  <div className="rh-card-head">
                      <div className="rh-card-title">
                          <span className="rh-card-ico is-amber"><Icons.Flag size={18} /></span>
                          <div>
                              <h3>Ausências Pendentes <em className="rh-count">{pedidosPendentes.length}</em></h3>
                          </div>
                      </div>
                      {selectedPedidosPendentes.length > 0 && (
                          <button type="button" onClick={() => abrirModalAprovacaoMassa('ausencias')} disabled={isSubmitting} className="rh-btn is-ok">
                              <Icons.Check size={16} /> Aprovar Selecionados ({selectedPedidosPendentes.length})
                          </button>
                      )}
                  </div>
                  {pedidosPendentes.length > 0 ? (
                      <div className="rh-table-wrap">
                        <table className="rh-table">
                            <thead>
                                <tr>
                                    <th className="is-check">
                                        <input
                                            type="checkbox"
                                            className="rh-checkbox"
                                            onChange={(e) => handleSelectAll(e, pedidosPendentesFiltrados, setSelectedPedidosPendentes)}
                                            checked={pedidosPendentesFiltrados.filter(p => p.estado === 'pendente').length > 0 && pedidosPendentesFiltrados.filter(p => p.estado === 'pendente').every(p => selectedPedidosPendentes.includes(p.id))}
                                            title="Selecionar todos os novos pedidos"
                                        />
                                    </th>
                                    <th>Colaborador</th>
                                    <th>Tipo</th>
                                    <th>Período</th>
                                    <th>Duração</th>
                                    <th>Estado</th>
                                    <th className="is-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidosPendentesFiltrados.length === 0 && (
                                    <tr><td colSpan={7} className="rh-no-results">Nenhuma ausência corresponde aos filtros.</td></tr>
                                )}
                                {pedidosPendentesFiltrados.map(p => (
                                    <tr key={p.id} className={p.estado === 'pedido_cancelamento' ? 'is-cancel' : (selectedPedidosPendentes.includes(p.id) ? 'is-selected' : '')}>
                                        <td className="is-check">
                                            {p.estado === 'pendente' && (
                                                <input
                                                    type="checkbox"
                                                    className="rh-checkbox"
                                                    checked={selectedPedidosPendentes.includes(p.id)}
                                                    onChange={(e) => handleSelectOne(e, p.id, setSelectedPedidosPendentes)}
                                                />
                                            )}
                                        </td>
                                        <td><span className="rh-who">{renderRhAvatar(p.profiles?.nome, p.user_id)}<strong>{p.profiles?.nome}</strong></span></td>
                                        <td><span className="rh-type">{formatAbsenceTypeLabel(p.tipo)}</span></td>
                                        <td>{formatPeriodo(p)}</td>
                                        <td><span className="rh-num">{getDuracaoAusenciaUI(p)} dia(s)</span></td>
                                        <td>{renderEstadoPedido(p)}</td>
                                        <td className="is-center">{renderPedidoAcoes(p)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  ) : (
                      <div className="rh-empty">
                          <span className="rh-empty-ico"><Icons.Flag size={30} /></span>
                          <p>Não há ausências pendentes.</p>
                      </div>
                  )}
              </section>

              {/* TABELA DE PEDIDOS DE KM's */}
              <section className="rh-card">
                  <div className="rh-card-head">
                      <div className="rh-card-title">
                          <span className="rh-card-ico is-blue"><Icons.Inbox size={18} /></span>
                          <div>
                              <h3>Deslocações Pendentes <em className="rh-count">{pedidosKmPendentes.length}</em></h3>
                          </div>
                      </div>
                      {selectedPedidosKm.length > 0 && (
                          <div className="rh-head-actions">
                              {/* Etiqueta de Contagem em Tempo Real */}
                              <span className="rh-km-total">
                                  <Icons.Chart size={14}/>
                                  Total Selecionado: <strong>{totalKmSelecionados.toFixed(2)} km</strong>
                              </span>
                              <button type="button" onClick={() => abrirModalAprovacaoMassa('kms')} disabled={isSubmitting} className="rh-btn is-ok">
                                  <Icons.Check size={16} /> Aprovar ({selectedPedidosKm.length})
                              </button>
                          </div>
                      )}
                  </div>
                  {pedidosKmPendentes.length > 0 ? (
                      <div className="rh-table-wrap">
                        <table className="rh-table">
                            <thead>
                                <tr>
                                    <th className="is-check">
                                        <input
                                            type="checkbox"
                                            className="rh-checkbox"
                                            onChange={(e) => handleSelectAll(e, pedidosKmFiltrados, setSelectedPedidosKm)}
                                            checked={pedidosKmFiltrados.filter(p => p.estado === 'pendente').length > 0 && pedidosKmFiltrados.filter(p => p.estado === 'pendente').every(p => selectedPedidosKm.includes(p.id))}
                                            title="Selecionar todos os novos pedidos"
                                        />
                                    </th>
                                    <th>Colaborador</th>
                                    <th>Origem</th>
                                    <th>Destino</th>
                                    <th>Distância</th>
                                    <th>Data</th>
                                    <th>Estado</th>
                                    <th className="is-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidosKmFiltrados.length === 0 && (
                                    <tr><td colSpan={8} className="rh-no-results">Nenhuma deslocação corresponde aos filtros.</td></tr>
                                )}
                                {pedidosKmFiltrados.map(p => {
                                    const acumuladoMes = calcularTotalKmAprovadosNoMes(p.user_id, p.data_inicio, ausenciasMes);
                                    return (
                                    <tr key={p.id} className={p.estado === 'pedido_cancelamento' ? 'is-cancel' : (selectedPedidosKm.includes(p.id) ? 'is-selected' : '')}>
                                        <td className="is-check">
                                            {p.estado === 'pendente' && (
                                                <input
                                                    type="checkbox"
                                                    className="rh-checkbox"
                                                    checked={selectedPedidosKm.includes(p.id)}
                                                    onChange={(e) => handleSelectOne(e, p.id, setSelectedPedidosKm)}
                                                />
                                            )}
                                        </td>
                                        <td><span className="rh-who">{renderRhAvatar(p.profiles?.nome, p.user_id)}<strong>{p.profiles?.nome}</strong></span></td>
                                        <td><span className="rh-place">{p.km_origem || '-'}</span></td>
                                        <td>
                                            <span className="rh-place">{p.km_destino || '-'}</span>
                                            {p.km_ida_volta && <span className="rh-tag is-brand">⇄ Ida e volta</span>}
                                        </td>
                                        <td>
                                            <div className="rh-km">
                                                <strong>+{p.km_total ?? 0} km</strong>
                                                <small>Já aprovados no mês: <b>{acumuladoMes} km</b></small>
                                            </div>
                                        </td>
                                        <td><span className="rh-periodo-line">{new Date(p.data_inicio).toLocaleDateString('pt-PT')}</span></td>
                                        <td>{renderEstadoPedido(p)}</td>
                                        <td className="is-center">{renderPedidoAcoes(p)}</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                      </div>
                  ) : (
                      <div className="rh-empty">
                          <span className="rh-empty-ico"><Icons.Inbox size={30} /></span>
                          <p>Não há deslocações pendentes.</p>
                      </div>
                  )}
              </section>

              {(selectedPedidosPendentes.length > 0 || selectedPedidosKm.length > 0) && (
                  <div className="rh-floatbar">
                      <div className="rh-floatbar-info">
                          <strong>{selectedPedidosPendentes.length + selectedPedidosKm.length}</strong>
                          <span>
                              selecionado(s)
                              {selectedPedidosKm.length > 0 && <> · <b>{totalKmSelecionados.toFixed(2)} km</b></>}
                          </span>
                      </div>
                      {selectedPedidosPendentes.length > 0 && (
                          <button type="button" className="rh-btn is-ok is-sm" disabled={isSubmitting} onClick={() => abrirModalAprovacaoMassa('ausencias')}>
                              <Icons.Check size={15} /> Aprovar Selecionados ({selectedPedidosPendentes.length})
                          </button>
                      )}
                      {selectedPedidosKm.length > 0 && (
                          <button type="button" className="rh-btn is-ok is-sm" disabled={isSubmitting} onClick={() => abrirModalAprovacaoMassa('kms')}>
                              <Icons.Check size={15} /> Aprovar ({selectedPedidosKm.length})
                          </button>
                      )}
                      <button type="button" className="rh-floatbar-clear" onClick={() => { setSelectedPedidosPendentes([]); setSelectedPedidosKm([]); }} aria-label="Limpar seleção"><Icons.X size={15} /></button>
                  </div>
              )}
          </div>
      )}

        {activeView === 'tolerancias' && (
            <div className="rh-stack bz-tab-panel">
                <section className="rh-card">
                    <div className="rh-card-head">
                        <div className="rh-card-title">
                            <span className="rh-card-ico"><Icons.Clock size={18} /></span>
                            <div>
                                <h3>Tolerâncias de Ponto <em className="rh-count">{tolerancias.length}</em></h3>
                                <p>Dias dispensados que não contam como férias para os colaboradores.</p>
                            </div>
                        </div>
                        <button type="button" className="rh-btn is-primary" onClick={() => { setNewTolerancia({ nome: '', data: '', tipo: 'global', user_id: '' }); setShowToleranciaModal(true); }}>
                            <Icons.Flag size={16} /> Nova Tolerância
                        </button>
                    </div>
                    {tolerancias.length > 0 ? (
                        <div className="rh-tol-list">
                            {tolerancias.map(t => {
                                const colab = t.user_id ? colaboradores.find(c => c.id === t.user_id) : null;
                                const dt = t.data ? new Date(t.data + 'T00:00:00') : null;
                                return (
                                    <div key={t.id} className="rh-tol">
                                        <span className="rh-tol-date">
                                            <strong>{dt ? dt.getDate() : '-'}</strong>
                                            <small>{dt ? dt.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '') : ''}</small>
                                        </span>
                                        <div className="rh-tol-main">
                                            <strong>{t.nome}</strong>
                                            <small>{dt ? dt.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</small>
                                        </div>
                                        {t.user_id ? (
                                            <span className="rh-tag is-green"><Icons.User size={12} /> {colab?.nome || 'Individual'}</span>
                                        ) : (
                                            <span className="rh-tag is-brand"><Icons.Users size={12} /> Global</span>
                                        )}
                                        <ModernTooltip content="Eliminar">
                                            <button type="button" className="rh-icon-btn is-bad" onClick={() => handleDeleteTolerancia(t.id)}>
                                                <Icons.Trash size={16} />
                                            </button>
                                        </ModernTooltip>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rh-empty">
                            <span className="rh-empty-ico"><Icons.Clock size={30} /></span>
                            <p>Nenhuma tolerância definida. Adicione dias dispensados que não devem contar como férias.</p>
                        </div>
                    )}
                </section>
            </div>
        )}

        {activeView === 'inativos' && (
            <div className="rh-stack bz-tab-panel">
                <section className="rh-card">
                    <div className="rh-card-head">
                        <div className="rh-card-title">
                            <span className="rh-card-ico is-red"><Icons.User size={18} /></span>
                            <div>
                                <h3>Colaboradores inativos <em className="rh-count">{colaboradoresInativos.length}</em></h3>
                                <p>Colaboradores arquivados que continuam associados aos dados históricos.</p>
                            </div>
                        </div>
                    </div>
                    {renderInativosList()}
                </section>
            </div>
        )}

      {activeView === 'formacoes' && (
        <div className="rh-stack bz-tab-panel">
            <section className="rh-card">
                <div className="rh-card-head">
                    <div className="rh-card-title">
                        <span className="rh-card-ico is-purple"><Icons.FileText size={18} /></span>
                        <div>
                            <h3>Horas de Formação - Ano {formacaoAno}</h3>
                            <p>Acompanhamento do mínimo legal de 40h anuais por colaborador.</p>
                        </div>
                    </div>
                    <button type="button" className="rh-btn is-primary" onClick={() => setShowFormacaoModal(true)}>
                        <Icons.Check size={16} /> Registar Nova Formação
                    </button>
                </div>

                <div className="rh-mini-kpis">
                    <div><span>Cumprem as 40h</span><strong className="is-green">{formacaoCumpridos}<small>/{colaboradoresAtivos.length}</small></strong></div>
                    <div><span>Total de horas</span><strong>{formacaoTotalHoras}h</strong></div>
                    <div><span>Média por colaborador</span><strong>{colaboradoresAtivos.length ? (formacaoTotalHoras / colaboradoresAtivos.length).toFixed(1) : 0}h</strong></div>
                </div>

                <div className="rh-table-wrap">
                    <table className="rh-table">
                        <thead>
                            <tr>
                                <th>Colaborador</th>
                                <th>Progresso (Mín. 40h)</th>
                                <th className="is-center">Total Horas</th>
                                <th className="is-center">Faltam</th>
                            </tr>
                        </thead>
                        <tbody>
                            {horasPorColab.map(({ colab, horas: horasAno }) => {
                                const faltam = Math.max(0, 40 - horasAno);
                                const percent = Math.min((horasAno / 40) * 100, 100);
                                const barColor = horasAno >= 40 ? '#16a34a' : (horasAno > 20 ? '#eab308' : '#ef4444');
                                return (
                                    <tr key={colab.id}>
                                        <td><span className="rh-who">{renderRhAvatar(colab.nome, colab.id, 'sm', colab.avatar_url)}<strong>{colab.nome}</strong></span></td>
                                        <td style={{ width: '42%' }}>
                                            <div className="rh-progress" style={{ '--b': barColor }}>
                                                <span className="rh-progress-bar"><i style={{ width: `${percent}%` }} /></span>
                                                <b>{percent.toFixed(0)}%</b>
                                            </div>
                                        </td>
                                        <td className="is-center"><span className="rh-num">{horasAno}h</span></td>
                                        <td className="is-center">
                                            {faltam === 0
                                                ? <span className="rh-tag is-green">Concluído</span>
                                                : <span className="rh-num is-bad">{faltam}h</span>
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* HISTÓRICO DE AÇÕES DE FORMAÇÃO EM CARDS */}
            <section className="rh-card">
                <div className="rh-card-head">
                    <div className="rh-card-title">
                        <span className="rh-card-ico"><Icons.FileText size={18} /></span>
                        <div><h3>Histórico de Formações Dadas</h3></div>
                    </div>
                </div>
                {formacoes.length === 0 ? (
                    <div className="rh-empty is-small">
                        <span className="rh-empty-ico"><Icons.FileText size={26} /></span>
                        <p>Nenhuma ação de formação registada.</p>
                    </div>
                ) : (
                    <div className="rh-form-grid">
                        {Object.values(formacoes.reduce((acc, f) => {
                            // Agrupar formações pelo Nome + Datas
                            const key = `${f.nome}_${f.data_inicio}_${f.data_fim}`;
                            if (!acc[key]) {
                                acc[key] = {
                                    ids: [],
                                    nome: f.nome,
                                    data_inicio: f.data_inicio,
                                    data_fim: f.data_fim,
                                    total_horas: f.total_horas,
                                    participantes: []
                                };
                            }
                            acc[key].ids.push(f.id);
                            if (f.profiles?.nome) acc[key].participantes.push(f.profiles.nome);
                            return acc;
                        }, {})).sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio)).map((grupo, i) => (
                            <article key={i} className="rh-formacao">
                                <button type="button" onClick={() => setDeleteFormacaoModal({show: true, grupo: grupo})} className="rh-icon-btn is-bad rh-formacao-del" title="Eliminar Formação">
                                    <Icons.Trash size={16} />
                                </button>
                                <h4>{grupo.nome}</h4>
                                <div className="rh-formacao-date">
                                    <Icons.Calendar size={14}/>
                                    {grupo.data_inicio === grupo.data_fim
                                        ? new Date(grupo.data_inicio).toLocaleDateString('pt-PT')
                                        : `${new Date(grupo.data_inicio).toLocaleDateString('pt-PT')} a ${new Date(grupo.data_fim).toLocaleDateString('pt-PT')}`
                                    }
                                </div>
                                <div className="rh-formacao-tags">
                                    <span className="rh-tag is-blue">{grupo.total_horas} horas</span>
                                    <span className="rh-tag is-green">{grupo.participantes.length} Participante(s)</span>
                                </div>
                                {/* Intervenientes */}
                                <div className="rh-formacao-people">
                                    <span>Intervenientes:</span>
                                    <div className="rh-avatar-stack">
                                        {grupo.participantes.slice(0, 6).map((participante, pIndex) => (
                                            <ModernTooltip key={pIndex} content={participante}>
                                                {renderRhAvatar(participante, participante)}
                                            </ModernTooltip>
                                        ))}
                                        {grupo.participantes.length > 6 && <span className="rh-avatar is-sm is-more">+{grupo.participantes.length - 6}</span>}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
        )}

      {activeView === 'processamento' && (
          <div className="rh-stack bz-tab-panel">
                <section className="rh-card">
                    <div className="rh-card-head">
                        <div className="rh-card-title">
                            <span className="rh-card-ico is-green"><Icons.Currency size={18} /></span>
                            <div>
                                <h3>Processamento da Equipa <span className="rh-cap">{currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</span></h3>
                                <p>Subsídio de alimentação calculado com as mesmas regras da ficha individual. Clica numa linha para abrir a ficha.</p>
                            </div>
                        </div>
                        <div className="rh-head-actions">
                            <div className="rh-month-mini">
                                <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><Icons.ChevronLeft size={16} /></button>
                                <button type="button" onClick={() => changeMonth(1)} aria-label="Mês seguinte"><Icons.ChevronRight size={16} /></button>
                            </div>
                            <button type="button" className="rh-btn is-green-soft is-sm" onClick={exportarProcessamentoExcel} disabled={processamentoEquipa.length === 0}>
                                <Icons.Download size={15} /> Exportar Excel
                            </button>
                        </div>
                    </div>
                    <div className="rh-table-wrap">
                        <table className="rh-table rh-proc-table">
                            <thead>
                                <tr>
                                    <th>Colaborador</th>
                                    <th className="is-center">Dias úteis</th>
                                    <th className="is-center">Trabalhados (&gt;=5h)</th>
                                    <th className="is-center">Descontados</th>
                                    <th className="is-center">Férias</th>
                                    <th className="is-center">Faltas</th>
                                    <th className="is-center">Baixas</th>
                                    <th className="is-right">S.A. Diário</th>
                                    <th className="is-right">Total S.A.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processamentoEquipa.map((item) => (
                                    <tr key={item.colab.id} className="is-click" onClick={() => { setIsEditingUser(false); setSelectedUser(item.colab.id); setActiveView('gestao'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                        <td><span className="rh-who">{renderRhAvatar(item.colab.nome, item.colab.id, 'sm', item.colab.avatar_url)}<strong>{item.colab.nome}</strong></span></td>
                                        <td className="is-center"><span className="rh-num is-muted">{item.diasUteisMes}</span></td>
                                        <td className="is-center"><span className="rh-num">{item.countTrabalho}</span></td>
                                        <td className="is-center"><span className={`rh-num ${item.diasDescontadosSA > 0 ? 'is-bad' : 'is-muted'}`}>{item.diasDescontadosSA}</span></td>
                                        <td className="is-center"><span className={`rh-num ${item.countFerias > 0 ? 'is-amber' : 'is-muted'}`}>{item.countFerias}</span></td>
                                        <td className="is-center"><span className={`rh-num ${item.countFaltas > 0 ? 'is-bad' : 'is-muted'}`}>{item.countFaltas}</span></td>
                                        <td className="is-center"><span className={`rh-num ${item.countBaixas > 0 ? 'is-purple' : 'is-muted'}`}>{item.countBaixas}</span></td>
                                        <td className="is-right"><span className="rh-num is-muted">{item.diarioSA.toFixed(2)} €</span></td>
                                        <td className="is-right"><span className="rh-sa-total">{item.valorSA.toFixed(2)} €</span></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={8}>TOTAL S.A. PAGAR</td>
                                    <td className="is-right"><span className="rh-sa-total is-big">{processamentoTotal.toFixed(2)} €</span></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>
          </div>
      )}

      {activeView === 'gestao' && (
          <div className="rh-stack bz-tab-panel">
            <div className="rh-toolbar">
                <div className="rh-global">
                    <label className="rh-global-field">
                        <span>S.A. GLOBAL:</span>
                        <input
                            type="number"
                            step="0.01"
                            value={globalSA}
                            onChange={e => {
                                setGlobalSA(e.target.value);
                                setPendingGlobalUpdates((prev) => ({ ...prev, sa: true }));
                            }}
                        />
                        <em>€</em>
                    </label>
                    <label className="rh-global-field">
                        <span>€/KM:</span>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={valorKmReembolso}
                            onChange={e => {
                                setValorKmReembolso(e.target.value);
                                setPendingGlobalUpdates((prev) => ({ ...prev, km: true }));
                            }}
                        />
                    </label>
                    {isSavingKmRate && <span className="rh-saving">a guardar...</span>}
                    <button type="button" onClick={handleBulkUpdateSA} className={`rh-btn is-primary is-sm ${pendingGlobalUpdates.sa || pendingGlobalUpdates.km ? 'is-pulse' : ''}`}>Aplicar</button>
                </div>
                <div className="rh-toolbar-actions">
                    <FancySelect
                        className="rh-user-picker"
                        value={selectedUser || ""}
                        onChange={(value) => {
                            setIsEditingUser(false);
                            setSelectedUser(value || null);
                        }}
                        options={[
                            {
                                value: "",
                                label: "Visão Geral Global",
                                hint: `${colaboradoresAtivos.length} colaboradores · resumo da equipa`,
                                icon: <span className="rh-avatar is-sm is-global"><Icons.Users size={15} /></span>,
                            },
                            ...[...colaboradoresAtivos]
                                .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-PT'))
                                .map((c) => {
                                    const ausente = ausentesHoje.some((a) => a.nomeUser === c.nome);
                                    return {
                                        value: c.id,
                                        label: c.nome,
                                        hint: `${formatCompaniesLabel(c)}${ausente ? ' · Ausente hoje' : ''}`,
                                        group: 'Colaboradores',
                                        icon: renderRhAvatar(c.nome, c.id, 'sm', c.avatar_url),
                                    };
                                }),
                        ]}
                        menuWidth={340}
                        searchPlaceholder="Procurar colaborador..."
                        ariaLabel="Colaborador"
                    />
                    {!selectedUser && (
                        <button
                            type="button"
                            onClick={downloadRHGeneralPDF}
                            disabled={isGeneratingRhPdf || colaboradores.length === 0}
                            className="rh-btn is-soft"
                        >
                            <Icons.Download size={16} /> {isGeneratingRhPdf ? 'A gerar PDF...' : 'Exportar PDF RH'}
                        </button>
                    )}
                    <button type="button" onClick={() => {
                      setIsEditingAbsence(false);
                      setEditingAbsenceData(null);
                      setNewAbsence({ user_id: selectedUser || "", tipo: "Férias", data_inicio: "", data_fim: "", is_parcial: false, hora_inicio: "", hora_fim: "", motivo: "", km_origem: "", km_destino: "", km_total: "" });
                      setAbsenceFile(null);
                      setShowAbsenceModal(true);
                    }} className="rh-btn is-primary">
                        <Icons.Edit size={16} /> Ausência Manual
                    </button>
                </div>
            </div>

            {!selectedUser && (
                <section className="rh-card">
                    <div className="rh-card-head">
                        <div className="rh-card-title">
                            <span className="rh-card-ico"><Icons.Users size={18} /></span>
                            <div>
                                <h3>Equipa hoje <em className="rh-count">{colaboradoresAtivos.length}</em></h3>
                                <p>Clica num colaborador para abrir a ficha.</p>
                            </div>
                        </div>
                        <div className="rh-team-legend">
                            <span className="is-work"><i />A trabalhar</span>
                            <span className="is-vac"><i />Férias</span>
                            <span className="is-sick"><i />Baixa</span>
                            <span className="is-none"><i />Sem registo</span>
                        </div>
                    </div>
                    <div className="rh-team">
                        {[...colaboradoresAtivos]
                            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-PT'))
                            .map((c, index) => {
                                const estadoHoje = getEstadoHoje(c);
                                const ferias = getDiasDisponiveisPorUserId(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`rh-member is-${estadoHoje.tone}`}
                                        style={{ '--i': Math.min(index, 16) }}
                                        onClick={() => { setIsEditingUser(false); setSelectedUser(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    >
                                        <span className="rh-member-av">
                                            {renderRhAvatar(c.nome, c.id, 'md', c.avatar_url)}
                                            <i className="rh-member-dot" />
                                        </span>
                                        <span className="rh-member-main">
                                            <strong>{c.nome}</strong>
                                            <small>{estadoHoje.label}</small>
                                        </span>
                                        <span className="rh-member-vac" title="Férias disponíveis">
                                            <b>{ferias}</b>
                                            <small>dias</small>
                                        </span>
                                    </button>
                                );
                            })}
                    </div>
                </section>
            )}

            <div className="rh-grid">
                <div className="rh-col">
                    {selectedUser ? (
                        <>
                            <section className="rh-card rh-profile" style={{ '--c': rhColorFor(selectedUser) }}>
                                <div className="rh-profile-banner" />
                                <div className="rh-profile-head">
                                    {renderRhAvatar(currentUserProfile?.nome, selectedUser, 'xl', currentUserProfile?.avatar_url)}
                                    <div className="rh-profile-id">
                                        <h3>{currentUserProfile?.nome}</h3>
                                        <span className="rh-tag">{formatCompaniesLabel(currentUserProfile)}</span>
                                        {temporaryStatusAtual && (
                                            <div className="rh-profile-temp">
                                                <span className="rh-tag is-teal">Estado temporário ativo</span>
                                                <small>{formatAbsenceTypeLabel(temporaryStatusAtual.tipo)} · {formatTemporaryStatusRange(temporaryStatusAtual)}</small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="rh-profile-pdfs">
                                    <button type="button" onClick={downloadIndividualPDF} disabled={isGeneratingIndividualPdf} className="rh-btn is-green-soft is-sm">
                                        <Icons.Download size={14} /> {isGeneratingIndividualPdf ? 'A gerar PDF...' : 'Relatório PDF'}
                                    </button>
                                    <button type="button" onClick={downloadSelectedUserDeslocacoesPDF} disabled={isGeneratingDeslocacoesPdf} className="rh-btn is-orange-soft is-sm">
                                        <Icons.Download size={14} /> {isGeneratingDeslocacoesPdf ? 'A gerar PDF...' : 'Deslocações PDF'}
                                    </button>
                                </div>

                                <div className="rh-seg is-full">
                                    <button type="button" className={userTab === 'financeiro' ? 'is-on' : ''} onClick={() => setUserTab('financeiro')}>
                                        <Icons.Currency size={16} /> Financeiro
                                    </button>
                                    <button type="button" className={userTab === 'dados' ? 'is-on' : ''} onClick={() => setUserTab('dados')}>
                                        <Icons.FileText size={16} /> Pessoal
                                    </button>
                                </div>

                                {userTab === 'financeiro' && (
                                    <div className="rh-fin bz-tab-panel" key="fin">
                                        <div className="rh-fin-tile is-main">
                                            <span><Icons.Currency size={16}/> Valor S.A. Diário</span>
                                            <strong>{Number(currentUserProfile?.valor_sa || 0).toFixed(2)} €</strong>
                                        </div>
                                        <div className="rh-fin-tile is-brand">
                                            <span><Icons.Sun size={16}/> Férias disponíveis ({currentDate.getFullYear()})</span>
                                            <strong>{saldoFeriasAnoSelecionado?.diasDisponiveis ?? '--'} <small>dias</small></strong>
                                            {hasDiasFeriasTotalColumn && Number(currentUserProfile?.dias_ferias_total) > 0 && saldoFeriasAnoSelecionado && (
                                                <span className="rh-fin-bar"><i style={{ width: `${Math.max(0, Math.min(100, (Number(saldoFeriasAnoSelecionado.diasDisponiveis) / Number(currentUserProfile.dias_ferias_total)) * 100))}%` }} /></span>
                                            )}
                                        </div>
                                        {isAnnualVacationOpeningAvailable() && (
                                            <>
                                                <div className="rh-fin-tile is-teal">
                                                    <span><Icons.Calendar size={16}/> Férias disponíveis ({currentDate.getFullYear() + 1})</span>
                                                    <strong>{saldoFeriasAnoSeguinte?.diasDisponiveis ?? '--'} <small>dias</small></strong>
                                                </div>
                                                <div className="rh-fin-tile is-green">
                                                    <span><Icons.Sun size={16}/> Total disponível (2 anos)</span>
                                                    <strong>
                                                        {saldoFeriasAnoSelecionado && saldoFeriasAnoSeguinte
                                                            ? <>{saldoFeriasAnoSelecionado.diasDisponiveis + saldoFeriasAnoSeguinte.diasDisponiveis} <small>dias</small></>
                                                            : '--'}
                                                    </strong>
                                                </div>
                                            </>
                                        )}
                                        <div className="rh-fin-tile is-teal">
                                            <span><Icons.Flag size={16}/> Limite Anual de Férias</span>
                                            <strong>{hasDiasFeriasTotalColumn ? (currentUserProfile?.dias_ferias_total ?? '--') : '--'} <small>dias</small></strong>
                                        </div>
                                        <button type="button" onClick={openUserEditor} className="rh-btn is-ghost is-block">
                                            <Icons.Edit size={16} /> Editar Dados Financeiros
                                        </button>
                                    </div>
                                )}

                                {userTab === 'dados' && (
                                    !isEditingUser ? (
                                        <div className="rh-dados bz-tab-panel" key="dados">
                                            <div className="rh-info-grid">
                                                <div><span>Nome Completo</span><b>{currentUserProfile?.nome_completo || '-'}</b></div>
                                                <div><span>Telemóvel</span><b>{currentUserProfile?.telemovel || '-'}</b></div>
                                                <div><span>NIF</span><b>{currentUserProfile?.nif || '-'}</b></div>
                                                <div><span>NISS</span><b>{currentUserProfile?.niss || '-'}</b></div>
                                                <div><span>NCC</span><b>{currentUserProfile?.ncc || '-'}</b></div>
                                                <div><span>Validade CC</span><b>{currentUserProfile?.validade_cc ? new Date(currentUserProfile.validade_cc).toLocaleDateString('pt-PT') : '-'}</b></div>
                                                <div><span>Data Nasc.</span><b>{currentUserProfile?.data_nascimento ? new Date(currentUserProfile.data_nascimento).toLocaleDateString('pt-PT') : '-'}</b></div>
                                                <div><span>Data Admissão</span><b>{currentUserProfile?.data_admissao ? new Date(currentUserProfile.data_admissao).toLocaleDateString('pt-PT') : '-'}</b></div>
                                                <div><span>Dependentes</span><b>{currentUserProfile?.nr_dependentes || '0'}</b></div>
                                                <div><span>Estado Civil</span><b>{currentUserProfile?.estado_civil || '-'}</b></div>
                                                <div><span>Nacionalidade</span><b>{currentUserProfile?.nacionalidade || '-'}</b></div>
                                                <div><span>Sexo</span><b>{currentUserProfile?.sexo || '-'}</b></div>
                                                <div className="is-wide"><span>Morada</span><b>{currentUserProfile?.morada || '-'}</b></div>
                                            </div>
                                            <div className="rh-info-list">
                                                <div><span>Concelho:</span> <b>{currentUserProfile?.concelho || '-'}</b></div>
                                                <div><span>Empresas:</span> <b>{formatCompaniesLabel(currentUserProfile)}</b></div>
                                                <div><span>Email Institucional:</span> <b>{currentUserProfile?.email || '-'}</b></div>
                                                <div><span>Email Pessoal:</span> <b>{currentUserProfile?.email_pessoal || '-'}</b></div>
                                                <div><span>Contrato:</span> <b>{currentUserProfile?.tipo_contrato || '-'}</b></div>
                                            </div>
                                            {temporaryStatusAtual && (
                                                <div className="rh-temp-box">
                                                    <span>Estado temporário</span>
                                                    <strong>{formatAbsenceTypeLabel(temporaryStatusAtual.tipo)}</strong>
                                                    <small>{formatTemporaryStatusRange(temporaryStatusAtual)}</small>
                                                    {temporaryStatusAtual.motivo && <em>{temporaryStatusAtual.motivo}</em>}
                                                </div>
                                            )}
                                            <div className="rh-btn-row">
                                                <button type="button" onClick={openUserEditor} className="rh-btn is-ghost">
                                                    <Icons.Edit size={16} /> Editar Informações
                                                </button>
                                                <button type="button" onClick={openUserTemporaryStatusEditor} className="rh-btn is-sky-soft">
                                                    <Icons.Clock size={16} /> Estado temporário
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rh-editing-note"><Icons.Edit size={16} /> A editar no painel de edição…</div>
                                    )
                                )}
                            </section>

                            <section className="rh-card">
                                <div className="rh-card-head">
                                    <div className="rh-card-title">
                                        <span className="rh-card-ico is-green"><Icons.Chart size={18} /></span>
                                        <div><h3>Processamento <span className="rh-cap">{currentDate.toLocaleDateString('pt-PT', {month:'long'})}</span></h3></div>
                                    </div>
                                </div>
                                <div className="rh-proc">
                                    <div><span>Dias úteis do mês</span><b>{stats.diasUteisMes}</b></div>
                                    <div><span>Dias Trabalhados (&gt;=5h)</span><b className="is-ink">{stats.countTrabalho}</b></div>
                                    <div className="is-bad"><span>Dias Descontados (&lt;5h / ausência)</span><b>{stats.diasDescontadosSA}</b></div>
                                    <div><span>Férias</span><b>{stats.countFerias}</b></div>
                                    <div className="is-bad"><span>Faltas</span><b>{stats.countFaltas}</b></div>
                                    <div className="is-purple"><span>Baixas</span><b>{stats.countBaixas}</b></div>
                                </div>
                                <div className="rh-proc-total">
                                    <span>TOTAL S.A. PAGAR:</span>
                                    <strong>{stats.valorSA} €</strong>
                                </div>
                            </section>
                        </>
                    ) : (
                        <section className="rh-card">
                            <div className="rh-card-head">
                                <div className="rh-card-title">
                                    <span className="rh-card-ico"><Icons.Chart size={18} /></span>
                                    <div><h3>Resumo Global do Mês</h3></div>
                                </div>
                            </div>
                            <div className="rh-sum-tiles">
                                <div className="is-amber"><Icons.Sun size={18}/><span>Férias Marcadas</span><strong>{stats.countFerias} <small>dias</small></strong></div>
                                <div className="is-red"><Icons.X size={18}/><span>Faltas</span><strong>{stats.countFaltas} <small>dias</small></strong></div>
                                <div className="is-purple"><Icons.HeartPulse size={18}/><span>Baixas Médicas</span><strong>{stats.countBaixas} <small>dias</small></strong></div>
                            </div>

                            <div className="rh-sub">
                                <h5><Icons.Clock size={14}/> Ausentes Hoje</h5>
                                {ausentesHoje.length === 0 ? (
                                    <div className="rh-ok-box"><Icons.Check size={18}/> Todos presentes!</div>
                                ) : (
                                    <div className="rh-mini-list">
                                        {ausentesHoje.map(a => (
                                            <div key={a.id} className="rh-mini-row">
                                                {renderRhAvatar(a.nomeUser, a.user_id || a.nomeUser)}
                                                <div><b>{a.nomeUser}</b><small>{a.infoHora} {formatAbsenceTypeLabel(a.tipo)}</small></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rh-sub">
                                <h5><Icons.Clock size={14}/> Estados Temporários Ativos Hoje</h5>
                                {estadosTemporariosHoje.length === 0 ? (
                                    <div className="rh-muted-box">Sem estados temporários ativos hoje.</div>
                                ) : (
                                    <div className="rh-mini-list">
                                        {estadosTemporariosHoje.map((item) => {
                                            const estadoStyle = getTemporaryStatusStyle(item.tipo);
                                            return (
                                                <div key={item.id} className="rh-mini-row is-tinted" style={{ background: estadoStyle.cor, color: estadoStyle.textoCor }}>
                                                    <div>
                                                        <b>{item.nomeUser}</b>
                                                        <small>{formatAbsenceTypeLabel(item.tipo)} · {formatTemporaryStatusRange(item.estado)}</small>
                                                    </div>
                                                    <span className="rh-tag is-white">Ativo</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="rh-sub">
                                <h5><Icons.Cake size={14}/> Aniversariantes de {currentDate.toLocaleDateString('pt-PT', {month:'long'})}</h5>
                                {aniversariantes.length === 0 ? (
                                    <div className="rh-muted-box">Ninguém faz anos este mês.</div>
                                ) : (
                                    <div className="rh-mini-list">
                                        {aniversariantes.map(c => (
                                            <div key={c.id} className="rh-mini-row">
                                                {renderRhAvatar(c.nome, c.id, 'sm', c.avatar_url)}
                                                <div><b>{c.nome}</b></div>
                                                <span className="rh-bday">🎂 Dia {new Date(c.data_nascimento).getDate()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                <div className="rh-col">
                    {selectedUser ? (
                        <CalendarioColaborador
                            userId={selectedUser}
                            userName={currentUserProfile?.nome || 'Colaborador'}
                            dataAdmissao={currentUserProfile?.data_admissao}
                            estadoTemporario={temporaryStatusAtual}
                            onVacationBalanceUpdated={async () => {
                                await fetchColaboradores();
                                if (selectedUser) await fetchHistoricoUser(selectedUser);
                                await fetchDadosMensais();
                            }}
                            onMonthChange={(date) => setCurrentDate(date)}
                        />
                    ) : (
                        <section className="rh-card rh-cal">
                            <div className="rh-cal-head">
                                <button type="button" onClick={() => changeMonth(-1)} className="rh-round-btn" aria-label="Mês anterior">
                                    <Icons.ChevronLeft size={18} />
                                </button>
                                <h2>{currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h2>
                                <button type="button" onClick={() => changeMonth(1)} className="rh-round-btn" aria-label="Mês seguinte">
                                    <Icons.ChevronRight size={18} />
                                </button>
                            </div>
                            <div className="rh-cal-legend">
                                <span><i style={{ background: '#fcd34d' }} /> Férias</span>
                                <span><i style={{ background: '#fca5a5' }} /> Faltas</span>
                                <span><i style={{ background: '#d8b4fe' }} /> Baixas</span>
                                <span><i style={{ background: '#94a3b8' }} /> Parcial (horas)</span>
                                <span><i style={{ background: 'var(--color-btnPrimary)' }} /> Tolerância</span>
                                <span><i style={{ background: '#fee2e2', boxShadow: 'inset 0 0 0 1px #fca5a5' }} /> Feriado</span>
                            </div>
                            <div className="rh-cal-grid">
                                {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={`wd-${i}`} className="rh-cal-wd">{d}</div>)}
                                {renderCalendar()}
                            </div>
                        </section>
                    )}

                    {selectedUser && historicoUser.length > 0 && (
                        <section className="rh-card">
                            <div className="rh-card-head">
                                <div className="rh-card-title">
                                    <span className="rh-card-ico"><Icons.Clock size={18} /></span>
                                    <div><h3>Histórico de Ausências <em className="rh-count">{historicoUser.length}</em></h3></div>
                                </div>
                            </div>
                            <div className="rh-table-wrap is-scroll">
                                <table className="rh-table">
                                    <thead>
                                        <tr>
                                            <th>Tipo</th>
                                            <th>Período</th>
                                            <th className="is-center">Anexo</th>
                                            <th className="is-center">Estado</th>
                                            <th className="is-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historicoUser.map(h => (
                                            <tr key={h.id}>
                                                <td><span className="rh-type">{formatAbsenceTypeLabel(h.tipo)}</span></td>
                                                <td>
                                                  {h.tipo === KM_REQUEST_TYPE ? (
                                                      <div className="rh-periodo">
                                                          <strong>{new Date(h.data_inicio).toLocaleDateString('pt-PT')}</strong>
                                                          <small>De {h.km_origem || '-'} para {h.km_destino || '-'}{h.km_ida_volta ? ' e volta' : ''} ({h.km_total ?? '-'} km)</small>
                                                      </div>
                                                  ) : formatPeriodo(h)}
                                                </td>
                                                <td className="is-center">
                                                    {h.anexo_url ? <a href={h.anexo_url} target="_blank" rel="noreferrer" className="rh-link-chip"><Icons.Paperclip size={14}/> Ver</a> : <span className="rh-nil">-</span>}
                                                </td>
                                                <td className="is-center">
                                                    <span className={`rh-tag ${h.estado === 'aprovado' ? 'is-green' : 'is-off'} is-upper`}>{h.estado}</span>
                                                </td>
                                                <td className="is-center">
                                                    <div className="rh-row-actions">
                                                        <ModernTooltip content="Editar Registo">
                                                            <button type="button" className="rh-icon-btn is-brand" onClick={() => handleEditClick(h)}>
                                                                <Icons.Edit size={14} />
                                                            </button>
                                                        </ModernTooltip>
                                                        {h.estado === 'aprovado' && (
                                                            <ModernTooltip content="Cancelar e devolver dias">
                                                                <button type="button" className="rh-icon-btn is-bad" onClick={() => abrirModalConfirmacao(h, 'cancelar_direto')}>
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
                        </section>
                    )}
                </div>
            </div>
          </div>
      )}

      {isEditingUser && (
          <ModalPortal>
              <div className="rh-overlay">
                  <div className="rh-modal is-xl">
                      <div className="rh-modal-head" style={{ '--c': rhColorFor(selectedUser) }}>
                          {renderRhAvatar(currentUserProfile?.nome || currentUserProfile?.nome_completo, selectedUser, 'lg', currentUserProfile?.avatar_url)}
                          <div className="rh-modal-title">
                              <span>Editar colaborador</span>
                              <h3>{currentUserProfile?.nome || currentUserProfile?.nome_completo || 'Colaborador'}</h3>
                              <small>{formatCompaniesLabel(currentUserProfile)}</small>
                          </div>
                          <button type="button" onClick={() => openUserStatusModal(currentUserProfile)} className="rh-head-danger">
                              <Icons.Trash size={15} /> Desativar
                          </button>
                          <button type="button" onClick={closeUserEditor} className="rh-modal-close" aria-label="Fechar"><Icons.X size={20} /></button>
                      </div>

                      <div className="rh-modal-body is-split">
                          <aside className="rh-editor-aside">
                              <div className="rh-aside-title"><Icons.Currency size={15} /> Financeiro</div>
                              <div className="rh-field">
                                  <label>Valor S.A. Diário (€)</label>
                                  <input type="number" step="0.01" min="0" className="rh-input is-big" value={tempUserProfile.valor_sa || ''} onChange={setTemp('valor_sa')} />
                              </div>
                              <div className="rh-field">
                                  <label>Férias Disponíveis</label>
                                  <input type="number" step="0.5" className="rh-input is-big" value={tempUserProfile.dias_ferias ?? ''} onChange={setTemp('dias_ferias')} />
                              </div>
                              {hasDiasFeriasTotalColumn && (
                                  <div className="rh-field">
                                      <label>Limite Anual</label>
                                      <input type="number" step="1" min="0" className="rh-input is-big" value={tempUserProfile.dias_ferias_total ?? ''} onChange={setTemp('dias_ferias_total')} />
                                  </div>
                              )}
                              <div className="rh-editing-pill"><span className="rh-dot" /> Edição Ativa.</div>
                          </aside>

                          <div className="rh-editor-main">
                              <p className="rh-editor-intro"><b>Dados do colaborador</b> · Atualiza os campos pessoais, financeiros e o estado temporário.</p>

                              <section className="rh-fcard">
                                  <div className="rh-fcard-title"><span className="rh-card-ico is-sm"><Icons.User size={14} /></span> Identificação</div>
                                  <div className="rh-field">
                                      <label>Nome Completo</label>
                                      <input type="text" className="rh-input" value={tempUserProfile.nome_completo || ''} onChange={setTemp('nome_completo')} />
                                  </div>
                                  <div className="rh-fgrid is-3">
                                      <div className="rh-field"><label>NIF</label><input type="text" className="rh-input" value={tempUserProfile.nif || ''} onChange={setTemp('nif')} /></div>
                                      <div className="rh-field"><label>NISS</label><input type="text" className="rh-input" value={tempUserProfile.niss || ''} onChange={setTemp('niss')} /></div>
                                      <div className="rh-field"><label>CC (Formato auto)</label><input type="text" className="rh-input is-mono" value={tempUserProfile.ncc || ''} onChange={handleCCChange} /></div>
                                      <div className="rh-field"><label>Validade CC</label><input type="date" className="rh-input" value={tempUserProfile.validade_cc || ''} onChange={setTemp('validade_cc')} /></div>
                                      <div className="rh-field"><label>Data Nasc.</label><input type="date" className="rh-input" value={tempUserProfile.data_nascimento || ''} onChange={setTemp('data_nascimento')} /></div>
                                      <div className="rh-field"><label>Data Admissão</label><input type="date" className="rh-input" value={tempUserProfile.data_admissao || ''} onChange={setTemp('data_admissao')} /></div>
                                      <div className="rh-field"><label>Estado Civil</label><select className="rh-input" value={tempUserProfile.estado_civil || ''} onChange={setTemp('estado_civil')}><option value="">-</option><option value="Solteiro">Solteiro</option><option value="Casado">Casado</option><option value="Divorciado">Divorciado</option><option value="União Facto">União Facto</option></select></div>
                                      <div className="rh-field"><label>Dependentes</label><input type="number" className="rh-input" value={tempUserProfile.nr_dependentes || 0} onChange={setTemp('nr_dependentes')} /></div>
                                      <div className="rh-field"><label>Sexo</label><select className="rh-input" value={tempUserProfile.sexo || ''} onChange={setTemp('sexo')}><option value="">-</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option></select></div>
                                      <div className="rh-field"><label>Nacionalidade</label><input type="text" className="rh-input" value={tempUserProfile.nacionalidade || ''} onChange={setTemp('nacionalidade')} /></div>
                                  </div>
                              </section>

                              <section className="rh-fcard">
                                  <div className="rh-fcard-title"><span className="rh-card-ico is-sm is-blue"><Icons.Info size={14} /></span> Contactos & Morada</div>
                                  <div className="rh-field">
                                      <label>Morada</label>
                                      <input type="text" className="rh-input" value={tempUserProfile.morada || ''} onChange={setTemp('morada')} />
                                  </div>
                                  <div className="rh-fgrid is-2">
                                      <div className="rh-field"><label>Email Institucional</label><input type="email" className="rh-input" value={tempUserProfile.email || ''} disabled readOnly /></div>
                                      <div className="rh-field"><label>Email Pessoal</label><input type="email" className="rh-input" value={tempUserProfile.email_pessoal || ''} onChange={setTemp('email_pessoal')} /></div>
                                      <div className="rh-field"><label>Telemóvel</label><input type="text" className="rh-input" value={tempUserProfile.telemovel || ''} onChange={setTemp('telemovel')} /></div>
                                      <div className="rh-field"><label>Concelho</label><input type="text" className="rh-input" value={tempUserProfile.concelho || ''} onChange={setTemp('concelho')} /></div>
                                  </div>
                              </section>

                              <section className="rh-fcard">
                                  <div className="rh-fcard-title"><span className="rh-card-ico is-sm is-purple"><Icons.FileText size={14} /></span> Empresas & Contrato</div>
                                  <div className="rh-field">
                                      <label>Empresas Internas</label>
                                      <div className="rh-chips">
                                          {EMPRESAS_INTERNAS.map((empresa) => {
                                              const isSelected = (tempUserProfile.empresas_internas || []).includes(empresa);
                                              return (
                                                  <button key={empresa} type="button" onClick={() => handleToggleEmpresaInterna(empresa)} className={`rh-chip ${isSelected ? 'is-on' : ''}`}>
                                                      {isSelected && <Icons.Check size={13} />} {empresa}
                                                  </button>
                                              );
                                          })}
                                          {(tempUserProfile.empresas_internas || []).length === 0 && (
                                              <span className="rh-chips-empty">Selecione pelo menos uma empresa.</span>
                                          )}
                                      </div>
                                  </div>
                                  <div className="rh-field">
                                      <label>Contrato</label>
                                      <select className="rh-input" value={tempUserProfile.tipo_contrato || ''} onChange={setTemp('tipo_contrato')}>
                                          <option value="">Selecione...</option><option value="Termo Certo">Termo Certo</option><option value="Sem Termo">Sem Termo</option><option value="Termo Incerto">Termo Incerto</option><option value="Estágio Profissional">Estágio Profissional</option><option value="Estágio Curricular">Estágio Curricular</option><option value="Prestação de Serviços">Prestação de Serviços</option><option value="N/a">N/a</option>
                                      </select>
                                  </div>
                              </section>

                              <section className="rh-fcard is-temp">
                                  <div className="rh-fcard-title is-split">
                                      <span><span className="rh-card-ico is-sm is-teal"><Icons.Clock size={14} /></span> Estado temporário</span>
                                      <em>Opcional</em>
                                  </div>
                                  <p className="rh-field-note">Marca automaticamente os dias dentro do período indicado.</p>
                                  <div className="rh-fgrid is-temp">
                                      <div className="rh-field">
                                          <label>Tipo</label>
                                          <select
                                              className="rh-input"
                                              value={tempUserProfile.estado_temporario_tipo || ''}
                                              onChange={(e) => setTempUserProfile((prev) => ({
                                                  ...prev,
                                                  estado_temporario_tipo: e.target.value,
                                                  estado_temporario_inicio: e.target.value ? (prev.estado_temporario_inicio || toLocalDateString(new Date())) : '',
                                                  estado_temporario_fim: e.target.value ? prev.estado_temporario_fim : '',
                                                  estado_temporario_motivo: e.target.value ? prev.estado_temporario_motivo : '',
                                              }))}
                                          >
                                              <option value="">Nenhum estado</option>
                                              {COLLABORATOR_STATUS_TYPES.map((estado) => (
                                                  <option key={estado} value={estado}>{estado}</option>
                                              ))}
                                          </select>
                                      </div>
                                      <div className="rh-field"><label>Início</label><input type="date" className="rh-input" value={tempUserProfile.estado_temporario_inicio || ''} onChange={setTemp('estado_temporario_inicio')} /></div>
                                      <div className="rh-field"><label>Fim</label><input type="date" className="rh-input" value={tempUserProfile.estado_temporario_fim || ''} onChange={setTemp('estado_temporario_fim')} /></div>
                                  </div>
                                  <div className="rh-field">
                                      <label>Motivo / observações</label>
                                      <input type="text" className="rh-input" value={tempUserProfile.estado_temporario_motivo || ''} onChange={setTemp('estado_temporario_motivo')} placeholder="Ex: Licença parental" />
                                  </div>
                                  {tempUserProfile.estado_temporario_tipo && (
                                      <button
                                          type="button"
                                          className="rh-btn is-bad-soft is-sm"
                                          onClick={() => setTempUserProfile((prev) => ({
                                              ...prev,
                                              estado_temporario_tipo: '',
                                              estado_temporario_inicio: '',
                                              estado_temporario_fim: '',
                                              estado_temporario_motivo: '',
                                          }))}
                                      >
                                          <Icons.X size={14} /> Limpar estado temporário
                                      </button>
                                  )}
                              </section>
                          </div>
                      </div>

                      <div className="rh-modal-foot">
                          <button type="button" className="rh-btn is-ghost" onClick={closeUserEditor}>Cancelar</button>
                          <button type="button" className="rh-btn is-primary is-lg" onClick={handleUpdateUserProfile}><Icons.Check size={16} /> Guardar alterações</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAIS EXISTENTES E NOVO MODAL DE DETALHES ABAIXO --- */}

      {/* NOVO MODAL: DETALHES DO PEDIDO (Ver Detalhes) */}
      {detailsModal.show && detailsModal.pedido && (
          <ModalPortal>
              <div className="rh-overlay" onClick={() => setDetailsModal({show: false, pedido: null})}>
                  <div className="rh-modal is-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="rh-modal-head" style={{ '--c': rhColorFor(detailsModal.pedido.user_id) }}>
                          {renderRhAvatar(detailsModal.pedido.profiles?.nome, detailsModal.pedido.user_id, 'lg')}
                          <div className="rh-modal-title">
                              <span>Detalhes do Pedido</span>
                              <h3>{detailsModal.pedido.profiles?.nome}</h3>
                              <small>{formatAbsenceTypeLabel(detailsModal.pedido.tipo)}</small>
                          </div>
                          <button type="button" onClick={() => setDetailsModal({show: false, pedido: null})} className="rh-modal-close" aria-label="Fechar"><Icons.X size={20}/></button>
                      </div>

                      <div className="rh-modal-body">
                          <div className="rh-detail-grid">
                              <div>
                                  <span>{detailsModal.pedido.tipo === KM_REQUEST_TYPE ? 'Tipo de Pedido' : 'Tipo de Ausência'}</span>
                                  <b>{formatAbsenceTypeLabel(detailsModal.pedido.tipo)}</b>
                              </div>
                              <div>
                                  <span>Estado Atual</span>
                                  <b><span className={`rh-tag ${detailsModal.pedido.estado === 'pendente' ? 'is-new' : (detailsModal.pedido.estado === 'pedido_cancelamento' ? 'is-cancel' : '')}`}>{detailsModal.pedido.estado.replace('_', ' ')}</span></b>
                              </div>
                          </div>

                          <div className="rh-detail-period">
                              <div>
                                  <span>Período</span>
                                  <strong>
                                      {detailsModal.pedido.is_parcial
                                        ? new Date(detailsModal.pedido.data_inicio).toLocaleDateString('pt-PT')
                                        : `${new Date(detailsModal.pedido.data_inicio).toLocaleDateString('pt-PT')} a ${new Date(detailsModal.pedido.data_fim).toLocaleDateString('pt-PT')}`
                                      }
                                  </strong>
                                  {detailsModal.pedido.is_parcial && (
                                      <small><Icons.Clock size={14}/> {detailsModal.pedido.hora_inicio?.slice(0,5)} às {detailsModal.pedido.hora_fim?.slice(0,5) || '?'}</small>
                                  )}
                              </div>
                              <div className="is-right">
                                  <span>Duração</span>
                                  <strong className="is-big">
                                    {detailsModal.pedido.tipo === KM_REQUEST_TYPE
                                        ? `${detailsModal.pedido.km_total ?? 0} km`
                                        : `${getDuracaoAusenciaUI(detailsModal.pedido)} dia(s) úteis`
                                    }
                                  </strong>
                              </div>
                          </div>

                          {detailsModal.pedido.tipo === KM_REQUEST_TYPE && (
                              <div className="rh-detail-box">
                                  <span>Detalhe da Deslocação</span>
                                  <div className="rh-route">
                                      <b>{detailsModal.pedido.km_origem || '-'}</b>
                                      <i>{detailsModal.pedido.km_ida_volta ? '⇄' : '→'}</i>
                                      <b>{detailsModal.pedido.km_destino || '-'}</b>
                                      {detailsModal.pedido.km_ida_volta && <span className="rh-tag is-brand">⇄ Ida e volta</span>}
                                  </div>
                              </div>
                          )}

                          {detailsModal.pedido.motivo && (
                              <div className="rh-detail-box">
                                  <span>Observações / Motivo</span>
                                  <blockquote>"{detailsModal.pedido.motivo}"</blockquote>
                              </div>
                          )}

                          {detailsModal.pedido.anexo_url && (
                              <a href={detailsModal.pedido.anexo_url} target="_blank" rel="noreferrer" className="rh-attach">
                                  <Icons.Paperclip size={16}/> Abrir Documento
                              </a>
                          )}

                          <div className="rh-detail-foot">
                              Pedido efetuado a {new Date(detailsModal.pedido.created_at).toLocaleString('pt-PT')}
                          </div>
                      </div>

                      {/* Botões de Ação Rápidos dentro do Modal */}
                      {detailsModal.pedido.estado === 'pendente' || detailsModal.pedido.estado === 'pedido_cancelamento' ? (
                          <div className="rh-modal-foot">
                              {detailsModal.pedido.estado === 'pendente' ? (
                                  <>
                                      <button type="button" onClick={() => abrirModalConfirmacao(detailsModal.pedido, 'rejeitar')} className="rh-btn is-bad-soft is-lg">
                                          <Icons.X size={18}/> Rejeitar
                                      </button>
                                      <button type="button" onClick={() => abrirModalConfirmacao(detailsModal.pedido, 'aprovar')} className="rh-btn is-ok is-lg is-grow">
                                          <Icons.Check size={18}/> {detailsModal.pedido.tipo === KM_REQUEST_TYPE ? 'Aprovar Deslocação' : 'Aprovar Ausência'}
                                      </button>
                                  </>
                              ) : (
                                  <>
                                      <button type="button" onClick={() => abrirModalConfirmacao(detailsModal.pedido, 'recusar_cancelamento')} className="rh-btn is-ghost is-lg is-grow">Manter Férias</button>
                                      <button type="button" onClick={() => abrirModalConfirmacao(detailsModal.pedido, 'aceitar_cancelamento')} className="rh-btn is-bad is-lg is-grow">Aceitar Cancelamento</button>
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
            <div className="rh-overlay">
                <div className="rh-modal is-md">
                    <div className="rh-modal-head">
                        <span className="rh-modal-ico">{isEditingAbsence ? <Icons.Edit size={20}/> : <Icons.Sun size={20}/>}</span>
                        <div className="rh-modal-title">
                            <span>{isEditingAbsence ? 'Editar' : 'Novo registo'}</span>
                            <h3>{isEditingAbsence ? 'Editar Ausência' : 'Registar Ausência'}</h3>
                        </div>
                        <button type="button" onClick={closeAbsenceModal} className="rh-modal-close" aria-label="Fechar"><Icons.X size={20}/></button>
                    </div>

                    <form onSubmit={handleSaveAbsence} className="rh-modal-form">
                        <div className="rh-modal-body">
                            <div className="rh-field">
                                <label>Colaborador</label>
                                <select required className="rh-input" value={newAbsence.user_id} onChange={e => setNewAbsence({...newAbsence, user_id: e.target.value})} disabled={isEditingAbsence || !!selectedUser}>
                                    <option value="">Selecione Colaborador...</option>
                                    {colaboradoresAtivos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>

                            <div className="rh-field">
                                <label>Motivo da Ausência</label>
                                <select className="rh-input" value={newAbsence.tipo} onChange={e => setNewAbsence({...newAbsence, tipo: e.target.value})} required>
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
                            </div>

                            {newAbsence.tipo !== KM_REQUEST_TYPE && (
                                <label className={`rh-toggle-row ${newAbsence.is_parcial ? 'is-on' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={newAbsence.is_parcial}
                                        onChange={e => setNewAbsence({...newAbsence, is_parcial: e.target.checked, data_fim: e.target.checked ? newAbsence.data_inicio : newAbsence.data_fim})}
                                    />
                                    <span className="rh-switch"><span /></span>
                                    <Icons.Clock size={18} />
                                    Ausência Parcial (Apenas algumas horas)
                                </label>
                            )}

                            {newAbsence.tipo === KM_REQUEST_TYPE ? (
                                <>
                                    <div className="rh-field">
                                        <label>Data da Deslocação</label>
                                        <input type="date" required className="rh-input" value={newAbsence.data_inicio} onChange={e=>setNewAbsence({...newAbsence, data_inicio: e.target.value, data_fim: e.target.value})}/>
                                    </div>
                                    <div className="rh-fgrid is-2">
                                        <div className="rh-field">
                                            <label>De</label>
                                            <input type="text" required className="rh-input" value={newAbsence.km_origem} onChange={e=>setNewAbsence({...newAbsence, km_origem: e.target.value})} placeholder="Ex: Portimão"/>
                                        </div>
                                        <div className="rh-field">
                                            <label>Para</label>
                                            <input type="text" required className="rh-input" value={newAbsence.km_destino} onChange={e=>setNewAbsence({...newAbsence, km_destino: e.target.value})} placeholder="Ex: Faro"/>
                                        </div>
                                    </div>
                                    <div className="rh-field">
                                        <label>Km total</label>
                                        <input type="number" min="0" step="0.1" required className="rh-input" value={newAbsence.km_total} onChange={e=>setNewAbsence({...newAbsence, km_total: e.target.value})} placeholder="Ex: 72"/>
                                    </div>
                                </>
                            ) : !newAbsence.is_parcial ? (
                                <div className="rh-fgrid is-2">
                                    <div className="rh-field">
                                        <label>Data Início</label>
                                        <input type="date" required className="rh-input" value={newAbsence.data_inicio} onChange={e=>setNewAbsence({...newAbsence, data_inicio: e.target.value})}/>
                                    </div>
                                    <div className="rh-field">
                                        <label>Data Fim</label>
                                        <input type="date" required className="rh-input" value={newAbsence.data_fim} onChange={e=>setNewAbsence({...newAbsence, data_fim: e.target.value})}/>
                                    </div>
                                </div>
                            ) : (
                                <div className="rh-fgrid is-time">
                                    <div className="rh-field">
                                        <label>Data</label>
                                        <input type="date" className="rh-input" value={newAbsence.data_inicio} onChange={e => setNewAbsence({...newAbsence, data_inicio: e.target.value, data_fim: e.target.value})} required/>
                                    </div>
                                    <div className="rh-field">
                                        <label>Saída</label>
                                        <input type="time" className="rh-input" value={newAbsence.hora_inicio} onChange={e => setNewAbsence({...newAbsence, hora_inicio: e.target.value})} required/>
                                    </div>
                                    <div className="rh-field">
                                        <label>Regresso</label>
                                        <input type="time" className="rh-input" value={newAbsence.hora_fim} onChange={e => setNewAbsence({...newAbsence, hora_fim: e.target.value})}/>
                                    </div>
                                </div>
                            )}

                            {newAbsence.tipo !== KM_REQUEST_TYPE && newAbsence.data_inicio && (
                                <div className={`rh-note ${diasUteisModal > 0 ? '' : 'is-bad'}`}>
                                    {diasUteisModal > 0 ? <Icons.Info size={16}/> : <Icons.Alert size={16}/>}
                                    <span>
                                        {diasUteisModal > 0
                                            ? (isVacationType(newAbsence.tipo)
                                                ? <>Este registo consumirá <b>{diasUteisModal} dia(s) útil(eis)</b> de férias do colaborador.</>
                                                : <>Registará <b>{diasUteisModal} dia(s) útil(eis)</b> de ausência. Tratando-se de justificação, não desconta férias.</>)
                                            : (newAbsence.is_parcial && (!newAbsence.hora_inicio || !newAbsence.hora_fim))
                                                ? `Introduza a hora de saída e regresso para calcular o desconto.`
                                                : newAbsence.is_parcial
                                                    ? `As horas inseridas não são válidas (Regresso < Saída).`
                                                    : `Atenção: O período selecionado calha num fim de semana ou feriado.`}
                                    </span>
                                </div>
                            )}
                            {newAbsence.tipo !== KM_REQUEST_TYPE && newAbsence.is_parcial && newAbsence.data_inicio && (
                                <div className="rh-note">
                                    <Icons.Info size={16}/>
                                    <span>Ausência parcial de horas. <b>Não será deduzido nenhum dia de férias ao colaborador.</b></span>
                                </div>
                            )}
                            {newAbsence.tipo === KM_REQUEST_TYPE && (
                                <div className="rh-note">
                                    <Icons.Info size={16}/>
                                    <span>Este pedido de Km's entra no fluxo de aprovação e no relatório mensal.</span>
                                </div>
                            )}

                            <div className="rh-field">
                                <label>Notas / Observações</label>
                                <input type="text" className="rh-input" placeholder="Mais detalhes (Opcional)..." value={newAbsence.motivo} onChange={e=>setNewAbsence({...newAbsence, motivo: e.target.value})}/>
                            </div>

                            <div className="rh-field">
                                <label>Anexar Documento (Atestados, PDFs - Opcional)</label>
                                {isEditingAbsence && editingAbsenceData?.anexo_url && <div className="rh-current-file"><Icons.Paperclip size={14}/> Ficheiro atual: <a href={editingAbsenceData.anexo_url} target="_blank" rel="noreferrer">Ver documento</a></div>}
                                <label className={`rh-file ${absenceFile ? 'has-file' : ''}`}>
                                    <Icons.Paperclip size={16} />
                                    <span>{absenceFile ? absenceFile.name : 'Escolher ficheiro (PDF ou imagem)'}</span>
                                    <input type="file" accept=".pdf, image/*" onChange={e => setAbsenceFile(e.target.files[0])} />
                                </label>
                            </div>
                        </div>

                        <div className="rh-modal-foot">
                            <button type="button" className="rh-btn is-ghost" onClick={closeAbsenceModal}>Cancelar</button>
                            <button type="submit" className="rh-btn is-primary is-lg" disabled={isSubmitting}>
                                <Icons.Check size={16} /> {isSubmitting ? 'A guardar...' : (isEditingAbsence ? 'Guardar Alterações' : 'Registar Ausência')}
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
              <div className="rh-overlay is-top">
                  <div className="rh-confirm">
                      {['aprovar', 'aceitar_cancelamento', 'cancelar_direto'].includes(confirmModal.acao)
                          ? <span className="rh-confirm-ico is-ok"><Icons.Check size={30}/></span>
                          : <span className="rh-confirm-ico is-bad"><Icons.X size={30}/></span>}
                      <h3>Confirmar Ação</h3>
                      <p>
                          {confirmModal.acao === 'aprovar' && <span>Tens a certeza que queres aprovar o pedido de <b>{formatAbsenceTypeLabel(confirmModal.pedido?.tipo)}</b>?</span>}
                          {confirmModal.acao === 'rejeitar' && <span>Tens a certeza que queres rejeitar este pedido?</span>}
                          {(confirmModal.acao === 'aceitar_cancelamento' || confirmModal.acao === 'cancelar_direto') && <span>Tens a certeza que queres cancelar e devolver os dias ao colaborador (se férias)?</span>}
                          {confirmModal.acao === 'recusar_cancelamento' && <span>Queres recusar o pedido de cancelamento e manter o registo aprovado?</span>}
                      </p>
                      {confirmModal.pedido?.tipo === KM_REQUEST_TYPE && confirmModal.acao === 'aprovar' && (
                          (() => {
                              const kmPedidoAtual = Number(confirmModal.pedido?.km_total || 0);
                              const valorKm = parseKmRate(valorKmReembolso);
                              const kmAprovadosMes = calcularTotalKmAprovadosNoMes(confirmModal.pedido?.user_id, confirmModal.pedido?.data_inicio, ausenciasMes);
                              const valorAprovadosMes = kmAprovadosMes * valorKm;
                              const kmTotalDepois = kmAprovadosMes + kmPedidoAtual;
                              const valorTotalDepois = kmTotalDepois * valorKm;
                              return (
                                  <div className="rh-summary">
                                      <div><span>Já aprovados:</span><b>{kmAprovadosMes.toFixed(2)} km</b></div>
                                      <div><span>Valor já aprovado:</span><b>{formatCurrency(valorAprovadosMes)}</b></div>
                                      <div><span>Pedido atual:</span><b>{kmPedidoAtual.toFixed(2)} km</b></div>
                                      <div><span>Valor €/km:</span><b>{formatCurrency(valorKm)}</b></div>
                                      <div className="is-total"><span>Total após aprovar:</span><b>{formatCurrency(valorTotalDepois)}</b></div>
                                  </div>
                              );
                          })()
                      )}
                      <div className="rh-confirm-actions">
                          <button type="button" className="rh-btn is-ghost" onClick={() => setConfirmModal({ show: false, pedido: null, acao: null })}>Voltar</button>
                          <button type="button" className={`rh-btn ${['aprovar', 'recusar_cancelamento'].includes(confirmModal.acao) ? 'is-ok' : 'is-bad'}`} onClick={executarAcaoRH}>
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
              <div className="rh-overlay is-top">
                  <div className="rh-confirm">
                      <span className="rh-confirm-ico is-brand"><Icons.Currency size={28}/></span>
                      <h3>{modalTitle}</h3>
                      <p>{modalDescription}</p>
                      <div className="rh-confirm-actions">
                          <button type="button" className="rh-btn is-ghost" onClick={() => setShowBulkSAConfirmModal(false)} disabled={isApplyingBulkSA}>Cancelar</button>
                          <button type="button" className="rh-btn is-primary" onClick={confirmarBulkUpdateSA} disabled={isApplyingBulkSA}>
                              {isApplyingBulkSA ? 'A aplicar...' : 'Confirmar'}
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {userStatusModal.show && userStatusModal.profile && (
          <ModalPortal>
              <div className="rh-overlay is-top">
                  <div className="rh-confirm">
                      <span className={`rh-confirm-ico ${userStatusModal.nextActive ? 'is-ok' : 'is-bad'}`}>
                          {userStatusModal.nextActive ? <Icons.Check size={30}/> : <Icons.Alert size={30}/>}
                      </span>
                      <h3>{userStatusModal.nextActive ? 'Reativar colaborador' : 'Confirmar desativação'}</h3>
                      <p>
                          {userStatusModal.nextActive ? (
                              <span>Tem a certeza que quer <b>reativar</b> <b>{userStatusModal.profile.nome}</b>?</span>
                          ) : (
                              <span>Tem a certeza que quer <b>desativar</b> <b>{userStatusModal.profile.nome}</b>? O registo ficará arquivado como ex-colaborador e os dados históricos mantêm-se.</span>
                          )}
                      </p>
                      <div className="rh-confirm-actions">
                          <button type="button" className="rh-btn is-ghost" onClick={closeUserStatusModal}>Cancelar</button>
                          <button type="button" className={`rh-btn ${userStatusModal.nextActive ? 'is-ok' : 'is-bad'}`} onClick={handleToggleUserActive}>
                              {userStatusModal.nextActive ? 'Reativar' : 'Desativar'}
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* Modal de Notificação */}
      {notification.show && (
          <ModalPortal>
              <div className="rh-overlay is-top" onClick={() => setNotification({ show: false, message: '', type: 'success' })}>
                  <div className="rh-confirm is-notice" onClick={(e) => e.stopPropagation()}>
                      <span className={`rh-confirm-ico ${notification.type === 'success' ? 'is-ok' : 'is-bad'}`}>
                          {notification.type === 'success' ? <Icons.Check size={30}/> : <Icons.Alert size={30}/>}
                      </span>
                      <h3>{notification.type === 'success' ? 'Sucesso!' : 'Erro'}</h3>
                      <p>{notification.message}</p>
                      <button type="button" className="rh-btn is-primary is-block" onClick={() => setNotification({ show: false, message: '', type: 'success' })}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* Modal Nova Tolerância */}
      {showToleranciaModal && (
          <ModalPortal>
              <div className="rh-overlay">
                  <div className="rh-modal is-sm">
                      <div className="rh-modal-head">
                          <span className="rh-modal-ico"><Icons.Clock size={20}/></span>
                          <div className="rh-modal-title">
                              <span>Tolerância</span>
                              <h3>Nova Tolerância de Ponto</h3>
                          </div>
                          <button type="button" onClick={() => setShowToleranciaModal(false)} className="rh-modal-close" aria-label="Fechar"><Icons.X size={20}/></button>
                      </div>
                      <form onSubmit={handleSaveTolerancia} className="rh-modal-form">
                          <div className="rh-modal-body">
                              <div className="rh-field">
                                  <label>Designação</label>
                                  <input type="text" required className="rh-input" placeholder="Ex: Véspera de Natal" value={newTolerancia.nome} onChange={e => setNewTolerancia({...newTolerancia, nome: e.target.value})}/>
                              </div>
                              <div className="rh-field">
                                  <label>Data</label>
                                  <input type="date" required className="rh-input" value={newTolerancia.data} onChange={e => setNewTolerancia({...newTolerancia, data: e.target.value})}/>
                              </div>
                              <div className="rh-field">
                                  <label>Âmbito</label>
                                  <div className="rh-choice">
                                      <button type="button" onClick={() => setNewTolerancia({...newTolerancia, tipo: 'global', user_id: ''})} className={newTolerancia.tipo === 'global' ? 'is-on' : ''}>
                                          <Icons.Users size={20}/>
                                          <strong>Global</strong>
                                          <small>Toda a empresa</small>
                                      </button>
                                      <button type="button" onClick={() => setNewTolerancia({...newTolerancia, tipo: 'individual'})} className={newTolerancia.tipo === 'individual' ? 'is-on is-green' : ''}>
                                          <Icons.User size={20}/>
                                          <strong>Individual</strong>
                                          <small>Um colaborador</small>
                                      </button>
                                  </div>
                              </div>
                              {newTolerancia.tipo === 'individual' && (
                                  <div className="rh-field">
                                      <label>Colaborador</label>
                                      <select required className="rh-input" value={newTolerancia.user_id} onChange={e => setNewTolerancia({...newTolerancia, user_id: e.target.value})}>
                                          <option value="">Selecione Colaborador...</option>
                                          {colaboradoresAtivos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                      </select>
                                  </div>
                              )}
                          </div>
                          <div className="rh-modal-foot">
                              <button type="button" className="rh-btn is-ghost" onClick={() => setShowToleranciaModal(false)}>Cancelar</button>
                              <button type="submit" className="rh-btn is-primary is-lg" disabled={isSubmittingTolerancia}>
                                  <Icons.Check size={16} /> {isSubmittingTolerancia ? 'A guardar...' : 'Guardar Tolerância'}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {showFormacaoModal && (
        <ModalPortal>
            <div className="rh-overlay">
                <div className="rh-modal is-md">
                    <div className="rh-modal-head">
                        <span className="rh-modal-ico"><Icons.FileText size={20}/></span>
                        <div className="rh-modal-title">
                            <span>Formação</span>
                            <h3>Nova Ação de Formação</h3>
                        </div>
                        <button type="button" onClick={() => setShowFormacaoModal(false)} className="rh-modal-close" aria-label="Fechar"><Icons.X size={20}/></button>
                    </div>
                    <form onSubmit={handleSaveFormacao} className="rh-modal-form">
                        <div className="rh-modal-body">
                            <div className="rh-field">
                                <label>Nome da Ação de Formação</label>
                                <input type="text" required className="rh-input" placeholder="Ex: Curso Primeiros Socorros" value={newFormacao.nome} onChange={e => setNewFormacao({...newFormacao, nome: e.target.value})}/>
                            </div>
                            <div className="rh-fgrid is-3">
                                <div className="rh-field">
                                    <label>Data Início</label>
                                    <input
                                        type="date"
                                        required
                                        className="rh-input"
                                        value={newFormacao.data_inicio}
                                        onChange={e => {
                                            const newStart = e.target.value;
                                            // Se a data de fim for anterior à nova data de início (ou estiver vazia), ajusta a de fim para ser igual à de início
                                            const newEnd = (!newFormacao.data_fim || newFormacao.data_fim < newStart) ? newStart : newFormacao.data_fim;
                                            setNewFormacao({...newFormacao, data_inicio: newStart, data_fim: newEnd});
                                        }}
                                    />
                                </div>
                                <div className="rh-field">
                                    <label>Data Fim</label>
                                    <input
                                        type="date"
                                        required
                                        className="rh-input"
                                        min={newFormacao.data_inicio}
                                        value={newFormacao.data_fim}
                                        onChange={e => setNewFormacao({...newFormacao, data_fim: e.target.value})}
                                    />
                                </div>
                                <div className="rh-field">
                                    <label>Total de Horas</label>
                                    <input type="number" min="0.5" step="0.5" required className="rh-input" placeholder="Ex: 8" value={newFormacao.total_horas} onChange={e => setNewFormacao({...newFormacao, total_horas: e.target.value})}/>
                                </div>
                            </div>

                            <div className="rh-field">
                                <label>Selecionar Colaboradores Envolvidos <em className="rh-count">{newFormacao.user_ids.length}</em></label>
                                <div className="rh-pick">
                                    <label className="rh-pick-all">
                                        <input
                                            type="checkbox"
                                            className="rh-checkbox"
                                            onChange={(e) => {
                                                if(e.target.checked) {
                                                    setNewFormacao({...newFormacao, user_ids: colaboradoresAtivos.map(c => c.id)});
                                                } else {
                                                    setNewFormacao({...newFormacao, user_ids: []});
                                                }
                                            }}
                                            checked={newFormacao.user_ids.length === colaboradoresAtivos.length && colaboradoresAtivos.length > 0}
                                        />
                                        <span>Selecionar Todos</span>
                                    </label>
                                    <div className="rh-pick-grid">
                                        {colaboradoresAtivos.map(c => (
                                            <label key={c.id} className={`rh-pick-item ${newFormacao.user_ids.includes(c.id) ? 'is-on' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={newFormacao.user_ids.includes(c.id)}
                                                    onChange={() => handleToggleUserFormacao(c.id)}
                                                />
                                                {renderRhAvatar(c.nome, c.id, 'xs', c.avatar_url)}
                                                <span>{c.nome}</span>
                                                <i className="rh-pick-check"><Icons.Check size={12} /></i>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="rh-modal-foot">
                            <button type="button" className="rh-btn is-ghost" onClick={() => setShowFormacaoModal(false)}>Cancelar</button>
                            <button type="submit" className="rh-btn is-primary is-lg" disabled={isSubmittingFormacao}>
                                <Icons.Check size={16} /> {isSubmittingFormacao ? 'A guardar...' : 'Guardar Formação'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ModalPortal>
    )}

    {/* Modal Apagar Formação */}
      {deleteFormacaoModal.show && deleteFormacaoModal.grupo && (
          <ModalPortal>
              <div className="rh-overlay is-top">
                  <div className="rh-confirm">
                      <span className="rh-confirm-ico is-bad"><Icons.Trash size={28}/></span>
                      <h3>Eliminar Formação</h3>
                      <p>Tem a certeza que deseja eliminar a formação <b>"{deleteFormacaoModal.grupo.nome}"</b>?</p>
                      <div className="rh-summary is-bad">
                          Esta ação irá remover as <b>{deleteFormacaoModal.grupo.total_horas}h</b> atribuídas a <b>{deleteFormacaoModal.grupo.participantes.length}</b> colaborador(es).
                      </div>
                      <div className="rh-confirm-actions">
                          <button type="button" className="rh-btn is-ghost" onClick={() => setDeleteFormacaoModal({show: false, grupo: null})} disabled={isSubmittingFormacao}>Cancelar</button>
                          <button type="button" className="rh-btn is-bad" onClick={confirmarDeleteFormacao} disabled={isSubmittingFormacao}>
                              {isSubmittingFormacao ? 'A eliminar...' : 'Sim, Eliminar'}
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- NOVO MODAL DE APROVAÇÃO EM MASSA COM RESUMO --- */}
      {bulkApproveModal.show && (
          <ModalPortal>
              <div className="rh-overlay is-top">
                  <div className="rh-confirm is-wide">
                      <span className="rh-confirm-ico is-ok"><Icons.Check size={30}/></span>
                      <h3>Aprovação em Massa</h3>
                      <p>Está prestes a aprovar <b>{bulkApproveModal.pedidos.length}</b> pedido(s) de {bulkApproveModal.tipo === 'kms' ? 'deslocação' : 'ausência'}.</p>

                      {/* RESUMO DINÂMICO DE KM'S COM HISTÓRICO */}
                      {bulkApproveModal.tipo === 'kms' && (() => {
                          const resumos = Object.values(
                              bulkApproveModal.pedidos.reduce((acc, p) => {
                                  const userId = p.user_id;
                                  if (!acc[userId]) {
                                      acc[userId] = {
                                          userId,
                                          nome: p.profiles?.nome || 'Desconhecido',
                                          kmsNovos: 0,
                                          kmsAprovados: calcularTotalKmAprovadosNoMes(userId, p.data_inicio, ausenciasMes)
                                      };
                                  }
                                  acc[userId].kmsNovos += (Number(p.km_total) || 0);
                                  return acc;
                              }, {})
                          );
                          const rate = parseKmRate(valorKmReembolso);
                          const totalJaAprovados = resumos.reduce((sum, resumo) => sum + (Number(resumo.kmsAprovados) || 0), 0);
                          const totalSelecionados = bulkApproveModal.pedidos.reduce((sum, p) => sum + (Number(p.km_total) || 0), 0);
                          return (
                              <div className="rh-bulk">
                                  <h4>Resumo de KM's por Colaborador:</h4>
                                  {resumos.map((resumo, index) => {
                                      const novoTotal = resumo.kmsAprovados + resumo.kmsNovos;
                                      return (
                                          <div key={index} className="rh-bulk-row">
                                              <div className="rh-bulk-top">
                                                  <span className="rh-who">{renderRhAvatar(resumo.nome, resumo.userId)}<strong>{resumo.nome}</strong></span>
                                                  <b className="is-green">+{Number(resumo.kmsNovos).toFixed(2)} km</b>
                                              </div>
                                              <div className="rh-bulk-sub">
                                                  <span>Já aprovados: <b>{Number(resumo.kmsAprovados).toFixed(2)} km</b></span>
                                                  <span>&rarr; Novo Total: <b>{Number(novoTotal).toFixed(2)} km</b></span>
                                              </div>
                                              <div className="rh-bulk-sub">
                                                  <span>Novo valor: <b>{formatCurrency(resumo.kmsNovos * rate)}</b></span>
                                                  <span>Total valor: <b>{formatCurrency(novoTotal * rate)}</b></span>
                                              </div>
                                          </div>
                                      );
                                  })}
                                  <div className="rh-summary is-flat">
                                      <div><span>Total já aprovados:</span><b>{totalJaAprovados.toFixed(2)} km</b></div>
                                      <div><span>Valor já aprovado:</span><b className="is-green">{formatCurrency(totalJaAprovados * rate)}</b></div>
                                      <div className="is-sep"><span>Total de Km's selecionados:</span><b>{Number(totalSelecionados).toFixed(2)} km</b></div>
                                      <div className="is-total"><span>Total a aprovar:</span><b>{formatCurrency(totalSelecionados * rate)}</b></div>
                                  </div>
                              </div>
                          );
                      })()}

                      <div className="rh-confirm-actions">
                          <button type="button" className="rh-btn is-ghost" onClick={() => setBulkApproveModal({ show: false, tipo: null, pedidos: [] })} disabled={isSubmitting}>Cancelar</button>
                          <button type="button" className="rh-btn is-ok" onClick={executarAprovarEmMassa} disabled={isSubmitting}>
                              {isSubmitting ? 'A aprovar...' : 'Confirmar Aprovação'}
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}
    </div>
  );
}
