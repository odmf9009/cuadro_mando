<template>
  <header class="mobile-bar">
    <BrandMark :size="28" />
    <span class="mobile-title">{{ title || 'Cuadro de mando' }}</span>
    <button type="button" class="icon-button" aria-label="Abrir menú" :aria-expanded="open" @click="open = true">
      <AppIcon name="menu" :size="20" />
    </button>
  </header>

  <Teleport to="body">
    <div v-if="open" class="sheet" role="dialog" aria-modal="true" aria-label="Navegación">
      <div class="sheet-head">
        <span class="brand">
          <BrandMark :size="32" />
          <span class="brand-text">
            <span class="brand-name">Cuadro de mando</span>
            <span class="brand-scope">Ventures FL Studio</span>
          </span>
        </span>
        <button type="button" class="icon-button" aria-label="Cerrar menú" @click="open = false">
          <AppIcon name="close" :size="20" />
        </button>
      </div>
      <SidebarNav @navigate="open = false" />
      <SidebarFoot />
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import BrandMark from '../base/BrandMark.vue'
import AppIcon from '../base/AppIcon.vue'
import SidebarNav from './SidebarNav.vue'
import SidebarFoot from './SidebarFoot.vue'

// Barra superior de 52 px del móvil: la navegación se pliega en una hoja a pantalla completa.
defineProps({ title: { type: String, default: '' } })

const open = ref(false)
watch(open, (v) => document.body.style.setProperty('overflow', v ? 'hidden' : ''))
onBeforeUnmount(() => document.body.style.removeProperty('overflow'))
</script>

<style scoped>
.mobile-title { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
