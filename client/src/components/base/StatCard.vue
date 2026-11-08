<template>
  <component :is="link ? 'router-link' : 'div'" :to="link" class="kpi-card" :class="{ 'kpi-card-clickable': link }">
    <span class="kpi-label">
      <LiveDot v-if="live && !loading" />
      {{ label }}
    </span>
    <span v-if="loading" class="kpi-value"><SkeletonBlock width="4.5rem" height="1.7rem" /></span>
    <span v-else class="kpi-value" :class="{ 'is-zero': isZero, muted: isMissing }">{{ formattedValue }}<span v-if="unit && !isMissing" class="unit">{{ unit }}</span></span>
    <span v-if="sub && !loading" class="kpi-sub">{{ sub }}</span>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import LiveDot from './LiveDot.vue'
import SkeletonBlock from './SkeletonBlock.vue'

// Celda de KPI (etiqueta sobre valor). Vive dentro de un contenedor .kpi-row partido por líneas
// finas: no es una tarjeta con icono. value puede ser número (separador de miles) o texto.
// Un valor ausente se escribe como guion gris; un cero real se imprime, en gris tenue.
// "sub" = línea de contexto (de dónde sale o a qué se refiere). "to" vuelve la celda un enlace.
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String, null], default: null },
  fallback: { type: String, default: '—' },
  unit: { type: String, default: '' },
  sub: { type: String, default: '' },
  live: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  loading: { type: Boolean, default: false },
})

const link = computed(() => (props.to && !props.loading ? props.to : null))
const isMissing = computed(() => props.value === null || props.value === undefined)
const isZero = computed(() => props.value === 0)
const formattedValue = computed(() => {
  if (isMissing.value) return props.fallback
  return typeof props.value === 'number' ? props.value.toLocaleString('es') : props.value
})
</script>
