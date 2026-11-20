import { useEffect } from "react";
import "../styles/theme-decor-extra.css";

// =========================================================
// Temas animados extra: Café, Livraria, Fórmula 1 e Páscoa (Ressurreição)
// Ligados em ThemeDecor.jsx (formas, configuração, cena e emblema).
// =========================================================

const rnd = (i, k = 1) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const pick = (arr, i) => arr[i % arr.length];

// ---------------------------------------------------------
// CAFÉ
// ---------------------------------------------------------
function CoffeeBean({ i = 0 }) {
  const tone = pick(["#6f4e37", "#5a3d2b", "#7b5537", "#4a3122"], i);
  return (
    <svg viewBox="0 0 20 26">
      <ellipse cx="10" cy="13" rx="8.5" ry="11.5" fill={tone} />
      <path d="M10 2.5c-4 4-4 9 0 10.5s4 7 0 10.5" stroke="#2b1a10" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="7" cy="8" rx="2" ry="3.4" fill="#fff" opacity="0.14" />
    </svg>
  );
}

export function CoffeeCup() {
  return (
    <svg viewBox="0 0 140 96">
      <ellipse cx="66" cy="86" rx="62" ry="9" fill="#e7e1d8" />
      <ellipse cx="66" cy="84" rx="54" ry="6.5" fill="#f5f1ea" />
      <path d="M118 40c14 0 16 22 0 24" stroke="#f1ece4" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M118 40c14 0 16 22 0 24" stroke="#d9d1c5" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M22 28h96l-8 44a14 14 0 0 1-14 12H44a14 14 0 0 1-14-12z" fill="#faf7f2" />
      <path d="M96 28h22l-8 44a14 14 0 0 1-14 12h-8z" fill="#e9e2d7" opacity="0.7" />
      <ellipse cx="70" cy="28" rx="48" ry="9" fill="#f1ece4" />
      <ellipse cx="70" cy="28" rx="43" ry="7" fill="#8b5a33" />
      <ellipse cx="70" cy="28" rx="36" ry="5" fill="#c08a5b" />
      <path d="M70 32c-7-4-11-6-9-9 2-2 5-1 9 3 4-4 7-5 9-3 2 3-2 5-9 9z" fill="#f6e7d2" />
      <path d="M30 40h88" stroke="#b45309" strokeWidth="3" opacity="0.35" />
    </svg>
  );
}

export function PastelNata() {
  return (
    <svg viewBox="0 0 70 40">
      <path d="M4 18h62l-6 18H10z" fill="#d98f2b" />
      <path d="M10 22h50M12 28h46" stroke="#b86b14" strokeWidth="1.4" opacity="0.6" />
      <ellipse cx="35" cy="17" rx="31" ry="8" fill="#e8a33a" />
      <ellipse cx="35" cy="16" rx="25" ry="5.6" fill="#fbd776" />
      <ellipse cx="30" cy="15" rx="5" ry="2.4" fill="#5b3a1a" opacity="0.75" />
      <ellipse cx="43" cy="17" rx="4" ry="1.8" fill="#6b4220" opacity="0.6" />
      <ellipse cx="22" cy="17" rx="2.6" ry="1.4" fill="#6b4220" opacity="0.5" />
    </svg>
  );
}

// ---------------------------------------------------------
// LIVRARIA
// ---------------------------------------------------------
const BOOK_COLORS = ["#7f1d1d", "#1e3a5f", "#14532d", "#78350f", "#4c1d95", "#9a3412", "#334155", "#854d0e", "#155e75"];

