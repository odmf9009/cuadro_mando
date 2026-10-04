<template>
  <button
    :type="type"
    class="button-link"
    :class="[size === 'small' ? 'small-button' : '', variant === 'ghost' ? 'button-ghost' : '']"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script setup>
// Boton generico reutilizado en toda la app: mismo look que ya tenia el
// dashboard en EJS (clases .button-link / .small-button en style.css),
// solo con las variantes expuestas como props en vez de repetir HTML.
defineProps({
  type: { type: String, default: 'button' },
  size: { type: String, default: 'normal' }, // 'normal' | 'small'
  variant: { type: String, default: 'solid' }, // 'solid' | 'ghost'
  disabled: { type: Boolean, default: false },
})
</script>

<style scoped>
.button-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
}
.button-ghost:hover {
  border-color: var(--primary);
  color: var(--text);
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
