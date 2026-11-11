import { useState, useEffect, useRef } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { hasAttendanceStartedToday, startAttendanceNow } from "../utils/attendanceGuard";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import { buildDependencyMaps, getActivityBlockReason, getTaskBlockReason } from "../utils/dependencyGuards";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
import FancySelect from "../components/FancySelect";
import "./../styles/dashboard.css";
import "../styles/tarefas.css";

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const getClientDisplayName = (client) => {
    if (!client) return "";
    return client.sigla?.trim() || client.marca || "";
};

const sanitizeFileName = (rawName = "documento") => {
    const normalized = String(rawName)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const cleaned = normalized
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return cleaned || "documento";
};

const getFileExtension = (fileName = "") => {
    const parts = String(fileName).split(".");
    return parts.length > 1 ? (parts.pop() || "").toLowerCase() : "";
};

const getFileBaseName = (fileName = "") => {
    const normalized = String(fileName || "").trim();
    if (!normalized) return "documento";
    const parts = normalized.split(".");
    if (parts.length <= 1) return normalized;
    parts.pop();
    return parts.join(".") || "documento";
};

const ANALYSIS_DESTINATION_OPTIONS = [
    { value: "proprio", label: "Proprio" },
    { value: "colega", label: "Colega" },
    { value: "cliente", label: "Cliente" },
    { value: "contabilista", label: "Contabilista" },
    { value: "organismo", label: "Organismo" }
];

// --- ÍCONES SVG ---
// --- ÍCONES SVG PROFISSIONAIS (SaaS Premium) ---
const Icons = {
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
  ClipboardList: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>,
  FileText: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Dollar: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  Check: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  ListTree: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  Clock: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  AlertTriangle: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Flame: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>,
  UploadCloud: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></svg>,
  ExternalLink: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  ChevronDown: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  Kanban: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>,
  Copy: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
};

