import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom"; 
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Clientes() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [podeVerAcessos, setPodeVerAcessos] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false); 
  const [notification, setNotification] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null); 
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

  const [showAddContacto, setShowAddContacto] = useState(false);
  const [showAddMorada, setShowAddMorada] = useState(false);
  const [showAddCae, setShowAddCae] = useState(false);
  const [showAddAcesso, setShowAddAcesso] = useState(false);

  // FORMULÁRIO GERAL 
  const initialForm = {
    marca: "", nif: "", entidade: "", website: "",
    objeto_social: "", plano: "Standard",
    certidao_permanente: "", validade_certidao: "",
    rcbe: "", validade_rcbe: "", ativo: true
  };
  const [form, setForm] = useState(initialForm);

  const [contactos, setContactos] = useState([]);
  const [moradas, setMoradas] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [caes, setCaes] = useState([]);
  
  // Histórico de Projetos do Cliente
  const [projetosCliente, setProjetosCliente] = useState([]);

  // SUB-FORMS INICIAIS
  const initContacto = { nome_contacto: "", email: "", telefone: "", cargo: "" };
  const initMorada = { morada: "", localidade: "", codigo_postal: "", concelho: "", distrito: "", regiao: "", notas: "" };
  const initAcesso = { organismo: "", utilizador: "", codigo: "", url: "" };
  const initCae = { codigo: "", descricao: "", principal: false };

  const [novoContacto, setNovoContacto] = useState(initContacto);
  const [novaMorada, setNovaMorada] = useState(initMorada);
  const [novoAcesso, setNovoAcesso] = useState(initAcesso);
  const [novoCae, setNovoCae] = useState(initCae);

  useEffect(() => {
    fetchClientes();
  }, []);

  const showToast = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3500);
  };

  async function fetchClientes() {
    setLoading(true);
    
    const { data: cliData, error: errCli } = await supabase
        .from("clientes")
        .select("*, contactos_cliente(nome_contacto, email, telefone)")
        .order("created_at", { ascending: false });

    const { data: morData } = await supabase
        .from("moradas_cliente")
        .select("cliente_id, localidade, concelho");

    if (!errCli && cliData) {
        const clientesComMorada = cliData.map(c => {
            const moradas = morData?.filter(m => m.cliente_id === c.id) || [];
            return { ...c, moradas_cliente: moradas, ativo: c.ativo !== false }; 
        });
        setClientes(clientesComMorada);
    }
    
    setLoading(false);
  }

  // --- INTEGRAÇÃO NIF.PT ---
  async function handleNifChange(e) {
    const nifDigitado = e.target.value;
    setForm({ ...form, nif: nifDigitado });

    if (nifDigitado.length === 9 && !isViewOnly) {
      try {
        showToast("A consultar dados no NIF.pt...", "info");
        
        const response = await fetch(`/nif-api/?json=1&q=${nifDigitado}&key=9beb59d324c1477245e04e0b5988bdd2`);
        if (!response.ok) throw new Error("Erro na comunicação com a API.");

        const data = await response.json();
        
        let record = null;
        if (data.records && data.records[nifDigitado]) record = data.records[nifDigitado];
        else if (data[nifDigitado]) record = data[nifDigitado];

        if (record) {
          setForm(prev => ({
            ...prev,
            entidade: record.title || prev.entidade || "",
            marca: prev.marca || record.title || "", 
            website: record.contacts?.website || prev.website || "",
            objeto_social: record.activity || prev.objeto_social || ""
          }));

          if (record.address || record.pc4) {
             setNovaMorada({
                 morada: record.address || "",
                 codigo_postal: (record.pc4 && record.pc3) ? `${record.pc4}-${record.pc3}` : "",
                 localidade: record.city || record.geo?.parish || "",
                 concelho: record.geo?.county || "",
                 distrito: record.geo?.region || "",
                 regiao: record.geo?.region || "",
                 notas: "Sede"
             });
             setShowAddMorada(true);
          }

          if (record.cae) {
             setNovoCae({
                 codigo: record.cae,
                 descricao: record.activity ? record.activity.split('.')[0] : "Atividade Principal",
                 principal: true
             });
             setShowAddCae(true);
          }

          if (record.contacts?.email || record.contacts?.phone) {
             setNovoContacto({
                 nome_contacto: "Geral",
                 cargo: "",
                 email: record.contacts?.email || "",
                 telefone: record.contacts?.phone || ""
             });
             setShowAddContacto(true);
          }

          showToast("Empresa, Contactos e Moradas pré-preenchidos!", "success");
        } else {
          showToast("NIF não encontrado na base de dados.", "warning");
        }
      } catch (err) {
        showToast("Falha na consulta automática. Preenche manualmente.", "warning");
      }
    }
  }

  // --- LÓGICA DE FILTRAGEM DOS CARTÕES ---
  let processedClientes = [...clientes];

  if (!mostrarInativos) {
      processedClientes = processedClientes.filter(c => c.ativo === true);
  }

  if (busca) {
      const textoBusca = busca.toLowerCase();
      processedClientes = processedClientes.filter(c =>
          c.marca?.toLowerCase().includes(textoBusca) || c.nif?.includes(textoBusca)
      );
  }

  processedClientes.sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));

  // --- ABRIR MODAIS ---
  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
    setForm(initialForm);
    setContactos([]); setMoradas([]); setAcessos([]); setCaes([]); setProjetosCliente([]);
    setPodeVerAcessos(true);
    fecharTodosSubForms();
    setActiveTab("geral");
    setShowModal(true);
  }

  function handleEdit(cliente) {
    setEditId(cliente.id); setIsViewOnly(false);
    loadClienteData(cliente);
  }

  function handleView(cliente) {
    setEditId(cliente.id); setIsViewOnly(true);
    loadClienteData(cliente);
  }

  function loadClienteData(cliente) {
    const safeData = { ...initialForm };
    Object.keys(initialForm).forEach(key => {
        safeData[key] = cliente[key] !== null && cliente[key] !== undefined ? cliente[key] : initialForm[key];
    });
    setForm(safeData);

    fecharTodosSubForms();
    setActiveTab("geral");
    setShowModal(true);
    fetchSubDados(cliente.id);
    verificarPermissaoAcessos(cliente.id); 
  }

  function fecharTodosSubForms() {
      setShowAddContacto(false); setShowAddMorada(false); setShowAddCae(false); setShowAddAcesso(false);
      setNovoContacto(initContacto); setNovaMorada(initMorada); setNovoCae(initCae); setNovoAcesso(initAcesso);
  }

  async function verificarPermissaoAcessos(clienteId) {
    if (['admin', 'gestor'].includes(userProfile?.role)) { setPodeVerAcessos(true); return; }
    try {
        const { data } = await supabase.from('equipa_projeto').select('projetos!inner(cliente_id)').eq('user_id', user.id).eq('projetos.cliente_id', clienteId);
        setPodeVerAcessos(data && data.length > 0);
    } catch (err) { setPodeVerAcessos(false); }
  }

  async function fetchSubDados(clienteId) {
    const [cData, mData, aData, caeData, pData] = await Promise.all([
        supabase.from("contactos_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("moradas_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("acessos_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("caes_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("projetos").select("id, titulo, estado, data_fim, codigo_projeto").eq("cliente_id", clienteId).order('created_at', { ascending: false })
    ]);
    
    setContactos(cData.data || []); 
    setMoradas(mData.data || []); 
    setAcessos(aData.data || []); 
    setCaes(caeData.data || []);
    setProjetosCliente(pData.data || []);
  }

  // 💡 FUNÇÃO DE TOGGLE (Reativar / Desativar)
  async function handleToggleAtivo(id, estadoAtual) {
    const novoEstado = !estadoAtual;
    const acaoTexto = novoEstado ? "Reativar" : "Desativar";

    if (!window.confirm(`Tem a certeza que deseja ${acaoTexto.toLowerCase()} esta empresa?`)) return;

    try {
      const { error } = await supabase.from("clientes").update({ ativo: novoEstado }).eq("id", id);
      if (error) throw error;

      setClientes(clientes.map(c => c.id === id ? { ...c, ativo: novoEstado } : c));
      if (editId === id) setForm({ ...form, ativo: novoEstado });

      showToast(`Empresa ${acaoTexto.toLowerCase()}a com sucesso!`, "success");
    } catch (error) {
      showToast(`Erro ao ${acaoTexto.toLowerCase()} empresa: ` + error.message, "error");
    }
  }

  async function handleSubmitGeral(e) {
    e.preventDefault();
    if (isViewOnly) return;

    const dbPayload = {
      nif: form.nif, marca: form.marca, entidade: form.entidade, objeto_social: form.objeto_social, website: form.website, plano: form.plano, certidao_permanente: form.certidao_permanente, validade_certidao: form.validade_certidao || null, rcbe: form.rcbe, validade_rcbe: form.validade_rcbe || null, ativo: form.ativo 
    };

    try {
      if (editId) {
        const { error } = await supabase.from("clientes").update(dbPayload).eq("id", editId);
        if (error) throw error;
        setClientes(clientes.map(c => (c.id === editId ? { ...c, ...dbPayload } : c)));
        showToast("Empresa atualizada!");
      } else {
        const { data, error } = await supabase.from("clientes").insert([dbPayload]).select();
        if (error) throw error;
        setClientes([{ ...data[0], ativo: true }, ...clientes]); 
        setEditId(data[0].id);
        showToast("Empresa criada! Verifica as abas que foram pré-preenchidas.");
      }
    } catch (error) { showToast("Erro: " + error.message, "error"); }
  }

  async function saveSubItem(tabela, dados, stateSetter, listaAtual, resetState, resetValue, closeFormSetter) {
    if (isViewOnly) return;
    if (!editId) return showToast("Guarda primeiro os Dados da Empresa (Aba Geral) no fundo do ecrã.", "warning");

    const payload = { ...dados, cliente_id: editId };
    if (tabela === 'moradas_cliente') { delete payload.distrito; delete payload.regiao; }

    if (payload.id) { 
        const { id, ...updateData } = payload;
        const { data, error } = await supabase.from(tabela).update(updateData).eq("id", id).select();
        if (!error) {
            stateSetter(listaAtual.map(i => i.id === id ? data[0] : i));
            showToast("Atualizado com sucesso!");
            if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
        } else showToast("Erro: " + error.message, "error");
    } else { 
        const { data, error } = await supabase.from(tabela).insert([payload]).select();
        if (!error) {
            stateSetter([...listaAtual, data[0]]);
            showToast("Adicionado com sucesso!");
            if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
        } else showToast("Erro: " + error.message, "error");
    }
    resetState(resetValue);
    closeFormSetter(false);
  }

  async function deleteItem(tabela, id, stateSetter, listaAtual) {
    if (isViewOnly || !window.confirm("Apagar definitivamente este registo?")) return;
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    if (!error) {
        stateSetter(listaAtual.filter(i => i.id !== id));
        showToast("Apagado com sucesso!");
        if (tabela === 'moradas_cliente' || tabela === 'contactos_cliente') fetchClientes(); 
    }
  }

  function abrirEdicaoSubItem(item, setItemState, setShowForm) {
      setItemState(item);
      setShowForm(true);
  }

  const clientColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#0ea5e9'];
  const getColorForClient = (nif) => {
      if (!nif) return '#94a3b8'; 
      const hash = String(nif).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return clientColors[hash % clientColors.length];
  };

  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' };

  if (loading) return <div className="page-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'80vh'}}><div className="pulse-dot-white" style={{background:'#2563eb'}}></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1500px', margin: '0 auto'}}>
      <div className="page-header" style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
        <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>👥 Clientes</h1>
        <button className="btn-glow" onClick={handleNovo}>+ Nova Empresa</button>
      </div>

      <div style={{background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
        <div style={{flex: 1, minWidth: '250px', position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '0.85rem'}}>🔍</span>
            <input type="text" placeholder="Procurar por Empresa ou NIF..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box'}} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>
            <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} style={{width:'16px', height:'16px', accentColor: '#10b981'}} /> Mostrar Inativos
        </label>
      </div>

      <div className="client-grid">
          {processedClientes.length > 0 ? processedClientes.map(c => {
              const isInactive = c.ativo === false;
              const color = getColorForClient(c.nif);
              const moradaRef = c.moradas_cliente && c.moradas_cliente.length > 0 ? c.moradas_cliente[0] : null;
              const contactoRef = c.contactos_cliente && c.contactos_cliente.length > 0 ? c.contactos_cliente[0] : null;

              return (
                  <div 
                      key={c.id} 
                      className="client-card"
                      style={{
                          background: isInactive ? '#f8fafc' : 'white', borderRadius: '16px', border: '1px solid #e2e8f0', 
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', 
                          opacity: isInactive ? 0.6 : 1, position: 'relative', overflow: 'hidden',
                          borderTop: `5px solid ${isInactive ? '#94a3b8' : color}`
                      }}
                  >
                      <div style={{padding: '20px', flex: 1}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px'}}>
                              <span style={{background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace'}}>{c.nif || 'S/ NIF'}</span>
                              {isInactive && <span style={{fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontWeight: '800'}}>INATIVO</span>}
                          </div>

                          <h2 style={{margin: '0 0 10px 0', fontSize: '1.25rem', color: '#1e293b', fontWeight: '800', lineHeight: '1.2'}}>{c.marca}</h2>
                          
                          <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px'}}>
                              {moradaRef ? (
                                  <div style={{fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                      📍 {moradaRef.concelho ? `${moradaRef.localidade} (${moradaRef.concelho})` : moradaRef.localidade}
                                  </div>
                              ) : (
                                  <div style={{fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px'}}>📍 Sem morada registada</div>
                              )}

                              {contactoRef ? (
                                  <div style={{fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                      👤 {contactoRef.nome_contacto} {contactoRef.telefone && `- ${contactoRef.telefone}`}
                                  </div>
                              ) : (
                                  <div style={{fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px'}}>👤 Sem contacto registado</div>
                              )}
                          </div>
                      </div>

                      <div style={{display: 'flex', borderTop: '1px solid #f1f5f9', background: isInactive ? 'transparent' : '#fafaf9'}}>
                          <button 
                              onClick={() => handleView(c)} 
                              style={{flex: 1, padding: '12px', border: 'none', borderRight: '1px solid #f1f5f9', background: 'transparent', color: '#2563eb', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s'}}
                              className="hover-blue-text"
                          >
                              Ver Perfil
                          </button>
                          
                          {!isInactive ? (
                              <button 
                                  onClick={() => handleEdit(c)} 
                                  style={{padding: '12px 20px', border: 'none', background: 'transparent', color: '#f59e0b', fontSize: '1.1rem', cursor: 'pointer', transition: '0.2s'}}
                                  className="hover-orange-text"
                                  title="Edição Rápida"
                              >
                                  ✏️
                              </button>
                          ) : (
                              <button 
                                  onClick={() => handleToggleAtivo(c.id, c.ativo)} 
                                  style={{padding: '12px 20px', border: 'none', background: 'transparent', color: '#16a34a', fontSize: '1.1rem', cursor: 'pointer', transition: '0.2s'}}
                                  className="hover-green-text"
                                  title="Reativar Empresa"
                              >
                                  🔄
                              </button>
                          )}
                      </div>
                  </div>
              );
          }) : (
              <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
                  <span style={{fontSize: '3rem', display: 'block', marginBottom: '10px'}}>🏜️</span>
                  <h3 style={{color: '#1e293b', margin: '0 0 5px 0'}}>Vazio por aqui.</h3>
                  <p style={{color: '#64748b', margin: 0}}>Nenhum cliente encontrado com os filtros atuais.</p>
              </div>
          )}
      </div>

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      {/* --- MEGA MODAL 360º DO CLIENTE --- */}
      {showModal && (
        <ModalPortal>
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={() => setShowModal(false)}>
            <div style={{background:'#fff', width:'96%', maxWidth:'1200px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'96vh'}} onClick={e => e.stopPropagation()}>
              
              {/* CABEÇALHO DO MODAL */}
              <div style={{padding:'20px 30px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{background:'#eff6ff', padding:'10px', borderRadius:'10px', fontSize:'1.4rem'}}>🏢</span>
                    <h3 style={{margin:0, color:'#1e293b', fontSize:'1.4rem', fontWeight:'800'}}>
                        {isViewOnly ? `Perfil: ${form.marca}` : (editId ? `Editar: ${form.marca}` : "Nova Empresa")}
                    </h3>
                    {form.ativo === false && <span style={{background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold'}}>INATIVO</span>}
                </div>
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                    {editId && !isViewOnly && (
                        <button 
                            onClick={() => handleToggleAtivo(editId, form.ativo)} 
                            style={{ background: form.ativo === false ? '#dcfce7' : '#fee2e2', color: form.ativo === false ? '#16a34a' : '#ef4444', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', transition:'0.2s' }}
                            className="hover-shadow"
                        >
                            {form.ativo === false ? '🔄 Reativar' : '🛑 Desativar'}
                        </button>
                    )}
                    <button onClick={() => setShowModal(false)} style={{background:'#e2e8f0', border:'none', width:'36px', height:'36px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', cursor:'pointer', color:'#475569', transition:'0.2s'}} className="hover-shadow">✕</button>
                </div>
              </div>

              {/* TABS DE NAVEGAÇÃO DO MODAL */}
              {editId && (
                <div className="tabs" style={{padding: '15px 30px 0 30px', background: '#fff', borderBottom: '1px solid #e2e8f0', display:'flex', flexWrap:'wrap', gap:'5px'}}>
                  <button className={activeTab === 'geral' ? 'active' : ''} onClick={() => {setActiveTab('geral'); fecharTodosSubForms();}}>📋 Geral</button>
                  <button className={activeTab === 'moradas' ? 'active' : ''} onClick={() => {setActiveTab('moradas'); fecharTodosSubForms();}}>📍 Moradas</button>
                  <button className={activeTab === 'contactos' ? 'active' : ''} onClick={() => {setActiveTab('contactos'); fecharTodosSubForms();}}>👤 Pessoas</button>
                  <button className={activeTab === 'projetos' ? 'active' : ''} onClick={() => {setActiveTab('projetos'); fecharTodosSubForms();}} style={{color: activeTab === 'projetos' ? '#2563eb' : '#3b82f6', fontWeight: '800'}}>🚀 Projetos</button>
                  <button className={activeTab === 'atividade' ? 'active' : ''} onClick={() => {setActiveTab('atividade'); fecharTodosSubForms();}}>📈 Atividade</button>
                  <button className={activeTab === 'documentos' ? 'active' : ''} onClick={() => {setActiveTab('documentos'); fecharTodosSubForms();}}>📄 Documentos</button>
                  <button className={activeTab === 'plano' ? 'active' : ''} onClick={() => {setActiveTab('plano'); fecharTodosSubForms();}}>💎 Plano</button>
                  {podeVerAcessos && <button className={activeTab === 'acessos' ? 'active' : ''} onClick={() => {setActiveTab('acessos'); fecharTodosSubForms();}}>🔐 Acessos</button>}
                </div>
              )}

              <div style={{padding:'30px', overflowY:'auto', background:'#f8fafc', flex:1}} className="custom-scrollbar">
                
                {/* --- ABA GERAL --- */}
                {activeTab === 'geral' && (
                  <form onSubmit={handleSubmitGeral}>
                     <fieldset disabled={isViewOnly} style={{border: 'none', padding: 0}}>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px'}}>
                        <div>
                            <label style={labelStyle}>NIF * <span style={{fontSize:'0.7rem', color:'#2563eb'}}>(Auto-preenchimento)</span></label>
                            <input type="text" maxLength="9" value={form.nif} onChange={handleNifChange} required style={{...inputStyle, borderColor: '#2563eb', background: '#eff6ff'}} placeholder="Ex: 500000000" />
                        </div>
                        <div>
                            <label style={labelStyle}>Marca / Nome Fantasia *</label>
                            <input type="text" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} required style={inputStyle} />
                        </div>
                      </div>

                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'10px'}}>
                        <div><label style={labelStyle}>Entidade Legal</label><input type="text" value={form.entidade} onChange={e => setForm({...form, entidade: e.target.value})} style={inputStyle} /></div>
                        <div>
                            <label style={labelStyle}>Website</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="text" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="www.empresa.pt" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                                {form.website && (
                                    <a href={form.website.startsWith('http') ? form.website : `https://${form.website}`} target="_blank" rel="noopener noreferrer" title="Abrir Website" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#eff6ff', color: '#2563eb', padding: '0 15px', height: '42px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '1.2rem', transition: '0.2s' }}>🔗</a>
                                )}
                            </div>
                        </div>
                      </div>

                      {!isViewOnly && <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'20px', padding:'15px', fontSize:'1.05rem'}}>Guardar Dados Base</button>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA DE PROJETOS DO CLIENTE --- */}
                {activeTab === 'projetos' && (
                    <div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                            <div>
                                <h4 style={{margin:0, fontSize: '1.2rem', color: '#1e293b'}}>Histórico de Projetos</h4>
                                <p style={{margin:'5px 0 0 0', color:'#64748b', fontSize:'0.9rem'}}>Todos os trabalhos associados a {form.marca}.</p>
                            </div>
                            
                            {/* 💡 AQUI ESTÁ O NOVO BOTÃO QUE PASSA O ID DO CLIENTE PELO STATE DA ROTA */}
                          <button 
                              onClick={() => navigate('/dashboard/projetos', { state: { prefillClienteId: editId, openNewProjectModal: true } })} 
                              className="btn-primary" 
                              style={{fontSize: '0.9rem'}}
                          >
                              + Novo Projeto
                          </button>
                        </div>

                        {projetosCliente.length > 0 ? (
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '15px'}}>
                                {projetosCliente.map(p => {
                                    const isDone = p.estado === 'concluido';
                                    return (
                                        <div key={p.id} onClick={() => navigate(`/dashboard/projetos/${p.id}`)} style={{background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection:'column', justifyContent: 'space-between', opacity: isDone ? 0.6 : 1, cursor:'pointer', transition:'0.2s'}} className="hover-shadow">
                                            <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px'}}>
                                                <span style={{fontSize: '0.7rem', background: isDone ? '#f1f5f9' : '#eff6ff', color: isDone ? '#64748b' : '#2563eb', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase'}}>{p.estado.replace('_', ' ')}</span>
                                                {p.codigo_projeto && <span style={{fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold'}}>{p.codigo_projeto}</span>}
                                            </div>
                                            <h4 style={{margin: '0 0 15px 0', fontSize: '1.1rem', color: '#1e293b', textDecoration: isDone ? 'line-through' : 'none', lineHeight:'1.3'}}>{p.titulo}</h4>
                                            
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent:'space-between', borderTop:'1px solid #f1f5f9', paddingTop:'10px'}}>
                                                {p.data_fim ? <span style={{fontSize: '0.85rem', color: '#64748b', fontWeight: '600'}}>📅 {new Date(p.data_fim).toLocaleDateString('pt-PT')}</span> : <span style={{fontSize: '0.85rem', color: '#cbd5e1'}}>Sem Prazo</span>}
                                                <span style={{fontSize: '0.85rem', color: '#2563eb', fontWeight: 'bold'}}>Abrir ➔</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                                <span style={{fontSize: '3rem', display: 'block', marginBottom: '15px'}}>🏜️</span>
                                <h4 style={{color: '#1e293b', margin: '0 0 5px 0', fontSize:'1.2rem'}}>Este cliente ainda não tem projetos.</h4>
                                <p style={{color:'#64748b'}}>Cria um novo projeto e ele aparecerá aqui automaticamente.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ABA ATIVIDADE --- */}
                {activeTab === 'atividade' && (
                  <div style={{display:'flex', flexDirection:'column', gap:'30px'}}>
                    <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                        <label style={labelStyle}>Objeto Social</label>
                        <textarea disabled={isViewOnly} rows="5" value={form.objeto_social} onChange={e => setForm({...form, objeto_social: e.target.value})} style={{...inputStyle, resize:'vertical', marginBottom:'15px'}} />
                        {!isViewOnly && <button className="btn-primary" onClick={handleSubmitGeral}>Atualizar Objeto Social</button>}
                    </div>
                    
                    <div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                          <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Lista de CAEs</h4>
                          {!isViewOnly && !showAddCae && <button className="btn-small-add" onClick={() => {setNovoCae(initCae); setShowAddCae(true)}}>+ Adicionar CAE</button>}
                        </div>

                        {showAddCae && (
                          <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                            <h5 style={{marginTop:0}}>{novoCae.id ? 'Editar CAE' : 'Novo CAE'}</h5>
                            <div style={{display:'grid', gridTemplateColumns:'150px 1fr auto', gap:'15px', alignItems:'center'}}>
                              <input type="text" placeholder="Código (Ex: 62010)" value={novoCae.codigo} onChange={e => setNovoCae({...novoCae, codigo: e.target.value})} style={inputStyle} />
                              <input type="text" placeholder="Descrição" value={novoCae.descricao} onChange={e => setNovoCae({...novoCae, descricao: e.target.value})} style={inputStyle} />
                              <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}><input type="checkbox" checked={novoCae.principal} onChange={e => setNovoCae({...novoCae, principal: e.target.checked})} /> Principal</label>
                            </div>
                            <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                                <button onClick={() => saveSubItem('caes_cliente', novoCae, setCaes, caes, setNovoCae, initCae, setShowAddCae)} className="btn-primary" style={{padding:'8px 15px'}}>{novoCae.id ? 'Atualizar' : 'Guardar CAE'}</button>
                                <button onClick={() => {setShowAddCae(false); setNovoCae(initCae);}} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer'}}>Cancelar</button>
                            </div>
                          </div>
                        )}

                        <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                          {caes.map(c => (
                            <li key={c.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e2e8f0'}}>
                              <div>
                                <span style={{fontWeight:'bold', fontSize:'1.1rem', color:'#1e293b'}}>{c.codigo}</span>
                                {c.principal && <span style={{background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:'10px', fontSize:'0.7rem', marginLeft:'10px', fontWeight:'bold'}}>PRINCIPAL</span>}
                                <div style={{color:'#64748b', fontSize:'0.9rem', marginTop:'6px'}}>{c.descricao || 'Sem descrição'}</div>
                              </div>
                              {!isViewOnly && (
                                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                   <button onClick={() => abrirEdicaoSubItem(c, setNovoCae, setShowAddCae)} className="btn-small">✏️</button>
                                   <button onClick={() => deleteItem('caes_cliente', c.id, setCaes, caes)} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'6px', padding:'6px', cursor:'pointer'}}>🗑</button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                    </div>
                  </div>
                )}

                {/* --- ABA DOCUMENTOS --- */}
                {activeTab === 'documentos' && (
                  <form onSubmit={handleSubmitGeral}>
                     <fieldset disabled={isViewOnly} style={{border:'none', padding:0}}>
                      
                      <div style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'20px'}}>
                          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Código Certidão Permanente</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="text" value={form.certidao_permanente} onChange={e => setForm({...form, certidao_permanente: e.target.value})} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Ex: 1234-5678-9012" />
                                    <a href="https://www2.gov.pt/espaco-empresa/empresa-online/consultar-a-certidao-permanente" target="_blank" rel="noopener noreferrer" title="Abrir Portal da Certidão Permanente" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#eff6ff', color: '#2563eb', padding: '0 15px', height: '42px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '1.2rem', transition: '0.2s' }}>🔗</a>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Data de Validade</label>
                                <input type="date" value={form.validade_certidao || ""} onChange={e => setForm({...form, validade_certidao: e.target.value})} style={inputStyle} />
                            </div>
                          </div>
                      </div>

                      <div style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Código RCBE</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="text" value={form.rcbe} onChange={e => setForm({...form, rcbe: e.target.value})} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Código de acesso RCBE" />
                                    <a href="https://rcbe.justica.gov.pt" target="_blank" rel="noopener noreferrer" title="Abrir Portal RCBE" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#eff6ff', color: '#2563eb', padding: '0 15px', height: '42px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '1.2rem', transition: '0.2s' }}>🔗</a>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Data de Validade</label>
                                <input type="date" value={form.validade_rcbe || ""} onChange={e => setForm({...form, validade_rcbe: e.target.value})} style={inputStyle} />
                            </div>
                          </div>
                      </div>

                      {!isViewOnly && <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'20px', padding:'15px', fontSize:'1.05rem'}}>Guardar Documentos</button>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA PLANO --- */}
                {activeTab === 'plano' && (
                  <div style={{background:'white', padding:'40px', borderRadius:'16px', border:'1px solid #e2e8f0', textAlign:'center', maxWidth:'500px', margin:'0 auto'}}>
                     <span style={{fontSize:'3rem', display:'block', marginBottom:'10px'}}>💎</span>
                     <h3 style={{marginTop:0, color:'#1e293b', fontSize:'1.5rem'}}>Plano de Subscrição</h3>
                     <select disabled={isViewOnly} value={form.plano} onChange={e => setForm({...form, plano: e.target.value})} style={{...inputStyle, fontSize:'1.2rem', padding:'15px', margin:'20px auto', display:'block'}}>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                     </select>
                     {!isViewOnly && <button className="btn-primary" onClick={handleSubmitGeral} style={{width:'100%', padding:'15px', fontSize:'1.05rem'}}>Confirmar Plano</button>}
                  </div>
                )}

                {/* --- ABA PESSOAS --- */}
                {activeTab === 'contactos' && (
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center'}}>
                      <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Equipa do Cliente</h4>
                      {!isViewOnly && !showAddContacto && <button className="btn-small-add" onClick={() => {setNovoContacto(initContacto); setShowAddContacto(true)}}>+ Adicionar Pessoa</button>}
                    </div>
                    
                    {showAddContacto && (
                      <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <h5 style={{marginTop:0, fontSize:'1.1rem'}}>{novoContacto.id ? 'Editar Pessoa' : 'Nova Pessoa'}</h5>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                          <div>
                              <label style={labelStyle}>Nome Completo *</label>
                              <input type="text" placeholder="João Silva" value={novoContacto.nome_contacto} onChange={e => setNovoContacto({...novoContacto, nome_contacto: e.target.value})} style={inputStyle} required />
                          </div>
                          <div>
                              <label style={labelStyle}>Cargo</label>
                              <input type="text" placeholder="Gerente, Diretor..." value={novoContacto.cargo} onChange={e => setNovoContacto({...novoContacto, cargo: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                              <label style={labelStyle}>Email</label>
                              <input type="email" placeholder="joao@empresa.pt" value={novoContacto.email} onChange={e => setNovoContacto({...novoContacto, email: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                              <label style={labelStyle}>Telefone / Telemóvel</label>
                              <input type="text" placeholder="+351 900 000 000" value={novoContacto.telefone} onChange={e => setNovoContacto({...novoContacto, telefone: e.target.value})} style={inputStyle} />
                          </div>
                        </div>
                        <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                            <button onClick={() => saveSubItem('contactos_cliente', novoContacto, setContactos, contactos, setNovoContacto, initContacto, setShowAddContacto)} className="btn-primary" style={{padding:'10px 20px'}}>{novoContacto.id ? 'Atualizar' : 'Guardar Pessoa'}</button>
                            <button onClick={() => {setShowAddContacto(false); setNovoContacto(initContacto);}} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer', fontWeight:'bold'}}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                      {contactos.map(c => (
                        <li key={c.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e2e8f0'}}>
                          <div>
                            <span style={{fontWeight:'bold', color:'#1e293b', fontSize:'1.1rem'}}>{c.nome_contacto}</span> {c.cargo && <span style={{color:'#64748b', fontSize:'0.9rem', marginLeft:'5px'}}>({c.cargo})</span>}
                            <div style={{fontSize:'0.9rem', color:'#475569', marginTop:'8px', display:'flex', flexDirection:'column', gap:'4px'}}>
                                <span>📧 {c.email || 'Sem email'}</span>
                                <span>📞 {c.telefone || 'Sem telefone'}</span>
                            </div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                               <button onClick={() => abrirEdicaoSubItem(c, setNovoContacto, setShowAddContacto)} className="btn-small">✏️</button>
                               <button onClick={() => deleteItem('contactos_cliente', c.id, setContactos, contactos)} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'6px', padding:'8px', cursor:'pointer'}}>🗑</button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* --- ABA MORADAS --- */}
                {activeTab === 'moradas' && (
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center'}}>
                      <h4 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>Moradas Registadas</h4>
                      {!isViewOnly && !showAddMorada && <button className="btn-small-add" onClick={() => {setNovaMorada(initMorada); setShowAddMorada(true)}}>+ Adicionar Morada</button>}
                    </div>

                    {showAddMorada && (
                      <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <h5 style={{marginTop:0, fontSize:'1.1rem'}}>{novaMorada.id ? 'Editar Morada' : 'Nova Morada'}</h5>
                        
                        <label style={labelStyle}>Rua / Lote / Porta</label>
                        <input type="text" placeholder="Ex: Rua Direita, nº 10" value={novaMorada.morada} onChange={e => setNovaMorada({...novaMorada, morada: e.target.value})} style={inputStyle} />
                        
                        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Cód. Postal</label>
                                <input type="text" placeholder="Ex: 8000-000" value={novaMorada.codigo_postal} onChange={e => setNovaMorada({...novaMorada, codigo_postal: e.target.value})} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Localidade</label>
                                <input type="text" placeholder="Ex: Faro" value={novaMorada.localidade} onChange={e => setNovaMorada({...novaMorada, localidade: e.target.value})} style={inputStyle} />
                            </div>
                        </div>
                        
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px'}}>
                            <div>
                                <label style={labelStyle}>Concelho</label>
                                <input type="text" value={novaMorada.concelho} onChange={e => setNovaMorada({...novaMorada, concelho: e.target.value})} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Distrito</label>
                                <input type="text" value={novaMorada.distrito} onChange={e => setNovaMorada({...novaMorada, distrito: e.target.value})} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Região</label>
                                <input type="text" value={novaMorada.regiao} onChange={e => setNovaMorada({...novaMorada, regiao: e.target.value})} style={inputStyle} />
                            </div>
                        </div>

                        <label style={labelStyle}>Tipo / Notas Opcionais</label>
                        <input type="text" placeholder="Ex: Sede, Armazém, Local de Faturação..." value={novaMorada.notas} onChange={e => setNovaMorada({...novaMorada, notas: e.target.value})} style={{...inputStyle, marginBottom:0}} />
                        
                        <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                            <button onClick={() => saveSubItem('moradas_cliente', novaMorada, setMoradas, moradas, setNovaMorada, initMorada, setShowAddMorada)} className="btn-primary" style={{padding:'10px 20px'}}>{novaMorada.id ? 'Atualizar' : 'Guardar Morada'}</button>
                            <button onClick={() => {setShowAddMorada(false); setNovaMorada(initMorada);}} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer', fontWeight:'bold'}}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'15px'}}>
                      {moradas.map(m => (
                        <li key={m.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', border:'1px solid #e2e8f0'}}>
                          <div>
                            {m.notas && <span style={{display:'inline-block', marginBottom:'8px', textTransform:'uppercase', fontSize: '0.75rem', background:'#e0f2fe', color:'#0369a1', padding:'4px 8px', borderRadius:'6px', fontWeight:'bold'}}>{m.notas}</span>}
                            <div style={{fontWeight:'bold', color:'#334155', fontSize:'1.05rem', marginBottom:'4px'}}>{m.morada}</div>
                            <div style={{color:'#64748b', fontSize:'0.9rem'}}>{m.codigo_postal} {m.localidade}</div>
                            <div style={{color:'#94a3b8', fontSize:'0.85rem', marginTop:'4px'}}>{[m.concelho, m.distrito, m.regiao].filter(Boolean).join(' • ')}</div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                               <button onClick={() => abrirEdicaoSubItem(m, setNovaMorada, setShowAddMorada)} className="btn-small">✏️</button>
                               <button onClick={() => deleteItem('moradas_cliente', m.id, setMoradas, moradas)} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'6px', padding:'8px', cursor:'pointer'}}>🗑</button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* --- ABA ACESSOS --- */}
                {activeTab === 'acessos' && podeVerAcessos && (
                  <div>
                    <div style={{background: '#fffbeb', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #f59e0b', marginBottom: '25px', color:'#b45309', fontWeight:'500', fontSize:'1.05rem'}}>
                      ⚠️ Acesso Restrito de Administração. Não partilhe estas credenciais fora da plataforma.
                    </div>
                    
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center'}}>
                      <h4 style={{margin:0, fontSize:'1.1rem'}}>Credenciais</h4>
                      {!isViewOnly && !showAddAcesso && <button className="btn-small-add" onClick={() => {setNovoAcesso(initAcesso); setShowAddAcesso(true)}}>+ Adicionar Acesso</button>}
                    </div>

                    {showAddAcesso && (
                      <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                        <h5 style={{marginTop:0, fontSize:'1.1rem'}}>{novoAcesso.id ? 'Editar Acesso' : 'Novo Acesso'}</h5>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                          <div>
                              <label style={labelStyle}>Plataforma / Organismo *</label>
                              <input type="text" placeholder="Ex: Portal das Finanças" value={novoAcesso.organismo} onChange={e => setNovoAcesso({...novoAcesso, organismo: e.target.value})} required style={inputStyle} />
                          </div>
                          <div>
                              <label style={labelStyle}>Link de Login (Opcional)</label>
                              <input type="text" placeholder="https://..." value={novoAcesso.url} onChange={e => setNovoAcesso({...novoAcesso, url: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                              <label style={labelStyle}>Utilizador / NIF *</label>
                              <input type="text" value={novoAcesso.utilizador} onChange={e => setNovoAcesso({...novoAcesso, utilizador: e.target.value})} required style={inputStyle} />
                          </div>
                          <div>
                              <label style={labelStyle}>Password *</label>
                              <input type="text" value={novoAcesso.codigo} onChange={e => setNovoAcesso({...novoAcesso, codigo: e.target.value})} required style={{...inputStyle, fontFamily:'monospace'}} />
                          </div>
                        </div>
                        <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                            <button onClick={() => saveSubItem('acessos_cliente', novoAcesso, setAcessos, acessos, setNovoAcesso, initAcesso, setShowAddAcesso)} className="btn-primary" style={{padding:'10px 20px'}}>{novoAcesso.id ? 'Atualizar' : 'Guardar Acesso'}</button>
                            <button onClick={() => {setShowAddAcesso(false); setNovoAcesso(initAcesso);}} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer', fontWeight:'bold'}}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(400px, 1fr))', gap:'15px'}}>
                      {acessos.map(a => (
                        <li key={a.id} style={{background:'white', padding:'20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', borderLeft:'5px solid #3b82f6', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                          <div style={{flex: 1, paddingRight:'15px'}}>
                            <span style={{fontWeight:'800', color:'#1e293b', fontSize:'1.15rem', display:'block', marginBottom:'10px'}}>{a.organismo}</span>
                            <div style={{fontFamily:'monospace', background:'#f8fafc', border:'1px solid #e2e8f0', padding:'12px', borderRadius:'8px', color:'#334155', fontSize:'0.95rem'}}>
                              User: <b style={{color:'#2563eb'}}>{a.utilizador}</b> <br/>
                              Pass: <b style={{color:'#ef4444'}}>{a.codigo}</b>
                            </div>
                            {a.url && <a href={a.url.startsWith('http') ? a.url : `https://${a.url}`} target="_blank" rel="noreferrer" style={{display:'inline-block', marginTop:'12px', fontSize:'0.85rem', color:'#2563eb', textDecoration:'none', fontWeight:'bold', background:'#eff6ff', padding:'6px 12px', borderRadius:'6px'}}>🔗 Abrir Portal de Login</a>}
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                               <button onClick={() => abrirEdicaoSubItem(a, setNovoAcesso, setShowAddAcesso)} className="btn-small">✏️</button>
                               <button onClick={() => deleteItem('acessos_cliente', a.id, setAcessos, acessos)} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'6px', padding:'8px', cursor:'pointer'}}>🗑</button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <style>{`
          /* Grelha de Clientes */
          .client-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 20px;
          }
          
          /* Efeito Interativo no Cartão */
          .client-card:hover {
              transform: translateY(-4px);
              border-color: #cbd5e1 !important;
              box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important;
          }

          .hover-shadow:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform: translateY(-1px); }
          .hover-blue-text:hover { background: #eff6ff !important; color: #1d4ed8 !important; }
          .hover-orange-text:hover { background: #fff7ed !important; color: #d97706 !important; }
          .hover-green-text:hover { background: #dcfce7 !important; color: #16a34a !important; }

          /* Custom Scrollbar limpa */
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

          /* Botão Glow Principal */
          .btn-glow {
              position: relative; overflow: hidden; background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px;
              font-weight: bold; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;
          }
          .btn-glow::after {
              content: ''; position: absolute; top: 0; left: -150%; width: 50%; height: 100%;
              background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
              transform: skewX(-25deg); transition: left 0.7s ease-in-out;
          }
          .btn-glow:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3); }
          .btn-glow:hover::after { animation: shine-sweep 1.2s infinite alternate ease-in-out; }
          @keyframes shine-sweep { 0% { left: -150%; } 100% { left: 200%; } }
          
          .pulse-dot-white { width: 8px; height: 8px; background-color: white; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  );
}
