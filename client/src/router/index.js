import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { public: true } },
  { path: '/', name: 'overview', component: () => import('../pages/OverviewPage.vue') },
  { path: '/project/:id', name: 'project', component: () => import('../pages/ProjectDetailPage.vue'), props: true },
  { path: '/project/:id/users', name: 'project-users', component: () => import('../pages/UsersPage.vue'), props: true },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard unico: se asegura de que la sesion ya se comprobo contra el server
// (checkSession solo pega a /api/auth/me la primera vez) y redirige segun
// corresponda. Las rutas "public" (login) son las unicas accesibles sin
// sesion; el resto exige estar autenticado.
router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!authStore.checked) await authStore.checkSession()

  if (!to.meta.public && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.public && authStore.isAuthenticated) {
    return { name: 'overview' }
  }
  return true
})
