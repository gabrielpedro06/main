// Cronómetro das peças de Marketing: botão no cartão do quadro (CronoChip) e
// painel na gaveta da peça (CronoPainel). A lógica (task_logs, um cronómetro
// por pessoa, picagem de ponto) está em utils/cronometroMarketing.js.
// Estilos: .mk-crono* em styles/marketing.css.
import { formatarMinutos, relogio, useAgora } from "../../utils/cronometroMarketing";
import { Avatar } from "./mkFields";

const Play = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>
);
const Stop = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3" /></svg>
);
const Relogio = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
);

/**
 * Botão do cronómetro no cartão do quadro.
 * - a correr (meu): ■ 00:12:34 a pulsar; carregar para;
 * - com tempo: ⏱ 1h 20m (ponto verde se alguém está a cronometrar);
 * - sem tempo: ▶ (só aparece ao passar o rato / sempre no telemóvel).
 * @param {{ tempo: object, meuAqui: boolean, inicio?: string, desativado?: boolean, onIniciar: Function, onParar: Function, nomeDe?: (id: string) => string }} props
 */
export function CronoChip({ tempo, meuAqui, inicio, desativado, onIniciar, onParar, nomeDe }) {
  const outros = tempo.aCorrer.length > 0;
  const agora = useAgora(meuAqui || outros, meuAqui ? 1000 : 30000);
  const meuInicio = meuAqui ? (inicio || tempo.aCorrer.find((r) => r.meu)?.start_time) : null;
  // Recalcula o total com o relógio atual
  const total = tempo.calcular ? tempo.calcular(agora).total : tempo.total;
  const clicar = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (desativado) return;
    if (meuAqui) onParar(); else onIniciar();
  };
  const quem = tempo.aCorrer.filter((r) => !r.meu).map((r) => nomeDe?.(r.user_id)).filter(Boolean).join(", ");

  let classe = "mk-crono-chip";
  let conteudo;
  let titulo;
  if (meuAqui) {
    classe += " is-meu";
    conteudo = <><Stop size={10} /><span>{relogio(meuInicio, agora)}</span></>;
    titulo = "Parar o cronómetro";
  } else if (total >= 1) {
    classe += outros ? " is-outros" : "";
    conteudo = <><Relogio size={12} /><span>{formatarMinutos(total)}</span>{outros && <i className="mk-crono-dot" />}</>;
    titulo = `Tempo gasto nesta peça: ${formatarMinutos(total)}${quem ? ` · a cronometrar: ${quem}` : ""}. Carrega para começar a cronometrar.`;
  } else {
    classe += " is-vazio";
    conteudo = <Play size={10} />;
    titulo = "Cronometrar esta peça";
  }
  return (
    <button
      type="button"
      className={classe}
      onClick={clicar}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      draggable={false}
      disabled={desativado}
      title={titulo}
      aria-label={titulo}
    >
      {conteudo}
    </button>
  );
}

/**
 * Painel do cronómetro na gaveta da peça: botão grande, relógio a andar,
 * total, o meu tempo e o tempo de cada pessoa.
 * @param {{ tempo: object, meuAqui: boolean, inicio?: string, aMudar: boolean, perfis: object[], userId: string, onIniciar: Function, onParar: Function }} props
 */
