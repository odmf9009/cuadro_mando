<template>
  <span class="app-mark" :style="{ '--c': color, '--s': size + 'px' }" aria-hidden="true">{{ initial }}</span>
</template>

<script setup>
import { computed } from 'vue'

// Identidad de una app: inicial sobre un tinte pálido de SU color (el del registro).
// Es identidad, no dato: nunca se usa en leyendas de gráficos ni como señal de estado.
const props = defineProps({
  name: { type: String, default: '' },
  color: { type: String, default: '#8a8f99' },
  size: { type: Number, default: 28 },
})
const initial = computed(() => (props.name || '?').trim().charAt(0).toUpperCase())
</script>

<style scoped>
.app-mark {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: var(--s); height: var(--s); border-radius: calc(var(--s) * 0.28);
  background: color-mix(in srgb, var(--c) 16%, var(--surface));
  color: color-mix(in srgb, var(--c) 70%, var(--text));
  font-size: calc(var(--s) * 0.46); font-weight: 600; line-height: 1;
}
</style>
