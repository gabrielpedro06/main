// =====================================================================
// Árvore de rotas da app (HashRouter: os URLs são /#/dashboard/...).
// Providers: ThemeProvider > AuthProvider > GlobalTooltipProvider > HashRouter.
// /dashboard/* passa por <ProtectedRoute> (sessão + 2FA); rotas com `allowedRoles`
// também exigem um papel (profiles.role/tipo). Isto é só UX: a proteção real dos dados
// está nas políticas RLS do Supabase e nas verificações das rotas em api/.
// Ao criar uma página: acrescentar o import em rotas.js, o lazy() e a <Route> aqui, o título em
// pages/Dashboard.jsx (PAGE_TITLES) e o link em components/Sidebar.jsx.
// =====================================================================
import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";

// Contexto de Autenticação e Tema
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Login e layout vêm no ficheiro principal; o resto é carregado por partes (ver rotas.js)
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalTooltipProvider from "./components/GlobalTooltipProvider";
import DialogoGlobal from "./components/DialogoGlobal";
import ToastGlobal from "./components/ToastGlobal";
import Dashboard from "./pages/Dashboard";
import { PAGINAS } from "./rotas";
import "./estilosPaginas"; // CSS de todas as páginas, pela ordem original

const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Páginas do Dashboard (cada uma num ficheiro à parte)
const DashboardHome = lazy(PAGINAS[""]);
const MinhasTarefas = lazy(PAGINAS["minhas-tarefas"]);
const Tarefas = lazy(PAGINAS.tarefas);
const Projetos = lazy(PAGINAS.projetos);
const ProjetoDetalhe = lazy(PAGINAS["projetos/:id"]);
const Clientes = lazy(PAGINAS.clientes);
const Atividades = lazy(PAGINAS.atividades);
const Forum = lazy(PAGINAS.forum);
const RecursosHumanos = lazy(PAGINAS.rh);
const Ferias = lazy(PAGINAS.ferias);
const PedidoKm = lazy(PAGINAS["pedido-km"]);
const GestaoLeads = lazy(PAGINAS.leads);
const Marketing = lazy(PAGINAS.marketing);
const TransferGest = lazy(PAGINAS.transfergest);
const Perfil = lazy(PAGINAS.perfil);
const AdminDashboard = lazy(PAGINAS.admin);
const GestaoTemplates = lazy(PAGINAS.modelos);
const PropostasComerciais = lazy(PAGINAS["propostas/:id"]);
const ListaPropostas = lazy(PAGINAS.propostas);
const GestaoAvisos = lazy(PAGINAS.avisos);
const Cursos = lazy(PAGINAS.cursos);
const AtivosTIDashboard = lazy(PAGINAS["ativos-ti"]);
const AcoesFormacao = lazy(PAGINAS["acoes-formacao"]);
const OrganizadorPdf = lazy(PAGINAS["organizador-pdf"]);
const RegistoAtividade = lazy(PAGINAS.registos);
const AprovarPedido = lazy(PAGINAS["pedidos/:id"]);
const Ajuda = lazy(PAGINAS.ajuda);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalTooltipProvider>
          <HashRouter>
          <Suspense fallback={null}>
          <Routes>
          {/* === ROTAS PÚBLICAS === */}
          <Route path="/" element={<Login />} />
          {/* Sem registo livre: as contas são criadas por convite (Supabase → Authentication → Invite user) */}
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
            <Route path="rh" element={<ProtectedRoute allowedRoles={["admin", "administrador", "gestor"]}><RecursosHumanos /></ProtectedRoute>} />
            <Route path="pedidos/:id" element={<ProtectedRoute allowedRoles={["admin", "administrador", "gestor"]}><AprovarPedido /></ProtectedRoute>} />
            <Route path="ferias" element={<Ferias />} />
            <Route path="pedido-km" element={<PedidoKm />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="leads" element={<ProtectedRoute allowedRoles={["admin", "administrador", "gestor", "marketing"]}><GestaoLeads /></ProtectedRoute>} />
            <Route path="marketing" element={<ProtectedRoute allowedRoles={["admin", "administrador", "gestor", "marketing", "marketing plus"]}><Marketing /></ProtectedRoute>} />
            <Route path="transfergest" element={<ProtectedRoute allowedRoles={["admin", "administrador", "gestor"]}><TransferGest /></ProtectedRoute>} />
            <Route path="ativos-ti" element={<ProtectedRoute allowedRoles={["admin", "administrador", "gestor", "marketing plus"]}><AtivosTIDashboard /></ProtectedRoute>} />
            
            {/* ROTAS DE PROPOSTAS COMERCIAIS */}
            <Route path="propostas" element={<ProtectedRoute allowedRoles={["admin", "administrador"]}><ListaPropostas /></ProtectedRoute>} />
            <Route path="propostas/novo" element={<ProtectedRoute allowedRoles={["admin", "administrador"]}><PropostasComerciais /></ProtectedRoute>} />
            <Route path="propostas/:id" element={<ProtectedRoute allowedRoles={["admin", "administrador"]}><PropostasComerciais /></ProtectedRoute>} />
            <Route path="avisos" element={<GestaoAvisos />} />
            
            <Route path="admin" element={<ProtectedRoute allowedRoles={["admin", "administrador"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="registos" element={<ProtectedRoute allowedRoles={["admin", "administrador"]}><RegistoAtividade /></ProtectedRoute>} />
            
            {/* MUDAMOS DE /templates PARA /modelos PARA COMBINAR COM O MENU */}
            <Route path="modelos" element={<GestaoTemplates />} />
            
            {/* GESTÃO DE CURSOS */}
            <Route path="cursos" element={<Cursos />} />
            <Route path="acoes-formacao" element={<AcoesFormacao />} />
            <Route path="organizador-pdf" element={<OrganizadorPdf />} />
            <Route path="ajuda" element={<Ajuda />} />
            
          </Route>

          {/* 👈 ROTA 404 CATCH-ALL (PÁGINA NÃO ENCONTRADA) */}
          <Route path="*" element={
            <div style={{ textAlign: 'center', marginTop: '100px', color: '#64748b' }}>
              <h1 style={{ fontSize: '3rem', margin: 0, color: '#0f172a' }}>404</h1>
              <h2>Oops! Página não encontrada</h2>
              <p>O link que tentaste aceder não existe.</p>
              <a href="/" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 20px', background: 'var(--color-btnPrimary)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                Voltar ao Início
              </a>
            </div>
          } />

          </Routes>
          </Suspense>
        </HashRouter>
          <DialogoGlobal />
          <ToastGlobal />
      </GlobalTooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
