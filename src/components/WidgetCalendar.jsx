import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export default function WidgetCalendar() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [eventos, setEventos] = useState([]); 
  const [loading, setLoading] = useState(true);

  const mesAtual = dataAtual.getMonth();
  const anoAtual = dataAtual.getFullYear();

  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    fetchEventos();
  }, [mesAtual, anoAtual]);

  async function fetchEventos() {
    setLoading(true);
    let listaEventos = [];

    // 1. Aniversários
    const { data: profiles } = await supabase.from("profiles").select("nome, data_nascimento");
    if (profiles) {
      profiles.forEach(p => {
        if (!p.data_nascimento) return;
        const nasc = new Date(p.data_nascimento);
        if (nasc.getMonth() === mesAtual) {
          listaEventos.push({
            dia: nasc.getDate(),
            tipo: 'aniversario',
            nome: p.nome.split(' ')[0],
            cor: '#3b82f6',
            originalDate: nasc // Para ordenação
          });
        }
      });
    }

    // 2. Férias
    const inicioMesStr = new Date(anoAtual, mesAtual, 1).toISOString();
    const fimMesStr = new Date(anoAtual, mesAtual + 1, 0).toISOString();

    const { data: ferias } = await supabase
      .from("ferias")
      .select("data_inicio, data_fim, tipo, profiles(nome)")
      .eq("estado", "aprovado")
      .or(`data_inicio.lte.${fimMesStr},data_fim.gte.${inicioMesStr}`);

    if (ferias) {
        ferias.forEach(f => {
            const inicio = new Date(f.data_inicio);
            const fim = new Date(f.data_fim);
            const nome = f.profiles?.nome?.split(' ')[0] || 'User';
            
            // Define cor baseada no tipo
            let cor = '#f59e0b'; // Férias (Laranja)
            if(f.tipo === 'falta') cor = '#ef4444';
            if(f.tipo === 'baixa') cor = '#a855f7';

            for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
                    listaEventos.push({
                        dia: d.getDate(),
                        tipo: f.tipo === 'ferias' ? 'ferias' : 'ausencia',
                        subtipo: f.tipo, // para mostrar na lista se é falta ou baixa
                        nome: nome,
                        cor: cor,
                        originalDate: new Date(d)
                    });
                }
            }
        });
    }

    // Ordenar por dia
    listaEventos.sort((a, b) => a.dia - b.dia);
    setEventos(listaEventos);
    setLoading(false);
  }

  // --- LÓGICA DE AGRUPAR DIAS SEGUIDOS ---
  const getEventosAgrupados = () => {
      if (eventos.length === 0) return [];

      const agrupados = [];
      let atual = null;

      eventos.forEach((ev) => {
          if (!atual) {
              atual = { ...ev, fim: ev.dia, diasCount: 1 };
          } else {
              // Se for a mesma pessoa, mesmo tipo e dia consecutivo
              if (ev.nome === atual.nome && ev.tipo === atual.tipo && ev.dia === atual.fim + 1) {
                  atual.fim = ev.dia;
                  atual.diasCount++;
              } else {
                  agrupados.push(atual);
                  atual = { ...ev, fim: ev.dia, diasCount: 1 };
              }
          }
      });
      if (atual) agrupados.push(atual);
      return agrupados.slice(0, 4); // Mostrar apenas os primeiros 4 grupos para não encher
  };

  const eventosResumidos = getEventosAgrupados();

  // Renderização do Calendário
  const getDiasNoMes = (mes, ano) => new Date(ano, mes + 1, 0).getDate();
  const getDiaSemanaInicio = (mes, ano) => new Date(ano, mes, 1).getDay();
  
  const diasTotais = getDiasNoMes(mesAtual, anoAtual);
  const diaInicio = getDiaSemanaInicio(mesAtual, anoAtual);
  
  const diasVazios = Array(diaInicio).fill(null);
  const diasPreenchidos = Array.from({ length: diasTotais }, (_, i) => i + 1);
  const diasCalendario = [...diasVazios, ...diasPreenchidos];

  return (
    <div className="card" style={{height: '100%', minHeight: '340px', display: 'flex', flexDirection: 'column'}}>
      
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
        <h3 style={{margin: 0, fontSize: '1.1rem', color: '#1e293b'}}>{nomesMeses[mesAtual]} {anoAtual}</h3>
        <div style={{display: 'flex', gap: '5px'}}>
            <button className="btn-small" onClick={() => setDataAtual(new Date(anoAtual, mesAtual - 1))}>◀</button>
            <button className="btn-small" onClick={() => setDataAtual(new Date(anoAtual, mesAtual + 1))}>▶</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '5px'}}>
        <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1}}>
        {diasCalendario.map((dia, index) => {
          if (!dia) return <div key={index}></div>;
          
          const evtsDoDia = eventos.filter(e => e.dia === dia);
          const isToday = dia === new Date().getDate() && mesAtual === new Date().getMonth() && anoAtual === new Date().getFullYear();

          return (
            <div key={index} style={{
                aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: '6px', background: isToday ? '#eff6ff' : 'transparent',
                border: isToday ? '1px solid #bfdbfe' : '1px solid transparent',
                position: 'relative', fontSize: '0.85rem', color: '#334151'
            }}>
              {dia}
              <div style={{display: 'flex', gap: '2px', position: 'absolute', bottom: '3px'}}>
                {evtsDoDia.map((ev, i) => (
                    <div key={i} style={{width: '5px', height: '5px', borderRadius: '50%', background: ev.cor}}></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* LISTA DE EVENTOS (AGRUPADOS!) */}
      <div style={{marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem'}}>
        {eventosResumidos.length > 0 ? (
             eventosResumidos.map((e, i) => (
                <div key={i} style={{marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{width: '6px', height: '6px', borderRadius: '50%', background: e.cor, flexShrink: 0}}></span>
                    <span style={{color: '#64748b'}}>
                        {/* Se for 1 dia mostra "14", se forem vários mostra "14 a 18" */}
                        <b>{e.diasCount > 1 ? `${e.dia} a ${e.fim}` : e.dia}:</b> {e.nome} ({e.tipo === 'aniversario' ? '🎉 Aniversário' : (e.subtipo || 'Férias')})
                    </span>
                </div>
             ))
        ) : (
            <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Nada agendado.</span>
        )}
      </div>

    </div>
  );
}