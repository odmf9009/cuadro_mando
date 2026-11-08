<template>
  <label class="base-select">
    <span v-if="label" class="base-select-label">{{ label }}</span>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { type: Array, required: true }, // [{ value, label }]
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.base-select { display: flex; flex-direction: column; gap: 6px; }
.base-select-label { font-size: 12px; color: var(--muted); }
.base-select select { cursor: pointer; padding-right: 28px; }
</style>
