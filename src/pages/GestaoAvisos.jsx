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
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Warning: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
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

// Formatador de números (ex: 1000 -> 1 000)
const formatNumber = (num) => {
  if (num === null || num === undefined || num === "") return "";
  return new Intl.NumberFormat("pt-PT").format(num);
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
  
  // Modais de Formulário
  const [avisoModalOpen, setAvisoModalOpen] = useState(false);
  const [programaModalOpen, setProgramaModalOpen] = useState(false);
  
  // Modal de Confirmação (Substitui o window.confirm)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const [editingAvisoId, setEditingAvisoId] = useState(null);
  const [editingProgramaId, setEditingProgramaId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [avisoFormData, setAvisoFormData] = useState({
    codigo: "",
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
    entidades_elegiveis: "", 
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
    [avisos]
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const hasOpenModal = avisoModalOpen || programaModalOpen || confirmModalOpen;
    const previousOverflow = document.body.style.overflow;
    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [avisoModalOpen, programaModalOpen, confirmModalOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [avisosRes, programasRes] = await Promise.all([
        supabase.from("avisos").select("*").order("codigo", { ascending: true }),
        supabase.from("programas_financiamento").select("*").order("codigo", { ascending: true }),
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
        fases: normalizeFases(aviso.fases),
        ativo: aviso.ativo !== false,
      });
      setEditingAvisoId(aviso.id);
    } else {
      setAvisoFormData({
        codigo: "",
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
        currentIndex === index ? { ...fase, [field]: value } : fase
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
              fases: normalizeFases(avisoFormData.fases),
              ativo: avisoFormData.ativo,
            },
          ])
          .select();

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

  const handleAvisoDelete = (id) => {
    setConfirmMessage("Tem a certeza que deseja apagar este aviso?");
    setConfirmAction(() => async () => {
      try {
        const { error } = await supabase.from("avisos").delete().eq("id", id);
        if (error) throw error;
        showNotification("Aviso apagado com sucesso");
        await loadData();
      } catch (error) {
        console.error("Erro ao apagar aviso:", error);
        showNotification("Erro ao apagar aviso", "error");
      } finally {
        setConfirmModalOpen(false);
      }
    });
    setConfirmModalOpen(true);
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
        entidades_elegiveis: programa.entidades_elegiveis || "", 
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
        entidades_elegiveis: "", 
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

  // Função dedicada para lidar com números formatados (em tempo real)
  const handleFormattedNumberChange = (e, field) => {
    // Remove tudo o que não for número
    const rawValue = e.target.value.replace(/\D/g, "");
    const numValue = rawValue === "" ? 0 : Number(rawValue);
    
    setProgramaFormData((prev) => ({
      ...prev,
      [field]: numValue,
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
        entidades_elegiveis: programaFormData.entidades_elegiveis || null,
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

  const handleProgramaDelete = (id) => {
    setConfirmMessage("Tem a certeza que deseja apagar este programa?");
    setConfirmAction(() => async () => {
      try {
        const { error } = await supabase.from("programas_financiamento").delete().eq("id", id);
        if (error) throw error;
        showNotification("Programa apagado com sucesso");
        await loadData();
      } catch (error) {
        console.error("Erro ao apagar programa:", error);
        showNotification("Erro ao apagar programa", "error");
      } finally {
        setConfirmModalOpen(false);
      }
    });
    setConfirmModalOpen(true);
  };

  const styles = {
    pageContainer: {
      padding: "20px",
      fontFamily: "inherit",
    },
    pageHeader: {
      background: "#ffffff", 
      padding: "24px 30px",
      borderRadius: "12px",
      border: "1px solid var(--color-borderColor)",
      marginBottom: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "15px",
      flexWrap: "wrap",
    },
    title: {
      margin: 0,
      color: "var(--color-textPrimary)",
      fontSize: "1.5rem",
      fontWeight: "700",
    },
    subtitle: {
      margin: "6px 0 0 0",
      color: "var(--color-textSecondary)",
      fontSize: "0.95rem",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
      marginBottom: "20px",
    },
    panel: {
      background: "#ffffff", 
      borderRadius: "16px",
      padding: "24px",
      border: "1px solid var(--color-borderColorLight, var(--wow-border))",
    },
    panelHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    panelTitle: {
      margin: 0,
      fontSize: "0.85rem",
      fontWeight: "800",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      color: "var(--color-textPrimary)",
    },
    primaryBtn: {
      background: "var(--color-btnPrimary)",
      color: "var(--color-textWhite)",
      border: "none",
      borderRadius: "8px",
      padding: "8px 16px",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
      boxShadow: "var(--color-btnPrimaryShadow, 0 4px 6px -1px rgba(0,0,0,0.1))",
    },
    cardItem: {
      background: "#ffffff", 
      padding: "20px",
      borderRadius: "12px",
      border: "1px solid var(--color-borderColorLight, var(--wow-border))",
      marginBottom: "12px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      transition: "transform 0.1s ease, box-shadow 0.1s ease",
    },
    cardCode: {
      fontWeight: "700",
      fontSize: "1.15rem", 
      color: "var(--color-textPrimary)",
      marginBottom: "4px",
    },
    cardName: {
      fontWeight: "500",
      fontSize: "0.8rem", 
      color: "var(--color-textSecondary)",
      marginBottom: "8px",
    },
    cardMeta: {
      fontSize: "0.85rem",
      color: "var(--color-textSecondary)",
    },
    actionBtnGroup: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    actionBtn: {
      background: "#ffffff",
      color: "var(--color-textSecondary)",
      border: "1px solid var(--color-borderColor)",
      borderRadius: "50%",
      width: "34px",
      height: "34px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: "0.8rem",
      background: "#ffffff",
      color: "var(--color-textSecondary)",
      padding: "4px 14px",
      borderRadius: "9999px",
      border: "1px solid var(--color-borderColor, var(--wow-border))",
      fontWeight: "500",
    },
    pillHighlight: {
      fontWeight: "700",
      color: "var(--color-textPrimary)",
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      border: "1px solid var(--color-borderColor)",
      borderRadius: "8px",
      fontFamily: "inherit",
      fontSize: "0.95rem",
      background: "var(--color-bgTertiary, #fff)",
      color: "var(--color-textPrimary)",
    },
    label: {
      display: "block",
      marginBottom: "6px",
      fontWeight: "600",
      fontSize: "0.9rem",
      color: "var(--color-textPrimary)",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },
    modalContent: {
      background: "var(--color-bgPrimary, #ffffff)",
      borderRadius: "16px",
      border: "1px solid var(--color-borderColor)",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      display: "flex",
      flexDirection: "column",
    },
  };

  return (
    <div style={styles.pageContainer}>
      {/* HEADER */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Programas & Avisos</h1>
          <p style={styles.subtitle}>Gerencie programas de financiamento e os seus avisos associados</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--color-textLight)" }}>
          A carregar...
        </div>
      ) : (
        <div style={styles.grid}>
          {/* ================= PROGRAMAS PANEL ================= */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Programas</h2>
              <button style={styles.primaryBtn} type="button" onClick={() => handleOpenProgramaModal()}>
                <Icons.Plus /> Novo
              </button>
            </div>

            {programas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-textLight)" }}>
                <p>Nenhum programa criado ainda</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", maxHeight: "650px", overflowY: "auto", paddingRight: "4px" }}>
                {programas.map((programa) => (
                  <div
                    key={programa.id}
                    style={{ ...styles.cardItem, opacity: programa.ativo ? 1 : 0.5 }}
                  >
                    <div style={{ flex: 1, paddingRight: "16px" }}>
                      <div style={styles.cardCode}>{programa.codigo}</div>
                      <div style={styles.cardName}>{programa.nome}</div>

                      <div style={styles.cardMeta}>
                        Incentivo: {formatNumber(programa.pct)}% 
                        {programa.investimento_minimo > 0 && ` · Mín: ${formatNumber(programa.investimento_minimo)} €`}
                        {programa.regiao && ` · Região: ${programa.regiao}`}
                      </div>

                      {programa.aviso_id && (
                        <div style={{ fontSize: "0.85rem", marginTop: "6px", color: "var(--color-btnPrimary)", fontWeight: 600 }}>
                          Aviso: {avisosById[programa.aviso_id]?.codigo || "—"}
                        </div>
                      )}
                    </div>
                    <div style={styles.actionBtnGroup}>
                      <button
                        style={styles.actionBtn}
                        type="button"
                        onClick={() => handleOpenProgramaModal(programa)}
                        title="Editar"
                        onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--color-btnPrimary)")}
                        onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--color-borderColor)")}
                      >
                        <Icons.Edit />
                      </button>
                      <button
                        style={styles.actionBtn}
                        type="button"
                        onClick={() => handleProgramaDelete(programa.id)}
                        title="Apagar"
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--wow-success, #ef4444)"; e.currentTarget.style.color = "var(--wow-success, #ef4444)" }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--color-borderColor)"; e.currentTarget.style.color = "var(--color-textSecondary)" }}
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= AVISOS PANEL ================= */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Avisos</h2>
              <button style={styles.primaryBtn} type="button" onClick={() => handleOpenAvisoModal()}>
                <Icons.Plus /> Novo
              </button>
            </div>

            {avisos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-textLight)" }}>
                <p>Nenhum aviso criado ainda</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", maxHeight: "650px", overflowY: "auto", paddingRight: "4px" }}>
                {avisos.map((aviso) => {
                  const fases = normalizeFases(aviso.fases);

                  return (
                    <div
                      key={aviso.id}
                      style={{ ...styles.cardItem, opacity: aviso.ativo ? 1 : 0.5 }}
                    >
                      <div style={{ flex: 1, paddingRight: "16px" }}>
                        <div style={styles.cardCode}>{aviso.codigo}</div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                          {fases.map((fase, i) => (
                            <div key={i} style={styles.pill}>
                              <span>{fase.nome}</span>
                              <span style={{ margin: "0 8px", opacity: 0.5 }}>→</span>
                              <span style={styles.pillHighlight}>{formatDatePt(fase.prazo)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={styles.actionBtnGroup}>
                        <button
                          style={styles.actionBtn}
                          type="button"
                          onClick={() => handleOpenAvisoModal(aviso)}
                          title="Editar"
                          onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--color-btnPrimary)")}
                          onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--color-borderColor)")}
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          style={styles.actionBtn}
                          type="button"
                          onClick={() => handleAvisoDelete(aviso.id)}
                          title="Apagar"
                          onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--wow-success, #ef4444)"; e.currentTarget.style.color = "var(--wow-success, #ef4444)" }}
                          onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--color-borderColor)"; e.currentTarget.style.color = "var(--color-textSecondary)" }}
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

      {/* MODAL PROGRAMA (AGORA MAIS LARGO E COM GRELHA PARA TEXTAREAS) */}
      {programaModalOpen && (
        <ModalPortal>
          <div style={styles.modalOverlay} onClick={handleCloseProgramaModal}>
            <div
              style={{ ...styles.modalContent, width: "1100px", maxWidth: "95vw", maxHeight: "90vh", overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--color-borderColorLight)" }}>
                <h3 style={{ margin: 0, color: "var(--color-textPrimary)" }}>{editingProgramaId ? "Editar Programa" : "Novo Programa"}</h3>
                <button
                  type="button"
                  onClick={handleCloseProgramaModal}
                  style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1.5rem", color: "var(--color-textLight)" }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: "24px", overflowY: "auto" }}>
                <form onSubmit={handleProgramaSubmit}>
                  
                  {/* LINHA 1: NOME / CÓDIGO / AVISO */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={styles.label}>Nome</label>
                      <input
                        type="text"
                        name="nome"
                        value={programaFormData.nome}
                        onChange={handleProgramaInputChange}
                        placeholder="ex. Compete 2030"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Código</label>
                      <input
                        type="text"
                        name="codigo"
                        value={programaFormData.codigo}
                        onChange={handleProgramaInputChange}
                        placeholder="ex. COMPETE-2025-10"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Aviso Relacionado</label>
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
                        style={styles.input}
                      >
                        <option value="">— Sem aviso —</option>
                        <option value="novo" style={{ fontWeight: "bold", color: "var(--color-btnPrimary)" }}>+ CRIAR NOVO AVISO</option>
                        {avisos.map((aviso) => (
                          <option key={aviso.id} value={aviso.id}>
                            {aviso.codigo} {aviso.nome ? `- ${aviso.nome}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* LINHA 2: DADOS FINANCEIROS & GEOGRÁFICOS */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    <div>
                      <label style={styles.label}>Incentivo (%)</label>
                      <input
                        type="text"
                        name="pct"
                        value={programaFormData.pct === 0 ? "" : formatNumber(programaFormData.pct)}
                        onChange={(e) => handleFormattedNumberChange(e, "pct")}
                        placeholder="0"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Tipo de Incentivo</label>
                      <select
                        name="tipo_incentivo"
                        value={programaFormData.tipo_incentivo}
                        onChange={handleProgramaInputChange}
                        style={styles.input}
                      >
                        {TIPO_INCENTIVO_OPTIONS.map((tipo) => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Área Geográfica</label>
                      <input
                        type="text"
                        name="area_geografica"
                        value={programaFormData.area_geografica}
                        onChange={handleProgramaInputChange}
                        placeholder="Área de aplicação..."
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Investimento Mínimo (€)</label>
                      <input
                        type="text" 
                        name="investimento_minimo"
                        value={programaFormData.investimento_minimo === 0 ? "" : formatNumber(programaFormData.investimento_minimo)}
                        onChange={(e) => handleFormattedNumberChange(e, "investimento_minimo")}
                        placeholder="0"
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {/* CAIXAS DE TEXTO EM GRELHA PARA REDUZIR SCROLL */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={styles.label}>Objetivos</label>
                      <textarea
                        name="objetivos"
                        value={programaFormData.objetivos}
                        onChange={handleProgramaInputChange}
                        placeholder="Objetivos do programa..."
                        rows="3"
                        style={{ ...styles.input, resize: "vertical" }}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Entidades Elegíveis</label>
                      <textarea
                        name="entidades_elegiveis"
                        value={programaFormData.entidades_elegiveis}
                        onChange={handleProgramaInputChange}
                        placeholder="Quais as entidades que se podem candidatar..."
                        rows="3"
                        style={{ ...styles.input, resize: "vertical" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={styles.label}>Ações Elegíveis</label>
                      <textarea
                        name="acoes_elegiveis"
                        value={programaFormData.acoes_elegiveis}
                        onChange={handleProgramaInputChange}
                        placeholder="Ações elegíveis..."
                        rows="3"
                        style={{ ...styles.input, resize: "vertical" }}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Condições Específicas</label>
                      <textarea
                        name="condicoes_especificas"
                        value={programaFormData.condicoes_especificas}
                        onChange={handleProgramaInputChange}
                        placeholder="Condições específicas..."
                        rows="3"
                        style={{ ...styles.input, resize: "vertical" }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label style={styles.label}>Descrição Completa</label>
                    <textarea
                      name="descricao"
                      value={programaFormData.descricao}
                      onChange={handleProgramaInputChange}
                      placeholder="Descrição detalhada do programa..."
                      rows="3"
                      style={{ ...styles.input, resize: "vertical" }}
                    />
                  </div>

                  <div style={{ marginBottom: "24px", width: "50%" }}>
                    <label style={styles.label}>Estado</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleProgramaInputChange({ target: { name: 'ativo', type: 'checkbox', checked: true } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
                          border: programaFormData.ativo ? "2px solid var(--color-btnPrimary)" : "1px solid var(--color-borderColor)",
                          background: programaFormData.ativo ? "var(--wow-primary-soft)" : "var(--color-bgPrimary)",
                          color: programaFormData.ativo ? "var(--color-btnPrimary)" : "var(--color-textSecondary)",
                          fontWeight: programaFormData.ativo ? "600" : "400",
                        }}
                      >
                        {programaFormData.ativo ? "✓" : ""} Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProgramaInputChange({ target: { name: 'ativo', type: 'checkbox', checked: false } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
                          border: !programaFormData.ativo ? "2px solid #ef4444" : "1px solid var(--color-borderColor)",
                          background: !programaFormData.ativo ? "#fee2e2" : "var(--color-bgPrimary)",
                          color: !programaFormData.ativo ? "#ef4444" : "var(--color-textSecondary)",
                          fontWeight: !programaFormData.ativo ? "600" : "400",
                        }}
                      >
                        {!programaFormData.ativo ? "✗" : ""} Inativo
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--color-borderColorLight)", paddingTop: "20px" }}>
                    <button
                      type="button"
                      onClick={handleCloseProgramaModal}
                      disabled={isSubmitting}
                      style={{ ...styles.primaryBtn, background: "transparent", border: "1px solid var(--color-borderColor)", color: "var(--color-textPrimary)", boxShadow: "none" }}
                    >
                      Cancelar
                    </button>
                    <button style={styles.primaryBtn} type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "A guardar..." : editingProgramaId ? "Atualizar Programa" : "Criar Programa"}
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
          <div style={styles.modalOverlay} onClick={handleCloseAvisoModal}>
            <div
              style={{ ...styles.modalContent, width: "650px", maxWidth: "90vw", maxHeight: "90vh", overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--color-borderColorLight)" }}>
                <h3 style={{ margin: 0, color: "var(--color-textPrimary)" }}>{editingAvisoId ? "Editar Aviso" : "Novo Aviso"}</h3>
                <button
                  type="button"
                  onClick={handleCloseAvisoModal}
                  style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1.5rem", color: "var(--color-textLight)" }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: "24px", overflowY: "auto" }}>
                <form onSubmit={handleAvisoSubmit}>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={styles.label}>Código do Aviso</label>
                    <input
                      type="text"
                      name="codigo"
                      value={avisoFormData.codigo}
                      onChange={handleAvisoInputChange}
                      placeholder="ex. ALGARVE-2025-36"
                      style={styles.input}
                    />
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <label style={{ ...styles.label, marginBottom: 0 }}>Fases / Prazos</label>
                      <button
                        type="button"
                        onClick={addAvisoFase}
                        style={{ ...styles.primaryBtn, background: "var(--wow-primary-soft)", color: "var(--color-btnPrimary)", padding: "4px 12px", boxShadow: "none", fontSize: "0.85rem" }}
                      >
                        <Icons.Plus /> Adicionar fase
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {normalizeFases(avisoFormData.fases).map((fase, index) => (
                        <div key={`${index}`} style={{ padding: "16px", border: "1px solid var(--color-borderColor)", borderRadius: "12px", background: "var(--color-bgSecondary)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: "12px", alignItems: "end" }}>
                            <div>
                              <label style={{ ...styles.label, fontSize: "0.85rem" }}>Nome da fase</label>
                              <input
                                type="text"
                                value={fase.nome}
                                onChange={(event) => updateAvisoFase(index, "nome", event.target.value)}
                                placeholder={`Fase ${index + 1}`}
                                style={styles.input}
                              />
                            </div>
                            <div>
                              <label style={{ ...styles.label, fontSize: "0.85rem" }}>Prazo</label>
                              <input
                                type="date"
                                value={fase.prazo}
                                onChange={(event) => updateAvisoFase(index, "prazo", event.target.value)}
                                style={styles.input}
                              />
                            </div>
                            <div>
                              <button
                                type="button"
                                style={{ ...styles.actionBtn, borderColor: "transparent", background: "transparent", width: "40px", height: "40px" }}
                                onClick={() => removeAvisoFase(index)}
                                disabled={normalizeFases(avisoFormData.fases).length === 1}
                                onMouseOver={(e) => { e.currentTarget.style.color = "#ef4444" }}
                                onMouseOut={(e) => { e.currentTarget.style.color = "var(--color-textSecondary)" }}
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: "30px" }}>
                    <label style={styles.label}>Estado</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleAvisoInputChange({ target: { name: 'ativo', type: 'checkbox', checked: true } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
                          border: avisoFormData.ativo ? "2px solid var(--color-btnPrimary)" : "1px solid var(--color-borderColor)",
                          background: avisoFormData.ativo ? "var(--wow-primary-soft)" : "var(--color-bgPrimary)",
                          color: avisoFormData.ativo ? "var(--color-btnPrimary)" : "var(--color-textSecondary)",
                          fontWeight: avisoFormData.ativo ? "600" : "400",
                        }}
                      >
                        {avisoFormData.ativo ? "✓" : ""} Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAvisoInputChange({ target: { name: 'ativo', type: 'checkbox', checked: false } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
                          border: !avisoFormData.ativo ? "2px solid #ef4444" : "1px solid var(--color-borderColor)",
                          background: !avisoFormData.ativo ? "#fee2e2" : "var(--color-bgPrimary)",
                          color: !avisoFormData.ativo ? "#ef4444" : "var(--color-textSecondary)",
                          fontWeight: !avisoFormData.ativo ? "600" : "400",
                        }}
                      >
                        {!avisoFormData.ativo ? "✗" : ""} Inativo
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--color-borderColorLight)", paddingTop: "20px" }}>
                    <button
                      type="button"
                      onClick={handleCloseAvisoModal}
                      disabled={isSubmitting}
                      style={{ ...styles.primaryBtn, background: "transparent", border: "1px solid var(--color-borderColor)", color: "var(--color-textPrimary)", boxShadow: "none" }}
                    >
                      Cancelar
                    </button>
                    <button style={styles.primaryBtn} type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "A guardar..." : editingAvisoId ? "Atualizar Aviso" : "Criar Aviso"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL DE CONFIRMAÇÃO GLOBAL */}
      {confirmModalOpen && (
        <ModalPortal>
          <div style={styles.modalOverlay} onClick={() => setConfirmModalOpen(false)}>
            <div
              style={{ ...styles.modalContent, width: "400px", maxWidth: "90vw", padding: "30px", textAlign: "center", alignItems: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "16px" }}>
                <Icons.Warning />
              </div>
              <h3 style={{ margin: "0 0 12px 0", color: "var(--color-textPrimary)", fontSize: "1.25rem" }}>Confirmar Ação</h3>
              <p style={{ margin: "0 0 24px 0", color: "var(--color-textSecondary)", lineHeight: "1.5" }}>
                {confirmMessage}
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", width: "100%" }}>
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(false)}
                  style={{ ...styles.primaryBtn, flex: 1, justifyContent: "center", background: "transparent", border: "1px solid var(--color-borderColor)", color: "var(--color-textPrimary)", boxShadow: "none" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmAction) confirmAction();
                  }}
                  style={{ ...styles.primaryBtn, flex: 1, justifyContent: "center", background: "#ef4444", boxShadow: "none" }}
                >
                  Apagar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* TOAST NOTIFICATIONS */}
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999, 
            background: notification.type === "error" ? "#ef4444" : "var(--color-btnPrimary)",
            color: "var(--color-textWhite)",
            padding: "14px 28px",
            borderRadius: "50px", 
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)",
            fontWeight: "600",
            animation: "fadeIn 0.3s ease-in-out",
            textAlign: "center",
            minWidth: "max-content",
          }}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}