import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createApiApp } from './src/server/index'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'express-plugin',
      configureServer(server) {
        server.middlewares.use('/api', createApiApp())
      }
    }
  ],
})
