<template>
  <AppLayout :crumbs="crumbs" :heading="project?.name || ''" :subheading="project?.description || ''">
    <template v-if="project" #mark><AppMark :name="project.name" :color="project.color" :size="36" /></template>
    <template v-if="project?.hasStoreMetrics && tab === 'resumen'" #actions>
      <BaseSelect v-model="period" class="period-select" label="Periodo de las métricas de tienda" :options="periodOptions" />
    </template>

    <template v-if="project">
      <AlertBanner v-if="stats && !stats.connected" type="error">
        No se pudo conectar a este proyecto: {{ stats.error }}
        <p class="muted small">Revisa la variable de entorno de este proyecto en tu archivo .env.</p>
      </AlertBanner>

      <p v-if="stats?.noBackend" class="muted small no-backend-note">
        Esta app no tiene backend ni base de datos propia: no hay usuarios que seguir aquí.
      </p>

      <TabNav v-if="tabs.length > 1" v-model="tab" :tabs="tabs" label="Secciones de la app" />

      <!-- RESUMEN: usuarios, evolución, fuentes y una tarjeta por origen del dinero -->
      <template v-if="tab === 'resumen'">
        <section v-if="!stats && project.type !== 'none'" class="kpi-row">
          <StatCard v-for="label in kpiPlaceholders" :key="label" :label="label" loading />
        </section>

        <template v-if="hasBackendStats">
          <section class="kpi-row reveal" aria-label="Usuarios">
            <StatCard label="Usuarios totales" :value="stats.totalUsers" sub="Base de datos de la app" />
            <StatCard label="Nuevos (7 días)" :value="stats.newUsers7d" fallback="—" />
            <StatCard label="Nuevos (30 días)" :value="stats.newUsers30d" fallback="—" />
            <StatCard :label="stats.activeLabel || 'Usuarios activos'" :value="stats.activeUsers" fallback="—" />
            <StatCard v-if="stats.onlineUsers != null" :label="stats.onlineLabel" :value="stats.onlineUsers" live />
          </section>

          <section v-if="stats.segments" class="kpi-row reveal" aria-label="Usuarios por segmento">
            <StatCard
              v-for="seg in stats.segments.items"
              :key="seg.value"
              :label="seg.label"
              :value="seg.count"
              :to="{ path: `/project/${project.id}`, query: { segment: seg.value }, hash: '#usuarios' }"
            />
          </section>
        </template>

        <section class="grid trend-row">
          <BaseCard v-if="!stats && project.type !== 'none'" class="span-8" title="Altas por día, últimos 30 días">
            <SkeletonBlock height="200px" radius="8px" />
          </BaseCard>
          <BaseCard v-else-if="hasBackendStats" class="span-8 reveal" title="Altas por día, últimos 30 días">
            <template #aside><SourceTag kind="db" /></template>
            <div v-if="stats.chartSeries?.length" class="chart-fill">
              <LineChart :series="stats.chartSeries" height="100%" aria-label="Altas diarias, últimos 30 días" />
            </div>
            <p v-else class="muted small">No hay datos de altas disponibles para este proyecto.</p>
          </BaseCard>
          <SourcesCard v-if="sourceItems.length" class="span-4" :items="sourceItems" />
        </section>

        <section v-if="sections.length && storeColumns" class="store-cols">
          <div v-for="(col, ci) in storeColumns" :key="ci" class="store-col">
            <StoreCard
              v-for="section in col"
              :key="section.id"
              :style="{ order: sectionOrder.get(section.id) }"
              :kind="section.kind"
              :title="section.title"
              :status="section.status"
              :status-fallback="section.statusFallback"
              :rows="section.rows"
              :footer="section.footer"
            />
          </div>
        </section>
        <section v-else-if="sections.length" class="store-grid">
          <StoreCard
            v-for="section in sections"
            :key="section.id"
            :kind="section.kind"
            :title="section.title"
            :status="section.status"
            :status-fallback="section.statusFallback"
            :rows="section.rows"
            :footer="section.footer"
          />
        </section>
        <p v-if="project.hasStoreMetrics" class="muted small period-note">
          Los informes de Apple y Google son mensuales; el mes en curso no se publica hasta que cierra.
        </p>
      </template>

      <!-- USUARIOS -->
      <ProjectUsers v-else-if="tab === 'usuarios' && project.hasUsersTab" :project="project" />

      <!-- HERRAMIENTAS: importar ganancias de Google y distribuir el APK -->
      <template v-else-if="tab === 'herramientas'">
        <section class="panel-grid">
          <BaseCard v-if="project.store?.hasAndroidListing" title="Ganancias de Google Play">
            <template #aside><SourceTag kind="google" label="Informe de Google Play Console" /></template>
            <ReportImport
              title="Importar informe de ganancias (.zip)"
              accept=".zip"
              :hint="'Descárgalo en Play Console → Descargar informes → Financiero → Informes de ganancias → mes. Sirve para toda la cuenta; si lo importas otra vez se reemplaza, no se duplica.'"
              :imported="importedMonths"
              :upload="importReport"
              @imported="onReportImported"
            />
          </BaseCard>

          <BaseCard v-if="project.hasApkDistribution" title="Distribución directa (APK)">
            <SkeletonLines v-if="!apkInfo" :lines="3" />
            <template v-else>
              <template v-if="apkInfo.info">
                <p class="muted small">
                  Versión <strong>{{ apkInfo.info.version || '(sin especificar)' }}</strong> ·
                  {{ (apkInfo.info.sizeBytes / 1024 / 1024).toFixed(1) }} MB ·
                  subida el {{ new Date(apkInfo.info.uploadedAt).toLocaleString('es') }}
                </p>
                <p v-if="apkInfo.info.notes" class="muted small">{{ apkInfo.info.notes }}</p>
                <h3 class="panel-subtitle">Enlace público (para el portafolio)</h3>
                <div class="link-box"><code>{{ fullPublicApkUrl }}</code></div>
              </template>
              <p v-else class="muted small">Todavía no se subió ningún APK para este proyecto.</p>

              <h3 class="panel-subtitle">{{ apkInfo.info ? 'Reemplazar por una versión nueva' : 'Subir el primer APK' }}</h3>
              <form class="apk-upload-form" @submit.prevent="onUploadApk">
                <input type="file" accept=".apk" required @change="onApkFileChange" />
                <BaseInput v-model="apkVersion" label="Versión (opcional)" placeholder="ej. 1.4.0" />
                <BaseInput v-model="apkNotes" label="Notas (opcional)" placeholder="ej. arreglo de notificaciones" />
                <BaseButton type="submit" :disabled="!apkFile || apkUploading">
                  {{ apkUploading ? 'Subiendo…' : 'Subir APK' }}
                </BaseButton>
              </form>
              <AlertBanner v-if="apkResult" :type="apkResult.type" class="apk-result">
                {{ apkResult.message }}
              </AlertBanner>
            </template>
          </BaseCard>
        </section>
      </template>
    </template>

    <!-- Aún no se conoce el proyecto: registro cargando, o id inexistente. -->
    <p v-else-if="projectsStore.loaded" class="muted">Proyecto no encontrado.</p>
    <template v-else>
      <section class="kpi-row">
        <StatCard v-for="label in kpiPlaceholders" :key="label" :label="label" loading />
      </section>
      <section class="store-grid">
        <StoreCard v-for="title in ['App Store', 'Google Play']" :key="title" :title="title" loading />
      </section>
    </template>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseInput from '../components/base/BaseInput.vue'
