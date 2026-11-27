// =====================================================================
// Envelope para quadros com colunas que deslizam para os lados (kanban).
// - Setas ‹ › nas pontas, só quando há colunas escondidas desse lado.
// - A roda do rato fica com o comportamento normal (Shift + roda desliza para
//   os lados): desviá-la atrapalhava quem só quer descer na página.
// O filho tem de ser o próprio elemento com overflow-x (ex.: .mk-board);
// passa-se a classe dele em `seletor`. Estilos .bz-quadro em styles/refinamentos.css.
// =====================================================================
import { useCallback, useEffect, useRef, useState } from "react";

const Seta = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === "esq" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
  </svg>
);

/**
 * @param {object} props
 * @param {string} props.seletor  classe do elemento que desliza (ex.: "mk-board")
 * @param {React.ReactNode} props.children
 */
export default function QuadroDeslizante({ seletor, children }) {
  const envelope = useRef(null);
  const [esq, setEsq] = useState(false);
  const [dir, setDir] = useState(false);

  const quadro = useCallback(() => envelope.current?.querySelector(`.${seletor}`), [seletor]);

  const medir = useCallback(() => {
    const q = quadro();
    if (!q) return;
    setEsq(q.scrollLeft > 4);
    setDir(q.scrollLeft + q.clientWidth < q.scrollWidth - 4);
  }, [quadro]);

  useEffect(() => {
    const q = quadro();
    if (!q) return undefined;
    const raf = requestAnimationFrame(medir); // medir depois de desenhar
    q.addEventListener("scroll", medir, { passive: true });
    const ro = new ResizeObserver(medir);
    ro.observe(q);
    return () => {
      q.removeEventListener("scroll", medir);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [quadro, medir, children]);

  const deslizar = (sentido) => {
    const q = quadro();
    if (q) q.scrollBy({ left: sentido * Math.max(280, q.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div className="bz-quadro" ref={envelope}>
      {children}
      {esq && <button type="button" className="bz-quadro-seta is-esq" onClick={() => deslizar(-1)} aria-label="Ver colunas à esquerda"><Seta dir="esq" /></button>}
      {dir && <button type="button" className="bz-quadro-seta is-dir" onClick={() => deslizar(1)} aria-label="Ver colunas à direita"><Seta dir="dir" /></button>}
    </div>
  );
}
