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
  
  // Estados do Relógio
  const [timer, setTimer] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const [registroId, setRegistroId] = useState(null); 
  const [loading, setLoading] = useState(false);

  // Estados dos Modais Principais
  const [showHistoryModal, setShowHistoryModal] = useState(false); 
  const [showClockOutModal, setShowClockOutModal] = useState(false); 
  
  // Estados do Modal de Apagar (NOVO)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Dados
  const [historicoHoje, setHistoricoHoje] = useState([]);
  const [editItem, setEditItem] = useState(null); 
  const [dailySummary, setDailySummary] = useState(""); 

  // --- LÓGICA PRINCIPAL ---
  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: ativo } = await supabase
        .from("assiduidade")
        .select("*")
        .eq("user_id", user.id)
        .is("hora_saida", null)
        .order("data_registo", { ascending: false })
        .limit(1)
        .maybeSingle(); 

      if (ativo) {
        const dataHoraString = `${ativo.data_registo}T${ativo.hora_entrada}`;
        const entryTime = new Date(dataHoraString).getTime();
        const now = new Date().getTime();
        const diffSeconds = Math.floor((now - entryTime) / 1000);

        setTimer(diffSeconds > 0 ? diffSeconds : 0);
        setIsRunning(true);
        setRegistroId(ativo.id);
      } else {
        setIsRunning(false);
        setTimer(0);
        setRegistroId(null);
      }
    } catch (err) {
      console.error("Erro assiduidade:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // --- AÇÕES DO RELÓGIO ---
  async function handleClockInOut() {
    if (loading) return;
    
    if (isRunning) {
        setDailySummary(""); 
        setShowClockOutModal(true);
        return;
    }

    setLoading(true);
    try {
        const now = new Date();
        const horaAtual = now.toTimeString().split(' ')[0]; 
        const dataAtual = now.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from("assiduidade")
            .insert([{ user_id: user.id, data_registo: dataAtual, hora_entrada: horaAtual }])
            .select()
            .single();

        if (data && !error) { 
            setIsRunning(true); 
            setRegistroId(data.id); 
            setTimer(0); 
        }
    } catch (err) {
        console.error("Erro start:", err);
    } finally {
        setLoading(false);
    }
  }

  async function confirmClockOut(e) {
      e.preventDefault();
      if (!dailySummary.trim()) {
          alert("Por favor, escreve um resumo do que fizeste hoje.");
          return;
      }

      setLoading(true);
      try {
        const now = new Date();
        const horaAtual = now.toTimeString().split(' ')[0];

        const { error } = await supabase
            .from("assiduidade")
            .update({ 
                hora_saida: horaAtual,
                observacoes: dailySummary 
            })
            .eq("id", registroId);

        if (!error) {
            setIsRunning(false);
            setRegistroId(null);
            setTimer(0);
            setShowClockOutModal(false); 
        }
      } catch (err) {
          console.error("Erro stop:", err);
      } finally {
          setLoading(false);
      }
  }

  // --- AÇÕES DO HISTÓRICO ---
  async function openHistory() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await supabase
        .from("assiduidade")
        .select("*")
        .eq("user_id", user.id)
        .eq("data_registo", hoje)
        .order("hora_entrada", { ascending: false });

    setHistoricoHoje(data || []);
    setEditItem(null);
    setShowHistoryModal(true);
  }

  // 1. PERGUNTAR SE QUER APAGAR
  function askDelete(id) {
      setItemToDelete(id);
      setShowDeleteModal(true);
  }

  // 2. CONFIRMAR E APAGAR
  async function confirmDelete() {
      if (!itemToDelete) return;
      
      const { error } = await supabase.from("assiduidade").delete().eq("id", itemToDelete);
      
      if (!error) { 
          await openHistory(); 
          checkStatus(); 
      }
      
      // Limpar e fechar modal
      setShowDeleteModal(false);
      setItemToDelete(null);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    
    if (!editItem.motivo_alteracao || !editItem.motivo_alteracao.trim()) {
        alert("É obrigatório indicar o motivo da correção.");
        return;
    }

    const [dataEntrada, horaEntrada] = editItem.tempEntrada.split('T');
    let horaSaida = null;
    if (editItem.tempSaida) {
        const parts = editItem.tempSaida.split('T');
        if(parts.length === 2) horaSaida = parts[1];
    }

    let hEntradaFinal = horaEntrada.length === 5 ? horaEntrada + ":00" : horaEntrada;
    let hSaidaFinal = horaSaida && horaSaida.length === 5 ? horaSaida + ":00" : horaSaida;

    const payload = {
        data_registo: dataEntrada, 
        hora_entrada: hEntradaFinal,
        hora_saida: hSaidaFinal,
        observacoes: editItem.observacoes, 
        motivo_alteracao: editItem.motivo_alteracao 
    };

    if (editItem.id) {
        await supabase.from("assiduidade").update(payload).eq("id", editItem.id);
    } else {
        await supabase.from("assiduidade").insert([{ ...payload, user_id: user.id }]);
    }
    
    setEditItem(null);
    await openHistory(); 
    checkStatus();
  }

  // Helpers
  const getIsoForInput = (dataStr, horaStr) => (!dataStr || !horaStr) ? "" : `${dataStr}T${horaStr}`;
  
  const startEditing = (item) => {
      setEditItem({
          ...item,
          tempEntrada: getIsoForInput(item.data_registo, item.hora_entrada),
          tempSaida: item.hora_saida ? getIsoForInput(item.data_registo, item.hora_saida) : "",
          observacoes: item.observacoes || "",
          motivo_alteracao: item.motivo_alteracao || "" 
      });
  };

  const startNewManual = () => {
      const agora = new Date();
      const offset = agora.getTimezoneOffset() * 60000;
      setEditItem({ 
          id: null, 
          tempEntrada: (new Date(agora - offset)).toISOString().slice(0, 16), 
          tempSaida: "", 
          observacoes: "",
          motivo_alteracao: ""
      });
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // --- ESTILOS VISUAIS ---
  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99999, backdropFilter: 'blur(4px)'
  };

  // Modal Normal
  const modalContainerStyle = {
    background: '#fff', borderRadius: '16px',
    width: '95%', maxWidth: '480px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    maxHeight: '90vh', 
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden' 
  };

  // Modal Pequeno (Confirmação)
  const confirmModalStyle = {
    background: '#fff', borderRadius: '16px',
    width: '90%', maxWidth: '350px', // Mais pequeno
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    padding: '24px', textAlign: 'center',
    overflow: 'hidden'
  };

  const modalBodyStyle = {
    padding: '24px',
    overflowY: 'auto', 
    overflowX: 'hidden' 
  };

  const rowStyle = {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px', marginBottom: '12px',
      background: '#fff', borderRadius: '12px',
      border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  const labelStyle = { display:'block', textAlign:'left', marginBottom:'8px', fontSize:'0.85rem', fontWeight:'600', color:'#475569' };
  const inputStyle = { width:'100%', padding:'12px 16px', border:'1px solid #e2e8f0', borderRadius:'10px', background:'#f8fafc', fontSize:'0.95rem', outline: 'none', boxSizing: 'border-box' };

  return (
    <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', minHeight: '340px' }}>
      
      <button 
        onClick={openHistory}
        style={{position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.7, zIndex: 10}}
        title="Histórico / Corrigir"
      >
        ⚙️
      </button>

      <h3 style={{ marginBottom: '15px', color: '#64748b', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registo de Ponto</h3>
      
      <div style={{ fontSize: '3.5rem', fontWeight: '800', fontFamily: 'monospace', color: isRunning ? '#2563eb' : '#cbd5e1', margin: '15px 0' }}>
        {formatTime(timer)}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button 
          onClick={handleClockInOut}
          disabled={loading}
          style={{ 
            width: '100%', padding: '16px', fontSize: '1rem', 
            borderRadius: '12px', border: 'none', cursor: 'pointer',
            backgroundColor: isRunning ? '#fee2e2' : '#2563eb',
            color: isRunning ? '#dc2626' : '#ffffff',
            fontWeight: 'bold', letterSpacing: '0.5px',
            boxShadow: isRunning ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          {loading ? "A processar..." : (isRunning ? "🛑 PAUSA / SAÍDA" : "▶ INICIAR DIA")}
        </button>
      </div>

      {isRunning && (
        <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '500' }}>
          <span className="pulse-dot"></span> A contar tempo...
        </div>
      )}

      {/* --- MODAL 1: RESUMO DO DIA --- */}
      {showClockOutModal && (
          <ModalPortal>
              <div style={modalOverlayStyle}>
                  <div style={modalContainerStyle}>
                      <div style={modalBodyStyle}>
                          <div style={{textAlign: 'center', marginBottom: '20px'}}>
                              <div style={{fontSize: '3rem', marginBottom: '10px'}}>👋</div>
                              <h3 style={{color: '#1e293b', margin: 0}}>Já vai sair?</h3>
                              <p style={{color: '#64748b', marginTop: '5px'}}>Deixe um breve resumo do que fez hoje.</p>
                          </div>
                          
                          <form onSubmit={confirmClockOut}>
                              <textarea 
                                  required
                                  rows="4" 
                                  value={dailySummary} 
                                  onChange={e => setDailySummary(e.target.value)}
                                  placeholder="Ex: Reunião com cliente X, finalização do relatório Y..."
                                  style={{...inputStyle, resize:'vertical', fontFamily:'inherit', borderColor: '#2563eb'}}
                                  autoFocus
                              />
                              <div style={{display:'flex', gap:'12px', marginTop: '20px'}}>
                                  <button type="button" onClick={() => setShowClockOutModal(false)} style={{flex:1, padding:'14px', border:'1px solid #e2e8f0', background:'white', borderRadius:'10px', cursor:'pointer', color:'#64748b', fontWeight:'600'}}>Voltar</button>
                                  <button type="submit" style={{flex:1, padding:'14px', border:'none', background:'#dc2626', color:'white', borderRadius:'10px', cursor:'pointer', fontWeight:'600', boxShadow:'0 4px 6px -1px rgba(220, 38, 38, 0.4)'}}>
                                      {loading ? 'A guardar...' : 'Terminar Dia'}
                                  </button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL 2: HISTÓRICO E EDIÇÃO --- */}
      {showHistoryModal && (
        <ModalPortal>
            <div style={modalOverlayStyle} onClick={(e) => { if(e.target === e.currentTarget) setShowHistoryModal(false); }}>
                <div style={modalContainerStyle}> 
                    
                    {/* Header */}
                    <div style={{padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background: '#fff', zIndex: 10}}>
                        <h3 style={{margin:0, color: '#1e293b', fontSize: '1.2rem'}}>
                            {editItem ? (editItem.id ? '✏️ Corrigir Registo' : '✨ Novo Registo') : '📅 Histórico de Hoje'}
                        </h3>
                        <button onClick={() => setShowHistoryModal(false)} style={{background:'#f1f5f9', border:'none', width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b'}}>✖</button>
                    </div>
                    
                    {/* Body */}
                    <div style={modalBodyStyle}>
                        {!editItem ? (
                            /* --- MODO LISTA --- */
                            <div>
                                {historicoHoje.length === 0 ? (
                                    <div style={{textAlign:'center', padding:'30px 0', color:'#94a3b8'}}>
                                        Sem registos para hoje.
                                    </div>
                                ) : (
                                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                        {historicoHoje.map(h => (
                                            <div key={h.id} style={rowStyle}>
                                                <div style={{textAlign: 'left', flex: 1}}>
                                                    <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
                                                        <span style={{background:'#dcfce7', color:'#166534', padding:'2px 6px', borderRadius:'4px', fontSize:'0.7rem', fontWeight:'bold'}}>ENTRADA</span>
                                                        <span style={{color: '#334151', fontWeight: '600'}}>{h.hora_entrada?.slice(0,5)}</span>
                                                    </div>
                                                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                                        <span style={{background: h.hora_saida ? '#fee2e2' : '#f1f5f9', color: h.hora_saida ? '#991b1b' : '#64748b', padding:'2px 6px', borderRadius:'4px', fontSize:'0.7rem', fontWeight:'bold'}}>
                                                            {h.hora_saida ? 'SAÍDA' : 'EM CURSO'}
                                                        </span>
                                                        <span style={{color: '#334151', fontWeight: '600'}}>{h.hora_saida ? h.hora_saida?.slice(0,5) : '--:--'}</span>
                                                    </div>
                                                    
                                                    {h.observacoes && (
                                                        <div style={{fontSize:'0.75rem', color:'#64748b', marginTop:'8px', fontStyle:'italic'}}>
                                                            Resumo: {h.observacoes}
                                                        </div>
                                                    )}
                                                    {h.motivo_alteracao && (
                                                        <div style={{fontSize:'0.75rem', color:'#ea580c', marginTop:'4px', fontWeight:'500'}}>
                                                            ⚠️ Correção: {h.motivo_alteracao}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{display:'flex', gap:'8px'}}>
                                                    <button onClick={() => startEditing(h)} style={{background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'8px', cursor:'pointer', color:'#2563eb'}} title="Editar">✏️</button>
                                                    <button onClick={() => askDelete(h.id)} style={{background:'#fee2e2', border:'none', borderRadius:'8px', padding:'8px', cursor:'pointer', color:'#ef4444'}} title="Apagar">🗑️</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button onClick={startNewManual} style={{marginTop: '20px', width: '100%', padding: '14px', background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '12px', cursor: 'pointer', color: '#64748b', fontWeight:'600'}}>
                                    + Adicionar Manualmente
                                </button>
                            </div>
                        ) : (
                            /* --- MODO FORMULÁRIO --- */
                            <form onSubmit={handleSaveEdit}>
                                <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                                    <div style={{flex:1}}>
                                        <label style={labelStyle}>Entrada *</label>
                                        <input type="datetime-local" value={editItem.tempEntrada} onChange={e => setEditItem({...editItem, tempEntrada: e.target.value})} required style={inputStyle} />
                                    </div>
                                    <div style={{flex:1}}>
                                        <label style={labelStyle}>Saída</label>
                                        <input type="datetime-local" value={editItem.tempSaida} onChange={e => setEditItem({...editItem, tempSaida: e.target.value})} style={inputStyle} />
                                    </div>
                                </div>
                                
                                <div style={{marginBottom: '15px'}}>
                                    <label style={labelStyle}>Resumo do Dia (Opcional na edição)</label>
                                    <textarea rows="2" value={editItem.observacoes || ""} onChange={e => setEditItem({...editItem, observacoes: e.target.value})} placeholder="O que foi feito..." style={{...inputStyle, resize:'vertical', fontFamily: 'inherit'}} />
                                </div>

                                <div style={{marginBottom: '24px'}}>
                                    <label style={{...labelStyle, color: '#ea580c'}}>Motivo da Correção *</label>
                                    <textarea 
                                        required
                                        rows="2" 
                                        value={editItem.motivo_alteracao || ""} 
                                        onChange={e => setEditItem({...editItem, motivo_alteracao: e.target.value})} 
                                        placeholder="Ex: Esqueci-me de picar de manhã..." 
                                        style={{...inputStyle, resize:'vertical', fontFamily: 'inherit', borderColor: '#fdba74', background: '#fff7ed'}} 
                                    />
                                    <small style={{color:'#ea580c', fontSize:'0.75rem'}}>Obrigatório justificar alterações manuais.</small>
                                </div>

                                <div style={{display:'flex', gap:'12px'}}>
                                    <button type="button" onClick={() => setEditItem(null)} style={{flex:1, padding:'14px', border:'1px solid #e2e8f0', background:'white', borderRadius:'10px', cursor:'pointer', color:'#64748b', fontWeight:'600'}}>Cancelar</button>
                                    <button type="submit" style={{flex:1, padding:'14px', border:'none', background:'#2563eb', color:'white', borderRadius:'10px', cursor:'pointer', fontWeight:'600', boxShadow:'0 4px 6px -1px rgba(37, 99, 235, 0.4)'}}>Gravar</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
      )}

      {/* --- MODAL 3: CONFIRMAÇÃO DE ELIMINAÇÃO (O novo!) --- */}
      {showDeleteModal && (
          <ModalPortal>
              <div style={modalOverlayStyle}>
                  <div style={confirmModalStyle}>
                      <div style={{fontSize: '3rem', marginBottom: '15px'}}>🗑️</div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b'}}>Apagar Registo?</h3>
                      <p style={{color: '#64748b', margin: '0 0 25px 0', fontSize: '0.95rem'}}>
                          Tem a certeza? Esta ação não pode ser desfeita.
                      </p>
                      
                      <div style={{display:'flex', gap:'12px'}}>
                          <button 
                              onClick={() => setShowDeleteModal(false)}
                              style={{flex:1, padding:'12px', background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', color:'#64748b', fontWeight:'600'}}
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={confirmDelete}
                              style={{flex:1, padding:'12px', background:'#ef4444', border:'none', borderRadius:'8px', cursor:'pointer', color:'white', fontWeight:'600'}}
                          >
                              Apagar
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}
      
      <style>{`
        .pulse-dot { width: 8px; height: 8px; background-color: #16a34a; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(22, 163, 74, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); } }
      `}</style>
    </div>
  );
});

export default WidgetAssiduidade;