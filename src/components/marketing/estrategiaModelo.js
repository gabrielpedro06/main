// Modelo do "Guia de Estratégia de Marca" — estrutura reutilizável para qualquer marca.
// Cada ciclo guarda em `dados` um objeto por secção; cada bloco é uma tabela (linhas) ou texto.

export const ESTADOS_RESULTADO = [
  { id: "atingido", label: "Atingido", cor: "#16a34a" },
  { id: "parcial", label: "Parcial", cor: "#f59e0b" },
  { id: "falhado", label: "Não atingido", cor: "#ef4444" },
];

export const ETAPAS_FUNIL = ["Descoberta (topo)", "Consideração (meio)", "Decisão (fundo)", "Fidelização"];

/** "Etapa do funil" de um conteúdo (campo estratégia) → etapa da tabela do funil */
/** Etapas do funil (sem repetir) de um conteúdo — o campo pode ter várias */
export function etapasDoConteudo(estrategia) {
  const lista = Array.isArray(estrategia) ? estrategia : estrategia ? [estrategia] : [];
  return [...new Set(lista.map(etapaDoConteudo).filter(Boolean))];
}

export function etapaDoConteudo(estrategia) {
  const e = String(estrategia || "").toLowerCase();
  if (!e) return null;
  if (e.startsWith("consider")) return ETAPAS_FUNIL[1];
  if (e.startsWith("convers")) return ETAPAS_FUNIL[2];
  if (e.startsWith("fideliz") || e.startsWith("valoriz") || e.startsWith("indica")) return ETAPAS_FUNIL[3];
  return ETAPAS_FUNIL[0]; // reconhecimento, educação, engajamento
}

const RES = [
  { k: "esperado", label: "Resultado esperado", tipo: "area", meia: true },
  { k: "evidencia", label: "Evidência do resultado obtido", tipo: "area", resultado: true, meia: true },
  { k: "estado", label: "Estado", tipo: "estado", resultado: true },
];
const PERIODO = { k: "periodo", label: "Período", w: "150px" };
const COLS_TATICA = [
  { k: "item", label: "Estratégia / métrica", w: "200px" },
  { k: "tatica", label: "Tática (estratégia micro)", tipo: "area", dica: true },
  { k: "exemplo", label: "Exemplo de diretriz / configuração", tipo: "area" },
  PERIODO,
  ...RES,
];

