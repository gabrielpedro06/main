import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom"; 
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import "./../styles/dashboard.css";

// --- ÍCONES SVG PROFISSIONAIS (SaaS Premium) ---
const Icons = {
  Search: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Users: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Building: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>,
  MapPin: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  User: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  ExternalLink: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Restore: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>,
  Archive: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
  Eye: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  Copy: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  ClipboardList: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>,
  Activity: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  FileText: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Diamond: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"></path><path d="M11 3 8 9l4 13 4-13-3-6"></path><path d="M2 9h20"></path></svg>,
  Lock: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Rocket: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  Calendar: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  ArrowRight: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  Alert: ({ size = 40, color = "#ef4444" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Inbox: ({ size = 48, color = "#cbd5e1" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>,
  Phone: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  Mail: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
  Play: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Stop: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const CARGO_OPTIONS = [
  "Gerente",
  "Contabilista Certificado(CC)",
  "Presidente",
  "Diretor(a)",
  "Técnico(a) de Contabilidade",
  "Responsável de Operações",
  "Comercial",
  "Sócio(a)",
  "Gestor(a) de Projetos",
  "Administrativo(a)",
  "Diretor(a) Financeiro",
  "Administrador(a)",
  "Marketing",
  "Coordenador(a) de Formação",
  "Formador(a) Interno",
];

const OUTRO_CARGO_VALUE = "__outro__";

const isKnownCargo = (cargo) => CARGO_OPTIONS.includes(String(cargo || ""));

const getCargoSelectValue = (cargo) => {
  const value = String(cargo || "").trim();
  if (!value) return "";
  return isKnownCargo(value) ? value : OUTRO_CARGO_VALUE;
};

export default function Clientes() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [podeVerAcessos, setPodeVerAcessos] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusTab, setStatusTab] = useState("ativos");
  const [viewMode, setViewMode] = useState("cards");
  const [notification, setNotification] = useState(null);
  const [activeLog, setActiveLog] = useState(null);
  const [activeLogTitle, setActiveLogTitle] = useState("");
  const [activeLogRoute, setActiveLogRoute] = useState("/dashboard/tarefas");
  const [stopNoteModal, setStopNoteModal] = useState({ show: false });
  const [timerSwitchModal, setTimerSwitchModal] = useState({ show: false, message: "", pending: null });
  const [projectTimerModal, setProjectTimerModal] = useState({
    show: false,
    loading: false,
    project: null,
    atividades: [],
    selectedAtividadeId: "",
    selectedTaskId: ""
  });

  const [showModal, setShowModal] = useState(false);
  const [isClosingPanel, setIsClosingPanel] = useState(false);
  const [editId, setEditId] = useState(null); 
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");
  const [uploading, setUploading] = useState(false);

  const cropImgRef = useRef(null);
  const cropContainerRef = useRef(null);
  const [cropModal, setCropModal] = useState({ show: false, src: null });
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropDragStart, setCropDragStart] = useState(null);
  const [cropImgNatural, setCropImgNatural] = useState({ w: 1, h: 1 });
  const [cropContainerSize, setCropContainerSize] = useState({ w: 400, h: 400 });

  const [showAddContacto, setShowAddContacto] = useState(false);
  const [showAddMorada, setShowAddMorada] = useState(false);
  const [showAddCae, setShowAddCae] = useState(false);
  const [showAddAcesso, setShowAddAcesso] = useState(false);

  // FORMULÁRIO GERAL 
  const initialForm = {
    marca: "", sigla: "", nif: "", entidade: "", website: "",
    objeto_social: "", plano: "Standard",
    certidao_permanente: "", validade_certidao: "",
    rcbe: "", validade_rcbe: "", ativo: true,
    avatar_url: ""
  };
  const [form, setForm] = useState(initialForm);

  const [contactos, setContactos] = useState([]);
  const [moradas, setMoradas] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [tiposAcessosCatalogo, setTiposAcessosCatalogo] = useState([]);
  const [caes, setCaes] = useState([]);
  const [pendingAutoCaes, setPendingAutoCaes] = useState([]);
  const [pendingAutoMorada, setPendingAutoMorada] = useState(null);
  
  // Histórico de Projetos do Cliente
  const [projetosCliente, setProjetosCliente] = useState([]);

  // Modais Confirmação Global
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', confirmText: '', onConfirm: null, isDanger: false });

  // SUB-FORMS INICIAIS
  const initContacto = { nome_contacto: "", email: "", telefone: "", cargo: "" };
  const initMorada = { morada: "", localidade: "", codigo_postal: "", concelho: "", distrito: "", regiao: "", notas: "" };
  const initAcesso = { tipo_acesso_id: "", utilizador: "", codigo: "" };
  const initCae = { codigo: "", descricao: "", principal: false };

  const [novoContacto, setNovoContacto] = useState(initContacto);
  const [isOutroCargo, setIsOutroCargo] = useState(false);
  const [novaMorada, setNovaMorada] = useState(initMorada);
  const [novoAcesso, setNovoAcesso] = useState(initAcesso);

  const normalizeParceirosIds = (rawParceiros) => {
    if (Array.isArray(rawParceiros)) return rawParceiros.map(id => String(id));

    if (typeof rawParceiros === "string") {
      const raw = rawParceiros.trim();
      if (!raw) return [];

      // Handles Postgres array literal format: {id1,id2}
      if (raw.startsWith("{") && raw.endsWith("}")) {
        return raw
          .slice(1, -1)
          .split(",")
          .map(item => item.replace(/^"|"$/g, "").trim())
          .filter(Boolean);
      }

      // Handles JSON string format: ["id1","id2"]
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(id => String(id));
      } catch (err) {
        return [];
      }
    }

    return [];
  };
  const [novoCae, setNovoCae] = useState(initCae);

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (user?.id) checkActiveLog();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const refresh = () => checkActiveLog();
    const intervalId = setInterval(refresh, 45000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const resolveActiveTitle = async () => {
      if (!activeLog) {
        if (!cancelled) {
          setActiveLogTitle("");
          setActiveLogRoute("/dashboard/tarefas");
        }
        return;
      }

      const timerMeta = await resolveActiveTimerMeta(supabase, activeLog);
      if (cancelled) return;

      setActiveLogTitle(timerMeta.title || "Tempo a decorrer...");
      setActiveLogRoute(timerMeta.route || "/dashboard/tarefas");
    };

    resolveActiveTitle();

    return () => {
      cancelled = true;
    };
  }, [activeLog]);

  useEffect(() => {
    const el = cropContainerRef.current;
    if (!cropModal.show || !el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setCropScale((prev) => {
        const minScale = Math.max(
          (cropContainerSize.w * 0.8) / cropImgNatural.w,
          (cropContainerSize.h * 0.8) / cropImgNatural.h
        );
        return Math.max(minScale, Math.min(prev * factor, minScale * 8));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cropModal.show, cropContainerSize, cropImgNatural]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3500);
  };

  async function checkActiveLog() {
    if (!user?.id) {
      setActiveLog(null);
      return;
    }

    const { data, error } = await supabase
      .from("task_logs")
      .select("*")
      .eq("user_id", user.id)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1);

    if (error) {
      setActiveLog(null);
      return;
    }

    setActiveLog(Array.isArray(data) ? data[0] || null : null);
  }

  async function stopLogById(logToStop, stopNote = "") {
    if (!logToStop) return null;
    const diffMins = Math.max(1, Math.floor((new Date() - new Date(logToStop.start_time)) / 60000));
    const stopTimestamp = new Date().toISOString();
    const note = typeof stopNote === "string" ? stopNote.trim() : "";
    const payload = { end_time: stopTimestamp, duration_minutes: diffMins };
    if (note) payload.observacoes = note;

    let { error } = await supabase.from("task_logs").update(payload).eq("id", logToStop.id);

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

  function openStopNoteModal(e) {
    if (e?.stopPropagation) e.stopPropagation();
    if (!activeLog) return;
    setStopNoteModal({ show: true });
  }

  function closeStopNoteModal() {
    setStopNoteModal({ show: false });
  }

  async function confirmStopWithNote(note) {
    setStopNoteModal({ show: false });
    if (!activeLog) return;

    const logToStop = activeLog;
    const diffMins = await stopLogById(logToStop, note);
    if (diffMins === null) return;

    setActiveLog(null);
    showToast(`Tempo registado: ${diffMins} min.`, "success");
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

  async function openProjectTimerModal(project, event) {
    if (event?.stopPropagation) event.stopPropagation();
    if (!project?.id) return;

    setProjectTimerModal({
      show: true,
      loading: true,
      project,
      atividades: [],
      selectedAtividadeId: "",
      selectedTaskId: ""
    });

    const { data, error } = await supabase
      .from("atividades")
      .select("id, titulo, estado, ordem, created_at, tarefas(id, titulo, estado, ordem, created_at)")
      .eq("projeto_id", project.id)
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

  async function startTimerDirect({ targetId, targetType, projectId }) {
    if (!user?.id || !targetId) return false;

    const payload = {
      user_id: user.id,
      projeto_id: projectId,
      start_time: new Date().toISOString()
    };

    if (targetType === "task") payload.task_id = targetId;
    else payload.atividade_id = targetId;

    const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();

    if (error) {
      showToast("Erro ao iniciar o cronómetro.", "error");
      return false;
    }

    setActiveLog(data);
    showToast("Cronómetro iniciado com sucesso.", "success");
    return true;
  }

  async function handleStartTimerFromProjectSelection() {
    if (projectTimerModal.project?.estado === "concluido") {
      showToast("Este projeto está concluído e não permite iniciar cronómetro.", "warning");
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
      showToast("A tarefa selecionada está concluída e não permite iniciar cronómetro.", "warning");
      return;
    }

    if (!tarefaSelecionada && atividadeSelecionada.estado === "concluido") {
      showToast("A atividade selecionada está concluída e não permite iniciar cronómetro.", "warning");
      return;
    }

    const pending = {
      targetId: tarefaSelecionada?.id || atividadeSelecionada.id,
      targetType: tarefaSelecionada ? "task" : "activity",
      projectId: projectTimerModal.project?.id,
      targetLabel: tarefaSelecionada?.titulo || atividadeSelecionada.titulo || "item selecionado"
    };

    const isSameTarget =
      (pending.targetType === "task" && String(activeLog?.task_id || "") === String(pending.targetId)) ||
      (pending.targetType === "activity" && String(activeLog?.atividade_id || "") === String(pending.targetId));

    if (isSameTarget) {
      showToast("Este cronómetro já está em execução.", "info");
      return;
    }

    if (activeLog) {
      setTimerSwitchModal({
        show: true,
        message: `Já tens um cronómetro ativo em "${activeLogTitle || "Tempo a decorrer..."}". Pretendes parar o atual para iniciar "${pending.targetLabel}"?`,
        pending
      });
      return;
    }

    const started = await startTimerDirect(pending);
    if (started) closeProjectTimerModal();
  }

  async function confirmTimerSwitch() {
    const pending = timerSwitchModal.pending;
    if (!pending) return;

    const diffMins = await stopLogById(activeLog);
    if (diffMins === null) return;

    showToast(`Cronómetro anterior terminado (${diffMins} min).`, "success");
    const started = await startTimerDirect(pending);
    if (started) closeProjectTimerModal();

    setTimerSwitchModal({ show: false, message: "", pending: null });
  }

  function cancelTimerSwitch() {
    setTimerSwitchModal({ show: false, message: "", pending: null });
    showToast("Mantivemos o cronómetro atual em execução.", "info");
  }

  function handleAvatarUpload(e) {
    if (isViewOnly) return;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropModal({ show: true, src: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleCropMouseDown(e) {
    e.preventDefault();
    setCropDragStart({ mx: e.clientX, my: e.clientY, ox: cropOffset.x, oy: cropOffset.y });
  }

  function handleCropMouseMove(e) {
    if (!cropDragStart) return;
    const dx = e.clientX - cropDragStart.mx;
    const dy = e.clientY - cropDragStart.my;
    setCropOffset(clampCropOffset(cropDragStart.ox + dx, cropDragStart.oy + dy, cropScale));
  }

  function handleCropMouseUp() {
    setCropDragStart(null);
  }

  function clampCropOffset(ox, oy, scale) {
    const { w: cw, h: ch } = cropContainerSize;
    const { w: iw, h: ih } = cropImgNatural;
    const cropRadius = Math.round(Math.min(cw, ch) * 0.4);
    const imgDisplayW = iw * scale;
    const imgDisplayH = ih * scale;
    const maxX = cw / 2 - cropRadius - (cw / 2 - imgDisplayW / 2);
    const minX = cw / 2 + cropRadius - (cw / 2 + imgDisplayW / 2);
    const maxY = ch / 2 - cropRadius - (ch / 2 - imgDisplayH / 2);
    const minY = ch / 2 + cropRadius - (ch / 2 + imgDisplayH / 2);
    return { x: Math.max(minX, Math.min(maxX, ox)), y: Math.max(minY, Math.min(maxY, oy)) };
  }

  async function confirmCrop() {
    try {
      setUploading(true);
      const img = cropImgRef.current;
      if (!img) throw new Error("Imagem não encontrada.");

      const { w: cw, h: ch } = cropContainerSize;
      const cropRadius = Math.round(Math.min(cw, ch) * 0.4);
      const cropDiameter = cropRadius * 2;

      const imgDispW = cropImgNatural.w * cropScale;
      const imgDispH = cropImgNatural.h * cropScale;
      const imgLeft = cw / 2 + cropOffset.x - imgDispW / 2;
      const imgTop = ch / 2 + cropOffset.y - imgDispH / 2;

      const circleLeft = cw / 2 - cropRadius;
      const circleTop = ch / 2 - cropRadius;

      const sx = (circleLeft - imgLeft) / cropScale;
      const sy = (circleTop - imgTop) / cropScale;
      const sSize = cropDiameter / cropScale;

      const OUTPUT = 400;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      canvas.getContext("2d").drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Não foi possível gerar a imagem.");

      const fileName = `clientes/${editId || "novo"}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      setCropModal({ show: false, src: null });
      showToast("Foto carregada com sucesso. Guarda para finalizar.", "success");
    } catch (error) {
      showToast(`Erro no upload da foto: ${error.message}`, "error");
    } finally {
      setUploading(false);
    }
  }

  const extractNifApiErrorMessage = (data) => {
    if (!data || typeof data !== "object") return null;

    const candidates = [data.error, data.message, data.msg, data.detail, data.status];
    const found = candidates.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );

    return found ? found.trim() : null;
  };

  const normalizeCaeList = (caeValue) => {
    if (Array.isArray(caeValue)) return caeValue.map((item) => String(item).trim()).filter(Boolean);
    if (caeValue === null || caeValue === undefined) return [];
    const single = String(caeValue).trim();
    return single ? [single] : [];
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
    const sigla = words.slice(0, 5).map((word) => word[0]).join("").toUpperCase();
    return sigla.slice(0, 20);
  };

  const buildObjetoSocialFromRecord = (record, currentValue) => {
    if (currentValue?.trim()) return currentValue;

    const parts = [];
    if (record?.activity) parts.push(record.activity);

    const nature = record?.structure?.nature;
    const capital = record?.structure?.capital;
    const currency = record?.structure?.capital_currency;
    if (nature || capital) {
      const details = [
        nature ? `Natureza jurídica: ${nature}` : null,
        capital ? `Capital social: ${capital}${currency ? ` ${currency}` : ""}` : null
      ].filter(Boolean);

      if (details.length) parts.push(details.join(" | "));
    }

    if (record?.start_date) parts.push(`Início de atividade: ${record.start_date}`);

    return parts.join("\n\n").trim();
  };

  async function findExistingClienteByNif(nif) {
    if (!nif) return null;

    const { data, error } = await supabase
      .from("clientes")
      .select("id, marca, nif")
      .eq("nif", nif)
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  }

  async function fetchClientes() {
    setLoading(true);
    
    const { data: cliData, error: errCli } = await supabase
        .from("clientes")
        .select("*, contactos_cliente(nome_contacto, email, telefone)")
        .order("created_at", { ascending: false });

    const { data: morData } = await supabase
        .from("moradas_cliente")
        .select("cliente_id, localidade, concelho");

    if (!errCli && cliData) {
        const clientesComMorada = cliData.map(c => {
            const moradas = morData?.filter(m => m.cliente_id === c.id) || [];
            return { ...c, moradas_cliente: moradas, ativo: c.ativo !== false }; 
        });
        setClientes(clientesComMorada);
    }
    
    setLoading(false);
  }

  // --- INTEGRAÇÃO NIF.PT ---
  async function handleNifChange(e) {
    const nifDigitado = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, nif: nifDigitado }));

    if (nifDigitado.length < 9) {
      setPendingAutoCaes([]);
      setPendingAutoMorada(null);
    }

    if (nifDigitado.length === 9 && !isViewOnly) {
      try {
        const clienteExistente = await findExistingClienteByNif(nifDigitado);
        if (clienteExistente && String(clienteExistente.id) !== String(editId || "")) {
          showToast(
            `Já existe uma empresa com este NIF: ${clienteExistente.marca || "Sem nome"}.`,
            "warning"
          );
          return;
        }

        showToast("A consultar dados no NIF.pt...", "info");

        const params = new URLSearchParams({ json: "1", q: nifDigitado });
        const nifApiKey = (import.meta.env.VITE_NIFPT_KEY || "9beb59d324c1477245e04e0b5988bdd2").trim();
        if (nifApiKey) params.set("key", nifApiKey);

        const response = await fetch(`/nif-api/?${params.toString()}`);
        if (!response.ok) throw new Error("Erro na comunicação com a API.");

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Resposta inválida do serviço NIF. Verifica o proxy /nif-api.");
        }

        const data = await response.json();
        const apiErrorMessage = extractNifApiErrorMessage(data);
        if (apiErrorMessage) {
          showToast(`NIF.pt: ${apiErrorMessage}`, "warning");
          return;
        }

        if (data?.credits?.left?.day === 0) {
          showToast("NIF.pt indisponível: limite diário de consultas atingido.", "warning");
          return;
        }
        
        let record = null;
        if (data.records && data.records[nifDigitado]) record = data.records[nifDigitado];
        else if (data[nifDigitado]) record = data[nifDigitado];

        if (record) {
          const caeList = [...new Set(normalizeCaeList(record.cae))];
          const posto = record.place || {};
          const postal4 = posto.pc4 || record.pc4;
          const postal3 = posto.pc3 || record.pc3;
          const codigoPostal = postal4 && postal3 ? `${postal4}-${postal3}` : "";
          const generatedSigla = buildSiglaFromTitle(record.title);
          const website = record.contacts?.website || "";
          const phone = record.contacts?.phone || "";
          const email = record.contacts?.email || "";
          const mainAddress = posto.address || record.address || "";
          const locality = posto.city || record.city || record.geo?.parish || "";
          const county = record.geo?.county || "";
          const region = record.geo?.region || "";

          setForm(prev => ({
            ...prev,
            entidade: record.title || prev.entidade || "",
            marca: prev.marca || record.title || "", 
            sigla: prev.sigla || generatedSigla || "",
            website: website || prev.website || "",
            objeto_social: buildObjetoSocialFromRecord(record, prev.objeto_social)
          }));

          if (mainAddress || codigoPostal || locality || county || region) {
             setPendingAutoMorada({
               morada: mainAddress,
               codigo_postal: codigoPostal,
               localidade: locality,
               concelho: county,
               distrito: region,
               regiao: region,
               notas: "Sede"
             });

             setNovaMorada({
                 morada: mainAddress,
                 codigo_postal: codigoPostal,
                 localidade: locality,
                 concelho: county,
                 distrito: region,
                 regiao: region,
                 notas: "Sede"
             });
             setShowAddMorada(true);
           } else {
             setPendingAutoMorada(null);
          }

          if (caeList.length > 0) {
             const [principal, ...restantes] = caeList;
             const caesParaGuardar = caeList.map((codigo, index) => ({
                codigo,
                descricao: index === 0
                 ? (record.activity ? record.activity.split('.')[0] : "Atividade Principal")
                 : "Atividade secundária importada do NIF.pt",
                principal: index === 0
             }));

             setPendingAutoCaes(caesParaGuardar);

             setNovoCae({
                 codigo: principal,
                 descricao: restantes.length > 0
                   ? `Atividade principal. Outros CAE: ${restantes.join(", ")}`
                   : (record.activity ? record.activity.split('.')[0] : "Atividade Principal"),
                 principal: true
             });
             setShowAddCae(true);
           } else {
             setPendingAutoCaes([]);
          }

          if (email || phone) {
             setNovoContacto({
                 nome_contacto: "Contacto Geral",
                 cargo: "",
                 email,
                 telefone: phone
             });
             setShowAddContacto(true);
          }

          showToast(`Dados pré-preenchidos com sucesso${caeList.length > 1 ? ` (${caeList.length} CAE detetados)` : ""}!`, "success");
        } else {
          showToast("NIF não encontrado na base do NIF.pt.", "warning");
        }
      } catch (err) {
        showToast(err?.message || "Falha na consulta automática. Preenche manualmente.", "warning");
      }
    }
  }

// --- PREENCHIMENTO AUTOMÁTICO DE MORADA POR CÓDIGO POSTAL ---
  async function fetchMoradaByCodigoPostal(cp) {
      if (!cp || cp.length < 8) return; 
      
      showToast("A procurar localização pelo Código Postal...", "info");
      
      try {
          // TENTATIVA 1: API Nacional (GeoAPI) - Super precisa
          const resGeo = await fetch(`https://json.geoapi.pt/cp/${cp}`);
          
          if (resGeo.ok) {
              const dataGeo = await resGeo.json();
              if (dataGeo && dataGeo.concelho && dataGeo.distrito) {
                  setNovaMorada(prev => ({
                      ...prev,
                      morada: prev.morada || dataGeo.rua || "", 
                      localidade: dataGeo.localidade || prev.localidade,
                      concelho: dataGeo.concelho || prev.concelho,
                      distrito: dataGeo.distrito || prev.distrito,
                      regiao: dataGeo.regiao || dataGeo.distrito || prev.regiao
                  }));
                  showToast("Morada preenchida com precisão! 📍", "success");
                  return; // Sucesso, não precisa de ir ao Plano B
              }
          }
      } catch (err) {
          console.warn("GeoAPI falhou ou não respondeu, a tentar OpenStreetMap...", err);
      }

      // TENTATIVA 2: Plano B (OpenStreetMap) - Caso a GeoAPI falhe ou atinja limite
      try {
          const resOSM = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=Portugal&format=json&addressdetails=1`);
          const dataOSM = await resOSM.json();
          
          if (dataOSM && dataOSM.length > 0) {
              const address = dataOSM[0].address;
              setNovaMorada(prev => ({
                  ...prev,
                  morada: address.road || prev.morada, 
                  localidade: address.village || address.suburb || address.hamlet || address.town || prev.localidade,
                  concelho: address.city || address.town || address.municipality || prev.concelho,
                  distrito: address.county || address.state_district || address.state || prev.distrito,
                  regiao: address.region || address.state || address.county || prev.regiao
              }));
              showToast("Morada preenchida (via mapa global)! 📍", "success");
          } else {
              showToast("Código postal não encontrado.", "warning");
          }
      } catch (error) {
          console.error("Erro no fallback OSM:", error);
          showToast("Erro ao comunicar com o serviço de mapas.", "error");
      }
  }

  // --- PREENCHIMENTO AUTOMÁTICO DE DISTRITO E REGIÃO PELO CONCELHO ---
  async function fetchDadosByConcelho(concelhoNome) {
      if (!concelhoNome || concelhoNome.trim().length < 3) return;

      // Se o distrito e a região já estiverem preenchidos, não vale a pena gastar pedidos à API
      if (novaMorada.distrito && novaMorada.regiao) return;

      showToast("A procurar detalhes do concelho...", "info");
      
      try {
          // TENTATIVA 1: GeoAPI (Procura direta pelo município)
          const resGeo = await fetch(`https://json.geoapi.pt/municipio/${encodeURIComponent(concelhoNome)}`);
          if (resGeo.ok) {
              const dataGeo = await resGeo.json();
              if (dataGeo && dataGeo.distrito) {
                  setNovaMorada(prev => ({
                      ...prev,
                      distrito: prev.distrito || dataGeo.distrito,
                      regiao: prev.regiao || dataGeo.regiao || dataGeo.distrito
                  }));
                  showToast("Distrito e Região preenchidos! 📍", "success");
                  return; // Sucesso, sai da função
              }
          }
      } catch (err) {
          console.warn("GeoAPI falhou na busca por concelho, a tentar OpenStreetMap...", err);
      }

      // TENTATIVA 2: OpenStreetMap (Plano B)
      try {
          const resOSM = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(concelhoNome)},+Portugal&format=json&addressdetails=1`);
          const dataOSM = await resOSM.json();
          
          if (dataOSM && dataOSM.length > 0) {
              const address = dataOSM[0].address;
              setNovaMorada(prev => ({
                  ...prev,
                  distrito: prev.distrito || address.state_district || address.county || address.state || "",
                  regiao: prev.regiao || address.region || address.state || ""
              }));
              showToast("Distrito e Região preenchidos! 📍", "success");
          }
      } catch (error) {
          console.error("Erro no fallback do concelho:", error);
      }
  }

  // --- LÓGICA DE FILTRAGEM DOS CARTÕES ---
  let processedClientes = [...clientes];

  if (statusTab === "ativos") {
    processedClientes = processedClientes.filter((c) => c.ativo === true);
  } else {
    processedClientes = processedClientes.filter((c) => c.ativo === false);
  }

  if (busca) {
      const textoBusca = busca.toLowerCase();
      processedClientes = processedClientes.filter(c =>
        c.marca?.toLowerCase().includes(textoBusca) ||
        c.sigla?.toLowerCase().includes(textoBusca) ||
        c.nif?.includes(textoBusca) ||
        c.entidade?.toLowerCase().includes(textoBusca)
      );
  }

  processedClientes.sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));

  // --- ABRIR MODAIS ---
  function handleNovo() {
    setIsClosingPanel(false);
    setEditId(null); setIsViewOnly(false);
    setForm(initialForm);
    setContactos([]); setMoradas([]); setAcessos([]); setCaes([]); setProjetosCliente([]);
    setPendingAutoCaes([]);
    setPendingAutoMorada(null);
    setPodeVerAcessos(true);
    fecharTodosSubForms();
    setActiveTab("geral");
    setShowModal(true);
  }

  function handleEdit(cliente) {
    setEditId(cliente.id); setIsViewOnly(false);
    loadClienteData(cliente);
  }

  function handleView(cliente) {
    setEditId(cliente.id); setIsViewOnly(true);
    loadClienteData(cliente);
  }

  function loadClienteData(cliente) {
    setIsClosingPanel(false);
    const safeData = { ...initialForm };
    Object.keys(initialForm).forEach(key => {
        safeData[key] = cliente[key] !== null && cliente[key] !== undefined ? cliente[key] : initialForm[key];
    });
    setForm(safeData);
    setPendingAutoCaes([]);
    setPendingAutoMorada(null);

    fecharTodosSubForms();
    setActiveTab("geral");
    setShowModal(true);
    fetchSubDados(cliente.id);
    verificarPermissaoAcessos(cliente.id); 
  }

  useEffect(() => {
    const clienteIdFromState = location.state?.openClienteId;
    if (!clienteIdFromState || clientes.length === 0) return;

    const clienteToOpen = clientes.find(
      (cliente) => String(cliente.id) === String(clienteIdFromState)
    );

    if (clienteToOpen) {
      handleView(clienteToOpen);
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, clientes, navigate]);

  function closeClientePanel() {
    if (isClosingPanel) return;
    setIsClosingPanel(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosingPanel(false);
    }, 360);
  }

  async function persistPendingAutoCaes(clienteId) {
    if (!clienteId || pendingAutoCaes.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const { data: existentes, error: erroExistentes } = await supabase
      .from("caes_cliente")
      .select("codigo")
      .eq("cliente_id", clienteId);

    if (erroExistentes) throw erroExistentes;

    const codigosExistentes = new Set(
      (existentes || [])
        .map((item) => String(item.codigo || "").trim())
        .filter(Boolean)
    );

    const caesParaInserir = pendingAutoCaes
      .filter((item) => item?.codigo)
      .filter((item) => !codigosExistentes.has(String(item.codigo).trim()))
      .map((item) => ({
        cliente_id: clienteId,
        codigo: String(item.codigo).trim(),
        descricao: item.descricao || null,
        principal: Boolean(item.principal)
      }));

    if (caesParaInserir.length === 0) {
      return { inserted: 0, skipped: pendingAutoCaes.length };
    }

    const { data: inseridos, error: erroInsercao } = await supabase
      .from("caes_cliente")
      .insert(caesParaInserir)
      .select();

    if (erroInsercao) throw erroInsercao;

    if (inseridos?.length) {
      setCaes((prev) => [...prev, ...inseridos]);
    }

    return {
      inserted: inseridos?.length || 0,
      skipped: pendingAutoCaes.length - (inseridos?.length || 0)
    };
  }

  async function persistPendingAutoMorada(clienteId) {
    if (!clienteId || !pendingAutoMorada) {
      return { inserted: 0, skipped: 0 };
    }

    const normalizar = (value) => String(value || "").trim().toLowerCase();
    const novaKey = [
      normalizar(pendingAutoMorada.morada),
      normalizar(pendingAutoMorada.codigo_postal),
      normalizar(pendingAutoMorada.localidade),
      normalizar(pendingAutoMorada.concelho)
    ].join("|");

    if (!novaKey.replace(/\|/g, "")) {
      return { inserted: 0, skipped: 1 };
    }

    const { data: existentes, error: erroExistentes } = await supabase
      .from("moradas_cliente")
      .select("morada, codigo_postal, localidade, concelho")
      .eq("cliente_id", clienteId);

    if (erroExistentes) throw erroExistentes;

    const existeDuplicado = (existentes || []).some((item) => {
      const keyExistente = [
        normalizar(item.morada),
        normalizar(item.codigo_postal),
        normalizar(item.localidade),
        normalizar(item.concelho)
      ].join("|");
      return keyExistente === novaKey;
    });

    if (existeDuplicado) {
      return { inserted: 0, skipped: 1 };
    }

    const payload = {
      cliente_id: clienteId,
      morada: pendingAutoMorada.morada || null,
      codigo_postal: pendingAutoMorada.codigo_postal || null,
      localidade: pendingAutoMorada.localidade || null,
      concelho: pendingAutoMorada.concelho || null,
      notas: pendingAutoMorada.notas || null
    };

    const { data: inserida, error: erroInsercao } = await supabase
      .from("moradas_cliente")
      .insert([payload])
      .select();

    if (erroInsercao) throw erroInsercao;

    if (inserida?.length) {
      setMoradas((prev) => [...prev, ...inserida]);
      fetchClientes();
      return { inserted: 1, skipped: 0 };
    }

    return { inserted: 0, skipped: 1 };
  }

  function fecharTodosSubForms() {
      setShowAddContacto(false); setShowAddMorada(false); setShowAddCae(false); setShowAddAcesso(false);
      setNovoContacto(initContacto); setNovaMorada(initMorada); setNovoCae(initCae); setNovoAcesso(initAcesso);
  }

  async function verificarPermissaoAcessos(clienteId) {
    // Todos os users registados têm acesso aos acessos/credenciais
    setPodeVerAcessos(true);
  }

  async function fetchSubDados(clienteId) {
    const projectFields = "id, titulo, estado, data_fim, codigo_projeto, cliente_id, parceiros_ids, created_at";

    const [cData, mData, aData, tData, caeData, pData] = await Promise.all([
        supabase.from("contactos_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("moradas_cliente").select("*").eq("cliente_id", clienteId),
        supabase
          .from("acessos_cliente")
          .select("*, tipos_acessos(id, nome, url)")
          .eq("cliente_id", clienteId),
        supabase
          .from("tipos_acessos")
          .select("id, nome, url")
          .order("nome", { ascending: true }),
        supabase.from("caes_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("projetos").select(projectFields).order("created_at", { ascending: false })
    ]);

    const clienteIdStr = String(clienteId);
    const projetosAssociados = (pData.data || [])
      .filter(proj => {
        const isMainClient = String(proj.cliente_id || "") === clienteIdStr;
        const parceiros = normalizeParceirosIds(proj.parceiros_ids);
        const isPartner = parceiros.includes(clienteIdStr);
        return isMainClient || isPartner;
      })
      .map(proj => {
        const isMainClient = String(proj.cliente_id || "") === clienteIdStr;
        const parceiros = normalizeParceirosIds(proj.parceiros_ids);
        const isPartner = parceiros.includes(clienteIdStr);

        let relacao_cliente = "cliente_unico";
        if (isMainClient && isPartner) relacao_cliente = "cliente_unico_e_parceiro";
        else if (isPartner) relacao_cliente = "parceiro";

        return { ...proj, relacao_cliente };
      })
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    
    setContactos(cData.data || []); 
    setMoradas(mData.data || []); 
    setAcessos(aData.data || []); 
    setTiposAcessosCatalogo(tData.data || []);
    setCaes(caeData.data || []);
    setProjetosCliente(projetosAssociados);
  }

  function handleToggleAtivo(id, estadoAtual) {
    const novoEstado = !estadoAtual;
    const acaoTexto = novoEstado ? "Reativar" : "Desativar";

    setConfirmDialog({
        show: true,
        message: `Tem a certeza que deseja ${acaoTexto.toLowerCase()} esta empresa?`,
        confirmText: `Sim, ${acaoTexto}`,
        isDanger: !novoEstado,
        onConfirm: async () => {
            setConfirmDialog({ show: false });
            try {
              const { error } = await supabase.from("clientes").update({ ativo: novoEstado }).eq("id", id);
              if (error) throw error;

              setClientes(clientes.map(c => c.id === id ? { ...c, ativo: novoEstado } : c));
              if (editId === id) setForm({ ...form, ativo: novoEstado });

              showToast(`Empresa ${acaoTexto.toLowerCase()}a com sucesso!`, "success");
            } catch (error) {
              showToast(`Erro ao ${acaoTexto.toLowerCase()} empresa: ` + error.message, "error");
            }
        }
    });
  }

  async function handleSubmitGeral(e) {
    e.preventDefault();
    if (isViewOnly) return;

    const dbPayload = {
      nif: form.nif,
      marca: form.marca,
      sigla: form.sigla?.trim() || null,
      entidade: form.entidade,
      avatar_url: form.avatar_url || null,
      objeto_social: form.objeto_social,
      website: form.website,
      plano: form.plano,
      certidao_permanente: form.certidao_permanente,
      validade_certidao: form.validade_certidao || null,
      rcbe: form.rcbe,
      validade_rcbe: form.validade_rcbe || null,
      ativo: form.ativo 
    };

    try {
      let clienteId = editId;

      if (editId) {
        const { error } = await supabase.from("clientes").update(dbPayload).eq("id", editId);
        if (error) throw error;
        setClientes(clientes.map(c => (c.id === editId ? { ...c, ...dbPayload } : c)));
      } else {
        const { data, error } = await supabase.from("clientes").insert([dbPayload]).select();
        if (error) throw error;
        setClientes([{ ...data[0], ativo: true }, ...clientes]); 
        setEditId(data[0].id);
        clienteId = data[0].id;
      }

      let msg = editId
        ? "Empresa atualizada!"
        : "Empresa criada! Verifica as abas que foram pré-preenchidas.";

      if (pendingAutoCaes.length > 0 && clienteId) {
        try {
          const { inserted, skipped } = await persistPendingAutoCaes(clienteId);
          if (inserted > 0) msg += ` ${inserted} CAE adicionados automaticamente.`;
          else if (skipped > 0) msg += " Os CAE importados já existiam e não foram duplicados.";
          setPendingAutoCaes([]);
        } catch (caeError) {
          msg += ` Não foi possível gravar os CAE automáticos: ${caeError.message}`;
        }
      }

      if (pendingAutoMorada && clienteId) {
        try {
          const { inserted, skipped } = await persistPendingAutoMorada(clienteId);
          if (inserted > 0) msg += " Morada importada automaticamente.";
          else if (skipped > 0) msg += " Morada importada já existia e não foi duplicada.";
          setPendingAutoMorada(null);
        } catch (morError) {
          msg += ` Não foi possível gravar a morada automática: ${morError.message}`;
        }
      }

      showToast(msg, "success");
    } catch (error) { showToast("Erro: " + error.message, "error"); }
  }

  async function saveSubItem(tabela, dados, stateSetter, listaAtual, resetState, resetValue, closeFormSetter) {
    if (isViewOnly) return;
    if (!editId) return showToast("Guarda primeiro os Dados da Empresa (Aba Geral) no fundo do ecrã.", "warning");

    const payload = { ...dados, cliente_id: editId };
    if (tabela === 'moradas_cliente') { delete payload.distrito; delete payload.regiao; }
    if (tabela === 'acessos_cliente') { delete payload.tipos_acessos; }

    if (payload.id) { 
        const { id, ...updateData } = payload;
        const { data, error } = await supabase.from(tabela).update(updateData).eq("id", id).select();
        if (!error) {
            stateSetter(listaAtual.map(i => i.id === id ? data[0] : i));
            showToast("Atualizado com sucesso!");
            if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
        } else showToast("Erro: " + error.message, "error");
    } else { 
        const { data, error } = await supabase.from(tabela).insert([payload]).select();
        if (!error) {
            stateSetter([...listaAtual, data[0]]);
            showToast("Adicionado com sucesso!");
            if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
        } else showToast("Erro: " + error.message, "error");
    }
    resetState(resetValue);
    closeFormSetter(false);
  }

  function deleteItem(tabela, id, stateSetter, listaAtual) {
    if (isViewOnly) return;
    setConfirmDialog({
        show: true,
        message: "Tem a certeza? Este registo será apagado permanentemente.",
        confirmText: "Sim, Apagar",
        isDanger: true,
        onConfirm: async () => {
            setConfirmDialog({ show: false });
            const { error } = await supabase.from(tabela).delete().eq("id", id);
            if (!error) {
                stateSetter(listaAtual.filter(i => i.id !== id));
                showToast("Apagado com sucesso!");
                if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
            } else {
                showToast("Erro ao apagar.", "error");
            }
        }
    });
  }

  function abrirEdicaoSubItem(item, setItemState, setShowForm) {
      setItemState(item);
      setShowForm(true);
  }

  const getAcessoByTipoId = (tipoId) => {
    return acessos.find((acesso) => String(acesso.tipo_acesso_id) === String(tipoId)) || null;
  };

  async function handleCopyCredential(value, label) {
    const text = String(value || "").trim();
    if (!text) {
      showToast(`Sem ${label} para copiar.`, "warning");
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = text;
        tempInput.setAttribute("readonly", "");
        tempInput.style.position = "absolute";
        tempInput.style.left = "-9999px";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }

      showToast(`${label} copiado para a área de transferência.`, "success");
    } catch (err) {
      showToast(`Não foi possível copiar ${label.toLowerCase()}.`, "error");
    }
  }

  const clientColors = ['var(--color-btnPrimary)', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', 'var(--color-primary)'];
  const getColorForClient = (nif) => {
      if (!nif) return '#94a3b8'; 
      const hash = String(nif).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return clientColors[hash % clientColors.length];
  };

  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '10px', color: '#1e293b' };
  const modalTabs = [
    { id: 'geral', label: 'Geral', icon: Icons.ClipboardList },
    { id: 'moradas', label: 'Moradas', icon: Icons.MapPin },
    { id: 'contactos', label: 'Pessoas', icon: Icons.Users },
    { id: 'projetos', label: 'Projetos', icon: Icons.Rocket },
    { id: 'atividade', label: 'Atividade', icon: Icons.Activity },
    { id: 'documentos', label: 'Documentos', icon: Icons.FileText },
    { id: 'plano', label: 'Plano', icon: Icons.Diamond },
    { id: 'acessos', label: 'Acessos', icon: Icons.Lock, requiresAcessos: true }
  ];

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'var(--color-btnPrimary)'}}></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1500px', margin: '0 auto'}}>
      <div className="page-header" style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Building size={24} /></div>
            <div>
                <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Clientes</h1>
                <p style={{color: '#64748b', margin: 0, fontWeight: '500', fontSize: '0.9rem'}}>{statusTab === "ativos" ? "Carteira de Clientes Ativos" : "Arquivo de Clientes"}</p>
            </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          {activeLog && (
            <div
              onClick={() => navigate(activeLogRoute || '/dashboard/tarefas')}
              title="Ir para o item com cronómetro em curso"
              className="hover-shadow"
              style={{background: 'linear-gradient(to right, #ef4444, #b91c1c)', color: 'white', padding: '10px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '15px', border: '2px solid #fecaca', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)', transition: '0.2s', whiteSpace: 'nowrap', cursor: 'pointer'}}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.95rem'}}>
                <span className="pulse-dot-white"></span>
                {(activeLogTitle || 'Tempo a decorrer...').length > 30 ? `${(activeLogTitle || 'Tempo a decorrer...').slice(0, 30)}...` : (activeLogTitle || 'Tempo a decorrer...')}
              </div>
              <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)'}}></div>
              <button type="button" onClick={openStopNoteModal} style={{background: 'white', color:'#ef4444', border:'none', borderRadius:'20px', padding:'6px 12px', cursor:'pointer', fontWeight:'700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s'}}><Icons.Stop /> Parar</button>
            </div>
          )}
          <button className="btn-cta" onClick={handleNovo}>
              <Icons.Plus /> Nova Empresa
          </button>
        </div>
      </div>

      <div style={{display:'flex', gap:'5px', paddingLeft: '10px'}}>
        <button
          onClick={() => setStatusTab("ativos")}
          style={{padding: '12px 25px', background: statusTab === 'ativos' ? 'white' : '#e2e8f0', color: statusTab === 'ativos' ? 'var(--color-btnPrimary)' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', gap:'8px'}}
        >
          <Icons.Building /> Ativos
        </button>
        <button
          onClick={() => setStatusTab("arquivados")}
          style={{padding: '12px 25px', background: statusTab === 'arquivados' ? 'white' : '#e2e8f0', color: statusTab === 'arquivados' ? 'var(--color-btnPrimary)' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', gap:'8px'}}
        >
          <Icons.Archive /> Arquivados
        </button>
      </div>

      <div style={{background: 'white', padding: '12px 20px', borderRadius: '0 10px 10px 10px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
        <div style={{flex: 1, minWidth: '250px', position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '10px', color: '#94a3b8'}}><Icons.Search /></span>
          <input type="text" placeholder="Procurar por Empresa, Sigla ou NIF..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{width: '100%', padding: '8px 12px 8px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box'}} />
        </div>
        <div style={{display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px', marginLeft: 'auto'}}>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={viewMode === "cards" ? "marketing-view-toggle-btn active" : "marketing-view-toggle-btn"}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "marketing-view-toggle-btn active" : "marketing-view-toggle-btn"}
          >
            Lista
          </button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="client-grid">
            {processedClientes.length > 0 ? processedClientes.map(c => {
                const isInactive = c.ativo === false;
                const color = getColorForClient(c.nif);
                const moradaRef = c.moradas_cliente && c.moradas_cliente.length > 0 ? c.moradas_cliente[0] : null;
                const contactoRef = c.contactos_cliente && c.contactos_cliente.length > 0 ? c.contactos_cliente[0] : null;

                return (
                    <div 
                        key={c.id} 
                        className="client-card hover-shadow"
                        style={{
                            background: isInactive ? '#f8fafc' : 'white', borderRadius: '16px', border: '1px solid #e2e8f0', 
                            display: 'flex', flexDirection: 'column', 
                            opacity: isInactive ? 0.6 : 1, position: 'relative', overflow: 'hidden',
                            borderTop: `5px solid ${isInactive ? '#94a3b8' : color}`, transition: 'all 0.2s'
                        }}
                    >
                        <div style={{padding: '20px', flex: 1}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px'}}>
                                <span style={{background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace'}}>{c.nif || 'S/ NIF'}</span>
                                  {isInactive && <span style={{fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>ARQUIVADO</span>}
                            </div>

                              <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px'}}>
                                <h2 style={{margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: '800', lineHeight: '1.2'}}>{c.marca || "Sem nome"}</h2>
                                {c.sigla?.trim() && <span style={{background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimaryDark)', border: '1px solid var(--color-borderColor)', padding: '3px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.04em'}}>{c.sigla}</span>}
                              </div>
                            
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px'}}>
                                {moradaRef ? (
                                    <div style={{fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                        <Icons.MapPin /> {moradaRef.concelho ? `${moradaRef.localidade} (${moradaRef.concelho})` : moradaRef.localidade}
                                    </div>
                                ) : (
                                    <div style={{fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.MapPin /> Sem morada registada</div>
                                )}

                                {contactoRef ? (
                                    <div style={{fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                        <Icons.User /> {contactoRef.nome_contacto} {contactoRef.telefone && `- ${contactoRef.telefone}`}
                                    </div>
                                ) : (
                                    <div style={{fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.User /> Sem contacto registado</div>
                                )}
                            </div>
                        </div>

                        <div style={{display: 'flex', borderTop: '1px solid #f1f5f9', background: isInactive ? 'transparent' : '#fafaf9'}}>
                            <button 
                                onClick={() => handleView(c)} 
                                style={{flex: 1, padding: '12px', border: 'none', borderRight: '1px solid #f1f5f9', background: 'transparent', color: 'var(--color-btnPrimary)', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}
                                className="hover-blue-text"
                            >
                                <Icons.Eye /> Ver Perfil
                            </button>
                            
                            {!isInactive ? (
                            <div style={{display: 'flex', alignItems: 'center'}}>
                              <button 
                                onClick={() => handleEdit(c)} 
                                style={{padding: '12px 12px', border: 'none', background: 'transparent', color: '#f59e0b', cursor: 'pointer', transition: '0.2s'}}
                                className="hover-orange-text"
                                title="Edição Rápida"
                              >
                                <Icons.Edit />
                              </button>
                              <button 
                                onClick={() => handleToggleAtivo(c.id, c.ativo)} 
                                style={{padding: '12px 12px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', transition: '0.2s'}}
                                className="hover-red-text"
                                title="Arquivar Empresa"
                              >
                                <Icons.Archive />
                              </button>
                            </div>
                            ) : (
                                <button 
                                    onClick={() => handleToggleAtivo(c.id, c.ativo)} 
                                    style={{padding: '12px 20px', border: 'none', background: 'transparent', color: '#16a34a', cursor: 'pointer', transition: '0.2s'}}
                                    className="hover-green-text"
                                    title="Reativar Empresa"
                                >
                                    <Icons.Restore />
                                </button>
                            )}
                        </div>
                    </div>
                );
            }) : (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox size={60} /></div>
                    <h3 style={{color: '#1e293b', margin: '0 0 5px 0', fontSize: '1.2rem'}}>Vazio por aqui.</h3>
                    <p style={{color: '#64748b', margin: 0}}>Nenhum cliente encontrado com os filtros atuais.</p>
                </div>
            )}
        </div>
      ) : (
        <div className="clients-list-wrapper">
          {processedClientes.length > 0 ? (
            <div className="table-responsive" style={{borderRadius: '14px'}}>
              <table className="data-table clients-list-table" style={{minWidth: '980px'}}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Sigla</th>
                    <th>NIF</th>
                    <th>Localidade</th>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th style={{textAlign: 'right'}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {processedClientes.map((c) => {
                    const isInactive = c.ativo === false;
                    const color = getColorForClient(c.nif);
                    const moradaRef = c.moradas_cliente && c.moradas_cliente.length > 0 ? c.moradas_cliente[0] : null;
                    const contactoRef = c.contactos_cliente && c.contactos_cliente.length > 0 ? c.contactos_cliente[0] : null;
                    const localidade = moradaRef
                      ? (moradaRef.concelho ? `${moradaRef.localidade} (${moradaRef.concelho})` : moradaRef.localidade)
                      : "Sem morada";

                    return (
                      <tr
                        key={c.id}
                        className={isInactive ? "row-inactive clients-list-row" : "clients-list-row"}
                        style={{boxShadow: `inset 4px 0 0 ${color}`}}
                        onDoubleClick={() => handleView(c)}
                      >
                        <td style={{fontWeight: '700'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <span className="client-color-dot" style={{background: color, opacity: isInactive ? 0.55 : 1}}></span>
                            <span>{c.marca || "Sem nome"}</span>
                          </div>
                        </td>
                        <td>{c.sigla?.trim() || "-"}</td>
                        <td style={{fontFamily: 'monospace'}}>{c.nif || "S/ NIF"}</td>
                        <td>{localidade}</td>
                        <td>
                          {contactoRef
                            ? `${contactoRef.nome_contacto || "Sem nome"}${contactoRef.telefone ? ` - ${contactoRef.telefone}` : ""}`
                            : "Sem contacto"}
                        </td>
                        <td>
                          {isInactive ? (
                            <span className="archive-badge">ARQUIVADO</span>
                          ) : (
                            <span className="active-badge">ATIVO</span>
                          )}
                        </td>
                        <td>
                          <div className="list-actions-cell">
                            <button type="button" onClick={() => handleView(c)} className="list-action-btn view" title="Ver Perfil"><Icons.Eye size={14} /></button>
                            {!isInactive ? (
                              <>
                                <button type="button" onClick={() => handleEdit(c)} className="list-action-btn edit" title="Editar"><Icons.Edit size={14} /></button>
                                <button type="button" onClick={() => handleToggleAtivo(c.id, c.ativo)} className="list-action-btn archive" title="Arquivar"><Icons.Archive size={14} /></button>
                              </>
                            ) : (
                              <button type="button" onClick={() => handleToggleAtivo(c.id, c.ativo)} className="list-action-btn restore" title="Reativar"><Icons.Restore size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
              <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox size={60} /></div>
              <h3 style={{color: '#1e293b', margin: '0 0 5px 0', fontSize: '1.2rem'}}>Vazio por aqui.</h3>
              <p style={{color: '#64748b', margin: 0}}>Nenhum cliente encontrado com os filtros atuais.</p>
            </div>
          )}
        </div>
      )}

      {notification && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '22px',
            transform: 'translateX(-50%)',
            maxWidth: 'min(90vw, 460px)',
            minHeight: '40px',
            padding: '9px 14px',
            borderRadius: '12px',
            color: '#fff',
            background:
              notification.type === 'success'
                ? 'linear-gradient(135deg, #166534, #15803d)'
                : notification.type === 'error'
                  ? 'linear-gradient(135deg, #b91c1c, #991b1b)'
                  : notification.type === 'warning'
                    ? 'linear-gradient(135deg, #b45309, #92400e)'
                    : 'linear-gradient(135deg, var(--color-btnPrimaryDark), var(--color-btnPrimaryHover))',
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            zIndex: 2147483000,
            fontSize: '0.86rem',
            fontWeight: 700,
            lineHeight: 1.35,
            textAlign: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <span style={{fontSize:'0.9rem'}}>
            {notification.type === 'success' ? '✅' : notification.type === 'error' ? '⛔' : notification.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span>{notification.message}</span>
        </div>
      )}

      <StopTimerNoteModal
        open={stopNoteModal.show}
        title="Parar cronometro"
        message="Se quiseres, adiciona uma nota breve sobre o que foi feito (opcional)."
        placeholder="Ex: Concluída análise e próximos passos definidos"
        showCompleteOption={false}
        onCancel={closeStopNoteModal}
        onConfirm={(note) => confirmStopWithNote(note)}
      />

      <TimerSwitchModal
        open={timerSwitchModal.show}
        title="Trocar cronómetro em curso"
        message={timerSwitchModal.message}
        cancelLabel="Manter atual"
        confirmLabel="Parar e iniciar"
        onCancel={cancelTimerSwitch}
        onConfirm={confirmTimerSwitch}
      />

      {projectTimerModal.show && (
        <ModalPortal>
          <div
            onClick={closeProjectTimerModal}
            style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.72)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100001, padding:'20px'}}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{width:'min(980px, 96vw)', maxHeight:'86vh', overflow:'hidden', borderRadius:'20px', background:'white', border:'1px solid var(--color-borderColorLight)', boxShadow:'0 30px 60px -20px rgba(15, 23, 42, 0.45)', display:'flex', flexDirection:'column'}}
            >
              <div style={{padding:'22px 24px', borderBottom:'1px solid #e2e8f0', background:'linear-gradient(135deg, var(--color-bgSecondary), #f8fafc)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'20px'}}>
                <div>
                  <p style={{margin:'0 0 4px 0', fontSize:'0.75rem', fontWeight:'800', letterSpacing:'0.07em', color:'var(--color-btnPrimary)', textTransform:'uppercase'}}>Iniciar Cronómetro</p>
                  <h3 style={{margin:0, color:'#0f172a', fontSize:'1.35rem', fontWeight:'900'}}>{projectTimerModal.project?.titulo || 'Projeto selecionado'}</h3>
                  <p style={{margin:'6px 0 0 0', color:'#475569', fontSize:'0.9rem'}}>Escolhe primeiro a atividade e, se quiseres, uma tarefa específica.</p>
                </div>
                <button onClick={closeProjectTimerModal} style={{background:'#fff', border:'1px solid #cbd5e1', width:'36px', height:'36px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569'}} className="hover-shadow">
                  <Icons.Close size={18} />
                </button>
              </div>

              <div style={{padding:'20px', overflowY:'auto', display:'grid', gap:'14px'}}>
                {projectTimerModal.loading ? (
                  <div style={{padding:'32px', textAlign:'center', color:'#64748b', fontWeight:'600'}}>A carregar atividades e tarefas...</div>
                ) : projectTimerModal.atividades.length === 0 ? (
                  <div style={{padding:'36px', textAlign:'center', border:'1px dashed #cbd5e1', borderRadius:'14px', background:'#f8fafc'}}>
                    <h4 style={{margin:'0 0 6px 0', color:'#1e293b'}}>Sem atividades neste projeto</h4>
                    <p style={{margin:0, color:'#64748b'}}>Cria uma atividade no projeto para iniciar o cronómetro a partir desta vista.</p>
                  </div>
                ) : (
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                    <div style={{border:'1px solid #e2e8f0', borderRadius:'14px', padding:'12px', background:'#f8fafc'}}>
                      <p style={{margin:'0 0 10px 0', fontSize:'0.8rem', fontWeight:'800', color:'#64748b', textTransform:'uppercase'}}>Atividades</p>
                      <div style={{display:'grid', gap:'8px'}}>
                        {projectTimerModal.atividades.map((atividade) => {
                          const isSelected = String(atividade.id) === String(projectTimerModal.selectedAtividadeId);
                          const isDone = atividade.estado === 'concluido';
                          return (
                            <button
                              key={atividade.id}
                              type="button"
                              disabled={isDone}
                              onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedAtividadeId: atividade.id, selectedTaskId: "" }))}
                              style={{textAlign:'left', border:isSelected ? '1px solid var(--color-btnPrimary)' : '1px solid #e2e8f0', background:isDone ? '#f8fafc' : (isSelected ? 'var(--color-bgSecondary)' : '#fff'), color:isDone ? '#94a3b8' : '#1e293b', borderRadius:'10px', padding:'10px 12px', cursor:isDone ? 'not-allowed' : 'pointer', opacity:isDone ? 0.75 : 1}}
                              className="hover-shadow"
                            >
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px'}}>
                                <span style={{fontWeight:'700', fontSize:'0.9rem', textDecoration:isDone ? 'line-through' : 'none'}}>{atividade.titulo || 'Sem título'}</span>
                                <span style={{fontSize:'0.7rem', borderRadius:'999px', padding:'3px 8px', background:isDone ? '#e2e8f0' : 'var(--color-borderColorLight)', color:isDone ? '#64748b' : 'var(--color-btnPrimaryDark)', fontWeight:'800'}}>{isDone ? 'CONCLUÍDA' : 'ATIVA'}</span>
                              </div>
                              <p style={{margin:'6px 0 0 0', fontSize:'0.75rem', color:'#64748b'}}>{(atividade.tarefas || []).length} tarefa(s)</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{border:'1px solid #e2e8f0', borderRadius:'14px', padding:'12px', background:'#f8fafc'}}>
                      <p style={{margin:'0 0 10px 0', fontSize:'0.8rem', fontWeight:'800', color:'#64748b', textTransform:'uppercase'}}>Tarefas</p>
                      <div style={{display:'grid', gap:'8px'}}>
                        <button
                          type="button"
                          onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedTaskId: "" }))}
                          disabled={(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.estado === 'concluido')}
                          style={{textAlign:'left', border:projectTimerModal.selectedTaskId ? '1px solid #e2e8f0' : '1px solid #16a34a', background:(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.estado === 'concluido') ? '#f1f5f9' : (projectTimerModal.selectedTaskId ? '#fff' : '#f0fdf4'), color:(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.estado === 'concluido') ? '#94a3b8' : '#166534', borderRadius:'10px', padding:'10px 12px', cursor:(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.estado === 'concluido') ? 'not-allowed' : 'pointer', fontWeight:'700'}}
                          className="hover-shadow"
                        >
                          Trabalhar ao nível da atividade
                        </button>

                        {(projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.tarefas || []).length > 0 ? (
                          (projectTimerModal.atividades.find((atividade) => String(atividade.id) === String(projectTimerModal.selectedAtividadeId))?.tarefas || []).map((tarefa) => {
                            const isSelected = String(tarefa.id) === String(projectTimerModal.selectedTaskId);
                            const isDone = tarefa.estado === 'concluido';
                            return (
                              <button
                                key={tarefa.id}
                                type="button"
                                disabled={isDone}
                                onClick={() => setProjectTimerModal((prev) => ({ ...prev, selectedTaskId: tarefa.id }))}
                                style={{textAlign:'left', border:isSelected ? '1px solid var(--color-btnPrimary)' : '1px solid #e2e8f0', background:isDone ? '#f8fafc' : (isSelected ? 'var(--color-bgSecondary)' : '#fff'), color:isDone ? '#94a3b8' : '#1e293b', borderRadius:'10px', padding:'10px 12px', cursor:isDone ? 'not-allowed' : 'pointer', opacity:isDone ? 0.78 : 1}}
                                className="hover-shadow"
                              >
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px'}}>
                                  <span style={{fontWeight:'700', fontSize:'0.9rem', textDecoration:isDone ? 'line-through' : 'none'}}>{tarefa.titulo || 'Sem título'}</span>
                                  <span style={{fontSize:'0.68rem', borderRadius:'999px', padding:'3px 7px', background:isDone ? '#fee2e2' : '#dcfce7', color:isDone ? '#991b1b' : '#166534', fontWeight:'800'}}>{isDone ? 'CONCLUÍDA' : 'ABERTA'}</span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <p style={{margin:0, color:'#94a3b8', fontSize:'0.85rem'}}>Esta atividade não tem tarefas registadas.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{padding:'16px 20px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end', gap:'10px', background:'#f8fafc'}}>
                <button type="button" onClick={closeProjectTimerModal} style={{padding:'10px 16px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', color:'#475569', fontWeight:'700', cursor:'pointer'}} className="hover-shadow">Cancelar</button>
                <button
                  type="button"
                  onClick={handleStartTimerFromProjectSelection}
                  disabled={projectTimerModal.loading || projectTimerModal.atividades.length === 0 || projectTimerModal.project?.estado === 'concluido'}
                  style={{padding:'10px 18px', borderRadius:'10px', border:'none', background:projectTimerModal.loading || projectTimerModal.atividades.length === 0 || projectTimerModal.project?.estado === 'concluido' ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)', color:'white', fontWeight:'800', cursor:projectTimerModal.loading || projectTimerModal.atividades.length === 0 || projectTimerModal.project?.estado === 'concluido' ? 'not-allowed' : 'pointer', display:'inline-flex', alignItems:'center', gap:'6px'}}
                  className="hover-shadow"
                >
                  <Icons.Play /> Iniciar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --- MEGA MODAL 360º DO CLIENTE --- */}
      {showModal && (
        <ModalPortal>
          <div onClick={closeClientePanel} style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.58)', backdropFilter:'blur(3px)', display:'flex', alignItems:'stretch', justifyContent:'flex-end', zIndex:99999}}>
            <div style={{background:'#fff', width:'min(98vw, 1180px)', height:'100vh', margin:'0', borderRadius:'18px 0 0 18px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.35)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'100vh', animation: isClosingPanel ? 'sidePanelPullOut 0.36s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'sidePanelPullIn 0.56s cubic-bezier(0.2, 0.9, 0.2, 1)'}} onClick={e => e.stopPropagation()}>
              
              {/* CABEÇALHO DO MODAL */}
              <div style={{padding:'20px 30px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <div style={{width:'48px', height:'48px', borderRadius:'50%', overflow:'hidden', border:'1px solid var(--color-borderColor)', background:'var(--color-bgSecondary)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      {form.avatar_url ? (
                        <img src={form.avatar_url} alt="Logo cliente" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                      ) : (
                        <Icons.Building size={22} color="var(--color-btnPrimary)" />
                      )}
                    </div>
                    <h3 style={{margin:0, color:'#1e293b', fontSize:'1.4rem', fontWeight:'800'}}>
                        {isViewOnly ? `Perfil: ${form.marca}` : (editId ? `Editar: ${form.marca}` : "Nova Empresa")}
                    </h3>
                    {form.ativo === false && <span style={{background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold'}}>INATIVO</span>}
                </div>
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                    {editId && !isViewOnly && (
                        <button 
                            onClick={() => handleToggleAtivo(editId, form.ativo)} 
                            style={{ background: form.ativo === false ? '#dcfce7' : '#fee2e2', color: form.ativo === false ? '#16a34a' : '#ef4444', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', transition:'0.2s', display:'flex', alignItems:'center', gap:'6px' }}
                            className="hover-shadow"
                        >
                            {form.ativo === false ? <><Icons.Restore/> Reativar</> : <><Icons.Archive/> Desativar</>}
                        </button>
                    )}
                    <button onClick={closeClientePanel} style={{background:'#e2e8f0', border:'none', width:'36px', height:'36px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569', transition:'0.2s'}} className="hover-shadow"><Icons.Close/></button>
                </div>
              </div>

              <div style={{display:'flex', flex:1, minHeight:0, background:'#f8fafc'}}>
                {editId && (
                  <aside style={{width:'215px', borderRight:'1px solid #e2e8f0', background:'#ffffff', padding:'16px 10px', overflowY:'auto'}}>
                    {modalTabs
                      .filter((tab) => !tab.requiresAcessos || podeVerAcessos)
                      .map((tab) => {
                        const isActive = activeTab === tab.id;
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {setActiveTab(tab.id); fecharTodosSubForms();}}
                            style={{
                              width:'100%',
                              border:'none',
                              borderRadius:'10px',
                              padding:'10px 12px',
                              marginBottom:'6px',
                              display:'flex',
                              alignItems:'center',
                              gap:'8px',
                              cursor:'pointer',
                              textAlign:'left',
                              fontSize:'0.95rem',
                              fontWeight:isActive ? '800' : '700',
                              color:isActive ? 'var(--color-btnPrimaryDark)' : '#64748b',
                              background:isActive ? 'var(--color-bgSecondary)' : 'transparent',
                              borderLeft:isActive ? '3px solid var(--color-btnPrimary)' : '3px solid transparent',
                              transition:'0.18s'
                            }}
                            className="hover-shadow"
                          >
                            <TabIcon size={15} color={isActive ? 'var(--color-btnPrimary)' : '#64748b'} />
                            {tab.label}
                          </button>
                        );
                      })}
                  </aside>
                )}

                <div style={{padding:'30px', overflowY:'auto', background:'#f8fafc', flex:1}} className="custom-scrollbar">
                
                {/* --- ABA GERAL --- */}
                {activeTab === 'geral' && (
                  <form onSubmit={handleSubmitGeral}>
                     <fieldset disabled={isViewOnly} style={{border: 'none', padding: 0, margin: 0}}>
                      <div style={{display:'flex', alignItems:'center', gap:'14px', marginBottom:'18px'}}>
                        {isViewOnly ? (
                          <div style={{width:'64px', height:'64px', borderRadius:'50%', overflow:'hidden', border:'2px solid var(--color-borderColorLight)', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                            {form.avatar_url ? (
                              <img src={form.avatar_url} alt="Foto cliente" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                            ) : (
                              <span style={{fontSize:'1.5rem', color:'#94a3b8'}}>🏢</span>
                            )}
                          </div>
                        ) : (
                          <label title="Clique para alterar foto" style={{width:'64px', height:'64px', borderRadius:'50%', overflow:'hidden', border:'2px solid var(--color-borderColorLight)', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', cursor: uploading ? 'wait' : 'pointer'}}>
                            {form.avatar_url ? (
                              <img src={form.avatar_url} alt="Foto cliente" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                            ) : (
                              <span style={{fontSize:'1.5rem', color:'#94a3b8'}}>🏢</span>
                            )}
                            <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} disabled={uploading} />
                          </label>
                        )}

                        <div style={{flex: 1, maxWidth: '420px'}}>
                          <label style={labelStyle}>Marca / Nome Comercial *</label>
                          <input
                            type="text"
                            value={form.marca}
                            onChange={e => setForm({...form, marca: e.target.value})}
                            required
                            style={{...inputStyle, marginBottom: 0}}
                            className="input-focus"
                            disabled={isViewOnly}
                          />
                        </div>
                      </div>

                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                        <div>
                            <label style={labelStyle}>NIF * <span style={{fontSize:'0.7rem', color:'var(--color-btnPrimary)', textTransform: 'none'}}>(Pesquisa Auto)</span></label>
                            <div style={{position: 'relative'}}>
                                <input type="text" maxLength="9" value={form.nif} onChange={handleNifChange} required style={{...inputStyle, borderColor: 'var(--color-btnPrimary)', background: 'var(--color-bgSecondary)', paddingLeft: '35px'}} placeholder="Ex: 500000000" className="input-focus" />
                                <span style={{position: 'absolute', left: '12px', top: '10px', color: 'var(--color-btnPrimary)'}}><Icons.Search /></span>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Sigla</label>
                            <input type="text" value={form.sigla || ""} onChange={e => setForm({...form, sigla: e.target.value})} maxLength="20" placeholder="Ex: UAlg" style={inputStyle} className="input-focus" />
                        </div>
                      </div>

                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'10px'}}>
                        <div><label style={labelStyle}>Entidade Legal</label><input type="text" value={form.entidade} onChange={e => setForm({...form, entidade: e.target.value})} style={inputStyle} className="input-focus" /></div>
                        <div>
                            <label style={labelStyle}>Website</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="text" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="www.empresa.pt" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} className="input-focus" />
                                {form.website && (
                                    <a href={form.website.startsWith('http') ? form.website : `https://${form.website}`} target="_blank" rel="noopener noreferrer" title="Abrir Website" className="btn-icon-link">
                                        <Icons.ExternalLink />
                                    </a>
                                )}
                            </div>
                        </div>
                      </div>

                      {!isViewOnly && <button type="submit" className="btn-primary hover-shadow" style={{width:'100%', marginTop:'20px', padding:'15px', fontSize:'1.05rem', fontWeight: 'bold'}}>Guardar Dados Base</button>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA DE PROJETOS DOZ CLIENTE --- */}
                {activeTab === 'projetos' && (
                    <div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                            <div>
                                <h4 style={{margin:0, fontSize: '1.2rem', color: '#1e293b'}}>Histórico de Projetos</h4>
                                <p style={{margin:'5px 0 0 0', color:'#64748b', fontSize:'0.9rem'}}>Todos os trabalhos associados a {form.marca}.</p>
                            </div>
                            
                          <button 
                              onClick={() => navigate('/dashboard/projetos', { state: { prefillClienteId: editId, openNewProjectModal: true } })} 
                              className="btn-primary hover-shadow" 
                              style={{fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'}}
                          >
                              <Icons.Plus /> Novo Projeto
                          </button>
                        </div>

                        {projetosCliente.length > 0 ? (
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '15px'}}>
                                {projetosCliente.map(p => {
                                    const isDone = p.estado === 'concluido';
                                    const relacaoInfo = p.relacao_cliente === 'parceiro'
                                        ? { label: 'Parceiro', bg: '#f3e8ff', color: '#7e22ce' }
                                        : p.relacao_cliente === 'cliente_unico_e_parceiro'
                                            ? { label: 'Cliente + Parceiro', bg: '#ede9fe', color: '#5b21b6' }
                                            : { label: 'Cliente Único', bg: 'var(--color-borderColorLight)', color: 'var(--color-btnPrimaryDark)' };

                                    return (
                                        <div key={p.id} onClick={() => navigate(`/dashboard/projetos/${p.id}`)} style={{background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection:'column', justifyContent: 'space-between', opacity: isDone ? 0.6 : 1, cursor:'pointer', transition:'0.2s'}} className="hover-shadow hover-blue-border">
                                            <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px'}}>
                                                <span style={{fontSize: '0.7rem', background: isDone ? '#f1f5f9' : 'var(--color-bgSecondary)', color: isDone ? '#64748b' : 'var(--color-btnPrimary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>{p.estado.replace('_', ' ')}</span>
                                              <span style={{fontSize: '0.68rem', background: relacaoInfo.bg, color: relacaoInfo.color, padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold'}}>{relacaoInfo.label}</span>
                                                {p.codigo_projeto && <span style={{fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold'}}>{p.codigo_projeto}</span>}
                                            </div>
                                            <h4 style={{margin: '0 0 15px 0', fontSize: '1.1rem', color: '#1e293b', textDecoration: isDone ? 'line-through' : 'none', lineHeight:'1.3'}}>{p.titulo}</h4>
                                            
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent:'space-between', borderTop:'1px solid #f1f5f9', paddingTop:'10px'}}>
                                                {p.data_fim ? <span style={{fontSize: '0.85rem', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Calendar /> {new Date(p.data_fim).toLocaleDateString('pt-PT')}</span> : <span style={{fontSize: '0.85rem', color: '#cbd5e1'}}>Sem Prazo</span>}
                                                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => openProjectTimerModal(p, e)}
                                                    disabled={isDone}
                                                    style={{border: isDone ? '1px solid #cbd5e1' : '1px solid #bbf7d0', background: isDone ? '#f1f5f9' : '#f0fdf4', color: isDone ? '#94a3b8' : '#166534', borderRadius:'999px', padding:'6px 12px', fontWeight:'700', fontSize:'0.78rem', display:'inline-flex', alignItems:'center', gap:'6px', cursor:isDone ? 'not-allowed' : 'pointer'}}
                                                    className="hover-shadow"
                                                    title={isDone ? "Projeto concluído: cronómetro indisponível" : "Iniciar cronómetro neste projeto"}
                                                  >
                                                    <Icons.Play size={11} /> Iniciar
                                                  </button>
                                                  <span style={{fontSize: '0.85rem', color: 'var(--color-btnPrimary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>Abrir <Icons.ArrowRight /></span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox size={48} /></div>
                                <h4 style={{color: '#1e293b', margin: '0 0 5px 0', fontSize:'1.2rem'}}>Este cliente ainda não tem projetos.</h4>
                                <p style={{color:'#64748b'}}>Cria um novo projeto e ele aparecerá aqui automaticamente.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ABA ATIVIDADE E CAES --- */}
                {activeTab === 'atividade' && (
                  <div style={{display:'flex', flexDirection:'column', gap:'30px'}}>
                    <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                        <label style={labelStyle}>Objeto Social</label>
                        <textarea disabled={isViewOnly} rows="5" value={form.objeto_social} onChange={e => setForm({...form, objeto_social: e.target.value})} style={{...inputStyle, resize:'vertical', marginBottom:'15px'}} className="input-focus" />
                        {!isViewOnly && <button className="btn-primary hover-shadow" onClick={handleSubmitGeral}>Atualizar Objeto Social</button>}
                    </div>
                    
                    <div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                          <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Lista de CAEs</h4>
                          {!isViewOnly && !showAddCae && <button className="btn-small-add hover-shadow" onClick={() => {setNovoCae(initCae); setShowAddCae(true)}} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Plus /> Adicionar CAE</button>}
                        </div>

                        {showAddCae && (
                          <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                            <h5 style={{marginTop:0, fontSize: '1.1rem'}}>{novoCae.id ? 'Editar CAE' : 'Novo CAE'}</h5>
                            <div style={{display:'grid', gridTemplateColumns:'150px 1fr auto', gap:'15px', alignItems:'center'}}>
                              <input type="text" placeholder="Código (Ex: 62010)" value={novoCae.codigo} onChange={e => setNovoCae({...novoCae, codigo: e.target.value})} style={inputStyle} className="input-focus" />
                              <input type="text" placeholder="Descrição" value={novoCae.descricao} onChange={e => setNovoCae({...novoCae, descricao: e.target.value})} style={inputStyle} className="input-focus" />
                              <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', fontWeight: 'bold', color: '#475569'}}><input type="checkbox" checked={novoCae.principal} onChange={e => setNovoCae({...novoCae, principal: e.target.checked})} style={{accentColor: 'var(--color-btnPrimary)', width: '16px', height: '16px'}} /> Principal</label>
                            </div>
                            <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                                <button onClick={() => saveSubItem('caes_cliente', novoCae, setCaes, caes, setNovoCae, initCae, setShowAddCae)} className="btn-primary hover-shadow" style={{padding:'10px 20px'}}>{novoCae.id ? 'Atualizar' : 'Guardar CAE'}</button>
                                <button onClick={() => {setShowAddCae(false); setNovoCae(initCae);}} style={{background:'white', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '10px 20px', fontWeight: 'bold'}} className="hover-shadow">Cancelar</button>
                            </div>
                          </div>
                        )}

                        <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                          {caes.map(c => (
                            <li key={c.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow">
                              <div>
                                <span style={{fontWeight:'bold', fontSize:'1.1rem', color:'#1e293b'}}>{c.codigo}</span>
                                {c.principal && <span style={{background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:'10px', fontSize:'0.7rem', marginLeft:'10px', fontWeight:'bold'}}>PRINCIPAL</span>}
                                <div style={{color:'#64748b', fontSize:'0.9rem', marginTop:'6px'}}>{c.descricao || 'Sem descrição'}</div>
                              </div>
                              {!isViewOnly && (
                                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                   <button onClick={() => abrirEdicaoSubItem(c, setNovoCae, setShowAddCae)} className="action-btn hover-blue-text"><Icons.Edit /></button>
                                   <button onClick={() => deleteItem('caes_cliente', c.id, setCaes, caes)} className="action-btn hover-red-text"><Icons.Trash /></button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                    </div>
                  </div>
                )}

                {/* --- ABA DOCUMENTOS --- */}
                {activeTab === 'documentos' && (
                  <form onSubmit={handleSubmitGeral}>
                     <div style={{border:'none', padding:0, margin: 0}}>
                      
                      <div style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'20px'}}>
                          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Código Certidão Permanente</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input disabled={isViewOnly} type="text" value={form.certidao_permanente} onChange={e => setForm({...form, certidao_permanente: e.target.value})} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Ex: 1234-5678-9012" className="input-focus" />
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCredential(form.certidao_permanente, 'Certidão Permanente')}
                                    title="Copiar código da certidão"
                                    className="btn-icon-link"
                                  >
                                    <Icons.Copy />
                                  </button>
                                    <a href="https://www2.gov.pt/espaco-empresa/empresa-online/consultar-a-certidao-permanente" target="_blank" rel="noopener noreferrer" title="Abrir Portal da Certidão Permanente" className="btn-icon-link">
                                        <Icons.ExternalLink />
                                    </a>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Data de Validade</label>
                                <input disabled={isViewOnly} type="date" value={form.validade_certidao || ""} onChange={e => setForm({...form, validade_certidao: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                          </div>
                      </div>

                      <div style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Código RCBE</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input disabled={isViewOnly} type="text" value={form.rcbe} onChange={e => setForm({...form, rcbe: e.target.value})} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Código de acesso RCBE" className="input-focus" />
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCredential(form.rcbe, 'Código RCBE')}
                                    title="Copiar código RCBE"
                                    className="btn-icon-link"
                                  >
                                    <Icons.Copy />
                                  </button>
                                    <a href="https://rcbe.justica.gov.pt" target="_blank" rel="noopener noreferrer" title="Abrir Portal RCBE" className="btn-icon-link">
                                        <Icons.ExternalLink />
                                    </a>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Data de Validade</label>
                                <input disabled={isViewOnly} type="date" value={form.validade_rcbe || ""} onChange={e => setForm({...form, validade_rcbe: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                          </div>
                      </div>

                      {!isViewOnly && <button type="submit" className="btn-primary hover-shadow" style={{width:'100%', marginTop:'20px', padding:'15px', fontSize:'1.05rem', fontWeight: 'bold'}}>Guardar Documentos</button>}
                    </div>
                  </form>
                )}

                {/* --- ABA PLANO --- */}
                {activeTab === 'plano' && (
                  <div style={{background:'white', padding:'40px', borderRadius:'16px', border:'1px solid #e2e8f0', textAlign:'center', maxWidth:'500px', margin:'0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                     <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: 'var(--color-btnPrimary)'}}><Icons.Diamond size={48} /></div>
                     <h3 style={{marginTop:0, color:'#1e293b', fontSize:'1.5rem'}}>Plano de Subscrição</h3>
                     <select disabled={isViewOnly} value={form.plano} onChange={e => setForm({...form, plano: e.target.value})} style={{...inputStyle, fontSize:'1.1rem', padding:'15px', margin:'20px auto', display:'block', fontWeight: 'bold', color: 'var(--color-btnPrimary)', background: 'var(--color-bgSecondary)', borderColor: 'var(--color-borderColor)', cursor: 'pointer'}}>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                     </select>
                     {!isViewOnly && <button className="btn-primary hover-shadow" onClick={handleSubmitGeral} style={{width:'100%', padding:'15px', fontSize:'1.05rem', fontWeight: 'bold'}}>Confirmar Plano</button>}
                  </div>
                )}

                {/* --- ABA PESSOAS --- */}
                {activeTab === 'contactos' && (
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center'}}>
                      <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Equipa do Cliente</h4>
                      {!isViewOnly && !showAddContacto && <button className="btn-small-add hover-shadow" onClick={() => { setNovoContacto(initContacto); setIsOutroCargo(false); setShowAddContacto(true); }} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Plus /> Adicionar Pessoa</button>}
                    </div>
                    
                    {showAddContacto && (
                      <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <h5 style={{marginTop:0, fontSize:'1.1rem'}}>{novoContacto.id ? 'Editar Pessoa' : 'Nova Pessoa'}</h5>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                          <div>
                              <label style={labelStyle}>Nome Completo *</label>
                              <input type="text" placeholder="João Silva" value={novoContacto.nome_contacto} onChange={e => setNovoContacto({...novoContacto, nome_contacto: e.target.value})} style={inputStyle} className="input-focus" required />
                          </div>
                          <div>
                              <label style={labelStyle}>Cargo</label>
                              <select
                                value={getCargoSelectValue(novoContacto.cargo)}
                                onChange={(e) => {
                                  const selected = e.target.value;
                                  if (selected === OUTRO_CARGO_VALUE) {
                                    setIsOutroCargo(true);
                                    if (isKnownCargo(novoContacto.cargo)) {
                                      setNovoContacto({ ...novoContacto, cargo: "" });
                                    }
                                  } else {
                                    setIsOutroCargo(false);
                                    setNovoContacto({ ...novoContacto, cargo: selected });
                                  }
                                }}
                                style={inputStyle}
                                className="input-focus"
                              >
                                <option value="">Selecionar cargo</option>
                                {CARGO_OPTIONS.map((cargo) => (
                                  <option key={cargo} value={cargo}>{cargo}</option>
                                ))}
                                <option value={OUTRO_CARGO_VALUE}>Outro</option>
                              </select>
                              {isOutroCargo && (
                                <input
                                  type="text"
                                  placeholder="Escreve o cargo"
                                  value={novoContacto.cargo || ""}
                                  onChange={e => setNovoContacto({ ...novoContacto, cargo: e.target.value })}
                                  style={{ ...inputStyle, marginTop: '8px' }}
                                  className="input-focus"
                                />
                              )}
                          </div>
                          <div>
                              <label style={labelStyle}>Email</label>
                              <input type="email" placeholder="joao@empresa.pt" value={novoContacto.email} onChange={e => setNovoContacto({...novoContacto, email: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                          <div>
                              <label style={labelStyle}>Telefone / Telemóvel</label>
                              <input type="text" placeholder="+351 900 000 000" value={novoContacto.telefone} onChange={e => setNovoContacto({...novoContacto, telefone: e.target.value})} style={inputStyle} className="input-focus" />
                          </div>
                        </div>
                        <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                            <button onClick={() => { saveSubItem('contactos_cliente', novoContacto, setContactos, contactos, setNovoContacto, initContacto, setShowAddContacto); setIsOutroCargo(false); }} className="btn-primary hover-shadow" style={{padding:'10px 20px', fontWeight: 'bold'}}>{novoContacto.id ? 'Atualizar' : 'Guardar Pessoa'}</button>
                            <button onClick={() => { setShowAddContacto(false); setNovoContacto(initContacto); setIsOutroCargo(false); }} style={{background:'white', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '10px 20px', fontWeight: 'bold'}} className="hover-shadow">Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                      {contactos.map(c => (
                        <li key={c.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', border:'1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow">
                          <div>
                            <span style={{fontWeight:'bold', color:'#1e293b', fontSize:'1.1rem'}}>{c.nome_contacto}</span> {c.cargo && <span style={{color:'#64748b', fontSize:'0.9rem', marginLeft:'5px'}}>({c.cargo})</span>}
                            <div style={{fontSize:'0.9rem', color:'#475569', marginTop:'8px', display:'flex', flexDirection:'column', gap:'6px'}}>
                                {c.email && <span style={{display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-btnPrimary)'}}><Icons.Mail /> <a href={`mailto:${c.email}`} style={{color: 'inherit', textDecoration: 'none'}}>{c.email}</a></span>}
                                {c.telefone && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Phone /> {c.telefone}</span>}
                            </div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                               <button onClick={() => { setNovoContacto(c); setIsOutroCargo(Boolean(c.cargo) && !isKnownCargo(c.cargo)); setShowAddContacto(true); }} className="action-btn hover-blue-text"><Icons.Edit /></button>
                               <button onClick={() => deleteItem('contactos_cliente', c.id, setContactos, contactos)} className="action-btn hover-red-text"><Icons.Trash /></button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* --- ABA MORADAS --- */}
                {activeTab === 'moradas' && (
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center'}}>
                      <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Moradas Registadas</h4>
                      {!isViewOnly && !showAddMorada && <button className="btn-small-add hover-shadow" onClick={() => {setNovaMorada(initMorada); setShowAddMorada(true)}} style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Plus /> Adicionar Morada</button>}
                    </div>

                    {showAddMorada && (
                      <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <h5 style={{marginTop:0, fontSize:'1.1rem'}}>{novaMorada.id ? 'Editar Morada' : 'Nova Morada'}</h5>
                        
                        <label style={labelStyle}>Rua / Lote / Porta</label>
                        <input type="text" placeholder="Ex: Rua Direita, nº 10" value={novaMorada.morada} onChange={e => setNovaMorada({...novaMorada, morada: e.target.value})} style={inputStyle} className="input-focus" />
                        
                        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Cód. Postal <span style={{fontSize:'0.7rem', color:'var(--color-btnPrimary)', textTransform: 'none'}}>(Preenchimento Auto)</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: 8000-000" 
                                    maxLength="8"
                                    value={novaMorada.codigo_postal || ""} 
                                    onChange={e => {
                                        let val = e.target.value;
                                        // Auto-formatação: mete o tracinho sozinho
                                        if (val.length === 4 && !val.includes('-') && (novaMorada.codigo_postal || "").length < 4) {
                                            val += '-';
                                        }
                                        setNovaMorada({...novaMorada, codigo_postal: val});
                                        
                                        // Dispara a pesquisa mal chega aos 8 caracteres
                                        if (val.length === 8 && val.includes('-')) {
                                            fetchMoradaByCodigoPostal(val);
                                        }
                                    }} 
                                    style={{...inputStyle, borderColor: 'var(--color-btnPrimary)', background: 'var(--color-bgSecondary)'}} 
                                    className="input-focus" 
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Localidade</label>
                                <input type="text" placeholder="Ex: Faro" value={novaMorada.localidade} onChange={e => setNovaMorada({...novaMorada, localidade: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                        </div>
                        
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Concelho <span style={{fontSize:'0.7rem', color:'var(--color-btnPrimary)', textTransform: 'none'}}>(Preenche o resto)</span></label>
                                <input 
                                    type="text" 
                                    value={novaMorada.concelho || ""} 
                                    onChange={e => setNovaMorada({...novaMorada, concelho: e.target.value})} 
                                    onBlur={e => fetchDadosByConcelho(e.target.value)}
                                    placeholder="Ex: Albufeira"
                                    style={{...inputStyle, borderColor: 'var(--color-btnPrimary)', background: 'var(--color-bgSecondary)'}} 
                                    className="input-focus" 
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Distrito</label>
                                <input type="text" value={novaMorada.distrito} onChange={e => setNovaMorada({...novaMorada, distrito: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                            <div>
                                <label style={labelStyle}>Região</label>
                                <input type="text" value={novaMorada.regiao} onChange={e => setNovaMorada({...novaMorada, regiao: e.target.value})} style={inputStyle} className="input-focus" />
                            </div>
                        </div>

                        <label style={labelStyle}>Tipo / Notas Opcionais</label>
                        <input type="text" placeholder="Ex: Sede, Armazém, Local de Faturação..." value={novaMorada.notas} onChange={e => setNovaMorada({...novaMorada, notas: e.target.value})} style={{...inputStyle, marginBottom:0}} className="input-focus" />
                        
                        <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                            <button onClick={() => saveSubItem('moradas_cliente', novaMorada, setMoradas, moradas, setNovaMorada, initMorada, setShowAddMorada)} className="btn-primary hover-shadow" style={{padding:'10px 20px', fontWeight: 'bold'}}>{novaMorada.id ? 'Atualizar' : 'Guardar Morada'}</button>
                            <button onClick={() => {setShowAddMorada(false); setNovaMorada(initMorada);}} style={{background:'white', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '10px 20px', fontWeight: 'bold'}} className="hover-shadow">Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                      {moradas.map(m => (
                        <li key={m.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', border:'1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow">
                          <div>
                            {m.notas && <span style={{display:'inline-block', marginBottom:'8px', textTransform:'uppercase', fontSize: '0.75rem', background:'var(--color-bgTertiary)', color:'var(--color-btnPrimary)', padding:'4px 8px', borderRadius:'6px', fontWeight:'bold'}}>{m.notas}</span>}
                            <div style={{fontWeight:'bold', color:'#334155', fontSize:'1.05rem', marginBottom:'4px'}}>{m.morada}</div>
                            <div style={{color:'#64748b', fontSize:'0.9rem'}}>{m.codigo_postal} {m.localidade}</div>
                            <div style={{color:'#94a3b8', fontSize:'0.85rem', marginTop:'4px'}}>{[m.concelho, m.distrito, m.regiao].filter(Boolean).join(' • ')}</div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                               <button onClick={() => abrirEdicaoSubItem(m, setNovaMorada, setShowAddMorada)} className="action-btn hover-blue-text"><Icons.Edit /></button>
                               <button onClick={() => deleteItem('moradas_cliente', m.id, setMoradas, moradas)} className="action-btn hover-red-text"><Icons.Trash /></button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* --- ABA ACESSOS --- */}
                {activeTab === 'acessos' && podeVerAcessos && (
                  <div>
                    <div style={{background: '#fffbeb', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #f59e0b', marginBottom: '25px', color:'#b45309', fontWeight:'600', fontSize:'0.95rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <Icons.Alert size={20} color="#b45309" /> Acesso Restrito de Administração. Não partilhe estas credenciais fora da plataforma.
                    </div>
                    
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', alignItems:'center'}}>
                      <div>
                        <h4 style={{margin:0, fontSize:'1.1rem', color: '#1e293b'}}>Credenciais Ativas</h4>
                        <p style={{margin:'4px 0 0 0', fontSize:'0.85rem', color:'#64748b'}}>Acessos com credenciais registadas</p>
                      </div>
                      {!isViewOnly && (
                        <button
                          className="hover-shadow"
                          onClick={() => {
                            setNovoAcesso(initAcesso);
                            setShowAddAcesso(true);
                          }}
                          style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-btnPrimary)', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 20px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)'}}>
                          <Icons.Plus size={18} /> Nova Credencial
                        </button>
                      )}
                    </div>

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(400px, 1fr))', gap:'15px'}}>
                      {[...acessos]
                        .sort((a, b) => {
                          const tipoA = a.tipos_acessos || tiposAcessosCatalogo.find((t) => String(t.id) === String(a.tipo_acesso_id)) || {};
                          const tipoB = b.tipos_acessos || tiposAcessosCatalogo.find((t) => String(t.id) === String(b.tipo_acesso_id)) || {};
                          return (tipoA.nome || "").localeCompare(tipoB.nome || "", "pt-PT", { sensitivity: "base" });
                        })
                        .map((acesso) => {
                        const tipo = acesso.tipos_acessos || tiposAcessosCatalogo.find((t) => String(t.id) === String(acesso.tipo_acesso_id)) || {};

                        return (
                          <li
                            key={acesso.id}
                            style={{
                              background:'white',
                              padding:'20px',
                              borderRadius:'12px',
                              display:'flex',
                              justifyContent:'space-between',
                              alignItems:'center',
                              borderLeft:'5px solid var(--color-btnPrimary)',
                              boxShadow:'0 2px 4px rgba(0,0,0,0.05)',
                              transition: '0.2s'
                            }}
                            className="hover-shadow"
                          >
                            <div style={{flex: 1, paddingRight:'15px'}}>
                              <span style={{fontWeight:'800', color:'#1e293b', fontSize:'1.15rem', display:'block', marginBottom:'10px'}}>{tipo.nome || "Tipo sem nome"}</span>

                              <div style={{fontFamily:'monospace', background:'#f8fafc', border:'1px solid #e2e8f0', padding:'12px', borderRadius:'8px', color:'#334155', fontSize:'0.95rem'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', marginBottom:'8px'}}>
                                  <span>User: <b style={{color:'var(--color-btnPrimary)'}}>{acesso.utilizador}</b></span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCredential(acesso.utilizador, 'Utilizador')}
                                    style={{border:'1px solid var(--color-borderColor)', background:'var(--color-bgSecondary)', color:'var(--color-btnPrimaryDark)', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'4px', fontWeight:'700', fontSize:'0.75rem'}}
                                    className="hover-shadow"
                                    title="Copiar utilizador"
                                  >
                                    <Icons.Copy size={12} /> Copiar
                                  </button>
                                </div>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px'}}>
                                  <span>Pass: <b style={{color:'#ef4444'}}>{acesso.codigo}</b></span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCredential(acesso.codigo, 'Password')}
                                    style={{border:'1px solid #fecaca', background:'#fef2f2', color:'#b91c1c', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'4px', fontWeight:'700', fontSize:'0.75rem'}}
                                    className="hover-shadow"
                                    title="Copiar password"
                                  >
                                    <Icons.Copy size={12} /> Copiar
                                  </button>
                                </div>
                              </div>

                              {tipo.url && (
                                <a href={tipo.url.startsWith('http') ? tipo.url : `https://${tipo.url}`} target="_blank" rel="noreferrer" style={{display:'inline-flex', alignItems: 'center', gap: '6px', marginTop:'12px', fontSize:'0.85rem', color:'var(--color-btnPrimary)', textDecoration:'none', fontWeight:'bold', background:'var(--color-bgSecondary)', padding:'6px 12px', borderRadius:'6px', border: '1px solid var(--color-borderColor)', transition: '0.2s'}} className="hover-shadow"><Icons.ExternalLink size={14} /> Abrir Portal de Login</a>
                              )}
                            </div>

                            {!isViewOnly && (
                              <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                                <button onClick={() => abrirEdicaoSubItem(acesso, setNovoAcesso, setShowAddAcesso)} className="action-btn hover-blue-text"><Icons.Edit /></button>
                                <button onClick={() => deleteItem('acessos_cliente', acesso.id, setAcessos, acessos)} className="action-btn hover-red-text"><Icons.Trash /></button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {cropModal.show && (
        <ModalPortal>
          <div
            style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.92)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:1000000,padding:'16px',boxSizing:'border-box'}}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
          >
            <div style={{color:'white',marginBottom:'12px',textAlign:'center'}}>
              <div style={{fontSize:'1.1rem',fontWeight:'bold'}}>Recortar Foto do Cliente</div>
              <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.55)',marginTop:'3px'}}>Arrasta para mover · Scroll para aproximar/afastar</div>
            </div>

            <div
              ref={(el) => {
                cropContainerRef.current = el;
                if (el) {
                  const s = Math.min(el.offsetWidth, el.offsetHeight);
                  if (s !== cropContainerSize.w) setCropContainerSize({ w: s, h: s });
                }
              }}
              onMouseDown={handleCropMouseDown}
              style={{
                position: 'relative',
                width: 'min(80vw, 80vh, 440px)',
                height: 'min(80vw, 80vh, 440px)',
                background: '#111',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: cropDragStart ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
            >
              {cropModal.src && (
                <img
                  ref={cropImgRef}
                  src={cropModal.src}
                  alt="crop"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropScale})`,
                    transformOrigin: 'center center',
                    width: cropImgNatural.w > 0 ? cropImgNatural.w : 'auto',
                    height: 'auto',
                    maxWidth: 'none',
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }}
                  onLoad={(e) => {
                    const img = e.target;
                    const nw = img.naturalWidth;
                    const nh = img.naturalHeight;
                    setCropImgNatural({ w: nw, h: nh });
                    const size = cropContainerRef.current
                      ? Math.min(cropContainerRef.current.offsetWidth, cropContainerRef.current.offsetHeight)
                      : 400;
                    setCropContainerSize({ w: size, h: size });
                    const cropRadius = Math.round(size * 0.4);
                    const minScale = Math.max((cropRadius * 2) / nw, (cropRadius * 2) / nh);
                    setCropScale(minScale);
                    setCropOffset({ x: 0, y: 0 });
                  }}
                />
              )}

              <svg
                style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <mask id="cropMaskClientes">
                    <rect width="100%" height="100%" fill="white" />
                    <circle
                      cx="50%" cy="50%"
                      r={`${Math.round(Math.min(cropContainerSize.w, cropContainerSize.h) * 0.4)}px`}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.58)" mask="url(#cropMaskClientes)" />
                <circle
                  cx="50%" cy="50%"
                  r={Math.round(Math.min(cropContainerSize.w, cropContainerSize.h) * 0.4)}
                  fill="none" stroke="white" strokeWidth="2"
                />
              </svg>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'14px',width:'min(80vw,440px)'}}>
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>−</span>
              <input
                type="range" min={1} max={100} step={1}
                value={Math.round(
                  (() => {
                    const minS = Math.max(
                      (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.w,1),
                      (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.h,1)
                    );
                    const maxS = minS * 8;
                    return ((cropScale - minS) / (maxS - minS)) * 99 + 1;
                  })()
                )}
                onChange={(ev) => {
                  const pct = (Number(ev.target.value) - 1) / 99;
                  const minS = Math.max(
                    (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.w,1),
                    (Math.round(Math.min(cropContainerSize.w,cropContainerSize.h)*0.8)) / Math.max(cropImgNatural.h,1)
                  );
                  const newScale = minS + pct * (minS * 7);
                  setCropScale(newScale);
                  setCropOffset((prev) => clampCropOffset(prev.x, prev.y, newScale));
                }}
                style={{flex:1,accentColor:'white'}}
              />
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>+</span>
            </div>

            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              <button type="button" onClick={() => setCropModal({ show: false, src: null })} style={{padding:'10px 22px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'white',cursor:'pointer',fontWeight:'bold'}}>Cancelar</button>
              <button type="button" onClick={confirmCrop} disabled={uploading} style={{padding:'10px 28px',borderRadius:'8px',border:'none',background:'var(--color-btnPrimary)',color:'white',cursor:'pointer',fontWeight:'bold',fontSize:'0.95rem'}}>{uploading ? 'A guardar...' : 'Confirmar Recorte'}</button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO GLOBAL --- */}
      {confirmDialog.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.Alert size={48} color={confirmDialog.isDanger ? "#ef4444" : "var(--color-btnPrimary)"} /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Confirmação</h3>
                      <p style={{color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5', whiteSpace: 'pre-line'}}>{confirmDialog.message}</p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setConfirmDialog({show: false})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                          <button onClick={confirmDialog.onConfirm} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: confirmDialog.isDanger ? '#ef4444' : 'var(--color-btnPrimary)', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">{confirmDialog.confirmText}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL DE ACESSO (ADICIONAR / EDITAR) --- */}
      {showModal && showAddAcesso && activeTab === 'acessos' && podeVerAcessos && !isViewOnly && (
        <ModalPortal>
          <div
            style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999998}}
            onClick={() => {
              setShowAddAcesso(false);
              setNovoAcesso(initAcesso);
            }}
          >
            <div
              style={{background:'white', width:'92%', maxWidth:'680px', borderRadius:'16px', border:'1px solid #e2e8f0', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)', overflow:'hidden', animation: 'fadeIn 0.2s ease-out'}}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{background: 'var(--color-bgSecondary)', padding: '20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px solid var(--color-borderColor)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div style={{background: 'var(--color-borderColorLight)', padding: '8px', borderRadius: '8px', display: 'flex', color: 'var(--color-btnPrimary)'}}><Icons.Lock size={20} /></div>
                  <h5 style={{margin:0, fontSize:'1.2rem', fontWeight: '800', color: 'var(--color-btnPrimaryDark)'}}>{novoAcesso.id ? 'Editar Credencial' : 'Nova Credencial'}</h5>
                </div>
                <button
                  onClick={() => {
                    setShowAddAcesso(false);
                    setNovoAcesso(initAcesso);
                  }}
                  style={{background:'#f1f5f9', border:'1px solid #e2e8f0', width:'36px', height:'36px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#1e293b', transition: '0.2s'}}
                  className="hover-shadow"
                  title="Fechar"
                >
                  <Icons.Close size={20} />
                </button>
              </div>

              <div style={{padding:'24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                <div>
                  <label style={labelStyle}>Tipo de Acesso *</label>
                  <select
                    value={novoAcesso.tipo_acesso_id || ""}
                    onChange={e => setNovoAcesso({...novoAcesso, tipo_acesso_id: e.target.value})}
                    required
                    style={inputStyle}
                    className="input-focus"
                  >
                    <option value="">Selecionar tipo...</option>
                    {tiposAcessosCatalogo.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Utilizador / NIF *</label>
                  <input
                    type="text"
                    value={novoAcesso.utilizador}
                    onChange={e => setNovoAcesso({...novoAcesso, utilizador: e.target.value})}
                    required
                    style={inputStyle}
                    className="input-focus"
                  />
                </div>

                <div style={{gridColumn:'1 / -1'}}>
                  <label style={labelStyle}>Password *</label>
                  <input
                    type="text"
                    value={novoAcesso.codigo}
                    onChange={e => setNovoAcesso({...novoAcesso, codigo: e.target.value})}
                    required
                    style={{...inputStyle, fontFamily:'monospace'}}
                    className="input-focus"
                  />
                </div>
              </div>

              <div style={{display:'flex', gap:'12px', marginTop:'24px', justifyContent:'flex-end', padding: '0 24px 24px 24px', borderTop: '1px solid #e2e8f0', paddingTop: '24px'}}>
                <button
                  onClick={() => {
                    setShowAddAcesso(false);
                    setNovoAcesso(initAcesso);
                  }}
                  style={{background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius: '8px', color:'#64748b', cursor:'pointer', padding: '12px 24px', fontWeight: '600', fontSize: '0.95rem', transition: '0.2s'}}
                  className="hover-shadow"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveSubItem('acessos_cliente', novoAcesso, setAcessos, acessos, setNovoAcesso, initAcesso, setShowAddAcesso)}
                  style={{background: 'var(--color-btnPrimary)', color: 'white', border: 'none', borderRadius: '8px', cursor:'pointer', padding: '12px 24px', fontWeight: '600', fontSize: '0.95rem', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'}}
                  className="hover-shadow"
                >
                  {novoAcesso.id ? <><Icons.Save size={16} /> Atualizar</> : <><Icons.Plus size={16} /> Guardar Acesso</>}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <style>{`
          /* Grelha de Clientes */
          .client-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 20px;
          }

          @keyframes sidePanelPullIn {
            0% {
              transform: translateX(100%);
              opacity: 0.72;
            }
            72% {
              transform: translateX(-10px);
              opacity: 1;
            }
            100% {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes sidePanelPullOut {
            0% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(100%);
              opacity: 0.78;
            }
          }
          
          /* Efeito Interativo no Cartão */
          .client-card:hover {
              transform: translateY(-4px);
              border-color: #cbd5e1 !important;
              box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important;
          }

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

            .clients-list-table .row-inactive {
              opacity: 0.65;
              background: #f8fafc;
            }

            .clients-list-row {
              cursor: pointer;
            }

              .client-color-dot {
                width: 10px;
                height: 10px;
                border-radius: 999px;
                border: 1px solid rgba(255, 255, 255, 0.8);
                box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
                flex-shrink: 0;
              }

              .archive-badge,
              .active-badge {
              display: inline-flex;
              align-items: center;
                border-radius: 4px;
                padding: 2px 6px;
                font-size: 0.65rem;
                font-weight: bold;
              text-transform: uppercase;
                letter-spacing: 0.04em;
            }

              .active-badge {
              background: #dcfce7;
              color: #166534;
            }

              .archive-badge {
              background: #fee2e2;
                color: #ef4444;
            }

            .list-actions-cell {
              display: flex;
              gap: 8px;
              justify-content: flex-end;
            }

            .list-action-btn {
                border: 1px solid transparent;
                background: #ffffff;
                color: #475569;
              border-radius: 8px;
                width: 32px;
                height: 32px;
                padding: 0;
              cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
              transition: 0.2s;
            }

            .list-action-btn.view {
              border-color: var(--color-borderColor);
              background: var(--color-bgSecondary);
              color: var(--color-btnPrimaryDark);
            }

            .list-action-btn.edit {
              border-color: #fed7aa;
              background: #fff7ed;
              color: #c2410c;
            }

            .list-action-btn.restore {
              border-color: #bbf7d0;
              background: #dcfce7;
              color: #166534;
            }

              .list-action-btn.archive {
                border-color: #fecaca;
                background: #fee2e2;
                color: #ef4444;
              }

            .list-action-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 3px 8px rgba(15, 23, 42, 0.14);
            }

            @media (max-width: 900px) {
              .list-actions-cell {
                justify-content: flex-start;
              }
            }

          .hover-shadow:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateY(-1px); }
          .hover-blue-text:hover { background: var(--color-bgSecondary) !important; color: var(--color-btnPrimaryDark) !important; }
          .hover-orange-text:hover { background: #fff7ed !important; color: #d97706 !important; }
          .hover-green-text:hover { background: #dcfce7 !important; color: #16a34a !important; }
          .hover-red-text:hover { background: #fef2f2 !important; color: #ef4444 !important; }

          /* Focus em Inputs */
          .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }

          /* Action Buttons para Sub-itens */
          .action-btn { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 6px; }
          .action-btn:hover { opacity: 1; transform: scale(1.1); }

          /* Botão External Link inline */
          .btn-icon-link { display: flex; align-items: center; justify-content: center; text-decoration: none; background: var(--color-bgSecondary); color: var(--color-btnPrimary); padding: 0 15px; height: 42px; border-radius: 8px; border: 1px solid var(--color-borderColor); transition: 0.2s; }
          .btn-icon-link:hover { background: var(--color-borderColorLight); transform: translateY(-1px); box-shadow: 0 2px 4px rgba(37,99,235,0.1); }

          /* Custom Scrollbar limpa */
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

          /* Botão Add SubItem */
          .btn-small-add { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
          .btn-small-add:hover { background: #f8fafc; color: #1e293b; border-color: #94a3b8; }

          /* Animação Modal */
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  );
}
