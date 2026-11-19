// Liga o ecrã de login aos alertas de segurança do servidor (api/_lib/alertasSeguranca.js).
// Nunca envia a palavra-passe nem o código: só o email e o motivo da falha.
import { postAutenticado } from "./apiAutenticada";
import { registarEvento } from "./registarEvento";

const BASE = import.meta.env.VITE_MARKETING_API_BASE || "";

/** Login ou 2FA falhado (motivo: "password" | "mfa" | "conta_bloqueada"). Nunca bloqueia o ecrã. */
export function reportarTentativaFalhada(email, motivo = "password") {
  try {
    fetch(`${BASE}/api/seguranca/tentativa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email || "").trim().slice(0, 254), motivo }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignora */
  }
}

/** Login com sucesso: o servidor guarda IP/país e avisa se for fora de Portugal. */
export async function registarLoginSeguro() {
  try {
    const r = await postAutenticado(`${BASE}/api/seguranca/login`, {});
    if (r.ok) return;
  } catch {
    /* sem servidor: regista pelo menos o login na BD */
  }
  registarEvento("login", { via: "password + 2FA", agente: navigator.userAgent });
}
