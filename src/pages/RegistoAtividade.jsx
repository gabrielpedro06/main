// =====================================================================
// Registos (rota /dashboard/registos) — só admin/administrador.
// Vista "atividade": lê public.audit_log (migração 064), preenchida por
// triggers em todas as tabelas (INSERT/UPDATE/DELETE, só campos alterados,
// sensíveis mascarados) e por eventos da app (registarEvento: login, logout,
// exportações…). Filtros por pessoa, área (tabela), operação e período;
// paginação de 50 em 50; clicar num registo filtra o histórico desse registo.
// Vista "alertas" (?alertas=1): <AlertasSeguranca/> (migração 075).
// Exportar CSV: só as linhas já carregadas no ecrã; fica registado em audit_log.
// =====================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import FancySelect from "../components/FancySelect";
import AlertasSeguranca from "../components/admin/AlertasSeguranca";
import { registarEvento } from "../utils/registarEvento";
import { TABELAS, nomeTabela, VERBO, EVENTOS, rotuloRegisto } from "../utils/auditoria";
import "../styles/registos.css";

const POR_PAGINA = 50;

const OPERACOES = [
  { id: "", label: "Tudo" },
  { id: "INSERT", label: "Criações" },
  { id: "UPDATE", label: "Alterações" },
  { id: "DELETE", label: "Eliminações" },
  { id: "EVENTO", label: "Eventos" },
];
const PERIODOS = [
  { id: "1", label: "Hoje" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "90", label: "90 dias" },
  { id: "", label: "Tudo" },
];

