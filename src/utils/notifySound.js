/**
 * Aviso de mensagens novas: som curto (Web Audio, sem ficheiros) e,
 * quando o separador está em segundo plano, notificação do sistema
 * (no Windows aparece o "toast" no canto com o som do próprio Windows).
 */

const SOUND_KEY = "bz-notify-sound";
const DESKTOP_ASKED_KEY = "bz-notify-asked";

let audioCtx = null;
let unlockBound = false;

const getCtx = () => {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
};

/**
 * Os browsers só deixam tocar som depois de o utilizador interagir com a página.
 * No primeiro clique/tecla "acordamos" o áudio e pedimos (uma vez) autorização
 * para notificações do sistema.
 */
export const bindNotificationUnlock = () => {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;

  const unlock = () => {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});

    try {
      if ("Notification" in window && Notification.permission === "default" && !localStorage.getItem(DESKTOP_ASKED_KEY)) {
        localStorage.setItem(DESKTOP_ASKED_KEY, "1");
        Notification.requestPermission().catch(() => {});
      }
    } catch { /* ignora */ }

    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
};

export const isNotifySoundEnabled = () => {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
};

export const setNotifySoundEnabled = (enabled) => {
  try { localStorage.setItem(SOUND_KEY, enabled ? "on" : "off"); } catch { /* ignora */ }
};

/** "Ding-dong" suave, em duas notas, ao estilo das notificações do sistema. */
export const playNotifySound = () => {
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  const note = (freq, start, duration) => {
    // Fundamental + harmónico leve para soar a "sino"
    [[freq, 1], [freq * 2, 0.18], [freq * 3, 0.06]].forEach(([f, level]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(level, now + start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    });
  };

  note(987.77, 0, 0.45);    // Si5
  note(1318.51, 0.13, 0.7); // Mi6
};

/**
 * Chamado quando o número de não lidas aumenta.
 * - separador visível: toca o som
 * - separador escondido/minimizado: notificação do sistema (que traz o som do Windows)
 */
export const announceNewMessages = ({ total, onClick } = {}) => {
  if (typeof document === "undefined") return;
  const soundOn = isNotifySoundEnabled();

  const canDesktop = "Notification" in window && Notification.permission === "granted";
  if (document.hidden && canDesktop) {
    try {
      const n = new Notification("Bizin · Comunicação Interna", {
        body: total === 1 ? "Tens 1 mensagem nova." : `Tens ${total} mensagens novas.`,
        icon: "/logo_b.png",
        tag: "bz-comms",
        renotify: true,
        silent: !soundOn,
      });
      n.onclick = () => {
        window.focus();
        onClick?.();
        n.close();
      };
      return;
    } catch { /* cai para o som */ }
  }

  if (soundOn) playNotifySound();
};
