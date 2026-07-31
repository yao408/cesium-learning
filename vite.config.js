import { defineConfig } from 'vite'// 引入vite配置函数
import vue from '@vitejs/plugin-vue'// 引入vue插件
import cesium from 'vite-plugin-cesium'// 引入cesium插件


//导出配置，让 Vite 读取，defineConfig()	Vite 提供的配置函数，有类型提示，plugins: []	插件数组，Vite 会按顺序执行
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), cesium()],// 配置插件
  server: {
    proxy: {
      '/geoserver': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/geoserver/, '/geoserver')
      }
    }
  }
})