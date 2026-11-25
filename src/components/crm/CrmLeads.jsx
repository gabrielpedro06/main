// =====================================================================
// CRM das Leads (separador "Leads" de pages/GestaoLeads.jsx).
//  - Indicadores: funil em aberto, valor ponderado, ganhos do mês, taxa de
//    fecho (90 dias), leads esquecidas e ações para hoje/em atraso.
//  - Filtros rápidos: todas / as minhas / esquecidas / ações; setor; responsável.
//  - Vista "Funil" (colunas por etapa, arrastar muda a etapa, total € por
//    coluna) e vista "Lista" (tabela ordenada pela próxima ação).
//  - Ficha lateral (FichaLead) com negócio, próxima ação, contactos, notas e
//    histórico. Abre também por link: /dashboard/leads?lead=<id> (lembretes).
// Gravação: o ecrã muda logo e repõe se a BD recusar (onPatch).
// Contas e constantes em ./crm.js; estilos em styles/crm.css.
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import { toast, toastDesfazer } from "../../utils/toast";
import { confirmar } from "../../utils/dialogo";
import Janela from "../Janela";
import SelectModerno from "../SelectModerno";
import FichaLead from "./FichaLead";
import ResultadosCrm from "./ResultadosCrm";
import RegistoChamada from "./RegistoChamada";
import { Ic } from "./crmIcones";
import {
  ETAPAS, ETAPA, ABERTAS, DIAS_ESQUECIDA, hojeISO, estaAberta, estaEsquecida, estadoAcao, porTratar,
  diasParado, ponderado, euros, eurosCurtos, dataCurta, haQuanto, iniciais, avisarAtribuicao,
  garantirEntidade, PAPEIS_PROPOSTAS,
} from "./crm";
import "../../styles/crm.css";

const MOTIVOS_PERDA = ["Sem resposta", "Preço", "Escolheu a concorrência", "Sem orçamento", "Não é o momento", "Não se enquadra"];
const DIA = 86400000;

