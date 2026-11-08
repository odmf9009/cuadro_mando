<template>
  <div class="metric-row" :class="`metric-${state}`">
    <div class="metric-head">
      <div class="metric-main">
        <span class="metric-label">{{ label }}</span>
        <SourceTag v-if="source" :kind="source.kind" :label="source.label" />
      </div>

      <div class="metric-value">
        <SkeletonBlock v-if="state === 'loading'" width="4rem" height="1.2rem" />
        <template v-else-if="state === 'ok'">
          <span class="metric-line">
            <span v-if="tag" class="metric-tag" :title="tagTitle">{{ tag }}</span>
            <strong :class="{ 'is-zero': isZero }">{{ value }}</strong>
          </span>
          <span v-if="hint" class="muted small">{{ hint }}</span>
        </template>
        <span v-else class="metric-state">{{ state === 'pending' ? 'Pendiente' : '—' }}</span>
      </div>
    </div>

    <p v-if="state === 'unavailable' || state === 'pending'" class="muted small metric-reason">{{ reason }}</p>

    <MiniBars
      v-if="state === 'ok' && series && series.length"
      class="metric-series"
      :items="series"
      :format="seriesFormat"
    />

    <ul v-if="state === 'ok' && details && details.length" class="metric-details">
      <li v-for="d in details" :key="d.label">
        <span>{{ d.label }}</span>
        <strong>{{ d.value }}</strong>
      </li>
    </ul>
    <p v-if="state === 'ok' && note" class="muted small metric-note">{{ note }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SkeletonBlock from './SkeletonBlock.vue'
import SourceTag from './SourceTag.vue'
import MiniBars from './MiniBars.vue'

// Una fila "etiqueta → valor" con su origen. state:
//   loading     → bloque de carga
//   ok          → value (+ hint, tag, details, note)
//   unavailable → no existe para este proyecto/tienda (reason explica por qué): guion gris
//   pending     → existe pero aún no se puede leer (reason explica qué falta)
// Un cero real se imprime ("0", "$0.00") en gris tenue; un dato que falta es un guion.
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  hint: { type: String, default: '' },
  state: { type: String, default: 'ok' },
  reason: { type: String, default: '' },
  source: { type: Object, default: null }, // { kind, label? } → SourceTag
  tag: { type: String, default: '' }, // p. ej. "PRUEBA"
  tagTitle: { type: String, default: '' },
  details: { type: Array, default: () => [] }, // [{ label, value }] desglose bajo la cifra
  note: { type: String, default: '' },
  series: { type: Array, default: () => [] }, // [{ label, value }] → barras bajo la cifra
  seriesColor: { type: String, default: '' }, // (heredado; el tono sale del tema)
  seriesFormat: { type: Function, default: (v) => String(v) },
})

const isZero = computed(() => /^[^\d]*0([.,]0+)?[^\d]*$/.test(String(props.value)))
</script>

<style scoped>
.metric-row { padding: 14px 0; border-bottom: 1px solid var(--rule); }
.metric-row:first-child { padding-top: 4px; }
.metric-row:last-child { border-bottom: none; padding-bottom: 0; }

.metric-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.metric-main { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; min-width: 0; }
.metric-label { font-size: 14px; }
.metric-value { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; text-align: right; }
.metric-line { display: inline-flex; align-items: center; gap: 8px; }
.metric-value strong { font-size: 18px; font-weight: 500; letter-spacing: -0.01em; }
.metric-state { font-size: 13px; color: var(--faint); }
.metric-pending .metric-state { color: var(--warning); }
.metric-reason { margin-top: 8px; overflow-wrap: anywhere; }

.metric-tag {
  font-size: 11px; font-weight: 600; line-height: 18px; padding: 0 6px; border-radius: 4px;
  background: var(--pill-warning-bg); color: var(--pill-warning-ink);
}

.metric-series { margin-top: 12px; }

.metric-details { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.metric-details li { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--muted); min-height: 24px; align-items: center; }
.metric-details strong { color: var(--text); font-weight: 500; }
.metric-note { margin-top: 8px; }
</style>
