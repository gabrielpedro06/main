import { useEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabase";
import { I } from "./mkIcons";
import { AutoText, Field, Linhas, ListaEditor } from "./mkFields";
import { MarcaLogo } from "./MarcasModal";
import { textoSobre, normalizarHex } from "./mkColor";

const SECCOES = [
  { id: "sobre", label: "Sobre", icon: I.Megaphone },
  { id: "personalidade", label: "Personalidade", icon: I.Sparkle },
  { id: "e_nao_e", label: "É / não é", icon: I.CheckCircle },
  { id: "voz", label: "Voz", icon: I.Pen },
  { id: "visual", label: "Identidade visual", icon: I.Image },
  { id: "ficheiros", label: "Ficheiros", icon: I.Archive },
];

const vazio = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.values(v).every(vazio));

/** Carrega as fontes da secção Tipografia (Google Fonts) para a pré-visualização */
function useFontes(nomes) {
  const chave = nomes.filter(Boolean).join("|");
  useEffect(() => {
    for (const nome of chave.split("|").filter(Boolean)) {
      const id = `mk-font-${nome.replace(/\s+/g, "-").toLowerCase()}`;
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nome)}:wght@400;600;800&display=swap`;
      document.head.appendChild(link);
    }
  }, [chave]);
}

/* =========================================================================
   Vistas (leitura)
   ========================================================================= */
function VerSobre({ s }) {
  const factos = [["Nome", s.nome_legal], ["Setor", s.setor], ["Sede", s.sede], ["Fundação", s.fundacao], ["Certificação", s.certificacao], ["Website", s.website]].filter(([, v]) => v);
  return (
    <div className="mk-g-stack">
      {s.descricao && <p className="mk-g-lead">{s.descricao}</p>}
      {factos.length > 0 && (
        <dl className="mk-g-facts">
          {factos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{k === "Website" ? <a href={/^https?:/.test(v) ? v : `https://${v}`} target="_blank" rel="noreferrer">{v}</a> : v}</dd></div>)}
        </dl>
      )}
      {(s.missao || s.posicionamento) && (
        <div className="mk-g-duo">
          {s.missao && <div className="mk-g-callout is-brand"><small>Missão</small><p>{s.missao}</p></div>}
          {s.posicionamento && <div className="mk-g-callout"><small>Posicionamento</small><p>{s.posicionamento}</p></div>}
        </div>
      )}
      {s.areas?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Áreas de formação</h4>
          <div className="mk-g-areas">{s.areas.map((a, i) => <span key={i}>{a.codigo && <b>{a.codigo}</b>}{a.nome}</span>)}</div>
        </div>
      )}
      {s.parceiros?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Parceiros institucionais</h4>
          <div className="mk-g-chips">{s.parceiros.map((p) => <span key={p}>{p}</span>)}</div>
        </div>
      )}
    </div>
  );
}

function VerPersonalidade({ s }) {
  return (
    <div className="mk-g-stack">
      {s.resumo && <p className="mk-g-lead">{s.resumo}</p>}
      {s.arquetipos?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Arquétipos</h4>
          <div className="mk-g-arqs">
            {s.arquetipos.map((a, i) => (
              <article key={i} className={`mk-g-arq ${i === 0 ? "is-main" : ""}`}>
                <div className="mk-g-arq-top">
                  <small>{a.papel || (i === 0 ? "Principal" : "Apoio")}</small>
                  {a.peso != null && <em>{a.peso}%</em>}
                </div>
                <h3>{a.nome}</h3>
                {a.peso != null && <span className="mk-g-bar"><i style={{ width: `${Math.min(100, a.peso)}%` }} /></span>}
                {a.descricao && <p>{a.descricao}</p>}
                {a.expressoes && <p className="mk-g-muted"><b>Expressões:</b> {a.expressoes}</p>}
                {(a.emocao || a.promessa) && (
                  <div className="mk-g-arq-foot">
                    {a.emocao && <span><small>Emoção</small>{a.emocao}</span>}
                    {a.promessa && <span><small>Promessa</small>{a.promessa}</span>}
                  </div>
                )}
              </article>
            ))}
          </div>
          {s.regra_arquetipos && <p className="mk-g-note"><I.Sparkle size={14} /> {s.regra_arquetipos}</p>}
        </div>
      )}
      {s.tracos?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Traços de personalidade</h4>
          <ol className="mk-g-traits">{s.tracos.map((t, i) => <li key={i}><b>{t.nome}</b><span>{t.descricao}</span></li>)}</ol>
        </div>
      )}
      {s.valores?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Valores</h4>
          <div className="mk-g-values">
            {s.valores.map((v, i) => (
              <div key={i}>
                <small>{String(i + 1).padStart(2, "0")}</small>
                <b>{v.nome}</b>
                {v.subtitulo && <em>{v.subtitulo}</em>}
                {v.descricao && <span>{v.descricao}</span>}
              </div>
            ))}
          </div>
          {s.regra_valores && <p className="mk-g-note"><I.Alert size={14} /> {s.regra_valores}</p>}
        </div>
      )}
    </div>
  );
}

