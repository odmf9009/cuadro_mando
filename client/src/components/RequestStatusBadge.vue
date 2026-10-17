<template>
  <span class="request-status" :class="`request-status-${tone}`">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'

// Badge multi-estado para una incidencia/solicitud de FixRadar. A diferencia
// de StatusBadge (binario ok/off), aqui hay 6 estados con su propio color.
const STATUSES = {
  open: { label: 'Abierta', tone: 'blue' },
  assigned: { label: 'Asignada', tone: 'violet' },
  inProgress: { label: 'En curso', tone: 'amber' },
  finishedByTechnician: { label: 'Terminada por el profesional', tone: 'cyan' },
  completed: { label: 'Completada', tone: 'green' },
  cancelled: { label: 'Cancelada', tone: 'red' },
}

const props = defineProps({
  status: { type: String, default: '' },
})

const entry = computed(() => STATUSES[props.status] || { label: props.status || '—', tone: 'gray' })
const label = computed(() => entry.value.label)
const tone = computed(() => entry.value.tone)
</script>

<style scoped>
.request-status {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
  letter-spacing: 0.02em;
}
.request-status-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.request-status-violet { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
.request-status-amber { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.request-status-cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
.request-status-green { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.request-status-red { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.request-status-gray { background: rgba(139, 147, 167, 0.15); color: var(--muted); }
</style>
