// =====================================================================
// Sidebar ENCOLHIDA (computador): o item ativo sai da sidebar numa bolha
// que flutua na aresta direita, com um recorte curvo na sidebar por baixo
// dela — a mesma ideia da barra de vidro do telemóvel (BarraNavegacao.jsx),
// agora na vertical. Ao mudar de página, bolha e recorte deslizam com mola.
//
// Como funciona (sem mexer no resto da Sidebar):
//  - a forma da sidebar com o entalhe é aplicada como clip-path ao <aside>;
//  - a sombra e a aresta de luz são desenhadas por <svg> fixas (o clip-path
//    cortaria a box-shadow);
//  - a bolha é um elemento fixo com uma cópia do ícone do item ativo.
// A página nunca passa por baixo da bolha: com a sidebar encolhida há uma
// margem à direita do tamanho da parte da bolha que sai (sidebar-vidro.css).
// Só atua com a sidebar encolhida e fora do telemóvel; de resto limpa tudo.
// Estilos: .bz-sb-* em styles/sidebar-vidro.css. Usada em Sidebar.jsx.
// =====================================================================
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { rectCss } from "../utils/tamanhoInterface";

const RAIO_CANTO = 26;
const RAIO_ENTALHE = 30;
const SUAVE = 12;
const BOLHA = 48;

/** Forma do <aside> (w×h) com o entalhe na aresta direita, centrado em cy. */
function caminho(w, h, cy, r) {
  const R = Math.min(RAIO_CANTO, w / 2, h / 2);
  const f = (n) => n.toFixed(2);
  if (r < 1 || w <= 0 || h <= 0) {
    return `M0 ${R}A${R} ${R} 0 0 1 ${R} 0L${w - R} 0A${R} ${R} 0 0 1 ${w} ${R}L${w} ${h - R}A${R} ${R} 0 0 1 ${w - R} ${h}L${R} ${h}A${R} ${R} 0 0 1 0 ${h - R}Z`;
  }
  const d = Math.min(SUAVE * 0.75, r * 0.6);
  const dx = Math.sqrt(Math.max(r * r - d * d, 0));
  const xCtrl = dx + (d * d) / dx;
  const alcance = xCtrl + SUAVE;
  const c = Math.min(Math.max(cy, R + alcance), h - R - alcance);
  return [
    `M0 ${R}A${R} ${R} 0 0 1 ${R} 0`,
    `L${w - R} 0A${R} ${R} 0 0 1 ${w} ${R}`,
    `L${w} ${f(c - alcance)}`,
    `Q${w} ${f(c - xCtrl)} ${f(w - d)} ${f(c - dx)}`,
    `A${r} ${r} 0 0 0 ${f(w - d)} ${f(c + dx)}`,
    `Q${w} ${f(c + xCtrl)} ${w} ${f(c + alcance)}`,
    `L${w} ${h - R}A${R} ${R} 0 0 1 ${w - R} ${h}`,
    `L${R} ${h}A${R} ${R} 0 0 1 0 ${h - R}Z`,
  ].join("");
}

/**
 * @param {object} props
 * @param {React.RefObject<HTMLElement>} props.asideRef o <aside> da Sidebar
 * @param {boolean} props.ligada sidebar encolhida e no computador
 * @param {string} props.chave muda quando o item ativo muda (ex.: pathname)
 */
