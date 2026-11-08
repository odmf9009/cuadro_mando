<template>
  <AppLayout :crumbs="[{ label: 'Inicio' }]" heading="Resumen" :subheading="finding">
    <template #actions>
      <span v-if="updatedAt" class="muted small stamp">Actualizado {{ updatedTime }}</span>
      <BaseButton variant="ghost" size="small" :disabled="loading" @click="load">
        <AppIcon name="refresh" />
        Actualizar
      </BaseButton>
    </template>

    <!-- 1. Cifras globales: un contenedor partido por líneas finas; cada celda dice de dónde sale -->
    <section class="kpi-row" aria-label="Cifras globales">
      <StatCard label="Usuarios totales" :value="kpis.users" :sub="kpis.usersSub" :loading="loading" />
      <StatCard label="Altas en 7 días" :value="kpis.new7" :sub="`${kpis.new30.toLocaleString('es')} en 30 días`" :loading="loading" />
      <StatCard label="Apps conectadas" :value="kpis.connected" :sub="kpis.connectedSub" :loading="loading" />
      <StatCard label="Suscripciones verificadas" :value="kpis.subs" :sub="kpis.subsSub" :loading="loading" />
    </section>

    <!-- 2. La comparación de apps: es lo más grande porque responde a "¿cómo va cada una?" -->
    <div class="reveal-wrap" :class="{ reveal: !loading }">
      <AppsTable :rows="rows" :apple-month="appleMonth" :google-month="googleMonth" />
    </div>

    <!-- 3. Qué app crece: altas por día de todas las apps y su reparto -->
    <section class="grid trend-row">
      <BaseCard class="span-8" title="Altas por día">
        <p class="card-source"><SourceTag kind="db" label="Bases de datos de las apps" /> últimos 30 días, todas las apps</p>
        <SkeletonBlock v-if="loading" height="200px" radius="8px" />
        <div v-else-if="chartSeries.length" class="chart-fill">
          <LineChart :series="chartSeries" height="100%" aria-label="Altas diarias de todas las apps, últimos 30 días" />
        </div>
        <p v-else class="muted small">Ninguna app informa altas por día.</p>
      </BaseCard>
      <BaseCard class="span-4" title="Altas por app">
        <p class="card-source"><SourceTag kind="db" label="Bases de datos de las apps" /> últimos 30 días</p>
        <div v-if="loading" class="skeleton-stack"><SkeletonBlock v-for="n in 5" :key="n" height="1.2rem" /></div>
        <BarList v-else-if="ranking.length" :items="ranking" />
        <p v-else class="muted small">Ninguna app informa altas.</p>
      </BaseCard>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import AppLayout from '../components/layout/AppLayout.vue'
import BaseButton from '../components/base/BaseButton.vue'
import BaseCard from '../components/base/BaseCard.vue'
import StatCard from '../components/base/StatCard.vue'
import AppIcon from '../components/base/AppIcon.vue'
import SourceTag from '../components/base/SourceTag.vue'
import SkeletonBlock from '../components/base/SkeletonBlock.vue'
import LineChart from '../components/base/LineChart.vue'
import BarList from '../components/base/BarList.vue'
import AppsTable from '../components/AppsTable.vue'
import { useOverview } from '../composables/useOverview'

// Pantalla "Resumen". Su pregunta: ¿cómo va cada app y cuál necesita atención? La respuesta es la
// tabla comparativa (lo más grande); arriba, las cifras globales; abajo, qué app crece.
const { rows, kpis, finding, chartSeries, ranking, appleMonth, googleMonth, loading, updatedAt, load } = useOverview()

const updatedTime = computed(() => updatedAt.value?.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }))

onMounted(load)
</script>

<style scoped>
.stamp { white-space: nowrap; }
.card-source { display: flex; align-items: center; gap: 8px; margin: -6px 0 14px; font-size: 12px; color: var(--muted); }
.trend-row { margin-top: var(--gap); align-items: stretch; }
.trend-row > :deep(.panel) { display: flex; flex-direction: column; }
.chart-fill { flex: 1; min-height: 190px; position: relative; }
.reveal-wrap { margin-bottom: 0; }
</style>
