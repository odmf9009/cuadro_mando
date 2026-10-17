<template>
  <AppLayout heading="Resumen general" subheading="Vista consolidada de todos tus proyectos">
    <section class="kpi-row">
      <StatCard label="Usuarios totales" :value="summary.totalUsers" :loading="loading" />
      <StatCard label="Proyectos conectados" :value="`${summary.connectedCount} / ${summary.totalProjects}`" :loading="loading" />
      <StatCard label="Suscripciones activas" :value="summary.activeSubscriptions" :loading="loading" />
    </section>

    <section class="project-grid">
      <template v-if="projectsStore.items.length">
        <ProjectCard
          v-for="project in projectsStore.items"
          :key="project.id"
          :project="project"
          :stats="stats[project.id]"
          :loading="loading"
        />
      </template>
      <template v-else>
        <ProjectCard v-for="n in 6" :key="`placeholder-${n}`" :project="placeholder" loading />
      </template>
    </section>
  </AppLayout>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import AppLayout from '../components/layout/AppLayout.vue'
import StatCard from '../components/base/StatCard.vue'
import ProjectCard from '../components/ProjectCard.vue'
import { useProjectsStore } from '../stores/projects'
import { projectsApi } from '../api/projects'

const projectsStore = useProjectsStore()
const stats = reactive({})
const summary = reactive({ totalUsers: 0, connectedCount: 0, totalProjects: 0, activeSubscriptions: 0 })
const loading = ref(true)

// Tarjeta vacia que se muestra hasta que llega el registro de proyectos.
const placeholder = { id: 'placeholder', name: '', description: '', color: '#232c42', capabilities: {} }

onMounted(async () => {
  // El registro (rapido) y las estadisticas (lentas: consultan cada BD) se
  // piden a la vez, no una detras de otra.
  const registry = projectsStore.load()
  try {
    const data = await projectsApi.overview()
    await registry
    Object.assign(stats, data.stats)
    Object.assign(summary, data.summary)
  } catch (err) {
    await registry.catch(() => {})
    for (const p of projectsStore.items) stats[p.id] = { connected: false, error: err.message }
  } finally {
    loading.value = false
  }
})
</script>
