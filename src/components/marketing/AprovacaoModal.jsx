import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";
import { aprovar, pedirAlteracoes } from "./mkAprovacao";
import { canalInfo, estadoInfo } from "../../constants/marketing";
import { urlSegura } from "./mkUtils";
import "./aprovacao.css";

const fmt = (iso, hora = true) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-PT", hora ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
};
const lista = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const ehImagem = (f) => /^image\//.test(f.tipo || "") || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.nome || "");

const Ico = {
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Undo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>,
  Link: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
};

/**
 * Pedido de aprovação de um conteúdo de marketing (aberto a partir das notificações).
 * Mostra a peça e permite aprovar ou pedir alterações.
 */
export default function AprovacaoModal({ conteudoId, user, onClose, onDecidido, onAbrirNoMarketing }) {
  const [c, setC] = useState(null);
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState(null); // null | "alteracoes"
  const [texto, setTexto] = useState("");
  const [aGravar, setAGravar] = useState(false);
  const [remetente, setRemetente] = useState(null);
  const textoRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    supabase
      .from("marketing_conteudos")
      .select("*, marca:marketing_marcas(id, nome, cor, logo_url)")
      .eq("id", conteudoId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!vivo) return;
        if (error || !data) { setErro(error?.message || "Este conteúdo já não existe."); return; }
        setC(data);
        if (data.enviado_aprovacao_por) {
          const { data: p } = await supabase.from("profiles").select("id, nome").eq("id", data.enviado_aprovacao_por).maybeSingle();
          if (vivo) setRemetente(p || null);
        }
      });
    return () => { vivo = false; };
  }, [conteudoId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !aGravar) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, aGravar]);

  useEffect(() => { if (modo === "alteracoes") textoRef.current?.focus(); }, [modo]);

  const decidir = async (acao) => {
    if (!c || aGravar) return;
    setAGravar(true);
    setErro("");
    try {
      if (acao === "aprovar") {
        await aprovar(c, user);
        onDecidido?.("Aprovado. A equipa de marketing foi avisada.");
      } else {
        await pedirAlteracoes(c, texto, user);
        onDecidido?.("Pedido de alterações enviado à equipa de marketing.");
      }
      onClose();
    } catch (e) {
      setErro(e?.message || "Não foi possível gravar.");
      setAGravar(false);
    }
  };

  const pendente = c?.estado === "aprovacao";
  const copies = lista(c?.copies).filter((x) => x?.texto);
  const links = lista(c?.links).filter((l) => urlSegura(l?.url));
  const anexos = lista(c?.anexos);
  const cor = c?.marca?.cor || "#2563eb";

  return createPortal(
    <div className="apv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !aGravar) onClose(); }}>
      <div className="apv-modal" role="dialog" aria-modal="true" aria-label="Pedido de aprovação" style={{ "--apv-brand": cor }}>
        <header className="apv-head">
          <div className="apv-head-top">
            <span className="apv-brand">
              {c?.marca?.logo_url ? <img src={c.marca.logo_url} alt="" /> : <i style={{ background: cor }} />}
              {c?.marca?.nome || "Marketing"}
            </span>
            <span className="apv-kicker">Pedido de aprovação</span>
            <span className="apv-spacer" />
            <button type="button" className="apv-x" onClick={onClose} aria-label="Fechar" disabled={aGravar}><Ico.Close /></button>
          </div>
          <h2>{c ? c.titulo || "Sem título" : erro ? "Conteúdo indisponível" : "A carregar…"}</h2>
          {c && (
            <p className="apv-sub">
              {remetente?.nome ? `Enviado por ${remetente.nome}` : "Enviado para aprovação"}
              {c.enviado_aprovacao_em ? ` · ${fmt(c.enviado_aprovacao_em)}` : ""}
            </p>
          )}
        </header>

        <div className="apv-body">
          {!c && !erro && <div className="apv-skel"><span /><span /><span /></div>}
          {c && (
            <>
              {!pendente && (
                <div className="apv-note">
                  Este conteúdo já não está à espera de aprovação. Está em <b>{estadoInfo(c.estado).label}</b>.
                </div>
              )}

              <div className="apv-meta">
                {lista(c.canais).map((x) => { const ci = canalInfo(x); return <span key={x} className="apv-canal" style={{ background: ci.cor }}>{x}</span>; })}
                {lista(c.formato).map((f) => <span key={f} className="apv-chip">{f}</span>)}
                {c.data_publicacao && <span className="apv-chip is-date">Publicação: {fmt(c.data_publicacao)}</span>}
                {c.campanha && <span className="apv-chip">Campanha: {c.campanha}</span>}
              </div>

              {c.headline && (
                <section className="apv-sec">
                  <h4>Headline / gancho</h4>
                  <p className="apv-headline">{c.headline}</p>
                </section>
              )}

              {copies.length > 0 && (
                <section className="apv-sec">
                  <h4>Texto</h4>
                  {copies.map((cp, i) => (
                    <div key={i} className="apv-copy">
                      {copies.length > 1 && <b>{cp.titulo || `Copy ${i + 1}`}</b>}
                      <p>{cp.texto}</p>
                    </div>
                  ))}
                </section>
              )}

              {(c.cta || c.cta_2) && (
                <section className="apv-sec">
                  <h4>Chamada para a ação</h4>
                  {c.cta && <p>{c.cta}</p>}
                  {c.cta_2 && <p>{c.cta_2}</p>}
                </section>
              )}

              {lista(c.hashtags).length > 0 && (
                <section className="apv-sec">
                  <h4>Hashtags</h4>
                  <p className="apv-tags">{lista(c.hashtags).join(" ")}</p>
                </section>
              )}

              {(links.length > 0 || anexos.length > 0) && (
                <section className="apv-sec">
                  <h4>Design e ficheiros</h4>
                  {anexos.some((f) => f.url && ehImagem(f)) && (
                    <div className="apv-imgs">
                      {anexos.filter((f) => f.url && ehImagem(f)).map((f) => (
                        <a key={f.url} href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.nome || ""} loading="lazy" /></a>
                      ))}
                    </div>
                  )}
                  <div className="apv-links">
                    {links.map((l, i) => (
                      <a key={i} href={urlSegura(l.url)} target="_blank" rel="noreferrer noopener"><Ico.Link /> {l.label || l.url}</a>
                    ))}
                    {anexos.filter((f) => f.url && !ehImagem(f)).map((f) => (
                      <a key={f.url} href={f.url} target="_blank" rel="noreferrer"><Ico.Link /> {f.nome}</a>
                    ))}
                  </div>
                </section>
              )}

              {c.design_ideia && (
                <section className="apv-sec">
                  <h4>Ideia de design</h4>
                  <p className="apv-muted">{c.design_ideia}</p>
                </section>
              )}

              {c.briefing && (
                <details className="apv-sec apv-details">
                  <summary>Briefing</summary>
                  <p className="apv-muted">{c.briefing}</p>
                </details>
              )}

              {pendente && modo === "alteracoes" && (
                <section className="apv-sec apv-alt">
                  <h4>O que tem de mudar?</h4>
                  <textarea
                    ref={textoRef}
                    rows={4}
                    value={texto}
                    placeholder="Ex.: trocar a foto do slide 2, confirmar o preço, encurtar a legenda…"
                    onChange={(e) => setTexto(e.target.value)}
                  />
                </section>
              )}
            </>
          )}
          {erro && <div className="apv-error">{erro}</div>}
        </div>

        <footer className="apv-foot">
          {onAbrirNoMarketing && c && (
            <button type="button" className="apv-btn is-ghost" onClick={() => { onClose(); onAbrirNoMarketing(c.id); }} disabled={aGravar}>Abrir no Marketing</button>
          )}
          <span className="apv-spacer" />
          {c && pendente && (modo === "alteracoes" ? (
            <>
              <button type="button" className="apv-btn is-ghost" onClick={() => setModo(null)} disabled={aGravar}>Cancelar</button>
              <button type="button" className="apv-btn is-warn" onClick={() => decidir("alteracoes")} disabled={aGravar || !texto.trim()}>
                <Ico.Undo /> {aGravar ? "A enviar…" : "Enviar pedido de alterações"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="apv-btn is-warn-soft" onClick={() => setModo("alteracoes")} disabled={aGravar}><Ico.Undo /> Pedir alterações</button>
              <button type="button" className="apv-btn is-ok" onClick={() => decidir("aprovar")} disabled={aGravar}><Ico.Check /> {aGravar ? "A aprovar…" : "Aprovar"}</button>
            </>
          ))}
          {c && !pendente && <button type="button" className="apv-btn is-ghost" onClick={onClose}>Fechar</button>}
        </footer>
      </div>
    </div>,
    document.body
  );
}
