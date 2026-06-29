<template>
  <div class="viewshed-page">
    <aside class="viewshed-panel">
      <div class="panel">
        <h3>👁️ 通视分析</h3>
        <p class="hint">点击预置山顶 → 观察从山顶能看到哪些区域</p>
      </div>

      <div class="panel">
        <div class="control-group">
          <label>观察点高度 (高于地面)</label>
          <div class="slider-row">
            <input type="range" v-model.number="observerHeight" min="0" max="200" step="5" />
            <span class="value">{{ observerHeight }} m</span>
          </div>
        </div>
        <div class="control-group">
          <label>分析半径</label>
          <div class="slider-row">
            <input type="range" v-model.number="maxDistance" min="1000" :max="10000" step="500" />
            <span class="value">{{ (maxDistance/1000).toFixed(1) }} km</span>
          </div>
        </div>
        <div class="control-group">
          <label>采样步长</label>
          <div class="slider-row">
            <input type="range" v-model.number="stepSize" min="10" max="500" step="5" />
            <span class="value">{{ stepSize }} m</span>
          </div>
        </div>
        
      </div>

      <div class="panel">
        <span class="label">操作</span>
        <div class="btn-group">
          <button @click="togglePickMode" class="preset-btn" :class="{ active: pickMode }">
            {{ pickMode ? '🖱️ 点击地图选点' : '➕ 点击地图选点' }}
          </button>
          <button @click="clearAnalysis" class="preset-btn btn-danger">🗑️ 清空</button>
        </div>
        <button @click="recompute" class="preset-btn" style="margin-top:6px;width:100%" :disabled="!observerPoint">
          🔄 分析
        </button>
        <p v-if="observerPoint" class="hint" style="margin-top:8px">
          {{ observerPoint.name || `经度${observerPoint.lon.toFixed(2)} 纬度${observerPoint.lat.toFixed(2)}` }}
        </p>
        <p v-if="observerPoint" class="hint">观察高度: {{ observerHeight }}m（高于地面）</p>
        <p v-if="observerPoint && observerPoint.groundHeight !== undefined" class="hint">地面海拔: {{ observerPoint.groundHeight.toFixed(1) }} m</p>
      </div>

      <div class="panel">
        <span class="label">快速预置</span>
        <div class="preset-btns">
          <button v-for="p in presets" :key="p.name" @click="addPresetPoint(p)" class="preset-btn">
            {{ p.name }}
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="info">
          <p>🟢 绿色 = 可见</p>
          <p>🔴 红色 = 被山挡住</p>
          <p>🔵 蓝点 = 观察点位置</p>
          <p>💡 先点预置山，再点🔄分析</p>
        </div>
      </div>
    </aside>

    <div class="map-area">
      <div ref="cesiumContainer" class="cesium-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as Cesium from 'cesium'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesiumContainer = ref(null)
const observerHeight = ref(50)
const maxDistance = ref(5000)
const pickMode = ref(false)
const observerPoint = ref(null)
const stepSize = ref(100)

const presets = [
  { name: '泰山玉皇顶', lon: 117.10, lat: 36.25 },
  { name: '华山南峰', lon: 110.09, lat: 34.49 },
  { name: '黄山天都峰', lon: 118.17, lat: 30.13 },
]
let viewer = null
let clickHandler = null
let observerEntity = null
let viewshedEntities = []

function clearAnalysis() {
  if (observerEntity) {
    viewer.entities.remove(observerEntity)
    observerEntity = null
  }
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities = []
  observerPoint.value = null
}

async function addPresetPoint(preset) {
  clearAnalysis()
  const groundH = await getHeightAtPosition(preset.lon, preset.lat)
  observerPoint.value = { ...preset, groundHeight: groundH }
  createObserverMarker(preset.lon, preset.lat)
  flyToPoint(preset.lon, preset.lat)
}

function recompute() {
  if (!observerPoint.value) return
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities = []
  const p = observerPoint.value
  computeViewshed(p.lon, p.lat)
}

