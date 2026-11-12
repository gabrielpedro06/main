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
export function Petal({ i = 0 }) {
  const c = pick(PETALS, i);
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

// ---------- NOVOS: Día de Muertos, Todos-os-Santos, Marianos, Reis, Ano Novo Chinês ----------
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const PAPEL_COLORS = ["#e11d48", "#f59e0b", "#7c3aed", "#10b981", "#ec4899", "#0ea5e9", "#f97316"];
const MARIGOLD = ["#f59e0b", "#fb923c", "#f97316", "#fbbf24", "#ea580c"];
const ROSE_PETALS = ["#ffffff", "#f8fafc", "#dbeafe", "#fef3c7", "#e0e7ff"];

export function PapelPicado({ color = "#e11d48" }) {
  const outer = "M0 0H36V36q-3 5-6 0q-3 5-6 0q-3 5-6 0q-3 5-6 0q-3 5-6 0q-3 5-6 0Z";
  const holes = [
    "M18 5l3.5 3.5L18 12l-3.5-3.5z",
    circ(8, 9, 2), circ(28, 9, 2),
    circ(18, 22, 4.2),
    circ(10, 22, 1.6), circ(26, 22, 1.6), circ(18, 14.5, 1.4), circ(18, 29.5, 1.4),
    "M5 31l2-3 2 3zM27 31l2-3 2 3z",
  ].join("");
  return (
    <svg viewBox="0 0 36 42">
      <path d={outer + holes} fill={color} fillRule="evenodd" />
    </svg>
  );
}

export function Cempasuchil() {
  return (
    <svg viewBox="0 0 40 40">
      {Array.from({ length: 12 }).map((_, k) => <ellipse key={`a${k}`} cx="20" cy="9" rx="5" ry="8.5" fill="#f59e0b" transform={`rotate(${k * 30} 20 20)`} />)}
      {Array.from({ length: 10 }).map((_, k) => <ellipse key={`b${k}`} cx="20" cy="12" rx="4" ry="6.5" fill="#fb923c" transform={`rotate(${k * 36 + 18} 20 20)`} />)}
      {Array.from({ length: 8 }).map((_, k) => <ellipse key={`c${k}`} cx="20" cy="14.5" rx="3" ry="4.5" fill="#fbbf24" transform={`rotate(${k * 45} 20 20)`} />)}
      <circle cx="20" cy="20" r="3.5" fill="#c2410c" />
    </svg>
  );
}
export function MarigoldPetal({ i = 0 }) {
  return <svg viewBox="0 0 20 20"><path d="M10 2c4 2 6 7 3 12-1 2-5 2-6 0C4 9 6 4 10 2z" fill={pick(MARIGOLD, i)} /></svg>;
}

export function Calavera() {
  const eye = (cx, c) => (
    <g key={cx}>
      {Array.from({ length: 8 }).map((_, k) => <ellipse key={k} cx={cx} cy="33" rx="2.6" ry="4" fill={c} transform={`rotate(${k * 45} ${cx} 40)`} />)}
      <circle cx={cx} cy="40" r="7" fill="#2a1b3d" />
      <circle cx={cx + 2} cy="38" r="1.8" fill="#fff" />
    </g>
  );
  return (
    <svg viewBox="0 0 80 92">
      <path d="M40 4C18 4 6 20 6 40c0 12 6 20 14 24v13c0 4 3 7 7 7h26c4 0 7-3 7-7V64c8-4 14-12 14-24C74 20 62 4 40 4z" fill="#fdf8f0" stroke="#e6d6bd" strokeWidth="1.5" />
      {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="40" cy="12" rx="3" ry="5" fill="#ec4899" transform={`rotate(${a} 40 17)`} />)}
      <circle cx="40" cy="17" r="2.6" fill="#facc15" />
      <path d="M22 24q-6 2-7 8M58 24q6 2 7 8" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" />
      {eye(27, "#0ea5e9")}
      {eye(53, "#f59e0b")}
      <path d="M40 52c-3-4-7-1-5 2l5 5 5-5c2-3-2-6-5-2z" fill="#7c3aed" />
      <circle cx="16" cy="54" r="2" fill="#f43f5e" /><circle cx="64" cy="54" r="2" fill="#f43f5e" />
      <path d="M26 68h28" stroke="#2a1b3d" strokeWidth="2" strokeLinecap="round" />
      {[30, 35, 40, 45, 50].map((x) => <path key={x} d={`M${x} 64v8`} stroke="#2a1b3d" strokeWidth="1.6" strokeLinecap="round" />)}
    </svg>
  );
}

