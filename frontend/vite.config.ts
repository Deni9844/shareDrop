import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: {},
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server:{
    port:1000
  }
})
