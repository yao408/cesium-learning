import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', alias: '/dashboard', component: () => import('../pages/Dashboard.vue') },
  { path: '/multi-vehicle', component: () => import('../pages/MultiVehicle.vue') },
  { path: '/flood', component: () => import('../pages/FloodSim.vue') },
  { path: '/viewshed', component: () => import('../pages/ViewshedAnalysis.vue') },
  { path: '/data-import', component: () => import('../pages/DataImport.vue') },
  { path: '/earthquake', component: () => import('../pages/EarthquakeHeatmap.vue') },
  { path: '/bigscreen', component: () => import('../pages/BigScreen.vue') },
  { path: '/data-management', component: () => import('../pages/DataManagement.vue'), meta: { plain: true } },
  { path: '/factory/:id', component: () => import('../pages/FactoryDetail.vue'), meta: { plain: true } },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})