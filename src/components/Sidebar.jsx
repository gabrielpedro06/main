import React, { useState, useEffect } from 'react';
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase"; 
import "./../styles/dashboard.css";

const logoFull = "/logo4.png"; 
const logoIcon = "/logo3.png"; 

// --- ÍCONES SVG PROFISSIONAIS (SaaS Style) ---
const Icons = {
  Home: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Pin: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.6V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.6a2 2 0 0 1-1.11 1.95l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>,
  Rocket: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Message: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  Clipboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>,
  Briefcase: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  Target: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  MenuArrowRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  MenuArrowLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
};

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
              <span className="icon"><Icons.Home /></span> 
              <span className="link-text">Início</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/minhas-tarefas')}>
            <Link to="/dashboard/minhas-tarefas" title="Minhas Tarefas">
              <span className="icon"><Icons.Pin /></span> 
              <span className="link-text">Minhas Tarefas</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/tarefas')}>
            <Link to="/dashboard/tarefas" title="Tarefas Globais">
              <span className="icon"><Icons.Check /></span> 
              <span className="link-text">Tarefas</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/projetos')}>
            <Link to="/dashboard/projetos" title="Projetos">
              <span className="icon"><Icons.Rocket /></span> 
              <span className="link-text">Projetos</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/clientes')}>
            <Link to="/dashboard/clientes" title="Clientes">
              <span className="icon"><Icons.Users /></span> 
              <span className="link-text">Clientes</span>
            </Link>
          </li>

          <li className={isActive('/dashboard/forum')}>
            <Link to="/dashboard/forum" title="Fórum" onClick={() => {
                localStorage.setItem('lastForumVisit', new Date().toISOString());
                setUnreadCount(0);
            }}>
              <span className="icon" style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                  <Icons.Message />
                  {unreadCount > 0 && (
                      <span style={{
                          position: 'absolute', top: '-6px', right: '-8px',
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
                  <span className="icon"><Icons.Clipboard /></span> 
                  <span className="link-text">Modelos</span>
                </Link>
              </li>

              <li className={isActive('/dashboard/rh')}>
                <Link to="/dashboard/rh" title="Recursos Humanos">
                  <span className="icon"><Icons.Briefcase /></span> 
                  <span className="link-text">Recursos Humanos</span>
                </Link>
              </li>
            </>
          )}

          {['admin', 'marketing'].includes(userProfile?.role) && (
            <li className={isActive('/dashboard/leads')}>
              <Link to="/dashboard/leads" title="Marketing">
                <span className="icon"><Icons.Target /></span> 
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
            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            padding: '8px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 'bold',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', 
            color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
          title={menuOpen ? "Recolher Menu" : "Expandir Menu"}
        >
          {menuOpen ? <><Icons.MenuArrowLeft /> Recolher</> : <Icons.MenuArrowRight />}
        </button>
      </div>

      <style>{`
          .sidebar nav ul li a {
              padding: 2px 15px !important; 
              font-size: 0.95rem !important;
          }
          .sidebar nav ul li {
              margin-bottom: 2px !important; 
          }
          
          /* Ajustar SVG ao tamanho do ícone antigo */
          .sidebar nav ul li a .icon svg {
              width: 18px;
              height: 18px;
              display: block;
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