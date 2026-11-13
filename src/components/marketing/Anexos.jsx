import { useRef, useState } from "react";
import { supabase } from "../../services/supabase";
import { I } from "./mkIcons";

const CATEGORIAS_ANEXO = [
  { id: "briefing", label: "Briefing" },
  { id: "design", label: "Design" },
  { id: "outro", label: "Outro" },
];

const tam = (b) => (!b ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const ehImagem = (f) => /^image\//.test(f.tipo || "") || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.nome || "");
const ehPdf = (f) => /pdf/i.test(f.tipo || "") || /\.pdf$/i.test(f.nome || "");

/**
 * Ficheiros anexos a um conteúdo (bucket "documents", pasta marketing/<marca>/conteudos/<id>/).
 * value: [{ nome, url, caminho, tipo, tamanho, categoria }]
 */
export default function Anexos({ value, onChange, pasta, categoriaInicial = "outro", avisar }) {
  const lista = Array.isArray(value) ? value : [];
  const [aCarregar, setACarregar] = useState(0);
  const [sobre, setSobre] = useState(false);
  const [categoria, setCategoria] = useState(categoriaInicial);
  const input = useRef(null);

  const carregar = async (files) => {
    const arr = [...(files || [])];
    if (!arr.length) return;
    setACarregar(arr.length);
    const novos = [];
    for (const f of arr) {
      if (f.size > 25 * 1024 * 1024) { avisar?.(`${f.name}: máximo 25 MB.`, "error"); continue; }
      const limpo = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_");
      const caminho = `${pasta}/${Date.now()}-${limpo}`;
      const { error } = await supabase.storage.from("documents").upload(caminho, f, { contentType: f.type || undefined, upsert: false });
      if (error) { avisar?.(`${f.name}: ${error.message}`, "error"); continue; }
      const url = supabase.storage.from("documents").getPublicUrl(caminho).data.publicUrl;
      novos.push({ nome: f.name, url, caminho, tipo: f.type || "", tamanho: f.size, categoria });
    }
    setACarregar(0);
    if (novos.length) onChange([...lista, ...novos]);
  };

  const remover = (f) => {
    onChange(lista.filter((x) => x !== f));
    if (f.caminho) supabase.storage.from("documents").remove([f.caminho]).catch(() => {});
  };
  const mudarCategoria = (f, cat) => onChange(lista.map((x) => (x === f ? { ...x, categoria: cat } : x)));

  return (
    <div className="mk-anexos">
      {lista.length > 0 && (
        <div className="mk-anexos-list">
          {lista.map((f, i) => (
            <div key={f.url || i} className="mk-anexo">
              <a className={`mk-anexo-thumb ${ehImagem(f) && f.url ? "is-img" : ""}`} href={f.url || undefined} target="_blank" rel="noreferrer">
                {ehImagem(f) && f.url ? <img src={f.url} alt="" loading="lazy" /> : <span className={ehPdf(f) ? "is-pdf" : ""}>{ehPdf(f) ? "PDF" : (f.nome?.split(".").pop() || "?").toUpperCase().slice(0, 4)}</span>}
              </a>
              <div className="mk-anexo-txt">
                {f.url ? <a href={f.url} target="_blank" rel="noreferrer" title={f.nome}>{f.nome}</a> : <b title="Ficheiro referido no Notion — carregue-o aqui">{f.nome}</b>}
                <span>
                  <select value={f.categoria || "outro"} onChange={(e) => mudarCategoria(f, e.target.value)} aria-label="Tipo de anexo">
                    {CATEGORIAS_ANEXO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  {f.url ? tam(f.tamanho) : <em>por carregar</em>}
                </span>
              </div>
              <button type="button" className="mk-icon-btn is-sm is-danger" title="Remover" onClick={() => remover(f)}><I.Trash size={13} /></button>
            </div>
          ))}
        </div>
      )}
      <div
        className={`mk-anexos-drop ${sobre ? "is-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => { e.preventDefault(); setSobre(false); carregar(e.dataTransfer.files); }}
      >
        <button type="button" onClick={() => input.current?.click()} disabled={aCarregar > 0}>
          <I.Archive size={15} /> {aCarregar ? `A carregar ${aCarregar}…` : "Anexar ficheiros"}
        </button>
        <span>ou arraste para aqui · como</span>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Tipo dos novos anexos">
          {CATEGORIAS_ANEXO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input ref={input} type="file" multiple hidden onChange={(e) => { carregar(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
  );
}
