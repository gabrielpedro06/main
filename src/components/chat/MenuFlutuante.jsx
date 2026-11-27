// =====================================================================
// Menu de ações que abre junto a um botão (mensagens e conversas do chat).
// Abre num portal (não é cortado pelo scroll da conversa), fica dentro do
// ecrã, fecha com Esc, clique fora ou scroll. Teclado: setas ↑/↓ e Enter.
// Estilos .bz-menu-* em styles/forum.css.
//
//   <MenuFlutuante ancora={botaoRef.current} aoFechar={…} itens={[
//     { id: "copiar", label: "Copiar", icone: <Icons.Copy/>, acao: () => … },
//     { separador: true },
//     { id: "apagar", label: "Apagar", perigo: true, acao: … },
//   ]} />
// =====================================================================
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rectCss, larguraEcra, alturaEcra } from "../../utils/tamanhoInterface";

export default function MenuFlutuante({ ancora, itens, aoFechar, alinhar = "direita" }) {
  const caixa = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!ancora || !caixa.current) return;
    const r = rectCss(ancora);
    const w = caixa.current.offsetWidth, h = caixa.current.offsetHeight;
    const W = larguraEcra(), H = alturaEcra();
    let left = alinhar === "direita" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, W - w - 8));
    let top = r.bottom + 6;
    if (top + h > H - 8) top = Math.max(8, r.top - h - 6); // sem espaço em baixo: abre para cima
    setPos({ left, top });
  }, [ancora, alinhar]);

  useEffect(() => {
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target) && !ancora?.contains(e.target)) aoFechar(); };
    const tecla = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); aoFechar(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const bts = [...(caixa.current?.querySelectorAll("button:not(:disabled)") || [])];
      if (!bts.length) return;
      e.preventDefault();
      const i = bts.indexOf(document.activeElement);
      const n = e.key === "ArrowDown" ? (i + 1) % bts.length : (i - 1 + bts.length) % bts.length;
      bts[n].focus();
    };
    const rolar = (e) => { if (!caixa.current?.contains(e.target)) aoFechar(); };
    document.addEventListener("mousedown", fora, true);
    document.addEventListener("touchstart", fora, true);
    document.addEventListener("keydown", tecla, true);
    window.addEventListener("scroll", rolar, true);
    window.addEventListener("resize", aoFechar);
    return () => {
      document.removeEventListener("mousedown", fora, true);
      document.removeEventListener("touchstart", fora, true);
      document.removeEventListener("keydown", tecla, true);
      window.removeEventListener("scroll", rolar, true);
      window.removeEventListener("resize", aoFechar);
    };
  }, [ancora, aoFechar]);

  // foco no 1.º item (teclado)
  useEffect(() => { if (pos) caixa.current?.querySelector("button")?.focus({ preventScroll: true }); }, [pos]);

  return createPortal(
    <div
      ref={caixa}
      className="bz-menu"
      role="menu"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
      onClick={(e) => e.stopPropagation()}
    >
      {itens.filter(Boolean).map((it, i) => (it.separador ? (
        <div key={`s${i}`} className="bz-menu-sep" role="separator" />
      ) : (
        <button
          key={it.id}
          type="button"
          role="menuitem"
          className={`bz-menu-item${it.perigo ? " is-perigo" : ""}`}
          disabled={it.desativado}
          onClick={() => { aoFechar(); it.acao(); }}
        >
          {it.icone && <span className="bz-menu-ico">{it.icone}</span>}
          <span>{it.label}</span>
          {it.dica && <em>{it.dica}</em>}
        </button>
      )))}
    </div>,
    document.body
  );
}
