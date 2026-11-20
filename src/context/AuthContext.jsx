// =====================================================================
// Sessão do utilizador (Supabase Auth) + perfil (tabela profiles, com os dados de
// profiles_privado juntos por juntarPrivado) + estado do 2FA obrigatório (TOTP).
// Expõe via useAuth(): user, userProfile, setUserProfile, signOut, loading,
// mfaPending, mfaSetup, checkMfa. Consumido por ProtectedRoute, Login, Sidebar e páginas.
// Também termina a sessão se profiles.ativo = false (colaborador desativado nos RH).
// =====================================================================
import { createContext, useContext, useState, useEffect } from "react"
import { juntarPrivado } from "../utils/dadosPrivados"
import { supabase } from "../services/supabase"
import { closeAllActiveTaskLogsForUser } from "../utils/taskTimerLifecycle"
import { registarEvento } from "../utils/registarEvento"
import { AVISO_LOGIN_KEY, CONTA_DESATIVADA } from "../utils/contaDesativada"

const AuthContext = createContext()

// ---------------------------------------------------------------------
// Validade da verificação 2FA neste dispositivo
//  * Cookie de sessão (apaga-se ao fechar o browser/desligar o PC)
//  * Carimbo de hora em localStorage (máximo MFA_VALIDADE_MS)
// Se faltar um dos dois, a sessão guardada é terminada e é preciso
// voltar a entrar com palavra-passe + código.
// ---------------------------------------------------------------------
const MFA_COOKIE = "bz_mfa"
const MFA_KEY = "bz-mfa-at"
const MFA_VALIDADE_MS = 12 * 60 * 60 * 1000 // 12 horas

