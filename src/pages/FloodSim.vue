<template>
  <div class="flood-page">
    <aside class="flood-panel" :class="{ collapsed }">
      <div class="panel-header">
        <h3>⛰️ 山洪淹没分析</h3>
        <p class="hint">拖动滑块调整水位高度，观察地形淹没情况</p>
      </div>

      <div v-show="!collapsed" class="panel-body">
        <div class="panel">
          <label>水位高度</label>
          <div class="slider-row">
            <input type="range" v-model.number="waterLevel" :min="0" :max="2000" step="10" />
            <span class="value">{{ waterLevel }} m</span>
          </div>
        </div>

        <div class="panel">
          <span class="label">快速设置</span>
          <div class="preset-btns">
            <button v-for="h in [0, 200, 400, 600, 800, 1200, 2000]" :key="h" @click="waterLevel = h" class="preset-btn" :class="{ active: waterLevel === h }">{{ h }}m</button>
          </div>
        </div>

        <div class="panel">
          <span class="label">💧 水源点</span>
          <button @click="toggleSourcePick" class="preset-btn" :class="{ active: sourceMode }" style="width:100%">
            {{ sourceMode ? '🖱️ 点击地图设置水源...' : '🖱️ 点击地图设水源点' }}
          </button>
          <button v-if="sourcePoint" @click="clearSource" class="preset-btn" style="width:100%; margin-top:6px; color:#f87171">
            🗑️ 清除水源点，重新选择
          </button>
          <p v-if="sourcePoint" class="hint" style="margin-top:4px">
            水源: {{ sourcePoint.lon.toFixed(4) }}, {{ sourcePoint.lat.toFixed(4) }}
          </p>
        </div>
      </div>
    </aside>
    <button class="collapse-toggle" @click="collapsed = !collapsed" :title="collapsed ? '展开面板' : '收起面板'">
      {{ collapsed ? '▶' : '◀' }}
    </button>

    <div class="map-area"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as Cesium from 'cesium'
import { GPUFloodSim } from '../utils/gpuFloodSim.js'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useViewerStore } from '../stores/viewerStore.js'

const store = useScenarioStore()
const viewerStore = useViewerStore()

const collapsed = ref(false)
const waterLevel = ref(100)
const sourceMode = ref(false)
const sourcePoint = ref(null)

let viewer = null
let sourcePickHandler = null
let sourceMarker = null
let gpuSim = null

function updateWater() {
  if (!gpuSim || !sourcePoint.value) return
  gpuSim.setSourcePoint(sourcePoint.value.lon, sourcePoint.value.lat, waterLevel.value)
  store.setFloodLevel(waterLevel.value, sourcePoint.value)
}

watch(waterLevel, updateWater)

function toggleSourcePick() {
  sourceMode.value = !sourceMode.value
  if (sourceMode.value) {
    sourcePickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    sourcePickHandler.setInputAction((click) => {
      const cartesian = viewer.scene.pickPosition(click.position)
      if (!cartesian) return
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
      const lon = Cesium.Math.toDegrees(cartographic.longitude)
      const lat = Cesium.Math.toDegrees(cartographic.latitude)
      const h = cartographic.height
      sourcePoint.value = { lon, lat }
      store.setFloodLevel(waterLevel.value, { lon, lat })
      sourceMode.value = false
      sourcePickHandler.destroy()
      sourcePickHandler = null

      if (sourceMarker) viewer.entities.remove(sourceMarker)
      sourceMarker = viewer.entities.add({
        position: cartesian,
        point: { pixelSize: 12, color: Cesium.Color.CYAN, outlineColor: Cesium.Color.WHITE, outlineWidth: 2, heightReference: Cesium.HeightReference.NONE },
        label: { text: '💧水源', font: '14px sans-serif', fillColor: Cesium.Color.CYAN, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -14) },
      })

      const alt = Math.max(h + 5000, 8000)
      const hDist = (alt - h) / Math.tan(Cesium.Math.toRadians(60))
      const offsetLat = hDist / 111000
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat - offsetLat, alt),
        orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-60), roll: 0 },
        duration: 1.5,
      })
      scheduleFloodCompute()
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  } else if (sourcePickHandler) {
    sourcePickHandler.destroy()
    sourcePickHandler = null
  }
}

