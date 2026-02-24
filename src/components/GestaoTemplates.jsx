import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

// Portal para os Modais
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
  const [errorMsg, setErrorMsg] = useState("");

  // Estados do Modal Unificado
  const [modalConfig, setModalConfig] = useState({ 
      isOpen: false, mode: 'create', tipo: '', itemId: null, parentId: null, parentName: '' 
  });
  
  const [inputValue, setInputValue] = useState("");
  const [inputOrdem, setInputOrdem] = useState(1);
  const [inputDias, setInputDias] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // --- FETCHES (AGORA ORDENADOS PELA COLUNA 'ORDEM') ---
  async function fetchTipos() {
    setLoading(true); setErrorMsg("");
    try {
        const { data, error } = await supabase.from("tipos_projeto").select("*").order("nome");
        if (error) throw error;
        setTipos(data || []);
    } catch (err) { setErrorMsg("Erro ao carregar Tipos de Projeto."); setTipos([]); } 
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

  // --- LÓGICA DO MODAL ---
  const openCreateModal = (tipo, parentId = null, parentName = '') => {
      setInputValue("");
      setInputDias(0);
      
      // Calcular a próxima ordem automaticamente
      let nextOrdem = 1;
      if (tipo === 'atividade') nextOrdem = atividades.length + 1;
      if (tipo === 'tarefa') nextOrdem = tarefas.length + 1;
      if (tipo === 'subtarefa') nextOrdem = subtarefas.filter(s => s.template_tarefa_id === parentId).length + 1;
      setInputOrdem(nextOrdem);

      setModalConfig({ isOpen: true, mode: 'create', tipo, itemId: null, parentId, parentName });
  };

  const openEditModal = (tipo, item) => {
      setInputValue(item.nome || item.titulo); 
      setInputOrdem(item.ordem || 1);
      setInputDias(item.dias_estimados || 0);
      setModalConfig({ isOpen: true, mode: 'edit', tipo, itemId: item.id, parentId: null, parentName: '' });
  };

  const closeModal = () => {
      setModalConfig({ isOpen: false, mode: 'create', tipo: '', itemId: null, parentId: null, parentName: '' });
      setInputValue(""); setInputOrdem(1); setInputDias(0);
  };

  async function handleModalSubmit(e) {
      e.preventDefault();
      if (!inputValue.trim()) return;
      setIsSubmitting(true);

      try {
          const isEdit = modalConfig.mode === 'edit';
          const ordemNum = parseInt(inputOrdem, 10) || 1;
          const diasNum = parseInt(inputDias, 10) || 0;
          
          if (modalConfig.tipo === 'tipo_projeto') {
              const payload = { nome: inputValue };
              if (isEdit) {
                  await supabase.from("tipos_projeto").update(payload).eq("id", modalConfig.itemId);
                  setTipos(tipos.map(t => t.id === modalConfig.itemId ? { ...t, ...payload } : t));
                  if(selectedTipo?.id === modalConfig.itemId) setSelectedTipo({...selectedTipo, ...payload});
              } else {
                  const { data } = await supabase.from("tipos_projeto").insert([payload]).select().single();
                  if(data) setTipos([...tipos, data]);
              }
          } 
          else if (modalConfig.tipo === 'atividade') {
              const payload = { nome: inputValue, ordem: ordemNum, dias_estimados: diasNum };
              if (isEdit) {
                  await supabase.from("template_atividades").update(payload).eq("id", modalConfig.itemId);
                  setAtividades(atividades.map(a => a.id === modalConfig.itemId ? { ...a, ...payload } : a).sort((a,b)=>a.ordem-b.ordem));
                  if(selectedAtiv?.id === modalConfig.itemId) setSelectedAtiv({...selectedAtiv, ...payload});
              } else {
                  const { data } = await supabase.from("template_atividades").insert([{ ...payload, tipo_projeto_id: modalConfig.parentId }]).select().single();
                  if(data) setAtividades([...atividades, data].sort((a,b)=>a.ordem-b.ordem));
              }
          } 
          else if (modalConfig.tipo === 'tarefa') {
              const payload = { nome: inputValue, ordem: ordemNum, dias_estimados: diasNum };
              if (isEdit) {
                  await supabase.from("template_tarefas").update(payload).eq("id", modalConfig.itemId);
                  setTarefas(tarefas.map(t => t.id === modalConfig.itemId ? { ...t, ...payload } : t).sort((a,b)=>a.ordem-b.ordem));
              } else {
                  const { data } = await supabase.from("template_tarefas").insert([{ ...payload, template_atividade_id: modalConfig.parentId }]).select().single();
                  if(data) setTarefas([...tarefas, data].sort((a,b)=>a.ordem-b.ordem));
              }
          }
          else if (modalConfig.tipo === 'subtarefa') {
              const payload = { nome: inputValue, ordem: ordemNum, dias_estimados: diasNum };
              if (isEdit) {
                  await supabase.from("template_subtarefas").update(payload).eq("id", modalConfig.itemId);
                  setSubtarefas(subtarefas.map(s => s.id === modalConfig.itemId ? { ...s, ...payload } : s).sort((a,b)=>a.ordem-b.ordem));
              } else {
                  const { data } = await supabase.from("template_subtarefas").insert([{ ...payload, template_tarefa_id: modalConfig.parentId }]).select().single();
                  if(data) setSubtarefas([...subtarefas, data].sort((a,b)=>a.ordem-b.ordem));
              }
          }
          closeModal();
      } catch (err) { alert("Erro: " + err.message); } 
      finally { setIsSubmitting(false); }
  }

  async function handleDelete(tabela, id, stateSetter, listaAtual, isTipo = false, isAtiv = false) {
    if (!window.confirm("Apagar este item permanentemente? (Irá apagar todos os sub-itens)")) return;
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    if (!error) {
      stateSetter(listaAtual.filter(i => i.id !== id));
      if (isTipo && selectedTipo?.id === id) setSelectedTipo(null);
      if (isAtiv && selectedAtiv?.id === id) setSelectedAtiv(null);
      if (tabela === 'template_tarefas') setSubtarefas(subtarefas.filter(st => st.template_tarefa_id !== id));
    }
  }

  const getModalTitle = () => {
      if (modalConfig.mode === 'edit') return "Editar Item";
      switch(modalConfig.tipo) {
          case 'tipo_projeto': return "Novo Tipo de Projeto";
          case 'atividade': return `Nova Atividade em: ${modalConfig.parentName}`;
          case 'tarefa': return `Nova Tarefa em: ${modalConfig.parentName}`;
          case 'subtarefa': return `Novo Passo em: ${modalConfig.parentName}`;
          default: return "Adicionar";
      }
  };

  // ESTILOS VISUAIS
  const columnStyle = { display: 'flex', flexDirection: 'column', height: '70vh', minHeight: '500px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' };
  const columnHeaderStyle = { padding: '20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const columnTitleStyle = { margin: 0, color: '#0f172a', fontSize: '1.05rem', fontWeight: '800' };
  const subTextStyle = { color:'#64748b', fontWeight:'normal', display:'block', fontSize:'0.75rem', marginTop: '4px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '200px' };
  const btnAddStyle = { background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' };
  
  const listItemStyle = (isSelected) => ({
      padding: '12px 16px', margin: '0 10px 8px 10px', borderRadius: '10px', cursor: 'pointer',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: isSelected ? 'white' : 'transparent',
      border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
      boxShadow: isSelected ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
      color: isSelected ? '#0f172a' : '#475569',
      fontWeight: isSelected ? '700' : '500',
      transition: 'all 0.2s'
  });

  const actionBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: '0.2s', fontSize: '0.9rem' };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;

  return (
    <div className="page-container" style={{padding: '20px', maxWidth: '1400px', margin: '0 auto'}}>
      
      <div style={{marginBottom: '30px', padding: '10px 5px'}}>
        <h1 style={{margin:0, color:'#0f172a', fontSize: '2.2rem', letterSpacing: '-0.03em'}}>Templates</h1>
        <p style={{margin:'5px 0 0 0', color:'#64748b', fontSize: '1rem'}}>Define a ordem de execução e os dias estimados para concluir cada etapa num novo projeto.</p>
      </div>

      {errorMsg && <div style={{background: '#fee2e2', color: '#ef4444', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold'}}>⚠️ {errorMsg}</div>}

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '20px'}}>
        
        {/* COLUNA 1: TIPOS */}
        <div style={columnStyle}>
            <div style={columnHeaderStyle}>
                <h3 style={columnTitleStyle}>1. Tipos de Projeto</h3>
                <button onClick={() => openCreateModal('tipo_projeto')} style={btnAddStyle} className="hover-btn-blue">+ Tipo</button>
            </div>
            <div style={{flex: 1, overflowY: 'auto', padding: '15px 5px'}} className="custom-scrollbar">
                {tipos.map(t => (
                    <div key={t.id} onClick={() => setSelectedTipo(t)} style={listItemStyle(selectedTipo?.id === t.id)} className="hover-list-item">
                        <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{t.nome}</span>
                        <div style={{display: 'flex', gap: '2px'}} onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEditModal('tipo_projeto', t)} style={actionBtnStyle} className="hover-icon-blue" title="Editar Nome">✏️</button>
                            <button onClick={() => handleDelete("tipos_projeto", t.id, setTipos, tipos, true, false)} style={{...actionBtnStyle, fontSize: '1rem'}} className="hover-icon-red" title="Apagar">✕</button>
                        </div>
                    </div>
                ))}
                {tipos.length === 0 && <p style={{color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: '30px'}}>Nenhum tipo criado.</p>}
            </div>
        </div>

        {/* COLUNA 2: ATIVIDADES */}
        <div style={{...columnStyle, opacity: selectedTipo ? 1 : 0.4, pointerEvents: selectedTipo ? 'auto' : 'none', transition: '0.3s'}}>
            <div style={columnHeaderStyle}>
                <div>
                    <h3 style={columnTitleStyle}>2. Atividades (Blocos)</h3>
                    <span style={subTextStyle}>{selectedTipo ? `em ${selectedTipo.nome}` : 'Selecione um Tipo'}</span>
                </div>
                {selectedTipo && <button onClick={() => openCreateModal('atividade', selectedTipo.id, selectedTipo.nome)} style={btnAddStyle} className="hover-btn-blue">+ Bloco</button>}
            </div>
            <div style={{flex: 1, overflowY: 'auto', padding: '15px 5px'}} className="custom-scrollbar">
                {atividades.map(a => (
                    <div key={a.id} onClick={() => setSelectedAtiv(a)} style={listItemStyle(selectedAtiv?.id === a.id)} className="hover-list-item">
                        <div style={{flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden'}}>
                            <span style={{background: '#e2e8f0', color: '#475569', fontSize:'0.7rem', padding: '2px 6px', borderRadius: '4px', marginRight:'10px', fontWeight:'bold'}}>{a.ordem}º</span> 
                            <span style={{textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden'}}>{a.nome}</span>
                        </div>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}} onClick={e => e.stopPropagation()}>
                            {a.dias_estimados > 0 && <span style={{fontSize: '0.7rem', color: '#10b981', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>⏱ {a.dias_estimados}d</span>}
                            <div style={{display: 'flex', gap: '2px'}}>
                                <button onClick={() => openEditModal('atividade', a)} style={actionBtnStyle} className="hover-icon-blue" title="Editar">✏️</button>
                                <button onClick={() => handleDelete("template_atividades", a.id, setAtividades, atividades, false, true)} style={{...actionBtnStyle, fontSize: '1rem'}} className="hover-icon-red" title="Apagar">✕</button>
                            </div>
                        </div>
                    </div>
                ))}
                {selectedTipo && atividades.length === 0 && <p style={{color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: '30px'}}>Sem atividades base.</p>}
            </div>
        </div>

        {/* COLUNA 3: TAREFAS E SUBTAREFAS */}
        <div style={{...columnStyle, opacity: selectedAtiv ? 1 : 0.4, pointerEvents: selectedAtiv ? 'auto' : 'none', transition: '0.3s'}}>
            <div style={columnHeaderStyle}>
                <div>
                    <h3 style={columnTitleStyle}>3. Tarefas & Passos</h3>
                    <span style={subTextStyle}>{selectedAtiv ? `em ${selectedAtiv.nome}` : 'Selecione uma Atividade'}</span>
                </div>
                {selectedAtiv && <button onClick={() => openCreateModal('tarefa', selectedAtiv.id, selectedAtiv.nome)} style={btnAddStyle} className="hover-btn-blue">+ Tarefa</button>}
            </div>
            <div style={{flex: 1, overflowY: 'auto', padding: '15px'}} className="custom-scrollbar">
                {tarefas.map(t => {
                    const subsDaTarefa = subtarefas.filter(st => st.template_tarefa_id === t.id);
                    return (
                    <div key={t.id} style={{marginBottom: '20px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden'}}>
                        
                        <div style={{padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottom: subsDaTarefa.length > 0 ? '1px solid #f1f5f9' : 'none'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <span style={{background: '#cbd5e1', color: 'white', fontSize:'0.75rem', padding: '2px 6px', borderRadius: '4px', fontWeight:'bold'}}>{t.ordem}</span> 
                                <span style={{fontWeight: '700', color: '#1e293b', fontSize: '0.95rem'}}>{t.nome}</span>
                            </div>
                            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                {t.dias_estimados > 0 && <span style={{fontSize: '0.7rem', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>⏱ {t.dias_estimados}d</span>}
                                <div style={{display: 'flex', gap: '2px'}}>
                                    <button onClick={() => openEditModal('tarefa', t)} style={actionBtnStyle} className="hover-icon-blue" title="Editar">✏️</button>
                                    <button onClick={() => handleDelete("template_tarefas", t.id, setTarefas, tarefas)} style={{...actionBtnStyle, fontSize: '1.1rem'}} className="hover-icon-red" title="Apagar">✕</button>
                                </div>
                                <div style={{width: '1px', height: '15px', background: '#cbd5e1', margin: '0 2px'}}></div>
                                <button onClick={() => openCreateModal('subtarefa', t.id, t.nome)} style={{background: 'transparent', border: '1px dashed #cbd5e1', color: '#64748b', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer'}} className="hover-btn-dash">+ Passo</button>
                            </div>
                        </div>

                        {subsDaTarefa.length > 0 && (
                            <div style={{padding: '5px 15px 10px 30px', background: 'white'}}>
                                {subsDaTarefa.map(st => (
                                    <div key={st.id} style={{padding: '8px 0', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                            <span style={{color: '#cbd5e1', fontSize: '1.1rem', fontWeight: 'bold'}}>↳</span>
                                            <span style={{color: '#94a3b8', fontSize:'0.7rem', fontWeight:'bold'}}>{st.ordem}.</span>
                                            <span style={{fontSize: '0.9rem', color: '#475569', fontWeight: '500'}}>{st.nome}</span>
                                        </div>
                                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                            {st.dias_estimados > 0 && <span style={{fontSize: '0.65rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>{st.dias_estimados}d</span>}
                                            <div style={{display: 'flex', gap: '2px'}}>
                                                <button onClick={() => openEditModal('subtarefa', st)} style={{...actionBtnStyle, opacity: 0.4}} className="hover-icon-blue">✏️</button>
                                                <button onClick={() => handleDelete("template_subtarefas", st.id, setSubtarefas, subtarefas)} style={{...actionBtnStyle, opacity: 0.4}} className="hover-icon-red">✕</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )})}
                {selectedAtiv && tarefas.length === 0 && <p style={{color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: '30px'}}>Sem tarefas criadas.</p>}
            </div>
        </div>

      </div>

      {/* --- MODAL UNIFICADO COM ORDEM E DIAS --- */}
      {modalConfig.isOpen && (
          <ModalPortal>
              <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}}>
                  <div style={{background: 'white', width: '90%', maxWidth: '400px', borderRadius: '16px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
                          <h3 style={{margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: '800'}}>{getModalTitle()}</h3>
                          <button onClick={closeModal} style={{background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer', padding: 0}} className="hover-icon-red">✕</button>
                      </div>

                      <form onSubmit={handleModalSubmit}>
                          <label style={{display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px'}}>Nome do Item *</label>
                          <input type="text" autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Escreve aqui..." required style={{width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', marginBottom: '20px', outline: 'none', boxSizing: 'border-box', color: '#1e293b', fontWeight: '500'}} />

                          {modalConfig.tipo !== 'tipo_projeto' && (
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px'}}>
                                  <div>
                                      <label style={{display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px'}}>Nº Ordem</label>
                                      <input type="number" value={inputOrdem} onChange={(e) => setInputOrdem(e.target.value)} min="1" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box'}} />
                                  </div>
                                  <div>
                                      <label style={{display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px'}}>Dias a Concluir</label>
                                      <input type="number" value={inputDias} onChange={(e) => setInputDias(e.target.value)} min="0" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box'}} />
                                  </div>
                              </div>
                          )}

                          <div style={{display: 'flex', gap: '10px'}}>
                              <button type="button" onClick={closeModal} style={{flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer'}}>Cancelar</button>
                              <button type="submit" disabled={isSubmitting} style={{flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer'}}>{isSubmitting ? 'A guardar...' : 'Guardar'}</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      <style>{`
          .hover-list-item:hover { background-color: white !important; border-color: #cbd5e1 !important; }
          .hover-btn-blue:hover { background-color: #dbeafe !important; }
          .hover-btn-dash:hover { border-color: #94a3b8 !important; color: #1e293b !important; }
          .hover-icon-blue:hover { opacity: 1 !important; color: #2563eb !important; }
          .hover-icon-red:hover { opacity: 1 !important; color: #ef4444 !important; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}