function togglePickMode() {
  pickMode.value = !pickMode.value
  if (pickMode.value) {
    clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    clickHandler.setInputAction(async (click) => {
      const cartesian = viewer.scene.pickPosition(click.position)
      if (!cartesian) return
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
      const lon = Cesium.Math.toDegrees(cartographic.longitude)
      const lat = Cesium.Math.toDegrees(cartographic.latitude)
      
      clearAnalysis()
      const groundH = await getHeightAtPosition(lon, lat)
      observerPoint.value = { lon, lat, name: `经度${lon.toFixed(2)} 纬度${lat.toFixed(2)}`, groundHeight: groundH }
      createObserverMarker(lon, lat)
      pickMode.value = false
      clickHandler.destroy()
      clickHandler = null
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  } else if (clickHandler) {
    clickHandler.destroy()
    clickHandler = null
  }
}

function createObserverMarker(lon, lat) {
  observerEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    point: {
      pixelSize: 12,
      color: Cesium.Color.DODGERBLUE,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  })
}

async function getHeightAtPosition(lon, lat) {
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat, 0)
  const result = await Cesium.sampleTerrain(viewer.terrainProvider, 12, [cartographic])
  return result[0].height || 0
}

async function computeViewshed(centerLon, centerLat) {
  const groundHeight = await getHeightAtPosition(centerLon, centerLat)
  const totalHeight = groundHeight + observerHeight.value
  const steps = Math.floor(360 / 2)

  for (let i = 0; i < steps; i++) {
    const angle = Cesium.Math.toRadians(i * 2)
    await raycastAndDraw(centerLon, centerLat, totalHeight, angle)
  }
}

async function raycastAndDraw(originLon, originLat, originHeight, angle) {
  const step = stepSize.value
  let blocked = false
  let blockLon, blockLat
  let lastVisibleLon = originLon
  let lastVisibleLat = originLat

  const cosLat = Math.cos(Cesium.Math.toRadians(originLat))

  for (let dist = step; dist <= maxDistance.value; dist += step) {
    const dLat = (dist / 111000) * Math.cos(angle)
    const dLon = (dist / (111000 * cosLat)) * Math.sin(angle)
    const checkLon = originLon + dLon
    const checkLat = originLat + dLat

    const terrainH = await getHeightAtPosition(checkLon, checkLat)

    if (terrainH > originHeight) {
      blocked = true
      blockLon = checkLon
      blockLat = checkLat
      break
    }
    lastVisibleLon = checkLon
    lastVisibleLat = checkLat
  }

  const color = blocked ? Cesium.Color.RED.withAlpha(0.6) : Cesium.Color.GREEN.withAlpha(0.6)
  const endLon = blocked ? blockLon : lastVisibleLon
  const endLat = blocked ? blockLat : lastVisibleLat

  const entity = viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([originLon, originLat, endLon, endLat]),
      width: 2,
      material: color,
      clampToGround: true,
    },
  })
  viewshedEntities.push(entity)
}

function flyToPoint(lon, lat) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 15000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
    duration: 2,
  })
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

  viewer.scene.setTerrain(
    new Cesium.Terrain(
      Cesium.CesiumTerrainProvider.fromIonAssetId(1),
    ),
  )

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(117.10, 36.25, 20000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
  })
})

onBeforeUnmount(() => {
  if (clickHandler) clickHandler.destroy()
  if (viewer) viewer.destroy()
})
</script>

<style scoped>
.viewshed-page {
  display: flex;
  height: 100%;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
}

.viewshed-panel {
  width: 280px;
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
  min-width: 60px;
  text-align: right;
}

.preset-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.btn-group {
  display: flex;
  gap: 6px;
}

.preset-btn {
  padding: 6px 12px;
  border: 1px solid #0f3460;
  border-radius: 4px;
  background: #16213e;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  flex: 1;
}

.preset-btn:hover {
  border-color: #e94560;
}

.preset-btn.active {
  background: #e94560;
  border-color: #e94560;
  color: #fff;
}

.preset-btn.btn-danger {
  background: #9c2542;
  border-color: #9c2542;
}

.label {
  font-size: 11px;
  color: #aaa;
  display: block;
}

.info p {
  font-size: 12px;
  margin: 4px 0;
  color: #ccc;
}

.style-toggle {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.style-toggle button {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #0f3460;
  border-radius: 4px;
  background: #16213e;
  color: #aaa;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.style-toggle button.active {
  border-color: #e94560;
  color: #e94560;
  background: #1a1a2e;
}

.map-area {
  flex: 1;
  overflow: hidden;
}

.cesium-container {
  width: 100%;
  height: 100%;
}
</style>