function clearSource() {
  if (gpuSim) {
    gpuSim.destroy()
    gpuSim = null
  }
  if (sourceMarker) {
    viewer.entities.remove(sourceMarker)
    sourceMarker = null
  }
  sourcePoint.value = null
  sourceMode.value = false
  if (sourcePickHandler) {
    sourcePickHandler.destroy()
    sourcePickHandler = null
  }
}

async function initGPUSim() {
  if (!sourcePoint.value) return
  if (gpuSim) {
    gpuSim.destroy()
  }
  gpuSim = new GPUFloodSim(viewer)
  await gpuSim.init(sourcePoint.value.lon, sourcePoint.value.lat, 0.05)
  gpuSim.setSourcePoint(sourcePoint.value.lon, sourcePoint.value.lat, waterLevel.value)
  gpuSim.startSimulation()
}

function scheduleFloodCompute() {
  initGPUSim()
}

onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return

  viewer.scene.setTerrain(
    new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromIonAssetId(1))
  )

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(115.98, 40.03, 15000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
  })
})

onBeforeUnmount(() => {
  if (gpuSim) gpuSim.destroy()
  if (viewer) {
    if (sourceMarker) viewer.entities.remove(sourceMarker)
    if (sourcePickHandler) sourcePickHandler.destroy()
  }
  viewer = null
})
</script>

<style scoped>
.flood-page {
  position: relative;
  width: 100%;
  height: 100%;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: transparent;
  color: #2a3d40;
  overflow: hidden;
}

.flood-panel {
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: 260px;
  z-index: 100;
  overflow: hidden;
  padding: 0;
  background: rgba(254, 252, 245, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(45, 138, 78, 0.12);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.flood-panel.collapsed {
  left: -260px;
  box-shadow: none;
}
.flood-panel.collapsed ~ .collapse-toggle {
  left: 12px;
}
.flood-panel::-webkit-scrollbar { width: 4px; }
.flood-panel::-webkit-scrollbar-thumb { background: rgba(45, 138, 78, 0.2); border-radius: 2px; }

.panel-header {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
  flex-shrink: 0;
}
.panel-header h3 {
  font-size: 14px;
  color: #2d8a4e;
  margin: 0 0 2px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.panel-header .hint {
  font-size: 10px;
  color: #8b7e6a;
  margin: 1px 0;
}

.panel-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}

.panel {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  padding: 10px;
  margin: 10px 12px;
  border: 1px solid rgba(45, 138, 78, 0.08);
}
.panel:first-of-type {
  margin-top: 14px;
}
.panel:last-of-type {
  margin-bottom: 14px;
}

.panel h3 {
  font-size: 13px;
  color: #2d8a4e;
  margin-bottom: 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
}

.hint {
  font-size: 11px;
  color: #8b7e6a;
  margin: 0;
}

.control-group {
  margin-bottom: 12px;
}
.control-group:last-child {
  margin-bottom: 0;
}

.control-group label {
  font-size: 12px;
  color: #6b5e4a;
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slider-row input[type="range"] {
  flex: 1;
  accent-color: #f59e0b;
  height: 4px;
}

.value {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.preset-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.preset-btn {
  padding: 4px 10px;
  border: 1px solid rgba(45, 138, 78, 0.2);
  border-radius: 6px;
  background: rgba(45, 138, 78, 0.06);
  color: #3d3929;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  font-weight: 500;
}
.preset-btn:hover {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}
.preset-btn.active {
  background: #2d8a4e;
  border-color: #2d8a4e;
  color: #fff;
}

.label {
  font-size: 11px;
  color: #8b7e6a;
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.info p {
  font-size: 11px;
  color: #8b7e6a;
  margin: 2px 0;
}

.collapse-toggle {
  position: absolute;
  left: 272px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 110;
  width: 22px;
  height: 48px;
  border: none;
  background: rgba(254, 252, 245, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(45, 138, 78, 0.15);
  border-left: none;
  border-radius: 0 8px 8px 0;
  color: #2d8a4e;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
}
.collapse-toggle:hover {
  background: rgba(254, 252, 245, 0.95);
  color: #1a6b35;
}
.flood-panel.collapsed ~ .collapse-toggle {
  left: 12px;
}

.map-area {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.cesium-container {
  width: 100%;
  height: 100%;
}

.cesium-container :deep(.cesium-viewer),
.cesium-container :deep(.cesium-widget),
.cesium-container :deep(.cesium-viewer canvas) {
  width: 100% !important;
  height: 100% !important;
}
</style>