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
// Select generico con v-model. options = [{ value, label }]. Pensado para
// filtros (ej. tamaño de pagina, estado de suscripcion) reutilizable en
// cualquier pagina sin repetir el markup/estilo del <select>.
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { type: Array, required: true }, // [{ value, label }]
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.base-select {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--muted);
}
.base-select select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  color: var(--text);
  font-size: 0.9rem;
  cursor: pointer;
}
.base-select select:focus {
  outline: none;
  border-color: var(--primary);
}
</style>
