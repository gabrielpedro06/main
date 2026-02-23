import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Ferias() {
  const { user } = useAuth(); 
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diasFerias, setDiasFerias] = useState(null); 
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [confirmCancel, setConfirmCancel] = useState({ show: false, pedido: null });

  // ESTADOS PARA EDIÇÃO DE PEDIDO
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // NOVO: ESTADOS PARA ANEXAR DOCUMENTO A POSTERIORI
  const [uploadModal, setUploadModal] = useState({ show: false, pedido: null });
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const [form, setForm] = useState({ 
      tipo: "Férias", 
      data_inicio: "", 
      data_fim: "", 
      is_parcial: false, 
      hora_inicio: "", 
      hora_fim: "", 
      motivo: "" 
  });
  const [file, setFile] = useState(null); 
  const [diasUteis, setDiasUteis] = useState(0); 

  // --- ALGORITMO DE FERIADOS ---
  const getFeriados = (ano) => {
      const a = ano % 19; const b = Math.floor(ano / 100); const c = ano % 100;
      const d = Math.floor(b / 4); const e = b % 4;
      const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4); const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31) - 1;
      const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;
      
      const pascoa = new Date(ano, mesPascoa, diaPascoa);
      const sextaSanta = new Date(pascoa); sextaSanta.setDate(pascoa.getDate() - 2);
      const carnaval = new Date(pascoa); carnaval.setDate(pascoa.getDate() - 47);
      const corpoDeus = new Date(pascoa); corpoDeus.setDate(pascoa.getDate() + 60);

      return [
          { d: 1, m: 0, nome: "Ano Novo" },
          { d: carnaval.getDate(), m: carnaval.getMonth(), nome: "Carnaval" },
          { d: sextaSanta.getDate(), m: sextaSanta.getMonth(), nome: "Sexta-feira Santa" },
          { d: pascoa.getDate(), m: pascoa.getMonth(), nome: "Páscoa" },
          { d: 25, m: 3, nome: "Dia da Liberdade" },
          { d: 1, m: 4, nome: "Dia do Trabalhador" },
          { d: corpoDeus.getDate(), m: corpoDeus.getMonth(), nome: "Corpo de Deus" },
          { d: 10, m: 5, nome: "Dia de Portugal" },
          { d: 15, m: 7, nome: "Assunção de N. Senhora" },
          { d: 7, m: 8, nome: "Feriado de Faro" }, 
          { d: 5, m: 9, nome: "Implantação da República" },
          { d: 1, m: 10, nome: "Todos os Santos" },
          { d: 1, m: 11, nome: "Restauração da Independência" },
          { d: 8, m: 11, nome: "Imaculada Conceição" },
          { d: 25, m: 11, nome: "Natal" }
      ];
  };

  useEffect(() => {
    if (user) {
        fetchPedidos();
        fetchDiasReais(); 
    }
  }, [user]);

  useEffect(() => {
      if (!form.is_parcial && form.data_inicio && form.data_fim) {
          const inicio = new Date(form.data_inicio);
          const fim = new Date(form.data_fim);
          
          if (inicio <= fim) {
              let count = 0;
              for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
                  const dayOfWeek = d.getDay();
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
                      const feriados = getFeriados(d.getFullYear());
                      const isFeriado = feriados.some(f => f.d === d.getDate() && f.m === d.getMonth());
                      if (!isFeriado) { count++; }
                  }
              }
              setDiasUteis(count);
          } else { setDiasUteis(0); }
      } else { setDiasUteis(0); }
  }, [form.data_inicio, form.data_fim, form.is_parcial]);

  async function fetchDiasReais() {
      const { data } = await supabase.from('profiles').select('dias_ferias').eq('id', user.id).single();
      if (data) setDiasFerias(data.dias_ferias);
  }

  async function fetchPedidos() {
    setLoading(true);
    const { data, error } = await supabase.from("ferias").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error) setPedidos(data || []);
    setLoading(false);
  }

  const handleEditClick = (pedido) => {
      setIsEditing(true);
      setEditingId(pedido.id);
      setForm({
          tipo: pedido.tipo,
          data_inicio: pedido.data_inicio,
          data_fim: pedido.data_fim,
          is_parcial: pedido.is_parcial || false,
          hora_inicio: pedido.hora_inicio || "",
          hora_fim: pedido.hora_fim || "",
          motivo: pedido.motivo || ""
      });
      setShowModal(true);
  };

  const handleCloseModal = () => {
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      setFile(null);
      setForm({ tipo: "Férias", data_inicio: "", data_fim: "", is_parcial: false, hora_inicio: "", hora_fim: "", motivo: "" });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.is_parcial && diasUteis === 0) {
        setNotification({ show: true, message: "O período selecionado contém apenas fins de semana ou feriados.", type: "error" });
        return;
    }
    if (!form.is_parcial && new Date(form.data_inicio) > new Date(form.data_fim)) {
        setNotification({ show: true, message: "A data de fim não pode ser anterior à data de início.", type: "error" });
        return;
    }

    setIsSubmitting(true);
    try {
      let anexo_url = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("rh_anexos").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("rh_anexos").getPublicUrl(fileName);
        anexo_url = publicUrl;
      } else if (isEditing) {
          const oldData = pedidos.find(p => p.id === editingId);
          anexo_url = oldData?.anexo_url || null;
      }
      
      const payload = { 
          user_id: user.id, 
          tipo: form.tipo,
          data_inicio: form.data_inicio,
          data_fim: form.is_parcial ? form.data_inicio : form.data_fim, 
          is_parcial: form.is_parcial,
          hora_inicio: form.is_parcial ? form.hora_inicio : null,
          hora_fim: form.is_parcial ? form.hora_fim || null : null,
          motivo: form.motivo
      };

      if (anexo_url) payload.anexo_url = anexo_url;

      let dbError;
      if (isEditing) {
          payload.estado = 'pendente';
          const { error } = await supabase.from("ferias").update(payload).eq("id", editingId);
          dbError = error;
      } else {
          payload.estado = 'pendente';
          const { error } = await supabase.from("ferias").insert([payload]);
          dbError = error;
      }

      if (dbError) throw dbError;

      handleCloseModal();
      fetchPedidos();
      fetchDiasReais(); 
      setNotification({ show: true, message: isEditing ? "Pedido atualizado com sucesso!" : "Pedido enviado com sucesso para os Recursos Humanos! 🎉", type: "success" });
    } catch (error) {
      setNotification({ show: true, message: "Erro ao guardar pedido: " + error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- NOVA FUNÇÃO: ANEXAR DOCUMENTO A POSTERIORI ---
  async function handleUploadOnly(e) {
      e.preventDefault();
      if (!uploadFile) return;
      
      setIsUploadingDoc(true);
      try {
          const fileExt = uploadFile.name.split('.').pop();
          const fileName = `${user.id}_doc_extra_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from("rh_anexos").upload(fileName, uploadFile);
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage.from("rh_anexos").getPublicUrl(fileName);

          // Atualiza apenas a coluna do anexo, sem mexer no estado do pedido!
          const { error: dbError } = await supabase.from("ferias").update({ anexo_url: publicUrl }).eq("id", uploadModal.pedido.id);
          if (dbError) throw dbError;

          fetchPedidos();
          setUploadModal({ show: false, pedido: null });
          setUploadFile(null);
          setNotification({ show: true, message: "Documento anexado com sucesso!", type: "success" });
      } catch (error) {
          setNotification({ show: true, message: "Erro ao enviar documento: " + error.message, type: "error" });
      } finally {
          setIsUploadingDoc(false);
      }
  }

  async function executarCancelamento() {
      const { pedido } = confirmCancel;
      try {
          const novoEstado = pedido.estado === 'pendente' ? 'cancelado' : 'pedido_cancelamento';
          const { error } = await supabase.from("ferias").update({ estado: novoEstado }).eq("id", pedido.id);
          if (error) throw error;
          fetchPedidos();
          setConfirmCancel({ show: false, pedido: null });
          setNotification({ show: true, message: novoEstado === 'cancelado' ? "Pedido cancelado com sucesso!" : "Pedido de cancelamento enviado aos RH.", type: "success" });
      } catch (error) {
          setNotification({ show: true, message: "Erro ao cancelar: " + error.message, type: "error" });
      }
  }

  const getStatusBadge = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'aprovado': return <span className="badge badge-success">Aprovado</span>;
      case 'rejeitado': return <span className="badge badge-danger">Rejeitado</span>;
      case 'cancelado': return <span className="badge" style={{background: '#e2e8f0', color: '#475569'}}>Cancelado</span>;
      case 'pedido_cancelamento': return <span className="badge" style={{background: '#fef08a', color: '#854d0e'}}>A pedir cancelamento...</span>;
      default: return <span className="badge badge-warning">Pendente</span>;
    }
  };

  const getTipoEstilo = (tipo) => {
    switch (tipo) {
      case 'Férias': return '🏖️ Férias';
      case 'Assistência à família': return '👨‍👩‍👧 Assistência à família';
      case 'Outros - Assuntos pessoais': return '👤 Assuntos pessoais';
      case 'Ausência sem motivo - injustificada': return '🚨 Falta Injustificada';
      case 'Doença, acidente e obrigação legal': return '🏥 Doença/Acidente';
      case 'Casamento': return '💍 Casamento';
      case 'Deslocação a estabelecimento de ensino': return '🏫 Estabelecimento de ensino';
      case 'Licença maternal/paternal': return '👶 Licença parental';
      case 'Licença sem vencimento': return '🛑 Sem vencimento';
      case 'Falecimento de familiar': return '🖤 Falecimento';
      case 'Prestação de provas de avaliação': return '📝 Provas de avaliação';
      case 'Candidato a cargo público': return '⚖️ Cargo público';
      default: return `⚠️ ${tipo}`;
    }
  };

  const formatDate = (dateString) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pt-PT');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🏖️ As Minhas Férias & Ausências</h1>
        <button className="btn-primary" onClick={() => { setIsEditing(false); setEditingId(null); setShowModal(true); }}>+ Novo Pedido</button>
      </div>

      <div className="dashboard-cards" style={{marginBottom: '30px'}}>
        <div className="card">
            <h3>Dias de Férias Disponíveis</h3>
            <p style={{color: '#2563eb', fontWeight: 'bold'}}>{diasFerias ?? '--'}</p>
        </div>
        <div className="card">
            <h3>Pedidos Pendentes</h3>
            <p style={{color: '#f59e0b', fontWeight: 'bold'}}>{pedidos.filter(p => p.estado?.toLowerCase() === 'pendente').length}</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{marginBottom: '20px', color: '#1e293b'}}>O Meu Histórico</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Período</th>
                <th>Motivo</th>
                <th style={{textAlign: 'center'}}>Documento</th>
                <th>Estado</th>
                <th style={{textAlign: 'center'}}>Opções</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length > 0 ? pedidos.map(p => (
                <tr key={p.id}>
                  <td style={{fontWeight: 'bold', color: '#334155'}}>{getTipoEstilo(p.tipo)}</td>
                  
                  <td>
                    {p.is_parcial ? (
                        <>
                            <div style={{fontWeight: '500'}}>{formatDate(p.data_inicio)}</div>
                            <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '3px', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', display: 'inline-block'}}>
                                ⏰ {p.hora_inicio.slice(0,5)} {p.hora_fim ? `às ${p.hora_fim.slice(0,5)}` : '(Saída)'}
                            </div>
                        </>
                    ) : (
                        `${formatDate(p.data_inicio)} a ${formatDate(p.data_fim)}`
                    )}
                  </td>

                  <td style={{maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.motivo || '-'}</td>
                  
                  {/* NOVA COLUNA: GESTÃO DO DOCUMENTO ANEXO */}
                  <td style={{textAlign: 'center'}}>
                      {p.anexo_url ? (
                          <div style={{display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center'}}>
                              <a href={p.anexo_url} target="_blank" rel="noreferrer" className="btn-small" style={{color: '#2563eb', borderColor: '#2563eb', textDecoration: 'none'}} title="Ver Documento">👁️ Ver</a>
                              <button onClick={() => setUploadModal({ show: true, pedido: p })} className="btn-small" title="Substituir Documento">🔄</button>
                          </div>
                      ) : (
                          <button onClick={() => setUploadModal({ show: true, pedido: p })} className="btn-small" style={{borderColor: '#cbd5e1', color: '#64748b'}}>➕ Anexar</button>
                      )}
                  </td>

                  <td>{getStatusBadge(p.estado)}</td>
                  
                  <td style={{textAlign: 'center'}}>
                      <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                          {p.estado === 'pendente' && (
                              <>
                                  <button onClick={() => handleEditClick(p)} className="btn-small" style={{color: '#3b82f6', borderColor: '#3b82f6'}} title="Editar Pedido">✏️</button>
                                  <button onClick={() => setConfirmCancel({ show: true, pedido: p })} className="btn-small" style={{color: '#ef4444', borderColor: '#ef4444'}} title="Cancelar Pedido">🗑️</button>
                              </>
                          )}
                          {p.estado === 'aprovado' && (
                              <button onClick={() => setConfirmCancel({ show: true, pedido: p })} className="btn-small" style={{borderColor: '#f59e0b', color: '#f59e0b'}} title="Pedir Cancelamento aos RH">
                                  🔄 Cancelar Pedido
                              </button>
                          )}
                          {['rejeitado', 'cancelado', 'pedido_cancelamento'].includes(p.estado) && (
                              <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>-</span>
                          )}
                      </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>Ainda não fizeste nenhum pedido.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NOVO / EDITAR PEDIDO */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
               <h3>{isEditing ? 'Editar Pedido de Ausência' : 'Novo Pedido de Ausência'}</h3>
               <button onClick={handleCloseModal} className="close-btn">✖</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <label>Motivo da Ausência</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{marginBottom: '15px'}} required>
                    <option value="Férias">Férias</option>
                    <option value="Assistência à família">Assistência à família</option>
                    <option value="Outros - Assuntos pessoais">Outros - Assuntos pessoais</option>
                    <option value="Ausência sem motivo - injustificada">Ausência sem motivo - injustificada</option>
                    <option value="Doença, acidente e obrigação legal">Doença, acidente e obrigação legal</option>
                    <option value="Casamento">Casamento</option>
                    <option value="Deslocação a estabelecimento de ensino">Deslocação a estabelecimento de ensino</option>
                    <option value="Licença maternal/paternal">Licença maternal/paternal</option>
                    <option value="Licença sem vencimento">Licença sem vencimento</option>
                    <option value="Falecimento de familiar">Falecimento de familiar</option>
                    <option value="Prestação de provas de avaliação">Prestação de provas de avaliação</option>
                    <option value="Candidato a cargo público">Candidato a cargo público</option>
                </select>
                
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '15px', color: '#475569', fontWeight: 'bold', fontSize: '0.9rem', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                    <input type="checkbox" checked={form.is_parcial} onChange={e => setForm({...form, is_parcial: e.target.checked, data_fim: e.target.checked ? form.data_inicio : form.data_fim})} style={{width: '18px', height: '18px'}} />
                    ⏳ Ausência Parcial (Apenas algumas horas no próprio dia)
                </label>

                {!form.is_parcial ? (
                    <div className="form-row" style={{display: 'flex', gap: '15px', marginBottom: '15px'}}>
                        <div style={{flex: 1}}><label>Data Início</label><input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} required /></div>
                        <div style={{flex: 1}}><label>Data Fim</label><input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} required /></div>
                    </div>
                ) : (
                    <div className="form-row" style={{display: 'flex', gap: '15px', marginBottom: '15px'}}>
                        <div style={{flex: 1.5}}><label>Data da Ocorrência</label><input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value, data_fim: e.target.value})} required /></div>
                        <div style={{flex: 1}}><label>Hora de Saída</label><input type="time" value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} required /></div>
                        <div style={{flex: 1}}><label>Hora Regresso</label><input type="time" value={form.hora_fim} onChange={e => setForm({...form, hora_fim: e.target.value})} /></div>
                    </div>
                )}

                {form.data_inicio && form.data_fim && !form.is_parcial && (
                    <div style={{background: diasUteis > 0 ? '#eff6ff' : '#fee2e2', color: diasUteis > 0 ? '#1e40af' : '#991b1b', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span>{diasUteis > 0 ? 'ℹ️' : '⚠️'}</span>
                        <span>{diasUteis > 0 ? (form.tipo === 'Férias' ? `Este pedido consumirá ${diasUteis} dia(s) útil(eis) do seu saldo de férias.` : `Este pedido corresponde a ${diasUteis} dia(s) útil(eis). Tratando-se de justificação legal, não desconta férias.`) : `Atenção: O período selecionado calha num fim de semana ou feriado. Não é necessário marcar.`}</span>
                    </div>
                )}
                {form.data_inicio && form.is_parcial && (
                    <div style={{background: '#eff6ff', color: '#1e40af', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span>ℹ️</span><span>Ausência parcial de algumas horas. <b>Este registo não consome saldo de férias.</b></span>
                    </div>
                )}

                <label>Notas / Observações</label>
                <textarea rows="3" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Mais detalhes (Opcional)..." style={{marginBottom: '15px'}} />
                
                <label>Anexar Documento Inicial (Opcional)</label>
                <input type="file" accept=".pdf, image/*" onChange={e => setFile(e.target.files[0])} style={{marginBottom: '20px', padding: '8px', background: '#f1f5f9'}} />
                
                <button type="submit" className="btn-primary" style={{width: '100%'}} disabled={isSubmitting || (!form.is_parcial && diasUteis === 0)}>
                    {isSubmitting ? "A Guardar..." : (isEditing ? "Guardar Alterações" : "Submeter Pedido")}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* NOVO MODAL: ANEXAR DOCUMENTO LATER */}
      {uploadModal.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                          <h3 style={{margin: 0, color: '#1e293b'}}>📎 Anexar Documento</h3>
                          <button onClick={() => {setUploadModal({show: false, pedido: null}); setUploadFile(null);}} style={{background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8'}}>✖</button>
                      </div>
                      <p style={{color: '#64748b', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.5'}}>
                          Adiciona ou substitui o justificativo (atestado, declaração, etc) para a ausência de <b>{formatDate(uploadModal.pedido?.data_inicio)}</b>.
                      </p>
                      <form onSubmit={handleUploadOnly}>
                          <input type="file" accept=".pdf, image/*" required onChange={e => setUploadFile(e.target.files[0])} style={{width:'100%', marginBottom:'20px', padding:'10px', background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:'8px'}} />
                          <button type="submit" className="btn-primary" style={{width:'100%'}} disabled={isUploadingDoc}>
                              {isUploadingDoc ? "A enviar..." : "Guardar Documento"}
                          </button>
                      </form>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* POP-UPS DE CONFIRMAÇÃO E ERRO */}
      {confirmCancel.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{fontSize: '3rem', marginBottom: '10px'}}>⚠️</div>
                      <h3 style={{marginTop: 0, color: '#1e293b'}}>Cancelar Pedido</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5'}}>
                          {confirmCancel.pedido?.estado === 'pendente' ? "Tem a certeza que deseja apagar este pedido pendente?" : "Como este pedido já foi aprovado, será enviado um pedido de cancelamento aos RH para que os seus dias sejam devolvidos. Confirma?"}
                      </p>
                      <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                          <button onClick={() => setConfirmCancel({ show: false, pedido: null })} style={{padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', flex: 1, fontWeight: 'bold', color: '#475569'}}>Voltar</button>
                          <button onClick={executarCancelamento} style={{padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', flex: 1, color: 'white', fontWeight: 'bold', background: '#ef4444'}}>Sim, Cancelar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {notification.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'350px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{fontSize: '3.5rem', marginBottom: '15px'}}>{notification.type === 'success' ? '✅' : '❌'}</div>
                      <h3 style={{marginTop: 0, color: '#1e293b'}}>{notification.type === 'success' ? 'Sucesso!' : 'Atenção'}</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5'}}>{notification.message}</p>
                      <button onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="btn-primary" style={{width: '100%'}}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}
    </div>
  );
}