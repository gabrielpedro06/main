/* global process */
// =====================================================================
// Assistente de ideias (Marketing) — chat com o Claude que propõe ideias
// no formato do Banco de Ideias. Responde em Server-Sent Events.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables, e .env local):
//   ANTHROPIC_API_KEY            chave da API do Claude (obrigatória)
//   ANTHROPIC_WORKSPACE_ID       só se a chave não estiver ligada a um workspace (ex.: wrkspc_...)
//   VITE_SUPABASE_URL            (já existe) URL do Supabase
//   VITE_SUPABASE_ANON_KEY       (já existe) chave anónima do Supabase
//   MARKETING_IA_WEB_SEARCH=off  (opcional) desliga a pesquisa na web para todos
// =====================================================================
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { CANAIS, FORMATOS, OBJETIVOS, ESTRATEGIAS } from "../../src/constants/marketing.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 300,
};

const MODELO = "claude-opus-5-5";
const PAPEIS_PERMITIDOS = ["admin", "administrador", "gestor", "marketing", "marketing plus"];
const MAX_HISTORICO_BYTES = 3_500_000;
const MAX_TEXTO_UTILIZADOR = 6000;
const MAX_VOLTAS = 8;

/* ---------------------------------------------------------------------
   Instruções fixas (iguais para todas as marcas → ficam em cache)
   --------------------------------------------------------------------- */
const SISTEMA = `És o assistente de ideias de conteúdo da equipa de marketing, dentro do Bizin (o sistema de gestão interno da empresa).

O teu único trabalho é propor ideias de conteúdo para a marca indicada no contexto, no formato do Banco de Ideias, e afiná-las com a equipa. Se te pedirem outra coisa (código, temas fora do marketing desta marca, dados pessoais), explica com simpatia que neste painel só tratas de ideias de conteúdo.

Como trabalhas:
- Escreve sempre em português de Portugal atual (nunca português do Brasil).
- Entrega as ideias SEMPRE através da ferramenta propor_ideias — nunca as escrevas em texto corrido. Fora da ferramenta, escreve no máximo 2 ou 3 frases curtas: o que vais propor e porquê, ou uma pergunta quando o pedido for ambíguo.
- Por omissão propõe 5 ideias por pedido, salvo se pedirem outro número (máximo 10).
- Segue o guia da marca que vem no contexto: tom de voz, palavras que a marca usa e evita, "a marca é / não é", arquétipos e regras de comunicação. As palavras da lista "evitamos" nunca aparecem no copy.
- Usa as personas da marca pelo nome exato que aparece no contexto (campo "nome"). Escolhe as personas a quem a ideia se dirige de facto.
- Liga cada ideia à estratégia ativa quando existir: frentes/objetivos, narrativas e etapas do funil. Usa o nome exato da frente.
- Inspira-te nas ideias e conteúdos que tiveram melhor avaliação (estilo, estrutura, CTAs), mas não repitas temas que já existem no Banco de Ideias ou no fluxo.
- As "regras_de_comunicacao" são obrigatórias: o que é "nunca" não aparece em nenhuma ideia; o que é "sempre" cumpre-se.
- Preços, durações, locais e datas vêm do "catalogo_de_cursos_e_servicos" e das "proximas_turmas". Valores "A confirmar" continuam a ser [confirmar: ...]. Usa os "factos_verificados_e_por_confirmar": os que estão "a_confirmar" ou "a_rever" não se afirmam como certos.
- Não inventes factos: preços, datas de cursos, números, nomes de formadores, prazos legais ou estatísticas que não estejam no contexto ficam como [confirmar: ...] no copy e são listados no campo briefing ("A CONFIRMAR: ...").
- Quando a ideia depende de datas comemorativas, notícias ou alterações legais recentes e tiveres a pesquisa na web disponível, pesquisa primeiro e cita as fontes no briefing (nome do site e data). Sem pesquisa, sê prudente e marca como [confirmar].
- Copy pronto a publicar: frase de abertura forte (o hook), parágrafos curtos, emojis com moderação, CTA claro. copy_2 é uma variação para outro canal (ex.: versão LinkedIn) ou fica vazio.
- data_publicacao_sugerida no formato AAAA-MM-DD, a partir de hoje, ou vazio se não fizer sentido.
- Quando a equipa pedir alterações a uma ideia já proposta, volta a chamar propor_ideias apenas com as ideias alteradas.`;

