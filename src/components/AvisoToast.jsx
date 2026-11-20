// Aviso flutuante (toast) único da app — substitui as várias versões com emojis.
//   {notification && <AvisoToast tipo={notification.type} mensagem={notification.message} />}
// Erros e avisos são anunciados de imediato pelos leitores de ecrã; sucesso/info com cortesia.
const ICONES = {
  success: <path d="M20 6 9 17l-5-5" />,
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
};

/**
 * Toast de aviso. Não se fecha sozinho: o pai controla o tempo (normalmente um
 * estado `notification` + setTimeout de ~3 s). Estilos `.toast-container` em dashboard.css.
 * @param {object} props
 * @param {"success"|"error"|"warning"|"info"} [props.tipo="info"]
 * @param {React.ReactNode} props.mensagem
 * @param {React.ReactNode} [props.children] extra à direita (ex.: botão "Anular")
 * @param {React.CSSProperties} [props.style]
 */
export default function AvisoToast({ tipo = "info", mensagem, children, style }) {
  const t = ICONES[tipo] ? tipo : "info";
  const urgente = t === "error" || t === "warning";
  return (
    <div
      className={`toast-container ${t}`}
      role={urgente ? "alert" : "status"}
      aria-live={urgente ? "assertive" : "polite"}
      style={style}
    >
      <svg className="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONES[t]}
      </svg>
      <span>{mensagem}</span>
      {children}
    </div>
  );
}
