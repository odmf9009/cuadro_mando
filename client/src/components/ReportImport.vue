<template>
  <div class="report-import">
    <div class="report-import-main">
      <label class="report-import-label">
        <span class="report-import-title">{{ title }}</span>
        <input ref="fileEl" type="file" :accept="accept" @change="onPick" />
      </label>
      <BaseButton size="small" :disabled="!file || uploading" @click="onUpload">
        {{ uploading ? 'Importando…' : 'Importar' }}
      </BaseButton>
    </div>
    <p v-if="hint" class="muted small report-import-hint">{{ hint }}</p>
    <p v-if="imported" class="muted small">Ya importados: {{ imported }}</p>
    <AlertBanner v-if="result" :type="result.type" class="report-import-result">{{ result.message }}</AlertBanner>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BaseButton from './base/BaseButton.vue'
import AlertBanner from './base/AlertBanner.vue'

// Control generico para importar un archivo a mano (hoy: el ZIP de ganancias de
// Play Console). "upload" recibe el File y devuelve una promesa con
// { message } para mostrar; si lanza, se muestra el error. Emite "imported"
// al terminar bien para que la pagina recargue sus datos.
const props = defineProps({
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  imported: { type: String, default: '' },
  accept: { type: String, default: '' },
  upload: { type: Function, required: true },
})
const emit = defineEmits(['imported'])

const fileEl = ref(null)
const file = ref(null)
const uploading = ref(false)
const result = ref(null)

function onPick(event) {
  file.value = event.target.files[0] || null
  result.value = null
}

async function onUpload() {
  if (!file.value) return
  uploading.value = true
  result.value = null
  try {
    const res = await props.upload(file.value)
    result.value = { type: 'ok', message: `✅ ${res.message}` }
    file.value = null
    if (fileEl.value) fileEl.value.value = ''
    emit('imported')
  } catch (err) {
    result.value = { type: 'error', message: `⚠ ${err.message}` }
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.report-import { margin-top: 0.4rem; }
.report-import-main { display: flex; align-items: flex-end; gap: 0.8rem; flex-wrap: wrap; }
.report-import-label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: var(--muted); }
.report-import-title { font-weight: 600; color: var(--text); }
.report-import input[type='file'] { color: var(--muted); font-size: 0.85rem; }
.report-import-hint { margin: 0.4rem 0 0; }
.report-import-result { margin-top: 0.6rem; }
</style>
