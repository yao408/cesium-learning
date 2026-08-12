import { createApp } from 'vue'// 引入vue创建应用函数

import { createPinia } from 'pinia'// 引入pinia状态管理库
import ElementPlus from 'element-plus'// 引入element-plus组件库
import 'element-plus/dist/index.css'// 引入element-plus样式
import * as ElementPlusIconsVue from '@element-plus/icons-vue'// 引入element-plus图标库
import 'cesium/Build/Cesium/Widgets/widgets.css'// 引入cesium样式
import './style.css'// 引入全局样式
import App from './App.vue'// 引入根组件
import router from './router'// 引入路由配置

const pinia = createPinia()// 创建pinia实例
const app = createApp(App)// 创建vue实例
app.use(ElementPlus)// 注册element-plus组件库
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)// 注册所有图标组件
}
app.use(router)// 注册路由
app.use(pinia)// 注册状态管理
app.mount('#app')// 挂载到app元素上