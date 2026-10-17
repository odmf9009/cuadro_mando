<template>
  <table class="data-table">
    <thead>
      <tr>
        <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
        <th v-if="$slots.actions"></th>
      </tr>
    </thead>
    <tbody>
      <template v-if="loading">
        <tr v-for="n in skeletonRows" :key="`sk-${n}`">
          <td v-for="(col, ci) in columns" :key="col.key">
            <SkeletonBlock :width="skeletonWidth(n, ci)" height="0.95rem" />
          </td>
          <td v-if="$slots.actions" class="actions-cell">
            <SkeletonBlock width="5.5rem" height="1.7rem" radius="10px" />
          </td>
        </tr>
      </template>
      <template v-else>
      <tr
        v-for="(row, i) in rows"
        :key="rowKey ? row[rowKey] : i"
        :class="{ 'row-clickable': clickable }"
        @click="clickable && emit('row-click', row)"
      >
        <td v-for="col in columns" :key="col.key" :class="col.class">
          <!-- Slot con nombre "cell-<key>" para columnas con formato custom
               (fechas, badges...); si no se usa, cae al valor crudo. -->
          <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
            {{ col.formatter ? col.formatter(row[col.key], row) : (row[col.key] ?? emptyValue) }}
          </slot>
        </td>
        <td v-if="$slots.actions" class="actions-cell" @click.stop>
          <slot name="actions" :row="row" />
        </td>
      </tr>
      <tr v-if="!rows.length">
        <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="muted">
          {{ emptyMessage }}
        </td>
      </tr>
      </template>
    </tbody>
  </table>
</template>

<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// Tabla generica reutilizada por cualquier listado (hoy: usuarios de cada
// proyecto). columns = [{ key, label, formatter?, class? }]. Cada columna
// puede además recibir contenido custom via slot "cell-<key>" cuando un
// formatter de texto no alcanza (ej. un badge o un boton).
// clickable: las filas emiten "row-click" (el slot "actions" no, para que sus
// botones no disparen la navegacion de la fila).
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: '' },
  emptyMessage: { type: String, default: 'No hay datos para mostrar.' },
  emptyValue: { type: String, default: '—' },
  clickable: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  skeletonRows: { type: Number, default: 8 },
})

const skeletonWidth = (row, col) => `${52 + ((row * 17 + col * 23) % 40)}%`
const emit = defineEmits(['row-click'])
</script>

<style scoped>
.row-clickable {
  cursor: pointer;
  transition: background 0.12s ease;
}
.row-clickable:hover {
  background: rgba(99, 102, 241, 0.08);
}
</style>
