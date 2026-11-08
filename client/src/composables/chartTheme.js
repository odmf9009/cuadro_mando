import { onBeforeUnmount, onMounted } from 'vue'

// Colores de los gráficos leídos de las variables CSS del tema, para que claro/oscuro
// (y el cambio manual de tema) se reflejen sin repetir valores en cada gráfico.
export function readChartTheme() {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  return {
    chart: v('--chart', '#1d5fbf'),
    text: v('--text', '#0f1115'),
    muted: v('--muted', '#5a6270'),
    faint: v('--faint', '#667085'),
    grid: v('--grid', '#e6e9ee'),
    control: v('--control', '#cdd3dc'),
    surface: v('--surface', '#ffffff'),
  }
}

// Llama a `redraw` cuando cambia el tema (botón del panel o preferencia del sistema).
export function useChartTheme(redraw) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  onMounted(() => {
    window.addEventListener('theme-change', redraw)
    mq.addEventListener?.('change', redraw)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('theme-change', redraw)
    mq.removeEventListener?.('change', redraw)
  })
}
