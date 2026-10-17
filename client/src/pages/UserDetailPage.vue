<template>
  <AppLayout
    :heading="project ? `Usuario · ${project.name}` : ''"
    :subheading="project ? 'Ficha, incidencias y actividad' : ''"
  >
    <RouterLink :to="`/project/${id}/users`" class="back-link">← Volver a usuarios</RouterLink>

    <AlertBanner v-if="error" type="error">⚠ {{ error }}</AlertBanner>

    <template v-else-if="detail">
      <section class="profile-card reveal">
        <div class="avatar-lg" :style="{ background: project.color }">
          <img v-if="detail.user.profileImageUrl" :src="detail.user.profileImageUrl" alt="" referrerpolicy="no-referrer" />
          <span v-else>{{ initials }}</span>
        </div>

        <div class="profile-main">
          <div class="profile-title">
            <h2>{{ displayName }}</h2>
            <span class="type-pill">{{ segmentLabel }}</span>
            <span v-if="isOnline" class="online-pill"><LiveDot /> En línea</span>
          </div>
          <p v-if="detail.user.companyName" class="muted small">{{ detail.user.companyName }}</p>
          <p v-if="detail.user.bio" class="profile-bio">{{ detail.user.bio }}</p>

          <ul class="chips">
            <li v-for="c in verificationChips" :key="c.label" :class="{ 'chip-on': c.on }">
              {{ c.on ? '✓' : '○' }} {{ c.label }}
            </li>
          </ul>
          <ul v-if="detail.user.specialties?.length" class="chips chips-soft">
            <li v-for="s in detail.user.specialties" :key="s">{{ s }}</li>
          </ul>
        </div>

        <dl class="profile-meta">
          <div><dt>Email</dt><dd>{{ detail.user.email || '—' }}</dd></div>
          <div v-if="detail.user.phoneNumber"><dt>Teléfono</dt><dd>{{ detail.user.phoneNumber }}</dd></div>
          <div v-if="detail.user.city"><dt>Ciudad</dt><dd>{{ detail.user.city }}</dd></div>
          <div><dt>Alta</dt><dd>{{ formatDate(detail.user.createdAt) }}</dd></div>
          <div><dt>Visto por última vez</dt><dd>{{ formatDateTime(detail.user.lastSeen) }}</dd></div>
          <div><dt>Acceso</dt><dd>{{ detail.user.authProvider === 'email' ? 'Email y contraseña' : detail.user.authProvider === 'firebase' ? 'Google / Firebase' : '—' }}</dd></div>
          <div v-if="detail.user.language"><dt>Idioma</dt><dd>{{ detail.user.language.toUpperCase() }}</dd></div>
        </dl>
      </section>

      <section class="kpi-row reveal">
        <StatCard label="Incidencias publicadas" :value="detail.postedRequests.count" />
        <StatCard
          v-if="detail.isTechnician"
          label="Trabajos realizados"
          :value="detail.completedJobs.count"
        />
        <StatCard
          v-if="detail.isTechnician"
          label="Valoración media"
          :value="detail.completedJobs.avgRating != null ? `${detail.completedJobs.avgRating} ★` : null"
          fallback="Sin valoraciones"
        />
        <StatCard
          v-if="detail.isTechnician && detail.user.yearsOfExperience"
          label="Años de experiencia"
          :value="detail.user.yearsOfExperience"
        />
      </section>

      <div class="card-stack reveal">
      <BaseCard title="Incidencias publicadas">
        <ul v-if="statusEntries.length" class="status-summary">
          <li v-for="[status, count] in statusEntries" :key="status">
            <RequestStatusBadge :status="status" /> <strong>{{ count }}</strong>
          </li>
        </ul>

        <BaseTable
          :columns="postedColumns"
          :rows="detail.postedRequests.items"
          row-key="_id"
          empty-message="Este usuario todavía no ha publicado ninguna incidencia."
        >
          <template #cell-title="{ row }">
            <strong>{{ row.title }}</strong>
            <div v-if="row.address" class="muted small">{{ row.address }}</div>
          </template>
          <template #cell-status="{ row }"><RequestStatusBadge :status="row.status" /></template>
          <template #cell-budget="{ row }">{{ formatBudget(row) }}</template>
          <template #cell-technicianName="{ row }">{{ row.technicianName || '—' }}</template>
          <template #cell-createdAt="{ row }">
            <span class="muted small">{{ formatDate(row.createdAt) }}</span>
          </template>
        </BaseTable>
        <p v-if="detail.postedRequests.truncated" class="muted small list-note">
          Mostrando las {{ detail.postedRequests.items.length }} más recientes de {{ detail.postedRequests.count }}.
        </p>
      </BaseCard>

      <BaseCard v-if="detail.isTechnician" title="Trabajos realizados">
        <BaseTable
          :columns="jobsColumns"
          :rows="detail.completedJobs.items"
          row-key="_id"
          empty-message="Este profesional todavía no ha completado ningún trabajo."
        >
          <template #cell-title="{ row }">
            <strong>{{ row.title }}</strong>
            <div v-if="row.address" class="muted small">{{ row.address }}</div>
          </template>
          <template #cell-budget="{ row }">{{ formatBudget(row) }}</template>
          <template #cell-reviewRating="{ row }">
            <span v-if="row.reviewRating != null" class="rating">{{ row.reviewRating }} ★</span>
            <span v-else class="muted small">Sin valorar</span>
          </template>
          <template #cell-completedAt="{ row }">
            <span class="muted small">{{ formatDate(row.completedAt) }}</span>
          </template>
        </BaseTable>
        <p v-if="detail.completedJobs.truncated" class="muted small list-note">
          Mostrando los {{ detail.completedJobs.items.length }} más recientes de {{ detail.completedJobs.count }}.
        </p>
      </BaseCard>
      </div>
    </template>

    <template v-else>
      <section class="profile-card">
        <SkeletonBlock width="72px" height="72px" radius="50%" />
        <div class="skeleton-stack">
          <SkeletonBlock width="220px" height="1.3rem" />
          <SkeletonBlock width="60%" height="0.8rem" />
          <SkeletonBlock width="45%" height="0.8rem" />
        </div>
        <div class="skeleton-stack">
          <SkeletonBlock v-for="n in 4" :key="n" height="1.3rem" />
        </div>
      </section>

      <section class="kpi-row">
        <StatCard label="Incidencias publicadas" loading />
      </section>

      <BaseCard title="Incidencias publicadas">
        <BaseTable :columns="postedColumns" loading :skeleton-rows="4" />
      </BaseCard>
    </template>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppLayout from '../components/layout/AppLayout.vue'
