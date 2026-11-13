import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import FancySelect from "../FancySelect";
import { I } from "./mkIcons";
import { AutoText, Field, Chips } from "./mkFields";
import { MarcaLogo } from "./MarcasModal";
import { CANAIS, canalInfo, avaliacaoInfo } from "../../constants/marketing";
import { fmtData, diasAte, norm, urlSegura } from "./mkUtils";
import { TIPOS, ORDEM_TIPOS, COLUNAS, estadoDe, valorDe, patchCampo, numeroDe, METRICAS_PECA, placeholdersDe, TIPOS_CONVERSAO } from "./recursosModelo";

const LS_SUB = "bizin-mk-recursos-sub";
const lerLS = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignora */ } };
const Ico = ({ nome, size = 16 }) => { const C = I[nome] || I.Layers; return <C size={size} />; };
const vazio = (v) => v === null || v === undefined || String(v).trim() === "";
const fmtNum = (n) => (n === null || n === undefined || Number.isNaN(n) ? "—" : Number(n).toLocaleString("pt-PT"));

function periodo(r) {
  if (!r.data && !r.data_fim) return "";
  if (r.data && r.data_fim && r.data !== r.data_fim) return `${fmtData(r.data, { hora: false })} → ${fmtData(r.data_fim, { hora: false })}`;
  return fmtData(r.data || r.data_fim, { hora: false });
}

/* =========================================================================
   Campo genérico
   ========================================================================= */
function Campo({ c, d, edit, set, commit, ctx }) {
  const v = valorDe(d, c.k);
  const opts = (lista, vazioLabel = "—") => [{ value: "", label: vazioLabel }, ...lista];
  switch (c.tipo) {
    case "estado":
      return <Chips options={TIPOS[ctx.tipo].estados} value={v || null} onChange={(x) => set(c.k, x)} colorOf={(o) => o.cor} />;
    case "select":
      return <Chips options={c.opcoes} value={v || null} onChange={(x) => set(c.k, x)} />;
    case "area":
      return <AutoText value={v || ""} rows={2} onChange={(x) => edit(c.k, x)} onBlur={commit(c.k)} />;
    case "date":
    case "dateDados":
      return <input type="date" className="mk-input" value={v || ""} onChange={(e) => set(c.k, e.target.value || null)} />;
    case "number":
      return <input type="number" className="mk-input" value={v ?? ""} onChange={(e) => edit(c.k, e.target.value === "" ? null : Number(e.target.value))} onBlur={commit(c.k)} />;
    case "url":
      return (
        <div className="mk-rec-url">
          <input className="mk-input" value={v || ""} placeholder="https://…" onChange={(e) => edit(c.k, e.target.value)} onBlur={commit(c.k)} />
          {urlSegura(v) && <a className="mk-icon-btn" href={urlSegura(v)} target="_blank" rel="noreferrer noopener" title="Abrir"><I.External size={15} /></a>}
        </div>
      );
    case "oferta":
      return <FancySelect value={v || ""} onChange={(x) => set(c.k, x || null)} menuWidth={360} options={opts(ctx.ofertas.map((o) => ({ value: o.titulo, label: o.titulo })))} />;
    case "campanha":
      return <FancySelect value={v || ""} onChange={(x) => set(c.k, x || null)} menuWidth={320} options={opts(ctx.campanhas.map((t) => ({ value: t, label: t })))} />;
    case "frente":
      return <FancySelect value={v || ""} onChange={(x) => set(c.k, x || null)} menuWidth={300} options={opts(ctx.frentes.map((t) => ({ value: t, label: t })))} />;
    case "canal":
      return <FancySelect value={v || ""} onChange={(x) => set(c.k, x || null)} menuWidth={220} options={opts(CANAIS.map((x) => ({ value: x.id, label: x.id, icon: <b className="mk-canal-dot" style={{ background: x.cor }}>{x.sigla}</b> })))} />;
    default:
      return <input className="mk-input" value={v || ""} onChange={(e) => edit(c.k, e.target.value)} onBlur={commit(c.k)} />;
  }
}

/* =========================================================================
   Ficha (editor lateral)
   ========================================================================= */
