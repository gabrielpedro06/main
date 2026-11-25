// =====================================================================
// Projetos (rota /dashboard/projetos) — carteira de projetos da empresa.
//
// Secções da página:
//   - Navegação "A minha carteira": por Tipo de projeto, Estado ou Programa;
//     "Só os meus" filtra pelos projetos em que o utilizador é responsável,
//     colaborador ou responsável de alguma atividade/tarefa/subtarefa.
//   - Vista Geral (portfolioView "overview"): tabela de todos os projetos com
//     filtros (tipo, programa, estado, entidade), paginação, exportação CSV/PDF
//     e os separadores "Investimento" e "Incentivo" (pedidos de reembolso por
//     mês e TXE = taxa de execução = investimento pedido / investimento do projeto).
//     Os filtros ficam em localStorage ("projetos-vista-geral-filtros").
//   - Modal de criação/edição em 5 passos: Base & Entidade, Organismo & Equipa,
//     Planeamento (datas, programa/aviso e fases), Atividades (árvore do modelo
//     do tipo de projeto, com caixas para escolher o que gerar), Finanças & Notas.
//   - Cronómetro: escolher atividade/tarefa de um projeto e iniciar um task_log.
//
// Tabelas: projetos, projeto_entidades (valores por entidade líder/parceira),
// pedidos_reembolso, programas_financiamento, avisos, clientes, tipos_projeto,
// template_atividades/_tarefas/_subtarefas, atividades, tarefas, subtarefas,
// task_logs, notificacoes_projetos, contactos_cliente.
// Documentação: docs/modulos/projetos-e-tarefas.md
// =====================================================================
import { useState, useEffect, useRef } from "react";

import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";
import { toastDesfazer } from "../utils/toast";

// Projetos apagados com "Desfazer" ainda à espera (não reaparecem se a lista recarregar)
const projetosAApagar = new Set();
import { lerCache, guardarCache } from "../utils/cachePaginas";
import PaginaSkeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { hasAttendanceStartedToday, startAttendanceNow } from "../utils/attendanceGuard";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import { concludeActivityWithChildren } from "../utils/activityStatusCascade";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./../styles/dashboard.css";
import "../styles/portfolio.css";
import { postAutenticado } from "../utils/apiAutenticada";
import { consultarNif } from "../utils/apiAutenticada";
import { clicavel } from "../utils/clicavel";

import AvisoToast from "../components/AvisoToast";
import FancySelect from "../components/FancySelect";
import { Lock, TriangleAlert } from "lucide-react";
import { registarEvento } from "../utils/registarEvento";
import Janela from "../components/Janela";
import SelectModerno from "../components/SelectModerno";
// --- ÍCONES SVG PROFISSIONAIS (SaaS Premium) ---
const Icons = {
  Grid: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>,
  Search: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  User: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Users: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Handshake: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"></path><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06 7.06l-4.28 4.28a1 1 0 0 1-1.42 0l-3-3a1 1 0 0 1-1.42 0l-3 3a1 1 0 0 1 1.42 0l3 3a1 1 0 0 1 0 1.42l-3 3a1 1 0 0 1-1.42 0l-2.5-2.5a1 1 0 1 1 3-3l3.88-3.88a3 3 0 0 1 4.24 0z"></path></svg>,
  Globe: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
  Building: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>,
  Stop: ({ size = 10, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  Play: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Folder: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  FolderOpen: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>,
  Calendar: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  ArrowRight: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  ArrowLeft: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  Inbox: ({ size = 48, color = "#cbd5e1" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>,
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Alert: ({ size = 40, color = "#ef4444" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Rocket: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  ClipboardList: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>,
  FileText: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Dollar: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  Check: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  ListTree: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const addDays = (dateStr, days) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setDate(d.getDate() + (days || 0));
    return d.toISOString().split('T')[0];
};

const getClientDisplayName = (client) => {
    if (!client) return "";
    const nome = client.marca?.trim() || "";
    const sigla = client.sigla?.trim() || "";
    if (nome && sigla) return `${nome} (${sigla})`;
    if (nome) return nome;
    if (sigla) return sigla;
    return "";
};

const normalizeIdsList = (raw) => {
    if (Array.isArray(raw)) {
        return raw
            .map((item) => String(item || "").trim())
            .filter(Boolean);
    }

    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) return [];

        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            return trimmed
                .slice(1, -1)
                .split(",")
                .map((item) => item.replace(/^"|"$/g, "").trim())
                .filter(Boolean);
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => String(item || "").trim())
                    .filter(Boolean);
            }
        } catch {
            return [];
        }
    }

    return [];
};

const normalizeBoolean = (raw) => {
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") {
        const parsed = raw.trim().toLowerCase();
        return parsed === "true" || parsed === "1" || parsed === "sim";
    }
    return Boolean(raw);
};

const createBlankProjetoFase = (index = 0) => ({
    nome: `Fase ${index + 1}`,
    prazo: "",
});

/** Normaliza prazos_fases para [{ nome, prazo }] (aceita "fase"/"data" antigos); não-arrays dão []. */
const normalizeProjetoFases = (value) => {
    if (!Array.isArray(value) || value.length === 0) return [];

    return value.map((fase, index) => ({
        // Garante que mantém o que já existe e apenas formata
        nome: String(fase?.nome || fase?.fase || `Fase ${index + 1}`).trim(),
        prazo: String(fase?.prazo || fase?.data || "").trim(),
    }));
    // REMOVE O .filter AQUI se ele estiver a apagar fases sem nome ou data
};

const getLastProjetoFaseDate = (fases) => {
    const normalized = normalizeProjetoFases(fases);
    const dates = normalized.map((fase) => fase.prazo).filter(Boolean);
    return dates.length > 0 ? dates[dates.length - 1] : "";
};

const OVERVIEW_FILTER_CACHE_KEY = "projetos-vista-geral-filtros";
const DEFAULT_OVERVIEW_SORT = { key: "entities", direction: "asc" };