export default function Tarefas() {
  const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
  
  const [atividadesAgrupadas, setAtividadesAgrupadas] = useState([]); 
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [activeTask, setActiveTask] = useState(null); 
    const [activeTaskTitle, setActiveTaskTitle] = useState("");
    const [activeTaskRoute, setActiveTaskRoute] = useState("/dashboard/tarefas");
  const [notification, setNotification] = useState(null);
    const [transitionPromptOpen, setTransitionPromptOpen] = useState(false);
    const [transitionPrefillData, setTransitionPrefillData] = useState(null);

  const [atividadesBase, setAtividadesBase] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [projetosList, setProjetosList] = useState([]); 
    const [entidadePessoas, setEntidadePessoas] = useState([]);

  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
    const [viewMode, setViewMode] = useState(() => {
            if (typeof window === "undefined") return "projetos";
            return window.localStorage.getItem("tarefas-view-mode") || "projetos";
    });

  const [expandedTasks, setExpandedTasks] = useState({});
  const [novaTarefaNome, setNovaTarefaNome] = useState({ ativId: null, nome: "" });
  const [novaSubtarefaNome, setNovaSubtarefaNome] = useState({ tarId: null, nome: "" });

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState('tarefa'); 
  const [isViewOnly, setIsViewOnly] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [timeLogSaving, setTimeLogSaving] = useState(false);
    const [timeLogForm, setTimeLogForm] = useState({ user_id: "", target_type: "tarefa", target_id: "", duration_minutes: "" });
    const [editingTimeLogId, setEditingTimeLogId] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, tabela: '', id: null, titulo: '' });
  const [visibleLimits, setVisibleLimits] = useState({}); 
    const [timerSwitchModal, setTimerSwitchModal] = useState({ show: false, message: "", pendingTask: null });
                const [attendanceWarningModal, setAttendanceWarningModal] = useState({ show: false, message: "" });
        const [stopNoteModal, setStopNoteModal] = useState({ show: false });
        const attendancePendingActionRef = useRef(null);
    const pendingFocusRef = useRef(null);
    const [highlightedTarget, setHighlightedTarget] = useState(null);

  // 💡 ESTADOS DO UPLOAD
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
    const [isDeliverableDragOver, setIsDeliverableDragOver] = useState(false);
  const [searchAtivText, setSearchAtivText] = useState("");
  const [celebrating, setCelebrating] = useState(() => new Set());

  const initialForm = {
    titulo: "", descricao: "", atividade_id: "", responsavel_id: "",
    estado: "pendente", prioridade: "normal",
    data_inicio: "", data_limite: "",
    colaboradores_extra: [], tem_entregavel: false, nome_entregavel: "", data_entregavel: "",
    criado_por_nome: "", created_at: "", arquivo_url: "",
        analise_destino: "proprio", analise_data_prevista: "",
    // 👇 NOVOS CAMPOS ADICIONADOS
    investimento: 0, incentivo: 0, financiamento: 0, data_prevista_aprovacao: "", info_adicional: null
  };
  
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (user && user.id) carregarTudo();
  }, [user]);

  useEffect(() => {
      const focusTaskId = location.state?.focusTaskId;
      const focusTaskType = location.state?.focusTaskType || 'tarefa';
      if (!focusTaskId) return;

      pendingFocusRef.current = {
          id: String(focusTaskId),
          type: focusTaskType === 'atividade' ? 'atividade' : 'tarefa'
      };

      navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
      let cancelled = false;

      const resolveActiveTitle = async () => {
          if (!activeTask) {
              if (!cancelled) {
                  setActiveTaskTitle("");
                  setActiveTaskRoute("/dashboard/tarefas");
              }
              return;
          }

          const timerMeta = await resolveActiveTimerMeta(supabase, activeTask);
          if (cancelled) return;

          setActiveTaskTitle(timerMeta.title || "Tarefa em curso");
          setActiveTaskRoute(timerMeta.route || "/dashboard/tarefas");
      };

      resolveActiveTitle();

      return () => {
          cancelled = true;
      };
  }, [activeTask]);

  useEffect(() => {
      const pending = pendingFocusRef.current;
      if (!pending) return;

      const elementId = pending.type === 'atividade' ? `atividade-card-${pending.id}` : `tarefa-card-${pending.id}`;
      const element = document.getElementById(elementId);
      if (!element) return;

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedTarget(pending);
      pendingFocusRef.current = null;

      const timeoutId = window.setTimeout(() => {
          setHighlightedTarget(null);
      }, 2600);

      return () => window.clearTimeout(timeoutId);
  }, [atividadesAgrupadas, loading]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  async function carregarTudo() {
      setLoading(true);
      await checkActiveTask();
      await fetchUserRoleAndData();
  }

  async function checkActiveTask() {
      try {
          const { data } = await supabase
              .from("task_logs")
              .select("id, task_id, atividade_id, projeto_id, start_time")
              .eq("user_id", user.id)
              .is("end_time", null)
              .maybeSingle();
          setActiveTask(data || null);
      } catch (err) { console.error(err); }
  }

  async function fetchUserRoleAndData() {
      let userIsAdmin = false;
      try {
          const { data } = await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle();
          if (data && ['admin', 'administrador', 'gestor'].includes(String(data.tipo).toLowerCase())) {
              userIsAdmin = true;
          }
      } catch (err) {}
      
      setIsAdmin(userIsAdmin);
      fetchData(userIsAdmin);
  }

  const sortMaster = (a, b, dateKey) => {
      const ordemA = a.ordem !== null && a.ordem !== undefined ? Number(a.ordem) : 999999;
      const ordemB = b.ordem !== null && b.ordem !== undefined ? Number(b.ordem) : 999999;
      
      if (ordemA !== ordemB) return ordemA - ordemB; 

      if (a[dateKey] && b[dateKey]) {
          const d1 = new Date(a[dateKey]).getTime();
          const d2 = new Date(b[dateKey]).getTime();
          if (d1 !== d2) return d1 - d2;
      } else if (a[dateKey] && !b[dateKey]) { return -1; }
        else if (!a[dateKey] && b[dateKey]) { return 1; }

      if (a.created_at && b.created_at) {
          const c1 = new Date(a.created_at).getTime();
          const c2 = new Date(b.created_at).getTime();
          if (c1 !== c2) return c1 - c2;
      }
      
      return (a.titulo || "").localeCompare(b.titulo || "", undefined, { numeric: true });
  };

  const getSafeFirstName = (nome, email) => {
      try {
          if (nome && typeof nome === 'string') return nome.trim().split(' ')[0];
          if (email && typeof email === 'string') return email.trim().split('@')[0];
          return "Colaborador";
      } catch (e) { return "Colaborador"; }
  };

  const normalizeIdsList = (raw) => {
      if (Array.isArray(raw)) return raw.filter(Boolean).map((v) => String(v));
      if (typeof raw === 'string') {
          const trimmed = raw.trim();
          if (!trimmed) return [];
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              return trimmed
                  .slice(1, -1)
                  .split(',')
                  .map((item) => item.replace(/^"|"$/g, '').trim())
                  .filter(Boolean);
          }
          try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed.filter(Boolean).map((v) => String(v)) : [];
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

  const findProjectIdFromTaskId = (taskId) => {
      if (!taskId) return null;
      const atividade = atividadesAgrupadas.find((a) => (a.tarefas || []).some((t) => String(t.id) === String(taskId)));
      return atividade?.projetoId || null;
  };

  const findProjectIdFromSubtaskId = (subtaskId) => {
      if (!subtaskId) return null;
      const atividade = atividadesAgrupadas.find((a) =>
          (a.tarefas || []).some((t) => (t.subtarefas || []).some((s) => String(s.id) === String(subtaskId)))
      );
      return atividade?.projetoId || null;
  };

  const findProjectIdFromActivityId = (activityId) => {
      if (!activityId) return null;
      return atividadesAgrupadas.find((a) => String(a.id) === String(activityId))?.projetoId || null;
  };

  const getProjectIdFromLogEntry = (logEntry) => {
      if (!logEntry) return null;
      if (logEntry.projeto_id) return logEntry.projeto_id;
      if (logEntry.task_id) return findProjectIdFromTaskId(logEntry.task_id);
      if (logEntry.atividade_id) return findProjectIdFromActivityId(logEntry.atividade_id);
      return null;
  };

  const buildTransitionPrefill = (projectData) => {
      if (!projectData) return null;
      return {
          titulo: `${projectData.titulo || ""}`,
          cliente_id: projectData.cliente_id || "",
          is_parceria: normalizeBoolean(projectData.is_parceria),
          parceiros_ids: normalizeIdsList(projectData.parceiros_ids),
          responsavel_id: projectData.responsavel_id || "",
          colaboradores: normalizeIdsList(projectData.colaboradores),
          programa: projectData.programa || "",
          aviso: projectData.aviso || "",
          codigo_projeto: projectData.codigo_projeto || "",
          investimento: projectData.investimento || 0,
          incentivo: projectData.incentivo || 0,
          descricao: projectData.descricao || ""
      };
  };

  const openTransitionPrompt = (projectData) => {
      const prefill = buildTransitionPrefill(projectData);
      if (!prefill) return;
      setTransitionPrefillData(prefill);
      setTransitionPromptOpen(true);
  };

  const handleTransmitirProjeto = () => {
      if (!transitionPrefillData) return;
      navigate('/dashboard/projetos', {
          state: {
              prefillData: transitionPrefillData,
              openModal: true
          }
      });
  };

  const maybeConcludeProjectAndPrompt = async (projectId) => {
      if (!projectId) return;

      const { data: projectData, error: projectError } = await supabase
          .from("projetos")
          .select("id, titulo, estado, cliente_id, is_parceria, parceiros_ids, responsavel_id, colaboradores, codigo_projeto, investimento, incentivo, descricao, programa, aviso")
          .eq("id", projectId)
          .maybeSingle();

      if (projectError || !projectData || projectData.estado === "concluido") return;

      const { data: atividadesProjeto, error: atividadesError } = await supabase
          .from("atividades")
          .select("id, estado")
          .eq("projeto_id", projectId);

      if (atividadesError || !Array.isArray(atividadesProjeto) || atividadesProjeto.length === 0) return;

      const allActivitiesConcluded = atividadesProjeto.every((atividade) => atividade.estado === "concluido");
      if (!allActivitiesConcluded) return;

      const { data: updatedProject, error: updateError } = await supabase
          .from("projetos")
          .update({ estado: "concluido" })
          .eq("id", projectId)
          .neq("estado", "concluido")
          .select("id")
          .maybeSingle();

      if (updateError || !updatedProject) return;

      showToast("Projeto finalizado! Queres iniciar a próxima etapa (ex: Gestão)?", "success");
      openTransitionPrompt(projectData);
      fetchData(isAdmin);
  };

  const getPersonLabelById = (personId) => {
      if (!personId) return null;
      const interno = staff.find((s) => String(s.id) === String(personId));
      if (interno) return interno.nome || interno.email || null;

      const externo = entidadePessoas.find((p) => String(p.id) === String(personId));
      if (!externo) return null;
      const base = externo.nome_contacto || externo.email || 'Contacto';
      const cargo = externo.cargo ? ` (${externo.cargo})` : '';
      const marca = getClientDisplayName(externo.clientes) ? ` - ${getClientDisplayName(externo.clientes)}` : '';
      return `${base}${cargo}${marca}`;
  };

  async function fetchData(adminStatus) {
    try {
        let querySubtarefas = supabase.from("subtarefas").select(`*, tarefas!inner(*, atividades!inner(*, projetos!inner(id, titulo, clientes!cliente_id(id, marca, sigla))))`);
        if (!adminStatus) querySubtarefas = querySubtarefas.eq("responsavel_id", user.id);

        const [
            { data: ativsResp },
            { data: ativsExtra, error: ativsExtraError },
            { data: tarefasResp },
            { data: tarefasExtra, error: tarefasExtraError },
            { data: subtarefasData },
            { data: comboAtiv },
            { data: staffData },
            { data: cliData },
            { data: projData },
            { data: entidadesData }
        ] = await Promise.all([
            adminStatus
                ? supabase.from("atividades").select(`*, projetos!inner(id, titulo, cliente_id, parceiros_ids, clientes!cliente_id(id, marca, sigla)), profiles:criado_por(nome)`).not("projeto_id", "is", null)
                : supabase.from("atividades").select(`*, projetos!inner(id, titulo, cliente_id, parceiros_ids, clientes!cliente_id(id, marca, sigla)), profiles:criado_por(nome)`).not("projeto_id", "is", null).eq("responsavel_id", user.id),
            adminStatus
                ? Promise.resolve({ data: [], error: null })
                : supabase.from("atividades").select(`*, projetos!inner(id, titulo, cliente_id, parceiros_ids, clientes!cliente_id(id, marca, sigla)), profiles:criado_por(nome)`).not("projeto_id", "is", null).contains("colaboradores_extra", [user.id]),
            adminStatus
                ? supabase.from("tarefas").select(`*, atividades!inner(*, projetos!inner(id, titulo, cliente_id, parceiros_ids, clientes!cliente_id(id, marca, sigla))), profiles:criado_por(nome)`)
                : supabase.from("tarefas").select(`*, atividades!inner(*, projetos!inner(id, titulo, cliente_id, parceiros_ids, clientes!cliente_id(id, marca, sigla))), profiles:criado_por(nome)`).eq("responsavel_id", user.id),
            adminStatus
                ? Promise.resolve({ data: [], error: null })
                : supabase.from("tarefas").select(`*, atividades!inner(*, projetos!inner(id, titulo, cliente_id, parceiros_ids, clientes!cliente_id(id, marca, sigla))), profiles:criado_por(nome)`).contains("colaboradores_extra", [user.id]),
            querySubtarefas,
            supabase.from("atividades").select("id, titulo, projetos(titulo)").not("projeto_id", "is", null).neq("estado", "cancelado"),
            supabase.from("profiles").select("id, nome, email, ativo").order("nome"),
            supabase.from("clientes").select("id, marca, sigla").order("marca"),
            supabase.from("projetos").select("id, titulo").order("titulo"),
            supabase.from("contactos_cliente").select("id, cliente_id, nome_contacto, cargo, email, clientes(marca, sigla)")
        ]);

        if (ativsExtraError) {
            console.warn("Filtro por colaboradores_extra (atividades) indisponivel:", ativsExtraError.message);
        }
        if (tarefasExtraError) {
            console.warn("Filtro por colaboradores_extra (tarefas) indisponivel:", tarefasExtraError.message);
        }

        const ativsData = [
            ...(ativsResp || []),
            ...(ativsExtra || []),
        ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

        const tarefasData = [
            ...(tarefasResp || []),
            ...(tarefasExtra || []),
        ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

        let mapAtividades = new Map();

        if (ativsData) {
            ativsData.forEach(a => {
                mapAtividades.set(a.id, {
                    ...a, 
                    projetoNome: a.projetos?.titulo, projetoId: a.projetos?.id,
                    clienteNome: getClientDisplayName(a.projetos?.clientes), clienteId: a.projetos?.clientes?.id,
                    searchString: (a.titulo + " " + (a.projetos?.titulo||"")).toLowerCase(),
                    tarefasMap: new Map()
                });
            });
        }

        if (tarefasData) {
            tarefasData.forEach(t => {
                const ativ = t.atividades;
                if (!mapAtividades.has(ativ.id)) {
                    mapAtividades.set(ativ.id, {
                        ...ativ,
                        projetoNome: ativ.projetos?.titulo, projetoId: ativ.projetos?.id,
                        clienteNome: getClientDisplayName(ativ.projetos?.clientes), clienteId: ativ.projetos?.clientes?.id,
                        searchString: (ativ.titulo + " " + (ativ.projetos?.titulo||"")).toLowerCase(),
                        tarefasMap: new Map()
                    });
                }
                mapAtividades.get(ativ.id).tarefasMap.set(t.id, { ...t, is_readonly_parent: false, searchString: (t.titulo || '').toLowerCase(), subtarefas: [] });
            });
        }

        if (subtarefasData) {
            subtarefasData.forEach(s => {
                const tar = s.tarefas;
                const ativ = tar.atividades;

                if (!mapAtividades.has(ativ.id)) {
                    mapAtividades.set(ativ.id, {
                        ...ativ,
                        projetoNome: ativ.projetos?.titulo, projetoId: ativ.projetos?.id,
                        clienteNome: getClientDisplayName(ativ.projetos?.clientes), clienteId: ativ.projetos?.clientes?.id,
                        searchString: (ativ.titulo + " " + (ativ.projetos?.titulo||"")).toLowerCase(),
                        tarefasMap: new Map()
                    });
                }
                const ativMap = mapAtividades.get(ativ.id);
                if (!ativMap.tarefasMap.has(tar.id)) {
                    ativMap.tarefasMap.set(tar.id, { ...tar, is_readonly_parent: true, searchString: (tar.titulo || '').toLowerCase(), subtarefas: [] });
                }
                ativMap.tarefasMap.get(tar.id).subtarefas.push({...s, searchString: (s.titulo || '').toLowerCase()});
            });
        }

        let listaAtividades = Array.from(mapAtividades.values()).map(a => {
            const arrTarefas = Array.from(a.tarefasMap.values());
            arrTarefas.sort((t1, t2) => sortMaster(t1, t2, 'data_fim')); 
            arrTarefas.forEach(t => t.subtarefas.sort((s1, s2) => sortMaster(s1, s2, 'data_fim')));
            return { ...a, tarefas: arrTarefas };
        });
        listaAtividades.sort((a1, a2) => sortMaster(a1, a2, 'data_fim'));

        const projectIds = Array.from(
            new Set(
                listaAtividades
                    .map((a) => a.projetoId || a.projetos?.id)
                    .filter(Boolean)
            )
        );

        if (projectIds.length > 0) {
            const { data: allProjectActivities } = await supabase
                .from("atividades")
                .select("id, projeto_id, titulo, estado, depende_de_atividade_id, ignorar_dependencia")
                .in("projeto_id", projectIds);

            const allActivityIds = (allProjectActivities || []).map((a) => a.id).filter(Boolean);
            let allProjectTasks = [];

            if (allActivityIds.length > 0) {
                const { data: tasksData } = await supabase
                    .from("tarefas")
                    .select("id, atividade_id, titulo, estado, depende_de_tarefa_id, ignorar_dependencia")
                    .in("atividade_id", allActivityIds);
                allProjectTasks = tasksData || [];
            }

            const { activityById, taskById } = buildDependencyMaps(allProjectActivities || [], allProjectTasks || []);

            listaAtividades = listaAtividades
                .map((a) => {
                    const activityReason = getActivityBlockReason(a, activityById);
                    if (activityReason) return null;

                    const tarefasVisiveis = (a.tarefas || []).filter((t) => !getTaskBlockReason(t, taskById, activityById));
                    if (tarefasVisiveis.length === 0 && (a.tarefas || []).length > 0) return null;

                    return {
                        ...a,
                        tarefas: tarefasVisiveis
                    };
                })
                .filter(Boolean);
        }

        const taskIds = Array.from(
            new Set(
                listaAtividades.flatMap((a) => (a.tarefas || []).map((t) => t.id)).filter(Boolean)
            )
        );

        if (taskIds.length > 0) {
            const { data: logsData, error: logsError } = await supabase
                .from("task_logs")
                .select("id, user_id, task_id, start_time, end_time, duration_minutes")
                .in("task_id", taskIds)
                .not("duration_minutes", "is", null);

            if (logsError) {
                console.error("Erro ao carregar logs de tarefa:", logsError);
                setLogs([]);
            } else {
                setLogs(logsData || []);
            }
        } else {
            setLogs([]);
        }

        setAtividadesAgrupadas(listaAtividades);
        setAtividadesBase(comboAtiv || []);
        setStaff(staffData || []);
        setClientes(cliData || []);
        setProjetosList(projData || []);
        setEntidadePessoas(entidadesData || []);

    } catch (e) { console.error("ERRO FATAL:", e); }
    
    setLoading(false);
  }

  const getTaskTime = (taskId) => logs.filter(l => l.task_id === taskId).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  const getActivityTime = (ativ) => ativ.tarefas?.reduce((acc, t) => acc + getTaskTime(t.id), 0) || 0;
  
  const formatTime = (mins) => {
      if (mins === 0) return "0m";
      const h = Math.floor(mins / 60); const m = mins % 60;
      return h > 0 ? `${h}h${m}m` : `${m}m`;
  };

  const activityOptions = atividadesAgrupadas.map((a) => ({ id: String(a.id), label: `${a.projetoNome || 'Projeto'} > ${a.titulo}` }));
  const taskOptions = atividadesAgrupadas.flatMap((a) =>
      (a.tarefas || []).map((t) => ({ id: String(t.id), atividade_id: String(a.id), label: `${a.projetoNome || 'Projeto'} > ${a.titulo} > ${t.titulo}` }))
  );
  const subtaskOptions = atividadesAgrupadas.flatMap((a) =>
      (a.tarefas || []).flatMap((t) =>
          (t.subtarefas || []).map((s) => ({
              id: String(s.id),
              task_id: String(t.id),
              atividade_id: String(a.id),
              label: `${a.projetoNome || 'Projeto'} > ${a.titulo} > ${t.titulo} > ${s.titulo}`
          }))
      )
  );

  const getTargetOptions = (targetType) => {
      if (targetType === "atividade") return activityOptions;
      if (targetType === "subtarefa") return subtaskOptions;
      return taskOptions;
  };

  const isHighlightedTask = (targetType, targetId) => {
      if (!highlightedTarget) return false;
      return highlightedTarget.type === targetType && String(highlightedTarget.id) === String(targetId);
  };

  const deveMostrarCampoItem = (itemInfoAdicional, nomeCampo) => {
      if (!itemInfoAdicional) return false; 
      try {
          const info = typeof itemInfoAdicional === 'string' ? JSON.parse(itemInfoAdicional) : itemInfoAdicional;
          if (Object.keys(info).length === 0) return false;
          if (info?.exige && Array.isArray(info?.campos)) {
              return info.campos.includes(nomeCampo);
          }
      } catch (e) {
          console.error(`Erro ao validar o campo ${nomeCampo}:`, e);
      }
      return false; 
  };

  const isMissingSubtaskColumnError = (err) => {
      const message = String(err?.message || "").toLowerCase();
      return message.includes("subtarefa_id") && (message.includes("schema cache") || message.includes("column"));
  };

  const getTimeLogTargetLabel = (log) => {
      if (log.subtarefa_id) return subtaskOptions.find((s) => String(s.id) === String(log.subtarefa_id))?.label || "Passo";
      if (log.task_id) return taskOptions.find((t) => String(t.id) === String(log.task_id))?.label || "Tarefa";
      if (log.atividade_id) return activityOptions.find((a) => String(a.id) === String(log.atividade_id))?.label || "Atividade";
      return "Sem associação";
  };

  const openTimeCreateModal = () => {
      setEditingTimeLogId(null);
      setTimeLogForm({
          user_id: user.id,
          target_type: "tarefa",
          target_id: taskOptions[0]?.id || "",
          duration_minutes: "30"
      });
      setShowTimeModal(true);
  };

  const openTimeEditModal = (log) => {
      let targetType = "tarefa";
      let targetId = String(log.task_id || "");
      if (log.subtarefa_id) {
          targetType = "subtarefa";
          targetId = String(log.subtarefa_id);
      } else if (!log.task_id && log.atividade_id) {
          targetType = "atividade";
          targetId = String(log.atividade_id);
      }

      setEditingTimeLogId(log.id);
      setTimeLogForm({
          user_id: log.user_id || "",
          target_type: targetType,
          target_id: targetId,
          duration_minutes: String(log.duration_minutes || "")
      });
      setShowTimeModal(true);
  };

  const handleSaveTimeLog = async (e) => {
      e.preventDefault();
      const duration = Math.max(1, parseInt(timeLogForm.duration_minutes, 10) || 0);
      if (!timeLogForm.user_id || !timeLogForm.target_id || !duration) {
          showToast("Seleciona colaborador, item e minutos válidos.", "warning");
          return;
      }

      let atividadeId = null;
      let taskId = null;
      let subtarefaId = null;

      if (timeLogForm.target_type === "atividade") {
          atividadeId = timeLogForm.target_id;
      } else if (timeLogForm.target_type === "subtarefa") {
          const selected = subtaskOptions.find((s) => s.id === timeLogForm.target_id);
          if (!selected) return showToast("Passo inválido.", "error");
          subtarefaId = selected.id;
          taskId = selected.task_id;
          atividadeId = selected.atividade_id;
      } else {
          const selected = taskOptions.find((t) => t.id === timeLogForm.target_id);
          if (!selected) return showToast("Tarefa inválida.", "error");
          taskId = selected.id;
          atividadeId = selected.atividade_id;
      }

      const existing = logs.find((l) => String(l.id) === String(editingTimeLogId));
      const start = existing?.start_time ? new Date(existing.start_time) : new Date(Date.now() - duration * 60000);
      const safeStart = isNaN(start.getTime()) ? new Date(Date.now() - duration * 60000) : start;
      const end = new Date(safeStart.getTime() + duration * 60000);

      const payload = {
          user_id: timeLogForm.user_id,
          atividade_id: atividadeId,
          task_id: taskId,
          subtarefa_id: subtarefaId,
          duration_minutes: duration,
          start_time: safeStart.toISOString(),
          end_time: end.toISOString()
      };

      const atividadePai = atividadesAgrupadas.find((a) => String(a.id) === String(atividadeId));
      if (atividadePai?.projetoId) payload.projeto_id = atividadePai.projetoId;

      setTimeLogSaving(true);
      try {
          if (editingTimeLogId) {
              let { error } = await supabase.from("task_logs").update(payload).eq("id", editingTimeLogId);
              if (error && isMissingSubtaskColumnError(error)) {
                  const retryPayload = { ...payload };
                  delete retryPayload.subtarefa_id;
                  const retry = await supabase.from("task_logs").update(retryPayload).eq("id", editingTimeLogId);
                  error = retry.error;
              }
              if (error) throw error;
              showToast("Registo de tempo atualizado.");
          } else {
              let { error } = await supabase.from("task_logs").insert([payload]);
              if (error && isMissingSubtaskColumnError(error)) {
                  const retryPayload = { ...payload };
                  delete retryPayload.subtarefa_id;
                  const retry = await supabase.from("task_logs").insert([retryPayload]);
                  error = retry.error;
              }
              if (error) throw error;
              showToast("Registo de tempo criado.");
          }
          setShowTimeModal(false);
          fetchData(isAdmin);
      } catch (err) {
          showToast("Erro ao guardar tempo: " + err.message, "error");
      } finally {
          setTimeLogSaving(false);
      }
  };

  const handleDeleteTimeLog = async (logId) => {
      if (!window.confirm("Apagar este registo de tempo?")) return;
      const { error } = await supabase.from("task_logs").delete().eq("id", logId);
      if (error) {
          showToast("Erro ao apagar registo.", "error");
          return;
      }
      setLogs((prev) => prev.filter((l) => String(l.id) !== String(logId)));
      showToast("Registo de tempo apagado.");
  };

  const getDeadlineTone = (dateString, isCompleted) => {
      if (!dateString) return null;
      const deadline = new Date(dateString); deadline.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (isCompleted) return { tone: 'done', diffDays, deadline };
      if (diffDays < 0) return { tone: 'late', diffDays, deadline };
      if (diffDays === 0) return { tone: 'today', diffDays, deadline };
      if (diffDays <= 3) return { tone: 'soon', diffDays, deadline };
      return { tone: 'normal', diffDays, deadline };
  };

  const renderDeadline = (dateString, isCompleted) => {
      const info = getDeadlineTone(dateString, isCompleted);
      if (!info) return null;
      const { tone, diffDays, deadline } = info;
      const short = deadline.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }).replace('.', '');
      let text = short;
      if (tone === 'today') text = 'Hoje';
      else if (tone === 'soon' && diffDays === 1) text = 'Amanhã';
      else if (tone === 'late') text = `${short} · ${Math.abs(diffDays)}d atraso`;
      return (
          <span className={`tk-chip tk-due is-${tone}`} title={`Prazo: ${deadline.toLocaleDateString('pt-PT')}`}>
              {tone === 'late' ? <Icons.AlertTriangle size={11} /> : <Icons.Calendar size={11} />} {text}
          </span>
      );
  };

  const STATUS_LABELS = { pendente: 'Pendente', em_curso: 'Em curso', em_analise: 'Em análise', concluido: 'Concluído', cancelado: 'Cancelado' };

  const renderStatusTag = (estado) => {
      if (!estado || estado === 'pendente' || estado === 'concluido') return null;
      return <span className={`tk-chip tk-status is-${estado}`}><i />{STATUS_LABELS[estado] || estado}</span>;
  };

  // Visto com animação de "concluído"
  const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  async function toggleDoneAnimated(tabela, id, estadoAtual, taskIdParaTimer = null) {
      const key = `${tabela}-${id}`;
      if (celebrating.has(key)) return;
      const completing = estadoAtual !== 'concluido';
      if (completing && !prefersReducedMotion()) {
          setCelebrating((prev) => new Set(prev).add(key));
          await new Promise((r) => setTimeout(r, 750));
      }
      try {
          await handleToggleStatus(tabela, id, estadoAtual, taskIdParaTimer);
      } finally {
          if (completing) setCelebrating((prev) => { const next = new Set(prev); next.delete(key); return next; });
      }
  }

  const isCelebrating = (tabela, id) => celebrating.has(`${tabela}-${id}`);

  const renderCheck = (tabela, item, { taskIdParaTimer = null, shape = 'round', noun = 'tarefa' } = {}) => {
      const isDone = item.estado === 'concluido';
      const burst = isCelebrating(tabela, item.id);
      const label = isDone ? `Reabrir ${noun}` : `Concluir ${noun}`;
      return (
          <button
              type="button"
              className={`tk-check is-${shape} ${isDone || burst ? 'is-on' : ''} ${burst ? 'is-burst' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleDoneAnimated(tabela, item.id, item.estado, taskIdParaTimer); }}
              title={label}
              aria-label={label}
              aria-pressed={isDone}
          >
              <Icons.Check size={shape === 'mini' ? 9 : 12} />
              {burst && (
                  <span className="tk-burst" aria-hidden="true">
                      {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--a': `${i * 45}deg` }} />)}
                  </span>
              )}
          </button>
      );
  };

  const renderTimerBtn = (isActive, onClick, { size = 'md', label = '' } = {}) => (
      <button
          type="button"
          className={`tk-timer is-${size} ${isActive ? 'is-on' : ''}`}
          onClick={onClick}
          title={isActive ? `Parar cronómetro${label ? ` · ${label}` : ''}` : `Iniciar cronómetro${label ? ` · ${label}` : ''}`}
          aria-label={isActive ? 'Parar cronómetro' : 'Iniciar cronómetro'}
      >
          {isActive ? <Icons.Stop size={size === 'sm' ? 8 : 10} /> : <Icons.Play size={size === 'sm' ? 9 : 11} />}
      </button>
  );

  const getContextFromTaskId = (taskId) => {
      for (const ativ of atividadesAgrupadas) {
          const tarefa = (ativ.tarefas || []).find(t => t.id === taskId);
          if (tarefa) {
              return {
                  tipo: 'tarefa',
                  titulo: tarefa.titulo || 'tarefa',
                  projeto: ativ.projetoNome || 'Sem projeto'
              };
          }
      }
      return null;
  };

  const getContextFromAtividadeId = (atividadeId) => {
      const ativ = atividadesAgrupadas.find(a => a.id === atividadeId);
      if (!ativ) return null;
      return {
          tipo: 'atividade',
          titulo: ativ.titulo || 'atividade',
          projeto: ativ.projetoNome || 'Sem projeto'
      };
  };

  const getActiveTimerContext = (logEntry) => {
      if (!logEntry) return { tipo: 'item', titulo: 'item', projeto: 'Sem projeto' };
      if (logEntry.task_id) return getContextFromTaskId(logEntry.task_id) || { tipo: 'tarefa', titulo: 'tarefa', projeto: 'Sem projeto' };
      if (logEntry.atividade_id) return getContextFromAtividadeId(logEntry.atividade_id) || { tipo: 'atividade', titulo: 'atividade', projeto: 'Sem projeto' };
      return { tipo: 'item', titulo: 'item', projeto: 'Sem projeto' };
  };

  async function stopTaskLogById(logToStop, stopNote = "") {
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

        const projectColors = [
            'var(--color-btnPrimary)',
            'var(--color-btnPrimaryDark)',
            'var(--color-accentColor)',
            'var(--color-textSecondary)',
            'var(--color-textLight)'
        ];
  const getColorForProject = (id) => {
      if (!id) return '#94a3b8'; 
      const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return projectColors[hash % projectColors.length];
  };

  function openProjectDetail(projectId) {
      if (!projectId) return;
      navigate(`/dashboard/projetos/${projectId}`);
  }

  async function startTaskDirect(tarefa) {
      try {
          const payload = { user_id: user.id, task_id: tarefa.id, start_time: new Date().toISOString() };
          const ativPai = atividadesAgrupadas.find(a => a.tarefas.some(t => t.id === tarefa.id));
          if (ativPai && ativPai.projetoId) payload.projeto_id = ativPai.projetoId;

          const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();
          if (error) {
              showToast("Não foi possível iniciar o cronómetro.", "error");
              return;
          }

          setActiveTask(data);
          if (tarefa.estado === 'pendente') {
              await supabase.from('tarefas').update({ estado: 'em_curso' }).eq('id', tarefa.id);
              fetchData(isAdmin);
          }
          showToast("Cronómetro iniciado! ⏱️");
      } catch (err) {
          console.error("Erro ao iniciar cronómetro:", err);
          showToast("Ocorreu um erro ao iniciar o cronómetro.", "error");
      }
  }

  async function startAtividadeDirect(atividade) {
      try {
          const payload = {
              user_id: user.id,
              atividade_id: atividade.id,
              projeto_id: atividade.projetoId || null,
              start_time: new Date().toISOString()
          };

          const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();
          if (error) {
              showToast("Não foi possível iniciar o cronómetro.", "error");
              return;
          }

          setActiveTask(data);
          if (atividade.estado === 'pendente') {
              await supabase.from('atividades').update({ estado: 'em_curso' }).eq('id', atividade.id);
              fetchData(isAdmin);
          }
          showToast("Cronómetro da atividade iniciado! ⏱️");
      } catch (err) {
          console.error("Erro ao iniciar cronómetro da atividade:", err);
          showToast("Ocorreu um erro ao iniciar o cronómetro.", "error");
      }
  }

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
      const nextTask = timerSwitchModal.pendingTask;
      setTimerSwitchModal({ show: false, message: "", pendingTask: null });
      if (!nextTask) return;

      const mins = await stopTaskLogById(activeTask);
      if (mins === null) return;

      setActiveTask(null);
      showToast(`Cronómetro anterior terminado (${mins} min).`, "success");
      if (nextTask.__timerType === 'atividade') {
          await runActionWithAttendanceWarning(() => startAtividadeDirect(nextTask));
      } else {
          await runActionWithAttendanceWarning(() => startTaskDirect(nextTask));
      }
  }

  function cancelTimerSwitch() {
      setTimerSwitchModal({ show: false, message: "", pendingTask: null });
      showToast("Mantivemos o cronómetro atual em execução.", "info");
  }

  async function handleStartTask(tarefa, e) {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      if (activeTask) {
          const atual = getActiveTimerContext(activeTask);
          const ativPaiNova = atividadesAgrupadas.find(a => a.tarefas.some(t => t.id === tarefa.id));
          const novo = {
              tipo: 'tarefa',
              titulo: tarefa?.titulo || 'tarefa',
              projeto: ativPaiNova?.projetoNome || 'Sem projeto'
          };

          setTimerSwitchModal({
              show: true,
              message: `Deseja terminar a ${atual.tipo} "${atual.titulo}" do projeto "${atual.projeto}" para iniciar a tarefa "${novo.titulo}" do projeto "${novo.projeto}"?`,
              pendingTask: tarefa
          });
          return;
      }

      await runActionWithAttendanceWarning(() => startTaskDirect(tarefa));
  }

  async function handleStartAtividade(atividade, e) {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      if (activeTask) {
          const atual = getActiveTimerContext(activeTask);
          const novo = {
              tipo: 'atividade',
              titulo: atividade?.titulo || 'atividade',
              projeto: atividade?.projetoNome || 'Sem projeto'
          };

          setTimerSwitchModal({
              show: true,
              message: `Deseja terminar a ${atual.tipo} "${atual.titulo}" do projeto "${atual.projeto}" para iniciar a atividade "${novo.titulo}" do projeto "${novo.projeto}"?`,
              pendingTask: { ...atividade, __timerType: 'atividade' }
          });
          return;
      }

      await runActionWithAttendanceWarning(() => startAtividadeDirect(atividade));
  }

  async function handleStopTask() {
      if (!activeTask) return;
      const diffMins = await stopTaskLogById(activeTask);
      if (diffMins === null) return;
      setActiveTask(null);
      showToast(`Tempo guardado: ${diffMins} min.`, "success");
      fetchData(isAdmin);
  }

  function getActiveTaskTitle() {
      return activeTaskTitle || "Tarefa em curso";
  }

  function getActiveTaskLocationLabel() {
      if (!activeTask) return "";

      if (activeTask.task_id) {
          const atividadePai = atividadesAgrupadas.find((a) => (a.tarefas || []).some((t) => String(t.id) === String(activeTask.task_id)));
          if (!atividadePai) return "Tarefa ativa";
          const projeto = atividadePai.projetoNome || "Sem projeto";
          return `${projeto} > ${atividadePai.titulo}`;
      }

      if (activeTask.atividade_id) {
          const atividadeAtiva = atividadesAgrupadas.find((a) => String(a.id) === String(activeTask.atividade_id));
          if (!atividadeAtiva) return "Atividade ativa";
          const projeto = atividadeAtiva.projetoNome || "Sem projeto";
          return `${projeto}`;
      }

      if (activeTask.projeto_id) {
          const projeto = projetosList.find((p) => String(p.id) === String(activeTask.projeto_id));
          return projeto?.titulo || "Projeto ativo";
      }

      return "Item ativo";
  }

    async function focusActiveTaskLocation() {
      if (!activeTask) return;
      navigate(activeTaskRoute || '/dashboard/tarefas');
  }

  function getStopCompleteLabel(logEntry) {
      if (logEntry?.task_id) return "Marcar tarefa como concluida";
      if (logEntry?.atividade_id) return "Marcar atividade como concluida";
      if (logEntry?.projeto_id) return "Marcar projeto como concluido";
      return "Marcar item como concluido";
  }

  async function completeLogItem(logEntry) {
      if (!logEntry) return;

      if (logEntry.task_id) {
          await supabase
              .from("tarefas")
              .update({ estado: "concluido", data_conclusao: new Date().toISOString() })
              .eq("id", logEntry.task_id);
          return;
      }

      if (logEntry.atividade_id) {
          const dataConclusao = new Date().toISOString();
          await supabase
              .from("atividades")
              .update({ estado: "concluido" })
              .eq("id", logEntry.atividade_id);

          await supabase
              .from("tarefas")
              .update({ estado: "concluido", data_conclusao: dataConclusao })
              .eq("atividade_id", logEntry.atividade_id);
          return;
      }

      if (logEntry.projeto_id) {
          await supabase.from("projetos").update({ estado: "concluido" }).eq("id", logEntry.projeto_id);
      }
  }

  function openStopNoteModal(e) {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      if (!activeTask) return;
      setStopNoteModal({ show: true });
  }

  function closeStopNoteModal() {
      setStopNoteModal({ show: false });
  }

    async function finalizeStopWithNote(note, shouldComplete, statusMeta = {}) {
      if (!activeTask) return;

      const logToStop = activeTask;
            const impactedProjectId = logToStop?.atividade_id ? getProjectIdFromLogEntry(logToStop) : null;
      const diffMins = await stopTaskLogById(logToStop, note);
      if (diffMins === null) return;

            await applyStopStatusUpdateForLogTarget(supabase, logToStop, statusMeta);
      if (shouldComplete) await completeLogItem(logToStop);

      setActiveTask(null);
      showToast(shouldComplete ? `Tempo guardado: ${diffMins} min. Item concluido.` : `Tempo guardado: ${diffMins} min.`, "success");
      fetchData(isAdmin);

      if (shouldComplete && impactedProjectId) {
          await maybeConcludeProjectAndPrompt(impactedProjectId);
      }
  }

  async function confirmStopWithNote(note, shouldComplete, statusMeta) {
      setStopNoteModal({ show: false });
      if (!activeTask) return;

      if (shouldComplete) {
          await runActionWithAttendanceWarning(() => finalizeStopWithNote(note, shouldComplete, statusMeta));
          return;
      }

      await finalizeStopWithNote(note, shouldComplete, statusMeta);
  }

  async function handleToggleStatus(tabela, id, estadoAtual, taskIdParaTimer = null) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      const dataConclusao = new Date().toISOString();
      const projectIdFromItem =
          tabela === 'atividades'
              ? findProjectIdFromActivityId(id)
              : tabela === 'tarefas'
                  ? findProjectIdFromTaskId(id)
                  : tabela === 'subtarefas'
                      ? findProjectIdFromSubtaskId(id)
                      : null;

      if (novoEstado === 'concluido' && activeTask && activeTask.task_id === taskIdParaTimer) await handleStopTask();

      if (tabela === 'atividades' && novoEstado === 'concluido') {
          const { error: atividadeError } = await supabase.from('atividades').update({ estado: 'concluido' }).eq('id', id);
          if (atividadeError) {
              showToast("Erro ao concluir atividade.", "error");
              return;
          }

          const { error: tarefasError } = await supabase
              .from('tarefas')
              .update({ estado: 'concluido', data_conclusao: dataConclusao })
              .eq('atividade_id', id);

          if (tarefasError) {
              showToast("Atividade concluída, mas houve erro ao concluir tarefas dessa atividade.", "warning");
          }

          fetchData(isAdmin);
          showToast("Atividade e tarefas associadas concluídas.");
          if (projectIdFromItem) await maybeConcludeProjectAndPrompt(projectIdFromItem);
          return;
      }

      const payload = { estado: novoEstado };
      if (tabela === 'tarefas') {
          payload.data_conclusao = novoEstado === 'concluido' ? dataConclusao : null;
      }

      const { error } = await supabase.from(tabela).update(payload).eq("id", id);
      if (error) {
          showToast("Erro ao alterar estado.", "error");
          return;
      }

      fetchData(isAdmin);
      showToast(novoEstado === 'concluido' ? "Feito! 🎉" : "Reaberto.");
      if (tabela === 'atividades' && novoEstado === 'concluido' && projectIdFromItem) {
          await maybeConcludeProjectAndPrompt(projectIdFromItem);
      }
  }

  function openDeleteConfirm(tabela, id, titulo) {
      setDeleteConfirm({ show: true, tabela, id, titulo });
  }

  async function executeDelete() {
      const { tabela, id } = deleteConfirm;
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      setDeleteConfirm({ show: false, tabela: '', id: null, titulo: '' });
      if(!error) { showToast("Apagado com sucesso."); setShowModal(false); fetchData(isAdmin); }
      else { showToast("Erro ao apagar.", "error"); }
  }

  const toggleExpand = (taskId) => setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));

  const isInactiveStatus = (estado) => estado === 'concluido' || estado === 'cancelado';

  const atividadesFiltradas = atividadesAgrupadas.map(a => {
      const termoBusca = busca.trim().toLowerCase();
      const matchAtividade = !termoBusca || a.searchString.includes(termoBusca);
      const tarefasFiltered = a.tarefas.reduce((acc, t) => {
          const tarefaInativa = isInactiveStatus(t.estado);
          if (!mostrarConcluidos && tarefaInativa) return acc;

          const subtarefasFiltradas = (t.subtarefas || []).filter((s) => {
              if (!mostrarConcluidos && isInactiveStatus(s.estado)) return false;
              return !termoBusca || s.searchString.includes(termoBusca);
          });

          const matchTarefa = !termoBusca || t.searchString.includes(termoBusca);
          const shouldIncludeTask = !termoBusca || matchAtividade || matchTarefa || subtarefasFiltradas.length > 0;

          if (!shouldIncludeTask) return acc;

          acc.push({
              ...t,
              subtarefas: subtarefasFiltradas
          });
          return acc;
      }, []);

      const matchProjeto = filtroProjeto ? String(a.projetoId) === String(filtroProjeto) : true;
      const matchCliente = filtroCliente ? String(a.clienteId) === String(filtroCliente) : true;
      const isAtivInactive = isInactiveStatus(a.estado);
      
      if (!matchProjeto || !matchCliente) return null;
      if (!mostrarConcluidos && isAtivInactive && tarefasFiltered.length === 0) return null;
      if (termoBusca && tarefasFiltered.length === 0 && !matchAtividade) return null;

    return { ...a, tarefas: tarefasFiltered, tarefasCount: a.tarefas.length };
  }).filter(Boolean); 

  // Agrupar atividades por Projeto
  const projetosAgrupadosMap = new Map();
  atividadesFiltradas.forEach(ativ => {
      const pId = ativ.projetoId;
      if (!projetosAgrupadosMap.has(pId)) {
          projetosAgrupadosMap.set(pId, {
              id: pId,
              titulo: ativ.projetoNome || 'Projeto Indefinido',
              cliente: ativ.clienteNome,
              color: getColorForProject(pId),
              atividades: []
          });
      }
      projetosAgrupadosMap.get(pId).atividades.push(ativ);
  });
  
  const projetosRenderList = Array.from(projetosAgrupadosMap.values());
  projetosRenderList.sort((p1, p2) => {
      const nome1 = `${p1.cliente || ''} ${p1.titulo}`.trim().toLowerCase();
      const nome2 = `${p2.cliente || ''} ${p2.titulo}`.trim().toLowerCase();
      return nome1.localeCompare(nome2);
  });

  const kanbanDeadlineColumns = [
      { id: "overdue", title: "Atrasadas", color: "#dc2626" },
      { id: "today", title: "Hoje", color: "#d97706" },
      { id: "tomorrow", title: "Amanhã", color: "#2563eb" },
      { id: "upcoming", title: "Próximas", color: "#059669" },
      { id: "no-date", title: "Sem prazo", color: "#64748b" },
      { id: "completed", title: "Concluídas", color: "#94a3b8" }
  ];

  const kanbanStateColumns = [
      { id: "pendente", title: "Pendente", color: "#64748b" },
      { id: "em_curso", title: "Em curso", color: "#2563eb" },
      { id: "em_analise", title: "Em análise", color: "#9333ea" },
      { id: "concluido", title: "Concluídas", color: "#059669" },
      { id: "cancelado", title: "Canceladas", color: "#dc2626" }
  ];

  const getKanbanItems = () => atividadesFiltradas.flatMap((atividade) => {
      const tasks = atividade.tarefas || [];
      if (tasks.length === 0) return atividade.tarefasCount > 0 ? [] : [{ kind: "atividade", atividade }];
      return tasks.map((tarefa) => ({ kind: "tarefa", atividade, tarefa }));
  });

  const getKanbanItemValue = (item, field) => item.kind === "tarefa" ? item.tarefa[field] : item.atividade[field];

  const getDeadlineColumnId = (item) => {
      const estado = getKanbanItemValue(item, "estado");
      if (estado === "concluido" || estado === "cancelado") return estado === "concluido" ? "completed" : "no-date";
      const dateValue = getKanbanItemValue(item, "data_fim") || getKanbanItemValue(item, "data_limite");
      if (!dateValue) return "no-date";
      const deadline = new Date(dateValue);
      deadline.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diffDays < 0) return "overdue";
      if (diffDays === 0) return "today";
      if (diffDays === 1) return "tomorrow";
      return "upcoming";
  };

  const getKanbanColumns = () => {
      const columns = viewMode === "estados" ? kanbanStateColumns : kanbanDeadlineColumns;
      const items = getKanbanItems();
      return columns.map((column) => ({
          ...column,
          items: items.filter((item) => {
              if (viewMode === "estados") return getKanbanItemValue(item, "estado") === column.id;
              return getDeadlineColumnId(item) === column.id;
          })
      }));
  };

  const saveViewMode = (nextMode) => {
      setViewMode(nextMode);
      window.localStorage.setItem("tarefas-view-mode", nextMode);
  };

  const renderKanbanActivity = (card, column) => {
      const { atividade, tarefa } = card;
      const isTaskCard = card.kind === "tarefa";
      const item = tarefa || atividade;
      const tabela = isTaskCard ? "tarefas" : "atividades";
      const isCompleted = item.estado === "concluido";
      const isTimerActive = isTaskCard
          ? activeTask && String(activeTask.task_id) === String(tarefa.id)
          : activeTask && String(activeTask.atividade_id) === String(atividade.id) && !activeTask.task_id;
      const subtasks = tarefa?.subtarefas || [];
      const subsDone = subtasks.filter((s) => s.estado === "concluido").length;
      const isExpanded = isTaskCard && expandedTasks[tarefa.id];
      const timeSpent = isTaskCard ? getTaskTime(tarefa.id) : getActivityTime(atividade);
      const projColor = getColorForProject(atividade.projetoId);

      return (
          <article
              id={isTaskCard ? `tarefa-card-${tarefa.id}` : `atividade-card-${atividade.id}`}
              key={`${card.kind}-${item.id}`}
              className={`tk-kcard ${isCompleted ? "is-done" : ""} ${isTimerActive ? "is-running" : ""} ${isCelebrating(tabela, item.id) ? "is-celebrating" : ""} ${isHighlightedTask(isTaskCard ? "tarefa" : "atividade", item.id) ? "is-focus" : ""}`}
              style={{ "--pc": projColor, "--c": column.color }}
          >
              <div className="tk-kcard-top">
                  {renderCheck(tabela, item, { taskIdParaTimer: isTaskCard ? item.id : null, noun: isTaskCard ? "tarefa" : "atividade" })}
                  <div className="tk-kcard-main">
                      <button type="button" onClick={() => handleEdit(item, isTaskCard ? "tarefa" : "atividade")} className="tk-kcard-title">
                          <span className="tk-strike">{item.titulo}</span>
                      </button>
                      <button
                          type="button"
                          onClick={() => isTaskCard ? handleEdit(atividade, "atividade") : openProjectDetail(atividade.projetoId)}
                          className="tk-kcard-ctx"
                          title={isTaskCard ? "Editar atividade" : "Abrir projeto"}
                      >
                          <span className="tk-kcard-dot" />
                          <span className="tk-kcard-ctx-text">{isTaskCard ? atividade.titulo : (atividade.clienteNome || "Atividade")} <em>· {atividade.projetoNome || "Projeto"}</em></span>
                      </button>
                  </div>
                  {!isCompleted && !(isTaskCard && tarefa.is_readonly_parent) && renderTimerBtn(
                      isTimerActive,
                      (e) => isTimerActive ? openStopNoteModal(e) : (isTaskCard ? handleStartTask(tarefa, e) : handleStartAtividade(atividade, e)),
                      { size: "md" }
                  )}
              </div>

              <div className="tk-chips">
                  {renderStatusTag(item.estado)}
                  {renderDeadline(item.data_fim || item.data_limite, isCompleted)}
                  {timeSpent > 0 && <span className="tk-chip"><Icons.Clock size={11} /> {formatTime(timeSpent)}</span>}
                  {item.tem_entregavel && <span className="tk-chip is-doc" title="Tem documento entregável"><Icons.FileText size={11} /> Entregável</span>}
                  {!isTaskCard && <span className="tk-chip is-ghost">Sem tarefas</span>}
                  {isTaskCard && subtasks.length > 0 && (
                      <button type="button" onClick={() => toggleExpand(tarefa.id)} className={`tk-chip tk-chip-btn ${isExpanded ? "is-open" : ""}`} title="Mostrar passos">
                          <Icons.ListTree size={11} /> {subsDone}/{subtasks.length} <Icons.ChevronDown size={10} />
                      </button>
                  )}
              </div>

              {isExpanded && subtasks.length > 0 && (
                  <div className="tk-subs">
                      {subtasks.map((sub) => (
                          <div key={sub.id} className={`tk-sub ${sub.estado === "concluido" ? "is-done" : ""} ${isCelebrating("subtarefas", sub.id) ? "is-celebrating" : ""}`}>
                              {renderCheck("subtarefas", sub, { taskIdParaTimer: tarefa.id, shape: "mini", noun: "passo" })}
                              <button type="button" onClick={() => handleEdit(sub, "subtarefa")} className="tk-sub-title"><span className="tk-strike">{sub.titulo}</span></button>
                          </div>
                      ))}
                  </div>
              )}

              {!isTaskCard && !isCompleted && (
                  <form onSubmit={(e) => handleAddTarefa(e, atividade.id)} className="tk-add is-compact">
                      <Icons.Plus size={13} />
                      <input type="text" placeholder="Adicionar tarefa" value={novaTarefaNome.ativId === atividade.id ? novaTarefaNome.nome : ""} onChange={(e) => setNovaTarefaNome({ ativId: atividade.id, nome: e.target.value })} />
                  </form>
              )}
          </article>
      );
  };

  // --- MODAIS E EDIÇÃO ---
  function handleNovo() {
    setEditId(null); setIsViewOnly(false); setEditType('tarefa');
    setFileToUpload(null); setSearchAtivText("");
    setForm({ ...initialForm });
    setShowModal(true);
  }
  
  function handleEdit(item, tipo) { 
    setEditId(item.id); 
    setIsViewOnly(false); 
    setEditType(tipo); 
    setFileToUpload(null);
    
    const safeDate = (d) => d ? d.split('T')[0] : "";
    const deadlineValue = safeDate(item.data_fim || item.data_limite);
    const startDateValue = safeDate(item.data_inicio);

    let criadorNome = "Desconhecido";
    if (item.profiles) {
        if (Array.isArray(item.profiles)) criadorNome = item.profiles[0]?.nome || "Desconhecido";
        else criadorNome = item.profiles.nome || "Desconhecido";
    }

    let parentSearchName = "";
    if (tipo === 'tarefa' && item.atividade_id) {
        const atividadeId = String(item.atividade_id);
        const parentAtiv = atividadesBase.find((a) => String(a.id) === atividadeId)
            || atividadesAgrupadas.find((a) => String(a.id) === atividadeId);
        if (parentAtiv) {
            const projetoNome = parentAtiv.projetos?.titulo || parentAtiv.projetoNome || "Projeto";
            parentSearchName = `${parentAtiv.titulo} (Proj: ${projetoNome})`;
        }
    }
    setSearchAtivText(parentSearchName);

    setForm({ 
        titulo: item.titulo || "", 
        descricao: item.descricao || "", 
        atividade_id: tipo === 'atividade' ? '' : (item.atividade_id || item.tarefa_id || ""), 
        responsavel_id: item.responsavel_id || "", 
        estado: item.estado || "pendente", 
        prioridade: item.prioridade || "normal", 
        data_inicio: startDateValue, 
        data_limite: deadlineValue,
        colaboradores_extra: Array.isArray(item.colaboradores_extra) ? item.colaboradores_extra : [],
        tem_entregavel: item.tem_entregavel || false,
        nome_entregavel: item.nome_entregavel || "",
        data_entregavel: safeDate(item.data_entregavel),
        criado_por_nome: criadorNome,
        created_at: item.created_at || "",
        arquivo_url: item.arquivo_url || "",
        analise_destino: item.analise_destino || "proprio",
        analise_data_prevista: safeDate(item.analise_data_prevista),
        investimento: item.investimento || 0,
        incentivo: item.incentivo || 0,
        financiamento: item.financiamento || 0,
        data_prevista_aprovacao: safeDate(item.data_prevista_aprovacao),
        info_adicional: item.info_adicional || null
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    let tabela = 'tarefas';
    
    // 💡 LÓGICA DE UPLOAD DE FICHEIRO PRIMEIRO
    let finalArquivoUrl = form.arquivo_url;

    if (fileToUpload) {
        setIsUploading(true);
        const preferredName = form.nome_entregavel?.trim() || getFileBaseName(fileToUpload.name);
        const safeBaseName = sanitizeFileName(preferredName);
        const extension = getFileExtension(fileToUpload.name);
        const fileName = extension && !safeBaseName.toLowerCase().endsWith(`.${extension}`)
            ? `${safeBaseName}.${extension}`
            : safeBaseName;
        const filePath = `${user.id}/${Date.now()}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, fileToUpload);

        if (uploadError) {
            showToast("Erro ao fazer upload do documento.", "error");
            setIsUploading(false);
            return; 
        }

        const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(filePath);
        finalArquivoUrl = publicUrlData.publicUrl;
        setIsUploading(false);
    }


    let finalPayload = {
        titulo: form.titulo, estado: form.estado, descricao: form.descricao, 
        responsavel_id: form.responsavel_id || null, 
        colaboradores_extra: form.colaboradores_extra,
        tem_entregavel: form.tem_entregavel, nome_entregavel: form.nome_entregavel, data_entregavel: form.data_entregavel || null,
        arquivo_url: finalArquivoUrl
    };

    if (editType === 'atividade') {
        tabela = 'atividades';
        finalPayload.data_inicio = form.data_inicio || null;
        finalPayload.data_fim = form.data_limite || null;
        finalPayload.investimento = form.investimento || 0;
        finalPayload.incentivo = form.incentivo || 0;
        finalPayload.financiamento = form.financiamento || 0;
        finalPayload.data_prevista_aprovacao = form.data_prevista_aprovacao || null;
        finalPayload.analise_destino = form.estado === 'em_analise' ? (form.analise_destino || 'proprio') : null;
        finalPayload.analise_data_prevista = form.estado === 'em_analise' ? (form.analise_data_prevista || null) : null;
    } else if (editType === 'tarefa') {
        tabela = 'tarefas';
        if (!form.atividade_id) return showToast("A Atividade Pai é obrigatória!", "error");
        finalPayload.atividade_id = form.atividade_id;
        finalPayload.data_inicio = form.data_inicio || null;
        finalPayload.data_fim = form.data_limite || null;
        finalPayload.prioridade = form.prioridade;
        finalPayload.investimento = form.investimento || 0;
        finalPayload.incentivo = form.incentivo || 0;
        finalPayload.financiamento = form.financiamento || 0;
        finalPayload.data_prevista_aprovacao = form.data_prevista_aprovacao || null;
        finalPayload.analise_destino = form.estado === 'em_analise' ? (form.analise_destino || 'proprio') : null;
        finalPayload.analise_data_prevista = form.estado === 'em_analise' ? (form.analise_data_prevista || null) : null;
    } else {
        tabela = 'subtarefas';
        finalPayload = { titulo: form.titulo, estado: form.estado, responsavel_id: form.responsavel_id || null, data_fim: form.data_limite || null };
    }
    
        try {
            if (editId) {
                    await supabase.from(tabela).update(finalPayload).eq("id", editId); 
            } else {
                    finalPayload.criado_por = user.id; 
                    await supabase.from(tabela).insert([finalPayload]); 
            }
            showToast("Alterações guardadas com sucesso!", "success");
            setShowModal(false);
            fetchData(isAdmin);
        } catch (error) {
            showToast("Erro ao guardar alterações! " + (error?.message || ""), "error");
        }
    }

  async function handleAddTarefa(e, ativId) {
            e.preventDefault();
            if(!novaTarefaNome.nome?.trim()) return;
            try {
                await supabase.from("tarefas").insert([{ atividade_id: ativId, titulo: novaTarefaNome.nome, responsavel_id: user.id, estado: 'pendente', criado_por: user.id }]);
                setNovaTarefaNome({ ativId: null, nome: "" });
                fetchData(isAdmin);
                showToast("Tarefa adicionada com sucesso!", "success");
            } catch (error) {
                showToast("Erro ao adicionar tarefa! " + (error?.message || ""), "error");
            }
  }

  const applyDeliverableFile = (file) => {
      if (!file) return;
      setFileToUpload(file);
      const detectedName = getFileBaseName(file.name);
      setForm((prev) => ({
          ...prev,
          nome_entregavel: detectedName
      }));
  };

  async function handleAddSubtarefa(e, tarId) {
            e.preventDefault();
            if(!novaSubtarefaNome.nome?.trim()) return;
            try {
                await supabase.from("subtarefas").insert([{ tarefa_id: tarId, titulo: novaSubtarefaNome.nome, responsavel_id: user.id, estado: 'pendente' }]);
                setNovaSubtarefaNome({ tarId: null, nome: "" });
                fetchData(isAdmin);
                showToast("Passo adicionado com sucesso!", "success");
            } catch (error) {
                showToast("Erro ao adicionar passo! " + (error?.message || ""), "error");
            }
  }

  const toggleColaboradorExtra = (colabId) => {
      setForm(prev => {
          const selectedId = String(colabId);
          const arr = Array.isArray(prev.colaboradores_extra) ? prev.colaboradores_extra.map((id) => String(id)) : [];
          if (arr.includes(selectedId)) return { ...prev, colaboradores_extra: arr.filter(id => id !== selectedId) };
          return { ...prev, colaboradores_extra: [...arr, selectedId] };
      });
  };

  const renderInfoAtribuicao = () => {
      if (!editId || !form.created_at) return null;
      try {
          return `Criado por: ${getSafeFirstName(form.criado_por_nome, "")} em ${new Date(form.created_at).toLocaleDateString('pt-PT')}`;
      } catch(e) { return null; }
  };

  const getAssociatedTasksForEditing = () => {
      if (editType !== 'atividade' || !editId) return [];
      const atividadeAtual = atividadesAgrupadas.find((atividade) => String(atividade.id) === String(editId));
      return atividadeAtual?.tarefas || [];
  };

  const associatedTasks = getAssociatedTasksForEditing();

  const internalAssigneeOptions = (staff || [])
      .filter((s) => Boolean(s?.id))
      .map((s) => ({ id: String(s.id), label: s.nome || s.email || 'Colaborador interno', ativo: s.ativo !== false }));

  const currentModalAtividade = (() => {
      if (editType === 'atividade' && editId) {
          return atividadesAgrupadas.find((a) => String(a.id) === String(editId)) || null;
      }
      if (form.atividade_id) {
          return atividadesAgrupadas.find((a) => String(a.id) === String(form.atividade_id)) || null;
      }
      return null;
  })();

  const modalClientIds = (() => {
      const projeto = currentModalAtividade?.projetos;
      if (!projeto) return [];
      const ids = [
          ...(projeto.cliente_id ? [String(projeto.cliente_id)] : []),
          ...normalizeIdsList(projeto.parceiros_ids)
      ];
      return [...new Set(ids.filter(Boolean))];
  })();

  const modalEntityAssigneeOptions = (entidadePessoas || [])
      .filter((p) => modalClientIds.includes(String(p.cliente_id)))
      .map((p) => {
          const base = p.nome_contacto || p.email || 'Contacto';
          const cargo = p.cargo ? ` (${p.cargo})` : '';
          const marca = getClientDisplayName(p.clientes) ? ` - ${getClientDisplayName(p.clientes)}` : '';
          return { id: String(p.id), label: `${base}${cargo}${marca}` };
      });

  // ---------- Dados derivados para a UI ----------
  const progressByActivity = new Map();
  const progressByProject = new Map();
  atividadesAgrupadas.forEach((a) => {
      const total = (a.tarefas || []).length;
      const done = (a.tarefas || []).filter((t) => t.estado === 'concluido').length;
      progressByActivity.set(String(a.id), { done, total });
      const pKey = String(a.projetoId);
      const prev = progressByProject.get(pKey) || { done: 0, total: 0 };
      progressByProject.set(pKey, { done: prev.done + done, total: prev.total + total });
  });
  const pct = (p) => (p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0);

  const kanbanItemsAll = getKanbanItems();
  const openKanbanItems = kanbanItemsAll.filter((it) => !isInactiveStatus(getKanbanItemValue(it, 'estado')));
  const statLate = openKanbanItems.filter((it) => getDeadlineColumnId(it) === 'overdue').length;
  const statToday = openKanbanItems.filter((it) => getDeadlineColumnId(it) === 'today').length;
  const statRunning = openKanbanItems.filter((it) => getKanbanItemValue(it, 'estado') === 'em_curso').length;

  const initialsOf = (txt) => /^[A-Za-z0-9]{2,3}$/.test(String(txt || '').trim()) ? String(txt).trim().toUpperCase() : String(txt || '?').replace(/[[\]()]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

  const clientFilterOptions = [
      { value: '', label: 'Todos os clientes', icon: <span className="fs-tile" style={{ '--t1': '#cbd5e1', '--t2': '#64748b' }}><Icons.Users size={13} /></span> },
      ...clientes.map((c) => ({ value: c.id, label: getClientDisplayName(c) || c.marca || 'Cliente', hint: c.marca && c.sigla ? c.marca : undefined, group: 'Clientes' })),
  ];
  const projectFilterOptions = [
      { value: '', label: 'Todos os projetos', icon: <span className="fs-tile" style={{ '--t1': 'color-mix(in srgb, var(--color-btnPrimary) 55%, #fff)', '--t2': 'var(--color-btnPrimary)' }}><Icons.Folder size={13} /></span> },
      ...projetosList.map((p) => ({ value: p.id, label: p.titulo || 'Projeto', group: 'Projetos' })),
  ];

  const parentActivityOptions = (() => {
      const list = atividadesBase.map((a) => ({ value: a.id, label: a.titulo || 'Atividade', hint: a.projetos?.titulo ? `Projeto: ${a.projetos.titulo}` : undefined }));
      if (form.atividade_id && !list.some((o) => String(o.value) === String(form.atividade_id))) {
          list.unshift({ value: form.atividade_id, label: searchAtivText || 'Atividade atual' });
      }
      return list;
  })();

  const responsavelOptions = [
      ...internalAssigneeOptions
          .filter((opt) => opt.ativo || String(opt.id) === String(form.responsavel_id))
          .map((opt) => ({ value: opt.id, label: `${opt.label}${!opt.ativo ? ' (Inativo)' : ''}`, group: 'Equipa interna' })),
      ...modalEntityAssigneeOptions.map((opt) => ({ value: opt.id, label: opt.label, group: 'Pessoas das entidades do projeto' })),
  ];

  const staffOptions = staff
      .filter((s) => s.ativo !== false || String(s.id) === String(timeLogForm.user_id))
      .map((s) => ({ value: s.id, label: `${s.nome || s.email}${s.ativo === false ? ' (Inativo)' : ''}` }));

  const PRIORITY_OPTIONS = [
      { value: 'baixa', label: 'Baixa', c: '#22c55e' },
      { value: 'normal', label: 'Normal', c: '#3b82f6' },
      { value: 'alta', label: 'Alta', c: '#f97316' },
      { value: 'urgente', label: 'Urgente', c: '#ef4444' },
  ];
  const STATE_OPTIONS = [
      { value: 'pendente', c: '#94a3b8' },
      { value: 'em_curso', c: '#3b82f6' },
      { value: 'em_analise', c: '#a855f7' },
      { value: 'concluido', c: '#22c55e' },
      { value: 'cancelado', c: '#ef4444' },
  ];
  const editTypeLabel = editType === 'atividade' ? 'Atividade' : editType === 'subtarefa' ? 'Passo' : 'Tarefa';

  const submitModal = (e) => {
      if (editType === 'tarefa' && !form.atividade_id) { e.preventDefault(); showToast('Escolhe a atividade a que esta tarefa pertence.', 'error'); return; }
      if (editType !== 'subtarefa' && !form.responsavel_id) { e.preventDefault(); showToast('Escolhe o responsável principal.', 'error'); return; }
      handleSubmit(e);
  };

  const timeLogsWithDuration = logs.filter((l) => (l.duration_minutes || 0) > 0);
  const timerTitle = activeTask ? getActiveTaskTitle() : '';

  if (loading) return (
      <div className="page-container tk-page">
          <div className="tk-loading"><span /><span /><span /></div>
      </div>
  );

  return (
    <div className="page-container tk-page">
      {notification && (
          <div className={`toast-container ${notification.type}`}>
              {notification.type === 'success' ? '✅' : '⚠️'} {notification.message}
          </div>
      )}

      {/* HERO */}
      <header className="tk-hero">
          <div className="tk-hero-bg" aria-hidden="true"><span className="tk-orb tk-orb-a" /><span className="tk-orb tk-orb-b" /></div>

          <div className="tk-hero-row">
              <div className="tk-hero-main">
                  <span className="tk-hero-icon"><Icons.ClipboardList size={22} /></span>
                  <div>
                      <h1>Tarefas de Projetos</h1>
                      <p>Tudo o que está em curso nos projetos, organizado por atividade.</p>
                  </div>
              </div>
              <div className="tk-hero-stats">
                  <span className={`tk-stat ${statLate > 0 ? 'is-alert' : ''}`}><strong>{statLate}</strong> atrasadas</span>
                  <span className="tk-stat"><strong>{statToday}</strong> para hoje</span>
                  <span className="tk-stat"><strong>{statRunning}</strong> em curso</span>
                  <span className="tk-stat"><strong>{openKanbanItems.length}</strong> abertas</span>
              </div>
          </div>

          <div className="tk-hero-row tk-hero-actions-row">
              <div className="tk-hero-actions">
                  {activeTask && (
                      <div onClick={focusActiveTaskLocation} title="Clica para ir para a tarefa/atividade em curso" className="tk-live">
                          <span className="tk-live-dot" />
                          <span className="tk-live-title">{timerTitle.length > 32 ? `${timerTitle.slice(0, 32)}...` : timerTitle}</span>
                          <button type="button" onClick={openStopNoteModal} className="tk-live-stop"><Icons.Stop /> Parar</button>
                      </div>
                  )}
              </div>
              <div className="tk-hero-actions">
                  <button type="button" onClick={openTimeCreateModal} className="tk-glass-btn" title="Registar tempo manual">
                      <Icons.Clock size={16} /> <span>Tempo manual</span>
                  </button>
                  <button type="button" onClick={handleNovo} className="tk-cta">
                      <Icons.Plus size={16} /> Nova tarefa
                  </button>
              </div>
          </div>
      </header>

      {/* BARRA DE FILTROS */}
      <div className="tk-toolbar">
          <label className="tk-search">
              <Icons.Search size={15} />
              <input
                  type="text"
                  placeholder="Procurar tarefa, atividade, projeto, cliente..."
                  value={busca}
                  onChange={(e) => {
                      setBusca(e.target.value);
                      if (e.target.value) { const obj = {}; atividadesAgrupadas.forEach(a => a.tarefas.forEach(t => obj[t.id] = true)); setExpandedTasks(obj); }
                  }}
              />
              {busca && <button type="button" className="tk-search-clear" onClick={() => setBusca('')} aria-label="Limpar pesquisa"><Icons.Close size={14} /></button>}
          </label>

          {isAdmin && (
              <>
                  <FancySelect value={filtroCliente} onChange={setFiltroCliente} options={clientFilterOptions} className="tk-filter" searchPlaceholder="Procurar cliente..." ariaLabel="Filtrar por cliente" />
                  <FancySelect value={filtroProjeto} onChange={setFiltroProjeto} options={projectFilterOptions} className="tk-filter" searchPlaceholder="Procurar projeto..." ariaLabel="Filtrar por projeto" menuWidth={360} />
              </>
          )}

          <button type="button" className={`tk-toggle ${mostrarConcluidos ? 'is-on' : ''}`} onClick={() => setMostrarConcluidos(!mostrarConcluidos)} aria-pressed={mostrarConcluidos}>
              <span className="tk-toggle-track"><span /></span> Concluídas
          </button>

          <div className="tk-views" role="tablist" aria-label="Modo de visualização">
              {[['projetos', 'Projetos', <Icons.Folder size={14} />], ['kanban', 'Prazos', <Icons.Calendar size={14} />], ['estados', 'Estados', <Icons.Kanban size={14} />]].map(([mode, label, icon]) => (
                  <button key={mode} type="button" role="tab" aria-selected={viewMode === mode} onClick={() => saveViewMode(mode)} className={viewMode === mode ? 'is-on' : ''}>
                      {icon} <span>{label}</span>
                  </button>
              ))}
          </div>
      </div>

      <div className="tk-content" key={viewMode}>
        {viewMode !== 'projetos' ? (
            <div className="tk-board">
                {getKanbanColumns().map((column) => (
                    <section className="tk-col" key={column.id} style={{ '--c': column.color }}>
                        <header className="tk-col-head">
                            <span className="tk-col-dot" />
                            <strong>{column.title}</strong>
                            <span className="tk-col-count">{column.items.length}</span>
                        </header>
                        <div className="tk-col-body">
                            {column.items.length > 0
                                ? column.items.map((item) => renderKanbanActivity(item, column))
                                : <div className="tk-col-empty">Nada por aqui</div>}
                        </div>
                    </section>
                ))}
            </div>
        ) : projetosRenderList.length > 0 ? (
            projetosRenderList.map((proj, pi) => {
                const limit = visibleLimits[proj.id] || 6;
                const visibleAtivs = proj.atividades.slice(0, limit);
                const hasMore = proj.atividades.length > limit;
                const canCollapse = limit > 6;
                const projProgress = progressByProject.get(String(proj.id));
                const openTasks = proj.atividades.reduce((acc, a) => acc + (a.tarefas || []).filter((t) => !isInactiveStatus(t.estado)).length, 0);

                return (
                    <section key={proj.id} className="tk-proj" style={{ '--pc': proj.color, '--i': Math.min(pi, 8) }}>
                        <header className="tk-proj-head">
                            <span className="tk-proj-tile">{initialsOf(proj.cliente || proj.titulo)}</span>
                            <button type="button" className="tk-proj-name" onClick={() => openProjectDetail(proj.id)} title="Abrir projeto">
                                {proj.cliente && <small>{proj.cliente}</small>}
                                <strong>{proj.titulo}</strong>
                            </button>
                            <div className="tk-proj-meta">
                                <span><b>{proj.atividades.length}</b> {proj.atividades.length === 1 ? 'atividade' : 'atividades'}</span>
                                <span><b>{openTasks}</b> {openTasks === 1 ? 'tarefa aberta' : 'tarefas abertas'}</span>
                                {projProgress?.total > 0 && (
                                    <span className="tk-proj-progress" title={`${projProgress.done} de ${projProgress.total} tarefas concluídas`}>
                                        <span className="tk-bar"><i style={{ width: `${pct(projProgress)}%` }} /></span>
                                        <b>{pct(projProgress)}%</b>
                                    </span>
                                )}
                            </div>
                            <button type="button" className="tk-proj-open" onClick={() => openProjectDetail(proj.id)}>
                                Abrir <Icons.ArrowRight size={14} />
                            </button>
                        </header>

                        <div className="tk-grid">
                            {visibleAtivs.map((ativ, ai) => {
                                const isAtivCompleted = ativ.estado === 'concluido';
                                const isAtivTimerActive = activeTask && String(activeTask.atividade_id) === String(ativ.id) && !activeTask.task_id;
                                const ativTime = getActivityTime(ativ);
                                const ativProgress = progressByActivity.get(String(ativ.id));

                                return (
                                    <article
                                        id={`atividade-card-${ativ.id}`}
                                        key={ativ.id}
                                        className={`tk-ativ ${isAtivCompleted ? 'is-done' : ''} ${isAtivTimerActive ? 'is-running' : ''} ${isHighlightedTask('atividade', ativ.id) ? 'is-focus' : ''} ${isCelebrating('atividades', ativ.id) ? 'is-celebrating' : ''}`}
                                        style={{ '--i': Math.min(ai, 10) }}
                                    >
                                        <header className="tk-ativ-head">
                                            {renderCheck('atividades', ativ, { shape: 'square', noun: 'atividade' })}
                                            <div className="tk-ativ-titles">
                                                <h3 onClick={() => handleEdit(ativ, 'atividade')} title="Editar atividade"><span className="tk-strike">{ativ.titulo}</span></h3>
                                                <div className="tk-chips">
                                                    {renderStatusTag(ativ.estado)}
                                                    {renderDeadline(ativ.data_fim, isAtivCompleted)}
                                                    {ativTime > 0 && <span className="tk-chip"><Icons.Clock size={11} /> {formatTime(ativTime)}</span>}
                                                    {ativ.tem_entregavel && <span className="tk-chip is-doc" title="Tem documento entregável"><Icons.FileText size={11} /></span>}
                                                </div>
                                            </div>
                                            {!isAtivCompleted && renderTimerBtn(isAtivTimerActive, (e) => isAtivTimerActive ? openStopNoteModal(e) : handleStartAtividade(ativ, e), { label: 'atividade' })}
                                        </header>

                                        {ativProgress?.total > 0 && (
                                            <div className="tk-ativ-progress" title={`${ativProgress.done} de ${ativProgress.total} tarefas concluídas`}>
                                                <span className="tk-bar"><i style={{ width: `${pct(ativProgress)}%` }} /></span>
                                                <span>{ativProgress.done}/{ativProgress.total}</span>
                                            </div>
                                        )}

                                        {!isAtivCompleted && (
                                            <div className="tk-ativ-body custom-scrollbar">
                                                {(!ativ.tarefas || ativ.tarefas.length === 0) ? (
                                                    <div className="tk-ativ-empty">Ainda sem tarefas.</div>
                                                ) : (
                                                    ativ.tarefas.map((tar) => {
                                                        const isTarCompleted = tar.estado === 'concluido';
                                                        const isTimerActive = activeTask && activeTask.task_id === tar.id;
                                                        const isExpanded = expandedTasks[tar.id];
                                                        const subs = tar.subtarefas || [];
                                                        const subsDone = subs.filter((s) => s.estado === 'concluido').length;
                                                        const tarTime = getTaskTime(tar.id);

                                                        return (
                                                            <div
                                                                id={`tarefa-card-${tar.id}`}
                                                                key={tar.id}
                                                                className={`tk-task ${isTarCompleted ? 'is-done' : ''} ${isTimerActive ? 'is-running' : ''} ${isHighlightedTask('tarefa', tar.id) ? 'is-focus' : ''} ${isCelebrating('tarefas', tar.id) ? 'is-celebrating' : ''}`}
                                                            >
                                                                <div className="tk-task-row">
                                                                    {renderCheck('tarefas', tar, { taskIdParaTimer: tar.id })}
                                                                    <div className="tk-task-main">
                                                                        <button type="button" className="tk-task-title" onClick={() => handleEdit(tar, 'tarefa')}>
                                                                            <span className="tk-strike">{tar.titulo}</span>
                                                                        </button>
                                                                        <div className="tk-chips">
                                                                            {renderStatusTag(tar.estado)}
                                                                            {renderDeadline(tar.data_fim || tar.data_limite, isTarCompleted)}
                                                                            {tarTime > 0 && <span className="tk-chip"><Icons.Clock size={11} /> {formatTime(tarTime)}</span>}
                                                                            {tar.tem_entregavel && <span className="tk-chip is-doc" title="Tem documento entregável"><Icons.FileText size={11} /></span>}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleExpand(tar.id)}
                                                                                className={`tk-chip tk-chip-btn ${isExpanded ? 'is-open' : ''} ${subs.length === 0 ? 'is-add' : ''}`}
                                                                                title={subs.length > 0 ? 'Mostrar passos' : 'Adicionar passos'}
                                                                            >
                                                                                {subs.length > 0
                                                                                    ? <><Icons.ListTree size={11} /> {subsDone}/{subs.length} <Icons.ChevronDown size={10} /></>
                                                                                    : <><Icons.Plus size={11} /> Passos</>}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {!tar.is_readonly_parent && !isTarCompleted && renderTimerBtn(isTimerActive, (e) => isTimerActive ? openStopNoteModal(e) : handleStartTask(tar, e), { size: 'sm', label: 'tarefa' })}
                                                                </div>

                                                                {isExpanded && (
                                                                    <div className="tk-subs">
                                                                        {subs.map((sub) => (
                                                                            <div key={sub.id} className={`tk-sub ${sub.estado === 'concluido' ? 'is-done' : ''} ${isCelebrating('subtarefas', sub.id) ? 'is-celebrating' : ''}`}>
                                                                                {renderCheck('subtarefas', sub, { taskIdParaTimer: tar.id, shape: 'mini', noun: 'passo' })}
                                                                                <button type="button" onClick={() => handleEdit(sub, 'subtarefa')} className="tk-sub-title"><span className="tk-strike">{sub.titulo}</span></button>
                                                                            </div>
                                                                        ))}
                                                                        <form onSubmit={(e) => handleAddSubtarefa(e, tar.id)} className="tk-add is-step">
                                                                            <Icons.Plus size={12} />
                                                                            <input type="text" placeholder="Novo passo (Enter)" value={novaSubtarefaNome.tarId === tar.id ? novaSubtarefaNome.nome : ""} onChange={e => setNovaSubtarefaNome({ tarId: tar.id, nome: e.target.value })} />
                                                                        </form>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}

                                        {!isAtivCompleted && (
                                            <form onSubmit={(e) => handleAddTarefa(e, ativ.id)} className="tk-add">
                                                <Icons.Plus size={14} />
                                                <input type="text" placeholder="Adicionar tarefa (Enter)" value={novaTarefaNome.ativId === ativ.id ? novaTarefaNome.nome : ""} onChange={e => setNovaTarefaNome({ ativId: ativ.id, nome: e.target.value })} />
                                            </form>
                                        )}
                                    </article>
                                );
                            })}
                        </div>

                        {(hasMore || canCollapse) && (
                            <div className="tk-more">
                                {hasMore && (
                                    <button type="button" onClick={() => setVisibleLimits(prev => ({...prev, [proj.id]: limit + 6}))} className="tk-more-btn">
                                        <Icons.ChevronDown size={14} /> Ver mais {proj.atividades.length - limit}
                                    </button>
                                )}
                                {canCollapse && (
                                    <button type="button" onClick={() => setVisibleLimits(prev => ({...prev, [proj.id]: 6}))} className="tk-more-btn is-ghost">
                                        <span className="tk-flip"><Icons.ChevronDown size={14} /></span> Recolher
                                    </button>
                                )}
                            </div>
                        )}
                    </section>
                );
            })
        ) : (
            <div className="tk-empty">
                <span className="tk-empty-icon"><Icons.Check size={28} /></span>
                <h3>Tudo limpo!</h3>
                <p>{busca || filtroCliente || filtroProjeto ? 'Nada corresponde aos filtros atuais.' : 'Não tens tarefas de projeto pendentes.'}</p>
                {(busca || filtroCliente || filtroProjeto) && (
                    <button type="button" className="tk-btn" onClick={() => { setBusca(''); setFiltroCliente(''); setFiltroProjeto(''); }}>Limpar filtros</button>
                )}
            </div>
        )}
      </div>

      {/* APAGAR */}
      {deleteConfirm.show && (
          <ModalPortal>
              <div className="tk-overlay" onClick={() => setDeleteConfirm({show:false, tabela:'', id:null, titulo:''})}>
                  <div className="tk-dialog" onClick={e => e.stopPropagation()}>
                      <span className="tk-dialog-icon is-danger"><Icons.Trash size={24} /></span>
                      <h3>Apagar item?</h3>
                      <p>Tens a certeza que queres apagar <strong>"{deleteConfirm.titulo}"</strong>? Esta ação não pode ser desfeita.</p>
                      <div className="tk-dialog-actions">
                          <button type="button" className="tk-btn" onClick={() => setDeleteConfirm({show:false, tabela:'', id:null, titulo:''})}>Cancelar</button>
                          <button type="button" className="tk-btn is-danger" onClick={executeDelete}>Sim, apagar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* TEMPO MANUAL */}
      {showTimeModal && (
          <ModalPortal>
              <div className="tk-overlay" onClick={() => !timeLogSaving && setShowTimeModal(false)}>
                  <div className="tk-modal is-wide" onClick={e => e.stopPropagation()}>
                      <header className="tk-modal-head">
                          <span className="tk-modal-icon"><Icons.Clock size={20} /></span>
                          <div className="tk-modal-titles">
                              <h3>{editingTimeLogId ? 'Editar registo de tempo' : 'Registar tempo'}</h3>
                              <p>Adiciona tempo trabalhado a uma atividade, tarefa ou passo.</p>
                          </div>
                          <button type="button" className="tk-close" onClick={() => !timeLogSaving && setShowTimeModal(false)} aria-label="Fechar"><Icons.Close size={18} /></button>
                      </header>
                      <div className="tk-modal-body">
                          <form onSubmit={handleSaveTimeLog} className="tk-form">
                              <div className="tk-row-2">
                                  <div className="tk-field">
                                      <label>Colaborador</label>
                                      <FancySelect value={timeLogForm.user_id} onChange={(v) => setTimeLogForm(prev => ({...prev, user_id: v}))} options={staffOptions} icon={<Icons.User size={14} />} className="tk-fs" placeholder="Selecionar..." searchPlaceholder="Procurar colaborador..." ariaLabel="Colaborador" />
                                  </div>
                                  <div className="tk-field">
                                      <label>Tempo</label>
                                      <div className="tk-input-suffix">
                                          <input className="tk-input" type="number" min="1" value={timeLogForm.duration_minutes} onChange={(e) => setTimeLogForm(prev => ({...prev, duration_minutes: e.target.value}))} required placeholder="Ex: 45" />
                                          <span>min</span>
                                      </div>
                                      <small className="tk-hint">= {formatTime(Math.max(0, parseInt(timeLogForm.duration_minutes || "0", 10) || 0))}</small>
                                  </div>
                              </div>
                              <div className="tk-field">
                                  <label>Onde registar</label>
                                  <div className="tk-seg">
                                      {[['atividade', 'Atividade'], ['tarefa', 'Tarefa'], ['subtarefa', 'Passo']].map(([val, lab]) => (
                                          <button key={val} type="button" className={timeLogForm.target_type === val ? 'is-on' : ''} onClick={() => setTimeLogForm(prev => ({ ...prev, target_type: val, target_id: getTargetOptions(val)[0]?.id || "" }))}>{lab}</button>
                                      ))}
                                  </div>
                              </div>
                              <div className="tk-field">
                                  <label>Item</label>
                                  <FancySelect
                                      value={timeLogForm.target_id}
                                      onChange={(v) => setTimeLogForm(prev => ({...prev, target_id: v}))}
                                      options={getTargetOptions(timeLogForm.target_type).map((opt) => ({ value: opt.id, label: opt.label }))}
                                      icon={<Icons.ListTree size={14} />}
                                      className="tk-fs"
                                      placeholder="Selecionar..."
                                      menuWidth={480}
                                      ariaLabel="Item"
                                  />
                              </div>
                              <div className="tk-form-actions">
                                  <button type="button" className="tk-btn" onClick={() => setShowTimeModal(false)}>Cancelar</button>
                                  <button type="submit" className="tk-btn is-primary" disabled={timeLogSaving || !timeLogForm.user_id || !timeLogForm.target_id}>
                                      <Icons.Save size={15} /> {timeLogSaving ? 'A guardar...' : 'Guardar'}
                                  </button>
                              </div>
                          </form>

                          <div className="tk-logs">
                              <h4>Registos <span>{timeLogsWithDuration.length}</span></h4>
                              <div className="tk-logs-list custom-scrollbar">
                                  {timeLogsWithDuration.length === 0 && <div className="tk-logs-empty">Sem registos de tempo.</div>}
                                  {timeLogsWithDuration.map((log) => {
                                      const who = staff.find((s) => String(s.id) === String(log.user_id));
                                      return (
                                          <div key={log.id} className={`tk-log ${String(editingTimeLogId) === String(log.id) ? 'is-editing' : ''}`}>
                                              <span className="tk-log-time">{formatTime(log.duration_minutes || 0)}</span>
                                              <div className="tk-log-main">
                                                  <strong>{getTimeLogTargetLabel(log)}</strong>
                                                  <span>{who?.nome || who?.email || 'Utilizador'} · {log.start_time ? new Date(log.start_time).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                              </div>
                                              <div className="tk-log-actions">
                                                  <button type="button" onClick={() => openTimeEditModal(log)} title="Editar registo" aria-label="Editar registo"><Icons.Edit size={13} /></button>
                                                  <button type="button" className="is-danger" onClick={() => handleDeleteTimeLog(log.id)} title="Apagar registo" aria-label="Apagar registo"><Icons.Trash size={13} /></button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
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
                analysisTargetLog={activeTask}
                title="Parar cronometro"
                message="Podes adicionar uma nota breve para este registo (opcional)."
                placeholder="Ex: Pausa para reunião com cliente"
                showCompleteOption={Boolean(activeTask)}
                showStatusOption={Boolean(activeTask)}
                completeLabel={getStopCompleteLabel(activeTask)}
                onCancel={closeStopNoteModal}
                onConfirm={confirmStopWithNote}
            />

      {/* EDITAR / CRIAR */}
      {showModal && (
        <ModalPortal>
          <div className="tk-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="tk-modal">
              <header className="tk-modal-head">
                  <span className="tk-modal-icon">{editId ? <Icons.Edit size={19} /> : <Icons.Plus size={20} />}</span>
                  <div className="tk-modal-titles">
                      <h3>{isViewOnly ? 'Detalhes' : (editId ? `Editar ${editTypeLabel.toLowerCase()}` : 'Nova tarefa')}</h3>
                      <p>{editId ? (form.titulo || editTypeLabel) : 'Cria uma tarefa dentro de uma atividade de projeto.'}</p>
                  </div>
                  {editId && !isViewOnly && (
                      <button type="button" className="tk-icon-btn is-danger" title="Apagar" aria-label="Apagar" onClick={() => { setShowModal(false); openDeleteConfirm(editType === 'atividade' ? 'atividades' : editType === 'tarefa' ? 'tarefas' : 'subtarefas', editId, form.titulo); }}>
                          <Icons.Trash size={16} />
                      </button>
                  )}
                  <button type="button" className="tk-close" onClick={() => setShowModal(false)} aria-label="Fechar"><Icons.Close size={18} /></button>
              </header>

              <form onSubmit={submitModal} className="tk-modal-form">
                <div className="tk-modal-body">
                  <fieldset disabled={isViewOnly || isUploading} className="tk-fieldset">

                    <div className="tk-field">
                        <label>Título <em>*</em></label>
                        <input className="tk-input tk-input-title" type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required placeholder={`Nome ${editType === 'atividade' ? 'da atividade' : editType === 'subtarefa' ? 'do passo' : 'da tarefa'}...`} autoFocus={!editId} />
                    </div>

                    <section className="tk-sec">
                        <h4><Icons.Users size={14} /> Enquadramento</h4>
                        <div className="tk-row-2">
                            {editType === 'tarefa' && (
                                <div className="tk-field tk-span-2">
                                    <label>Atividade / projeto <em>*</em></label>
                                    <FancySelect
                                        value={form.atividade_id}
                                        onChange={(v) => {
                                            const a = atividadesBase.find((x) => String(x.id) === String(v));
                                            setForm({ ...form, atividade_id: v });
                                            setSearchAtivText(a ? `${a.titulo} (Proj: ${a.projetos?.titulo || 'Projeto'})` : '');
                                        }}
                                        options={parentActivityOptions}
                                        icon={<Icons.Folder size={14} />}
                                        className="tk-fs"
                                        placeholder="Escolher atividade..."
                                        searchPlaceholder="Procurar atividade ou projeto..."
                                        menuWidth={520}
                                        ariaLabel="Atividade"
                                    />
                                </div>
                            )}

                            <div className="tk-field">
                                <label>Responsável principal <em>*</em></label>
                                <FancySelect
                                    value={form.responsavel_id}
                                    onChange={(newResp) => {
                                        const extras = Array.isArray(form.colaboradores_extra) ? form.colaboradores_extra.map((id) => String(id)) : [];
                                        setForm({...form, responsavel_id: newResp, colaboradores_extra: extras.filter((id) => id !== String(newResp))});
                                    }}
                                    options={responsavelOptions}
                                    icon={<Icons.User size={14} />}
                                    className="tk-fs"
                                    placeholder="Selecionar..."
                                    searchPlaceholder="Procurar pessoa..."
                                    menuWidth={360}
                                    ariaLabel="Responsável principal"
                                />
                            </div>

                            {editType === 'tarefa' && (
                                <div className="tk-field">
                                    <label>Prioridade</label>
                                    <div className="tk-seg is-priority">
                                        {PRIORITY_OPTIONS.map((p) => (
                                            <button key={p.value} type="button" style={{ '--c': p.c }} className={form.prioridade === p.value ? 'is-on' : ''} onClick={() => setForm({...form, prioridade: p.value})}>
                                                <i /> {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {(editType === 'tarefa' || editType === 'atividade') && (
                            <div className="tk-field">
                                <label>Outros colaboradores envolvidos</label>
                                <div className="tk-people">
                                    <div className="tk-people-group">
                                        <span className="tk-people-label">Equipa interna</span>
                                        <div className="tk-people-chips">
                                            {internalAssigneeOptions
                                                .filter(s => String(s.id) !== String(form.responsavel_id || ''))
                                                .filter(s => s.ativo || (form.colaboradores_extra || []).map(String).includes(String(s.id)))
                                                .map(s => {
                                                    const isChecked = Array.isArray(form.colaboradores_extra) && form.colaboradores_extra.map(String).includes(String(s.id));
                                                    return (
                                                        <button type="button" key={`extra-int-${s.id}`} onClick={() => toggleColaboradorExtra(s.id)} className={`tk-person ${isChecked ? 'is-on' : ''}`} aria-pressed={isChecked}>
                                                            <span className="tk-person-av">{isChecked ? <Icons.Check size={10} /> : initialsOf(s.label).slice(0, 1)}</span>
                                                            {s.label}{!s.ativo ? ' (Inativo)' : ''}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                    <div className="tk-people-group">
                                        <span className="tk-people-label">Pessoas das entidades</span>
                                        <div className="tk-people-chips">
                                            {modalEntityAssigneeOptions.filter(s => String(s.id) !== String(form.responsavel_id || '')).length === 0 && (
                                                <span className="tk-people-empty">{editType === 'tarefa' && !form.atividade_id ? 'Escolhe primeiro a atividade.' : 'Sem contactos associados ao projeto.'}</span>
                                            )}
                                            {modalEntityAssigneeOptions.filter(s => String(s.id) !== String(form.responsavel_id || '')).map(s => {
                                                const isChecked = Array.isArray(form.colaboradores_extra) && form.colaboradores_extra.map(String).includes(String(s.id));
                                                return (
                                                    <button type="button" key={`extra-ent-${s.id}`} onClick={() => toggleColaboradorExtra(s.id)} className={`tk-person is-ext ${isChecked ? 'is-on' : ''}`} aria-pressed={isChecked}>
                                                        <span className="tk-person-av">{isChecked ? <Icons.Check size={10} /> : initialsOf(s.label).slice(0, 1)}</span>
                                                        {s.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="tk-sec">
                        <h4><Icons.Calendar size={14} /> Planeamento{(deveMostrarCampoItem(form.info_adicional, 'investimento') || deveMostrarCampoItem(form.info_adicional, 'incentivo') || deveMostrarCampoItem(form.info_adicional, 'financiamento')) ? ' & financeiro' : ''}</h4>
                        <div className="tk-row-auto">
                            {(editType === 'tarefa' || editType === 'atividade') && (
                                <div className="tk-field">
                                    <label>Data de início</label>
                                    <input className="tk-input" type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} />
                                </div>
                            )}
                            <div className="tk-field">
                                <label>Prazo limite</label>
                                <input className={`tk-input ${form.data_limite ? 'is-deadline' : ''}`} type="date" value={form.data_limite} onChange={e => setForm({...form, data_limite: e.target.value})} />
                            </div>
                            {deveMostrarCampoItem(form.info_adicional, 'investimento') && (
                                <div className="tk-field">
                                    <label>Investimento (€)</label>
                                    <input className="tk-input" type="number" step="0.01" value={form.investimento} onChange={e => setForm({...form, investimento: e.target.value})} />
                                </div>
                            )}
                            {deveMostrarCampoItem(form.info_adicional, 'incentivo') && (
                                <div className="tk-field">
                                    <label>Incentivo (€)</label>
                                    <input className="tk-input" type="number" step="0.01" value={form.incentivo} onChange={e => setForm({...form, incentivo: e.target.value})} />
                                </div>
                            )}
                            {deveMostrarCampoItem(form.info_adicional, 'financiamento') && (
                                <div className="tk-field">
                                    <label>Financiamento (€)</label>
                                    <input className="tk-input" type="number" step="0.01" value={form.financiamento} onChange={e => setForm({...form, financiamento: e.target.value})} />
                                </div>
                            )}
                            {deveMostrarCampoItem(form.info_adicional, 'data_prevista_aprovacao') && (
                                <div className="tk-field">
                                    <label>Data prev. aprovação</label>
                                    <input className="tk-input" type="date" value={form.data_prevista_aprovacao} onChange={e => setForm({...form, data_prevista_aprovacao: e.target.value})} />
                                </div>
                            )}
                        </div>
                    </section>

                    {editType === 'atividade' && editId && (
                        <section className="tk-sec">
                            <h4><Icons.ListTree size={14} /> Tarefas associadas <span className="tk-sec-count">{associatedTasks.length}</span></h4>
                            {associatedTasks.length === 0 ? (
                                <div className="tk-assoc-empty">Ainda não existem tarefas ligadas a esta atividade.</div>
                            ) : (
                                <div className="tk-assoc">
                                    {associatedTasks.map((task) => {
                                        const isTaskInactive = task.estado === 'concluido' || task.estado === 'cancelado';
                                        const isTaskTimerActive = activeTask && String(activeTask.task_id) === String(task.id);
                                        const responsavelNome = getPersonLabelById(task.responsavel_id);
                                        const subtarefasCount = Array.isArray(task.subtarefas) ? task.subtarefas.length : 0;
                                        return (
                                            <div key={task.id} className={`tk-assoc-row ${isTaskInactive ? 'is-done' : ''} ${isCelebrating('tarefas', task.id) ? 'is-celebrating' : ''}`}>
                                                {renderCheck('tarefas', task, { taskIdParaTimer: task.id })}
                                                <div className="tk-assoc-main">
                                                    <strong><span className="tk-strike">{task.titulo}</span></strong>
                                                    <div className="tk-chips">
                                                        {renderStatusTag(task.estado)}
                                                        <span className="tk-chip is-ghost"><Icons.User size={11} /> {responsavelNome || 'Sem responsável'}</span>
                                                        {task.data_fim && renderDeadline(task.data_fim, task.estado === 'concluido')}
                                                        {subtarefasCount > 0 && <span className="tk-chip"><Icons.ListTree size={11} /> {subtarefasCount}</span>}
                                                    </div>
                                                </div>
                                                {!isTaskInactive && renderTimerBtn(isTaskTimerActive, () => isTaskTimerActive ? openStopNoteModal() : handleStartTask(task), { size: 'sm' })}
                                                <button type="button" className="tk-assoc-open" onClick={() => handleEdit(task, 'tarefa')}>Abrir</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {(editType === 'tarefa' || editType === 'atividade') && (
                        <section className="tk-sec">
                            <button type="button" className={`tk-switch ${form.tem_entregavel ? 'is-on' : ''}`} onClick={() => setForm({...form, tem_entregavel: !form.tem_entregavel})} aria-pressed={form.tem_entregavel}>
                                <span className="tk-switch-track"><span /></span>
                                <span className="tk-switch-text">
                                    <strong>Requer documento entregável</strong>
                                    <em>{form.tem_entregavel ? 'Indica o documento e, se já existir, anexa-o.' : 'Liga se esta tarefa tiver de produzir um documento.'}</em>
                                </span>
                            </button>

                            {form.tem_entregavel && (
                                <div className="tk-deliv">
                                    <div className="tk-row-2 is-wide-first">
                                        <div className="tk-field">
                                            <label>Nome / tipo de documento</label>
                                            <input className="tk-input" type="text" placeholder="Ex: Relatório final PDF" value={form.nome_entregavel || ''} onChange={e => setForm({...form, nome_entregavel: e.target.value})} />
                                        </div>
                                        <div className="tk-field">
                                            <label>Data p/ entrega</label>
                                            <input className="tk-input" type="date" value={form.data_entregavel || ''} onChange={e => setForm({...form, data_entregavel: e.target.value})} />
                                        </div>
                                    </div>

                                    {form.arquivo_url ? (
                                        <div className="tk-file">
                                            <span className="tk-file-icon"><Icons.FileText size={18} /></span>
                                            <a href={form.arquivo_url} target="_blank" rel="noopener noreferrer">Ver documento atual <Icons.ExternalLink size={13} /></a>
                                            <button type="button" className="tk-file-remove" onClick={() => { setForm({...form, arquivo_url: ""}); setFileToUpload(null); }}>Remover</button>
                                        </div>
                                    ) : (
                                        <label
                                            className={`tk-drop ${isDeliverableDragOver ? 'is-over' : ''} ${fileToUpload ? 'has-file' : ''}`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDeliverableDragOver(true); }}
                                            onDragEnter={(e) => { e.preventDefault(); setIsDeliverableDragOver(true); }}
                                            onDragLeave={() => setIsDeliverableDragOver(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDeliverableDragOver(false); applyDeliverableFile(e.dataTransfer?.files?.[0]); }}
                                        >
                                            <span className="tk-drop-icon">{fileToUpload ? <Icons.FileText size={22} /> : <Icons.UploadCloud size={22} />}</span>
                                            <span className="tk-drop-text">
                                                <strong>{fileToUpload ? fileToUpload.name : 'Arrasta um ficheiro ou clica para escolher'}</strong>
                                                <em>{fileToUpload ? 'Vai ser enviado quando guardares.' : 'PDF, Excel, Word...'}</em>
                                            </span>
                                            <input type="file" onChange={(e) => applyDeliverableFile(e.target.files?.[0] || null)} hidden />
                                        </label>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {editType !== 'subtarefa' && (
                        <section className="tk-sec">
                            <h4><Icons.FileText size={14} /> Detalhes & notas</h4>
                            <textarea className="tk-input tk-notes" rows="3" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Links, notas, informações úteis..." />
                        </section>
                    )}

                    <section className="tk-sec">
                        <h4><Icons.Flame size={14} /> Estado</h4>
                        <div className="tk-states">
                            {STATE_OPTIONS.map((st) => (
                                <button key={st.value} type="button" style={{ '--c': st.c }} className={form.estado === st.value ? 'is-on' : ''} onClick={() => setForm({...form, estado: st.value})} aria-pressed={form.estado === st.value}>
                                    <i /> {STATUS_LABELS[st.value]}
                                </button>
                            ))}
                        </div>

                        {editType !== 'subtarefa' && (form.estado === 'em_analise' || form.analise_data_prevista) && (
                            <div className="tk-analysis">
                                <div className="tk-analysis-title">Acompanhamento da análise</div>
                                <div className="tk-row-2">
                                    <div className="tk-field">
                                        <label>Encaminhada para</label>
                                        <div className="tk-seg is-wrap">
                                            {ANALYSIS_DESTINATION_OPTIONS.map((option) => (
                                                <button key={option.value} type="button" className={(form.analise_destino || 'proprio') === option.value ? 'is-on' : ''} onClick={() => setForm({...form, analise_destino: option.value})}>
                                                    {option.value === 'proprio' ? 'Próprio' : option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="tk-field">
                                        <label>Data expectável de resposta</label>
                                        <input className="tk-input" type="date" value={form.analise_data_prevista || ''} onChange={(e) => setForm({...form, analise_data_prevista: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                  </fieldset>
                </div>

                <footer className="tk-modal-foot">
                    <span className="tk-foot-info">{renderInfoAtribuicao()}</span>
                    {!isViewOnly && (
                        <div className="tk-foot-actions">
                            <button type="button" className="tk-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="submit" className="tk-btn is-primary" disabled={isUploading}>
                                {isUploading ? 'A carregar...' : editId ? <><Icons.Save size={15} /> Guardar alterações</> : <><Icons.Plus size={15} /> Criar</>}
                            </button>
                        </div>
                    )}
                </footer>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* PROJETO CONCLUÍDO → PRÓXIMA ETAPA */}
      {transitionPromptOpen && (
          <ModalPortal>
              <div className="tk-overlay" onClick={(e) => { if (e.target === e.currentTarget) setTransitionPromptOpen(false); }}>
                  <div className="tk-dialog">
                      <span className="tk-dialog-icon is-success"><Icons.Rocket size={24} /></span>
                      <h3>Projeto concluído 🎉</h3>
                      <p>Queres criar um novo projeto já pré-preenchido com esta informação para iniciar a próxima etapa (ex: Gestão)?</p>
                      <div className="tk-dialog-actions">
                          <button type="button" className="tk-btn" onClick={() => setTransitionPromptOpen(false)}>Agora não</button>
                          <button type="button" className="tk-btn is-primary" onClick={() => { setTransitionPromptOpen(false); handleTransmitirProjeto(); }}>Iniciar próxima etapa</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}
    </div>
  );
}
