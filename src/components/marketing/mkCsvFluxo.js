// Importação do "Fluxo de Conteúdos" e do "Banco de Ideias" exportados do Notion (CSV)
import { lerCsv } from "./mkCsv";
import { CANAIS } from "../../constants/marketing";
import { norm } from "./mkUtils";

const MESES = { janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
const pad = (n) => String(n).padStart(2, "0");

/** "12 de agosto de 2026 14:15 (GMT+1)" → { iso, dia } (dia = "YYYY-MM-DD") */
export function dataPt(txt) {
  const m = norm(txt).match(/(\d{1,2}) de ([a-z]+) de (\d{4})(?:\s+(\d{1,2}):(\d{2}))?(?:\s*\((?:gmt|utc)\s*([+-]\d{1,2})?\))?/);
  if (!m || MESES[m[2]] == null) return null;
  const [, d, mes, y, h, mi, off] = m;
  const dia = `${y}-${pad(MESES[mes] + 1)}-${pad(d)}`;
  let iso;
  if (h != null && /\((gmt|utc)/.test(norm(txt))) {
    iso = new Date(Date.UTC(+y, MESES[mes], +d, +h - (off ? +off : 0), +mi)).toISOString();
  } else {
    iso = new Date(+y, MESES[mes], +d, h != null ? +h : 10, mi != null ? +mi : 0).toISOString();
  }
  return { iso, dia };
}

const separar = (v) => String(v || "").split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);
const numero = (v) => {
  const t = String(v || "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  return t && !Number.isNaN(Number(t)) ? Number(t) : null;
};
const sim = (v) => /^(yes|sim|true|✓)$/i.test(String(v || "").trim());

/** "Gestor/Influenciador (https://...), Empregador/Empresário (https://...)" → nomes */
function nomesRelacao(v) {
  const t = String(v || "");
  const comLink = [...t.matchAll(/([^,(]+?)\s*\((?:https?:|[^)]*\.html)[^)]*\)/g)].map((m) => m[1].trim());
  return comLink.length ? comLink : separar(t);
}

const CANAL_ALIAS = { email: "E-mail", "e-mail": "E-mail", site: "Website", web: "Website" };
const mapCanal = (v) => CANAIS.find((c) => norm(c.id) === norm(v))?.id || CANAL_ALIAS[norm(v)] || v;

const FORMATO_ALIAS = {
  "feed unico": "Feed único", "feed carrossel": "Carrossel", carrossel: "Carrossel", "reels/video curto": "Reel / vídeo curto",
  reels: "Reel / vídeo curto", "story/stories": "Story", stories: "Story", "email marketing": "Email marketing",
  "noticia blog": "Notícia", noticia: "Notícia", webpage: "Página web", newsletter: "Newsletter", pdf: "PDF", flyer: "Flyer", imagem: "Imagem",
};
const mapFormato = (v) => FORMATO_ALIAS[norm(v).trim()] || v;

const ESTRATEGIA_ALIAS = [
  ["awareness", "Reconhecimento (awareness)"], ["reconhecimento", "Reconhecimento (awareness)"],
  ["educa", "Educação"], ["consider", "Consideração"], ["engag", "Engajamento"], ["engaj", "Engajamento"],
  ["convers", "Conversão"], ["loyalty", "Fidelização"], ["fideliz", "Fidelização"], ["value", "Valorização"], ["valoriz", "Valorização"],
  ["advocacy", "Indicação (advocacy)"], ["indica", "Indicação (advocacy)"],
];
const mapEstrategia = (v) => ESTRATEGIA_ALIAS.find(([k]) => norm(v).includes(k))?.[1] || v;

const ESTADO_ALIAS = {
  curadoria: "curadoria", briefing: "briefing", programacao: "producao", producao: "producao", criacao: "criacao",
  aprovacao: "aprovacao", agendado: "agendado", publicado: "publicado", monitorado: "monitorado", arquivado: "arquivado", arquivada: "arquivado",
};
const AVALIACAO_ALIAS = { excelente: "excelente", bom: "bom", razoavel: "razoavel", ruim: "fraco", fraco: "fraco", mau: "fraco" };
const PRIORIDADE_ALIAS = { alta: "alta", media: "media", baixa: "baixa" };

/** Lê o 1.º "[Título]" de um copy, ex.: "[Legenda Instagram]\n..." */
function copyComTitulo(txt, n) {
  const t = String(txt || "").replace(/^\s+/, "");
  const m = t.match(/^\[([^\]]{2,60})\]\s*\n?/);
  return m ? { titulo: m[1].trim(), texto: t.slice(m[0].length).trim() } : { titulo: `Copy ${n}`, texto: t.trim() };
}

