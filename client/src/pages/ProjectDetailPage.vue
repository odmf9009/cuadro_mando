<template>
  <AppLayout :crumbs="crumbs" :heading="project?.name || ''" :subheading="project?.description || ''">
    <template v-if="project">
      <AlertBanner v-if="stats && !stats.connected" type="error">
        ⚠ No se pudo conectar a este proyecto: {{ stats.error }}
        <p class="muted small">Revisa la variable de entorno de este proyecto en tu archivo .env.</p>
      </AlertBanner>

      <p v-if="stats?.noBackend" class="muted small no-backend-note">
        Esta app no tiene backend ni base de datos propia — no hay usuarios que trackear aquí.
      </p>

      <!-- 1. Usuarios: KPIs + segmentos (cada segmento filtra la lista de abajo). -->
      <section v-if="!stats && project.type !== 'none'" class="kpi-row">
        <StatCard v-for="label in kpiPlaceholders" :key="label" :label="label" loading />
      </section>

      <template v-if="hasBackendStats">
        <section class="kpi-row reveal">
          <StatCard label="Usuarios totales" :value="stats.totalUsers" />
          <StatCard label="Nuevos (7 días)" :value="stats.newUsers7d" fallback="N/D" />
          <StatCard label="Nuevos (30 días)" :value="stats.newUsers30d" fallback="N/D" />
          <StatCard :label="stats.activeLabel || 'Usuarios activos'" :value="stats.activeUsers" />
          <StatCard v-if="stats.onlineUsers != null" :label="stats.onlineLabel" :value="stats.onlineUsers" live />
        </section>

        <section v-if="stats.segments" class="kpi-row reveal">
          <StatCard
            v-for="seg in stats.segments.items"
            :key="seg.value"
            :label="seg.label"
            :value="seg.count"
            :to="{ path: `/project/${project.id}`, query: { segment: seg.value }, hash: '#usuarios' }"
          />
        </section>
      </template>

      <!-- 2. Una tarjeta por ORIGEN de datos (App Store, Google Play y, si hace
           falta, pagos propios). Cada cifra indica de donde sale. -->
      <section v-if="sections.length" class="store-grid">
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

      <!-- 3. Herramientas del proyecto: crecimiento de usuarios y distribucion directa. -->
      <section class="panel-grid">
        <BaseCard v-if="!stats && project.type !== 'none'" title="Nuevos usuarios (últimos 30 días)">
          <SkeletonBlock height="110px" radius="10px" />
        </BaseCard>
        <BaseCard v-else-if="hasBackendStats" class="reveal" title="Nuevos usuarios (últimos 30 días)">
          <LineChart v-if="stats.chartSeries?.length" :series="stats.chartSeries" :color="project.color" />
          <p v-else class="muted small">No hay datos de altas disponibles para este proyecto.</p>
        </BaseCard>

        <BaseCard v-if="project.hasApkDistribution" class="reveal" title="Distribución directa (APK)">
          <SkeletonLines v-if="!apkInfo" :lines="3" />
          <template v-else>
            <template v-if="apkInfo.info">
              <p class="muted small">
                Versión <strong>{{ apkInfo.info.version || '(sin especificar)' }}</strong> ·
                {{ (apkInfo.info.sizeBytes / 1024 / 1024).toFixed(1) }} MB ·
                subida el {{ new Date(apkInfo.info.uploadedAt).toLocaleString('es') }}
              </p>
              <p v-if="apkInfo.info.notes" class="muted small">{{ apkInfo.info.notes }}</p>
              <h3 class="panel-subtitle">Link público (para el portafolio)</h3>
              <div class="link-box"><code>{{ fullPublicApkUrl }}</code></div>
            </template>
            <p v-else class="muted small">Todavía no se subió ningún APK para este proyecto.</p>

            <h3 class="panel-subtitle">{{ apkInfo.info ? 'Reemplazar por una versión nueva' : 'Subir el primer APK' }}</h3>
            <form class="apk-upload-form" @submit.prevent="onUploadApk">
              <input type="file" accept=".apk" required @change="onApkFileChange" />
              <BaseInput v-model="apkVersion" label="Versión (opcional)" placeholder="ej. 1.4.0" />
              <BaseInput v-model="apkNotes" label="Notas (opcional)" placeholder="ej. fix de notificaciones" />
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

      <!-- 4. Listado de usuarios del proyecto. -->
      <ProjectUsers v-if="project.hasUsersTab" :project="project" />
    </template>

    <!-- Aun no se conoce el proyecto: registro cargando, o id inexistente. -->
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
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseInput from '../components/base/BaseInput.vue'
import BaseButton from '../components/base/BaseButton.vue'
import AppLayout from '../components/layout/AppLayout.vue'
import BaseCard from '../components/base/BaseCard.vue'
import StatCard from '../components/base/StatCard.vue'
import LineChart from '../components/base/LineChart.vue'
import AlertBanner from '../components/base/AlertBanner.vue'
import SkeletonBlock from '../components/base/SkeletonBlock.vue'
import SkeletonLines from '../components/base/SkeletonLines.vue'
import StoreCard from '../components/StoreCard.vue'
import ProjectUsers from '../components/ProjectUsers.vue'
import { useProjectsStore } from '../stores/projects'
import { useProjectSections } from '../composables/useProjectSections'
import { projectsApi } from '../api/projects'

