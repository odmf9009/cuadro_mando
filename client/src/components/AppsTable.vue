<template>
  <section class="panel apps-panel" aria-labelledby="apps-title">
    <div class="panel-head">
      <h2 id="apps-title">Apps</h2>
      <span class="muted small">Toca una fila para ver su ficha</span>
    </div>

    <!-- Escritorio y tablet: tabla con los datos agrupados por ORIGEN (cada grupo dice de dónde viene) -->
    <div class="table-scroll apps-table-wrap">
      <table class="data-table apps-table">
        <thead>
          <tr class="group-row">
            <th rowspan="2" class="col-app">App</th>
            <th colspan="3" class="group"><SourceTag kind="db" label="Base de datos de la app" /></th>
            <th colspan="3" class="group"><SourceTag kind="apple" :label="appleMonth ? `App Store · informe de ${appleMonth}` : 'App Store'" /></th>
            <th colspan="2" class="group"><SourceTag kind="google" :label="googleMonth ? `Google Play · ${googleMonth}` : 'Google Play'" /></th>
          </tr>
          <tr>
            <th v-for="col in dbCols" :key="col.key" class="num" :aria-sort="ariaSort(col.key)">
              <button type="button" class="sort" :class="{ on: sortKey === col.key }" @click="sortBy(col.key)">
                {{ col.label }}
                <AppIcon name="sort" :size="12" />
              </button>
            </th>
            <th>Estado</th>
            <th class="num">Descargas</th>
            <th class="num">Ingresos netos</th>
            <th class="num">Instalaciones</th>
            <th class="num">Ingresos netos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sorted" :key="r.id" class="row-clickable" @click="open(r)">
            <td class="col-app">
              <div class="identity">
                <AppMark :name="r.name" :color="r.color" :size="32" />
                <div class="identity-text">
                  <RouterLink :to="r.to" class="app-name" @click.stop>{{ r.name }}</RouterLink>
                  <span v-if="r.status === 'off'" class="app-note neg">Sin conexión con su base de datos</span>
                  <span v-else-if="r.status === 'nodb'" class="app-note">Sin base de datos propia</span>
                  <span v-else-if="r.status === 'loading'" class="app-note"><SkeletonBlock width="8rem" height="0.7rem" /></span>
                  <span v-else class="app-note">{{ r.description }}</span>
                </div>
              </div>
            </td>
            <td class="num users-cell">
              <MetricCell :cell="r.users" />
              <span v-if="r.users.state === 'ok' && maxUsers > 0" class="share" aria-hidden="true">
                <span class="share-fill" :class="{ lead: r.users.value === maxUsers }" :style="{ width: `${Math.max(r.users.value ? 4 : 0, (r.users.value / maxUsers) * 100)}%` }"></span>
              </span>
            </td>
            <td class="num"><MetricCell :cell="r.new7" /></td>
            <td class="num"><MetricCell :cell="r.active" :title="r.active.label" /></td>
            <td><AppleStatus :cell="r.apple" /></td>
            <td class="num"><MetricCell :cell="appleUnits(r)" width="2.4rem" /></td>
            <td class="num"><MetricCell :cell="appleProceeds(r)" :format="formatMoney" width="3.4rem" /></td>
            <td class="num"><MetricCell :cell="r.installs" width="2.6rem" /></td>
            <td class="num"><MetricCell :cell="googleNet(r)" :format="() => r.google.money" width="3.4rem" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Móvil: lista de filas de dos líneas (las cifras secundarias pasan a la segunda línea) -->
    <ul class="app-list">
      <li v-for="r in sorted" :key="r.id">
        <RouterLink :to="r.to" class="app-item">
          <AppMark :name="r.name" :color="r.color" :size="36" />
          <div class="item-main">
            <div class="item-top">
              <span class="app-name">{{ r.name }}</span>
              <MetricCell :cell="r.users" class="item-users" />
            </div>
            <div class="item-meta muted">
              <template v-if="r.status === 'off'"><span class="neg">Sin conexión</span></template>
              <template v-else-if="r.status === 'nodb'">Sin base de datos propia</template>
              <template v-else-if="r.status === 'loading'"><SkeletonBlock width="9rem" height="0.7rem" /></template>
              <template v-else>
                Nuevos 7 d {{ r.new7.state === 'ok' ? r.new7.value.toLocaleString('es') : '—' }} · Activos {{ r.active.state === 'ok' ? r.active.value.toLocaleString('es') : '—' }}
              </template>
            </div>
            <div class="item-meta">
              <AppleStatus :cell="r.apple" compact />
              <span v-if="r.google.state === 'ok'" class="muted">Google Play {{ r.google.money }}</span>
            </div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './base/AppIcon.vue'
