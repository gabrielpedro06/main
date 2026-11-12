import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import OtpInput from "./OtpInput";
import useTotpEnroll from "../hooks/useTotpEnroll";
import "../styles/otp.css";

const Svg = ({ size = 18, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ShieldIco = (p) => <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></Svg>;
const CopyIco = (p) => <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>;

/** Passos de configuração (QR + chave + código). Partilhado entre o Perfil e o Login. */
export function TotpEnrollSteps({ t, onConfirm, actions, btnClass = "pf-btn pf-btn-ghost" }) {
  const [copied, setCopied] = useState(false);
  if (!t.enroll) return null;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(t.enroll.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignora */ }
  };
  return (
    <div className="tf-setup">
      <div className="tf-qr"><img src={t.enroll.qr} alt="QR code para a app autenticadora" /></div>
      <div className="tf-steps">
        <div className="tf-step">
          <b>1</b>
          <div>
            <span>Abra a <strong>app autenticadora</strong> (Google Authenticator, Microsoft Authenticator, Authy…) e leia o QR code.</span>
            <span>Não consegue ler? Introduza esta chave manualmente:</span>
            <span className="tf-secret">
              <code>{t.enroll.secret}</code>
              <button type="button" className={btnClass} style={{ height: 30, padding: "0 10px" }} onClick={copiar}>
                <CopyIco size={13} /> {copied ? "Copiado!" : "Copiar"}
              </button>
            </span>
          </div>
        </div>
        <div className="tf-step">
          <b>2</b>
          <div>
            <span>Escreva o <strong>código de 6 dígitos</strong> que aparece na app.</span>
            <OtpInput value={t.code} onChange={t.setCode} autoFocus disabled={t.busy} invalid={!!t.error} onComplete={onConfirm} />
            {t.error && <span className="tf-msg is-error">{t.error}</span>}
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}

/**
 * Perfil → Segurança. O 2FA é obrigatório: não há "desativar", só "mudar de telemóvel"
 * (configura o novo fator e só depois remove o antigo).
 */
export default function TwoFactorSetup() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState([]); // fatores TOTP verificados

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors((data?.totp || []).filter((f) => f.status === "verified"));
    setLoading(false);
  }, []);

  useEffect(() => {
    let vivo = true;
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!vivo) return;
      if (!error) setFactors((data?.totp || []).filter((f) => f.status === "verified"));
      setLoading(false);
    });
    return () => { vivo = false; };
  }, []);

  const t = useTotpEnroll({ onDone: carregar });
  const ativo = factors.length > 0;
  const desde = factors[0]?.created_at;
  const confirmar = (valor) => t.confirm(valor, { replaceIds: factors.map((f) => f.id) });

  return (
    <div className={`tf ${ativo ? "is-on" : ""}`}>
      <div className="tf-head">
        <span className="tf-ico"><ShieldIco size={22} /></span>
        <div className="tf-title">
          <h4>
            Autenticação de dois fatores
            {!loading && (ativo
              ? <span className="tf-badge is-on"><i /> Ativa</span>
              : <span className="tf-badge is-off">Por configurar</span>)}
          </h4>
          <p>
            {t.enroll
              ? "Leia o novo QR code no telemóvel novo. O anterior deixa de funcionar assim que confirmar."
              : `Obrigatória para todas as contas: ao entrar, além da password, é pedido um código da app autenticadora.${desde ? ` Configurada em ${new Date(desde).toLocaleDateString("pt-PT")}.` : ""}`}
          </p>
        </div>
        {!loading && !t.enroll && (
          <button type="button" className={ativo ? "pf-btn pf-btn-ghost" : "pf-btn pf-btn-primary"} onClick={t.start} disabled={t.busy}>
            {t.busy ? "A preparar…" : ativo ? "Mudar de telemóvel" : "Configurar 2FA"}
          </button>
        )}
      </div>

      <TotpEnrollSteps
        t={t}
        onConfirm={confirmar}
        actions={(
          <div className="tf-actions">
            <button type="button" className="pf-btn pf-btn-ghost" onClick={t.cancel} disabled={t.busy}>Cancelar</button>
            <button type="button" className="pf-btn pf-btn-primary" onClick={() => confirmar(t.code)} disabled={t.busy || t.code.length !== 6}>
              {t.busy ? "A confirmar…" : "Confirmar"}
            </button>
          </div>
        )}
      />

      {!t.enroll && t.error && <p className="tf-msg is-error" style={{ margin: "10px 0 0" }}>{t.error}</p>}
    </div>
  );
}
