<template>
  <div class="flood-page">
    <aside class="flood-panel">
      <div class="panel">
        <h3>🌊 洪水淹没模拟</h3>
        <p class="hint">拖动滑块调整水位高度，观察地形淹没情况</p>
      </div>

      <div class="panel">
        <div class="control-group">
          <label>水位高度</label>
          <div class="slider-row">
            <input type="range" v-model.number="waterLevel" :min="0" :max="2000" step="10" />
            <span class="value">{{ waterLevel }} m</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <span class="label">快速设置</span>
        <div class="preset-btns">
          <button v-for="h in [0, 200, 400, 600, 800, 1200, 2000]" :key="h" @click="waterLevel = h" class="preset-btn" :class="{ active: waterLevel === h }">{{ h }}m</button>
        </div>
      </div>

      <div class="panel">
        <span class="label">视角控制</span>
        <button @click="setView('top')" class="preset-btn" :class="{ active: currentView === 'top' }">🔝 俯视</button>
        <button @click="setView('side')" class="preset-btn" :class="{ active: currentView === 'side' }">👀 侧面</button>
        <button @click="setView('angle')" class="preset-btn" :class="{ active: currentView === 'angle' }">📐 斜45°</button>
        <p class="hint" style="margin-top:6px">💡 按住 Ctrl + 拖拽鼠标 = 旋转视角</p>
      </div>

      <div class="panel">
        <span class="label">💧 水源点</span>
        <button @click="toggleSourcePick" class="preset-btn" :class="{ active: sourceMode }" style="width:100%">
          {{ sourceMode ? '🖱️ 点击地图设置水源...' : '🖱️ 点击地图设水源点' }}
        </button>
        <p v-if="sourcePoint" class="hint" style="margin-top:4px">
          水源: {{ sourcePoint.lon.toFixed(4) }}, {{ sourcePoint.lat.toFixed(4) }}
        </p>
      </div>

      <div class="panel">
        <div class="info">
          <p>📍 {{ currentLocation }}</p>
          <p>⛰️ 地形已加载</p>
          <p>💡 点击「侧面」看山谷被淹</p>
        </div>
      </div>
    </aside>

    <div class="map-area">
      <div ref="cesiumContainer" class="cesium-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as Cesium from 'cesium'
import { GPUFloodSim } from '../utils/gpuFloodSim.js'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesiumContainer = ref(null)
const waterLevel = ref(100)
const currentView = ref('top')
const currentLocation = ref('门头沟山区')
const sourceMode = ref(false)
const sourcePoint = ref(null)

let viewer = null
let sourcePickHandler = null
let sourceMarker = null
let gpuSim = null

function updateWater() {
  if (!gpuSim || !sourcePoint.value) return
  gpuSim.setSourcePoint(sourcePoint.value.lon, sourcePoint.value.lat, waterLevel.value)
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
      currentLocation.value = `经度${lon.toFixed(4)} 纬度${lat.toFixed(4)}`
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

function setView(mode) {
  currentView.value = mode
  const center = sourcePoint.value || { lon: 115.98, lat: 40.03 }
  const views = {
    top:   { destination: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 15000), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 } },
    side:  { destination: Cesium.Cartesian3.fromDegrees(center.lon - 0.02, center.lat, 10000), orientation: { heading: Cesium.Math.toRadians(90), pitch: Cesium.Math.toRadians(-30), roll: 0 } },
    angle: { destination: Cesium.Cartesian3.fromDegrees(center.lon - 0.015, center.lat - 0.01, 12000), orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-45), roll: 0 } },
  }
  viewer.camera.flyTo(views[mode])
}

onMounted(() => {
  // 1. 创建 Viewer
  viewer = new Cesium.Viewer(cesiumContainer.value, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
  })

  // 2. 设置地形
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.setTerrain(
    new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromIonAssetId(1))
  )

  // 3. 设置初始视角
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(115.98, 40.03, 2000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
  })
})

onBeforeUnmount(() => {
  if (gpuSim) gpuSim.destroy()
  if (sourceMarker) viewer.entities.remove(sourceMarker)
  if (sourcePickHandler) sourcePickHandler.destroy()
  if (viewer) viewer.destroy()
})
</script>

<style scoped>
.flood-page {
  display: flex;
  height: 100%;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
}

.flood-panel {
  width: 260px;
  overflow-y: auto;
  padding: 10px;
  background: #16213e;
  border-right: 1px solid #0f3460;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #0f3460;
}

.panel h3 {
  font-size: 13px;
  color: #e94560;
  margin-bottom: 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid #0f3460;
}

.hint {
  font-size: 11px;
  color: #888;
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
  color: #aaa;
  display: block;
  margin-bottom: 4px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-row input[type="range"] {
  flex: 1;
  accent-color: #e94560;
  height: 4px;
}

.value {
  font-size: 12px;
  color: #e94560;
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
  border: 1px solid #0f3460;
  border-radius: 4px;
  background: #16213e;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.preset-btn:hover {
  border-color: #e94560;
}

.preset-btn.active {
  background: #e94560;
  border-color: #e94560;
  color: #fff;
}

.label {
  font-size: 11px;
  color: #888;
  display: block;
  margin-bottom: 4px;
}

.info p {
  font-size: 11px;
  color: #888;
  margin: 2px 0;
}

.map-area {
  flex: 1;
  min-width: 0;
  position: relative;
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