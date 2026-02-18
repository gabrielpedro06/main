import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

// --- PORTAL PARA O MODAL ---
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Projetos() {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeLog, setActiveLog] = useState(null); 
  const [notification, setNotification] = useState(null);
  const [busca, setBusca] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [staff, setStaff] = useState([]); 

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const initialForm = {
    titulo: "", descricao: "", cliente_id: "", tipo_projeto_id: "",
    responsavel_id: "", estado: "pendente", data_inicio: "", data_fim: "",
    observacoes: "", programa: "", aviso: "", codigo_projeto: "",
    investimento: 0, incentivo: 0
  };

  const [form, setForm] = useState(initialForm);

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
    const { data: projData, error } = await supabase
      .from("projetos")
      .select(`*, clientes ( marca ), tipos_projeto ( nome ), profiles ( nome, email )`)
      .order("created_at", { ascending: false });

    if (!error) setProjetos(projData || []);

    const { data: cliData } = await supabase.from("clientes").select("id, marca").order("marca");
    setClientes(cliData || []);

    const { data: tipoData } = await supabase.from("tipos_projeto").select("id, nome").order("nome");
    setTipos(tipoData || []);

    const { data: staffData } = await supabase.from("profiles").select("id, nome, email").order("nome");
    setStaff(staffData || []);

    setLoading(false);
  }

  async function checkActiveLog() {
    if(!user?.id) return;
    const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
    if (data) setActiveLog(data);
  }

  async function handleStartProjeto(proj) {
    if (activeLog) return showToast("Já tens um cronómetro ativo!", "error");
    const { data, error } = await supabase.from("task_logs").insert([{ user_id: user.id, projeto_id: proj.id, start_time: new Date().toISOString() }]).select().single();
    if (!error) { setActiveLog(data); showToast("Cronómetro iniciado! ⏱️"); }
  }

  async function handleStopLog() {
    if (!activeLog) return;
    const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000)); 
    await supabase.from("task_logs").update({ end_time: new Date().toISOString(), duration_minutes: diffMins }).eq("id", activeLog.id);
    setActiveLog(null);
    showToast(`Tempo registado: ${diffMins} min.`);
    fetchData();
  }

  async function handleToggleStatus(proj) {
    const novoEstado = proj.estado === 'concluido' ? 'em_curso' : 'concluido';
    await supabase.from("projetos").update({ estado: novoEstado }).eq("id", proj.id);
    fetchData();
    showToast("Estado atualizado!");
  }

  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
    setForm({ ...initialForm, data_inicio: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  }

  function handleEdit(proj) {
    setEditId(proj.id); setIsViewOnly(false);
    setForm({
        titulo: proj.titulo || "", descricao: proj.descricao || "", cliente_id: proj.cliente_id || "",
        tipo_projeto_id: proj.tipo_projeto_id || "", responsavel_id: proj.responsavel_id || "",
        estado: proj.estado || "pendente", data_inicio: proj.data_inicio || "",
        data_fim: proj.data_fim || "", observacoes: proj.observacoes || "",
        programa: proj.programa || "", aviso: proj.aviso || "",
        codigo_projeto: proj.codigo_projeto || "", investimento: proj.investimento || 0, incentivo: proj.incentivo || 0
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (editId) await supabase.from("projetos").update(payload).eq("id", editId);
    else await supabase.from("projetos").insert([payload]);
    setShowModal(false); fetchData();
    showToast("Sucesso!");
  }

  const projetosFiltrados = projetos.filter(p => {
    const termo = busca.toLowerCase();
    const match = p.titulo?.toLowerCase().includes(termo) || p.clientes?.marca?.toLowerCase().includes(termo);
    const isInactive = p.estado === 'concluido' || p.estado === 'cancelado';
    return mostrarConcluidos ? match : (!isInactive && match);
  });

  // Estilos
  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <h1>🚀 Projetos</h1>
          {activeLog?.projeto_id && (
            <div style={{background:'#2563eb', color:'#fff', padding:'8px 16px', borderRadius:'20px', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'10px'}}>
               <span className="pulse-dot-white"></span> A cronometrar... <button onClick={handleStopLog} style={{background:'white', color:'#2563eb', border:'none', borderRadius:'5px', padding:'2px 8px', cursor:'pointer', fontWeight:'bold'}}>⏹ PARAR</button>
            </div>
          )}
        </div>
        <button className="btn-primary" onClick={handleNovo}>+ Novo Projeto</button>
      </div>

      <div className="filters-container">
        <input type="text" placeholder="🔍 Pesquisar projeto ou cliente..." className="search-input" value={busca} onChange={e => setBusca(e.target.value)} />
        <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'0.9rem'}}>
          <input type="checkbox" checked={mostrarConcluidos} onChange={e => setMostrarConcluidos(e.target.checked)} style={{width:'18px', height:'18px'}} /> Mostrar Arquivados
        </label>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:'90px', textAlign:'center'}}>Timer</th>
              <th>Projeto</th>
              <th style={{width:'150px'}}>Deadline</th> {/* COLUNA DEADLINE DESTAQUE */}
              <th>Cliente / Tipo</th>
              <th>Responsável</th>
              <th style={{textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {projetosFiltrados.map(p => {
              const isExpired = p.data_fim && new Date(p.data_fim) < new Date() && p.estado !== 'concluido';
              return (
                <tr key={p.id} style={{opacity: (p.estado === 'concluido' || p.estado === 'cancelado') ? 0.6 : 1}}>
                  <td style={{textAlign:'center'}}>
                    <div style={{display:'flex', gap:'10px', alignItems:'center', justifyContent:'center'}}>
                      {activeLog?.projeto_id === p.id ? 
                        <button onClick={handleStopLog} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'50%', width:'30px', height:'30px', cursor:'pointer'}}>⏹</button> :
                        <button onClick={() => handleStartProjeto(p)} disabled={p.estado === 'concluido'} style={{border:'none', background: p.estado === 'concluido' ? '#f3f4f6' : '#dbeafe', color: p.estado === 'concluido' ? '#ccc' : '#2563eb', borderRadius:'50%', width:'30px', height:'30px', cursor:'pointer'}}>▶</button>
                      }
                      <label className="switch">
                        <input type="checkbox" checked={p.estado === 'concluido'} onChange={() => handleToggleStatus(p)} />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </td>
                  <td style={{fontWeight: "bold", color: "#334155"}}>
                     {p.codigo_projeto && <small style={{color:'#2563eb', display:'block'}}>[{p.codigo_projeto}]</small>}
                     <span style={{textDecoration: p.estado === 'concluido' ? 'line-through' : 'none'}}>{p.titulo}</span>
                  </td>
                  
                  {/* CÉLULA DO DEADLINE VISÍVEL */}
                  <td>
                    {p.data_fim ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px', 
                            color: isExpired ? '#dc2626' : '#475569',
                            fontWeight: isExpired ? '700' : '600',
                            fontSize: '0.9rem',
                            background: isExpired ? '#fef2f2' : '#f8fafc',
                            padding: '4px 8px', borderRadius: '6px', width: 'fit-content',
                            border: isExpired ? '1px solid #fecaca' : '1px solid #e2e8f0'
                        }}>
                            📅 {new Date(p.data_fim).toLocaleDateString('pt-PT')}
                        </div>
                    ) : (
                        <span style={{color: '#cbd5e1', fontSize: '0.8rem'}}>Sem prazo</span>
                    )}
                  </td>

                  <td>
                      <div style={{fontWeight: '600'}}>{p.clientes?.marca}</div>
                      <div style={{fontSize: '0.8rem', color: '#666'}}>{p.tipos_projeto?.nome}</div>
                  </td>
                  <td>{p.profiles?.nome || 'N/A'}</td>
                  <td style={{textAlign: 'center'}}>
                    <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                      <button className="btn-small" onClick={() => { handleEdit(p); setIsViewOnly(true); }}>👁️</button>
                      <button className="btn-small" onClick={() => handleEdit(p)}>✏️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ModalPortal>
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={() => setShowModal(false)}>
            <div style={{background:'#fff', width:'95%', maxWidth:'850px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'92vh'}} onClick={e => e.stopPropagation()}>
              
              <div style={{padding:'20px 30px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{background:'#eff6ff', padding:'8px', borderRadius:'8px', fontSize:'1.2rem'}}>🚀</span>
                    <h3 style={{margin:0, color:'#1e293b', fontSize:'1.25rem'}}>{isViewOnly ? "Ver Projeto" : (editId ? "Editar Projeto" : "Novo Projeto")}</h3>
                </div>
                <button onClick={() => setShowModal(false)} style={{background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8'}}>✕</button>
              </div>

              <div style={{padding:'30px', overflowY:'auto', background:'#f8fafc'}}>
                <form onSubmit={handleSubmit}>
                  <fieldset disabled={isViewOnly} style={{border:'none', padding:0}}>
                    
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px'}}>
                        <div>
                            <label style={labelStyle}>Título do Projeto *</label>
                            <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required style={{...inputStyle, fontSize:'1.1rem', padding:'12px'}} />
                        </div>
                        <div>
                            <label style={labelStyle}>Código de Projeto</label>
                            <input type="text" value={form.codigo_projeto} onChange={e => setForm({...form, codigo_projeto: e.target.value})} placeholder="Ex: P2026-001" style={inputStyle} />
                        </div>
                    </div>

                    <div style={sectionTitleStyle}>📌 Enquadramento</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                        <div>
                            <label style={labelStyle}>Cliente *</label>
                            <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} required style={inputStyle}>
                                <option value="">-- Selecione --</option>
                                {clientes.map(c => <option key={c.id} value={c.id}>{c.marca}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Tipo de Projeto</label>
                            <select value={form.tipo_projeto_id} onChange={e => setForm({...form, tipo_projeto_id: e.target.value})} style={inputStyle}>
                                <option value="">-- Selecione --</option>
                                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Responsável Interno</label>
                            <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})} style={inputStyle}>
                                <option value="">-- Selecione --</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={sectionTitleStyle}>📅 Planeamento & Avisos</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                        <div><label style={labelStyle}>Data Início</label><input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Data Fim (Deadline)</label><input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} style={{...inputStyle, border: form.data_fim ? '1px solid #fca5a5' : '1px solid #cbd5e1'}} /></div>
                        <div><label style={labelStyle}>Programa</label><input type="text" value={form.programa} onChange={e => setForm({...form, programa: e.target.value})} placeholder="P2030 / PRR" style={inputStyle} /></div>
                        <div><label style={labelStyle}>Aviso</label><input type="text" value={form.aviso} onChange={e => setForm({...form, aviso: e.target.value})} placeholder="Ex: 01/C16" style={inputStyle} /></div>
                    </div>

                    <div style={sectionTitleStyle}>💰 Financeiro</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                        <div><label style={labelStyle}>Investimento (€)</label><input type="number" step="0.01" value={form.investimento} onChange={e => setForm({...form, investimento: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Incentivo (€)</label><input type="number" step="0.01" value={form.incentivo} onChange={e => setForm({...form, incentivo: e.target.value})} style={inputStyle} /></div>
                    </div>

                    <div style={sectionTitleStyle}>⚙️ Estado do Projeto</div>
                    <div style={{display: 'flex', gap: '10px', marginBottom: '25px'}}>
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

                    <div style={sectionTitleStyle}>📝 Notas & Observações</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        <div><label style={labelStyle}>Descrição Geral</label><textarea rows="4" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} style={{...inputStyle, resize:'none'}} /></div>
                        <div><label style={labelStyle}>Observações Internas</label><textarea rows="4" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} style={{...inputStyle, resize:'none'}} /></div>
                    </div>
                  </fieldset>

                  {!isViewOnly && (
                      <div style={{display:'flex', gap:'15px', marginTop:'30px', paddingTop:'20px', borderTop:'1px solid #e2e8f0'}}>
                          <button type="button" onClick={() => setShowModal(false)} style={{flex:1, padding:'14px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', color:'#64748b', fontWeight:'600', cursor:'pointer'}}>Cancelar</button>
                          <button type="submit" style={{flex:2, padding:'14px', borderRadius:'10px', border:'none', background:'#2563eb', color:'white', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 6px -1px rgba(37, 99, 235, 0.4)'}}>{editId ? "💾 Guardar Alterações" : "🚀 Criar Projeto"}</button>
                      </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}
      <style>{`.pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }`}</style>
    </div>
  );
}