export function Candle({ color = "#fdf6e3" }) {
  return (
    <svg viewBox="0 0 24 90">
      <circle className="bz-flame-glow" cx="12" cy="12" r="11" fill="#fde68a" opacity="0.45" />
      <g className="bz-flame">
        <path d="M12 1c4 6 6 9 6 13a6 6 0 0 1-12 0c0-4 2-7 6-13z" fill="#f59e0b" />
        <path d="M12 7c2 3 3 5 3 7a3 3 0 0 1-6 0c0-2 1-4 3-7z" fill="#fef3c7" />
      </g>
      <path d="M12 20v5" stroke="#3f2d1a" strokeWidth="1.5" />
      <rect x="4" y="24" width="16" height="66" rx="2.5" fill={color} />
      <path d="M4 27c3 0 3 7 5.5 7S11 27 14 27s3 4 6 4v-4H4z" fill="#fff" opacity="0.7" />
      <rect x="4" y="24" width="4" height="66" fill="#000" opacity="0.05" />
    </svg>
  );
}

export function Crisantemo({ color = "#fde68a", center = "#d97706" }) {
  return (
    <svg viewBox="0 0 40 80">
      <path d="M20 32v46" stroke="#3f7a3a" strokeWidth="3" />
      <path d="M20 62c-8-2-12-8-12-12 6 0 11 5 12 12zM20 54c8-2 12-8 12-12-6 0-11 5-12 12z" fill="#4d8f45" />
      {Array.from({ length: 18 }).map((_, k) => <ellipse key={k} cx="20" cy="8" rx="2.2" ry="9" fill={color} stroke="rgba(0,0,0,.08)" strokeWidth="0.5" transform={`rotate(${k * 20} 20 18)`} />)}
      {Array.from({ length: 12 }).map((_, k) => <ellipse key={`i${k}`} cx="20" cy="12" rx="1.8" ry="5.5" fill={color} stroke="rgba(0,0,0,.1)" strokeWidth="0.5" transform={`rotate(${k * 30 + 10} 20 18)`} />)}
      <circle cx="20" cy="18" r="3" fill={center} />
    </svg>
  );
}

export function Rose({ color = "#ffffff", line = "#cbd5e1" }) {
  return (
    <svg viewBox="0 0 40 80">
      <path d="M20 28v50" stroke="#2f6b3a" strokeWidth="3" />
      <path d="M20 58c-9-1-13-7-13-11 7 0 12 5 13 11zM20 48c9-1 13-7 13-11-7 0-12 5-13 11z" fill="#3f8a4c" />
      <path d="M8 18c0-8 6-13 12-13s12 5 12 13c0 6-5 11-12 11S8 24 8 18z" fill={color} stroke={line} strokeWidth="1.2" />
      <path d="M11 17c2-5 6-7 9-7s7 2 9 7" fill="none" stroke={line} strokeWidth="1.2" />
      <path d="M15 18c0-3 2.5-5 5-5s5 2 5 4.5-2.5 3.5-5 3.5c-2 0-3-1.2-3-2.6 0-1.3 1-2.2 2.3-2.2" fill="none" stroke={line} strokeWidth="1.2" />
      <path d="M8 18c3 4 7 6 12 6s9-2 12-6" fill="none" stroke={line} strokeWidth="1" />
    </svg>
  );
}

export function Lily() {
  return (
    <svg viewBox="0 0 40 90">
      <path d="M20 30v58" stroke="#3f7a3a" strokeWidth="2.6" />
      <path d="M20 70C10 66 6 56 7 46c6 6 11 13 13 24zM20 60c9-3 13-11 13-19-6 4-11 10-13 19z" fill="#4d8f45" />
      <path d="M20 32C10 28 3 17 5 8c7 5 11 11 15 24z" fill="#fff" stroke="#d6d3d1" strokeWidth="1" />
      <path d="M20 32C30 28 37 17 35 8c-7 5-11 11-15 24z" fill="#fff" stroke="#d6d3d1" strokeWidth="1" />
      <path d="M20 32C15 22 15 10 20 1c5 9 5 21 0 31z" fill="#fff" stroke="#d6d3d1" strokeWidth="1" />
      <g stroke="#b45309" strokeWidth="1" strokeLinecap="round"><path d="M20 30L15 17M20 30L20 14M20 30l5-13" /></g>
      <circle cx="15" cy="17" r="1.6" fill="#d97706" /><circle cx="20" cy="14" r="1.6" fill="#d97706" /><circle cx="25" cy="17" r="1.6" fill="#d97706" />
    </svg>
  );
}

