import { useMemo, useRef, useState } from "react";
import FancySelect from "../FancySelect";
import { I } from "./mkIcons";
import { AutoText, Field, ListaEditor, PersonaFace } from "./mkFields";
import { diaKey, diasAte, fmtData, urlSegura } from "./mkUtils";
import {
  SECCOES_ESTRATEGIA, ESTADOS_RESULTADO, ETAPAS_FUNIL, etapasDoConteudo,
  dadosNovoCiclo, dadosDuplicados, trimestreSugerido, frentesDoCiclo,
} from "./estrategiaModelo";

const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const vazio = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0);
const estadoInfo = (id) => ESTADOS_RESULTADO.find((e) => e.id === id) || null;

/** Conteúdo pertence ao período do ciclo? (data de publicação, ou criação se não tiver) */
function noCiclo(c, ciclo) {
  if (!ciclo?.inicio && !ciclo?.fim) return true;
  const d = diaKey(new Date(c.data_publicacao || c.created_at));
  return (!ciclo.inicio || d >= ciclo.inicio) && (!ciclo.fim || d <= ciclo.fim);
}

/* =========================================================================
   Peças de leitura
   ========================================================================= */
function EstadoPill({ id }) {
  const e = estadoInfo(id);
  if (!e) return null;
  return <span className="mk-e-state" style={{ "--c": e.cor }}><i />{e.label}</span>;
}

function Faces({ ids, ctx, nomes = false }) {
  const lista = (ids || []).map((id) => ctx.personaPorId[id]).filter(Boolean);
  if (!lista.length) return null;
  return (
    <span className={`mk-e-faces ${nomes ? "with-names" : ""}`}>
      {lista.map((p) => <span key={p.id} title={`${p.nome_persona} · ${p.papel}`}><PersonaFace persona={p} size={20} />{nomes && p.nome_persona}</span>)}
    </span>
  );
}

function Celula({ c, v, ctx, linha }) {
  if (vazio(v)) return c.dica && linha?.dica ? <span className="mk-e-hint">{linha.dica}</span> : <span className="mk-nil">—</span>;
  if (c.tipo === "personas") return <Faces ids={v} ctx={ctx} nomes />;
  if (c.tipo === "persona") return <Faces ids={[v]} ctx={ctx} nomes />;
  if (c.tipo === "estado") return <EstadoPill id={v} />;
  if (c.tipo === "data") return fmtData(v, { hora: false });
  if (c.tipo === "link") { const href = urlSegura(v); return href ? <a href={href} target="_blank" rel="noreferrer">{v}</a> : v; }
  if (c.tipo === "num") return <b className="mk-e-num">{Number(v).toLocaleString("pt-PT")}</b>;
  return <span className="mk-e-txt">{v}</span>;
}

