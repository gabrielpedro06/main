// Vocabulário do fluxo de conteúdos (Marketing). Baseado no fluxo que a equipa usava no Notion.

/** Etapas do fluxo, por ordem. "ideia" e "arquivado" ficam fora do quadro. */
export const ETAPAS = [
  { id: "curadoria", label: "Curadoria", cor: "#8b5cf6", dica: "Escolher o tema e recolher referências" },
  { id: "briefing", label: "Briefing", cor: "#0ea5e9", dica: "Objetivo, público, mensagem e formato" },
  { id: "producao", label: "Programação", cor: "#f97316", dica: "Copy, datas e plano da peça" },
  { id: "criacao", label: "Criação", cor: "#ec4899", dica: "Design e produção da peça" },
  { id: "aprovacao", label: "Aprovação", cor: "#f59e0b", dica: "À espera de validação" },
  { id: "agendado", label: "Agendado", cor: "#6366f1", dica: "Aprovado e com data marcada" },
  { id: "publicado", label: "Publicado", cor: "#10b981", dica: "Já está no ar" },
  { id: "monitorado", label: "Monitorado", cor: "#14b8a6", dica: "Resultados registados" },
];

export const ESTADO_IDEIA = { id: "ideia", label: "Ideia", cor: "#eab308" };
export const ESTADO_ARQUIVO = { id: "arquivado", label: "Arquivado", cor: "#94a3b8" };

export const ESTADOS_TODOS = [ESTADO_IDEIA, ...ETAPAS, ESTADO_ARQUIVO];
export const estadoInfo = (id) => ESTADOS_TODOS.find((e) => e.id === id) || ESTADO_IDEIA;
export const ETAPAS_ANTES_AGENDAR = ["curadoria", "briefing", "producao", "criacao", "aprovacao"];

export const CANAIS = [
  { id: "Instagram", cor: "#e1306c", sigla: "IG" },
  { id: "Facebook", cor: "#1877f2", sigla: "FB" },
  { id: "LinkedIn", cor: "#0a66c2", sigla: "IN" },
  { id: "TikTok", cor: "#111827", sigla: "TT" },
  { id: "YouTube", cor: "#ff0000", sigla: "YT" },
  { id: "E-mail", cor: "#0f766e", sigla: "@" },
  { id: "WhatsApp", cor: "#22c55e", sigla: "WA" },
  { id: "Blog", cor: "#a16207", sigla: "BL" },
  { id: "Website", cor: "#475569", sigla: "WW" },
];
export const canalInfo = (id) => CANAIS.find((c) => c.id === id) || { id, cor: "#64748b", sigla: String(id || "?").slice(0, 2).toUpperCase() };

export const FORMATOS = [
  "Feed único",
  "Carrossel",
  "Reel / vídeo curto",
  "Story",
  "Newsletter",
  "Email marketing",
  "Artigo / blog",
  "Notícia",
  "Imagem",
  "PDF",
  "Flyer",
  "Página web",
];

export const OBJETIVOS = [
  "Divulgação de agenda",
  "Geração de leads",
  "Qualificação de leads",
  "Lançamento",
  "Atrair tráfego",
  "Lembrança de marca",
  "Posicionamento",
  "Promocional",
  "Institucional",
  "Comunicação interna",
];

/** Etapa do funil (no Notion: "Estratégia") */
export const ESTRATEGIAS = [
  "Reconhecimento (awareness)",
  "Educação",
  "Consideração",
  "Engajamento",
  "Conversão",
  "Fidelização",
  "Valorização",
  "Indicação (advocacy)",
];

export const EDITORIAS = [
  "Agenda",
  "Educativo",
  "Informação",
  "Cursos online",
  "Conversão",
  "Comemorações",
  "Bastidores",
  "Notícias",
  "Soluções",
  "Sabia que",
  "Mitos e verdades",
  "Prova social",
  "Vagas abertas",
  "Interesse",
];

export const PRIORIDADES = [
  { id: "alta", label: "Alta", cor: "#ef4444" },
  { id: "media", label: "Média", cor: "#f59e0b" },
  { id: "baixa", label: "Baixa", cor: "#94a3b8" },
];
export const prioridadeInfo = (id) => PRIORIDADES.find((p) => p.id === id) || null;

export const METRICAS = ["Alcance", "Engajamento", "Visualizações", "Cliques", "Leads", "Inscrições", "Seguidores", "Retenção"];

export const AVALIACOES = [
  { id: "excelente", label: "Excelente", cor: "#10b981" },
  { id: "bom", label: "Bom", cor: "#22c55e" },
  { id: "razoavel", label: "Razoável", cor: "#f59e0b" },
  { id: "fraco", label: "Fraco", cor: "#ef4444" },
];
export const avaliacaoInfo = (id) => AVALIACOES.find((a) => a.id === id) || null;

export const CORES_MARCA = ["#0d124b", "#2563eb", "#0ea5e9", "#14b8a6", "#16a34a", "#84cc16", "#eab308", "#f97316", "#ef4444", "#db2777", "#9333ea", "#475569"];

/* ---------- Buyer personas ---------- */
export const GENEROS = ["Feminino", "Masculino", "Outro"];
export const RENDIMENTOS = ["Até 1.500 €", "1.500 € – 3.000 €", "3.000 € – 6.000 €", "Mais de 6.000 €"];
