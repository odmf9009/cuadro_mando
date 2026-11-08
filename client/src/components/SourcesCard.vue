<template>
  <BaseCard title="Fuentes de esta app">
    <template #aside><span class="muted small">qué se puede leer hoy</span></template>
    <ul class="sources">
      <li v-for="s in items" :key="s.key">
        <div class="source-main">
          <span class="source-name">{{ s.label }}</span>
          <span v-if="s.detail" class="muted small">{{ s.detail }}</span>
        </div>
        <SkeletonBlock v-if="s.state === 'loading'" width="5rem" height="1.1rem" radius="999px" />
        <StatusChip v-else :label="s.text" :tone="s.tone" />
      </li>
    </ul>
  </BaseCard>
</template>

<script setup>
import BaseCard from './base/BaseCard.vue'
import StatusChip from './base/StatusChip.vue'
import SkeletonBlock from './base/SkeletonBlock.vue'

// "Mapa de fuentes" de una app: de cuántos orígenes (su base de datos, App Store, Google Play, pagos
// propios) se puede leer algo ahora mismo y cuáles están pendientes o no existen. Es lo propio de
// este producto: antes de fiarse de una cifra se ve de dónde viene y si llega.
// items = [{ key, label, detail?, state: 'loading' | …, text, tone: ok | pending | neutral | error }]
defineProps({ items: { type: Array, required: true } })
</script>

<style scoped>
.sources { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.sources li { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; border-bottom: 1px solid var(--rule); }
.sources li:last-child { border-bottom: none; }
.source-main { display: flex; flex-direction: column; min-width: 0; }
.source-name { font-size: 14px; }
</style>
