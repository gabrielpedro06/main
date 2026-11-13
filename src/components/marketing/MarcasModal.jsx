import { useEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabase";
import ColorPicker from "./ColorPicker";
import { I } from "./mkIcons";
import { extrairCores, textoSobre, normalizarHex } from "./mkColor";
import { iniciais } from "./mkUtils";
import { CORES_MARCA } from "../../constants/marketing";

const TIPOS_LOGO = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_LOGO = 2 * 1024 * 1024;

/** Logo da marca (ou iniciais na cor da marca) */
export function MarcaLogo({ marca, size = 28, src }) {
  const url = src ?? marca?.logo_url;
  const cor = normalizarHex(marca?.cor) || "#2563eb";
  if (url) {
    return (
      <span className="mk-logo" style={{ width: size, height: size, padding: Math.max(2, size * 0.1) }}>
        <img src={url} alt="" />
      </span>
    );
  }
  return (
    <span className="mk-logo is-initials" style={{ width: size, height: size, background: cor, color: textoSobre(cor), fontSize: size * 0.38 }}>
      {iniciais(marca?.nome || "?")}
    </span>
  );
}

const VAZIA = { nome: "", cor: CORES_MARCA[1], logo_url: null, ativo: true };

export default function MarcasModal({ marcas, contagem, onClose, onSalvar, onEliminar }) {
  const [sel, setSel] = useState(() => marcas[0]?.id || "nova");
  const [draft, setDraft] = useState(() => (marcas[0] ? { ...marcas[0] } : { ...VAZIA }));
  const [ficheiro, setFicheiro] = useState(null);
  const [preview, setPreview] = useState(null); // object URL do ficheiro escolhido
  const [sugestoes, setSugestoes] = useState([]);
  const [corMexida, setCorMexida] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [sobreDrop, setSobreDrop] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const inputFile = useRef(null);
  const pedido = useRef(0);

  // Liberta o object URL anterior
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Esc fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cores do logo existente da primeira marca
  useEffect(() => {
    const url = marcas[0]?.logo_url;
    if (!url) return undefined;
    let vivo = true;
    extrairCores(url).then((c) => { if (vivo) setSugestoes(c); });
    return () => { vivo = false; };
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const escolher = (m) => {
    const id = m ? m.id : "nova";
    setSel(id);
    setDraft(m ? { ...m } : { ...VAZIA });
    setFicheiro(null);
    setPreview(null);
    setErro("");
    setCorMexida(!!m);
    setConfirmDel(false);
    setSugestoes([]);
    const n = ++pedido.current;
    if (m?.logo_url) extrairCores(m.logo_url).then((c) => { if (pedido.current === n) setSugestoes(c); });
  };

  const receberFicheiro = (f) => {
    if (!f) return;
    if (!TIPOS_LOGO.includes(f.type)) { setErro("Formato não suportado. Use PNG, JPG, SVG ou WebP."); return; }
    if (f.size > MAX_LOGO) { setErro("O logo tem de ter até 2 MB."); return; }
    setErro("");
    const url = URL.createObjectURL(f);
    setFicheiro(f);
    setPreview(url);
    const n = ++pedido.current;
    extrairCores(url).then((c) => {
      if (pedido.current !== n) return;
      setSugestoes(c);
      // Marca nova sem cor escolhida: adota a cor principal do logo
      if (!corMexida && c[0]) setDraft((d) => ({ ...d, cor: c[0] }));
    });
  };

  const removerLogo = () => {
    setFicheiro(null);
    setPreview(null);
    setDraft((d) => ({ ...d, logo_url: null }));
    setSugestoes([]);
  };

  const guardar = async () => {
    const nome = draft.nome.trim();
    if (!nome) { setErro("Dê um nome à marca."); return; }
    setAGuardar(true);
    setErro("");
    try {
      let logo_url = draft.logo_url || null;
      if (ficheiro) {
        const ext = (ficheiro.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const caminho = `marcas/${sel === "nova" ? crypto.randomUUID() : sel}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(caminho, ficheiro, { contentType: ficheiro.type, upsert: true });
        if (upErr) throw upErr;
        logo_url = supabase.storage.from("avatars").getPublicUrl(caminho).data.publicUrl;
      }
      const campos = { nome, cor: normalizarHex(draft.cor) || CORES_MARCA[1], logo_url, ativo: draft.ativo !== false };
      const linha = await onSalvar(sel === "nova" ? null : sel, campos);
      if (linha) escolher(linha);
    } catch (e) {
      setErro(e.message || "Não foi possível guardar.");
    } finally {
      setAGuardar(false);
    }
  };

  const atual = marcas.find((m) => m.id === sel);
  const alterado = sel === "nova"
    ? !!(draft.nome.trim() || ficheiro)
    : !!atual && (ficheiro || draft.nome !== atual.nome || draft.cor !== atual.cor || (draft.logo_url || null) !== (atual.logo_url || null));
  const logoVisivel = preview || draft.logo_url;
  const cor = normalizarHex(draft.cor) || "#2563eb";
  const nConteudos = sel === "nova" ? 0 : contagem[sel] || 0;

  return (
    <div className="mk-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mk-modal mk-brands-modal" role="dialog" aria-label="Marcas">
        <div className="mk-modal-head">
          <div>
            <h3>Marcas</h3>
            <p>Cada marca tem o seu fluxo, ideias e calendário.</p>
          </div>
          <button type="button" className="mk-icon-btn" onClick={onClose} aria-label="Fechar"><I.X size={18} /></button>
        </div>

        <div className="mk-bm">
          {/* Lista */}
          <div className="mk-bm-list">
            {marcas.map((m) => (
              <button key={m.id} type="button" className={`mk-bm-item ${sel === m.id ? "is-on" : ""} ${m.ativo ? "" : "is-off"}`} style={{ "--c": m.cor }} onClick={() => escolher(m)}>
                <MarcaLogo marca={m} size={34} />
                <span className="mk-bm-item-txt">
                  <b>{m.nome}</b>
                  <small>{m.ativo ? `${contagem[m.id] || 0} conteúdos` : "Oculta"}</small>
                </span>
                <i style={{ background: m.cor }} />
              </button>
            ))}
            <button type="button" className={`mk-bm-item is-new ${sel === "nova" ? "is-on" : ""}`} onClick={() => escolher(null)}>
              <span className="mk-logo is-add"><I.Plus size={16} /></span>
              <span className="mk-bm-item-txt"><b>Nova marca</b><small>Nome, logo e cor</small></span>
            </button>
          </div>

          {/* Editor */}
          <div className="mk-bm-editor" key={sel}>
            <div className="mk-bm-preview" style={{ "--brand": cor }}>
              <div className="mk-bm-preview-bg" />
              <MarcaLogo marca={{ ...draft, cor }} src={logoVisivel || null} size={52} />
              <div className="mk-bm-preview-txt">
                <b>{draft.nome.trim() || "Nome da marca"}</b>
                <span className="mk-bm-chip"><MarcaLogo marca={{ ...draft, cor }} src={logoVisivel || null} size={18} /> {draft.nome.trim() || "Marca"} <em>12</em></span>
              </div>
            </div>

            <div className="mk-field">
              <span className="mk-field-label">Nome</span>
              <input className="mk-input" value={draft.nome} placeholder="Ex.: Neomarca" autoFocus={sel === "nova"} onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") guardar(); }} />
            </div>

            <div className="mk-field">
              <span className="mk-field-label">Logo <em>PNG, SVG, JPG ou WebP · até 2 MB</em></span>
              <div
                className={`mk-drop ${sobreDrop ? "is-over" : ""} ${logoVisivel ? "has-logo" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setSobreDrop(true); }}
                onDragLeave={() => setSobreDrop(false)}
                onDrop={(e) => { e.preventDefault(); setSobreDrop(false); receberFicheiro(e.dataTransfer.files?.[0]); }}
              >
                {logoVisivel ? (
                  <>
                    <span className="mk-drop-img"><img src={logoVisivel} alt="Logo" /></span>
                    <div className="mk-drop-actions">
                      <button type="button" className="mk-btn is-ghost is-sm" onClick={() => inputFile.current?.click()}><I.Image size={14} /> Trocar</button>
                      <button type="button" className="mk-btn is-danger-soft is-sm" onClick={removerLogo}><I.Trash size={14} /> Remover</button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="mk-drop-empty" onClick={() => inputFile.current?.click()}>
                    <I.Image size={22} />
                    <b>Arraste o logo para aqui</b>
                    <span>ou clique para escolher</span>
                  </button>
                )}
                <input ref={inputFile} type="file" accept={TIPOS_LOGO.join(",")} hidden onChange={(e) => { receberFicheiro(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            </div>

            <div className="mk-field">
              <span className="mk-field-label">Cor da marca</span>
              <ColorPicker
                value={cor}
                onChange={(hex) => { setCorMexida(true); setDraft((d) => ({ ...d, cor: hex })); }}
                sugestoes={sugestoes}
                presets={CORES_MARCA}
              />
            </div>

            {erro && <p className="mk-bm-error"><I.Alert size={14} /> {erro}</p>}

            <div className="mk-bm-foot">
              {sel !== "nova" && (
                <>
                  <button type="button" className="mk-btn is-ghost is-sm" onClick={() => onSalvar(sel, { ativo: !atual?.ativo }).then((l) => setDraft((d) => ({ ...d, ativo: l.ativo }))).catch((e) => setErro(e.message))}>
                    {atual?.ativo ? "Ocultar" : "Mostrar"}
                  </button>
                  {nConteudos === 0 && (confirmDel ? (
                    <button type="button" className="mk-btn is-danger is-sm" autoFocus onBlur={() => setConfirmDel(false)} onClick={async () => { await onEliminar(sel); escolher(marcas.find((m) => m.id !== sel) || null); }}>Confirmar</button>
                  ) : (
                    <button type="button" className="mk-icon-btn is-danger" title="Eliminar marca" onClick={() => setConfirmDel(true)}><I.Trash size={15} /></button>
                  ))}
                </>
              )}
              <span className="mk-spacer" />
              {alterado && sel !== "nova" && <button type="button" className="mk-btn is-ghost is-sm" onClick={() => escolher(atual)}>Descartar</button>}
              <button type="button" className="mk-btn is-primary is-sm" disabled={aGuardar || !alterado} onClick={guardar}>
                {aGuardar ? "A guardar…" : sel === "nova" ? <><I.Plus size={14} /> Criar marca</> : <><I.Check size={14} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
