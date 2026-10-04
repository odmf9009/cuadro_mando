<template>
  <div class="panel">
    <h2 v-if="title">{{ title }}</h2>
    <slot />
  </div>
</template>

<script setup>
// Contenedor "panel" generico (el mismo fondo/borde/radio que ya usaban las
// tarjetas de detalle de proyecto). title es opcional: paneles como el
// listado de usuarios no necesitan encabezado propio.
defineProps({
  title: { type: String, default: '' },
})
</script>
