import { useMemo, useState } from "react";
import { I } from "./mkIcons";
import { estadoInfo, canalInfo, ETAPAS_ANTES_AGENDAR } from "../../constants/marketing";
import { diaKey, hojeKey, fmtHora, diasAte } from "./mkUtils";

// Os três tipos de data de um conteúdo, cada um com aspeto próprio no calendário
const TIPOS_DATA = [
  { campo: "data_entrega", classe: "is-entrega", tag: "Entrega", nome: "Entrega", dica: "copy + design prontos" },
  { campo: "data_publicacao", classe: "is-pub1", tag: "1.ª", nome: "1.ª publicação", dica: "publicação principal" },
  { campo: "data_publicacao_2", classe: "is-pub2", tag: "2.ª", nome: "2.ª publicação", dica: "repost, lembrete…" },
];
const TIPO = Object.fromEntries(TIPOS_DATA.map((t) => [t.campo, t]));
// A entrega é só um dia ("AAAA-MM-DD"); as publicações têm hora
const chaveDe = (campo, valor) => (campo === "data_entrega" ? String(valor).slice(0, 10) : diaKey(new Date(valor)));

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Junta a hora original a um novo dia */
function moverParaDia(iso, key) {
  const [y, m, d] = key.split("-").map(Number);
  const base = iso ? new Date(iso) : null;
  const nova = new Date(y, m - 1, d, base ? base.getHours() : 10, base ? base.getMinutes() : 0);
  return nova.toISOString();
}

