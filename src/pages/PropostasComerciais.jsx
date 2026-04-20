import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { generateProposalPDF } from "../components/pdfProposalGenerator";
import "./../styles/dashboard.css";

// ============================================================================
// CONSTANTES E HELPERS
// ============================================================================

const SERVICOS_BASE = [
  {
    id: "pedido_financiamento",
    codigo: "I",
    nome: "Pedido de Financiamento",
    descricao: "Elaboração e submissão da candidatura",
    atividades: [
      "Reunião de arranque para análise de enquadramento ao programa e sistema de incentivos.",
      "Desenvolvimento da Memória Descritiva do projeto adequada aos requisitos do programa.",
      "Reuniões de acompanhamento para avaliação e validação da informação.",
      "Preparação e submissão do pedido de financiamento (candidatura).",
      "Apoio na resposta ao pedido de esclarecimentos (se aplicável).",
    ],
    entregaveis: ["Formulário de Candidatura"],
    honorario_tipo: "fixo",
    honorario_valor: 1800,
    premio_aprovacao: true,
    premio_fixo: 600,
    premio_pct: 1,
    condicoes: "50% na adjudicação · 50% após entrega",
  },
  {
    id: "gestao_projeto",
    codigo: "II",
    nome: "Assessoria na Gestão do Projeto Financiado",
    descricao: "Acompanhamento durante a execução do projeto",
    atividades: [
      "Apoio à contratualização do incentivo e pedido de adiantamento.",
      "Reunião de arranque para planeamento financeiro e calendarização da execução.",
      "Reuniões periódicas sobre o planeamento e respetiva execução do projeto.",
      "Preparação do Dossier Digital do Projeto.",
      "Preparação dos modelos de publicitação do projeto.",
      "Organização e submissão dos documentos contabilísticos associados ao projeto.",
      "Preparação e submissão dos Pedidos de Reembolso.",
      "Análise e apoio nas respostas a pedidos de esclarecimento das Autoridades de Gestão.",
      "Preparação e submissão do pedido de reembolso final.",
      "Reunião de encerramento do projeto.",
    ],
    entregaveis: ["Pedido de Pagamento", "Dossier de Projeto Digital"],
    honorario_tipo: "percentagem_com_minimo",
    honorario_valor: 4,
    honorario_minimo: 3600,
    condicoes:
      "Debitado em 8 parcelas, sendo a primeira após assinatura do Termo de Aceitação e as restantes diferidas 90 dias entre si.",
  },
  {
    id: "controlo_objetivos",
    codigo: "III",
    nome: "Gestão e Controlo de Objetivos",
    descricao: "Monitorização pós-projeto (ano de avaliação)",
    atividades: [
      "Reuniões regulares de ponto de situação da execução do projeto.",
      "Análise e revisão dos objetivos definidos em candidatura.",
      "Relatório de encerramento com indicação dos objetivos de realização.",
    ],
    entregaveis: ["Relatório de análise dos objetivos", "Relatório de encerramento"],
    honorario_tipo: "fixo",
    honorario_valor: 600,
    condicoes: "50% no início do relatório · 50% após entrega",
  },
];

// Initial states
const INITIAL_EMPRESA_CONSULTORA = {
  id: "",
  nome: "",
  nipc: "",
  sigla: "",
  morada: "",
  telefone: "",
  email: "",
  website: "",
  signatario_id: "",
  nome_signatario: "",
  cargo_signatario: "",
  telemovel_signatario: "",
};
const INITIAL_CLIENTE = {
  id: "",
  nome: "",
  nipc: "",
  tipo_empresa: "PME",
  morada: "",
  distrito_cidade: "",
  setor_atividade: "",
  contacto_id: "",
  contacto_nome: "",
  contacto_cargo: "",
  contacto_email: "",
  contacto_telefone: "",
};
const INITIAL_TIPO_PROJETO = { id: "", nome: "", tem_programa: false };
const INITIAL_PROPOSTA = {
  db_id: "",
  numero: "",
  referencia_interna: "",
  data: new Date().toISOString().slice(0, 10),
  validade: 30,
  estado: "em_preparacao",
  investimento: "",
  iva: 23,
};
const INITIAL_CONDICOES_GERAIS = {
  ral: "",
  rgpd_email: "",
};
const INITIAL_NOTAS = [
  "O valor proposto inclui Memória Descritiva e Estudo de Viabilidade Económica.",
  "Não inclui desenvolvimento de Estudos de Mercado, Benchmarking ou outros estudos adicionais solicitados pelo Organismo.",
  "Não inclui apoio jurídico ou legal.",
  "Não inclui serviços de contabilidade, certificação, auditoria ou revisão de contas.",
];

const initialServicos = () =>
  SERVICOS_BASE.map((servico) => ({
    ...servico,
    atividades: [...servico.atividades],
    selecionado: true,
  }));

const initialNotas = () => [...INITIAL_NOTAS];

const INITIAL_PLANO_PAGAMENTO_SERVICO = [
  { percentagem: 50, descricao: "Adjudicação", dias_apos_aceite: 0 },
  { percentagem: 50, descricao: "Conclusão", dias_apos_aceite: 30 },
];

const createPlanoPagamentoServico = () =>
  INITIAL_PLANO_PAGAMENTO_SERVICO.map((item) => ({ ...item }));

const normalizeTemplateTarefa = (tarefa, index = 0) => ({
  id: tarefa?.id || `tarefa-${index + 1}`,
  template_atividade_id: tarefa?.template_atividade_id || tarefa?.atividade_id || "",
  ordem: Number(tarefa?.ordem || index + 1),
  nome: String(tarefa?.nome || ""),
  descricao: String(tarefa?.descricao || ""),
  dias_estimados: Number(tarefa?.dias_estimados || 0),
  info_adicional: String(tarefa?.info_adicional || ""),
  selecionado: tarefa?.selecionado !== false,
});

const normalizeTemplateAtividade = (atividade, index = 0) => ({
  id: atividade?.id || `atividade-${index + 1}`,
  ordem: Number(atividade?.ordem || index + 1),
  nome: String(atividade?.nome || ""),
  descricao: String(atividade?.descricao || ""),
  dias_estimados: Number(atividade?.dias_estimados || 0),
  info_adicional: String(atividade?.info_adicional || ""),
  valor_servico: Number(atividade?.valor_servico || 0),
  condicoes_pagamento: String(atividade?.condicoes_pagamento || ""),
  plano_pagamentos: Array.isArray(atividade?.plano_pagamentos) && atividade.plano_pagamentos.length > 0
    ? atividade.plano_pagamentos.map((item) => ({
        percentagem: Number(item?.percentagem || 0),
        descricao: String(item?.descricao || ""),
        dias_apos_aceite: Number(item?.dias_apos_aceite || 0),
      }))
    : createPlanoPagamentoServico(),
  selecionado: atividade?.selecionado !== false,
  tarefas: Array.isArray(atividade?.tarefas)
    ? atividade.tarefas.map((tarefa, tarefaIndex) => normalizeTemplateTarefa(tarefa, tarefaIndex))
    : [],
});

const normalizeModeloEstrutura = (atividades) =>
  (Array.isArray(atividades) ? atividades : [])
    .map((atividade, index) => normalizeTemplateAtividade(atividade, index))
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

// Plano de Pagamentos default
const INITIAL_PLANO_PAGAMENTOS = [
  { percentagem: 50, descricao: "Adjudicação", dias_apos_aceite: 0 },
  { percentagem: 50, descricao: "Conclusão", dias_apos_aceite: 30 },
];

const currencyFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const stepTitles = [
  "Empresa Consultora",
  "Cliente",
  "Tipo de Projeto",
  "Serviços",
  "Orçamento",
  "Condições Gerais",
  "Revisão",
];

const TIPO_EMPRESA_OPTIONS = ["PME", "Grande Empresa", "Startup", "Microempresa", "Outro"];
const PROPOSTA_ESTADOS = [
  { value: "em_preparacao", label: "Em preparação" },
  { value: "revisao", label: "Revisão" },
  { value: "enviada", label: "Enviada" },
  { value: "analise", label: "Análise" },
  { value: "ganha", label: "Ganha" },
  { value: "perdida", label: "Perdida" },
];