function VerENaoE({ s }) {
  return (
    <div className="mk-g-stack">
      <div className="mk-g-isnot">
        <div className="is-yes"><h4><I.Check size={16} /> A marca é</h4><ul>{(s.e || []).map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="is-no"><h4><I.X size={16} /> A marca não é</h4><ul>{(s.nao_e || []).map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>
      {s.teste && <p className="mk-g-note">{s.teste}</p>}
      {(s.provar || s.alarme) && (
        <div className="mk-g-duo">
          {s.provar && <div className="mk-g-callout is-brand"><small>Provar sempre</small><p>{s.provar}</p></div>}
          {s.alarme && <div className="mk-g-callout is-warn"><small>Sinais de alarme</small><p>{s.alarme}</p></div>}
        </div>
      )}
    </div>
  );
}

function VerVoz({ s }) {
  return (
    <div className="mk-g-stack">
      {s.tom && <blockquote className="mk-g-quote">{s.tom}</blockquote>}
      {s.caracteristicas?.length > 0 && (
        <div className="mk-g-table-wrap">
          <table className="mk-g-table">
            <thead><tr><th>Característica</th><th>Descrição</th><th>Fazemos</th><th>Não fazemos</th></tr></thead>
            <tbody>{s.caracteristicas.map((c, i) => <tr key={i}><td><b>{c.nome}</b></td><td>{c.descricao}</td><td className="is-yes">{c.fazemos}</td><td className="is-no">{c.nao_fazemos}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {(s.usamos?.length > 0 || s.evitamos?.length > 0) && (
        <div className="mk-g-duo">
          <div><h4 className="mk-g-h">Palavras que usamos</h4><div className="mk-g-chips is-yes">{(s.usamos || []).map((x) => <span key={x}>{x}</span>)}</div></div>
          <div><h4 className="mk-g-h">Palavras que evitamos</h4><div className="mk-g-chips is-no">{(s.evitamos || []).map((x) => <span key={x}>{x}</span>)}</div></div>
        </div>
      )}
      {s.canais?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Tom por canal</h4>
          <div className="mk-g-channels">
            {s.canais.map((c, i) => <div key={i}><b>{c.canal}</b><span>{c.tom}</span>{c.exemplo && <em>{c.exemplo}</em>}</div>)}
          </div>
        </div>
      )}
      {(s.em_vez_de || s.dizemos) && (
        <div className="mk-g-instead">
          {s.em_vez_de && <div className="is-no"><small>Em vez de dizer</small><p>“{s.em_vez_de}”</p></div>}
          <I.ArrowRight size={20} />
          {s.dizemos && <div className="is-yes"><small>Dizemos</small><p>“{s.dizemos}”</p></div>}
        </div>
      )}
      {s.tratamento && <p className="mk-g-note"><I.User size={14} /> {s.tratamento}</p>}
    </div>
  );
}

function VerVisual({ s }) {
  const [copiado, setCopiado] = useState(null);
  useFontes((s.tipografias || []).map((t) => t.nome));
  const copiar = (hex) => { navigator.clipboard?.writeText(hex).then(() => { setCopiado(hex); setTimeout(() => setCopiado(null), 1200); }).catch(() => {}); };
  return (
    <div className="mk-g-stack">
      {s.cores?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Paleta</h4>
          <div className="mk-g-palette">
            {s.cores.map((c, i) => {
              const hex = normalizarHex(c.hex) || "#cccccc";
              return (
                <button type="button" key={i} className="mk-g-swatch" onClick={() => copiar(hex.toUpperCase())} title="Copiar HEX">
                  <span className="mk-g-swatch-color" style={{ background: hex, color: textoSobre(hex) }}>
                    {c.papel && <small>{c.papel}</small>}
                    <b>{copiado === hex.toUpperCase() ? "Copiado!" : hex.toUpperCase()}</b>
                  </span>
                  <span className="mk-g-swatch-txt"><b>{c.nome}</b>{c.uso && <span>{c.uso}</span>}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {s.tipografias?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Tipografia</h4>
          <div className="mk-g-fonts">
            {s.tipografias.map((t, i) => (
              <div key={i}>
                <span className="mk-g-font-sample" style={{ fontFamily: `"${t.nome}", system-ui, sans-serif` }}>Aa</span>
                <div>
                  <b style={{ fontFamily: `"${t.nome}", system-ui, sans-serif` }}>{t.nome}</b>
                  {t.papel && <small>{t.papel}</small>}
                  {t.descricao && <p>{t.descricao}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {s.logotipo && <div className="mk-g-callout"><small>Logótipo</small><p>{s.logotipo}</p></div>}
      {s.regras?.length > 0 && (
        <div>
          <h4 className="mk-g-h">Regras práticas</h4>
          <ol className="mk-g-rules">{s.regras.map((r, i) => <li key={i}>{r}</li>)}</ol>
        </div>
      )}
      {(s.fotografia || s.selos) && (
        <div className="mk-g-duo">
          {s.fotografia && <div className="mk-g-callout"><small>Fotografia</small><p>{s.fotografia}</p></div>}
          {s.selos && <div className="mk-g-callout"><small>Selos e parceiros</small><p>{s.selos}</p></div>}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Editores
   ========================================================================= */
function EditSobre({ d, set }) {
  return (
    <div className="mk-grid">
      <Field label="Nome legal"><input className="mk-input" value={d.nome_legal || ""} onChange={(e) => set("nome_legal", e.target.value)} /></Field>
      <Field label="Setor"><input className="mk-input" value={d.setor || ""} onChange={(e) => set("setor", e.target.value)} /></Field>
      <Field label="Sede"><input className="mk-input" value={d.sede || ""} onChange={(e) => set("sede", e.target.value)} /></Field>
      <Field label="Fundação"><input className="mk-input" value={d.fundacao || ""} onChange={(e) => set("fundacao", e.target.value)} /></Field>
      <Field label="Certificação"><input className="mk-input" value={d.certificacao || ""} onChange={(e) => set("certificacao", e.target.value)} /></Field>
      <Field label="Website"><input className="mk-input" value={d.website || ""} onChange={(e) => set("website", e.target.value)} /></Field>
      <Field label="Descrição" wide><AutoText rows={3} value={d.descricao} onChange={(v) => set("descricao", v)} /></Field>
      <Field label="Missão" wide><AutoText rows={2} value={d.missao} onChange={(v) => set("missao", v)} /></Field>
      <Field label="Posicionamento" wide><AutoText rows={2} value={d.posicionamento} onChange={(v) => set("posicionamento", v)} /></Field>
      <Field label="Áreas" wide><ListaEditor items={d.areas} onChange={(v) => set("areas", v)} campos={[{ k: "codigo", label: "Código", w: "90px" }, { k: "nome", label: "Área" }]} addLabel="Adicionar área" /></Field>
      <Field label="Parceiros" wide hint="um por linha"><Linhas value={d.parceiros} onChange={(v) => set("parceiros", v)} rows={3} /></Field>
    </div>
  );
}

function EditPersonalidade({ d, set }) {
  return (
    <div className="mk-stack">
      <Field label="Resumo"><AutoText rows={2} value={d.resumo} onChange={(v) => set("resumo", v)} /></Field>
      <Field label="Arquétipos">
        <ListaEditor
          items={d.arquetipos}
          onChange={(v) => set("arquetipos", v)}
          novo={{ papel: "Apoio" }}
          addLabel="Adicionar arquétipo"
          campos={[
            { k: "nome", label: "Nome" }, { k: "papel", label: "Papel", w: "120px" }, { k: "peso", label: "Peso %", tipo: "num", w: "90px" },
            { k: "descricao", label: "Descrição", tipo: "area" }, { k: "expressoes", label: "Expressões", tipo: "area" },
            { k: "emocao", label: "Emoção" }, { k: "promessa", label: "Promessa" },
          ]}
        />
      </Field>
      <Field label="Como se combinam"><AutoText rows={2} value={d.regra_arquetipos} onChange={(v) => set("regra_arquetipos", v)} /></Field>
      <Field label="Traços"><ListaEditor items={d.tracos} onChange={(v) => set("tracos", v)} addLabel="Adicionar traço" campos={[{ k: "nome", label: "Traço", w: "160px" }, { k: "descricao", label: "Descrição" }]} /></Field>
      <Field label="Valores"><ListaEditor items={d.valores} onChange={(v) => set("valores", v)} addLabel="Adicionar valor" campos={[{ k: "nome", label: "Valor" }, { k: "subtitulo", label: "Subtítulo" }, { k: "descricao", label: "Descrição", tipo: "area" }]} /></Field>
      <Field label="Regra dos valores"><AutoText rows={1} value={d.regra_valores} onChange={(v) => set("regra_valores", v)} /></Field>
    </div>
  );
}

function EditENaoE({ d, set }) {
  return (
    <div className="mk-grid">
      <Field label="A marca é" hint="um por linha"><Linhas value={d.e} onChange={(v) => set("e", v)} rows={5} /></Field>
      <Field label="A marca não é" hint="um por linha"><Linhas value={d.nao_e} onChange={(v) => set("nao_e", v)} rows={5} /></Field>
      <Field label="Teste antes de publicar" wide><AutoText rows={1} value={d.teste} onChange={(v) => set("teste", v)} /></Field>
      <Field label="Provar sempre"><AutoText rows={2} value={d.provar} onChange={(v) => set("provar", v)} /></Field>
      <Field label="Sinais de alarme"><AutoText rows={2} value={d.alarme} onChange={(v) => set("alarme", v)} /></Field>
    </div>
  );
}

function EditVoz({ d, set }) {
  return (
    <div className="mk-stack">
      <Field label="Tom de voz"><AutoText rows={3} value={d.tom} onChange={(v) => set("tom", v)} /></Field>
      <Field label="Características"><ListaEditor items={d.caracteristicas} onChange={(v) => set("caracteristicas", v)} addLabel="Adicionar característica" campos={[{ k: "nome", label: "Nome", w: "130px" }, { k: "descricao", label: "Descrição" }, { k: "fazemos", label: "Fazemos" }, { k: "nao_fazemos", label: "Não fazemos" }]} /></Field>
      <div className="mk-grid">
        <Field label="Palavras que usamos" hint="uma por linha"><Linhas value={d.usamos} onChange={(v) => set("usamos", v)} rows={5} /></Field>
        <Field label="Palavras que evitamos" hint="uma por linha · avisa no copy"><Linhas value={d.evitamos} onChange={(v) => set("evitamos", v)} rows={5} /></Field>
      </div>
      <Field label="Tom por canal"><ListaEditor items={d.canais} onChange={(v) => set("canais", v)} addLabel="Adicionar canal" campos={[{ k: "canal", label: "Canal", w: "170px" }, { k: "tom", label: "Tom e temas", tipo: "area" }, { k: "exemplo", label: "Exemplo", tipo: "area" }]} /></Field>
      <div className="mk-grid">
        <Field label="Em vez de dizer"><AutoText rows={2} value={d.em_vez_de} onChange={(v) => set("em_vez_de", v)} /></Field>
        <Field label="Dizemos"><AutoText rows={2} value={d.dizemos} onChange={(v) => set("dizemos", v)} /></Field>
      </div>
      <Field label="Tratamento"><AutoText rows={1} value={d.tratamento} onChange={(v) => set("tratamento", v)} /></Field>
    </div>
  );
}

function EditVisual({ d, set }) {
  return (
    <div className="mk-stack">
      <Field label="Cores"><ListaEditor items={d.cores} onChange={(v) => set("cores", v)} novo={{ hex: "#" }} addLabel="Adicionar cor" campos={[{ k: "nome", label: "Nome", w: "150px" }, { k: "hex", label: "HEX", tipo: "cor", w: "170px" }, { k: "papel", label: "Papel", w: "150px" }, { k: "uso", label: "Uso" }]} /></Field>
      <Field label="Tipografias" hint="nome igual ao do Google Fonts para pré-visualizar"><ListaEditor items={d.tipografias} onChange={(v) => set("tipografias", v)} addLabel="Adicionar tipografia" campos={[{ k: "nome", label: "Fonte", w: "160px" }, { k: "papel", label: "Papel" }, { k: "descricao", label: "Descrição", tipo: "area" }]} /></Field>
      <Field label="Logótipo"><AutoText rows={2} value={d.logotipo} onChange={(v) => set("logotipo", v)} /></Field>
      <Field label="Regras práticas" hint="uma por linha"><Linhas value={d.regras} onChange={(v) => set("regras", v)} rows={4} /></Field>
      <div className="mk-grid">
        <Field label="Fotografia"><AutoText rows={3} value={d.fotografia} onChange={(v) => set("fotografia", v)} /></Field>
        <Field label="Selos e parceiros"><AutoText rows={3} value={d.selos} onChange={(v) => set("selos", v)} /></Field>
      </div>
    </div>
  );
}

const VER = { sobre: VerSobre, personalidade: VerPersonalidade, e_nao_e: VerENaoE, voz: VerVoz, visual: VerVisual };
const EDIT = { sobre: EditSobre, personalidade: EditPersonalidade, e_nao_e: EditENaoE, voz: EditVoz, visual: EditVisual };

/* =========================================================================
   Ficheiros (guias PDF, logótipos, posts de referência)
   ========================================================================= */
function Ficheiros({ marca, lista, onGuardar, avisar }) {
  const [aCarregar, setACarregar] = useState(0);
  const [sobre, setSobre] = useState(false);
  const input = useRef(null);

  const carregar = async (files) => {
    const arr = [...(files || [])];
    if (!arr.length) return;
    setACarregar(arr.length);
    const novos = [];
    for (const f of arr) {
      if (f.size > 20 * 1024 * 1024) { avisar(`${f.name}: máximo 20 MB.`, "error"); continue; }
      const limpo = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_");
      const caminho = `marketing/${marca.id}/${Date.now()}-${limpo}`;
      const { error } = await supabase.storage.from("documents").upload(caminho, f, { contentType: f.type || undefined, upsert: false });
      if (error) { avisar(`${f.name}: ${error.message}`, "error"); continue; }
      const url = supabase.storage.from("documents").getPublicUrl(caminho).data.publicUrl;
      novos.push({ nome: f.name, url, tipo: f.type || "", tamanho: f.size, caminho, criado: new Date().toISOString() });
    }
    setACarregar(0);
    if (novos.length) {
      await onGuardar([...lista, ...novos]);
      avisar(`${novos.length} ficheiro${novos.length === 1 ? "" : "s"} adicionado${novos.length === 1 ? "" : "s"}.`);
    }
  };

  const remover = async (f) => {
    await onGuardar(lista.filter((x) => x.url !== f.url));
    if (f.caminho) supabase.storage.from("documents").remove([f.caminho]).catch(() => {});
  };

  const tam = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  return (
    <div className="mk-g-stack">
      <div
        className={`mk-drop mk-g-drop ${sobre ? "is-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => { e.preventDefault(); setSobre(false); carregar(e.dataTransfer.files); }}
      >
        <button type="button" className="mk-drop-empty" onClick={() => input.current?.click()} disabled={aCarregar > 0}>
          <I.Archive size={22} />
          <b>{aCarregar ? `A carregar ${aCarregar} ficheiro${aCarregar === 1 ? "" : "s"}…` : "Arraste guias, logótipos ou posts de referência"}</b>
          <span>PDF, imagens ou outros ficheiros · até 20 MB cada</span>
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => { carregar(e.target.files); e.target.value = ""; }} />
      </div>
      {lista.length > 0 && (
        <div className="mk-g-files">
          {lista.map((f) => {
            const img = /^image\//.test(f.tipo) || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.nome);
            const pdf = /pdf/i.test(f.tipo) || /\.pdf$/i.test(f.nome);
            return (
              <div key={f.url} className="mk-g-file">
                <a href={f.url} target="_blank" rel="noreferrer" className={`mk-g-file-thumb ${img ? "is-img" : ""}`}>
                  {img ? <img src={f.url} alt={f.nome} loading="lazy" /> : <span className={pdf ? "is-pdf" : ""}>{pdf ? "PDF" : (f.nome.split(".").pop() || "?").toUpperCase().slice(0, 4)}</span>}
                </a>
                <div className="mk-g-file-txt">
                  <a href={f.url} target="_blank" rel="noreferrer" title={f.nome}>{f.nome}</a>
                  <small>{f.tamanho ? tam(f.tamanho) : ""}</small>
                </div>
                <button type="button" className="mk-icon-btn is-sm is-danger" title="Remover" onClick={() => remover(f)}><I.Trash size={13} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Separador "Marca"
   ========================================================================= */
export default function MarcaGuia({ marca, onSalvarGuia, avisar }) {
  const guia = marca.guia || {};
  const [editar, setEditar] = useState(null); // id da secção
  const [draft, setDraft] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);
  const refs = useRef({});

  const abrirEdicao = (id) => {
    setEditar(id);
    setDraft(JSON.parse(JSON.stringify(guia[id] || {})));
  };
  const guardar = async () => {
    setAGuardar(true);
    const ok = await onSalvarGuia({ ...guia, [editar]: draft });
    setAGuardar(false);
    if (ok) { setEditar(null); setDraft(null); }
  };
  const irPara = (id) => refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const cores = (guia.visual?.cores || []).map((c) => normalizarHex(c.hex)).filter(Boolean);
  const preenchidas = SECCOES.filter((s) => (s.id === "ficheiros" ? (guia.ficheiros || []).length : !vazio(guia[s.id]))).length;

  return (
    <div className="mk-guia">
      <aside className="mk-guia-nav">
        {SECCOES.map((s) => {
          const ok = s.id === "ficheiros" ? (guia.ficheiros || []).length > 0 : !vazio(guia[s.id]);
          return (
            <button key={s.id} type="button" onClick={() => irPara(s.id)}>
              <s.icon size={15} /> {s.label}
              <i className={ok ? "is-ok" : ""} />
            </button>
          );
        })}
      </aside>

      <div className="mk-guia-main">
        <header className="mk-guia-hero" style={{ "--brand": marca.cor }}>
          <div className="mk-guia-hero-bg" />
          <MarcaLogo marca={marca} size={64} />
          <div className="mk-guia-hero-txt">
            <small>Guia de marca</small>
            <h2>{marca.nome}</h2>
            {(guia.sobre?.posicionamento || guia.personalidade?.resumo) && <p>{guia.sobre?.posicionamento || guia.personalidade?.resumo}</p>}
          </div>
          <div className="mk-guia-hero-side">
            {cores.length > 0 && <div className="mk-guia-strip">{cores.slice(0, 8).map((c, i) => <i key={i} style={{ background: c }} />)}</div>}
            <span>{preenchidas}/{SECCOES.length} secções preenchidas</span>
          </div>
        </header>

        {SECCOES.map((s) => {
          const conteudo = guia[s.id];
          const emEdicao = editar === s.id;
          const Ver = VER[s.id];
          const Edit = EDIT[s.id];
          const estaVazio = s.id === "ficheiros" ? false : vazio(conteudo);
          return (
            <section key={s.id} className={`mk-g-sec ${emEdicao ? "is-editing" : ""}`} ref={(el) => { refs.current[s.id] = el; }}>
              <header className="mk-g-sec-head">
                <span className="mk-g-sec-ico"><s.icon size={17} /></span>
                <h3>{s.label}</h3>
                <span className="mk-spacer" />
                {s.id !== "ficheiros" && !emEdicao && !estaVazio && (
                  <button type="button" className="mk-btn is-ghost is-sm" onClick={() => abrirEdicao(s.id)} disabled={!!editar}><I.Pen size={13} /> Editar</button>
                )}
                {emEdicao && (
                  <>
                    <button type="button" className="mk-btn is-ghost is-sm" onClick={() => { setEditar(null); setDraft(null); }}>Cancelar</button>
                    <button type="button" className="mk-btn is-primary is-sm" onClick={guardar} disabled={aGuardar}><I.Check size={13} /> {aGuardar ? "A guardar…" : "Guardar"}</button>
                  </>
                )}
              </header>
              {s.id === "ficheiros" ? (
                <Ficheiros marca={marca} lista={guia.ficheiros || []} onGuardar={(lista) => onSalvarGuia({ ...guia, ficheiros: lista })} avisar={avisar} />
              ) : emEdicao ? (
                <Edit d={draft} set={(k, v) => setDraft((p) => ({ ...p, [k]: v }))} />
              ) : estaVazio ? (
                <button type="button" className="mk-g-empty" onClick={() => abrirEdicao(s.id)} disabled={!!editar}>
                  <I.Plus size={16} /> Preencher “{s.label}”
                </button>
              ) : (
                <Ver s={conteudo} />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
