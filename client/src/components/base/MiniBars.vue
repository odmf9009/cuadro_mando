<template>
  <div class="mini-bars" :style="{ height }">
    <canvas ref="canvasEl" role="img" :aria-label="ariaLabel"></canvas>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Chart } from 'chart.js/auto'
import { readChartTheme, useChartTheme } from '../../composables/chartTheme'

// Barras pequeñas para una evolución corta (p. ej. descargas de los últimos 6 meses).
// items = [{ label, value }]; value null = "sin dato" (barra punteada y el tooltip lo dice, para no
// confundirlo con un cero real). La última barra (el periodo más reciente) va en el tono de dato;
// las anteriores, en gris. Barras de esquinas rectas; sin eje Y (hay tooltip y la cifra de arriba).
const props = defineProps({
  items: { type: Array, required: true },
  color: { type: String, default: '' },
  height: { type: String, default: '84px' },
  format: { type: Function, default: (v) => String(v) },
  ariaLabel: { type: String, default: 'Evolución por meses' },
})

const canvasEl = ref(null)
let chart = null

function render() {
  chart?.destroy()
  if (!canvasEl.value) return
  const t = readChartTheme()
  const hue = props.color || t.chart
  const last = props.items.length - 1

  chart = new Chart(canvasEl.value, {
    type: 'bar',
    data: {
      labels: props.items.map((i) => i.label),
      datasets: [
        {
          data: props.items.map((i) => (i.value == null ? 0 : i.value)),
          backgroundColor: props.items.map((i, idx) => (i.value == null ? 'transparent' : idx === last ? hue : t.control)),
          borderColor: props.items.map((i) => (i.value == null ? t.faint : 'transparent')),
          borderWidth: props.items.map((i) => (i.value == null ? 1 : 0)),
          borderDash: [3, 3],
          borderRadius: 0,
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
          displayColors: false,
          backgroundColor: t.text,
          titleColor: t.surface,
          bodyColor: t.surface,
          cornerRadius: 6,
          padding: 8,
          callbacks: {
            label: (ctx) => (props.items[ctx.dataIndex].value == null ? 'Sin informe todavía' : props.format(props.items[ctx.dataIndex].value)),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: t.muted, font: { size: 11 } } },
        y: { display: false, beginAtZero: true },
      },
    },
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.items, props.color], render)
useChartTheme(render)
</script>

<style scoped>
.mini-bars { position: relative; width: 100%; }
.mini-bars canvas { max-width: 100%; display: block; }
</style>
