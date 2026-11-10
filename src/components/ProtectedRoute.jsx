import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase()
}

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="bz-hold" role="status" aria-label="A carregar">
        <span className="bz-hold-line"><span /></span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map(normalizeRole)
    const userRole = normalizeRole(userProfile?.role || userProfile?.tipo)

    if (!userRole || !normalizedAllowed.includes(userRole)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