import BaseSelect from '../components/base/BaseSelect.vue'
import BaseButton from '../components/base/BaseButton.vue'
import AppLayout from '../components/layout/AppLayout.vue'
import BaseCard from '../components/base/BaseCard.vue'
import StatCard from '../components/base/StatCard.vue'
import LineChart from '../components/base/LineChart.vue'
import AlertBanner from '../components/base/AlertBanner.vue'
import SkeletonBlock from '../components/base/SkeletonBlock.vue'
import SkeletonLines from '../components/base/SkeletonLines.vue'
import AppMark from '../components/base/AppMark.vue'
import SourceTag from '../components/base/SourceTag.vue'
import TabNav from '../components/base/TabNav.vue'
import SourcesCard from '../components/SourcesCard.vue'
import StoreCard from '../components/StoreCard.vue'
import ProjectUsers from '../components/ProjectUsers.vue'
import ReportImport from '../components/ReportImport.vue'
import { useProjectsStore } from '../stores/projects'
import { useProjectSections } from '../composables/useProjectSections'
import { projectsApi } from '../api/projects'

const props = defineProps({ id: { type: String, required: true } })

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const project = ref(null)
const stats = ref(null)
const storeStats = ref(null)
const apkInfo = ref(null)
const apkFile = ref(null)
const apkVersion = ref('')
const apkNotes = ref('')
const apkUploading = ref(false)
const apkResult = ref(null)

// '' = automatico (mes en curso con respaldo al anterior); si no, 'YYYY-MM'.
const period = ref('')
const periodOptions = computed(() => {
  const options = [{ value: '', label: 'Automático (último mes con datos)' }]
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('es', { month: 'long', year: 'numeric' })
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    })
  }
  return options
})

