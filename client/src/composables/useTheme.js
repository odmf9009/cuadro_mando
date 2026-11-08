import { computed, ref } from 'vue'

// Tema del panel: 'auto' (sigue al sistema), 'light' u 'dark'. La elección se guarda en el
// navegador. Las variables de style.css ya contemplan los tres casos; aquí solo se pone o
// se quita data-theme en <html>.
const KEY = 'cuadro-theme'
const mode = ref(read())

function read() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

function apply(value) {
  const root = document.documentElement
  if (value === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', value)
}

apply(mode.value)

export function useTheme() {
  function setMode(value) {
    mode.value = value
    apply(value)
    try {
      if (value === 'auto') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, value)
    } catch {
      /* sin almacenamiento: el cambio vale solo para esta sesión */
    }
    window.dispatchEvent(new Event('theme-change')) // los gráficos releen los colores
  }
  return { mode: computed(() => mode.value), setMode }
}
