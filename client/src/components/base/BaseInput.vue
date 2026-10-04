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
// Input de formulario generico con v-model, reutilizado en login, buscador
// de usuarios, etc. El look (fondo oscuro, borde, foco) sale de las mismas
// reglas .login-form input / .search-bar input que ya existian.
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
.base-input {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--muted);
}
.base-input input {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
  color: var(--text);
  font-size: 0.95rem;
}
.base-input input:focus {
  outline: none;
  border-color: var(--primary);
}
</style>
