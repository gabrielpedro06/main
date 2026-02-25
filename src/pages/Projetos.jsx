import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const addDays = (dateStr, days) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setDate(d.getDate() + (days || 0));
    return d.toISOString().split('T')[0];
};

export default function Projetos() {
  const { user } = useAuth();
  const navigate = useNavigate(); 

  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeLog, setActiveLog] = useState(null); 
  const [notification, setNotification] = useState(null);
  
  // NAVEGAÇÃO E FILTROS
  const [busca, setBusca] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(true); 
  const [selectedCategoria, setSelectedCategoria] = useState(null); 

  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [staff, setStaff] = useState([]); 

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, titulo: '' });

  const initialForm = {
    titulo: "", descricao: "", cliente_id: "", cliente_texto: "", tipo_projeto_id: "",
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
      setTimeout(() => setNotification(null), 3500);
  };

  async function fetchData() {
    setLoading(true);
    const { data: projData, error } = await supabase
      .from("projetos")
      .select(`
          *, 
          clientes ( marca ), 
          tipos_projeto ( nome ), 
          profiles ( nome, email ),
          atividades ( 
              responsavel_id, 
              tarefas ( 
                  responsavel_id, 
                  subtarefas ( responsavel_id ) 
              ) 
          )
      `)
      .order("created_at", { ascending: false });

    if (error) console.error("Erro no fetch:", error);
    else setProjetos(projData || []);

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

  async function handleStartProjeto(e, proj) {
    e.stopPropagation(); 
    if (activeLog) return showToast("Já tens um cronómetro ativo!", "error");
    const { data, error } = await supabase.from("task_logs").insert([{ user_id: user.id, projeto_id: proj.id, start_time: new Date().toISOString() }]).select().single();
    if (!error) { setActiveLog(data); showToast("Cronómetro iniciado! ⏱️"); }
  }

  async function handleStopLog(e) {
    if (e) e.stopPropagation();
    if (!activeLog) return;
    const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000)); 
    await supabase.from("task_logs").update({ end_time: new Date().toISOString(), duration_minutes: diffMins }).eq("id", activeLog.id);
    setActiveLog(null);
    showToast(`Tempo registado: ${diffMins} min.`);
    fetchData();
  }

  async function handleToggleStatus(e, proj) {
    e.stopPropagation();
    const novoEstado = proj.estado === 'concluido' ? 'em_curso' : 'concluido';
    await supabase.from("projetos").update({ estado: novoEstado }).eq("id", proj.id);
    fetchData();
    showToast("Estado atualizado!");
  }

  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
    setForm({ 
        ...initialForm, 
        tipo_projeto_id: (selectedCategoria && selectedCategoria !== 'sem-categoria') ? selectedCategoria : "", 
        data_inicio: new Date().toISOString().split('T')[0] 
    });
    setActiveTab("geral"); 
    setShowModal(true);
  }

  function handleEdit(e, proj) {
    e.stopPropagation();
    setEditId(proj.id); setIsViewOnly(false);
    setForm({
        titulo: proj.titulo || "", descricao: proj.descricao || "", 
        cliente_id: proj.cliente_id || "", cliente_texto: proj.cliente_texto || "",
        tipo_projeto_id: proj.tipo_projeto_id || "", responsavel_id: proj.responsavel_id || "",
        estado: proj.estado || "pendente", data_inicio: proj.data_inicio || "",
        data_fim: proj.data_fim || "", observacoes: proj.observacoes || "",
        programa: proj.programa || "", aviso: proj.aviso || "",
        codigo_projeto: proj.codigo_projeto || "", investimento: proj.investimento || 0, incentivo: proj.incentivo || 0
    });
    setActiveTab("geral");
    setShowModal(true);
  }

  function askDeleteProjeto(e, id, titulo) {
      e.stopPropagation();
      setDeleteConfirm({ show: true, id, titulo });
  }

  async function executeDeleteProjeto() {
      setIsSubmitting(true);
      try {
          const { error } = await supabase.from("projetos").delete().eq("id", deleteConfirm.id);
          if (error) throw error;
          showToast("Projeto apagado com sucesso!");
          setDeleteConfirm({ show: false, id: null, titulo: '' });
          setShowModal(false);
          fetchData();
      } catch (err) { showToast("Erro ao apagar. Pode haver dependências.", "error"); } 
      finally { setIsSubmitting(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { ...form };

    if (payload.cliente_id === "") payload.cliente_id = null;
    if (payload.tipo_projeto_id === "") payload.tipo_projeto_id = null;
    if (payload.responsavel_id === "") payload.responsavel_id = null;
    if (payload.data_fim === "") payload.data_fim = null;

    // Lógica para detetar se é formação no submit (ignorando acentos e maiúsculas)
    const tipoSelecionado = tipos.find(t => String(t.id) === String(payload.tipo_projeto_id));
    const isFormacao = tipoSelecionado?.nome?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('forma');
    
    if (isFormacao) payload.cliente_id = null;
    else payload.cliente_texto = "";
    
    try {
        if (editId) {
            const { error } = await supabase.from("projetos").update(payload).eq("id", editId);
            if (error) throw error;
            showToast("Projeto atualizado!");
            setShowModal(false); 
            fetchData();
        } else {
            const { data: newProj, error: errProj } = await supabase.from("projetos").insert([payload]).select().single();
            if (errProj) throw errProj;

            if (payload.tipo_projeto_id) {
                showToast("A estruturar o projeto...", "info");
                
                let projDateStr = payload.data_inicio || new Date().toISOString().split('T')[0];
                const projEndStr = payload.data_fim || null; 
                
                let currentAtivDate = projDateStr;

                const { data: tAtividades } = await supabase.from("template_atividades").select("*").eq("tipo_projeto_id", payload.tipo_projeto_id).order("ordem", { ascending: true });
                
                if (tAtividades && tAtividades.length > 0) {
                    for (const tAtiv of tAtividades) {
                        const ativStart = currentAtivDate;
                        
                        const ativEnd = (tAtiv.dias_estimados > 0) 
                            ? addDays(ativStart, tAtiv.dias_estimados) 
                            : (projEndStr || ativStart);

                        const { data: realAtiv } = await supabase.from("atividades").insert([{ 
                            projeto_id: newProj.id, titulo: tAtiv.nome, estado: 'pendente', ordem: tAtiv.ordem,
                            data_inicio: ativStart, data_fim: ativEnd, responsavel_id: payload.responsavel_id || null
                        }]).select().single();

                        currentAtivDate = addDays(currentAtivDate, tAtiv.dias_estimados || 0);

                        if (realAtiv) {
                            const { data: tTarefas } = await supabase.from("template_tarefas").select("*").eq("template_atividade_id", tAtiv.id).order("ordem", { ascending: true });
                            if (tTarefas && tTarefas.length > 0) {
                                let currentTarDate = ativStart;
                                
                                for (const tTar of tTarefas) {
                                    const tarStart = currentTarDate;
                                    
                                    const tarEnd = (tTar.dias_estimados > 0) 
                                        ? addDays(tarStart, tTar.dias_estimados) 
                                        : (projEndStr || tarStart);

                                    const { data: realTar } = await supabase.from("tarefas").insert([{ 
                                        atividade_id: realAtiv.id, titulo: tTar.nome, estado: 'pendente', responsavel_id: payload.responsavel_id || null,
                                        ordem: tTar.ordem, data_inicio: tarStart, data_fim: tarEnd 
                                    }]).select().single();

                                    currentTarDate = addDays(currentTarDate, tTar.dias_estimados || 0);
                                    
                                    if (realTar) {
                                        const { data: tSubs } = await supabase.from("template_subtarefas").select("*").eq("template_tarefa_id", tTar.id).order("ordem", { ascending: true });
                                        if (tSubs && tSubs.length > 0) {
                                            let currentSubDate = tarStart;
                                            
                                            const subTarefasParaInserir = tSubs.map(ts => {
                                                const subEnd = (ts.dias_estimados > 0) 
                                                    ? addDays(currentSubDate, ts.dias_estimados) 
                                                    : (projEndStr || currentSubDate);
                                                    
                                                currentSubDate = addDays(currentSubDate, ts.dias_estimados || 0); 
                                                
                                                return { 
                                                    tarefa_id: realTar.id, titulo: ts.nome, estado: 'pendente',
                                                    ordem: ts.ordem, data_fim: subEnd, responsavel_id: payload.responsavel_id || null
                                                };
                                            });
                                            await supabase.from("subtarefas").insert(subTarefasParaInserir);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (!payload.data_fim) await supabase.from("projetos").update({ data_fim: currentAtivDate }).eq("id", newProj.id);
                }
            }
            showToast("Projeto gerado com sucesso! 🎉");
            setShowModal(false); 
            navigate(`/dashboard/projetos/${newProj.id}`);
        }
    } catch (err) { showToast("Erro: " + err.message, "error"); } 
    finally { setIsSubmitting(false); }
  }

  const checkUserInvolvement = (p) => {
      if (!showOnlyMine) return true; 
      if (p.responsavel_id === user.id) return true; 
      if (p.atividades && p.atividades.some(a => {
          if (a.responsavel_id === user.id) return true;
          if (a.tarefas && a.tarefas.some(t => {
              if (t.responsavel_id === user.id) return true;
              if (t.subtarefas && t.subtarefas.some(s => s.responsavel_id === user.id)) return true;
              return false;
          })) return true;
          return false;
      })) return true;

      return false; 
  };

  const projetosFiltrados = projetos.filter(p => {
    if (!checkUserInvolvement(p)) return false;

    const termo = busca.toLowerCase();
    const matchBusca = p.titulo?.toLowerCase().includes(termo) || p.clientes?.marca?.toLowerCase().includes(termo) || p.codigo_projeto?.toLowerCase().includes(termo);
    if (!matchBusca) return false;

    const isInactive = p.estado === 'concluido' || p.estado === 'cancelado';
    if (!mostrarConcluidos && isInactive) return false;
    
    if (selectedCategoria) {
        if (selectedCategoria === 'sem-categoria' && p.tipo_projeto_id) return false;
        if (selectedCategoria !== 'sem-categoria' && p.tipo_projeto_id !== selectedCategoria) return false;
    }

    return true;
  });

  const countsPerCategory = {};
  projetos.forEach(p => {
      if (!checkUserInvolvement(p)) return;
      const termo = busca.toLowerCase();
      if (!(p.titulo?.toLowerCase().includes(termo) || p.clientes?.marca?.toLowerCase().includes(termo) || p.codigo_projeto?.toLowerCase().includes(termo))) return;
      if (!mostrarConcluidos && (p.estado === 'concluido' || p.estado === 'cancelado')) return;

      const catId = p.tipo_projeto_id || 'sem-categoria';
      countsPerCategory[catId] = (countsPerCategory[catId] || 0) + 1;
  });

  const renderDeadline = (dateString, estado) => {
    if (!dateString) return <span style={{fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 'bold'}}>Sem prazo</span>;
    const deadline = new Date(dateString); deadline.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    let color = '#64748b'; let bg = '#f1f5f9'; let text = `⏳ ${new Date(dateString).toLocaleDateString('pt-PT')}`;
    if (estado === 'concluido') { color = '#94a3b8'; bg = 'transparent'; text = `✔️ Concluído`; } 
    else if (diffDays < 0) { color = '#ef4444'; bg = '#fee2e2'; text = `🔴 Atrasado (${Math.abs(diffDays)}d)`; } 
    else if (diffDays === 0) { color = '#d97706'; bg = '#fef3c7'; text = `⚠️ Termina Hoje!`; } 
    else if (diffDays <= 5) { color = '#ea580c'; bg = '#ffedd5'; text = `⏳ Em ${diffDays} dias`; }

    return <span style={{background: bg, color: color, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold'}}>{text}</span>;
  };

  const projectColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9', '#6366f1'];
  const getColorForCategory = (id) => {
      if (!id) return '#94a3b8'; 
      const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return projectColors[hash % projectColors.length];
  };

  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };

  // 💡 LÓGICA DE UI EM TEMPO REAL: Verifica se a categoria selecionada AGORA na dropdown é formação
  const tipoSelecionadoUI = tipos.find(t => String(t.id) === String(form.tipo_projeto_id));
  const isFormacaoSelected = tipoSelecionadoUI?.nome?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('forma');

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1400px', margin: '0 auto', padding: '15px'}}>
      
      <div style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '15px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Portfólio</h1>
            
            <div style={{display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0'}}>
                <button 
                    onClick={() => setShowOnlyMine(true)} 
                    style={{padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: showOnlyMine ? 'white' : 'transparent', color: showOnlyMine ? '#2563eb' : '#64748b', boxShadow: showOnlyMine ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}
                >
                    👤 Os Meus
                </button>
                <button 
                    onClick={() => setShowOnlyMine(false)} 
                    style={{padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', background: !showOnlyMine ? 'white' : 'transparent', color: !showOnlyMine ? '#2563eb' : '#64748b', boxShadow: !showOnlyMine ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}
                >
                    🌍 Empresa
                </button>
            </div>
        </div>

        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            {activeLog?.projeto_id && (
                <div style={{background:'#fee2e2', color:'#ef4444', padding:'6px 12px', borderRadius:'8px', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'8px', fontWeight: 'bold'}}>
                <span style={{width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite'}}></span> Em curso... 
                <button onClick={handleStopLog} style={{background:'white', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'4px', padding:'2px 6px', cursor:'pointer', fontWeight:'bold', fontSize:'0.7rem'}}>⏹ PARAR</button>
                </div>
            )}
            <button className="btn-glow" onClick={handleNovo}>+ Novo Projeto</button>
        </div>
      </div>

      <div style={{background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center'}}>
        <div style={{flex: 1, position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '0.85rem'}}>🔍</span>
            <input type="text" placeholder="Procurar projeto, código ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={{width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box'}} />
        </div>
        <label style={{display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'0.85rem', color: '#475569', fontWeight: 'bold'}}>
          <input type="checkbox" checked={mostrarConcluidos} onChange={e => setMostrarConcluidos(e.target.checked)} style={{width:'16px', height:'16px', accentColor: '#10b981'}} /> Mostrar Arquivados
        </label>
      </div>

      {!selectedCategoria && (
          <div className="fade-in">
              <h2 style={{fontSize: '1.2rem', color: '#475569', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>🗂️ Áreas de Projeto</h2>
              
              <div className="category-grid">
                  {tipos.map(t => {
                      const count = countsPerCategory[t.id] || 0;
                      const color = getColorForCategory(t.id);
                      if (count === 0 && !busca && !mostrarConcluidos) return null; 

                      return (
                          <div 
                              key={t.id} 
                              onClick={() => setSelectedCategoria(t.id)}
                              className="category-card"
                              style={{ borderTop: `5px solid ${color}` }}
                          >
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>{t.nome}</h3>
                                  <span style={{background: `${color}20`, color: color, padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem'}}>{count}</span>
                              </div>
                              <p style={{margin: '15px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600'}}>Abrir portfólio ➔</p>
                          </div>
                      );
                  })}

                  {(countsPerCategory['sem-categoria'] > 0) && (
                      <div 
                          onClick={() => setSelectedCategoria('sem-categoria')}
                          className="category-card"
                          style={{ borderTop: `5px solid #94a3b8` }}
                      >
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem'}}>Projetos Avulsos</h3>
                              <span style={{background: `#f1f5f9`, color: '#64748b', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem'}}>{countsPerCategory['sem-categoria']}</span>
                          </div>
                          <p style={{margin: '15px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600'}}>Ver projetos sem modelo ➔</p>
                      </div>
                  )}
              </div>
              
              {Object.keys(countsPerCategory).length === 0 && (
                  <div style={{textAlign: 'center', padding: '50px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                      <span style={{fontSize: '3rem', display: 'block', marginBottom: '10px'}}>🏜️</span>
                      <h3 style={{color: '#1e293b', margin: '0 0 5px 0'}}>Nenhum projeto encontrado.</h3>
                      <p style={{color: '#64748b', margin: 0}}>Clica em "+ Novo Projeto" para começar a trabalhar.</p>
                  </div>
              )}
          </div>
      )}

      {selectedCategoria && (
          <div className="fade-in">
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px'}}>
                  <button 
                      onClick={() => setSelectedCategoria(null)}
                      style={{background: 'white', border: '1px solid #cbd5e1', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s'}}
                      className="hover-shadow"
                  >
                      ◀ Voltar às Áreas
                  </button>
                  <h2 style={{margin: 0, fontSize: '1.4rem', color: '#1e293b', fontWeight: '800'}}>
                      {selectedCategoria === 'sem-categoria' ? 'Projetos Avulsos' : tipos.find(t => t.id === selectedCategoria)?.nome}
                  </h2>
              </div>

              <div className="project-grid">
                  {projetosFiltrados.length > 0 ? projetosFiltrados.map(p => {
                      const isCompleted = p.estado === 'concluido';
                      const isTimerActive = activeLog?.projeto_id === p.id;
                      const catColor = getColorForCategory(p.tipo_projeto_id);

                      const clientDisplay = p.cliente_texto ? `📝 ${p.cliente_texto}` : `🏢 ${p.clientes?.marca || 'Sem Cliente'}`;

                      return (
                          <div 
                              key={p.id} 
                              onClick={() => navigate(`/dashboard/projetos/${p.id}`)}
                              className="project-card"
                              style={{
                                  background: 'white', borderRadius: '16px', border: isTimerActive ? '2px solid #3b82f6' : '1px solid #e2e8f0', 
                                  boxShadow: isTimerActive ? '0 10px 15px -3px rgba(59, 130, 246, 0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)', 
                                  padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'pointer', transition: 'all 0.2s',
                                  opacity: isCompleted ? 0.6 : 1, position: 'relative', overflow: 'hidden'
                              }}
                          >
                              <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: isCompleted ? '#cbd5e1' : catColor}}></div>

                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '5px'}}>
                                      {p.codigo_projeto && <span style={{fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '12px', fontWeight: '800', border: '1px solid #bfdbfe'}}>{p.codigo_projeto}</span>}
                                      <span style={{fontSize: '0.65rem', background: isCompleted ? '#f1f5f9' : '#fefce8', color: isCompleted ? '#64748b' : '#ca8a04', padding: '2px 8px', borderRadius: '12px', fontWeight: '800', border: isCompleted ? '1px solid #e2e8f0' : '1px solid #fef08a', textTransform: 'uppercase'}}>{p.estado.replace('_', ' ')}</span>
                                  </div>
                                  
                                  {!isCompleted && (
                                      <button 
                                          onClick={(e) => isTimerActive ? handleStopLog(e) : handleStartProjeto(e, p)} 
                                          style={{ background: isTimerActive ? '#fee2e2' : '#f1f5f9', color: isTimerActive ? '#ef4444' : '#64748b', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', fontSize: '1rem' }}
                                          title={isTimerActive ? "Parar Timer" : "Iniciar Timer"}
                                          className={!isTimerActive ? "hover-blue-btn" : ""}
                                      >
                                          {isTimerActive ? '⏹' : '▶'}
                                      </button>
                                  )}
                              </div>

                              <div>
                                  <h2 style={{margin: '0 0 5px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', lineHeight: '1.2'}}>{p.titulo}</h2>
                                  <div style={{fontSize: '0.85rem', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                      {clientDisplay}
                                  </div>
                              </div>

                              <div style={{background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9'}}>
                                  <div style={{fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px'}}>Responsável Global</div>
                                  <div style={{fontSize: '0.8rem', color: '#334155', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.profiles?.nome || '-'}</div>
                              </div>

                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9'}}>
                                  {renderDeadline(p.data_fim, p.estado)}
                                  <div style={{display: 'flex', gap: '8px'}}>
                                      <button onClick={(e) => handleEdit(e, p)} style={{background: 'transparent', border: '1px solid #cbd5e1', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: '0.2s'}} className="hover-orange-btn" title="Editar Detalhes">✎</button>
                                      <button onClick={(e) => askDeleteProjeto(e, p.id, p.titulo)} style={{background: 'transparent', border: '1px solid #cbd5e1', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: '0.2s'}} className="hover-red-btn" title="Apagar">🗑️</button>
                                  </div>
                              </div>
                          </div>
                      );
                  }) : (
                      <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                          <span style={{fontSize: '3rem', display: 'block', marginBottom: '10px'}}>🏜️</span>
                          <h3 style={{color: '#1e293b', margin: '0 0 5px 0'}}>Vazio por aqui.</h3>
                          <p style={{color: '#64748b', margin: 0}}>Não há projetos ativos aqui.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {deleteConfirm.show && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(3px)'}} onClick={() => setDeleteConfirm({show:false, id:null, titulo:''})}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}} onClick={e => e.stopPropagation()}>
                      <div style={{fontSize: '3rem', marginBottom: '10px'}}>⚠️</div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.2rem'}}>Apagar Projeto?</h3>
                      <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '25px'}}>
                          Tens a certeza que queres apagar o projeto <strong>"{deleteConfirm.titulo}"</strong>? Esta ação apagará todas as tarefas e tempos irreversivelmente.
                      </p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setDeleteConfirm({show:false, id:null, titulo:''})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer'}}>Cancelar</button>
                          <button onClick={executeDeleteProjeto} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer'}} disabled={isSubmitting}>{isSubmitting ? 'A apagar...' : 'Sim, Apagar'}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

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

              <div className="tabs" style={{padding: '0 30px', background: '#fff', borderBottom: '1px solid #e2e8f0'}}>
                <button className={activeTab === 'geral' ? 'active' : ''} onClick={() => setActiveTab('geral')}>🚀 Geral</button>
                <button className={activeTab === 'investimento' ? 'active' : ''} onClick={() => setActiveTab('investimento')}>💰 Investimento</button>
                <button className={activeTab === 'notas' ? 'active' : ''} onClick={() => setActiveTab('notas')}>📝 Notas</button>
              </div>

              <div style={{padding:'30px', overflowY:'auto', background:'#f8fafc'}}>
                <form onSubmit={handleSubmit}>
                  <fieldset disabled={isViewOnly} style={{border:'none', padding:0}}>
                    
                    {activeTab === 'geral' && (
                      <div>
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
                            
                            {isFormacaoSelected ? (
                                <div>
                                    <label style={labelStyle}>Cliente / Local (Livre) *</label>
                                    <input type="text" value={form.cliente_texto || ''} onChange={e => setForm({...form, cliente_texto: e.target.value})} placeholder="Ex: Cenfim Faro..." required style={inputStyle} />
                                </div>
                            ) : (
                                <div>
                                    <label style={labelStyle}>Cliente *</label>
                                    <select value={form.cliente_id || ''} onChange={e => setForm({...form, cliente_id: e.target.value})} required style={inputStyle}>
                                        <option value="">-- Selecione --</option>
                                        {clientes.map(c => <option key={c.id} value={c.id}>{c.marca}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label style={labelStyle}>Tipo de Projeto (Modelo)</label>
                                <select value={form.tipo_projeto_id || ''} onChange={e => setForm({...form, tipo_projeto_id: e.target.value})} style={inputStyle} disabled={!!editId}>
                                    <option value="">-- Em Branco --</option>
                                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Responsável Geral</label>
                                <select value={form.responsavel_id || ''} onChange={e => setForm({...form, responsavel_id: e.target.value})} style={inputStyle}>
                                    <option value="">-- Selecione --</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={sectionTitleStyle}>📅 Planeamento & Avisos</div>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                            <div><label style={labelStyle}>Data Início Base</label><input type="date" value={form.data_inicio || ''} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} required /></div>
                            <div><label style={labelStyle}>Data Fim Final</label><input type="date" value={form.data_fim || ''} onChange={e => setForm({...form, data_fim: e.target.value})} style={{...inputStyle, border: form.data_fim ? '1px solid #fca5a5' : '1px solid #cbd5e1'}} /></div>
                            <div><label style={labelStyle}>Programa</label><input type="text" value={form.programa || ''} onChange={e => setForm({...form, programa: e.target.value})} placeholder="P2030 / PRR" style={inputStyle} /></div>
                            <div><label style={labelStyle}>Aviso</label><input type="text" value={form.aviso || ''} onChange={e => setForm({...form, aviso: e.target.value})} placeholder="Ex: 01/C16" style={inputStyle} /></div>
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
                      </div>
                    )}

                    {activeTab === 'investimento' && (
                      <div style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #cbd5e1'}}>
                        <h4 style={{marginTop:0, marginBottom:'20px', color:'#1e293b'}}>Valores Aprovados</h4>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                            <div>
                                <label style={labelStyle}>Investimento Elegível (€)</label>
                                <input type="number" step="0.01" value={form.investimento} onChange={e => setForm({...form, investimento: e.target.value})} style={{...inputStyle, fontSize:'1.2rem', padding:'15px', borderColor:'#2563eb'}} />
                            </div>
                            <div>
                                <label style={labelStyle}>Incentivo Atribuído (€)</label>
                                <input type="number" step="0.01" value={form.incentivo} onChange={e => setForm({...form, incentivo: e.target.value})} style={{...inputStyle, fontSize:'1.2rem', padding:'15px', borderColor:'#10b981'}} />
                            </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'notas' && (
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                          <div>
                              <label style={labelStyle}>Descrição Geral</label>
                              <textarea rows="8" value={form.descricao || ''} onChange={e => setForm({...form, descricao: e.target.value})} style={{...inputStyle, resize:'none'}} placeholder="Resumo do projeto..." />
                          </div>
                          <div>
                              <label style={labelStyle}>Observações Internas</label>
                              <textarea rows="8" value={form.observacoes || ''} onChange={e => setForm({...form, observacoes: e.target.value})} style={{...inputStyle, resize:'none', background:'#fffbeb', borderColor:'#f59e0b'}} placeholder="Notas importantes..." />
                          </div>
                      </div>
                    )}

                  </fieldset>

                  {!isViewOnly && (
                      <div style={{display:'flex', gap:'15px', marginTop:'30px', paddingTop:'20px', borderTop:'1px solid #e2e8f0', justifyContent: 'flex-end'}}>
                          <button type="button" onClick={() => setShowModal(false)} style={{padding:'14px 20px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', color:'#64748b', fontWeight:'600', cursor:'pointer'}}>Cancelar</button>
                          <button type="submit" disabled={isSubmitting} style={{padding:'14px 30px', borderRadius:'10px', border:'none', background:'#2563eb', color:'white', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 6px -1px rgba(37, 99, 235, 0.4)'}}>
                              {isSubmitting ? "A guardar..." : (editId ? "💾 Guardar Alterações" : "🚀 Criar Projeto")}
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
          .fade-in { animation: fadeIn 0.4s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          .category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
          .category-card {
              background: white; padding: 25px; border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;
              cursor: pointer; transition: all 0.2s ease;
          }
          .category-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #cbd5e1; }

          .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
          .project-card:hover { transform: translateY(-4px); border-color: #cbd5e1 !important; box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important; }

          .hover-shadow:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateY(-1px); }

          .hover-blue-btn:hover { background: #dbeafe !important; color: #2563eb !important; border-color: #bfdbfe !important; }
          .hover-orange-btn:hover { background: #ffedd5 !important; color: #ea580c !important; border-color: #fed7aa !important; }
          .hover-red-btn:hover { background: #fee2e2 !important; color: #ef4444 !important; border-color: #fecaca !important; }

          .btn-glow {
              position: relative; overflow: hidden; background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px;
              font-weight: bold; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;
          }
          .btn-glow::after {
              content: ''; position: absolute; top: 0; left: -150%; width: 50%; height: 100%;
              background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
              transform: skewX(-25deg); transition: left 0.7s ease-in-out;
          }
          .btn-glow:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3); }
          .btn-glow:hover::after { animation: shine-sweep 1.2s infinite alternate ease-in-out; }
          @keyframes shine-sweep { 0% { left: -150%; } 100% { left: 200%; } }
          
          @keyframes pulse { 0% {box-shadow:0 0 0 0 rgba(239,68,68,0.7)} 70% {box-shadow:0 0 0 6px rgba(239,68,68,0)} 100% {box-shadow:0 0 0 0 rgba(239,68,68,0)}} 
          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  );
}