export function Star({ i = 0 }) {
  return <svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill={pick(["#f6c343", "#fcd34d", "#eab308"], i)} /></svg>;
}
export function Sparkle({ i = 0 }) {
  return <svg viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0z" fill={pick(GOLD, i)} /></svg>;
}
export function RosePetal({ i = 0 }) {
  return <svg viewBox="0 0 20 20"><path d="M10 1c5 4 6 12 0 18C4 13 5 5 10 1z" fill={pick(ROSE_PETALS, i)} stroke="#b8c4d9" strokeWidth="0.7" /></svg>;
}
export function GlowOrb() {
  return (
    <svg viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9.5" fill="#f59e0b" opacity="0.18" />
      <circle cx="10" cy="10" r="6" fill="#f59e0b" opacity="0.35" />
      <circle cx="10" cy="10" r="3.2" fill="#fbbf24" />
      <circle cx="10" cy="10" r="1.6" fill="#fffbeb" />
    </svg>
  );
}
export function Coin() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10.5" fill="#f2b705" stroke="#b7860b" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#fde68a" strokeWidth="1" />
      <rect x="9" y="9" width="6" height="6" fill="#b7860b" />
    </svg>
  );
}

export function Lantern() {
  return (
    <svg viewBox="0 0 40 62">
      <rect x="13" y="2" width="14" height="5" rx="1.5" fill="#d4a017" />
      <ellipse cx="20" cy="27" rx="17" ry="19" fill="#dc2626" />
      <ellipse cx="20" cy="27" rx="11" ry="19" fill="none" stroke="#991b1b" strokeWidth="1.2" />
      <ellipse cx="20" cy="27" rx="4" ry="19" fill="none" stroke="#991b1b" strokeWidth="1.2" />
      <ellipse className="bz-lantern-glow" cx="20" cy="27" rx="9" ry="12" fill="#fca5a5" opacity="0.45" />
      <rect x="13" y="44" width="14" height="5" rx="1.5" fill="#d4a017" />
      <g stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"><path d="M17 50v11M20 50v12M23 50v11" /></g>
    </svg>
  );
}

export function Crown() {
  return (
    <svg viewBox="0 0 60 46">
      <path d="M5 38L3 11l14 12L30 4l13 19 14-12-2 27z" fill="#f2c94c" stroke="#c99a1b" strokeWidth="2" strokeLinejoin="round" />
      <rect x="4" y="35" width="52" height="9" rx="2.5" fill="#e0b13a" stroke="#c99a1b" strokeWidth="1.5" />
      <circle cx="30" cy="22" r="4" fill="#dc2626" /><circle cx="17" cy="28" r="3" fill="#2563eb" /><circle cx="43" cy="28" r="3" fill="#16a34a" />
      <circle cx="3" cy="11" r="2.6" fill="#f2c94c" /><circle cx="30" cy="4" r="2.8" fill="#f2c94c" /><circle cx="57" cy="11" r="2.6" fill="#f2c94c" />
      {[12, 22, 38, 48].map((x) => <circle key={x} cx={x} cy="39.5" r="1.6" fill="#fff7d6" />)}
    </svg>
  );
}

export function BoloRei() {
  const fruits = [[22, 26, "#dc2626"], [36, 18, "#16a34a"], [56, 15, "#f97316"], [76, 17, "#dc2626"], [94, 24, "#16a34a"], [100, 34, "#facc15"], [84, 41, "#f97316"], [60, 45, "#dc2626"], [36, 42, "#facc15"], [18, 36, "#16a34a"]];
  return (
    <svg viewBox="0 0 120 64">
      <ellipse cx="60" cy="56" rx="54" ry="6" fill="#000" opacity="0.08" />
      <ellipse cx="60" cy="38" rx="55" ry="20" fill="#b9732f" />
      <ellipse cx="60" cy="31" rx="54" ry="19" fill="#e0a458" />
      <ellipse cx="60" cy="31" rx="18" ry="6" fill="#8a4e1c" />
      {fruits.map(([x, y, c], k) => <rect key={k} x={x - 3.5} y={y - 2.5} width="7" height="5" rx="1.5" fill={c} transform={`rotate(${k * 37} ${x} ${y})`} />)}
      {Array.from({ length: 18 }).map((_, k) => <circle key={`s${k}`} cx={14 + rnd(k, 3) * 92} cy={18 + rnd(k, 7) * 26} r="1.1" fill="#fff" opacity="0.9" />)}
    </svg>
  );
}

function ShootingStar() {
  return (
    <svg viewBox="0 0 220 130">
      <defs>
        <linearGradient id="bzStarTail" x1="0" y1="0" x2="1" y2="0.55">
          <stop offset="0" stopColor="#f6d365" stopOpacity="0" />
          <stop offset="1" stopColor="#f6d365" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path className="bz-star-tail" d="M6 8L170 62l-6 10z" fill="url(#bzStarTail)" />
      <g className="bz-star-big">
        <circle cx="172" cy="68" r="22" fill="#fde68a" opacity="0.3" />
        <path d="M172 34C174 58 178 64 206 68 178 72 174 78 172 102 170 78 166 72 138 68 166 64 170 58 172 34z" fill="#f6c343" />
        <path d="M172 52C173 64 175 66 188 68 175 70 173 72 172 84 171 72 169 70 156 68 169 66 171 64 172 52z" fill="#fffbeb" />
      </g>
    </svg>
  );
}

