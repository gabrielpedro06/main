// Layout de todas as páginas /dashboard/* (rota protegida): Sidebar, introdução da
// marca, decorações de tema e <Outlet /> com a página atual. Em mobile (≤900px)
// a sidebar passa a gaveta e aparecem a barra de topo e a navegação inferior.
// Documentação: docs/modulos/comunicacao-e-dashboard.md
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BrandIntro from "../components/BrandIntro";
import ThemeDecor from "../components/ThemeDecor";
import { ChamadasProvider } from "../context/ChamadasContext";
import PaginaSkeleton from "../components/Skeleton";
import CommandMenu from "../components/CommandMenu";
import { abrirComando } from "../utils/comando";
import GestosJanelas from "../components/GestosJanelas";
import AtalhosTeclado from "../components/AtalhosTeclado";
import { arrastarParaFechar } from "../utils/gestos";
import { navegarComTransicao, paginaMudou, podeTransicao } from "../utils/transicaoPagina";
import { prefetchEmSegundoPlano, prefetchRota } from "../rotas";
import "../styles/dashboard.css";

const MOBILE_QUERY = "(max-width: 900px)";

// Título da barra de topo em mobile (prefixo da rota → título). Rotas em falta mostram "Início".
const PAGE_TITLES = [
  ["/dashboard/minhas-tarefas", "Agenda"],
  ["/dashboard/tarefas", "Tarefas"],
  ["/dashboard/projetos", "Projetos"],
  ["/dashboard/clientes", "Entidades"],
  ["/dashboard/atividades", "Atividades"],
  ["/dashboard/forum", "Comunicação"],
  ["/dashboard/rh", "Recursos Humanos"],
  ["/dashboard/ferias", "Ausências"],
  ["/dashboard/pedido-km", "Pedido de Km"],
  ["/dashboard/perfil", "Perfil"],
  ["/dashboard/leads", "Leads"],
  ["/dashboard/transfergest", "TransferGest"],
  ["/dashboard/ativos-ti", "Ativos TI"],
  ["/dashboard/propostas", "Propostas"],
  ["/dashboard/avisos", "Programas/Avisos"],
  ["/dashboard/admin", "Admin"],
  ["/dashboard/modelos", "Modelos"],
  ["/dashboard/cursos", "Cursos"],
  ["/dashboard/acoes-formacao", "Ações de Formação"],
  ["/dashboard/organizador-pdf", "Organizador de PDFs"],
  ["/dashboard/ajuda", "Ajuda"],
  ["/dashboard/marketing", "Marketing"],
  ["/dashboard/registos", "Registos"],
  ["/dashboard/pedidos", "Pedido"],
];

const getPageTitle = (pathname) => {
  const match = PAGE_TITLES.find(([path]) => pathname.startsWith(path));
  return match ? match[1] : "Início";
};

// Pré-carrega a página de qualquer link interno ao passar o rato, focar ou tocar
const prefetchDoLink = (e) => {
  const a = e.target.closest?.("a[href]");
  if (a) prefetchRota(a.getAttribute("href"));
};

const getIsMobile = () =>
  typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

const NavIcon = {
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  Pin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.6V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.6a2 2 0 0 1-1.11 1.95l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  Rocket: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>,
  Menu: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>,
};

