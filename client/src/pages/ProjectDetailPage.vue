<template>
  <AppLayout v-if="project" :heading="project.name" :subheading="project.description">
    <RouterLink v-if="project.hasUsersTab" :to="`/project/${project.id}/users`" class="button-link small-button users-link">
      Ver usuarios{{ project.capabilities ? ' y enviar reset de contraseña' : '' }}
    </RouterLink>

    <AlertBanner v-if="stats && !stats.connected" type="error">
      ⚠ No se pudo conectar a este proyecto: {{ stats.error }}
      <p class="muted small">Revisa la variable de entorno de este proyecto en tu archivo .env.</p>
    </AlertBanner>

    <template v-else-if="stats && stats.noBackend">
      <p class="muted small no-backend-note">
        Esta app no tiene backend ni base de datos propia — no hay usuarios que trackear aquí, solo
        métricas de tienda cuando estén disponibles.
      </p>
      <section v-if="storeStats" class="panel-grid">
        <StoreMetricsCards :store-stats="storeStats" />
      </section>
    </template>

    <template v-else-if="stats">
      <section class="kpi-row">
        <StatCard label="Usuarios totales" :value="stats.totalUsers" />
        <StatCard label="Nuevos (7 días)" :value="stats.newUsers7d" fallback="N/D" />
        <StatCard label="Nuevos (30 días)" :value="stats.newUsers30d" fallback="N/D" />
        <StatCard :label="stats.activeLabel || 'Usuarios activos'" :value="stats.activeUsers" />
        <StatCard v-if="stats.onlineUsers != null" :label="stats.onlineLabel" :value="stats.onlineUsers" live />
      </section>

      <section v-if="stats.segments" class="kpi-row">
        <StatCard
          v-for="seg in stats.segments.items"
          :key="seg.value"
          :label="seg.label"
          :value="seg.count"
          :to="`/project/${project.id}/users?segment=${seg.value}`"
        />
      </section>

      <section class="panel-grid">
        <BaseCard title="Nuevos usuarios (últimos 30 días)">
          <LineChart v-if="stats.chartSeries?.length" :series="stats.chartSeries" :color="project.color" />
          <p v-else class="muted small">No hay datos de altas disponibles para este proyecto.</p>
        </BaseCard>

        <BaseCard title="Suscripciones">
          <template v-if="project.capabilities.subscriptions && stats.subscriptions">
            <p class="big-number">{{ stats.subscriptions.active.toLocaleString('es') }} <span class="muted small">activas</span></p>
            <h3 class="panel-subtitle">Por plan</h3>
            <BreakdownList :data="stats.subscriptions.byPlan" />
            <h3 class="panel-subtitle">Por estado</h3>
            <BreakdownList :data="stats.subscriptions.byStatus" />
          </template>
          <p v-else class="muted small">Este proyecto no guarda suscripciones en su base de datos todavía.</p>
        </BaseCard>

        <BaseCard title="Plataformas">
          <template v-if="project.capabilities.platforms && stats.platforms">
            <BreakdownList :data="stats.platforms" />
            <p class="muted small">Calculado a partir de las suscripciones activas (RevenueCat), no de instalaciones totales.</p>
          </template>
          <p v-else class="muted small">
            Este proyecto no guarda la plataforma (Android/iPhone) por usuario todavía.
            Google Play y Apple ofrecen APIs de instalaciones, pero requieren credenciales propias por app — ver el README para activarlo.
          </p>
        </BaseCard>

        <BaseCard title="Ingresos">
          <template v-if="stats.revenue?.length">
            <p v-for="r in stats.revenue" :key="r.currency" class="big-number">
              {{ r.total.toLocaleString('es', { minimumFractionDigits: 2 }) }} <span class="muted small">{{ r.currency }}</span>
            </p>
            <p class="muted small">Suma de compras de créditos completadas (no incluye el valor de suscripciones recurrentes).</p>
          </template>
          <p v-else class="muted small">Este proyecto no guarda montos de compra en su base de datos todavía.</p>
        </BaseCard>

        <StoreMetricsCards v-if="storeStats" :store-stats="storeStats" />

        <BaseCard v-if="project.hasApkDistribution" title="Distribución directa (APK)">
          <template v-if="apkInfo?.info">
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

          <h3 class="panel-subtitle">{{ apkInfo?.info ? 'Reemplazar por una versión nueva' : 'Subir el primer APK' }}</h3>
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
        </BaseCard>
      </section>
    </template>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import BaseInput from '../components/base/BaseInput.vue'
import BaseButton from '../components/base/BaseButton.vue'
import AppLayout from '../components/layout/AppLayout.vue'
import BaseCard from '../components/base/BaseCard.vue'
import StatCard from '../components/base/StatCard.vue'
import LineChart from '../components/base/LineChart.vue'
import BreakdownList from '../components/base/BreakdownList.vue'
import AlertBanner from '../components/base/AlertBanner.vue'
import StoreMetricsCards from '../components/StoreMetricsCards.vue'
import { useProjectsStore } from '../stores/projects'
import { projectsApi } from '../api/projects'

const props = defineProps({ id: { type: String, required: true } })

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

async function load() {
  await projectsStore.load()
  project.value = projectsStore.byId(props.id)
  stats.value = null
  storeStats.value = null
  apkInfo.value = null
  if (!project.value) return

  const [statsData, storeData, apkData] = await Promise.all([
    projectsApi.stats(props.id),
    project.value.hasStoreMetrics ? projectsApi.storeStats(props.id) : Promise.resolve(null),
    project.value.hasApkDistribution ? projectsApi.apkInfo(props.id) : Promise.resolve(null),
  ])
  stats.value = statsData
  storeStats.value = storeData
  apkInfo.value = apkData
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
.users-link {
  margin-bottom: 1.5rem;
  display: inline-block;
}

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