/** Tabela genérica: esconde colunas vazias; a 1.ª coluna fica sempre */
function TabelaVista({ bloco, linhas, ctx }) {
  if (!linhas.length) return <p className="mk-e-empty">Sem linhas.</p>;
  const cols = bloco.colunas.filter((c, i) => i === 0 || linhas.some((l) => !vazio(l[c.k]) || (c.dica && l.dica)));
  return (
    <div className="mk-e-table-wrap">
      <table className="mk-e-table">
        <thead><tr>{cols.map((c) => <th key={c.k} className={c.resultado ? "is-result" : ""}>{c.label}</th>)}</tr></thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              {cols.map((c, j) => <td key={c.k} className={`${j === 0 ? "is-first" : ""} ${c.resultado ? "is-result" : ""}`}><Celula c={c} v={l[c.k]} ctx={ctx} linha={l} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ObjetivosVista({ linhas, ctx }) {
  if (!linhas.length) return <p className="mk-e-empty">Ainda sem objetivos.</p>;
  return (
    <div className="mk-e-objs">
      {linhas.map((o, i) => {
        const n = o.frente ? ctx.conteudosNoCiclo.filter((c) => c.frente === o.frente).length : 0;
        return (
          <article key={i} className="mk-e-obj">
            <header>
              <span className="mk-e-obj-n">{i + 1}</span>
              {o.frente && <span className="mk-e-frente">{o.frente}</span>}
              <span className="mk-spacer" />
              <EstadoPill id={o.estado} />
            </header>
            {o.negocio && <h4>{o.negocio}</h4>}
            {o.comunicacao && <p>{o.comunicacao}</p>}
            <dl>
              {[["KPI", o.kpi], ["Meta", o.meta], ["Investimento", o.investimento], ["Prazo", o.prazo]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            {(o.esperado || o.evidencia) && (
              <div className="mk-e-res">
                {o.esperado && <span><small>Esperado</small>{o.esperado}</span>}
                {o.evidencia && <span className="is-real"><small>Obtido</small>{o.evidencia}</span>}
              </div>
            )}
            {o.frente && <footer><I.Board size={13} /> {n} conteúdo{n === 1 ? "" : "s"} nesta frente no ciclo</footer>}
          </article>
        );
      })}
    </div>
  );
}

function JornadasVista({ linhas, ctx }) {
  if (!linhas.length) return <p className="mk-e-empty">Ainda sem jornadas. Até 3 personas costuma chegar.</p>;
  const passos = [["descobre", "descobre-nos em"], ["aprofunda", "aprofunda em"], ["decide", "decide depois de"], ["mantem", "mantém-se por"]];
  return (
    <div className="mk-e-journeys">
      {linhas.map((j, i) => {
        const p = ctx.personaPorId[j.persona];
        return (
          <div key={i} className="mk-e-journey">
            <div className="mk-e-journey-who">{p ? <><PersonaFace persona={p} size={30} /><b>{p.nome_persona}</b><small>{p.papel}</small></> : <b>Persona por definir</b>}</div>
            <ol>
              {passos.map(([k, label]) => <li key={k} className={j[k] ? "" : "is-empty"}><small>{label}</small>{j[k] || "…"}</li>)}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

function FunilVista({ linhas, ctx }) {
  if (!linhas.length) return <p className="mk-e-empty">Ainda sem etapas. Em “Editar”, use “Gerar etapas para cada frente”.</p>;
  const frentes = [...new Set(linhas.map((l) => l.frente || "Geral"))];
  const total = ctx.conteudosNoCiclo.length;
  return (
    <div className="mk-e-funnels">
      {frentes.map((f) => {
        const daFrente = linhas.filter((l) => (l.frente || "Geral") === f);
        return (
          <div key={f} className="mk-e-funnel">
            <h5><span className="mk-e-frente">{f}</span></h5>
            <div className="mk-e-funnel-lane">
              {ETAPAS_FUNIL.map((et, ei) => {
                const l = daFrente.find((x) => x.etapa === et);
                const reais = ctx.conteudosNoCiclo.filter((c) => (f === "Geral" ? true : c.frente === f) && etapasDoConteudo(c.estrategia).includes(et)).length;
                const pctReal = total ? Math.round((reais / total) * 100) : 0;
                const plan = l?.pct != null ? Number(l.pct) : null;
                const tom = plan == null ? "" : pctReal >= plan * 0.8 ? "is-ok" : pctReal >= plan * 0.5 ? "is-mid" : "is-low";
                return (
                  <div key={et} className={`mk-e-stage ${l ? "" : "is-missing"}`} style={{ "--w": `${100 - ei * 7}%` }}>
                    <small>{et}</small>
                    {l ? (
                      <>
                        <Faces ids={l.personas} ctx={ctx} />
                        {l.precisa && <p>{l.precisa}</p>}
                        {(l.canais || l.formatos) && <span className="mk-e-stage-meta">{[l.canais, l.formatos].filter(Boolean).join(" · ")}</span>}
                        {l.cta && <span className="mk-e-cta">{l.cta}</span>}
                        {l.frequencia && <span className="mk-e-stage-meta">{l.frequencia}</span>}
                        <div className={`mk-e-plan ${tom}`} title="Planeado vs. conteúdos reais do fluxo nesta frente e etapa">
                          <span>Plan. {plan != null ? `${plan}%` : "—"}</span>
                          <span className="mk-e-plan-bar"><i style={{ width: `${Math.min(100, plan || 0)}%` }} /><b style={{ width: `${Math.min(100, pctReal)}%` }} /></span>
                          <span>Real {pctReal}% <em>({reais})</em></span>
                        </div>
                        <EstadoPill id={l.estado} />
                      </>
                    ) : <p className="mk-e-empty">Sem plano para esta etapa.</p>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="mk-e-legend"><i className="is-plan" /> planeado (% do calendário) <i className="is-real" /> real (conteúdos do fluxo no período, pela frente e pela etapa do funil)</p>
    </div>
  );
}

function MarcosVista({ linhas }) {
  if (!linhas.length) return <p className="mk-e-empty">Sem pontos de controlo. Aparecem também no Calendário.</p>;
  const ord = [...linhas].sort((a, b) => String(a.data || "9").localeCompare(String(b.data || "9")));
  return (
    <ol className="mk-e-marcos">
      {ord.map((m, i) => {
        const n = m.data ? diasAte(m.data) : null;
        return (
          <li key={i} className={n != null && n < 0 ? "is-past" : n != null && n <= 7 ? "is-soon" : ""}>
            <span className="mk-e-marco-date">{m.data ? fmtData(m.data, { hora: false }) : "sem data"}</span>
            <div>
              <b>{m.titulo || "Ponto de controlo"}</b>
              {n != null && <small>{n < 0 ? `há ${-n} dia${n === -1 ? "" : "s"}` : n === 0 ? "hoje" : `daqui a ${n} dia${n === 1 ? "" : "s"}`}</small>}
              {m.notas && <p>{m.notas}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Gerador de links com UTM (convenção: minúsculas e underscores) */
function UtmBuilder() {
  const [u, setU] = useState({ url: "", source: "instagram", medium: "social_organico", campaign: "", content: "" });
  const [ok, setOk] = useState(false);
  const limpar = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  let link = "";
  const base = urlSegura(u.url);
  if (base) {
    try {
      const url = new URL(base);
      for (const k of ["source", "medium", "campaign", "content"]) if (limpar(u[k])) url.searchParams.set(`utm_${k}`, limpar(u[k]));
      link = url.toString();
    } catch { link = ""; }
  }
  const set = (k) => (e) => setU((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="mk-utm">
      <h5><I.Link size={14} /> Gerador de UTM</h5>
      <div className="mk-utm-grid">
        <input className="mk-input" placeholder="https://site.pt/pagina" value={u.url} onChange={set("url")} />
        <input className="mk-input" placeholder="source (ex.: instagram)" value={u.source} onChange={set("source")} />
        <select className="mk-input" value={u.medium} onChange={set("medium")}>
          {["social_organico", "social_pago", "email", "cpc", "referral", "qr"].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input className="mk-input" placeholder="campaign (frente_tema_data)" value={u.campaign} onChange={set("campaign")} />
        <input className="mk-input" placeholder="content (ex.: carrossel_x)" value={u.content} onChange={set("content")} />
      </div>
      {link && (
        <div className="mk-utm-out">
          <code>{link}</code>
          <button type="button" className="mk-btn is-soft is-sm" onClick={() => navigator.clipboard?.writeText(link).then(() => { setOk(true); setTimeout(() => setOk(false), 1200); }).catch(() => {})}>
            {ok ? <><I.Check size={13} /> Copiado</> : <><I.Copy size={13} /> Copiar</>}
          </button>
        </div>
      )}
    </div>
  );
}

const VISTAS = { objetivos: ObjetivosVista, jornadas: JornadasVista, funil: FunilVista, marcos: MarcosVista };

/* =========================================================================
   Janela de ciclo (novo / editar / duplicar)
   ========================================================================= */
function CicloModal({ modo, inicial, onClose, onConfirmar }) {
  const [f, setF] = useState(inicial);
  const [aGuardar, setAGuardar] = useState(false);
  const titulo = modo === "novo" ? "Novo ciclo" : modo === "duplicar" ? "Duplicar ciclo" : "Editar ciclo";
  const valido = f.nome.trim() && (!f.inicio || !f.fim || f.fim >= f.inicio);
  return (
    <div className="mk-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="mk-modal mk-e-modal" onSubmit={async (e) => { e.preventDefault(); if (!valido) return; setAGuardar(true); await onConfirmar(f); setAGuardar(false); }}>
        <div className="mk-modal-head">
          <div>
            <h3>{titulo}</h3>
            <p>{modo === "duplicar" ? "Copia objetivos, posicionamento, narrativas, funil e táticas. Resultados, desempenho e pontos de controlo começam vazios." : modo === "novo" ? "Um plano para um período — normalmente um trimestre. Começa com as tabelas do modelo prontas a preencher." : "Nome e período do ciclo."}</p>
          </div>
          <button type="button" className="mk-icon-btn" onClick={onClose} aria-label="Fechar"><I.X size={18} /></button>
        </div>
        <Field label="Nome"><input className="mk-input" autoFocus value={f.nome} onChange={(e) => setF((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex.: Nov 2026 – Jan 2027" /></Field>
        <div className="mk-grid">
          <Field label="Início"><input type="date" className="mk-input" value={f.inicio || ""} onChange={(e) => setF((p) => ({ ...p, inicio: e.target.value }))} /></Field>
          <Field label="Fim"><input type="date" className="mk-input" value={f.fim || ""} onChange={(e) => setF((p) => ({ ...p, fim: e.target.value }))} /></Field>
        </div>
        {f.inicio && f.fim && f.fim < f.inicio && <p className="mk-bm-error"><I.Alert size={14} /> O fim tem de ser depois do início.</p>}
        <div className="mk-bm-foot">
          <span className="mk-spacer" />
          <button type="button" className="mk-btn is-ghost is-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" className="mk-btn is-primary is-sm" disabled={!valido || aGuardar}>{aGuardar ? "A guardar…" : modo === "editar" ? "Guardar" : "Criar ciclo"}</button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================================
   Separador "Estratégia"
   ========================================================================= */
export default function Estrategia({ marca, ciclos, personas, conteudos, onCriar, onPatch, onEliminar, avisar }) {
  const hoje = diaKey(new Date());
  const padrao = ciclos.find((c) => (!c.inicio || c.inicio <= hoje) && (!c.fim || c.fim >= hoje)) || ciclos[0] || null;
  const [cicloId, setCicloId] = useState(padrao?.id || null);
  const ciclo = ciclos.find((c) => c.id === cicloId) || padrao;
  const [editar, setEditar] = useState(null);
  const [draft, setDraft] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [modal, setModal] = useState(null); // { modo, inicial }
  const [confirmDel, setConfirmDel] = useState(false);
  const refs = useRef({});

  const personaPorId = useMemo(() => Object.fromEntries(personas.map((p) => [p.id, p])), [personas]);
  const conteudosNoCiclo = useMemo(
    () => (ciclo ? conteudos.filter((c) => c.estado !== "ideia" && c.estado !== "arquivado" && noCiclo(c, ciclo)) : []),
    [conteudos, ciclo],
  );
  const dados = useMemo(() => ciclo?.dados || {}, [ciclo]);
  const frentes = frentesDoCiclo(ciclo);
  const ctx = { personas, personaPorId, frentes, estados: ESTADOS_RESULTADO, conteudosNoCiclo };

  // Resumo de resultados (todas as linhas com estado)
  const resumo = useMemo(() => {
    const out = { atingido: 0, parcial: 0, falhado: 0 };
    for (const s of Object.values(dados)) for (const b of Object.values(s || {})) if (Array.isArray(b)) for (const l of b) if (out[l?.estado] != null) out[l.estado]++;
    return out;
  }, [dados]);
  const proxMarco = useMemo(() => {
    const ms = (dados.analise?.marcos || []).filter((m) => m.data && m.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
    return ms[0] || null;
  }, [dados, hoje]);
  const progresso = useMemo(() => {
    if (!ciclo?.inicio || !ciclo?.fim) return null;
    const a = new Date(`${ciclo.inicio}T00:00:00`), b = new Date(`${ciclo.fim}T23:59:59`), n = new Date();
    return Math.max(0, Math.min(100, Math.round(((n - a) / (b - a)) * 100)));
  }, [ciclo]);

  const abrirEdicao = (id) => { setEditar(id); setDraft(JSON.parse(JSON.stringify(dados[id] || {}))); };
  const guardar = async () => {
    setAGuardar(true);
    const ok = await onPatch(ciclo.id, { dados: { ...dados, [editar]: draft } });
    setAGuardar(false);
    if (ok) { setEditar(null); setDraft(null); }
  };

  const confirmarModal = async (f) => {
    const campos = { nome: f.nome.trim(), inicio: f.inicio || null, fim: f.fim || null };
    if (modal.modo === "editar") {
      if (await onPatch(ciclo.id, campos)) setModal(null);
      return;
    }
    const novo = await onCriar({ ...campos, dados: modal.modo === "duplicar" ? dadosDuplicados(dados) : dadosNovoCiclo() });
    if (novo) { setCicloId(novo.id); setModal(null); avisar(modal.modo === "duplicar" ? "Ciclo duplicado." : "Ciclo criado."); }
  };

  const importarDesempenho = () => {
    const atuais = draft?.desempenho || [];
    const chave = (r) => `${r.tema}|${r.data}|${r.metrica}`;
    const existentes = new Set(atuais.map(chave));
    const novos = conteudosNoCiclo
      .filter((c) => c.resultado != null && c.resultado !== "")
      .map((c) => {
        const d = c.data_publicacao ? new Date(c.data_publicacao) : null;
        return {
          canal: (c.canais || [])[0] || "",
          metrica: c.metrica_principal || "",
          resultado: Number(c.resultado),
          tema: c.titulo || "",
          formato: (Array.isArray(c.formato) ? c.formato : c.formato ? [c.formato] : []).join(", "),
          dia_semana: d ? DIAS[d.getDay()] : "",
          data: d ? diaKey(d) : "",
          horario: d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "",
        };
      })
      .filter((r) => !existentes.has(chave(r)));
    if (!novos.length) { avisar("Não há resultados novos nos conteúdos deste ciclo (registe-os em Resultados, no conteúdo).", "error"); return; }
    setDraft((p) => ({ ...p, desempenho: [...atuais, ...novos] }));
    avisar(`${novos.length} resultado${novos.length === 1 ? "" : "s"} importado${novos.length === 1 ? "" : "s"} — falta guardar.`);
  };

  const gerarEtapas = () => {
    const atuais = draft?.etapas || [];
    const lista = frentes.length ? frentes : ["Geral"];
    const novas = [];
    for (const f of lista) for (const et of ETAPAS_FUNIL) if (!atuais.some((l) => (l.frente || "Geral") === f && l.etapa === et)) novas.push({ etapa: et, frente: f === "Geral" ? null : f });
    if (!novas.length) { avisar("Já existe uma etapa para cada frente.", "error"); return; }
    setDraft((p) => ({ ...p, etapas: [...atuais, ...novas] }));
  };

  /* ---------- sem ciclos ---------- */
  if (!ciclo) {
    return (
      <div className="mk-empty">
        <I.Target size={34} />
        <h3>A {marca.nome} ainda não tem estratégia</h3>
        <p>Cada ciclo (normalmente um trimestre) tem objetivos, posicionamento, narrativas, funil, analytics e a análise final — o modelo do guia de estratégia, pronto a preencher.</p>
        <button type="button" className="mk-btn is-primary" onClick={() => setModal({ modo: "novo", inicial: trimestreSugerido() })}><I.Plus size={15} /> Criar primeiro ciclo</button>
        {modal && <CicloModal modo={modal.modo} inicial={modal.inicial} onClose={() => setModal(null)} onConfirmar={confirmarModal} />}
      </div>
    );
  }

  const preenchida = (s) => s.blocos.some((b) => {
    const v = dados[s.id]?.[b.k];
    if (b.tipo === "texto") return !vazio(v);
    return Array.isArray(v) && v.some((l) => Object.entries(l).some(([k, x]) => !["dica", "campo", "narrativa", "item", "tipo", "etapa", "frente"].includes(k) && !vazio(x)));
  });

  return (
    <div className="mk-guia mk-estr">
      <aside className="mk-guia-nav">
        {SECCOES_ESTRATEGIA.map((s) => {
          const Ico = I[s.icon] || I.Target;
          return (
            <button key={s.id} type="button" onClick={() => refs.current[s.id]?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <Ico size={15} /> <span className="mk-e-nav-n">{s.n}</span> {s.titulo.split(" — ")[0]}
              <i className={preenchida(s) ? "is-ok" : ""} />
            </button>
          );
        })}
      </aside>

      <div className="mk-guia-main">
        <header className="mk-guia-hero mk-e-hero" style={{ "--brand": marca.cor }}>
          <div className="mk-guia-hero-bg" />
          <div className="mk-guia-hero-txt">
            <small>Estratégia · ciclo</small>
            <div className="mk-e-hero-sel">
              <FancySelect
                value={ciclo.id}
                onChange={(v) => { setCicloId(v); setEditar(null); setDraft(null); }}
                options={ciclos.map((c) => ({ value: c.id, label: c.nome || "Sem nome", hint: [c.inicio && fmtData(c.inicio, { hora: false }), c.fim && fmtData(c.fim, { hora: false })].filter(Boolean).join(" – ") }))}
                menuWidth={300}
              />
            </div>
            <p>{ciclo.inicio || ciclo.fim ? `${ciclo.inicio ? fmtData(ciclo.inicio, { hora: false }) : "…"} – ${ciclo.fim ? fmtData(ciclo.fim, { hora: false }) : "…"}` : "Sem período definido"} · {conteudosNoCiclo.length} conteúdo{conteudosNoCiclo.length === 1 ? "" : "s"} no período</p>
            {progresso != null && <span className="mk-e-progress" title={`${progresso}% do ciclo decorrido`}><i style={{ width: `${progresso}%` }} /></span>}
          </div>
          <div className="mk-e-hero-side">
            <div className="mk-e-hero-stats">
              {ESTADOS_RESULTADO.map((e) => <span key={e.id} style={{ "--c": e.cor }}><b>{resumo[e.id]}</b>{e.label.toLowerCase()}</span>)}
            </div>
            {proxMarco && <span className="mk-e-next"><I.Flag size={13} /> {proxMarco.titulo || "Ponto de controlo"} · {fmtData(proxMarco.data, { hora: false })}</span>}
            <div className="mk-e-hero-actions">
              <button type="button" className="mk-hero-btn" onClick={() => setModal({ modo: "editar", inicial: { nome: ciclo.nome, inicio: ciclo.inicio, fim: ciclo.fim } })}><I.Pen size={14} /> Editar</button>
              <button type="button" className="mk-hero-btn" onClick={() => {
                const prox = ciclo.fim ? trimestreSugerido(new Date(new Date(`${ciclo.fim}T00:00:00`).getTime() + 86400000)) : trimestreSugerido();
                setModal({ modo: "duplicar", inicial: prox });
              }}><I.Copy size={14} /> Duplicar</button>
              <button type="button" className="mk-cta" onClick={() => setModal({ modo: "novo", inicial: trimestreSugerido() })}><I.Plus size={14} /> Novo ciclo</button>
            </div>
          </div>
        </header>

        {SECCOES_ESTRATEGIA.map((s) => {
          const emEdicao = editar === s.id;
          const Ico = I[s.icon] || I.Target;
          const sec = emEdicao ? draft : (dados[s.id] || {});
          return (
            <section key={s.id} className={`mk-g-sec ${emEdicao ? "is-editing" : ""}`} ref={(el) => { refs.current[s.id] = el; }}>
              <header className="mk-g-sec-head">
                <span className="mk-g-sec-ico"><Ico size={17} /></span>
                <div className="mk-e-sec-title">
                  <h3><span>{s.n}.</span> {s.titulo}</h3>
                  <p>{s.dica}</p>
                </div>
                <span className="mk-spacer" />
                {!emEdicao ? (
                  <button type="button" className="mk-btn is-ghost is-sm" onClick={() => abrirEdicao(s.id)} disabled={!!editar}><I.Pen size={13} /> Editar</button>
                ) : (
                  <>
                    <button type="button" className="mk-btn is-ghost is-sm" onClick={() => { setEditar(null); setDraft(null); }}>Cancelar</button>
                    <button type="button" className="mk-btn is-primary is-sm" onClick={guardar} disabled={aGuardar}><I.Check size={13} /> {aGuardar ? "A guardar…" : "Guardar"}</button>
                  </>
                )}
              </header>

              <div className="mk-g-stack">
                {s.blocos.map((b) => {
                  const valor = sec?.[b.k];
                  if (b.tipo === "texto") {
                    return (
                      <div key={b.k}>
                        <h4 className="mk-g-h">{b.label}</h4>
                        {emEdicao
                          ? <AutoText rows={3} value={valor} onChange={(v) => setDraft((p) => ({ ...p, [b.k]: v }))} />
                          : vazio(valor) ? <p className="mk-e-empty">Por preencher.</p> : <p className="mk-e-para">{valor}</p>}
                      </div>
                    );
                  }
                  const linhas = Array.isArray(valor) ? valor : [];
                  const Vista = VISTAS[b.vista];
                  return (
                    <div key={b.k}>
                      {b.titulo && <h4 className="mk-g-h">{b.titulo}</h4>}
                      {emEdicao ? (
                        <>
                          {(b.importar || b.gerar) && (
                            <div className="mk-e-tools">
                              {b.importar && <button type="button" className="mk-btn is-soft is-sm" onClick={importarDesempenho}><I.Chart size={13} /> Importar dos conteúdos com resultados</button>}
                              {b.gerar && <button type="button" className="mk-btn is-soft is-sm" onClick={gerarEtapas}><I.Board size={13} /> Gerar etapas para cada frente</button>}
                            </div>
                          )}
                          <ListaEditor items={linhas} onChange={(v) => setDraft((p) => ({ ...p, [b.k]: v }))} campos={b.colunas} addLabel={b.add} ctx={ctx} />
                        </>
                      ) : Vista ? <Vista linhas={linhas} ctx={ctx} /> : <TabelaVista bloco={b} linhas={linhas} ctx={ctx} />}
                      {b.utm && !emEdicao && <UtmBuilder />}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="mk-e-danger">
          {confirmDel ? (
            <button type="button" className="mk-btn is-danger is-sm" autoFocus onBlur={() => setConfirmDel(false)} onClick={async () => { await onEliminar(ciclo.id); setCicloId(null); setConfirmDel(false); }}>Confirmar: eliminar “{ciclo.nome}”</button>
          ) : (
            <button type="button" className="mk-btn is-danger-soft is-sm" onClick={() => setConfirmDel(true)}><I.Trash size={13} /> Eliminar ciclo</button>
          )}
        </div>
      </div>

      {modal && <CicloModal modo={modal.modo} inicial={modal.inicial} onClose={() => setModal(null)} onConfirmar={confirmarModal} />}
    </div>
  );
}

