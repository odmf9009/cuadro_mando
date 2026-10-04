import { defineStore } from 'pinia'
import { authApi } from '../api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: null,
    checked: false, // ya se resolvio la comprobacion inicial de sesion
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.username),
  },
  actions: {
    // Se llama una vez al arrancar el SPA (App.vue) para saber si ya hay
    // una sesion de servidor vigente (cookie httpOnly) antes de decidir a
    // que pagina mandar al usuario.
    async checkSession() {
      try {
        const data = await authApi.me()
        this.username = data.authenticated ? data.username : null
      } finally {
        this.checked = true
      }
    },
    async login(username, password) {
      const data = await authApi.login(username, password)
      this.username = data.username
    },
    async logout() {
      await authApi.logout()
      this.username = null
    },
  },
})