function RecursoDrawer({ r, marca, ctx, extra, onPatch, onEliminar, onClose }) {
  const cfg = TIPOS[r.tipo];
  const [d, setD] = useState(r);
  const [confirmDel, setConfirmDel] = useState(false);
  const dRef = useRef(d);
  useLayoutEffect(() => { dRef.current = d; }, [d]);
  const rRef = useRef(r);
  useLayoutEffect(() => { rRef.current = r; }, [r]);
  const onPatchRef = useRef(onPatch);
  useLayoutEffect(() => { onPatchRef.current = onPatch; }, [onPatch]);

  // Ao fechar grava o que ficou por gravar
  useEffect(() => () => {
    const atual = dRef.current;
    const orig = rRef.current;
    const patch = {};
    for (const k of COLUNAS) if ((atual[k] ?? null) !== (orig[k] ?? null)) patch[k] = atual[k] ?? (k === "titulo" ? "" : null);
    if (JSON.stringify(atual.dados || {}) !== JSON.stringify(orig.dados || {})) patch.dados = atual.dados || {};
    if (Object.keys(patch).length) onPatchRef.current(orig.id, patch);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const aplicar = (k, v) => { const p = patchCampo(dRef.current, k, v); const nd = { ...dRef.current, ...p }; dRef.current = nd; setD(nd); return p; };
  const edit = (k, v) => aplicar(k, v);
  const set = (k, v) => onPatch(r.id, aplicar(k, v));
  const commit = (k) => () => {
    const v = valorDe(dRef.current, k);
    const antes = valorDe(rRef.current, k);
    if ((v ?? "") !== (antes ?? "")) onPatch(r.id, patchCampo(dRef.current, k, k === "titulo" ? v || "" : vazio(v) ? null : v));
  };

  const estado = estadoDe(r.tipo, d.estado);
  return (
    <div className="mk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="mk-drawer mk-rec-drawer" style={{ "--brand": marca?.cor || "#2563eb", "--st": estado?.cor || "#64748b" }} role="dialog" aria-label={d.titulo || cfg.singular}>
        <header className="mk-dhead">
          <div className="mk-dhead-bg" />
          <div className="mk-dhead-top">
            <span className="mk-dbrand"><MarcaLogo marca={marca} size={18} />{marca?.nome}</span>
            <span className="mk-dstate"><Ico nome={cfg.icon} size={13} /> {cfg.label}</span>
            <span className="mk-spacer" />
            <button type="button" className="mk-dclose" onClick={onClose} aria-label="Fechar"><I.X size={18} /></button>
          </div>
          <AutoText className="mk-dtitle" value={d.titulo} rows={1} placeholder={`Nome do ${cfg.singular}`} autoFocus={!r.titulo} onChange={(v) => edit("titulo", v.replace(/\n/g, " "))} onBlur={commit("titulo")} />
        </header>
        <div className="mk-dbody">
          <section className="mk-sec">
            <div className="mk-grid">
              {cfg.campos.filter((c) => c.k !== "titulo").map((c) => (
                <Field key={c.k} label={c.k === "estado" && cfg.estadoLabel ? cfg.estadoLabel : c.label} hint={c.hint} wide={c.wide || ["estado", "select"].includes(c.tipo)}>
                  <Campo c={c} d={d} edit={edit} set={set} commit={commit} ctx={{ ...ctx, tipo: r.tipo }} />
                </Field>
              ))}
            </div>
          </section>
          {extra}
        </div>
        <footer className="mk-dfoot">
          <span className="mk-dmeta">Atualizado {fmtData(r.updated_at)}</span>
          <span className="mk-spacer" />
          {confirmDel ? (
            <button type="button" className="mk-btn is-danger is-sm" onClick={() => onEliminar(r)} onBlur={() => setConfirmDel(false)} autoFocus>Confirmar eliminação</button>
          ) : (
            <button type="button" className="mk-btn is-danger-soft is-sm" onClick={() => setConfirmDel(true)}><I.Trash size={14} /> Eliminar</button>
          )}
        </footer>
      </aside>
    </div>
  );
}

/* =========================================================================
   Lista de um tipo
   ========================================================================= */
function Lista({ tipo, itens, conteudos, onAbrir, onCriar }) {
  const cfg = TIPOS[tipo];
  const [busca, setBusca] = useState("");
  const [fEstado, setFEstado] = useState("");
  const visiveis = useMemo(() => {
    const q = norm(busca.trim());
    return itens.filter((r) => (!fEstado || r.estado === fEstado) && (!q || norm(`${r.titulo} ${JSON.stringify(r.dados || {})}`).includes(q)));
  }, [itens, busca, fEstado]);
  const contagem = (id) => itens.filter((r) => r.estado === id).length;

  return (
    <div className="mk-rec-list">
      <div className="mk-rec-bar">
        <p className="mk-rec-dica"><Ico nome={cfg.icon} size={15} /> {cfg.dica}</p>
        <span className="mk-spacer" />
        <label className="mk-search">
          <I.Search size={16} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={`Procurar em ${cfg.label.toLowerCase()}…`} />
          {busca && <button type="button" onClick={() => setBusca("")} aria-label="Limpar"><I.X size={14} /></button>}
        </label>
        <button type="button" className="mk-btn is-primary" onClick={() => onCriar(tipo)}><I.Plus size={15} /> Novo {cfg.singular}</button>
      </div>
      <div className="mk-chips mk-rec-filtros">
        <button type="button" className={`mk-chip ${!fEstado ? "is-on" : ""}`} onClick={() => setFEstado("")}>Todos <em>{itens.length}</em></button>
        {cfg.estados.filter((e) => contagem(e.id) > 0).map((e) => (
          <button key={e.id} type="button" className={`mk-chip ${fEstado === e.id ? "is-on" : ""}`} style={{ "--c": e.cor }} onClick={() => setFEstado(fEstado === e.id ? "" : e.id)}><i />{e.label} <em>{contagem(e.id)}</em></button>
        ))}
      </div>
      {visiveis.length === 0 ? (
        <div className="mk-empty is-soft">
          <Ico nome={cfg.icon} size={30} />
          <h3>{itens.length ? "Nada encontrado" : `Ainda sem ${cfg.label.toLowerCase()}`}</h3>
          {!itens.length && <button type="button" className="mk-btn is-soft" onClick={() => onCriar(tipo)}><I.Plus size={15} /> Adicionar</button>}
        </div>
      ) : (
        <div className="mk-rec-rows">
          {visiveis.map((r, i) => {
            const e = estadoDe(tipo, r.estado);
            const per = periodo(r);
            const nPecas = tipo === "campanha" ? conteudos.filter((c) => (c.campanha || "").trim() === r.titulo.trim()).length : 0;
            const rever = r.dados?.rever_em && diasAte(r.dados.rever_em) <= 7;
            return (
              <div key={r.id} className="mk-arch-row mk-rec-row" style={{ animationDelay: `${Math.min(i, 14) * 20}ms` }} onClick={() => onAbrir(r.id)}>
                <span className="mk-arch-dot" style={{ background: e?.cor || "#cbd5e1" }} />
                <div className="mk-arch-main">
                  <b>{r.titulo || <span className="mk-untitled">Sem título</span>}</b>
                  <span>
                    {[e?.label, per, ...cfg.resumo.map((k) => {
                      const v = r.dados?.[k];
                      if (vazio(v)) return null;
                      if (k === "rever_em") return `rever ${fmtData(v, { hora: false })}`;
                      if (k === "quantidade") return `× ${v}`;
                      if (k === "valor") return fmtNum(v);
                      if (k === "variacao") return `${Number(v) > 0 ? "+" : ""}${String(v).replace(".", ",")}%`;
                      return String(v);
                    })].filter(Boolean).join(" · ")}
                    {nPecas > 0 && ` · ${nPecas} peça${nPecas === 1 ? "" : "s"}`}
                  </span>
                </div>
                {rever && <span className="mk-card-alert"><I.Clock size={12} /> Rever</span>}
                {r.dados?.url && <a className="mk-icon-btn is-sm" href={urlSegura(r.dados.url)} target="_blank" rel="noreferrer noopener" onClick={(ev) => ev.stopPropagation()} title="Abrir link"><I.External size={14} /></a>}
                <I.ChevronRight size={16} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Resultados: metas das campanhas + leads + desempenho por peça
   ========================================================================= */
function Resultados({ leads, campanhasR, metricas, conteudos, onAbrir, onAbrirConteudo, onCriar }) {
  const somaLeads = (filtro) => leads.filter(filtro).reduce((n, l) => n + (Number(l.dados?.quantidade) || 1), 0);
  const metas = campanhasR.map((c) => {
    const meta = numeroDe(c.dados?.meta);
    const tipoConv = c.dados?.conversao;
    const feito = somaLeads((l) => (l.dados?.campanha || "") === c.titulo && (!tipoConv || l.estado === tipoConv));
    const pecas = conteudos.filter((x) => (x.campanha || "").trim() === c.titulo.trim());
    const gasto = (Number(c.dados?.gasto) || 0) + pecas.reduce((n, x) => n + (Number(x.verba_usada) || 0), 0);
    return { c, meta, feito, pecas: pecas.length, gasto };
  });
  const porTipo = TIPOS_CONVERSAO.map((t) => ({ ...t, n: somaLeads((l) => l.estado === t.id) })).filter((t) => t.n > 0);

  const publicadas = conteudos
    .filter((c) => c.estado === "publicado")
    .sort((a, b) => String(b.data_publicacao || "").localeCompare(String(a.data_publicacao || "")));
  const semResultados = publicadas.filter((c) => !Object.values(c.metricas || {}).some((v) => !vazio(v)) && vazio(c.resultado)).length;
  const total = (k) => publicadas.reduce((n, c) => n + (Number(c.metricas?.[k]) || 0), 0);

  return (
    <div className="mk-rec-res">
      <section className="mk-sec">
        <h3><I.Target size={16} /> Metas das campanhas</h3>
        {metas.length === 0 ? <p className="mk-hint">Crie campanhas com uma meta numérica para acompanhar o progresso aqui.</p> : (
          <div className="mk-rec-metas">
            {metas.map(({ c, meta, feito, pecas, gasto }) => {
              const pct = meta ? Math.min(100, Math.round((feito / meta) * 100)) : null;
              const e = estadoDe("campanha", c.estado);
              return (
                <button key={c.id} type="button" className="mk-rec-meta" onClick={() => onAbrir(c.id)}>
                  <div className="mk-rec-meta-top"><b>{c.titulo}</b><span className="mk-aval" style={{ "--c": e?.cor }}><i />{e?.label}</span></div>
                  <small>{[c.dados?.kpi, periodo(c)].filter(Boolean).join(" · ")}</small>
                  {meta ? (
                    <>
                      <div className="mk-rec-bar-track"><span style={{ width: `${pct}%` }} /></div>
                      <small><strong>{fmtNum(feito)}</strong> de {fmtNum(meta)} ({pct}%){c.dados?.conversao ? ` · conta: ${TIPOS_CONVERSAO.find((t) => t.id === c.dados.conversao)?.label}` : ""}</small>
                    </>
                  ) : <small className="mk-rec-muted">Sem meta numérica · {fmtNum(feito)} registos</small>}
                  <small className="mk-rec-muted">{pecas} peça{pecas === 1 ? "" : "s"}{gasto ? ` · ${gasto.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} gastos` : ""}</small>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mk-sec">
        <div className="mk-rec-sechead">
          <h3><I.Chart size={16} /> Leads e conversões</h3>
          <span className="mk-spacer" />
          <button type="button" className="mk-btn is-soft is-sm" onClick={() => onCriar("lead")}><I.Plus size={14} /> Registar</button>
        </div>
        {porTipo.length > 0 && (
          <div className="mk-rec-kpis">
            {porTipo.map((t) => <span key={t.id} className="mk-stat"><strong>{fmtNum(t.n)}</strong> {t.label.toLowerCase()}</span>)}
          </div>
        )}
        {leads.length === 0 ? <p className="mk-hint">Registe aqui cada lead, inscrição, proposta ou venda vinda do marketing (com canal e campanha) para medir as metas.</p> : (
          <div className="mk-rec-rows">
            {leads.slice(0, 12).map((l) => {
              const e = estadoDe("lead", l.estado);
              return (
                <div key={l.id} className="mk-arch-row mk-rec-row" onClick={() => onAbrir(l.id)}>
                  <span className="mk-arch-dot" style={{ background: e?.cor || "#cbd5e1" }} />
                  <div className="mk-arch-main">
                    <b>{l.titulo || e?.label || "Registo"}</b>
                    <span>{[e?.label, fmtData(l.data, { hora: false }), l.dados?.canal, l.dados?.campanha, l.dados?.quantidade ? `× ${l.dados.quantidade}` : null].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
              );
            })}
            {leads.length > 12 && <p className="mk-hint">+{leads.length - 12} registos no separador Leads.</p>}
          </div>
        )}
      </section>

      <section className="mk-sec">
        <div className="mk-rec-sechead">
          <h3><I.Chart size={16} /> Métricas dos canais</h3>
          <span className="mk-spacer" />
          <button type="button" className="mk-btn is-soft is-sm" onClick={() => onCriar("metrica")}><I.Plus size={14} /> Registar</button>
        </div>
        {metricas.length === 0 ? <p className="mk-hint">Registe o alcance, as visualizações, as interações e os seguidores de cada canal (por mês, por exemplo) para acompanhar a evolução.</p> : (
          <div className="mk-rec-table-wrap">
            <table className="mk-rec-table">
              <thead><tr><th>Métrica</th><th>Canal</th><th>Data</th><th>Período</th><th className="is-num">Valor</th><th className="is-num">Meta</th><th className="is-num">Variação</th></tr></thead>
              <tbody>
                {[...metricas].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")) || String(a.dados?.canal || "").localeCompare(String(b.dados?.canal || ""), "pt")).map((m) => {
                  const ci = m.dados?.canal ? canalInfo(m.dados.canal) : null;
                  const varN = vazio(m.dados?.variacao) ? null : Number(m.dados.variacao);
                  return (
                    <tr key={m.id} onClick={() => onAbrir(m.id)}>
                      <td className="is-title">{m.titulo || "Sem nome"}{m.dados?.tipo_metrica && <small>{m.dados.tipo_metrica}</small>}</td>
                      <td>{ci ? <span className="mk-canais"><b style={{ background: ci.cor }} title={m.dados.canal}>{ci.sigla}</b></span> : <span className="mk-rec-muted">—</span>}</td>
                      <td>{fmtData(m.data, { hora: false }) || "—"}</td>
                      <td>{estadoDe("metrica", m.estado)?.label || "—"}</td>
                      <td className="is-num">{fmtNum(m.dados?.valor)}</td>
                      <td className="is-num">{vazio(m.dados?.meta) ? <span className="mk-rec-muted">—</span> : fmtNum(m.dados.meta)}</td>
                      <td className="is-num">{varN === null ? <span className="mk-rec-muted">—</span> : <span style={{ color: varN < 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{varN > 0 ? "+" : ""}{varN.toLocaleString("pt-PT")}%</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mk-sec">
        <h3><I.Image size={16} /> Desempenho por peça</h3>
        {publicadas.length === 0 ? <p className="mk-hint">Ainda não há peças publicadas.</p> : (
          <>
            <div className="mk-rec-kpis">
              {METRICAS_PECA.slice(0, 5).map((m) => <span key={m.k} className="mk-stat"><strong>{fmtNum(total(m.k))}</strong> {m.label.toLowerCase()}</span>)}
              {semResultados > 0 && <span className="mk-stat is-late"><strong>{semResultados}</strong> sem resultados registados</span>}
            </div>
            <div className="mk-rec-table-wrap">
              <table className="mk-rec-table">
                <thead><tr><th>Peça</th><th>Publicação</th><th>Canais</th>{METRICAS_PECA.map((m) => <th key={m.k} className="is-num">{m.label}</th>)}<th>Avaliação</th></tr></thead>
                <tbody>
                  {publicadas.map((c) => {
                    const av = avaliacaoInfo(c.avaliacao);
                    return (
                      <tr key={c.id} onClick={() => onAbrirConteudo(c.id)}>
                        <td className="is-title">{c.titulo || "Sem título"}{c.campanha && <small>{c.campanha}</small>}</td>
                        <td>{fmtData(c.data_publicacao, { hora: false }) || "—"}</td>
                        <td><span className="mk-canais">{(c.canais || []).map((x) => { const ci = canalInfo(x); return <b key={x} style={{ background: ci.cor }} title={x}>{ci.sigla}</b>; })}</span></td>
                        {METRICAS_PECA.map((m) => <td key={m.k} className="is-num">{vazio(c.metricas?.[m.k]) ? <span className="mk-rec-muted">—</span> : fmtNum(c.metricas[m.k])}</td>)}
                        <td>{av ? <span className="mk-aval" style={{ "--c": av.cor }}><i />{av.label}</span> : <span className="mk-rec-muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* =========================================================================
   Página de recursos
   ========================================================================= */
export default function Recursos({ marca, recursos, conteudos, frentes = [], onCriar, onPatch, onEliminar, onAbrirConteudo }) {
  const [sub, setSub] = useState(() => { const s = lerLS(LS_SUB); return s === "resultados" || TIPOS[s] ? s : "resultados"; });
  const [abertoId, setAbertoId] = useState(null);
  const escolher = (s) => { setSub(s); gravarLS(LS_SUB, s); };

  const porTipo = useMemo(() => {
    const out = Object.fromEntries(ORDEM_TIPOS.map((t) => [t, []]));
    for (const r of recursos) if (out[r.tipo]) out[r.tipo].push(r);
    const ordem = { turma: (a, b) => String(b.data || "9").localeCompare(String(a.data || "9")), lead: (a, b) => String(b.data || "").localeCompare(String(a.data || "")) };
    for (const t of ORDEM_TIPOS) out[t].sort(ordem[t] || ((a, b) => a.ordem - b.ordem));
    return out;
  }, [recursos]);

  const ctx = useMemo(() => ({
    ofertas: porTipo.oferta,
    campanhas: [...new Set([...porTipo.campanha.map((c) => c.titulo), ...conteudos.map((c) => (c.campanha || "").trim())].filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt")),
    frentes,
  }), [porTipo, conteudos, frentes]);

  // Pendentes (visão rápida do que falta)
  const pendentes = useMemo(() => {
    const comPlaceholders = conteudos.filter((c) => ["aprovacao", "programacao", "publicado"].includes(c.estado) && placeholdersDe(c).length);
    return {
      confirmar: porTipo.facto.filter((f) => f.estado === "a_confirmar"),
      rever: porTipo.facto.filter((f) => f.estado === "a_rever" || (f.dados?.rever_em && diasAte(f.dados.rever_em) <= 7)),
      autorizar: porTipo.ativo.filter((a) => a.estado === "por_autorizar" || a.dados?.autorizacao === "pendente" || (a.data_fim && diasAte(a.data_fim) < 0)),
      turmasSemData: porTipo.turma.filter((t) => !t.data && t.estado !== "cancelada"),
      placeholders: comPlaceholders,
    };
  }, [porTipo, conteudos]);

  const criar = async (tipo, base = {}) => {
    const cfg = TIPOS[tipo];
    const novo = await onCriar({ tipo, estado: cfg.estados[0]?.id || null, ...(tipo === "lead" || tipo === "metrica" ? { data: new Date().toISOString().slice(0, 10) } : {}), ...base });
    if (novo) setAbertoId(novo.id);
  };
  const aberto = recursos.find((r) => r.id === abertoId) || null;

  const extraDe = (r) => {
    if (r.tipo === "campanha") {
      const pecas = conteudos.filter((c) => (c.campanha || "").trim() === (r.titulo || "").trim());
      return (
        <section className="mk-sec">
          <h3><I.Board size={16} /> Peças desta campanha <em className="mk-rec-muted">{pecas.length}</em></h3>
          {pecas.length === 0 ? <p className="mk-hint">Nenhuma peça tem «{r.titulo}» no campo Campanha / série.</p> : (
            <div className="mk-rec-rows">
              {pecas.map((c) => (
                <div key={c.id} className="mk-arch-row mk-rec-row" onClick={() => { setAbertoId(null); onAbrirConteudo(c.id); }}>
                  <div className="mk-arch-main"><b>{c.titulo || "Sem título"}</b><span>{[c.estado, fmtData(c.data_publicacao, { hora: false })].filter(Boolean).join(" · ")}</span></div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }
    if (r.tipo === "oferta") {
      const turmas = porTipo.turma.filter((t) => t.dados?.oferta === r.titulo);
      return (
        <section className="mk-sec">
          <h3><I.Calendar size={16} /> Turmas</h3>
          {turmas.length === 0 ? <p className="mk-hint">Sem turmas registadas para este curso.</p> : (
            <div className="mk-rec-rows">
              {turmas.map((t) => { const e = estadoDe("turma", t.estado); return (
                <div key={t.id} className="mk-arch-row mk-rec-row" onClick={() => setAbertoId(t.id)}>
                  <span className="mk-arch-dot" style={{ background: e?.cor }} />
                  <div className="mk-arch-main"><b>{t.titulo}</b><span>{[e?.label, periodo(t), t.dados?.local].filter(Boolean).join(" · ")}</span></div>
                </div>
              ); })}
            </div>
          )}
          <button type="button" className="mk-btn is-soft is-sm" style={{ marginTop: 10 }} onClick={() => criar("turma", { titulo: r.titulo, dados: { oferta: r.titulo } })}><I.Plus size={14} /> Nova turma</button>
        </section>
      );
    }
    return null;
  };

  const nPend = pendentes.confirmar.length + pendentes.placeholders.length + pendentes.autorizar.length + pendentes.turmasSemData.length + pendentes.rever.length;

  return (
    <div className="mk-rec">
      {nPend > 0 && (
        <div className="mk-rec-pend">
          <b><I.Alert size={15} /> Por resolver</b>
          {pendentes.confirmar.length > 0 && <button type="button" onClick={() => escolher("facto")}><strong>{pendentes.confirmar.length}</strong> por confirmar</button>}
          {pendentes.rever.length > 0 && <button type="button" onClick={() => escolher("facto")}><strong>{pendentes.rever.length}</strong> factos a rever</button>}
          {pendentes.placeholders.length > 0 && (
            <span className="mk-rec-pend-group">
              <strong>{pendentes.placeholders.length}</strong> peça{pendentes.placeholders.length === 1 ? "" : "s"} com campos por preencher:
              {pendentes.placeholders.slice(0, 4).map((c) => <button key={c.id} type="button" onClick={() => onAbrirConteudo(c.id)} title={placeholdersDe(c).join(" ")}>{c.titulo || "Sem título"}</button>)}
            </span>
          )}
          {pendentes.autorizar.length > 0 && <button type="button" onClick={() => escolher("ativo")}><strong>{pendentes.autorizar.length}</strong> ativos por autorizar</button>}
          {pendentes.turmasSemData.length > 0 && <button type="button" onClick={() => escolher("turma")}><strong>{pendentes.turmasSemData.length}</strong> turmas sem data</button>}
        </div>
      )}

      <div className="mk-seg mk-rec-tabs" role="tablist">
        <button type="button" className={sub === "resultados" ? "is-on" : ""} onClick={() => escolher("resultados")}><I.Target size={14} /> Resultados</button>
        {ORDEM_TIPOS.map((t) => (
          <button key={t} type="button" className={sub === t ? "is-on" : ""} onClick={() => escolher(t)}>
            <Ico nome={TIPOS[t].icon} size={14} /> {TIPOS[t].label} <em>{porTipo[t].length}</em>
          </button>
        ))}
      </div>

      {sub === "resultados" ? (
        <Resultados leads={porTipo.lead} campanhasR={porTipo.campanha} metricas={porTipo.metrica} conteudos={conteudos} onAbrir={setAbertoId} onAbrirConteudo={onAbrirConteudo} onCriar={criar} />
      ) : (
        <Lista key={sub} tipo={sub} itens={porTipo[sub]} conteudos={conteudos} onAbrir={setAbertoId} onCriar={criar} />
      )}

      {aberto && (
        <RecursoDrawer
          key={aberto.id}
          r={aberto}
          marca={marca}
          ctx={ctx}
          extra={extraDe(aberto)}
          onPatch={onPatch}
          onEliminar={(r) => { setAbertoId(null); onEliminar(r.id); }}
          onClose={() => setAbertoId(null)}
        />
      )}
    </div>
  );
}
