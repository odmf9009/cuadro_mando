<template>
  <span class="status-chip" :class="`chip-${tone}`">{{ label }}</span>
</template>

<script setup>
// Chip de estado de varios tonos: ok | pending | neutral | error. Pares pálidos de style.css
// (tinte suave con texto oscuro del mismo tono); nunca un relleno saturado.
defineProps({
  label: { type: String, required: true },
  tone: { type: String, default: 'neutral' },
})
</script>
