import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { I } from "./mkIcons";
import { AutoText, Field, Chips, TagInput, PersonaFace } from "./mkFields";
import { MarcaLogo } from "./MarcasModal";
import { personasDoCsv } from "./mkCsv";
import { CANAIS, canalInfo, GENEROS, RENDIMENTOS } from "../../constants/marketing";
import { corPessoa, norm } from "./mkUtils";

const LISTAS = ["localizacao", "canais", "comportamento", "desafios", "necessidades", "objetivos", "solucoes", "gatilhos"];
const TEXTOS = ["papel", "nome_persona", "faixa_etaria", "ocupacao", "frase", "decisao", "formacao_ancora", "canal_chave", "como_abordar", "mensagem_chave"];
const TIPOS = [{ id: "principal", label: "Principal", cor: "#0ea5e9" }, { id: "complementar", label: "Complementar", cor: "#94a3b8" }];
const corDe = (p) => corPessoa(`${p?.nome_persona || ""}${p?.papel || ""}`);
const chave = (p) => `${norm(p.nome_persona).trim()}|${norm(p.papel).trim()}`;

/* =========================================================================
   Ficha (editor lateral)
   ========================================================================= */
function PersonaDrawer({ persona, marca, sugestoes, usos, onPatch, onClose, onEliminar }) {
  const [d, setD] = useState(persona);
  const [confirmDel, setConfirmDel] = useState(false);
  const dRef = useRef(d);
  useLayoutEffect(() => { dRef.current = d; }, [d]);
  const pRef = useRef(persona);
  useLayoutEffect(() => { pRef.current = persona; }, [persona]);
  const onPatchRef = useRef(onPatch);
  useLayoutEffect(() => { onPatchRef.current = onPatch; }, [onPatch]);

  // Ao fechar grava os textos ainda por gravar
  useEffect(() => () => {
    const patch = {};
    for (const k of TEXTOS) if ((dRef.current[k] || "") !== (pRef.current[k] || "")) patch[k] = dRef.current[k] || (k === "papel" || k === "nome_persona" ? "" : null);
    if (Object.keys(patch).length) onPatchRef.current(pRef.current.id, patch);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k, v) => { setD((p) => ({ ...p, [k]: v })); onPatch(persona.id, { [k]: v }); };
  const edit = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const commit = (k) => () => {
    const v = dRef.current[k] || "";
    if (v !== (pRef.current[k] || "")) onPatch(persona.id, { [k]: v || (k === "papel" || k === "nome_persona" ? "" : null) });
  };

  const cor = corDe(d);
  return (
    <div className="mk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="mk-drawer mk-pdrawer" style={{ "--brand": marca?.cor || "#2563eb", "--pc": cor }} role="dialog" aria-label={d.nome_persona || "Persona"}>
        <header className="mk-phead">
          <div className="mk-phead-bg" />
          <div className="mk-dhead-top">
            <span className="mk-dbrand"><MarcaLogo marca={marca} size={18} />{marca?.nome}</span>
            <span className="mk-dstate" style={{ background: "rgba(255,255,255,.16)" }}>{d.tipo === "principal" ? "Persona principal" : d.tipo === "complementar" ? "Persona complementar" : "Buyer persona"}</span>
            <span className="mk-spacer" />
            <button type="button" className="mk-dclose" onClick={onClose} aria-label="Fechar"><I.X size={18} /></button>
          </div>
          <div className="mk-phead-main">
            <PersonaFace persona={d} size={64} />
            <div className="mk-phead-names">
              <input className="mk-phead-name" value={d.nome_persona || ""} placeholder="Nome (ex.: João)" autoFocus={!persona.nome_persona} onChange={(e) => edit("nome_persona", e.target.value)} onBlur={commit("nome_persona")} />
              <input className="mk-phead-role" value={d.papel || ""} placeholder="Papel (ex.: Empregador / Empresário)" onChange={(e) => edit("papel", e.target.value)} onBlur={commit("papel")} />
            </div>
          </div>
          <div className="mk-pquote">
            <span>“</span>
            <AutoText className="mk-pquote-input" rows={1} value={d.frase} placeholder="Uma frase que esta pessoa diria…" onChange={(v) => edit("frase", v.replace(/\n/g, " "))} onBlur={commit("frase")} />
          </div>
        </header>

        <div className="mk-dbody">
          <section className="mk-sec">
            <h3><I.User size={16} /> Quem é</h3>
            <div className="mk-grid">
              <Field label="Faixa etária">
                <input className="mk-input" value={d.faixa_etaria || ""} placeholder="Ex.: 35-50 anos" onChange={(e) => edit("faixa_etaria", e.target.value)} onBlur={commit("faixa_etaria")} />
              </Field>
              <Field label="Género">
                <Chips options={GENEROS} value={d.genero} onChange={(v) => set("genero", v)} />
              </Field>
              <Field label="Ocupação" wide>
                <AutoText rows={1} value={d.ocupacao} placeholder="Ex.: Sócio de pequena/média empresa" onChange={(v) => edit("ocupacao", v)} onBlur={commit("ocupacao")} />
              </Field>
              <Field label="Localização">
                <TagInput value={d.localizacao} onChange={(v) => set("localizacao", v)} sugestoes={sugestoes.localizacao} placeholder="Ex.: Faro, Algarve…" />
              </Field>
              <Field label="Rendimento mensal">
                <Chips options={RENDIMENTOS} value={d.rendimento} onChange={(v) => set("rendimento", v)} />
              </Field>
            </div>
          </section>

          <section className="mk-sec">
            <h3><I.Megaphone size={16} /> Onde está e como compra</h3>
            <div className="mk-stack">
              <Field label="Canais preferidos">
                <Chips multi options={CANAIS} value={d.canais} onChange={(v) => set("canais", v)} colorOf={(o) => o.cor} />
              </Field>
              <Field label="Comportamento">
                <TagInput value={d.comportamento} onChange={(v) => set("comportamento", v)} sugestoes={sugestoes.comportamento} placeholder="Ex.: Compra pelo site…" />
              </Field>
            </div>
          </section>

          <section className="mk-sec">
            <h3><I.Target size={16} /> O que procura</h3>
            <div className="mk-stack">
              <Field label="Desafios" hint="o que lhe tira o sono">
                <TagInput tom="red" value={d.desafios} onChange={(v) => set("desafios", v)} sugestoes={sugestoes.desafios} placeholder="Ex.: Falta de tempo…" />
              </Field>
              <Field label="Necessidades">
                <TagInput tom="amber" value={d.necessidades} onChange={(v) => set("necessidades", v)} sugestoes={sugestoes.necessidades} placeholder="Ex.: Cumprir obrigações…" />
              </Field>
              <Field label="Objetivos">
                <TagInput tom="blue" value={d.objetivos} onChange={(v) => set("objetivos", v)} sugestoes={sugestoes.objetivos} placeholder="Ex.: Aumentar a produtividade da equipa…" />
              </Field>
              <Field label="Soluções que lhe oferecemos">
                <TagInput tom="green" value={d.solucoes} onChange={(v) => set("solucoes", v)} sugestoes={sugestoes.solucoes} placeholder="Ex.: Formação à medida…" />
              </Field>
            </div>
          </section>

          <section className="mk-sec">
            <h3><I.Sparkle size={16} /> Como ativar</h3>
            <div className="mk-grid">
              <Field label="Tipo">
                <Chips options={TIPOS} value={d.tipo} onChange={(v) => set("tipo", v)} colorOf={(o) => o.cor} />
              </Field>
              <Field label="Decisão" hint="quem decide e paga">
                <input className="mk-input" value={d.decisao || ""} placeholder="Ex.: Própria — decide e paga sozinha" onChange={(e) => edit("decisao", e.target.value)} onBlur={commit("decisao")} />
              </Field>
              <Field label="Gatilhos de decisão" wide hint="o que abre a conversa">
                <TagInput tom="amber" value={d.gatilhos} onChange={(v) => set("gatilhos", v)} sugestoes={sugestoes.gatilhos} placeholder="Ex.: Prazo legal a fechar…" />
              </Field>
              <Field label="Formação âncora" wide>
                <AutoText rows={1} value={d.formacao_ancora} placeholder="O produto que mais faz sentido para esta persona" onChange={(v) => edit("formacao_ancora", v)} onBlur={commit("formacao_ancora")} />
              </Field>
              <Field label="Canal-chave">
                <input className="mk-input" value={d.canal_chave || ""} placeholder="Ex.: WhatsApp + Facebook" onChange={(e) => edit("canal_chave", e.target.value)} onBlur={commit("canal_chave")} />
              </Field>
              <Field label="Mensagem-chave">
                <AutoText rows={1} value={d.mensagem_chave} placeholder="A frase a usar na peça" onChange={(v) => edit("mensagem_chave", v)} onBlur={commit("mensagem_chave")} />
              </Field>
              <Field label="Como abordar" wide>
                <AutoText rows={2} value={d.como_abordar} placeholder="Tom, canal, o que mostrar primeiro…" onChange={(v) => edit("como_abordar", v)} onBlur={commit("como_abordar")} />
              </Field>
            </div>
          </section>
        </div>

        <footer className="mk-dfoot">
          <span className="mk-dmeta">{usos ? `Usada em ${usos} conteúdo${usos === 1 ? "" : "s"}` : "Ainda não usada em conteúdos"}</span>
          <span className="mk-spacer" />
          {confirmDel ? (
            <button type="button" className="mk-btn is-danger is-sm" autoFocus onBlur={() => setConfirmDel(false)} onClick={() => onEliminar(persona)}>Confirmar eliminação</button>
          ) : (
            <button type="button" className="mk-btn is-danger-soft is-sm" onClick={() => setConfirmDel(true)}><I.Trash size={14} /> Eliminar</button>
          )}
        </footer>
      </aside>
    </div>
  );
}

/* =========================================================================
   Separador "Personas"
   ========================================================================= */
export default function Personas({ marca, personas, conteudos, onCriar, onPatch, onEliminar, onImportar, avisar }) {
  const [abertaId, setAbertaId] = useState(null);
  const [vista, setVista] = useState("cartoes");
  const [importacao, setImportacao] = useState(null); // { personas, ignoradas, nomeFicheiro }
  const [aImportar, setAImportar] = useState(false);
  const inputCsv = useRef(null);

  const usos = useMemo(() => {
    const out = {};
    for (const c of conteudos) for (const id of c.persona_ids || []) out[id] = (out[id] || 0) + 1;
    return out;
  }, [conteudos]);

  const sugestoes = useMemo(() => {
    const out = {};
    for (const k of LISTAS) out[k] = [...new Set(personas.flatMap((p) => p[k] || []))].sort((a, b) => a.localeCompare(b, "pt"));
    return out;
  }, [personas]);

  const existentes = useMemo(() => new Set(personas.map(chave)), [personas]);

  const ordenadas = useMemo(() => {
    const peso = (p) => (p.tipo === "principal" ? 0 : p.tipo === "complementar" ? 1 : 2);
    return [...personas].sort((a, b) => peso(a) - peso(b) || (a.ordem || 0) - (b.ordem || 0));
  }, [personas]);
  const grupos = useMemo(() => {
    if (!personas.some((p) => p.tipo)) return [{ id: "todas", lista: personas }];
    return [
      { id: "principal", titulo: "Principais", sub: "decidem e pagam — motor da receita", lista: ordenadas.filter((p) => p.tipo === "principal") },
      { id: "complementar", titulo: "Complementares", sub: "formandos individuais e influenciadores", lista: ordenadas.filter((p) => p.tipo === "complementar") },
      { id: "outras", titulo: "Sem tipo", sub: "", lista: ordenadas.filter((p) => !p.tipo) },
    ].filter((g) => g.lista.length);
  }, [personas, ordenadas]);

  const lerFicheiro = async (f) => {
    if (!f) return;
    try {
      const { personas: lidas, ignoradas } = personasDoCsv(await f.text());
      if (!lidas.length) throw new Error("Não encontrei nenhuma persona no ficheiro.");
      setImportacao({ personas: lidas, ignoradas, nomeFicheiro: f.name });
    } catch (e) {
      avisar(e.message || "Não foi possível ler o ficheiro.", "error");
    }
  };

  const novas = importacao ? importacao.personas.filter((p) => !existentes.has(chave(p))) : [];

  const confirmarImport = async () => {
    setAImportar(true);
    const ok = await onImportar(novas);
    setAImportar(false);
    if (ok) setImportacao(null);
  };

  const criar = async () => {
    const p = await onCriar({});
    if (p) setAbertaId(p.id);
  };

  const aberta = personas.find((p) => p.id === abertaId);

  return (
    <div className="mk-personas">
      <div className="mk-personas-head">
        <div>
          <h2>Buyer personas <em>{personas.length}</em></h2>
          <p>Para quem comunica a {marca.nome}. Nos conteúdos escolhe-se a persona com um clique.</p>
        </div>
        <span className="mk-spacer" />
        {personas.length > 0 && (
          <div className="mk-seg" role="tablist" aria-label="Vista">
            <button type="button" className={vista === "cartoes" ? "is-on" : ""} onClick={() => setVista("cartoes")}>Cartões</button>
            <button type="button" className={vista === "matriz" ? "is-on" : ""} onClick={() => setVista("matriz")}>Matriz de ativação</button>
          </div>
        )}
        <button type="button" className="mk-btn is-ghost" onClick={() => inputCsv.current?.click()}><I.Archive size={15} /> Importar CSV do Notion</button>
        <button type="button" className="mk-btn is-primary" onClick={criar}><I.Plus size={15} /> Nova persona</button>
        <input ref={inputCsv} type="file" accept=".csv,text/csv" hidden onChange={(e) => { lerFicheiro(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      {importacao && (
        <div className="mk-import">
          <div className="mk-import-head">
            <I.Archive size={18} />
            <div>
              <b>{importacao.personas.length} persona{importacao.personas.length === 1 ? "" : "s"} em “{importacao.nomeFicheiro}”</b>
              <span>{novas.length ? `${novas.length} nova${novas.length === 1 ? "" : "s"} para a ${marca.nome}` : "Todas já existem nesta marca."}{importacao.ignoradas.length ? ` · colunas ignoradas: ${importacao.ignoradas.join(", ")}` : ""}</span>
            </div>
          </div>
          <div className="mk-import-list">
            {importacao.personas.map((p, i) => {
              const ja = existentes.has(chave(p));
              return (
                <span key={i} className={`mk-import-item ${ja ? "is-dup" : ""}`} title={ja ? "Já existe — não vai ser importada" : ""}>
                  <PersonaFace persona={p} size={22} /> <b>{p.nome_persona || "—"}</b> {p.papel}
                  {ja && <em>já existe</em>}
                </span>
              );
            })}
          </div>
          <div className="mk-import-foot">
            <button type="button" className="mk-btn is-ghost is-sm" onClick={() => setImportacao(null)}>Cancelar</button>
            <button type="button" className="mk-btn is-primary is-sm" disabled={!novas.length || aImportar} onClick={confirmarImport}>
              {aImportar ? "A importar…" : `Importar ${novas.length}`}
            </button>
          </div>
        </div>
      )}

      {personas.length === 0 && !importacao ? (
        <div className="mk-empty is-soft">
          <I.User size={30} />
          <h3>A {marca.nome} ainda não tem personas</h3>
          <p>Crie a primeira ou importe o CSV exportado do Notion (base “Buyer Personas”).</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" className="mk-btn is-ghost" onClick={() => inputCsv.current?.click()}>Importar CSV</button>
            <button type="button" className="mk-btn is-primary" onClick={criar}><I.Plus size={15} /> Nova persona</button>
          </div>
        </div>
      ) : (
        vista === "matriz" ? (
          <div className="mk-matrix-wrap">
            <table className="mk-matrix">
              <thead><tr><th>Persona</th><th>Gatilho</th><th>Formação âncora</th><th>Canal</th><th>Mensagem-chave</th></tr></thead>
              <tbody>
                {ordenadas.map((p) => (
                  <tr key={p.id} onClick={() => setAbertaId(p.id)} style={{ "--pc": corDe(p) }}>
                    <td><span className="mk-matrix-who"><PersonaFace persona={p} size={28} /><span><b>{p.nome_persona || "—"}</b><small>{p.papel}</small></span></span></td>
                    <td>{p.gatilhos?.length ? p.gatilhos.join(" · ") : <span className="mk-nil">—</span>}</td>
                    <td>{p.formacao_ancora || <span className="mk-nil">—</span>}</td>
                    <td>{p.canal_chave || (p.canais || []).slice(0, 2).join(" + ") || <span className="mk-nil">—</span>}</td>
                    <td>{p.mensagem_chave ? <q>{p.mensagem_chave}</q> : <span className="mk-nil">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mk-pgroups">
            {grupos.map((g) => (
              <div key={g.id} className="mk-pgroup">
                {g.titulo && <h4 className="mk-pgroup-title">{g.titulo} <em>{g.lista.length}</em><span>{g.sub}</span></h4>}
                <div className="mk-pgrid">
                  {g.lista.map((p, i) => (
                <article key={p.id} className="mk-pcard" style={{ "--pc": corDe(p), animationDelay: `${Math.min(i, 12) * 35}ms` }} onClick={() => setAbertaId(p.id)}>
                  <div className="mk-pcard-band">{p.tipo && <span className="mk-pcard-tipo">{p.tipo === "principal" ? "Principal" : "Complementar"}</span>}</div>
                  <div className="mk-pcard-top">
                    <PersonaFace persona={p} size={52} />
                    <div className="mk-pcard-names">
                      <h3>{p.nome_persona || <span className="mk-untitled">Sem nome</span>}</h3>
                      <span>{p.papel}</span>
                    </div>
                  </div>
                  <div className="mk-pcard-meta">
                    {p.faixa_etaria && <span>{p.faixa_etaria}</span>}
                    {p.genero && <span>{p.genero}</span>}
                    {p.localizacao?.length > 0 && <span>📍 {p.localizacao.join(", ")}</span>}
                    {p.rendimento && <span>{p.rendimento}</span>}
                  </div>
                  {p.frase && <blockquote>“{p.frase}”</blockquote>}
                  {p.mensagem_chave && <p className="mk-pcard-msg"><I.Megaphone size={13} /> {p.mensagem_chave}</p>}
                  {p.desafios?.length > 0 && (
                    <div className="mk-pcard-tags">
                      <small>Desafios</small>
                      <div>{p.desafios.slice(0, 3).map((t) => <span key={t} className="mk-ptag is-red">{t}</span>)}{p.desafios.length > 3 && <span className="mk-ptag">+{p.desafios.length - 3}</span>}</div>
                    </div>
                  )}
                  <div className="mk-pcard-foot">
                    <span className="mk-canais">{(p.canais || []).map((c) => { const ci = canalInfo(c); return <b key={c} style={{ background: ci.cor }} title={c}>{ci.sigla}</b>; })}</span>
                    <span className="mk-spacer" />
                    <span className="mk-pcard-uses">{usos[p.id] ? `${usos[p.id]} conteúdo${usos[p.id] === 1 ? "" : "s"}` : "sem conteúdos"}</span>
                  </div>
                </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {aberta && (
        <PersonaDrawer
          key={aberta.id}
          persona={aberta}
          marca={marca}
          sugestoes={sugestoes}
          usos={usos[aberta.id] || 0}
          onPatch={onPatch}
          onClose={() => setAbertaId(null)}
          onEliminar={async (p) => { await onEliminar(p.id); setAbertaId(null); }}
        />
      )}
    </div>
  );
}
