<template>
  <div class="sidebar-foot">
    <ThemeToggle />
    <div class="user-row">
      <span class="user-initial" aria-hidden="true">{{ initial }}</span>
      <span class="user-name">{{ authStore.username }}</span>
    </div>
    <form class="sidebar-logout" @submit.prevent="onLogout">
      <BaseButton type="submit" variant="ghost" size="small">
        <AppIcon name="logout" />
        Cerrar sesión
      </BaseButton>
    </form>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import BaseButton from '../base/BaseButton.vue'
import ThemeToggle from '../base/ThemeToggle.vue'
import AppIcon from '../base/AppIcon.vue'

// Pie de la barra lateral (y de la hoja del móvil): tema, usuario y cerrar sesión.
const authStore = useAuthStore()
const router = useRouter()
const initial = computed(() => authStore.username?.charAt(0).toUpperCase() || 'A')

async function onLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.sidebar-logout :deep(.button-link) { width: 100%; }
</style>
