import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase()
}

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

