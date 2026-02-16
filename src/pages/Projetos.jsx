import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

export default function Projetos() {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // FILTROS
  const [busca, setBusca] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false); // <--- NOVO ESTADO

  // Listas para os Dropdowns
  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [staff, setStaff] = useState([]); 

  // Estados do Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Formulário
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    cliente_id: "",
    tipo_projeto_id: "",
    responsavel_id: "",
    estado: "pendente",
    data_inicio: "",
    data_fim: "",
    observacoes: "",
    programa: "",
    aviso: "",
    codigo_projeto: "",
    investimento: 0,
    incentivo: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    const { data: projData, error } = await supabase
      .from("projetos")
      .select(`*, clientes ( marca ), tipos_projeto ( nome ), profiles ( nome, email )`)
      .order("created_at", { ascending: false });

    if (!error) setProjetos(projData || []);

    const { data: cliData } = await supabase.from("clientes").select("id, marca").order("marca");
    setClientes(cliData || []);

    const { data: tipoData } = await supabase.from("tipos_projeto").select("id, nome").order("nome");
    setTipos(tipoData || []);

    const { data: staffData } = await supabase.from("profiles").select("id, nome, email").order("nome");
    setStaff(staffData || []);

    setLoading(false);
  }

  // --- LÓGICA DE FILTRAGEM ATUALIZADA ---
  const projetosFiltrados = projetos.filter((p) => {
    // 1. Filtro de Texto
    const termo = busca.toLowerCase();
    const matchTexto = 
        p.titulo?.toLowerCase().includes(termo) ||
        p.codigo_projeto?.toLowerCase().includes(termo) ||
        p.clientes?.marca?.toLowerCase().includes(termo);

    // 2. Filtro de "Arquivados" (Concluídos/Cancelados)
    // Se "mostrarConcluidos" for FALSO, escondemos os projetos inativos
    const isInactive = p.estado === 'concluido' || p.estado === 'cancelado';
    
    if (!mostrarConcluidos && isInactive) {
        return false; // Esconde
    }

    return matchTexto;
  });

  // --- FUNÇÕES DE MODAL ---

  function handleNovo() {
    setEditId(null);
    setIsViewOnly(false);
    setForm({
      titulo: "",
      descricao: "",
      cliente_id: clientes.length > 0 ? clientes[0].id : "",
      tipo_projeto_id: tipos.length > 0 ? tipos[0].id : "",
      responsavel_id: staff.length > 0 ? staff[0].id : "",
      estado: "pendente",
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: "",
      observacoes: "",
      programa: "",
      aviso: "",
      codigo_projeto: "",
      investimento: 0,
      incentivo: 0
    });
    setShowModal(true);
  }

  function handleEdit(proj) {
    setEditId(proj.id);
    setIsViewOnly(false);
    loadProjectData(proj);
  }

  function handleView(proj) {
    setEditId(proj.id);
    setIsViewOnly(true);
    loadProjectData(proj);
  }

  function loadProjectData(proj) {
    setForm({
      titulo: proj.titulo,
      descricao: proj.descricao || "",
      cliente_id: proj.cliente_id,
      tipo_projeto_id: proj.tipo_projeto_id,
      responsavel_id: proj.responsavel_id,
      estado: proj.estado,
      data_inicio: proj.data_inicio || "",
      data_fim: proj.data_fim || "",
      observacoes: proj.observacoes || "",
      programa: proj.programa || "",
      aviso: proj.aviso || "",
      codigo_projeto: proj.codigo_projeto || "",
      investimento: proj.investimento || 0,
      incentivo: proj.incentivo || 0
    });
    setShowModal(true);
  }

  // --- SUBMISSÃO ---

  async function handleSubmit(e) {
      e.preventDefault();
      if (isViewOnly) return; 

      const payload = { ...form };
      if (!payload.responsavel_id) payload.responsavel_id = null;
      if (!payload.tipo_projeto_id) payload.tipo_projeto_id = null;
      if (!payload.cliente_id) payload.cliente_id = null; 

      if(!payload.cliente_id) {
          alert("Tens de escolher um cliente!");
          return;
      }

      try {
        if (editId) {
          const { error } = await supabase.from("projetos").update(payload).eq("id", editId);
          if (error) throw error;
          alert("Projeto atualizado!");
        } else {
          const { error } = await supabase.from("projetos").insert([payload]);
          if (error) throw error;
          alert("Projeto criado com sucesso!");
        }
        
        setShowModal(false);
        fetchData(); 
      } catch (error) {
        alert("Erro: " + error.message);
      }
    }

  // Cores dos Badges
  const getStatusColor = (status) => {
    switch(status) {
      case 'concluido': return '#dcfce7';
      case 'em_curso': return '#dbeafe';
      case 'cancelado': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  const getStatusTextColor = (status) => {
    switch(status) {
      case 'concluido': return '#166534';
      case 'em_curso': return '#1e40af';
      case 'cancelado': return '#991b1b';
      default: return '#374151';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🚀 Gestão de Projetos</h1>
        <button className="btn-primary" onClick={handleNovo}>+ Novo Projeto</button>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="filters-container">
        
        {/* Input de Pesquisa */}
        <input 
            type="text" 
            placeholder="🔍 Procurar por Projeto, Cliente..." 
            className="search-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
        />

        {/* Checkbox "Mostrar Histórico" */}
        <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem'}}>
            <input 
                type="checkbox" 
                checked={mostrarConcluidos}
                onChange={(e) => setMostrarConcluidos(e.target.checked)}
                style={{width: '18px', height: '18px'}}
            />
            Mostrar Arquivados
        </label>

         {busca && (
            <button className="btn-clear" onClick={() => setBusca("")}>
                Limpar ✖
            </button>
        )}
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Projeto</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Responsável</th>
              <th>Estado</th>
              <th style={{textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {projetosFiltrados.length > 0 ? (
                projetosFiltrados.map((p) => (
                <tr key={p.id}>
                    <td style={{ fontWeight: "bold", color: "#2563eb" }}>
                        {p.codigo_projeto && <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block'}}>[{p.codigo_projeto}]</span>}
                        {p.titulo}
                        <div style={{fontSize: '0.8rem', color: '#666', fontWeight: 'normal'}}>
                            {p.data_inicio} {p.data_fim && ` -> ${p.data_fim}`}
                        </div>
                    </td>
                    <td>{p.clientes?.marca || 'N/A'}</td>
                    <td>{p.tipos_projeto?.nome || 'Geral'}</td>
                    <td>{p.profiles?.nome || p.profiles?.email || 'N/A'}</td>
                    <td>
                        <span className="badge" style={{
                            backgroundColor: getStatusColor(p.estado),
                            color: getStatusTextColor(p.estado)
                        }}>
                            {p.estado.replace('_', ' ')}
                        </span>
                    </td>
                    <td style={{textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button className="btn-small" onClick={() => handleView(p)} title="Ver Detalhes">👁️</button>
                        <button className="btn-small" onClick={() => handleEdit(p)} title="Editar">✏️</button>
                    </div>
                    </td>
                </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                        {mostrarConcluidos 
                            ? "Nenhum projeto encontrado." 
                            : "Nenhum projeto ativo encontrado. (Tenta marcar 'Mostrar Arquivados')"}
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
               <h3>
                 {isViewOnly ? `Visualizar: ${form.titulo}` : (editId ? "Editar Projeto" : "Novo Projeto")}
               </h3>
               <button onClick={() => setShowModal(false)} className="close-btn">✖</button>
            </div>

            <div className="modal-body">
                <form onSubmit={handleSubmit} className="modal-form">
                    
                    <fieldset disabled={isViewOnly} style={{border: 'none', padding: 0, margin: 0}}>
                        
                        <div className="form-row">
                            <div className="col" style={{flex: 2}}>
                                <label>Título do Projeto *</label>
                                <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required />
                            </div>
                            <div className="col">
                                <label>Estado</label>
                                <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                                    <option value="pendente">Pendente</option>
                                    <option value="em_curso">Em Curso</option>
                                    <option value="concluido">Concluído</option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col">
                                <label>Cliente *</label>
                                <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} required>
                                    <option value="">Selecione...</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.marca}</option>)}
                                </select>
                            </div>
                            <div className="col">
                                <label>Tipo de Projeto</label>
                                <select value={form.tipo_projeto_id} onChange={e => setForm({...form, tipo_projeto_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col">
                                <label>Responsável Interno</label>
                                <select 
                                    value={form.responsavel_id} 
                                    onChange={e => setForm({...form, responsavel_id: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {staff.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nome ? s.nome : s.email} 
                                    </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col">
                                <label>Data Início</label>
                                <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} />
                            </div>
                            <div className="col">
                                <label>Data Fim (Previsão)</label>
                                <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col">
                                <label>Programa</label>
                                <input type="text" value={form.programa} onChange={e => setForm({...form, programa: e.target.value})} placeholder="Ex: Portugal 2030" />
                            </div>
                            <div className="col">
                                <label>Aviso</label>
                                <input type="text" value={form.aviso} onChange={e => setForm({...form, aviso: e.target.value})} placeholder="Ex: 01/C16-i02/2023" />
                            </div>
                            <div className="col">
                                <label>Código do Projeto</label>
                                <input type="text" value={form.codigo_projeto} onChange={e => setForm({...form, codigo_projeto: e.target.value})} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col">
                                <label>Investimento (€)</label>
                                <input type="number" step="0.01" value={form.investimento} onChange={e => setForm({...form, investimento: e.target.value})} />
                            </div>
                            <div className="col">
                                <label>Incentivo (€)</label>
                                <input type="number" step="0.01" value={form.incentivo} onChange={e => setForm({...form, incentivo: e.target.value})} />
                            </div>
                        </div>

                        <label>Descrição</label>
                        <textarea rows="3" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />

                        <label>Observações Internas</label>
                        <textarea rows="2" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} />

                        {!isViewOnly && (
                            <button type="submit" className="btn-confirmar" style={{marginTop: '15px', width: '100%'}}>
                                {editId ? "Guardar Alterações" : "Criar Projeto"}
                            </button>
                        )}

                    </fieldset>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}