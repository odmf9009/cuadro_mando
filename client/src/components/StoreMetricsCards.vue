<template>
  <BaseCard title="Google Play">
    <template v-if="storeStats.google.supported && storeStats.google.totalInstalls != null">
      <p class="big-number">{{ storeStats.google.totalInstalls.toLocaleString('es') }} <span class="muted small">instalaciones ({{ storeStats.google.month }})</span></p>
      <p class="muted small">{{ storeStats.google.totalUninstalls.toLocaleString('es') }} desinstalaciones en el mismo periodo</p>
    </template>
    <p v-else class="muted small">{{ googleMessage }}</p>
  </BaseCard>

  <BaseCard title="App Store">
    <template v-if="storeStats.apple.supported && storeStats.apple.units != null">
      <p class="big-number">{{ storeStats.apple.units.toLocaleString('es') }} <span class="muted small">descargas ({{ storeStats.apple.month }})</span></p>
      <p class="muted small">Proceeds del desarrollador: ${{ storeStats.apple.proceeds.toFixed(2) }}</p>
    </template>
    <p v-else class="muted small">{{ appleMessage }}</p>
  </BaseCard>
</template>

<script setup>
import { computed } from 'vue'
import BaseCard from './base/BaseCard.vue'

// Tarjetas de Google Play / App Store, reutilizadas tanto en proyectos con
// backend propio (junto a sus otros paneles) como en proyectos sin backend
// (ej. SkillFix), donde son lo unico que hay para mostrar.
const props = defineProps({
  storeStats: { type: Object, required: true },
})

// Un solo string (no texto + <template> separados) para que el espacio
// antes de "Ver README" no dependa de como Vue condensa espacios en blanco.
function message(entry) {
  if (!entry) return ''
  const base = entry.reason || entry.note || 'Sin datos todavía.'
  const hint = entry.supported ? '' : ' Ver README → "Instalaciones desde Google Play / App Store".'
  return base + hint
}
const googleMessage = computed(() => message(props.storeStats?.google))
const appleMessage = computed(() => message(props.storeStats?.apple))
</script>
