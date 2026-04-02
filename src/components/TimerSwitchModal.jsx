import React from "react";
import { createPortal } from "react-dom";

export default function TimerSwitchModal({
  open,
  title = "Trocar Cronômetro",
  message,
  onCancel,
  onConfirm,
  cancelLabel = "Manter Atual",
  confirmLabel = "Sim, Trocar"
}) {
  if (!open) return null;

  return createPortal(
    <>
      <style>
        {`
          @keyframes overlayFadeIn {
            from { opacity: 0; backdrop-filter: blur(0px); }
            to { opacity: 1; backdrop-filter: blur(5px); }
          }
          @keyframes modalPopIn {
            from { opacity: 0; transform: scale(0.95) translateY(15px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .modal-btn-cancel {
            transition: all 0.2s ease;
          }
          .modal-btn-cancel:hover {
            background-color: #f8fafc !important;
            border-color: #94a3b8 !important;
            color: #1e293b !important;
          }
          .modal-btn-confirm {
            transition: all 0.2s ease;
          }
          .modal-btn-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 30px -15px rgba(37,99,235,0.7) !important;
            filter: brightness(1.05);
          }
        `}
      </style>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(5px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100000,
          animation: "overlayFadeIn 0.3s ease-out forwards",
          padding: "20px"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px", // Ligeiramente mais estreito para texto centrado ler melhor
            borderRadius: "24px",
            padding: "36px 32px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 25px 50px -12px rgba(15,23,42,0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // Centra todos os elementos horizontalmente
            textAlign: "center", // Centra o texto do parágrafo
            gap: "20px",
            animation: "modalPopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          {/* Ícone Centrado no Topo */}
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-bgSecondary)",
              color: "var(--color-btnPrimary)",
              marginBottom: "4px"
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>

          {/* Título */}
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {title}
          </h3>

          {/* Mensagem Centrada */}
          <p style={{ margin: 0, color: "#475569", fontSize: "1.05rem", lineHeight: 1.6 }}>
            {message}
          </p>

          {/* Botões */}
          <div style={{ display: "flex", width: "100%", gap: "12px", marginTop: "12px" }}>
            <button
              className="modal-btn-cancel"
              type="button"
              onClick={onCancel}
              style={{
                flex: "1 1 50%", // Divide o espaço igualmente
                height: "50px",
                borderRadius: "14px",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#475569",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              {cancelLabel}
            </button>
            <button
              className="modal-btn-confirm"
              type="button"
              onClick={onConfirm}
              style={{
                flex: "1 1 50%", // Divide o espaço igualmente
                height: "50px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark))",
                color: "white",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 10px 15px -5px rgba(37,99,235,0.4)"
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

