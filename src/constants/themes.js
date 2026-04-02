/**
 * DEFINIÇÃO DE TEMAS
 * Cada tema contém paleta de cores personalizada
 */

const hexToRgb = (hex) => {
  const sanitized = String(hex || "").replace("#", "").trim();
  const normalized = sanitized.length === 3
    ? sanitized.split("").map((c) => c + c).join("")
    : sanitized;

  if (normalized.length !== 6) {
    return { r: 15, g: 23, b: 42 };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const darkenHex = (hex, amount = 18) => {
  const { r, g, b } = hexToRgb(hex);
  const ratio = Math.max(0, Math.min(100, amount)) / 100;
  const toHex = (value) => Math.max(0, Math.round(value * (1 - ratio))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const alpha = (hex, opacity) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const mixHex = (hexA, hexB, ratio = 0.5) => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratio));

  const toHex = (value) => Math.round(value).toString(16).padStart(2, "0");
  const r = a.r * (1 - t) + b.r * t;
  const g = a.g * (1 - t) + b.g * t;
  const bMix = a.b * (1 - t) + b.b * t;

  return `#${toHex(r)}${toHex(g)}${toHex(bMix)}`;
};

const createTheme = (name, description, bgBase, darkBase) => {
  const darker = darkenHex(darkBase, 18);
  const deepest = darkenHex(darkBase, 30);
  const bgSecondary = mixHex(bgBase, "#ffffff", 0.22);
  const bgTertiary = mixHex(bgBase, "#ffffff", 0.38);

  return {
    name,
    description,
    bgGradient: `linear-gradient(135deg, ${bgBase} 0%, ${bgSecondary} 100%)`,
    sidebarBgSecondary: darker,
    accentColor: darkBase,
    colors: {
      bgPrimary: bgBase,
      bgSecondary,
      bgTertiary,

      sidebarBg: darkBase,
      sidebarText: "#e2e8f0",
      sidebarHover: "rgba(255, 255, 255, 0.12)",
      sidebarActive: darkBase,
      toggleBg: darker,
      toggleBorder: deepest,
      toggleText: "#cbd5e1",

      btnPrimary: darkBase,
      btnPrimaryDark: darker,
      btnPrimaryDarker: deepest,
      btnPrimaryShadow: alpha(darkBase, 0.24),
      btnPrimaryShadowHover: alpha(darkBase, 0.34),

      textPrimary: darkBase,
      textSecondary: darkenHex(darkBase, 8),
      textLight: darkenHex(darkBase, 2),
      textWhite: "#ffffff",

      borderColor: darkenHex(bgBase, 8),
      borderColorLight: darkenHex(bgBase, 4),
    },
  };
};

const THEME_CATALOG = [
  ["default", "Padrão", "Tema padrão da aplicação", "#f1f5f9", "#1e293b"],
  ["primavera", "Primavera", "Verde broto", "#f0fdf4", "#166534"],
  ["verao", "Verão", "Amarelo dourado", "#fefce8", "#854d0e"],
  ["outono", "Outono", "Laranja tijolo", "#fff7ed", "#9a3412"],
  ["inverno", "Inverno", "Ciano ártico", "#ecfeff", "#155e75"],
  ["pascoa", "Páscoa", "Rosa blush", "#fdf2f8", "#9d174d"],
  ["natal", "Natal", "Vermelho carmesim", "#fef2f2", "#991b1b"],
  ["religioso", "Religioso", "Roxo ametista", "#faf5ff", "#6b21a8"],
  ["carnaval", "Carnaval", "Vibe magenta/roxo", "#f5f3ff", "#5b21b6"],
  ["santos_populares", "Santos Populares", "Verde manjerico", "#ecfdf5", "#065f46"],
  ["agosto_ferias", "Agosto (Férias)", "Azul oceano", "#f0f9ff", "#075985"],
  ["outubro_rosa", "Outubro Rosa", "Rosa choque social", "#fff1f2", "#be123c"],
  ["novembro_azul", "Novembro Azul", "Azul saúde/prevenção", "#e0f2fe", "#0369a1"],
  ["black_friday", "Black Friday", "Slate/preto profissional", "#f8fafc", "#1e293b"],
  ["ano_novo", "Ano Novo", "Champagne e pedra", "#fafaf9", "#44403c"],
  ["sustentabilidade", "Sustentabilidade", "Verde ecológico", "#ecfdf5", "#15803d"],
  ["urgencia_alerta", "Urgência/Alerta", "Alerta crítico", "#fff1f1", "#991b1b"],
  ["foco_deep_work", "Foco/Deep Work", "Teal planeamento", "#f0fdfa", "#0f766e"],
  ["mindfulness_bem_estar", "Mindfulness/Bem-Estar", "Pedra/taupe relaxante", "#f5f5f4", "#44403c"],
  ["criatividade_lancamento", "Criatividade/Lançamento", "Laranja energético", "#fff7ed", "#c2410c"],
  ["aniversario_empresa", "Aniversário da Empresa", "Dourado premium", "#fefce8", "#a16207"],
  ["halloween_misterio", "Halloween/Mistério", "Carvão e gelo", "#fafaf9", "#1c1917"],
  ["sao_valentim", "S. Valentim/Afetos", "Rosa paixão", "#fff1f2", "#9f1239"],
  ["dia_liberdade", "Dia da Liberdade", "Verde esperança", "#f0fdf4", "#15803d"],
  ["inovacao_tech", "Inovação Tech", "Violeta digital", "#f5f3ff", "#5b21b6"],
  ["vintage_historico", "Vintage/Histórico", "Creme/sépia", "#fefaf0", "#78350f"],
  ["crescimento_vendas", "Crescimento/Vendas", "Verde esmeralda", "#ecfdf5", "#047857"],
  ["sao_martinho", "S. Martinho", "Castanho outonal", "#fff7ed", "#9a3412"],
  ["maritimo_nautico", "Marítimo/Náutico", "Azul marinho", "#f0f9ff", "#1e40af"],
  ["zen_minimalista", "Zen/Minimalista", "Cinza neutro", "#fafafa", "#525252"],
  ["team_building", "Team Building", "Vermelho corporativo", "#fff1f1", "#991b1b"],
  ["cyber_monday", "Cyber Monday", "Preto/aço moderno", "#f1f5f9", "#0f172a"],
  ["tropical", "Tropical", "Verde palmeira", "#ecfdf5", "#059669"],
  ["floresta_eco", "Floresta/Eco", "Verde musgo profundo", "#f0fdf4", "#166534"],
  ["amanhecer_startup", "Amanhecer/Startup", "Laranja aurora", "#fff7ed", "#ea580c"],
];

export const THEMES = Object.fromEntries(
  THEME_CATALOG.map(([key, name, description, bgBase, darkBase]) => [
    key,
    createTheme(name, description, bgBase, darkBase),
  ])
);

export const THEME_KEYS = Object.keys(THEMES);
export const DEFAULT_THEME = "default";
