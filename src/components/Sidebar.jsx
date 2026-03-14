import React, { useState, useEffect } from 'react';
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase"; 
import WidgetCalendar from "./WidgetCalendar"; 
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
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  MenuArrowRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  MenuArrowLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
};

export default function Sidebar({ menuOpen, setMenuOpen }) {
  const location = useLocation();
  const { userProfile } = useAuth();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCalendarModal, setShowCalendarModal] = useState(false); // 💡 Estado para o Modal do Calendário

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

  const getSidebarTooltip = (label) => (!menuOpen ? label : undefined);

  return (
    <>
      <aside className={`sidebar ${menuOpen ? "open" : "closed"}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', zIndex: 100 }}>
        
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
              <Link to="/dashboard" title={getSidebarTooltip("Início")}>
                <span className="icon"><Icons.Home /></span> 
                <span className="link-text">Início</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/minhas-tarefas')}>
              <Link to="/dashboard/minhas-tarefas" title={getSidebarTooltip("Minhas Tarefas")}>
                <span className="icon"><Icons.Pin /></span> 
                <span className="link-text">Minhas Tarefas</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/tarefas')}>
              <Link to="/dashboard/tarefas" title={getSidebarTooltip("Tarefas Globais")}>
                <span className="icon"><Icons.Check /></span> 
                <span className="link-text">Tarefas</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/projetos')}>
              <Link to="/dashboard/projetos" title={getSidebarTooltip("Projetos")}>
                <span className="icon"><Icons.Rocket /></span> 
                <span className="link-text">Projetos</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/clientes')}>
              <Link to="/dashboard/clientes" title={getSidebarTooltip("Clientes")}>
                <span className="icon"><Icons.Users /></span> 
                <span className="link-text">Clientes</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/forum')}>
              <Link to="/dashboard/forum" title={getSidebarTooltip("Fórum")} onClick={() => {
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

            {/* 💡 O CALENDÁRIO AQUI NA SIDEBAR! */}
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowCalendarModal(true); }} title={getSidebarTooltip("Calendário de Prazos")}>
                <span className="icon"><Icons.Calendar /></span> 
                <span className="link-text">Calendário</span>
              </a>
            </li>

            <li className={isActive('/dashboard/modelos')}>
              <Link to="/dashboard/modelos" title={getSidebarTooltip("Modelos de Projetos")}>
                <span className="icon"><Icons.Clipboard /></span> 
                <span className="link-text">Modelos</span>
              </Link>
            </li>

            {['admin', 'gestor'].includes(userProfile?.role) && (
              <li className={isActive('/dashboard/rh')}>
                <Link to="/dashboard/rh" title={getSidebarTooltip("Recursos Humanos")}>
                  <span className="icon"><Icons.Briefcase /></span> 
                  <span className="link-text">Recursos Humanos</span>
                </Link>
              </li>
            )}

            {['admin', 'marketing'].includes(userProfile?.role) && (
              <li className={isActive('/dashboard/leads')}>
                <Link to="/dashboard/leads" title={getSidebarTooltip("Marketing")}>
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
            title={getSidebarTooltip("Expandir Menu")}
          >
            {menuOpen ? <><Icons.MenuArrowLeft /> Recolher</> : <Icons.MenuArrowRight />}
          </button>
        </div>

        <style>{`
            .sidebar nav ul li a {
                padding: 1px 14px !important; 
                font-size: 1rem !important;
            }
            .sidebar nav ul li {
                margin-bottom: 1px !important; 
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

      {/* 💡 MODAL DO CALENDÁRIO */}
      {showCalendarModal && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999}} onClick={(e) => { if(e.target === e.currentTarget) setShowCalendarModal(false); }}>
              <div style={{background: 'white', padding: '25px', borderRadius: '18px', width: '100%', maxWidth: '1000px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out', display: 'flex', flexDirection: 'column', maxHeight: '90vh'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px'}}>
                      <h3 style={{margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem'}}>
                          <div style={{background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px', display: 'flex'}}><Icons.Calendar /></div>
                          Calendário
                      </h3>
                      <button onClick={() => setShowCalendarModal(false)} style={{background:'none', border:'none', color:'#94a3b8', cursor:'pointer', display: 'flex'}} className="hover-red">
                          <Icons.Close />
                      </button>
                  </div>
                  
                  <div style={{overflowY: 'auto', flex: 1}} className="custom-scrollbar">
                      {/* INJETAMOS O COMPONENTE AQUI */}
                      <WidgetCalendar />
                  </div>
              </div>
          </div>
      )}
    </>
  );
}