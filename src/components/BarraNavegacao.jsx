// =====================================================================
// Barra de navegação inferior do telemóvel, em vidro ("glassy"):
// uma barra flutuante desfocada com um recorte curvo por cima do item ativo,
// onde flutua uma bolha com o ícone. Ao mudar de página a bolha e o recorte
// deslizam juntos com uma mola (a bolha estica um pouco com a velocidade).
//
// Como é desenhada:
//  - .bz-gn-vidro  → o vidro (backdrop-filter), recortado com clip-path: path(...)
//  - svg de trás   → sombra suave com a mesma forma
//  - svg da frente → contorno de luz (brilho do vidro)
//  - .bz-gn-bolha  → a bolha do item ativo
// A forma (retângulo arredondado com o "entalhe" circular) é recalculada a cada
// frame pela função caminho(); a animação é uma mola simples em requestAnimationFrame.
// Sem item ativo (ex.: noutra página), o entalhe fecha e a bolha desaparece.
// Estilos: styles/barra-navegacao.css. Usada em pages/Dashboard.jsx.
// =====================================================================
import { useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/barra-navegacao.css";

const ALTURA = 62;        // altura da barra (px)
const RAIO_CANTO = 26;    // cantos da barra
const RAIO_ENTALHE = 32;  // raio do recorte por baixo da bolha
const SUAVE = 12;         // "ombros" do recorte (curva de entrada/saída)
const BOLHA = 50;         // diâmetro da bolha

/** Forma da barra (largura w) com o entalhe centrado em cx e raio r. */
function caminho(w, cx, r) {
  const h = ALTURA;
  const R = Math.min(RAIO_CANTO, h / 2);
  if (r < 1 || w <= 0) {
    return `M0 ${R}A${R} ${R} 0 0 1 ${R} 0L${w - R} 0A${R} ${R} 0 0 1 ${w} ${R}L${w} ${h - R}A${R} ${R} 0 0 1 ${w - R} ${h}L${R} ${h}A${R} ${R} 0 0 1 0 ${h - R}Z`;
  }
  // Ponto onde o "ombro" toca o círculo (a uma profundidade d)
  const d = Math.min(SUAVE * 0.75, r * 0.6);
  const dx = Math.sqrt(Math.max(r * r - d * d, 0));
  // Controlo da curva: onde a tangente ao círculo nesse ponto corta o topo da barra
  const xCtrl = dx + (d * d) / dx; // distância ao centro (lado esquerdo: cx - …)
  // Bolha encostada a uma ponta (1.º/último item em ecrãs estreitos): o canto
  // dessa ponta encolhe e o "ombro" encurta, para o recorte seguir a bolha
  const c = Math.min(Math.max(cx, xCtrl + 4), w - xCtrl - 4);
  const espEsq = c - xCtrl;
  const espDir = w - c - xCtrl;
  const Re = Math.max(3, Math.min(R, espEsq - SUAVE));
  const Rd = Math.max(3, Math.min(R, espDir - SUAVE));
  const ombroEsq = Math.max(1, Math.min(SUAVE, espEsq - Re));
  const ombroDir = Math.max(1, Math.min(SUAVE, espDir - Rd));
  const f = (n) => n.toFixed(2);
  return [
    `M0 ${f(Re)}A${f(Re)} ${f(Re)} 0 0 1 ${f(Re)} 0`,
    `L${f(c - xCtrl - ombroEsq)} 0`,
    `Q${f(c - xCtrl)} 0 ${f(c - dx)} ${f(d)}`,
    `A${r} ${r} 0 0 0 ${f(c + dx)} ${f(d)}`,
    `Q${f(c + xCtrl)} 0 ${f(c + xCtrl + ombroDir)} 0`,
    `L${f(w - Rd)} 0A${f(Rd)} ${f(Rd)} 0 0 1 ${w} ${f(Rd)}`,
    `L${w} ${h - R}A${R} ${R} 0 0 1 ${w - R} ${h}`,
    `L${R} ${h}A${R} ${R} 0 0 1 0 ${h - R}Z`,
  ].join("");
}

/**
 * @param {object} props
 * @param {{ chave: string, label: string, Icon: Function, to?: string, onClick?: Function }[]} props.itens
 * @param {string|null} props.ativo chave do item ativo (null = nenhum)
 */
export default function BarraNavegacao({ itens, ativo }) {
  const barraRef = useRef(null);
  const vidroRef = useRef(null);
  const sombraRef = useRef(null);
  const brilhoRef = useRef(null);
  const arestaRef = useRef(null);
  const bolhaRef = useRef(null);
  const itensRef = useRef({});
  // Estado da animação (fora do React: muda 60x por segundo)
  const anim = useRef({ x: null, v: 0, alvo: 0, r: 0, vr: 0, alvoR: 0, w: 0, raf: 0, ultimo: 0 });

  const indice = itens.findIndex((i) => i.chave === ativo);
  const ItemAtivo = indice >= 0 ? itens[indice] : null;

  // Desenha o frame atual
  const desenhar = () => {
    const a = anim.current;
    const d = caminho(a.w, a.x ?? 0, a.r);
    if (vidroRef.current) vidroRef.current.style.clipPath = `path("${d}")`;
    sombraRef.current?.setAttribute("d", d);
    brilhoRef.current?.setAttribute("d", d);
    arestaRef.current?.setAttribute("d", d);
    if (bolhaRef.current) {
      const esticar = Math.min(Math.abs(a.v) / 2600, 0.22);
      const tamanho = Math.max(0, Math.min(1, a.r / RAIO_ENTALHE));
      bolhaRef.current.style.transform =
        `translate(${(a.x ?? 0) - BOLHA / 2}px, ${-BOLHA / 2 - 3}px) scale(${(1 + esticar) * tamanho}, ${(1 - esticar * 0.6) * tamanho})`;
      bolhaRef.current.style.opacity = String(tamanho);
    }
  };

  // Mola: aproxima x e r dos alvos
  const passo = (t) => {
    const a = anim.current;
    const dt = Math.min((t - (a.ultimo || t)) / 1000, 1 / 30) || 1 / 60;
    a.ultimo = t;
    const K = 340, C = 28;
    a.v += (-K * (a.x - a.alvo) - C * a.v) * dt;
    a.x += a.v * dt;
    a.vr += (-K * (a.r - a.alvoR) - C * a.vr) * dt;
    a.r += a.vr * dt;
    desenhar();
    const parado = Math.abs(a.x - a.alvo) < 0.3 && Math.abs(a.v) < 4 && Math.abs(a.r - a.alvoR) < 0.3 && Math.abs(a.vr) < 4;
    if (parado) {
      a.x = a.alvo; a.r = a.alvoR; a.v = 0; a.vr = 0; a.raf = 0; a.ultimo = 0;
      desenhar();
      return;
    }
    a.raf = requestAnimationFrame(passo);
  };

  /** Recalcula a posição do item ativo e anima até lá (ou salta, se pedido). */
  const atualizar = (saltar) => {
    const a = anim.current;
    const barra = barraRef.current;
    if (!barra) return;
    a.w = barra.clientWidth;
    const el = ItemAtivo ? itensRef.current[ItemAtivo.chave] : null;
    if (el) a.alvo = el.offsetLeft + el.offsetWidth / 2;
    a.alvoR = el ? RAIO_ENTALHE : 0;
    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (a.x === null || saltar || reduzir) {
      cancelAnimationFrame(a.raf);
      a.raf = 0;
      a.x = a.alvo; a.r = a.alvoR; a.v = 0; a.vr = 0;
      desenhar();
      return;
    }
    if (!a.raf) a.raf = requestAnimationFrame(passo);
  };

  // Versão mais recente de atualizar (o ResizeObserver é criado uma só vez)
  const atualizarRef = useRef(atualizar);

  // Mudou o item ativo → desliza
  useLayoutEffect(() => {
    atualizarRef.current = atualizar;
    atualizar(false);
  }); // corre a cada render: barato (só lê posições) e apanha mudanças de itens/ativo

  // Mudou o tamanho (rodar o telemóvel, teclado…) → reposiciona sem animação
  useEffect(() => {
    const barra = barraRef.current;
    if (!barra || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => atualizarRef.current(true));
    ro.observe(barra);
    const a = anim.current;
    return () => { ro.disconnect(); cancelAnimationFrame(a.raf); a.raf = 0; };
  }, []);

  return (
    <nav className="bz-gn" aria-label="Navegação rápida">
      <div className="bz-gn-barra" ref={barraRef}>
        <svg className="bz-gn-sombra" aria-hidden="true" preserveAspectRatio="none">
          <path ref={sombraRef} />
        </svg>
        <div className="bz-gn-vidro" ref={vidroRef} />
        <svg className="bz-gn-brilho" aria-hidden="true">
          <defs>
            <linearGradient id="bz-gn-luz" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="0.55" stopColor="#fff" stopOpacity="0.15" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <path ref={arestaRef} className="bz-gn-aresta" />
          <path ref={brilhoRef} />
        </svg>

        <span className="bz-gn-bolha" ref={bolhaRef} aria-hidden="true">
          {ItemAtivo && <span key={ItemAtivo.chave} className="bz-gn-bolha-ico"><ItemAtivo.Icon /></span>}
        </span>

        <ul className="bz-gn-itens">
          {itens.map((it) => {
            const on = it.chave === ativo;
            const conteudo = (
              <>
                <span className="bz-gn-ico"><it.Icon /></span>
                <span className="bz-gn-label">{it.label}</span>
              </>
            );
            return (
              <li key={it.chave} ref={(el) => { itensRef.current[it.chave] = el; }}>
                {it.to ? (
                  <Link to={it.to} className={`bz-gn-item ${on ? "is-ativo" : ""}`} aria-current={on ? "page" : undefined}>{conteudo}</Link>
                ) : (
                  <button type="button" className={`bz-gn-item ${on ? "is-ativo" : ""}`} onClick={it.onClick} aria-expanded={it.expandido}>{conteudo}</button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
