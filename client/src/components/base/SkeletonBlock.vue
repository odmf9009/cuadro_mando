<template>
  <span class="skeleton" :style="{ width, height, borderRadius: radius }" aria-hidden="true"></span>
</template>

<script setup>
// Bloque de carga (ver .skeleton en style.css). Se usa en lugar del contenido
// real mientras llegan los datos, con el tamaño aproximado de lo que sustituye.
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '1rem' },
  radius: { type: String, default: '8px' },
})
</script>
