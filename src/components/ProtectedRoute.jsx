// Guarda de rotas (App.jsx). Sem sessão ou com 2FA por validar → volta ao Login
// (guardando a rota de origem em state.from); com allowedRoles, compara com
// profiles.role (ou .tipo) e manda para /dashboard se não tiver permissão.
// ATENÇÃO: isto só esconde ecrãs; a segurança real está nas políticas RLS do Supabase.
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase()
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children página protegida
 * @param {string[]|null} [props.allowedRoles] papéis permitidos (comparação sem maiúsculas),
 *   ex.: ["admin", "administrador", "gestor"]. null/[] = qualquer utilizador autenticado.
 */
export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, userProfile, loading, mfaPending } = useAuth()
  const location = useLocation()
  // Depois do login (e do 2FA) volta a esta página (ex.: link de um email)
  const destino = { from: `${location.pathname}${location.search}` }

  if (loading) {
    return (
      <div className="bz-hold" role="status" aria-label="A carregar">
        <span className="bz-hold-line"><span /></span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" state={destino} />
  }

  // 2FA ativo mas código ainda não introduzido: volta ao login para o pedir
  if (mfaPending) {
    return <Navigate to="/" replace state={destino} />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    // Logo a seguir ao 2FA o perfil (papel) ainda está a chegar: espera em vez de mandar para o início
    if (!userProfile) {
      return (
        <div className="bz-hold" role="status" aria-label="A carregar">
          <span className="bz-hold-line"><span /></span>
        </div>
      )
    }
    const normalizedAllowed = allowedRoles.map(normalizeRole)
    const userRole = normalizeRole(userProfile?.role || userProfile?.tipo)

    if (!userRole || !normalizedAllowed.includes(userRole)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

