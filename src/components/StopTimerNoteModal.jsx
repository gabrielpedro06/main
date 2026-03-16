import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function StopTimerNoteModal({
  open,
  title = "Parar cronometro",
  message = "Se quiseres, adiciona uma nota breve antes de parar.",
  placeholder = "Escreve uma nota opcional...",
  confirmLabel = "Guardar e parar",
  cancelLabel = "Cancelar",
  showCompleteOption = false,
  completeLabel = "Marcar como concluido",
  defaultComplete = false,
  onConfirm,
  onCancel
}) {
  const [note, setNote] = useState("");
  const [shouldComplete, setShouldComplete] = useState(defaultComplete);

  useEffect(() => {
    if (open) {
      setNote("");
      setShouldComplete(defaultComplete);
    }
  }, [defaultComplete, open]);

  if (!open) return null;

  return createPortal(
    <>
      <style>
        {`
          @keyframes stopOverlayFadeIn {
            from { opacity: 0; backdrop-filter: blur(0px); }
            to { opacity: 1; backdrop-filter: blur(5px); }
          }
          @keyframes stopModalPopIn {
            from { opacity: 0; transform: scale(0.95) translateY(15px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .stop-note-textarea {
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
          }
          .stop-note-textarea:focus {
            border-color: #93c5fd !important;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
            background: #ffffff !important;
          }
          .stop-note-cancel {
            transition: all 0.2s ease;
          }
          .stop-note-cancel:hover {
            background-color: #f8fafc !important;
            border-color: #94a3b8 !important;
            color: #1e293b !important;
          }
          .stop-note-confirm {
            transition: all 0.2s ease;
          }
          .stop-note-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 30px -15px rgba(37,99,235,0.7) !important;
            filter: brightness(1.05);
          }
          .stop-complete-option {
            transition: all 0.2s ease;
          }
          .stop-complete-option:hover {
            border-color: #bfdbfe !important;
            background: #f8fbff !important;
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
          zIndex: 100001,
          padding: "20px",
          animation: "stopOverlayFadeIn 0.3s ease-out forwards"
        }}
        onClick={onCancel}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "560px",
            borderRadius: "24px",
            padding: "34px 30px 28px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 25px 50px -12px rgba(15,23,42,0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "18px",
            animation: "stopModalPopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#eff6ff",
              color: "#2563eb",
              marginBottom: "4px"
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6v6"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              <path d="M8 3.13a4 4 0 0 0 0 7.75"></path>
              <path d="M6 11a6 6 0 0 0 12 0"></path>
              <path d="M12 17v4"></path>
              <path d="M8 21h8"></path>
            </svg>
          </div>

          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h3>
          <p style={{ margin: 0, color: "#475569", fontSize: "1.02rem", lineHeight: 1.6, maxWidth: "460px" }}>{message}</p>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px", marginTop: "2px" }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              autoFocus
              placeholder={placeholder}
              className="stop-note-textarea"
              style={{
                width: "100%",
                resize: "vertical",
                border: "1px solid #cbd5e1",
                borderRadius: "16px",
                padding: "14px 16px",
                fontSize: "0.98rem",
                lineHeight: 1.5,
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
                background: "#f8fafc",
                minHeight: "116px"
              }}
            />

            {showCompleteOption && (
              <label
                className="stop-complete-option"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "#334155",
                  fontSize: "0.98rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid #dbeafe",
                  background: shouldComplete ? "#eff6ff" : "#f8fafc",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  textAlign: "left"
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    border: shouldComplete ? "none" : "2px solid #94a3b8",
                    background: shouldComplete ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: shouldComplete ? "0 8px 18px -10px rgba(37,99,235,0.8)" : "none"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={shouldComplete}
                    onChange={(e) => setShouldComplete(e.target.checked)}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  {shouldComplete && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </span>
                <span>{completeLabel}</span>
              </label>
            )}
          </div>

          <div style={{ display: "flex", width: "100%", gap: "12px", marginTop: "4px" }}>
            <button
              className="stop-note-cancel"
              type="button"
              onClick={onCancel}
              style={{
                flex: "1 1 42%",
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
              className="stop-note-confirm"
              type="button"
              onClick={() => onConfirm?.(note.trim(), shouldComplete)}
              style={{
                flex: "1 1 58%",
                height: "50px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
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
