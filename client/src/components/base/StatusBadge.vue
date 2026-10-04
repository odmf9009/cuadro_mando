<template>
  <span class="status-badge" :class="ok ? 'status-ok' : 'status-off'">
    {{ ok ? okLabel : offLabel }}
  </span>
</template>

<script setup>
// Badge de estado binario (Conectado/Desconectado, Activo/Inactivo...).
// Los textos son configurables para reutilizarlo en otros contextos ademas
// del estado de conexion de un proyecto.
defineProps({
  ok: { type: Boolean, required: true },
  okLabel: { type: String, default: 'Conectado' },
  offLabel: { type: String, default: 'Desconectado' },
})
</script>