export function CronoPainel({ tempo, meuAqui, inicio, aMudar, perfis = [], userId, onIniciar, onParar, campanha }) {
  const algumACorrer = tempo.aCorrer.length > 0;
  const agora = useAgora(algumACorrer, 1000);
  const t = tempo.calcular ? tempo.calcular(agora) : tempo;
  const meuInicio = meuAqui ? (inicio || tempo.aCorrer.find((r) => r.meu)?.start_time) : null;
  const pessoa = (id) => perfis.find((p) => p.id === id);
  const pessoas = Object.entries(t.porPessoa).sort((a, b) => b[1] - a[1]);
  const aCorrerIds = new Set(tempo.aCorrer.map((r) => r.user_id));

  return (
    <div className={`mk-crono ${meuAqui ? "is-meu" : ""}`}>
      <button
        type="button"
        className="mk-crono-btn"
        onClick={meuAqui ? onParar : onIniciar}
        disabled={aMudar}
        aria-label={meuAqui ? "Parar o cronómetro" : "Começar a cronometrar esta peça"}
      >
        {meuAqui ? <Stop size={14} /> : <Play size={14} />}
        <span>{meuAqui ? relogio(meuInicio, agora) : "Cronometrar"}</span>
      </button>
      <div className="mk-crono-info">
        <span className="mk-crono-total"><b>{formatarMinutos(t.total)}</b> no total</span>
        {t.meu >= 1 && t.meu < t.total && <span className="mk-crono-meu">{formatarMinutos(t.meu)} teus</span>}
        {campanha?.nome && (
          <span className="mk-crono-meu" title="Soma de todas as pessoas em todas as peças desta campanha">
            Campanha {campanha.nome}: <b>{formatarMinutos(campanha.tempo.calcular ? campanha.tempo.calcular(agora).total : campanha.tempo.total)}</b>
          </span>
        )}
      </div>
      {pessoas.length > 0 && (
        <div className="mk-crono-pessoas">
          {pessoas.slice(0, 6).map(([id, min]) => {
            const p = pessoa(id);
            const corre = aCorrerIds.has(id);
            return (
              <span key={id} className={`mk-crono-pessoa ${corre ? "is-a-correr" : ""}`} title={`${p?.nome || "Colaborador"}: ${formatarMinutos(min)}${corre ? " (a cronometrar agora)" : ""}${id === userId ? " · tu" : ""}`}>
                <Avatar pessoa={p} size={20} />
                <span>{formatarMinutos(min)}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Tempo de uma campanha (aparece por cima do quadro quando se filtra por campanha):
 * total de todas as pessoas em todas as peças da campanha, o tempo de cada pessoa
 * e as peças onde se gastou mais tempo.
 * @param {{ nome: string, tempo: object, pecas: { id: string, titulo: string, minutos: number }[], nPecas: number, perfis: object[], userId: string, onAbrir: (id: string) => void }} props
 */
export function CampanhaTempo({ nome, tempo, pecas = [], nPecas = 0, perfis = [], userId, onAbrir }) {
  const algumACorrer = tempo.aCorrer.length > 0;
  const agora = useAgora(algumACorrer, 30000);
  const t = tempo.calcular ? tempo.calcular(agora) : tempo;
  const pessoa = (id) => perfis.find((p) => p.id === id);
  const pessoas = Object.entries(t.porPessoa).sort((a, b) => b[1] - a[1]);
  const aCorrerIds = new Set(tempo.aCorrer.map((r) => r.user_id));
  const comTempo = pecas.filter((p) => p.minutos >= 1).sort((a, b) => b.minutos - a.minutos);
  const maxPessoa = pessoas[0]?.[1] || 1;

  return (
    <section className="mk-camp-tempo" aria-label={`Tempo da campanha ${nome}`}>
      <div className="mk-camp-tempo-head">
        <span className="mk-camp-tempo-ico"><Relogio size={18} /></span>
        <div>
          <span className="mk-camp-tempo-label">Tempo na campanha <b>{nome}</b></span>
          <strong className="mk-camp-tempo-total">{formatarMinutos(t.total)}</strong>
          <span className="mk-camp-tempo-sub">
            {comTempo.length} de {nPecas} peça{nPecas === 1 ? "" : "s"} com tempo registado
            {t.meu >= 1 && <> · <b>{formatarMinutos(t.meu)}</b> teus</>}
          </span>
        </div>
      </div>

      {pessoas.length > 0 ? (
        <div className="mk-camp-tempo-cols">
          <div>
            <h4>Por pessoa</h4>
            <ul className="mk-camp-tempo-pessoas">
              {pessoas.map(([id, min]) => {
                const p = pessoa(id);
                return (
                  <li key={id} className={aCorrerIds.has(id) ? "is-a-correr" : ""}>
                    <Avatar pessoa={p} size={22} />
                    <span className="mk-camp-tempo-nome">{p?.nome || "Colaborador"}{id === userId ? " (tu)" : ""}</span>
                    <span className="mk-camp-tempo-barra"><i style={{ width: `${Math.max(4, (min / maxPessoa) * 100)}%` }} /></span>
                    <b>{formatarMinutos(min)}</b>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h4>Peças com mais tempo</h4>
            <ul className="mk-camp-tempo-pecas">
              {comTempo.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onAbrir?.(p.id)} title="Abrir a peça">
                    <span>{p.titulo || "Sem título"}</span>
                    <b>{formatarMinutos(p.minutos)}</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mk-camp-tempo-vazio">Ainda ninguém cronometrou peças desta campanha. Carrega no ▶ de um cartão para começar.</p>
      )}
    </section>
  );
}
