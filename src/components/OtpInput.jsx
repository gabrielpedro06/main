import { useLayoutEffect, useRef } from "react";
import "../styles/otp.css";

/**
 * Campo de código de 6 dígitos (uma caixa por dígito).
 * Suporta colar o código inteiro, setas, backspace e preenchimento automático (one-time-code).
 */
export default function OtpInput({ value, onChange, length = 6, autoFocus = false, disabled = false, invalid = false, onComplete }) {
  const refs = useRef([]);
  // Valor mais recente (o `value` só atualiza no próximo render; o foco muda antes disso)
  const valRef = useRef(value);
  useLayoutEffect(() => { valRef.current = value; }, [value]);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const emit = (next) => {
    const v = next.slice(0, length);
    valRef.current = v;
    onChange(v);
    if (v.length === length && onComplete) onComplete(v);
  };

  const focus = (i) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    if (el) { el.focus(); el.select(); }
  };

  const handleChange = (i, raw) => {
    let clean = raw.replace(/\D/g, "");
    if (!clean) return;

    // Escreveu numa caixa que já tinha dígito: fica só o novo
    if (digits[i] && clean.length === 2) clean = clean.replace(digits[i], "") || clean[1];

    if (clean.length > 1) {
      // Colou / preenchimento automático de vários dígitos
      const merged = (digits.slice(0, i).join("") + clean).slice(0, length);
      emit(merged);
      focus(merged.length);
      return;
    }

    const arr = digits.slice();
    arr[i] = clean;
    // Garante que não ficam buracos: o código é sempre contínuo da esquerda para a direita
    const next = arr.join("");
    emit(next);
    focus(Math.min(next.length, length - 1));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Enter") {
      // Não submeter formulários à volta (ex.: Perfil); confirma se o código estiver completo
      e.preventDefault();
      if (valRef.current.length === length && onComplete) onComplete(valRef.current);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        emit(digits.slice(0, i).join(""));
        focus(i);
      } else if (i > 0) {
        emit(digits.slice(0, i - 1).join(""));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") { e.preventDefault(); focus(i - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); focus(Math.min(i + 1, valRef.current.length)); }
  };

  const handleFocus = (i, e) => {
    // Não deixa saltar para uma caixa depois da primeira vazia
    const primeiraVazia = Math.min(valRef.current.length, length - 1);
    if (i > primeiraVazia) { focus(primeiraVazia); return; }
    e.target.select();
  };

  const handlePaste = (e) => {
    const txt = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (!txt) return;
    e.preventDefault();
    emit(txt);
    focus(txt.length);
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
          maxLength={i === 0 ? length : 2}
          value={d}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          aria-label={`Dígito ${i + 1}`}
          onFocus={(e) => handleFocus(i, e)}
          onMouseUp={(e) => e.preventDefault()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
