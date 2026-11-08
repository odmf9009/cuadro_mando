<template>
  <aside class="sidebar">
    <RouterLink to="/" class="brand" aria-label="Cuadro de mando, ir al resumen">
      <BrandMark :size="32" />
      <span class="brand-text">
        <span class="brand-name">Cuadro de mando</span>
        <span class="brand-scope">Ventures FL Studio</span>
      </span>
    </RouterLink>

    <SidebarNav />
    <SidebarFoot />
  </aside>
</template>

<script setup>
import BrandMark from '../base/BrandMark.vue'
import SidebarNav from './SidebarNav.vue'
import SidebarFoot from './SidebarFoot.vue'

// Barra lateral sobre el fondo de la página (sin color ni borde). La marca nombra el producto y su
// ámbito (el estudio). En móvil se oculta y su contenido sale en la hoja de MobileBar.
</script>
