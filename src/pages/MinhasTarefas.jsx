import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

const ModalPortal = ({ children }) => createPortal(children, document.body);

export default function MinhasTarefas() {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState({ atrasadas: [], hoje: [], amanha: [], depois: [], semData: [] });
  const [logs, setLogs] = useState([]);
  const [activeLog, setActiveLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  
  // Estado para o Quick Add de CADA coluna independentemente
  const [newTasks, setNewTasks] = useState({ atrasadas: '', hoje: '', amanha: '', depois: '', semData: '' });
  
  const [novaTarefaNome, setNovaTarefaNome] = useState("");

  // Modal de Detalhes
  const [editModal, setEditModal] = useState({ show: false, data: null });

  // DRAG & DROP STATE
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Recarrega sempre que o user entra ou clica no "Mostrar Concluídos"
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

  // --- MOTOR ESTILO ASANA ---
  async function fetchMyTasks() {
      try {
          // Query Base
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

  // --- MATEMÁTICA DE TEMPOS ---
  const getTaskTime = (taskId) => logs.filter(l => l.task_id === taskId).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  const formatTime = (mins) => {
      if (mins === 0) return "0m";
      const h = Math.floor(mins / 60); const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // --- ACÇÕES RÁPIDAS ---
  async function handleToggleTimer(task) {
      if (activeLog && activeLog.task_id === task.id) {
          const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000));
          await supabase.from("task_logs").update({ end_time: new Date().toISOString(), duration_minutes: diffMins }).eq("id", activeLog.id);
          setActiveLog(null); showToast(`Tempo guardado: ${diffMins} min.`);
          carregarTudo();
      } else {
          if (activeLog) return showToast("Já tens um cronómetro ativo. Pára-o primeiro!", "error");
          const { data, error } = await supabase.from("task_logs").insert([{ user_id: user.id, task_id: task.id, start_time: new Date().toISOString() }]).select().single();
          if (!error) { setActiveLog(data); showToast("Em curso! ⏱️"); }
      }
  }

  async function handleCompleteTask(task) {
      const novoEstado = task.estado === 'concluido' ? 'pendente' : 'concluido';
      await supabase.from("tarefas").update({ estado: novoEstado }).eq("id", task.id);
      showToast(novoEstado === 'concluido' ? "Boa! Tarefa concluída. 🎉" : "Tarefa reaberta.");
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
          setNewTasks({ ...newTasks, [colId]: "" }); // Limpa o texto daquela coluna
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
          showToast("Guardado!"); 
          fetchMyTasks();
      } catch (err) { showToast("Erro ao guardar: " + err.message, "error"); }
  }

  // --- 🪄 MAGIA DO DRAG & DROP 🪄 ---
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

  // --- FUNÇÕES RENDER (Corrigem o bug do foco do Input) ---
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
                  background: isTimerActive ? '#fefce8' : 'white', 
                  borderRadius: '10px', padding: '12px 15px', marginBottom: '10px', 
                  border: isTimerActive ? '2px solid #3b82f6' : '1px solid #e2e8f0', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: '12px', 
                  alignItems: 'flex-start', cursor: 'grab', 
                  opacity: (draggedTask?.id === task.id || isCompleted) ? 0.5 : 1 
              }} 
              className="asana-card"
          >
              <button onClick={() => handleCompleteTask(task)} style={{width: '22px', height: '22px', borderRadius: '50%', border: isCompleted ? 'none' : '2px solid #cbd5e1', background: isCompleted ? '#10b981' : 'transparent', cursor: 'pointer', marginTop: '2px', transition: '0.2s', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem'}} className="hover-check" title="Marcar como concluído">
                  {isCompleted && '✓'}
              </button>

              <div style={{flex: 1, overflow: 'hidden'}}>
                  <h4 onClick={() => setEditModal({show: true, data: {...task}})} style={{margin: '0 0 6px 0', fontSize: '0.95rem', color: isCompleted ? '#94a3b8' : '#1e293b', textDecoration: isCompleted ? 'line-through' : 'none', cursor: 'pointer', wordBreak: 'break-word', lineHeight: '1.4'}} className="hover-text-blue">
                      {task.titulo}
                  </h4>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                      <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                          {task.data_limite && <span style={{fontSize: '0.7rem', color: isCompleted ? '#94a3b8' : dateColor, fontWeight: 'bold'}}>{new Date(task.data_limite).toLocaleDateString('pt-PT', {day:'2-digit', month:'short'})}</span>}
                          {task.descricao && <span style={{fontSize: '0.8rem', color: '#94a3b8'}} title="Tem notas">📝</span>}
                      </div>

                      <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          {timeSpent > 0 && <span style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold'}}>{formatTime(timeSpent)}</span>}
                          
                          {!isCompleted && (
                              <button onClick={() => handleToggleTimer(task)} style={{background: isTimerActive ? '#fee2e2' : '#f1f5f9', color: isTimerActive ? '#ef4444' : '#64748b', border: 'none', padding: '4px 10px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                  {isTimerActive ? '⏹' : '▶'}
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderKanbanColumn = (id, title, tasksList) => {
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
                  border: isOver ? '2px dashed #3b82f6' : '1px solid #e2e8f0', 
                  minHeight: '60vh', transition: 'all 0.2s ease'
              }}
          >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h3 style={{margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '800'}}>{title}</h3>
                  <span style={{color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold'}}>{tasksList.length}</span>
              </div>
              
              <div style={{overflowY: 'auto', flex: 1, paddingRight: '5px'}} className="custom-scrollbar">
                  {tasksList.map(t => renderCardTarefa(t))}
                  
                  {/* Quick Add Inline */}
                  <form onSubmit={(e) => handleQuickAdd(e, id)} style={{marginTop: '5px'}}>
                      <input 
                          type="text" 
                          placeholder="+ Adicionar tarefa..." 
                          value={newTasks[id] || ''} 
                          onChange={e => setNewTasks({...newTasks, [id]: e.target.value})} 
                          style={{width: '100%', padding: '10px', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.9rem', color: '#475569'}} 
                      />
                  </form>
              </div>
          </div>
      );
  };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;

  return (
    <div className="page-container" style={{padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '1600px', margin: '0 auto'}}>
      
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '15px'}}>
          <div>
              <h1 style={{margin: 0, color: '#0f172a', fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.03em'}}>Minhas Tarefas</h1>
              <p style={{margin: '5px 0 0 0', color: '#64748b'}}>O teu quadro de produtividade. Arrasta as tarefas entre os dias!</p>
          </div>
          
          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: '600', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1'}}>
                  <input type="checkbox" checked={mostrarConcluidos} onChange={(e) => setMostrarConcluidos(e.target.checked)} style={{width: '14px', height: '14px', accentColor: '#10b981', cursor: 'pointer'}} /> Mostrar Concluídas
              </label>

              <form onSubmit={handleCreatePessoal} style={{display: 'flex', gap: '10px', background: 'white', padding: '5px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', width: '300px'}}>
                  <input type="text" placeholder="Tarefa rápida (Enter)..." value={novaTarefaNome} onChange={e => setNovaTarefaNome(e.target.value)} style={{flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '8px 12px', fontSize: '0.9rem'}} />
                  <button type="submit" style={{background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-btn-blue">Add</button>
              </form>
          </div>
      </div>

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      {/* QUADRO KANBAN (5 COLUNAS DISTRIBUÍDAS IGUALMENTE MODO GRELHA) */}
      <div className="kanban-grid" style={{flex: 1}}>
          {renderKanbanColumn("atrasadas", "🔴 Atrasadas", tasks.atrasadas)}
          {renderKanbanColumn("hoje", "🟢 Hoje", tasks.hoje)}
          {renderKanbanColumn("amanha", "🟡 Amanhã", tasks.amanha)}
          {renderKanbanColumn("depois", "🔵 Mais Tarde", tasks.depois)}
          {renderKanbanColumn("semData", "⚪ Sem Data", tasks.semData)}
      </div>

      {/* PEQUENO MODAL DE EDIÇÃO DE TAREFA */}
      {editModal.show && editModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(3px)'}} onClick={() => setEditModal({show: false, data: null})}>
                  <div style={{background: '#fff', width: '90%', maxWidth: '550px', borderRadius: '16px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}} onClick={e => e.stopPropagation()}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>Detalhes da Tarefa</h3>
                          <div style={{display: 'flex', gap: '15px'}}>
                              <button onClick={() => { handleDeleteTask(editModal.data.id); setEditModal({show:false, data:null}); }} style={{background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize: '1.1rem'}} title="Apagar Tarefa">🗑️</button>
                              <button onClick={() => setEditModal({show: false, data: null})} style={{background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8'}}>✕</button>
                          </div>
                      </div>

                      <form onSubmit={handleSaveModal}>
                          <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b'}}>O que é para fazer?</label>
                          <input type="text" value={editModal.data.titulo} onChange={e => setEditModal({...editModal, data: {...editModal.data, titulo: e.target.value}})} required style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1.05rem', marginBottom: '20px', outline: 'none', boxSizing: 'border-box', fontWeight: 'bold', color: '#0f172a'}} />

                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                              <div>
                                  <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b'}}>Data Limite</label>
                                  <input type="date" value={editModal.data.data_limite || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, data_limite: e.target.value}})} style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'}} />
                              </div>
                              <div>
                                  <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b'}}>Prioridade</label>
                                  <select value={editModal.data.prioridade || 'normal'} onChange={e => setEditModal({...editModal, data: {...editModal.data, prioridade: e.target.value}})} style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', textTransform: 'capitalize'}}>
                                      <option value="baixa">🔵 Baixa</option>
                                      <option value="normal">🟢 Normal</option>
                                      <option value="alta">🟠 Alta</option>
                                      <option value="urgente">🔴 Urgente</option>
                                  </select>
                              </div>
                          </div>

                          <label style={{display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b'}}>Notas / Documentos de Apoio</label>
                          <textarea rows="6" value={editModal.data.descricao || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, descricao: e.target.value}})} placeholder="Ex: Link do drive, apontamentos da reunião..." style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fffbeb', fontSize: '0.95rem', marginBottom: '25px', outline: 'none', boxSizing: 'border-box', resize: 'vertical'}} />

                          <button type="submit" style={{width: '100%', background: '#2563eb', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: '0.2s'}} className="hover-btn-blue">💾 Guardar Alterações</button>
                      </form>
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
          }

          .hover-check:hover { background: #10b981 !important; border-color: #10b981 !important; color: white; }
          .hover-check:hover::after { content: '✓'; display: block; text-align: center; line-height: 18px; font-weight: bold; }
          .hover-text-blue:hover { color: #2563eb !important; }
          .asana-card:hover { border-color: #cbd5e1 !important; transform: translateY(-2px); }
          .hover-btn-blue:hover { background: #1d4ed8 !important; }

          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}