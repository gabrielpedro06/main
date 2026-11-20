// =====================================================================
// RH › separador "Km's" — tabela mensal de km pedidos por colaborador.
// Linhas = colaboradores, colunas = meses (janeiro até ao mês atual, ou o ano
// todo se for um ano passado). Cada célula mostra os km do mês e o valor em €
// (km × €/km definido nos RH, app_settings "rh_km_reembolso_eur").
// Conta os pedidos "Pedido de Km's" da tabela `ferias` pela data da deslocação
// (data_inicio). Por omissão inclui pendentes (assinalados a âmbar); o filtro
// "Só aprovados" mostra apenas o que já foi aprovado. Rejeitados/cancelados nunca contam.
// Nota: usa o €/km atual para todos os meses (o histórico do valor não é guardado).
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Car, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { supabase } from "../../services/supabase";
import { registarEvento } from "../../utils/registarEvento";

const KM_REQUEST_TYPE = "Pedido de Km's";
const ESTADOS_PEDIDO = ["pendente", "pedido_cancelamento"]; // ainda em pedido (contam como pendentes)
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmtKm = (n) => `${Math.round(n).toLocaleString("pt-PT")} km`;
const fmtEur = (n) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

/**
 * @param {object} p
 * @param {Array<{id: string, nome: string, ativo?: boolean}>} p.colaboradores todos (ativos e inativos)
 * @param {number} p.valorPorKm €/km (parseKmRate do valor dos RH)
 * @param {(msg: string, tipo?: string) => void} [p.notify]
 * @param {(c: object) => React.ReactNode} [p.renderAvatar] foto do colaborador (renderRhAvatar dos RH)
 */
