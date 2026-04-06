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
    // Postgres array literal format: {a,b,c}
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((part) => part.replace(/^"|"$/g, "").trim())
        .filter(Boolean);
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

function isAssignedToUser(item, userId) {
  if (!item || !userId) return false;
  const normalizedUserId = String(userId);
  const direct = [
    item?.responsavel_id,
    item?.responsavelId,
    item?.responsavel,
    item?.user_id,
  ]
    .filter(Boolean)
    .some((value) => String(value) === normalizedUserId);
  const extra = toArray(item?.colaboradores_extra).some((id) => String(id) === normalizedUserId);
  return direct || extra;
}

function isOpenEstado(estado) {
  const value = String(estado || "").trim().toLowerCase();
  return value !== "concluido" && value !== "concluído" && value !== "cancelado";
}

function getTodayDateInput() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  const size = 220;
  const radius = 84;
  const center = 110;

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

    const pathData = isFull
      ? ""
      : [
          `M ${center} ${center}`,
          `L ${startX} ${startY}`,
          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          "Z",
        ].join(" ");

    currentAngle = endAngle;
    return { ...item, color, pathData, fraction, isFull };
  });

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px" }}>
      <h3 style={{ margin: 0, marginBottom: "12px", color: "#1e293b", fontSize: "0.95rem" }}>{title}</h3>
      {data.length === 0 && <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.88rem" }}>Sem dados para este filtro.</p>}
      <div style={{ display: "grid", gap: "12px" }}>
        <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, margin: "0 auto" }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={title} role="img">
            {slices.map((slice) => (
              slice.isFull
                ? <circle key={slice.label} cx={center} cy={center} r={radius} fill={slice.color} stroke="#ffffff" strokeWidth="1.5" />
                : <path key={slice.label} d={slice.pathData} fill={slice.color} stroke="#ffffff" strokeWidth="1.5" />
            ))}
            <circle cx={center} cy={center} r="38" fill="#ffffff" />
            <text x={center} y={center - 4} textAnchor="middle" style={{ fontSize: "11px", fill: "#64748b", fontWeight: 700 }}>TOTAL</text>
            <text x={center} y={center + 12} textAnchor="middle" style={{ fontSize: "12px", fill: "#0f172a", fontWeight: 800 }}>
              {formatHours(total)}
            </text>
          </svg>
        </div>

        <div className="admin-pie-legend" style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {slices.map((slice) => {
            const percent = Math.round(slice.fraction * 100);
            return (
              <div key={slice.label} style={{ display: "grid", gridTemplateColumns: "14px 1fr auto", gap: "8px", alignItems: "center" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: slice.color }} />
                <span title={slice.label} style={{ color: "#334155", fontSize: "0.8rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slice.label}</span>
                <span style={{ color: "#475569", fontSize: "0.78rem", whiteSpace: "nowrap" }}>{formatHours(slice.value)} ({percent}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);

  const [mode, setMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(getTodayDateInput());
  const [selectedMonth, setSelectedMonth] = useState(getMonthInput());
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [focusedAssignmentsLoading, setFocusedAssignmentsLoading] = useState(false);
  const [focusedAssignments, setFocusedAssignments] = useState({
    atividades: [],
    tarefas: [],
    subtarefas: [],
  });
  const [profileTagSaving, setProfileTagSaving] = useState(false);
  const [profileTagFeedback, setProfileTagFeedback] = useState("");
  const [profileTagModal, setProfileTagModal] = useState({
    open: false,
    nextTag: "",
    password: "",
    error: "",
  });

  const isAdmin = useMemo(() => {
    const role = normalizeRole(userProfile?.role || userProfile?.tipo);
    return role === "admin" || role === "administrador";
  }, [userProfile]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setErrorMessage("");

      const [profilesRes, projectsRes, activitiesRes, tasksRes, subtasksRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("projetos").select("*").order("titulo"),
        supabase.from("atividades").select("*").order("titulo"),
        supabase.from("tarefas").select("*").order("titulo"),
        supabase.from("subtarefas").select("*").order("titulo"),
        supabase.from("task_logs").select("*").order("start_time", { ascending: false }).limit(5000),
      ]);

      const anyError =
        profilesRes.error ||
        projectsRes.error ||
        activitiesRes.error ||
        tasksRes.error ||
        subtasksRes.error ||
        logsRes.error;

      if (anyError) {
        if (!mounted) return;
        setErrorMessage(anyError.message || "Erro ao carregar dados de administração.");
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
      setLoading(false);
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const projectById = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => map.set(String(p.id), p));
    return map;
  }, [projects]);

  const activityById = useMemo(() => {
    const map = new Map();
    activities.forEach((a) => map.set(String(a.id), a));
    return map;
  }, [activities]);

  const taskById = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => map.set(String(t.id), t));
    return map;
  }, [tasks]);

  const subtaskById = useMemo(() => {
    const map = new Map();
    subtasks.forEach((s) => map.set(String(s.id), s));
    return map;
  }, [subtasks]);

  const resolveProjectIdForLog = (log) => {
    if (log?.projeto_id) return String(log.projeto_id);
    if (log?.project_id) return String(log.project_id);

    if (log?.atividade_id) {
      const a = activityById.get(String(log.atividade_id));
      if (a?.projeto_id) return String(a.projeto_id);
    }

    if (log?.task_id) {
      const t = taskById.get(String(log.task_id));
      const a = t?.atividade_id ? activityById.get(String(t.atividade_id)) : null;
      if (a?.projeto_id) return String(a.projeto_id);
    }

    if (log?.subtarefa_id) {
      const s = subtaskById.get(String(log.subtarefa_id));
      const t = s?.tarefa_id ? taskById.get(String(s.tarefa_id)) : null;
      const a = t?.atividade_id ? activityById.get(String(t.atividade_id)) : null;
      if (a?.projeto_id) return String(a.projeto_id);
    }

    return null;
  };

  const resolveActiveLabel = (log) => {
    if (!log) return "Sem atividade ativa";

    if (log.subtarefa_id) {
      const s = subtaskById.get(String(log.subtarefa_id));
      const t = s?.tarefa_id ? taskById.get(String(s.tarefa_id)) : null;
      const a = t?.atividade_id ? activityById.get(String(t.atividade_id)) : null;
      const p = a?.projeto_id ? projectById.get(String(a.projeto_id)) : null;
      return [p?.titulo, a?.titulo, t?.titulo, s?.titulo].filter(Boolean).join(" > ") || "Subtarefa em curso";
    }

    if (log.task_id) {
      const t = taskById.get(String(log.task_id));
      const a = t?.atividade_id ? activityById.get(String(t.atividade_id)) : null;
      const p = a?.projeto_id ? projectById.get(String(a.projeto_id)) : null;
      return [p?.titulo, a?.titulo, t?.titulo].filter(Boolean).join(" > ") || "Tarefa em curso";
    }

    if (log.atividade_id) {
      const a = activityById.get(String(log.atividade_id));
      const p = a?.projeto_id ? projectById.get(String(a.projeto_id)) : null;
      return [p?.titulo, a?.titulo].filter(Boolean).join(" > ") || "Atividade em curso";
    }

    const projectId = log?.projeto_id || log?.project_id;
    if (projectId) {
      const p = projectById.get(String(projectId));
      return p?.titulo || "Projeto em curso";
    }

    return "Tempo em curso";
  };

  const logsFiltered = useMemo(() => {
    const dayKey = selectedDate;
    const monthKey = selectedMonth;

    return taskLogs.filter((log) => {
      if (!log?.end_time) return false;
      const minutes = getMinutesFromLog(log);
      if (minutes <= 0) return false;

      const reference = log?.end_time || log?.start_time || log?.created_at;
      const key = dateKeyLocal(reference);
      if (!key) return false;

      if (mode === "day" && key !== dayKey) return false;
      if (mode === "month" && key.slice(0, 7) !== monthKey) return false;

      if (selectedProjectId !== "all") {
        const resolvedProjectId = resolveProjectIdForLog(log);
        if (!resolvedProjectId || String(resolvedProjectId) !== String(selectedProjectId)) return false;
      }

      if (selectedUserId !== "all" && String(log.user_id) !== String(selectedUserId)) {
        return false;
      }

      return true;
    });
  }, [mode, selectedDate, selectedMonth, selectedProjectId, selectedUserId, taskLogs, activityById, taskById, subtaskById]);

  const aggregateBy = (items, labelGetter) => {
    const map = new Map();
    items.forEach((log) => {
      const label = labelGetter(log);
      const minutes = getMinutesFromLog(log);
      if (!label || minutes <= 0) return;
      map.set(label, (map.get(label) || 0) + minutes);
    });

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  const chartsData = useMemo(() => {
    const byUser = aggregateBy(logsFiltered, (log) => {
      const p = profiles.find((profile) => String(profile.id) === String(log.user_id));
      return p?.nome || `Utilizador ${String(log.user_id).slice(0, 8)}`;
    });

    const byProject = aggregateBy(logsFiltered, (log) => {
      const projectId = resolveProjectIdForLog(log);
      if (!projectId) return "Sem projeto";
      const p = projectById.get(String(projectId));
      return p?.titulo || `Projeto ${String(projectId).slice(0, 8)}`;
    });

    const byActivity = aggregateBy(logsFiltered, (log) => {
      if (log?.atividade_id) {
        const a = activityById.get(String(log.atividade_id));
        return a?.titulo || `Atividade ${String(log.atividade_id).slice(0, 8)}`;
      }
      if (log?.task_id) {
        const t = taskById.get(String(log.task_id));
        const a = t?.atividade_id ? activityById.get(String(t.atividade_id)) : null;
        if (a) return a.titulo || `Atividade ${String(a.id).slice(0, 8)}`;
      }
      if (log?.subtarefa_id) {
        const s = subtaskById.get(String(log.subtarefa_id));
        const t = s?.tarefa_id ? taskById.get(String(s.tarefa_id)) : null;
        const a = t?.atividade_id ? activityById.get(String(t.atividade_id)) : null;
        if (a) return a.titulo || `Atividade ${String(a.id).slice(0, 8)}`;
      }
      return "Sem atividade";
    });

    const byTask = aggregateBy(logsFiltered, (log) => {
      if (log?.task_id) {
        const t = taskById.get(String(log.task_id));
        return t?.titulo || `Tarefa ${String(log.task_id).slice(0, 8)}`;
      }
      if (log?.subtarefa_id) {
        const s = subtaskById.get(String(log.subtarefa_id));
        const t = s?.tarefa_id ? taskById.get(String(s.tarefa_id)) : null;
        if (t) return t.titulo || `Tarefa ${String(t.id).slice(0, 8)}`;
      }
      return "Sem tarefa";
    });

    return { byUser, byProject, byActivity, byTask };
  }, [logsFiltered, profiles, activityById, taskById, subtaskById, projectById]);

  const activeLogsByUser = useMemo(() => {
    const map = new Map();
    taskLogs
      .filter((log) => !log?.end_time)
      .forEach((log) => {
        const userId = String(log.user_id);
        const existing = map.get(userId);
        if (!existing) {
          map.set(userId, log);
          return;
        }

        const existingStart = new Date(existing.start_time || existing.created_at || 0).getTime();
        const currentStart = new Date(log.start_time || log.created_at || 0).getTime();
        if (currentStart > existingStart) map.set(userId, log);
      });

    return map;
  }, [taskLogs]);

  const pendingByUser = useMemo(() => {
    const map = new Map();

    const ensure = (userId) => {
      const key = String(userId);
      if (!map.has(key)) {
        map.set(key, { atividades: 0, tarefas: 0, subtarefas: 0 });
      }
      return map.get(key);
    };

    const isOpen = (estado) => {
      const value = String(estado || "").toLowerCase();
      return value !== "concluido" && value !== "cancelado";
    };

    activities.forEach((item) => {
      if (!isOpen(item.estado)) return;
      const ids = new Set([item.responsavel_id, ...toArray(item.colaboradores_extra)].filter(Boolean));
      ids.forEach((id) => {
        ensure(id).atividades += 1;
      });
    });

    tasks.forEach((item) => {
      if (!isOpen(item.estado)) return;
      const ids = new Set([item.responsavel_id, ...toArray(item.colaboradores_extra)].filter(Boolean));
      ids.forEach((id) => {
        ensure(id).tarefas += 1;
      });
    });

    subtasks.forEach((item) => {
      if (!isOpen(item.estado)) return;
      const ids = new Set([item.responsavel_id, ...toArray(item.colaboradores_extra)].filter(Boolean));
      ids.forEach((id) => {
        ensure(id).subtarefas += 1;
      });
    });

    return map;
  }, [activities, tasks, subtasks]);

  const totalMinutesFiltered = useMemo(
    () => logsFiltered.reduce((acc, log) => acc + getMinutesFromLog(log), 0),
    [logsFiltered]
  );

  const totalPending = useMemo(() => {
    let total = 0;
    pendingByUser.forEach((item) => {
      total += item.atividades + item.tarefas + item.subtarefas;
    });
    return total;
  }, [pendingByUser]);

  const totalUsersWithActiveTimers = activeLogsByUser.size;
  const firstName = getSafeFirstName(userProfile?.nome, "Admin");
  const nowTime = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  const isFocusedUserMode = selectedUserId !== "all";
  const selectedProfile = isFocusedUserMode
    ? profiles.find((profile) => String(profile.id) === String(selectedUserId)) || null
    : null;

  const selectedPending = selectedProfile
    ? pendingByUser.get(String(selectedProfile.id)) || { atividades: 0, tarefas: 0, subtarefas: 0 }
    : { atividades: 0, tarefas: 0, subtarefas: 0 };

  const selectedActiveLog = selectedProfile
    ? activeLogsByUser.get(String(selectedProfile.id)) || null
    : null;

  useEffect(() => {
    let cancelled = false;

    async function loadFocusedAssignments() {
      if (!isFocusedUserMode || !selectedUserId) {
        setFocusedAssignments({ atividades: [], tarefas: [], subtarefas: [] });
        return;
      }

      setFocusedAssignmentsLoading(true);
      const userId = String(selectedUserId);

      const [ativRespRes, ativExtraRes, tarefaRespRes, tarefaExtraRes, subRespRes, subExtraARes, subExtraBRes] = await Promise.all([
        supabase
          .from("atividades")
          .select("*")
          .eq("responsavel_id", userId)
          .neq("estado", "concluido")
          .neq("estado", "cancelado"),
        supabase
          .from("atividades")
          .select("*")
          .contains("colaboradores_extra", [userId])
          .neq("estado", "concluido")
          .neq("estado", "cancelado"),
        supabase
          .from("tarefas")
          .select("*")
          .eq("responsavel_id", userId)
          .neq("estado", "concluido")
          .neq("estado", "cancelado"),
        supabase
          .from("tarefas")
          .select("*")
          .contains("colaboradores_extra", [userId])
          .neq("estado", "concluido")
          .neq("estado", "cancelado"),
        supabase
          .from("subtarefas")
          .select("*")
          .eq("responsavel_id", userId)
          .neq("estado", "concluido")
          .neq("estado", "cancelado"),
        supabase
          .from("subtarefas")
          .select("*")
          .contains("colaboradores_extra", [userId])
          .neq("estado", "concluido")
          .neq("estado", "cancelado"),
        supabase
          .from("subtarefas")
          .select("*")
          .contains("colaboradores", [userId])
          .neq("estado", "concluido")
          .neq("estado", "cancelado"),
      ]);

      if (ativExtraRes.error) console.warn("Filtro por colaboradores_extra (atividades) indisponível:", ativExtraRes.error.message);
      if (tarefaExtraRes.error) console.warn("Filtro por colaboradores_extra (tarefas) indisponível:", tarefaExtraRes.error.message);
      if (subExtraARes.error) console.warn("Filtro por colaboradores_extra (subtarefas) indisponível:", subExtraARes.error.message);
      if (subExtraBRes.error) console.warn("Filtro por colaboradores (subtarefas) indisponível:", subExtraBRes.error.message);

      const dedupeById = (items) => {
        const map = new Map();
        (items || []).forEach((item) => {
          if (!item?.id) return;
          if (!isOpenEstado(item.estado)) return;
          map.set(String(item.id), item);
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      };

      const nextAssignments = {
        atividades: dedupeById([...(ativRespRes.data || []), ...(ativExtraRes.data || [])]),
        tarefas: dedupeById([...(tarefaRespRes.data || []), ...(tarefaExtraRes.data || [])]),
        subtarefas: dedupeById([...(subRespRes.data || []), ...(subExtraARes.data || []), ...(subExtraBRes.data || [])]),
      };

      if (cancelled) return;
      setFocusedAssignments(nextAssignments);
      setFocusedAssignmentsLoading(false);
    }

    loadFocusedAssignments();

    return () => {
      cancelled = true;
    };
  }, [isFocusedUserMode, selectedUserId]);

  const selectedUserAssignments = useMemo(() => {
    if (!isFocusedUserMode) {
      return { atividades: [], tarefas: [], subtarefas: [] };
    }

    return focusedAssignments;
  }, [isFocusedUserMode, focusedAssignments]);

  const handleUpdateSelectedProfileTag = async (nextTag) => {
    if (!selectedProfile?.id || !nextTag) return;

    const currentTag = normalizeRole(selectedProfile.role || selectedProfile.tipo || "colaborador");
    if (normalizeRole(nextTag) === currentTag) return;

    setProfileTagModal({
      open: true,
      nextTag,
      password: "",
      error: "",
    });
  };

  const closeProfileTagModal = () => {
    setProfileTagModal({
      open: false,
      nextTag: "",
      password: "",
      error: "",
    });
  };

  const confirmProfileTagChange = async () => {
    if (!selectedProfile?.id || !profileTagModal.nextTag) return;

    if (profileTagModal.password !== PROFILE_TAG_PASSWORD) {
      setProfileTagModal((prev) => ({
        ...prev,
        error: "Palavra-passe incorreta.",
      }));
      return;
    }

    setProfileTagSaving(true);
    setProfileTagFeedback("");

    const payload = {
      role: profileTagModal.nextTag,
      tipo: profileTagModal.nextTag,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", selectedProfile.id)
      .select("*")
      .single();

    if (error) {
      setProfileTagSaving(false);
      setProfileTagFeedback("Erro ao atualizar perfil.");
      return;
    }

    setProfiles((prev) => prev.map((profile) => (String(profile.id) === String(selectedProfile.id) ? (data || { ...profile, ...payload }) : profile)));
    setProfileTagSaving(false);
    setProfileTagFeedback("Perfil atualizado.");
    closeProfileTagModal();
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

  return (
    <div style={{ padding: "24px", display: "grid", gap: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "18px 24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", border: "1px solid #ebe7df", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Painel de Administração</h1>
          <p style={{ margin: "6px 0 0 0", color: "#64748b" }}>Visão global de utilizadores, execução atual e tempos por projeto, atividade e tarefa.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f7f4ee", border: "1px solid #ebe7df", borderRadius: "12px", padding: "8px 12px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#334151", fontWeight: 700, fontSize: "0.9rem" }}>{firstName}</div>
            <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}>Admin · {nowTime}</div>
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

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px", display: "grid", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setMode("month")}
            style={{
              border: "1px solid var(--color-borderColor)",
              background: mode === "month" ? "linear-gradient(135deg, var(--color-btnPrimary) 0%, var(--color-btnPrimaryDark) 100%)" : "var(--color-bgTertiary)",
              color: mode === "month" ? "var(--color-textWhite)" : "var(--color-textSecondary)",
              borderRadius: "10px",
              padding: "8px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Modo Mensal
          </button>
          <button
            type="button"
            onClick={() => setMode("day")}
            style={{
              border: "1px solid var(--color-borderColor)",
              background: mode === "day" ? "linear-gradient(135deg, var(--color-btnPrimary) 0%, var(--color-btnPrimaryDark) 100%)" : "var(--color-bgTertiary)",
              color: mode === "day" ? "var(--color-textWhite)" : "var(--color-textSecondary)",
              borderRadius: "10px",
              padding: "8px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Modo Diário
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {mode === "month" ? (
            <label style={{ display: "grid", gap: "4px", color: "#334155", fontSize: "0.85rem" }}>
              Mês
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 10px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)" }}
              />
            </label>
          ) : (
            <label style={{ display: "grid", gap: "4px", color: "#334155", fontSize: "0.85rem" }}>
              Dia
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 10px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)" }}
              />
            </label>
          )}

          <label style={{ display: "grid", gap: "4px", color: "#334155", fontSize: "0.85rem" }}>
            Projeto
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 10px", minWidth: "220px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)" }}
            >
              <option value="all">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.titulo}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "4px", color: "#334155", fontSize: "0.85rem" }}>
            Colaborador
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "8px 10px", minWidth: "220px", color: "var(--color-textSecondary)", background: "var(--color-textWhite)" }}
            >
              <option value="all">Todos os colaboradores</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.nome || profile.email || `User ${String(profile.id).slice(0, 8)}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px" }}>
          <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{isFocusedUserMode ? "Colaborador" : "Utilizadores"}</div>
          <div style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>
            {isFocusedUserMode ? (selectedProfile?.nome || "Colaborador") : profiles.length}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px" }}>
          <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{isFocusedUserMode ? "Cronómetro ativo agora" : "Com cronómetro ativo"}</div>
          <div style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.35rem" }}>
            {isFocusedUserMode ? (selectedActiveLog ? "Ativo" : "Sem registo ativo") : totalUsersWithActiveTimers}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px" }}>
          <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{isFocusedUserMode ? "Pendentes do colaborador" : "Pendentes totais"}</div>
          <div style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.35rem" }}>
            {isFocusedUserMode
              ? selectedPending.atividades + selectedPending.tarefas + selectedPending.subtarefas
              : totalPending}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px" }}>
          <div style={{ color: "#64748b", fontSize: "0.82rem" }}>Tempo no filtro</div>
          <div style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.35rem" }}>{formatHours(totalMinutesFiltered)}</div>
        </div>
      </div>

      {loading && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px", color: "#64748b" }}>
          A carregar dados de administração...
        </div>
      )}

      {!loading && errorMessage && (
        <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: "14px", padding: "16px", color: "#b91c1c" }}>
          {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && (
        <>
          {!isFocusedUserMode && (
            <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", color: "#475569", fontSize: "0.8rem" }}>Utilizador</th>
                    <th style={{ padding: "10px 12px", color: "#475569", fontSize: "0.8rem" }}>Perfil</th>
                    <th style={{ padding: "10px 12px", color: "#475569", fontSize: "0.8rem" }}>A fazer agora</th>
                    <th style={{ padding: "10px 12px", color: "#475569", fontSize: "0.8rem" }}>Pendentes</th>
                    <th style={{ padding: "10px 12px", color: "#475569", fontSize: "0.8rem" }}>Tempo no filtro</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const active = activeLogsByUser.get(String(profile.id));
                    const pending = pendingByUser.get(String(profile.id)) || { atividades: 0, tarefas: 0, subtarefas: 0 };

                    const myMinutes = logsFiltered
                      .filter((log) => String(log.user_id) === String(profile.id))
                      .reduce((acc, log) => acc + getMinutesFromLog(log), 0);

                    return (
                      <tr key={profile.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ fontWeight: 700, color: "#1e293b" }}>{profile.nome || "Sem nome"}</div>
                          <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{profile.email || "Sem email"}</div>
                        </td>
                        <td style={{ padding: "11px 12px", color: "#334155", fontWeight: 700 }}>{profile.role || profile.tipo || "colaborador"}</td>
                        <td style={{ padding: "11px 12px", color: active ? "#166534" : "#64748b", fontSize: "0.84rem", maxWidth: "360px" }}>
                          {active ? resolveActiveLabel(active) : "Sem cronómetro ativo"}
                        </td>
                        <td style={{ padding: "11px 12px", color: "#334155", fontSize: "0.84rem" }}>
                          A:{pending.atividades} · T:{pending.tarefas} · S:{pending.subtarefas}
                        </td>
                        <td style={{ padding: "11px 12px", color: "#0f172a", fontWeight: 700 }}>{formatHours(myMinutes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {isFocusedUserMode && selectedProfile && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px", display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1rem" }}>
                  Itens atribuídos a {selectedProfile.nome || selectedProfile.email || "colaborador"}
                </h3>
                <span style={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 700 }}>
                  {selectedActiveLog ? `Em curso: ${resolveActiveLabel(selectedActiveLog)}` : "Sem cronómetro ativo"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px" }}>
                <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 700 }}>Tag / Perfil do colaborador:</span>
                <select
                  value={normalizeRole(selectedProfile.role || selectedProfile.tipo || "colaborador")}
                  onChange={(e) => handleUpdateSelectedProfileTag(e.target.value)}
                  disabled={profileTagSaving}
                  style={{ border: "1px solid var(--color-borderColor)", borderRadius: "8px", padding: "6px 10px", fontWeight: 700, color: "var(--color-textSecondary)", background: "var(--color-textWhite)", minWidth: "180px" }}
                >
                  {PROFILE_TAG_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "0.78rem", color: profileTagSaving ? "#0ea5e9" : "#64748b", fontWeight: 700 }}>
                  {profileTagSaving ? "A guardar..." : (profileTagFeedback || "")}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }} className="admin-assigned-grid">
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "10px" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#2563eb", marginBottom: "8px" }}>
                    Atividades por fazer ({selectedUserAssignments.atividades.length})
                  </div>
                  <div style={{ display: "grid", gap: "6px", maxHeight: "220px", overflowY: "auto" }}>
                    {focusedAssignmentsLoading && <span style={{ fontSize: "0.78rem", color: "#64748b" }}>A carregar...</span>}
                    {selectedUserAssignments.atividades.length === 0 && (
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Sem atividades atribuídas.</span>
                    )}
                    {selectedUserAssignments.atividades.slice(0, 30).map((item) => (
                      <div key={item.id} style={{ fontSize: "0.8rem", color: "#334155", background: "#f8fafc", borderRadius: "8px", padding: "6px 8px", display: "flex", justifyContent: "space-between", gap: "8px" }} title={item.titulo}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.titulo || `Atividade ${String(item.id).slice(0, 8)}`}</span>
                        <span style={{ fontSize: "0.72rem", color: "#0f766e", whiteSpace: "nowrap", fontWeight: 700 }}>
                          {item.estado || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "10px" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#059669", marginBottom: "8px" }}>
                    Tarefas por fazer ({selectedUserAssignments.tarefas.length})
                  </div>
                  <div style={{ display: "grid", gap: "6px", maxHeight: "220px", overflowY: "auto" }}>
                    {focusedAssignmentsLoading && <span style={{ fontSize: "0.78rem", color: "#64748b" }}>A carregar...</span>}
                    {selectedUserAssignments.tarefas.length === 0 && (
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Sem tarefas atribuídas.</span>
                    )}
                    {selectedUserAssignments.tarefas.slice(0, 30).map((item) => (
                      <div key={item.id} style={{ fontSize: "0.8rem", color: "#334155", background: "#f8fafc", borderRadius: "8px", padding: "6px 8px", display: "flex", justifyContent: "space-between", gap: "8px" }} title={item.titulo}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.titulo || `Tarefa ${String(item.id).slice(0, 8)}`}</span>
                        <span style={{ fontSize: "0.72rem", color: "#0f766e", whiteSpace: "nowrap", fontWeight: 700 }}>
                          {item.estado || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "10px" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#7c3aed", marginBottom: "8px" }}>
                    Subtarefas por fazer ({selectedUserAssignments.subtarefas.length})
                  </div>
                  <div style={{ display: "grid", gap: "6px", maxHeight: "220px", overflowY: "auto" }}>
                    {focusedAssignmentsLoading && <span style={{ fontSize: "0.78rem", color: "#64748b" }}>A carregar...</span>}
                    {selectedUserAssignments.subtarefas.length === 0 && (
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Sem subtarefas atribuídas.</span>
                    )}
                    {selectedUserAssignments.subtarefas.slice(0, 30).map((item) => (
                      <div key={item.id} style={{ fontSize: "0.8rem", color: "#334155", background: "#f8fafc", borderRadius: "8px", padding: "6px 8px", display: "flex", justifyContent: "space-between", gap: "8px" }} title={item.titulo}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.titulo || `Subtarefa ${String(item.id).slice(0, 8)}`}</span>
                        <span style={{ fontSize: "0.72rem", color: "#0f766e", whiteSpace: "nowrap", fontWeight: 700 }}>
                          {item.estado || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="admin-charts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
            {!isFocusedUserMode && (
              <MiniPieChart title="Horas por utilizador" data={chartsData.byUser} palette={["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#0284c7", "#0ea5e9", "#38bdf8"]} />
            )}
            <MiniPieChart title="Horas por projeto" data={chartsData.byProject} palette={["#059669", "#10b981", "#34d399", "#6ee7b7", "#047857", "#22c55e", "#4ade80", "#86efac"]} />
            <MiniPieChart title="Horas por atividade" data={chartsData.byActivity} palette={["#ea580c", "#f97316", "#fb923c", "#fdba74", "#c2410c", "#f59e0b", "#fbbf24", "#fcd34d"]} />
            <MiniPieChart title="Horas por tarefa" data={chartsData.byTask} palette={["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#6d28d9", "#9333ea", "#a855f7", "#c084fc"]} />
          </div>

          <style>{`
            @media (max-width: 1200px) {
              .admin-pie-legend {
                grid-template-columns: 1fr !important;
              }

              .admin-assigned-grid {
                grid-template-columns: 1fr !important;
              }
            }

            @media (max-width: 980px) {
              .admin-charts-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </>
      )}

      {profileTagModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeProfileTagModal();
          }}
        >
          <div style={{ width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 24px 48px rgba(15,23,42,0.2)", padding: "16px", display: "grid", gap: "12px" }}>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem" }}>Confirmar alteração de perfil</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>
              Introduz a palavra-passe para alterar a tag do colaborador para <b>{PROFILE_TAG_OPTIONS.find((opt) => opt.value === profileTagModal.nextTag)?.label || profileTagModal.nextTag}</b>.
            </p>

            <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#334155", fontWeight: 700 }}>
              Palavra-passe de administração
              <input
                type="password"
                value={profileTagModal.password}
                onChange={(e) => setProfileTagModal((prev) => ({ ...prev, password: e.target.value, error: "" }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmProfileTagChange();
                }}
                autoFocus
                style={{ border: "1px solid var(--color-borderColor)", borderRadius: "10px", padding: "9px 10px", fontSize: "0.9rem", color: "var(--color-textSecondary)", background: "var(--color-textWhite)" }}
              />
            </label>

            {profileTagModal.error ? (
              <div style={{ color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 10px", fontSize: "0.8rem", fontWeight: 700 }}>
                {profileTagModal.error}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={closeProfileTagModal}
                disabled={profileTagSaving}
                style={{ border: "1px solid var(--color-borderColor)", background: "var(--color-bgTertiary)", color: "var(--color-textSecondary)", borderRadius: "10px", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmProfileTagChange}
                disabled={profileTagSaving}
                style={{ border: "none", background: "linear-gradient(135deg, var(--color-btnPrimary) 0%, var(--color-btnPrimaryDark) 100%)", color: "var(--color-textWhite)", borderRadius: "10px", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}
              >
                {profileTagSaving ? "A guardar..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
