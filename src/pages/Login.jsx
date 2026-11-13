import { useState } from "react"
import { supabase } from "../services/supabase"
import { useNavigate, Link } from "react-router-dom"
import { resetBrandIntro } from "../utils/brandIntro"
import { registarEvento } from "../utils/registarEvento"
import { useAuth } from "../context/AuthContext"
import AuthLayout, { AuthField, AuthAlert, AuthSubmit } from "../components/AuthLayout"
import OtpInput from "../components/OtpInput"
import { TotpEnrollSteps } from "../components/TwoFactorSetup"
import useTotpEnroll from "../hooks/useTotpEnroll"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  // 2FA
  const { user, mfaPending, mfaSetup, checkMfa } = useAuth() || {}
  const [mfaStep, setMfaStep] = useState(null) // null | "code" | "setup"
  const [code, setCode] = useState("")
  const totp = useTotpEnroll()

  const navigate = useNavigate()
  // Sessão aberta mas à espera do código (ex.: recarregou a página ou veio de uma rota protegida)
  const passo = mfaStep || (user && mfaPending ? (mfaSetup ? "setup" : "code") : null)

  async function entrar() {
    resetBrandIntro()
    await checkMfa?.()
    registarEvento("login", { via: "password + 2FA", agente: navigator.userAgent })
    navigate("/dashboard")
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Email ou password inválidos")
      setLoading(false)
      return
    }

    // 2FA obrigatório: pede o código, ou obriga a configurar se ainda não tiver.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      setMfaStep("code")
      setLoading(false)
      return
    }
    if (aal && aal.nextLevel !== "aal2") {
      setMfaStep("setup")
      setLoading(false)
      return
    }

    await entrar()
  }

  async function handleVerify(valor = code) {
    if (valor.length !== 6 || loading) return
    setError(null)
    setLoading(true)

    const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors()
    const totp = (factors?.totp || []).find((f) => f.status === "verified")
    if (fErr || !totp) {
      setError("Não foi possível validar o 2FA. Tente entrar de novo.")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: valor })
    if (error) {
      setError("Código inválido ou expirado. Tente o código atual da app.")
      setCode("")
      setLoading(false)
      return
    }

    await entrar()
  }

  async function confirmarConfiguracao(valor) {
    const ok = await totp.confirm(valor)
    if (ok) await entrar()
  }

  async function voltarAoLogin() {
    if (totp.enroll) await totp.cancel()
    await supabase.auth.signOut()
    setMfaStep(null)
    setCode("")
    setPassword("")
    setError(null)
  }

  const detectCaps = (e) => {
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"))
  }

  if (passo === "setup") {
    return (
      <AuthLayout
        hello="Segurança primeiro."
        tagline="Todas as contas Bizin usam verificação em dois passos."
        eyebrow="Configuração obrigatória"
        title="Ative a verificação em dois passos"
        subtitle="Só demora um minuto. Precisa de uma app autenticadora no telemóvel (Google Authenticator, Microsoft Authenticator ou Authy)."
        footer={<>Não é a sua conta?<button type="button" className="au-btn-link" style={{ marginLeft: 4 }} onClick={voltarAoLogin}>Entrar com outra conta</button></>}
      >
        {totp.enroll ? (
          <div className="au-enroll">
            <TotpEnrollSteps
              t={totp}
              onConfirm={confirmarConfiguracao}
              btnClass="au-btn-link"
              actions={(
                <form onSubmit={(e) => { e.preventDefault(); confirmarConfiguracao(totp.code) }}>
                  <AuthSubmit loading={totp.busy} icon="Check">{totp.busy ? "A ativar…" : "Ativar e entrar"}</AuthSubmit>
                </form>
              )}
            />
          </div>
        ) : (
          <div className="au-form">
            <ul className="au-why">
              <li><b>1</b>Instale uma app autenticadora no telemóvel.</li>
              <li><b>2</b>Leia o QR code que vamos mostrar.</li>
              <li><b>3</b>Escreva o código de 6 dígitos e está feito.</li>
            </ul>
            <AuthAlert>{totp.error}</AuthAlert>
            <form onSubmit={(e) => { e.preventDefault(); totp.start() }}>
              <AuthSubmit loading={totp.busy} icon="Key">{totp.busy ? "A preparar…" : "Começar configuração"}</AuthSubmit>
            </form>
          </div>
        )}
      </AuthLayout>
    )
  }

  if (passo === "code") {
    return (
      <AuthLayout
        hello="Só mais um passo."
        tagline="A sua conta está protegida com dois fatores."
        eyebrow="Verificação em dois passos"
        title="Código de segurança"
        subtitle="Abra a app autenticadora no telemóvel e introduza o código de 6 dígitos da Bizin Manager."
        footer={<>Não é a sua conta?<button type="button" className="au-btn-link" style={{ marginLeft: 4 }} onClick={voltarAoLogin}>Entrar com outra conta</button></>}
      >
        <form className="au-form" onSubmit={(e) => { e.preventDefault(); handleVerify() }}>
          <OtpInput value={code} onChange={setCode} autoFocus disabled={loading} invalid={!!error} onComplete={handleVerify} />

          <AuthAlert>{error}</AuthAlert>

          <AuthSubmit loading={loading} icon="Check">{loading ? "A verificar…" : "Verificar e entrar"}</AuthSubmit>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Bem-vindo de volta"
      title="Entrar na sua conta"
      subtitle="Use o email e a password da sua conta Bizin."
      footer={<>Ainda não tem conta?<Link to="/signup" className="au-link">Criar conta</Link></>}
    >
      <form className="au-form" onSubmit={handleLogin}>
        <AuthField
          icon="Mail"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          autoFocus
          placeholder="nome@empresa.pt"
          invalid={!!error}
        />
        <AuthField
          icon="Lock"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={!!error}
          onKeyEvent={detectCaps}
        />
        <div className="au-row">
          {capsLock ? <span className="au-caps">⇪ Caps Lock ligado</span> : <span />}
          <Link to="/forgot-password" className="au-link">Esqueceu a palavra-passe?</Link>
        </div>

        <AuthAlert>{error}</AuthAlert>

        <AuthSubmit loading={loading}>{loading ? "A entrar…" : "Entrar"}</AuthSubmit>
      </form>
    </AuthLayout>
  )
}