function Terco() {
  const quad = (p0, p1, p2, t) => [(1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1]];
  const beads = [];
  [[[12, 0], [6, 110], [55, 128]], [[98, 0], [104, 110], [55, 128]]].forEach(([a, b, c], side) => {
    for (let k = 0; k < 15; k += 1) {
      const [x, y] = quad(a, b, c, k / 15);
      beads.push(<circle key={`${side}-${k}`} cx={x} cy={y} r={k % 11 === 0 ? 3.4 : 2.4} fill={k % 11 === 0 ? "#2f5fa8" : "#eef2fb"} stroke="#5b6f99" strokeWidth="1.1" />);
    }
  });
  return (
    <svg viewBox="0 0 110 190">
      {beads}
      <path d="M55 124c-6 0-8 5-8 9 0 5 4 8 8 8s8-3 8-8c0-4-2-9-8-9z" fill="#d4af37" stroke="#a8831c" strokeWidth="1" />
      {[148, 155, 162].map((y, k) => <circle key={y} cx="55" cy={y} r={k === 0 ? 3.2 : 2.4} fill={k === 0 ? "#2f5fa8" : "#eef2fb"} stroke="#5b6f99" strokeWidth="1.1" />)}
      <path d="M52.5 166h5v6h6v5h-6v12h-5v-12h-6v-5h6z" fill="#d4af37" stroke="#a8831c" strokeWidth="0.8" />
    </svg>
  );
}

function Stars12() {
  return (
    <div className="bz-decor-stars12">
      {Array.from({ length: 12 }).map((_, k) => {
        const a = Math.PI * (k / 11);
        return <span key={k} style={{ left: `${50 + 46 * Math.cos(a)}%`, top: `${8 + 70 * Math.sin(a)}%`, "--d": `${(k % 4) * 0.5}s` }}><Star i={k} /></span>;
      })}
    </div>
  );
}