export default function CalendarioEditorial({ itens, marcos = [], onAbrir, onPatch, onCriar }) {
  const [ref, setRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [arrastar, setArrastar] = useState(null); // { id, campo }
  const [sobre, setSobre] = useState(null);
  const [ativos, setAtivos] = useState(() => new Set(TIPOS_DATA.map((t) => t.campo)));
  const alternar = (campo) => setAtivos((s) => {
    const n = new Set(s);
    if (n.has(campo)) { if (n.size > 1) n.delete(campo); } else n.add(campo);
    return n;
  });

  const semanas = useMemo(() => {
    const inicio = new Date(ref);
    const dow = (inicio.getDay() + 6) % 7; // segunda = 0
    inicio.setDate(inicio.getDate() - dow);
    const out = [];
    const cur = new Date(inicio);
    for (let w = 0; w < 6; w++) {
      const semana = [];
      for (let i = 0; i < 7; i++) { semana.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
      out.push(semana);
      if (cur.getMonth() !== ref.getMonth() && w >= 3) break;
    }
    return out;
  }, [ref]);

  // Cada conteúdo pode aparecer em 3 dias: entrega, 1.ª e 2.ª publicação
  const porDia = useMemo(() => {
    const map = {};
    for (const it of itens) {
      for (const { campo } of TIPOS_DATA) {
        if (!it[campo] || !ativos.has(campo)) continue;
        // Ideias e arquivados não têm entrega a cumprir
        if (campo === "data_entrega" && (it.estado === "ideia" || it.estado === "arquivado")) continue;
        (map[chaveDe(campo, it[campo])] ||= []).push({ it, campo });
      }
    }
    // Entregas primeiro (acontecem antes), depois publicações por hora
    const ordem = (x) => (x.campo === "data_entrega" ? 0 : new Date(x.it[x.campo]).getTime());
    for (const k of Object.keys(map)) map[k].sort((a, b) => ordem(a) - ordem(b));
    return map;
  }, [itens, ativos]);

  const semData = useMemo(
    () => itens.filter((it) => !it.data_publicacao && it.estado !== "ideia").sort((a, b) => (a.data_entrega || "9").localeCompare(b.data_entrega || "9")),
    [itens],
  );

  const hoje = hojeKey();
  const titulo = `${MESES_LONGOS[ref.getMonth()]} ${ref.getFullYear()}`;
  const mudarMes = (n) => setRef((r) => new Date(r.getFullYear(), r.getMonth() + n, 1));

  const largar = (key) => {
    if (!arrastar) return;
    const it = itens.find((x) => x.id === arrastar.id);
    if (it) onPatch(it.id, { [arrastar.campo]: arrastar.campo === "data_entrega" ? key : moverParaDia(it[arrastar.campo], key) });
    setArrastar(null);
    setSobre(null);
  };

  return (
    <div className="mk-cal-wrap">
      <div className="mk-cal">
        <div className="mk-cal-head">
          <button type="button" className="mk-icon-btn" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><I.ChevronLeft size={18} /></button>
          <h3>{titulo}</h3>
          <button type="button" className="mk-icon-btn" onClick={() => mudarMes(1)} aria-label="Mês seguinte"><I.ChevronRight size={18} /></button>
          <button type="button" className="mk-btn is-ghost is-sm" onClick={() => { const d = new Date(); setRef(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Hoje</button>
          <div className="mk-cal-legend" role="group" aria-label="Mostrar no calendário">
            {TIPOS_DATA.map((t) => (
              <button
                key={t.campo}
                type="button"
                className={`mk-cal-legend-btn ${t.classe} ${ativos.has(t.campo) ? "is-on" : ""}`}
                aria-pressed={ativos.has(t.campo)}
                title={`${ativos.has(t.campo) ? "Esconder" : "Mostrar"}: ${t.nome} (${t.dica})`}
                onClick={() => alternar(t.campo)}
              >
                <i aria-hidden="true">{t.tag}</i>{t.nome}
              </button>
            ))}
          </div>
        </div>
        <div className="mk-cal-grid">
          {DIAS_SEMANA.map((d) => <div key={d} className="mk-cal-dow">{d}</div>)}
          {semanas.flat().map((dia) => {
            const k = diaKey(dia);
            const fora = dia.getMonth() !== ref.getMonth();
            const lista = porDia[k] || [];
            const fimSemana = dia.getDay() === 0 || dia.getDay() === 6;
            return (
              <div
                key={k}
                className={`mk-cal-day ${fora ? "is-out" : ""} ${k === hoje ? "is-today" : ""} ${fimSemana ? "is-weekend" : ""} ${sobre === k ? "is-over" : ""}`}
                onDragOver={(e) => { if (arrastar) { e.preventDefault(); setSobre(k); } }}
                onDragLeave={() => setSobre((s) => (s === k ? null : s))}
                onDrop={(e) => { e.preventDefault(); largar(k); }}
              >
                <div className="mk-cal-num">
                  <span>{dia.getDate()}</span>
                  <button aria-label="Novo conteúdo neste dia" type="button" className="mk-cal-add" title="Novo conteúdo neste dia" onClick={() => onCriar({ data_publicacao: moverParaDia(null, k) })}><I.Plus size={12} sw={3} /></button>
                </div>
                {marcos.filter((m) => m.data === k).map((m, mi) => (
                  <span key={mi} className="mk-cal-marco" title={`Ponto de controlo · ${m.ciclo}${m.notas ? ` — ${m.notas}` : ""}`}><I.Flag size={11} sw={2.5} /> {m.titulo || "Ponto de controlo"}</span>
                ))}
                <div className="mk-cal-items">
                  {lista.map(({ it, campo }) => {
                    const st = estadoInfo(it.estado);
                    const canal = it.canais?.[0] ? canalInfo(it.canais[0]) : null;
                    const tipo = TIPO[campo];
                    const entrega = campo === "data_entrega";
                    // Entrega: já cumprida se o conteúdo passou das etapas de produção; atrasada se não
                    const porEntregar = entrega && ETAPAS_ANTES_AGENDAR.includes(it.estado);
                    const atrasada = porEntregar && diasAte(it.data_entrega) < 0;
                    const cumprida = entrega && !porEntregar;
                    const estadoEntrega = atrasada ? " · ATRASADA" : cumprida ? " · já entregue" : "";
                    return (
                      <button
                        key={it.id + campo}
                        type="button"
                        draggable
                        className={`mk-cal-item ${tipo.classe} ${atrasada ? "is-late" : ""} ${cumprida ? "is-done" : ""}`}
                        style={{ "--c": st.cor }}
                        title={`${tipo.nome}${entrega ? ` (${tipo.dica})` : ` às ${fmtHora(it[campo])}`}${estadoEntrega} — ${it.titulo || "Sem título"} · ${st.label}`}
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", it.id); setArrastar({ id: it.id, campo }); }}
                        onDragEnd={() => { setArrastar(null); setSobre(null); }}
                        onClick={() => onAbrir(it.id)}
                      >
                        <i className="mk-cal-tag">{tipo.tag}</i>
                        {!entrega && <time>{fmtHora(it[campo])}</time>}
                        {!entrega && canal && <b style={{ background: canal.cor }}>{canal.sigla}</b>}
                        <span>{it.titulo || "Sem título"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="mk-cal-side">
        <h4><I.Clock size={15} /> Sem data <em>{semData.length}</em></h4>
        <p>Arraste para um dia para agendar.</p>
        <div className="mk-cal-side-list">
          {semData.length === 0 && <span className="mk-empty-sm">Tudo tem data. 🎉</span>}
          {semData.map((it) => {
            const st = estadoInfo(it.estado);
            return (
              <button
                key={it.id}
                type="button"
                draggable
                className="mk-cal-item is-loose"
                style={{ "--c": st.cor }}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", it.id); setArrastar({ id: it.id, campo: "data_publicacao" }); }}
                onDragEnd={() => { setArrastar(null); setSobre(null); }}
                onClick={() => onAbrir(it.id)}
              >
                <i />
                <span>{it.titulo || "Sem título"}</span>
                <small>{st.label}</small>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
