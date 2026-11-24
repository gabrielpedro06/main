// =====================================================================
// Carregamento das páginas por partes (code splitting).
// Cada página é um ficheiro JS à parte, descarregado só quando é precisa.
// prefetchRota(caminho) começa a descarregar a página antes do clique
// (ao passar o rato / tocar num link), para a navegação parecer instantânea.
// Ao criar uma página: acrescentar aqui o import, e a <Route> em App.jsx.
// =====================================================================

/** Importadores de cada página, pelo segmento da rota em /dashboard/... */
export const PAGINAS = {
  "": () => import("./pages/DashboardHome"),
  "minhas-tarefas": () => import("./pages/MinhasTarefas"),
  tarefas: () => import("./pages/Tarefas"),
  projetos: () => import("./pages/Projetos"),
  "projetos/:id": () => import("./pages/ProjetoDetalhe"),
  clientes: () => import("./pages/Clientes"),
  atividades: () => import("./pages/Atividades"),
  forum: () => import("./pages/Forum"),
  rh: () => import("./pages/RecursosHumanos"),
  "pedidos/:id": () => import("./pages/AprovarPedido"),
  ferias: () => import("./pages/Ausencias"),
  "pedido-km": () => import("./pages/PedidoKm"),
  perfil: () => import("./pages/Perfil"),
  leads: () => import("./pages/GestaoLeads"),
  marketing: () => import("./pages/Marketing"),
  transfergest: () => import("./pages/TransferGest"),
  "ativos-ti": () => import("./pages/AtivosTIDashboard"),
  propostas: () => import("./pages/ListaPropostas"),
  "propostas/:id": () => import("./pages/PropostasComerciais"),
  avisos: () => import("./pages/GestaoAvisos"),
  admin: () => import("./pages/AdminDashboard"),
  registos: () => import("./pages/RegistoAtividade"),
  modelos: () => import("./components/GestaoTemplates"),
  cursos: () => import("./pages/Cursos"),
  "acoes-formacao": () => import("./pages/AcoesFormacao"),
  "organizador-pdf": () => import("./pages/OrganizadorPdf"),
  ajuda: () => import("./pages/Ajuda"),
};

const jaPedidas = new Set();

/** Chave de PAGINAS para um caminho ("/dashboard/projetos/12" → "projetos/:id"). */
function chaveDe(caminho) {
  const limpo = String(caminho || "").replace(/^#/, "").split(/[?#]/)[0]
    .replace(/^\/?dashboard\/?/, "").replace(/\/$/, "");
  if (limpo in PAGINAS) return limpo;
  const [base, resto] = limpo.split("/");
  if (resto && `${base}/:id` in PAGINAS) return `${base}/:id`;
  return base in PAGINAS ? base : null;
}

/** Começa a descarregar a página de um caminho (sem efeito se já foi pedida). */
export function prefetchRota(caminho) {
  const chave = chaveDe(caminho);
  if (chave === null || jaPedidas.has(chave)) return;
  jaPedidas.add(chave);
  PAGINAS[chave]().catch(() => jaPedidas.delete(chave));
}

/**
 * Props para pôr num <Link>/<NavLink>: pré-carrega ao passar o rato,
 * ao receber foco (teclado) ou ao começar o toque (telemóvel).
 */
export const prefetchProps = (caminho) => ({
  onMouseEnter: () => prefetchRota(caminho),
  onFocus: () => prefetchRota(caminho),
  onTouchStart: () => prefetchRota(caminho),
});

/**
 * Quando o browser está parado, pré-carrega as páginas mais usadas,
 * para que a primeira visita também seja rápida.
 */
export function prefetchEmSegundoPlano(caminhos) {
  const correr = () => caminhos.forEach((c, i) => setTimeout(() => prefetchRota(c), i * 400));
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(correr, { timeout: 4000 });
  else setTimeout(correr, 2500);
}
