<template>
  <div class="layout">
    <Sidebar />
    <main class="content">
      <Topbar :heading="heading" :subheading="subheading" />
      <slot />
    </main>
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'

// Envoltorio comun a todas las paginas autenticadas (sidebar + topbar +
// contenido). Cada pagina solo aporta su titulo/subtitulo y el cuerpo via
// slot default -> evita repetir la estructura .layout/.content en cada una.
defineProps({
  heading: { type: String, required: true },
  subheading: { type: String, default: '' },
})
</script>
