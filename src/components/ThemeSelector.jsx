import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { THEMES } from '../constants/themes'
import '../styles/themeSelector.css'

export default function ThemeSelector() {
  const { currentTheme, changeTheme } = useTheme()
  const [showSelector, setShowSelector] = useState(false)

  const handleThemeChange = (themeName) => {
    changeTheme(themeName)
    setShowSelector(false)
  }

  // Cores de preview para cada tema
  const getPreviewColor = (themeName) => {
    return THEMES[themeName].colors.btnPrimary
  }

  return (
    <div className="theme-selector-container">
      <div className="theme-selector-header">
        <h3>🎨 Escolha um Tema</h3>
        <p className="theme-current">Tema atual: <strong>{THEMES[currentTheme].name}</strong></p>
      </div>

      <div className="theme-grid">
        {Object.entries(THEMES).map(([key, theme]) => (
          <button
            key={key}
            className={`theme-card ${currentTheme === key ? 'active' : ''}`}
            onClick={() => handleThemeChange(key)}
            title={theme.description}
          >
            {/* Preview da cor */}
            <div 
              className="theme-preview"
              style={{ backgroundColor: theme.colors.btnPrimary }}
            />
            
            {/* Nome do tema */}
            <div className="theme-info">
              <span className="theme-name">{theme.name}</span>
              {currentTheme === key && <span className="theme-badge">✓ Ativo</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="theme-disclaimer">
        <p>💡 A mudança de tema é instantânea e é guardada automaticamente.</p>
      </div>
    </div>
  )
}

