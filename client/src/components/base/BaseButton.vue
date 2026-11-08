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
// Un relleno casi negro por pantalla para la acción principal; el resto, contorno (ghost).
defineProps({
  type: { type: String, default: 'button' },
  size: { type: String, default: 'normal' }, // 'normal' | 'small'
  variant: { type: String, default: 'solid' }, // 'solid' | 'ghost'
  disabled: { type: Boolean, default: false },
})
</script>
