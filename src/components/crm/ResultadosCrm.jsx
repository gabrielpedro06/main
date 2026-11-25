// =====================================================================
// CRM das Leads · vista "Resultados" (CrmLeads.jsx).
// Com as leads já filtradas por setor/responsável e por um período (data de
// criação da lead): resultados por origem, funil atual, por pessoa e
// motivos de perda. Taxa de fecho = ganhas ÷ (ganhas + perdidas).
// Estilos .crm-res* em styles/crm.css.
// =====================================================================
import { useMemo, useState } from "react";
import { ETAPAS, ABERTAS, SEM_ORIGEM, euros, eurosCurtos } from "./crm";

const DIA = 86400000;
const PERIODOS = [
  { id: "tudo", label: "Tudo" },
  { id: "ano", label: "Este ano" },
  { id: "90", label: "90 dias" },
  { id: "mes", label: "Este mês" },
];

/** Agrupa leads por uma chave e devolve as contas de cada grupo, ordenadas por nº de leads */
function agrupar(leads, chave) {
  const g = new Map();
  for (const l of leads) {
    const k = chave(l);
    if (!g.has(k)) g.set(k, { chave: k, n: 0, abertas: 0, ganhas: 0, perdidas: 0, valorGanho: 0, valorAberto: 0 });
    const x = g.get(k);
    x.n += 1;
    const v = Number(l.valor) || 0;
    if (l.estado === "convertido") { x.ganhas += 1; x.valorGanho += v; }
    else if (l.estado === "perdido") x.perdidas += 1;
    else if (ABERTAS.includes(l.estado) && l.ativo !== false) { x.abertas += 1; x.valorAberto += v; }
  }
  return [...g.values()].sort((a, b) => b.n - a.n || b.valorGanho - a.valorGanho);
}

const taxa = (x) => (x.ganhas + x.perdidas ? Math.round((x.ganhas / (x.ganhas + x.perdidas)) * 100) : null);

