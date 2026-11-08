<template>
  <span class="mark" :style="{ '--s': size + 'px' }" aria-hidden="true">V<span>FL</span></span>
</template>

<script setup>
// Monograma del estudio (el mismo "V / FL" del portafolio): marca de la barra lateral y del acceso.
defineProps({ size: { type: Number, default: 32 } })
</script>

<style scoped>
.mark {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  width: var(--s); height: var(--s); border-radius: calc(var(--s) * 0.28);
  background: var(--text); color: var(--surface);
  font-weight: 700; font-size: calc(var(--s) * 0.32); line-height: 1;
  letter-spacing: -0.02em; flex-shrink: 0;
}
.mark span { font-size: calc(var(--s) * 0.3); margin-top: 1px; }
</style>
