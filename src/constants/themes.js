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

// Temas de celebração: paleta + decorações animadas (ver components/ThemeDecor.jsx)
// [chave, nome, descrição, fundo, cor principal, decoração, época "MM-DD" início/fim]
const FESTIVE_CATALOG = [
  ["festa_natal", "Natal Mágico", "Grinalda de bolas, árvore, bengalas e neve", "#fbf4ee", "#a3162b", "natal", ["11-01", "01-06"]],
  ["festa_conceicao", "Imaculada Conceição", "Padroeira de Portugal: coroa de estrelas e lírios", "#f4f7fd", "#2c4f9e", "conceicao", ["11-29", "12-08"]],
  ["festa_inverno", "Inverno Nevado", "Flocos de neve a cair suavemente", "#eef5fb", "#1d4f7a", "neve", ["12-01", "02-28"]],
  ["festa_reis", "Dia de Reis", "Estrela de Belém, coroas e bolo-rei", "#fbf7ec", "#7a5512", "reis", ["01-01", "01-10"]],
  ["festa_lunar", "Ano Novo Chinês", "Lanternas vermelhas e moedas da sorte", "#fff4f1", "#b42318", "lunar", ["01-20", "02-25"]],
  ["festa_ano_novo", "Passagem de Ano", "Fogo de artifício e confettis dourados", "#faf7f0", "#1f1a14", "anonovo", ["12-26", "01-07"]],
  ["festa_sao_martinho", "S. Martinho", "Castanhas quentes e folhas de outono", "#fbf2e9", "#7a3410", "martinho", ["11-01", "11-16"]],
  ["festa_outono", "Outono Dourado", "Folhas a cair", "#fcf5ea", "#9a3412", "outono", ["09-22", "11-30"]],
  ["festa_muertos", "Día de Muertos", "Papel picado, calaveras e flores de cempasúchil", "#fdf4ec", "#9d174d", "muertos", ["10-25", "11-03"]],
  ["festa_todos_santos", "Todos-os-Santos", "Velas acesas, luzinhas e crisântemos", "#f5f3f7", "#4a3b63", "fieis", ["10-28", "11-03"]],
  ["festa_halloween", "Halloween", "Abóboras, morcegos e teias de aranha", "#f6f2ee", "#3e1c5e", "halloween", ["10-15", "11-02"]],
  ["festa_carnaval", "Carnaval", "Confettis e serpentinas", "#f8f4ff", "#6d28d9", "carnaval", ["02-01", "03-10"]],
  ["festa_valentim", "S. Valentim", "Corações a flutuar", "#fff3f5", "#be123c", "valentim", ["02-01", "02-15"]],
  ["festa_pascoa", "Páscoa", "Ovos pintados e pétalas", "#fdf6f3", "#8a3f7c", "pascoa", ["03-15", "04-30"]],
  ["festa_fatima", "Nossa Senhora de Fátima", "Mês de Maria: terço, velas e rosas brancas", "#f3f7fc", "#1f4e8c", "fatima", ["05-01", "05-31"]],
  ["festa_primavera", "Primavera em Flor", "Pétalas e flores", "#f5fbf2", "#2e7a3d", "primavera", ["03-20", "05-31"]],
  ["festa_santos", "Santos Populares", "Bandeirinhas, manjericos e sardinhas", "#f2faf5", "#0d6a49", "santos", ["06-01", "06-30"]],
  ["festa_verao", "Verão na Praia", "Sol, ondas e gaivotas", "#eff8fc", "#0b6a96", "verao", ["06-21", "09-15"]],
];

export const THEMES = Object.fromEntries([
  ...THEME_CATALOG.map(([key, name, description, bgBase, darkBase]) => [
    key,
    { ...createTheme(name, description, bgBase, darkBase), group: "basic" },
  ]),
  ...FESTIVE_CATALOG.map(([key, name, description, bgBase, darkBase, decor, season]) => [
    key,
    { ...createTheme(name, description, bgBase, darkBase), group: "festive", decor, season },
  ]),
]);

// Está dentro da época do tema? (suporta épocas que passam o fim do ano)
export const isThemeInSeason = (theme, date = new Date()) => {
  if (!theme?.season) return false;
  const md = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const [start, end] = theme.season;
  return start <= end ? md >= start && md <= end : md >= start || md <= end;
};

export const THEME_KEYS = Object.keys(THEMES);
export const DEFAULT_THEME = "default";
