<template>
  <div class="mini-bars" :style="{ height }">
    <canvas ref="canvasEl" role="img" :aria-label="ariaLabel"></canvas>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Chart } from 'chart.js/auto'

// Barras pequeñas para una evolucion corta (ej. descargas de los ultimos 6
// meses). items = [{ label, value }]; value null = "sin dato" (no se dibuja
// barra y el tooltip lo dice, para no confundirlo con un cero real).
// format convierte el valor en texto para el tooltip.
const props = defineProps({
  items: { type: Array, required: true },
  color: { type: String, default: '#6366f1' },
  height: { type: String, default: '90px' },
  format: { type: Function, default: (v) => String(v) },
  ariaLabel: { type: String, default: 'Evolución por meses' },
})

const canvasEl = ref(null)
let chart = null

function render() {
  if (chart) chart.destroy()
  if (!canvasEl.value) return

  chart = new Chart(canvasEl.value, {
    type: 'bar',
    data: {
      labels: props.items.map((i) => i.label),
      datasets: [
        {
          data: props.items.map((i) => (i.value == null ? 0 : i.value)),
          backgroundColor: props.items.map((i) => (i.value == null ? 'transparent' : `${props.color}cc`)),
          borderColor: props.items.map((i) => (i.value == null ? '#8b93a7' : props.color)),
          borderWidth: props.items.map((i) => (i.value == null ? 1 : 0)),
          borderDash: [3, 3],
          borderRadius: 4,
          minBarLength: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => (props.items[ctx.dataIndex].value == null ? 'Sin informe todavía' : props.format(props.items[ctx.dataIndex].value)),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b93a7', font: { size: 10 } } },
        y: { display: false, beginAtZero: true },
      },
    },
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.items, props.color], render)
</script>

<style scoped>
.mini-bars { position: relative; width: 100%; }
</style>
