import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "../styles/dashboard.css";

// Programs are now in BD (programas_financiamento table)
// Notices are in BD (avisos table)
// This component fetches them dynamically

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

// Empresa Consultora é selecionada de BD, não editada aqui
const INITIAL_EMPRESA_CONSULTORA = {
  id: "",
  nome: "",
  nipc: "",
  morada: "",
  tel: "",
  email: "",
  website: "",
  sigla: "", // novo: sigla para ID proposta
};

// Cliente é selecionada de BD
const INITIAL_CLIENTE = {
  id: "",
  nome: "",
  nipc: "",
  contacto_id: "", // novo: selecionar contacto específico
  contacto_nome: "",
  contacto_cargo: "",
};

const INITIAL_TIPO_PROJETO = {
  id: "",
  nome: "",
  tem_programa: false,
};

const INITIAL_PROPOSTA = {
  db_id: "",
  numero: "",
  ref: "",
  data: new Date().toISOString().slice(0, 10),
  validade: 30,
  estado: "em_analise",
};

const INITIAL_CARTA = {
  saudacao: "",
  abertura: "",
  central: "",
  aprovacao: "",
};

const INITIAL_TERMOS = {
  ral: "",
  privacidade: "",
};

const INITIAL_NOTAS = [
  "O valor proposto inclui Memória Descritiva e Estudo de Viabilidade Económica.",
  "Não inclui desenvolvimento de Estudos de Mercado, Benchmarking ou outros estudos adicionais solicitados pelo Organismo.",
  "Não inclui apoio jurídico ou legal.",
  "Não inclui serviços de contabilidade, certificação, auditoria ou revisão de contas.",
];

const initialPrograma = () => ({ ...PROGRAMAS[0] });
const initialServicos = () =>
  SERVICOS_BASE.map((servico) => ({
    ...servico,
    atividades: [...servico.atividades],
    selecionado: true,
  }));
const initialNotas = () => [...INITIAL_NOTAS];

const currencyFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const stepTitles = [
  "Empresa Consultora",
  "Cliente",
  "Artigos",
  "Serviços",
  "Orçamento",
  "Condições Gerais",
  "Revisão",
];

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

const normalizeCodigo = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const mapProgramaDbToUi = (programa) => ({
  dbId: programa.id,
  id: programa.codigo,
  codigo: programa.codigo,
  nome: programa.nome,
  aviso: programa.aviso || "",
  pct: Number(programa.pct || 0),
  tipo: programa.tipo_incentivo || "fundo perdido (não reembolsável)",
  inv_min: Number(programa.investimento_minimo || 0),
  regiao: programa.regiao || "",
  prazo1: programa.prazo_fase_1 || "",
  prazo2: programa.prazo_fase_2 || "",
  descricao: programa.descricao || "",
  ativo: programa.ativo !== false,
});

const emptyProgramaModalForm = {
  codigo: "",
  nome: "",
  aviso: "",
  pct: 0,
  tipo: "fundo perdido (não reembolsável)",
  inv_min: 0,
  regiao: "",
  prazo1: "",
  prazo2: "",
  descricao: "",
  ativo: true,
};

