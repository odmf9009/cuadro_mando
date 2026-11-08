<template>
  <div class="layout">
    <Sidebar />
    <MobileBar :title="heading" />
    <main class="content">
      <Topbar :heading="heading" :subheading="subheading" :crumbs="crumbs">
        <template v-if="$slots.mark" #mark><slot name="mark" /></template>
        <template v-if="$slots.actions" #actions><slot name="actions" /></template>
      </Topbar>
      <slot />
    </main>
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue'
import MobileBar from './MobileBar.vue'
import Topbar from './Topbar.vue'

// Envoltorio común de todas las páginas autenticadas: barra lateral (o barra superior plegada en
// móvil), encabezado y contenido por slot. Cada página solo aporta título, línea de contexto,
// migas y, si hacen falta, acciones reales (slot "actions").
defineProps({
  heading: { type: String, default: '' },
  subheading: { type: String, default: '' },
  crumbs: { type: Array, default: () => [] },
})
</script>
