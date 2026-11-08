<template>
  <nav class="nav" aria-label="Principal">
    <RouterLink to="/" class="nav-link" :class="{ active: route.name === 'overview' }" @click="$emit('navigate')">
      <AppIcon name="grid" />
      Resumen
    </RouterLink>

    <div class="nav-label">Apps</div>
    <template v-if="!projectsStore.loaded">
      <div v-for="n in 6" :key="`nav-sk-${n}`" class="nav-link">
        <SkeletonBlock width="20px" height="20px" radius="6px" />
        <SkeletonBlock :width="`${45 + ((n * 13) % 30)}%`" height="0.85rem" />
      </div>
    </template>
    <RouterLink
      v-for="p in projectsStore.items"
      :key="p.id"
      :to="`/project/${p.id}`"
      class="nav-link"
      :class="{ active: currentProjectId === p.id }"
      @click="$emit('navigate')"
    >
      <AppMark :name="p.name" :color="p.color" :size="20" />
      {{ p.name }}
    </RouterLink>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectsStore } from '../../stores/projects'
import AppIcon from '../base/AppIcon.vue'
import AppMark from '../base/AppMark.vue'
import SkeletonBlock from '../base/SkeletonBlock.vue'

// Lista de destinos (otras pantallas, nunca anclas de la actual). Se usa en la barra lateral y
// en la hoja de navegación del móvil. "navigate" avisa al padre para cerrar la hoja.
defineEmits(['navigate'])

const projectsStore = useProjectsStore()
const route = useRoute()
// El proyecto activo también lo es en sus subrutas (ficha de usuario).
const currentProjectId = computed(() => route.params.id || null)
</script>
