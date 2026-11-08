<template>
  <span class="source-tag" :class="`source-${kind}`" :title="`Origen del dato: ${text}`">{{ text }}</span>
</template>

<script setup>
import { computed } from 'vue'

// Etiqueta de ORIGEN de un dato (de dónde sale la cifra). Regla del panel: ninguna cifra se
// muestra sin saber si viene de Apple, de Google, de Stripe, de Firebase o de la base de datos
// de la propia app. Es neutra a propósito (el marco no lleva color): lo que distingue un origen
// de otro es su nombre, no un tono. "kind" decide el texto por defecto; "label" lo afina.
const DEFAULT_LABELS = {
  apple: 'Apple',
  google: 'Google',
  web: 'Stripe',
  firebase: 'Firebase',
  db: 'Base de datos de la app',
}

const props = defineProps({
  kind: { type: String, default: 'db' },
  label: { type: String, default: '' },
})

const text = computed(() => props.label || DEFAULT_LABELS[props.kind] || DEFAULT_LABELS.db)
</script>

<style scoped>
.source-tag {
  display: inline-block;
  flex: none;
  max-width: 100%;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  background: var(--raised);
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
