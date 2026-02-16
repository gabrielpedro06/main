import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

export default function GestaoLeads() {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leads");

  // Filtros
  const [filterLocalidade, setFilterLocalidade] = useState("");
  const [filterSetor, setFilterSetor] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); 

  // Modal Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSetor, setImportSetor] = useState(""); 

  const statusOptions = [
    { value: "novo", label: "📥 Novo", color: "#3b82f6", bg: "#eff6ff" },
    { value: "contactado", label: "📞 Contactado", color: "#eab308", bg: "#fefce8" },
    { value: "reuniao", label: "📅 Reunião", color: "#a855f7", bg: "#faf5ff" },
    { value: "proposta", label: "📄 Proposta", color: "#f97316", bg: "#fff7ed" },
    { value: "convertido", label: "💰 Ganho", color: "#16a34a", bg: "#f0fdf4" },
    { value: "perdido", label: "❌ Perdido", color: "#64748b", bg: "#f1f5f9" },
  ];

  const setorOptions = [
    "Industria", "Saúde", "Tecnologia", "AudioVisual", "Turismo", "Comércio", "Serviços"
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    const tableName = activeTab === "leads" ? "marketing_leads" : "marketing_prospects";
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setDataList(data || []);
    setLoading(false);
  }

  async function updateStatus(id, newStatus) {
    const updatedList = dataList.map((item) =>
      item.id === id ? { ...item, estado: newStatus } : item
    );
    setDataList(updatedList);
    await supabase.from("marketing_leads").update({ estado: newStatus }).eq("id", id);
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!file) return alert("Escolhe um ficheiro CSV primeiro!");

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async ({ target }) => {
      const csv = target.result;
      const lines = csv.split("\n");
      const newData = [];

      const regexSplit = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(regexSplit);
        const clean = (val) => val ? val.trim().replace(/^"|"$/g, '') : null;

        if (cols.length >= 2) {
          newData.push({
            nome: clean(cols[0]) || "Sem Nome",
            nif: clean(cols[1]),
            localidade: clean(cols[2]),
            contacto: clean(cols[3]),
            email: clean(cols[4]),
            titular: clean(cols[5]),
            cae: clean(cols[6]),
            setor: importSetor || null, 
            estado: "novo",
          });
        }
      }

      if (newData.length > 0) {
        const tableName = activeTab === "leads" ? "marketing_leads" : "marketing_prospects";
        const { error } = await supabase.from(tableName).insert(newData);
        if (error) alert("Erro: " + error.message);
        else {
          alert(`${newData.length} registos importados! 🚀`);
          setShowImportModal(false);
          fetchData();
        }
      }
      setImporting(false);
      setFile(null);
    };
    reader.readAsText(file);
  }

  async function deleteItem(id) {
    if (!window.confirm("Tem a certeza?")) return;
    const tableName = activeTab === "leads" ? "marketing_leads" : "marketing_prospects";
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (!error) setDataList(dataList.filter((l) => l.id !== id));
  }

  async function promoteToLead(prospect) {
    if (!window.confirm(`Promover "${prospect.nome}" a LEAD?`)) return;
    const { error: insertError } = await supabase.from("marketing_leads").insert([{
      nome: prospect.nome, nif: prospect.nif, localidade: prospect.localidade,
      email: prospect.email, contacto: prospect.contacto, titular: prospect.titular,
      setor: prospect.setor, cae: prospect.cae, estado: "novo",
    }]);

    if (insertError) return alert("Erro: " + insertError.message);
    await supabase.from("marketing_prospects").delete().eq("id", prospect.id);
    setDataList(dataList.filter((l) => l.id !== prospect.id));
    alert("Promovido com sucesso! 🚀");
  }

  const filteredList = dataList.filter((item) => {
    const matchLocalidade = filterLocalidade ? item.localidade?.toLowerCase().includes(filterLocalidade.toLowerCase()) : true;
    const matchSetor = filterSetor ? item.setor === filterSetor : true;
    const matchSearch = searchTerm ? 
        item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.nif?.includes(searchTerm) : true;
    return matchLocalidade && matchSetor && matchSearch;
  });

  const inputStyle = { padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', minWidth: '200px' };
  const selectStyle = { ...inputStyle, cursor: 'pointer', backgroundColor: 'white' };

  return (
    <div className="page-container" style={{maxWidth: '100%', margin: '0 auto'}}>
      
      {/* HEADER */}
      <div className="card" style={{ marginBottom: 20, padding: '25px', display: "flex", justifyContent: "space-between", alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
        <div>
          <h1 style={{fontSize: '1.8rem', color: '#1e293b', marginBottom: '5px'}}>🎯 Marketing Hub</h1>
          <p style={{color: '#64748b', margin: 0}}>Gestão de {activeTab === 'leads' ? 'Leads' : 'Prospects'}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowImportModal(true)} style={{display:'flex', alignItems:'center', gap:'8px'}}>
            📂 Importar CSV
        </button>
      </div>

      {/* TABS */}
      <div style={{display:'flex', gap:'5px', paddingLeft: '10px'}}>
          <button onClick={() => setActiveTab("leads")} style={{padding: '12px 25px', background: activeTab === 'leads' ? 'white' : '#e2e8f0', color: activeTab === 'leads' ? '#2563eb' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer'}}>🚀 Leads </button>
          <button onClick={() => setActiveTab("prospects")} style={{padding: '12px 25px', background: activeTab === 'prospects' ? 'white' : '#e2e8f0', color: activeTab === 'prospects' ? '#2563eb' : '#64748b', border: 'none', borderRadius: '12px 12px 0 0', fontWeight: 'bold', cursor: 'pointer'}}>🔭 Prospects</button>
      </div>

      <div className="card" style={{ padding: '20px', borderRadius: '0 12px 12px 12px' }}>
        
        {/* FILTROS */}
        <div style={{ display: "flex", flexWrap: 'wrap', gap: 15, marginBottom: 25, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{flex: 1, minWidth: '250px'}}>
            <input placeholder="🔍 Pesquisar empresa ou NIF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{...inputStyle, width: '100%'}} />
          </div>
          <input placeholder="📍 Filtrar Localidade" value={filterLocalidade} onChange={(e) => setFilterLocalidade(e.target.value)} style={inputStyle} />
          <select value={filterSetor} onChange={(e) => setFilterSetor(e.target.value)} style={selectStyle}>
            <option value="">🏢 Todos os setores</option>
            {setorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* TABELA COM SCROLL HORIZONTAL (EVITA SOBREPOSIÇÃO) */}
        <div className="table-responsive" style={{overflowX: 'auto'}}>
            <table className="data-table" style={{ width: "100%", minWidth: '1500px', whiteSpace: 'nowrap' }}>
            <thead>
                <tr style={{color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em'}}>
                    <th>Empresa</th>
                    <th>NIF</th>
                    <th>Localidade</th>
                    <th>Contacto</th>
                    <th>Email</th>
                    <th>Titular</th>
                    <th>Setor</th>
                    <th>CAE</th>
                    {activeTab === "leads" && <th>Estado</th>}
                    <th style={{textAlign: 'right'}}>Ações</th>
                </tr>
            </thead>

            <tbody>
                {filteredList.map((item) => (
                <tr key={item.id}>
                    <td><div style={{fontWeight: 'bold', color: '#1e293b'}}>{item.nome}</div></td>
                    <td><span style={{fontFamily: 'monospace', color: '#64748b', background:'#f1f5f9', padding:'2px 6px', borderRadius:'4px'}}>{item.nif || '-'}</span></td>
                    
                    <td>{item.localidade ? <span style={{color: '#475569'}}>📍 {item.localidade}</span> : <span style={{color: '#cbd5e1'}}>-</span>}</td>
                    
                    <td>{item.contacto ? <span style={{color: '#64748b'}}>📞 {item.contacto}</span> : <span style={{color: '#cbd5e1'}}>-</span>}</td>
                    
                    <td>
                        {item.email ? (
                            <a href={`mailto:${item.email}`} style={{color: '#2563eb', textDecoration: 'none', fontWeight: '500'}}>✉️ {item.email}</a>
                        ) : <span style={{color: '#cbd5e1'}}>-</span>}
                    </td>

                    <td>{item.titular ? <span style={{color: '#334155'}}>👤 {item.titular}</span> : <span style={{color: '#cbd5e1'}}>-</span>}</td>

                    <td>{item.setor ? <span className="badge" style={{background: '#eff6ff', color: '#3b82f6', border: '1px solid #dbeafe'}}>{item.setor}</span> : <span style={{color: '#cbd5e1'}}>-</span>}</td>
                    
                    <td>{item.cae ? <span style={{color: '#64748b', fontSize:'0.85rem'}}>{item.cae}</span> : <span style={{color: '#cbd5e1'}}>-</span>}</td>

                    {activeTab === "leads" && (
                    <td>
                        <select
                            value={item.estado}
                            onChange={(e) => updateStatus(item.id, e.target.value)}
                            style={{
                                padding: '6px 10px', borderRadius: '20px', border: 'none', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer',
                                background: statusOptions.find(o => o.value === item.estado)?.bg || '#f1f5f9',
                                color: statusOptions.find(o => o.value === item.estado)?.color || '#64748b',
                            }}
                        >
                        {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                        </select>
                    </td>
                    )}

                    <td style={{textAlign: 'right'}}>
                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                            {activeTab === "prospects" && (
                            <button onClick={() => promoteToLead(item)} title="Promover" style={{background: '#dcfce7', color: '#16a34a', border: 'none', padding:'6px 10px', borderRadius: '6px', cursor: 'pointer'}}>🚀</button>
                            )}
                            <button onClick={() => deleteItem(item.id)} title="Apagar" style={{background: '#fee2e2', color: '#ef4444', border: 'none', padding:'6px 10px', borderRadius: '6px', cursor: 'pointer'}}>🗑️</button>
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
            
            {filteredList.length === 0 && (
                <div style={{textAlign: 'center', padding: '50px', color: '#94a3b8'}}>
                    <p>Nenhum registo encontrado.</p>
                </div>
            )}
        </div>
      </div>

      {/* --- MODAL NOVO E BONITO --- */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width: '500px', padding: '30px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
            
            <div style={{marginBottom: '20px'}}>
                <h3 style={{margin: 0, color: '#1e293b', fontSize: '1.5rem'}}>📂 Importar CSV</h3>
                <p style={{margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem'}}>Destino: <b>{activeTab === 'leads' ? 'Leads (Funil)' : 'Prospects (Base Dados)'}</b></p>
            </div>

            <div style={{background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '15px', marginBottom: '25px'}}>
                <p style={{margin: 0, fontSize: '0.85rem', color: '#1e40af', lineHeight: '1.5'}}>
                    <strong>Colunas Obrigatórias (nesta ordem):</strong><br/>
                    Nome, NIF, Localidade, Contacto, Email, Titular, CAE
                </p>
            </div>

            <div style={{marginBottom: '20px'}}>
                <label style={{display:'block', fontSize:'0.85rem', fontWeight:'600', color:'#475569', marginBottom:'8px'}}>Setor (Opcional)</label>
                <select value={importSetor} onChange={(e) => setImportSetor(e.target.value)} style={{...selectStyle, width: '100%'}}>
                    <option value="">-- Ignorar ou usar do CSV --</option>
                    {setorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div style={{marginBottom: '25px'}}>
                <label 
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '30px', border: '2px dashed #cbd5e1', borderRadius: '12px', 
                        cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                    <span style={{fontSize: '2rem', marginBottom: '10px'}}>📄</span>
                    <span style={{fontSize: '0.9rem', color: '#64748b', fontWeight: '500'}}>
                        {file ? file.name : "Clica para escolher o ficheiro CSV"}
                    </span>
                    <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} style={{display: 'none'}} />
                </label>
            </div>

            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={() => setShowImportModal(false)} style={{flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '600', cursor: 'pointer'}}>
                    Cancelar
                </button>
                <button className="btn-primary" onClick={handleFileUpload} disabled={importing} style={{flex: 1, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}>
                    {importing ? "A processar..." : "Carregar Dados"}
                </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}