import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { formatAbsenceTypeLabel, normalizeAbsenceType } from "../utils/feriasSaldo";
import "../styles/calendar.css";

export default function WidgetCalendar({ onClose }) {
  const { user } = useAuth();
  
  // Estados Principais
  const [dataAtual, setDataAtual] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'year', 'month', 'day'
  const [eventos, setEventos] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Perfis / Aniversários
  const [aniversariosAno, setAniversariosAno] = useState([]);

  // Estados para Adicionar/Editar Evento Inline (Vista Diária)
  const [addingAtHour, setAddingAtHour] = useState(null);
  const [novoEvento, setNovoEvento] = useState({ hora: "", titulo: "" });
  
  // 💡 NOVO: Estados para Edição e Arrastar
  const [editingEvent, setEditingEvent] = useState(null);
  const [draggedEventId, setDraggedEventId] = useState(null);

  const timelineRef = useRef(null);

  // Direção da animação ao mudar de mês/ano e hora atual (linha vermelha "agora")
  const [navDir, setNavDir] = useState("zoom");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 60000);
      return () => clearInterval(id);
  }, []);

  const diaAtual = dataAtual.getDate();
  const mesAtual = dataAtual.getMonth();
  const anoAtual = dataAtual.getFullYear();

  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- ALGORITMO PARA CALCULAR FERIADOS NACIONAIS + FARO ---
  const getFeriados = (ano) => {
      const a = ano % 19; const b = Math.floor(ano / 100); const c = ano % 100;
      const d = Math.floor(b / 4); const e = b % 4;
      const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4); const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31) - 1;
      const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;
      
      const pascoa = new Date(ano, mesPascoa, diaPascoa);
      const sextaSanta = new Date(pascoa); sextaSanta.setDate(pascoa.getDate() - 2);
      const carnaval = new Date(pascoa); carnaval.setDate(pascoa.getDate() - 47);
      const corpoDeus = new Date(pascoa); corpoDeus.setDate(pascoa.getDate() + 60);

      return [
          { d: 1, m: 0, nome: "Ano Novo" },
          { d: carnaval.getDate(), m: carnaval.getMonth(), nome: "Carnaval" },
          { d: sextaSanta.getDate(), m: sextaSanta.getMonth(), nome: "Sexta-feira Santa" },
          { d: pascoa.getDate(), m: pascoa.getMonth(), nome: "Páscoa" },
          { d: 25, m: 3, nome: "Dia da Liberdade" },
          { d: 1, m: 4, nome: "Dia do Trabalhador" },
          { d: corpoDeus.getDate(), m: corpoDeus.getMonth(), nome: "Corpo de Deus" },
          { d: 10, m: 5, nome: "Dia de Portugal" },
          { d: 15, m: 7, nome: "Assunção de N. Senhora" },
          { d: 7, m: 8, nome: "Feriado de Faro" }, 
          { d: 5, m: 9, nome: "Implantação da República" },
          { d: 1, m: 10, nome: "Todos os Santos" },
          { d: 1, m: 11, nome: "Restauração da Independência" },
          { d: 8, m: 11, nome: "Imaculada Conceição" },
          { d: 25, m: 11, nome: "Natal" }
      ];
  };

    useEffect(() => {
        if(user) {
            supabase
                .from("profiles")
                .select("nome, data_nascimento")
                .neq("ativo", false)
                .then(({data}) => {
                    if(data) setAniversariosAno(data.filter(p => p.data_nascimento));
                });
        }
    }, [user]);

  useEffect(() => {
    if(user) fetchEventos();
  }, [mesAtual, anoAtual, user, aniversariosAno]);

  // Ao abrir um dia, a linha do tempo vai para a hora atual (hoje) ou para as 8h
  useEffect(() => {
      if ((viewMode === 'day' || viewMode === 'month') && timelineRef.current) {
          const t = new Date();
          const sameDay = dataAtual.toDateString() === t.toDateString();
          const hour = sameDay ? Math.max(7, t.getHours() - 1) : 8;
          timelineRef.current.scrollTo({ top: (hour - 7) * 56, behavior: 'smooth' });
      }
  }, [viewMode, dataAtual]);

  async function fetchEventos() {
    setLoading(true);
    let listaEventos = [];

    const inicioMesStr = new Date(anoAtual, mesAtual, 1).toISOString().split('T')[0];
    const fimMesStr = new Date(anoAtual, mesAtual + 1, 0).toISOString().split('T')[0];

    // 0. Feriados
    const feriadosDesteAno = getFeriados(anoAtual);
    feriadosDesteAno.forEach(f => {
        if (f.m === mesAtual) {
            listaEventos.push({
                dia: f.d, tipo: 'feriado', hora: null,
                displayName: f.nome, 
                bg: '#fee2e2', txt: '#991b1b',
                fullTitle: `Feriado: ${f.nome}`
            });
        }
    });

    // 1. Aniversários 
    aniversariosAno.forEach(p => {
        const nasc = new Date(p.data_nascimento);
        if (nasc.getMonth() === mesAtual) {
            listaEventos.push({
                dia: nasc.getDate(), tipo: 'aniversario', hora: null,
                displayName: `Aniversário de ${p.nome.split(' ')[0]}`, 
                bg: '#fef08a', txt: '#854d0e',
                fullTitle: `Aniversário de ${p.nome}`
            });
        }
    });

    // 2. Férias e Ausências
    const { data: ferias } = await supabase
        .from("ferias")
        .select("data_inicio, data_fim, tipo")
        .eq("user_id", user.id)
        .eq("estado", "aprovado")
        .not("tipo", "ilike", "%km%")
        .lte("data_inicio", fimMesStr)
        .gte("data_fim", inicioMesStr);

    if (ferias) {
        ferias.forEach(f => {
            const inicio = new Date(f.data_inicio);
            const fim = new Date(f.data_fim);
            const tipoNormalizado = normalizeAbsenceType(f.tipo);
            let bg = '#f59e0b';
            if(tipoNormalizado.includes('falta')) { bg = '#ef4444'; }
            if(tipoNormalizado.includes('baixa') || tipoNormalizado.includes('doenca') || tipoNormalizado.includes('acidente')) { bg = '#a855f7'; }

            const tipoFormatado = formatAbsenceTypeLabel(f.tipo);
            for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
                    listaEventos.push({
                        dia: d.getDate(), tipo: 'ausencia', hora: null,
                        displayName: tipoFormatado,
                        bg: bg, txt: 'white', fullTitle: `${tipoFormatado} (Aprovado)`
                    });
                }
            }
        });
    }

    // 3. Agenda Personalizada 
    const { data: agenda } = await supabase.from("agenda").select("*").eq("user_id", user.id).gte("data", inicioMesStr).lte("data", fimMesStr);

    if (agenda) {
        agenda.forEach(a => {
            const dataAgenda = new Date(a.data);
            listaEventos.push({
                id: a.id, dia: dataAgenda.getDate(), tipo: 'agenda', hora: a.hora.slice(0, 5), 
                displayName: `${a.hora.slice(0, 5)} ${a.titulo}`, 
                bg: 'var(--color-bgTertiary)', txt: 'var(--color-btnPrimary)', fullTitle: a.titulo
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

  // --- NAVEGAÇÃO DE DATAS ---
  function handlePrev() {
      setAddingAtHour(null); setEditingEvent(null); setNavDir('prev');
      const d = new Date(dataAtual);
      if (viewMode === 'year') d.setFullYear(d.getFullYear() - 1);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else if (viewMode === 'day') d.setDate(d.getDate() - 1);
      setDataAtual(d);
  }

  function handleNext() {
      setAddingAtHour(null); setEditingEvent(null); setNavDir('next');
      const d = new Date(dataAtual);
      if (viewMode === 'year') d.setFullYear(d.getFullYear() + 1);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else if (viewMode === 'day') d.setDate(d.getDate() + 1);
      setDataAtual(d);
  }

  function goToHoje() {
      setAddingAtHour(null); setEditingEvent(null);
      setNavDir('zoom');
      setDataAtual(new Date());
      if (viewMode === 'year') setViewMode('month');
  }

  // --- ACÕES DA AGENDA (CRIAR / EDITAR / APAGAR) ---
  async function handleInlineSubmit(e, hour) {
      e.preventDefault();
      if (!novoEvento.titulo) { setAddingAtHour(null); return; }
      
      const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;
      const { error } = await supabase.from('agenda').insert([{ user_id: user.id, data: dataFormatada, hora: novoEvento.hora || hour, titulo: novoEvento.titulo }]);
      if (!error) { setAddingAtHour(null); fetchEventos(); }
  }

  const startEditing = (e, ev) => {
      e.stopPropagation();
      setAddingAtHour(null);
      setEditingEvent({ id: ev.id, titulo: ev.fullTitle, hora: ev.hora });
  };

  async function handleEditSubmit(e) {
      e.preventDefault();
      if (!editingEvent.titulo) return;
      
      const { error } = await supabase.from('agenda').update({ 
          titulo: editingEvent.titulo, 
          hora: editingEvent.hora 
      }).eq('id', editingEvent.id);
      
      if (!error) {
          setEditingEvent(null);
          fetchEventos();
      }
  }

  async function handleDeleteAgenda(id) {
      await supabase.from('agenda').delete().eq('id', id);
      fetchEventos();
  }

  // --- DRAG AND DROP HANDLERS ---
  const onDragStartEvent = (e, id) => {
      e.dataTransfer.setData("eventId", id);
      setDraggedEventId(id);
  };

  const onDragOverRow = (e) => {
      e.preventDefault(); // Necessário para permitir o drop
  };

  const onDropRow = async (e, targetHourBlock) => {
      e.preventDefault();
      const eventId = e.dataTransfer.getData("eventId");
      setDraggedEventId(null);
      
      if (!eventId) return;

      const evtToMove = eventos.find(ev => ev.id == eventId);
      if (!evtToMove || evtToMove.tipo !== 'agenda') return;

      // Mantém os minutos originais, muda apenas a hora para o bloco alvo
      const oldMinutes = evtToMove.hora.split(":")[1];
      const newHourBlock = targetHourBlock.split(":")[0];
      const exactNewTime = `${newHourBlock}:${oldMinutes}`;

      // Update Optimista (Visual imediato)
      setEventos(prev => prev.map(ev => ev.id == eventId ? { ...ev, hora: exactNewTime, displayName: `${exactNewTime} ${ev.fullTitle}` } : ev).sort((a,b) => (a.hora||'').localeCompare(b.hora||'')));

      // Update Base de Dados
      await supabase.from('agenda').update({ hora: exactNewTime }).eq('id', eventId);
  };


  // ==========================================
  // ESTILO iOS — utilitários
  // ==========================================
  const diasSemanaSeg = ["S", "T", "Q", "Q", "S", "S", "D"]; // começa à segunda
  const nomesDiasLongos = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const HOUR_START = 7;
  const HOUR_END = 22;
  const ROW_H = 56;

  const evColor = (ev) => {
      if (ev.tipo === 'feriado') return '#ef4444';
      if (ev.tipo === 'aniversario') return '#f59e0b';
      if (ev.tipo === 'ausencia') return ev.bg || '#f59e0b';
      return 'var(--color-btnPrimary)';
  };
  const evIcon = (ev) => (ev.tipo === 'feriado' ? '🎌' : ev.tipo === 'aniversario' ? '🎂' : ev.tipo === 'ausencia' ? '🌴' : null);

  const isSameDay = (a, b) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const isTodayDate = (d) => isSameDay(d, now);

  const selectDay = (date) => {
      setAddingAtHour(null); setEditingEvent(null);
      const changesMonth = date.getMonth() !== mesAtual || date.getFullYear() !== anoAtual;
      if (changesMonth) setNavDir(date > dataAtual ? 'next' : 'prev');
      setDataAtual(date);
  };

  const renderDots = (evts, max = 3) => {
      const colors = [];
      evts.forEach((ev) => { const c = evColor(ev); if (!colors.includes(c)) colors.push(c); });
      return (
          <span className="cal-dots">
              {colors.slice(0, max).map((c) => <i key={c} style={{ background: c }} />)}
          </span>
      );
  };

  // ==========================================
  // VISTA ANO
  // ==========================================
  const renderYearView = () => {
      const feriadosAno = getFeriados(anoAtual);
      return (
          <div className={`cal-year cal-slide-${navDir}`} key={`y-${anoAtual}`}>
              {nomesMeses.map((nomeMes, indexMes) => {
                  const diasTotais = new Date(anoAtual, indexMes + 1, 0).getDate();
                  const offset = (new Date(anoAtual, indexMes, 1).getDay() + 6) % 7;
                  const cells = [...Array(offset).fill(null), ...Array.from({ length: diasTotais }, (_, i) => i + 1)];
                  const isCurrentMonth = indexMes === now.getMonth() && anoAtual === now.getFullYear();
                  return (
                      <button
                          type="button"
                          key={nomeMes}
                          className={`cal-mini ${isCurrentMonth ? 'is-current' : ''}`}
                          onClick={() => { setNavDir('zoom'); setDataAtual(new Date(anoAtual, indexMes, 1)); setViewMode('month'); }}
                          style={{ '--k': indexMes }}
                      >
                          <span className="cal-mini-title">{nomeMes}</span>
                          <span className="cal-mini-grid">
                              {cells.map((dia, i) => {
                                  if (!dia) return <span key={`e-${i}`} />;
                                  const isToday = isCurrentMonth && dia === now.getDate();
                                  const isFeriado = feriadosAno.some((f) => f.d === dia && f.m === indexMes);
                                  const isNiver = aniversariosAno.some((p) => { const n = new Date(p.data_nascimento); return n.getDate() === dia && n.getMonth() === indexMes; });
                                  const weekend = (i % 7) >= 5;
                                  return (
                                      <span key={`d-${i}`} className={`cal-mini-day ${isToday ? 'is-today' : ''} ${isFeriado ? 'is-holiday' : ''} ${isNiver ? 'is-bday' : ''} ${weekend ? 'is-weekend' : ''}`}>
                                          {dia}
                                      </span>
                                  );
                              })}
                          </span>
                      </button>
                  );
              })}
          </div>
      );
  };

  // ==========================================
  // VISTA MÊS (grelha + painel do dia)
  // ==========================================
  const renderMonthGrid = () => {
      const diasTotais = new Date(anoAtual, mesAtual + 1, 0).getDate();
      const offset = (new Date(anoAtual, mesAtual, 1).getDay() + 6) % 7;
      const prevMonthDays = new Date(anoAtual, mesAtual, 0).getDate();
      const cells = [];
      for (let i = offset - 1; i >= 0; i--) cells.push({ date: new Date(anoAtual, mesAtual - 1, prevMonthDays - i), outside: true });
      for (let d = 1; d <= diasTotais; d++) cells.push({ date: new Date(anoAtual, mesAtual, d), outside: false });
      while (cells.length % 7 !== 0) {
          const last = cells[cells.length - 1].date;
          cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true });
      }

      return (
          <div className="cal-month">
              <div className="cal-weekdays">
                  {diasSemanaSeg.map((d, i) => <span key={i} className={i >= 5 ? 'is-weekend' : ''}>{d}</span>)}
              </div>
              <div className={`cal-grid cal-slide-${navDir}`} key={`m-${anoAtual}-${mesAtual}`}>
                  {cells.map(({ date, outside }, index) => {
                      const dia = date.getDate();
                      const evts = outside ? [] : eventos.filter((e) => e.dia === dia);
                      const isToday = isTodayDate(date);
                      const isSelected = !outside && isSameDay(date, dataAtual);
                      const isHoliday = evts.some((e) => e.tipo === 'feriado');
                      const weekend = index % 7 >= 5;
                      return (
                          <button
                              type="button"
                              key={date.toISOString()}
                              className={`cal-day ${outside ? 'is-outside' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${isHoliday ? 'is-holiday' : ''} ${weekend ? 'is-weekend' : ''}`}
                              onClick={() => selectDay(date)}
                              onDoubleClick={() => { selectDay(date); setViewMode('day'); }}
                              title={evts.map((e) => e.fullTitle).join('\n') || undefined}
                          >
                              <span className="cal-day-num">{dia}</span>
                              <span className="cal-day-events">
                                  {evts.slice(0, 2).map((ev, i) => (
                                      <span key={i} className="cal-day-pill" style={{ '--ev': evColor(ev) }}>{ev.tipo === 'agenda' ? ev.fullTitle : ev.displayName}</span>
                                  ))}
                                  {evts.length > 2 && <span className="cal-day-more">+{evts.length - 2}</span>}
                              </span>
                              {evts.length > 0 && renderDots(evts)}
                          </button>
                      );
                  })}
              </div>
          </div>
      );
  };

  // ==========================================
  // LINHA DO TEMPO DO DIA (usada no painel e na vista Dia)
  // ==========================================
  const renderTimeline = (compact = false) => {
      const evtsHoje = eventos.filter(e => e.dia === diaAtual);
      const allDayEvts = evtsHoje.filter(e => !e.hora);
      const timedEvts = evtsHoje.filter(e => e.hora);
      const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => `${String(i + HOUR_START).padStart(2, '0')}:00`);
      const showNow = isTodayDate(dataAtual) && now.getHours() >= HOUR_START && now.getHours() <= HOUR_END;
      const nowTop = (now.getHours() - HOUR_START + now.getMinutes() / 60) * ROW_H;

      return (
          <div className={`cal-timeline ${compact ? 'is-compact' : ''}`}>
              {allDayEvts.length > 0 && (
                  <div className="cal-allday">
                      <span className="cal-allday-label">todo o dia</span>
                      <div className="cal-allday-list">
                          {allDayEvts.map((ev, i) => (
                              <span key={i} className="cal-allday-pill" style={{ '--ev': evColor(ev) }}>
                                  {evIcon(ev) && <span aria-hidden="true">{evIcon(ev)}</span>} {ev.displayName}
                              </span>
                          ))}
                      </div>
                  </div>
              )}

              <div ref={timelineRef} className="cal-hours">
                  <div className="cal-hours-inner">
                      {showNow && (
                          <div className="cal-now" style={{ top: nowTop }}>
                              <span className="cal-now-time">{now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="cal-now-line" />
                          </div>
                      )}

                      {hours.map(hour => {
                          const hourPrefix = hour.slice(0, 2);
                          const eventsInThisHour = timedEvts.filter(e => e.hora.startsWith(hourPrefix));

                          return (
                              <div
                                  key={hour}
                                  className={`cal-hour ${addingAtHour === hour ? 'is-adding' : ''}`}
                                  style={{ minHeight: ROW_H }}
                                  onClick={() => { if (addingAtHour !== hour && !editingEvent) { setAddingAtHour(hour); setNovoEvento({ hora: hour, titulo: "" }); } }}
                                  onDragOver={onDragOverRow}
                                  onDrop={(e) => onDropRow(e, hour)}
                              >
                                  <span className="cal-hour-label">{hour}</span>
                                  <div className="cal-hour-slot">
                                      {eventsInThisHour.map((ev, i) => {
                                          if (editingEvent?.id === ev.id) {
                                              return (
                                                  <form key={i} onClick={e => e.stopPropagation()} onSubmit={handleEditSubmit} className="cal-inline-form">
                                                      <input type="time" value={editingEvent.hora} onChange={e => setEditingEvent({...editingEvent, hora: e.target.value})} required />
                                                      <input autoFocus type="text" value={editingEvent.titulo} onChange={e => setEditingEvent({...editingEvent, titulo: e.target.value})} placeholder="Título do evento..." required />
                                                      <button type="button" className="cal-inline-cancel" onClick={() => setEditingEvent(null)} aria-label="Cancelar">✕</button>
                                                      <button type="submit" className="cal-inline-save">Gravar</button>
                                                  </form>
                                              );
                                          }
                                          const isDraggable = ev.tipo === 'agenda';
                                          return (
                                              <div
                                                  key={i}
                                                  draggable={isDraggable}
                                                  onDragStart={(e) => isDraggable ? onDragStartEvent(e, ev.id) : null}
                                                  onDragEnd={() => setDraggedEventId(null)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className={`cal-event ${isDraggable ? 'is-draggable' : ''} ${draggedEventId === ev.id ? 'is-dragging' : ''}`}
                                                  style={{ '--ev': evColor(ev) }}
                                              >
                                                  <div className="cal-event-text">
                                                      <strong>{ev.fullTitle}</strong>
                                                      <span>{ev.hora}</span>
                                                  </div>
                                                  {isDraggable && (
                                                      <div className="cal-event-actions">
                                                          <button type="button" onClick={(e) => startEditing(e, ev)} aria-label="Editar">
                                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                                          </button>
                                                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteAgenda(ev.id); }} aria-label="Apagar">
                                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                          </button>
                                                      </div>
                                                  )}
                                              </div>
                                          );
                                      })}

                                      {addingAtHour === hour && !editingEvent && (
                                          <form onClick={e => e.stopPropagation()} onSubmit={(e) => handleInlineSubmit(e, hour)} className="cal-inline-form is-new">
                                              <input type="time" value={novoEvento.hora} onChange={e => setNovoEvento({...novoEvento, hora: e.target.value})} />
                                              <input autoFocus type="text" value={novoEvento.titulo} onChange={e => setNovoEvento({...novoEvento, titulo: e.target.value})} onBlur={() => { if (!novoEvento.titulo) setAddingAtHour(null); }} placeholder="Novo evento — Enter para gravar" />
                                              <button type="submit" className="cal-inline-save">Adicionar</button>
                                          </form>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  // Faixa da semana (vista Dia), como no iPhone
  const renderWeekStrip = () => {
      const start = new Date(dataAtual);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
      return (
          <div className="cal-week" key={`w-${start.toDateString()}`}>
              {days.map((d, i) => {
                  const sel = isSameDay(d, dataAtual);
                  const hasEv = d.getMonth() === mesAtual && eventos.some((e) => e.dia === d.getDate());
                  return (
                      <button type="button" key={i} className={`cal-week-day ${sel ? 'is-selected' : ''} ${isTodayDate(d) ? 'is-today' : ''}`} onClick={() => selectDay(d)}>
                          <span className="cal-week-letter">{diasSemanaSeg[i]}</span>
                          <span className="cal-week-num">{d.getDate()}</span>
                          <span className={`cal-week-dot ${hasEv ? 'is-on' : ''}`} />
                      </button>
                  );
              })}
          </div>
      );
  };

  const selectedLabel = `${nomesDiasLongos[dataAtual.getDay()]}, ${diaAtual} de ${nomesMeses[mesAtual]}`;
  const selectedCount = eventos.filter((e) => e.dia === diaAtual).length;

  const switchView = (mode) => { setNavDir('zoom'); setViewMode(mode); setAddingAtHour(null); setEditingEvent(null); };

  return (
    <div className={`cal cal-view-${viewMode}`}>
      {/* CABEÇALHO */}
      <header className="cal-head">
        <div className="cal-title">
          <button type="button" className="cal-title-btn" onClick={() => viewMode !== 'year' && switchView(viewMode === 'day' ? 'month' : 'year')} title={viewMode === 'year' ? '' : 'Ver vista acima'}>
            {viewMode === 'year' ? (
              <span className="cal-title-main">{anoAtual}</span>
            ) : (
              <>
                <span className="cal-title-main">{nomesMeses[mesAtual]}</span>
                <span className="cal-title-year">{anoAtual}</span>
              </>
            )}
          </button>
          {loading && <span className="cal-loading" aria-label="A carregar" />}
        </div>

        <div className="cal-head-tools">
          <div className="cal-segment" data-value={viewMode}>
            <span className="cal-segment-pill" aria-hidden="true" />
            <button type="button" className={viewMode === 'day' ? 'is-on' : ''} onClick={() => switchView('day')}>Dia</button>
            <button type="button" className={viewMode === 'month' ? 'is-on' : ''} onClick={() => switchView('month')}>Mês</button>
            <button type="button" className={viewMode === 'year' ? 'is-on' : ''} onClick={() => switchView('year')}>Ano</button>
          </div>
          <div className="cal-nav">
            <button type="button" onClick={handlePrev} aria-label="Anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button type="button" className="cal-today-btn" onClick={goToHoje}>Hoje</button>
            <button type="button" onClick={handleNext} aria-label="Seguinte">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          {onClose && (
            <button type="button" className="cal-close" onClick={onClose} aria-label="Fechar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>
      </header>

      {/* CORPO */}
      <div className="cal-body">
        {viewMode === 'year' && renderYearView()}

        {viewMode === 'month' && (
          <div className="cal-split">
            {renderMonthGrid()}
            <aside className="cal-daypanel">
              <div className="cal-daypanel-head">
                <div>
                  <span className={`cal-daypanel-badge ${isTodayDate(dataAtual) ? 'is-today' : ''}`}>{diaAtual}</span>
                </div>
                <div className="cal-daypanel-text">
                  <strong>{selectedLabel}</strong>
                  <span>{selectedCount === 0 ? 'Sem eventos' : `${selectedCount} ${selectedCount === 1 ? 'evento' : 'eventos'}`}{isTodayDate(dataAtual) ? ' · Hoje' : ''}</span>
                </div>
                <button type="button" className="cal-open-day" onClick={() => switchView('day')}>Abrir dia</button>
              </div>
              {renderTimeline(true)}
            </aside>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="cal-dayview">
            {renderWeekStrip()}
            <div className="cal-dayview-title">
              <strong>{selectedLabel}</strong>
              <span>Clica numa hora para adicionar · arrasta os teus eventos para mudar a hora</span>
            </div>
            {renderTimeline(false)}
          </div>
        )}
      </div>

      <div className="cal-legend">
        <span><i style={{ background: 'var(--color-btnPrimary)' }} /> Os meus eventos</span>
        <span><i style={{ background: '#ef4444' }} /> Feriados</span>
        <span><i style={{ background: '#f59e0b' }} /> Aniversários · Férias</span>
        <span><i style={{ background: '#a855f7' }} /> Baixas</span>
      </div>
    </div>
  );
}
