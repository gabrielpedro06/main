import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabase";
import { I } from "./mkIcons";
import { PersonaFace } from "./mkFields";
import { MarcaLogo } from "./MarcasModal";
import { canalInfo } from "../../constants/marketing";
import { norm, fmtData } from "./mkUtils";

const API = `${import.meta.env.VITE_MARKETING_API_BASE || ""}/api/marketing/ideias`;

// Conversas por marca, enquanto a página estiver aberta
const conversas = new Map();

const SUGESTOES = [
  "Dá-me 5 ideias para as próximas duas semanas",
  "Ideias para as datas comemorativas do próximo mês",
  "3 Reels curtos para a persona principal",
  "Ideias para a frente com menos conteúdos no fluxo",
  "Uma mini-série de 4 posts educativos",
];

/** Markdown muito simples: parágrafos, **negrito** e listas */
function TextoIA({ texto }) {
  const blocos = String(texto || "").trim().split(/\n{2,}/);
  const inline = (t, k) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={`${k}-${i}`}>{p.slice(2, -2)}</b> : p));
  return blocos.map((b, i) => {
    const linhas = b.split("\n");
    if (linhas.every((l) => /^\s*([-•*]|\d+\.)\s+/.test(l))) {
      return <ul key={i}>{linhas.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-•*]|\d+\.)\s+/, ""), `${i}-${j}`)}</li>)}</ul>;
    }
    return <p key={i}>{linhas.map((l, j) => <span key={j}>{inline(l, `${i}-${j}`)}{j < linhas.length - 1 && <br />}</span>)}</p>;
  });
}

function CartaoIdeia({ ideia, personas, guardada, onGuardar, aGuardar }) {
  const [aberta, setAberta] = useState(false);
  const pessoas = ideia.personas.map((n) => personas.find((p) => norm(p.nome_persona) === norm(n) || norm(p.papel) === norm(n))).filter(Boolean);
  return (
    <article className={`mk-ia-idea ${guardada ? "is-saved" : ""}`}>
      <div className="mk-ia-idea-top">
        {ideia.formato.slice(0, 2).map((f) => <span key={f} className="mk-fmt">{f}</span>)}
        {ideia.campanha && <span className="mk-camp"><I.Flag size={11} /> {ideia.campanha}</span>}
        <span className="mk-spacer" />
        {ideia.data_publicacao_sugerida && <span className="mk-date"><I.Calendar size={12} /> {fmtData(ideia.data_publicacao_sugerida, { hora: false })}</span>}
      </div>
      <h4>{ideia.tema || ideia.headline}</h4>
      {ideia.headline && ideia.headline !== ideia.tema && <p className="mk-ia-hook">“{ideia.headline}”</p>}
      <div className="mk-ia-idea-meta">
        <span className="mk-canais">{ideia.canais.map((c) => { const ci = canalInfo(c); return <b key={c} style={{ background: ci.cor }} title={c}>{ci.sigla}</b>; })}</span>
        {pessoas.length > 0 && <span className="mk-pstack" title={pessoas.map((p) => p.nome_persona).join(", ")}>{pessoas.map((p) => <PersonaFace key={p.id} persona={p} size={20} />)}</span>}
        {ideia.estrategia[0] && <span className="mk-ia-tag">{ideia.estrategia.join(" · ")}</span>}
        {ideia.frente && <span className="mk-ia-tag is-brand">{ideia.frente}</span>}
      </div>
      {aberta && (
        <div className="mk-ia-idea-body">
          {ideia.conceito && <section><small>Conceito criativo</small><p>{ideia.conceito}</p></section>}
          {ideia.copy && <section><small>Copy</small><p className="mk-ia-copy">{ideia.copy}</p></section>}
          {ideia.copy_2 && <section><small>Variação</small><p className="mk-ia-copy">{ideia.copy_2}</p></section>}
          {(ideia.cta || ideia.cta_2) && <section><small>CTA</small><p>{[ideia.cta, ideia.cta_2].filter(Boolean).join(" · ")}</p></section>}
          {ideia.hashtags.length > 0 && <section><small>Hashtags</small><p>{ideia.hashtags.join(" ")}</p></section>}
          {ideia.design_ideia && <section><small>Ideia de design</small><p>{ideia.design_ideia}</p></section>}
          {ideia.briefing && <section className="is-brief"><small>Briefing / a confirmar</small><p>{ideia.briefing}</p></section>}
        </div>
      )}
      <footer>
        <button type="button" className="mk-btn is-ghost is-sm" onClick={() => setAberta((v) => !v)}>{aberta ? "Esconder detalhes" : "Ver copy e detalhes"}</button>
        <span className="mk-spacer" />
        {guardada ? (
          <span className="mk-ia-saved"><I.Check size={14} /> No Banco de Ideias</span>
        ) : (
          <button type="button" className="mk-btn is-soft is-sm" onClick={onGuardar} disabled={aGuardar}><I.Bulb size={14} /> Guardar</button>
        )}
      </footer>
    </article>
  );
}