export default function PropostasComerciais() {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Empresa Consultora - selected from BD
  const [empresasConsultoras, setEmpresasConsultoras] = useState([]);
  const [empresaConsultora, setEmpresaConsultora] = useState(INITIAL_EMPRESA_CONSULTORA);
  
  // Cliente - selected from BD
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState(INITIAL_CLIENTE);
  const [contatosCliente, setContatosCliente] = useState([]);
  
  // Tipo Projeto - selected from BD
  const [tiposProj, setTiposProj] = useState([]);
  const [tipoProjeto, setTipoProjeto] = useState(INITIAL_TIPO_PROJETO);
  
  // Programas (if applicable)
  const [programas, setProgramas] = useState([]);
  const [programa, setPrograma] = useState(null);
  
  // Proposta metadata
  const [proposta, setProposta] = useState(INITIAL_PROPOSTA);
  const [condicoesGerais, setCondicoesGerais] = useState(INITIAL_TERMOS);
  
  // Services
  const [servicos, setServicos] = useState(initialServicos);
  const [notasExclusoes, setNotasExclusoes] = useState(initialNotas);
  
  // Payment plan (novo)
  const [planoPagamentos, setPlanoPagamentos] = useState([]);
  
  // UI state
  const [toastMessage, setToastMessage] = useState("");
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    setProposta((previous) => ({
      ...previous,
      data: previous.data || new Date().toISOString().slice(0, 10),
    }));
  }, []);

  const carregarProgramasDb = async (includeInactive = true) => {
    let query = supabase
      .from("programas_financiamento")
      .select("id, codigo, nome, aviso, pct, tipo_incentivo, investimento_minimo, regiao, prazo_fase_1, prazo_fase_2, descricao, ativo")
      .order("nome", { ascending: true });

    if (!includeInactive) {
      query = query.eq("ativo", true);
    }

    const { data, error } = await query;
    if (error) return [];

    const mapped = (data || []).map(mapProgramaDbToUi);
    setProgramasDb(mapped);
    return mapped;
  };

  useEffect(() => {
    void carregarProgramasDb(true);
  }, []);

  const programasDisponiveis = useMemo(
    () => {
      if (!programasDb.length) return PROGRAMAS;
      return programasDb.filter((programa) => programa.ativo !== false);
    },
    [programasDb],
  );

  const activeServicos = useMemo(
    () => servicos.filter((servico) => servico.selecionado),
    [servicos],
  );

  const incentivoEstimado = useMemo(() => {
    const investimento = Number(proposta.investimento || 0);
    const pct = Number(programaForm.pct || 0);
    return investimento * (pct / 100);
  }, [proposta.investimento, programaForm.pct]);

  const orcamentoLinhas = useMemo(() => {
    return activeServicos.map((servico) => {
      if (servico.honorario_tipo === "fixo") {
        const honorario = Number(servico.honorario_valor) || 0;
        const premioFixo = Number(servico.premio_fixo || 0);
        const premioPct = Number(servico.premio_pct || 0);
        const premioTotal = servico.premio_aprovacao
          ? premioFixo + incentivoEstimado * (premioPct / 100)
          : 0;

        return {
          ...servico,
          valor: honorario + premioTotal,
          honorarioLabel: servico.premio_aprovacao
            ? `${formatCurrency(honorario)} + prémio ${formatCurrency(premioFixo)} + ${premioPct}% incentivo`
            : formatCurrency(honorario),
        };
      }

      const pct = Number(servico.honorario_valor) || 0;
      const minimo = Number(servico.honorario_minimo || 0);
      const calculado = incentivoEstimado * (pct / 100);
      return {
        ...servico,
        valor: Math.max(calculado, minimo),
        honorarioLabel: `${pct}% do incentivo (mín. ${formatCurrency(minimo)})`,
      };
    });
  }, [activeServicos, incentivoEstimado]);

  const totais = useMemo(() => {
    const totalSemIva = orcamentoLinhas.reduce((accumulator, linha) => accumulator + linha.valor, 0);
    const iva = Number(proposta.iva || 23);
    const totalIva = totalSemIva * (iva / 100);
    const totalComIva = totalSemIva + totalIva;

    return { totalSemIva, totalIva, totalComIva, iva };
  }, [orcamentoLinhas, proposta.iva]);

  const selectedPrograma = useMemo(
    () => programasDisponiveis.find((programa) => programa.id === programaId) || programaForm,
    [programaId, programaForm, programasDisponiveis],
  );

  const checklist = useMemo(
    () => [
      { label: "Nome da consultora", ok: Boolean(consultora.nome) },
      { label: "Signatário e cargo", ok: Boolean(consultora.signatario) && Boolean(consultora.cargo) },
      { label: "Número e referência da proposta", ok: Boolean(proposta.numero) && Boolean(proposta.ref) },
      { label: "Nome do cliente", ok: Boolean(cliente.nome) },
      { label: "Contacto do cliente", ok: Boolean(cliente.contacto) },
      { label: "Programa selecionado", ok: Boolean(programaForm.nome) },
      { label: "Pelo menos um módulo selecionado", ok: activeServicos.length > 0 },
      { label: "Saudação da carta", ok: Boolean(carta.saudacao) },
    ],
    [activeServicos.length, carta.saudacao, cliente.contacto, cliente.nome, consultora, programaForm.nome, proposta.numero, proposta.ref],
  );

  const goStep = (nextStep) => {
    if (nextStep < 1 || nextStep > stepTitles.length) return;
    setCurrentStep(nextStep);
  };

  const selectPrograma = (id) => {
    setProgramaId(id);
    const found = programasDisponiveis.find((programa) => programa.id === id);
    if (found) setProgramaForm({ ...found });
  };

  const toggleServico = (id) => {
    setServicos((previous) =>
      previous.map((servico) =>
        servico.id === id ? { ...servico, selecionado: !servico.selecionado } : servico,
      ),
    );
  };

  const updateServicoField = (id, field, value) => {
    setServicos((previous) =>
      previous.map((servico) =>
        servico.id === id ? { ...servico, [field]: value } : servico,
      ),
    );
  };

  const updateAtividade = (servicoId, index, value) => {
    setServicos((previous) =>
      previous.map((servico) => {
        if (servico.id !== servicoId) return servico;
        const atividades = [...servico.atividades];
        atividades[index] = value;
        return { ...servico, atividades };
      }),
    );
  };

  const addAtividade = (servicoId) => {
    setServicos((previous) =>
      previous.map((servico) =>
        servico.id === servicoId
          ? { ...servico, atividades: [...servico.atividades, "Nova atividade"] }
          : servico,
      ),
    );
  };

  const removeAtividade = (servicoId, index) => {
    setServicos((previous) =>
      previous.map((servico) => {
        if (servico.id !== servicoId) return servico;
        const atividades = servico.atividades.filter((_, currentIndex) => currentIndex !== index);
        return { ...servico, atividades };
      }),
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

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2500);
  };

  const resetForm = () => {
    if (!window.confirm("Limpar todos os dados?")) return;
    setCurrentStep(1);
    setProgramaId(PROGRAMAS[0].id);
    setProgramaForm(initialPrograma());
    setConsultora(INITIAL_CONSULTORA);
    setCliente(INITIAL_CLIENTE);
    setProposta(INITIAL_PROPOSTA);
    setCarta(INITIAL_CARTA);
    setTermos(INITIAL_TERMOS);
    setServicos(initialServicos());
    setNotasExclusoes(initialNotas());
    showToast("Formulário limpo.");
  };

  const loadSample = () => {
    setConsultora({
      nome: "NEOMARCA, Inovação e Desenvolvimento, Lda.",
      nipc: "503 495 140",
      morada: "Rua Horta Machado, 2 – 8000-362 Faro",
      tel: "289 098 720",
      email: "info@neomarca.pt",
      website: "www.neomarca.pt",
      signatario: "Paulo Pereira",
      cargo: "Diretor",
      telm: "913 535 544",
    });

    setCliente({
      nome: "CAMPICONTROL, LDA",
      nipc: "507 123 456",
      tipo: "PME",
      morada: "Rua da Liberdade, 10 – 8000-000 Faro",
      cidade: "Faro",
      sector: "Construção, Agricultura, Ambiente, Floresta, Transportes",
      contacto: "André Gomes",
      contacto_cargo: "Gerente",
      email: "agomes@empresa.pt",
      tel: "289 000 000",
    });

    setProposta((previous) => ({
      ...previous,
      numero: "26009",
      ref: "056/03/2026",
      data: previous.data || new Date().toISOString().slice(0, 10),
      validade: 30,
      estado: "em_analise",
      investimento: 200000,
      iva: 23,
    }));

    setProgramaId("sice_qual_2030");
    setProgramaForm({ ...PROGRAMAS[0] });
    setCarta({
      saudacao: "Estimado André Gomes,",
      abertura:
        "Desde já agradeço a consulta e a oportunidade que concederam à NEOMARCA, Inovação e Desenvolvimento, Lda. para vos apresentar os nossos serviços.",
      central:
        "O nosso compromisso é oferecer o nosso melhor conhecimento e dedicar os melhores recursos a este projeto, de modo a atingir os objetivos pretendidos e os resultados esperados no prazo desejado.\n\nCom vista a dar seguimento ao processo, remetemos a nossa proposta de prestação de serviços, onde apresentamos as opções e planos de colaboração.\n\nComo sempre, e numa perspetiva de cooperação aberta e ativa com os nossos clientes, estamos disponíveis para avaliar em conjunto a solução que melhor se adeque ao vosso projeto.",
      aprovacao:
        "Por favor, leia a proposta para garantir que entende todos os detalhes do serviço proposto. Para aprovação desta proposta pedimos que nos envie um email a confirmar a adjudicação. Após a aceitação da proposta será redigido o Contrato de Prestação de Serviços.",
    });
    setTermos({
      ral: "CIMAAL – Centro de Informação, Mediação e Arbitragem de Conflitos de Consumo do Algarve. Edifício Ninho de Empresas, Estrada da Penha, 8005-131 Faro.",
      privacidade: "privacy@neomarca.pt",
    });
    setServicos(initialServicos());
    setNotasExclusoes(initialNotas());
    showToast("Exemplo carregado!");
  };

  const recolherDados = () => ({
    consultora,
    cliente,
    proposta,
    programa: programaForm,
    servicos: orcamentoLinhas,
    servicosConfig: servicos,
    orcamento: {
      investimento: Number(proposta.investimento || 0),
      iva: totais.iva,
      total_sem_iva: totais.totalSemIva,
      total_iva: totais.totalIva,
      total_com_iva: totais.totalComIva,
      notas: notasExclusoes,
    },
    notasExclusoes,
    carta,
    termos,
  });

  const normalizarEstadoDb = (estadoAtual) => {
    if (["aprovada", "arquivada", "em_analise"].includes(estadoAtual)) return estadoAtual;
    if (estadoAtual === "Adjudicada") return "aprovada";
    if (estadoAtual === "Recusada") return "arquivada";
    return "em_analise";
  };

  const abrirModalProgramas = async () => {
    await carregarProgramasDb(true);
    setProgramaModalEditId(null);
    setProgramaModalForm(emptyProgramaModalForm);
    setShowProgramasModal(true);
  };

  const selecionarProgramaNoModal = (programa) => {
    setProgramaModalEditId(programa.dbId || null);
    setProgramaModalForm({
      codigo: programa.codigo || programa.id || "",
      nome: programa.nome || "",
      aviso: programa.aviso || "",
      pct: Number(programa.pct || 0),
      tipo: programa.tipo || "fundo perdido (não reembolsável)",
      inv_min: Number(programa.inv_min || 0),
      regiao: programa.regiao || "",
      prazo1: programa.prazo1 || "",
      prazo2: programa.prazo2 || "",
      descricao: programa.descricao || "",
      ativo: programa.ativo !== false,
    });
  };

  const usarProgramaNaProposta = (programa) => {
    setProgramaId(programa.id);
    setProgramaForm({ ...programa });
    setShowProgramasModal(false);
    showToast("Programa aplicado na proposta.");
  };

  const guardarProgramaNoModal = async () => {
    const nome = (programaModalForm.nome || "").trim();
    if (!nome) {
      showToast("Preenche o nome do programa.");
      return;
    }

    setIsProgramaModalSubmitting(true);

    const codigoBase = normalizeCodigo(programaModalForm.codigo || nome) || `programa_${Date.now()}`;
    let codigoFinal = codigoBase;

    if (!programaModalEditId) {
      const { data: existentes } = await supabase
        .from("programas_financiamento")
        .select("codigo")
        .ilike("codigo", `${codigoBase}%`);

      const usedCodes = new Set((existentes || []).map((item) => item.codigo));
      let suffix = 2;
      while (usedCodes.has(codigoFinal)) {
        codigoFinal = `${codigoBase}_${suffix}`;
        suffix += 1;
      }
    }

    const payloadPrograma = {
      codigo: codigoFinal,
      nome,
      aviso: (programaModalForm.aviso || "").trim() || null,
      pct: Number(programaModalForm.pct || 0),
      tipo_incentivo: (programaModalForm.tipo || "").trim() || null,
      investimento_minimo: Number(programaModalForm.inv_min || 0),
      regiao: (programaModalForm.regiao || "").trim() || null,
      prazo_fase_1: programaModalForm.prazo1 || null,
      prazo_fase_2: programaModalForm.prazo2 || null,
      descricao: (programaModalForm.descricao || "").trim() || null,
      ativo: programaModalForm.ativo !== false,
    };

    let dbResponse;
    if (programaModalEditId) {
      dbResponse = await supabase
        .from("programas_financiamento")
        .update(payloadPrograma)
        .eq("id", programaModalEditId)
        .select("id, codigo, nome, aviso, pct, tipo_incentivo, investimento_minimo, regiao, prazo_fase_1, prazo_fase_2, descricao, ativo")
        .single();
    } else {
      dbResponse = await supabase
        .from("programas_financiamento")
        .insert(payloadPrograma)
        .select("id, codigo, nome, aviso, pct, tipo_incentivo, investimento_minimo, regiao, prazo_fase_1, prazo_fase_2, descricao, ativo")
        .single();
    }

    setIsProgramaModalSubmitting(false);

    if (dbResponse.error || !dbResponse.data) {
      showToast("Erro ao guardar programa na BD.");
      return;
    }

    const updatedProgramas = await carregarProgramasDb(true);
    const mapped = mapProgramaDbToUi(dbResponse.data);
    const target = updatedProgramas.find((item) => item.dbId === mapped.dbId) || mapped;

    if (target.ativo !== false) {
      setProgramaId(target.id);
      setProgramaForm({ ...target });
    }

    setProgramaModalEditId(target.dbId || null);
    setProgramaModalForm({
      codigo: target.codigo || target.id || "",
      nome: target.nome || "",
      aviso: target.aviso || "",
      pct: Number(target.pct || 0),
      tipo: target.tipo || "fundo perdido (não reembolsável)",
      inv_min: Number(target.inv_min || 0),
      regiao: target.regiao || "",
      prazo1: target.prazo1 || "",
      prazo2: target.prazo2 || "",
      descricao: target.descricao || "",
      ativo: target.ativo !== false,
    });

    showToast(programaModalEditId ? "Programa atualizado." : "Programa criado e pronto para reutilização.");
  };

  const alternarAtivoProgramaNoModal = async () => {
    if (!programaModalEditId) {
      showToast("Seleciona um programa existente.");
      return;
    }

    setIsProgramaModalSubmitting(true);
    const nextAtivo = !(programaModalForm.ativo !== false);
    const { error } = await supabase
      .from("programas_financiamento")
      .update({ ativo: nextAtivo })
      .eq("id", programaModalEditId);
    setIsProgramaModalSubmitting(false);

    if (error) {
      showToast("Erro ao alterar estado do programa.");
      return;
    }

    await carregarProgramasDb(true);
    setProgramaModalForm((previous) => ({ ...previous, ativo: nextAtivo }));
    showToast(nextAtivo ? "Programa ativado." : "Programa desativado.");
  };

  const guardarNaBaseDados = async (dados, htmlGerado) => {
    setIsSavingDb(true);

    const programaEncontrado = programasDb.find((programa) => programa.id === programaId);

    const payloadToSave = {
      programa_id: programaEncontrado?.dbId || null,
      estado: normalizarEstadoDb(dados.proposta.estado),
      aprovado_em: normalizarEstadoDb(dados.proposta.estado) === "aprovada" ? new Date().toISOString() : null,
      arquivado_em: normalizarEstadoDb(dados.proposta.estado) === "arquivada" ? new Date().toISOString() : null,
      html_gerado: htmlGerado,
      payload: dados,
    };

    let data;
    let error;

    if (dados.proposta.db_id) {
      ({ data, error } = await supabase
        .from("propostas_comerciais")
        .update(payloadToSave)
        .eq("id", dados.proposta.db_id)
        .select("id, numero_proposta, estado")
        .single());
    } else {
      ({ data, error } = await supabase
        .from("propostas_comerciais")
        .insert(payloadToSave)
        .select("id, numero_proposta, estado")
        .single());
    }

    setIsSavingDb(false);

    if (error) {
      showToast("Erro ao guardar na BD.");
      return false;
    }

    setProposta((previous) => ({
      ...previous,
      db_id: data?.id || previous.db_id,
      numero: data?.numero_proposta ? String(data.numero_proposta) : previous.numero,
      estado: data?.estado || previous.estado,
    }));

    showToast("Proposta guardada na BD.");
    return true;
  };

  const carregarDaBaseDados = async () => {
    setIsLoadingDb(true);
    let query = supabase
      .from("propostas_comerciais")
      .select("id, numero_proposta, estado, payload")
      .order("created_at", { ascending: false })
      .limit(1);

    const maybeNumero = Number(proposta.numero || 0);
    if (Number.isFinite(maybeNumero) && maybeNumero > 0) {
      query = supabase
        .from("propostas_comerciais")
        .select("id, numero_proposta, estado, payload")
        .eq("numero_proposta", maybeNumero)
        .limit(1);
    }

    const { data: listData, error } = await query;
    setIsLoadingDb(false);

    const data = Array.isArray(listData) ? listData[0] : null;

    if (error || !data?.payload) {
      showToast("Não foi encontrada proposta guardada na BD.");
      return;
    }

    const payload = data.payload;
    if (payload.consultora) setConsultora({ ...INITIAL_CONSULTORA, ...payload.consultora });
    if (payload.cliente) setCliente({ ...INITIAL_CLIENTE, ...payload.cliente });
    if (payload.proposta) {
      setProposta((previous) => ({
        ...INITIAL_PROPOSTA,
        ...payload.proposta,
        db_id: data.id,
        numero: data.numero_proposta ? String(data.numero_proposta) : payload.proposta.numero || previous.numero,
        estado: data.estado || payload.proposta.estado || "em_analise",
      }));
    }
    if (payload.programa) {
      setProgramaForm(payload.programa);
      if (payload.programa.id) setProgramaId(payload.programa.id);
    }
    if (payload.servicosConfig?.length) setServicos(payload.servicosConfig);
    if (payload.notasExclusoes?.length) setNotasExclusoes(payload.notasExclusoes);
    else if (payload.orcamento?.notas?.length) setNotasExclusoes(payload.orcamento.notas);
    if (payload.carta) setCarta({ ...INITIAL_CARTA, ...payload.carta });
    if (payload.termos) setTermos({ ...INITIAL_TERMOS, ...payload.termos });

    showToast("Proposta carregada da BD.");
  };

  const gerarHTMLProposta = (dados) => {
    const titulo = escapeHtml(dados.proposta.numero || "Nova proposta");
    const nomeCliente = escapeHtml(dados.cliente.nome || "Cliente");
    const nomeConsultora = escapeHtml(dados.consultora.nome || "Consultora");
    const dataEmissao = formatDatePt(dados.proposta.data);
    const dataValidade = addDays(dados.proposta.data, dados.proposta.validade);

    return `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Proposta ${titulo} - ${nomeCliente}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; color: #1f2937; background: #f5f7fb; }
    .page { max-width: 980px; margin: 0 auto; padding: 32px; background: white; }
    .hero { background: linear-gradient(135deg, #0f2240, #1a3a5c); color: white; padding: 36px; border-radius: 20px; }
    .hero h1 { margin: 0 0 8px; font-size: 34px; }
    .hero p { margin: 0; color: rgba(255,255,255,0.8); }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 24px; }
    .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px; margin-top: 18px; }
    h2 { font-size: 18px; margin: 0 0 12px; color: #0f2240; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border-bottom: 1px solid #eef2f7; padding: 12px 10px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; color: #64748b; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    .totals { display: flex; justify-content: flex-end; gap: 20px; margin-top: 18px; }
    .total { text-align: right; }
    .total strong { display: block; font-size: 18px; color: #0f2240; }
    .muted { color: #64748b; }
    .note { padding: 10px 0; border-bottom: 1px solid #eef2f7; }
    .footer { margin-top: 28px; font-size: 12px; color: #64748b; text-align: center; }
    @media print { body { background: white; } .page { padding: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div class="muted" style="color: rgba(255,255,255,0.72); text-transform: uppercase; letter-spacing: .16em; font-size: 12px;">Proposta de Prestação de Serviços</div>
      <h1>${nomeCliente}</h1>
      <p>${escapeHtml(dados.programa.nome || "Programa")}</p>
      <p style="margin-top: 14px;">Proposta ${titulo} · ${dataEmissao}</p>
    </section>

    <div class="grid">
      <div class="card"><h2>Consultora</h2><div><strong>${nomeConsultora}</strong></div><div class="muted">${escapeHtml(dados.consultora.email || "")}</div></div>
      <div class="card"><h2>Cliente</h2><div><strong>${nomeCliente}</strong></div><div class="muted">${escapeHtml(dados.cliente.contacto || "")}</div></div>
      <div class="card"><h2>Programa</h2><div><strong>${escapeHtml(dados.programa.nome || "")}</strong></div><div class="muted">${escapeHtml(dados.programa.aviso || "")}</div></div>
      <div class="card"><h2>Validade</h2><div><strong>${escapeHtml(String(dados.proposta.validade || 30))} dias</strong></div><div class="muted">Até ${escapeHtml(dataValidade)}</div></div>
    </div>

    <section class="card">
      <h2>Âmbito dos Serviços</h2>
      ${dados.servicos
        .map(
          (servico) => `
          <div style="margin-bottom: 18px;">
            <div><strong>Módulo ${escapeHtml(servico.codigo)} · ${escapeHtml(servico.nome)}</strong></div>
            <div class="muted" style="margin-bottom: 8px;">${escapeHtml(servico.descricao || "")}</div>
            <ul style="margin: 0; padding-left: 18px;">
              ${servico.atividades.map((atividade) => `<li>${escapeHtml(atividade)}</li>`).join("")}
            </ul>
          </div>
        `,
        )
        .join("")}
    </section>

    <section class="card">
      <h2>Orçamento</h2>
      <table>
        <thead>
          <tr><th>Módulo</th><th>Honorários</th><th style="text-align:right;">Valor</th></tr>
        </thead>
        <tbody>
          ${dados.servicos
            .map(
              (servico) => `
              <tr>
                <td><strong>${escapeHtml(servico.codigo)}</strong><br><span class="muted">${escapeHtml(servico.nome)}</span></td>
                <td>${escapeHtml(servico.honorarioLabel || "")}</td>
                <td style="text-align:right; white-space: nowrap;">${formatCurrency(servico.valor || 0)}</td>
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
      <div class="totals">
        <div class="total"><span class="muted">Total s/ IVA</span><strong>${formatCurrency(dados.orcamento.total_sem_iva)}</strong></div>
        <div class="total"><span class="muted">IVA ${escapeHtml(String(dados.orcamento.iva))}%</span><strong>${formatCurrency(dados.orcamento.total_iva)}</strong></div>
        <div class="total"><span class="muted">Total c/ IVA</span><strong>${formatCurrency(dados.orcamento.total_com_iva)}</strong></div>
      </div>
    </section>

    <section class="card">
      <h2>Carta</h2>
      ${dados.carta.saudacao ? `<p>${escapeHtml(dados.carta.saudacao)}</p>` : ""}
      ${dados.carta.abertura ? `<p>${escapeHtml(dados.carta.abertura)}</p>` : ""}
      ${dados.carta.central ? `<p>${escapeHtml(dados.carta.central)}</p>` : ""}
      ${dados.carta.aprovacao ? `<p>${escapeHtml(dados.carta.aprovacao)}</p>` : ""}
    </section>

    <section class="card">
      <h2>Notas e Exclusões</h2>
      ${dados.orcamento.notas.map((nota) => `<div class="note">${escapeHtml(nota)}</div>`).join("")}
    </section>

    <div class="footer">
      ${nomeConsultora} · ${escapeHtml(dados.consultora.nipc || "")} · ${escapeHtml(dados.consultora.email || "")}
    </div>
  </div>
</body>
</html>`;
  };

  const gerarProposta = async () => {
    const dados = recolherDados();
    const html = gerarHTMLProposta(dados);
    await guardarNaBaseDados(dados, html);
    const safeCliente = (dados.cliente.nome || "cliente").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase();
    downloadFile(`proposta-${dados.proposta.numero || "nova"}-${safeCliente || "cliente"}.html`, html);
    showToast("Proposta gerada e descarregada!");
  };

  return (
    <div className="page-container propostas-page">
      <div className="propostas-hero card">
        <div>
          <div className="propostas-kicker">Gerador de Propostas</div>
          <h1>Propostas Comerciais</h1>
          <p>
            Monta a proposta por passos, calcula automaticamente o orçamento e exporta o HTML final para partilha.
          </p>
          <p className="muted" style={{ marginTop: "8px" }}>
            Programa atual: {selectedPrograma.nome || "—"}
          </p>
        </div>

        <div className="propostas-hero-actions">
          <button className="btn-soft-cta" type="button" onClick={carregarDaBaseDados} disabled={isLoadingDb}>
            {isLoadingDb ? "A carregar..." : "Carregar BD"}
          </button>
          <button
            className="btn-soft-cta"
            type="button"
            onClick={async () => {
              const dados = recolherDados();
              const html = gerarHTMLProposta(dados);
              await guardarNaBaseDados(dados, html);
            }}
            disabled={isSavingDb}
          >
            {isSavingDb ? "A guardar..." : "Guardar BD"}
          </button>
          <button className="btn-soft-cta" type="button" onClick={loadSample}>
            Carregar exemplo
          </button>
          <button className="btn-small" type="button" onClick={resetForm}>
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
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isActive = currentStep === stepNumber;
              const isDone = currentStep > stepNumber;

              return (
                <button
                  key={title}
                  type="button"
                  className={`propostas-stepper-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                  onClick={() => goStep(stepNumber)}
                >
                  <span className="propostas-stepper-index">{stepNumber}</span>
                  <span className="propostas-stepper-label">{title}</span>
                </button>
              );
            })}
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
              <div className="field-grid">
                <div className="field">
                  <label>Nome da empresa</label>
                  <input type="text" value={consultora.nome} onChange={setField(setConsultora, "nome")} placeholder="ex. NEOMARCA, Inovação e Desenvolvimento, Lda." />
                </div>
                <div className="field">
                  <label>NIPC</label>
                  <input type="text" value={consultora.nipc} onChange={setField(setConsultora, "nipc")} placeholder="ex. 503 495 140" />
                </div>
                <div className="field span-2">
                  <label>Morada completa</label>
                  <input type="text" value={consultora.morada} onChange={setField(setConsultora, "morada")} placeholder="ex. Rua Horta Machado, 2 – 8000-362 Faro" />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input type="tel" value={consultora.tel} onChange={setField(setConsultora, "tel")} placeholder="ex. 289 098 720" />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={consultora.email} onChange={setField(setConsultora, "email")} placeholder="ex. info@consultora.pt" />
                </div>
                <div className="field">
                  <label>Website</label>
                  <input type="text" value={consultora.website} onChange={setField(setConsultora, "website")} placeholder="ex. www.consultora.pt" />
                </div>
                <div className="field">
                  <label>Nome do signatário</label>
                  <input type="text" value={consultora.signatario} onChange={setField(setConsultora, "signatario")} placeholder="ex. Paulo Pereira" />
                </div>
                <div className="field">
                  <label>Cargo do signatário</label>
                  <input type="text" value={consultora.cargo} onChange={setField(setConsultora, "cargo")} placeholder="ex. Diretor" />
                </div>
                <div className="field">
                  <label>Telemóvel (signatário)</label>
                  <input type="tel" value={consultora.telm} onChange={setField(setConsultora, "telm")} placeholder="ex. 913 535 544" />
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Referências da proposta</div>
                <div className="field-grid field-grid-3">
                  <div className="field">
                    <label>ID da proposta</label>
                    <input type="text" value={proposta.numero || ""} readOnly placeholder="Automático" />
                  </div>
                  <div className="field">
                    <label>Referência interna</label>
                    <input type="text" value={proposta.ref} onChange={setField(setProposta, "ref")} placeholder="ex. 056/03/2026" />
                  </div>
                  <div className="field">
                    <label>Data de emissão</label>
                    <input type="date" value={proposta.data} onChange={setField(setProposta, "data")} />
                  </div>
                  <div className="field">
                    <label>Validade (dias)</label>
                    <input type="number" min="1" value={proposta.validade} onChange={setField(setProposta, "validade")} />
                  </div>
                  <div className="field">
                    <label>Estado</label>
                    <select value={proposta.estado} onChange={setField(setProposta, "estado")}>
                      <option value="em_analise">Em análise</option>
                      <option value="aprovada">Aprovada</option>
                      <option value="arquivada">Arquivada</option>
                    </select>
                  </div>
                </div>
                <p className="muted" style={{ marginTop: "10px" }}>
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
                  <label>Nome da empresa</label>
                  <input type="text" value={cliente.nome} onChange={setField(setCliente, "nome")} placeholder="ex. CAMPICONTROL, LDA" />
                </div>
                <div className="field">
                  <label>NIPC</label>
                  <input type="text" value={cliente.nipc} onChange={setField(setCliente, "nipc")} placeholder="ex. 507 123 456" />
                </div>
                <div className="field">
                  <label>Tipo de empresa</label>
                  <select value={cliente.tipo} onChange={setField(setCliente, "tipo")}>
                    <option value="PME">PME</option>
                    <option value="PME Excelência">PME Excelência</option>
                    <option value="PME Líder">PME Líder</option>
                    <option value="Grande Empresa">Grande Empresa</option>
                  </select>
                </div>
                <div className="field span-2">
                  <label>Morada</label>
                  <input type="text" value={cliente.morada} onChange={setField(setCliente, "morada")} placeholder="ex. Rua da Liberdade, 10 – 8000-000 Faro" />
                </div>
                <div className="field">
                  <label>Distrito / Cidade</label>
                  <input type="text" value={cliente.cidade} onChange={setField(setCliente, "cidade")} placeholder="ex. Faro" />
                </div>
                <div className="field">
                  <label>Sector de atividade</label>
                  <input type="text" value={cliente.sector} onChange={setField(setCliente, "sector")} placeholder="ex. Construção, Agricultura, Ambiente" />
                </div>
                <div className="field">
                  <label>Nome do contacto</label>
                  <input type="text" value={cliente.contacto} onChange={setField(setCliente, "contacto")} placeholder="ex. André Gomes" />
                </div>
                <div className="field">
                  <label>Cargo</label>
                  <input type="text" value={cliente.contacto_cargo} onChange={setField(setCliente, "contacto_cargo")} placeholder="ex. Gerente" />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={cliente.email} onChange={setField(setCliente, "email")} placeholder="ex. agomes@empresa.pt" />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input type="tel" value={cliente.tel} onChange={setField(setCliente, "tel")} placeholder="ex. 289 000 000" />
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section className="card propostas-section">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div className="section-heading">3 · Programa</div>
                <button type="button" className="btn-soft-cta" onClick={abrirModalProgramas}>
                  Gerir programas
                </button>
              </div>
              <div className="propostas-programas-grid">
                {programasDisponiveis.map((programa) => (
                  <button
                    key={programa.id}
                    type="button"
                    className={`propostas-programa-card ${programaId === programa.id ? "selected" : ""}`}
                    onClick={() => selectPrograma(programa.id)}
                  >
                    <div className="propostas-programa-title">{programa.nome}</div>
                    <div className="muted">{programa.aviso || "A definir"}</div>
                    <div className="propostas-pill-list">
                      {programa.pct > 0 && <span className="badge badge-success">{programa.pct}%</span>}
                      {programa.regiao && <span className="badge badge-warning">{programa.regiao}</span>}
                    </div>
                  </button>
                ))}
              </div>

              <div className="card-inner">
                <div className="section-heading">Personalizar programa</div>
                <div className="field-grid">
                  <div className="field">
                    <label>Nome do sistema de incentivos</label>
                    <input type="text" value={programaForm.nome} onChange={setField(setProgramaForm, "nome")} />
                  </div>
                  <div className="field">
                    <label>Referência do aviso</label>
                    <input type="text" value={programaForm.aviso} onChange={setField(setProgramaForm, "aviso")} />
                  </div>
                  <div className="field">
                    <label>Incentivo (%)</label>
                    <input type="number" min="0" max="100" value={programaForm.pct} onChange={setField(setProgramaForm, "pct")} />
                  </div>
                  <div className="field">
                    <label>Tipo de incentivo</label>
                    <select value={programaForm.tipo} onChange={setField(setProgramaForm, "tipo")}>
                      <option value="fundo perdido (não reembolsável)">Fundo perdido (não reembolsável)</option>
                      <option value="reembolsável">Reembolsável</option>
                      <option value="misto">Misto</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Investimento mínimo (€)</label>
                    <input type="number" min="0" value={programaForm.inv_min} onChange={setField(setProgramaForm, "inv_min")} />
                  </div>
                  <div className="field">
                    <label>Região</label>
                    <input type="text" value={programaForm.regiao} onChange={setField(setProgramaForm, "regiao")} />
                  </div>
                  <div className="field">
                    <label>Prazo 1.ª fase</label>
                    <input type="date" value={programaForm.prazo1} onChange={setField(setProgramaForm, "prazo1")} />
                  </div>
                  <div className="field">
                    <label>Prazo 2.ª fase (opcional)</label>
                    <input type="date" value={programaForm.prazo2} onChange={setField(setProgramaForm, "prazo2")} />
                  </div>
                  <div className="field span-2">
                    <label>Descrição resumida do aviso</label>
                    <textarea rows="3" value={programaForm.descricao} onChange={setField(setProgramaForm, "descricao")} />
                  </div>
                </div>
                <p className="muted" style={{ marginTop: "10px" }}>
                  Esta área personaliza apenas a proposta atual. Para criar ou editar programas reutilizáveis, usa o botão Gerir programas.
                </p>
              </div>
            </section>
          )}

          {currentStep === 4 && (
            <section className="card propostas-section">
              <div className="section-heading">4 · Serviços</div>
              <div className="propostas-service-list">
                {servicos.map((servico) => (
                  <article key={servico.id} className={`propostas-service-card ${servico.selecionado ? "selected" : ""}`}>
                    <button className="propostas-service-header" type="button" onClick={() => toggleServico(servico.id)}>
                      <span className="propostas-service-check">{servico.selecionado ? "✓" : ""}</span>
                      <span className="propostas-service-code">{servico.codigo}</span>
                      <span className="propostas-service-main">
                        <span className="propostas-service-name">{servico.nome}</span>
                        <span className="muted">{servico.descricao}</span>
                      </span>
                      <span className="propostas-service-price">{servico.honorario_tipo === "fixo" ? formatCurrency(servico.honorario_valor) : `${Number(servico.honorario_valor) || 0}%`}</span>
                    </button>

                    {servico.selecionado && (
                      <div className="propostas-service-body">
                        <div className="muted section-subtitle">Atividades incluídas</div>
                        <div className="propostas-activities">
                          {servico.atividades.map((atividade, index) => (
                            <div key={`${servico.id}-${index}`} className="propostas-activity-row">
                              <input
                                type="text"
                                value={atividade}
                                onChange={(event) => updateAtividade(servico.id, index, event.target.value)}
                              />
                              <button type="button" className="btn-small" onClick={() => removeAtividade(servico.id, index)}>
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                        <button type="button" className="btn-soft-cta" onClick={() => addAtividade(servico.id)}>
                          Adicionar atividade
                        </button>

                        <div className="section-subtitle">Entregáveis</div>
                        <div className="propostas-pill-list">
                          {servico.entregaveis.map((entregavel) => (
                            <span key={entregavel} className="badge badge-warning">
                              {entregavel}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
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
                <div className="field">
                  <label>Incentivo estimado (€)</label>
                  <input type="text" value={incentivoEstimado ? formatCurrency(incentivoEstimado) : ""} readOnly />
                </div>
                <div className="field">
                  <label>Taxa de IVA (%)</label>
                  <input type="number" value={proposta.iva || 23} onChange={setField(setProposta, "iva")} min="0" max="100" />
                </div>
              </div>

              <div className="propostas-budget-list">
                {orcamentoLinhas.length > 0 ? (
                  orcamentoLinhas.map((servico) => (
                    <div key={servico.id} className="card-inner">
                      <div className="section-heading">Módulo {servico.codigo} — {servico.nome}</div>
                      <div className="field-grid">
                        {servico.honorario_tipo === "fixo" ? (
                          <>
                            <div className="field">
                              <label>Honorário fixo (€)</label>
                              <input
                                type="number"
                                value={servico.honorario_valor}
                                onChange={(event) => updateServicoField(servico.id, "honorario_valor", event.target.value)}
                              />
                            </div>
                            <div className="field">
                              <label>Condições de pagamento</label>
                              <input
                                type="text"
                                value={servico.condicoes}
                                onChange={(event) => updateServicoField(servico.id, "condicoes", event.target.value)}
                              />
                            </div>
                            {servico.premio_aprovacao && (
                              <>
                                <div className="field">
                                  <label>Prémio de aprovação — parte fixa (€)</label>
                                  <input
                                    type="number"
                                    value={servico.premio_fixo}
                                    onChange={(event) => updateServicoField(servico.id, "premio_fixo", event.target.value)}
                                  />
                                </div>
                                <div className="field">
                                  <label>Prémio de aprovação — % do incentivo</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={servico.premio_pct}
                                    onChange={(event) => updateServicoField(servico.id, "premio_pct", event.target.value)}
                                  />
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="field">
                              <label>Percentagem sobre incentivo (%)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={servico.honorario_valor}
                                onChange={(event) => updateServicoField(servico.id, "honorario_valor", event.target.value)}
                              />
                            </div>
                            <div className="field">
                              <label>Mínimo garantido (€)</label>
                              <input
                                type="number"
                                value={servico.honorario_minimo}
                                onChange={(event) => updateServicoField(servico.id, "honorario_minimo", event.target.value)}
                              />
                            </div>
                            <div className="field span-2">
                              <label>Condições de pagamento</label>
                              <input
                                type="text"
                                value={servico.condicoes}
                                onChange={(event) => updateServicoField(servico.id, "condicoes", event.target.value)}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="card-inner muted">Nenhum módulo selecionado no passo 4.</div>
                )}
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Módulo</th>
                      <th>Honorários</th>
                      <th style={{ textAlign: "right" }}>Valor estimado</th>
                      <th>Condições de pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orcamentoLinhas.map((servico) => (
                      <tr key={servico.id}>
                        <td>
                          <strong>Módulo {servico.codigo}</strong>
                          <br />
                          <span className="muted">{servico.nome}</span>
                        </td>
                        <td>{servico.honorarioLabel}</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatCurrency(servico.valor)}</td>
                        <td>{servico.condicoes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <div className="section-heading">6 · Carta</div>
              <div className="field-grid field-grid-1">
                <div className="field">
                  <label>Fórmula de saudação</label>
                  <input type="text" value={carta.saudacao} onChange={setField(setCarta, "saudacao")} placeholder="ex. Estimado André Gomes," />
                </div>
                <div className="field">
                  <label>Parágrafo de abertura</label>
                  <textarea rows="4" value={carta.abertura} onChange={setField(setCarta, "abertura")} />
                </div>
                <div className="field">
                  <label>Parágrafo central (proposta de valor)</label>
                  <textarea rows="5" value={carta.central} onChange={setField(setCarta, "central")} />
                </div>
                <div className="field">
                  <label>Instrução de aprovação</label>
                  <textarea rows="4" value={carta.aprovacao} onChange={setField(setCarta, "aprovacao")} />
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Termos gerais</div>
                <div className="field-grid">
                  <div className="field">
                    <label>Entidade RAL (resolução de litígios)</label>
                    <input type="text" value={termos.ral} onChange={setField(setTermos, "ral")} />
                  </div>
                  <div className="field">
                    <label>Email de privacidade</label>
                    <input type="email" value={termos.privacidade} onChange={setField(setTermos, "privacidade")} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 7 && (
            <section className="card propostas-section">
              <div className="section-heading">7 · Revisão</div>
              <div className="propostas-review-banner">
                <div>
                  <div className="muted">Proposta n.º {proposta.numero || "—"}</div>
                  <h2>{cliente.nome || "—"}</h2>
                  <p>
                    {selectedPrograma.nome || programaForm.nome || "—"} · {formatDatePt(proposta.data)}
                  </p>
                </div>
                <button type="button" className="btn-primary" onClick={gerarProposta}>
                  Gerar proposta HTML
                </button>
              </div>

              <div className="propostas-summary-grid">
                <div className="summary-card">
                  <div className="summary-label">Consultora</div>
                  <div className="summary-value">{consultora.nome || "—"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Cliente</div>
                  <div className="summary-value">{cliente.nome || "—"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Programa</div>
                  <div className="summary-value">{selectedPrograma.nome || programaForm.nome || "—"}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Incentivo</div>
                  <div className="summary-value">{programaForm.pct || 0}% {programaForm.tipo || ""}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Módulos</div>
                  <div className="summary-value">{activeServicos.length} de {servicos.length}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Validade</div>
                  <div className="summary-value">{proposta.validade || 30} dias</div>
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Checklist</div>
                <div className="propostas-checklist">
                  {checklist.map((item) => (
                    <div key={item.label} className="propostas-checklist-item">
                      <span className={`propostas-checkmark ${item.ok ? "ok" : "warning"}`}>{item.ok ? "✓" : "!"}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-inner">
                <div className="section-heading">Resumo financeiro</div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Módulo</th>
                        <th>Honorários</th>
                        <th style={{ textAlign: "right" }}>Valor</th>
                        <th>Condições</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamentoLinhas.map((servico) => (
                        <tr key={servico.id}>
                          <td>
                            <strong>Módulo {servico.codigo}</strong>
                            <br />
                            <span className="muted">{servico.nome}</span>
                          </td>
                          <td>{servico.honorarioLabel}</td>
                          <td style={{ textAlign: "right" }}>{formatCurrency(servico.valor)}</td>
                          <td>{servico.condicoes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
              onClick={() => (currentStep === stepTitles.length ? gerarProposta() : goStep(currentStep + 1))}
            >
              {currentStep === stepTitles.length ? "Gerar ▶" : "Próximo →"}
            </button>
          </div>
        </main>
      </div>

      {showProgramasModal && (
        <div className="modal-overlay" onClick={() => setShowProgramasModal(false)}>
          <div
            className="modal-content"
            style={{ width: "min(1080px, 94vw)", maxWidth: "1080px", maxHeight: "90vh" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Gerir Programas</h3>
              <button className="close-btn" type="button" onClick={() => setShowProgramasModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) minmax(0, 1.4fr)", gap: "14px" }}>
              <div className="card-inner" style={{ background: "white", overflow: "auto", maxHeight: "70vh" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <strong>Programas registados</strong>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => {
                      setProgramaModalEditId(null);
                      setProgramaModalForm(emptyProgramaModalForm);
                    }}
                  >
                    Novo
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {programasDb.map((programa) => (
                    <button
                      key={programa.dbId || programa.id}
                      type="button"
                      className="propostas-programa-card"
                      style={{
                        borderColor: programaModalEditId === programa.dbId ? "var(--color-btnPrimary)" : undefined,
                        opacity: programa.ativo === false ? 0.72 : 1,
                      }}
                      onClick={() => selecionarProgramaNoModal(programa)}
                    >
                      <div className="propostas-programa-title">{programa.nome}</div>
                      <div className="muted">{programa.codigo}</div>
                      <div className="propostas-pill-list">
                        <span className={`badge ${programa.ativo === false ? "badge-danger" : "badge-success"}`}>
                          {programa.ativo === false ? "Inativo" : "Ativo"}
                        </span>
                        {programa.regiao && <span className="badge badge-warning">{programa.regiao}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-inner" style={{ background: "white", overflow: "auto", maxHeight: "70vh" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <strong>{programaModalEditId ? "Editar programa" : "Novo programa"}</strong>
                  {programaModalEditId && (
                    <button
                      type="button"
                      className="btn-small"
                      onClick={alternarAtivoProgramaNoModal}
                      disabled={isProgramaModalSubmitting}
                    >
                      {programaModalForm.ativo === false ? "Ativar" : "Desativar"}
                    </button>
                  )}
                </div>

                <div className="field-grid">
                  <div className="field">
                    <label>Código</label>
                    <input
                      type="text"
                      value={programaModalForm.codigo}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, codigo: event.target.value }))}
                      placeholder="ex. sice_qual_2030"
                    />
                  </div>
                  <div className="field">
                    <label>Nome</label>
                    <input
                      type="text"
                      value={programaModalForm.nome}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, nome: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Aviso</label>
                    <input
                      type="text"
                      value={programaModalForm.aviso}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, aviso: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Incentivo (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={programaModalForm.pct}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, pct: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Tipo de incentivo</label>
                    <select
                      value={programaModalForm.tipo}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, tipo: event.target.value }))}
                    >
                      <option value="fundo perdido (não reembolsável)">Fundo perdido (não reembolsável)</option>
                      <option value="reembolsável">Reembolsável</option>
                      <option value="misto">Misto</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Investimento mínimo (€)</label>
                    <input
                      type="number"
                      min="0"
                      value={programaModalForm.inv_min}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, inv_min: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Região</label>
                    <input
                      type="text"
                      value={programaModalForm.regiao}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, regiao: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Prazo 1.ª fase</label>
                    <input
                      type="date"
                      value={programaModalForm.prazo1}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, prazo1: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Prazo 2.ª fase</label>
                    <input
                      type="date"
                      value={programaModalForm.prazo2}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, prazo2: event.target.value }))}
                    />
                  </div>
                  <div className="field span-2">
                    <label>Descrição</label>
                    <textarea
                      rows="3"
                      value={programaModalForm.descricao}
                      onChange={(event) => setProgramaModalForm((previous) => ({ ...previous, descricao: event.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" className="btn-primary" onClick={guardarProgramaNoModal} disabled={isProgramaModalSubmitting}>
                    {isProgramaModalSubmitting ? "A guardar..." : programaModalEditId ? "Atualizar programa" : "Criar programa"}
                  </button>

                  {programaModalEditId && (
                    <button
                      type="button"
                      className="btn-soft-cta"
                      onClick={() => {
                        const target = programasDb.find((item) => item.dbId === programaModalEditId);
                        if (target) usarProgramaNaProposta(target);
                      }}
                    >
                      Usar nesta proposta
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="toast-notification success">{toastMessage}</div>}
    </div>
  );
}