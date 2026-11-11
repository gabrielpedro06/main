import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import FancySelect from "../components/FancySelect";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { hasAttendanceStartedToday, startAttendanceNow } from "../utils/attendanceGuard";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import { concludeActivityWithChildren } from "../utils/activityStatusCascade";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
import "./../styles/dashboard.css";
import "../styles/agenda.css";

// --- ÍCONES SVG PROFISSIONAIS (SaaS Premium) ---
const Icons = {
  Kanban: ({ size = 24, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>,
  Check: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Clock: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Play: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Stop: ({ size = 10, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Calendar: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  AlertTriangle: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Flame: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>,
  FileText: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Inbox: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>,
  Save: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  CheckCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
  XCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
  Edit: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  History: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><polyline points="12 7 12 12 15 15"></polyline></svg>,
  Restore: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>,
  Folder: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Users: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  UploadCloud: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></svg>,
  ExternalLink: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  Grip: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  Refresh: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

export default function MinhasTarefas() {
  const { user } = useAuth();
    const navigate = useNavigate();
  
  const [tasks, setTasks] = useState({ atrasadas: [], hoje: [], amanha: [], depois: [], semData: [] });
  const [logs, setLogs] = useState([]);
  const [activeLog, setActiveLog] = useState(null);
    const [activeTimerTitle, setActiveTimerTitle] = useState("");
        const [activeTimerLocation, setActiveTimerLocation] = useState("");
        const [activeTimerRoute, setActiveTimerRoute] = useState("");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [staff, setStaff] = useState([]); 
  
  // FILTROS E ESTADOS DE UI
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("avulsas"); 
  const [availableProjects, setAvailableProjects] = useState([]);
  
  const [newTasks, setNewTasks] = useState({ atrasadas: '', hoje: '', amanha: '', depois: '', semData: '' });
  const [novaTarefaNome, setNovaTarefaNome] = useState("");

  const [editModal, setEditModal] = useState({ show: false, data: null });
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false); // NOVO ESTADO DRAG & DROP
  
  // Histórico de Concluídas
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [completedTasksGroups, setCompletedTasksGroups] = useState({ "Esta Semana": [], "Semana Passada": [], "Mais Antigas": [] });
  const [activeHistoryTab, setActiveHistoryTab] = useState("Esta Semana"); 
    const [timerSwitchModal, setTimerSwitchModal] = useState({ show: false, message: "", pendingTask: null });
                const [attendanceWarningModal, setAttendanceWarningModal] = useState({ show: false, message: "" });
        const [stopNoteModal, setStopNoteModal] = useState({ show: false });
        const attendancePendingActionRef = useRef(null);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [timeLogSaving, setTimeLogSaving] = useState(false);
    const [timeLogForm, setTimeLogForm] = useState({ user_id: "", task_id: "", duration_minutes: "" });
    const [editingTimeLogId, setEditingTimeLogId] = useState(null);
    const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        show: false,
        title: "",
        message: "",
        confirmText: "Confirmar",
        isDanger: true,
        onConfirm: null
    });

  // DRAG & DROP STATE (Kanban)
  const [draggedTask, setDraggedTask] = useState(null);
  const [completingIds, setCompletingIds] = useState(() => new Set());
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    if (user?.id) carregarTudo();
  }, [user, mostrarConcluidos, selectedProjectFilter]);

  useEffect(() => {
      let cancelled = false;

      const resolveActiveTimerTitle = async () => {
          if (!activeLog) {
              if (!cancelled) setActiveTimerTitle("");
              if (!cancelled) setActiveTimerLocation("");
              if (!cancelled) setActiveTimerRoute("");
              return;
          }

          const timerMeta = await resolveActiveTimerMeta(supabase, activeLog);
          if (cancelled) return;

          setActiveTimerTitle(timerMeta.title || "Cronómetro em curso");
          setActiveTimerLocation(timerMeta.locationLabel || "Item ativo");
          setActiveTimerRoute(timerMeta.route || "/dashboard/tarefas");
      };

      resolveActiveTimerTitle();

      return () => {
          cancelled = true;
      };
    }, [activeLog]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const getSafeFirstName = (nome, email) => {
      try {
          if (nome && typeof nome === 'string') return nome.trim().split(' ')[0];
          if (email && typeof email === 'string') return email.trim().split('@')[0];
          return "Colab";
      } catch (e) { return "Colab"; }
  };

  async function carregarTudo() {
      setLoading(true);
      await Promise.all([
          (async () => {
              const { data: staffData } = await supabase.from("profiles").select("id, nome, email, ativo, avatar_url").order("nome");
              setStaff(staffData || []);
          })(),
          checkActiveLog(),
          fetchMyTasks()
      ]);
  }

  async function checkActiveLog() {
      const { data } = await supabase
          .from("task_logs")
          .select("id, task_id, atividade_id, projeto_id, start_time")
          .eq("user_id", user.id)
          .is("end_time", null)
          .maybeSingle();
      setActiveLog(data || null);
  }

  async function fetchMyTasks() {
      try {
          const baseSelect = `id, titulo, estado, responsavel_id, criado_por, data_limite, data_fim, prioridade, descricao, created_at, atividades(id, titulo, projetos(id, titulo, codigo_projeto)), colaboradores_extra, anexos, arquivo_url, nome_entregavel, data_entregavel, profiles:criado_por(nome)`;
          const [
              { data: tarefasResp },
              { data: tarefasExtra, error: tarefasExtraError },
          ] = await Promise.all([
              supabase
                .from("tarefas")
                .select(baseSelect)
                .eq("responsavel_id", user.id)
                .neq("estado", "concluido")
                .order("created_at", { ascending: false }),
              supabase
                  .from("tarefas")
                  .select(baseSelect)
                  .contains("colaboradores_extra", [user.id])
                  .neq("estado", "concluido")
                  .order("created_at", { ascending: true }),
          ]);

          if (tarefasExtraError) {
              console.warn("Filtro por colaboradores_extra (MinhasTarefas) indisponivel:", tarefasExtraError.message);
          }

          let tData = [
              ...(tarefasResp || []),
              ...(tarefasExtra || []),
          ].filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

          if (!mostrarConcluidos) tData = tData.filter((t) => t.estado !== "concluido");
          const taskIds = (tData || []).map(t => t.id).filter(Boolean);
          if (taskIds.length > 0) {
              const { data: logsData } = await supabase
                  .from("task_logs")
                  .select("id, user_id, task_id, start_time, end_time, duration_minutes")
                  .in("task_id", taskIds)
                  .not("duration_minutes", "is", null);
              setLogs(logsData || []);
          } else {
              setLogs([]);
          }

          if (tData) {
              const pMap = new Map();
              tData.forEach(task => {
                  const proj = task.atividades?.projetos;
                  if (proj) pMap.set(proj.id, proj.codigo_projeto ? `[${proj.codigo_projeto}] ${proj.titulo}` : proj.titulo);
              });
              setAvailableProjects(Array.from(pMap.entries()).map(([id, name]) => ({ id, name })));
          }

          let dataToProcess = tData || [];
          if (selectedProjectFilter === "avulsas") dataToProcess = dataToProcess.filter(t => !t.atividades?.projetos);
          else if (selectedProjectFilter !== "todos") dataToProcess = dataToProcess.filter(t => t.atividades?.projetos?.id === selectedProjectFilter);

          const today = new Date(); today.setHours(0,0,0,0);
          const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

          let agrupado = { atrasadas: [], hoje: [], amanha: [], depois: [], semData: [] };

          dataToProcess.forEach(task => {
              const taskDeadline = task.data_fim || task.data_limite;
              if (!taskDeadline) {
                  agrupado.semData.push(task);
              } else {
                  const d = new Date(taskDeadline); d.setHours(0,0,0,0);
                  if (d < today) agrupado.atrasadas.push(task);
                  else if (d.getTime() === today.getTime()) agrupado.hoje.push(task);
                  else if (d.getTime() === tomorrow.getTime()) agrupado.amanha.push(task);
                  else agrupado.depois.push(task);
              }
          });

          setTasks(agrupado);
      } catch (err) { console.error(err); }
      setLoading(false);
  }

  async function openCompletedHistory() {
      const baseSelect = `id, titulo, estado, responsavel_id, criado_por, data_limite, data_fim, prioridade, descricao, created_at, data_conclusao, atividades(projetos(id, titulo, codigo_projeto)), profiles:criado_por(nome)`;
      const [
          { data: concluidasResp },
          { data: concluidasExtra, error: concluidasExtraError },
      ] = await Promise.all([
          supabase
              .from("tarefas")
              .select(baseSelect)
              .eq("responsavel_id", user.id)
              .eq("estado", "concluido"),
          supabase
              .from("tarefas")
              .select(baseSelect)
              .contains("colaboradores_extra", [user.id])
              .eq("estado", "concluido"),
      ]);

      if (concluidasExtraError) {
          console.warn("Filtro por colaboradores_extra (historico concluidas) indisponivel:", concluidasExtraError.message);
      }

      const data = [
          ...(concluidasResp || []),
          ...(concluidasExtra || []),
      ]
          .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx)
          .sort((a, b) => {
              const aDate = a.data_conclusao || a.created_at;
              const bDate = b.data_conclusao || b.created_at;
              return new Date(bDate) - new Date(aDate);
          });

      if (data) {
          const now = new Date();
          const groups = { "Esta Semana": [], "Semana Passada": [], "Mais Antigas": [] };

          data.forEach(t => {
              const refDate = new Date(t.data_conclusao || t.created_at);
              const diffTime = Math.abs(now - refDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays <= 7) groups["Esta Semana"].push(t);
              else if (diffDays <= 14) groups["Semana Passada"].push(t);
              else groups["Mais Antigas"].push(t);
          });

          setCompletedTasksGroups(groups);
          if (groups["Esta Semana"].length > 0) setActiveHistoryTab("Esta Semana");
          else if (groups["Semana Passada"].length > 0) setActiveHistoryTab("Semana Passada");
          else if (groups["Mais Antigas"].length > 0) setActiveHistoryTab("Mais Antigas");
          else setActiveHistoryTab("Esta Semana");
      }
      setShowCompletedModal(true);
  }

  async function handleRestoreTask(task) {
      await supabase.from("tarefas").update({ estado: 'pendente', data_conclusao: null }).eq("id", task.id);
      showToast("Tarefa restaurada para o quadro!"); fetchMyTasks(); openCompletedHistory(); 
  }

  async function handlePermanentDelete(taskId) {
      openDeleteTaskConfirm({
          title: "Apagar tarefa permanentemente",
          message: "Tens a certeza que queres apagar esta tarefa permanentemente? Esta ação não pode ser desfeita.",
          onConfirm: async () => {
              await supabase.from("tarefas").delete().eq("id", taskId);
              showToast("Tarefa eliminada do arquivo.");
              closeConfirmDialog();
              openCompletedHistory();
          }
      });
  }
  
  // Função auxiliar de delete do Modal
  async function handleDeleteTaskFromKanban(taskId) {
      openDeleteTaskConfirm({
          title: "Apagar tarefa do quadro",
          message: "Tens a certeza que queres apagar esta tarefa do quadro? Esta ação não pode ser desfeita.",
          onConfirm: async () => {
              await supabase.from("tarefas").delete().eq("id", taskId);
              showToast("Tarefa apagada.");
              setEditModal({show: false, data: null});
              closeConfirmDialog();
              fetchMyTasks();
          }
      });
  }

  const getTaskTime = (taskId) => logs.filter(l => l.task_id === taskId).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  const formatTime = (mins) => {
      if (mins === 0) return "0m";
      const h = Math.floor(mins / 60); const m = mins % 60;
      return h > 0 ? `${h}h${m}m` : `${m}m`;
  };

  const allCurrentTasks = [
      ...tasks.atrasadas,
      ...tasks.hoje,
      ...tasks.amanha,
      ...tasks.depois,
      ...tasks.semData
  ];

  const uniqueTaskOptions = Array.from(
      new Map(allCurrentTasks.map((t) => [String(t.id), t])).values()
  ).map((t) => {
      const proj = t.atividades?.projetos;
      const contexto = proj ? (proj.codigo_projeto ? `[${proj.codigo_projeto}] ${proj.titulo}` : proj.titulo) : "Avulsa";
      return { id: String(t.id), label: `${contexto} > ${t.titulo}` };
  });

  const getTaskLabelById = (taskId) => uniqueTaskOptions.find((opt) => String(opt.id) === String(taskId))?.label || "Tarefa";

  const getActiveTimerTitle = () => activeTimerTitle || "Cronómetro em curso";

  function openActiveTimerLocation() {
      if (!activeLog) return;
      navigate(activeTimerRoute || '/dashboard/minhas-tarefas');
  }

  const openTimeCreateModal = () => {
      setEditingTimeLogId(null);
      setTimeLogForm({
          user_id: user.id,
          task_id: uniqueTaskOptions[0]?.id || "",
          duration_minutes: "30"
      });
      setShowTimeModal(true);
  };

  const openTimeEditModal = (log) => {
      setEditingTimeLogId(log.id);
      setTimeLogForm({
          user_id: log.user_id || "",
          task_id: String(log.task_id || ""),
          duration_minutes: String(log.duration_minutes || "")
      });
      setShowTimeModal(true);
  };

  const handleSaveTimeLog = async (e) => {
      e.preventDefault();
      const duration = Math.max(1, parseInt(timeLogForm.duration_minutes, 10) || 0);
      if (!timeLogForm.user_id || !timeLogForm.task_id || !duration) {
          showToast("Preenche colaborador, tarefa e minutos válidos.", "warning");
          return;
      }

      const existing = logs.find((l) => String(l.id) === String(editingTimeLogId));
      const start = existing?.start_time ? new Date(existing.start_time) : new Date(Date.now() - duration * 60000);
      const safeStart = isNaN(start.getTime()) ? new Date(Date.now() - duration * 60000) : start;
      const end = new Date(safeStart.getTime() + duration * 60000);

      const payload = {
          user_id: timeLogForm.user_id,
          task_id: timeLogForm.task_id,
          duration_minutes: duration,
          start_time: safeStart.toISOString(),
          end_time: end.toISOString()
      };

      setTimeLogSaving(true);
      try {
          if (editingTimeLogId) {
              const { error } = await supabase.from("task_logs").update(payload).eq("id", editingTimeLogId);
              if (error) throw error;
              showToast("Registo de tempo atualizado.");
          } else {
              const { error } = await supabase.from("task_logs").insert([payload]);
              if (error) throw error;
              showToast("Registo de tempo criado.");
          }
          setShowTimeModal(false);
          fetchMyTasks();
      } catch (err) {
          showToast("Erro ao guardar tempo: " + err.message, "error");
      } finally {
          setTimeLogSaving(false);
      }
  };

  const handleDeleteTimeLog = async (logId) => {
      setConfirmDialog({
          show: true,
          title: "Apagar registo de tempo",
          message: "Tens a certeza que queres apagar este registo de tempo? Esta ação não pode ser desfeita.",
          confirmText: "Sim, apagar",
          isDanger: true,
          onConfirm: async () => {
              const { error } = await supabase.from("task_logs").delete().eq("id", logId);
              if (error) {
                  showToast("Erro ao apagar registo.", "error");
                  return;
              }
              setLogs((prev) => prev.filter((l) => String(l.id) !== String(logId)));
              showToast("Registo de tempo apagado.");
              setConfirmDialog((prev) => ({ ...prev, show: false, onConfirm: null }));
          }
      });
  };

  const closeConfirmDialog = () => {
      setConfirmDialog({
          show: false,
          title: "",
          message: "",
          confirmText: "Confirmar",
          isDanger: true,
          onConfirm: null
      });
  };

  const openDeleteTaskConfirm = ({ title, message, onConfirm }) => {
      setConfirmDialog({
          show: true,
          title,
          message,
          confirmText: "Sim, apagar",
          isDanger: true,
          onConfirm
      });
  };

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

  async function startTaskDirect(task) {
      const { data, error } = await supabase
          .from("task_logs")
          .insert([{ user_id: user.id, task_id: task.id, start_time: new Date().toISOString() }])
          .select()
          .single();
      if (!error) {
          // Atualiza o estado da tarefa para 'em_curso' ao iniciar o cronómetro
          await supabase
              .from("tarefas")
              .update({ estado: "em_curso" })
              .eq("id", task.id);
          setActiveLog(data);
          showToast("Cronómetro em curso!");
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

      const mins = await stopLogById(activeLog);
      if (mins === null) return;

      setActiveLog(null);
      showToast(`Cronómetro anterior terminado (${mins} min).`, "success");
      await runActionWithAttendanceWarning(() => startTaskDirect(nextTask));
  }

  function cancelTimerSwitch() {
      setTimerSwitchModal({ show: false, message: "", pendingTask: null });
      showToast("Mantivemos o cronómetro atual em execução.", "info");
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
          await concludeActivityWithChildren(supabase, logEntry.atividade_id);
          return;
      }

      if (logEntry.projeto_id) {
          await supabase.from("projetos").update({ estado: "concluido" }).eq("id", logEntry.projeto_id);
      }
  }

  function openStopNoteModal(e) {
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
      const diffMins = await stopLogById(logToStop, note);
      if (diffMins === null) return;

      await applyStopStatusUpdateForLogTarget(supabase, logToStop, statusMeta);
      if (shouldComplete) await completeLogItem(logToStop);

      setActiveLog(null);
      showToast(shouldComplete ? `Tempo guardado: ${diffMins} min. Item concluido.` : `Tempo guardado: ${diffMins} min.`);
      carregarTudo();
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

  async function handleToggleTimer(task) {
      if (activeLog && activeLog.task_id === task.id) {
          openStopNoteModal();
      } else {
          if (activeLog) {
              setTimerSwitchModal({
                  show: true,
                  message: `Deseja terminar a tarefa atual para iniciar a tarefa \"${task.titulo}\"?`,
                  pendingTask: task
              });
              return;
          }
          await runActionWithAttendanceWarning(() => startTaskDirect(task));
      }
  }

  async function handleCompleteTask(task) {
      if (completingIds.has(task.id)) return;
      const novoEstado = task.estado === 'concluido' ? 'pendente' : 'concluido';
      const dataConclusao = novoEstado === 'concluido' ? new Date().toISOString() : null;
      const celebrate = novoEstado === 'concluido';

      // Animação de "concluído" corre enquanto a BD é atualizada
      if (celebrate) setCompletingIds((prev) => new Set(prev).add(task.id));
      const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const [{ error }] = await Promise.all([
          supabase.from("tarefas").update({ estado: novoEstado, data_conclusao: dataConclusao }).eq("id", task.id),
          celebrate && !reduceMotion ? new Promise((r) => setTimeout(r, 1050)) : null,
      ]);
      if (error) showToast("Erro: " + error.message, "error");
      else showToast(celebrate ? "Boa! Tarefa concluída." : "Tarefa reaberta.");
      await fetchMyTasks();
      if (celebrate) setCompletingIds((prev) => { const next = new Set(prev); next.delete(task.id); return next; });
  }

  async function handleCreatePessoal(e) {
      e.preventDefault();
      if (!novaTarefaNome.trim()) return;
      try {
          const { error } = await supabase.from("tarefas").insert([{ 
              titulo: novaTarefaNome, responsavel_id: user.id, estado: 'pendente', atividade_id: null, prioridade: 'normal', criado_por: user.id
          }]);
          if (error) throw error;
          setNovaTarefaNome(""); 
          if(selectedProjectFilter !== "avulsas" && selectedProjectFilter !== "todos") setSelectedProjectFilter("avulsas");
          showToast("Tarefa rápida adicionada!"); fetchMyTasks();
      } catch (err) { showToast("Erro: " + err.message, "error"); }
  }

  async function handleQuickAdd(e, colId) {
      e.preventDefault();
      const text = newTasks[colId];
      if (!text || !text.trim()) return;

      let date = null;
      const today = new Date();
      if (colId === 'hoje') date = today.toISOString().split('T')[0];
      if (colId === 'amanha') { today.setDate(today.getDate() + 1); date = today.toISOString().split('T')[0]; }
      if (colId === 'depois') { today.setDate(today.getDate() + 3); date = today.toISOString().split('T')[0]; }

      try {
          const { error } = await supabase.from("tarefas").insert([{ 
              titulo: text.trim(), responsavel_id: user.id, estado: 'pendente', atividade_id: null, data_limite: date, prioridade: 'normal', criado_por: user.id 
          }]);
          if(error) throw error;
          setNewTasks({ ...newTasks, [colId]: "" }); 
          if(selectedProjectFilter !== "avulsas" && selectedProjectFilter !== "todos") setSelectedProjectFilter("avulsas");
          fetchMyTasks();
      } catch (err) { showToast("Erro ao criar: " + err.message, "error"); }
  }

  // --- LÓGICA DE EDIÇÃO E MÚLTIPLOS DOCUMENTOS ---
  function openEditModal(task) {
      const taskDeadline = task.data_fim || task.data_limite;
      
      // 💡 Migração automática do sistema antigo para a array "anexos"
      let arrAnexos = Array.isArray(task.anexos) ? [...task.anexos] : [];
      if (arrAnexos.length === 0 && task.arquivo_url) {
          arrAnexos.push({
              id: 'doc_' + Date.now(),
              nome: task.nome_entregavel || 'Documento Anexado',
              data_limite: task.data_entregavel || '',
              url: task.arquivo_url,
              file: null
          });
      }

      setEditModal({
          show: true,
          data: {
              ...task,
              _form_deadline: taskDeadline ? taskDeadline.split('T')[0] : "",
              colaboradores_extra: Array.isArray(task.colaboradores_extra) ? task.colaboradores_extra : [],
              anexos: arrAnexos
          }
      });
  }

  const toggleColaboradorExtra = (colabId) => {
      setEditModal(prev => {
          const arr = Array.isArray(prev.data.colaboradores_extra) ? prev.data.colaboradores_extra : [];
          if (arr.includes(colabId)) return { ...prev, data: { ...prev.data, colaboradores_extra: arr.filter(id => id !== colabId) } };
          return { ...prev, data: { ...prev.data, colaboradores_extra: [...arr, colabId] } };
      });
  };

  const addAnexoSlot = () => {
      setEditModal(prev => ({
          ...prev, data: {
              ...prev.data,
              anexos: [...prev.data.anexos, { id: 'new_' + Date.now(), nome: '', data_limite: '', url: '', file: null }]
          }
      }));
  };

  const removeAnexoSlot = (id) => {
      setEditModal(prev => ({
          ...prev, data: {
              ...prev.data,
              anexos: prev.data.anexos.filter(a => a.id !== id)
          }
      }));
  };

  const updateAnexo = (id, field, value) => {
      setEditModal(prev => ({
          ...prev, data: {
              ...prev.data,
              anexos: prev.data.anexos.map(a => a.id === id ? { ...a, [field]: value } : a)
          }
      }));
  };

  const handleFileSelect = (e, id) => {
      const file = e.target.files[0];
      if (!file) return;
      updateAnexo(id, 'file', file);
      updateAnexo(id, 'url', '');
      if(!editModal.data.anexos.find(a=>a.id === id).nome) {
          updateAnexo(id, 'nome', file.name.split('.')[0]); 
      }
  };

  // --- DRAG & DROP DE FICHEIROS NO MODAL ---
  const handleFileDragOver = (e) => {
      e.preventDefault(); 
      e.stopPropagation();
      setIsDraggingFile(true);
  };

  const handleFileDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);
  };

  // Drop global (Cria novos slots automaticamente)
  const handleFileDropGeneral = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const files = Array.from(e.dataTransfer.files);
          
          setEditModal(prev => {
              const novosAnexos = files.map(file => ({
                  id: 'new_drop_' + Date.now() + Math.random(),
                  nome: file.name.split('.')[0], // Preenche o nome auto
                  data_limite: '',
                  url: '',
                  file: file
              }));

              return {
                  ...prev,
                  data: {
                      ...prev.data,
                      anexos: [...(prev.data.anexos || []), ...novosAnexos]
                  }
              };
          });
      }
  };

  // Drop num slot específico (Substitui o ficheiro desse slot)
  const handleFileDropSpecific = (e, id) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          updateAnexo(id, 'file', file);
          updateAnexo(id, 'url', '');
          if(!editModal.data.anexos.find(a=>a.id === id).nome) {
              updateAnexo(id, 'nome', file.name.split('.')[0]);
          }
      }
  };

  async function handleSaveModal(e) {
      e.preventDefault();
      setIsUploading(true);
      const isProjectTask = editModal.data.atividades?.projetos;

      const finalAnexos = [];
      for (let anexo of editModal.data.anexos) {
          let finalUrl = anexo.url;
          if (anexo.file) {
              const fileExt = anexo.file.name.split('.').pop();
              const fileName = `${Math.random()}.${fileExt}`;
              const filePath = `${user.id}/${fileName}`;
              const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, anexo.file);
              
              if (!uploadError) {
                  const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(filePath);
                  finalUrl = publicUrlData.publicUrl;
              } else {
                  showToast(`Erro ao carregar o ficheiro: ${anexo.file.name}`, "error");
              }
          }
          
          finalAnexos.push({
              id: anexo.id.startsWith('new_') ? 'doc_' + Date.now() + Math.random() : anexo.id, 
              nome: anexo.nome || 'Documento S/ Nome',
              data_limite: anexo.data_limite,
              url: finalUrl
          });
      }

      const payload = { 
          titulo: editModal.data.titulo, 
          descricao: editModal.data.descricao, 
          prioridade: editModal.data.prioridade,
          responsavel_id: editModal.data.responsavel_id,
          colaboradores_extra: editModal.data.colaboradores_extra,
          anexos: finalAnexos 
      };

      if (isProjectTask) payload.data_fim = editModal.data._form_deadline || null;
      else payload.data_limite = editModal.data._form_deadline || null;
      
      try {
          const { error } = await supabase.from("tarefas").update(payload).eq("id", editModal.data.id);
          if (error) throw error;
          setEditModal({show: false, data: null});
          showToast("Tarefa atualizada com sucesso!"); 
          fetchMyTasks();
      } catch (err) { showToast("Erro ao guardar: " + err.message, "error"); }
      
      setIsUploading(false);
  }

  // --- DRAG AND DROP (Kanban) ---
  const getDateForColumn = (colId) => {
      const d = new Date();
      if (colId === 'hoje') return d.toISOString().split('T')[0];
      if (colId === 'amanha') { d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }
      if (colId === 'depois') { d.setDate(d.getDate() + 3); return d.toISOString().split('T')[0]; }
      if (colId === 'atrasadas') { d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; } 
      return null; 
  };

  async function handleDrop(e, colId) {
      e.preventDefault();
      setDragOverCol(null);
      if (!draggedTask) return;

      const newDate = getDateForColumn(colId);
      const isProjectTask = draggedTask.atividades?.projetos;
      const updatePayload = isProjectTask ? { data_fim: newDate } : { data_limite: newDate };
      
      try {
          await supabase.from('tarefas').update(updatePayload).eq("id", draggedTask.id);
          fetchMyTasks(); 
      } catch(err) {
          showToast("Erro ao mover a tarefa.", "error");
      }
      setDraggedTask(null);
  }

  const AG_COLUMNS = [
      { id: "atrasadas", title: "Atrasadas", icon: <Icons.AlertTriangle size={15} />, tone: "late", empty: "Sem atrasos. Bom trabalho!" },
      { id: "hoje", title: "Para hoje", icon: <Icons.Flame size={15} />, tone: "today", empty: "Nada para hoje. Arrasta algo para aqui." },
      { id: "amanha", title: "Amanhã", icon: <Icons.Calendar size={15} />, tone: "tomorrow", empty: "Amanhã está livre." },
      { id: "depois", title: "Mais tarde", icon: <Icons.Calendar size={15} />, tone: "later", empty: "Sem planos para mais tarde." },
      { id: "semData", title: "Sem data", icon: <Icons.Inbox size={15} />, tone: "nodate", empty: "Tudo tem data. Organizado!" },
  ];

  const renderCardTarefa = (task, index = 0) => {
      const isTimerActive = activeLog?.task_id === task.id;
      const timeSpent = getTaskTime(task.id);
      const isCompleted = task.estado === 'concluido';
      const isCompleting = completingIds.has(task.id);
      const taskDeadline = task.data_fim || task.data_limite;

      let deadlineTone = 'neutral';
      if (taskDeadline && !isCompleted) {
          const d = new Date(taskDeadline); d.setHours(0,0,0,0);
          const t = new Date(); t.setHours(0,0,0,0);
          if (d < t) deadlineTone = 'late';
          else if (d.getTime() === t.getTime()) deadlineTone = 'today';
      }

      const proj = task.atividades?.projetos;
      const contexto = proj ? (proj.codigo_projeto ? `[${proj.codigo_projeto}] ${proj.titulo}` : proj.titulo) : "Avulsa";

      const hasExtraColabs = task.colaboradores_extra && task.colaboradores_extra.length > 0;
      const totalDocs = Array.isArray(task.anexos) ? task.anexos.length : (task.arquivo_url ? 1 : 0);

      const showDelegated = task.criado_por && task.criado_por !== task.responsavel_id;
      const creatorName = task.profiles ? getSafeFirstName(task.profiles.nome) : null;

      return (
          <div
              id={`my-task-card-${task.id}`}
              key={task.id}
              draggable
              onDragStart={() => setDraggedTask(task)}
              onDragEnd={() => setDraggedTask(null)}
              className={`ag-card ${isTimerActive ? 'is-running' : ''} ${isCompleted ? 'is-done' : ''} ${isCompleting ? 'is-completing' : ''} ${isCompleting && !mostrarConcluidos ? 'is-leaving' : ''} ${draggedTask?.id === task.id ? 'is-dragging' : ''}`}
              style={{ '--i': Math.min(index, 8) }}
          >
              <button
                type="button"
                onClick={() => handleCompleteTask(task)}
                className={`ag-check ${isCompleted || isCompleting ? 'is-on' : ''} ${isCompleting ? 'is-burst' : ''}`}
                title="Marcar como concluído"
                aria-label="Marcar como concluído"
              >
                  <Icons.Check size={12} />
                  {isCompleting && (
                      <span className="ag-burst" aria-hidden="true">
                          {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--a': `${i * 45}deg` }} />)}
                      </span>
                  )}
              </button>

              <div className="ag-card-body">
                  <h4 onClick={() => openEditModal(task)} className="ag-card-title">
                      <span className="ag-card-title-text">{task.titulo}</span>
                  </h4>

                  <div className={`ag-card-context ${proj ? '' : 'is-loose'}`}>
                      <Icons.Folder size={11} /> <span>{contexto}</span>
                  </div>

                  <div className="ag-card-foot">
                      <div className="ag-card-chips">
                          {taskDeadline && (
                              <span className={`ag-chip ag-chip-date is-${isCompleted ? 'neutral' : deadlineTone}`}>
                                  <Icons.Calendar size={11} /> {new Date(taskDeadline).toLocaleDateString('pt-PT', {day:'2-digit', month:'short'}).replace('.', '')}
                              </span>
                          )}
                          {showDelegated && creatorName && (
                              <span className="ag-chip" title="Atribuído por">De {creatorName}</span>
                          )}
                          {task.descricao && <span className="ag-chip ag-chip-icon" title="Tem notas"><Icons.FileText size={11} /></span>}
                          {totalDocs > 0 && <span className="ag-chip ag-chip-docs" title="Documentos em anexo"><Icons.FileText size={11} /> {totalDocs}</span>}
                          {hasExtraColabs && <span className="ag-chip ag-chip-team" title="Colaboradores partilhados"><Icons.Users size={11} /> +{task.colaboradores_extra.length}</span>}
                      </div>

                      <div className="ag-card-timer">
                          {timeSpent > 0 && <span className="ag-time"><Icons.Clock size={11} /> {formatTime(timeSpent)}</span>}
                          {!isCompleted && (
                              <button
                                  type="button"
                                  onClick={() => handleToggleTimer(task)}
                                  className={`ag-play ${isTimerActive ? 'is-on' : ''}`}
                                  title={isTimerActive ? 'Parar cronómetro' : 'Iniciar cronómetro'}
                                  aria-label={isTimerActive ? 'Parar cronómetro' : 'Iniciar cronómetro'}
                              >
                                  {isTimerActive ? <Icons.Stop /> : <Icons.Play />}
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderKanbanColumn = (col, tasksList) => {
      const { id } = col;
      const isOver = dragOverCol === id;

      return (
          <section
              key={id}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, id)}
              className={`ag-col ag-col-${col.tone} ${isOver ? 'is-over' : ''}`}
          >
              <header className="ag-col-head">
                  <span className="ag-col-icon">{col.icon}</span>
                  <h3>{col.title}</h3>
                  <span className="ag-col-count">{tasksList.length}</span>
              </header>

              <div className="ag-col-body custom-scrollbar">
                  {tasksList.map((t, i) => renderCardTarefa(t, i))}

                  {tasksList.length === 0 && (
                      <div className="ag-col-empty">{isOver ? 'Larga aqui' : col.empty}</div>
                  )}

                  <form onSubmit={(e) => handleQuickAdd(e, id)} className="ag-quick">
                      <span className="ag-quick-icon"><Icons.Plus size={14} /></span>
                      <input
                          type="text"
                          placeholder="Adicionar avulsa..."
                          value={newTasks[id] || ''}
                          onChange={e => setNewTasks({...newTasks, [id]: e.target.value})}
                      />
                  </form>
              </div>
          </section>
      );
  };

  if (loading) {
      return (
          <div className="page-container ag-page">
              <div className="ag-loading"><span /><span /><span /></div>
          </div>
      );
  }

  // Opções do filtro de projetos (dropdown moderno)
  const PROJECT_TILE_COLORS = [['#60a5fa', '#2563eb'], ['#34d399', '#059669'], ['#fbbf24', '#ea580c'], ['#f472b6', '#db2777'], ['#a78bfa', '#6d28d9'], ['#22d3ee', '#0891b2'], ['#fb7185', '#e11d48']];
  const projectTile = (name, idx) => {
      const [t1, t2] = PROJECT_TILE_COLORS[idx % PROJECT_TILE_COLORS.length];
      const initials = String(name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
      return <span className="fs-tile" style={{ '--t1': t1, '--t2': t2 }}>{initials}</span>;
  };
  const projectFilterOptions = [
      { value: 'avulsas', label: 'Tarefas avulsas', hint: 'Sem projeto associado', icon: <span className="fs-tile" style={{ '--t1': '#cbd5e1', '--t2': '#64748b' }}><Icons.Inbox size={14} /></span> },
      { value: 'todos', label: 'Todos os projetos', hint: 'Tudo o que tens atribuído', icon: <span className="fs-tile" style={{ '--t1': 'color-mix(in srgb, var(--color-btnPrimary) 55%, #fff)', '--t2': 'var(--color-btnPrimary)' }}><Icons.Kanban size={14} /></span> },
      ...availableProjects.map((p, i) => {
          const m = String(p.name || '').match(/^\[(.+?)\]\s*(.*)$/);
          const label = m ? (m[2] || m[1]) : p.name;
          return { value: p.id, label, hint: m ? m[1] : 'Projeto', group: 'Projetos', icon: projectTile(label, i) };
      }),
  ];

  const agCount = (key) => (tasks[key] || []).length;
  const timerTitle = getActiveTimerTitle();

  return (
    <div className="page-container ag-page">

      {/* HERO */}
      <header className="ag-hero">
          <div className="ag-hero-bg" aria-hidden="true"><span className="ag-orb ag-orb-a" /><span className="ag-orb ag-orb-b" /></div>

          <div className="ag-hero-row">
              <div className="ag-hero-main">
                  <span className="ag-hero-icon"><Icons.Kanban size={22} /></span>
                  <div>
                      <h1>Agenda</h1>
                      <p>O teu quadro de produtividade pessoal. Arrasta os cartões!</p>
                  </div>
              </div>

              <div className="ag-hero-stats">
                  <span className={`ag-stat ${agCount('atrasadas') > 0 ? 'is-alert' : ''}`}><strong>{agCount('atrasadas')}</strong> atrasadas</span>
                  <span className="ag-stat"><strong>{agCount('hoje')}</strong> para hoje</span>
                  <span className="ag-stat"><strong>{agCount('amanha') + agCount('depois')}</strong> a seguir</span>
              </div>
          </div>

          <div className="ag-hero-row ag-hero-tools">
              <FancySelect
                  value={selectedProjectFilter}
                  onChange={setSelectedProjectFilter}
                  options={projectFilterOptions}
                  icon={<Icons.Folder size={14} />}
                  className="fs-glass ag-project-picker"
                  searchPlaceholder="Procurar projeto..."
                  ariaLabel="Filtrar por projeto"
              />

              <div className="ag-hero-actions">
                  {activeLog && (
                      <div onClick={openActiveTimerLocation} title="Clica para ir para a tarefa/atividade em curso" className="ag-live">
                          <span className="ag-live-dot" />
                          <span className="ag-live-title">{timerTitle.length > 30 ? `${timerTitle.slice(0, 30)}...` : timerTitle}</span>
                          <button type="button" onClick={openStopNoteModal} className="ag-live-stop"><Icons.Stop /> Parar</button>
                      </div>
                  )}
                  <button type="button" onClick={openCompletedHistory} title="Histórico de concluídas" className="ag-glass-btn">
                      <Icons.History size={16} /> <span>Histórico</span>
                  </button>
                  <button type="button" onClick={openTimeCreateModal} title="Registar tempo manual" className="ag-glass-btn">
                      <Icons.Clock size={16} /> <span>Tempo manual</span>
                  </button>
                  <button type="button" onClick={() => setShowQuickTaskModal(true)} className="ag-primary-btn">
                      <Icons.Plus size={15} /> Adicionar tarefa
                  </button>
              </div>
          </div>
      </header>

      {/* QUADRO */}
      <div className="ag-board">
          {AG_COLUMNS.map((col) => renderKanbanColumn(col, tasks[col.id] || []))}
      </div>

      {/* MODAL DE TAREFAS CONCLUÍDAS */}
      {showCompletedModal && (
          <ModalPortal>
              <div className="ag-overlay" style={{ zIndex: 99999 }} onClick={() => setShowCompletedModal(false)}>
                  <div className="ag-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Arquivo de concluídas">
                      <div className="ag-modal-head">
                          <span className="ag-modal-icon"><Icons.History size={20} /></span>
                          <div>
                              <p className="ag-kicker">Histórico</p>
                              <h3>Arquivo de concluídas</h3>
                          </div>
                          <button type="button" onClick={() => setShowCompletedModal(false)} className="ag-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                      </div>

                      <div className="ag-segment">
                          {Object.keys(completedTasksGroups).map(groupName => {
                              const isActive = activeHistoryTab === groupName;
                              return (
                                  <button type="button" key={groupName} onClick={() => setActiveHistoryTab(groupName)} className={isActive ? 'is-on' : ''}>
                                      {groupName} <span>{completedTasksGroups[groupName].length}</span>
                                  </button>
                              );
                          })}
                      </div>

                      <div className="ag-modal-body custom-scrollbar">
                          <div className="ag-done-list" key={activeHistoryTab}>
                              {completedTasksGroups[activeHistoryTab]?.map((t, i) => {
                                  let ctx = "Avulsa";
                                  if (t.atividades?.projetos) {
                                      const p = t.atividades.projetos;
                                      ctx = p.codigo_projeto ? `[${p.codigo_projeto}] ${p.titulo}` : p.titulo;
                                  }

                                  return (
                                      <div key={t.id} className="ag-done" style={{ '--i': Math.min(i, 10) }}>
                                          <span className="ag-done-check"><Icons.Check size={13} /></span>
                                          <div className="ag-done-text">
                                              <span className="ag-done-title">{t.titulo}</span>
                                              <span className="ag-done-meta">
                                                  <Icons.Folder size={10} /> {ctx.length > 40 ? ctx.slice(0,40)+'...' : ctx}
                                                  <i /> {new Date(t.data_conclusao || t.created_at).toLocaleDateString('pt-PT')}
                                              </span>
                                          </div>
                                          <div className="ag-done-actions">
                                              <button type="button" onClick={() => handleRestoreTask(t)} className="ag-restore"><Icons.Restore size={14} /> Restaurar</button>
                                              <button type="button" onClick={() => handlePermanentDelete(t.id)} className="ag-icon-danger" title="Apagar definitivamente" aria-label="Apagar definitivamente"><Icons.Trash size={15} /></button>
                                          </div>
                                      </div>
                                  );
                              })}
                              {completedTasksGroups[activeHistoryTab]?.length === 0 && (
                                  <div className="ag-done-empty">
                                      <span><Icons.Inbox size={28} /></span>
                                      Não tens tarefas nesta categoria.
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL DE DETALHES DA TAREFA */}
      {editModal.show && editModal.data && (() => {
          const d = editModal.data;
          const setData = (patch) => setEditModal((prev) => ({ ...prev, data: { ...prev.data, ...patch } }));
          const proj = d.atividades?.projetos;
          const contexto = proj ? (proj.codigo_projeto ? `[${proj.codigo_projeto}] ${proj.titulo}` : proj.titulo) : 'Tarefa avulsa';
          const toISO = (offsetDays) => { const x = new Date(); x.setDate(x.getDate() + offsetDays); return x.toLocaleDateString('en-CA'); };
          const nextMonday = () => { const x = new Date(); const add = ((8 - x.getDay()) % 7) || 7; x.setDate(x.getDate() + add); return x.toLocaleDateString('en-CA'); };
          const quickDates = [
              { label: 'Hoje', value: toISO(0) },
              { label: 'Amanhã', value: toISO(1) },
              { label: 'Próx. semana', value: nextMonday() },
              { label: 'Sem data', value: '' },
          ];
          const responsavel = staff.find((s) => String(s.id) === String(d.responsavel_id));
          const extras = Array.isArray(d.colaboradores_extra) ? d.colaboradores_extra : [];
          const shareable = staff
              .filter(s => s.id !== d.responsavel_id)
              .filter(s => s.ativo !== false || extras.includes(s.id));

          return (
          <ModalPortal>
              <div className="ag-overlay" style={{ zIndex: 99999 }} onClick={() => setEditModal({show: false, data: null})}>
                  <form className="ag-modal ag-task" onClick={e => e.stopPropagation()} onSubmit={handleSaveModal} role="dialog" aria-label="Detalhes da tarefa">
                      <div className="ag-task-head">
                          <div className="ag-task-head-top">
                              <span className={`ag-task-ctx ${proj ? '' : 'is-loose'}`}><Icons.Folder size={12} /> {contexto}</span>
                              <div className="ag-task-head-actions">
                                  <button type="button" onClick={() => handleDeleteTaskFromKanban(d.id)} className="ag-icon-danger" title="Apagar tarefa" aria-label="Apagar tarefa">
                                      <Icons.Trash size={16} />
                                  </button>
                                  <button type="button" onClick={() => setEditModal({show: false, data: null})} className="ag-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                              </div>
                          </div>
                          <textarea
                              rows={1}
                              value={d.titulo}
                              onChange={e => setData({ titulo: e.target.value.replace(/\n/g, ' ') })}
                              required
                              className="ag-task-title"
                              placeholder="O que é para fazer?"
                              aria-label="Título da tarefa"
                          />
                      </div>

                      <div className="ag-task-body custom-scrollbar">
                          {/* Propriedades */}
                          <div className="ag-props">
                              <div className="ag-prop">
                                  <span className="ag-prop-label"><Icons.Users size={14} /> Responsável</span>
                                  <label className="ag-prop-value ag-person-select">
                                      <span className="ag-avatar">{responsavel?.avatar_url ? <img src={responsavel.avatar_url} alt="" /> : getSafeFirstName(responsavel?.nome, responsavel?.email).slice(0, 1)}</span>
                                      <select
                                          value={d.responsavel_id || ''}
                                          onChange={e => {
                                              const newResp = e.target.value;
                                              setEditModal(prev => {
                                                  const ex = Array.isArray(prev.data.colaboradores_extra) ? prev.data.colaboradores_extra : [];
                                                  return { ...prev, data: { ...prev.data, responsavel_id: newResp, colaboradores_extra: ex.filter(id => id !== newResp) } };
                                              });
                                          }}
                                      >
                                          {staff
                                              .filter(s => s.ativo !== false || String(s.id) === String(d.responsavel_id))
                                              .map(s => (
                                                  <option key={s.id} value={s.id}>{s.nome || s.email}{s.ativo === false ? ' (Inativo)' : ''}</option>
                                              ))}
                                      </select>
                                      <span className="ag-caret" aria-hidden="true">▾</span>
                                  </label>
                              </div>

                              <div className="ag-prop">
                                  <span className="ag-prop-label"><Icons.Calendar size={14} /> Data limite</span>
                                  <div className="ag-prop-value ag-date-row">
                                      <input type="date" value={d._form_deadline || ''} onChange={e => setData({ _form_deadline: e.target.value })} className="ag-date" />
                                      <div className="ag-date-chips">
                                          {quickDates.map((q) => (
                                              <button key={q.label} type="button" className={(d._form_deadline || '') === q.value ? 'is-on' : ''} onClick={() => setData({ _form_deadline: q.value })}>
                                                  {q.label}
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              </div>

                              <div className="ag-prop ag-prop-top">
                                  <span className="ag-prop-label"><Icons.Users size={14} /> Partilhar com</span>
                                  <div className="ag-prop-value ag-share custom-scrollbar">
                                      {shareable.map(s => {
                                          const isChecked = extras.includes(s.id);
                                          const sNome = getSafeFirstName(s.nome, s.email);
                                          return (
                                              <button type="button" key={s.id} onClick={() => toggleColaboradorExtra(s.id)} className={`ag-share-chip ${isChecked ? 'is-on' : ''}`} aria-pressed={isChecked}>
                                                  <span className="ag-avatar ag-avatar-sm">
                                                      {isChecked ? <Icons.Check size={10} /> : (s.avatar_url ? <img src={s.avatar_url} alt="" /> : sNome.slice(0, 1))}
                                                  </span>
                                                  {sNome}{s.ativo === false ? ' (Inativo)' : ''}
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>
                          </div>

                          {/* Documentos */}
                          <section
                              onDragOver={handleFileDragOver}
                              onDragLeave={handleFileDragLeave}
                              onDrop={handleFileDropGeneral}
                              className={`ag-docs ${isDraggingFile ? 'is-dragging' : ''}`}
                          >
                              <div className="ag-section-head">
                                  <span className="ag-section-icon"><Icons.FileText size={14} /></span>
                                  <h4>Documentos e entregáveis</h4>
                                  <span className="ag-count">{d.anexos?.length || 0}</span>
                              </div>

                              {d.anexos?.length > 0 && (
                                  <div className="ag-doc-list">
                                      {d.anexos.map((anexo) => (
                                          <div
                                              key={anexo.id}
                                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                              onDrop={(e) => handleFileDropSpecific(e, anexo.id)}
                                              className={`ag-doc ${anexo.url ? 'has-file' : anexo.file ? 'is-ready' : ''}`}
                                          >
                                              <span className="ag-doc-icon">{anexo.url ? <Icons.FileText size={16} /> : <Icons.UploadCloud size={16} />}</span>
                                              <div className="ag-doc-main">
                                                  <input type="text" placeholder="Nome do documento (ex: Contrato assinado)" value={anexo.nome} onChange={e => updateAnexo(anexo.id, 'nome', e.target.value)} className="ag-doc-name" />
                                                  <div className="ag-doc-meta">
                                                      {anexo.url ? (
                                                          <a href={anexo.url} target="_blank" rel="noopener noreferrer"><Icons.ExternalLink size={12} /> Abrir ficheiro</a>
                                                      ) : anexo.file ? (
                                                          <span className="is-ready"><Icons.UploadCloud size={12} /> Pronto a guardar: {anexo.file.name}</span>
                                                      ) : (
                                                          <span className="is-empty">Arrasta um ficheiro para aqui</span>
                                                      )}
                                                      <label className="ag-doc-date" title="Data limite do documento">
                                                          <Icons.Calendar size={11} />
                                                          <input type="date" value={anexo.data_limite} onChange={e => updateAnexo(anexo.id, 'data_limite', e.target.value)} />
                                                      </label>
                                                  </div>
                                              </div>
                                              <div className="ag-doc-actions">
                                                  <label className="ag-doc-btn" title="Anexar / substituir ficheiro">
                                                      <Icons.UploadCloud size={14} />
                                                      <input type="file" style={{display: 'none'}} onChange={(e) => handleFileSelect(e, anexo.id)} />
                                                  </label>
                                                  <button type="button" onClick={() => removeAnexoSlot(anexo.id)} className="ag-icon-danger" title="Remover" aria-label="Remover documento">
                                                      <Icons.Trash size={14} />
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}

                              <button type="button" onClick={addAnexoSlot} className="ag-dropzone">
                                  {isDraggingFile ? (
                                      <><Icons.UploadCloud size={22} /> <span>Larga os ficheiros aqui para anexar</span></>
                                  ) : (
                                      <><Icons.Plus size={14} /> <span>Adicionar documento <small>ou arrasta ficheiros para aqui</small></span></>
                                  )}
                              </button>
                          </section>

                          {/* Notas */}
                          <section className="ag-notes">
                              <div className="ag-section-head">
                                  <span className="ag-section-icon is-note"><Icons.Edit size={13} /></span>
                                  <h4>Notas</h4>
                              </div>
                              <textarea rows="3" value={d.descricao || ''} onChange={e => setData({ descricao: e.target.value })} placeholder="Link do drive, apontamentos da reunião..." className="ag-notes-input" />
                          </section>
                      </div>

                      <div className="ag-modal-foot">
                          <span className="ag-foot-meta">
                              {d.created_at ? <>Criada por <strong>{getSafeFirstName(d.criado_por_nome)}</strong> a {new Date(d.created_at).toLocaleDateString('pt-PT')}</> : ''}
                          </span>
                          <button type="button" onClick={() => setEditModal({show: false, data: null})} className="ag-btn ag-btn-ghost">Cancelar</button>
                          <button type="submit" disabled={isUploading} className="ag-btn ag-btn-primary">
                              {isUploading ? <><span className="ag-spinner" /> A carregar...</> : <><Icons.Save size={15}/> Guardar</>}
                          </button>
                      </div>
                  </form>
              </div>
          </ModalPortal>
          );
      })()}

      {/* MODAL DE TEMPO MANUAL */}
      {showTimeModal && (() => {
          const timeLogs = logs.filter(l => (l.duration_minutes || 0) > 0);
          const totalMins = timeLogs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
          const mins = Math.max(0, parseInt(timeLogForm.duration_minutes || "0", 10) || 0);
          const presets = [15, 30, 60, 120, 240, 480];
          const staffName = (id) => {
              const s = staff.find((x) => String(x.id) === String(id));
              return s?.nome || s?.email || 'Utilizador';
          };
          return (
          <ModalPortal>
              <div className="ag-overlay" style={{ zIndex: 99999 }} onClick={() => !timeLogSaving && setShowTimeModal(false)}>
                  <div className="ag-modal ag-timelog" onClick={e => e.stopPropagation()} role="dialog" aria-label="Registo de tempo">
                      <div className="ag-modal-head">
                          <span className="ag-modal-icon is-time"><Icons.Clock size={20} /></span>
                          <div>
                              <p className="ag-kicker">{editingTimeLogId ? 'A editar registo' : 'Tempo manual'}</p>
                              <h3>{editingTimeLogId ? 'Editar registo de tempo' : 'Novo registo de tempo'}</h3>
                          </div>
                          <button type="button" onClick={() => !timeLogSaving && setShowTimeModal(false)} className="ag-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                      </div>

                      <div className="ag-modal-body custom-scrollbar">
                          <form onSubmit={handleSaveTimeLog} className={`ag-time-form ${editingTimeLogId ? 'is-editing' : ''}`}>
                              <div className="ag-time-grid">
                                  <label className="ag-field">
                                      <span>Colaborador</span>
                                      <select value={timeLogForm.user_id} onChange={e => setTimeLogForm(prev => ({...prev, user_id: e.target.value}))} required className="ag-input">
                                          <option value="">Selecionar...</option>
                                          {staff
                                              .filter(s => s.ativo !== false || String(s.id) === String(timeLogForm.user_id))
                                              .map((s) => <option key={s.id} value={s.id}>{s.nome || s.email}{s.ativo === false ? ' (Inativo)' : ''}</option>)}
                                      </select>
                                  </label>
                                  <label className="ag-field">
                                      <span>Tarefa</span>
                                      <select value={timeLogForm.task_id} onChange={e => setTimeLogForm(prev => ({...prev, task_id: e.target.value}))} required className="ag-input">
                                          <option value="">Selecionar...</option>
                                          {uniqueTaskOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                      </select>
                                  </label>
                              </div>

                              <div className="ag-field">
                                  <span>Duração</span>
                                  <div className="ag-duration">
                                      <div className="ag-duration-input">
                                          <input type="number" min="1" value={timeLogForm.duration_minutes} onChange={e => setTimeLogForm(prev => ({...prev, duration_minutes: e.target.value}))} required placeholder="0" />
                                          <span>min</span>
                                      </div>
                                      <div className="ag-presets">
                                          {presets.map((p) => (
                                              <button key={p} type="button" className={mins === p ? 'is-on' : ''} onClick={() => setTimeLogForm(prev => ({...prev, duration_minutes: String(p)}))}>
                                                  {p < 60 ? `${p}m` : `${p / 60}h`}
                                              </button>
                                          ))}
                                      </div>
                                      <div className="ag-duration-preview" key={mins}>{formatTime(mins)}</div>
                                  </div>
                              </div>

                              <div className="ag-time-actions">
                                  <button type="button" onClick={() => setShowTimeModal(false)} className="ag-btn ag-btn-ghost">Cancelar</button>
                                  <button type="submit" disabled={timeLogSaving} className="ag-btn ag-btn-primary">
                                      {timeLogSaving ? <><span className="ag-spinner" /> A guardar...</> : <><Icons.Save size={15} /> {editingTimeLogId ? 'Guardar alterações' : 'Registar tempo'}</>}
                                  </button>
                              </div>
                          </form>

                          <div className="ag-section-head ag-logs-head">
                              <span className="ag-section-icon"><Icons.History size={14} /></span>
                              <h4>Registos</h4>
                              <span className="ag-count">{timeLogs.length}</span>
                              {totalMins > 0 && <span className="ag-logs-total">Total <strong>{formatTime(totalMins)}</strong></span>}
                          </div>

                          <div className="ag-logs">
                              {timeLogs.map((log, i) => {
                                  const dt = log.start_time ? new Date(log.start_time) : null;
                                  return (
                                      <div key={log.id} className={`ag-done ag-log ${editingTimeLogId === log.id ? 'is-editing' : ''}`} style={{ '--i': Math.min(i, 10) }}>
                                          <span className="ag-log-icon"><Icons.Clock size={13} /></span>
                                          <div className="ag-done-text">
                                              <span className="ag-log-task">{getTaskLabelById(log.task_id)}</span>
                                              <span className="ag-done-meta">
                                                  <Icons.Users size={10} /> {staffName(log.user_id)}
                                                  {dt && <><i /> {dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }).replace('.', '')}, {dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</>}
                                              </span>
                                          </div>
                                          <span className="ag-log-time">{formatTime(log.duration_minutes || 0)}</span>
                                          <div className="ag-log-actions">
                                              <button type="button" onClick={() => openTimeEditModal(log)} className="ag-icon-btn" title="Editar" aria-label="Editar registo"><Icons.Edit size={14} /></button>
                                              <button type="button" onClick={() => handleDeleteTimeLog(log.id)} className="ag-icon-danger" title="Apagar" aria-label="Apagar registo"><Icons.Trash size={14} /></button>
                                          </div>
                                      </div>
                                  );
                              })}
                              {timeLogs.length === 0 && (
                                  <div className="ag-done-empty"><span><Icons.Clock size={26} /></span>Sem registos de tempo.</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </ModalPortal>
          );
      })()}

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
          message="Se quiseres, adiciona uma nota breve sobre o que foi feito (opcional)."
          placeholder="Ex: Concluída análise e próximos passos definidos"
          showCompleteOption={Boolean(activeLog)}
          showStatusOption={Boolean(activeLog)}
          completeLabel={getStopCompleteLabel(activeLog)}
          onCancel={closeStopNoteModal}
          onConfirm={confirmStopWithNote}
      />

      {/* MODAL TAREFA RÁPIDA */}
      {showQuickTaskModal && (
          <ModalPortal>
              <div className="ag-overlay ag-overlay-top" style={{ zIndex: 99999 }} onClick={() => setShowQuickTaskModal(false)}>
                  <form
                      className="ag-quickbar"
                      onClick={e => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === 'Escape') setShowQuickTaskModal(false); }}
                      onSubmit={(e) => {
                          e.preventDefault();
                          if (!novaTarefaNome.trim()) return;
                          handleCreatePessoal(e);
                          setShowQuickTaskModal(false);
                      }}
                  >
                      <div className="ag-quickbar-row">
                          <span className="ag-quickbar-icon"><Icons.Flame size={20} /></span>
                          <input type="text" placeholder="O que vais fazer?" value={novaTarefaNome} onChange={e => setNovaTarefaNome(e.target.value)} autoFocus aria-label="Nova tarefa rápida" />
                          <button type="submit" className="ag-quickbar-go" disabled={!novaTarefaNome.trim()} aria-label="Adicionar">
                              <Icons.Plus size={18} />
                          </button>
                      </div>
                      <div className="ag-quickbar-foot">
                          <span>Tarefa avulsa · vai para o teu quadro</span>
                          <span className="ag-keys"><kbd>Enter</kbd> adicionar <kbd>Esc</kbd> fechar</span>
                      </div>
                  </form>
              </div>
          </ModalPortal>
      )}

      {confirmDialog.show && (
          <ModalPortal>
              <div className="ag-overlay" style={{ zIndex: 100000 }} onClick={closeConfirmDialog}>
                  <div className={`ag-dialog ${confirmDialog.isDanger ? 'is-danger' : ''}`} onClick={(e) => e.stopPropagation()} role="alertdialog">
                      <span className="ag-dialog-icon">{confirmDialog.isDanger ? <Icons.Trash size={24} /> : <Icons.AlertTriangle size={24} />}</span>
                      <h3>{confirmDialog.title || 'Confirmação'}</h3>
                      <p>{confirmDialog.message}</p>
                      <div className="ag-dialog-actions">
                          <button type="button" onClick={closeConfirmDialog} className="ag-btn ag-btn-ghost">Cancelar</button>
                          <button type="button" onClick={confirmDialog.onConfirm} className={`ag-btn ${confirmDialog.isDanger ? 'ag-btn-danger' : 'ag-btn-primary'}`}>
                              {confirmDialog.confirmText || 'Confirmar'}
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* NOTIFICAÇÃO (TOAST) */}
      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}
      
      <style>{`

          .hover-blue-text:hover { color: var(--color-btnPrimary) !important; }
          .hover-blue-text:hover span { background: var(--color-bgTertiary) !important; color: var(--color-btnPrimary) !important; }
          .tab-hover:hover { color: #0f172a !important; }
          .hover-red:hover { opacity: 1 !important; color: #dc2626 !important; }
          .hover-red-text:hover { color: #ef4444 !important; }
          .hover-underline:hover { text-decoration: underline !important; }
          
          .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .hover-border-blue:hover { border-color: var(--color-btnPrimary) !important; background-color: var(--color-bgSecondary) !important; }
          .hover-bg-blue-light:hover { background: var(--color-bgSecondary) !important; border-color: var(--color-btnPrimary) !important; }
          
          .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .input-focus-wrapper:focus-within { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important; }

          .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0% {box-shadow:0 0 0 0 rgba(239,68,68,0.7)} 70% {box-shadow:0 0 0 6px rgba(239,68,68,0)} 100% {box-shadow:0 0 0 0 rgba(239,68,68,0)}} 
          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  );
}
