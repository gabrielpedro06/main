import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Tamanho da interface (zoom no computador, ver src/utils/tamanhoInterface.js).
 * Com `zoom` no <html>, as unidades de ecrã (100vh, 50vw…) também encolhem e a
 * app deixava de ocupar a altura toda. Este plugin troca, em todo o CSS,
 * `100vh` por `calc(100 * var(--bz-vh, 1vh))`: sem zoom é igual; com zoom,
 * --bz-vh compensa (definido em styles/tamanho-interface.css).
 */
const UNIDADES_ECRA = /(-?\d*\.?\d+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw)\b/g
const compensarZoomEcra = {
  postcssPlugin: 'bz-compensar-zoom-ecra',
  Declaration(decl) {
    if (decl.prop.startsWith('--bz-')) return // as próprias variáveis de compensação
    // Já convertido (o PostCSS volta a visitar declarações alteradas: sem isto, ciclo infinito)
    if (decl.value.includes('var(--bz-')) return
    if (!UNIDADES_ECRA.test(decl.value)) return
    UNIDADES_ECRA.lastIndex = 0
    decl.value = decl.value.replace(UNIDADES_ECRA, (_, n, u) => `calc(${n} * var(--bz-${u}, 1${u}))`)
  },
}

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: { plugins: [compensarZoomEcra] },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
