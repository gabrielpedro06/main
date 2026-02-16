import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext"; // <-- IMPORTANTE: Puxar o contexto!
import "./../styles/dashboard.css";

export default function Clientes() {
  // --- AUTENTICAÇÃO E PERMISSÕES ---
  const { user, userProfile } = useAuth();
  const [podeVerAcessos, setPodeVerAcessos] = useState(false); // Controla a aba de passwords

  // --- ESTADOS GERAIS ---
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // ESTADOS DO MODAL
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null); 
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

  // FORMULÁRIO GERAL
  const [form, setForm] = useState({
    marca: "",
    nif: "",
    entidade: "",
    certidao_permanente: "",
    objeto_social: "",
    plano: "Standard",
    website: ""
  });

  // SUB-LISTAS
  const [contactos, setContactos] = useState([]);
  const [moradas, setMoradas] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [caes, setCaes] = useState([]);

  // SUB-FORMS
  const [novoContacto, setNovoContacto] = useState({ nome_contacto: "", email: "", telefone: "", cargo: "" });
  const [novaMorada, setNovaMorada] = useState({ morada: "", localidade: "", codigo_postal: "", concelho: "", notas: "" });
  const [novoAcesso, setNovoAcesso] = useState({ organismo: "", utilizador: "", codigo: "", url: "" });
  const [novoCae, setNovoCae] = useState({ codigo: "", principal: false });

  // 1. CARREGAR CLIENTES
  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setClientes(data);
    setLoading(false);
  }

  // --- LÓGICA DE FILTRAGEM ---
  const clientesFiltrados = clientes.filter((cliente) => {
    const textoBusca = busca.toLowerCase();
    return (
        cliente.marca.toLowerCase().includes(textoBusca) || 
        cliente.nif.includes(textoBusca)
    );
  });

  // --- FUNÇÕES DE ABERTURA DE MODAL ---
  function handleNovo() {
    setEditId(null);
    setIsViewOnly(false);
    
    setForm({ marca: "", nif: "", entidade: "", certidao_permanente: "", objeto_social: "", plano: "Standard", website: "" });
    
    setContactos([]);
    setMoradas([]);
    setAcessos([]);
    setCaes([]); 
    
    // Quem cria a empresa, tem permissão para adicionar os acessos logo de seguida
    setPodeVerAcessos(true);
    
    setActiveTab("geral");
    setShowModal(true);
  }

  function handleEdit(cliente) {
    setEditId(cliente.id);
    setIsViewOnly(false);
    loadClienteData(cliente);
  }

  function handleView(cliente) {
    setEditId(cliente.id);
    setIsViewOnly(true);
    loadClienteData(cliente);
  }

  function loadClienteData(cliente) {
    setForm(cliente);
    setActiveTab("geral");
    setShowModal(true);
    fetchSubDados(cliente.id);
    verificarPermissaoAcessos(cliente.id); // <-- MAGIA: Verifica se pode ver as passwords!
  }

  // --- VERIFICAÇÃO DE ACESSOS AOS PROJETOS ---
  async function verificarPermissaoAcessos(clienteId) {
    // 1. Admin e Gestor (RH) têm passe VIP automático
    if (['admin', 'gestor'].includes(userProfile?.role)) {
        setPodeVerAcessos(true);
        return;
    }

    // 2. Colaboradores: Vamos ver se estão na equipa de algum projeto deste cliente
    try {
        const { data, error } = await supabase
            .from('equipa_projeto') // Ajusta o nome se a tua tabela de equipas se chamar de outra forma
            .select(`
                projeto_id,
                projetos!inner(cliente_id)
            `)
            .eq('user_id', user.id)
            .eq('projetos.cliente_id', clienteId);

        if (!error && data && data.length > 0) {
            setPodeVerAcessos(true); // Está no projeto, porta aberta!
        } else {
            setPodeVerAcessos(false); // Não está no projeto, porta fechada!
        }
    } catch (err) {
        console.error("Erro ao verificar permissões:", err);
        setPodeVerAcessos(false);
    }
  }

  // Busca os dados de todas as tabelas relacionadas
  async function fetchSubDados(clienteId) {
    const { data: cData } = await supabase.from("contactos_cliente").select("*").eq("cliente_id", clienteId);
    const { data: mData } = await supabase.from("moradas_cliente").select("*").eq("cliente_id", clienteId);
    const { data: aData } = await supabase.from("acessos_cliente").select("*").eq("cliente_id", clienteId);
    const { data: caeData } = await supabase.from("caes_cliente").select("*").eq("cliente_id", clienteId);
    
    setContactos(cData || []);
    setMoradas(mData || []);
    setAcessos(aData || []);
    setCaes(caeData || []);
  }

  // --- SUBMISSÃO DO FORMULÁRIO GERAL ---
  async function handleSubmitGeral(e) {
    e.preventDefault();
    if (isViewOnly) return;

    try {
      if (editId) {
        // UPDATE
        const { error } = await supabase.from("clientes").update(form).eq("id", editId);
        if (error) throw error;
        
        setClientes(clientes.map(c => (c.id === editId ? { ...c, ...form } : c)));
        alert("Cliente atualizado com sucesso!");
        
      } else {
        // INSERT
        const { data, error } = await supabase.from("clientes").insert([form]).select();
        if (error) throw error;
        
        setClientes([data[0], ...clientes]);
        setEditId(data[0].id);
        alert("Empresa criada! Agora pode adicionar Pessoas, Moradas, Acessos e CAEs nas outras abas.");
      }
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    }
  }

  // --- FUNÇÕES GENÉRICAS PARA ADICIONAR/REMOVER ITENS ---
  async function addItem(tabela, dados, stateSetter, listaAtual, resetState, resetValue) {
    if (isViewOnly) return;
    
    const payload = { ...dados, cliente_id: editId };
    const { data, error } = await supabase.from(tabela).insert([payload]).select();
    
    if (!error) {
      stateSetter([...listaAtual, data[0]]);
      resetState(resetValue);
      return true;
    } else {
        console.error(error);
        alert("Erro ao adicionar item: " + error.message);
    }
    return false;
  }

  async function deleteItem(tabela, id, stateSetter, listaAtual) {
    if (isViewOnly) return;
    if(!window.confirm("Tem a certeza que deseja apagar este item?")) return;
    
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    
    if (!error) {
        stateSetter(listaAtual.filter(i => i.id !== id));
    } else {
        alert("Erro ao apagar: " + error.message);
    }
  }

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="page-container">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="page-header">
        <h1>👥 Clientes & Empresas</h1>
        <button className="btn-primary" onClick={handleNovo}>+ Nova Empresa</button>
      </div>

      {/* BARRA DE FILTRO */}
      <div className="filters-container">
        <input 
            type="text" 
            placeholder="🔍 Procurar por Empresa ou NIF..." 
            className="search-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
        />
         {busca && (
            <button className="btn-clear" onClick={() => setBusca("")}>
                Limpar ✖
            </button>
        )}
      </div>

      {/* TABELA DE LISTAGEM */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Certidão Perm.</th>
              <th>NIF</th>
              <th>Plano</th>
              <th style={{textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((c) => (
                <tr key={c.id}>
                    <td style={{ fontWeight: "bold", color: "#2563eb" }}>{c.marca}</td>
                    <td>{c.certidao_permanente || '-'}</td>
                    <td>{c.nif}</td>
                    <td><span className="badge">{c.plano}</span></td>
                    <td style={{textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button className="btn-small" onClick={() => handleView(c)} title="Ver Detalhes">👁️</button>
                        <button className="btn-small" onClick={() => handleEdit(c)} title="Editar">✏️</button>
                    </div>
                    </td>
                </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                        Nenhuma empresa encontrada.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL PRINCIPAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            
            {/* Header do Modal */}
            <div className="modal-header">
               <h3>
                 {isViewOnly ? `Visualizar: ${form.marca}` : (editId ? `Editar: ${form.marca}` : "Nova Empresa")}
               </h3>
               <button onClick={() => setShowModal(false)} className="close-btn">✖</button>
            </div>

            {/* Abas de Navegação (Só aparecem se já existir o cliente) */}
            {editId && (
              <div className="tabs">
                <button className={activeTab === 'geral' ? 'active' : ''} onClick={() => setActiveTab('geral')}>🏢 Geral</button>
                <button className={activeTab === 'contactos' ? 'active' : ''} onClick={() => setActiveTab('contactos')}>👤 Pessoas</button>
                <button className={activeTab === 'moradas' ? 'active' : ''} onClick={() => setActiveTab('moradas')}>📍 Moradas</button>
                <button className={activeTab === 'caes' ? 'active' : ''} onClick={() => setActiveTab('caes')}>📑 CAEs</button>
                
                {/* 🔒 ABA DE ACESSOS PROTEGIDA */}
                {podeVerAcessos && (
                    <button className={activeTab === 'acessos' ? 'active' : ''} onClick={() => setActiveTab('acessos')}>🔐 Acessos</button>
                )}
              </div>
            )}

            <div className="modal-body">
              
              {/* === CONTEÚDO: ABA GERAL === */}
              {activeTab === 'geral' && (
                <form onSubmit={handleSubmitGeral} className="modal-form">
                   <fieldset disabled={isViewOnly} style={{border: 'none', padding: 0, margin: 0}}>
                    
                    <div className="form-row">
                      <div className="col">
                          <label>Marca / Fantasia *</label>
                          <input type="text" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} required />
                      </div>
                      <div className="col">
                          <label>NIF *</label>
                          <input type="text" value={form.nif} onChange={e => setForm({...form, nif: e.target.value})} required />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="col">
                        <label>Entidade Legal</label>
                        <input type="text" value={form.entidade} onChange={e => setForm({...form, entidade: e.target.value})} />
                      </div>
                      <div className="col">
                        <label>Certidão Permanente</label>
                        <input type="text" value={form.certidao_permanente || ''} onChange={e => setForm({...form, certidao_permanente: e.target.value})} placeholder="Ex: 1234-5678-9012" />
                      </div>
                    </div>

                    <label>Objeto Social</label>
                    <textarea rows="2" value={form.objeto_social} onChange={e => setForm({...form, objeto_social: e.target.value})} />

                    <div className="form-row">
                      <div className="col">
                          <label>Website</label>
                          <input type="text" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
                      </div>
                      <div className="col">
                          <label>Plano</label>
                          <select value={form.plano} onChange={e => setForm({...form, plano: e.target.value})}>
                              <option value="Standard">Standard</option>
                              <option value="Premium">Premium</option>
                              <option value="Enterprise">Enterprise</option>
                          </select>
                      </div>
                    </div>

                    {!isViewOnly && (
                      <button type="submit" className="btn-save-client" style={{marginTop: '20px', width: '100%'}}>
                        {editId ? "Guardar Alterações" : "Criar Empresa"}
                      </button>
                    )}
                  </fieldset>
                </form>
              )}

              {/* === CONTEÚDO: ABA PESSOAS (CONTACTOS) === */}
              {activeTab === 'contactos' && (
                 <div className="tab-content">
                   <ul className="list-items">
                    {contactos.map(c => (
                      <li key={c.id}>
                        <div style={{flex: 1}}>
                            <div className="item-title">
                                {c.nome_contacto} 
                                {c.cargo && <span className="badge" style={{fontSize: '0.7rem', marginLeft: '5px'}}>{c.cargo}</span>}
                            </div>
                            <div className="item-subtitle">
                                {c.email && <span>📧 {c.email} &nbsp;</span>}
                                {c.telefone && <span>📞 {c.telefone}</span>}
                            </div>
                        </div>
                        {!isViewOnly && <button onClick={() => deleteItem('contactos_cliente', c.id, setContactos, contactos)} className="btn-delete-small">🗑</button>}
                      </li>
                    ))}
                  </ul>

                  {!isViewOnly && (
                    <form onSubmit={(e) => { 
                        e.preventDefault(); 
                        addItem('contactos_cliente', novoContacto, setContactos, contactos, setNovoContacto, { nome_contacto: "", email: "", telefone: "", cargo: "" }); 
                    }}>
                      <div className="form-section-title" style={{marginTop: '20px'}}>Adicionar Nova Pessoa</div>
                      <div className="mini-form-grid">
                        <input type="text" placeholder="Nome" value={novoContacto.nome_contacto} onChange={e => setNovoContacto({...novoContacto, nome_contacto: e.target.value})} required />
                        <input type="text" placeholder="Cargo (Ex: Gerente)" value={novoContacto.cargo} onChange={e => setNovoContacto({...novoContacto, cargo: e.target.value})} />
                        <input type="email" placeholder="Email" value={novoContacto.email} onChange={e => setNovoContacto({...novoContacto, email: e.target.value})} />
                        <input type="text" placeholder="Telefone" value={novoContacto.telefone} onChange={e => setNovoContacto({...novoContacto, telefone: e.target.value})} />
                        <button type="submit" className="btn-small-add" style={{gridColumn: '1 / -1'}}>Adicionar Pessoa</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* === CONTEÚDO: ABA MORADAS === */}
              {activeTab === 'moradas' && (
                <div className="tab-content">
                   <ul className="list-items">
                    {moradas.map(m => (
                      <li key={m.id}>
                         <div style={{flex: 1}}>
                            <div className="item-title">
                                {m.notas && <span style={{marginRight: '5px', textTransform:'uppercase', fontSize: '0.7rem', background:'#f1f5f9', padding:'2px 5px', borderRadius:'4px', color:'#1e293b'}}>{m.notas}</span>}
                                {m.localidade}
                            </div>
                            <div className="item-subtitle">
                                {m.morada} <br/>
                                {m.codigo_postal} {m.concelho && ` - ${m.concelho}`}
                            </div>
                        </div>
                        {!isViewOnly && <button onClick={() => deleteItem('moradas_cliente', m.id, setMoradas, moradas)} className="btn-delete-small">🗑</button>}
                      </li>
                    ))}
                  </ul>

                   {!isViewOnly && (
                    <form onSubmit={(e) => { 
                        e.preventDefault(); 
                        addItem('moradas_cliente', novaMorada, setMoradas, moradas, setNovaMorada, { morada: "", localidade: "", codigo_postal: "", concelho: "", notas: "" }); 
                    }}>
                      <div className="form-section-title" style={{marginTop: '20px'}}>Adicionar Nova Morada</div>
                      <div className="mini-form-grid">
                        <input type="text" placeholder="Morada Completa" value={novaMorada.morada} onChange={e => setNovaMorada({...novaMorada, morada: e.target.value})} required style={{gridColumn: '1 / -1'}} />
                        <input type="text" placeholder="Localidade" value={novaMorada.localidade} onChange={e => setNovaMorada({...novaMorada, localidade: e.target.value})} />
                        <input type="text" placeholder="Concelho" value={novaMorada.concelho} onChange={e => setNovaMorada({...novaMorada, concelho: e.target.value})} />
                        <input type="text" placeholder="C. Postal" value={novaMorada.codigo_postal} onChange={e => setNovaMorada({...novaMorada, codigo_postal: e.target.value})} />
                        <input type="text" placeholder="Notas (Ex: Sede)" value={novaMorada.notas} onChange={e => setNovaMorada({...novaMorada, notas: e.target.value})} />
                        <button type="submit" className="btn-small-add" style={{gridColumn: '1 / -1'}}>Adicionar Morada</button>
                      </div>
                    </form>
                   )}
                </div>
              )}

              {/* === CONTEÚDO: ABA CAEs === */}
              {activeTab === 'caes' && (
                <div className="tab-content">
                  <ul className="list-items">
                    {caes.map(cae => (
                      <li key={cae.id}>
                        <div style={{flex: 1}}>
                            <div className="item-title">
                                {cae.principal && <span className="badge badge-success" style={{marginRight: '8px'}}>PRINCIPAL</span>}
                                CAE: {cae.codigo}
                            </div>
                        </div>
                        {!isViewOnly && <button onClick={() => deleteItem('caes_cliente', cae.id, setCaes, caes)} className="btn-delete-small">🗑</button>}
                      </li>
                    ))}
                  </ul>

                  {!isViewOnly && (
                    <form onSubmit={(e) => { 
                        e.preventDefault(); 
                        addItem('caes_cliente', novoCae, setCaes, caes, setNovoCae, { codigo: "", principal: false }); 
                    }}>
                      <div className="form-section-title" style={{marginTop: '20px'}}>Adicionar Novo CAE</div>
                      <div className="mini-form-grid" style={{alignItems: 'center'}}>
                        
                        <input 
                            type="text" 
                            placeholder="Código CAE (Ex: 62010)" 
                            value={novoCae.codigo} 
                            onChange={e => setNovoCae({...novoCae, codigo: e.target.value})} 
                            required 
                        />
                        
                        <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0}}>
                            <input 
                                type="checkbox" 
                                checked={novoCae.principal} 
                                onChange={e => setNovoCae({...novoCae, principal: e.target.checked})} 
                                style={{width: 'auto', padding: 0, margin: 0, height: '18px'}}
                            />
                            É o CAE Principal?
                        </label>

                        <button type="submit" className="btn-small-add" style={{gridColumn: '1 / -1'}}>Adicionar CAE</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* === CONTEÚDO: ABA ACESSOS === */}
              {activeTab === 'acessos' && podeVerAcessos && (
                <div className="tab-content">
                  <div className="alert-box" style={{background: '#fffbeb', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', marginBottom: '15px'}}>
                    ⚠️ Estes dados são confidenciais.
                  </div>
                  <ul className="list-items">
                    {acessos.map(a => (
                      <li key={a.id} style={{borderLeft: '4px solid #3b82f6'}}>
                        <div style={{flex: 1}}>
                            <div className="item-title">{a.organismo}</div>
                            <div className="item-subtitle" style={{marginTop: '5px'}}>
                              User: <b style={{color: '#1e293b'}}>{a.utilizador}</b> &nbsp;|&nbsp; Pass: <b style={{color: '#1e293b'}}>{a.codigo}</b>
                            </div>
                            {a.url && (
                              <a href={a.url.startsWith('http') ? a.url : `https://${a.url}`} target="_blank" rel="noreferrer" style={{display: 'inline-block', marginTop: '8px', fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none'}}>
                                🔗 Abrir Link Externo
                              </a>
                            )}
                        </div>
                        {!isViewOnly && (
                          <button onClick={() => deleteItem('acessos_cliente', a.id, setAcessos, acessos)} className="btn-delete-small">🗑</button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {!isViewOnly && (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        addItem('acessos_cliente', novoAcesso, setAcessos, acessos, setNovoAcesso, { organismo: "", utilizador: "", codigo: "", url: "" });
                    }}>
                      <div className="form-section-title" style={{marginTop: '20px'}}>Adicionar Novo Acesso</div>
                      <div className="mini-form-grid">
                        <input type="text" placeholder="Organismo (Ex: Finanças)" value={novoAcesso.organismo} onChange={e => setNovoAcesso({...novoAcesso, organismo: e.target.value})} required />
                        <input type="text" placeholder="Utilizador/NIF" value={novoAcesso.utilizador} onChange={e => setNovoAcesso({...novoAcesso, utilizador: e.target.value})} required />
                        <input type="text" placeholder="Password/Código" value={novoAcesso.codigo} onChange={e => setNovoAcesso({...novoAcesso, codigo: e.target.value})} required />
                        <input type="text" placeholder="URL do Login (Opcional)" value={novoAcesso.url} onChange={e => setNovoAcesso({...novoAcesso, url: e.target.value})} />
                        <button type="submit" className="btn-small-add" style={{gridColumn: '1 / -1'}}>Adicionar Acesso</button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}