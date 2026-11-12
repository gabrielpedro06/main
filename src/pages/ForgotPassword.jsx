import { useState } from "react"
import { supabase } from "../services/supabase"
import AuthLayout, { AuthField, AuthAlert, AuthSubmit, AuthDone } from "../components/AuthLayout"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState("")
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
      setError("Erro ao enviar email")
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
