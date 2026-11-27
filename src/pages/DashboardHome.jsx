// =====================================================================
// Início (/dashboard): página inicial de cada colaborador.
// Widgets: hero (data/hora, frase do dia, sino de notificações, foco/timer ativo),
//   números (horas do mês, projetos ativos, entidades, publicações do fórum),
//   "continuar onde paraste", as minhas tarefas (Hoje / Próximas / Em análise),
//   ponto (WidgetAssiduidade), equipa online (com medalhas) e aniversários.
// Notificações (notificacoes_projetos, não lidas, tipos project_created,
//   mk_aprovacao, mk_aprovado, mk_alteracoes, seguranca).
// Atualiza ao focar a janela, a cada 90 s e com os eventos globais
//   "task-logs-updated" e "project-notifications-updated".
// Documentação: docs/modulos/comunicacao-e-dashboard.md
// =====================================================================
import { Link, useNavigate } from "react-router-dom";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext"; 
import WidgetAssiduidade from "../components/WidgetAssiduidade";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { frasesMotivacionais } from "../data/frases"; 
import { concludeActivityWithChildren } from "../utils/activityStatusCascade";
import { buildDependencyMaps, getActivityBlockReason, getTaskBlockReason } from "../utils/dependencyGuards";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
import "./../styles/dashboard.css";
import "./../styles/home.css";
import SlidingTabs from "../components/SlidingTabs";
import ProfilePeek from "../components/ProfilePeek";
import { juntarPrivado } from "../utils/dadosPrivados";
import { useMedalhasEquipa } from "../components/medalhas/useMedalhas";
import NotificationsPanel from "../components/NotificationsPanel";
import AprovacaoModal from "../components/marketing/AprovacaoModal";
import { TIPOS_NOTIF_MK } from "../components/marketing/mkAprovacao";
import { gerarLembretesLeads } from "../components/crm/crm";
import { clicavel } from "../utils/clicavel";
import Janela from "../components/Janela";
import { lerCache, guardarCache } from "../utils/cachePaginas";
import { ListaSkeleton } from "../components/Skeleton";

