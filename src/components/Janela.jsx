// =====================================================================
// Janela (modal) da app, já com o design comum (styles/janelas.css):
// fundo desfocado, caixa em vidro, cabeçalho com ícone + título + fechar,
// corpo e rodapé com botões. No telemóvel abre como folha que sobe de baixo
// (variante "formulario"); a de "confirmacao" fica ao centro.
// Esc e clique fora fecham; o "voltar" do telemóvel e arrastar para baixo
// também (GestosJanelas, porque o fundo tem a classe jn-fundo).
//
//   <Janela aberta={x} aoFechar={() => setX(false)} titulo="Nova tarefa" icone={<Icons.Plus />}
//           rodape={<><button type="button" onClick={fechar}>Cancelar</button><button className="is-primary" type="submit" form="f">Criar</button></>}>
//     <form id="f">…</form>
//   </Janela>
//
// Para confirmações simples, usar antes confirmar() de utils/dialogo.js.
// =====================================================================
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const X = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

/**
 * @param {object} props
 * @param {boolean} props.aberta
 * @param {() => void} props.aoFechar
 * @param {React.ReactNode} [props.titulo]
 * @param {React.ReactNode} [props.subtitulo]
 * @param {React.ReactNode} [props.icone]
 * @param {React.ReactNode} [props.rodape] botões (<button>; classes is-primary / is-danger / is-ok mudam a cor)
 * @param {"formulario"|"confirmacao"} [props.variante="formulario"]
 * @param {number} [props.largura=560] largura máxima em px (computador)
 * @param {boolean} [props.bloquear] true = não fecha com Esc/clique fora (ex.: a gravar)
 */
export default function Janela({ aberta, aoFechar, titulo, subtitulo, icone, rodape, children, variante = "formulario", largura = 560, bloquear = false }) {
  const idTitulo = useId();
  const caixaRef = useRef(null);
  const focoAntes = useRef(null);

  useEffect(() => {
    if (!aberta) return undefined;
    focoAntes.current = document.activeElement;
    // foco no primeiro campo (ou na caixa) para o teclado funcionar logo
    const t = setTimeout(() => {
      const campo = caixaRef.current?.querySelector("input:not([type=hidden]), textarea, select, button:not(.jn-fechar)");
      (campo || caixaRef.current)?.focus?.();
    }, 30);
    const onKey = (e) => {
      if (e.key === "Escape" && !bloquear) { e.stopPropagation(); aoFechar?.(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      setTimeout(() => focoAntes.current?.focus?.(), 0);
    };
  }, [aberta, bloquear, aoFechar]);

  if (!aberta) return null;
  const confirmacao = variante === "confirmacao";

  return createPortal(
    <div className="jn-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget && !bloquear) aoFechar?.(); }}>
      <div
        ref={caixaRef}
        className={`jn-caixa ${confirmacao ? "is-confirmacao" : "is-folha"}`}
        role={confirmacao ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titulo ? idTitulo : undefined}
        tabIndex={-1}
        style={{ maxWidth: confirmacao ? undefined : largura }}
      >
        {confirmacao ? (
          <>
            {icone && <span className="jn-caixa-ico" aria-hidden="true">{icone}</span>}
            {titulo && <h2 id={idTitulo}>{titulo}</h2>}
            {subtitulo && <p>{subtitulo}</p>}
            {children}
            {rodape && <div className="jn-acoes">{rodape}</div>}
          </>
        ) : (
          <>
            <header className="jn-cabecalho">
              {icone && <span className="jn-cabecalho-ico" aria-hidden="true">{icone}</span>}
              <div className="jn-cabecalho-txt">
                {titulo && <h2 id={idTitulo}>{titulo}</h2>}
                {subtitulo && <p>{subtitulo}</p>}
              </div>
              <button type="button" className="jn-fechar" onClick={aoFechar} aria-label="Fechar" disabled={bloquear}><X /></button>
            </header>
            <div className="jn-corpo">{children}</div>
            {rodape && <footer className="jn-rodape">{rodape}</footer>}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