/** Cor estável por pessoa (avatar) */
const corPessoa = (id) => {
  const cores = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#dc2626", "#4f46e5"];
  const h = String(id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return cores[h % cores.length];
};

function Avatar({ perfil, mini }) {
  if (!perfil) return <span className={`crm-av is-vazio${mini ? " is-mini" : ""}`} title="Sem responsável"><Ic.User /></span>;
  return <span className={`crm-av${mini ? " is-mini" : ""}`} style={{ "--c": corPessoa(perfil.id) }} title={perfil.nome}>{iniciais(perfil.nome)}</span>;
}

/** Ordem dentro de cada coluna: ações em atraso/hoje primeiro, depois por data, depois por valor */
function ordenar(a, b) {
  const pa = a.proxima_acao_em || "9999", pb = b.proxima_acao_em || "9999";
  if (pa !== pb) return pa < pb ? -1 : 1;
  return (Number(b.valor) || 0) - (Number(a.valor) || 0);
}

/**
 * @param {object} props
 * @param {object[]} props.leads   já filtradas pela pesquisa/localidade/CAE/arquivo da página
 * @param {Function} props.setLeads setter da lista completa (GestaoLeads)
 * @param {string[]} props.setores
 * @param {(lead) => void} props.onEditar
 * @param {(lead) => void} props.onTornarCliente
 * @param {(lead) => void} props.onArquivar
 */
export default function CrmLeads({ leads, setLeads, setores, onEditar, onTornarCliente, onArquivar }) {
  const { user, userProfile } = useAuth() || {};
  const userId = user?.id;
  const navigate = useNavigate();
  const podePropostas = PAPEIS_PROPOSTAS.includes(String(userProfile?.role || userProfile?.tipo || "").toLowerCase());
  const [params, setParams] = useSearchParams();
  const [perfis, setPerfis] = useState([]);
  const [vista, setVista] = useState(() => { try { return localStorage.getItem("bz-crm-vista") || "funil"; } catch { return "funil"; } });
  const [rapido, setRapido] = useState("todas"); // todas | minhas | portratar | esquecidas | acoes
  const [setor, setSetor] = useState("");
  const [resp, setResp] = useState("");
  const [arrastar, setArrastar] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [perda, setPerda] = useState(null); // { lead, motivo }
  const fichaId = params.get("lead");
  const [agora] = useState(() => Date.now()); // referência para os "últimos 90 dias"

  useEffect(() => { try { localStorage.setItem("bz-crm-vista", vista); } catch { /* ignora */ } }, [vista]);

  // equipa (responsáveis possíveis)
  useEffect(() => {
    // toda a equipa ativa (o papel nem sempre está em "role": também há "tipo")
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome").then(({ data, error }) => {
      if (error) { console.error("Erro ao carregar a equipa:", error); return; }
      setPerfis((data || []).filter((p) => p.nome).sort((a, b) => a.nome.localeCompare(b.nome, "pt")));
    });
  }, []);
  const perfil = (id) => perfis.find((p) => p.id === id);

  const abrirFicha = (id) => setParams((p) => { const n = new URLSearchParams(p); n.set("lead", id); return n; });
  const fecharFicha = () => setParams((p) => { const n = new URLSearchParams(p); n.delete("lead"); return n; }, { replace: true });

  /** Muda campos de uma lead: ecrã primeiro, BD depois; repõe se falhar. */
  async function patch(lead, mudancas, { soEcra = false, silencioso = false } = {}) {
    const antes = lead;
    setLeads((l) => l.map((x) => (x.id === lead.id ? { ...x, ...mudancas } : x)));
    if (soEcra) return true;
    const { error } = await supabase.from("marketing_leads").update(mudancas).eq("id", lead.id);
    if (error) {
      setLeads((l) => l.map((x) => (x.id === lead.id ? antes : x)));
      const semColunas = /column .* does not exist|schema cache/i.test(error.message || "");
      toast(semColunas ? "Falta correr a migração 083 (CRM) no Supabase." : "Não foi possível gravar: " + error.message, { tipo: "erro" });
      return false;
    }
    if ("responsavel_id" in mudancas && mudancas.responsavel_id !== antes.responsavel_id) {
      avisarAtribuicao({ lead, responsavelId: mudancas.responsavel_id, autorId: userId, autorNome: userProfile?.nome });
      if (!silencioso) toast(mudancas.responsavel_id ? `Responsável: ${perfil(mudancas.responsavel_id)?.nome || "—"}` : "Sem responsável.");
    }
    return true;
  }

  /** Liga a lead a uma entidade (cria se preciso) e abre uma proposta nova com o cliente escolhido. */
  async function criarProposta(lead) {
    if (!lead.cliente_id) {
      const ok = await confirmar(`Criar proposta para "${lead.nome}"?`, {
        mensagem: lead.nif
          ? "Se já existir uma entidade com este NIF, a proposta fica ligada a ela; senão, a empresa é criada em Entidades."
          : "A empresa vai ser criada em Entidades (sem NIF; podes completar depois).",
        botao: "Continuar",
      });
      if (!ok) return;
    }
    try {
      const id = await garantirEntidade(lead);
      if (id !== lead.cliente_id) setLeads((l) => l.map((x) => (x.id === lead.id ? { ...x, cliente_id: id } : x)));
      navigate(`/dashboard/propostas/novo?cliente=${encodeURIComponent(id)}`);
    } catch (e) {
      const semColuna = /cliente_id|schema cache/i.test(e?.message || "");
      toast(semColuna ? "Falta correr a migração 085 (CRM) no Supabase." : "Não foi possível preparar a proposta: " + (e?.message || ""), { tipo: "erro" });
    }
  }

  /** Muda a etapa (Perdido pede motivo). Com "Desfazer". */
  function mudarEtapa(lead, estado) {
    if (!lead || lead.estado === estado || lead.ativo === false) return;
    if (estado === "perdido") { setPerda({ lead, motivo: "" }); return; }
    const anterior = { estado: lead.estado, estado_desde: lead.estado_desde };
    patch(lead, { estado }).then((ok) => {
      if (!ok) return;
      setLeads((l) => l.map((x) => (x.id === lead.id ? { ...x, estado_desde: new Date().toISOString() } : x)));
      toastDesfazer(
        estado === "convertido" ? `🎉 ${lead.nome} ganha! Na ficha podes torná-la cliente.` : `${lead.nome} → ${ETAPA[estado].label}`,
        { desfazer: () => patch({ ...lead, estado }, anterior) }
      );
    });
  }

  async function confirmarPerda(e) {
    e?.preventDefault();
    const { lead, motivo } = perda;
    setPerda(null);
    const ok = await patch(lead, { estado: "perdido", motivo_perda: motivo.trim() || null, proxima_acao_em: null });
    if (ok) toastDesfazer(`${lead.nome} → Perdido`, { desfazer: () => patch({ ...lead, estado: "perdido" }, { estado: lead.estado, motivo_perda: lead.motivo_perda ?? null, proxima_acao_em: lead.proxima_acao_em ?? null }) });
  }

  // ---------- filtros ----------
  const base = useMemo(() => leads.filter((l) =>
    (!setor || (setor === "__sem__" ? !l.setor : l.setor === setor)) &&
    (!resp || (resp === "__ninguem__" ? !l.responsavel_id : l.responsavel_id === resp))
  ), [leads, setor, resp]);

  const visiveis = useMemo(() => base.filter((l) => {
    if (rapido === "minhas") return l.responsavel_id === userId;
    if (rapido === "esquecidas") return estaEsquecida(l);
    if (rapido === "portratar") return porTratar(l);
    if (rapido === "acoes") return ["atrasada", "hoje"].includes(estadoAcao(l));
    return true;
  }), [base, rapido, userId]);

  // ---------- indicadores ----------
  const kpi = useMemo(() => {
    const abertas = base.filter(estaAberta);
    const mes = hojeISO().slice(0, 7);
    const ganhasMes = base.filter((l) => l.estado === "convertido" && String(l.estado_desde || "").slice(0, 7) === mes);
    const limite = agora - 90 * DIA;
    const fechadas90 = base.filter((l) => ["convertido", "perdido"].includes(l.estado) && l.estado_desde && new Date(l.estado_desde).getTime() >= limite);
    const ganhas90 = fechadas90.filter((l) => l.estado === "convertido").length;
    return {
      abertasN: abertas.length,
      abertasV: abertas.reduce((s, l) => s + (Number(l.valor) || 0), 0),
      ponderado: abertas.reduce((s, l) => s + ponderado(l), 0),
      ganhasMesN: ganhasMes.length,
      ganhasMesV: ganhasMes.reduce((s, l) => s + (Number(l.valor) || 0), 0),
      taxa: fechadas90.length ? Math.round((ganhas90 / fechadas90.length) * 100) : null,
      fechadas90: fechadas90.length,
      esquecidas: base.filter(estaEsquecida).length,
      porTratar: base.filter(porTratar).length,
      acoes: base.filter((l) => ["atrasada", "hoje"].includes(estadoAcao(l))).length,
      atrasadas: base.filter((l) => estadoAcao(l) === "atrasada").length,
      minhas: base.filter((l) => l.responsavel_id === userId && estaAberta(l)).length,
    };
  }, [base, userId, agora]);

  const leadFicha = fichaId ? leads.find((l) => String(l.id) === String(fichaId)) : null;

  // ---------- cartão ----------
  const cartao = (l) => {
    const acao = estadoAcao(l);
    const esquecida = estaEsquecida(l);
    const fechada = l.ativo === false;
    return (
      <article
        key={l.id}
        className={`crm-cartao${fechada ? " is-arquivada" : ""}${arrastar === l.id ? " is-a-arrastar" : ""}${esquecida ? " is-esquecida" : ""}`}
        draggable={!fechada}
        onDragStart={(e) => { setArrastar(l.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(l.id)); }}
        onDragEnd={() => { setArrastar(null); setSobre(null); }}
        onClick={() => abrirFicha(l.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirFicha(l.id); } }}
        tabIndex={0}
        role="button"
        aria-label={`${l.nome}, ${ETAPA[l.estado]?.label || ""}`}
      >
        <div className="crm-cartao-topo">
          <strong>{l.nome}</strong>
          <Avatar perfil={perfil(l.responsavel_id)} mini />
        </div>
        <div className="crm-cartao-meta">
          {Number(l.valor) > 0 && <span className="crm-valor">{euros(l.valor)}</span>}
          {l.setor && <span className="crm-chip">{l.setor}</span>}
          {!l.email && !l.contacto && <span className="crm-chip is-aviso">Sem contactos</span>}
        </div>
        {l.proxima_acao_em || l.proxima_acao ? (
          <div className={`crm-cartao-acao ${acao ? `is-${acao}` : ""}`}>
            <Ic.Target />
            <span>{l.proxima_acao || "Próximo passo"}</span>
            {l.proxima_acao_em && <em>{acao === "hoje" ? "hoje" : dataCurta(l.proxima_acao_em)}</em>}
          </div>
        ) : estaAberta(l) && !porTratar(l) ? (
          <div className="crm-cartao-acao is-falta"><Ic.Target /><span>Sem próximo passo</span></div>
        ) : null}
        {esquecida && <div className="crm-cartao-parada"><Ic.Clock /> Parada há {diasParado(l)} dias</div>}
      </article>
    );
  };

  const chipRapido = (id, children, n, tom) => (
    <button key={id} type="button" className={`crm-rapido${rapido === id ? " is-on" : ""}${tom ? ` is-${tom}` : ""}`} onClick={() => setRapido(rapido === id ? "todas" : id)} aria-pressed={rapido === id}>
      {children}{n != null && <b>{n}</b>}
    </button>
  );

  return (
    <div className="crm">
      {/* indicadores */}
      <div className="crm-kpis">
        <div className="crm-kpi">
          <span className="crm-kpi-ico"><Ic.Euro /></span>
          <div><small>Funil em aberto</small><strong>{euros(kpi.abertasV)}</strong><em>{kpi.abertasN} lead{kpi.abertasN === 1 ? "" : "s"}</em></div>
        </div>
        <div className="crm-kpi">
          <span className="crm-kpi-ico"><Ic.Trend /></span>
          <div><small>Previsão</small><strong>{euros(kpi.ponderado)}</strong><em>ponderada pela probabilidade</em></div>
        </div>
        <div className="crm-kpi is-ok">
          <span className="crm-kpi-ico"><Ic.Trophy /></span>
          <div><small>Ganhas este mês</small><strong>{euros(kpi.ganhasMesV)}</strong><em>{kpi.ganhasMesN} negócio{kpi.ganhasMesN === 1 ? "" : "s"}</em></div>
        </div>
        <div className="crm-kpi">
          <span className="crm-kpi-ico"><Ic.Target /></span>
          <div><small>Taxa de fecho</small><strong>{kpi.taxa == null ? "—" : `${kpi.taxa}%`}</strong><em>{kpi.fechadas90 ? `90 dias · ${kpi.fechadas90} fechadas` : "sem fechos em 90 dias"}</em></div>
        </div>
        <button type="button" className={`crm-kpi is-clicavel${kpi.acoes ? " is-quente" : ""}`} onClick={() => setRapido("acoes")}>
          <span className="crm-kpi-ico"><Ic.Bell /></span>
          <div><small>Ações para hoje</small><strong>{kpi.acoes}</strong><em>{kpi.atrasadas ? `${kpi.atrasadas} em atraso` : "nada em atraso"}</em></div>
        </button>
        <button type="button" className={`crm-kpi is-clicavel${kpi.esquecidas ? " is-aviso" : ""}`} onClick={() => setRapido("esquecidas")}>
          <span className="crm-kpi-ico"><Ic.Clock /></span>
          <div><small>Esquecidas</small><strong>{kpi.esquecidas}</strong><em>sem contacto há {DIAS_ESQUECIDA}+ dias</em></div>
        </button>
      </div>

      {/* barra de filtros */}
      <div className="crm-barra">
        <div className="crm-rapidos" role="group" aria-label="Filtros rápidos">
          {chipRapido("todas", "Todas")}
          {chipRapido("minhas", "As minhas", kpi.minhas)}
          {kpi.porTratar > 0 && chipRapido("portratar", "Por tratar", kpi.porTratar)}
          {chipRapido("acoes", "Ações hoje", kpi.acoes, "quente")}
          {chipRapido("esquecidas", "Esquecidas", kpi.esquecidas, "aviso")}
        </div>
        <div className="crm-barra-dir">
          <SelectModerno value={setor} onChange={(e) => setSetor(e.target.value)} className="crm-sel" aria-label="Setor">
            <option value="">Todos os setores</option>
            {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="__sem__">Sem setor</option>
          </SelectModerno>
          <SelectModerno value={resp} onChange={(e) => setResp(e.target.value)} className="crm-sel" aria-label="Responsável">
            <option value="">Toda a equipa</option>
            {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            <option value="__ninguem__">Sem responsável</option>
          </SelectModerno>
          <div className="crm-vistas" role="group" aria-label="Vista">
            <button type="button" className={vista === "funil" ? "is-on" : ""} onClick={() => setVista("funil")} aria-pressed={vista === "funil"} title="Funil"><Ic.Columns /> <span>Funil</span></button>
            <button type="button" className={vista === "lista" ? "is-on" : ""} onClick={() => setVista("lista")} aria-pressed={vista === "lista"} title="Lista"><Ic.List /> <span>Lista</span></button>
            <button type="button" className={vista === "resultados" ? "is-on" : ""} onClick={() => setVista("resultados")} aria-pressed={vista === "resultados"} title="Resultados"><Ic.Trend /> <span>Resultados</span></button>
          </div>
        </div>
      </div>

      {/* funil */}
      {vista === "funil" && (
        <div className="crm-funil">
          {ETAPAS.map((e) => {
            const itens = visiveis.filter((l) => l.estado === e.valor).sort(ordenar);
            const total = itens.reduce((s, l) => s + (Number(l.valor) || 0), 0);
            return (
              <section
                key={e.valor}
                className={`crm-coluna${sobre === e.valor ? " is-sobre" : ""}${ABERTAS.includes(e.valor) ? "" : " is-fechada"}`}
                style={{ "--c": e.cor }}
                onDragOver={(ev) => { if (arrastar != null) { ev.preventDefault(); if (sobre !== e.valor) setSobre(e.valor); } }}
                onDragLeave={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget)) setSobre(null); }}
                onDrop={(ev) => {
                  ev.preventDefault();
                  const l = leads.find((x) => x.id === arrastar);
                  setArrastar(null); setSobre(null);
                  mudarEtapa(l, e.valor);
                }}
                aria-label={e.label}
              >
                <header className="crm-coluna-cab">
                  <i />
                  <h4>{e.label}</h4>
                  <span className="crm-coluna-n">{itens.length}</span>
                  {total > 0 && <span className="crm-coluna-total">{eurosCurtos(total)}</span>}
                </header>
                <div className="crm-coluna-lista">
                  {itens.map(cartao)}
                  {itens.length === 0 && <div className="crm-coluna-vazia">{arrastar != null ? "Larga aqui" : "Nada nesta etapa"}</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* lista */}
      {vista === "lista" && (
        <div className="bz-tabela-wrap crm-lista">
          <table className="bz-tabela">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Etapa</th>
                <th className="is-num">Valor</th>
                <th>Responsável</th>
                <th>Origem</th>
                <th>Próxima ação</th>
                <th>Último movimento</th>
              </tr>
            </thead>
            <tbody>
              {[...visiveis].sort((a, b) => {
                const ab = estaAberta(a) ? 0 : 1, bb = estaAberta(b) ? 0 : 1;
                return ab !== bb ? ab - bb : ordenar(a, b);
              }).map((l) => {
                const acao = estadoAcao(l);
                const r = perfil(l.responsavel_id);
                return (
                  <tr key={l.id} className={`crm-linha${l.ativo === false ? " is-arquivada" : ""}`} onClick={() => abrirFicha(l.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") abrirFicha(l.id); }}>
                    <td><b>{l.nome}</b>{l.setor && <span className="crm-sub">{l.setor}{l.localidade ? ` · ${l.localidade}` : ""}</span>}</td>
                    <td><span className="crm-etapa-tag" style={{ "--c": ETAPA[l.estado]?.cor }}>{ETAPA[l.estado]?.label || l.estado}</span></td>
                    <td className="is-num">{Number(l.valor) > 0 ? euros(l.valor) : <span className="crm-sub">—</span>}</td>
                    <td>{r ? <span className="crm-pessoa"><Avatar perfil={r} mini /> {r.nome.split(" ")[0]}</span> : <span className="crm-sub">—</span>}</td>
                    <td>{l.origem || <span className="crm-sub">—</span>}</td>
                    <td>
                      {l.proxima_acao_em || l.proxima_acao ? (
                        <span className={`crm-acao-cel ${acao ? `is-${acao}` : ""}`}>{l.proxima_acao_em && <em>{acao === "hoje" ? "Hoje" : dataCurta(l.proxima_acao_em)}</em>} {l.proxima_acao}</span>
                      ) : <span className="crm-sub">{porTratar(l) ? "Por tratar" : estaAberta(l) ? "Sem próximo passo" : "—"}</span>}
                    </td>
                    <td><span className={estaEsquecida(l) ? "crm-parada-txt" : "crm-sub"}>{haQuanto(new Date(Math.max(...[l.ultimo_contacto_em, l.estado_desde, l.created_at].filter(Boolean).map((d) => new Date(d).getTime()))).toISOString())}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visiveis.length === 0 && <div className="crm-lista-vazia">Nenhuma lead com estes filtros.</div>}
        </div>
      )}

      {vista === "resultados" && <ResultadosCrm leads={base} perfis={perfis} agora={agora} />}

      <RegistoChamada leads={leads} userId={userId} onPatch={patch} onMudarEtapa={mudarEtapa} />

      {leadFicha && (
        <FichaLead
          key={leadFicha.id}
          lead={leadFicha}
          perfis={perfis}
          userId={userId}
          onPatch={(m, o) => patch(leadFicha, m, o)}
          onMudarEtapa={(estado) => mudarEtapa(leadFicha, estado)}
          onEditar={() => onEditar(leadFicha)}
          onTornarCliente={() => onTornarCliente(leadFicha)}
          onArquivar={() => onArquivar(leadFicha)}
          podePropostas={podePropostas}
          onCriarProposta={() => criarProposta(leadFicha)}
          onClose={fecharFicha}
        />
      )}

      <Janela
        aberta={!!perda}
        aoFechar={() => setPerda(null)}
        titulo="Marcar como perdida"
        subtitulo={perda?.lead?.nome}
        tom="danger"
        icone={<Ic.X />}
        largura={480}
        camada="calc(var(--z-modal) + 40)"
        rodape={<>
          <button type="button" onClick={() => setPerda(null)}>Cancelar</button>
          <button type="submit" form="crm-perda" className="is-danger">Marcar perdida</button>
        </>}
      >
        <form id="crm-perda" onSubmit={confirmarPerda}>
          <label className="bz-rotulo" htmlFor="crm-motivo">Porque se perdeu? <span className="crm-sub">(ajuda a perceber o que corrigir)</span></label>
          <div className="crm-atalhos is-motivos">
            {MOTIVOS_PERDA.map((m) => (
              <button key={m} type="button" className={perda?.motivo === m ? "is-on" : ""} onClick={() => setPerda((p) => ({ ...p, motivo: m }))}>{m}</button>
            ))}
          </div>
          <textarea id="crm-motivo" className="bz-campo" rows={2} value={perda?.motivo || ""} onChange={(e) => setPerda((p) => ({ ...p, motivo: e.target.value }))} placeholder="Ou escreve o motivo…" />
        </form>
      </Janela>
    </div>
  );
}
