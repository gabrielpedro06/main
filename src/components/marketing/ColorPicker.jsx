import { useRef, useState } from "react";
import { I } from "./mkIcons";
import { clamp, normalizarHex, hexParaHsv, hsvParaHex, textoSobre } from "./mkColor";

/** Arrastar com o rato/dedo dentro de um elemento → posição relativa 0..1 */
function useArrastar(onMove) {
  const ref = useRef(null);
  const ativo = useRef(false);
  const mover = (e) => {
    const r = ref.current.getBoundingClientRect();
    onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
  };
  return {
    ref,
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.focus({ preventScroll: true });
      ativo.current = true;
      try { ref.current.setPointerCapture(e.pointerId); } catch { /* sem captura: continua a funcionar dentro da área */ }
      mover(e);
    },
    onPointerMove: (e) => { if (ativo.current) mover(e); },
    onPointerUp: () => { ativo.current = false; },
    onPointerCancel: () => { ativo.current = false; },
    onLostPointerCapture: () => { ativo.current = false; },
  };
}

/**
 * Seletor de cor: quadrado saturação/brilho + matiz + HEX + conta-gotas + sugestões.
 * value: "#rrggbb" · onChange(hex)
 */
export default function ColorPicker({ value, onChange, presets = [], sugestoes = [], sugestoesLabel = "Do logo" }) {
  const [hsv, setHsv] = useState(() => hexParaHsv(value));
  const [ultimo, setUltimo] = useState(value);
  const [hexTxt, setHexTxt] = useState(value);

  // Cor mudou por fora (preset, sugestão…): acerta o estado interno durante o render
  if (value !== ultimo) {
    setUltimo(value);
    setHexTxt(value);
    if (hsvParaHex(hsv) !== value) setHsv(hexParaHsv(value));
  }

  const aplicar = (novo) => {
    setHsv(novo);
    const hex = hsvParaHex(novo);
    setUltimo(hex);
    setHexTxt(hex);
    onChange(hex);
  };
  const escolherHex = (hex) => { const h = normalizarHex(hex); if (h) aplicar(hexParaHsv(h)); };

  const sv = useArrastar((x, y) => aplicar({ ...hsv, s: x, v: 1 - y }));
  const hue = useArrastar((x) => aplicar({ ...hsv, h: Math.min(359.9, x * 360) }));

  const teclasSv = (e) => {
    const passo = e.shiftKey ? 0.1 : 0.02;
    const m = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] }[e.key];
    if (!m) return;
    e.preventDefault();
    aplicar({ ...hsv, s: clamp(hsv.s + m[0]), v: clamp(hsv.v + m[1]) });
  };
  const teclasHue = (e) => {
    const passo = e.shiftKey ? 15 : 3;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    aplicar({ ...hsv, h: clamp(hsv.h + (e.key === "ArrowRight" ? passo : -passo), 0, 359.9) });
  };

  const temContaGotas = typeof window !== "undefined" && "EyeDropper" in window;
  const contaGotas = async () => {
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      escolherHex(sRGBHex);
    } catch { /* cancelado */ }
  };

  const atual = hsvParaHex(hsv);
  const hexValido = !!normalizarHex(hexTxt);

  return (
    <div className="cp">
      <div
        className="cp-sv"
        {...sv}
        tabIndex={0}
        role="slider"
        aria-label="Saturação e brilho"
        aria-valuetext={atual}
        onKeyDown={teclasSv}
        style={{ "--hue": `hsl(${hsv.h} 100% 50%)` }}
      >
        <span className="cp-sv-thumb" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: atual }} />
      </div>

      <div className="cp-row">
        <div className="cp-hue" {...hue} tabIndex={0} role="slider" aria-label="Matiz" aria-valuenow={Math.round(hsv.h)} aria-valuemin={0} aria-valuemax={360} onKeyDown={teclasHue}>
          <span className="cp-hue-thumb" style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }} />
        </div>
        {temContaGotas && (
          <button type="button" className="cp-eye" onClick={contaGotas} title="Apanhar uma cor do ecrã">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" /></svg>
          </button>
        )}
      </div>

      <div className="cp-row">
        <span className="cp-preview" style={{ background: atual, color: textoSobre(atual) }}>Aa</span>
        <label className={`cp-hex ${hexValido ? "" : "is-bad"}`}>
          <span>HEX</span>
          <input
            value={hexTxt}
            spellCheck={false}
            maxLength={7}
            onChange={(e) => {
              const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
              setHexTxt(v);
              const h = normalizarHex(v);
              if (h && v.length === 7) escolherHex(h);
            }}
            onBlur={() => { const h = normalizarHex(hexTxt); if (h) escolherHex(h); else setHexTxt(atual); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
          />
        </label>
        <button type="button" className="cp-copy" title="Copiar HEX" onClick={() => navigator.clipboard?.writeText(atual).catch(() => {})}><I.Copy size={14} /></button>
      </div>

      {sugestoes.length > 0 && (
        <div className="cp-swatches-wrap">
          <span className="cp-swatches-label">{sugestoesLabel}</span>
          <div className="cp-swatches">
            {sugestoes.map((c) => <button key={c} type="button" className={atual === c ? "is-on" : ""} style={{ background: c }} title={c} aria-label={`Cor ${c}`} onClick={() => escolherHex(c)} />)}
          </div>
        </div>
      )}
      {presets.length > 0 && (
        <div className="cp-swatches-wrap">
          <span className="cp-swatches-label">Sugestões</span>
          <div className="cp-swatches">
            {presets.map((c) => <button key={c} type="button" className={atual === c ? "is-on" : ""} style={{ background: c }} title={c} aria-label={`Cor ${c}`} onClick={() => escolherHex(c)} />)}
          </div>
        </div>
      )}
    </div>
  );
}