export const SECCOES_ESTRATEGIA = [
  {
    id: "objetivos", n: 1, titulo: "Objetivos e KPIs", icon: "Target",
    dica: "O que o negócio quer neste ciclo e como a comunicação ajuda. Cada objetivo é uma frente: os conteúdos do fluxo ligam-se a ela.",
    blocos: [{
      k: "lista", vista: "objetivos", add: "Adicionar objetivo",
      colunas: [
        { k: "frente", label: "Frente (nome curto)", w: "160px", placeholder: "Ex.: Online B2C" },
        { k: "negocio", label: "Objetivo de negócio", tipo: "area" },
        { k: "comunicacao", label: "Objetivo de comunicação", tipo: "area" },
        { k: "kpi", label: "KPI principal" },
        { k: "investimento", label: "Investimento" },
        { k: "meta", label: "Meta" },
        { k: "prazo", label: "Prazo" },
        ...RES,
      ],
    }],
  },
  {
    id: "mercado", n: 2, titulo: "Pesquisa de mercado", icon: "Search",
    dica: "Quem disputa a mesma atenção e o que nos distingue.",
    blocos: [{
      k: "concorrentes", add: "Adicionar concorrente",
      colunas: [
        { k: "marca", label: "Marca concorrente", w: "180px" },
        { k: "servicos", label: "Serviços concorrentes", tipo: "area" },
        { k: "diferenciais", label: "Diferenciais de mercado", tipo: "area" },
        { k: "publico", label: "Público-alvo" },
        { k: "fonte", label: "Fonte de dados" },
        PERIODO,
        ...RES,
      ],
    }],
  },
  {
    id: "pesquisa", n: 3, titulo: "Pesquisa de analytics", icon: "Chart",
    dica: "O que as pessoas procuram e o que já resultou nas nossas publicações.",
    blocos: [
      {
        k: "palavras", titulo: "Palavras-chave", add: "Adicionar palavra-chave",
        template: [{ tipo: "Genéricas" }, { tipo: "Segmentadas" }, { tipo: "Específicas" }],
        colunas: [
          { k: "tipo", label: "Tipo", tipo: "select", opcoes: ["Genéricas", "Segmentadas", "Específicas"], w: "150px" },
          { k: "personas", label: "Persona-alvo", tipo: "personas" },
          { k: "termos", label: "Termos", tipo: "area" },
          { k: "fonte", label: "Fonte de dados" },
          PERIODO,
        ],
      },
      {
        k: "desempenho", titulo: "Desempenho de publicações", add: "Adicionar resultado", importar: true,
        colunas: [
          { k: "canal", label: "Canal", w: "140px" },
          { k: "metrica", label: "Métrica", w: "140px" },
          { k: "resultado", label: "Resultado", tipo: "num", w: "110px" },
          { k: "tema", label: "Tema / palavra-chave principal" },
          { k: "formato", label: "Formato", w: "140px" },
          { k: "dia_semana", label: "Dia da semana", w: "130px" },
          { k: "data", label: "Data", tipo: "data", w: "160px" },
          { k: "horario", label: "Horário", w: "100px" },
        ],
      },
    ],
  },
  {
    id: "curadoria", n: 4, titulo: "Curadoria de referência", icon: "Bulb",
    dica: "Marcas e criadores que inspiram — o que fazem bem e o que podemos adaptar.",
    blocos: [{
      k: "referencias", add: "Adicionar referência",
      colunas: [
        { k: "referencia", label: "Referência", w: "180px" },
        { k: "site", label: "Site", tipo: "link" },
        { k: "temas", label: "Temas" },
        { k: "links", label: "Links de conteúdo", tipo: "area" },
        PERIODO,
      ],
    }],
  },
  {
    id: "posicionamento", n: 5, titulo: "Posicionamento da marca", icon: "Flag",
    dica: "A estratégia macro do ciclo: o que dizemos, a quem e porque somos diferentes.",
    blocos: [{
      k: "campos", add: "Adicionar campo",
      template: [
        { campo: "Proposta única de valor", dica: "Numa frase: o que oferecemos, a quem, e o benefício principal." },
        { campo: "Arquétipo primário (dominante)", dica: "Qual o arquétipo que lidera e como se traduz nos conteúdos deste ciclo." },
        { campo: "Arquétipo complementar", dica: "Como apoia o principal (tom, canais, tipo de conteúdo)." },
        { campo: "Arquétipo de suporte", dica: "Onde entra pontualmente." },
        { campo: "Diferenciação da concorrência", dica: "Contra quem competimos e porque nos devem escolher." },
        { campo: "Ticket médio", dica: "Valor atual, objetivo e como subir (pacotes, venda cruzada…)." },
        { campo: "Especificações / restrições", dica: "O que nunca se pode prometer ou dizer; regras legais e de marca." },
        { campo: "Persona principal", dica: "Para quem é este ciclo; personas secundárias." },
        { campo: "Declaração de posicionamento", dica: "Para [persona] que [necessidade], a [marca] é [categoria] que [benefício]. Ao contrário de [alternativas], [diferencial]." },
        { campo: "Hipótese de melhoria", dica: "Se [ação], esperamos [resultado], porque [razão]." },
      ],
      colunas: [
        { k: "campo", label: "Campo", w: "200px" },
        { k: "estrategia", label: "Estratégia macro", tipo: "area", dica: true },
        PERIODO,
        ...RES,
      ],
    }],
  },
  {
    id: "storytelling", n: 6, titulo: "Storytelling — narrativas por persona", icon: "Pen",
    dica: "As histórias que dão coerência aos conteúdos do ciclo.",
    blocos: [{
      k: "narrativas", add: "Adicionar narrativa",
      template: [
        { narrativa: "Metáfora central", dica: "A imagem que resume a promessa (ex.: uma ferramenta, um escudo, um mapa)." },
        { narrativa: "Empatia & memória", dica: "Situações reais que a persona reconhece de imediato." },
        { narrativa: "Vilão / obstáculo", dica: "O problema concreto a vencer — sem usar o medo como argumento." },
        { narrativa: "Jornada do herói", dica: "O cliente é o herói, a marca é o mentor: passos do antes ao depois." },
        { narrativa: "Transformação final", dica: "O resultado visível e verificável." },
        { narrativa: "Reconhecimento (autoridade)", dica: "Provas: certificações, números, testemunhos, parceiros." },
      ],
      colunas: [
        { k: "narrativa", label: "Narrativa", w: "190px" },
        { k: "micro", label: "Estratégia micro", tipo: "area", dica: true },
        { k: "personas", label: "Personas", tipo: "personas" },
        { k: "temas", label: "Temas dos conteúdos", tipo: "area" },
        PERIODO,
        ...RES,
      ],
    }],
  },
  {
    id: "funil", n: 7, titulo: "Funil e jornada do cliente", icon: "Board",
    dica: "Como cada persona nos descobre, decide e fica. O planeado compara-se com os conteúdos reais do fluxo.",
    blocos: [
      {
        k: "jornadas", titulo: "Mapa de jornada", vista: "jornadas", add: "Adicionar jornada",
        colunas: [
          { k: "persona", label: "Persona", tipo: "persona", w: "200px" },
          { k: "descobre", label: "Descobre-nos em" },
          { k: "aprofunda", label: "Aprofunda em" },
          { k: "decide", label: "Decide depois de" },
          { k: "mantem", label: "Mantém-se por" },
        ],
      },
      {
        k: "etapas", titulo: "Etapas por frente", vista: "funil", add: "Adicionar etapa", gerar: true,
        colunas: [
          { k: "etapa", label: "Etapa", tipo: "select", opcoes: ETAPAS_FUNIL, w: "190px" },
          { k: "frente", label: "Frente", tipo: "frente", w: "170px" },
          { k: "personas", label: "Personas", tipo: "personas" },
          { k: "precisa", label: "O que a persona precisa" },
          { k: "canais", label: "Canais" },
          { k: "formatos", label: "Formatos" },
          { k: "pilares", label: "Pilares / editorias" },
          { k: "cta", label: "CTA típico" },
          { k: "pct", label: "% do calendário", tipo: "num", w: "120px" },
          { k: "frequencia", label: "Frequência", w: "150px" },
          PERIODO,
          { k: "metrica", label: "Métrica" },
          ...RES,
        ],
      },
    ],
  },
  {
    id: "analytics", n: 8, titulo: "Análise de dados", icon: "Chart",
    dica: "Como se mede: conversões, SEO, IA/local, redes sociais e anúncios.",
    blocos: [
      {
        k: "conversao", titulo: "Auditoria e inteligência de dados", add: "Adicionar linha", colunas: COLS_TATICA,
        template: [
          { item: "Eventos de conversão primários", dica: "Que ações contam como conversão (inscrição, pedido de proposta, download, clique WhatsApp…)." },
          { item: "Tagueamento de campanhas", dica: "Regra de UTM e nomes de campanha." },
          { item: "Análise de taxa de rejeição", dica: "Como e com que frequência se analisa o envolvimento." },
          { item: "Tempo de permanência", dica: "Referências mínimas por tipo de página." },
          { item: "Etapas da jornada multicanal", dica: "Que canal inicia e que canal fecha em cada frente." },
        ],
      },
      {
        k: "seo", titulo: "SEO — pesquisa no Google", add: "Adicionar linha", colunas: COLS_TATICA,
        template: [
          { item: "Palavras-chave primárias", dica: "Uma página otimizada por palavra-chave primária." },
          { item: "Palavras-chave secundárias", dica: "Para artigos e FAQs, ligadas à página primária." },
          { item: "Intenção de busca", dica: "% informacional · transacional · navegacional." },
          { item: "Links de entrada (ser referenciado)", dica: "Que sites, associações e imprensa nos podem citar." },
          { item: "Links de saída (referenciar fontes)", dica: "Fontes oficiais a citar." },
          { item: "Otimização técnica", dica: "Schema, sitemap, Core Web Vitals, URLs." },
        ],
      },
      {
        k: "geo", titulo: "GEO — motores de IA e geolocalização", add: "Adicionar linha", colunas: COLS_TATICA,
        template: [
          { item: "Parágrafos diretos", dica: "As 2 primeiras linhas respondem: o quê, para quem, duração, modalidade, preço." },
          { item: "Tabelas de resumo", dica: "Uma tabela HTML por produto/serviço com a informação essencial." },
          { item: "FAQs", dica: "Perguntas reais dos clientes, atualizadas com regularidade." },
        ],
      },
      {
        k: "smo", titulo: "SMO — redes sociais", add: "Adicionar linha", colunas: COLS_TATICA, utm: true,
        template: [
          { item: "Diretrizes de otimização", dica: "Tom e público por rede; o que é não negociável." },
          { item: "Hashtags", dica: "Fixas e por tema; máximo por publicação." },
          { item: "Partilhas", dica: "O que se partilha e como se reaproveita cada conteúdo." },
          { item: "Links estratégicos", dica: "Para onde aponta cada link (nunca a homepage)." },
          { item: "Parâmetros UTM padronizados", dica: "utm_source · utm_medium · utm_campaign · utm_content" },
        ],
      },
      {
        k: "sea", titulo: "SEA — anúncios pagos", add: "Adicionar linha", colunas: COLS_TATICA,
        template: [
          { item: "Orçamento por campanha / época", dica: "Total do ciclo e repartição por frente e por mês." },
          { item: "CPC-alvo", dica: "Referência inicial e regra de pausa de anúncios." },
          { item: "Palavras-chave negativas", dica: "Termos a excluir em todas as campanhas." },
          { item: "Público de remarketing", dica: "Quem voltamos a impactar e durante quanto tempo." },
        ],
      },
    ],
  },
  {
    id: "analise", n: 9, titulo: "Análise geral e decisões", icon: "CheckCircle",
    dica: "Pontos de controlo do ciclo e o que fica decidido para o próximo.",
    blocos: [
      {
        k: "marcos", titulo: "Pontos de controlo", vista: "marcos", add: "Adicionar ponto de controlo",
        colunas: [
          { k: "data", label: "Data", tipo: "data", w: "170px" },
          { k: "titulo", label: "O que se avalia" },
          { k: "notas", label: "Notas / dados reais", tipo: "area" },
        ],
      },
      { k: "aprendizados", tipo: "texto", label: "O que os dados ensinaram?" },
      { k: "externos", tipo: "texto", label: "Fatores externos / imprevistos" },
      {
        k: "decisoes", titulo: "Decisões para o próximo ciclo", add: "Adicionar decisão",
        template: [
          { campo: "Manter", dica: "Critério: o que se mantém (ex.: o que atingir ≥ 80% da meta com custo aceitável)." },
          { campo: "Otimizar / escalar", dica: "Critério para escalar uma frente." },
          { campo: "Abandonar / encerrar", dica: "Critério para cortar canais, anúncios ou formatos." },
          { campo: "Investir", dica: "Onde reforçar no próximo ciclo." },
        ],
        colunas: [
          { k: "campo", label: "Decisão", w: "170px" },
          { k: "macro", label: "Estratégia macro", tipo: "area", dica: true },
          { k: "micro", label: "Estratégia micro", tipo: "area" },
          { k: "kpi", label: "KPI principal" },
          PERIODO,
        ],
      },
    ],
  },
];

