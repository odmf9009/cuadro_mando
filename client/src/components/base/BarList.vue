<template>
  <ul class="bar-list">
    <li v-for="(it, i) in items" :key="it.key ?? it.label">
      <div class="bar-row">
        <span class="bar-label">{{ it.label }}</span>
        <span class="bar-value" :class="{ 'is-zero': !it.value }">{{ it.display ?? it.value }}</span>
      </div>
      <div class="bar-track" aria-hidden="true">
        <div class="bar-fill" :class="{ lead: i === 0 && it.value > 0 }" :style="{ width: width(it.value) }"></div>
      </div>
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'

// Ranking horizontal: etiqueta, valor y una barra fina proporcional al mayor.
// La primera (la mayor) va en el tono del dato; las demás en gris. items = [{ label, value, display? }]
const props = defineProps({ items: { type: Array, required: true } })
const max = computed(() => Math.max(0, ...props.items.map((i) => i.value || 0)))
const width = (v) => (max.value ? `${Math.max(v ? 2 : 0, ((v || 0) / max.value) * 100)}%` : '0%')
</script>

<style scoped>
.bar-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.bar-row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.bar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-value { font-variant-numeric: tabular-nums; }
.bar-track { height: 3px; margin-top: 6px; background: var(--rule); border-radius: 2px; }
.bar-fill { height: 100%; background: var(--control); border-radius: 2px; }
.bar-fill.lead { background: var(--chart); }
</style>
