import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/multi-vehicle' },
  { path: '/multi-vehicle', component: () => import('../pages/MultiVehicle.vue') },
  { path: '/flood', component: () => import('../pages/FloodSim.vue') },
  { path: '/viewshed', component: () => import('../pages/ViewshedAnalysis.vue') },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})