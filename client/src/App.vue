<template>
  <RouterView v-if="authStore.checked" />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

// El router guard ya llama a checkSession() antes de la primera navegacion,
// pero lo disparamos tambien aqui por si el guard corre antes de que Pinia
// este listo en el primer render. Mientras "checked" es false no se pinta
// nada (evita un parpadeo mostrando el login antes de saber si ya hay
// sesion vigente).
const authStore = useAuthStore()
onMounted(() => {
  if (!authStore.checked) authStore.checkSession()
})
</script>
