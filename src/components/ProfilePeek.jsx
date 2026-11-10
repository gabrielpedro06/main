import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const I = {
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Phone: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  Mail: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
  Cake: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20" /><path d="M7 8v3" /><path d="M12 8v3" /><path d="M17 8v3" /><path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" /></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
};

const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/**
 * Cartão de perfil de um colega (aberto a partir da "Equipa online").
 * `entry` é o registo de assiduidade com `profiles` e `hora_entrada`.
 */
export default function ProfilePeek({ entry, onClose }) {
  const [copied, setCopied] = useState(null);
  const profile = entry?.profiles || {};

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.5)", zIndex: 100000, padding: 16 }}
      onClick={onClose}
    >
      <div className="pp-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={profile.nome || "Perfil"}>
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
    </div>,
    document.body
  );
}
