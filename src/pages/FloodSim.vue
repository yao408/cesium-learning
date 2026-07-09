<template>
  <div class="flood-page">
    <aside class="flood-panel" :class="{ collapsed }">
      <div class="panel-header">
        <h3>⛰️ 山洪淹没分析</h3>
        <p class="hint">设置水源点和洪水参数，模拟淹没范围</p>
      </div>

      <div v-show="!collapsed" class="panel-body">
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

        <div class="panel">
          <div class="control-group">
            <label>洪水总量（万m³）</label>
            <input type="number" v-model.number="floodVolume" :min="1" :max="10000" step="10" class="num-input" />
            <p class="hint">一共涌出多少水，决定最终淹没范围</p>
          </div>
        </div>

        <div class="panel">
          <div class="control-group">
            <label>出水速度</label>
            <select v-model="flowSpeed" class="select-input">
              <option value="slow">缓慢（50 m³/s）</option>
              <option value="medium">中等（200 m³/s）</option>
              <option value="fast">凶猛（500 m³/s）</option>
              <option value="extreme">极快（1000 m³/s）</option>
            </select>
            <p class="hint">水涌出的速度，决定洪水到达时间</p>
          </div>
        </div>

        <div class="panel">
          <button @click="startSimulation" class="sim-btn" :disabled="!sourcePoint || simulating">
            {{ simulating ? `⏳ 模拟中... ${simElapsed}/${SIM_MAX_DURATION}s` : '🚀 开始模拟' }}
          </button>
          <button v-if="simulating" @click="stopSimulation" class="sim-btn stop" style="margin-top:6px">
            ⏹ 停止模拟，查看结果
          </button>
          <p v-if="simulating" class="hint" style="margin:6px 0 0;text-align:center">系统会在 30 秒后自动停止</p>
        </div>

        <div v-if="simResults" class="panel results-panel">
          <h3>📊 模拟结果</h3>
          <div class="result-grid">
            <div class="result-item">
              <span class="result-val">{{ simResults.area }}</span>
              <span class="result-label">淹没面积 km²</span>
            </div>
            <div class="result-item">
              <span class="result-val">{{ simResults.maxDepth }}</span>
              <span class="result-label">最大水深 m</span>
            </div>
            <div class="result-item">
              <span class="result-val">{{ simResults.affectedVillages }}</span>
              <span class="result-label">受影响村庄 个</span>
            </div>
          </div>
          <div v-if="simResults.villageList.length" class="village-table">
            <table>
              <thead>
                <tr><th>村庄</th><th>距离</th><th>水深</th></tr>
              </thead>
              <tbody>
                <tr v-for="v in simResults.villageList" :key="v.name">
                  <td>{{ v.name }}</td>
                  <td>{{ v.dist }}km</td>
                  <td :class="{ danger: v.depth > 0.5 }">{{ v.depth > 0.01 ? v.depth + 'm' : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
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
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import * as Cesium from 'cesium'
import { GPUFloodSim } from '../utils/gpuFloodSim.js'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useViewerStore } from '../stores/viewerStore.js'
import { haversineDistance } from '../utils/geo.js'

const store = useScenarioStore()
const viewerStore = useViewerStore()

const collapsed = ref(false)
const sourceMode = ref(false)
const sourcePoint = ref(null)
const floodVolume = ref(store.floodVolume || 100)
const flowSpeed = ref(store.flowSpeed || 'medium')
const simulating = ref(false)
const simResults = ref(null)
const simElapsed = ref(0)
const SIM_MAX_DURATION = 30

const SPEED_MAP = { slow: 0.05, medium: 0.1, fast: 0.2, extreme: 0.4 }

let viewer = null
let sourcePickHandler = null
let sourceMarker = null
let gpuSim = null
let floodBoundaryTimer = null
let autoStopTimer = null
let simStartTime = 0
let floodPolyEntity = null
let siteMarkers = []
let _siteSyncHandler = null

watch([floodVolume, flowSpeed], () => {
  if (gpuSim && sourcePoint.value) {
    const waterAmount = floodVolume.value * 0.5
    gpuSim.setFlowRate(SPEED_MAP[flowSpeed.value])
    gpuSim.setSourcePoint(sourcePoint.value.lon, sourcePoint.value.lat, waterAmount)
    store.setFloodLevel(waterAmount, sourcePoint.value)
    store.setFloodParams(floodVolume.value, flowSpeed.value)
  }
})

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
      store.setFloodLevel(floodVolume.value / 10, { lon, lat })
      store.setFloodParams(floodVolume.value, flowSpeed.value)
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
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  } else if (sourcePickHandler) {
    sourcePickHandler.destroy()
    sourcePickHandler = null
  }
}

