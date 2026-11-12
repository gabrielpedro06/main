import { useEffect, useState } from "react"
import { supabase } from "../services/supabase"
import { useNavigate } from "react-router-dom"
import AuthLayout, { AuthField, AuthAlert, AuthSubmit } from "../components/AuthLayout"
import OtpInput from "../components/OtpInput"

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
  useEffect(() => {
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      setPrecisa2fa(data?.nextLevel === "aal2" && data?.currentLevel !== "aal2")
    }).catch(() => {})
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
      setError("Erro ao atualizar password.")
      setLoading(false)
    } else {
      setMessage("Password atualizada com sucesso! A redirecionar...")
      setTimeout(() => navigate("/"), 2000)
    }
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
