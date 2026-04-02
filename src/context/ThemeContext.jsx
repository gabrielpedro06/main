import { createContext, useContext, useState, useEffect } from 'react'
import { THEMES, DEFAULT_THEME } from '../constants/themes'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME)
  const [isLoading, setIsLoading] = useState(true)

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

    const theme = THEMES[currentTheme]
    if (!theme) return

    const root = document.documentElement
    
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

    // Salva no localStorage
    localStorage.setItem('app-theme', currentTheme)
  }, [currentTheme, isLoading])

  const changeTheme = (themeName) => {
    if (THEMES[themeName]) {
      setCurrentTheme(themeName)
    }
  }

  const value = {
    currentTheme,
    changeTheme,
    availableThemes: THEMES,
    themeColors: THEMES[currentTheme],
    isLoading
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider')
  }
  return context
}

