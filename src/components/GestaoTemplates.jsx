import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

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

  // ESTILOS PREMIUM & COMPACTOS
  const styles = {
    container: { padding: '20px', maxWidth: '1600px', margin: '0 auto' },
    headerCard: { background: 'white', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' },
    headerSubtitle: { margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem', fontWeight: '500' },
    statsBox: { display: 'flex', gap: '15px', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' },
    statItem: { display: 'flex', alignItems: 'center', gap: '6px' },
    statNumber: { fontSize: '1rem', fontWeight: '800', color: '#0f172a' },

    gridContainer: { display: 'grid', gridTemplateColumns: '280px 320px 1fr', gap: '15px', alignItems: 'start' },
    
    column: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: '500px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
    columnHeader: { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' },
    columnTitle: { margin: 0, color: '#334155', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' },
    columnContext: { fontSize: '0.7rem', color: '#94a3b8', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' },
    
    addButton: { background: 'transparent', color: 'var(--color-btnPrimary)', border: '1px solid transparent', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px' },
    
    listContainer: { flex: 1, overflowY: 'auto', padding: '8px' },
    
    listItem: (isSelected) => ({
        padding: '8px 10px', marginBottom: '4px', borderRadius: '8px', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isSelected ? 'var(--color-bgSecondary)' : 'transparent',
        border: isSelected ? '1px solid var(--color-borderColor)' : '1px solid transparent',
        color: isSelected ? 'var(--color-btnPrimaryHover)' : '#475569',
        transition: 'all 0.15s ease-in-out', fontSize: '0.9rem', fontWeight: isSelected ? '600' : '500'
    }),

    taskCard: { marginBottom: '8px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' },
    taskHeader: { padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', cursor: 'grab' },
    taskTitle: { fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' },
    
    actionsGroup: { display: 'flex', gap: '2px', opacity: 0.4, transition: '0.2s' },
    actionBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', transition: '0.2s' },

    badge: (type) => ({
        fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
        background: type === 'time' ? '#ecfdf5' : type === 'dep' ? '#eff6ff' : '#fffbeb',
        color: type === 'time' ? '#047857' : type === 'dep' ? '#1d4ed8' : '#b45309',
        border: `1px solid ${type === 'time' ? '#a7f3d0' : type === 'dep' ? '#bfdbfe' : '#fde68a'}`
    }),

    dependencyTrace: { marginTop: '5px', marginLeft: '20px', display: 'flex', alignItems: 'center', gap: '6px' },
    dependencyLine: { width: '10px', height: '0', borderTop: '2px solid #93c5fd', opacity: 0.9 },
    dependencyText: { fontSize: '0.72rem', color: '#2563eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

    subtaskList: { padding: '4px 12px 8px 24px', background: 'white', borderTop: '1px solid #f1f5f9' },
    subtaskItem: { padding: '4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.85rem', color: '#475569', cursor: 'grab' },

    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 },
    modalBox: { background: 'white', width: '90%', maxWidth: '420px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
    modalHeader: { padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: '700' },
    modalForm: { padding: '20px' },
    label: { display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' },
    input: { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.9rem', marginBottom: '15px', outline: 'none', boxSizing: 'border-box', color: '#1e293b', fontWeight: '500', transition: 'border-color 0.2s' },
    textarea: { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fffbeb', fontSize: '0.85rem', marginBottom: '15px', outline: 'none', boxSizing: 'border-box', color: '#78350f', resize: 'vertical', minHeight: '60px' },
    modalFooter: { display: 'flex', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' },
    btnCancel: { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' },
    btnSubmit: { flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: 'var(--color-btnPrimary)', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' },

    // Alert Modal
    alertBox: { background: 'white', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
    alertTitle: { margin: '10px 0 5px 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: '700' },
    alertText: { color: '#64748b', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' },
    btnDanger: { flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }
  };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'var(--color-btnPrimary)'}}></div></div>;

  return (
    <div className="page-container" style={styles.container}>
      
      {/* HEADER COMPACTO */}
      <div style={styles.headerCard}>
        <div>
            <h1 style={styles.headerTitle}>Modelos de Projeto</h1>
            <p style={styles.headerSubtitle}>Define a estrutura base (Etapas e Tarefas) para padronizar futuros projetos.</p>
        </div>
        <div style={styles.statsBox}>
            <div style={styles.statItem}><Icons.Folder/><span style={styles.statNumber}>{tipos.length}</span> Modelos</div>
        </div>
      </div>

      <div style={styles.gridContainer}>
        
        {/* COLUNA 1: TIPOS */}
        <div style={styles.column}>
            <div style={styles.columnHeader}>
                <h3 style={styles.columnTitle}>1. Tipos de Projetos</h3>
                <button onClick={() => openCreateModal('tipo_projeto')} style={styles.addButton} className="hover-btn-primary"><Icons.Plus/> Novo</button>
            </div>
            <div style={styles.listContainer} className="custom-scrollbar">
                {tipos.map((t) => {
                    const isSelected = selectedTipo?.id === t.id;
                    return (
                    <div 
                        key={t.id} 
                        onClick={() => setSelectedTipo(t)} 
                        style={styles.listItem(isSelected)} 
                        className="hover-list-item"
                    >
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden'}}>
                            <span style={{color: isSelected ? 'var(--color-btnPrimary)' : '#94a3b8', opacity: isSelected ? 1 : 0.7}}><Icons.Folder/></span>
                            <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{t.nome}</span>
                                                        {t.tem_programa && (
                                                            <span style={{ ...styles.badge('dep'), fontSize: '0.62rem' }}><Icons.Doc/></span>
                                                        )}
                        </div>
                        <div style={styles.actionsGroup} className="actions-group">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal('tipo_projeto', t); }} style={styles.actionBtn} className="hover-icon-blue"><Icons.Edit/></button>
                            <button onClick={(e) => { e.stopPropagation(); askDelete("tipos_projeto", t.id, setTipos, tipos, true, false); }} style={styles.actionBtn} className="hover-icon-red"><Icons.Trash/></button>
                        </div>
                    </div>
                )})}
                {tipos.length === 0 && <div style={{textAlign:'center', padding:'30px 10px', color:'#94a3b8', opacity:0.6}}><Icons.Empty/><p style={{fontSize:'0.8rem', margin:'5px 0 0 0'}}>Sem modelos.</p></div>}
            </div>
        </div>

        {/* COLUNA 2: ATIVIDADES */}
        <div style={{...styles.column, opacity: selectedTipo ? 1 : 0.5, pointerEvents: selectedTipo ? 'auto' : 'none', transition: '0.2s'}}>
            <div style={styles.columnHeader}>
                <div>
                    <h3 style={styles.columnTitle}>2. Atividades</h3>
                    <span style={styles.columnContext}>{selectedTipo ? selectedTipo.nome : 'Seleciona um modelo'}</span>
                </div>
                {selectedTipo && <button onClick={() => openCreateModal('atividade', selectedTipo.id, selectedTipo.nome)} style={styles.addButton} className="hover-btn-primary"><Icons.Plus/> Etapa</button>}
            </div>
            <div style={styles.listContainer} className="custom-scrollbar">
                {atividades.map((a, index) => {
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
                        style={styles.listItem(isSelected)} 
                        className="hover-list-item drag-item"
                    >
                        <div style={{flex: 1, overflow:'hidden', display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                            <span style={{marginTop: '2px'}}><Icons.Grip/></span>
                            <div style={{flex: 1}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    <span style={{fontSize:'0.7rem', color: isSelected ? 'var(--color-btnPrimary)' : '#64748b', fontWeight:'700', minWidth:'15px'}}>{a.ordem}.</span> 
                                    <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{a.nome}</span>
                                </div>
                                <div style={{display:'flex', gap:'5px', marginTop:'4px', paddingLeft:'20px'}}>
                                    {a.dias_estimados > 0 && <span style={styles.badge('time')}><Icons.Clock/> {a.dias_estimados}d</span>}
                                    {a.descricao && <span style={styles.badge('doc')}><Icons.Doc/> Nota</span>}
                                </div>
                                {atividadeDepLabel && (
                                    <div style={styles.dependencyTrace} title={atividadeDepLabel}>
                                        <span style={styles.dependencyLine}></span>
                                        <span style={styles.dependencyText}>{atividadeDepLabel}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={styles.actionsGroup} className="actions-group">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal('atividade', a); }} style={styles.actionBtn} className="hover-icon-blue"><Icons.Edit/></button>
                            <button onClick={(e) => { e.stopPropagation(); askDelete("template_atividades", a.id, setAtividades, atividades, false, true); }} style={styles.actionBtn} className="hover-icon-red"><Icons.Trash/></button>
                        </div>
                    </div>
                )})}
            </div>
        </div>

        {/* COLUNA 3: TAREFAS */}
        <div style={{...styles.column, opacity: selectedAtiv ? 1 : 0.5, pointerEvents: selectedAtiv ? 'auto' : 'none', transition: '0.2s'}}>
            <div style={styles.columnHeader}>
                <div>
                    <h3 style={styles.columnTitle}>3. Tarefas</h3>
                    <span style={styles.columnContext}>{selectedAtiv ? selectedAtiv.nome : 'Seleciona uma etapa'}</span>
                </div>
                {selectedAtiv && <button onClick={() => openCreateModal('tarefa', selectedAtiv.id, selectedAtiv.nome)} style={styles.addButton} className="hover-btn-primary"><Icons.Plus/> Tarefa</button>}
            </div>
            <div style={styles.listContainer} className="custom-scrollbar">
                {tarefas.map((t, index) => {
                    const subs = subtarefas.filter(st => st.template_tarefa_id === t.id);
                    const tarefaDepLabel = getTarefaDependencyLabel(t);
                    return (
                    <div 
                        key={t.id} 
                        style={styles.taskCard} 
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEndTarefas}
                        className="drag-item"
                    >
                        <div style={styles.taskHeader} className="hover-list-item">
                            <div style={{display: 'flex', gap: '8px', alignItems:'center', flex:1}}>
                                <span><Icons.Grip/></span>
                                <span style={{fontSize:'0.75rem', color:'#64748b', fontWeight:'700'}}>{t.ordem}.</span>
                                <div style={styles.taskTitle}>{t.nome}</div>
                                {t.dias_estimados > 0 && <span style={styles.badge('time')}><Icons.Clock/>{t.dias_estimados}d</span>}
                                {t.descricao && <span style={{...styles.badge('doc'), background:'transparent', border:'none', padding:0}} title="Tem notas"><Icons.Doc/></span>}
                            </div>
                            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <button onClick={() => openCreateModal('subtarefa', t.id, t.nome)} style={{...styles.addButton, color:'#64748b', fontSize:'0.7rem'}} className="hover-btn-secondary"> + Passo</button>
                                <div style={{width:'1px', height:'12px', background:'#e2e8f0'}}></div>
                                <div style={styles.actionsGroup} className="actions-group">
                                    <button onClick={() => openEditModal('tarefa', t)} style={styles.actionBtn} className="hover-icon-blue"><Icons.Edit/></button>
                                    <button onClick={() => askDelete("template_tarefas", t.id, setTarefas, tarefas)} style={styles.actionBtn} className="hover-icon-red"><Icons.Trash/></button>
                                </div>
                            </div>
                        </div>

                        {t.descricao && (
                            <div style={{padding: '6px 12px 6px 30px', background: '#fffbeb', borderTop: '1px solid #fef3c7', fontSize: '0.75rem', color: '#b45309', display:'flex', gap:'6px', alignItems:'flex-start'}}>
                                <span style={{marginTop:'2px', opacity:0.7}}><Icons.Doc/></span>
                                <span style={{whiteSpace: 'pre-wrap'}}>{t.descricao}</span>
                            </div>
                        )}

                        {tarefaDepLabel && (
                            <div style={{padding: '6px 12px 6px 30px', borderTop: '1px solid #e2e8f0'}} title={tarefaDepLabel}>
                                <div style={{...styles.dependencyTrace, marginTop: 0, marginLeft: 0}}>
                                    <span style={styles.dependencyLine}></span>
                                    <span style={styles.dependencyText}>{tarefaDepLabel}</span>
                                </div>
                            </div>
                        )}

                        {subs.length > 0 && (
                            <div style={styles.subtaskList}>
                                {subs.map((st, sIndex) => (
                                    <div 
                                        key={st.id} 
                                        style={styles.subtaskItem} 
                                        className="hover-list-item drag-item"
                                        draggable
                                        onDragStart={(e) => { e.stopPropagation(); handleDragStart(sIndex); }}
                                        onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(sIndex); }}
                                        onDragEnd={(e) => { e.stopPropagation(); handleDragEndSubtarefas(t.id); }}
                                    >
                                        <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px', flex:1}}>
                                            <span style={{marginTop:'2px'}}><Icons.Grip/></span>
                                            <span style={{color: '#cbd5e1', marginTop:'2px'}}><Icons.ArrowRight/></span>
                                            <div style={{flex: 1}}>
                                                <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                                    <span style={{fontSize:'0.75rem', fontWeight:'600'}}>{st.ordem}.</span>
                                                    <span>{st.nome}</span>
                                                    {st.dias_estimados > 0 && <span style={styles.badge('time')}>{st.dias_estimados}d</span>}
                                                </div>
                                                {/* 💡 AQUI: Descrição da Subtarefa */}
                                                {st.descricao && (
                                                    <div style={{fontSize: '0.7rem', color: '#b45309', background: '#fffbeb', padding: '4px 8px', borderRadius: '4px', marginTop: '4px', whiteSpace: 'pre-wrap', borderLeft: '2px solid #fcd34d'}}>
                                                        {st.descricao}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={styles.actionsGroup} className="actions-group">
                                            <button onClick={() => openEditModal('subtarefa', st)} style={styles.actionBtn} className="hover-icon-blue"><Icons.Edit/></button>
                                            <button onClick={() => askDelete("template_subtarefas", st.id, setSubtarefas, subtarefas)} style={styles.actionBtn} className="hover-icon-red"><Icons.Trash/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )})}
            </div>
        </div>
      </div>

      {/* --- MODAL DE CRIAÇÃO/EDIÇÃO COMPACTO --- */}
      {modalConfig.isOpen && (
          <ModalPortal>
              <div style={styles.modalOverlay}>
                  <div style={styles.modalBox}>
                      <div style={styles.modalHeader}>
                          <div>
                              <h3 style={styles.modalTitle}>{getModalTitle()}</h3>
                              <p style={{margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b'}}>{getModalSubtitle()}</p>
                          </div>
                          <button onClick={closeModal} style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8'}}><Icons.Close/></button>
                      </div>
                      <form onSubmit={handleModalSubmit} style={styles.modalForm}>
                          <label style={styles.label}>Nome *</label>
                          <input type="text" autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} required style={styles.input} className="input-focus" />

                          {modalConfig.tipo === 'tipo_projeto' && (
                              <>
                                  <label htmlFor="tipoTemPrograma" style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', fontWeight: 600, color: '#334155', cursor: 'pointer'}}>
                                      <input id="tipoTemPrograma" type="checkbox" checked={inputTemPrograma} onChange={(e) => setInputTemPrograma(e.target.checked)} style={{width:16, height:16, minWidth:16, minHeight:16, maxWidth:16, maxHeight:16, flex:'none'}} />
                                      Este tipo de projeto requer programa de financiamento
                                  </label>

                                  <div style={{display: 'flex', gap: '12px'}}>
                                      <div style={{flex: 1}}>
                                          <label style={styles.label}>Default Num Horas</label>
                                          <input
                                              type="number"
                                              min="0"
                                              step="0.25"
                                              value={inputDefaultNumHoras}
                                              onChange={(e) => setInputDefaultNumHoras(e.target.value)}
                                              style={styles.input}
                                              className="input-focus"
                                          />
                                      </div>
                                      <div style={{flex: 1}}>
                                          <label style={styles.label}>Default Base (EUR/h)</label>
                                          <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={inputDefaultBaseEurHora}
                                              onChange={(e) => setInputDefaultBaseEurHora(e.target.value)}
                                              style={styles.input}
                                              className="input-focus"
                                          />
                                      </div>
                                  </div>
                              </>
                          )}

                          {/* 💡 AGORA TODOS OS NÍVEIS TÊM DESCRIÇÃO (EXCETO O TIPO_PROJETO) */}
                          {modalConfig.tipo !== 'tipo_projeto' && (
                              <>
                                <label style={{...styles.label, display:'flex', justifyContent:'space-between'}}>Guia / Notas <span style={{fontWeight:'400', opacity:0.7}}>(Opcional)</span></label>
                                <textarea value={inputDescricao} onChange={(e) => setInputDescricao(e.target.value)} rows="3" style={styles.textarea} placeholder="Instruções ou procedimentos..." className="input-focus" />
                              </>
                          )}

                          {modalConfig.tipo === 'atividade' && (
                              <>
                                  <label style={styles.label}>Depende da Etapa</label>
                                  <select
                                      value={inputDepAtividadeId}
                                      onChange={(e) => setInputDepAtividadeId(e.target.value)}
                                      style={styles.input}
                                      className="input-focus"
                                  >
                                      <option value="">Sem dependência</option>
                                      {atividades
                                          .filter((a) => String(a.id) !== String(modalConfig.itemId || ''))
                                          .filter((a) => Number(a.ordem || 0) < Number(atividadeModalCurrentOrdem || 0))
                                          .map((a) => (
                                              <option key={a.id} value={a.id}>{a.ordem}. {a.nome}</option>
                                          ))}
                                  </select>
                              </>
                          )}

                          {modalConfig.tipo === 'tarefa' && (
                              <>
                                  <label style={styles.label}>Depende da Tarefa (mesma etapa)</label>
                                  <select
                                      value={inputDepTarefaId}
                                      onChange={(e) => setInputDepTarefaId(e.target.value)}
                                      style={styles.input}
                                      className="input-focus"
                                  >
                                      <option value="">Sem dependência</option>
                                      {tarefas
                                          .filter((t) => String(t.id) !== String(modalConfig.itemId || ''))
                                          .filter((t) => Number(t.ordem || 0) < Number(tarefaModalCurrentOrdem || 0))
                                          .map((t) => (
                                              <option key={t.id} value={t.id}>{t.ordem}. {t.nome}</option>
                                          ))}
                                  </select>
                              </>
                          )}

                                                    {modalConfig.tipo !== 'tipo_projeto' && (
                                                            <div style={{display: 'flex', gap: '15px'}}>
                                                                    <div style={{flex:1}}>
                                                                            <label style={styles.label}>Prazo Previsto (Dias)</label>
                                                                            <div style={{position: 'relative'}}>
                                                                                    <span style={{position:'absolute', left:'10px', top:'9px', color:'#94a3b8'}}><Icons.Clock/></span>
                                                                                    <input type="number" value={inputDias} onChange={(e) => setInputDias(e.target.value)} min="0" required style={{...styles.input, paddingLeft: '28px'}} className="input-focus" />
                                                                            </div>
                                                                    </div>
                                                            </div>
                                                    )}

                                                    {/* Campos de Informação Adicional para etapas/tarefas */}
                                                    {(modalConfig.tipo === 'atividade' || modalConfig.tipo === 'tarefa') && (
                                                        <div style={{margin: '18px 0 10px 0', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                                                            <label htmlFor="exigeInfoAdicional" style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', color: '#334155', marginBottom: '10px', cursor: 'pointer'}}>
                                                                <input type="checkbox" id="exigeInfoAdicional" checked={exigeInfoAdicional} onChange={e => setExigeInfoAdicional(e.target.checked)} style={{width:16, height:16, minWidth:16, minHeight:16, maxWidth:16, maxHeight:16, flex:'none'}} />
                                                                Exige informação adicional?
                                                            </label>
                                                            {exigeInfoAdicional && (
                                                                <div style={{marginLeft: '2px', marginTop: '8px'}}>
                                                                    <div style={{fontWeight: 700, fontSize: '0.85rem', color: '#64748b', marginBottom: '8px'}}>Campos necessários:</div>
                                                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                                                        <label htmlFor="campoInvestimento" style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b', cursor: 'pointer'}}>
                                                                            <input type="checkbox" id="campoInvestimento" checked={camposInfoAdicional.investimento} onChange={e => setCamposInfoAdicional(v => ({...v, investimento: e.target.checked}))} style={{width:16, height:16, minWidth:16, minHeight:16, maxWidth:16, maxHeight:16, flex:'none'}} />
                                                                            Valor do Investimento
                                                                        </label>
                                                                        <label htmlFor="campoFinanciamento" style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b', cursor: 'pointer'}}>
                                                                            <input type="checkbox" id="campoFinanciamento" checked={camposInfoAdicional.financiamento} onChange={e => setCamposInfoAdicional(v => ({...v, financiamento: e.target.checked}))} style={{width:16, height:16, minWidth:16, minHeight:16, maxWidth:16, maxHeight:16, flex:'none'}} />
                                                                            Valor do Financiamento
                                                                        </label>
                                                                        <label htmlFor="campoIncentivo" style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b', cursor: 'pointer'}}>
                                                                            <input type="checkbox" id="campoIncentivo" checked={camposInfoAdicional.incentivo} onChange={e => setCamposInfoAdicional(v => ({...v, incentivo: e.target.checked}))} style={{width:16, height:16, minWidth:16, minHeight:16, maxWidth:16, maxHeight:16, flex:'none'}} />
                                                                            Valor do Incentivo
                                                                        </label>
                                                                        <label htmlFor="campoDataPrevista" style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b', cursor: 'pointer'}}>
                                                                            <input type="checkbox" id="campoDataPrevista" checked={camposInfoAdicional.data_prevista_aprovacao} onChange={e => setCamposInfoAdicional(v => ({...v, data_prevista_aprovacao: e.target.checked}))} style={{width:16, height:16, minWidth:16, minHeight:16, maxWidth:16, maxHeight:16, flex:'none'}} />
                                                                            Data prevista de aprovação
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                          <div style={styles.modalFooter}>
                              <button type="button" onClick={closeModal} style={styles.btnCancel} className="hover-btn-secondary">Cancelar</button>
                              <button type="submit" disabled={isSubmitting} style={styles.btnSubmit} className="hover-btn-primary">{isSubmitting ? 'A guardar...' : 'Guardar Alterações'}</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL DE CONFIRMAÇÃO GLOBAL */}
      {confirmDialog.show && (
          <ModalPortal>
              <div style={styles.modalOverlay}>
                  <div style={styles.alertBox} className="fade-in">
                      <div style={{display:'flex', justifyContent:'center', marginBottom:'10px'}}><Icons.Alert/></div>
                      <h3 style={styles.alertTitle}>Tens a certeza?</h3>
                      <p style={styles.alertText}>{confirmDialog.message}</p>
                      <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={() => setConfirmDialog({show: false, message: '', confirmText: '', onConfirm: null})} style={styles.btnCancel} className="hover-btn-secondary">Cancelar</button>
                          <button onClick={confirmDialog.onConfirm} style={styles.btnDanger} className="hover-btn-danger">{confirmDialog.confirmText}</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      <style>{`
          .hover-list-item:hover { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
          .hover-list-item:hover .actions-group { opacity: 1 !important; }
          .hover-btn-primary:hover { background-color: var(--color-btnPrimaryDark) !important; }
          .hover-btn-secondary:hover { background-color: #f1f5f9 !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
          .hover-btn-danger:hover { background-color: #dc2626 !important; }
          .hover-icon-blue:hover { color: var(--color-btnPrimary) !important; background: var(--color-bgSecondary) !important; }
          .hover-icon-red:hover { color: #ef4444 !important; background: #fee2e2 !important; }
          .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
          .fade-in { animation: fadeIn 0.2s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          
          /* Efeitos de Drag and Drop */
          .drag-item { cursor: grab; }
          .drag-item:active { cursor: grabbing; opacity: 0.7; transform: scale(0.98); }
      `}</style>
    </div>
  );
}
