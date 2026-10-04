<template>
  <AppLayout v-if="project" :heading="`Usuarios · ${project.name}`" :subheading="`${total.toLocaleString('es')} usuarios en total`">
    <AlertBanner v-if="connectionError" type="error">
      ⚠ No se pudo conectar a este proyecto: {{ connectionError }}
      <p class="muted small">Revisa la variable de entorno de este proyecto en tu archivo .env.</p>
    </AlertBanner>

    <AlertBanner v-else-if="actionResult" :type="actionResult.type">
      <template v-if="actionResult.type === 'ok' && actionResult.mode === 'sent'">✅ Correo de reseteo enviado.</template>

      <template v-else-if="actionResult.type === 'ok' && actionResult.mode === 'link'">
        ✅ Link generado (no hay SMTP configurado, así que no se envió solo). Cópialo y mándalo tú:
        <div class="link-box"><code>{{ actionResult.link }}</code></div>
      </template>

      <template v-else-if="actionResult.type === 'ok' && actionResult.mode === 'temp-password'">
        ✅ Contraseña temporal generada para <strong>{{ actionResult.email || 'el usuario' }}</strong>. Solo se muestra esta vez, no queda guardada en ningún lado:
        <div class="link-box"><code>{{ actionResult.password }}</code></div>
        <p class="muted small">Ya está activa: el usuario puede entrar a la app ahora mismo con esta contraseña. Pásasela por un canal seguro.</p>
      </template>

      <template v-else>⚠ {{ actionResult.error }}</template>
    </AlertBanner>

    <template v-if="!connectionError">
      <form class="search-bar" @submit.prevent="() => load(1)">
        <BaseInput v-model="search" placeholder="Buscar por nombre o email..." />
        <BaseButton type="submit">Buscar</BaseButton>
      </form>

      <BaseCard>
        <BaseTable :columns="columns" :rows="users" row-key="_id" empty-message="No se encontraron usuarios.">
          <template #cell-createdAt="{ value }">
            <span class="muted small">{{ value ? new Date(value).toLocaleDateString('es') : '—' }}</span>
          </template>
          <template #actions="{ row }">
            <BaseButton
              v-if="row.resetMethod === 'firebase'"
              size="small"
              :disabled="pendingId === row._id"
              @click="onSendReset(row)"
            >
              Enviar reset
            </BaseButton>
            <BaseButton
              v-else-if="row.resetMethod === 'bcrypt'"
              size="small"
              :disabled="pendingId === row._id"
              @click="onSetTempPassword(row)"
            >
              Generar contraseña temporal
            </BaseButton>
            <span v-else-if="project.capabilities" class="muted small">No soportado</span>
          </template>
        </BaseTable>

        <Pagination :page="page" :total-pages="totalPages" @update:page="load" />
      </BaseCard>
    </template>
  </AppLayout>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import AppLayout from '../components/layout/AppLayout.vue'
import BaseCard from '../components/base/BaseCard.vue'
import BaseTable from '../components/base/BaseTable.vue'
import BaseInput from '../components/base/BaseInput.vue'
import BaseButton from '../components/base/BaseButton.vue'
import Pagination from '../components/base/Pagination.vue'
import AlertBanner from '../components/base/AlertBanner.vue'
import { useProjectsStore } from '../stores/projects'
import { projectsApi } from '../api/projects'
import { useConfirm } from '../composables/useConfirm'

const props = defineProps({ id: { type: String, required: true } })
const { confirmAction } = useConfirm()

const projectsStore = useProjectsStore()
const project = ref(null)
const users = ref([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const search = ref('')
const connectionError = ref(null)
const actionResult = ref(null)
const pendingId = ref(null)

const columns = [
  { key: 'name', label: 'Nombre', formatter: (v, row) => v || row.nombre || '—' },
  { key: 'email', label: 'Email' },
  { key: 'createdAt', label: 'Alta' },
]

async function load(nextPage = 1) {
  page.value = nextPage
  const data = await projectsApi.users(props.id, { page: nextPage, q: search.value })
  users.value = data.users
  total.value = data.total
  totalPages.value = data.totalPages
  connectionError.value = data.error || null
}

async function init() {
  await projectsStore.load()
  project.value = projectsStore.byId(props.id)
  if (project.value) await load(1)
}

async function onSendReset(user) {
  if (!confirmAction(`¿Enviar/generar el link de reseteo de contraseña para ${user.email || 'este usuario'}?`)) return
  pendingId.value = user._id
  try {
    const res = await projectsApi.sendReset(props.id, user._id)
    actionResult.value = { type: 'ok', mode: res.mode, link: res.link }
  } catch (err) {
    actionResult.value = { type: 'error', error: err.message }
  } finally {
    pendingId.value = null
  }
}

async function onSetTempPassword(user) {
  if (!confirmAction(`Esto reemplaza AHORA MISMO la contraseña de ${user.email || 'este usuario'} por una temporal. ¿Continuar?`)) return
  pendingId.value = user._id
  try {
    const res = await projectsApi.setTempPassword(props.id, user._id)
    actionResult.value = { type: 'ok', mode: 'temp-password', password: res.password, email: res.email }
  } catch (err) {
    actionResult.value = { type: 'error', error: err.message }
  } finally {
    pendingId.value = null
  }
}

onMounted(init)
watch(() => props.id, init)
</script>
