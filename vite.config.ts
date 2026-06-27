import path from 'node:path'

import { reactRouter } from '@react-router/dev/vite'
import { inspectorServer } from '@react-dev-inspector/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// react-dev-inspector is only useful during development; it opens the local IDE
// when you Shift+click an element in the browser. Skip it in production so the
// plugin doesn't try to launch an editor on the server.
const devOnlyInspector = process.env.NODE_ENV !== 'production' ? [inspectorServer()] : []

export default defineConfig({
  plugins: [
    {
      name: 'ignore-chrome-devtools-request',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/.well-known/appspecific/com.chrome.devtools.json') {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end('{}')
            return
          }

          next()
        })
      }
    },
    tailwindcss(),
    ...devOnlyInspector,
    reactRouter()
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app')
    }
  },
  css: {
    devSourcemap: true
  }
})
