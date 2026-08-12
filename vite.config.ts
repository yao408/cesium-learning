import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  plugins: [
    vue(),
    cesium(),
    {
      name: 'save-scene-api',
      configureServer(server) {
        server.middlewares.use('/api/save-scene', (req, res) => {
          let body = ''
          req.on('data', c => body += c)
          req.on('end', () => {
            try {
              const positions = JSON.parse(body)
              const filePath = path.resolve('src/data/scene-config.json')
              const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

              for (const item of positions) {
                const name = item.name
                for (const key of ['buildings', 'roads', 'sensors']) {
                  const list = config[key]
                  if (list) {
                    const found = list.find((b: any) => (b.label || b.type || b.id) === name)
                    if (found) { found.x = item.x; found.z = item.z; if (item.ry !== undefined) found.ry = item.ry }
                  }
                }
                if (config.parkingLot && name === 'parkingLot') { config.parkingLot.x = item.x; config.parkingLot.z = item.z }
                if (config.waterPool && name === 'waterPool') { config.waterPool.x = item.x; config.waterPool.z = item.z }
              }

              fs.writeFileSync(filePath, JSON.stringify(config, null, 2))
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
          })
        })
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/geoserver': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/geoserver/, '/geoserver')
      }
    }
  }
})