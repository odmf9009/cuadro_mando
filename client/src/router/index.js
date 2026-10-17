import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { public: true } },
  { path: '/', name: 'overview', component: () => import('../pages/OverviewPage.vue') },
  { path: '/project/:id', name: 'project', component: () => import('../pages/ProjectDetailPage.vue'), props: true },
  // El listado de usuarios ahora vive dentro de la pagina del proyecto: esta
  // ruta se conserva solo para que los enlaces viejos sigan funcionando.
  {
    path: '/project/:id/users',
    redirect: (to) => ({ path: `/project/${to.params.id}`, query: to.query, hash: '#usuarios' }),
  },
  { path: '/project/:id/users/:userId', name: 'project-user', component: () => import('../pages/UserDetailPage.vue'), props: true },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  // Los enlaces con #ancla (ej. #usuarios) bajan suave hasta esa seccion.
  scrollBehavior(to, from, saved) {
    if (to.hash) return { el: to.hash, top: 12, behavior: 'smooth' }
    return saved || { top: 0 }
  },
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
