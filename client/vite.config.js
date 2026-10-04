import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // Todo lo que el SPA llama (login, logout, /api/*) vive en el Express
      // de src/server.js. En dev corren en puertos distintos, asi que Vite
      // hace de proxy para que las cookies de sesion funcionen como si
      // fueran el mismo origen (evita CORS por completo).
      '/api': 'http://localhost:4000',
    },
  },
})