import AvisoToast from "../components/AvisoToast";
// --- MEGA ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Home: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Clock: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  User: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Sun: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  LogOut: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  Rocket: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  Clipboard: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>,
  Check: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>,
  Users: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Message: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  Calendar: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  ChevronLeft: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
  ChevronRight: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
  Edit: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  AlertTriangle: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Gift: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>,
  Activity: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Flame: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>,
  Heart: ({ size = 16, color = "currentColor", fill = "none" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  CheckCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
  XCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
  Stop: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  Play: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  ArrowRight: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  Phone: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.74a16 16 0 0 0 6 6l1.27-.93a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  Mail: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>,
  Cake: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2 1 2 1"></path><path d="M2 21h20"></path><path d="M7 8v3"></path><path d="M12 8v3"></path><path d="M17 8v3"></path><path d="M7 4h.01"></path><path d="M12 4h.01"></path><path d="M17 4h.01"></path></svg>,
  CircleDot: ({ size = 10, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><circle cx="12" cy="12" r="12"></circle></svg>,
  IdCard: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><line x1="7" y1="15" x2="17" y2="15"></line><line x1="7" y1="11" x2="11" y2="11"></line><line x1="7" y1="7" x2="11" y2="7"></line></svg>
};

// --- Helpers visuais do novo dashboard ---
const TASKS_PER_TAB = 6;

const getDeadlineTone = (dateString) => {
  if (!dateString) return 'none';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'none';
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'late';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'later';
};

// Número que "conta" até ao valor final
function CountUp({ value, duration = 900 }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    if (from === target) return;
    const total = reduce ? 0 : duration;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = total === 0 ? 1 : Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>{display}</>;
}

// Cronómetro em tempo real do timer ativo
function ElapsedTimer({ startTime }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const start = startTime ? new Date(startTime).getTime() : NaN;
  if (isNaN(start)) return <span className="hx-elapsed">--:--</span>;
  const total = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return <span className="hx-elapsed">{h > 0 ? `${h}:` : ''}{pad(m)}:{pad(sec)}</span>;
}

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

// Stale-while-revalidate: o Início abre logo com os últimos dados (utils/cachePaginas.js)
const cacheInicio = () => lerCache("inicio") || {};
const guardarInicio = (parte) => guardarCache("inicio", { ...cacheInicio(), ...parte });

export default function DashboardHome() {
    const { user } = useAuth(); 
    const navigate = useNavigate();
  
    const [tarefasHoje, setTarefasHoje] = useState(() => cacheInicio().tarefasHoje || []);
    const [tarefasGerais, setTarefasGerais] = useState(() => cacheInicio().tarefasGerais || []);
    const [tarefasEmAnalise, setTarefasEmAnalise] = useState(() => cacheInicio().tarefasEmAnalise || []);
    // Primeira visita (sem cache): esqueleto na lista de tarefas até chegarem os dados
    const [tarefasCarregadas, setTarefasCarregadas] = useState(() => !!cacheInicio().tarefasHoje);
    const [stats, setStats] = useState(() => cacheInicio().stats || { projetos: 0, clientes: 0, forum: 0 });
    const [userProfile, setUserProfile] = useState(null);
    const [usersOnline, setUsersOnline] = useState([]);
    const [selectedOnlineUser, setSelectedOnlineUser] = useState(null);
    const [aniversarios, setAniversarios] = useState(() => cacheInicio().aniversarios || []);
    const proximosAniversarios = aniversarios.slice(0, 3);

    const [activeLog, setActiveLog] = useState(null);

    const [frase, setFrase] = useState("");
    const [horaAtual, setHoraAtual] = useState("");
    const [showBirthdayPopup, setShowBirthdayPopup] = useState(false); 
    const [ccWarning, setCcWarning] = useState({ show: false, type: '', users: [] }); // Estado para o modal do CC

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyDate, setHistoryDate] = useState(new Date()); 
    const [fullHistory, setFullHistory] = useState([]);
    const [totalHorasMes, setTotalHorasMes] = useState({ h: 0, m: 0 });
  
    const [editingRecord, setEditingRecord] = useState(null); 
    const [editForm, setEditForm] = useState({}); 
    const [isAdding, setIsAdding] = useState(false);
    const [addForm, setAddForm] = useState({ data: "", hora_entrada: "", hora_saida: "", tempo_pausa: 0, observacoes: "", motivo_alteracao: "" });

    const [recentWorkLogs, setRecentWorkLogs] = useState(() => cacheInicio().recentWorkLogs || []);
    const [alertModal, setAlertModal] = useState({ show: false, message: "" });
    const [notification, setNotification] = useState(null);
    const [projectNotifications, setProjectNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [aprovacaoConteudoId, setAprovacaoConteudoId] = useState(null);
    const [showBellDropdown, setShowBellDropdown] = useState(false);
    const [homeTab, setHomeTab] = useState('hoje');
    const [horasMesAtual, setHorasMesAtual] = useState(() => cacheInicio().horasMesAtual || { h: 0, m: 0 });
    const closeProfilePeek = useCallback(() => setSelectedOnlineUser(null), []);
    // Medalha mais recente de cada pessoa online (aparece no canto da foto)
    const medalhasOnline = useMedalhasEquipa(usersOnline.map((u) => u.user_id));
    const closeBellPanel = useCallback(() => setShowBellDropdown(false), []);
    const bellDropdownRef = useRef(null);
    
    const [timerSwitchModal, setTimerSwitchModal] = useState({
            show: false,
            message: "",
            pendingTask: null
    });
    const [attendanceWarningModal, setAttendanceWarningModal] = useState({
        show: false,
        message: ""
    });
    const [stopNoteModal, setStopNoteModal] = useState({ show: false });
    const onlineCardRef = useRef(null);
    const attendancePendingActionRef = useRef(null);

    function showToast(message, type = "success") {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    }

    /**
     * Carrega até 20 notificações não lidas do utilizador. Pedidos de aprovação de
     * marketing já decididos (conteúdo fora de "aprovacao") são marcados como lidos.
     */
    async function loadProjectNotifications() {
        if (!user?.id) return;

        setNotificationsLoading(true);
        try {
            const { data, error } = await supabase
                .from("notificacoes_projetos")
                .select("id, project_id, conteudo_id, titulo, mensagem, link, tipo, is_read, created_at, conteudo:marketing_conteudos(estado)")
                .eq("user_id", user.id)
                .eq("is_read", false)
                .in("tipo", ["project_created", ...TIPOS_NOTIF_MK, "seguranca", "crm_lembrete", "crm_atribuida", "crm_reuniao", "absence_status_changed"])
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            const rows = Array.isArray(data) ? data : [];
            // Pedidos de aprovação já decididos por outra pessoa deixam de fazer sentido
            const fechados = rows.filter((n) => n.tipo === "mk_aprovacao" && n.conteudo?.estado !== "aprovacao");
            if (fechados.length) {
                supabase
                    .from("notificacoes_projetos")
                    .update({ is_read: true, read_at: new Date().toISOString() })
                    .in("id", fechados.map((n) => n.id))
                    .eq("user_id", user.id)
                    .then(({ error: e }) => { if (e) console.error("Erro ao fechar pedidos de aprovação:", e); });
            }
            setProjectNotifications(rows.filter((n) => !fechados.includes(n)));
        } catch (error) {
            console.error("Erro ao carregar notificações de projeto:", error);
        } finally {
            setNotificationsLoading(false);
        }
    }

    async function markProjectNotificationAsRead(notificationId) {
        if (!notificationId || !user?.id) return;

        // Optimistic update: sai logo da lista; se a gravação falhar, volta
        let removida = null;
        setProjectNotifications((current) => {
            removida = current.find((n) => n.id === notificationId) || null;
            return current.filter((notificationItem) => notificationItem.id !== notificationId);
        });

        const { error } = await supabase
            .from("notificacoes_projetos")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", notificationId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Erro ao marcar notificação como lida:", error);
            if (removida) {
                setProjectNotifications((current) => (current.some((n) => n.id === notificationId)
                    ? current
                    : [...current, removida].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))));
            }
        }
    }

    /**
     * Abrir uma notificação: mk_aprovacao abre o modal de aprovação (só fecha com decisão);
     * as restantes ficam lidas e navegam para o conteúdo, o projeto ou o `link`.
     */
    async function openProjectNotification(notificationItem) {
        if (!notificationItem) return;
        // Pedido de aprovação: abre o modal; a notificação fecha quando houver decisão
        if (notificationItem.tipo === "mk_aprovacao" && notificationItem.conteudo_id) {
            setAprovacaoConteudoId(notificationItem.conteudo_id);
            return;
        }
        await markProjectNotificationAsRead(notificationItem.id);
        if (notificationItem.conteudo_id) {
            navigate(`/dashboard/marketing?conteudo=${notificationItem.conteudo_id}`);
            return;
        }
        if (notificationItem.project_id) {
            navigate(`/dashboard/projetos/${notificationItem.project_id}`);
            return;
        }
        if (notificationItem.link) {
            navigate(notificationItem.link.replace(window.location.origin, ""));
        }
    }

  useEffect(() => {
    if (user) {
      refreshDashboardWorkItems();
      fetchStats();
      fetchUserProfile();
      loadProjectNotifications();
      // CRM: próximas ações das leads que chegaram hoje → sino (1x por dia)
      gerarLembretesLeads(user.id).then((n) => { if (n) loadProjectNotifications(); }).catch(() => {});
      loadUsersOnline();
      fetchAniversarios(); 
      checkActiveLog(); 

      const handleVisibilityRefresh = () => {
          if (document.visibilityState === 'visible') refreshDashboardWorkItems();
          if (document.visibilityState === 'visible') loadProjectNotifications();
      };

      const handleWindowFocus = () => {
          refreshDashboardWorkItems();
          loadProjectNotifications();
      };

      const handleTaskLogsUpdated = () => {
          refreshDashboardWorkItems();
      };

      const handleProjectNotificationsUpdated = () => {
          loadProjectNotifications();
      };
      
      const hoje = new Date();
      const seed = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
      const indice = seed % frasesMotivacionais.length;
      setFrase(frasesMotivacionais[indice]);

      const relogioInterval = setInterval(() => {
        const agora = new Date();
        setHoraAtual(agora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit'}));
      }, 1000);

      const onlineInterval = setInterval(loadUsersOnline, 60000);
      const workRefreshInterval = setInterval(refreshDashboardWorkItems, 90000);

      window.addEventListener('focus', handleWindowFocus);
      document.addEventListener('visibilitychange', handleVisibilityRefresh);
      window.addEventListener('task-logs-updated', handleTaskLogsUpdated);
      window.addEventListener('project-notifications-updated', handleProjectNotificationsUpdated);

      return () => {
          clearInterval(relogioInterval);
          clearInterval(onlineInterval);
          clearInterval(workRefreshInterval);
          window.removeEventListener('focus', handleWindowFocus);
          document.removeEventListener('visibilitychange', handleVisibilityRefresh);
          window.removeEventListener('task-logs-updated', handleTaskLogsUpdated);
          window.removeEventListener('project-notifications-updated', handleProjectNotificationsUpdated);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- arranque/subscrições só devem reiniciar quando muda o utilizador
  }, [user]);

    async function refreshDashboardWorkItems() {
        if (!user?.id) return;
        await Promise.all([
            fetchTarefasPessoais().finally(() => setTarefasCarregadas(true)),
            fetchTarefasEmAnalise(),
            fetchRecentWorkLogs(),
            checkActiveLog(),
            loadProjectNotifications()
        ]);
    }

  useEffect(() => {
      if (showHistoryModal && user) loadFullHistory();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- loadFullHistory é recriada a cada render; as dependências reais já estão listadas
  }, [historyDate, showHistoryModal, user]);

  const getSafeFirstName = (nome, email) => {
      try {
          if (nome && typeof nome === 'string') return nome.trim().split(' ')[0];
          if (email && typeof email === 'string') return email.trim().split('@')[0];
          return "Colaborador";
      } catch { return "Colaborador"; }
  };

  const getInitials = (name) => {
      try {
          if (!name || typeof name !== 'string') return "?";
          const cleanName = name.trim();
          if (!cleanName) return "?";
          const parts = cleanName.split(" ");
          if (parts.length > 1) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
          return cleanName.substring(0, 2).toUpperCase();
      } catch { return "?"; }
  };

  const getClientDisplayName = (client) => {
      if (!client) return "";
      return client.sigla?.trim() || client.marca || "";
  };

  /** Esconde tarefas/atividades bloqueadas por dependências ainda não concluídas. */
  async function filterBlockedItemsByDependencies(tarefas = [], atividades = []) {
      const projectIds = Array.from(
          new Set(
              [...tarefas, ...atividades]
                  .map((item) => {
                      if (item?.projeto_id) {
                          return item.projeto_id;
                      }

                      if (item?.isActivity) {
                          const proj = Array.isArray(item.projetos) ? item.projetos[0] : item.projetos;
                          return item.projectId || proj?.id || null;
                      }

                      const ativ = Array.isArray(item?.atividades) ? item.atividades[0] : item?.atividades;
                      const proj = ativ ? (Array.isArray(ativ.projetos) ? ativ.projetos[0] : ativ.projetos) : null;
                      return item.projectId || proj?.id || null;
                  })
                  .filter(Boolean)
          )
      );

      if (projectIds.length === 0) {
          return { tarefasFiltradas: tarefas, atividadesFiltradas: atividades };
      }

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

      const atividadesFiltradas = (atividades || []).filter((atividade) => !getActivityBlockReason(atividade, activityById));
      const tarefasFiltradas = (tarefas || []).filter((tarefa) => !getTaskBlockReason(tarefa, taskById, activityById));

      return { tarefasFiltradas, atividadesFiltradas };
  }

  async function fetchUserProfile() {
    try {
        const { data: base } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        const data = await juntarPrivado(base);
        setUserProfile(data);
        if (data) checkCCExpirations(data);
    } catch (error) { console.error("Erro perfil:", error); }
  }

  // Lógica para verificar a validade do CC

  /**
   * Aviso de Cartão de Cidadão a expirar (≤30 dias), no máximo 1×/dia (localStorage).
   * Gestores/RH veem a lista da equipa (RPC bizin_cc_a_expirar); os outros, o seu.
   */
  async function checkCCExpirations(profile) {
      // Cria uma string com a data de hoje (ex: "2026-08-03")
      const hojeStr = new Date().toISOString().split('T')[0]; 
      const ultimoAvisoVisto = localStorage.getItem('ccWarningLastSeen');

      // Se já viu o aviso no dia de hoje, não mostra de novo
      if (ultimoAvisoVisto === hojeStr) return;

      // Verifica se o user tem a "Tag" ou "Role" de Gestor
      const isGestor = profile?.tag?.toLowerCase() === 'gestor' || 
                       profile?.tags?.includes('gestor') || 
                       profile?.role === 'gestor' || 
                       profile?.funcao?.toLowerCase().includes('rh');

      if (isGestor) {
          const trintaDias = new Date();
          trintaDias.setDate(trintaDias.getDate() + 30);
          const dataLimite = trintaDias.toISOString().split('T')[0];

          // A validade do CC está na tabela privada: a função só responde aos RH
          let { data, error: ccErr } = await supabase.rpc('bizin_cc_a_expirar', { p_ate: dataLimite });
          if (ccErr) {
              ({ data } = await supabase
                  .from('profiles')
                  .select('id, nome, validade_cc')
                  .not('validade_cc', 'is', null)
                  .lte('validade_cc', dataLimite)
                  .neq('ativo', false));
          }
          
          if (data && data.length > 0) {
              setCcWarning({ show: true, type: 'gestor', users: data });
              // Regista que o gestor já viu o aviso hoje
              localStorage.setItem('ccWarningLastSeen', hojeStr);
          }
      } else {
          if (profile?.validade_cc) {
              const validade = new Date(profile.validade_cc);
              const hoje = new Date();
              const diffTime = validade.getTime() - hoje.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays <= 30) {
                  setCcWarning({ show: true, type: 'user', users: [profile] });
                  // Regista que o colaborador já viu o aviso hoje
                  localStorage.setItem('ccWarningLastSeen', hojeStr);
              }
          }
      }
  }

  async function checkActiveLog() {
      try {
          const { data, error } = await supabase
              .from("task_logs")
              .select("*")
              .eq("user_id", user.id)
              .is("end_time", null)
              .order("start_time", { ascending: false });
          if (error) throw error;

          const activeRows = Array.isArray(data) ? data : [];
          const activeRow = activeRows[0] || null;
          
          if (activeRow) {
              let title = "Tempo a decorrer…";
              let foundProjectId = activeRow.projeto_id;
              let projName = "";
              let brandName = "";
              
              if (activeRow.subtarefa_id) {
                  const { data: res } = await supabase.from("subtarefas").select("titulo, tarefas(atividades(projeto_id, projetos(titulo, clientes!cliente_id(marca, sigla))))").eq("id", activeRow.subtarefa_id).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      const ativ = Array.isArray(res.tarefas?.atividades) ? res.tarefas.atividades[0] : res.tarefas?.atividades;
                      const proj = Array.isArray(ativ?.projetos) ? ativ.projetos[0] : ativ?.projetos;
                      if (proj) {
                          foundProjectId = proj.id || ativ.projeto_id;
                          projName = proj.titulo;
                          brandName = getClientDisplayName(proj.clientes);
                      }
                  }
              } else if (activeRow.task_id || activeRow.tarefa_id) {
                  const taskId = activeRow.task_id || activeRow.tarefa_id;
                  const { data: res } = await supabase.from("tarefas").select("titulo, atividades(projeto_id, projetos(titulo, clientes!cliente_id(marca, sigla)))").eq("id", taskId).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      const ativ = Array.isArray(res.atividades) ? res.atividades[0] : res.atividades;
                      const proj = Array.isArray(ativ?.projetos) ? ativ.projetos[0] : ativ?.projetos;
                      if (proj) {
                          foundProjectId = proj.id || ativ.projeto_id;
                          projName = proj.titulo;
                          brandName = getClientDisplayName(proj.clientes);
                      }
                  }
              } else if (activeRow.atividade_id) {
                  const { data: res } = await supabase.from("atividades").select("titulo, projeto_id, projetos(titulo, clientes!cliente_id(marca, sigla))").eq("id", activeRow.atividade_id).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      const proj = Array.isArray(res.projetos) ? res.projetos[0] : res.projetos;
                      if (proj) {
                          foundProjectId = res.projeto_id;
                          projName = proj.titulo;
                          brandName = getClientDisplayName(proj.clientes);
                      }
                  }
              } else if (activeRow.conteudo_id) {
                  // Peça de Marketing (migração 082)
                  const { data: res } = await supabase.from("marketing_conteudos").select("titulo, marketing_marcas(nome)").eq("id", activeRow.conteudo_id).maybeSingle();
                  title = res?.titulo || "Peça de marketing";
                  const marcaMk = Array.isArray(res?.marketing_marcas) ? res.marketing_marcas[0] : res?.marketing_marcas;
                  projName = "Marketing";
                  brandName = marcaMk?.nome || "";
              } else if (activeRow.projeto_id) {
                  const { data: res } = await supabase.from("projetos").select("titulo, clientes!cliente_id(marca, sigla)").eq("id", activeRow.projeto_id).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      projName = res.titulo;
                      brandName = getClientDisplayName(res.clientes);
                  }
              }
              
              let finalDisplay = title;
              if (projName) {
                  finalDisplay = brandName ? `${brandName} - ${projName} (${title})` : `${projName} (${title})`;
              } else {
                  finalDisplay = `Avulsa (${title})`;
              }

              setActiveLog({ ...activeRow, taskTitle: finalDisplay, resolvedProjectId: foundProjectId });
          } else {
              setActiveLog(null);
          }
      } catch (err) { console.error("Erro a procurar timer ativo:", err); }
  }

  function navigateToActiveTask() {
      if (!activeLog) return;
      if (activeLog.conteudo_id) {
          navigate(`/dashboard/marketing?conteudo=${activeLog.conteudo_id}`);
      } else if (activeLog.resolvedProjectId) {
          navigate(`/dashboard/projetos/${activeLog.resolvedProjectId}`);
      } else {
          navigate("/dashboard/minhas-tarefas");
      }
  }

  const getActiveTaskName = () => {
      if (!activeLog) return "";
      return activeLog.taskTitle || "Tempo a decorrer…";
  };

  async function handleStopGlobalLog(e, stopNote = "") {
      if(e) e.stopPropagation();
      if (!activeLog) return;
      const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000));
      const stopTimestamp = new Date().toISOString();
      const note = typeof stopNote === "string" ? stopNote.trim() : "";
      const payload = { end_time: stopTimestamp, duration_minutes: diffMins };
      if (note) payload.observacoes = note;

      let { error } = await supabase.from("task_logs").update(payload).eq("id", activeLog.id);
      if (error && note) {
          const retry = await supabase
              .from("task_logs")
              .update({ end_time: stopTimestamp, duration_minutes: diffMins })
              .eq("id", activeLog.id);
          error = retry.error;
      }

      if (error) {
          showToast("Erro ao terminar o cronómetro atual.", "error");
          return;
      }

      setActiveLog(null);
      await refreshDashboardWorkItems();
  }

  function openStopNoteModal(e) {
      if (e) e.stopPropagation();
      if (!activeLog) return;
      setStopNoteModal({ show: true });
  }

  function closeStopNoteModal() {
      setStopNoteModal({ show: false });
  }

  function getStopCompleteLabel(logEntry) {
      if (logEntry?.task_id || logEntry?.tarefa_id) return "Marcar tarefa como concluida";
      if (logEntry?.atividade_id) return "Marcar atividade como concluida";
      if (logEntry?.projeto_id) return "Marcar projeto como concluido";
      return "Marcar item como concluido";
  }

  async function completeLogItem(logEntry) {
      if (!logEntry) return;

      const taskId = logEntry.task_id || logEntry.tarefa_id;
      if (taskId) {
          await supabase
              .from("tarefas")
              .update({ estado: "concluido", data_conclusao: new Date().toISOString() })
              .eq("id", taskId);
          return;
      }

      if (logEntry.atividade_id) {
          await concludeActivityWithChildren(supabase, logEntry.atividade_id);
          return;
      }

      if (logEntry.projeto_id) {
          await supabase.from("projetos").update({ estado: "concluido" }).eq("id", logEntry.projeto_id);
      }
  }

  async function hasStartedAttendanceToday() {
      if (!user?.id) return true;

      const today = new Date().toLocaleDateString("en-CA");
      const { data, error } = await supabase
          .from("assiduidade")
          .select("id")
          .eq("user_id", user.id)
          .eq("data_registo", today)
          .limit(1);

      if (error) {
          console.error("Erro ao verificar picagem do dia:", error);
          return true;
      }

      return Array.isArray(data) && data.length > 0;
  }

  async function startAttendanceNow() {
      if (!user?.id) return;

      const now = new Date();
      const horaAtual = now.toLocaleTimeString("pt-PT", { hour12: false });
      const dataAtual = now.toLocaleDateString("en-CA");

      const { error } = await supabase.from("assiduidade").insert([
          {
              user_id: user.id,
              data_registo: dataAtual,
              hora_entrada: horaAtual,
              tempo_pausa_acumulado: 0,
              tarefas_planeadas: JSON.stringify([])
          }
      ]);

      if (error) {
          console.error("Erro ao iniciar picagem:", error);
          setAlertModal({ show: true, message: "Não foi possível iniciar a picagem agora. O cronómetro da tarefa será iniciado na mesma." });
          return;
      }

      setAlertModal({ show: true, message: "Picagem iniciada com sucesso. O cronómetro da tarefa vai avançar." });
      window.dispatchEvent(new Event("attendance-updated"));
  }

  /** Antes de iniciar/concluir trabalho: se ainda não picou o ponto hoje, pergunta se quer picar. */
  async function runActionWithAttendanceWarning(actionFn) {
      const hasStarted = await hasStartedAttendanceToday();
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
          await startAttendanceNow();
      }

      if (pendingAction) {
          await pendingAction();
      }
  }

  async function finalizeStopWithNote(note, shouldComplete, statusMeta = {}) {
      if (!activeLog) return;

      const logToStop = activeLog;
      await handleStopGlobalLog(null, note);
      await applyStopStatusUpdateForLogTarget(supabase, logToStop, statusMeta);
      if (shouldComplete) {
          await completeLogItem(logToStop);
          showToast("Tempo guardado e item concluido.", "success");
          await refreshDashboardWorkItems();
      }
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

  const isTaskCardRunning = (taskCard) => {
      const runningTaskId = activeLog?.task_id || activeLog?.tarefa_id;
      if (taskCard.isActivity) return activeLog?.atividade_id === taskCard.real_id;
      return runningTaskId === taskCard.id;
  };

  async function startTaskFromHomeDirect(taskCard) {
      const payload = {
          user_id: user.id,
          start_time: new Date().toISOString()
      };

      if (taskCard.projectId) payload.projeto_id = taskCard.projectId;
      if (taskCard.isActivity) payload.atividade_id = taskCard.real_id;
      else payload.task_id = taskCard.id;

      const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();
      if (error) return;

      const taskTitle = `${taskCard.projectName || "Sem projeto"} (${taskCard.titulo})`;
      setActiveLog({ ...data, taskTitle, resolvedProjectId: taskCard.projectId || null });

      if (taskCard.estado === 'pendente') {
          const tabela = taskCard.isActivity ? 'atividades' : 'tarefas';
          const targetId = taskCard.isActivity ? taskCard.real_id : taskCard.id;
          await supabase.from(tabela).update({ estado: 'em_curso' }).eq('id', targetId);
      }

      await refreshDashboardWorkItems();
  }

  async function confirmTimerSwitch() {
      const nextTask = timerSwitchModal.pendingTask;
      setTimerSwitchModal({ show: false, message: "", pendingTask: null });

      if (!nextTask) return;
      if (activeLog) await handleStopGlobalLog();
      await runActionWithAttendanceWarning(() => startTaskFromHomeDirect(nextTask));
  }

  function cancelTimerSwitch() {
      setTimerSwitchModal({ show: false, message: "", pendingTask: null });
      showToast("Mantivemos o cronómetro atual em execução.", "info");
  }

  /**
   * Botão play de uma tarefa: se já é a que corre, abre a nota de paragem; se corre
   * outra, pede confirmação para trocar; senão inicia um task_log novo.
   */
  async function handleStartTaskFromHome(taskCard, e) {
      if (e) e.stopPropagation();

      const isSameRunning = isTaskCardRunning(taskCard);
      if (activeLog && isSameRunning) {
          openStopNoteModal();
          return;
      }

      if (activeLog) {
          const novoTipo = taskCard.isActivity ? "atividade" : "tarefa";
          const novoProjeto = taskCard.projectName || "Sem projeto";
          setTimerSwitchModal({
              show: true,
              message: `Deseja terminar ${activeLog.taskTitle || "a atividade em curso"} para iniciar a ${novoTipo} "${taskCard.titulo}" do projeto "${novoProjeto}"?`,
              pendingTask: taskCard
          });
          return;
      }

      await runActionWithAttendanceWarning(() => startTaskFromHomeDirect(taskCard));
  }

  async function fetchAniversarios() {
      const { data, error } = await supabase.from('profiles').select('id, nome, avatar_url, data_nascimento').not('data_nascimento', 'is', null).neq('ativo', false);
      if (data && !error) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0); 
          let myBirthdayIsToday = false;

          const lista = data.map(p => {
              if (!p.data_nascimento) return null;
              const nasc = new Date(p.data_nascimento);
              if (isNaN(nasc.getTime())) return null;

              let proximoAniversario = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
              if (proximoAniversario < hoje) proximoAniversario.setFullYear(hoje.getFullYear() + 1);
              
              if (p.id === user.id && nasc.getMonth() === hoje.getMonth() && nasc.getDate() === hoje.getDate()) {
                  myBirthdayIsToday = true;
              }
              return { ...p, proximoAniversario };
          }).filter(Boolean);

          lista.sort((a, b) => a.proximoAniversario - b.proximoAniversario);
          setAniversarios(lista);
          guardarInicio({ aniversarios: lista });

          if (myBirthdayIsToday && !sessionStorage.getItem('birthdayPopupSeen')) {
              setShowBirthdayPopup(true);
              sessionStorage.setItem('birthdayPopupSeen', 'true');
          }
      }
  }

  /**
   * "Equipa online" = registos de assiduidade de hoje sem hora de saída.
   * Nota: "hoje" é calculado em UTC (toISOString), ao contrário da picagem (data local).
   */
  async function loadUsersOnline() {
    const hoje = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from("assiduidade")
            .select("*, profiles(nome, avatar_url, funcao, empresa_interna, telemovel, email, email_pessoal, data_nascimento)")
            .eq("data_registo", hoje)
            .is("hora_saida", null)
            .order("hora_entrada", { ascending: true }); 
    if (!error && data) setUsersOnline(data);
  }

  async function fetchTarefasPessoais() {
      const [
          { data: tarefasResp },
          { data: tarefasExtra, error: tarefasExtraError },
          { data: atividadesResp },
          { data: atividadesExtra, error: atividadesExtraError },
      ] = await Promise.all([
          supabase
              .from("tarefas")
              .select(`*, atividades ( titulo, data_fim, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes!cliente_id(marca, sigla) ) )`)
              .eq("responsavel_id", user.id)
              .neq("estado", "concluido")
              .neq("estado", "cancelado"),
          supabase
              .from("tarefas")
              .select(`*, atividades ( titulo, data_fim, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes!cliente_id(marca, sigla) ) )`)
              .contains("colaboradores_extra", [user.id])
              .neq("estado", "concluido")
              .neq("estado", "cancelado"),
          supabase
              .from("atividades")
              .select(`*, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes!cliente_id(marca, sigla) )`)
              .eq("responsavel_id", user.id)
              .neq("estado", "concluido")
              .neq("estado", "cancelado"),
          supabase
              .from("atividades")
              .select(`*, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes!cliente_id(marca, sigla) )`)
              .contains("colaboradores_extra", [user.id])
              .neq("estado", "concluido")
              .neq("estado", "cancelado"),
      ]);

      if (tarefasExtraError) console.warn("Filtro por colaboradores_extra (tarefas) indisponível:", tarefasExtraError.message);
      if (atividadesExtraError) console.warn("Filtro por colaboradores_extra (atividades) indisponível:", atividadesExtraError.message);

      const tarefas = [
          ...(tarefasResp || []),
          ...(tarefasExtra || []),
      ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

      const atividades = [
          ...(atividadesResp || []),
          ...(atividadesExtra || []),
      ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

      const { tarefasFiltradas, atividadesFiltradas } = await filterBlockedItemsByDependencies(tarefas, atividades);

      let combinedTasks = [];

      if (tarefasFiltradas) {
          const formattedTasks = tarefasFiltradas.map(t => {
              const ativ = Array.isArray(t.atividades) ? t.atividades[0] : t.atividades;
              const proj = ativ ? (Array.isArray(ativ.projetos) ? ativ.projetos[0] : ativ.projetos) : null;
              
              let clientLabel = "GERAL / AVULSA";
              let projectName = "Tarefa Pessoal";

              if (proj) {
                  let brand = getClientDisplayName(proj.clientes) || proj.cliente_texto;
                  clientLabel = brand ? `${brand} - ${proj.titulo}` : proj.titulo;
                  projectName = proj.titulo;
              } else if (ativ) {
                  clientLabel = "Atividade Sem Projeto";
              }

              return { 
                  ...t, 
                  isActivity: false,
                  parentTitle: ativ?.titulo || 'Sem Atividade',
                  clientLabel: clientLabel,
                  projectName: projectName,
                  projectId: proj?.id || null,
                  computedDeadline: t.data_fim || t.data_limite || ativ?.data_fim 
              };
          });
          combinedTasks = [...combinedTasks, ...formattedTasks];
      }

      if (atividadesFiltradas) {
          const formattedAtivs = atividadesFiltradas.map(a => {
              const proj = Array.isArray(a.projetos) ? a.projetos[0] : a.projetos;
              
              let clientLabel = "GERAL / AVULSA";
              let projectName = "Atividade Pessoal";

              if (proj) {
                  let brand = getClientDisplayName(proj.clientes) || proj.cliente_texto;
                  clientLabel = brand ? `${brand} - ${proj.titulo}` : proj.titulo;
                  projectName = proj.titulo;
              }
              
              return { 
                  id: `ativ_${a.id}`, 
                  real_id: a.id,
                  titulo: a.titulo, 
                  estado: a.estado,
                  isActivity: true,
                  parentTitle: 'Bloco / Atividade',
                  clientLabel: clientLabel,
                  projectName: projectName,
                  projectId: proj?.id || null,
                  computedDeadline: a.data_fim 
              };
          });
          combinedTasks = [...combinedTasks, ...formattedAtivs];
      }

      const hoje = new Date();
      hoje.setHours(0,0,0,0);

      const urgentesHoje = [];
      const outras = [];

      combinedTasks.forEach(t => {
          if (!t.computedDeadline) {
              outras.push(t); 
          } else {
              const deadlineDate = new Date(t.computedDeadline);
              deadlineDate.setHours(0,0,0,0);
              const diffTime = deadlineDate.getTime() - hoje.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays <= 0) urgentesHoje.push(t);
              else outras.push(t);
          }
      });

      const sortFn = (a, b) => {
          if (!a.computedDeadline) return 1;
          if (!b.computedDeadline) return -1;
          return new Date(a.computedDeadline) - new Date(b.computedDeadline);
      };

      urgentesHoje.sort(sortFn);
      outras.sort(sortFn);

      setTarefasHoje(urgentesHoje);
      setTarefasGerais(outras);
      guardarInicio({ tarefasHoje: urgentesHoje, tarefasGerais: outras });
  }

  async function fetchRecentWorkLogs() {
      const { data } = await supabase
          .from("task_logs")
          .select("task_id, atividade_id, start_time")
          .eq("user_id", user.id)
          .not("end_time", "is", null)
          .order("start_time", { ascending: false })
          .limit(40);

      if (data) {
          const seen = new Set();
          const unique = [];
          for (const log of data) {
              const key = log.task_id ? `t_${log.task_id}` : (log.atividade_id ? `a_${log.atividade_id}` : null);
              if (key && !seen.has(key)) {
                  seen.add(key);
                  unique.push({ ...log, last_worked: log.start_time });
                  if (unique.length >= 6) break;
              }
          }
          setRecentWorkLogs(unique);
          guardarInicio({ recentWorkLogs: unique });
      }
  }

  async function fetchTarefasEmAnalise() {
      try {
          const [
              { data: tarefasResp },
              { data: tarefasExtra, error: tarefasExtraError },
              { data: atividadesResp },
              { data: atividadesExtra, error: atividadesExtraError },
          ] = await Promise.all([
              supabase
                  .from("tarefas")
                  .select(`*, atividades ( titulo, data_fim, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes!cliente_id(marca, sigla) ) )`)
                  .eq("responsavel_id", user.id)
                  .neq("estado", "concluido")
                  .neq("estado", "cancelado"),
              supabase
                  .from("tarefas")
                  .select(`*, atividades ( titulo, data_fim, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes!cliente_id(marca, sigla) ) )`)
                  .contains("colaboradores_extra", [user.id])
                  .neq("estado", "concluido")
                  .neq("estado", "cancelado"),
              supabase
                  .from("atividades")
                  .select(`*, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes!cliente_id(marca, sigla) )`)
                  .eq("responsavel_id", user.id)
                  .neq("estado", "concluido")
                  .neq("estado", "cancelado"),
              supabase
                  .from("atividades")
                  .select(`*, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes!cliente_id(marca, sigla) )`)
                  .contains("colaboradores_extra", [user.id])
                  .neq("estado", "concluido")
                  .neq("estado", "cancelado"),
          ]);

          if (tarefasExtraError) console.warn("Filtro por colaboradores_extra (tarefas em análise) indisponível:", tarefasExtraError.message);
          if (atividadesExtraError) console.warn("Filtro por colaboradores_extra (atividades em análise) indisponível:", atividadesExtraError.message);

          const tarefas = [
              ...(tarefasResp || []),
              ...(tarefasExtra || []),
          ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

          const atividades = [
              ...(atividadesResp || []),
              ...(atividadesExtra || []),
          ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

          const { tarefasFiltradas, atividadesFiltradas } = await filterBlockedItemsByDependencies(tarefas, atividades);

          const isEmAnalise = (estado) => {
              if (!estado) return false;
              return String(estado).toLowerCase().replace(/\s+/g, "_") === "em_analise";
          };

          let combinedAnalysis = [];

          if (tarefasFiltradas) {
              const formattedTasks = tarefasFiltradas.map((t) => {
                  const ativ = Array.isArray(t.atividades) ? t.atividades[0] : t.atividades;
                  const proj = ativ ? (Array.isArray(ativ.projetos) ? ativ.projetos[0] : ativ.projetos) : null;

                  let clientLabel = "GERAL / AVULSA";
                  if (proj) {
                      const brand = getClientDisplayName(proj.clientes) || proj.cliente_texto;
                      clientLabel = brand ? `${brand} - ${proj.titulo}` : proj.titulo;
                  } else if (ativ) {
                      clientLabel = "Atividade Sem Projeto";
                  }

                  return {
                      ...t,
                      isActivity: false,
                      parentTitle: ativ?.titulo || "Sem Atividade",
                      clientLabel,
                      computedDeadline: t.data_fim || t.data_limite || ativ?.data_fim,
                  };
              }).filter((t) => isEmAnalise(t.estado));
              combinedAnalysis = [...combinedAnalysis, ...formattedTasks];
          }

          if (atividadesFiltradas) {
              const formattedAtivs = atividadesFiltradas.map((a) => {
                  const proj = Array.isArray(a.projetos) ? a.projetos[0] : a.projetos;

                  let clientLabel = "GERAL / AVULSA";
                  if (proj) {
                      const brand = getClientDisplayName(proj.clientes) || proj.cliente_texto;
                      clientLabel = brand ? `${brand} - ${proj.titulo}` : proj.titulo;
                  }

                  return {
                      id: `ativ_${a.id}`,
                      real_id: a.id,
                      titulo: a.titulo,
                      estado: a.estado,
                      isActivity: true,
                      parentTitle: "Bloco / Atividade",
                      clientLabel,
                      computedDeadline: a.data_fim,
                  };
              }).filter((a) => isEmAnalise(a.estado));
              combinedAnalysis = [...combinedAnalysis, ...formattedAtivs];
          }

          combinedAnalysis.sort((a, b) => {
              if (!a.computedDeadline) return 1;
              if (!b.computedDeadline) return -1;
              return new Date(a.computedDeadline) - new Date(b.computedDeadline);
          });

          setTarefasEmAnalise(combinedAnalysis);
          guardarInicio({ tarefasEmAnalise: combinedAnalysis });
      } catch (err) {
          console.error("Erro ao carregar tarefas em análise:", err);
          setTarefasEmAnalise([]);
      }
  }

  async function fetchStats() {
    const { count: countProjetos } = await supabase.from("projetos").select("*", { count: 'exact', head: true }).neq("estado", "cancelado").neq("estado", "concluido");
    const { count: countClientes } = await supabase.from("clientes").select("*", { count: 'exact', head: true }).eq("ativo", true);
    const { count: countForum } = await supabase.from("forum_posts").select("*", { count: 'exact', head: true });
    
    const novasStats = { projetos: countProjetos || 0, clientes: countClientes || 0, forum: countForum || 0 };
    setStats(novasStats);
    guardarInicio({ stats: novasStats });
  }


  async function loadFullHistory() {
      const y = historyDate.getFullYear();
      const m = historyDate.getMonth();
      const primeiroDia = new Date(y, m, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(y, m + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase.from("assiduidade").select("*").eq("user_id", user.id).gte("data_registo", primeiroDia).lte("data_registo", ultimoDia).order("data_registo", { ascending: false });

      if (!error && data) {
          setFullHistory(data);
          let totalSegundosMes = 0;
          data.forEach(r => { totalSegundosMes += calcularSegundosExatos(r.hora_entrada, r.hora_saida, r.tempo_pausa_acumulado); });
          setTotalHorasMes({ h: Math.floor(totalSegundosMes / 3600), m: Math.floor((totalSegundosMes % 3600) / 60) });
      }
  }

  function handleStartEdit(record) {
      setIsAdding(false);
      setEditingRecord(record.id);
      setEditForm({
          hora_entrada: record.hora_entrada ? record.hora_entrada.slice(0,5) : "",
          hora_saida: record.hora_saida ? record.hora_saida.slice(0,5) : "",
          tempo_pausa: record.tempo_pausa_acumulado ? Math.floor(record.tempo_pausa_acumulado / 60) : 0,
          observacoes: record.observacoes || "",
          motivo_alteracao: record.motivo_alteracao || ""
      });
  }

  async function handleSaveEdit(e, id) {
      e.preventDefault();
      if (!editForm.motivo_alteracao) { 
          setAlertModal({ show: true, message: "O motivo da correção é obrigatório para efeitos de auditoria." });
          return; 
      }

      const hEntradaFinal = editForm.hora_entrada?.length === 5 ? editForm.hora_entrada + ":00" : editForm.hora_entrada;
      let hSaidaFinal = editForm.hora_saida ? (editForm.hora_saida?.length === 5 ? editForm.hora_saida + ":00" : editForm.hora_saida) : null;

      const payload = {
          hora_entrada: hEntradaFinal,
          hora_saida: hSaidaFinal,
          tempo_pausa_acumulado: (parseInt(editForm.tempo_pausa) || 0) * 60,
          observacoes: editForm.observacoes,
          motivo_alteracao: editForm.motivo_alteracao
      };

      const { error } = await supabase.from("assiduidade").update(payload).eq("id", id);
      if (!error) {
          setEditingRecord(null);
          loadFullHistory();
      } else { 
          setAlertModal({ show: true, message: "Erro ao guardar alteração." });
      }
  }

  async function handleSaveNew(e) {
      e.preventDefault();
      if (!addForm.motivo_alteracao) { 
          setAlertModal({ show: true, message: "O motivo é obrigatório!" });
          return; 
      }

      const { data: existe } = await supabase.from("assiduidade").select("id").eq("user_id", user.id).eq("data_registo", addForm.data).maybeSingle();

      if (existe) {
          setAlertModal({ show: true, message: `Já existe um registo criado para o dia ${new Date(addForm.data).toLocaleDateString('pt-PT')}. Por favor, procure-o na lista e clique em 'Editar' para o corrigir.` });
          return;
      }

      const hEntradaFinal = addForm.hora_entrada.length === 5 ? addForm.hora_entrada + ":00" : addForm.hora_entrada;
      const hSaidaFinal = addForm.hora_saida.length === 5 ? addForm.hora_saida + ":00" : addForm.hora_saida;

      const payload = {
          user_id: user.id, data_registo: addForm.data,
          hora_entrada: hEntradaFinal, hora_saida: hSaidaFinal,
          tempo_pausa_acumulado: (parseInt(addForm.tempo_pausa) || 0) * 60,
          observacoes: addForm.observacoes, motivo_alteracao: addForm.motivo_alteracao
      };

      const { error } = await supabase.from("assiduidade").insert([payload]);
      
      if (!error) {
          setIsAdding(false);
          setAddForm({ data: "", hora_entrada: "", hora_saida: "", tempo_pausa: 0, observacoes: "", motivo_alteracao: "" });
          
          const novaDataObj = new Date(addForm.data);
          if (novaDataObj.getMonth() !== historyDate.getMonth() || novaDataObj.getFullYear() !== historyDate.getFullYear()) {
              setHistoryDate(novaDataObj);
          } else {
              loadFullHistory();
          }
      } else {
          setAlertModal({ show: true, message: "Erro ao criar registo: " + error.message });
      }
  }

  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const calcularSegundosExatos = (entrada, saida, pausaSegundos) => {
      if (!entrada || !saida) return 0;
      const dEntrada = new Date(`1970-01-01T${entrada}`);
      const dSaida = new Date(`1970-01-01T${saida}`);
      let diffSegundos = (dSaida - dEntrada) / 1000;
      if (diffSegundos < 0) diffSegundos += 24 * 3600; 
      diffSegundos -= (pausaSegundos || 0); 
      return diffSegundos > 0 ? diffSegundos : 0;
  };

  const formatarHoras = (segundos) => {
      if (segundos === 0) return <span style={{color: 'var(--n-500)', fontStyle: 'italic', fontSize: '0.75rem'}}>Em curso</span>;
      const horas = Math.floor(segundos / 3600);
      const minutos = Math.floor((segundos % 3600) / 60);
      return <span style={{fontWeight: 'bold', color: 'var(--color-btnPrimary)'}}>{horas}h{minutos.toString().padStart(2, '0')}</span>;
  };

  const inputEditStyle = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' };

  const formatLastWorked = (dateStr) => {
      if (!dateStr) return '';
      const now = new Date();
      const d = new Date(dateStr);
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'hoje';
      if (diffDays === 1) return 'ontem';
      return `há ${diffDays} dias`;
  };

  const getTaskCardTargetPath = (taskCard) => {
      if (!taskCard) return '/dashboard/tarefas';
      if (taskCard.projectId) return `/dashboard/projetos/${taskCard.projectId}`;
      if (taskCard.clientLabel === 'GERAL / AVULSA') return '/dashboard/minhas-tarefas';
      return '/dashboard/tarefas';
  };

  const navigateToTaskCard = (taskCard) => {
      const targetPath = getTaskCardTargetPath(taskCard);
      const normalizedFocusId = taskCard?.isActivity
          ? (taskCard?.real_id || taskCard?.id || null)
          : (taskCard?.id || taskCard?.real_id || null);
      const focusState = {
          focusTaskId: normalizedFocusId,
          focusTaskType: taskCard?.isActivity ? 'atividade' : 'tarefa'
      };
      const focusQuery = normalizedFocusId
          ? `?focusTaskId=${encodeURIComponent(String(normalizedFocusId))}&focusTaskType=${encodeURIComponent(focusState.focusTaskType)}`
          : '';

      if (targetPath === '/dashboard/tarefas') {
          navigate(`${targetPath}${focusQuery}`, {
              state: focusState
          });
          return;
      }

      if (targetPath.startsWith('/dashboard/projetos/')) {
          navigate(`${targetPath}${focusQuery}`, { state: focusState });
          return;
      }

      navigate(targetPath);
  };

  const tarefasRecentesCards = (() => {
      if (!recentWorkLogs.length) return [];
      const allTasks = [...tarefasHoje, ...tarefasGerais];
      const result = [];
      const seen = new Set();
      for (const log of recentWorkLogs) {
          const found = allTasks.find(t =>
              (log.task_id && !t.isActivity && String(t.id) === String(log.task_id)) ||
              (log.atividade_id && t.isActivity && String(t.real_id) === String(log.atividade_id))
          );
          if (found && !seen.has(found.id)) {
              seen.add(found.id);
              result.push({ ...found, last_worked: log.last_worked });
          }
      }
      return result;
  })();


  const userFirstName = getSafeFirstName(userProfile?.nome, userProfile?.email);
  const greetingByHour = (() => {
          const currentHour = new Date().getHours();
          if (currentHour >= 7 && currentHour < 13) return "Bom dia";
          if (currentHour >= 13 && currentHour < 20) return "Boa tarde";
          return "Boa noite";
  })();

  const focoDeHoje = activeLog
      ? { label: "A trabalhar agora", detail: getActiveTaskName(), action: "Abrir tarefa", tone: "active" }
      : tarefasHoje.length > 0
          ? { label: `${tarefasHoje.length} prioridade${tarefasHoje.length === 1 ? '' : 's'} para hoje`, detail: "Começa pela tarefa com maior urgência.", action: "Abrir prioridades", tone: "urgent" }
          : { label: "Dia sem urgências", detail: "Podes avançar para uma das próximas tarefas.", action: "Ver tarefas", tone: "clear" };

  // Horas registadas no mês atual (KPI do topo)
  useEffect(() => {
      if (!user?.id) return;
      let cancelled = false;
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      supabase
          .from("assiduidade")
          .select("hora_entrada, hora_saida, tempo_pausa_acumulado")
          .eq("user_id", user.id)
          .gte("data_registo", primeiroDia)
          .then(({ data, error }) => {
              if (cancelled || error || !data) return;
              const total = data.reduce((acc, r) => acc + calcularSegundosExatos(r.hora_entrada, r.hora_saida, r.tempo_pausa_acumulado), 0);
              const horas = { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60) };
              setHorasMesAtual(horas);
              guardarInicio({ horasMesAtual: horas });
          });
      return () => { cancelled = true; };
  }, [user?.id, activeLog?.id]);

  // --- NOVO DASHBOARD: dados derivados para o layout ---
  const dataHojeLabel = (() => {
      const label = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
      return label.charAt(0).toUpperCase() + label.slice(1);
  })();

  const currentTaskList = homeTab === 'hoje'
      ? tarefasHoje
      : homeTab === 'proximas'
          ? tarefasGerais
          : tarefasEmAnalise;

  const emptyTaskMessage = {
      hoje: { title: 'Tudo limpo por agora', detail: 'Não tens tarefas urgentes nem atrasadas.' },
      proximas: { title: 'Sem tarefas pendentes', detail: 'Não tens mais tarefas agendadas.' },
      analise: { title: 'Nada em análise', detail: 'Nenhuma tarefa está à espera de revisão.' },
  }[homeTab];

  const kpis = [
      { id: 'horas', label: 'Horas este mês', value: horasMesAtual.h, suffix: 'h', extra: horasMesAtual.m > 0 ? `${String(horasMesAtual.m).padStart(2, '0')}m` : null, tone: 'amber', Icon: Icons.Clock, onClick: () => setShowHistoryModal(true) },
      { id: 'projetos', label: 'Projetos ativos', value: stats.projetos, tone: 'primary', Icon: Icons.Rocket, onClick: () => navigate("/dashboard/projetos") },
      { id: 'clientes', label: 'Entidades', value: stats.clientes, tone: 'teal', Icon: Icons.Users, onClick: () => navigate("/dashboard/clientes") },
      { id: 'forum', label: 'Publicações', value: stats.forum, tone: 'violet', Icon: Icons.Message, onClick: () => navigate("/dashboard/forum") },
  ];

  const renderDeadlineChip = (dateString) => {
      const tone = getDeadlineTone(dateString);
      if (tone === 'none') return <span className="hx-deadline hx-deadline-none">Sem prazo</span>;
      if (tone === 'late') return <span className="hx-deadline hx-deadline-late"><Icons.AlertTriangle size={11} /> Atrasada</span>;
      if (tone === 'today') return <span className="hx-deadline hx-deadline-today"><Icons.Flame size={11} /> Hoje</span>;
      const d = new Date(dateString);
      return <span className={`hx-deadline hx-deadline-${tone}`}><Icons.Calendar size={11} /> {d.toLocaleDateString('pt-PT').slice(0, 5)}</span>;
  };

  const handleFocusAction = () => {
      if (activeLog) {
          navigateToActiveTask();
          return;
      }

      if (tarefasHoje.length > 0) {
          navigateToTaskCard(tarefasHoje[0]);
          return;
      }

      navigate("/dashboard/tarefas");
  };

  return (
    <div className="hx-home">

      {/* ================= HERO ================= */}
      <header className="hx-hero">
        <span className="hx-hero-bg" aria-hidden="true">
          <span className="hx-hero-orb hx-hero-orb-a" />
          <span className="hx-hero-orb hx-hero-orb-b" />
          <span className="hx-hero-orb hx-hero-orb-c" />
          <span className="hx-hero-grid" />
        </span>

        <div className="hx-hero-body">
          <div className="hx-hero-copy">
            <div className="hx-hero-meta">
              <span className="hx-chip hx-chip-glass">
                <Icons.Calendar size={13} /> {dataHojeLabel}
              </span>
              <span className="hx-chip hx-chip-glass hx-chip-clock">
                <Icons.Clock size={13} /> {horaAtual}
              </span>

              {/* 🔔 NOTIFICAÇÕES DE PROJETOS */}
              <button
                ref={bellDropdownRef}
                type="button"
                className={`hx-chip hx-chip-glass hx-chip-bell ${showBellDropdown ? 'is-open' : ''} ${projectNotifications.length > 0 ? 'has-new' : ''}`}
                onClick={() => setShowBellDropdown(v => !v)}
                title="Notificações de projetos"
                aria-label="Notificações de projetos"
                aria-expanded={showBellDropdown}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {projectNotifications.length > 0 ? (
                  <span>{projectNotifications.length > 9 ? '9+' : projectNotifications.length} {projectNotifications.length === 1 ? 'nova' : 'novas'}</span>
                ) : (
                  <span className="hx-chip-bell-label">Notificações</span>
                )}
              </button>
            </div>

            <h1 className="hx-hero-title">
              {greetingByHour}, <span className="hx-hero-name">{userFirstName}</span>
              <span className="hx-wave" aria-hidden="true">👋</span>
            </h1>
            {frase && <p className="hx-hero-quote">“{frase}”</p>}
          </div>

          {/* FOCO DE HOJE / TIMER ATIVO */}
          {activeLog ? (
            <div className="hx-focus hx-focus-live" {...clicavel(navigateToActiveTask)} title="Clica para ir para a tarefa">
              <div className="hx-focus-head">
                <span className="hx-live-dot" />
                <span className="hx-focus-kicker">A trabalhar agora</span>
              </div>
              <div className="hx-focus-title" title={getActiveTaskName()}>{getActiveTaskName()}</div>
              <div className="hx-focus-foot">
                <ElapsedTimer startTime={activeLog.start_time} />
                <button type="button" className="hx-stop-btn" onClick={openStopNoteModal} title="Parar o tempo">
                  <Icons.Stop size={11} /> Parar
                </button>
              </div>
            </div>
          ) : (
            <div className={`hx-focus hx-focus-${focoDeHoje.tone}`}>
              <div className="hx-focus-head">
                <Icons.Flame size={14} />
                <span className="hx-focus-kicker">Foco de hoje</span>
              </div>
              <div className="hx-focus-title">{focoDeHoje.label}</div>
              <div className="hx-focus-detail">{focoDeHoje.detail}</div>
              <button type="button" className="hx-focus-btn" onClick={handleFocusAction}>
                {focoDeHoje.action} <Icons.ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ================= NÚMEROS ================= */}
      <section className="hx-kpis" aria-label="Resumo">
        {kpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            className={`hx-kpi hx-kpi-${kpi.tone}`}
            onClick={kpi.onClick}
          >
            <span className="hx-kpi-icon"><kpi.Icon size={18} /></span>
            <span className="hx-kpi-body">
              <span className="hx-kpi-value">
            <CountUp value={kpi.value} />
            {kpi.suffix && <span className="hx-kpi-suffix">{kpi.suffix}</span>}
            {kpi.extra && <span className="hx-kpi-extra">{kpi.extra}</span>}
          </span>
              <span className="hx-kpi-label">{kpi.label}</span>
            </span>
            <span className="hx-kpi-arrow"><Icons.ChevronRight size={14} /></span>
          </button>
        ))}
      </section>

      {/* ================= GRID PRINCIPAL ================= */}
      <div className="hx-grid">

        {/* -------- COLUNA DIREITA: TRABALHO -------- */}
        <div className="hx-col hx-col-main">

          {/* 🕐 CONTINUAR ONDE PARASTE */}
          {tarefasRecentesCards.length > 0 && (
            <section className="hx-card hx-resume">
              <div className="hx-card-head">
                <h2 className="hx-card-title">
                  <span className="hx-title-icon tone-violet"><Icons.Clock size={15} /></span>
                  Continuar onde paraste
                </h2>
                <span className="hx-card-sub">Últimas atividades</span>
              </div>

              <div className="hx-resume-rail">
                {tarefasRecentesCards.slice(0, 4).map((t) => {
                  const isRunning = isTaskCardRunning(t);
                  return (
                    <div
                      key={`recent_${t.id}`}
                      className={`hx-resume-item ${isRunning ? 'is-running' : ''}`}
                      {...clicavel(() => navigateToTaskCard(t))}
                    >
                      <div className="hx-resume-top">
                        <span className="hx-resume-client" title={t.clientLabel}>{t.clientLabel}</span>
                        <span className="hx-resume-when">{formatLastWorked(t.last_worked)}</span>
                      </div>
                      <div className="hx-resume-title" title={t.titulo}>{t.titulo}</div>
                      <div className="hx-resume-bottom">
                        <span className="hx-resume-parent" title={t.parentTitle}>{t.parentTitle}</span>
                        <button aria-label={isRunning ? 'Parar temporizador' : 'Retomar temporizador'}
                          type="button"
                          className={`hx-play ${isRunning ? 'is-running' : ''}`}
                          onClick={(e) => handleStartTaskFromHome(t, e)}
                          title={isRunning ? 'Parar temporizador' : 'Retomar temporizador'}
                        >
                          {isRunning ? <Icons.Stop size={11} /> : <Icons.Play size={11} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 📋 AS MINHAS TAREFAS (ABAS DESLIZANTES) */}
          <section className="hx-card hx-tasks">
            <div className="hx-card-head hx-tasks-head">
              <h2 className="hx-card-title">
                <span className="hx-title-icon"><Icons.Check size={15} /></span>
                As minhas tarefas
              </h2>
              <button type="button" className="hx-link-btn" onClick={() => navigate("/dashboard/tarefas")}>
                Ver todas <Icons.ArrowRight size={14} />
              </button>
            </div>

            <SlidingTabs
              className="hx-tabs"
              ariaLabel="Tipo de tarefas"
              value={homeTab}
              onChange={setHomeTab}
              tabs={[
                { id: 'hoje', label: 'Para hoje', count: tarefasHoje.length, tone: tarefasHoje.length > 0 ? 'danger' : undefined, icon: <Icons.Flame size={14} /> },
                { id: 'proximas', label: 'Próximas', count: tarefasGerais.length, icon: <Icons.Clipboard size={14} /> },
                { id: 'analise', label: 'Em análise', count: tarefasEmAnalise.length, tone: tarefasEmAnalise.length > 0 ? 'pink' : undefined, icon: <Icons.Activity size={14} /> },
              ]}
            />

            <div key={homeTab} className="hx-task-list bz-tab-panel">
              {!tarefasCarregadas ? (
                <ListaSkeleton linhas={4} avatar={false} />
              ) : currentTaskList.length === 0 ? (
                <div className="hx-empty">
                  <span className="hx-empty-icon"><Icons.CheckCircle size={28} /></span>
                  <strong>{emptyTaskMessage.title}</strong>
                  <span>{emptyTaskMessage.detail}</span>
                </div>
              ) : (
                <>
                  {currentTaskList.slice(0, TASKS_PER_TAB).map((t, idx) => {
                    const isRunning = isTaskCardRunning(t);
                    const tone = homeTab === 'analise' ? 'review' : getDeadlineTone(t.computedDeadline);
                    return (
                      <div
                        key={t.id}
                        className={`hx-task hx-task-${tone} ${isRunning ? 'is-running' : ''}`}
                        style={{ '--i': idx }}
                        {...clicavel(() => navigateToTaskCard(t))}
                      >
                        <span className="hx-task-bar" aria-hidden="true" />
                        <div className="hx-task-main">
                          <div className="hx-task-title" title={t.titulo}>{t.titulo}</div>
                          <div className="hx-task-meta">
                            <span className={`hx-task-client ${t.clientLabel === 'GERAL / AVULSA' ? 'is-general' : ''}`} title={t.clientLabel}>
                              {t.clientLabel}
                            </span>
                            {t.parentTitle && (
                              <>
                                <span className="hx-dot-sep" />
                                <span className="hx-task-parent" title={t.parentTitle}>{t.parentTitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="hx-task-side">
                          {homeTab === 'analise'
                            ? <span className="hx-deadline hx-deadline-review">Em análise</span>
                            : renderDeadlineChip(t.computedDeadline)}
                          {homeTab !== 'analise' && (
                            <button aria-label={isRunning ? 'Parar temporizador' : 'Iniciar temporizador'}
                              type="button"
                              className={`hx-play ${isRunning ? 'is-running' : ''}`}
                              onClick={(e) => handleStartTaskFromHome(t, e)}
                              title={isRunning ? 'Parar temporizador' : 'Iniciar temporizador'}
                            >
                              {isRunning ? <Icons.Stop size={11} /> : <Icons.Play size={11} />}
                            </button>
                          )}
                          <span className="hx-task-chevron"><Icons.ChevronRight size={15} /></span>
                        </div>
                      </div>
                    );
                  })}
                  {currentTaskList.length > TASKS_PER_TAB && (
                    <button type="button" className="hx-more-btn" onClick={() => navigate("/dashboard/tarefas")}>
                      Ver mais {currentTaskList.length - TASKS_PER_TAB} <Icons.ArrowRight size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* -------- COLUNA ESQUERDA: PONTO & PESSOAS -------- */}
        <aside className="hx-col hx-col-side">

          {/* PONTO / ASSIDUIDADE */}
          <section className="hx-attendance">
            <WidgetAssiduidade onViewHistory={() => setShowHistoryModal(true)} />
          </section>

          {/* ── EQUIPA ONLINE ── */}
          <section ref={onlineCardRef} className="hx-card hx-team">
            <div className="hx-card-head">
              <h2 className="hx-card-title">
                <span className="hx-title-icon tone-green"><Icons.Activity size={15} /></span>
                Equipa online
              </h2>
              <span className="hx-pill-count"><span className="hx-live-dot small" /> {usersOnline.length}</span>
            </div>

            {usersOnline.length > 0 ? (
              <div className="hx-team-grid">
                {usersOnline.map((u, idx) => {
                  const medalhas = medalhasOnline.get(String(u.user_id)) || [];
                  const recente = medalhas[0];
                  return (
                  <button
                    key={u.id}
                    type="button"
                    className="hx-person"
                    style={{ '--i': idx }}
                    onClick={() => setSelectedOnlineUser(u)}
                    title={`${u.profiles?.nome || ''} · entrou às ${u.hora_entrada?.slice(0, 5)}${recente ? ` · 🏅 ${medalhas.map((m) => m.nome).join(", ")}` : ""}`}
                  >
                    <span className="hx-avatar hx-avatar-lg">
                      {u.profiles?.avatar_url
                        ? <img src={u.profiles.avatar_url} alt="" />
                        : getInitials(u.profiles?.nome)}
                      <span className="hx-avatar-status" />
                      {recente && (
                        <span className="mdl-avatar-badge" aria-label={`${medalhas.length} medalha(s)`}>
                          <img src={recente.imagem_url} alt="" />
                          {medalhas.length > 1 && <b>{medalhas.length}</b>}
                        </span>
                      )}
                    </span>
                    <span className="hx-person-name">{getSafeFirstName(u.profiles?.nome, "")}</span>
                    <span className="hx-person-sub">{u.hora_entrada?.slice(0, 5)}</span>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="hx-empty hx-empty-sm">
                <span>Ninguém online de momento.</span>
              </div>
            )}
          </section>

          {/* ── ANIVERSÁRIOS ── */}
          <section className="hx-card hx-birthdays">
            <div className="hx-card-head">
              <h2 className="hx-card-title">
                <span className="hx-title-icon tone-amber"><Icons.Cake size={15} /></span>
                Aniversários
              </h2>
            </div>

            {proximosAniversarios.length > 0 ? (
              <div className="hx-bday-list">
                {proximosAniversarios.map((a) => {
                  const hoje = new Date();
                  const isHoje = a.proximoAniversario.getDate() === hoje.getDate() && a.proximoAniversario.getMonth() === hoje.getMonth();
                  const day = String(a.proximoAniversario.getDate()).padStart(2, '0');
                  const monthShort = a.proximoAniversario.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase();
                  return (
                    <div key={a.id} className={`hx-bday ${isHoje ? 'is-today' : ''}`}>
                      <span className="hx-avatar hx-avatar-md">
                        {a.avatar_url ? <img src={a.avatar_url} alt="" /> : getInitials(a.nome)}
                      </span>
                      <div className="hx-bday-info">
                        <span className="hx-bday-name">{getSafeFirstName(a.nome, "")}</span>
                        <span className="hx-bday-sub">
                          {isHoje ? <><Icons.Gift size={12} /> Faz anos hoje!</> : 'Próximo aniversário'}
                        </span>
                      </div>
                      <div className="hx-date-badge">
                        <span className="hx-date-month">{monthShort}</span>
                        <span className="hx-date-day">{day}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="hx-empty hx-empty-sm">
                <span>Nenhum aniversário próximo.</span>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* MODAL GIGANTE DE HISTÓRICO MENSAL & EDIÇÃO */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <ModalPortal>
            <div className="jn-fundo" style={{zIndex: "calc(var(--z-modal) + 13)"}} onMouseDown={(e) => { if(e.target === e.currentTarget) setShowHistoryModal(false); }}>
                <div className="jn-caixa is-folha" role="dialog" aria-modal="true" aria-label="Histórico de assiduidade" style={{maxWidth: '900px'}}>
                    
                    <div className="jn-cabecalho" style={{justifyContent: 'space-between', flexWrap: 'wrap'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                            <div className="jn-cabecalho-ico"><Icons.Calendar size={22} /></div>
                            <div>
                                <h3>Histórico de assiduidade</h3>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                                    <button aria-label="Mês anterior" className="btn-small hover-shadow" onClick={() => { const d = new Date(historyDate); d.setMonth(d.getMonth() - 1); setHistoryDate(d); }}><Icons.ChevronLeft /></button>
                                    <span style={{fontWeight: 'bold', color: 'var(--n-700)', minWidth: '120px', textAlign: 'center'}}>
                                        {nomesMeses[historyDate.getMonth()]} {historyDate.getFullYear()}
                                    </span>
                                    <button aria-label="Mês seguinte" className="btn-small hover-shadow" onClick={() => { const d = new Date(historyDate); d.setMonth(d.getMonth() + 1); setHistoryDate(d); }}><Icons.ChevronRight /></button>
                                </div>
                            </div>
                        </div>

                        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                            <div style={{background: 'var(--n-50)', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--n-200)', textAlign: 'center'}}>
                                <div style={{fontSize: '0.75rem', color: 'var(--n-500)', textTransform: 'uppercase', fontWeight: 'bold'}}>Total do Mês</div>
                                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-btnPrimary)'}}>{totalHorasMes.h}h {totalHorasMes.m}m</div>
                            </div>
                            
                            <button className="btn-cta" onClick={() => { setIsAdding(true); setEditingRecord(null); }}>
                                <Icons.Plus /> Inserir Registo
                            </button>
                            
                            <button type="button" aria-label="Fechar" onClick={() => setShowHistoryModal(false)} className="jn-fechar"><Icons.Close size={18} /></button>
                        </div>
                    </div>

                    <div className="jn-corpo custom-scrollbar" style={{padding: '18px 22px'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', background: 'var(--sup-1)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                            <thead style={{background: 'var(--n-100)'}}>
                                <tr style={{textAlign: 'left', color: 'var(--n-700)'}}>
                                    <th style={{padding: '12px 15px'}}>Data</th>
                                    <th style={{padding: '12px 15px'}}>Entrada</th>
                                    <th style={{padding: '12px 15px'}}>Saída</th>
                                    <th style={{padding: '12px 15px'}}>Pausa</th>
                                    <th style={{padding: '12px 15px'}}>Total</th>
                                    <th style={{padding: '12px 15px'}}>Tarefas Realizadas / Resumo do Dia</th>
                                    <th style={{padding: '12px 15px', textAlign: 'center'}}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isAdding && (
                                    <tr style={{background: 'var(--color-bgSecondary)', borderBottom: '2px solid var(--color-borderColor)'}}>
                                        <td colSpan="7" style={{padding: '20px'}}>
                                            <h4 style={{marginTop:0, color:'var(--color-btnPrimaryHover)', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Plus /> Adicionar Registo Manual</h4>
                                            <form onSubmit={handleSaveNew} style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                                                <div style={{flex: 1, minWidth: '130px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Data *</label>
                                                    <input type="date" value={addForm.data} onChange={e => setAddForm({...addForm, data: e.target.value})} style={inputEditStyle} className="input-focus" required />
                                                </div>
                                                <div style={{flex: 1, minWidth: '100px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Entrada *</label>
                                                    <input type="time" value={addForm.hora_entrada} onChange={e => setAddForm({...addForm, hora_entrada: e.target.value})} style={inputEditStyle} className="input-focus" required />
                                                </div>
                                                <div style={{flex: 1, minWidth: '100px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Saída *</label>
                                                    <input type="time" value={addForm.hora_saida} onChange={e => setAddForm({...addForm, hora_saida: e.target.value})} style={inputEditStyle} className="input-focus" required />
                                                </div>
                                                <div style={{flex: 1, minWidth: '100px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Pausa (Min)</label>
                                                    <input type="number" min="0" value={addForm.tempo_pausa} onChange={e => setAddForm({...addForm, tempo_pausa: e.target.value})} style={inputEditStyle} className="input-focus" />
                                                </div>
                                                
                                                <div style={{flex: 2, minWidth: '200px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Tarefas Realizadas / Resumo do Dia</label>
                                                    <textarea rows="5" value={addForm.observacoes} onChange={e => setAddForm({...addForm, observacoes: e.target.value})} style={{...inputEditStyle, resize:'vertical'}} className="input-focus" />
                                                </div>
                                                
                                                <div style={{flex: 2, minWidth: '200px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#ea580c'}}>Motivo (Obrigatório) *</label>
                                                    <input aria-label="Motivo (Obrigatório)" type="text" placeholder="Ex: Fui ao médico e não piquei…" value={addForm.motivo_alteracao} onChange={e => setAddForm({...addForm, motivo_alteracao: e.target.value})} style={{...inputEditStyle, borderColor: '#fdba74', background: 'var(--cx-fff7ed, #fff7ed)'}} className="input-focus-alert" required />
                                                </div>

                                                <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px'}}>
                                                    <button type="button" onClick={() => setIsAdding(false)} className="btn-small hover-shadow" style={{height: '38px', background: 'var(--sup-1)', border: '1px solid var(--n-300)', color: 'var(--n-500)'}}>Cancelar</button>
                                                    <button type="submit" className="btn-primary hover-shadow" style={{padding: '0 20px', height: '38px', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Save /> Inserir Registo</button>
                                                </div>
                                            </form>
                                        </td>
                                    </tr>
                                )}

                                {fullHistory.length === 0 && !isAdding ? (
                                    <tr><td colSpan="7" style={{textAlign: 'center', padding: '40px', color: 'var(--n-500)'}}>
                                        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '10px', opacity: 0.5}}><Icons.Calendar size={30} /></div>
                                        Nenhum registo neste mês.
                                    </td></tr>
                                ) : fullHistory.map(r => {
                                    const totalSegundos = calcularSegundosExatos(r.hora_entrada, r.hora_saida, r.tempo_pausa_acumulado);
                                    const isEditing = editingRecord === r.id;

                                    return (
                                        <React.Fragment key={r.id}>
                                            <tr style={{borderBottom: '1px solid var(--n-200)', background: isEditing ? 'var(--color-bgSecondary)' : 'white'}} className={!isEditing ? "table-row-hover" : ""}>
                                                <td style={{padding: '12px 15px', fontWeight: 'bold', color: 'var(--n-700)'}}>
                                                    {new Date(r.data_registo).toLocaleDateString('pt-PT')}
                                                </td>
                                                <td style={{padding: '12px 15px', color: 'var(--color-btnPrimary)'}}>{r.hora_entrada?.slice(0,5)}</td>
                                                <td style={{padding: '12px 15px', color: r.hora_saida ? '#ef4444' : '#94a3b8'}}>
                                                    {r.hora_saida?.slice(0,5) || '---'}
                                                </td>
                                                <td style={{padding: '12px 15px', color: '#eab308', fontWeight: '500'}}>
                                                    {r.tempo_pausa_acumulado ? `${Math.floor(r.tempo_pausa_acumulado / 60)} min` : '-'}
                                                </td>
                                                <td style={{padding: '12px 15px'}}>{formatarHoras(totalSegundos)}</td>
                                                
                                                <td style={{padding: '12px 15px'}}>
                                                    <div style={{maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--n-500)', fontSize: '0.8rem'}} title={r.observacoes || ''}>
                                                        {r.motivo_alteracao && <span style={{color: '#ea580c', fontWeight:'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px'}}><Icons.AlertTriangle size={12} /> Editado: {r.motivo_alteracao}</span>}
                                                        {r.observacoes ? String(r.observacoes).replace(/✅ TAREFAS REALIZADAS:\n/g, '').replace(/\n/g, ', ') : '-'}
                                                    </div>
                                                </td>

                                                <td style={{padding: '12px 15px', textAlign: 'right'}}>
                                                    <button aria-label="Editar este registo" onClick={() => handleStartEdit(r)} style={{background: 'transparent', border: 'none', color: 'var(--color-btnPrimary)', cursor: 'pointer', padding: '4px'}} className="hover-text-blue" title="Editar este registo">
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                </td>
                                            </tr>

                                            {isEditing && (
                                                <tr style={{background: 'var(--color-bgSecondary)', borderBottom: '2px solid var(--color-borderColor)'}}>
                                                    <td colSpan="7" style={{padding: '20px'}}>
                                                        <form onSubmit={(e) => handleSaveEdit(e, r.id)} style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                                                            <div style={{flex: 1, minWidth: '100px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Hora Entrada</label>
                                                                <input type="time" value={editForm.hora_entrada} onChange={e => setEditForm({...editForm, hora_entrada: e.target.value})} style={inputEditStyle} className="input-focus" required />
                                                            </div>
                                                            <div style={{flex: 1, minWidth: '100px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Hora Saída</label>
                                                                <input type="time" value={editForm.hora_saida} onChange={e => setEditForm({...editForm, hora_saida: e.target.value})} style={inputEditStyle} className="input-focus" />
                                                            </div>
                                                            <div style={{flex: 1, minWidth: '100px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Pausa (Minutos)</label>
                                                                <input type="number" min="0" value={editForm.tempo_pausa} onChange={e => setEditForm({...editForm, tempo_pausa: e.target.value})} style={inputEditStyle} className="input-focus" />
                                                            </div>
                                                            
                                                            <div style={{flex: 2, minWidth: '200px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-btnPrimaryHover)'}}>Tarefas Realizadas / Resumo do Dia</label>
                                                                <textarea aria-label="Tarefas Realizadas / Resumo do Dia" rows="5" value={editForm.observacoes || ""} onChange={e => setEditForm({...editForm, observacoes: e.target.value})} placeholder="O que foi feito…" style={{...inputEditStyle, resize:'vertical'}} className="input-focus" />
                                                            </div>

                                                            <div style={{flex: 2, minWidth: '200px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#ea580c'}}>Motivo da Correção *</label>
                                                                <input aria-label="Motivo da Correção" type="text" placeholder="Ex: Esqueci de picar saída" value={editForm.motivo_alteracao} onChange={e => setEditForm({...editForm, motivo_alteracao: e.target.value})} style={{...inputEditStyle, borderColor: '#fdba74', background: 'var(--cx-fff7ed, #fff7ed)'}} className="input-focus-alert" required />
                                                            </div>

                                                            <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px'}}>
                                                                <button type="button" onClick={() => setEditingRecord(null)} className="btn-small hover-shadow" style={{height: '38px', background: 'var(--sup-1)', border: '1px solid var(--n-300)', color: 'var(--n-500)'}}>Cancelar</button>
                                                                <button type="submit" className="btn-primary hover-shadow" style={{padding: '0 20px', height: '38px', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Save /> Guardar</button>
                                                            </div>
                                                        </form>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </ModalPortal>
      )}

      {/* --- POP-UP AVISO CC EXPIRAR --- */}
      <Janela
          aberta={ccWarning.show}
          camada="calc(var(--z-modal) + 13)"
          aoFechar={() => setCcWarning({ show: false, type: '', users: [] })}
          variante="confirmacao"
          tom="danger"
          icone={<Icons.IdCard size={26} />}
          titulo="Aviso: Cartão de Cidadão"
          rodape={<>
              <button type="button" onClick={() => setCcWarning({ show: false, type: '', users: [] })}>Fechar</button>
              {ccWarning.type === 'user' && (
                  <button type="button" className="is-primary" onClick={() => { setCcWarning({ show: false, type: '', users: [] }); navigate("/dashboard/perfil"); }}>Atualizar agora</button>
              )}
          </>}
      >
                      <div className="jn-caixa-nota">
                          {ccWarning.type === 'gestor' ? (
                              <>
                                  <p style={{margin: '0 0 10px 0'}}>Os seguintes colaboradores estão com a validade do CC quase a expirar ou já expirada. Peça que atualizem os dados:</p>
                                  <ul style={{margin: 0, paddingLeft: '20px', color: 'var(--n-900)', fontWeight: '500'}}>
                                      {ccWarning.users.map(u => (
                                          <li key={u.id}>{u.nome} <span style={{fontSize: '0.8rem', color: '#ef4444', marginLeft: '5px'}}>({new Date(u.validade_cc).toLocaleDateString('pt-PT')})</span></li>
                                      ))}
                                  </ul>
                              </>
                          ) : (
                              <p style={{margin: 0, textAlign: 'center'}}>
                                  A sua validade do CC está quase a expirar (ou expirada). Atualize os seus dados e informe os Recursos Humanos dessa alteração.
                              </p>
                          )}
                      </div>

      </Janela>

      {notification && <AvisoToast tipo={notification.type} mensagem={notification.message} />}

      {/* --- POP-UP DE PARABÉNS 🎉 --- */}
      {showBirthdayPopup && (
        <ModalPortal>
            <div className="jn-fundo" style={{zIndex: "calc(var(--z-modal) + 13)"}}>
                <div style={{background: 'linear-gradient(135deg, var(--sup-1), var(--lx-fef3c7, #fef3c7))', borderRadius: '24px', width: '90%', maxWidth: '400px', padding: '40px 20px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative', overflow: 'hidden', animation: 'fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'}}>
                    <div style={{display: 'flex', justifyContent: 'center', color: '#f59e0b', marginBottom: '15px', animation: 'bounce 2s infinite'}}><Icons.Gift /></div>
                    <h2 style={{margin: '0 0 10px 0', color: 'var(--cx-b45309, #b45309)', fontSize: '2rem'}}>Parabéns, {userFirstName}!</h2>
                    <p style={{color: 'var(--cx-92400e, #92400e)', marginBottom: '25px', fontSize: '1.1rem', lineHeight: '1.5'}}>
                        A equipa deseja-te um dia incrivelmente feliz, cheio de sucesso e alegrias!
                    </p>
                    <button 
                        onClick={() => setShowBirthdayPopup(false)} 
                        style={{background: '#f59e0b', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)', transition: '0.2s'}}
                        className="hover-shadow"
                    >
                        Obrigado!
                    </button>
                </div>
            </div>
        </ModalPortal>
      )}

      {/* --- MODAL DE ALERTA --- */}
      <Janela
          aberta={alertModal.show}
          camada="calc(var(--z-modal) + 13)"
          aoFechar={() => setAlertModal({ show: false, message: "" })}
          variante="confirmacao"
          tom="danger"
          icone={<Icons.AlertTriangle size={26} />}
          titulo="Atenção"
          subtitulo={alertModal.message}
          rodape={<button type="button" className="is-primary" onClick={() => setAlertModal({ show: false, message: "" })}>Entendido</button>}
      />

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
                message="Podes adicionar uma nota breve ao parar este registo (opcional)."
                placeholder="Ex: Encerrado após validação com equipa"
                showCompleteOption={Boolean(activeLog)}
                showStatusOption={Boolean(activeLog)}
                completeLabel={getStopCompleteLabel(activeLog)}
                onCancel={closeStopNoteModal}
                onConfirm={confirmStopWithNote}
            />


      <style>{`
        .menu-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 15px; text-align: left; background: none; border: none; cursor: pointer; font-size: 0.9rem; color: var(--color-textSecondary); transition: background 0.2s; }
        .menu-item:hover { background: var(--color-bgSecondary); color: var(--color-btnPrimary); }
        .menu-item.logout { color: #dc2626; }
        .menu-item.logout:hover { background: var(--lx-fef2f2, #fef2f2); color: var(--tx-b91c1c, #b91c1c); }
        
        .table-row-hover:hover { background-color: var(--color-bgSecondary) !important; }
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 8px 14px -10px rgba(15,23,42,0.28); }
        .hover-text-blue:hover { color: var(--color-btnPrimary) !important; }
        .hover-red-text:hover { color: #ef4444 !important; }
        
        /* Estilos dos Cartões de Tarefa */
        
        .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px var(--color-btnPrimaryShadow); }
        .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      `}</style>

      {/* 🔔 PAINEL DE NOTIFICAÇÕES */}
      <NotificationsPanel
        open={showBellDropdown}
        onClose={closeBellPanel}
        anchorRef={bellDropdownRef}
        items={projectNotifications}
        loading={notificationsLoading}
        onOpenItem={openProjectNotification}
        onMarkRead={markProjectNotificationAsRead}
        onMarkAll={() => Promise.all(projectNotifications.map(n => markProjectNotificationAsRead(n.id)))}
      />

      {/* ✅ APROVAÇÃO DE CONTEÚDO DE MARKETING */}
      {aprovacaoConteudoId && (
        <AprovacaoModal
          conteudoId={aprovacaoConteudoId}
          user={{ id: user?.id, nome: userProfile?.nome }}
          onClose={() => setAprovacaoConteudoId(null)}
          onDecidido={(msg) => { showToast(msg); loadProjectNotifications(); }}
          onAbrirNoMarketing={(id) => navigate(`/dashboard/marketing?conteudo=${id}`)}
        />
      )}

      {/* 👤 PERFIL DE UM COLEGA (EQUIPA ONLINE) */}
      {selectedOnlineUser && (
        <ProfilePeek entry={selectedOnlineUser} onClose={closeProfilePeek} />
      )}
    </div>
  );
}