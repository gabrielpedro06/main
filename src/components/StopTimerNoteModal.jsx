import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

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
  showStatusOption = false,
  defaultStatus = "manter",
  onConfirm,
  onCancel
}) {
  const { user } = useAuth();

  const statusOptions = [
    { value: "pendente", label: "Pendente" },
    { value: "em_curso", label: "Em curso" },
    { value: "em_analise", label: "Em analise" },
    { value: "concluido", label: "Concluido" },
    { value: "cancelado", label: "Cancelado" },
  ];

  const destinationOptions = [
    { value: "proprio", label: "Proprio" },
    { value: "colega", label: "Colega" },
    { value: "cliente", label: "Cliente" },
    { value: "contabilista", label: "Contabilista" },
    { value: "organismo", label: "Organismo" },
  ];

  const [note, setNote] = useState("");
  const [shouldComplete, setShouldComplete] = useState(defaultComplete);
  const [nextStatus, setNextStatus] = useState(defaultStatus);
  const [analysisDestination, setAnalysisDestination] = useState("proprio");
  const [analysisDestinationUserId, setAnalysisDestinationUserId] = useState("");
  const [analysisExpectedDate, setAnalysisExpectedDate] = useState("");
  const [analysisUsersLoading, setAnalysisUsersLoading] = useState(false);
  const [analysisUsers, setAnalysisUsers] = useState([]);
  const [formError, setFormError] = useState("");

  const normalizedStatus = String(nextStatus || "").trim().toLowerCase();
  const isAnalysisStatus = normalizedStatus === "em_analise";
  const isColleagueDestination = analysisDestination === "colega";
  const useSideLayout = showStatusOption && isAnalysisStatus;
  const showLegacyCompleteOption = showCompleteOption && !showStatusOption;

  const handleConfirm = () => {
    if (showStatusOption && isAnalysisStatus && !analysisExpectedDate) {
      setFormError("Define a data expectavel de resposta para continuar.");
      return;
    }

    if (showStatusOption && isAnalysisStatus && isColleagueDestination && !analysisDestinationUserId) {
      setFormError("Seleciona o colega para encaminhar a analise.");
      return;
    }

    const computedShouldComplete = showStatusOption
      ? normalizedStatus === "concluido"
      : shouldComplete;

    const extra = {
      nextStatus: showStatusOption ? normalizedStatus : "",
      analysisDestination: isAnalysisStatus ? analysisDestination : "",
      analysisDestinationUserId: isAnalysisStatus && isColleagueDestination ? analysisDestinationUserId : "",
      analysisExpectedDate: isAnalysisStatus ? analysisExpectedDate : "",
    };

    onConfirm?.(note.trim(), computedShouldComplete, extra);
  };

  useEffect(() => {
    if (open) {
      setNote("");
      setShouldComplete(defaultComplete);
      setNextStatus(defaultStatus);
      setAnalysisDestination("proprio");
      setAnalysisDestinationUserId("");
      setAnalysisExpectedDate("");
      setFormError("");
    }
  }, [defaultComplete, defaultStatus, open]);

  useEffect(() => {
    if (!open || !isAnalysisStatus || !isColleagueDestination) return;

    let cancelled = false;

    async function loadUsers() {
      setAnalysisUsersLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .order("nome", { ascending: true });

      if (cancelled) return;

      if (error) {
        setAnalysisUsers([]);
        setAnalysisUsersLoading(false);
        return;
      }

      const currentUserId = String(user?.id || "");
      const usersList = Array.isArray(data)
        ? data.filter((profile) => String(profile?.id || "") !== currentUserId)
        : [];

      setAnalysisUsers(usersList);
      setAnalysisUsersLoading(false);
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [open, isAnalysisStatus, isColleagueDestination, user?.id]);

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
            border-color: var(--color-borderColorLight) !important;
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
            border-color: var(--color-borderColor) !important;
            background: #f8fbff !important;
          }
          .stop-note-select,
          .stop-note-date {
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
          }
          .stop-note-select:focus,
          .stop-note-date:focus {
            border-color: var(--color-borderColorLight) !important;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
            background: #ffffff !important;
          }
          .stop-note-main {
            overflow-y: auto;
            max-height: 52vh;
            padding-right: 2px;
          }
          .stop-status-grid {
            display: flex;
            flex-wrap: nowrap;
            gap: 8px;
            width: 100%;
          }
          .stop-status-pill {
            flex: 1 1 0;
            min-width: 0;
            border-radius: 10px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #64748b;
            padding: 7px 8px;
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .stop-status-pill:hover {
            border-color: var(--color-btnPrimary);
            color: var(--color-btnPrimary);
            background: var(--color-bgSecondary);
          }
          .stop-status-pill.active {
            border-color: var(--color-btnPrimary);
            background: linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark));
            color: #fff;
            box-shadow: 0 8px 16px -10px var(--color-btnPrimaryShadowHover);
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
            maxWidth: useSideLayout ? "920px" : "560px",
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
            maxHeight: "92vh",
            overflow: "hidden",
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
              background: "var(--color-bgSecondary)",
              color: "var(--color-btnPrimary)",
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

          <div
            className="stop-note-main"
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: useSideLayout ? "1fr minmax(300px, 0.95fr)" : "1fr",
              gap: "14px",
              marginTop: "2px",
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: "14px" }}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
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
                  minHeight: useSideLayout ? "170px" : "78px"
                }}
              />
              
              {showStatusOption && (
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    border: "1px solid var(--color-borderColorLight)",
                    borderRadius: "14px",
                    background: "#f8fafc",
                    padding: "12px 14px",
                    textAlign: "left",
                  }}
                >
                  <label style={{ color: "#334155", fontSize: "0.82rem", fontWeight: 700 }}>Estado da tarefa/atividade</label>
                  <div className="stop-status-grid">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`stop-status-pill ${normalizedStatus === option.value ? "active" : ""}`}
                        onClick={() => {
                          setNextStatus(option.value);
                          setFormError("");
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showLegacyCompleteOption && (
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
                    border: "1px solid var(--color-borderColorLight)",
                    background: shouldComplete ? "var(--color-bgSecondary)" : "#f8fafc",
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
                      background: shouldComplete ? "linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark))" : "#fff",
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

            {useSideLayout && (
              <div
                style={{
                  display: "grid",
                  gap: "8px",
                  border: "1px solid var(--color-borderColorLight)",
                  borderRadius: "14px",
                  background: "#f8fafc",
                  padding: "12px 14px",
                  textAlign: "left",
                }}
              >
                <label style={{ color: "#334155", fontSize: "0.8rem", fontWeight: 700 }}>Encaminhar para</label>
                <select
                  className="stop-note-select"
                  value={analysisDestination}
                  onChange={(e) => {
                    setAnalysisDestination(e.target.value);
                    setAnalysisDestinationUserId("");
                    setFormError("");
                  }}
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "9px 10px",
                    fontSize: "0.92rem",
                    color: "#0f172a",
                    background: "#fff",
                    outline: "none",
                  }}
                >
                  {destinationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {isColleagueDestination && (
                  <>
                    <label style={{ color: "#334155", fontSize: "0.8rem", fontWeight: 700 }}>Selecionar colega</label>
                    <select
                      className="stop-note-select"
                      value={analysisDestinationUserId}
                      onChange={(e) => {
                        setAnalysisDestinationUserId(e.target.value);
                        setFormError("");
                      }}
                      style={{
                        width: "100%",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        padding: "9px 10px",
                        fontSize: "0.92rem",
                        color: "#0f172a",
                        background: "#fff",
                        outline: "none",
                      }}
                      disabled={analysisUsersLoading}
                    >
                      <option value="">
                        {analysisUsersLoading
                          ? "A carregar colegas..."
                          : (analysisUsers.length === 0 ? "Sem colegas disponiveis" : "Seleciona um colega")}
                      </option>
                      {analysisUsers.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.nome || profile.email || String(profile.id).slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <label style={{ color: "#334155", fontSize: "0.8rem", fontWeight: 700 }}>Data expectavel de resposta</label>
                <input
                  type="date"
                  className="stop-note-date"
                  value={analysisExpectedDate}
                  onChange={(e) => {
                    setAnalysisExpectedDate(e.target.value);
                    setFormError("");
                  }}
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "9px 10px",
                    fontSize: "0.92rem",
                    color: "#0f172a",
                    background: "#fff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {formError ? (
              <div
                style={{
                  gridColumn: useSideLayout ? "1 / -1" : "auto",
                  color: "#b91c1c",
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textAlign: "left",
                }}
              >
                {formError}
              </div>
            ) : null}
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
              onClick={handleConfirm}
              style={{
                flex: "1 1 58%",
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