const readOverviewFilterCache = () => {
    if (typeof window === "undefined") return {};
    const cached = window.localStorage.getItem(OVERVIEW_FILTER_CACHE_KEY);
    if (!cached) return {};
    try {
        const parsed = JSON.parse(cached);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

export default function Projetos() {
  const { user } = useAuth();
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const overviewFilterCache = readOverviewFilterCache();
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 5;

  const [projetos, setProjetos] = useState(() => lerCache("projetos")?.projetos || []);
  const [pedidosReembolso, setPedidosReembolso] = useState(() => lerCache("projetos")?.pedidosReembolso || []);
  const [loading, setLoading] = useState(() => !lerCache("projetos")); // com cache: mostra já e atualiza por trás
    const [programas, setProgramas] = useState(() => lerCache("projetos")?.programas || []);
    const [avisos, setAvisos] = useState(() => lerCache("projetos")?.avisos || []);
  
  const [activeLog, setActiveLog] = useState(null); 
    const [activeLogTitle, setActiveLogTitle] = useState("");
    const [activeLogRoute, setActiveLogRoute] = useState("/dashboard/projetos");
  const [notification, setNotification] = useState(null);
        const [timerSwitchModal, setTimerSwitchModal] = useState({ show: false, message: "", pendingStart: null });
        const [projectTimerModal, setProjectTimerModal] = useState({
                show: false,
                loading: false,
                project: null,
                atividades: [],
                selectedAtividadeId: "",
                selectedTaskId: ""
        });
                const [attendanceWarningModal, setAttendanceWarningModal] = useState({ show: false, message: "" });
        const [stopNoteModal, setStopNoteModal] = useState({ show: false });
        const attendancePendingActionRef = useRef(null);
  
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', confirmText: 'Confirmar', isDanger: true, onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ show: false, message: '', title: 'Aviso' });
  
  const [busca, setBusca] = useState(() => typeof overviewFilterCache.busca === "string" ? overviewFilterCache.busca : "");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(() => overviewFilterCache.mostrarConcluidos === true);
    const [viewMode, setViewMode] = useState("cards");
  const [portfolioView, setPortfolioView] = useState("mine");
  const [showOnlyMine, setShowOnlyMine] = useState(true); 
  const [showUnassignedOverviewProjects, setShowUnassignedOverviewProjects] = useState(() => overviewFilterCache.showUnassignedOverviewProjects === true);
  const [overviewSort, setOverviewSort] = useState(() => (
      overviewFilterCache.overviewSort?.key === "project" && overviewFilterCache.overviewSort?.direction === "asc"
          ? DEFAULT_OVERVIEW_SORT
          : overviewFilterCache.overviewSort?.key && overviewFilterCache.overviewSort?.direction
          ? overviewFilterCache.overviewSort
          : DEFAULT_OVERVIEW_SORT
  ));
  const [overviewTypeFilter, setOverviewTypeFilter] = useState(() => overviewFilterCache.overviewTypeFilter || "");
  const [overviewProgramFilter, setOverviewProgramFilter] = useState(() => overviewFilterCache.overviewProgramFilter || "");
  const [overviewStateFilter, setOverviewStateFilter] = useState(() => overviewFilterCache.overviewStateFilter || "");
  const [overviewEntityFilter, setOverviewEntityFilter] = useState(() => overviewFilterCache.overviewEntityFilter || "");
  const [overviewTab, setOverviewTab] = useState("overview"); // "overview" | "anual"
  const [anualYear, setAnualYear] = useState(new Date().getFullYear());
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewItemsPerPage, setOverviewItemsPerPage] = useState(10);
  const [orcamentos, setOrcamentos] = useState({}); // { [entidadeId]: { investimento, incentivo } }
  const [projetoEntidades, setProjetoEntidades] = useState(() => lerCache("projetos")?.projetoEntidades || []);
  const [hideEmptyProjects, setHideEmptyProjects] = useState(false);

  useEffect(() => {
      setOverviewPage(1);
  }, [overviewTypeFilter, overviewProgramFilter, overviewStateFilter, overviewEntityFilter, overviewSort, showUnassignedOverviewProjects, overviewItemsPerPage, overviewTab, hideEmptyProjects, anualYear]);
  const [menuPrincipal, setMenuPrincipal] = useState("tipo");
  const [selectedCategoria, setSelectedCategoria] = useState(null); 
  const [selectedEstado, setSelectedEstado] = useState(null); 
  const [selectedProgramaNav, setSelectedProgramaNav] = useState(null);
  const [clientes, setClientes] = useState(() => lerCache("projetos")?.clientes || []);
  const [tipos, setTipos] = useState(() => lerCache("projetos")?.tipos || []);
  const [staff, setStaff] = useState(() => lerCache("projetos")?.staff || []); 
    const [entidadePessoas, setEntidadePessoas] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");
    const [parceiroSelecionado, setParceiroSelecionado] = useState("");
    const [quickOrganismoModal, setQuickOrganismoModal] = useState({ show: false, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });
    // Para onde vai a entidade criada no modal rápido: "lider" (passo 1), "parceiro" (passo 1) ou "organismo" (passo 2)
    const [quickPapel, setQuickPapel] = useState("organismo");
    // Modais rápidos do passo 3 (criar programa / aviso sem sair do wizard)
    const [quickPrograma, setQuickPrograma] = useState(null); // { codigo, nome, avisoCodigo, isSubmitting }
    const [quickAviso, setQuickAviso] = useState(null);       // { codigo, fases: [{ nome, prazo }], isSubmitting }

  const [isSubmitting, setIsSubmitting] = useState(false);

  // States para a Preview de Atividades
  const [templateTree, setTemplateTree] = useState([]);
  const [templateSelection, setTemplateSelection] = useState({});

  const initialForm = {
    titulo: "", descricao: "", 
    cliente_id: "", cliente_texto: "", 
    is_parceria: false, parceiros_ids: [],
    has_organismo: false, organismo_id: "", organismo_contacto_id: "",
    tipo_projeto_id: "",
    responsavel_id: "", colaboradores: [],
    estado: "pendente", data_inicio: "", data_fim: "",
        observacoes: "", programa: "", aviso: "", codigo_projeto: "", numero_projeto: "",
        programa_id: "", aviso_id: "", prazos_fases: [],
    investimento: 0, incentivo: 0
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
      window.localStorage.setItem(OVERVIEW_FILTER_CACHE_KEY, JSON.stringify({
          busca,
          mostrarConcluidos,
          showUnassignedOverviewProjects,
          overviewSort,
          overviewTypeFilter,
          overviewProgramFilter,
          overviewStateFilter,
          overviewEntityFilter
      }));
  }, [busca, mostrarConcluidos, showUnassignedOverviewProjects, overviewSort, overviewTypeFilter, overviewProgramFilter, overviewStateFilter, overviewEntityFilter]);
        
  const isLocalHost = (hostname) => {
      const normalized = String(hostname || "").toLowerCase();
      return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
  };

  const getProjectNotificationsApiBase = () => {
      const rawBase = import.meta.env.VITE_PROJECT_NOTIFICATIONS_API_BASE || import.meta.env.VITE_MARKETING_API_BASE || "";
      const trimmed = String(rawBase || "").trim().replace(/\/+$/, "");

      if (trimmed) return trimmed;

      if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
          return null;
      }

      return "";
  };

  const getProjectUrl = (projectId) => {
    // Domínio onde a app está aberta (ex.: bizincenter.pt); a app usa HashRouter → /#/
    return `${window.location.origin}/#/dashboard/projetos/${projectId}`;
    };

  /**
   * Avisa o responsável de um projeto novo: cria linha em notificacoes_projetos
   * (sino da app) e pede ao servidor o email (/api/notificacoes/projeto-criado).
   * Em localhost sem VITE_PROJECT_NOTIFICATIONS_API_BASE o email não é enviado.
   */
  const notifyProjectCreated = async (project, responsibleId) => {
      if (!project?.id || !responsibleId) return;

      const responsibleProfile = (staff || []).find((s) => String(s.id) === String(responsibleId)) || null;
      const responsibleEmail = responsibleProfile?.email || null;
      const responsibleName = responsibleProfile?.nome || responsibleProfile?.email || "Responsável";
      const clientRecord = (clientes || []).find((client) => String(client.id) === String(project.cliente_id)) || null;
      const clientName = getClientDisplayName(clientRecord) || project.cliente_texto || "";
      const projectUrl = getProjectUrl(project.id);

      const notificationPayload = {
          user_id: responsibleId,
          project_id: project.id,
          created_by: user?.id || null,
          tipo: "project_created",
          titulo: `Novo projeto atribuído: ${project.titulo}`,
          mensagem: clientName
              ? `Foi criado o projeto "${project.titulo}" para ${clientName}.`
              : `Foi criado o projeto "${project.titulo}".`,
          link: projectUrl,
          is_read: false,
      };

      const { error: notificationError } = await supabase.from("notificacoes_projetos").insert([notificationPayload]);
      if (notificationError) {
          console.error("Erro ao criar notificação do projeto:", notificationError);
      }

      if (responsibleEmail) {
          try {
              const apiBase = getProjectNotificationsApiBase();
              if (apiBase === null) {
                  console.info("Envio de email de notificação de projeto desativado neste ambiente.");
              } else {
                  await postAutenticado(`${apiBase}/api/notificacoes/projeto-criado`, {
                      email: responsibleEmail,
                      projectTitle: project.titulo,
                      projectUrl,
                      responsibleName,
                      clientName,
                  });
              }
          } catch (emailError) {
              console.error("Erro ao enviar email do novo projeto:", emailError);
          }
      }

      window.dispatchEvent(new CustomEvent("project-notifications-updated"));
  };

  /**
   * Grava projeto_entidades: cliente principal = "lider", parceiros = "parceiro".
   * Com uma só entidade usa o investimento/incentivo do projeto; com várias usa
   * os valores por entidade (estado "orcamentos"). Apaga entidades que saíram.
   */
  const syncProjetoEntidades = async (projetoId, payload) => {
    const lider = String(payload.cliente_id);
    const ids = [...new Set([lider, ...(payload.parceiros_ids || []).map(String)])];
    const rows = ids.map((id) => ({
        projeto_id: projetoId,
        entidade_id: id,
        papel: id === lider ? "lider" : "parceiro",
        investimento: ids.length === 1 ? Number(payload.investimento) || 0 : Number(orcamentos[id]?.investimento) || 0,
        incentivo: ids.length === 1 ? Number(payload.incentivo) || 0 : Number(orcamentos[id]?.incentivo) || 0,
    }));
    const { error } = await supabase.from("projeto_entidades").upsert(rows, { onConflict: "projeto_id,entidade_id" });
    if (error) throw error;
    await supabase.from("projeto_entidades").delete()
        .eq("projeto_id", projetoId).not("entidade_id", "in", `(${ids.join(",")})`);
    };

  useEffect(() => {
        // Se o aviso mudar, atualiza as fases de acordo
        if (form.avisos_ids) {
            const avisoSelecionado = avisos.find(a => String(a.id) === String(form.avisos_ids));
            
            if (avisoSelecionado?.fases) {
                setForm(prev => ({
                    ...prev,
                    prazos_fases: normalizeProjetoFases(avisoSelecionado.fases)
                }));
            }
        }
    }, [form.avisos_ids, avisos]);

  useEffect(() => {
      if (!showModal && quickOrganismoModal.show) {
          closeQuickOrganismoModal();
      }
      if (!showModal) { setQuickPrograma(null); setQuickAviso(null); }
  }, [showModal]);

  useEffect(() => {
    fetchData();
    checkActiveLog();
  }, [user]);

    const getProgramaById = (programaId) => programas.find((programa) => String(programa.id) === String(programaId)) || null;
    const getAvisoById = (avisoId) => avisos.find((aviso) => String(aviso.id) === String(avisoId)) || null;
    const normalizeCode = (v) => String(v || "").trim().toLowerCase();
    /**
     * Descobre o aviso de um programa: primeiro pelo id (programa.avisos_ids),
     * depois por correspondência aproximada do código/nome (dados antigos).
     */
    const getAvisoForPrograma = (programa) => {
      if (!programa) return null;

      // Prefer explicit FK
      if (programa.avisos_ids) {
          const byId = getAvisoById(programa.avisos_ids);
          if (byId) return byId;
      }

      // Try several textual fields (legacy data may store aviso code in different props)
      const raw = String(programa.aviso || programa.aviso_codigo || programa.codigo || "").trim();
      if (!raw) return null;
      const codigo = raw.toLowerCase();

      // Exact normalized match
      let found = avisos.find((av) => normalizeCode(av.codigo) === codigo);
      if (found) return found;

      // Partial/contains match (tolerate prefixes/suffixes)
      found = avisos.find((av) => normalizeCode(av.codigo).includes(codigo) || codigo.includes(normalizeCode(av.codigo)));
      if (found) return found;

      // Try matching by aviso name as a last resort
      found = avisos.find((av) => normalizeCode(av.nome).includes(codigo) || codigo.includes(normalizeCode(av.nome)));
      if (found) return found;

      return null;
    };

    // Fetch a single aviso from server by id and add to local cache
    const fetchAvisoFromServer = async (avisoId) => {
        if (!avisoId) return null;
        try {
            const { data, error } = await supabase.from('avisos').select('*').eq('id', avisoId).maybeSingle();
            if (error) {
                console.error('Erro ao buscar aviso por id:', avisoId, error);
                return null;
            }
            if (data) {
                setAvisos((prev) => {
                    const exists = prev.find(a => String(a.id) === String(data.id));
                    if (exists) return prev;
                    return [data, ...prev];
                });
            }
            return data || null;
        } catch (e) {
            console.error('Exceção ao buscar aviso por id:', avisoId, e);
            return null;
        }
    };

  useEffect(() => {
      let cancelled = false;

      const resolveActiveTitle = async () => {
          if (!activeLog) {
              if (!cancelled) {
                  setActiveLogTitle("");
                  setActiveLogRoute("/dashboard/projetos");
              }
              return;
          }

          const timerMeta = await resolveActiveTimerMeta(supabase, activeLog);
          if (cancelled) return;

          setActiveLogTitle(timerMeta.title || "Projeto em curso");
          setActiveLogRoute(timerMeta.route || "/dashboard/projetos");
      };

      resolveActiveTitle();

      return () => {
          cancelled = true;
      };
  }, [activeLog]);

    // Efeito para abrir modal com dados pré-preenchidos vindos de outra página
    useEffect(() => {
        if (location.state?.openModal) {
            if (location.state.prefillData) {
                const prefill = location.state.prefillData;
                setForm({ 
                    ...initialForm, 
                    ...prefill,
                    is_parceria: normalizeBoolean(prefill.is_parceria),
                    parceiros_ids: normalizeIdsList(prefill.parceiros_ids),
                    colaboradores: normalizeIdsList(prefill.colaboradores),
                    organismo_contacto_id: prefill.organismo_contacto_id || "",
                    data_inicio: prefill.data_inicio || new Date().toISOString().split('T')[0]
                });
            } else if (location.state.prefillClienteId) {
                setForm({ 
                    ...initialForm, 
                    cliente_id: location.state.prefillClienteId 
                });
            }
            setEditId(null);
            setIsViewOnly(false);
            setActiveTab("geral");
            setCurrentStep(1);
            setOrcamentos({});
            setShowModal(true); 
            // Limpa para não repetir ao atualizar a página
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    // Efeito para carregar a árvore de atividades quando selecionamos um Tipo de Projeto
    useEffect(() => {
            if (!editId && form.tipo_projeto_id) {
                    loadTemplateData(form.tipo_projeto_id);
      } else {
          setTemplateTree([]);
          setTemplateSelection({});
      }
  }, [form.tipo_projeto_id, editId]);

  useEffect(() => {
      if (location.state?.openNewProjectModal && location.state?.prefillClienteId) {
          setForm({ 
              ...initialForm, 
              cliente_id: location.state.prefillClienteId,
              data_inicio: new Date().toISOString().split('T')[0] 
          });
          setEditId(null);
          setIsViewOnly(false);
          setActiveTab("geral");
          setCurrentStep(1);
          setOrcamentos({});
          setShowModal(true); 
          
          navigate(location.pathname, { replace: true, state: {} });
      }
  }, [location.state, navigate]);

  useEffect(() => {
      if (!showModal) {
          setEntidadePessoas([]);
          return;
      }

      const targetClientIds = [
          ...(form.cliente_id ? [String(form.cliente_id)] : []),
          ...((form.parceiros_ids || []).map((id) => String(id)) || []),
          ...(form.has_organismo && form.organismo_id ? [String(form.organismo_id)] : [])
      ];
      const uniqueClientIds = [...new Set(targetClientIds.filter(Boolean))];

      if (uniqueClientIds.length === 0) {
          setEntidadePessoas([]);
          return;
      }

      let cancelled = false;
      (async () => {
          const { data } = await supabase
              .from("contactos_cliente")
              .select("id, cliente_id, nome_contacto, cargo, email, clientes(marca, sigla)")
              .in("cliente_id", uniqueClientIds)
              .order("nome_contacto", { ascending: true });
          if (!cancelled) setEntidadePessoas(data || []);
      })();

      return () => { cancelled = true; };
  }, [showModal, form.cliente_id, form.parceiros_ids, form.has_organismo, form.organismo_id]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3500);
  };

  /**
   * Carrega a árvore modelo (template_atividades > tarefas > subtarefas) do tipo
   * de projeto para o passo 4 do modal. Por omissão fica tudo selecionado;
   * as chaves de seleção são "a_<id>", "t_<id>" e "s_<id>".
   */
  async function loadTemplateData(tipoId) {
      try {
          const { data: ativs } = await supabase.from("template_atividades").select("*").eq("tipo_projeto_id", tipoId).order("ordem");
          if (!ativs || ativs.length === 0) {
              setTemplateTree([]); return;
          }

          const { data: tars } = await supabase.from("template_tarefas").select("*").in("template_atividade_id", ativs.map(a => a.id)).order("ordem");
          
          let subs = [];
          if (tars && tars.length > 0) {
             const res = await supabase.from("template_subtarefas").select("*").in("template_tarefa_id", tars.map(t => t.id)).order("ordem");
             subs = res.data || [];
          }

          const tree = ativs.map(a => ({
              ...a,
              tarefas: (tars || []).filter(t => t.template_atividade_id === a.id).map(t => ({
                  ...t,
                  subtarefas: (subs || []).filter(s => s.template_tarefa_id === t.id)
              }))
          }));
          
          setTemplateTree(tree);

          // By default, select everything
          const sel = {};
          ativs.forEach(a => sel[`a_${a.id}`] = true);
          (tars || []).forEach(t => sel[`t_${t.id}`] = true);
          (subs || []).forEach(s => sel[`s_${s.id}`] = true);
          setTemplateSelection(sel);

      } catch (err) {
          console.error("Erro ao carregar templates", err);
      }
  }

  // Adiciona esta função ao teu componente se precisares de filtrar múltiplos avisos
  const getAvisosForPrograma = (programa) => {
      if (!programa) return [];
      
      // Ajusta conforme a estrutura da tua BD (ex: se avisos_ids for um array)
      if (Array.isArray(programa.avisos_ids)) {
          return avisos.filter(a => programa.avisos_ids.includes(a.id));
      }
      
      // Fallback para string ou campo único
      const avisoUnico = getAvisoForPrograma(programa);
      return avisoUnico ? [avisoUnico] : [];
  };

  const toggleTemplateSelection = (type, id) => {
      setTemplateSelection(prev => ({ ...prev, [`${type}_${id}`]: !prev[`${type}_${id}`] }));
  };

  /**
   * Carrega tudo o que a página precisa (projetos com atividades/tarefas para o
   * filtro "Só os meus", pedidos de reembolso, projeto_entidades, programas,
   * avisos, clientes, tipos e equipa). Chamado no arranque e depois de gravar.
   */
  async function fetchData() {
    // Stale-while-revalidate: se já há dados em cache, ficam no ecrã enquanto se atualiza
    if (!lerCache("projetos")) setLoading(true);
    const { data: projData, error } = await supabase
      .from("projetos")
      .select(`
          *, 
          clientes!cliente_id ( marca, sigla ), 
          tipos_projeto ( nome ), 
          profiles ( nome, email ),
          atividades ( 
              responsavel_id, 
              tarefas ( 
                  responsavel_id, 
                  subtarefas ( responsavel_id ) 
              ) 
          )
      `)
      .order("created_at", { ascending: false });

    if (error) console.error("Erro no fetch:", error);
    else setProjetos((projData || []).filter((p) => !projetosAApagar.has(p.id)));

    const { data: pedidosReembolsoData, error: pedidosReembolsoError } = await supabase
        .from("pedidos_reembolso")
        .select("id, projeto_id, entidade_id, data_pedido, valor_investimento, valor_incentivo")
        .order("data_pedido", { ascending: false });
    if (pedidosReembolsoError) {
        console.error("Erro ao carregar pedidos de reembolso para a vista geral:", pedidosReembolsoError);
        setPedidosReembolso([]);
    } else {
        setPedidosReembolso(pedidosReembolsoData || []);
    }

    const { data: peData } = await supabase.from("projeto_entidades").select("projeto_id, entidade_id, papel, investimento, incentivo");
        setProjetoEntidades(peData || []);

        // Load programas normally
        const { data: programasData, error: programasError } = await supabase
            .from("programas_financiamento")
            .select("id, codigo, nome, aviso, avisos_ids, ativo")
            .order("codigo", { ascending: true });
        if (programasError) console.error('Erro ao buscar programas:', programasError);
        setProgramas(programasData || []);

        // Load avisos robustly using select('*') to avoid column-mismatch errors
        let avisosData = null;
        try {
            const { data, error } = await supabase.from("avisos").select("*").order("codigo", { ascending: true });
            if (error) throw error;
            avisosData = data || [];
        } catch (errAvisos) {
            console.error('Erro ao buscar avisos com select(*):', errAvisos);
            // As a last resort, try a minimal select to at least get ids/codigo
            try {
                const { data: dataFallback, error: errFallback } = await supabase.from("avisos").select("id, codigo, ativo").order("codigo", { ascending: true });
                if (errFallback) throw errFallback;
                avisosData = dataFallback || [];
                console.warn('Avisos carregados com fallback mínimo (id,codigo,ativo).');
            } catch (err2) {
                console.error('Erro ao buscar avisos (fallback mínimo):', err2);
                avisosData = [];
            }
        }

        setAvisos(avisosData || []);

        // debug logs removed

    const { data: cliData } = await supabase.from("clientes").select("id, marca, sigla, eh_organismo").order("marca");
    setClientes(cliData || []);

    const { data: tipoData } = await supabase.from("tipos_projeto").select("id, nome, eh_formacao").order("nome");
        setTipos(tipoData || []); 

    const { data: staffData } = await supabase.from("profiles").select("id, nome, email, ativo").order("nome");
    setStaff(staffData || []);

    if (!error) {
        guardarCache("projetos", {
            projetos: projData || [],
            pedidosReembolso: pedidosReembolsoError ? [] : (pedidosReembolsoData || []),
            projetoEntidades: peData || [],
            programas: programasData || [],
            avisos: avisosData || [],
            clientes: cliData || [],
            tipos: tipoData || [],
            staff: staffData || [],
        });
    }
    setLoading(false);
  }

  /** Procura o cronómetro aberto do utilizador (task_logs com end_time nulo). */
  async function checkActiveLog() {
    if(!user?.id) return;
    const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
        setActiveLog(data || null);
  }

    /**
     * Fecha um task_log: end_time = agora e duration_minutes (mínimo 1).
     * Se a coluna observacoes falhar, tenta de novo sem a nota.
     * @returns {Promise<number|null>} minutos registados, ou null em erro
     */
    async function stopLogById(logToStop, stopNote = "") {
        if (!logToStop) return null;
        const diffMins = Math.max(1, Math.floor((new Date() - new Date(logToStop.start_time)) / 60000));
        const stopTimestamp = new Date().toISOString();
        const note = typeof stopNote === "string" ? stopNote.trim() : "";
        const payload = { end_time: stopTimestamp, duration_minutes: diffMins };
        if (note) payload.observacoes = note;

        let { error } = await supabase
            .from("task_logs")
            .update(payload)
            .eq("id", logToStop.id);

        if (error && note) {
            const retry = await supabase
                .from("task_logs")
                .update({ end_time: stopTimestamp, duration_minutes: diffMins })
                .eq("id", logToStop.id);
            error = retry.error;
        }

        if (error) {
            showToast("Erro ao terminar o cronómetro atual.", "error");
            return null;
        }

        return diffMins;
    }

    async function getActiveLogLabel() {
        if (!activeLog) return "atividade em curso";

        if (activeLog.projeto_id) {
            const proj = projetos.find(p => p.id === activeLog.projeto_id);
            if (proj?.titulo) return `projeto \"${proj.titulo}\"`;
        }

        if (activeLog.task_id || activeLog.tarefa_id) {
            const taskId = activeLog.task_id || activeLog.tarefa_id;
            const { data } = await supabase.from("tarefas").select("titulo").eq("id", taskId).maybeSingle();
            if (data?.titulo) return `tarefa \"${data.titulo}\"`;
        }

        if (activeLog.atividade_id) {
            const { data } = await supabase.from("atividades").select("titulo").eq("id", activeLog.atividade_id).maybeSingle();
            if (data?.titulo) return `atividade \"${data.titulo}\"`;
        }

        return "atividade em curso";
    }

    function closeProjectTimerModal() {
        setProjectTimerModal({
            show: false,
            loading: false,
            project: null,
            atividades: [],
            selectedAtividadeId: "",
            selectedTaskId: ""
        });
    }

    /**
     * Abre o modal para escolher em que atividade/tarefa do projeto arrancar o
     * cronómetro. Projetos encerrados ou cancelados não aceitam cronómetro.
     */
    async function openProjectTimerModal(e, proj) {
        if (e?.stopPropagation) e.stopPropagation();
        if (!proj?.id || proj.estado === "encerrado" || proj.estado === "cancelado") {
            showToast("Projeto encerrado ou cancelado. Não é possível iniciar cronómetro.", "warning");
            return;
        }

        setProjectTimerModal({
            show: true,
            loading: true,
            project: proj,
            atividades: [],
            selectedAtividadeId: "",
            selectedTaskId: ""
        });

        const { data, error } = await supabase
            .from("atividades")
            .select("id, titulo, estado, ordem, created_at, tarefas(id, titulo, estado, ordem, created_at)")
            .eq("projeto_id", proj.id)
            .order("ordem", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) {
            showToast("Erro ao carregar atividades do projeto.", "error");
            setProjectTimerModal((prev) => ({ ...prev, loading: false }));
            return;
        }

        const atividadesOrdenadas = (data || []).map((atividade) => ({
            ...atividade,
            tarefas: [...(atividade.tarefas || [])].sort((a, b) => {
                if (a.ordem != null && b.ordem != null && a.ordem !== b.ordem) return a.ordem - b.ordem;
                const da = a.created_at ? new Date(a.created_at).getTime() : 0;
                const db = b.created_at ? new Date(b.created_at).getTime() : 0;
                return da - db;
            })
        }));

        const atividadeInicial = atividadesOrdenadas.find((a) => a.estado !== "concluido") || atividadesOrdenadas[0] || null;

        setProjectTimerModal((prev) => ({
            ...prev,
            loading: false,
            atividades: atividadesOrdenadas,
            selectedAtividadeId: atividadeInicial?.id || "",
            selectedTaskId: ""
        }));
    }

    /** Cria o task_log (sempre com projeto_id + task_id ou atividade_id). */
    async function startProjectDirect(startPayload) {
        if (!startPayload?.projectId || !startPayload?.targetType || !startPayload?.targetId) return;

        const insertPayload = {
            user_id: user.id,
            projeto_id: startPayload.projectId,
            start_time: new Date().toISOString()
        };

        if (startPayload.targetType === "task") insertPayload.task_id = startPayload.targetId;
        else insertPayload.atividade_id = startPayload.targetId;

        const { data, error } = await supabase
            .from("task_logs")
            .insert([insertPayload])
            .select()
            .single();
        if (!error) { setActiveLog(data); showToast("Cronómetro iniciado!"); }
    }

    /**
     * Valida a escolha do modal (item não concluído, não é o cronómetro atual).
     * Se já houver outro cronómetro aberto pede confirmação para o trocar
     * (TimerSwitchModal); antes de arrancar verifica a picagem de ponto.
     */
    async function handleStartFromProjectSelection() {
        if (projectTimerModal.project?.estado === "encerrado" || projectTimerModal.project?.estado === "cancelado") {
            showToast("Projeto encerrado ou cancelado. Não é possível iniciar cronómetro.", "warning");
            return;
        }

        const atividadeSelecionada = projectTimerModal.atividades.find(
            (atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId)
        );

        if (!atividadeSelecionada) {
            showToast("Escolhe uma atividade para iniciar o cronómetro.", "warning");
            return;
        }

        const tarefaSelecionada = (atividadeSelecionada.tarefas || []).find(
            (tarefa) => String(tarefa.id) === String(projectTimerModal.selectedTaskId)
        );

        if (tarefaSelecionada?.estado === "concluido") {
            showToast("A tarefa selecionada está concluída.", "warning");
            return;
        }

        if (!tarefaSelecionada && atividadeSelecionada.estado === "concluido") {
            showToast("A atividade selecionada está concluída.", "warning");
            return;
        }

        const pendingStart = {
            projectId: projectTimerModal.project.id,
            targetType: tarefaSelecionada ? "task" : "activity",
            targetId: tarefaSelecionada?.id || atividadeSelecionada.id,
            label: tarefaSelecionada?.titulo || atividadeSelecionada.titulo || "item"
        };

        const isSameTarget =
            (pendingStart.targetType === "task" && String(activeLog?.task_id || "") === String(pendingStart.targetId)) ||
            (pendingStart.targetType === "activity" && String(activeLog?.atividade_id || "") === String(pendingStart.targetId));

        if (isSameTarget) {
            showToast("Esse cronómetro já está em execução.", "info");
            return;
        }

        if (activeLog) {
            const atual = await getActiveLogLabel();
            setTimerSwitchModal({
                show: true,
                message: `Deseja terminar ${atual} para iniciar "${pendingStart.label}"?`,
                pendingStart
            });
            return;
        }

        await runActionWithAttendanceWarning(() => startProjectDirect(pendingStart));
        closeProjectTimerModal();
    }

    /**
     * Corre a ação se o utilizador já picou o ponto hoje; senão pergunta se quer
     * picar agora (a ação corre na mesma, com ou sem picagem).
     */
    async function runActionWithAttendanceWarning(actionFn) {
        const hasStarted = await hasAttendanceStartedToday(supabase, user?.id);
        if (hasStarted) {
            await actionFn();
            return;
        }

        attendancePendingActionRef.current = actionFn;
        setAttendanceWarningModal({
            show: true,
            message: "Ainda não iniciaste a picagem de ponto de hoje. Queres iniciar agora?"
        });
    }

    async function handleAttendanceWarningChoice(shouldStartAttendance) {
        const pendingAction = attendancePendingActionRef.current;
        attendancePendingActionRef.current = null;
        setAttendanceWarningModal({ show: false, message: "" });

        if (shouldStartAttendance) {
            const started = await startAttendanceNow(supabase, user?.id);
            if (started) showToast("Picagem iniciada com sucesso.", "success");
            else showToast("Não foi possível iniciar a picagem agora. O cronómetro será iniciado na mesma.", "warning");
        }

        if (pendingAction) await pendingAction();
    }

    async function confirmTimerSwitch() {
        const nextStart = timerSwitchModal.pendingStart;
        setTimerSwitchModal({ show: false, message: "", pendingStart: null });
        if (!nextStart) return;

        const mins = await stopLogById(activeLog);
        if (mins === null) return;

        showToast(`Cronómetro anterior terminado (${mins} min).`, "success");
        await runActionWithAttendanceWarning(() => startProjectDirect(nextStart));
        closeProjectTimerModal();
    }

    function cancelTimerSwitch() {
        setTimerSwitchModal({ show: false, message: "", pendingStart: null });
        showToast("Mantivemos o cronómetro atual em execução.", "info");
    }

      function getStopCompleteLabel(logEntry) {
          if (logEntry?.projeto_id) return "Marcar projeto como concluido";
          if (logEntry?.atividade_id) return "Marcar atividade como concluida";
          if (logEntry?.task_id) return "Marcar tarefa como concluida";
          return "Marcar item como concluido";
      }

      /**
       * "Parar e concluir": marca como concluído o item do cronómetro.
       * Atenção: aqui o projeto é verificado primeiro e os logs criados nesta página
       * têm sempre projeto_id, por isso conclui o PROJETO (ao contrário das outras
       * páginas, que concluem primeiro a tarefa/atividade).
       */
      async function completeLogItem(logEntry) {
          if (!logEntry) return;

          if (logEntry.projeto_id) {
              await supabase.from("projetos").update({ estado: "concluido" }).eq("id", logEntry.projeto_id);
              return;
          }

          if (logEntry.atividade_id) {
              await concludeActivityWithChildren(supabase, logEntry.atividade_id);
              return;
          }

          if (logEntry.task_id) {
              await supabase
                  .from("tarefas")
                  .update({ estado: "concluido", data_conclusao: new Date().toISOString() })
                  .eq("id", logEntry.task_id);
          }
      }

  async function handleStartProjeto(e, proj) {
        openProjectTimerModal(e, proj);
  }

    function handleStopLog(e) {
        if (e) e.stopPropagation();
        if (!activeLog) return;
        setStopNoteModal({ show: true });
    }

    function closeStopNoteModal() {
        setStopNoteModal({ show: false });
    }

    /**
     * Para o cronómetro com a nota do StopTimerNoteModal, aplica o novo estado
     * escolhido (applyStopStatusUpdateForLogTarget, inclui o encaminhamento
     * "em análise") e, se pedido, conclui o item.
     */
    async function finalizeStopWithNote(note, shouldComplete, statusMeta = {}) {
        if (!activeLog) return;

        const logToStop = activeLog;
        const mins = await stopLogById(logToStop, note);
        if (mins === null) return;

        await applyStopStatusUpdateForLogTarget(supabase, logToStop, statusMeta);
        if (shouldComplete) await completeLogItem(logToStop);

        setActiveLog(null);
        showToast(shouldComplete ? `Tempo registado: ${mins} min. Item concluido.` : `Tempo registado: ${mins} min.`);
        fetchData();
    }

    async function confirmStopWithNote(note, shouldComplete, statusMeta) {
        setStopNoteModal({ show: false });
        if (!activeLog) return;

        if (shouldComplete) {
            await runActionWithAttendanceWarning(() => finalizeStopWithNote(note, shouldComplete, statusMeta));
            return;
        }

        await finalizeStopWithNote(note, shouldComplete, statusMeta);
    }

  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
        setParceiroSelecionado("");
    setForm({ 
        ...initialForm, 
        tipo_projeto_id: (selectedCategoria && selectedCategoria !== 'sem-categoria') ? selectedCategoria : "", 
        estado: selectedEstado || initialForm.estado,
                data_inicio: new Date().toISOString().split('T')[0],
                prazos_fases: [] 
    });
    setActiveTab("geral"); 
    setCurrentStep(1);
    setShowModal(true);
    setOrcamentos({});
  }

    async function handleEdit(e, proj) {
        e.stopPropagation();
        const { data: pe } = await supabase
            .from("projeto_entidades").select("entidade_id, investimento, incentivo").eq("projeto_id", proj.id);
        const map = {};
        (pe || []).forEach((r) => { map[String(r.entidade_id)] = { investimento: Number(r.investimento) || 0, incentivo: Number(r.incentivo) || 0 }; });
        setOrcamentos(map);
    setEditId(proj.id); setIsViewOnly(false);
        setParceiroSelecionado("");
    const matchedPrograma = programas.find((programa) =>
        String(programa.id) === String(proj.programa_id || "") ||
        String(programa.codigo || "").trim() === String(proj.programa || "").trim() ||
        String(programa.nome || "").trim() === String(proj.programa || "").trim()
    ) || null;
      const matchedAviso = avisos.find((aviso) =>
        String(aviso.id) === String(proj.avisos_ids || proj.aviso_id || "") ||
        String(aviso.codigo || "").trim() === String(proj.aviso || "").trim()
    ) || null;
    const avisoBase = matchedAviso || getAvisoForPrograma(matchedPrograma);
    const projetoFases = normalizeProjetoFases(proj.prazos_fases || avisoBase?.fases || []);
    setForm({
        titulo: proj.titulo || "", descricao: proj.descricao || "", 
        cliente_id: proj.cliente_id || "", cliente_texto: proj.cliente_texto || "",
        is_parceria: normalizeBoolean(proj.is_parceria), parceiros_ids: normalizeIdsList(proj.parceiros_ids),
        has_organismo: !!proj.organismo_id,
        organismo_id: proj.organismo_id || "",
        organismo_contacto_id: proj.organismo_contacto_id || "",
        tipo_projeto_id: proj.tipo_projeto_id || "", 
        responsavel_id: proj.responsavel_id || "", colaboradores: normalizeIdsList(proj.colaboradores),
        estado: proj.estado || "pendente", data_inicio: proj.data_inicio || "",
        data_fim: proj.data_fim || "", observacoes: proj.observacoes || "",
        programa: proj.programa || matchedPrograma?.nome || "", aviso: proj.aviso || matchedAviso?.codigo || avisoBase?.codigo || "",
        programa_id: matchedPrograma?.id || proj.programa_id || "",
        aviso_id: matchedAviso?.id || proj.aviso_id || avisoBase?.id || "",
        avisos_ids: matchedAviso?.id || proj.avisos_ids || proj.aviso_id || avisoBase?.id || "",
        prazos_fases: projetoFases,
        codigo_projeto: proj.codigo_projeto || "", numero_projeto: proj.numero_projeto || "", investimento: proj.investimento || 0, incentivo: proj.incentivo || 0
    });
    setActiveTab("geral");
    setCurrentStep(1);
    setShowModal(true);
  }

  /** Apaga o projeto (só a linha de projetos; falha se a BD tiver filhos que o impeçam). */
  function askDeleteProjeto(e, id, titulo) {
      e.stopPropagation();
      setConfirmDialog({
          show: true,
          message: `Tens a certeza que queres apagar o projeto "${titulo}"?\nApaga também as atividades e os tempos associados. Depois de confirmares, tens uns segundos para carregar em Desfazer.`,
          confirmText: "Sim, Apagar",
          isDanger: true,
          onConfirm: async () => {
              setConfirmDialog({ show: false, message: '', confirmText: '', isDanger: true, onConfirm: null });
              setShowModal(false);
              // Undo toast: sai logo da lista; só é apagado da BD se ninguém carregar em Desfazer
              projetosAApagar.add(id);
              setProjetos((prev) => prev.filter((p) => p.id !== id));
              const r = await toastDesfazer(`Projeto "${titulo}" apagado.`, {
                  executar: () => supabase.from("projetos").delete().eq("id", id),
                  desfazer: () => { projetosAApagar.delete(id); fetchData(); },
              });
              projetosAApagar.delete(id);
              if (r === "executado") fetchData();
          }
      });
  }

  // Toggles de Pills UI
  const handleToggleParceiro = (cId) => {
      setForm(prev => {
          if (String(cId) === String(prev.cliente_id)) return prev;
          return {
              ...prev,
              parceiros_ids: prev.parceiros_ids.includes(cId)
                  ? prev.parceiros_ids.filter(id => id !== cId)
                  : [...prev.parceiros_ids, cId]
          };
      });
  };

  const handleToggleColaborador = (sId) => {
      setForm(prev => {
          const selectedId = String(sId);
          const current = (prev.colaboradores || []).map((id) => String(id));
          return {
              ...prev,
              colaboradores: current.includes(selectedId)
                  ? current.filter(id => id !== selectedId)
                  : [...current, selectedId]
          };
      });
  };

  /**
   * Grava o modal de projeto.
   * - Valida datas (início <= fim) e, na criação, os obrigatórios: nome, cliente,
   *   tipo, responsável, data de fim, fases (se houver programa/aviso) e
   *   investimento/incentivo > 0 (exceto tipos com eh_formacao).
   * - Edição: update em projetos + syncProjetoEntidades.
   * - Criação: insert, projeto_entidades e geração da árvore a partir do modelo
   *   selecionado. As datas são encadeadas pelos dias_estimados de cada item;
   *   as dependências do modelo (depende_de_template_*) são traduzidas para os
   *   ids reais num segundo passo. Depois notifica o responsável e abre o detalhe.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { ...form };
    const normalizeDateInput = (value) => {
        if (!value) return "";
        const normalized = String(value).slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
    };

    payload.data_inicio = normalizeDateInput(payload.data_inicio);
    payload.data_fim = normalizeDateInput(payload.data_fim);

    const selectedPrograma = getProgramaById(payload.programa_id);
    const selectedAviso = getAvisoById(payload.avisos_ids) || getAvisoForPrograma(selectedPrograma);
    const normalizedFases = normalizeProjetoFases(payload.prazos_fases);

                payload.titulo = (payload.titulo || "").trim();

        payload.is_parceria = normalizeBoolean(payload.is_parceria);
        payload.parceiros_ids = normalizeIdsList(payload.parceiros_ids);
        payload.colaboradores = normalizeIdsList(payload.colaboradores);
        payload.programa_id = selectedPrograma?.id || null;
        payload.aviso_id = selectedAviso?.id || null;
        payload.prazos_fases = normalizedFases;
        payload.programa = selectedPrograma ? `${selectedPrograma.codigo ? `${selectedPrograma.codigo} - ` : ""}${selectedPrograma.nome || ""}`.trim() : (payload.programa || "").trim();
        payload.aviso = selectedAviso?.codigo || (payload.aviso || "").trim();
            if (entidadesProjeto.length > 1) {
                payload.investimento = sumOrc("investimento");
                payload.incentivo = sumOrc("incentivo");
            }

    if (payload.cliente_id === "") payload.cliente_id = null;
    if (payload.tipo_projeto_id === "") payload.tipo_projeto_id = null;
    if (payload.responsavel_id === "") payload.responsavel_id = null;
    if (payload.data_fim === "") payload.data_fim = null;

    if (payload.data_inicio && payload.data_fim && payload.data_inicio > payload.data_fim) {
        setAlertDialog({
            show: true,
            title: "Período do Projeto Inválido",
            message: "A Data de Início não pode ser posterior à Data de Fim. Corrige as datas antes de guardar o projeto."
        });
        showToast("A Data de Início não pode ser posterior à Data de Fim.", "warning");
        setCurrentStep(3);
        setIsSubmitting(false);
        return;
    }

    if (normalizedFases.length > 0) {
        const lastPhaseDate = getLastProjetoFaseDate(normalizedFases);
    }

    if (!editId) {
        const tipoSelecionado = tipos.find(t => String(t.id) === String(payload.tipo_projeto_id));
        const isProjetoFormacao = tipoSelecionado?.eh_formacao === true;

        const missingFields = [];
        if (!payload.titulo) missingFields.push("Nome do Projeto");
        if (!payload.cliente_id) missingFields.push("Cliente");
        if (!payload.tipo_projeto_id) missingFields.push("Tipo de Projeto");
        if (!payload.responsavel_id) missingFields.push("Responsável Global");
        if (!payload.data_fim) missingFields.push("Data de Fim");
        if ((payload.programa_id || payload.avisos_ids) && normalizedFases.length === 0) missingFields.push("Datas das fases do aviso");

        const numInvestimento = isMultiEntidade ? sumOrc('investimento') : (Number(form.investimento) || 0);
        const numIncentivo = isMultiEntidade ? sumOrc('incentivo') : (Number(form.incentivo) || 0);
        const semInvestimento = !isProjetoFormacao && numInvestimento <= 0;
        const semIncentivo = !isProjetoFormacao && numIncentivo <= 0;

        if (semInvestimento) missingFields.push("Investimento Elegível");
        if (semIncentivo) missingFields.push("Incentivo Atribuído");

        if (missingFields.length > 0) {
            let msgAlerta = "";
            if (semInvestimento && semIncentivo && missingFields.length === 2) {
                msgAlerta = "Para concluir a criação do projeto é obrigatório definir os valores de Investimento Elegível e Incentivo Atribuído.\n\nPor favor preencha os valores antes de avançar.";
            } else if (semInvestimento && missingFields.length === 1) {
                msgAlerta = "Para concluir a criação do projeto é obrigatório definir o valor de Investimento Elegível.\n\nPor favor preencha o valor antes de avançar.";
            } else if (semIncentivo && missingFields.length === 1) {
                msgAlerta = "Para concluir a criação do projeto é obrigatório definir o valor de Incentivo Atribuído.\n\nPor favor preencha o valor antes de avançar.";
            } else {
                msgAlerta = `Para concluir a criação do projeto é obrigatório preencher os seguintes campos:\n\n• ${missingFields.join("\n• ")}`;
            }

            setAlertDialog({
                show: true,
                title: "Campos Obrigatórios em Falta",
                message: msgAlerta
            });
            showToast(`Para criar o projeto preenche: ${missingFields.join(", ")}.`, "warning");

            if (semInvestimento || semIncentivo) {
                setCurrentStep(5);
            } else if (!payload.titulo || !payload.cliente_id || !payload.tipo_projeto_id || !payload.responsavel_id) {
                setCurrentStep(1);
            } else if (!payload.data_fim) {
                setCurrentStep(3);
            }

            setIsSubmitting(false);
            return;
        }
    }

    if (!payload.cliente_id) {
        showToast("Seleciona um cliente principal para o projeto.", "warning");
        setIsSubmitting(false);
        return;
    }

    if (!payload.is_parceria) payload.parceiros_ids = [];
    payload.parceiros_ids = (payload.parceiros_ids || []).filter(
        (pid) => String(pid) !== String(payload.cliente_id)
    );
    payload.cliente_texto = "";

    payload.organismo_id = payload.has_organismo && payload.organismo_id ? payload.organismo_id : null;
    payload.organismo_contacto_id = payload.organismo_id && payload.organismo_contacto_id ? payload.organismo_contacto_id : null;
    delete payload.has_organismo;

    try {
        if (editId) {
            const projectPayload = {
                ...payload,
                data_inicio: payload.data_inicio || null,
                data_fim: payload.data_fim || null
            };
            const { error } = await supabase.from("projetos").update(projectPayload).eq("id", editId);
            if (error) {
                console.error("Erro ao atualizar projeto:", {
                    error,
                    projetoId: editId,
                    data_inicio: projectPayload.data_inicio,
                    data_fim: projectPayload.data_fim
                });
                if (error.code === "23514" && error.message?.includes("projetos_data_range_check")) {
                    throw new Error(`Não foi possível guardar o projeto: o intervalo enviado foi ${projectPayload.data_inicio || "sem data"} - ${projectPayload.data_fim || "sem data"}. A Data de Início tem de ser anterior ou igual à Data de Fim.`);
                }
                throw error;
            }
            await syncProjetoEntidades(editId, payload);
            showToast("Projeto atualizado!");
            setShowModal(false); 
            fetchData(); 
        } else {
            const { data: newProj, error: errProj } = await supabase.from("projetos").insert([payload]).select().single();
            if (errProj) throw errProj;

            let falhasGeracao = 0;
            try {
                await syncProjetoEntidades(newProj.id, payload);
            } catch (syncErr) {
                console.error("Erro ao gravar valores por entidade:", syncErr);
                falhasGeracao++;
            }

            // Gerar Árvore de Atividades
            if (payload.tipo_projeto_id && templateTree.length > 0) {
                showToast("A preparar as atividades do projeto…", "info");
                let projDateStr = payload.data_inicio || new Date().toISOString().split('T')[0];
                const projEndStr = payload.data_fim || getLastProjetoFaseDate(payload.prazos_fases) || null; 
                let currentAtivDate = projDateStr;
                const templateToRealAtividade = new Map();

                for (const tAtiv of templateTree) {
                    if (!templateSelection[`a_${tAtiv.id}`]) continue; 

                    const ativStart = currentAtivDate;
                    const ativEnd = (tAtiv.dias_estimados > 0) ? addDays(ativStart, tAtiv.dias_estimados) : (projEndStr || ativStart);

                    const { data: realAtiv, error: ativErr } = await supabase.from("atividades").insert([{ 
                        projeto_id: newProj.id,
                        titulo: tAtiv.nome,
                        estado: 'pendente',
                        ordem: tAtiv.ordem,
                        data_inicio: ativStart,
                        data_fim: ativEnd,
                        responsavel_id: payload.responsavel_id || null,
                        colaboradores: payload.colaboradores,
                        descricao: tAtiv.descricao || null,
                        info_adicional: tAtiv.info_adicional ? tAtiv.info_adicional : {}
                    }]).select().single();

                    if (ativErr) {
                        console.error("Erro ao criar atividade:", tAtiv.nome, ativErr);
                        falhasGeracao++;
                    }
                    if (realAtiv) {
                        templateToRealAtividade.set(String(tAtiv.id), String(realAtiv.id));
                    }

                    currentAtivDate = addDays(currentAtivDate, tAtiv.dias_estimados || 0);

                    if (realAtiv && tAtiv.tarefas) {
                        let currentTarDate = ativStart;
                        const templateToRealTarefa = new Map();
                        
                        for (const tTar of tAtiv.tarefas) {
                            if (!templateSelection[`t_${tTar.id}`]) continue;

                            const tarStart = currentTarDate;
                            const tarEnd = (tTar.dias_estimados > 0) ? addDays(tarStart, tTar.dias_estimados) : (projEndStr || tarStart);

                            // Adiciona template_tarefa_id ao criar tarefa
                            const { data: realTar, error: tarErr } = await supabase.from("tarefas").insert([{ 
                                atividade_id: realAtiv.id,
                                titulo: tTar.nome,
                                estado: 'pendente',
                                responsavel_id: payload.responsavel_id || null,
                                colaboradores: payload.colaboradores,
                                ordem: tTar.ordem,
                                data_inicio: tarStart,
                                data_fim: tarEnd,
                                descricao: tTar.descricao || null,
                                template_tarefa_id: tTar.id,
                                info_adicional: tTar.info_adicional ? tTar.info_adicional : {}
                            }]).select().single();

                            if (tarErr) {
                                console.error("Erro ao criar tarefa:", tTar.nome, tarErr);
                                falhasGeracao++;
                            }
                            if (realTar) {
                                templateToRealTarefa.set(String(tTar.id), String(realTar.id));
                            }

                            currentTarDate = addDays(currentTarDate, tTar.dias_estimados || 0);

                            if (realTar && tTar.subtarefas) {
                                let currentSubDate = tarStart;
                                const subTarefasParaInserir = [];

                                for (const ts of tTar.subtarefas) {
                                    if (!templateSelection[`s_${ts.id}`]) continue;

                                    const subEnd = (ts.dias_estimados > 0) ? addDays(currentSubDate, ts.dias_estimados) : (projEndStr || currentSubDate);
                                    currentSubDate = addDays(currentSubDate, ts.dias_estimados || 0); 
                                    
                                    subTarefasParaInserir.push({ 
                                        tarefa_id: realTar.id, titulo: ts.nome, estado: 'pendente',
                                        ordem: ts.ordem, data_fim: subEnd, 
                                        responsavel_id: payload.responsavel_id || null, colaboradores: payload.colaboradores
                                    });
                                }
                                
                                if (subTarefasParaInserir.length > 0) {
                                    const { error: subErr } = await supabase.from("subtarefas").insert(subTarefasParaInserir);
                                    if (subErr) {
                                        console.error("Erro ao criar passos da tarefa:", tTar.nome, subErr);
                                        falhasGeracao++;
                                    }
                                }
                            }
                        }

                        for (const tTar of tAtiv.tarefas) {
                            if (!templateSelection[`t_${tTar.id}`]) continue;

                            const realTarId = templateToRealTarefa.get(String(tTar.id));
                            if (!realTarId) continue;

                            const dependeTemplateTarefaId = tTar.depende_de_template_tarefa_id ? String(tTar.depende_de_template_tarefa_id) : null;
                            const dependeRealTarefaId = dependeTemplateTarefaId ? templateToRealTarefa.get(dependeTemplateTarefaId) : null;

                            if (!dependeRealTarefaId) continue;

                            await supabase
                                .from("tarefas")
                                .update({ depende_de_tarefa_id: dependeRealTarefaId })
                                .eq("id", realTarId);
                        }
                    }
                }

                for (const tAtiv of templateTree) {
                    if (!templateSelection[`a_${tAtiv.id}`]) continue;

                    const realAtivId = templateToRealAtividade.get(String(tAtiv.id));
                    if (!realAtivId) continue;

                    const dependeTemplateAtivId = tAtiv.depende_de_template_atividade_id ? String(tAtiv.depende_de_template_atividade_id) : null;
                    const dependeRealAtivId = dependeTemplateAtivId ? templateToRealAtividade.get(dependeTemplateAtivId) : null;

                    if (!dependeRealAtivId) continue;

                    await supabase
                        .from("atividades")
                        .update({ depende_de_atividade_id: dependeRealAtivId })
                        .eq("id", realAtivId);
                }

            }

            await notifyProjectCreated(newProj, payload.responsavel_id || null);
            
            if (falhasGeracao > 0) {
                showToast(`Projeto criado, mas ${falhasGeracao} elemento(s) não foram gravados. Vê a consola (F12) para detalhes.`, "warning");
            } else {
                showToast("Projeto criado com sucesso!");
            }
            setShowModal(false); 
            navigate(`/dashboard/projetos/${newProj.id}`);
        }
    } catch (err) { 
        showToast("Erro: " + err.message, "error");
        if (String(err.message || "").includes("Data de Início continua posterior")) {
            setAlertDialog({
                show: true,
                title: "Período do Projeto Inválido",
                message: err.message
            });
            setCurrentStep(3);
        }
    } finally { 
        setIsSubmitting(false); 
    }
  }

  /** Filtro "Só os meus": responsável, colaborador ou responsável de algum item interno. */
  const checkUserInvolvement = (p) => {
      if (!showOnlyMine || portfolioView === "overview") return true; 
      if (!user?.id) return false;
      if (p.responsavel_id === user.id) return true; 
      if (p.colaboradores?.includes(user.id)) return true;
      
      if (p.atividades && p.atividades.some(a => {
          if (a.responsavel_id === user.id) return true;
          if (a.tarefas && a.tarefas.some(t => {
              if (t.responsavel_id === user.id) return true;
              if (t.subtarefas && t.subtarefas.some(s => s.responsavel_id === user.id)) return true;
              return false;
          })) return true;
          return false;
      })) return true;

      return false; 
  };

  // Estados de projeto (coluna projetos.estado). "encerrado" e "cancelado" contam
  // como inativos (escondidos salvo "mostrar concluídos") e bloqueiam cronómetros.
  const estadosProjeto = [
      { id: 'pendente', nome: 'Pendente', color: '#f59e0b' },
      { id: 'em_curso', nome: 'Em Curso', color: '#10b981' },
      { id: 'em_analise', nome: 'Em Análise', color: '#6366f1' },
      { id: 'concluido', nome: 'Concluído', color: '#0ea5e9' },
      { id: 'encerrado', nome: 'Encerrado', color: '#64748b' },
      { id: 'cancelado', nome: 'Cancelado', color: '#ef4444' }
  ];

  const normalizeText = (value) => String(value || '').toLowerCase();

  const matchesBaseFilters = (p) => {
    if (!checkUserInvolvement(p)) return false;

    const termo = busca.toLowerCase();
    const matchBusca = normalizeText(p.titulo).includes(termo) || normalizeText(p.clientes?.marca).includes(termo) || normalizeText(p.clientes?.sigla).includes(termo) || normalizeText(p.codigo_projeto).includes(termo);
    if (!matchBusca) return false;

    const isInactive = p.estado === 'encerrado' || p.estado === 'cancelado';
    // 👇 Se estivermos na Vista Geral com um estado específico selecionado, permite mostrá-lo
    if (!mostrarConcluidos && isInactive && !(portfolioView === "overview" && overviewStateFilter === p.estado)) {
        return false;
    }

    return true;
  };

  const countsPerCategory = {};
  const countsPerEstado = {};
  const countsPerPrograma = {};

  projetos.forEach(p => {
      if (!matchesBaseFilters(p)) return;

      const catId = p.tipo_projeto_id || 'sem-categoria';
      if (!selectedEstado || p.estado === selectedEstado) {
          countsPerCategory[catId] = (countsPerCategory[catId] || 0) + 1;
      }

      if (!selectedCategoria || (selectedCategoria === 'sem-categoria' ? !p.tipo_projeto_id : p.tipo_projeto_id === selectedCategoria)) {
          const estadoId = p.estado || 'pendente';
          countsPerEstado[estadoId] = (countsPerEstado[estadoId] || 0) + 1;
      }

      const progId = p.programa_id || 'sem-programa';
      countsPerPrograma[progId] = (countsPerPrograma[progId] || 0) + 1;
  });

  const renderDeadline = (dateString, estado) => {
    if (estado === 'encerrado') return <span className="po-due is-closed"><Lock size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Encerrado</span>;
    if (estado === 'concluido') return <span className="po-due is-done"><Icons.Check size={12} /> Concluído</span>;
    if (!dateString) return <span className="po-due is-none">Sem prazo</span>;
    const deadline = new Date(dateString); deadline.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const fmt = deadline.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: deadline.getFullYear() !== today.getFullYear() ? '2-digit' : undefined }).replace('.', '');

    if (diffDays < 0) return <span className="po-due is-late" title={`Prazo: ${deadline.toLocaleDateString('pt-PT')}`}><Icons.Alert size={12} color="currentColor" /> {Math.abs(diffDays)}d em atraso</span>;
    if (diffDays === 0) return <span className="po-due is-today"><Icons.Calendar size={12} /> Termina hoje</span>;
    if (diffDays <= 5) return <span className="po-due is-soon" title={`Prazo: ${deadline.toLocaleDateString('pt-PT')}`}><Icons.Calendar size={12} /> Em {diffDays} dia{diffDays === 1 ? '' : 's'}</span>;
    return <span className="po-due" title={`Prazo: ${deadline.toLocaleDateString('pt-PT')}`}><Icons.Calendar size={12} /> {fmt}</span>;
  };

  const projectColors = ['var(--color-btnPrimary)', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9', '#6366f1'];
  const getColorForCategory = (id) => {
      if (!id) return '#94a3b8'; 
      const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return projectColors[hash % projectColors.length];
  };

  const getEstadoInfo = (estado) => estadosProjeto.find(e => e.id === estado) || { id: estado || 'pendente', nome: (estado || 'pendente').replace('_', ' '), color: '#64748b' };

 const isSearchActive = busca.trim().length > 0;
 const isVistaGeral = portfolioView === "overview";
  
  // A lista abre-se se estivermos a pesquisar OR se clicarmos no 1º nível de qualquer aba
  const isProjectListOpen = isVistaGeral || isSearchActive || 
      (menuPrincipal === 'tipo' && selectedCategoria) || 
      (menuPrincipal === 'estado' && selectedEstado) ||
      (menuPrincipal === 'programa' && selectedProgramaNav);

  const resetProjectMenus = () => {
      setSelectedCategoria(null);
      setSelectedEstado(null);
      setSelectedProgramaNav(null);
  };

  const switchMenuPrincipal = (nextMenu) => {
      setMenuPrincipal(nextMenu);
      resetProjectMenus();
  };

  const handleVoltarProjetos = () => {
      if (isSearchActive) {
          setBusca(""); // Se estiver a pesquisar, o voltar limpa a pesquisa
          return;
      }
      resetProjectMenus();
  };

  // Filtra os projetos aplicando a nova lógica de bypass
  const projetosFiltrados = projetos.filter(p => {
      if (!matchesBaseFilters(p)) return false;
      
      // Se há pesquisa ativa, ignora os cliques e faz bypass direto
      if (isSearchActive) return true;

      // Se entrou por Tipo de Projeto
      if (menuPrincipal === 'tipo' && selectedCategoria) {
          if (selectedCategoria === 'sem-categoria' && p.tipo_projeto_id) return false;
          if (selectedCategoria !== 'sem-categoria' && p.tipo_projeto_id !== selectedCategoria) return false;
      }

      // Se entrou por Estado
      if (menuPrincipal === 'estado' && selectedEstado) {
          if (p.estado !== selectedEstado) return false;
      }

      // 👈 NOVO: Se entrou por Programa
      if (menuPrincipal === 'programa' && selectedProgramaNav) {
          if (selectedProgramaNav === 'sem-programa' && p.programa_id) return false;
          if (selectedProgramaNav !== 'sem-programa' && String(p.programa_id) !== String(selectedProgramaNav)) return false;
      }

      return true;
  });

  // Nomes e Títulos Dinâmicos
  const selectedCategoriaNome = selectedCategoria 
      ? (selectedCategoria === 'sem-categoria' ? 'Projetos Avulsos' : tipos.find(t => String(t.id) === String(selectedCategoria))?.nome || '') 
      : '';
      
  const selectedEstadoNome = selectedEstado ? getEstadoInfo(selectedEstado).nome : '';

  const selectedProgramaNome = selectedProgramaNav
      ? (selectedProgramaNav === 'sem-programa' ? 'Sem Programa' : programas.find(prog => String(prog.id) === String(selectedProgramaNav))?.nome || '')
      : '';

  const matchesOverviewFilters = (project) => {
      const matchesType = !overviewTypeFilter || (
          overviewTypeFilter === "sem-tipo"
              ? !project.tipo_projeto_id
              : String(project.tipo_projeto_id || "") === String(overviewTypeFilter)
      );
      const matchesProgram = !overviewProgramFilter || (
          overviewProgramFilter === "sem-programa"
              ? !project.programa_id
              : String(project.programa_id || "") === String(overviewProgramFilter)
      );
      const matchesState = !overviewStateFilter || String(project.estado || "pendente") === String(overviewStateFilter);
      
      const matchesEntity = !overviewEntityFilter || (
          overviewEntityFilter === "sem-entidade"
              ? (!project.cliente_id && normalizeIdsList(project.parceiros_ids).length === 0)
              : (
                  String(project.cliente_id || "") === String(overviewEntityFilter) ||
                  normalizeIdsList(project.parceiros_ids).includes(String(overviewEntityFilter))
              )
      );

      return matchesType && matchesProgram && matchesState && matchesEntity;
  };
  const overviewProjectsCount = isVistaGeral
      ? projetosFiltrados.filter(matchesOverviewFilters).length
      : 0;

  // --- NOVA LÓGICA DE AGRUPAMENTO ---
  const getProjectProgramName = (project) => {
      const programa = getProgramaById(project.programa_id);
      if (programa) return programa.codigo ? `${programa.codigo} - ${programa.nome}` : programa.nome;
      return 'Sem Programa Associado';
  };

  const sortVistaGeralProjects = (projects) => [...projects].sort((a, b) => (
      String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-PT", { sensitivity: "base" })
  ));

  const groupedProjects = {};
  if (isProjectListOpen) {
      if (isVistaGeral) {
          projetosFiltrados.forEach(p => {
              const groupName = getProjectProgramName(p);
              if (!groupedProjects[groupName]) groupedProjects[groupName] = [];
              groupedProjects[groupName].push(p);
          });

          Object.keys(groupedProjects).forEach(groupName => {
              groupedProjects[groupName] = sortVistaGeralProjects(groupedProjects[groupName]);
          });
      } else if (isSearchActive) {
          groupedProjects['Resultados'] = projetosFiltrados;
      } else if (menuPrincipal === 'tipo') {
          estadosProjeto.forEach(est => groupedProjects[est.nome] = []);
          groupedProjects['Outros'] = [];
          
          projetosFiltrados.forEach(p => {
              const estInfo = getEstadoInfo(p.estado);
              const key = estInfo ? estInfo.nome : 'Outros';
              if (!groupedProjects[key]) groupedProjects[key] = [];
              groupedProjects[key].push(p);
          });
      } else if (menuPrincipal === 'estado') {
          tipos.forEach(t => groupedProjects[t.nome] = []);
          groupedProjects['Projetos Avulsos'] = [];
          
          projetosFiltrados.forEach(p => {
              const tipoNome = p.tipo_projeto_id ? (tipos.find(t => String(t.id) === String(p.tipo_projeto_id))?.nome || 'Outros') : 'Projetos Avulsos';
              if (!groupedProjects[tipoNome]) {
            groupedProjects[tipoNome] = [];
                }
              groupedProjects[tipoNome].push(p);
          });

      } else if (menuPrincipal === 'programa') {
          estadosProjeto.forEach(est => groupedProjects[est.nome] = []);
          groupedProjects['Outros'] = [];
          
          projetosFiltrados.forEach(p => {
              const estInfo = getEstadoInfo(p.estado);
              const key = estInfo ? estInfo.nome : 'Outros';
              if (!groupedProjects[key]) groupedProjects[key] = [];
              groupedProjects[key].push(p);
          });
      }

      // Remove os grupos que ficaram vazios
      Object.keys(groupedProjects).forEach(k => {
          if (!groupedProjects[k] || groupedProjects[k].length === 0) delete groupedProjects[k];
      });

      if (isVistaGeral) {
          const orderedGroups = Object.keys(groupedProjects).sort((a, b) => a.localeCompare(b, "pt-PT", { sensitivity: "base" }));
          const orderedGroupedProjects = {};
          orderedGroups.forEach(groupName => {
              orderedGroupedProjects[groupName] = groupedProjects[groupName];
          });
          Object.keys(groupedProjects).forEach(groupName => delete groupedProjects[groupName]);
          Object.assign(groupedProjects, orderedGroupedProjects);
      }
  }

    const selectedPrograma = getProgramaById(form.programa_id);
    const selectedAviso = getAvisoById(form.avisos_ids) || getAvisoForPrograma(selectedPrograma);
  const fasesProjeto = normalizeProjetoFases(form.prazos_fases);
  const fasesEfetivas = fasesProjeto.length > 0 ? fasesProjeto : normalizeProjetoFases(selectedAviso?.fases);

  /**
   * Ao escolher o programa preenche o texto "programa" (codigo - nome) e o aviso;
   * o useEffect de form.avisos_ids copia as fases do aviso para prazos_fases.
   */
  const handleProgramaChange = async (programaId) => {
    if (!programaId) {
        setForm(prev => ({
            ...prev,
            programa_id: "",
            programa: "",
            avisos_ids: "",
            aviso: "",
            prazos_fases: []
        }));
        return;
    }

    const programa = getProgramaById(programaId);
    let aviso = getAvisoForPrograma(programa);

    // Se o aviso ainda não estiver no estado local, busca do servidor
    if (!aviso && programa?.avisos_ids) {
        aviso = await fetchAvisoFromServer(programa.avisos_ids);
    }

    setForm((prev) => ({
        ...prev,
        programa_id: programaId,
        programa: programa ? `${programa.codigo ? `${programa.codigo} - ` : ""}${programa.nome || ""}`.trim() : "",
        // Atualiza o ID, o useEffect acima encarregar-se-á de atualizar as fases
        avisos_ids: aviso?.id || "",
        aviso: aviso?.codigo || ""
    }));
};

  // DEBUG: log when selected programa/aviso change in form
  useEffect(() => {
      // debug effect removed
  }, [form.programa_id, form.avisos_ids, programas, avisos]);

  const updateProjetoFase = (index, field, value) => {
    setForm((prev) => {
        // Cria um novo array para o React detetar a alteração de referência
        const novasFases = [...prev.prazos_fases];
        
        // Cria um novo objeto para a fase alterada
        novasFases[index] = { ...novasFases[index], [field]: value };
        
        return {
            ...prev,
            prazos_fases: novasFases
        };
    });
};

  const addProjetoFase = () => {
      setForm((prev) => {
          const fases = normalizeProjetoFases(prev.prazos_fases);
          return {
              ...prev,
              prazos_fases: [...fases, createBlankProjetoFase(fases.length)],
          };
      });
  };

  const removeProjetoFase = (index) => {
      setForm((prev) => {
          const fases = normalizeProjetoFases(prev.prazos_fases).filter((_, currentIndex) => currentIndex !== index);
          return {
              ...prev,
              prazos_fases: fases,
          };
      });
  };

  const initialsOf = (txt) => {
      const clean = String(txt || '').replace(/[[\]()\-–]/g, ' ').trim();
      if (!clean) return '?';
      if (/^[A-Za-z0-9]{2,4}$/.test(clean)) return clean.toUpperCase();
      return clean.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  };

  const renderViewModeToggle = () => (
      <div className="po-seg is-small" role="tablist" aria-label="Modo de visualização">
          <button type="button" role="tab" aria-selected={viewMode === "cards"} onClick={() => setViewMode("cards")} className={viewMode === "cards" ? "is-on" : ""}>
              <Icons.Grid size={14} /> <span>Cartões</span>
          </button>
          <button type="button" role="tab" aria-selected={viewMode === "list"} onClick={() => setViewMode("list")} className={viewMode === "list" ? "is-on" : ""}>
              <Icons.ListTree size={14} /> <span>Lista</span>
          </button>
      </div>
  );

  const renderTimerButton = (p, isTimerActive, size = "md") => (
      <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (isTimerActive) handleStopLog(e); else handleStartProjeto(e, p); }}
          className={`po-timer is-${size} ${isTimerActive ? 'is-on' : ''}`}
          title={isTimerActive ? "Parar cronómetro" : "Iniciar cronómetro"}
          aria-label={isTimerActive ? "Parar cronómetro" : "Iniciar cronómetro"}
      >
          {isTimerActive ? <Icons.Stop /> : <Icons.Play />}
      </button>
  );

  const pedidosInvPorProjeto = pedidosReembolso.reduce((acc, request) => {
      const key = String(request.projeto_id);
      acc[key] = (acc[key] || 0) + (Number(request.valor_investimento) || 0);
      return acc;
  }, {});
  const getCardExecution = (p) => {
      const investimento = Number(p.investimento || 0);
      if (!(investimento > 0)) return null;
      const pedido = pedidosInvPorProjeto[String(p.id)] || 0;
      return { pct: (pedido / investimento) * 100, pedido, investimento };
  };
  const formatEurCompact = (value) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);

  const renderProjectCard = (p, index = 0) => {
      const isCompleted = p.estado === 'encerrado' || p.estado === 'cancelado';
      const isTimerActive = activeLog?.projeto_id === p.id;
      const catColor = getColorForCategory(p.tipo_projeto_id);
      const clientInfo = getProjetoClientDisplay(p);
      const clientIcon = p.cliente_texto ? <Icons.FileText size={14} /> : (clientInfo.isParceria ? <Icons.Handshake size={14} /> : <Icons.Building size={14} />);
      const estado = getEstadoInfo(p.estado);
      const responsavel = p.profiles?.nome || '';

      return (
          <article
              key={p.id}
              {...clicavel(() => navigate(`/dashboard/projetos/${p.id}`))}
              className={`po-card ${isCompleted ? 'is-closed' : ''} ${isTimerActive ? 'is-running' : ''}`}
              style={{ '--pc': isCompleted ? '#cbd5e1' : catColor, '--ec': estado.color, '--i': Math.min(index, 12) }}
          >
              <div className="po-card-top">
                  <div className="po-card-tags">
                      {p.codigo_projeto && <span className="po-code">{p.codigo_projeto}</span>}
                      {p.numero_projeto && <span className="po-code is-num">Nº {p.numero_projeto}</span>}
                      <span className="po-state"><i />{estado.nome}</span>
                  </div>
                  {!isCompleted && renderTimerButton(p, isTimerActive)}
              </div>

              <h3 className="po-card-title" title={p.titulo}>{p.titulo || 'Sem título'}</h3>
              <div className={`po-card-client ${clientInfo.isParceria ? 'is-partner' : ''}`} title={clientInfo.text}>
                  {clientIcon}<span>{clientInfo.text || 'Sem entidade'}</span>
              </div>

              {(() => {
                  const exec = getCardExecution(p);
                  if (!exec) return null;
                  const tone = exec.pct >= 100 ? 'is-full' : exec.pct >= 50 ? 'is-mid' : exec.pct > 0 ? 'is-low' : 'is-zero';
                  return (
                      <div className={`po-card-exec ${tone}`} title={`Taxa de execução: ${formatEurCompact(exec.pedido)} pedidos de ${formatEurCompact(exec.investimento)} de investimento`}>
                          <div className="po-card-exec-head">
                              <span>Taxa de execução</span>
                              <strong>{exec.pct.toFixed(1)}%</strong>
                          </div>
                          <span className="po-card-exec-bar"><i style={{ width: `${Math.min(100, exec.pct)}%` }} /></span>
                      </div>
                  );
              })()}

              <div className="po-card-foot">
                  <span className="po-person" title={responsavel ? `Responsável: ${responsavel}` : 'Sem responsável'}>
                      <span className="po-avatar">{responsavel ? initialsOf(responsavel) : '–'}</span>
                      <span className="po-person-name">{responsavel || 'Sem responsável'}</span>
                  </span>
                  {renderDeadline(p.data_fim, p.estado)}
                  <button type="button" onClick={(e) => handleEdit(e, p)} className="po-icon-btn" title="Editar projeto" aria-label="Editar projeto"><Icons.Edit size={15} /></button>
              </div>
          </article>
      );
  };

  const renderProjectRow = (p) => {
      const isCompleted = p.estado === 'encerrado' || p.estado === 'cancelado';
      const isTimerActive = activeLog?.projeto_id === p.id;
      const catColor = getColorForCategory(p.tipo_projeto_id);
      const clientInfo = getProjetoClientDisplay(p);
      const estado = getEstadoInfo(p.estado);
      const responsavel = p.profiles?.nome || '';

      return (
          <tr
              key={p.id}
              className={`po-row ${isCompleted ? 'is-closed' : ''} ${isTimerActive ? 'is-running' : ''}`}
              {...clicavel(() => navigate(`/dashboard/projetos/${p.id}`), { papel: null })}
              style={{ '--pc': isCompleted ? '#cbd5e1' : catColor, '--ec': estado.color }}
          >
              <td>
                  <div className="po-row-title">
                      <strong>{p.titulo || 'Sem título'}</strong>
                      <div className="po-card-tags">
                          {p.codigo_projeto && <span className="po-code">{p.codigo_projeto}</span>}
                          {p.numero_projeto && <span className="po-code is-num">Nº {p.numero_projeto}</span>}
                          {isTimerActive && <span className="po-live-tag">● A contar tempo</span>}
                      </div>
                  </div>
              </td>
              <td><span className={`po-row-client ${clientInfo.isParceria ? 'is-partner' : ''}`} title={clientInfo.text}>{clientInfo.text || '—'}</span></td>
              <td>
                  <span className="po-person">
                      <span className="po-avatar">{responsavel ? initialsOf(responsavel) : '–'}</span>
                      <span className="po-person-name">{responsavel || '—'}</span>
                  </span>
              </td>
              <td>{renderDeadline(p.data_fim, p.estado)}</td>
              <td><span className="po-state"><i />{estado.nome}</span></td>
              <td>
                  <div className="po-row-actions">
                      {!isCompleted && renderTimerButton(p, isTimerActive, "sm")}
                      <button type="button" onClick={(e) => handleEdit(e, p)} className="po-icon-btn" title="Editar projeto" aria-label="Editar projeto"><Icons.Edit size={15} /></button>
                  </div>
              </td>
          </tr>
      );
  };

  const renderEmpty = (title, text) => (
      <div className="po-empty">
          <span className="po-empty-icon"><Icons.Inbox size={30} color="currentColor" /></span>
          <h3>{title}</h3>
          <p>{text}</p>
          {(busca || mostrarConcluidos) && (
              <button type="button" className="po-btn" onClick={() => { setBusca(""); }}>Limpar pesquisa</button>
          )}
      </div>
  );

  const renderMenuItems = (items, emptyTitle, emptyText) => {
      const visibleItems = items.filter(item => item.count > 0 || busca || mostrarConcluidos);

      if (visibleItems.length === 0) return renderEmpty(emptyTitle, emptyText);

      if (viewMode === "list") {
          return (
              <div className="po-table-wrap">
                  <table className="po-table">
                      <thead>
                          <tr>
                              <th>{menuPrincipal === 'tipo' ? 'Tipo de projeto' : menuPrincipal === 'estado' ? 'Estado' : 'Programa'}</th>
                              <th style={{ width: 120 }}>Projetos</th>
                              <th style={{ width: 140, textAlign: 'right' }}></th>
                          </tr>
                      </thead>
                      <tbody>
                          {visibleItems.map(item => (
                              <tr key={item.id} className="po-row" {...clicavel(item.onClick, { papel: null })} style={{ '--pc': item.color }}>
                                  <td>
                                      <span className="po-nav-inline">
                                          <span className="po-nav-icon is-sm">{initialsOf(item.nome)}</span>
                                          <strong>{item.nome}</strong>
                                      </span>
                                  </td>
                                  <td><span className="po-count">{item.count}</span></td>
                                  <td className="po-row-open">{item.actionLabel || 'Abrir'} <Icons.ArrowRight /></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          );
      }

      const maxCount = Math.max(1, ...visibleItems.map((item) => item.count || 0));
      return (
          <div className="po-nav-grid">
              {visibleItems.map((item, i) => (
                  <button
                      type="button"
                      key={item.id}
                      onClick={item.onClick}
                      className={`po-nav-card ${item.count === 0 ? 'is-empty' : ''}`}
                      style={{ '--nc': item.color, '--i': Math.min(i, 12) }}
                  >
                      <span className="po-nav-head">
                          <span className="po-nav-icon">{initialsOf(item.nome)}</span>
                          <span className="po-nav-count">{item.count}<small>{item.count === 1 ? 'projeto' : 'projetos'}</small></span>
                      </span>
                      <strong className="po-nav-name">{item.nome}</strong>
                      <span className="po-nav-bar"><i style={{ width: `${Math.max(4, ((item.count || 0) / maxCount) * 100)}%` }} /></span>
                      <span className="po-nav-action">{item.actionLabel || 'Abrir'} <Icons.ArrowRight /></span>
                  </button>
              ))}
          </div>
      );
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };

  const entidadesProjeto = [...new Set(
    [form.cliente_id, ...(form.is_parceria ? (form.parceiros_ids || []) : [])].filter(Boolean).map(String)
    )];
    const isMultiEntidade = entidadesProjeto.length > 1;
    const sumOrc = (f) => entidadesProjeto.reduce((t, id) => t + (Number(orcamentos[id]?.[f]) || 0), 0);
    const setOrcamento = (id, field, value) =>
    setOrcamentos((prev) => ({ ...prev, [id]: { investimento: 0, incentivo: 0, ...prev[id], [field]: value } }));
    const fmtEUR = (v) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
    const moneyInput = (value, onChange) => (
    <input
        type="text"
        value={fmtEUR(value)}
        onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); onChange(d ? Number(d) / 100 : 0); }}
        style={{textAlign: 'right'}}
        className="bz-campo"
    />
    );


  const sanitizeNif = (value) => String(value || "").replace(/\D/g, "").slice(0, 9);

  const extractNifApiErrorMessage = (data) => {
      if (!data || typeof data !== "object") return null;
      const candidates = [data.error, data.message, data.msg, data.detail, data.status];
      const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
      return found ? found.trim() : null;
  };

  const buildSiglaFromTitle = (title) => {
      if (!title || typeof title !== "string") return "";
      const stopWords = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "the", "and"]);
      const words = title
          .replace(/[.,;:()]/g, " ")
          .split(/\s+/)
          .map((word) => word.trim())
          .filter(Boolean)
          .filter((word) => !stopWords.has(word.toLowerCase()));
      if (!words.length) return "";
      return words.slice(0, 5).map((word) => word[0]).join("").toUpperCase().slice(0, 20);
  };

  /** Consulta o NIF no nif.pt através de /api/nif (com sessão); devolve o registo ou null. */
  async function fetchNifRecord(nif) {
      const nifSanitizado = sanitizeNif(nif);
      if (nifSanitizado.length !== 9) return null;

      const response = await consultarNif(nifSanitizado);
      if (!response.ok) throw new Error("Erro na comunicação com a API.");

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
          throw new Error("Resposta inválida do serviço NIF. Tenta de novo daqui a pouco.");
      }

      const data = await response.json();
      const apiErrorMessage = extractNifApiErrorMessage(data);
      if (apiErrorMessage) throw new Error(apiErrorMessage);

      if (data?.credits?.left?.day === 0) {
          throw new Error("limite diário de consultas atingido");
      }

      return data?.records?.[nifSanitizado] || data?.[nifSanitizado] || null;
  }

  /** Abre o modal "Nova entidade" sem sair do wizard; `papel` diz onde a entidade fica selecionada. */
  const openQuickEntidade = (papel) => {
      setQuickPapel(papel);
      setQuickOrganismoModal({ show: true, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });
  };
  const openQuickOrganismoModal = () => openQuickEntidade("organismo");

  /**
   * Seleciona no formulário a entidade criada/encontrada no modal rápido, conforme o papel:
   * líder → cliente_id; parceiro → parceiros_ids; organismo → organismo_id (marca eh_organismo se faltar).
   */
  const selecionarEntidadeRapida = async (ent) => {
      if (!ent?.id) return;
      let registo = { ...ent };
      if (quickPapel === "organismo" && !ent.eh_organismo) {
          // Já existia mas não estava marcada como organismo: marca-a (senão não aparece na lista de organismos).
          const { error } = await supabase.from("clientes").update({ eh_organismo: true }).eq("id", ent.id);
          if (!error) registo = { ...registo, eh_organismo: true };
      }
      setClientes(prev => [registo, ...prev.filter(c => String(c.id) !== String(ent.id))]);
      setForm(prev => {
          if (quickPapel === "lider") {
              return { ...prev, cliente_id: ent.id, parceiros_ids: (prev.parceiros_ids || []).filter(pid => String(pid) !== String(ent.id)) };
          }
          if (quickPapel === "parceiro") {
              if (String(ent.id) === String(prev.cliente_id) || (prev.parceiros_ids || []).some(pid => String(pid) === String(ent.id))) return prev;
              return { ...prev, is_parceria: true, parceiros_ids: [...(prev.parceiros_ids || []), ent.id] };
          }
          return { ...prev, has_organismo: true, organismo_id: ent.id, organismo_contacto_id: "" };
      });
  };

  const PAPEL_TXT = { lider: "entidade líder", parceiro: "entidade parceira", organismo: "organismo" };

  /**
   * Cria um programa de financiamento (e, opcionalmente, o seu primeiro aviso) a partir do
   * passo 3 e seleciona-o no projeto. Mesmo formato que pages/GestaoAvisos.jsx
   * (programas_financiamento.avisos_ids = array de ids de avisos).
   */
  const createQuickPrograma = async (e) => {
      e.preventDefault();
      const q = quickPrograma;
      if (!q || q.isSubmitting) return;
      const codigo = q.codigo.trim();
      const nome = q.nome.trim();
      if (!codigo || !nome) { showToast("Indica a sigla e o nome do programa.", "warning"); return; }
      setQuickPrograma((prev) => ({ ...prev, isSubmitting: true }));
      try {
          let aviso = null;
          if (q.avisoCodigo.trim()) {
              const { data, error } = await supabase.from("avisos")
                  .insert([{ codigo: q.avisoCodigo.trim(), fases: [], ativo: true }]).select("*").single();
              if (error) throw error;
              aviso = data;
          }
          const { data: programa, error } = await supabase.from("programas_financiamento")
              .insert([{ codigo, nome, avisos_ids: aviso ? [aviso.id] : [], ativo: true }])
              .select("id, codigo, nome, aviso, avisos_ids, ativo").single();
          if (error) throw error;
          if (aviso) setAvisos((prev) => [...prev, aviso]);
          setProgramas((prev) => [...prev, programa]);
          setForm((prev) => ({
              ...prev,
              programa_id: programa.id,
              programa: `${programa.codigo} - ${programa.nome}`,
              avisos_ids: aviso?.id || "",
              aviso: aviso?.codigo || "",
              prazos_fases: [],
          }));
          setQuickPrograma(null);
          showToast(aviso ? "Programa e aviso criados e selecionados." : "Programa criado e selecionado. Podes criar já o aviso.", "success");
      } catch (err) {
          setQuickPrograma((prev) => (prev ? { ...prev, isSubmitting: false } : prev));
          showToast(`Erro ao criar o programa: ${err.message}`, "error");
      }
  };

  /** Cria um aviso (com as fases/prazos) para o programa escolhido no passo 3 e seleciona-o. */
  const createQuickAviso = async (e) => {
      e.preventDefault();
      const q = quickAviso;
      const programa = getProgramaById(form.programa_id);
      if (!q || q.isSubmitting || !programa) return;
      const codigo = q.codigo.trim();
      if (!codigo) { showToast("Indica o código do aviso.", "warning"); return; }
      const fases = (q.fases || [])
          .map((f, i) => ({ nome: String(f.nome || "").trim() || `Fase ${i + 1}`, prazo: f.prazo || "" }))
          .filter((f) => f.prazo || f.nome);
      setQuickAviso((prev) => ({ ...prev, isSubmitting: true }));
      try {
          const { data: aviso, error } = await supabase.from("avisos")
              .insert([{ codigo, fases, ativo: true }]).select("*").single();
          if (error) throw error;
          const atuais = Array.isArray(programa.avisos_ids) ? programa.avisos_ids : (programa.avisos_ids ? [programa.avisos_ids] : []);
          const novosIds = [...atuais, aviso.id];
          const { error: e2 } = await supabase.from("programas_financiamento")
              .update({ avisos_ids: novosIds, updated_at: new Date().toISOString() }).eq("id", programa.id);
          if (e2) throw e2;
          setAvisos((prev) => [...prev, aviso]);
          setProgramas((prev) => prev.map((p) => (String(p.id) === String(programa.id) ? { ...p, avisos_ids: novosIds } : p)));
          // Selecionar o aviso: o useEffect de avisos_ids importa as fases para o projeto
          setForm((prev) => ({ ...prev, avisos_ids: aviso.id, aviso: aviso.codigo }));
          setQuickAviso(null);
          showToast("Aviso criado, ligado ao programa e selecionado.", "success");
      } catch (err) {
          setQuickAviso((prev) => (prev ? { ...prev, isSubmitting: false } : prev));
          showToast(`Erro ao criar o aviso: ${err.message}`, "error");
      }
  };

  const closeQuickOrganismoModal = () => {
      setQuickOrganismoModal({ show: false, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });
  };

  /** Cria rapidamente uma entidade (líder, parceira ou organismo) sem sair do wizard do projeto. */
  const createQuickOrganismo = async (e) => {
      e.preventDefault();
      if (quickOrganismoModal.isSubmitting) return;

      const marca = quickOrganismoModal.marca.trim();
      const nif = String(quickOrganismoModal.nif || "").replace(/\D/g, "").slice(0, 9);
      if (!marca) {
          showToast("Indica o nome da entidade.", "warning");
          return;
      }

      if (nif && nif.length !== 9) {
          showToast("O NIF tem de ter 9 dígitos.", "warning");
          return;
      }

      setQuickOrganismoModal(prev => ({ ...prev, isSubmitting: true }));

      try {
          if (nif) {
              const { data: existente, error: nifError } = await supabase
                  .from("clientes")
                  .select("id, marca, sigla, nif, entidade, website, eh_organismo")
                  .eq("nif", nif)
                  .maybeSingle();
              if (nifError) throw nifError;

              if (existente?.id) {
                  await selecionarEntidadeRapida(existente);
                  setQuickOrganismoModal({ show: false, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });
                  showToast(`Esta entidade já existia e foi selecionada como ${PAPEL_TXT[quickPapel]}.`, "success");
                  return;
              }
          }

          const payload = {
              marca,
              sigla: quickOrganismoModal.sigla.trim() || null,
              nif: nif || null,
              entidade: quickOrganismoModal.entidade.trim() || marca,
              website: quickOrganismoModal.website.trim() || null,
              ativo: true,
              eh_organismo: quickPapel === "organismo",
              eh_empresa_consultora: false,
              plano: "Standard",
              tem_cursos: false
          };

          const { data, error } = await supabase.from("clientes").insert([payload]).select("id, marca, sigla, nif, entidade, website, eh_organismo").single();
          if (error) throw error;

          await selecionarEntidadeRapida(data);
          setQuickOrganismoModal({ show: false, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });
          showToast(`Entidade criada e selecionada como ${PAPEL_TXT[quickPapel]}. Os restantes dados completam-se em Entidades.`, "success");
      } catch (err) {
          setQuickOrganismoModal(prev => ({ ...prev, isSubmitting: false }));
          showToast(`Erro ao criar a entidade: ${err.message}`, "error");
      }
  };

  const handleQuickOrganismoNifChange = async (e) => {
      const nifDigitado = sanitizeNif(e.target.value);
      setQuickOrganismoModal(prev => ({ ...prev, nif: nifDigitado }));

      if (nifDigitado.length < 9) return;

      try {
          const clienteExistente = await supabase
              .from("clientes")
              .select("id, marca, sigla, nif, entidade, website, eh_organismo")
              .eq("nif", nifDigitado)
              .limit(1)
              .maybeSingle();

          if (clienteExistente?.data?.id) {
              await selecionarEntidadeRapida(clienteExistente.data);
              showToast(`Esta entidade já existe e foi selecionada como ${PAPEL_TXT[quickPapel]}.`, "success");
              closeQuickOrganismoModal();
              return;
          }
      } catch {
          // Se a verificação local falhar, continuamos com a consulta pública.
      }

      try {
          showToast("A consultar dados no NIF.pt…", "info");
          const record = await fetchNifRecord(nifDigitado);
          if (!record) {
              showToast("NIF.pt não devolveu dados para este NIF.", "warning");
              return;
          }

          const title = record.title || "";
          const website = record.contacts?.website || "";
          const sigla = buildSiglaFromTitle(title);

          setQuickOrganismoModal(prev => ({
              ...prev,
              marca: prev.marca || title,
              entidade: prev.entidade || title,
              sigla: prev.sigla || sigla,
              website: prev.website || website
          }));
      } catch (err) {
          showToast(`NIF.pt indisponível: ${err.message}`, "warning");
      }
  };

  const getProjetoClientDisplay = (projeto) => {
      if (!projeto) return { text: 'Sem Cliente', isParceria: false };

      if (projeto.is_parceria && projeto.parceiros_ids?.length > 0) {
          const parceirosNomes = projeto.parceiros_ids
              .map(id => getClientDisplayName(clientes.find(c => String(c.id) === String(id))))
              .filter(Boolean)
              .join(', ');

          if (parceirosNomes) {
              return { text: `Parceria: ${parceirosNomes}`, isParceria: true };
          }
      }

      return {
          text: projeto.cliente_texto ? projeto.cliente_texto : (getClientDisplayName(projeto.clientes) || 'Sem Cliente'),
          isParceria: false
      };
  };

  const tipoSelecionadoUI = tipos.find(t => String(t.id) === String(form.tipo_projeto_id));
  const organismoPessoas = form.has_organismo && form.organismo_id
      ? entidadePessoas.filter(p => String(p.cliente_id) === String(form.organismo_id))
      : [];
  const tipoMenuItems = [
      ...tipos.map(t => ({
          id: t.id,
          nome: t.nome,
          count: countsPerCategory[t.id] || 0,
          color: getColorForCategory(t.id),
          actionLabel: selectedEstado ? 'Escolher tipo' : 'Ver projetos',
          onClick: () => setSelectedCategoria(t.id)
      })),
      ...(countsPerCategory['sem-categoria'] > 0 ? [{
          id: 'sem-categoria',
          nome: 'Projetos Avulsos',
          count: countsPerCategory['sem-categoria'] || 0,
          color: '#64748b',
          actionLabel: selectedEstado ? 'Escolher tipo' : 'Ver projetos sem modelo',
          onClick: () => setSelectedCategoria('sem-categoria')
      }] : [])
  ];
  const estadoMenuItems = estadosProjeto.map(estado => ({
      id: estado.id,
      nome: estado.nome,
      count: countsPerEstado[estado.id] || 0,
      color: estado.color,
      actionLabel: selectedCategoria ? 'Escolher estado' : 'Abrir estados',
      onClick: () => setSelectedEstado(estado.id)
  }));

  const programaMenuItems = [
      ...programas.map(prog => ({
          id: prog.id,
          nome: prog.codigo ? `${prog.codigo} - ${prog.nome}` : prog.nome,
          count: countsPerPrograma[prog.id] || 0,
          color: '#6366f1', 
          actionLabel: 'Abrir programa',
          onClick: () => setSelectedProgramaNav(prog.id)
      })),
      ...(countsPerPrograma['sem-programa'] > 0 ? [{
          id: 'sem-programa',
          nome: 'Sem Programa Associado',
          count: countsPerPrograma['sem-programa'] || 0,
          color: '#64748b',
          actionLabel: 'Ver projetos avulsos',
          onClick: () => setSelectedProgramaNav('sem-programa')
      }] : [])
  ];

  const currentMenuTitle = isVistaGeral
      ? "Vista Geral"
      : isSearchActive 
      ? "Resultados da Pesquisa"
      : isProjectListOpen
          ? [selectedCategoriaNome, selectedEstadoNome].filter(Boolean).join(' - ')
          : selectedCategoria
              ? `Estados de ${selectedCategoriaNome}`
              : selectedEstado
                  ? `Tipos em ${selectedEstadoNome}`
                  : (menuPrincipal === 'tipo' ? 'Tipos de Projeto' : menuPrincipal === 'estado' ? 'Estados de Projeto' : 'Programas de Financiamento');

  const currentMenuSubtitle = isVistaGeral
      ? `${overviewProjectsCount} projeto${overviewProjectsCount === 1 ? '' : 's'} listado${overviewProjectsCount === 1 ? '' : 's'} agrupado${overviewProjectsCount === 1 ? '' : 's'} por programa.`
      : isSearchActive
      ? `${projetosFiltrados.length} projeto${projetosFiltrados.length === 1 ? '' : 's'} encontrado${projetosFiltrados.length === 1 ? '' : 's'} na pesquisa.`
      : isProjectListOpen
          ? `${projetosFiltrados.length} projeto${projetosFiltrados.length === 1 ? '' : 's'} encontrado${projetosFiltrados.length === 1 ? '' : 's'}.`
          : selectedCategoria
              ? 'Escolhe agora o estado para filtrar estes projetos.'
              : selectedEstado
                  ? 'Escolhe agora o tipo de projeto dentro deste estado.'
                  : 'Escolhe por onde queres começar a navegar.';

  if (loading) return <div className="page-container"><PaginaSkeleton /></div>;

  let vistaGeralView = null;
  if (isVistaGeral) {
      const overviewProjects = projetosFiltrados.filter(matchesOverviewFilters);
          const isMonthlyTab = overviewTab === "anual" || overviewTab === "incentivo";
    const monthlyConfig = overviewTab === "incentivo"
      ? { requestField: "valor_incentivo", projectField: "incentivo", file: "incentivo", title: "Incentivo" }
      : { requestField: "valor_investimento", projectField: "investimento", file: "investimento", title: "Investimento" };

    const getEntityBudget = (projectId, entityId) =>
        projetoEntidades.find((r) => String(r.projeto_id) === String(projectId) && String(r.entidade_id) === String(entityId));

    const getRequestedTotal = (project, entityId = null) =>
        pedidosReembolso
            .filter((r) => String(r.projeto_id) === String(project.id) &&
            (!entityId || String(r.entidade_id || project.cliente_id) === String(entityId)))
            .reduce((t, r) => t + (Number(r[monthlyConfig.requestField]) || 0), 0);

    const getMonthlyRate = (project, entityId = null) => {
        const base = entityId
            ? Number(getEntityBudget(project.id, entityId)?.[monthlyConfig.projectField] || 0)
            : Number(project[monthlyConfig.projectField] || 0);
        return base > 0 ? `${((getRequestedTotal(project, entityId) / base) * 100).toFixed(1)}%` : "0.0%";
        };

    const buildMonthlyRows = (projects) => projects.flatMap((project) => {
        const ids = [...new Set([project.cliente_id, ...(project.is_parceria ? normalizeIdsList(project.parceiros_ids) : [])]
            .filter(Boolean).map(String))]
            .filter((id) => !overviewEntityFilter || id === String(overviewEntityFilter));
        return ids.map((entityId) => ({ project, entityId }));
        });

      const getLastReimbursementDate = (project) => {
          const projectRequests = pedidosReembolso
              .filter((request) => String(request.projeto_id) === String(project.id))
              .map((request) => request.data_pedido)
              .filter(Boolean)
              .sort((a, b) => String(b).localeCompare(String(a)));
          return projectRequests[0] ||
              project.data_ultimo_pedido_reembolso ||
              project.data_ultimo_reembolso ||
              project.ultimo_pedido_reembolso ||
              project.ultimo_reembolso ||
              project.data_reembolso ||
              "";
      };
      const getDaysSinceLastReimbursement = (project) => {
          const lastRequestDate = parseOverviewDate(getLastReimbursementDate(project));
          if (!lastRequestDate) return null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          lastRequestDate.setHours(0, 0, 0, 0);
          return Math.max(0, Math.floor((today.getTime() - lastRequestDate.getTime()) / 86400000));
      };
      const hasReimbursementOverdue = (project) => {
          const lastRequestDate = parseOverviewDate(getLastReimbursementDate(project));
          if (!lastRequestDate) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const threeMonthsLater = new Date(lastRequestDate);
          threeMonthsLater.setHours(0, 0, 0, 0);
          threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
          return today >= threeMonthsLater;
      };
      const parseOverviewDate = (value) => {
          if (!value) return null;
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? null : date;
      };
      const hasValidOverviewDateRange = (project) => {
          if (!project.data_inicio || !project.data_fim) return true;
          return project.data_inicio <= project.data_fim;
      };
      const ganttDates = overviewProjects
          .filter(hasValidOverviewDateRange)
          .flatMap((project) => [parseOverviewDate(project.data_inicio), parseOverviewDate(project.data_fim)])
          .filter(Boolean);
      const ganttStart = ganttDates.length ? new Date(Math.min(...ganttDates.map((date) => date.getTime()))) : new Date();
      const ganttEnd = ganttDates.length ? new Date(Math.max(...ganttDates.map((date) => date.getTime()))) : new Date(ganttStart);
      if (ganttStart.getTime() === ganttEnd.getTime()) ganttEnd.setDate(ganttEnd.getDate() + 1);
      const ganttTotalDays = Math.max(1, Math.ceil((ganttEnd - ganttStart) / 86400000));
      const ganttYearMarkers = [];
      for (let year = ganttStart.getFullYear(); year <= ganttEnd.getFullYear(); year += 1) {
          const yearStart = new Date(year, 0, 1);
          const position = year === ganttStart.getFullYear()
              ? 0
              : Math.max(0, Math.min(100, ((yearStart - ganttStart) / 86400000) / ganttTotalDays * 100));
          ganttYearMarkers.push({ year, position });
      }
      const ganttYearLabels = ganttYearMarkers.filter((marker, index) => (
          index === 0 || marker.position - ganttYearMarkers[index - 1].position >= 4
      ));
      const formatOverviewDate = (value) => value ? new Date(value).toLocaleDateString("pt-PT") : "-";
      const formatOverviewCurrency = (value) => Number(value || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const openProjectDetails = (project) => {
          if (project?.id) navigate(`/dashboard/projetos/${project.id}`);
      };
      const getEntityName = (entityId, project = null) => {
          const normalizedId = String(entityId || "").trim();
          if (!normalizedId) return "";
          const entity = clientes.find((client) => String(client.id) === normalizedId);
          if (entity) return entity.marca?.trim() || entity.entidade?.trim() || "";
          if (project && String(project.cliente_id) === normalizedId && project.clientes) {
              return project.clientes.marca?.trim() || project.clientes.entidade?.trim() || "";
          }
          return "";
      };
      const getProjectInvolvedEntities = (project) => {
          const entityIds = [
              project.cliente_id,
              ...normalizeIdsList(project.parceiros_ids)
          ].map((id) => String(id || "").trim()).filter(Boolean);
          const uniqueEntityIds = [...new Set(entityIds)];
          const entityNames = uniqueEntityIds.map((entityId) => getEntityName(entityId, project)).filter(Boolean);
          return [...new Set(entityNames)].join(" / ");
      };
      /** TXE: soma do valor_investimento dos pedidos de reembolso / investimento do projeto. */
      const getExecutionRate = (project) => {
          const projectInvestment = Number(project.investimento || 0);
          const requestedInvestment = pedidosReembolso
              .filter((request) => String(request.projeto_id) === String(project.id))
              .reduce((total, request) => total + (Number(request.valor_investimento) || 0), 0);
          return projectInvestment > 0 ? `${((requestedInvestment / projectInvestment) * 100).toFixed(1)}%` : "0.0%";
      };
      const exportOverview = (filename, headers, rows) => {
          const csv = [headers, ...rows]
              .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";"))
              .join("\r\n");
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
          registarEvento("exportacao", { area: "Projetos (visão geral)", linhas: rows.length });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
      };
      const exportCurrentOverview = () => {
    if (isMonthlyTab) {
        exportOverview(
            `${monthlyConfig.file}-reembolsos-${anualYear}.csv`,
            ["Entidades", "Projeto", "Programa", ...MESES.map((m) => `${m} ${anualYear}`), `Total ${anualYear}`, "TXE"],
            buildMonthlyRows(activeOverviewRows).map(({ project, entityId }) => {
                const months = getMonthlyRequests(project, anualYear, entityId);
                return [
                    getEntityName(entityId, project),
                    project.titulo || "",
                    getProjectProgramName(project),
                    ...months,
                    sumArray(months),
                    getMonthlyRate(project, entityId)
                ];
            })
        );
        return;
    }

    exportOverview(
        "mapa-gantt-projetos.csv",
        ["Entidades", "Programa", "Projeto", "Data início", "Data fim", "Investimento (EUR)", "Incentivo (EUR)", "Taxa de execução", "Data último pedido reembolso", "Dias desde último pedido"],
        activeOverviewRows.map((project) => [
            getProjectInvolvedEntities(project),
            getProjectProgramName(project),
            project.titulo || "",
            project.data_inicio || "",
            project.data_fim || "",
            project.investimento || 0,
            project.incentivo || 0,
            getExecutionRate(project),
            getLastReimbursementDate(project),
            getDaysSinceLastReimbursement(project) ?? ""
        ])
    );
};