const BOTTOM_NAV = [
  { to: "/dashboard", label: "Início", Icon: NavIcon.Home, exact: true },
  { to: "/dashboard/minhas-tarefas", label: "Agenda", Icon: NavIcon.Pin },
  { to: "/dashboard/tarefas", label: "Tarefas", Icon: NavIcon.Check },
  { to: "/dashboard/projetos", label: "Projetos", Icon: NavIcon.Rocket },
];

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  // Página que entrou com View Transition (não repete a animação de entrada antiga)
  const [entrouComVT, setEntrouComVT] = useState(null);

  // A nova página já está no ecrã: termina a "fotografia" da View Transition
  useLayoutEffect(() => { paginaMudou(); }, [location.key]);

  // Cliques em links internos (#/...) passam a navegar com View Transition
  const onClickLink = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href^='#/']");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const destino = a.getAttribute("href").slice(1);
    if (destino === location.pathname + location.search) return;
    e.preventDefault(); // o <Link> do React Router vê isto e não navega ele próprio
    setEntrouComVT(podeTransicao() ? destino.split("?")[0] : null);
    navegarComTransicao(navigate, destino);
  };
  const mainRef = useRef(null);
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [menuOpen, setMenuOpen] = useState(() => !getIsMobile());

  // Acompanha a mudança entre desktop e mobile
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => {
      setIsMobile(e.matches);
      setMenuOpen(!e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Ao mudar de página: volta ao topo e fecha a gaveta no mobile
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    if (isMobile) setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Gaveta aberta no telemóvel: arrastar para a esquerda fecha
  useEffect(() => {
    if (!isMobile || !menuOpen) return;
    const gaveta = document.querySelector(".sidebar.is-mobile");
    if (!gaveta) return;
    return arrastarParaFechar(gaveta, {
      eixo: "x",
      sentido: -1,
      fundo: document.querySelector(".bz-drawer-backdrop"),
      aoFechar: () => setMenuOpen(false),
    });
  }, [isMobile, menuOpen]);

  // Bloqueia o scroll de fundo com a gaveta aberta
  useEffect(() => {
    if (!isMobile) return;
    document.body.classList.toggle("bz-drawer-open", menuOpen);
    return () => document.body.classList.remove("bz-drawer-open");
  }, [isMobile, menuOpen]);

  // Com o browser parado, descarrega as páginas mais usadas (a 1.ª visita fica rápida)
  useEffect(() => {
    prefetchEmSegundoPlano(["/dashboard", "/dashboard/minhas-tarefas", "/dashboard/tarefas", "/dashboard/projetos", "/dashboard/forum", "/dashboard/ferias"]);
  }, []);

  const isActive = (item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <ChamadasProvider>
    <div
      className={`dashboard-container ${isMobile ? "is-mobile" : ""}`}
      onMouseOver={prefetchDoLink}
      onFocus={prefetchDoLink}
      onTouchStart={prefetchDoLink}
      onClickCapture={onClickLink}
    >
      <BrandIntro />
      <ThemeDecor />
      <CommandMenu />
      <GestosJanelas />
      <AtalhosTeclado />
      {/* Marcador da gaveta aberta: faz o "voltar" do telemóvel fechar a gaveta (ver GestosJanelas) */}
      {isMobile && menuOpen && (
        <span data-janela className="bz-gaveta-marcador" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} isMobile={isMobile} />

      {isMobile && (
        <div
          className={`bz-drawer-backdrop ${menuOpen ? "visible" : ""}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="bz-main-column">
        {isMobile && (
          <header className="bz-mobile-topbar">
            <button
              type="button"
              className="bz-icon-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <NavIcon.Menu />
            </button>
            <span key={location.pathname} className="bz-topbar-title">
              {getPageTitle(location.pathname)}
            </span>
            <button
              type="button"
              className="bz-icon-btn bz-topbar-pesquisa"
              onClick={abrirComando}
              aria-label="Pesquisar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            </button>
            <img src="/logo3.png" alt="Bizin" className="bz-topbar-logo" />
          </header>
        )}

        <main className="dashboard-main" ref={mainRef}>
          {/* A key faz com que cada página entre com animação (sem-entrada: já animada pela View Transition) */}
          <div
            key={location.pathname}
            className={`bz-route ${entrouComVT === location.pathname ? "sem-entrada" : ""}`}
          >
            <Suspense fallback={<PaginaSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        {isMobile && (
          <nav className="bz-bottom-nav" aria-label="Navegação rápida">
            {BOTTOM_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`bz-bottom-nav-item ${isActive(item) ? "active" : ""}`}
              >
                <span className="bz-bottom-nav-icon"><item.Icon /></span>
                <span className="bz-bottom-nav-label">{item.label}</span>
              </Link>
            ))}
            <button
              type="button"
              className={`bz-bottom-nav-item ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="bz-bottom-nav-icon"><NavIcon.Menu /></span>
              <span className="bz-bottom-nav-label">Menu</span>
            </button>
          </nav>
        )}
      </div>
    </div>
    </ChamadasProvider>
  );
}