const clone = (x) => JSON.parse(JSON.stringify(x));

/** Dados vazios de um ciclo novo, com as linhas-modelo de cada tabela */
export function dadosNovoCiclo() {
  const dados = {};
  for (const s of SECCOES_ESTRATEGIA) {
    dados[s.id] = {};
    for (const b of s.blocos) dados[s.id][b.k] = b.tipo === "texto" ? "" : clone(b.template || []);
  }
  return dados;
}

/** Copia a estratégia de um ciclo para outro, limpando resultados, desempenho, marcos e análise */
export function dadosDuplicados(dados) {
  const base = dadosNovoCiclo();
  const out = clone(dados || {});
  for (const s of SECCOES_ESTRATEGIA) {
    out[s.id] = out[s.id] || base[s.id];
    for (const b of s.blocos) {
      if (b.tipo === "texto") { out[s.id][b.k] = ""; continue; }
      const linhas = Array.isArray(out[s.id][b.k]) ? out[s.id][b.k] : [];
      if (b.k === "desempenho" || b.k === "marcos") { out[s.id][b.k] = []; continue; }
      out[s.id][b.k] = linhas.map((l) => { const c = { ...l }; delete c.evidencia; delete c.estado; return c; });
    }
  }
  return out;
}

/** Trimestre atual como sugestão de ciclo novo */
export function trimestreSugerido(ref = new Date()) {
  const mesesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const ini = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const fim = new Date(ref.getFullYear(), ref.getMonth() + 3, 0);
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const nome = `${mesesNome[ini.getMonth()]} ${ini.getFullYear() !== fim.getFullYear() ? ini.getFullYear() + " " : ""}– ${mesesNome[fim.getMonth()]} ${fim.getFullYear()}`;
  return { nome, inicio: iso(ini), fim: iso(fim) };
}

/** Frentes (nomes curtos dos objetivos) de um ciclo */
export const frentesDoCiclo = (ciclo) => [...new Set(((ciclo?.dados?.objetivos?.lista) || []).map((o) => String(o.frente || "").trim()).filter(Boolean))];
