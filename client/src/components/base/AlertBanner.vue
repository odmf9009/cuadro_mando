<template>
  <div :class="type === 'error' ? 'alert-error' : 'alert-ok'">
    <slot />
  </div>
</template>

<script setup>
// Banner de aviso generico (exito/error). El contenido va por slot en vez
// de una prop "message" porque varios usos necesitan HTML enriquecido (ej.
// mostrar un link o una contraseña generada dentro del aviso).
defineProps({
  type: { type: String, default: 'ok' }, // 'ok' | 'error'
})
</script>