export default function SidebarBolha({ asideRef, ligada, chave }) {
  const capaRef = useRef(null);       // <div> fixo POR CIMA da sidebar (aresta de luz)
  const capaSombraRef = useRef(null); // <div> fixo POR TRÁS da sidebar (sombra)
  const sombraRef = useRef(null);
  const arestaRef = useRef(null);
  const brilhoRef = useRef(null);
  const bolhaRef = useRef(null);
  const icoRef = useRef(null);
  const anim = useRef({ y: null, v: 0, alvo: 0, r: 0, vr: 0, alvoR: 0, raf: 0, ultimo: 0, rect: null });

  const desenhar = () => {
    const a = anim.current;
    const aside = asideRef.current;
    const rect = a.rect;
    if (!aside || !rect) return;
    const d = caminho(rect.width, rect.height, a.y ?? 0, a.r);
    aside.style.clipPath = `path("${d}")`;
    sombraRef.current?.setAttribute("d", d);
    arestaRef.current?.setAttribute("d", d);
    brilhoRef.current?.setAttribute("d", d);
    for (const capa of [capaRef.current, capaSombraRef.current]) {
      if (capa) Object.assign(capa.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    }
    if (bolhaRef.current) {
      const t = Math.max(0, Math.min(1, a.r / RAIO_ENTALHE));
      const esticar = Math.min(Math.abs(a.v) / 2600, 0.2);
      bolhaRef.current.style.transform =
        `translate(${rect.left + rect.width - BOLHA / 2 + 2}px, ${rect.top + (a.y ?? 0) - BOLHA / 2}px) scale(${(1 - esticar * 0.6) * t}, ${(1 + esticar) * t})`;
      bolhaRef.current.style.opacity = String(t);
    }
  };

  const passo = (t) => {
    const a = anim.current;
    const dt = Math.min((t - (a.ultimo || t)) / 1000, 1 / 30) || 1 / 60;
    a.ultimo = t;
    const K = 320, C = 27;
    a.v += (-K * (a.y - a.alvo) - C * a.v) * dt;
    a.y += a.v * dt;
    a.vr += (-K * (a.r - a.alvoR) - C * a.vr) * dt;
    a.r += a.vr * dt;
    desenhar();
    if (Math.abs(a.y - a.alvo) < 0.3 && Math.abs(a.v) < 4 && Math.abs(a.r - a.alvoR) < 0.3 && Math.abs(a.vr) < 4) {
      a.y = a.alvo; a.r = a.alvoR; a.v = 0; a.vr = 0; a.raf = 0; a.ultimo = 0;
      desenhar();
      return;
    }
    a.raf = requestAnimationFrame(passo);
  };

  const limpar = () => {
    const a = anim.current;
    cancelAnimationFrame(a.raf);
    a.raf = 0; a.y = null; a.r = 0; a.v = 0; a.vr = 0;
    if (asideRef.current) {
      asideRef.current.style.clipPath = "";
      asideRef.current.classList.remove("tem-bolha");
    }
  };

  /** Mede o item ativo e anima até lá (ou salta). */
  const atualizar = (saltar) => {
    const a = anim.current;
    const aside = asideRef.current;
    if (!ligada || !aside) { limpar(); return; }
    a.rect = rectCss(aside);
    const link = aside.querySelector("li.active > a");
    const nav = aside.querySelector(".sidebar-scroll");
    let alvoY = null;
    if (link) {
      const lr = rectCss(link);
      const nr = nav ? rectCss(nav) : a.rect;
      const centro = lr.top + lr.height / 2;
      // só se o item estiver visível dentro do menu (pode estar fora do scroll)
      if (lr.height > 0 && centro > nr.top + 8 && centro < nr.bottom - 8) alvoY = centro - a.rect.top;
    }
    if (alvoY !== null) {
      a.alvo = alvoY;
      a.alvoR = RAIO_ENTALHE;
      const novo = link.querySelector(".icon")?.innerHTML || "";
      if (icoRef.current && icoRef.current.innerHTML !== novo) {
        icoRef.current.innerHTML = novo; // cópia do ícone do item ativo (SVG da própria app)
        icoRef.current.style.animation = "none";
        void icoRef.current.offsetWidth;
        icoRef.current.style.animation = "";
      }
      aside.classList.add("tem-bolha");
    } else {
      a.alvoR = 0;
      aside.classList.remove("tem-bolha");
    }
    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (a.y === null || saltar || reduzir) {
      cancelAnimationFrame(a.raf);
      a.raf = 0;
      a.y = alvoY ?? a.y ?? 0; a.r = a.alvoR; a.v = 0; a.vr = 0;
      desenhar();
      return;
    }
    if (!a.raf) a.raf = requestAnimationFrame(passo);
  };

  const atualizarRef = useRef(atualizar);

  // Mudou a página / ligou-desligou → desliza (a 1.ª vez aparece já no sítio)
  useLayoutEffect(() => {
    atualizarRef.current = atualizar;
    atualizar(false);
  }, [ligada, chave]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tamanho da janela, scroll do menu, grupos a abrir → reposiciona sem animação
  useEffect(() => {
    if (!ligada) return undefined;
    const aside = asideRef.current;
    const nav = aside?.querySelector(".sidebar-scroll");
    const reposicionar = () => atualizarRef.current(true);
    // a sidebar demora ~300ms a encolher: mede outra vez no fim
    const t = setTimeout(reposicionar, 340);
    window.addEventListener("resize", reposicionar);
    window.addEventListener("bz:tamanho", reposicionar);
    nav?.addEventListener("scroll", reposicionar, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reposicionar) : null;
    if (ro && aside) ro.observe(aside);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("bz:tamanho", reposicionar);
      nav?.removeEventListener("scroll", reposicionar);
      ro?.disconnect();
    };
  }, [ligada, asideRef]);

  // Ao sair (desmontar ou desligar), a sidebar volta ao normal
  useEffect(() => () => limpar(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ligada) return null;
  return createPortal(
    <>
      <div className="bz-sb-capa is-sombra" ref={capaSombraRef} aria-hidden="true">
        <svg className="bz-sb-sombra"><path ref={sombraRef} /></svg>
      </div>
      <div className="bz-sb-capa" ref={capaRef} aria-hidden="true">
        <svg className="bz-sb-luz">
          <defs>
            <linearGradient id="bz-sb-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <path ref={arestaRef} className="bz-sb-aresta" />
          <path ref={brilhoRef} className="bz-sb-brilho" />
        </svg>
      </div>
      <span className="bz-sb-bolha" ref={bolhaRef} aria-hidden="true">
        <span className="bz-sb-ico" ref={icoRef} />
      </span>
    </>,
    document.body,
  );
}
