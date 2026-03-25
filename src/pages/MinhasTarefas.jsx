import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { hasAttendanceStartedToday, startAttendanceNow } from "../utils/attendanceGuard";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import "./../styles/dashboard.css";

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

  // DRAG & DROP STATE (Kanban)
  const [draggedTask, setDraggedTask] = useState(null);
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
              const { data: staffData } = await supabase.from("profiles").select("id, nome, email").order("nome");
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
                  .order("created_at", { ascending: true }),
              supabase
                  .from("tarefas")
                  .select(baseSelect)
                  .contains("colaboradores_extra", [user.id])
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
      if(!window.confirm("Apagar esta tarefa permanentemente?")) return;
      await supabase.from("tarefas").delete().eq("id", taskId);
      showToast("Tarefa eliminada do arquivo."); openCompletedHistory();
  }
  
  // Função auxiliar de delete do Modal
  async function handleDeleteTaskFromKanban(taskId) {
      if(!window.confirm("Apagar esta tarefa do quadro?")) return;
      await supabase.from("tarefas").delete().eq("id", taskId);
      showToast("Tarefa apagada."); fetchMyTasks();
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
      if (!window.confirm("Apagar este registo de tempo?")) return;
      const { error } = await supabase.from("task_logs").delete().eq("id", logId);
      if (error) {
          showToast("Erro ao apagar registo.", "error");
          return;
      }
      setLogs((prev) => prev.filter((l) => String(l.id) !== String(logId)));
      showToast("Registo de tempo apagado.");
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
      if (!error) { setActiveLog(data); showToast("Cronómetro em curso!"); }
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
          await supabase.from("atividades").update({ estado: "concluido" }).eq("id", logEntry.atividade_id);
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

  async function finalizeStopWithNote(note, shouldComplete) {
      if (!activeLog) return;

      const logToStop = activeLog;
      const diffMins = await stopLogById(logToStop, note);
      if (diffMins === null) return;

      if (shouldComplete) await completeLogItem(logToStop);

      setActiveLog(null);
      showToast(shouldComplete ? `Tempo guardado: ${diffMins} min. Item concluido.` : `Tempo guardado: ${diffMins} min.`);
      carregarTudo();
  }

  async function confirmStopWithNote(note, shouldComplete) {
      setStopNoteModal({ show: false });
      if (!activeLog) return;

      if (shouldComplete) {
          await runActionWithAttendanceWarning(() => finalizeStopWithNote(note, shouldComplete));
          return;
      }

      await finalizeStopWithNote(note, shouldComplete);
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
      const novoEstado = task.estado === 'concluido' ? 'pendente' : 'concluido';
      const dataConclusao = novoEstado === 'concluido' ? new Date().toISOString() : null;

      await supabase.from("tarefas").update({ estado: novoEstado, data_conclusao: dataConclusao }).eq("id", task.id);
      showToast(novoEstado === 'concluido' ? "Boa! Tarefa concluída." : "Tarefa reaberta.");
      fetchMyTasks();
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

  const renderCardTarefa = (task) => {
      const isTimerActive = activeLog?.task_id === task.id;
      const timeSpent = getTaskTime(task.id);
      const isCompleted = task.estado === 'concluido';
      const taskDeadline = task.data_fim || task.data_limite;
      
      let dateColor = '#64748b';
      if (taskDeadline && !isCompleted) {
          const d = new Date(taskDeadline); d.setHours(0,0,0,0);
          const t = new Date(); t.setHours(0,0,0,0);
          if (d < t) dateColor = '#ef4444';
          else if (d.getTime() === t.getTime()) dateColor = '#2563eb';
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
              style={{ 
                  background: isTimerActive ? '#eff6ff' : 'white', 
                  borderRadius: '10px', padding: '12px 15px', marginBottom: '10px', 
                  border: isTimerActive ? '2px solid #3b82f6' : '1px solid #e2e8f0', 
                  boxShadow: isTimerActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)', 
                  display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'grab', 
                  opacity: (draggedTask?.id === task.id || isCompleted) ? 0.6 : 1,
                  transition: 'all 0.2s ease'
              }} 
              className="asana-card hover-shadow"
          >
              <button 
                onClick={() => handleCompleteTask(task)} 
                style={{
                    width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', marginTop: '2px', transition: '0.2s', flexShrink: 0, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    border: isCompleted ? 'none' : '2px solid #cbd5e1', 
                    background: isCompleted ? '#2563eb' : 'transparent',
                    color: isCompleted ? 'white' : 'transparent'
                }} 
                className="hover-check-circle" 
                title="Marcar como concluído"
              >
                  <Icons.Check size={12} />
              </button>

              <div style={{flex: 1, overflow: 'hidden'}}>
                  <h4 onClick={() => openEditModal(task)} style={{margin: '0 0 4px 0', fontSize: '0.95rem', color: isCompleted ? '#94a3b8' : '#1e293b', textDecoration: isCompleted ? 'line-through' : 'none', cursor: 'pointer', wordBreak: 'break-word', lineHeight: '1.4'}} className="hover-text-blue">
                      {task.titulo}
                  </h4>
                  
                  <div style={{fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      <Icons.Folder size={10} color="#cbd5e1" /> {contexto}
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                      <div style={{display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap'}}>
                          {showDelegated && creatorName && (
                              <span style={{fontSize: '0.65rem', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}} title="Atribuído por">
                                  🙋 De: {creatorName}
                              </span>
                          )}
                          {taskDeadline && <span style={{fontSize: '0.7rem', color: isCompleted ? '#94a3b8' : dateColor, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Calendar /> {new Date(taskDeadline).toLocaleDateString('pt-PT', {day:'2-digit', month:'short'})}</span>}
                          {task.descricao && <span style={{color: '#94a3b8'}} title="Tem notas"><Icons.FileText /></span>}
                          {totalDocs > 0 && <span style={{color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', fontWeight: 'bold'}} title="Documentos em Anexo"><Icons.FileText size={12} /> {totalDocs}</span>}
                          {hasExtraColabs && <span style={{color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', fontWeight: 'bold'}} title="Colaboradores partilhados"><Icons.Users size={12} /> +{task.colaboradores_extra.length}</span>}
                      </div>

                      <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          {timeSpent > 0 && <span style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Clock /> {formatTime(timeSpent)}</span>}
                          
                          {!isCompleted && (
                              <button onClick={() => handleToggleTimer(task)} style={{background: isTimerActive ? '#fee2e2' : '#f1f5f9', color: isTimerActive ? '#ef4444' : '#64748b', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s'}} className="hover-icon-btn">
                                  {isTimerActive ? <Icons.Stop /> : <Icons.Play />}
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderKanbanColumn = (id, title, icon, color, tasksList) => {
      const isOver = dragOverCol === id;

      return (
          <div 
              key={id}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, id)}
              style={{ 
                  background: isOver ? '#e0f2fe' : '#f8fafc', 
                  borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', height: '100%', 
                  border: isOver ? '2px dashed #3b82f6' : '1px solid transparent', 
                  minHeight: '60vh', transition: 'all 0.2s ease'
              }}
          >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: `2px solid ${color}30`}}>
                  <h3 style={{margin: 0, fontSize: '0.9rem', color: color, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      {icon} {title}
                  </h3>
                  <span style={{color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', background: 'white', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '12px'}}>{tasksList.length}</span>
              </div>
              
              <div style={{overflowY: 'auto', flex: 1, paddingRight: '5px'}} className="custom-scrollbar">
                  {tasksList.map(t => renderCardTarefa(t))}
                  
                  <form onSubmit={(e) => handleQuickAdd(e, id)} style={{marginTop: '5px'}}>
                      <div style={{position: 'relative'}}>
                          <span style={{position: 'absolute', left: '10px', top: '10px', color: '#94a3b8'}}><Icons.Plus /></span>
                          <input 
                              type="text" 
                              placeholder="Adicionar avulsa..." 
                              value={newTasks[id] || ''} 
                              onChange={e => setNewTasks({...newTasks, [id]: e.target.value})} 
                              style={{width: '100%', padding: '10px 10px 10px 32px', background: 'white', border: '1px dashed #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.85rem', color: '#475569', transition: '0.2s', boxSizing: 'border-box'}} 
                              className="input-focus"
                          />
                      </div>
                  </form>
              </div>
          </div>
      );
  };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;

  return (
    <div className="page-container" style={{padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '1600px', margin: '0 auto'}}>
      
      {/* HEADER DO KANBAN */}
      <div className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '15px', background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: '300px'}}>
              <div style={{background: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Kanban /></div>
              <div>
                  <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Agenda</h1>
                  <p style={{margin: '0', color: '#64748b', fontSize: '0.9rem', fontWeight: '500'}}>O teu quadro de produtividade pessoal. Arrasta os cartões!</p>
              </div>
          </div>
          
          <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
              <div style={{position: 'relative'}}>
                  <select 
                      value={selectedProjectFilter} 
                      onChange={(e) => setSelectedProjectFilter(e.target.value)}
                      style={{ padding: '8px 30px 8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', color: '#475569', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', appearance: 'none', height: '36px' }}
                      className="hover-shadow"
                  >
                      <option value="avulsas">⚪ Tarefas Avulsas</option>
                      <option value="todos">📁 Todos os Projetos</option>
                      {availableProjects.map(p => (
                          <option key={p.id} value={p.id}>📁 {p.name}</option>
                      ))}
                  </select>
                  <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.6rem', color: '#94a3b8'}}>▼</span>
              </div>

              <button onClick={openCompletedHistory} title="Histórico" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', background: '#f8fafc', padding: '0', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow hover-text-blue">
                  <Icons.History size={16} />
              </button>

              <button onClick={openTimeCreateModal} title="Tempo Manual" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#2563eb', background: '#eff6ff', padding: '0', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #bfdbfe', transition: '0.2s'}} className="hover-shadow">
                  <Icons.Clock size={16} />
              </button>

              <button onClick={() => setShowQuickTaskModal(true)} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#2563eb', fontWeight: '700', background: '#eff6ff', padding: '0 15px', height: '36px', borderRadius: '8px', border: '1px solid #bfdbfe', transition: '0.2s'}} className="hover-shadow">
                  <Icons.Plus size={14} /> Adicionar Tarefa
              </button>

              {activeLog && (
                  <div onClick={openActiveTimerLocation} className="hover-shadow" title="Clica para ir para a tarefa/atividade em curso" style={{background: 'linear-gradient(to right, #ef4444, #b91c1c)', color: 'white', padding: '10px 20px', borderRadius: '30px', display: 'inline-flex', alignItems: 'center', gap: '15px', border: '2px solid #fecaca', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)', cursor: 'pointer', transition: '0.2s', whiteSpace: 'nowrap'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.95rem'}}>
                          <span className="pulse-dot-white" style={{width: '8px', height: '8px'}}></span>
                          {getActiveTimerTitle().length > 30 ? `${getActiveTimerTitle().slice(0, 30)}...` : getActiveTimerTitle()}
                      </div>
                      <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)'}}></div>
                      <button type="button" onClick={openStopNoteModal} style={{background: 'white', color:'#ef4444', border:'none', borderRadius:'20px', padding:'6px 12px', cursor:'pointer', fontWeight:'700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s'}}><Icons.Stop /> Parar</button>
                  </div>
              )}
          </div>
      </div>

      {/* QUADRO KANBAN LIMPO COM A GRELHA ATIVADA */}
      <div className="kanban-grid" style={{flex: 1}}>
          {renderKanbanColumn("atrasadas", "Atrasadas", <Icons.AlertTriangle />, "#ef4444", tasks.atrasadas)}
          {renderKanbanColumn("hoje", "Para Hoje", <Icons.Flame />, "#d97706", tasks.hoje)}
          {renderKanbanColumn("amanha", "Amanhã", <Icons.Calendar />, "#3b82f6", tasks.amanha)}
          {renderKanbanColumn("depois", "Mais Tarde", <Icons.Calendar />, "#8b5cf6", tasks.depois)}
          {renderKanbanColumn("semData", "Sem Data", <Icons.Inbox />, "#64748b", tasks.semData)}
      </div>

      {/* MODAL GIGANTE DE TAREFAS CONCLUÍDAS */}
      {showCompletedModal && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)'}} onClick={() => setShowCompletedModal(false)}>
                  <div style={{background: '#fff', width: '90%', maxWidth: '750px', borderRadius: '16px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out', maxHeight: '85vh', display: 'flex', flexDirection: 'column'}} onClick={e => e.stopPropagation()}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <Icons.History color="#2563eb" size={24} /> Arquivo de Concluídas
                          </h3>
                          <button onClick={() => setShowCompletedModal(false)} style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display: 'flex'}} className="hover-red-text"><Icons.Close size={20} /></button>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', paddingBottom: '5px' }}>
                          {Object.keys(completedTasksGroups).map(groupName => {
                              const isActive = activeHistoryTab === groupName;
                              return (
                                  <button key={groupName} onClick={() => setActiveHistoryTab(groupName)} style={{ background: 'none', border: 'none', padding: '10px 15px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: isActive ? '800' : '600', color: isActive ? '#2563eb' : '#64748b', position: 'relative', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} className="tab-hover-green">
                                      {groupName} <span style={{ background: isActive ? '#dbeafe' : '#f1f5f9', color: isActive ? '#2563eb' : '#94a3b8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>{completedTasksGroups[groupName].length}</span>
                                      {isActive && <div style={{position:'absolute', bottom:'-6px', left:0, right:0, height:'3px', background:'#2563eb', borderRadius:'3px 3px 0 0'}} />}
                                  </button>
                              );
                          })}
                      </div>

                      <div style={{overflowY: 'auto', paddingRight: '10px', flex: 1}} className="custom-scrollbar">
                          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                              {completedTasksGroups[activeHistoryTab]?.map(t => {
                                  let ctx = "Avulsa";
                                  if (t.atividades?.projetos) {
                                      const p = t.atividades.projetos;
                                      ctx = p.codigo_projeto ? `[${p.codigo_projeto}] ${p.titulo}` : p.titulo;
                                  }

                                  return (
                                      <div key={t.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow">
                                          <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden'}}>
                                              <div style={{width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}><Icons.Check size={14} /></div>
                                              <div style={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                                                  <span style={{fontSize: '0.95rem', color: '#475569', textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500'}}>{t.titulo}</span>
                                                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px'}}>
                                                      <span style={{fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Folder size={10} /> {ctx.length > 40 ? ctx.slice(0,40)+'...' : ctx}</span>
                                                      <span style={{fontSize: '0.75rem', color: '#cbd5e1'}}>•</span>
                                                      <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>{new Date(t.data_conclusao || t.created_at).toLocaleDateString('pt-PT')}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div style={{display: 'flex', gap: '8px'}}>
                                              <button onClick={() => handleRestoreTask(t)} style={{background: 'white', border: '1px solid #cbd5e1', color: '#3b82f6', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s'}} className="hover-bg-blue-light"><Icons.Restore /> Restaurar</button>
                                              <button onClick={() => handlePermanentDelete(t.id)} style={{background: 'transparent', border: 'none', color: '#ef4444', padding: '6px', cursor: 'pointer', opacity: 0.6, transition: '0.2s'}} className="hover-red"><Icons.Trash /></button>
                                          </div>
                                      </div>
                                  );
                              })}
                              {completedTasksGroups[activeHistoryTab]?.length === 0 && (
                                  <div style={{textAlign: 'center', color: '#94a3b8', padding: '50px 0', fontSize: '0.95rem'}}><div style={{display: 'flex', justifyContent: 'center', marginBottom: '10px', opacity: 0.5}}><Icons.Inbox size={40} /></div>Não tens tarefas nesta categoria.</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* 💡 MODAL DE EDIÇÃO DE TAREFA (COM MÚLTIPLOS DOCUMENTOS E DRAG & DROP) */}
      {editModal.show && editModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)'}} onClick={() => setEditModal({show: false, data: null})}>
                  <div style={{background: '#fff', width: '90%', maxWidth: '650px', borderRadius: '16px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()} className="custom-scrollbar">
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Edit color="#2563eb" size={20} /> Detalhes da Tarefa</h3>
                          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                              <button onClick={() => { handleDeleteTaskFromKanban(editModal.data.id); setEditModal({show:false, data:null}); }} style={{background:'transparent', border:'none', cursor:'pointer', color:'#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold'}} className="hover-red-text" title="Apagar Tarefa">
                                  <Icons.Trash /> Apagar
                              </button>
                              <div style={{width: '1px', height: '20px', background: '#e2e8f0'}}></div>
                              <button onClick={() => setEditModal({show: false, data: null})} style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display: 'flex'}} className="hover-red-text"><Icons.Close size={20} /></button>
                          </div>
                      </div>

                      <form onSubmit={handleSaveModal}>
                          <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>O que é para fazer?</label>
                          <input type="text" value={editModal.data.titulo} onChange={e => setEditModal({...editModal, data: {...editModal.data, titulo: e.target.value}})} required style={{width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1.05rem', marginBottom: '20px', outline: 'none', boxSizing: 'border-box', fontWeight: 'bold', color: '#0f172a', transition: '0.2s'}} className="input-focus" />

                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                              <div>
                                  <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Responsável</label>
                                  <select 
                                      value={editModal.data.responsavel_id || ''} 
                                      onChange={e => {
                                          const newResp = e.target.value;
                                          setEditModal(prev => {
                                              const extras = Array.isArray(prev.data.colaboradores_extra) ? prev.data.colaboradores_extra : [];
                                              return { ...prev, data: { ...prev.data, responsavel_id: newResp, colaboradores_extra: extras.filter(id => id !== newResp) } }
                                          })
                                      }} 
                                      style={{width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer', transition: '0.2s'}} className="input-focus"
                                  >
                                      {staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Data Limite</label>
                                  <input type="date" value={editModal.data._form_deadline || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, _form_deadline: e.target.value}})} style={{width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: '0.2s'}} className="input-focus" />
                              </div>
                          </div>

                          <div style={{marginBottom: '20px'}}>
                              <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Partilhar com mais alguém?</label>
                              <div style={{background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', maxHeight: '120px', overflowY: 'auto'}} className="custom-scrollbar input-focus">
                                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                      {staff.filter(s => s.id !== editModal.data.responsavel_id).map(s => {
                                          const isChecked = Array.isArray(editModal.data.colaboradores_extra) && editModal.data.colaboradores_extra.includes(s.id);
                                          const sNome = getSafeFirstName(s.nome, s.email);
                                          return (
                                              <div key={s.id} onClick={() => toggleColaboradorExtra(s.id)} style={{ background: isChecked ? '#eff6ff' : '#f8fafc', color: isChecked ? '#2563eb' : '#64748b', border: `1px solid ${isChecked ? '#3b82f6' : '#e2e8f0'}`, padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px' }} className="hover-shadow">
                                                  {isChecked && '✓'} {sNome}
                                              </div>
                                          )
                                      })}
                                  </div>
                              </div>
                          </div>

                          {/* 💡 LISTA DE MÚLTIPLOS DOCUMENTOS E ENTREGÁVEIS (COM DRAG & DROP) */}
                          <div 
                              onDragOver={handleFileDragOver}
                              onDragLeave={handleFileDragLeave}
                              onDrop={handleFileDropGeneral}
                              style={{
                                  background: isDraggingFile ? '#f0f9ff' : '#fff', 
                                  border: isDraggingFile ? '2px dashed #3b82f6' : '1px solid #e2e8f0', 
                                  borderRadius: '8px', 
                                  padding: '20px', 
                                  marginBottom: '20px', 
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                  transition: 'all 0.2s ease'
                              }}
                          >
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#1e293b', fontSize: '0.95rem'}}>
                                      <Icons.FileText size={18} color="#2563eb" /> Documentos & Entregáveis
                                  </label>
                                  <span style={{background: '#e0f2fe', color: '#2563eb', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold'}}>{editModal.data.anexos?.length || 0} Itens</span>
                              </div>
                              
                              {editModal.data.anexos?.length > 0 && (
                                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                      {editModal.data.anexos.map((anexo) => (
                                          <div 
                                              key={anexo.id} 
                                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} // Permite dropar neste slot
                                              onDrop={(e) => handleFileDropSpecific(e, anexo.id)}
                                              style={{background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '15px'}}
                                          >
                                              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px'}}>
                                                  <div>
                                                      <label style={{display: 'block', marginBottom: '4px', fontSize: '0.7rem', fontWeight: '700', color: '#64748b'}}>Nome do Documento</label>
                                                      <input type="text" placeholder="Ex: Contrato Assinado" value={anexo.nome} onChange={e => updateAnexo(anexo.id, 'nome', e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '0.85rem'}} className="input-focus" />
                                                  </div>
                                                  <div>
                                                      <label style={{display: 'block', marginBottom: '4px', fontSize: '0.7rem', fontWeight: '700', color: '#64748b'}}>Data Limite</label>
                                                      <input type="date" value={anexo.data_limite} onChange={e => updateAnexo(anexo.id, 'data_limite', e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '0.85rem'}} className="input-focus" />
                                                  </div>
                                              </div>

                                              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '10px', borderRadius: '6px', border: '1px dashed #cbd5e1'}}>
                                                  {anexo.url ? (
                                                      <a href={anexo.url} target="_blank" rel="noopener noreferrer" style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.8rem'}}>
                                                          <Icons.ExternalLink size={14} /> Abrir Ficheiro Atual
                                                      </a>
                                                  ) : anexo.file ? (
                                                      <span style={{fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.UploadCloud size={14}/> Pronto a guardar: {anexo.file.name}</span>
                                                  ) : (
                                                      <span style={{fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic'}}>Arrasta ficheiro para aqui ou anexa</span>
                                                  )}

                                                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                                      <label style={{background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #e2e8f0'}} className="hover-shadow">
                                                          Anexar/Substituir
                                                          <input type="file" style={{display: 'none'}} onChange={(e) => handleFileSelect(e, anexo.id)} />
                                                      </label>
                                                      <button type="button" onClick={() => removeAnexoSlot(anexo.id)} style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px'}} className="hover-red-text" title="Apagar">
                                                          <Icons.Trash size={14} />
                                                      </button>
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}

                              {/* Área de Drop / Botão Adicionar */}
                              <div 
                                  onClick={addAnexoSlot}
                                  style={{
                                      width: '100%', marginTop: '15px', padding: isDraggingFile ? '25px 10px' : '15px 10px', 
                                      background: isDraggingFile ? '#e0f2fe' : '#f8fafc', 
                                      border: isDraggingFile ? '2px dashed #2563eb' : '1px dashed #cbd5e1', 
                                      borderRadius: '8px', color: isDraggingFile ? '#2563eb' : '#3b82f6', 
                                      fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', 
                                      justifyContent: 'center', alignItems: 'center', gap: '6px', transition: '0.2s'
                                  }} 
                                  className="hover-border-blue hover-shadow"
                              >
                                  {isDraggingFile ? (
                                      <>
                                          <Icons.UploadCloud size={24} />
                                          <span>Larga os ficheiros aqui para anexar</span>
                                      </>
                                  ) : (
                                      <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                          <Icons.Plus size={14} /> Adicionar Espaço ou Arrastar Ficheiros
                                      </div>
                                  )}
                              </div>
                          </div>

                          <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Notas / Descrição</label>
                          <textarea rows="4" value={editModal.data.descricao || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, descricao: e.target.value}})} placeholder="Ex: Link do drive, apontamentos da reunião..." style={{width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fffbeb', fontSize: '0.95rem', marginBottom: '30px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', transition: '0.2s'}} className="input-focus" />

                          <div style={{display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', alignItems: 'center'}}>
                              <div style={{flex: 1, fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic'}}>
                                  {editModal.data.created_at ? `Criado por: ${getSafeFirstName(editModal.data.criado_por_nome)} em ${new Date(editModal.data.created_at).toLocaleDateString('pt-PT')}` : ''}
                              </div>
                              <button type="button" onClick={() => setEditModal({show: false, data: null})} style={{padding: '12px 20px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" disabled={isUploading} style={{padding: '12px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', cursor: isUploading ? 'wait' : 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px', opacity: isUploading ? 0.7 : 1}} className="hover-shadow hover-bg-blue">
                                  {isUploading ? "A carregar PDFs..." : <><Icons.Save size={16}/> Guardar Alterações</>}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {showTimeModal && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)'}} onClick={() => !timeLogSaving && setShowTimeModal(false)}>
                  <div style={{background: '#fff', width: '92%', maxWidth: '760px', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}} onClick={e => e.stopPropagation()}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem'}}>{editingTimeLogId ? 'Editar Registo de Tempo' : 'Novo Registo de Tempo'}</h3>
                          <button onClick={() => !timeLogSaving && setShowTimeModal(false)} style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'}}><Icons.Close size={20} /></button>
                      </div>

                      <form onSubmit={handleSaveTimeLog} style={{display: 'grid', gap: '12px', marginBottom: '16px'}}>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                              <div>
                                  <label style={{display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: '#64748b', fontWeight: '700'}}>Colaborador</label>
                                  <select value={timeLogForm.user_id} onChange={e => setTimeLogForm(prev => ({...prev, user_id: e.target.value}))} style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1'}} required>
                                      <option value="">Selecionar...</option>
                                      {staff.map((s) => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label style={{display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: '#64748b', fontWeight: '700'}}>Tempo (minutos)</label>
                                  <input type="number" min="1" value={timeLogForm.duration_minutes} onChange={e => setTimeLogForm(prev => ({...prev, duration_minutes: e.target.value}))} style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1'}} required />
                              </div>
                          </div>
                          <div>
                              <label style={{display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: '#64748b', fontWeight: '700'}}>Tarefa</label>
                              <select value={timeLogForm.task_id} onChange={e => setTimeLogForm(prev => ({...prev, task_id: e.target.value}))} style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1'}} required>
                                  <option value="">Selecionar...</option>
                                  {uniqueTaskOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                              </select>
                          </div>
                          <div style={{fontSize: '0.78rem', color: '#64748b'}}>Pré-visualização: {formatTime(Math.max(0, parseInt(timeLogForm.duration_minutes || "0", 10) || 0))}</div>
                          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                              <button type="button" onClick={() => setShowTimeModal(false)} style={{padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white'}}>Cancelar</button>
                              <button type="submit" disabled={timeLogSaving} style={{padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700'}}>{timeLogSaving ? 'A guardar...' : 'Guardar'}</button>
                          </div>
                      </form>

                      <div style={{borderTop: '1px solid #e2e8f0', paddingTop: '12px', maxHeight: '260px', overflowY: 'auto'}} className="custom-scrollbar">
                          <table style={{width: '100%', borderCollapse: 'collapse'}}>
                              <thead>
                                  <tr style={{fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0'}}>
                                      <th style={{padding: '8px', textAlign: 'left'}}>Data</th>
                                      <th style={{padding: '8px', textAlign: 'left'}}>Tarefa</th>
                                      <th style={{padding: '8px', textAlign: 'left'}}>Quem</th>
                                      <th style={{padding: '8px', textAlign: 'right'}}>Tempo</th>
                                      <th style={{padding: '8px', textAlign: 'right'}}>Ações</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {logs.filter(l => (l.duration_minutes || 0) > 0).map((log) => (
                                      <tr key={log.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                                          <td style={{padding: '8px', fontSize: '0.78rem', color: '#64748b'}}>{log.start_time ? new Date(log.start_time).toLocaleString('pt-PT') : '-'}</td>
                                          <td style={{padding: '8px', fontSize: '0.8rem', color: '#334155'}}>{getTaskLabelById(log.task_id)}</td>
                                          <td style={{padding: '8px', fontSize: '0.8rem', color: '#334155'}}>{staff.find((s) => String(s.id) === String(log.user_id))?.nome || staff.find((s) => String(s.id) === String(log.user_id))?.email || 'Utilizador'}</td>
                                          <td style={{padding: '8px', textAlign: 'right', fontWeight: '700'}}>{formatTime(log.duration_minutes || 0)}</td>
                                          <td style={{padding: '8px', textAlign: 'right'}}>
                                              <button onClick={() => openTimeEditModal(log)} style={{border: 'none', background: 'transparent', color: '#f97316', cursor: 'pointer', marginRight: '6px'}}>✎</button>
                                              <button onClick={() => handleDeleteTimeLog(log.id)} style={{border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer'}}>🗑</button>
                                          </td>
                                      </tr>
                                  ))}
                                  {logs.filter(l => (l.duration_minutes || 0) > 0).length === 0 && (
                                      <tr><td colSpan={5} style={{padding: '12px', textAlign: 'center', color: '#94a3b8'}}>Sem registos de tempo.</td></tr>
                                  )}
                              </tbody>
                          </table>
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
          title="Parar cronometro"
          message="Se quiseres, adiciona uma nota breve sobre o que foi feito (opcional)."
          placeholder="Ex: Concluída análise e próximos passos definidos"
          showCompleteOption={Boolean(activeLog)}
          completeLabel={getStopCompleteLabel(activeLog)}
          onCancel={closeStopNoteModal}
          onConfirm={confirmStopWithNote}
      />

      {/* MODAL TAREFA RÁPIDA */}
      {showQuickTaskModal && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)'}} onClick={() => setShowQuickTaskModal(false)}>
                  <div style={{background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', width: '60px', height: '60px', borderRadius: '12px', margin: '0 auto 24px', color: '#2563eb'}}>
                          <Icons.Flame size={32} />
                      </div>
                      <h2 style={{margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.4rem', fontWeight: '900'}}>Nova Tarefa Rápida</h2>
                      <p style={{margin: '0 0 24px 0', color: '#64748b', fontSize: '0.9rem', fontWeight: '500'}}>Adiciona uma tarefa avulsa rápida ao teu quadro</p>
                      <form onSubmit={(e) => {
                          e.preventDefault();
                          if (!novaTarefaNome.trim()) return;
                          handleCreatePessoal(e);
                          setShowQuickTaskModal(false);
                      }} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                          <input type="text" placeholder="O que vais fazer?" value={novaTarefaNome} onChange={e => setNovaTarefaNome(e.target.value)} autoFocus style={{padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', transition: '0.2s'}} className="input-focus" />
                          <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                              <button type="button" onClick={() => setShowQuickTaskModal(false)} style={{background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: '0.2s', flex: 1}} className="hover-shadow">Cancelar</button>
                              <button type="submit" style={{background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: '0.2s', flex: 1}} className="hover-bg-blue">Adicionar</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* NOTIFICAÇÃO (TOAST) */}
      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}
      
      <style>{`
          .kanban-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; align-items: stretch; }
          @media (max-width: 1100px) { .kanban-grid { display: flex; overflow-x: auto; padding-bottom: 15px; } .kanban-grid > div { min-width: 300px; flex: 1; } }

          .hover-blue-text:hover { color: #2563eb !important; }
          .hover-blue-text:hover span { background: #e0f2fe !important; color: #2563eb !important; }
          .tab-hover:hover { color: #0f172a !important; }
          .hover-red:hover { opacity: 1 !important; color: #dc2626 !important; }
          .hover-red-text:hover { color: #ef4444 !important; }
          .hover-underline:hover { text-decoration: underline !important; }
          
          .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .hover-border-blue:hover { border-color: #3b82f6 !important; background-color: #eff6ff !important; }
          .hover-bg-blue-light:hover { background: #eff6ff !important; border-color: #3b82f6 !important; }
          
          .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .input-focus-wrapper:focus-within { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important; }

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