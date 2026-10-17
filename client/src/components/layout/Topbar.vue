<template>
  <header class="topbar">
    <div>
      <h1>
        <template v-if="heading">{{ heading }}</template>
        <SkeletonBlock v-else width="240px" height="1.4rem" />
      </h1>
      <p v-if="subheading" class="muted">{{ subheading }}</p>
      <p v-else-if="!heading" class="muted"><SkeletonBlock width="300px" height="0.85rem" /></p>
    </div>
    <div class="topbar-user">
      <span class="muted">Hola, {{ authStore.username }}</span>
      <span class="avatar">{{ initial }}</span>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import SkeletonBlock from '../base/SkeletonBlock.vue'

// Encabezado generico de cada pagina: titulo + subtitulo + usuario actual.
// El nombre/avatar sale del store de auth, no hace falta pasarlo por props.
// Sin heading (aun cargando el proyecto) muestra bloques de carga.
defineProps({
  heading: { type: String, default: '' },
  subheading: { type: String, default: '' },
})

const authStore = useAuthStore()
const initial = computed(() => authStore.username?.charAt(0).toUpperCase() || 'A')
</script>