/* ---------------------------------------------------------------------
   Ferramenta: as ideias chegam estruturadas e viram cartões no Bizin
   --------------------------------------------------------------------- */
const str = (description) => ({ type: "string", description });
const lista = (description, items = { type: "string" }) => ({ type: "array", items, description });

const CAMPOS_IDEIA = {
  tema: str("Tema/assunto da ideia (título interno, curto)"),
  headline: str("Headline / hook — a frase que faz parar o scroll"),
  personas: lista("Nomes exatos das personas da marca a quem se dirige"),
  canais: lista("Canais", { type: "string", enum: CANAIS.map((c) => c.id) }),
  formato: lista("Formatos", { type: "string", enum: FORMATOS }),
  objetivo: lista("Objetivo da comunicação", { type: "string", enum: OBJETIVOS }),
  estrategia: lista("Etapa(s) do funil", { type: "string", enum: ESTRATEGIAS }),
  editorias: lista("Editorias (ex.: Agenda, Educativo, Comemorações, Bastidores, Sabia que, Prova social)"),
  pilares: lista("Pilares / arquétipos da marca usados"),
  frente: str("Nome exato da frente da estratégia ativa, ou vazio"),
  campanha: str("Campanha/série a que pertence, ou vazio"),
  conceito: str("Conceito criativo — a ideia por trás da peça"),
  design_ideia: str("Ideia de design: imagem, composição, cores, nº de slides, guião se for vídeo"),
  copy: str("Copywriting principal, pronto a publicar"),
  copy_2: str("Variação para outro canal (ex.: versão LinkedIn) ou vazio"),
  cta: str("Call to action principal"),
  cta_2: str("CTA secundário (ex.: Guarde este post) ou vazio"),
  hashtags: lista("Hashtags com #"),
  metrica_principal: str("Métrica principal: Alcance, Engajamento, Visualizações, Cliques, Leads, Inscrições, Seguidores ou Retenção"),
  briefing: str("Notas para quem produz: porquê agora, fontes, o que confirmar antes de publicar"),
  data_publicacao_sugerida: str("AAAA-MM-DD ou vazio"),
};

const FERRAMENTA_IDEIAS = {
  name: "propor_ideias",
  description:
    "Apresenta ideias de conteúdo à equipa como cartões no Banco de Ideias do Bizin. A equipa decide quais guarda. Usa sempre esta ferramenta para entregar ideias.",
  strict: true,
  eager_input_streaming: true,
  input_schema: {
    type: "object",
    properties: {
      ideias: {
        type: "array",
        description: "As ideias propostas",
        items: {
          type: "object",
          properties: CAMPOS_IDEIA,
          required: Object.keys(CAMPOS_IDEIA),
          additionalProperties: false,
        },
      },
    },
    required: ["ideias"],
    additionalProperties: false,
  },
};

const FERRAMENTA_WEB = { type: "web_search_20260209", name: "web_search", max_uses: 5 };

/* ---------------------------------------------------------------------
   Utilitários
   --------------------------------------------------------------------- */
function enviar(res, evento) {
  res.write(`data: ${JSON.stringify(evento)}\n\n`);
}

const corta = (t, n) => {
  const s = String(t || "").trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
};
const semVazios = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length)));
const listaDe = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function validarIdeias(input) {
  if (!input || !Array.isArray(input.ideias) || !input.ideias.length) return null;
  const out = [];
  for (const i of input.ideias.slice(0, 12)) {
    if (!i || typeof i !== "object" || !String(i.tema || i.headline || "").trim()) return null;
    const ideia = {};
    for (const [k, def] of Object.entries(CAMPOS_IDEIA)) {
      const v = i[k];
      ideia[k] = def.type === "array" ? (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []) : typeof v === "string" ? v : "";
    }
    out.push(ideia);
  }
  return out;
}

