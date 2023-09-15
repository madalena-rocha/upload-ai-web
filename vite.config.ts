import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
    // O Vite, por padrão, tenta otimizar as dependências, reduzindo o tamanho do código e eliminando código desnecessário
    // Na integração com o ffmpeg, o Vite acaba excluindo código que não deveria excluir, parando de funcionar
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