// Dragão chinês (canto inferior direito): corpo em segmentos que ondulam em onda (dança do dragão), cabeça e pérola
function DragonHead() {
  return (
    <svg viewBox="0 0 80 60">
      <path d="M14 22c-8-6-12-14-10-20 4 6 9 8 14 8-2-6 0-10 4-10 0 6 4 9 8 10" fill="#f2b705" />
      <path d="M8 34c-6 2-8 8-6 12 3-3 6-4 10-3M10 42c-3 5-2 10 2 12 1-4 3-6 7-7" fill="#f2b705" />
      <path d="M12 32C12 16 28 9 42 12c12 3 22 8 30 14 3 3 0 8-6 8l2 6c-6 7-17 8-26 4-9 5-24 3-30-12z" fill="#d62828" stroke="#fcd34d" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M44 14c10 2 19 7 27 13-6 1-12 0-18-3-4-2-7-5-9-10z" fill="#ef4444" />
      <path d="M40 41c8 3 17 3 24-2" stroke="#7f1d1d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M46 40l2 4 2-4zM53 40l2 4 2-4zM60 38l2 4 2-4z" fill="#fff" />
      <path d="M30 12C26 4 18 0 10 2c6 2 10 6 12 12M38 11c-1-6-5-10-11-11 4 3 6 6 6 11" stroke="#f2b705" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <ellipse cx="44" cy="22" rx="6" ry="5" fill="#fff" />
      <circle cx="46" cy="22" r="3" fill="#111827" /><circle cx="47" cy="21" r="1" fill="#fff" />
      <path d="M36 16c4-3 10-3 14 0" stroke="#f2b705" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="69" cy="27" r="1.4" fill="#7f1d1d" />
      <path className="bz-dragon-whisker" d="M66 31c10 4 12 14 4 20-5 4-12 3-16 0" stroke="#f59e0b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path className="bz-dragon-whisker b" d="M64 24c8-6 16-6 18 0 1 4-2 7-6 7" stroke="#f59e0b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M22 44c2 6 6 10 12 11-2-4-2-7 0-10" fill="#fbbf24" />
    </svg>
  );
}
function DragonSegment({ leg }) {
  return (
    <svg viewBox="0 0 40 50">
      <path d="M20 1l6 11H14z" fill="#f2b705" />
      {leg && <path d="M14 38l-4 10m4-10l1 11m-1-11l6 9" stroke="#f2b705" strokeWidth="2.6" strokeLinecap="round" />}
      <circle cx="20" cy="26" r="15" fill="#d62828" stroke="#fcd34d" strokeWidth="1.6" />
      <path d="M8 31c8 8 16 8 24 0-2 6-7 10-12 10S10 37 8 31z" fill="#fbbf24" />
      <path d="M9 22c3-4 7-4 11 0 4-4 8-4 11 0M12 28c3-3 5-3 8 0 3-3 5-3 8 0" stroke="#f59e0b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function Dragon() {
  const N = 14;
  return (
    <div className="bz-decor-dragon">
      <span className="bz-dragon-tail" style={{ "--k": 0 }}>
        <svg viewBox="0 0 40 40"><path d="M38 20C28 10 14 4 2 8c8 2 12 6 14 10C8 18 2 24 2 32c8-6 18-8 36-12z" fill="#f2b705" /></svg>
      </span>
      {Array.from({ length: N }).map((_, k) => (
        <span key={k} className="bz-dragon-seg" style={{ left: `${22 + k * 19}px`, "--k": k + 1, "--s": (0.5 + 0.5 * (k / (N - 1))).toFixed(2), zIndex: k }}>
          <DragonSegment leg={k === 4 || k === 10} />
        </span>
      ))}
      <span className="bz-dragon-head" style={{ left: `${22 + N * 19 - 8}px`, "--k": N + 1, zIndex: N + 1 }}><DragonHead /></span>
      <span className="bz-dragon-pearl" style={{ left: `${22 + N * 19 + 76}px` }}>
        <svg viewBox="0 0 30 30">
          <path d="M15 1c4 5 8 6 8 12a8 8 0 0 1-16 0c0-6 4-7 8-12z" fill="#fb923c" opacity="0.75" />
          <circle cx="15" cy="17" r="7" fill="#fde68a" /><circle cx="13" cy="15" r="2.4" fill="#fff" opacity="0.9" />
        </svg>
      </span>
    </div>
  );
}

// ---------- CHUVA ----------
function RainDrop() {
  return <i className="bz-drop" />;
}
export function Cloud({ tone = "#cbd5e1", shade = "#94a3b8" }) {
  return (
    <svg viewBox="0 0 120 64">
      <path d="M26 56h70a20 20 0 0 0 2-40 28 28 0 0 0-52-4A22 22 0 0 0 26 56z" fill={tone} />
      <path d="M26 56h70a20 20 0 0 0 16-8H14a22 22 0 0 0 12 8z" fill={shade} opacity="0.55" />
    </svg>
  );
}
export function Umbrella({ color = "#facc15", dark = "#ca8a04" }) {
  return (
    <svg viewBox="0 0 80 96">
      <path d="M40 4v6" stroke="#57534e" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 42C4 22 20 9 40 9s36 13 36 33q-9-7-18 0-9-7-18 0-9-7-18 0-9-7-18 0z" fill={color} />
      <path d="M40 9C30 16 24 28 22 42M40 9c10 7 16 19 18 33" stroke={dark} strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d="M40 40v40q0 9-8 9t-7-7" stroke="#57534e" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ---------- DIA DA MULHER ----------
const WOMEN_PETALS = ["#c084fc", "#a855f7", "#f0abfc", "#e9d5ff", "#f472b6"];
export function MimosaPuff({ i = 0 }) {
  return (
    <svg viewBox="0 0 20 20">
      {Array.from({ length: 10 }).map((_, k) => (
        <circle key={k} cx={10 + Math.cos((k / 10) * Math.PI * 2) * 6} cy={10 + Math.sin((k / 10) * Math.PI * 2) * 6} r={2.4 + rnd(i + k, 4) * 0.8} fill="#fde047" />
      ))}
      <circle cx="10" cy="10" r="6.4" fill="#facc15" />
      <circle cx="8" cy="8" r="2" fill="#fef08a" opacity="0.8" />
    </svg>
  );
}
function WomenPetal({ i = 0 }) {
  return <svg viewBox="0 0 20 20"><path d="M10 1c5 4 6 12 0 18C4 13 5 5 10 1z" fill={pick(WOMEN_PETALS, i)} /></svg>;
}
export function MiniFlower({ color = "#c084fc", center = "#facc15" }) {
  return (
    <svg viewBox="0 0 20 20">
      {[0, 1, 2, 3, 4].map((k) => <ellipse key={k} cx="10" cy="5" rx="3.6" ry="4.8" fill={color} transform={`rotate(${k * 72} 10 10)`} />)}
      <circle cx="10" cy="10" r="3" fill={center} />
    </svg>
  );
}
export function Tulip({ color = "#a855f7", shade = "#7e22ce" }) {
  return (
    <svg viewBox="0 0 30 90">
      <path d="M15 30v58" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M15 66q-13-3-13-20 11 5 13 16" fill="#22c55e" />
      <path d="M15 60q13-6 12-22-10 6-12 17" fill="#15803d" />
      <path d="M4 8l5.5 7L15 5l5.5 10L26 8v13a11 11 0 0 1-22 0z" fill={color} />
      <path d="M15 5l5.5 10L26 8v13a11 11 0 0 1-11 11z" fill={shade} opacity="0.35" />
    </svg>
  );
}
export function MimosaBranch() {
  const puffs = [[44, 10], [36, 18], [50, 22], [31, 28], [44, 31], [27, 40], [38, 44], [23, 52]];
  const leaves = [[38, 26, -30], [30, 36, 30], [34, 50, -25], [26, 60, 25], [42, 16, 35]];
  return (
    <svg viewBox="0 0 60 96">
      <path d="M28 94C27 66 33 40 46 10" stroke="#4d7c0f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {leaves.map(([x, y, r], k) => <ellipse key={k} cx={x} cy={y} rx="2.4" ry="9" fill="#65a30d" transform={`rotate(${r} ${x} ${y})`} opacity="0.9" />)}
      {puffs.map(([x, y], k) => (
        <g key={k}>
          <circle cx={x} cy={y} r="5" fill="#fde047" />
          <circle cx={x} cy={y} r="3.6" fill="#facc15" />
        </g>
      ))}
    </svg>
  );
}
function BouquetWrap() {
  return (
    <svg viewBox="0 0 120 80">
      <path d="M8 4h104L72 76H48z" fill="#ede9fe" />
      <path d="M8 4h104L92 22H28z" fill="#ddd6fe" />
      <path d="M60 4L48 76h24z" fill="#c4b5fd" opacity="0.45" />
      <path d="M40 40q20 8 40 0v10q-20 8-40 0z" fill="#7e22ce" />
      <path d="M60 45q-16-14-22-4 4 9 22 4zM60 45q16-14 22-4-4 9-22 4z" fill="#9333ea" />
      <circle cx="60" cy="45" r="3.5" fill="#6b21a8" />
    </svg>
  );
}

// ---------- CONFIGURAÇÃO POR DECORAÇÃO ----------
const SHAPES = {
  drop: RainDrop, mimosa: MimosaPuff, wpetal: WomenPetal,
  wflower: ({ i = 0 }) => <MiniFlower color={pick(["#c084fc", "#f472b6", "#a855f7", "#e879f9"], i)} />,
  snow: Snow, flake: Flake, confetti: Confetti, gold: (p) => <Confetti {...p} palette={GOLD} />,
  leaf: Leaf, chestnut: Chestnut, bat: Bat, heart: Heart, petal: Petal,
  blossom: Blossom, gull: Gull,
  marigold: Cempasuchil, mpetal: MarigoldPetal, rpetal: RosePetal, star: Star, sparkle: Sparkle, glow: GlowOrb, coin: Coin,
  redconfetti: (p) => <Confetti {...p} palette={["#dc2626", "#f59e0b", "#facc15", "#b91c1c"]} />,
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
  primavera: { particles: { shapes: ["petal", "blossom", "petal"], count: 18, motion: "spin", size: [10, 18] }, corner: "flowers" },
  santos: { particles: null, top: "bunting", corner: "santos" },
  verao: { particles: { shapes: ["gull"], count: 4, motion: "fly", size: [22, 32] }, topRight: "sun", bottom: "waves" },
  muertos: { particles: { shapes: ["marigold", "mpetal", "mpetal"], count: 18, motion: "spin", size: [10, 18] }, top: "papel", corner: "altar" },
  fieis: { particles: { shapes: ["glow"], count: 16, motion: "rise", size: [16, 28] }, corner: "velas" },
  fatima: { particles: { shapes: ["rpetal", "rpetal", "star"], count: 16, motion: "spin", size: [9, 16] }, glow: true, topRight: "terco", corner: "fatima" },
  conceicao: { particles: { shapes: ["rpetal", "star"], count: 14, motion: "fall", size: [8, 14] }, glow: true, top: "stars12", corner: "lirios" },
  reis: { particles: { shapes: ["sparkle", "gold"], count: 22, motion: "spin", size: [7, 13] }, topRight: "estrela", corner: "reis" },
  lunar: { particles: { shapes: ["coin", "redconfetti"], count: 18, motion: "spin", size: [9, 15] }, top: "lanterns", bottomLeft: "dragon" },
  chuva: { particles: { shapes: ["drop"], count: 80, motion: "rain", size: [16, 30] }, top: "clouds", bottom: "splash", corner: "chuva" },
  mulher: { particles: { shapes: ["mimosa", "wpetal", "wflower", "wpetal"], count: 20, motion: "spin", size: [9, 17] }, top: "flores", corner: "mulher" },
};

function Clouds() {
  const list = [[-4, -18, 210, 0], [22, -26, 170, 1], [46, -14, 230, 2], [70, -24, 190, 3], [88, -12, 200, 4]];
  return (
    <div className="bz-decor-clouds">
      {list.map(([x, y, w, k]) => (
        <span key={k} style={{ left: `${x}%`, top: `${y}px`, width: `${w}px`, "--d": `${38 + k * 7}s`, "--k": k }}>
          <Cloud tone={k % 2 ? "#cbd5e1" : "#d8dee8"} shade={k % 2 ? "#94a3b8" : "#a3b1c4"} />
        </span>
      ))}
    </div>
  );
}

function Splashes() {
  return (
    <div className="bz-decor-splash">
      {Array.from({ length: 16 }).map((_, i) => (
        <i key={i} style={{ left: `${rnd(i, 11) * 96}%`, bottom: `${6 + rnd(i, 12) * 34}px`, "--d": `${1.1 + rnd(i, 13) * 0.9}s`, "--delay": `${-rnd(i, 14) * 2}s` }} />
      ))}
    </div>
  );
}

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
  if (kind === "papel") {
    for (let i = 0; i < ARCS; i += 1) {
      for (let k = 1; k < 7; k += 1) {
        const t = k / 7; const idx = i * 7 + k;
        items.push(
          <span key={idx} className="bz-papel" style={{ left: `${((i + t) / ARCS) * 100}%`, top: `${arcY(t) - 1}px`, "--sw": `${2 + rnd(idx) * 2}s` }}>
            <PapelPicado color={pick(PAPEL_COLORS, idx)} />
          </span>
        );
      }
    }
  }
  if (kind === "lanterns") {
    for (let i = 0; i < ARCS; i += 1) {
      [0.5, 0.18, 0.82].forEach((t, k) => {
        if (k > 0 && window.innerWidth < 900) return;
        const idx = i * 3 + k;
        items.push(
          <span key={idx} className="bz-hang" style={{ left: `${((i + t) / ARCS) * 100}%`, top: `${arcY(t) - 2}px`, "--len": `${k === 0 ? 16 : 6}px`, "--sw": `${3 + rnd(idx) * 3}s`, "--w": `${k === 0 ? 34 : 24}px` }}>
            <i /><Lantern />
          </span>
        );
      });
    }
  }
  if (kind === "flores") {
    const cores = ["#c084fc", "#f472b6", "#a855f7", "#e879f9"];
    for (let i = 0; i < ARCS; i += 1) {
      for (let k = 1; k < 7; k += 1) {
        const t = k / 7; const idx = i * 7 + k;
        const mimosa = idx % 3 === 0;
        items.push(
          <span key={idx} className={`bz-flor ${mimosa ? "is-mimosa" : ""}`} style={{ left: `${((i + t) / ARCS) * 100}%`, top: `${arcY(t) - 2}px`, "--sw": `${2.4 + rnd(idx) * 2}s`, "--w": `${mimosa ? 13 : 15 + rnd(idx, 2) * 6}px` }}>
            {mimosa ? <MimosaPuff i={idx} /> : <MiniFlower color={pick(cores, idx)} />}
          </span>
        );
      }
    }
  }
  const stringColor = kind === "baubles" ? "#2f6b3a" : kind === "lanterns" ? "#b45309" : kind === "flores" ? "#4d7c0f" : "#7c5c3b";
  return (
    <div className={`bz-decor-top is-${kind}`}>
      <svg className="bz-decor-string" viewBox="0 0 1000 44" preserveAspectRatio="none" aria-hidden="true">
        <path d={path} fill="none" stroke={stringColor} strokeWidth={kind === "baubles" ? 3.2 : 1.6} vectorEffect="non-scaling-stroke" />
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
  if (kind === "santos") return (
    <div className="bz-decor-corner is-santos"><span className="bz-c-manj"><Manjerico /></span><span className="bz-c-sard"><Sardine /></span></div>
  );
  if (kind === "altar") return (
    <div className="bz-decor-corner is-altar">
      <span className="bz-c-candle a"><Candle color="#fde7d4" /></span>
      <span className="bz-c-skull"><Calavera /></span>
      <span className="bz-c-candle b"><Candle color="#f3e3ff" /></span>
      <span className="bz-c-mari a"><Cempasuchil /></span>
      <span className="bz-c-mari b"><Cempasuchil /></span>
      <span className="bz-c-mari c"><Cempasuchil /></span>
    </div>
  );
  if (kind === "velas") return (
    <div className="bz-decor-corner is-velas">
      <span className="bz-c-flower a"><Crisantemo color="#fde68a" /></span>
      <span className="bz-c-candle a"><Candle /></span>
      <span className="bz-c-candle b"><Candle color="#fff" /></span>
      <span className="bz-c-candle c"><Candle color="#f5f0e6" /></span>
      <span className="bz-c-flower b"><Crisantemo color="#e9d5ff" center="#7c3aed" /></span>
      <span className="bz-c-flower c"><Crisantemo color="#fff" center="#ca8a04" /></span>
    </div>
  );
  if (kind === "fatima") return (
    <div className="bz-decor-corner is-fatima">
      <span className="bz-c-rose a"><Rose /></span>
      <span className="bz-c-candle a"><Candle color="#fff" /></span>
      <span className="bz-c-rose b"><Rose color="#fff7ed" line="#e7c9a9" /></span>
      <span className="bz-c-candle b"><Candle color="#fff" /></span>
      <span className="bz-c-rose c"><Rose /></span>
    </div>
  );
  if (kind === "lirios") return (
    <div className="bz-decor-corner is-lirios">
      {[0, 1, 2, 3].map((k) => <span key={k} style={{ "--k": k }}><Lily /></span>)}
    </div>
  );
  if (kind === "chuva") return (
    <div className="bz-decor-corner is-chuva">
      <span className="bz-c-puddle" />
      <span className="bz-c-ripple" /><span className="bz-c-ripple b" />
      <span className="bz-c-umbrella"><Umbrella /></span>
    </div>
  );
  if (kind === "mulher") return (
    <div className="bz-decor-corner is-mulher">
      <span className="bz-c-mim a"><MimosaBranch /></span>
      <span className="bz-c-tulip a"><Tulip color="#f472b6" shade="#be185d" /></span>
      <span className="bz-c-tulip b"><Tulip /></span>
      <span className="bz-c-tulip c"><Tulip color="#e879f9" shade="#a21caf" /></span>
      <span className="bz-c-mim b"><MimosaBranch /></span>
      <span className="bz-c-wrap"><BouquetWrap /></span>
      <span className="bz-c-tag">8 de março</span>
    </div>
  );
  if (kind === "reis") return (
    <div className="bz-decor-corner is-reis">
      <span className="bz-c-bolo"><BoloRei /></span>
      <span className="bz-c-crown a"><Crown /></span>
      <span className="bz-c-crown b"><Crown /></span>
    </div>
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
      dur: cfg.motion === "rain" ? 0.55 + rnd(i, 4) * 0.45 : (cfg.motion === "fly" ? 16 : 9) + rnd(i, 4) * (cfg.motion === "fly" ? 14 : 10),
      delay: cfg.motion === "rain" ? -rnd(i, 5) * 3 : -rnd(i, 5) * 20,
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
      {cfg.glow && <div className="bz-decor-glow" />}
      {["baubles", "bunting", "papel", "lanterns", "flores"].includes(cfg.top) && <TopString kind={cfg.top} />}
      {cfg.top === "stars12" && <Stars12 />}
      {cfg.topRight === "terco" && <div className="bz-decor-terco"><Terco /></div>}
      {cfg.topRight === "estrela" && <div className="bz-decor-estrela"><ShootingStar /></div>}
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
      {cfg.top === "clouds" && <Clouds />}
      {cfg.bottom === "splash" && <Splashes />}
      {cfg.corner && <Corner kind={cfg.corner} />}
      {cfg.bottomLeft === "dragon" && <Dragon />}
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
    case "primavera": return <div className="bz-emb is-row"><Blossom i={0} /><Blossom i={2} /><Blossom i={4} /></div>;
    case "santos": return <div className="bz-emb is-row is-tall"><Manjerico /><span className="bz-emb-sard"><Sardine /></span></div>;
    case "verao": return <div className="bz-emb is-verao"><Sun /></div>;
    case "muertos": return <div className="bz-emb is-row is-muertos"><Cempasuchil /><span className="bz-emb-skull"><Calavera /></span><Cempasuchil /></div>;
    case "fieis": return <div className="bz-emb is-row is-tall is-candles"><Crisantemo color="#e9d5ff" center="#7c3aed" /><span className="bz-emb-candle"><Candle /></span><span className="bz-emb-candle s"><Candle color="#fff" /></span><Crisantemo /></div>;
    case "fatima": return <div className="bz-emb is-row is-tall is-candles"><Rose /><span className="bz-emb-candle"><Candle color="#fff" /></span><Rose color="#fff7ed" line="#e7c9a9" /></div>;
    case "conceicao": return <div className="bz-emb is-conceicao"><Stars12 /><span className="bz-emb-lily"><Lily /></span></div>;
    case "reis": return <div className="bz-emb is-row is-reis"><span className="bz-emb-crown"><Crown /></span><span className="bz-emb-bolo"><BoloRei /></span></div>;
    case "lunar": return <div className="bz-emb is-row is-tall is-lunar"><Lantern /><span className="bz-emb-lantern"><Lantern /></span><Lantern /></div>;
    case "chuva": return (
      <div className="bz-emb is-chuva">
        <span className="cl"><Cloud /></span>
        {Array.from({ length: 7 }).map((_, i) => <i key={i} className="dr" style={{ left: `${18 + i * 10}%`, "--delay": `${-rnd(i, 3)}s` }} />)}
        <span className="um"><Umbrella /></span>
      </div>
    );
    case "mulher": return <div className="bz-emb is-row is-tall is-mulher"><Tulip color="#f472b6" shade="#be185d" /><span className="bz-emb-mim"><MimosaBranch /></span><Tulip /></div>;
    default: return null;
  }
}
