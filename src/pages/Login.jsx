import { useState } from "react"
import { supabase } from "../services/supabase"
import { useNavigate, Link } from "react-router-dom"
import "./login.css"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Email ou password inválidos")
    } else {
      navigate("/dashboard")
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">

        <img
          src="/logo1.png"
          alt="Bizin Manager"
          className="login-logo"
        />

        <h2>Entrar</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        {error && <p className="error">{error}</p>}


        <p className="signup-text">
          Ainda não tem conta?{" "}
          <Link to="/signup">Criar conta</Link>
        </p>

        <p className="forgot-password">
        <Link to="/forgot-password">Esqueceu a palavra-passe?</Link>
        </p>

      </div>
    </div>
  )
}