// Pestañas ligadas al hash de la URL: #usuarios y #herramientas; sin hash, el resumen. Así siguen
// funcionando los enlaces de segmentos y de la ficha de usuario (…#usuarios).
const tab = computed({
  get: () => (route.hash === '#usuarios' ? 'usuarios' : route.hash === '#herramientas' ? 'herramientas' : 'resumen'),
  set: (value) => router.replace({ path: route.path, query: value === 'usuarios' ? route.query : {}, hash: value === 'resumen' ? '' : `#${value}` }),
})
const tabs = computed(() => {
  const p = project.value
  if (!p) return []
  const list = [{ value: 'resumen', label: 'Resumen' }]
  if (p.hasUsersTab) list.push({ value: 'usuarios', label: 'Usuarios', count: stats.value?.totalUsers != null ? stats.value.totalUsers.toLocaleString('es') : null })
  if (p.hasApkDistribution || p.store?.hasAndroidListing) list.push({ value: 'herramientas', label: 'Herramientas' })
  return list
})

const kpiPlaceholders = ['Usuarios totales', 'Nuevos (7 días)', 'Nuevos (30 días)', 'Usuarios activos']

const crumbs = computed(() => [{ label: 'Inicio', to: '/' }, { label: project.value?.name || '' }])
const sections = useProjectSections(project, stats, storeStats)

// Mapa de fuentes: de qué orígenes se puede leer algo ahora mismo (su base de datos y cada tarjeta de tienda).
const sourceItems = computed(() => {
  if (!project.value || project.value.type === 'none' && !sections.value.length) return []
  const items = []
  if (project.value.type !== 'none') {
    const s = stats.value
    items.push({
      key: 'db',
      label: 'Base de datos de la app',
      detail: s?.sourceLabel || '',
      state: s ? 'ready' : 'loading',
      text: !s ? '' : s.noBackend ? 'No tiene' : s.connected ? 'Conectada' : 'Sin conexión',
      tone: !s ? 'neutral' : s.noBackend ? 'neutral' : s.connected ? 'ok' : 'error',
    })
  }
  for (const sec of sections.value) {
    const rows = sec.rows || []
    const loadingRows = rows.some((r) => r.state === 'loading')
    const ok = rows.filter((r) => r.state === 'ok').length
    const pending = rows.filter((r) => r.state === 'pending').length
    items.push({
      key: sec.id,
      label: sec.title,
      detail: sec.status ? `${sec.status.label}${sec.status.version ? ` · v${sec.status.version}` : ''}` : sec.statusFallback || '',
      state: loadingRows ? 'loading' : 'ready',
      text: pending ? `${ok} de ${rows.length} · ${pending} pendiente${pending === 1 ? '' : 's'}` : ok ? `${ok} de ${rows.length} ${rows.length === 1 ? 'cifra' : 'cifras'}` : 'Sin datos',
      tone: pending ? 'pending' : ok && ok === rows.length ? 'ok' : 'neutral',
    })
  }
  return items
})

// Reparto de las tarjetas por origen en dos columnas de altura parecida (la más alta primero, cada
// una a la columna más baja), para que la fila termine a la vez en lugar de dejar huecos. Solo
// cuando ya llegaron los datos: mientras cargan se ven en una rejilla de esqueletos.
const sectionOrder = computed(() => new Map(sections.value.map((sec, i) => [sec.id, i])))
function estimateHeight(sec) {
  let h = 96 + (sec.footer ? 64 : 0)
  for (const r of sec.rows) {
    h += 56
    if (r.state === 'ok') h += (r.series?.length ? 112 : 0) + (r.details?.length || 0) * 26 + (r.note ? 46 : 0)
    else if (r.reason) h += 40
  }
  return h
}
const storeColumns = computed(() => {
  const list = sections.value
  const loaded = list.length > 1 && list.every((sec) => sec.rows.every((r) => r.state !== 'loading'))
  if (!loaded) return null
  const cols = [[], []]
  const heights = [0, 0]
  for (const sec of [...list].sort((a, b) => estimateHeight(b) - estimateHeight(a))) {
    const i = heights[0] <= heights[1] ? 0 : 1
    cols[i].push(sec)
    heights[i] += estimateHeight(sec) + 12
  }
  cols.forEach((c) => c.sort((a, b) => sectionOrder.value.get(a.id) - sectionOrder.value.get(b.id)))
  return cols.filter((c) => c.length)
})

// Proyecto conectado Y con base de datos propia (KPIs de usuarios y grafico).
const hasBackendStats = computed(() => Boolean(stats.value?.connected && !stats.value.noBackend))

// Evita que la respuesta de un proyecto anterior (navegacion rapida) pise la del actual.
let loadToken = 0

