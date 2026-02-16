import React from 'react';
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // <-- IMPORTAR O AUTH CONTEXT
import "./../styles/dashboard.css";

const logoFull = "/logo4.png"; 
const logoIcon = "/logo3.png"; 

export default function Sidebar({ menuOpen, setMenuOpen }) {
  const location = useLocation();
  const { userProfile } = useAuth(); // <-- PUXAR O ROLE DO UTILIZADOR

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return 'active';
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return 'active';
    return '';
  };

  return (
    <aside className={`sidebar ${menuOpen ? "open" : "closed"}`}>
      
      <div className="sidebar-top">
        <div className="logo-container">
            <img 
                src={menuOpen ? logoFull : logoIcon} 
                alt="Bizin Logo" 
                className={menuOpen ? "logo-full" : "logo-icon"}
            />
        </div>

        <nav>
          <ul>
            <li className={isActive('/dashboard')}>
              <Link to="/dashboard" title="Início">
                <span className="icon">🏠</span> 
                <span className="link-text">Início</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/clientes')}>
              <Link to="/dashboard/clientes" title="Clientes">
                <span className="icon">👥</span> 
                <span className="link-text">Clientes</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/projetos')}>
              <Link to="/dashboard/projetos" title="Projetos">
                <span className="icon">🚀</span> 
                <span className="link-text">Projetos</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/atividades')}>
              <Link to="/dashboard/atividades" title="Atividades">
                <span className="icon">📋</span> 
                <span className="link-text">Atividades</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/tarefas')}>
              <Link to="/dashboard/tarefas" title="Tarefas">
                <span className="icon">✅</span> 
                <span className="link-text">Minhas Tarefas</span>
              </Link>
            </li>

            <li className={isActive('/dashboard/forum')}>
              <Link to="/dashboard/forum" title="Fórum">
                <span className="icon">💬</span> 
                <span className="link-text">Fórum & Avisos</span>
              </Link>
            </li>

            {/* 🔒 BLOQUEADO: Só Admin, Gestor conseguem ver */}
            {['admin', 'gestor'].includes(userProfile?.role) && (
              <li className={isActive('/dashboard/rh')}>
                <Link to="/dashboard/rh" title="Recursos Humanos">
                  <span className="icon">👔</span> 
                  <span className="link-text">Recursos Humanos</span>
                </Link>
              </li>
            )}

            {/* 🔒 BLOQUEADO: Só Admin, Gestor ou Marketing conseguem ver */}
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
      </div>

      <div style={{ padding: '10px' }}>
        <button
          className="toggle-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "◀ Recolher" : "▶"}
        </button>
      </div>
    </aside>
  );
}