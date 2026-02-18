import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

// --- PORTAL PARA O MODAL ---
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Atividades() {
  const { user } = useAuth();
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Time Tracking
  const [activeLog, setActiveLog] = useState(null); 

  // Notificações (Toasts)
  const [notification, setNotification] = useState(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  // Listas para Dropdowns
  const [projetos, setProjetos] = useState([]);
  const [staff, setStaff] = useState([]);

  // Estados do Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Formulário
  const [form, setForm] = useState({
    titulo: "", projeto_id: "", responsavel_id: "", descricao: "",
    observacoes: "", estado: "pendente", data_inicio: "", data_fim: "",
    investimento: 0, incentivo: 0
  });

  useEffect(() => {
    fetchData();
    checkActiveLog();
  }, [user]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  async function fetchData() {
    setLoading(true);
    const { data: ativData, error } = await supabase
      .from("atividades")
      .select(`*, projetos ( id, titulo, codigo_projeto ), profiles:responsavel_id ( nome, email )`)
      .order("created_at", { ascending: false });

    if (!error) setAtividades(ativData || []);

    const { data: projData } = await supabase.from("projetos").select("id, titulo, codigo_projeto").neq("estado", "cancelado");
    setProjetos(projData || []);

    const { data: staffData } = await supabase.from("profiles").select("id, nome, email").order("nome");
    setStaff(staffData || []);
    setLoading(false);
  }

  async function checkActiveLog() {
    if(!user?.id) return;
    const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
    if (data) setActiveLog(data);
  }

  async function handleStartAtividade(ativ) {
    if (activeLog) {
        showToast("Já tens um cronómetro ativo!", "error");
        return;
    }
    const { data, error } = await supabase
        .from("task_logs")
        .insert([{ user_id: user.id, atividade_id: ativ.id, start_time: new Date().toISOString() }])
        .select().single();

    if (!error) {
        setActiveLog(data);
        if (ativ.estado === 'pendente') {
            await supabase.from("atividades").update({ estado: 'em_curso' }).eq('id', ativ.id);
            fetchData();
        }
        showToast("Cronómetro iniciado! ⏱️");
    }
  }

  async function handleStopLog() {
    if (!activeLog) return;
    const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000)); 

    const { error } = await supabase.from("task_logs")
        .update({ end_time: new Date().toISOString(), duration_minutes: diffMins })
        .eq("id", activeLog.id);

    if (!error) {
        setActiveLog(null);
        showToast(`Tempo registado: ${diffMins} min.`, "success");
        fetchData();
    }
  }

  async function handleToggleStatus(ativ) {
    const novoEstado = ativ.estado === 'concluido' ? 'em_curso' : 'concluido';
    if (novoEstado === 'concluido' && activeLog?.atividade_id === ativ.id) {
        await handleStopLog();
    }
    const { error } = await supabase.from("atividades").update({ estado: novoEstado }).eq("id", ativ.id);
    if (!error) {
        fetchData();
        showToast(novoEstado === 'concluido' ? "Atividade concluída! 🎉" : "Atividade reaberta.");
    }
  }

  const atividadesFiltradas = atividades.filter((a) => {
    const termo = busca.toLowerCase();
    const matchTexto = a.titulo?.toLowerCase().includes(termo) || 
                       a.projetos?.titulo?.toLowerCase().includes(termo);
    const isInactive = a.estado === 'concluido' || a.estado === 'cancelado';
    if (!mostrarConcluidos && isInactive) return false;
    return matchTexto;
  });

  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
    setForm({
      titulo: "", projeto_id: projetos.length > 0 ? projetos[0].id : "",
      responsavel_id: "", descricao: "", observacoes: "", estado: "pendente",
      data_inicio: new Date().toISOString().split('T')[0], data_fim: "", investimento: 0, incentivo: 0
    });
    setShowModal(true);
  }

  function handleEdit(ativ) { setEditId(ativ.id); setIsViewOnly(false); loadData(ativ); }
  function handleView(ativ) { setEditId(ativ.id); setIsViewOnly(true); loadData(ativ); }
  function loadData(ativ) {
    setForm({
      titulo: ativ.titulo, projeto_id: ativ.projeto_id, responsavel_id: ativ.responsavel_id,
      descricao: ativ.descricao || "", observacoes: ativ.observacoes || "",
      estado: ativ.estado, data_inicio: ativ.data_inicio || "", data_fim: ativ.data_fim || "",
      investimento: ativ.investimento || 0, incentivo: ativ.incentivo || 0
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isViewOnly) return;
    const payload = { ...form };
    if (!payload.responsavel_id) payload.responsavel_id = null;
    if (!payload.projeto_id) return showToast("Projeto obrigatório!", "error");

    try {
      if (editId) { await supabase.from("atividades").update(payload).eq("id", editId); showToast("Atualizada!"); } 
      else { await supabase.from("atividades").insert([payload]); showToast("Criada!"); }
      setShowModal(false); fetchData();
    } catch (error) { showToast("Erro: " + error.message, "error"); }
  }

  const getStatusColor = (s) => {
    if(s==='concluido') return {bg: '#dcfce7', text: '#166534'};
    if(s==='em_curso') return {bg: '#dbeafe', text: '#1e40af'};
    return {bg: '#f3f4f6', text: '#374151'};
  };

  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box' };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <h1>📋 Atividades</h1>
            {activeLog && (
                <div style={{ background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}>
                    <span className="pulse-dot-white"></span> A contar...
                    <button onClick={handleStopLog} style={{background: 'white', color:'#2563eb', border:'none', borderRadius:'5px', padding:'2px 8px', cursor:'pointer', fontWeight:'bold'}}>⏹ PARAR</button>
                </div>
            )}
        </div>
        <button className="btn-primary" onClick={handleNovo}>+ Nova Atividade</button>
      </div>

      <div className="filters-container">
        <input type="text" placeholder="🔍 Procurar atividade..." className="search-input" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem'}}>
            <input type="checkbox" checked={mostrarConcluidos} onChange={(e) => setMostrarConcluidos(e.target.checked)} style={{width: '18px', height: '18px'}} /> Mostrar Arquivados
        </label>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width: '90px', textAlign: 'center'}}>Timer</th>
              <th>Atividade</th>
              <th style={{width: '140px'}}>Deadline</th> {/* NOVA COLUNA DEADLINE */}
              <th>Projeto Pai</th>
              <th>Responsável</th>
              <th style={{textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {atividadesFiltradas.length > 0 ? (
                atividadesFiltradas.map((a) => {
                    const isRunning = activeLog?.atividade_id === a.id;
                    const isCompleted = a.estado === 'concluido';
                    const isExpired = a.data_fim && new Date(a.data_fim) < new Date() && !isCompleted;

                    return (
                        <tr key={a.id} style={{ background: isRunning ? '#eff6ff' : 'transparent', opacity: isCompleted ? 0.6 : 1 }}>
                            <td style={{textAlign: 'center'}}>
                                <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
                                    {isRunning ? (
                                        <button onClick={handleStopLog} title="Parar" style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'50%', width:'30px', height:'30px', cursor:'pointer', fontSize:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center'}}>⏹</button>
                                    ) : (
                                        <button onClick={() => handleStartAtividade(a)} disabled={isCompleted} title="Iniciar" style={{border:'none', background: isCompleted ? '#f3f4f6' : '#dbeafe', color: isCompleted ? '#ccc' : '#2563eb', borderRadius:'50%', width:'30px', height:'30px', cursor: isCompleted ? 'default' : 'pointer', fontSize:'0.8rem', display:'flex', alignItems:'center', justifyContent:'center'}}>▶</button>
                                    )}
                                    <label className="switch" title="Completar">
                                        <input type="checkbox" checked={isCompleted} onChange={() => handleToggleStatus(a)} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </td>
                            <td style={{ fontWeight: "bold", color: isRunning ? "#2563eb" : "#334155" }}>
                                <span style={{textDecoration: isCompleted ? 'line-through' : 'none'}}>{a.titulo}</span>
                                {a.investimento > 0 && <div style={{fontSize: '0.75rem', fontWeight:'normal', color: '#64748b'}}>{a.investimento}€</div>}
                            </td>

                            {/* DEADLINE VISÍVEL NA TABELA */}
                            <td>
                                {a.data_fim ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '5px', 
                                        color: isExpired ? '#dc2626' : '#475569',
                                        fontWeight: isExpired ? '700' : '600',
                                        fontSize: '0.85rem',
                                        background: isExpired ? '#fef2f2' : '#f8fafc',
                                        padding: '4px 8px', borderRadius: '6px', width: 'fit-content',
                                        border: isExpired ? '1px solid #fecaca' : '1px solid #e2e8f0'
                                    }}>
                                        📅 {new Date(a.data_fim).toLocaleDateString('pt-PT')}
                                    </div>
                                ) : (
                                    <span style={{color: '#cbd5e1', fontSize: '0.8rem'}}>---</span>
                                )}
                            </td>

                            <td>{a.projetos?.titulo || "Sem Projeto"}<small style={{display:'block', color:'#666'}}>{a.projetos?.codigo_projeto}</small></td>
                            <td>{a.profiles?.nome || a.profiles?.email || "N/A"}</td>
                            <td style={{textAlign: 'center'}}>
                                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                    <button className="btn-small" onClick={() => handleView(a)}>👁️</button>
                                    <button className="btn-small" onClick={() => handleEdit(a)}>✏️</button>
                                </div>
                            </td>
                        </tr>
                    );
                })
            ) : (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#666'}}>Nenhuma atividade encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      {showModal && (
        <ModalPortal>
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={() => setShowModal(false)}>
            <div style={{background:'#fff', width:'95%', maxWidth:'800px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'92vh'}} onClick={e => e.stopPropagation()}>
              <div style={{padding:'20px 30px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{background: '#eff6ff', padding: '8px', borderRadius: '8px', fontSize: '1.2rem'}}>📋</span>
                    <div>
                        <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>
                            {isViewOnly ? "Ver Atividade" : (editId ? "Editar Atividade" : "Nova Atividade")}
                        </h3>
                    </div>
                </div>
                <button onClick={() => setShowModal(false)} style={{background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8'}}>✕</button>
              </div>

              <div style={{padding: '30px', overflowY: 'auto', background: '#f8fafc'}}>
                <form onSubmit={handleSubmit}>
                  <fieldset disabled={isViewOnly} style={{border:'none', padding:0, margin:0}}>
                    <div style={{marginBottom: '20px'}}>
                        <label style={labelStyle}>Título da Atividade *</label>
                        <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required style={{...inputStyle, fontSize: '1.1rem', padding: '12px'}} />
                    </div>

                    <div style={sectionTitleStyle}>📌 Projeto & Responsável</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        <div style={{marginBottom: '15px'}}>
                            <label style={labelStyle}>Projeto Pai *</label>
                            <select value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})} required style={inputStyle}>
                                <option value="">-- Selecione --</option>
                                {projetos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                            </select>
                        </div>
                        <div style={{marginBottom: '15px'}}>
                            <label style={labelStyle}>Responsável</label>
                            <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})} style={inputStyle}>
                                <option value="">-- Ninguém --</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={sectionTitleStyle}>📅 Planeamento & Financeiro</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px'}}>
                        <div><label style={labelStyle}>Data Início</label><input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Data Fim (Deadline)</label><input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} style={{...inputStyle, border: form.data_fim ? '1px solid #fca5a5' : '1px solid #cbd5e1'}} /></div>
                        <div><label style={labelStyle}>Investimento (€)</label><input type="number" step="0.01" value={form.investimento} onChange={e => setForm({...form, investimento: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Incentivo (€)</label><input type="number" step="0.01" value={form.incentivo} onChange={e => setForm({...form, incentivo: e.target.value})} style={inputStyle} /></div>
                    </div>

                    <div style={sectionTitleStyle}>⚙️ Estado</div>
                    <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                        {['pendente', 'em_curso', 'concluido', 'cancelado'].map(st => (
                            <div key={st} onClick={() => !isViewOnly && setForm({...form, estado: st})}
                                style={{
                                    flex: 1, textAlign: 'center', padding: '12px', borderRadius: '10px', cursor: isViewOnly ? 'default' : 'pointer',
                                    fontSize: '0.85rem', fontWeight: '700',
                                    background: form.estado === st ? '#2563eb' : '#fff',
                                    color: form.estado === st ? 'white' : '#64748b',
                                    border: form.estado === st ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                    transition: 'all 0.2s', textTransform: 'uppercase'
                                }}
                            >
                                {st.replace('_', ' ')}
                            </div>
                        ))}
                    </div>

                    <div style={sectionTitleStyle}>📝 Notas</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        <textarea rows="4" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descrição..." style={{...inputStyle, resize: 'none'}} />
                        <textarea rows="4" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} placeholder="Observações..." style={{...inputStyle, resize: 'none'}} />
                    </div>
                  </fieldset>

                  {!isViewOnly && (
                      <div style={{display:'flex', gap:'15px', marginTop:'30px', paddingTop:'20px', borderTop:'1px solid #e2e8f0'}}>
                          <button type="button" onClick={() => setShowModal(false)} style={{flex:1, padding:'14px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', color:'#64748b', fontWeight:'600', cursor:'pointer'}}>Cancelar</button>
                          <button type="submit" style={{flex:2, padding:'14px', borderRadius:'10px', border:'none', background:'#2563eb', color:'white', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 6px -1px rgba(37, 99, 235, 0.4)'}}>{editId ? "💾 Guardar Alterações" : "🚀 Criar Atividade"}</button>
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