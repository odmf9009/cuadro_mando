<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <span class="brand-dot"></span>
      <span>Cuadro de Mando</span>
    </div>

    <nav class="sidebar-nav">
      <RouterLink to="/" class="nav-link" active-class="active" exact-active-class="active">
        <span class="nav-icon">▦</span> Resumen general
      </RouterLink>

      <div class="nav-section-label">Proyectos</div>
      <RouterLink
        v-for="p in projectsStore.items"
        :key="p.id"
        :to="`/project/${p.id}`"
        class="nav-link"
        :class="{ active: currentProjectId === p.id }"
      >
        <span class="nav-dot" :style="{ background: p.color }"></span>
        {{ p.name }}
      </RouterLink>
    </nav>

    <form class="sidebar-logout" @submit.prevent="onLogout">
      <BaseButton type="submit" variant="ghost">Cerrar sesión</BaseButton>
    </form>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '../../stores/projects'
import { useAuthStore } from '../../stores/auth'
import BaseButton from '../base/BaseButton.vue'

const projectsStore = useProjectsStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Resalta el proyecto activo tanto en /project/:id como en sus subrutas
// (ej. /project/:id/users) sin depender de coincidencia exacta de ruta.
const currentProjectId = computed(() => route.params.id || null)

async function onLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
