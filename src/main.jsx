// Ponto de entrada do browser (carregado por index.html): estilos globais,
// interceção de links para ficheiros privados e montagem de <App /> em #root.
// Nota: App.jsx volta a envolver tudo noutro <AuthProvider>; os componentes usam o mais interior.
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles/camadas.css'
import './styles/main.css'
import './styles/motion.css'
import './styles/acessibilidade.css'
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

