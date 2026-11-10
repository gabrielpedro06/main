import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { BRAND_INTRO_KEY as STORAGE_KEY } from "../utils/brandIntro";

const EXIT_AT = 2300; // ms até a cortina começar a subir
const DONE_AT = 3200; // ms até o overlay sair do DOM

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const shouldPlay = () => {
  try { return sessionStorage.getItem(STORAGE_KEY) !== "1"; } catch { return false; }
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "Boa noite";
  if (h < 13) return "Bom dia";
  if (h < 20) return "Boa tarde";
  return "Boa noite";
};

/**
 * Animação de entrada da Bizin: o logo revela-se com um brilho,
 * aparece a saudação e a "cortina" sobe para mostrar a app.
 * Toca uma vez por sessão do separador (e sempre depois do login).
 */
export default function BrandIntro() {
  const { userProfile } = useAuth();
  const [phase, setPhase] = useState(() => (shouldPlay() ? "play" : "done"));

  useEffect(() => {
    if (phase === "done") return undefined;
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignora */ }
    document.body.classList.add("bz-intro-active");

    const fast = reducedMotion();
    const t1 = setTimeout(() => {
      setPhase("exit");
      document.body.classList.remove("bz-intro-active");
    }, fast ? 700 : EXIT_AT);
    const t2 = setTimeout(() => setPhase("done"), fast ? 1100 : DONE_AT);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.classList.remove("bz-intro-active");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "done") return null;

  const skip = () => {
    if (phase !== "play") return;
    document.body.classList.remove("bz-intro-active");
    setPhase("exit");
    setTimeout(() => setPhase("done"), 900);
  };

  const firstName = String(userProfile?.nome || "").trim().split(/\s+/)[0];

  return createPortal(
    <div className={`bz-intro is-${phase}`} onClick={skip} aria-hidden="true">
      <div className="bz-intro-bg">
        <span className="bz-intro-orb bz-intro-orb-a" />
        <span className="bz-intro-orb bz-intro-orb-b" />
        <span className="bz-intro-grain" />
      </div>

      <div className="bz-intro-stage">
        <div className="bz-intro-logo">
          <img src="/logo4.png" alt="" draggable="false" />
          <span className="bz-intro-shine" />
        </div>

        <p className="bz-intro-hello">
          {greeting()}
          {firstName && <>, <strong>{firstName}</strong></>}
        </p>

        <span className="bz-intro-line"><span /></span>
      </div>
    </div>,
    document.body
  );
}
