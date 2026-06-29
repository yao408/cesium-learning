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

        <div class="control-group">
          <label>透明度</label>
          <div class="slider-row">
            <input type="range" v-model.number="waterOpacity" min="0.1" max="0.8" step="0.05" />
            <span class="value">{{ Math.round(waterOpacity * 100) }}%</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <span class="label">快速设置</span>
        <div class="preset-btns">
          <button v-for="h in [0, 50, 100, 200, 500, 1000, 2000]" :key="h" @click="waterLevel = h" class="preset-btn" :class="{ active: waterLevel === h }">{{ h }}m</button>
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
        <span class="label">📍 淹没位置</span>
        <div class="preset-btns">
          <button v-for="city in cityPresets" :key="city.name" @click="moveToLocation(city.lon, city.lat, city.name)" class="preset-btn" :class="{ active: currentLocation === city.name }">{{ city.name }}</button>
        </div>
        <button @click="toggleMapPick" class="preset-btn" :class="{ active: pickMode }" style="margin-top:6px;width:100%">
          {{ pickMode ? '🖱️ 点击地图放置中...' : '🖱️ 点击地图选位置' }}
        </button>
      </div>

      <div class="panel">
        <div class="info">
          <p>📍 {{ currentLocation }}</p>
          <p>⛰️ 地形已加载</p>
          <p>💡 点「侧面」看山谷被淹</p>
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

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesiumContainer = ref(null)
const waterLevel = ref(200)
const waterOpacity = ref(0.5)
const currentView = ref('top')
const currentLocation = ref('门头沟山区')
const pickMode = ref(false)

const cityPresets = [
  { name: '北京', lon: 116.40, lat: 39.91, size: 20000 },
  { name: '三峡', lon: 111.00, lat: 30.80, size: 30000 },
  { name: '黄果树', lon: 105.65, lat: 25.98, size: 15000 },
  { name: '泰山', lon: 117.10, lat: 36.25, size: 10000 },
  { name: '华山', lon: 110.09, lat: 34.49, size: 8000 },
  { name: '珠峰', lon: 86.92, lat: 27.98, size: 300000 },
]

let viewer = null
let waterPolygon = null
let clickHandler = null

// 北京门头沟山区（有地形起伏）
const DEFAULT_AREA = [
  115.90, 40.10,
  116.05, 40.10,
  116.05, 39.95,
  115.90, 39.95,
]

function createWaterPolygon(coords) {
  if (waterPolygon) viewer.entities.remove(waterPolygon)
  const area = coords || DEFAULT_AREA
  waterPolygon = viewer.entities.add({
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(area),
      height: waterLevel.value,
      material: Cesium.Color.DEEPSKYBLUE.withAlpha(waterOpacity.value),
      outline: true,
      outlineColor: Cesium.Color.CYAN.withAlpha(0.8),
      outlineWidth: 2,
      perPositionHeight: false,
    },
  })
}

function updateWater() {
  if (!waterPolygon) return
  waterPolygon.polygon.height = waterLevel.value
  waterPolygon.polygon.material = Cesium.Color.DEEPSKYBLUE.withAlpha(waterOpacity.value)
}

watch(waterLevel, updateWater)
watch(waterOpacity, updateWater)

function moveToLocation(lon, lat, name) {
  currentLocation.value = name
  const size = 0.08
  const coords = [lon - size, lat + size, lon + size, lat + size, lon + size, lat - size, lon - size, lat - size]
  createWaterPolygon(coords)
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 20000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
  })
}

function toggleMapPick() {
  pickMode.value = !pickMode.value
  if (pickMode.value) {
    clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    clickHandler.setInputAction((click) => {
      const cartesian = viewer.scene.pickPosition(click.position)
      if (!cartesian) return
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
      const lon = Cesium.Math.toDegrees(cartographic.longitude)
      const lat = Cesium.Math.toDegrees(cartographic.latitude)
      moveToLocation(lon, lat, `经度${lon.toFixed(2)} 纬度${lat.toFixed(2)}`)
      pickMode.value = false
      clickHandler.destroy()
      clickHandler = null
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  } else if (clickHandler) {
    clickHandler.destroy()
    clickHandler = null
  }
}

function setView(mode, centerLon, centerLat) {
  currentView.value = mode
  const views = {
    top:   { destination: Cesium.Cartesian3.fromDegrees(116.40, 39.91, 15000), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 } },
    side:  { destination: Cesium.Cartesian3.fromDegrees(116.20, 39.91, 10000), orientation: { heading: Cesium.Math.toRadians(90), pitch: Cesium.Math.toRadians(-30), roll: 0 } },
    angle: { destination: Cesium.Cartesian3.fromDegrees(116.25, 39.85, 12000), orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-45), roll: 0 } },
  }
  viewer.camera.flyTo(views[mode])
}

onMounted(() => {
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

  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100

  // 官方推荐写法：异步加载地形
  viewer.scene.setTerrain(
    new Cesium.Terrain(
      Cesium.CesiumTerrainProvider.fromIonAssetId(1),
    ),
  )

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(115.98, 40.03, 30000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
  })

  createWaterPolygon()
})

onBeforeUnmount(() => {
  if (clickHandler) clickHandler.destroy()
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