import BaseCard from '../components/base/BaseCard.vue'
import BaseTable from '../components/base/BaseTable.vue'
import StatCard from '../components/base/StatCard.vue'
import AlertBanner from '../components/base/AlertBanner.vue'
import LiveDot from '../components/base/LiveDot.vue'
import SkeletonBlock from '../components/base/SkeletonBlock.vue'
import RequestStatusBadge from '../components/RequestStatusBadge.vue'
import { useProjectsStore } from '../stores/projects'
import { projectsApi } from '../api/projects'

const props = defineProps({
  id: { type: String, required: true },
  userId: { type: String, required: true },
})

const projectsStore = useProjectsStore()
const project = ref(null)
const detail = ref(null)
const error = ref(null)

const postedColumns = [
  { key: 'title', label: 'Incidencia' },
  { key: 'category', label: 'Categoría' },
  { key: 'status', label: 'Estado' },
  { key: 'budget', label: 'Presupuesto' },
  { key: 'technicianName', label: 'Profesional' },
  { key: 'createdAt', label: 'Publicada' },
]

const jobsColumns = [
  { key: 'title', label: 'Trabajo' },
  { key: 'category', label: 'Categoría' },
  { key: 'clientName', label: 'Cliente' },
  { key: 'budget', label: 'Presupuesto' },
  { key: 'reviewRating', label: 'Valoración' },
  { key: 'completedAt', label: 'Completado' },
]

const displayName = computed(() => detail.value?.user.name || detail.value?.user.nombre || 'Sin nombre')

const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?'
)

const isOnline = computed(
  () => detail.value?.user.presenceStatus === 'online' || detail.value?.user.isOnline === true
)

const segmentLabel = computed(() => {
  const seg = project.value?.segments
  if (!seg) return ''
  const value = detail.value?.user.userType
  return seg.options.find((o) => o.value === value)?.label || seg.options[seg.options.length - 1].label
})

const verificationChips = computed(() => {
  const u = detail.value?.user || {}
  const chips = [
    { label: 'Email', on: u.emailVerified },
    { label: 'Teléfono', on: u.phoneVerified },
  ]
  if (detail.value?.isTechnician) {
    chips.push(
      { label: 'Identidad', on: u.idVerified },
      { label: 'Licencia', on: u.licenseVerified },
      { label: 'Seguro', on: u.insuranceVerified }
    )
  }
  return chips.map((c) => ({ ...c, on: Boolean(c.on) }))
})

const statusEntries = computed(() => Object.entries(detail.value?.postedRequests.byStatus || {}))

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('es') : '—'
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('es') : '—'
}

function formatBudget(row) {
  if (row.budget != null) return `$${row.budget.toLocaleString('es')}`
  if (row.minBudget != null && row.maxBudget != null) {
    return `$${row.minBudget.toLocaleString('es')} – $${row.maxBudget.toLocaleString('es')}`
  }
  return '—'
}

async function load() {
  detail.value = null
  error.value = null
  await projectsStore.load()
  project.value = projectsStore.byId(props.id)
  if (!project.value) return
  try {
    detail.value = await projectsApi.userActivity(props.id, props.userId)
  } catch (err) {
    error.value = err.message
  }
}

onMounted(load)
watch(() => [props.id, props.userId], load)
</script>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 1.2rem;
  color: var(--muted);
  font-size: 0.85rem;
}
.back-link:hover { color: var(--text); }

.profile-card {
  display: grid;
  grid-template-columns: auto 1fr minmax(240px, 320px);
  gap: 1.5rem;
  align-items: start;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.avatar-lg {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
.avatar-lg img { width: 100%; height: 100%; object-fit: cover; }

.profile-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}
.profile-title h2 { margin: 0; font-size: 1.3rem; }
.profile-main p { margin: 0.3rem 0 0; }
.profile-bio { font-size: 0.9rem; max-width: 60ch; }

.type-pill {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}
.online-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #4ade80;
}

.chips {
  list-style: none;
  margin: 0.8rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.chips li {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
}
.chips li.chip-on {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.1);
  color: #4ade80;
}
.chips-soft li { background: rgba(255, 255, 255, 0.04); color: var(--text); }

.profile-meta { margin: 0; display: grid; gap: 0.7rem; }
.profile-meta div { display: flex; flex-direction: column; gap: 0.1rem; }
.profile-meta dt { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.profile-meta dd { margin: 0; font-size: 0.9rem; word-break: break-word; }

.card-stack { display: flex; flex-direction: column; gap: 1.2rem; }

.status-summary {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.status-summary li { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; }

.rating { font-weight: 700; color: #facc15; }
.list-note { margin: 0.8rem 0 0; }

@media (max-width: 900px) {
  .profile-card { grid-template-columns: 1fr; }
}
</style>
