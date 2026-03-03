import { Link, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext"; 
import WidgetAssiduidade from "../components/WidgetAssiduidade";
import WidgetCalendar from "../components/WidgetCalendar"; 
import { frasesMotivacionais } from "../data/frases"; 
import "./../styles/dashboard.css";

// --- ÍCONES SVG PROFISSIONAIS ---
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
  ArrowRight: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function DashboardHome() {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  
  // Estados de Dados
  const [tarefasHoje, setTarefasHoje] = useState([]);
  const [tarefasGerais, setTarefasGerais] = useState([]);
  const [stats, setStats] = useState({ projetos: 0, clientes: 0, atividades: 0, forum: 0, tarefas: 0 });
  const [userProfile, setUserProfile] = useState(null);
  const [usersOnline, setUsersOnline] = useState([]);
  const [registosMes, setRegistosMes] = useState([]); 
  const [aniversarios, setAniversarios] = useState([]);

  // 💡 ESTADO: O Cronómetro Ativo Global
  const [activeLog, setActiveLog] = useState(null);

  // Estados Visuais
  const [showMenu, setShowMenu] = useState(false);
  const [frase, setFrase] = useState("");
  const [horaAtual, setHoraAtual] = useState("");
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false); 

  // --- ESTADOS DO MODAL DE HISTÓRICO ---
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date()); 
  const [fullHistory, setFullHistory] = useState([]);
  const [totalHorasMes, setTotalHorasMes] = useState({ h: 0, m: 0 });
  
  // Edição e Adição
  const [editingRecord, setEditingRecord] = useState(null); 
  const [editForm, setEditForm] = useState({}); 
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ data: "", hora_entrada: "", hora_saida: "", tempo_pausa: 0, observacoes: "", motivo_alteracao: "" });

  const [alertModal, setAlertModal] = useState({ show: false, message: "" });

  useEffect(() => {
    if (user) {
      fetchTarefasPessoais();
      fetchStats();
      fetchUserProfile();
      loadUsersOnline();
      fetchRegistosMes();
      fetchAniversarios(); 
      checkActiveLog(); // 💡 Verifica timer ativo de forma segura
      
      const hoje = new Date();
      const seed = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
      const indice = seed % frasesMotivacionais.length;
      setFrase(frasesMotivacionais[indice]);

      const relogioInterval = setInterval(() => {
        const agora = new Date();
        setHoraAtual(agora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit'}));
      }, 1000);

      const onlineInterval = setInterval(loadUsersOnline, 60000);

      return () => {
          clearInterval(relogioInterval);
          clearInterval(onlineInterval);
      };
    }
  }, [user]);

  useEffect(() => {
      if (showHistoryModal && user) loadFullHistory();
  }, [historyDate, showHistoryModal, user]);

  async function fetchUserProfile() {
    try {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setUserProfile(data);
    } catch (error) { console.error("Erro perfil:", error); }
  }

  // 💡 PROCURA TIMER ATIVO E DESCOBRE A ÁRVORE/HIERARQUIA (Anti-Erros 400)
  async function checkActiveLog() {
      try {
          // Primeiro, vai buscar só o log base
          const { data, error } = await supabase
              .from("task_logs")
              .select("*") 
              .eq("user_id", user.id)
              .is("end_time", null)
              .maybeSingle();
          
          if (error) throw error;
          
          if (data) {
              let title = "Tempo a decorrer...";
              let foundProjectId = data.projeto_id;
              
              // O detetive entra em ação: Sobe a hierarquia para descobrir o nome e o Projeto Pai
              if (data.subtarefa_id) {
                  const { data: res } = await supabase.from("subtarefas").select("titulo, tarefa_id").eq("id", data.subtarefa_id).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      if (!foundProjectId && res.tarefa_id) {
                          const { data: tar } = await supabase.from("tarefas").select("atividade_id").eq("id", res.tarefa_id).maybeSingle();
                          if (tar?.atividade_id) {
                              const { data: ativ } = await supabase.from("atividades").select("projeto_id").eq("id", tar.atividade_id).maybeSingle();
                              if (ativ?.projeto_id) foundProjectId = ativ.projeto_id;
                          }
                      }
                  }
              } else if (data.tarefa_id) {
                  const { data: res } = await supabase.from("tarefas").select("titulo, atividade_id").eq("id", data.tarefa_id).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      if (!foundProjectId && res.atividade_id) {
                          const { data: ativ } = await supabase.from("atividades").select("projeto_id").eq("id", res.atividade_id).maybeSingle();
                          if (ativ?.projeto_id) foundProjectId = ativ.projeto_id;
                      }
                  }
              } else if (data.atividade_id) {
                  const { data: res } = await supabase.from("atividades").select("titulo, projeto_id").eq("id", data.atividade_id).maybeSingle();
                  if (res) {
                      title = res.titulo;
                      if (!foundProjectId && res.projeto_id) foundProjectId = res.projeto_id;
                  }
              } else if (data.projeto_id) {
                  const { data: res } = await supabase.from("projetos").select("titulo").eq("id", data.projeto_id).maybeSingle();
                  if (res) title = res.titulo;
              }
              
              // Guarda tudo bonitinho
              setActiveLog({ ...data, taskTitle: title, resolvedProjectId: foundProjectId });
          } else {
              setActiveLog(null);
          }
      } catch (err) {
          console.error("Erro a procurar timer ativo:", err);
      }
  }

  // 💡 NAVEGAR DIRETAMENTE PARA A PÁGINA DO PROJETO CORRETO
  function navigateToActiveTask() {
      if (!activeLog) return;
      
      if (activeLog.resolvedProjectId) {
          navigate(`/dashboard/projetos/${activeLog.resolvedProjectId}`);
      } else {
          // Fallbacks de segurança
          if (activeLog.subtarefa_id || activeLog.tarefa_id) navigate("/dashboard/tarefas");
          else if (activeLog.atividade_id) navigate("/dashboard/atividades");
          else navigate("/dashboard/projetos");
      }
  }

  // Helper para mostrar o nome da cena a correr
  const getActiveTaskName = () => {
      if (!activeLog) return "";
      return activeLog.taskTitle || "Tempo a decorrer...";
  };

  // 💡 PARAR TIMER ATIVO GLOBALMENTE
  async function handleStopGlobalLog(e) {
      if(e) e.stopPropagation();
      if (!activeLog) return;
      
      const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000)); 
      await supabase.from("task_logs").update({ end_time: new Date().toISOString(), duration_minutes: diffMins }).eq("id", activeLog.id);
      
      setActiveLog(null);
  }

  async function fetchAniversarios() {
      const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, avatar_url, data_nascimento')
          .not('data_nascimento', 'is', null);

      if (data && !error) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0); 
          let myBirthdayIsToday = false;

          const lista = data.map(p => {
              const nasc = new Date(p.data_nascimento);
              let proximoAniversario = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
              
              if (proximoAniversario < hoje) {
                  proximoAniversario.setFullYear(hoje.getFullYear() + 1);
              }
              
              if (p.id === user.id && nasc.getMonth() === hoje.getMonth() && nasc.getDate() === hoje.getDate()) {
                  myBirthdayIsToday = true;
              }

              return { ...p, proximoAniversario };
          });

          lista.sort((a, b) => a.proximoAniversario - b.proximoAniversario);
          setAniversarios(lista.slice(0, 5)); 

          if (myBirthdayIsToday && !sessionStorage.getItem('birthdayPopupSeen')) {
              setShowBirthdayPopup(true);
              sessionStorage.setItem('birthdayPopupSeen', 'true');
          }
      }
  }

  async function loadUsersOnline() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from("assiduidade").select("*, profiles(nome, avatar_url)").eq("data_registo", hoje).is("hora_saida", null); 
    if (!error && data) setUsersOnline(data);
  }

  async function fetchRegistosMes() {
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      const { data, error } = await supabase.from("assiduidade").select("*").eq("user_id", user.id).gte("data_registo", primeiroDia).order("data_registo", { ascending: false }).limit(5);
      if (!error && data) setRegistosMes(data);
  }

  async function fetchTarefasPessoais() {
      const { data } = await supabase
          .from("tarefas")
          .select(`*, atividades ( titulo, projetos ( titulo, codigo_projeto ) )`)
          .eq("responsavel_id", user.id)
          .neq("estado", "concluido")
          .neq("estado", "cancelado");

      const pendingTasks = data || [];
      
      const hoje = new Date();
      hoje.setHours(0,0,0,0);

      const urgentesHoje = [];
      const outras = [];

      pendingTasks.forEach(t => {
          if (!t.data_limite) {
              outras.push(t); 
          } else {
              const d = new Date(t.data_limite);
              d.setHours(0,0,0,0);
              if (d <= hoje) urgentesHoje.push(t);
              else outras.push(t);
          }
      });

      const sortFn = (a, b) => {
          if (!a.data_limite) return 1;
          if (!b.data_limite) return -1;
          return new Date(a.data_limite) - new Date(b.data_limite);
      };

      urgentesHoje.sort(sortFn);
      outras.sort(sortFn);

      setTarefasHoje(urgentesHoje);
      setTarefasGerais(outras);
  }

  async function fetchStats() {
    const { count: countProjetos } = await supabase.from("projetos").select("*", { count: 'exact', head: true }).neq("estado", "cancelado").neq("estado", "concluido");
    const { count: countClientes } = await supabase.from("clientes").select("*", { count: 'exact', head: true });
    const { count: countAtividades } = await supabase.from("atividades").select("*", { count: 'exact', head: true }).neq("estado", "cancelado").neq("estado", "concluido");
    const { count: countForum } = await supabase.from("forum_posts").select("*", { count: 'exact', head: true });
    
    const { count: countTarefas } = await supabase.from("tarefas").select("*", { count: 'exact', head: true })
        .eq("responsavel_id", user.id).neq("estado", "cancelado").neq("estado", "concluido");

    setStats({ projetos: countProjetos || 0, clientes: countClientes || 0, atividades: countAtividades || 0, forum: countForum || 0, tarefas: countTarefas || 0 });
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
          hora_entrada: record.hora_entrada?.slice(0,5) || "",
          hora_saida: record.hora_saida?.slice(0,5) || "",
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
          fetchRegistosMes(); 
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
          fetchRegistosMes();
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
      if (segundos === 0) return <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Em curso</span>;
      const horas = Math.floor(segundos / 3600);
      const minutos = Math.floor((segundos % 3600) / 60);
      return <span style={{fontWeight: 'bold', color: '#2563eb'}}>{horas}h{minutos.toString().padStart(2, '0')}</span>;
  };

  const renderTaskDeadline = (dataLimite) => {
      if (!dataLimite) return <span style={{fontSize: '0.65rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px'}}>Sem Prazo</span>;
      const d = new Date(dataLimite); d.setHours(0,0,0,0);
      const t = new Date(); t.setHours(0,0,0,0);
      const diffDays = Math.round((d - t) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return <span style={{background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.AlertTriangle size={10} /> Atrasada</span>;
      if (diffDays === 0) return <span style={{background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Flame size={10} /> Hoje</span>;
      return <span style={{background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Calendar size={10} /> {d.toLocaleDateString('pt-PT').slice(0,5)}</span>;
  };

  const getInitials = (name) => {
      if (!name) return "?";
      const parts = name.split(" ");
      if (parts.length > 1) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
  };

  const inputEditStyle = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' };

  return (
    <div className="dashboard-home">
      
      {/* HEADER E MENU UTILIZADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '15px' }}>
        <div>
           <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
               <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Olá, {userProfile?.nome?.split(' ')[0] || 'Colaborador'} 👋</h1>
               <span style={{background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                   <Icons.Clock /> {horaAtual}
               </span>
           </div>
           <p style={{ margin: '5px 0 0 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.95rem' }}>"{frase}"</p>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            
            {/* 💡 AVISO GLOBAL DE TEMPO A CORRER (GIGANTE E CLICÁVEL) */}
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
                        {getActiveTaskName().length > 25 ? getActiveTaskName().slice(0, 25) + '...' : getActiveTaskName()}
                    </div>
                    <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)'}}></div>
                    <button 
                        onClick={handleStopGlobalLog} 
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
                         <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#334151'}}>{userProfile?.nome}</span>
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
                  <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', minWidth: '220px', zIndex: 50, overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{padding: '12px 15px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc'}}><span style={{fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px'}}>A Minha Conta</span></div>
                    <button className="menu-item" onClick={() => navigate("/dashboard/perfil")}><Icons.User /> O Meu Perfil</button>
                    <button className="menu-item" onClick={() => navigate("/dashboard/ferias")}><Icons.Sun /> Férias & Ausências</button>
                    <button className="menu-item logout" onClick={handleLogout} style={{borderTop: '1px solid #f1f5f9'}}><Icons.LogOut /> Terminar Sessão</button>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* --- CARTÕES DE RESUMO INTERATIVOS --- */}
      <div className="dashboard-cards" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="card stat-card" onClick={() => navigate("/dashboard/projetos")} style={{borderLeft: '4px solid #2563eb', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div><h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Projetos Ativos</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.projetos}</p></div>
              <span style={{background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px', display: 'flex'}}><Icons.Rocket /></span>
          </div>
        </div>

        <div className="card stat-card" onClick={() => navigate("/dashboard/atividades")} style={{borderLeft: '4px solid #8b5cf6', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div><h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Atividades Ativas</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.atividades}</p></div>
              <span style={{background: '#f3e8ff', color: '#8b5cf6', padding: '8px', borderRadius: '10px', display: 'flex'}}><Icons.Clipboard /></span>
          </div>
        </div>

        <div className="card stat-card" onClick={() => navigate("/dashboard/tarefas")} style={{borderLeft: '4px solid #0ea5e9', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div><h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Minhas Tarefas</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.tarefas}</p></div>
              <span style={{background: '#e0f2fe', color: '#0ea5e9', padding: '8px', borderRadius: '10px', display: 'flex'}}><Icons.Check /></span>
          </div>
        </div>

        <div className="card stat-card" onClick={() => navigate("/dashboard/clientes")} style={{borderLeft: '4px solid #10b981', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div><h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Total Clientes</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.clientes}</p></div>
              <span style={{background: '#dcfce7', color: '#10b981', padding: '8px', borderRadius: '10px', display: 'flex'}}><Icons.Users /></span>
          </div>
        </div>

        <div className="card stat-card" onClick={() => navigate("/dashboard/forum")} style={{borderLeft: '4px solid #f59e0b', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div><h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Comunicação</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.forum}</p></div>
              <span style={{background: '#fef3c7', color: '#d97706', padding: '8px', borderRadius: '10px', display: 'flex'}}><Icons.Message /></span>
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* COLUNA ESQUERDA: Assiduidade & Histórico & Aniversários */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <WidgetAssiduidade />
            
            <div className="card" style={{padding: '20px', background: 'white', borderRadius: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Calendar size={18} color="#2563eb" /> Últimos Registos (Mês)</h4>
                    <button className="btn-small hover-shadow" style={{background: '#eff6ff', color: '#2563eb', fontWeight: 'bold'}} onClick={() => setShowHistoryModal(true)}>Ver Mais</button>
                </div>

                {registosMes.length > 0 ? (
                    <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
                            <thead>
                                <tr style={{borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b'}}>
                                    <th style={{paddingBottom: '8px'}}>Data</th>
                                    <th style={{paddingBottom: '8px'}}>Entrada</th>
                                    <th style={{paddingBottom: '8px'}}>Saída</th>
                                    <th style={{paddingBottom: '8px'}}>Total</th>
                                    <th style={{paddingBottom: '8px', maxWidth: '100px'}}>Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registosMes.map(r => {
                                    const totalSegundos = calcularSegundosExatos(r.hora_entrada, r.hora_saida, r.tempo_pausa_acumulado);
                                    return (
                                    <tr key={r.id} style={{borderBottom: '1px solid #f8fafc', transition: 'background 0.2s'}} className="table-row-hover">
                                        <td style={{padding: '8px 0', fontWeight: '500', color: '#334155'}}>{new Date(r.data_registo).toLocaleDateString('pt-PT').slice(0,5)}</td>
                                        <td style={{padding: '8px 0', color: '#10b981'}}>{r.hora_entrada?.slice(0,5)}</td>
                                        <td style={{padding: '8px 0', color: r.hora_saida ? '#ef4444' : '#94a3b8'}}>{r.hora_saida?.slice(0,5) || '---'}</td>
                                        <td style={{padding: '8px 0'}}>{formatarHoras(totalSegundos)}</td>
                                        <td style={{
                                            padding: '8px 0', color: '#64748b', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: r.observacoes ? 'help' : 'default'
                                        }} title={r.observacoes || ''}>
                                            {r.observacoes || '-'}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '10px 0'}}>Nenhum registo efetuado.</div>
                )}
            </div>

            <div className="card" style={{padding: '20px', background: 'white', borderRadius: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Activity size={18} color="#16a34a" /> Equipa Online</h4>
                    <span style={{background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold'}}>{usersOnline.length}</span>
                </div>
                
                {usersOnline.length > 0 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '150px', overflowY: 'auto'}} className="custom-scrollbar">
                    {usersOnline.map(u => (
                        <div key={u.id} style={{display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid #f8fafc'}}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.7rem', overflow: 'hidden' }}>
                                {u.profiles?.avatar_url ? <img src={u.profiles.avatar_url} alt="U" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : getInitials(u.profiles?.nome)}
                            </div>
                            <div style={{lineHeight: '1.2'}}>
                                <div style={{fontWeight: '600', color: '#334155', fontSize: '0.85rem'}}>{u.profiles?.nome?.split(' ')[0]}</div>
                                <div style={{fontSize: '0.7rem', color: '#94a3b8'}}>Entrou às {u.hora_entrada?.slice(0,5)}</div>
                            </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div style={{textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Ninguém online.</div>
                )}
            </div>

            <div className="card" style={{padding: '20px', background: 'white', borderRadius: '16px'}}>
                <h4 style={{margin: '0 0 15px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Heart size={18} color="#f59e0b" fill="#f59e0b" /> Próximos Aniversários</h4>
                {aniversarios.length > 0 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {aniversarios.map(a => {
                        const isHoje = a.proximoAniversario.getDate() === new Date().getDate() && a.proximoAniversario.getMonth() === new Date().getMonth();
                        return (
                        <div key={a.id} style={{display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid #f8fafc'}}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', overflow: 'hidden' }}>
                                {a.avatar_url ? <img src={a.avatar_url} alt="U" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : getInitials(a.nome)}
                            </div>
                            <div style={{lineHeight: '1.2'}}>
                                <div style={{fontWeight: '600', color: '#334155', fontSize: '0.85rem'}}>{a.nome.split(' ')[0]}</div>
                                <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>
                                    {a.proximoAniversario.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' })}
                                    {isHoje && <span style={{color: '#ea580c', fontWeight: 'bold', marginLeft: '5px'}}>É HOJE! 🎉</span>}
                                </div>
                            </div>
                        </div>
                    )})}
                    </div>
                ) : (
                    <div style={{textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Nenhum aniversário registado.</div>
                )}
            </div>

        </div>

        {/* COLUNA DIREITA: TAREFAS EM GRELHA E CALENDÁRIO */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            
            {/* 🔥 TAREFAS URGENTES / PARA HOJE */}
            <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px' }}>
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
                    {tarefasHoje.slice(0, 6).map((t) => (
                        <div key={t.id} onClick={() => navigate('/dashboard/tarefas')} className="task-hover-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', background: '#f8fafc', padding: '2px 6px', borderRadius: '6px' }} title={t.atividades?.projetos?.titulo}>
                                    {t.atividades?.projetos?.codigo_projeto || (t.atividades?.projetos?.titulo ? t.atividades.projetos.titulo.slice(0,12) + '...' : 'Geral')}
                                </span>
                                {renderTaskDeadline(t.data_limite)}
                            </div>
                            
                            <h4 style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.3' }}>{t.titulo}</h4>
                            
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.atividades?.titulo || 'Sem Atividade'}</span>
                                <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}><Icons.ChevronRight size={16} /></span>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>

            {/* 📋 OUTRAS TAREFAS (FUTURO) */}
            <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '16px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Clipboard color="#2563eb" /> Próximas Tarefas</h4>
                    {tarefasGerais.length > 6 && (
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
                    {tarefasGerais.slice(0, 6).map((t) => (
                        <div key={t.id} onClick={() => navigate('/dashboard/tarefas')} className="task-hover-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', background: '#f8fafc', padding: '2px 6px', borderRadius: '6px' }} title={t.atividades?.projetos?.titulo}>
                                    {t.atividades?.projetos?.codigo_projeto || (t.atividades?.projetos?.titulo ? t.atividades.projetos.titulo.slice(0,12) + '...' : 'Geral')}
                                </span>
                                {renderTaskDeadline(t.data_limite)}
                            </div>
                            
                            <h4 style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.3' }}>{t.titulo}</h4>
                            
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.atividades?.titulo || 'Sem Atividade'}</span>
                                <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}><Icons.ChevronRight size={16} /></span>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>

            <WidgetCalendar />
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
                            
                            <button className="btn-primary hover-shadow" style={{display: 'flex', alignItems: 'center', gap: '8px'}} onClick={() => { setIsAdding(true); setEditingRecord(null); }}>
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
                                    <th style={{padding: '12px 15px'}}>Motivo / Notas</th>
                                    <th style={{padding: '12px 15px', textAlign: 'center'}}>Ações</th>
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
                                                <td style={{padding: '12px 15px', color: '#10b981'}}>{r.hora_entrada?.slice(0,5)}</td>
                                                <td style={{padding: '12px 15px', color: r.hora_saida ? '#ef4444' : '#94a3b8'}}>
                                                    {r.hora_saida?.slice(0,5) || '---'}
                                                </td>
                                                <td style={{padding: '12px 15px', color: '#eab308', fontWeight: '500'}}>
                                                    {r.tempo_pausa_acumulado ? `${Math.floor(r.tempo_pausa_acumulado / 60)} min` : '-'}
                                                </td>
                                                <td style={{padding: '12px 15px'}}>{formatarHoras(totalSegundos)}</td>
                                                
                                                <td style={{padding: '12px 15px'}}>
                                                    <div style={{maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b', fontSize: '0.8rem'}} title={`Notas: ${r.observacoes || '-'}\nMotivo: ${r.motivo_alteracao || '-'}`}>
                                                        {r.motivo_alteracao ? <span style={{color: '#ea580c', fontWeight:'bold', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.AlertTriangle size={12} /> {r.motivo_alteracao}</span> : r.observacoes || '-'}
                                                    </div>
                                                </td>

                                                <td style={{padding: '12px 15px', textAlign: 'center'}}>
                                                    <button className="btn-small hover-shadow" onClick={() => handleStartEdit(r)} style={{background: isEditing ? '#2563eb' : 'white', border: isEditing ? 'none' : '1px solid #cbd5e1', color: isEditing ? 'white' : '#475569', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto'}}>
                                                        {isEditing ? 'Cancelar' : <><Icons.Edit /> Editar</>}
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
                                                                <label style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#ea580c'}}>Motivo da Correção *</label>
                                                                <input type="text" placeholder="Ex: Esqueci de picar saída" value={editForm.motivo_alteracao} onChange={e => setEditForm({...editForm, motivo_alteracao: e.target.value})} style={{...inputEditStyle, borderColor: '#fdba74', background: '#fff7ed'}} className="input-focus-alert" required />
                                                            </div>

                                                            <div style={{display: 'flex', alignItems: 'flex-end'}}>
                                                                <button type="submit" className="btn-primary hover-shadow" style={{padding: '10px 20px', height: '40px', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Save /> Guardar</button>
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
                    <h2 style={{margin: '0 0 10px 0', color: '#b45309', fontSize: '2rem'}}>Parabéns, {userProfile?.nome?.split(' ')[0]}!</h2>
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

      <style>{`
        .menu-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 15px; text-align: left; background: none; border: none; cursor: pointer; font-size: 0.9rem; color: #334151; transition: background 0.2s; }
        .menu-item:hover { background: #f8fafc; color: #2563eb; }
        .menu-item.logout { color: #dc2626; }
        .menu-item.logout:hover { background: #fef2f2; color: #b91c1c; }
        
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .table-row-hover:hover { background-color: #f1f5f9 !important; }
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .hover-red-text:hover { color: #ef4444 !important; }
        
        /* Estilos dos Cartões de Tarefa */
        .task-hover-card:hover { border-color: #cbd5e1 !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transform: translateY(-2px); transition: all 0.2s; }
        
        .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}