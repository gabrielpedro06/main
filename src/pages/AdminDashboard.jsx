import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

const PROFILE_TAG_PASSWORD = "admin123";

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
    <div style={{ width: "100%", background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", flex: 1, boxSizing: "border-box" }}>
      <h3 style={{ margin: 0, marginBottom: "16px", color: "var(--color-textPrimary)", fontSize: "0.95rem" }}>{title}</h3>
      {data.length === 0 && <p style={{ margin: 0, color: "var(--color-textSecondary)", fontSize: "0.88rem", flex: 1 }}>Sem dados para este filtro.</p>}
      
      {data.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
          <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, margin: "0 auto" }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {slices.map((s) => s.isFull ? <circle key={s.label} cx={center} cy={center} r={radius} fill={s.color} /> : <path key={s.label} d={s.pathData} fill={s.color} stroke="#ffffff" strokeWidth="1.5" />)}
              <circle cx={center} cy={center} r="32" fill="#ffffff" />
              <text x={center} y={center - 4} textAnchor="middle" style={{ fontSize: "10px", fill: "var(--color-textSecondary)", fontWeight: 700 }}>TOTAL</text>
              <text x={center} y={center + 12} textAnchor="middle" style={{ fontSize: "11px", fill: "var(--color-textPrimary)", fontWeight: 800 }}>{formatHours(total)}</text>
            </svg>
          </div>
          <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", marginTop: "auto" }}>
            {slices.map((slice) => (
              <div key={slice.label} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: slice.color, flexShrink: 0, marginTop: "4px" }} />
                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <span title={slice.label} style={{ color: "var(--color-textPrimary)", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slice.label}</span>
                  <span style={{ color: "var(--color-textSecondary)", fontSize: "0.7rem" }}>{formatHours(slice.value)} ({Math.round(slice.fraction * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const Icons = {
  Analytics: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  Equipa: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Gestao: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Pulse: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  Finance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
};

export default function AdminDashboard() {
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("analytics");
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
    return [tree.p?.titulo, tree.a?.titulo, tree.t?.titulo, tree.s?.titulo].filter(Boolean).join(" > ") || "Em curso";
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

  const handleUpdateRole = async () => {
    if (profileTagModal.password !== PROFILE_TAG_PASSWORD) return setProfileTagModal(p => ({ ...p, error: "Palavra-passe incorreta." }));
    setProfileTagSaving(true);
    const { data, error } = await supabase.from("profiles").update({ role: profileTagModal.nextTag, tipo: profileTagModal.nextTag }).eq("id", selectedUserId).select("*").single();
    if (!error) {
      setProfiles(prev => prev.map(p => String(p.id) === String(selectedUserId) ? data : p));
      setProfileTagFeedback("Atualizado com sucesso.");
    }
    setProfileTagSaving(false);
    setProfileTagModal({ open: false, nextTag: "", password: "", error: "" });
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

  const TabButton = ({ id, label, icon }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "12px 18px",
          background: isActive ? "#fff" : "transparent",
          color: isActive ? "var(--color-textPrimary)" : "var(--color-textSecondary)",
          border: "1px solid",
          borderColor: isActive ? "var(--color-borderColor)" : "transparent",
          borderBottom: isActive ? "1px solid #fff" : "1px solid transparent",
          borderTopLeftRadius: "10px", borderTopRightRadius: "10px",
          marginBottom: "-1px", 
          fontWeight: isActive ? 800 : 600, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.2s",
          transform: isActive ? "translateY(1px)" : "none",
        }}
      >
        {icon} {label}
      </button>
    );
  };

  return (
    <div style={{ padding: "24px", display: "grid", gap: "18px" }}>
      {/* CABEÇALHO DA PÁGINA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "18px 24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", border: "1px solid var(--color-borderColor)", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, color: "var(--color-textPrimary)", fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Painel de Administração</h1>
          <p style={{ margin: "6px 0 0 0", color: "var(--color-textSecondary)" }}>Visão global de utilizadores, assiduidade e gestão de equipa.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--color-bgTertiary)", border: "1px solid var(--color-borderColor)", borderRadius: "12px", padding: "8px 12px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--color-textPrimary)", fontWeight: 700, fontSize: "0.9rem" }}>{firstName}</div>
            <div style={{ color: "var(--color-textSecondary)", fontSize: "0.75rem", fontWeight: 600 }}>Admin · {currentTime.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          <div style={{ width: "40px", height: "40px", borderRadius: "999px", background: "linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, overflow: "hidden" }}>
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              getInitials(userProfile?.nome)
            )}
          </div>
        </div>
      </div>

      {/* ÁREA DE CONTROLO: TABS EM CIMA + FILTROS NUMA LINHA */}
      <div style={{ background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "14px", display: "flex", flexDirection: "column" }}>
        
        <div style={{ display: "flex", gap: "4px", background: "var(--color-bgTertiary)", padding: "14px 14px 0 14px", borderBottom: "1px solid var(--color-borderColor)", borderTopLeftRadius: "14px", borderTopRightRadius: "14px" }}>
          <TabButton id="analytics" label="Visão Global" icon={Icons.Analytics} />
          <TabButton id="equipa" label="Equipa & Assiduidade" icon={Icons.Equipa} />
          <TabButton id="gestao" label="Gestão Individual" icon={Icons.Gestao} />
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", padding: "14px", overflowX: "auto", whiteSpace: "nowrap" }}>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 12px", fontWeight: 700, color: "var(--color-textSecondary)", background: "var(--color-bgTertiary)", outline: "none", cursor: "pointer" }}>
            <option value="day">Modo Diário</option>
            <option value="month">Modo Mensal</option>
            <option value="interval">Personalizado</option>
          </select>
          
          {mode === "day" && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 10px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none" }} />}
          {mode === "month" && <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 10px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none" }} />}
          {mode === "interval" && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 10px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none" }} />
              <span style={{ color: "var(--color-textSecondary)", fontSize: "0.85rem", fontWeight: 600 }}>até</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 10px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none" }} />
            </div>
          )}

          <button
            onClick={() => setProjectModalOpen(true)}
            style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 12px", minWidth: "180px", maxWidth: "260px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none", textAlign: "left", fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentProjectLabel}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: "8px" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>

          {activeTab === "analytics" && (
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 12px", minWidth: "180px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none", cursor: "pointer" }}>
              <option value="all">Todos os Colaboradores</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.nome || p.email}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "14px", padding: "16px", color: "var(--color-textSecondary)" }}>A carregar dados de administração...</div>
      ) : errorMessage ? (
        <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: "14px", padding: "16px", color: "#b91c1c" }}>{errorMessage}</div>
      ) : (
        <>
          {/* TAB 1: VISÃO GLOBAL (ANALYTICS) */}
          {activeTab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              
              {/* KPIs GLOBAIS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div style={{ background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ color: "var(--color-textSecondary)", fontSize: "0.85rem", fontWeight: 600 }}>Total de Registos</div>
                  <div style={{ color: "var(--color-textPrimary)", fontSize: "1.6rem", fontWeight: 800 }}>{logsFiltered.length}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ color: "var(--color-textSecondary)", fontSize: "0.85rem", fontWeight: 600 }}>Tempo no Filtro</div>
                  <div style={{ color: "var(--color-btnPrimary)", fontSize: "1.6rem", fontWeight: 800 }}>{formatHours(totalMinutesFiltered)}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ color: "var(--color-textSecondary)", fontSize: "0.85rem", fontWeight: 600 }}>Cronómetros Ativos</div>
                  <div style={{ color: "#059669", fontSize: "1.6rem", fontWeight: 800 }}>{activeLogsByUser.size}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ color: "var(--color-textSecondary)", fontSize: "0.85rem", fontWeight: 600 }}>Colaboradores Totais</div>
                  <div style={{ color: "var(--color-textPrimary)", fontSize: "1.6rem", fontWeight: 800 }}>{profiles.length}</div>
                </div>
              </div>

              {/* GRÁFICOS PIE + WIDGET EQUIPA ONLINE ("O BURACO") */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "stretch" }}>
                <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex" }}><MiniPieChart title="Horas por Utilizador" data={chartsData.byUser} palette={["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8"]} /></div>
                <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex" }}><MiniPieChart title="Horas por Projeto" data={chartsData.byProject} palette={["#059669", "#10b981", "#34d399", "#6ee7b7", "#047857"]} /></div>
                <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex" }}><MiniPieChart title="Horas por Atividade" data={chartsData.byActivity} palette={["#ea580c", "#f97316", "#fb923c", "#fdba74", "#c2410c"]} /></div>
                <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex" }}><MiniPieChart title="Horas por Tarefa" data={chartsData.byTask} palette={["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#6d28d9"]} /></div>
                
                {/* WIDGET: EQUIPA ONLINE */}
                <div style={{ flex: "2 1 540px", minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--color-borderColor)", overflow: "hidden", display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ borderTop: "4px solid #0f766e", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-borderColor)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {Icons.Pulse}
                        <h3 style={{ margin: 0, color: "var(--color-textPrimary)", fontSize: "1.15rem", fontWeight: 800 }}>Equipa Online</h3>
                      </div>
                      <div style={{ background: "var(--color-bgTertiary)", border: "1px solid var(--color-borderColor)", color: "var(--color-textPrimary)", padding: "4px 12px", borderRadius: "99px", fontSize: "0.85rem", fontWeight: 700 }}>
                        {onlineUsers.length} online
                      </div>
                    </div>
                    
                    <div style={{ padding: "20px", background: "#f8fafc", flex: 1, overflowY: "auto", maxHeight: "250px" }}>
                      {onlineUsers.length === 0 ? (
                        <p style={{ margin: 0, color: "var(--color-textSecondary)", fontSize: "0.9rem", textAlign: "center", padding: "20px 0" }}>Nenhum colaborador online de momento.</p>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "14px" }}>
                          {onlineUsers.map(user => (
                            <div key={user.id} style={{ background: "#fff", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid var(--color-borderColor)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                              <div style={{ position: "relative", marginBottom: "12px" }}>
                                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "1.2rem", overflow: "hidden" }}>
                                  {user.avatar_url ? <img src={user.avatar_url} alt={user.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(user.nome)}
                                </div>
                                <div style={{ position: "absolute", bottom: "0", right: "0", width: "14px", height: "14px", background: "#0f766e", border: "2px solid #fff", borderRadius: "50%" }}></div>
                              </div>
                              <div style={{ fontWeight: 800, color: "var(--color-textPrimary)", fontSize: "0.95rem", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {getSafeFirstName(user.nome, "Colaborador")}
                              </div>
                              <div style={{ color: "var(--color-textSecondary)", fontSize: "0.8rem", marginTop: "4px", fontWeight: 600 }}>
                                {user.hora_entrada}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RENTABILIDADE / FINANCEIRO DOS PROJETOS */}
              <div style={{ background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ borderTop: "4px solid #ca8a04", padding: "16px 20px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--color-borderColor)" }}>
                  <span style={{ color: "#ca8a04" }}>{Icons.Finance}</span>
                  <h3 style={{ margin: 0, color: "var(--color-textPrimary)", fontSize: "1.15rem", fontWeight: 800 }}>Financiamento de Projetos</h3>
                </div>
                <div style={{ padding: "20px", background: "#fafafa" }}>
                  {projetosFinanceiros.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--color-textSecondary)" }}>
                      <p style={{ margin: "0 0 8px 0", fontWeight: 600, fontSize: "1rem", color: "var(--color-textPrimary)" }}>Sem dados financeiros disponíveis.</p>
                      <p style={{ margin: 0, fontSize: "0.9rem" }}>Para ver o desempenho financeiro, preencha os campos <b>investimento</b> e <b>incentivo</b> nos projetos.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "800px" }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontSize: "0.8rem", borderBottom: "1px solid var(--color-borderColor)" }}>Projeto</th>
                            <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontSize: "0.8rem", borderBottom: "1px solid var(--color-borderColor)" }}>Investimento Global</th>
                            <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontSize: "0.8rem", borderBottom: "1px solid var(--color-borderColor)" }}>Incentivo Aprovado</th>
                            <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontSize: "0.8rem", borderBottom: "1px solid var(--color-borderColor)" }}>Auto-financiamento</th>
                            <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontSize: "0.8rem", borderBottom: "1px solid var(--color-borderColor)" }}>Taxa de Financiamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projetosFinanceiros.map((p) => {
                            const taxa = p.investimento > 0 ? ((p.incentivo / p.investimento) * 100).toFixed(2) : 0;
                            return (
                              <tr key={p.id} style={{ background: "#fff", borderBottom: "1px solid var(--color-borderColor)" }}>
                                <td style={{ padding: "12px", fontWeight: 700, color: "var(--color-textPrimary)" }}>{p.titulo}</td>
                                <td style={{ padding: "12px", color: "#b45309", fontWeight: 600 }}>{formatCurrency(p.investimento)}</td>
                                <td style={{ padding: "12px", color: "#059669", fontWeight: 600 }}>{formatCurrency(p.incentivo)}</td>
                                <td style={{ padding: "12px", color: "#d97706", fontWeight: 600 }}>{formatCurrency(p.autoFinanciamento)}</td>
                                <td style={{ padding: "12px", color: "#2563eb", fontWeight: 800 }}>{taxa}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EQUIPA & ASSIDUIDADE */}
          {activeTab === "equipa" && (
            <div style={{ overflowX: "auto", background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "14px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
                <thead>
                  <tr style={{ background: "var(--color-bgTertiary)", textAlign: "left" }}>
                    <th style={{ padding: "12px 16px", color: "var(--color-textSecondary)", fontSize: "0.8rem" }}>Colaborador</th>
                    <th style={{ padding: "12px 16px", color: "var(--color-textSecondary)", fontSize: "0.8rem" }}>{mode === "day" ? "Entrada (Hoje)" : "Dias Presentes"}</th>
                    <th style={{ padding: "12px 16px", color: "var(--color-textSecondary)", fontSize: "0.8rem" }}>Presença (Assiduidade)</th>
                    <th style={{ padding: "12px 16px", color: "var(--color-textSecondary)", fontSize: "0.8rem" }}>Tempo em Tarefas</th>
                    <th style={{ padding: "12px 16px", color: "var(--color-textSecondary)", fontSize: "0.8rem" }}>A fazer agora</th>
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
                      <tr key={profile.id} style={{ borderTop: "1px solid var(--color-borderColor)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 700, color: "var(--color-textPrimary)" }}>{profile.nome || "Sem nome"}</div>
                          <div style={{ color: "var(--color-textSecondary)", fontSize: "0.78rem", textTransform: "capitalize" }}>{profile.role || profile.tipo || "Colaborador"}</div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--color-textSecondary)", fontWeight: 600 }}>{mode === "day" ? primeiraEntradaStr : `${userAssid.length} dias`}</td>
                        <td style={{ padding: "12px 16px", color: "#0ea5e9", fontWeight: 800 }}>{formatHours(totalPresencaMinutos)}</td>
                        <td style={{ padding: "12px 16px", color: "var(--color-textPrimary)", fontWeight: 800 }}>{formatHours(tempoTarefas)}</td>
                        <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: active ? "#166534" : "var(--color-textSecondary)" }}>
                          {active ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#dcfce7", padding: "4px 8px", borderRadius: "6px", fontWeight: 700 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} /> {resolveActiveLabel(active)}
                            </span>
                          ) : "Sem cronómetro ativo"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: GESTÃO INDIVIDUAL */}
          {activeTab === "gestao" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              
              <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "14px", padding: "16px" }}>
                <span style={{ color: "var(--color-textPrimary)", fontWeight: 700, fontSize: "0.95rem" }}>Selecionar Colaborador:</span>
                
                <button
                  onClick={() => setUserModalOpen(true)}
                  style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 12px", minWidth: "250px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none", textAlign: "left", fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedUserId === "all" ? "-- Escolha um colaborador --" : selectedProfile?.nome || selectedProfile?.email}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: "8px" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

              </div>

              {selectedUserId !== "all" && selectedProfile && (
                <div style={{ background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "14px", padding: "14px", display: "grid", gap: "12px" }}>
                  
                  {/* SECCAO 1: CABECALHO DO USER E MUDAR ROLE */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "999px", background: "linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, overflow: "hidden" }}>
                        {selectedProfile.avatar_url ? (
                          <img src={selectedProfile.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          getInitials(selectedProfile.nome)
                        )}
                      </div>
                      <h3 style={{ margin: 0, color: "var(--color-textPrimary)", fontSize: "1.1rem" }}>Painel de Gestão: {selectedProfile.nome}</h3>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--color-bgTertiary)", border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 12px" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--color-textSecondary)", fontWeight: 700 }}>Tag de Perfil:</span>
                      <select
                        value={normalizeRole(selectedProfile.role || selectedProfile.tipo || "colaborador")}
                        onChange={(e) => setProfileTagModal({ open: true, nextTag: e.target.value, password: "", error: "" })}
                        disabled={profileTagSaving}
                        style={{ border: "1px solid var(--color-borderColor)", borderRadius: "8px", padding: "4px 8px", fontWeight: 700, color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none", cursor: "pointer" }}
                      >
                        {PROFILE_TAG_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <span style={{ fontSize: "0.78rem", color: profileTagSaving ? "var(--color-btnPrimary)" : "var(--color-textSecondary)", fontWeight: 700 }}>
                        {profileTagSaving ? "A guardar..." : profileTagFeedback}
                      </span>
                    </div>
                  </div>

                  {/* SECCAO 2: TAREFAS PENDENTES (CAIXAS) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                    <div style={{ border: "1px solid var(--color-borderColor)", borderRadius: "12px", padding: "10px" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#2563eb", marginBottom: "8px" }}>Atividades por fazer ({focusedAssignments.atividades.length})</div>
                      <div style={{ display: "grid", gap: "6px", maxHeight: "220px", overflowY: "auto" }}>
                        {focusedAssignmentsLoading && <span style={{ fontSize: "0.78rem", color: "var(--color-textSecondary)" }}>A carregar...</span>}
                        {focusedAssignments.atividades.length === 0 && <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Sem atividades.</span>}
                        {focusedAssignments.atividades.map(item => (
                          <div key={item.id} style={{ fontSize: "0.8rem", color: "var(--color-textPrimary)", background: "var(--color-bgTertiary)", borderRadius: "8px", padding: "6px 8px", display: "flex", justifyContent: "space-between" }} title={item.titulo}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.titulo}</span>
                            <span style={{ fontSize: "0.72rem", color: "#0f766e", fontWeight: 700 }}>{item.estado}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: "1px solid var(--color-borderColor)", borderRadius: "12px", padding: "10px" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#059669", marginBottom: "8px" }}>Tarefas por fazer ({focusedAssignments.tarefas.length})</div>
                      <div style={{ display: "grid", gap: "6px", maxHeight: "220px", overflowY: "auto" }}>
                        {focusedAssignmentsLoading && <span style={{ fontSize: "0.78rem", color: "var(--color-textSecondary)" }}>A carregar...</span>}
                        {focusedAssignments.tarefas.length === 0 && <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Sem tarefas.</span>}
                        {focusedAssignments.tarefas.map(item => (
                          <div key={item.id} style={{ fontSize: "0.8rem", color: "var(--color-textPrimary)", background: "var(--color-bgTertiary)", borderRadius: "8px", padding: "6px 8px", display: "flex", justifyContent: "space-between" }} title={item.titulo}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.titulo}</span>
                            <span style={{ fontSize: "0.72rem", color: "#0f766e", fontWeight: 700 }}>{item.estado}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: "1px solid var(--color-borderColor)", borderRadius: "12px", padding: "10px" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#7c3aed", marginBottom: "8px" }}>Subtarefas por fazer ({focusedAssignments.subtarefas.length})</div>
                      <div style={{ display: "grid", gap: "6px", maxHeight: "220px", overflowY: "auto" }}>
                        {focusedAssignmentsLoading && <span style={{ fontSize: "0.78rem", color: "var(--color-textSecondary)" }}>A carregar...</span>}
                        {focusedAssignments.subtarefas.length === 0 && <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Sem subtarefas.</span>}
                        {focusedAssignments.subtarefas.map(item => (
                          <div key={item.id} style={{ fontSize: "0.8rem", color: "var(--color-textPrimary)", background: "var(--color-bgTertiary)", borderRadius: "8px", padding: "6px 8px", display: "flex", justifyContent: "space-between" }} title={item.titulo}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.titulo}</span>
                            <span style={{ fontSize: "0.72rem", color: "#0f766e", fontWeight: 700 }}>{item.estado}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SECCAO 3: TRABALHO EXECUTADO NESTE PERIODO */}
                  <div style={{ borderTop: "1px solid var(--color-borderColor)", margin: "16px -14px -14px -14px", padding: "16px 14px", background: "var(--color-bgTertiary)", borderRadius: "0 0 14px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h4 style={{ margin: 0, color: "var(--color-textPrimary)", fontSize: "0.95rem", fontWeight: 800 }}>Trabalho Executado neste período ({logsFiltered.length} registos)</h4>
                      <span style={{ fontSize: "0.85rem", color: "#059669", fontWeight: 800 }}>Total investido: {formatHours(logsFiltered.reduce((acc, log) => acc + getMinutesFromLog(log), 0))}</span>
                    </div>

                    {logsFiltered.length === 0 ? (
                      <p style={{ margin: 0, color: "var(--color-textSecondary)", fontSize: "0.85rem" }}>Nenhum registo de tempo encontrado.</p>
                    ) : (
                      <div style={{ maxHeight: "280px", overflowY: "auto", background: "#fff", border: "1px solid var(--color-borderColor)", borderRadius: "10px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
                          <thead style={{ background: "var(--color-bgTertiary)", position: "sticky", top: 0 }}>
                            <tr>
                              <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontWeight: 700 }}>Data</th>
                              <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontWeight: 700 }}>Tarefa / Subtarefa executada</th>
                              <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontWeight: 700 }}>Estado</th>
                              <th style={{ padding: "8px 12px", color: "var(--color-textSecondary)", fontWeight: 700 }}>Duração</th>
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
                              let bgEstado = "var(--color-bgTertiary)";
                              let corEstado = "var(--color-textSecondary)";
                              
                              if (rawEstado === "concluido" || rawEstado === "concluído") { labelEstado = "Concluído"; bgEstado = "#dcfce7"; corEstado = "#166534"; } 
                              else if (rawEstado === "em curso" || rawEstado === "fazendo") { labelEstado = "Em curso"; bgEstado = "#e0f2fe"; corEstado = "#0369a1"; } 
                              else if (rawEstado === "pendente" || rawEstado === "a fazer") { labelEstado = "Pendente"; bgEstado = "#fef3c7"; corEstado = "#b45309"; }

                              return (
                                <tr key={log.id} style={{ borderTop: "1px solid var(--color-borderColor)" }}>
                                  <td style={{ padding: "8px 12px", color: "var(--color-textSecondary)", whiteSpace: "nowrap" }}>{dateFormatted}</td>
                                  <td style={{ padding: "8px 12px", color: "var(--color-textPrimary)", fontWeight: 600 }}>{taskLabel}</td>
                                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                    {tree.estado ? <span style={{ background: bgEstado, color: corEstado, padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, textTransform: "capitalize" }}>{labelEstado}</span> : <span style={{ color: "#94a3b8" }}>-</span>}
                                  </td>
                                  <td style={{ padding: "8px 12px", color: "#059669", fontWeight: 700 }}>{formatHours(mins)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL DE SELEÇÃO DE PROJETOS (CARDS) */}
      {projectModalOpen && (
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "24px" }} 
          onClick={(e) => e.target === e.currentTarget && setProjectModalOpen(false)}
        >
          <div style={{ width: "100%", maxWidth: "800px", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: "16px", border: "1px solid var(--color-borderColor)", boxShadow: "0 24px 48px rgba(15,23,42,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid var(--color-borderColor)" }}>
              <h3 style={{ margin: 0, color: "var(--color-textPrimary)", fontSize: "1.2rem", fontWeight: 800 }}>Filtrar por Projeto</h3>
              <button onClick={() => setProjectModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-textSecondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              <div
                onClick={() => { setSelectedProjectId("all"); setProjectModalOpen(false); }}
                style={{ border: selectedProjectId === "all" ? "2px solid var(--color-btnPrimary)" : "1px solid var(--color-borderColor)", background: selectedProjectId === "all" ? "var(--color-bgTertiary)" : "#fff", borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "all 0.2s" }}
              >
                <div style={{ fontWeight: 800, color: "var(--color-textPrimary)" }}>Todos os Projetos</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-textSecondary)", marginTop: "4px" }}>Ver métricas globais</div>
              </div>
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setSelectedProjectId(p.id); setProjectModalOpen(false); }}
                  style={{ border: selectedProjectId === p.id ? "2px solid var(--color-btnPrimary)" : "1px solid var(--color-borderColor)", background: selectedProjectId === p.id ? "var(--color-bgTertiary)" : "#fff", borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ fontWeight: 800, color: "var(--color-textPrimary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.titulo}>{p.titulo}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-textSecondary)", marginTop: "4px" }}>Selecionar projeto</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE COLABORADOR (CARDS COM AVATAR) */}
      {userModalOpen && (
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "24px" }} 
          onClick={(e) => e.target === e.currentTarget && setUserModalOpen(false)}
        >
          <div style={{ width: "100%", maxWidth: "800px", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: "16px", border: "1px solid var(--color-borderColor)", boxShadow: "0 24px 48px rgba(15,23,42,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid var(--color-borderColor)" }}>
              <h3 style={{ margin: 0, color: "var(--color-textPrimary)", fontSize: "1.2rem", fontWeight: 800 }}>Selecionar Colaborador</h3>
              <button onClick={() => setUserModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-textSecondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {profiles.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setSelectedUserId(p.id); setUserModalOpen(false); }}
                  style={{
                    border: selectedUserId === p.id ? "2px solid var(--color-btnPrimary)" : "1px solid var(--color-borderColor)",
                    background: selectedUserId === p.id ? "var(--color-bgTertiary)" : "#fff",
                    borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: "12px"
                  }}
                >
                  <div style={{ width: "42px", height: "42px", borderRadius: "999px", background: "linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, overflow: "hidden", flexShrink: 0 }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(p.nome)}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 800, color: "var(--color-textPrimary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.nome}>{p.nome || p.email}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-textSecondary)", textTransform: "capitalize", marginTop: "2px" }}>{p.role || p.tipo || "Colaborador"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MUDANÇA DE PERFIL */}
      {profileTagModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }} onClick={(e) => e.target === e.currentTarget && setProfileTagModal({ open: false, nextTag: "", password: "", error: "" })}>
          <div style={{ width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "14px", border: "1px solid var(--color-borderColor)", boxShadow: "0 24px 48px rgba(15,23,42,0.2)", padding: "20px", display: "grid", gap: "12px" }}>
            <h3 style={{ margin: 0, color: "var(--color-textPrimary)", fontSize: "1.1rem" }}>Confirmar alteração de perfil</h3>
            <p style={{ margin: 0, color: "var(--color-textSecondary)", fontSize: "0.9rem" }}>Introduz a palavra-passe para alterar a tag do colaborador para <b>{PROFILE_TAG_OPTIONS.find((opt) => opt.value === profileTagModal.nextTag)?.label || profileTagModal.nextTag}</b>.</p>
            <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", color: "var(--color-textPrimary)", fontWeight: 700, marginTop: "8px" }}>
              Palavra-passe de administração
              <input
                type="password"
                value={profileTagModal.password}
                onChange={(e) => setProfileTagModal((prev) => ({ ...prev, password: e.target.value, error: "" }))}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateRole()}
                autoFocus
                style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "10px 12px", fontSize: "0.95rem", color: "var(--color-textSecondary)", background: "var(--color-textWhite)", outline: "none" }}
              />
            </label>
            {profileTagModal.error && <div style={{ color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 10px", fontSize: "0.8rem", fontWeight: 700 }}>{profileTagModal.error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button type="button" onClick={() => setProfileTagModal({ open: false, nextTag: "", password: "", error: "" })} disabled={profileTagSaving} style={{ border: "1px solid var(--color-borderColor)", background: "var(--color-bgTertiary)", color: "var(--color-textSecondary)", borderRadius: "10px", padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
              <button type="button" onClick={handleUpdateRole} disabled={profileTagSaving} style={{ border: "none", background: "linear-gradient(135deg, var(--color-btnPrimary) 0%, var(--color-btnPrimaryDark) 100%)", color: "var(--color-textWhite)", borderRadius: "10px", padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>
                {profileTagSaving ? "A guardar..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}