/**
 * CSV (texto) → { conteudos, avisos }
 * contexto: { personas, perfis, existentes: Set<norm(titulo)> }
 * Cada conteúdo traz `_info` (personas/responsáveis não encontrados, duplicado) que não vai para a BD.
 */
export function conteudosDoCsv(texto, { personas = [], perfis = [], existentes = new Set() } = {}) {
  const linhas = lerCsv(texto);
  if (linhas.length < 2) throw new Error("O ficheiro está vazio ou só tem cabeçalho.");
  const chave = (h) => norm(h).replace(/[^\p{L}\p{N}/ ]/gu, "").replace(/\s+/g, " ").trim();
  const cab = linhas[0].map(chave);
  const col = (row, ...nomes) => {
    for (const n of nomes) {
      const i = cab.indexOf(chave(n));
      if (i >= 0 && String(row[i] || "").trim()) return String(row[i]).trim();
    }
    return "";
  };
  const temTitulo = cab.some((h) => h === "tema/assunto" || h === "headline/hook");
  if (!temTitulo) throw new Error("Não encontrei a coluna \"Tema/Assunto\". É o export do Fluxo de Conteúdos ou do Banco de Ideias?");

  const personaPorNome = (nome) => {
    const n = norm(nome).trim();
    return personas.find((p) => norm(p.papel).trim() === n || norm(p.nome_persona).trim() === n) || null;
  };
  const perfilPorNome = (nome) => {
    const n = norm(nome).trim();
    return perfis.find((p) => norm(p.nome).trim() === n || norm(p.nome).split(/\s+/)[0] === n.split(/\s+/)[0]) || null;
  };

  const vistos = new Set();
  const conteudos = [];
  for (const row of linhas.slice(1)) {
    const titulo = (col(row, "Tema/Assunto") || col(row, "Headline/Hook")).replace(/\s+/g, " ").trim();
    if (!titulo) continue;

    // Estado: Status do fluxo, ou (Banco de Ideias) Estado da ideia + Status = avaliação
    const status = norm(col(row, "Status"));
    const estadoIdeia = norm(col(row, "Estado da ideia"));
    let estado = ESTADO_ALIAS[status] || null;
    let avaliacao = AVALIACAO_ALIAS[status] || null;
    let prioridade = PRIORIDADE_ALIAS[norm(col(row, "Prioridade"))] || null;
    if (status === "prioridade") prioridade = "alta";
    if (!estado) {
      if (estadoIdeia.startsWith("arquivad")) estado = "arquivado";
      else if (estadoIdeia.startsWith("passou")) estado = "curadoria";
      else estado = "ideia";
    }

    const pubTxt = col(row, "Data de Publicação", "Data Publicação");
    const pub = dataPt(pubTxt);
    const criada = dataPt(col(row, "Criada em"));
    const notas = [];
    if (pubTxt.includes("→")) notas.push(`Período no Notion: ${pubTxt}`);
    if (col(row, "Adicionado ao Fluxo")) notas.push(`Adicionado ao fluxo no Notion: ${col(row, "Adicionado ao Fluxo")}`);
    const pub2 = dataPt(col(row, "Data II de Publicação", "Data II Publicação"));
    const entrega = dataPt(col(row, "Data de Entrega"));

    const nomesPersonas = nomesRelacao(col(row, "👤 Buyer Personas", "Buyer Personas"));
    const personaIds = [];
    const personasEmFalta = [];
    for (const n of nomesPersonas) { const p = personaPorNome(n); if (p) { if (!personaIds.includes(p.id)) personaIds.push(p.id); } else personasEmFalta.push(n); }

    const nomesResp = separar(col(row, "Responsável"));
    const respIds = [];
    const respEmFalta = [];
    for (const n of nomesResp) { const p = perfilPorNome(n); if (p) { if (!respIds.includes(p.id)) respIds.push(p.id); } else respEmFalta.push(n); }

    const copies = ["Copywriting 1", "Copywriting 2", "Copywriting 3", "Copywriting 4"]
      .map((c, i) => col(row, c) && copyComTitulo(col(row, c), i + 1)).filter(Boolean);

    const links = [];
    const anexos = [];
    for (const [c, cat] of [["Design 1", "design"], ["Design 2", "design"], ["Briefing Anexo", "briefing"], ["Briefing Anexos", "briefing"]]) {
      const v = col(row, c);
      if (!v) continue;
      for (const parte of v.split(/\s*,\s*(?=\S)/)) {
        const limpo = decodeURIComponent(parte.split("/").pop() || parte);
        if (/^https?:\/\//i.test(parte) && !/app\.notion\.com\\/.test(parte)) links.push({ label: c, url: parte });
        else if (limpo) anexos.push({ nome: limpo, url: "", categoria: cat });
      }
    }

    const hashtags = separar(col(row, "Hashtags")).map((h) => (h.startsWith("#") ? h : `#${h.replace(/\s+/g, "")}`));
    const resultado = numero(col(row, "Métrica Resultado"));
    const aprovado = sim(col(row, "Aprovado"));

    const kTitulo = norm(titulo).trim();
    const duplicado = existentes.has(kTitulo) || vistos.has(kTitulo);
    vistos.add(kTitulo);

    conteudos.push({
      titulo,
      estado,
      estado_antes_arquivo: estado === "arquivado" ? (estadoIdeia ? "ideia" : null) : null,
      prioridade,
      avaliacao,
      briefing: col(row, "Briefing") || null,
      headline: col(row, "Headline/Hook") && col(row, "Tema/Assunto") ? col(row, "Headline/Hook") : null,
      conceito: col(row, "Conceito Criativo") || null,
      design_ideia: col(row, "Design Ideia") || null,
      variacoes: col(row, "Variações da Ideia") || null,
      cta: col(row, "CTA") || null,
      cta_2: col(row, "CTA 2") || null,
      canais: [...new Set(separar(col(row, "Canais de Comunicação")).map(mapCanal))],
      formato: [...new Set(separar(col(row, "Formato")).map(mapFormato))],
      objetivo: separar(col(row, "Objetivo da Comunicação")),
      estrategia: [...new Set(separar(col(row, "Estratégia")).map(mapEstrategia))],
      editoria: separar(col(row, "Editorias")),
      pilar: separar(col(row, "Pilares/Arquétipos")),
      hashtags: [...new Set(hashtags)],
      copies,
      links,
      anexos,
      campanha: col(row, "Tema/Assunto 1") || null,
      data_publicacao: pub?.iso || null,
      data_publicacao_2: pub2?.iso || null,
      data_entrega: entrega?.dia || null,
      metrica_principal: col(row, "Métrica Principal") || null,
      resultado,
      verba: numero(col(row, "Verba Campanha", "Verba da Campanha")),
      verba_usada: numero(col(row, "Valor Utilizado da Campanha")),
      alteracoes: col(row, "Obs. Alterações Necessárias") || null,
      aprovado_em: aprovado ? new Date().toISOString() : null,
      notas: notas.length ? notas.join("\n") : null,
      ...(criada ? { created_at: criada.iso } : {}),
      persona_ids: personaIds,
      responsavel_ids: respIds,
      responsavel_id: respIds[0] || null,
      _info: { duplicado, personasEmFalta, respEmFalta },
    });
  }
  if (!conteudos.length) throw new Error("Não encontrei conteúdos no ficheiro.");
  const fonte = cab.includes("estado da ideia") && !cab.includes("aprovado") ? "banco" : "fluxo";
  return { conteudos, fonte };
}
