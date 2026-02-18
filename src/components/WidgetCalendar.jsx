import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

export default function WidgetCalendar() {
  const { user } = useAuth();
  const [dataAtual, setDataAtual] = useState(new Date());
  const [eventos, setEventos] = useState([]); 
  const [loading, setLoading] = useState(true);

  const mesAtual = dataAtual.getMonth();
  const anoAtual = dataAtual.getFullYear();

  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    if(user) fetchEventos();
  }, [mesAtual, anoAtual, user]);

  async function fetchEventos() {
    setLoading(true);
    let listaEventos = [];

    // 1. Aniversários (PÚBLICO)
    const { data: profiles } = await supabase.from("profiles").select("nome, data_nascimento");
    if (profiles) {
      profiles.forEach(p => {
        if (!p.data_nascimento) return;
        const nasc = new Date(p.data_nascimento);
        if (nasc.getMonth() === mesAtual) {
          listaEventos.push({
            dia: nasc.getDate(),
            tipo: 'aniversario',
            // Adicionei emoji e nome curto
            displayName: `🎉 ${p.nome.split(' ')[0]}`, 
            bg: '#fef08a', // Amarelo claro
            txt: '#854d0e', // Texto escuro para contraste
            originalDate: nasc
          });
        }
      });
    }

    // 2. Férias (PRIVADO - Só as minhas)
    const inicioMesStr = new Date(anoAtual, mesAtual, 1).toISOString();
    const fimMesStr = new Date(anoAtual, mesAtual + 1, 0).toISOString();

    const { data: ferias } = await supabase
      .from("ferias")
      .select("data_inicio, data_fim, tipo")
      .eq("user_id", user.id) // <--- Privacidade mantida
      .eq("estado", "aprovado")
      .or(`data_inicio.lte.${fimMesStr},data_fim.gte.${inicioMesStr}`);

    if (ferias) {
        ferias.forEach(f => {
            const inicio = new Date(f.data_inicio);
            const fim = new Date(f.data_fim);
            
            let bg = '#f59e0b'; let emoji = '🏖️'; // Férias (Laranja)
            if(f.tipo?.toLowerCase().includes('falta')) { bg = '#ef4444'; emoji = '🚨'; }
            if(f.tipo?.toLowerCase().includes('baixa')) { bg = '#a855f7'; emoji = '🏥'; }

            // Capitalizar primeira letra do tipo
            const tipoFormatado = f.tipo.charAt(0).toUpperCase() + f.tipo.slice(1);

            for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
                    listaEventos.push({
                        dia: d.getDate(),
                        tipo: 'ausencia',
                        subtipo: f.tipo,
                        // Mostra o tipo com emoji
                        displayName: `${emoji} ${tipoFormatado}`, 
                        bg: bg,
                        txt: 'white', // Texto branco nas ausências
                        originalDate: new Date(d)
                    });
                }
            }
        });
    }

    listaEventos.sort((a, b) => a.dia - b.dia);
    setEventos(listaEventos);
    setLoading(false);
  }

  // --- LÓGICA DE AGRUPAR (para o resumo em baixo) ---
  const getEventosAgrupados = () => {
      if (eventos.length === 0) return [];
      const agrupados = [];
      let atual = null;
      eventos.forEach((ev) => {
          if (!atual) {
              atual = { ...ev, fim: ev.dia, diasCount: 1 };
          } else {
              // Agrupa se for o mesmo tipo de evento no dia seguinte
              if (ev.displayName === atual.displayName && ev.dia === atual.fim + 1) {
                  atual.fim = ev.dia;
                  atual.diasCount++;
              } else {
                  agrupados.push(atual);
                  atual = { ...ev, fim: ev.dia, diasCount: 1 };
              }
          }
      });
      if (atual) agrupados.push(atual);
      return agrupados.slice(0, 4); 
  };

  const eventosResumidos = getEventosAgrupados();

  // Renderização
  const getDiasNoMes = (mes, ano) => new Date(ano, mes + 1, 0).getDate();
  const getDiaSemanaInicio = (mes, ano) => new Date(ano, mes, 1).getDay();
  const diasTotais = getDiasNoMes(mesAtual, anoAtual);
  const diaInicio = getDiaSemanaInicio(mesAtual, anoAtual);
  const diasVazios = Array(diaInicio).fill(null);
  const diasPreenchidos = Array.from({ length: diasTotais }, (_, i) => i + 1);
  const diasCalendario = [...diasVazios, ...diasPreenchidos];

  return (
    <div className="card" style={{height: '100%', minHeight: '340px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'}}>
      
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
        <h3 style={{margin: 0, fontSize: '1.1rem', color: '#1e293b'}}>{nomesMeses[mesAtual]} {anoAtual}</h3>
        <div style={{display: 'flex', gap: '5px'}}>
            <button className="btn-small" onClick={() => setDataAtual(new Date(anoAtual, mesAtual - 1))}>◀</button>
            <button className="btn-small" onClick={() => setDataAtual(new Date(anoAtual, mesAtual + 1))}>▶</button>
        </div>
      </div>

      {/* Grid Header */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '5px'}}>
        <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
      </div>

      {/* Grid Dias */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1, alignContent: 'start'}}>
        {diasCalendario.map((dia, index) => {
          if (!dia) return <div key={index} style={{background: '#f8fafc', borderRadius: '6px'}}></div>;
          
          const evtsDoDia = eventos.filter(e => e.dia === dia);
          const isToday = dia === new Date().getDate() && mesAtual === new Date().getMonth() && anoAtual === new Date().getFullYear();

          return (
            <div key={index} style={{
                // Removi aspectRatio: 1/1 para permitir crescer
                minHeight: '50px', 
                display: 'flex', flexDirection: 'column', 
                borderRadius: '6px', background: isToday ? '#eff6ff' : 'white',
                border: isToday ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                padding: '4px',
                fontSize: '0.85rem', color: '#334151', overflow: 'hidden'
            }}>
              {/* Número do dia no canto */}
              <span style={{fontSize: '0.7rem', fontWeight: 'bold', color: isToday ? '#2563eb' : '#94a3b8', alignSelf: 'flex-start', marginBottom: '2px'}}>{dia}</span>
              
              {/* Lista de Eventos (Etiquetas) */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '2px', width: '100%'}}>
                {evtsDoDia.slice(0, 2).map((ev, i) => ( // Mostra máx 2 para não explodir o layout
                    <div key={i} title={ev.displayName} style={{
                        fontSize: '0.6rem', 
                        background: ev.bg, color: ev.txt,
                        padding: '2px 4px', borderRadius: '4px', fontWeight: '600',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left'
                    }}>
                        {ev.displayName}
                    </div>
                ))}
                {/* Se houver mais de 2 eventos */}
                {evtsDoDia.length > 2 && (
                    <span style={{fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center'}}>+{evtsDoDia.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LISTA DE RESUMO (Rodapé) */}
      <div style={{marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem'}}>
        {eventosResumidos.length > 0 ? (
             eventosResumidos.map((e, i) => (
                <div key={i} style={{marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {/* Bolinha colorida */}
                    <span style={{width: '8px', height: '8px', borderRadius: '50%', background: e.bg, flexShrink: 0}}></span>
                    <span style={{color: '#64748b'}}>
                        {/* Texto do resumo */}
                        <b>{e.diasCount > 1 ? `Dias ${e.dia} a ${e.fim}` : `Dia ${e.dia}`}:</b> {e.displayName}
                    </span>
                </div>
             ))
        ) : (
            <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Nada agendado para este mês.</span>
        )}
      </div>

    </div>
  );
}