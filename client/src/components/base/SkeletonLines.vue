<template>
  <div class="skeleton-stack">
    <SkeletonBlock v-if="big" width="45%" height="1.9rem" />
    <SkeletonBlock v-for="n in lines" :key="n" :width="n === lines ? '70%' : '100%'" height="0.9rem" />
  </div>
</template>

<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// Cuerpo de carga generico para una tarjeta: opcionalmente una cifra grande
// y varias lineas de texto (la ultima mas corta, como un parrafo real).
defineProps({
  lines: { type: Number, default: 3 },
  big: { type: Boolean, default: true },
})
</script>
