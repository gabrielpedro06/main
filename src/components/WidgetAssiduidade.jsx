import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

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
  const [activeRecord, setActiveRecord] = useState(null); // Gurada o registo atual para cálculos matemáticos exatos
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
      const hojeStr = new Date().toLocaleDateString('en-CA'); // Ex: 2026-02-19

      // Procura QUALQUER ponto aberto (sem hora de saída), seja de hoje ou de ontem
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
            // =========================================================
            // 🚨 DETETOU PONTO ABERTO DE DIAS ANTERIORES - AUTO FECHO
            // =========================================================
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

            // Como era de ontem, garantimos que a UI de hoje fica limpa para recomeçar
            setStatus("stopped");
            setTimer(0);
            setRegistroId(null);
            setActiveRecord(null);
        } else {
            // =========================================================
            // ✅ PONTO DE HOJE - COMPORTAMENTO NORMAL
            // =========================================================
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

  // Recalcular quando a página entra em Foco (para quem deixa o PC a dormir)
  useEffect(() => { 
      checkStatus(); 
      window.addEventListener('focus', checkStatus);
      return () => window.removeEventListener('focus', checkStatus);
  }, [checkStatus]); 

  // O NOVO RELÓGIO INTELIGENTE (Não se atrasa mesmo que a tab adormeça)
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

  // --- ESTILOS VISUAIS ---
  const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' };
  const modalContainerStyle = { background: '#fff', borderRadius: '16px', width: '95%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
  const modalHeaderStyle = { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' };
  const inputLabelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputFieldStyle = { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', color: '#1e293b' };

  return (
    <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', minHeight: '340px' }}>
      
      <button onClick={openHistory} style={{position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.7, zIndex: 10, color: '#64748b'}}>⚙️</button>

      <h3 style={{ marginBottom: '5px', color: '#64748b', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {status === 'paused' ? '⏸️ Em Pausa' : (status === 'running' ? '⏱️ A Trabalhar' : 'Registo de Ponto')}
      </h3>
      
      {/* NOVO: Hora de início */}
      {activeRecord && status !== 'stopped' && (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
              (Início: {activeRecord.hora_entrada?.slice(0, 5)})
          </div>
      )}
      
      <div style={{ fontSize: '3.5rem', fontWeight: '800', fontFamily: 'monospace', color: status === 'paused' ? '#eab308' : (status === 'running' ? '#2563eb' : '#cbd5e1'), margin: '15px 0' }}>
        {formatTime(timer)}
      </div>

      <div style={{ marginTop: 'auto' }}>
        {status === 'stopped' && (
            <button onClick={handleStart} disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#2563eb', color: '#ffffff', fontWeight: 'bold' }}>
                {loading ? "..." : "▶ INICIAR DIA"}
            </button>
        )}
        {status === 'running' && (
            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={handlePause} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#fef08a', color: '#854d0e', fontWeight: 'bold' }}>⏸️ Pausa</button>
                <button onClick={handleFinishClick} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }}>🏁 Terminar</button>
            </div>
        )}
        {status === 'paused' && (
            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={handleResume} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#dcfce7', color: '#166534', fontWeight: 'bold' }}>▶ Retomar</button>
                <button onClick={handleFinishClick} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }}>🏁 Terminar</button>
            </div>
        )}
      </div>

      {status === 'running' && <div style={{marginTop:'15px', fontSize:'0.8rem', color:'#16a34a'}}><span className="pulse-dot"></span> A contar...</div>}
      {status === 'paused' && <div style={{marginTop:'15px', fontSize:'0.8rem', color:'#eab308'}}>⏸️ Tempo parado</div>}

      {/* --- MODAL DE HISTÓRICO & EDIÇÃO --- */}
      {showHistoryModal && (
        <ModalPortal>
            <div style={modalOverlayStyle} onClick={(e) => { if(e.target === e.currentTarget) setShowHistoryModal(false); }}>
                <div style={modalContainerStyle}>
                    
                    <div style={modalHeaderStyle}>
                        <h3 style={{margin:0, color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                            {editItem ? (
                                <><span>✏️</span> Corrigir Registo</>
                            ) : (
                                <><span>📅</span> Histórico de Hoje</>
                            )}
                        </h3>
                        <button onClick={() => setShowHistoryModal(false)} style={{background:'#f1f5f9', border:'none', width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', color:'#64748b', fontSize: '1rem', display:'flex', alignItems:'center', justifyContent:'center'}}>✕</button>
                    </div>

                    <div style={{padding: '24px', overflowY: 'auto', maxHeight: '75vh'}}>
                        {!editItem ? (
                            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                                {historicoHoje.length === 0 ? <div style={{textAlign:'center', color:'#94a3b8', padding:'20px'}}>Sem registos hoje.</div> : 
                                    historicoHoje.map(h => (
                                        <div key={h.id} style={{background:'#fff', border: '1px solid #f1f5f9', padding:'16px', borderRadius:'12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span style={{background:'#dcfce7', color:'#166534', padding:'3px 8px', borderRadius:'6px', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', minWidth: '70px', textAlign: 'center'}}>ENTRADA</span>
                                                    <span style={{fontWeight:'600', color:'#334151', fontSize:'1.1rem'}}>{h.hora_entrada?.slice(0,5)}</span>
                                                </div>
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span style={{background: h.hora_saida ? '#fee2e2' : '#f1f5f9', color: h.hora_saida ? '#991b1b' : '#64748b', padding:'3px 8px', borderRadius:'6px', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', minWidth: '70px', textAlign: 'center'}}>
                                                        {h.hora_saida ? 'SAÍDA' : 'EM CURSO'}
                                                    </span>
                                                    <span style={{fontWeight:'600', color:'#334151', fontSize:'1.1rem'}}>{h.hora_saida ? h.hora_saida?.slice(0,5) : '--:--'}</span>
                                                </div>
                                                
                                                {h.tempo_pausa_acumulado > 0 && (
                                                    <div style={{fontSize:'0.8rem', color:'#eab308', marginLeft: '2px', fontWeight: '500'}}>
                                                        ⏸️ Pausa total: {Math.floor(h.tempo_pausa_acumulado/60)} min
                                                    </div>
                                                )}
                                                {h.observacoes && (
                                                    <div style={{fontSize:'0.85rem', color:'#64748b', fontStyle:'italic', marginTop:'2px', marginLeft: '2px'}}>
                                                        Resumo: {h.observacoes}
                                                    </div>
                                                )}
                                                {h.motivo_alteracao && (
                                                    <div style={{fontSize:'0.75rem', color:'#ea580c', fontWeight:'500'}}>
                                                        ⚠️ Motivo: {h.motivo_alteracao}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{display:'flex', gap:'8px'}}>
                                                <button onClick={() => startEditing(h)} style={{background:'#f8fafc', border:'1px solid #e2e8f0', width:'40px', height:'40px', borderRadius:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}} title="Editar">✏️</button>
                                                <button onClick={() => askDelete(h.id)} style={{background:'#fef2f2', border:'1px solid #fee2e2', width:'40px', height:'40px', borderRadius:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}} title="Apagar">🗑️</button>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        ) : (
                            <form onSubmit={handleSaveEdit}>
                                <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
                                    <div style={{flex:1}}>
                                        <label style={inputLabelStyle}>Entrada *</label>
                                        <input type="datetime-local" value={editItem.tempEntrada} onChange={e => setEditItem({...editItem, tempEntrada: e.target.value})} required style={inputFieldStyle} />
                                    </div>
                                    <div style={{flex:1}}>
                                        <label style={inputLabelStyle}>Saída</label>
                                        <input type="datetime-local" value={editItem.tempSaida} onChange={e => setEditItem({...editItem, tempSaida: e.target.value})} style={inputFieldStyle} />
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
                                    />
                                    <small style={{color: '#94a3b8', fontSize: '0.75rem'}}>Total de minutos gastos em almoço/pausas.</small>
                                </div>
                                
                                <div style={{marginBottom: '20px'}}>
                                    <label style={inputLabelStyle}>Resumo do Dia</label>
                                    <textarea rows="2" value={editItem.observacoes || ""} onChange={e => setEditItem({...editItem, observacoes: e.target.value})} placeholder="O que foi feito..." style={{...inputFieldStyle, resize:'vertical'}} />
                                </div>

                                <div style={{marginBottom: '30px'}}>
                                    <label style={{...inputLabelStyle, color: '#c2410c'}}>Motivo da Correção *</label>
                                    <textarea required rows="2" value={editItem.motivo_alteracao} onChange={e => setEditItem({...editItem, motivo_alteracao: e.target.value})} placeholder="Ex: Esqueci-me de picar de manhã..." style={{...inputFieldStyle, resize:'vertical', background:'#fff7ed', borderColor:'#fdba74'}} />
                                    <div style={{color:'#c2410c', fontSize:'0.75rem', marginTop: '6px'}}>Obrigatório justificar alterações manuais.</div>
                                </div>

                                <div style={{display:'flex', gap:'15px'}}>
                                    <button type="button" onClick={() => setEditItem(null)} style={{flex:1, padding:'14px', border:'1px solid #e2e8f0', background:'white', borderRadius:'8px', cursor:'pointer', fontWeight: '600', color: '#64748b'}}>Cancelar</button>
                                    <button type="submit" style={{flex:1, padding:'14px', border:'none', background:'#2563eb', color:'white', borderRadius:'8px', cursor:'pointer', fontWeight: '600'}}>Gravar</button>
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
                  <div style={{background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '350px', padding: '24px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{fontSize: '3rem', marginBottom: '10px'}}>🗑️</div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b'}}>Apagar Registo?</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', fontSize: '0.9rem'}}>Tem a certeza? Esta ação é irreversível.</p>
                      <div style={{display:'flex', gap:'10px'}}>
                          <button onClick={() => setShowDeleteModal(false)} style={{flex:1, padding:'12px', border:'1px solid #e2e8f0', borderRadius:'8px', background:'white', fontWeight: '600', color: '#64748b'}}>Cancelar</button>
                          <button onClick={confirmDelete} style={{flex:1, padding:'12px', border:'none', background:'#ef4444', color:'white', borderRadius:'8px', fontWeight: '600'}}>Apagar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* MODAL TERMINAR */}
      {showClockOutModal && (
          <ModalPortal>
              <div style={modalOverlayStyle}>
                  <div style={{...modalContainerStyle, padding: '30px'}}>
                      {/* --- NOVO TEXTO: Terminar Registo --- */}
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b'}}>Terminar Registo</h3>
                      <p style={{color: '#64748b', marginBottom: '20px'}}>Resumo das tarefas:</p>
                      <form onSubmit={confirmFinish}>
                          <textarea required rows="4" value={dailySummary} onChange={e => setDailySummary(e.target.value)} style={inputFieldStyle} autoFocus />
                          <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                              <button type="button" onClick={() => setShowClockOutModal(false)} style={{flex:1, padding:'12px', borderRadius:'8px', border:'1px solid #ddd', background:'white', fontWeight:'600', color: '#64748b'}}>Voltar</button>
                              <button type="submit" style={{flex:1, padding:'12px', borderRadius:'8px', border:'none', background:'#dc2626', color:'white', fontWeight:'600'}}>Confirmar</button>
                          </div>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      <style>{`.pulse-dot { width: 8px; height: 8px; background-color: #16a34a; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; } @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 70% { transform: scale(1); opacity: 0; } 100% { transform: scale(0.95); opacity: 0; } }`}</style>
    </div>
  );
});

export default WidgetAssiduidade;