const normalizePropostaEstado = (estado) => {
  const value = String(estado || "").trim().toLowerCase();
  if (!value) return "em_preparacao";

  const legacyMap = {
    em_analise: "analise",
    aprovada: "ganha",
    arquivada: "perdida",
  };

  const normalized = legacyMap[value] || value;
  return PROPOSTA_ESTADOS.some((item) => item.value === normalized)
    ? normalized
    : "em_preparacao";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

const formatDatePt = (isoDate) => {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-PT");
};
const normalizeLookup = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const findByName = (items, name) => {
  const target = normalizeLookup(name);
  if (!target) return null;

  return (items || []).find((item) => normalizeLookup(item?.nome) === target) || null;
};

const normalizeAvisoFases = (value) => {
  if (!Array.isArray(value) || value.length === 0) return [];

  return value
    .map((fase, index) => {
      if (typeof fase === "string") {
        return { nome: `Fase ${index + 1}`, prazo: fase };
      }
      return {
        nome: String(fase?.nome || fase?.fase || `Fase ${index + 1}`),
        prazo: String(fase?.prazo || fase?.data || ""),
      };
    })
    .filter((fase) => fase.nome || fase.prazo);
};

const addDays = (isoDate, days) => {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  date.setDate(date.getDate() + Number(days || 0));
  return date.toLocaleDateString("pt-PT");
};

const downloadFile = (filename, content, mimeType = "text/html;charset=utf-8") => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const setField = (setter, field) => (event) => {
  const value = event.target.value;
  setter((previous) => ({ ...previous, [field]: value }));
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function PropostasComerciais() {
  const { id: propostaId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);

  // Data from BD
  const [empresasConsultoras, setEmpresasConsultoras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tiposProj, setTiposProj] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [contatosConsultora, setContatosConsultora] = useState([]);
  const [contatosCliente, setContatosCliente] = useState([]);

  // Selected entities
  const [empresaConsultora, setEmpresaConsultora] = useState(INITIAL_EMPRESA_CONSULTORA);
  const [cliente, setCliente] = useState(INITIAL_CLIENTE);
  const [tipoProjeto, setTipoProjeto] = useState(INITIAL_TIPO_PROJETO);
  const [programa, setPrograma] = useState(null);

  // Proposal data
  const [proposta, setProposta] = useState(INITIAL_PROPOSTA);
  const [condicoesGerais, setCondicoesGerais] = useState(INITIAL_CONDICOES_GERAIS);
  const [servicos, setServicos] = useState(initialServicos);
  const [modeloEstrutura, setModeloEstrutura] = useState([]);
  const [notasExclusoes, setNotasExclusoes] = useState(initialNotas);
  const [planoPagamentos, setPlanoPagamentos] = useState(INITIAL_PLANO_PAGAMENTOS);

  // UI state
  const [toastMessage, setToastMessage] = useState("");
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // ========================================================================
  // DATA LOADING
  // ========================================================================

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        let baseClientes = [];

        // Usar wildcard para compatibilidade com diferentes schemas/migrations.
        const { data: clientesAll, error: clientesAllError } = await supabase
          .from("clientes")
          .select("*")
          .order("created_at", { ascending: false });

        if (clientesAllError) {
          throw clientesAllError;
        }

        baseClientes = clientesAll || [];

        const clientesAtivos = baseClientes
          .filter((item) => item.ativo !== false)
          .map((item) => ({
            ...item,
            nome: item.marca || item.nome || "",
            nipc: item.nipc || item.nif || "",
            sigla: item.sigla || (item.marca || item.nome || "").substring(0, 3).toUpperCase(),
            website: item.website || "",
            tipo_empresa: item.tipo_empresa || "PME",
            setor_atividade: item.setor_atividade || item.objeto_social || "",
          }));

        const hasConsultoraFlag = clientesAtivos.some((item) => typeof item.eh_empresa_consultora === "boolean");

        if (hasConsultoraFlag) {
          setEmpresasConsultoras(clientesAtivos.filter((item) => item.eh_empresa_consultora === true));
          setClientes(clientesAtivos.filter((item) => item.eh_empresa_consultora !== true));
        } else {
          // Fallback de compatibilidade quando a migration ainda não correu.
          setEmpresasConsultoras(clientesAtivos);
          setClientes(clientesAtivos);
        }

        // Load project types
        const { data: tipos } = await supabase
          .from("tipos_projeto")
          .select("id, nome, tem_programa")
          .order("nome");
        setTiposProj(tipos || []);

        const { data: avisosData } = await supabase
          .from("avisos")
          .select("*")
          .order("nome", { ascending: true });
        setAvisos(avisosData || []);

        // Load programs
        const { data: progs } = await supabase
          .from("programas_financiamento")
          .select("id, codigo, nome, aviso, aviso_id, pct, tipo_incentivo, investimento_minimo, regiao, descricao, ativo")
          .eq("ativo", true)
          .order("nome");
        setProgramas(progs || []);
      } catch (error) {
        console.error("Error loading data:", error);
        showToast("Erro ao carregar dados", "error");
      } finally {
        setIsLoadingData(false);
      }
    };

    void loadData();
  }, []);

  // Load client contacts when cliente changes
  useEffect(() => {
    const loadContatosCliente = async () => {
      if (!cliente.id) {
        setContatosCliente([]);
        return;
      }

      try {
        const [contactosResult, moradaResult] = await Promise.all([
          supabase
            .from("contactos_cliente")
            .select("*")
            .eq("cliente_id", cliente.id)
            .eq("faz_propostas", true),
          supabase
            .from("moradas_cliente")
            .select("morada, localidade, concelho, distrito")
            .eq("cliente_id", cliente.id)
            .limit(1)
            .maybeSingle(),
        ]);

        const { data, error } = contactosResult;

        if (error) throw error;

        if (data && data.length > 0) {
          const contactosOrdenados = [...data].sort((a, b) => {
            const nomeA = String(a.nome_contacto || a.nome || "");
            const nomeB = String(b.nome_contacto || b.nome || "");
            return nomeA.localeCompare(nomeB, "pt-PT");
          });

          setContatosCliente(
            contactosOrdenados.map((contacto) => ({
              id: contacto.id,
              nome: contacto.nome_contacto || contacto.nome || "",
              cargo: contacto.cargo || "",
              email: contacto.email || "",
              telefone: contacto.telefone || "",
            }))
          );

          const contactoDefault = contactosOrdenados[0] || null;
          const morada = moradaResult.data?.morada || "";
          const distritoCidade =
            moradaResult.data?.distrito ||
            [moradaResult.data?.localidade, moradaResult.data?.concelho].filter(Boolean).join(" / ") ||
            "";

          setCliente((prev) => ({
            ...prev,
            morada: prev.morada || morada,
            distrito_cidade: prev.distrito_cidade || distritoCidade,
            contacto_id: prev.contacto_id || contactoDefault?.id || "",
            contacto_nome: prev.contacto_nome || contactoDefault?.nome_contacto || contactoDefault?.nome || "",
            contacto_cargo: prev.contacto_cargo || contactoDefault?.cargo || "",
            contacto_email: prev.contacto_email || contactoDefault?.email || "",
            contacto_telefone: prev.contacto_telefone || contactoDefault?.telefone || "",
          }));
        } else {
          // Fallback para compatibilidade quando não há contactos registados
          setContatosCliente([{ id: cliente.id, nome: cliente.nome }]);

          const morada = moradaResult.data?.morada || "";
          const distritoCidade =
            moradaResult.data?.distrito ||
            [moradaResult.data?.localidade, moradaResult.data?.concelho].filter(Boolean).join(" / ") ||
            "";

          setCliente((prev) => ({
            ...prev,
            morada: prev.morada || morada,
            distrito_cidade: prev.distrito_cidade || distritoCidade,
          }));
        }
      } catch (error) {
        console.error("Error loading client contacts:", error);
        setContatosCliente([{ id: cliente.id, nome: cliente.nome }]);
      }
    };

    void loadContatosCliente();
  }, [cliente.id]);

  useEffect(() => {
    const carregarPropostaExistente = async () => {
      if (!propostaId) return;

      setIsLoadingDb(true);
      try {
        const { data, error } = await supabase
          .from("propostas_comerciais")
          .select("id, numero_proposta_str, estado, empresa_consultora_id, cliente_id, tipo_projeto_id, programa_id, payload, plano_pagamentos")
          .eq("id", propostaId)
          .single();

        if (error) throw error;
        if (!data) return;

        const payload = typeof data.payload === "string" ? JSON.parse(data.payload) : (data.payload || {});

        if (data.empresa_consultora_id) {
          const consultora = empresasConsultoras.find((e) => String(e.id) === String(data.empresa_consultora_id));
          const baseConsultora = {
            id: data.empresa_consultora_id,
            nome: consultora?.nome || payload?.empresa_consultora?.nome || "",
            nipc: consultora?.nipc || payload?.empresa_consultora?.nipc || "",
            sigla:
              consultora?.sigla ||
              payload?.empresa_consultora?.sigla ||
              (consultora?.nome || payload?.empresa_consultora?.nome || "").substring(0, 3).toUpperCase(),
            morada: payload?.empresa_consultora?.morada || "",
            telefone: payload?.empresa_consultora?.telefone || "",
            email: payload?.empresa_consultora?.email || "",
            website: payload?.empresa_consultora?.website || consultora?.website || "",
            signatario_id: payload?.empresa_consultora?.signatario_id || "",
            nome_signatario: payload?.empresa_consultora?.nome_signatario || "",
            cargo_signatario: payload?.empresa_consultora?.cargo_signatario || "",
            telemovel_signatario: payload?.empresa_consultora?.telemovel_signatario || "",
          };

          setEmpresaConsultora(baseConsultora);
          void carregarDadosConsultora(data.empresa_consultora_id, baseConsultora);
        }

        if (data.cliente_id) {
          const clienteEncontrado = clientes.find((c) => String(c.id) === String(data.cliente_id));
          setCliente({
            id: data.cliente_id,
            nome: clienteEncontrado?.nome || payload?.cliente?.nome || "",
            nipc: clienteEncontrado?.nipc || payload?.cliente?.nipc || "",
            tipo_empresa: payload?.cliente?.tipo_empresa || clienteEncontrado?.tipo_empresa || "PME",
            morada: payload?.cliente?.morada || "",
            distrito_cidade: payload?.cliente?.distrito_cidade || "",
            setor_atividade: payload?.cliente?.setor_atividade || clienteEncontrado?.setor_atividade || "",
            contacto_id: payload?.cliente?.contacto_id || "",
            contacto_nome: payload?.cliente?.contacto_nome || "",
            contacto_cargo: payload?.cliente?.contacto_cargo || "",
            contacto_email: payload?.cliente?.contacto_email || "",
            contacto_telefone: payload?.cliente?.contacto_telefone || "",
          });
        }

        if (data.tipo_projeto_id) {
          const tipo = tiposProj.find((t) => String(t.id) === String(data.tipo_projeto_id));
          setTipoProjeto({
            id: data.tipo_projeto_id,
            nome: tipo?.nome || payload?.tipo_projeto?.nome || "",
            tem_programa: typeof tipo?.tem_programa === "boolean" ? !!tipo.tem_programa : !!payload?.tipo_projeto?.tem_programa,
          });
        }

        if (Array.isArray(payload?.modelo_estrutura) && payload.modelo_estrutura.length > 0) {
          setModeloEstrutura(normalizeModeloEstrutura(payload.modelo_estrutura));
        } else if (Array.isArray(payload?.modelo_etapas) && payload.modelo_etapas.length > 0) {
          setModeloEstrutura(
            normalizeModeloEstrutura(
              payload.modelo_etapas.map((atividade, index) => ({
                ...normalizeTemplateAtividade(atividade, index),
                tarefas: Array.isArray(atividade?.tarefas)
                  ? atividade.tarefas.map((tarefa, tarefaIndex) => normalizeTemplateTarefa(tarefa, tarefaIndex))
                  : [],
              }))
            )
          );
        } else if (data.tipo_projeto_id) {
          void carregarModeloEstrutura(data.tipo_projeto_id);
        }

        if (data.programa_id) {
          const prog = programas.find((p) => String(p.id) === String(data.programa_id));
          if (prog) setPrograma(prog);
        }

        setProposta((prev) => ({
          ...prev,
          db_id: data.id,
          numero: data.numero_proposta_str || "",
          referencia_interna: payload?.proposta?.referencia_interna || "",
          estado: normalizePropostaEstado(data.estado || payload?.proposta?.estado || prev.estado),
          data: payload?.proposta?.data || prev.data,
          validade: payload?.proposta?.validade ?? prev.validade,
          investimento: payload?.proposta?.investimento ?? payload?.orcamento?.investimento ?? prev.investimento,
          iva: payload?.proposta?.iva ?? payload?.orcamento?.iva ?? prev.iva,
        }));

        if (payload?.condicoes_gerais) {
          setCondicoesGerais({
            ral: payload.condicoes_gerais.ral || "",
            rgpd_email: payload.condicoes_gerais.rgpd_email || "",
          });
        }

        if (Array.isArray(payload?.servicos_config) && payload.servicos_config.length > 0) {
          setServicos(payload.servicos_config);
        }

        if (Array.isArray(payload?.orcamento?.notas) && payload.orcamento.notas.length > 0) {
          setNotasExclusoes(payload.orcamento.notas);
        }

        if (Array.isArray(data.plano_pagamentos) && data.plano_pagamentos.length > 0) {
          setPlanoPagamentos(data.plano_pagamentos);
        } else if (Array.isArray(payload?.plano_pagamentos) && payload.plano_pagamentos.length > 0) {
          setPlanoPagamentos(payload.plano_pagamentos);
        }
      } catch (error) {
        console.error("Erro ao carregar proposta para edição:", error);
        showToast("Erro ao carregar proposta");
      } finally {
        setIsLoadingDb(false);
      }
    };

    if (propostaId && !isLoadingData) {
      void carregarPropostaExistente();
    }
  }, [propostaId, isLoadingData, empresasConsultoras, clientes, tiposProj, programas]);

  // ========================================================================
  // HELPERS
  // ========================================================================

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2500);
  };

  const carregarModeloEstrutura = async (tipoProjetoId) => {
    if (!tipoProjetoId) {
      setModeloEstrutura([]);
      return;
    }

    try {
      const { data: atividadesData, error } = await supabase
        .from("template_atividades")
        .select("id, nome, descricao, dias_estimados, info_adicional, ordem, tipo_projeto_id")
        .eq("tipo_projeto_id", tipoProjetoId)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      const atividades = (atividadesData || []).map((item, index) => normalizeTemplateAtividade(item, index));
      const idsAtividades = atividades.map((item) => item.id);

      let tarefas = [];
      if (idsAtividades.length > 0) {
        const { data: tarefasData, error: tarefasError } = await supabase
          .from("template_tarefas")
          .select("id, template_atividade_id, nome, descricao, dias_estimados, info_adicional, ordem")
          .in("template_atividade_id", idsAtividades)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true });

        if (tarefasError) throw tarefasError;
        tarefas = tarefasData || [];
      }

      setModeloEstrutura(
        atividades.map((atividade) => ({
          ...atividade,
          tarefas: tarefas
            .filter((tarefa) => String(tarefa.template_atividade_id) === String(atividade.id))
            .map((tarefa, tarefaIndex) => normalizeTemplateTarefa(tarefa, tarefaIndex)),
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar etapas do modelo:", error);
      setModeloEstrutura([]);
    }
  };

  const goStep = (nextStep) => {
    if (nextStep < 1 || nextStep > stepTitles.length) return;
    setCurrentStep(nextStep);
  };

  // ========================================================================
  // CORE FUNCTIONS: PDF & PERSISTENCE
  // ========================================================================

  const guardarPropostaEmBD = async () => {
    if (!empresaConsultora.id || !cliente.id || !tipoProjeto.id) {
      showToast("Preencha empresa consultora, cliente e tipo de projeto");
      return;
    }

    setIsSavingDb(true);
    try {
      const dados = recolherDados();
      const sigla = empresaConsultora.sigla || "PRO";
      const ano = new Date().getFullYear();
      const payload = dados;

      let result;
      let numeroFinal = proposta.numero;
      if (proposta.db_id) {
        // UPDATE existing proposal
        result = await supabase
          .from("propostas_comerciais")
          .update({
            numero_proposta_str: numeroFinal || null,
            payload,
            plano_pagamentos: planoPagamentosConsolidado,
            estado: proposta.estado,
            contato_cliente_id: cliente.contacto_id || null,
            programa_id: programa?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", proposta.db_id);
      } else {
        const { data: numerosExistentes, error: errorSeq } = await supabase
          .from("propostas_comerciais")
          .select("id")
          .ilike("numero_proposta_str", `${sigla}-${ano}-%`);

        if (errorSeq) throw errorSeq;

        const sequencial = String((numerosExistentes?.length || 0) + 1).padStart(3, "0");
        numeroFinal = `${sigla}-${ano}-${sequencial}`;

        // CREATE new proposal
        result = await supabase
          .from("propostas_comerciais")
          .insert([
            {
              numero_proposta_str: numeroFinal,
              sigla_empresa: sigla,
              empresa_consultora_id: empresaConsultora.id,
              cliente_id: cliente.id,
              contato_cliente_id: cliente.contacto_id || null,
              tipo_projeto_id: tipoProjeto.id,
              programa_id: programa?.id || null,
              estado: proposta.estado,
              plano_pagamentos: planoPagamentosConsolidado,
              payload,
            },
          ])
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      // Update proposta with DB ID
      setProposta((prev) => ({
        ...prev,
        db_id: result.data?.[0]?.id || prev.db_id,
        numero: numeroFinal || prev.numero,
      }));

      showToast("✓ Proposta guardada com sucesso!");
    } catch (error) {
      console.error("Erro ao guardar proposta:", error);
      showToast("Erro ao guardar proposta");
    } finally {
      setIsSavingDb(false);
    }
  };

  const gerarPDF = () => {
    try {
      const incentivoEstimado = (proposta.investimento || 0) * ((programa?.pct || 0) / 100);

      generateProposalPDF({
        propostaNumero: proposta.numero || proposta.db_id,
        proposta,
        cliente,
        empresaConsultora,
        tipoProjeto,
        programa,
        selectedPrograma,
        selectedAviso,
        modeloEstrutura,
        orcamentoLinhas,
        notasExclusoes,
        condicoesGerais,
        totais,
        formatDatePt,
        formatCurrency,
        normalizeAvisoFases,
      });

      showToast("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      showToast("Erro ao gerar PDF");
    }
  };

  const selectEmpresaConsultora = (id) => {
    const found = empresasConsultoras.find((e) => String(e.id) === String(id));
    if (found) {
      setEmpresaConsultora({
        id: found.id,
        nome: found.nome,
        nipc: found.nipc,
        sigla: found.sigla || found.nome.substring(0, 3).toUpperCase(),
        morada: "",
        telefone: "",
        email: "",
        website: found.website || "",
        signatario_id: "",
        nome_signatario: "",
        cargo_signatario: "",
        telemovel_signatario: "",
      });

      void carregarDadosConsultora(found.id);
    } else {
      setContatosConsultora([]);
    }
  };

  const selectContatoConsultora = (contactoId) => {
    const contacto = contatosConsultora.find((c) => String(c.id) === String(contactoId));
    if (!contacto) return;

    setEmpresaConsultora((prev) => ({
      ...prev,
      signatario_id: contacto.id,
      nome_signatario: contacto.nome || "",
      cargo_signatario: contacto.cargo || "",
      telemovel_signatario: contacto.telefone || "",
      telefone: contacto.telefone || "",
      email: contacto.email || "",
    }));
  };

  const selectCliente = (id) => {
    const found = clientes.find((c) => String(c.id) === String(id));
    if (!found) {
      setCliente(INITIAL_CLIENTE);
      setContatosCliente([]);
      return;
    }

    setCliente({
      id: found.id,
      nome: found.nome || "",
      nipc: found.nipc || "",
      tipo_empresa: found.tipo_empresa || "PME",
      morada: "",
      distrito_cidade: found.distrito_cidade || "",
      setor_atividade: found.setor_atividade || "",
      contacto_id: "",
      contacto_nome: "",
      contacto_cargo: "",
      contacto_email: "",
      contacto_telefone: "",
    });

    void (async () => {
      try {
        const [moradaResult, contactosResult] = await Promise.all([
          supabase
            .from("moradas_cliente")
            .select("morada, localidade, codigo_postal")
            .eq("cliente_id", found.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("contactos_cliente")
            .select("*")
            .eq("cliente_id", found.id)
            .eq("faz_propostas", true),
        ]);

        const morada =
          moradaResult.data?.morada ||
          [moradaResult.data?.localidade, moradaResult.data?.codigo_postal].filter(Boolean).join(" ") ||
          "";

        const contactos = [...(contactosResult.data || [])]
          .sort((a, b) => {
            const nomeA = String(a.nome_contacto || a.nome || "");
            const nomeB = String(b.nome_contacto || b.nome || "");
            return nomeA.localeCompare(nomeB, "pt-PT");
          })
          .map((c) => ({
            id: c.id,
            nome: c.nome_contacto || c.nome || "",
            cargo: c.cargo || "",
            telefone: c.telefone || "",
            email: c.email || "",
          }));

        setContatosCliente(contactos);
        const contactoDefault = contactos[0] || null;

        setCliente((prev) => ({
          ...prev,
          morada: prev.morada || morada,
          contacto_id: prev.contacto_id || contactoDefault?.id || "",
          contacto_nome: prev.contacto_nome || contactoDefault?.nome || "",
          contacto_cargo: prev.contacto_cargo || contactoDefault?.cargo || "",
          contacto_email: prev.contacto_email || contactoDefault?.email || "",
          contacto_telefone: prev.contacto_telefone || contactoDefault?.telefone || "",
        }));
      } catch (error) {
        console.error("Erro ao carregar dados do cliente:", error);
        setContatosCliente([]);
      }
    })();
  };

  const selectContatoCliente = (contactoId) => {
    const contacto = contatosCliente.find((c) => String(c.id) === String(contactoId));
    if (!contacto) return;

    setCliente((prev) => ({
      ...prev,
      contacto_id: contacto.id,
      contacto_nome: contacto.nome || "",
      contacto_cargo: contacto.cargo || "",
      contacto_email: contacto.email || "",
      contacto_telefone: contacto.telefone || "",
    }));
  };

  const selectTipoProjeto = (id) => {
    const found = tiposProj.find((t) => String(t.id) === String(id));
    if (found) {
      setTipoProjeto({
        id: found.id,
        nome: found.nome,
        tem_programa: found.tem_programa,
      });
      // Reset program if new tipo doesn't have programs
      if (!found.tem_programa) {
        setPrograma(null);
      }

      setModeloEstrutura([]);
      void carregarModeloEstrutura(found.id);
    }
  };

  const addAtividadeModelo = () => {
    setModeloEstrutura((previous) => [
      ...previous,
      {
        id: `custom-atividade-${Date.now()}-${previous.length + 1}`,
        ordem: previous.length + 1,
        nome: "Nova atividade",
        descricao: "",
        dias_estimados: 0,
        info_adicional: "",
        valor_servico: 0,
        condicoes_pagamento: "",
        plano_pagamentos: createPlanoPagamentoServico(),
        selecionado: true,
        tarefas: [],
      },
    ]);
  };

  const updateAtividadeModelo = (atividadeId, field, value) => {
    setModeloEstrutura((previous) =>
      previous.map((atividade) =>
        atividade.id === atividadeId
          ? {
              ...atividade,
              [field]: field === "dias_estimados" ? Number(value || 0) : value,
            }
          : atividade
      )
    );
  };

  const toggleAtividadeModelo = (atividadeId) => {
    setModeloEstrutura((previous) =>
      previous.map((atividade) =>
        atividade.id === atividadeId ? { ...atividade, selecionado: !atividade.selecionado } : atividade
      )
    );
  };

  const removeAtividadeModelo = (atividadeId) => {
    setModeloEstrutura((previous) =>
      previous
        .filter((atividade) => atividade.id !== atividadeId)
        .map((atividade, index) => ({ ...atividade, ordem: index + 1 }))
    );
  };

  const addTarefaModelo = (atividadeId) => {
    setModeloEstrutura((previous) =>
      previous.map((atividade) =>
        atividade.id === atividadeId
          ? {
              ...atividade,
              tarefas: [
                ...(Array.isArray(atividade.tarefas) ? atividade.tarefas : []),
                {
                  id: `custom-tarefa-${Date.now()}-${(atividade.tarefas?.length || 0) + 1}`,
                  template_atividade_id: atividadeId,
                  ordem: (atividade.tarefas?.length || 0) + 1,
                  nome: "Nova tarefa",
                  descricao: "",
                  dias_estimados: 0,
                  info_adicional: "",
                  selecionado: true,
                },
              ],
            }
          : atividade
      )
    );
  };

  const updateTarefaModelo = (atividadeId, tarefaId, field, value) => {
    setModeloEstrutura((previous) =>
      previous.map((atividade) => {
        if (atividade.id !== atividadeId) return atividade;

        return {
          ...atividade,
          tarefas: (atividade.tarefas || []).map((tarefa) =>
            tarefa.id === tarefaId
              ? {
                  ...tarefa,
                  [field]: field === "dias_estimados" ? Number(value || 0) : value,
                }
              : tarefa
          ),
        };
      })
    );
  };

  const removeTarefaModelo = (atividadeId, tarefaId) => {
    setModeloEstrutura((previous) =>
      previous.map((atividade) => {
        if (atividade.id !== atividadeId) return atividade;

        return {
          ...atividade,
          tarefas: (atividade.tarefas || [])
            .filter((tarefa) => tarefa.id !== tarefaId)
            .map((tarefa, index) => ({ ...tarefa, ordem: index + 1 })),
        };
      })
    );
  };

  const addPagamentoServico = (atividadeId) => {
    setModeloEstrutura((previous) =>
      previous.map((atividade) => {
        if (atividade.id !== atividadeId) return atividade;

        return {
          ...atividade,
          plano_pagamentos: [
            ...(Array.isArray(atividade.plano_pagamentos) ? atividade.plano_pagamentos : []),
            { percentagem: 0, descricao: "", dias_apos_aceite: 0 },
          ],
        };
      })
    );
  };

  const updatePagamentoServico = (atividadeId, index, field, value) => {
    setModeloEstrutura((previous) =>
      previous.map((atividade) => {
        if (atividade.id !== atividadeId) return atividade;

        return {
          ...atividade,
          plano_pagamentos: (atividade.plano_pagamentos || []).map((pag, pagIndex) =>
            pagIndex === index
              ? {
                  ...pag,
                  [field]: field === "descricao" ? value : Number(value || 0),
                }
              : pag
          ),
        };
      })
    );
  };

  const removePagamentoServico = (atividadeId, index) => {
    setModeloEstrutura((previous) =>
      previous.map((atividade) => {
        if (atividade.id !== atividadeId) return atividade;

        return {
          ...atividade,
          plano_pagamentos: (atividade.plano_pagamentos || []).filter((_, pagIndex) => pagIndex !== index),
        };
      })
    );
  };

  const selectPrograma = (id) => {
    const found = programas.find((p) => String(p.id) === String(id));
    if (found) {
      setPrograma(found);
    }
  };

  const carregarDadosConsultora = async (consultoraId, baseConsultora = null) => {
    if (!consultoraId) {
      setContatosConsultora([]);
      return;
    }

    try {
      const [moradaResult, contactosResult] = await Promise.all([
        supabase
          .from("moradas_cliente")
          .select("morada, localidade, codigo_postal")
          .eq("cliente_id", consultoraId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("contactos_cliente")
          .select("*")
          .eq("cliente_id", consultoraId)
          .eq("faz_propostas", true),
      ]);

      const morada =
        moradaResult.data?.morada ||
        [moradaResult.data?.localidade, moradaResult.data?.codigo_postal].filter(Boolean).join(" ") ||
        "";

      const contactos = [...(contactosResult.data || [])]
        .sort((a, b) => {
          const nomeA = String(a.nome_contacto || a.nome || "");
          const nomeB = String(b.nome_contacto || b.nome || "");
          return nomeA.localeCompare(nomeB, "pt-PT");
        })
        .map((c) => ({
          id: c.id,
          nome: c.nome_contacto || c.nome || "",
          cargo: c.cargo || "",
          telefone: c.telefone || "",
          email: c.email || "",
        }));

      setContatosConsultora(contactos);
      const contactoDefault = contactos[0] || null;
      const contactoSelecionado = baseConsultora?.signatario_id
        ? contactos.find((c) => String(c.id) === String(baseConsultora.signatario_id)) || null
        : null;
      const contactoAtivo = contactoSelecionado || contactoDefault;

      if (baseConsultora) {
        setEmpresaConsultora((prev) => ({
          ...prev,
          ...baseConsultora,
          morada: baseConsultora.morada || morada || prev.morada || "",
          telefone: contactoAtivo?.telefone || baseConsultora.telefone || prev.telefone || "",
          email: contactoAtivo?.email || baseConsultora.email || prev.email || "",
          signatario_id: contactoAtivo?.id || baseConsultora.signatario_id || prev.signatario_id || "",
          nome_signatario: contactoAtivo?.nome || baseConsultora.nome_signatario || prev.nome_signatario || "",
          cargo_signatario: contactoAtivo?.cargo || baseConsultora.cargo_signatario || prev.cargo_signatario || "",
          telemovel_signatario: contactoAtivo?.telefone || baseConsultora.telemovel_signatario || prev.telemovel_signatario || "",
        }));
      } else {
        setEmpresaConsultora((prev) => ({
          ...prev,
          morada: prev.morada || morada,
          telefone: contactoAtivo?.telefone || prev.telefone || "",
          email: contactoAtivo?.email || prev.email || "",
          signatario_id: contactoAtivo?.id || prev.signatario_id || "",
          nome_signatario: contactoAtivo?.nome || prev.nome_signatario || "",
          cargo_signatario: contactoAtivo?.cargo || prev.cargo_signatario || "",
          telemovel_signatario: contactoAtivo?.telefone || prev.telemovel_signatario || "",
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados da consultora:", error);
      setContatosConsultora([]);
    }
  };

  const updateServicoField = (id, field, value) => {
    setServicos((previous) =>
      previous.map((servico) =>
        servico.id === id ? { ...servico, [field]: value } : servico
      )
    );
  };

  const addNota = () => {
    setNotasExclusoes((previous) => [...previous, "Nova nota"]);
  };

  const updateNota = (index, value) => {
    setNotasExclusoes((previous) => previous.map((nota, currentIndex) => (currentIndex === index ? value : nota)));
  };

  const removeNota = (index) => {
    setNotasExclusoes((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const addPagamento = () => {
    setPlanoPagamentos((previous) => [
      ...previous,
      { percentagem: 0, descricao: "", dias_apos_aceite: 0 },
    ]);
  };

  const updatePagamento = (index, field, value) => {
    setPlanoPagamentos((previous) =>
      previous.map((pag, i) => (i === index ? { ...pag, [field]: value } : pag))
    );
  };

  const removePagamento = (index) => {
    setPlanoPagamentos((previous) => previous.filter((_, i) => i !== index));
  };

  // ========================================================================
  // CALCULATIONS
  // ========================================================================

  const activeServicos = useMemo(
    () => (modeloEstrutura || []).filter((atividade) => atividade.selecionado !== false),
    [modeloEstrutura]
  );

  const incentivoEstimado = useMemo(() => {
    if (!programa) return 0;
    const investimento = Number(proposta.investimento || 0);
    const pct = Number(programa.pct || 0);
    return investimento * (pct / 100);
  }, [proposta.investimento, programa]);

  const orcamentoLinhas = useMemo(() => {
    return activeServicos.map((atividade, index) => {
      const valor = Number(atividade.valor_servico || 0);

      return {
        id: atividade.id,
        codigo: atividade.ordem || index + 1,
        nome: atividade.nome,
        valor,
        honorarioLabel: formatCurrency(valor),
        condicoes: atividade.condicoes_pagamento || "",
        plano_pagamentos: Array.isArray(atividade.plano_pagamentos) ? atividade.plano_pagamentos : [],
      };
    });
  }, [activeServicos]);

  const totais = useMemo(() => {
    const totalSemIva = orcamentoLinhas.reduce((accumulator, linha) => accumulator + linha.valor, 0);
    const iva = Number(proposta.iva || 23);
    const totalIva = totalSemIva * (iva / 100);
    const totalComIva = totalSemIva + totalIva;

    return { totalSemIva, totalIva, totalComIva, iva };
  }, [orcamentoLinhas, proposta.iva]);

  const planoPagamentosConsolidado = useMemo(
    () =>
      activeServicos.flatMap((atividade) =>
        (atividade.plano_pagamentos || []).map((pagamento) => ({
          servico_id: atividade.id,
          servico_nome: atividade.nome,
          percentagem: Number(pagamento.percentagem || 0),
          descricao: pagamento.descricao || "",
          dias_apos_aceite: Number(pagamento.dias_apos_aceite || 0),
        }))
      ),
    [activeServicos]
  );

  // Compat layer for Step 3 visual block
  const programasDisponiveis = useMemo(
    () => (programas || []).filter((item) => item.ativo !== false),
    [programas],
  );
  const programaId = programa?.id ? String(programa.id) : "";
  const selectedPrograma = programa || null;
  const selectedAviso = useMemo(
    () => avisos.find((a) => String(a.id) === String(selectedPrograma?.aviso_id || "")) || null,
    [avisos, selectedPrograma],
  );

  // Data collection for saving
  const recolherDados = () => ({
    empresa_consultora: empresaConsultora,
    cliente,
    tipo_projeto: tipoProjeto,
    programa: programa || null,
    proposta,
    condicoes_gerais: condicoesGerais,
    servicos: orcamentoLinhas,
    servicos_config: servicos,
    modelo_estrutura: modeloEstrutura,
    orcamento: {
      investimento: Number(proposta.investimento || 0),
      iva: totais.iva,
      total_sem_iva: totais.totalSemIva,
      total_iva: totais.totalIva,
      total_com_iva: totais.totalComIva,
      plano_pagamentos: planoPagamentosConsolidado,
      notas: notasExclusoes,
    },
    plano_pagamentos: planoPagamentosConsolidado,
  });

  const resetForm = () => {
    if (!window.confirm("Limpar todos os dados?")) return;
    setCurrentStep(1);
    setEmpresaConsultora(INITIAL_EMPRESA_CONSULTORA);
    setCliente(INITIAL_CLIENTE);
    setTipoProjeto(INITIAL_TIPO_PROJETO);
    setPrograma(null);
    setProposta(INITIAL_PROPOSTA);
    setCondicoesGerais(INITIAL_CONDICOES_GERAIS);
    setServicos(initialServicos());
    setModeloEstrutura([]);
    setNotasExclusoes(initialNotas());
    setPlanoPagamentos(INITIAL_PLANO_PAGAMENTOS);
    setContatosConsultora([]);
    setContatosCliente([]);
    showToast("Formulário limpo.");
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (isLoadingData) {
    return <div className="page-container">A carregar dados...</div>;
  }

  if (isLoadingDb) {
    return <div className="page-container">A carregar proposta...</div>;
  }

  return (
    <div className="page-container propostas-page">
      <div className="propostas-hero card">
        <div>
          <div className="propostas-kicker">Gerador de Propostas</div>
          <h1>Propostas Comerciais</h1>
          <p>Monta a proposta por passos, calcula automaticamente o orçamento e exporta o PDF final.</p>
        </div>

        <div className="propostas-hero-actions">
          <button className="btn-soft-cta" type="button" onClick={resetForm}>
            Limpar
          </button>
        </div>
      </div>

      <div className="propostas-progress" aria-hidden="true">
        <div className="propostas-progress-fill" style={{ width: `${(currentStep / stepTitles.length) * 100}%` }} />
      </div>

      <div className="propostas-layout">
        <aside className="card propostas-stepper">
          <div className="section-heading">Passos</div>
          <div className="propostas-stepper-list">
            {stepTitles.map((title, index) => (
              <button
                key={index}
                type="button"
                className={`propostas-stepper-item ${currentStep === index + 1 ? "active" : ""}`}
                onClick={() => goStep(index + 1)}
              >
                <span className="propostas-stepper-badge">{index + 1}</span>
                <span className="propostas-stepper-label">{title}</span>
              </button>
            ))}
          </div>

          <div className="propostas-stepper-footer">
            <div className="section-heading">Progresso</div>
            <div className="propostas-step-count">
              Passo {currentStep} de {stepTitles.length}
            </div>
          </div>
        </aside>

        <main className="propostas-main">
          {currentStep === 1 && (
            <section className="card propostas-section">
              <div className="section-heading">1 · Identificação</div>
              <div className="field-grid">
                <div className="field span-2">
                  <label>Selecionar Empresa</label>
                  <select
                    value={empresaConsultora.id}
                    onChange={(e) => selectEmpresaConsultora(e.target.value)}
                  >
                    <option value="">—</option>
                    {empresasConsultoras.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Dados da Empresa Consultora</div>
                <div className="field-grid">
                  {empresaConsultora.id && (
                    <div className="field span-2">
                      <label>Pessoa da consultora (BD)</label>
                      <select
                        value={empresaConsultora.signatario_id || ""}
                        onChange={(e) => selectContatoConsultora(e.target.value)}
                      >
                        <option value="">
                          {contatosConsultora.length > 0 ? "—" : "Sem pessoas registadas para esta consultora"}
                        </option>
                        {contatosConsultora.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                      {contatosConsultora.length === 0 && (
                        <div className="field-hint">Adiciona pessoas em Clientes - aba Pessoas da empresa consultora.</div>
                      )}
                    </div>
                  )}

                  <div className="field">
                    <label>Nome da empresa</label>
                    <input type="text" value={empresaConsultora.nome} onChange={setField(setEmpresaConsultora, "nome")} placeholder="ex. NEOMARCA, Inovação e Desenvolvimento, Lda." />
                  </div>
                  <div className="field">
                    <label>NIPC</label>
                    <input type="text" value={empresaConsultora.nipc} onChange={setField(setEmpresaConsultora, "nipc")} placeholder="ex. 503 495 140" />
                  </div>
                  <div className="field">
                    <label>Morada completa</label>
                    <input type="text" value={empresaConsultora.morada} onChange={setField(setEmpresaConsultora, "morada")} placeholder="ex. Rua Horta Machado, 2 – 8000-362 Faro" />
                  </div>
                  <div className="field">
                    <label>Telefone</label>
                    <input type="text" value={empresaConsultora.telefone} onChange={setField(setEmpresaConsultora, "telefone")} placeholder="ex. 289 098 720" />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={empresaConsultora.email} onChange={setField(setEmpresaConsultora, "email")} placeholder="ex. info@consultora.pt" />
                  </div>
                  <div className="field">
                    <label>Website</label>
                    <input type="text" value={empresaConsultora.website} onChange={setField(setEmpresaConsultora, "website")} placeholder="ex. www.consultora.pt" />
                  </div>
                  <div className="field">
                    <label>Nome do signatário</label>
                    <input type="text" value={empresaConsultora.nome_signatario} onChange={setField(setEmpresaConsultora, "nome_signatario")} placeholder="ex. Paulo Pereira" />
                  </div>
                  <div className="field">
                    <label>Cargo do signatário</label>
                    <input type="text" value={empresaConsultora.cargo_signatario} onChange={setField(setEmpresaConsultora, "cargo_signatario")} placeholder="ex. Diretor" />
                  </div>
                  <div className="field">
                    <label>Telemóvel (signatário)</label>
                    <input type="text" value={empresaConsultora.telemovel_signatario} onChange={setField(setEmpresaConsultora, "telemovel_signatario")} placeholder="ex. 913 535 544" />
                  </div>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Referência da Proposta</div>
                <div className="field-grid">
                  <div className="field">
                    <label>ID da Proposta</label>
                    <input
                      type="text"
                      placeholder="Auto: SIGLA-2026-{id}"
                      readOnly
                      value={proposta.numero || (empresaConsultora.sigla ? `${empresaConsultora.sigla}-${new Date().getFullYear()}-...` : "")}
                    />
                  </div>
                  <div className="field">
                    <label>Referência interna</label>
                    <input type="text" value={proposta.referencia_interna || ""} onChange={setField(setProposta, "referencia_interna")} placeholder="ex. 056/03/2026" />
                  </div>
                  <div className="field">
                    <label>Data de Emissão</label>
                    <input type="date" value={proposta.data} onChange={setField(setProposta, "data")} />
                  </div>
                  <div className="field">
                    <label>Validade (dias)</label>
                    <input type="number" min="1" value={proposta.validade} onChange={setField(setProposta, "validade")} />
                  </div>
                  <div className="field">
                    <label>Estado</label>
                    <select value={proposta.estado} onChange={setField(setProposta, "estado")}>
                      {PROPOSTA_ESTADOS.map((estadoItem) => (
                        <option key={estadoItem.value} value={estadoItem.value}>{estadoItem.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p style={{ marginTop: "8px", color: "#0f9d58", fontWeight: 700 }}>
                  O ID da proposta é automático e incremental. É atribuído quando guardas na BD.
                </p>
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section className="card propostas-section">
              <div className="section-heading">2 · Cliente</div>
              <div className="field-grid">
                <div className="field span-2">
                  <label>Selecionar Cliente</label>
                  <select value={cliente.id} onChange={(e) => selectCliente(e.target.value)}>
                    <option value="">—</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Dados do Cliente</div>
                <div className="field-grid">
                  <div className="field">
                    <label>Nome da empresa</label>
                    <input type="text" value={cliente.nome} onChange={setField(setCliente, "nome")} placeholder="ex. CAMPICONTROL, LDA" />
                  </div>
                  <div className="field">
                    <label>NIPC</label>
                    <input type="text" value={cliente.nipc || ""} onChange={setField(setCliente, "nipc")} placeholder="ex. 507 123 456" />
                  </div>
                  <div className="field">
                    <label>Tipo de empresa</label>
                    <select value={cliente.tipo_empresa || "PME"} onChange={setField(setCliente, "tipo_empresa")}>
                      {TIPO_EMPRESA_OPTIONS.map((tipo) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Morada</label>
                    <input type="text" value={cliente.morada || ""} onChange={setField(setCliente, "morada")} placeholder="ex. Rua da Liberdade, 10 – 8000-000 Faro" />
                  </div>
                  <div className="field">
                    <label>Distrito / Cidade</label>
                    <input type="text" value={cliente.distrito_cidade || ""} onChange={setField(setCliente, "distrito_cidade")} placeholder="ex. Faro" />
                  </div>
                  <div className="field">
                    <label>Setor de atividade</label>
                    <input type="text" value={cliente.setor_atividade || ""} onChange={setField(setCliente, "setor_atividade")} placeholder="ex. Construção, Agricultura, Ambiente" />
                  </div>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Contacto</div>
                <div className="field-grid">
                  <div className="field span-2">
                    <label>Selecionar Contacto</label>
                    <select
                      value={cliente.contacto_id}
                      onChange={(e) => {
                        const contato = contatosCliente.find((c) => String(c.id) === String(e.target.value));
                        if (contato) {
                          selectContatoCliente(
                            contato.id,
                            contato.nome,
                            contato.cargo || "",
                            contato.email || "",
                            contato.telefone || ""
                          );
                        }
                      }}
                    >
                      <option value="">—</option>
                      {contatosCliente.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Nome do contacto</label>
                    <input type="text" value={cliente.contacto_nome || ""} onChange={setField(setCliente, "contacto_nome")} placeholder="ex. André Gomes" />
                  </div>
                  <div className="field">
                    <label>Cargo</label>
                    <input type="text" value={cliente.contacto_cargo || ""} onChange={setField(setCliente, "contacto_cargo")} placeholder="ex. Gerente" />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={cliente.contacto_email || ""} onChange={setField(setCliente, "contacto_email")} placeholder="ex. agomes@empresa.pt" />
                  </div>
                  <div className="field">
                    <label>Telefone</label>
                    <input type="text" value={cliente.contacto_telefone || ""} onChange={setField(setCliente, "contacto_telefone")} placeholder="ex. 289 000 000" />
                  </div>
                </div>
              </div>

              {cliente.id && (
                <div className="card-inner">
                  <div className="section-heading">Resumo</div>
                  <div>
                    <p><strong>Cliente:</strong> {cliente.nome || "—"}</p>
                    <p><strong>Contacto:</strong> {cliente.contacto_nome || "—"}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {currentStep === 3 && (
            <section className="card propostas-section">
              <div className="section-heading">3 · Tipo de Projeto e Programa</div>

              <div className="card-inner">
                <div className="field-grid">
                  <div className="field span-2">
                    <label>Tipo de projeto</label>
                    <select value={tipoProjeto.id} onChange={(e) => selectTipoProjeto(e.target.value)}>
                      <option value="">—</option>
                      {tiposProj.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </option>
                      ))}
                    </select>
                    <div className="field-hint">
                      Primeiro escolhe o tipo de projeto. Depois disso, o sistema mostra se este tipo pede programa/aviso.
                    </div>
                  </div>
                </div>
              </div>

              {tipoProjeto.id ? (
                tipoProjeto.tem_programa ? (
                  <>
                    <div className="card-inner">
                      <div className="section-heading">Programas disponíveis</div>
                      <div className="propostas-programas-grid">
                        {programasDisponiveis.map((programa) => (
                          <button
                            key={programa.id}
                            type="button"
                            className={`propostas-programa-card ${programa.id === programaId ? "selected" : ""}`}
                            onClick={() => selectPrograma(programa.id)}
                            style={{
                              padding: "16px",
                              border: programa.id === programaId ? "2px solid #6366f1" : "1px solid #e5e7eb",
                              borderRadius: "12px",
                              background: programa.id === programaId ? "#f0f4ff" : "#f8f9fa",
                              textAlign: "left",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#0f2240" }}>
                                  {programa.nome}
                                </h4>
                                <div className="muted" style={{ fontSize: "0.85rem", marginBottom: "8px" }}>
                                  {programa.codigo}
                                </div>

                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                                  {programa.pct > 0 && (
                                    <span className="badge badge-success" style={{ fontSize: "0.8rem" }}>
                                      {programa.pct}%
                                    </span>
                                  )}
                                  {programa.regiao && (
                                    <span className="badge badge-warning" style={{ fontSize: "0.8rem" }}>
                                      {programa.regiao.split("/").map((r) => r.trim()).join(" / ")}
                                    </span>
                                  )}
                                  {(programa.tipo || programa.tipo_incentivo) && (
                                    <span className="badge badge-info" style={{ fontSize: "0.8rem" }}>
                                      {programa.tipo || programa.tipo_incentivo}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  background: programa.id === programaId ? "#6366f1" : "#e5e7eb",
                                  color: programa.id === programaId ? "white" : "#64748b",
                                  fontWeight: 600,
                                }}
                              >
                                {programa.id === programaId ? "✓" : ""}
                              </div>
                            </div>
                          </button>
                        ))}

                      </div>
                    </div>

                    {selectedPrograma && (
                      <div className="card-inner">
                        <div className="section-heading">Personalizar Programa</div>
                        <div className="field-grid">
                          <div className="field">
                            <label>Nome do sistema de incentivos</label>
                            <input type="text" value={selectedPrograma.nome || ""} readOnly />
                          </div>
                          <div className="field">
                            <label>Referência do aviso</label>
                            <input
                              type="text"
                              value={selectedAviso?.codigo || selectedPrograma.aviso || ""}
                              readOnly
                            />
                          </div>
                          <div className="field">
                            <label>Incentivo (%)</label>
                            <input type="number" value={Number(selectedPrograma.pct || 0)} readOnly />
                          </div>
                          <div className="field">
                            <label>Tipo de incentivo</label>
                            <select value={selectedPrograma.tipo || selectedPrograma.tipo_incentivo || ""} disabled>
                              <option value={selectedPrograma.tipo || selectedPrograma.tipo_incentivo || ""}>
                                {selectedPrograma.tipo || selectedPrograma.tipo_incentivo || "—"}
                              </option>
                            </select>
                          </div>
                          <div className="field">
                            <label>Investimento mínimo (€)</label>
                            <input
                              type="number"
                              value={Number(selectedPrograma.inv_min ?? selectedPrograma.investimento_minimo ?? 0)}
                              readOnly
                            />
                          </div>
                          <div className="field">
                            <label>Região</label>
                            <input type="text" value={selectedPrograma.regiao || ""} readOnly />
                          </div>

                          {normalizeAvisoFases(selectedAviso?.fases).slice(0, 2).map((fase, index) => (
                            <div className="field" key={`${fase.nome}-${index}`}>
                              <label>{index === 0 ? "Prazo 1.ª fase" : "Prazo 2.ª fase (opcional)"}</label>
                              <input type="text" value={formatDatePt(fase.prazo)} readOnly />
                            </div>
                          ))}

                          {normalizeAvisoFases(selectedAviso?.fases).length > 2 && (
                            <div className="field span-2">
                              <label>Fases adicionais</label>
                              <div className="propostas-pill-list" style={{ marginTop: "0" }}>
                                {normalizeAvisoFases(selectedAviso?.fases).slice(2).map((fase, index) => (
                                  <span key={`${fase.nome}-${index}`} className="badge badge-warning">
                                    {fase.nome}: {formatDatePt(fase.prazo)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="field span-2">
                            <label>Descrição resumida do aviso</label>
                            <textarea
                              rows="3"
                              value={selectedAviso?.descricao || selectedPrograma.descricao || ""}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="card-inner">
                    <div className="section-heading">Programa</div>
                    <div className="field-hint">
                      Este tipo de projeto não requer programa nem aviso.
                    </div>
                  </div>
                )
              ) : (
                <div className="card-inner">
                  <div className="section-heading">Programa</div>
                  <div className="field-hint">
                    Seleciona primeiro o tipo de projeto para saber se este fluxo pede programa/aviso.
                  </div>
                </div>
              )}
            </section>
          )}

          {currentStep === 4 && (
            <section className="card propostas-section">
              <div className="section-heading">4 · Serviços</div>

              <div className="propostas-service-list">
                {modeloEstrutura.length === 0 ? (
                  <div className="card-inner">
                    <div className="field-hint">Seleciona um tipo de projeto com modelo para carregar as atividades e tarefas.</div>
                    <button type="button" className="btn-soft-cta" onClick={addAtividadeModelo} style={{ marginTop: "12px" }}>
                      Adicionar atividade
                    </button>
                  </div>
                ) : (
                  modeloEstrutura.map((atividade) => (
                    <article
                      key={atividade.id}
                      className={`propostas-service-card ${atividade.selecionado ? "selected" : ""}`}
                    >
                      <div style={{ display: "flex", alignItems: "stretch" }}>
                        <button
                          className="propostas-service-header"
                          type="button"
                          onClick={() => toggleAtividadeModelo(atividade.id)}
                          style={{ flex: 1 }}
                        >
                          <span className="propostas-service-check">{atividade.selecionado ? "✓" : ""}</span>
                          <span className="propostas-service-code">{atividade.ordem}</span>
                          <span className="propostas-service-main">
                            <span className="propostas-service-name">{atividade.nome}</span>
                            <span className="muted">{atividade.descricao || "Atividade principal do modelo"}</span>
                          </span>
                          <span className="propostas-service-price">
                            {atividade.dias_estimados ? `${Number(atividade.dias_estimados)}d` : ""}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeAtividadeModelo(atividade.id);
                          }}
                          style={{ marginLeft: "8px" }}
                        >
                          ×
                        </button>
                      </div>

                      {atividade.selecionado && (
                        <div className="propostas-service-body">
                          <div className="section-subtitle" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                            Atividades Incluídas
                          </div>
                          <div className="propostas-activities">
                            {(atividade.tarefas || []).map((tarefa) => (
                              <div key={tarefa.id} className="propostas-activity-row">
                                <input
                                  type="text"
                                  value={tarefa.nome || ""}
                                  onChange={(event) => updateTarefaModelo(atividade.id, tarefa.id, "nome", event.target.value)}
                                />
                                <button type="button" className="btn-small" onClick={() => removeTarefaModelo(atividade.id, tarefa.id)}>
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                          <button type="button" className="btn-soft-cta" onClick={() => addTarefaModelo(atividade.id)}>
                            Adicionar atividade
                          </button>

                          <div className="section-subtitle" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "14px" }}>
                            Entregáveis
                          </div>
                          <div className="propostas-pill-list" style={{ marginTop: "8px" }}>
                            {(atividade.tarefas || []).filter((tarefa) => String(tarefa.nome || "").trim()).length > 0 ? (
                              (atividade.tarefas || [])
                                .filter((tarefa) => String(tarefa.nome || "").trim())
                                .slice(0, 4)
                                .map((tarefa) => (
                                  <span key={`badge-${atividade.id}-${tarefa.id}`} className="badge badge-warning">
                                    {tarefa.nome}
                                  </span>
                                ))
                            ) : (
                              <span className="badge badge-warning">Sem entregáveis definidos</span>
                            )}
                          </div>

                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>

              <div style={{ marginTop: "12px" }}>
                <button type="button" className="btn-soft-cta" onClick={addAtividadeModelo}>
                  Adicionar atividade
                </button>
              </div>
            </section>
          )}

          {currentStep === 5 && (
            <section className="card propostas-section">
              <div className="section-heading">5 · Orçamento</div>
              <div className="field-grid field-grid-3">
                <div className="field">
                  <label>Investimento estimado (€)</label>
                  <input type="number" value={proposta.investimento || ""} onChange={setField(setProposta, "investimento")} placeholder="ex. 200000" />
                  <div className="field-hint">Base de cálculo dos incentivos</div>
                </div>
                {programa && programa.pct > 0 && (
                  <div className="field">
                    <label>Incentivo estimado (€)</label>
                    <input type="text" value={incentivoEstimado ? formatCurrency(incentivoEstimado) : ""} readOnly />
                  </div>
                )}
                <div className="field">
                  <label>Taxa de IVA (%)</label>
                  <input type="number" value={proposta.iva || 23} onChange={setField(setProposta, "iva")} min="0" max="100" />
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Detalhes dos Serviços</div>
                {activeServicos.length > 0 ? (
                  activeServicos.map((atividade) => (
                    <div key={atividade.id} style={{ marginBottom: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ marginBottom: "10px" }}>
                        <strong>Serviço {atividade.ordem} — {atividade.nome || "Sem nome"}</strong>
                      </div>

                      <div className="field-grid field-grid-3" style={{ marginBottom: "8px" }}>
                        <div className="field">
                          <label>Valor do serviço (€)</label>
                          <input
                            type="number"
                            min="0"
                            value={Number(atividade.valor_servico || 0)}
                            onChange={(event) => updateAtividadeModelo(atividade.id, "valor_servico", event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="section-subtitle" style={{ marginTop: "10px" }}>Plano de Pagamentos do Serviço</div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px 40px", gap: "8px", marginBottom: "8px", fontSize: "12px", color: "#666", fontWeight: 600, alignItems: "center" }}>
                        <div>Percentagem</div>
                        <div>Descrição</div>
                        <div>Dias após aceite</div>
                        <div />
                      </div>

                      <div className="propostas-pagamentos-list">
                        {(atividade.plano_pagamentos || []).map((pag, index) => (
                          <div key={`${atividade.id}-pag-${index}`} style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px 40px", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={Number(pag.percentagem || 0)}
                              onChange={(e) => updatePagamentoServico(atividade.id, index, "percentagem", e.target.value)}
                              placeholder="0"
                            />
                            <input
                              type="text"
                              value={pag.descricao || ""}
                              onChange={(e) => updatePagamentoServico(atividade.id, index, "descricao", e.target.value)}
                              placeholder="ex. Adjudicação"
                            />
                            <input
                              type="number"
                              min="0"
                              value={Number(pag.dias_apos_aceite || 0)}
                              onChange={(e) => updatePagamentoServico(atividade.id, index, "dias_apos_aceite", e.target.value)}
                              placeholder="0"
                            />
                            <button type="button" className="btn-small" onClick={() => removePagamentoServico(atividade.id, index)}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="btn-soft-cta" onClick={() => addPagamentoServico(atividade.id)}>
                        Adicionar parcela
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="muted">Nenhum serviço selecionado no passo 4.</div>
                )}
              </div>

              <div className="propostas-totals">
                <div className="total-card">
                  <span>Total s/ IVA</span>
                  <strong>{formatCurrency(totais.totalSemIva)}</strong>
                </div>
                <div className="total-card">
                  <span>IVA</span>
                  <strong>{formatCurrency(totais.totalIva)}</strong>
                </div>
                <div className="total-card total-card-accent">
                  <span>Total c/ IVA</span>
                  <strong>{formatCurrency(totais.totalComIva)}</strong>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Notas / Exclusões</div>
                <div className="propostas-notas-list">
                  {notasExclusoes.map((nota, index) => (
                    <div key={`${nota}-${index}`} className="propostas-nota-row">
                      <input type="text" value={nota} onChange={(event) => updateNota(index, event.target.value)} />
                      <button type="button" className="btn-small" onClick={() => removeNota(index)}>
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn-soft-cta" onClick={addNota}>
                  Adicionar nota
                </button>
              </div>
            </section>
          )}

          {currentStep === 6 && (
            <section className="card propostas-section">
              <div className="section-heading">6 · Condições Gerais</div>
              <div className="field-grid field-grid-1">
                <div className="field">
                  <label>Entidade RAL (Resolução de Litígios)</label>
                  <input
                    type="text"
                    value={condicoesGerais.ral}
                    onChange={setField(setCondicoesGerais, "ral")}
                    placeholder="ex. CIMAAL – Centro de Informação..."
                  />
                </div>
                <div className="field">
                  <label>Email RGPD / Privacidade</label>
                  <input
                    type="email"
                    value={condicoesGerais.rgpd_email}
                    onChange={setField(setCondicoesGerais, "rgpd_email")}
                    placeholder="ex. privacy@empresa.pt"
                  />
                </div>
              </div>
            </section>
          )}

          {currentStep === 7 && (
            <section className="card propostas-section">
              <div className="section-heading">7 · Revisão</div>
              <div className="propostas-review-banner">
                <div>
                  <h2>{cliente.nome || "—"}</h2>
                  <p>
                    {tipoProjeto.nome || "—"} {programa ? `· ${programa.nome}` : ""} · {formatDatePt(proposta.data)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={gerarPDF}
                    disabled={isSavingDb}
                  >
                    Gerar PDF
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={guardarPropostaEmBD}
                    disabled={isSavingDb}
                  >
                    {isSavingDb ? "A guardar..." : "Guardar Proposta"}
                  </button>
                </div>
              </div>

              <div className="propostas-summary-grid">
                <div className="summary-card">
                  <div className="summary-label">Empresa Consultora</div>
                  <div className="summary-value">{empresaConsultora.nome || "—"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Cliente</div>
                  <div className="summary-value">{cliente.nome || "—"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Tipo de Projeto</div>
                  <div className="summary-value">{tipoProjeto.nome || "—"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Programa</div>
                  <div className="summary-value">{programa?.nome || "—"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Serviços</div>
                  <div className="summary-value">{activeServicos.length} de {modeloEstrutura.length}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Validade</div>
                  <div className="summary-value">{proposta.validade || 30} dias</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Referência Interna</div>
                  <div className="summary-value">{proposta.referencia_interna || "—"}</div>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Resumo Financeiro</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "12px", marginBottom: "16px" }}>
                  {orcamentoLinhas.map((l) => (
                    <div key={l.id} style={{ display: "contents" }}>
                      <div><strong>Módulo {l.codigo}</strong><br /><span className="muted">{l.nome}</span></div>
                      <div style={{ textAlign: "right" }}>{formatCurrency(l.valor)}</div>
                    </div>
                  ))}
                </div>

                <div className="propostas-totals">
                  <div className="total-card">
                    <span>Total s/ IVA</span>
                    <strong>{formatCurrency(totais.totalSemIva)}</strong>
                  </div>
                  <div className="total-card">
                    <span>IVA</span>
                    <strong>{formatCurrency(totais.totalIva)}</strong>
                  </div>
                  <div className="total-card total-card-accent">
                    <span>Total c/ IVA</span>
                    <strong>{formatCurrency(totais.totalComIva)}</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="propostas-nav">
            <button className="btn-small" type="button" onClick={() => goStep(currentStep - 1)} disabled={currentStep === 1}>
              ← Anterior
            </button>
            <div className="muted">Passo {currentStep} de {stepTitles.length}</div>
            <button
              className="btn-primary"
              type="button"
              onClick={() => goStep(currentStep + 1)}
              disabled={currentStep === stepTitles.length}
            >
              Próximo →
            </button>
          </div>
        </main>
      </div>

      {toastMessage && <div className="toast-notification success">{toastMessage}</div>}
    </div>
  );
}
