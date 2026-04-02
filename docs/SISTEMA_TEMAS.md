# 🎨 Sistema de Temas da Aplicação

## Estrutura Implementada

O sistema de temas foi construído com foco em **escalabilidade**, **performance** e **facilidade de uso**. Aqui está como funciona:

### Componentes Principais

#### 1. **ThemeContext.jsx** (`src/context/ThemeContext.jsx`)
- Gerencia o tema atual
- Persist a escolha no `localStorage`
- Aplica as variáveis CSS ao documento
- Hook `useTheme()` para acesso em qualquer componente

#### 2. **themes.js** (`src/constants/themes.js`)
- Definição de todos os temas disponíveis
- Cada tema tem uma paleta de cores personalizada
- Cores organizadas por categoria (backgrounds, botões, texto, etc.)

#### 3. **ThemeSelector.jsx** (`src/components/ThemeSelector.jsx`)
- Interface visual para escolher temas
- Grid responsivo com preview das cores
- Integrado na página de Perfil

#### 4. **dashboard.css** (refatorado)
- Usa CSS Variables `var(--color-*)`
- Mudanças de tema acontecem instantaneamente
- Zero impacto na performance

---

## Temas Disponíveis

| Tema | Descrição | Primária |
|------|-----------|----------|
| **Default** | Padrão da aplicação | Azul #2563eb |
| **Primavera** | Cores frescas da primavera | Teal #06b6d4 |
| **Verão** | Cores quentes do verão | Amarelo #eab308 |
| **Outono** | Cores douradas do outono | Laranja #f97316 |
| **Inverno** | Cores frias do inverno | Ciano #06b6d4 |
| **Páscoa** | Pastel colorido | Rosa #ec4899 |
| **Natal** | Cores festivas | Vermelho #dc2626 |
| **Religioso** | Tema solene e respeitoso | Roxo #7c3aed |

---

## Como Usar

### Para o Utilizador
1. Ir para a página de **Perfil**
2. Descer até à secção **"🎨 Escolha um Tema"**
3. Clicar no tema desejado
4. A mudança é instantânea e guardada automaticamente

### Para o Programador

#### Importar o Hook
```jsx
import { useTheme } from "../context/ThemeContext"

export function MyComponent() {
  const { currentTheme, changeTheme, themeColors } = useTheme()
  
  return <div style={{ color: themeColors.textPrimary }}>
    Tema atual: {currentTheme}
  </div>
}
```

#### Usar Variáveis CSS
```css
.my-element {
  background: var(--color-bgPrimary);
  color: var(--color-textPrimary);
  border: 1px solid var(--color-borderColor);
}

.my-button {
  background: var(--color-btnPrimary);
}
```

---

## Adicionar um Novo Tema

### 1. Editar `themes.js`

```javascript
export const THEMES = {
  // ... temas existentes ...
  
  meeunico: {
    name: "Meu Único",
    description: "Descrição do tema",
    colors: {
      bgPrimary: "#ffffff",      // Fundo principal
      bgSecondary: "#f8f8f8",    // Fundo secundário
      bgTertiary: "#ffffff",     // Fundo terciário
      
      sidebarBg: "#2d3748",      // Fundo da sidebar
      sidebarText: "#e2e8f0",    // Texto da sidebar
      sidebarHover: "rgba(255, 255, 255, 0.1)",
      sidebarActive: "#4299e1",
      toggleBg: "#1a202c",
      toggleBorder: "#4a5568",
      toggleText: "#a0aec0",
      
      btnPrimary: "#4299e1",     // Botões primários
      btnPrimaryDark: "#3182ce",
      btnPrimaryDarker: "#2c5aa0",
      btnPrimaryShadow: "rgba(66, 153, 225, 0.26)",
      btnPrimaryShadowHover: "rgba(66, 153, 225, 0.36)",
      
      textPrimary: "#1a202c",    // Texto principal
      textSecondary: "#4a5568",
      textLight: "#718096",
      textWhite: "#ffffff",
      
      borderColor: "#cbd5e1",    // Bordas
      borderColorLight: "#e2e8f0",
    }
  }
};
```

