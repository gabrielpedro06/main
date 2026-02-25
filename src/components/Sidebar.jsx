import React, { useState, useEffect } from 'react';
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase"; 
import "./../styles/dashboard.css";

const logoFull = "/logo4.png"; 
const logoIcon = "/logo3.png"; 

export default function Sidebar({ menuOpen, setMenuOpen }) {
  const location = useLocation();
  const { userProfile } = useAuth();
  
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnreadPosts = async () => {
      const lastVisit = localStorage.getItem('lastForumVisit');
      const queryDate = lastVisit || new Date(0).toISOString(); 

      const { count, error } = await supabase
          .from('forum_posts')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', queryDate); 

      if(!error) setUnreadCount(count || 0);
  };
  
  useEffect(() => {
      checkUnreadPosts();
      window.addEventListener('storage', checkUnreadPosts);
      const interval = setInterval(checkUnreadPosts, 60000);

      return () => {
          window.removeEventListener('storage', checkUnreadPosts);
          clearInterval(interval);
      };
  }, []);

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return 'active';
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return 'active';
    return '';
  };

  return (
    <aside className={`sidebar ${menuOpen ? "open" : "closed"}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      <div className="logo-container" style={{ flexShrink: 0, padding: '20px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <img 
              src={menuOpen ? logoFull : logoIcon} 
              alt="Bizin Logo" 
              className={menuOpen ? "logo-full" : "logo-icon"}
          />
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '15px 0' }} className="sidebar-scroll">
        <ul style={{ margin: 0, padding: 0 }}>
          <li className={isActive('/dashboard')}>
            <Link to="/dashboard" title="Início">
              <span className="icon">🏠</span> 
              <span className="link-text">Início</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/minhas-tarefas')}>
            <Link to="/dashboard/minhas-tarefas" title="Minhas Tarefas">
              <span className="icon">📌</span> 
              <span className="link-text">Minhas Tarefas</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/tarefas')}>
            <Link to="/dashboard/tarefas" title="Tarefas Globais">
              <span className="icon">✅</span> 
              <span className="link-text">Tarefas</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/projetos')}>
            <Link to="/dashboard/projetos" title="Projetos">
              <span className="icon">🚀</span> 
              <span className="link-text">Projetos</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/clientes')}>
            <Link to="/dashboard/clientes" title="Clientes">
              <span className="icon">👥</span> 
              <span className="link-text">Clientes</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/forum')}>
            <Link to="/dashboard/forum" title="Fórum" onClick={() => {
                localStorage.setItem('lastForumVisit', new Date().toISOString());
                setUnreadCount(0);
            }}>
              <span className="icon" style={{position: 'relative'}}>
                  💬
                  {unreadCount > 0 && (
                      <span style={{
                          position: 'absolute', top: '-5px', right: '-8px',
                          background: '#ef4444', color: 'white',
                          fontSize: '0.6rem', fontWeight: 'bold',
                          padding: '2px 5px', borderRadius: '10px',
                          border: '1px solid white',
                          animation: 'pulse 2s infinite'
                      }}>
                          {unreadCount}
                      </span>
                  )}
              </span> 
              <span className="link-text">Comunicação Interna</span>
            </Link>
          </li>

          {['admin', 'gestor'].includes(userProfile?.role) && (
            <>
              <li className={isActive('/dashboard/modelos')}>
                <Link to="/dashboard/modelos" title="Modelos de Projetos">
                  <span className="icon">📋</span> 
                  <span className="link-text">Modelos</span>
                </Link>
              </li>

              <li className={isActive('/dashboard/rh')}>
                <Link to="/dashboard/rh" title="Recursos Humanos">
                  <span className="icon">👔</span> 
                  <span className="link-text">Recursos Humanos</span>
                </Link>
              </li>
            </>
          )}

          {['admin', 'marketing'].includes(userProfile?.role) && (
            <li className={isActive('/dashboard/leads')}>
              <Link to="/dashboard/leads" title="Marketing">
                <span className="icon">🎯</span> 
                <span className="link-text">Marketing</span>
              </Link>
            </li>
          )}

        </ul>
      </nav>

      <div style={{ flexShrink: 0, padding: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'inherit' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="toggle-btn-small"
          style={{ 
            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '8px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 'bold',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', 
            color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          {menuOpen ? "◀ Recolher" : "▶"}
        </button>
      </div>

      <style>{`
          /* 💡 AQUI ESTÁ A MAGIA PARA TORNAR OS BOTÕES MAIS FINOS */
          .sidebar nav ul li a {
              padding: 3px 15px !important; /* Menos altura no botão */
              font-size: 0.95rem !important;
          }
          .sidebar nav ul li {
              margin-bottom: 2px !important; /* Menos espaço entre botões */
          }

          .toggle-btn-small:hover {
              background: rgba(255,255,255,0.08) !important;
              color: white !important;
              border-color: rgba(255,255,255,0.2) !important;
          }
          .sidebar-scroll::-webkit-scrollbar { width: 0px; background: transparent; }
          .sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

    </aside>
  );
}