import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

export default function Atividades() {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // FILTROS
  const [busca, setBusca] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false); // <--- NOVO

  // Listas para Dropdowns
  const [projetos, setProjetos] = useState([]);
  const [staff, setStaff] = useState([]);

  // Estados do Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Formulário
  const [form, setForm] = useState({
    titulo: "",
    projeto_id: "",
    responsavel_id: "",
    descricao: "",
    observacoes: "",
    estado: "pendente",
    data_inicio: "",
    data_fim: "",
    investimento: 0,
    incentivo: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    const { data: ativData, error } = await supabase
      .from("atividades")
      .select(`
        *,
        projetos ( titulo, codigo_projeto ),
        profiles:responsavel_id ( nome, email ) 
      `)
      .order("created_at", { ascending: false });

    if (!error) setAtividades(ativData || []);

    const { data: projData } = await supabase
        .from("projetos")
        .select("id, titulo, codigo_projeto")
        .neq("estado", "cancelado");
    setProjetos(projData || []);

    const { data: staffData } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .order("nome");
    setStaff(staffData || []);

    setLoading(false);
  }

  // --- LÓGICA DE FILTRAGEM ATUALIZADA ---
  const atividadesFiltradas = atividades.filter((a) => {
    // 1. Filtro de Texto
    const termo = busca.toLowerCase();
    const matchTexto = 
        a.titulo?.toLowerCase().includes(termo) ||
        a.projetos?.titulo?.toLowerCase().includes(termo) ||
        a.projetos?.codigo_projeto?.toLowerCase().includes(termo);

    // 2. Filtro de Arquivados
    const isInactive = a.estado === 'concluido' || a.estado === 'cancelado';
    
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
      projeto_id: projetos.length > 0 ? projetos[0].id : "",
      responsavel_id: "",
      descricao: "",
      observacoes: "",
      estado: "pendente",
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: "",
      investimento: 0,
      incentivo: 0
    });
    setShowModal(true);
  }

  function handleEdit(ativ) {
    setEditId(ativ.id);
    setIsViewOnly(false);
    loadData(ativ);
  }

  function handleView(ativ) {
    setEditId(ativ.id);
    setIsViewOnly(true);
    loadData(ativ);
  }

  function loadData(ativ) {
    setForm({
      titulo: ativ.titulo,
      projeto_id: ativ.projeto_id,
      responsavel_id: ativ.responsavel_id,
      descricao: ativ.descricao || "",
      observacoes: ativ.observacoes || "",
      estado: ativ.estado,
      data_inicio: ativ.data_inicio || "",
      data_fim: ativ.data_fim || "",
      investimento: ativ.investimento || 0,
      incentivo: ativ.incentivo || 0
    });
    setShowModal(true);
  }

  // --- SUBMISSÃO ---

  async function handleSubmit(e) {
    e.preventDefault();
    if (isViewOnly) return;

    const payload = { ...form };
    if (!payload.responsavel_id) payload.responsavel_id = null;
    if (!payload.projeto_id) payload.projeto_id = null;

    if (!payload.projeto_id) {
        alert("A atividade tem de pertencer a um projeto!");
        return;
    }

    try {
      if (editId) {
        const { error } = await supabase.from("atividades").update(payload).eq("id", editId);
        if (error) throw error;
        alert("Atividade atualizada!");
      } else {
        const { error } = await supabase.from("atividades").insert([payload]);
        if (error) throw error;
        alert("Atividade criada!");
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert("Erro ao gravar: " + error.message);
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
        <h1>📋 Gestão de Atividades</h1>
        <button className="btn-primary" onClick={handleNovo}>+ Nova Atividade</button>
      </div>

      {/* --- BARRA DE FILTRO --- */}
      <div className="filters-container">
        <input 
            type="text" 
            placeholder="🔍 Procurar por Atividade ou Projeto..." 
            className="search-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
        />
        
        {/* CHECKBOX MOSTRAR ARQUIVADOS */}
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
              <th>Atividade</th>
              <th>Projeto Pai</th>
              <th>Responsável</th>
              <th>Estado</th>
              <th style={{textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {atividadesFiltradas.length > 0 ? (
                atividadesFiltradas.map((a) => (
                <tr key={a.id}>
                    <td style={{ fontWeight: "bold", color: "#2563eb" }}>
                        {a.titulo}
                        {(a.investimento > 0 || a.incentivo > 0) && (
                            <div style={{fontSize: '0.75rem', color: '#64748b', marginTop: '2px'}}>
                                Inv: {a.investimento}€
                            </div>
                        )}
                    </td>
                    <td>
                        {a.projetos?.titulo || "Sem Projeto"}
                        {a.projetos?.codigo_projeto && <small style={{display:'block', color:'#666'}}>[{a.projetos.codigo_projeto}]</small>}
                    </td>
                    <td>{a.profiles?.nome || a.profiles?.email || "N/A"}</td>
                    <td>
                    <span className="badge" style={{
                        backgroundColor: getStatusColor(a.estado),
                        color: getStatusTextColor(a.estado)
                    }}>
                        {a.estado.replace('_', ' ')}
                    </span>
                    </td>
                    <td style={{textAlign: 'center'}}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button className="btn-small" onClick={() => handleView(a)} title="Ver">👁️</button>
                            <button className="btn-small" onClick={() => handleEdit(a)} title="Editar">✏️</button>
                        </div>
                    </td>
                </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                        {mostrarConcluidos 
                            ? "Nenhuma atividade encontrada." 
                            : "Nenhuma atividade ativa encontrada. (Marca 'Mostrar Arquivados')"}
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
               <h3>{isViewOnly ? "Ver Atividade" : (editId ? "Editar Atividade" : "Nova Atividade")}</h3>
               <button onClick={() => setShowModal(false)} className="close-btn">✖</button>
            </div>

            <div className="modal-body">
                <form onSubmit={handleSubmit} className="modal-form">
                    <fieldset disabled={isViewOnly} style={{border: 'none', padding: 0}}>
                        
                        <div className="form-row">
                            <div className="col" style={{flex: 2}}>
                                <label>Título da Atividade *</label>
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
                                <label>Projeto Pai *</label>
                                <select value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})} required>
                                    <option value="">Escolha um projeto...</option>
                                    {projetos.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.titulo} {p.codigo_projeto ? `(${p.codigo_projeto})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col">
                                <label>Responsável</label>
                                <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.nome ? s.nome : s.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col">
                                <label>Data Início</label>
                                <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} />
                            </div>
                            <div className="col">
                                <label>Data Fim</label>
                                <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col">
                                <label>Investimento (€)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={form.investimento} 
                                    onChange={e => setForm({...form, investimento: e.target.value})} 
                                />
                            </div>
                            <div className="col">
                                <label>Incentivo (€)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={form.incentivo} 
                                    onChange={e => setForm({...form, incentivo: e.target.value})} 
                                />
                            </div>
                        </div>

                        <label>Descrição</label>
                        <textarea rows="3" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
                        
                        <label>Observações</label>
                        <textarea rows="2" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} />

                        {!isViewOnly && (
                            <button type="submit" className="btn-confirmar" style={{marginTop: '15px', width: '100%'}}>
                                {editId ? "Atualizar" : "Criar Atividade"}
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