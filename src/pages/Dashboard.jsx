import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BrandIntro from "../components/BrandIntro";
import ThemeDecor from "../components/ThemeDecor";
import "../styles/dashboard.css";

const MOBILE_QUERY = "(max-width: 900px)";

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
];

const getPageTitle = (pathname) => {
  const match = PAGE_TITLES.find(([path]) => pathname.startsWith(path));
  return match ? match[1] : "Início";
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

  // Bloqueia o scroll de fundo com a gaveta aberta
  useEffect(() => {
    if (!isMobile) return;
    document.body.classList.toggle("bz-drawer-open", menuOpen);
    return () => document.body.classList.remove("bz-drawer-open");
  }, [isMobile, menuOpen]);

  const isActive = (item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <div className={`dashboard-container ${isMobile ? "is-mobile" : ""}`}>
      <BrandIntro />
      <ThemeDecor />
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
            <img src="/logo3.png" alt="Bizin" className="bz-topbar-logo" />
          </header>
        )}

        <main className="dashboard-main" ref={mainRef}>
          {/* A key faz com que cada página entre com animação */}
          <div key={location.pathname} className="bz-route">
            <Outlet />
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
  );
}
