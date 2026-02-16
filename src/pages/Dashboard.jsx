import { useState } from "react";
import { Outlet } from "react-router-dom"; // <--- MUDANÇA: Importar Outlet em vez de Routes/Route
import Sidebar from "../components/Sidebar";
import "../styles/dashboard.css"; 

// Nota: Já não precisas de importar as páginas (Clientes, Projetos...) aqui,
// porque o App.jsx é que trata disso agora.

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <div className="dashboard-container">
      {/* Sidebar com toggle */}
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <main className="dashboard-main">
        {/* O <Outlet /> funciona como um "placeholder". 
           O React Router vai preencher este espaço automaticamente 
           com o componente correto (DashboardHome, Tarefas, etc.)
           dependendo do URL.
        */}
        <Outlet />
      </main>
    </div>
  );
}