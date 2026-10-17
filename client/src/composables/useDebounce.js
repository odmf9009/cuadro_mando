import { onBeforeUnmount } from 'vue'

// Devuelve una version de "fn" que espera "ms" sin nuevas llamadas antes de
// ejecutarse (ej. buscar mientras se escribe sin una peticion por tecla).
export function useDebounceFn(fn, ms = 300) {
  let timer = null
  onBeforeUnmount(() => clearTimeout(timer))
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
