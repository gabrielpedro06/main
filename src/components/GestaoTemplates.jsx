import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";
import "../styles/templates.css";

// --- ÍCONES SVG (Premium & Minimalistas) ---
const Icons = {
    Folder: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>,
    Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6"/><path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2"/></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    Doc: () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    ArrowRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    SubArrow: () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a10 10 0 0 1 10-10h8"/><path d="m17 2 3-3 3 3"/></svg>,
    Close: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    Empty: () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    Grip: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.3, cursor: 'grab'}}><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
};

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function GestaoTemplates() {
  const [tipos, setTipos] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [subtarefas, setSubtarefas] = useState([]); 

  const [selectedTipo, setSelectedTipo] = useState(null);
  const [selectedAtiv, setSelectedAtiv] = useState(null);

  const [loading, setLoading] = useState(true);
  
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', confirmText: 'Apagar', onConfirm: null });
  const [notification, setNotification] = useState(null);

  // Estados do Modal
  const [modalConfig, setModalConfig] = useState({ 
      isOpen: false, mode: 'create', tipo: '', itemId: null, parentId: null, parentName: '' 
  });
  
  const [inputValue, setInputValue] = useState("");
  const [inputOrdem, setInputOrdem] = useState(1);
  const [inputDias, setInputDias] = useState(0);
  const [inputDescricao, setInputDescricao] = useState("");
  const [inputEhFormacao, setInputEhFormacao] = useState(false);
    const [inputTemPrograma, setInputTemPrograma] = useState(false);
    const [inputDefaultNumHoras, setInputDefaultNumHoras] = useState(0);
    const [inputDefaultBaseEurHora, setInputDefaultBaseEurHora] = useState(0);
    const [inputDepAtividadeId, setInputDepAtividadeId] = useState("");
    const [inputDepTarefaId, setInputDepTarefaId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Novos estados para info adicional
    const [exigeInfoAdicional, setExigeInfoAdicional] = useState(false);
    const [camposInfoAdicional, setCamposInfoAdicional] = useState({
        investimento: false,
        financiamento: false,
        incentivo: false,
        data_prevista_aprovacao: false
    });

  // --- REFS PARA DRAG AND DROP ---
  const dragItemIndex = useRef(null);
  const dragOverItemIndex = useRef(null);

  useEffect(() => { fetchTipos(); }, []);

  useEffect(() => {
    if (selectedTipo) {
        fetchAtividades(selectedTipo.id);
        setSelectedAtiv(null); setTarefas([]); setSubtarefas([]);
    } else { 
        setAtividades([]); setSelectedAtiv(null); setTarefas([]); setSubtarefas([]); 
    }
  }, [selectedTipo]);

  useEffect(() => {
    if (selectedAtiv) fetchTarefasE_Subtarefas(selectedAtiv.id);
    else { setTarefas([]); setSubtarefas([]); }
  }, [selectedAtiv]);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const createsCircularDependency = (items, currentId, dependencyId, dependencyKey) => {
      if (!currentId || !dependencyId) return false;

      let cursor = dependencyId;
      const visited = new Set([String(currentId)]);

      while (cursor) {
          const normalized = String(cursor);
          if (visited.has(normalized)) return true;
          visited.add(normalized);

          const node = items.find((entry) => String(entry.id) === normalized);
          if (!node) return false;
          cursor = node[dependencyKey] || null;
      }

      return false;
  };

  const normalizeTarefaDependenciesAfterReorder = (orderedTarefas) => {
      let clearedCount = 0;

      const ordemById = new Map(
          orderedTarefas.map((t) => [String(t.id), Number(t.ordem) || 0])
      );

      const normalized = orderedTarefas.map((t) => {
          const depId = t.depende_de_template_tarefa_id;
          if (!depId) return t;

          const depOrdem = ordemById.get(String(depId));
          const currentOrdem = Number(t.ordem) || 0;
          const isValid = depOrdem && depOrdem < currentOrdem;

          if (isValid) return t;
          clearedCount += 1;
          return { ...t, depende_de_template_tarefa_id: null };
      });

      return { normalized, clearedCount };
  };

  const normalizeAtividadeDependenciesAfterReorder = (orderedAtividades) => {
      let clearedCount = 0;

      const ordemById = new Map(
          orderedAtividades.map((a) => [String(a.id), Number(a.ordem) || 0])
      );

      const normalized = orderedAtividades.map((a) => {
          const depId = a.depende_de_template_atividade_id;
          if (!depId) return a;

          const depOrdem = ordemById.get(String(depId));
          const currentOrdem = Number(a.ordem) || 0;
          const isValid = depOrdem && depOrdem < currentOrdem;

          if (isValid) return a;
          clearedCount += 1;
          return { ...a, depende_de_template_atividade_id: null };
      });

      return { normalized, clearedCount };
  };

  async function fetchTipos() {
    setLoading(true); 
    try {
        const { data, error } = await supabase.from("tipos_projeto").select("*").order("nome");
        if (error) throw error;
        setTipos(data || []);
    } catch (err) { showToast("Erro ao carregar Tipos.", "error"); setTipos([]); } 
    finally { setLoading(false); }
  }

  async function fetchAtividades(tipoId) {
    try {
        const { data, error } = await supabase.from("template_atividades").select("*").eq("tipo_projeto_id", tipoId).order("ordem", { ascending: true }).order("created_at", { ascending: true });
        if (error) throw error;
        setAtividades(data || []);
    } catch (err) { setAtividades([]); }
  }

  async function fetchTarefasE_Subtarefas(ativId) {
    try {
        const { data: dataTarefas, error } = await supabase.from("template_tarefas").select("*").eq("template_atividade_id", ativId).order("ordem", { ascending: true }).order("created_at", { ascending: true });
        if (error) throw error;
        
        const tarefasFetched = dataTarefas || [];
        setTarefas(tarefasFetched);

        if (tarefasFetched.length > 0) {
            const idsTarefas = tarefasFetched.map(t => t.id);
            const { data: dataSub } = await supabase.from("template_subtarefas").select("*").in("template_tarefa_id", idsTarefas).order("ordem", { ascending: true }).order("created_at", { ascending: true });
            setSubtarefas(dataSub || []);
        } else {
            setSubtarefas([]);
        }
    } catch (err) { setTarefas([]); setSubtarefas([]); }
  }

  // --- LÓGICA DE DRAG & DROP (REORDENAR) ---
  const handleDragStart = (index) => {
      dragItemIndex.current = index;
  };

  const handleDragEnter = (index) => {
      dragOverItemIndex.current = index;
  };

  const handleDragEndAtividades = async () => {
      const copyListItems = [...atividades];
      const dragItemContent = copyListItems[dragItemIndex.current];
      copyListItems.splice(dragItemIndex.current, 1);
      copyListItems.splice(dragOverItemIndex.current, 0, dragItemContent);
      dragItemIndex.current = null;
      dragOverItemIndex.current = null;

      const updatedList = copyListItems.map((item, idx) => ({ ...item, ordem: idx + 1 }));
      const { normalized, clearedCount } = normalizeAtividadeDependenciesAfterReorder(updatedList);
      setAtividades(normalized);

      for (const item of normalized) {
          await supabase
              .from('template_atividades')
              .update({ ordem: item.ordem, depende_de_template_atividade_id: item.depende_de_template_atividade_id || null })
              .eq('id', item.id);
      }

      if (clearedCount > 0) {
          showToast(`Reordenação removeu ${clearedCount} dependência(s) inválida(s).`, 'error');
      }
  };

  const handleDragEndTarefas = async () => {
      const copyListItems = [...tarefas];
      const dragItemContent = copyListItems[dragItemIndex.current];
      copyListItems.splice(dragItemIndex.current, 1);
      copyListItems.splice(dragOverItemIndex.current, 0, dragItemContent);
      dragItemIndex.current = null;
      dragOverItemIndex.current = null;

      const updatedList = copyListItems.map((item, idx) => ({ ...item, ordem: idx + 1 }));
      const { normalized, clearedCount } = normalizeTarefaDependenciesAfterReorder(updatedList);
      setTarefas(normalized);

      for (const item of normalized) {
          await supabase
              .from('template_tarefas')
              .update({ ordem: item.ordem, depende_de_template_tarefa_id: item.depende_de_template_tarefa_id || null })
              .eq('id', item.id);
      }

      if (clearedCount > 0) {
          showToast(`Reordenação removeu ${clearedCount} dependência(s) inválida(s).`, 'error');
      }
  };

  const handleDragEndSubtarefas = async (parentTarefaId) => {
      const subsDaTarefa = subtarefas.filter(st => st.template_tarefa_id === parentTarefaId);
      const copyListItems = [...subsDaTarefa];
      
      const dragItemContent = copyListItems[dragItemIndex.current];
      copyListItems.splice(dragItemIndex.current, 1);
      copyListItems.splice(dragOverItemIndex.current, 0, dragItemContent);
      dragItemIndex.current = null;
      dragOverItemIndex.current = null;

      const updatedLocalList = copyListItems.map((item, idx) => ({ ...item, ordem: idx + 1 }));
      
      setSubtarefas(prev => {
          const outras = prev.filter(st => st.template_tarefa_id !== parentTarefaId);
          return [...outras, ...updatedLocalList].sort((a,b)=>a.ordem-b.ordem);
      });

      for (const item of updatedLocalList) {
          await supabase.from('template_subtarefas').update({ ordem: item.ordem }).eq('id', item.id);
      }
  };

  // --- MODAIS ---
    const openCreateModal = (tipo, parentId = null, parentName = '') => {
            setInputValue("");
            setInputDias(0);
            setInputDescricao("");
            setInputTemPrograma(false);
            setInputEhFormacao(false);
            setInputDefaultNumHoras(0);
            setInputDefaultBaseEurHora(50);
            setInputDepAtividadeId("");
            setInputDepTarefaId("");
            setExigeInfoAdicional(false);
            setCamposInfoAdicional({
                investimento: false,
                financiamento: false,
                incentivo: false,
                data_prevista_aprovacao: false
            });
            setModalConfig({ isOpen: true, mode: 'create', tipo, itemId: null, parentId, parentName });
    };

    const openEditModal = (tipo, item) => {
            setInputValue(item.nome || item.titulo); 
            setInputDias(item.dias_estimados || 0);
            setInputDescricao(item.descricao || "");
            setInputTemPrograma(!!item.tem_programa);
            setInputEhFormacao(!!item.eh_formacao);
            setInputDefaultNumHoras(Number(item.default_num_horas || 0));
            setInputDefaultBaseEurHora(Number(item.default_base_eur_hora || 50));
            setInputDepAtividadeId(item.depende_de_template_atividade_id || "");
            setInputDepTarefaId(item.depende_de_template_tarefa_id || "");
            // Carregar info adicional se existir
            let info = item.info_adicional || {};
            setExigeInfoAdicional(!!info.exige);
            setCamposInfoAdicional({
                investimento: !!(info.campos && info.campos.includes("investimento")),
                financiamento: !!(info.campos && info.campos.includes("financiamento")),
                incentivo: !!(info.campos && info.campos.includes("incentivo")),
                data_prevista_aprovacao: !!(info.campos && info.campos.includes("data_prevista_aprovacao"))
            });
            setModalConfig({ isOpen: true, mode: 'edit', tipo, itemId: item.id, parentId: null, parentName: '' });
    };

  const closeModal = () => {
      setModalConfig({ isOpen: false, mode: 'create', tipo: '', itemId: null, parentId: null, parentName: '' });
      setInputValue(""); setInputDias(0); setInputDescricao("");
      setInputTemPrograma(false);
      setInputDefaultNumHoras(0);
      setInputDefaultBaseEurHora(50);
      setInputDepAtividadeId(""); setInputDepTarefaId("");
  };

  async function handleModalSubmit(e) {
      e.preventDefault();
      if (!inputValue.trim()) return;
      setIsSubmitting(true);

      try {
          const isEdit = modalConfig.mode === 'edit';
          const diasNum = parseInt(inputDias, 10) || 0;
          // Monta info_adicional se for etapa ou tarefa
          let infoAdicional = null;
          if (modalConfig.tipo === 'atividade' || modalConfig.tipo === 'tarefa') {
            if (exigeInfoAdicional) {
              const campos = Object.entries(camposInfoAdicional).filter(([k, v]) => v).map(([k]) => k);
              infoAdicional = { exige: true, campos };
            } else {
              infoAdicional = { exige: false, campos: [] };
            }
          }

          if (modalConfig.tipo === 'tipo_projeto') {
              if (inputTemPrograma) {
                  const { count, error: programasError } = await supabase
                      .from("programas_financiamento")
                      .select("id", { count: "exact", head: true })
                      .eq("ativo", true);
                  if (programasError) throw programasError;
                  if ((count || 0) < 1) {
                      showToast("Para ativar 'Tem Programa', é preciso pelo menos 1 programa ativo.", "error");
                      return;
                  }
              }

              const payload = {
                  nome: inputValue,
                  tem_programa: inputTemPrograma,
                  eh_formacao: inputEhFormacao,
                  default_num_horas: Number(inputDefaultNumHoras || 0),
                  default_base_eur_hora: Number(inputDefaultBaseEurHora || 0),
              };
              if (isEdit) {
                  await supabase.from("tipos_projeto").update(payload).eq("id", modalConfig.itemId);
                  setTipos(tipos.map(t => t.id === modalConfig.itemId ? { ...t, ...payload } : t));
                  if(selectedTipo?.id === modalConfig.itemId) setSelectedTipo({...selectedTipo, ...payload});
                  showToast("Tipo atualizado!");
              } else {
                  const { data } = await supabase.from("tipos_projeto").insert([payload]).select().single();
                  if(data) setTipos([...tipos, data]);
                  showToast("Tipo criado!");
              }
          } 
          else if (modalConfig.tipo === 'atividade') {
              const dependencyId = inputDepAtividadeId || null;
              const payload = { nome: inputValue, dias_estimados: diasNum, descricao: inputDescricao, info_adicional: infoAdicional, depende_de_template_atividade_id: dependencyId };
              if (!isEdit) payload.ordem = atividades.length + 1;

              const atividadeAtual = atividades.find((a) => String(a.id) === String(modalConfig.itemId));
              const currentOrdem = isEdit ? Number(atividadeAtual?.ordem || 0) : atividades.length + 1;

              if (dependencyId) {
                  const dependencyAtividade = atividades.find((a) => String(a.id) === String(dependencyId));
                  if (!dependencyAtividade) {
                      showToast("Dependência inválida: etapa não encontrada neste modelo.", "error");
                      return;
                  }

                  if (Number(dependencyAtividade.ordem || 0) >= currentOrdem) {
                      showToast("Dependência inválida: só podes depender de etapas anteriores.", "error");
                      return;
                  }
              }

              if (isEdit && dependencyId && createsCircularDependency(atividades, modalConfig.itemId, dependencyId, 'depende_de_template_atividade_id')) {
                  showToast("Dependência inválida: gera ciclo entre etapas.", "error");
                  return;
              }

              if (isEdit) {
                  await supabase.from("template_atividades").update(payload).eq("id", modalConfig.itemId);
                  setAtividades(atividades.map(a => a.id === modalConfig.itemId ? { ...a, ...payload } : a));
                  if(selectedAtiv?.id === modalConfig.itemId) setSelectedAtiv({...selectedAtiv, ...payload});
                  showToast("Etapa atualizada!");
              } else {
                  const { data } = await supabase.from("template_atividades").insert([{ ...payload, tipo_projeto_id: modalConfig.parentId }]).select().single();
                  if(data) setAtividades([...atividades, data]);
                  showToast("Etapa criada!");
              }
          } 
          else if (modalConfig.tipo === 'tarefa') {
              const dependencyId = inputDepTarefaId || null;
              const payload = { nome: inputValue, dias_estimados: diasNum, descricao: inputDescricao, info_adicional: infoAdicional, depende_de_template_tarefa_id: dependencyId };
              if (!isEdit) payload.ordem = tarefas.length + 1;

              const tarefaAtual = tarefas.find((t) => String(t.id) === String(modalConfig.itemId));
              const currentOrdem = isEdit ? Number(tarefaAtual?.ordem || 0) : tarefas.length + 1;

              if (dependencyId) {
                  const dependencyTask = tarefas.find((t) => String(t.id) === String(dependencyId));
                  if (!dependencyTask) {
                      showToast("Dependência inválida: tarefa não encontrada nesta etapa.", "error");
                      return;
                  }

                  if (Number(dependencyTask.ordem || 0) >= currentOrdem) {
                      showToast("Dependência inválida: só podes depender de tarefas anteriores.", "error");
                      return;
                  }
              }

              if (isEdit && dependencyId && createsCircularDependency(tarefas, modalConfig.itemId, dependencyId, 'depende_de_template_tarefa_id')) {
                  showToast("Dependência inválida: gera ciclo entre tarefas.", "error");
                  return;
              }

              if (isEdit) {
                  await supabase.from("template_tarefas").update(payload).eq("id", modalConfig.itemId);
                  setTarefas(tarefas.map(t => t.id === modalConfig.itemId ? { ...t, ...payload } : t));
                  showToast("Tarefa atualizada!");
              } else {
                  const { data } = await supabase.from("template_tarefas").insert([{ ...payload, template_atividade_id: modalConfig.parentId }]).select().single();
                  if(data) setTarefas([...tarefas, data]);
                  showToast("Tarefa criada!");
              }
          }
          else if (modalConfig.tipo === 'subtarefa') {
              const payload = { nome: inputValue, dias_estimados: diasNum, descricao: inputDescricao }; 
              if (!isEdit) payload.ordem = subtarefas.filter(s => s.template_tarefa_id === modalConfig.parentId).length + 1;

              if (isEdit) {
                  await supabase.from("template_subtarefas").update(payload).eq("id", modalConfig.itemId);
                  setSubtarefas(subtarefas.map(s => s.id === modalConfig.itemId ? { ...s, ...payload } : s));
                  showToast("Passo atualizado!");
              } else {
                  const { data } = await supabase.from("template_subtarefas").insert([{ ...payload, template_tarefa_id: modalConfig.parentId }]).select().single();
                  if(data) setSubtarefas([...subtarefas, data]);
                  showToast("Passo adicionado!");
              }
          }
          closeModal();
      } catch (err) { showToast("Erro: " + err.message, "error"); } 
      finally { setIsSubmitting(false); }
  }

  function askDelete(tabela, id, stateSetter, listaAtual, isTipo = false, isAtiv = false) {
      setConfirmDialog({
          show: true,
          message: "Ao apagar este item, todos os seus sub-itens também serão eliminados.\nEsta ação é irreversível.",
          confirmText: "Sim, Apagar",
          onConfirm: async () => {
              setConfirmDialog({ show: false, message: '', confirmText: '', onConfirm: null });
              const { error } = await supabase.from(tabela).delete().eq("id", id);
              if (!error) {
                  const newLista = listaAtual.filter(i => i.id !== id).map((item, idx) => ({...item, ordem: idx + 1}));
                  stateSetter(newLista);
                  
                  for(const item of newLista) {
                      await supabase.from(tabela).update({ ordem: item.ordem }).eq('id', item.id);
                  }

                  if (isTipo && selectedTipo?.id === id) setSelectedTipo(null);
                  if (isAtiv && selectedAtiv?.id === id) setSelectedAtiv(null);
                  if (tabela === 'template_tarefas') setSubtarefas(subtarefas.filter(st => st.template_tarefa_id !== id));
                  
                  showToast("Item apagado.");
              } else {
                  showToast("Erro ao apagar. " + error.message, "error");
              }
          }
      });
  }

  const getModalTitle = () => {
      if (modalConfig.mode === 'edit') return "Editar Registo";
      switch(modalConfig.tipo) {
          case 'tipo_projeto': return "Novo Modelo";
          case 'atividade': return "Nova Etapa";
          case 'tarefa': return "Nova Tarefa";
          case 'subtarefa': return "Novo Passo";
          default: return "Adicionar";
      }
  };

  const getModalSubtitle = () => {
      if (modalConfig.mode === 'edit') return "Altera as definições deste template. Só afetará novos projetos criados no futuro.";
      switch(modalConfig.tipo) {
          case 'tipo_projeto': return "Cria um novo molde estrutural para projetos recorrentes.";
          case 'atividade': return `A ser inserido no modelo: ${modalConfig.parentName}`;
          case 'tarefa': return `A ser inserido na etapa: ${modalConfig.parentName}`;
          case 'subtarefa': return `Passo integrado na tarefa: ${modalConfig.parentName}`;
          default: return "";
      }
  };

  const getAtividadeDependencyLabel = (atividade) => {
      if (!atividade?.depende_de_template_atividade_id) return null;
      const dependeDe = atividades.find((a) => String(a.id) === String(atividade.depende_de_template_atividade_id));
      if (!dependeDe) return "Dependência externa";
      return `Depende de: ${dependeDe.ordem}. ${dependeDe.nome}`;
  };

  const getTarefaDependencyLabel = (tarefa) => {
      if (!tarefa?.depende_de_template_tarefa_id) return null;
      const dependeDe = tarefas.find((t) => String(t.id) === String(tarefa.depende_de_template_tarefa_id));
      if (!dependeDe) return "Dependência externa";
      return `Depende de: ${dependeDe.ordem}. ${dependeDe.nome}`;
  };

  const tarefaModalCurrentOrdem = modalConfig.tipo === 'tarefa'
      ? (modalConfig.mode === 'edit'
          ? Number(tarefas.find((t) => String(t.id) === String(modalConfig.itemId))?.ordem || 0)
          : tarefas.length + 1)
      : null;

  const atividadeModalCurrentOrdem = modalConfig.tipo === 'atividade'
      ? (modalConfig.mode === 'edit'
          ? Number(atividades.find((a) => String(a.id) === String(modalConfig.itemId))?.ordem || 0)
          : atividades.length + 1)
      : null;

  const TIPO_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#84cc16'];
  const tipoColor = (id) => {
      const hash = String(id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      return TIPO_COLORS[hash % TIPO_COLORS.length];
  };
  const initialsOf = (txt) => String(txt || '?').replace(/[[\]()\-–]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const totalDiasEtapas = atividades.reduce((acc, a) => acc + (Number(a.dias_estimados) || 0), 0);

  const renderSwitch = (id, checked, onChange, label, hint) => (
      <label htmlFor={id} className={`gm-switch ${checked ? 'is-on' : ''}`}>
          <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          <span className="gm-switch-track"><span /></span>
          <span className="gm-switch-text"><strong>{label}</strong>{hint && <em>{hint}</em>}</span>
      </label>
  );

  if (loading) return (
      <div className="page-container gm-page">
          <div className="gm-loading"><span /><span /><span /></div>
      </div>
  );

  return (
    <div className="page-container gm-page">

      {/* HERO */}
      <header className="gm-hero">
          <div className="gm-hero-bg" aria-hidden="true"><span className="gm-orb gm-orb-a" /><span className="gm-orb gm-orb-b" /></div>
          <div className="gm-hero-main">
              <span className="gm-hero-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 17.5h7M17.5 14v7" /></svg></span>
              <div>
                  <h1>Modelos de Projeto</h1>
                  <p>Define a estrutura base (Etapas e Tarefas) para padronizar futuros projetos.</p>
              </div>
          </div>
          <div className="gm-hero-stats">
              <span className="gm-stat"><strong>{tipos.length}</strong> Modelos</span>
              {selectedTipo && <span className="gm-stat"><strong>{atividades.length}</strong> etapas em {selectedTipo.nome}</span>}
              {selectedTipo && totalDiasEtapas > 0 && <span className="gm-stat"><strong>{totalDiasEtapas}</strong> dias previstos</span>}
          </div>
      </header>

      <div className="gm-grid">

        {/* COLUNA 1: TIPOS */}
        <section className="gm-col">
            <header className="gm-col-head">
                <span className="gm-step"><Icons.Folder /></span>
                <div className="gm-col-title">
                    <h3>1. Tipos de Projetos</h3>
                    <span>{tipos.length} modelo{tipos.length === 1 ? '' : 's'}</span>
                </div>
                <button type="button" onClick={() => openCreateModal('tipo_projeto')} className="gm-add"><Icons.Plus /> Novo</button>
            </header>
            <div className="gm-col-body custom-scrollbar">
                {tipos.map((t, i) => {
                    const isSelected = selectedTipo?.id === t.id;
                    return (
                        <div
                            key={t.id}
                            onClick={() => setSelectedTipo(t)}
                            className={`gm-tipo ${isSelected ? 'is-on' : ''}`}
                            style={{ '--tc': tipoColor(t.id), '--i': Math.min(i, 12) }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTipo(t); } }}
                        >
                            <span className="gm-tipo-tile">{initialsOf(t.nome)}</span>
                            <div className="gm-tipo-text">
                                <strong title={t.nome}>{t.nome}</strong>
                                {(t.tem_programa || t.eh_formacao) && (
                                    <span className="gm-chips">
                                        {t.tem_programa && <span className="gm-chip is-prog" title="Requer programa de financiamento"><Icons.Doc /> Programa</span>}
                                        {t.eh_formacao && <span className="gm-chip is-form" title="Projeto de Formação"><Icons.Doc /> Formação</span>}
                                    </span>
                                )}
                            </div>
                            <div className="gm-actions">
                                <button type="button" onClick={(e) => { e.stopPropagation(); openEditModal('tipo_projeto', t); }} className="gm-icon" title="Editar" aria-label="Editar"><Icons.Edit /></button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); askDelete("tipos_projeto", t.id, setTipos, tipos, true, false); }} className="gm-icon is-danger" title="Apagar" aria-label="Apagar"><Icons.Trash /></button>
                            </div>
                        </div>
                    );
                })}
                {tipos.length === 0 && (
                    <div className="gm-empty"><Icons.Empty /><p>Sem modelos.</p></div>
                )}
            </div>
        </section>

        {/* COLUNA 2: ATIVIDADES */}
        <section className={`gm-col ${selectedTipo ? '' : 'is-locked'}`} style={selectedTipo ? { '--tc': tipoColor(selectedTipo.id) } : undefined}>
            <header className="gm-col-head">
                <span className="gm-step"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></svg></span>
                <div className="gm-col-title">
                    <h3>2. Atividades</h3>
                    <span>{selectedTipo ? selectedTipo.nome : 'Seleciona um modelo'}</span>
                </div>
                {selectedTipo && <button type="button" onClick={() => openCreateModal('atividade', selectedTipo.id, selectedTipo.nome)} className="gm-add"><Icons.Plus /> Etapa</button>}
            </header>
            <div className="gm-col-body custom-scrollbar">
                {!selectedTipo ? (
                    <div className="gm-placeholder"><span><Icons.ArrowRight /></span><p>Escolhe um tipo de projeto à esquerda para ver as etapas.</p></div>
                ) : atividades.length === 0 ? (
                    <div className="gm-empty"><Icons.Empty /><p>Este modelo ainda não tem etapas.</p></div>
                ) : atividades.map((a, index) => {
                    const isSelected = selectedAtiv?.id === a.id;
                    const atividadeDepLabel = getAtividadeDependencyLabel(a);
                    return (
                        <div
                            key={a.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEndAtividades}
                            onClick={() => setSelectedAtiv(a)}
                            className={`gm-etapa ${isSelected ? 'is-on' : ''}`}
                            style={{ '--i': Math.min(index, 12) }}
                        >
                            <span className="gm-grip"><Icons.Grip /></span>
                            <span className="gm-num">{a.ordem}</span>
                            <div className="gm-etapa-text">
                                <strong title={a.nome}>{a.nome}</strong>
                                {(a.dias_estimados > 0 || a.descricao || atividadeDepLabel) && (
                                    <span className="gm-chips">
                                        {a.dias_estimados > 0 && <span className="gm-chip is-time"><Icons.Clock /> {a.dias_estimados}d</span>}
                                        {a.descricao && <span className="gm-chip is-note" title={a.descricao}><Icons.Doc /> Nota</span>}
                                        {atividadeDepLabel && <span className="gm-chip is-dep" title={atividadeDepLabel}>↳ {atividadeDepLabel}</span>}
                                    </span>
                                )}
                            </div>
                            <div className="gm-actions">
                                <button type="button" onClick={(e) => { e.stopPropagation(); openEditModal('atividade', a); }} className="gm-icon" title="Editar" aria-label="Editar"><Icons.Edit /></button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); askDelete("template_atividades", a.id, setAtividades, atividades, false, true); }} className="gm-icon is-danger" title="Apagar" aria-label="Apagar"><Icons.Trash /></button>
                            </div>
                            <span className="gm-chevron" aria-hidden="true"><Icons.ArrowRight /></span>
                        </div>
                    );
                })}
            </div>
        </section>

        {/* COLUNA 3: TAREFAS */}
        <section className={`gm-col is-wide ${selectedAtiv ? '' : 'is-locked'}`}>
            <header className="gm-col-head">
                <span className="gm-step"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg></span>
                <div className="gm-col-title">
                    <h3>3. Tarefas</h3>
                    <span>{selectedAtiv ? selectedAtiv.nome : 'Seleciona uma etapa'}</span>
                </div>
                {selectedAtiv && <button type="button" onClick={() => openCreateModal('tarefa', selectedAtiv.id, selectedAtiv.nome)} className="gm-add"><Icons.Plus /> Tarefa</button>}
            </header>
            <div className="gm-col-body custom-scrollbar">
                {!selectedAtiv ? (
                    <div className="gm-placeholder"><span><Icons.ArrowRight /></span><p>Escolhe uma etapa para ver e organizar as tarefas.</p></div>
                ) : tarefas.length === 0 ? (
                    <div className="gm-empty"><Icons.Empty /><p>Esta etapa ainda não tem tarefas.</p></div>
                ) : tarefas.map((t, index) => {
                    const subs = subtarefas.filter(st => st.template_tarefa_id === t.id);
                    const tarefaDepLabel = getTarefaDependencyLabel(t);
                    return (
                        <article
                            key={t.id}
                            className="gm-task"
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEndTarefas}
                            style={{ '--i': Math.min(index, 12) }}
                        >
                            <div className="gm-task-head">
                                <span className="gm-grip"><Icons.Grip /></span>
                                <span className="gm-num is-sm">{t.ordem}</span>
                                <div className="gm-task-title">
                                    <strong>{t.nome}</strong>
                                    {(t.dias_estimados > 0 || tarefaDepLabel) && (
                                        <span className="gm-chips">
                                            {t.dias_estimados > 0 && <span className="gm-chip is-time"><Icons.Clock /> {t.dias_estimados}d</span>}
                                            {tarefaDepLabel && <span className="gm-chip is-dep" title={tarefaDepLabel}>↳ {tarefaDepLabel}</span>}
                                        </span>
                                    )}
                                </div>
                                <button type="button" onClick={() => openCreateModal('subtarefa', t.id, t.nome)} className="gm-add is-soft">+ Passo</button>
                                <div className="gm-actions">
                                    <button type="button" onClick={() => openEditModal('tarefa', t)} className="gm-icon" title="Editar" aria-label="Editar"><Icons.Edit /></button>
                                    <button type="button" onClick={() => askDelete("template_tarefas", t.id, setTarefas, tarefas)} className="gm-icon is-danger" title="Apagar" aria-label="Apagar"><Icons.Trash /></button>
                                </div>
                            </div>

                            {t.descricao && (
                                <div className="gm-note"><Icons.Doc /><span>{t.descricao}</span></div>
                            )}

                            {subs.length > 0 && (
                                <ol className="gm-subs">
                                    {subs.map((st, sIndex) => (
                                        <li
                                            key={st.id}
                                            className="gm-sub"
                                            draggable
                                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(sIndex); }}
                                            onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(sIndex); }}
                                            onDragEnd={(e) => { e.stopPropagation(); handleDragEndSubtarefas(t.id); }}
                                        >
                                            <span className="gm-grip"><Icons.Grip /></span>
                                            <span className="gm-sub-num">{st.ordem}</span>
                                            <div className="gm-sub-text">
                                                <span>{st.nome}{st.dias_estimados > 0 && <span className="gm-chip is-time">{st.dias_estimados}d</span>}</span>
                                                {st.descricao && <div className="gm-note is-sub">{st.descricao}</div>}
                                            </div>
                                            <div className="gm-actions">
                                                <button type="button" onClick={() => openEditModal('subtarefa', st)} className="gm-icon" title="Editar" aria-label="Editar"><Icons.Edit /></button>
                                                <button type="button" onClick={() => askDelete("template_subtarefas", st.id, setSubtarefas, subtarefas)} className="gm-icon is-danger" title="Apagar" aria-label="Apagar"><Icons.Trash /></button>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
      </div>

      {/* --- MODAL DE CRIAÇÃO/EDIÇÃO --- */}
      {modalConfig.isOpen && (
          <ModalPortal>
              <div className="gm-overlay" onClick={closeModal}>
                  <div className="gm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={getModalTitle()}>
                      <header className="gm-modal-head">
                          <span className="gm-modal-icon">{modalConfig.mode === 'edit' ? <Icons.Edit /> : <Icons.Plus />}</span>
                          <div>
                              <h3>{getModalTitle()}</h3>
                              <p>{getModalSubtitle()}</p>
                          </div>
                          <button type="button" onClick={closeModal} className="gm-icon is-close" aria-label="Fechar"><Icons.Close /></button>
                      </header>
                      <form onSubmit={handleModalSubmit} className="gm-modal-body">
                          <div className="gm-field">
                              <label>Nome *</label>
                              <input className="gm-input is-title" type="text" autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} required />
                          </div>

                          {modalConfig.tipo === 'tipo_projeto' && (
                              <>
                                  <div className="gm-switches">
                                      {renderSwitch('tipoTemPrograma', inputTemPrograma, setInputTemPrograma, 'Este tipo de projeto requer programa de financiamento')}
                                      {renderSwitch('tipoEhFormacao', inputEhFormacao, setInputEhFormacao, 'É um projeto de Formação')}
                                  </div>
                                  <div className="gm-row-2">
                                      <div className="gm-field">
                                          <label>Default Num Horas</label>
                                          <input className="gm-input" type="number" min="0" step="0.25" value={inputDefaultNumHoras} onChange={(e) => setInputDefaultNumHoras(e.target.value)} />
                                      </div>
                                      <div className="gm-field">
                                          <label>Default Base (EUR/h)</label>
                                          <input className="gm-input" type="number" min="0" step="0.01" value={inputDefaultBaseEurHora} onChange={(e) => setInputDefaultBaseEurHora(e.target.value)} />
                                      </div>
                                  </div>
                              </>
                          )}

                          {modalConfig.tipo !== 'tipo_projeto' && (
                              <div className="gm-field">
                                  <label>Guia / Notas <em>(Opcional)</em></label>
                                  <textarea className="gm-input is-note" value={inputDescricao} onChange={(e) => setInputDescricao(e.target.value)} rows="3" placeholder="Instruções ou procedimentos..." />
                              </div>
                          )}

                          {modalConfig.tipo === 'atividade' && (
                              <div className="gm-field">
                                  <label>Depende da Etapa</label>
                                  <select className="gm-input" value={inputDepAtividadeId} onChange={(e) => setInputDepAtividadeId(e.target.value)}>
                                      <option value="">Sem dependência</option>
                                      {atividades
                                          .filter((a) => String(a.id) !== String(modalConfig.itemId || ''))
                                          .filter((a) => Number(a.ordem || 0) < Number(atividadeModalCurrentOrdem || 0))
                                          .map((a) => (
                                              <option key={a.id} value={a.id}>{a.ordem}. {a.nome}</option>
                                          ))}
                                  </select>
                              </div>
                          )}

                          {modalConfig.tipo === 'tarefa' && (
                              <div className="gm-field">
                                  <label>Depende da Tarefa (mesma etapa)</label>
                                  <select className="gm-input" value={inputDepTarefaId} onChange={(e) => setInputDepTarefaId(e.target.value)}>
                                      <option value="">Sem dependência</option>
                                      {tarefas
                                          .filter((t) => String(t.id) !== String(modalConfig.itemId || ''))
                                          .filter((t) => Number(t.ordem || 0) < Number(tarefaModalCurrentOrdem || 0))
                                          .map((t) => (
                                              <option key={t.id} value={t.id}>{t.ordem}. {t.nome}</option>
                                          ))}
                                  </select>
                              </div>
                          )}

                          {modalConfig.tipo !== 'tipo_projeto' && (
                              <div className="gm-field">
                                  <label>Prazo Previsto (Dias)</label>
                                  <div className="gm-input-icon">
                                      <Icons.Clock />
                                      <input className="gm-input" type="number" value={inputDias} onChange={(e) => setInputDias(e.target.value)} min="0" required />
                                  </div>
                              </div>
                          )}

                          {(modalConfig.tipo === 'atividade' || modalConfig.tipo === 'tarefa') && (
                              <div className="gm-extra">
                                  {renderSwitch('exigeInfoAdicional', exigeInfoAdicional, setExigeInfoAdicional, 'Exige informação adicional?')}
                                  {exigeInfoAdicional && (
                                      <div className="gm-extra-fields">
                                          <span className="gm-extra-title">Campos necessários:</span>
                                          <div className="gm-checks">
                                              {[
                                                  ['campoInvestimento', 'investimento', 'Valor do Investimento'],
                                                  ['campoFinanciamento', 'financiamento', 'Valor do Financiamento'],
                                                  ['campoIncentivo', 'incentivo', 'Valor do Incentivo'],
                                                  ['campoDataPrevista', 'data_prevista_aprovacao', 'Data prevista de aprovação'],
                                              ].map(([id, key, label]) => (
                                                  <label key={id} htmlFor={id} className={`gm-check ${camposInfoAdicional[key] ? 'is-on' : ''}`}>
                                                      <input type="checkbox" id={id} checked={camposInfoAdicional[key]} onChange={e => setCamposInfoAdicional(v => ({ ...v, [key]: e.target.checked }))} />
                                                      <span className="gm-check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>
                                                      {label}
                                                  </label>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}

                          <div className="gm-modal-foot">
                              <button type="button" onClick={closeModal} className="gm-btn">Cancelar</button>
                              <button type="submit" disabled={isSubmitting} className="gm-btn is-primary">{isSubmitting ? 'A guardar...' : 'Guardar Alterações'}</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL DE CONFIRMAÇÃO GLOBAL */}
      {confirmDialog.show && (
          <ModalPortal>
              <div className="gm-overlay" onClick={() => setConfirmDialog({show: false, message: '', confirmText: '', onConfirm: null})}>
                  <div className="gm-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog">
                      <span className="gm-dialog-icon"><Icons.Alert /></span>
                      <h3>Tens a certeza?</h3>
                      <p>{confirmDialog.message}</p>
                      <div className="gm-dialog-actions">
                          <button type="button" onClick={() => setConfirmDialog({show: false, message: '', confirmText: '', onConfirm: null})} className="gm-btn">Cancelar</button>
                          <button type="button" onClick={confirmDialog.onConfirm} className="gm-btn is-danger">{confirmDialog.confirmText}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}
    </div>
  );
}
