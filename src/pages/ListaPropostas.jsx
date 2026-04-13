import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import "./../styles/dashboard.css";

const Icons = {
  Edit: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  Archive: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"></polyline>
      <rect x="1" y="3" width="22" height="5" rx="1" ry="1"></rect>
      <line x1="10" y1="12" x2="14" y2="12"></line>
    </svg>
  ),
  Restore: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"></polyline>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>
  ),
  Copy: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  ),
  Trash: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  ),
};

export default function ListaPropostas() {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("em_analise");
  const [busca, setBusca] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [toastMessage, setToastMessage] = useState("");
  const [archiveModal, setArchiveModal] = useState({ show: false, proposta: null, action: "archive" });
  const [deleteModal, setDeleteModal] = useState({ show: false, proposta: null, confirmText: "" });

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2500);
  };

  useEffect(() => {
    loadPropostas();
  }, []);

  const normalizeText = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const getPropostaNumero = (proposta) => proposta.numero_proposta_str || `#${String(proposta.id).slice(0, 8)}`;

  const loadPropostas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("propostas_comerciais")
        .select(
          `
          id,
          numero_proposta_str,
          estado,
          created_at,
          plano_pagamentos,
          payload,
          empresa_consultora_id,
          cliente_id,
          tipo_projeto_id,
          programa_id
        `
        )
        .order("created_at", { ascending: false });

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

  const getPropostaSigla = (proposta) => {
    const siglaPayload = proposta.payload?.empresa_consultora?.sigla;
    const siglaEmpresa = proposta.payload?.proposta?.sigla_empresa;
    const fallbackNome = proposta.payload?.empresa_consultora?.nome || "PRO";
    return String(siglaPayload || siglaEmpresa || fallbackNome.substring(0, 3).toUpperCase() || "PRO")
      .trim()
      .toUpperCase();
  };

  const duplicatePayload = (proposta) => {
    const payload = proposalPayloadClone(proposta.payload || {});
    const today = new Date().toISOString().slice(0, 10);

    payload.proposta = {
      ...(payload.proposta || {}),
      db_id: "",
      numero: "",
      estado: "em_analise",
      data: today,
    };

    payload.orcamento = {
      ...(payload.orcamento || {}),
      plano_pagamentos: Array.isArray(proposta.plano_pagamentos) && proposta.plano_pagamentos.length > 0
        ? proposta.plano_pagamentos
        : payload.orcamento?.plano_pagamentos || [],
    };

    payload.plano_pagamentos = Array.isArray(proposta.plano_pagamentos) && proposta.plano_pagamentos.length > 0
      ? proposta.plano_pagamentos
      : payload.plano_pagamentos || [];

    return payload;
  };

  const proposalPayloadClone = (value) => {
    if (value === null || value === undefined) return {};
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return { ...value };
    }
  };

  const filteredPropostas = useMemo(() => {
    const search = normalizeText(busca);

    return propostas.filter((proposta) => {
      const matchesStatus = filtroEstado === "todos" || proposta.estado === filtroEstado;
      const matchesSearch = !search || [
        getPropostaNumero(proposta),
        getClienteNome(proposta),
        getTipoProjetoNome(proposta),
        getEstadoLabel(proposta.estado),
      ].some((value) => normalizeText(value).includes(search));

      return matchesStatus && matchesSearch;
    });
  }, [busca, filtroEstado, propostas]);

  const counts = useMemo(() => ({
    em_analise: propostas.filter((proposta) => proposta.estado === "em_analise").length,
    aprovada: propostas.filter((proposta) => proposta.estado === "aprovada").length,
    arquivada: propostas.filter((proposta) => proposta.estado === "arquivada").length,
    todas: propostas.length,
  }), [propostas]);

  const visiblePropostas = filteredPropostas;

  const handleEditar = (proposta) => {
    // TODO: Navigate to edit page with proposal data
    navigate(`/dashboard/propostas/${proposta.id}`, { state: { proposta } });
  };

  const handleDuplicate = async (proposta) => {
    if (!proposta?.id) return;

    try {
      setLoading(true);

      const sigla = getPropostaSigla(proposta);
      const ano = new Date().getFullYear();
      const basePayload = duplicatePayload(proposta);

      const { data: numerosExistentes, error: errorSeq } = await supabase
        .from("propostas_comerciais")
        .select("id")
        .ilike("numero_proposta_str", `${sigla}-${ano}-%`);

      if (errorSeq) throw errorSeq;

      const sequencial = String((numerosExistentes?.length || 0) + 1).padStart(3, "0");
      const numeroFinal = `${sigla}-${ano}-${sequencial}`;

      const { data, error } = await supabase
        .from("propostas_comerciais")
        .insert([
          {
            numero_proposta_str: numeroFinal,
            sigla_empresa: sigla,
            empresa_consultora_id: proposta.empresa_consultora_id || null,
            cliente_id: proposta.cliente_id || null,
            tipo_projeto_id: proposta.tipo_projeto_id || null,
            programa_id: proposta.programa_id || null,
            estado: "em_analise",
            plano_pagamentos: Array.isArray(proposta.plano_pagamentos) ? proposta.plano_pagamentos : basePayload.plano_pagamentos || [],
            payload: basePayload,
          },
        ])
        .select("id, numero_proposta_str")
        .single();

      if (error) throw error;

      await loadPropostas();
      showToast(`Proposta duplicada: ${data?.numero_proposta_str || numeroFinal}`);
    } catch (error) {
      console.error("Erro ao duplicar proposta:", error);
      showToast("Erro ao duplicar proposta");
    } finally {
      setLoading(false);
    }
  };

  const openArchiveModal = (proposta) => {
    setArchiveModal({
      show: true,
      proposta,
      action: proposta?.estado === "arquivada" ? "reactivate" : "archive",
    });
  };

  const closeArchiveModal = () => {
    setArchiveModal({ show: false, proposta: null, action: "archive" });
  };

  const confirmArchive = async () => {
    if (!archiveModal.proposta?.id) return;
    const nextEstado = archiveModal.action === "reactivate" ? "em_analise" : "arquivada";

    try {
      const { error } = await supabase
        .from("propostas_comerciais")
        .update({ estado: nextEstado })
        .eq("id", archiveModal.proposta.id);

      if (error) throw error;
      showToast(archiveModal.action === "reactivate" ? "Proposta reativada" : "Proposta arquivada");
      await loadPropostas();
      closeArchiveModal();
    } catch (error) {
      console.error("Erro ao atualizar estado da proposta:", error);
      showToast(archiveModal.action === "reactivate" ? "Erro ao reativar proposta" : "Erro ao arquivar proposta");
    }
  };

  const openDeleteModal = (proposta) => {
    setDeleteModal({ show: true, proposta, confirmText: "" });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ show: false, proposta: null, confirmText: "" });
  };

  const confirmPermanentDelete = async () => {
    if (String(deleteModal.confirmText || "").trim().toUpperCase() !== "APAGAR") {
      showToast('Escreve "APAGAR" para confirmar a eliminação.', "warning");
      return;
    }

    if (!deleteModal.proposta?.id) return;

    try {
      const { error } = await supabase
        .from("propostas_comerciais")
        .delete()
        .eq("id", deleteModal.proposta.id);

      if (error) throw error;

      setPropostas((previous) => previous.filter((item) => item.id !== deleteModal.proposta.id));
      showToast("Proposta apagada com sucesso.");
      closeDeleteModal();
    } catch (error) {
      console.error("Erro ao apagar proposta:", error);
      showToast("Erro ao apagar proposta");
    }
  };

  return (
    <div className="page-container propostas-list-page">
      <div className="card propostas-list-hero">
        <div>
          <div className="propostas-kicker">Gestão Comercial</div>
          <h1>Propostas Comerciais</h1>
          <p className="propostas-list-subtitle">
            Consulta, filtra e acompanha o estado das propostas com uma vista mais rápida e organizada.
          </p>
        </div>
        <div className="propostas-hero-actions">
          <button
            className="btn-primary"
            type="button"
            onClick={() => navigate("/dashboard/propostas/novo")}
          >
            + Nova Proposta
          </button>
        </div>
      </div>

      <div className="card propostas-list-panel">
        <div className="propostas-status-tabs">
          <div>
            <button
              type="button"
              className={`propostas-status-tab ${filtroEstado === "em_analise" ? "active" : ""}`}
              onClick={() => setFiltroEstado("em_analise")}
            >
              Em Análise <span>{counts.em_analise}</span>
            </button>
            <button
              type="button"
              className={`propostas-status-tab ${filtroEstado === "aprovada" ? "active" : ""}`}
              onClick={() => setFiltroEstado("aprovada")}
            >
              Aprovadas <span>{counts.aprovada}</span>
            </button>
            <button
              type="button"
              className={`propostas-status-tab ${filtroEstado === "arquivada" ? "active" : ""}`}
              onClick={() => setFiltroEstado("arquivada")}
            >
              Arquivadas <span>{counts.arquivada}</span>
            </button>
            <button
              type="button"
              className={`propostas-status-tab ${filtroEstado === "todos" ? "active" : ""}`}
              onClick={() => setFiltroEstado("todos")}
            >
              Todas <span>{counts.todas}</span>
            </button>
          </div>
        </div>

        <div className="propostas-toolbar">
          <div className="propostas-search">
            <span className="propostas-search-icon">⌕</span>
            <input
              type="text"
              placeholder="Procurar por ID, cliente ou tipo de projeto..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>

          <div className="propostas-view-toggle" role="group" aria-label="Modo de visualização">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={viewMode === "cards" ? "active" : ""}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "active" : ""}
            >
              Lista
            </button>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "20px 4px" }}>A carregar...</div>
        ) : visiblePropostas.length === 0 ? (
          <div className="propostas-empty-state">
            <p>Nenhuma proposta encontrada.</p>
            <span>
              Ajusta o filtro ou cria uma nova proposta para começar.
            </span>
            <button
              className="btn-primary"
              type="button"
              onClick={() => navigate("/dashboard/propostas/novo")}
            >
              + Nova Proposta
            </button>
          </div>
        ) : (
          viewMode === "cards" ? (
            <div className="propostas-cards-grid">
              {visiblePropostas.map((proposta) => (
                <article key={proposta.id} className="propostas-card">
                  <div className="propostas-card-top">
                    <span className="propostas-card-id">{getPropostaNumero(proposta)}</span>
                    <span className={getBadgeClass(proposta.estado)}>{getEstadoLabel(proposta.estado)}</span>
                  </div>

                  <h3>{getClienteNome(proposta)}</h3>
                  <p className="propostas-card-type">{getTipoProjetoNome(proposta)}</p>

                  <div className="propostas-card-meta">
                    <div>
                      <span>Data de criação</span>
                      <strong>{formatDatePt(proposta.created_at)}</strong>
                    </div>
                    <div>
                      <span>Proposta</span>
                      <strong>{getPropostaNumero(proposta)}</strong>
                    </div>
                  </div>

                  <div className="propostas-card-actions">
                    <button className="btn-small" type="button" onClick={() => handleEditar(proposta)} title="Editar">
                      <Icons.Edit /> Editar
                    </button>
                    <button className="btn-small" type="button" onClick={() => handleDuplicate(proposta)} title="Duplicar">
                      <Icons.Copy /> Duplicar
                    </button>
                    <button className="btn-small" type="button" onClick={() => openArchiveModal(proposta)} title={proposta.estado === "arquivada" ? "Reativar" : "Arquivar"}>
                      {proposta.estado === "arquivada" ? <Icons.Restore /> : <Icons.Archive />} {proposta.estado === "arquivada" ? "Reativar" : "Arquivar"}
                    </button>
                    <button className="btn-small" type="button" onClick={() => openDeleteModal(proposta)} title="Apagar">
                      <Icons.Trash /> Apagar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="propostas-table-wrapper">
              <table className="data-table propostas-table">
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
                  {visiblePropostas.map((proposta) => (
                    <tr key={proposta.id}>
                      <td>
                        <strong>{getPropostaNumero(proposta)}</strong>
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
                            <Icons.Edit />
                          </button>
                          <button
                            className="btn-small"
                            type="button"
                            onClick={() => handleDuplicate(proposta)}
                            title="Duplicar"
                          >
                            <Icons.Copy />
                          </button>
                          <button
                            className="btn-small"
                            type="button"
                            onClick={() => openArchiveModal(proposta)}
                            title={proposta.estado === "arquivada" ? "Reativar" : "Arquivar"}
                          >
                            {proposta.estado === "arquivada" ? <Icons.Restore /> : <Icons.Archive />}
                          </button>
                          <button
                            className="btn-small"
                            type="button"
                            onClick={() => openDeleteModal(proposta)}
                            title="Apagar"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {archiveModal.show && (
        <div className="modal-overlay">
          <div className="modal-content proposals-delete-modal">
            <div className="modal-header">
              <h3>{archiveModal.action === "reactivate" ? "Reativar proposta" : "Arquivar proposta"}</h3>
              <button type="button" className="close-btn" onClick={closeArchiveModal} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                {archiveModal.action === "reactivate" ? "Queres reativar a proposta" : "Queres arquivar a proposta"} <strong>{archiveModal.proposta ? getPropostaNumero(archiveModal.proposta) : "—"}</strong>?
              </p>
              <p className="muted" style={{ marginTop: 0 }}>
                {archiveModal.action === "reactivate" ? "A proposta volta para Em Análise." : "A proposta fica no arquivo e pode ser reativada mais tarde."}
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px" }}>
                <button type="button" className="btn-small" onClick={closeArchiveModal}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary" onClick={confirmArchive}>
                  {archiveModal.action === "reactivate" ? "Reativar" : "Arquivar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="modal-overlay">
          <div className="modal-content proposals-delete-modal">
            <div className="modal-header">
              <h3>Apagar proposta</h3>
              <button type="button" className="close-btn" onClick={closeDeleteModal} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                Vais apagar permanentemente a proposta <strong>{deleteModal.proposta ? getPropostaNumero(deleteModal.proposta) : "—"}</strong>.
              </p>
              <p className="muted" style={{ marginTop: 0 }}>
                Esta ação não pode ser revertida. Escreve <strong>APAGAR</strong> para confirmar.
              </p>

              <div className="field">
                <label>Confirmação</label>
                <input
                  type="text"
                  value={deleteModal.confirmText}
                  onChange={(event) => setDeleteModal((previous) => ({ ...previous, confirmText: event.target.value }))}
                  placeholder="APAGAR"
                  autoComplete="off"
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px" }}>
                <button type="button" className="btn-small" onClick={closeDeleteModal}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary" onClick={confirmPermanentDelete}>
                  Apagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="toast-notification success">{toastMessage}</div>}
    </div>
  );
}
