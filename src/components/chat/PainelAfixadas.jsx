// =====================================================================
// Mensagens afixadas da conversa (como no Discord): lista por baixo do
// cabeçalho do chat. Clicar numa leva à mensagem; quem está na conversa pode
// desafixar. Estilos .fx-pins-* em styles/forum.css.
// =====================================================================
const Pin = ({ s = 15 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>
);

/**
 * @param {object} props
 * @param {object[]} props.mensagens  afixadas (mais recente primeiro)
 * @param {(id: string) => string} props.nomeDe  nome de quem enviou
 * @param {(iso: string) => string} props.dataDe
 * @param {(msg: object) => void} props.onIr
 * @param {(msg: object) => void} props.onDesafixar
 * @param {() => void} props.aoFechar
 */
export default function PainelAfixadas({ mensagens, nomeDe, dataDe, onIr, onDesafixar, aoFechar }) {
  return (
    <div className="fx-pins" role="dialog" aria-label="Mensagens afixadas">
      <header className="fx-pins-cab">
        <Pin /> <b>Mensagens afixadas</b> <span>{mensagens.length}</span>
        <button type="button" className="fx-pins-fechar" onClick={aoFechar} aria-label="Fechar">×</button>
      </header>
      {mensagens.length === 0 ? (
        <p className="fx-pins-vazio">Ainda não há mensagens afixadas. Usa a seta de uma mensagem → <b>Afixar</b>.</p>
      ) : (
        <ul className="fx-pins-lista">
          {mensagens.map((m) => (
            <li key={m.id}>
              <button type="button" className="fx-pins-item" onClick={() => onIr(m)}>
                <span className="fx-pins-quem">{nomeDe(m.sender_id)} · {dataDe(m.created_at)}</span>
                <span className="fx-pins-txt">{m.content || (m.file_name ? `📎 ${m.file_name}` : "")}</span>
              </button>
              <button type="button" className="fx-pins-tirar" onClick={() => onDesafixar(m)} title="Desafixar" aria-label="Desafixar">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
