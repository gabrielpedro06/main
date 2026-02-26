import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Play: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Pause: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  Stop: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
  History: ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Calendar: ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Edit: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Alert: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Close: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

// --- PORTAL ---
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const WidgetAssiduidade = React.memo(function WidgetAssiduidade() {
  const { user } = useAuth();
  
  // Estados
  const [timer, setTimer] = useState(0); 
  const [status, setStatus] = useState("stopped"); 
  const [registroId, setRegistroId] = useState(null); 
  const [activeRecord, setActiveRecord] = useState(null); 
  const [loading, setLoading] = useState(false);

  // Modais
  const [showHistoryModal, setShowHistoryModal] = useState(false); 
  const [showClockOutModal, setShowClockOutModal] = useState(false); 
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Dados
  const [historicoHoje, setHistoricoHoje] = useState([]);
  const [editItem, setEditItem] = useState(null); 
  const [dailySummary, setDailySummary] = useState(""); 
  const [itemToDelete, setItemToDelete] = useState(null);

  // --- 1. VERIFICAR ESTADO E AUTO-ENCERRAMENTO ---
  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const hojeStr = new Date().toLocaleDateString('en-CA'); 

      const { data: ativo } = await supabase
        .from("assiduidade")
        .select("*")
        .eq("user_id", user.id)
        .is("hora_saida", null)
        .order('data_registo', { ascending: false })
        .limit(1)
        .maybeSingle(); 

      if (ativo) {
        if (ativo.data_registo < hojeStr) {
            let accumulated = ativo.tempo_pausa_acumulado || 0;
            if (ativo.ultima_pausa_inicio) {
                 const inicioPausa = new Date(`${ativo.data_registo}T${ativo.ultima_pausa_inicio}`).getTime();
                 const fimDia = new Date(`${ativo.data_registo}T23:59:59`).getTime();
                 accumulated += Math.floor((fimDia - inicioPausa) / 1000);
            }

            const notaAuto = "Não picou ponto para sair. Encerrado automaticamente.";
            const novaObservacao = ativo.observacoes ? ativo.observacoes + "\n" + notaAuto : notaAuto;

            await supabase.from("assiduidade").update({
              hora_saida: "23:59:59",
              ultima_pausa_inicio: null,
              tempo_pausa_acumulado: accumulated,
              observacoes: novaObservacao
            }).eq("id", ativo.id);

            setStatus("stopped");
            setTimer(0);
            setRegistroId(null);
            setActiveRecord(null);
        } else {
            setRegistroId(ativo.id);
            setActiveRecord(ativo);
            
            if (ativo.ultima_pausa_inicio) {
                setStatus("paused");
                const entrada = new Date(`${ativo.data_registo}T${ativo.hora_entrada}`).getTime();
                const inicioPausa = new Date(`${ativo.data_registo}T${ativo.ultima_pausa_inicio}`).getTime();
                const totalTrabalhado = Math.floor((inicioPausa - entrada) / 1000) - (ativo.tempo_pausa_acumulado || 0);
                setTimer(totalTrabalhado > 0 ? totalTrabalhado : 0);
            } else {
                setStatus("running");
                const entrada = new Date(`${ativo.data_registo}T${ativo.hora_entrada}`).getTime();
                const now = new Date().getTime();
                const diffSeconds = Math.floor((now - entrada) / 1000) - (ativo.tempo_pausa_acumulado || 0);
                setTimer(diffSeconds > 0 ? diffSeconds : 0);
            }
        }
      } else {
        setStatus("stopped");
        setTimer(0);
        setRegistroId(null);
        setActiveRecord(null);
      }
    } catch (err) {
      console.error("Erro assiduidade:", err);
    }
  }, [user?.id]);

  useEffect(() => { 
      checkStatus(); 
      window.addEventListener('focus', checkStatus);
      return () => window.removeEventListener('focus', checkStatus);
  }, [checkStatus]); 

  useEffect(() => {
    let interval = null;
    if (status === "running" && activeRecord) {
      interval = setInterval(() => {
          const entrada = new Date(`${activeRecord.data_registo}T${activeRecord.hora_entrada}`).getTime();
          const now = Date.now();
          const diffSeconds = Math.floor((now - entrada) / 1000) - (activeRecord.tempo_pausa_acumulado || 0);
          setTimer(diffSeconds > 0 ? diffSeconds : 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, activeRecord]);

  // --- 2. AÇÕES DE TEMPO ---
  async function handleStart() {
    if (loading) return;
    setLoading(true);
    try {
        const now = new Date();
        const horaAtual = now.toLocaleTimeString('pt-PT', { hour12: false }); 
        const dataAtual = now.toLocaleDateString('en-CA');

        const { data, error } = await supabase
            .from("assiduidade")
            .insert([{ user_id: user.id, data_registo: dataAtual, hora_entrada: horaAtual, tempo_pausa_acumulado: 0 }])
            .select().single();

        if (data && !error) { 
            setActiveRecord(data);
            setRegistroId(data.id); 
            setStatus("running"); 
            setTimer(0);
        }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function handlePause() {
      if (!registroId || loading) return;
      setLoading(true);
      try {
        const horaAtual = new Date().toLocaleTimeString('pt-PT', { hour12: false });
        const { data, error } = await supabase.from("assiduidade").update({ ultima_pausa_inicio: horaAtual }).eq("id", registroId).select().single();
        if (!error) {
            setActiveRecord(data);
            setStatus("paused");
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleResume() {
      if (!registroId || loading) return;
      setLoading(true);
      try {
        const { data: atual } = await supabase.from("assiduidade").select("*").eq("id", registroId).single();
        if (atual && atual.ultima_pausa_inicio) {
            const now = new Date();
            const inicioPausa = new Date(`${atual.data_registo}T${atual.ultima_pausa_inicio}`).getTime();
            const segundosPausa = Math.floor((now.getTime() - inicioPausa) / 1000);
            const novoAcumulado = (atual.tempo_pausa_acumulado || 0) + segundosPausa;

            const { data: updated, error } = await supabase.from("assiduidade")
                .update({ tempo_pausa_acumulado: novoAcumulado, ultima_pausa_inicio: null })
                .eq("id", registroId)
                .select().single();

            if (!error) {
                setActiveRecord(updated);
                setStatus("running");
            }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  function handleFinishClick() { setDailySummary(""); setShowClockOutModal(true); }

  async function confirmFinish(e) {
      e.preventDefault();
      if (!dailySummary.trim()) { alert("Resumo obrigatório."); return; }
      setLoading(true);
      try {
        let dadosFinais = { 
            hora_saida: new Date().toLocaleTimeString('pt-PT', { hour12: false }),
            observacoes: dailySummary,
            ultima_pausa_inicio: null 
        };

        if (status === "paused") {
             const { data: atual } = await supabase.from("assiduidade").select("*").eq("id", registroId).single();
             if (atual && atual.ultima_pausa_inicio) {
                 const inicioPausa = new Date(`${atual.data_registo}T${atual.ultima_pausa_inicio}`).getTime();
                 const segundosPausa = Math.floor((new Date().getTime() - inicioPausa) / 1000);
                 dadosFinais.tempo_pausa_acumulado = (atual.tempo_pausa_acumulado || 0) + segundosPausa;
             }
        }
        const { error } = await supabase.from("assiduidade").update(dadosFinais).eq("id", registroId);
        if (!error) { 
            setStatus("stopped"); 
            setRegistroId(null); 
            setActiveRecord(null);
            setTimer(0); 
            setShowClockOutModal(false); 
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  // --- 3. HISTÓRICO E EDIÇÃO ---
  async function openHistory() {
    const hoje = new Date().toLocaleDateString('en-CA'); 
    const { data } = await supabase.from("assiduidade").select("*").eq("user_id", user.id).eq("data_registo", hoje).order("hora_entrada", { ascending: false });
    setHistoricoHoje(data || []);
    setEditItem(null);
    setShowHistoryModal(true);
  }

  const getIsoForInput = (dataStr, horaStr) => (dataStr && horaStr) ? `${dataStr}T${horaStr}` : "";
  
  const startEditing = (item) => {
      setEditItem({
          ...item,
          tempEntrada: getIsoForInput(item.data_registo, item.hora_entrada),
          tempSaida: item.hora_saida ? getIsoForInput(item.data_registo, item.hora_saida) : "",
          tempPausaMinutos: item.tempo_pausa_acumulado ? Math.floor(item.tempo_pausa_acumulado / 60) : 0, 
          observacoes: item.observacoes || "",
          motivo_alteracao: item.motivo_alteracao || "" 
      });
  };

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editItem.motivo_alteracao) { alert("Motivo obrigatório."); return; }

    const [dataEntrada, horaEntrada] = editItem.tempEntrada.split('T');
    
    let horaSaida = null;
    if (editItem.tempSaida && editItem.tempSaida.includes('T')) {
        horaSaida = editItem.tempSaida.split('T')[1];
    }

    let hEntradaFinal = horaEntrada?.length === 5 ? horaEntrada + ":00" : horaEntrada;
    let hSaidaFinal = horaSaida?.length === 5 ? horaSaida + ":00" : horaSaida;

    const pausaSegundos = (parseInt(editItem.tempPausaMinutos) || 0) * 60;

    const payload = {
        data_registo: dataEntrada, 
        hora_entrada: hEntradaFinal, 
        hora_saida: hSaidaFinal,
        tempo_pausa_acumulado: pausaSegundos, 
        observacoes: editItem.observacoes, 
        motivo_alteracao: editItem.motivo_alteracao
    };

    if (editItem.id) await supabase.from("assiduidade").update(payload).eq("id", editItem.id);
    else await supabase.from("assiduidade").insert([{ ...payload, user_id: user.id }]);
    
    setEditItem(null); await openHistory(); checkStatus();
  }

  function askDelete(id) { setItemToDelete(id); setShowDeleteModal(true); }
  async function confirmDelete() {
      if (!itemToDelete) return;
      const { error } = await supabase.from("assiduidade").delete().eq("id", itemToDelete);
      if (!error) { await openHistory(); checkStatus(); }
      setShowDeleteModal(false); setItemToDelete(null);
  }

  const formatTime = (s) => {
    const h = Math.floor(s/3600).toString().padStart(2,"0");
    const m = Math.floor((s%3600)/60).toString().padStart(2,"0");
    const sc = (s%60).toString().padStart(2,"0");
    return `${h}:${m}:${sc}`;
  };

  // --- ESTILOS VISUAIS PREMIUM ---
  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' };
  const modalContainerStyle = { background: '#fff', borderRadius: '16px', width: '95%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' };
  const modalHeaderStyle = { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' };
  const inputLabelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputFieldStyle = { width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', background: '#fff', boxSizing: 'border-box', outline: 'none', color: '#1e293b', transition: 'border 0.2s' };
  
  const actionBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', transition: '0.2s' };

  return (
    <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', minHeight: '340px', padding: '25px' }}>
      
      <button onClick={openHistory} className="hover-shadow" style={{position: 'absolute', top: 15, right: 15, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: '0.2s'}} title="Histórico do Dia">
          <Icons.History />
      </button>

      <div style={{ marginBottom: '5px', color: '#64748b', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {status === 'paused' ? <><Icons.Pause size={14} /> Em Pausa</> : (status === 'running' ? <><Icons.Play size={14} /> A Trabalhar</> : 'Registo de Ponto')}
      </div>
      
      {activeRecord && status !== 'stopped' && (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>
              Início às {activeRecord.hora_entrada?.slice(0, 5)}
          </div>
      )}
      
      <div style={{ fontSize: '4rem', fontWeight: '800', fontFamily: 'monospace', color: status === 'paused' ? '#eab308' : (status === 'running' ? '#2563eb' : '#cbd5e1'), margin: '20px 0', letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(timer)}
      </div>

      <div style={{ marginTop: 'auto' }}>
        {status === 'stopped' && (
            <button onClick={handleStart} disabled={loading} className="btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem' }}>
                <Icons.Play size={18} /> {loading ? "A processar..." : "Iniciar Dia de Trabalho"}
            </button>
        )}
        {status === 'running' && (
            <div style={{display: 'flex', gap: '12px'}}>
                <button onClick={handlePause} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #fef08a', cursor: 'pointer', background: '#fefce8', color: '#b45309', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: '0.2s' }} className="hover-shadow">
                    <Icons.Pause size={16} /> Pausar
                </button>
                <button onClick={handleFinishClick} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', cursor: 'pointer', background: '#fef2f2', color: '#b91c1c', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: '0.2s' }} className="hover-shadow">
                    <Icons.Stop size={16} /> Terminar
                </button>
            </div>
        )}
        {status === 'paused' && (
            <div style={{display: 'flex', gap: '12px'}}>
                <button onClick={handleResume} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', cursor: 'pointer', background: '#f0fdf4', color: '#15803d', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: '0.2s' }} className="hover-shadow">
                    <Icons.Play size={16} /> Retomar
                </button>
                <button onClick={handleFinishClick} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', cursor: 'pointer', background: '#fef2f2', color: '#b91c1c', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: '0.2s' }} className="hover-shadow">
                    <Icons.Stop size={16} /> Terminar
                </button>
            </div>
        )}
      </div>

      {status === 'running' && <div style={{marginTop:'20px', fontSize:'0.8rem', color:'#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}><span className="pulse-dot"></span> Tempo a decorrer</div>}
      {status === 'paused' && <div style={{marginTop:'20px', fontSize:'0.8rem', color:'#eab308', fontWeight: '600'}}>O tempo está parado.</div>}

      {/* --- MODAL DE HISTÓRICO & EDIÇÃO --- */}
      {showHistoryModal && (
        <ModalPortal>
            <div style={modalOverlayStyle} onClick={(e) => { if(e.target === e.currentTarget) setShowHistoryModal(false); }}>
                <div style={modalContainerStyle}>
                    
                    <div style={modalHeaderStyle}>
                        <h3 style={{margin:0, color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800'}}>
                            {editItem ? (
                                <><span style={{color: '#2563eb'}}><Icons.Edit size={20} /></span> Corrigir Registo</>
                            ) : (
                                <><span style={{color: '#2563eb'}}><Icons.Calendar size={20} /></span> Histórico de Hoje</>
                            )}
                        </h3>
                        <button onClick={() => setShowHistoryModal(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center'}} className="hover-red-text"><Icons.Close size={20}/></button>
                    </div>

                    <div style={{padding: '25px', overflowY: 'auto', maxHeight: '75vh', background: '#f8fafc'}}>
                        {!editItem ? (
                            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                                {historicoHoje.length === 0 ? <div style={{textAlign:'center', color:'#94a3b8', padding:'30px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>Sem registos de ponto hoje.</div> : 
                                    historicoHoje.map(h => (
                                        <div key={h.id} style={{background:'white', border: '1px solid #e2e8f0', padding:'20px', borderRadius:'12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', transition: '0.2s'}} className="hover-shadow">
                                            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                                
                                                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                                    <span style={{background:'#f0fdf4', color:'#16a34a', border: '1px solid #bbf7d0', padding:'4px 10px', borderRadius:'8px', fontSize:'0.7rem', fontWeight:'800', textTransform:'uppercase', minWidth: '70px', textAlign: 'center'}}>Entrada</span>
                                                    <span style={{fontWeight:'700', color:'#1e293b', fontSize:'1.1rem'}}>{h.hora_entrada?.slice(0,5)}</span>
                                                </div>
                                                
                                                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                                    <span style={{background: h.hora_saida ? '#fef2f2' : '#f1f5f9', color: h.hora_saida ? '#dc2626' : '#64748b', border: h.hora_saida ? '1px solid #fecaca' : '1px solid #e2e8f0', padding:'4px 10px', borderRadius:'8px', fontSize:'0.7rem', fontWeight:'800', textTransform:'uppercase', minWidth: '70px', textAlign: 'center'}}>
                                                        {h.hora_saida ? 'Saída' : 'A decorrer'}
                                                    </span>
                                                    <span style={{fontWeight:'700', color:'#1e293b', fontSize:'1.1rem'}}>{h.hora_saida ? h.hora_saida?.slice(0,5) : '--:--'}</span>
                                                </div>
                                                
                                                {h.tempo_pausa_acumulado > 0 && (
                                                    <div style={{fontSize:'0.8rem', color:'#d97706', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                                        <Icons.Pause size={12} /> Pausa total: {Math.floor(h.tempo_pausa_acumulado/60)} min
                                                    </div>
                                                )}
                                                
                                                {h.observacoes && (
                                                    <div style={{fontSize:'0.85rem', color:'#64748b', marginTop:'4px', background: '#f8fafc', padding: '8px', borderRadius: '6px'}}>
                                                        {h.observacoes}
                                                    </div>
                                                )}
                                                
                                                {h.motivo_alteracao && (
                                                    <div style={{fontSize:'0.8rem', color:'#ea580c', fontWeight:'600', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px'}}>
                                                        <Icons.Alert size={14} color="#ea580c" /> Editado: {h.motivo_alteracao}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{display:'flex', flexDirection: 'column', gap:'6px'}}>
                                                <button onClick={() => startEditing(h)} style={actionBtnStyle} className="hover-blue-btn" title="Editar"><Icons.Edit /></button>
                                                <button onClick={() => askDelete(h.id)} style={actionBtnStyle} className="hover-red-btn" title="Apagar"><Icons.Trash /></button>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        ) : (
                            <form onSubmit={handleSaveEdit}>
                                <div style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
                                    <div style={{flex:1}}>
                                        <label style={inputLabelStyle}>Entrada *</label>
                                        <input type="datetime-local" value={editItem.tempEntrada} onChange={e => setEditItem({...editItem, tempEntrada: e.target.value})} required style={inputFieldStyle} className="input-focus" />
                                    </div>
                                    <div style={{flex:1}}>
                                        <label style={inputLabelStyle}>Saída</label>
                                        <input type="datetime-local" value={editItem.tempSaida} onChange={e => setEditItem({...editItem, tempSaida: e.target.value})} style={inputFieldStyle} className="input-focus" />
                                    </div>
                                </div>

                                <div style={{marginBottom: '20px'}}>
                                    <label style={inputLabelStyle}>Tempo de Pausa (Minutos)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        placeholder="0"
                                        value={editItem.tempPausaMinutos} 
                                        onChange={e => setEditItem({...editItem, tempPausaMinutos: e.target.value})} 
                                        style={inputFieldStyle} 
                                        className="input-focus"
                                    />
                                    <small style={{color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px', display: 'block'}}>Total de minutos gastos em almoço/pausas.</small>
                                </div>
                                
                                <div style={{marginBottom: '20px'}}>
                                    <label style={inputLabelStyle}>Resumo do Dia</label>
                                    <textarea rows="2" value={editItem.observacoes || ""} onChange={e => setEditItem({...editItem, observacoes: e.target.value})} placeholder="O que foi feito..." style={{...inputFieldStyle, resize:'vertical'}} className="input-focus" />
                                </div>

                                <div style={{marginBottom: '30px'}}>
                                    <label style={{...inputLabelStyle, color: '#b45309'}}>Motivo da Correção *</label>
                                    <textarea required rows="2" value={editItem.motivo_alteracao} onChange={e => setEditItem({...editItem, motivo_alteracao: e.target.value})} placeholder="Ex: Esqueci-me de picar de manhã..." style={{...inputFieldStyle, resize:'vertical', background:'#fffbeb', borderColor:'#fde68a'}} className="input-focus-alert" />
                                    <div style={{color:'#b45309', fontSize:'0.75rem', marginTop: '6px', fontWeight: '500'}}>Obrigatório justificar alterações manuais.</div>
                                </div>

                                <div style={{display:'flex', gap:'10px', borderTop: '1px solid #e2e8f0', paddingTop: '20px'}}>
                                    <button type="button" onClick={() => setEditItem(null)} style={{flex:1, padding:'12px', border:'1px solid #cbd5e1', background:'white', borderRadius:'8px', cursor:'pointer', fontWeight: '700', color: '#64748b', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                                    <button type="submit" style={{flex:1, padding:'12px', border:'none', background:'#2563eb', color:'white', borderRadius:'8px', cursor:'pointer', fontWeight: '700', transition: '0.2s'}} className="hover-shadow">💾 Guardar Registo</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
      )}

      {/* MODAL APAGAR */}
      {showDeleteModal && (
          <ModalPortal>
              <div style={modalOverlayStyle}>
                  <div style={{background: 'white', borderRadius: '16px', width: '90%', maxWidth: '380px', padding: '30px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.Alert size={40} color="#ef4444" /></div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Apagar Registo?</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.4'}}>Tem a certeza? Esta ação apagará permanentemente as horas registadas neste bloco.</p>
                      <div style={{display:'flex', gap:'10px'}}>
                          <button onClick={() => setShowDeleteModal(false)} style={{flex:1, padding:'12px', border:'1px solid #cbd5e1', borderRadius:'10px', background:'white', fontWeight: '700', color: '#64748b', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                          <button onClick={confirmDelete} style={{flex:1, padding:'12px', border:'none', background:'#ef4444', color:'white', borderRadius:'10px', fontWeight: '700', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Sim, Apagar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL TERMINAR */}
      {showClockOutModal && (
          <ModalPortal>
              <div style={modalOverlayStyle}>
                  <div style={{...modalContainerStyle, maxWidth: '450px'}}>
                      <div style={modalHeaderStyle}>
                          <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Stop size={20} color="#ef4444" /> Terminar Registo</h3>
                          <button onClick={() => setShowClockOutModal(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8'}} className="hover-red-text"><Icons.Close size={20}/></button>
                      </div>
                      <form onSubmit={confirmFinish} style={{padding: '25px', background: '#f8fafc'}}>
                          <label style={inputLabelStyle}>Resumo das tarefas de hoje *</label>
                          <textarea required rows="4" value={dailySummary} onChange={e => setDailySummary(e.target.value)} style={{...inputFieldStyle, background: 'white', resize: 'vertical'}} className="input-focus" placeholder="Descreve o que foi feito..." autoFocus />
                          
                          <div style={{display:'flex', gap:'10px', marginTop:'25px'}}>
                              <button type="button" onClick={() => setShowClockOutModal(false)} style={{flex:1, padding:'12px', borderRadius:'10px', border:'1px solid #cbd5e1', background:'white', fontWeight:'700', color: '#64748b', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                              <button type="submit" style={{flex:1, padding:'12px', borderRadius:'10px', border:'none', background:'#dc2626', color:'white', fontWeight:'700', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} className="hover-shadow">🏁 Confirmar Saída</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      <style>{`
        .pulse-dot { width: 8px; height: 8px; background-color: #16a34a; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; } 
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); } }
        
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important; }
        .hover-blue-btn:hover { background-color: #eff6ff !important; color: #2563eb !important; }
        .hover-red-btn:hover { background-color: #fef2f2 !important; color: #ef4444 !important; }
        .hover-red-text:hover { color: #ef4444 !important; }
        
        .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        .input-focus-alert:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1); }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
});

export default WidgetAssiduidade;