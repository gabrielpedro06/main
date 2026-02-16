import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css"; 

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default function RecursosHumanos() {
  const { user } = useAuth();
  
  const [colaboradores, setColaboradores] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); 
  
  // Dados
  const [pedidosPendentes, setPedidosPendentes] = useState([]); 
  const [assiduidadeMes, setAssiduidadeMes] = useState([]);
  const [ausenciasMes, setAusenciasMes] = useState([]);
  const [historicoUser, setHistoricoUser] = useState([]); 

  // UI States
  const [activeView, setActiveView] = useState("gestao"); 
  const [globalSA, setGlobalSA] = useState(10.20); 
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // UI Abas do Colaborador
  const [userTab, setUserTab] = useState("financeiro"); 
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [tempUserProfile, setTempUserProfile] = useState({}); 

  // Modais
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [newAbsence, setNewAbsence] = useState({ user_id: "", tipo: "ferias", data_inicio: "", data_fim: "", motivo: "" });
  const [confirmModal, setConfirmModal] = useState({ show: false, pedido: null, acao: null });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchColaboradores();
    fetchPedidosPendentes(); 
  }, []);

  useEffect(() => {
    if (colaboradores.length > 0) {
      fetchDadosMensais();
      if(selectedUser) {
          const u = colaboradores.find(c => c.id === selectedUser);
          setTempUserProfile(u || {});
          fetchHistoricoUser(selectedUser);
      } else {
          setHistoricoUser([]);
      }
    }
  }, [selectedUser, currentDate, colaboradores]);

  const showNotification = (msg, type = 'success') => {
      setNotification({ show: true, message: msg, type });
  };

  async function fetchColaboradores() {
    const { data } = await supabase.from("profiles").select("*").order("nome");
    setColaboradores(data || []);
  }

  async function fetchPedidosPendentes() {
    const { data, error } = await supabase
        .from("ferias")
        .select("*, profiles(nome, empresa_interna)")
        .in("estado", ["pendente", "pedido_cancelamento"]) 
        .order("created_at", { ascending: false });
    if(!error && data) setPedidosPendentes(data);
  }

  async function fetchHistoricoUser(userId) {
      const { data } = await supabase
          .from("ferias")
          .select("*")
          .eq("user_id", userId)
          .order("data_inicio", { ascending: false });
      if (data) setHistoricoUser(data);
  }

  async function fetchDadosMensais() {
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

        let qAssiduidade = supabase.from("assiduidade").select("*").gte("data_registo", startOfMonth).lte("data_registo", endOfMonth);
        if (selectedUser) qAssiduidade = qAssiduidade.eq("user_id", selectedUser);
        const { data: dAssiduidade } = await qAssiduidade;
        setAssiduidadeMes(dAssiduidade || []);

        let qFerias = supabase.from("ferias").select("*").gte("data_inicio", startOfMonth).lte("data_inicio", endOfMonth).eq('estado', 'aprovado'); 
        if (selectedUser) qFerias = qFerias.eq("user_id", selectedUser);
        const { data: dFerias } = await qFerias;
        setAusenciasMes(dFerias || []);
    } catch (err) { console.error(err); }
  }

  function calcularDiasUteis(dataInicio, dataFim) {
      let count = 0;
      let current = new Date(dataInicio);
      const end = new Date(dataFim);
      while (current <= end) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) count++; 
          current.setDate(current.getDate() + 1);
      }
      return count;
  }

  function abrirModalConfirmacao(pedido, acao) {
      setConfirmModal({ show: true, pedido, acao });
  }

  // --- AÇÕES DE RH ---
  async function executarAcaoRH() {
      const { pedido, acao } = confirmModal;
      try {
          const tipoNormalizado = pedido.tipo ? pedido.tipo.toLowerCase() : '';
          const eFerias = tipoNormalizado.includes('férias') || tipoNormalizado.includes('ferias');
          const diasUteis = calcularDiasUteis(pedido.data_inicio, pedido.data_fim);
          let novoEstadoDB = '';

          if (acao === 'aprovar') {
              if (eFerias) {
                  const { data: userProf } = await supabase.from('profiles').select('dias_ferias').eq('id', pedido.user_id).single();
                  await supabase.from('profiles').update({ dias_ferias: (userProf?.dias_ferias ?? 22) - diasUteis }).eq('id', pedido.user_id);
              }
              novoEstadoDB = 'aprovado';
          } 
          else if (acao === 'rejeitar') novoEstadoDB = 'rejeitado';
          else if (acao === 'aceitar_cancelamento' || acao === 'cancelar_direto') {
              if (eFerias) {
                  const { data: userProf } = await supabase.from('profiles').select('dias_ferias').eq('id', pedido.user_id).single();
                  await supabase.from('profiles').update({ dias_ferias: (userProf?.dias_ferias ?? 22) + diasUteis }).eq('id', pedido.user_id);
              }
              novoEstadoDB = 'cancelado';
          }
          else if (acao === 'recusar_cancelamento') novoEstadoDB = 'aprovado';

          const { error } = await supabase.from("ferias").update({ estado: novoEstadoDB }).eq("id", pedido.id);
          if(error) throw error;
          
          setPedidosPendentes(pedidosPendentes.filter(p => p.id !== pedido.id));
          if (selectedUser) fetchHistoricoUser(selectedUser);
          fetchDadosMensais();
          fetchColaboradores();
          
          setConfirmModal({ show: false, pedido: null, acao: null });
          showNotification("Ação executada com sucesso!", "success"); 
      } catch (error) {
          showNotification("Erro ao processar: " + error.message, "error"); 
      }
  }

  // --- ATUALIZAR DADOS DO UTILIZADOR ---
  async function handleUpdateUserProfile() {
      if(!selectedUser) return;
      try {
          const { error } = await supabase.from("profiles").update({
              valor_sa: tempUserProfile.valor_sa,
              dias_ferias: tempUserProfile.dias_ferias,
              empresa_interna: tempUserProfile.empresa_interna,
              funcao: tempUserProfile.funcao,
              nome_completo: tempUserProfile.nome_completo,
              nif: tempUserProfile.nif,
              niss: tempUserProfile.niss,
              ncc: tempUserProfile.ncc,
              nr_dependentes: tempUserProfile.nr_dependentes,
              estado_civil: tempUserProfile.estado_civil,
              morada: tempUserProfile.morada,
              telemovel: tempUserProfile.telemovel,
              data_nascimento: tempUserProfile.data_nascimento,
              tipo_contrato: tempUserProfile.tipo_contrato,
              nacionalidade: tempUserProfile.nacionalidade,
              sexo: tempUserProfile.sexo,
              concelho: tempUserProfile.concelho
          }).eq("id", selectedUser);

          if(error) throw error;

          setIsEditingUser(false);
          fetchColaboradores();
          showNotification("Dados atualizados com sucesso!", "success"); 
      } catch (err) {
          showNotification("Erro ao atualizar: " + err.message, "error");
      }
  }

  async function handleBulkUpdateSA() {
      if(!window.confirm(`Tem a certeza que quer alterar o S.A. de TODOS para ${globalSA}€?`)) return;
      const { error } = await supabase.from("profiles").update({ valor_sa: globalSA }).neq('id', '00000000-0000-0000-0000-000000000000'); 
      if(!error) { fetchColaboradores(); showNotification("S.A. atualizado para todos!", "success"); }
  }

  async function handleAddAbsence(e) {
      e.preventDefault();
      try {
          if (newAbsence.tipo.toLowerCase().includes('ferias') || newAbsence.tipo.toLowerCase().includes('férias')) {
             const diasA_Descontar = calcularDiasUteis(newAbsence.data_inicio, newAbsence.data_fim);
             const { data: userProf } = await supabase.from('profiles').select('dias_ferias').eq('id', newAbsence.user_id).single();
             await supabase.from('profiles').update({ dias_ferias: (userProf?.dias_ferias ?? 22) - diasA_Descontar }).eq('id', newAbsence.user_id);
          }
          const { error } = await supabase.from("ferias").insert([{ ...newAbsence, estado: 'aprovado' }]); 
          if(error) throw error;

          setShowAbsenceModal(false);
          fetchDadosMensais();
          if(selectedUser) fetchHistoricoUser(selectedUser);
          fetchColaboradores(); 
          showNotification("Ausência registada!", "success"); 
      } catch(err) { showNotification("Erro: " + err.message, "error"); }
  }

  const downloadCSV = () => {
      if(!selectedUser) return alert("Selecione um colaborador.");
      const user = colaboradores.find(c => c.id === selectedUser);
      const rows = [["Data", "Entrada", "Saida", "Observacoes", "Tipo"]];
      assiduidadeMes.forEach(a => rows.push([a.data_registo, a.hora_entrada, a.hora_saida || "--:--", `"${a.observacoes || ''}"`, "Trabalho"]));
      ausenciasMes.forEach(a => rows.push([a.data_inicio + " a " + a.data_fim, "--:--", "--:--", a.motivo || "", a.tipo.toUpperCase()]));
      let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Relatorio_${user.nome}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getStats = () => {
      let countTrabalho = 0, countFerias = 0, countFaltas = 0, countBaixas = 0;
      const diasUnicos = new Set(assiduidadeMes.map(a => a.data_registo)).size;
      countTrabalho = diasUnicos;

      ausenciasMes.forEach(a => {
          const dias = calcularDiasUteis(a.data_inicio, a.data_fim);
          const t = a.tipo.toLowerCase();
          if (t.includes('férias') || t.includes('ferias')) countFerias += dias;
          else if (t.includes('falta')) countFaltas += dias;
          else if (t.includes('baixa')) countBaixas += dias;
      });

      let valorSA = "0.00";
      if (selectedUser) {
          const profile = colaboradores.find(c => c.id === selectedUser);
          const diarioSA = Number(profile?.valor_sa) || 0;
          valorSA = (countTrabalho * diarioSA).toFixed(2);
      }
      return { countTrabalho, countFerias, countFaltas, countBaixas, valorSA };
  };

  const stats = getStats();
  const currentUserProfile = colaboradores.find(c => c.id === selectedUser);

  // --- LÓGICA DE AUSENTES HOJE ---
  const getAusentesHoje = () => {
      const today = new Date().toISOString().split('T')[0];
      const lista = ausenciasMes.filter(a => a.data_inicio <= today && a.data_fim >= today);
      return lista.map(a => {
          const user = colaboradores.find(c => c.id === a.user_id);
          return { ...a, nomeUser: user?.nome || 'Desconhecido' };
      });
  };
  const ausentesHoje = getAusentesHoje();

  // --- NOVA LÓGICA: ANIVERSARIANTES DO MÊS ---
  const getAniversariantesDoMes = () => {
      const mesAtual = currentDate.getMonth();
      // Filtrar e ordenar por dia
      return colaboradores
          .filter(c => {
              if(!c.data_nascimento) return false;
              const d = new Date(c.data_nascimento);
              return d.getMonth() === mesAtual;
          })
          .sort((a, b) => {
              return new Date(a.data_nascimento).getDate() - new Date(b.data_nascimento).getDate();
          });
  };
  const aniversariantes = getAniversariantesDoMes();

  const ficheirosUser = historicoUser.filter(h => h.anexo_url);

  const renderCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay(); 
      const days = [];
      for (let i = 0; i < firstDayOfWeek; i++) days.push(<div key={`empty-${i}`}></div>);
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          let content = null, cellStyle = { background: '#fff', minHeight: '80px' };
          
          if (selectedUser) {
              const trabalhou = assiduidadeMes.some(a => a.data_registo === dateStr);
              const ausencia = ausenciasMes.find(a => a.data_inicio <= dateStr && a.data_fim >= dateStr);
              if (trabalhou) { cellStyle = { background: '#f0fdf4', borderColor: '#bbf7d0', minHeight: '80px' }; content = '✅'; } 
              else if (ausencia) {
                  const t = ausencia.tipo.toLowerCase();
                  if (t.includes('férias') || t.includes('ferias')) { cellStyle.background = '#fefce8'; content = '🏖️'; }
                  else if (t.includes('falta')) { cellStyle.background = '#fef2f2'; content = '❌'; }
                  else { cellStyle.background = '#faf5ff'; content = '🏥'; }
              }
          } else {
              const ausentesNoDia = ausenciasMes.filter(a => a.data_inicio <= dateStr && a.data_fim >= dateStr);
              if (ausentesNoDia.length > 0) {
                  content = (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginTop:'5px'}}>
                          {ausentesNoDia.map((a, i) => {
                              const user = colaboradores.find(c => c.id === a.user_id);
                              let barColor = '#fcd34d'; 
                              if (a.tipo?.toLowerCase().includes('falta')) barColor = '#fca5a5';
                              if (a.tipo?.toLowerCase().includes('baixa')) barColor = '#d8b4fe';
                              return <div key={i} title={`${user?.nome}: ${a.tipo}`} style={{height: '6px', background: barColor, borderRadius: '3px', width: '100%'}} />;
                          })}
                      </div>
                  );
              }
          }
          days.push(
              <div key={d} style={{border:'1px solid #f1f5f9', borderRadius:'8px', padding:'5px', display:'flex', flexDirection:'column', justifyContent:'space-between', ...cellStyle}}>
                  <span style={{fontSize:'0.75rem', color:'#94a3b8', fontWeight:'bold'}}>{d}</span>
                  <div style={{textAlign:'center', fontSize:'1.2rem', width: '100%'}}>{content}</div>
              </div>
          );
      }
      return days;
  };

  const changeMonth = (delta) => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + delta)));
  
  // Style for Read-Only Grid
  const readOnlyGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', rowGap: '10px', fontSize: '0.9rem', color: '#334151' };
  const readOnlyItemStyle = { display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' };
  const labelStyle = { color: '#64748b', fontSize: '0.75rem', marginBottom: '2px' };

  return (
    <div className="page-container" style={{padding: '20px'}}>
      
      {/* HEADER RH */}
      <div style={{marginBottom: '20px', background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'20px'}}>
            <div>
                <h1 style={{margin:0}}>👥 Gestão de RH</h1>
                <p style={{margin:'5px 0 0 0', color:'#64748b'}}>Aprovações, salários e dados pessoais.</p>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
                <button className={activeView === 'gestao' ? 'btn-primary' : 'btn-small'} onClick={() => setActiveView('gestao')} style={{padding: '10px 20px'}}>📊 Gestão</button>
                <button className={activeView === 'pedidos' ? 'btn-primary' : 'btn-small'} onClick={() => setActiveView('pedidos')} style={{padding: '10px 20px', position: 'relative'}}>
                  📥 Pedidos
                  {pedidosPendentes.length > 0 && <span style={{position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 'bold'}}>{pedidosPendentes.length}</span>}
                </button>
            </div>
        </div>
      </div>

      {/* VIEW: PEDIDOS PENDENTES */}
      {activeView === 'pedidos' && (
          <div className="card">
              <h3 style={{marginBottom: '20px', color: '#1e293b'}}>Aprovações Pendentes</h3>
              {pedidosPendentes.length > 0 ? (
                  <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr><th>Colaborador</th><th>Tipo</th><th>Período</th><th>Duração</th><th>Estado</th><th style={{textAlign: 'center'}}>Ação</th></tr>
                        </thead>
                        <tbody>
                            {pedidosPendentes.map(p => (
                                <tr key={p.id} style={{background: p.estado === 'pedido_cancelamento' ? '#fefce8' : 'transparent'}}>
                                    <td style={{fontWeight: 'bold', color: '#2563eb'}}>{p.profiles?.nome}</td>
                                    <td>{p.tipo}</td>
                                    <td>{new Date(p.data_inicio).toLocaleDateString()} a {new Date(p.data_fim).toLocaleDateString()}</td>
                                    <td>{calcularDiasUteis(p.data_inicio, p.data_fim)} dias</td>
                                    <td>
                                        {p.estado === 'pendente' ? <span className="badge badge-warning">Novo</span> : <span className="badge" style={{background: '#ca8a04', color: 'white'}}>⚠️ Cancelamento</span>}
                                    </td>
                                    <td style={{textAlign: 'center'}}>
                                        <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                            {p.estado === 'pendente' ? (
                                                <>
                                                    <button className="btn-small" style={{borderColor: '#16a34a', color: '#16a34a'}} onClick={() => abrirModalConfirmacao(p, 'aprovar')}>✔️</button>
                                                    <button className="btn-small" style={{borderColor: '#ef4444', color: '#ef4444'}} onClick={() => abrirModalConfirmacao(p, 'rejeitar')}>✖️</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button className="btn-small" style={{borderColor: '#ef4444', color: '#ef4444', fontWeight:'bold'}} onClick={() => abrirModalConfirmacao(p, 'aceitar_cancelamento')}>Aceitar</button>
                                                    <button className="btn-small" style={{borderColor: '#94a3b8', color: '#94a3b8'}} onClick={() => abrirModalConfirmacao(p, 'recusar_cancelamento')}>Recusar</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              ) : <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px'}}>Tudo limpo! 🎉</div>}
          </div>
      )}

      {/* VIEW: GESTÃO & CALENDÁRIO */}
      {activeView === 'gestao' && (
          <>
            <div style={{marginBottom: '20px', background:'white', padding:'15px 20px', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'15px', border: '1px solid #e2e8f0'}}>
                <div style={{background:'#f8fafc', padding:'10px 15px', borderRadius:'8px', display:'flex', alignItems:'center', gap:'10px', border:'1px solid #e2e8f0'}}>
                    <span style={{fontSize:'0.8rem', fontWeight:'bold', color:'#475569'}}>S.A. GLOBAL:</span>
                    <input type="number" step="0.01" value={globalSA} onChange={e => setGlobalSA(e.target.value)} style={{width:'60px', padding:'5px'}}/>
                    <button onClick={handleBulkUpdateSA} className="btn-small" style={{background:'#3b82f6', color:'white'}}>Aplicar</button>
                </div>
                <div style={{display:'flex', gap:'15px'}}>
                    <select value={selectedUser || ""} onChange={(e) => setSelectedUser(e.target.value || null)} style={{padding: '10px 15px', borderRadius: '8px', minWidth: '250px'}}>
                        <option value="">🏢 Visão Geral (Todos)</option>
                        {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <button onClick={() => { setNewAbsence(prev => ({...prev, user_id: selectedUser || ""})); setShowAbsenceModal(true); }} className="btn-primary" style={{padding: '10px 20px'}}>➕ Ausência Manual</button>
                </div>
            </div>

            <div className="rh-grid" style={{display:'grid', gridTemplateColumns: '400px 1fr', gap: '20px'}}>
                {/* COLUNA ESQUERDA */}
                <div>
                    {selectedUser ? (
                        <>
                            <div className="card" style={{marginBottom: '20px', padding:'20px', background:'white', borderRadius:'12px', borderTop:'4px solid #2563eb'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'15px'}}>
                                    <div>
                                        <h3 style={{margin:0}}>{currentUserProfile?.nome}</h3>
                                        <div style={{marginTop:'5px'}}>
                                            <span style={{fontSize:'0.75rem', background:'#eff6ff', color:'#2563eb', padding:'2px 8px', borderRadius:'10px', marginRight:'5px'}}>
                                                {currentUserProfile?.empresa_interna || 'Sem Empresa'}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={downloadCSV} className="btn-small">📊 Excel</button>
                                </div>

                                {/* ABAS DE DADOS */}
                                <div className="tabs" style={{marginBottom:'20px'}}>
                                    <button className={userTab === 'financeiro' ? 'active' : ''} onClick={() => setUserTab('financeiro')} style={{flex:1}}>💰 Financeiro</button>
                                    <button className={userTab === 'dados' ? 'active' : ''} onClick={() => setUserTab('dados')} style={{flex:1}}>👤 Dados Pessoais</button>
                                </div>

                                {/* CONTEÚDO: FINANCEIRO */}
                                {userTab === 'financeiro' && (
                                    !isEditingUser ? (
                                        <div>
                                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                                <span style={{color:'#64748b'}}>Valor S.A. / dia:</span>
                                                <span style={{fontWeight:'bold'}}>{Number(currentUserProfile?.valor_sa || 0).toFixed(2)} €</span>
                                            </div>
                                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                                <span style={{color:'#64748b'}}>Férias Disponíveis:</span>
                                                <span style={{fontWeight:'bold', color:'#2563eb'}}>{currentUserProfile?.dias_ferias ?? 22} dias</span>
                                            </div>
                                            <button onClick={() => setIsEditingUser(true)} style={{width:'100%', marginTop:'10px', padding:'8px', border:'1px dashed #cbd5e1', background:'white', cursor:'pointer', color:'#64748b'}}>✏️ Editar Dados</button>
                                        </div>
                                    ) : (
                                        <div style={{background:'#f8fafc', padding:'10px', borderRadius:'8px'}}>
                                            <label style={{fontSize:'0.8rem'}}>Valor S.A.:</label>
                                            <input type="number" step="0.01" value={tempUserProfile.valor_sa || 0} onChange={e => setTempUserProfile({...tempUserProfile, valor_sa: e.target.value})} style={{width:'100%', marginBottom:'10px'}} />
                                            <label style={{fontSize:'0.8rem'}}>Dias Férias:</label>
                                            <input type="number" value={tempUserProfile.dias_ferias || 0} onChange={e => setTempUserProfile({...tempUserProfile, dias_ferias: e.target.value})} style={{width:'100%', marginBottom:'10px'}} />
                                            <div style={{display:'flex', gap:'5px'}}>
                                                <button onClick={() => setIsEditingUser(false)} style={{flex:1, padding:'5px', border:'1px solid #ccc', background:'white'}}>Cancelar</button>
                                                <button onClick={handleUpdateUserProfile} style={{flex:1, padding:'5px', background:'#2563eb', color:'white', border:'none'}}>Gravar</button>
                                            </div>
                                        </div>
                                    )
                                )}

                                {/* CONTEÚDO: DADOS PESSOAIS */}
                                {userTab === 'dados' && (
                                    !isEditingUser ? (
                                        <>
                                            <div style={readOnlyGridStyle}>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Nome Completo</span><b>{currentUserProfile?.nome_completo || '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Telemóvel</span><b>{currentUserProfile?.telemovel || '-'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>NIF</span><b>{currentUserProfile?.nif || '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>NISS</span><b>{currentUserProfile?.niss || '-'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>NCC</span><b>{currentUserProfile?.ncc || '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Data Nasc.</span><b>{currentUserProfile?.data_nascimento ? new Date(currentUserProfile.data_nascimento).toLocaleDateString() : '-'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Dependentes</span><b>{currentUserProfile?.nr_dependentes || '0'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Estado Civil</span><b>{currentUserProfile?.estado_civil || '-'}</b></div>
                                                
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Nacionalidade</span><b>{currentUserProfile?.nacionalidade || '-'}</b></div>
                                                <div style={readOnlyItemStyle}><span style={labelStyle}>Sexo</span><b>{currentUserProfile?.sexo || '-'}</b></div>
                                            </div>
                                            <div style={{...readOnlyItemStyle, marginTop:'10px'}}><span style={labelStyle}>Morada</span><b>{currentUserProfile?.morada || '-'}</b></div>
                                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px', fontSize:'0.9rem'}}><span style={labelStyle}>Concelho:</span> <b>{currentUserProfile?.concelho || '-'}</b></div>
                                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px', fontSize:'0.9rem'}}><span style={labelStyle}>Empresa:</span> <b>{currentUserProfile?.empresa_interna || '-'}</b></div>
                                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px', fontSize:'0.9rem'}}><span style={labelStyle}>Contrato:</span> <b>{currentUserProfile?.tipo_contrato || '-'}</b></div>
                                            
                                            <button onClick={() => setIsEditingUser(true)} style={{width:'100%', marginTop:'15px', padding:'8px', border:'1px dashed #cbd5e1', background:'white', cursor:'pointer', color:'#64748b'}}>✏️ Editar Completo</button>
                                        </>
                                    ) : (
                                        <div style={{background:'#f8fafc', padding:'10px', borderRadius:'8px', maxHeight:'400px', overflowY:'auto'}}>
                                            <label style={{fontSize:'0.75rem'}}>Nome Completo</label>
                                            <input type="text" value={tempUserProfile.nome_completo || ''} onChange={e => setTempUserProfile({...tempUserProfile, nome_completo: e.target.value})} style={{width:'100%', marginBottom:'5px'}} />
                                            
                                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                                                <div><label style={{fontSize:'0.75rem'}}>NIF</label><input type="text" value={tempUserProfile.nif || ''} onChange={e => setTempUserProfile({...tempUserProfile, nif: e.target.value})} style={{width:'100%'}} /></div>
                                                <div><label style={{fontSize:'0.75rem'}}>NISS</label><input type="text" value={tempUserProfile.niss || ''} onChange={e => setTempUserProfile({...tempUserProfile, niss: e.target.value})} style={{width:'100%'}} /></div>
                                                <div><label style={{fontSize:'0.75rem'}}>CC (NCC)</label><input type="text" value={tempUserProfile.ncc || ''} onChange={e => setTempUserProfile({...tempUserProfile, ncc: e.target.value})} style={{width:'100%'}} /></div>
                                                <div><label style={{fontSize:'0.75rem'}}>Dependentes</label><input type="number" value={tempUserProfile.nr_dependentes || 0} onChange={e => setTempUserProfile({...tempUserProfile, nr_dependentes: e.target.value})} style={{width:'100%'}} /></div>
                                                <div><label style={{fontSize:'0.75rem'}}>Estado Civil</label><select value={tempUserProfile.estado_civil || ''} onChange={e => setTempUserProfile({...tempUserProfile, estado_civil: e.target.value})} style={{width:'100%'}}><option value="">-</option><option value="Solteiro">Solteiro</option><option value="Casado">Casado</option><option value="Divorciado">Divorciado</option><option value="União Facto">União Facto</option></select></div>
                                                <div><label style={{fontSize:'0.75rem'}}>Data Nasc.</label><input type="date" value={tempUserProfile.data_nascimento || ''} onChange={e => setTempUserProfile({...tempUserProfile, data_nascimento: e.target.value})} style={{width:'100%'}} /></div>
                                                
                                                {/* CAMPO DE SEXO ADICIONADO AQUI */}
                                                <div><label style={{fontSize:'0.75rem'}}>Nacionalidade</label><input type="text" value={tempUserProfile.nacionalidade || ''} onChange={e => setTempUserProfile({...tempUserProfile, nacionalidade: e.target.value})} style={{width:'100%'}} /></div>
                                                <div>
                                                    <label style={{fontSize:'0.75rem'}}>Sexo</label>
                                                    <select value={tempUserProfile.sexo || ''} onChange={e => setTempUserProfile({...tempUserProfile, sexo: e.target.value})} style={{width:'100%'}}>
                                                        <option value="">-</option>
                                                        <option value="Masculino">Masculino</option>
                                                        <option value="Feminino">Feminino</option>
                                                        <option value="Outro">Outro</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <label style={{fontSize:'0.75rem', marginTop:'5px'}}>Morada</label>
                                            <input type="text" value={tempUserProfile.morada || ''} onChange={e => setTempUserProfile({...tempUserProfile, morada: e.target.value})} style={{width:'100%', marginBottom:'5px'}} />

                                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                                                <div><label style={{fontSize:'0.75rem'}}>Telemóvel</label><input type="text" value={tempUserProfile.telemovel || ''} onChange={e => setTempUserProfile({...tempUserProfile, telemovel: e.target.value})} style={{width:'100%'}} /></div>
                                                <div><label style={{fontSize:'0.75rem'}}>Concelho</label><input type="text" value={tempUserProfile.concelho || ''} onChange={e => setTempUserProfile({...tempUserProfile, concelho: e.target.value})} style={{width:'100%'}} /></div>
                                            </div>

                                            <label style={{fontSize:'0.75rem'}}>Empresa</label>
                                            <select value={tempUserProfile.empresa_interna || ''} onChange={e => setTempUserProfile({...tempUserProfile, empresa_interna: e.target.value})} style={{width:'100%', marginBottom:'5px', padding:'8px'}}>
                                                <option value="">Selecione...</option>
                                                <option value="Neomarca">Neomarca</option>
                                                <option value="GeoFlicks">GeoFlicks</option>
                                                <option value="2 Siglas">2 Siglas</option>
                                                <option value="Fator Triplo">Fator Triplo</option>
                                            </select>

                                            <label style={{fontSize:'0.75rem'}}>Contrato</label>
                                            <select value={tempUserProfile.tipo_contrato || ''} onChange={e => setTempUserProfile({...tempUserProfile, tipo_contrato: e.target.value})} style={{width:'100%', marginBottom:'10px', padding:'8px'}}>
                                                <option value="">Selecione...</option>
                                                <option value="Termo Certo">Termo Certo</option>
                                                <option value="Sem Termo">Sem Termo</option>
                                                <option value="Termo Incerto">Termo Incerto</option>
                                                <option value="Estágio Profissional">Estágio Profissional</option>
                                                <option value="Estágio Curricular">Estágio Curricular</option>
                                                <option value="Prestação de Serviços">Prestação de Serviços</option>
                                            </select>

                                            <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
                                                <button onClick={() => setIsEditingUser(false)} style={{flex:1, padding:'5px', border:'1px solid #ccc', background:'white'}}>Cancelar</button>
                                                <button onClick={handleUpdateUserProfile} style={{flex:1, padding:'5px', background:'#2563eb', color:'white', border:'none'}}>Gravar</button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="card" style={{padding:'20px', background:'white', borderRadius:'12px', marginBottom: '20px'}}>
                                <h4 style={{margin:'0 0 15px 0', color:'#475569'}}>Processamento {currentDate.toLocaleDateString('pt-PT', {month:'long'})}</h4>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'0.9rem'}}><span>Dias Trabalhados ({stats.countTrabalho})</span><span>+ {stats.valorSA} €</span></div>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'0.9rem'}}><span>Férias ({stats.countFerias})</span><span>-</span></div>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'0.9rem', color:'#ef4444'}}><span>Faltas ({stats.countFaltas})</span><span>-</span></div>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'0.9rem'}}><span>Baixas ({stats.countBaixas})</span><span>-</span></div>
                                <div style={{marginTop:'15px', paddingTop:'15px', borderTop:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontWeight:'bold', color:'#1e293b'}}>TOTAL S.A. PAGAR:</span><span style={{fontSize:'1.4rem', fontWeight:'bold', color:'#16a34a'}}>{stats.valorSA} €</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card" style={{padding:'20px', background:'white', borderRadius:'12px', color:'#64748b', textAlign:'center'}}>
                            <h3 style={{margin:'0', color:'#1e293b'}}>📊 Resumo Global</h3>
                            <ul style={{listStyle:'none', padding:0, marginTop:'20px'}}>
                                <li style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9'}}><span>🏖️ Férias Marcadas</span> <b>{stats.countFerias} dias</b></li>
                                <li style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9'}}><span>❌ Faltas</span> <b>{stats.countFaltas} dias</b></li>
                                <li style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9'}}><span>🏥 Baixas Médicas</span> <b>{stats.countBaixas} dias</b></li>
                            </ul>
                            <div style={{marginTop:'25px', paddingTop:'15px', borderTop:'2px dashed #f1f5f9'}}>
                                <h5 style={{margin:'0 0 15px 0', color:'#475569', textTransform:'uppercase', fontSize:'0.75rem'}}>📅 Ausentes Hoje:</h5>
                                {ausentesHoje.length === 0 ? <div style={{background:'#f0fdf4', padding:'12px', borderRadius:'8px', color:'#166534', fontWeight:'600'}}>✅ Todos presentes!</div> : 
                                    ausentesHoje.map(a => <div key={a.id} style={{padding:'8px', border:'1px solid #eee', borderRadius:'6px', marginBottom:'5px'}}>{a.nomeUser} - {a.tipo}</div>)
                                }
                            </div>

                            {/* --- NOVA SECÇÃO DE ANIVERSÁRIOS --- */}
                            <div style={{marginTop: '25px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9'}}>
                                <h5 style={{margin:'0 0 15px 0', color:'#475569', textTransform:'uppercase', fontSize:'0.75rem'}}>🎂 Aniversariantes de {currentDate.toLocaleDateString('pt-PT', {month:'long'})}:</h5>
                                {aniversariantes.length === 0 ? (
                                    <div style={{padding:'12px', borderRadius:'8px', color:'#94a3b8', fontSize:'0.9rem', fontStyle:'italic'}}>
                                        Ninguém faz anos este mês.
                                    </div>
                                ) : (
                                    <ul style={{listStyle:'none', padding:0}}>
                                        {aniversariantes.map(c => (
                                            <li key={c.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f1f5f9', fontSize:'0.9rem'}}>
                                                <span>{c.nome}</span>
                                                <span style={{fontWeight:'bold', color:'#eab308'}}>Dia {new Date(c.data_nascimento).getDate()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: CALENDÁRIO + HISTÓRICO */}
                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    <div className="card" style={{padding:'20px', background:'white', borderRadius:'12px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                            <button onClick={() => changeMonth(-1)} className="btn-small">◀</button>
                            <h2 style={{margin:0}}>{currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h2>
                            <button onClick={() => changeMonth(1)} className="btn-small">▶</button>
                        </div>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px'}}>
                            {['D','S','T','Q','Q','S','S'].map(d => <div key={d} style={{textAlign:'center', fontWeight:'bold', color:'#94a3b8', fontSize:'0.8rem'}}>{d}</div>)}
                            {renderCalendar()}
                        </div>
                    </div>

                    {selectedUser && historicoUser.length > 0 && (
                        <div className="card" style={{padding:'20px', background:'white', borderRadius:'12px'}}>
                            <h3 style={{marginTop:0, fontSize:'1.1rem', color:'#1e293b'}}>📅 Histórico de Ausências</h3>
                            <div className="table-responsive" style={{maxHeight:'300px', overflowY:'auto'}}>
                                <table className="data-table" style={{fontSize:'0.9rem'}}>
                                    <thead><tr><th>Tipo</th><th>Período</th><th>Documento</th><th>Estado</th><th>Ação</th></tr></thead>
                                    <tbody>
                                        {historicoUser.map(h => (
                                            <tr key={h.id}>
                                                <td>{h.tipo}</td>
                                                <td>{new Date(h.data_inicio).toLocaleDateString()} a {new Date(h.data_fim).toLocaleDateString()}</td>
                                                <td style={{textAlign:'center'}}>
                                                    {h.anexo_url ? (
                                                        <a href={h.anexo_url} target="_blank" rel="noreferrer" style={{color:'#2563eb', fontWeight:'bold', textDecoration:'none'}}>📎 Ver</a>
                                                    ) : (
                                                        <span style={{color:'#cbd5e1'}}>-</span>
                                                    )}
                                                </td>
                                                <td><span className={`badge ${h.estado === 'aprovado' ? 'badge-success' : 'badge-danger'}`}>{h.estado}</span></td>
                                                <td style={{textAlign: 'center'}}>{h.estado === 'aprovado' && <button className="btn-small" style={{color:'#ef4444', fontSize:'0.75rem'}} onClick={() => abrirModalConfirmacao(h, 'cancelar_direto')}>Cancelar</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </>
      )}

      {showAbsenceModal && (
          <ModalPortal>
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                <div style={{background:'white', padding:'25px', borderRadius:'12px', width:'400px'}}>
                    <h3>Registar Ausência</h3>
                    <form onSubmit={handleAddAbsence}>
                        <select required value={newAbsence.user_id} onChange={e => setNewAbsence({...newAbsence, user_id: e.target.value})} style={inputStyle} disabled={!!selectedUser}>
                            <option value="">Selecione Colaborador...</option>
                            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <select value={newAbsence.tipo} onChange={e => setNewAbsence({...newAbsence, tipo: e.target.value})} style={inputStyle}>
                            <option value="Férias">🏖️ Férias</option>
                            <option value="Falta Injustificada">❌ Falta Injustificada</option>
                            <option value="Baixa Médica">🏥 Baixa Médica</option>
                        </select>
                        <div style={{display:'flex', gap:'10px'}}>
                              <div style={{flex:1}}><input type="date" required value={newAbsence.data_inicio} onChange={e=>setNewAbsence({...newAbsence, data_inicio: e.target.value})} style={inputStyle}/></div>
                              <div style={{flex:1}}><input type="date" required value={newAbsence.data_fim} onChange={e=>setNewAbsence({...newAbsence, data_fim: e.target.value})} style={inputStyle}/></div>
                        </div>
                        <input type="text" placeholder="Observações..." value={newAbsence.motivo} onChange={e=>setNewAbsence({...newAbsence, motivo: e.target.value})} style={inputStyle}/>
                        <button type="submit" className="btn-primary" style={{width:'100%'}}>Gravar</button>
                        <button type="button" onClick={() => setShowAbsenceModal(false)} style={{width:'100%', marginTop:'10px', background:'none', border:'none', cursor:'pointer'}}>Cancelar</button>
                    </form>
                </div>
            </div>
          </ModalPortal>
      )}

      {confirmModal.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                      <div style={{fontSize: '3rem', marginBottom: '10px'}}>{['aprovar', 'aceitar_cancelamento', 'cancelar_direto'].includes(confirmModal.acao) ? '✅' : '❌'}</div>
                      <h3 style={{marginTop: 0, color: '#1e293b'}}>Confirmar Ação</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5'}}>
                          {confirmModal.acao === 'aprovar' && <span>Aprovar <b>{confirmModal.pedido?.tipo}</b>?</span>}
                          {confirmModal.acao === 'rejeitar' && <span>Rejeitar pedido?</span>}
                          {(confirmModal.acao === 'aceitar_cancelamento' || confirmModal.acao === 'cancelar_direto') && <span>Cancelar e devolver dias (se férias)?</span>}
                      </p>
                      <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                          <button onClick={() => setConfirmModal({ show: false, pedido: null, acao: null })} style={{padding: '12px', borderRadius: '10px', border: '1px solid #ccc', background: 'white', flex: 1}}>Voltar</button>
                          <button onClick={executarAcaoRH} style={{padding: '12px', borderRadius: '10px', border: 'none', flex: 1, color: 'white', background: '#16a34a'}}>Confirmar</button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {notification.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'350px', textAlign: 'center'}}>
                      <h3 style={{marginTop: 0}}>{notification.type === 'success' ? 'Sucesso!' : 'Erro'}</h3>
                      <p>{notification.message}</p>
                      <button onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="btn-primary" style={{width: '100%'}}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}
    </div>
  );
}