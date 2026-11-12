import { useState } from "react"
import { supabase } from "../services/supabase"
import { useNavigate, Link } from "react-router-dom"
import { resetBrandIntro } from "../utils/brandIntro"
import AuthLayout, { AuthField, AuthAlert, AuthSubmit } from "../components/AuthLayout"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const navigate = useNavigate()

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
    } else {
      resetBrandIntro()
      navigate("/dashboard")
    }
  }

  const detectCaps = (e) => {
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"))
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