function Tabela({ titulo, linhas, nomeDe, vazio }) {
  const max = Math.max(1, ...linhas.map((x) => x.n));
  return (
    <section className="crm-res-bloco">
      <h3>{titulo}</h3>
      {linhas.length === 0 ? <p className="crm-dica">{vazio}</p> : (
        <div className="bz-tabela-wrap">
          <table className="bz-tabela crm-res-tabela">
            <thead>
              <tr>
                <th />
                <th className="is-num">Leads</th>
                <th className="is-num">Em aberto</th>
                <th className="is-num">Ganhas</th>
                <th className="is-num">Perdidas</th>
                <th>Taxa de fecho</th>
                <th className="is-num">Valor ganho</th>
                <th className="is-num">Em aberto (€)</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((x) => {
                const t = taxa(x);
                return (
                  <tr key={x.chave}>
                    <td>
                      <b className="crm-res-nome">{nomeDe(x.chave)}</b>
                      <span className="crm-res-barra" style={{ "--p": `${(x.n / max) * 100}%` }} aria-hidden="true" />
                    </td>
                    <td className="is-num"><b>{x.n}</b></td>
                    <td className="is-num">{x.abertas || "—"}</td>
                    <td className="is-num">{x.ganhas || "—"}</td>
                    <td className="is-num">{x.perdidas || "—"}</td>
                    <td>
                      {t == null ? <span className="crm-sub">—</span> : (
                        <span className="crm-res-taxa" style={{ "--p": `${t}%` }}><i /> <b>{t}%</b></span>
                      )}
                    </td>
                    <td className="is-num">{x.valorGanho ? euros(x.valorGanho) : "—"}</td>
                    <td className="is-num">{x.valorAberto ? euros(x.valorAberto) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * @param {object} props
 * @param {object[]} props.leads  já filtradas por setor/responsável
 * @param {object[]} props.perfis
 * @param {number} props.agora    Date.now() fixo (referência dos períodos)
 */
export default function ResultadosCrm({ leads, perfis, agora }) {
  const [periodo, setPeriodo] = useState("tudo");

  const doPeriodo = useMemo(() => {
    if (periodo === "tudo") return leads;
    const d = new Date(agora);
    const desde = periodo === "ano" ? new Date(d.getFullYear(), 0, 1).getTime()
      : periodo === "mes" ? new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      : agora - 90 * DIA;
    return leads.filter((l) => l.created_at && new Date(l.created_at).getTime() >= desde);
  }, [leads, periodo, agora]);

  const porOrigem = useMemo(() => agrupar(doPeriodo, (l) => l.origem || SEM_ORIGEM), [doPeriodo]);
  const porPessoa = useMemo(() => agrupar(doPeriodo, (l) => l.responsavel_id || ""), [doPeriodo]);
  const total = useMemo(() => agrupar(doPeriodo, () => "total")[0], [doPeriodo]);

  const funil = useMemo(() => ETAPAS.map((e) => {
    const ls = doPeriodo.filter((l) => l.estado === e.valor);
    return { ...e, n: ls.length, valor: ls.reduce((s, l) => s + (Number(l.valor) || 0), 0) };
  }), [doPeriodo]);
  const maxFunil = Math.max(1, ...funil.map((f) => f.n));

  const motivos = useMemo(() => {
    const m = new Map();
    doPeriodo.filter((l) => l.estado === "perdido").forEach((l) => {
      const k = (l.motivo_perda || "Sem motivo indicado").trim();
      m.set(k, (m.get(k) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [doPeriodo]);
  const maxMotivo = Math.max(1, ...motivos.map((m) => m[1]));

  const nomePessoa = (id) => (id ? perfis.find((p) => p.id === id)?.nome || "Outra pessoa" : "Sem responsável");
  const melhorOrigem = porOrigem.filter((x) => x.chave !== SEM_ORIGEM && x.ganhas > 0).sort((a, b) => b.valorGanho - a.valorGanho || b.ganhas - a.ganhas)[0];
  const taxaTotal = total ? taxa(total) : null;

  return (
    <div className="crm-res">
      <div className="crm-res-topo">
        <div className="crm-vistas" role="radiogroup" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={periodo === p.id} className={periodo === p.id ? "is-on" : ""} onClick={() => setPeriodo(p.id)}>{p.label}</button>
          ))}
        </div>
        <p className="crm-dica">
          {doPeriodo.length} lead{doPeriodo.length === 1 ? "" : "s"} criadas {periodo === "tudo" ? "desde sempre" : "no período"}
          {taxaTotal != null && <> · taxa de fecho <b>{taxaTotal}%</b></>}
          {melhorOrigem && <> · melhor origem: <b>{melhorOrigem.chave}</b> ({euros(melhorOrigem.valorGanho)} ganhos)</>}
        </p>
      </div>

      <Tabela titulo="Por origem" linhas={porOrigem} nomeDe={(k) => k} vazio="Sem leads neste período." />

      <div className="crm-res-duplo">
        <section className="crm-res-bloco">
          <h3>Funil agora</h3>
          <ul className="crm-res-funil">
            {funil.map((f) => (
              <li key={f.valor} style={{ "--c": f.cor, "--p": `${(f.n / maxFunil) * 100}%` }}>
                <span className="crm-res-funil-nome"><i />{f.label}</span>
                <span className="crm-res-funil-barra"><span /></span>
                <b>{f.n}</b>
                <em>{f.valor ? eurosCurtos(f.valor) : ""}</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="crm-res-bloco">
          <h3>Motivos de perda</h3>
          {motivos.length === 0 ? <p className="crm-dica">Nenhuma lead perdida neste período.</p> : (
            <ul className="crm-res-funil is-motivos">
              {motivos.map(([m, n]) => (
                <li key={m} style={{ "--c": "#ef4444", "--p": `${(n / maxMotivo) * 100}%` }}>
                  <span className="crm-res-funil-nome">{m}</span>
                  <span className="crm-res-funil-barra"><span /></span>
                  <b>{n}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Tabela titulo="Por pessoa" linhas={porPessoa} nomeDe={nomePessoa} vazio="Sem leads neste período." />
    </div>
  );
}
