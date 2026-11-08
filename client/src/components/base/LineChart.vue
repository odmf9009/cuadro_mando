<template>
  <div class="line-chart" :style="{ height }">
    <canvas ref="canvasEl" role="img" :aria-label="ariaLabel"></canvas>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Chart } from 'chart.js/auto'
import { readChartTheme, useChartTheme } from '../../composables/chartTheme'

// Una serie en el tono de dato: línea de 2 px en segmentos rectos (no se inventan valores entre
// días), sin puntos ni relleno, 4 líneas de guía horizontales y eje Y sin línea. Los colores salen del
// tema. series = [{ day: 'YYYY-MM-DD', count: n }]
const props = defineProps({
  series: { type: Array, required: true },
  color: { type: String, default: '' }, // vacío = tono de dato del tema
  label: { type: String, default: 'Nuevos usuarios' },
  height: { type: String, default: '220px' },
  ariaLabel: { type: String, default: 'Altas por día' },
})

const canvasEl = ref(null)
let chart = null

const dayLabel = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })

function render() {
  chart?.destroy()
  if (!canvasEl.value) return
  const t = readChartTheme()
  const line = props.color || t.chart

  chart = new Chart(canvasEl.value, {
    type: 'line',
    data: {
      labels: props.series.map((p) => dayLabel(p.day)),
      datasets: [
        {
          label: props.label,
          data: props.series.map((p) => p.count),
          borderColor: line,
          borderWidth: 2,
          tension: 0,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: line,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: t.text,
          titleColor: t.surface,
          bodyColor: t.surface,
          cornerRadius: 6,
          padding: 8,
        },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: t.muted, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
        y: {
          beginAtZero: true,
          grace: '12%',
          border: { display: false },
          grid: { color: t.grid },
          ticks: { color: t.muted, font: { size: 11 }, precision: 0, maxTicksLimit: 5 },
        },
      },
    },
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.series, props.color], render)
useChartTheme(render)
</script>

<style scoped>
.line-chart { position: relative; width: 100%; }
.line-chart canvas { max-width: 100%; display: block; }
</style>
