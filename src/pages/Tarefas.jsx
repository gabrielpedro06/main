import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

// --- PORTAL PARA O MODAL (PARA FICAR POR CIMA DE TUDO) ---
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Tarefas() {
  const { user } = useAuth();
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Time Tracking
  const [activeTask, setActiveTask] = useState(null); 

  // Notificações
  const [notification, setNotification] = useState(null);

  // Dados Auxiliares
  const [atividades, setAtividades] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [projetosList, setProjetosList] = useState([]); 

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Form
  const [form, setForm] = useState({
    titulo: "", descricao: "", atividade_id: "", responsavel_id: "",
    estado: "pendente", prioridade: "normal",
    data_inicio: new Date().toISOString().split('T')[0], data_limite: ""
  });

  useEffect(() => {
    fetchData();
    checkActiveTask();
  }, []);

  // --- HELPER DE NOTIFICAÇÃO ---
  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  async function fetchData() {
    setLoading(true);
    const { data: tarefasData, error } = await supabase
      .from("tarefas")
      .select(`
        *,
        atividades ( id, titulo, projetos ( id, titulo, clientes ( id, marca ) ) ),
        profiles:responsavel_id ( nome, email )
      `)
      .order("created_at", { ascending: false });

    if (!error) setTarefas(tarefasData || []);

    const { data: ativData } = await supabase.from("atividades").select("id, titulo, projetos(titulo)").neq("estado", "cancelado");
    setAtividades(ativData || []);
    const { data: staffData } = await supabase.from("profiles").select("id, nome, email").order("nome");
    setStaff(staffData || []);
    const { data: cliData } = await supabase.from("clientes").select("id, marca").order("marca");
    setClientes(cliData || []);
    const { data: projData } = await supabase.from("projetos").select("id, titulo").order("titulo");
    setProjetosList(projData || []);

    setLoading(false);
  }

  // --- TIME TRACKING ---
  async function checkActiveTask() {
      if(!user?.id) return;
      const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
      if (data) setActiveTask(data);
  }

  async function handleStartTask(tarefa) {
      if (activeTask) {
          showToast("Já tens uma tarefa a decorrer! Pára a anterior.", "error");
          return;
      }
      const { data, error } = await supabase.from("task_logs").insert([{ user_id: user.id, task_id: tarefa.id, start_time: new Date().toISOString() }]).select().single();

      if (!error) {
          setActiveTask(data);
          if (tarefa.estado === 'pendente') {
              await supabase.from("tarefas").update({ estado: 'em_curso' }).eq('id', tarefa.id);
              fetchData();
          }
          showToast("Cronómetro iniciado! ⏱️");
      }
  }

  async function handleStopTask() {
      if (!activeTask) return;
      const now = new Date();
      const start = new Date(activeTask.start_time);
      const diffMins = Math.floor((now - start) / 60000); 

      const { error } = await supabase.from("task_logs").update({ end_time: now.toISOString(), duration_minutes: diffMins > 0 ? diffMins : 1 }).eq("id", activeTask.id);

      if (!error) {
          setActiveTask(null);
          showToast(`Tarefa parada. Tempo registado: ${diffMins} min.`, "success");
      }
  }

  async function handleToggleStatus(tarefa) {
      const novoEstado = tarefa.estado === 'concluido' ? 'em_curso' : 'concluido';
      if (novoEstado === 'concluido' && activeTask?.task_id === tarefa.id) {
          await handleStopTask();
      }
      const { error } = await supabase.from("tarefas").update({ estado: novoEstado }).eq("id", tarefa.id);
      if (!error) {
          fetchData();
          if (novoEstado === 'concluido') showToast("Tarefa concluída! 🎉");
          else showToast("Tarefa reaberta.");
      } else { showToast("Erro ao atualizar.", "error"); }
  }

  // --- FILTROS ---
  const tarefasFiltradas = tarefas.filter((t) => {
    const matchBusca = t.titulo.toLowerCase().includes(busca.toLowerCase());
    const matchProjeto = filtroProjeto ? t.atividades?.projetos?.id === filtroProjeto : true;
    const matchCliente = filtroCliente ? t.atividades?.projetos?.clientes?.id === filtroCliente : true;
    const isInactive = t.estado === 'concluido' || t.estado === 'cancelado';
    if (!mostrarConcluidos && isInactive) return false;
    return matchBusca && matchProjeto && matchCliente;
  });

  // --- MODAL & SUBMIT ---
  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
    setForm({ titulo: "", descricao: "", atividade_id: atividades.length > 0 ? atividades[0].id : "", responsavel_id: "", estado: "pendente", prioridade: "normal", data_inicio: new Date().toISOString().split('T')[0], data_limite: "" });
    setShowModal(true);
  }
  function handleEdit(tarefa) { setEditId(tarefa.id); setIsViewOnly(false); loadData(tarefa); }
  function handleView(tarefa) { setEditId(tarefa.id); setIsViewOnly(true); loadData(tarefa); }
  function loadData(t) {
    setForm({ titulo: t.titulo, descricao: t.descricao || "", atividade_id: t.atividade_id, responsavel_id: t.responsavel_id, estado: t.estado, prioridade: t.prioridade || "normal", data_inicio: t.data_inicio || "", data_limite: t.data_limite || "" });
    setShowModal(true);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (isViewOnly) return;
    const payload = { ...form };
    if (!payload.responsavel_id) payload.responsavel_id = null;
    if (!payload.atividade_id) return showToast("Atividade obrigatória!", "error");
    
    try {
      if (editId) { await supabase.from("tarefas").update(payload).eq("id", editId); showToast("Tarefa atualizada!"); } 
      else { await supabase.from("tarefas").insert([payload]); showToast("Tarefa criada!"); }
      setShowModal(false); fetchData();
    } catch (error) { showToast("Erro: " + error.message, "error"); }
  }

  // Cores
  const getStatusColor = (s) => { if(s==='concluido') return '#dcfce7'; if(s==='em_curso') return '#dbeafe'; return '#f3f4f6'; };
  const getPriorityColor = (p) => { if(p==='urgente') return '#fee2e2'; if(p==='alta') return '#ffedd5'; if(p==='baixa') return '#f1f5f9'; return '#e0f2fe'; }

  // --- ESTILOS DO MODAL ---
  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 };
  const modalStyle = { background: '#fff', width: '95%', maxWidth: '700px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' };
  const modalHeaderStyle = { padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' };
  const modalBodyStyle = { padding: '30px', overflowY: 'auto', background: '#f8fafc' };
  const sectionTitleStyle = { fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const inputGroupStyle = { marginBottom: '15px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', color: '#1e293b', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <h1>✅ Minhas Tarefas</h1>
            {activeTask && (
                <div style={{ background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}>
                    <span className="pulse-dot-white"></span> A cronometrar...
                    <button onClick={handleStopTask} style={{background: 'white', color:'#2563eb', border:'none', borderRadius:'5px', padding:'2px 8px', cursor:'pointer', fontWeight:'bold'}}>⏹ PARAR</button>
                </div>
            )}
        </div>
        <button className="btn-primary" onClick={handleNovo}>+ Nova Tarefa</button>
      </div>

      <div className="filters-container">
        <input type="text" placeholder="🔍 Procurar tarefa..." className="search-input" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="filter-select" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}><option value="">Todos os Clientes</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.marca}</option>)}</select>
        <select className="filter-select" value={filtroProjeto} onChange={(e) => setFiltroProjeto(e.target.value)}><option value="">Todos os Projetos</option>{projetosList.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select>
        <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem'}}>
            <input type="checkbox" checked={mostrarConcluidos} onChange={(e) => setMostrarConcluidos(e.target.checked)} style={{width: '18px', height: '18px'}} /> Arquivados
        </label>
        {(busca || filtroCliente || filtroProjeto) && <button className="btn-clear" onClick={() => { setBusca(""); setFiltroCliente(""); setFiltroProjeto(""); }}>Limpar ✖</button>}
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width: '90px', textAlign: 'center'}}>Controlos</th>
              <th>Tarefa</th>
              <th style={{width: '140px'}}>Deadline</th> {/* NOVA COLUNA DEADLINE */}
              <th>Atividade / Projeto</th>
              <th>Responsável</th>
              <th>Prioridade</th>
              <th style={{textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {tarefasFiltradas.length > 0 ? (
                tarefasFiltradas.map((t) => {
                    const isRunningThis = activeTask && activeTask.task_id === t.id;
                    const isCompleted = t.estado === 'concluido';
                    const isExpired = t.data_limite && new Date(t.data_limite) < new Date() && !isCompleted;

                    return (
                        <tr key={t.id} style={{background: isRunningThis ? '#eff6ff' : 'transparent', opacity: isCompleted ? 0.6 : 1}}>
                            <td style={{textAlign: 'center'}}>
                                <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
                                    {activeTask ? (
                                        isRunningThis ? (
                                            <button onClick={handleStopTask} title="Parar" style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'50%', width:'30px', height:'30px', cursor:'pointer', fontSize:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center'}}>⏹</button>
                                        ) : (
                                            <button disabled style={{border:'none', background:'#f3f4f6', color:'#cbd5e1', borderRadius:'50%', width:'30px', height:'30px', cursor:'not-allowed', display:'flex', alignItems:'center', justifyContent:'center'}}>▶</button>
                                        )
                                    ) : (
                                        <button onClick={() => handleStartTask(t)} disabled={isCompleted} title="Iniciar" style={{border:'none', background: isCompleted ? '#f3f4f6' : '#dbeafe', color: isCompleted ? '#ccc' : '#2563eb', borderRadius:'50%', width:'30px', height:'30px', cursor: isCompleted ? 'default' : 'pointer', fontSize:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center'}}>▶</button>
                                    )}
                                    <label className="switch" title="Completar">
                                        <input type="checkbox" checked={isCompleted} onChange={() => handleToggleStatus(t)} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </td>
                            <td style={{ fontWeight: "bold", color: isRunningThis ? "#2563eb" : "#334155" }}>
                                <span style={{textDecoration: isCompleted ? 'line-through' : 'none'}}>{t.titulo}</span>
                            </td>

                            {/* DEADLINE VISÍVEL NA TABELA COM CORES */}
                            <td>
                                {t.data_limite ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '5px', 
                                        color: isExpired ? '#dc2626' : '#475569',
                                        fontWeight: isExpired ? '700' : '600',
                                        fontSize: '0.85rem',
                                        background: isExpired ? '#fef2f2' : '#f8fafc',
                                        padding: '4px 8px', borderRadius: '6px', width: 'fit-content',
                                        border: isExpired ? '1px solid #fecaca' : '1px solid #e2e8f0'
                                    }}>
                                        📅 {new Date(t.data_limite).toLocaleDateString('pt-PT')}
                                    </div>
                                ) : (
                                    <span style={{color: '#cbd5e1', fontSize: '0.8rem'}}>---</span>
                                )}
                            </td>

                            <td>{t.atividades?.titulo || "N/A"}<div style={{fontSize: '0.8rem', color: '#666'}}>{t.atividades?.projetos?.titulo} • {t.atividades?.projetos?.clientes?.marca}</div></td>
                            <td>{t.profiles?.nome || t.profiles?.email || "N/A"}</td>
                            <td><span className="badge" style={{backgroundColor: getPriorityColor(t.prioridade), color: '#334151'}}>{t.prioridade}</span></td>
                            <td style={{textAlign: 'center'}}>
                                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                    <button className="btn-small" onClick={() => handleView(t)}>👁️</button>
                                    <button className="btn-small" onClick={() => handleEdit(t)}>✏️</button>
                                </div>
                            </td>
                        </tr>
                    );
                })
            ) : (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#666'}}>Sem tarefas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      {/* --- NOVO MODAL (DESIGN GRELHA) --- */}
      {showModal && (
        <ModalPortal>
          <div style={modalOverlayStyle} onClick={(e) => { if(e.target === e.currentTarget) setShowModal(false); }}>
            <div style={modalStyle}>
              
              <div style={modalHeaderStyle}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{background: '#eff6ff', padding: '8px', borderRadius: '8px', fontSize: '1.2rem'}}>
                        {isViewOnly ? '👁️' : (editId ? '✏️' : '✨')}
                    </span>
                    <div>
                        <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>
                            {isViewOnly ? "Detalhes da Tarefa" : (editId ? "Editar Tarefa" : "Nova Tarefa")}
                        </h3>
                        <p style={{margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem'}}>
                            {isViewOnly ? "Modo de leitura" : "Preencha as informações abaixo"}
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowModal(false)} style={{background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8'}}>✕</button>
              </div>

              <div style={modalBodyStyle}>
                <form onSubmit={handleSubmit}>
                  <fieldset disabled={isViewOnly} style={{border:'none', padding:0, margin:0}}>
                    
                    {/* TÍTULO */}
                    <div style={{marginBottom: '20px'}}>
                        <label style={labelStyle}>Título da Tarefa *</label>
                        <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required placeholder="Ex: Criar logótipo para Cliente X..." style={{...inputStyle, fontSize: '1.1rem', padding: '12px'}} />
                    </div>

                    <div style={sectionTitleStyle}>📌 Enquadramento</div>
                    
                    {/* GRELHA 1 */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Atividade / Projeto *</label>
                            <select value={form.activity_id} onChange={e => setForm({...form, activity_id: e.target.value})} required style={inputStyle}>
                                <option value="">-- Selecione --</option>
                                {atividades.map(a => (
                                    <option key={a.id} value={a.id}>{a.titulo} (Proj: {a.projetos?.titulo})</option>
                                ))}
                            </select>
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Responsável</label>
                            <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})} style={inputStyle}>
                                <option value="">-- Selecione --</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={sectionTitleStyle}>📅 Planeamento & Estado</div>

                    {/* GRELHA 2 */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'}}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Data Início</label>
                            <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Prazo Limite (Deadline)</label>
                            <input type="date" value={form.data_limite} onChange={e => setForm({...form, data_limite: e.target.value})} style={{...inputStyle, borderColor: form.data_limite ? '#fca5a5' : '#cbd5e1'}} />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Prioridade</label>
                            <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})} style={inputStyle}>
                                <option value="baixa">🟢 Baixa</option>
                                <option value="normal">🔵 Normal</option>
                                <option value="alta">🟠 Alta</option>
                                <option value="urgente">🔴 Urgente</option>
                            </select>
                        </div>
                    </div>

                    {/* ESTADOS VISUAIS */}
                    <div style={{marginBottom: '20px'}}>
                        <label style={labelStyle}>Estado Atual</label>
                        <div style={{display: 'flex', gap: '10px'}}>
                            {['pendente', 'em_curso', 'concluido', 'cancelado'].map(st => (
                                <div key={st} onClick={() => !isViewOnly && setForm({...form, estado: st})}
                                    style={{
                                        flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px', cursor: isViewOnly ? 'default' : 'pointer',
                                        fontSize: '0.85rem', fontWeight: '600',
                                        background: form.estado === st ? '#2563eb' : '#fff',
                                        color: form.estado === st ? 'white' : '#64748b',
                                        border: form.estado === st ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {st.replace('_', ' ').toUpperCase()}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={sectionTitleStyle}>📝 Detalhes</div>
                    <div style={inputGroupStyle}>
                        <textarea rows="5" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descreva o que é necessário fazer..." style={{...inputStyle, resize: 'vertical', minHeight: '100px'}} />
                    </div>
                  </fieldset>

                  {!isViewOnly && (
                      <div style={{display: 'flex', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0'}}>
                          <button type="button" onClick={() => setShowModal(false)} style={{flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '600', cursor: 'pointer'}}>Cancelar</button>
                          <button type="submit" style={{flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'}}>{editId ? "💾 Guardar Alterações" : "🚀 Criar Tarefa"}</button>
                      </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      
      <style>{`.pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }`}</style>
    </div>
  );
}