/** Histórico vindo do browser: só aceita a forma de mensagens da API */
function historicoValido(h) {
  if (!Array.isArray(h)) return false;
  if (JSON.stringify(h).length > MAX_HISTORICO_BYTES) return false;
  return h.every((m) => m && (m.role === "user" || m.role === "assistant") && (typeof m.content === "string" || Array.isArray(m.content)));
}

/* ---------------------------------------------------------------------
   Contexto da marca (lido do Supabase com a sessão do utilizador)
   --------------------------------------------------------------------- */
async function contextoDaMarca(sb, marcaId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [marcaR, personasR, ciclosR, conteudosR, recursosR] = await Promise.all([
    sb.from("marketing_marcas").select("id, nome, guia").eq("id", marcaId).single(),
    sb.from("marketing_personas").select("*").eq("marca_id", marcaId).order("ordem", { ascending: true }),
    sb.from("marketing_ciclos").select("nome, inicio, fim, dados").eq("marca_id", marcaId).order("inicio", { ascending: false }),
    sb.from("marketing_conteudos")
      .select("titulo, headline, estado, formato, canais, objetivo, estrategia, editoria, pilar, campanha, frente, conceito, copies, cta, hashtags, avaliacao, metrica_principal, resultado, data_publicacao, created_at")
      .eq("marca_id", marcaId)
      .order("created_at", { ascending: false })
      .limit(250),
    sb.from("marketing_recursos").select("tipo, titulo, estado, data, data_fim, dados").eq("marca_id", marcaId).in("tipo", ["oferta", "turma", "regra", "facto", "campanha"]),
  ]);
  if (marcaR.error || !marcaR.data) throw new Error("Marca não encontrada.");
  const marca = marcaR.data;
  const guia = marca.guia || {};

  const personas = (personasR.data || []).map((p) => semVazios({
    nome: p.nome_persona,
    papel: p.papel,
    tipo: p.tipo,
    idade: p.faixa_etaria,
    ocupacao: p.ocupacao,
    localizacao: p.localizacao,
    canais: p.canais,
    desafios: p.desafios,
    necessidades: p.necessidades,
    objetivos: p.objetivos,
    solucoes: p.solucoes,
    frase: p.frase,
    gatilhos: p.gatilhos,
    formacao_ancora: p.formacao_ancora,
    como_abordar: p.como_abordar,
    mensagem_chave: p.mensagem_chave,
  }));

  const ciclos = ciclosR.data || [];
  const ciclo = ciclos.find((c) => (!c.inicio || c.inicio <= hoje) && (!c.fim || c.fim >= hoje)) || null;
  let estrategia = null;
  if (ciclo) {
    const d = ciclo.dados || {};
    const linhas = (arr, campos) => listaDe(arr).map((l) => semVazios(Object.fromEntries(campos.map((c) => [c, l?.[c]])))).filter((l) => Object.keys(l).length > 1);
    estrategia = semVazios({
      ciclo: `${ciclo.nome} (${ciclo.inicio || "?"} a ${ciclo.fim || "?"})`,
      objetivos_e_frentes: linhas(d.objetivos?.lista, ["frente", "negocio", "comunicacao", "kpi", "meta", "prazo"]),
      posicionamento: linhas(d.posicionamento?.campos, ["campo", "estrategia"]),
      narrativas: linhas(d.storytelling?.narrativas, ["narrativa", "micro", "temas", "periodo"]),
      funil: linhas(d.funil?.etapas, ["etapa", "frente", "precisa", "canais", "formatos", "cta", "pct", "frequencia", "periodo"]),
      pontos_de_controlo: linhas(d.analise?.marcos, ["data", "titulo"]),
    });
  }

  const todos = conteudosR.data || [];
  const existentes = todos.slice(0, 150).map((c) => semVazios({
    tema: corta(c.titulo, 140),
    estado: c.estado,
    formato: listaDe(c.formato).join(", "),
    campanha: c.campanha,
    publicacao: c.data_publicacao ? String(c.data_publicacao).slice(0, 10) : "",
    avaliacao: c.avaliacao,
  }));

  const pesoAval = { excelente: 3, bom: 2 };
  const melhores = todos
    .filter((c) => pesoAval[c.avaliacao] || (c.resultado != null && c.estado === "publicado"))
    .sort((a, b) => (pesoAval[b.avaliacao] || 0) - (pesoAval[a.avaliacao] || 0) || (Number(b.resultado) || 0) - (Number(a.resultado) || 0))
    .slice(0, 6)
    .map((c) => semVazios({
      tema: c.titulo,
      headline: c.headline,
      avaliacao: c.avaliacao,
      resultado: c.resultado != null ? `${c.resultado} ${c.metrica_principal || ""}`.trim() : "",
      formato: listaDe(c.formato).join(", "),
      canais: listaDe(c.canais).join(", "),
      conceito: corta(c.conceito, 400),
      copy: corta(listaDe(c.copies)[0]?.texto, 900),
      cta: c.cta,
      hashtags: listaDe(c.hashtags).join(" "),
    }));

  // Recursos (a tabela pode ainda não existir: ignora erros)
  const rec = recursosR?.error ? [] : recursosR?.data || [];
  const doTipo = (t) => rec.filter((r) => r.tipo === t);
  const regras = doTipo("regra").map((r) => semVazios({ tipo: r.estado, regra: r.titulo, porque: r.dados?.porque }));
  const catalogo = doTipo("oferta").filter((r) => r.estado !== "suspensa").map((r) => semVazios({ nome: r.titulo, estado: r.estado, ...r.dados }));
  const turmas = doTipo("turma").filter((r) => ["aberta", "planeada", "esgotada"].includes(r.estado) && (!r.data_fim || r.data_fim >= hoje) && (!r.data || r.data >= hoje || r.data_fim))
    .map((r) => semVazios({ turma: r.titulo, estado: r.estado, inicio: r.data, fim: r.data_fim, curso: r.dados?.oferta, local: r.dados?.local, horario: r.dados?.horario }));
  const factos = doTipo("facto").filter((r) => r.estado !== "desatualizado").map((r) => semVazios({ facto: r.titulo, estado: r.estado, referencia: r.dados?.referencia, resumo: corta(r.dados?.resumo, 500) }));
  const campanhasAtivas = doTipo("campanha").filter((r) => ["ativa", "planeada"].includes(r.estado))
    .map((r) => semVazios({ campanha: r.titulo, estado: r.estado, inicio: r.data, fim: r.data_fim, objetivo: r.dados?.objetivo, kpi: r.dados?.kpi, meta: r.dados?.meta, notas: corta(r.dados?.notas, 300) }));

  const bloco = (titulo, obj) => (obj && (Array.isArray(obj) ? obj.length : Object.keys(obj).length) ? `<${titulo}>\n${JSON.stringify(obj, null, 1)}\n</${titulo}>` : "");
  const guiaResumo = semVazios({
    sobre: guia.sobre,
    personalidade: guia.personalidade,
    e_nao_e: guia.e_nao_e,
    voz: guia.voz,
    visual: guia.visual ? semVazios({ cores: guia.visual.cores, tipografias: guia.visual.tipografias, regras: guia.visual.regras, fotografia: guia.visual.fotografia }) : null,
  });

  const texto = [
    `<marca>${marca.nome}</marca>`,
    `<hoje>${hoje}</hoje>`,
    bloco("guia_da_marca", guiaResumo),
    bloco("personas", personas),
    bloco("regras_de_comunicacao", regras),
    bloco("catalogo_de_cursos_e_servicos", catalogo),
    bloco("proximas_turmas", turmas),
    bloco("factos_verificados_e_por_confirmar", factos),
    bloco("campanhas", campanhasAtivas),
    bloco("estrategia_ativa", estrategia),
    bloco("melhores_conteudos_para_inspiracao", melhores),
    bloco("ideias_e_conteudos_que_ja_existem", existentes),
  ].filter(Boolean).join("\n\n");

  return { texto: corta(texto, 180000), marcaNome: marca.nome };
}