### 2. Estrutura de Cores (Referência)

Cada tema deve ter estas cores:

```
📦 Backgrounds
  - bgPrimary: Fundo principal da página
  - bgSecondary: Fundo de secções
  - bgTertiary: Fundo de inputs/modais

🎨 Sidebar
  - sidebarBg: Fundo da barra lateral
  - sidebarText: Texto normal na sidebar
  - sidebarHover: Cor ao passar o rato
  - sidebarActive: Cor do item ativo
  - toggleBg: Fundo do botão de toggle
  - toggleBorder: Borda do toggle
  - toggleText: Texto do toggle

🔵 Botões Primários
  - btnPrimary: Cor principal do botão
  - btnPrimaryDark: Cor mais escura (hover)
  - btnPrimaryDarker: Cor ainda mais escura (ativa)
  - btnPrimaryShadow: Sombra inicial
  - btnPrimaryShadowHover: Sombra no hover

📝 Texto
  - textPrimary: Texto principal/títulos
  - textSecondary: Texto secundário
  - textLight: Texto leve/subtítulo
  - textWhite: Texto branco

🔲 Bordas
  - borderColor: Bordas normais
  - borderColorLight: Bordas claras
```

---

## Como Funcionam as Variáveis CSS

Quando o tema muda, o `ThemeContext` faz isto:

```javascript
// Aplica variáveis ao documento
const root = document.documentElement
Object.entries(theme.colors).forEach(([key, value]) => {
  root.style.setProperty(`--color-${key}`, value)
})
```

Depois, no CSS, usamos:
```css
.button {
  background: var(--color-btnPrimary);
}

/* Quando o tema muda, esta variável muda automaticamente! */
```

---

## Persistência

A escolha de tema é guardada no `localStorage`:

```javascript
localStorage.setItem('app-theme', 'natal')  // Tema ativo
const saved = localStorage.getItem('app-theme')  // Recupera ao iniciar
```

Ao recarregar a página, o tema anterior é restaurado automaticamente.

---

## Performance

- ✅ Sem re-renders desnecessários
- ✅ Mudança de tema é instantânea (apenas CSS)
- ✅ Sem duplicação de código CSS
- ✅ Ficheiro de temas é carregado só uma vez

---

## Exemplos Avançados

### Usar cores dinâmicas em JavaScript
```jsx
import { useTheme } from "../context/ThemeContext"

export function Card() {
  const { themeColors } = useTheme()
  
  return <div style={{
    background: themeColors.bgTertiary,
    border: `1px solid ${themeColors.borderColor}`,
    color: themeColors.textPrimary
  }}>
    Conteúdo
  </div>
}
```

### Criar um componente que responde ao tema
```jsx
export function ThemedButton() {
  const { currentTheme, themeColors } = useTheme()
  
  return <button style={{
    background: themeColors.btnPrimary,
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }}>
    Tema: {currentTheme}
  </button>
}
```

---

## Troubleshooting

### As cores não mudam
1. Verifica se o `ThemeProvider` envolve toda a app em `App.jsx`
2. Verifica se estás usando `var(--color-*)` e não cores hardcoded

### 404 no localStorage
- Isto é normal em navegação privada
- O tema volta ao padrão, mas funciona normalmente

### Tema não persiste
- Verifica se o `localStorage` está ativado no navegador
- Verifica a consola para erros

---

## Roadmap Futuro

- [ ] Tema automático baseado em datas (Natal em dezembro, Páscoa em abril, etc.)
- [ ] Opção de tema escuro/claro dentro de cada tema
- [ ] Customization avançado de cores no admin
- [ ] Exportar/Importar temas personalizados
- [ ] Preview em tempo real de temas

---

**Última atualização:** Abril 2026  
**Versão:** 1.0.0