/** Ideia proposta pelo Claude → linha de marketing_conteudos (estado "ideia") */
function ideiaParaConteudo(ideia, personas, marca) {
  const personaIds = ideia.personas
    .map((n) => personas.find((p) => norm(p.nome_persona) === norm(n) || norm(p.papel) === norm(n))?.id)
    .filter(Boolean);
  const data = /^\d{4}-\d{2}-\d{2}$/.test(ideia.data_publicacao_sugerida) ? new Date(`${ideia.data_publicacao_sugerida}T10:00:00`).toISOString() : null;
  const copies = [ideia.copy && { titulo: "Principal", texto: ideia.copy }, ideia.copy_2 && { titulo: "Variação", texto: ideia.copy_2 }].filter(Boolean);
  return {
    estado: "ideia",
    titulo: (ideia.tema || ideia.headline).slice(0, 300),
    headline: ideia.headline || null,
    persona_ids: [...new Set(personaIds)],
    canais: ideia.canais,
    formato: ideia.formato,
    objetivo: ideia.objetivo,
    estrategia: ideia.estrategia,
    editoria: ideia.editorias,
    pilar: ideia.pilares,
    frente: ideia.frente || null,
    campanha: ideia.campanha || null,
    conceito: ideia.conceito || null,
    design_ideia: ideia.design_ideia || null,
    copies,
    cta: ideia.cta || null,
    cta_2: ideia.cta_2 || null,
    hashtags: ideia.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)),
    metrica_principal: ideia.metrica_principal || null,
    briefing: ideia.briefing || null,
    data_publicacao: data,
    notas: `Proposta pelo assistente de ideias (Claude) para a ${marca.nome} em ${new Date().toLocaleDateString("pt-PT")}.`,
  };
}

