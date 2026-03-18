import { Link, useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext"; 
import WidgetAssiduidade from "../components/WidgetAssiduidade";
import TimerSwitchModal from "../components/TimerSwitchModal";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { frasesMotivacionais } from "../data/frases"; 
import "./../styles/dashboard.css";

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
  CircleDot: ({ size = 10, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><circle cx="12" cy="12" r="12"></circle></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function DashboardHome() {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  
  const [tarefasHoje, setTarefasHoje] = useState([]);
  const [tarefasGerais, setTarefasGerais] = useState([]);
    const [tarefasEmAnalise, setTarefasEmAnalise] = useState([]);
  const [stats, setStats] = useState({ projetos: 0, clientes: 0, forum: 0 });
  const [userProfile, setUserProfile] = useState(null);
  const [usersOnline, setUsersOnline] = useState([]);
  const [selectedOnlineUser, setSelectedOnlineUser] = useState(null);
  const [registosMes, setRegistosMes] = useState([]); // kept for history modal compat
  const [aniversarios, setAniversarios] = useState([]);
    const proximosAniversarios = aniversarios.slice(0, 3);

  const [activeLog, setActiveLog] = useState(null);

  const [showMenu, setShowMenu] = useState(false);
  const [frase, setFrase] = useState("");
  const [horaAtual, setHoraAtual] = useState("");
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false); 

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date()); 
  const [fullHistory, setFullHistory] = useState([]);
  const [totalHorasMes, setTotalHorasMes] = useState({ h: 0, m: 0 });
  
  const [editingRecord, setEditingRecord] = useState(null); 
  const [editForm, setEditForm] = useState({}); 
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ data: "", hora_entrada: "", hora_saida: "", tempo_pausa: 0, observacoes: "", motivo_alteracao: "" });

  const [recentWorkLogs, setRecentWorkLogs] = useState([]);
    const [recentTasksVisibleCount, setRecentTasksVisibleCount] = useState(2);
  const [alertModal, setAlertModal] = useState({ show: false, message: "" });
    const [timerSwitchModal, setTimerSwitchModal] = useState({
            show: false,
            message: "",
            pendingTask: null
    });
        const [stopNoteModal, setStopNoteModal] = useState({ show: false });
    const onlineCardRef = useRef(null);

    function formatBirthdayDate(proximoAniversario) {
        if (!(proximoAniversario instanceof Date) || isNaN(proximoAniversario.getTime())) return "";

        const currentYear = new Date().getFullYear();
        const formatOptions = {
            day: "2-digit",
            month: "long",
            ...(proximoAniversario.getFullYear() > currentYear ? { year: "numeric" } : {}),
        };

        return proximoAniversario.toLocaleDateString("pt-PT", formatOptions);
    }

  useEffect(() => {
    if (user) {
      refreshDashboardWorkItems();
      fetchStats();
      fetchUserProfile();
      loadUsersOnline();
      fetchAniversarios(); 
      checkActiveLog(); 

      const handleVisibilityRefresh = () => {
          if (document.visibilityState === 'visible') refreshDashboardWorkItems();
      };

      const handleWindowFocus = () => {
          refreshDashboardWorkItems();
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

      return () => {
          clearInterval(relogioInterval);
          clearInterval(onlineInterval);
                    clearInterval(workRefreshInterval);
                    window.removeEventListener('focus', handleWindowFocus);
                    document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      };
    }
  }, [user]);

    async function refreshDashboardWorkItems() {
            if (!user?.id) return;
            await Promise.all([
                    fetchTarefasPessoais(),
                fetchTarefasEmAnalise(),
                fetchRecentWorkLogs(),
                    checkActiveLog()
            ]);
    }



  useEffect(() => {
      if (showHistoryModal && user) loadFullHistory();
  }, [historyDate, showHistoryModal, user]);

  const getSafeFirstName = (nome, email) => {
      try {
          if (nome && typeof nome === 'string') return nome.trim().split(' ')[0];
          if (email && typeof email === 'string') return email.trim().split('@')[0];
          return "Colaborador";
      } catch (e) { return "Colaborador"; }
  };

  const getInitials = (name) => {
      try {
          if (!name || typeof name !== 'string') return "?";
          const cleanName = name.trim();
          if (!cleanName) return "?";
          const parts = cleanName.split(" ");
          if (parts.length > 1) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
          return cleanName.substring(0, 2).toUpperCase();
      } catch(e) { return "?"; }
  };

  const getClientDisplayName = (client) => {
      if (!client) return "";
      return client.sigla?.trim() || client.marca || "";
  };

  async function fetchUserProfile() {
    try {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setUserProfile(data);
    } catch (error) { console.error("Erro perfil:", error); }
  }

  // 💡 O CÉREBRO DO CRONÓMETRO: Descobre as hierarquias e Clientes para formatar "Empresa - Projeto (Tarefa)"
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
              let title = "Tempo a decorrer...";
              let foundProjectId = activeRow.projeto_id;
              let projName = "";
              let brandName = "";
              
              if (activeRow.subtarefa_id) {
                  const { data: res } = await supabase.from("subtarefas").select("titulo, tarefas(atividades(projeto_id, projetos(titulo, clientes(marca, sigla))))").eq("id", activeRow.subtarefa_id).maybeSingle();
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
                  const { data: res } = await supabase.from("tarefas").select("titulo, atividades(projeto_id, projetos(titulo, clientes(marca, sigla)))").eq("id", taskId).maybeSingle();
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
                  const { data: res } = await supabase.from("atividades").select("titulo, projeto_id, projetos(titulo, clientes(marca, sigla))").eq("id", activeRow.atividade_id).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      const proj = Array.isArray(res.projetos) ? res.projetos[0] : res.projetos;
                      if (proj) {
                          foundProjectId = res.projeto_id;
                          projName = proj.titulo;
                          brandName = getClientDisplayName(proj.clientes);
                      }
                  }
              } else if (activeRow.projeto_id) {
                  const { data: res } = await supabase.from("projetos").select("titulo, clientes(marca, sigla)").eq("id", activeRow.projeto_id).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      projName = res.titulo;
                      brandName = getClientDisplayName(res.clientes);
                  }
              }
              
              // Constrói o texto do botão do Timer
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

  // 💡 NAVEGAÇÃO DO CRONÓMETRO (Encaminha as avulsas para Minhas Tarefas)
  function navigateToActiveTask() {
      if (!activeLog) return;
      if (activeLog.resolvedProjectId) {
          navigate(`/dashboard/projetos/${activeLog.resolvedProjectId}`);
      } else {
          // Se não tem projeto, é avulsa!
          navigate("/dashboard/minhas-tarefas");
      }
  }

  const getActiveTaskName = () => {
      if (!activeLog) return "";
      return activeLog.taskTitle || "Tempo a decorrer...";
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
          await supabase.from("atividades").update({ estado: "concluido" }).eq("id", logEntry.atividade_id);
          return;
      }

      if (logEntry.projeto_id) {
          await supabase.from("projetos").update({ estado: "concluido" }).eq("id", logEntry.projeto_id);
      }
  }

  async function confirmStopWithNote(note, shouldComplete) {
      setStopNoteModal({ show: false });
      if (!activeLog) return;

      const logToStop = activeLog;
      await handleStopGlobalLog(null, note);
      if (shouldComplete) {
          await completeLogItem(logToStop);
          showToast("Tempo guardado e item concluido.", "success");
          await refreshDashboardWorkItems();
      }
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
      await startTaskFromHomeDirect(nextTask);
  }

  function cancelTimerSwitch() {
      setTimerSwitchModal({ show: false, message: "", pendingTask: null });
      showToast("Mantivemos o cronómetro atual em execução.", "info");
  }

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

      await startTaskFromHomeDirect(taskCard);
  }

  async function fetchAniversarios() {
      const { data, error } = await supabase.from('profiles').select('id, nome, avatar_url, data_nascimento').not('data_nascimento', 'is', null);
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

          if (myBirthdayIsToday && !sessionStorage.getItem('birthdayPopupSeen')) {
              setShowBirthdayPopup(true);
              sessionStorage.setItem('birthdayPopupSeen', 'true');
          }
      }
  }

  async function loadUsersOnline() {
    const hoje = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from("assiduidade")
            .select("*, profiles(nome, avatar_url, funcao, empresa_interna, telemovel, email, data_nascimento)")
            .eq("data_registo", hoje)
            .is("hora_saida", null)
            .order("hora_entrada", { ascending: true }); 
    if (!error && data) setUsersOnline(data);
  }

  async function fetchRegistosMes() {
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      const { data, error } = await supabase.from("assiduidade").select("*").eq("user_id", user.id).gte("data_registo", primeiroDia).order("data_registo", { ascending: false }).limit(5);
      if (!error && data) setRegistosMes(data);
  }

  async function fetchTarefasPessoais() {
      const { data: tarefas } = await supabase
          .from("tarefas")
          .select(`*, atividades ( titulo, data_fim, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes(marca, sigla) ) )`)
          .or(`responsavel_id.eq.${user.id},colaboradores_extra.cs.{${user.id}}`)
          .neq("estado", "concluido")
          .neq("estado", "cancelado");

      const { data: atividades } = await supabase
          .from("atividades")
          .select(`*, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes(marca, sigla) )`)
          .or(`responsavel_id.eq.${user.id},colaboradores_extra.cs.{${user.id}}`)
          .neq("estado", "concluido")
          .neq("estado", "cancelado");

      let combinedTasks = [];

      if (tarefas) {
          const formattedTasks = tarefas.map(t => {
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

      if (atividades) {
          const formattedAtivs = atividades.map(a => {
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
      }
  }

  async function fetchTarefasEmAnalise() {
      try {
          const { data: tarefas } = await supabase
              .from("tarefas")
              .select(`*, atividades ( titulo, data_fim, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes(marca, sigla) ) )`)
              .or(`responsavel_id.eq.${user.id},colaboradores_extra.cs.{${user.id}}`)
              .eq("estado", "em_analise");

          const { data: atividades } = await supabase
              .from("atividades")
              .select(`*, projetos ( id, titulo, codigo_projeto, cliente_texto, clientes(marca, sigla) )`)
              .or(`responsavel_id.eq.${user.id},colaboradores_extra.cs.{${user.id}}`)
              .eq("estado", "em_analise");

          let combinedAnalysis = [];

          if (tarefas) {
              const formattedTasks = tarefas.map((t) => {
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
              });
              combinedAnalysis = [...combinedAnalysis, ...formattedTasks];
          }

          if (atividades) {
              const formattedAtivs = atividades.map((a) => {
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
              });
              combinedAnalysis = [...combinedAnalysis, ...formattedAtivs];
          }

          combinedAnalysis.sort((a, b) => {
              if (!a.computedDeadline) return 1;
              if (!b.computedDeadline) return -1;
              return new Date(a.computedDeadline) - new Date(b.computedDeadline);
          });

          setTarefasEmAnalise(combinedAnalysis);
      } catch (err) {
          console.error("Erro ao carregar tarefas em análise:", err);
          setTarefasEmAnalise([]);
      }
  }

  async function fetchStats() {
    const { count: countProjetos } = await supabase.from("projetos").select("*", { count: 'exact', head: true }).neq("estado", "cancelado").neq("estado", "concluido");
    const { count: countClientes } = await supabase.from("clientes").select("*", { count: 'exact', head: true });
    const { count: countForum } = await supabase.from("forum_posts").select("*", { count: 'exact', head: true });
    
    setStats({ projetos: countProjetos || 0, clientes: countClientes || 0, forum: countForum || 0 });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/"); 
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
      if (segundos === 0) return <span style={{color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem'}}>Em curso</span>;
      const horas = Math.floor(segundos / 3600);
      const minutos = Math.floor((segundos % 3600) / 60);
      return <span style={{fontWeight: 'bold', color: '#2563eb'}}>{horas}h{minutos.toString().padStart(2, '0')}</span>;
  };

  const renderTaskDeadline = (dateString) => {
      if (!dateString) return <span style={{fontSize: '0.65rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px'}}>Sem Prazo</span>;
      const d = new Date(dateString); 
      if (isNaN(d.getTime())) return <span style={{fontSize: '0.65rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px'}}>Sem Prazo</span>;
      
      d.setHours(0,0,0,0);
      const t = new Date(); t.setHours(0,0,0,0);
      const diffTime = d.getTime() - t.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return <span style={{background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.AlertTriangle size={10} /> Atrasada</span>;
      if (diffDays === 0) return <span style={{background: '#fefce8', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Flame size={10} /> Hoje</span>;
      return <span style={{background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Calendar size={10} /> {d.toLocaleDateString('pt-PT').slice(0,5)}</span>;
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

  useEffect(() => {
      setRecentTasksVisibleCount(2);
  }, [tarefasRecentesCards.length]);

  const userFirstName = getSafeFirstName(userProfile?.nome, userProfile?.email);

  return (
    <div className="dashboard-home modern-boom factorial-like">
      
      {/* HEADER ESTÁTICO (Sem bugs no scroll) */}
    <div className="dashboard-hero boom-reveal" style={{ '--d': '20ms', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'white', padding: '18px 24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(15,23,42,0.04)', border: '1px solid #ebe7df', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 40, overflow: 'visible' }}>
        <div>
           <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
               <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#22242a' }}>Bom Dia, {userFirstName}</h1>
               <span style={{background: '#f7f4ee', color: '#6b7280', padding: '4px 10px', borderRadius: '10px', fontWeight: '700', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #ebe7df'}}>
                   <Icons.Clock /> {horaAtual}
               </span>
           </div>
           <p style={{ margin: '7px 0 0 0', color: '#6b7280', fontStyle: 'italic', fontSize: '0.92rem', lineHeight: 1.45, maxWidth: '760px' }}>"{frase}"</p>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            
            {activeLog && (
                <div 
                    onClick={navigateToActiveTask}
                    className="hover-shadow"
                    style={{
                        background: 'linear-gradient(to right, #ef4444, #b91c1c)', color: 'white', padding: '10px 20px', 
                        borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '15px', 
                        cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)', transition: '0.2s',
                        border: '2px solid #fecaca'
                    }}
                    title="Clica para ir para a Tarefa"
                >
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.95rem'}}>
                        <span className="pulse-dot-white"></span> 
                        {getActiveTaskName().length > 30 ? getActiveTaskName().slice(0, 30) + '...' : getActiveTaskName()}
                    </div>
                    <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)'}}></div>
                    <button 
                        onClick={openStopNoteModal} 
                        style={{
                            background: 'white', color: '#ef4444', border: 'none', borderRadius: '20px', 
                            padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', 
                            display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                        title="Parar o tempo"
                    >
                        <Icons.Stop /> Parar
                    </button>
                </div>
            )}

            <div style={{ position: 'relative' }}>
                <div onClick={() => setShowMenu(!showMenu)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', background: showMenu ? '#f1f5f9' : 'transparent', transition: 'all 0.2s' }}>
                    <div style={{textAlign: 'right', display: 'flex', flexDirection: 'column'}}>
                         <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#334151'}}>{userFirstName}</span>
                         <span style={{fontSize: '0.75rem', color: '#2563eb', fontWeight: '500'}}>{userProfile?.empresa_interna || 'Empresa'}</span>
                    </div>
                    
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)', overflow: 'hidden' }}>
                        {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="User" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        ) : (
                            getInitials(userProfile?.nome)
                        )}
                    </div>
                </div>

                {showMenu && (
                  <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', minWidth: '220px', zIndex: 9999, overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{padding: '12px 15px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc'}}><span style={{fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px'}}>A Minha Conta</span></div>
                    <button className="menu-item" onClick={() => navigate("/dashboard/perfil")}><Icons.User /> O Meu Perfil</button>
                    <button className="menu-item" onClick={() => navigate("/dashboard/ferias")}><Icons.Sun /> Férias & Ausências</button>
                                        <button className="menu-item" onClick={() => navigate("/dashboard/pedido-km")}><Icons.Calendar /> Pedido de Km's</button>
                    <button className="menu-item logout" onClick={handleLogout} style={{borderTop: '1px solid #f1f5f9'}}><Icons.LogOut /> Terminar Sessão</button>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* GRID PRINCIPAL (2 COLUNAS 100% FOCADAS E ARRUMADAS) */}
    <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '28px', alignItems: 'start' }}>
        
        {/* COLUNA ESQUERDA: Stats, Assiduidade, Histórico, Equipa & Aniversários */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            
            {/* --- OS 3 CARTÕES DE RESUMO --- */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="card stat-card neo-stat boom-reveal" onClick={() => navigate("/dashboard/projetos")} style={{ '--d': '90ms', borderLeft: '3px solid #a8b7d1', cursor: 'pointer', transition: '0.2s', padding: '16px' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <div><h3 style={{fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0'}}>Projetos Ativos</h3><p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{stats.projetos}</p></div>
                        <span style={{background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '8px', display: 'flex'}}><Icons.Rocket size={18}/></span>
                    </div>
                </div>

                <div className="card stat-card neo-stat boom-reveal" onClick={() => navigate("/dashboard/clientes")} style={{ '--d': '140ms', borderLeft: '3px solid #93c5fd', cursor: 'pointer', transition: '0.2s', padding: '16px' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <div><h3 style={{fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0'}}>Total Clientes</h3><p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{stats.clientes}</p></div>
                        <span style={{background: '#dbeafe', color: '#2563eb', padding: '6px', borderRadius: '8px', display: 'flex'}}><Icons.Users size={18}/></span>
                    </div>
                </div>

                <div className="card stat-card neo-stat boom-reveal" onClick={() => navigate("/dashboard/forum")} style={{ '--d': '190ms', borderLeft: '3px solid #d4b48f', cursor: 'pointer', transition: '0.2s', padding: '16px' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <div><h3 style={{fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0'}}>Comunicação</h3><p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{stats.forum}</p></div>
                        <span style={{background: '#fef3c7', color: '#d97706', padding: '6px', borderRadius: '8px', display: 'flex'}}><Icons.Message size={18}/></span>
                    </div>
                </div>
            </div>

            {/* PONTO / ASSIDUIDADE */}
                        <div className="boom-reveal" style={{ '--d': '230ms' }}>
                            <WidgetAssiduidade onViewHistory={() => setShowHistoryModal(true)} />
                        </div>

            {/* 💡 EQUIPA E ANIVERSÁRIOS EM STACK VERTICAL */}
            <div className="bottom-split-grid" style={{display: 'flex', flexDirection: 'column', gap: '18px'}}>
                
                {/* ── EQUIPA ONLINE ── */}
                <div ref={onlineCardRef} className="card online-showcase boom-reveal" style={{ '--d': '280ms', padding: '20px', background: '#ffffff', borderRadius: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #dbe6f5', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                        <h4 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Activity size={18} color="#2563eb" /> Equipa Online</h4>
                        <span style={{background: '#f8fbff', color: '#64748b', padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700', border: '1px solid #dbe6f5'}}>{usersOnline.length} online</span>
                    </div>
                    
                    {usersOnline.length > 0 ? (
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px'}}>
                        {usersOnline.map(u => {
                            const uNome = getSafeFirstName(u.profiles?.nome, "");
                            return (
                            <div key={u.id} onClick={() => setSelectedOnlineUser(u)}
                                title={`${u.profiles?.nome || ''} · entrou às ${u.hora_entrada?.slice(0,5)}`}
                                style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer', padding:'8px 4px', borderRadius:'14px', transition:'all 0.2s ease', background:'rgba(255,255,255,0.7)', boxShadow:'0 2px 8px rgba(15,23,42,0.05)'}}
                                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.95)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(15,23,42,0.1)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.7)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(15,23,42,0.05)'; e.currentTarget.style.transform='translateY(0)'; }}>
                                <div style={{position:'relative'}}>
                                    <div style={{width:'38px', height:'38px', borderRadius:'50%', background:'#3b82f6', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'0.7rem', overflow:'hidden', border:'2px solid #ffffff', boxShadow:'0 2px 6px rgba(59,130,246,0.15)'}}>
                                        {u.profiles?.avatar_url
                                            ? <img src={u.profiles.avatar_url} alt="U" style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block'}} />
                                            : getInitials(u.profiles?.nome)}
                                    </div>
                                    <span style={{position:'absolute', bottom:'0px', right:'0px', width:'8px', height:'8px', background:'#2563eb', borderRadius:'50%', border:'1.5px solid white', display:'block'}}></span>
                                </div>
                                <span style={{fontSize:'0.65rem', fontWeight:'600', color:'#334155', textAlign:'center', width:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{uNome}</span>
                                <span style={{fontSize:'0.6rem', color:'#94a3b8'}}>{u.hora_entrada?.slice(0,5)}</span>
                            </div>
                        )})}
                        </div>
                    ) : (
                        <div style={{textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}>Ninguém online.</div>
                    )}
                </div>

                {/* ── ANIVERSÁRIOS ── */}
                <div className="card birthday-showcase boom-reveal" style={{ '--d': '330ms', padding: '20px', background: '#ffffff', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #ebe7df', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                        <h4 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Cake size={18} color="#f59e0b" /> Aniversários</h4>
                    </div>
                    {proximosAniversarios.length > 0 ? (
                        <div style={{display: 'grid', gridTemplateColumns: `repeat(${proximosAniversarios.length}, 1fr)`, gap: '12px'}}>
                        {proximosAniversarios.map(a => {
                            const isHoje = a.proximoAniversario.getDate() === new Date().getDate() && a.proximoAniversario.getMonth() === new Date().getMonth();
                            const aNome = getSafeFirstName(a.nome, "");
                            const day = String(a.proximoAniversario.getDate()).padStart(2, '0');
                            const monthShort = a.proximoAniversario.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase();
                            return (
                            <div key={a.id} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', padding:'16px 12px', borderRadius:'16px', background: isHoje ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' : '#fcfcfb', border: isHoje ? '1px solid #fdba74' : '1px solid #e7e5e4', boxShadow: isHoje ? '0 10px 22px rgba(251,146,60,0.18)' : '0 4px 12px rgba(15,23,42,0.05)', textAlign:'center', position:'relative'}}>
                                {/* Avatar */}
                                <div style={{width:'72px', height:'72px', borderRadius:'50%', background: isHoje ? '#f97316' : '#f59e0b', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'1rem', overflow:'hidden', flexShrink:0, border:'3px solid #fff', boxShadow:'0 4px 12px rgba(0,0,0,0.12)'}}>
                                    {a.avatar_url
                                        ? <img src={a.avatar_url} alt="U" style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block'}} />
                                        : getInitials(a.nome)}
                                </div>
                                {/* Nome */}
                                <div style={{fontWeight:'700', color:'#1e293b', fontSize:'0.9rem', lineHeight:1.2}}>{aNome}</div>
                                {/* Tipo */}
                                <div style={{fontSize:'0.75rem', color: isHoje ? '#c2410c' : '#64748b', fontWeight:'600', display:'flex', alignItems:'center', gap:'4px'}}>
                                    {isHoje
                                        ? <><Icons.Gift size={14} color="#c2410c" /> Hoje!</>
                                        : <><Icons.Cake size={14} color="#64748b" /> Aniversário</>}
                                </div>
                                {/* Badge da data */}
                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', background: isHoje ? '#fb923c' : '#f1f5f9', borderRadius:'10px', padding:'5px 14px', marginTop:'2px'}}>
                                    <span style={{fontSize:'0.6rem', fontWeight:'800', color: isHoje ? 'rgba(255,255,255,0.85)' : '#94a3b8', letterSpacing:'0.08em'}}>{monthShort}</span>
                                    <span style={{fontSize:'1.1rem', fontWeight:'800', color: isHoje ? '#fff' : '#334155', lineHeight:1}}>{day}</span>
                                </div>
                            </div>
                        )})}
                        </div>
                    ) : (
                        <div style={{textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Nenhum aniversário.</div>
                    )}
                </div>

            </div>
        </div>

        {/* COLUNA DIREITA: SÓ TAREFAS */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>

            {/* 🕐 RETOMAR - ÚLTIMAS TAREFAS TRABALHADAS */}
            <div className="card boom-reveal" style={{ '--d': '280ms', padding: '20px', background: 'white', borderRadius: '16px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <Icons.Clock size={18} color="#8b5cf6" /> Retomar Trabalho
                    </h4>
                    <span style={{fontSize:'0.72rem', color:'#94a3b8', fontStyle:'italic'}}>Últimas atividades do cronómetro</span>
                </div>
                {tarefasRecentesCards.length > 0 ? (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        {tarefasRecentesCards.slice(0, recentTasksVisibleCount).map((t) => {
                            const isRunning = isTaskCardRunning(t);
                            return (
                            <div key={`recent_${t.id}`} onClick={() => navigate(t.clientLabel === 'GERAL / AVULSA' ? '/dashboard/minhas-tarefas' : (t.isActivity ? '/dashboard/atividades' : '/dashboard/tarefas'))} className="task-hover-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', padding: '2px 6px', borderRadius: '6px', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.clientLabel}>
                                        {t.clientLabel === 'GERAL / AVULSA' ? (
                                            <strong style={{color: '#1e293b', fontWeight: '800'}}>GERAL / AVULSA</strong>
                                        ) : (
                                            <>{t.clientLabel}</>
                                        )}
                                    </span>
                                    <span style={{fontSize:'0.65rem', color:'#64748b', background:'#f8fafc', padding:'2px 8px', borderRadius:'12px', fontWeight:'600', display:'flex', alignItems:'center', gap:'3px'}}>
                                        <Icons.Clock size={9} /> {formatLastWorked(t.last_worked)}
                                    </span>
                                </div>
                                <h4 style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.3' }}>{t.titulo}</h4>
                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9', gap: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{t.parentTitle}</span>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <button
                                            onClick={(e) => handleStartTaskFromHome(t, e)}
                                            title={isRunning ? 'Parar temporizador' : 'Retomar temporizador'}
                                            style={{border: 'none', background: isRunning ? '#fee2e2' : '#eff6ff', color: isRunning ? '#ef4444' : '#2563eb', borderRadius: '999px', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                        >
                                            {isRunning ? <Icons.Stop size={10} /> : <Icons.Play size={10} />}
                                        </button>
                                        <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}><Icons.ChevronRight size={14} /></span>
                                    </div>
                                </div>
                            </div>
                        )})}
                        </div>
                        {(recentTasksVisibleCount < tarefasRecentesCards.length || recentTasksVisibleCount > 2) && (
                            <div style={{display: 'flex', justifyContent: 'center', marginTop: '14px', gap: '8px'}}>
                                {recentTasksVisibleCount < tarefasRecentesCards.length && (
                                    <button
                                        className="btn-small hover-shadow"
                                        style={{background: '#eff6ff', color: '#2563eb', fontWeight: '700'}}
                                        onClick={() => setRecentTasksVisibleCount((prev) => Math.min(prev + 2, tarefasRecentesCards.length))}
                                    >
                                        Ver mais
                                    </button>
                                )}
                                {recentTasksVisibleCount > 2 && (
                                    <button
                                        className="btn-small hover-shadow"
                                        style={{background: '#f8fafc', color: '#64748b', fontWeight: '700', border: '1px solid #e2e8f0'}}
                                        onClick={() => setRecentTasksVisibleCount(2)}
                                    >
                                        Recolher
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '12px'}}>
                        Ainda não tens tarefas recentes para retomar.
                    </div>
                )}
            </div>

            {/* 🔥 TAREFAS URGENTES / PARA HOJE */}
            <div className="card boom-reveal" style={{ '--d': '280ms', padding: '20px', background: 'white', borderRadius: '16px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Flame color="#ef4444" /> Para Hoje / Atrasadas</h4>
                    {tarefasHoje.length > 6 && (
                        <button className="btn-small hover-shadow" style={{background: '#eff6ff', color: '#2563eb', fontWeight: 'bold'}} onClick={() => navigate("/dashboard/tarefas")}>
                            Ver as {tarefasHoje.length} <Icons.ChevronRight />
                        </button>
                    )}
                </div>
                
                {tarefasHoje.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '12px'}}>
                        Sem tarefas urgentes! 🎉
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {tarefasHoje.slice(0, 6).map((t) => {
                        const isRunning = isTaskCardRunning(t);
                        return (
                        <div key={t.id} onClick={() => navigate(t.clientLabel === 'GERAL / AVULSA' ? '/dashboard/minhas-tarefas' : (t.isActivity ? '/dashboard/atividades' : '/dashboard/tarefas'))} className="task-hover-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                {/* 💡 LABEL EMPRESA - PROJETO ou GERAL/AVULSA */}
                                <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', padding: '2px 6px', borderRadius: '6px', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.clientLabel}>
                                    {t.clientLabel === 'GERAL / AVULSA' ? (
                                        <strong style={{color: '#1e293b', fontWeight: '800'}}>GERAL / AVULSA</strong>
                                    ) : (
                                        <>{t.clientLabel}</>
                                    )}
                                </span>
                                {renderTaskDeadline(t.computedDeadline)}
                            </div>
                            
                            <h4 style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.3' }}>{t.titulo}</h4>
                            
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{t.parentTitle}</span>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <button
                                        onClick={(e) => handleStartTaskFromHome(t, e)}
                                        title={isRunning ? 'Parar temporizador' : 'Iniciar temporizador'}
                                        style={{border: 'none', background: isRunning ? '#fee2e2' : '#eff6ff', color: isRunning ? '#ef4444' : '#2563eb', borderRadius: '999px', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                    >
                                        {isRunning ? <Icons.Stop size={10} /> : <Icons.Play size={10} />}
                                    </button>
                                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}><Icons.ChevronRight size={14} /></span>
                                </div>
                            </div>
                        </div>
                    )})}
                    </div>
                )}
            </div>

            {/* 📋 OUTRAS TAREFAS E ATIVIDADES (FUTURO) */}
            <div className="card boom-reveal" style={{ '--d': '330ms', padding: '20px', background: 'white', borderRadius: '16px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Clipboard color="#2563eb" /> Próximas Tarefas / Blocos</h4>
                    {tarefasGerais.length > 8 && (
                        <button className="btn-small hover-shadow" style={{background: '#f8fafc', color: '#64748b', fontWeight: 'bold'}} onClick={() => navigate("/dashboard/tarefas")}>
                            Ver as {tarefasGerais.length} <Icons.ChevronRight />
                        </button>
                    )}
                </div>
                
                {tarefasGerais.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '12px'}}>
                        Não tens mais tarefas pendentes. 😎
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {tarefasGerais.slice(0, 6).map((t) => {
                        const isRunning = isTaskCardRunning(t);
                        return (
                        <div key={t.id} onClick={() => navigate(t.clientLabel === 'GERAL / AVULSA' ? '/dashboard/minhas-tarefas' : (t.isActivity ? '/dashboard/atividades' : '/dashboard/tarefas'))} className="task-hover-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                {/* 💡 LABEL EMPRESA - PROJETO ou GERAL/AVULSA */}
                                <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', padding: '2px 6px', borderRadius: '6px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.clientLabel}>
                                    {t.clientLabel === 'GERAL / AVULSA' ? (
                                        <strong style={{color: '#1e293b', fontWeight: '800'}}>GERAL / AVULSA</strong>
                                    ) : (
                                        <>{t.clientLabel}</>
                                    )}
                                </span>
                                {renderTaskDeadline(t.computedDeadline)}
                            </div>
                            
                            <h4 style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.3' }}>{t.titulo}</h4>
                            
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{t.parentTitle}</span>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <button
                                        onClick={(e) => handleStartTaskFromHome(t, e)}
                                        title={isRunning ? 'Parar temporizador' : 'Iniciar temporizador'}
                                        style={{border: 'none', background: isRunning ? '#fee2e2' : '#eff6ff', color: isRunning ? '#ef4444' : '#2563eb', borderRadius: '999px', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                    >
                                        {isRunning ? <Icons.Stop size={10} /> : <Icons.Play size={10} />}
                                    </button>
                                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}><Icons.ChevronRight size={14} /></span>
                                </div>
                            </div>
                        </div>
                    )})}
                    </div>
                )}
            </div>

            {/* 🔍 ATIVIDADES EM ANÁLISE */}
            <div className="card boom-reveal" style={{ '--d': '380ms', padding: '20px', background: 'white', borderRadius: '16px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Activity color="#ec4899" /> Em Análise / Revisão</h4>
                    {tarefasEmAnalise.length > 0 && <span style={{fontSize: '0.8rem', background: '#fce7f3', color: '#be123c', padding: '4px 10px', borderRadius: '999px', fontWeight: 'bold'}}>{tarefasEmAnalise.length}</span>}
                </div>
                {tarefasEmAnalise.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '12px'}}>Nenhuma tarefa em análise no momento. ✨</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {tarefasEmAnalise.map((t) => (
                        <div key={t.id} onClick={() => navigate(t.isActivity ? '/dashboard/atividades' : '/dashboard/tarefas')} style={{ background: 'white', border: '2px solid #fce7f3', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.65rem', color: '#be123c', textTransform: 'uppercase', background: '#fce7f3', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>{t.clientLabel}</span>
                                <span style={{ fontSize: '0.65rem', color: '#ec4899', background: '#fce7f3', padding: '2px 8px', borderRadius: '12px', fontWeight: '600', fontStyle: 'italic' }}>Em Análise</span>
                            </div>
                            <h4 style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.3' }}>{t.titulo}</h4>
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #fce7f3', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.parentTitle}</span>
                                <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}><Icons.ChevronRight size={14} /></span>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL GIGANTE DE HISTÓRICO MENSAL & EDIÇÃO */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <ModalPortal>
            <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}} onClick={(e) => { if(e.target === e.currentTarget) setShowHistoryModal(false); }}>
                <div style={{background: '#fff', width: '95%', maxWidth: '900px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', animation: 'fadeIn 0.2s ease-out'}}>
                    
                    <div style={{padding: '20px 30px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                            <div style={{background: '#eff6ff', color: '#2563eb', padding: '10px', borderRadius: '10px', display: 'flex'}}><Icons.Calendar size={24} /></div>
                            <div>
                                <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>Histórico de Assiduidade</h3>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                                    <button className="btn-small hover-shadow" onClick={() => { const d = new Date(historyDate); d.setMonth(d.getMonth() - 1); setHistoryDate(d); }}><Icons.ChevronLeft /></button>
                                    <span style={{fontWeight: 'bold', color: '#475569', minWidth: '120px', textAlign: 'center'}}>
                                        {nomesMeses[historyDate.getMonth()]} {historyDate.getFullYear()}
                                    </span>
                                    <button className="btn-small hover-shadow" onClick={() => { const d = new Date(historyDate); d.setMonth(d.getMonth() + 1); setHistoryDate(d); }}><Icons.ChevronRight /></button>
                                </div>
                            </div>
                        </div>

                        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                            <div style={{background: '#f8fafc', padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center'}}>
                                <div style={{fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold'}}>Total do Mês</div>
                                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb'}}>{totalHorasMes.h}h {totalHorasMes.m}m</div>
                            </div>
                            
                            <button className="btn-cta" onClick={() => { setIsAdding(true); setEditingRecord(null); }}>
                                <Icons.Plus /> Inserir Registo
                            </button>
                            
                            <button onClick={() => setShowHistoryModal(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8', marginLeft: '10px'}} className="hover-red-text"><Icons.Close size={20} /></button>
                        </div>
                    </div>

                    <div style={{padding: '20px 30px', overflowY: 'auto', background: '#f8fafc', flex: 1}} className="custom-scrollbar">
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                            <thead style={{background: '#f1f5f9'}}>
                                <tr style={{textAlign: 'left', color: '#475569'}}>
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
                                    <tr style={{background: '#eff6ff', borderBottom: '2px solid #bfdbfe'}}>
                                        <td colSpan="7" style={{padding: '20px'}}>
                                            <h4 style={{marginTop:0, color:'#1e40af', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Plus /> Adicionar Registo Manual</h4>
                                            <form onSubmit={handleSaveNew} style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                                                <div style={{flex: 1, minWidth: '130px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Data *</label>
                                                    <input type="date" value={addForm.data} onChange={e => setAddForm({...addForm, data: e.target.value})} style={inputEditStyle} className="input-focus" required />
                                                </div>
                                                <div style={{flex: 1, minWidth: '100px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Entrada *</label>
                                                    <input type="time" value={addForm.hora_entrada} onChange={e => setAddForm({...addForm, hora_entrada: e.target.value})} style={inputEditStyle} className="input-focus" required />
                                                </div>
                                                <div style={{flex: 1, minWidth: '100px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Saída *</label>
                                                    <input type="time" value={addForm.hora_saida} onChange={e => setAddForm({...addForm, hora_saida: e.target.value})} style={inputEditStyle} className="input-focus" required />
                                                </div>
                                                <div style={{flex: 1, minWidth: '100px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Pausa (Min)</label>
                                                    <input type="number" min="0" value={addForm.tempo_pausa} onChange={e => setAddForm({...addForm, tempo_pausa: e.target.value})} style={inputEditStyle} className="input-focus" />
                                                </div>
                                                
                                                <div style={{flex: 2, minWidth: '200px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Tarefas Realizadas / Resumo do Dia</label>
                                                    <textarea rows="5" value={addForm.observacoes} onChange={e => setAddForm({...addForm, observacoes: e.target.value})} style={{...inputEditStyle, resize:'vertical'}} className="input-focus" />
                                                </div>
                                                
                                                <div style={{flex: 2, minWidth: '200px'}}>
                                                    <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#ea580c'}}>Motivo (Obrigatório) *</label>
                                                    <input type="text" placeholder="Ex: Fui ao médico e não piquei..." value={addForm.motivo_alteracao} onChange={e => setAddForm({...addForm, motivo_alteracao: e.target.value})} style={{...inputEditStyle, borderColor: '#fdba74', background: '#fff7ed'}} className="input-focus-alert" required />
                                                </div>

                                                <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px'}}>
                                                    <button type="button" onClick={() => setIsAdding(false)} className="btn-small hover-shadow" style={{height: '38px', background: 'white', border: '1px solid #cbd5e1', color: '#64748b'}}>Cancelar</button>
                                                    <button type="submit" className="btn-primary hover-shadow" style={{padding: '0 20px', height: '38px', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Save /> Inserir Registo</button>
                                                </div>
                                            </form>
                                        </td>
                                    </tr>
                                )}

                                {fullHistory.length === 0 && !isAdding ? (
                                    <tr><td colSpan="7" style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                                        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '10px', opacity: 0.5}}><Icons.Calendar size={30} /></div>
                                        Nenhum registo neste mês.
                                    </td></tr>
                                ) : fullHistory.map(r => {
                                    const totalSegundos = calcularSegundosExatos(r.hora_entrada, r.hora_saida, r.tempo_pausa_acumulado);
                                    const isEditing = editingRecord === r.id;

                                    return (
                                        <React.Fragment key={r.id}>
                                            <tr style={{borderBottom: '1px solid #e2e8f0', background: isEditing ? '#eff6ff' : 'white'}} className={!isEditing ? "table-row-hover" : ""}>
                                                <td style={{padding: '12px 15px', fontWeight: 'bold', color: '#334155'}}>
                                                    {new Date(r.data_registo).toLocaleDateString('pt-PT')}
                                                </td>
                                                <td style={{padding: '12px 15px', color: '#2563eb'}}>{r.hora_entrada?.slice(0,5)}</td>
                                                <td style={{padding: '12px 15px', color: r.hora_saida ? '#ef4444' : '#94a3b8'}}>
                                                    {r.hora_saida?.slice(0,5) || '---'}
                                                </td>
                                                <td style={{padding: '12px 15px', color: '#eab308', fontWeight: '500'}}>
                                                    {r.tempo_pausa_acumulado ? `${Math.floor(r.tempo_pausa_acumulado / 60)} min` : '-'}
                                                </td>
                                                <td style={{padding: '12px 15px'}}>{formatarHoras(totalSegundos)}</td>
                                                
                                                <td style={{padding: '12px 15px'}}>
                                                    <div style={{maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b', fontSize: '0.8rem'}} title={r.observacoes || ''}>
                                                        {r.motivo_alteracao && <span style={{color: '#ea580c', fontWeight:'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px'}}><Icons.AlertTriangle size={12} /> Editado: {r.motivo_alteracao}</span>}
                                                        {r.observacoes ? String(r.observacoes).replace(/✅ TAREFAS REALIZADAS:\n/g, '').replace(/\n/g, ', ') : '-'}
                                                    </div>
                                                </td>

                                                <td style={{padding: '12px 15px', textAlign: 'right'}}>
                                                    <button onClick={() => handleStartEdit(r)} style={{background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px'}} className="hover-text-blue" title="Editar este registo">
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                </td>
                                            </tr>

                                            {isEditing && (
                                                <tr style={{background: '#eff6ff', borderBottom: '2px solid #bfdbfe'}}>
                                                    <td colSpan="7" style={{padding: '20px'}}>
                                                        <form onSubmit={(e) => handleSaveEdit(e, r.id)} style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                                                            <div style={{flex: 1, minWidth: '100px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Hora Entrada</label>
                                                                <input type="time" value={editForm.hora_entrada} onChange={e => setEditForm({...editForm, hora_entrada: e.target.value})} style={inputEditStyle} className="input-focus" required />
                                                            </div>
                                                            <div style={{flex: 1, minWidth: '100px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Hora Saída</label>
                                                                <input type="time" value={editForm.hora_saida} onChange={e => setEditForm({...editForm, hora_saida: e.target.value})} style={inputEditStyle} className="input-focus" />
                                                            </div>
                                                            <div style={{flex: 1, minWidth: '100px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Pausa (Minutos)</label>
                                                                <input type="number" min="0" value={editForm.tempo_pausa} onChange={e => setEditForm({...editForm, tempo_pausa: e.target.value})} style={inputEditStyle} className="input-focus" />
                                                            </div>
                                                            
                                                            <div style={{flex: 2, minWidth: '200px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#1e40af'}}>Tarefas Realizadas / Resumo do Dia</label>
                                                                <textarea rows="5" value={editForm.observacoes || ""} onChange={e => setEditForm({...editForm, observacoes: e.target.value})} placeholder="O que foi feito..." style={{...inputEditStyle, resize:'vertical'}} className="input-focus" />
                                                            </div>

                                                            <div style={{flex: 2, minWidth: '200px'}}>
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#ea580c'}}>Motivo da Correção *</label>
                                                                <input type="text" placeholder="Ex: Esqueci de picar saída" value={editForm.motivo_alteracao} onChange={e => setEditForm({...editForm, motivo_alteracao: e.target.value})} style={{...inputEditStyle, borderColor: '#fdba74', background: '#fff7ed'}} className="input-focus-alert" required />
                                                            </div>

                                                            <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px'}}>
                                                                <button type="button" onClick={() => setEditingRecord(null)} className="btn-small hover-shadow" style={{height: '38px', background: 'white', border: '1px solid #cbd5e1', color: '#64748b'}}>Cancelar</button>
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

      {/* --- POP-UP DE PARABÉNS 🎉 --- */}
      {showBirthdayPopup && (
        <ModalPortal>
            <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
                <div style={{background: 'linear-gradient(135deg, #ffffff, #fef3c7)', borderRadius: '24px', width: '90%', maxWidth: '400px', padding: '40px 20px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative', overflow: 'hidden', animation: 'fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'}}>
                    <div style={{display: 'flex', justifyContent: 'center', color: '#f59e0b', marginBottom: '15px', animation: 'bounce 2s infinite'}}><Icons.Gift /></div>
                    <h2 style={{margin: '0 0 10px 0', color: '#b45309', fontSize: '2rem'}}>Parabéns, {userFirstName}!</h2>
                    <p style={{color: '#92400e', marginBottom: '25px', fontSize: '1.1rem', lineHeight: '1.5'}}>
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
      {alertModal.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
                  <div style={{background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '400px', padding: '24px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#ef4444'}}><Icons.AlertTriangle size={48} /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b'}}>Atenção</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.5'}}>
                          {alertModal.message}
                      </p>
                      <button onClick={() => setAlertModal({ show: false, message: "" })} className="btn-primary hover-shadow" style={{width: '100%', padding: '12px'}}>Entendido</button>
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

            <StopTimerNoteModal
                open={stopNoteModal.show}
                title="Parar cronometro"
                message="Podes adicionar uma nota breve ao parar este registo (opcional)."
                placeholder="Ex: Encerrado após validação com equipa"
                showCompleteOption={Boolean(activeLog)}
                completeLabel={getStopCompleteLabel(activeLog)}
                onCancel={closeStopNoteModal}
                onConfirm={confirmStopWithNote}
            />

      <style>{`
                .dashboard-home {
                    background: linear-gradient(180deg, #f7efe2 0%, #f4ede2 100%);
                    border-radius: 20px;
                    padding: 14px;
                    font-family: "Manrope", "Sora", "Segoe UI", sans-serif;
                }

                .dashboard-home .card {
                    border: 1px solid #ebe7df;
                    box-shadow: 0 6px 18px rgba(17, 24, 39, 0.04);
                    backdrop-filter: blur(8px);
                }

                .dashboard-hero {
                    background: linear-gradient(120deg, rgba(255,255,255,0.95), rgba(255,255,255,0.82)) !important;
                    border: 1px solid #ebe7df !important;
                    box-shadow: 0 12px 28px rgba(17, 24, 39, 0.05) !important;
                    backdrop-filter: blur(12px);
                }

                .neo-stat {
                    background: linear-gradient(180deg, #ffffff 0%, #fcfbf8 100%);
                    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.04);
                }

                .online-showcase,
                .birthday-showcase {
                    position: relative;
                    overflow: hidden;
                }

                .boom-reveal {
                    opacity: 0;
                    transform: translateY(10px) scale(0.995);
                    animation: boomIn 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
                    animation-delay: var(--d, 0ms);
                    will-change: transform, opacity;
                }

                .online-showcase::before,
                .birthday-showcase::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    opacity: 0.95;
                }

                .online-showcase::before {
                    background: linear-gradient(90deg, #c2cde0, #b9cde7);
                }

                .birthday-showcase::before {
                    background: linear-gradient(90deg, #e2cfb5, #d7bfa0);
                }

        .menu-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 15px; text-align: left; background: none; border: none; cursor: pointer; font-size: 0.9rem; color: #334151; transition: background 0.2s; }
        .menu-item:hover { background: #f8fafc; color: #2563eb; }
        .menu-item.logout { color: #dc2626; }
        .menu-item.logout:hover { background: #fef2f2; color: #b91c1c; }
        
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -14px rgba(15,23,42,0.25); }
        .table-row-hover:hover { background-color: #f1f5f9 !important; }
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 8px 14px -10px rgba(15,23,42,0.28); }
        .hover-text-blue:hover { color: #2563eb !important; }
        .hover-red-text:hover { color: #ef4444 !important; }
        
        /* Estilos dos Cartões de Tarefa */
        .task-hover-card:hover { border-color: #ddd6c8 !important; box-shadow: 0 14px 24px -18px rgba(15,23,42,0.35); transform: translateY(-2px); transition: all 0.2s; }
        
        .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes boomIn { from { opacity: 0; transform: translateY(10px) scale(0.995); } to { opacity: 1; transform: translateY(0) scale(1); } }

                @media (prefers-reduced-motion: reduce) {
                    .boom-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
                }

        /* Responsividade Extrema */
        @media (max-width: 1200px) {
            .dashboard-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
            .stats-grid { grid-template-columns: 1fr !important; }
            .bottom-split-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* 👤 POPOVER EQUIPA ONLINE */}
      {selectedOnlineUser && (
        <div onClick={() => setSelectedOnlineUser(null)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div onClick={e => e.stopPropagation()} style={{background:'white', borderRadius:'20px', padding:'36px 32px', width:'360px', maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', position:'relative'}}>
            <button onClick={() => setSelectedOnlineUser(null)} style={{position:'absolute', top:'12px', right:'14px', background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8', lineHeight:1}}>✕</button>
            <div style={{width:'140px', height:'140px', borderRadius:'50%', overflow:'hidden', background:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'2.4rem', color:'white', flexShrink:0, border:'4px solid #dcfce7', boxShadow:'0 6px 20px rgba(59,130,246,0.25)'}}>
              {selectedOnlineUser.profiles?.avatar_url
                ? <img src={selectedOnlineUser.profiles.avatar_url} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block'}} />
                : getInitials(selectedOnlineUser.profiles?.nome)}
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontWeight:'700', fontSize:'1.1rem', color:'#1e293b'}}>{selectedOnlineUser.profiles?.nome || '—'}</div>
              {selectedOnlineUser.profiles?.funcao && <div style={{fontSize:'0.85rem', color:'#64748b', marginTop:'2px'}}>{selectedOnlineUser.profiles.funcao}</div>}
              {selectedOnlineUser.profiles?.empresa_interna && <div style={{fontSize:'0.78rem', color:'#94a3b8', marginTop:'2px'}}>{selectedOnlineUser.profiles.empresa_interna}</div>}
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'8px', width:'100%', marginTop:'4px'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'8px', background:'#eff6ff', borderRadius:'10px', padding:'8px 12px'}}>
                                <Icons.CircleDot size={10} color="#2563eb" />
                                <span style={{fontSize:'0.82rem', color:'#1d4ed8', fontWeight:'600'}}>Online agora · entrou às {selectedOnlineUser.hora_entrada?.slice(0,5)}</span>
              </div>
              {selectedOnlineUser.profiles?.telemovel && (
                <div style={{display:'flex', alignItems:'center', gap:'8px', background:'#f8fafc', borderRadius:'10px', padding:'8px 12px'}}>
                  <Icons.Phone size={15} color="#64748b" />
                  <span style={{fontSize:'0.82rem', color:'#334155'}}>{selectedOnlineUser.profiles.telemovel}</span>
                </div>
              )}
              {selectedOnlineUser.profiles?.email && (
                <div style={{display:'flex', alignItems:'center', gap:'8px', background:'#f8fafc', borderRadius:'10px', padding:'8px 12px'}}>
                  <Icons.Mail size={15} color="#64748b" />
                  <span style={{fontSize:'0.82rem', color:'#334155', wordBreak:'break-all'}}>{selectedOnlineUser.profiles.email}</span>
                </div>
              )}
              {selectedOnlineUser.profiles?.data_nascimento && (
                <div style={{display:'flex', alignItems:'center', gap:'8px', background:'#fff7ed', borderRadius:'10px', padding:'8px 12px'}}>
                  <Icons.Cake size={15} color="#c2410c" />
                  <span style={{fontSize:'0.82rem', color:'#9a3412'}}>{new Date(selectedOnlineUser.profiles.data_nascimento + 'T00:00:00').toLocaleDateString('pt-PT', {day:'numeric', month:'long'})}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}