const fmtData = (iso) => new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmtValor = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v === "" ? "(vazio)" : v;
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return JSON.stringify(v, null, 1);
};
export default function RegistoAtividade() {
  const [params, setParams] = useSearchParams();
  const vista = params.get("alertas") === "1" ? "alertas" : "atividade";
  const mudarVista = (v) => setParams(v === "alertas" ? { alertas: "1" } : {}, { replace: true });
  const [porVer, setPorVer] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [aCarregar, setACarregar] = useState(false);
  const [haMais, setHaMais] = useState(false);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(null);
  const [fUser, setFUser] = useState("");
  const [fTabela, setFTabela] = useState("");
  const [fOp, setFOp] = useState("");
  const [fPeriodo, setFPeriodo] = useState("7");
  const [fRegisto, setFRegisto] = useState(null); // { tabela, id, rotulo }
  const [tabelasVistas, setTabelasVistas] = useState([]);

  useEffect(() => {
    supabase.from("profiles").select("id, nome, email, avatar_url").order("nome").then(({ data }) => setPerfis(data || []));
    // Contador de alertas por ver (no separador), mesmo estando na vista de atividade
    supabase.from("alertas_seguranca").select("id", { count: "exact", head: true }).is("visto_em", null)
      .then(({ count, error }) => { if (!error) setPorVer(count || 0); });
  }, []);

  const perfil = useCallback((id) => perfis.find((p) => p.id === id) || null, [perfis]);

  const consulta = useCallback((desde) => {
    let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).order("id", { ascending: false });
    if (fUser) q = q.eq("user_id", fUser);
    if (fRegisto) q = q.eq("tabela", fRegisto.tabela).eq("registo_id", fRegisto.id);
    else if (fTabela) q = q.eq("tabela", fTabela);
    if (fOp) q = q.eq("operacao", fOp);
    if (fPeriodo) {
      const d = new Date();
      if (fPeriodo === "1") d.setHours(0, 0, 0, 0);
      else d.setDate(d.getDate() - Number(fPeriodo));
      q = q.gte("created_at", d.toISOString());
    }
    return q.range(desde, desde + POR_PAGINA - 1);
  }, [fUser, fTabela, fOp, fPeriodo, fRegisto]);

  const carregar = useCallback(async (reset) => {
    setACarregar(true);
    setErro("");
    const desde = reset ? 0 : linhas.length;
    const { data, error } = await consulta(desde);
    if (error) {
      setErro(/audit_log/.test(error.message) ? "O registo de atividade ainda não está ativo. Aplique a migração 064 no Supabase." : error.message);
      setACarregar(false);
      return;
    }
    const novas = data || [];
    setLinhas((prev) => (reset ? novas : [...prev, ...novas]));
    setHaMais(novas.length === POR_PAGINA);
    setTabelasVistas((prev) => [...new Set([...prev, ...novas.map((r) => r.tabela).filter(Boolean)])]);
    setACarregar(false);
  }, [consulta, linhas.length]);

  // recarrega quando mudam os filtros
  useEffect(() => {
    carregar(true);
    setAberto(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fUser, fTabela, fOp, fPeriodo, fRegisto]);

  const opcoesTabela = useMemo(() => {
    const todas = [...new Set([...Object.keys(TABELAS), ...tabelasVistas])].sort((a, b) => nomeTabela(a).localeCompare(nomeTabela(b), "pt"));
    return [{ value: "", label: "Todas as áreas" }, ...todas.map((t) => ({ value: t, label: nomeTabela(t) }))];
  }, [tabelasVistas]);

  const opcoesUser = useMemo(() => [{ value: "", label: "Todas as pessoas" }, ...perfis.map((p) => ({ value: p.id, label: p.nome || p.email || "Sem nome" }))], [perfis]);

  const quem = (r) => perfil(r.user_id)?.nome || r.user_email || (r.user_id ? "Utilizador" : "Sistema");

  const frase = (r) => {
    if (r.operacao === "EVENTO") return EVENTOS[r.acao] || r.acao || "evento";
    const rot = rotuloRegisto(r);
    return (
      <>
        {VERBO[r.operacao]} <b>{nomeTabela(r.tabela)}</b>
        {rot && <span className="rg-rot"> · {String(rot).slice(0, 80)}</span>}
      </>
    );
  };

  const exportar = () => {
    const cab = ["Data", "Pessoa", "Email", "Operação", "Área", "Registo", "Campos alterados", "Antes", "Depois", "Detalhes"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cab, ...linhas.map((r) => [
      new Date(r.created_at).toISOString(), quem(r), r.user_email || "", r.operacao === "EVENTO" ? r.acao : r.operacao,
      nomeTabela(r.tabela), r.registo_id || "", (r.campos_alterados || []).join(", "),
      r.dados_antes ? JSON.stringify(r.dados_antes) : "", r.dados_depois ? JSON.stringify(r.dados_depois) : "", r.detalhes ? JSON.stringify(r.detalhes) : "",
    ])].map((l) => l.map(esc).join(";")).join("\n");
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `registo-atividade-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    registarEvento("exportar_registos", { linhas: linhas.length, filtros: { fUser, fTabela, fOp, fPeriodo } });
  };

  return (
    <div className="rg-page">
      <header className="rg-hero">
        <span className="rg-hero-orb is-a" aria-hidden="true" />
        <span className="rg-hero-orb is-b" aria-hidden="true" />
        <div className="rg-hero-row">
          <div className="rg-hero-main">
            <span className="rg-hero-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></svg>
            </span>
            <div>
              <span className="rg-hero-kicker">Administração</span>
              <h1>Registo de atividade</h1>
              <p>Tudo o que é criado, alterado ou eliminado na aplicação, por quem e quando. Passwords e tokens ficam ocultos.</p>
            </div>
          </div>
          <div className="rg-hero-side">
            {vista === "atividade" ? (
              <>
                <span className="rg-chip"><strong>{aCarregar && !linhas.length ? "…" : linhas.length}{haMais ? "+" : ""}</strong> registos</span>
                <span className="rg-chip">{PERIODOS.find((p) => p.id === fPeriodo)?.label || "Tudo"}</span>
                <button type="button" className="rg-hero-btn" onClick={exportar} disabled={!linhas.length}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
                  Exportar CSV
                </button>
              </>
            ) : (
              <span className="rg-chip"><strong>{porVer ?? "…"}</strong> por ver</span>
            )}
          </div>
        </div>
        <nav className="rg-tabs" role="tablist" aria-label="Secções do registo">
          <button type="button" role="tab" aria-selected={vista === "atividade"} className={vista === "atividade" ? "is-on" : ""} onClick={() => mudarVista("atividade")}>
            Atividade
          </button>
          <button type="button" role="tab" aria-selected={vista === "alertas"} className={vista === "alertas" ? "is-on" : ""} onClick={() => mudarVista("alertas")}>
            Alertas de segurança{porVer ? <span className="rg-tab-badge">{porVer}</span> : null}
          </button>
        </nav>
      </header>

      {vista === "alertas" && <AlertasSeguranca onPorVer={setPorVer} />}
      {vista === "atividade" && (<>
      <div className="rg-filtros">
        <div className="rg-seg" role="tablist">
          {OPERACOES.map((o) => (
            <button key={o.id || "all"} type="button" className={fOp === o.id ? "is-on" : ""} onClick={() => setFOp(o.id)}>{o.label}</button>
          ))}
        </div>
        <div className="rg-seg" role="tablist">
          {PERIODOS.map((p) => (
            <button key={p.id || "all"} type="button" className={fPeriodo === p.id ? "is-on" : ""} onClick={() => setFPeriodo(p.id)}>{p.label}</button>
          ))}
        </div>
        <FancySelect value={fUser} onChange={setFUser} options={opcoesUser} menuWidth={280} />
        <FancySelect value={fTabela} onChange={(v) => { setFTabela(v); setFRegisto(null); }} options={opcoesTabela} menuWidth={300} />
      </div>

      {fRegisto && (
        <div className="rg-chip-filtro">
          Histórico de <b>{nomeTabela(fRegisto.tabela)}</b>{fRegisto.rotulo ? ` · ${fRegisto.rotulo}` : ""}
          <button type="button" onClick={() => setFRegisto(null)} aria-label="Remover filtro">×</button>
        </div>
      )}

      {erro && <div className="rg-erro">{erro}</div>}

      <div className="rg-lista">
        {!aCarregar && !erro && linhas.length === 0 && <div className="rg-vazio">Sem registos para estes filtros.</div>}
        {linhas.map((r) => {
          const p = perfil(r.user_id);
          const open = aberto === r.id;
          return (
            <article key={r.id} className={`rg-row is-${r.operacao.toLowerCase()} ${open ? "is-open" : ""}`}>
              <button type="button" className="rg-row-main" onClick={() => setAberto(open ? null : r.id)}>
                <span className="rg-op" aria-hidden="true" />
                <span className="rg-av">
                  {p?.avatar_url ? <img src={p.avatar_url} alt="" /> : (quem(r)[0] || "?").toUpperCase()}
                </span>
                <span className="rg-txt">
                  <span className="rg-frase"><b>{quem(r)}</b> {frase(r)}</span>
                  {r.operacao === "UPDATE" && r.campos_alterados?.length > 0 && (
                    <span className="rg-campos">{r.campos_alterados.slice(0, 6).join(", ")}{r.campos_alterados.length > 6 ? ` +${r.campos_alterados.length - 6}` : ""}</span>
                  )}
                </span>
                <time className="rg-hora" dateTime={r.created_at}>{fmtData(r.created_at)}</time>
              </button>

              {open && (
                <div className="rg-det">
                  {r.operacao === "UPDATE" && (
                    <table className="rg-diff">
                      <thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
                      <tbody>
                        {(r.campos_alterados || []).map((k) => (
                          <tr key={k}>
                            <td className="rg-k">{k}</td>
                            <td className="rg-antes"><pre>{fmtValor(r.dados_antes?.[k])}</pre></td>
                            <td className="rg-depois"><pre>{fmtValor(r.dados_depois?.[k])}</pre></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {(r.operacao === "INSERT" || r.operacao === "DELETE") && (
                    <table className="rg-diff">
                      <tbody>
                        {Object.entries((r.operacao === "INSERT" ? r.dados_depois : r.dados_antes) || {}).map(([k, v]) => (
                          <tr key={k}><td className="rg-k">{k}</td><td><pre>{fmtValor(v)}</pre></td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {r.operacao === "EVENTO" && r.detalhes && Object.keys(r.detalhes).length > 0 && (
                    <table className="rg-diff">
                      <tbody>
                        {Object.entries(r.detalhes).map(([k, v]) => <tr key={k}><td className="rg-k">{k}</td><td><pre>{fmtValor(v)}</pre></td></tr>)}
                      </tbody>
                    </table>
                  )}
                  <div className="rg-det-foot">
                    <span>{r.user_email || ""}{r.registo_id ? ` · ID ${r.registo_id}` : ""}</span>
                    {r.tabela && r.registo_id && !fRegisto && (
                      <button type="button" className="rg-btn is-soft" onClick={() => setFRegisto({ tabela: r.tabela, id: r.registo_id, rotulo: rotuloRegisto(r) })}>
                        Ver histórico deste registo
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {aCarregar && <div className="rg-vazio">A carregar…</div>}
        {haMais && !aCarregar && <button type="button" className="rg-btn is-soft rg-mais" onClick={() => carregar(false)}>Carregar mais</button>}
      </div>
      </>)}
    </div>
  );
}
