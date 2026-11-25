// =====================================================================
// Links de recuperação de password (email "Reset password" do Supabase).
//
// Porquê isto existe: a app usa HashRouter (rotas em /#/...). O link do email
// volta para https://<app>/reset-password#access_token=...&type=recovery.
// O cliente Supabase lê esse "#...", cria a sessão e APAGA o hash, por isso o
// HashRouter ia parar ao login ("/") e a página de nova password nunca abria.
// Pior: a sessão de recuperação ainda não tem 2FA verificado neste
// dispositivo, e o AuthContext terminava-a logo (o ecrã do código 2FA
// aparecia e desaparecia).
//
// Este módulo é importado PRIMEIRO em main.jsx (antes do cliente Supabase):
//  - link válido → marca "recuperação em curso" (sessionStorage, 30 min);
//    o Login e o AuthContext usam isso para ir para /#/reset-password e não
//    terminar a sessão;
//  - link expirado / já usado (#error=...&error_code=otp_expired) → guarda o
//    motivo e manda para /#/forgot-password, que mostra a mensagem.
// =====================================================================

const CHAVE = "bz-recuperacao";
const CHAVE_ERRO = "bz-recuperacao-erro";
const CHAVE_IR = "bz-recuperacao-ir";
const VALIDADE_MS = 30 * 60 * 1000;

function ler(chave) {
  try { return sessionStorage.getItem(chave); } catch { return null; }
}
function escrever(chave, valor) {
  try {
    if (valor == null) sessionStorage.removeItem(chave);
    else sessionStorage.setItem(chave, valor);
  } catch { /* sem armazenamento */ }
}

/** Há uma recuperação de password a decorrer neste separador? */
export function emRecuperacao() {
  const t = Number(ler(CHAVE) || 0);
  return t > 0 && Date.now() - t < VALIDADE_MS;
}

/** A password foi mudada (ou a pessoa desistiu / entrou com a password): volta ao normal. */
export function terminarRecuperacao() {
  escrever(CHAVE, null);
  escrever(CHAVE_IR, null);
}

/** Deve abrir a página da nova password? (só uma vez por link) */
export function consumirIrParaReset() {
  const ir = ler(CHAVE_IR) === "1" && emRecuperacao();
  escrever(CHAVE_IR, null);
  return ir;
}

/** Motivo de um link que falhou (uma vez; depois de lido é apagado). */
export function lerErroRecuperacao() {
  const e = ler(CHAVE_ERRO);
  if (e) escrever(CHAVE_ERRO, null);
  return e;
}

// --- Corre ao carregar a página (antes do cliente Supabase) ---
if (typeof window !== "undefined") {
  const hash = window.location.hash || "";
  if (/[#&]type=recovery(&|$)/.test(hash) && /access_token=/.test(hash)) {
    escrever(CHAVE, String(Date.now()));
    escrever(CHAVE_IR, "1");
  } else if (/^#error=|[#&]error_code=/.test(hash)) {
    const p = new URLSearchParams(hash.slice(1));
    const codigo = p.get("error_code") || p.get("error") || "erro";
    escrever(CHAVE_ERRO, codigo);
    // Sem isto o HashRouter tentava abrir a "rota" error=... (página em branco)
    window.history.replaceState(window.history.state, "", `${window.location.pathname === "/reset-password" ? "/" : window.location.pathname}#/forgot-password`);
  }
}
