<template>
  <div class="pagination">
    <span class="muted small">Página {{ page }} de {{ totalPages }}</span>
    <div class="pager">
      <BaseButton variant="ghost" size="small" :disabled="page <= 1" @click="$emit('update:page', page - 1)">Anterior</BaseButton>
      <BaseButton variant="ghost" size="small" :disabled="page >= totalPages" @click="$emit('update:page', page + 1)">Siguiente</BaseButton>
    </div>
  </div>
</template>

<script setup>
import BaseButton from './BaseButton.vue'

defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})
defineEmits(['update:page'])
</script>

<style scoped>
.pager { display: flex; gap: 8px; }
</style>
