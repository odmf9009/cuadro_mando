import { defineStore } from 'pinia'
import { projectsApi } from '../api/projects'

// Registro de proyectos (id, nombre, color, capabilities...). Se pide una
// sola vez y se comparte entre el sidebar y todas las paginas -> evita
// pedirlo de nuevo en cada navegacion.
export const useProjectsStore = defineStore('projects', {
  state: () => ({
    items: [],
    loaded: false,
  }),
  getters: {
    byId: (state) => (id) => state.items.find((p) => p.id === id),
  },
  actions: {
    async load() {
      if (this.loaded) return
      this.items = await projectsApi.list()
      this.loaded = true
    },
  },
})
