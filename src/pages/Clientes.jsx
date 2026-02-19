import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function Clientes() {
  const { user, userProfile } = useAuth();
  const [podeVerAcessos, setPodeVerAcessos] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
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
    rcbe: "", validade_rcbe: ""
  };
  const [form, setForm] = useState(initialForm);

  const [contactos, setContactos] = useState([]);
  const [moradas, setMoradas] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [caes, setCaes] = useState([]);

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

  // --- 🪄 FETCH À PROVA DE BALA ---
  async function fetchClientes() {
    setLoading(true);
    
    // 1. Vai buscar todos os clientes
    const { data: cliData, error: errCli } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });

    // 2. Vai buscar as moradas todas
    const { data: morData } = await supabase
        .from("moradas_cliente")
        .select("cliente_id, localidade, concelho");

    if (!errCli && cliData) {
        // 3. Junta a morada ao cliente correspondente no frontend
        const clientesComMorada = cliData.map(c => {
            const moradas = morData?.filter(m => m.cliente_id === c.id) || [];
            return { ...c, moradas_cliente: moradas };
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

  const clientesFiltrados = clientes.filter((cliente) => {
    const textoBusca = busca.toLowerCase();
    return cliente.marca.toLowerCase().includes(textoBusca) || cliente.nif.includes(textoBusca);
  });

  function handleNovo() {
    setEditId(null); setIsViewOnly(false);
    setForm(initialForm);
    setContactos([]); setMoradas([]); setAcessos([]); setCaes([]); 
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
    const [cData, mData, aData, caeData] = await Promise.all([
        supabase.from("contactos_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("moradas_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("acessos_cliente").select("*").eq("cliente_id", clienteId),
        supabase.from("caes_cliente").select("*").eq("cliente_id", clienteId)
    ]);
    setContactos(cData.data || []); setMoradas(mData.data || []); setAcessos(aData.data || []); setCaes(caeData.data || []);
  }

  async function handleDeleteCliente(id) {
    if (isViewOnly) return;
    if (!window.confirm("ATENÇÃO: Apagar esta empresa vai eliminar TODAS as moradas, acessos, contactos e CAEs associados. Tens a certeza absoluta?")) return;

    try {
      await supabase.from("contactos_cliente").delete().eq("cliente_id", id);
      await supabase.from("moradas_cliente").delete().eq("cliente_id", id);
      await supabase.from("acessos_cliente").delete().eq("cliente_id", id);
      await supabase.from("caes_cliente").delete().eq("cliente_id", id);

      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;

      setClientes(clientes.filter(c => c.id !== id));
      showToast("Empresa apagada com sucesso!", "success");
      setShowModal(false);
    } catch (error) {
      showToast("Erro ao apagar empresa: " + error.message, "error");
    }
  }

  async function handleSubmitGeral(e) {
    e.preventDefault();
    if (isViewOnly) return;

    const dbPayload = {
      nif: form.nif,
      marca: form.marca,
      entidade: form.entidade,
      objeto_social: form.objeto_social,
      website: form.website,
      plano: form.plano,
      certidao_permanente: form.certidao_permanente,
      validade_certidao: form.validade_certidao || null,
      rcbe: form.rcbe,
      validade_rcbe: form.validade_rcbe || null
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
        setClientes([data[0], ...clientes]);
        setEditId(data[0].id);
        showToast("Empresa criada! Verifica as abas que foram pré-preenchidas.");
      }
    } catch (error) { 
        showToast("Erro: " + error.message, "error"); 
    }
  }

  // --- GATILHO DE ATUALIZAÇÃO ---
  async function saveSubItem(tabela, dados, stateSetter, listaAtual, resetState, resetValue, closeFormSetter) {
    if (isViewOnly) return;
    if (!editId) {
        showToast("Guarda primeiro os Dados da Empresa (Aba Geral) no fundo do ecrã.", "warning");
        return;
    }

    const payload = { ...dados, cliente_id: editId };

    if (tabela === 'moradas_cliente') {
        delete payload.distrito;
        delete payload.regiao;
    }

    if (payload.id) { 
        const { id, ...updateData } = payload;
        const { data, error } = await supabase.from(tabela).update(updateData).eq("id", id).select();
        if (!error) {
            stateSetter(listaAtual.map(i => i.id === id ? data[0] : i));
            showToast("Atualizado com sucesso!");
            if (tabela === 'moradas_cliente') fetchClientes(); // <-- A MAGIA: Atualiza a tabela principal
        } else showToast("Erro: " + error.message, "error");
    } else { 
        const { data, error } = await supabase.from(tabela).insert([payload]).select();
        if (!error) {
            stateSetter([...listaAtual, data[0]]);
            showToast("Adicionado com sucesso!");
            if (tabela === 'moradas_cliente') fetchClientes(); // <-- A MAGIA: Atualiza a tabela principal
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
        if (tabela === 'moradas_cliente') fetchClientes(); // <-- A MAGIA: Atualiza a tabela principal
    }
  }

  function abrirEdicaoSubItem(item, setItemState, setShowForm) {
      setItemState(item);
      setShowForm(true);
  }

  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👥 Clientes & Empresas</h1>
        <button className="btn-primary" onClick={handleNovo}>+ Nova Empresa</button>
      </div>

      <div className="filters-container">
        <input type="text" placeholder="🔍 Procurar por Empresa ou NIF..." className="search-input" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>NIF</th>
              <th>Localidade</th>
              <th>Concelho</th>
              <th style={{textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((c) => {
                // Apanha a primeira morada associada ao cliente para mostrar na tabela
                const moradaRef = c.moradas_cliente && c.moradas_cliente.length > 0 ? c.moradas_cliente[0] : {};
                
                return (
                <tr key={c.id}>
                    <td style={{ fontWeight: "bold", color: "#334155" }}>{c.marca}</td>
                    <td><span style={{background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem'}}>{c.nif}</span></td>
                    <td>{moradaRef.localidade || '-'}</td>
                    <td>{moradaRef.concelho ? <span className="badge">{moradaRef.concelho}</span> : '-'}</td>
                    <td style={{textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button className="btn-small" onClick={() => handleView(c)}>👁️</button>
                        <button className="btn-small" onClick={() => handleEdit(c)}>✏️</button>
                        <button className="btn-small" style={{color: '#ef4444', background: '#fee2e2'}} onClick={() => handleDeleteCliente(c.id)}>🗑</button>
                    </div>
                    </td>
                </tr>
                )})
            ) : (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#666'}}>Nenhuma empresa encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {notification && <div className={`toast-container ${notification.type}`}>{notification.type === 'success' ? '✅' : '⚠️'} {notification.message}</div>}

      {showModal && (
        <ModalPortal>
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={() => setShowModal(false)}>
            <div style={{background:'#fff', width:'95%', maxWidth:'900px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'92vh'}} onClick={e => e.stopPropagation()}>
              
              <div style={{padding:'20px 30px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{background:'#eff6ff', padding:'8px', borderRadius:'8px', fontSize:'1.2rem'}}>🏢</span>
                    <h3 style={{margin:0, color:'#1e293b', fontSize:'1.25rem'}}>{isViewOnly ? `Ver: ${form.marca}` : (editId ? `Editar: ${form.marca}` : "Nova Empresa")}</h3>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    {editId && !isViewOnly && <button onClick={() => handleDeleteCliente(editId)} style={{background:'#fee2e2', color:'#ef4444', border:'none', padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold'}}>Apagar Empresa</button>}
                    <button onClick={() => setShowModal(false)} style={{background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8'}}>✕</button>
                </div>
              </div>

              {editId && (
                <div className="tabs" style={{padding: '0 30px', background: '#fff', borderBottom: '1px solid #e2e8f0'}}>
                  <button className={activeTab === 'geral' ? 'active' : ''} onClick={() => {setActiveTab('geral'); fecharTodosSubForms();}}>Geral</button>
                  <button className={activeTab === 'atividade' ? 'active' : ''} onClick={() => {setActiveTab('atividade'); fecharTodosSubForms();}}>📈 Atividade</button>
                  <button className={activeTab === 'documentos' ? 'active' : ''} onClick={() => {setActiveTab('documentos'); fecharTodosSubForms();}}>📄 Documentos</button>
                  <button className={activeTab === 'contactos' ? 'active' : ''} onClick={() => {setActiveTab('contactos'); fecharTodosSubForms();}}>👤 Pessoas</button>
                  <button className={activeTab === 'moradas' ? 'active' : ''} onClick={() => {setActiveTab('moradas'); fecharTodosSubForms();}}>📍 Moradas</button>
                  <button className={activeTab === 'plano' ? 'active' : ''} onClick={() => {setActiveTab('plano'); fecharTodosSubForms();}}>💎 Plano</button>
                  {podeVerAcessos && <button className={activeTab === 'acessos' ? 'active' : ''} onClick={() => {setActiveTab('acessos'); fecharTodosSubForms();}}>🔐 Acessos</button>}
                </div>
              )}

              <div style={{padding:'30px', overflowY:'auto', background:'#f8fafc', flex:1}}>
                
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
                        <div><label style={labelStyle}>Website</label><input type="text" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="www.empresa.pt" style={inputStyle} /></div>
                      </div>

                      {!isViewOnly && <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'20px'}}>Guardar Dados Base</button>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA ATIVIDADE --- */}
                {activeTab === 'atividade' && (
                  <div>
                    <label style={labelStyle}>Objeto Social</label>
                    <textarea disabled={isViewOnly} rows="4" value={form.objeto_social} onChange={e => setForm({...form, objeto_social: e.target.value})} style={{...inputStyle, resize:'vertical'}} />
                    {!isViewOnly && <button className="btn-primary" onClick={handleSubmitGeral} style={{marginBottom:'30px'}}>Atualizar Objeto Social</button>}
                    
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', borderTop:'1px solid #e2e8f0', paddingTop:'20px'}}>
                      <h4 style={{margin:0}}>Lista de CAEs</h4>
                      {!isViewOnly && !showAddCae && <button className="btn-small-add" onClick={() => {setNovoCae(initCae); setShowAddCae(true)}}>+ Adicionar CAE</button>}
                    </div>

                    {showAddCae && (
                      <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px'}}>
                        <h5 style={{marginTop:0}}>{novoCae.id ? 'Editar CAE' : 'Novo CAE'}</h5>
                        <div style={{display:'grid', gridTemplateColumns:'150px 1fr auto', gap:'15px', alignItems:'center'}}>
                          <input type="text" placeholder="Código (Ex: 62010)" value={novoCae.codigo} onChange={e => setNovoCae({...novoCae, codigo: e.target.value})} style={inputStyle} />
                          <input type="text" placeholder="Descrição" value={novoCae.descricao} onChange={e => setNovoCae({...novoCae, descricao: e.target.value})} style={inputStyle} />
                          <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}><input type="checkbox" checked={novoCae.principal} onChange={e => setNovoCae({...novoCae, principal: e.target.checked})} /> Principal</label>
                        </div>
                        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                            <button onClick={() => saveSubItem('caes_cliente', novoCae, setCaes, caes, setNovoCae, initCae, setShowAddCae)} className="btn-primary" style={{padding:'8px 15px'}}>{novoCae.id ? 'Atualizar' : 'Guardar CAE'}</button>
                            <button onClick={() => {setShowAddCae(false); setNovoCae(initCae);}} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer'}}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0}}>
                      {caes.map(c => (
                        <li key={c.id} style={{background:'white', padding:'15px', borderRadius:'10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e2e8f0'}}>
                          <div>
                            <span style={{fontWeight:'bold', fontSize:'1.1rem', color:'#1e293b'}}>{c.codigo}</span>
                            {c.principal && <span style={{background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:'10px', fontSize:'0.7rem', marginLeft:'10px', fontWeight:'bold'}}>PRINCIPAL</span>}
                            <div style={{color:'#64748b', fontSize:'0.9rem', marginTop:'4px'}}>{c.descricao || 'Sem descrição'}</div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', gap:'10px'}}>
                               <button onClick={() => abrirEdicaoSubItem(c, setNovoCae, setShowAddCae)} className="btn-small">✏️</button>
                               <button onClick={() => deleteItem('caes_cliente', c.id, setCaes, caes)} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'6px', padding:'6px 10px', cursor:'pointer'}}>🗑</button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* --- ABA DOCUMENTOS --- */}
                {activeTab === 'documentos' && (
                  <form onSubmit={handleSubmitGeral}>
                     <fieldset disabled={isViewOnly} style={{border:'none', padding:0}}>
                      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
                        <div><label style={labelStyle}>Código Certidão Permanente</label><input type="text" value={form.certidao_permanente} onChange={e => setForm({...form, certidao_permanente: e.target.value})} style={inputStyle} /></div>
                        <div>
                            <label style={labelStyle}>Data de Validade</label>
                            <input type="date" value={form.validade_certidao || ""} onChange={e => setForm({...form, validade_certidao: e.target.value})} style={inputStyle} />
                        </div>
                      </div>
                      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px', marginTop:'15px'}}>
                        <div><label style={labelStyle}>Código RCBE</label><input type="text" value={form.rcbe} onChange={e => setForm({...form, rcbe: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Data de Validade</label><input type="date" value={form.validade_rcbe || ""} onChange={e => setForm({...form, validade_rcbe: e.target.value})} style={inputStyle} /></div>
                      </div>
                      {!isViewOnly && <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'20px'}}>Guardar Documentos</button>}
                    </fieldset>
                  </form>
                )}

                {/* --- ABA PLANO --- */}
                {activeTab === 'plano' && (
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', border:'1px solid #e2e8f0', textAlign:'center'}}>
                     <h3 style={{marginTop:0, color:'#1e293b'}}>Plano de Subscrição</h3>
                     <select disabled={isViewOnly} value={form.plano} onChange={e => setForm({...form, plano: e.target.value})} style={{...inputStyle, maxWidth:'300px', fontSize:'1.1rem', margin:'20px auto', display:'block'}}>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                     </select>
                     {!isViewOnly && <button className="btn-primary" onClick={handleSubmitGeral}>Confirmar Plano</button>}
                  </div>
                )}

                {/* --- ABA PESSOAS --- */}
                {activeTab === 'contactos' && (
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                      <h4 style={{margin:0}}>Equipa do Cliente</h4>
                      {!isViewOnly && !showAddContacto && <button className="btn-small-add" onClick={() => {setNovoContacto(initContacto); setShowAddContacto(true)}}>+ Adicionar Pessoa</button>}
                    </div>
                    
                    {showAddContacto && (
                      <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px'}}>
                        <h5 style={{marginTop:0}}>{novoContacto.id ? 'Editar Pessoa' : 'Nova Pessoa'}</h5>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                          <input type="text" placeholder="Nome *" value={novoContacto.nome_contacto} onChange={e => setNovoContacto({...novoContacto, nome_contacto: e.target.value})} style={inputStyle} required />
                          <input type="text" placeholder="Cargo (Ex: Gerente)" value={novoContacto.cargo} onChange={e => setNovoContacto({...novoContacto, cargo: e.target.value})} style={inputStyle} />
                          <input type="email" placeholder="Email" value={novoContacto.email} onChange={e => setNovoContacto({...novoContacto, email: e.target.value})} style={inputStyle} />
                          <input type="text" placeholder="Telefone" value={novoContacto.telefone} onChange={e => setNovoContacto({...novoContacto, telefone: e.target.value})} style={inputStyle} />
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button onClick={() => saveSubItem('contactos_cliente', novoContacto, setContactos, contactos, setNovoContacto, initContacto, setShowAddContacto)} className="btn-primary" style={{padding:'8px 15px'}}>{novoContacto.id ? 'Atualizar' : 'Guardar Pessoa'}</button>
                            <button onClick={() => {setShowAddContacto(false); setNovoContacto(initContacto);}} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer'}}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0}}>
                      {contactos.map(c => (
                        <li key={c.id} style={{background:'white', padding:'15px', borderRadius:'10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e2e8f0'}}>
                          <div>
                            <span style={{fontWeight:'bold', color:'#1e293b'}}>{c.nome_contacto}</span> {c.cargo && <span style={{color:'#64748b', fontSize:'0.85rem'}}>({c.cargo})</span>}
                            <div style={{fontSize:'0.85rem', color:'#475569', marginTop:'5px'}}>📧 {c.email || '-'} | 📞 {c.telefone || '-'}</div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', gap:'10px'}}>
                               <button onClick={() => abrirEdicaoSubItem(c, setNovoContacto, setShowAddContacto)} className="btn-small">✏️</button>
                               <button onClick={() => deleteItem('contactos_cliente', c.id, setContactos, contactos)} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'6px', padding:'6px 10px', cursor:'pointer'}}>🗑</button>
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
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                      <h4 style={{margin:0}}>Moradas Registadas</h4>
                      {!isViewOnly && !showAddMorada && <button className="btn-small-add" onClick={() => {setNovaMorada(initMorada); setShowAddMorada(true)}}>+ Adicionar Morada</button>}
                    </div>

                    {showAddMorada && (
                      <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px'}}>
                        <h5 style={{marginTop:0}}>{novaMorada.id ? 'Editar Morada' : 'Nova Morada'}</h5>
                        <input type="text" placeholder="Linha 1: Morada Completa (Rua, Lote, Porta)" value={novaMorada.morada} onChange={e => setNovaMorada({...novaMorada, morada: e.target.value})} style={inputStyle} />
                        
                        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'15px'}}>
                            <input type="text" placeholder="Linha 2: Cód. Postal" value={novaMorada.codigo_postal} onChange={e => setNovaMorada({...novaMorada, codigo_postal: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Linha 2: Localidade" value={novaMorada.localidade} onChange={e => setNovaMorada({...novaMorada, localidade: e.target.value})} style={inputStyle} />
                        </div>
                        
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                            <input type="text" placeholder="Linha 3: Concelho" value={novaMorada.concelho} onChange={e => setNovaMorada({...novaMorada, concelho: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Notas Opcionais (Ex: Sede, Armazém, Faturação)" value={novaMorada.notas} onChange={e => setNovaMorada({...novaMorada, notas: e.target.value})} style={inputStyle} />
                        </div>

                        <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                            <button onClick={() => saveSubItem('moradas_cliente', novaMorada, setMoradas, moradas, setNovaMorada, initMorada, setShowAddMorada)} className="btn-primary" style={{padding:'8px 15px'}}>{novaMorada.id ? 'Atualizar' : 'Guardar Morada'}</button>
                            <button onClick={() => {setShowAddMorada(false); setNovaMorada(initMorada);}} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer'}}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0}}>
                      {moradas.map(m => (
                        <li key={m.id} style={{background:'white', padding:'15px', borderRadius:'10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e2e8f0'}}>
                          <div>
                            {m.notas && <span style={{display:'inline-block', marginBottom:'5px', textTransform:'uppercase', fontSize: '0.7rem', background:'#e0f2fe', color:'#0369a1', padding:'3px 6px', borderRadius:'4px', fontWeight:'bold'}}>{m.notas}</span>}
                            <div style={{fontWeight:'bold', color:'#334155'}}>{m.morada}</div>
                            <div style={{color:'#64748b', fontSize:'0.9rem'}}>{m.codigo_postal} {m.localidade}</div>
                            <div style={{color:'#94a3b8', fontSize:'0.8rem', marginTop:'3px'}}>{m.concelho}</div>
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', gap:'10px'}}>
                               <button onClick={() => abrirEdicaoSubItem(m, setNovaMorada, setShowAddMorada)} className="btn-small">✏️</button>
                               <button onClick={() => deleteItem('moradas_cliente', m.id, setMoradas, moradas)} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'6px', padding:'6px 10px', cursor:'pointer'}}>🗑</button>
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
                    <div style={{background: '#fffbeb', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #f59e0b', marginBottom: '20px', color:'#b45309', fontWeight:'500'}}>
                      ⚠️ Acesso Restrito. Não partilhe estas credenciais fora da plataforma.
                    </div>
                    
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                      <h4 style={{margin:0}}>Credenciais</h4>
                      {!isViewOnly && !showAddAcesso && <button className="btn-small-add" onClick={() => {setNovoAcesso(initAcesso); setShowAddAcesso(true)}}>+ Adicionar Acesso</button>}
                    </div>

                    {showAddAcesso && (
                      <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #cbd5e1', marginBottom:'20px'}}>
                        <h5 style={{marginTop:0}}>{novoAcesso.id ? 'Editar Acesso' : 'Novo Acesso'}</h5>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                          <input type="text" placeholder="Plataforma (Ex: Portal das Finanças)" value={novoAcesso.organismo} onChange={e => setNovoAcesso({...novoAcesso, organismo: e.target.value})} required style={inputStyle} />
                          <input type="text" placeholder="Link de Login (Opcional)" value={novoAcesso.url} onChange={e => setNovoAcesso({...novoAcesso, url: e.target.value})} style={inputStyle} />
                          <input type="text" placeholder="Utilizador / NIF" value={novoAcesso.utilizador} onChange={e => setNovoAcesso({...novoAcesso, utilizador: e.target.value})} required style={inputStyle} />
                          <input type="text" placeholder="Password" value={novoAcesso.codigo} onChange={e => setNovoAcesso({...novoAcesso, codigo: e.target.value})} required style={inputStyle} />
                        </div>
                        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                            <button onClick={() => saveSubItem('acessos_cliente', novoAcesso, setAcessos, acessos, setNovoAcesso, initAcesso, setShowAddAcesso)} className="btn-primary" style={{padding:'8px 15px'}}>{novoAcesso.id ? 'Atualizar' : 'Guardar Acesso'}</button>
                            <button onClick={() => {setShowAddAcesso(false); setNovoAcesso(initAcesso);}} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer'}}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    <ul style={{listStyle:'none', padding:0}}>
                      {acessos.map(a => (
                        <li key={a.id} style={{background:'white', padding:'15px', borderRadius:'10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', borderLeft:'4px solid #3b82f6', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
                          <div>
                            <span style={{fontWeight:'bold', color:'#1e293b', fontSize:'1.1rem'}}>{a.organismo}</span>
                            <div style={{fontFamily:'monospace', background:'#f1f5f9', padding:'8px', borderRadius:'6px', marginTop:'8px', color:'#334155'}}>
                              User: <b>{a.utilizador}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Pass: <b>{a.codigo}</b>
                            </div>
                            {a.url && <a href={a.url.startsWith('http') ? a.url : `https://${a.url}`} target="_blank" rel="noreferrer" style={{display:'inline-block', marginTop:'8px', fontSize:'0.8rem', color:'#2563eb', textDecoration:'none', fontWeight:'bold'}}>🔗 Abrir Portal</a>}
                          </div>
                          {!isViewOnly && (
                            <div style={{display:'flex', gap:'10px'}}>
                               <button onClick={() => abrirEdicaoSubItem(a, setNovoAcesso, setShowAddAcesso)} className="btn-small">✏️</button>
                               <button onClick={() => deleteItem('acessos_cliente', a.id, setAcessos, acessos)} style={{border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:'6px', padding:'6px 10px', cursor:'pointer'}}>🗑</button>
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
    </div>
  );
}