import { useMemo, useState } from "react";
import { I } from "./mkIcons";
import { estadoInfo, canalInfo } from "../../constants/marketing";
import { diaKey, hojeKey, fmtHora } from "./mkUtils";

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

  // Cada conteúdo pode aparecer em 2 dias (publicação + 2.ª publicação)
  const porDia = useMemo(() => {
    const map = {};
    for (const it of itens) {
      for (const campo of ["data_publicacao", "data_publicacao_2"]) {
        if (!it[campo]) continue;
        const k = diaKey(new Date(it[campo]));
        (map[k] ||= []).push({ it, campo });
      }
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => new Date(a.it[a.campo]) - new Date(b.it[b.campo]));
    return map;
  }, [itens]);

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
    if (it) onPatch(it.id, { [arrastar.campo]: moverParaDia(it[arrastar.campo], key) });
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
                  <button type="button" className="mk-cal-add" title="Novo conteúdo neste dia" onClick={() => onCriar({ data_publicacao: moverParaDia(null, k) })}><I.Plus size={12} sw={3} /></button>
                </div>
                {marcos.filter((m) => m.data === k).map((m, mi) => (
                  <span key={mi} className="mk-cal-marco" title={`Ponto de controlo · ${m.ciclo}${m.notas ? ` — ${m.notas}` : ""}`}><I.Flag size={11} sw={2.5} /> {m.titulo || "Ponto de controlo"}</span>
                ))}
                <div className="mk-cal-items">
                  {lista.map(({ it, campo }) => {
                    const st = estadoInfo(it.estado);
                    const canal = it.canais?.[0] ? canalInfo(it.canais[0]) : null;
                    return (
                      <button
                        key={it.id + campo}
                        type="button"
                        draggable
                        className={`mk-cal-item ${campo === "data_publicacao_2" ? "is-repeat" : ""}`}
                        style={{ "--c": st.cor }}
                        title={`${it.titulo || "Sem título"} · ${st.label}${campo === "data_publicacao_2" ? " · 2.ª publicação" : ""}`}
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", it.id); setArrastar({ id: it.id, campo }); }}
                        onDragEnd={() => { setArrastar(null); setSobre(null); }}
                        onClick={() => onAbrir(it.id)}
                      >
                        <time>{fmtHora(it[campo])}</time>
                        {canal && <b style={{ background: canal.cor }}>{canal.sigla}</b>}
                        <span>{campo === "data_publicacao_2" ? "↻ " : ""}{it.titulo || "Sem título"}</span>
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
