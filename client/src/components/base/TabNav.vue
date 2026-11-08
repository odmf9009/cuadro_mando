<template>
  <div class="tabs" role="tablist" :aria-label="label">
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      role="tab"
      class="tab"
      :aria-selected="modelValue === t.value"
      @click="$emit('update:modelValue', t.value)"
    >
      {{ t.label }}
      <span v-if="t.count != null" class="tab-count">{{ t.count }}</span>
    </button>
  </div>
</template>

<script setup>
// Pestañas con subrayado (genérico: solo emite el valor elegido).
// tabs = [{ value, label, count? }]
defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, required: true },
  label: { type: String, default: 'Secciones' },
})
defineEmits(['update:modelValue'])
</script>
