import { useId, useLayoutEffect, useRef, useState } from "react";
import FancySelect from "../FancySelect";
import { I } from "./mkIcons";
import { iniciais, corPessoa } from "./mkUtils";

/** Textarea que cresce com o conteúdo */
export function AutoText({ value, onChange, onBlur, placeholder, rows = 2, className = "", autoFocus = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className={`mk-input mk-textarea ${className}`}
      value={value || ""}
      rows={rows}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

export function Field({ label, hint, children, wide = false }) {
  return (
    <div className={`mk-field ${wide ? "is-wide" : ""}`}>
      <span className="mk-field-label">{label}{hint && <em>{hint}</em>}</span>
      {children}
    </div>
  );
}

/** Botões de escolha (simples ou múltipla). options: string[] ou { id, label, cor }[] */
export function Chips({ options, value, onChange, multi = false, colorOf }) {
  const sel = multi ? (Array.isArray(value) ? value : value ? [value] : []) : value;
  const isOn = (v) => (multi ? sel.includes(v) : sel === v);
  const toggle = (v) => {
    if (multi) onChange(isOn(v) ? sel.filter((x) => x !== v) : [...sel, v]);
    else onChange(isOn(v) ? null : v);
  };
  // Valores guardados que já não estão na lista (ex.: vindos do Notion) continuam visíveis
  const ids = new Set(options.map((o) => (typeof o === "string" ? o : o.id)));
  const extras = (multi ? sel : sel ? [sel] : []).filter((v) => !ids.has(v));
  const todas = [...options, ...extras];
  return (
    <div className="mk-chips">
      {todas.map((o) => {
        const v = typeof o === "string" ? o : o.id;
        const label = typeof o === "string" ? o : (o.label || o.id);
        const cor = colorOf ? colorOf(o) : null;
        return (
          <button
            key={v}
            type="button"
            className={`mk-chip ${isOn(v) ? "is-on" : ""}`}
            style={cor ? { "--c": cor } : undefined}
            onClick={() => toggle(v)}
          >
            {cor && <i />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Lista de etiquetas (Enter ou vírgula para adicionar). `sugestoes` aparecem no autocompletar. */
export function TagInput({ value, onChange, placeholder, prefix = "", sugestoes = [], tom }) {
  const [txt, setTxt] = useState("");
  const listId = useId();
  const tags = value || [];
  const add = (raw = txt) => {
    const parts = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
      .map((s) => (prefix && !s.startsWith(prefix) ? prefix + s.replace(/\s+/g, "") : s));
    if (!parts.length) return;
    onChange([...tags, ...parts.filter((p) => !tags.includes(p))]);
    setTxt("");
  };
  const livres = sugestoes.filter((s) => !tags.includes(s));
  return (
    <div className={`mk-tags ${tom ? `is-${tom}` : ""}`}>
      {tags.map((t) => (
        <span key={t} className="mk-tag">
          {t}
          <button type="button" aria-label={`Remover ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}><I.X size={11} sw={3} /></button>
        </span>
      ))}
      <input
        value={txt}
        list={livres.length ? listId : undefined}
        placeholder={tags.length ? "" : placeholder}
        onChange={(e) => {
          const v = e.target.value;
          // Escolheu uma sugestão do autocompletar: adiciona logo
          if (livres.includes(v)) add(v);
          else setTxt(v);
        }}
        onBlur={() => add()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          else if (e.key === "Backspace" && !txt && tags.length) onChange(tags.slice(0, -1));
        }}
      />
      {livres.length > 0 && <datalist id={listId}>{livres.map((s) => <option key={s} value={s} />)}</datalist>}
    </div>
  );
}

/** Foto ou iniciais de um colaborador */
export function Avatar({ pessoa, size = 26 }) {
  if (!pessoa) return <span className="mk-avatar is-empty" style={{ width: size, height: size }}><I.User size={size * 0.5} /></span>;
  if (pessoa.avatar_url) return <img className="mk-avatar" src={pessoa.avatar_url} alt="" style={{ width: size, height: size }} />;
  return <span className="mk-avatar" style={{ width: size, height: size, background: corPessoa(pessoa.id), fontSize: size * 0.38 }}>{iniciais(pessoa.nome)}</span>;
}

/** "Cara" de uma persona: inicial do nome na cor da persona */
export function PersonaFace({ persona, size = 30 }) {
  const cor = corPessoa(`${persona?.nome_persona || ""}${persona?.papel || ""}`);
  return (
    <span className="mk-pface" style={{ width: size, height: size, fontSize: size * 0.42, "--pc": cor }}>
      {(persona?.nome_persona || persona?.papel || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** Lista de textos editada como uma linha por item */
export function Linhas({ value, onChange, placeholder, rows = 4 }) {
  const [txt, setTxt] = useState(() => (value || []).join("\n"));
  return (
    <AutoText
      rows={rows}
      value={txt}
      placeholder={placeholder}
      onChange={(v) => { setTxt(v); onChange(v.split("\n").map((x) => x.trim()).filter(Boolean)); }}
    />
  );
}

/**
 * Lista de linhas com vários campos (ex.: cores, valores, canais).
 * campos: [{ k, label, tipo: "text" | "area" | "cor" | "num", w }]
 */
export function ListaEditor({ items, onChange, campos, novo = {}, addLabel = "Adicionar", ctx = {} }) {
  const lista = items || [];
  const setItem = (i, k, v) => onChange(lista.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const mover = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    const arr = lista.slice();
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  return (
    <div className="mk-led">
      {lista.map((it, i) => (
        <div className="mk-led-row" key={i}>
          <div className="mk-led-fields">
            {campos.map((c) => {
              const largo = c.tipo === "area" || c.tipo === "personas";
              const ph = (c.dica && it.dica) || c.placeholder;
              const v = it[c.k];
              const set = (val) => setItem(i, c.k, val);
              let campo;
              if (c.tipo === "area") campo = <AutoText rows={2} value={v} onChange={set} placeholder={ph} />;
              else if (c.tipo === "cor") {
                campo = (
                  <span className="mk-led-cor">
                    <input type="color" value={/^#[0-9a-f]{6}$/i.test(v || "") ? v : "#000000"} onChange={(e) => set(e.target.value.toUpperCase())} />
                    <input className="mk-input" value={v || ""} placeholder="#000000" onChange={(e) => set(e.target.value.toUpperCase())} />
                  </span>
                );
              } else if (c.tipo === "select" || c.tipo === "frente") {
                const opcoes = c.tipo === "frente" ? (ctx.frentes || []) : (c.opcoes || []);
                campo = (
                  <select className="mk-input" value={v || ""} onChange={(e) => set(e.target.value || null)}>
                    <option value="">—</option>
                    {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
                    {v && !opcoes.includes(v) && <option value={v}>{v}</option>}
                  </select>
                );
              } else if (c.tipo === "persona") {
                campo = (
                  <select className="mk-input" value={v || ""} onChange={(e) => set(e.target.value || null)}>
                    <option value="">—</option>
                    {(ctx.personas || []).map((p) => <option key={p.id} value={p.id}>{p.nome_persona || "Sem nome"}{p.papel ? ` · ${p.papel}` : ""}</option>)}
                  </select>
                );
              } else if (c.tipo === "personas") {
                const sel = Array.isArray(v) ? v : [];
                campo = (ctx.personas || []).length ? (
                  <div className="mk-led-pp">
                    {ctx.personas.map((p) => {
                      const on = sel.includes(p.id);
                      return (
                        <button key={p.id} type="button" className={on ? "is-on" : ""} onClick={() => set(on ? sel.filter((x) => x !== p.id) : [...sel, p.id])}>
                          <PersonaFace persona={p} size={18} /> {p.nome_persona || "—"}
                        </button>
                      );
                    })}
                  </div>
                ) : <small className="mk-led-none">Sem personas nesta marca</small>;
              } else if (c.tipo === "estado") {
                campo = (
                  <div className="mk-led-pp">
                    {(ctx.estados || []).map((e) => (
                      <button key={e.id} type="button" className={v === e.id ? "is-on" : ""} style={{ "--c": e.cor }} onClick={() => set(v === e.id ? null : e.id)}>
                        <i style={{ background: e.cor }} /> {e.label}
                      </button>
                    ))}
                  </div>
                );
              } else if (c.tipo === "data") {
                campo = <input className="mk-input" type="date" value={v || ""} onChange={(e) => set(e.target.value || null)} />;
              } else {
                campo = <input className="mk-input" type={c.tipo === "num" ? "number" : "text"} value={v ?? ""} placeholder={ph} onChange={(e) => set(c.tipo === "num" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} />;
              }
              return (
                <div key={c.k} className={`mk-led-f ${largo ? (c.meia ? "is-half" : "is-wide") : ""} ${c.resultado ? "is-result" : ""}`} style={c.w && !largo ? { flex: `0 0 ${c.w}` } : undefined}>
                  <span>{c.label}</span>
                  {campo}
                </div>
              );
            })}
          </div>
          <div className="mk-led-actions">
            <button type="button" className="mk-icon-btn is-sm" title="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
            <button type="button" className="mk-icon-btn is-sm" title="Descer" disabled={i === lista.length - 1} onClick={() => mover(i, 1)}>↓</button>
            <button type="button" className="mk-icon-btn is-sm is-danger" title="Remover" onClick={() => onChange(lista.filter((_, j) => j !== i))}><I.Trash size={13} /></button>
          </div>
        </div>
      ))}
      <button type="button" className="mk-add" onClick={() => onChange([...lista, { ...novo }])}><I.Plus size={14} /> {addLabel}</button>
    </div>
  );
}

/** Várias pessoas (responsáveis): avatares escolhidos + menu para adicionar */
export function PessoasPicker({ value, perfis, onChange }) {
  const ids = Array.isArray(value) ? value : [];
  const escolhidas = ids.map((id) => perfis.find((p) => p.id === id)).filter(Boolean);
  const livres = perfis.filter((p) => !ids.includes(p.id));
  return (
    <div className="mk-people">
      {escolhidas.map((p) => (
        <span key={p.id} className="mk-person">
          <Avatar pessoa={p} size={22} />
          {p.nome?.split(" ")[0] || "—"}
          <button type="button" aria-label={`Remover ${p.nome}`} onClick={() => onChange(ids.filter((x) => x !== p.id))}><I.X size={11} sw={3} /></button>
        </span>
      ))}
      {livres.length > 0 && (
        <FancySelect
          className="mk-people-add"
          value=""
          onChange={(v) => v && onChange([...ids, v])}
          placeholder={escolhidas.length ? "+ Adicionar" : "Escolher pessoa"}
          menuWidth={260}
          options={livres.map((p) => ({ value: p.id, label: p.nome || "Sem nome", icon: <Avatar pessoa={p} size={20} /> }))}
        />
      )}
    </div>
  );
}

/** Pilha de avatares (cartões) */
export function AvatarStack({ pessoas, size = 24, max = 3 }) {
  if (!pessoas.length) return <Avatar pessoa={null} size={size} />;
  return (
    <span className="mk-avstack" title={pessoas.map((p) => p.nome).join(", ")}>
      {pessoas.slice(0, max).map((p) => <Avatar key={p.id} pessoa={p} size={size} />)}
      {pessoas.length > max && <em style={{ width: size, height: size }}>+{pessoas.length - max}</em>}
    </span>
  );
}