async function load() {
  const token = ++loadToken
  const alive = () => token === loadToken

  stats.value = null
  storeStats.value = null
  apkInfo.value = null
  // Si el registro ya esta cargado el proyecto se conoce al instante (sin
  // pasar por null, que mostraria "no encontrado" un parpadeo).
  project.value = projectsStore.byId(props.id) || null

  await projectsStore.load()
  if (!alive()) return
  project.value = projectsStore.byId(props.id) || null
  if (!project.value) return

  // Cada bloque se pide por separado y aparece en cuanto llega el suyo: las
  // metricas de tienda (APIs externas) son las mas lentas y no frenan al resto.
  projectsApi
    .stats(props.id)
    .then((data) => alive() && (stats.value = data))
    .catch((err) => alive() && (stats.value = { connected: false, error: err.message }))

  if (project.value.hasStoreMetrics) loadStoreStats(props.id)

  if (project.value.hasApkDistribution) {
    projectsApi
      .apkInfo(props.id)
      .then((data) => alive() && (apkInfo.value = data))
      .catch(() => alive() && (apkInfo.value = { info: null, publicUrl: `/downloads/${props.id}.apk` }))
  }
}

// Informes de ganancias de Google importados a mano (cubren toda la cuenta).
const playMonths = ref([])
const importedMonths = computed(() =>
  playMonths.value
    .map((m) => new Date(Number(m.month.slice(0, 4)), Number(m.month.slice(4)) - 1, 1).toLocaleDateString('es', { month: 'short', year: 'numeric' }))
    .join(', ')
)

async function refreshPlayMonths() {
  try {
    playMonths.value = (await projectsApi.playReportMonths()).months
  } catch {
    playMonths.value = []
  }
}

async function importReport(file) {
  const res = await projectsApi.uploadPlayReport(file)
  const label = new Date(Number(res.month.slice(0, 4)), Number(res.month.slice(4)) - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return { message: `Informe de ${label} importado (${res.rows} movimientos).` }
}

function onReportImported() {
  refreshPlayMonths()
  loadStoreStats(props.id)
}

// Metricas de tienda: se piden aparte (APIs externas, las mas lentas) y se
// repiden al cambiar de periodo sin tocar el resto de la pagina. Gana siempre
// la peticion mas reciente.
let storeToken = 0
function loadStoreStats(projectId) {
  const token = ++storeToken
  const current = () => token === storeToken && props.id === projectId
  storeStats.value = null
  projectsApi
    .storeStats(projectId, period.value)
    .then((data) => current() && (storeStats.value = data))
    .catch((err) => {
      const failed = { supported: false, reason: err.message }
      if (current()) storeStats.value = { google: failed, apple: { ...failed, status: undefined } }
    })
}

onMounted(() => {
  load()
  refreshPlayMonths()
})
watch(() => props.id, load)
watch(period, () => {
  if (project.value?.hasStoreMetrics) loadStoreStats(props.id)
})

const fullPublicApkUrl = computed(() => apkInfo.value ? `${window.location.origin}${apkInfo.value.publicUrl}` : '')

function onApkFileChange(event) {
  apkFile.value = event.target.files[0] || null
}

async function onUploadApk() {
  if (!apkFile.value) return
  apkUploading.value = true
  apkResult.value = null
  try {
    const res = await projectsApi.uploadApk(props.id, apkFile.value, {
      version: apkVersion.value,
      notes: apkNotes.value,
    })
    apkInfo.value = { info: res.info, publicUrl: res.publicUrl }
    apkResult.value = { type: 'ok', message: 'APK subido. El enlace público ya sirve esta versión.' }
    apkFile.value = null
    apkVersion.value = ''
    apkNotes.value = ''
  } catch (err) {
    apkResult.value = { type: 'error', message: err.message }
  } finally {
    apkUploading.value = false
  }
}
</script>

<style scoped>
.no-backend-note { margin-bottom: 16px; }
.trend-row { align-items: stretch; }
.trend-row > :deep(.panel) { display: flex; flex-direction: column; }
.chart-fill { flex: 1; min-height: 120px; position: relative; }
.store-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); align-items: start; margin-bottom: var(--gap); }
.store-col { display: flex; flex-direction: column; gap: var(--gap); min-width: 0; }
@media (max-width: 1099px) {
  .store-cols { display: flex; flex-direction: column; align-items: stretch; }
  .store-col { display: contents; } /* en una columna, cada tarjeta recupera su orden original (style order) */
}
.period-select { min-width: 220px; }
.period-note { margin-top: 4px; }
.apk-upload-form input[type='file'] { color: var(--muted); font-size: 13px; }
.apk-result { margin-top: 12px; }
@media (max-width: 640px) { .period-select { min-width: 0; width: 100%; } }
</style>
