import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/li": {
        target: "https://www.liveinternet.ru",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/li/, ""),
      },
    },
  },

})
