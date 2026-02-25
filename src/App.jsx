import { HashRouter, Routes, Route } from "react-router-dom";

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
import MinhasTarefas from "./pages/MinhasTarefas"; // 👈 NOVO IMPORT
import Tarefas from "./pages/Tarefas";
import Projetos from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe"; 
import Clientes from "./pages/Clientes";
import Atividades from "./pages/Atividades";
import Forum from "./pages/Forum";
import RecursosHumanos from "./pages/RecursosHumanos"; 
import Ferias from "./pages/Ausencias"; 
import GestaoLeads from "./pages/GestaoLeads"; 
import Perfil from "./pages/Perfil";
import GestaoTemplates from "./components/GestaoTemplates"; 

export default function App() {
  return (
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
          <Route path="minhas-tarefas" element={<MinhasTarefas />} /> {/* 👈 NOVA ROTA */}
          <Route path="tarefas" element={<Tarefas />} />
          
          <Route path="projetos" element={<Projetos />} />
          <Route path="projetos/:id" element={<ProjetoDetalhe />} />
          
          <Route path="clientes" element={<Clientes />} />
          <Route path="atividades" element={<Atividades />} />
          <Route path="forum" element={<Forum />} />
          <Route path="rh" element={<RecursosHumanos />} />
          <Route path="ferias" element={<Ferias />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="leads" element={<GestaoLeads />} />
          
          {/* MUDAMOS DE /templates PARA /modelos PARA COMBINAR COM O MENU */}
          <Route path="modelos" element={<GestaoTemplates />} /> 
          
        </Route>

      </Routes>
    </HashRouter>
  );
}