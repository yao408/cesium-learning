import { createApp } from 'vue'// 引入vue创建应用函数
import { createPinia } from 'pinia'// 引入pinia状态管理库
import 'cesium/Build/Cesium/Widgets/widgets.css'// 引入cesium样式
import './style.css'// 引入全局样式
import App from './App.vue'// 引入根组件
import router from './router'// 引入路由配置

const pinia = createPinia()// 创建pinia实例
createApp(App).use(router).use(pinia).mount('#app')// 创建vue实例并挂载到app元素上