<template>
  <ul class="breakdown-list">
    <li v-for="[key, value] in entries" :key="key">
      <span>{{ key }}</span>
      <strong>{{ value }}</strong>
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'

// Lista "etiqueta -> numero" generica (suscripciones por plan/estado,
// plataformas...). Acepta un objeto plano y lo convierte a filas.
const props = defineProps({
  data: { type: Object, required: true },
})
const entries = computed(() => Object.entries(props.data))
</script>
