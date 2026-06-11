import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";

const Icons = {
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Archive: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
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
  ),
  Briefcase: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#704214" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  CardIncentivo: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  CardUser: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  CardEye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
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

const CARD_TOP_COLORS = ["#ff4d6d", "#ff479c", "#704214", "#ffb703"];

export default function GestaoAvisos() {
  const [avisos, setAvisos] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ativos");
  
  const [programaModalOpen, setProgramaModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [avisoModalOpen, setAvisoModalOpen] = useState(false);
  const [editingAvisoId, setEditingAvisoId] = useState(null);
  const [avisoFormData, setAvisoFormData] = useState({ codigo: "", ativo: true });
  const [avisoFormFases, setAvisoFormFases] = useState([]);
  
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const [editingProgramaId, setEditingProgramaId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [criarNovoAvisoInline, setCriarNovoAvisoInline] = useState(false);
  const [novoAvisoCodigo, setNovoAvisoCodigo] = useState("");
  const [novoAvisoFases, setNovoAvisoFases] = useState([createBlankFase(0)]);

  const [programaFormData, setProgramaFormData] = useState({
    codigo: "",
    nome: "",
    pct: 0,
    tipo_incentivo: "fundo perdido (não reembolsável)",
    entidade_financiadora_id: "",
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

  const avisosById = useMemo(
    () => Object.fromEntries(avisos.map((aviso) => [String(aviso.id), aviso])),
    [avisos]
  );

  const clientesById = useMemo(
    () => Object.fromEntries(clientes.map((cliente) => [String(cliente.id), cliente])),
    [clientes]
  );

  const getAvisoFasesById = (avisoId) => {
    if (!avisoId) return [];
    return normalizeFases(avisosById[String(avisoId)]?.fases || []);
  };

  const getClientDisplayName = (client) => {
    if (!client) return "";
    const nome = client.marca?.trim() || "";
    const sigla = client.sigla?.trim() || "";
    if (nome && sigla) return `${nome} (${sigla})`;
    if (nome) return nome;
    if (sigla) return sigla;
    return "";
  };

  const organismos = useMemo(
    () => clientes.filter((cliente) => cliente.eh_organismo && cliente.ativo !== false),
    [clientes]
  );

  const filteredProgramas = useMemo(() => {
    return programas.filter((p) => {
      const matchesSearch = 
        p.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === "ativos") return matchesSearch && p.ativo === true;
      if (activeTab === "inativos") return matchesSearch && p.ativo === false;
      return matchesSearch;
    });
  }, [programas, searchQuery, activeTab]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const hasOpenModal = programaModalOpen || confirmModalOpen || avisoModalOpen;
    const previousOverflow = document.body.style.overflow;
    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [programaModalOpen, confirmModalOpen, avisoModalOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [avisosRes, programasRes, clientesRes] = await Promise.all([
        supabase.from("avisos").select("*").order("codigo", { ascending: true }),
        supabase.from("programas_financiamento").select("*").order("codigo", { ascending: true }),
        supabase.from("clientes").select("id, marca, sigla, eh_organismo, ativo").order("marca", { ascending: true }),
      ]);

      if (avisosRes.error) throw avisosRes.error;
      if (programasRes.error) throw programasRes.error;

      setAvisos(avisosRes.data || []);
      setProgramas(programasRes.data || []);
      setClientes(clientesRes.data || []);
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

  const addAvisoFaseInline = () => {
    setNovoAvisoFases((prev) => [...prev, createBlankFase(prev.length)]);
  };

  const updateAvisoFaseInline = (index, field, value) => {
    setNovoAvisoFases((prev) =>
      prev.map((fase, currentIndex) =>
        currentIndex === index ? { ...fase, [field]: value } : fase
      )
    );
  };

  const removeAvisoFaseInline = (index) => {
    setNovoAvisoFases((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length > 0 ? next : [createBlankFase(0)];
    });
  };

  const handleOpenProgramaModal = (programa = null, viewOnly = false) => {
    setCriarNovoAvisoInline(false);
    setNovoAvisoCodigo("");
    setNovoAvisoFases([createBlankFase(0)]);
    setIsViewOnly(viewOnly);

    if (programa) {
      setProgramaFormData({
        codigo: programa.codigo || "",
        nome: programa.nome || "",
        pct: Number(programa.pct || 0),
        tipo_incentivo: programa.tipo_incentivo || "fundo perdido (não reembolsável)",
        entidade_financiadora_id: programa.entidade_financiadora_id || "",
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
        entidade_financiadora_id: "",
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
    setIsViewOnly(false);
  };

  const handleOpenAvisoModal = (avisoId) => {
    const avisoSelecionado = avisosById[String(avisoId)];
    if (!avisoSelecionado) return;

    setEditingAvisoId(avisoSelecionado.id);
    setAvisoFormData({
      codigo: avisoSelecionado.codigo || "",
      ativo: avisoSelecionado.ativo !== false
    });
    setAvisoFormFases(normalizeFases(avisoSelecionado.fases || []));
    setAvisoModalOpen(true);
  };

  const handleCloseAvisoModal = () => {
    setAvisoModalOpen(false);
    setEditingAvisoId(null);
    setAvisoFormFases([]);
  };

  const handleAvisoSubmit = async (e) => {
    e.preventDefault();
    if (!avisoFormData.codigo.trim()) {
      showNotification("Código do aviso é obrigatório", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("avisos")
        .update({
          codigo: avisoFormData.codigo,
          fases: normalizeFases(avisoFormFases),
          ativo: avisoFormData.ativo
        })
        .eq("id", editingAvisoId);

      if (error) throw error;
      showNotification("Aviso e prazos atualizados com sucesso");
      handleCloseAvisoModal();
      await loadData();
    } catch (err) {
      console.error(err);
      showNotification("Erro ao atualizar aviso", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgramaInputChange = (e) => {
    if (isViewOnly) return;
    const { name, value, type, checked } = e.target;
    setProgramaFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleFormattedNumberChange = (e, field) => {
    if (isViewOnly) return;
    const rawValue = e.target.value.replace(/\D/g, "");
    const numValue = rawValue === "" ? 0 : Number(rawValue);
    setProgramaFormData((prev) => ({ ...prev, [field]: numValue }));
  };

  const handleProgramaSubmit = async (e) => {
    e.preventDefault();
    if (isViewOnly) return;

    if (!programaFormData.nome.trim()) {
      showNotification("Nome é obrigatório", "error");
      return;
    }
    if (!programaFormData.codigo.trim()) {
      showNotification("Sigla é obrigatório", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalAvisoId = programaFormData.aviso_id || null;

      if (criarNovoAvisoInline) {
        if (!novoAvisoCodigo.trim()) {
          showNotification("Código do novo aviso é obrigatório", "error");
          setIsSubmitting(false);
          return;
        }

        const { data: avisoData, error: avisoError } = await supabase
          .from("avisos")
          .insert([
            {
              codigo: novoAvisoCodigo,
              fases: normalizeFases(novoAvisoFases),
              ativo: true,
            },
          ])
          .select();

        if (avisoError) throw avisoError;
        if (avisoData && avisoData.length > 0) {
          finalAvisoId = avisoData[0].id;
        }
      }

      const dataToSave = {
        codigo: programaFormData.codigo,
        nome: programaFormData.nome,
        pct: programaFormData.pct,
        tipo_incentivo: programaFormData.tipo_incentivo,
        entidade_financiadora_id: programaFormData.entidade_financiadora_id || null,
        investimento_minimo: programaFormData.investimento_minimo,
        regiao: programaFormData.regiao || null,
        objetivos: programaFormData.objetivos || null,
        entidades_elegiveis: programaFormData.entidades_elegiveis || null,
        area_geografica: programaFormData.area_geografica || null,
        acoes_elegiveis: programaFormData.acoes_elegiveis || null,
        condicoes_specificas: programaFormData.condicoes_especificas || null,
        descricao: programaFormData.descricao || null,
        aviso_id: finalAvisoId,
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

  const handleProgramaArchive = (id) => {
    setConfirmMessage("Tem a certeza que deseja arquivar este programa? Ele será movido para os Inativos.");
    setConfirmAction(() => async () => {
      try {
        const { error } = await supabase
          .from("programas_financiamento")
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq("id", id);
          
        if (error) throw error;
        showNotification("Programa arquivado com sucesso");
        await loadData();
      } catch (error) {
        console.error("Erro ao arquivar programa:", error);
        showNotification("Erro ao arquivar programa", "error");
      } finally {
        setConfirmModalOpen(false);
      }
    });
    setConfirmModalOpen(true);
  };

  const styles = {
    pageContainer: { padding: "24px", background: "#fcfbfa", minHeight: "100vh" },
    headerWrapper: {
      background: "#ffffff", padding: "20px 28px", borderRadius: "14px", border: "1px solid #eef0f2",
      boxShadow: "0 4px 10px rgba(0,0,0,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"
    },
    headerLeft: { display: "flex", alignItems: "center", gap: "16px" },
    iconBox: {
      background: "#fff8f0", border: "1px solid #ffeacc", width: "46px", height: "46px", borderRadius: "10px",
      display: "flex", alignItems: "center", justifyContent: "center"
    },
    title: { margin: 0, color: "#1a2530", fontSize: "1.45rem", fontWeight: "800" },
    subtitle: { margin: "2px 0 0 0", color: "#7f8c8d", fontSize: "0.88rem" },
    headerActionBtn: {
      background: "#704214", color: "#ffffff", border: "none", borderRadius: "50px", padding: "12px 24px",
      display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.92rem", fontWeight: "700",
      cursor: "pointer", boxShadow: "0 4px 12px rgba(112, 66, 20, 0.2)", transition: "opacity 0.15s",
    },
    tabsContainer: { display: "flex", gap: "4px", paddingLeft: "8px", marginBottom: "-1px", position: "relative", zIndex: 2 },
    tabButton: (isActive) => ({
      background: isActive ? "#ffffff" : "#e4e7eb", color: isActive ? "#704214" : "#4a5568",
      border: "1px solid #eef0f2", borderBottom: isActive ? "1px solid #ffffff" : "1px solid #eef0f2",
      padding: "8px 20px", borderTopLeftRadius: "10px", borderTopRightRadius: "10px", fontSize: "0.88rem", fontWeight: "700",
      cursor: "pointer", transition: "all 0.15s"
    }),
    searchToolbar: {
      background: "#ffffff", padding: "12px 16px", borderRadius: "12px", border: "1px solid #eef0f2",
      boxShadow: "0 2px 6px rgba(0,0,0,0.01)", display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px"
    },
    searchContainer: { flex: 1, position: "relative", display: "flex", alignItems: "center" },
    searchIconWrapper: { position: "absolute", left: "14px", pointerEvents: "none", display: "flex", alignItems: "center" },
    searchInput: {
      width: "100%", padding: "11px 14px 11px 40px", border: "1px solid #cbd5e1", borderRadius: "8px",
      fontSize: "0.92rem", color: "#1e293b", outline: "none", transition: "border-color 0.15s",
    },
    toggleWrapper: { display: "flex", background: "#f1f3f5", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0" },
    toggleBtnActive: {
      background: "#ffffff", color: "#704214", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      padding: "6px 14px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: "700", cursor: "default"
    },
    toggleBtnInactive: { background: "none", border: "none", color: "#6c757d", padding: "6px 14px", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" },
    gridCards: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" },
    cardContainer: {
      background: "#ffffff", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)",
      border: "1px solid #eef0f2", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
    },
    cardBody: { padding: "20px 20px 76px 20px", flex: 1 },
    topBadge: { background: "#f1f3f5", color: "#6c757d", fontSize: "0.72rem", fontWeight: "700", padding: "4px 10px", borderRadius: "6px", display: "inline-block", marginBottom: "14px", letterSpacing: "0.5px", textTransform: "uppercase" },
    titleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "14px" },
    cardTitle: { fontSize: "1.25rem", fontWeight: "800", color: "#1a2530", margin: 0, lineHeight: "1.25" },
    initialsBadge: { background: "#fff8f0", border: "1px solid #ffeacc", color: "#b07d42", fontSize: "0.75rem", fontWeight: "800", padding: "3px 8px", borderRadius: "10px", whiteSpace: "nowrap" },
    infoLine: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", color: "#4a5568", marginBottom: "10px", lineHeight: "1.4" },
    textMuted: { color: "#a0aec0", fontStyle: "italic" },
    cardFooter: { position: "absolute", bottom: 0, left: 0, right: 0, height: "52px", borderTop: "1px solid #f0f2f5", background: "#fafbfc", display: "flex" },
    footerMainBtn: { flex: 1, background: "none", border: "none", borderRight: "1px solid #f0f2f5", color: "#704214", fontWeight: "700", fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" },
    footerIconBtn: { width: "52px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    modalContent: { background: "#ffffff", borderRadius: "16px", boxShadow: "0 24px 38px 3px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column" },
    sectionTitle: { fontSize: "0.95rem", fontWeight: "700", color: "#704214", margin: "24px 0 12px 0", paddingBottom: "6px", borderBottom: "2px solid #f1f5f9" },
    modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
    label: { display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: "600", color: "#4a5568" },
    input: { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.9rem", color: "#1e293b", outline: "none", boxSizing: "border-box" }
  };

  return (
    <div style={styles.pageContainer}>
      
      {/* 1. HEADER */}
      <div style={styles.headerWrapper}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBox}>
            <Icons.Briefcase />
          </div>
          <div>
            <h1 style={styles.title}>Programas & Avisos</h1>
            <p style={styles.subtitle}>Gestão de linhas de financiamento ativas e submissão de candidaturas</p>
          </div>
        </div>
        <button 
          style={styles.headerActionBtn} 
          type="button" 
          onClick={() => handleOpenProgramaModal(null, false)}
          onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
          onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
        >
          <Icons.Plus /> Novo Programa
        </button>
      </div>

      {/* 2. ABAS DE FILTRAGEM */}
      <div style={styles.tabsContainer}>
        <button 
          style={styles.tabButton(activeTab === "ativos")} 
          onClick={() => setActiveTab("ativos")}
        >
          Ativos ({programas.filter(p => p.ativo).length})
        </button>
        <button 
          style={styles.tabButton(activeTab === "inativos")} 
          onClick={() => setActiveTab("inativos")}
        >
          Inativos ({programas.filter(p => !p.ativo).length})
        </button>
      </div>

      {/* 3. BARRA DE FERRAMENTAS */}
      <div style={styles.searchToolbar}>
        <div style={styles.searchContainer}>
          <div style={styles.searchIconWrapper}>
            <Icons.Search />
          </div>
          <input 
            type="text"
            placeholder="Procurar por Programa, Sigla ou Código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            onFocus={(e) => e.currentTarget.style.borderColor = "#704214"}
            onBlur={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
          />
        </div>
        <div style={styles.toggleWrapper}>
          <div style={styles.toggleBtnActive}>Cards</div>
          <button type="button" style={styles.toggleBtnInactive} onClick={() => alert('Modo lista indisponível')}>Lista</button>
        </div>
      </div>

      {/* LISTAGEM DOS CARDS */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#7f8c8d" }}>A carregar programas...</div>
      ) : filteredProgramas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "12px", border: "1px solid #eef0f2" }}>
          <p style={{ color: "#7f8c8d", margin: 0 }}>Nenhum programa corresponde aos critérios selecionados.</p>
        </div>
      ) : (
        <div style={styles.gridCards}>
          {filteredProgramas.map((programa, index) => {
            const topColor = CARD_TOP_COLORS[index % CARD_TOP_COLORS.length];
            const fasesDoAviso = getAvisoFasesById(programa.aviso_id);

            return (
              <div 
                key={programa.id} 
                style={{ 
                  ...styles.cardContainer, 
                  borderTop: `5px solid ${topColor}`,
                  opacity: programa.ativo ? 1 : 0.6 
                }}
              >
                <div style={styles.cardBody}>
                  <div style={styles.topBadge}>{programa.tipo_incentivo || "Geral"}</div>

                  <div style={styles.titleRow}>
                    <h2 style={styles.cardTitle}>{programa.nome}</h2>
                    <span style={styles.initialsBadge}>{programa.codigo}</span>
                  </div>

                  {/* ALTERAÇÃO: Secção do Aviso movida para aqui (logo a seguir ao Nome do Programa) */}
                  {programa.aviso_id && (
                    <div style={{ marginTop: "4px", marginBottom: "16px", padding: "10px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                          Aviso: <span style={{ color: "#704214" }}>{avisosById[programa.aviso_id]?.codigo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenAvisoModal(programa.aviso_id)}
                          style={{ background: "none", border: "none", color: "#704214", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                        >
                          Gerir Aviso
                        </button>
                      </div>
                      {fasesDoAviso.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {fasesDoAviso.map((fase, idx) => (
                            <span key={idx} style={{ background: "#ffffff", padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", border: "1px solid #e2e8f0", color: "#334155" }}>
                              {fase.nome}: <strong>{formatDatePt(fase.prazo)}</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ ...styles.textMuted, fontSize: "0.72rem" }}>Sem fases configuradas</span>
                      )}
                    </div>
                  )}

                  <div style={styles.infoLine}>
                    <span style={{ display: "flex" }}><Icons.CardIncentivo /></span>
                    <span>
                      Incentivo: <strong style={{ color: "#2a9d8f" }}>{formatNumber(programa.pct)}%</strong>
                      {programa.investimento_minimo > 0 && (
                        <> · Mín: <span style={{ color: "#0077b6", fontWeight: "600" }}>{formatNumber(programa.investimento_minimo)} €</span></>
                      )}
                    </span>
                  </div>

                  {/* REMOVIDO: A linha da Área Geográfica (referente à imagem image_113173.png) foi completamente removida daqui */}

                  <div style={styles.infoLine}>
                    <span style={{ display: "flex" }}><Icons.CardUser /></span>
                    {programa.entidade_financiadora_id ? (
                      <span>{getClientDisplayName(clientesById[String(programa.entidade_financiadora_id)])}</span>
                    ) : (
                      <span style={styles.textMuted}>Sem entidade financiadora</span>
                    )}
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <button 
                    style={styles.footerMainBtn} 
                    type="button"
                    onClick={() => handleOpenProgramaModal(programa, true)}
                    onMouseOver={(e) => e.currentTarget.style.background = "#f4f1ee"}
                    onMouseOut={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ display: "flex" }}><Icons.CardEye /></span> Ver Detalhes
                  </button>
                  <button 
                    style={{ ...styles.footerIconBtn, borderRight: "1px solid #f0f2f5" }} 
                    type="button"
                    title="Editar Programa"
                    onClick={() => handleOpenProgramaModal(programa, false)}
                    onMouseOver={(e) => e.currentTarget.style.background = "#fffbeb"}
                    onMouseOut={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ color: "#f39c12", display: "flex" }}><Icons.Edit /></span>
                  </button>
                  <button 
                    style={styles.footerIconBtn} 
                    type="button"
                    title="Arquivar (Mover para Inativos)"
                    onClick={() => handleProgramaArchive(programa.id)}
                    onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
                    onMouseOut={(e) => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ color: "#64748b", display: "flex" }}><Icons.Archive /></span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PROGRAMA */}
      {programaModalOpen && (
        <ModalPortal>
          <div style={styles.modalOverlay} onClick={handleCloseProgramaModal}>
            <div
              style={{ ...styles.modalContent, width: "1100px", maxWidth: "95vw", maxHeight: "90vh", overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ margin: 0, color: "#1e293b" }}>
                  {isViewOnly ? "Detalhes do Programa de Financiamento" : editingProgramaId ? "Editar Programa de Financiamento" : "Novo Programa de Financiamento"}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseProgramaModal}
                  style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1.5rem", color: "#94a3b8" }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: "24px", overflowY: "auto" }}>
                <form onSubmit={handleProgramaSubmit}>
                  
                  <div style={styles.sectionTitle}>Identificação Geral</div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={styles.label}>Nome do Programa</label>
                      <input
                        type="text"
                        name="nome"
                        disabled={isViewOnly}
                        value={programaFormData.nome}
                        onChange={handleProgramaInputChange}
                        placeholder="ex. Compete 2030"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Sigla / Código</label>
                      <input
                        type="text"
                        name="codigo"
                        disabled={isViewOnly}
                        value={programaFormData.codigo}
                        onChange={handleProgramaInputChange}
                        placeholder="ex. COMPETE-2025-10"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Entidade Financiadora</label>
                      <select
                        name="entidade_financiadora_id"
                        disabled={isViewOnly}
                        value={programaFormData.entidade_financiadora_id}
                        onChange={handleProgramaInputChange}
                        style={styles.input}
                      >
                        <option value="">— Selecionar organismo —</option>
                        {organismos.map((organismo) => (
                          <option key={organismo.id} value={organismo.id}>{getClientDisplayName(organismo) || organismo.marca}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={styles.sectionTitle}>Condições Financeiras & Geográficas</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={styles.label}>Incentivo (%)</label>
                      <input
                        type="text"
                        name="pct"
                        disabled={isViewOnly}
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
                        disabled={isViewOnly}
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
                      <label style={styles.label}>Investimento Mínimo (€)</label>
                      <input
                        type="text" 
                        name="investimento_minimo"
                        disabled={isViewOnly}
                        value={programaFormData.investimento_minimo === 0 ? "" : formatNumber(programaFormData.investimento_minimo)}
                        onChange={(e) => handleFormattedNumberChange(e, "investimento_minimo")}
                        placeholder="0"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Área Geográfica</label>
                      <input
                        type="text"
                        name="area_geografica"
                        disabled={isViewOnly}
                        value={programaFormData.area_geografica}
                        onChange={handleProgramaInputChange}
                        placeholder="Área de aplicação..."
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.sectionTitle}>Aviso Associado</div>
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                    {!criarNovoAvisoInline ? (
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <label style={styles.label}>Selecionar Aviso Existente</label>
                          <select
                            name="aviso_id"
                            disabled={isViewOnly}
                            value={programaFormData.aviso_id}
                            onChange={handleProgramaInputChange}
                            style={styles.input}
                          >
                            <option value="">— Sem aviso associado —</option>
                            {avisos.map((aviso) => (
                              <option key={aviso.id} value={aviso.id}>
                                {aviso.codigo}
                              </option>
                            ))}
                          </select>
                        </div>
                        {!editingProgramaId && !isViewOnly && (
                          <button
                            type="button"
                            onClick={() => setCriarNovoAvisoInline(true)}
                            style={{ ...styles.headerActionBtn, background: "#f0f2f5", color: "#704214", boxShadow: "none", height: "42px", padding: "0 16px", borderRadius: "8px" }}
                          >
                            <Icons.Plus /> Criar Novo Aviso de Raiz
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b" }}>A Configurar Novo Aviso Interno</h4>
                          <button
                            type="button"
                            onClick={() => setCriarNovoAvisoInline(false)}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
                          >
                            Cancelar e escolher existente
                          </button>
                        </div>
                        
                        <div style={{ marginBottom: "16px" }}>
                          <label style={styles.label}>Código do Novo Aviso</label>
                          <input
                            type="text"
                            value={novoAvisoCodigo}
                            onChange={(e) => setNovoAvisoCodigo(e.target.value)}
                            placeholder="ex. ALGARVE-2025-36"
                            style={styles.input}
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <label style={{ ...styles.label, marginBottom: 0 }}>Fases & Prazos do Novo Aviso</label>
                          <button
                            type="button"
                            onClick={addAvisoFaseInline}
                            style={{ ...styles.headerActionBtn, padding: "4px 10px", fontSize: "0.8rem", background: "#fff", border: "1px solid #cbd5e1", color: "#1e293b", boxShadow: "none", borderRadius: "6px" }}
                          >
                            + Adicionar Fase
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {novoAvisoFases.map((fase, idx) => (
                            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: "10px", alignItems: "center", background: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                              <input
                                type="text"
                                value={fase.nome}
                                onChange={(e) => updateAvisoFaseInline(idx, "nome", e.target.value)}
                                placeholder={`Fase ${idx + 1}`}
                                style={styles.input}
                              />
                              <input
                                type="date"
                                value={fase.prazo}
                                onChange={(e) => updateAvisoFaseInline(idx, "prazo", e.target.value)}
                                style={styles.input}
                              />
                              <button
                                type="button"
                                onClick={() => removeAvisoFaseInline(idx)}
                                disabled={novoAvisoFases.length === 1}
                                style={{ background: "none", border: "none", cursor: "pointer" }}
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.sectionTitle}>Textos de Enquadramento</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={styles.label}>Objetivos</label>
                      <textarea
                        name="objetivos"
                        disabled={isViewOnly}
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
                        disabled={isViewOnly}
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
                        disabled={isViewOnly}
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
                        disabled={isViewOnly}
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
                      disabled={isViewOnly}
                      value={programaFormData.descricao}
                      onChange={handleProgramaInputChange}
                      placeholder="Descrição detalhada do programa..."
                      rows="3"
                      style={{ ...styles.input, resize: "vertical" }}
                    />
                  </div>

                  <div style={{ marginBottom: "24px", width: "50%" }}>
                    <label style={styles.label}>Estado do Programa</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        disabled={isViewOnly}
                        onClick={() => handleProgramaInputChange({ target: { name: 'ativo', type: 'checkbox', checked: true } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "8px", cursor: isViewOnly ? "default" : "pointer", transition: "all 0.2s",
                          border: programaFormData.ativo ? "2px solid #704214" : "1px solid #cbd5e1",
                          background: programaFormData.ativo ? "#fff8f0" : "#ffffff",
                          color: programaFormData.ativo ? "#704214" : "#64748b",
                          fontWeight: programaFormData.ativo ? "600" : "400",
                        }}
                      >
                        {programaFormData.ativo ? "✓" : ""} Ativo
                      </button>
                      <button
                        type="button"
                        disabled={isViewOnly}
                        onClick={() => handleProgramaInputChange({ target: { name: 'ativo', type: 'checkbox', checked: false } })}
                        style={{
                          flex: 1, padding: "10px", borderRadius: "8px", cursor: isViewOnly ? "default" : "pointer", transition: "all 0.2s",
                          border: !programaFormData.ativo ? "2px solid #ef4444" : "1px solid #cbd5e1",
                          background: !programaFormData.ativo ? "#fee2e2" : "#ffffff",
                          color: !programaFormData.ativo ? "#ef4444" : "#64748b",
                          fontWeight: !programaFormData.ativo ? "600" : "400",
                        }}
                      >
                        {!programaFormData.ativo ? "✗" : ""} Inativo
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                    <button
                      type="button"
                      onClick={handleCloseProgramaModal}
                      disabled={isSubmitting}
                      style={{ ...styles.headerActionBtn, background: "transparent", border: "1px solid #cbd5e1", color: "#1e293b", boxShadow: "none" }}
                    >
                      {isViewOnly ? "Fechar" : "Cancelar"}
                    </button>
                    {!isViewOnly && (
                      <button style={styles.headerActionBtn} type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "A guardar..." : editingProgramaId ? "Atualizar Programa" : "Criar Programa"}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL EDITAR AVISOS INDEPENDENTE */}
      {avisoModalOpen && (
        <ModalPortal>
          <div style={styles.modalOverlay} onClick={handleCloseAvisoModal}>
            <div
              style={{ ...styles.modalContent, width: "700px", maxWidth: "90vw", maxHeight: "85vh", overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ margin: 0, color: "#1e293b" }}>Gerir Aviso Interno & Prazos</h3>
                <button
                  type="button"
                  onClick={handleCloseAvisoModal}
                  style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1.5rem", color: "#94a3b8" }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: "24px", overflowY: "auto" }}>
                <form onSubmit={handleAvisoSubmit}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={styles.label}>Código do Aviso</label>
                    <input
                      type="text"
                      value={avisoFormData.codigo}
                      onChange={(e) => setAvisoFormData(prev => ({ ...prev, codigo: e.target.value }))}
                      style={styles.input}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <label style={{ ...styles.label, marginBottom: 0 }}>Fases & Datas de Limite</label>
                    <button
                      type="button"
                      onClick={() => setAvisoFormFases(prev => [...prev, createBlankFase(prev.length)])}
                      style={{ ...styles.headerActionBtn, padding: "4px 10px", fontSize: "0.8rem", background: "#fff", border: "1px solid #cbd5e1", color: "#1e293b", boxShadow: "none", borderRadius: "6px" }}
                    >
                      + Adicionar Fase
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                    {avisoFormFases.map((fase, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: "10px", alignItems: "center", background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <input
                          type="text"
                          value={fase.nome}
                          onChange={(e) => setAvisoFormFases(prev => prev.map((f, i) => i === idx ? { ...f, nome: e.target.value } : f))}
                          style={styles.input}
                          placeholder="Nome da Fase"
                        />
                        <input
                          type="date"
                          value={fase.prazo}
                          onChange={(e) => setAvisoFormFases(prev => prev.map((f, i) => i === idx ? { ...f, prazo: e.target.value } : f))}
                          style={styles.input}
                        />
                        <button
                          type="button"
                          disabled={avisoFormFases.length === 1}
                          onClick={() => setAvisoFormFases(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                    <button
                      type="button"
                      onClick={handleCloseAvisoModal}
                      style={{ ...styles.headerActionBtn, background: "transparent", border: "1px solid #cbd5e1", color: "#1e293b", boxShadow: "none" }}
                    >
                      Cancelar
                    </button>
                    <button style={styles.headerActionBtn} type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "A guardar..." : "Gravar Alterações"}
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
              <h3 style={{ margin: "0 0 12px 0", color: "#1a2530", fontSize: "1.25rem" }}>Confirmar Alteração</h3>
              <p style={{ margin: "0 0 24px 0", color: "#7f8c8d", lineHeight: "1.5" }}>{confirmMessage}</p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", width: "100%" }}>
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(false)}
                  style={{ ...styles.headerActionBtn, flex: 1, justifyContent: "center", background: "transparent", border: "1px solid #cbd5e1", color: "#1a2530", boxShadow: "none" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirmAction) confirmAction(); }}
                  style={{ ...styles.headerActionBtn, flex: 1, justifyContent: "center", background: "#704214", boxShadow: "none" }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* TOAST NOTIFICATIONS */}
      {notification && (
        <ModalPortal>
          <div
            style={{
              position: "fixed", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 99999, 
              background: notification.type === "error" ? "#ef4444" : "#704214", color: "#ffffff",
              padding: "14px 28px", borderRadius: "50px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              fontWeight: "600", textAlign: "center", minWidth: "max-content",
            }}
          >
            {notification.message}
          </div>
        </ModalPortal>
      )}
    </div>
  );
}