// =====================================================================
// Ações de Formação · separador "Estatísticas" (gráficos).
// Ficheiro à parte para que a biblioteca de gráficos (recharts, pesada) só
// seja descarregada quando se abre este separador (lazy em AcoesFormacao.jsx).
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import {
  PieChart, Pie,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  Rectangle
} from "recharts";

const Icons = {
  Folder: ({ size = 20, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Alert: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Clock: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Users: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  File: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>,
  Euro: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 7a7 7 0 1 0 0 10"></path><line x1="4" y1="10" x2="14" y2="10"></line><line x1="4" y1="14" x2="13" y2="14"></line></svg>,
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#f43f5e', '#10b981', '#f59e0b'];
const STATUS_COLORS = { "Concluído": "#10b981", "Em Andamento": "#3b82f6", "Adiado": "#f59e0b", "Cancelado": "#ef4444" };
const REGIME_COLORS = { "Presencial": "#8b5cf6", "Online": "#ec4899", "Hibrido": "#06b6d4" };
const B2B_COLORS = ['#6366f1', '#14b8a6'];

// Recebemos agora o selectedYear nas props
export default function EstatisticasTab({ areasFormacao, selectedYear }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data: cursos, error } = await supabase
        .from("acoes_formacao")
        .select(`
          ano, area_formacao_id, carga_horaria, n_certificados, total_inscritos, status_curso,
          n_desistencias, n_empresas, n_particulares, regime, 
          certificados_emitidos, certificados_enviados, certificados_aguardar,
          doc_formador, pag_formador
        `);
      
      if (!error && cursos) setData(cursos);
      setLoading(false);
    }
    fetchStats();
  }, []);

  // ----------------------------------------------------------------------
  // 1. FILTRAGEM E CÁLCULOS
  // ----------------------------------------------------------------------

  // Filtramos os dados especificamente para o ano selecionado no topo da página
  const dataAnoSelecionado = useMemo(() => {
    return data.filter(curso => Number(curso.ano) === Number(selectedYear));
  }, [data, selectedYear]);

  // ESTE MANTÉM OS DADOS TODOS (data) -> Para podermos ver a evolução ao longo dos anos
  const statsPorAno = useMemo(() => {
    const mapa = data.reduce((acc, curr) => {
      const ano = curr.ano;
      if (!acc[ano]) acc[ano] = { ano: String(ano), volume: 0, formandos: 0 };
      
      const volume = (Number(curr.carga_horaria) || 0) * (Number(curr.n_certificados) || 0);
      acc[ano].volume += volume;
      acc[ano].formandos += (Number(curr.total_inscritos) || 0);
      
      return acc;
    }, {});
    return Object.values(mapa).sort((a, b) => Number(a.ano) - Number(b.ano));
  }, [data]);

  // OS RESTANTES USAM APENAS dataAnoSelecionado
  const statsPorArea = useMemo(() => {
    const mapa = dataAnoSelecionado.reduce((acc, curr) => {
      const areaId = curr.area_formacao_id;
      if (!areaId) return acc;
      if (!acc[areaId]) acc[areaId] = 0;
      acc[areaId] += 1;
      return acc;
    }, {});

    const arrayOrdenado = Object.entries(mapa).map(([id, count]) => {
      const area = areasFormacao.find(a => a.id === id);
      return { name: area ? area.nome : "Desconhecida", value: count };
    }).sort((a, b) => b.value - a.value);

    return arrayOrdenado.map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length]
    }));
  }, [dataAnoSelecionado, areasFormacao]);

  const statsStatus = useMemo(() => {
    const mapa = dataAnoSelecionado.reduce((acc, curr) => {
      const status = curr.status_curso || "Desconhecido";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(mapa).map(([name, value], index) => ({ 
      name, 
      value,
      fill: STATUS_COLORS[name] || COLORS[index % COLORS.length]
    }));
  }, [dataAnoSelecionado]);

  const statsRegime = useMemo(() => {
    const mapa = dataAnoSelecionado.reduce((acc, curr) => {
      const regime = curr.regime || "Desconhecido";
      acc[regime] = (acc[regime] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(mapa).map(([name, value], index) => ({ 
      name, 
      value,
      fill: REGIME_COLORS[name] || COLORS[index % COLORS.length]
    }));
  }, [dataAnoSelecionado]);

  const statsPublico = useMemo(() => {
    let empresas = 0;
    let particulares = 0;
    dataAnoSelecionado.forEach(curr => {
      empresas += Number(curr.n_empresas) || 0;
      particulares += Number(curr.n_particulares) || 0;
    });
    return [
      { name: "Empresas (B2B)", value: empresas, fill: B2B_COLORS[0] },
      { name: "Particulares (B2C)", value: particulares, fill: B2B_COLORS[1] }
    ];
  }, [dataAnoSelecionado]);

  const statsCertificados = useMemo(() => {
    let aguardar = 0, emitidos = 0, enviados = 0;
    dataAnoSelecionado.forEach(curr => {
      aguardar += Number(curr.certificados_aguardar) || 0;
      emitidos += Number(curr.certificados_emitidos) || 0;
      enviados += Number(curr.certificados_enviados) || 0;
    });
    return [
      { name: "A Aguardar", quantidade: aguardar, fill: "#f59e0b" },
      { name: "Emitidos", quantidade: emitidos, fill: "#3b82f6" },
      { name: "Enviados", quantidade: enviados, fill: "#10b981" }
    ];
  }, [dataAnoSelecionado]);

  const totais = useMemo(() => {
    let volume = 0, formandos = 0, desistencias = 0, docsFalta = 0, pagFalta = 0;
    
    dataAnoSelecionado.forEach(curr => {
      volume += (Number(curr.carga_horaria) || 0) * (Number(curr.n_certificados) || 0);
      formandos += Number(curr.total_inscritos) || 0;
      desistencias += Number(curr.n_desistencias) || 0;
      if (!curr.doc_formador) docsFalta += 1;
      if (!curr.pag_formador && curr.status_curso !== "Cancelado") pagFalta += 1;
    });

    const taxaDesistencia = formandos > 0 ? ((desistencias / formandos) * 100).toFixed(1) : 0;

    return { volume, formandos, desistencias, taxaDesistencia, docsFalta, pagFalta };
  }, [dataAnoSelecionado]);

  // ----------------------------------------------------------------------
  // 2. RENDERIZAÇÃO
  // ----------------------------------------------------------------------

  if (loading) return <div className="af-loading"><span className="af-spinner" /> A carregar estatísticas e KPIs…</div>;

  const tooltipStyle = { borderRadius: 12, border: "1px solid var(--lx-e2e8f0, #e2e8f0)", boxShadow: "0 12px 28px -12px rgba(15,23,42,0.3)", fontSize: 12, fontWeight: 700 };
  const renderDonut = (dataset, emptyLabel = "Sem dados") => {
    const total = dataset.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    if (dataset.length === 0 || total === 0) return <div className="af-chart-empty" style={{ height: 250 }}>{emptyLabel}</div>;
    return (
      <div className="af-donut">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={dataset} cx="50%" cy="44%" innerRadius={62} outerRadius={88} paddingAngle={3} cornerRadius={6} dataKey="value" stroke="none" />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "0.76rem", fontWeight: 700 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="af-donut-center"><strong>{total}</strong><span>total</span></div>
      </div>
    );
  };

  const certTotal = statsCertificados.reduce((sum, item) => sum + item.quantidade, 0);

  return (
    <div className="af-stats">

      {/* ----------------- CARDS DE TOPO (KPIs e Alertas) ----------------- */}
      <div className="af-stats-head">
        <h2>Resumo de {selectedYear}</h2>
      </div>
      <div className="af-kpis">
        <div className="af-kpi" style={{ "--k": "var(--color-btnPrimary)" }}>
          <span className="af-kpi-ico"><Icons.Folder size={18} /></span>
          <h4>Total Formações</h4>
          <strong>{dataAnoSelecionado.length}</strong>
        </div>
        <div className="af-kpi" style={{ "--k": "#2563eb" }}>
          <span className="af-kpi-ico"><Icons.Clock size={18} /></span>
          <h4>Volume (h)</h4>
          <strong>{totais.volume.toLocaleString("pt-PT")}</strong>
        </div>
        <div className="af-kpi" style={{ "--k": "#059669" }}>
          <span className="af-kpi-ico"><Icons.Users size={18} /></span>
          <h4>Formandos Totais</h4>
          <strong>{totais.formandos.toLocaleString("pt-PT")}</strong>
        </div>
        <div className="af-kpi is-danger" style={{ "--k": "#e11d48" }}>
          <span className="af-kpi-ico"><Icons.Alert size={18} /></span>
          <h4>Taxa de Desistência</h4>
          <strong>{totais.taxaDesistencia}%</strong>
          <div className="af-kpi-bar"><span style={{ width: `${Math.min(100, Number(totais.taxaDesistencia) || 0)}%` }} /></div>
        </div>
      </div>

      <div className="af-alerts">
        <div className={`af-alert ${totais.docsFalta > 0 ? "is-on" : "is-ok"}`}>
          <span className="af-alert-ico"><Icons.File size={20} /></span>
          <div>
            <h4>Documentos de Formador em Falta</h4>
            <p>Ações com documentação pendente em {selectedYear}</p>
          </div>
          <strong>{totais.docsFalta}</strong>
        </div>
        <div className={`af-alert ${totais.pagFalta > 0 ? "is-on" : "is-ok"}`}>
          <span className="af-alert-ico"><Icons.Euro size={20} /></span>
          <div>
            <h4>Pagamentos a Formadores</h4>
            <p>Ações com pagamento pendente em {selectedYear}</p>
          </div>
          <strong>{totais.pagFalta}</strong>
        </div>
      </div>

      {/* ----------------- LINHA 1: EVOLUÇÃO TEMPORAL (GLOBAL) ----------------- */}
      <div className="af-stats-head"><h2>Comparativo Histórico</h2></div>
      <div className="af-chart-grid is-2">
        <div className="af-chart">
          <h3>Evolução do Volume de Formação (h)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statsPorAno}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-100, #eef2f6)" />
              <XAxis dataKey="ano" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip cursor={{ fill: "var(--n-50, #f8fafc)" }} contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "0.76rem", fontWeight: 700 }} />
              <Bar dataKey="volume" name="Volume Total" radius={[8, 8, 0, 0]} maxBarSize={56} shape={(props) => {
                const fill = Number(props.payload.ano) === Number(selectedYear) ? "var(--color-btnPrimary)" : "#dbe3ec";
                return <Rectangle {...props} fill={fill} />;
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="af-chart">
          <h3>Evolução de Inscritos</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statsPorAno}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--n-100, #eef2f6)" />
              <XAxis dataKey="ano" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip cursor={{ fill: "var(--n-50, #f8fafc)" }} contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "0.76rem", fontWeight: 700 }} />
              <Bar dataKey="formandos" name="Inscritos" radius={[8, 8, 0, 0]} maxBarSize={56} shape={(props) => {
                const fill = Number(props.payload.ano) === Number(selectedYear) ? "#10b981" : "#dbe3ec";
                return <Rectangle {...props} fill={fill} />;
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ----------------- LINHA 2: DISTRIBUIÇÃO COMERCIAL E OPERACIONAL (ANO SELECIONADO) ----------------- */}
      <div className="af-stats-head"><h2>Distribuição Analítica de {selectedYear}</h2></div>
      <div className="af-chart-grid is-3">
        <div className="af-chart">
          <h3>Perfil B2B vs B2C</h3>
          {renderDonut(statsPublico)}
        </div>
        <div className="af-chart">
          <h3>Distribuição por Regime</h3>
          {renderDonut(statsRegime)}
        </div>
        <div className="af-chart">
          <h3>Estado dos Cursos</h3>
          {renderDonut(statsStatus)}
        </div>
      </div>

      {/* ----------------- LINHA 3: ÁREAS E FUNIL CERTIFICADOS (ANO SELECIONADO) ----------------- */}
      <div className="af-chart-grid is-2">
        <div className="af-chart">
          <h3>Volume por Área de Formação</h3>
          {statsPorArea.length === 0 ? (
            <div className="af-chart-empty" style={{ height: 300 }}>Sem dados para {selectedYear}</div>
          ) : (
            <div className="af-area-list">
              {statsPorArea.map((area) => (
                <div key={area.name} className="af-area-row">
                  <span className="af-area-dot" style={{ background: area.fill }} />
                  <span className="af-area-name" title={area.name}>{area.name}</span>
                  <div className="af-area-bar"><span style={{ width: `${(area.value / statsPorArea[0].value) * 100}%`, background: area.fill }} /></div>
                  <strong>{area.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="af-chart">
          <h3>Status de Emissão de Certificados</h3>
          <p>Acompanhamento do processamento de certificados em {selectedYear}</p>
          <div className="af-funnel">
            {statsCertificados.map((item) => (
              <div key={item.name} className="af-funnel-row" style={{ "--f": item.fill }}>
                <div className="af-funnel-label"><span>{item.name}</span><strong>{item.quantidade}</strong></div>
                <div className="af-funnel-bar"><span style={{ width: `${certTotal ? (item.quantidade / certTotal) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
