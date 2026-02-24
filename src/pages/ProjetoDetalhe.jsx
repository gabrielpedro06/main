import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

const ModalPortal = ({ children }) => createPortal(children, document.body);

export default function ProjetoDetalhe() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [projeto, setProjeto] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("atividades");
  const [notification, setNotification] = useState(null);
  
  const [activeLog, setActiveLog] = useState(null);

  // Estados UI - Visão Geral
  const [isEditingGeral, setIsEditingGeral] = useState(false);
  const [formGeral, setFormGeral] = useState({});
  const [clientes, setClientes] = useState([]);
  const [staff, setStaff] = useState([]);

  const [expandedTasks, setExpandedTasks] = useState({});
  const [novaAtividadeNome, setNovaAtividadeNome] = useState("");
  const [novaTarefaNome, setNovaTarefaNome] = useState({ ativId: null, nome: "" });
  const [novaSubtarefaNome, setNovaSubtarefaNome] = useState({ tarId: null, nome: "" });

  // MODAIS
  const [atividadeModal, setAtividadeModal] = useState({ show: false, data: null });
  const [tarefaModal, setTarefaModal] = useState({ show: false, data: null, atividadeNome: '' });
  const [subtarefaModal, setSubtarefaModal] = useState({ show: false, data: null, tarefaNome: '' }); 

  useEffect(() => {
    fetchProjetoDetails();
    checkActiveLog();
  }, [id, user]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  async function checkActiveLog() {
      if(!user?.id) return;
      const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
      setActiveLog(data || null);
  }

  async function fetchProjetoDetails() {
    setLoading(true);
    
    const { data: projData } = await supabase.from("projetos").select("*, clientes(marca), tipos_projeto(nome), profiles(nome)").eq("id", id).single();
    if (projData) { setProjeto(projData); setFormGeral(projData); }

    const { data: cliData } = await supabase.from("clientes").select("id, marca").order("marca");
    setClientes(cliData || []);
    
    const { data: staffData } = await supabase.from("profiles").select("id, nome").order("nome");
    setStaff(staffData || []);

    const { data: ativData, error: ativError } = await supabase
        .from("atividades")
        .select(`
            id, titulo, estado, responsavel_id, data_inicio, data_fim, investimento, incentivo, descricao, observacoes, created_at, ordem,
            tarefas(id, titulo, estado, responsavel_id, data_inicio, data_fim, prioridade, descricao, created_at, ordem,
                subtarefas(id, titulo, estado, data_fim, created_at, ordem)
            )
        `)
        .eq("projeto_id", id)
        .order("ordem", { ascending: true }) 
        .order("created_at", { ascending: true });

    if (ativError) {
        console.error("Erro no fetch:", ativError);
        showToast("Erro ao carregar atividades.", "error");
    } else if (ativData) {
        const sortedData = ativData.map(a => ({
            ...a,
            tarefas: (a.tarefas || []).sort((t1, t2) => {
                if (t1.ordem != null && t2.ordem != null && t1.ordem !== t2.ordem) return t1.ordem - t2.ordem;
                const d1 = new Date(t1.created_at).getTime();
                const d2 = new Date(t2.created_at).getTime();
                if (d1 !== d2) return d1 - d2;
                return t1.id.localeCompare(t2.id);
            }).map(t => ({
                ...t,
                subtarefas: (t.subtarefas || []).sort((s1, s2) => {
                    if (s1.ordem != null && s2.ordem != null && s1.ordem !== s2.ordem) return s1.ordem - s2.ordem;
                    const d1 = new Date(s1.created_at).getTime();
                    const d2 = new Date(s2.created_at).getTime();
                    if (d1 !== d2) return d1 - d2;
                    return s1.id.localeCompare(s2.id);
                })
            }))
        }));
        setAtividades(sortedData);
    }

    const { data: logsData } = await supabase.from("task_logs").select("*").eq("projeto_id", id);
    if (logsData) setLogs(logsData);
    
    setLoading(false);
  }

  // --- MATEMÁTICA DOS TEMPOS E DATAS INTELIGENTES ---
  const getTaskTime = (taskId) => {
      return logs.filter(l => l.task_id === taskId).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  };
  const getActivityTime = (ativ) => {
      if (ativ.tarefas?.length > 0) {
          return ativ.tarefas.reduce((acc, t) => acc + getTaskTime(t.id), 0);
      } else {
          return logs.filter(l => l.atividade_id === ativ.id).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
      }
  };
  const getProjectTotalTime = () => atividades.reduce((acc, a) => acc + getActivityTime(a), 0);

  const formatTime = (totalMinutes) => {
      if (totalMinutes === 0) return "0 min";
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  // 💡 NOVA FUNÇÃO: BADGE DE DATAS E PRAZOS
  const renderDeadline = (dateString, isCompleted, isLarge = false) => {
      if (!dateString) return null;
      
      const deadline = new Date(dateString);
      deadline.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      const dateFormatted = deadline.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
      
      let bg = '#f1f5f9';
      let color = '#64748b';
      let text = `📅 ${dateFormatted}`;
      
      if (isCompleted) {
          bg = '#f8fafc'; color = '#94a3b8'; text = `✔️ ${dateFormatted}`;
      } else if (diffDays < 0) {
          bg = '#fee2e2'; color = '#ef4444'; text = `🔴 ${dateFormatted} (Atraso: ${Math.abs(diffDays)}d)`;
      } else if (diffDays === 0) {
          bg = '#fef3c7'; color = '#d97706'; text = `⚠️ HOJE`;
      } else if (diffDays <= 3) {
          bg = '#ffedd5'; color = '#ea580c'; text = `⏳ ${dateFormatted} (${diffDays}d)`;
      } else {
          text = `📅 ${dateFormatted} (${diffDays}d)`;
      }

      return (
          <span style={{
              fontSize: isLarge ? '0.75rem' : '0.65rem', 
              background: bg, color: color, 
              padding: isLarge ? '4px 8px' : '2px 6px', 
              borderRadius: '6px', fontWeight: 'bold',
              display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap'
          }}>
              {text}
          </span>
      );
  };

  // --- CRONÓMETRO ---
  async function handleToggleTimer(targetId, type) {
      if (activeLog) {
          const isSameTarget = (type === 'task' && activeLog.task_id === targetId) || (type === 'activity' && activeLog.atividade_id === targetId);
          
          if (isSameTarget) {
              const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeLog.start_time)) / 60000));
              await supabase.from("task_logs").update({ end_time: new Date().toISOString(), duration_minutes: diffMins }).eq("id", activeLog.id);
              setActiveLog(null);
              showToast(`Tempo guardado: ${diffMins} min.`);
              fetchProjetoDetails(); 
          } else {
              showToast("Já tens um cronómetro ativo noutro local! Pára-o primeiro.", "error");
          }
      } else {
          const payload = { user_id: user.id, projeto_id: id, start_time: new Date().toISOString() };
          if (type === 'task') payload.task_id = targetId;
          else payload.atividade_id = targetId;

          const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();
          if (!error) { setActiveLog(data); showToast("Cronómetro iniciado! ⏱️"); }
      }
  }

  // --- ATUALIZAÇÕES DE ESTADO (SEM LOADING GLOBAL PARA NÃO PISCAR) ---
  async function toggleAtividadeStatus(ativId, estadoAtual) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      setAtividades(prev => prev.map(a => a.id === ativId ? {...a, estado: novoEstado} : a));
      await supabase.from("atividades").update({ estado: novoEstado }).eq("id", ativId);
  }

  async function toggleTarefaStatus(tarefaId, estadoAtual) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      setAtividades(prev => prev.map(a => ({
          ...a, tarefas: a.tarefas.map(t => t.id === tarefaId ? {...t, estado: novoEstado} : t)
      })));
      await supabase.from("tarefas").update({ estado: novoEstado }).eq("id", tarefaId);
  }

  async function toggleSubtarefaStatus(subId, estadoAtual) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      setAtividades(prev => prev.map(a => ({
          ...a, tarefas: a.tarefas.map(t => ({
              ...t, subtarefas: t.subtarefas.map(s => s.id === subId ? {...s, estado: novoEstado} : s)
          }))
      })));
      await supabase.from("subtarefas").update({ estado: novoEstado }).eq("id", subId);
  }

  // --- ATUALIZAR MODAIS AVANÇADOS ---
  async function handleSaveAtividade(e) {
      e.preventDefault();
      const payload = { ...atividadeModal.data };
      delete payload.tarefas; 
      const { error } = await supabase.from("atividades").update(payload).eq("id", payload.id);
      if (!error) {
          setAtividadeModal({ show: false, data: null });
          fetchProjetoDetails();
          showToast("Atividade atualizada com sucesso!");
      } else showToast(error.message, "error");
  }

  async function handleSaveTarefa(e) {
      e.preventDefault();
      const payload = { ...tarefaModal.data };
      delete payload.subtarefas; 
      const { error } = await supabase.from("tarefas").update(payload).eq("id", payload.id);
      if (!error) {
          setTarefaModal({ show: false, data: null, atividadeNome: '' });
          fetchProjetoDetails();
          showToast("Tarefa atualizada com sucesso!");
      } else showToast(error.message, "error");
  }

  async function handleSaveSubtarefa(e) {
      e.preventDefault();
      const payload = { 
          titulo: subtarefaModal.data.titulo,
          data_fim: subtarefaModal.data.data_fim || null,
          estado: subtarefaModal.data.estado
      };
      const { error } = await supabase.from("subtarefas").update(payload).eq("id", subtarefaModal.data.id);
      if (!error) {
          setSubtarefaModal({ show: false, data: null, tarefaNome: '' });
          fetchProjetoDetails();
          showToast("Sub-tarefa atualizada!");
      } else showToast(error.message, "error");
  }

  // --- ATUALIZAR VISÃO GERAL ---
  async function handleUpdateProjeto(e) {
      e.preventDefault();
      try {
          const payload = {
              titulo: formGeral.titulo, cliente_id: formGeral.cliente_id, responsavel_id: formGeral.responsavel_id,
              estado: formGeral.estado, data_inicio: formGeral.data_inicio, data_fim: formGeral.data_fim,
              programa: formGeral.programa, aviso: formGeral.aviso, codigo_projeto: formGeral.codigo_projeto,
              descricao: formGeral.descricao, observacoes: formGeral.observacoes,
              investimento: formGeral.investimento, incentivo: formGeral.incentivo
          };
          const { error } = await supabase.from("projetos").update(payload).eq("id", id);
          if (error) throw error;
          showToast("Projeto atualizado com sucesso!");
          setIsEditingGeral(false);
          fetchProjetoDetails();
      } catch (err) { showToast("Erro: " + err.message, "error"); }
  }

  // --- ADIÇÃO RÁPIDA ---
  async function handleAddAtividade(e) {
      e.preventDefault();
      if(!novaAtividadeNome.trim()) return;
      await supabase.from("atividades").insert([{ projeto_id: id, titulo: novaAtividadeNome, estado: 'pendente' }]);
      setNovaAtividadeNome(""); fetchProjetoDetails();
  }
  async function handleAddTarefa(e, ativId) {
      e.preventDefault();
      if(!novaTarefaNome.nome.trim()) return;
      await supabase.from("tarefas").insert([{ atividade_id: ativId, titulo: novaTarefaNome.nome, responsavel_id: projeto.responsavel_id, estado: 'pendente' }]);
      setNovaTarefaNome({ ativId: null, nome: "" }); fetchProjetoDetails();
  }
  async function handleAddSubtarefa(e, tarId) {
      e.preventDefault();
      if(!novaSubtarefaNome.nome.trim()) return;
      await supabase.from("subtarefas").insert([{ tarefa_id: tarId, titulo: novaSubtarefaNome.nome, estado: 'pendente' }]);
      setNovaSubtarefaNome({ tarId: null, nome: "" }); fetchProjetoDetails();
  }

  async function handleDeleteItem(tabela, itemId) {
      if(!window.confirm("Tens a certeza que desejas apagar isto permanentemente?")) return;
      await supabase.from(tabela).delete().eq("id", itemId);
      fetchProjetoDetails();
  }

  const toggleExpand = (taskId) => {
      setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;
  if (!projeto) return <div className="page-container"><p>Projeto não encontrado.</p><button onClick={() => navigate(-1)}>Voltar</button></div>;

  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '15px', transition: 'all 0.2s' };
  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px', marginTop: '5px' };

  const renderStatePills = (currentState, onChange) => {
      const states = [
          { val: 'pendente', label: 'PENDENTE', color: '#3b82f6' },
          { val: 'em_curso', label: 'EM CURSO', color: '#f59e0b' },
          { val: 'concluido', label: 'CONCLUÍDO', color: '#10b981' },
          { val: 'cancelado', label: 'CANCELADO', color: '#64748b' }
      ];
      return (
          <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
              {states.map(s => (
                  <div key={s.val} onClick={() => onChange(s.val)} style={{
                      flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${currentState === s.val ? s.color : '#cbd5e1'}`,
                      background: currentState === s.val ? s.color : '#f8fafc', color: currentState === s.val ? '#fff' : '#64748b', transition: 'all 0.2s'
                  }}>
                      {s.label}
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px'}}>
      
      {/* =========================================
          CABEÇALHO DO PROJETO 
      ========================================= */}
      <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '16px', color: 'white', marginBottom: '25px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px'}}>
            <button onClick={() => navigate('/dashboard/projetos')} style={{background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', transition: 'all 0.2s', fontWeight: '500'}} className="hover-glass">
                ◀ Voltar aos Projetos
            </button>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                {projeto.codigo_projeto && <span style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', letterSpacing: '0.05em'}}>{projeto.codigo_projeto}</span>}
                <span style={{
                    background: projeto.estado === 'concluido' ? 'rgba(16, 185, 129, 0.2)' : (projeto.estado === 'pendente' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'), 
                    border: `1px solid ${projeto.estado === 'concluido' ? '#10b981' : (projeto.estado === 'pendente' ? '#f59e0b' : '#3b82f6')}`,
                    color: projeto.estado === 'concluido' ? '#34d399' : (projeto.estado === 'pendente' ? '#fbbf24' : '#60a5fa'),
                    padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px',
                    boxShadow: `0 0 10px -3px ${projeto.estado === 'concluido' ? '#10b981' : (projeto.estado === 'pendente' ? '#f59e0b' : '#3b82f6')}` 
                }}>
                    {projeto.estado.replace('_', ' ')}
                </span>
            </div>
        </div>

        <h1 style={{margin: '0 0 15px 0', fontSize: '2.8rem', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: '1.1', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            {projeto.titulo}
        </h1>
        
        <div style={{display: 'flex', gap: '25px', fontSize: '0.9rem', color: '#94a3b8', flexWrap: 'wrap', alignItems: 'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:'6px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '6px'}}>🏢 <span style={{color:'#e2e8f0', fontWeight:'500'}}>{projeto.clientes?.marca}</span></div>
            <div style={{display:'flex', alignItems:'center', gap:'6px'}}>🏷️ <span style={{color:'#cbd5e1'}}>{projeto.tipos_projeto?.nome || 'Customizado'}</span></div>
            <div style={{display:'flex', alignItems:'center', gap:'6px'}}>👤 <span style={{color:'#cbd5e1'}}>{projeto.profiles?.nome || 'Sem Responsável'}</span></div>
            <div style={{display:'flex', alignItems:'center', gap:'6px'}}>🎯 <span style={{color: projeto.data_fim && new Date(projeto.data_fim) < new Date() ? '#fca5a5' : '#cbd5e1', fontWeight: projeto.data_fim && new Date(projeto.data_fim) < new Date() ? 'bold' : 'normal'}}>{projeto.data_fim ? new Date(projeto.data_fim).toLocaleDateString('pt-PT') : 'Sem Prazo'}</span></div>
        </div>
      </div>

      {/* NAVEGAÇÃO INTERNA */}
      <div style={{display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px'}}>
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: activeTab === 'atividades' ? '700' : '600', color: activeTab === 'atividades' ? '#2563eb' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative'}} onClick={() => setActiveTab('atividades')} className="tab-hover">
            📋 Board de Atividades
            {activeTab === 'atividades' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'#2563eb', borderRadius:'3px 3px 0 0'}} />}
        </button>
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: activeTab === 'relatorio' ? '700' : '600', color: activeTab === 'relatorio' ? '#2563eb' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative'}} onClick={() => setActiveTab('relatorio')} className="tab-hover">
            ⏱️ Relatório de Tempos
            {activeTab === 'relatorio' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'#2563eb', borderRadius:'3px 3px 0 0'}} />}
        </button>
        <button style={{background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: activeTab === 'geral' ? '700' : '600', color: activeTab === 'geral' ? '#2563eb' : '#64748b', cursor: 'pointer', padding: '10px 20px', position: 'relative'}} onClick={() => setActiveTab('geral')} className="tab-hover">
            ⚙️ Configurações e Dados
            {activeTab === 'geral' && <div style={{position:'absolute', bottom:'-12px', left:0, right:0, height:'3px', background:'#2563eb', borderRadius:'3px 3px 0 0'}} />}
        </button>
      </div>

      <div style={{minHeight: '50vh'}}>
        
        {/* =========================================
            ABA 1: BOARD DE ATIVIDADES
        ========================================= */}
        {activeTab === 'atividades' && (
            <div style={{maxWidth: '950px'}}>
                {atividades.map(ativ => {
                    const isAtivDone = ativ.estado === 'concluido';
                    const progresso = ativ.tarefas?.length > 0 ? Math.round((ativ.tarefas.filter(t => t.estado === 'concluido').length / ativ.tarefas.length) * 100) : 0;
                    
                    const hasNoTasks = !ativ.tarefas || ativ.tarefas.length === 0;
                    const isAtivTimerActive = activeLog?.atividade_id === ativ.id;
                    const ativTime = getActivityTime(ativ);

                    return (
                    <div key={ativ.id} style={{background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)', overflow: 'hidden', opacity: isAtivDone ? 0.6 : 1, transition: 'opacity 0.3s'}}>
                        
                        {/* CABEÇALHO DA ATIVIDADE */}
                        <div style={{padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isAtivDone ? '#f8fafc' : 'white', position: 'relative'}}>
                            <div style={{position: 'absolute', bottom: 0, left: 0, height: '3px', background: '#f1f5f9', width: '100%'}}>
                                <div style={{height: '100%', background: progresso === 100 ? '#10b981' : '#3b82f6', width: `${progresso}%`, transition: 'width 0.4s ease-in-out'}}></div>
                            </div>
                            
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                <div onClick={() => toggleAtividadeStatus(ativ.id, ativ.estado)} style={{width: '26px', height: '26px', borderRadius: '8px', cursor: 'pointer', background: isAtivDone ? '#10b981' : '#f8fafc', border: isAtivDone ? 'none' : '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1rem', transition: 'all 0.2s'}}>
                                    {isAtivDone && '✓'}
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <h3 style={{margin: 0, color: isAtivDone ? '#94a3b8' : '#0f172a', textDecoration: isAtivDone ? 'line-through' : 'none', fontSize: '1.1rem', fontWeight: '700'}}>
                                        {ativ.titulo}
                                    </h3>
                                    {/* BADGE DATA INTELIGENTE - ATIVIDADE */}
                                    {renderDeadline(ativ.data_fim, isAtivDone, true)}
                                    
                                    <button onClick={() => setAtividadeModal({show: true, data: ativ})} style={{background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontSize:'0.9rem'}} title="Editar Atividade">✏️</button>
                                </div>
                            </div>

                            <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                {!isAtivDone && <span style={{fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: '600'}}>{progresso}% Concluído</span>}
                                
                                <span style={{fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold', background: '#eff6ff', padding: '4px 10px', borderRadius: '12px'}}>⏱️ {formatTime(ativTime)}</span>
                                
                                {hasNoTasks && !isAtivDone && (
                                    <button onClick={() => handleToggleTimer(ativ.id, 'activity')} style={{ background: isAtivTimerActive ? '#fee2e2' : '#f1f5f9', color: isAtivTimerActive ? '#ef4444' : '#64748b', border: 'none', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', animation: isAtivTimerActive ? 'pulse 1.5s infinite' : 'none'}}>
                                        {isAtivTimerActive ? '⏹ Parar' : '▶ Play'}
                                    </button>
                                )}

                                <button onClick={() => handleDeleteItem("atividades", ativ.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', opacity:0.3}} className="hover-red">🗑</button>
                            </div>
                        </div>

                        {/* LISTA DE TAREFAS */}
                        {!isAtivDone && (
                            <div style={{padding: '10px 20px 20px 20px', background: '#f8fafc'}}>
                                {ativ.tarefas?.map(tar => {
                                    const isTarDone = tar.estado === 'concluido';
                                    const hasSubs = tar.subtarefas?.length > 0;
                                    const subsDone = hasSubs ? tar.subtarefas.filter(s => s.estado === 'concluido').length : 0;
                                    const isExpanded = expandedTasks[tar.id];
                                    
                                    const isTimerActive = activeLog?.task_id === tar.id;
                                    const taskTime = getTaskTime(tar.id);
                                    const respName = staff.find(s => s.id === tar.responsavel_id)?.nome;

                                    return (
                                    <div key={tar.id} style={{background: 'white', border: isTimerActive ? '1px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', boxShadow: isTimerActive ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none', transition: 'all 0.2s'}}>
                                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', opacity: tar.estado === 'concluido' ? 0.6 : 1}}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1}}>
                                                <div onClick={() => toggleTarefaStatus(tar.id, tar.estado)} style={{ width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', border: tar.estado === 'concluido' ? 'none' : '2px solid #cbd5e1', background: tar.estado === 'concluido' ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', flexShrink: 0 }}>
                                                    {tar.estado === 'concluido' && '✓'}
                                                </div>
                                                
                                                <span onClick={() => setTarefaModal({ show: true, data: tar, atividadeNome: ativ.titulo })} style={{textDecoration: tar.estado === 'concluido' ? 'line-through' : 'none', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem'}} className="hover-underline" title="Clique para editar detalhes">
                                                    {tar.titulo}
                                                </span>
                                                
                                                <div style={{display: 'flex', gap: '6px', marginLeft: '10px'}}>
                                                    {tar.prioridade === 'Alta' || tar.prioridade === 'Urgente' ? <span style={{fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>{tar.prioridade}</span> : null}
                                                    {respName && <span style={{fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>{respName.split(' ')[0]}</span>}
                                                    
                                                    {/* BADGE DATA INTELIGENTE - TAREFA */}
                                                    {renderDeadline(tar.data_fim, isTarDone)}
                                                    
                                                    {hasSubs && <span style={{fontSize: '0.65rem', background: subsDone === tar.subtarefas.length ? '#dcfce7' : '#f1f5f9', color: subsDone === tar.subtarefas.length ? '#16a34a' : '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>📋 {subsDone}/{tar.subtarefas.length}</span>}
                                                </div>
                                            </div>

                                            <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                                <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: '600'}}>⏱️ {formatTime(taskTime)}</span>

                                                <button onClick={() => handleToggleTimer(tar.id, 'task')} style={{ background: isTimerActive ? '#fee2e2' : '#f1f5f9', color: isTimerActive ? '#ef4444' : '#64748b', border: 'none', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', animation: isTimerActive ? 'pulse 1.5s infinite' : 'none'}}>
                                                    {isTimerActive ? '⏹ Parar' : '▶ Play'}
                                                </button>
                                                {hasSubs && <button onClick={() => toggleExpand(tar.id)} style={{background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize: '0.75rem', fontWeight: '600'}}>{isExpanded ? '▲' : '▼'}</button>}
                                                <button onClick={() => handleDeleteItem("tarefas", tar.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', opacity:0.3, fontSize:'0.8rem'}} className="hover-red">✕</button>
                                            </div>
                                        </div>

                                        {/* ÁREA EXPANDIDA (CHECKLISTS) */}
                                        {isExpanded && (
                                            <div style={{padding: '0 15px 10px 45px', background: 'white', borderTop: '1px dashed #f1f5f9'}}>
                                                {tar.subtarefas?.map(sub => {
                                                    const isSubCompleted = sub.estado === 'concluido';
                                                    
                                                    return (
                                                        <div key={sub.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', opacity: sub.estado === 'concluido' ? 0.5 : 1}}>
                                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}}>
                                                                <input type="checkbox" checked={sub.estado === 'concluido'} onChange={() => toggleSubtarefaStatus(sub.id, sub.estado)} style={{width: '14px', height: '14px', cursor: 'pointer', accentColor: '#3b82f6'}} />
                                                                
                                                                <span onClick={() => setSubtarefaModal({show: true, data: sub, tarefaNome: tar.titulo})} style={{fontSize: '0.85rem', color: '#475569', textDecoration: sub.estado === 'concluido' ? 'line-through' : 'none', cursor: 'pointer'}} className="hover-underline" title="Editar Sub-tarefa">
                                                                    {sub.titulo}
                                                                </span>

                                                                {/* BADGE DATA INTELIGENTE - SUBTAREFA */}
                                                                {renderDeadline(sub.data_fim, isSubCompleted)}
                                                            </div>

                                                            <button onClick={() => handleDeleteItem("subtarefas", sub.id)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', opacity:0.3, marginLeft: 'auto', fontSize:'0.75rem'}} className="hover-red">✕</button>
                                                        </div>
                                                    )
                                                })}
                                                <form onSubmit={(e) => handleAddSubtarefa(e, tar.id)} style={{marginTop: '6px'}}>
                                                    <input type="text" placeholder="+ Sub-tarefa (Enter)" value={novaSubtarefaNome.tarId === tar.id ? novaSubtarefaNome.nome : ""} onChange={e => setNovaSubtarefaNome({ tarId: tar.id, nome: e.target.value })} style={{width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px dashed #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '0.8rem', color: '#64748b'}}/>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}

                                <form onSubmit={(e) => handleAddTarefa(e, ativ.id)} style={{marginTop: '10px'}}>
                                    <input type="text" placeholder="+ Adicionar Tarefa Principal (Enter)..." value={novaTarefaNome.ativId === ativ.id ? novaTarefaNome.nome : ""} onChange={e => setNovaTarefaNome({ ativId: ativ.id, nome: e.target.value })} style={{width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: 'white', outline: 'none', fontSize: '0.9rem', color: '#64748b'}} />
                                </form>
                            </div>
                        )}
                    </div>
                )})}

                <form onSubmit={handleAddAtividade} style={{marginTop: '25px', background: 'transparent', padding: '0'}}>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <input type="text" placeholder="+ Nome de uma nova Atividade (Agrupador)..." value={novaAtividadeNome} onChange={e => setNovaAtividadeNome(e.target.value)} style={{flex: 1, padding: '12px 15px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: 'rgba(255,255,255,0.5)', outline: 'none', fontSize: '0.95rem', color: '#1e293b'}} />
                        <button type="submit" className="btn-primary" style={{borderRadius: '8px', padding: '0 20px', fontSize: '0.9rem', background: '#64748b'}}>Criar Bloco</button>
                    </div>
                </form>
            </div>
        )}

        {/* =========================================
            ABA 2: RELATÓRIO DE TEMPOS
        ========================================= */}
        {activeTab === 'relatorio' && (
            <div style={{background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0'}}>
                <h2 style={{margin: '0 0 20px 0', color: '#1e293b'}}>⏱️ Relatório de Execução</h2>
                
                <div style={{background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px'}}>
                    <div>
                        <h4 style={{margin: 0, color: '#1e40af'}}>Tempo Total Gasto no Projeto</h4>
                        <p style={{margin: '5px 0 0 0', color: '#3b82f6', fontSize: '0.85rem'}}>Soma de todas as sessões do cronómetro.</p>
                    </div>
                    <div style={{fontSize: '2.5rem', fontWeight: '900', color: '#1d4ed8'}}>
                        {formatTime(getProjectTotalTime())}
                    </div>
                </div>

                <table className="data-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                        <tr style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase'}}>
                            <th style={{padding: '12px'}}>Atividade / Tarefa</th>
                            <th style={{padding: '12px'}}>Responsável</th>
                            <th style={{padding: '12px', textAlign: 'right'}}>Tempo Gasto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {atividades.map(ativ => (
                            <React.Fragment key={ativ.id}>
                                <tr style={{background: '#f1f5f9', borderBottom: '1px solid #e2e8f0'}}>
                                    <td style={{padding: '12px', fontWeight: 'bold', color: '#1e293b'}}>📁 {ativ.titulo}</td>
                                    <td style={{padding: '12px', color: '#64748b', fontSize: '0.85rem'}}>{staff.find(s => s.id === ativ.responsavel_id)?.nome || '-'}</td>
                                    <td style={{padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#3b82f6'}}>{formatTime(getActivityTime(ativ))}</td>
                                </tr>
                                {ativ.tarefas?.map(tar => {
                                    const time = getTaskTime(tar.id);
                                    if (time === 0) return null; 
                                    return (
                                        <tr key={tar.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                                            <td style={{padding: '10px 12px 10px 40px', color: '#475569', fontSize: '0.9rem'}}>↳ {tar.titulo}</td>
                                            <td style={{padding: '10px 12px', color: '#64748b', fontSize: '0.85rem'}}>{staff.find(s => s.id === tar.responsavel_id)?.nome || '-'}</td>
                                            <td style={{padding: '10px 12px', textAlign: 'right', color: '#475569', fontSize: '0.9rem'}}>{formatTime(time)}</td>
                                        </tr>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* =========================================
            ABA 3: VISÃO GERAL (Formulário)
        ========================================= */}
        {activeTab === 'geral' && (
            <div style={{background: 'white', padding: '35px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px'}}>
                    <h2 style={{margin: 0, color: '#0f172a', fontSize: '1.3rem'}}>Ficha do Projeto</h2>
                    {!isEditingGeral ? (
                        <button onClick={() => setIsEditingGeral(true)} className="btn-primary" style={{background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 15px', fontSize: '0.85rem'}}>✏️ Ativar Edição</button>
                    ) : (
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={() => { setIsEditingGeral(false); setFormGeral(projeto); }} className="btn-small" style={{padding: '6px 15px', borderRadius: '8px', fontSize: '0.85rem'}}>Cancelar</button>
                            <button onClick={handleUpdateProjeto} className="btn-primary" style={{padding: '6px 20px', borderRadius: '8px', fontSize: '0.85rem'}}>💾 Gravar</button>
                        </div>
                    )}
                </div>

                <fieldset disabled={!isEditingGeral} style={{border: 'none', padding: 0, margin: 0, opacity: !isEditingGeral ? 0.8 : 1, transition: 'opacity 0.3s'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px'}}>
                        <div>
                            <label style={labelStyle}>Nome do Projeto</label>
                            <input type="text" value={formGeral.titulo || ''} onChange={e => setFormGeral({...formGeral, titulo: e.target.value})} style={{...inputStyle, fontWeight: 'bold', color: '#0f172a'}} />
                            
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                                <div><label style={labelStyle}>Cliente</label>
                                    <select value={formGeral.cliente_id || ''} onChange={e => setFormGeral({...formGeral, cliente_id: e.target.value})} style={inputStyle}>
                                        <option value="">- NENHUM -</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.marca}</option>)}
                                    </select>
                                </div>
                                <div><label style={labelStyle}>Responsável</label>
                                    <select value={formGeral.responsavel_id || ''} onChange={e => setFormGeral({...formGeral, responsavel_id: e.target.value})} style={inputStyle}>
                                        <option value="">- NENHUM -</option>{staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
                                <div><label style={labelStyle}>Código</label><input type="text" value={formGeral.codigo_projeto || ''} onChange={e => setFormGeral({...formGeral, codigo_projeto: e.target.value})} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Programa</label><input type="text" value={formGeral.programa || ''} onChange={e => setFormGeral({...formGeral, programa: e.target.value})} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Aviso</label><input type="text" value={formGeral.aviso || ''} onChange={e => setFormGeral({...formGeral, aviso: e.target.value})} style={inputStyle} /></div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'}}>
                                <div><label style={labelStyle}>Data Início</label><input type="date" value={formGeral.data_inicio || ''} onChange={e => setFormGeral({...formGeral, data_inicio: e.target.value})} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Deadline</label><input type="date" value={formGeral.data_fim || ''} onChange={e => setFormGeral({...formGeral, data_fim: e.target.value})} style={inputStyle} /></div>
                                <div>
                                    <label style={labelStyle}>Estado</label>
                                    <select value={formGeral.estado || 'pendente'} onChange={e => setFormGeral({...formGeral, estado: e.target.value})} style={{...inputStyle, fontWeight: 'bold'}}>
                                        <option value="pendente">Pendente</option><option value="em_curso">Em Curso</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{background: '#eff6ff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '20px'}}>
                                <h4 style={{margin: '0 0 15px 0', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px', fontSize:'0.9rem'}}>💰 Financeiro</h4>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                                    <div><label style={{...labelStyle, color: '#1e3a8a'}}>Investimento (€)</label><input type="number" step="0.01" value={formGeral.investimento || 0} onChange={e => setFormGeral({...formGeral, investimento: e.target.value})} style={{...inputStyle, borderColor: '#bfdbfe', marginBottom:0}} /></div>
                                    <div><label style={{...labelStyle, color: '#1e3a8a'}}>Incentivo (€)</label><input type="number" step="0.01" value={formGeral.incentivo || 0} onChange={e => setFormGeral({...formGeral, incentivo: e.target.value})} style={{...inputStyle, borderColor: '#bfdbfe', color: '#16a34a', marginBottom:0}} /></div>
                                </div>
                            </div>
                            <label style={labelStyle}>Descrição Pública</label>
                            <textarea rows="3" value={formGeral.descricao || ''} onChange={e => setFormGeral({...formGeral, descricao: e.target.value})} style={{...inputStyle, resize: 'vertical', fontSize:'0.85rem'}} />
                            <label style={{...labelStyle, color: '#b45309', marginTop: '5px'}}>Observações Internas</label>
                            <textarea rows="3" value={formGeral.observacoes || ''} onChange={e => setFormGeral({...formGeral, observacoes: e.target.value})} style={{...inputStyle, resize: 'vertical', background: '#fffbeb', borderColor: '#fcd34d', fontSize:'0.85rem'}} />
                        </div>
                    </div>
                </fieldset>
            </div>
        )}

      </div>

      {/* =========================================
          MODAIS DE EDIÇÃO AVANÇADOS
      ========================================= */}

      {/* MODAL 1: EDITAR ATIVIDADE */}
      {atividadeModal.show && atividadeModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}>📋 Editar Atividade</h3>
                          <button onClick={() => setAtividadeModal({show:false, data:null})} style={{background:'none', border:'none', fontSize:'1.2rem', color:'#94a3b8', cursor:'pointer'}}>✕</button>
                      </div>
                      
                      <form onSubmit={handleSaveAtividade}>
                          <label style={labelStyle}>Título da Atividade *</label>
                          <input type="text" value={atividadeModal.data.titulo} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, titulo: e.target.value}})} style={{...inputStyle, fontWeight: 'bold'}} required />
                          
                          <div style={sectionTitleStyle}>📌 Projeto & Responsável</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Projeto Pai</label>
                                  <input type="text" value={projeto.titulo} disabled style={{...inputStyle, background: '#f1f5f9', marginBottom: 0}} />
                              </div>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Responsável</label>
                                  <select value={atividadeModal.data.responsavel_id || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, responsavel_id: e.target.value}})} style={{...inputStyle, marginBottom: 0}}>
                                      <option value="">- Ninguém -</option>
                                      {staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div style={sectionTitleStyle}>📅 Planeamento & Financeiro</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px'}}>
                              <div><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Data Início</label><input type="date" value={atividadeModal.data.data_inicio || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, data_inicio: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} /></div>
                              <div><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Data Fim</label><input type="date" value={atividadeModal.data.data_fim || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, data_fim: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} /></div>
                              <div><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Invest. (€)</label><input type="number" step="0.01" value={atividadeModal.data.investimento || 0} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, investimento: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} /></div>
                              <div><label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight: 'bold'}}>Incentivo (€)</label><input type="number" step="0.01" value={atividadeModal.data.incentivo || 0} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, incentivo: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} /></div>
                          </div>

                          <div style={sectionTitleStyle}>⚙️ Estado</div>
                          {renderStatePills(atividadeModal.data.estado, (val) => setAtividadeModal({show: true, data: {...atividadeModal.data, estado: val}}))}

                          <div style={sectionTitleStyle}>📝 Notas</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                              <textarea rows="3" placeholder="Descrição..." value={atividadeModal.data.descricao || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, descricao: e.target.value}})} style={{...inputStyle, resize:'none'}} />
                              <textarea rows="3" placeholder="Observações..." value={atividadeModal.data.observacoes || ''} onChange={e => setAtividadeModal({show: true, data: {...atividadeModal.data, observacoes: e.target.value}})} style={{...inputStyle, resize:'none', background:'#fffbeb', borderColor:'#fcd34d'}} />
                          </div>

                          <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                              <button type="button" onClick={() => setAtividadeModal({show:false, data:null})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor:'pointer'}}>Cancelar</button>
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor:'pointer'}}>💾 Guardar Alterações</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL 2: EDITAR TAREFA */}
      {tarefaModal.show && tarefaModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}>👁️ Detalhes da Tarefa</h3>
                          <button onClick={() => setTarefaModal({show:false, data:null, atividadeNome:''})} style={{background:'none', border:'none', fontSize:'1.2rem', color:'#94a3b8', cursor:'pointer'}}>✕</button>
                      </div>
                      
                      <form onSubmit={handleSaveTarefa}>
                          <label style={labelStyle}>Título da Tarefa *</label>
                          <input type="text" value={tarefaModal.data.titulo} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, titulo: e.target.value}})} style={{...inputStyle, fontWeight: 'bold'}} required />
                          
                          <div style={sectionTitleStyle}>📌 Enquadramento</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Atividade Pai</label>
                                  <input type="text" value={tarefaModal.atividadeNome} disabled style={{...inputStyle, background: '#f1f5f9', marginBottom: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}} />
                              </div>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Responsável</label>
                                  <select value={tarefaModal.data.responsavel_id || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, responsavel_id: e.target.value}})} style={{...inputStyle, marginBottom: 0}}>
                                      <option value="">- Ninguém -</option>
                                      {staff.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div style={sectionTitleStyle}>📅 Planeamento & Estado</div>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px'}}>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Data Início</label>
                                  <input type="date" value={tarefaModal.data.data_inicio || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, data_inicio: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} />
                              </div>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Prazo Limite</label>
                                  <input type="date" value={tarefaModal.data.data_fim || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, data_fim: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}} />
                              </div>
                              <div>
                                  <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Prioridade</label>
                                  <select value={tarefaModal.data.prioridade || 'Normal'} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, prioridade: e.target.value}})} style={{...inputStyle, padding:'10px', fontSize:'0.85rem', marginBottom: 0}}>
                                      <option value="Baixa">🔵 Baixa</option>
                                      <option value="Normal">🟢 Normal</option>
                                      <option value="Alta">🟠 Alta</option>
                                      <option value="Urgente">🔴 Urgente</option>
                                  </select>
                              </div>
                          </div>

                          <label style={{...labelStyle, marginTop:'15px'}}>Estado Atual</label>
                          {renderStatePills(tarefaModal.data.estado, (val) => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, estado: val}}))}

                          <div style={sectionTitleStyle}>📝 Detalhes</div>
                          <textarea rows="4" placeholder="Descreva o que é necessário fazer..." value={tarefaModal.data.descricao || ''} onChange={e => setTarefaModal({...tarefaModal, data: {...tarefaModal.data, descricao: e.target.value}})} style={{...inputStyle, resize:'none'}} />

                          <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                              <button type="button" onClick={() => setTarefaModal({show:false, data:null, atividadeNome:''})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor:'pointer'}}>Cancelar</button>
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor:'pointer'}}>💾 Guardar Tarefa</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL 3: EDITAR SUB-TAREFA COM DATA E ESTADO */}
      {subtarefaModal.show && subtarefaModal.data && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b'}}>📋 Detalhes do Passo</h3>
                          <button onClick={() => setSubtarefaModal({show:false, data:null, tarefaNome:''})} style={{background:'none', border:'none', fontSize:'1.2rem', color:'#94a3b8', cursor:'pointer'}}>✕</button>
                      </div>
                      
                      <form onSubmit={handleSaveSubtarefa}>
                          <label style={labelStyle}>Nome do Passo / Checklist *</label>
                          <input type="text" autoFocus value={subtarefaModal.data.titulo} onChange={e => setSubtarefaModal({...subtarefaModal, data: {...subtarefaModal.data, titulo: e.target.value}})} style={{...inputStyle, fontWeight: 'bold'}} required />
                          
                          <div style={sectionTitleStyle}>📌 Enquadramento</div>
                          <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Pertence à Tarefa</label>
                              <input type="text" value={subtarefaModal.tarefaNome} disabled style={{...inputStyle, background: '#f1f5f9', marginBottom: 0}} />
                          </div>

                          <div style={sectionTitleStyle}>📅 Prazo (Opcional)</div>
                          <div style={{marginBottom: '15px'}}>
                              <label style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display:'block', fontWeight:'bold'}}>Data Limite para concluir este passo</label>
                              <input type="date" value={subtarefaModal.data.data_fim || ''} onChange={e => setSubtarefaModal({...subtarefaModal, data: {...subtarefaModal.data, data_fim: e.target.value}})} style={{...inputStyle, marginBottom: 0}} />
                          </div>

                          <label style={{...labelStyle, marginTop:'15px'}}>Estado Atual</label>
                          {renderStatePills(subtarefaModal.data.estado, (val) => setSubtarefaModal({...subtarefaModal, data: {...subtarefaModal.data, estado: val}}))}

                          <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                              <button type="button" onClick={() => setSubtarefaModal({show:false, data:null, tarefaNome:''})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor:'pointer'}}>Cancelar</button>
                              <button type="submit" style={{flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor:'pointer'}}>💾 Guardar</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}
      
      <style>{`
          .hover-glass:hover { background: rgba(255,255,255,0.15) !important; border-color: rgba(255,255,255,0.3) !important; }
          .tab-hover:hover { color: #0f172a !important; }
          .hover-red:hover { opacity: 1 !important; color: #dc2626 !important; }
          .hover-underline:hover { text-decoration: underline !important; }
          
          /* Botões de Ação na Tabela */
          .btn-icon { background: white; border: 1px solid #cbd5e1; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; transition: 0.2s; }
          .btn-icon:hover { background: #f1f5f9; border-color: #94a3b8; }
          .btn-icon-small { background: transparent; border: none; cursor: pointer; color: #94a3b8; font-size: 0.8rem; transition: 0.2s; }
          .btn-icon-small:hover { color: #3b82f6; }
          .text-red:hover { color: #ef4444 !important; }
      `}</style>
    </div>
  );
}