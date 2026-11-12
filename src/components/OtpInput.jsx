import { useRef } from "react";
import "../styles/otp.css";

/**
 * Campo de código de 6 dígitos (uma caixa por dígito).
 * Suporta colar o código inteiro, setas, backspace e preenchimento automático (one-time-code).
 */
export default function OtpInput({ value, onChange, length = 6, autoFocus = false, disabled = false, invalid = false, onComplete }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const setAt = (idx, ch) => {
    const arr = digits.slice();
    arr[idx] = ch;
    const next = arr.join("").slice(0, length);
    onChange(next);
    if (next.length === length && onComplete) onComplete(next);
  };

  const focus = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const handleChange = (i, raw) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return;
    if (clean.length > 1) {
      // colou/autopreencheu vários dígitos
      const merged = (digits.slice(0, i).join("") + clean).slice(0, length);
      onChange(merged);
      focus(merged.length);
      if (merged.length === length && onComplete) onComplete(merged);
      return;
    }
    setAt(i, clean);
    focus(i + 1);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Enter") {
      // Não submeter formulários à volta (ex.: Perfil); confirma se o código estiver completo
      e.preventDefault();
      if (value.length === length && onComplete) onComplete(value);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        onChange(digits.slice(0, i).join(""));
      } else if (i > 0) {
        onChange(digits.slice(0, i - 1).join(""));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") { e.preventDefault(); focus(i - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); focus(i + 1); }
  };

  const handlePaste = (e) => {
    const txt = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (!txt) return;
    e.preventDefault();
    onChange(txt);
    focus(txt.length);
    if (txt.length === length && onComplete) onComplete(txt);
  };

  return (
    <div className={`otp ${invalid ? "is-invalid" : ""}`} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={`otp-box ${d ? "is-filled" : ""} ${i === Math.floor(length / 2) ? "is-gap" : ""}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={i === 0 ? length : 1}
          value={d}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          aria-label={`Dígito ${i + 1}`}
          onFocus={(e) => { if (i > value.length) { focus(value.length); return; } e.target.select(); }}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
