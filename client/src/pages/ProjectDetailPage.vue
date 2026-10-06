<template>
  <AppLayout v-if="project" :heading="project.name" :subheading="project.description">
    <RouterLink v-if="project.hasUsersTab" :to="`/project/${project.id}/users`" class="button-link small-button users-link">
      Ver usuarios{{ project.capabilities ? ' y enviar reset de contraseña' : '' }}
    </RouterLink>

    <AlertBanner v-if="stats && !stats.connected" type="error">
      ⚠ No se pudo conectar a este proyecto: {{ stats.error }}
      <p class="muted small">Revisa la variable de entorno de este proyecto en tu archivo .env.</p>
    </AlertBanner>

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

        <BaseCard v-if="storeStats" title="Google Play">
          <template v-if="storeStats.google.supported && storeStats.google.totalInstalls != null">
            <p class="big-number">{{ storeStats.google.totalInstalls.toLocaleString('es') }} <span class="muted small">instalaciones ({{ storeStats.google.month }})</span></p>
            <p class="muted small">{{ storeStats.google.totalUninstalls.toLocaleString('es') }} desinstalaciones en el mismo periodo</p>
          </template>
          <p v-else class="muted small">{{ googleStoreMessage }}</p>
        </BaseCard>

        <BaseCard v-if="storeStats" title="App Store">
          <template v-if="storeStats.apple.supported && storeStats.apple.units != null">
            <p class="big-number">{{ storeStats.apple.units.toLocaleString('es') }} <span class="muted small">unidades ({{ storeStats.apple.reportDate }})</span></p>
            <p class="muted small">Proceeds del desarrollador: ${{ storeStats.apple.proceeds.toFixed(2) }}</p>
          </template>
          <p v-else class="muted small">{{ appleStoreMessage }}</p>
        </BaseCard>
      </section>
    </template>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppLayout from '../components/layout/AppLayout.vue'
import BaseCard from '../components/base/BaseCard.vue'
import StatCard from '../components/base/StatCard.vue'
import LineChart from '../components/base/LineChart.vue'
import BreakdownList from '../components/base/BreakdownList.vue'
import AlertBanner from '../components/base/AlertBanner.vue'
import { useProjectsStore } from '../stores/projects'
import { projectsApi } from '../api/projects'

const props = defineProps({ id: { type: String, required: true } })

const projectsStore = useProjectsStore()
const project = ref(null)
const stats = ref(null)
const storeStats = ref(null)

async function load() {
  await projectsStore.load()
  project.value = projectsStore.byId(props.id)
  stats.value = null
  storeStats.value = null
  if (!project.value) return

  const [statsData, storeData] = await Promise.all([
    projectsApi.stats(props.id),
    project.value.hasStoreMetrics ? projectsApi.storeStats(props.id) : Promise.resolve(null),
  ])
  stats.value = statsData
  storeStats.value = storeData
}

onMounted(load)
watch(() => props.id, load)

// Un solo string (en vez de texto + <template> separados) para que el
// espacio antes de "Ver README" no dependa de como Vue condensa los
// espacios en blanco entre nodos de la plantilla.
function storeMessage(entry) {
  if (!entry) return ''
  const base = entry.reason || entry.note || 'Sin datos todavía.'
  const hint = entry.supported ? '' : ' Ver README → "Instalaciones desde Google Play / App Store".'
  return base + hint
}
const googleStoreMessage = computed(() => storeMessage(storeStats.value?.google))
const appleStoreMessage = computed(() => storeMessage(storeStats.value?.apple))
</script>

<style scoped>
.users-link {
  margin-bottom: 1.5rem;
  display: inline-block;
}
</style>
