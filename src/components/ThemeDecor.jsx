import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { THEMES } from "../constants/themes";
import { isDecorEnabled, onDecorChange } from "../utils/themeDecor";
import "../styles/theme-decor.css";

// =========================================================
// Decorações dos temas de celebração
// Camada fixa, sem cliques (pointer-events: none), por cima da app.
// =========================================================

const rnd = (i, k = 1) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const pick = (arr, i) => arr[i % arr.length];

// ---------- FORMAS ----------
const BAUBLE_COLORS = ["#d62839", "#f2b134", "#1f7a4d", "#2b59c3", "#c2185b", "#e9c46a"];
const LEAF_COLORS = ["#d9480f", "#e8590c", "#f59f00", "#c92a2a", "#a0522d"];
const CONFETTI = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#facc15"];
const GOLD = ["#f6d365", "#e0b84f", "#fff1b8", "#d4a017", "#fde68a"];
const PETALS = ["#f9a8d4", "#fbcfe8", "#fda4af", "#fff1f2", "#f0abfc"];

export function Snow({ i = 0 }) {
  return <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r={3.4 + rnd(i, 3) * 1.4} fill="#fff" opacity="0.95" /></svg>;
}
export function Flake() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M12 2l-2 2M12 2l2 2M12 22l-2-2M12 22l2-2M3.3 7l.7 2.7M3.3 7l2.7-.7M20.7 17l-.7-2.7M20.7 17l-2.7.7M3.3 17l2.7.7M3.3 17l.7-2.7M20.7 7l-2.7-.7M20.7 7l-.7 2.7" />
    </svg>
  );
}
export function Bauble({ color = "#d62839" }) {
  return (
    <svg viewBox="0 0 40 48">
      <rect x="15" y="2" width="10" height="7" rx="2" fill="#d4a017" />
      <circle cx="20" cy="28" r="17" fill={color} />
      <path d="M5 26c6 4 24 4 30 0" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="33" r="1.6" fill="rgba(255,255,255,.7)" />
      <circle cx="13" cy="33" r="1.4" fill="rgba(255,255,255,.6)" />
      <circle cx="27" cy="33" r="1.4" fill="rgba(255,255,255,.6)" />
      <ellipse cx="13" cy="20" rx="4" ry="6" fill="rgba(255,255,255,.35)" transform="rotate(30 13 20)" />
    </svg>
  );
}
export function Tree() {
  return (
    <svg viewBox="0 0 120 150">
      <rect x="52" y="122" width="16" height="20" rx="3" fill="#7c4a1e" />
      <path d="M60 22 L100 78 H20 Z" fill="#1f7a4d" />
      <path d="M60 46 L108 108 H12 Z" fill="#196a42" />
      <path d="M60 72 L114 128 H6 Z" fill="#145a37" />
      <path d="M26 100 Q60 116 96 96" stroke="#f2b134" strokeWidth="2.5" fill="none" strokeDasharray="1 6" strokeLinecap="round" />
      <path d="M34 66 Q60 80 86 64" stroke="#f2b134" strokeWidth="2.5" fill="none" strokeDasharray="1 6" strokeLinecap="round" />
      {[[40, 92, "#d62839"], [78, 86, "#2b59c3"], [58, 108, "#f2b134"], [50, 62, "#c2185b"], [72, 58, "#d62839"], [92, 118, "#e9c46a"], [26, 118, "#2b59c3"]].map(([x, y, c], k) => (
        <circle key={k} cx={x} cy={y} r="4.5" fill={c} className="bz-twinkle" style={{ animationDelay: `${k * 0.37}s` }} />
      ))}
      <path className="bz-star" d="M60 6l4.5 9.2 10.1 1.5-7.3 7.1 1.7 10.1L60 29.1l-9 4.8 1.7-10.1-7.3-7.1 10.1-1.5z" fill="#f6c343" />
    </svg>
  );
}
export function CandyCane({ flip = false }) {
  return (
    <svg viewBox="0 0 40 100" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M26 96V30a10 10 0 0 0-20 0" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path d="M26 96V30a10 10 0 0 0-20 0" fill="none" stroke="#d62839" strokeWidth="9" strokeLinecap="butt" strokeDasharray="6 7" />
      <path d="M26 96V30a10 10 0 0 0-20 0" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}
export function Gift({ color = "#2b59c3", ribbon = "#f2b134" }) {
  return (
    <svg viewBox="0 0 60 60">
      <rect x="6" y="22" width="48" height="34" rx="4" fill={color} />
      <rect x="3" y="15" width="54" height="11" rx="3" fill={color} style={{ filter: "brightness(1.1)" }} />
      <rect x="26" y="15" width="8" height="41" fill={ribbon} />
      <path d="M30 15c-6-10-18-8-14 0M30 15c6-10 18-8 14 0" fill="none" stroke={ribbon} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
export function Confetti({ i = 0, palette = CONFETTI }) {
  const c = pick(palette, i);
  return rnd(i, 7) > 0.5
    ? <svg viewBox="0 0 10 10"><rect x="2" y="0" width="6" height="10" rx="1.2" fill={c} /></svg>
    : <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill={c} /></svg>;
}
export function Leaf({ i = 0 }) {
  const c = pick(LEAF_COLORS, i);
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 2c1 3 3 4 5 4-1 2 0 4 3 5-2 1-3 3-2 5-2-1-4 0-5 2v4h-2v-4c-1-2-3-3-5-2 1-2 0-4-2-5 3-1 4-3 3-5 2 0 4-1 5-4z" fill={c} />
      <path d="M12 6v16" stroke="rgba(0,0,0,.2)" strokeWidth="1" />
    </svg>
  );
}
export function Chestnut() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 3c5 0 9 5 9 10 0 4-4 7-9 7s-9-3-9-7c0-5 4-10 9-10z" fill="#7b3f1d" />
      <path d="M4 15c3 2 13 2 16 0v1c-2 3-6 4-8 4s-6-1-8-4z" fill="#d9b382" />
      <ellipse cx="9" cy="9" rx="2.5" ry="1.5" fill="rgba(255,255,255,.25)" transform="rotate(-30 9 9)" />
      <path d="M12 3l-1-2h2z" fill="#5a2d12" />
    </svg>
  );
}
export function Bat() {
  return (
    <svg viewBox="0 0 48 24" className="bz-bat">
      <path d="M24 8c-2 0-3 2-3 3-3-4-9-6-14-5 2 2 3 4 2 7 3-1 6 0 7 3 2-2 5-2 8-1 3-1 6-1 8 1 1-3 4-4 7-3-1-3 0-5 2-7-5-1-11 1-14 5 0-1-1-3-3-3z" fill="#2b1840" />
      <circle cx="22.5" cy="10" r=".9" fill="#f59e0b" /><circle cx="25.5" cy="10" r=".9" fill="#f59e0b" />
    </svg>
  );
}
export function Pumpkin({ size = 1 }) {
  return (
    <svg viewBox="0 0 64 56" style={{ width: `${size * 64}px` }}>
      <path d="M32 12c-2-6 1-10 5-11l1 3c-3 1-4 4-3 8z" fill="#4d7c0f" />
      <ellipse cx="20" cy="34" rx="14" ry="19" fill="#ea7317" />
      <ellipse cx="44" cy="34" rx="14" ry="19" fill="#ea7317" />
      <ellipse cx="32" cy="34" rx="13" ry="21" fill="#f7881f" />
      <path d="M24 30l5 4h-6zM40 30l1 4h-6z" fill="#3b1d06" />
      <path d="M22 42q10 7 20 0l-3 1-2-2-3 2-3-2-3 2-2-2z" fill="#3b1d06" />
    </svg>
  );
}
export function Web() {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="rgba(60,40,80,.35)" strokeWidth="1.1">
      <path d="M120 0L0 120M120 0L30 120M120 0L70 120M120 0L0 30M120 0L0 70" />
      {[22, 44, 66, 90].map((r) => <path key={r} d={`M${120 - r} 0 Q${120 - r * 0.8} ${r * 0.45} ${120 - r * 0.72} ${r * 0.72} Q${120 - r * 0.45} ${r * 0.8} 120 ${r}`} />)}
    </svg>
  );
}
export function Spider() {
  return (
    <svg viewBox="0 0 30 30">
      <g stroke="#2b1840" strokeWidth="1.6" strokeLinecap="round">
        <path d="M15 15L5 9M15 15L4 15M15 15L6 21M15 15L25 9M15 15L26 15M15 15L24 21" />
      </g>
      <circle cx="15" cy="15" r="5" fill="#2b1840" /><circle cx="15" cy="9.5" r="3" fill="#2b1840" />
    </svg>
  );
}
export function Heart({ i = 0 }) {
  const c = pick(["#e11d48", "#f43f5e", "#fb7185", "#be123c", "#f9a8d4"], i);
  return <svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill={c} /></svg>;
}
export function Petal({ i = 0, red = false }) {
  const c = red ? pick(["#dc2626", "#ef4444", "#b91c1c"], i) : pick(PETALS, i);
  return <svg viewBox="0 0 20 20"><path d="M10 1c5 4 6 12 0 18C4 13 5 5 10 1z" fill={c} /></svg>;
}
export function Blossom({ i = 0 }) {
  const c = pick(PETALS, i);
  return (
    <svg viewBox="0 0 24 24">
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="12" cy="6.5" rx="3.6" ry="5" fill={c} transform={`rotate(${a} 12 12)`} />)}
      <circle cx="12" cy="12" r="2.6" fill="#facc15" />
    </svg>
  );
}
export function Egg({ color = "#f9a8d4", stripe = "#a855f7" }) {
  return (
    <svg viewBox="0 0 40 50">
      <path d="M20 2c10 0 18 18 18 30 0 9-8 16-18 16S2 41 2 32C2 20 10 2 20 2z" fill={color} />
      <path d="M3 27c6-4 10 4 17 0s11 4 17 0" stroke={stripe} strokeWidth="3" fill="none" />
      <path d="M5 37c5-3 10 3 15 0s10 3 15 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeDasharray="1 5" strokeLinecap="round" />
    </svg>
  );
}
export function Flower({ color = "#f472b6" }) {
  return (
    <svg viewBox="0 0 40 80">
      <path d="M20 30v48" stroke="#2f7a3e" strokeWidth="3" />
      <path d="M20 60c-8-2-12-8-12-12 6 0 11 5 12 12zM20 52c8-2 12-8 12-12-6 0-11 5-12 12z" fill="#3f9b52" />
      {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="20" cy="12" rx="6" ry="9" fill={color} transform={`rotate(${a} 20 20)`} />)}
      <circle cx="20" cy="20" r="5" fill="#facc15" />
    </svg>
  );
}
export function Carnation() {
  return (
    <svg viewBox="0 0 50 110">
      <path d="M25 40v68" stroke="#3f7d3a" strokeWidth="3" />
      <path d="M25 80c-10-4-14-12-14-16 8 1 13 8 14 16z" fill="#4c9a45" />
      <path d="M16 38l9 8 9-8-3-6H19z" fill="#4c9a45" />
      <path d="M8 22c2-10 8-16 17-16s15 6 17 16c-3 6-8 12-17 12S11 28 8 22z" fill="#d1121a" />
      <path d="M8 22l5-4 3 5 4-6 5 5 5-5 4 6 3-5 5 4" stroke="#8f0b11" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      <path d="M12 14l4 3 3-5 6 4 6-4 3 5 4-3" stroke="#ff4d55" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
export function Manjerico() {
  return (
    <svg viewBox="0 0 80 110">
      <path d="M18 70h44l-6 36H24z" fill="#c2622d" />
      <rect x="14" y="64" width="52" height="10" rx="3" fill="#d97736" />
      <circle cx="40" cy="44" r="26" fill="#2f8f3f" />
      {[[26, 36], [48, 30], [36, 54], [54, 48], [30, 22], [44, 46], [22, 50]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="4" fill="#3fae52" />)}
      <path d="M40 30V6" stroke="#5b3a1a" strokeWidth="1.5" />
      <path d="M40 6l16 6-16 6z" fill="#f43f5e" />
      <circle cx="40" cy="22" r="6" fill="#e11d48" /><circle cx="40" cy="22" r="3" fill="#fb7185" />
    </svg>
  );
}
export function Sardine() {
  return (
    <svg viewBox="0 0 90 34">
      <path d="M6 17c14-12 44-14 66-4l14-9-4 13 4 13-14-9C50 31 20 29 6 17z" fill="#8aa6bf" />
      <path d="M10 17c16-6 40-7 60-2" stroke="#d6e2ec" strokeWidth="3" fill="none" />
      <path d="M8 18c16 8 42 9 62 3" stroke="#5b7a96" strokeWidth="2" fill="none" />
      <circle cx="16" cy="15" r="2.4" fill="#1e293b" />
    </svg>
  );
}
export function Sun() {
  return (
    <svg viewBox="0 0 120 120">
      <g className="bz-sun-rays" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, k) => <path key={k} d="M60 8v14" transform={`rotate(${k * 30} 60 60)`} />)}
      </g>
      <circle cx="60" cy="60" r="28" fill="#fcd34d" />
      <circle cx="60" cy="60" r="22" fill="#fde68a" />
    </svg>
  );
}
export function Gull() {
  return <svg viewBox="0 0 40 16" fill="none" stroke="#334155" strokeWidth="2.2" strokeLinecap="round"><path className="bz-gull" d="M2 10q9-9 18 0 9-9 18 0" /></svg>;
}

