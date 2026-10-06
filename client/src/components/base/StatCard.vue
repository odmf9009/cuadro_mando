<template>
  <component :is="to ? 'router-link' : 'div'" :to="to" class="kpi-card" :class="{ 'kpi-card-live': live, 'kpi-card-clickable': to }">
    <span class="kpi-label">
      <LiveDot v-if="live" />
      {{ label }}
    </span>
    <span class="kpi-value">{{ formattedValue }}</span>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import LiveDot from './LiveDot.vue'

// Tarjeta de KPI generica (usuarios totales, nuevos, activos, en linea...).
// value puede ser numero (se formatea con separador de miles), o ya venir
// como texto ("No disponible", "N/D") cuando el dato no aplica.
// "to" es opcional: si se pasa, la tarjeta se vuelve un RouterLink clicable
// (ej. tarjeta de "Clientes" que lleva al listado filtrado).
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String, null], default: null },
  fallback: { type: String, default: 'No disponible' },
  live: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
})

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined) return props.fallback
  return typeof props.value === 'number' ? props.value.toLocaleString('es') : props.value
})
</script>
