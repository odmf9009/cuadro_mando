<template>
  <section class="panel store-card" :class="{ reveal: !loading }">
    <header class="store-card-head">
      <div class="store-card-title">
        <span class="store-badge" :class="`badge-${kind}`" aria-hidden="true">{{ initial }}</span>
        <h2>{{ title }}</h2>
      </div>
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

// Tarjeta de UN origen de datos (App Store, Google Play, o datos propios de la
// app). Es solo presentacion: recibe ya calculadas las filas (ver
// composables/useProjectSections.js), asi se reutiliza igual para cualquier
// proyecto y cualquier origen nuevo (ej. una tercera tienda).
//   rows   = props de MetricRow + un "id" unico
//   status = { label, tone, version?, next? } | null  -> chip de estado
//   loading = sin datos todavia: cuerpo de bloques de carga (los datos parciales
//             se muestran con filas en state "loading", no con este flag)
const props = defineProps({
  title: { type: String, required: true },
  kind: { type: String, default: 'db' }, // apple | google | web | firebase | db
  status: { type: Object, default: null },
  statusFallback: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  footer: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const initial = computed(() => props.title.trim().charAt(0).toUpperCase())
const statusText = computed(() =>
  props.status.version ? `${props.status.label} · v${props.status.version}` : props.status.label
)
</script>

<style scoped>
.store-card { display: flex; flex-direction: column; gap: 0.2rem; }

.store-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.4rem;
}
.store-card-title { display: flex; align-items: center; gap: 0.6rem; white-space: nowrap; }
.store-card-title h2 { margin: 0; font-size: 1.05rem; }

.store-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  color: #0b0f19;
}
.badge-apple { background: #e5e7eb; }
.badge-google { background: #4ade80; }
.badge-web { background: #a5b4fc; }
.badge-firebase { background: #fbbf24; }
.badge-db { background: var(--muted); }

.next-version { margin: 0 0 0.3rem; }
.store-card-foot { margin-top: 0.6rem; padding-top: 0.6rem; border-top: 1px solid var(--border); }
</style>
