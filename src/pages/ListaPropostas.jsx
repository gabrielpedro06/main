import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

export default function ListaPropostas() {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("em_analise");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2500);
  };

  useEffect(() => {
    loadPropostas();
  }, [filtroEstado]);

  const loadPropostas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("propostas_comerciais")
        .select(
          `
          id,
          numero_proposta_str,
          estado,
          created_at,
          payload,
          empresa_consultora_id,
          cliente_id,
          tipo_projeto_id,
          programa_id
        `
        )
        .order("created_at", { ascending: false });

      if (filtroEstado !== "todos") {
        query = query.eq("estado", filtroEstado);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar propostas:", error);
        showToast("Erro ao carregar propostas");
        setPropostas([]);
      } else {
        setPropostas(data || []);
      }
    } catch (error) {
      console.error("Erro:", error);
      setPropostas([]);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (estado) => {
    switch (estado) {
      case "em_analise":
        return "badge badge-warning";
      case "aprovada":
        return "badge badge-success";
      case "arquivada":
        return "badge badge-danger";
      default:
        return "badge";
    }
  };

  const formatDatePt = (isoDate) => {
    if (!isoDate) return "—";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("pt-PT", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      em_analise: "Em Análise",
      aprovada: "Aprovada",
      arquivada: "Arquivada",
    };
    return labels[estado] || estado;
  };

  const getClienteNome = (proposta) => {
    if (proposta.payload?.cliente?.nome) {
      return proposta.payload.cliente.nome;
    }
    return "—";
  };

  const getTipoProjetoNome = (proposta) => {
    if (proposta.payload?.tipo_projeto?.nome) {
      return proposta.payload.tipo_projeto.nome;
    }
    return "—";
  };

  const handleEditar = (proposta) => {
    // TODO: Navigate to edit page with proposal data
    navigate(`/dashboard/propostas/${proposta.id}`, { state: { proposta } });
  };

  const handleDuplicate = async (proposta) => {
    // TODO: Create duplicate of proposal
    showToast("Duplicação em desenvolvimento...");
  };

  const handleDelete = async (proposta) => {
    if (!window.confirm("Tem certeza que deseja arquivar esta proposta?")) return;

    try {
      const { error } = await supabase
        .from("propostas_comerciais")
        .update({ estado: "arquivada" })
        .eq("id", proposta.id);

      if (error) throw error;
      showToast("Proposta arquivada");
      await loadPropostas();
    } catch (error) {
      console.error("Erro ao arquivar:", error);
      showToast("Erro ao arquivar proposta");
    }
  };

  return (
    <div className="page-container">
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: "4px" }}>Propostas Comerciais</h1>
            <p className="muted" style={{ margin: 0 }}>
              Gerencie suas propostas comerciais
            </p>
          </div>
          <button
            className="btn-primary"
            type="button"
            onClick={() => navigate("/dashboard/propostas/novo")}
          >
            + Nova Proposta
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            className={`btn-soft ${filtroEstado === "em_analise" ? "btn-soft-active" : ""}`}
            onClick={() => setFiltroEstado("em_analise")}
          >
            Em Análise
          </button>
          <button
            className={`btn-soft ${filtroEstado === "aprovada" ? "btn-soft-active" : ""}`}
            onClick={() => setFiltroEstado("aprovada")}
          >
            Aprovadas
          </button>
          <button
            className={`btn-soft ${filtroEstado === "arquivada" ? "btn-soft-active" : ""}`}
            onClick={() => setFiltroEstado("arquivada")}
          >
            Arquivadas
          </button>
          <button
            className={`btn-soft ${filtroEstado === "todos" ? "btn-soft-active" : ""}`}
            onClick={() => setFiltroEstado("todos")}
          >
            Todas
          </button>
        </div>

        {loading ? (
          <div className="muted">A carregar...</div>
        ) : propostas.length === 0 ? (
          <div className="muted" style={{ textAlign: "center", padding: "40px" }}>
            <p>Nenhuma proposta encontrada</p>
            <button
              className="btn-primary"
              type="button"
              onClick={() => navigate("/dashboard/propostas/novo")}
              style={{ marginTop: "16px" }}
            >
              Criar Primeira Proposta
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Proposta</th>
                  <th>Cliente</th>
                  <th>Tipo de Projeto</th>
                  <th>Estado</th>
                  <th>Data de Criação</th>
                  <th style={{ width: "120px", textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {propostas.map((proposta) => (
                  <tr key={proposta.id}>
                    <td>
                      <strong>{proposta.numero_proposta_str || `#${proposta.numero_proposta}`}</strong>
                    </td>
                    <td>{getClienteNome(proposta)}</td>
                    <td>{getTipoProjetoNome(proposta)}</td>
                    <td>
                      <span className={getBadgeClass(proposta.estado)}>
                        {getEstadoLabel(proposta.estado)}
                      </span>
                    </td>
                    <td className="muted">{formatDatePt(proposta.created_at)}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          className="btn-small"
                          type="button"
                          onClick={() => handleEditar(proposta)}
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          className="btn-small"
                          type="button"
                          onClick={() => handleDuplicate(proposta)}
                          title="Duplicar"
                        >
                          ⧉
                        </button>
                        <button
                          className="btn-small"
                          type="button"
                          onClick={() => handleDelete(proposta)}
                          title="Arquivar"
                        >
                          ⊡
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toastMessage && <div className="toast-notification success">{toastMessage}</div>}
    </div>
  );
}
