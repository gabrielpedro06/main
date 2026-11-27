// =====================================================================
// Reencaminhar uma mensagem do chat para uma ou mais conversas.
// A cópia (texto e anexo) é feita pelo Forum.jsx (reencaminharMensagem);
// aqui só se escolhem as conversas. Estilos .fx-fwd-* em styles/forum.css.
// =====================================================================
import { useMemo, useState } from "react";
import Janela from "../Janela";

const Seta = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 17 5-5-5-5" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
);

/**
 * @param {object} props
 * @param {object|null} props.mensagem   mensagem a reencaminhar (null = fechada)
 * @param {{ id, titulo, subtitulo, avatar }[]} props.conversas  avatar = elemento já desenhado
 * @param {(ids: string[]) => Promise<void>} props.onEnviar
 * @param {() => void} props.aoFechar
 */
export default function JanelaReencaminhar({ mensagem, conversas, onEnviar, aoFechar }) {
  const [escolhidas, setEscolhidas] = useState([]);
  const [busca, setBusca] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? conversas.filter((c) => c.titulo.toLowerCase().includes(q)) : conversas;
  }, [conversas, busca]);

  const alternar = (id) => setEscolhidas((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  async function enviar() {
    setAEnviar(true);
    try { await onEnviar(escolhidas); setEscolhidas([]); setBusca(""); } finally { setAEnviar(false); }
  }

  const fechar = () => { setEscolhidas([]); setBusca(""); aoFechar(); };
  const resumo = mensagem ? (mensagem.content || (mensagem.file_name ? `📎 ${mensagem.file_name}` : "")) : "";

  return (
    <Janela
      aberta={!!mensagem}
      aoFechar={fechar}
      bloquear={aEnviar}
      largura={460}
      camada="calc(var(--z-modal-max) + 6)"
      icone={<Seta />}
      titulo="Reencaminhar"
      subtitulo={resumo.length > 70 ? `${resumo.slice(0, 70)}…` : resumo}
      rodape={<>
        <button type="button" onClick={fechar}>Cancelar</button>
        <button type="button" className="is-primary" disabled={!escolhidas.length || aEnviar} onClick={enviar}>
          {aEnviar ? "A enviar…" : escolhidas.length > 1 ? `Enviar para ${escolhidas.length}` : "Enviar"}
        </button>
      </>}
    >
      <input className="bz-campo" placeholder="Procurar conversa…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Procurar conversa" autoFocus />
      <div className="fx-fwd-lista">
        {lista.map((c) => {
          const on = escolhidas.includes(c.id);
          return (
            <button key={c.id} type="button" className={`fx-fwd-item${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => alternar(c.id)}>
              {c.avatar}
              <span className="fx-fwd-txt"><b>{c.titulo}</b><small>{c.subtitulo}</small></span>
              <span className="fx-fwd-check" aria-hidden="true">{on ? "✓" : ""}</span>
            </button>
          );
        })}
        {!lista.length && <p className="fx-fwd-vazio">Nenhuma conversa encontrada.</p>}
      </div>
    </Janela>
  );
}
