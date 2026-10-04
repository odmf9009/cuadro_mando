<template>
  <RouterLink :to="`/project/${project.id}`" class="project-card" :style="{ '--accent': project.color }">
    <div class="project-card-header">
      <span class="project-dot" :style="{ background: project.color }"></span>
      <div>
        <h3>{{ project.name }}</h3>
        <p class="muted small">{{ project.description }}</p>
      </div>
      <StatusBadge :ok="Boolean(stats?.connected)" />
    </div>

    <div v-if="stats?.connected" class="project-card-stats">
      <div>
        <span class="stat-value">{{ formatNumber(stats.totalUsers) }}</span>
        <span class="stat-label">Usuarios</span>
      </div>
      <div>
        <span class="stat-value">{{ formatNumber(stats.activeUsers, 'N/D') }}</span>
        <span class="stat-label">Activos</span>
      </div>
      <div>
        <span class="stat-value">{{ formatNumber(stats.subscriptions?.active, 'N/D') }}</span>
        <span class="stat-label">Suscripciones</span>
      </div>
      <div v-if="stats.onlineUsers != null">
        <span class="stat-value stat-value-live"><LiveDot />{{ formatNumber(stats.onlineUsers) }}</span>
        <span class="stat-label">En línea</span>
      </div>
    </div>
    <p v-else class="muted small error-text">⚠ {{ stats?.error || 'Sin conexión configurada' }}</p>
  </RouterLink>
</template>

<script setup>
import StatusBadge from './base/StatusBadge.vue'
import LiveDot from './base/LiveDot.vue'

// Tarjeta de proyecto del resumen general. "stats" puede llegar null
// mientras el overview todavia esta cargando -> se trata como desconectado.
defineProps({
  project: { type: Object, required: true },
  stats: { type: Object, default: null },
})

function formatNumber(value, fallback = '—') {
  return value != null ? value.toLocaleString('es') : fallback
}
</script>
