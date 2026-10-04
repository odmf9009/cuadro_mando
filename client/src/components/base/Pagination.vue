<template>
  <div class="pagination">
    <BaseButton v-if="page > 1" size="small" @click="$emit('update:page', page - 1)">← Anterior</BaseButton>
    <span class="muted small">Página {{ page }} de {{ totalPages }}</span>
    <BaseButton v-if="page < totalPages" size="small" @click="$emit('update:page', page + 1)">Siguiente →</BaseButton>
  </div>
</template>

<script setup>
import BaseButton from './BaseButton.vue'

// Paginacion generica: solo necesita saber la pagina actual y el total de
// paginas, emite update:page para que el padre decida como recargar datos.
defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})
defineEmits(['update:page'])
</script>
