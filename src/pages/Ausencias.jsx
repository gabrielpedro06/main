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

  // NOVO: Modal de confirmação para o utilizador cancelar férias
  const [confirmCancel, setConfirmCancel] = useState({ show: false, pedido: null });

  const [form, setForm] = useState({ tipo: "Férias", data_inicio: "", data_fim: "", motivo: "" });
  const [file, setFile] = useState(null); 

  useEffect(() => {
    if (user) {
        fetchPedidos();
        fetchDiasReais(); 
    }
  }, [user]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let anexo_url = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from("rh_anexos").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("rh_anexos").getPublicUrl(fileName);
        anexo_url = publicUrl;
      }
      const payload = { ...form, user_id: user.id, estado: "pendente", anexo_url: anexo_url };
      const { error: dbError } = await supabase.from("ferias").insert([payload]);
      if (dbError) throw dbError;

      setShowModal(false);
      setForm({ tipo: "Férias", data_inicio: "", data_fim: "", motivo: "" });
      setFile(null);
      fetchPedidos();
      fetchDiasReais(); 
      setNotification({ show: true, message: "Pedido enviado com sucesso para os Recursos Humanos! 🎉", type: "success" });
    } catch (error) {
      setNotification({ show: true, message: "Erro ao enviar pedido: " + error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- NOVA FUNÇÃO: CANCELAR OU PEDIR CANCELAMENTO ---
  async function executarCancelamento() {
      const { pedido } = confirmCancel;
      try {
          // Se estava pendente, cancela logo. Se já estava aprovado, pede cancelamento aos RH.
          const novoEstado = pedido.estado === 'pendente' ? 'cancelado' : 'pedido_cancelamento';
          
          const { error } = await supabase.from("ferias").update({ estado: novoEstado }).eq("id", pedido.id);
          if (error) throw error;

          fetchPedidos();
          setConfirmCancel({ show: false, pedido: null });
          setNotification({ show: true, message: novoEstado === 'cancelado' ? "Pedido cancelado com sucesso!" : "Pedido de cancelamento enviado aos RH. Aguarda devolução dos dias.", type: "success" });
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
      case 'Baixa Médica': return '🏥 Baixa Médica';
      default: return '⚠️ Falta/Outro';
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
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Novo Pedido</button>
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
                <th>Estado</th>
                <th style={{textAlign: 'center'}}>Opções</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length > 0 ? pedidos.map(p => (
                <tr key={p.id}>
                  <td style={{fontWeight: 'bold', color: '#334155'}}>{getTipoEstilo(p.tipo)}</td>
                  <td>{formatDate(p.data_inicio)} a {formatDate(p.data_fim)}</td>
                  <td style={{maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.motivo || '-'}</td>
                  <td>{getStatusBadge(p.estado)}</td>
                  <td style={{textAlign: 'center'}}>
                      {/* LÓGICA DOS BOTÕES DE CANCELAR */}
                      {p.estado === 'pendente' && (
                          <button onClick={() => setConfirmCancel({ show: true, pedido: p })} className="btn-small" style={{borderColor: '#ef4444', color: '#ef4444'}} title="Cancelar Pedido">
                              🗑️ Cancelar
                          </button>
                      )}
                      {p.estado === 'aprovado' && (
                          <button onClick={() => setConfirmCancel({ show: true, pedido: p })} className="btn-small" style={{borderColor: '#f59e0b', color: '#f59e0b'}} title="Pedir Cancelamento aos RH">
                              🔄 Cancelar Férias
                          </button>
                      )}
                      {['rejeitado', 'cancelado', 'pedido_cancelamento'].includes(p.estado) && (
                          <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>-</span>
                      )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>Ainda não fizeste nenhum pedido.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
           {/* ... (O teu formulário normal de pedir férias mantém-se igual) ... */}
          <div className="modal-content">
            <div className="modal-header">
               <h3>Novo Pedido de Ausência</h3>
               <button onClick={() => setShowModal(false)} className="close-btn">✖</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <label>Tipo de Pedido</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{marginBottom: '15px'}}>
                    <option value="Férias">Férias</option>
                    <option value="Falta Justificada">Falta Justificada</option>
                    <option value="Falta Injustificada">Falta Injustificada</option>
                    <option value="Baixa Médica">Baixa Médica</option>
                    <option value="Outro">Outro (Licenças, etc)</option>
                </select>
                <div className="form-row" style={{display: 'flex', gap: '15px', marginBottom: '15px'}}>
                    <div style={{flex: 1}}><label>Data Início</label><input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} required /></div>
                    <div style={{flex: 1}}><label>Data Fim</label><input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} required /></div>
                </div>
                <label>Motivo / Observações</label>
                <textarea rows="3" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Descreve o motivo da ausência..." style={{marginBottom: '15px'}} />
                <label>Anexar Documento (Opcional - Atestados, PDFs)</label>
                <input type="file" accept=".pdf, image/*" onChange={e => setFile(e.target.files[0])} style={{marginBottom: '20px', padding: '8px', background: '#f1f5f9'}} />
                <button type="submit" className="btn-primary" style={{width: '100%'}} disabled={isSubmitting}>{isSubmitting ? "A enviar..." : "Submeter Pedido"}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {confirmCancel.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{fontSize: '3rem', marginBottom: '10px'}}>⚠️</div>
                      <h3 style={{marginTop: 0, color: '#1e293b'}}>Cancelar Pedido</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5'}}>
                          {confirmCancel.pedido?.estado === 'pendente' 
                              ? "Tem a certeza que deseja apagar este pedido pendente?" 
                              : "Como este pedido já foi aprovado, será enviado um pedido de cancelamento aos RH para que os seus dias sejam devolvidos. Confirma?"}
                      </p>
                      <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                          <button onClick={() => setConfirmCancel({ show: false, pedido: null })} style={{padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', flex: 1, fontWeight: 'bold', color: '#475569'}}>Voltar</button>
                          <button onClick={executarCancelamento} style={{padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', flex: 1, color: 'white', fontWeight: 'bold', background: '#ef4444'}}>Sim, Cancelar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* POPUP DE SUCESSO/ERRO */}
      {notification.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'350px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{fontSize: '3.5rem', marginBottom: '15px'}}>{notification.type === 'success' ? '✅' : '❌'}</div>
                      <h3 style={{marginTop: 0, color: '#1e293b'}}>{notification.type === 'success' ? 'Sucesso!' : 'Erro'}</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5'}}>{notification.message}</p>
                      <button onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="btn-primary" style={{width: '100%'}}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}
    </div>
  );
}