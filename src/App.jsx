import { BrowserRouter, Routes, Route } from "react-router-dom";

// Páginas de Autenticação
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Layout e Proteção
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard"; 

// Páginas do Dashboard
import DashboardHome from "./pages/DashboardHome";
import Tarefas from "./pages/Tarefas";
import Projetos from "./pages/Projetos";
import Clientes from "./pages/Clientes";
import Atividades from "./pages/Atividades";
import Forum from "./pages/Forum";
import RecursosHumanos from "./pages/RecursosHumanos"; 
import Ferias from "./pages/Ausencias"; 
import GestaoLeads from "./pages/GestaoLeads"; 
import Perfil from "./pages/Perfil";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* === ROTAS PÚBLICAS === */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* === ROTAS PROTEGIDAS (DASHBOARD) === */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
          
          <Route index element={<DashboardHome />} />
          
          <Route path="tarefas" element={<Tarefas />} />
          <Route path="projetos" element={<Projetos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="atividades" element={<Atividades />} />
          <Route path="forum" element={<Forum />} />
          <Route path="rh" element={<RecursosHumanos />} />
          <Route path="ferias" element={<Ferias />} />
          <Route path="perfil" element={<Perfil />} />
          
          {/* 2. ADICIONAR A ROTA AQUI 👇 */}
          <Route path="leads" element={<GestaoLeads />} />
          
        </Route>

      </Routes>
    </BrowserRouter>
  );
}