function marcarMfaVerificado() {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${MFA_COOKIE}=1; path=/; SameSite=Strict${secure}`
    localStorage.setItem(MFA_KEY, String(Date.now()))
  } catch { /* ignora */ }
}
function limparMfaVerificado() {
  try {
    document.cookie = `${MFA_COOKIE}=; path=/; max-age=0`
    localStorage.removeItem(MFA_KEY)
  } catch { /* ignora */ }
}
function mfaAindaValido() {
  try {
    const temCookie = document.cookie.split(";").some((c) => c.trim() === `${MFA_COOKIE}=1`)
    const quando = Number(localStorage.getItem(MFA_KEY) || 0)
    return temCookie && quando > 0 && Date.now() - quando < MFA_VALIDADE_MS
  } catch {
    return false
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null) // AQUI GUARDAMOS O PERFIL/ROLE
  const [loading, setLoading] = useState(true)
  // 2FA (obrigatório):
  //  mfaPending → falta algo antes de entrar (código ou configuração)
  //  mfaSetup   → a conta ainda não tem app autenticadora configurada
  const [mfaPending, setMfaPending] = useState(false)
  const [mfaSetup, setMfaSetup] = useState(false)

  /**
   * Lê o nível de garantia (AAL) da sessão e atualiza mfaPending/mfaSetup.
   * nextLevel "aal2" e currentLevel ≠ "aal2" → falta o código; nextLevel ≠ "aal2" → sem fator TOTP (configurar).
   * @returns {Promise<{pending: boolean, setup: boolean}>}
   */
  async function checkMfa() {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error || !data) throw error
      const precisaCodigo = data.nextLevel === "aal2" && data.currentLevel !== "aal2"
      const precisaConfigurar = data.nextLevel !== "aal2"
      setMfaSetup(precisaConfigurar)
      setMfaPending(precisaCodigo || precisaConfigurar)
      return { pending: precisaCodigo || precisaConfigurar, setup: precisaConfigurar }
    } catch {
      setMfaSetup(false)
      setMfaPending(false)
      return { pending: false, setup: false }
    }
  }

  // Sessão guardada sem verificação 2FA recente → termina (pede tudo outra vez)
  async function terminarSessaoExpirada() {
    try { await registarEvento("sessao_expirada", { motivo: "verificacao_2fa_expirada" }) } catch { /* ignora */ }
    limparMfaVerificado()
    await supabase.auth.signOut({ scope: "local" })
    setUser(null)
    setUserProfile(null)
    setMfaPending(false)
    setMfaSetup(false)
    setLoading(false)
  }

  useEffect(() => {
    // 1. Vai buscar o utilizador atual (Sessão)
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user && !mfaAindaValido()) {
        // Ex.: PC desligado / browser fechado, ou passaram mais de 12 h
        await terminarSessaoExpirada()
        return
      }
      setUser(data?.user ?? null)
      if (data?.user) {
        checkMfa().finally(() => fetchProfile(data.user.id)) // Se houver user, vai buscar o Role dele
      } else {
        setLoading(false)
      }
    })

    // 2. Fica à escuta de Logins / Logouts
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // A sessão inicial já é tratada no passo 1 (inclui a validade do 2FA)
        if (event === "INITIAL_SESSION") return
        // Código 2FA confirmado (login ou configuração) → válido neste dispositivo
        if (event === "MFA_CHALLENGE_VERIFIED") marcarMfaVerificado()
        if (event === "SIGNED_OUT") limparMfaVerificado()
        setUser(session?.user ?? null)
        if (session?.user) {
          // Fora do callback para não bloquear o cliente do Supabase
          setTimeout(() => { checkMfa().finally(() => fetchProfile(session.user.id)) }, 0)
        } else {
          setMfaPending(false)
          setMfaSetup(false)
          setUserProfile(null) // Limpa o perfil ao fazer logout
          setLoading(false)
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  // Com a app aberta: ao fim de 12 h volta a pedir o login completo
  useEffect(() => {
    if (!user?.id || mfaPending) return undefined
    const id = setInterval(() => {
      if (!mfaAindaValido()) signOut()
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [user?.id, mfaPending]) // eslint-disable-line react-hooks/exhaustive-deps

  // Função para buscar o Perfil à tabela 'profiles'
  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
      
    if (!error && data && data.ativo === false) {
      // Colaborador desativado nos RH: termina a sessão (também quem já tinha o Bizin aberto)
      try { await registarEvento("acesso_negado", { motivo: "conta_inativa" }) } catch { /* ignora */ }
      try { sessionStorage.setItem(AVISO_LOGIN_KEY, CONTA_DESATIVADA) } catch { /* ignora */ }
      limparMfaVerificado()
      await supabase.auth.signOut({ scope: "local" })
      setUser(null)
      setUserProfile(null)
      setMfaPending(false)
      setMfaSetup(false)
      setLoading(false)
      if (window.location.pathname !== "/") window.location.replace("/")
      return
    }
    if (!error && data) {
      setUserProfile(await juntarPrivado(data)); // NIF, NISS, CC… (tabela privada)
    } else {
      console.error("Erro ao buscar perfil:", error);
    }
    setLoading(false);
  }

  // Função para dar Logout (útil para o Navbar/Sidebar)
  /**
   * Fecha os cronómetros de tarefas abertos (task logs), regista "logout" em audit_log,
   * termina a sessão no Supabase e, por omissão, recarrega em "/".
   * @param {{forceReload?: boolean}} [options] forceReload=false evita o recarregamento
   * @returns {Promise<{closedCount: number, errors: any[]}>}
   */
  async function signOut(options = {}) {
    const forceReload = options.forceReload !== false
    let closeResult = { closedCount: 0, errors: [] }

    if (user?.id) {
      closeResult = await closeAllActiveTaskLogsForUser(supabase, user.id, {
        note: "Cronómetro encerrado automaticamente ao terminar sessão."
      })

      window.dispatchEvent(new CustomEvent("task-logs-updated", {
        detail: { reason: "logout", closedCount: closeResult.closedCount || 0 }
      }))
      window.dispatchEvent(new Event("attendance-updated"))
      await registarEvento("logout", { timers_fechados: closeResult.closedCount || 0 })
    }
    await supabase.auth.signOut();

    if (forceReload) {
      window.location.replace("/")
    }

    return closeResult
  }

  return (
    <AuthContext.Provider value={{ 
        user, 
        userProfile, 
        setUserProfile, // <--- ADICIONADO AQUI! (Isto resolve o erro vermelho)
        signOut, 
        loading,
        mfaPending,
        mfaSetup,
        checkMfa
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Acesso ao contexto de autenticação (ver valores expostos no cabeçalho do ficheiro). */
export function useAuth() {
  return useContext(AuthContext)
}
