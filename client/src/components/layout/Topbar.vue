<template>
  <header class="topbar">
    <div>
      <h1>{{ heading }}</h1>
      <p v-if="subheading" class="muted">{{ subheading }}</p>
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

// Encabezado generico de cada pagina: titulo + subtitulo + usuario actual.
// El nombre/avatar sale del store de auth, no hace falta pasarlo por props.
defineProps({
  heading: { type: String, required: true },
  subheading: { type: String, default: '' },
})

const authStore = useAuthStore()
const initial = computed(() => authStore.username?.charAt(0).toUpperCase() || 'A')
</script>
