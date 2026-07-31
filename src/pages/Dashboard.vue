<template>
  <div class="dashboard">
    <div class="left-panel">
      <div class="panel-header">
        <h1 class="platform-title">🛰️ 灾害应急可视化平台</h1>
      </div>

      <div class="area-card">
        <div class="card-header">
          <span class="card-icon">📍</span>
          <span class="card-title">研究区概况</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">区域名称</span>
            <span class="info-value">{{ scenarioName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">经纬度范围</span>
            <span class="info-value">{{ aoi.minLng.toFixed(2) }}° ~ {{ aoi.maxLng.toFixed(2) }}°E</span>
          </div>
          <div class="info-row">
            <span class="info-label"></span>
            <span class="info-value">{{ aoi.minLat.toFixed(2) }}° ~ {{ aoi.maxLat.toFixed(2) }}°N</span>
          </div>
          <div class="info-row">
            <span class="info-label">区域面积</span>
            <span class="info-value">{{ areaDisplay }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">监测站点</span>
            <span class="info-value count">{{ watchtowers.length }} 个</span>
          </div>
          </div>
      </div>

      <div class="control-card">
        <div class="card-header">
          <span class="card-icon">🎛️</span>
          <span class="card-title">场景控制</span>
        </div>
        <div class="control-section">
          <div class="control-row">
            <span class="control-label">位置</span>
            <span class="control-value">{{ epicenterInfo.place }}</span>
          </div>
          <div class="control-row">
            <span class="control-label">震级</span>
            <span class="control-value">里氏 {{ epicenterInfo.mag }} 级</span>
          </div>
          <div class="control-row">
            <span class="control-label">深度</span>
            <span class="control-value">{{ epicenterInfo.depth }}</span>
          </div>
          <div class="control-row">
            <span class="control-label">坐标</span>
            <span class="control-value">{{ epicenterInfo.lon }} {{ epicenterInfo.lat }}</span>
          </div>
          <div class="control-row">
            <span class="control-label">时间</span>
            <span class="control-value">{{ epicenterInfo.time }}</span>
          </div>
          <div class="control-row" style="margin-top:4px">
            <button class="control-btn primary" @click="triggerDispatch">🎯 切换至震中</button>
          </div>
          <template v-if="false">
          <div class="control-row" style="margin-top:12px">
            <span class="control-label">性能对比</span>
          </div>
          <div class="control-row" style="margin-top:4px;display:flex;gap:6px;">
            <button
              class="control-btn"
              :class="{ primary: perfMode === 'entities' }"
              :style="perfMode === 'entities' ? 'background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.4);' : ''"
              @click="perfMode === 'entities' ? stopPerf(viewerStore.viewer) : runEntitiesMode(viewerStore.viewer)"
            >
              {{ perfMode === 'entities' ? '⏹ 停止' : '🐢 entities' }}
            </button>
            <button
              class="control-btn"
              :class="{ primary: perfMode === 'primitive' }"
              :style="perfMode === 'primitive' ? 'background:rgba(74,222,128,0.2);border-color:rgba(74,222,128,0.4);' : ''"
              @click="perfMode === 'primitive' ? stopPerf(viewerStore.viewer) : runPrimitiveMode(viewerStore.viewer)"
            >
              {{ perfMode === 'primitive' ? '⏹ 停止' : '🚀 primitive' }}
            </button>
          </div>
          <div class="control-row" style="margin-top:4px" v-if="perfRunning">
            <span class="control-value" style="color:#4ade80;font-size:13px;">
              {{ perfMode === 'entities' ? '🔴' : '🟢' }} {{ perfMode }} · {{ perfFps }} FPS
            </span>
          </div>
          </template>
        </div>
      </div>

      <div class="stat-grid">
        <div
          class="stat-card"
          :class="{ clickable: card.panel }"
          v-for="card in statCards"
          :key="card.label"
          @click="card.panel && togglePanel(card.panel)"
        >
          <div class="stat-icon">{{ card.icon }}</div>
          <div class="stat-content">
            <div class="stat-number" :ref="el => card.ref = el">{{ card.displayValue }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="right-panel vehicle-panel" :class="{ visible: showVehiclePanel }">
      <div class="panel-header">
        <span class="panel-title">🚑 救援车辆</span>
      </div>
      <div class="vehicle-list">
        <div
          v-for="slot in vehicleSlots"
          :key="slot.id"
          class="vehicle-card"
          :class="{ active: slot.id === activeSlotId }"
          :style="{ borderLeftColor: slot.color }"
          @click="handleTrackVehicle(slot)"
        >
          <div class="vehicle-color" :style="{ background: slot.color }"></div>
          <div class="vehicle-info">
            <div class="vehicle-name">{{ slot.name }}</div>
            <div class="vehicle-stats">
              <span>{{ vehicleSpeed }} km/h</span>
              <span class="stat-sep">·</span>
              <span>{{ slot.progress ? slot.progress.toFixed(1) : '0.0' }}%</span>
            </div>
          </div>
          <div class="vehicle-track-icon" v-if="slot.id === activeSlotId && cameraLocked">👁</div>
        </div>
      </div>
      <div class="speed-control">
        <span class="speed-label">速度</span>
        <input type="range" min="10" max="200" :value="vehicleSpeed" @input="vehicleSpeed = Number($event.target.value)" />
        <span class="speed-value">{{ vehicleSpeed }} km/h</span>
      </div>
    </div>

    <div class="right-panel summary-panel" :class="{ visible: showStationPanel }">
      <div class="panel-header">
        <span class="panel-title">📡 监测网络</span>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">在线站点</span>
          <span class="summary-value">{{ watchtowers.length }} 个</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">覆盖范围</span>
          <span class="summary-value">{{ stationSummary.coverage }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">平均间距</span>
          <span class="summary-value">{{ stationSummary.avgDist }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">最近震中</span>
          <span class="summary-value">{{ stationSummary.nearestEpicenter }}</span>
        </div>
      </div>
    </div>

    <div class="right-panel summary-panel" :class="{ visible: showStationPanel }">
      <div class="panel-header">
        <span class="panel-title">💥 地震影响</span>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">震级</span>
          <span class="summary-value">{{ earthquakeSummary.magnitude }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">震源深度</span>
          <span class="summary-value">{{ earthquakeSummary.depth }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">烈度</span>
          <span class="summary-value">{{ earthquakeSummary.intensity }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">受影响村庄</span>
          <span class="summary-value">{{ earthquakeSummary.villages }}</span>
        </div>
      </div>
    </div>

    <div class="right-panel flood-panel" :class="{ visible: showFloodPanel || floodSims.length > 0 }">
      <div class="panel-header">
        <span class="panel-title">🌊 洪水模拟</span>
      </div>
      <div class="panel-empty" v-if="floodSims.length === 0">
        💡 右键点击地图任意位置<br>即可触发洪水模拟
      </div>
      <div class="flood-list" v-else>
        <div class="flood-card" v-for="entry in floodSims" :key="entry.id">
          <div class="flood-card-header">
            <span class="flood-card-title">水源 #{{ entry.id }}</span>
            <span class="flood-card-status" v-if="entry.stats">已完成</span>
            <span class="flood-card-status running" v-else>模拟中...</span>
            <button class="flood-card-close" @click="closeFlood(entry)">✕</button>
          </div>
          <div class="flood-card-body" v-if="entry.stats">
            <div class="flood-stat-row">
              <span class="flood-stat-label">淹没面积</span>
              <span class="flood-stat-value">{{ entry.stats.flooded }} km²</span>
            </div>
            <div class="flood-stat-row">
              <span class="flood-stat-label">淹没比例</span>
              <span class="flood-stat-value">{{ entry.stats.floodedPct }}%</span>
            </div>
            <div class="flood-stat-row">
              <span class="flood-stat-label">模拟范围</span>
              <span class="flood-stat-value">{{ entry.stats.total }} km²</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tip-bar" v-if="showTipBar">
      <span class="tip-text">{{ tips[tipIndex] }}</span>
    </div>

    <div class="bottom-bar">
      <div class="toggle-group">
        <button
          v-for="layer in layers"
          :key="layer.key"
          class="toggle-btn"
          :class="{ active: layer.visible[layer.key] }"
          @click="toggleLayer(layer)"
        >
          <span class="toggle-dot" :style="{ background: layer.color }"></span>
          <span>{{ layer.label }}</span>
        </button>
      <!-- 改为 -->
    <button class="toggle-btn manage-btn" :class="{ active: showStationManage }" @click="togglePanel('stationManage')">
          <span class="toggle-dot" style="background: #4ade80"></span>
          <span>站点管理</span>
        </button>
      </div>
    </div>

    <div
      class="context-menu"
      v-if="ctxMenu.show"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
    >
      <div class="ctx-item" v-if="ctxMenu.onStation" @click="runViewshed">
        <span>🔭</span> 360° 通视分析
      </div>
      <div class="ctx-item" @click="runFlood">
        <span>🌊</span> 洪水模拟
      </div>
      <div class="ctx-item danger" v-if="activeViewshedStations.size > 0 || floodSims.length > 0" @click="closeAllAnalysis">
        <span>✕</span> 关闭分析
      </div>
    </div>
  </div>

  <div class="data-entry-btn" @click="goToDataManagement" title="数据管理">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as Cesium from 'cesium'
import { useViewerStore } from '../stores/viewerStore.js'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useSiteMarkers } from '../composables/useSiteMarkers.js'
import { useCameraInit } from '../composables/useCameraInit.js'
import { useVehicleSimulation } from '../composables/useVehicleSimulation.js'
import { useViewshedAnalysis } from '../composables/useViewshedAnalysis.js'
import { GPUFloodSim } from '../utils/gpuFloodSim.js'
import { calcPolygonArea } from '../utils/geo.js'
import { usePointPerformance } from '../composables/usePointPerformance.js'

const viewerStore = useViewerStore()
const store = useScenarioStore()
const { clearAll, loadWatchtowers, addVillageDot, markers } = useSiteMarkers()
const { flyToAOI } = useCameraInit()
const { vehicleSlots, activeSlotId, vehicleSpeed, cameraLocked, setup: setupVehicles, teardown: teardownVehicles, startSimulation, setVehiclePanelVisible, toggleCameraLock, switchVehicleSlot, autoLoadDispatchScenario } = useVehicleSimulation()
const { isRunning: perfRunning, mode: perfMode, fps: perfFps, runEntitiesMode, runPrimitiveMode, stop: stopPerf } = usePointPerformance()

const demoData = {
  epicenter: { lon: 104.0694, lat: 31.5685, mag: 6.5, depth: 10, time: '2008-05-12T14:28:00', place: '四川省德阳市绵竹市清平镇' },
  aoi: { minLng: 103.60, maxLng: 105.00, minLat: 31.00, maxLat: 32.10 },
  name: '德阳市绵竹市',
}

const hasImportedData = computed(() => !!(store.aoi || store.earthquakeData?.length))

const aoi = computed(() => store.aoi || demoData.aoi)
const watchtowers = computed(() => store.watchtowers)
const earthquakeList = computed(() => {
  if (store.selectedEarthquake) return [store.selectedEarthquake]
  return [demoData.epicenter]
})

const aoiEntities = []       // 研究区相关实体
const floodEntity = ref(null)
const epicenterEntities = []  // 震中相关实体
let deyangBoundaryDS = null     // 德阳边界DataSource
const cityBoundaryDSList = []    // 邻市边界DataSource列表
let pulseHandler = null
let tipTimer = null
const showTipBar = ref(false)
const showVehiclePanel = ref(false)
const showStationPanel = ref(false)
const showFloodPanel = ref(false)
const showStationManage = ref(false)
const router = useRouter()

const goToDataManagement = () => {
  router.push('/data-management')
}

const stationFormVisible = ref(false)
const editingStationId = ref(null)
const stationFormData = reactive({
  name: '',
  type: '强震监测站',
  lng: 104.07,
  lat: 31.57,
  height: 50,
  status: 'online',
  description: ''
})
const tipIndex = ref(0)
const tips = [
  '🖱️ 右键点击地图任意位置 → 触发洪水模拟',
  '🖱️ 右键点击监测站标记 → 通视分析',
]
const viewshedEntities = []    // 通视线实体
const activeViewshedStations = reactive(new Set())  // 当前通视分析的监测站索引集合
const ctxMenu = reactive({ show: false, x: 0, y: 0, stationIdx: null, onStation: false, clickLon: 0, clickLat: 0 })
const floodSims = reactive([])      // 洪水模拟实例列表 [{ id, sim, boundary, stats, cardVisible }]
const floodInterval = ref(null)
let floodIdCounter = 0

const epicenterInfo = computed(() => {
  const eq = store.selectedEarthquake || demoData.epicenter
  const mag = eq.magnitude || eq.mag || '?'
  const depth = eq.depth != null ? eq.depth + ' km' : '?'
  const place = eq.place || '德阳市'
  const timeStr = eq.time ? new Date(eq.time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '2008-05-12 14:28'
  const lon = eq.lon != null ? eq.lon.toFixed(4) + '°E' : '?'
  const lat = eq.lat != null ? eq.lat.toFixed(4) + '°N' : '?'
  return { mag, depth, place, time: timeStr, lon, lat }
})
const layerVisible = reactive({
  epicenter: true,
  flood: true,
  villages: true,
  watchtowers: true,
  vehicles: true,
  deyangBoundary: true,
  cityBoundary: true,
  viewshed: true,
  flood: true,
})

const layers = [
  { key: 'epicenter', label: '震中', color: '#ef4444', visible: layerVisible },
  { key: 'flood', label: '洪水', color: '#3380ff', visible: layerVisible },
  { key: 'villages', label: '村庄', color: '#f97316', visible: layerVisible },
  { key: 'watchtowers', label: '通视', color: '#a78bfa', visible: layerVisible },
  { key: 'vehicles', label: '车辆', color: '#e74c3c', visible: layerVisible },
  { key: 'viewshed', label: '通视线', color: '#4ade80', visible: layerVisible },
]

const maxMagnitude = computed(() => {
  return Math.max(...earthquakeList.value.map(e => e.magnitude || 0))
})

const epicenter = computed(() => {
  let max = earthquakeList.value[0]
  for (const q of earthquakeList.value) {
    if ((q.magnitude || 0) > (max.magnitude || 0)) max = q
  }
  return { lon: max.lon, lat: max.lat, mag: max.magnitude || 0 }
})

const areaDisplay = computed(() => {
  const a = aoi.value
  if (!a) return '--'
  const { minLat, maxLat, minLng, maxLng } = a
  const corners = [
    { lat: minLat, lng: minLng },
    { lat: maxLat, lng: minLng },
    { lat: maxLat, lng: maxLng },
    { lat: minLat, lng: maxLng },
  ]
  const areaM2 = calcPolygonArea(corners)
  if (areaM2 > 1e6) return (areaM2 / 1e6).toFixed(0) + ' km²'
  return (areaM2 / 1e4).toFixed(1) + ' 公顷'
})

const scenarioName = computed(() => store.scenarioName || demoData.name)

const statCards = computed(() => [
  { icon: '🚑', label: '救援车辆', value: vehicleSlots.value.length, displayValue: vehicleSlots.value.length || '--', ref: null, panel: 'vehicle' },
  { icon: '📡', label: '监测站点', value: watchtowers.value.length, displayValue: watchtowers.value.length, ref: null, panel: 'station' },
  { icon: '🌊', label: '洪水等级', value: store.floodLevel, displayValue: store.floodLevel > 0 ? store.floodLevel + ' 级' : '--', ref: null, panel: 'flood' },
])

const stationSummary = computed(() => {
  const towers = watchtowers.value
  if (!towers.length) return { coverage: '--', avgDist: '--', nearestEpicenter: '--' }
  let totalDist = 0
  let pairs = 0
  for (let i = 0; i < towers.length; i++) {
    for (let j = i + 1; j < towers.length; j++) {
      totalDist += getDistance(towers[i].lat, towers[i].lng, towers[j].lat, towers[j].lng)
      pairs++
    }
  }
  const avgDist = pairs > 0 ? (totalDist / pairs).toFixed(1) + ' km' : '--'
  const coverage = (towers.length * 100).toFixed(0) + ' km²'
  const ep = demoData.epicenter
  let minDist = Infinity
  towers.forEach(t => {
    const d = getDistance(t.lat, t.lng, ep.lat, ep.lon)
    if (d < minDist) minDist = d
  })
  const nearestEpicenter = minDist < Infinity ? minDist.toFixed(1) + ' km' : '--'
  return { coverage, avgDist, nearestEpicenter }
})

const earthquakeSummary = computed(() => {
  const ep = demoData.epicenter
  const mag = ep.mag || 7.8
  const depth = ep.depth || 12
  let intensity = 'Ⅸ'
  if (mag < 5) intensity = 'Ⅵ'
  else if (mag < 6) intensity = 'Ⅶ'
  else if (mag < 7) intensity = 'Ⅷ'
  else if (mag < 8) intensity = 'Ⅸ'
  else intensity = 'Ⅹ'
  return {
    magnitude: mag.toFixed(1) + ' 级',
    depth: depth + ' km',
    intensity: intensity + ' 度',
    villages: '15 个',
  }
})

function togglePanel(panel) {
  if (panel === 'vehicle') showVehiclePanel.value = !showVehiclePanel.value
  if (panel === 'station') showStationPanel.value = !showStationPanel.value
  if (panel === 'flood') showFloodPanel.value = !showFloodPanel.value
  if (panel === 'stationManage') showStationManage.value = !showStationManage.value
}

function openStationForm(station = null) {
  if (station) {
    editingStationId.value = station.id
    stationFormData.name = station.name
    stationFormData.type = station.type || '强震监测站'
    stationFormData.lng = station.lng
    stationFormData.lat = station.lat
    stationFormData.height = station.height || 50
    stationFormData.status = station.status || 'online'
    stationFormData.description = station.description || ''
  } else {
    editingStationId.value = null
    stationFormData.name = ''
    stationFormData.type = '强震监测站'
    stationFormData.lng = 104.07
    stationFormData.lat = 31.57
    stationFormData.height = 50
    stationFormData.status = 'online'
    stationFormData.description = ''
  }
  stationFormVisible.value = true
}

function resetStationForm() {
  stationFormVisible.value = false
  editingStationId.value = null
}

async function saveStation() {
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
  const payload = {
    name: stationFormData.name,
    type: stationFormData.type,
    lng: stationFormData.lng,
    lat: stationFormData.lat,
    height: stationFormData.height,
    status: stationFormData.status,
    description: stationFormData.description
  }
  try {
    const url = editingStationId.value
      ? `${BACKEND}/api/stations/${editingStationId.value}`
      : `${BACKEND}/api/stations`
    const method = editingStationId.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('保存失败')
    await store.loadWatchtowersFromBackend()
    resetStationForm()
    drawWatchtowerBillboards()
  } catch (e) {
    console.error('保存站点失败:', e)
    alert('保存失败，请检查后端是否启动')
  }
}

async function deleteStation(station) {
  if (!confirm(`确定删除站点 "${station.name}" 吗？`)) return
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
  try {
    const res = await fetch(`${BACKEND}/api/stations/${station.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除失败')
    await store.loadWatchtowersFromBackend()
    drawWatchtowerBillboards()
  } catch (e) {
    console.error('删除站点失败:', e)
    alert('删除失败，请检查后端是否启动')
  }
}

function triggerDispatch() {
  const ep = earthquakeList.value[0]
  if (!ep) return
  const viewer = viewerStore.viewer
  if (!viewer) return

  showTipBar.value = true
  if (!tipTimer) {
    tipTimer = setInterval(() => {
      tipIndex.value = (tipIndex.value + 1) % tips.length
    }, 30000)
  }

  cameraLocked.value = false
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(103.851397, 30.904505, 30826),
    orientation: {
      heading: Cesium.Math.toRadians(28.4),
      pitch: Cesium.Math.toRadians(-25.7),
      roll: Cesium.Math.toRadians(360.0),
    },
    duration: 1.5,
  })

  drawEpicenter()

  store.setDispatchCenter({ lng: ep.lon, lat: ep.lat, name: '指挥中心' })

  drawWatchtowerBillboards()

  drawDeyangBoundary()

  autoLoadDispatchScenario().then(() => {
    startSimulation()
  })
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function flyToStation(station) {
  const viewer = viewerStore.viewer
  if (!viewer) return
  flyToAOI(viewer, { lon: station.lng, lat: station.lat, height: 3000 })
}

function handleTrackVehicle(slot) {
  switchVehicleSlot(slot.id)
  if (!cameraLocked.value) {
    toggleCameraLock()
  }
}

function toggleLayer(layer) {
  layer.visible[layer.key] = !layer.visible[layer.key]
  if (layer.key === 'flood' && floodEntity.value) {
    floodEntity.value.show = layer.visible.flood
  }
  if (layer.key === 'epicenter') {
    epicenterEntities.forEach(e => { if (e) e.show = layer.visible.epicenter })
  }
  if (layer.key === 'vehicles') {
    vehicleSlots.value.forEach(slot => {
      if (slot.entity) slot.entity.show = layer.visible.vehicles
      if (slot.pathGlass) slot.pathGlass.show = layer.visible.vehicles
      if (slot.pathStartMarker) slot.pathStartMarker.show = layer.visible.vehicles
    })
    setVehiclePanelVisible(layer.visible.vehicles)
  }
  if (layer.key === 'watchtowers') {
    markers.value.forEach(m => {
      if (m.el.classList.contains('village-marker')) {
        m.el.style.display = layer.visible.watchtowers ? 'flex' : 'none'
      }
    })
  }
  if (layer.key === 'villages') {
    markers.value.forEach(m => {
      if (m.el.classList.contains('village-dot')) {
        m.el.style.display = layer.visible.villages ? 'block' : 'none'
      }
    })
  }
  if (layer.key === 'viewshed') {
    viewshedEntities.forEach(e => { if (e) e.show = layer.visible.viewshed })
  }
  if (layer.key === 'flood') {
    floodSims.forEach(entry => {
      entry.entities.forEach(e => { if (e) e.show = layer.visible.flood })
    })
  }
}

// ==================== 通视分析（右键触发） ====================
function onMapRightClick(e) {
  const viewer = viewerStore.viewer
  if (!viewer) return

  const pickedObj = viewer.scene.pick(e)
  if (pickedObj && pickedObj.id && pickedObj.id.name) {
    const name = pickedObj.id.name
    const isStation = name.startsWith('监测站-') && !name.startsWith('监测站脉冲-')
    const isPulse = name.startsWith('监测站脉冲-')
    if (isStation || isPulse) {
      e.preventDefault()
      const stationName = name.replace(isPulse ? '监测站脉冲-' : '监测站-', '')
      const idx = watchtowers.value.findIndex(t => t.name === stationName)
      if (idx !== -1) {
        ctxMenu.stationIdx = idx
        ctxMenu.onStation = true
        ctxMenu.x = e.clientX
        ctxMenu.y = e.clientY
        ctxMenu.show = true
        return
      }
    }
  }

  const marker = e.target.closest('.village-marker')
  if (marker && marker.dataset.stationIndex) {
    e.preventDefault()
    ctxMenu.stationIdx = Number(marker.dataset.stationIndex)
    ctxMenu.onStation = true
    ctxMenu.x = e.clientX
    ctxMenu.y = e.clientY
    ctxMenu.show = true
    return
  }
  if (marker) return
  e.preventDefault()
  const cartesian = viewer.scene.pickPosition(e)
  if (cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    ctxMenu.clickLon = Cesium.Math.toDegrees(cartographic.longitude)
    ctxMenu.clickLat = Cesium.Math.toDegrees(cartographic.latitude)
    ctxMenu.onStation = false
    ctxMenu.stationIdx = null
    ctxMenu.x = e.clientX
    ctxMenu.y = e.clientY
    ctxMenu.show = true
  }
}

function hideContextMenu() {
  ctxMenu.show = false
}

async function runViewshed() {
  hideContextMenu()
  const idx = ctxMenu.stationIdx
  if (idx == null) return
  const station = watchtowers.value[idx]
  if (!station) return
  const viewer = viewerStore.viewer
  if (!viewer) return

  if (activeViewshedStations.has(idx)) return

  const { computeViewshed } = useViewshedAnalysis()
  await computeViewshed(viewer, {
    centerLon: station.lng ?? station.lon,
    centerLat: station.lat,
    observerHeight: station.height || 50,
    maxDistance: 5000,
    stepSize: 100,
    pointColor: '#4ade80',
    viewshedEntities,
    rayCount: 36,
  })

  activeViewshedStations.add(idx)
}

function closeViewshed() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities.length = 0
  activeViewshedStations.clear()
}

function closeAllAnalysis() {
  closeViewshed()
  closeAllFloods()
  hideContextMenu()
}

// ==================== 洪水模拟（右键触发） ====================
async function runFlood() {
  hideContextMenu()
  const viewer = viewerStore.viewer
  if (!viewer) return

  const lon = ctxMenu.clickLon
  const lat = ctxMenu.clickLat
  const id = ++floodIdCounter

  const sim = new GPUFloodSim(viewer)
  try {
    await sim.init(lon, lat, 0.05)
  } catch (e) {
    console.warn('洪水模拟初始化失败:', e)
    return
  }
  sim.setSourcePoint(lon, lat, 2000)
  sim.setFlowRate('medium')
  sim.startSimulation()

  // 视角飞到模拟点正上方
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 15000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
    duration: 1.5,
  })

  const entry = reactive({ id, sim, boundary: null, stats: null, cardVisible: true, entities: [], _timer: null, _pollTimer: null })
  floodSims.push(entry)

  pollFloodBoundary(entry)

  let elapsed = 0
  const timer = setInterval(() => {
    elapsed += 1
    if (elapsed >= 30) {
      clearInterval(timer)
      stopFloodSim(entry)
    }
  }, 1000)
  entry._timer = timer
}

function pollFloodBoundary(entry) {
  if (entry._pollTimer) clearTimeout(entry._pollTimer)
  entry._pollTimer = setTimeout(() => {
    if (!entry.sim || entry._stopped) return
    const boundary = entry.sim.getFloodBoundary()
    if (boundary && boundary.length >= 6) {
      updateFloodPolygon(entry, boundary)
    }
    pollFloodBoundary(entry)
  }, 50)
}

function updateFloodPolygon(entry, boundary) {
  const viewer = viewerStore.viewer
  if (!viewer || !boundary || boundary.length < 6) return
  entry.boundary = boundary

  const positions = []
  for (let i = 0; i < boundary.length; i += 2) {
    positions.push(boundary[i], boundary[i + 1])
  }

  if (entry._polyEntity) {
    entry._polyEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(
      Cesium.Cartesian3.fromDegreesArray(positions)
    )
    entry._polyEntity.polygon.clampToGround = true
    entry._polyEntity.show = true
  } else {
    entry._polyEntity = viewer.entities.add({
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
    entry.entities.push(entry._polyEntity)
  }
}

function stopFloodSim(entry) {
  entry._stopped = true
  if (entry._timer) clearInterval(entry._timer)
  if (entry._pollTimer) clearTimeout(entry._pollTimer)
  if (entry.sim) {
    entry.sim.stopSimulation()
  }
  entry.stats = entry.sim ? entry.sim.getStats() : null
}

function closeFlood(entry) {
  const viewer = viewerStore.viewer
  stopFloodSim(entry)
  if (entry.sim) {
    entry.sim.destroy()
  }
  if (viewer) {
    entry.entities.forEach(e => viewer.entities.remove(e))
  }
  const idx = floodSims.indexOf(entry)
  if (idx !== -1) floodSims.splice(idx, 1)
}

function closeAllFloods() {
  floodSims.slice().forEach(closeFlood)
}

function drawAOI() {
  const a = aoi.value
  if (!a) return
  clearAOI()
  const viewer = viewerStore.viewer
  if (!viewer) return
  const { minLat, maxLat, minLng, maxLng } = a
  const rect = viewer.entities.add({
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
      material: Cesium.Color.fromCssColorString('#4ade80').withAlpha(0.12),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#4ade80'),
      outlineWidth: 2,
      clampToGround: true,
    },
    name: '研究区',
  })
  aoiEntities.push(rect)
}

function drawFlood() {
  clearFlood()
  const viewer = viewerStore.viewer
  if (!viewer) return
  if (store.floodPolygon && store.floodPolygon.length > 0) {
    floodEntity.value = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(store.floodPolygon),
        material: Cesium.Color.fromCssColorString('#3380ff').withAlpha(0.35),
        clampToGround: true,
        zIndex: 10,
      },
      name: '洪水淹没范围',
    })
  } else if (store.floodSourcePoint && store.floodLevel > 0) {
    const { lon, lat } = store.floodSourcePoint
    const radius = store.floodLevel / 15000
    const numPts = 64
    const coords = []
    for (let i = 0; i <= numPts; i++) {
      const angle = (i / numPts) * Math.PI * 2
      coords.push(lon + radius * Math.cos(angle))
      coords.push(lat + radius * Math.sin(angle))
    }
    floodEntity.value = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(coords),
        material: Cesium.Color.fromCssColorString('#3380ff').withAlpha(0.35),
        clampToGround: true,
        zIndex: 10,
      },
      name: '洪水淹没范围',
    })
  }
}

function clearAOI() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  aoiEntities.forEach(e => viewer.entities.remove(e))
  aoiEntities.length = 0
}

function clearFlood() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  if (floodEntity.value) {
    viewer.entities.remove(floodEntity.value)
    floodEntity.value = null
  }
}

function drawEpicenter() {
  clearEpicenter()
  const ep = epicenter.value
  if (!ep) return
  const viewer = viewerStore.viewer
  if (!viewer) return

  const ringCount = 4
  const pulseCanvas = document.createElement('canvas')
  pulseCanvas.width = 512
  pulseCanvas.height = 512
  const pulseCtx = pulseCanvas.getContext('2d')

  const pulseBillboard = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(ep.lon, ep.lat, 0),
    billboard: {
      image: pulseCanvas,
      width: 120,
      height: 120,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(500, 3.0, 500000, 0.6),
    },
    name: '震中脉冲',
  })
  epicenterEntities.push(pulseBillboard)

  // 查询地形高度后放置光柱
  Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [
    Cesium.Cartographic.fromDegrees(ep.lon, ep.lat),
  ]).then((samples) => {
    const groundH = samples[0]?.height ?? 0
    pulseBillboard.position = Cesium.Cartesian3.fromDegrees(ep.lon, ep.lat, groundH + 5)
    const pillarH = 2000

    const pillar = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(ep.lon, ep.lat, groundH + pillarH / 2),
      cylinder: {
        length: pillarH,
        topRadius: 100,
        bottomRadius: 100,
        material: Cesium.Color.fromCssColorString('#dc2626').withAlpha(0.12),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#dc2626').withAlpha(0.25),
        outlineWidth: 1,
      },
      name: '震中光柱',
    })
    epicenterEntities.push(pillar)

    const positions = [
      Cesium.Cartesian3.fromDegrees(ep.lon, ep.lat, groundH),
      Cesium.Cartesian3.fromDegrees(ep.lon, ep.lat, groundH + pillarH),
    ]

    const outerGlow = viewer.entities.add({
      polyline: { positions, width: 10, material: Cesium.Color.fromCssColorString('#dc2626').withAlpha(0.12), clampToGround: false },
      name: '震中光柱-外层',
    })
    epicenterEntities.push(outerGlow)

    const midGlow = viewer.entities.add({
      polyline: { positions, width: 4, material: Cesium.Color.fromCssColorString('#dc2626').withAlpha(0.35), clampToGround: false },
      name: '震中光柱-中层',
    })
    epicenterEntities.push(midGlow)

    const core = viewer.entities.add({
      polyline: {
        positions, width: 1.5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: Cesium.Color.fromCssColorString('#f87171'),
        }),
        clampToGround: false,
      },
      name: '震中光柱-核心',
    })
    epicenterEntities.push(core)
  })

  if (pulseHandler) {
    viewer.scene.postRender.removeEventListener(pulseHandler)
  }
  pulseHandler = viewer.scene.postRender.addEventListener(() => {
    const t = Date.now() / 1000
    pulseCtx.clearRect(0, 0, 512, 512)

    for (let i = 0; i < ringCount; i++) {
      const phase = (i / ringCount) * 2.8
      const cycleT = (t + phase) % 2.8
      const progress = cycleT / 2.8
      const radius = 30 + progress * 230
      const alpha = Math.max(0, 1 - progress)

      pulseCtx.beginPath()
      pulseCtx.arc(256, 256, radius, 0, 2 * Math.PI)
      pulseCtx.strokeStyle = `rgba(220, 38, 38, ${alpha * 0.95})`
      pulseCtx.lineWidth = 12
      pulseCtx.stroke()

      pulseCtx.beginPath()
      pulseCtx.arc(256, 256, radius, 0, 2 * Math.PI)
      pulseCtx.strokeStyle = `rgba(248, 60, 60, ${alpha * 0.6})`
      pulseCtx.lineWidth = 4
      pulseCtx.stroke()
    }

    pulseCtx.beginPath()
    pulseCtx.arc(256, 256, 20, 0, 2 * Math.PI)
    pulseCtx.fillStyle = 'rgba(220, 38, 38, 0.35)'
    pulseCtx.fill()

    const img = new Image()
    img.src = pulseCanvas.toDataURL('image/png')
    pulseBillboard.billboard.image = img
  })
}

function clearEpicenter() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  epicenterEntities.forEach(e => viewer.entities.remove(e))
  epicenterEntities.length = 0
  if (pulseHandler && viewer) {
    viewer.scene.postRender.removeEventListener(pulseHandler)
    pulseHandler = null
  }
}

let epicenterMarkerEntity = null

// 绘制震中菱形标记，采样地形高度后贴地 5 米
function drawEpicenterMarker() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  clearEpicenterMarker()

  const m = { lon: 104.0694, lat: 31.5685, color: '#3b82f6', shape: 'diamond' }

  const iconCanvas = createGlowMarkerIcon(m.color, m.shape)
  const cartographic = Cesium.Cartographic.fromDegrees(m.lon, m.lat)
  Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic]).then((samples) => {
    const groundH = samples[0]?.height ?? 0
    epicenterMarkerEntity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat, groundH + 5),
      billboard: {
        image: iconCanvas,
        width: 48,
        height: 48,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 500000, 0.5),
      },
      name: '标记-震中',
    })
  })
}

function clearEpicenterMarker() {
  const viewer = viewerStore.viewer
  if (viewer && epicenterMarkerEntity) {
    viewer.entities.remove(epicenterMarkerEntity)
    epicenterMarkerEntity = null
  }
}

let watchtowerBillboardEntities = []

let watchtowerPulseEntities = []
let watchtowerPulseCanvas = null
let watchtowerPulseHandler = null

// 绘制瞭望塔圆形发光标记 + 蓝色脉冲光环
function drawWatchtowerBillboards() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  clearWatchtowerBillboards()

  const towers = watchtowers.value
  if (!towers || !towers.length) return

  watchtowerPulseCanvas = document.createElement('canvas')
  watchtowerPulseCanvas.width = 256
  watchtowerPulseCanvas.height = 256

  towers.forEach(t => {
    const iconCanvas = createGlowMarkerIcon('#38bdf8', 'circle')
    const towerTop = (t.groundElevation || 0) + (t.height || 0)
    const pos = Cesium.Cartesian3.fromDegrees(t.lng ?? t.lon, t.lat, towerTop || 800)

    const entity = viewer.entities.add({
      position: pos,
      billboard: {
        image: iconCanvas,
        width: 48,
        height: 48,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 500000, 0.5),
      },
      name: `监测站-${t.name}`,
    })
    watchtowerBillboardEntities.push(entity)

    const pulseEntity = viewer.entities.add({
      position: pos,
      billboard: {
        image: watchtowerPulseCanvas,
        width: 80,
        height: 80,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 2.0, 500000, 0.6),
      },
      name: `监测站脉冲-${t.name}`,
    })
    watchtowerPulseEntities.push(pulseEntity)
  })

  startWatchtowerPulse()

  sampleAndSaveGroundElevations(towers)
}

// 蓝色脉冲光环动画，单圈扩散
function startWatchtowerPulse() {
  const viewer = viewerStore.viewer
  if (!viewer || !watchtowerPulseCanvas) return
  if (watchtowerPulseHandler) {
    viewer.scene.postRender.removeEventListener(watchtowerPulseHandler)
  }

  const ctx = watchtowerPulseCanvas.getContext('2d')

  watchtowerPulseHandler = viewer.scene.postRender.addEventListener(() => {
    const t = Date.now() / 1000
    ctx.clearRect(0, 0, 256, 256)

    const cycleT = t % 2.0
    const progress = cycleT / 2.0
    const radius = 20 + progress * 90
    const alpha = Math.max(0, 1 - progress)

    ctx.beginPath()
    ctx.arc(128, 128, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.6})`
    ctx.lineWidth = 3
    ctx.stroke()

    const img = new Image()
    img.src = watchtowerPulseCanvas.toDataURL('image/png')
    watchtowerPulseEntities.forEach(e => {
      e.billboard.image = img
    })
  })
}

async function sampleAndSaveGroundElevations(towers) {
  const viewer = viewerStore.viewer
  if (!viewer) return

  const needSample = towers.filter(t => !t.groundElevation || t.groundElevation === 0)
  if (!needSample.length) return

  const cartographics = needSample.map(t => Cesium.Cartographic.fromDegrees(t.lng ?? t.lon, t.lat))
  try {
    const samples = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartographics)
    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
    for (let i = 0; i < needSample.length; i++) {
      const groundH = samples[i]?.height
      if (groundH && groundH > 0) {
        const t = needSample[i]
        t.groundElevation = Math.round(groundH)
        fetch(`${BACKEND}/api/stations/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...t, groundElevation: t.groundElevation }),
        }).catch(() => {})
      }
    }
  } catch (e) {
    console.warn('地形采样失败:', e)
  }
}

function clearWatchtowerBillboards() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  watchtowerBillboardEntities.forEach(e => viewer.entities.remove(e))
  watchtowerBillboardEntities = []
  watchtowerPulseEntities.forEach(e => viewer.entities.remove(e))
  watchtowerPulseEntities = []
  if (watchtowerPulseHandler && viewer) {
    viewer.scene.postRender.removeEventListener(watchtowerPulseHandler)
    watchtowerPulseHandler = null
  }
  watchtowerPulseCanvas = null
}

// 创建发光标记图标 Canvas，支持 diamond / circle / hexagon 三种形状
function createGlowMarkerIcon(color, shape) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const cx = size / 2
  const cy = size / 2

  const glowGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 56)
  glowGrad.addColorStop(0, color + 'cc')
  glowGrad.addColorStop(0.2, color + '44')
  glowGrad.addColorStop(0.5, color + '11')
  glowGrad.addColorStop(1, color + '00')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  ctx.shadowColor = color
  ctx.shadowBlur = 12

  if (shape === 'diamond') {
    ctx.beginPath()
    ctx.moveTo(cx, cy - 12)
    ctx.lineTo(cx + 10, cy)
    ctx.lineTo(cx, cy + 12)
    ctx.lineTo(cx - 10, cy)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.shadowBlur = 0
    ctx.stroke()
  } else if (shape === 'hexagon') {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6
      const r = 11
      i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
        : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.shadowBlur = 0
    ctx.stroke()
  } else if (shape === 'tower') {
    ctx.lineWidth = 2
    ctx.shadowBlur = 12
    ctx.strokeStyle = color
    ctx.fillStyle = color

    const baseY = cy + 12
    const bodyTop = cy - 4
    const roofPeak = cy - 18

    ctx.beginPath()
    ctx.moveTo(cx - 5, bodyTop)
    ctx.lineTo(cx - 5, baseY)
    ctx.lineTo(cx + 5, baseY)
    ctx.lineTo(cx + 5, bodyTop)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - 9, bodyTop)
    ctx.lineTo(cx, roofPeak)
    ctx.lineTo(cx + 9, bodyTop)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - 8, baseY)
    ctx.lineTo(cx - 8, baseY + 5)
    ctx.lineTo(cx + 8, baseY + 5)
    ctx.lineTo(cx + 8, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.strokeStyle = color
    ctx.lineWidth = 1.2
    ctx.setLineDash([2, 2])
    const arcCX = cx
    const arcCY = roofPeak
    ;[10, 14, 18].forEach(r => {
      ctx.beginPath()
      ctx.arc(arcCX, arcCY, r, Math.PI, 0, false)
      ctx.stroke()
    })
    ctx.setLineDash([])
  } else {
    ctx.clearRect(0, 0, size, size)
    ctx.shadowBlur = 0

    const tightGlow = ctx.createRadialGradient(cx, cy, 6, cx, cy, 16)
    tightGlow.addColorStop(0, color + '66')
    tightGlow.addColorStop(1, color + '00')
    ctx.fillStyle = tightGlow
    ctx.fillRect(0, 0, size, size)

    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, 10, 0, Math.PI * 2)
    ctx.strokeStyle = color + '55'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fill()
  }

  return canvas
}

async function drawDeyangBoundary() {
  clearDeyangBoundary()
  const viewer = viewerStore.viewer
  if (!viewer) return
  try {
    const ds = await Cesium.GeoJsonDataSource.load('/deyang_boundary.json', {
      stroke: Cesium.Color.fromCssColorString('#f59e0b'),
      fill: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.08),
      strokeWidth: 2,
      clampToGround: true,
    })
    deyangBoundaryDS = ds
    viewer.dataSources.add(ds)
  } catch (e) {
    console.warn('德阳边界加载失败:', e)
  }
}

function clearDeyangBoundary() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  if (deyangBoundaryDS) {
    viewer.dataSources.remove(deyangBoundaryDS, true)
    deyangBoundaryDS = null
  }
}

async function drawCityBoundaries() {
  clearCityBoundaries()
  const viewer = viewerStore.viewer
  if (!viewer) return
  const cityFiles = [
    { file: '/chengdu_boundary.json', color: '#94a3b8' },
    { file: '/mianyang_boundary.json', color: '#94a3b8' },
    { file: '/aba_boundary.json', color: '#94a3b8' },
  ]
  for (const city of cityFiles) {
    try {
      const ds = await Cesium.GeoJsonDataSource.load(city.file, {
        stroke: Cesium.Color.fromCssColorString(city.color),
        fill: Cesium.Color.fromCssColorString(city.color).withAlpha(0.25),
        strokeWidth: 2,
        clampToGround: true,
      })
      cityBoundaryDSList.push(ds)
      viewer.dataSources.add(ds)
    } catch (e) {
      console.warn(`${city.file} 加载失败:`, e)
    }
  }
}

function clearCityBoundaries() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  cityBoundaryDSList.forEach(ds => viewer.dataSources.remove(ds, true))
  cityBoundaryDSList.length = 0
}

watch(() => store.selectedEarthquake, (val) => {
  if (val) {
    drawEpicenter()
    const viewer = viewerStore.viewer
    if (viewer) {
      flyToAOI(viewer, { lon: val.lon, lat: val.lat, height: 60000 })
    }
  }
})

onMounted(async () => {
  const viewer = viewerStore.viewer
  if (!viewer) return

  // 调试：在控制台输入 __dumpCamera() 打印当前相机参数
  window.__dumpCamera = () => {
    const c = viewer.camera
    const cartographic = Cesium.Cartographic.fromCartesian(c.position)
    const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)
    const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)
    const height = Math.round(cartographic.height)
    const heading = Cesium.Math.toDegrees(c.heading).toFixed(1)
    const pitch = Cesium.Math.toDegrees(c.pitch).toFixed(1)
    const roll = Cesium.Math.toDegrees(c.roll).toFixed(1)
    console.log(`destination: Cesium.Cartesian3.fromDegrees(${lon}, ${lat}, ${height}),`)
    console.log(`orientation: { heading: Cesium.Math.toRadians(${heading}), pitch: Cesium.Math.toRadians(${pitch}), roll: Cesium.Math.toRadians(${roll}) },`)
  }

  viewer.scene.globe.enableLighting = false
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50

  viewer.container.addEventListener('contextmenu', onMapRightClick)
  document.addEventListener('click', hideContextMenu)

  // 从后端加载监测站（如果后端不可用，会保持 store 中的空数组或默认值）
  await store.loadWatchtowersFromBackend()

  await setupVehicles(viewer)
  await startSimulation()
  viewer.clock.shouldAnimate = true
  cameraLocked.value = true

  const path = vehicleSlots.value[0]?.path
  if (path && path.length >= 2) {
    const midLat = (path[0][0] + path[path.length - 1][0]) / 2
    const midLng = (path[0][1] + path[path.length - 1][1]) / 2
    flyToAOI(viewer, { lon: midLng, lat: midLat, height: 900 })
  } else {
    flyToAOI(viewer, { lon: demoData.epicenter.lon, lat: demoData.epicenter.lat, height: 60000 })
  }

  drawFlood()
  drawDeyangBoundary()
  drawCityBoundaries()
  drawEpicenterMarker()
  drawWatchtowerBillboards()


})

onBeforeUnmount(() => {
  clearInterval(tipTimer)
  const viewer = viewerStore.viewer
  if (viewer) {
    viewer.container.removeEventListener('contextmenu', onMapRightClick)
  }
  document.removeEventListener('click', hideContextMenu)
  closeViewshed()
  closeAllFloods()
  teardownVehicles()
  stopPerf(viewer)
  clearFlood()
  clearEpicenter()
  clearEpicenterMarker()
  clearWatchtowerBillboards()
  clearDeyangBoundary()
  clearCityBoundaries()
  clearAll()
  watchtowers.value.forEach(s => {
    if (s._coverageEntities) {
      s._coverageEntities.forEach(e => viewerStore.viewer?.entities.remove(e))
      s._coverageEntities = []
    }
  })
})
</script>

<style scoped>
.dashboard {
  position: relative;
  min-height: 100vh;
  pointer-events: none;
}

.left-panel {
  position: absolute;
  left: 16px;
  top: 16px;
  width: 300px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: auto;
}

.panel-header {
  padding: 0 4px;
}

.platform-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
  margin: 0;
}

.area-card {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.card-icon {
  font-size: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.info-label {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.info-value {
  color: rgba(255, 255, 255, 0.8);
  text-align: right;
}

.info-value.count {
  color: #4ade80;
  font-weight: 600;
}

.info-value.danger {
  color: #f87171;
  font-weight: 600;
}

.control-card {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  min-width: 55px;
  flex-shrink: 0;
}

.control-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.control-select {
  flex: 1;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.control-select option {
  background: #1e293b;
  color: #e2e8f0;
}

.control-input {
  width: 0;
  flex: 1;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 11px;
  outline: none;
}

.control-input.short {
  flex: 0.5;
}

.control-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.control-btn {
  padding: 5px 10px;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  color: #4ade80;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(74, 222, 128, 0.25);
}

.control-btn.primary {
  width: 100%;
  padding: 8px 0;
  font-size: 13px;
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}
.control-btn.primary:hover {
  background: rgba(59, 130, 246, 0.25);
}

.control-row input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.control-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4ade80;
  border: 2px solid rgba(15, 23, 42, 0.8);
  cursor: pointer;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat-card {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 14px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: rgba(74, 222, 128, 0.3);
  box-shadow: 0 0 16px rgba(74, 222, 128, 0.08);
}

.stat-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-number {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.tip-bar {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 8px 20px;
  transition: opacity 0.5s;
}

.tip-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}

.panel-empty {
  text-align: center;
  padding: 24px 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.6;
}

.bottom-bar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
}

.toggle-group {
  display: flex;
  gap: 8px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 6px 8px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 18px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.toggle-btn:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.06);
}

.toggle-btn.active {
  color: #fff;
  background: rgba(74, 222, 128, 0.15);
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.15);
}

.toggle-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.stat-card.clickable {
  cursor: pointer;
}

.right-panel {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 280px;
  max-height: calc(100vh - 60px);
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transform: translateX(calc(100% + 32px));
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
  z-index: 20;
}

.right-panel.visible {
  transform: translateX(0);
  opacity: 1;
}

.vehicle-panel {
  top: 16px;
  max-height: calc(100vh - 60px);
}

/* ========== 摘要面板 ========== */
.summary-panel {
  top: 16px;
  max-height: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.summary-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
}

.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

/* ========== 洪水面板 ========== */
.flood-panel {
  top: 16px;
  max-height: 260px;
}

.flood-list {
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
}

.right-panel .panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.right-panel .panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.vehicle-list {
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.vehicle-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.vehicle-card:hover {
  background: rgba(255, 255, 255, 0.06);
}

.vehicle-card.active {
  background: rgba(74, 222, 128, 0.08);
  border-left-color: #4ade80 !important;
}

.vehicle-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.vehicle-info {
  flex: 1;
  min-width: 0;
}

.vehicle-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vehicle-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

.stat-sep {
  color: rgba(255, 255, 255, 0.15);
}

.vehicle-track-icon {
  font-size: 14px;
  flex-shrink: 0;
}

/* ========== 速度控制 ========== */

.speed-control {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.speed-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.speed-control input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.speed-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4ade80;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
}

.speed-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
  min-width: 50px;
  text-align: right;
}

.context-menu {
  position: fixed;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 8px;
  padding: 4px;
  min-width: 160px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.ctx-item:hover {
  background: rgba(59, 130, 246, 0.2);
}

.ctx-item.danger {
  color: #f87171;
}

.ctx-item.danger:hover {
  background: rgba(248, 113, 113, 0.15);
}

.flood-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 12px;
}

.flood-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 6px;
}

.flood-card-title {
  flex: 1;
  font-weight: 500;
}

.flood-card-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.flood-card-status.running {
  background: rgba(250, 204, 21, 0.15);
  color: #facc15;
  animation: pulse-text 1s ease-in-out infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.flood-card-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  line-height: 1;
}

.flood-card-close:hover {
  color: rgba(255, 255, 255, 0.8);
}

.flood-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flood-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.flood-stat-label {
  color: rgba(255, 255, 255, 0.45);
}

.flood-stat-value {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}
</style>

<style>
.village-marker {
  position: absolute;
  pointer-events: auto;
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
  opacity: 0;
  color: #fff;
  font-size: 12px;
  font-family: 'Microsoft YaHei', sans-serif;
  text-shadow: 0 0 4px #000, 0 0 4px #000;
  white-space: nowrap;
}
.village-marker:hover .village-label {
  opacity: 1;
}
.village-dot {
  position: absolute;
  pointer-events: auto;
  z-index: 200;
  transform: translate(-50%, -50%);
  cursor: pointer;
}
.village-dot-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f97316;
  border: 2px solid #fff;
  box-shadow: 0 0 6px rgba(249, 115, 22, 0.6);
}
.village-dot-tip {
  display: none;
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  margin-bottom: 4px;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 12px;
  font-family: 'Microsoft YaHei', sans-serif;
  white-space: nowrap;
  border-radius: 4px;
  pointer-events: none;
}

/* ========== 监测站管理面板 ========== */
.station-manage-panel {
  top: 16px;
  max-height: calc(100vh - 60px);
  width: 320px;
}

.station-manage-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

.station-add-btn {
  padding: 10px 16px;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  color: #4ade80;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.station-add-btn:hover {
  background: rgba(74, 222, 128, 0.25);
}

.station-manage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.station-manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.station-manage-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.station-manage-row.editing {
  border-color: rgba(74, 222, 128, 0.4);
  background: rgba(74, 222, 128, 0.08);
}

.station-row-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  cursor: pointer;
}

.station-row-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.station-row-color.seismic {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.station-row-color.hazard {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
}

.station-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.station-row-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.station-row-type {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.station-row-actions {
  display: flex;
  gap: 6px;
}

.station-action-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.station-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.station-action-btn.edit:hover {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.station-action-btn.del:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.station-form {
  padding: 16px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.station-form-title {
  font-size: 14px;
  font-weight: 600;
  color: #4ade80;
  margin-bottom: 4px;
}

.station-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.station-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  grid-column: span 2;
}

.station-field.half {
  grid-column: span 1;
}

.station-field.full {
  grid-column: span 2;
}

.station-field span {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.station-field input,
.station-field select,
.station-field textarea {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

.station-field input:focus,
.station-field select:focus,
.station-field textarea:focus {
  border-color: rgba(74, 222, 128, 0.4);
  background: rgba(255, 255, 255, 0.08);
}

.station-field textarea {
  resize: vertical;
  min-height: 60px;
}

.station-form-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.station-form-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.station-form-btn.cancel {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

.station-form-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.12);
}

.station-form-btn.save {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.station-form-btn.save:hover {
  background: rgba(74, 222, 128, 0.25);
}

.panel-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.panel-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.manage-btn {
  border: 1px solid rgba(74, 222, 128, 0.2);
}

.manage-btn.active {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.4);
}

.data-entry-btn {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  z-index: 999;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
}

.data-entry-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
  transform: scale(1.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
</style>