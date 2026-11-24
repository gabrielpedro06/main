// =====================================================================
// Avisos flutuantes globais (ver utils/toast.js). Montado uma vez em App.jsx.
// - Em baixo, ao centro (no telemóvel, por cima da barra de navegação).
// - Avisos com Desfazer mostram uma barra com o tempo que falta; o rato por
//   cima ou o dedo a tocar pausa a contagem.
// - Arrastar para o lado fecha (no caso de Desfazer, a ação avança logo).
// - Ctrl+Z / ⌘Z desfaz o último (fora de campos de texto).
// Estilos: styles/toast.css (.tg-*).
// =====================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { registarToasts, desfazerToast, dispensarToast, pausarToast, ultimoPendente } from "../utils/toast";
import { arrastarParaFechar } from "../utils/gestos";
import "../styles/toast.css";

const eMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const Icone = {
  sucesso: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  erro: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>,
  info: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>,
  aviso: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>,
  desfeito: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>,
  desfazer: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>,
};

function Aviso({ t, aoSair }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const [pausado, setPausado] = useState(false);
  const comDesfazer = t.tipo === "desfazer";

  // Avisos simples desaparecem sozinhos (os de Desfazer são geridos em utils/toast.js)
  useEffect(() => {
    if (comDesfazer || pausado) return;
    timer.current = setTimeout(() => aoSair(t.id), t.duracao);
    return () => clearTimeout(timer.current);
  }, [comDesfazer, pausado, t.id, t.duracao, aoSair]);

  const pausar = useCallback((sim) => {
    setPausado(sim);
    if (comDesfazer) pausarToast(t.id, sim);
  }, [comDesfazer, t.id]);

  useEffect(() => {
    if (!ref.current) return;
    return arrastarParaFechar(ref.current, {
      eixo: "x",
      ambos: true,
      aoFechar: () => dispensarToast(t.id),
      aoComecar: () => pausar(true),
      aoCancelar: () => pausar(false),
    });
  }, [t.id, pausar]);

  const Ico = Icone[t.tipo] || Icone.sucesso;
  return (
    <div
      ref={ref}
      className={`tg-aviso is-${t.tipo} ${t.saindo ? "is-saindo" : ""}`}
      role={t.tipo === "erro" || t.tipo === "aviso" ? "alert" : "status"}
      onMouseEnter={() => pausar(true)}
      onMouseLeave={() => pausar(false)}
    >
      <span className="tg-ico"><Ico /></span>
      <span className="tg-msg">{t.mensagem}</span>
      {comDesfazer && (
        <button type="button" className="tg-desfazer" onClick={() => desfazerToast(t.id)}>
          Desfazer
          <kbd className="tg-kbd" aria-hidden="true">{eMac ? "⌘Z" : "Ctrl Z"}</kbd>
        </button>
      )}
      <button type="button" className="tg-fechar hit-slop" onClick={() => dispensarToast(t.id)} aria-label="Fechar aviso">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
      {comDesfazer && (
        <span
          className="tg-barra"
          style={{ animationDuration: `${t.duracao}ms`, animationPlayState: pausado ? "paused" : "running" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default function ToastGlobal() {
  const [avisos, setAvisos] = useState([]);

  const remover = useCallback((id) => {
    // marca como "a sair" para animar, e tira passado pouco
    setAvisos((l) => l.map((a) => (a.id === id ? { ...a, saindo: true } : a)));
    setTimeout(() => setAvisos((l) => l.filter((a) => a.id !== id)), 200);
  }, []);

  useEffect(() => registarToasts({
    adicionar: (a) => setAvisos((l) => [...l.slice(-3), a]), // no máximo 4 ao mesmo tempo
    remover,
  }), [remover]);

  // Ctrl+Z / ⌘Z desfaz o último (só fora de campos de texto, para não roubar o desfazer do texto)
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key?.toLowerCase() !== "z") return;
      if (e.target.closest?.("input, textarea, [contenteditable='true']")) return;
      const id = ultimoPendente();
      if (id) { e.preventDefault(); desfazerToast(id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return createPortal(
    <div className="tg-pilha" aria-live="polite">
      {avisos.map((t) => <Aviso key={t.id} t={t} aoSair={remover} />)}
    </div>,
    document.body
  );
}
