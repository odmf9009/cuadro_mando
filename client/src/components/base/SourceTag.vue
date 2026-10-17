<template>
  <span class="source-tag" :class="`source-${kind}`" :title="`Origen del dato: ${text}`">{{ text }}</span>
</template>

<script setup>
import { computed } from 'vue'

// Etiqueta de ORIGEN de un dato (de donde sale la cifra). Regla del panel:
// ninguna cifra se muestra sin saber si viene de Apple, de Google, de Stripe,
// de Firebase o de la base de datos de la propia app. "kind" decide el color;
// "label" afina el texto (ej. "Informe de ventas de Apple").
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
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
  white-space: nowrap;
}
.source-apple { color: #e5e7eb; border-color: rgba(229, 231, 235, 0.3); background: rgba(229, 231, 235, 0.07); }
.source-google { color: #86efac; border-color: rgba(34, 197, 94, 0.35); background: rgba(34, 197, 94, 0.08); }
.source-web { color: #a5b4fc; border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.1); }
.source-firebase { color: #fcd34d; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.08); }
.source-db { color: var(--muted); }
</style>
