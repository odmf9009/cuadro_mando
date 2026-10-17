<template>
  <component :is="link ? 'router-link' : 'div'" :to="link" class="kpi-card" :class="{ 'kpi-card-live': live && !loading, 'kpi-card-clickable': link }">
    <span class="kpi-label">
      <LiveDot v-if="live && !loading" />
      {{ label }}
    </span>
    <span v-if="loading" class="kpi-value"><SkeletonBlock width="4.5rem" height="1.7rem" /></span>
    <span v-else class="kpi-value">{{ formattedValue }}</span>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import LiveDot from './LiveDot.vue'
import SkeletonBlock from './SkeletonBlock.vue'

// Tarjeta de KPI generica (usuarios totales, nuevos, activos, en linea...).
// value puede ser numero (se formatea con separador de miles), o ya venir
// como texto ("No disponible", "N/D") cuando el dato no aplica.
// "to" es opcional: si se pasa, la tarjeta se vuelve un RouterLink clicable
// (ej. tarjeta de "Clientes" que lleva al listado filtrado).
// "loading": muestra el valor como bloque de carga (la etiqueta ya se conoce).
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String, null], default: null },
  fallback: { type: String, default: 'No disponible' },
  live: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  loading: { type: Boolean, default: false },
})

const link = computed(() => (props.to && !props.loading ? props.to : null))

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined) return props.fallback
  return typeof props.value === 'number' ? props.value.toLocaleString('es') : props.value
})
</script>
