import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', alias: '/dashboard', component: () => import('../pages/Dashboard.vue') },
  { path: '/multi-vehicle', component: () => import('../pages/MultiVehicle.vue') },
  { path: '/flood', component: () => import('../pages/FloodSim.vue') },
  { path: '/viewshed', component: () => import('../pages/ViewshedAnalysis.vue') },
  { path: '/data-import', component: () => import('../pages/DataImport.vue') },
  { path: '/earthquake', component: () => import('../pages/EarthquakeHeatmap.vue') },
  { path: '/dashboard', component: () => import('../pages/Dashboard.vue') },
  { path: '/bigscreen', component: () => import('../pages/BigScreen.vue') },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})