// =====================================================================
// Videochamadas em toda a app (montado no layout do Dashboard).
//  - ligar({ conversa, titulo }): abre a chamada e "toca" aos outros
//    participantes da conversa (linhas em chamadas_convites, migração 079).
//  - convidar(ids): chama mais colegas para a chamada aberta.
//  - Recebe chamadas por Realtime e mostra o aviso no topo (Atender/Recusar),
//    com toque, em qualquer página. Sem resposta em 45 s → "perdida".
//  - A janela <VideoChamada> vive aqui, por isso a chamada continua ao mudar de página.
// =====================================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "./AuthContext";
import { playNotifySound } from "../utils/notifySound";
import VideoChamada from "../components/VideoChamada";
import "../styles/videochamada.css";

const TOQUE_MS = 45000;     // tempo máximo a tocar
const GUARDA = "bizin_chamada_ativa";       // sessionStorage: sobrevive ao F5 neste separador
const GUARDA_MAX_MS = 3 * 60 * 60 * 1000;   // depois de 3 h já não se retoma

/** Chamada guardada neste separador (para voltar a entrar depois de um F5). */
function lerGuardada(userId) {
  try {
    const g = JSON.parse(sessionStorage.getItem(GUARDA) || "null");
    if (g?.conversa && userId && g.user === userId && Date.now() - (g.desde || 0) < GUARDA_MAX_MS) return { conversa: g.conversa, titulo: g.titulo, retomada: true };
  } catch { /* sem storage */ }
  return null;
}
function guardar(a, userId) {
  try {
    if (a && userId) sessionStorage.setItem(GUARDA, JSON.stringify({ conversa: a.conversa, titulo: a.titulo, user: userId, desde: Date.now() }));
    else sessionStorage.removeItem(GUARDA);
  } catch { /* sem storage */ }
}
const ChamadasCtx = createContext(null);

/** Acesso às chamadas: { ativa, ligar, convidar, convites } (null fora do Dashboard). */
// eslint-disable-next-line react-refresh/only-export-components
export const useChamadas = () => useContext(ChamadasCtx);

