import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

export default function WidgetCalendar() {
  const { user } = useAuth();
  
  // Estados Principais
  const [dataAtual, setDataAtual] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'year', 'month', 'day'
  const [eventos, setEventos] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Perfis / Aniversários (Carregado 1x para a Vista Anual)
  const [aniversariosAno, setAniversariosAno] = useState([]);

  // Estados para Adicionar Evento Inline (Vista Diária)
  const [addingAtHour, setAddingAtHour] = useState(null);
  const [novoEvento, setNovoEvento] = useState({ hora: "", titulo: "" });
  
  const timelineRef = useRef(null);

  const diaAtual = dataAtual.getDate();
  const mesAtual = dataAtual.getMonth();
  const anoAtual = dataAtual.getFullYear();

  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

  // 1. Carregar aniversários de todos mal entra no componente
  useEffect(() => {
      if(user) {
          supabase.from("profiles").select("nome, data_nascimento").then(({data}) => {
              if(data) setAniversariosAno(data.filter(p => p.data_nascimento));
          });
      }
  }, [user]);

  // 2. Carregar eventos específicos do Mês atual
  useEffect(() => {
    if(user) fetchEventos();
  }, [mesAtual, anoAtual, user, aniversariosAno]);

  async function fetchEventos() {
    setLoading(true);
    let listaEventos = [];

    const inicioMesStr = new Date(anoAtual, mesAtual, 1).toISOString().split('T')[0];
    const fimMesStr = new Date(anoAtual, mesAtual + 1, 0).toISOString().split('T')[0];

    // Aniversários a partir do estado global (já carregado)
    aniversariosAno.forEach(p => {
        const nasc = new Date(p.data_nascimento);
        if (nasc.getMonth() === mesAtual) {
            listaEventos.push({
                dia: nasc.getDate(),
                tipo: 'aniversario',
                hora: null,
                displayName: `🎉 ${p.nome.split(' ')[0]}`, 
                bg: '#fef08a', txt: '#854d0e',
                fullTitle: `Aniversário de ${p.nome}`
            });
        }
    });

    // Férias e Ausências (Privado)
    const { data: ferias } = await supabase
      .from("ferias")
      .select("data_inicio, data_fim, tipo")
      .eq("user_id", user.id)
      .eq("estado", "aprovado")
      .or(`data_inicio.lte.${fimMesStr},data_fim.gte.${inicioMesStr}`);

    if (ferias) {
        ferias.forEach(f => {
            const inicio = new Date(f.data_inicio);
            const fim = new Date(f.data_fim);
            
            let bg = '#f59e0b'; let emoji = '🏖️'; 
            if(f.tipo?.toLowerCase().includes('falta')) { bg = '#ef4444'; emoji = '🚨'; }
            if(f.tipo?.toLowerCase().includes('baixa')) { bg = '#a855f7'; emoji = '🏥'; }

            const tipoFormatado = f.tipo.charAt(0).toUpperCase() + f.tipo.slice(1);

            for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
                    listaEventos.push({
                        dia: d.getDate(),
                        tipo: 'ausencia',
                        hora: null,
                        displayName: `${emoji} ${tipoFormatado}`, 
                        bg: bg, txt: 'white',
                        fullTitle: `${tipoFormatado} (Aprovado)`
                    });
                }
            }
        });
    }

    // Agenda Personalizada 
    const { data: agenda } = await supabase
      .from("agenda")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", inicioMesStr)
      .lte("data", fimMesStr);

    if (agenda) {
        agenda.forEach(a => {
            const dataAgenda = new Date(a.data);
            listaEventos.push({
                id: a.id,
                dia: dataAgenda.getDate(),
                tipo: 'agenda',
                hora: a.hora.slice(0, 5), 
                displayName: `🕒 ${a.hora.slice(0, 5)} ${a.titulo}`, 
                bg: '#e0f2fe', txt: '#0369a1',
                fullTitle: a.titulo
            });
        });
    }

    listaEventos.sort((a, b) => {
        if (a.dia !== b.dia) return a.dia - b.dia;
        if (!a.hora && b.hora) return -1;
        if (a.hora && !b.hora) return 1;
        if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
        return 0;
    });

    setEventos(listaEventos);
    setLoading(false);
  }

  // --- NAVEGAÇÃO ---
  function handlePrev() {
      setAddingAtHour(null);
      const d = new Date(dataAtual);
      if (viewMode === 'year') d.setFullYear(d.getFullYear() - 1);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else if (viewMode === 'day') d.setDate(d.getDate() - 1);
      setDataAtual(d);
  }

  function handleNext() {
      setAddingAtHour(null);
      const d = new Date(dataAtual);
      if (viewMode === 'year') d.setFullYear(d.getFullYear() + 1);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else if (viewMode === 'day') d.setDate(d.getDate() + 1);
      setDataAtual(d);
  }

  function goToHoje() {
      setAddingAtHour(null);
      setDataAtual(new Date());
      setViewMode('month');
  }

  // --- ADICIONAR / REMOVER AGENDA ---
  async function handleInlineSubmit(e, hour) {
      e.preventDefault();
      if (!novoEvento.titulo) {
          setAddingAtHour(null);
          return;
      }
      
      const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;
      
      const { error } = await supabase.from('agenda').insert([{
          user_id: user.id,
          data: dataFormatada,
          hora: novoEvento.hora || hour,
          titulo: novoEvento.titulo
      }]);

      if (!error) {
          setAddingAtHour(null);
          fetchEventos();
      }
  }

  async function handleDeleteAgenda(id) {
      await supabase.from('agenda').delete().eq('id', id);
      fetchEventos();
  }

  // ==========================================
  // RENDERIZADOR: VISTA ANO (Bonitinho ✨)
  // ==========================================
  const renderYearView = () => (
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '15px', marginTop: '10px', paddingRight: '5px', overflowY: 'auto'}} className="hide-scrollbar">
          {nomesMeses.map((nomeMes, indexMes) => {
              const diasTotais = new Date(anoAtual, indexMes + 1, 0).getDate();
              const diaInicio = new Date(anoAtual, indexMes, 1).getDay();
              const diasVazios = Array(diaInicio).fill(null);
              const diasPreenchidos = Array.from({ length: diasTotais }, (_, i) => i + 1);
              const diasCalendario = [...diasVazios, ...diasPreenchidos];

              return (
                  <div key={nomeMes} onClick={() => { setDataAtual(new Date(anoAtual, indexMes, 1)); setViewMode('month'); }} className="year-month-card" style={{background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'}}>
                      <h4 style={{textAlign: 'center', margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b'}}>{nomeMes}</h4>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '5px'}}>
                          {diasSemana.map((d,i) => <div key={`wd-${i}`}>{d}</div>)}
                      </div>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', rowGap: '4px'}}>
                          {diasCalendario.map((dia, i) => {
                              if (!dia) return <div key={`empty-${i}`}></div>;
                              
                              // Verificar se é aniversário
                              const nivers = aniversariosAno.filter(p => {
                                  const d = new Date(p.data_nascimento);
                                  return d.getDate() === dia && d.getMonth() === indexMes;
                              });
                              const isNiver = nivers.length > 0;
                              const hojeReal = new Date();
                              const isToday = dia === hojeReal.getDate() && indexMes === hojeReal.getMonth() && anoAtual === hojeReal.getFullYear();

                              return (
                                  <div key={`d-${i}`} className={`year-day-cell ${isNiver ? 'has-niver' : ''}`} style={{
                                      aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '0.7rem', borderRadius: '50%',
                                      background: isToday ? '#2563eb' : (isNiver ? '#fef08a' : 'transparent'),
                                      color: isToday ? 'white' : (isNiver ? '#854d0e' : '#475569'),
                                      fontWeight: (isToday || isNiver) ? 'bold' : '500',
                                      position: 'relative'
                                  }}>
                                      {dia}
                                      {/* O Tooltip Mágico para os Aniversários */}
                                      {isNiver && (
                                          <div className="tooltip-niver">
                                              🎉 {nivers.map(n => n.nome.split(' ')[0]).join(', ')}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )
          })}
      </div>
  );

  // ==========================================
  // RENDERIZADOR: VISTA MÊS
  // ==========================================
  const renderMonthView = () => {
      const diasTotais = new Date(anoAtual, mesAtual + 1, 0).getDate();
      const diaInicio = new Date(anoAtual, mesAtual, 1).getDay();
      const diasVazios = Array(diaInicio).fill(null);
      const diasPreenchidos = Array.from({ length: diasTotais }, (_, i) => i + 1);
      const diasCalendario = [...diasVazios, ...diasPreenchidos];

      return (
          <>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '5px'}}>
                  {diasSemana.map((d,i) => <div key={i}>{d}</div>)}
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1, alignContent: 'start'}}>
                  {diasCalendario.map((dia, index) => {
                      if (!dia) return <div key={index} style={{background: '#f8fafc', borderRadius: '6px'}}></div>;
                      
                      const evtsDoDia = eventos.filter(e => e.dia === dia);
                      const hojeReal = new Date();
                      const isToday = dia === hojeReal.getDate() && mesAtual === hojeReal.getMonth() && anoAtual === hojeReal.getFullYear();

                      return (
                          <div key={index} 
                              onClick={() => { setDataAtual(new Date(anoAtual, mesAtual, dia)); setViewMode('day'); }}
                              style={{
                                  minHeight: '50px', display: 'flex', flexDirection: 'column', 
                                  borderRadius: '6px', background: isToday ? '#eff6ff' : 'white',
                                  border: isToday ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                                  padding: '4px', fontSize: '0.85rem', cursor: 'pointer', overflow: 'hidden'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                              onMouseOut={(e) => e.currentTarget.style.borderColor = isToday ? '#bfdbfe' : '#f1f5f9'}
                          >
                              <span style={{fontSize: '0.7rem', fontWeight: 'bold', color: isToday ? '#2563eb' : '#94a3b8', marginBottom: '2px'}}>{dia}</span>
                              <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                                  {evtsDoDia.slice(0, 2).map((ev, i) => (
                                      <div key={i} style={{fontSize: '0.6rem', background: ev.bg, color: ev.txt, padding: '2px 4px', borderRadius: '4px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                          {ev.displayName}
                                      </div>
                                  ))}
                                  {evtsDoDia.length > 2 && <span style={{fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center'}}>+{evtsDoDia.length - 2}</span>}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </>
      );
  };

  // ==========================================
  // RENDERIZADOR: VISTA DIA (Timeline Horizontal)
  // ==========================================
  const renderDayView = () => {
      const evtsHoje = eventos.filter(e => e.dia === diaAtual);
      const allDayEvts = evtsHoje.filter(e => !e.hora); 
      const timedEvts = evtsHoje.filter(e => e.hora);

      // Nova Timeline: 07:00 até 22:00
      const hours = Array.from({length: 16}, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

      return (
          <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              
              {/* Eventos de Dia Inteiro Fixos no topo */}
              {allDayEvts.length > 0 && (
                  <div style={{marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                      {allDayEvts.map((ev, i) => (
                          <div key={i} style={{background: ev.bg, color: ev.txt, padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
                              {ev.displayName}
                          </div>
                      ))}
                  </div>
              )}

              {/* TIMELINE ESTILO iPHONE */}
              <div ref={timelineRef} style={{flex: 1, overflowY: 'auto', paddingRight: '5px'}} className="custom-scrollbar hide-scrollbar">
                  <div style={{position: 'relative', marginTop: '10px'}}>
                      {hours.map(hour => {
                          const hourPrefix = hour.slice(0, 2);
                          const eventsInThisHour = timedEvts.filter(e => e.hora.startsWith(hourPrefix));
                          
                          return (
                              <div 
                                key={hour} 
                                className="timeline-row" 
                                style={{position: 'relative', minHeight: '60px', display: 'flex', cursor: 'pointer'}} 
                                onClick={() => { 
                                    if(addingAtHour !== hour) { 
                                        setAddingAtHour(hour); 
                                        setNovoEvento({ hora: hour, titulo: "" }); 
                                    }
                                }}
                              >
                                  {/* Coluna da Hora */}
                                  <div style={{width: '45px', textAlign: 'right', paddingRight: '12px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '500', transform: 'translateY(-8px)'}}>
                                      {hour}
                                  </div>
                                  
                                  {/* Espaço da Agenda e Linha Horizontal */}
                                  <div style={{flex: 1, borderTop: '1px solid #f1f5f9', position: 'relative', paddingBottom: '10px'}}>
                                      
                                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px'}}>
                                          {/* Blocos de Reunião */}
                                          {eventsInThisHour.map((ev, i) => (
                                              <div key={i} onClick={(e) => e.stopPropagation()} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: ev.bg, borderLeft: `4px solid ${ev.txt}`, padding: '8px 12px', borderRadius: '6px', marginRight: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                                                  <div style={{color: ev.txt, fontSize: '0.85rem', fontWeight: '600'}}>
                                                      <span style={{opacity: 0.7, marginRight: '8px'}}>{ev.hora}</span> {ev.fullTitle}
                                                  </div>
                                                  <button onClick={() => handleDeleteAgenda(ev.id)} style={{background: 'none', border: 'none', color: ev.txt, opacity: 0.5, cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px'}}>✕</button>
                                              </div>
                                          ))}

                                          {/* Formulário de Adicionar Evento super discreto */}
                                          {addingAtHour === hour && (
                                              <div onClick={e => e.stopPropagation()} style={{marginRight: '10px', marginTop: eventsInThisHour.length > 0 ? '4px' : '0'}}>
                                                  <form onSubmit={(e) => handleInlineSubmit(e, hour)} style={{display: 'flex', gap: '5px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '4px 8px'}}>
                                                      <input 
                                                          type="time" 
                                                          value={novoEvento.hora} 
                                                          onChange={e => setNovoEvento({...novoEvento, hora: e.target.value})} 
                                                          style={{border: 'none', background: 'transparent', outline: 'none', color: '#2563eb', fontWeight: 'bold', fontSize: '0.85rem', width: '70px'}} 
                                                      />
                                                      <input 
                                                          autoFocus
                                                          type="text" 
                                                          value={novoEvento.titulo}
                                                          onChange={e => setNovoEvento({...novoEvento, titulo: e.target.value})}
                                                          onBlur={() => { if(!novoEvento.titulo) setAddingAtHour(null); }}
                                                          placeholder="Reunião... (Enter para gravar)"
                                                          style={{flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#1e293b'}}
                                                      />
                                                      <button type="submit" style={{background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold'}}>+</button>
                                                  </form>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  const headerTitle = 
      viewMode === 'year' ? anoAtual :
      viewMode === 'month' ? `${nomesMeses[mesAtual]} ${anoAtual}` :
      `${diaAtual} de ${nomesMeses[mesAtual]}`;

  return (
    <div className="card" style={{height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '20px'}}>
      
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <div style={{display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px'}}>
            <button onClick={() => { setViewMode('day'); setAddingAtHour(null); }} style={{border: 'none', background: viewMode === 'day' ? 'white' : 'transparent', color: viewMode === 'day' ? '#2563eb' : '#64748b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'}}>Dia</button>
            <button onClick={() => { setViewMode('month'); setAddingAtHour(null); }} style={{border: 'none', background: viewMode === 'month' ? 'white' : 'transparent', color: viewMode === 'month' ? '#2563eb' : '#64748b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'}}>Mês</button>
            <button onClick={() => { setViewMode('year'); setAddingAtHour(null); }} style={{border: 'none', background: viewMode === 'year' ? 'white' : 'transparent', color: viewMode === 'year' ? '#2563eb' : '#64748b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'}}>Ano</button>
        </div>
        <button onClick={goToHoje} style={{border: 'none', background: 'transparent', color: '#64748b', textDecoration: 'underline', fontSize: '0.8rem', cursor: 'pointer'}}>Hoje</button>
      </div>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
        <h3 style={{margin: 0, fontSize: '1.2rem', color: '#1e293b'}}>{headerTitle}</h3>
        <div style={{display: 'flex', gap: '5px'}}>
            <button className="btn-small" onClick={handlePrev} style={{background: '#f8fafc', color: '#475569'}}>◀</button>
            <button className="btn-small" onClick={handleNext} style={{background: '#f8fafc', color: '#475569'}}>▶</button>
        </div>
      </div>

      {viewMode === 'year' && renderYearView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'day' && renderDayView()}

      {/* MAGIA CSS: Scrollbars ocultas, Tooltips elegantes e Efeitos Hover */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .timeline-row:hover > div:nth-child(2) { border-top-color: #cbd5e1 !important; transition: border 0.2s; }
        
        .year-month-card:hover { border-color: #bfdbfe !important; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.1) !important; transform: translateY(-2px); }
        .year-day-cell:hover:not(.has-niver) { background: #f1f5f9 !important; }
        .year-day-cell.has-niver:hover { filter: brightness(0.95); }

        .tooltip-niver {
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: 120%;
            left: 50%;
            transform: translateX(-50%);
            background: #1e293b;
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.65rem;
            white-space: nowrap;
            z-index: 100;
            transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            pointer-events: none;
        }
        .year-day-cell:hover .tooltip-niver {
            visibility: visible;
            opacity: 1;
            bottom: 135%;
        }
        .tooltip-niver::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            margin-left: -4px;
            border-width: 4px;
            border-style: solid;
            border-color: #1e293b transparent transparent transparent;
        }
      `}</style>
    </div>
  );
}