function clearSource() {
  stopSimulation()
  if (gpuSim) {
    gpuSim.destroy()
    gpuSim = null
  }
  if (sourceMarker) {
    viewer.entities.remove(sourceMarker)
    sourceMarker = null
  }
  if (floodPolyEntity) {
    viewer.entities.remove(floodPolyEntity)
    floodPolyEntity = null
  }
  sourcePoint.value = null
  sourceMode.value = false
  simResults.value = null
  simElapsed.value = 0
  if (sourcePickHandler) {
    sourcePickHandler.destroy()
    sourcePickHandler = null
  }
  store.setFloodPolygon([])
  store.setFloodResults(null)
}

async function initGPUSim() {
  if (!sourcePoint.value) return
  if (gpuSim) {
    gpuSim.destroy()
  }
  gpuSim = new GPUFloodSim(viewer)
  await gpuSim.init(sourcePoint.value.lon, sourcePoint.value.lat, 0.05)
  const waterAmount = floodVolume.value * 0.5
  gpuSim.setFlowRate(SPEED_MAP[flowSpeed.value])
  gpuSim.setSourcePoint(sourcePoint.value.lon, sourcePoint.value.lat, waterAmount)
  gpuSim.startSimulation()
  store.setFloodLevel(waterAmount, sourcePoint.value)
  store.setFloodParams(floodVolume.value, flowSpeed.value)
  simStartTime = Date.now()
  scheduleBoundaryPoll()
}

function scheduleBoundaryPoll() {
  if (floodBoundaryTimer) clearTimeout(floodBoundaryTimer)
  floodBoundaryTimer = setTimeout(() => {
    if (!gpuSim || !simulating.value) return
    const boundary = gpuSim.getFloodBoundary()
    if (boundary.length > 0) {
      store.setFloodPolygon(boundary)
    }
    if (floodPolyEntity) {
      floodPolyEntity.show = false
    }
    scheduleBoundaryPoll()
  }, 50)
}

function updateFloodPolygon(boundary) {
  if (!viewer) return
  if (!boundary || boundary.length < 6) {
    if (floodPolyEntity) {
      floodPolyEntity.show = true
    }
    if (!sourcePoint.value) return
    const fallback = buildFallbackBoundary(sourcePoint.value.lon, sourcePoint.value.lat)
    boundary = fallback
  }
  const positions = []
  for (let i = 0; i < boundary.length; i += 2) {
    positions.push(boundary[i], boundary[i + 1])
  }
  if (floodPolyEntity) {
    floodPolyEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(
      Cesium.Cartesian3.fromDegreesArray(positions)
    )
    floodPolyEntity.polygon.clampToGround = true
    floodPolyEntity.show = true
  } else {
    floodPolyEntity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(positions)
        ),
        material: Cesium.Color.ROYALBLUE.withAlpha(0.25),
        outline: true,
        outlineColor: Cesium.Color.ROYALBLUE.withAlpha(0.6),
        outlineWidth: 2,
        clampToGround: true,
      },
      show: true,
    })
  }
}

function buildFallbackBoundary(lon, lat) {
  const coords = []
  const radiusDeg = 0.01
  for (let i = 0; i < 257; i++) {
    const angle = (i / 257) * Math.PI * 2
    coords.push(lon + Math.cos(angle) * radiusDeg)
    coords.push(lat + Math.sin(angle) * radiusDeg)
  }
  return coords
}

