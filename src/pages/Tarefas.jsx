import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

export default function Tarefas() {
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dados para os Dropdowns
  const [atividades, setAtividades] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [projetosList, setProjetosList] = useState([]); 

  // Estados dos Filtros
  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false); // <--- NOVO

  // Modal & Form
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    atividade_id: "",
    responsavel_id: "",
    estado: "pendente",
    prioridade: "normal",
    data_inicio: new Date().toISOString().split('T')[0],
    data_limite: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // 1. Buscar Tarefas
    const { data: tarefasData, error } = await supabase
      .from("tarefas")
      .select(`
        *,
        atividades (
            id, 
            titulo, 
            projetos (
                id, 
                titulo, 
                clientes ( id, marca )
            ) 
        ),
        profiles:responsavel_id ( nome, email )
      `)
      .order("created_at", { ascending: false });

    if (!error) setTarefas(tarefasData || []);

    const { data: ativData } = await supabase
        .from("atividades")
        .select("id, titulo, projetos(titulo)")
        .neq("estado", "cancelado");
    setAtividades(ativData || []);

    const { data: staffData } = await supabase.from("profiles").select("id, nome, email").order("nome");
    setStaff(staffData || []);

    const { data: cliData } = await supabase.from("clientes").select("id, marca").order("marca");
    setClientes(cliData || []);

    const { data: projData } = await supabase.from("projetos").select("id, titulo").order("titulo");
    setProjetosList(projData || []);

    setLoading(false);
  }

  // --- LÓGICA DE FILTRAGEM ATUALIZADA ---
  const tarefasFiltradas = tarefas.filter((t) => {
    // 1. Filtros de Seleção (Cliente, Projeto, Texto)
    const matchBusca = t.titulo.toLowerCase().includes(busca.toLowerCase());
    const matchProjeto = filtroProjeto ? t.atividades?.projetos?.id === filtroProjeto : true;
    const matchCliente = filtroCliente ? t.atividades?.projetos?.clientes?.id === filtroCliente : true;

    // 2. Filtro de Arquivados (Concluído/Cancelado)
    const isInactive = t.estado === 'concluido' || t.estado === 'cancelado';
    
    if (!mostrarConcluidos && isInactive) {
        return false; // Esconde se não estiver marcado para mostrar
    }

    return matchBusca && matchProjeto && matchCliente;
  });

  // --- FUNÇÕES MODAL ---
  function handleNovo() {
    setEditId(null);
    setIsViewOnly(false);
    setForm({
      titulo: "",
      descricao: "",
      atividade_id: atividades.length > 0 ? atividades[0].id : "",
      responsavel_id: "",
      estado: "pendente",
      prioridade: "normal",
      data_inicio: new Date().toISOString().split('T')[0],
      data_limite: ""
    });
    setShowModal(true);
  }

  function handleEdit(tarefa) {
    setEditId(tarefa.id);
    setIsViewOnly(false);
    loadData(tarefa);
  }

  function handleView(tarefa) {
    setEditId(tarefa.id);
    setIsViewOnly(true);
    loadData(tarefa);
  }

  function loadData(t) {
    setForm({
      titulo: t.titulo,
      descricao: t.descricao || "",
      atividade_id: t.atividade_id,
      responsavel_id: t.responsavel_id,
      estado: t.estado,
      prioridade: t.prioridade || "normal",
      data_inicio: t.data_inicio || "",
      data_limite: t.data_limite || ""
    });
    setShowModal(true);
  }

  // --- SUBMISSÃO ---
  async function handleSubmit(e) {
    e.preventDefault();
    if (isViewOnly) return;

    const payload = { ...form };
    if (!payload.responsavel_id) payload.responsavel_id = null;
    
    if (!payload.atividade_id) {
        alert("A tarefa tem de pertencer a uma atividade!");
        return;
    }

    try {
      if (editId) {
        const { error } = await supabase.from("tarefas").update(payload).eq("id", editId);
        if (error) throw error;
        alert("Tarefa atualizada!");
      } else {
        const { error } = await supabase.from("tarefas").insert([payload]);
        if (error) throw error;
        alert("Tarefa criada!");
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert("Erro: " + error.message);
    }
  }

  // Cores
  const getStatusColor = (status) => {
    switch(status) {
      case 'concluido': return '#dcfce7';
      case 'em_curso': return '#dbeafe';
      default: return '#f3f4f6';
    }
  };

  const getPriorityColor = (prio) => {
      switch(prio) {
          case 'urgente': return '#fee2e2'; 
          case 'alta': return '#ffedd5';    
          case 'baixa': return '#f1f5f9';   
          default: return '#e0f2fe';        
      }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>✅ Minhas Tarefas</h1>
        <button className="btn-primary" onClick={handleNovo}>+ Nova Tarefa</button>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="filters-container">
        <input 
            type="text" 
            placeholder="🔍 Procurar tarefa..." 
            className="search-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
        />
        
        <select className="filter-select" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="">Todos os Clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.marca}</option>)}
        </select>

        <select className="filter-select" value={filtroProjeto} onChange={(e) => setFiltroProjeto(e.target.value)}>
            <option value="">Todos os Projetos</option>
            {projetosList.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
        </select>

        {/* CHECKBOX MOSTRAR ARQUIVADOS */}
        <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem'}}>
            <input 
                type="checkbox" 
                checked={mostrarConcluidos}
                onChange={(e) => setMostrarConcluidos(e.target.checked)}
                style={{width: '18px', height: '18px'}}
            />
            Arquivados
        </label>

        {(busca || filtroCliente || filtroProjeto) && (
            <button className="btn-clear" onClick={() => {
                setBusca("");
                setFiltroCliente("");
                setFiltroProjeto("");
            }}>
                Limpar ✖
            </button>
        )}
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tarefa</th>
              <th>Atividade / Projeto</th>
              <th>Responsável</th>
              <th>Prioridade</th>
              <th>Estado</th>
              <th style={{textAlign: 'center'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {/* USAMOS A LISTA FILTRADA AQUI */}
            {tarefasFiltradas.length > 0 ? (
                tarefasFiltradas.map((t) => (
                <tr key={t.id}>
                    <td style={{ fontWeight: "bold", color: "#2563eb" }}>
                        {t.titulo}
                        {t.data_limite && <div style={{fontSize: '0.75rem', color: '#dc2626'}}>Prazo: {t.data_limite}</div>}
                    </td>
                    <td>
                        {t.atividades?.titulo || "N/A"}
                        <div style={{fontSize: '0.8rem', color: '#666'}}>
                            {t.atividades?.projetos?.titulo} • {t.atividades?.projetos?.clientes?.marca}
                        </div>
                    </td>
                    <td>{t.profiles?.nome || t.profiles?.email || "N/A"}</td>
                    <td>
                        <span className="badge" style={{backgroundColor: getPriorityColor(t.prioridade), color: '#334151'}}>
                            {t.prioridade}
                        </span>
                    </td>
                    <td>
                        <span className="badge" style={{backgroundColor: getStatusColor(t.estado), color: '#334151'}}>
                            {t.estado ? t.estado.replace('_', ' ') : 'Pendente'}
                        </span>
                    </td>
                    <td style={{textAlign: 'center'}}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button className="btn-small" onClick={() => handleView(t)}>👁️</button>
                            <button className="btn-small" onClick={() => handleEdit(t)}>✏️</button>
                        </div>
                    </td>
                </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                        {mostrarConcluidos 
                            ? "Nenhuma tarefa encontrada com esses filtros." 
                            : "Nenhuma tarefa ativa encontrada. (Marca 'Arquivados')"}
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
               <h3>{isViewOnly ? "Ver Tarefa" : (editId ? "Editar Tarefa" : "Nova Tarefa")}</h3>
               <button onClick={() => setShowModal(false)} className="close-btn">✖</button>
            </div>

            <div className="modal-body">
                <form onSubmit={handleSubmit} className="modal-form">
                    <fieldset disabled={isViewOnly} style={{border: 'none', padding: 0}}>
                        
                        <div className="form-row">
                            <div className="col" style={{flex: 2}}>
                                <label>Título da Tarefa *</label>
                                <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required />
                            </div>
                            <div className="col">
                                <label>Prioridade</label>
                                <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}>
                                    <option value="baixa">Baixa</option>
                                    <option value="normal">Normal</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente 🚨</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col">
                                <label>Atividade (Projeto) *</label>
                                <select value={form.atividade_id} onChange={e => setForm({...form, atividade_id: e.target.value})} required>
                                    <option value="">Selecione...</option>
                                    {atividades.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.titulo} (Proj: {a.projetos?.titulo})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col">
                                <label>Responsável</label>
                                <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.nome || s.email}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="col">
                                <label>Data Início</label>
                                <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} />
                            </div>
                            <div className="col">
                                <label>Prazo Limite</label>
                                <input type="date" value={form.data_limite} onChange={e => setForm({...form, data_limite: e.target.value})} />
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

                        <label>Descrição Detalhada</label>
                        <textarea rows="4" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />

                        {!isViewOnly && (
                            <button type="submit" className="btn-confirmar" style={{marginTop: '15px', width: '100%'}}>
                                {editId ? "Atualizar" : "Criar Tarefa"}
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