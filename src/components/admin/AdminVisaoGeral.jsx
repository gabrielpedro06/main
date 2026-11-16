import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { nomeTabela, VERBO, EVENTOS, rotuloRegisto } from "../../utils/auditoria";

// ---------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyLocal = (iso) => (iso ? keyOf(new Date(iso)) : "");
const hoje = () => keyOf(new Date());
const fmtH = (min) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h${m ? ` ${pad(m)}` : ""}` : `${m}m`;
};
const iniciais = (nome) => {
  const p = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};
const relativo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora mesmo";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "ontem" : `há ${d} dias`;
};
const ABERTO = (estado) => !["concluido", "concluida", "cancelado", "cancelada", "encerrado"].includes(String(estado || "").toLowerCase());

const ESTADOS_PROJETO = [
  { id: "pendente", label: "Pendente" },
  { id: "em_curso", label: "Em curso" },
  { id: "em_analise", label: "Em análise" },
  { id: "concluido", label: "Concluído" },
  { id: "encerrado", label: "Encerrado" },
  { id: "cancelado", label: "Cancelado" },
];

// Ícones (traço, 24x24)
const Svg = ({ children, size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const I = {
  Users: () => <Svg><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></Svg>,
  Pulse: () => <Svg><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>,
  Clock: () => <Svg><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Svg>,
  Folder: () => <Svg><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></Svg>,
  Alert: () => <Svg><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></Svg>,
  Inbox: () => <Svg><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" /></Svg>,
  Up: () => <Svg size={13}><path d="M7 17L17 7M8 7h9v9" /></Svg>,
  Down: () => <Svg size={13}><path d="M7 7l10 10M17 8v9H8" /></Svg>,
  Arrow: () => <Svg size={14}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  Cake: () => <Svg size={16}><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20M7 8v3M12 8v3M17 8v3" /></Svg>,
  Brief: () => <Svg size={16}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></Svg>,
  Doc: () => <Svg size={16}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></Svg>,
  Target: () => <Svg size={16}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>,
  Shield: () => <Svg size={16}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>,
  List: () => <Svg size={16}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>,
  Chart: () => <Svg size={16}><path d="M18 20V10M12 20V4M6 20v-6" /></Svg>,
  Megaphone: () => <Svg size={16}><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></Svg>,
};

// ---------------------------------------------------------------------
// Gráfico: horas registadas por dia (uma série, cor do tema, tooltip)
// ---------------------------------------------------------------------
function HorasPorDia({ dias }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(60, ...dias.map((d) => d.min));
  // eixo: arredonda para cima a horas "redondas"
  const topoH = Math.ceil(max / 60 / 4) * 4 || 4;
  const topo = topoH * 60;
  const ticks = [0, topoH / 2, topoH];
  return (
    <div className="adm-bars-wrap">
      <div className="adm-bars-axis" aria-hidden="true">
        {ticks.slice().reverse().map((t) => <span key={t}>{t}h</span>)}
      </div>
      <div className="adm-bars" role="img" aria-label={`Horas registadas por dia: ${dias.map((d) => `${d.label} ${fmtH(d.min)}`).join(", ")}`}>
        {ticks.map((t) => <i key={t} className="adm-bars-grid" style={{ bottom: `${(t / topoH) * 100}%` }} />)}
        {dias.map((d, i) => {
          const pct = Math.max(d.min ? 2 : 0, (d.min / topo) * 100);
          return (
          <button
            key={d.key}
            type="button"
            className={`adm-bar ${d.fimDeSemana ? "is-weekend" : ""} ${hover === i ? "is-hover" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${d.longo}: ${fmtH(d.min)}`}
          >
            <span className="adm-bar-fill" style={{ height: `${pct}%` }} />
            {hover === i && (
              <span className="adm-tip" role="tooltip" style={{ bottom: `calc(${pct}% + 8px)` }}>
                <strong>{fmtH(d.min)}</strong>
                <small>{d.longo}</small>
                {d.pessoas > 0 && <small>{d.pessoas} pessoa(s)</small>}
              </span>
            )}
          </button>
          );
        })}
      </div>
      <div className="adm-bars-labels" aria-hidden="true">
        {dias.map((d, i) => <span key={d.key} className={i === dias.length - 1 ? "is-today" : ""}>{d.label}</span>)}
      </div>
    </div>
  );
}

// Barras horizontais com valor (uma série)
function Medidor({ itens, formato = (v) => v, vazio }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  if (!itens.length) return <p className="adm-empty">{vazio}</p>;
  return (
    <ul className="adm-meter">
      {itens.map((it) => (
        <li key={it.id || it.label} title={`${it.label}: ${formato(it.valor)}`}>
          <span className="adm-meter-label">{it.label}</span>
          <span className="adm-meter-track"><span style={{ width: `${(it.valor / max) * 100}%` }} /></span>
          <strong>{formato(it.valor)}</strong>
        </li>
      ))}
    </ul>
  );
}

/**
 * Visão geral da empresa no painel de administração.
 */
export default function AdminVisaoGeral({ profiles, projects, activities, tasks, taskLogs, onlineUsers, minutesOf, projectOfLog, activeLabelFor, irPara }) {
  const [extra, setExtra] = useState({ ferias: null, propostas: null, leads: null, atividade: null });

  // Dados que o painel ainda não tinha: pedidos, comercial e atividade recente
  useEffect(() => {
    let vivo = true;
    const desde90 = new Date(Date.now() - 90 * 86400000).toISOString();
    Promise.all([
      supabase.from("ferias").select("id, estado").in("estado", ["pendente", "pedido_cancelamento"]),
      supabase.from("propostas_comerciais").select("id, estado, created_at").gte("created_at", desde90),
      supabase.from("marketing_leads").select("id, estado, ativo, created_at").eq("ativo", true),
      supabase.from("audit_log").select("id, created_at, user_id, user_email, tabela, operacao, acao, registo_id, dados_antes, dados_depois").order("created_at", { ascending: false }).limit(8),
    ]).then(([f, p, l, a]) => {
      if (!vivo) return;
      setExtra({
        ferias: f.error ? null : f.data || [],
        propostas: p.error ? null : p.data || [],
        leads: l.error ? null : l.data || [],
        atividade: a.error ? null : a.data || [],
      });
    });
    return () => { vivo = false; };
  }, []);

  const porId = useMemo(() => new Map(profiles.map((p) => [String(p.id), p])), [profiles]);
  const ativos = profiles.filter((p) => p.ativo !== false);
  const inativos = profiles.length - ativos.length;

  // Horas por dia nos últimos 14 dias + semana atual vs. mesma altura da semana passada
  const horas = useMemo(() => {
    const porDia = new Map();
    const pessoasDia = new Map();
    taskLogs.forEach((l) => {
      const k = keyLocal(l.end_time || l.start_time);
      if (!k) return;
      porDia.set(k, (porDia.get(k) || 0) + minutesOf(l));
      if (!pessoasDia.has(k)) pessoasDia.set(k, new Set());
      pessoasDia.get(k).add(String(l.user_id));
    });
    const dias = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const k = keyOf(d);
      dias.push({
        key: k,
        min: porDia.get(k) || 0,
        pessoas: pessoasDia.get(k)?.size || 0,
        label: i === 0 ? "Hoje" : d.toLocaleDateString("pt-PT", { day: "numeric" }),
        longo: d.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }),
        fimDeSemana: d.getDay() === 0 || d.getDay() === 6,
      });
    }
    // semana: de segunda até hoje, e o mesmo número de dias na semana passada
    const agora = new Date();
    const diaSemana = (agora.getDay() + 6) % 7; // 0 = segunda
    let semana = 0;
    let anterior = 0;
    for (let i = 0; i <= diaSemana; i += 1) {
      const d = new Date(agora); d.setDate(agora.getDate() - diaSemana + i);
      const p = new Date(d); p.setDate(d.getDate() - 7);
      semana += porDia.get(keyOf(d)) || 0;
      anterior += porDia.get(keyOf(p)) || 0;
    }
    const total14 = dias.reduce((s, d) => s + d.min, 0);
    const uteis = dias.filter((d) => !d.fimDeSemana).length || 1;
    return { dias, semana, anterior, total14, mediaUtil: total14 / uteis };
  }, [taskLogs, minutesOf]);

  const variacao = horas.anterior > 0 ? Math.round(((horas.semana - horas.anterior) / horas.anterior) * 100) : null;

  // Projetos por estado
  const projetosEstado = useMemo(() => {
    const conta = new Map();
    projects.forEach((p) => {
      const e = String(p.estado || "pendente").toLowerCase();
      conta.set(e, (conta.get(e) || 0) + 1);
    });
    return ESTADOS_PROJETO.map((e) => ({ id: e.id, label: e.label, valor: conta.get(e.id) || 0 })).filter((e) => e.valor > 0);
  }, [projects]);
  const emCurso = projects.filter((p) => ["em_curso", "em_analise"].includes(String(p.estado || "").toLowerCase())).length;

  // Tarefas em atraso (prazo passado e ainda abertas)
  const atrasadas = useMemo(() => {
    const h = hoje();
    const atividadePorId = new Map(activities.map((a) => [String(a.id), a]));
    const projetoPorId = new Map(projects.map((p) => [String(p.id), p]));
    return tasks
      .filter((t) => t.data_limite && String(t.data_limite).slice(0, 10) < h && ABERTO(t.estado))
      .map((t) => {
        const proj = projetoPorId.get(String(atividadePorId.get(String(t.atividade_id))?.projeto_id));
        const dias = Math.round((new Date(`${h}T00:00:00`) - new Date(`${String(t.data_limite).slice(0, 10)}T00:00:00`)) / 86400000);
        return { ...t, projeto: proj?.titulo, dias, responsavel: porId.get(String(t.responsavel_id))?.nome };
      })
      .sort((a, b) => b.dias - a.dias);
  }, [tasks, activities, projects, porId]);

  // Projetos com mais horas este mês
  const topProjetos = useMemo(() => {
    const mes = hoje().slice(0, 7);
    const projetoPorId = new Map(projects.map((p) => [String(p.id), p]));
    const soma = new Map();
    taskLogs.forEach((l) => {
      if (keyLocal(l.end_time || l.start_time).slice(0, 7) !== mes) return;
      const pid = projectOfLog(l);
      const titulo = projetoPorId.get(String(pid))?.titulo;
      if (!titulo) return;
      soma.set(titulo, (soma.get(titulo) || 0) + minutesOf(l));
    });
    return [...soma.entries()].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor).slice(0, 6);
  }, [taskLogs, projects, projectOfLog, minutesOf]);

  // Aniversários nos próximos 30 dias
  const aniversarios = useMemo(() => {
    const agora = new Date(); agora.setHours(0, 0, 0, 0);
    return ativos
      .filter((p) => p.data_nascimento)
      .map((p) => {
        const n = new Date(`${p.data_nascimento}T00:00:00`);
        let prox = new Date(agora.getFullYear(), n.getMonth(), n.getDate());
        if (prox < agora) prox = new Date(agora.getFullYear() + 1, n.getMonth(), n.getDate());
        return { ...p, prox, dias: Math.round((prox - agora) / 86400000) };
      })
      .filter((p) => p.dias <= 30)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 5);
  }, [ativos]);

  const pedidos = extra.ferias?.length ?? null;
  const propostasAnalise = extra.propostas?.filter((p) => p.estado === "em_analise").length ?? null;
  const propostasAprovadas = extra.propostas?.filter((p) => p.estado === "aprovada").length ?? null;

  const kpis = [
    { id: "pessoas", icon: <I.Users />, label: "Colaboradores ativos", valor: ativos.length, nota: inativos ? `${inativos} inativo(s)` : "toda a equipa ativa" },
    { id: "online", icon: <I.Pulse />, label: "Online agora", valor: onlineUsers.length, nota: ativos.length ? `${Math.round((onlineUsers.length / ativos.length) * 100)}% da equipa` : "", vivo: onlineUsers.length > 0 },
    {
      id: "horas", icon: <I.Clock />, label: "Horas esta semana", valor: fmtH(horas.semana),
      nota: variacao === null ? "sem dados da semana passada" : `${variacao >= 0 ? "+" : ""}${variacao}% vs. semana passada`,
      tendencia: variacao === null ? null : variacao >= 0 ? "up" : "down",
    },
    { id: "projetos", icon: <I.Folder />, label: "Projetos em curso", valor: emCurso, nota: `${projects.length} no total` },
    { id: "atraso", icon: <I.Alert />, label: "Tarefas em atraso", valor: atrasadas.length, nota: atrasadas.length ? "prazo ultrapassado" : "tudo dentro do prazo", alerta: atrasadas.length > 0 },
    { id: "pedidos", icon: <I.Inbox />, label: "Pedidos por aprovar", valor: pedidos ?? "—", nota: "férias e ausências", alerta: pedidos > 0, link: "/dashboard/rh" },
  ];

  const atalhos = [
    { to: "/dashboard/rh", icon: <I.Brief />, label: "Recursos Humanos" },
    { to: "/dashboard/projetos", icon: <I.Folder />, label: "Projetos" },
    { to: "/dashboard/propostas", icon: <I.Doc />, label: "Propostas" },
    { to: "/dashboard/leads", icon: <I.Target />, label: "Leads" },
    { to: "/dashboard/marketing", icon: <I.Megaphone />, label: "Marketing" },
    { to: "/dashboard/registos", icon: <I.List />, label: "Registos" },
  ];

  return (
    <div className="adm-overview bz-tab-panel">
      {/* KPIs */}
      <section className="adm-kpis" aria-label="Indicadores principais">
        {kpis.map((k, i) => {
          const corpo = (
            <>
              <span className="adm-kpi-ico">{k.icon}</span>
              <span className="adm-kpi-label">{k.label}</span>
              <strong className="adm-kpi-value">
                {k.vivo && <i className="adm-live" aria-hidden="true" />}
                {k.valor}
              </strong>
              <span className={`adm-kpi-note ${k.tendencia ? `is-${k.tendencia}` : ""}`}>
                {k.tendencia === "up" && <I.Up />}{k.tendencia === "down" && <I.Down />}{k.nota}
              </span>
            </>
          );
          const cls = `adm-kpi ${k.alerta ? "is-alert" : ""}`;
          return k.link
            ? <Link key={k.id} to={k.link} className={cls} style={{ animationDelay: `${i * 0.04}s` }}>{corpo}</Link>
            : <div key={k.id} className={cls} style={{ animationDelay: `${i * 0.04}s` }}>{corpo}</div>;
        })}
      </section>

      <div className="adm-grid">
        {/* Horas por dia */}
        <section className="adm-card is-wide">
          <header className="adm-card-head">
            <div>
              <h3>Horas registadas</h3>
              <p>Últimos 14 dias · média de {fmtH(horas.mediaUtil)} por dia útil</p>
            </div>
            <strong className="adm-card-big">{fmtH(horas.total14)}</strong>
          </header>
          <HorasPorDia dias={horas.dias} />
          <button type="button" className="adm-link" onClick={() => irPara("analytics")}>Ver tempo por projeto e pessoa <I.Arrow /></button>
        </section>

        {/* Online agora */}
        <section className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3>Online agora</h3>
              <p>{onlineUsers.length ? `${onlineUsers.length} pessoa(s) com o ponto aberto` : "Ninguém com o ponto aberto"}</p>
            </div>
          </header>
          {onlineUsers.length ? (
            <ul className="adm-people">
              {onlineUsers.slice(0, 7).map((u) => (
                <li key={u.id}>
                  <span className="adm-av">{u.avatar_url ? <img src={u.avatar_url} alt="" /> : iniciais(u.nome)}<i /></span>
                  <span className="adm-people-text">
                    <strong>{u.nome}</strong>
                    <small>{activeLabelFor(u.id) || `Entrou às ${u.hora_entrada}`}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="adm-empty">Fora de horas ou ainda ninguém entrou hoje.</p>}
          <button type="button" className="adm-link" onClick={() => irPara("equipa")}>Equipa e assiduidade <I.Arrow /></button>
        </section>

        {/* Projetos por estado */}
        <section className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3>Projetos por estado</h3>
              <p>{projects.length} projeto(s)</p>
            </div>
          </header>
          <Medidor itens={projetosEstado} vazio="Ainda não há projetos." />
          <Link to="/dashboard/projetos" className="adm-link">Abrir projetos <I.Arrow /></Link>
        </section>

        {/* Mais horas este mês */}
        <section className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3>Onde vai o tempo</h3>
              <p>Projetos com mais horas este mês</p>
            </div>
          </header>
          <Medidor itens={topProjetos} formato={fmtH} vazio="Sem horas registadas este mês." />
        </section>

        {/* Tarefas em atraso */}
        <section className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3>Tarefas em atraso</h3>
              <p>{atrasadas.length ? `${atrasadas.length} com o prazo ultrapassado` : "Nenhuma tarefa atrasada"}</p>
            </div>
          </header>
          {atrasadas.length ? (
            <ul className="adm-list">
              {atrasadas.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <span className="adm-list-main">
                    <strong>{t.titulo}</strong>
                    <small>{[t.projeto, t.responsavel].filter(Boolean).join(" · ") || "Sem projeto"}</small>
                  </span>
                  <span className="adm-badge is-late">{t.dias} dia{t.dias === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          ) : <p className="adm-empty is-good">Tudo dentro do prazo. 👏</p>}
          <Link to="/dashboard/tarefas" className="adm-link">Ver tarefas <I.Arrow /></Link>
        </section>

        {/* Comercial */}
        <section className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3>Comercial</h3>
              <p>Últimos 90 dias</p>
            </div>
          </header>
          <div className="adm-stats">
            <Link to="/dashboard/propostas"><strong>{propostasAnalise ?? "—"}</strong><span>propostas em análise</span></Link>
            <Link to="/dashboard/propostas"><strong>{propostasAprovadas ?? "—"}</strong><span>propostas aprovadas</span></Link>
            <Link to="/dashboard/leads"><strong>{extra.leads?.length ?? "—"}</strong><span>leads ativas</span></Link>
          </div>
        </section>

        {/* Atividade recente */}
        <section className="adm-card is-tall">
          <header className="adm-card-head">
            <div>
              <h3>Atividade recente</h3>
              <p>O que mudou no Bizin</p>
            </div>
          </header>
          {extra.atividade === null ? <p className="adm-empty">A carregar…</p> : extra.atividade.length ? (
            <ol className="adm-feed">
              {extra.atividade.map((r) => {
                const quem = porId.get(String(r.user_id));
                const nome = quem?.nome || r.user_email || "Sistema";
                const oQue = r.operacao === "EVENTO"
                  ? (EVENTOS[r.acao] || r.acao)
                  : `${VERBO[r.operacao] || r.operacao} ${nomeTabela(r.tabela).toLowerCase()}`;
                const rotulo = r.operacao !== "EVENTO" ? rotuloRegisto(r) : null;
                return (
                  <li key={r.id}>
                    <span className="adm-av is-sm">{quem?.avatar_url ? <img src={quem.avatar_url} alt="" /> : iniciais(nome)}</span>
                    <span className="adm-feed-text">
                      <span><b>{nome.split(" ")[0]}</b> {oQue}{rotulo ? <> · <em>{String(rotulo).slice(0, 60)}</em></> : null}</span>
                      <small>{relativo(r.created_at)}</small>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : <p className="adm-empty">Sem atividade registada.</p>}
          <Link to="/dashboard/registos" className="adm-link">Todos os registos <I.Arrow /></Link>
        </section>

        {/* Aniversários */}
        <section className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3>Aniversários</h3>
              <p>Próximos 30 dias</p>
            </div>
          </header>
          {aniversarios.length ? (
            <ul className="adm-people">
              {aniversarios.map((p) => (
                <li key={p.id}>
                  <span className="adm-av is-warm">{p.avatar_url ? <img src={p.avatar_url} alt="" /> : <I.Cake />}</span>
                  <span className="adm-people-text">
                    <strong>{p.nome}</strong>
                    <small>{p.dias === 0 ? "Hoje! 🎉" : p.dias === 1 ? "Amanhã" : p.prox.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="adm-empty">Nenhum aniversário nos próximos 30 dias.</p>}
        </section>

        {/* Atalhos */}
        <section className="adm-card">
          <header className="adm-card-head">
            <div>
              <h3>Atalhos</h3>
              <p>Ir direto a</p>
            </div>
          </header>
          <div className="adm-shortcuts">
            {atalhos.map((a) => <Link key={a.to} to={a.to}><span>{a.icon}</span>{a.label}</Link>)}
            <button type="button" onClick={() => irPara("seguranca")}><span><I.Shield /></span>Segurança</button>
            <button type="button" onClick={() => irPara("gestao")}><span><I.Chart /></span>Gestão individual</button>
          </div>
        </section>
      </div>
    </div>
  );
}
