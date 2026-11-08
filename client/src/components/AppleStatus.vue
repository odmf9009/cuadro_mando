<template>
  <SkeletonBlock v-if="cell.state === 'loading'" width="5.5rem" height="1.1rem" radius="999px" />
  <template v-else-if="cell.state === 'ok' && cell.status">
    <StatusChip :label="cell.status.version && !compact ? `${cell.status.label} · v${cell.status.version}` : cell.status.label" :tone="cell.status.tone" />
  </template>
  <span v-else class="muted small" :title="cell.reason || 'Estado no disponible'">{{ compact ? '' : '—' }}</span>
</template>

<script setup>
import SkeletonBlock from './base/SkeletonBlock.vue'
import StatusChip from './base/StatusChip.vue'

// Estado de publicación en la App Store (Publicada, En revisión…) tal como lo informa App Store Connect.
defineProps({
  cell: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})
</script>
