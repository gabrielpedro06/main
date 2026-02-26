import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "../services/supabase"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null) // AQUI GUARDAMOS O PERFIL/ROLE
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Vai buscar o utilizador atual (Sessão)
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null)
      if (data?.user) {
        fetchProfile(data.user.id) // Se houver user, vai buscar o Role dele
      } else {
        setLoading(false)
      }
    })

    // 2. Fica à escuta de Logins / Logouts
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setUserProfile(null) // Limpa o perfil ao fazer logout
          setLoading(false)
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  // Função para buscar o Perfil à tabela 'profiles'
  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
      
    if (!error && data) {
      setUserProfile(data);
    } else {
      console.error("Erro ao buscar perfil:", error);
    }
    setLoading(false);
  }

  // Função para dar Logout (útil para o Navbar/Sidebar)
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ 
        user, 
        userProfile, 
        setUserProfile, // <--- ADICIONADO AQUI! (Isto resolve o erro vermelho)
        signOut, 
        loading 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}