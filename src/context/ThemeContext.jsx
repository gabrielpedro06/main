// =====================================================================
// Tema visual da app. Os temas estão em src/constants/themes.js; o tema ativo é
// aplicado como variáveis CSS `--color-<chave>` em <html> e guardado em
// localStorage ("app-theme"), ou seja, por browser e não por utilizador.
// =====================================================================
import { createContext, useContext, useState, useEffect } from 'react'
import { THEMES, DEFAULT_THEME, coresEscuras } from '../constants/themes'

const ThemeContext = createContext()

/** Modo de cor: 'claro' | 'escuro' | 'auto' (segue o sistema). Guardado por pessoa neste browser. */
const CHAVE_MODO = 'app-modo'
const lerModo = () => {
  try {
    const v = localStorage.getItem(CHAVE_MODO)
    return v === 'escuro' || v === 'auto' ? v : 'claro'
  } catch { return 'claro' }
}
const sistemaEscuro = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
const resolverEscuro = (modo) => modo === 'escuro' || (modo === 'auto' && sistemaEscuro())

function applyThemeVariables(themeName, escuro = resolverEscuro(lerModo())) {
  const base = THEMES[themeName]
  if (!base) return
  // no modo escuro, a mesma paleta do tema em versão escura (constants/themes.js → coresEscuras)
  const theme = escuro ? { ...base, ...coresEscuras(base) } : base

  const root = document.documentElement
  root.dataset.modo = escuro ? 'escuro' : 'claro'
  root.style.colorScheme = escuro ? 'dark' : 'light' // barras de scroll, calendários e campos nativos

  // Registar propriedades de top-level (bgGradient, sidebarBgSecondary, accentColor)
  if (theme.bgGradient) {
    root.style.setProperty('--color-bgGradient', theme.bgGradient)
  }
  if (theme.sidebarBgSecondary) {
    root.style.setProperty('--color-sidebarBgSecondary', theme.sidebarBgSecondary)
  }
  if (theme.accentColor) {
    root.style.setProperty('--color-accentColor', theme.accentColor)
  }

  // Registar propriedades de cores
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value)
  })
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME)
  const [isLoading, setIsLoading] = useState(true)
  const [modo, setModoEstado] = useState(lerModo)
  const [escuroSistema, setEscuroSistema] = useState(sistemaEscuro)
  const escuro = modo === 'escuro' || (modo === 'auto' && escuroSistema)

  // "Automático": acompanha o sistema quando este muda (ex.: ao anoitecer)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return undefined
    const mudou = (e) => setEscuroSistema(e.matches)
    mq.addEventListener('change', mudou)
    return () => mq.removeEventListener('change', mudou)
  }, [])

  // Carrega o tema do localStorage ao iniciar
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme')
    if (savedTheme && THEMES[savedTheme]) {
      setCurrentTheme(savedTheme)
    }
    setIsLoading(false)
  }, [])

  // Atualiza as CSS variables sempre que o tema muda
  useEffect(() => {
    if (isLoading) return
    applyThemeVariables(currentTheme, escuro)
    // Salva no localStorage
    localStorage.setItem('app-theme', currentTheme)
  }, [currentTheme, isLoading, escuro])

  const changeTheme = (themeName) => {
    if (!THEMES[themeName] || themeName === currentTheme) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (typeof document.startViewTransition !== 'function' || reduceMotion) {
      setCurrentTheme(themeName)
      return
    }

    // Transição suave entre temas (cross-fade de toda a app)
    document.documentElement.classList.add('bz-theme-transition')
    const transition = document.startViewTransition(() => {
      applyThemeVariables(themeName, escuro)
    })
    transition.finished.finally(() => {
      document.documentElement.classList.remove('bz-theme-transition')
    })
    setCurrentTheme(themeName)
  }

  /** Muda o modo de cor ('claro' | 'escuro' | 'auto'), com a mesma transição suave do tema. */
  const setModo = (novo) => {
    if (!['claro', 'escuro', 'auto'].includes(novo)) return
    try { localStorage.setItem(CHAVE_MODO, novo) } catch { /* sem armazenamento */ }
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (typeof document.startViewTransition !== 'function' || reduceMotion) {
      setModoEstado(novo)
      return
    }
    document.documentElement.classList.add('bz-theme-transition')
    const transition = document.startViewTransition(() => {
      applyThemeVariables(currentTheme, resolverEscuro(novo))
    })
    transition.finished.finally(() => {
      document.documentElement.classList.remove('bz-theme-transition')
    })
    setModoEstado(novo)
  }

  const value = {
    currentTheme,
    changeTheme,
    availableThemes: THEMES,
    themeColors: THEMES[currentTheme],
    isLoading,
    modo,      // 'claro' | 'escuro' | 'auto'
    setModo,
    escuro,    // modo escuro ativo agora (true/false)
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/** { currentTheme, changeTheme(nome), availableThemes, themeColors, isLoading, modo, setModo(modo), escuro }. Lança erro fora do ThemeProvider. */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider')
  }
  return context
}

