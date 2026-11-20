import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";

// Vista "Alertas de segurança" da página de Registos (migração 075)
// Lê (só admins, por RLS):
//   alertas_seguranca  alertas gerados pelo servidor/regras da BD (até 200)
//   tentativas_login   passwords/códigos 2FA errados dos últimos 7 dias (até 50)
//   seguranca_estado   estado da recolha de logs do Supabase (chave "recolha_logs",
//                      atualizada a cada 10 min pelo pg_cron → /api/seguranca/recolher)
// "Marcar como visto" grava visto_por/visto_em; onPorVer atualiza o contador do separador.
const GRAV = { alta: "Alta", media: "Média", baixa: "Baixa" };
const MOTIVO = { password: "Palavra-passe errada", mfa: "Código 2FA errado", conta_bloqueada: "Conta bloqueada" };
const fmt = (iso) => (iso ? new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const fmtValor = (v) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

export default function AlertasSeguranca({ onPorVer }) {
  const { user } = useAuth() || {};
  const [alertas, setAlertas] = useState([]);
  const [tentativas, setTentativas] = useState([]);
  const [recolha, setRecolha] = useState(null);
  const [filtro, setFiltro] = useState("porver");
  const [aberto, setAberto] = useState(null);
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    const desde = new Date(Date.now() - 7 * 86400000).toISOString();
    const [a, t, e] = await Promise.all([
      supabase.from("alertas_seguranca").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("tentativas_login").select("id, created_at, email, ip, pais, motivo").gte("created_at", desde).order("created_at", { ascending: false }).limit(50),
      supabase.from("seguranca_estado").select("valor, atualizado_em").eq("chave", "recolha_logs").maybeSingle(),
    ]);
    setErro("");
    if (a.error) {
      setErro(/alertas_seguranca/.test(a.error.message) ? "Os alertas de segurança ainda não estão ativos. Aplique a migração 075 no Supabase." : a.error.message);
    } else {
      setAlertas(a.data || []);
      onPorVer?.((a.data || []).filter((x) => !x.visto_em).length);
    }
    setTentativas(t.data || []);
    setRecolha(e.data || null);
    setACarregar(false);
  }, [onPorVer]);

  // carregar() só altera o estado depois de esperar pela BD (não é síncrono)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, [carregar]);

  async function marcarVisto(ids) {
    if (!ids.length) return;
    const agora = new Date().toISOString();
    const { error } = await supabase.from("alertas_seguranca").update({ visto_por: user?.id || null, visto_em: agora }).in("id", ids);
    if (error) { setErro(error.message); return; }
    setAlertas((lista) => {
      const nova = lista.map((x) => (ids.includes(x.id) ? { ...x, visto_por: user?.id, visto_em: agora } : x));
      onPorVer?.(nova.filter((x) => !x.visto_em).length);
      return nova;
    });
  }

  const visiveis = filtro === "porver" ? alertas.filter((a) => !a.visto_em) : alertas;
  const v = recolha?.valor || {};
  const estadoRecolha = !recolha
    ? { tom: "is-off", txt: "A recolha dos logs do Supabase ainda não está ligada (ver passo 075b)." }
    : v.ultimo_erro
      ? { tom: "is-erro", txt: `Última tentativa ${fmt(v.ultima_execucao)} falhou: ${v.ultimo_erro}` }
      : { tom: "is-ok", txt: `Logs do Supabase copiados para a base de dados · última recolha ${fmt(v.ultima_execucao)}` };

  return (
    <div className="rg-alertas">
      <div className={`rg-recolha ${estadoRecolha.tom}`} role="status">
        <span className="rg-recolha-dot" aria-hidden="true" />
        <span>{estadoRecolha.txt}</span>
      </div>

      <div className="rg-filtros">
        <div className="rg-seg" role="tablist" aria-label="Filtrar alertas">
          <button type="button" role="tab" aria-selected={filtro === "porver"} className={filtro === "porver" ? "is-on" : ""} onClick={() => setFiltro("porver")}>
            Por ver ({alertas.filter((a) => !a.visto_em).length})
          </button>
          <button type="button" role="tab" aria-selected={filtro === "todos"} className={filtro === "todos" ? "is-on" : ""} onClick={() => setFiltro("todos")}>
            Todos
          </button>
        </div>
        {filtro === "porver" && visiveis.length > 1 && (
          <button type="button" className="rg-btn is-soft" onClick={() => marcarVisto(visiveis.map((a) => a.id))}>Marcar todos como vistos</button>
        )}
        <button type="button" className="rg-btn is-soft" onClick={() => { setACarregar(true); carregar(); }} disabled={aCarregar}>Atualizar</button>
      </div>

      {erro && <div className="rg-erro">{erro}</div>}

      <div className="rg-lista">
        {!aCarregar && !erro && visiveis.length === 0 && (
          <div className="rg-vazio">{filtro === "porver" ? "Nenhum alerta por ver. Está tudo calmo." : "Ainda não houve alertas."}</div>
        )}
        {visiveis.map((a) => {
          const open = aberto === a.id;
          return (
            <article key={a.id} className={`rg-alerta is-${a.gravidade} ${a.visto_em ? "is-visto" : ""}`}>
              <button type="button" className="rg-alerta-main" aria-expanded={open} onClick={() => setAberto(open ? null : a.id)}>
                <span className="rg-grav">{GRAV[a.gravidade] || a.gravidade}</span>
                <span className="rg-txt">
                  <span className="rg-alerta-titulo">{a.titulo}</span>
                  <span className="rg-alerta-msg">{a.mensagem}</span>
                </span>
                <time className="rg-hora" dateTime={a.created_at}>{fmt(a.created_at)}</time>
              </button>
              {open && (
                <div className="rg-det">
                  <table className="rg-diff">
                    <tbody>
                      {a.user_email && <tr><td className="rg-k">Conta</td><td>{a.user_email}</td></tr>}
                      {a.ip && <tr><td className="rg-k">IP</td><td>{a.ip}</td></tr>}
                      {a.pais && <tr><td className="rg-k">País</td><td>{a.pais}</td></tr>}
                      <tr><td className="rg-k">Tipo</td><td>{a.tipo}</td></tr>
                      {Object.entries(a.detalhes || {}).map(([k, val]) => <tr key={k}><td className="rg-k">{k}</td><td><pre>{fmtValor(val)}</pre></td></tr>)}
                      <tr><td className="rg-k">Email aos admins</td><td>{a.email_enviado ? "Enviado" : "Por enviar"}</td></tr>
                    </tbody>
                  </table>
                  <div className="rg-det-foot">
                    <span>{a.visto_em ? `Visto em ${fmt(a.visto_em)}` : "Ainda não foi visto"}</span>
                    {!a.visto_em && <button type="button" className="rg-btn" onClick={() => marcarVisto([a.id])}>Marcar como visto</button>}
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {aCarregar && <div className="rg-vazio">A carregar…</div>}
      </div>

      <h2 className="rg-sub">Tentativas de entrada falhadas · últimos 7 dias</h2>
      <div className="rg-tabela-wrap">
        {tentativas.length === 0 ? (
          <div className="rg-vazio">Sem tentativas falhadas.</div>
        ) : (
          <table className="rg-tabela">
            <thead><tr><th>Quando</th><th>Email</th><th>Motivo</th><th>IP</th><th>País</th></tr></thead>
            <tbody>
              {tentativas.map((t) => (
                <tr key={t.id}>
                  <td>{fmt(t.created_at)}</td>
                  <td>{t.email || "—"}</td>
                  <td>{MOTIVO[t.motivo] || t.motivo}</td>
                  <td>{t.ip || "—"}</td>
                  <td>{t.pais || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
