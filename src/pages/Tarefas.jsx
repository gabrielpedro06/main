import { useState, useEffect } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Tarefas() {
  const { user } = useAuth();
  
  const [atividadesAgrupadas, setAtividadesAgrupadas] = useState([]); 
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [activeTask, setActiveTask] = useState(null); 
  const [notification, setNotification] = useState(null);

  const [atividadesBase, setAtividadesBase] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [projetosList, setProjetosList] = useState([]); 

  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  const [expandedTasks, setExpandedTasks] = useState({});
  const [novaTarefaNome, setNovaTarefaNome] = useState({ ativId: null, nome: "" });
  const [novaSubtarefaNome, setNovaSubtarefaNome] = useState({ tarId: null, nome: "" });

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState('tarefa'); 
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, tabela: '', id: null, titulo: '' });

  // Limite de visualização por Projeto (Padrão 5)
  const [visibleLimits, setVisibleLimits] = useState({}); 

  const initialForm = {
    titulo: "", descricao: "", atividade_id: "", responsavel_id: "",
    estado: "pendente", prioridade: "normal",
    data_inicio: new Date().toISOString().split('T')[0], data_limite: ""
  };
  
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (user && user.id) carregarTudo();
  }, [user]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  async function carregarTudo() {
      setLoading(true);
      await checkActiveTask();
      await fetchUserRoleAndData();
  }

  async function checkActiveTask() {
      try {
          const { data } = await supabase.from("task_logs").select("*").eq("user_id", user.id).is("end_time", null).maybeSingle();
          setActiveTask(data || null);
      } catch (err) { console.error(err); }
  }

  async function fetchUserRoleAndData() {
      let userIsAdmin = false;
      try {
          const { data } = await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle();
          if (data && ['admin', 'administrador', 'gestor'].includes(String(data.tipo).toLowerCase())) {
              userIsAdmin = true;
          }
      } catch (err) {}
      
      setIsAdmin(userIsAdmin);
      fetchData(userIsAdmin);
  }

  // 💡 FÓRMULA DE ORDENAÇÃO DE FERRO (Ordem Estrita)
  const sortMaster = (a, b, dateKey) => {
      // 1. OBRIGATÓRIO: Ordem do template convertida para número matemático
      const ordemA = a.ordem !== null && a.ordem !== undefined ? Number(a.ordem) : 999999;
      const ordemB = b.ordem !== null && b.ordem !== undefined ? Number(b.ordem) : 999999;
      
      if (ordemA !== ordemB) {
          return ordemA - ordemB; // O menor número ganha (ex: 1 vem antes do 2)
      }

      // 2. Datas (Prazos mais urgentes) - Só entra em ação se a ordem for igual
      if (a[dateKey] && b[dateKey]) {
          const d1 = new Date(a[dateKey]).getTime();
          const d2 = new Date(b[dateKey]).getTime();
          if (d1 !== d2) return d1 - d2;
      } else if (a[dateKey] && !b[dateKey]) { return -1; }
        else if (!a[dateKey] && b[dateKey]) { return 1; }

      // 3. Data de criação
      if (a.created_at && b.created_at) {
          const c1 = new Date(a.created_at).getTime();
          const c2 = new Date(b.created_at).getTime();
          if (c1 !== c2) return c1 - c2;
      }
      
      // 4. Desempate final (ex: "2.1" vs "2.3")
      return (a.titulo || "").localeCompare(b.titulo || "", undefined, { numeric: true });
  };

  async function fetchData(adminStatus) {
    try {
        let queryAtivs = supabase.from("atividades").select(`id, titulo, estado, data_fim, ordem, created_at, projetos(id, titulo, clientes(id, marca))`).not("projeto_id", "is", null);
        if (!adminStatus) queryAtivs = queryAtivs.eq("responsavel_id", user.id);
        const { data: ativsData } = await queryAtivs;

        let queryTarefas = supabase.from("tarefas").select(`*, atividades!inner(id, titulo, estado, data_fim, ordem, created_at, projetos(id, titulo, clientes(id, marca))), profiles:responsavel_id(nome, email)`);
        if (!adminStatus) queryTarefas = queryTarefas.eq("responsavel_id", user.id);
        const { data: tarefasData } = await queryTarefas;

        let querySubtarefas = supabase.from("subtarefas").select(`*, tarefas!inner(id, titulo, prioridade, data_limite, estado, atividades!inner(id, titulo, estado, data_fim, ordem, created_at, projetos(id, titulo, clientes(id, marca)))), profiles:responsavel_id(nome, email)`);
        if (!adminStatus) querySubtarefas = querySubtarefas.eq("responsavel_id", user.id);
        const { data: subtarefasData } = await querySubtarefas;

        const { data: logsData } = await supabase.from("task_logs").select("*");
        setLogs(logsData || []);

        let mapAtividades = new Map();

        if (ativsData) {
            ativsData.forEach(a => {
                mapAtividades.set(a.id, {
                    id: a.id, titulo: a.titulo, estado: a.estado, data_fim: a.data_fim, ordem: a.ordem, created_at: a.created_at,
                    projetoNome: a.projetos?.titulo, projetoId: a.projetos?.id,
                    clienteNome: a.projetos?.clientes?.marca, clienteId: a.projetos?.clientes?.id,
                    searchString: (a.titulo + " " + (a.projetos?.titulo||"")).toLowerCase(),
                    tarefasMap: new Map()
                });
            });
        }

        if (tarefasData) {
            tarefasData.forEach(t => {
                const ativ = t.atividades;
                if (!mapAtividades.has(ativ.id)) {
                    mapAtividades.set(ativ.id, {
                        id: ativ.id, titulo: ativ.titulo, estado: ativ.estado, data_fim: ativ.data_fim, ordem: ativ.ordem, created_at: ativ.created_at,
                        projetoNome: ativ.projetos?.titulo, projetoId: ativ.projetos?.id,
                        clienteNome: ativ.projetos?.clientes?.marca, clienteId: ativ.projetos?.clientes?.id,
                        searchString: (ativ.titulo + " " + (ativ.projetos?.titulo||"")).toLowerCase(),
                        tarefasMap: new Map()
                    });
                }
                mapAtividades.get(ativ.id).tarefasMap.set(t.id, { ...t, is_readonly_parent: false, searchString: (t.titulo || '').toLowerCase(), subtarefas: [] });
            });
        }

        if (subtarefasData) {
            subtarefasData.forEach(s => {
                const tar = s.tarefas;
                const ativ = tar.atividades;

                if (!mapAtividades.has(ativ.id)) {
                    mapAtividades.set(ativ.id, {
                        id: ativ.id, titulo: ativ.titulo, estado: ativ.estado, data_fim: ativ.data_fim, ordem: ativ.ordem, created_at: ativ.created_at,
                        projetoNome: ativ.projetos?.titulo, projetoId: ativ.projetos?.id,
                        clienteNome: ativ.projetos?.clientes?.marca, clienteId: ativ.projetos?.clientes?.id,
                        searchString: (ativ.titulo + " " + (ativ.projetos?.titulo||"")).toLowerCase(),
                        tarefasMap: new Map()
                    });
                }
                const ativMap = mapAtividades.get(ativ.id);
                if (!ativMap.tarefasMap.has(tar.id)) {
                    ativMap.tarefasMap.set(tar.id, { ...tar, is_readonly_parent: true, searchString: (tar.titulo || '').toLowerCase(), subtarefas: [] });
                }
                ativMap.tarefasMap.get(tar.id).subtarefas.push({...s, searchString: (s.titulo || '').toLowerCase()});
            });
        }

        // APLICAR A ORDENAÇÃO DE FLUXO (Workflow Absoluto)
        let listaAtividades = Array.from(mapAtividades.values()).map(a => {
            const arrTarefas = Array.from(a.tarefasMap.values());
            arrTarefas.sort((t1, t2) => sortMaster(t1, t2, 'data_limite'));
            arrTarefas.forEach(t => t.subtarefas.sort((s1, s2) => sortMaster(s1, s2, 'data_fim')));
            return { ...a, tarefas: arrTarefas };
        });
        listaAtividades.sort((a1, a2) => sortMaster(a1, a2, 'data_fim'));

        setAtividadesAgrupadas(listaAtividades);

        const { data: comboAtiv } = await supabase.from("atividades").select("id, titulo, projetos(titulo)").not("projeto_id", "is", null).neq("estado", "cancelado");
        setAtividadesBase(comboAtiv || []);
        const { data: staffData } = await supabase.from("profiles").select("id, nome, email").order("nome");
        setStaff(staffData || []);
        const { data: cliData } = await supabase.from("clientes").select("id, marca").order("marca");
        setClientes(cliData || []);
        const { data: projData } = await supabase.from("projetos").select("id, titulo").order("titulo");
        setProjetosList(projData || []);

    } catch (e) { console.error("ERRO FATAL:", e); }
    
    setLoading(false);
  }

  const getTaskTime = (taskId) => logs.filter(l => l.task_id === taskId).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  const getActivityTime = (ativ) => ativ.tarefas?.reduce((acc, t) => acc + getTaskTime(t.id), 0) || 0;
  
  const formatTime = (mins) => {
      if (mins === 0) return "0m";
      const h = Math.floor(mins / 60); const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const renderDeadline = (dateString, isCompleted, isLarge = false) => {
      if (!dateString) return null;
      const deadline = new Date(dateString); deadline.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
      const dateFormatted = deadline.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
      
      let bg = '#f1f5f9', color = '#64748b', text = `📅 ${dateFormatted}`;
      if (isCompleted) { bg = 'transparent'; color = '#94a3b8'; text = `✔️ ${dateFormatted}`; } 
      else if (diffDays < 0) { bg = '#fee2e2'; color = '#ef4444'; text = `🔴 ${dateFormatted}`; } 
      else if (diffDays === 0) { bg = '#fefce8'; color = '#ca8a04'; text = `⚠️ HOJE`; } 
      else if (diffDays <= 3) { bg = '#ffedd5'; color = '#ea580c'; text = `⏳ ${dateFormatted}`; } 

      return (
          <span style={{ fontSize: isLarge ? '0.7rem' : '0.6rem', background: bg, color: color, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block', whiteSpace: 'nowrap' }}>
              {text}
          </span>
      );
  };

  const projectColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9', '#6366f1'];
  const getColorForProject = (id) => {
      if (!id) return '#94a3b8'; 
      const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return projectColors[hash % projectColors.length];
  };

  async function handleStartTask(tarefa) {
      if (activeTask) return showToast("Pára o cronómetro atual antes de iniciares outro.", "error");
      const payload = { user_id: user.id, task_id: tarefa.id, start_time: new Date().toISOString() };
      const ativPai = atividadesAgrupadas.find(a => a.tarefas.some(t => t.id === tarefa.id));
      if (ativPai) payload.projeto_id = ativPai.projetoId;

      const { data, error } = await supabase.from("task_logs").insert([payload]).select().single();
      if (!error) {
          setActiveTask(data);
          if (tarefa.estado === 'pendente') {
              await supabase.from('tarefas').update({ estado: 'em_curso' }).eq('id', tarefa.id);
              fetchData(isAdmin);
          }
          showToast("Cronómetro iniciado! ⏱️");
      }
  }

  async function handleStopTask() {
      if (!activeTask) return;
      const diffMins = Math.max(1, Math.floor((new Date() - new Date(activeTask.start_time)) / 60000)); 
      const { error } = await supabase.from("task_logs").update({ end_time: new Date().toISOString(), duration_minutes: diffMins }).eq("id", activeTask.id);
      if (!error) { setActiveTask(null); showToast(`Tempo guardado: ${diffMins} min.`, "success"); fetchData(isAdmin); }
  }

  async function handleToggleStatus(tabela, id, estadoAtual, taskIdParaTimer = null) {
      const novoEstado = estadoAtual === 'concluido' ? 'pendente' : 'concluido';
      if (novoEstado === 'concluido' && activeTask && activeTask.task_id === taskIdParaTimer) await handleStopTask();
      const { error } = await supabase.from(tabela).update({ estado: novoEstado }).eq("id", id);
      if (!error) { fetchData(isAdmin); showToast(novoEstado === 'concluido' ? "Feito! 🎉" : "Reaberto."); }
  }

  function openDeleteConfirm(tabela, id, titulo) {
      setDeleteConfirm({ show: true, tabela, id, titulo });
  }

  async function executeDelete() {
      const { tabela, id } = deleteConfirm;
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      setDeleteConfirm({ show: false, tabela: '', id: null, titulo: '' });
      if(!error) { showToast("Apagado com sucesso."); fetchData(isAdmin); }
      else { showToast("Erro ao apagar.", "error"); }
  }

  const toggleExpand = (taskId) => setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));

  const checkFilters = (t, termo) => {
      const matchBusca = t.searchString.includes(termo) || t.subtarefas.some(s => s.searchString.includes(termo));
      const isInactive = t.estado === 'concluido' || t.estado === 'cancelado';
      if (!mostrarConcluidos && isInactive) return false;
      return matchBusca;
  }

  const atividadesFiltradas = atividadesAgrupadas.map(a => {
      const tarefasFiltered = a.tarefas.filter(t => checkFilters(t, busca.toLowerCase()) || a.searchString.includes(busca.toLowerCase()));
      const matchProjeto = filtroProjeto ? String(a.projetoId) === String(filtroProjeto) : true;
      const matchCliente = filtroCliente ? String(a.clienteId) === String(filtroCliente) : true;
      const isAtivInactive = a.estado === 'concluido' || a.estado === 'cancelado';
      
      if (!matchProjeto || !matchCliente) return null;
      if (!mostrarConcluidos && isAtivInactive && tarefasFiltered.length === 0) return null;
      if (busca && tarefasFiltered.length === 0 && !a.searchString.includes(busca.toLowerCase())) return null; 

      return { ...a, tarefas: tarefasFiltered };
  }).filter(Boolean); 

  // Agrupar atividades por Projeto e ORDENAR OS PROJETOS ALFABETICAMENTE
  const projetosAgrupadosMap = new Map();
  atividadesFiltradas.forEach(ativ => {
      const pId = ativ.projetoId || 'sem-projeto';
      if (!projetosAgrupadosMap.has(pId)) {
          projetosAgrupadosMap.set(pId, {
              id: pId,
              titulo: ativ.projetoNome || 'Atividades sem Projeto',
              cliente: ativ.clienteNome || '',
              color: getColorForProject(pId),
              atividades: []
          });
      }
      projetosAgrupadosMap.get(pId).atividades.push(ativ);
  });
  
  const projetosRenderList = Array.from(projetosAgrupadosMap.values());
  projetosRenderList.sort((p1, p2) => p1.titulo.localeCompare(p2.titulo));

  // --- MODAIS ---
  function handleNovo() {
    setEditId(null); setIsViewOnly(false); setEditType('tarefa');
    setForm({ ...initialForm, atividade_id: atividadesBase.length > 0 ? atividadesBase[0].id : "" });
    setShowModal(true);
  }
  function handleEdit(item, tipo) { setEditId(item.id); setIsViewOnly(false); setEditType(tipo); loadData(item, tipo); }
  
  function loadData(item, tipo) {
    setForm({ 
        titulo: item.titulo || "", descricao: item.descricao || "", 
        atividade_id: tipo === 'atividade' ? '' : (item.atividade_id || item.tarefa_id || ""), 
        responsavel_id: item.responsavel_id || "", estado: item.estado || "pendente", prioridade: item.prioridade || "normal", 
        data_inicio: item.data_inicio || "", data_limite: item.data_limite || item.data_fim || "" 
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    let tabela = 'tarefas';
    let finalPayload = {};

    if (editType === 'atividade') {
        tabela = 'atividades';
        finalPayload = { titulo: form.titulo, estado: form.estado, descricao: form.descricao, responsavel_id: form.responsavel_id || null, data_inicio: form.data_inicio || null, data_fim: form.data_limite || null };
    } else if (editType === 'tarefa') {
        tabela = 'tarefas';
        if (!form.atividade_id) return showToast("A Atividade Pai é obrigatória!", "error");
        finalPayload = { titulo: form.titulo, estado: form.estado, descricao: form.descricao, atividade_id: form.atividade_id, responsavel_id: form.responsavel_id || null, data_inicio: form.data_inicio || null, data_limite: form.data_limite || null, prioridade: form.prioridade };
    } else {
        tabela = 'subtarefas';
        finalPayload = { titulo: form.titulo, estado: form.estado, responsavel_id: form.responsavel_id || null, data_fim: form.data_limite || null };
    }
    
    try {
      if (editId) await supabase.from(tabela).update(finalPayload).eq("id", editId); 
      else await supabase.from(tabela).insert([finalPayload]); 
      showToast("Guardado com sucesso!"); setShowModal(false); fetchData(isAdmin);
    } catch (error) { showToast("Erro: " + error.message, "error"); }
  }

  async function handleAddTarefa(e, ativId) {
      e.preventDefault();
      if(!novaTarefaNome.nome?.trim()) return;
      await supabase.from("tarefas").insert([{ atividade_id: ativId, titulo: novaTarefaNome.nome, responsavel_id: user.id, estado: 'pendente' }]);
      setNovaTarefaNome({ ativId: null, nome: "" }); fetchData(isAdmin); showToast("Tarefa adicionada!");
  }

  async function handleAddSubtarefa(e, tarId) {
      e.preventDefault();
      if(!novaSubtarefaNome.nome?.trim()) return;
      await supabase.from("subtarefas").insert([{ tarefa_id: tarId, titulo: novaSubtarefaNome.nome, responsavel_id: user.id, estado: 'pendente' }]);
      setNovaSubtarefaNome({ tarId: null, nome: "" }); fetchData(isAdmin); showToast("Passo adicionado!");
  }

  const getPriorityBadge = (p) => { 
      const lower = (p || '').toLowerCase();
      if(lower==='urgente') return {bg: '#fee2e2', text: '#ef4444'}; 
      if(lower==='alta') return {bg: '#ffedd5', text: '#f97316'}; 
      return null; 
  }

  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 };
  const modalStyle = { background: '#fff', width: '95%', maxWidth: '600px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' };
  const modalHeaderStyle = { padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' };
  const modalBodyStyle = { padding: '24px', overflowY: 'auto', background: '#f8fafc' };
  const sectionTitleStyle = { fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', marginTop: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' };
  const inputGroupStyle = { marginBottom: '12px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', color: '#1e293b', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1400px', margin: '0 auto', padding: '15px'}}>
      
      {/* CABEÇALHO COM BOTÃO BRILHANTE */}
      <div style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em'}}>Tarefas de Projetos</h1>
            {activeTask && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#ef4444', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <span style={{width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite'}}></span> 
                    Em curso
                    <button onClick={handleStopTask} style={{background: 'white', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'4px', padding:'2px 6px', cursor:'pointer', fontWeight:'bold', marginLeft: '5px', fontSize: '0.7rem'}}>⏹ PARAR</button>
                </div>
            )}
        </div>
        <button onClick={handleNovo} className="btn-shine">+ Nova Tarefa</button>
      </div>

      {/* FILTROS */}
      <div style={{background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
        <div style={{flex: 2, minWidth: '200px', position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '0.85rem'}}>🔍</span>
            <input type="text" placeholder="Procurar..." value={busca} onChange={(e) => {setBusca(e.target.value); if(e.target.value){const obj={}; atividadesAgrupadas.forEach(a=>a.tarefas.forEach(t=>obj[t.id]=true)); setExpandedTasks(obj);}}} style={{width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box'}} />
        </div>
        
        {isAdmin && (
            <>
                <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} style={{flex: 1, minWidth: '120px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '0.85rem', color: '#475569'}}><option value="">Todos os Clientes</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.marca}</option>)}</select>
                <select value={filtroProjeto} onChange={(e) => setFiltroProjeto(e.target.value)} style={{flex: 1, minWidth: '120px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '0.85rem', color: '#475569'}}><option value="">Todos os Projetos</option>{projetosList.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select>
            </>
        )}
        <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: '600', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1'}}>
            <input type="checkbox" checked={mostrarConcluidos} onChange={(e) => setMostrarConcluidos(e.target.checked)} style={{width: '14px', height: '14px', accentColor: '#10b981', cursor: 'pointer'}} /> Mostrar Concluídos
        </label>
      </div>

      <div>
        {projetosRenderList.length > 0 ? (
            projetosRenderList.map(proj => {
                const limit = visibleLimits[proj.id] || 5;
                const visibleAtivs = proj.atividades.slice(0, limit);
                const hasMore = proj.atividades.length > limit;
                const canCollapse = limit > 5;

                return (
                    <div key={proj.id} style={{marginBottom: '45px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', paddingBottom: '8px', borderBottom: `2px solid ${proj.color}40`}}>
                            <div style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: proj.color}}></div>
                            <h2 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '800'}}>{proj.titulo}</h2>
                            {proj.cliente && <span style={{fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'}}>{proj.cliente}</span>}
                        </div>

                        <div className="project-grid">
                            {visibleAtivs.map(ativ => {
                                const isAtivCompleted = ativ.estado === 'concluido';
                                const ativTime = getActivityTime(ativ);

                                return (
                                    <div key={ativ.id} style={{background: 'white', borderRadius: '10px', border: `1px solid ${isAtivCompleted ? '#e2e8f0' : proj.color}60`, borderTop: `4px solid ${isAtivCompleted ? '#cbd5e1' : proj.color}`, boxShadow: '0 2px 5px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', opacity: isAtivCompleted ? 0.6 : 1, transition: '0.2s', maxHeight: '400px'}}>
                                        
                                        <div style={{padding: '12px 15px', background: isAtivCompleted ? '#f8fafc' : 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                            <div style={{flex: 1, paddingRight: '10px'}}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                                    <div onClick={() => handleToggleStatus('atividades', ativ.id, ativ.estado)} style={{width: '16px', height: '16px', borderRadius: '4px', border: isAtivCompleted ? 'none' : `2px solid ${proj.color}80`, background: isAtivCompleted ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', flexShrink: 0, fontSize: '0.7rem'}}>
                                                        {isAtivCompleted && '✓'}
                                                    </div>
                                                    <h3 onClick={() => handleEdit(ativ, 'atividade')} style={{margin: 0, fontSize: '0.9rem', fontWeight: '700', color: isAtivCompleted ? '#94a3b8' : '#1e293b', cursor: 'pointer', textDecoration: isAtivCompleted ? 'line-through' : 'none', lineHeight: '1.2'}} className="hover-text-blue">
                                                        {ativ.titulo}
                                                    </h3>
                                                </div>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                                    {renderDeadline(ativ.data_fim, isAtivCompleted)}
                                                    {ativTime > 0 && <span style={{fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold'}}>⏱ {formatTime(ativTime)}</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => openDeleteConfirm("atividades", ativ.id, ativ.titulo)} className="icon-btn-red" style={{fontSize: '0.9rem', padding: '2px'}}>🗑️</button>
                                        </div>

                                        {!isAtivCompleted && (
                                            <div style={{padding: '10px', overflowY: 'auto', flex: 1}} className="custom-scrollbar">
                                                {(!ativ.tarefas || ativ.tarefas.length === 0) ? (
                                                    <div style={{fontSize: '0.75rem', color: '#cbd5e1', textAlign: 'center', padding: '10px'}}>Sem tarefas</div>
                                                ) : (
                                                    ativ.tarefas.map(tar => {
                                                        const isTarCompleted = tar.estado === 'concluido';
                                                        const isTimerActive = activeTask && activeTask.task_id === tar.id;
                                                        const isExpanded = expandedTasks[tar.id];
                                                        const subsToRender = tar.subtarefas;

                                                        return (
                                                            <div key={tar.id} style={{background: isTimerActive ? '#fefce8' : '#f8fafc', border: isTimerActive ? '1px solid #eab308' : '1px solid transparent', borderRadius: '6px', padding: '8px', marginBottom: '6px', opacity: isTarCompleted ? 0.6 : 1, transition: '0.2s'}}>
                                                                <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px'}}>
                                                                    
                                                                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1}}>
                                                                        <div onClick={() => handleToggleStatus('tarefas', tar.id, tar.estado, tar.id)} style={{ width: '14px', height: '14px', borderRadius: '50%', cursor: 'pointer', border: isTarCompleted ? 'none' : '2px solid #cbd5e1', background: isTarCompleted ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem', flexShrink: 0, marginTop: '2px' }}>
                                                                            {isTarCompleted && '✓'}
                                                                        </div>
                                                                        <div style={{flex: 1}}>
                                                                            <span onClick={() => handleEdit(tar, 'tarefa')} style={{textDecoration: isTarCompleted ? 'line-through' : 'none', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '0.8rem', lineHeight: '1.2', display: 'block', marginBottom: '4px'}} className="hover-underline">
                                                                                {tar.titulo}
                                                                            </span>
                                                                            <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center'}}>
                                                                                {renderDeadline(tar.data_limite, isTarCompleted)}
                                                                                {subsToRender.length > 0 && (
                                                                                    <span onClick={() => toggleExpand(tar.id)} style={{fontSize: '0.6rem', background: '#e2e8f0', color: '#475569', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>
                                                                                        📋 {subsToRender.filter(s=>s.estado==='concluido').length}/{subsToRender.length} {isExpanded ? '▲' : '▼'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end'}}>
                                                                        {!tar.is_readonly_parent && (
                                                                            <button onClick={() => isTimerActive ? handleStopTask() : handleStartTask(tar)} style={{ background: isTimerActive ? '#fee2e2' : 'white', color: isTimerActive ? '#ef4444' : '#64748b', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center'}}>
                                                                                {isTimerActive ? '⏹' : '▶'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {isExpanded && subsToRender.length > 0 && (
                                                                    <div style={{marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', paddingLeft: '20px'}}>
                                                                        {subsToRender.map(sub => {
                                                                            const isSubCompleted = sub.estado === 'concluido';
                                                                            return (
                                                                                <div key={sub.id} style={{display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px', opacity: isSubCompleted ? 0.6 : 1}}>
                                                                                    <input type="checkbox" checked={isSubCompleted} onChange={() => handleToggleStatus('subtarefas', sub.id, sub.estado, tar.id)} style={{width: '12px', height: '12px', cursor: 'pointer', accentColor: '#3b82f6', marginTop: '2px'}} />
                                                                                    <div style={{flex: 1}}>
                                                                                        <span onClick={() => handleEdit(sub, 'subtarefa')} style={{textDecoration: isSubCompleted ? 'line-through' : 'none', color: '#475569', fontWeight: '500', cursor: 'pointer', fontSize: '0.75rem', lineHeight: '1.2', display: 'block'}} className="hover-underline">
                                                                                            {sub.titulo}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                        <form onSubmit={(e) => handleAddSubtarefa(e, tar.id)} style={{marginTop: '6px'}}>
                                                                            <input type="text" placeholder="+ Passo..." value={novaSubtarefaNome.tarId === tar.id ? novaSubtarefaNome.nome : ""} onChange={e => setNovaSubtarefaNome({ tarId: tar.id, nome: e.target.value })} style={{width: '100%', padding: '4px', background: 'transparent', border: 'none', borderBottom: '1px solid #cbd5e1', outline: 'none', fontSize: '0.7rem', color: '#475569'}} />
                                                                        </form>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                                
                                                <form onSubmit={(e) => handleAddTarefa(e, ativ.id)} style={{marginTop: '10px'}}>
                                                    <input type="text" placeholder="+ Tarefa (Enter)..." value={novaTarefaNome.ativId === ativ.id ? novaTarefaNome.nome : ""} onChange={e => setNovaTarefaNome({ ativId: ativ.id, nome: e.target.value })} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px dashed #cbd5e1', background: 'transparent', outline: 'none', fontSize: '0.75rem', color: '#64748b', fontWeight: '500'}} />
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        {(hasMore || canCollapse) && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
                                {hasMore && (
                                    <button onClick={() => setVisibleLimits(prev => ({...prev, [proj.id]: limit + 5}))} style={{ background: 'white', color: proj.color, border: `1px solid ${proj.color}40`, padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s' }} className="hover-shadow">
                                        ↓ Ver mais ({proj.atividades.length - limit})
                                    </button>
                                )}
                                {canCollapse && (
                                    <button onClick={() => setVisibleLimits(prev => ({...prev, [proj.id]: 5}))} style={{ background: '#f8fafc', color: '#64748b', border: `1px solid #cbd5e1`, padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s' }} className="hover-shadow">
                                        ↑ Recolher
                                    </button>
                                )}
                            </div>
                        )}

                    </div>
                );
            })
        ) : (
            <div style={{textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b'}}>
                <span style={{fontSize: '2rem', display: 'block', marginBottom: '10px'}}>🏖️</span>
                <h3 style={{margin: '0 0 5px 0', color: '#1e293b', fontSize: '1.2rem'}}>Tudo limpo!</h3>
                <p style={{margin: 0, fontSize: '0.9rem'}}>Não tens tarefas de projeto pendentes com os filtros atuais.</p>
            </div>
        )}
      </div>

      {deleteConfirm.show && (
          <ModalPortal>
              <div style={modalOverlayStyle} onClick={() => setDeleteConfirm({show:false, tabela:'', id:null, titulo:''})}>
                  <div style={{background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}} onClick={e => e.stopPropagation()}>
                      <div style={{fontSize: '3rem', marginBottom: '10px'}}>⚠️</div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.2rem'}}>Apagar Item?</h3>
                      <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '25px'}}>
                          Tens a certeza que queres apagar <strong>"{deleteConfirm.titulo}"</strong>? Esta ação não pode ser desfeita.
                      </p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setDeleteConfirm({show:false, tabela:'', id:null, titulo:''})} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer'}}>Cancelar</button>
                          <button onClick={executeDelete} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer'}}>Sim, Apagar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {showModal && (
        <ModalPortal>
          <div style={modalOverlayStyle} onClick={(e) => { if(e.target === e.currentTarget) setShowModal(false); }}>
            <div style={modalStyle}>
              <div style={modalHeaderStyle}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{background: '#eff6ff', padding: '6px', borderRadius: '8px', fontSize: '1.1rem'}}>{isViewOnly ? '👁️' : (editId ? '✎' : '✨')}</span>
                    <div>
                        <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem'}}>{isViewOnly ? "Detalhes" : (editId ? `Editar ${editType.charAt(0).toUpperCase() + editType.slice(1)}` : "Nova Tarefa")}</h3>
                    </div>
                </div>
                <button onClick={() => setShowModal(false)} style={{background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8'}}>✕</button>
              </div>
              <div style={modalBodyStyle}>
                <form onSubmit={handleSubmit}>
                  <fieldset disabled={isViewOnly} style={{border:'none', padding:0, margin:0}}>
                    
                    <div style={{marginBottom: '15px'}}>
                        <label style={labelStyle}>Título *</label>
                        <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required placeholder="Escreva aqui..." style={{...inputStyle, fontWeight: 'bold'}} />
                    </div>

                    {editType !== 'atividade' && (
                        <div style={sectionTitleStyle}>📌 Enquadramento</div>
                    )}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                        {editType === 'tarefa' && (
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Atividade / Projeto Pai *</label>
                                <select value={form.atividade_id} onChange={e => setForm({...form, atividade_id: e.target.value})} required={editType === 'tarefa'} style={inputStyle}><option value="">-- Selecione --</option>{atividadesBase.map(a => <option key={a.id} value={a.id}>{a.titulo} (Proj: {a.projetos?.titulo})</option>)}</select>
                            </div>
                        )}
                        
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Responsável</label>
                            <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})} style={inputStyle}><option value="">-- Selecione --</option>{staff.map(s => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}</select>
                        </div>

                        {editType === 'tarefa' && (
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Prioridade</label>
                                <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})} style={inputStyle}><option value="baixa">🟢 Baixa</option><option value="normal">🔵 Normal</option><option value="alta">🟠 Alta</option><option value="urgente">🔴 Urgente</option></select>
                            </div>
                        )}
                    </div>

                    <div style={sectionTitleStyle}>📅 Planeamento & Estado</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                        {(editType === 'tarefa' || editType === 'atividade') && (<div style={inputGroupStyle}><label style={labelStyle}>Início</label><input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} /></div>)}
                        <div style={inputGroupStyle}><label style={labelStyle}>Deadline</label><input type="date" value={form.data_limite} onChange={e => setForm({...form, data_limite: e.target.value})} style={{...inputStyle, borderColor: form.data_limite ? '#fca5a5' : '#cbd5e1'}} /></div>
                    </div>

                    <div style={{marginBottom: '15px'}}>
                        <label style={labelStyle}>Estado Atual</label>
                        <div style={{display: 'flex', gap: '8px'}}>
                            {['pendente', 'em_curso', 'concluido', 'cancelado'].map(st => (
                                <div key={st} onClick={() => !isViewOnly && setForm({...form, estado: st})} style={{flex: 1, textAlign: 'center', padding: '8px', borderRadius: '6px', cursor: isViewOnly ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: '700', background: form.estado === st ? '#2563eb' : '#fff', color: form.estado === st ? 'white' : '#64748b', border: form.estado === st ? '1px solid #2563eb' : '1px solid #cbd5e1', transition: 'all 0.2s', textTransform: 'uppercase'}}>
                                    {st.replace('_', ' ')}
                                </div>
                            ))}
                        </div>
                    </div>

                    {editType !== 'subtarefa' && (
                        <>
                            <div style={sectionTitleStyle}>📝 Detalhes</div>
                            <div style={inputGroupStyle}>
                                <textarea rows="3" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descrição / Notas..." style={{...inputStyle, resize: 'vertical', minHeight: '80px'}} />
                            </div>
                        </>
                    )}
                  </fieldset>

                  {!isViewOnly && (
                      <div style={{display: 'flex', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0'}}>
                          <button type="button" onClick={() => setShowModal(false)} style={{flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'}}>Cancelar</button>
                          <button type="submit" style={{flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'}}>{editId ? "💾 Guardar Alterações" : "🚀 Criar"}</button>
                      </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <style>{`
          .project-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; }
          @media (max-width: 1300px) { .project-grid { grid-template-columns: repeat(4, 1fr); } }
          @media (max-width: 1000px) { .project-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 768px)  { .project-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 500px)  { .project-grid { grid-template-columns: 1fr; } }

          .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

          .hover-shadow:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateY(-1px); }

          @keyframes pulse { 0% {box-shadow:0 0 0 0 rgba(239,68,68,0.7)} 70% {box-shadow:0 0 0 6px rgba(239,68,68,0)} 100% {box-shadow:0 0 0 0 rgba(239,68,68,0)}} 
          
          .hover-underline:hover {text-decoration: underline !important; color: #2563eb !important} 
          .hover-text-blue:hover { color: #2563eb !important; }
          
          /* BOTÃO BRILHANTE / GLOW (Da esquerda para a direita) */
          .btn-shine {
              position: relative;
              overflow: hidden;
              background: #10b981;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: bold;
              font-size: 0.85rem;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
              transition: all 0.3s ease;
          }
          .btn-shine::after {
              content: '';
              position: absolute;
              top: 0;
              left: -150%;
              width: 50%;
              height: 100%;
              background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
              transform: skewX(-25deg);
              transition: left 0.7s ease-in-out;
          }
          .btn-shine:hover {
              background: #059669;
              transform: translateY(-1px);
              box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
          }
          .btn-shine:hover::after {
              animation: shine-sweep 1.2s infinite alternate ease-in-out;
          }
          @keyframes shine-sweep {
              0% { left: -150%; }
              100% { left: 200%; }
          }
          
          .icon-btn-orange {background: transparent; border: none; cursor: pointer; color: #f97316; font-size: 1.1rem; padding: 2px 6px; border-radius: 4px; transition: 0.2s;}
          .icon-btn-orange:hover {background: #ffedd5; transform: scale(1.1);}
          
          .icon-btn-red {background: transparent; border: none; cursor: pointer; color: #f87171; font-size: 1.1rem; padding: 2px 6px; border-radius: 4px; transition: 0.2s;}
          .icon-btn-red:hover {background: #fef2f2; color: #dc2626; transform: scale(1.1);}

          .icon-btn-gray {background: transparent; border: none; cursor: pointer; color: #94a3b8; font-size: 1.4rem; padding: 2px 6px; border-radius: 4px; transition: 0.2s; line-height: 1;}
          .icon-btn-gray:hover {background: #f1f5f9; color: #ef4444; transform: scale(1.1);}
      `}</style>
    </div>
  );
}