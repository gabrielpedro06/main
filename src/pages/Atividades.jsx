import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  ClipboardList: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>,
  Play: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Stop: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Calendar: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Folder: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Settings: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  FileText: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Save: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

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
        showToast("Cronómetro iniciado!");
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
        showToast(novoEstado === 'concluido' ? "Atividade concluída!" : "Atividade reaberta.");
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

  const sectionTitleStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box' };

  return (
    <div className="page-container">
      
      {/* HEADER */}
      <div className="card" style={{ marginBottom: 20, padding: '25px', display: "flex", justifyContent: "space-between", alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{background: '#eff6ff', color: '#2563eb', padding: '10px', borderRadius: '10px', display: 'flex'}}><Icons.ClipboardList /></div>
            <div>
                <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Atividades</h1>
                <p style={{color: '#64748b', margin: 0, fontWeight: '500', fontSize: '0.9rem'}}>Gestão de blocos de trabalho</p>
            </div>
            
            {activeLog && (
                <div style={{ background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)', marginLeft: '15px' }}>
                    <span className="pulse-dot-white"></span> A contar...
                    <button onClick={handleStopLog} style={{background: 'white', color:'#2563eb', border:'none', borderRadius:'5px', padding:'4px 8px', cursor:'pointer', fontWeight:'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <Icons.Stop size={12} /> Parar
                    </button>
                </div>
            )}
        </div>
        <button className="btn-primary hover-shadow" onClick={handleNovo} style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'}}>
            <Icons.Plus /> Nova Atividade
        </button>
      </div>

      <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
        
        {/* FILTROS */}
        <div style={{ display: "flex", flexWrap: 'wrap', gap: 15, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
            <div style={{flex: 1, minWidth: '250px', position: 'relative'}}>
                <span style={{position: 'absolute', left: '12px', top: '12px', color: '#94a3b8'}}><Icons.Search /></span>
                <input type="text" placeholder="Procurar atividade ou projeto..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{...inputStyle, width: '100%', paddingLeft: '38px'}} />
            </div>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                <input type="checkbox" checked={mostrarConcluidos} onChange={(e) => setMostrarConcluidos(e.target.checked)} style={{accentColor:'#1e293b', width:'14px', height:'14px'}} /> Mostrar Arquivados
            </label>
        </div>

        {/* TABELA */}
        <div className="table-responsive" style={{overflowX: 'auto'}}>
            <table className="data-table" style={{ width: "100%", borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
                <tr style={{color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '2px solid #f1f5f9'}}>
                <th style={{padding: '15px', width: '90px', textAlign: 'center'}}>Timer</th>
                <th style={{padding: '15px', textAlign: 'left'}}>Atividade</th>
                <th style={{padding: '15px', textAlign: 'left', width: '140px'}}>Prazo</th>
                <th style={{padding: '15px', textAlign: 'left'}}>Projeto Pai</th>
                <th style={{padding: '15px', textAlign: 'left'}}>Responsável</th>
                <th style={{padding: '15px', textAlign: 'right'}}>Ações</th>
                </tr>
            </thead>
            <tbody>
                {atividadesFiltradas.length > 0 ? (
                    atividadesFiltradas.map((a) => {
                        const isRunning = activeLog?.atividade_id === a.id;
                        const isCompleted = a.estado === 'concluido';
                        const isExpired = a.data_fim && new Date(a.data_fim) < new Date() && !isCompleted;

                        return (
                            <tr key={a.id} style={{ borderBottom: '1px solid #f8fafc', background: isRunning ? '#eff6ff' : (isCompleted ? '#f8fafc' : 'white'), opacity: isCompleted ? 0.6 : 1, transition: '0.2s' }} className={!isCompleted && !isRunning ? "table-row-hover" : ""}>
                                <td style={{padding: '15px', textAlign: 'center'}}>
                                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
                                        {isRunning ? (
                                            <button onClick={handleStopLog} title="Parar Timer" style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'50%', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'}}>
                                                <Icons.Stop size={14} />
                                            </button>
                                        ) : (
                                            <button onClick={() => handleStartAtividade(a)} disabled={isCompleted} title="Iniciar Timer" style={{border:'none', background: isCompleted ? '#f1f5f9' : '#dbeafe', color: isCompleted ? '#cbd5e1' : '#2563eb', borderRadius:'50%', width:'32px', height:'32px', cursor: isCompleted ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition: '0.2s'}} className={!isCompleted ? "hover-shadow" : ""}>
                                                <Icons.Play size={14} />
                                            </button>
                                        )}
                                        <label className="switch" title={isCompleted ? "Reabrir" : "Marcar como Concluído"}>
                                            <input type="checkbox" checked={isCompleted} onChange={() => handleToggleStatus(a)} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                </td>
                                
                                <td style={{padding: '15px', fontWeight: "bold", color: isRunning ? "#2563eb" : "#1e293b", fontSize: '0.95rem'}}>
                                    <span style={{textDecoration: isCompleted ? 'line-through' : 'none'}}>{a.titulo}</span>
                                    {a.investimento > 0 && <div style={{fontSize: '0.75rem', fontWeight:'600', color: '#64748b', marginTop: '4px'}}>Orçamento: {a.investimento}€</div>}
                                </td>

                                <td style={{padding: '15px'}}>
                                    {a.data_fim ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px', 
                                            color: isExpired ? '#dc2626' : '#475569',
                                            fontWeight: isExpired ? '700' : '600',
                                            fontSize: '0.8rem',
                                            background: isExpired ? '#fef2f2' : '#f1f5f9',
                                            padding: '4px 8px', borderRadius: '6px', width: 'fit-content',
                                            border: isExpired ? '1px solid #fecaca' : '1px solid transparent'
                                        }}>
                                            <Icons.Calendar /> {new Date(a.data_fim).toLocaleDateString('pt-PT')}
                                        </div>
                                    ) : (
                                        <span style={{color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 'bold'}}>- - -</span>
                                    )}
                                </td>

                                <td style={{padding: '15px'}}>
                                    <div style={{fontWeight: '700', color: '#334155', fontSize: '0.9rem'}}>{a.projetos?.titulo || "Sem Projeto"}</div>
                                    {a.projetos?.codigo_projeto && <div style={{fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '4px'}}>{a.projetos.codigo_projeto}</div>}
                                </td>
                                
                                <td style={{padding: '15px', color: '#475569', fontSize: '0.9rem', fontWeight: '500'}}>
                                    {a.profiles?.nome || a.profiles?.email || <span style={{color: '#cbd5e1'}}>-</span>}
                                </td>
                                
                                <td style={{padding: '15px', textAlign: 'right'}}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleView(a)} title="Ver Detalhes" style={{background: 'white', border: '1px solid #cbd5e1', color: '#475569', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">
                                            <Icons.Eye />
                                        </button>
                                        <button onClick={() => handleEdit(a)} title="Editar" className="action-btn hover-orange-text" style={{background: 'transparent', border: 'none', color: '#475569', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', opacity: 0.6}}>
                                            <Icons.Edit />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })
                ) : (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '60px', color: '#94a3b8'}}>
                        <span style={{display: 'block', marginBottom: '10px', opacity: 0.5}}><Icons.Search /></span>
                        <p style={{margin: 0, fontWeight: '500'}}>Nenhuma atividade encontrada com estes filtros.</p>    
                    </td></tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* --- MODAL FORMULÁRIO --- */}
      {showModal && (
        <ModalPortal>
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={() => setShowModal(false)}>
            <div style={{background:'#fff', width:'95%', maxWidth:'750px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'92vh', animation: 'fadeIn 0.2s ease-out'}} onClick={e => e.stopPropagation()}>
              
              <div style={{padding:'20px 25px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex'}}><Icons.ClipboardList /></span>
                    <h3 style={{margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '800'}}>
                        {isViewOnly ? "Ver Atividade" : (editId ? "Editar Atividade" : "Nova Atividade")}
                    </h3>
                </div>
                <button onClick={() => setShowModal(false)} style={{background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}} className="hover-red-text"><Icons.Close /></button>
              </div>

              <div style={{padding: '25px', overflowY: 'auto', background: 'white'}}>
                <form onSubmit={handleSubmit}>
                  <fieldset disabled={isViewOnly} style={{border:'none', padding:0, margin:0}}>
                    
                    <div style={{marginBottom: '25px'}}>
                        <label style={labelStyle}>Título da Atividade *</label>
                        <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required style={{...inputStyle, fontSize: '1.1rem', padding: '12px', fontWeight: 'bold'}} className="input-focus" placeholder="Ex: Preparar Documentação..." />
                    </div>

                    <div style={sectionTitleStyle}><Icons.Folder /> Projeto & Responsável</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '10px'}}>
                        <div>
                            <label style={labelStyle}>Projeto Pai *</label>
                            <select value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})} required style={{...inputStyle, cursor: 'pointer'}} className="input-focus">
                                <option value="">-- Selecione o Projeto --</option>
                                {projetos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Responsável</label>
                            <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})} style={{...inputStyle, cursor: 'pointer'}} className="input-focus">
                                <option value="">-- Ninguém (Atribuir Depois) --</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={sectionTitleStyle}><Icons.Calendar /> Planeamento & Financeiro</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '10px'}}>
                        <div><label style={labelStyle}>Data Início</label><input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} className="input-focus" /></div>
                        <div><label style={labelStyle}>Prazo (Fim)</label><input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} style={{...inputStyle, border: form.data_fim ? '1px solid #fca5a5' : '1px solid #cbd5e1'}} className="input-focus" /></div>
                        <div><label style={labelStyle}>Orçamento (€)</label><input type="number" step="0.01" value={form.investimento} onChange={e => setForm({...form, investimento: e.target.value})} style={inputStyle} className="input-focus" /></div>
                        <div><label style={labelStyle}>Incentivo (€)</label><input type="number" step="0.01" value={form.incentivo} onChange={e => setForm({...form, incentivo: e.target.value})} style={inputStyle} className="input-focus" /></div>
                    </div>

                    <div style={sectionTitleStyle}><Icons.Settings /> Estado Atual</div>
                    <div style={{display: 'flex', gap: '10px', marginBottom: '25px'}}>
                        {[
                            {val: 'pendente', label: 'Pendente'}, 
                            {val: 'em_curso', label: 'Em Curso'}, 
                            {val: 'concluido', label: 'Concluído'}, 
                            {val: 'cancelado', label: 'Cancelado'}
                        ].map(st => (
                            <div key={st.val} onClick={() => !isViewOnly && setForm({...form, estado: st.val})}
                                style={{
                                    flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px', cursor: isViewOnly ? 'default' : 'pointer',
                                    fontSize: '0.8rem', fontWeight: '700',
                                    background: form.estado === st.val ? '#2563eb' : '#f8fafc',
                                    color: form.estado === st.val ? 'white' : '#64748b',
                                    border: form.estado === st.val ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                    transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
                                }}
                            >
                                {st.label}
                            </div>
                        ))}
                    </div>

                    <div style={sectionTitleStyle}><Icons.FileText /> Notas</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        <div>
                            <label style={labelStyle}>Descrição / Procedimento</label>
                            <textarea rows="4" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Instruções para realizar a atividade..." style={{...inputStyle, resize: 'vertical'}} className="input-focus" />
                        </div>
                        <div>
                            <label style={labelStyle}>Observações</label>
                            <textarea rows="4" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} placeholder="Notas adicionais..." style={{...inputStyle, resize: 'vertical', background: '#fffbeb', borderColor: '#fde68a'}} className="input-focus" />
                        </div>
                    </div>
                  </fieldset>

                  {!isViewOnly && (
                      <div style={{display:'flex', gap:'10px', marginTop:'30px', paddingTop:'20px', borderTop:'1px solid #f1f5f9', justifyContent: 'flex-end'}}>
                          <button type="button" onClick={() => setShowModal(false)} style={{padding:'12px 20px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', color:'#64748b', fontWeight:'700', cursor:'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                          <button type="submit" style={{padding:'12px 30px', borderRadius:'8px', border:'none', background:'#2563eb', color:'white', fontWeight:'700', cursor:'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s'}} className="hover-shadow">
                              {editId ? <><Icons.Save /> Guardar Alterações</> : <><Icons.Plus /> Criar Atividade</>}
                          </button>
                      </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      
      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .hover-orange-text:hover { color: #f97316 !important; opacity: 1 !important; }
        .hover-red-text:hover { color: #ef4444 !important; opacity: 1 !important; }
        .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 70% { transform: scale(1); opacity: 0; } 100% { transform: scale(0.95); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}