// ---------- CONFIGURAÇÃO POR DECORAÇÃO ----------
const SHAPES = {
  snow: Snow, flake: Flake, confetti: Confetti, gold: (p) => <Confetti {...p} palette={GOLD} />,
  leaf: Leaf, chestnut: Chestnut, bat: Bat, heart: Heart, petal: Petal,
  petalRed: (p) => <Petal {...p} red />, blossom: Blossom, gull: Gull,
};

const DECOR = {
  natal: { particles: { shapes: ["snow"], count: 26, motion: "fall", size: [6, 13] }, top: "baubles", corner: "natal" },
  neve: { particles: { shapes: ["flake", "snow", "flake"], count: 30, motion: "fall", size: [9, 22] }, bottom: "drift" },
  anonovo: { particles: { shapes: ["gold"], count: 30, motion: "spin", size: [6, 11] }, top: "fireworks" },
  martinho: { particles: { shapes: ["chestnut", "leaf", "leaf"], count: 14, motion: "spin", size: [14, 22] }, corner: "castanhas" },
  outono: { particles: { shapes: ["leaf"], count: 18, motion: "spin", size: [14, 24] } },
  halloween: { particles: { shapes: ["bat"], count: 7, motion: "fly", size: [40, 62] }, topRight: "web", corner: "pumpkins" },
  carnaval: { particles: { shapes: ["confetti"], count: 38, motion: "spin", size: [6, 11] }, top: "serpentinas" },
  valentim: { particles: { shapes: ["heart"], count: 16, motion: "rise", size: [12, 26] } },
  pascoa: { particles: { shapes: ["petal", "blossom"], count: 12, motion: "spin", size: [10, 18] }, corner: "eggs" },
  cravos: { particles: { shapes: ["petalRed"], count: 12, motion: "spin", size: [10, 16] }, corner: "cravos" },
  primavera: { particles: { shapes: ["petal", "blossom", "petal"], count: 18, motion: "spin", size: [10, 18] }, corner: "flowers" },
  santos: { particles: null, top: "bunting", corner: "santos" },
  verao: { particles: { shapes: ["gull"], count: 4, motion: "fly", size: [22, 32] }, topRight: "sun", bottom: "waves" },
};