const props = defineProps({ id: { type: String, required: true } })

const route = useRoute()
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

const kpiPlaceholders = ['Usuarios totales', 'Nuevos (7 días)', 'Nuevos (30 días)', 'Usuarios activos']

const crumbs = computed(() => [{ label: 'Inicio', to: '/' }, { label: project.value?.name || '' }])
const sections = useProjectSections(project, stats, storeStats)

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

  // Un enlace con #usuarios (desde un segmento o desde la ficha) baja hasta la
  // lista; el elemento solo existe una vez conocido el proyecto.
  if (route.hash) {
    await nextTick()
    document.querySelector(route.hash)?.scrollIntoView({ behavior: 'smooth' })
  }

  // Cada bloque se pide por separado y aparece en cuanto llega el suyo: las
  // metricas de tienda (APIs externas) son las mas lentas y no frenan al resto.
  projectsApi
    .stats(props.id)
    .then((data) => alive() && (stats.value = data))
    .catch((err) => alive() && (stats.value = { connected: false, error: err.message }))

  if (project.value.hasStoreMetrics) {
    projectsApi
      .storeStats(props.id)
      .then((data) => alive() && (storeStats.value = data))
      .catch((err) => {
        const failed = { supported: false, reason: err.message }
        if (alive()) storeStats.value = { google: failed, apple: { ...failed, status: undefined } }
      })
  }

  if (project.value.hasApkDistribution) {
    projectsApi
      .apkInfo(props.id)
      .then((data) => alive() && (apkInfo.value = data))
      .catch(() => alive() && (apkInfo.value = { info: null, publicUrl: `/downloads/${props.id}.apk` }))
  }
}

onMounted(load)
watch(() => props.id, load)

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
    apkResult.value = { type: 'ok', message: '✅ APK subido. El link público ya sirve esta versión.' }
    apkFile.value = null
    apkVersion.value = ''
    apkNotes.value = ''
  } catch (err) {
    apkResult.value = { type: 'error', message: `⚠ ${err.message}` }
  } finally {
    apkUploading.value = false
  }
}
</script>

<style scoped>
.no-backend-note {
  margin-bottom: 1.5rem;
}

.apk-upload-form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-top: 0.5rem;
}

.apk-upload-form input[type='file'] {
  color: var(--muted);
  font-size: 0.85rem;
}

.apk-result {
  margin-top: 0.8rem;
}
</style>
