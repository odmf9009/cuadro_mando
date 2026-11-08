<template>
  <span class="status-badge" :class="ok ? 'status-ok' : 'status-off'">
    <span class="dot" aria-hidden="true"></span>{{ ok ? okLabel : offLabel }}
  </span>
</template>

<script setup>
// Estado binario de conexión (conectado / desconectado).
defineProps({
  ok: { type: Boolean, required: true },
  okLabel: { type: String, default: 'Conectada' },
  offLabel: { type: String, default: 'Sin conexión' },
})
</script>

<style scoped>
.dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
</style>
