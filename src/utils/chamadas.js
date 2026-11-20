// Textos das mensagens de chamada no chat (partilhados por Forum.jsx e ChamadasContext.jsx).
// O Fórum reconhece-as pelo texto e mostra-as como cartões.

/** Mensagem que anuncia uma videochamada (cartão "Videochamada · Entrar" / "Chamada terminada"). */
export const MSG_CHAMADA = "📹 Iniciou uma videochamada";

/** Início da mensagem deixada quando a última pessoa sai ("📞 Chamada terminada · 12 min"). */
export const MSG_CHAMADA_FIM = "📞 Chamada terminada";

/** "12 min", "1 h 05 min" a partir de milissegundos. */
export function duracaoChamada(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}