export function ChamadasProvider({ children }) {
  const { user } = useAuth();
  const meuId = user?.id || null;
  // { conversa, titulo, retomada? } — começa com a chamada guardada, se houve F5 a meio de uma
  const [ativa, setAtiva] = useState(() => lerGuardada(meuId));
  const [recebida, setRecebida] = useState(null); // convite a tocar + { nome, avatar }
  const [convites, setConvites] = useState({});   // para → { estado, nome } (chamada ativa)
  const [aviso, setAviso] = useState("");
  const ativaRef = useRef(ativa);
  const convitesRef = useRef(convites);
  const avisoTimer = useRef(0);
  useEffect(() => {
    ativaRef.current = ativa;
    // Guarda só ao abrir/mudar de sala (não renova a hora a cada render)
    if (!ativa) guardar(null);
    else if (!ativa.retomada) guardar(ativa, meuId);
  }, [ativa, meuId]);
  useEffect(() => { convitesRef.current = convites; }, [convites]);

  const mostrarAviso = useCallback((t) => {
    setAviso(t);
    window.clearTimeout(avisoTimer.current);
    avisoTimer.current = window.setTimeout(() => setAviso(""), 4500);
  }, []);

  /** Cria convites "a tocar" para estas pessoas na sala indicada. */
  const tocarA = useCallback(async (conversa, titulo, ids) => {
    const alvos = [...new Set(ids)].filter((id) => id && id !== meuId);
    if (!alvos.length || !meuId) return;
    const { data: perfis } = await supabase.from("profiles").select("id, nome").in("id", alvos);
    const nomes = Object.fromEntries((perfis || []).map((p) => [p.id, p.nome]));
    setConvites((prev) => {
      const n = { ...prev };
      alvos.forEach((id) => { n[id] = { estado: "a_tocar", nome: nomes[id] || "Colega" }; });
      return n;
    });
    const { error } = await supabase.from("chamadas_convites").insert(alvos.map((para) => ({ sala: conversa, titulo, de: meuId, para })));
    if (error) mostrarAviso("Não foi possível chamar: " + (error.message || "erro"));
  }, [meuId, mostrarAviso]);

  /** Abre uma chamada na conversa e toca aos outros participantes. */
  const ligar = useCallback(async ({ conversa, titulo, tocar = true }) => {
    if (!conversa) return;
    setConvites({});
    setAtiva({ conversa, titulo: titulo || "Chamada" });
    if (!tocar) return;
    const { data } = await supabase.from("chat_participants").select("user_id").eq("room_id", conversa);
    await tocarA(conversa, titulo, (data || []).map((r) => r.user_id));
  }, [tocarA]);

  const convidar = useCallback((ids) => {
    const a = ativaRef.current;
    if (a) tocarA(a.conversa, a.titulo, ids);
  }, [tocarA]);

  /** Ao sair: cancela os convites que ainda estão a tocar. */
  const terminar = useCallback(async () => {
    const a = ativaRef.current;
    setAtiva(null);
    setConvites({});
    if (a && meuId) {
      await supabase.from("chamadas_convites").update({ estado: "cancelada" })
        .eq("sala", a.conversa).eq("de", meuId).eq("estado", "a_tocar");
    }
  }, [meuId]);

  const responder = useCallback(async (estado) => {
    const r = recebida;
    setRecebida(null);
    if (!r) return;
    await supabase.from("chamadas_convites").update({ estado }).eq("id", r.id).eq("estado", "a_tocar");
    if (estado === "aceite") {
      if (ativaRef.current && ativaRef.current.conversa !== r.sala) await terminar();
      setConvites({});
      setAtiva({ conversa: r.sala, titulo: r.titulo || r.nome || "Chamada" });
    }
  }, [recebida, terminar]);

  /** Mostra uma chamada recebida (se ainda estiver a tocar e for recente). */
  const receber = useCallback(async (c) => {
    if (!c || c.estado !== "a_tocar" || c.para !== meuId) return;
    if (Date.now() - new Date(c.criado_em).getTime() > TOQUE_MS) return;
    if (ativaRef.current?.conversa === c.sala) {
      // já estou nesta chamada: aceito em silêncio
      supabase.from("chamadas_convites").update({ estado: "aceite" }).eq("id", c.id).then(() => {});
      return;
    }
    const { data: p } = await supabase.from("profiles").select("nome, avatar_url").eq("id", c.de).maybeSingle();
    setRecebida({ ...c, nome: p?.nome || "Um colega", avatar: p?.avatar_url || null });
  }, [meuId]);

  // Realtime: chamadas para mim (novas e canceladas) e respostas às minhas.
  useEffect(() => {
    if (!meuId) return undefined;
    let vivo = true;
    supabase.from("chamadas_convites").select("*").eq("para", meuId).eq("estado", "a_tocar")
      .gte("criado_em", new Date(Date.now() - TOQUE_MS).toISOString())
      .order("criado_em", { ascending: false }).limit(1)
      .then(({ data }) => { if (vivo && data?.[0]) receber(data[0]); });

    const canal = supabase
      .channel(`chamadas_${meuId}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chamadas_convites", filter: `para=eq.${meuId}` },
        (p) => receber(p.new))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chamadas_convites", filter: `para=eq.${meuId}` },
        (p) => { if (p.new.estado !== "a_tocar") setRecebida((r) => (r?.id === p.new.id ? null : r)); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chamadas_convites", filter: `de=eq.${meuId}` },
        (p) => {
          const c = p.new;
          if (ativaRef.current?.conversa !== c.sala) return;
          const nome = convitesRef.current[c.para]?.nome || "Colega";
          if (c.estado === "recusada") mostrarAviso(`${nome} recusou a chamada.`);
          if (c.estado === "perdida") mostrarAviso(`${nome} não atendeu.`);
          setConvites((prev) => ({ ...prev, [c.para]: { estado: c.estado, nome } }));
        })
      .subscribe();
    return () => { vivo = false; supabase.removeChannel(canal); };
  }, [meuId, receber, mostrarAviso]);

  // Toque enquanto há chamada recebida; ao fim de 45 s marca como perdida.
  useEffect(() => {
    if (!recebida) return undefined;
    playNotifySound();
    const toque = window.setInterval(playNotifySound, 2500);
    const restante = Math.max(0, TOQUE_MS - (Date.now() - new Date(recebida.criado_em).getTime()));
    const fim = window.setTimeout(() => responder("perdida"), restante);
    return () => { window.clearInterval(toque); window.clearTimeout(fim); };
  }, [recebida, responder]);

  // Nota: um F5 não cancela os toques — a chamada volta a abrir sozinha (sessionStorage)
  // e quem está a ser chamado pode atender. Os toques expiram sozinhos ao fim de 45 s.

  const valor = useMemo(() => ({ ativa, ligar, convidar, convites }), [ativa, ligar, convidar, convites]);

  return (
    <ChamadasCtx.Provider value={valor}>
      {children}
      {ativa && (
        <VideoChamada
          key={ativa.conversa}
          conversa={ativa.conversa}
          titulo={ativa.titulo}
          retomada={Boolean(ativa.retomada)}
          onFechar={terminar}
          convites={convites}
          onConvidar={convidar}
        />
      )}
      {recebida && createPortal(
        <div className="vc-tocar" role="alertdialog" aria-live="assertive" aria-label={`Chamada de ${recebida.nome}`}>
          <span className="vc-tocar-avatar" aria-hidden="true">
            {recebida.avatar ? <img src={recebida.avatar} alt="" /> : <Video size={20} />}
          </span>
          <div className="vc-tocar-txt">
            <strong>{recebida.nome}</strong>
            <span>está a ligar-te{recebida.titulo && recebida.titulo !== recebida.nome ? ` · ${recebida.titulo}` : ""}</span>
          </div>
          <button type="button" className="vc-tocar-btn is-recusar" onClick={() => responder("recusada")} aria-label="Recusar">
            <PhoneOff size={18} /><span>Recusar</span>
          </button>
          <button type="button" className="vc-tocar-btn is-atender" onClick={() => responder("aceite")} aria-label="Atender" autoFocus>
            <Phone size={18} /><span>Atender</span>
          </button>
        </div>,
        document.body
      )}
      {aviso && createPortal(<div className="vc-aviso" role="status">{aviso}</div>, document.body)}
    </ChamadasCtx.Provider>
  );
}
