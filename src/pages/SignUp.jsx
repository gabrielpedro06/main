import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import "./../pages/login.css"; 
import logo from "/logo1.png";

export default function SignUp() {
  const [nome, setNome] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSignUp(e) {
    e.preventDefault();
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // --- AQUI ESTÁ A CORREÇÃO ---
        // O window.location.origin deteta automaticamente se é localhost ou vercel
        emailRedirectTo: window.location.origin, 
        
        data: {
          full_name: nome,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      alert("Conta criada com sucesso! Verifique seu email para ativação.");
      navigate("/"); 
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        {logo && <img src={logo} alt="Logo" className="login-logo" />}
        <h2>Criar conta</h2>

        <form onSubmit={handleSignUp}>
          <input
            type="text"
            placeholder="Nome Completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Criar conta</button>
        </form>

        {error && <p className="error">{error}</p>}

        <p className="signup-text">
          Já tem conta? <a href="/">Login</a>
        </p>

        <p className="forgot-password">
          <a href="/forgot-password">Esqueceu a password?</a>
        </p>
      </div>
    </div>
  );
}