// =====================================================================
// Painel de administração (rota /dashboard/admin) — só admin/administrador
// (ProtectedRoute + verificação isAdmin aqui; a BD aplica RLS por baixo).
// Separadores:
//   geral      <AdminVisaoGeral/>: horas, projetos, pedidos RH pendentes, comercial, atividade recente
//   analytics  tempo registado (task_logs) por projeto/pessoa com filtros dia/mês/intervalo,
//              quem está online e financeiro dos projetos
//   equipa     por colaborador: presença (assiduidade), tempo em tarefas, tarefa atual
//   gestao     ficha de uma pessoa: tarefas abertas, horas e mudança de papel
//              (POST /api/admin/contas acao "papel", pede a password de quem muda)
//   seguranca  <SegurancaMFA/>: estado do 2FA, repor MFA, bloquear contas inativas
// Carrega até 5000 task_logs e 5000 registos de assiduidade (limite fixo).
// =====================================================================
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import SegurancaMFA from "../components/admin/SegurancaMFA";
import AdminVisaoGeral from "../components/admin/AdminVisaoGeral";
import { postAutenticado } from "../utils/apiAutenticada";
import "../styles/admin.css";
import "../styles/admin-separadores.css";
import Janela from "../components/Janela";
import SelectModerno from "../components/SelectModerno";


// Papéis que se podem escolher na "Tag de Perfil". O servidor aceita também
// "marketing plus" (PAPEIS_VALIDOS em api/_lib/adminContas.js), que não está aqui.
const PROFILE_TAG_OPTIONS = [
  { value: "colaborador", label: "Colaborador" },
  { value: "gestor", label: "Gestor" },
  { value: "marketing", label: "Marketing" },
  { value: "admin", label: "Admin" },
];

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed.slice(1, -1).split(",").map((part) => part.replace(/^"|"$/g, "").trim()).filter(Boolean);
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getMinutesFromLog(log) {
  const duration = Number(log?.duration_minutes);
  if (Number.isFinite(duration) && duration > 0) return duration;
  const start = log?.start_time ? new Date(log.start_time) : null;
  const end = log?.end_time ? new Date(log.end_time) : null;
  if (!start || !end) return 0;
  const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  return minutes > 0 ? minutes : 0;
}

function dateKeyLocal(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value || 0);
}

function getLogTree(log, projectById, activityById, taskById, subtaskById, focusedAssignments) {
  if (!log) return { p: null, a: null, t: null, s: null, estado: "" };
  const limpa = (id) => String(id || "").trim().toLowerCase();
  const buscar = (idRaw) => {
    const id = limpa(idRaw);
    if (!id) return null;
    if (taskById?.has(id)) return taskById.get(id);
    if (subtaskById?.has(id)) return subtaskById.get(id);
    if (activityById?.has(id)) return activityById.get(id);
    if (projectById?.has(id)) return projectById.get(id);
    if (focusedAssignments) {
      const extra = [...(focusedAssignments.tarefas || []), ...(focusedAssignments.atividades || []), ...(focusedAssignments.subtarefas || [])].find((item) => limpa(item?.id) === id);
      if (extra) return extra;
    }
    return null;
  };
  const s = buscar(log.subtarefa_id || log.subtask_id);
  const t = buscar(log.task_id || log.tarefa_id || s?.tarefa_id || s?.task_id);
  const a = buscar(log.atividade_id || log.activity_id || t?.atividade_id || t?.activity_id || s?.atividade_id);
  const p = buscar(log.projeto_id || log.project_id || a?.projeto_id || a?.project_id || t?.projeto_id || s?.projeto_id);
  const alvo = s || t || a || p;
  const estado = alvo?.estado || alvo?.status || "";
  return { p, a, t, s, estado };
}

function getTabelaTaskLabel(log, projectById, activityById, taskById, subtaskById, focusedAssignments) {
  const tree = getLogTree(log, projectById, activityById, taskById, subtaskById, focusedAssignments);
  const parts = [tree.p?.titulo, tree.a?.titulo, tree.t?.titulo, tree.s?.titulo].filter(Boolean);
  const caminho = parts.join(" > ");
  const nota = log?.descricao || log?.description || log?.notas || "";
  if (caminho) return nota ? `${caminho} — (${nota})` : caminho;
  return nota ? `[Nota] ${nota}` : "Sessão de trabalho";
}

function isOpenEstado(estado) {
  const value = String(estado || "").trim().toLowerCase();
  return value !== "concluido" && value !== "concluído" && value !== "cancelado";
}

function getTodayDateInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getMonthInput() {
  return getTodayDateInput().slice(0, 7);
}

function getSafeFirstName(fullName, fallback = "Admin") {
  const normalized = String(fullName || "").trim();
  if (!normalized) return fallback;
  return normalized.split(/\s+/)[0] || fallback;
}

