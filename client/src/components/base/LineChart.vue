<template>
  <canvas ref="canvasEl" height="110"></canvas>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Chart } from 'chart.js/auto'

// Wrapper generico de Chart.js tipo linea. Reutilizable para cualquier
// serie temporal (hoy: altas de usuarios por dia). Reconstruye el grafico
// si cambian los datos o el color (ej. al navegar entre proyectos).
const props = defineProps({
  series: { type: Array, required: true }, // [{ day: 'YYYY-MM-DD', count: n }]
  color: { type: String, default: '#6366f1' },
  label: { type: String, default: 'Nuevos usuarios' },
})

const canvasEl = ref(null)
let chart = null

function render() {
  if (chart) chart.destroy()
  if (!canvasEl.value) return

  chart = new Chart(canvasEl.value, {
    type: 'line',
    data: {
      labels: props.series.map((p) => p.day.slice(5)), // MM-DD
      datasets: [
        {
          label: props.label,
          data: props.series.map((p) => p.count),
          borderColor: props.color,
          backgroundColor: `${props.color}33`,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b93a7' } },
        y: { beginAtZero: true, grid: { color: '#232c42' }, ticks: { color: '#8b93a7', precision: 0 } },
      },
    },
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.series, props.color], render)
</script>
