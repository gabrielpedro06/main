import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext"; 
import { useNavigate } from "react-router-dom"; 
import WidgetAssiduidade from "../components/WidgetAssiduidade";
import WidgetCalendar from "../components/WidgetCalendar"; 
import "./../styles/dashboard.css";

export default function DashboardHome() {
  const { user, signOut } = useAuth(); 
  const navigate = useNavigate();
  
  // Estados de Dados
  const [tarefas, setTarefas] = useState([]);
  const [stats, setStats] = useState({ projetos: 0, clientes: 0 });
  const [userProfile, setUserProfile] = useState(null);
  
  // NOVO: Estado para Users Online
  const [usersOnline, setUsersOnline] = useState([]);

  // Estados Visuais (Menu e Frases)
  const [showMenu, setShowMenu] = useState(false);
  const [frase, setFrase] = useState("");

  const frasesMotivacionais = [
    "Vamos fazer acontecer! 🚀",
    "Foco e determinação. 💪",
    "Hoje é um bom dia para vencer. ☀️",
    "A equipa conta contigo! 🤝",
    "Simplicidade é o auge da sofisticação. ✨",
    "Trabalho em equipa faz o sonho funcionar. 🌟"
  ];

  useEffect(() => {
    if (user) {
      fetchTarefasPessoais();
      fetchStats();
      fetchUserProfile();
      loadUsersOnline(); // <--- Carregar quem está online
      
      // Atualizar lista de users online a cada 60 segundos
      const interval = setInterval(loadUsersOnline, 60000);

      // Escolher frase aleatória
      setFrase(frasesMotivacionais[Math.floor(Math.random() * frasesMotivacionais.length)]);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Buscar Nome, Empresa e DIAS DE FÉRIAS do utilizador
  async function fetchUserProfile() {
    try {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
        setUserProfile(data);
    } catch (error) {
        console.error("Erro perfil:", error);
    }
  }

  // NOVO: Buscar quem está online (Entrada sem Saída)
  async function loadUsersOnline() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("assiduidade")
      .select("*, profiles(nome, avatar_url)") // <-- Trazemos também o avatar_url
      .eq("data_registo", hoje)
      .is("hora_saida", null); 
    
    if (!error && data) setUsersOnline(data);
  }

  // Buscar tarefas
  async function fetchTarefasPessoais() {
    const { data, error } = await supabase
      .from("tarefas")
      .select(`
        *,
        atividades ( titulo, projetos ( titulo ) )
      `)
      .eq("responsavel_id", user.id) 
      .neq("estado", "concluido") 
      .neq("estado", "cancelado")
      .limit(5);

    if (!error) setTarefas(data || []);
  }

  async function fetchStats() {
    const { count: countProjetos } = await supabase.from("projetos").select("*", { count: 'exact', head: true }).neq("estado", "cancelado");
    const { count: countClientes } = await supabase.from("clientes").select("*", { count: 'exact', head: true });
    
    setStats({ projetos: countProjetos || 0, clientes: countClientes || 0 });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/"); 
  }

  // --- RENDERIZAÇÃO ---

  return (
    <div className="dashboard-home">
      
      {/* === HEADER DO DASHBOARD (O TEU ORIGINAL) === */}
      <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px',
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
      }}>
        {/* Lado Esquerdo: Saudação e Frase */}
        <div>
           <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
             Olá, {userProfile?.nome || 'Colaborador'} 👋
           </h1>
           <p style={{ margin: '5px 0 0 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.95rem' }}>
             "{frase}"
           </p>
        </div>

        {/* Lado Direito: Menu de Utilizador */}
        <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setShowMenu(!showMenu)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', 
                cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', 
                background: showMenu ? '#f1f5f9' : 'transparent', transition: 'all 0.2s'
              }}
            >
                <div style={{textAlign: 'right', display: 'flex', flexDirection: 'column'}}>
                     <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#334151'}}>
                        {userProfile?.nome}
                     </span>
                     <span style={{fontSize: '0.75rem', color: '#2563eb', fontWeight: '500'}}>
                        {userProfile?.empresa_interna || 'Empresa'}
                     </span>
                </div>
                
                {/* AVATAR NO HEADER (ATUALIZADO) */}
                <div style={{
                    width: '42px', height: '42px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
                    overflow: 'hidden' // Para a imagem não sair fora
                }}>
                    {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="User" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                        userProfile?.nome ? userProfile.nome.charAt(0).toUpperCase() : 'U'
                    )}
                </div>
            </div>

            {/* Dropdown Menu */}
            {showMenu && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, 
                background: 'white', border: '1px solid #e2e8f0', 
                borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                minWidth: '200px', zIndex: 50, overflow: 'hidden'
              }}>
                <div style={{padding: '12px 15px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc'}}>
                    <span style={{fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px'}}>
                        A Minha Conta ({userProfile?.role || 'User'})
                    </span>
                </div>
                
                {/* BOTÃO PERFIL CORRIGIDO */}
                <button className="menu-item" onClick={() => navigate("/dashboard/perfil")}>
                    👤 O Meu Perfil
                </button>

                <Link to="/dashboard/ferias" style={{ textDecoration: 'none' }}>
                    <button className="menu-item" style={{ width: '100%', textAlign: 'left' }}>
                        📆 Férias/Ausências
                    </button>
                </Link>
                <div style={{borderTop: '1px solid #f1f5f9', margin: '5px 0'}}></div>
                
                <button className="menu-item logout" onClick={handleLogout}>
                    🚪 Terminar Sessão
                </button>
              </div>
            )}
        </div>
      </div>

      {/* === DASHBOARD GRID (3 COLUNAS) === */}
      <div className="dashboard-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px',
          alignItems: 'start' 
      }}>
        
        {/* COLUNA 1: O Ponto (Assiduidade) */}
        <div>
           <WidgetAssiduidade />
        </div>

        {/* COLUNA 2: Calendário (Férias/Aniversários) */}
        <div>
           <WidgetCalendar />
        </div>

        {/* COLUNA 3: Users Online + Tarefas */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            
            {/* 1. NOVO CARTÃO: QUEM ESTÁ ONLINE */}
            <div className="card" style={{padding: '20px', background: 'white', borderRadius: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                    <h4 style={{margin: 0, color: '#1e293b'}}>🟢 Equipa Online</h4>
                    <span style={{background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold'}}>
                        {usersOnline.length}
                    </span>
                </div>
                
                {usersOnline.length > 0 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '150px', overflowY: 'auto'}}>
                    {usersOnline.map(u => (
                        <div key={u.id} style={{display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid #f8fafc'}}>
                            {/* AVATAR NA LISTA ONLINE (ATUALIZADO) */}
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '50%', 
                                background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontWeight: 'bold', fontSize: '0.7rem', overflow: 'hidden'
                            }}>
                                {u.profiles?.avatar_url ? (
                                    <img src={u.profiles.avatar_url} alt="U" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                ) : (
                                    u.profiles?.nome?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <div style={{lineHeight: '1.2'}}>
                                <div style={{fontWeight: '600', color: '#334155', fontSize: '0.85rem'}}>
                                    {u.profiles?.nome?.split(' ')[0]}
                                </div>
                                <div style={{fontSize: '0.7rem', color: '#94a3b8'}}>
                                    Entrou às {u.hora_entrada?.slice(0,5)}
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div style={{textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic'}}>
                        Ninguém online. 😴
                    </div>
                )}
            </div>

            {/* 2. CARTÃO DE TAREFAS (O TEU ORIGINAL) */}
            <div className="card" style={{ textAlign: 'left', minHeight: '300px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3>📋 Minhas Tarefas</h3>
                    <button className="btn-small" onClick={() => navigate("/dashboard/tarefas")}>Ver Todas</button>
                </div>
                
                {tarefas.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px 0', color: '#94a3b8'}}>
                        <p style={{fontSize: '2rem', margin: 0}}>🎉</p>
                        <p>Tudo limpo! Estás livre.</p>
                    </div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                    {tarefas.map((t) => (
                        <li key={t.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '600', color: '#334151', fontSize: '0.9rem' }}>{t.titulo}</span>
                                <span className={`badge`} style={{ 
                                    fontSize: '0.65rem', padding: '2px 6px', borderRadius: '12px', 
                                    background: t.prioridade === 'urgente' ? '#fee2e2' : '#e0f2fe', 
                                    color: t.prioridade === 'urgente' ? '#991b1b' : '#0369a1' 
                                }}>
                                {t.prioridade}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                {t.atividades?.projetos?.titulo || 'Geral'} › {t.atividades?.titulo}
                            </div>
                        </div>
                        <button className="btn-small" style={{opacity: 0.6}} onClick={() => navigate("/dashboard/tarefas")}>→</button>
                        </li>
                    ))}
                    </ul>
                )}
            </div>
        </div>
      </div>

      {/* === CARTÕES DE RESUMO (AGORA COM FÉRIAS REAIS) === */}
      <div className="dashboard-cards" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="card" style={{borderLeft: '4px solid #2563eb'}}>
          <h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Projetos Ativos</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.projetos}</p>
        </div>
        <div className="card" style={{borderLeft: '4px solid #10b981'}}>
          <h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Clientes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{stats.clientes}</p>
        </div>
        <div className="card" style={{borderLeft: '4px solid #f59e0b', opacity: 1}}>
          <h3 style={{fontSize: '0.9rem', color: '#64748b'}}>Dias de Férias</h3>
          {/* LIGADO À BASE DE DADOS AQUI 👇 */}
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>
             {userProfile?.dias_ferias ?? '--'}
          </p>
        </div>
      </div>

      {/* Estilos locais */}
      <style>{`
        .menu-item {
            display: block; width: 100%; padding: 12px 15px;
            text-align: left; background: none; border: none;
            cursor: pointer; fontSize: 0.9rem; color: #334151;
            transition: background 0.2s;
        }
        .menu-item:hover { background: #f8fafc; color: #2563eb; }
        .menu-item.logout { color: #dc2626; }
        .menu-item.logout:hover { background: #fef2f2; color: #b91c1c; }
      `}</style>
    </div>
  );
}