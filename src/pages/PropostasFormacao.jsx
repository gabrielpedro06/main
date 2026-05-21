import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { generateFormacaoPDF } from "../components/pdfFormacaoGenerator";
import "./../styles/dashboard.css";

const stepTitles = [
  "Empresa Consultora",
  "Cliente",
  "Cursos",
  "Condições",
  "Revisão",
];

const PROPOSTA_ESTADOS = [
  { value: "em_preparacao", label: "Em preparação" },
  { value: "revisao", label: "Revisão" },
  { value: "enviada", label: "Enviada" },
  { value: "analise", label: "Análise" },
  { value: "ganha", label: "Ganha" },
  { value: "perdida", label: "Perdida" },
];

const INITIAL_EMPRESA = {
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
  termos_gerais: "",
};

const INITIAL_CLIENTE = {
  id: "",
  nome: "",
  nipc: "",
  morada: "",
  distrito_cidade: "",
  contacto_id: "",
  contacto_nome: "",
  contacto_email: "",
  contacto_telefone: "",
};

const INITIAL_PROPOSTA = {
  db_id: "",
  numero: "",
  data: new Date().toISOString().slice(0, 10),
  validade: 30,
  estado: "em_preparacao",
  iva: 23,
};

const INITIAL_CONDICOES = {
  compromisso: "",
  esperamos_que_corresponda: "",
  para_aprovacao: "",
  apresentacao_empresa: "",
  areas_formacao: "",
  proposta_formacao: "",
  descricao_servico: "",
  enquadramento: "",
  objetivos: "",
  metodologia: "",
  honorarios: "",
  nota_honorarios: "",
  plano_pagamento: "",
  obrigacoes_consultora: "",
  obrigacoes_cliente: "",
  condicoes_realizacao: "",
  coordenacao_formacao: "",
  imagem_certificacoes: "",
  termos_gerais: "",
  notas: "",
};

const currencyFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const normalizeCliente = (item = {}) => ({
  ...item,
  nome: item.marca || item.nome || "",
  nipc: item.nipc || item.nif || "",
  sigla: item.sigla || (item.marca || item.nome || "").substring(0, 3).toUpperCase(),
  morada: item.morada || "",
  distrito_cidade: item.distrito_cidade || "",
});

const buildMoradaCompleta = (morada) => {
  if (!morada) return "";
  return [
    morada.morada || morada.endereco || "",
    morada.codigo_postal || "",
    morada.localidade || morada.cidade || "",
    morada.concelho || "",
    morada.distrito || "",
  ]
    .filter(Boolean)
    .join(" - ");
};

const getDistritoCidade = (morada) => {
  if (!morada) return "";
  return [morada.localidade || morada.cidade || "", morada.distrito || morada.concelho || ""]
    .filter(Boolean)
    .join(" / ");
};

const setField = (setter, field) => (event) => {
  const value = event.target.value;
  setter((previous) => ({ ...previous, [field]: value }));
};

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

const getCursoValor = (curso = {}) =>
  Number(curso.valor || curso.preco || curso.preco_base || curso.valor_servico || curso.honorario_valor || 0);

const parseHoras = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(",", ".");
    if (!normalized) return 0;
    const match = normalized.match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) || 0 : 0;
  }
  return 0;
};

const extractModuloHoras = (modulo = {}) =>
  parseHoras(
    modulo.duracao_horas ??
      modulo.duracao ??
      modulo.horas ??
      modulo.hora ??
      modulo.carga_horaria ??
      modulo.cargaHoraria ??
      modulo.duracaoHoras ??
      0
  );

const normalizeModulosArray = (arr = []) =>
  arr.map((modulo, index) => ({
    ...modulo,
    ordem: modulo.ordem ?? index,
    duracao_horas: extractModuloHoras(modulo),
    nome: modulo.nome || modulo.titulo || "",
  }));

const normalizeModulos = (value) => {
  // Alguns registos antigos podem vir em formatos diferentes:
  // array direto, string JSON, string JSON dentro de string, ou objeto com `modulos`.
  if (Array.isArray(value)) return normalizeModulosArray(value);

  if (value && typeof value === "object" && Array.isArray(value.modulos)) {
    return normalizeModulosArray(value.modulos);
  }

  if (typeof value === "string") {
    const trimmed = String(value).trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeModulosArray(parsed);
      if (typeof parsed === "string") return normalizeModulos(parsed);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.modulos)) {
        return normalizeModulosArray(parsed.modulos);
      }
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const normalizeCurso = (curso = {}) => {
  const modulos = normalizeModulos(curso.modulos);
  const horasModulos = modulos.length > 0
    ? modulos.reduce((acc, m) => acc + extractModuloHoras(m), 0)
    : 0;

  return {
    ...curso,
    duracao_horas: horasModulos > 0 ? horasModulos : parseHoras(curso.duracao_horas),
    texto_enquadramento: curso.texto_enquadramento || "",
    objetivos_pedagogicos: curso.objetivos_pedagogicos || "",
    metodologia: curso.metodologia || "",
    honorarios_texto: curso.honorarios_texto || "",
    plano_pagamento: curso.plano_pagamento || "",
    valor: Number(curso.valor ?? curso.preco ?? curso.valor_servico ?? 0),
    consideracoes: curso.consideracoes || "",
    modulos,
  };
};

const getCursoHoras = (curso = {}) => {
  const modulos = normalizeModulos(curso.modulos);
  // Se há módulos, soma as horas deles
  if (Array.isArray(modulos) && modulos.length > 0) {
    const totalModulos = modulos.reduce((acc, modulo) => {
      const horas = extractModuloHoras(modulo);
      return acc + horas;
    }, 0);
    if (totalModulos > 0) return totalModulos;
  }
  // Fallback para a duração do curso
  return parseHoras(curso.duracao_horas);
};

