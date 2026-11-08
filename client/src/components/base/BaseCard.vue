<template>
  <section class="panel">
    <div v-if="title || $slots.aside" class="panel-head">
      <h2>{{ title }}</h2>
      <slot name="aside" />
    </div>
    <slot />
  </section>
</template>

<script setup>
// Superficie plana: fondo blanco/gris, borde de 1 px, sin sombra. "aside" = acción o dato a la derecha del título.
defineProps({
  title: { type: String, default: '' },
})
</script>
