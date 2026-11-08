<template>
  <SkeletonBlock v-if="cell.state === 'loading'" :width="width" height="0.95rem" />
  <span v-else-if="cell.state === 'na'" class="cell-na" :title="cell.reason">—</span>
  <span v-else-if="cell.state === 'pending'" class="cell-pending" :title="cell.reason">Pendiente</span>
  <span v-else class="cell-ok" :class="{ 'is-zero': isZero }" :title="title">{{ text }}<slot /></span>
</template>

<script setup>
import { computed } from 'vue'
import SkeletonBlock from './SkeletonBlock.vue'

// Una celda de tabla con los cuatro estados honestos del panel:
//   loading → bloque de carga | na → guion gris (el motivo va en el tooltip)
//   pending → existe pero aún no se puede leer | ok → la cifra (un cero se imprime, en gris tenue)
// cell = { state, value?, reason? }; "format" convierte el valor en texto.
const props = defineProps({
  cell: { type: Object, required: true },
  format: { type: Function, default: (v) => (typeof v === 'number' ? v.toLocaleString('es') : String(v)) },
  width: { type: String, default: '3rem' },
  title: { type: String, default: '' },
})

const text = computed(() => props.format(props.cell.value))
const isZero = computed(() => props.cell.value === 0)
</script>

<style scoped>
.cell-na { color: var(--faint); }
.cell-pending { color: var(--muted); font-size: 13px; }
.is-zero { color: var(--faint); }
</style>
