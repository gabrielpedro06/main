import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";

const Icons = {
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6" />
      <path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" />
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

const createBlankFase = (index = 0) => ({
  nome: `Fase ${index + 1}`,
  prazo: "",
});

const normalizeFases = (value) => {
  if (!Array.isArray(value) || value.length === 0) return [createBlankFase(0)];

  return value.map((fase, index) => {
    if (typeof fase === "string") {
      return { nome: fase.trim() || `Fase ${index + 1}`, prazo: "" };
    }

    return {
      nome: String(fase?.nome || fase?.fase || `Fase ${index + 1}`),
      prazo: String(fase?.prazo || fase?.data || ""),
    };
  });
};

const formatDatePt = (isoDate) => {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(isoDate);
  return date.toLocaleDateString("pt-PT");
};

const TIPO_INCENTIVO_OPTIONS = [
  "fundo perdido (não reembolsável)",
  "subsídio",
  "empréstimo",
  "garantia",
  "taxa reduzida",
];

export default function GestaoAvisos() {
  const [avisos, setAvisos] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avisoModalOpen, setAvisoModalOpen] = useState(false);
  const [programaModalOpen, setProgramaModalOpen] = useState(false);
  const [editingAvisoId, setEditingAvisoId] = useState(null);
  const [editingProgramaId, setEditingProgramaId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [avisoFormData, setAvisoFormData] = useState({
    codigo: "",
    nome: "",
    descricao: "",
    fases: [createBlankFase(0)],
    ativo: true,
  });

  const [programaFormData, setProgramaFormData] = useState({
    codigo: "",
    nome: "",
    pct: 0,
    tipo_incentivo: "fundo perdido (não reembolsável)",
    investimento_minimo: 0,
    regiao: "",
    objetivos: "",
    area_geografica: "",
    acoes_elegiveis: "",
    condicoes_especificas: "",
    descricao: "",
    aviso_id: "",
    ativo: true,
  });

  const [novoAvisoEmPrograma, setNovoAvisoEmPrograma] = useState(false);

  const avisosById = useMemo(
    () => Object.fromEntries(avisos.map((aviso) => [String(aviso.id), aviso])),
    [avisos],
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const hasOpenModal = avisoModalOpen || programaModalOpen;
    const previousOverflow = document.body.style.overflow;
    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [avisoModalOpen, programaModalOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [avisosRes, programasRes] = await Promise.all([
        supabase.from("avisos").select("*").order("nome", { ascending: true }),
        supabase.from("programas_financiamento").select("*").order("nome", { ascending: true }),
      ]);

      if (avisosRes.error) throw avisosRes.error;
      if (programasRes.error) throw programasRes.error;

      setAvisos(avisosRes.data || []);
      setProgramas(programasRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showNotification("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ============ AVISOS ============

  const handleOpenAvisoModal = (aviso = null) => {
    if (aviso) {
      setAvisoFormData({
        codigo: aviso.codigo,
        nome: aviso.nome,
        descricao: aviso.descricao || "",
        fases: normalizeFases(aviso.fases),
        ativo: aviso.ativo !== false,
      });
      setEditingAvisoId(aviso.id);
    } else {
      setAvisoFormData({
        codigo: "",
        nome: "",
        descricao: "",
        fases: [createBlankFase(0)],
        ativo: true,
      });
      setEditingAvisoId(null);
    }
    setAvisoModalOpen(true);
  };

  const handleCloseAvisoModal = () => {
    setAvisoModalOpen(false);
    setEditingAvisoId(null);
    if (novoAvisoEmPrograma) {
      setNovoAvisoEmPrograma(false);
    }
  };

  const handleAvisoInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAvisoFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addAvisoFase = () => {
    setAvisoFormData((prev) => {
      const fases = normalizeFases(prev.fases);
      return { ...prev, fases: [...fases, createBlankFase(fases.length)] };
    });
  };

  const updateAvisoFase = (index, field, value) => {
    setAvisoFormData((prev) => ({
      ...prev,
      fases: normalizeFases(prev.fases).map((fase, currentIndex) =>
        currentIndex === index ? { ...fase, [field]: value } : fase,
      ),
    }));
  };

  const removeAvisoFase = (index) => {
    setAvisoFormData((prev) => {
      const nextFases = normalizeFases(prev.fases).filter((_, currentIndex) => currentIndex !== index);
      return { ...prev, fases: nextFases.length > 0 ? nextFases : [createBlankFase(0)] };
    });
  };

  const handleAvisoSubmit = async (e) => {
    e.preventDefault();

    if (!avisoFormData.nome.trim()) {
      showNotification("Nome é obrigatório", "error");
      return;
    }

    if (!avisoFormData.codigo.trim()) {
      showNotification("Código é obrigatório", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingAvisoId) {
        const { error } = await supabase
          .from("avisos")
          .update({
            codigo: avisoFormData.codigo,
            nome: avisoFormData.nome,
            descricao: avisoFormData.descricao || null,
            fases: normalizeFases(avisoFormData.fases),
            ativo: avisoFormData.ativo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAvisoId);

        if (error) throw error;
        showNotification("Aviso atualizado com sucesso");
      } else {
        const { data, error } = await supabase
          .from("avisos")
          .insert([
            {
              codigo: avisoFormData.codigo,
              nome: avisoFormData.nome,
              descricao: avisoFormData.descricao || null,
              fases: normalizeFases(avisoFormData.fases),
              ativo: avisoFormData.ativo,
            },
          ]).select();

        if (error) throw error;
        showNotification("Aviso criado com sucesso");

        if (novoAvisoEmPrograma && data && data.length > 0) {
          setProgramaFormData((prev) => ({ ...prev, aviso_id: data[0].id }));
        }
      }

      handleCloseAvisoModal();
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar aviso:", error);
      showNotification("Erro ao salvar aviso", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvisoDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja apagar este aviso?")) return;

    try {
      const { error } = await supabase.from("avisos").delete().eq("id", id);

      if (error) throw error;
      showNotification("Aviso apagado com sucesso");
      await loadData();
    } catch (error) {
      console.error("Erro ao apagar aviso:", error);
      showNotification("Erro ao apagar aviso", "error");
    }
  };

  // ============ PROGRAMAS ============

  const handleOpenProgramaModal = (programa = null) => {
    if (programa) {
      setProgramaFormData({
        codigo: programa.codigo || "",
        nome: programa.nome || "",
        pct: Number(programa.pct || 0),
        tipo_incentivo: programa.tipo_incentivo || "fundo perdido (não reembolsável)",
        investimento_minimo: Number(programa.investimento_minimo || 0),
        regiao: programa.regiao || "",
        objetivos: programa.objetivos || "",
        area_geografica: programa.area_geografica || "",
        acoes_elegiveis: programa.acoes_elegiveis || "",
        condicoes_especificas: programa.condicoes_especificas || "",
        descricao: programa.descricao || "",
        aviso_id: programa.aviso_id || "",
        ativo: programa.ativo !== false,
      });
      setEditingProgramaId(programa.id);
    } else {
      setProgramaFormData({
        codigo: "",
        nome: "",
        pct: 0,
        tipo_incentivo: "fundo perdido (não reembolsável)",
        investimento_minimo: 0,
        regiao: "",
        objetivos: "",
        area_geografica: "",
        acoes_elegiveis: "",
        condicoes_especificas: "",
        descricao: "",
        aviso_id: "",
        ativo: true,
      });
      setEditingProgramaId(null);
    }
    setProgramaModalOpen(true);
  };

  const handleCloseProgramaModal = () => {
    setProgramaModalOpen(false);
    setEditingProgramaId(null);
  };

  const handleProgramaInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProgramaFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleProgramaSubmit = async (e) => {
    e.preventDefault();

    if (!programaFormData.nome.trim()) {
      showNotification("Nome é obrigatório", "error");
      return;
    }

    if (!programaFormData.codigo.trim()) {
      showNotification("Código é obrigatório", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSave = {
        codigo: programaFormData.codigo,
        nome: programaFormData.nome,
        pct: programaFormData.pct,
        tipo_incentivo: programaFormData.tipo_incentivo,
        investimento_minimo: programaFormData.investimento_minimo,
        regiao: programaFormData.regiao || null,
        objetivos: programaFormData.objetivos || null,
        area_geografica: programaFormData.area_geografica || null,
        acoes_elegiveis: programaFormData.acoes_elegiveis || null,
        condicoes_especificas: programaFormData.condicoes_especificas || null,
        descricao: programaFormData.descricao || null,
        aviso_id: programaFormData.aviso_id || null,
        ativo: programaFormData.ativo,
      };

      if (editingProgramaId) {
        const { error } = await supabase
          .from("programas_financiamento")
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq("id", editingProgramaId);

        if (error) throw error;
        showNotification("Programa atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("programas_financiamento")
          .insert([dataToSave]);

        if (error) throw error;
        showNotification("Programa criado com sucesso");
      }

      handleCloseProgramaModal();
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar programa:", error);
      showNotification("Erro ao salvar programa", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgramaDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja apagar este programa?")) return;

    try {
      const { error } = await supabase.from("programas_financiamento").delete().eq("id", id);

      if (error) throw error;
      showNotification("Programa apagado com sucesso");
      await loadData();
    } catch (error) {
      console.error("Erro ao apagar programa:", error);
      showNotification("Erro ao apagar programa", "error");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{background: 'white', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem', fontWeight: 'bold' }}>Programas & Avisos</h1>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>
            Gerencie programas de financiamento e os seus avisos associados
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div className="muted">A carregar...</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          {/* PROGRAMAS PAINEL */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div className="section-heading" style={{ margin: 0 }}>Programas</div>
              <button className="btn-primary" type="button" onClick={() => handleOpenProgramaModal()}>
                <Icons.Plus /> Novo
              </button>
            </div>

            {programas.length === 0 ? (
              <div className="muted" style={{ textAlign: "center", padding: "40px 20px" }}>
                <p>Nenhum programa criado ainda</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px", maxHeight: "500px", overflowY: "auto" }}>
                {programas.map((programa) => (
                  <div
                    key={programa.id}
                    style={{
                      padding: "12px",
                      background: "#f8f9fa",
                      borderRadius: "6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      opacity: programa.ativo ? 1 : 0.6,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{programa.nome}</div>
                      <div className="muted" style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                        {programa.codigo} · {programa.pct}%
                        {programa.regiao && ` · ${programa.regiao}`}
                      </div>
                      {programa.aviso_id && (
                        <div className="muted" style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                          Aviso: {avisos.find((a) => a.id === programa.aviso_id)?.codigo || "—"}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {!programa.ativo && <span className="badge badge-danger" style={{ fontSize: "0.75rem" }}>Inativo</span>}
                      <button
                        className="btn-small"
                        type="button"
                        onClick={() => handleOpenProgramaModal(programa)}
                        title="Editar"
                      >
                        <Icons.Edit />
                      </button>
                      <button
                        className="btn-small"
                        type="button"
                        onClick={() => handleProgramaDelete(programa.id)}
                        title="Apagar"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AVISOS PAINEL */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div className="section-heading" style={{ margin: 0 }}>Avisos</div>
              <button className="btn-primary" type="button" onClick={() => handleOpenAvisoModal()}>
                <Icons.Plus /> Novo
              </button>
            </div>

            {avisos.length === 0 ? (
              <div className="muted" style={{ textAlign: "center", padding: "40px 20px" }}>
                <p>Nenhum aviso criado ainda</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px", maxHeight: "500px", overflowY: "auto" }}>
                {avisos.map((aviso) => {
                  const fases = normalizeFases(aviso.fases);
                  const primeiraFase = fases[0];

                  return (
                    <div
                      key={aviso.id}
                      style={{
                        padding: "10px 12px",
                        background: "#f8f9fa",
                        borderRadius: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        opacity: aviso.ativo ? 1 : 0.6,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.2 }}>{aviso.nome}</div>
                        <div className="muted" style={{ fontSize: "0.84rem", marginTop: "2px" }}>
                          {aviso.codigo}
                        </div>
                        <div className="muted" style={{ fontSize: "0.82rem", marginTop: "2px" }}>
                          {fases.length} fase{fases.length === 1 ? "" : "s"}
                          {primeiraFase ? ` · ${primeiraFase.nome}: ${formatDatePt(primeiraFase.prazo)}` : ""}
                          {fases.length > 1 ? ` (+${fases.length - 1})` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {!aviso.ativo && <span className="badge badge-danger" style={{ fontSize: "0.75rem" }}>Inativo</span>}
                        <button
                          className="btn-small"
                          type="button"
                          onClick={() => handleOpenAvisoModal(aviso)}
                          title="Editar"
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          className="btn-small"
                          type="button"
                          onClick={() => handleAvisoDelete(aviso.id)}
                          title="Apagar"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PROGRAMA */}
      {programaModalOpen && (
        <ModalPortal>
          <div
            className="modal-overlay"
            onClick={handleCloseProgramaModal}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div
              className="modal-content"
              style={{ width: "800px", maxWidth: "90vw", maxHeight: "90vh", overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>{editingProgramaId ? "Editar Programa" : "Novo Programa"}</h3>
                <button
                  className="close-btn"
                  type="button"
                  onClick={handleCloseProgramaModal}
                  style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1.5rem" }}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleProgramaSubmit}>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Nome
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={programaFormData.nome}
                      onChange={handleProgramaInputChange}
                      placeholder="ex. Compete 2030"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                        Código
                      </label>
                      <input
                        type="text"
                        name="codigo"
                        value={programaFormData.codigo}
                        onChange={handleProgramaInputChange}
                        placeholder="ex. COMPETE-2025-10"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                        Aviso Relacionado
                      </label>
                      <select
                        name="aviso_id"
                        value={programaFormData.aviso_id}
                        onChange={(e) => {
                          if (e.target.value === "novo") {
                            setNovoAvisoEmPrograma(true);
                            handleOpenAvisoModal();
                          } else {
                            handleProgramaInputChange(e);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                        }}
                      >
                        <option value="">— Sem aviso —</option>
                        <option value="novo" style={{ fontWeight: "bold", color: "#2563eb" }}>+ CRIAR NOVO AVISO</option>
                        {avisos.map((aviso) => (
                          <option key={aviso.id} value={aviso.id}>
                            {aviso.codigo} - {aviso.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                        Incentivo (%)
                      </label>
                      <input
                        type="number"
                        name="pct"
                        value={programaFormData.pct}
                        onChange={handleProgramaInputChange}
                        min="0"
                        max="100"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                        Tipo de Incentivo
                      </label>
                      <select
                        name="tipo_incentivo"
                        value={programaFormData.tipo_incentivo}
                        onChange={handleProgramaInputChange}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                        }}
                      >
                        {TIPO_INCENTIVO_OPTIONS.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                        Região
                      </label>
                      <input
                        type="text"
                        name="regiao"
                        value={programaFormData.regiao}
                        onChange={handleProgramaInputChange}
                        placeholder="ex. Algarve, Norte"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                        Investimento Mínimo (€)
                      </label>
                      <input
                        type="number"
                        name="investimento_minimo"
                        value={programaFormData.investimento_minimo}
                        onChange={handleProgramaInputChange}
                        min="0"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Área Geográfica
                    </label>
                    <input
                      type="text"
                      name="area_geografica"
                      value={programaFormData.area_geografica}
                      onChange={handleProgramaInputChange}
                      placeholder="Área de aplicação..."
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Objetivos
                    </label>
                    <textarea
                      name="objetivos"
                      value={programaFormData.objetivos}
                      onChange={handleProgramaInputChange}
                      placeholder="Objetivos do programa..."
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Ações Elegíveis
                    </label>
                    <textarea
                      name="acoes_elegiveis"
                      value={programaFormData.acoes_elegiveis}
                      onChange={handleProgramaInputChange}
                      placeholder="Ações elegíveis..."
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Condições Específicas
                    </label>
                    <textarea
                      name="condicoes_especificas"
                      value={programaFormData.condicoes_especificas}
                      onChange={handleProgramaInputChange}
                      placeholder="Condições específicas..."
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Descrição
                    </label>
                    <textarea
                      name="descricao"
                      value={programaFormData.descricao}
                      onChange={handleProgramaInputChange}
                      placeholder="Descrição do programa..."
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      Estado
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleProgramaInputChange({ target: { name: 'ativo', type: 'checkbox', checked: true } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s",
                          border: programaFormData.ativo ? "2px solid #16a34a" : "1px solid #e2e8f0",
                          background: programaFormData.ativo ? "#dcfce7" : "#f8fafc",
                          color: programaFormData.ativo ? "#16a34a" : "#64748b",
                          fontWeight: programaFormData.ativo ? "bold" : "normal",
                        }}
                      >
                        {programaFormData.ativo ? "✓" : ""} Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProgramaInputChange({ target: { name: 'ativo', type: 'checkbox', checked: false } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s",
                          border: !programaFormData.ativo ? "2px solid #ef4444" : "1px solid #e2e8f0",
                          background: !programaFormData.ativo ? "#fee2e2" : "#f8fafc",
                          color: !programaFormData.ativo ? "#ef4444" : "#64748b",
                          fontWeight: !programaFormData.ativo ? "bold" : "normal",
                        }}
                      >
                        {!programaFormData.ativo ? "✗" : ""} Inativo
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "A guardar..." : editingProgramaId ? "Atualizar" : "Criar"}
                    </button>
                    <button
                      className="btn-soft-cta"
                      type="button"
                      onClick={handleCloseProgramaModal}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL AVISO */}
      {avisoModalOpen && (
        <ModalPortal>
          <div
            className="modal-overlay"
            onClick={handleCloseAvisoModal}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div
              className="modal-content"
              style={{ width: "700px", maxWidth: "90vw", maxHeight: "90vh", overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 style={{ margin: 0 }}>{editingAvisoId ? "Editar Aviso" : "Novo Aviso"}</h3>
                <button
                  className="close-btn"
                  type="button"
                  onClick={handleCloseAvisoModal}
                  style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1.5rem" }}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleAvisoSubmit}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Código
                    </label>
                    <input
                      type="text"
                      name="codigo"
                      value={avisoFormData.codigo}
                      onChange={handleAvisoInputChange}
                      placeholder="ex. ALGARVE-2025-36"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Nome
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={avisoFormData.nome}
                      onChange={handleAvisoInputChange}
                      placeholder="ex. SICE – Qualificação das PME"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                      Descrição (opcional)
                    </label>
                    <textarea
                      name="descricao"
                      value={avisoFormData.descricao}
                      onChange={handleAvisoInputChange}
                      placeholder="Descrição do aviso..."
                      rows="4"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", gap: "10px" }}>
                      <label style={{ margin: 0, fontWeight: 500 }}>Fases / Prazos</label>
                      <button type="button" className="btn-small" onClick={addAvisoFase}>
                        <Icons.Plus /> Adicionar fase
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: "10px" }}>
                      {normalizeFases(avisoFormData.fases).map((fase, index) => (
                        <div key={`${index}`} style={{ padding: "12px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fafafa" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: "10px", alignItems: "end" }}>
                            <div>
                              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>Nome da fase</label>
                              <input
                                type="text"
                                value={fase.nome}
                                onChange={(event) => updateAvisoFase(index, "nome", event.target.value)}
                                placeholder={`Fase ${index + 1}`}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #ccc",
                                  borderRadius: "4px",
                                  fontFamily: "inherit",
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>Prazo</label>
                              <input
                                type="date"
                                value={fase.prazo}
                                onChange={(event) => updateAvisoFase(index, "prazo", event.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #ccc",
                                  borderRadius: "4px",
                                  fontFamily: "inherit",
                                }}
                              />
                            </div>
                            <div>
                              <button
                                type="button"
                                className="btn-small"
                                onClick={() => removeAvisoFase(index)}
                                disabled={normalizeFases(avisoFormData.fases).length === 1}
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      Estado
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleAvisoInputChange({ target: { name: 'ativo', type: 'checkbox', checked: true } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s",
                          border: avisoFormData.ativo ? "2px solid #16a34a" : "1px solid #e2e8f0",
                          background: avisoFormData.ativo ? "#dcfce7" : "#f8fafc",
                          color: avisoFormData.ativo ? "#16a34a" : "#64748b",
                          fontWeight: avisoFormData.ativo ? "bold" : "normal",
                        }}
                      >
                        {avisoFormData.ativo ? "✓" : ""} Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAvisoInputChange({ target: { name: 'ativo', type: 'checkbox', checked: false } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s",
                          border: !avisoFormData.ativo ? "2px solid #ef4444" : "1px solid #e2e8f0",
                          background: !avisoFormData.ativo ? "#fee2e2" : "#f8fafc",
                          color: !avisoFormData.ativo ? "#ef4444" : "#64748b",
                          fontWeight: !avisoFormData.ativo ? "bold" : "normal",
                        }}
                      >
                        {!avisoFormData.ativo ? "✗" : ""} Inativo
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "A guardar..." : editingAvisoId ? "Atualizar" : "Criar"}
                    </button>
                    <button
                      className="btn-soft-cta"
                      type="button"
                      onClick={handleCloseAvisoModal}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {notification && (
        <div
          className={`toast-notification ${notification.type}`}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
          }}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}
