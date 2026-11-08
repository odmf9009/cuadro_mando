<template>
  <label class="base-input">
    <span v-if="label" class="base-input-label">{{ label }}</span>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  required: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.base-input { display: flex; flex-direction: column; gap: 6px; }
.base-input-label { font-size: 13px; font-weight: 500; color: var(--text); }
</style>
