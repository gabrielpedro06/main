import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/nif-api': {
        target: 'https://www.nif.pt',
        changeOrigin: true,
        secure: false,
        headers: {
          // O disfarce perfeito para enganar o Cloudflare do NIF.pt
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        rewrite: (path) => path.replace(/^\/nif-api/, '')
      }
    }
  }
})