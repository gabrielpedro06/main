import { useMemo, useRef, useState } from "react";
import { I } from "./mkIcons";
import { conteudosDoCsv } from "./mkCsvFluxo";
import { ESTADOS_TODOS, estadoInfo } from "../../constants/marketing";
import { norm } from "./mkUtils";

/** Janela: importar CSV do Fluxo de Conteúdos / Banco de Ideias do Notion para a marca atual */
export default function ImportarFluxo({ marca, conteudos, personas, perfis, onClose, onImportar }) {
  const [res, setRes] = useState(null); // { conteudos, nomeFicheiro }
  const [erro, setErro] = useState("");
  const [incluirDup, setIncluirDup] = useState(false);
  const [semArquivo, setSemArquivo] = useState(false);
  const [aImportar, setAImportar] = useState(false);
  const [sobre, setSobre] = useState(false);
  const input = useRef(null);

  const ler = async (f) => {
    if (!f) return;
    setErro("");
    try {
      const existentes = new Set(conteudos.map((c) => norm(c.titulo).trim()));
      const r = conteudosDoCsv(await f.text(), { personas, perfis, existentes });
      setRes({ ...r, nomeFicheiro: f.name });
      setSemArquivo(r.fonte === "banco");
    } catch (e) {
      setRes(null);
      setErro(e.message || "Não foi possível ler o ficheiro.");
    }
  };

  const resumo = useMemo(() => {
    if (!res) return null;
    const lista = res.conteudos.filter((c) => (incluirDup || !c._info.duplicado) && !(semArquivo && c.estado === "arquivado"));
    const arquivados = res.conteudos.filter((c) => c.estado === "arquivado").length;
    const porEstado = {};
    for (const c of lista) porEstado[c.estado] = (porEstado[c.estado] || 0) + 1;
    const personasFalta = [...new Set(res.conteudos.flatMap((c) => c._info.personasEmFalta))];
    const respFalta = [...new Set(res.conteudos.flatMap((c) => c._info.respEmFalta))];
    const campanhas = [...new Set(lista.map((c) => c.campanha).filter(Boolean))];
    const anexos = lista.reduce((n, c) => n + c.anexos.length, 0);
    return { lista, arquivados, porEstado, personasFalta, respFalta, campanhas, anexos, dups: res.conteudos.filter((c) => c._info.duplicado).length };
  }, [res, incluirDup, semArquivo]);

  const confirmar = async () => {
    setAImportar(true);
    const linhas = resumo.lista.map((c) => { const r = { ...c }; delete r._info; return r; });
    const n = await onImportar(linhas);
    setAImportar(false);
    if (n) onClose();
  };

  return (
    <div className="mk-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mk-modal mk-imp" role="dialog" aria-label="Importar do Notion" style={{ "--brand": marca.cor }}>
        <div className="mk-modal-head">
          <div>
            <h3>Importar conteúdos do Notion</h3>
            <p>CSV do <b>Fluxo de Conteúdos</b> ou do <b>Banco de Ideias</b> (Notion → ••• → Export → Markdown &amp; CSV). Entra tudo na marca <b>{marca.nome}</b>.</p>
          </div>
          <button type="button" className="mk-icon-btn" onClick={onClose} aria-label="Fechar"><I.X size={18} /></button>
        </div>

        <div
          className={`mk-drop ${sobre ? "is-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => { e.preventDefault(); setSobre(false); ler(e.dataTransfer.files?.[0]); }}
        >
          <button type="button" className="mk-drop-empty" onClick={() => input.current?.click()}>
            <I.Archive size={22} />
            <b>{res ? res.nomeFicheiro : "Arraste o ficheiro .csv para aqui"}</b>
            <span>{res ? "Clique para escolher outro" : "ou clique para escolher"}</span>
          </button>
          <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => { ler(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        {erro && <p className="mk-bm-error"><I.Alert size={14} /> {erro}</p>}

        {resumo && (
          <div className="mk-imp-sum">
            <div className="mk-imp-big"><b>{resumo.lista.length}</b> conteúdos para importar</div>
            <div className="mk-imp-states">
              {ESTADOS_TODOS.filter((e) => resumo.porEstado[e.id]).map((e) => (
                <span key={e.id} style={{ "--c": e.cor }}><i />{estadoInfo(e.id).label} <b>{resumo.porEstado[e.id]}</b></span>
              ))}
            </div>
            <ul className="mk-imp-notes">
              {resumo.campanhas.length > 0 && <li><I.Flag size={13} /> {resumo.campanhas.length} campanha{resumo.campanhas.length === 1 ? "" : "s"}: {resumo.campanhas.slice(0, 4).join(" · ")}{resumo.campanhas.length > 4 ? "…" : ""}</li>}
              {resumo.arquivados > 0 && (
                <li>
                  <I.Archive size={13} /> {resumo.arquivados} arquivado{resumo.arquivados === 1 ? "" : "s"} no ficheiro{res.fonte === "banco" ? " (no Banco de Ideias, quase sempre são ideias que já passaram para o fluxo)" : ""}.
                  <label><input type="checkbox" checked={semArquivo} onChange={(e) => setSemArquivo(e.target.checked)} /> não importar arquivados</label>
                </li>
              )}
              {resumo.dups > 0 && (
                <li className="is-warn">
                  <I.Alert size={13} /> {resumo.dups} já existe{resumo.dups === 1 ? "" : "m"} nesta marca (mesmo título).
                  <label><input type="checkbox" checked={incluirDup} onChange={(e) => setIncluirDup(e.target.checked)} /> importar mesmo assim</label>
                </li>
              )}
              {resumo.personasFalta.length > 0 && <li className="is-warn"><I.User size={13} /> Personas não encontradas (ficam por ligar): {resumo.personasFalta.join(", ")}. Importe primeiro as personas no separador Personas.</li>}
              {resumo.respFalta.length > 0 && <li className="is-warn"><I.User size={13} /> Responsáveis sem conta no Bizin: {resumo.respFalta.join(", ")}.</li>}
              {resumo.anexos > 0 && <li><I.Archive size={13} /> {resumo.anexos === 1 ? "1 ficheiro do Notion fica listado" : `${resumo.anexos} ficheiros do Notion ficam listados`} como “por carregar” no conteúdo (o Notion não exporta os PDFs no CSV).</li>}
            </ul>
          </div>
        )}

        <div className="mk-bm-foot">
          <span className="mk-spacer" />
          <button type="button" className="mk-btn is-ghost is-sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="mk-btn is-primary is-sm" disabled={!resumo?.lista.length || aImportar} onClick={confirmar}>
            {aImportar ? "A importar…" : `Importar ${resumo?.lista.length || ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
