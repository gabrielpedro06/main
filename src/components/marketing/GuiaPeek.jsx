import { useState } from "react";
import { I } from "./mkIcons";
import { PersonaFace } from "./mkFields";
import { normalizarHex, textoSobre } from "./mkColor";
import { norm } from "./mkUtils";

/** Painel lateral com o essencial do guia da marca, para consultar enquanto se escreve */
export default function GuiaPeek({ marca, canais = [], personas = [], onClose }) {
  const g = marca?.guia || {};
  const [copiado, setCopiado] = useState(null);
  const voz = g.voz || {};
  const canaisGuia = (voz.canais || []).filter((c) => canais.some((x) => norm(c.canal).includes(norm(x)) || norm(x).includes(norm(c.canal).split(" ")[0])));
  const cores = (g.visual?.cores || []).filter((c) => normalizarHex(c.hex));
  const copiar = (hex) => navigator.clipboard?.writeText(hex).then(() => { setCopiado(hex); setTimeout(() => setCopiado(null), 1100); }).catch(() => {});
  const nada = !voz.tom && !voz.usamos?.length && !voz.evitamos?.length && !cores.length && !g.e_nao_e?.e?.length && !personas.length;

  return (
    <aside className="mk-peek" aria-label="Guia da marca">
      <header>
        <I.Book size={16} />
        <b>Guia da {marca?.nome}</b>
        <span className="mk-spacer" />
        <button type="button" className="mk-icon-btn is-sm" onClick={onClose} aria-label="Fechar guia"><I.X size={14} /></button>
      </header>
      <div className="mk-peek-body">
        {nada && <p className="mk-hint" style={{ margin: 0 }}>Esta marca ainda não tem guia. Preencha-o no separador <b>Marca</b>.</p>}

        {personas.length > 0 && (
          <section>
            <h5>Para quem é</h5>
            {personas.map((p) => (
              <div key={p.id} className="mk-peek-persona">
                <div className="mk-peek-persona-head"><PersonaFace persona={p} size={24} /><b>{p.nome_persona}</b><small>{p.papel}</small></div>
                {p.mensagem_chave && <p className="mk-peek-msg">“{p.mensagem_chave}”</p>}
                {p.como_abordar && <p>{p.como_abordar}</p>}
                {p.canal_chave && <small className="mk-peek-tag">Canal: {p.canal_chave}</small>}
              </div>
            ))}
          </section>
        )}

        {voz.tom && (
          <section>
            <h5>Tom de voz</h5>
            <p>{voz.tom}</p>
          </section>
        )}

        {canaisGuia.length > 0 && (
          <section>
            <h5>Nos canais deste conteúdo</h5>
            {canaisGuia.map((c, i) => <div key={i} className="mk-peek-canal"><b>{c.canal}</b><p>{c.tom}</p>{c.exemplo && <em>{c.exemplo}</em>}</div>)}
          </section>
        )}

        {(voz.usamos?.length > 0 || voz.evitamos?.length > 0) && (
          <section>
            <h5>Palavras</h5>
            <div className="mk-g-chips is-yes is-sm">{(voz.usamos || []).map((x) => <span key={x}>{x}</span>)}</div>
            <div className="mk-g-chips is-no is-sm" style={{ marginTop: 6 }}>{(voz.evitamos || []).map((x) => <span key={x}>{x}</span>)}</div>
          </section>
        )}

        {(voz.em_vez_de || voz.dizemos) && (
          <section>
            <h5>Em vez de… dizemos</h5>
            {voz.em_vez_de && <p className="mk-peek-no">“{voz.em_vez_de}”</p>}
            {voz.dizemos && <p className="mk-peek-yes">“{voz.dizemos}”</p>}
          </section>
        )}

        {(g.e_nao_e?.e?.length > 0 || g.e_nao_e?.nao_e?.length > 0) && (
          <section>
            <h5>A marca é / não é</h5>
            <div className="mk-peek-isnot">
              <ul className="is-yes">{(g.e_nao_e.e || []).map((x) => <li key={x}>{x}</li>)}</ul>
              <ul className="is-no">{(g.e_nao_e.nao_e || []).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </section>
        )}

        {cores.length > 0 && (
          <section>
            <h5>Cores <small>clique para copiar</small></h5>
            <div className="mk-peek-colors">
              {cores.map((c, i) => {
                const hex = normalizarHex(c.hex).toUpperCase();
                return (
                  <button key={i} type="button" title={`${c.nome} · ${c.uso || ""}`} style={{ background: hex, color: textoSobre(hex) }} onClick={() => copiar(hex)}>
                    {copiado === hex ? "✓" : hex}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {voz.tratamento && (
          <section>
            <h5>Tratamento</h5>
            <p>{voz.tratamento}</p>
          </section>
        )}
      </div>
    </aside>
  );
}
