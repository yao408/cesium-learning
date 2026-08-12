<template>
  <div id="app">
    <div class="bg-orbs" v-show="!hideNav">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>
    <div ref="cesiumContainer" class="globe-container" v-show="!hideNav"></div>
    <MapControls v-show="!hideNav" />
    <div class="router-view" :class="{ 'router-view-interactive': hideNav }">
      <router-view v-slot="{ Component }">
        <KeepAlive include="Dashboard">
          <component :is="Component" />
        </KeepAlive>
      </router-view>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useViewerStore } from './stores/viewerStore.js'
import MapControls from './components/MapControls.vue'

const route = useRoute()
const hideNav = computed(() => route.meta.plain)
const viewerStore = useViewerStore()
const cesiumContainer = ref(null)

onMounted(() => {
  viewerStore.init(cesiumContainer.value)
})
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
#app {
  display: flex; flex-direction: column; height: 100vh;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: transparent;
  color: #d8e0d8;
  position: relative;
}

.bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.orb {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35;
}
.orb-1 { width: 400px; height: 400px; background: rgba(120, 200, 140, 0.15); top: -120px; right: -80px; }
.orb-2 { width: 300px; height: 300px; background: rgba(200, 170, 100, 0.1); bottom: -60px; left: -60px; }
.orb-3 { width: 250px; height: 250px; background: rgba(100, 180, 120, 0.12); top: 40%; left: 50%; }

.router-view { flex: 1; overflow: hidden; position: relative; z-index: 1; pointer-events: none; }
.router-view-interactive { pointer-events: auto; }

.globe-container {
  position: fixed; inset: 0; z-index: 0;
  width: 100vw; height: 100vh;
}

</style>