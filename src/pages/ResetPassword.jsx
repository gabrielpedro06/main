import { useState } from "react"
import { supabase } from "../services/supabase"
import { useNavigate } from "react-router-dom"
import logo from "/logo1.png" // logotipo
import "./../pages/login.css" // mantém o mesmo CSS do login

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const navigate = useNavigate()

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

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setError("Erro ao atualizar password.")
    } else {
      setMessage("Password atualizada com sucesso! A redirecionar...")
      setTimeout(() => navigate("/"), 2000)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        {logo && <img src={logo} alt="Logo" className="login-logo" />}
        <h2>Definir nova password</h2>

        <form onSubmit={handleReset}>
          <input
            type="password"
            placeholder="Nova password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirmar password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button type="submit">Atualizar password</button>
        </form>

        {error && <p className="error">{error}</p>}
        {message && <p style={{ color: "green" }}>{message}</p>}
      </div>
    </div>
  )
}
