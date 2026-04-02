

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { closeAllActiveTaskLogsForUser } from "../utils/taskTimerLifecycle";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Play: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Pause: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  Stop: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  Close: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Target: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  Check: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Folder: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Filter: ({ size = 14, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
  Calendar: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
};

// --- PORTAL ---
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const WidgetAssiduidade = React.memo(function WidgetAssiduidade({ onViewHistory }) {
  const { user } = useAuth();
  
  // Estados de Tempo e Ponto
  const [timer, setTimer] = useState(0); 
  const [status, setStatus] = useState("stopped"); 
  const [registroId, setRegistroId] = useState(null); 
  const [activeRecord, setActiveRecord] = useState(null); 
  const [loading, setLoading] = useState(false);

    // Estados de Tarefas do Dia
    const [selectedTasks, setSelectedTasks] = useState([]); 
  
  // Estados de Tarefas do Dia (FIM DO DIA)
  const [endOfDayTasks, setEndOfDayTasks] = useState([]); 
  const [selectedEndOfDayTasks, setSelectedEndOfDayTasks] = useState([]); 
  const [dailySummary, setDailySummary] = useState(""); 
  
  // Modais
  const [showStartModal, setShowStartModal] = useState(false); 
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [showRetomarModal, setShowRetomarModal] = useState(false);
  const [retomarPromise, setRetomarPromise] = useState(null);

  // Registos Recentes
  const [showRecords, setShowRecords] = useState(false);
  const [recentRecords, setRecentRecords] = useState([]);

  const calcSec = (entrada, saida, pausa) => {
    if (!entrada || !saida) return 0;
    const d = new Date(`1970-01-01T${saida}`) - new Date(`1970-01-01T${entrada}`);
    const diff = d < 0 ? d + 86400000 : d;
    return Math.max(0, diff / 1000 - (pausa || 0));
  };

  const fmtHrs = (s) => {
    if (!s) return '—';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h${String(m).padStart(2,'0')}`;
  };

    const getClientDisplayName = (client) => {
        if (!client) return "";
        return client.sigla?.trim() || client.marca?.trim() || "";
    };

    const formatProjectContext = (projectData) => {
        if (!projectData) return "Avulsa";
        const codigo = projectData.codigo_projeto ? `[${projectData.codigo_projeto}] ` : "";
        const titulo = projectData.titulo || "Sem projeto";
        const cliente = Array.isArray(projectData.clientes) ? projectData.clientes[0] : projectData.clientes;
        const brand = getClientDisplayName(cliente);
        return brand ? `${codigo}${titulo} · ${brand}` : `${codigo}${titulo}`;
    };

  const fetchRecentRecords = useCallback(async () => {
    if (!user?.id) return;
    const primeiroDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { data } = await supabase.from('assiduidade').select('*').eq('user_id', user.id).gte('data_registo', primeiroDia).order('data_registo', { ascending: false }).limit(5);
    if (data) setRecentRecords(data);
  }, [user?.id]); 

  // --- 1. VERIFICAR ESTADO E AUTO-ENCERRAMENTO ---
  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const hojeStr = new Date().toLocaleDateString('en-CA'); 

      const { data: ativo } = await supabase
        .from("assiduidade")
        .select("*")
        .eq("user_id", user.id)
        .is("hora_saida", null)
        .order('data_registo', { ascending: false })
        .limit(1)
        .maybeSingle(); 

      if (ativo) {
        if (ativo.data_registo < hojeStr) {
            let accumulated = ativo.tempo_pausa_acumulado || 0;
            if (ativo.ultima_pausa_inicio) {
                 const inicioPausa = new Date(`${ativo.data_registo}T${ativo.ultima_pausa_inicio}`).getTime();
                 const fimDia = new Date(`${ativo.data_registo}T23:59:59`).getTime();
                 accumulated += Math.floor((fimDia - inicioPausa) / 1000);
            }

            const notaAuto = "Não picou ponto para sair. Encerrado automaticamente.";
            const novaObservacao = ativo.observacoes ? ativo.observacoes + "\n" + notaAuto : notaAuto;

            await supabase.from("assiduidade").update({
              hora_saida: "23:59:59",
              ultima_pausa_inicio: null,
              tempo_pausa_acumulado: accumulated,
              observacoes: novaObservacao
            }).eq("id", ativo.id);

            setStatus("stopped");
            setTimer(0);
            setRegistroId(null);
            setActiveRecord(null);
            setSelectedTasks([]);
        } else {
            setRegistroId(ativo.id);
            setActiveRecord(ativo);
            
            if (ativo.tarefas_planeadas) {
                try { 
                    const parsed = JSON.parse(ativo.tarefas_planeadas); 
                    if (parsed.length > 0 && typeof parsed[0] === 'string') {
                        setSelectedTasks(parsed.map(t => ({ id: t, titulo: t, contexto: "Avulsa" })));
                    } else {
                        setSelectedTasks(parsed); 
                    }
                } catch(e){}
            } else {
                setSelectedTasks([]);
            }
            
            if (ativo.ultima_pausa_inicio) {
                setStatus("paused");
                const entrada = new Date(`${ativo.data_registo}T${ativo.hora_entrada}`).getTime();
                const inicioPausa = new Date(`${ativo.data_registo}T${ativo.ultima_pausa_inicio}`).getTime();
                const totalTrabalhado = Math.floor((inicioPausa - entrada) / 1000) - (ativo.tempo_pausa_acumulado || 0);
                setTimer(totalTrabalhado > 0 ? totalTrabalhado : 0);
            } else {
                setStatus("running");
                const entrada = new Date(`${ativo.data_registo}T${ativo.hora_entrada}`).getTime();
                const now = new Date().getTime();
                const diffSeconds = Math.floor((now - entrada) / 1000) - (ativo.tempo_pausa_acumulado || 0);
                setTimer(diffSeconds > 0 ? diffSeconds : 0);
            }
        }
      } else {
        setStatus("stopped");
        setTimer(0);
        setRegistroId(null);
        setActiveRecord(null);
        setSelectedTasks([]);
      }
    } catch (err) {
      console.error("Erro assiduidade:", err);
    }
  }, [user?.id]);

  useEffect(() => { 
      checkStatus();
      fetchRecentRecords();
            const handleAttendanceUpdated = () => {
                checkStatus();
                fetchRecentRecords();
            };

            window.addEventListener('focus', checkStatus);
            window.addEventListener('attendance-updated', handleAttendanceUpdated);

            return () => {
                window.removeEventListener('focus', checkStatus);
                window.removeEventListener('attendance-updated', handleAttendanceUpdated);
            };
  }, [checkStatus, fetchRecentRecords]); 

  useEffect(() => {
    let interval = null;
    if (status === "running" && activeRecord) {
      interval = setInterval(() => {
          const entrada = new Date(`${activeRecord.data_registo}T${activeRecord.hora_entrada}`).getTime();
          const now = Date.now();
          const diffSeconds = Math.floor((now - entrada) / 1000) - (activeRecord.tempo_pausa_acumulado || 0);
          setTimer(diffSeconds > 0 ? diffSeconds : 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, activeRecord]);

  // --- 2. INICIAR DIA DE TRABALHO ---
  async function openStartModal() {
    if (loading) return;
    setLoading(true);
    try {
      const now = new Date();
      const horaAtual = now.toLocaleTimeString('pt-PT', { hour12: false });
      const dataAtual = now.toLocaleDateString('en-CA');

      // Verificar se já existe registro para o dia
      const { data: existente, error: searchError } = await supabase
        .from("assiduidade")
        .select("*")
        .eq("user_id", user.id)
        .eq("data_registo", dataAtual)
        .limit(2);
      if (searchError) throw searchError;

      if ((existente || []).length > 1) {
        alert("Erro: Existem múltiplos registos de assiduidade para hoje. Contacte o administrador.");
        setLoading(false);
        return;
      }

      const reg = (existente || [])[0];
      if (reg) {
        if (reg.hora_saida) {
          // Perguntar se quer retomar sessão antiga usando modal
          const retomar = await new Promise((resolve) => {
            setRetomarPromise(() => resolve);
            setShowRetomarModal(true);
          });
          if (retomar) {
            // Calcular pausa
            const [h1, m1, s1] = reg.hora_saida.split(":").map(Number);
            const [h2, m2, s2] = horaAtual.split(":").map(Number);
            const t1 = h1 * 3600 + m1 * 60 + (s1 || 0);
            const t2 = h2 * 3600 + m2 * 60 + (s2 || 0);
            let pausa = t2 - t1;
            if (pausa < 0) pausa += 24 * 3600; // caso passe da meia-noite
            const novoPausa = (reg.tempo_pausa_acumulado || 0) + pausa;
            // Mantém hora_entrada original, só atualiza pausa e limpa hora_saida
            const { data: updated, error: updateError } = await supabase
              .from("assiduidade")
              .update({
                hora_saida: null,
                tempo_pausa_acumulado: novoPausa
              })
              .eq("id", reg.id)
              .select()
              .single();
            if (updateError) throw updateError;
            setActiveRecord(updated);
            setRegistroId(updated.id);
            setStatus("running");
            setTimer(0);
            setSelectedTasks([]);
            setShowStartModal(false);
          } else {
            setLoading(false);
            return;
          }
        } else {
          alert("Já existe um registo de assiduidade aberto para hoje. Não é possível iniciar outro.");
          setLoading(false);
          return;
        }
      } else {
        // Não existe, criar novo
        const { data, error } = await supabase
          .from("assiduidade")
          .insert([{
            user_id: user.id,
            data_registo: dataAtual,
            hora_entrada: horaAtual,
            tempo_pausa_acumulado: 0,
            tarefas_planeadas: JSON.stringify([])
          }])
          .select().single();
        if (data && !error) {
          setActiveRecord(data);
          setRegistroId(data.id);
          setStatus("running");
          setTimer(0);
          setSelectedTasks([]);
          setShowStartModal(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  // Handler para resposta do modal de retomar sessão
  function handleRetomarResponse(confirm) {
    if (retomarPromise) retomarPromise(confirm);
    setShowRetomarModal(false);
    setRetomarPromise(null);
  }

  async function confirmStart(e) {
    e.preventDefault();
    setLoading(true);
    try {
        const now = new Date();
        const horaAtual = now.toLocaleTimeString('pt-PT', { hour12: false }); 
        const dataAtual = now.toLocaleDateString('en-CA');

        const tarefasJson = JSON.stringify(selectedTasks);

        const { data, error } = await supabase
            .from("assiduidade")
            .insert([{ 
                user_id: user.id, 
                data_registo: dataAtual, 
                hora_entrada: horaAtual, 
                tempo_pausa_acumulado: 0,
                tarefas_planeadas: tarefasJson 
            }])
            .select().single();

        if (data && !error) { 
            setActiveRecord(data);
            setRegistroId(data.id); 
            setStatus("running"); 
            setTimer(0);
            setShowStartModal(false);
        }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  // --- 3. AÇÕES A MEIO DO DIA ---
  async function handlePause() {
      if (!registroId || loading) return;
      setLoading(true);
      try {
        const closeResult = await closeAllActiveTaskLogsForUser(supabase, user?.id, {
          note: "Cronómetro encerrado automaticamente ao pausar a assiduidade."
        });

        window.dispatchEvent(new CustomEvent("task-logs-updated", {
          detail: {
            reason: "attendance-pause",
            closedCount: closeResult.closedCount || 0
          }
        }));
        window.dispatchEvent(new Event("attendance-updated"));

        const horaAtual = new Date().toLocaleTimeString('pt-PT', { hour12: false });
        const { data, error } = await supabase.from("assiduidade").update({ ultima_pausa_inicio: horaAtual }).eq("id", registroId).select().single();
        if (!error) {
            setActiveRecord(data);
            setStatus("paused");
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleResume() {
      if (!registroId || loading) return;
      setLoading(true);
      try {
        const { data: atual } = await supabase.from("assiduidade").select("*").eq("id", registroId).single();
        if (atual && atual.ultima_pausa_inicio) {
            const now = new Date();
            const inicioPausa = new Date(`${atual.data_registo}T${atual.ultima_pausa_inicio}`).getTime();
            const segundosPausa = Math.floor((now.getTime() - inicioPausa) / 1000);
            const novoAcumulado = (atual.tempo_pausa_acumulado || 0) + segundosPausa;

            const { data: updated, error } = await supabase.from("assiduidade")
                .update({ tempo_pausa_acumulado: novoAcumulado, ultima_pausa_inicio: null })
                .eq("id", registroId)
                .select().single();

            if (!error) {
                setActiveRecord(updated);
                setStatus("running");
            }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  // --- 4. TERMINAR O DIA E REVISAR TAREFAS ---
  async function handleFinishClick() { 
      setLoading(true);
      try {
          // Para sermos à prova de fusos horários:
          const startOfDay = new Date();
          startOfDay.setHours(0,0,0,0);
          const startOfDayISO = startOfDay.toISOString();
          
          // 2. O que ele trabalhou hoje usando os Timers
          const { data: logsHoje, error: logsError } = await supabase
              .from("task_logs")
              .select("*")
              .eq("user_id", user.id)
              .gte("start_time", startOfDayISO);

          let trabalhadas = [];
          
          if (logsHoje && !logsError) {
              for (const log of logsHoje) {
                  let title = null;
                  let ctx = "Avulsa";
                  
                  if (log.subtarefa_id) {
                      const { data } = await supabase.from("subtarefas").select("titulo, tarefas(atividades(projetos(codigo_projeto, titulo, clientes(marca, sigla))))").eq("id", log.subtarefa_id).maybeSingle();
                      if (data) {
                          title = data.titulo;
                          const ativ = Array.isArray(data.tarefas?.atividades) ? data.tarefas.atividades[0] : data.tarefas?.atividades;
                          const proj = Array.isArray(ativ?.projetos) ? ativ.projetos[0] : ativ?.projetos;
                          if (proj) ctx = formatProjectContext(proj);
                      }
                  } else if (log.task_id) { 
                      const { data } = await supabase.from("tarefas").select("titulo, atividades(projetos(codigo_projeto, titulo, clientes(marca, sigla)))").eq("id", log.task_id).maybeSingle();
                      if (data) {
                          title = data.titulo;
                          const ativ = Array.isArray(data.atividades) ? data.atividades[0] : data.atividades;
                          const proj = Array.isArray(ativ?.projetos) ? ativ.projetos[0] : ativ?.projetos;
                          if (proj) ctx = formatProjectContext(proj);
                      }
                  } else if (log.atividade_id) {
                      const { data } = await supabase.from("atividades").select("titulo, projetos(codigo_projeto, titulo, clientes(marca, sigla))").eq("id", log.atividade_id).maybeSingle();
                      if (data) {
                          title = data.titulo;
                          const proj = Array.isArray(data.projetos) ? data.projetos[0] : data.projetos;
                          if (proj) ctx = formatProjectContext(proj);
                      }
                  } else if (log.projeto_id) {
                      const { data } = await supabase.from("projetos").select("titulo, codigo_projeto, clientes(marca, sigla)").eq("id", log.projeto_id).maybeSingle();
                      if (data) {
                          title = data.titulo;
                          ctx = formatProjectContext(data);
                      }
                  }
                  
                  if (title && !trabalhadas.some(t => t.titulo === title)) {
                      trabalhadas.push({ id: title, titulo: title, contexto: ctx });
                  }
              }
          }

          // 3. Tarefas marcadas como concluídas hoje sem uso do timer
          // Usamos agora o novo campo 'data_conclusao'
          const { data: concluidasHoje, error: concluidasError } = await supabase
              .from("tarefas")
              .select("id, titulo, atividades(projetos(codigo_projeto, titulo, clientes(marca, sigla)))")
              .eq("responsavel_id", user.id)
              .eq("estado", "concluido")
              .gte("data_conclusao", startOfDayISO);
              
          if (concluidasHoje && !concluidasError) {
              concluidasHoje.forEach(t => {
                  let ctx = "Avulsa";
                  const ativ = Array.isArray(t.atividades) ? t.atividades[0] : t.atividades;
                  const proj = Array.isArray(ativ?.projetos) ? ativ.projetos[0] : ativ?.projetos;
                  
                  if (proj) ctx = formatProjectContext(proj);
                  
                  if (!trabalhadas.some(x => x.titulo === t.titulo)) {
                      trabalhadas.push({ id: t.id, titulo: t.titulo, contexto: ctx });
                  }
              });
          }

          setEndOfDayTasks(trabalhadas);
          setSelectedEndOfDayTasks(trabalhadas); 
          setDailySummary(""); 

          setShowClockOutModal(true);
      } catch(err) {
          console.error("Erro a calcular tarefas do dia:", err);
      } finally {
          setLoading(false);
      }
  }

  function toggleEndOfDayTask(taskObj) {
      if (selectedEndOfDayTasks.some(t => t.titulo === taskObj.titulo)) {
          setSelectedEndOfDayTasks(selectedEndOfDayTasks.filter(t => t.titulo !== taskObj.titulo));
      } else {
          setSelectedEndOfDayTasks([...selectedEndOfDayTasks, taskObj]);
      }
  }

  async function confirmFinish(e) {
      e.preventDefault();
      setLoading(true);
      try {
        let stoppedTimerTitle = "";
        const { data: runningLogs } = await supabase
          .from("task_logs")
          .select("*")
          .eq("user_id", user?.id)
          .is("end_time", null)
          .order("start_time", { ascending: false })
          .limit(1);

        const runningLog = Array.isArray(runningLogs) ? runningLogs[0] : null;
        if (runningLog) {
          const timerMeta = await resolveActiveTimerMeta(supabase, runningLog);
          stoppedTimerTitle = timerMeta?.title || "Tempo a decorrer...";
        }

        const closeResult = await closeAllActiveTaskLogsForUser(supabase, user?.id, {
          note: "Cronómetro encerrado automaticamente ao terminar a assiduidade."
        });

        window.dispatchEvent(new CustomEvent("task-logs-updated", {
          detail: {
            reason: "attendance-finish",
            closedCount: closeResult.closedCount || 0,
            stoppedTimerTitle: stoppedTimerTitle || ""
          }
        }));

        let finalObservacoes = "";
        
        if (selectedEndOfDayTasks.length > 0) {
            finalObservacoes += "✅ TAREFAS REALIZADAS:\n";
            finalObservacoes += selectedEndOfDayTasks.map(t => {
                if (t.contexto && t.contexto !== "Avulsa") return `- [${t.contexto}] ${t.titulo}`;
                return `- ${t.titulo}`;
            }).join("\n");
        }

        if (dailySummary.trim()) {
            if (finalObservacoes) finalObservacoes += "\n\n";
            finalObservacoes += "📝 NOTAS ADICIONAIS:\n" + dailySummary.trim();
        }

        let dadosFinais = { 
            hora_saida: new Date().toLocaleTimeString('pt-PT', { hour12: false }),
            observacoes: finalObservacoes, 
            ultima_pausa_inicio: null 
        };

        if (status === "paused") {
             const { data: atual } = await supabase.from("assiduidade").select("*").eq("id", registroId).single();
             if (atual && atual.ultima_pausa_inicio) {
                 const inicioPausa = new Date(`${atual.data_registo}T${atual.ultima_pausa_inicio}`).getTime();
                 const segundosPausa = Math.floor((new Date().getTime() - inicioPausa) / 1000);
                 dadosFinais.tempo_pausa_acumulado = (atual.tempo_pausa_acumulado || 0) + segundosPausa;
             }
        }
        
        const { error } = await supabase.from("assiduidade").update(dadosFinais).eq("id", registroId);
        if (!error) { 
            setStatus("stopped"); 
            setRegistroId(null); 
            setActiveRecord(null);
            setSelectedTasks([]);
            setEndOfDayTasks([]);
            setTimer(0); 
            setShowClockOutModal(false); 
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  const formatTime = (s) => {
    const h = Math.floor(s/3600).toString().padStart(2,"0");
    const m = Math.floor((s%3600)/60).toString().padStart(2,"0");
    const sc = (s%60).toString().padStart(2,"0");
    return `${h}:${m}:${sc}`;
  };

  // --- ESTILOS VISUAIS PREMIUM ---
  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' };
  const modalContainerStyle = { background: '#fff', borderRadius: '16px', width: '95%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' };
  const modalHeaderStyle = { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' };
  const inputLabelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputFieldStyle = { width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', background: '#fff', boxSizing: 'border-box', outline: 'none', color: '#1e293b', transition: 'border 0.2s' };

  return (
    <>
      {/* Modal de confirmação para retomar sessão antiga - Versão Premium */}
      {showRetomarModal && (
        <ModalPortal>
          <div style={{
            ...modalOverlayStyle, 
            backdropFilter: 'blur(8px)', // Efeito de vidro no fundo
            backgroundColor: 'rgba(15, 23, 42, 0.45)', // Overlay mais escuro e elegante
            alignItems: 'center', // Centralizado fica mais premium que no topo
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              ...modalContainerStyle,
              maxWidth: 420,
              borderRadius: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 0,
              background: '#ffffff',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Botão Fechar Minimalista */}
              <button 
                onClick={() => handleRetomarResponse(false)} 
                style={{
                  position:'absolute', top:20, right:20, background:'#f1f5f9', border:'none', 
                  cursor:'pointer', color:'#64748b', width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s',
                  zIndex: 10
                }} 
                className="hover-subtle-bg"
              >
                <Icons.Close size={18}/>
              </button>

              <div style={{padding: '48px 32px 32px 32px', textAlign: 'center'}}>
                {/* Ícone com Gradiente */}
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                  borderRadius: '20px', width: 64, height: 64, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  margin: '0 auto 24px auto',
                  boxShadow: '0 10px 15px -3px rgba(251, 191, 36, 0.2)'
                }}>
                  <Icons.Pause size={32} color="#b45309" />
                </div>

                <h2 style={{
                  margin: 0, fontSize: '1.5rem', fontWeight: 800, 
                  color: '#0f172a', letterSpacing: '-0.025em'
                }}>
                  Retomar Sessão?
                </h2>

                <p style={{
                  marginTop: 16, color: '#475569', fontSize: '1rem', 
                  lineHeight: 1.6, fontWeight: 400
                }}>
                  Identificamos um registo anterior hoje. <br/>
                  <span style={{color: '#1e293b', fontWeight: 600}}>Deseja continuar onde parou?</span>
                </p>
                
                <div style={{
                  marginTop: 12, padding: '10px 16px', background: '#f8fafc', 
                  borderRadius: '12px', fontSize: '0.88rem', color: '#64748b',
                  border: '1px dashed #e2e8f0'
                }}>
                  O intervalo será registado automaticamente como pausa.
                </div>
              </div>

              {/* Footer com botões de alta fidelidade */}
              <div style={{
                display: 'flex', gap: 12, padding: '24px 32px', 
                background: '#f8fafc', borderTop: '1px solid #f1f5f9'
              }}>
                <button 
                  type="button" 
                  onClick={() => handleRetomarResponse(false)} 
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: '14px', border: '1px solid #e2e8f0', 
                    background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.95rem', 
                    cursor: 'pointer', transition: '0.2s'
                  }}
                >
                  Agora não
                </button>
                
                <button 
                  type="button" 
                  onClick={() => handleRetomarResponse(true)} 
                  style={{
                    flex: 1.5, padding: '14px 0', borderRadius: '14px', border: 'none', 
                    background: '#0f172a', // Azul quase preto (muito premium)
                    color: '#fff', fontWeight: 600, fontSize: '0.95rem', 
                    cursor: 'pointer', transition: '0.3s', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.25)'
                  }}
                >
                  <Icons.Pause size={18} /> Confirmar Retoma
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', minHeight: '360px', padding: '32px 28px', background: '#ffffff' }}>

      {/* Toggle registos */}
      <button onClick={() => { setShowRecords(v => !v); if (!showRecords) fetchRecentRecords(); }} title="Últimos registos" style={{position:'absolute', top:'20px', right:'20px', background: showRecords ? 'var(--color-bgSecondary)' : '#f8fafc', border: showRecords ? '1px solid var(--color-btnPrimary)' : '1px solid #e2e8f0', borderRadius:'10px', padding:'8px 10px', cursor:'pointer', color: showRecords ? 'var(--color-btnPrimary)' : '#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', fontWeight: '600'}}>
        <Icons.Calendar size={18} />
      </button>

      {/* STATUS E TIMER COM PROGRESS RING */}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '28px'}}>
        
        {/* Status Label */}
        {status !== 'stopped' && (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
            <div style={{ fontSize: '0.75rem', color: status === 'paused' ? '#eab308' : 'var(--color-btnPrimary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {status === 'paused' ? '⏸ EM PAUSA' : '▶ A TRABALHAR'}
            </div>
            {activeRecord && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
                Início às {activeRecord.hora_entrada?.slice(0, 5)}
              </div>
            )}
          </div>
        )}

        {/* Progress Ring com Timer — círculo completo, timer centrado */}
        {(() => {
          const META_SECONDS = 8 * 3600;
          const progress = Math.min(timer / META_SECONDS, 1);
          const radius = 75;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference * (1 - progress);
          const color = status === 'paused' ? '#eab308' : (status === 'running' ? 'var(--color-btnPrimary)' : '#cbd5e1');
          const h = Math.floor(timer / 3600);
          const m = Math.floor((timer % 3600) / 60);
          const timeLabel = `${h}h ${String(m).padStart(2,'0')}m`;

          return (
            <div style={{position: 'relative', width: '180px', height: '180px', flexShrink: 0}}>
              <svg width="180" height="180" style={{position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)'}}>
                <circle cx="90" cy="90" r={radius} fill="none" stroke="#e8edf2" strokeWidth="8" />
                <circle
                  cx="90" cy="90" r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s'}}
                />
              </svg>
              {/* Texto centrado dentro do círculo */}
              <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px'}}>
                <div style={{fontSize: '1.8rem', fontWeight: '800', color: color, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
                  {timeLabel}
                </div>
                <div style={{fontSize: '0.78rem', color: '#94a3b8', fontWeight: '500'}}>
                  de 8.00 hrs
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {status === 'stopped' && (
            <button onClick={openStartModal} disabled={loading} className="btn-primary hover-shadow" style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1rem', fontWeight: '800', transition: '0.2s', background: 'var(--color-btnPrimary)', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            <Icons.Play size={18} /> {loading ? "A iniciar..." : "Iniciar Dia de Trabalho"}
            </button>
        )}
        {status === 'running' && (
            <div style={{display: 'flex', gap: '12px'}}>
                <button onClick={handlePause} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#fef3c7', color: '#a16207', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }} className="hover-shadow">
                    <Icons.Pause size={16} /> Pausar
                </button>
                <button onClick={handleFinishClick} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#991b1b', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }} className="hover-shadow">
                    <Icons.Stop size={16} /> Terminar
                </button>
            </div>
        )}
        {status === 'paused' && (
            <div style={{display: 'flex', gap: '12px'}}>
                <button onClick={handleResume} disabled={loading} style={{ flex: 2, padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#ef4444', color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }} className="hover-shadow">
                    <Icons.Play size={16} /> Retomar
                </button>
                <button onClick={handleFinishClick} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }} className="hover-shadow">
                    <Icons.Stop size={16} /> Terminar
                </button>
            </div>
        )}
      </div>

    {status === 'running' && <div style={{textAlign: 'center', fontSize:'0.85rem', color:'var(--color-btnPrimary)', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px', letterSpacing: '0.02em'}}><span className="pulse-dot"></span> Tempo a decorrer</div>}
      {status === 'paused' && <div style={{textAlign: 'center', fontSize:'0.85rem', color:'#eab308', fontWeight: '700', marginTop: '4px', letterSpacing: '0.02em'}}>⏸ Pausa em curso</div>}

      {/* Painel de Registos Recentes */}
      {showRecords && (
        <div style={{marginTop:'20px', borderTop:'1px solid #f1f5f9', paddingTop:'16px', textAlign:'left'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
            <span style={{fontSize:'0.78rem', fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em'}}>Últimos Registos</span>
            {onViewHistory && <button onClick={onViewHistory} style={{background:'none', border:'none', color:'var(--color-btnPrimary)', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer', padding:0}}>Ver histórico →</button>}
          </div>
          {recentRecords.length === 0 ? (
            <div style={{textAlign:'center', color:'#94a3b8', fontSize:'0.82rem', padding:'8px 0'}}>Sem registos este mês.</div>
          ) : (
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.8rem'}}>
              <thead>
                <tr style={{color:'#94a3b8', borderBottom:'1px solid #f1f5f9'}}>
                  <th style={{paddingBottom:'6px', fontWeight:'600', textAlign:'left'}}>Data</th>
                  <th style={{paddingBottom:'6px', fontWeight:'600', textAlign:'center'}}>Entrada</th>
                  <th style={{paddingBottom:'6px', fontWeight:'600', textAlign:'center'}}>Saída</th>
                  <th style={{paddingBottom:'6px', fontWeight:'600', textAlign:'right'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map(r => (
                  <tr key={r.id} style={{borderBottom:'1px solid #f8fafc'}}>
                    <td style={{padding:'7px 0', fontWeight:'600', color:'#334155'}}>{new Date(r.data_registo).toLocaleDateString('pt-PT').slice(0,5)}</td>
                    <td style={{padding:'7px 0', color:'var(--color-btnPrimary)', fontWeight:'500', textAlign:'center'}}>{r.hora_entrada?.slice(0,5)}</td>
                    <td style={{padding:'7px 0', color: r.hora_saida ? '#ef4444' : '#94a3b8', fontWeight:'500', textAlign:'center'}}>{r.hora_saida?.slice(0,5) || '—'}</td>
                    <td style={{padding:'7px 0', textAlign:'right', fontWeight:'700', color:'var(--color-btnPrimary)'}}>{fmtHrs(calcSec(r.hora_entrada, r.hora_saida, r.tempo_pausa_acumulado))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 💡 MODAL DA MANHÃ: PLANEAR O DIA COM FILTRO E ORDENAÇÃO */}
      {/* ============================================================== */}
      {showStartModal && (
          <ModalPortal>
              <div style={modalOverlayStyle}>
                  <div style={{...modalContainerStyle, maxWidth: '600px'}}>
                      <div style={modalHeaderStyle}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Target size={20} color="var(--color-btnPrimary)" /> Bom dia! Vamos focar?</h3>
                          <button onClick={() => setShowStartModal(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8'}} className="hover-red-text"><Icons.Close size={20}/></button>
                      </div>
                      
                      <form onSubmit={confirmStart} style={{display: 'flex', flexDirection: 'column', maxHeight: '80vh'}}>
                          <div style={{padding: '25px', background: '#fff', overflowY: 'auto', flex: 1}} className="custom-scrollbar">
                              <p style={{color: '#64748b', fontSize: '0.95rem', margin: '0 0 15px 0', lineHeight: '1.5'}}>
                                  Hoje o registo começa direto. As tarefas aparecem apenas no fecho do dia, com base no que foi realmente realizado.
                              </p>

                              <div style={{textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.9rem'}}>
                                  <Icons.Check size={30} color="#cbd5e1" />
                                  <p style={{marginTop: '10px', marginBottom: 0}}>
                                      Clica em Iniciar Dia para começar. No fim, vais rever apenas o trabalho realizado.
                                  </p>
                              </div>
                          </div>

                          <div style={{padding: '20px 25px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px'}}>
                              <button type="button" onClick={() => setShowStartModal(false)} style={{flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Agora Não</button>
                              <button type="submit" style={{flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: 'var(--color-btnPrimary)', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow">
                                  <Icons.Play size={18} /> Iniciar Dia
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL TERMINAR (COM REVISÃO DE TAREFAS INTELIGENTE) --- */}
      {showClockOutModal && (
          <ModalPortal>
              <div style={modalOverlayStyle}>
                  <div style={{...modalContainerStyle, maxWidth: '550px'}}>
                      <div style={modalHeaderStyle}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Stop size={20} color="#ef4444" /> Terminar Registo</h3>
                          <button onClick={() => setShowClockOutModal(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8'}} className="hover-red-text"><Icons.Close size={20}/></button>
                      </div>
                      
                      <form onSubmit={confirmFinish} style={{display: 'flex', flexDirection: 'column', maxHeight: '80vh'}}>
                          <div style={{padding: '25px', background: '#fff', overflowY: 'auto', flex: 1}} className="custom-scrollbar">
                              
                              {endOfDayTasks.length > 0 && (
                                  <div style={{marginBottom: '25px'}}>
                                      <label style={{display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                                          Tarefas Planeadas / Trabalhadas Hoje:
                                      </label>
                                      <p style={{color: '#94a3b8', fontSize: '0.85rem', marginTop: '-5px', marginBottom: '15px'}}>Desmarca o que não conseguiste terminar para não ir para o histórico.</p>
                                      
                                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                                          {endOfDayTasks.map((taskObj, idx) => {
                                              const isChecked = selectedEndOfDayTasks.some(t => t.titulo === taskObj.titulo);
                                              return (
                                                  <div 
                                                      key={idx} 
                                                      onClick={() => toggleEndOfDayTask(taskObj)}
                                                      style={{
                                                          display: 'flex', alignItems: 'flex-start', gap: '12px', color: isChecked ? '#1e293b' : '#94a3b8', 
                                                          cursor: 'pointer', transition: '0.2s', padding: '10px 12px', borderRadius: '8px',
                                                          background: isChecked ? 'white' : 'transparent',
                                                          border: isChecked ? '1px solid #e2e8f0' : '1px solid transparent'
                                                      }}
                                                      className="hover-shadow"
                                                  >
                                                      <div style={{width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${isChecked ? '#10b981' : '#cbd5e1'}`, background: isChecked ? '#10b981' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, marginTop: '2px'}}>
                                                          {isChecked && <Icons.Check size={12} />}
                                                      </div>
                                                      <div style={{flex: 1, textDecoration: isChecked ? 'none' : 'line-through'}}>
                                                          <div style={{fontSize: '0.95rem', fontWeight: isChecked ? '600' : '400'}}>{taskObj.titulo}</div>
                                                          <div style={{fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                              <Icons.Folder size={10} /> 
                                                              {taskObj.contexto?.length > 40 ? taskObj.contexto.slice(0, 40) + '...' : taskObj.contexto}
                                                          </div>
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}

                              <label style={inputLabelStyle}>Notas Adicionais (Opcional)</label>
                              <textarea rows="4" value={dailySummary} onChange={e => setDailySummary(e.target.value)} style={{...inputFieldStyle, background: '#f8fafc', resize: 'vertical'}} className="input-focus" placeholder="Deixa um resumo do que ficou pendente ou notas para amanhã..." autoFocus={endOfDayTasks.length === 0} />
                          </div>

                          <div style={{padding: '20px 25px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px'}}>
                              <button type="button" onClick={() => setShowClockOutModal(false)} style={{flex:1, padding:'14px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', fontWeight:'700', color: '#64748b', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" disabled={loading} style={{flex:2, padding:'14px', borderRadius:'10px', border:'none', background:'#dc2626', color:'white', fontWeight:'700', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow">
                                  <Icons.Stop size={16} /> {loading ? "A guardar..." : "Confirmar Saída"}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      <style>{`
        .pulse-dot { width: 10px; height: 10px; background-color: #16a34a; border-radius: 50%; display: inline-block; animation: pulse 2s infinite; box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); } 
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); } 50% { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); } }
        
        .btn-primary { background: var(--color-btnPrimary); color: white; border: none; cursor: pointer; }
        .btn-primary:hover:not(:disabled) { background: var(--color-btnPrimaryDark); transform: translateY(-2px); box-shadow: 0 8px 16px rgba(37, 99, 235, 0.25) !important; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .hover-shadow { box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
        .hover-shadow:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.12) !important; }
        .hover-shadow:active:not(:disabled) { transform: translateY(0); }
        
        .hover-blue-btn:hover { background-color: var(--color-bgSecondary) !important; color: var(--color-btnPrimary) !important; }
        .hover-red-btn:hover { background-color: #fef2f2 !important; color: #ef4444 !important; }
        .hover-red-text:hover { color: #ef4444 !important; }
        
        .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1); }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
    </>
  );
});

export default WidgetAssiduidade;

