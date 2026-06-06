import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Только для разработки на своём ПК: прокси на сервисы на 127.0.0.1. На стенде UI — https://atomic-asoc.ru (сборка + nginx в K8s, без Vite).
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
  },
  server: {
    port: 5173,
    // С другой машины в сети / по IP хоста открывай URL из строки «Network» в консоли Vite, не localhost.
    host: true,
    proxy: {
      '^/auth/': {
        target: 'http://127.0.0.1:8091',
        changeOrigin: true,
      },
      '^/api/v1/integrations': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '^/api/v1/console': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '^/api/v1/scans': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '^/api/v1/admin/': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '^/api/v1/sync': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
      '^/api/v1/findings': {
        target: 'http://127.0.0.1:8082',
        changeOrigin: true,
      },
      '^/api/v1/groups': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '^/api/v1/report': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '^/api/v1/tickets': {
        target: 'http://127.0.0.1:8083',
        changeOrigin: true,
      },
      '^/health$': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '^/health/auth': {
        target: 'http://127.0.0.1:8091',
        changeOrigin: true,
        rewrite: () => '/health',
      },
      '^/health/reference': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/health\/reference/, '/health'),
      },
      '^/health/processing': {
        target: 'http://127.0.0.1:8082',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/health\/processing/, '/health'),
      },
      '^/health/jira': {
        target: 'http://127.0.0.1:8083',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/health\/jira/, '/health'),
      },
      '^/health/semgrep': {
        target: 'http://127.0.0.1:8085',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/health\/semgrep/, '/health'),
      },
      '^/health/gitleaks': {
        target: 'http://127.0.0.1:8086',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/health\/gitleaks/, '/health'),
      },
    },
  },
})