// Grinalda / bandeirinhas: arcos ao longo do topo
const ARCS = 7;
const arcY = (t) => (1 - t) * (1 - t) * 4 + 2 * t * (1 - t) * 40 + t * t * 4; // 0..40 (bezier quadrática)

function TopString({ kind }) {
  const path = Array.from({ length: ARCS }).map((_, i) => {
    const x0 = (i / ARCS) * 1000; const x1 = ((i + 1) / ARCS) * 1000;
    return `${i === 0 ? `M${x0},4` : ""} Q${(x0 + x1) / 2},40 ${x1},4`;
  }).join(" ");
  const items = [];
  if (kind === "baubles") {
    for (let i = 0; i < ARCS; i += 1) {
      [0.5, 0.2, 0.8].forEach((t, k) => {
        if (k > 0 && window.innerWidth < 900) return;
        const idx = i * 3 + k;
        items.push(
          <span key={idx} className="bz-hang" style={{ left: `${((i + t) / ARCS) * 100}%`, top: `${arcY(t) - 2}px`, "--len": `${k === 0 ? 18 : 6}px`, "--sw": `${2.5 + rnd(idx) * 3}s`, "--w": `${k === 0 ? 30 : 20}px` }}>
            <i /><Bauble color={pick(BAUBLE_COLORS, idx)} />
          </span>
        );
      });
    }
  }
  if (kind === "bunting") {
    const flagColors = ["#e11d48", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#facc15", "#ec4899"];
    for (let i = 0; i < ARCS; i += 1) {
      for (let k = 1; k < 8; k += 1) {
        const t = k / 8; const idx = i * 8 + k;
        items.push(<span key={idx} className="bz-flag" style={{ left: `${((i + t) / ARCS) * 100}%`, top: `${arcY(t) - 1}px`, "--c": pick(flagColors, idx), "--sw": `${2 + rnd(idx) * 2}s` }} />);
      }
    }
  }
  return (
    <div className={`bz-decor-top is-${kind}`}>
      <svg className="bz-decor-string" viewBox="0 0 1000 44" preserveAspectRatio="none" aria-hidden="true">
        <path d={path} fill="none" stroke={kind === "baubles" ? "#2f6b3a" : "#7c5c3b"} strokeWidth={kind === "baubles" ? 3.2 : 1.6} vectorEffect="non-scaling-stroke" />
        {kind === "baubles" && <path d={path} fill="none" stroke="#f2b134" strokeWidth="1.2" strokeDasharray="2 10" vectorEffect="non-scaling-stroke" />}
      </svg>
      {items}
    </div>
  );
}

function Fireworks() {
  const spots = [[12, 70, 0], [38, 40, 1.4], [64, 80, 0.7], [86, 46, 2.1], [52, 30, 3]];
  return (
    <div className="bz-decor-fireworks">
      {spots.map(([x, y, d], k) => (
        <span key={k} className="bz-firework" style={{ left: `${x}%`, top: `${y}px`, "--d": `${d}s`, "--c": pick(["#f6d365", "#f472b6", "#60a5fa", "#fbbf24", "#a78bfa"], k) }}>
          {Array.from({ length: 12 }).map((_, r) => <i key={r} style={{ transform: `rotate(${r * 30}deg)` }} />)}
        </span>
      ))}
    </div>
  );
}

function Serpentinas() {
  return (
    <svg className="bz-decor-serp" viewBox="0 0 1000 90" preserveAspectRatio="none" aria-hidden="true">
      {[["#f43f5e", 0], ["#f59e0b", 1], ["#10b981", 2], ["#3b82f6", 3], ["#a855f7", 4]].map(([c, k]) => (
        <path key={k} d={`M${k * 200 - 40},0 C${k * 200 + 20},70 ${k * 200 + 90},-10 ${k * 200 + 140},50 S${k * 200 + 230},20 ${k * 200 + 260},70`} stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function Corner({ kind }) {
  if (kind === "natal") return (
    <div className="bz-decor-corner is-natal">
      <span className="bz-c-cane a"><CandyCane /></span>
      <span className="bz-c-cane b"><CandyCane flip /></span>
      <span className="bz-c-tree"><Tree /></span>
      <span className="bz-c-gift a"><Gift color="#d62839" ribbon="#f2b134" /></span>
      <span className="bz-c-gift b"><Gift color="#1f7a4d" ribbon="#fff" /></span>
    </div>
  );
  if (kind === "pumpkins") return (
    <div className="bz-decor-corner is-pumpkins"><span className="a"><Pumpkin /></span><span className="b"><Pumpkin size={0.7} /></span></div>
  );
  if (kind === "castanhas") return (
    <div className="bz-decor-corner is-castanhas">
      <svg viewBox="0 0 140 60" className="bz-c-paper"><path d="M10 10h120l-14 46H24z" fill="#e8d3a8" /><path d="M10 10h120" stroke="#c9ad7a" strokeWidth="3" /></svg>
      {[[22, 8], [46, 2], [70, 6], [94, 0], [34, -14], [60, -16], [84, -12]].map(([x, y], k) => <span key={k} className="bz-c-nut" style={{ left: `${x}px`, bottom: `${44 + y}px` }}><Chestnut /></span>)}
      <span className="bz-c-steam" /><span className="bz-c-steam b" />
    </div>
  );
  if (kind === "eggs") return (
    <div className="bz-decor-corner is-eggs">
      {[["#f9a8d4", "#a855f7"], ["#bae6fd", "#f59e0b"], ["#fde68a", "#10b981"], ["#c4b5fd", "#ec4899"]].map(([c, s], k) => <span key={k} style={{ "--k": k }}><Egg color={c} stripe={s} /></span>)}
    </div>
  );
  if (kind === "flowers") return (
    <div className="bz-decor-corner is-flowers">
      {["#f472b6", "#fb923c", "#a78bfa", "#facc15", "#f472b6"].map((c, k) => <span key={k} style={{ "--k": k }}><Flower color={c} /></span>)}
    </div>
  );
  if (kind === "cravos") return (
    <div className="bz-decor-corner is-cravos">{[0, 1, 2].map((k) => <span key={k} style={{ "--k": k }}><Carnation /></span>)}</div>
  );
  if (kind === "santos") return (
    <div className="bz-decor-corner is-santos"><span className="bz-c-manj"><Manjerico /></span><span className="bz-c-sard"><Sardine /></span></div>
  );
  return null;
}

function Particles({ cfg }) {
  const count = typeof window !== "undefined" && window.innerWidth < 760 ? Math.ceil(cfg.count * 0.5) : cfg.count;
  const list = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const [min, max] = cfg.size;
    return {
      i,
      Shape: SHAPES[pick(cfg.shapes, i)],
      left: rnd(i, 1) * 100,
      top: rnd(i, 9) * 70,
      size: min + rnd(i, 2) * (max - min),
      dur: (cfg.motion === "fly" ? 16 : 9) + rnd(i, 4) * (cfg.motion === "fly" ? 14 : 10),
      delay: -rnd(i, 5) * 20,
      drift: (rnd(i, 6) - 0.5) * 120,
      rot: rnd(i, 8) * 360,
    };
  }), [cfg, count]);
  return (
    <div className={`bz-decor-particles is-${cfg.motion}`}>
      {list.map((p) => (
        <span
          key={p.i}
          className="bz-p"
          style={{ left: `${p.left}%`, "--top": `${p.top}%`, "--s": `${p.size}px`, "--d": `${p.dur}s`, "--delay": `${p.delay}s`, "--x": `${p.drift}px`, "--r": `${p.rot}deg` }}
        >
          <p.Shape i={p.i} />
        </span>
      ))}
    </div>
  );
}

export default function ThemeDecor() {
  const { currentTheme } = useTheme();
  const [enabled, setEnabled] = useState(isDecorEnabled);
  useEffect(() => onDecorChange(setEnabled), []);

  const decor = THEMES[currentTheme]?.decor;
  const cfg = decor ? DECOR[decor] : null;
  if (!cfg || !enabled) return null;

  return (
    <div className={`bz-decor bz-decor-${decor}`} aria-hidden="true">
      {cfg.particles && <Particles cfg={cfg.particles} />}
      {(cfg.top === "baubles" || cfg.top === "bunting") && <TopString kind={cfg.top} />}
      {cfg.top === "fireworks" && <Fireworks />}
      {cfg.top === "serpentinas" && <Serpentinas />}
      {cfg.topRight === "web" && <div className="bz-decor-web"><Web /><span className="bz-spider"><i /><Spider /></span></div>}
      {cfg.topRight === "sun" && <div className="bz-decor-sun"><Sun /></div>}
      {cfg.bottom === "waves" && (
        <div className="bz-decor-waves">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none"><path d="M0 30 Q75 10 150 30 T300 30 T450 30 T600 30 T750 30 T900 30 T1050 30 T1200 30 V60 H0Z" fill="rgba(56,189,248,.35)" /></svg>
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="b"><path d="M0 34 Q75 18 150 34 T300 34 T450 34 T600 34 T750 34 T900 34 T1050 34 T1200 34 V60 H0Z" fill="rgba(14,165,233,.35)" /></svg>
        </div>
      )}
      {cfg.bottom === "drift" && <div className="bz-decor-drift" />}
      {cfg.corner && <Corner kind={cfg.corner} />}
    </div>
  );
}

// Emblema usado nos cartões do seletor de temas
export function DecorEmblem({ decor }) {
  switch (decor) {
    case "natal": return <div className="bz-emb is-natal"><span className="t"><Tree /></span><span className="c"><CandyCane /></span><span className="b1"><Bauble color="#f2b134" /></span></div>;
    case "neve": return <div className="bz-emb is-neve"><span className="f1"><Flake /></span><span className="f2"><Flake /></span><span className="f3"><Flake /></span></div>;
    case "anonovo": return <div className="bz-emb is-anonovo"><Fireworks /></div>;
    case "martinho": return <div className="bz-emb is-row"><Chestnut /><Leaf i={1} /><Chestnut /></div>;
    case "outono": return <div className="bz-emb is-row"><Leaf i={0} /><Leaf i={2} /><Leaf i={3} /></div>;
    case "halloween": return <div className="bz-emb is-row"><Pumpkin size={0.8} /><span className="bz-emb-bat"><Bat /></span></div>;
    case "carnaval": return <div className="bz-emb is-confetti">{Array.from({ length: 14 }).map((_, i) => <span key={i} style={{ left: `${rnd(i, 1) * 90}%`, top: `${rnd(i, 2) * 80}%`, transform: `rotate(${rnd(i, 3) * 180}deg)` }}><Confetti i={i} /></span>)}</div>;
    case "valentim": return <div className="bz-emb is-row"><Heart i={0} /><Heart i={2} /><Heart i={1} /></div>;
    case "pascoa": return <div className="bz-emb is-row"><Egg /><Egg color="#bae6fd" stripe="#f59e0b" /><Egg color="#fde68a" stripe="#10b981" /></div>;
    case "cravos": return <div className="bz-emb is-row is-tall"><Carnation /><Carnation /></div>;
    case "primavera": return <div className="bz-emb is-row"><Blossom i={0} /><Blossom i={2} /><Blossom i={4} /></div>;
    case "santos": return <div className="bz-emb is-row is-tall"><Manjerico /><span className="bz-emb-sard"><Sardine /></span></div>;
    case "verao": return <div className="bz-emb is-verao"><Sun /></div>;
    default: return null;
  }
}
