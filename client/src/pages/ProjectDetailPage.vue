<template>
  <AppLayout :heading="project?.name || ''" :subheading="project?.description || ''">
    <template v-if="project">
      <RouterLink v-if="project.hasUsersTab" :to="`/project/${project.id}/users`" class="button-link small-button users-link">
        Ver usuarios{{ project.hasPasswordReset ? ' y enviar reset de contraseña' : '' }}
      </RouterLink>

      <AlertBanner v-if="stats && !stats.connected" type="error">
        ⚠ No se pudo conectar a este proyecto: {{ stats.error }}
        <p class="muted small">Revisa la variable de entorno de este proyecto en tu archivo .env.</p>
      </AlertBanner>

      <p v-if="stats?.noBackend" class="muted small no-backend-note">
        Esta app no tiene backend ni base de datos propia — no hay usuarios que trackear aquí.
      </p>

      <!-- Mientras llegan las estadisticas se ve la misma estructura con bloques
           de carga (no una pantalla vacia); cada bloque se "enfoca" al llegar. -->
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
            :to="`/project/${project.id}/users?segment=${seg.value}`"
          />
        </section>
      </template>

      <!-- Mismas tarjetas para TODOS los proyectos. Las que dependen de la base
           de datos (suscripciones, plataformas, ingresos) solo se pintan si hay
           conexion: si no, "no tiene suscripciones" seria mentira (no lo sabemos).
           Tiendas y APK no dependen de la BD y se muestran siempre. -->
      <section class="panel-grid">
        <template v-if="!stats">
          <BaseCard v-if="project.type !== 'none'" title="Nuevos usuarios (últimos 30 días)">
            <SkeletonBlock height="110px" radius="10px" />
          </BaseCard>
          <BaseCard v-for="title in dbCardTitles" :key="title" :title="title">
            <SkeletonLines />
          </BaseCard>
        </template>

        <template v-else>
          <BaseCard v-if="hasBackendStats" class="reveal" title="Nuevos usuarios (últimos 30 días)">
            <LineChart v-if="stats.chartSeries?.length" :series="stats.chartSeries" :color="project.color" />
            <p v-else class="muted small">No hay datos de altas disponibles para este proyecto.</p>
          </BaseCard>

          <template v-if="stats.connected">
            <BaseCard class="reveal" title="Suscripciones">
              <template v-if="project.capabilities.subscriptions && stats.subscriptions">
                <p class="big-number">{{ stats.subscriptions.active.toLocaleString('es') }} <span class="muted small">{{ stats.subscriptions.activeLabel || 'activas' }}</span></p>
                <template v-if="hasEntries(stats.subscriptions.byPlan)">
                  <h3 class="panel-subtitle">Por plan</h3>
                  <BreakdownList :data="stats.subscriptions.byPlan" />
                </template>
                <template v-if="hasEntries(stats.subscriptions.byStatus)">
                  <h3 class="panel-subtitle">Por estado</h3>
                  <BreakdownList :data="stats.subscriptions.byStatus" />
                </template>
                <template v-if="stats.subscriptions.revenueByPlan?.length">
                  <h3 class="panel-subtitle">Generado por plan</h3>
                  <ul class="breakdown-list">
                    <li v-for="r in stats.subscriptions.revenueByPlan" :key="r.plan + r.currency">
                      <span>
                        {{ r.plan }}
                        <span v-if="r.isTestMode" class="test-mode-tag" title="Pago en modo prueba de Stripe, no es dinero real">PRUEBA</span>
                      </span>
                      <strong>{{ r.total.toLocaleString('es', { minimumFractionDigits: 2 }) }} {{ r.currency.toUpperCase() }}</strong>
                    </li>
                  </ul>
                </template>
                <p v-for="note in stats.subscriptions.notes" :key="note" class="muted small subs-note">{{ note }}</p>
              </template>
              <p v-else class="muted small">No tiene suscripciones.</p>
            </BaseCard>

            <BaseCard class="reveal" title="Plataformas">
              <template v-if="project.capabilities.platforms && stats.platforms">
                <BreakdownList :data="stats.platforms" />
                <p class="muted small">Calculado a partir de las suscripciones activas (RevenueCat), no de instalaciones totales.</p>
              </template>
              <p v-else class="muted small">No disponible: este proyecto no guarda la plataforma (Android/iPhone) por usuario.</p>
            </BaseCard>

            <BaseCard class="reveal" title="Ingresos">
              <template v-if="stats.revenue?.length">
                <p v-for="r in stats.revenue" :key="r.currency + r.isTestMode" class="big-number">
                  {{ r.total.toLocaleString('es', { minimumFractionDigits: 2 }) }} <span class="muted small">{{ r.currency }}</span>
                  <span v-if="r.isTestMode" class="test-mode-tag" title="Pago en modo prueba, no es dinero real">PRUEBA</span>
                </p>
                <p class="muted small">Suma de compras de créditos completadas (no incluye el valor de suscripciones recurrentes).</p>
              </template>

              <!-- Lo que cobran las tiendas no esta en la base de datos del proyecto:
                   sale de los informes de Apple y de Google. -->
              <template v-if="project.hasStoreMetrics">
                <h3 v-if="stats.revenue?.length" class="panel-subtitle">En las tiendas</h3>
                <SkeletonLines v-if="!storeStats" :big="false" :lines="2" />
                <template v-else>
                  <ul class="breakdown-list">
                    <li>
                      <span>App Store</span>
                      <strong v-if="storeStats.apple.supported && storeStats.apple.proceeds != null">
                        {{ money(storeStats.apple.proceeds) }} <span class="muted small">({{ storeStats.apple.month }})</span>
                      </strong>
                      <span v-else class="muted small">No disponible</span>
                    </li>
                    <li>
                      <span>Google Play</span>
                      <strong v-if="storeStats.google.revenue != null">{{ money(storeStats.google.revenue) }}</strong>
                      <span v-else class="muted small">Pendiente de acceso a los informes</span>
                    </li>
                  </ul>
                  <p class="muted small subs-note">
                    Ingresos netos del desarrollador según los informes de ventas de cada tienda.
                  </p>
                </template>
              </template>

              <p v-if="!stats.revenue?.length && !project.hasStoreMetrics" class="muted small">
                No disponible: este proyecto no guarda montos de compra.
              </p>
            </BaseCard>
          </template>
        </template>

        <StoreMetricsCards v-if="storeStats" :store-stats="storeStats" />
        <template v-else-if="project.hasStoreMetrics">
          <BaseCard v-for="title in storeCardTitles" :key="title" :title="title">
            <SkeletonLines />
          </BaseCard>
        </template>

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
    </template>

    <!-- Aun no se conoce el proyecto: registro cargando, o id inexistente. -->
    <p v-else-if="projectsStore.loaded" class="muted">Proyecto no encontrado.</p>
    <template v-else>
      <section class="kpi-row">
        <StatCard v-for="label in kpiPlaceholders" :key="label" :label="label" loading />
      </section>
      <section class="panel-grid">
        <BaseCard v-for="title in dbCardTitles" :key="title" :title="title">
          <SkeletonLines />
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
import SkeletonBlock from '../components/base/SkeletonBlock.vue'
import SkeletonLines from '../components/base/SkeletonLines.vue'
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

const kpiPlaceholders = ['Usuarios totales', 'Nuevos (7 días)', 'Nuevos (30 días)', 'Usuarios activos']
const dbCardTitles = ['Suscripciones', 'Plataformas', 'Ingresos']
const storeCardTitles = ['Google Play', 'App Store']

const hasEntries = (obj) => Object.keys(obj || {}).length > 0
const money = (n) => `$${n.toLocaleString('es', { minimumFractionDigits: 2 })}`

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

  if (project.value.hasStoreMetrics) {
    projectsApi
      .storeStats(props.id)
      .then((data) => alive() && (storeStats.value = data))
      .catch((err) => {
        const failed = { supported: false, reason: err.message }
        if (alive()) storeStats.value = { google: failed, apple: failed }
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
.users-link {
  margin-bottom: 1.5rem;
  display: inline-block;
}

.no-backend-note {
  margin-bottom: 1.5rem;
}

.test-mode-tag {
  margin-left: 0.4rem;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
  vertical-align: middle;
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

.subs-note {
  margin: 0.9rem 0 0;
}
</style>
