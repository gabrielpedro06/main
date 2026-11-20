import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fmtDataMedalha } from "./medalhas/medalhasConfig";
import { useMedalhas } from "./medalhas/useMedalhas";
import "../styles/medalhas.css";

const I = {
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Phone: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  Mail: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
  Cake: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20" /><path d="M7 8v3" /><path d="M12 8v3" /><path d="M17 8v3" /><path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" /></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Back: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>,
  Medal: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.2 2h9.6l-3 6.5h-3.6z" /><circle cx="12" cy="15" r="6" /><path d="M12 12.4l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" /></svg>,
};

const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/**
 * Cartão de perfil de um colega (aberto a partir da "Equipa online").
 * `entry` é o registo de assiduidade com `profiles` e `hora_entrada`.
 * Mostra contactos (copiar/ligar/email), aniversário e medalhas (useMedalhas).
 * Usado em pages/DashboardHome.jsx. Estilos .pp-* em home.css; medalhas em medalhas.css.
 * @param {object} props
 * @param {{ user_id: string, hora_entrada?: string, profiles: object }} props.entry
 * @param {() => void} props.onClose Esc (depois de fechar a ficha da medalha) ou clique fora
 */
export default function ProfilePeek({ entry, onClose }) {
  const [copied, setCopied] = useState(null);
  const profile = entry?.profiles || {};
  const medalhas = useMedalhas(entry?.user_id || profile.id);
  const [aberta, setAberta] = useState(null); // medalha em destaque (ficha)

  useEffect(() => {
    // Esc fecha primeiro a ficha da medalha, depois o cartão
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (aberta) setAberta(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, aberta]);

  const copy = async (key, value, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
    } catch {
      /* clipboard indisponível: ignora */
    }
  };

  const contacts = [
    profile.telemovel && { key: "tel", label: "Telemóvel", value: profile.telemovel, href: `tel:${String(profile.telemovel).replace(/\s+/g, "")}`, Icon: I.Phone },
    profile.email && { key: "email", label: "Email da empresa", value: profile.email, href: `mailto:${profile.email}`, Icon: I.Mail },
    profile.email_pessoal && { key: "email2", label: "Email pessoal", value: profile.email_pessoal, href: `mailto:${profile.email_pessoal}`, Icon: I.Mail },
  ].filter(Boolean);

  const aniversario = profile.data_nascimento
    ? new Date(`${profile.data_nascimento}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "long" })
    : null;

  const subtitle = [profile.funcao, profile.empresa_interna].filter(Boolean).join(" · ");

  return createPortal(
    <div
      className="pp-overlay"
      style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.5)", zIndex: "var(--z-modal-topo)", padding: 16 }}
      onClick={onClose}
    >
      <div className="mdl-peek-wrap" onClick={(e) => e.stopPropagation()}>
      <div className="pp-card" role="dialog" aria-label={profile.nome || "Perfil"}>
        <div className="pp-cover">
          <span className="pp-cover-shine" aria-hidden="true" />
          <button type="button" className="pp-close" onClick={onClose} aria-label="Fechar">
            <I.Close />
          </button>
        </div>

        <div className="pp-identity">
          <span className="pp-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : getInitials(profile.nome)}
            <span className="pp-avatar-dot" />
          </span>
          <h3 className="pp-name">{profile.nome || "—"}</h3>
          {subtitle && <p className="pp-subtitle">{subtitle}</p>}
          {entry?.hora_entrada && (
            <span className="pp-status">
              <span className="pp-status-dot" /> Online desde as {entry.hora_entrada.slice(0, 5)}
            </span>
          )}
        </div>

        {(contacts.length > 0 || aniversario) && (
          <div className="pp-list">
            {contacts.map((c) => (
              <div key={c.key} className="pp-row">
                <a className="pp-row-link" href={c.href}>
                  <span className="pp-row-icon"><c.Icon /></span>
                  <span className="pp-row-text">
                    <span className="pp-row-label">{c.label}</span>
                    <span className="pp-row-value">{c.value}</span>
                  </span>
                </a>
                <button
                  type="button"
                  className={`pp-copy ${copied === c.key ? "is-copied" : ""}`}
                  onClick={(e) => copy(c.key, c.value, e)}
                  title="Copiar"
                  aria-label={`Copiar ${c.label}`}
                >
                  {copied === c.key ? <I.Check /> : <I.Copy />}
                </button>
              </div>
            ))}
            {aniversario && (
              <div className="pp-row is-static">
                <span className="pp-row-link">
                  <span className="pp-row-icon is-warm"><I.Cake /></span>
                  <span className="pp-row-text">
                    <span className="pp-row-label">Aniversário</span>
                    <span className="pp-row-value">{aniversario}</span>
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vitrine de medalhas: só aparece quando a pessoa tem medalhas */}
      {medalhas && medalhas.length > 0 && (
        <aside className="mdl-panel" aria-label={`Medalhas de ${profile.nome || "colaborador"}`}>
          <div className="mdl-panel-head">
            {aberta ? (
              <button type="button" className="mdl-back" onClick={() => setAberta(null)}>
                <I.Back /> Vitrine
              </button>
            ) : (
              <>
                <span><I.Medal /></span>
                <div>
                  <strong>Vitrine</strong>
                  <small>{medalhas.length} {medalhas.length === 1 ? "medalha" : "medalhas"}</small>
                </div>
              </>
            )}
          </div>

          {aberta ? (
            <div className="mdl-detail" key={aberta.id}>
              <div className="mdl-detail-stage">
                <span className="mdl-detail-glow" aria-hidden="true" />
                <img src={aberta.imagem_url} alt={aberta.nome} />
              </div>
              <h4>{aberta.nome}</h4>
              <span className="mdl-detail-date">{fmtDataMedalha(aberta.data)}</span>
              {aberta.descricao && <p>{aberta.descricao}</p>}
            </div>
          ) : (
            <div className="mdl-showcase">
              {medalhas.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  className="mdl-tile"
                  style={{ animationDelay: `${0.08 + i * 0.05}s` }}
                  onClick={() => setAberta(m)}
                  title={m.nome}
                >
                  <span className="mdl-tile-stage">
                    <img src={m.imagem_url} alt="" loading="lazy" />
                  </span>
                  <strong>{m.nome}</strong>
                  <small>{fmtDataMedalha(m.data, { month: "short", year: "numeric" })}</small>
                </button>
              ))}
            </div>
          )}
        </aside>
      )}
      </div>
    </div>,
    document.body
  );
}
