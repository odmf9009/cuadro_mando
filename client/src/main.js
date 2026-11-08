import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import '@fontsource-variable/geist' // tipografía del panel (autoalojada: sin peticiones a terceros)
import './style.css'
import './composables/useTheme' // aplica el tema guardado antes de pintar

createApp(App).use(createPinia()).use(router).mount('#app')
