import { useState, useEffect, useMemo, useRef } from "react";
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
      "Debitado conforme o plano de pagamentos acordado, com a primeira parcela após assinatura do Termo de Aceitação e as restantes conforme definido no plano.",
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
const INITIAL_ORCAMENTO_TIPO_PROJETO = {
  tipo_projeto_id: "",
  nome: "",
  ordem: 1,
  num_horas: 0,
  base_eur_hora: 0,
  valor: 0,
  plano_pagamentos: [],
};
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
  tipo_projeto_id: atividade?.tipo_projeto_id || "",
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

const decimalFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 2,
});

const DEFAULT_ORCAMENTO_HORAS = 0;
const DEFAULT_ORCAMENTO_BASE_EUR = 50;

const normalizeOrcamentoTipoProjetoItem = (item = {}, index = 0, fallbackHoras = DEFAULT_ORCAMENTO_HORAS, fallbackBase = DEFAULT_ORCAMENTO_BASE_EUR) => {
  const hasHoras = item?.num_horas !== undefined && item?.num_horas !== null;
  const hasBase = item?.base_eur_hora !== undefined && item?.base_eur_hora !== null;
  const legacyValor = Number(item?.valor || 0);

  const base = hasBase
    ? Number(item.base_eur_hora || 0)
    : legacyValor > 0
      ? 1
      : Number(fallbackBase || DEFAULT_ORCAMENTO_BASE_EUR);

  const horas = hasHoras
    ? Number(item.num_horas || 0)
    : legacyValor > 0 && base > 0
      ? legacyValor / base
      : Number(fallbackHoras || DEFAULT_ORCAMENTO_HORAS);

  const total = Number(horas || 0) * Number(base || 0);

  return {
    ...INITIAL_ORCAMENTO_TIPO_PROJETO,
    ...item,
    ordem: Number(item?.ordem || index + 1),
    num_horas: Number(horas || 0),
    base_eur_hora: Number(base || 0),
    valor: Number(total || 0),
  };
};

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
  const [tiposProjetoSelecionados, setTiposProjetoSelecionados] = useState([]);
  const [programa, setPrograma] = useState(null);
  const [orcamentoTiposProjeto, setOrcamentoTiposProjeto] = useState([]);
  const [ordemTiposServico, setOrdemTiposServico] = useState([]);
  const [dragTipoProjetoId, setDragTipoProjetoId] = useState("");
  const [dragAutoExpandTipoProjetoId, setDragAutoExpandTipoProjetoId] = useState("");
  const [tiposServicoColapsados, setTiposServicoColapsados] = useState({});

  const dragTipoServicoItem = useRef(null);
  const dragTipoServicoOverItem = useRef(null);

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

        const ordenarPorNome = (lista) =>
          [...lista].sort((a, b) =>
            String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-PT", { sensitivity: "base" })
          );

        const hasConsultoraFlag = clientesAtivos.some((item) => typeof item.eh_empresa_consultora === "boolean");

        if (hasConsultoraFlag) {
          setEmpresasConsultoras(clientesAtivos.filter((item) => item.eh_empresa_consultora === true));
          setClientes(ordenarPorNome(clientesAtivos.filter((item) => item.eh_empresa_consultora !== true)));
        } else {
          // Fallback de compatibilidade quando a migration ainda não correu.
          setEmpresasConsultoras(clientesAtivos);
          setClientes(ordenarPorNome(clientesAtivos));
        }

        // Load project types
        const { data: tipos } = await supabase
          .from("tipos_projeto")
          .select("id, nome, tem_programa, default_num_horas, default_base_eur_hora")
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

        const tiposPayload = Array.isArray(payload?.tipos_projeto)
          ? payload.tipos_projeto
              .map((item) => {
                const found = tiposProj.find((tipo) => String(tipo.id) === String(item?.id || item?.tipo_projeto_id));
                if (found) return found;
                if (!item?.id && !item?.tipo_projeto_id) return null;
                return {
                  id: item.id || item.tipo_projeto_id,
                  nome: item.nome || "",
                  tem_programa: !!item.tem_programa,
                };
              })
              .filter(Boolean)
          : [];

        if (tiposPayload.length > 0) {
          setTiposProjetoSelecionados(tiposPayload);
        } else if (data.tipo_projeto_id) {
          const tipo = tiposProj.find((t) => String(t.id) === String(data.tipo_projeto_id));
          if (tipo) {
            setTiposProjetoSelecionados([tipo]);
          } else {
            setTiposProjetoSelecionados([
              {
                id: data.tipo_projeto_id,
                nome: payload?.tipo_projeto?.nome || "",
                tem_programa: !!payload?.tipo_projeto?.tem_programa,
              },
            ]);
          }
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
        } else {
          const tipoIds = Array.isArray(payload?.tipos_projeto)
            ? payload.tipos_projeto.map((item) => item?.id || item?.tipo_projeto_id).filter(Boolean)
            : data.tipo_projeto_id
              ? [data.tipo_projeto_id]
              : [];
          if (tipoIds.length > 0) {
            void carregarModeloEstrutura(tipoIds);
          }
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

        if (Array.isArray(payload?.orcamento?.tipos_projeto) && payload.orcamento.tipos_projeto.length > 0) {
          setOrcamentoTiposProjeto(
            payload.orcamento.tipos_projeto.map((item, index) => {
              const tipoDefault = tiposProj.find(
                (tipo) => String(tipo.id) === String(item?.tipo_projeto_id || item?.id || "")
              );

              const normalized = normalizeOrcamentoTipoProjetoItem(
                {
                  ...item,
                  tipo_projeto_id: item?.tipo_projeto_id || item?.id || "",
                  nome: item?.nome || "",
                },
                index,
                Number(tipoDefault?.default_num_horas ?? DEFAULT_ORCAMENTO_HORAS),
                Number(tipoDefault?.default_base_eur_hora ?? DEFAULT_ORCAMENTO_BASE_EUR)
              );

              return {
                ...normalized,
                plano_pagamentos:
                  Array.isArray(item?.plano_pagamentos) && item.plano_pagamentos.length > 0
                    ? item.plano_pagamentos.map((pag) => ({
                        percentagem: Number(pag?.percentagem || 0),
                        descricao: String(pag?.descricao || ""),
                        dias_apos_aceite: Number(pag?.dias_apos_aceite || 0),
                      }))
                    : createPlanoPagamentoServico(),
              };
            })
          );
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

  const carregarModeloEstrutura = async (tipoProjetoIds) => {
    const ids = Array.isArray(tipoProjetoIds)
      ? tipoProjetoIds.filter(Boolean)
      : tipoProjetoIds
        ? [tipoProjetoIds]
        : [];

    if (ids.length === 0) {
      setModeloEstrutura([]);
      return;
    }

    try {
      const { data: atividadesData, error } = await supabase
        .from("template_atividades")
        .select("id, nome, descricao, dias_estimados, info_adicional, ordem, tipo_projeto_id")
        .in("tipo_projeto_id", ids)
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
    if (!empresaConsultora.id || !cliente.id || tiposProjetoSelecionados.length === 0) {
      showToast("Preencha empresa consultora, cliente e pelo menos um tipo de projeto");
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
            tipo_projeto_id: tiposProjetoSelecionados[0]?.id || null,
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
              tipo_projeto_id: tiposProjetoSelecionados[0]?.id || null,
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
      generateProposalPDF({
        propostaNumero: proposta.numero || proposta.db_id,
        proposta,
        cliente,
        empresaConsultora,
        tipoProjeto: tiposProjetoSelecionados[0] || INITIAL_TIPO_PROJETO,
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

  const toggleTipoProjeto = (id) => {
    const found = tiposProj.find((t) => String(t.id) === String(id));
    if (!found) return;

    setTiposProjetoSelecionados((previous) => {
      const exists = previous.some((item) => String(item.id) === String(found.id));
      const next = exists
        ? previous.filter((item) => String(item.id) !== String(found.id))
        : [...previous, found];

      if (!next.some((item) => item.tem_programa)) {
        setPrograma(null);
      }

      void carregarModeloEstrutura(next.map((item) => item.id));
      return next;
    });
  };

  const handleDragStartTipoServico = (tipoProjetoId) => {
    const id = String(tipoProjetoId || "");
    if (!id) return;

    setDragTipoProjetoId(id);
    dragTipoServicoItem.current = id;
    dragTipoServicoOverItem.current = id;
    setTiposServicoColapsados((previous) => {
      const alreadyCollapsed = !!previous[id];
      if (!alreadyCollapsed) {
        setDragAutoExpandTipoProjetoId(id);
      }
      return {
        ...previous,
        [id]: true,
      };
    });
  };

  const handleDragOverTipoServico = (event) => {
    event.preventDefault();
  };

  const handleDragEnterTipoServico = (targetTipoProjetoId) => {
    const dragId = String(dragTipoServicoItem.current || "");
    const targetId = String(targetTipoProjetoId || "");

    if (!dragId || !targetId || dragId === targetId) {
      dragTipoServicoOverItem.current = targetId || dragTipoServicoOverItem.current;
      return;
    }

    dragTipoServicoOverItem.current = targetId;

    setOrdemTiposServico((previous) => {
      const baseOrder = previous.length > 0
        ? [...previous]
        : tiposProjetoSelecionados
            .slice()
            .sort((a, b) => String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-PT"))
            .map((item) => String(item.id));

      const fromIndex = baseOrder.indexOf(dragId);
      const toIndex = baseOrder.indexOf(targetId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return previous.length > 0 ? previous : baseOrder;
      }

      const nextOrder = [...baseOrder];
      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);
      return nextOrder;
    });
  };

  const finalizeDragTipoServico = (dragIdOverride = "") => {
    const dragId = String(dragIdOverride || dragTipoProjetoId || "");
    const shouldReopenId = String(dragAutoExpandTipoProjetoId || "");

    if (shouldReopenId && shouldReopenId === dragId) {
      setTiposServicoColapsados((previous) => ({
        ...previous,
        [shouldReopenId]: false,
      }));
    }

    setDragAutoExpandTipoProjetoId("");
    setDragTipoProjetoId("");
    dragTipoServicoItem.current = null;
    dragTipoServicoOverItem.current = null;
  };

  const toggleCollapseTipoServico = (tipoProjetoId) => {
    const id = String(tipoProjetoId || "");
    if (!id) return;

    setTiposServicoColapsados((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const handleDropTipoServico = (targetTipoProjetoId) => {
    const dragId = String(dragTipoProjetoId || "");
    const targetId = String(targetTipoProjetoId || "");
    if (!dragId || !targetId || dragId === targetId) {
      finalizeDragTipoServico(dragId);
      return;
    }

    setOrdemTiposServico((previous) => {
      const list = Array.isArray(previous) ? [...previous] : [];
      const fromIndex = list.indexOf(dragId);
      const toIndex = list.indexOf(targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return previous;
      }

      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return list;
    });

    finalizeDragTipoServico(dragId);
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

  const updateOrcamentoTipoField = (tipoProjetoId, field, value) => {
    setOrcamentoTiposProjeto((previous) =>
      previous.map((item) =>
        String(item.tipo_projeto_id) === String(tipoProjetoId)
          ? (() => {
              const next = {
                ...item,
                [field]: Number(value || 0),
              };

              if (field === "num_horas" || field === "base_eur_hora") {
                next.valor = Number(next.num_horas || 0) * Number(next.base_eur_hora || 0);
              } else if (field === "valor") {
                const base = Number(next.base_eur_hora || 0);
                next.num_horas = base > 0 ? Number(next.valor || 0) / base : Number(next.valor || 0);
              }

              return next;
            })()
          : item
      )
    );
  };

  const getPlanoPagamentosTotalPercentagem = (planoPagamentos = []) =>
    (Array.isArray(planoPagamentos) ? planoPagamentos : []).reduce(
      (accumulator, pagamento) => accumulator + Number(pagamento?.percentagem || 0),
      0
    );

  const addPagamentoTipoProjeto = (tipoProjetoId) => {
    const alvo = orcamentoTiposProjeto.find(
      (item) => String(item.tipo_projeto_id) === String(tipoProjetoId)
    );
    const totalAtual = getPlanoPagamentosTotalPercentagem(alvo?.plano_pagamentos);

    if (totalAtual >= 100) {
      showToast("A soma das parcelas já está em 100%.");
      return;
    }

    setOrcamentoTiposProjeto((previous) =>
      previous.map((item) =>
        String(item.tipo_projeto_id) === String(tipoProjetoId)
          ? {
              ...item,
              plano_pagamentos: [...(item.plano_pagamentos || []), { percentagem: 0, descricao: "", dias_apos_aceite: 0 }],
            }
          : item
      )
    );
  };

  const updatePagamentoTipoProjeto = (tipoProjetoId, index, field, value) => {
    setOrcamentoTiposProjeto((previous) =>
      previous.map((item) => {
        if (String(item.tipo_projeto_id) !== String(tipoProjetoId)) return item;

        if (field === "percentagem") {
          const requested = Math.max(0, Number(value || 0));
          const otherTotal = (item.plano_pagamentos || []).reduce(
            (accumulator, pag, pagIndex) =>
              pagIndex === index ? accumulator : accumulator + Number(pag?.percentagem || 0),
            0
          );
          const maxAllowed = Math.max(0, 100 - otherTotal);
          const nextPercentagem = Math.min(requested, maxAllowed);

          if (requested > maxAllowed) {
            showToast("A soma das parcelas não pode ultrapassar 100%.");
          }

          return {
            ...item,
            plano_pagamentos: (item.plano_pagamentos || []).map((pag, pagIndex) =>
              pagIndex === index
                ? {
                    ...pag,
                    percentagem: nextPercentagem,
                  }
                : pag
            ),
          };
        }

        return {
          ...item,
          plano_pagamentos: (item.plano_pagamentos || []).map((pag, pagIndex) =>
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

  const removePagamentoTipoProjeto = (tipoProjetoId, index) => {
    setOrcamentoTiposProjeto((previous) =>
      previous.map((item) => {
        if (String(item.tipo_projeto_id) !== String(tipoProjetoId)) return item;
        return {
          ...item,
          plano_pagamentos: (item.plano_pagamentos || []).filter((_, pagIndex) => pagIndex !== index),
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

  useEffect(() => {
    const idsAtivos = tiposProjetoSelecionados.map((item) => String(item.id));
    const idsOrdenadosDefault = [...tiposProjetoSelecionados]
      .sort((a, b) => String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-PT"))
      .map((item) => String(item.id));

    setOrdemTiposServico((previous) => {
      const prev = Array.isArray(previous) ? previous : [];
      const filtrados = prev.filter((id) => idsAtivos.includes(id));
      const faltantes = idsOrdenadosDefault.filter((id) => !filtrados.includes(id));
      return [...filtrados, ...faltantes];
    });
  }, [tiposProjetoSelecionados]);

  useEffect(() => {
    const idsAtivos = tiposProjetoSelecionados.map((item) => String(item.id));
    setTiposServicoColapsados((previous) => {
      const next = {};
      idsAtivos.forEach((id) => {
        next[id] = Object.prototype.hasOwnProperty.call(previous, id) ? !!previous[id] : false;
      });
      return next;
    });
  }, [tiposProjetoSelecionados]);

  const tiposProjetoOrdenadosPorServico = useMemo(() => {
    const base = [...tiposProjetoSelecionados];
    if (!ordemTiposServico.length) {
      return base.sort((a, b) => String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-PT"));
    }

    return base.sort((a, b) => {
      const ia = ordemTiposServico.indexOf(String(a.id));
      const ib = ordemTiposServico.indexOf(String(b.id));

      if (ia === -1 && ib === -1) {
        return String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-PT");
      }
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [tiposProjetoSelecionados, ordemTiposServico]);

  const servicosPorTipoProjeto = useMemo(() => {
    const grupos = tiposProjetoOrdenadosPorServico
      .map((tipo) => ({
        tipo,
        atividades: (modeloEstrutura || [])
          .filter((atividade) => String(atividade.tipo_projeto_id || "") === String(tipo.id))
          .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)),
      }))
      .filter((grupo) => grupo.atividades.length > 0);

    return grupos;
  }, [modeloEstrutura, tiposProjetoOrdenadosPorServico]);

  const hasTipoComPrograma = useMemo(
    () => tiposProjetoSelecionados.some((item) => item.tem_programa),
    [tiposProjetoSelecionados]
  );

  useEffect(() => {
    setOrcamentoTiposProjeto((previous) =>
      tiposProjetoOrdenadosPorServico.map((tipo, index) => {
        const existing = previous.find((item) => String(item.tipo_projeto_id) === String(tipo.id));
        if (existing) {
          return {
            ...existing,
            nome: tipo.nome,
            ordem: index + 1,
          };
        }

        return {
          ...normalizeOrcamentoTipoProjetoItem(
            {
              tipo_projeto_id: tipo.id,
              nome: tipo.nome,
              ordem: index + 1,
            },
            index,
            Number(tipo?.default_num_horas ?? DEFAULT_ORCAMENTO_HORAS),
            Number(tipo?.default_base_eur_hora ?? DEFAULT_ORCAMENTO_BASE_EUR)
          ),
          tipo_projeto_id: tipo.id,
          nome: tipo.nome,
          ordem: index + 1,
          plano_pagamentos: createPlanoPagamentoServico(),
        };
      })
    );
  }, [tiposProjetoOrdenadosPorServico]);

  const orcamentoLinhas = useMemo(() => {
    return orcamentoTiposProjeto.map((item, index) => {
      const valor = Number(item.valor || 0);
      const horas = Number(item.num_horas || 0);
      const base = Number(item.base_eur_hora || 0);

      return {
        id: item.tipo_projeto_id || `tipo-${index + 1}`,
        codigo: item.ordem || index + 1,
        nome: item.nome,
        valor,
        honorarioLabel: `Num horas: ${decimalFormatter.format(horas)}h | Base: ${formatCurrency(base)}`,
        condicoes: "",
        plano_pagamentos: Array.isArray(item.plano_pagamentos) ? item.plano_pagamentos : [],
      };
    });
  }, [orcamentoTiposProjeto]);

  const totais = useMemo(() => {
    const totalSemIva = orcamentoLinhas.reduce((accumulator, linha) => accumulator + linha.valor, 0);
    const iva = Number(proposta.iva || 23);
    const totalIva = totalSemIva * (iva / 100);
    const totalComIva = totalSemIva + totalIva;

    return { totalSemIva, totalIva, totalComIva, iva };
  }, [orcamentoLinhas, proposta.iva]);

  const planoPagamentosConsolidado = useMemo(
    () =>
      orcamentoTiposProjeto.flatMap((item) =>
        (item.plano_pagamentos || []).map((pagamento) => ({
          servico_id: item.tipo_projeto_id,
          servico_nome: item.nome,
          percentagem: Number(pagamento.percentagem || 0),
          descricao: pagamento.descricao || "",
          dias_apos_aceite: Number(pagamento.dias_apos_aceite || 0),
        }))
      ),
    [orcamentoTiposProjeto]
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
    tipo_projeto: tiposProjetoSelecionados[0] || INITIAL_TIPO_PROJETO,
    tipos_projeto: tiposProjetoSelecionados,
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
      tipos_projeto: orcamentoTiposProjeto,
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
    setTiposProjetoSelecionados([]);
    setPrograma(null);
    setProposta(INITIAL_PROPOSTA);
    setCondicoesGerais(INITIAL_CONDICOES_GERAIS);
    setServicos(initialServicos());
    setModeloEstrutura([]);
    setOrcamentoTiposProjeto([]);
    setNotasExclusoes(initialNotas());
    setPlanoPagamentos(INITIAL_PLANO_PAGAMENTOS);
    setContatosConsultora([]);
    setContatosCliente([]);
    setOrdemTiposServico([]);
    setDragTipoProjetoId("");
    setDragAutoExpandTipoProjetoId("");
    setTiposServicoColapsados({});
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

  const consultoraDadosReadOnly = Boolean(empresaConsultora.id);
  const clienteDadosReadOnly = Boolean(cliente.id);

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
              <div className="card-inner">
                <div className="section-heading">Dados da Empresa Consultora</div>
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

                  <div className="field">
                    <label>Pessoa da consultora (responsável)</label>
                    <select
                      value={empresaConsultora.signatario_id || ""}
                      onChange={(e) => selectContatoConsultora(e.target.value)}
                      disabled={!empresaConsultora.id}
                    >
                      <option value="">
                        {!empresaConsultora.id
                          ? "Seleciona primeiro a empresa"
                          : contatosConsultora.length > 0
                            ? "—"
                            : "Sem pessoas registadas para esta consultora"}
                      </option>
                      {contatosConsultora.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                    {empresaConsultora.id && contatosConsultora.length === 0 && (
                      <div className="field-hint">Adiciona pessoas em Clientes - aba Pessoas da empresa consultora.</div>
                    )}
                  </div>

                  <div className="field">
                    <label>NIPC</label>
                    <input type="text" value={empresaConsultora.nipc} onChange={setField(setEmpresaConsultora, "nipc")} readOnly={consultoraDadosReadOnly} placeholder="ex. 503 495 140" />
                  </div>
                  <div className="field">
                    <label>Morada completa</label>
                    <input type="text" value={empresaConsultora.morada} onChange={setField(setEmpresaConsultora, "morada")} readOnly={consultoraDadosReadOnly} placeholder="ex. Rua Horta Machado, 2 – 8000-362 Faro" />
                  </div>
                  <div className="field">
                    <label>Telefone</label>
                    <input type="text" value={empresaConsultora.telefone} onChange={setField(setEmpresaConsultora, "telefone")} readOnly={consultoraDadosReadOnly} placeholder="ex. 289 098 720" />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={empresaConsultora.email} onChange={setField(setEmpresaConsultora, "email")} readOnly={consultoraDadosReadOnly} placeholder="ex. info@consultora.pt" />
                  </div>
                  <div className="field">
                    <label>Website</label>
                    <input type="text" value={empresaConsultora.website} onChange={setField(setEmpresaConsultora, "website")} readOnly={consultoraDadosReadOnly} placeholder="ex. www.consultora.pt" />
                  </div>
                  <div className="field">
                    <label>Cargo do signatário</label>
                    <input type="text" value={empresaConsultora.cargo_signatario} onChange={setField(setEmpresaConsultora, "cargo_signatario")} readOnly={consultoraDadosReadOnly} placeholder="ex. Diretor" />
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
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section className="card propostas-section">
              <div className="section-heading">2 · Cliente</div>

              <div className="card-inner">
                <div className="section-heading">Dados do Cliente</div>
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
                  <div className="field">
                    <label>NIPC</label>
                    <input type="text" value={cliente.nipc || ""} onChange={setField(setCliente, "nipc")} readOnly={clienteDadosReadOnly} placeholder="ex. 507 123 456" />
                  </div>
                  <div className="field">
                    <label>Morada</label>
                    <input type="text" value={cliente.morada || ""} onChange={setField(setCliente, "morada")} readOnly={clienteDadosReadOnly} placeholder="ex. Rua da Liberdade, 10 – 8000-000 Faro" />
                  </div>
                  <div className="field">
                    <label>Distrito / Cidade</label>
                    <input type="text" value={cliente.distrito_cidade || ""} onChange={setField(setCliente, "distrito_cidade")} readOnly={clienteDadosReadOnly} placeholder="ex. Faro" />
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
                    <label>Cargo</label>
                    <input type="text" value={cliente.contacto_cargo || ""} onChange={setField(setCliente, "contacto_cargo")} readOnly={clienteDadosReadOnly} placeholder="ex. Gerente" />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={cliente.contacto_email || ""} onChange={setField(setCliente, "contacto_email")} readOnly={clienteDadosReadOnly} placeholder="ex. agomes@empresa.pt" />
                  </div>
                  <div className="field">
                    <label>Telefone</label>
                    <input type="text" value={cliente.contacto_telefone || ""} onChange={setField(setCliente, "contacto_telefone")} readOnly={clienteDadosReadOnly} placeholder="ex. 289 000 000" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section className="card propostas-section">
              <div className="section-heading">3 · Tipo de Projeto e Programa</div>

              <div className="card-inner">
                <div className="field-grid">
                  <div className="field span-2">
                    <label>Tipos de projeto (podes escolher um ou mais)</label>
                    <div className="propostas-pill-list" style={{ marginTop: "8px" }}>
                      {tiposProj.map((tipo) => {
                        const selected = tiposProjetoSelecionados.some((item) => String(item.id) === String(tipo.id));
                        return (
                          <button
                            key={tipo.id}
                            type="button"
                            className={`btn-small ${selected ? "btn-primary" : ""}`}
                            onClick={() => toggleTipoProjeto(tipo.id)}
                          >
                            {selected ? "✓ " : ""}
                            {tipo.nome}
                          </button>
                        );
                      })}
                    </div>
                    <div className="field-hint">
                      O campo de programa desbloqueia quando pelo menos um tipo selecionado tiver programas.
                    </div>
                  </div>
                </div>
              </div>

              {tiposProjetoSelecionados.length > 0 ? (
                hasTipoComPrograma ? (
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
                      Nenhum dos tipos de projeto selecionados requer programa/aviso.
                    </div>
                  </div>
                )
              ) : (
                <div className="card-inner">
                  <div className="section-heading">Programa</div>
                  <div className="field-hint">
                    Seleciona pelo menos um tipo de projeto para desbloquear este passo.
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
                  </div>
                ) : (
                  servicosPorTipoProjeto.map((grupo, grupoIndex) => (
                    <div key={`grupo-${grupo.tipo.id}`} style={{ marginBottom: "18px" }}>
                      <div
                        className="card-inner"
                        style={{
                          marginBottom: "10px",
                          border: dragTipoProjetoId === String(grupo.tipo.id) ? "1px solid #93c5fd" : undefined,
                          background: dragTipoProjetoId === String(grupo.tipo.id) ? "#eff6ff" : undefined,
                          boxShadow: dragTipoProjetoId === String(grupo.tipo.id) ? "0 8px 24px rgba(59, 130, 246, 0.12)" : undefined,
                        }}
                        onDragEnter={() => handleDragEnterTipoServico(grupo.tipo.id)}
                        onDragOver={handleDragOverTipoServico}
                        onDrop={() => handleDropTipoServico(grupo.tipo.id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <button
                            type="button"
                            onClick={() => toggleCollapseTipoServico(grupo.tipo.id)}
                            aria-label={tiposServicoColapsados[String(grupo.tipo.id)] ? "Expandir" : "Colapsar"}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: "#475569",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              padding: 0,
                              flexShrink: 0,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = "#f8fafc";
                              e.currentTarget.style.borderColor = "#94a3b8";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = "#ffffff";
                              e.currentTarget.style.borderColor = "#cbd5e1";
                            }}
                          >
                            {tiposServicoColapsados[String(grupo.tipo.id)] ? (
                              // Ícone de Seta para a Direita (Recolhido)
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            ) : (
                              // Ícone de Seta para Baixo (Expandido)
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            )}
                          </button>

                          <div className="section-heading" style={{ marginBottom: "0", flex: 1 }}>
                            {grupo.tipo.nome}
                          </div>

                          <div
                            title="Arrastar"
                            draggable
                            onDragStart={() => handleDragStartTipoServico(grupo.tipo.id)}
                            onDragEnd={() => finalizeDragTipoServico()}
                            style={{
                              cursor: "grab",
                              padding: "8px 10px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "8px",
                              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                            }}
                          >
                            <span style={{ display: "inline-flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ width: "12px", height: "2px", background: "#6b7280", display: "block" }} />
                              <span style={{ width: "12px", height: "2px", background: "#6b7280", display: "block" }} />
                              <span style={{ width: "12px", height: "2px", background: "#6b7280", display: "block" }} />
                            </span>
                          </div>
                        </div>
                      </div>

                      {!tiposServicoColapsados[String(grupo.tipo.id)] && grupo.atividades.map((atividade, atividadeIndex) => (
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
                              <span className="propostas-service-code">{atividadeIndex + 1}</span>
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
                              style={{
                                marginRight: "10px",
                                padding: "10px 10px",
                                fontSize: "12px",
                                lineHeight: 1,
                                borderRadius: "900px",
                                whiteSpace: "nowrap",
                                alignSelf: "center"
                              }}
                            >
                              Remover atividade
                            </button>
                          </div>

                          {atividade.selecionado && (
                            <div className="propostas-service-body">
                              {(atividade.tarefas || []).length > 0 && (
                                <>
                                  <div className="section-subtitle" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                                    Tarefas incluídas
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
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {currentStep === 5 && (
            <section className="card propostas-section">
              <div className="section-heading">5 · Orçamento</div>
              <div className="field-grid field-grid-1">
                <div className="field">
                  <label>Taxa de IVA (%)</label>
                  <input type="number" value={proposta.iva || 23} onChange={setField(setProposta, "iva")} min="0" max="100" />
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Tipos de Projeto Selecionados</div>
                {orcamentoTiposProjeto.length > 0 ? (
                  orcamentoTiposProjeto.map((item) => {
                    const totalPercentagemPagamentos = getPlanoPagamentosTotalPercentagem(item.plano_pagamentos);
                    const podeAdicionarParcela = totalPercentagemPagamentos < 100;

                    return (
                    <div key={item.tipo_projeto_id} style={{ marginBottom: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ marginBottom: "10px" }}>
                        <strong>Tipo {item.ordem} — {item.nome || "Sem nome"}</strong>
                      </div>

                      <div className="field-grid field-grid-3" style={{ marginBottom: "8px" }}>
                        <div className="field">
                          <label>Num horas</label>
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={Number(item.num_horas || 0)}
                            onChange={(event) => updateOrcamentoTipoField(item.tipo_projeto_id, "num_horas", event.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>Base (EUR/h)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={Number(item.base_eur_hora || 0)}
                            onChange={(event) => updateOrcamentoTipoField(item.tipo_projeto_id, "base_eur_hora", event.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label>Total</label>
                          <input
                            type="text"
                            value={formatCurrency(Number(item.valor || 0))}
                            readOnly
                          />
                          <div className="field-hint">Total = Horas x Base</div>
                        </div>
                      </div>

                      <div className="section-subtitle" style={{ marginTop: "10px" }}>Plano de Pagamentos</div>
                      
                      <div style={{ overflowX: "auto", marginBottom: 12 }}>
                        <table className="propostas-pagamentos-tabela" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff" }}>
                          <thead>
                            <tr style={{ background: "#e7f0fa" }}>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Nº Parcela</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Data Emissão</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Trimestre</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>s/IVA (€)</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>IVA {proposta.iva || 23}% (€)</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>c/IVA (€)</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>%</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Descrição</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Dias após aceite</th>
                              <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(item.plano_pagamentos || []).map((pag, index) => {
                              const somaOutras = (item.plano_pagamentos || []).reduce(
                                (accumulator, pagamento, pagamentoIndex) =>
                                  pagamentoIndex === index
                                    ? accumulator
                                    : accumulator + Number(pagamento?.percentagem || 0),
                                0
                              );
                              const maxAtual = Math.max(0, 100 - somaOutras);
                              const percentagemAtual = Number(pag.percentagem || 0);
                              const valorParcela = Number(item.valor || 0) * (percentagemAtual / 100);
                              const valorIvaParcela = valorParcela * (Number(proposta.iva || 23) / 100);
                              const totalParcela = valorParcela + valorIvaParcela;

                              // Data Emissão
                              let dataBase = proposta.data_aceite ? new Date(proposta.data_aceite) : new Date();
                              if (isNaN(dataBase.getTime())) dataBase = new Date();
                              const dataEmissao = new Date(dataBase.getTime() + Number(pag.dias_apos_aceite || 0) * 24 * 60 * 60 * 1000);
                              const dataEmissaoStr = dataEmissao.toLocaleDateString("pt-PT", { month: "short", year: "numeric" });

                              // Trimestre
                              const mes = dataEmissao.getMonth();
                              const trimestre = `Q${Math.floor(mes / 3) + 1}-${dataEmissao.getFullYear()}`;

                              return (
                                <tr key={`${item.tipo_projeto_id}-pag-${index}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                  <td style={{ textAlign: "center", padding: "6px 8px" }}>{index + 1}/{item.plano_pagamentos.length}</td>
                                  <td style={{ textAlign: "center", padding: "6px 8px" }}>{dataEmissaoStr}</td>
                                  <td style={{ textAlign: "center", padding: "6px 8px" }}>{trimestre}</td>
                                  <td style={{ textAlign: "right", padding: "6px 8px" }}>{formatCurrency(valorParcela)}</td>
                                  <td style={{ textAlign: "right", padding: "6px 8px" }}>{formatCurrency(valorIvaParcela)}</td>
                                  <td style={{ textAlign: "right", padding: "6px 8px" }}>{formatCurrency(totalParcela)}</td>
                                  <td style={{ textAlign: "center", padding: "6px 8px", minWidth: 70 }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxAtual}
                                      value={Number(pag.percentagem || 0)}
                                      onChange={(e) => updatePagamentoTipoProjeto(item.tipo_projeto_id, index, "percentagem", e.target.value)}
                                      placeholder="0"
                                      style={{ width: 60, minWidth: 60, textAlign: "center", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}
                                    />
                                  </td>
                                  <td style={{ padding: "6px 8px", minWidth: 120 }}>
                                    <input
                                      type="text"
                                      value={pag.descricao || ""}
                                      onChange={(e) => updatePagamentoTipoProjeto(item.tipo_projeto_id, index, "descricao", e.target.value)}
                                      placeholder="ex. Adjudicação"
                                      style={{ width: "100%" }}
                                    />
                                  </td>
                                  <td style={{ textAlign: "center", padding: "6px 8px", minWidth: 80 }}>
                                    <input
                                      type="number"
                                      min="0"
                                      value={Number(pag.dias_apos_aceite || 0)}
                                      onChange={(e) => updatePagamentoTipoProjeto(item.tipo_projeto_id, index, "dias_apos_aceite", e.target.value)}
                                      placeholder="0"
                                      style={{ width: 60, textAlign: "center" }}
                                    />
                                  </td>
                                  <td style={{ textAlign: "center", padding: "6px 8px" }}>
                                    <button type="button" className="btn-small" onClick={() => removePagamentoTipoProjeto(item.tipo_projeto_id, index)}>
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Totais */}
                            <tr style={{ background: "#f3f4f6", fontWeight: 600 }}>
                              <td colSpan={3} style={{ textAlign: "right", padding: "6px 8px" }}>Totais</td>
                              <td style={{ textAlign: "right", padding: "6px 8px" }}>
                                {formatCurrency((item.plano_pagamentos || []).reduce((acc, pag) => acc + Number(item.valor || 0) * (Number(pag.percentagem || 0) / 100), 0))}
                              </td>
                              <td style={{ textAlign: "right", padding: "6px 8px" }}>
                                {formatCurrency((item.plano_pagamentos || []).reduce((acc, pag) => acc + (Number(item.valor || 0) * (Number(pag.percentagem || 0) / 100)) * (Number(proposta.iva || 23) / 100), 0))}
                              </td>
                              <td style={{ textAlign: "right", padding: "6px 8px" }}>
                                {formatCurrency((item.plano_pagamentos || []).reduce((acc, pag) => acc + (Number(item.valor || 0) * (Number(pag.percentagem || 0) / 100)) * (1 + (Number(proposta.iva || 23) / 100)), 0))}
                              </td>
                              <td colSpan={4}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div
                        className="field-hint"
                        style={{
                          marginBottom: "8px",
                          color: totalPercentagemPagamentos === 100 ? "#047857" : "#b45309",
                        }}
                      >
                        Total parcelas: {Number(totalPercentagemPagamentos.toFixed(2))}% {totalPercentagemPagamentos === 100 ? "(OK)" : "(deve ser 100%)"}
                      </div>
                      <button
                        type="button"
                        className="btn-soft-cta"
                        onClick={() => addPagamentoTipoProjeto(item.tipo_projeto_id)}
                        disabled={!podeAdicionarParcela}
                      >
                        Adicionar parcela
                      </button>
                    </div>
                    );
                  })
                ) : (
                  <div className="muted">Seleciona pelo menos um tipo de projeto no passo 3.</div>
                )}
              </div>

              <div className="propostas-totals">
                <div className="total-card" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>Total s/ IVA</span>
                  <strong>{formatCurrency(totais.totalSemIva)}</strong>
                </div>
                <div className="total-card" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>IVA</span>
                  <strong>{formatCurrency(totais.totalIva)}</strong>
                </div>
                <div className="total-card total-card-accent" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>Total c/ IVA</span>
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
                    {tiposProjetoSelecionados.length > 0
                      ? tiposProjetoSelecionados.map((item) => item.nome).join(" + ")
                      : "—"}
                    {programa ? ` · ${programa.nome}` : ""} · {formatDatePt(proposta.data)}
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
                  <div className="summary-label">Tipos de Projeto</div>
                  <div className="summary-value">
                    {tiposProjetoSelecionados.length > 0
                      ? tiposProjetoSelecionados.map((item) => item.nome).join(", ")
                      : "—"}
                  </div>
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
                <div style={{ marginBottom: "16px" }}>
                  {orcamentoLinhas.map((l) => (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div>
                        <strong>Módulo {l.codigo}</strong><br />
                        <span className="muted">{l.nome}</span>
                      </div>
                      <div style={{ minWidth: 100, textAlign: "right", fontWeight: 500, fontSize: 18, color: "#222" }}>
                        {formatCurrency(l.valor)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="propostas-totals">
                <div className="total-card" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>Total s/ IVA</span>
                  <strong>{formatCurrency(totais.totalSemIva)}</strong>
                </div>
                <div className="total-card" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>IVA</span>
                  <strong>{formatCurrency(totais.totalIva)}</strong>
                </div>
                <div className="total-card total-card-accent" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>Total c/ IVA</span>
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
