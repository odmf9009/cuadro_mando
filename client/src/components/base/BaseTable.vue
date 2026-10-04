<template>
  <table class="data-table">
    <thead>
      <tr>
        <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
        <th v-if="$slots.actions"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, i) in rows" :key="rowKey ? row[rowKey] : i">
        <td v-for="col in columns" :key="col.key" :class="col.class">
          <!-- Slot con nombre "cell-<key>" para columnas con formato custom
               (fechas, badges...); si no se usa, cae al valor crudo. -->
          <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
            {{ col.formatter ? col.formatter(row[col.key], row) : (row[col.key] ?? emptyValue) }}
          </slot>
        </td>
        <td v-if="$slots.actions" class="actions-cell">
          <slot name="actions" :row="row" />
        </td>
      </tr>
      <tr v-if="!rows.length">
        <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="muted">
          {{ emptyMessage }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
// Tabla generica reutilizada por cualquier listado (hoy: usuarios de cada
// proyecto). columns = [{ key, label, formatter?, class? }]. Cada columna
// puede además recibir contenido custom via slot "cell-<key>" cuando un
// formatter de texto no alcanza (ej. un badge o un boton).
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: '' },
  emptyMessage: { type: String, default: 'No hay datos para mostrar.' },
  emptyValue: { type: String, default: '—' },
})
</script>