function startSimulation() {
  if (!sourcePoint.value) return
  if (simulating.value) return
  if (floodPolyEntity) {
    viewer.entities.remove(floodPolyEntity)
    floodPolyEntity = null
  }
  simulating.value = true
  simResults.value = null
  simElapsed.value = 0
  initGPUSim()
  startAutoStop()
}

function startAutoStop() {
  if (autoStopTimer) clearInterval(autoStopTimer)
  autoStopTimer = setInterval(() => {
    simElapsed.value++
    if (simElapsed.value >= SIM_MAX_DURATION) {
      stopSimulation()
    }
  }, 1000)
}

function stopSimulation() {
  simulating.value = false
  if (autoStopTimer) {
    clearInterval(autoStopTimer)
    autoStopTimer = null
  }
  if (floodBoundaryTimer) {
    clearTimeout(floodBoundaryTimer)
    floodBoundaryTimer = null
  }
  if (gpuSim) {
    const boundary = gpuSim.getFloodBoundary()
    if (boundary.length > 0) {
      store.setFloodPolygon(boundary)
    }
    updateFloodPolygon(boundary.length > 0 ? boundary : null)
    computeResults(boundary)
    gpuSim.stopSimulation()
  }
}

function computeResults(boundary) {
  if (!boundary || boundary.length < 6) {
    if (!sourcePoint.value) {
      simResults.value = { area: '—', maxDepth: '—', affectedVillages: 0, villageList: [] }
      return
    }
    boundary = buildFallbackBoundary(sourcePoint.value.lon, sourcePoint.value.lat)
  }

  const polyCoords = []
  for (let i = 0; i < boundary.length; i += 2) {
    polyCoords.push([boundary[i], boundary[i + 1]])
  }
  if (polyCoords.length > 0) polyCoords.push(polyCoords[0])

  const areaDeg = polygonAreaDeg(polyCoords)
  const midLat = sourcePoint.value ? sourcePoint.value.lat : polyCoords[0][1]
  const areaKm2 = areaDeg * (111.32 * Math.cos(Cesium.Math.toRadians(midLat)) * 111.32)
  const areaStr = areaKm2 < 0.01 ? '<0.01' : areaKm2.toFixed(2)

  const villages = store.hazards || []
  const affected = []
  for (const v of villages) {
    const vLon = v.lng ?? v.lon
    const vLat = v.lat
    if (vLon == null || vLat == null) continue
    if (isPointInFloodPolygon(vLon, vLat, boundary)) {
      const dist = haversineDistance(sourcePoint.value.lat, sourcePoint.value.lon, vLat, vLon) / 1000
      affected.push({ name: v.name || '未命名', dist: dist.toFixed(1), depth: '—' })
    }
  }

  simResults.value = {
    area: areaStr + ' km²',
    maxDepth: '—',
    affectedVillages: affected.length,
    villageList: affected,
  }
  store.setFloodResults(simResults.value)
}

function isPointInFloodPolygon(lon, lat, polygon) {
  if (!polygon || polygon.length < 6) return false
  let inside = false
  for (let i = 0, j = polygon.length - 2; i < polygon.length; j = i, i += 2) {
    const xi = polygon[i], yi = polygon[i + 1]
    const xj = polygon[j], yj = polygon[j + 1]
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function polygonAreaDeg(coords) {
  let area = 0
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1]
  }
  return Math.abs(area) / 2
}

function syncSiteMarkers() {
  const v = viewerStore.viewer
  if (!v) return
  siteMarkers.forEach(m => {
    const sp = v.scene.cartesianToCanvasCoordinates(m.position)
    if (sp) {
      m.el.style.left = sp.x + 'px'
      m.el.style.top = sp.y + 'px'
      m.el.style.display = 'flex'
    } else {
      m.el.style.display = 'none'
    }
  })
}

function clearSiteMarkers() {
  siteMarkers.forEach(m => m.el.remove())
  siteMarkers = []
  if (_siteSyncHandler) { _siteSyncHandler(); _siteSyncHandler = null }
}

onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return

  viewer.scene.setTerrain(
    new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromIonAssetId(1))
  )

  if (store.aoi) {
    const { minLat, maxLat, minLng, maxLng } = store.aoi
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
      duration: 1,
    })
  } else if (store.selectedEarthquake) {
    const { lon, lat } = store.selectedEarthquake
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(lon - 0.3, lat - 0.3, lon + 0.3, lat + 0.3),
      duration: 1,
    })
  } else {
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(115.98, 40.03, 15000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
    })
  }

  if (store.watchtowers && store.watchtowers.length > 0) {
    store.watchtowers.forEach(t => {
      const el = document.createElement('div')
      el.className = 'village-marker'
      el.innerHTML = '<img src="./icons/observation-tower.svg" class="village-icon" alt="" /><span class="village-label">' + (t.name || '') + '</span>'
      viewer.container.appendChild(el)
      siteMarkers.push({ el, position: Cesium.Cartesian3.fromDegrees(t.lng ?? t.lon, t.lat) })
    })
  }
  if (store.hazards && store.hazards.length > 0) {
    store.hazards.forEach(v => {
      const el = document.createElement('div')
      el.className = 'village-marker'
      el.innerHTML = '<img src="./icons/village.svg" class="village-icon" alt="" /><span class="village-label">' + (v.name || '') + '</span>'
      viewer.container.appendChild(el)
      siteMarkers.push({ el, position: Cesium.Cartesian3.fromDegrees(v.lng ?? v.lon, v.lat) })
    })
  }
  if (siteMarkers.length > 0) {
    _siteSyncHandler = viewer.scene.postRender.addEventListener(syncSiteMarkers)
  }
})

onBeforeUnmount(() => {
  if (autoStopTimer) clearInterval(autoStopTimer)
  if (floodBoundaryTimer) clearTimeout(floodBoundaryTimer)
  if (gpuSim) gpuSim.destroy()
  if (sourcePickHandler) sourcePickHandler.destroy()
  if (sourceMarker && viewer) viewer.entities.remove(sourceMarker)
  if (floodPolyEntity && viewer) viewer.entities.remove(floodPolyEntity)
  gpuSim = null
  sourcePickHandler = null
  sourceMarker = null
  floodPolyEntity = null
  clearSiteMarkers()
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
  pointer-events: none;
}

.flood-panel {
  position: absolute;
  left: 12px;
  pointer-events: auto;
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
  pointer-events: auto;
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
  z-index: 0;pointer-events: none;
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

.num-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid rgba(45, 138, 78, 0.25);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: #3d3929;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.num-input:focus {
  border-color: #2d8a4e;
  box-shadow: 0 0 0 2px rgba(45, 138, 78, 0.1);
}

.select-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid rgba(45, 138, 78, 0.25);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: #3d3929;
  font-size: 12px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.select-input:focus {
  border-color: #2d8a4e;
}

.sim-btn {
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #2d8a4e, #1a6b35);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(45, 138, 78, 0.3);
}
.sim-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(45, 138, 78, 0.4);
}
.sim-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sim-btn.stop {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.results-panel {
  background: rgba(45, 138, 78, 0.06);
  border-color: rgba(45, 138, 78, 0.15);
}

.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.result-item {
  text-align: center;
  padding: 6px 4px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
}

.result-val {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #2d8a4e;
}

.result-label {
  display: block;
  font-size: 10px;
  color: #8b7e6a;
}

.village-table {
  max-height: 120px;
  overflow-y: auto;
}

.village-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.village-table th {
  text-align: left;
  padding: 3px 4px;
  color: #8b7e6a;
  font-weight: 500;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
}

.village-table td {
  padding: 3px 4px;
  color: #3d3929;
}

.village-table td.danger {
  color: #f87171;
  font-weight: 600;
}
</style>

<style>
.village-marker {
  position: absolute;
  pointer-events: none;
  z-index: 200;
  transform: translate(-50%, -100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.village-icon {
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}
.village-label {
  color: #fff;
  font-size: 12px;
  font-family: 'Microsoft YaHei', sans-serif;
  text-shadow: 0 0 4px #000, 0 0 4px #000;
  white-space: nowrap;
}
</style>