import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import "../styles/programas.css";

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
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

Icons.Check = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
Icons.Close = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
Icons.Restore = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>;
Icons.Clock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
Icons.Doc = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>;
Icons.Search = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
Icons.Trash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;

const ModalPortal = ({ children }) => createPortal(children, document.body);

const createBlankFase = (index = 0) => ({
  nome: `Fase ${index + 1}`,
  prazo: "",
});

const normalizeFases = (value) => {
  if (!value) return [createBlankFase(0)];
  
  let parsedValue = value;

  // Tenta "descascar" a string as vezes que forem precisas (previne double-stringify da BD)
  while (typeof parsedValue === "string") {
    try {
      const nextValue = JSON.parse(parsedValue);
      // Evita loops infinitos se o parse devolver exatamente a mesma string
      if (typeof nextValue === "string" && nextValue === parsedValue) break;
      parsedValue = nextValue;
    } catch (e) {
      break; // Não é JSON, sai do loop e avança
    }
  }

  // Se no fim não for um Array, ou se estiver vazio, devolve branco
  if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
    return [createBlankFase(0)];
  }

  return parsedValue.map((fase, index) => {
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

const CARD_TOP_COLORS = ["#ff4d6d", "#ff479c", "#475569", "#ffb703"];

export default function GestaoAvisos() {
  const [avisos, setAvisos] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ativos");
  const [viewMode, setViewMode] = useState("cards");
  
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
  const [modoAdicaoAviso, setModoAdicaoAviso] = useState(false);
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
    avisos_ids: [],
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

  const getClientDisplayName = (client) => {
    if (!client) return "";
    const sigla = client.sigla?.trim() || "";
    const nome = client.marca?.trim() || "";
    return sigla || nome;
  };

  const getClientSelectName = (client) => {
    if (!client) return "";
    const nome = client.marca?.trim() || "";
    const sigla = client.sigla?.trim() || "";
    if (nome && sigla) return `${nome} (${sigla})`;
    return nome || sigla;
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
    setModoAdicaoAviso(false);
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
        avisos_ids: Array.isArray(programa.avisos_ids) ? programa.avisos_ids: (programa.avisos_ids ? [programa.avisos_ids] : []),
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
        avisos_ids: [],
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
    const idStr = String(avisoId);
    // Busca o aviso garantindo que compara como texto
    const avisoSelecionado = avisosById[idStr] || avisos.find(a => String(a.id) === idStr);
    
    if (!avisoSelecionado) {
      showNotification("Erro: Aviso não encontrado", "error");
      return;
    }

    setEditingAvisoId(avisoSelecionado.id);
    setAvisoFormData({
      codigo: avisoSelecionado.codigo || "",
      ativo: avisoSelecionado.ativo !== false
    });
    
    // Usamos a mesma função segura que "descasca" os dados!
    setAvisoFormFases(normalizeFases(avisoSelecionado.fases));
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
      let finalAvisosIds = [...(programaFormData.avisos_ids || [])];

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
          // Adiciona o novo ID à lista existente
          finalAvisosIds.push(avisoData[0].id); 
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
        condicoes_especificas: programaFormData.condicoes_especificas || null,
        descricao: programaFormData.descricao || null,
        avisos_ids: finalAvisosIds,
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

  const getPrazoInfo = (prazo) => {
    if (!prazo) return { tone: "none", label: "Sem data", days: null };
    const date = new Date(`${prazo}T23:59:59`);
    if (Number.isNaN(date.getTime())) return { tone: "none", label: String(prazo), days: null };
    const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
    if (days < 0) return { tone: "past", label: "Encerrada", days };
    if (days === 0) return { tone: "urgent", label: "Hoje", days };
    if (days <= 7) return { tone: "urgent", label: `${days} dia${days === 1 ? "" : "s"}`, days };
    if (days <= 30) return { tone: "soon", label: `${days} dias`, days };
    return { tone: "future", label: `${days} dias`, days };
  };

  const getProgramaAvisos = (programa) => (Array.isArray(programa.avisos_ids) ? programa.avisos_ids : (programa.avisos_ids ? [programa.avisos_ids] : []))
    .map((id) => avisosById[String(id)] || avisos.find((a) => String(a.id) === String(id)))
    .filter(Boolean);

  const getProximoPrazo = (programa) => {
    let best = null;
    getProgramaAvisos(programa).forEach((aviso) => {
      normalizeFases(aviso.fases).forEach((fase) => {
        const info = getPrazoInfo(fase.prazo);
        if (info.days === null || info.days < 0) return;
        if (!best || info.days < best.info.days) best = { aviso, fase, info };
      });
    });
    return best;
  };

  const proximosPrazos = useMemo(() => {
    const list = [];
    programas.filter((p) => p.ativo !== false).forEach((programa) => {
      getProgramaAvisos(programa).forEach((aviso) => {
        normalizeFases(aviso.fases).forEach((fase) => {
          const info = getPrazoInfo(fase.prazo);
          if (info.days === null || info.days < 0 || info.days > 60) return;
          list.push({ key: `${programa.id}-${aviso.id}-${fase.nome}-${fase.prazo}`, programa, aviso, fase, info });
        });
      });
    });
    return list.sort((a, b) => a.info.days - b.info.days).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programas, avisos]);

  const totalAtivos = programas.filter((p) => p.ativo).length;
  const totalInativos = programas.filter((p) => !p.ativo).length;
  const avisosEmUso = new Set(programas.filter((p) => p.ativo).flatMap((p) => (Array.isArray(p.avisos_ids) ? p.avisos_ids : [])).map(String)).size;

  const handleProgramaRestore = async (id) => {
    try {
      const { error } = await supabase
        .from("programas_financiamento")
        .update({ ativo: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      showNotification("Programa reativado com sucesso");
      await loadData();
    } catch (error) {
      console.error("Erro ao reativar programa:", error);
      showNotification("Erro ao reativar programa", "error");
    }
  };

  const renderFaseChip = (fase, idx, compact = false) => {
    const info = getPrazoInfo(fase.prazo);
    return (
      <span key={idx} className={`pa-fase is-${info.tone} ${compact ? "is-compact" : ""}`} title={`${fase.nome}: ${formatDatePt(fase.prazo)}`}>
        <i />
        <span className="pa-fase-name">{fase.nome}</span>
        <strong>{formatDatePt(fase.prazo)}</strong>
        {!compact && info.days !== null && info.days >= 0 && <em>{info.label}</em>}
      </span>
    );
  };

  const renderEstadoSeg = () => (
    <div className="pa-seg-field">
      <button
        type="button"
        disabled={isViewOnly}
        className={programaFormData.ativo ? "is-on is-yes" : ""}
        onClick={() => handleProgramaInputChange({ target: { name: 'ativo', type: 'checkbox', checked: true } })}
      >
        <Icons.Check /> Ativo
      </button>
      <button
        type="button"
        disabled={isViewOnly}
        className={!programaFormData.ativo ? "is-on is-no" : ""}
        onClick={() => handleProgramaInputChange({ target: { name: 'ativo', type: 'checkbox', checked: false } })}
      >
        <Icons.Close size={14} /> Inativo
      </button>
    </div>
  );

  const renderFaseEditor = (fases, onChange, onRemove, onAdd, addLabel = "+ Adicionar Fase") => (
    <div className="pa-fase-editor">
      {fases.map((fase, idx) => {
        const info = getPrazoInfo(fase.prazo);
        return (
          <div key={idx} className="pa-fase-row">
            <span className={`pa-fase-num is-${info.tone}`}>{idx + 1}</span>
            <input
              type="text"
              className="pa-input"
              value={fase.nome}
              onChange={(e) => onChange(idx, "nome", e.target.value)}
              placeholder={`Fase ${idx + 1}`}
            />
            <input
              type="date"
              className="pa-input"
              value={fase.prazo}
              onChange={(e) => onChange(idx, "prazo", e.target.value)}
            />
            <span className={`pa-fase-badge is-${info.tone}`}>{info.days !== null && info.days >= 0 ? info.label : info.tone === "past" ? "Encerrada" : "—"}</span>
            <button type="button" className="pa-icon-btn is-danger" onClick={() => onRemove(idx)} disabled={fases.length === 1} title="Remover fase">
              <Icons.Trash />
            </button>
          </div>
        );
      })}
      <button type="button" className="pa-add-line" onClick={onAdd}>{addLabel}</button>
    </div>
  );

  return (
    <div className="pa-page">

      {/* 1. HEADER */}
      <header className="pa-hero">
        <div className="pa-hero-bg"><span className="pa-orb pa-orb-a" /><span className="pa-orb pa-orb-b" /></div>
        <div className="pa-hero-row">
          <div className="pa-hero-main">
            <span className="pa-hero-icon"><Icons.Briefcase /></span>
            <div>
              <h1>Programas & Avisos</h1>
              <p>Gestão de linhas de financiamento ativas e submissão de candidaturas</p>
            </div>
          </div>
          <button className="pa-cta" type="button" onClick={() => handleOpenProgramaModal(null, false)}>
            <Icons.Plus /> Novo Programa
          </button>
        </div>
        <div className="pa-hero-tools">
          {/* 2. ABAS DE FILTRAGEM */}
          <div className="pa-scope" role="tablist">
            <button type="button" className={activeTab === "ativos" ? "is-on" : ""} onClick={() => setActiveTab("ativos")}>
              Ativos <em>{totalAtivos}</em>
            </button>
            <button type="button" className={activeTab === "inativos" ? "is-on" : ""} onClick={() => setActiveTab("inativos")}>
              Inativos <em>{totalInativos}</em>
            </button>
          </div>
          <div className="pa-hero-stats">
            <span className="pa-stat"><strong>{avisosEmUso}</strong> avisos em uso</span>
            <span className={`pa-stat ${proximosPrazos.some((p) => p.info.days <= 7) ? "is-alert" : ""}`}><strong>{proximosPrazos.filter((p) => p.info.days <= 30).length}</strong> prazos nos próximos 30 dias</span>
          </div>
        </div>
      </header>

      {/* 3. BARRA DE FERRAMENTAS */}
      <div className="pa-toolbar">
        <label className="pa-search">
          <Icons.Search />
          <input
            type="text"
            placeholder="Procurar por Programa, Sigla ou Código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? <button type="button" className="pa-search-clear" onClick={() => setSearchQuery("")} aria-label="Limpar"><Icons.Close size={12} /></button> : null}
        </label>
        <div className="pa-seg">
          <button type="button" className={viewMode === "cards" ? "is-on" : ""} onClick={() => setViewMode("cards")}>Cards</button>
          <button type="button" className={viewMode === "list" ? "is-on" : ""} onClick={() => setViewMode("list")}>Lista</button>
        </div>
      </div>

      {/* PRÓXIMOS PRAZOS */}
      {!loading && activeTab === "ativos" && proximosPrazos.length > 0 && (
        <section className="pa-deadlines">
          <div className="pa-deadlines-head">
            <span className="pa-deadlines-ico"><Icons.Clock /></span>
            <strong>Próximos prazos</strong>
            <span>nos próximos 60 dias</span>
          </div>
          <div className="pa-deadlines-list">
            {proximosPrazos.map((item) => (
              <button key={item.key} type="button" className={`pa-deadline is-${item.info.tone}`} onClick={() => handleOpenAvisoModal(item.aviso.id)}>
                <span className="pa-deadline-days"><strong>{item.info.days === 0 ? "Hoje" : item.info.days}</strong>{item.info.days === 0 ? null : <small>{item.info.days === 1 ? "dia" : "dias"}</small>}</span>
                <span className="pa-deadline-text">
                  <strong>{item.fase.nome}</strong>
                  <span>{item.aviso.codigo} · {item.programa.codigo || item.programa.nome}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* LISTAGEM DOS CARDS */}
      {loading ? (
        <div className="pa-loading"><span className="pa-spinner" /> A carregar programas...</div>
      ) : filteredProgramas.length === 0 ? (
        <div className="pa-empty">
          <span className="pa-empty-ico"><Icons.Briefcase /></span>
          <p>Nenhum programa corresponde aos critérios selecionados.</p>
          {searchQuery ? <button type="button" className="pa-btn is-soft" onClick={() => setSearchQuery("")}>Limpar pesquisa</button> : null}
        </div>
      ) : viewMode === "list" ? (
        <div className="pa-table-card">
          <div className="pa-table-wrap">
            <table className="pa-table">
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Entidade Financiadora</th>
                  <th>Incentivo (%)</th>
                  <th>Investimento Mínimo (€)</th>
                  <th>Avisos Associados</th>
                  <th>Próximo prazo</th>
                  <th style={{ textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredProgramas.map((programa, index) => {
                  const topColor = CARD_TOP_COLORS[index % CARD_TOP_COLORS.length];
                  const proximo = getProximoPrazo(programa);
                  const avisosDoPrograma = getProgramaAvisos(programa);
                  return (
                    <tr key={programa.id} className={programa.ativo ? "" : "is-off"} style={{ "--c": topColor }} onDoubleClick={() => handleOpenProgramaModal(programa, true)}>
                      <td>
                        <div className="pa-row-name">
                          <span className="pa-mono">{(programa.codigo || programa.nome || "?").slice(0, 3).toUpperCase()}</span>
                          <div>
                            <strong>{programa.nome}</strong>
                            {programa.codigo && <small>{programa.codigo}</small>}
                          </div>
                        </div>
                      </td>
                      <td>{programa.entidade_financiadora_id ? getClientDisplayName(clientesById[String(programa.entidade_financiadora_id)]) : <span className="pa-nil">—</span>}</td>
                      <td><span className="pa-pct">{formatNumber(programa.pct)}%</span></td>
                      <td>{programa.investimento_minimo > 0 ? `${formatNumber(programa.investimento_minimo)} €` : <span className="pa-nil">—</span>}</td>
                      <td>
                        <div className="pa-row-avisos">
                          {avisosDoPrograma.length === 0 ? <span className="pa-nil">—</span> : avisosDoPrograma.slice(0, 3).map((a) => <span key={a.id} className="pa-aviso-code">{a.codigo}</span>)}
                          {avisosDoPrograma.length > 3 && <span className="pa-aviso-more">+{avisosDoPrograma.length - 3}</span>}
                        </div>
                      </td>
                      <td>
                        {proximo ? (
                          <span className={`pa-next is-${proximo.info.tone}`}><i />{proximo.fase.nome} · {formatDatePt(proximo.fase.prazo)} <em>{proximo.info.label}</em></span>
                        ) : <span className="pa-nil">—</span>}
                      </td>
                      <td>
                        <div className="pa-row-actions">
                          <button type="button" className="pa-icon-btn" title="Ver Detalhes" onClick={() => handleOpenProgramaModal(programa, true)}><Icons.CardEye /></button>
                          <button type="button" className="pa-icon-btn is-edit" title="Editar Programa" onClick={() => handleOpenProgramaModal(programa, false)}><Icons.Edit /></button>
                          {programa.ativo ? (
                            <button type="button" className="pa-icon-btn is-danger" title="Arquivar (Mover para Inativos)" onClick={() => handleProgramaArchive(programa.id)}><Icons.Archive /></button>
                          ) : (
                            <button type="button" className="pa-icon-btn is-ok" title="Reativar programa" onClick={() => handleProgramaRestore(programa.id)}><Icons.Restore /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="pa-grid">
          {filteredProgramas.map((programa, index) => {
            const topColor = CARD_TOP_COLORS[index % CARD_TOP_COLORS.length];
            const avisosDoPrograma = getProgramaAvisos(programa);
            const pct = Math.max(0, Math.min(100, Number(programa.pct) || 0));

            return (
              <article
                key={programa.id}
                className={`pa-card ${programa.ativo ? "" : "is-off"}`}
                style={{ "--c": topColor, "--i": Math.min(index, 12) }}
                onDoubleClick={() => handleOpenProgramaModal(programa, true)}
              >
                <div className="pa-card-top">
                  <div className="pa-ring" style={{ "--p": pct }}>
                    <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /><circle cx="22" cy="22" r="18" className="pa-ring-fg" /></svg>
                    <span>{formatNumber(programa.pct)}<small>%</small></span>
                  </div>
                  <div className="pa-card-title">
                    {programa.codigo && <span className="pa-code">{programa.codigo}</span>}
                    <h2>{programa.nome}</h2>
                    {!programa.ativo && <span className="pa-badge-off">INATIVO</span>}
                  </div>
                </div>

                <div className="pa-card-info">
                  <div>
                    <Icons.CardIncentivo />
                    <span>
                      Incentivo: <strong className="is-green">{formatNumber(programa.pct)}%</strong>
                      {programa.investimento_minimo > 0 && (
                        <> · Mín: <strong className="is-blue">{formatNumber(programa.investimento_minimo)} €</strong></>
                      )}
                    </span>
                  </div>
                  <div>
                    <Icons.CardUser />
                    {programa.entidade_financiadora_id ? (
                      <span>{getClientDisplayName(clientesById[String(programa.entidade_financiadora_id)])}</span>
                    ) : (
                      <span className="pa-muted">Sem entidade financiadora</span>
                    )}
                  </div>
                </div>

                {avisosDoPrograma.length > 0 && (
                  <div className="pa-card-avisos">
                    {/* MOSTRA APENAS OS PRIMEIROS 2 AVISOS */}
                    {avisosDoPrograma.slice(0, 2).map((avisoObj) => {
                      const idString = String(avisoObj.id);
                      const fasesDoAviso = normalizeFases(avisoObj.fases);
                      return (
                        <div key={idString} className="pa-aviso">
                          <div className="pa-aviso-head">
                            <span className="pa-aviso-label">AVISO: <b>{avisoObj.codigo}</b></span>
                            <button
                              type="button"
                              className="pa-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAvisoModal(idString);
                              }}
                            >
                              Gerir
                            </button>
                          </div>
                          {fasesDoAviso.length > 0 && (
                            <div className="pa-fases">
                              {fasesDoAviso.map((fase, idx) => renderFaseChip(fase, idx, true))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* INDICADOR DE EXCESSO ("+ X avisos") */}
                    {avisosDoPrograma.length > 2 && (
                      <div className="pa-aviso-extra">
                        E mais {avisosDoPrograma.length - 2} aviso{avisosDoPrograma.length - 2 > 1 ? 's' : ''} associado{avisosDoPrograma.length - 2 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}

                <div className="pa-card-foot">
                  <button className="pa-card-main" type="button" onClick={() => handleOpenProgramaModal(programa, true)}>
                    <Icons.CardEye /> Ver Detalhes
                  </button>
                  <button className="pa-icon-btn is-edit" type="button" title="Editar Programa" onClick={() => handleOpenProgramaModal(programa, false)}>
                    <Icons.Edit />
                  </button>
                  {programa.ativo ? (
                    <button className="pa-icon-btn is-danger" type="button" title="Arquivar (Mover para Inativos)" onClick={() => handleProgramaArchive(programa.id)}>
                      <Icons.Archive />
                    </button>
                  ) : (
                    <button className="pa-icon-btn is-ok" type="button" title="Reativar programa" onClick={() => handleProgramaRestore(programa.id)}>
                      <Icons.Restore />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL PROGRAMA */}
      {programaModalOpen && (
        <ModalPortal>
          <div className="pa-overlay" onClick={handleCloseProgramaModal}>
            <div className="pa-modal is-wide" onClick={(e) => e.stopPropagation()}>
              <div className="pa-modal-head">
                <span className="pa-modal-ico"><Icons.Briefcase /></span>
                <div className="pa-modal-title">
                  <span>{isViewOnly ? "Detalhes" : editingProgramaId ? "Editar" : "Novo"}</span>
                  <h3>{isViewOnly ? "Detalhes do Programa de Financiamento" : editingProgramaId ? "Editar Programa de Financiamento" : "Novo Programa de Financiamento"}</h3>
                  {editingProgramaId && (programaFormData.codigo || programaFormData.nome) ? (
                    <div className="pa-modal-chips">
                      {programaFormData.codigo && <span>{programaFormData.codigo}</span>}
                      {programaFormData.pct > 0 && <span>{formatNumber(programaFormData.pct)}% incentivo</span>}
                      <span className={programaFormData.ativo ? "is-on" : "is-off"}>{programaFormData.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                  ) : null}
                </div>
                <button type="button" className="pa-modal-close" onClick={handleCloseProgramaModal} aria-label="Fechar"><Icons.Close /></button>
              </div>

              <form onSubmit={handleProgramaSubmit} className={`pa-modal-form ${isViewOnly ? "is-reading" : ""}`}>
                <div className="pa-modal-body">

                  <section className="pa-fcard">
                    <div className="pa-fcard-title"><span className="pa-fcard-ico"><Icons.Briefcase size={15} /></span> Identificação Geral</div>
                    <div className="pa-grid-form" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)" }}>
                      <div className="pa-field">
                        <label>Nome do Programa</label>
                        <input type="text" name="nome" className="pa-input" disabled={isViewOnly} value={programaFormData.nome} onChange={handleProgramaInputChange} placeholder="ex. Compete 2030" />
                      </div>
                      <div className="pa-field">
                        <label>Sigla / Código</label>
                        <input type="text" name="codigo" className="pa-input" disabled={isViewOnly} value={programaFormData.codigo} onChange={handleProgramaInputChange} placeholder="ex. COMPETE-2025-10" />
                      </div>
                      <div className="pa-field">
                        <label>Entidade Financiadora</label>
                        <select name="entidade_financiadora_id" className="pa-input" disabled={isViewOnly} value={programaFormData.entidade_financiadora_id} onChange={handleProgramaInputChange}>
                          <option value="">— Selecionar organismo —</option>
                          {organismos.map((organismo) => (
                            <option key={organismo.id} value={organismo.id}>
                              {getClientSelectName(organismo)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="pa-fcard">
                    <div className="pa-fcard-title"><span className="pa-fcard-ico is-green"><Icons.CardIncentivo /></span> Condições Financeiras & Geográficas</div>
                    <div className="pa-grid-form is-4">
                      <div className="pa-field">
                        <label>Incentivo (%)</label>
                        <div className="pa-input-suffix">
                          <input type="text" name="pct" className="pa-input" disabled={isViewOnly} value={programaFormData.pct === 0 ? "" : formatNumber(programaFormData.pct)} onChange={(e) => handleFormattedNumberChange(e, "pct")} placeholder="0" />
                          <span>%</span>
                        </div>
                      </div>
                      <div className="pa-field">
                        <label>Tipo de Incentivo</label>
                        <select name="tipo_incentivo" className="pa-input" disabled={isViewOnly} value={programaFormData.tipo_incentivo} onChange={handleProgramaInputChange}>
                          {TIPO_INCENTIVO_OPTIONS.map((tipo) => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                          ))}
                        </select>
                      </div>
                      <div className="pa-field">
                        <label>Investimento Mínimo (€)</label>
                        <div className="pa-input-suffix">
                          <input type="text" name="investimento_minimo" className="pa-input" disabled={isViewOnly} value={programaFormData.investimento_minimo === 0 ? "" : formatNumber(programaFormData.investimento_minimo)} onChange={(e) => handleFormattedNumberChange(e, "investimento_minimo")} placeholder="0" />
                          <span>€</span>
                        </div>
                      </div>
                      <div className="pa-field">
                        <label>Área Geográfica</label>
                        <input type="text" name="area_geografica" className="pa-input" disabled={isViewOnly} value={programaFormData.area_geografica} onChange={handleProgramaInputChange} placeholder="Área de aplicação..." />
                      </div>
                    </div>
                  </section>

                  <section className="pa-fcard">
                    <div className="pa-fcard-title">
                      <span className="pa-fcard-ico is-blue"><Icons.Clock /></span> Avisos Associados
                      <em className="pa-count">{(Array.isArray(programaFormData.avisos_ids) ? programaFormData.avisos_ids : []).length}</em>
                    </div>

                    {/* LISTA DE AVISOS JÁ SELECIONADOS */}
                    {(!Array.isArray(programaFormData.avisos_ids) || programaFormData.avisos_ids.length === 0) && !modoAdicaoAviso && !criarNovoAvisoInline && (
                      <div className="pa-inline-empty">Nenhum aviso associado a este programa.</div>
                    )}

                    {(Array.isArray(programaFormData.avisos_ids) ? programaFormData.avisos_ids : []).length > 0 && (
                      <div className="pa-avisos-edit">
                        {(Array.isArray(programaFormData.avisos_ids) ? programaFormData.avisos_ids : []).map(id => {
                          const idString = String(id);
                          const aviso = avisosById[idString] || avisos.find(a => String(a.id) === idString);
                          const fasesDoAviso = normalizeFases(aviso?.fases);

                          return (
                            <div key={idString} className="pa-aviso is-big">
                              <div className="pa-aviso-head">
                                <span className="pa-aviso-code">{aviso ? aviso.codigo : `Aviso Guardado`}</span>
                                {!isViewOnly && (
                                  <div className="pa-aviso-actions">
                                    <button type="button" title="Editar/Gerir este aviso" className="pa-icon-btn is-edit" onClick={() => handleOpenAvisoModal(idString)}>
                                      <Icons.Edit />
                                    </button>
                                    <button
                                      type="button"
                                      title="Remover aviso do programa"
                                      className="pa-icon-btn is-danger"
                                      onClick={() => setProgramaFormData(prev => ({
                                        ...prev,
                                        avisos_ids: Array.isArray(prev.avisos_ids) ? prev.avisos_ids.filter(aId => String(aId) !== idString) : []
                                      }))}
                                    >
                                      <Icons.Close size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* FASES DO AVISO */}
                              {fasesDoAviso.length > 0 ? (
                                <div className="pa-fases">
                                  {fasesDoAviso.map((fase, idx) => renderFaseChip(fase, idx))}
                                </div>
                              ) : (
                                <span className="pa-muted">Sem fases configuradas para este aviso.</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* BOTÃO PRINCIPAL: ADICIONAR */}
                    {!isViewOnly && !modoAdicaoAviso && !criarNovoAvisoInline && (
                      <button type="button" className="pa-add-line" onClick={() => setModoAdicaoAviso(true)}>
                        <Icons.Plus /> Adicionar Aviso
                      </button>
                    )}

                    {/* MODO 1: SELECIONAR EXISTENTE OU ESCOLHER CRIAR NOVO */}
                    {modoAdicaoAviso && (
                      <div className="pa-add-box">
                        <select
                          className="pa-input"
                          value=""
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            if (selectedId) {
                              setProgramaFormData(prev => ({ ...prev, avisos_ids: [...(prev.avisos_ids || []), selectedId] }));
                              setModoAdicaoAviso(false);
                            }
                          }}
                        >
                          <option value="" disabled>Selecione um aviso existente da lista...</option>
                          {avisos.filter(a => !(programaFormData.avisos_ids || []).map(String).includes(String(a.id))).map((aviso) => (
                            <option key={aviso.id} value={aviso.id}>{aviso.codigo}</option>
                          ))}
                        </select>
                        <span className="pa-or">OU</span>
                        <button type="button" className="pa-btn is-soft" onClick={() => { setModoAdicaoAviso(false); setCriarNovoAvisoInline(true); }}>
                          <Icons.Plus /> Criar Novo de Raiz
                        </button>
                        <button type="button" className="pa-icon-btn" onClick={() => setModoAdicaoAviso(false)} aria-label="Cancelar">
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    )}

                    {/* MODO 2: CRIAR NOVO INLINE */}
                    {criarNovoAvisoInline && (
                      <div className="pa-add-box is-column">
                        <div className="pa-add-box-head">
                          <h4><span>✨</span> A Configurar Novo Aviso Interno</h4>
                          <button type="button" className="pa-link is-danger" onClick={() => { setCriarNovoAvisoInline(false); setModoAdicaoAviso(true); }}>
                            Cancelar
                          </button>
                        </div>
                        <div className="pa-field">
                          <label>Código do Novo Aviso</label>
                          <input type="text" className="pa-input" value={novoAvisoCodigo} onChange={(e) => setNovoAvisoCodigo(e.target.value)} placeholder="ex. ALGARVE-2025-36" />
                        </div>
                        <div className="pa-field">
                          <label>Fases & Prazos do Novo Aviso</label>
                          {renderFaseEditor(novoAvisoFases, updateAvisoFaseInline, removeAvisoFaseInline, addAvisoFaseInline)}
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="pa-fcard">
                    <div className="pa-fcard-title"><span className="pa-fcard-ico is-purple"><Icons.Doc /></span> Textos de Enquadramento</div>
                    <div className="pa-grid-form is-2">
                      <div className="pa-field">
                        <label>Objetivos</label>
                        <textarea name="objetivos" className="pa-textarea" disabled={isViewOnly} value={programaFormData.objetivos} onChange={handleProgramaInputChange} placeholder="Objetivos do programa..." rows="3" />
                      </div>
                      <div className="pa-field">
                        <label>Entidades Elegíveis</label>
                        <textarea name="entidades_elegiveis" className="pa-textarea" disabled={isViewOnly} value={programaFormData.entidades_elegiveis} onChange={handleProgramaInputChange} placeholder="Quais as entidades que se podem candidatar..." rows="3" />
                      </div>
                      <div className="pa-field">
                        <label>Ações Elegíveis</label>
                        <textarea name="acoes_elegiveis" className="pa-textarea" disabled={isViewOnly} value={programaFormData.acoes_elegiveis} onChange={handleProgramaInputChange} placeholder="Ações elegíveis..." rows="3" />
                      </div>
                      <div className="pa-field">
                        <label>Condições Específicas</label>
                        <textarea name="condicoes_especificas" className="pa-textarea" disabled={isViewOnly} value={programaFormData.condicoes_especificas} onChange={handleProgramaInputChange} placeholder="Condições específicas..." rows="3" />
                      </div>
                    </div>
                    <div className="pa-field">
                      <label>Descrição Completa</label>
                      <textarea name="descricao" className="pa-textarea" disabled={isViewOnly} value={programaFormData.descricao} onChange={handleProgramaInputChange} placeholder="Descrição detalhada do programa..." rows="3" />
                    </div>
                  </section>

                  <section className="pa-fcard is-row">
                    <div className="pa-field" style={{ flex: "0 1 360px" }}>
                      <label>Estado do Programa</label>
                      {renderEstadoSeg()}
                    </div>
                  </section>
                </div>

                <div className="pa-modal-foot">
                  <button type="button" className="pa-btn is-ghost" onClick={handleCloseProgramaModal} disabled={isSubmitting}>
                    {isViewOnly ? "Fechar" : "Cancelar"}
                  </button>
                  {isViewOnly ? (
                    <button key="pa-edit" type="button" className="pa-btn is-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsViewOnly(false); }}>
                      <Icons.Edit /> Editar
                    </button>
                  ) : (
                    <button key="pa-submit" className="pa-btn is-primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <span className="pa-spinner is-sm" /> : <Icons.Check />} {isSubmitting ? "A guardar..." : editingProgramaId ? "Atualizar Programa" : "Criar Programa"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL EDITAR AVISOS INDEPENDENTE */}
      {avisoModalOpen && (
        <ModalPortal>
          <div className="pa-overlay is-top" onClick={handleCloseAvisoModal}>
            <div className="pa-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pa-modal-head">
                <span className="pa-modal-ico"><Icons.Clock /></span>
                <div className="pa-modal-title">
                  <span>Aviso</span>
                  <h3>Gerir Aviso Interno & Prazos</h3>
                  {avisoFormData.codigo ? <div className="pa-modal-chips"><span>{avisoFormData.codigo}</span></div> : null}
                </div>
                <button type="button" className="pa-modal-close" onClick={handleCloseAvisoModal} aria-label="Fechar"><Icons.Close /></button>
              </div>

              <form onSubmit={handleAvisoSubmit} className="pa-modal-form">
                <div className="pa-modal-body">
                  <section className="pa-fcard">
                    <div className="pa-field">
                      <label>Código do Aviso</label>
                      <input type="text" className="pa-input is-big" value={avisoFormData.codigo} onChange={(e) => setAvisoFormData(prev => ({ ...prev, codigo: e.target.value }))} />
                    </div>
                  </section>

                  <section className="pa-fcard">
                    <div className="pa-fcard-title"><span className="pa-fcard-ico is-blue"><Icons.Clock /></span> Fases & Datas de Limite</div>
                    {renderFaseEditor(
                      avisoFormFases,
                      (idx, field, value) => setAvisoFormFases(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f)),
                      (idx) => setAvisoFormFases(prev => prev.filter((_, i) => i !== idx)),
                      () => setAvisoFormFases(prev => [...prev, createBlankFase(prev.length)])
                    )}
                  </section>
                </div>

                <div className="pa-modal-foot">
                  <button type="button" className="pa-btn is-ghost" onClick={handleCloseAvisoModal}>
                    Cancelar
                  </button>
                  <button className="pa-btn is-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <span className="pa-spinner is-sm" /> : <Icons.Check />} {isSubmitting ? "A guardar..." : "Gravar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL DE CONFIRMAÇÃO GLOBAL */}
      {confirmModalOpen && (
        <ModalPortal>
          <div className="pa-overlay is-top" onClick={() => setConfirmModalOpen(false)}>
            <div className="pa-confirm" onClick={(e) => e.stopPropagation()}>
              <span className="pa-confirm-ico"><Icons.Archive /></span>
              <h3>Confirmar Alteração</h3>
              <p>{confirmMessage}</p>
              <div className="pa-confirm-actions">
                <button type="button" className="pa-btn is-ghost" onClick={() => setConfirmModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="pa-btn is-danger" onClick={() => { if (confirmAction) confirmAction(); }}>
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
          <div className={`pa-toast ${notification.type === "error" ? "is-error" : ""}`}>
            {notification.type === "error" ? <Icons.Close size={15} /> : <Icons.Check />} {notification.message}
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
