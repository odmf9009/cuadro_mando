<template>
  <div class="login-body">
    <div class="login-card">
      <div class="login-brand">
        <span class="brand-dot"></span>
        <span>Cuadro de Mando</span>
      </div>
      <p class="muted">Accede para ver las métricas de todos tus proyectos.</p>

      <AlertBanner v-if="error" type="error">{{ error }}</AlertBanner>

      <form class="login-form" @submit.prevent="onSubmit">
        <BaseInput v-model="username" label="Usuario" autocomplete="username" required autofocus />
        <BaseInput v-model="password" type="password" label="Contraseña" autocomplete="current-password" required />
        <BaseButton type="submit" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</BaseButton>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseInput from '../components/base/BaseInput.vue'
import BaseButton from '../components/base/BaseButton.vue'
import AlertBanner from '../components/base/AlertBanner.vue'
import { ApiError } from '../api/http'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(username.value, password.value)
    router.push(route.query.redirect || '/')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'No se pudo iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>
