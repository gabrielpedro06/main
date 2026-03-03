import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
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
  XCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

export default function MinhasTarefas() {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState({ atrasadas: [], hoje: [], amanha: [], depois: [], semData: [] });
  const [logs, setLogs] = useState([]);
  const [activeLog, setActiveLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  
  const [newTasks, setNewTasks] = useState({ atrasadas: '', hoje: '', amanha: '', depois: '', semData: '' });
  const [novaTarefaNome, setNovaTarefaNome] = useState("");

  const [editModal, setEditModal] = useState({ show: false, data: null });

  // DRAG & DROP STATE
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    if (user?.id) carregarTudo();
  }, [user, mostrarConcluidos]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  async function carregarTudo() {
      setLoading(true);
      await checkActiveLog();
      await fetchMyTasks();
  }

  async function checkActiveLog() {
      const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
      setActiveLog(data || null);
  }

  async function fetchMyTasks() {
      try {
          let query = supabase
              .from("tarefas")
              .select(`id, titulo, estado, data_limite, prioridade, descricao`)
              .eq("responsavel_id", user.id)
              .is("atividade_id", null)
              .order("created_at", { ascending: true }); 

          if (!mostrarConcluidos) {
              query = query.neq("estado", "concluido");
          }

          const { data: tData } = await query;
          const { data: logsData } = await supabase.from("task_logs").select("*").eq("user_id", user.id);
          setLogs(logsData || []);

          const today = new Date(); today.setHours(0,0,0,0);
          const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

          let agrupado = { atrasadas: [], hoje: [], amanha: [], depois: [], semData: [] };

          if (tData) {
              tData.forEach(task => {
                  if (!task.data_limite) {
                      agrupado.semData.push(task);
                  } else {
                      const d = new Date(task.data_limite); d.setHours(0,0,0,0);
                      if (d < today) agrupado.atrasadas.push(task);
                      else if (d.getTime() === today.getTime()) agrupado.hoje.push(task);
                      else if (d.getTime() === tomorrow.getTime()) agrupado.amanha.push(task);
                      else agrupado.depois.push(task);
                  }
              });
          }

          setTasks(agrupado);
      } catch (err) { console.error(err); }
      setLoading(false);
  }

  const getTaskTime = (taskId) => logs.filter(l => l.task_id === taskId).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  const formatTime = (mins) => {
      if (mins === 0) return "0m";
      const h = Math.floor(mins / 60); const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  async function handleToggleTimer(task) {
      if (activeLog && activeLog.task_id === task.id) {
          const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000));
          await supabase.from("task_logs").update({ end_time: new Date().toISOString(), duration_minutes: diffMins }).eq("id", activeLog.id);
          setActiveLog(null); showToast(`Tempo guardado: ${diffMins} min.`);
          carregarTudo();
      } else {
          if (activeLog) return showToast("Já tens um cronómetro ativo. Pára-o primeiro!", "error");
          const { data, error } = await supabase.from("task_logs").insert([{ user_id: user.id, task_id: task.id, start_time: new Date().toISOString() }]).select().single();
          if (!error) { setActiveLog(data); showToast("Cronómetro em curso!"); }
      }
  }

  async function handleCompleteTask(task) {
      const novoEstado = task.estado === 'concluido' ? 'pendente' : 'concluido';
      await supabase.from("tarefas").update({ estado: novoEstado }).eq("id", task.id);
      showToast(novoEstado === 'concluido' ? "Boa! Tarefa concluída." : "Tarefa reaberta.");
      fetchMyTasks();
  }

  async function handleDeleteTask(taskId) {
      if(!window.confirm("Apagar esta tarefa permanentemente?")) return;
      await supabase.from("tarefas").delete().eq("id", taskId);
      showToast("Tarefa apagada.");
      fetchMyTasks();
  }

  async function handleCreatePessoal(e) {
      e.preventDefault();
      if (!novaTarefaNome.trim()) return;
      try {
          const { error } = await supabase.from("tarefas").insert([{ 
              titulo: novaTarefaNome, 
              responsavel_id: user.id, 
              estado: 'pendente', 
              atividade_id: null,
              prioridade: 'normal'
          }]);
          if (error) throw error;
          setNovaTarefaNome(""); 
          showToast("Tarefa rápida adicionada!"); 
          fetchMyTasks();
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
              titulo: text.trim(), 
              responsavel_id: user.id, 
              estado: 'pendente', 
              atividade_id: null, 
              data_limite: date,
              prioridade: 'normal' 
          }]);
          
          if(error) throw error;
          setNewTasks({ ...newTasks, [colId]: "" }); 
          fetchMyTasks();
      } catch (err) { showToast("Erro ao criar: " + err.message, "error"); }
  }

  async function handleSaveModal(e) {
      e.preventDefault();
      const payload = { 
          titulo: editModal.data.titulo, data_limite: editModal.data.data_limite || null, 
          descricao: editModal.data.descricao, prioridade: editModal.data.prioridade
      };
      
      try {
          const { error } = await supabase.from("tarefas").update(payload).eq("id", editModal.data.id);
          if (error) throw error;
          setEditModal({show: false, data: null});
          showToast("Alterações guardadas!"); 
          fetchMyTasks();
      } catch (err) { showToast("Erro ao guardar: " + err.message, "error"); }
  }

  // --- DRAG & DROP ---
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
      
      try {
          await supabase.from('tarefas').update({ data_limite: newDate }).eq("id", draggedTask.id);
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
      
      let dateColor = '#64748b';
      if (task.data_limite && !isCompleted) {
          const d = new Date(task.data_limite); d.setHours(0,0,0,0);
          const t = new Date(); t.setHours(0,0,0,0);
          if (d < t) dateColor = '#ef4444';
          else if (d.getTime() === t.getTime()) dateColor = '#10b981';
      }

      return (
          <div 
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
                    background: isCompleted ? '#10b981' : 'transparent',
                    color: isCompleted ? 'white' : 'transparent'
                }} 
                className="hover-check-circle" 
                title="Marcar como concluído"
              >
                  <Icons.Check size={12} />
              </button>

              <div style={{flex: 1, overflow: 'hidden'}}>
                  <h4 onClick={() => setEditModal({show: true, data: {...task}})} style={{margin: '0 0 6px 0', fontSize: '0.95rem', color: isCompleted ? '#94a3b8' : '#1e293b', textDecoration: isCompleted ? 'line-through' : 'none', cursor: 'pointer', wordBreak: 'break-word', lineHeight: '1.4'}} className="hover-text-blue">
                      {task.titulo}
                  </h4>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                      <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                          {task.data_limite && <span style={{fontSize: '0.7rem', color: isCompleted ? '#94a3b8' : dateColor, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'}}><Icons.Calendar /> {new Date(task.data_limite).toLocaleDateString('pt-PT', {day:'2-digit', month:'short'})}</span>}
                          {task.descricao && <span style={{color: '#94a3b8'}} title="Tem notas"><Icons.FileText /></span>}
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
                  
                  {/* Quick Add Inline */}
                  <form onSubmit={(e) => handleQuickAdd(e, id)} style={{marginTop: '5px'}}>
                      <div style={{position: 'relative'}}>
                          <span style={{position: 'absolute', left: '10px', top: '10px', color: '#94a3b8'}}><Icons.Plus /></span>
                          <input 
                              type="text" 
                              placeholder="Adicionar tarefa..." 
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
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
              <div style={{background: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Kanban /></div>
              <div>
                  <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Minhas Tarefas</h1>
                  <p style={{margin: '0', color: '#64748b', fontSize: '0.9rem', fontWeight: '500'}}>O teu quadro de produtividade pessoal. Arrasta os cartões!</p>
              </div>
          </div>
          
          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: '700', background: '#f8fafc', padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', transition: '0.2s'}} className="hover-shadow">
                  <input type="checkbox" checked={mostrarConcluidos} onChange={(e) => setMostrarConcluidos(e.target.checked)} style={{width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer'}} /> Mostrar Concluídas
              </label>

              <form onSubmit={handleCreatePessoal} style={{display: 'flex', gap: '10px', background: 'white', padding: '6px', borderRadius: '12px', border: '1px solid #cbd5e1', width: '320px', transition: '0.2s'}} className="input-focus-wrapper hover-shadow">
                  <input type="text" placeholder="Tarefa rápida (Enter)..." value={novaTarefaNome} onChange={e => setNovaTarefaNome(e.target.value)} style={{flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '8px 12px', fontSize: '0.95rem', color: '#1e293b'}} />
                  <button type="submit" style={{background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px'}} className="hover-bg-blue">
                      <Icons.Plus /> Add
                  </button>
              </form>
          </div>
      </div>

      {/* QUADRO KANBAN (5 COLUNAS DISTRIBUÍDAS IGUALMENTE MODO GRELHA) */}
      <div className="kanban-grid" style={{flex: 1}}>
          {renderKanbanColumn("atrasadas", "Atrasadas", <Icons.AlertTriangle />, "#ef4444", tasks.atrasadas)}
          {renderKanbanColumn("hoje", "Para Hoje", <Icons.Flame />, "#d97706", tasks.hoje)}
          {renderKanbanColumn("amanha", "Amanhã", <Icons.Calendar />, "#3b82f6", tasks.amanha)}
          {renderKanbanColumn("depois", "Mais Tarde", <Icons.Calendar />, "#8b5cf6", tasks.depois)}
          {renderKanbanColumn("semData", "Sem Data", <Icons.Inbox />, "#64748b", tasks.semData)}
      </div>

      {/* MODAL DE EDIÇÃO DE TAREFA */}
      {editModal.show && editModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)'}} onClick={() => setEditModal({show: false, data: null})}>
                  <div style={{background: '#fff', width: '90%', maxWidth: '550px', borderRadius: '16px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease-out'}} onClick={e => e.stopPropagation()}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Edit color="#2563eb" size={20} /> Detalhes da Tarefa</h3>
                          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                              <button onClick={() => { handleDeleteTask(editModal.data.id); setEditModal({show:false, data:null}); }} style={{background:'transparent', border:'none', cursor:'pointer', color:'#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold'}} className="hover-red-text" title="Apagar Tarefa">
                                  <Icons.Trash /> Apagar
                              </button>
                              <div style={{width: '1px', height: '20px', background: '#e2e8f0'}}></div>
                              <button onClick={() => setEditModal({show: false, data: null})} style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display: 'flex'}} className="hover-red-text"><Icons.Close size={20} /></button>
                          </div>
                      </div>

                      <form onSubmit={handleSaveModal}>
                          <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>O que é para fazer?</label>
                          <input type="text" value={editModal.data.titulo} onChange={e => setEditModal({...editModal, data: {...editModal.data, titulo: e.target.value}})} required style={{width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1.05rem', marginBottom: '20px', outline: 'none', boxSizing: 'border-box', fontWeight: 'bold', color: '#0f172a', transition: '0.2s'}} className="input-focus" />

                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px'}}>
                              <div>
                                  <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Data Limite</label>
                                  <input type="date" value={editModal.data.data_limite || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, data_limite: e.target.value}})} style={{width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: '0.2s'}} className="input-focus" />
                              </div>
                              <div>
                                  <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Prioridade</label>
                                  <select value={editModal.data.prioridade || 'normal'} onChange={e => setEditModal({...editModal, data: {...editModal.data, prioridade: e.target.value}})} style={{width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer', transition: '0.2s'}} className="input-focus">
                                      <option value="baixa">🔵 Baixa</option>
                                      <option value="normal">🟢 Normal</option>
                                      <option value="alta">🟠 Alta</option>
                                      <option value="urgente">🔴 Urgente</option>
                                  </select>
                              </div>
                          </div>

                          <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Notas / Documentos de Apoio</label>
                          <textarea rows="5" value={editModal.data.descricao || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, descricao: e.target.value}})} placeholder="Ex: Link do drive, apontamentos da reunião..." style={{width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fffbeb', fontSize: '0.95rem', marginBottom: '30px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', transition: '0.2s'}} className="input-focus" />

                          <div style={{display: 'flex', gap: '10px'}}>
                              <button type="button" onClick={() => setEditModal({show: false, data: null})} style={{flex: 1, background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" style={{flex: 2, background: '#2563eb', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow hover-bg-blue"><Icons.Save /> Guardar Alterações</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- NOTIFICAÇÃO GLOBAL --- */}
      {notification && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'90%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}>
                          {notification.type === 'success' ? <Icons.CheckCircle color="#10b981" /> : <Icons.XCircle color="#ef4444" />}
                      </div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>{notification.type === 'success' ? 'Sucesso!' : 'Atenção'}</h3>
                      <p style={{color: '#64748b', margin: 0, lineHeight: '1.5', fontSize: '0.95rem'}}>{notification.message}</p>
                  </div>
              </div>
          </ModalPortal>
      )}

      <style>{`
          /* A GRELHA PERFEITA PARA O KANBAN */
          .kanban-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 20px;
          }

          /* Em ecrãs pequenos vira scroll horizontal */
          @media (max-width: 1100px) {
              .kanban-grid {
                  display: flex;
                  overflow-x: auto;
                  padding-bottom: 10px;
              }
              .kanban-grid > div {
                  min-width: 280px;
              }
          }

          /* Efeito mágico do botão de Check na tarefa */
          .hover-check-circle { color: transparent; }
          .hover-check-circle:hover { border-color: #10b981 !important; color: #10b981 !important; background: #dcfce7 !important; }
          
          .hover-text-blue:hover { color: #2563eb !important; }
          .hover-shadow:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
          .hover-bg-blue:hover { background: #1d4ed8 !important; }
          .hover-red-text:hover { color: #ef4444 !important; }
          .hover-icon-btn:hover { opacity: 0.8; transform: scale(1.05); }

          .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .input-focus-wrapper:focus-within { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important; }

          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}