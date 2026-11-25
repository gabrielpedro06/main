import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ThemeSelector from "./ThemeSelector";
import { isNotifySoundEnabled, playNotifySound, setNotifySoundEnabled } from "../utils/notifySound";
import { rectCss, alturaEcra, lerTamanho, definirTamanho, TAMANHOS } from "../utils/tamanhoInterface";

const Icon = {
  User: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Sun: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>,
  Car: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>,
  Help: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>,
  Palette: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.7h2c3 0 5.5-2.5 5.5-5.6C22 6 17.5 2 12 2z" /></svg>,
  LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  BellOff: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  Text: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V5h11v2" /><path d="M9.5 5v14" /><path d="M7 19h5" /><path d="M14 12v-1.5h7V12" /><path d="M17.5 10.5V19" /><path d="M16 19h3" /></svg>,
  Moon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>,
  Auto: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

/**
 * Menu da conta, aberto a partir do cartão do utilizador na sidebar.
 * Renderizado num portal para não ser cortado pelo overflow da sidebar.
 *  - placement "up":    abre por cima do cartão (sidebar aberta / gaveta mobile)
 *  - placement "right": abre ao lado do cartão (sidebar encolhida)
 * Contém: Perfil, Ausências (/dashboard/ferias), Pedido de km, seletor de tema (ThemeSelector), som das notificações
 * (notifySound) e Terminar sessão.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {React.RefObject<HTMLElement>} props.anchorRef cartão do utilizador na Sidebar
 * @param {"up"|"right"} [props.placement="up"]
 * @param {string} props.displayName
 * @param {string} props.initials usado quando não há avatar_url
 * @param {string} [props.roleLabel] papel com inicial maiúscula
 */
export default function AccountMenu({ open, onClose, anchorRef, placement = "up", displayName, initials, roleLabel }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { currentTheme, availableThemes, modo, setModo, escuro } = useTheme();
  const [position, setPosition] = useState(null);
  const [showThemes, setShowThemes] = useState(false);
  const [soundOn, setSoundOn] = useState(isNotifySoundEnabled);
  const [tamanho, setTamanho] = useState(lerTamanho);
  // Só no computador (no telemóvel o tamanho não muda)
  const [ecraGrande] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(min-width: 901px)").matches);

  // Calcula a posição a partir do cartão
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = rectCss(anchor);
      if (placement === "right") {
        setPosition({ left: rect.right + 10, bottom: Math.max(8, alturaEcra() - rect.bottom), width: 264 });
      } else {
        setPosition({ left: rect.left, bottom: alturaEcra() - rect.top + 8, width: Math.max(rect.width, 248) });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, placement, anchorRef]);

  // Fecha com Escape
  useEffect(() => {
    if (!open && !showThemes) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (showThemes) setShowThemes(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, showThemes, onClose]);

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const themeInfo = availableThemes?.[currentTheme];

  return createPortal(
    <>
      {open && position && (
        <>
          <div className="bz-account-backdrop" onClick={onClose} />
          <div
            className={`bz-account-menu placement-${placement}`}
            style={{ left: position.left, bottom: position.bottom, width: position.width }}
            role="menu"
          >
            <div className="bz-account-head">
              <span className="bz-account-avatar">
                {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" /> : initials}
              </span>
              <div className="bz-account-id">
                <span className="bz-account-name">{displayName}</span>
                {user?.email && <span className="bz-account-email">{user.email}</span>}
              </div>
              {roleLabel && <span className="bz-account-role">{roleLabel}</span>}
            </div>

            <div className="bz-account-group">
              <button type="button" role="menuitem" className="bz-account-item" onClick={() => go("/dashboard/perfil")}>
                <Icon.User /> O meu perfil
              </button>
              <button type="button" role="menuitem" className="bz-account-item" onClick={() => go("/dashboard/ferias")}>
                <Icon.Sun /> Férias & ausências
              </button>
              <button type="button" role="menuitem" className="bz-account-item" onClick={() => go("/dashboard/pedido-km")}>
                <Icon.Car /> Pedido de deslocação
              </button>
              <button type="button" role="menuitem" className="bz-account-item" onClick={async () => { const { seccaoDaRota } = await import("../content/ajuda"); const id = seccaoDaRota(pathname); go(id ? `/dashboard/ajuda?s=${id}` : "/dashboard/ajuda"); }}>
                <Icon.Help /> Ajuda
              </button>
              <button
                type="button"
                role="menuitem"
                className="bz-account-item"
                onClick={() => { onClose(); setShowThemes(true); }}
              >
                <Icon.Palette /> Tema
                {themeInfo && (
                  <span className="bz-account-theme">
                    <span className="bz-account-theme-dot" style={{ background: themeInfo.colors?.btnPrimary }} />
                    {themeInfo.name}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={soundOn}
                className="bz-account-item"
                onClick={() => {
                  const next = !soundOn;
                  setNotifySoundEnabled(next);
                  setSoundOn(next);
                  if (next) playNotifySound();
                }}
              >
                {soundOn ? <Icon.Bell /> : <Icon.BellOff />} Som das notificações
                <span className={`bz-switch ${soundOn ? "is-on" : ""}`} aria-hidden="true"><span /></span>
              </button>
              <div className="bz-account-item bz-account-tamanho" role="group" aria-label="Aparência">
                {escuro ? <Icon.Moon /> : <Icon.Sun />} Aparência
                <span className="bz-tamanho-seg">
                  {[
                    { valor: "claro", label: "Claro", ico: <Icon.Sun /> },
                    { valor: "escuro", label: "Escuro", ico: <Icon.Moon /> },
                    { valor: "auto", label: "Automático (segue o sistema)", ico: <Icon.Auto /> },
                  ].map(({ valor, label, ico }) => (
                    <button
                      key={valor}
                      type="button"
                      className={modo === valor ? "is-on" : ""}
                      aria-pressed={modo === valor}
                      title={label}
                      aria-label={label}
                      onClick={() => setModo(valor)}
                    >
                      {ico}
                    </button>
                  ))}
                </span>
              </div>
              {ecraGrande && (
                <div className="bz-account-item bz-account-tamanho" role="group" aria-label="Tamanho da interface">
                  <Icon.Text /> Tamanho
                  <span className="bz-tamanho-seg">
                    {TAMANHOS.map((t, i) => (
                      <button
                        key={t.valor}
                        type="button"
                        className={tamanho === t.valor ? "is-on" : ""}
                        aria-pressed={tamanho === t.valor}
                        title={t.label}
                        aria-label={t.label}
                        onClick={() => {
                          definirTamanho(t.valor);
                          setTamanho(t.valor);
                          onClose(); // o menu mudou de sítio com o novo tamanho
                        }}
                        style={{ fontSize: `${0.7 + i * 0.14}rem` }}
                      >
                        A
                      </button>
                    ))}
                  </span>
                </div>
              )}
            </div>

            <div className="bz-account-group">
              <button type="button" role="menuitem" className="bz-account-item is-danger" onClick={() => { onClose(); signOut(); }}>
                <Icon.LogOut /> Terminar sessão
              </button>
            </div>
          </div>
        </>
      )}

      {showThemes && (
        <div
          className="bz-theme-overlay"
          style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.55)", zIndex: "var(--z-modal-topo)", padding: 20 }}
          onClick={() => setShowThemes(false)}
        >
          <div className="bz-theme-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="bz-theme-close" onClick={() => setShowThemes(false)} aria-label="Fechar">
              <Icon.Close />
            </button>
            <ThemeSelector />
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
