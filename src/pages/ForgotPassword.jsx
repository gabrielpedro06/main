import { useState } from "react"
import { supabase } from "../services/supabase"
import logo from "/logo2.png" // caminho para o teu logotipo

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleReset(e) {
    e.preventDefault()
    setError("")
    setMessage("")

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password",
    })

    if (error) {
      setError("Erro ao enviar email")
    } else {
      setMessage("Email enviado! Verifique a sua caixa de entrada.")
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        {logo && <img src={logo} alt="Logo" className="login-logo" />}
        <h2>Recuperar palavra-passe</h2>

        <form onSubmit={handleReset}>
          <input
            type="email"
            placeholder="O seu email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit">Enviar email</button>
        </form>

        {message && <p style={{ color: "green" }}>{message}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </div>
  )
}
