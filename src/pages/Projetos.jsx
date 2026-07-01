import { useState, useEffect, useRef } from "react";

import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { hasAttendanceStartedToday, startAttendanceNow } from "../utils/attendanceGuard";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import { concludeActivityWithChildren } from "../utils/activityStatusCascade";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
import "./../styles/dashboard.css";

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

export default function Projetos() {
  const { user } = useAuth();
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 5;

  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
    const [programas, setProgramas] = useState([]);
    const [avisos, setAvisos] = useState([]);
  
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
  
  const [busca, setBusca] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
    const [viewMode, setViewMode] = useState("cards");
  const [showOnlyMine, setShowOnlyMine] = useState(true); 
  const [menuPrincipal, setMenuPrincipal] = useState("tipo");
  const [selectedCategoria, setSelectedCategoria] = useState(null); 
  const [selectedEstado, setSelectedEstado] = useState(null); 
  const [selectedProgramaNav, setSelectedProgramaNav] = useState(null);



  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [staff, setStaff] = useState([]); 
    const [entidadePessoas, setEntidadePessoas] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");
    const [parceiroSelecionado, setParceiroSelecionado] = useState("");
    const [quickOrganismoModal, setQuickOrganismoModal] = useState({ show: false, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });

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
    // Força o URL exato do Bizin Manager
    const baseUrl = "https://bizinmanager.vercel.app";
    return `${baseUrl}/dashboard/projetos/${projectId}`;
    };

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
                  const endpoint = `${apiBase}/api/project-notifications/send-created`;
                  await fetch(endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      email: responsibleEmail,
                      projectTitle: project.titulo,
                      projectUrl,
                      responsibleName,
                      clientName,
                      senderType: "PROJECT"
                  }),
                  });
              }
          } catch (emailError) {
              console.error("Erro ao enviar email do novo projeto:", emailError);
          }
      }

      window.dispatchEvent(new CustomEvent("project-notifications-updated"));
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
  }, [showModal]);

  useEffect(() => {
    fetchData();
    checkActiveLog();
  }, [user]);

    const getProgramaById = (programaId) => programas.find((programa) => String(programa.id) === String(programaId)) || null;
    const getAvisoById = (avisoId) => avisos.find((aviso) => String(avisos.ids) === String(avisoId)) || null;
    const normalizeCode = (v) => String(v || "").trim().toLowerCase();
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

  async function fetchData() {
    setLoading(true);
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
    else setProjetos(projData || []);

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

    setLoading(false);
  }

  async function checkActiveLog() {
    if(!user?.id) return;
    const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
        setActiveLog(data || null);
  }

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

    async function openProjectTimerModal(e, proj) {
        if (e?.stopPropagation) e.stopPropagation();
        if (!proj?.id || proj.estado === "concluido") {
            showToast("Projeto concluído. Não é possível iniciar cronómetro.", "warning");
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

    async function handleStartFromProjectSelection() {
        if (projectTimerModal.project?.estado === "concluido") {
            showToast("Projeto concluído. Não é possível iniciar cronómetro.", "warning");
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
  }

  function handleEdit(e, proj) {
    e.stopPropagation();
    setEditId(proj.id); setIsViewOnly(false);
        setParceiroSelecionado("");
    const matchedPrograma = programas.find((programa) =>
        String(programa.id) === String(proj.programa_id || "") ||
        String(programa.codigo || "").trim() === String(proj.programa || "").trim() ||
        String(programa.nome || "").trim() === String(proj.programa || "").trim()
    ) || null;
    const matchedAviso = avisos.find((aviso) =>
        String(avisos.ids) === String(proj.avisos_ids || "") ||
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
        data_fim: proj.data_fim || getLastProjetoFaseDate(projetoFases) || "", observacoes: proj.observacoes || "",
        programa: proj.programa || matchedPrograma?.nome || "", aviso: proj.aviso || matchedAviso?.codigo || avisoBase?.codigo || "",
        programa_id: matchedPrograma?.id || proj.programa_id || "",
        aviso_id: matchedAviso?.id || proj.aviso_id || avisoBase?.id || "",
        prazos_fases: projetoFases,
        codigo_projeto: proj.codigo_projeto || "", numero_projeto: proj.numero_projeto || "", investimento: proj.investimento || 0, incentivo: proj.incentivo || 0
    });
    setActiveTab("geral");
    setCurrentStep(1);
    setShowModal(true);
  }

  function askDeleteProjeto(e, id, titulo) {
      e.stopPropagation();
      setConfirmDialog({
          show: true,
          message: `Tens a certeza que queres apagar o projeto "${titulo}"?\nEsta ação apagará todas as atividades e tempos associados de forma irreversível.`,
          confirmText: "Sim, Apagar",
          isDanger: true,
          onConfirm: async () => {
              setConfirmDialog({ show: false, message: '', confirmText: '', isDanger: true, onConfirm: null });
              
              try {
                  const { error } = await supabase.from("projetos").delete().eq("id", id);
                  if (error) throw error;
                  showToast("Projeto apagado com sucesso!");
                  setShowModal(false); 
                  fetchData();
              } catch (err) { 
                  showToast("Erro ao apagar. O projeto tem atividades ativas.", "error"); 
              }
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

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { ...form };

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

    if (payload.cliente_id === "") payload.cliente_id = null;
    if (payload.tipo_projeto_id === "") payload.tipo_projeto_id = null;
    if (payload.responsavel_id === "") payload.responsavel_id = null;
    if (payload.data_fim === "") payload.data_fim = null;

    if (normalizedFases.length > 0) {
        const lastPhaseDate = getLastProjetoFaseDate(normalizedFases);
    }

    if (!editId) {
        const missingFields = [];
        if (!payload.titulo) missingFields.push("Nome do Projeto");
        if (!payload.cliente_id) missingFields.push("Cliente");
        if (!payload.tipo_projeto_id) missingFields.push("Tipo de Projeto");
        if (!payload.responsavel_id) missingFields.push("Responsável Global");
        if (!payload.data_fim) missingFields.push("Data de Fim");
        if ((payload.programa_id || payload.avisos_ids) && normalizedFases.length === 0) missingFields.push("Datas das fases do aviso");

        if (missingFields.length > 0) {
            showToast(`Para criar o projeto preenche: ${missingFields.join(", ")}.`, "warning");
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
            const { error } = await supabase.from("projetos").update(payload).eq("id", editId);
            if (error) throw error;
            showToast("Projeto atualizado!");
            setShowModal(false); 
            fetchData(); 
        } else {
            const { data: newProj, error: errProj } = await supabase.from("projetos").insert([payload]).select().single();
            if (errProj) throw errProj;

            // Gerar Árvore de Atividades
            if (payload.tipo_projeto_id && templateTree.length > 0) {
                showToast("A preparar as atividades do projeto...", "info");
                let projDateStr = payload.data_inicio || new Date().toISOString().split('T')[0];
                const projEndStr = payload.data_fim || getLastProjetoFaseDate(payload.prazos_fases) || null; 
                let currentAtivDate = projDateStr;
                const templateToRealAtividade = new Map();

                for (const tAtiv of templateTree) {
                    if (!templateSelection[`a_${tAtiv.id}`]) continue; 

                    const ativStart = currentAtivDate;
                    const ativEnd = (tAtiv.dias_estimados > 0) ? addDays(ativStart, tAtiv.dias_estimados) : (projEndStr || ativStart);

                    const { data: realAtiv } = await supabase.from("atividades").insert([{ 
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
                            const { data: realTar } = await supabase.from("tarefas").insert([{ 
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
                                    await supabase.from("subtarefas").insert(subTarefasParaInserir);
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

                if (!payload.data_fim) await supabase.from("projetos").update({ data_fim: currentAtivDate }).eq("id", newProj.id);
            }

            await notifyProjectCreated(newProj, payload.responsavel_id || null);
            
            showToast("Projeto criado com sucesso!");
            setShowModal(false); 
            navigate(`/dashboard/projetos/${newProj.id}`);
        }
    } catch (err) { 
        showToast("Erro: " + err.message, "error"); 
    } finally { 
        setIsSubmitting(false); 
    }
  }

  const checkUserInvolvement = (p) => {
      if (!showOnlyMine) return true; 
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

  const estadosProjeto = [
      { id: 'pendente', nome: 'Pendente', color: '#f59e0b' },
      { id: 'em_curso', nome: 'Em Curso', color: '#10b981' },
      { id: 'em_analise', nome: 'Em Análise', color: '#6366f1' },
      { id: 'concluido', nome: 'Concluído', color: '#64748b' },
      { id: 'cancelado', nome: 'Cancelado', color: '#ef4444' }
  ];

  const normalizeText = (value) => String(value || '').toLowerCase();

  const matchesBaseFilters = (p) => {
    if (!checkUserInvolvement(p)) return false;

    const termo = busca.toLowerCase();
        const matchBusca = normalizeText(p.titulo).includes(termo) || normalizeText(p.clientes?.marca).includes(termo) || normalizeText(p.clientes?.sigla).includes(termo) || normalizeText(p.codigo_projeto).includes(termo);
    if (!matchBusca) return false;

    const isInactive = p.estado === 'concluido' || p.estado === 'cancelado';
    if (!mostrarConcluidos && isInactive) return false;

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
    if (!dateString) return <span style={{fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 'bold'}}>Sem prazo</span>;
    const deadline = new Date(dateString); deadline.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    let color = '#64748b'; let bg = '#f1f5f9'; let text = `⏳ ${new Date(dateString).toLocaleDateString('pt-PT')}`;
    let icon = <Icons.Calendar />;

    if (estado === 'concluido') { color = '#94a3b8'; bg = 'transparent'; text = `Concluído`; icon = <span style={{fontSize:'0.65rem'}}>✔️</span>; } 
    else if (diffDays < 0) { color = '#ef4444'; bg = '#fee2e2'; text = `Atrasado (${Math.abs(diffDays)}d)`; icon = <span style={{fontSize:'0.65rem'}}>🔴</span>; } 
    else if (diffDays === 0) { color = '#d97706'; bg = '#fef3c7'; text = `Termina Hoje!`; icon = <span style={{fontSize:'0.65rem'}}>⚠️</span>; } 
    else if (diffDays <= 5) { color = '#ea580c'; bg = '#ffedd5'; text = `Em ${diffDays} dias`; icon = <span style={{fontSize:'0.65rem'}}>⏳</span>; }

    return <span style={{background: bg, color: color, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>{icon} {text}</span>;
  };

  const projectColors = ['var(--color-btnPrimary)', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', 'var(--color-primary)', '#6366f1'];
  const getColorForCategory = (id) => {
      if (!id) return '#94a3b8'; 
      const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return projectColors[hash % projectColors.length];
  };

  const getEstadoInfo = (estado) => estadosProjeto.find(e => e.id === estado) || { id: estado || 'pendente', nome: (estado || 'pendente').replace('_', ' '), color: '#64748b' };

 const isSearchActive = busca.trim().length > 0;
  
  // A lista abre-se se estivermos a pesquisar OR se clicarmos no 1º nível de qualquer aba
  const isProjectListOpen = isSearchActive || 
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

  // --- NOVA LÓGICA DE AGRUPAMENTO ---
  const groupedProjects = {};
  if (isProjectListOpen) {
      if (isSearchActive) {
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
  }

    const selectedPrograma = getProgramaById(form.programa_id);
    const selectedAviso = getAvisoById(form.avisos_ids) || getAvisoForPrograma(selectedPrograma);
  const fasesProjeto = normalizeProjetoFases(form.prazos_fases);
  const fasesEfetivas = fasesProjeto.length > 0 ? fasesProjeto : normalizeProjetoFases(selectedAviso?.fases);

  const handleProgramaChange = async (programaId) => {
    if (!programaId) {
        setForm(prev => ({
            ...prev,
            programa_id: "",
            programa: "",
            aviso_id: aviso?.id || "",
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

  const renderViewModeToggle = () => (
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
  );

  const renderProjectCard = (p) => {
      const isCompleted = p.estado === 'concluido';
      const isTimerActive = activeLog?.projeto_id === p.id;
      const catColor = getColorForCategory(p.tipo_projeto_id);
      const clientInfo = getProjetoClientDisplay(p);
      const clientIcon = p.cliente_texto ? <Icons.FileText size={14} /> : (clientInfo.isParceria ? <Icons.Handshake size={14} /> : <Icons.Building size={14} />);

      return (
          <div key={p.id} onClick={() => navigate(`/dashboard/projetos/${p.id}`)} className="project-card hover-shadow" style={{ background: 'white', borderRadius: '16px', border: isTimerActive ? '2px solid var(--color-btnPrimary)' : '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'pointer', transition: 'all 0.2s', opacity: isCompleted ? 0.6 : 1, position: 'relative', overflow: 'hidden' }}>
              <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: isCompleted ? '#cbd5e1' : catColor}}></div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '5px'}}>
                      {/* Código do Projeto */}
                      {p.codigo_projeto && <span style={{fontSize: '0.65rem', background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', border: '1px solid var(--color-borderColor)', fontFamily: 'monospace'}}>{p.codigo_projeto}</span>}
                      
                      {/* NOVO: Número do Projeto */}
                      {p.numero_projeto && <span style={{fontSize: '0.65rem', background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', border: '1px solid #cbd5e1', fontFamily: 'monospace'}}>Nº {p.numero_projeto}</span>}
                      
                      {/* Estado */}
                      <span style={{fontSize: '0.65rem', background: isCompleted ? '#f1f5f9' : '#f8fafc', color: isCompleted ? '#64748b' : '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', border: '1px solid #e2e8f0', textTransform: 'uppercase'}}>{(p.estado || '').replace('_', ' ')}</span>
                  </div>
                  {!isCompleted && (
                      <button onClick={(e) => isTimerActive ? handleStopLog(e) : handleStartProjeto(e, p)} style={{ background: isTimerActive ? '#fee2e2' : 'var(--color-bgSecondary)', color: isTimerActive ? '#ef4444' : 'var(--color-btnPrimary)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }} title={isTimerActive ? "Parar Timer" : "Iniciar Timer"} className={!isTimerActive ? "hover-blue-btn hover-shadow" : "hover-shadow"}>
                          {isTimerActive ? <Icons.Stop /> : <Icons.Play />}
                      </button>
                  )}
              </div>
              <div>
                  <h2 style={{margin: '0 0 8px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', lineHeight: '1.2'}}>{p.titulo}</h2>
                  <div style={{fontSize: '0.85rem', color: clientInfo.isParceria ? '#8b5cf6' : '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {clientIcon} {clientInfo.text}
                  </div>
              </div>
              <div style={{background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9'}}>
                  <div style={{fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px'}}>Responsável Global</div>
                  <div style={{fontSize: '0.85rem', color: '#334155', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      <Icons.User /> {p.profiles?.nome || '-'}
                  </div>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9'}}>
                  {renderDeadline(p.data_fim, p.estado)}
                  <div style={{display: 'flex', gap: '6px'}}>
                      <button onClick={(e) => handleEdit(e, p)} style={actionBtnStyle} className="hover-orange-text" title="Editar Projeto"><Icons.Edit /></button>
                  </div>
              </div>
          </div>
      );
  };

  const renderProjectRow = (p) => {
      const isCompleted = p.estado === 'concluido';
      const isTimerActive = activeLog?.projeto_id === p.id;
      const catColor = getColorForCategory(p.tipo_projeto_id);
      const clientInfo = getProjetoClientDisplay(p);
      const estadoLabel = (p.estado || '').replace('_', ' ');

      return (
          <tr key={p.id} className={isCompleted ? 'project-list-row row-inactive' : 'project-list-row'} onClick={() => navigate(`/dashboard/projetos/${p.id}`)} style={{boxShadow: `inset 4px 0 0 ${isCompleted ? '#94a3b8' : catColor}`, cursor: 'pointer', background: isTimerActive ? 'var(--color-bgSecondary)' : 'white'}}>
              <td>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      <span style={{fontWeight: '800', color: '#0f172a'}}>{p.titulo || 'Sem título'}</span>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                          {/* Código do Projeto */}
                          {p.codigo_projeto && <span style={{fontSize: '0.7rem', background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', border: '1px solid var(--color-borderColor)', borderRadius: '6px', padding: '2px 8px', fontFamily: 'monospace', fontWeight: '700'}}>{p.codigo_projeto}</span>}
                          
                          {/* NOVO: Número do Projeto na Lista */}
                          {p.numero_projeto && <span style={{fontSize: '0.7rem', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', fontFamily: 'monospace', fontWeight: '700'}}>Nº {p.numero_projeto}</span>}

                          {isTimerActive && <span style={{fontSize: '0.68rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '999px', padding: '2px 8px', fontWeight: '800'}}>TIMER ATIVO</span>}
                      </div>
                  </div>
              </td>
              <td style={{maxWidth: '220px'}}><span style={{display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', color: clientInfo.isParceria ? '#7c3aed' : '#475569', fontWeight: '600'}}>{clientInfo.text}</span></td>
              <td>{p.profiles?.nome || '-'}</td>
              <td style={{whiteSpace: 'nowrap'}}>{renderDeadline(p.data_fim, p.estado)}</td>
              <td><span style={{fontSize: '0.7rem', padding: '3px 8px', borderRadius: '999px', fontWeight: '800', textTransform: 'uppercase', background: isCompleted ? '#f1f5f9' : '#eef2ff', color: isCompleted ? '#64748b' : '#3730a3', whiteSpace: 'nowrap'}}>{estadoLabel}</span></td>
              <td>
                  <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px'}}>
                      {!isCompleted && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); if (isTimerActive) handleStopLog(e); else handleStartProjeto(e, p); }} style={{ background: isTimerActive ? '#fee2e2' : 'var(--color-bgSecondary)', color: isTimerActive ? '#ef4444' : 'var(--color-btnPrimary)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }} className="hover-shadow" title={isTimerActive ? "Parar Timer" : "Iniciar Timer"}>
                              {isTimerActive ? <Icons.Stop /> : <Icons.Play />}
                          </button>
                      )}
                      <button type="button" onClick={(e) => handleEdit(e, p)} style={actionBtnStyle} className="hover-orange-text" title="Editar Projeto"><Icons.Edit /></button>
                  </div>
              </td>
          </tr>
      );
  };

  const renderMenuItems = (items, emptyTitle, emptyText) => {
      const visibleItems = items.filter(item => item.count > 0 || busca || mostrarConcluidos);

      if (visibleItems.length === 0) {
          return (
              <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                  <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox /></div>
                  <h3 style={{color: '#1e293b', margin: '0 0 5px 0'}}>{emptyTitle}</h3>
                  <p style={{color: '#64748b', margin: 0}}>{emptyText}</p>
              </div>
          );
      }

      if (viewMode === "list") {
          return (
              <div className="table-responsive" style={{borderRadius: '14px'}}>
                  <table className="data-table project-list-table" style={{minWidth: '720px'}}>
                      <thead>
                          <tr>
                              <th>Menu</th>
                              <th>Total</th>
                              <th style={{textAlign: 'right'}}>Abrir</th>
                          </tr>
                      </thead>
                      <tbody>
                          {visibleItems.map(item => (
                              <tr key={item.id} className="project-list-row" onClick={item.onClick} style={{cursor: 'pointer', background: 'white', boxShadow: `inset 4px 0 0 ${item.color}`}}>
                                  <td>
                                      <span style={{fontWeight: '800', color: '#0f172a'}}>{item.nome}</span>
                                  </td>
                                  <td>
                                      <span style={{background: `${item.color}20`, color: item.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem'}}>{item.count}</span>
                                  </td>
                                  <td style={{textAlign: 'right', color: '#94a3b8', fontWeight: '700'}}>
                                      Abrir <Icons.ArrowRight />
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          );
      }

      return (
          <div className="category-grid">
              {visibleItems.map(item => (
                  <div
                      key={item.id}
                      onClick={item.onClick}
                      className="category-card"
                      style={{ borderTop: `5px solid ${item.color}` }}
                  >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>{item.nome}</h3>
                          <span style={{background: `${item.color}20`, color: item.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem'}}>{item.count}</span>
                      </div>
                      <p style={{margin: '15px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}>{item.actionLabel || 'Abrir portfolio'} <Icons.ArrowRight /></p>
                  </div>
              ))}
          </div>
      );
  };

  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };
  const actionBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: '0.2s' };

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

  async function fetchNifRecord(nif) {
      const nifSanitizado = sanitizeNif(nif);
      if (nifSanitizado.length !== 9) return null;

      const params = new URLSearchParams({ json: "1", q: nifSanitizado });
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
      if (apiErrorMessage) throw new Error(apiErrorMessage);

      if (data?.credits?.left?.day === 0) {
          throw new Error("limite diário de consultas atingido");
      }

      return data?.records?.[nifSanitizado] || data?.[nifSanitizado] || null;
  }

  const openQuickOrganismoModal = () => {
      const organismoAtual = form.organismo_id ? clientes.find(c => String(c.id) === String(form.organismo_id)) : null;
      setQuickOrganismoModal({
          show: true,
          marca: organismoAtual?.marca || "",
          sigla: organismoAtual?.sigla || "",
          nif: organismoAtual?.nif || "",
          entidade: organismoAtual?.entidade || "",
          website: organismoAtual?.website || "",
          isSubmitting: false
      });
  };

  const closeQuickOrganismoModal = () => {
      setQuickOrganismoModal({ show: false, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });
  };

  const createQuickOrganismo = async (e) => {
      e.preventDefault();
      if (quickOrganismoModal.isSubmitting) return;

      const marca = quickOrganismoModal.marca.trim();
      const nif = String(quickOrganismoModal.nif || "").replace(/\D/g, "").slice(0, 9);
      if (!marca) {
          showToast("Indica o nome do organismo.", "warning");
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
                  setClientes(prev => {
                      const restantes = prev.filter(c => String(c.id) !== String(existente.id));
                      return [{ ...existente }, ...restantes];
                  });
                  setForm(prev => ({
                      ...prev,
                      has_organismo: true,
                      organismo_id: existente.id,
                      organismo_contacto_id: ""
                  }));
                  setQuickOrganismoModal({ show: false, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });
                  showToast("Organismo já existia e foi selecionado.", "success");
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
              eh_organismo: true,
              eh_empresa_consultora: false,
              plano: "Standard",
              tem_cursos: false
          };

          const { data, error } = await supabase.from("clientes").insert([payload]).select("id, marca, sigla, nif, entidade, website, eh_organismo").single();
          if (error) throw error;

          setClientes(prev => [{ ...data }, ...prev]);
          setForm(prev => ({
              ...prev,
              has_organismo: true,
              organismo_id: data.id,
              organismo_contacto_id: ""
          }));
          setQuickOrganismoModal({ show: false, marca: "", sigla: "", nif: "", entidade: "", website: "", isSubmitting: false });
          showToast("Organismo criado e selecionado no projeto.", "success");
      } catch (err) {
          setQuickOrganismoModal(prev => ({ ...prev, isSubmitting: false }));
          showToast(`Erro ao criar organismo: ${err.message}`, "error");
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
              setClientes(prev => {
                  const restantes = prev.filter(c => String(c.id) !== String(clienteExistente.data.id));
                  return [{ ...clienteExistente.data }, ...restantes];
              });
              setForm(prev => ({
                  ...prev,
                  has_organismo: true,
                  organismo_id: clienteExistente.data.id,
                  organismo_contacto_id: ""
              }));
              showToast("Organismo já existe e foi selecionado.", "success");
              closeQuickOrganismoModal();
              return;
          }
      } catch {
          // Se a verificação local falhar, continuamos com a consulta pública.
      }

      try {
          showToast("A consultar dados no NIF.pt...", "info");
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
          actionLabel: selectedEstado ? 'Escolher tipo' : 'Abrir portfolio',
          onClick: () => setSelectedCategoria(t.id)
      })),
      ...(countsPerCategory['sem-categoria'] > 0 ? [{
          id: 'sem-categoria',
          nome: 'Projetos Avulsos',
          count: countsPerCategory['sem-categoria'] || 0,
          color: '#94a3b8',
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
          color: '#94a3b8',
          actionLabel: 'Ver projetos avulsos',
          onClick: () => setSelectedProgramaNav('sem-programa')
      }] : [])
  ];

  const currentMenuTitle = isSearchActive 
      ? "Resultados da Pesquisa"
      : isProjectListOpen
          ? [selectedCategoriaNome, selectedEstadoNome].filter(Boolean).join(' - ')
          : selectedCategoria
              ? `Estados de ${selectedCategoriaNome}`
              : selectedEstado
                  ? `Tipos em ${selectedEstadoNome}`
                  : (menuPrincipal === 'tipo' ? 'Tipos de Projeto' : menuPrincipal === 'estado' ? 'Estados de Projeto' : 'Programas de Financiamento');

  const currentMenuSubtitle = isSearchActive
      ? `${projetosFiltrados.length} projeto${projetosFiltrados.length === 1 ? '' : 's'} encontrado${projetosFiltrados.length === 1 ? '' : 's'} na pesquisa.`
      : isProjectListOpen
          ? `${projetosFiltrados.length} projeto${projetosFiltrados.length === 1 ? '' : 's'} encontrado${projetosFiltrados.length === 1 ? '' : 's'}.`
          : selectedCategoria
              ? 'Escolhe agora o estado para filtrar estes projetos.'
              : selectedEstado
                  ? 'Escolhe agora o tipo de projeto dentro deste estado.'
                  : 'Escolhe por onde queres começar a navegar.';

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'var(--color-btnPrimary)'}}></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1400px', margin: '0 auto', padding: '15px'}}>
      
      <div style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '15px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <div style={{background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Folder size={24} /></div>
            <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Portfólio</h1>
            
            <div style={{display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0'}}>
                <button 
                    onClick={() => setShowOnlyMine(true)} 
                    style={{padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: showOnlyMine ? 'white' : 'transparent', color: showOnlyMine ? 'var(--color-btnPrimary)' : '#64748b', boxShadow: showOnlyMine ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display:'flex', alignItems:'center', gap:'6px'}}
                >
                    <Icons.User /> Os Meus
                </button>
                <button 
                    onClick={() => setShowOnlyMine(false)} 
                    style={{padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: !showOnlyMine ? 'white' : 'transparent', color: !showOnlyMine ? 'var(--color-btnPrimary)' : '#64748b', boxShadow: !showOnlyMine ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display:'flex', alignItems:'center', gap:'6px'}}
                >
                    <Icons.Globe /> Empresa
                </button>
            </div>
        </div>

        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            {activeLog && (
                <div onClick={() => navigate(activeLogRoute || '/dashboard/projetos')} className="hover-shadow" title="Ir para o item com cronómetro em curso" style={{background: 'linear-gradient(to right, #ef4444, #b91c1c)', color: 'white', padding: '10px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '15px', border: '2px solid #fecaca', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)', transition: '0.2s', whiteSpace: 'nowrap', cursor: 'pointer'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.95rem'}}>
                    <span className="pulse-dot-white"></span>
                    {(activeLogTitle || 'Projeto em curso').length > 30 ? `${(activeLogTitle || 'Projeto em curso').slice(0, 30)}...` : (activeLogTitle || 'Projeto em curso')}
                </div>
                <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)'}}></div>
                <button onClick={(e) => handleStopLog(e)} style={{background: 'white', color:'#ef4444', border:'none', borderRadius:'20px', padding:'6px 12px', cursor:'pointer', fontWeight:'700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s'}}><Icons.Stop /> Parar</button>
                </div>
            )}
            <button className="btn-primary hover-shadow" onClick={handleNovo} style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:'bold'}}><Icons.Plus /> Novo Projeto</button>
        </div>
      </div>

      <div style={{background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
        <div style={{display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '4px', border: '1px solid #cbd5e1'}}>
            <button
                type="button"
                onClick={() => switchMenuPrincipal("tipo")}
                style={{padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: menuPrincipal === "tipo" ? 'white' : 'transparent', color: menuPrincipal === "tipo" ? 'var(--color-btnPrimary)' : '#64748b', boxShadow: menuPrincipal === "tipo" ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}
            >
                Tipos
            </button>
            <button
                type="button"
                onClick={() => switchMenuPrincipal("estado")}
                style={{padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: menuPrincipal === "estado" ? 'white' : 'transparent', color: menuPrincipal === "estado" ? 'var(--color-btnPrimary)' : '#64748b', boxShadow: menuPrincipal === "estado" ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}
            >
                Estados
            </button>

            <button
                type="button"
                onClick={() => switchMenuPrincipal("programa")}
                style={{padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: menuPrincipal === "programa" ? 'white' : 'transparent', color: menuPrincipal === "programa" ? 'var(--color-btnPrimary)' : '#64748b', boxShadow: menuPrincipal === "programa" ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}
            >
                Programas
            </button>

        </div>
        <div style={{flex: 1, position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '0.85rem'}}><Icons.Search /></span>
            <input type="text" placeholder="Procurar projeto, código ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={{width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box'}} className="input-focus" />
        </div>
        <label style={{display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'0.85rem', color: '#475569', fontWeight: 'bold'}}>
          <input type="checkbox" checked={mostrarConcluidos} onChange={e => setMostrarConcluidos(e.target.checked)} style={{width:'16px', height:'16px', accentColor: '#10b981'}} /> Mostrar Arquivados
        </label>
        {renderViewModeToggle()}
      </div>

      {/* 1. SE NÃO ESTIVER ABERTO: RENDERIZAR OS MENUS (PASTAS) */}
      {!isProjectListOpen && (
          <div className="fade-in" style={{marginTop: '20px'}}>
              {(() => {
                  if (menuPrincipal === 'tipo') return renderMenuItems(tipoMenuItems, 'Sem Tipos', 'Não existem tipos de projeto disponíveis.');
                  if (menuPrincipal === 'estado') return renderMenuItems(estadoMenuItems, 'Sem Estados', 'Não existem estados disponíveis.');
                  if (menuPrincipal === 'programa') return renderMenuItems(programaMenuItems, 'Sem Programas', 'Não existem programas de financiamento ativos.');
              })()}
          </div>
      )}

      {/* 2. SE ESTIVER ABERTO: RENDERIZAR OS PROJETOS AGRUPADOS */}
      {isProjectListOpen && (
          <div className="fade-in">
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', marginBottom: '30px', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px', flexWrap: 'wrap'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                      <button 
                          onClick={handleVoltarProjetos}
                          style={{background: 'white', border: '1px solid #cbd5e1', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s'}}
                          className="hover-shadow"
                      >
                          <Icons.ArrowLeft /> Voltar
                      </button>
                      <div>
                          <h2 style={{margin: 0, fontSize: '1.4rem', color: '#1e293b', fontWeight: '800'}}>{currentMenuTitle}</h2>
                          <p style={{margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem', fontWeight: '600'}}>{currentMenuSubtitle}</p>
                      </div>
                  </div>
              </div>

              {Object.keys(groupedProjects).length > 0 ? (
                  Object.entries(groupedProjects).map(([groupName, projs]) => (
                      <div key={groupName} style={{marginBottom: '45px'}}>
                          
                          {/* --- SEPARADOR DO GRUPO --- */}
                          <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
                              <span style={{fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                  {groupName} 
                                  <span style={{background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem'}}>{projs.length}</span>
                              </span>
                              <div style={{flex: 1, height: '2px', background: '#e2e8f0', borderRadius: '2px'}}></div>
                          </div>

                          {/* --- LISTAGEM DE PROJETOS DO GRUPO --- */}
                          {viewMode === "cards" ? (
                              <div className="project-grid">
                                  {projs.map(p => renderProjectCard(p))}
                              </div>
                          ) : (
                              <div className="table-responsive" style={{borderRadius: '14px'}}>
                                  <table className="data-table project-list-table" style={{minWidth: '1050px'}}>
                                      <thead>
                                          <tr>
                                              <th>Projeto</th>
                                              <th>Cliente / Entidade</th>
                                              <th>Responsável</th>
                                              <th>Prazo</th>
                                              <th>Estado</th>
                                              <th style={{textAlign: 'right'}}>Ações</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {projs.map(p => renderProjectRow(p))}
                                      </tbody>
                                  </table>
                              </div>
                          )}
                      </div>
                  ))
              ) : (
                  <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Inbox /></div>
                      <h3 style={{color: '#1e293b', margin: '0 0 5px 0'}}>Vazio por aqui.</h3>
                      <p style={{color: '#64748b', margin: 0}}>Não há projetos ativos a corresponder aos critérios.</p>
                  </div>
              )}
          </div>
      )}

      {/* 💡 MODAL DE CONFIRMAÇÃO GLOBAL */}
      {confirmDialog.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.Alert color={confirmDialog.isDanger ? "#ef4444" : "var(--color-btnPrimary)"} /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Confirmação</h3>
                      <p style={{color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5', whiteSpace: 'pre-line'}}>
                          {confirmDialog.message}
                      </p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setConfirmDialog({show: false})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                          <button onClick={() => { confirmDialog.onConfirm(); }} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: confirmDialog.isDanger ? '#ef4444' : 'var(--color-btnPrimary)', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">{confirmDialog.confirmText}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* 💡 MODAL DE AVISO (SUBSTITUTO DO ALERT) */}
      {alertDialog.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.Alert color="var(--color-btnPrimary)" /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>{alertDialog.title || 'Aviso'}</h3>
                      <p style={{color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5', whiteSpace: 'pre-line'}}>
                          {alertDialog.message}
                      </p>
                      <div style={{display: 'flex', justifyContent: 'center'}}>
                          <button onClick={() => setAlertDialog({show: false, message: '', title: ''})} style={{width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--color-btnPrimary)', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">OK</button>
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
                              <p style={{margin:'6px 0 0 0', color:'#475569', fontSize:'0.9rem'}}>Escolhe uma atividade e, se precisares, uma tarefa específica.</p>
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
                                  <p style={{margin:0, color:'#64748b'}}>Cria atividades no detalhe do projeto para iniciar por item.</p>
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
                              onClick={handleStartFromProjectSelection}
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

{/* --- MODAL CRIAR/EDITAR PROJETO (WIZARD 5 PASSOS) --- */}
      {showModal && (
        <ModalPortal>
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={() => setShowModal(false)}>
            <div style={{background:'#fff', width:'95%', maxWidth:'1000px', minHeight: '650px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'92vh', animation: 'fadeIn 0.2s ease-out'}} onClick={e => e.stopPropagation()}>
              
              {/* --- CABEÇALHO --- */}
              <div style={{padding:'20px 25px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{background:'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', padding:'10px', borderRadius:'10px', display: 'flex'}}><Icons.Rocket size={24} /></span>
                    <h3 style={{margin:0, color:'#1e293b', fontSize:'1.25rem', fontWeight: '800'}}>{isViewOnly ? "Ver Projeto" : (editId ? "Editar Projeto" : "Novo Projeto")}</h3>
                </div>
                <button onClick={() => setShowModal(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center'}} className="hover-red-text"><Icons.Close size={20} /></button>
              </div>

              {/* --- STEPPER VISUAL --- */}
              <div style={{padding: '20px 30px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
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
              <div style={{padding:'30px', overflowY:'auto', background:'white', flex: 1}} className="custom-scrollbar">
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
                                    <div style={{...sectionTitleStyle, marginTop: 0}}><Icons.Building /> Enquadramento Base</div>
                                    
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                                      <div>
                                          <label style={labelStyle}>Tipo de Projeto (Modelo) *</label>
                                          <select value={form.tipo_projeto_id || ''} onChange={e => setForm({...form, tipo_projeto_id: e.target.value})} style={{...inputStyle, cursor: 'pointer', borderColor: 'var(--color-btnPrimary)', background: 'var(--color-bgSecondary)'}} disabled={!!editId} className="input-focus" required>
                                              <option value="">-- Selecione o Modelo --</option>
                                              {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <label style={labelStyle}>Responsável Global *</label>
                                          <select 
                                              value={form.responsavel_id || ''} 
                                              onChange={e => {
                                                  const newResp = e.target.value;
                                                  setForm(prev => ({
                                                      ...prev, 
                                                      responsavel_id: newResp,
                                                      colaboradores: prev.colaboradores.filter(id => id !== newResp) 
                                                  }));
                                              }} 
                                              style={{...inputStyle, cursor: 'pointer'}} 
                                              className="input-focus"
                                              required
                                          >
                                              <option value="">-- Selecione o Responsável --</option>
                                              {staff
                                                  .filter(s => s.ativo !== false || String(s.id) === String(form.responsavel_id))
                                                  .map(s => <option key={s.id} value={s.id}>{s.nome || s.email}{s.ativo === false ? ' (Inativo)' : ''}</option>)}
                                          </select>
                                      </div>
                                    </div>

                                    <div style={{marginBottom: '30px'}}>
                                        <label style={labelStyle}>Título do Projeto *</label>
                                        <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required style={{...inputStyle, fontSize:'1.1rem', padding:'12px', fontWeight: 'bold'}} className="input-focus" />
                                    </div>

                                    <div style={sectionTitleStyle}><Icons.Users /> Entidade(s) do Projeto</div>
                                    
                                    <div style={{display: 'grid', gridTemplateColumns: form.is_parceria ? '1fr 1fr' : '1fr 1fr', gap: '15px', marginBottom: form.is_parceria ? '10px' : '20px'}}>
                                        <div>
                                            <label style={labelStyle}>Tipologia</label>
                                            <select value={form.is_parceria ? 'parceria' : 'unico'} onChange={e => {
                                                const isParc = e.target.value === 'parceria';
                                                setForm({...form, is_parceria: isParc, parceiros_ids: isParc ? form.parceiros_ids : []});
                                            }} style={{...inputStyle, cursor: 'pointer'}} className="input-focus">
                                                <option value="unico">👤 Individual (Apenas Cliente Lider)</option>
                                                <option value="parceria">🤝 Parceria (Vários Clientes/Entidades)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Entidade Lider *</label>
                                            <select
                                                value={form.cliente_id || ''}
                                                onChange={e => {
                                                    const selectedId = e.target.value;
                                                    setForm(prev => ({
                                                        ...prev,
                                                        cliente_id: selectedId,
                                                        parceiros_ids: (prev.parceiros_ids || []).filter(pid => String(pid) !== String(selectedId))
                                                    }));
                                                    setParceiroSelecionado("");
                                                }}
                                                required
                                                style={{...inputStyle, cursor: 'pointer'}}
                                                className="input-focus"
                                            >
                                                <option value="">-- Selecione o Cliente --</option>
                                                {clientes.map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {form.is_parceria && (
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                                            <div>
                                                <label style={labelStyle}>Entidades Parceiras</label>
                                                <select
                                                    value={parceiroSelecionado}
                                                    onChange={e => {
                                                        const selected = e.target.value;
                                                        setParceiroSelecionado(selected);
                                                        if (!selected) return;
                                                        setForm(prev => {
                                                            if (String(selected) === String(prev.cliente_id)) return prev;
                                                            if ((prev.parceiros_ids || []).includes(selected)) return prev;
                                                            return { ...prev, parceiros_ids: [...(prev.parceiros_ids || []), selected] };
                                                        });
                                                        setParceiroSelecionado("");
                                                    }}
                                                    style={{...inputStyle, cursor: 'pointer'}}
                                                    className="input-focus"
                                                >
                                                    <option value="">-- Adicionar entidade parceira --</option>
                                                    {clientes
                                                        .filter(c => String(c.id) !== String(form.cliente_id || ''))
                                                        .filter(c => !(form.parceiros_ids || []).includes(c.id))
                                                        .map(c => <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>)}
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label style={labelStyle}>Entidades Selecionadas</label>
                                                <div className="pill-container" style={{width: '100%', boxSizing: 'border-box'}}>
                                                    {(form.parceiros_ids || []).length === 0 && <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem parceiros selecionados.</span>}
                                                    {(form.parceiros_ids || []).map(pid => {
                                                        const parceiro = clientes.find(c => String(c.id) === String(pid));
                                                        if (!parceiro) return null;
                                                        return (
                                                            <div
                                                                key={pid}
                                                                onClick={() => !isViewOnly && handleToggleParceiro(pid)}
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
                                            <div style={{...sectionTitleStyle, marginTop: 0}}><Icons.Building /> Entidade Financiadora</div>
                                            
                                            <div style={{display: 'grid', gridTemplateColumns: form.has_organismo ? '1fr 1fr' : '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                                                <div>
                                                    <label style={labelStyle}>Envolve Entidade Financiadora?</label>
                                                    <select
                                                        value={form.has_organismo ? 'sim' : 'nao'}
                                                        onChange={e => {
                                                            const hasOrg = e.target.value === 'sim';
                                                            setForm({...form, has_organismo: hasOrg, organismo_id: hasOrg ? form.organismo_id : "", organismo_contacto_id: hasOrg ? form.organismo_contacto_id : ""});
                                                        }}
                                                        style={{...inputStyle, cursor: 'pointer'}}
                                                        className="input-focus"
                                                        disabled={isViewOnly}
                                                    >
                                                        <option value="nao">Não</option>
                                                        <option value="sim">Sim</option>
                                                    </select>
                                                </div>

                                                {form.has_organismo && (
                                                    <div>
                                                        <label style={labelStyle}>Organismo Lider / Principal *</label>
                                                        <select
                                                            value={form.organismo_id || ""}
                                                            onChange={e => setForm({...form, organismo_id: e.target.value, organismo_contacto_id: ""})}
                                                            style={{...inputStyle, cursor: 'pointer', borderColor: 'var(--color-btnPrimary)', background: 'var(--color-bgSecondary)'}}
                                                            className="input-focus"
                                                            disabled={isViewOnly}
                                                            required={form.has_organismo}
                                                        >
                                                            <option value="">-- Selecione o Organismo --</option>
                                                            {clientes.filter(c => c.eh_organismo).map(c => (
                                                                <option key={c.id} value={c.id}>{getClientDisplayName(c) || c.marca}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={openQuickOrganismoModal}
                                                            disabled={isViewOnly}
                                                            style={{marginTop: '8px', border: '1px dashed #cbd5e1', background: 'white', color: 'var(--color-btnPrimary)', padding: '8px 12px', borderRadius: '8px', cursor: isViewOnly ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.85rem'}}
                                                        >
                                                            + Criar organismo sem sair daqui
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {form.has_organismo && form.organismo_id && (
                                                <div style={{marginBottom: '30px', maxWidth: '50%', paddingRight: '7.5px'}}>
                                                    <label style={labelStyle}>Pessoa do Organismo</label>
                                                    <select
                                                        value={form.organismo_contacto_id || ""}
                                                        onChange={e => setForm({...form, organismo_contacto_id: e.target.value})}
                                                        style={{...inputStyle, cursor: 'pointer'}}
                                                        className="input-focus"
                                                        disabled={isViewOnly}
                                                    >
                                                        <option value="">-- Sem pessoa definida --</option>
                                                        {organismoPessoas.map(p => {
                                                            const nome = p.nome_contacto || p.email || "Contacto";
                                                            const cargo = p.cargo ? ` (${p.cargo})` : "";
                                                            return <option key={p.id} value={p.id}>{`${nome}${cargo}`}</option>;
                                                        })}
                                                    </select>
                                                    {organismoPessoas.length === 0 && (
                                                        <div style={{marginTop: '6px', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic'}}>Este organismo ainda não tem contactos registados.</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div style={{...sectionTitleStyle, marginTop: isProjetoFormacao ? 0 : 30}}><Icons.Users /> Equipa Envolvida no Projeto</div>
                                    <div style={{marginBottom: '10px'}}>
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                                            <div>
                                                <div style={{fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px'}}>Colaboradores Internos</div>
                                                <div className="pill-container" style={{minHeight: '60px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0'}}>
                                                    {staff
                                                        .filter(s => String(s.id) !== String(form.responsavel_id || ''))
                                                        .filter(s => s.ativo !== false || (form.colaboradores || []).includes(s.id))
                                                        .map(s => {
                                                            const isSelected = (form.colaboradores || []).map(id => String(id)).includes(String(s.id));
                                                            return (
                                                                <div 
                                                                    key={`colab-int-${s.id}`}
                                                                    onClick={() => !isViewOnly && handleToggleColaborador(s.id)}
                                                                    className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                                >
                                                                    {s.nome || s.email}{s.ativo === false ? ' (Inativo)' : ''}
                                                                </div>
                                                            )
                                                        })}
                                                    {staff.filter(s => String(s.id) !== String(form.responsavel_id || '')).length === 0 && (
                                                        <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem pessoas internas disponíveis.</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px'}}>Contactos das Entidades</div>
                                                <div className="pill-container" style={{minHeight: '60px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0'}}>
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
                                                                    onClick={() => !isViewOnly && handleToggleColaborador(s.id)}
                                                                    className={`pill-checkbox ${isSelected ? 'selected' : ''}`}
                                                                >
                                                                    {`${base}${cargo}${marca}`}
                                                                </div>
                                                            )
                                                        })}
                                                    {entidadePessoas.filter(s => String(s.id) !== String(form.responsavel_id || '')).length === 0 && (
                                                        <span style={{color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Sem contactos das entidades selecionadas.</span>
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
                                    <div style={{...sectionTitleStyle, marginTop: 0}}><Icons.Calendar /> Planeamento & Enquadramento</div>
                                    
                                    {!isProjetoFormacao && (
                                        <>
                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px'}}>
                                                <div>   
                                                    <label style={labelStyle}>Programa</label>
                                                    <select
                                                        value={form.programa_id || ''}
                                                        onChange={(e) => handleProgramaChange(e.target.value)}
                                                        style={{...inputStyle, cursor: 'pointer'}}
                                                        className="input-focus"
                                                    >
                                                        <option value="">-- Sem programa associado --</option>
                                                        {programas.filter((programa) => programa.ativo !== false).map((programa) => (
                                                            <option key={programa.id} value={programa.id}>
                                                                {`${programa.codigo ? `${programa.codigo} - ` : ''}${programa.nome || 'Programa'}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {(() => {
                                                    const avisosDoPrograma = selectedPrograma ? getAvisosForPrograma(selectedPrograma) : [];
                                                    
                                                    return (
                                                        <div>
                                                            <label style={labelStyle}>Aviso</label>
                                                            <select
                                                                value={form.avisos_ids || ''}
                                                                onChange={(e) => {
                                                                    const avId = e.target.value;
                                                                    const av = getAvisoById(avId);
                                                                    setForm({
                                                                        ...form, 
                                                                        avisos_ids: avId, 
                                                                        aviso: av?.codigo || "", 
                                                                    });
                                                                }}
                                                                style={{
                                                                    ...inputStyle, 
                                                                    background: avisosDoPrograma.length ? '#fff' : '#f8fafc', 
                                                                    cursor: avisosDoPrograma.length ? 'pointer' : 'not-allowed'
                                                                }}
                                                                className="input-focus"
                                                                disabled={isViewOnly || avisosDoPrograma.length === 0}
                                                            >
                                                                <option value="">{avisosDoPrograma.length > 0 ? "-- Escolhe o Aviso --" : "Sem avisos associados"}</option>
                                                                {avisosDoPrograma.map(av => (
                                                                    <option key={av.id} value={av.id}>{av.codigo}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                                                <div>
                                                    <label style={labelStyle}>Código de Projeto</label>
                                                    <input type="text" value={form.codigo_projeto} onChange={e => setForm({...form, codigo_projeto: e.target.value})} placeholder="Ex: ALGARVE-FEDER-03107000" style={inputStyle} className="input-focus" />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Número do Projeto</label>
                                                    <input type="text" value={form.numero_projeto || ""} onChange={e => setForm({...form, numero_projeto: e.target.value})} placeholder="Ex: 12345" style={inputStyle} className="input-focus" />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                                        <div>
                                            <label style={labelStyle}>Data Início Base</label>
                                            <input type="date" value={form.data_inicio || ''} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} className="input-focus" required />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Data Fim</label>
                                            <input
                                                type="date"
                                                value={form.data_fim || ''}
                                                onChange={e => setForm({...form, data_fim: e.target.value})}
                                                style={{...inputStyle, border: form.data_fim ? '1px solid #fca5a5' : '1px solid #cbd5e1'}}
                                                className="input-focus"
                                            />
                                        </div>
                                    </div>

                                    {!isProjetoFormacao && (
                                        <div style={{marginBottom: '10px', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc'}}>
                                            <div style={{marginBottom: '10px'}}>
                                                <div style={{fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Fases do Projeto</div>
                                                <div style={{fontSize: '0.85rem', color: '#64748b'}}>
                                                    As fases são importadas automaticamente a partir do Aviso selecionado. Seleciona qual delas define a <strong>Data Limite</strong> do projeto.
                                                </div>
                                            </div>

                                            {/* Lista unificada com seleto de Data Limite */}
                                            <div style={{display: 'grid', gap: '12px'}}>
                                                {fasesEfetivas && fasesEfetivas.length > 0 ? (
                                                    fasesEfetivas.map((fase, index) => {
                                                        const isSelected = String(fase?.prazo || '') === String(form.data_fim || '');
                                                        
                                                        return (
                                                            <div key={`fase-${fase.nome}-${index}`} style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '10px', background: isSelected ? 'var(--color-bgSecondary)' : 'white', border: `1px solid ${isSelected ? 'var(--color-btnPrimary)' : '#e2e8f0'}`, transition: 'all 0.2s'}}>
                                                                
                                                                {/* Controlo de Seleção (Radio) */}
                                                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minWidth: '60px'}}>
                                                                    <input
                                                                        type="radio"
                                                                        name="fase_limite_projeto"
                                                                        checked={isSelected}
                                                                        disabled={isViewOnly}
                                                                        onChange={() => {
                                                                            if (!isViewOnly) {
                                                                                setForm((prev) => ({
                                                                                    ...prev,
                                                                                    data_fim: fase.prazo || ''
                                                                                }));
                                                                            }
                                                                        }}
                                                                        style={{accentColor: 'var(--color-btnPrimary)', width: '20px', height: '20px', cursor: isViewOnly ? 'default' : 'pointer'}}
                                                                        title="Definir como Data Limite do Projeto"
                                                                    />
                                                                    <span style={{fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: isSelected ? 'var(--color-btnPrimary)' : '#94a3b8'}}> </span>
                                                                </div>

                                                                {/* Inputs de Descrição da Fase */}
                                                                <div style={{display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px', flex: 1, alignItems: 'end'}}>
                                                                    <div>
                                                                        <label style={labelStyle}>Nome da fase</label>
                                                                        <input
                                                                            type="text"
                                                                            value={fase.nome || ''}
                                                                            readOnly
                                                                            style={{...inputStyle, background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', borderColor: isSelected ? '#bfdbfe' : '#cbd5e1'}}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label style={labelStyle}>Data de término</label>
                                                                        <input
                                                                            type="date"
                                                                            value={fase.prazo || ''}
                                                                            readOnly
                                                                            style={{...inputStyle, cursor: 'not-allowed', background: '#f1f5f9', borderColor: isSelected ? '#bfdbfe' : '#cbd5e1'}}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div style={{padding: '20px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '0.9rem', fontStyle: 'italic'}}>
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
                                    <div style={{...sectionTitleStyle, marginTop: 0}}><Icons.ListTree /> Pré-visualização de Atividades</div>
                                    
                                    {!editId && templateTree.length > 0 ? (
                                        <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '10px'}}>
                                            <p style={{fontSize: '0.85rem', color: '#64748b', margin: '0 0 15px 0'}}>
                                                Abaixo está a estrutura gerada pelo modelo selecionado. Podes desmarcar itens que não se aplicam a este projeto específico.
                                            </p>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {templateTree.map(ativ => {
                                                    const isSelected = templateSelection[`a_${ativ.id}`];
                                                    return (
                                                        <div key={`a_${ativ.id}`} style={{ background: 'white', borderRadius: '10px', border: `1px solid ${isSelected ? 'var(--color-borderColor)' : '#e2e8f0'}`, overflow: 'hidden', transition: 'all 0.2s', boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.05)' : 'none' }}>
                                                            
                                                            <div 
                                                                onClick={() => toggleTemplateSelection('a', ativ.id)}
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
                                                                                    <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid #f1f5f9', marginLeft: '7px' }}>
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
                                        <div style={{padding: '30px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
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
                                            <div style={{...sectionTitleStyle, marginTop: 0}}><Icons.Dollar /> Valores de Investimento</div>
                                            
                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background:'#f8fafc', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom: '30px'}}>
                                                <div>
                                                    <label style={labelStyle}>Investimento Elegível (€)</label>
                                                    <input 
                                                        type="text" 
                                                        value={form.investimento || form.investimento === 0 ? new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(form.investimento) : ''} 
                                                        onChange={e => {
                                                            const apenasNumeros = e.target.value.replace(/\D/g, "");
                                                            const valorReal = apenasNumeros ? Number(apenasNumeros) / 100 : 0;
                                                            setForm({...form, investimento: valorReal});
                                                        }} 
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize:'1.2rem', background: 'white', textAlign: 'right' }} 
                                                    />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Incentivo Atribuído (€)</label>
                                                    <input 
                                                        type="text" 
                                                        value={form.incentivo || form.incentivo === 0 ? new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(form.incentivo) : ''} 
                                                        onChange={e => {
                                                            const apenasNumeros = e.target.value.replace(/\D/g, "");
                                                            const valorReal = apenasNumeros ? Number(apenasNumeros) / 100 : 0;
                                                            setForm({...form, incentivo: valorReal});
                                                        }} 
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize:'1.2rem', background: 'white', textAlign: 'right' }} 
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div style={{...sectionTitleStyle, marginTop: isProjetoFormacao ? 0 : 30}}><Icons.FileText /> Notas Adicionais</div>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px'}}>
                                        <div>
                                            <label style={labelStyle}>Descrição Geral</label>
                                            <textarea rows="6" value={form.descricao || ''} onChange={e => setForm({...form, descricao: e.target.value})} style={{...inputStyle, resize:'none'}} placeholder="Resumo do projeto..." className="input-focus" />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Observações Internas</label>
                                            <textarea rows="6" value={form.observacoes || ''} onChange={e => setForm({...form, observacoes: e.target.value})} style={{...inputStyle, resize:'none', background:'#fffbeb', borderColor:'#fde68a'}} placeholder="Notas importantes..." className="input-focus-alert" />
                                        </div>
                                    </div>

                                    <div style={sectionTitleStyle}><Icons.Check /> Estado do Projeto</div>
                                    <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                                        {[
                                            {val: 'pendente', label: 'Pendente'}, 
                                            {val: 'em_curso', label: 'Em Curso'}, 
                                            {val: 'em_analise', label: 'Em Análise'}, 
                                            {val: 'concluido', label: 'Concluído'}, 
                                            {val: 'cancelado', label: 'Cancelado'}
                                        ].map(st => (
                                            <div key={st.val} onClick={() => !isViewOnly && setForm({...form, estado: st.val})}
                                                style={{
                                                    flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px', cursor: isViewOnly ? 'default' : 'pointer',
                                                    fontSize: '0.8rem', fontWeight: '700',
                                                    background: form.estado === st.val ? 'var(--color-btnPrimary)' : '#f8fafc',
                                                    color: form.estado === st.val ? 'white' : '#64748b',
                                                    border: form.estado === st.val ? '1px solid var(--color-btnPrimary)' : '1px solid #e2e8f0',
                                                    transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
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
                <div style={{padding:'20px 30px', background:'#f8fafc', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                  
                  <div>
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)} 
                      style={{background:'transparent', border:'none', color:'#94a3b8', fontWeight:'600', cursor:'pointer'}} 
                      className="hover-red-text"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div style={{display: 'flex', gap: '15px'}}>
                    {currentStep > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(prev => prev - 1)} 
                        style={{padding:'12px 24px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', color:'#475569', fontWeight:'700', cursor:'pointer', transition: '0.2s', display: 'flex', alignItems: 'center'}} 
                        className="hover-shadow"
                      >
                        <Icons.ArrowLeft size={16} style={{marginRight: '8px'}}/> Anterior
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
                          setCurrentStep(prev => prev + 1);
                        }} 
                        className="btn-primary hover-shadow" 
                        style={{padding:'12px 24px', borderRadius:'10px', border:'none', background:'var(--color-btnPrimary)', color:'white', fontWeight:'700', cursor:'pointer', transition: '0.2s', display: 'flex', alignItems: 'center'}}
                      >
                        Seguinte <Icons.ArrowRight size={16} style={{marginLeft: '8px'}}/>
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => document.getElementById('project-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                        disabled={isSubmitting} 
                        className="btn-primary hover-shadow" 
                        style={{padding:'12px 30px', borderRadius:'10px', border:'none', background:'var(--color-btnPrimary)', color:'white', fontWeight:'700', cursor:'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s'}}
                      >
                        {isSubmitting ? "A guardar..." : (editId ? <><Icons.Save /> Guardar Alterações</> : <><Icons.Rocket /> Concluir e Criar</>)}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}
      
      <style>{`
          .fade-in { animation: fadeIn 0.4s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          .category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
          .category-card {
              background: white; padding: 25px; border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;
              cursor: pointer; transition: all 0.2s ease;
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
              transition: all 0.2s ease;
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
              font-weight: bold; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;
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
