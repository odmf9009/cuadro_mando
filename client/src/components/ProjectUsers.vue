<template>
  <section id="usuarios" class="users-section">
    <header class="section-head">
      <h2 class="section-title">Usuarios</h2>
      <span v-if="!loading" class="muted small">{{ total.toLocaleString('es') }} en total</span>
      <SkeletonBlock v-else width="90px" height="0.8rem" />
    </header>

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
        <RouterLink :to="{ path: `/project/${project.id}`, hash: '#usuarios' }" class="segment-chip-clear">✕ quitar filtro</RouterLink>
      </div>

      <form class="users-search" @submit.prevent="load(1)">
        <BaseInput v-model="search" placeholder="Buscar por nombre o email..." />
        <button v-if="search" type="button" class="users-search-clear" aria-label="Borrar búsqueda" @click="search = ''">✕</button>
      </form>

      <BaseCard>
        <BaseTable
          :columns="columns"
          :rows="users"
          row-key="_id"
          empty-message="No se encontraron usuarios."
          :clickable="Boolean(project.hasUserActivity)"
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
            <span v-else-if="project.hasPasswordReset" class="muted small">No soportado</span>
          </template>
        </BaseTable>

        <Pagination :page="page" :total-pages="totalPages" @update:page="load" />
      </BaseCard>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseCard from './base/BaseCard.vue'
import BaseTable from './base/BaseTable.vue'
import BaseInput from './base/BaseInput.vue'
import BaseButton from './base/BaseButton.vue'
import Pagination from './base/Pagination.vue'
import AlertBanner from './base/AlertBanner.vue'
import SkeletonBlock from './base/SkeletonBlock.vue'
import { projectsApi } from '../api/projects'
import { useConfirm } from '../composables/useConfirm'
import { useDebounceFn } from '../composables/useDebounce'

// Listado de usuarios de un proyecto (con buscador en vivo, filtro por
// segmento via ?segment= y, segun el proyecto, columnas extra y fila clicable
// a la ficha). Vive dentro de la pagina del proyecto, debajo de las tarjetas
// de tienda; el mismo componente sirve para cualquier proyecto con usuarios.
const props = defineProps({ project: { type: Object, required: true } })

const { confirmAction } = useConfirm()
const route = useRoute()
const router = useRouter()

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
  ...(props.project.userColumns || []),
  { key: 'createdAt', label: 'Alta' },
])

const activeSegmentLabel = computed(() => {
  const value = route.query.segment
  return props.project.segments?.options.find((o) => o.value === value)?.label || null
})

// Descarta la respuesta de una busqueda vieja si ya se lanzo otra mas nueva.
let loadToken = 0

async function load(nextPage = 1) {
  const token = ++loadToken
  page.value = nextPage
  loading.value = true
  try {
    const data = await projectsApi.users(props.project.id, {
      page: nextPage,
      q: search.value,
      segment: route.query.segment || '',
    })
    if (token !== loadToken) return
    users.value = data.users
    total.value = data.total
    totalPages.value = data.totalPages
    connectionError.value = data.error || null
  } catch (err) {
    if (token !== loadToken) return
    users.value = []
    connectionError.value = err.message
  } finally {
    if (token === loadToken) loading.value = false
  }
}

const searchSoon = useDebounceFn(() => load(1), 300)

function plural(n, one, many) {
  return `${n.toLocaleString('es')} ${n === 1 ? one : many}`
}

function openUser(user) {
  router.push(`/project/${props.project.id}/users/${encodeURIComponent(user._id)}`)
}

async function onSendReset(user) {
  if (!confirmAction(`¿Enviar/generar el link de reseteo de contraseña para ${user.email || 'este usuario'}?`)) return
  pendingId.value = user._id
  try {
    const res = await projectsApi.sendReset(props.project.id, user._id)
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
    const res = await projectsApi.setTempPassword(props.project.id, user._id)
    actionResult.value = { type: 'ok', mode: 'temp-password', password: res.password, email: res.email }
  } catch (err) {
    actionResult.value = { type: 'error', error: err.message }
  } finally {
    pendingId.value = null
  }
}

onMounted(() => load(1))
watch(search, searchSoon)
watch(() => props.project.id, () => {
  search.value = ''
  actionResult.value = null
  load(1)
})
watch(() => route.query.segment, () => load(1))
</script>

<style scoped>
.users-section { margin-top: 2.2rem; scroll-margin-top: 1rem; }

.section-head {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
  margin-bottom: 1rem;
}
.section-title { margin: 0; font-size: 1.15rem; }

.users-search {
  position: relative;
  max-width: 420px;
  margin-bottom: 1.2rem;
}
.users-search-clear {
  position: absolute;
  right: 0.5rem;
  bottom: 0.45rem;
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem 0.45rem;
}
.users-search-clear:hover { color: var(--text); }

.activity-cell { display: flex; flex-direction: column; white-space: nowrap; }
.activity-main { font-weight: 700; }
</style>
