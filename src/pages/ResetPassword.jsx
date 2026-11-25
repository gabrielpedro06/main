// =====================================================================
// Definir nova password (rota /reset-password), aberta a partir do link do
// email de recuperação (a sessão de recuperação vem no URL e é lida pelo
// cliente Supabase). Regras: 8+ caracteres, letras e números.
// Contas com 2FA: o Supabase exige sessão aal2 para mudar a password, por isso
// pede primeiro o código da app autenticadora.
// =====================================================================
import { useEffect, useState } from "react"
import { supabase } from "../services/supabase"
import { useNavigate } from "react-router-dom"
import AuthLayout, { AuthField, AuthAlert, AuthSubmit, AuthDone } from "../components/AuthLayout"
import OtpInput from "../components/OtpInput"
import { terminarRecuperacao } from "../utils/recuperacao"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  // Contas com 2FA: o Supabase só deixa mudar a password depois do código da app
  const [precisa2fa, setPrecisa2fa] = useState(false)
  const [code, setCode] = useState("")
  // Sessão do link de recuperação: "a_verificar" | "ok" | "sem_sessao" (link expirado/já usado)
  const [sessao, setSessao] = useState("a_verificar")

  async function verificarSessao() {
    const { data } = await supabase.auth.getSession()
    if (!data?.session) return false
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setPrecisa2fa(aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2")
    setSessao("ok")
    return true
  }

  useEffect(() => {
    let vivo = true
    // A sessão do link pode chegar um pouco depois de a página abrir (PASSWORD_RECOVERY)
    const { data: escuta } = supabase.auth.onAuthStateChange((evento) => {
      if (!vivo) return
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED") {
        setTimeout(() => { if (vivo) verificarSessao() }, 0)
      }
    })
    const primeira = setTimeout(() => {
      verificarSessao().then((ok) => {
        if (!ok) {
          // dá uns segundos ao cliente para ler o link antes de desistir
          setTimeout(async () => {
            if (vivo && !(await verificarSessao())) setSessao("sem_sessao")
          }, 2500)
        }
      }).catch(() => { if (vivo) setSessao("sem_sessao") })
    }, 0)
    return () => { vivo = false; clearTimeout(primeira); escuta?.subscription?.unsubscribe() }
  }, [])

  const reqs = [
    { ok: password.length >= 8, label: "8+ caracteres" },
    { ok: /[a-zA-Z]/.test(password), label: "Letras" },
    { ok: /\d/.test(password), label: "Números" },
  ]
  const forca = !password ? 0 : reqs.filter((r) => r.ok).length + (password.length >= 12 && /[^a-zA-Z0-9]/.test(password) ? 1 : 0)
  const naoCoincide = confirm.length > 0 && confirm !== password

  function validatePassword(pwd) {
    const minLength = pwd.length >= 8
    const hasNumber = /\d/.test(pwd)
    const hasLetter = /[a-zA-Z]/.test(pwd)

    return minLength && hasNumber && hasLetter
  }

  async function handleReset(e) {
    e.preventDefault()
    setError("")
    setMessage("")

    if (!validatePassword(password)) {
      setError("Password deve ter 8+ caracteres, incluir letras e números.")
      return
    }

    if (password !== confirm) {
      setError("Passwords não coincidem.")
      return
    }

    if (precisa2fa && code.length !== 6) {
      setError("Introduza o código de 6 dígitos da app autenticadora.")
      return
    }

    setLoading(true)
    // Confirma de novo (a sessão pode ter mudado entretanto)
    if (!(await verificarSessao())) {
      setSessao("sem_sessao")
      setLoading(false)
      return
    }
    if (precisa2fa) {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = (factors?.totp || []).find((f) => f.status === "verified")
      const { error: mfaError } = totp
        ? await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code })
        : { error: new Error("sem fator") }
      if (mfaError) {
        setError("Código de segurança inválido. Use o código atual da app.")
        setCode("")
        setLoading(false)
        return
      }
      setPrecisa2fa(false)
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      const msg = String(error.message || "")
      if (error.code === "same_password" || /different from the old/i.test(msg)) {
        setError("A password nova tem de ser diferente da antiga.")
      } else if (/aal2|mfa|assurance/i.test(msg)) {
        setPrecisa2fa(true)
        setError("Introduza o código de 6 dígitos da app autenticadora e tente de novo.")
      } else if (error.code === "weak_password" || /weak|pwned/i.test(msg)) {
        setError("Essa password é demasiado fraca ou já apareceu em fugas de dados. Escolha outra.")
      } else if (/session|jwt|expired/i.test(msg)) {
        setSessao("sem_sessao")
      } else {
        setError("Erro ao atualizar password: " + msg)
      }
      setLoading(false)
    } else {
      terminarRecuperacao()
      setMessage("Password atualizada com sucesso! A entrar…")
      setTimeout(() => navigate("/", { replace: true }), 1500)
    }
  }

  // Link expirado, já usado, ou aberto noutro browser/dispositivo
  if (sessao === "sem_sessao") {
    return (
      <AuthLayout
        hello="Ups."
        tagline="Este link já não serve."
        eyebrow="Link inválido"
        title="O link de recuperação expirou"
        subtitle="Os links só funcionam uma vez e durante pouco tempo. Peça um novo e abra-o logo, no mesmo browser."
      >
        <AuthDone
          icon="Alert"
          text="Se já mudou a password com este link, entre normalmente. Se não, peça um link novo."
          action={{ to: "/", label: "Voltar ao login" }}
          secondary={{ label: "Pedir novo link", onClick: () => { terminarRecuperacao(); navigate("/forgot-password", { replace: true }) } }}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      hello="Quase lá."
      tagline="Uma password nova e está pronto."
      eyebrow="Nova password"
      title="Definir nova password"
      subtitle="Escolha uma password segura que ainda não tenha usado."
    >
      <form className="au-form" onSubmit={handleReset}>
        <AuthField
          icon="Lock"
          label="Nova password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          autoFocus
          placeholder="Mínimo 8 caracteres"
          hint={
            <>
              <div className="au-strength" data-lvl={Math.min(forca, 4)}><span /><span /><span /><span /></div>
              <ul className="au-reqs">
                {reqs.map((r) => <li key={r.label} className={r.ok ? "is-ok" : ""}><i>✓</i>{r.label}</li>)}
              </ul>
            </>
          }
        />
        <AuthField
          icon="Key"
          label="Confirmar password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="Repita a password"
          invalid={naoCoincide}
          hint={naoCoincide ? <small className="au-caps" style={{ color: "#dc2626" }}>As passwords ainda não coincidem</small> : null}
        />

        {precisa2fa && (
          <div className="au-field">
            <span className="au-field-label">Código da app autenticadora</span>
            <OtpInput value={code} onChange={setCode} disabled={loading} />
          </div>
        )}

        <AuthAlert>{error}</AuthAlert>
        <AuthAlert tone="success">{message}</AuthAlert>

        <AuthSubmit loading={loading} icon="Check">{loading ? "A guardar…" : "Atualizar password"}</AuthSubmit>
      </form>
    </AuthLayout>
  )
}
