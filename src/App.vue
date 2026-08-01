<template>
  <div id="app">
    <div class="bg-orbs" v-show="!hideNav">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>
    <div ref="cesiumContainer" class="globe-container" v-show="!hideNav"></div>
    <MapControls v-show="!hideNav" />
    <LayerManager v-show="!hideNav" :viewer="viewerStore.viewer" />
    <div class="nav-wrapper" :class="{ collapsed: navCollapsed }" v-show="!hideNav">
      <nav class="top-nav">
        <div class="nav-dock">
          <span class="nav-brand">山地灾害监测</span>
          <span v-if="store.hasData" class="pipeline-dots">
            <span class="pipe-dot" :class="{ on: store.moduleStatus.earthquake }" title="地震监测">①</span>
            <span class="pipe-arrow">→</span>
            <span class="pipe-dot" :class="{ on: store.moduleStatus.dataImport }" title="数据接入">②</span>
            <span class="pipe-arrow">→</span>
            <span class="pipe-dot" :class="{ on: store.moduleStatus.viewshed }" title="监测选址">③</span>
            <span class="pipe-arrow">→</span>
            <span class="pipe-dot" :class="{ on: store.moduleStatus.flood }" title="山洪分析">④</span>
            <span class="pipe-arrow">→</span>
            <span class="pipe-dot" :class="{ on: store.moduleStatus.dispatch }" title="应急调度">⑤</span>
          </span>
          <span class="nav-sep"></span>
          <router-link to="/earthquake" class="nav-link">
            <span class="nav-icon">🌋</span>
            <span class="nav-label">地震监测</span>
          </router-link>
          <router-link to="/data-import" class="nav-link">
            <span class="nav-icon">📡</span>
            <span class="nav-label">数据接入</span>
          </router-link>
          <router-link to="/viewshed" class="nav-link">
            <span class="nav-icon">🔭</span>
            <span class="nav-label">监测选址</span>
          </router-link>
          <router-link to="/flood" class="nav-link">
            <span class="nav-icon">⛰️</span>
            <span class="nav-label">山洪分析</span>
          </router-link>
          <router-link to="/multi-vehicle" class="nav-link">
            <span class="nav-icon">🚑</span>
            <span class="nav-label">应急调度</span>
          </router-link>
          <span class="nav-sep"></span>
          <router-link to="/dashboard" class="nav-link">
            <span class="nav-icon">📊</span>
            <span class="nav-label">大屏展示</span>
          </router-link>
          <span class="nav-sep"></span>
          <router-link to="/bigscreen" class="nav-link">
            <span class="nav-icon">🖥️</span>
            <span class="nav-label">暗色大屏</span>
          </router-link>
        </div>
      </nav>
      <button class="nav-toggle" @click="navCollapsed = !navCollapsed" :title="navCollapsed ? '展开导航' : '收起导航'">
        {{ navCollapsed ? '▼' : '▲' }}
      </button>
    </div>
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
import { useScenarioStore } from './stores/scenarioStore.js'
import { useViewerStore } from './stores/viewerStore.js'
import MapControls from './components/MapControls.vue'
import LayerManager from './components/LayerManager.vue'
import { useSiteMarkers } from './composables/useSiteMarkers.js'

const route = useRoute()
const navCollapsed = ref(false)
const hideNav = computed(() => route.meta.plain)
const store = useScenarioStore()
const viewerStore = useViewerStore()
const { clearAll } = useSiteMarkers()
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

.top-nav {
  display: flex; gap: 10px; padding: 14px 24px 6px;
  justify-content: center; flex-shrink: 0;
  position: relative;
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.nav-wrapper {
  z-index: 1000; position: relative; flex-shrink: 0;
  transition: all 0.35s ease;
}
.nav-wrapper.collapsed {
  height: 0; overflow: visible; flex-shrink: 0;
}
.nav-wrapper.collapsed .top-nav {
  opacity: 0; transform: translateY(-20px); pointer-events: none;
}

.nav-toggle {
  position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%);
  width: 32px; height: 24px;
  border-radius: 0 0 12px 12px;
  border: 1px solid rgba(255,255,255,0.25);
  border-top: none;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: rgba(255,255,255,0.7);
  font-size: 11px; cursor: pointer;
  transition: all 0.3s ease;
  line-height: 1; z-index: 1001;
}
.nav-wrapper.collapsed .nav-toggle {
  bottom: auto; top: 0; border-radius: 0 0 12px 12px; border-top: 1px solid rgba(255,255,255,0.25);
}
.nav-toggle:hover {
  background: rgba(255,255,255,0.22);
  color: #fff;
}

.nav-dock {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.nav-brand {
  font-size: 13px; font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  padding: 0 8px 0 4px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.nav-sep {
  width: 1px; height: 20px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 1px;
  margin: 0 2px;
}

.pipeline-dots {
  display: flex; align-items: center; gap: 2px;
  padding: 0 4px;
}
.pipe-dot {
  font-size: 10px; width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.25);
  transition: all 0.4s ease;
}
.pipe-dot.on {
  background: rgba(45, 138, 78, 0.7);
  color: #fff;
  box-shadow: 0 0 8px rgba(45, 138, 78, 0.4);
}
.pipe-arrow {
  font-size: 9px; color: rgba(255,255,255,0.2);
}

.nav-link {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  color: rgba(220, 235, 225, 0.9);
  text-decoration: none;
  font-size: 13px; font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
}
.nav-icon { font-size: 15px; }
.nav-label { margin-left: 6px; }

.nav-link:hover {
  background: rgba(255, 255, 255, 0.28);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(255, 255, 255, 0.08);
  color: #fff;
  transform: translateY(-2px);
}

.nav-link.router-link-active {
  background: rgba(45, 138, 78, 0.85);
  color: #fff;
  border-color: rgba(45, 138, 78, 0.6);
  box-shadow: 0 4px 24px rgba(45, 138, 78, 0.3), 0 0 0 4px rgba(45, 138, 78, 0.12);
  font-weight: 600;
  animation: nav-pulse 2.5s ease-in-out infinite;
}
@keyframes nav-pulse {
  0%, 100% { box-shadow: 0 4px 24px rgba(45, 138, 78, 0.3), 0 0 0 4px rgba(45, 138, 78, 0.12); }
  50% { box-shadow: 0 4px 28px rgba(45, 138, 78, 0.45), 0 0 0 8px rgba(45, 138, 78, 0.06); }
}

.router-view { flex: 1; overflow: hidden; position: relative; z-index: 1; pointer-events: none; }
.router-view-interactive { pointer-events: auto; }

.globe-container {
  position: fixed; inset: 0; z-index: 0;
  width: 100vw; height: 100vh;
}

</style>