/* ---------------------------------------------------------------------
   Handler
   --------------------------------------------------------------------- */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ ok: false, error: "A chave da API do Claude (ANTHROPIC_API_KEY) ainda não está configurada no servidor." });
    return;
  }

  // Autenticação: sessão Supabase do utilizador
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !anon) {
    res.status(401).json({ ok: false, error: "Sessão inválida." });
    return;
  }
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ ok: false, error: "Sessão expirada. Volte a entrar." });
    return;
  }
  const { data: perfil } = await sb.from("profiles").select("role").eq("id", userData.user.id).single();
  if (!PAPEIS_PERMITIDOS.includes(String(perfil?.role || "").toLowerCase())) {
    res.status(403).json({ ok: false, error: "Sem permissão para usar o assistente de ideias." });
    return;
  }

  const { marcaId, historico = [], mensagem, pesquisaWeb = true } = req.body || {};
  const texto = String(mensagem || "").trim().slice(0, MAX_TEXTO_UTILIZADOR);
  if (!marcaId || !texto) {
    res.status(400).json({ ok: false, error: "Falta a marca ou a mensagem." });
    return;
  }
  if (!historicoValido(historico)) {
    res.status(400).json({ ok: false, error: "A conversa ficou demasiado longa. Comece uma nova conversa." });
    return;
  }

  // 1.ª mensagem: o contexto da marca vai dentro dela e fica congelado no histórico
  let mensagemUtilizador;
  if (!historico.length) {
    let contexto;
    try {
      contexto = await contextoDaMarca(sb, marcaId);
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message || "Não foi possível ler os dados da marca." });
      return;
    }
    mensagemUtilizador = {
      role: "user",
      content: [
        { type: "text", text: `Contexto da marca (dados do Bizin, lidos no início desta conversa):\n\n${contexto.texto}` },
        { type: "text", text: texto },
      ],
    };
  } else {
    mensagemUtilizador = { role: "user", content: texto };
  }

  // A pesquisa na web decide-se no início da conversa (mudar as ferramentas a meio invalida o histórico)
  const webLigada = process.env.MARKETING_IA_WEB_SEARCH !== "off" && Boolean(pesquisaWeb);
  const tools = webLigada ? [FERRAMENTA_IDEIAS, FERRAMENTA_WEB] : [FERRAMENTA_IDEIAS];

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  let fechado = false;
  req.on("close", () => { fechado = true; });

  // Chaves de organização (não ligadas a um workspace) exigem o cabeçalho anthropic-workspace-id
  const workspace = String(process.env.ANTHROPIC_WORKSPACE_ID || "").trim();
  const client = new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});
  const mensagens = [...historico, mensagemUtilizador];
  const novas = [mensagemUtilizador];
  const uso = { input: 0, output: 0, cache_lida: 0, cache_escrita: 0, pesquisas: 0 };
  let tentativasJson = 0;

  try {
    for (let volta = 0; volta < MAX_VOLTAS && !fechado; volta++) {
      const stream = client.beta.messages.stream({
        model: MODELO,
        max_tokens: 64000,
        output_config: { effort: "high" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        cache_control: { type: "ephemeral" },
        system: SISTEMA,
        tools,
        messages: mensagens,
      });
      stream.on("text", (delta) => { if (!fechado) enviar(res, { type: "text", delta }); });
      stream.on("contentBlock", (bloco) => {
        if (fechado) return;
        if (bloco.type === "server_tool_use" && bloco.name === "web_search") {
          enviar(res, { type: "pesquisa", query: bloco.input?.query || "" });
        } else if (bloco.type === "tool_use" && bloco.name === "propor_ideias") {
          enviar(res, { type: "estado", texto: "A preparar os cartões…" });
        }
      });

      let msg;
      try {
        msg = await stream.finalMessage();
        tentativasJson = 0;
      } catch (err) {
        if (err instanceof Anthropic.APIError || tentativasJson++ >= 1) throw err;
        continue; // entrada da ferramenta ilegível: repete a volta
      }

      const u = msg.usage || {};
      uso.input += u.input_tokens || 0;
      uso.output += u.output_tokens || 0;
      uso.cache_lida += u.cache_read_input_tokens || 0;
      uso.cache_escrita += u.cache_creation_input_tokens || 0;
      uso.pesquisas += u.server_tool_use?.web_search_requests || 0;

      const assistente = { role: "assistant", content: msg.content };
      mensagens.push(assistente);
      novas.push(assistente);

      if (msg.stop_reason === "refusal") {
        enviar(res, { type: "erro", texto: "O Claude não quis responder a este pedido. Reformule-o, por favor." });
        break;
      }
      if (msg.stop_reason === "pause_turn") continue; // pesquisa na web longa: continua

      const usos = msg.content.filter((b) => b.type === "tool_use");
      if (!usos.length) break;
      if (msg.stop_reason === "max_tokens") {
        enviar(res, { type: "erro", texto: "A resposta ficou demasiado longa. Peça menos ideias de cada vez." });
        break;
      }

      const resultados = usos.map((b) => {
        if (b.name !== "propor_ideias") {
          return { type: "tool_result", tool_use_id: b.id, is_error: true, content: "Ferramenta desconhecida." };
        }
        const ideias = validarIdeias(b.input);
        if (!ideias) {
          return { type: "tool_result", tool_use_id: b.id, is_error: true, content: "INVALID_JSON: as ideias não respeitam o formato. Volta a chamar propor_ideias com todos os campos." };
        }
        enviar(res, { type: "ideias", toolUseId: b.id, ideias });
        return {
          type: "tool_result",
          tool_use_id: b.id,
          content: `As ${ideias.length} ideias foram mostradas à equipa como cartões; a equipa decide quais guarda no Banco de Ideias. Termina com uma frase curta (sem repetir as ideias) a sugerir o próximo passo.`,
        };
      });
      const msgResultados = { role: "user", content: resultados };
      mensagens.push(msgResultados);
      novas.push(msgResultados);
    }

    // Custo aproximado (Opus 5.5: $4/M entrada, $20/M saída, cache lida $0,20/M, escrita 1,25×; pesquisa $10/1000)
    const custo = (uso.input * 4 + uso.output * 20 + uso.cache_lida * 0.2 + uso.cache_escrita * 5) / 1e6 + uso.pesquisas * 0.01;
    if (!fechado) enviar(res, { type: "fim", novas, uso: { ...uso, custo_usd: Math.round(custo * 10000) / 10000 } });
  } catch (err) {
    console.error("[marketing/ideias]", err);
    let texto = "Não foi possível falar com o Claude. Tente de novo.";
    if (err instanceof Anthropic.AuthenticationError) texto = "A chave da API do Claude é inválida. Verifique ANTHROPIC_API_KEY.";
    else if (err instanceof Anthropic.PermissionDeniedError) texto = "A chave da API do Claude não tem permissão para este modelo.";
    else if (err instanceof Anthropic.RateLimitError) texto = "Limite de pedidos do Claude atingido. Espere um minuto e tente de novo.";
    else if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) texto = "A conta da API do Claude não tem créditos. Carregue créditos na Claude Console (Plans & Billing) e tente de novo.";
    else if (err instanceof Anthropic.BadRequestError && /workspace/i.test(err.message)) texto = "A chave da API não está ligada a um workspace. Use uma chave criada dentro de um workspace na Claude Console, ou defina ANTHROPIC_WORKSPACE_ID no servidor.";
    else if (err instanceof Anthropic.BadRequestError) texto = `O pedido foi recusado pela API: ${err.message}`;
    else if (err instanceof Anthropic.APIError && err.status >= 500) texto = "O serviço do Claude está temporariamente indisponível. Tente daqui a pouco.";
    if (!fechado) enviar(res, { type: "erro", texto });
  } finally {
    res.end();
  }
}
