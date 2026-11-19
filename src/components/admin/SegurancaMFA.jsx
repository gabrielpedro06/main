import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";
import "../../styles/seguranca-mfa.css";

const API_BASE = import.meta.env.VITE_MARKETING_API_BASE || "";
const API = `${API_BASE}/api/admin/mfa`;
const API_CONTAS = `${API_BASE}/api/admin/contas`;

const iniciais = (nome) => {
  const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "—");

const Shield = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const Reset = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>;

async function chamar(body, url = API) {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: JSON.stringify(body),
  });
  const out = await resp.json().catch(() => ({ ok: false, error: `Erro ${resp.status} do servidor.` }));
  if (!resp.ok || !out.ok) throw new Error(out.error || `Erro ${resp.status} do servidor.`);
  return out;
}

/**
 * Admin → Segurança: estado do MFA de cada pessoa + "Repor MFA".
 */
export default function SegurancaMFA({ profiles = [] }) {
  const [estado, setEstado] = useState(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [alvo, setAlvo] = useState(null);
  const [aRepor, setARepor] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [aBloquear, setABloquear] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const out = await chamar({ acao: "estado" });
      setEstado(out.estado);
      setErro("");
    } catch (e) {
      setErro(e.message);
      setEstado({});
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!alvo) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !aRepor) setAlvo(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alvo, aRepor]);

  async function repor() {
    setARepor(true);
    try {
      const out = await chamar({ acao: "repor", userId: alvo.id });
      setAviso({ tipo: "ok", texto: `MFA de ${alvo.nome || alvo.email} reposto (${out.removidos} fator(es) removido(s)). Na próxima entrada vai configurar a app de autenticação de novo.` });
      setAlvo(null);
      carregar();
    } catch (e) {
      setAviso({ tipo: "erro", texto: e.message });
    } finally {
      setARepor(false);
    }
  }

  async function bloquearInativos() {
    setABloquear(true);
    try {
      const out = await chamar({ acao: "sincronizar" }, API_CONTAS);
      setAviso({ tipo: "ok", texto: `${out.bloqueados} conta(s) inativa(s) bloqueada(s). Essas pessoas já não conseguem entrar no Bizin.` });
      carregar();
    } catch (e) {
      setAviso({ tipo: "erro", texto: e.message });
    } finally {
      setABloquear(false);
    }
  }

  // Inativos nos RH cuja conta ainda não está bloqueada no Supabase (ainda conseguem entrar)
  const inativosComAcesso = estado ? profiles.filter((p) => p.ativo === false && estado[p.id] && !estado[p.id].bloqueado) : [];

  const lista = profiles
    .filter((p) => !busca || `${p.nome || ""} ${p.email || ""}`.toLowerCase().includes(busca.toLowerCase()))
    .map((p) => ({ ...p, mfa: estado?.[p.id] }));
  const comMfa = Object.values(estado || {}).filter((e) => e.verificado).length;

  return (
    <div className="sgm bz-tab-panel">
      <div className="sgm-head">
        <span className="sgm-ico"><Shield /></span>
        <div>
          <h3>Autenticação de dois fatores (MFA)</h3>
          <p>Se alguém perdeu ou trocou de telemóvel, reponha o MFA: na próxima entrada a pessoa lê o QR de novo com a app de autenticação.</p>
        </div>
        <span className="sgm-kpi"><strong>{estado ? comMfa : "…"}</strong> com MFA ativo</span>
      </div>

      {aviso && (
        <div className={`sgm-aviso is-${aviso.tipo}`} role="status">
          <span>{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso">×</button>
        </div>
      )}
      {erro && <div className="sgm-aviso is-erro" role="alert"><span>{erro}</span></div>}

      {inativosComAcesso.length > 0 && (
        <div className="sgm-aviso is-alerta" role="alert">
          <span>
            <b>{inativosComAcesso.length} colaborador(es) inativo(s) ainda conseguem entrar no Bizin</b> ({inativosComAcesso.map((p) => p.nome || p.email).join(", ")}). Foram desativados antes de o bloqueio automático existir.
          </span>
          <button type="button" className="sgm-btn is-danger" onClick={bloquearInativos} disabled={aBloquear}>{aBloquear ? "A bloquear…" : "Bloquear acesso"}</button>
        </div>
      )}

      <input aria-label="Procurar pessoa por nome ou email" className="sgm-search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar pessoa por nome ou email" />

      <div className="sgm-table-wrap">
        <table className="sgm-table">
          <thead>
            <tr><th>Pessoa</th><th>MFA</th><th>Última entrada</th><th aria-label="Ações" /></tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="sgm-person">
                    <span className="sgm-av">{p.avatar_url ? <img src={p.avatar_url} alt="" /> : iniciais(p.nome)}</span>
                    <span>
                      <strong>{p.nome || "—"} {p.ativo === false && <em className={`sgm-tag ${p.mfa?.bloqueado ? "is-blocked" : "is-open"}`}>{p.mfa?.bloqueado ? "Inativo · bloqueado" : "Inativo · ainda entra"}</em>}</strong>
                      <small>{p.email || ""}</small>
                    </span>
                  </span>
                </td>
                <td>
                  {!estado ? <span className="sgm-pill">A verificar…</span>
                    : p.mfa?.verificado ? <span className="sgm-pill is-ok">Ativo desde {fmt(p.mfa.desde)}</span>
                      : <span className="sgm-pill is-off">Por configurar</span>}
                </td>
                <td className="sgm-muted">{fmt(p.mfa?.ultimoLogin)}</td>
                <td className="sgm-actions">
                  <button type="button" className="sgm-btn" disabled={!p.mfa?.fatores} onClick={() => setAlvo(p)} title={p.mfa?.fatores ? "Apagar o MFA desta pessoa" : "Esta pessoa não tem MFA configurado"}>
                    <Reset /> Repor MFA
                  </button>
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={4} className="sgm-muted sgm-empty">Ninguém encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {alvo && createPortal(
        <div className="sgm-back" onClick={() => { if (!aRepor) setAlvo(null); }}>
          <div className="sgm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sgm-title" onClick={(e) => e.stopPropagation()}>
            <span className="sgm-dialog-ico"><Reset size={20} /></span>
            <h3 id="sgm-title">Repor o MFA de {alvo.nome || alvo.email}?</h3>
            <p>A app de autenticação que esta pessoa usa deixa de funcionar no Bizin. Na próxima entrada, depois da palavra-passe, vai ter de ler um QR novo.</p>
            <p className="sgm-muted">Faça isto só depois de confirmar com a própria pessoa (por exemplo, por telefone). Fica registado no histórico de auditoria.</p>
            <div className="sgm-dialog-actions">
              <button type="button" className="sgm-btn is-ghost" onClick={() => setAlvo(null)} disabled={aRepor}>Cancelar</button>
              <button type="button" className="sgm-btn is-danger" onClick={repor} disabled={aRepor}><Reset /> {aRepor ? "A repor…" : "Repor MFA"}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
