import { useState } from "react";
import { supabase } from "../services/supabase";
import { Link } from "react-router-dom";
import AuthLayout, { AuthField, AuthAlert, AuthSubmit, AuthDone } from "../components/AuthLayout";

export default function SignUp() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [criada, setCriada] = useState(false);

  async function handleSignUp(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // O window.location.origin deteta automaticamente se é localhost ou vercel
        emailRedirectTo: window.location.origin,
        data: {
          full_name: nome,
        },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setCriada(true);
    }
  }

  if (criada) {
    return (
      <AuthLayout hello="Bem-vindo." tagline="Só falta ativar a conta no seu email." eyebrow="Quase lá" title="Conta criada com sucesso!">
        <AuthDone
          icon="Mail"
          text={<>Enviámos um email de ativação para <b>{email}</b>. Abra-o e clique no link para ativar a sua conta.</>}
          action={{ to: "/", label: "Ir para o login" }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      hello="Junte-se."
      tagline="Uma conta, toda a equipa e os projetos do grupo."
      eyebrow="Novo por aqui?"
      title="Criar conta"
      subtitle="Crie o seu acesso ao Bizin Manager em menos de um minuto."
      footer={<>Já tem conta?<Link to="/" className="au-link">Entrar</Link></>}
    >
      <form className="au-form" onSubmit={handleSignUp}>
        <AuthField icon="User" label="Nome completo" value={nome} onChange={setNome} autoComplete="name" autoFocus placeholder="O seu nome" />
        <AuthField icon="Mail" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="nome@empresa.pt" />
        <AuthField icon="Lock" label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="Escolha uma password" />

        <AuthAlert>{error}</AuthAlert>

        <AuthSubmit loading={loading}>{loading ? "A criar conta…" : "Criar conta"}</AuthSubmit>
      </form>
    </AuthLayout>
  );
}
