// =====================================================================
// Janela de videochamada (Jitsi as a Service / 8x8) por cima da app.
// Montada pelo ChamadasProvider (context/ChamadasContext.jsx), por isso a
// chamada continua ao mudar de página.
// Pede um token à nossa API (/api/reunioes: sessão + 2FA + participante da
// conversa ou convidado), carrega o external_api.js do JaaS e mostra a reunião.
// Segurança: o "convidar por link" do Jitsi está desligado e a sala de espera
// (lobby) é ligada ao entrar — quem não vem pelo Bizin fica à porta até um
// moderador aceitar. Convidar colegas faz-se pelo botão "Convidar" (toca-lhes no Bizin).
// Estilos em src/styles/videochamada.css.
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minimize2, Maximize2, PhoneOff, Video, UserPlus, Search, Check } from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { postAutenticado } from "../utils/apiAutenticada";
import "../styles/videochamada.css";

const API_BASE = import.meta.env.VITE_MARKETING_API_BASE || "";
const scriptsCarregados = new Map(); // appId → Promise (o script só é carregado uma vez)

const ESTADOS = { a_tocar: "A tocar…", aceite: "Atendeu", recusada: "Recusou", perdida: "Não atendeu", cancelada: "Cancelado" };
const semAcentos = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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
 * @param {string} p.conversa   id da conversa (chat_rooms.id)
 * @param {string} p.titulo     nome mostrado no topo
 * @param {() => void} p.onFechar
 * @param {Record<string, {estado: string, nome: string}>} [p.convites] estado de quem foi chamado
 * @param {(ids: string[]) => void} [p.onConvidar] chama colegas (toca-lhes no Bizin)
 */
export default function VideoChamada({ conversa, titulo, onFechar, convites = {}, onConvidar }) {
  const contentorRef = useRef(null);
  const apiRef = useRef(null);
  const [estado, setEstado] = useState("a-ligar"); // a-ligar | ligado | erro
  const [erro, setErro] = useState("");
  const [minimizada, setMinimizada] = useState(false);
  const [painel, setPainel] = useState(false);
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
            disableInviteFunctions: true,
            subject: titulo || "Chamada Bizin",
          },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        });
        apiRef.current = api;
        api.addListener("videoConferenceJoined", () => {
          setEstado("ligado");
          // Sala de espera: quem entrar sem token do Bizin (ex.: link partilhado) espera por aprovação.
          try { api.executeCommand("toggleLobby", true); } catch { /* sem permissão: ignora */ }
        });
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

  const aTocar = Object.values(convites).filter((c) => c.estado === "a_tocar").length;

  return createPortal(
    <div className={`vc-overlay ${minimizada ? "is-min" : ""}`} role="dialog" aria-label={`Videochamada: ${titulo || "Chamada"}`}>
      <div className="vc-janela">
        <header className="vc-topo">
          <span className="vc-ico" aria-hidden="true"><Video size={16} /></span>
          <strong className="vc-titulo">{titulo || "Chamada"}</strong>
          {estado === "a-ligar" && <span className="vc-estado">A ligar…</span>}
          {estado !== "a-ligar" && aTocar > 0 && <span className="vc-estado">A tocar a {aTocar} {aTocar === 1 ? "pessoa" : "pessoas"}…</span>}
          <div className="vc-acoes">
            {onConvidar && estado !== "erro" && (
              <button type="button" className={`vc-btn ${painel ? "is-on" : ""}`} onClick={() => { setPainel((v) => !v); setMinimizada(false); }} aria-expanded={painel} title="Convidar colegas do Bizin">
                <UserPlus size={16} /> <span className="vc-btn-txt">Convidar</span>
              </button>
            )}
            <button type="button" className="vc-btn" onClick={() => setMinimizada((m) => !m)} aria-label={minimizada ? "Aumentar" : "Minimizar"} title={minimizada ? "Aumentar" : "Minimizar"}>
              {minimizada ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button type="button" className="vc-btn is-sair" onClick={sair} aria-label="Sair da chamada" title="Sair da chamada">
              <PhoneOff size={16} /> <span className="vc-btn-txt">Sair</span>
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
          {painel && !minimizada && (
            <PainelConvidar convites={convites} onConvidar={onConvidar} onFechar={() => setPainel(false)} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Lista de colegas ativos do Bizin para chamar para a chamada (toca-lhes no Bizin). */
function PainelConvidar({ convites, onConvidar, onFechar }) {
  const { user } = useAuth();
  const [pessoas, setPessoas] = useState(null);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    let vivo = true;
    supabase.from("profiles").select("id, nome, avatar_url, ativo").order("nome")
      .then(({ data }) => { if (vivo) setPessoas((data || []).filter((p) => p.id !== user?.id && p.ativo !== false)); });
    return () => { vivo = false; };
  }, [user?.id]);

  const lista = useMemo(() => {
    const q = semAcentos(filtro).trim();
    return (pessoas || []).filter((p) => !q || semAcentos(p.nome).includes(q));
  }, [pessoas, filtro]);

  return (
    <aside className="vc-painel" aria-label="Convidar colegas">
      <div className="vc-painel-topo">
        <strong>Convidar colegas</strong>
        <button type="button" className="vc-painel-x" onClick={onFechar} aria-label="Fechar">×</button>
      </div>
      <label className="vc-painel-pesq">
        <Search size={15} aria-hidden="true" />
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Procurar pessoa…" aria-label="Procurar pessoa" autoFocus />
      </label>
      <ul className="vc-painel-lista">
        {pessoas === null && <li className="vc-painel-vazio">A carregar…</li>}
        {pessoas !== null && !lista.length && <li className="vc-painel-vazio">Ninguém encontrado.</li>}
        {lista.map((p) => {
          const c = convites[p.id];
          const podeChamar = !c || ["recusada", "perdida", "cancelada"].includes(c.estado);
          return (
            <li key={p.id}>
              <span className="vc-painel-av" aria-hidden="true">
                {p.avatar_url ? <img src={p.avatar_url} alt="" /> : (p.nome || "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="vc-painel-nome">
                {p.nome}
                {c && <small className={`is-${c.estado}`}>{ESTADOS[c.estado] || c.estado}</small>}
              </span>
              {podeChamar ? (
                <button type="button" className="vc-painel-btn" onClick={() => onConvidar([p.id])}>{c ? "Chamar de novo" : "Chamar"}</button>
              ) : (
                <span className="vc-painel-ok" aria-label={ESTADOS[c.estado]}><Check size={15} /></span>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
