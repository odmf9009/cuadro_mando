<template>
  <nav class="breadcrumbs" aria-label="Ruta de navegación">
    <template v-for="(item, i) in items" :key="i">
      <AppIcon v-if="i > 0" name="chevron" :size="12" class="crumb-sep" />
      <SkeletonBlock v-if="!item.label" width="80px" height="0.8rem" />
      <RouterLink v-else-if="item.to && i < items.length - 1" :to="item.to" class="crumb-link">{{ item.label }}</RouterLink>
      <span v-else class="crumb-current" :aria-current="i === items.length - 1 ? 'page' : undefined">{{ item.label }}</span>
    </template>
  </nav>
</template>

<script setup>
import SkeletonBlock from './SkeletonBlock.vue'
import AppIcon from './AppIcon.vue'

// Migas de pan: items = [{ label, to? }]; la última es la página actual.
defineProps({
  items: { type: Array, required: true },
})
</script>

<style scoped>
.breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; margin-bottom: 8px; min-height: 20px; }
.crumb-link { color: var(--muted); }
.crumb-link:hover { color: var(--text); }
.crumb-current { color: var(--text); }
.crumb-sep { color: var(--faint); }
</style>
