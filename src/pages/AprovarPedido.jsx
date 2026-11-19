import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import {
  formatAbsenceTypeLabel,
  isVacationType,
  obterSaldoFeriasAnoComTransicao,
  obterToleranciasAtivas,
  getAnnualVacationLimitFromProfile,
  parseLocalDate,
} from "../utils/feriasSaldo";
import { ACOES, decidirPedido, diasDoPedido, ehPedidoKm, fmtDias } from "../utils/decisaoPedido";
import "../styles/aprovar-pedido.css";
import { dataSegura } from "../utils/filtroSeguro";

// =====================================================================
// Página aberta a partir do email "novo pedido de ausência".
// Só RH (rota protegida + login com 2FA). Mostra o pedido, o saldo de férias
// e quem mais está ausente nesses dias; a decisão é tomada aqui dentro.
// =====================================================================

const PERFIL_COLS = "nome, email, funcao, avatar_url, empresa_interna, dias_ferias_total, dias_ferias, data_admissao";

const ESTADOS = {
  pendente: { label: "Pendente", cls: "is-wait" },
  aprovado: { label: "Aprovado", cls: "is-ok" },
  rejeitado: { label: "Rejeitado", cls: "is-no" },
  cancelado: { label: "Cancelado", cls: "is-off" },
  pedido_cancelamento: { label: "Pede cancelamento", cls: "is-wait" },
};

const TEXTO_ACAO = {
  aprovar: { titulo: "Aprovar este pedido?", botao: "Aprovar", tom: "ok", feito: "Pedido aprovado. O colaborador já foi avisado." },
  rejeitar: { titulo: "Rejeitar este pedido?", botao: "Rejeitar", tom: "no", feito: "Pedido rejeitado. O colaborador já foi avisado." },
  aceitar_cancelamento: { titulo: "Aceitar o cancelamento?", botao: "Aceitar cancelamento", tom: "ok", feito: "Cancelamento aceite. Os dias voltam ao saldo." },
  recusar_cancelamento: { titulo: "Recusar o cancelamento?", botao: "Recusar cancelamento", tom: "no", feito: "Cancelamento recusado. O pedido mantém-se aprovado." },
};

const fmtData = (d, opts = { day: "2-digit", month: "short", year: "numeric" }) => {
  const dt = parseLocalDate(d);
  return dt ? dt.toLocaleDateString("pt-PT", opts) : "—";
};
const iniciais = (nome = "") => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

