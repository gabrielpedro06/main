import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles/main.css'
import './styles/motion.css'
import { instalarAberturaSegura } from './utils/ficheirosPrivados'

// Links para ficheiros privados (RH, documentos, chat) abrem com link temporário
instalarAberturaSegura()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)

