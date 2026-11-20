// =====================================================================
// Janela de videochamada (Jitsi as a Service / 8x8) por cima da app.
// Pede um token à nossa API (/api/reunioes, que confirma sessão, 2FA e que a
// pessoa participa na conversa), carrega o external_api.js do JaaS e mostra a
// reunião dentro desta janela. Ao sair (botão do Jitsi ou "Sair") fecha tudo.
// Estilos em src/styles/videochamada.css. Ver docs/modulos/comunicacao-e-dashboard.md.
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minimize2, Maximize2, PhoneOff, Video } from "lucide-react";
import { postAutenticado } from "../utils/apiAutenticada";
import "../styles/videochamada.css";

const API_BASE = import.meta.env.VITE_MARKETING_API_BASE || "";
const scriptsCarregados = new Map(); // appId → Promise (o script só é carregado uma vez)

/** Carrega o external_api.js do JaaS para este appId (devolve a classe JitsiMeetExternalAPI). */
function carregarJitsi(appId) {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI);
  if (!scriptsCarregados.has(appId)) {
    scriptsCarregados.set(appId, new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://8x8.vc/${encodeURIComponent(appId)}/external_api.js`;
      s.async = true;
      s.onload = () => (window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error("Jitsi indisponível.")));
      s.onerror = () => { scriptsCarregados.delete(appId); reject(new Error("Não foi possível carregar a videochamada. Verifica a ligação à internet.")); };
      document.head.appendChild(s);
    }));
  }
  return scriptsCarregados.get(appId);
}

/**
 * @param {object} p
 * @param {string} p.conversa  id da conversa (chat_rooms.id)
 * @param {string} p.titulo    nome mostrado no topo (nome do grupo / da pessoa)
 * @param {() => void} p.onFechar
 */
export default function VideoChamada({ conversa, titulo, onFechar }) {
  const contentorRef = useRef(null);
  const apiRef = useRef(null);
  const [estado, setEstado] = useState("a-ligar"); // a-ligar | ligado | erro
  const [erro, setErro] = useState("");
  const [minimizada, setMinimizada] = useState(false);
  const onFecharRef = useRef(onFechar);
  useEffect(() => { onFecharRef.current = onFechar; }, [onFechar]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await postAutenticado(`${API_BASE}/api/reunioes`, { conversa });
        const dados = await r.json().catch(() => ({}));
        if (!r.ok || !dados?.jwt) throw new Error(dados?.error || "Não foi possível iniciar a chamada.");
        const JitsiAPI = await carregarJitsi(dados.appId);
        if (cancelado || !contentorRef.current) return;
        const api = new JitsiAPI(dados.dominio, {
          roomName: dados.sala,
          jwt: dados.jwt,
          parentNode: contentorRef.current,
          width: "100%",
          height: "100%",
          lang: "pt",
          configOverwrite: {
            prejoinConfig: { enabled: true },
            disableDeepLinking: true,
            subject: titulo || "Chamada Bizin",
          },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        });
        apiRef.current = api;
        api.addListener("videoConferenceJoined", () => setEstado("ligado"));
        api.addListener("readyToClose", () => onFecharRef.current?.());
        setEstado("ligado");
      } catch (e) {
        if (!cancelado) { setErro(e?.message || "Erro na videochamada."); setEstado("erro"); }
      }
    })();
    return () => {
      cancelado = true;
      try { apiRef.current?.dispose(); } catch { /* já fechada */ }
      apiRef.current = null;
    };
  }, [conversa, titulo]);

  const sair = () => {
    try { apiRef.current?.executeCommand("hangup"); } catch { /* ignora */ }
    onFechar?.();
  };

  return createPortal(
    <div className={`vc-overlay ${minimizada ? "is-min" : ""}`} role="dialog" aria-label={`Videochamada: ${titulo || "Chamada"}`}>
      <div className="vc-janela">
        <header className="vc-topo">
          <span className="vc-ico" aria-hidden="true"><Video size={16} /></span>
          <strong className="vc-titulo">{titulo || "Chamada"}</strong>
          {estado === "a-ligar" && <span className="vc-estado">A ligar…</span>}
          <div className="vc-acoes">
            <button type="button" className="vc-btn" onClick={() => setMinimizada((m) => !m)} aria-label={minimizada ? "Aumentar" : "Minimizar"} title={minimizada ? "Aumentar" : "Minimizar"}>
              {minimizada ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button type="button" className="vc-btn is-sair" onClick={sair} aria-label="Sair da chamada" title="Sair da chamada">
              <PhoneOff size={16} /> <span>Sair</span>
            </button>
          </div>
        </header>
        <div className="vc-corpo">
          {estado === "erro" ? (
            <div className="vc-erro" role="alert">
              <p>{erro}</p>
              <button type="button" className="vc-btn is-sair" onClick={onFechar}>Fechar</button>
            </div>
          ) : (
            <div ref={contentorRef} className="vc-jitsi" />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
