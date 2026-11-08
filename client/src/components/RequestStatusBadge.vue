<template>
  <span class="request-status" :class="`chip-${tone}`">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'

// Estado de una incidencia de FixRadar. Los colores dicen bueno / malo / en espera, no "qué estado es":
// completada en verde pálido, cancelada en rojo pálido, en curso en ámbar y el resto neutro.
const STATUSES = {
  open: { label: 'Abierta', tone: 'neutral' },
  assigned: { label: 'Asignada', tone: 'neutral' },
  inProgress: { label: 'En curso', tone: 'pending' },
  finishedByTechnician: { label: 'Terminada por el profesional', tone: 'pending' },
  completed: { label: 'Completada', tone: 'ok' },
  cancelled: { label: 'Cancelada', tone: 'error' },
}

const props = defineProps({
  status: { type: String, default: '' },
})

const entry = computed(() => STATUSES[props.status] || { label: props.status || '—', tone: 'neutral' })
const label = computed(() => entry.value.label)
const tone = computed(() => entry.value.tone)
</script>