const exportCurrentOverviewPdf = () => {
    if (isMonthlyTab) {
        const pdfAnual = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
        pdfAnual.setFontSize(14);
        pdfAnual.text(`Pedidos de Reembolso (${monthlyConfig.title}) - ${anualYear}`, 14, 13);
        autoTable(pdfAnual, {
            startY: 20,
            head: [["Projetos / Programas", "Entidades", ...MESES, "Total", "TXE"]],
            body: buildMonthlyRows(activeOverviewRows)
                .filter((r) => !hideEmptyProjects || monthlyRowHasRequests(r))
                .map(({ project, entityId }) => {
                    const months = getMonthlyRequests(project, anualYear, entityId);
                    return [
                        `${project.titulo || "Sem título"}\n${getProjectProgramName(project)}`,
                        getEntityName(entityId, project) || "-",
                        ...months.map((v) => (v > 0 ? formatOverviewCurrency(v) : "-")),
                        formatOverviewCurrency(sumArray(months)),
                        getMonthlyRate(project, entityId)
                    ];
                }),
            theme: "grid",
            styles: { fontSize: 6.5, cellPadding: 1.5, valign: "middle" },
            headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
            columnStyles: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [i + 2, { halign: "right" }]))
        });
        pdfAnual.save(`reembolsos-${monthlyConfig.file}-${anualYear}.pdf`);
        return;
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(14);
    pdf.text("Vista Geral de Projetos", 14, 13);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${activeOverviewRows.length} projeto${activeOverviewRows.length === 1 ? "" : "s"} listado${activeOverviewRows.length === 1 ? "" : "s"} | ${formatOverviewDate(ganttStart)} - ${formatOverviewDate(ganttEnd)}`, 14, 19);

    autoTable(pdf, {
        startY: 23,
        head: [["Entidades", "Projetos / Programas", "Execução", "Investimento (EUR)", "Incentivo (EUR)", "TXE", "Último pedido / dias"]],
        body: activeOverviewRows.map((project) => [
            getProjectInvolvedEntities(project) || "-",
            `${project.titulo || "Sem título"}\n${getProjectProgramName(project)}`,
            `${formatOverviewDate(project.data_inicio)} - ${formatOverviewDate(project.data_fim)}`,
            formatOverviewCurrency(project.investimento),
            formatOverviewCurrency(project.incentivo),
            getExecutionRate(project),
            `${formatOverviewDate(getLastReimbursementDate(project))}${getDaysSinceLastReimbursement(project) !== null ? `\n${getDaysSinceLastReimbursement(project)} dias` : ""}${hasReimbursementOverdue(project) ? "\n+3 meses" : ""}`
        ]),
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
        headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 62 }, 2: { cellWidth: 48 }, 3: { cellWidth: 25, halign: "right" }, 4: { cellWidth: 25, halign: "right" }, 5: { cellWidth: 16, halign: "center" }, 6: { cellWidth: 32 } }
    });
    pdf.save("vista-geral-projetos.pdf");
};
      const compareOverviewPrograms = (a, b) => {
          const programA = getProjectProgramName(a);
          const programB = getProjectProgramName(b);
          const hasProgramA = programA !== "Sem Programa Associado";
          const hasProgramB = programB !== "Sem Programa Associado";
          if (hasProgramA !== hasProgramB) return hasProgramA ? -1 : 1;
          return programA.localeCompare(programB, "pt-PT", { sensitivity: "base" });
      };
      const compareOverviewDefault = (a, b) => {
          const programComparison = compareOverviewPrograms(a, b);
          if (programComparison !== 0) return programComparison;
          return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-PT", { sensitivity: "base" });
      };
      const getOverviewSortValue = (project, key) => {
          if (key === "program") return getProjectProgramName(project);
          if (key === "project") return project.titulo || "";
          if (key === "entities") return getProjectInvolvedEntities(project);
          if (key === "execution") return parseOverviewDate(project.data_inicio)?.getTime() ?? Number.POSITIVE_INFINITY;
          if (key === "investment") return Number(project.investimento || 0);
          if (key === "incentive") return Number(project.incentivo || 0);
          if (key === "executionRate") {
                const base = Number(project[monthlyConfig.projectField] || 0);
                return base > 0 ? getRequestedTotal(project) / base : 0;
            }
          if (key === "reimbursement") return parseOverviewDate(getLastReimbursementDate(project))?.getTime() ?? 0;
          return "";
      };
      const sortOverviewRows = (rows) => {
          if (!overviewSort.key || !overviewSort.direction) return [...rows].sort(compareOverviewDefault);
          const directionMultiplier = overviewSort.direction === "asc" ? 1 : -1;
          return [...rows].sort((a, b) => {
              const valueA = getOverviewSortValue(a, overviewSort.key);
              const valueB = getOverviewSortValue(b, overviewSort.key);
              let comparison;
              if (typeof valueA === "number" && typeof valueB === "number") {
                  comparison = valueA - valueB;
              } else {
                  comparison = String(valueA).localeCompare(String(valueB), "pt-PT", { sensitivity: "base" });
              }
              return comparison !== 0 ? comparison * directionMultiplier : compareOverviewDefault(a, b);
          });
      };
      const cycleOverviewSort = (key) => {
          setOverviewSort((current) => {
              if (current.key !== key || current.direction === null) return { key, direction: "asc" };
              if (current.direction === "asc") return { key, direction: "desc" };
              return DEFAULT_OVERVIEW_SORT;
          });
      };
      const activeOverviewRows = sortOverviewRows(overviewProjects);
      const unassignedOverviewProjects = activeOverviewRows.filter((project) => getProjectProgramName(project) === "Sem Programa Associado");
      const visibleOverviewRows = showUnassignedOverviewProjects
          ? activeOverviewRows
          : activeOverviewRows.filter((project) => getProjectProgramName(project) !== "Sem Programa Associado");

      const ITEMS_PER_PAGE = overviewItemsPerPage === "all" ? visibleOverviewRows.length : overviewItemsPerPage;      const totalOverviewPages = Math.ceil(visibleOverviewRows.length / ITEMS_PER_PAGE);
      const paginatedOverviewRows = visibleOverviewRows.slice(
          (overviewPage - 1) * ITEMS_PER_PAGE, 
          overviewPage * ITEMS_PER_PAGE
      );
      const isOverviewFiltered = Boolean(overviewTypeFilter || overviewProgramFilter || overviewStateFilter || overviewEntityFilter);
      const totalOverviewInvestimento = visibleOverviewRows.reduce((acc, p) => acc + (Number(p.investimento) || 0), 0);
      const totalOverviewIncentivo = visibleOverviewRows.reduce((acc, p) => acc + (Number(p.incentivo) || 0), 0);
      const isAllItems = overviewItemsPerPage === "all";
      const limit = isAllItems ? visibleOverviewRows.length : Number(overviewItemsPerPage) || 10;
      const overviewProgramColors = ["#2563eb", "#db2777", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#0f766e"];
      const overviewProgramNames = [...new Set(overviewProjects.map(getProjectProgramName))].sort((a, b) => {
          const aIsUnassigned = a === "Sem Programa Associado";
          const bIsUnassigned = b === "Sem Programa Associado";
          if (aIsUnassigned !== bIsUnassigned) return aIsUnassigned ? 1 : -1;
          return a.localeCompare(b, "pt-PT", { sensitivity: "base" });
      });
      const getOverviewProgramColor = (programName) => {
          const index = overviewProgramNames.indexOf(programName);
          return overviewProgramColors[index >= 0 ? index % overviewProgramColors.length : 0];
      };
      const getOverviewProgramCode = (programName) => {
          const program = programas.find((item) => {
              const fullName = item.codigo ? `${item.codigo} - ${item.nome}` : item.nome;
              return fullName === programName;
          });
          return program?.codigo || programName;
      };

      const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

    // Lê ano/mês diretamente da string (evita problemas de fuso horário)
    const getYearMonth = (value) => {
        const [y, m] = String(value || "").slice(0, 10).split("-").map(Number);
        return y && m ? { year: y, month: m - 1 } : null;
    };

    const availableYears = [...new Set([
        new Date().getFullYear(),
        ...pedidosReembolso.map((r) => getYearMonth(r.data_pedido)?.year).filter(Boolean)
    ])].sort((a, b) => b - a);

    const getMonthlyRequests = (project, year, entityId = null) => {
        const months = Array(12).fill(0);
        pedidosReembolso.forEach((r) => {
            if (String(r.projeto_id) !== String(project.id)) return;
            if (entityId && String(r.entidade_id || project.cliente_id) !== String(entityId)) return;
            const ym = getYearMonth(r.data_pedido);
            if (!ym || ym.year !== year) return;
            months[ym.month] += Number(r[monthlyConfig.requestField]) || 0;
        });
        return months;
    };

    const sumArray = (arr) => arr.reduce((a, b) => a + b, 0);

    const monthlyRowHasRequests = ({ project, entityId }) =>
    sumArray(getMonthlyRequests(project, anualYear, entityId)) > 0;

    const monthlyBaseRows = (isMonthlyTab && hideEmptyProjects)
        ? visibleOverviewRows.filter((p) => buildMonthlyRows([p]).some(monthlyRowHasRequests))
        : visibleOverviewRows;

    const monthlyTotalPages = Math.max(1, Math.ceil(monthlyBaseRows.length / (ITEMS_PER_PAGE || 1)));
    const monthlyPagedRows = monthlyBaseRows.slice(
        (overviewPage - 1) * ITEMS_PER_PAGE,
        overviewPage * ITEMS_PER_PAGE
);

    // Totais por mês de todos os projetos visíveis (não só da página atual)
    const anualMonthTotals = Array(12).fill(0);
    visibleOverviewRows.forEach((p) => {
        getMonthlyRequests(p, anualYear).forEach((v, i) => { anualMonthTotals[i] += v; });
    });
    const anualGrandTotal = sumArray(anualMonthTotals);
    const totalRequestedAllTime = visibleOverviewRows.reduce((acc, p) => acc + getRequestedTotal(p), 0);
    const footerBase = overviewTab === "incentivo" ? totalOverviewIncentivo : totalOverviewInvestimento;
    const footerTxe = footerBase > 0 ? `${((totalRequestedAllTime / footerBase) * 100).toFixed(1)}%` : "0.0%";

      // ---------- Dados extra só para a apresentação ----------
      const vgTodayPos = (() => {
          const t = new Date(); t.setHours(0, 0, 0, 0);
          if (t < ganttStart || t > ganttEnd) return null;
          return ((t - ganttStart) / 86400000) / ganttTotalDays * 100;
      })();
      const vgOverdueCount = visibleOverviewRows.filter(hasReimbursementOverdue).length;
      const vgYearProjects = visibleOverviewRows.filter((p) => sumArray(getMonthlyRequests(p, anualYear)) > 0).length;
      const vgMaxMonthValue = Math.max(1, ...monthlyBaseRows.flatMap((p) => buildMonthlyRows([p]).flatMap(({ project, entityId }) => getMonthlyRequests(project, anualYear, entityId))));
      const vgSortIcon = (key) => (overviewSort.key !== key ? '↕' : overviewSort.direction === 'asc' ? '↑' : '↓');
      const vgHead = (key, label, extra = '') => (
          <button type="button" onClick={() => cycleOverviewSort(key)} aria-label={`Ordenar ${label}`} title={`Ordenar por ${label}`} className={`po-vg-sort ${overviewSort.key === key ? 'is-on' : ''}`}>
              <span>{extra || label}</span><i aria-hidden="true">{vgSortIcon(key)}</i>
          </button>
      );
      const vgPagination = (
          <div className="po-vg-pager">
              <label className="po-vg-perpage">
                  <span>Mostrar:</span>
                  <SelectModerno value={overviewItemsPerPage} onChange={(e) => setOverviewItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                      <option value={10}>10 projetos</option>
                      <option value={20}>20 projetos</option>
                      <option value="all">Todos</option>
                  </SelectModerno>
              </label>
              {totalOverviewPages > 1 && (
                  <div className="po-vg-pages">
                      <button type="button" onClick={() => setOverviewPage((p) => Math.max(1, p - 1))} disabled={overviewPage === 1} aria-label="Página anterior"><Icons.ArrowLeft size={15} /></button>
                      <span>Página {overviewPage} de {totalOverviewPages}</span>
                      <button type="button" onClick={() => setOverviewPage((p) => Math.min(totalOverviewPages, p + 1))} disabled={overviewPage === totalOverviewPages} aria-label="Página seguinte"><Icons.ArrowRight size={15} /></button>
                  </div>
              )}
          </div>
      );
      const vgProgramChip = (project) => {
          const name = getProjectProgramName(project);
          return <span className="po-vg-prog" style={{ '--pc': getOverviewProgramColor(name) }} title={name}>{getOverviewProgramCode(name)}</span>;
      };
      const vgCodes = (project) => (project.numero_projeto || project.codigo_projeto) ? (
          <span className="po-vg-codes">
              {project.numero_projeto ? `Nº ${project.numero_projeto}` : ''}
              {project.numero_projeto && project.codigo_projeto ? ' • ' : ''}
              {project.codigo_projeto || ''}
          </span>
      ) : null;

      vistaGeralView = (
          <div className="po-vg">
              {/* INDICADORES */}
              <div className="po-vg-kpis">
                  {overviewTab === 'overview' ? (
                      <>
                          <div className="po-vg-kpi"><small>Projetos</small><strong>{visibleOverviewRows.length}</strong><em>{isOverviewFiltered ? 'com os filtros atuais' : 'na vista geral'}</em></div>
                          <div className="po-vg-kpi"><small>Invest. (EUR)</small><strong>{formatOverviewCurrency(totalOverviewInvestimento)} €</strong></div>
                          <div className="po-vg-kpi"><small>Incentivo (EUR)</small><strong>{formatOverviewCurrency(totalOverviewIncentivo)} €</strong></div>
                          <div className="po-vg-kpi is-accent"><small>TXE</small><strong>{footerTxe}</strong><span className="po-vg-kpi-bar"><i style={{ width: `${Math.min(100, parseFloat(footerTxe) || 0)}%` }} /></span></div>
                          <div className={`po-vg-kpi ${vgOverdueCount ? 'is-alert' : ''}`}><small>+3 meses sem pedido</small><strong>{vgOverdueCount}</strong><em>{vgOverdueCount ? 'projetos a precisar de atenção' : 'tudo em dia'}</em></div>
                      </>
                  ) : (
                      <>
                          <div className="po-vg-kpi"><small>Total {anualYear}</small><strong>{formatOverviewCurrency(anualGrandTotal)} €</strong><em>{monthlyConfig.title}</em></div>
                          <div className="po-vg-kpi is-accent"><small>TXE</small><strong>{footerTxe}</strong><span className="po-vg-kpi-bar"><i style={{ width: `${Math.min(100, parseFloat(footerTxe) || 0)}%` }} /></span></div>
                          <div className="po-vg-kpi"><small>Projetos com pedidos em {anualYear}</small><strong>{vgYearProjects}</strong><em>de {visibleOverviewRows.length}</em></div>
                      </>
                  )}
              </div>

              {/* FERRAMENTAS */}
              <div className="po-vg-toolbar">
                  <div className="po-seg" role="tablist" aria-label="Vista">
                      {[{ id: "overview", label: "Overview" }, { id: "anual", label: "Investimento" }, { id: "incentivo", label: "Incentivo" }].map((tab) => (
                          <button key={tab.id} type="button" role="tab" aria-selected={overviewTab === tab.id} className={overviewTab === tab.id ? 'is-on' : ''} onClick={() => setOverviewTab(tab.id)}>{tab.label}</button>
                      ))}
                  </div>
                  {isMonthlyTab && (
                      <label className="po-vg-field is-inline">
                          <span>Ano</span>
                          <SelectModerno value={anualYear} onChange={(e) => setAnualYear(Number(e.target.value))}>
                              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                          </SelectModerno>
                      </label>
                  )}
                  <div className="po-vg-exports">
                      <button type="button" className="po-btn" onClick={exportCurrentOverview}><Icons.FileText size={15} /> Exportar CSV</button>
                      <button type="button" className="po-btn is-primary" onClick={exportCurrentOverviewPdf}><Icons.FileText size={15} /> Exportar PDF</button>
                  </div>
              </div>

              <div className="po-vg-filters">
                  <span className="po-vg-count">{overviewProjectsCount} projeto{overviewProjectsCount === 1 ? '' : 's'}</span>
                  <label className="po-vg-field">
                      <span>Tipo de projeto</span>
                      <SelectModerno value={overviewTypeFilter} onChange={(event) => setOverviewTypeFilter(event.target.value)}>
                          <option value="">Todos os tipos</option>
                          {[...tipos].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-PT", { sensitivity: "base" })).map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>)}
                          <option value="sem-tipo">Sem tipo de projeto</option>
                      </SelectModerno>
                  </label>
                  <label className="po-vg-field">
                      <span>Programa</span>
                      <SelectModerno value={overviewProgramFilter} onChange={(event) => setOverviewProgramFilter(event.target.value)}>
                          <option value="">Todos os programas</option>
                          {[...programas].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-PT", { sensitivity: "base" })).map((program) => <option key={program.id} value={program.id}>{program.codigo ? `${program.codigo} - ${program.nome}` : program.nome}</option>)}
                          <option value="sem-programa">Sem programa associado</option>
                      </SelectModerno>
                  </label>
                  <label className="po-vg-field">
                      <span>Estado</span>
                      <SelectModerno value={overviewStateFilter} onChange={(event) => setOverviewStateFilter(event.target.value)}>
                          <option value="">Todos os estados</option>
                          {estadosProjeto.map((est) => <option key={est.id} value={est.id}>{est.nome}</option>)}
                      </SelectModerno>
                  </label>
                  <label className="po-vg-field">
                      <span>Entidade</span>
                      <SelectModerno value={overviewEntityFilter} onChange={(event) => setOverviewEntityFilter(event.target.value)}>
                          <option value="">Todas as entidades</option>
                          {[...clientes]
                              .filter((c) => !c.eh_organismo)
                              .sort((a, b) => String(getClientDisplayName(a) || a.marca || "").localeCompare(String(getClientDisplayName(b) || b.marca || ""), "pt-PT", { sensitivity: "base" }))
                              .map((client) => <option key={client.id} value={client.id}>{getClientDisplayName(client) || client.marca}</option>)}
                      </SelectModerno>
                  </label>
                  {isMonthlyTab && (
                      <button type="button" onClick={() => setHideEmptyProjects((v) => !v)} className={`po-toggle ${hideEmptyProjects ? 'is-on' : ''}`} aria-pressed={hideEmptyProjects}>
                          <span className="po-toggle-track"><span /></span> {hideEmptyProjects ? "Mostrar a 0's" : "Ocultar a 0's"}
                      </button>
                  )}
                  {(overviewTypeFilter || overviewProgramFilter || overviewStateFilter || overviewEntityFilter) && (
                      <button type="button" className="po-vg-clear" onClick={() => { setOverviewTypeFilter(""); setOverviewProgramFilter(""); setOverviewStateFilter(""); setOverviewEntityFilter(""); }}>
                          <Icons.Close size={13} /> Limpar filtros
                      </button>
                  )}
              </div>

              <div className="po-vg-card">
                  <div className="po-vg-scroll">
                      {overviewTab === "overview" && (
                          <table className="po-vg-table is-overview">
                              <thead>
                                  <tr>
                                      <th style={{ width: '13%' }}>{vgHead("entities", "entidades", "Entidades")}</th>
                                      <th style={{ width: '20%' }}>{vgHead("project", "projeto", "Projetos / Programas")}</th>
                                      <th style={{ width: '27%' }}>{vgHead("execution", "execução", `Execução (${formatOverviewDate(ganttStart)} - ${formatOverviewDate(ganttEnd)})`)}</th>
                                      <th style={{ width: '10%' }} className="is-num">{vgHead("investment", "investimento", "Invest. (EUR)")}</th>
                                      <th style={{ width: '10%' }} className="is-num">{vgHead("incentive", "incentivo", "Incentivo (EUR)")}</th>
                                      <th style={{ width: '8%' }}>{vgHead("executionRate", "taxa de execução", "TXE")}</th>
                                      <th style={{ width: '12%' }}>{vgHead("reimbursement", "último pedido de reembolso", "Último pedido")}</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {paginatedOverviewRows.map((project) => {
                                      const start = parseOverviewDate(project.data_inicio);
                                      const end = parseOverviewDate(project.data_fim) || start;
                                      const hasInvalidDateRange = !hasValidOverviewDateRange(project);
                                      const left = !hasInvalidDateRange && start ? Math.max(0, ((start - ganttStart) / 86400000) / ganttTotalDays * 100) : 0;
                                      const width = !hasInvalidDateRange && start && end ? Math.max(1, ((end - start) / 86400000) / ganttTotalDays * 100) : 1;
                                      const programColor = getOverviewProgramColor(getProjectProgramName(project));
                                      const daysSinceLastRequest = getDaysSinceLastReimbursement(project);
                                      const reimbursementOverdue = hasReimbursementOverdue(project);
                                      const txe = getExecutionRate(project);
                                      return (
                                          <tr key={project.id} {...clicavel(() => openProjectDetails(project), { papel: null })} style={{ '--pc': programColor }}>
                                              <td className="po-vg-ent">{getProjectInvolvedEntities(project) || "-"}</td>
                                              <td>
                                                  <div className="po-vg-proj">
                                                      <strong>{project.titulo || 'Sem título'}</strong>
                                                      <span className="po-vg-proj-meta">{vgProgramChip(project)}{vgCodes(project)}</span>
                                                  </div>
                                              </td>
                                              <td className="po-vg-exec">
                                                  <div className={`po-vg-track ${hasInvalidDateRange ? 'is-invalid' : ''}`}>
                                                      {ganttYearMarkers.map((marker) => <span key={marker.year} className="po-vg-year" style={{ left: `${marker.position}%` }} title={String(marker.year)} />)}
                                                      {ganttYearLabels.map((marker) => <em key={`label-${marker.year}`} className="po-vg-year-label" style={{ left: `${marker.position}%` }}>{marker.year}</em>)}
                                                      {vgTodayPos !== null && <span className="po-vg-today" style={{ left: `${vgTodayPos}%` }} title="Hoje" />}
                                                      {hasInvalidDateRange ? (
                                                          <span className="po-vg-invalid" title="Este projeto precisa de ser retificado: a Data de Início é posterior à Data de Fim." aria-label="Projeto precisa de ser retificado"><Icons.Alert size={15} color="currentColor" /> Datas a retificar</span>
                                                      ) : (
                                                          <span className="po-vg-bar" style={{ left: `${left}%`, width: `${width}%` }} title={`${formatOverviewDate(project.data_inicio)} - ${formatOverviewDate(project.data_fim)}`} />
                                                      )}
                                                  </div>
                                              </td>
                                              <td className="is-num">{formatOverviewCurrency(project.investimento)}</td>
                                              <td className="is-num">{formatOverviewCurrency(project.incentivo)}</td>
                                              <td>
                                                  <div className="po-vg-txe">
                                                      <b>{txe}</b>
                                                      <span><i style={{ width: `${Math.min(100, parseFloat(txe) || 0)}%` }} /></span>
                                                  </div>
                                              </td>
                                              <td className="po-vg-last">
                                                  <strong>{formatOverviewDate(getLastReimbursementDate(project))}</strong>
                                                  {daysSinceLastRequest !== null && <span className={reimbursementOverdue ? 'is-late' : ''}>{daysSinceLastRequest} {daysSinceLastRequest === 1 ? 'dia' : 'dias'}</span>}
                                                  {reimbursementOverdue && <em title="Já passaram 3 meses desde o último pedido de reembolso." aria-label="Já passaram 3 meses desde o último pedido de reembolso."><Icons.Alert size={11} color="currentColor" /> +3 meses</em>}
                                              </td>
                                          </tr>
                                      );
                                  })}
                                  {paginatedOverviewRows.length === 0 && (
                                      <tr className="is-empty"><td colSpan={7}>Não há projetos a corresponder aos critérios.</td></tr>
                                  )}
                              </tbody>
                              <tfoot>
                                  <tr>
                                      <td colSpan={3} className="po-vg-total-label">{isOverviewFiltered ? "Total dos projetos filtrados:" : "Total de todos os projetos:"}</td>
                                      <td className="is-num">{formatOverviewCurrency(totalOverviewInvestimento)} €</td>
                                      <td className="is-num">{formatOverviewCurrency(totalOverviewIncentivo)} €</td>
                                      <td><b className="po-vg-total-txe">{footerTxe}</b></td>
                                      <td></td>
                                  </tr>
                              </tfoot>
                          </table>
                      )}

                      {isMonthlyTab && (
                          <table className="po-vg-table is-monthly">
                              <colgroup>
                                  <col style={{ width: '230px' }} />
                                  <col style={{ width: '160px' }} />
                                  {MESES.map((m) => <col key={m} style={{ width: '62px' }} />)}
                                  <col style={{ width: '110px' }} />
                                  <col style={{ width: '76px' }} />
                              </colgroup>
                              <thead>
                                  <tr>
                                      <th>{vgHead("project", "projeto", "Projetos / Programas")}</th>
                                      <th>{vgHead("entities", "entidades", "Entidades")}</th>
                                      {MESES.map((m) => <th key={m} className="is-month">{m}</th>)}
                                      <th className="is-num">Total {anualYear}</th>
                                      <th>{vgHead("executionRate", "taxa de execução", "TXE")}</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {(() => {
                                      const rows = buildMonthlyRows(monthlyPagedRows).filter((r) => !hideEmptyProjects || monthlyRowHasRequests(r));
                                      if (rows.length === 0) return <tr className="is-empty"><td colSpan={MESES.length + 4}>Sem pedidos de reembolso para mostrar em {anualYear}.</td></tr>;
                                      return rows.map(({ project, entityId }, idx) => {
                                          const programColor = getOverviewProgramColor(getProjectProgramName(project));
                                          const months = getMonthlyRequests(project, anualYear, entityId);
                                          const isFirstOfProject = idx === 0 || rows[idx - 1].project.id !== project.id;
                                          const span = isFirstOfProject ? rows.filter((r) => r.project.id === project.id).length : 0;
                                          return (
                                              <tr key={`${project.id}-${entityId}`} {...clicavel(() => openProjectDetails(project), { papel: null })} style={{ '--pc': programColor }} className={isFirstOfProject ? 'is-first' : ''}>
                                                  {isFirstOfProject && (
                                                      <td rowSpan={span} className="po-vg-mproj">
                                                          <div className="po-vg-proj">
                                                              <strong>{project.titulo || 'Sem título'}</strong>
                                                              <span className="po-vg-proj-meta">{vgProgramChip(project)}{vgCodes(project)}</span>
                                                          </div>
                                                      </td>
                                                  )}
                                                  <td className="po-vg-ment">
                                                      {getEntityName(entityId, project) || "-"}
                                                      {project.is_parceria && String(entityId) === String(project.cliente_id) && <span className="po-vg-leader">LÍDER</span>}
                                                  </td>
                                                  {months.map((value, i) => (
                                                      <td key={i} className={`po-vg-cell ${value > 0 ? 'has-value' : ''}`} style={value > 0 ? { '--heat': Math.max(0.12, Math.min(1, value / vgMaxMonthValue)) } : undefined}>
                                                          {value > 0 ? formatOverviewCurrency(value) : "-"}
                                                      </td>
                                                  ))}
                                                  <td className="is-num po-vg-mtotal">{formatOverviewCurrency(sumArray(months))}</td>
                                                  <td className="po-vg-mtxe">{getMonthlyRate(project, entityId)}</td>
                                              </tr>
                                          );
                                      });
                                  })()}
                              </tbody>
                              <tfoot>
                                  <tr>
                                      <td colSpan={2} className="po-vg-total-label">{isOverviewFiltered ? "Total dos projetos filtrados:" : "Total de todos os projetos:"}</td>
                                      {anualMonthTotals.map((value, i) => <td key={i} className="po-vg-cell is-foot">{value > 0 ? formatOverviewCurrency(value) : "-"}</td>)}
                                      <td className="is-num po-vg-grand">{formatOverviewCurrency(anualGrandTotal)} €</td>
                                      <td><b className="po-vg-total-txe">{footerTxe}</b></td>
                                  </tr>
                              </tfoot>
                          </table>
                      )}
                  </div>

                  <div className="po-vg-foot">
                      <div className="po-vg-legend">
                          {overviewProgramNames.map((programName) => (
                              <span key={programName} title={programName} style={{ '--pc': getOverviewProgramColor(programName) }}><i />{getOverviewProgramCode(programName)}</span>
                          ))}
                          {overviewTab === 'overview' && vgTodayPos !== null && <span className="is-today"><i /> Hoje</span>}
                      </div>
                      {vgPagination}
                  </div>
              </div>
          </div>
      );
  }

  // ---------- Números do topo (respeitam "Os Meus" / "Empresa") ----------
  const heroToday = new Date(); heroToday.setHours(0, 0, 0, 0);
  const heroScope = projetos.filter((p) => checkUserInvolvement(p));
  const heroActive = heroScope.filter((p) => !['encerrado', 'cancelado', 'concluido'].includes(p.estado));
  const heroDaysTo = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return Math.round((x - heroToday) / 86400000); };
  const heroLate = heroActive.filter((p) => p.data_fim && heroDaysTo(p.data_fim) < 0).length;
  const heroSoon = heroActive.filter((p) => p.data_fim && heroDaysTo(p.data_fim) >= 0 && heroDaysTo(p.data_fim) <= 7).length;
  const heroRunning = heroActive.filter((p) => p.estado === 'em_curso').length;
  const scopeLabel = isVistaGeral ? 'Vista geral de todos os projetos, por programa.' : showOnlyMine ? 'Os projetos em que estás envolvido.' : 'Todos os projetos da empresa.';
  const activeLogLabel = activeLogTitle || 'Projeto em curso';

  return (
    <div className="page-container po-page">

      {/* HERO */}
      <header className="po-hero">
          <div className="po-hero-bg" aria-hidden="true"><span className="po-orb po-orb-a" /><span className="po-orb po-orb-b" /></div>

          <div className="po-hero-row">
              <div className="po-hero-main">
                  <span className="po-hero-icon"><Icons.Folder size={22} /></span>
                  <div>
                      <h1>{isVistaGeral ? 'Vista Geral' : 'Portfólio'}</h1>
                      <p>{scopeLabel}</p>
                  </div>
              </div>
              <div className="po-hero-stats">
                  <span className="po-stat"><strong>{heroActive.length}</strong> ativos</span>
                  <span className={`po-stat ${heroLate > 0 ? 'is-alert' : ''}`}><strong>{heroLate}</strong> em atraso</span>
                  <span className="po-stat"><strong>{heroSoon}</strong> terminam em 7 dias</span>
                  <span className="po-stat"><strong>{heroRunning}</strong> em curso</span>
              </div>
          </div>

          <div className="po-hero-row po-hero-tools">
              <div className="po-scope" role="tablist" aria-label="Âmbito">
                  <button type="button" role="tab" aria-selected={!isVistaGeral && showOnlyMine} className={!isVistaGeral && showOnlyMine ? 'is-on' : ''} onClick={() => { setPortfolioView("mine"); setShowOnlyMine(true); resetProjectMenus(); }}>
                      <Icons.User size={15} /> Os meus
                  </button>
                  <button type="button" role="tab" aria-selected={portfolioView === "company"} className={portfolioView === "company" ? 'is-on' : ''} onClick={() => { setPortfolioView("company"); setShowOnlyMine(false); resetProjectMenus(); }}>
                      <Icons.Globe size={15} /> Empresa
                  </button>
                  <button type="button" role="tab" aria-selected={isVistaGeral} className={isVistaGeral ? 'is-on' : ''} onClick={() => { setPortfolioView("overview"); setShowOnlyMine(false); resetProjectMenus(); }}>
                      <Icons.Grid size={15} /> Vista geral
                  </button>
              </div>

              <div className="po-hero-actions">
                  {activeLog && (
                      <div {...clicavel(() => navigate(activeLogRoute || '/dashboard/projetos'))} title="Ir para o item com cronómetro em curso" className="po-live">
                          <span className="po-live-dot" />
                          <span className="po-live-title">{activeLogLabel.length > 30 ? `${activeLogLabel.slice(0, 30)}...` : activeLogLabel}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleStopLog(e); }} className="po-live-stop"><Icons.Stop /> Parar</button>
                      </div>
                  )}
                  <button type="button" className="po-cta" onClick={handleNovo}><Icons.Plus size={16} /> Novo projeto</button>
              </div>
          </div>
      </header>

      {isVistaGeral ? vistaGeralView : (
        <>
          {/* BARRA DE NAVEGAÇÃO / FILTROS */}
          <div className="po-toolbar">
              <div className="po-seg" role="tablist" aria-label="Navegar por">
                  {[['tipo', 'Tipos'], ['estado', 'Estados'], ['programa', 'Programas']].map(([key, label]) => (
                      <button key={key} type="button" role="tab" aria-selected={menuPrincipal === key} className={menuPrincipal === key ? 'is-on' : ''} onClick={() => switchMenuPrincipal(key)}>{label}</button>
                  ))}
              </div>
              <label className="po-search">
                  <Icons.Search size={15} />
                  <input type="text" placeholder="Procurar projeto, código ou cliente…" value={busca} onChange={e => setBusca(e.target.value)} />
                  {busca && <button type="button" className="po-search-clear" onClick={() => setBusca("")} aria-label="Limpar pesquisa"><Icons.Close size={14} /></button>}
              </label>
              <button type="button" className={`po-toggle ${mostrarConcluidos ? 'is-on' : ''}`} onClick={() => setMostrarConcluidos(!mostrarConcluidos)} aria-pressed={mostrarConcluidos}>
                  <span className="po-toggle-track"><span /></span> Arquivados
              </button>
              {renderViewModeToggle()}
          </div>

          {/* CAMINHO (quando há uma lista aberta) */}
          {isProjectListOpen ? (
              <div className="po-crumb">
                  <button type="button" className="po-back" onClick={handleVoltarProjetos}><Icons.ArrowLeft /> {isSearchActive ? 'Limpar pesquisa' : 'Voltar'}</button>
                  <div className="po-crumb-text">
                      <h2>{currentMenuTitle}</h2>
                      <p>{currentMenuSubtitle}</p>
                  </div>
              </div>
          ) : (
              <div className="po-crumb is-home">
                  <div className="po-crumb-text">
                      <h2>{currentMenuTitle}</h2>
                      <p>{currentMenuSubtitle}</p>
                  </div>
              </div>
          )}

          <div className="po-content" key={`${menuPrincipal}-${isProjectListOpen ? 'list' : 'menu'}-${viewMode}`}>
              {!isProjectListOpen && (() => {
                  if (menuPrincipal === 'tipo') return renderMenuItems(tipoMenuItems, 'Sem tipos', 'Não existem tipos de projeto com projetos ativos.');
                  if (menuPrincipal === 'estado') return renderMenuItems(estadoMenuItems, 'Sem estados', 'Não existem projetos nestes estados.');
                  return renderMenuItems(programaMenuItems, 'Sem programas', 'Não existem programas de financiamento com projetos.');
              })()}

              {isProjectListOpen && (
                  Object.keys(groupedProjects).length > 0 ? (
                      Object.entries(groupedProjects).map(([groupName, projs], gi) => (
                          <section key={groupName} className="po-group" style={{ '--i': Math.min(gi, 8) }}>
                              <header className="po-group-head">
                                  <h3>{groupName}</h3>
                                  <span className="po-count">{projs.length}</span>
                                  <span className="po-group-line" />
                              </header>
                              {viewMode === "cards" ? (
                                  <div className="po-grid">
                                      {projs.map((p, i) => renderProjectCard(p, i))}
                                  </div>
                              ) : (
                                  <div className="po-table-wrap">
                                      <table className="po-table is-projects">
                                          <thead>
                                              <tr>
                                                  <th>Projeto</th>
                                                  <th>Cliente / entidade</th>
                                                  <th>Responsável</th>
                                                  <th>Prazo</th>
                                                  <th>Estado</th>
                                                  <th style={{ textAlign: 'right' }}>Ações</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {projs.map(p => renderProjectRow(p))}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </section>
                      ))
                  ) : renderEmpty('Vazio por aqui', 'Não há projetos a corresponder aos critérios.')
              )}
          </div>
        </>
      )}

      {/* 💡 MODAL DE CONFIRMAÇÃO GLOBAL */}
      {confirmDialog.show && (
          <ModalPortal>
              <div className="po-overlay" onClick={() => setConfirmDialog({show: false})}>
                  <div className="po-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog">
                      <span className={`po-dialog-icon ${confirmDialog.isDanger ? 'is-danger' : ''}`}><Icons.Alert size={26} color="currentColor" /></span>
                      <h3>Confirmação</h3>
                      <p>{confirmDialog.message}</p>
                      <div className="po-dialog-actions">
                          <button type="button" onClick={() => setConfirmDialog({show: false})} className="po-btn">Cancelar</button>
                          <button type="button" onClick={() => { confirmDialog.onConfirm(); }} className={`po-btn ${confirmDialog.isDanger ? 'is-danger' : 'is-primary'}`}>{confirmDialog.confirmText}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* 💡 MODAL DE AVISO (SUBSTITUTO DO ALERT) */}
      {alertDialog.show && (
          <ModalPortal>
              <div className="po-overlay" onClick={() => setAlertDialog({show: false, message: '', title: ''})}>
                  <div className="po-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog">
                      <span className="po-dialog-icon"><Icons.Alert size={26} color="currentColor" /></span>
                      <h3>{alertDialog.title || 'Aviso'}</h3>
                      <p>{alertDialog.message}</p>
                      <div className="po-dialog-actions">
                          <button type="button" onClick={() => setAlertDialog({show: false, message: '', title: ''})} className="po-btn is-primary">OK</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      <TimerSwitchModal
          open={timerSwitchModal.show}
          title="Trocar Cronometro Ativo"
          message={timerSwitchModal.message}
          onCancel={cancelTimerSwitch}
          onConfirm={confirmTimerSwitch}
      />

            <TimerSwitchModal
                open={attendanceWarningModal.show}
                title="Picagem de ponto em falta"
                message={attendanceWarningModal.message}
                cancelLabel="Não iniciar agora"
                confirmLabel="Sim, iniciar ponto"
                onCancel={() => handleAttendanceWarningChoice(false)}
                onConfirm={() => handleAttendanceWarningChoice(true)}
            />

      <StopTimerNoteModal
          open={stopNoteModal.show}
          analysisTargetLog={activeLog}
          title="Parar cronometro"
          message="Podes registar uma nota breve neste fecho (opcional)."
          placeholder="Ex: Fechado após alinhamento de objetivos"
          showCompleteOption={Boolean(activeLog)}
          showStatusOption={Boolean(activeLog)}
          completeLabel={getStopCompleteLabel(activeLog)}
          onCancel={closeStopNoteModal}
          onConfirm={confirmStopWithNote}
      />

      {projectTimerModal.show && (() => {
          const selectedAtividade = projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId));
          const atividadeDone = selectedAtividade?.estado === 'concluido';
          const projectClosed = projectTimerModal.project?.estado === 'encerrado' || projectTimerModal.project?.estado === 'cancelado';
          const cannotStart = projectTimerModal.loading || projectTimerModal.atividades.length === 0 || projectClosed;
          return (
          <ModalPortal>
              <div className="po-overlay" onClick={closeProjectTimerModal}>
                  <div className="po-modal" onClick={(e) => e.stopPropagation()}>
                      <header className="po-modal-head">
                          <span className="po-modal-icon is-go"><Icons.Play size={18} /></span>
                          <div className="po-modal-titles">
                              <small>Iniciar cronómetro</small>
                              <h3>{projectTimerModal.project?.titulo || 'Projeto selecionado'}</h3>
                              <p>Escolhe uma atividade e, se precisares, uma tarefa específica.</p>
                          </div>
                          <button type="button" onClick={closeProjectTimerModal} className="po-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                      </header>

                      <div className="po-modal-body">
                          {projectTimerModal.loading ? (
                              <div className="po-loading-inline"><span /><span /><span /> A carregar atividades e tarefas…</div>
                          ) : projectTimerModal.atividades.length === 0 ? (
                              <div className="po-empty is-compact">
                                  <span className="po-empty-icon"><Icons.ClipboardList size={26} /></span>
                                  <h3>Sem atividades neste projeto</h3>
                                  <p>Cria atividades no detalhe do projeto para iniciar por item.</p>
                              </div>
                          ) : (
                              <div className="po-pick">
                                  <section className="po-pick-col">
                                      <h4><span>1</span> Atividade</h4>
                                      <div className="po-pick-list custom-scrollbar">
                                          {projectTimerModal.atividades.map((atividade) => {
                                              const isSelected = String(atividade.id) === String(projectTimerModal.selectedAtividadeId);
                                              const isDone = atividade.estado === 'concluido';
                                              return (
                                                  <button
                                                      key={atividade.id}
                                                      type="button"
                                                      disabled={isDone}
                                                      onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedAtividadeId: atividade.id, selectedTaskId: "" }))}
                                                      className={`po-pick-item ${isSelected ? 'is-on' : ''} ${isDone ? 'is-done' : ''}`}
                                                  >
                                                      <span className="po-pick-radio" />
                                                      <span className="po-pick-text">
                                                          <strong>{atividade.titulo || 'Sem título'}</strong>
                                                          <em>{(atividade.tarefas || []).length} tarefa{(atividade.tarefas || []).length === 1 ? '' : 's'}{isDone ? ' · concluída' : ''}</em>
                                                      </span>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </section>

                                  <section className="po-pick-col">
                                      <h4><span>2</span> Tarefa <em>(opcional)</em></h4>
                                      <div className="po-pick-list custom-scrollbar">
                                          <button
                                              type="button"
                                              onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedTaskId: "" }))}
                                              disabled={atividadeDone}
                                              className={`po-pick-item is-level ${!projectTimerModal.selectedTaskId ? 'is-on' : ''} ${atividadeDone ? 'is-done' : ''}`}
                                          >
                                              <span className="po-pick-radio" />
                                              <span className="po-pick-text">
                                                  <strong>Trabalhar ao nível da atividade</strong>
                                                  <em>Sem escolher uma tarefa concreta</em>
                                              </span>
                                          </button>

                                          {(selectedAtividade?.tarefas || []).length > 0 ? (
                                              selectedAtividade.tarefas.map((tarefa) => {
                                                  const isSelected = String(tarefa.id) === String(projectTimerModal.selectedTaskId);
                                                  const isDone = tarefa.estado === 'concluido';
                                                  return (
                                                      <button
                                                          key={tarefa.id}
                                                          type="button"
                                                          disabled={isDone}
                                                          onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedTaskId: tarefa.id }))}
                                                          className={`po-pick-item ${isSelected ? 'is-on' : ''} ${isDone ? 'is-done' : ''}`}
                                                      >
                                                          <span className="po-pick-radio" />
                                                          <span className="po-pick-text">
                                                              <strong>{tarefa.titulo || 'Sem título'}</strong>
                                                              <em>{isDone ? 'Concluída' : 'Aberta'}</em>
                                                          </span>
                                                      </button>
                                                  );
                                              })
                                          ) : (
                                              <p className="po-pick-empty">Esta atividade não tem tarefas registadas.</p>
                                          )}
                                      </div>
                                  </section>
                              </div>
                          )}
                      </div>

                      <footer className="po-modal-foot">
                          <button type="button" onClick={closeProjectTimerModal} className="po-btn">Cancelar</button>
                          <button type="button" onClick={handleStartFromProjectSelection} disabled={cannotStart} className="po-btn is-go">
                              <Icons.Play /> Iniciar
                          </button>
                      </footer>
                  </div>
              </div>
          </ModalPortal>
          );
      })()}

{/* --- MODAL RÁPIDO "NOVA ENTIDADE" (por cima do wizard; líder / parceira / organismo) --- */}
      <Janela
          aberta={showModal && quickOrganismoModal.show}
          camada="calc(var(--z-modal) + 30)"
          aoFechar={closeQuickOrganismoModal}
          bloquear={quickOrganismoModal.isSubmitting}
          titulo={quickPapel === "organismo" ? "Novo organismo" : quickPapel === "parceiro" ? "Nova entidade parceira" : "Nova entidade"}
          subtitulo="Fica logo selecionada no projeto. Os restantes dados completam-se depois em Entidades."
          icone={<Icons.Building />}
          largura={540}
          rodape={<>
              <button type="button" onClick={closeQuickOrganismoModal}>Cancelar</button>
              <button type="submit" form="pj-form-entidade" className="is-primary" disabled={quickOrganismoModal.isSubmitting}>
                {quickOrganismoModal.isSubmitting ? "A criar…" : "Criar e selecionar"}
              </button>
          </>}
      >
            <form id="pj-form-entidade" onSubmit={createQuickOrganismo}>
              <div style={{display:'grid', gap:'14px'}}>
                <div>
                  <label className="bz-rotulo" htmlFor="qe-nif">NIF</label>
                  <input id="qe-nif" type="text" inputMode="numeric" value={quickOrganismoModal.nif} onChange={handleQuickOrganismoNifChange} placeholder="9 dígitos — preenche o resto automaticamente"  className="bz-campo" autoFocus />
                  <div className="bz-dica">Se o NIF já existir no Bizin, a entidade é selecionada em vez de duplicada.</div>
                </div>
                <div>
                  <label className="bz-rotulo" htmlFor="qe-marca">Nome *</label>
                  <input id="qe-marca" type="text" value={quickOrganismoModal.marca} onChange={e => setQuickOrganismoModal(prev => ({ ...prev, marca: e.target.value }))} required  className="bz-campo" />
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'12px'}}>
                  <div>
                    <label className="bz-rotulo" htmlFor="qe-sigla">Sigla</label>
                    <input id="qe-sigla" type="text" value={quickOrganismoModal.sigla} onChange={e => setQuickOrganismoModal(prev => ({ ...prev, sigla: e.target.value }))}  className="bz-campo" />
                  </div>
                  <div>
                    <label className="bz-rotulo" htmlFor="qe-entidade">Designação legal</label>
                    <input id="qe-entidade" type="text" value={quickOrganismoModal.entidade} onChange={e => setQuickOrganismoModal(prev => ({ ...prev, entidade: e.target.value }))} placeholder="Igual ao nome, se vazio"  className="bz-campo" />
                  </div>
                </div>
                <div>
                  <label className="bz-rotulo" htmlFor="qe-web">Website</label>
                  <input id="qe-web" type="text" value={quickOrganismoModal.website} onChange={e => setQuickOrganismoModal(prev => ({ ...prev, website: e.target.value }))} placeholder="https://"  className="bz-campo" />
                </div>
              </div>
            </form>
      </Janela>

{/* --- MODAIS RÁPIDOS DO PASSO 3: NOVO PROGRAMA / NOVO AVISO --- */}
      {showModal && quickPrograma && (
        <ModalPortal>
          <div className="jn-fundo" style={{zIndex:"calc(var(--z-modal) + 30)"}} onClick={() => setQuickPrograma(null)}>
            <form onSubmit={createQuickPrograma} role="dialog" aria-label="Novo programa" className="pj-quick jn-caixa is-folha" onClick={e => e.stopPropagation()}>
              <div className="pj-quick-head jn-cabecalho">
                <span className="pj-quick-ico jn-cabecalho-ico"><Icons.Building /></span>
                <div>
                  <h3>Novo programa</h3>
                  <p>Fica logo selecionado no projeto. Os restantes dados (taxa, região, objetivos…) completam-se em Programas/Avisos.</p>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setQuickPrograma(null)} className="pj-quick-x jn-fechar"><Icons.Close size={20} /></button>
              </div>
              <div className="pj-quick-body jn-corpo">
                <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'12px'}}>
                  <div>
                    <label className="bz-rotulo" htmlFor="qp-codigo">Sigla *</label>
                    <input id="qp-codigo" type="text" value={quickPrograma.codigo} onChange={e => setQuickPrograma(prev => ({ ...prev, codigo: e.target.value }))} placeholder="Ex.: SI2E" required  className="bz-campo" autoFocus />
                  </div>
                  <div>
                    <label className="bz-rotulo" htmlFor="qp-nome">Nome *</label>
                    <input id="qp-nome" type="text" value={quickPrograma.nome} onChange={e => setQuickPrograma(prev => ({ ...prev, nome: e.target.value }))} required  className="bz-campo" />
                  </div>
                </div>
                <div>
                  <label className="bz-rotulo" htmlFor="qp-aviso">Código do primeiro aviso (opcional)</label>
                  <input id="qp-aviso" type="text" value={quickPrograma.avisoCodigo} onChange={e => setQuickPrograma(prev => ({ ...prev, avisoCodigo: e.target.value }))} placeholder="Ex.: ALGARVE-2026-01"  className="bz-campo" />
                  <div className="pj-quick-hint">Para indicar os prazos das fases, cria o aviso depois com <strong>+ Novo aviso</strong>.</div>
                </div>
              </div>
              <div className="pj-quick-foot jn-rodape">
                <button type="button" onClick={() => setQuickPrograma(null)} className="pj-quick-cancel">Cancelar</button>
                <button type="submit" disabled={quickPrograma.isSubmitting} className="pj-quick-ok is-primary">{quickPrograma.isSubmitting ? "A criar…" : "Criar e selecionar"}</button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {showModal && quickAviso && (
        <ModalPortal>
          <div className="jn-fundo" style={{zIndex:"calc(var(--z-modal) + 30)"}} onClick={() => setQuickAviso(null)}>
            <form onSubmit={createQuickAviso} role="dialog" aria-label="Novo aviso" className="pj-quick jn-caixa is-folha" onClick={e => e.stopPropagation()}>
              <div className="pj-quick-head jn-cabecalho">
                <span className="pj-quick-ico jn-cabecalho-ico"><Icons.Calendar /></span>
                <div>
                  <h3>Novo aviso</h3>
                  <p>Fica ligado a <strong>{getProgramaById(form.programa_id)?.nome || "este programa"}</strong> e selecionado no projeto, com as fases abaixo.</p>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setQuickAviso(null)} className="pj-quick-x jn-fechar"><Icons.Close size={20} /></button>
              </div>
              <div className="pj-quick-body jn-corpo">
                <div>
                  <label className="bz-rotulo" htmlFor="qa-codigo">Código do aviso *</label>
                  <input id="qa-codigo" type="text" value={quickAviso.codigo} onChange={e => setQuickAviso(prev => ({ ...prev, codigo: e.target.value }))} placeholder="Ex.: ALGARVE-2026-01" required  className="bz-campo" autoFocus />
                </div>
                <div>
                  <label className="bz-rotulo">Fases e prazos</label>
                  <div className="pj-quick-fases">
                    {quickAviso.fases.map((f, i) => (
                      <div key={i} className="pj-quick-fase">
                        <input type="text" aria-label={`Nome da fase ${i + 1}`} value={f.nome} onChange={e => setQuickAviso(prev => ({ ...prev, fases: prev.fases.map((x, k) => k === i ? { ...x, nome: e.target.value } : x) }))}  className="bz-campo" />
                        <input type="date" aria-label={`Prazo da fase ${i + 1}`} value={f.prazo} onChange={e => setQuickAviso(prev => ({ ...prev, fases: prev.fases.map((x, k) => k === i ? { ...x, prazo: e.target.value } : x) }))}  className="bz-campo" />
                        <button type="button" aria-label={`Remover fase ${i + 1}`} onClick={() => setQuickAviso(prev => ({ ...prev, fases: prev.fases.filter((_, k) => k !== i) }))} className="pj-quick-x hover-red-text"><Icons.Close size={16} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setQuickAviso(prev => ({ ...prev, fases: [...prev.fases, { nome: `Fase ${prev.fases.length + 1}`, prazo: "" }] }))} className="pj-quick-add">+ Adicionar fase</button>
                  </div>
                </div>
              </div>
              <div className="pj-quick-foot jn-rodape">
                <button type="button" onClick={() => setQuickAviso(null)} className="pj-quick-cancel">Cancelar</button>
                <button type="submit" disabled={quickAviso.isSubmitting} className="pj-quick-ok is-primary">{quickAviso.isSubmitting ? "A criar…" : "Criar e selecionar"}</button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

{/* --- MODAL CRIAR/EDITAR PROJETO (WIZARD 5 PASSOS) --- */}
      {showModal && (
        <ModalPortal>
          <div className="jn-fundo" style={{zIndex:"calc(var(--z-modal) + 13)"}} onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="jn-caixa is-folha pj-wizard" role="dialog" aria-modal="true" aria-label={isViewOnly ? "Ver projeto" : (editId ? "Editar projeto" : "Novo projeto")} style={{maxWidth:'1000px'}}>
              
              {/* --- CABEÇALHO --- */}
              <header className="jn-cabecalho">
                <span className="jn-cabecalho-ico"><Icons.Rocket size={22} /></span>
                <div className="jn-cabecalho-txt">
                  <h2>{isViewOnly ? "Ver projeto" : (editId ? "Editar projeto" : "Novo projeto")}</h2>
                  <p>Passo {currentStep} de 5</p>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setShowModal(false)} className="jn-fechar"><Icons.Close size={18} /></button>
              </header>

              {/* --- STEPPER VISUAL --- */}
              <div className="pj-wizard-passos">
                <div style={{display: 'flex', gap: '10px', alignItems: 'center', width: '100%'}}>
                  {[
                    { num: 1, label: 'Base & Entidade' },
                    { num: 2, label: 'Organismo & Equipa' },
                    { num: 3, label: 'Planeamento' },
                    { num: 4, label: 'Atividades' },
                    { num: 5, label: 'Finanças & Notas' }
                  ].map(step => (
                    <div key={step.num} style={{display: 'flex', alignItems: 'center', flex: 1, opacity: currentStep >= step.num ? 1 : 0.4}}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        background: currentStep >= step.num ? 'var(--color-btnPrimary)' : '#e2e8f0', 
                        color: currentStep >= step.num ? 'white' : '#64748b', fontWeight: 'bold', fontSize: '0.9rem',
                        flexShrink: 0
                      }}>
                        {currentStep > step.num ? <Icons.Check size={16} /> : step.num}
                      </div>
                      <span style={{marginLeft: '8px', fontSize: '0.85rem', fontWeight: currentStep === step.num ? '700' : '500', color: currentStep === step.num ? '#1e293b' : '#64748b', whiteSpace: 'nowrap'}}>
                        {step.label}
                      </span>
                      {step.num < 5 && <div style={{flex: 1, height: '2px', background: currentStep > step.num ? 'var(--color-btnPrimary)' : '#e2e8f0', margin: '0 10px'}}></div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* --- CORPO DO FORMULÁRIO --- */}
              <div className="jn-corpo custom-scrollbar" style={{padding:'24px 26px'}}>
                <form id="project-form" onSubmit={handleSubmit}>
                  <fieldset disabled={isViewOnly} style={{border:'none', padding:0, margin: 0}}>
                    
                    {/* Variável que controla a visibilidade baseada no modelo selecionado */}
                    {(() => {
                        const tipoSelecionado = tipos.find(t => String(t.id) === String(form.tipo_projeto_id));
                        const isProjetoFormacao = tipoSelecionado?.eh_formacao === true;

                        return (
                            <>
                                {/* ========== PASSO 1: BASE E ENTIDADE DO PROJETO ========== */}
                                {currentStep === 1 && (
                                  <div className="fade-in">
                                    <div className="bz-secao is-primeira"><Icons.Building /> Enquadramento Base</div>
                                    
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                                      <div>
                                          <label className="bz-rotulo">Tipo de Projeto (Modelo) *</label>
                                          <FancySelect
                                              className="pj-fs is-destaque"
                                              ariaLabel="Tipo de Projeto (Modelo)"
                                              value={form.tipo_projeto_id || ''}
                                              onChange={(v) => setForm({...form, tipo_projeto_id: v})}
                                              disabled={!!editId}
                                              placeholder="Selecione o modelo"
                                              options={tipos.map(t => ({ value: t.id, label: t.nome, hint: t.eh_formacao ? "Formação" : undefined }))}
                                          />
                                      </div>
                                      <div>
                                          <label className="bz-rotulo">Responsável Global *</label>
                                          <FancySelect
                                              className="pj-fs"
                                              ariaLabel="Responsável Global"
                                              value={form.responsavel_id || ''}
                                              onChange={(newResp) => {
                                                  setForm(prev => ({
                                                      ...prev,
                                                      responsavel_id: newResp,
                                                      colaboradores: prev.colaboradores.filter(id => id !== newResp)
                                                  }));
                                              }}
                                              placeholder="Selecione o responsável"
                                              options={staff
                                                  .filter(s => s.ativo !== false || String(s.id) === String(form.responsavel_id))
                                                  .map(s => ({ value: s.id, label: s.nome || s.email, hint: s.ativo === false ? "Inativo" : undefined }))}
                                          />
                                      </div>
                                    </div>

                                    <div style={{marginBottom: '30px'}}>
                                        <label className="bz-rotulo">Título do Projeto *</label>
                                        <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required  className="bz-campo is-titulo" />
                                    </div>

                                    <div className="bz-secao"><Icons.Users /> Entidade(s) do Projeto</div>
                                    
                                    <div style={{display: 'grid', gridTemplateColumns: form.is_parceria ? '1fr 1fr' : '1fr 1fr', gap: '15px', marginBottom: form.is_parceria ? '10px' : '20px'}}>
                                        <div>
                                            <label className="bz-rotulo">Tipologia</label>
                                            <FancySelect
                                                className="pj-fs"
                                                ariaLabel="Tipologia"
                                                value={form.is_parceria ? 'parceria' : 'unico'}
                                                onChange={(v) => {
                                                    const isParc = v === 'parceria';
                                                    setForm({...form, is_parceria: isParc, parceiros_ids: isParc ? form.parceiros_ids : []});
                                                }}
                                                options={[
                                                    { value: 'unico', label: 'Individual', hint: 'Apenas a entidade líder' },
                                                    { value: 'parceria', label: 'Parceria', hint: 'Várias entidades' },
                                                ]}
                                            />
                                        </div>

                                        <div>
                                            <label className="bz-rotulo">Entidade Lider *</label>
                                            <FancySelect
                                                className="pj-fs"
                                                ariaLabel="Entidade Lider"
                                                value={form.cliente_id || ''}
                                                onChange={(selectedId) => {
                                                    setForm(prev => ({
                                                        ...prev,
                                                        cliente_id: selectedId,
                                                        parceiros_ids: (prev.parceiros_ids || []).filter(pid => String(pid) !== String(selectedId))
                                                    }));
                                                    setParceiroSelecionado("");
                                                }}
                                                placeholder="Selecione a entidade"
                                                searchPlaceholder="Procurar entidade…"
                                                menuWidth={360}
                                                options={clientes.map(c => ({ value: c.id, label: getClientDisplayName(c) || c.marca, hint: c.eh_organismo ? "Entidade financiadora" : undefined }))}
                                            />
                                            <button type="button" onClick={() => openQuickEntidade("lider")} disabled={isViewOnly} style={{marginTop: '8px', border: '1px dashed var(--n-300)', background: 'var(--sup-1)', color: 'var(--color-btnPrimary)', padding: '8px 12px', borderRadius: '8px', cursor: isViewOnly ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem'}}>
                                                + Nova entidade
                                            </button>
                                        </div>
                                    </div>

                                    {form.is_parceria && (
                                        <div className="bz-grelha-2">
                                            <div>
                                                <label className="bz-rotulo">Entidades Parceiras</label>
                                                <FancySelect
                                                    className="pj-fs"
                                                    ariaLabel="Adicionar entidade parceira"
                                                    value={parceiroSelecionado}
                                                    onChange={(selected) => {
                                                        if (!selected) return;
                                                        setForm(prev => {
                                                            if (String(selected) === String(prev.cliente_id)) return prev;
                                                            if ((prev.parceiros_ids || []).includes(selected)) return prev;
                                                            return { ...prev, parceiros_ids: [...(prev.parceiros_ids || []), selected] };
                                                        });
                                                        setParceiroSelecionado("");
                                                    }}
                                                    placeholder="Adicionar entidade parceira"
                                                    searchPlaceholder="Procurar entidade…"
                                                    menuWidth={360}
                                                    options={clientes
                                                        .filter(c => String(c.id) !== String(form.cliente_id || ''))
                                                        .filter(c => !(form.parceiros_ids || []).includes(c.id))
                                                        .map(c => ({ value: c.id, label: getClientDisplayName(c) || c.marca }))}
                                                />
                                                <button type="button" onClick={() => openQuickEntidade("parceiro")} disabled={isViewOnly} style={{marginTop: '8px', border: '1px dashed var(--n-300)', background: 'var(--sup-1)', color: 'var(--color-btnPrimary)', padding: '8px 12px', borderRadius: '8px', cursor: isViewOnly ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem'}}>
                                                    + Nova entidade parceira
                                                </button>
                                            </div>
                                            
                                            <div>
                                                <label className="bz-rotulo">Entidades Selecionadas</label>
                                                <div className="pill-container" style={{width: '100%', boxSizing: 'border-box'}}>
                                                    {(form.parceiros_ids || []).length === 0 && <span className="bz-dica">Sem parceiros selecionados.</span>}
                                                    {(form.parceiros_ids || []).map(pid => {
                                                        const parceiro = clientes.find(c => String(c.id) === String(pid));
                                                        if (!parceiro) return null;
                                                        return (
                                                            <div
                                                                key={pid}
                                                                {...clicavel(() => !isViewOnly && handleToggleParceiro(pid))}
                                                                className="pill-checkbox selected"
                                                                title="Remover parceiro"
                                                            >
                                                                {getClientDisplayName(parceiro) || parceiro.marca} ✕
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                  </div>
                                )}

                                {/* ========== PASSO 2: ORGANISMO FINANCIADOR & EQUIPA ========== */}
                                {currentStep === 2 && (
                                  <div className="fade-in">
                                    
                                    {/* Esconde a Entidade Financiadora se for Formação */}
                                    {!isProjetoFormacao && (
                                        <>
                                            <div className="bz-secao is-primeira"><Icons.Building /> Entidade Financiadora</div>
                                            
                                            <div style={{display: 'grid', gridTemplateColumns: form.has_organismo ? '1fr 1fr' : '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                                                <div>
                                                    <label className="bz-rotulo">Envolve Entidade Financiadora?</label>
                                                    <FancySelect
                                                        className="pj-fs"
                                                        ariaLabel="Envolve Entidade Financiadora?"
                                                        value={form.has_organismo ? 'sim' : 'nao'}
                                                        onChange={(v) => {
                                                            const hasOrg = v === 'sim';
                                                            setForm({...form, has_organismo: hasOrg, organismo_id: hasOrg ? form.organismo_id : "", organismo_contacto_id: hasOrg ? form.organismo_contacto_id : ""});
                                                        }}
                                                        disabled={isViewOnly}
                                                        options={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]}
                                                    />
                                                </div>

                                                {form.has_organismo && (
                                                    <div>
                                                        <label className="bz-rotulo">Organismo Lider / Principal *</label>
                                                        <FancySelect
                                                            className="pj-fs is-destaque"
                                                            ariaLabel="Organismo Lider / Principal"
                                                            value={form.organismo_id || ""}
                                                            onChange={(v) => setForm({...form, organismo_id: v, organismo_contacto_id: ""})}
                                                            disabled={isViewOnly}
                                                            placeholder="Selecione o organismo"
                                                            searchPlaceholder="Procurar organismo…"
                                                            menuWidth={360}
                                                            options={clientes.filter(c => c.eh_organismo).map(c => ({ value: c.id, label: getClientDisplayName(c) || c.marca }))}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={openQuickOrganismoModal}
                                                            disabled={isViewOnly}
                                                            style={{marginTop: '8px', border: '1px dashed var(--n-300)', background: 'var(--sup-1)', color: 'var(--color-btnPrimary)', padding: '8px 12px', borderRadius: '8px', cursor: isViewOnly ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem'}}
                                                        >
                                                            + Novo organismo
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {form.has_organismo && form.organismo_id && (
                                                <div style={{marginBottom: '30px', maxWidth: '50%', paddingRight: '7.5px'}}>
                                                    <label className="bz-rotulo">Pessoa do Organismo</label>
                                                    <FancySelect
                                                        className="pj-fs"
                                                        ariaLabel="Pessoa do Organismo"
                                                        value={form.organismo_contacto_id || ""}
                                                        onChange={(v) => setForm({...form, organismo_contacto_id: v})}
                                                        disabled={isViewOnly}
                                                        placeholder="Sem pessoa definida"
                                                        options={[
                                                            { value: "", label: "Sem pessoa definida" },
                                                            ...organismoPessoas.map(p => ({ value: p.id, label: p.nome_contacto || p.email || "Contacto", hint: p.cargo || undefined })),
                                                        ]}
                                                    />
                                                    {organismoPessoas.length === 0 && (
                                                        <div className="bz-dica">Este organismo ainda não tem contactos registados.</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="bz-secao" style={{marginTop: isProjetoFormacao ? 0 : 30}}><Icons.Users /> Equipa Envolvida no Projeto</div>
                                    <div style={{marginBottom: '10px'}}>
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                                            <div>
                                                <div className="bz-rotulo">Colaboradores Internos</div>
                                                <div className="pill-container" style={{minHeight: '60px', padding: '15px', background: 'var(--n-50)', borderRadius: '10px', border: '1px solid var(--n-200)'}}>
                                                    {staff
                                                        .filter(s => String(s.id) !== String(form.responsavel_id || ''))
                                                        .filter(s => s.ativo !== false || (form.colaboradores || []).includes(s.id))
                                                        .map(s => {
                                                            const isSelected = (form.colaboradores || []).map(id => String(id)).includes(String(s.id));
                                                            return (
                                                                <div 
                                                                    key={`colab-int-${s.id}`}
                                                                    {...clicavel(() => !isViewOnly && handleToggleColaborador(s.id))}
                                                                    className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                                >
                                                                    {s.nome || s.email}{s.ativo === false ? ' (Inativo)' : ''}
                                                                </div>
                                                            )
                                                        })}
                                                    {staff.filter(s => String(s.id) !== String(form.responsavel_id || '')).length === 0 && (
                                                        <span className="bz-dica">Sem pessoas internas disponíveis.</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="bz-rotulo">Contactos das Entidades</div>
                                                <div className="pill-container" style={{minHeight: '60px', padding: '15px', background: 'var(--n-50)', borderRadius: '10px', border: '1px solid var(--n-200)'}}>
                                                    {entidadePessoas
                                                        .filter(s => String(s.id) !== String(form.responsavel_id || ''))
                                                        .map(s => {
                                                            const isSelected = (form.colaboradores || []).map(id => String(id)).includes(String(s.id));
                                                            const base = s.nome_contacto || s.email || 'Contacto';
                                                            const cargo = s.cargo ? ` (${s.cargo})` : '';
                                                            const marca = getClientDisplayName(s.clientes) ? ` - ${getClientDisplayName(s.clientes)}` : '';
                                                            return (
                                                                <div 
                                                                    key={`ent-${s.id}`}
                                                                    {...clicavel(() => !isViewOnly && handleToggleColaborador(s.id))}
                                                                    className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                                >
                                                                    {`${base}${cargo}${marca}`}
                                                                </div>
                                                            )
                                                        })}
                                                    {entidadePessoas.filter(s => String(s.id) !== String(form.responsavel_id || '')).length === 0 && (
                                                        <span className="bz-dica">Sem contactos das entidades selecionadas.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                  </div>
                                )}

                                {/* ========== PASSO 3: PLANEAMENTO ========== */}
                                {currentStep === 3 && (
                                  <div className="fade-in">
                                    <div className="bz-secao is-primeira"><Icons.Calendar /> Planeamento & Enquadramento</div>
                                    
                                    {!isProjetoFormacao && (
                                        <>
                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px'}}>
                                                <div>   
                                                    <label className="bz-rotulo">Programa</label>
                                                    <FancySelect
                                                        className="pj-fs"
                                                        ariaLabel="Programa"
                                                        value={form.programa_id || ''}
                                                        onChange={(v) => handleProgramaChange(v)}
                                                        disabled={isViewOnly}
                                                        placeholder="Sem programa associado"
                                                        searchPlaceholder="Procurar programa…"
                                                        menuWidth={380}
                                                        options={[
                                                            { value: '', label: 'Sem programa associado' },
                                                            ...programas.filter((programa) => programa.ativo !== false).map((programa) => ({
                                                                value: programa.id,
                                                                label: programa.nome || 'Programa',
                                                                hint: programa.codigo || undefined,
                                                            })),
                                                        ]}
                                                    />
                                                    <button type="button" onClick={() => setQuickPrograma({ codigo: "", nome: "", avisoCodigo: "", isSubmitting: false })} disabled={isViewOnly} style={{marginTop: '8px', border: '1px dashed var(--n-300)', background: 'var(--sup-1)', color: 'var(--color-btnPrimary)', padding: '8px 12px', borderRadius: '8px', cursor: isViewOnly ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem'}}>
                                                        + Novo programa
                                                    </button>
                                                </div>
                                                {(() => {
                                                    const avisosDoPrograma = selectedPrograma ? getAvisosForPrograma(selectedPrograma) : [];
                                                    
                                                    return (
                                                        <div>
                                                            <label className="bz-rotulo">Aviso</label>
                                                            <FancySelect
                                                                className="pj-fs"
                                                                ariaLabel="Aviso"
                                                                value={form.avisos_ids || ''}
                                                                onChange={(avId) => {
                                                                    const av = getAvisoById(avId);
                                                                    setForm({ ...form, avisos_ids: avId, aviso: av?.codigo || "" });
                                                                }}
                                                                disabled={isViewOnly || avisosDoPrograma.length === 0}
                                                                placeholder={!selectedPrograma ? "Escolhe primeiro o programa" : avisosDoPrograma.length > 0 ? "Escolhe o aviso" : "Sem avisos associados"}
                                                                options={avisosDoPrograma.map(av => {
                                                                    const nf = Array.isArray(av.fases) ? av.fases.length : 0;
                                                                    return { value: av.id, label: av.codigo, hint: nf ? `${nf} ${nf === 1 ? "fase" : "fases"}` : undefined };
                                                                })}
                                                            />
                                                            <button type="button" onClick={() => setQuickAviso({ codigo: "", fases: [{ nome: "Fase 1", prazo: "" }], isSubmitting: false })} disabled={isViewOnly || !selectedPrograma} title={!selectedPrograma ? "Escolhe primeiro o programa" : undefined} style={{marginTop: '8px', border: '1px dashed var(--n-300)', background: 'var(--sup-1)', color: 'var(--color-btnPrimary)', padding: '8px 12px', borderRadius: '8px', cursor: (isViewOnly || !selectedPrograma) ? 'not-allowed' : 'pointer', opacity: selectedPrograma ? 1 : 0.55, fontWeight: '700', fontSize: '0.85rem'}}>
                                                                + Novo aviso
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div className="bz-grelha-2">
                                                <div>
                                                    <label className="bz-rotulo">Código de Projeto</label>
                                                    <input aria-label="Código de Projeto" type="text" value={form.codigo_projeto} onChange={e => setForm({...form, codigo_projeto: e.target.value})} placeholder="Ex: ALGARVE-FEDER-03107000"  className="bz-campo" />
                                                </div>
                                                <div>
                                                    <label className="bz-rotulo">Número do Projeto</label>
                                                    <input aria-label="Número do Projeto" type="text" value={form.numero_projeto || ""} onChange={e => setForm({...form, numero_projeto: e.target.value})} placeholder="Ex: 12345"  className="bz-campo" />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="bz-grelha-2">
                                        <div>
                                            <label className="bz-rotulo">Data Início Base</label>
                                            <input type="date" value={form.data_inicio || ''} max={form.data_fim || undefined} onChange={e => setForm({...form, data_inicio: e.target.value})} style={{border: form.data_inicio && form.data_fim && form.data_inicio > form.data_fim ? '1px solid #ef4444' : inputStyle.border}} className="bz-campo" required />
                                        </div>
                                        <div>
                                            <label className="bz-rotulo">Data Fim</label>
                                            <input
                                                type="date"
                                                value={form.data_fim || ''}
                                                min={form.data_inicio || undefined}
                                                onChange={e => {
                                                    setForm({...form, data_fim: e.target.value});
                                                }}
                                                style={{border: form.data_inicio && form.data_fim && form.data_inicio > form.data_fim ? '1px solid #ef4444' : inputStyle.border}}
                                                className="bz-campo"
                                            />
                                        </div>
                                    </div>
                                    {form.data_inicio && form.data_fim && form.data_inicio > form.data_fim && (
                                        <div style={{marginTop: '-18px', marginBottom: '18px', color: 'var(--cx-b91c1c, #b91c1c)', fontSize: '0.8rem', fontWeight: '700'}}>
                                            A Data de Início tem de ser anterior ou igual à Data de Fim.
                                        </div>
                                    )}

                                    {!isProjetoFormacao && (
                                        <div style={{marginBottom: '10px', padding: '16px', borderRadius: '12px', border: '1px solid var(--n-200)', background: 'var(--n-50)'}}>
                                            <div style={{marginBottom: '10px'}}>
                                                <div style={{fontSize: '0.8rem', fontWeight: '800', color: 'var(--n-500)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Fases do Projeto</div>
                                                <div style={{fontSize: '0.85rem', color: 'var(--n-500)'}}>
                                                As fases são importadas automaticamente a partir do Aviso selecionado. Servem apenas como referência e não alteram as datas do projeto.
                                                </div>
                                            </div>

                                            {/* Lista unificada com seleto de Data Limite */}
                                            <div style={{display: 'grid', gap: '12px'}}>
                                                {fasesEfetivas && fasesEfetivas.length > 0 ? (
                                                    fasesEfetivas.map((fase, index) => {
                                                        const isSelected = false;
                                                        
                                                        return (
                                                            <div key={`fase-${fase.nome}-${index}`} style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '10px', background: isSelected ? 'var(--color-bgSecondary)' : 'white', border: `1px solid ${isSelected ? 'var(--color-btnPrimary)' : '#e2e8f0'}`, transition: 'background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s, opacity 0.2s, width 0.2s, filter 0.2s'}}>
                                                                
                                                                {/* Controlo de Seleção (Radio) */}
                                                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minWidth: '60px'}}>
                                                                    <input
                                                                        type="radio"
                                                                        name="fase_limite_projeto"
                                                                        checked={false}
                                                                        disabled
                                                                        style={{accentColor: 'var(--color-btnPrimary)', width: '20px', height: '20px', cursor: isViewOnly ? 'default' : 'pointer'}}
                                                                        title="Prazo de referência da fase; não altera a data do projeto"
                                                                    />
                                                                    <span style={{fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: isSelected ? 'var(--color-btnPrimary)' : '#94a3b8'}}> </span>
                                                                </div>

                                                                {/* Inputs de Descrição da Fase */}
                                                                <div style={{display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px', flex: 1, alignItems: 'end'}}>
                                                                    <div>
                                                                        <label className="bz-rotulo">Nome da fase</label>
                                                                        <input
                                                                            type="text"
                                                                            value={fase.nome || ''}
                                                                            readOnly
                                                                            className="bz-campo is-leitura" style={{borderColor: isSelected ? '#bfdbfe' : '#cbd5e1'}}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="bz-rotulo">Data de término</label>
                                                                        <input
                                                                            type="date"
                                                                            value={fase.prazo || ''}
                                                                            readOnly
                                                                            className="bz-campo is-leitura" style={{borderColor: isSelected ? '#bfdbfe' : '#cbd5e1'}}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="bz-vazio">
                                                        Sem fases definidas. Seleciona um programa/aviso para carregar as fases.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                  </div>
                                )}

                                {/* ========== PASSO 4: ATIVIDADES ========== */}
                                {currentStep === 4 && (
                                  <div className="fade-in">
                                    <div className="bz-secao is-primeira"><Icons.ListTree /> Pré-visualização de Atividades</div>
                                    
                                    {!editId && templateTree.length > 0 ? (
                                        <div style={{background: 'var(--n-50)', padding: '20px', borderRadius: '12px', border: '1px solid var(--n-200)', marginBottom: '10px'}}>
                                            <p style={{fontSize: '0.85rem', color: 'var(--n-500)', margin: '0 0 15px 0'}}>
                                                Abaixo está a estrutura gerada pelo modelo selecionado. Podes desmarcar itens que não se aplicam a este projeto específico.
                                            </p>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {templateTree.map(ativ => {
                                                    const isSelected = templateSelection[`a_${ativ.id}`];
                                                    return (
                                                        <div key={`a_${ativ.id}`} style={{ background: 'var(--sup-1)', borderRadius: '10px', border: `1px solid ${isSelected ? 'var(--color-borderColor)' : '#e2e8f0'}`, overflow: 'hidden', transition: 'background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s, opacity 0.2s, width 0.2s, filter 0.2s', boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.05)' : 'none' }}>
                                                            
                                                            <div 
                                                                {...clicavel(() => toggleTemplateSelection('a', ativ.id))}
                                                                style={{ background: isSelected ? 'var(--color-bgSecondary)' : '#f8fafc', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: isSelected && ativ.tarefas?.length ? '1px solid #e2e8f0' : 'none' }}
                                                            >
                                                                <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: 'var(--color-btnPrimary)', width: '18px', height: '18px', pointerEvents: 'none' }} />
                                                                <span style={{ fontWeight: '700', fontSize: '1rem', color: isSelected ? 'var(--color-btnPrimaryDark)' : '#64748b' }}>{ativ.nome}</span>
                                                            </div>

                                                            {isSelected && ativ.tarefas?.length > 0 && (
                                                                <div style={{ padding: '15px 18px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                                    {ativ.tarefas.map(tar => {
                                                                        const isTarSelected = templateSelection[`t_${tar.id}`];
                                                                        return (
                                                                            <div key={`t_${tar.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                    <Icons.ArrowRight size={14} color={isTarSelected ? "var(--color-btnPrimary)" : "#cbd5e1"} />
                                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: isTarSelected ? '700' : '500', color: isTarSelected ? '#334155' : '#94a3b8', fontSize: '0.95rem' }}>
                                                                                        <input type="checkbox" checked={isTarSelected} onChange={() => toggleTemplateSelection('t', tar.id)} style={{ accentColor: 'var(--color-btnPrimary)', width: '16px', height: '16px', cursor: 'pointer' }} />
                                                                                        {tar.nome}
                                                                                    </label>
                                                                                </div>
                                                                                
                                                                                {isTarSelected && tar.subtarefas?.length > 0 && (
                                                                                    <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid var(--n-100)', marginLeft: '7px' }}>
                                                                                        {tar.subtarefas.map(sub => {
                                                                                            const isSubSelected = templateSelection[`s_${sub.id}`];
                                                                                            return (
                                                                                                <label key={`s_${sub.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: isSubSelected ? '#475569' : '#94a3b8', fontSize: '0.85rem', fontWeight: isSubSelected ? '600' : '400' }}>
                                                                                                    <input type="checkbox" checked={isSubSelected} onChange={() => toggleTemplateSelection('s', sub.id)} style={{ accentColor: 'var(--color-btnPrimary)', width: '14px', height: '14px', cursor: 'pointer' }} />
                                                                                                    {sub.nome}
                                                                                                </label>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bz-vazio">
                                            {editId ? 
                                                "A estrutura do projeto já foi gerada e está em curso. Edições nas atividades devem ser feitas na página de Detalhe do Projeto." : 
                                                "Por favor seleciona um 'Tipo de Projeto (Modelo)' no Passo 1 para ver a estrutura a ser gerada."
                                            }
                                        </div>
                                    )}
                                  </div>
                                )}

                                {/* ========== PASSO 5: FINANÇAS & NOTAS ========== */}
                                {currentStep === 5 && (
                                <div className="fade-in">
                                    {!isProjetoFormacao && (
                                        <>
                                            <div className="bz-secao is-primeira"><Icons.Dollar /> Valores de Investimento</div>

                                            {!isMultiEntidade && !editId && (Number(form.investimento || 0) <= 0 || Number(form.incentivo || 0) <= 0) && (
                                                <div style={{
                                                    background: 'var(--cx-fffbeb, #fffbeb)',
                                                    border: '1px solid #fde68a',
                                                    borderRadius: '12px',
                                                    padding: '14px 18px',
                                                    marginBottom: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '14px',
                                                    color: 'var(--cx-92400e, #92400e)',
                                                    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.05)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Icons.Alert size={22} color="#d97706" />
                                                    </div>
                                                    <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                                                        <strong style={{ display: 'block', marginBottom: '2px', color: 'var(--cx-78350f, #78350f)' }}>
                                                            Valores Obrigatórios na Criação do Projeto
                                                        </strong>
                                                        {Number(form.investimento || 0) <= 0 && Number(form.incentivo || 0) <= 0
                                                            ? "É obrigatório definir os valores de Investimento Elegível e Incentivo Atribuído antes de concluir a criação do projeto."
                                                            : Number(form.investimento || 0) <= 0
                                                            ? "É obrigatório definir o valor de Investimento Elegível antes de concluir a criação do projeto."
                                                            : "É obrigatório definir o valor de Incentivo Atribuído antes de concluir a criação do projeto."}
                                                    </div>
                                                </div>
                                            )}

                                            {isMultiEntidade ? (
                                                <div style={{ background: 'var(--n-50)', padding: '20px', borderRadius: '12px', border: '1px solid var(--n-200)', marginBottom: '30px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px', fontSize: '0.74rem', fontWeight: 800, color: 'var(--n-500)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                                    <span>Entidade</span>
                                                    <span style={{ textAlign: 'right' }}>Investimento elegível (€)</span>
                                                    <span style={{ textAlign: 'right' }}>Incentivo (€)</span>
                                                </div>
                                                {entidadesProjeto.map((id) => {
                                                    const ent = clientes.find((c) => String(c.id) === id);
                                                    return (
                                                    <div key={id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--n-900)' }}>
                                                        {getClientDisplayName(ent) || ent?.marca}
                                                        {id === String(form.cliente_id) && <em style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--n-500)' }}>(líder)</em>}
                                                        </span>
                                                        {moneyInput(orcamentos[id]?.investimento, (v) => setOrcamento(id, 'investimento', v))}
                                                        {moneyInput(orcamentos[id]?.incentivo, (v) => setOrcamento(id, 'incentivo', v))}
                                                    </div>
                                                    );
                                                })}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px', paddingTop: '10px', borderTop: '1px dashed var(--n-300)', fontWeight: 800 }}>
                                                    <span>Total do projeto</span>
                                                    <span style={{ textAlign: 'right' }}>{fmtEUR(sumOrc('investimento'))} €</span>
                                                    <span style={{ textAlign: 'right' }}>{fmtEUR(sumOrc('incentivo'))} €</span>
                                                </div>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr',
                                                    gap: '30px',
                                                    background: 'var(--n-50)',
                                                    padding: '20px',
                                                    borderRadius: '12px',
                                                    border: (!editId && (Number(form.investimento || 0) <= 0 || Number(form.incentivo || 0) <= 0)) ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                                                    marginBottom: '30px'
                                                }}>
                                                    <div>
                                                        <label className="bz-rotulo">
                                                            Investimento Elegível (€) {!editId && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={form.investimento || form.investimento === 0 ? new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(form.investimento) : ''}
                                                            onChange={e => {
                                                                const apenasNumeros = e.target.value.replace(/\D/g, "");
                                                                const valorReal = apenasNumeros ? Number(apenasNumeros) / 100 : 0;
                                                                setForm({...form, investimento: valorReal});
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${!editId && Number(form.investimento || 0) <= 0 ? '#f87171' : '#cbd5e1'}`,
                                                                fontSize:'1.2rem',
                                                                background: !editId && Number(form.investimento || 0) <= 0 ? '#fff5f5' : 'white',
                                                                textAlign: 'right'
                                                            }}
                                                            className="input-focus"
                                                        />
                                                        {!editId && Number(form.investimento || 0) <= 0 && (
                                                            <span className="bz-erro">
                                                                <TriangleAlert size={14} aria-hidden="true" /> Insira o valor do investimento elegível (superior a 0,00 €)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="bz-rotulo">
                                                            Incentivo Atribuído (€) {!editId && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={form.incentivo || form.incentivo === 0 ? new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(form.incentivo) : ''}
                                                            onChange={e => {
                                                                const apenasNumeros = e.target.value.replace(/\D/g, "");
                                                                const valorReal = apenasNumeros ? Number(apenasNumeros) / 100 : 0;
                                                                setForm({...form, incentivo: valorReal});
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${!editId && Number(form.incentivo || 0) <= 0 ? '#f87171' : '#cbd5e1'}`,
                                                                fontSize:'1.2rem',
                                                                background: !editId && Number(form.incentivo || 0) <= 0 ? '#fff5f5' : 'white',
                                                                textAlign: 'right'
                                                            }}
                                                            className="input-focus"
                                                        />
                                                        {!editId && Number(form.incentivo || 0) <= 0 && (
                                                            <span className="bz-erro">
                                                                <TriangleAlert size={14} aria-hidden="true" /> Insira o valor do incentivo atribuído (superior a 0,00 €)
                                                            </span>
                                                        )}
                                                    </div>

                                                    {Number(form.investimento || 0) > 0 && Number(form.incentivo || 0) > 0 && (
                                                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', paddingTop: '10px', borderTop: '1px dashed var(--n-300)', fontSize: '0.85rem' }}>
                                                            <div style={{ background: 'var(--n-100)', padding: '6px 12px', borderRadius: '6px', color: 'var(--n-700)' }}>
                                                                Taxa de Financiamento: <strong style={{ color: 'var(--color-btnPrimary)' }}>{((Number(form.incentivo) / Number(form.investimento)) * 100).toFixed(2)}%</strong>
                                                            </div>
                                                            <div style={{ background: 'var(--n-100)', padding: '6px 12px', borderRadius: '6px', color: 'var(--n-700)' }}>
                                                                Autofinanciamento: <strong style={{ color: 'var(--n-900)' }}>{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Math.max(0, Number(form.investimento) - Number(form.incentivo)))}</strong>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="bz-secao" style={{marginTop: isProjetoFormacao ? 0 : 30}}><Icons.FileText /> Notas Adicionais</div>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px'}}>
                                        <div>
                                            <label className="bz-rotulo">Descrição Geral</label>
                                            <textarea aria-label="Descrição Geral" rows="6" value={form.descricao || ''} onChange={e => setForm({...form, descricao: e.target.value})}  placeholder="Resumo do projeto…" className="bz-campo is-fixo" />
                                        </div>
                                        <div>
                                            <label className="bz-rotulo">Observações Internas</label>
                                            <textarea aria-label="Observações Internas" rows="6" value={form.observacoes || ''} onChange={e => setForm({...form, observacoes: e.target.value})}  placeholder="Notas importantes…" className="bz-campo is-fixo is-nota" />
                                        </div>
                                    </div>

                                    <div className="bz-secao"><Icons.Check /> Estado do Projeto</div>
                                    <div style={{display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap'}}>
                                        {[
                                            {val: 'pendente', label: 'Pendente'},
                                            {val: 'em_curso', label: 'Em Curso'},
                                            {val: 'em_analise', label: 'Em Análise'},
                                            {val: 'concluido', label: 'Concluído'},
                                            {val: 'encerrado', label: 'Encerrado'},
                                            {val: 'cancelado', label: 'Cancelado'}
                                        ].map(st => (
                                            <div key={st.val} {...clicavel(() => !isViewOnly && setForm({...form, estado: st.val}))}
                                                style={{
                                                    flex: 1, minWidth: '110px', textAlign: 'center', padding: '10px', borderRadius: '8px', cursor: isViewOnly ? 'default' : 'pointer',
                                                    fontSize: '0.8rem', fontWeight: '700',
                                                    background: form.estado === st.val ? 'var(--color-btnPrimary)' : '#f8fafc',
                                                    color: form.estado === st.val ? 'white' : '#64748b',
                                                    border: form.estado === st.val ? '1px solid var(--color-btnPrimary)' : '1px solid #e2e8f0',
                                                    transition: 'background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s, opacity 0.2s, width 0.2s, filter 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
                                                }}
                                            >
                                                {st.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                )}
                            </>
                        );
                    })()}

                  </fieldset>
                </form>
              </div>

              {/* --- RODAPÉ / NAVEGAÇÃO DO WIZARD --- */}
              {!isViewOnly && (
                <div className="jn-rodape">
                    <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                    <span style={{flex: 1}} aria-hidden="true" />
                    {currentStep > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(prev => prev - 1)}
                      >
                        <Icons.ArrowLeft size={16} /> Anterior
                      </button>
                    )}

                    {currentStep < 5 ? (
                      <button 
                        type="button" 
                        onClick={() => {
                          if (currentStep === 1 && (!form.tipo_projeto_id || !form.titulo || !form.responsavel_id || !form.cliente_id)) {
                              setAlertDialog({
                                  show: true,
                                  title: "Atenção",
                                  message: "Por favor preenche o Modelo, Responsável Global, Título e Entidade Líder antes de avançar."
                              });
                              return;
                          }
                          if (currentStep === 2 && !(tipos.find(t => String(t.id) === String(form.tipo_projeto_id))?.eh_formacao === true) && form.has_organismo && !form.organismo_id) {
                              setAlertDialog({ show: true, title: "Atenção", message: "Escolhe o Organismo Lider / Principal (ou indica que não envolve entidade financiadora)." });
                              return;
                          }
                          setCurrentStep(prev => prev + 1);
                        }} 
                        className="is-primary"
                      >
                        Seguinte <Icons.ArrowRight size={16} />
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => {
                          const tipoSelecionado = tipos.find(t => String(t.id) === String(form.tipo_projeto_id));
                          const isProjetoFormacao = tipoSelecionado?.eh_formacao === true;
                          if (!editId && !isProjetoFormacao) {
                            const numInvestimento = isMultiEntidade ? sumOrc('investimento') : (Number(form.investimento) || 0);
                            const numIncentivo = isMultiEntidade ? sumOrc('incentivo') : (Number(form.incentivo) || 0);
                            const semInvest = numInvestimento <= 0;
                            const semIncent = numIncentivo <= 0;
                            if (semInvest || semIncent) {
                              let msgAlerta = "";
                              if (semInvest && semIncent) {
                                msgAlerta = "Para concluir a criação do projeto é obrigatório definir os valores de Investimento Elegível e Incentivo Atribuído.\n\nPor favor preencha os valores antes de avançar.";
                              } else if (semInvest) {
                                msgAlerta = "Para concluir a criação do projeto é obrigatório definir o valor de Investimento Elegível.\n\nPor favor preencha o valor antes de avançar.";
                              } else {
                                msgAlerta = "Para concluir a criação do projeto é obrigatório definir o valor de Incentivo Atribuído.\n\nPor favor preencha o valor antes de avançar.";
                              }
                              setAlertDialog({
                                show: true,
                                title: "Valores Financeiros Obrigatórios",
                                message: msgAlerta
                              });
                              showToast("Preencha os valores de investimento e incentivo antes de concluir.", "warning");
                              return;
                            }
                          }
                          document.getElementById('project-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                        }}
                        disabled={isSubmitting} 
                        className="is-primary"
                      >
                        {isSubmitting ? "A guardar…" : (editId ? <><Icons.Save /> Guardar Alterações</> : <><Icons.Rocket /> Concluir e Criar</>)}
                      </button>
                    )}
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {notification && <AvisoToast tipo={notification.type} mensagem={notification.message} />}
      
      <style>{`
          .fade-in { animation: fadeIn 0.4s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          .category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
          .category-card {
              background: white; padding: 25px; border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;
              cursor: pointer; transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease, width 0.2s ease, filter 0.2s ease;
          }
          .category-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #cbd5e1; }

          .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
          .project-card:hover { border-color: #cbd5e1 !important; box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important; transform: translateY(-2px); }

          .marketing-view-toggle-btn {
              border: none;
              background: transparent;
              color: #475569;
              font-size: 0.8rem;
              font-weight: 700;
              padding: 6px 12px;
              border-radius: 6px;
              cursor: pointer;
              transition: 0.2s;
          }

          .marketing-view-toggle-btn.active {
              background: #ffffff;
              color: var(--color-btnPrimary);
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          .marketing-view-toggle-btn:not(.active):hover {
              color: #1e293b;
          }

          .project-list-row:hover { background: #f8fafc !important; }
          .project-list-table td, .project-list-table th { vertical-align: middle; }
          .project-list-table { table-layout: auto; }
          .project-list-table th:nth-child(2), .project-list-table td:nth-child(2) { max-width: 220px; }
          .project-list-table th:nth-child(4), .project-list-table td:nth-child(4) { white-space: nowrap; }
          .project-list-table th:nth-child(5), .project-list-table td:nth-child(5) { white-space: nowrap; }
          .project-list-table th:nth-child(6), .project-list-table td:nth-child(6) { white-space: nowrap; }

          .hover-shadow:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateY(-1px); }

          .hover-blue-btn:hover { background: var(--color-borderColorLight) !important; color: var(--color-btnPrimary) !important; border-color: var(--color-borderColor) !important; }
          .hover-orange-text:hover { color: #f59e0b !important; opacity: 1 !important; }
          .hover-red-text:hover { color: #ef4444 !important; opacity: 1 !important; }
          
          .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }

          /* Action Buttons para Sub-itens */
          .action-btn { background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: 0.2s; }
          .action-btn:hover { opacity: 1; transform: scale(1.1); }

          /* PILL CONTAINER & CHECKBOX (Para Parceiros e Colaboradores) */
          .pill-container {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              padding: 15px;
              background: #ffffff;
              border-radius: 8px;
              border: 1px solid #cbd5e1;
          }
          .pill-checkbox {
              padding: 8px 18px;
              border-radius: 20px;
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease, width 0.2s ease, filter 0.2s ease;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              color: #64748b;
              user-select: none;
          }
          .pill-checkbox:hover {
              border-color: #cbd5e1;
              background: #f1f5f9;
          }
          .pill-checkbox.selected {
              background: var(--color-bgSecondary);
              border-color: var(--color-btnPrimary);
              color: var(--color-btnPrimary);
              box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
          }

          /* Botão Glow Principal */
          .btn-glow {
              position: relative; overflow: hidden; background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px;
              font-weight: bold; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease, opacity 0.3s ease, width 0.3s ease, filter 0.3s ease; display: flex; align-items: center; gap: 8px;
          }
          .btn-glow::after {
              content: ''; position: absolute; top: 0; left: -150%; width: 50%; height: 100%;
              background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
              transform: skewX(-25deg); transition: left 0.7s ease-in-out;
          }
          .btn-glow:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3); }
          .btn-glow:hover::after { animation: shine-sweep 1.2s infinite alternate ease-in-out; }
          @keyframes shine-sweep { 0% { left: -150%; } 100% { left: 200%; } }
          
          .pulse-dot-red { width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; display: inline-block; animation: pulseRed 1.5s infinite; } 
          @keyframes pulseRed { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
          
          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 70% { transform: scale(1); opacity: 0; } 100% { transform: scale(0.95); opacity: 0; } }
          
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
