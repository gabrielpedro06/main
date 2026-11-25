// Ponto de entrada do browser (carregado por index.html): estilos globais,
// interceção de links para ficheiros privados e montagem de <App /> em #root.
// Nota: App.jsx volta a envolver tudo noutro <AuthProvider>; os componentes usam o mais interior.
// PRIMEIRO de tudo: lê o link de recuperação de password antes de o cliente Supabase o apagar do URL
import './utils/recuperacao'
// Tamanho da interface (80/90/100%) aplicado antes de desenhar a app
import './utils/tamanhoInterface'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles/tokens.css' // valores base do design (cantos, sombras, letra, cores)
import './styles/camadas.css'
import './styles/main.css'
import './styles/motion.css'
import './styles/sidebar-vidro.css' // sidebar em vidro (computador)
import './styles/acessibilidade.css'
import './styles/refinamentos.css'
import './styles/tamanho-interface.css'
import './styles/componentes-base.css' // botões e campos iguais em toda a app
import './styles/cabecalhos.css' // cabeçalho de página igual em todas as páginas
import './styles/janelas.css' // design único das janelas (por último: ganha aos estilos antigos)
import { instalarAberturaSegura } from './utils/ficheirosPrivados'
import { instalarPlaceholders } from './utils/placeholderImagem'
import { instalarTrianguloSeguro } from './utils/trianguloSeguro'
import { instalarSaidaJanelas } from './utils/saidaJanelas'

// Links para ficheiros privados (RH, documentos, chat) abrem com link temporário
instalarAberturaSegura()
// Fotos de perfil: placeholder desfocado enquanto carregam (estilo BlurHash)
instalarPlaceholders()
// Menus de hover (ex.: reações do Fórum): não fecham ao levar o rato na diagonal
instalarTrianguloSeguro()
// Janelas: animação curta (e interrompível) ao fechar, em todas de uma vez
instalarSaidaJanelas()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)

