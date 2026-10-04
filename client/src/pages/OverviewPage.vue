<template>
  <AppLayout heading="Resumen general" subheading="Vista consolidada de todos tus proyectos">
    <section class="kpi-row">
      <StatCard label="Usuarios totales" :value="summary.totalUsers" />
      <StatCard label="Proyectos conectados" :value="`${summary.connectedCount} / ${summary.totalProjects}`" />
      <StatCard label="Suscripciones activas" :value="summary.activeSubscriptions" />
    </section>

    <section class="project-grid">
      <ProjectCard
        v-for="project in projectsStore.items"
        :key="project.id"
        :project="project"
        :stats="stats[project.id]"
      />
    </section>
  </AppLayout>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import AppLayout from '../components/layout/AppLayout.vue'
import StatCard from '../components/base/StatCard.vue'
import ProjectCard from '../components/ProjectCard.vue'
import { useProjectsStore } from '../stores/projects'
import { projectsApi } from '../api/projects'

const projectsStore = useProjectsStore()
const stats = reactive({})
const summary = reactive({ totalUsers: 0, connectedCount: 0, totalProjects: 0, activeSubscriptions: 0 })

onMounted(async () => {
  await projectsStore.load()
  const data = await projectsApi.overview()
  Object.assign(stats, data.stats)
  Object.assign(summary, data.summary)
})
</script>
