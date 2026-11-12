import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/auth.css";

/* ------------------------------------------------------------------ */
/* Ícones                                                             */
/* ------------------------------------------------------------------ */
const Svg = ({ size = 18, children, sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const AuthIcons = {
  Mail: (p) => <Svg {...p}><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-10 6L2 7" /></Svg>,
  Lock: (p) => <Svg {...p}><rect x="3" y="11" width="18" height="11" rx="2.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>,
  User: (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></Svg>,
  Eye: (p) => <Svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Svg>,
  EyeOff: (p) => <Svg {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></Svg>,
  Arrow: (p) => <Svg {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Svg>,
  Back: (p) => <Svg {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Svg>,
  Alert: (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Svg>,
  Check: (p) => <Svg {...p}><polyline points="20 6 9 17 4 12" /></Svg>,
  Send: (p) => <Svg {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></Svg>,
  Key: (p) => <Svg {...p}><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></Svg>,
  Folder: (p) => <Svg {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></Svg>,
  Tasks: (p) => <Svg {...p}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></Svg>,
  Users: (p) => <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>,
  Laptop: (p) => <Svg {...p}><path d="M4 5h16a1 1 0 0 1 1 1v10H3V6a1 1 0 0 1 1-1z" /><path d="M1 19h22" /></Svg>,
};

/* ------------------------------------------------------------------ */
/* Campo de formulário com ícone (e olho para passwords)              */
/* ------------------------------------------------------------------ */
export function AuthField({ icon, label, type = "text", value, onChange, autoComplete, autoFocus, required = true, placeholder, invalid, hint, onKeyEvent }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  const IconC = icon ? AuthIcons[icon] : null;
  return (
    <label className={`au-field ${invalid ? "is-invalid" : ""}`}>
      <span className="au-field-label">{label}</span>
      <span className="au-input">
        {IconC && <span className="au-input-ico"><IconC size={17} /></span>}
        <input
          type={isPass && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          placeholder={placeholder}
          onKeyUp={onKeyEvent}
          onKeyDown={onKeyEvent}
        />
        {isPass && (
          <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Esconder password" : "Mostrar password"} title={show ? "Esconder" : "Mostrar"}>
            {show ? <AuthIcons.EyeOff size={17} /> : <AuthIcons.Eye size={17} />}
          </button>
        )}
      </span>
      {hint}
    </label>
  );
}

export function AuthAlert({ tone = "error", children }) {
  if (!children) return null;
  const IconC = tone === "error" ? AuthIcons.Alert : AuthIcons.Check;
  return (
    <div className={`au-alert is-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <IconC size={17} />
      <span>{children}</span>
    </div>
  );
}

export function AuthSubmit({ loading, children, icon = "Arrow" }) {
  const IconC = AuthIcons[icon] || AuthIcons.Arrow;
  return (
    <button type="submit" className="au-submit" disabled={loading}>
      {loading ? <span className="au-spinner" /> : null}
      <span>{children}</span>
      {!loading && <span className="au-submit-ico"><IconC size={17} /></span>}
    </button>
  );
}

export function AuthDone({ icon = "Check", text, action, secondary }) {
  const IconC = AuthIcons[icon] || AuthIcons.Check;
  return (
    <div className="au-done">
      <span className="au-done-ico"><IconC size={30} /></span>
      <p>{text}</p>
      {action && <Link to={action.to} className="au-btn-soft"><AuthIcons.Back size={15} /> {action.label}</Link>}
      {secondary && <button type="button" className="au-btn-link" onClick={secondary.onClick}>{secondary.label}</button>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { icon: "Folder", label: "Projetos" },
  { icon: "Tasks", label: "Tarefas" },
  { icon: "Users", label: "Recursos Humanos" },
  { icon: "Laptop", label: "Ativos TI" },
];

export default function AuthLayout({ eyebrow, title, subtitle, children, footer, back, hello = "Bem-vindo.", tagline = "Se sonhar algo, consegue realizá-lo." }) {
  return (
    <div className="au-page">
      <div className="au-page-deco" aria-hidden="true"><i /><i /><i /></div>

      <div className="au-window">
        {/* Formulário */}
        <main className="au-panel">
          <div className="au-panel-top">
            <img src="/logo1.png" alt="Bizin Portugal" className="au-logo" />
            {back && (
              <Link to={back.to} className="au-back"><AuthIcons.Back size={15} /> {back.label}</Link>
            )}
          </div>
          <div className="au-card">
            <div className="au-head">
              {eyebrow && <span className="au-eyebrow">{eyebrow}</span>}
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {children}
            {footer && <div className="au-foot">{footer}</div>}
          </div>
          <small className="au-copy">© {new Date().getFullYear()} Bizin Portugal</small>
        </main>

        {/* Arte */}
        <aside className="au-art" aria-hidden="true">
          <div className="au-blobs"><i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" /></div>
          <svg className="au-wave" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="auWaveA" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f6efd9" />
                <stop offset="45%" stopColor="#b9dd98" />
                <stop offset="100%" stopColor="#3f9a5a" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="auWaveB" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b4c86" stopOpacity="0" />
                <stop offset="50%" stopColor="#4f62a8" />
                <stop offset="100%" stopColor="#1b2442" />
              </linearGradient>
            </defs>
            <path className="w2" fill="url(#auWaveB)" d="M560,-80 C470,120 660,250 580,430 C510,590 300,650 400,900 L900,900 L900,-80 Z" />
            <path className="w1" fill="url(#auWaveA)" d="M220,-60 C140,130 400,230 330,410 C270,570 60,610 150,880 L330,880 C260,650 470,580 520,410 C580,220 380,120 460,-60 Z" />
            <path className="w3" fill="url(#auWaveA)" opacity="0.55" d="M60,-60 C10,160 230,260 170,430 C120,580 -60,640 10,880 L90,880 C40,660 220,580 260,430 C310,250 120,140 170,-60 Z" />
          </svg>
          <div className="au-grain" />

          <header className="au-art-top">
            <span className="au-brand-pill"><i /> Bizin Manager</span>
            <ul className="au-features">
              {FEATURES.map((f, i) => {
                const IconC = AuthIcons[f.icon];
                return <li key={f.label} style={{ "--i": i }}><IconC size={13} />{f.label}</li>;
              })}
            </ul>
          </header>

          <div className="au-art-hero">
            <h1>{hello}</h1>
            <p>{tagline}</p>
          </div>

          <div className="au-brand-logos">
            <img src="/logos_all.png" alt="" />
          </div>
        </aside>
      </div>
    </div>
  );
}
