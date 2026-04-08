import { HashRouter, Routes, Route } from "react-router-dom";

// Contexto de Autenticação e Tema
import { AuthProvider } from "./context/AuthContext"; // 👈 IMPORTADO AQUI
import { ThemeProvider } from "./context/ThemeContext"; // 👈 IMPORTADO AQUI

// Páginas de Autenticação
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Layout e Proteção
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalTooltipProvider from "./components/GlobalTooltipProvider";
import Dashboard from "./pages/Dashboard"; 

// Páginas do Dashboard
import DashboardHome from "./pages/DashboardHome";
import MinhasTarefas from "./pages/MinhasTarefas";
import Tarefas from "./pages/Tarefas";
import Projetos from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe"; 
import Clientes from "./pages/Clientes";
import Atividades from "./pages/Atividades";
import Forum from "./pages/Forum";
import RecursosHumanos from "./pages/RecursosHumanos"; 
import Ferias from "./pages/Ausencias"; 
import PedidoKm from "./pages/PedidoKm";
import GestaoLeads from "./pages/GestaoLeads"; 
import Perfil from "./pages/Perfil";
import AdminDashboard from "./pages/AdminDashboard";
import GestaoTemplates from "./components/GestaoTemplates"; 
import PropostasComerciais from "./pages/PropostasComerciais";

export default function App() {
  return (
    // 👈 O AUTH PROVIDER E THEME PROVIDER ENVOLVEM AGORA TODA A APP
    <ThemeProvider>
      <AuthProvider>
        <GlobalTooltipProvider>
          <HashRouter>
          <Routes>
          {/* === ROTAS PÚBLICAS === */}
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* === ROTAS PROTEGIDAS (DASHBOARD) === */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
            
            <Route index element={<DashboardHome />} />
            
            {/* AS DUAS ROTAS DE TAREFAS */}
            <Route path="minhas-tarefas" element={<MinhasTarefas />} />
            <Route path="tarefas" element={<Tarefas />} />
            
            <Route path="projetos" element={<Projetos />} />
            <Route path="projetos/:id" element={<ProjetoDetalhe />} />
            
            <Route path="clientes" element={<Clientes />} />
            <Route path="atividades" element={<Atividades />} />
            <Route path="forum" element={<Forum />} />
            <Route path="rh" element={<RecursosHumanos />} />
            <Route path="ferias" element={<Ferias />} />
            <Route path="pedido-km" element={<PedidoKm />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="leads" element={<GestaoLeads />} />
            <Route path="propostas-comerciais" element={<PropostasComerciais />} />
            <Route path="admin" element={<ProtectedRoute allowedRoles={["admin", "administrador"]}><AdminDashboard /></ProtectedRoute>} />
            
            {/* MUDAMOS DE /templates PARA /modelos PARA COMBINAR COM O MENU */}
            <Route path="modelos" element={<GestaoTemplates />} /> 
            
          </Route>

          {/* 👈 ROTA 404 CATCH-ALL (PÁGINA NÃO ENCONTRADA) */}
          <Route path="*" element={
            <div style={{ textAlign: 'center', marginTop: '100px', color: '#64748b' }}>
              <h1 style={{ fontSize: '3rem', margin: 0, color: '#0f172a' }}>404</h1>
              <h2>Oops! Página não encontrada 🚧</h2>
              <p>O link que tentaste aceder não existe.</p>
              <a href="/" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 20px', background: 'var(--color-btnPrimary)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                Voltar ao Início
              </a>
            </div>
          } />

          </Routes>
        </HashRouter>
      </GlobalTooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
