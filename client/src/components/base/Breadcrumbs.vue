<template>
  <nav class="breadcrumbs" aria-label="Ruta de navegación">
    <template v-for="(item, i) in items" :key="i">
      <span v-if="i > 0" class="crumb-sep" aria-hidden="true">›</span>
      <SkeletonBlock v-if="!item.label" width="80px" height="0.8rem" />
      <RouterLink v-else-if="item.to && i < items.length - 1" :to="item.to" class="crumb-link">{{ item.label }}</RouterLink>
      <span v-else class="crumb-current" :aria-current="i === items.length - 1 ? 'page' : undefined">{{ item.label }}</span>
    </template>
  </nav>
</template>

<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// Migas de pan: items = [{ label, to? }]. Todos clicables menos el ultimo
// (la pagina actual). Un item sin label (dato aun cargando) pinta un bloque
// de carga en su lugar.
defineProps({
  items: { type: Array, required: true },
})
</script>

<style scoped>
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  margin-bottom: 0.7rem;
}
.crumb-link { color: var(--muted); }
.crumb-link:hover { color: var(--text); text-decoration: underline; }
.crumb-current { color: var(--text); }
.crumb-sep { color: var(--muted); opacity: 0.6; }
</style>
