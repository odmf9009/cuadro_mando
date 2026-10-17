<template>
  <span class="status-chip" :class="`chip-${tone}`">{{ label }}</span>
</template>

<script setup>
// Chip de estado de varios tonos (a diferencia de StatusBadge, que es binario
// ok/off). tone: ok | pending | neutral | error.
defineProps({
  label: { type: String, required: true },
  tone: { type: String, default: 'neutral' },
})
</script>

<style scoped>
.status-chip {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  white-space: nowrap;
}
.chip-ok { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.chip-pending { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.chip-error { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.chip-neutral { background: rgba(139, 147, 167, 0.15); color: var(--muted); }
</style>