export default function TabelaKmsMensal({ colaboradores = [], valorPorKm = 0.4, notify, renderAvatar }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [soAprovados, setSoAprovados] = useState(false);
  const [pedidos, setPedidos] = useState(null); // null = a carregar
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    setPedidos(null);
    setErro("");
    supabase
      .from("ferias")
      .select("user_id, data_inicio, km_total, estado")
      .eq("tipo", KM_REQUEST_TYPE)
      .in("estado", ["aprovado", ...ESTADOS_PEDIDO])
      .gte("data_inicio", `${ano}-01-01`)
      .lte("data_inicio", `${ano}-12-31`)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) { setErro(error.message); setPedidos([]); return; }
        setPedidos(data || []);
      });
    return () => { vivo = false; };
  }, [ano]);

  // Meses visíveis: ano atual → até ao mês corrente; anos passados → 12 meses.
  const nMeses = ano === hoje.getFullYear() ? hoje.getMonth() + 1 : ano < hoje.getFullYear() ? 12 : 0;
  const meses = MESES.slice(0, nMeses);

  // { user_id → { aprovado: [12], pendente: [12] } }
  const porPessoa = useMemo(() => {
    const m = {};
    for (const p of pedidos || []) {
      const km = Number(String(p.km_total ?? "").replace(",", "."));
      if (!p.user_id || !Number.isFinite(km) || km <= 0 || !p.data_inicio) continue;
      const mes = Number(String(p.data_inicio).slice(5, 7)) - 1;
      if (mes < 0 || mes > 11) continue;
      const linha = (m[p.user_id] ||= { aprovado: Array(12).fill(0), pendente: Array(12).fill(0) });
      linha[p.estado === "aprovado" ? "aprovado" : "pendente"][mes] += km;
    }
    return m;
  }, [pedidos]);

  const valorDe = (linha, i) => (linha ? linha.aprovado[i] + (soAprovados ? 0 : linha.pendente[i]) : 0);

  // Ativos sempre; inativos só se tiverem km neste ano.
  const linhas = useMemo(() => {
    return colaboradores
      .filter((c) => c.ativo !== false || porPessoa[c.id])
      .map((c) => {
        const l = porPessoa[c.id];
        const mesesKm = meses.map((_, i) => valorDe(l, i));
        const pendentes = meses.map((_, i) => (l && !soAprovados ? l.pendente[i] : 0));
        return { c, mesesKm, pendentes, total: mesesKm.reduce((a, b) => a + b, 0) };
      })
      .sort((a, b) => b.total - a.total || String(a.c.nome).localeCompare(String(b.c.nome), "pt"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaboradores, porPessoa, soAprovados, nMeses]);

  const totaisMes = meses.map((_, i) => linhas.reduce((s, l) => s + l.mesesKm[i], 0));
  const totalAno = totaisMes.reduce((a, b) => a + b, 0);
  const pendenteAno = linhas.reduce((s, l) => s + l.pendentes.reduce((a, b) => a + b, 0), 0);
  const rate = Number(valorPorKm) || 0;

  const exportar = () => {
    const cab = ["Colaborador", ...meses.flatMap((m) => [`${m} (km)`, `${m} (€)`]), "Total (km)", "Total (€)"];
    const corpo = linhas.map((l) => [
      l.c.nome,
      ...l.mesesKm.flatMap((km) => [Math.round(km), Number((km * rate).toFixed(2))]),
      Math.round(l.total),
      Number((l.total * rate).toFixed(2)),
    ]);
    const rodape = ["TOTAL", ...totaisMes.flatMap((km) => [Math.round(km), Number((km * rate).toFixed(2))]), Math.round(totalAno), Number((totalAno * rate).toFixed(2))];
    const ws = XLSX.utils.aoa_to_sheet([cab, ...corpo, rodape]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Kms ${ano}`);
    XLSX.writeFile(wb, `Kms_mensais_${ano}${soAprovados ? "_aprovados" : ""}.xlsx`);
    registarEvento("exportacao", { area: "Km's mensais (RH)", linhas: corpo.length });
    notify?.("Excel exportado.", "success");
  };

  return (
    <div className="rh-stack bz-tab-panel">
      <section className="rh-card">
        <div className="rh-card-head">
          <div className="rh-card-title">
            <span className="rh-card-ico is-teal"><Car size={18} /></span>
            <div>
              <h3>Km's por mês</h3>
              <p>Km pedidos por colaborador e o valor a reembolsar ({fmtEur(rate)}/km).</p>
            </div>
          </div>
          <div className="rh-km-ctrl">
            <div className="rh-km-ano" role="group" aria-label="Ano">
              <button type="button" onClick={() => setAno((a) => a - 1)} aria-label="Ano anterior"><ChevronLeft size={16} /></button>
              <strong>{ano}</strong>
              <button type="button" onClick={() => setAno((a) => a + 1)} disabled={ano >= hoje.getFullYear()} aria-label="Ano seguinte"><ChevronRight size={16} /></button>
            </div>
            <div className="rh-km-seg" role="group" aria-label="Que pedidos contar">
              <button type="button" className={!soAprovados ? "is-on" : ""} aria-pressed={!soAprovados} onClick={() => setSoAprovados(false)}>Todos os pedidos</button>
              <button type="button" className={soAprovados ? "is-on" : ""} aria-pressed={soAprovados} onClick={() => setSoAprovados(true)}>Só aprovados</button>
            </div>
            <button type="button" className="rh-btn is-soft is-sm" onClick={exportar} disabled={!linhas.length || pedidos === null}>
              <Download size={15} /> Excel
            </button>
          </div>
        </div>

        <div className="rh-km-resumo">
          <span><strong>{fmtKm(totalAno)}</strong> em {ano}</span>
          <span><strong>{fmtEur(totalAno * rate)}</strong> a reembolsar</span>
          {!soAprovados && pendenteAno > 0 && <span className="is-pend"><strong>{fmtKm(pendenteAno)}</strong> ainda pendentes</span>}
        </div>

        {erro && <p className="rh-km-erro" role="alert">Não foi possível carregar os pedidos: {erro}</p>}

        {pedidos === null ? (
          <p className="rh-km-vazio">A carregar…</p>
        ) : !meses.length ? (
          <p className="rh-km-vazio">Ainda não há meses neste ano.</p>
        ) : (
          <div className="rh-table-wrap rh-km-wrap">
            <table className="rh-table rh-km-tabela">
              <thead>
                <tr>
                  <th scope="col" className="rh-km-nome">Colaborador</th>
                  {meses.map((m, i) => <th key={m} scope="col" className={i === hoje.getMonth() && ano === hoje.getFullYear() ? "is-atual" : ""}>{m}</th>)}
                  <th scope="col" className="rh-km-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.c.id} className={l.c.ativo === false ? "is-inativo" : ""}>
                    <th scope="row" className="rh-km-nome"><span className="rh-who">{renderAvatar?.(l.c)}<strong>{l.c.nome}{l.c.ativo === false && <small> (inativo)</small>}</strong></span></th>
                    {l.mesesKm.map((km, i) => (
                      <td key={i} className={km ? "" : "is-zero"}>
                        {km ? (
                          <>
                            <span className="rh-km-km">{fmtKm(km)}</span>
                            <span className="rh-km-eur">{fmtEur(km * rate)}</span>
                            {l.pendentes[i] > 0 && <span className="rh-km-pend" title="Inclui km ainda por aprovar">{fmtKm(l.pendentes[i])} pend.</span>}
                          </>
                        ) : "—"}
                      </td>
                    ))}
                    <td className="rh-km-total">
                      <span className="rh-km-km">{fmtKm(l.total)}</span>
                      <span className="rh-km-eur">{fmtEur(l.total * rate)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="rh-km-nome">Total</th>
                  {totaisMes.map((km, i) => (
                    <td key={i}>
                      <span className="rh-km-km">{fmtKm(km)}</span>
                      <span className="rh-km-eur">{fmtEur(km * rate)}</span>
                    </td>
                  ))}
                  <td className="rh-km-total">
                    <span className="rh-km-km">{fmtKm(totalAno)}</span>
                    <span className="rh-km-eur">{fmtEur(totalAno * rate)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="rh-km-nota">Contam os pedidos pela data da deslocação. Os pedidos rejeitados ou cancelados não contam. O valor usa o €/km atual definido nos RH.</p>
      </section>
    </div>
  );
}
