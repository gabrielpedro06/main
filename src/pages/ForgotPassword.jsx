// =====================================================================
// Recuperar password (rota /forgot-password). Pede ao Supabase o email com
// link de recuperação (resetPasswordForEmail). A mensagem de sucesso é sempre
// igual, exista ou não a conta (não revela emails registados).
// O link volta para `${origin}/reset-password` (ver ResetPassword.jsx).
// =====================================================================
import { useState } from "react"
import { supabase } from "../services/supabase"
import AuthLayout, { AuthField, AuthAlert, AuthSubmit, AuthDone } from "../components/AuthLayout"
import { lerErroRecuperacao } from "../utils/recuperacao"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [enviado, setEnviado] = useState(false)
  // Veio de um link de recuperação que já não serve (expirado ou já usado)
  const [error, setError] = useState(() => {
    const e = lerErroRecuperacao()
    if (!e) return ""
    return e === "otp_expired"
      ? "O link do email expirou ou já foi usado. Peça um novo aqui em baixo e abra-o logo, no mesmo browser."
      : "O link do email não é válido. Peça um novo aqui em baixo."
  })
  const [loading, setLoading] = useState(false)

  async function handleReset(e) {
    e?.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      // Limite de emails do Supabase (o serviço de email incluído envia poucos por hora)
      const limite = error.status === 429 || /rate limit|over_email_send_rate_limit|security purposes/i.test(`${error.code || ""} ${error.message || ""}`)
      setError(limite
        ? "Foram pedidos demasiados emails de recuperação em pouco tempo. Espere um pouco (até 1 hora) e tente de novo, ou peça ajuda ao administrador."
        : "Erro ao enviar email: " + (error.message || "tente de novo."))
    } else {
      setEnviado(true)
    }
  }

  if (enviado) {
    return (
      <AuthLayout hello="Feito." tagline="O link já vai a caminho." eyebrow="Verifique o email" title="Email enviado!" back={{ to: "/", label: "Voltar ao login" }}>
        <AuthDone
          icon="Send"
          text={<>Se existir uma conta com <b>{email}</b>, vai receber um link para definir uma nova password. Veja também a pasta de spam.</>}
          action={{ to: "/", label: "Voltar ao login" }}
          secondary={{ label: loading ? "A reenviar…" : "Reenviar email", onClick: () => handleReset() }}
        />
        <AuthAlert>{error}</AuthAlert>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      hello="Acontece."
      tagline="Num minuto volta a ter acesso à sua conta."
      eyebrow="Recuperar acesso"
      title="Esqueceu a password?"
      subtitle="Indique o seu email e enviamos-lhe um link para definir uma nova."
      back={{ to: "/", label: "Voltar ao login" }}
    >
      <form className="au-form" onSubmit={handleReset}>
        <AuthField icon="Mail" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus placeholder="nome@empresa.pt" invalid={!!error} />

        <AuthAlert>{error}</AuthAlert>

        <AuthSubmit loading={loading} icon="Send">{loading ? "A enviar…" : "Enviar link de recuperação"}</AuthSubmit>
      </form>
    </AuthLayout>
  )
}