function getInitials(fullName) {
  const normalized = String(fullName || "").trim();
  if (!normalized) return "AD";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (!parts.length) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function MiniPieChart({ title, data, palette }) {
  const nonZeroData = data.filter((item) => item.value > 0);
  const totalRaw = nonZeroData.reduce((acc, item) => acc + item.value, 0);
  const tinyThreshold = 0.04;
  const major = [];
  let tinyBucket = 0;
  
  nonZeroData.forEach((item) => {
    const fraction = totalRaw > 0 ? item.value / totalRaw : 0;
    if (fraction > 0 && fraction < tinyThreshold) {
      tinyBucket += item.value;
      return;
    }
    major.push(item);
  });

  const chartData = tinyBucket > 0 ? [...major, { label: "Outros", value: tinyBucket }] : major;
  const total = chartData.reduce((acc, item) => acc + item.value, 0);
  const safeTotal = total > 0 ? total : 1;
  const size = 180, radius = 70, center = 90;
  let currentAngle = -Math.PI / 2;

  const slices = chartData.map((item, index) => {
    const fraction = item.value / safeTotal;
    const isFull = fraction >= 0.9999;
    const angle = fraction * Math.PI * 2;
    const startX = center + radius * Math.cos(currentAngle);
    const startY = center + radius * Math.sin(currentAngle);
    const endAngle = currentAngle + angle;
    const endX = center + radius * Math.cos(endAngle);
    const endY = center + radius * Math.sin(endAngle);
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    const color = palette[index % palette.length];
    const pathData = isFull ? "" : `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    currentAngle = endAngle;
    return { ...item, color, pathData, fraction, isFull };
  });

  return (
    <section className="adm-card adm-pie">
      <div className="adm-card-head"><div><h3>{title}</h3><p>{data.length ? `${formatHours(total)} no período` : "Sem dados para este filtro"}</p></div></div>
      {data.length > 0 && (
        <>
          <div className="adm-pie-chart">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${title}: ${formatHours(total)}`}>
              {slices.map((s) => s.isFull ? <circle key={s.label} cx={center} cy={center} r={radius} fill={s.color} /> : <path key={s.label} d={s.pathData} fill={s.color} stroke="#ffffff" strokeWidth="2" />)}
              <circle cx={center} cy={center} r="40" fill="#ffffff" />
              <text x={center} y={center - 5} textAnchor="middle" className="adm-pie-total-label">TOTAL</text>
              <text x={center} y={center + 13} textAnchor="middle" className="adm-pie-total">{formatHours(total)}</text>
            </svg>
          </div>
          <ul className="adm-pie-legend">
            {slices.map((slice) => (
              <li key={slice.label}>
                <i style={{ background: slice.color }} />
                <span title={slice.label}>{slice.label}</span>
                <b>{formatHours(slice.value)}</b>
                <em>{Math.round(slice.fraction * 100)}%</em>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

const Icons = {
  Relogio: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>,
  Analytics: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  Equipa: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Gestao: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Pulse: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Finance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
};

export default function AdminDashboard() {
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("geral");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [assiduidade, setAssiduidade] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [mode, setMode] = useState("day");
  const [selectedDate, setSelectedDate] = useState(getTodayDateInput());
  const [selectedMonth, setSelectedMonth] = useState(getMonthInput());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(getTodayDateInput());
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("all");

  const [focusedAssignmentsLoading, setFocusedAssignmentsLoading] = useState(false);
  const [focusedAssignments, setFocusedAssignments] = useState({ atividades: [], tarefas: [], subtarefas: [] });
  const [profileTagSaving, setProfileTagSaving] = useState(false);
  const [profileTagFeedback, setProfileTagFeedback] = useState("");
  const [profileTagModal, setProfileTagModal] = useState({ open: false, nextTag: "", password: "", error: "" });

  const isAdmin = useMemo(() => {
    const role = normalizeRole(userProfile?.role || userProfile?.tipo);
    return role === "admin" || role === "administrador";
  }, [userProfile]);

  useEffect(() => {
    if (activeTab === "equipa") setSelectedUserId("all");
  }, [activeTab]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setErrorMessage("");
      const [profilesRes, projectsRes, activitiesRes, tasksRes, subtasksRes, logsRes, assiduidadeRes] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("projetos").select("*").order("titulo"),
        supabase.from("atividades").select("*").order("titulo"),
        supabase.from("tarefas").select("*").order("titulo"),
        supabase.from("subtarefas").select("*").order("titulo"),
        supabase.from("task_logs").select("*").order("start_time", { ascending: false }).limit(5000),
        supabase.from("assiduidade").select("*").order("data_registo", { ascending: false }).limit(5000),
      ]);

      if (profilesRes.error || projectsRes.error || logsRes.error || assiduidadeRes.error) {
        if (mounted) setErrorMessage("Erro ao carregar dados de administração.");
        setLoading(false);
        return;
      }
      if (!mounted) return;
      setProfiles(profilesRes.data || []);
      setProjects(projectsRes.data || []);
      setActivities(activitiesRes.data || []);
      setTasks(tasksRes.data || []);
      setSubtasks(subtasksRes.data || []);
      setTaskLogs(logsRes.data || []);
      setAssiduidade(assiduidadeRes.data || []);
      setLoading(false);
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const projectById = useMemo(() => new Map(projects.map(p => [String(p.id).trim().toLowerCase(), p])), [projects]);
  const activityById = useMemo(() => new Map([...activities, ...(focusedAssignments?.atividades || [])].map(a => [String(a.id).trim().toLowerCase(), a])), [activities, focusedAssignments]);
  const taskById = useMemo(() => new Map([...tasks, ...(focusedAssignments?.tarefas || [])].map(t => [String(t.id).trim().toLowerCase(), t])), [tasks, focusedAssignments]);
  const subtaskById = useMemo(() => new Map([...subtasks, ...(focusedAssignments?.subtarefas || [])].map(s => [String(s.id).trim().toLowerCase(), s])), [subtasks, focusedAssignments]);

  const resolveProjectIdForLog = (log) => {
    if (log?.projeto_id || log?.project_id) return String(log.projeto_id || log.project_id);
    if (log?.atividade_id) return String(activityById.get(String(log.atividade_id))?.projeto_id);
    if (log?.task_id) return String(activityById.get(String(taskById.get(String(log.task_id))?.atividade_id))?.projeto_id);
    if (log?.subtarefa_id) return String(activityById.get(String(taskById.get(String(subtaskById.get(String(log.subtarefa_id))?.tarefa_id))?.atividade_id))?.projeto_id);
    return null;
  };

  const resolveActiveLabel = (log) => {
    if (!log) return "N/A";
    const tree = getLogTree(log, projectById, activityById, taskById, subtaskById, focusedAssignments);
    return [tree.p?.titulo, tree.a?.titulo, tree.t?.titulo, tree.s?.titulo].filter(Boolean).join(" > ") || (log.conteudo_id ? "Marketing" : "Em curso");
  };

  const logsFiltered = useMemo(() => {
    return taskLogs.filter((log) => {
      if (!log?.end_time && !log?.start_time) return false;
      const reference = log?.end_time || log?.start_time || log?.created_at;
      const key = dateKeyLocal(reference);
      if (!key) return false;

      if (mode === "day" && key !== selectedDate) return false;
      if (mode === "month" && key.slice(0, 7) !== selectedMonth) return false;
      if (mode === "interval" && (key < startDate || key > endDate)) return false;

      if (selectedProjectId !== "all") {
        const resolved = resolveProjectIdForLog(log);
        if (String(resolved) !== String(selectedProjectId)) return false;
      }
      if (selectedUserId !== "all" && String(log.user_id) !== String(selectedUserId)) return false;
      return true;
    });
  }, [mode, selectedDate, selectedMonth, startDate, endDate, selectedProjectId, selectedUserId, taskLogs, activityById, taskById, subtaskById]);

  const totalMinutesFiltered = useMemo(() => logsFiltered.reduce((acc, log) => acc + getMinutesFromLog(log), 0), [logsFiltered]);

  const assiduidadeFiltered = useMemo(() => {
    return assiduidade.filter((registo) => {
      if (!registo.data_registo) return false;
      const dateStr = registo.data_registo;
      if (mode === "day" && dateStr !== selectedDate) return false;
      if (mode === "month" && dateStr.slice(0, 7) !== selectedMonth) return false;
      if (mode === "interval" && (dateStr < startDate || dateStr > endDate)) return false;
      if (selectedUserId !== "all" && String(registo.user_id) !== String(selectedUserId)) return false;
      return true;
    });
  }, [mode, selectedDate, selectedMonth, startDate, endDate, selectedUserId, assiduidade]);

  const aggregateBy = (items, labelGetter) => {
    const map = new Map();
    items.forEach((log) => {
      const label = labelGetter(log);
      const minutes = getMinutesFromLog(log);
      if (!label || minutes <= 0) return;
      map.set(label, (map.get(label) || 0) + minutes);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  };

  const chartsData = useMemo(() => {
    return {
      byUser: aggregateBy(logsFiltered, (log) => profiles.find(p => String(p.id) === String(log.user_id))?.nome || "Desconhecido"),
      byProject: aggregateBy(logsFiltered, (log) => getLogTree(log, projectById, activityById, taskById, subtaskById).p?.titulo || "Sem projeto"),
      byActivity: aggregateBy(logsFiltered, (log) => getLogTree(log, projectById, activityById, taskById, subtaskById).a?.titulo || "Sem atividade"),
      byTask: aggregateBy(logsFiltered, (log) => {
        const t = getLogTree(log, projectById, activityById, taskById, subtaskById);
        return t.t?.titulo || t.s?.titulo || "Sem tarefa";
      }),
    };
  }, [logsFiltered, profiles, projectById, activityById, taskById, subtaskById]);

  const activeLogsByUser = useMemo(() => {
    const map = new Map();
    taskLogs.filter(l => !l.end_time).forEach((log) => {
      const userId = String(log.user_id);
      const existing = map.get(userId);
      if (!existing || new Date(log.start_time).getTime() > new Date(existing.start_time).getTime()) map.set(userId, log);
    });
    return map;
  }, [taskLogs]);

  const onlineUsers = useMemo(() => {
    const today = getTodayDateInput();
    const onlineList = [];
    
    profiles.forEach(profile => {
      const logsHoje = assiduidade.filter(a => a.data_registo === today && String(a.user_id) === String(profile.id));
      if (logsHoje.length === 0) return;
      const sorted = [...logsHoje].sort((a, b) => b.hora_entrada.localeCompare(a.hora_entrada));
      const ultimoRegisto = sorted[0];
      
      if (ultimoRegisto.hora_entrada && !ultimoRegisto.hora_saida) {
        onlineList.push({ ...profile, hora_entrada: ultimoRegisto.hora_entrada.slice(0, 5) });
      }
    });
    return onlineList;
  }, [profiles, assiduidade]);

  // ---> NOVA LÓGICA DE DADOS FINANCEIROS <---
  const projetosFinanceiros = useMemo(() => {
    const data = projects.map(p => {
      const investimento = Number(p.investimento) || 0;
      const incentivo = Number(p.incentivo) || 0;
      const autoFinanciamento = investimento - incentivo;
      return { id: p.id, titulo: p.titulo, investimento, incentivo, autoFinanciamento };
    }).filter(p => p.investimento > 0 || p.incentivo > 0);
    return data.sort((a, b) => b.investimento - a.investimento);
  }, [projects]);

  useEffect(() => {
    let cancelled = false;
    async function loadFocusedAssignments() {
      if (activeTab !== "gestao" || selectedUserId === "all") return;
      setFocusedAssignmentsLoading(true);
      const userId = String(selectedUserId);
      const [ativ1, ativ2, tar1, tar2, sub1, sub2, sub3] = await Promise.all([
        supabase.from("atividades").select("*").eq("responsavel_id", userId).neq("estado", "concluido"),
        supabase.from("atividades").select("*").contains("colaboradores_extra", [userId]).neq("estado", "concluido"),
        supabase.from("tarefas").select("*").eq("responsavel_id", userId).neq("estado", "concluido"),
        supabase.from("tarefas").select("*").contains("colaboradores_extra", [userId]).neq("estado", "concluido"),
        supabase.from("subtarefas").select("*").eq("responsavel_id", userId).neq("estado", "concluido"),
        supabase.from("subtarefas").select("*").contains("colaboradores_extra", [userId]).neq("estado", "concluido"),
        supabase.from("subtarefas").select("*").contains("colaboradores", [userId]).neq("estado", "concluido"),
      ]);
      const dedupe = (items) => Array.from(new Map(items.filter(i => isOpenEstado(i.estado)).map(i => [i.id, i])).values());
      if (!cancelled) {
        setFocusedAssignments({
          atividades: dedupe([...(ativ1.data || []), ...(ativ2.data || [])]),
          tarefas: dedupe([...(tar1.data || []), ...(tar2.data || [])]),
          subtarefas: dedupe([...(sub1.data || []), ...(sub2.data || []), ...(sub3.data || [])])
        });
        setFocusedAssignmentsLoading(false);
      }
    }
    loadFocusedAssignments();
    return () => { cancelled = true; };
  }, [activeTab, selectedUserId]);

  // Troca de papel feita no servidor: confirma a palavra-passe da conta de quem pede
  /**
   * Muda profiles.role do colaborador selecionado via /api/admin/contas (acao "papel").
   * O servidor valida a password do admin, grava com service_role e regista em audit_log.
   * (Pelo browser não é possível: profiles_proteger só deixa admins mudar role/tipo/ativo.)
   */
  const handleUpdateRole = async () => {
    if (!profileTagModal.password) return setProfileTagModal(p => ({ ...p, error: "Introduza a sua palavra-passe." }));
    setProfileTagSaving(true);
    try {
      const resp = await postAutenticado(`${import.meta.env.VITE_MARKETING_API_BASE || ""}/api/admin/contas`, {
        acao: "papel", userId: selectedUserId, papel: profileTagModal.nextTag, password: profileTagModal.password,
      });
      const out = await resp.json().catch(() => ({ ok: false, error: `Erro ${resp.status} do servidor.` }));
      if (!resp.ok || !out.ok) {
        setProfileTagModal(p => ({ ...p, error: out.error || "Não foi possível alterar o papel." }));
        return;
      }
      setProfiles(prev => prev.map(p => String(p.id) === String(selectedUserId) ? out.perfil : p));
      setProfileTagFeedback("Atualizado com sucesso.");
      setProfileTagModal({ open: false, nextTag: "", password: "", error: "" });
    } finally {
      setProfileTagSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: "24px" }}>
        <div style={{ background: "#fff", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "14px", padding: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Acesso restrito</h2>
          <p style={{ marginBottom: 0 }}>Esta área está disponível apenas para utilizadores com perfil de administrador.</p>
        </div>
      </div>
    );
  }

  const selectedProfile = profiles.find(p => String(p.id) === String(selectedUserId));
  const firstName = getSafeFirstName(userProfile?.nome, "Admin");
  
  const currentProjectLabel = selectedProjectId === "all" 
    ? "Todos os Projetos" 
    : (projects.find(p => p.id === selectedProjectId)?.titulo || "Projeto selecionado");


  const TABS = [
    { id: "geral", label: "Visão geral", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg> },
    { id: "analytics", label: "Tempo & Projetos", icon: Icons.Analytics },
    { id: "equipa", label: "Equipa & Assiduidade", icon: Icons.Equipa },
    { id: "gestao", label: "Gestão individual", icon: Icons.Gestao },
    { id: "seguranca", label: "Segurança", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
  ];
  const mostraFiltros = ["analytics", "equipa", "gestao"].includes(activeTab);
  const ativosCount = profiles.filter((p) => p.ativo !== false).length;
  const saudacao = currentTime.getHours() < 12 ? "Bom dia" : currentTime.getHours() < 20 ? "Boa tarde" : "Boa noite";

  return (
    <div className="adm-page">
      {/* CABEÇALHO */}
      <header className="adm-hero">
        <span className="adm-hero-orb is-a" aria-hidden="true" />
        <span className="adm-hero-orb is-b" aria-hidden="true" />
        <div className="adm-hero-row">
          <div className="adm-hero-main">
            <span className="adm-hero-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
            </span>
            <div>
              <span className="adm-hero-kicker">Administração</span>
              <h1>{saudacao}, {firstName}</h1>
              <p>{currentTime.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })} · tudo o que se passa na empresa, num só sítio.</p>
            </div>
          </div>
          <div className="adm-hero-side">
            <span className="adm-chip"><strong>{loading ? "…" : onlineUsers.length}</strong> online</span>
            <span className="adm-chip"><strong>{loading ? "…" : ativosCount}</strong> colaboradores</span>
            <span className="adm-me">
              <span><strong>{firstName}</strong><small>Admin · {currentTime.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</small></span>
              <i>{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" /> : getInitials(userProfile?.nome)}</i>
            </span>
          </div>
        </div>
        <nav className="adm-tabs" role="tablist" aria-label="Secções da administração">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} className={activeTab === t.id ? "is-on" : ""} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* FILTROS (só nas abas de tempo e equipa) */}
      {mostraFiltros && (
        <div className="adm-filters">
          <span>Período</span>
          <SelectModerno value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Tipo de período">
            <option value="day">Dia</option>
            <option value="month">Mês</option>
            <option value="interval">Intervalo</option>
          </SelectModerno>
          {mode === "day" && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} aria-label="Dia" />}
          {mode === "month" && <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} aria-label="Mês" />}
          {mode === "interval" && (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Desde" />
              <em>até</em>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Até" />
            </>
          )}
          <button type="button" className="adm-filter-btn" onClick={() => setProjectModalOpen(true)}>
            <span>{currentProjectLabel}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          {activeTab === "analytics" && (
            <SelectModerno value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} aria-label="Colaborador">
              <option value="all">Todos os colaboradores</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.nome || p.email}</option>)}
            </SelectModerno>
          )}
        </div>
      )}

      {loading ? (
        <p className="adm-empty">A carregar dados de administração…</p>
      ) : errorMessage ? (
        <p className="adm-empty is-erro">{errorMessage}</p>
      ) : (
        <>
          {activeTab === "geral" && (
            <AdminVisaoGeral
              profiles={profiles}
              projects={projects}
              activities={activities}
              tasks={tasks}
              taskLogs={taskLogs}
              onlineUsers={onlineUsers}
              minutesOf={getMinutesFromLog}
              projectOfLog={resolveProjectIdForLog}
              activeLabelFor={(id) => { const log = activeLogsByUser.get(String(id)); return log ? resolveActiveLabel(log) : null; }}
              irPara={setActiveTab}
            />
          )}
          {activeTab === "seguranca" && <SegurancaMFA profiles={profiles} />}

          {/* TAB 1: ANÁLISE DE TEMPO */}
          {activeTab === "analytics" && (
            <div className="bz-tab-panel adm-panel">

              {/* Indicadores */}
              <div className="adm-kpis">
                <div className="adm-kpi" style={{ "--k": "var(--adm-accent)" }}>
                  <span className="adm-kpi-ico has-cor">{Icons.Analytics}</span>
                  <span className="adm-kpi-label">Registos no período</span>
                  <span className="adm-kpi-value">{logsFiltered.length}</span>
                </div>
                <div className="adm-kpi" style={{ "--k": "#7c3aed" }}>
                  <span className="adm-kpi-ico has-cor">{Icons.Relogio}</span>
                  <span className="adm-kpi-label">Tempo no filtro</span>
                  <span className="adm-kpi-value">{formatHours(totalMinutesFiltered)}</span>
                </div>
                <div className="adm-kpi" style={{ "--k": "#059669" }}>
                  <span className="adm-kpi-ico has-cor">{Icons.Pulse}</span>
                  <span className="adm-kpi-label">Cronómetros ativos</span>
                  <span className="adm-kpi-value">{activeLogsByUser.size}{activeLogsByUser.size > 0 && <span className="adm-live" aria-hidden="true" />}</span>
                </div>
                <div className="adm-kpi" style={{ "--k": "#0284c7" }}>
                  <span className="adm-kpi-ico has-cor">{Icons.Equipa}</span>
                  <span className="adm-kpi-label">Colaboradores</span>
                  <span className="adm-kpi-value">{profiles.length}</span>
                </div>
              </div>

              {/* Gráficos */}
              <div className="adm-pies">
                <MiniPieChart title="Horas por utilizador" data={chartsData.byUser} palette={["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8"]} />
                <MiniPieChart title="Horas por projeto" data={chartsData.byProject} palette={["#059669", "#10b981", "#34d399", "#6ee7b7", "#047857"]} />
                <MiniPieChart title="Horas por atividade" data={chartsData.byActivity} palette={["#ea580c", "#f97316", "#fb923c", "#fdba74", "#c2410c"]} />
                <MiniPieChart title="Horas por tarefa" data={chartsData.byTask} palette={["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#6d28d9"]} />
              </div>

              {/* Equipa online */}
              <section className="adm-card">
                <div className="adm-card-head">
                  <div><h3>Equipa online</h3><p>Quem já picou o ponto hoje</p></div>
                  <span className="adm-badge is-online"><i className="adm-live" aria-hidden="true" /> {onlineUsers.length} online</span>
                </div>
                {onlineUsers.length === 0 ? (
                  <p className="adm-empty">Nenhum colaborador online de momento.</p>
                ) : (
                  <div className="adm-online">
                    {onlineUsers.map(user => (
                      <div key={user.id} className="adm-online-pessoa">
                        <span className="adm-av is-lg">
                          {user.avatar_url ? <img src={user.avatar_url} alt="" /> : getInitials(user.nome)}
                          <i aria-hidden="true" />
                        </span>
                        <strong>{getSafeFirstName(user.nome, "Colaborador")}</strong>
                        <small>desde {user.hora_entrada}</small>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Financiamento dos projetos */}
              <section className="adm-card">
                <div className="adm-card-head">
                  <div><h3>Financiamento de projetos</h3><p>Investimento, incentivo e taxa de financiamento</p></div>
                  <span className="adm-kpi-ico has-cor" style={{ "--k": "#ca8a04" }}>{Icons.Finance}</span>
                </div>
                {projetosFinanceiros.length === 0 ? (
                  <p className="adm-empty">Sem dados financeiros. Preenche o <b>investimento</b> e o <b>incentivo</b> nos projetos para os ver aqui.</p>
                ) : (
                  <div className="adm-tabela-wrap">
                    <table className="adm-tabela">
                      <thead>
                        <tr>
                          <th>Projeto</th>
                          <th className="is-num">Investimento</th>
                          <th className="is-num">Incentivo</th>
                          <th className="is-num">Autofinanciamento</th>
                          <th className="is-num">Taxa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projetosFinanceiros.map((p) => {
                          const taxa = p.investimento > 0 ? (p.incentivo / p.investimento) * 100 : 0;
                          return (
                            <tr key={p.id}>
                              <td className="is-forte">{p.titulo}</td>
                              <td className="is-num">{formatCurrency(p.investimento)}</td>
                              <td className="is-num is-verde">{formatCurrency(p.incentivo)}</td>
                              <td className="is-num">{formatCurrency(p.autoFinanciamento)}</td>
                              <td className="is-num">
                                <span className="adm-taxa"><span className="adm-taxa-barra"><i style={{ width: `${Math.min(100, taxa)}%` }} /></span><b>{taxa.toFixed(1)}%</b></span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: EQUIPA & ASSIDUIDADE */}
          {activeTab === "equipa" && (
            <section className="bz-tab-panel adm-card">
              <div className="adm-card-head">
                <div><h3>Equipa e assiduidade</h3><p>Presença, tempo em tarefas e o que cada pessoa está a fazer agora</p></div>
              </div>
              <div className="adm-tabela-wrap">
                <table className="adm-tabela">
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>{mode === "day" ? "Entrada hoje" : "Dias presentes"}</th>
                      <th className="is-num">Presença</th>
                      <th className="is-num">Tempo em tarefas</th>
                      <th>A fazer agora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile) => {
                      const active = activeLogsByUser.get(String(profile.id));

                      const tempoTarefas = logsFiltered.filter(l => String(l.user_id) === String(profile.id)).reduce((acc, log) => {
                        if (log.end_time) return acc + getMinutesFromLog(log);
                        const start = new Date(log.start_time || log.created_at);
                        const diffMinutos = Math.floor((currentTime.getTime() - start.getTime()) / 60000);
                        return acc + (diffMinutos > 0 ? diffMinutos : 0);
                      }, 0);

                      const userAssid = assiduidadeFiltered.filter((r) => String(r.user_id) === String(profile.id));
                      let primeiraEntradaStr = "-", totalPresencaMinutos = 0;

                      if (userAssid.length > 0) {
                        if (mode === "day") {
                          const prim = [...userAssid].sort((a, b) => a.hora_entrada.localeCompare(b.hora_entrada))[0];
                          if (prim?.hora_entrada) primeiraEntradaStr = prim.hora_entrada.slice(0, 5);
                        }
                        userAssid.forEach((reg) => {
                          if (!reg.hora_entrada) return;
                          const dStart = new Date(`${reg.data_registo}T${reg.hora_entrada}`);
                          let dEnd;
                          if (reg.hora_saida) dEnd = new Date(`${reg.data_registo}T${reg.hora_saida}`);
                          else if (reg.ultima_pausa_inicio) dEnd = new Date(reg.ultima_pausa_inicio);
                          else dEnd = (reg.data_registo === dateKeyLocal(currentTime)) ? currentTime : dStart;

                          let workSecs = Math.floor((dEnd.getTime() - dStart.getTime()) / 1000) - (Number(reg.tempo_pausa_acumulado) || 0);
                          if (workSecs > 0) totalPresencaMinutos += Math.floor(workSecs / 60);
                        });
                      }

                      return (
                        <tr key={profile.id}>
                          <td>
                            <span className="adm-pessoa">
                              <span className="adm-av is-sm">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : getInitials(profile.nome)}{active && <i aria-hidden="true" />}</span>
                              <span><strong>{profile.nome || "Sem nome"}</strong><small>{profile.role || profile.tipo || "Colaborador"}</small></span>
                            </span>
                          </td>
                          <td className="is-suave">{mode === "day" ? primeiraEntradaStr : `${userAssid.length} dias`}</td>
                          <td className="is-num is-azul">{formatHours(totalPresencaMinutos)}</td>
                          <td className="is-num is-forte">{formatHours(tempoTarefas)}</td>
                          <td>
                            {active ? (
                              <span className="adm-badge is-online" title={resolveActiveLabel(active)}><i className="adm-live" aria-hidden="true" /> {resolveActiveLabel(active)}</span>
                            ) : <span className="is-suave">Sem cronómetro ativo</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 3: GESTÃO INDIVIDUAL */}
          {activeTab === "gestao" && (
            <div className="bz-tab-panel adm-panel">

              {/* Escolher colaborador */}
              <div className="adm-filters">
                <span>Colaborador</span>
                <button type="button" className="adm-filter-btn" onClick={() => setUserModalOpen(true)}>
                  <span>{selectedUserId === "all" ? "Escolher um colaborador…" : selectedProfile?.nome || selectedProfile?.email}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </div>

              {selectedUserId === "all" || !selectedProfile ? (
                <p className="adm-empty">Escolhe um colaborador para ver o trabalho dele, o que tem por fazer e mudar o perfil.</p>
              ) : (
                <>
                  {/* Cabeçalho do colaborador + perfil */}
                  <section className="adm-card adm-gestao-topo">
                    <span className="adm-pessoa is-grande">
                      <span className="adm-av is-lg">{selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} alt="" /> : getInitials(selectedProfile.nome)}</span>
                      <span><strong>{selectedProfile.nome}</strong><small>{selectedProfile.email}</small></span>
                    </span>
                    <div className="adm-perfil">
                      <span>Perfil</span>
                      <SelectModerno
                        value={normalizeRole(selectedProfile.role || selectedProfile.tipo || "colaborador")}
                        onChange={(e) => setProfileTagModal({ open: true, nextTag: e.target.value, password: "", error: "" })}
                        disabled={profileTagSaving}
                        aria-label="Perfil do colaborador"
                        menuWidth={220}
                      >
                        {PROFILE_TAG_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </SelectModerno>
                      {(profileTagSaving || profileTagFeedback) && <em>{profileTagSaving ? "A guardar…" : profileTagFeedback}</em>}
                    </div>
                  </section>

                  {/* Por fazer */}
                  <div className="adm-listas">
                    {[
                      { titulo: "Atividades por fazer", itens: focusedAssignments.atividades, vazio: "Sem atividades.", cor: "#2563eb" },
                      { titulo: "Tarefas por fazer", itens: focusedAssignments.tarefas, vazio: "Sem tarefas.", cor: "#059669" },
                      { titulo: "Passos por fazer", itens: focusedAssignments.subtarefas, vazio: "Sem passos.", cor: "#7c3aed" },
                    ].map((lista) => (
                      <section key={lista.titulo} className="adm-card adm-lista" style={{ "--k": lista.cor }}>
                        <div className="adm-card-head"><div><h3>{lista.titulo}</h3></div><span className="adm-contador">{lista.itens.length}</span></div>
                        <ul>
                          {focusedAssignmentsLoading && <li className="is-vazio">A carregar…</li>}
                          {!focusedAssignmentsLoading && lista.itens.length === 0 && <li className="is-vazio">{lista.vazio}</li>}
                          {lista.itens.map(item => (
                            <li key={item.id} title={item.titulo}>
                              <span>{item.titulo}</span>
                              <em>{String(item.estado || "").replace(/_/g, " ")}</em>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>

                  {/* Trabalho executado no período */}
                  <section className="adm-card">
                    <div className="adm-card-head">
                      <div><h3>Trabalho executado no período</h3><p>{logsFiltered.length} registo{logsFiltered.length === 1 ? "" : "s"}</p></div>
                      <span className="adm-card-big">{formatHours(logsFiltered.reduce((acc, log) => acc + getMinutesFromLog(log), 0))}</span>
                    </div>

                    {logsFiltered.length === 0 ? (
                      <p className="adm-empty">Nenhum registo de tempo neste período.</p>
                    ) : (
                      <div className="adm-tabela-wrap is-alta">
                        <table className="adm-tabela">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Tarefa / passo</th>
                              <th>Estado</th>
                              <th className="is-num">Duração</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logsFiltered.map((log) => {
                              const start = log.start_time ? new Date(log.start_time) : null;
                              const dateFormatted = start ? start.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
                              const tree = getLogTree(log, projectById, activityById, taskById, subtaskById, focusedAssignments);
                              const taskLabel = getTabelaTaskLabel(log, projectById, activityById, taskById, subtaskById, focusedAssignments);
                              const mins = getMinutesFromLog(log);

                              const rawEstado = String(tree.estado || "").trim().toLowerCase();
                              let labelEstado = tree.estado || "Desconhecido";
                              let tomEstado = "";
                              if (rawEstado === "concluido" || rawEstado === "concluído") { labelEstado = "Concluído"; tomEstado = "is-ok"; }
                              else if (rawEstado === "em curso" || rawEstado === "em_curso" || rawEstado === "fazendo") { labelEstado = "Em curso"; tomEstado = "is-curso"; }
                              else if (rawEstado === "pendente" || rawEstado === "a fazer") { labelEstado = "Pendente"; tomEstado = "is-late"; }

                              return (
                                <tr key={log.id}>
                                  <td className="is-suave is-nowrap">{dateFormatted}</td>
                                  <td className="is-forte">{taskLabel}</td>
                                  <td>{tree.estado ? <span className={`adm-badge ${tomEstado}`}>{labelEstado}</span> : <span className="is-suave">-</span>}</td>
                                  <td className="is-num is-verde">{formatHours(mins)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* JANELA: FILTRAR POR PROJETO */}
      <Janela
        aberta={projectModalOpen}
        aoFechar={() => setProjectModalOpen(false)}
        titulo="Filtrar por projeto"
        subtitulo="As métricas passam a contar só o tempo desse projeto."
        icone={Icons.Analytics}
        largura={820}
      >
        <div className="adm-escolhas">
          <button type="button" className={`adm-escolha ${selectedProjectId === "all" ? "is-on" : ""}`} onClick={() => { setSelectedProjectId("all"); setProjectModalOpen(false); }}>
            <strong>Todos os projetos</strong>
            <small>Métricas globais</small>
          </button>
          {projects.map(p => (
            <button key={p.id} type="button" className={`adm-escolha ${selectedProjectId === p.id ? "is-on" : ""}`} onClick={() => { setSelectedProjectId(p.id); setProjectModalOpen(false); }} title={p.titulo}>
              <strong>{p.titulo}</strong>
              <small>{p.codigo_projeto || "Projeto"}</small>
            </button>
          ))}
        </div>
      </Janela>

      {/* JANELA: ESCOLHER COLABORADOR */}
      <Janela
        aberta={userModalOpen}
        aoFechar={() => setUserModalOpen(false)}
        titulo="Escolher colaborador"
        icone={Icons.Equipa}
        largura={820}
      >
        <div className="adm-escolhas">
          {profiles.map(p => (
            <button key={p.id} type="button" className={`adm-escolha is-pessoa ${selectedUserId === p.id ? "is-on" : ""}`} onClick={() => { setSelectedUserId(p.id); setUserModalOpen(false); }} title={p.nome}>
              <span className="adm-av">{p.avatar_url ? <img src={p.avatar_url} alt="" /> : getInitials(p.nome)}</span>
              <span>
                <strong>{p.nome || p.email}</strong>
                <small>{p.role || p.tipo || "Colaborador"}</small>
              </span>
            </button>
          ))}
        </div>
      </Janela>

      {/* MODAL DE MUDANÇA DE PERFIL */}
      <Janela
        aberta={profileTagModal.open}
        aoFechar={() => setProfileTagModal({ open: false, nextTag: "", password: "", error: "" })}
        bloquear={profileTagSaving}
        variante="confirmacao"
        icone={Icons.Gestao}
        titulo="Confirmar alteração de perfil"
        subtitulo={<>Confirma com a <b>tua</b> palavra-passe do Bizin para mudar o perfil do colaborador para <b>{PROFILE_TAG_OPTIONS.find((opt) => opt.value === profileTagModal.nextTag)?.label || profileTagModal.nextTag}</b>.</>}
        rodape={<>
          <button type="button" onClick={() => setProfileTagModal({ open: false, nextTag: "", password: "", error: "" })} disabled={profileTagSaving}>Cancelar</button>
          <button type="button" className="is-primary" onClick={handleUpdateRole} disabled={profileTagSaving}>{profileTagSaving ? "A guardar…" : "Confirmar"}</button>
        </>}
      >
        <label className="adm-campo">
          <span>A tua palavra-passe</span>
          <input
            type="password"
            value={profileTagModal.password}
            onChange={(e) => setProfileTagModal((prev) => ({ ...prev, password: e.target.value, error: "" }))}
            onKeyDown={(e) => e.key === "Enter" && handleUpdateRole()}
            autoComplete="current-password"
          />
        </label>
        {profileTagModal.error && <p className="adm-empty is-erro">{profileTagModal.error}</p>}
      </Janela>
    </div>
  );
}