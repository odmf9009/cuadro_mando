<template>
  <div class="theme" role="group" aria-label="Tema">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="theme-opt"
      :class="{ on: mode === o.value }"
      :aria-pressed="mode === o.value"
      :title="o.label"
      @click="setMode(o.value)"
    >
      <AppIcon :name="o.icon" />
      <span class="theme-label">{{ o.label }}</span>
    </button>
  </div>
</template>

<script setup>
import AppIcon from './AppIcon.vue'
import { useTheme } from '../../composables/useTheme'

const { mode, setMode } = useTheme()
const options = [
  { value: 'auto', label: 'Auto', icon: 'auto' },
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', icon: 'moon' },
]
</script>

<style scoped>
.theme { display: flex; gap: 2px; padding: 2px; background: var(--raised); border-radius: 8px; }
.theme-opt {
  flex: 1; min-height: 30px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: none; background: none; border-radius: 6px; color: var(--muted); cursor: pointer; font-size: 12px;
}
.theme-opt:hover { color: var(--text); }
.theme-opt.on { background: var(--surface); color: var(--text); }
@media (max-width: 899px) { .theme-opt { min-height: 44px; font-size: 14px; } }
</style>
