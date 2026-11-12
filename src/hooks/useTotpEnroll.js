import { useState } from "react";
import { supabase } from "../services/supabase";

/**
 * Configuração de um fator TOTP (app autenticadora) com a API MFA do Supabase.
 * start() → mostra QR/segredo; confirm(code) → verifica e ativa.
 * Se `replaceIds` for passado, esses fatores antigos são removidos depois de o novo ficar ativo
 * (usado para "mudar de telemóvel" sem nunca ficar sem 2FA).
 */
export default function useTotpEnroll({ onDone } = {}) {
  const [enroll, setEnroll] = useState(null); // { id, qr, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setError("");
    setBusy(true);
    try {
      // Limpa tentativas anteriores que ficaram por confirmar
      const { data: lista } = await supabase.auth.mfa.listFactors();
      const pendentes = (lista?.all || []).filter((f) => f.factor_type === "totp" && f.status !== "verified");
      for (const f of pendentes) await supabase.auth.mfa.unenroll({ factorId: f.id });

      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Bizin Manager ${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12)}`,
        issuer: "Bizin Manager",
      });
      if (err) throw err;
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch (err) {
      setError(err.message || "Não foi possível iniciar a configuração.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(valor = code, { replaceIds = [] } = {}) {
    if (!enroll || valor.length !== 6 || busy) return false;
    setError("");
    setBusy(true);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: valor });
    if (err) {
      setBusy(false);
      setError("Código inválido. Confirme que a hora do telemóvel está certa e tente de novo.");
      setCode("");
      return false;
    }
    for (const id of replaceIds) {
      if (id && id !== enroll.id) await supabase.auth.mfa.unenroll({ factorId: id });
    }
    setBusy(false);
    setEnroll(null);
    setCode("");
    await onDone?.();
    return true;
  }

  async function cancel() {
    if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.id });
    setEnroll(null);
    setCode("");
    setError("");
  }

  return { enroll, code, setCode, busy, error, setError, start, confirm, cancel };
}
