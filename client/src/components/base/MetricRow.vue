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
          <span v-if="tag" class="metric-tag" :title="tagTitle">{{ tag }}</span>
          <strong>{{ value }}</strong>
          <span v-if="hint" class="muted small">{{ hint }}</span>
        </template>
        <span v-else class="metric-state">{{ state === 'pending' ? 'Pendiente' : 'No disponible' }}</span>
      </div>
    </div>

    <p v-if="state === 'unavailable' || state === 'pending'" class="muted small metric-reason">{{ reason }}</p>

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
import SkeletonBlock from './SkeletonBlock.vue'
import SourceTag from './SourceTag.vue'

// Una fila "etiqueta -> valor" con su origen. state:
//   loading     -> bloque de carga
//   ok          -> value (+ hint, tag, details, note)
//   unavailable -> no existe para este proyecto/tienda (reason explica por que)
//   pending     -> existe pero aun no se puede leer (reason explica que falta)
// details = [{ label, value }] desglose bajo la cifra (ej. por plan).
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  hint: { type: String, default: '' },
  state: { type: String, default: 'ok' },
  reason: { type: String, default: '' },
  source: { type: Object, default: null }, // { kind, label? } -> SourceTag
  tag: { type: String, default: '' }, // ej. "PRUEBA"
  tagTitle: { type: String, default: '' },
  details: { type: Array, default: () => [] },
  note: { type: String, default: '' },
})
</script>

<style scoped>
.metric-row {
  padding: 0.75rem 0;
  border-bottom: 1px dashed var(--border);
}
.metric-row:last-child { border-bottom: none; }

.metric-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}
.metric-main { display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-start; }
.metric-label { font-size: 0.9rem; }
.metric-value { display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; text-align: right; }
.metric-value strong { font-size: 1.15rem; }
.metric-state { font-size: 0.78rem; color: var(--muted); }
.metric-pending .metric-state { color: #facc15; }
.metric-reason { margin: 0.45rem 0 0; overflow-wrap: anywhere; }

.metric-tag {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}

.metric-details {
  list-style: none;
  margin: 0.55rem 0 0;
  padding: 0 0 0 0.8rem;
  border-left: 2px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.metric-details li { display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--muted); }
.metric-details strong { color: var(--text); }
.metric-note { margin: 0.5rem 0 0; }
</style>