export default function AssistenteIdeias({ marca, personas, onGuardar, onClose }) {
  const guardado = conversas.get(marca.id);
  const [historico, setHistorico] = useState(guardado?.historico || []);
  const [turnos, setTurnos] = useState(guardado?.turnos || []);
  const [pesquisaWeb, setPesquisaWeb] = useState(guardado?.pesquisaWeb ?? true);
  const [custo, setCusto] = useState(guardado?.custo || 0);
  const [texto, setTexto] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [guardadasPorNotar, setGuardadasPorNotar] = useState(guardado?.guardadasPorNotar || []);
  const listaRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Guarda a conversa desta marca enquanto a página estiver aberta
  useEffect(() => {
    conversas.set(marca.id, { historico, turnos, pesquisaWeb, custo, guardadasPorNotar });
  }, [marca.id, historico, turnos, pesquisaWeb, custo, guardadasPorNotar]);

  useLayoutEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turnos]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !aEnviar) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, aEnviar]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Altera a última resposta do assistente */
  const mexerUltima = (fn) => setTurnos((prev) => {
    const copia = prev.slice();
    const i = copia.length - 1;
    if (i < 0 || copia[i].tipo !== "assistente") return prev;
    copia[i] = fn({ ...copia[i], partes: copia[i].partes.slice() });
    return copia;
  });

  const enviar = async (msg) => {
    const t = String(msg ?? texto).trim();
    if (!t || aEnviar) return;
    setTexto("");
    setAEnviar(true);
    // Diz ao Claude o que a equipa já guardou desde a última mensagem
    const nota = guardadasPorNotar.length ? `(Nota: a equipa guardou no Banco de Ideias: ${guardadasPorNotar.map((x) => `"${x}"`).join(", ")}.)\n\n` : "";
    setGuardadasPorNotar([]);
    setTurnos((prev) => [...prev, { tipo: "user", texto: t }, { tipo: "assistente", partes: [], aCorrer: true }]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ marcaId: marca.id, historico, mensagem: nota + t, pesquisaWeb }),
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) {
        const erro = await resp.json().catch(() => ({}));
        throw new Error(erro.error || `Erro ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const linha = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!linha.startsWith("data:")) continue;
          let ev;
          try { ev = JSON.parse(linha.slice(5)); } catch { continue; }
          if (ev.type === "text") {
            mexerUltima((u) => {
              const ult = u.partes[u.partes.length - 1];
              if (ult?.tipo === "texto") u.partes[u.partes.length - 1] = { ...ult, texto: ult.texto + ev.delta };
              else u.partes.push({ tipo: "texto", texto: ev.delta });
              return u;
            });
          } else if (ev.type === "pesquisa") {
            mexerUltima((u) => { u.partes.push({ tipo: "pesquisa", query: ev.query }); return u; });
          } else if (ev.type === "estado") {
            mexerUltima((u) => ({ ...u, estado: ev.texto }));
          } else if (ev.type === "ideias") {
            mexerUltima((u) => { u.partes.push({ tipo: "ideias", ideias: ev.ideias, guardadas: [] }); return { ...u, estado: null }; });
          } else if (ev.type === "erro") {
            mexerUltima((u) => { u.partes.push({ tipo: "erro", texto: ev.texto }); return u; });
          } else if (ev.type === "fim") {
            setHistorico((h) => [...h, ...ev.novas]);
            setCusto((c) => c + (ev.uso?.custo_usd || 0));
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") mexerUltima((u) => { u.partes.push({ tipo: "erro", texto: e.message || "Falhou a ligação ao assistente." }); return u; });
    } finally {
      mexerUltima((u) => ({ ...u, aCorrer: false, estado: null }));
      setAEnviar(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const guardar = async (iTurno, iParte, indices) => {
    const parte = turnos[iTurno]?.partes[iParte];
    if (!parte) return;
    const escolhidas = indices.filter((i) => !parte.guardadas.includes(i));
    if (!escolhidas.length) return;
    setAGuardar(true);
    const n = await onGuardar(escolhidas.map((i) => ideiaParaConteudo(parte.ideias[i], personas, marca)));
    setAGuardar(false);
    if (!n) return;
    setTurnos((prev) => prev.map((t, ti) => (ti !== iTurno ? t : {
      ...t,
      partes: t.partes.map((p, pi) => (pi !== iParte ? p : { ...p, guardadas: [...p.guardadas, ...escolhidas] })),
    })));
    setGuardadasPorNotar((prev) => [...prev, ...escolhidas.map((i) => parte.ideias[i].tema || parte.ideias[i].headline)]);
  };

  const novaConversa = () => {
    abortRef.current?.abort();
    setHistorico([]);
    setTurnos([]);
    setCusto(0);
    setGuardadasPorNotar([]);
    conversas.delete(marca.id);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const vazia = turnos.length === 0;

  return (
    <div className="mk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !aEnviar) onClose(); }}>
      <aside className="mk-drawer mk-ia" style={{ "--brand": marca.cor }} role="dialog" aria-label="Assistente de ideias">
        <header className="mk-ia-head">
          <div className="mk-ia-head-bg" />
          <span className="mk-ia-avatar"><I.Sparkle size={22} /></span>
          <div className="mk-ia-head-txt">
            <h3>Assistente de ideias</h3>
            <p><MarcaLogo marca={marca} size={16} /> {marca.nome} · Claude</p>
          </div>
          <span className="mk-spacer" />
          {!vazia && <button type="button" className="mk-hero-btn" onClick={novaConversa} disabled={aEnviar}><I.Plus size={14} /> Nova conversa</button>}
          <button type="button" className="mk-dclose" onClick={onClose} aria-label="Fechar" disabled={aEnviar}><I.X size={18} /></button>
        </header>

        <div className="mk-ia-list" ref={listaRef}>
          {vazia ? (
            <div className="mk-ia-welcome">
              <span className="mk-ia-welcome-ico"><I.Bulb size={30} /></span>
              <h4>Que ideias procuramos hoje?</h4>
              <p>O assistente já conhece o guia da {marca.nome}, as personas, a estratégia ativa e o que já está no Banco de Ideias e no fluxo. As ideias chegam em cartões — guarde as que gostar.</p>
              <div className="mk-ia-sugs">
                {SUGESTOES.map((s) => <button key={s} type="button" onClick={() => enviar(s)}>{s}</button>)}
              </div>
              <label className="mk-ia-web">
                <input type="checkbox" checked={pesquisaWeb} onChange={(e) => setPesquisaWeb(e.target.checked)} />
                <span><b>Pesquisar na web</b> datas, notícias e alterações legais para ideias mais atuais</span>
              </label>
            </div>
          ) : turnos.map((t, ti) => (t.tipo === "user" ? (
            <div key={ti} className="mk-ia-msg is-user"><p>{t.texto}</p></div>
          ) : (
            <div key={ti} className="mk-ia-msg is-ai">
              {t.partes.map((p, pi) => {
                if (p.tipo === "texto") return <div key={pi} className="mk-ia-text"><TextoIA texto={p.texto} /></div>;
                if (p.tipo === "pesquisa") return <span key={pi} className="mk-ia-search"><I.Search size={12} /> Pesquisou: {p.query}</span>;
                if (p.tipo === "erro") return <p key={pi} className="mk-bm-error"><I.Alert size={14} /> {p.texto}</p>;
                if (p.tipo === "ideias") {
                  const porGuardar = p.ideias.map((_, i) => i).filter((i) => !p.guardadas.includes(i));
                  return (
                    <div key={pi} className="mk-ia-ideas">
                      <div className="mk-ia-ideas-head">
                        <b>{p.ideias.length} ideia{p.ideias.length === 1 ? "" : "s"}</b>
                        <span className="mk-spacer" />
                        {porGuardar.length > 0
                          ? <button type="button" className="mk-btn is-primary is-sm" disabled={aGuardar} onClick={() => guardar(ti, pi, porGuardar)}><I.Bulb size={14} /> Guardar {porGuardar.length === p.ideias.length ? "todas" : `as ${porGuardar.length} restantes`}</button>
                          : <span className="mk-ia-saved"><I.Check size={14} /> Todas guardadas</span>}
                      </div>
                      {p.ideias.map((ideia, i) => (
                        <CartaoIdeia key={i} ideia={ideia} personas={personas} guardada={p.guardadas.includes(i)} aGuardar={aGuardar} onGuardar={() => guardar(ti, pi, [i])} />
                      ))}
                    </div>
                  );
                }
                return null;
              })}
              {t.aCorrer && <span className="mk-ia-typing"><i /><i /><i /> {t.estado || (t.partes.length ? "" : "A pensar…")}</span>}
            </div>
          )))}
        </div>

        <form className="mk-ia-input" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
          <textarea
            ref={inputRef}
            value={texto}
            rows={1}
            placeholder={vazia ? "Ex.: ideias para o Dia do Formador, a pensar no João…" : "Peça mais ideias ou ajustes (ex.: “torna a 2 mais curta”)"}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            disabled={aEnviar}
            autoFocus
          />
          <button type="submit" className="mk-ia-send" disabled={aEnviar || !texto.trim()} aria-label="Enviar">
            {aEnviar ? <span className="mk-spinner" /> : <I.ArrowRight size={18} sw={2.5} />}
          </button>
        </form>
        <p className="mk-ia-foot">
          {pesquisaWeb ? "Com pesquisa na web" : "Sem pesquisa na web"}
          {!vazia && " (fixo nesta conversa)"} · as ideias são propostas — confirme factos e datas antes de publicar
          {custo > 0 && ` · custo desta conversa ≈ ${custo.toLocaleString("pt-PT", { style: "currency", currency: "USD", maximumFractionDigits: 3 })}`}
        </p>
      </aside>
    </div>
  );
}