import AppMark from './base/AppMark.vue'
import SourceTag from './base/SourceTag.vue'
import SkeletonBlock from './base/SkeletonBlock.vue'
import MetricCell from './base/MetricCell.vue'
import AppleStatus from './AppleStatus.vue'
import { formatMoney } from '../composables/useProjectSections'

// Tabla comparativa de las apps. Solo presentación: recibe las filas ya calculadas por
// composables/useOverview.js. Los datos van agrupados por origen y cada grupo lo nombra.
const props = defineProps({
  rows: { type: Array, required: true },
  appleMonth: { type: String, default: '' },
  googleMonth: { type: String, default: '' },
})

const router = useRouter()
const dbCols = [
  { key: 'users', label: 'Usuarios' },
  { key: 'new7', label: 'Nuevos 7 d' },
  { key: 'active', label: 'Activos' },
]

const sortKey = ref('')
const sortDir = ref('desc')
function sortBy(key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}
const ariaSort = (key) => (sortKey.value === key ? (sortDir.value === 'desc' ? 'descending' : 'ascending') : 'none')

const maxUsers = computed(() => Math.max(0, ...props.rows.map((r) => (r.users.state === 'ok' ? r.users.value : 0))))

const sorted = computed(() => {
  if (!sortKey.value) return props.rows
  const val = (r) => (r[sortKey.value].state === 'ok' ? r[sortKey.value].value ?? -1 : -1)
  const dir = sortDir.value === 'desc' ? -1 : 1
  return [...props.rows].sort((a, b) => (val(a) - val(b)) * dir)
})

const appleUnits = (r) => (r.apple.state === 'ok' ? { state: r.apple.units == null ? 'na' : 'ok', value: r.apple.units, reason: 'Sin informe de ventas todavía' } : r.apple)
const appleProceeds = (r) =>
  r.apple.state === 'ok' ? { state: r.apple.proceeds == null ? 'na' : 'ok', value: r.apple.proceeds, reason: 'Sin informe de ventas todavía' } : r.apple
const googleNet = (r) => (r.google.state === 'ok' ? { state: 'ok', value: r.google.net, money: r.google.money } : r.google)

function open(r) {
  router.push(r.to)
}
</script>

<style scoped>
.apps-panel { padding-bottom: 8px; }
.apps-table { min-width: 960px; }
.apps-table :deep(th), .apps-table :deep(td) { padding-left: 10px; padding-right: 10px; }
.apps-table :deep(th:first-child), .apps-table :deep(td:first-child) { padding-left: 0; }
.group-row th { padding-bottom: 6px; border-bottom: none; }
.group-row th.group { text-align: left; padding-top: 0; }
.group-row th.col-app { vertical-align: bottom; }
.col-app { width: 250px; position: sticky; left: 0; background: var(--surface); z-index: 1; }
tbody tr.row-clickable { cursor: pointer; }
tbody tr.row-clickable:hover .col-app { background: var(--ground); }

.identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
.identity-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.35; }
.app-name { font-weight: 500; }
.app-name:hover { text-decoration: underline; }
.app-note { font-size: 13px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 210px; }
.neg { color: var(--negative); }

.sort { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; padding: 0; color: var(--muted); font-size: 13px; cursor: pointer; }
.sort:hover, .sort.on { color: var(--text); }
.sort :deep(svg) { opacity: 0; }
.sort:hover :deep(svg), .sort.on :deep(svg) { opacity: 1; }

.users-cell { position: relative; }
.share { position: absolute; right: 10px; bottom: 7px; display: block; height: 3px; width: 56px; background: var(--rule); border-radius: 2px; }
.share-fill { display: block; height: 100%; border-radius: 2px; background: var(--control); margin-left: auto; }
.share-fill.lead { background: var(--chart); }

.app-list { display: none; list-style: none; margin: 0; padding: 0; }
.app-list li { border-top: 1px solid var(--rule); }
.app-list li:first-child { border-top: none; }
.app-item { display: flex; gap: 12px; padding: 14px 0; min-height: 64px; }
.item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.item-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.item-users { font-size: 16px; font-weight: 500; }
.item-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 13px; }

@media (max-width: 759px) {
  .apps-table-wrap { display: none; }
  .app-list { display: block; }
  .panel-head .small { display: none; }
}
</style>
