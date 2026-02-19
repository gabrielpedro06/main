import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext"; 
import WidgetAssiduidade from "../components/WidgetAssiduidade";
import WidgetCalendar from "../components/WidgetCalendar"; 
import { frasesMotivacionais } from "../data/frases"; 
import "./../styles/dashboard.css";

export default function DashboardHome() {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  
  // Estados de Dados
  const [tarefasHoje, setTarefasHoje] = useState([]);
  const [tarefasGerais, setTarefasGerais] = useState([]);
  const [stats, setStats] = useState({ projetos: 0, clientes: 0 });
  const [userProfile, setUserProfile] = useState(null);
  const [usersOnline, setUsersOnline] = useState([]);
  const [registosMes, setRegistosMes] = useState([]); // Histórico do mês

  // Estados Visuais
  const [showMenu, setShowMenu] = useState(false);
  const [frase, setFrase] = useState("");
  const [horaAtual, setHoraAtual] = useState("");

  useEffect(() => {
    if (user) {
      fetchTarefasPessoais();
      fetchStats();
      fetchUserProfile();
      loadUsersOnline();
      fetchRegistosMes();
      
      // Frase do dia
      const hoje = new Date();
      const seed = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
      const indice = seed % frasesMotivacionais.length;
      setFrase(frasesMotivacionais[indice]);

      // Relógio
      const relogioInterval = setInterval(() => {
        const agora = new Date();
        setHoraAtual(agora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit'}));
      }, 1000);

      const onlineInterval = setInterval(loadUsersOnline, 60000);

      return () => {
          clearInterval(relogioInterval);
          clearInterval(onlineInterval);
      };
    }
  }, [user]);

  async function fetchUserProfile() {
    try {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setUserProfile(data);
    } catch (error) { console.error("Erro perfil:", error); }
  }

  async function loadUsersOnline() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("assiduidade")
      .select("*, profiles(nome, avatar_url)")
      .eq("data_registo", hoje)
      .is("hora_saida", null); 
    if (!error && data) setUsersOnline(data);
  }

  async function fetchRegistosMes() {
      // Vai buscar os últimos 5 registos de assiduidade do utilizador no mês atual
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      
      const { data, error } = await supabase
          .from("assiduidade")
          .select("*")
          .eq("user_id", user.id)
          .gte("data_registo", primeiroDia)
          .order("data_registo", { ascending: false })
          .limit(5);

      if (!error && data) setRegistosMes(data);
  }

  async function fetchTarefasPessoais() {
    const hoje = new Date().toISOString().split('T')[0];

    // Tarefas agendadas para HOJE (data_limite ou data_inicio hoje)
    const { data: dataHoje } = await supabase
      .from("tarefas")
      .select(`*, atividades ( titulo, projetos ( titulo ) )`)
      .eq("responsavel_id", user.id)
      .or(`data_limite.eq.${hoje},data_inicio.eq.${hoje}`);
    
    // Outras tarefas pendentes/em curso
    const { data: dataGerais } = await supabase
      .from("tarefas")
      .select(`*, atividades ( titulo, projetos ( titulo ) )`)
      .eq("responsavel_id", user.id) 
      .neq("estado", "concluido") 
      .neq("estado", "cancelado")
      .not("data_limite", "eq", hoje)
      .limit(5);

    setTarefasHoje(dataHoje || []);
    setTarefasGerais(dataGerais || []);
  }

  async function fetchStats() {
    // Conta APENAS os ativos (nem concluido, nem cancelado)
    const { count: countProjetos } = await supabase.from("projetos").select("*", { count: 'exact', head: true })
        .neq("estado", "cancelado")
        .neq("estado", "concluido");
    
    const { count: countClientes } = await supabase.from("clientes").select("*", { count: 'exact', head: true });
    
    setStats({ projetos: countProjetos || 0, clientes: countClientes || 0 });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/"); 
  }

  // --- Helpers de UI ---
  const getTaskStatusColor = (s) => { 
      if(s==='concluido') return {bg: '#dcfce7', text: '#166534', label: 'Terminada'}; 
      if(s==='em_curso') return {bg: '#dbeafe', text: '#1e40af', label: 'Em Curso'}; 
      return {bg: '#f3f4f6', text: '#374151', label: 'Pendente'}; 
  };

  return (
    <div className="dashboard-home">
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <div>
           <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
               <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Olá, {userProfile?.nome?.split(' ')[0] || 'Colaborador'} 👋</h1>
               <span style={{background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px'}}>
                   🕒 {horaAtual}
               </span>
           </div>
           <p style={{ margin: '5px 0 0 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.95rem' }}>"{frase}"</p>
        </div>

        {/* MENU UTILIZADOR */}
        <div style={{ position: 'relative' }}>
            <div onClick={() => setShowMenu(!showMenu)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', background: showMenu ? '#f1f5f9' : 'transparent', transition: 'all 0.2s' }}>
                <div style={{textAlign: 'right', display: 'flex', flexDirection: 'column'}}>
                     <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#334151'}}>{userProfile?.nome}</span>
                     <span style={{fontSize: '0.75rem', color: '#2563eb', fontWeight: '500'}}>{userProfile?.empresa_interna || 'Empresa'}</span>
                </div>
                
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)', overflow: 'hidden' }}>
                    {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="User" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                        userProfile?.nome ? userProfile.nome.charAt(0).toUpperCase() : 'U'
                    )}
                </div>
            </div>

            {showMenu && (
              <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', minWidth: '200px', zIndex: 50, overflow: 'hidden' }}>
                <div style={{padding: '12px 15px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc'}}><span style={{fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px'}}>A Minha Conta</span></div>
                <button className="menu-item" onClick={() => navigate("/dashboard/perfil")}>👤 O Meu Perfil</button>
                <button className="menu-item logout" onClick={handleLogout} style={{borderTop: '1px solid #f1f5f9'}}>🚪 Terminar Sessão</button>
              </div>
            )}
        </div>
      </div>

      {/* CARTÕES DE RESUMO INTERATIVOS */}
      <div className="dashboard-cards" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="card stat-card" onClick={() => navigate("/dashboard/projetos")} style={{borderLeft: '4px solid #2563eb', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                  <h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Projetos Ativos</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.projetos}</p>
              </div>
              <span style={{background: '#eff6ff', color: '#2563eb', padding: '5px', borderRadius: '8px'}}>🚀</span>
          </div>
          <div style={{fontSize: '0.75rem', color: '#2563eb', marginTop: '10px', fontWeight: 'bold'}}>Ver Projetos →</div>
        </div>

        <div className="card stat-card" onClick={() => navigate("/dashboard/clientes")} style={{borderLeft: '4px solid #10b981', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                  <h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Total Clientes</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.clientes}</p>
              </div>
              <span style={{background: '#dcfce7', color: '#10b981', padding: '5px', borderRadius: '8px'}}>👥</span>
          </div>
          <div style={{fontSize: '0.75rem', color: '#10b981', marginTop: '10px', fontWeight: 'bold'}}>Gerir Clientes →</div>
        </div>

        <div className="card stat-card" onClick={() => navigate("/dashboard/ferias")} style={{borderLeft: '4px solid #f59e0b', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                  <h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Dias de Férias</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{userProfile?.dias_ferias ?? '--'}</p>
              </div>
              <span style={{background: '#fef3c7', color: '#d97706', padding: '5px', borderRadius: '8px'}}>🏖️</span>
          </div>
          <div style={{fontSize: '0.75rem', color: '#d97706', marginTop: '10px', fontWeight: 'bold'}}>Marcar Férias →</div>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* COLUNA ESQUERDA: Assiduidade & Histórico */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <WidgetAssiduidade />
            
            {/* NOVO: TABELA DE REGISTOS DO MÊS */}
            <div className="card" style={{padding: '20px', background: 'white', borderRadius: '16px'}}>
                <h4 style={{margin: '0 0 15px 0', color: '#1e293b'}}>📅 Últimos Registos (Este Mês)</h4>
                {registosMes.length > 0 ? (
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
                        <thead>
                            <tr style={{borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b'}}>
                                <th style={{paddingBottom: '8px'}}>Data</th>
                                <th style={{paddingBottom: '8px'}}>Entrada</th>
                                <th style={{paddingBottom: '8px'}}>Saída</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registosMes.map(r => (
                                <tr key={r.id} style={{borderBottom: '1px solid #f8fafc'}}>
                                    <td style={{padding: '8px 0', fontWeight: '500', color: '#334155'}}>{new Date(r.data_registo).toLocaleDateString('pt-PT').slice(0,5)}</td>
                                    <td style={{padding: '8px 0', color: '#10b981'}}>{r.hora_entrada?.slice(0,5)}</td>
                                    <td style={{padding: '8px 0', color: r.hora_saida ? '#ef4444' : '#94a3b8'}}>{r.hora_saida?.slice(0,5) || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '10px 0'}}>Nenhum registo efetuado.</div>
                )}
            </div>

            {/* EQUIPA ONLINE (Passou para baixo) */}
            <div className="card" style={{padding: '20px', background: 'white', borderRadius: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b'}}>🟢 Equipa Online</h4>
                    <span style={{background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold'}}>{usersOnline.length}</span>
                </div>
                
                {usersOnline.length > 0 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '150px', overflowY: 'auto'}}>
                    {usersOnline.map(u => (
                        <div key={u.id} style={{display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid #f8fafc'}}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.7rem', overflow: 'hidden' }}>
                                {u.profiles?.avatar_url ? <img src={u.profiles.avatar_url} alt="U" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : (u.profiles?.nome?.charAt(0).toUpperCase() || 'U')}
                            </div>
                            <div style={{lineHeight: '1.2'}}>
                                <div style={{fontWeight: '600', color: '#334155', fontSize: '0.85rem'}}>{u.profiles?.nome?.split(' ')[0]}</div>
                                <div style={{fontSize: '0.7rem', color: '#94a3b8'}}>Entrou às {u.hora_entrada?.slice(0,5)}</div>
                            </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div style={{textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>Ninguém online. 😴</div>
                )}
            </div>
        </div>

        {/* COLUNA DIREITA: Tarefas & Calendário */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            
            {/* TAREFAS DE HOJE */}
            <div className="card" style={{ textAlign: 'left' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3>⚡ Tarefas de Hoje</h3>
                </div>
                
                {tarefasHoje.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.9rem'}}>Sem tarefas agendadas para hoje. 😎</div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tarefasHoje.map((t) => {
                        const status = getTaskStatusColor(t.estado);
                        return (
                        <li key={t.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: t.estado === 'concluido' ? '#94a3b8' : '#334151', fontSize: '0.9rem', textDecoration: t.estado === 'concluido' ? 'line-through' : 'none' }}>{t.titulo}</span>
                                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '12px', background: status.bg, color: status.text, fontWeight: 'bold' }}>{status.label}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{t.atividades?.projetos?.titulo || 'Geral'} › {t.atividades?.titulo}</div>
                            </div>
                            <button className="btn-small" style={{background: '#f1f5f9'}} onClick={() => navigate("/dashboard/tarefas")}> ▶ </button>
                        </li>
                    )})}
                    </ul>
                )}
            </div>

            {/* OUTRAS TAREFAS PENDENTES */}
            <div className="card" style={{ textAlign: 'left' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3>📋 Outras Tarefas Pendentes</h3>
                    <button className="btn-small" onClick={() => navigate("/dashboard/tarefas")}>Ver Todas</button>
                </div>
                
                {tarefasGerais.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.9rem'}}>Tudo limpo! 🎉</div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tarefasGerais.map((t) => (
                        <li key={t.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontWeight: '600', color: '#334151', fontSize: '0.9rem' }}>{t.titulo}</span>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{t.data_limite && <span style={{color:'#ef4444'}}>Prazo: {new Date(t.data_limite).toLocaleDateString('pt-PT').slice(0,5)} • </span>}{t.atividades?.projetos?.titulo || 'Geral'}</div>
                            </div>
                        </li>
                    ))}
                    </ul>
                )}
            </div>

            <WidgetCalendar />
        </div>
      </div>

      <style>{`
        .menu-item { display: block; width: 100%; padding: 12px 15px; text-align: left; background: none; border: none; cursor: pointer; fontSize: 0.9rem; color: #334151; transition: background 0.2s; }
        .menu-item:hover { background: #f8fafc; color: #2563eb; }
        .menu-item.logout { color: #dc2626; }
        .menu-item.logout:hover { background: #fef2f2; color: #b91c1c; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}