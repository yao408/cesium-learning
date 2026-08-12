import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', alias: '/dashboard', component: () => import('../pages/Dashboard.vue') },
  { path: '/data-management', component: () => import('../pages/DataManagement.vue'), meta: { plain: true } },
  { path: '/factory/:id', component: () => import('../pages/FactoryDetail.vue'), meta: { plain: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})