function Icone({ d, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}
const I = {
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  ok: <path d="M20 6 9 17l-5-5" />,
  no: <path d="M18 6 6 18M6 6l12 12" />,
  back: <path d="m15 18-6-6 6-6" />,
  clip: <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>,
};

async function carregarPedido(id) {
  let res = await supabase.from("ferias").select(`*, profiles(${PERFIL_COLS})`).eq("id", id).maybeSingle();
  if (res.error && /dias_ferias_total/.test(res.error.message || "")) {
    res = await supabase.from("ferias").select(`*, profiles(${PERFIL_COLS.replace("dias_ferias_total, ", "")})`).eq("id", id).maybeSingle();
  }
  if (res.error) throw res.error;
  return res.data;
}

async function carregarContexto(pedido) {
  const inicio = pedido.data_inicio;
  const fim = pedido.data_fim || pedido.data_inicio;
  const ferias = isVacationType(pedido.tipo) && !ehPedidoKm(pedido);

  const tolerancias = pedido.user_id
    ? await obterToleranciasAtivas({ supabaseClient: supabase, userId: pedido.user_id }).catch(() => [])
    : [];

  const saldoP = ferias && pedido.user_id
    ? obterSaldoFeriasAnoComTransicao({
      supabaseClient: supabase,
      userId: pedido.user_id,
      ano: parseLocalDate(inicio)?.getFullYear(),
      diasLimiteAnual: getAnnualVacationLimitFromProfile(pedido.profiles),
      dataAdmissao: pedido.profiles?.data_admissao,
      tolerancias,
      dataReferencia: parseLocalDate(inicio) || new Date(),
    }).catch(() => null)
    : Promise.resolve(null);

  // Quem mais está ausente (aprovado) em algum dos dias do pedido
  const equipaP = ehPedidoKm(pedido) || !inicio
    ? Promise.resolve([])
    : supabase
      .from("ferias")
      .select("id, user_id, tipo, data_inicio, data_fim, is_parcial, profiles(nome, avatar_url)")
      .eq("estado", "aprovado")
      .neq("tipo", "Pedido de Km's")
      .not("user_id", "is", null)
      .neq("user_id", pedido.user_id)
      .lte("data_inicio", fim)
      .or(`data_fim.gte.${dataSegura(inicio)},and(data_fim.is.null,data_inicio.gte.${dataSegura(inicio)})`)
      .order("data_inicio")
      .then(({ data }) => data || []);

  const [saldo, equipa] = await Promise.all([saldoP, equipaP]);
  return { saldo, equipa, dias: diasDoPedido(pedido, tolerancias) };
}

/** Carrega o pedido e o contexto; nunca lança erro (devolve o estado da página). */
async function obterEstado(id) {
  try {
    const pedido = await carregarPedido(id);
    if (!pedido) return { loading: false, erro: "Este pedido não existe ou foi eliminado.", pedido: null, ctx: null };
    return { loading: false, erro: null, pedido, ctx: await carregarContexto(pedido) };
  } catch (err) {
    console.error("Erro ao carregar o pedido:", err);
    return { loading: false, erro: "Não foi possível carregar o pedido.", pedido: null, ctx: null };
  }
}

export default function AprovarPedido() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth() || {};

  const [estado, setEstado] = useState({ loading: true, erro: null, pedido: null, ctx: null });
  // Botão carregado no email (?acao=aprovar|rejeitar): abre logo a confirmação
  const [dialogo, setDialogo] = useState(() => (["aprovar", "rejeitar"].includes(params.get("acao")) ? params.get("acao") : null));
  const [aEnviar, setAEnviar] = useState(false);
  const [aviso, setAviso] = useState(null); // { tom, texto }

  const carregar = useCallback(async () => setEstado(await obterEstado(id)), [id]);

  useEffect(() => {
    let vivo = true;
    obterEstado(id).then((s) => { if (vivo) setEstado(s); });
    return () => { vivo = false; };
  }, [id]);

  const { loading, erro, pedido, ctx } = estado;

  async function confirmar() {
    if (!dialogo || !pedido) return;
    setAEnviar(true);
    setAviso(null);
    try {
      await decidirPedido({ pedido, acao: dialogo, perfil: pedido.profiles, autorId: user?.id });
      setAviso({ tom: "ok", texto: TEXTO_ACAO[dialogo].feito });
      setDialogo(null);
      await carregar();
    } catch (err) {
      setAviso({ tom: "no", texto: err?.message || "Não foi possível concluir." });
      setDialogo(null);
      await carregar();
    } finally {
      setAEnviar(false);
    }
  }

  if (loading) {
    return (
      <div className="apv-page">
        <div className="apv-skeleton" role="status" aria-label="A carregar o pedido"><span /><span /><span /></div>
      </div>
    );
  }

  if (erro || !pedido) {
    return (
      <div className="apv-page">
        <div className="apv-empty">
          <span className="apv-empty-icon"><Icone d={I.cal} size={26} /></span>
          <h1>{erro || "Pedido não encontrado."}</h1>
          <p>Pode ver todos os pedidos no painel de Recursos Humanos.</p>
          <Link to="/dashboard/rh" className="apv-btn is-ghost">Abrir Recursos Humanos</Link>
        </div>
      </div>
    );
  }

  const perfil = pedido.profiles || {};
  const km = ehPedidoKm(pedido);
  const ferias = isVacationType(pedido.tipo) && !km;
  const est = ESTADOS[pedido.estado] || { label: pedido.estado || "—", cls: "is-off" };
  const acoes = Object.keys(ACOES).filter((a) => ACOES[a].de === pedido.estado);
  const fim = pedido.data_fim && pedido.data_fim !== pedido.data_inicio ? pedido.data_fim : null;
  const saldo = ctx?.saldo;
  const dias = ctx?.dias || 0;
  const conta = pedido.estado === "pendente";
  const ficaCom = saldo ? Math.max(0, (saldo.diasDisponiveis || 0) - (conta ? dias : 0)) : null;
  const semSaldo = saldo && conta && dias > (saldo.diasDisponiveis || 0);
  const detalhe = TEXTO_ACAO[dialogo];

  return (
    <div className="apv-page">
      <Link to="/dashboard/rh" className="apv-back"><Icone d={I.back} size={16} /> Recursos Humanos</Link>

      <header className="apv-hero">
        <span className="apv-hero-orb" aria-hidden="true" />
        <div className="apv-hero-who">
          <span className="apv-avatar">
            {perfil.avatar_url ? <img src={perfil.avatar_url} alt="" /> : iniciais(perfil.nome)}
          </span>
          <div>
            <span className="apv-kicker">{km ? "Pedido de quilómetros" : "Pedido de ausência"}</span>
            <h1>{perfil.nome || "Colaborador"}</h1>
            <p>{[perfil.funcao, perfil.empresa_interna].filter(Boolean).join(" · ") || perfil.email}</p>
          </div>
        </div>
        <div className="apv-hero-side">
          <span className={`apv-state ${est.cls}`}>{est.label}</span>
          {pedido.created_at && <small>Submetido a {fmtData(pedido.created_at.slice(0, 10))}</small>}
        </div>
      </header>

      {aviso && <div className={`apv-alert is-${aviso.tom}`} role="status">{aviso.texto}</div>}

      <div className="apv-grid">
        <section className="apv-card apv-main">
          <h2><Icone d={km ? I.cal : I.sun} /> {km ? "Deslocação" : formatAbsenceTypeLabel(pedido.tipo) || "Ausência"}</h2>

          <div className="apv-period">
            <div>
              <span>{fim ? "De" : "Dia"}</span>
              <strong>{fmtData(pedido.data_inicio, { weekday: "short", day: "numeric", month: "long" })}</strong>
            </div>
            {fim && (
              <>
                <i aria-hidden="true">→</i>
                <div>
                  <span>Até</span>
                  <strong>{fmtData(fim, { weekday: "short", day: "numeric", month: "long" })}</strong>
                </div>
              </>
            )}
          </div>

          <dl className="apv-facts">
            {!km && (
              <div><dt>Duração</dt><dd>{pedido.is_parcial ? `${pedido.hora_inicio?.slice(0, 5)}–${pedido.hora_fim?.slice(0, 5)}` : fmtDias(dias)}{pedido.is_parcial && dias > 0 ? <small> ({fmtDias(dias)})</small> : null}</dd></div>
            )}
            {!km && <div><dt>Tipo</dt><dd>{pedido.tipo || "—"}</dd></div>}
            {km && (
              <>
                <div><dt>Percurso</dt><dd>{pedido.km_origem || "—"} {pedido.km_ida_volta ? "⇄" : "→"} {pedido.km_destino || "—"}</dd></div>
                <div><dt>Distância</dt><dd>{pedido.km_total ? `${pedido.km_total} km` : "—"}{pedido.km_ida_volta ? <small> (ida e volta)</small> : null}</dd></div>
                {pedido.veiculo && <div><dt>Veículo</dt><dd>{pedido.veiculo}</dd></div>}
              </>
            )}
            <div><dt>Ano</dt><dd>{parseLocalDate(pedido.data_inicio)?.getFullYear() || "—"}</dd></div>
          </dl>

          {pedido.motivo && (
            <blockquote className="apv-note">
              <span>Observações</span>
              {pedido.motivo}
            </blockquote>
          )}

          {pedido.anexo_url && (
            <a className="apv-attach" href={pedido.anexo_url} target="_blank" rel="noreferrer">
              <Icone d={I.clip} size={16} /> Ver anexo
            </a>
          )}
        </section>

        <div className="apv-side">
          {ferias && (
            <section className="apv-card">
              <h2><Icone d={I.sun} /> Saldo de férias {parseLocalDate(pedido.data_inicio)?.getFullYear()}</h2>
              {saldo ? (
                <>
                  <div className="apv-balance">
                    <div><span>Disponível</span><strong>{fmtDias(saldo.diasDisponiveis)}</strong></div>
                    <div><span>{conta ? "Este pedido" : "Pedido"}</span><strong>{fmtDias(dias)}</strong></div>
                    <div className={semSaldo ? "is-no" : ""}><span>{conta ? "Fica com" : "Restante"}</span><strong>{fmtDias(ficaCom)}</strong></div>
                  </div>
                  <p className="apv-muted">
                    {fmtDias(saldo.diasConsumidos)} gozados de {fmtDias(saldo.diasLimite)}
                    {saldo.diasTransitados ? ` · ${fmtDias(saldo.diasTransitados)} transitados do ano anterior` : ""}
                  </p>
                  {semSaldo && <p className="apv-warn">Este pedido ultrapassa o saldo disponível.</p>}
                </>
              ) : (
                <p className="apv-muted">Não foi possível calcular o saldo.</p>
              )}
            </section>
          )}

          {!km && (
            <section className="apv-card">
              <h2><Icone d={I.users} /> Também ausentes nesses dias</h2>
              {ctx?.equipa?.length ? (
                <ul className="apv-team">
                  {ctx.equipa.map((a) => (
                    <li key={a.id}>
                      <span className="apv-avatar is-sm">
                        {a.profiles?.avatar_url ? <img src={a.profiles.avatar_url} alt="" /> : iniciais(a.profiles?.nome)}
                      </span>
                      <span>
                        <strong>{a.profiles?.nome || "Colaborador"}</strong>
                        <small>
                          {formatAbsenceTypeLabel(a.tipo)} · {fmtData(a.data_inicio, { day: "numeric", month: "short" })}
                          {a.data_fim && a.data_fim !== a.data_inicio ? ` – ${fmtData(a.data_fim, { day: "numeric", month: "short" })}` : ""}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="apv-muted">Ninguém da equipa tem ausências aprovadas nesses dias.</p>
              )}
            </section>
          )}
        </div>
      </div>

      <footer className="apv-actions">
        {acoes.length ? (
          <>
            <p>{pedido.estado === "pedido_cancelamento" ? "O colaborador pediu para cancelar este pedido já aprovado." : "Este pedido aguarda a sua decisão."}</p>
            <div>
              {[...acoes].reverse().map((a) => (
                <button key={a} type="button" className={`apv-btn is-${TEXTO_ACAO[a].tom}`} onClick={() => setDialogo(a)} disabled={aEnviar}>
                  <Icone d={TEXTO_ACAO[a].tom === "ok" ? I.ok : I.no} size={16} /> {TEXTO_ACAO[a].botao}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p>Este pedido já está <strong>{est.label.toLowerCase()}</strong>. Não há nada a decidir.</p>
            <Link to="/dashboard/rh" className="apv-btn is-ghost">Voltar aos Recursos Humanos</Link>
          </>
        )}
      </footer>

      {detalhe && acoes.includes(dialogo) && createPortal(
        <div className="apv-dialog" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !aEnviar) setDialogo(null); }}>
          <div className="apv-dialog-box" role="dialog" aria-modal="true" aria-labelledby="apv-dialog-t">
            <span className={`apv-dialog-icon is-${detalhe.tom}`}><Icone d={detalhe.tom === "ok" ? I.ok : I.no} size={22} /></span>
            <h3 id="apv-dialog-t">{detalhe.titulo}</h3>
            <p>
              <strong>{perfil.nome || "Colaborador"}</strong> · {km ? "Km" : formatAbsenceTypeLabel(pedido.tipo)} · {fmtData(pedido.data_inicio)}{fim ? ` a ${fmtData(fim)}` : ""}
            </p>
            {dialogo === "aprovar" && semSaldo && <p className="apv-warn">Atenção: ultrapassa o saldo disponível. A aprovação vai ser recusada.</p>}
            <div className="apv-dialog-actions">
              <button type="button" className="apv-btn is-ghost" onClick={() => setDialogo(null)} disabled={aEnviar} autoFocus>Cancelar</button>
              <button type="button" className={`apv-btn is-${detalhe.tom}`} onClick={confirmar} disabled={aEnviar}>
                {aEnviar ? "A guardar…" : detalhe.botao}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
