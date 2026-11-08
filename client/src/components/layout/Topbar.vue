<template>
  <header class="page-head">
    <div class="page-head-main">
      <Breadcrumbs v-if="crumbs.length" :items="crumbs" />
      <div class="title-row">
        <slot name="mark" />
        <h1>
          <template v-if="heading">{{ heading }}</template>
          <SkeletonBlock v-else width="220px" height="1.5rem" />
        </h1>
      </div>
      <p v-if="subheading" class="page-sub">{{ subheading }}</p>
      <p v-else-if="!heading" class="page-sub"><SkeletonBlock width="300px" height="0.85rem" /></p>
    </div>
    <div v-if="$slots.actions" class="page-actions"><slot name="actions" /></div>
  </header>
</template>

<script setup>
import SkeletonBlock from '../base/SkeletonBlock.vue'
import Breadcrumbs from '../base/Breadcrumbs.vue'

// Encabezado de cada pantalla: migas, título (un sustantivo, 24 px), una línea de contexto y,
// a la derecha, solo acciones reales (slot "actions"). Sin saludo ni usuario: eso vive en la
// barra lateral. Sin heading (aún cargando el proyecto) muestra bloques de carga.
defineProps({
  heading: { type: String, default: '' },
  subheading: { type: String, default: '' },
  crumbs: { type: Array, default: () => [] },
})
</script>

<style scoped>
.page-head-main { min-width: 0; }
.title-row { display: flex; align-items: center; gap: 12px; }
</style>
