<template>
  <AppLayout
    :heading="project ? `Usuarios · ${project.name}` : ''"
    :subheading="project && !loading ? `${total.toLocaleString('es')} usuarios en total` : ''"
  >
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
      <div v-if="activeSegmentLabel" class="segment-chip">
        Mostrando: <strong>{{ activeSegmentLabel }}</strong>
        <RouterLink :to="`/project/${id}/users`" class="segment-chip-clear">✕ quitar filtro</RouterLink>
      </div>

      <form class="search-bar" @submit.prevent="() => load(1)">
        <BaseInput v-model="search" placeholder="Buscar por nombre o email..." />
        <BaseButton type="submit">Buscar</BaseButton>
      </form>

      <BaseCard>
        <BaseTable
          :columns="columns"
          :rows="users"
          row-key="_id"
          empty-message="No se encontraron usuarios."
          :clickable="Boolean(project?.hasUserActivity)"
          :loading="loading"
          @row-click="openUser"
        >
          <template #cell-activity="{ row }">
            <div class="activity-cell">
              <template v-if="row.jobsCount != null">
                <span :class="row.jobsCount ? 'activity-main' : 'muted'">{{ plural(row.jobsCount, 'trabajo', 'trabajos') }}</span>
                <span v-if="row.postedCount" class="muted small">{{ plural(row.postedCount, 'publicación', 'publicaciones') }}</span>
              </template>
              <span v-else-if="row.postedCount != null" :class="row.postedCount ? 'activity-main' : 'muted'">
                {{ plural(row.postedCount, 'publicación', 'publicaciones') }}
              </span>
              <span v-else class="muted">—</span>
            </div>
          </template>
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
            <span v-else-if="project?.hasPasswordReset" class="muted small">No soportado</span>
          </template>
        </BaseTable>

        <Pagination :page="page" :total-pages="totalPages" @update:page="load" />
      </BaseCard>
    </template>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
const route = useRoute()
const router = useRouter()

const projectsStore = useProjectsStore()
const project = ref(null)
const users = ref([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const search = ref('')
const connectionError = ref(null)
const loading = ref(true)
const actionResult = ref(null)
const pendingId = ref(null)

// Columnas base + las extra que declara cada proyecto (project.userColumns).
const columns = computed(() => [
  { key: 'name', label: 'Nombre', formatter: (v, row) => v || row.nombre || '—' },
  { key: 'email', label: 'Email' },
  ...(project.value?.userColumns || []),
  { key: 'createdAt', label: 'Alta' },
])

const activeSegmentLabel = computed(() => {
  const value = route.query.segment
  const opt = project.value?.segments?.options.find((o) => o.value === value)
  return opt?.label || null
})

async function load(nextPage = 1) {
  page.value = nextPage
  loading.value = true
  try {
    const data = await projectsApi.users(props.id, { page: nextPage, q: search.value, segment: route.query.segment || '' })
    users.value = data.users
    total.value = data.total
    totalPages.value = data.totalPages
    connectionError.value = data.error || null
  } catch (err) {
    users.value = []
    connectionError.value = err.message
  } finally {
    loading.value = false
  }
}

async function init() {
  loading.value = true
  await projectsStore.load()
  project.value = projectsStore.byId(props.id)
  if (project.value) await load(1)
  else loading.value = false
}

function plural(n, one, many) {
  return `${n.toLocaleString('es')} ${n === 1 ? one : many}`
}

function openUser(user) {
  router.push(`/project/${props.id}/users/${encodeURIComponent(user._id)}`)
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
watch(
  () => route.query.segment,
  () => {
    if (project.value) load(1)
  }
)
</script>

<style scoped>
.activity-cell {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
}
.activity-main {
  font-weight: 700;
}
</style>