function Page({ i = 0 }) {
  return (
    <svg viewBox="0 0 24 30">
      <path d="M2 2h15l5 5v21H2z" fill="#fffdf6" stroke="#d6cbb4" strokeWidth="0.8" />
      <path d="M17 2v5h5" fill="#efe6d2" />
      {[10, 14, 18, 22].map((y, k) => (
        <path key={k} d={`M5 ${y}h${k === 3 ? 8 : 13 - (i % 3)}`} stroke="#b9ad96" strokeWidth="1.2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function Letter({ i = 0 }) {
  const ch = pick(["A", "a", "B", "Ç", "ã", "R", "e", "&", "§", "ó"], i);
  return (
    <svg viewBox="0 0 24 24">
      <text x="12" y="18" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fontStyle="italic" fill={pick(["#7c5c3b", "#9a3412", "#1e3a5f", "#4b5563"], i)}>{ch}</text>
    </svg>
  );
}

export function BookStack() {
  return (
    <svg viewBox="0 0 150 82">
      <rect x="10" y="58" width="126" height="20" rx="3" fill="#1e3a5f" />
      <rect x="14" y="61" width="118" height="2" fill="#d4af37" opacity="0.8" />
      <rect x="14" y="73" width="118" height="2" fill="#d4af37" opacity="0.8" />
      <rect x="132" y="59" width="4" height="18" fill="#f5efe0" />
      <rect x="20" y="40" width="112" height="18" rx="3" fill="#7f1d1d" />
      <rect x="24" y="47" width="40" height="4" rx="1" fill="#f5d9a6" opacity="0.8" />
      <rect x="128" y="41" width="4" height="16" fill="#f5efe0" />
      <rect x="14" y="24" width="104" height="16" rx="3" fill="#14532d" />
      <rect x="18" y="30" width="96" height="1.6" fill="#d4af37" opacity="0.7" />
      <rect x="114" y="25" width="4" height="14" fill="#f5efe0" />
    </svg>
  );
}

function OpenBook() {
  return (
    <svg viewBox="0 0 120 50">
      <path d="M60 14C44 4 22 4 6 10v34c16-6 38-6 54 4z" fill="#fffaf0" stroke="#cdbf9f" strokeWidth="1" />
      <path d="M60 14c16-10 38-10 54-4v34c-16-6-38-6-54 4z" fill="#fffaf0" stroke="#cdbf9f" strokeWidth="1" />
      {[18, 24, 30, 36].map((y, k) => (
        <g key={k} stroke="#c7b99b" strokeWidth="1.1" strokeLinecap="round">
          <path d={`M14 ${y - 2}q20-4 40 2`} fill="none" />
          <path d={`M66 ${y}q20-6 40-2`} fill="none" />
        </g>
      ))}
      <path d="M60 14v34" stroke="#b9a983" strokeWidth="1.4" />
      <path d="M4 44c18-6 40-6 56 4 16-10 38-10 56-4v4H4z" fill="#7c5c3b" />
    </svg>
  );
}

function FlipPage() {
  return (
    <svg viewBox="0 0 56 44">
      <path d="M2 10C14 2 34 2 54 8v34C34 36 14 36 2 44z" fill="#fffdf6" stroke="#d6cbb4" strokeWidth="1" />
      {[16, 22, 28].map((y, k) => <path key={k} d={`M10 ${y}q18-4 36 0`} stroke="#d1c5ab" strokeWidth="1" fill="none" />)}
    </svg>
  );
}

function DeskLamp() {
  return (
    <svg viewBox="0 0 80 110">
      <ellipse cx="22" cy="104" rx="20" ry="5" fill="#3f3a33" />
      <path d="M22 102V62l30-30" stroke="#57534e" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="62" r="4" fill="#78716c" />
      <circle cx="52" cy="32" r="4" fill="#78716c" />
      <path d="M46 22l28-6 4 22-26 8z" fill="#166534" />
      <path d="M52 46l26-8" stroke="#14532d" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Padrão de estante para o fundo (SVG gerado, muito suave)
function bookshelfPattern() {
  const W = 260;
  const H = 150;
  let x = 6;
  let i = 0;
  let books = "";
  while (x < W - 8) {
    const w = 9 + Math.floor(rnd(i, 3) * 9);
    const h = 70 + Math.floor(rnd(i, 4) * 40);
    const tilt = rnd(i, 5) > 0.92;
    const c = pick(BOOK_COLORS, Math.floor(rnd(i, 6) * 9));
    const y = 130 - h;
    if (tilt) {
      books += `<rect x="${x}" y="${y + 6}" width="${w}" height="${h - 6}" fill="${c}" transform="rotate(-8 ${x + w} 130)"/>`;
      x += w + 10;
    } else {
      books += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${c}"/>`;
      books += `<rect x="${x + 1.5}" y="${y + 10}" width="${w - 3}" height="2" fill="#e9c46a" opacity="0.7"/>`;
      books += `<rect x="${x + 1.5}" y="${y + h - 14}" width="${w - 3}" height="2" fill="#e9c46a" opacity="0.7"/>`;
      x += w + 1;
    }
    i += 1;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="#6b4a2f"/>`
    + `<rect width="${W}" height="${H}" fill="#3b2617" opacity="0.35"/>`
    + books
    + `<rect y="130" width="${W}" height="14" fill="#8a5a33"/><rect y="130" width="${W}" height="3" fill="#b07a48"/>`
    + `<rect y="144" width="${W}" height="6" fill="#4a2f1b"/>`
    + `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ---------------------------------------------------------
// FÓRMULA 1
// ---------------------------------------------------------
export function F1Car({ color = "#dc2626", accent = "#111827" }) {
  return (
    <svg viewBox="0 0 220 60">
      {/* asa traseira */}
      <path d="M8 14h22v6H8z" fill={accent} />
      <path d="M14 20h6v16h-6z" fill={accent} />
      {/* corpo */}
      <path d="M18 34c10-8 40-10 62-10l20-8h34l14 10c20 0 44 4 62 10l4 8H18z" fill={color} />
      <path d="M40 30c30-4 70-4 108 0" stroke="#fff" strokeWidth="2.5" opacity="0.85" fill="none" />
      <path d="M150 36c16 0 34 2 50 6" stroke="#fff" strokeWidth="2" opacity="0.6" fill="none" />
      {/* cockpit, halo e piloto */}
      <path d="M100 16h34l6 10h-44z" fill={accent} />
      <circle cx="116" cy="17" r="7" fill="#facc15" />
      <path d="M110 17h12" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M96 22c10-12 34-12 46 2" stroke="#374151" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* asa da frente */}
      <path d="M196 40h22v6h-30z" fill={accent} />
      {/* rodas */}
      {[44, 176].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="44" r="14" fill="#111" />
          <circle cx={cx} cy="44" r="7" fill="#4b5563" />
          <circle cx={cx} cy="44" r="13" fill="none" stroke="#facc15" strokeWidth="1.4" strokeDasharray="4 6" className="bz-f1-rim" />
        </g>
      ))}
      <path d="M62 44h96" stroke="#111" strokeWidth="5" />
    </svg>
  );
}

function CheckerFlag() {
  const cells = [];
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      if ((r + c) % 2 === 0) cells.push(<rect key={`${r}-${c}`} x={6 + c * 9} y={4 + r * 9} width="9" height="9" fill="#111" />);
    }
  }
  return (
    <svg viewBox="0 0 74 110">
      <path d="M4 2v106" stroke="#6b7280" strokeWidth="3.5" strokeLinecap="round" />
      <g className="bz-f1-flagcloth">
        <rect x="6" y="4" width="63" height="45" fill="#fff" />
        {cells}
      </g>
    </svg>
  );
}

function StartLights() {
  return (
    <div className="bz-f1-lights">
      <span className="bar" />
      {[1, 2, 3, 4, 5].map((k) => (
        <span key={k} className="pod">
          <i className={`l l${k}`} />
          <i className={`l l${k}`} />
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------
// PÁSCOA (Paixão e Ressurreição)
// ---------------------------------------------------------
function Crucifixo() {
  return (
    <g>
      <path d="M95 16h10v150H95z" fill="#6b4423" />
      <path d="M62 52h76v9H62z" fill="#6b4423" />
      <path d="M93 20h3v146h-3zM60 54h2v6h-2z" fill="#4a2e17" opacity="0.6" />
      {/* Cristo na cruz */}
      <g className="bz-pa-crucified">
        <circle cx="100" cy="44" r="6.5" fill="#e9c9a3" />
        <path d="M93 42c2-7 12-8 14 0" stroke="#5b3a1f" strokeWidth="3" fill="none" />
        <path d="M94 40l12 0" stroke="#7c5c2e" strokeWidth="1.6" strokeDasharray="2 2" />
        <path d="M66 57c12 0 22 2 28 4M134 57c-12 0-22 2-28 4" stroke="#e9c9a3" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M93 52c-2 14 0 30 4 40h6c4-10 6-26 4-40z" fill="#e9c9a3" />
        <path d="M92 84h16l-2 12h-12z" fill="#f8f5ee" />
        <path d="M97 96l-1 26M103 96l1 26" stroke="#e9c9a3" strokeWidth="4.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Ressuscitado() {
  return (
    <g>
      <circle cx="0" cy="-58" r="15" fill="none" stroke="#fbbf24" strokeWidth="2.5" className="bz-pa-halo" />
      <circle cx="0" cy="-58" r="9" fill="#e9c9a3" />
      <path d="M-9 -60c1-10 17-10 18 0v6c-2-4-4-5-9-5s-7 1-9 5z" fill="#6b4423" />
      <path d="M-4 -50c2 4 6 4 8 0v5c-2 3-6 3-8 0z" fill="#6b4423" />
      {/* túnica branca e manto vermelho */}
      <path d="M-12 -46h24l12 64h-48z" fill="#fffdf7" />
      <path d="M12 -46l16 64h-10L4 -40z" fill="#b91c1c" opacity="0.92" />
      <path d="M-12 -46l-6 30" stroke="#eee7d8" strokeWidth="1" />
      {/* braços abertos */}
      <path d="M-11 -40c-10 6-18 4-26-6M11 -40c10 6 18 4 26-6" stroke="#fffdf7" strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="-38" cy="-47" r="3.2" fill="#e9c9a3" />
      <circle cx="38" cy="-47" r="3.2" fill="#e9c9a3" />
    </g>
  );
}

function PascoaScene() {
  return (
    <div className="bz-pa-scene">
      <svg viewBox="0 0 300 230">
        <defs>
          <radialGradient id="bzPaLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffbea" stopOpacity="1" />
            <stop offset="45%" stopColor="#fde68a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1) Calvário */}
        <g className="bz-pa-calvario">
          <path d="M0 230c40-60 110-80 150-80s110 20 150 80z" fill="#a8a29e" opacity="0.55" />
          <g transform="translate(50 20)"><Crucifixo /></g>
          {/* luz da ascensão */}
          <circle cx="150" cy="70" r="80" fill="url(#bzPaLight)" className="bz-pa-rays" />
          <g className="bz-pa-ascend" transform="translate(150 120)">
            <Ressuscitado />
          </g>
        </g>

        {/* 2) Sepulcro e Ressurreição */}
        <g className="bz-pa-tumulo">
          <path d="M0 230v-24c60-14 240-14 300 0v24z" fill="#86a86b" />
          <path d="M150 206c-60-6-110-8-150 0" stroke="#6b8f52" strokeWidth="2" fill="none" />
          {/* rocha */}
          <path d="M150 210c-6-70 20-120 70-122s82 40 80 122z" fill="#a8a29e" />
          <path d="M240 96c30 10 54 50 58 114h-40c4-50-2-90-18-114z" fill="#8f8a85" opacity="0.6" />
          {/* abertura e luz de dentro */}
          <path d="M196 210v-46a26 26 0 0 1 52 0v46z" fill="#3f3a36" />
          <ellipse cx="222" cy="182" rx="40" ry="44" fill="url(#bzPaLight)" className="bz-pa-tomblight" />
          {/* pedra a rolar */}
          <g className="bz-pa-stone">
            <circle cx="222" cy="180" r="32" fill="#78716c" />
            <circle cx="222" cy="180" r="32" fill="none" stroke="#57534e" strokeWidth="3" />
            <path d="M206 168c8-6 22-6 30 2M210 194c8 4 18 4 26-2" stroke="#57534e" strokeWidth="2" fill="none" />
          </g>
          {/* lírios */}
          <g stroke="#3f6212" strokeWidth="2">
            <path d="M24 214v-34M36 214v-26M276 214v-30" />
          </g>
          {[[24, 178], [36, 186], [276, 182]].map(([x, y], k) => (
            <path key={k} d={`M${x} ${y}l-6-10 6 3 6-3z`} fill="#fffdf7" stroke="#e7e5e4" strokeWidth="0.6" />
          ))}
          {/* Cristo ressuscitado */}
          <circle cx="110" cy="150" r="70" fill="url(#bzPaLight)" className="bz-pa-glory" />
          <g className="bz-pa-risen" transform="translate(110 192)">
            <Ressuscitado />
          </g>
        </g>
      </svg>
      <span className="bz-pa-label">Ele ressuscitou!</span>
    </div>
  );
}

// ---------------------------------------------------------
// LIGAÇÃO AO MOTOR DE DECORAÇÕES
// ---------------------------------------------------------
// eslint-disable-next-line react-refresh/only-export-components
export const EXTRA_SHAPES = {
  bean: CoffeeBean,
  page: Page,
  letter: Letter,
};

// eslint-disable-next-line react-refresh/only-export-components
export const EXTRA_DECOR = {
  cafe: { particles: { shapes: ["bean"], count: 16, motion: "spin", size: [10, 16] }, scene: "cafe" },
  livros: { particles: { shapes: ["page", "letter", "page"], count: 12, motion: "spin", size: [14, 22] }, scene: "livros" },
  f1: { scene: "f1" },
  pascoa_cristo: { particles: { shapes: ["sparkle", "glow"], count: 16, motion: "rise", size: [6, 14] }, glow: true, scene: "pascoa_cristo" },
};

/**
 * Cena fixa dos temas extra (DECOR[...].scene). No tema "livros" também põe a classe
 * bz-scene-livros e a variável --bz-shelf no <body> (removidas ao desmontar).
 * @param {{ kind: "cafe"|"livros"|"f1"|"pascoa_cristo" }} props
 */
export function ExtraScene({ kind }) {
  // Fundo de livraria aplicado à área principal enquanto o tema está ativo
  useEffect(() => {
    if (kind !== "livros") return undefined;
    const body = document.body;
    body.classList.add("bz-scene-livros");
    body.style.setProperty("--bz-shelf", bookshelfPattern());
    return () => {
      body.classList.remove("bz-scene-livros");
      body.style.removeProperty("--bz-shelf");
    };
  }, [kind]);

  if (kind === "cafe") {
    return (
      <>
        <div className="bz-x-warm" />
        <div className="bz-x-corner is-cafe">
          <span className="steam s1" /><span className="steam s2" /><span className="steam s3" />
          <span className="cup"><CoffeeCup /></span>
          <span className="nata"><PastelNata /></span>
          <span className="b b1"><CoffeeBean i={1} /></span>
          <span className="b b2"><CoffeeBean i={2} /></span>
        </div>
      </>
    );
  }
  if (kind === "livros") {
    return (
      <div className="bz-x-corner is-livros">
        <span className="lamp-glow" />
        <span className="lamp"><DeskLamp /></span>
        <span className="stack"><BookStack /></span>
        <span className="open"><OpenBook /></span>
        <span className="flip"><FlipPage /></span>
        <span className="flip f2"><FlipPage /></span>
      </div>
    );
  }
  if (kind === "f1") {
    return (
      <>
        <StartLights />
        <div className="bz-f1-track">
          <span className="bz-f1-car">
            <i className="speed s1" /><i className="speed s2" /><i className="speed s3" />
            <F1Car />
          </span>
        </div>
        <div className="bz-f1-kerb" />
        <div className="bz-x-corner is-f1"><span className="flag"><CheckerFlag /></span></div>
      </>
    );
  }
  if (kind === "pascoa_cristo") return <PascoaScene />;
  return null;
}

/** Emblema do seletor de temas para as decorações extra (fallback de DecorEmblem). */
export function ExtraEmblem({ decor }) {
  switch (decor) {
    case "cafe":
      return (
        <div className="bz-emb is-x-cafe">
          <span className="st a" /><span className="st b" />
          <span className="cup"><CoffeeCup /></span>
        </div>
      );
    case "livros":
      return (
        <div className="bz-emb is-x-livros">
          <span className="stack"><BookStack /></span>
        </div>
      );
    case "f1":
      return (
        <div className="bz-emb is-x-f1">
          <span className="car"><F1Car /></span>
        </div>
      );
    case "pascoa_cristo":
      return (
        <div className="bz-emb is-x-pascoa">
          <svg viewBox="0 0 120 70">
            <circle cx="60" cy="30" r="28" fill="#fde68a" opacity="0.55" />
            <path d="M0 70c20-20 40-26 60-26s40 6 60 26z" fill="#a8a29e" opacity="0.7" />
            <path d="M57 6h6v46h-6zM46 18h28v5H46z" fill="#6b4423" />
          </svg>
        </div>
      );
    default:
      return null;
  }
}