const joinCursoTexts = (cursos, field) =>
  cursos
    .map((curso) => String(curso?.[field] || "").trim())
    .filter(Boolean)
    .join("\n\n");

const buildCondicoesFromCursos = (cursosSelecionados, previous = {}) => ({
  ...previous,
  enquadramento: joinCursoTexts(cursosSelecionados, "texto_enquadramento"),
  objetivos: joinCursoTexts(cursosSelecionados, "objetivos_pedagogicos"),
  metodologia: joinCursoTexts(cursosSelecionados, "metodologia"),
  honorarios: joinCursoTexts(cursosSelecionados, "honorarios_texto"),
  // Não sobrepor o plano de pagamento com textos dos cursos.
  // O `plano_pagamento` deverá vir das configurações da entidade (entidade_configuracoes)
  // ou do valor previamente definido em `previous`.
  plano_pagamento: previous.plano_pagamento || "",
});

export default function PropostasFormacao({ propostaId, initialEmpresaConsultoraId = "", onEmpresaConsultoraChange }) {
  const { id: paramPropostaId } = useParams();
  const actualPropostaId = propostaId || paramPropostaId;

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [empresasConsultoras, setEmpresasConsultoras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [contatosConsultora, setContatosConsultora] = useState([]);
  const [contatosCliente, setContatosCliente] = useState([]);

  const [empresaConsultora, setEmpresaConsultora] = useState(INITIAL_EMPRESA);
  const [cliente, setCliente] = useState(INITIAL_CLIENTE);
  const [cursosSelecionados, setCursosSelecionados] = useState([]);
  const [expandedCursos, setExpandedCursos] = useState({});
  const [editingModulo, setEditingModulo] = useState(null); // { cursoId, index }
  const [proposta, setProposta] = useState(INITIAL_PROPOSTA);
  const [condicoes, setCondicoes] = useState(INITIAL_CONDICOES);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const { data: consultoras, error: consultorasError } = await supabase
          .from("clientes")
          .select("*")
          .eq("tem_cursos", true)
          .eq("ativo", true)
          .order("marca", { ascending: true });

        if (consultorasError) throw consultorasError;

        const { data: clientesData, error: clientesError } = await supabase
          .from("clientes")
          .select("*")
          .eq("ativo", true)
          .order("marca", { ascending: true });

        if (clientesError) throw clientesError;

        const { data: cursosData, error: cursosError } = await supabase
          .from("cursos")
          .select("*")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (cursosError) throw cursosError;

        setEmpresasConsultoras((consultoras || []).map(normalizeCliente));
        setClientes((clientesData || []).map(normalizeCliente));
        setCursos((cursosData || []).map(normalizeCurso));
      } catch (error) {
        console.error("Erro ao carregar dados de formação:", error);
        showToast("Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    };

    void loadInitialData();
  }, []);

  useEffect(() => {
    if (isLoading || !initialEmpresaConsultoraId || empresaConsultora.id || empresasConsultoras.length === 0) return;
    selectEmpresaConsultora(initialEmpresaConsultoraId);
  }, [isLoading, initialEmpresaConsultoraId, empresaConsultora.id, empresasConsultoras]);

  useEffect(() => {
    if (isLoading || !actualPropostaId || empresasConsultoras.length === 0 || clientes.length === 0) return;
    void loadPropostaExistente();
  }, [isLoading, actualPropostaId, empresasConsultoras, clientes, cursos]);

  const totais = useMemo(() => {
    const totalSemIva = cursosSelecionados.reduce((acc, curso) => acc + getCursoValor(curso), 0);
    const totalIva = totalSemIva * (Number(proposta.iva || 23) / 100);
    return {
      totalSemIva,
      totalIva,
      totalComIva: totalSemIva + totalIva,
      horas: cursosSelecionados.reduce((acc, curso) => acc + getCursoHoras(curso), 0),
    };
  }, [cursosSelecionados, proposta.iva]);

  useEffect(() => {
    setCondicoes((previous) => buildCondicoesFromCursos(cursosSelecionados, previous));
  }, [cursosSelecionados]);

  function showToast(message) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2500);
  }

  async function loadPropostaExistente() {
    setIsLoadingDb(true);
    try {
      const { data, error } = await supabase
        .from("propostas_comerciais")
        .select(`
          *,
          proposta_cursos (
            id,
            curso_id,
            duracao_horas,
            modulos_customizados,
            ordem
          )
        `)
        .eq("id", actualPropostaId)
        .single();

      if (error) throw error;
      if (!data) return;

      const payload = typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload || {};
      setProposta({
        ...INITIAL_PROPOSTA,
        db_id: data.id || "",
        numero: data.numero_proposta_str || payload?.proposta?.numero || "",
        data: payload?.proposta?.data || payload?.data || INITIAL_PROPOSTA.data,
        validade: payload?.proposta?.validade || payload?.validade || 30,
        estado: data.estado || payload?.proposta?.estado || "em_preparacao",
        iva: payload?.proposta?.iva || payload?.iva || 23,
      });

      const consultora = empresasConsultoras.find((item) => String(item.id) === String(data.empresa_consultora_id));
      if (consultora) selectEmpresaConsultora(consultora.id);

      const clienteData = clientes.find((item) => String(item.id) === String(data.cliente_id));
      if (clienteData) selectCliente(clienteData.id);

      setCondicoes({
        ...INITIAL_CONDICOES,
        ...(payload?.condicoes_formacao || {}),
      });

      // Garantir que o plano de pagamento carregado privilegia o texto da entidade
      // (caso exista), em vez do texto vindo dos cursos.
      try {
        const { data: configData } = await supabase
          .from("entidade_configuracoes")
          .select("texto_plano_pagamento")
          .eq("cliente_id", data.empresa_consultora_id)
          .maybeSingle();
        const textoPlano = configData?.texto_plano_pagamento || "";
        if (textoPlano) {
          setCondicoes((previous) => ({ ...previous, plano_pagamento: textoPlano }));
        }
      } catch (err) {
        console.warn("Erro ao carregar texto_plano_pagamento ao abrir proposta:", err);
      }

      if (Array.isArray(data.proposta_cursos)) {
        setCursosSelecionados(
          data.proposta_cursos
            .map((item) => {
              const curso = cursos.find((cursoItem) => String(cursoItem.id) === String(item.curso_id));
              return curso
                ? {
                    ...curso,
                    duracao_horas: item.duracao_horas || curso.duracao_horas,
                    modulos: normalizeModulos(item.modulos_customizados || curso.modulos),
                    ordem: item.ordem,
                  }
                : null;
            })
            .filter(Boolean)
            .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
        );
      } else if (Array.isArray(payload?.cursos)) {
        setCursosSelecionados(payload.cursos.map(normalizeCurso));
      }
    } catch (error) {
      console.error("Erro ao carregar proposta de formação:", error);
      showToast("Erro ao carregar proposta");
    } finally {
      setIsLoadingDb(false);
    }
  }

  async function carregarDadosConsultora(consultoraId, baseConsultora = null) {
    if (!consultoraId) {
      setContatosConsultora([]);
      return;
    }

    try {
      const [moradaResult, contactosResult, configResult] = await Promise.all([
        supabase
          .from("moradas_cliente")
          .select("*")
          .eq("cliente_id", consultoraId),
        supabase
          .from("contactos_cliente")
          .select("*")
          .eq("cliente_id", consultoraId),
        supabase
          .from("entidade_configuracoes")
          .select("*")
          .eq("cliente_id", consultoraId)
          .maybeSingle(),
      ]);

      const moradaDefault = (moradaResult.data || [])[0] || null;
      const contactos = (contactosResult.data || []).map((contacto) => ({
        id: contacto.id,
        nome: contacto.nome_contacto || contacto.nome || "",
        cargo: contacto.cargo || "",
        email: contacto.email || "",
        telefone: contacto.telefone || "",
      }));
      const contactoDefault = contactos.find((contacto) => String(contacto.id) === String(baseConsultora?.signatario_id)) || contactos[0] || null;
      const config = configResult.data || {};

      setContatosConsultora(contactos);
      setEmpresaConsultora((previous) => ({
        ...previous,
        morada: buildMoradaCompleta(moradaDefault) || previous.morada || "",
        signatario_id: contactoDefault?.id || previous.signatario_id || "",
        nome_signatario: contactoDefault?.nome || config.signatario_nome || previous.nome_signatario || "",
        cargo_signatario: contactoDefault?.cargo || config.signatario_cargo || previous.cargo_signatario || "",
        telefone: previous.telefone || config.signatario_telefone || contactoDefault?.telefone || "",
        email: previous.email || config.signatario_email || contactoDefault?.email || "",
      }));

      setCondicoes((previous) => ({
        ...previous,
        compromisso: config.texto_compromisso || previous.compromisso || "",
        esperamos_que_corresponda: config.texto_esperamos_que_corresponda || previous.esperamos_que_corresponda || "",
        para_aprovacao: config.texto_para_aprovacao || previous.para_aprovacao || "",
        apresentacao_empresa: config.texto_apresentacao_empresa_formacao || previous.apresentacao_empresa || "",
        areas_formacao: config.texto_areas_formacao || previous.areas_formacao || "",
        proposta_formacao: config.texto_proposta_formacao || previous.proposta_formacao || "",
        descricao_servico: config.texto_descricao_servico || previous.descricao_servico || "",
        obrigacoes_consultora: config.texto_obrigacoes_consultora || previous.obrigacoes_consultora || "",
        obrigacoes_cliente: config.texto_obrigacoes_cliente || previous.obrigacoes_cliente || "",
        condicoes_realizacao: config.texto_condicoes_realizacao || previous.condicoes_realizacao || "",
        coordenacao_formacao: config.texto_coordenacao_formacao || previous.coordenacao_formacao || "",
        nota_honorarios: config.texto_nota_honorarios || previous.nota_honorarios || "",
        plano_pagamento: previous.plano_pagamento || config.texto_plano_pagamento || "",
        notas: config.texto_exclusoes || previous.notas || "",
        imagem_certificacoes: config.imagem_certificacoes || previous.imagem_certificacoes || "",
        termos_gerais: baseConsultora?.termos_gerais || previous.termos_gerais || "",
      }));
    } catch (error) {
      console.error("Erro ao carregar dados da consultora:", error);
      setContatosConsultora([]);
    }
  }

  async function carregarDadosCliente(clienteId) {
    if (!clienteId) {
      setContatosCliente([]);
      return;
    }

    try {
      const [moradaResult, contactosResult] = await Promise.all([
        supabase
          .from("moradas_cliente")
          .select("*")
          .eq("cliente_id", clienteId),
        supabase
          .from("contactos_cliente")
          .select("*")
          .eq("cliente_id", clienteId)
          .eq("faz_propostas", true),
      ]);

      const moradaDefault = (moradaResult.data || [])[0] || null;
      const contactos = (contactosResult.data || []).map((contacto) => ({
        id: contacto.id,
        nome: contacto.nome_contacto || contacto.nome || "",
        cargo: contacto.cargo || "",
        email: contacto.email || "",
        telefone: contacto.telefone || "",
      }));
      const contactoDefault = contactos[0] || null;

      setContatosCliente(contactos);
      setCliente((previous) => ({
        ...previous,
        morada: buildMoradaCompleta(moradaDefault) || previous.morada || "",
        distrito_cidade: getDistritoCidade(moradaDefault) || previous.distrito_cidade || "",
        contacto_id: previous.contacto_id || contactoDefault?.id || "",
        contacto_nome: previous.contacto_nome || contactoDefault?.nome || "",
        contacto_email: previous.contacto_email || contactoDefault?.email || "",
        contacto_telefone: previous.contacto_telefone || contactoDefault?.telefone || "",
      }));
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
      setContatosCliente([]);
    }
  }

  function selectEmpresaConsultora(id) {
    const found = empresasConsultoras.find((item) => String(item.id) === String(id));
    if (!found) {
      setEmpresaConsultora(INITIAL_EMPRESA);
      return;
    }

    const empresaData = {
      id: found.id,
      nome: found.nome || "",
      nipc: found.nipc || "",
      sigla: found.sigla || "",
      morada: found.morada || "",
      telefone: found.telefone || found.telemovel || "",
      email: found.email || found.email_geral || "",
      website: found.website || "",
      signatario_id: "",
      nome_signatario: "",
      cargo_signatario: "",
      termos_gerais: found.termos_gerais || "",
    };

    setEmpresaConsultora(empresaData);
    setCondicoes((previous) => ({
      ...previous,
      termos_gerais: found.termos_gerais || previous.termos_gerais || "",
    }));
    if (onEmpresaConsultoraChange) onEmpresaConsultoraChange(found);
    void carregarDadosConsultora(found.id, empresaData);
  }

  function selectCliente(id) {
    const found = clientes.find((item) => String(item.id) === String(id));
    if (!found) {
      setCliente(INITIAL_CLIENTE);
      return;
    }

    setCliente({
      id: found.id,
      nome: found.nome || "",
      nipc: found.nipc || "",
      morada: found.morada || "",
      distrito_cidade: found.distrito_cidade || "",
      contacto_id: "",
      contacto_nome: found.contacto_nome || "",
      contacto_email: found.email || found.email_geral || "",
      contacto_telefone: found.telefone || found.telemovel || "",
    });
    void carregarDadosCliente(found.id);
  }

  function selectContatoConsultora(contactoId) {
    const contacto = contatosConsultora.find((item) => String(item.id) === String(contactoId));
    if (!contacto) return;
    setEmpresaConsultora((previous) => ({
      ...previous,
      signatario_id: contacto.id,
      nome_signatario: contacto.nome || "",
      cargo_signatario: contacto.cargo || "",
      telefone: contacto.telefone || previous.telefone || "",
      email: contacto.email || previous.email || "",
    }));
  }

  function selectContatoCliente(contactoId) {
    const contacto = contatosCliente.find((item) => String(item.id) === String(contactoId));
    if (!contacto) return;
    setCliente((previous) => ({
      ...previous,
      contacto_id: contacto.id,
      contacto_nome: contacto.nome || "",
      contacto_email: contacto.email || "",
      contacto_telefone: contacto.telefone || "",
    }));
  }

  function toggleCurso(cursoId) {
    const exists = cursosSelecionados.some((item) => String(item.id) === String(cursoId));
    if (exists) {
      setCursosSelecionados((previous) => previous.filter((item) => String(item.id) !== String(cursoId)));
      return;
    }

    const curso = cursos.find((item) => String(item.id) === String(cursoId));
    if (curso) {
      setCursosSelecionados((previous) => [...previous, { ...normalizeCurso(curso), ordem: previous.length + 1 }]);
    }
  }

  function toggleCursoModulos(cursoId) {
    setExpandedCursos((previous) => ({
      ...previous,
      [cursoId]: !previous[cursoId],
    }));
  }

  function updateCursoSelecionado(cursoId, field, value) {
    setCursosSelecionados((previous) =>
      previous.map((curso) =>
        String(curso.id) === String(cursoId)
          ? { ...curso, [field]: field === "duracao_horas" ? Number(value) || 0 : value }
          : curso
      )
    );
  }

  function updateModuloSelecionado(cursoId, moduloIndex, field, value) {
    setCursosSelecionados((previous) =>
      previous.map((curso) => {
        if (String(curso.id) !== String(cursoId)) return curso;

        const modulos = normalizeModulos(curso.modulos).map((modulo, index) => {
          if (index !== moduloIndex) return modulo;
          return {
            ...modulo,
            [field]: field === "duracao_horas" ? Number(value) || 0 : value,
          };
        });

        return { ...curso, modulos };
      })
    );
  }

  function removeCurso(cursoId) {
    setCursosSelecionados((previous) => previous.filter((item) => String(item.id) !== String(cursoId)));
    // Reset editingModulo if it was from this course
    if (editingModulo?.cursoId === cursoId) {
      setEditingModulo(null);
    }
  }

  function recolherDados() {
    return {
      tipo_proposta: "formacao",
      proposta: {
        ...proposta,
        tipo: "formacao",
      },
      empresa_consultora: empresaConsultora,
      cliente,
      cursos: cursosSelecionados.map((curso, index) => ({
        ...normalizeCurso(curso),
        ordem: curso.ordem || index + 1,
        valor: getCursoValor(curso),
        duracao_horas: getCursoHoras(curso),
      })),
      condicoes_formacao: condicoes,
      totais,
    };
  }

  async function gerarNumeroProposta(sigla, ano) {
    const { data, error } = await supabase
      .from("propostas_comerciais")
      .select("numero_proposta_str")
      .ilike("numero_proposta_str", `${sigla}-${ano}-%`)
      .order("numero_proposta_str", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const ultimoNumero = data?.numero_proposta_str || "";
    const ultimoSequencial = Number.parseInt(String(ultimoNumero).split("-").pop(), 10);
    const proximoNumero = Number.isFinite(ultimoSequencial) ? ultimoSequencial + 1 : 1;
    return `${sigla}-${ano}-${String(proximoNumero).padStart(3, "0")}`;
  }

  async function guardarCursosProposta(propostaDbId) {
    if (!propostaDbId) return;

    const { error: deleteError } = await supabase
      .from("proposta_cursos")
      .delete()
      .eq("proposta_id", propostaDbId);

    if (deleteError) throw deleteError;

    if (cursosSelecionados.length === 0) return;

    const rows = cursosSelecionados.map((curso, index) => ({
      proposta_id: propostaDbId,
      curso_id: curso.id,
      duracao_horas: getCursoHoras(curso),
      modulos_customizados: normalizeModulos(curso.modulos),
      ordem: index + 1,
    }));

    const { error: insertError } = await supabase
      .from("proposta_cursos")
      .insert(rows);

    if (insertError) throw insertError;
  }

  async function guardarPropostaEmBD({ silent = false } = {}) {
    if (!empresaConsultora.id || !cliente.id || cursosSelecionados.length === 0) {
      if (!silent) showToast("Preencha empresa consultora, cliente e pelo menos um curso.");
      return null;
    }

    setIsSavingDb(true);
    try {
      const sigla = empresaConsultora.sigla || "PRO";
      const ano = new Date().getFullYear();
      const payload = recolherDados();
      let numeroFinal = proposta.numero;
      let propostaDbId = proposta.db_id;

      if (propostaDbId) {
        const { data, error } = await supabase
          .from("propostas_comerciais")
          .update({
            numero_proposta_str: numeroFinal || null,
            sigla_empresa: sigla,
            empresa_consultora_id: empresaConsultora.id,
            cliente_id: cliente.id,
            contato_cliente_id: cliente.contacto_id || null,
            tipo_projeto_id: null,
            programa_id: null,
            estado: proposta.estado,
            payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", propostaDbId)
          .select("id, numero_proposta_str")
          .single();

        if (error) throw error;
        propostaDbId = data?.id || propostaDbId;
        numeroFinal = data?.numero_proposta_str || numeroFinal;
      } else {
        numeroFinal = numeroFinal || (await gerarNumeroProposta(sigla, ano));

        const { data, error } = await supabase
          .from("propostas_comerciais")
          .insert([
            {
              numero_proposta_str: numeroFinal,
              sigla_empresa: sigla,
              empresa_consultora_id: empresaConsultora.id,
              cliente_id: cliente.id,
              contato_cliente_id: cliente.contacto_id || null,
              tipo_projeto_id: null,
              programa_id: null,
              estado: proposta.estado,
              payload,
            },
          ])
          .select("id, numero_proposta_str")
          .single();

        if (error) throw error;
        propostaDbId = data?.id || "";
        numeroFinal = data?.numero_proposta_str || numeroFinal;
      }

      await guardarCursosProposta(propostaDbId);

      setProposta((previous) => ({
        ...previous,
        db_id: propostaDbId,
        numero: numeroFinal,
      }));

      if (!silent) showToast("Proposta guardada com sucesso!");
      return { db_id: propostaDbId, numero: numeroFinal };
    } catch (error) {
      console.error("Erro ao guardar proposta de formação:", error);
      if (!silent) showToast(`Erro ao guardar proposta: ${error.message || "ver consola"}`);
      return null;
    } finally {
      setIsSavingDb(false);
    }
  }

  async function gerarPDF() {
    if (!empresaConsultora.id || !cliente.id || cursosSelecionados.length === 0) {
      showToast("Preencha empresa consultora, cliente e pelo menos um curso.");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      // Guardar proposta primeiro se ainda não foi guardada
      let resultadoGuardar = null;
      if (!proposta.db_id) {
        resultadoGuardar = await guardarPropostaEmBD({ silent: true });
        if (!resultadoGuardar) {
          showToast("Erro ao guardar proposta antes de gerar PDF");
          return;
        }
      }

      // Gerar o PDF com os dados actuais
      await generateFormacaoPDF({
        propostaNumero: proposta.numero || resultadoGuardar?.numero,
        proposta,
        cliente,
        empresaConsultora,
        cursosSelecionados,
        condicoes,
        totais,
      });

      showToast("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      showToast(`Erro ao gerar PDF: ${error.message || "Ver consola"}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  function goStep(step) {
    setCurrentStep(Math.min(Math.max(step, 1), stepTitles.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setCurrentStep(1);
    setEmpresaConsultora(INITIAL_EMPRESA);
    setCliente(INITIAL_CLIENTE);
    setCursosSelecionados([]);
    setProposta(INITIAL_PROPOSTA);
    setCondicoes(INITIAL_CONDICOES);
    showToast("Formulário limpo.");
  }

  if (isLoading) return <div className="page-container">A carregar dados...</div>;
  if (isLoadingDb) return <div className="page-container">A carregar proposta...</div>;

  const consultoraDadosReadOnly = Boolean(empresaConsultora.id);
  const clienteDadosReadOnly = Boolean(cliente.id);

  return (
    <div className="page-container propostas-page">
      <div className="propostas-hero card">
        <div>
          <div className="propostas-kicker">Gerador de Propostas</div>
          <h1>Propostas Comerciais</h1>
          <p>Monta a proposta de formação por passos, seleciona cursos e revê os textos finais.</p>
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
                key={title}
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
            <div className="propostas-step-count">Passo {currentStep} de {stepTitles.length}</div>
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
                    <select value={empresaConsultora.id} onChange={(event) => selectEmpresaConsultora(event.target.value)}>
                      <option value="">-</option>
                      {empresasConsultoras.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Pessoa da consultora</label>
                    <select
                      value={empresaConsultora.signatario_id || ""}
                      onChange={(event) => selectContatoConsultora(event.target.value)}
                      disabled={!empresaConsultora.id}
                    >
                      <option value="">
                        {!empresaConsultora.id
                          ? "Seleciona primeiro a empresa"
                          : contatosConsultora.length > 0
                            ? "-"
                            : "Sem pessoas registadas"}
                      </option>
                      {contatosConsultora.map((contacto) => (
                        <option key={contacto.id} value={contacto.id}>{contacto.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>NIPC</label>
                    <input type="text" value={empresaConsultora.nipc} onChange={setField(setEmpresaConsultora, "nipc")} readOnly={consultoraDadosReadOnly} />
                  </div>
                  <div className="field">
                    <label>Morada completa</label>
                    <input type="text" value={empresaConsultora.morada} onChange={setField(setEmpresaConsultora, "morada")} readOnly={consultoraDadosReadOnly} />
                  </div>
                  <div className="field">
                    <label>Telefone</label>
                    <input type="text" value={empresaConsultora.telefone} onChange={setField(setEmpresaConsultora, "telefone")} readOnly={consultoraDadosReadOnly} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={empresaConsultora.email} onChange={setField(setEmpresaConsultora, "email")} readOnly={consultoraDadosReadOnly} />
                  </div>
                  <div className="field">
                    <label>Signatário</label>
                    <input type="text" value={empresaConsultora.nome_signatario || ""} onChange={setField(setEmpresaConsultora, "nome_signatario")} readOnly={consultoraDadosReadOnly} />
                  </div>
                  <div className="field">
                    <label>Cargo do signatário</label>
                    <input type="text" value={empresaConsultora.cargo_signatario || ""} onChange={setField(setEmpresaConsultora, "cargo_signatario")} readOnly={consultoraDadosReadOnly} />
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
                      readOnly
                      placeholder="Auto: SIGLA-2026-{id}"
                      value={proposta.numero || (empresaConsultora.sigla ? `${empresaConsultora.sigla}-${new Date().getFullYear()}-...` : "")}
                    />
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
                      {PROPOSTA_ESTADOS.map((estado) => (
                        <option key={estado.value} value={estado.value}>{estado.label}</option>
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
                    <select value={cliente.id} onChange={(event) => selectCliente(event.target.value)}>
                      <option value="">-</option>
                      {clientes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>NIPC</label>
                    <input type="text" value={cliente.nipc} onChange={setField(setCliente, "nipc")} readOnly={clienteDadosReadOnly} />
                  </div>
                  <div className="field">
                    <label>Morada</label>
                    <input type="text" value={cliente.morada} onChange={setField(setCliente, "morada")} readOnly={clienteDadosReadOnly} />
                  </div>
                  <div className="field">
                    <label>Distrito / Cidade</label>
                    <input type="text" value={cliente.distrito_cidade} onChange={setField(setCliente, "distrito_cidade")} readOnly={clienteDadosReadOnly} />
                  </div>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Contacto</div>
                <div className="field-grid">
                  <div className="field span-2">
                    <label>Selecionar Contacto</label>
                    <select
                      value={cliente.contacto_id || ""}
                      onChange={(event) => selectContatoCliente(event.target.value)}
                      disabled={!cliente.id}
                    >
                      <option value="">
                        {!cliente.id
                          ? "Seleciona primeiro o cliente"
                          : contatosCliente.length > 0
                            ? "-"
                            : "Sem contactos marcados para propostas"}
                      </option>
                      {contatosCliente.map((contacto) => (
                        <option key={contacto.id} value={contacto.id}>{contacto.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Nome</label>
                    <input type="text" value={cliente.contacto_nome} onChange={setField(setCliente, "contacto_nome")} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={cliente.contacto_email} onChange={setField(setCliente, "contacto_email")} />
                  </div>
                  <div className="field">
                    <label>Telefone</label>
                    <input type="text" value={cliente.contacto_telefone} onChange={setField(setCliente, "contacto_telefone")} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section className="card propostas-section">
              <div className="section-heading">3 · Cursos</div>

              <div className="card-inner">
                <div className="section-heading">Cursos disponíveis</div>
                {cursos.length === 0 ? (
                  <div className="muted">Sem cursos ativos registados.</div>
                ) : (
                  <div className="propostas-programas-grid">
                    {cursos.map((curso) => {
                      const selected = cursosSelecionados.some((item) => String(item.id) === String(curso.id));
                      return (
                        <button
                          key={curso.id}
                          type="button"
                          className={`propostas-programa-card ${selected ? "selected" : ""}`}
                          onClick={() => toggleCurso(curso.id)}
                          style={{
                            padding: "16px",
                            border: selected ? "2px solid #6366f1" : "1px solid #e5e7eb",
                            borderRadius: "12px",
                            background: selected ? "#f0f4ff" : "#f8f9fa",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div>
                              <h4 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#0f2240" }}>{curso.nome}</h4>
                              <div className="muted">{getCursoHoras(curso)} horas</div>
                              {getCursoValor(curso) > 0 && (
                                <div className="badge badge-success" style={{ marginTop: 10 }}>
                                  {formatCurrency(getCursoValor(curso))}
                                </div>
                              )}
                            </div>
                            <div className="summary-value">{selected ? "✓" : ""}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card-inner">
                <div className="section-heading">Cursos selecionados</div>
                {cursosSelecionados.length === 0 ? (
                  <div className="muted">Seleciona pelo menos um curso para continuar.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="propostas-pagamentos-tabela" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff" }}>
                      <thead>
                        <tr style={{ background: "#e7f0fa" }}>
                          <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>Curso</th>
                          <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>Horas</th>
                          <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>Valor</th>
                          <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cursosSelecionados.map((curso) => (
                          <tr key={curso.id}>
                            <td style={{ padding: "8px", border: "1px solid #e2e8f0" }}>{curso.nome}</td>
                                <td style={{ padding: "8px", border: "1px solid #e2e8f0", width: 120 }}>{getCursoHoras(curso)}h</td>
                            <td style={{ padding: "8px", border: "1px solid #e2e8f0", width: 140 }}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={getCursoValor(curso)}
                                onChange={(event) => updateCursoSelecionado(curso.id, "valor", event.target.value)}
                              />
                            </td>
                            <td style={{ padding: "8px", border: "1px solid #e2e8f0", textAlign: "center", width: 90 }}>
                              <button type="button" className="btn-small" onClick={() => removeCurso(curso.id)}>
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {cursosSelecionados.length > 0 && (
                <div className="card-inner">
                  <div className="section-heading">Conteudos dos Cursos</div>
                  {cursosSelecionados.map((curso) => {
                    const modulos = normalizeModulos(curso.modulos).sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
                    const isEditingAnyModuleOfThisCurso = editingModulo?.cursoId === curso.id;

                    return (
                      <div key={`${curso.id}-conteudos`} style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
                        <div className="section-subtitle" style={{ marginBottom: 12 }}>{curso.nome}</div>

                        {modulos.length > 0 && !isEditingAnyModuleOfThisCurso && (
                          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                            {modulos.map((modulo, index) => (
                              <div key={`${curso.id}-mod-${index}`} style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.92rem" }}>{modulo.nome || "Sem nome"}</div>
                                  <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 4, fontWeight: 700 }}>{Number(modulo.duracao_horas || 0)}h</div>
                                  {modulo.conteudo && <div style={{ color: "#64748b", fontSize: "0.84rem", marginTop: 4, lineHeight: 1.4 }}>{modulo.conteudo}</div>}
                                </div>
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => setEditingModulo({ cursoId: curso.id, index })}
                                    style={{ border: "1px solid #dbeafe", background: "#eff6ff", color: "#0284c7", borderRadius: 10, width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer" }}
                                    title="Editar módulo"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedModulos = modulos.filter((_, i) => i !== index);
                                      updateCursoSelecionado(curso.id, "modulos", updatedModulos);
                                      if (editingModulo?.cursoId === curso.id && editingModulo?.index === index) {
                                        setEditingModulo(null);
                                      }
                                    }}
                                    style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", borderRadius: 10, width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer" }}
                                    title="Remover módulo"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {isEditingAnyModuleOfThisCurso && (
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                            <div style={{ display: "grid", gap: 10 }}>
                              {modulos[editingModulo.index] && (
                                <>
                                  <div>
                                    <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Nome do módulo</label>
                                    <input
                                      type="text"
                                      value={modulos[editingModulo.index].nome || ""}
                                      onChange={(e) => {
                                        const updated = [...modulos];
                                        updated[editingModulo.index] = { ...updated[editingModulo.index], nome: e.target.value };
                                        updateCursoSelecionado(curso.id, "modulos", updated);
                                      }}
                                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #dbe3ef", borderRadius: 10, fontSize: "0.96rem" }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Duração (horas)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={Number(modulos[editingModulo.index].duracao_horas || 0)}
                                      onChange={(e) => {
                                        const updated = [...modulos];
                                        updated[editingModulo.index] = { ...updated[editingModulo.index], duracao_horas: Number(e.target.value) || 0 };
                                        updateCursoSelecionado(curso.id, "modulos", updated);
                                      }}
                                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #dbe3ef", borderRadius: 10, fontSize: "0.96rem" }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Conteúdo</label>
                                    <textarea
                                      value={modulos[editingModulo.index].conteudo || ""}
                                      onChange={(e) => {
                                        const updated = [...modulos];
                                        updated[editingModulo.index] = { ...updated[editingModulo.index], conteudo: e.target.value };
                                        updateCursoSelecionado(curso.id, "modulos", updated);
                                      }}
                                      rows={2}
                                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #dbe3ef", borderRadius: 10, fontSize: "0.96rem", resize: "vertical" }}
                                    />
                                  </div>
                                  <div style={{ display: "flex", gap: 10 }}>
                                    <button
                                      type="button"
                                      onClick={() => setEditingModulo(null)}
                                      style={{ flex: 1, border: "none", borderRadius: 10, padding: "10px 14px", background: "var(--color-btnPrimary)", color: "#fff", fontWeight: 800, cursor: "pointer" }}
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingModulo(null)}
                                      style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 14px", background: "#fff", color: "#0f172a", fontWeight: 800, cursor: "pointer" }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 12 }}>
                          <div style={{ marginBottom: 6, fontWeight: 600 }}>Considerações</div>
                          <textarea
                            rows={3}
                            style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0" }}
                            value={curso.consideracoes || ""}
                            onChange={(event) => updateCursoSelecionado(curso.id, "consideracoes", event.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="muted" style={{ marginTop: 12 }}>
                    A duração total do curso é calculada automaticamente pela soma dos módulos.
                  </div>
                </div>
              )}

              <div className="propostas-totals">
                <div className="total-card" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>Horas</span>
                  <strong>{totais.horas}</strong>
                </div>
                <div className="total-card" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>Total s/ IVA</span>
                  <strong>{formatCurrency(totais.totalSemIva)}</strong>
                </div>
                <div className="total-card total-card-accent" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ alignSelf: "flex-start" }}>Total c/ IVA</span>
                  <strong>{formatCurrency(totais.totalComIva)}</strong>
                </div>
              </div>
            </section>
          )}

          {currentStep === 4 && (
            <section className="card propostas-section">
              <div className="section-heading">4 · Condições</div>

              <div className="card-inner">
                <div className="section-heading">Textos da Entidade</div>
                <div className="field-grid field-grid-1">
                  <div className="field">
                    <label>Compromisso</label>
                    <textarea rows={3} value={condicoes.compromisso} onChange={setField(setCondicoes, "compromisso")} />
                  </div>
                  <div className="field">
                    <label>Para aprovação</label>
                    <textarea rows={3} value={condicoes.para_aprovacao} onChange={setField(setCondicoes, "para_aprovacao")} />
                  </div>
                  <div className="field">
                    <label>Esperamos que corresponda</label>
                    <textarea rows={3} value={condicoes.esperamos_que_corresponda} onChange={setField(setCondicoes, "esperamos_que_corresponda")} />
                  </div>
                  <div className="field">
                    <label>Apresentacao da empresa</label>
                    <textarea rows={5} value={condicoes.apresentacao_empresa} onChange={setField(setCondicoes, "apresentacao_empresa")} />
                  </div>
                  <div className="field">
                    <label>Áreas de formação</label>
                    <textarea rows={4} value={condicoes.areas_formacao} onChange={setField(setCondicoes, "areas_formacao")} />
                  </div>
                  <div className="field">
                    <label>Proposta de formação</label>
                    <textarea rows={4} value={condicoes.proposta_formacao} onChange={setField(setCondicoes, "proposta_formacao")} />
                  </div>
                  <div className="field">
                    <label>Descrição do serviço</label>
                    <textarea rows={4} value={condicoes.descricao_servico} onChange={setField(setCondicoes, "descricao_servico")} />
                  </div>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Textos dos Cursos</div>
                <div className="field-grid field-grid-1">
                  <div className="field">
                    <label>Enquadramento</label>
                    <textarea rows={5} value={condicoes.enquadramento} onChange={setField(setCondicoes, "enquadramento")} />
                  </div>
                  <div className="field">
                    <label>Objetivos pedagogicos</label>
                    <textarea rows={5} value={condicoes.objetivos} onChange={setField(setCondicoes, "objetivos")} />
                  </div>
                  <div className="field">
                    <label>Metodologia</label>
                    <textarea rows={5} value={condicoes.metodologia} onChange={setField(setCondicoes, "metodologia")} />
                  </div>
                  <div className="field">
                    <label>Honorarios</label>
                    <textarea rows={4} value={condicoes.honorarios} onChange={setField(setCondicoes, "honorarios")} />
                  </div>
                  <div className="field">
                    <label>Nota dos honorários</label>
                    <textarea rows={3} value={condicoes.nota_honorarios} onChange={setField(setCondicoes, "nota_honorarios")} placeholder='Os valores apresentados estão isentos de IVA. Proposta para um máx. 15 pax' />
                  </div>
                  <div className="field">
                    <label>Plano de pagamento</label>
                    <textarea rows={4} value={condicoes.plano_pagamento} onChange={setField(setCondicoes, "plano_pagamento")} />
                  </div>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Obrigações e Termos</div>
                <div className="field-grid field-grid-1">
                  <div className="field">
                    <label>Obrigações da consultora</label>
                    <textarea rows={4} value={condicoes.obrigacoes_consultora} onChange={setField(setCondicoes, "obrigacoes_consultora")} />
                  </div>
                  <div className="field">
                    <label>Obrigações do cliente</label>
                    <textarea rows={4} value={condicoes.obrigacoes_cliente} onChange={setField(setCondicoes, "obrigacoes_cliente")} />
                  </div>
                  <div className="field">
                    <label>Condições de realização</label>
                    <textarea rows={4} value={condicoes.condicoes_realizacao} onChange={setField(setCondicoes, "condicoes_realizacao")} />
                  </div>
                  <div className="field">
                    <label>Coordenação de formação</label>
                    <textarea rows={4} value={condicoes.coordenacao_formacao} onChange={setField(setCondicoes, "coordenacao_formacao")} />
                  </div>
                  <div className="field">
                    <label>Imagem de certificacoes</label>
                    <input type="text" value={condicoes.imagem_certificacoes} onChange={setField(setCondicoes, "imagem_certificacoes")} />
                  </div>
                  <div className="field">
                    <label>Termos gerais</label>
                    <textarea rows={8} value={condicoes.termos_gerais} onChange={setField(setCondicoes, "termos_gerais")} />
                  </div>
                  <div className="field">
                    <label>Notas / Exclusões</label>
                    <textarea rows={4} value={condicoes.notas} onChange={setField(setCondicoes, "notas")} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 5 && (
            <section className="card propostas-section">
              <div className="section-heading">5 · Revisao</div>

              <div className="propostas-review-banner">
                <div>
                  <h2>{cliente.nome || "-"}</h2>
                  <p>
                    {cursosSelecionados.length > 0
                      ? cursosSelecionados.map((curso) => curso.nome).join(" + ")
                      : "-"}{" "}
                    · {proposta.data}
                  </p>
                </div>
              </div>

              <div className="propostas-summary-grid">
                <div className="summary-card">
                  <div className="summary-label">Empresa Consultora</div>
                  <div className="summary-value">{empresaConsultora.nome || "-"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Cliente</div>
                  <div className="summary-value">{cliente.nome || "-"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Cursos</div>
                  <div className="summary-value">{cursosSelecionados.length}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Horas</div>
                  <div className="summary-value">{totais.horas}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Validade</div>
                  <div className="summary-value">{proposta.validade || 30} dias</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Total</div>
                  <div className="summary-value">{formatCurrency(totais.totalComIva)}</div>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Resumo Financeiro</div>
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
              {condicoes.nota_honorarios && (
                <div className="card-inner">
                  <div className="section-heading">Nota dos Honorários</div>
                  <div style={{ padding: '8px 0', color: '#374151', whiteSpace: 'pre-wrap' }}>{condicoes.nota_honorarios}</div>
                </div>
              )}
            </section>
          )}

          <div className="propostas-nav">
            <button className="btn-small" type="button" onClick={() => goStep(currentStep - 1)} disabled={currentStep === 1}>
              Anterior
            </button>
            <div className="muted">Passo {currentStep} de {stepTitles.length}</div>
            {currentStep < stepTitles.length ? (
              <button className="btn-primary" type="button" onClick={() => goStep(currentStep + 1)}>
                Próximo
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" type="button" onClick={guardarPropostaEmBD} disabled={isSavingDb}>
                  {isSavingDb ? "A guardar..." : "Guardar Proposta"}
                </button>
                <button className="btn-primary" type="button" onClick={gerarPDF} disabled={isGeneratingPDF}>
                  {isGeneratingPDF ? "A gerar..." : "Gerar PDF"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {toastMessage && <div className="toast-notification success">{toastMessage}</div>}
    </div>
  );
}
