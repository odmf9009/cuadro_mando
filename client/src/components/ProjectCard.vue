<template>
  <component
    :is="project.name ? 'router-link' : 'div'"
    :to="project.name ? `/project/${project.id}` : undefined"
    class="project-card"
    :style="{ '--accent': project.color }"
  >
    <div class="project-card-header">
      <span class="project-dot" :style="{ background: project.color }"></span>
      <div>
        <h3>
          <template v-if="project.name">{{ project.name }}</template>
          <SkeletonBlock v-else width="110px" height="1.05rem" />
        </h3>
        <p class="muted small">
          <template v-if="project.name">{{ project.description }}</template>
          <SkeletonBlock v-else width="170px" height="0.8rem" />
        </p>
      </div>
      <SkeletonBlock v-if="loading" class="status-skeleton" width="88px" height="1.2rem" radius="999px" />
      <StatusBadge v-else :ok="Boolean(stats?.connected)" />
    </div>

    <div v-if="loading" class="project-card-stats">
      <div v-for="n in 3" :key="n">
        <SkeletonBlock width="2.4rem" height="1.2rem" />
        <SkeletonBlock width="3.6rem" height="0.7rem" />
      </div>
    </div>
    <div v-else-if="stats?.connected" class="project-card-stats reveal">
      <div>
        <span class="stat-value">{{ formatNumber(stats.totalUsers, 'N/D') }}</span>
        <span class="stat-label">Usuarios</span>
      </div>
      <div>
        <span class="stat-value">{{ formatNumber(stats.activeUsers, 'N/D') }}</span>
        <span class="stat-label">Activos</span>
      </div>
      <div>
        <span v-if="project.capabilities.subscriptions" class="stat-value">{{ formatNumber(stats.subscriptions?.active, 'N/D') }}</span>
        <span v-else class="stat-value stat-value-none">No tiene</span>
        <span class="stat-label">Suscripciones</span>
      </div>
      <div v-if="stats.onlineUsers != null">
        <span class="stat-value stat-value-live"><LiveDot />{{ formatNumber(stats.onlineUsers) }}</span>
        <span class="stat-label">En línea</span>
      </div>
    </div>
    <p v-else class="muted small error-text">⚠ {{ stats?.error || 'Sin conexión configurada' }}</p>
  </component>
</template>

<script setup>
import StatusBadge from './base/StatusBadge.vue'
import LiveDot from './base/LiveDot.vue'
import SkeletonBlock from './base/SkeletonBlock.vue'

// Tarjeta de proyecto del resumen general. "loading" = el overview todavia
// no llego: se pintan bloques de carga en vez de un estado (que seria falso).
// Un project sin "name" es un marcador de posicion (aun no cargo el registro).
defineProps({
  project: { type: Object, required: true },
  stats: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

function formatNumber(value, fallback = '—') {
  return value != null ? value.toLocaleString('es') : fallback
}
</script>

<style scoped>
.stat-value-none {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.45rem;
}

.status-skeleton {
  margin-left: auto;
}
</style>
