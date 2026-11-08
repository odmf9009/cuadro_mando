<template>
  <section class="panel store-card" :class="{ reveal: !loading }">
    <header class="store-card-head">
      <h2>{{ title }}</h2>
      <StatusChip v-if="status" :label="statusText" :tone="status.tone" />
    </header>
    <p v-if="!status && statusFallback" class="muted small next-version">{{ statusFallback }}</p>
    <p v-if="status?.next" class="muted small next-version">
      Versión más reciente ({{ status.next.version }}): {{ status.next.label.toLowerCase() }}
    </p>

    <div class="store-card-body">
      <SkeletonLines v-if="loading" />
      <template v-else>
        <MetricRow v-for="row in rows" :key="row.id" v-bind="row" />
      </template>
    </div>

    <footer v-if="footer" class="store-card-foot muted small">{{ footer }}</footer>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import MetricRow from './base/MetricRow.vue'
import StatusChip from './base/StatusChip.vue'
import SkeletonLines from './base/SkeletonLines.vue'

// Tarjeta de UN origen de datos (App Store, Google Play, o datos propios de la app). Es solo
// presentación: recibe ya calculadas las filas (ver composables/useProjectSections.js), así se
// reutiliza igual para cualquier proyecto y cualquier origen nuevo.
//   rows   = props de MetricRow + un "id" único
//   status = { label, tone, version?, next? } | null  → chip de estado
//   loading = sin datos todavía: cuerpo de bloques de carga
// "kind" (apple | google | web | firebase | db) se conserva por compatibilidad: el marco no
// lleva color, el origen lo dice cada fila con su SourceTag.
const props = defineProps({
  title: { type: String, required: true },
  kind: { type: String, default: 'db' },
  status: { type: Object, default: null },
  statusFallback: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  footer: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const statusText = computed(() =>
  props.status.version ? `${props.status.label} · v${props.status.version}` : props.status.label
)
</script>

<style scoped>
.store-card { display: flex; flex-direction: column; }
.store-card-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px 12px; margin-bottom: 10px; }
.store-card-head h2 { margin: 0; }
.next-version { margin-bottom: 8px; }
.store-card-foot { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--rule); }
</style>
