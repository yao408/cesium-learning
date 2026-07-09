<template>
  <div class="viewshed-page">
    <aside class="viewshed-panel" :class="{ collapsed }">
      <div class="panel-header">
        <h3>🔭 监测站选址</h3>
        <p class="hint">瞭望塔通视覆盖 · 盲区识别</p>
        <p class="hint coords" v-if="hoverInfo">经度 {{ hoverInfo.lon.toFixed(5) }} &nbsp; 纬度 {{ hoverInfo.lat.toFixed(5) }} &nbsp; 海拔 {{ hoverInfo.height.toFixed(1) }}m</p>
      </div>

      <div v-show="!collapsed" class="panel-body">

      <div class="panel">
        <span class="label">分析模式</span>
        <div class="style-toggle" style="margin-top:2px">
          <button @click="analysisMode='viewshed'" :class="{ active: analysisMode==='viewshed' }">📡 360° 扇区</button>
          <button @click="analysisMode='los'" :class="{ active: analysisMode==='los' }">🎯 点对点</button>
        </div>
      </div>

      <div class="panel">
        <div class="control-group">
          <label>瞭望塔高度 (高于地面 · 规范≥15m)</label>
          <div class="slider-row">
            <input type="range" v-model.number="observerHeight" min="5" max="80" step="5" />
            <span class="value">{{ observerHeight }} m</span>
          </div>
        </div>
        <div class="control-group" v-if="analysisMode!=='los'">
          <label>分析半径</label>
          <div class="slider-row">
            <input type="range" v-model.number="maxDistance" min="1000" :max="10000" step="500" />
            <span class="value">{{ (maxDistance/1000).toFixed(1) }} km</span>
          </div>
        </div>
        <div class="control-group" v-if="analysisMode==='viewshed'">
          <label>采样步长</label>
          <div class="slider-row">
            <input type="range" v-model.number="stepSize" min="10" max="500" step="5" />
            <span class="value">{{ stepSize }} m</span>
          </div>
          <div class="checkbox-label" style="margin-top:2px">
            <input type="checkbox" v-model="showOcclusionWalls" />
            显示遮挡墙
          </div>
          <div class="checkbox-label" style="margin-top:2px">
            <input type="checkbox" v-model="showFirePoints" />
            火点探测模拟
          </div>
          <div v-if="showFirePoints" style="margin-top:6px">
            <label>火点数量</label>
            <div class="slider-row">
              <input type="range" v-model.number="firePointCount" min="10" max="100" step="5" />
              <span class="value">{{ firePointCount }}</span>
            </div>
            <label>烟柱高度</label>
            <div class="slider-row">
              <input type="range" v-model.number="smokeHeight" min="10" max="150" step="5" />
              <span class="value">{{ smokeHeight }} m</span>
            </div>
          </div>
        </div>
        <div class="control-group" v-if="analysisMode==='los' && targetPoint">
          <label>目标点高度 (高于地面)</label>
          <div class="slider-row">
            <input type="range" v-model.number="targetHeight" min="0" max="200" step="5" />
            <span class="value">{{ targetHeight }} m</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <span class="label">瞭望塔点位 ({{ observerPoints.length }})</span>
        <div class="btn-group" style="margin-bottom:6px">
          <button @click="togglePickObserver" class="preset-btn" :class="{ active: pickObserver }">
            {{ pickObserver ? '🖱️ 选点中...' : '+ 添加瞭望塔' }}
          </button>
          <button @click="clearAllPoints" class="preset-btn btn-danger" :disabled="observerPoints.length===0">清空</button>
        </div>
        <div v-if="observerPoints.length" class="point-list">
          <div v-for="(p, i) in observerPoints" :key="i"
            :class="['point-item', { active: activeObserverIdx === i }]"
            @click="activeObserverIdx = i">
            <span class="point-dot" :style="{ background: p.color }"></span>
            <span class="point-name">{{ p.name || `塔${i+1}` }}</span>
            <span class="point-coord">{{ p.lat.toFixed(3) }}, {{ p.lon.toFixed(3) }}</span>
            <button @click.stop="removeObserverPoint(i)" class="btn-del">×</button>
          </div>
        </div>
        <p v-if="!observerPoints.length" class="hint">点击地图添加瞭望塔候选点</p>
        <button @click="runAnalysis" class="preset-btn" style="margin-top:6px;width:100%" :disabled="!canRunAnalysis || loading">
          {{ loading ? '⏳ 分析中...' : '🔄 分析' }}
        </button>
        <button @click="flyToActiveObserver" class="preset-btn" style="margin-top:4px;width:100%" :disabled="activeObserverPoint===null">
          👁️ 锁定瞭望塔视角
        </button>
        <button @click="removeLockCamera" class="preset-btn" style="margin-top:4px;width:100%">
          🔓 解锁视角
        </button>
        <p v-if="activeObserverPoint" class="hint" style="margin-top:2px">
          👁️ 当前塔: {{ activeObserverPoint.name || `经度${activeObserverPoint.lon.toFixed(2)} 纬度${activeObserverPoint.lat.toFixed(2)}` }}
        </p>
        <p v-if="activeObserverPoint" class="hint">塔高: {{ observerHeight }}m | 地面海拔: {{ activeObserverPoint.groundHeight?.toFixed(1) || '--' }} m</p>
        <p v-if="targetPoint" class="hint" style="margin-top:4px">
          🎯 目标点: {{ targetPoint.name || `经度${targetPoint.lon.toFixed(2)} 纬度${targetPoint.lat.toFixed(2)}` }}
        </p>
        <p v-if="targetPoint" class="hint">目标高度: {{ targetHeight }}m | 地面海拔: {{ targetPoint.groundHeight?.toFixed(1) || '--' }} m</p>
        <div v-if="losResult" class="los-result" :class="{ visible: losResult.visible }">
          <div class="los-icon">{{ losResult.visible ? '✅' : '❌' }}</div>
          <div class="los-text">
            <strong>{{ losResult.visible ? '可见！' : '被遮挡' }}</strong>
            <span v-if="!losResult.visible">遮挡位置距观察点 {{ losResult.blockDist?.toFixed(0) }} m</span>
            <span>两点距离 {{ losResult.totalDist?.toFixed(0) }} m</span>
          </div>
        </div>
      </div>

      <div class="panel" v-if="analysisMode==='viewshed'">
        <h4 class="collapsible" @click="toggleSection('preset')">快速预置 <span class="collapse-arrow">{{ sections.preset ? '▶' : '▼' }}</span></h4>
        <div v-show="!sections.preset" class="preset-btns">
          <button v-for="p in mountainPresets" :key="p.name" @click="addPresetPoint(p)" class="preset-btn">
            {{ p.name }}
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="info legend-compact">
          <span>🟢 可见</span>
          <span>🔴 遮挡</span>
          <span>🔵 瞭望塔</span>
          <span v-if="analysisMode==='viewshed' && showFirePoints">🟩 可探测</span>
          <span v-if="analysisMode==='viewshed' && showFirePoints">🟥 漏报</span>
          <span v-if="analysisMode==='los'">🟡 目标</span>
        </div>
      </div>

      <div class="panel" v-if="viewshedStats">
        <h4>📊 分析统计</h4>
        <div ref="chartRef" style="width: 100%; height: 180px"></div>
        <p class="hint" style="text-align:center; margin: 4px 0 0 0">
          总射线: {{ viewshedStats.totalRays }} | 可见 {{ viewshedStats.visibleDist }}km | 不可见 {{ viewshedStats.invisibleDist }}km
        </p>
        <p v-if="viewshedStats.fireTotal" class="hint" style="text-align:center; margin: 4px 0 0 0">
          🔥 火点: {{ viewshedStats.fireTotal }} | 可探测 {{ viewshedStats.fireDetected }} | 漏报 {{ viewshedStats.fireMissed }}
        </p>
      </div>

      <div v-if="store.blindSpots" class="panel" style="background: rgba(245, 158, 11, 0.06); border-left: 3px solid #f59e0b;">
        <h4 style="margin: 0 0 4px; font-size: 12px; color: #92400e;">🔭 盲区分析</h4>
        <div style="display: flex; gap: 12px; font-size: 11px;">
          <span>可见: <strong style="color: #2d8a4e;">{{ store.blindSpots.visibleKm }}km</strong></span>
          <span>盲区: <strong style="color: #e74c3c;">{{ store.blindSpots.invisibleKm }}km</strong></span>
          <span>瞭望塔: <strong>{{ (store.watchtowers || []).length }}座</strong></span>
        </div>
        <div v-if="blindVillageList.length" style="margin-top: 6px; font-size: 11px;">
          <span style="color: #e74c3c;">⚠️ 盲区村庄: </span>
          <span v-for="(v, i) in blindVillageList" :key="v">{{ v }}{{ i < blindVillageList.length - 1 ? '、' : '' }}</span>
        </div>
        <p v-else style="margin-top: 4px; font-size: 11px; color: #2d8a4e;">✅ 所有村庄均在瞭望塔覆盖范围内</p>
      </div>
    </div>
    </aside>
    <button class="collapse-toggle" @click="collapsed = !collapsed" :title="collapsed ? '展开面板' : '收起面板'">
      {{ collapsed ? '▶' : '◀' }}
    </button>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as Cesium from 'cesium'
import * as echarts from 'echarts'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useViewerStore } from '../stores/viewerStore.js'
import { haversineDistance } from '../utils/geo.js'

const store = useScenarioStore()
const viewerStore = useViewerStore()

const observerHeight = ref(20)
const maxDistance = ref(5000)
const stepSize = ref(100)
const analysisMode = ref('viewshed')
const pickObserver = ref(false)
const pickTarget = ref(false)
const observerPoints = ref([])
const activeObserverIdx = ref(0)
const targetPoint = ref(null)
const targetHeight = ref(0)
const losResult = ref(null)
const hoverInfo = ref(null)
const viewshedStats = ref(null)
const chartRef = ref(null)
const collapsed = ref(false)
const sections = reactive({ preset: true })
function toggleSection(key) { sections[key] = !sections[key] }
const loading = ref(false)
const showOcclusionWalls = ref(false)
const showFirePoints = ref(false)
const firePointCount = ref(30)
const smokeHeight = ref(50)

const COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#34d399', '#f87171']

const mountainPresets = [
  { name: '泰山玉皇顶', lon: 117.10, lat: 36.25 },
  { name: '华山南峰', lon: 110.09, lat: 34.49 },
  { name: '黄山天都峰', lon: 118.17, lat: 30.13 },
]
let viewer = null
let clickHandler = null
let hoverHandler = null
let chartInstance = null
let lastHoverTime = 0
let observerEntities = []
let targetEntity = null
let viewshedEntities = []
let wallEntities = []
let firePointEntities = []
let losEntities = []
let lockCameraListener = null
let watchtowerMarkers = []
let _watchtowerSyncHandler = null

const activeObserverPoint = computed(() => {
  if (observerPoints.value.length === 0) return null
  return observerPoints.value[activeObserverIdx.value] || null
})

const canRunAnalysis = computed(() => {
  if (analysisMode.value === 'los') return activeObserverPoint.value && targetPoint.value
  return activeObserverPoint.value
})

const blindVillageList = computed(() => {
  const villages = store.hazards || []
  const towers = store.watchtowers || []
  if (!towers.length) return []
  return villages.filter(v => {
    const vLon = v.lng ?? v.lon
    const vLat = v.lat
    if (vLon == null || vLat == null) return false
    return towers.every(t => {
      const tLon = t.lng ?? t.lon
      const tLat = t.lat
      if (tLon == null || tLat == null) return true
      return haversineDistance(vLat, vLon, tLat, tLon) > 5000
    })
  }).map(v => v.name || '未命名')
})

function updateChart() {
  if (!chartRef.value || !viewshedStats.value) return
  const { visibleDist, invisibleDist } = viewshedStats.value
  if (visibleDist + invisibleDist === 0) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} km ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['55%', '80%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: 'rgba(254,252,245,0.9)', borderWidth: 3 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: [
        { value: visibleDist, name: '可见距离', itemStyle: { color: '#4ade80' } },
        { value: invisibleDist, name: '不可见距离', itemStyle: { color: '#f87171' } },
      ],
    }],
  })
}

function clearAnalysis() {
  loading.value = false
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities = []
  wallEntities.forEach(e => viewer.entities.remove(e))
  wallEntities = []
  firePointEntities.forEach(e => viewer.entities.remove(e))
  firePointEntities = []
  losEntities.forEach(e => viewer.entities.remove(e))
  losEntities = []
  targetPoint.value = null
  losResult.value = null
  viewshedStats.value = null
  if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  cancelPick()
  resetCameraConstraints()
}

function clearAllPoints() {
  clearAnalysis()
  observerEntities.forEach(m => {
    m.el.remove()
    const wmIdx = watchtowerMarkers.indexOf(m)
    if (wmIdx >= 0) watchtowerMarkers.splice(wmIdx, 1)
  })
  observerEntities = []
  observerPoints.value = []
  activeObserverIdx.value = 0
}

function removeObserverPoint(idx) {
  if (observerEntities[idx]) {
    observerEntities[idx].el.remove()
    const wmIdx = watchtowerMarkers.indexOf(observerEntities[idx])
    if (wmIdx >= 0) watchtowerMarkers.splice(wmIdx, 1)
    observerEntities.splice(idx, 1)
  }
  observerPoints.value.splice(idx, 1)
  if (activeObserverIdx.value >= observerPoints.value.length) {
    activeObserverIdx.value = Math.max(0, observerPoints.value.length - 1)
  }
  clearAnalysis()
}

function cancelPick() {
  pickObserver.value = false
  pickTarget.value = false
  if (clickHandler) { clickHandler.destroy(); clickHandler = null }
}

function togglePickObserver() {
  if (pickObserver.value) { cancelPick(); return }
  cancelPick()
  pickObserver.value = true
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  clickHandler.setInputAction(async (click) => {
    const info = await getPickInfo(click)
    if (!info) return
    const idx = observerPoints.value.length
    const colorIdx = idx % COLORS.length
    const newPoint = {
      lon: info.lon, lat: info.lat,
      name: `瞭望塔${idx + 1}`,
      groundHeight: info.groundH,
      color: COLORS[colorIdx],
    }
    observerPoints.value.push(newPoint)
    activeObserverIdx.value = idx
    createObserverMarker(newPoint, idx)
    pickObserver.value = false
    clickHandler.destroy()
    clickHandler = null
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function togglePickTarget() {
  if (pickTarget.value) { cancelPick(); return }
  if (!activeObserverPoint.value) return
  cancelPick()
  pickTarget.value = true
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  clickHandler.setInputAction(async (click) => {
    const info = await getPickInfo(click)
    if (!info) return
    targetPoint.value = {
      lon: info.lon, lat: info.lat,
      name: `经度${info.lon.toFixed(2)} 纬度${info.lat.toFixed(2)}`,
      groundHeight: info.groundH,
    }
    createTargetMarker(info.lon, info.lat)
    pickTarget.value = false
    clickHandler.destroy()
    clickHandler = null
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

async function addPresetPoint(preset) {
  const groundH = await getHeightAtPosition(preset.lon, preset.lat)
  const idx = observerPoints.value.length
  const colorIdx = idx % COLORS.length
  const newPoint = { ...preset, groundHeight: groundH, color: COLORS[colorIdx] }
  observerPoints.value.push(newPoint)
  activeObserverIdx.value = idx
  createObserverMarker(newPoint, idx)
  flyToPoint(preset.lon, preset.lat)
}

function runAnalysis() {
  if (!activeObserverPoint.value) return
  store.setWatchtowers(observerPoints.value.map(p => ({ lon: p.lon, lat: p.lat, name: p.name, groundHeight: p.groundHeight })))
  if (analysisMode.value === 'viewshed') {
    recomputeViewshed()
  } else {
    if (!targetPoint.value) return
    computeLineOfSight()
  }
}

function recomputeViewshed() {
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities = []
  wallEntities.forEach(e => viewer.entities.remove(e))
  wallEntities = []
  firePointEntities.forEach(e => viewer.entities.remove(e))
  firePointEntities = []

  const points = observerPoints.value
  if (points.length === 0) return

  runAllViewsheds(points)
}

async function runAllViewsheds(points) {
  loading.value = true
  try {
    await Promise.all(points.map(p => computeViewshed(p.lon, p.lat, p.color)))
    if (showFirePoints.value) {
      await runFirePointSimulation(points)
    }
  } finally {
    loading.value = false
  }

  let totalDist = 0
  let visibleDist = 0
  viewshedEntities.forEach(e => {
    const c = e.polyline?.material?.color?.getValue()
    const isVisible = c && c.red < 0.3 && c.green > 0.5
    if (e.polyline && e.polyline.positions) {
      const positions = e.polyline.positions.getValue()
      if (positions && positions.length === 2) {
        const dist = Cesium.Cartesian3.distance(positions[0], positions[1])
        totalDist += dist
        if (isVisible) visibleDist += dist
      }
    }
  })
  viewshedStats.value = {
    totalRays: viewshedEntities.length,
    visibleDist: Math.round(visibleDist / 1000),
    invisibleDist: Math.round((totalDist - visibleDist) / 1000),
    totalDist: Math.round(totalDist / 1000),
  }
  store.setBlindSpots({ invisibleKm: Math.round((totalDist - visibleDist) / 1000), visibleKm: Math.round(visibleDist / 1000) })
  await nextTick()
  updateChart()
}

function createObserverMarker(point, idx) {
  if (observerEntities[idx]) {
    observerEntities[idx].el.remove()
    const wmIdx = watchtowerMarkers.indexOf(observerEntities[idx])
    if (wmIdx >= 0) watchtowerMarkers.splice(wmIdx, 1)
  }
  const el = document.createElement('div')
  el.className = 'village-marker'
  el.innerHTML = '<img src="./icons/observation-tower.svg" class="village-icon" alt="" /><span class="village-label">' + (point.name || '') + '</span>'
  viewer.container.appendChild(el)
  const marker = { el, position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat) }
  observerEntities[idx] = marker
  watchtowerMarkers.push(marker)
}

function createTargetMarker(lon, lat) {
  if (targetEntity) viewer.entities.remove(targetEntity)
  const groundH = targetPoint.value?.groundHeight || 0
  targetEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, groundH),
    point: {
      pixelSize: 12,
      color: Cesium.Color.GOLD,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.NONE,
    },
    label: {
      text: '目标点',
      font: '12px sans-serif',
      pixelOffset: new Cesium.Cartesian2(0, -20),
      showBackground: true,
      backgroundColor: Cesium.Color.GOLDENROD,
    },
  })
}

async function getHeightAtPosition(lon, lat) {
  const key = `${lon.toFixed(5)},${lat.toFixed(5)}`
  if (getHeightAtPosition._cache && getHeightAtPosition._cache.has(key)) {
    return getHeightAtPosition._cache.get(key)
  }
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat, 0)
  const result = await Cesium.sampleTerrain(viewer.terrainProvider, 12, [cartographic])
  const h = result[0].height || 0
  if (!getHeightAtPosition._cache) getHeightAtPosition._cache = new Map()
  getHeightAtPosition._cache.set(key, h)
  return h
}
getHeightAtPosition._cache = null

async function getPickInfo(click) {
  let cartesian = viewer.scene.pickPosition(click.position)
  if (!Cesium.defined(cartesian)) {
    const ray = viewer.camera.getPickRay(click.position)
    if (Cesium.defined(ray)) {
      try { cartesian = viewer.scene.globe.pick(ray, viewer.scene) } catch (e) {}
    }
  }
  if (!Cesium.defined(cartesian)) return null
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
  const lon = Cesium.Math.toDegrees(cartographic.longitude)
  const lat = Cesium.Math.toDegrees(cartographic.latitude)
  const groundH = await getHeightAtPosition(lon, lat)
  return { lon, lat, groundH }
}

async function handleMouseMove(movement) {
  const now = Date.now()
  if (now - lastHoverTime < 150) return
  lastHoverTime = now

  const cartesian = viewer.scene.pickPosition(movement.endPosition)
  if (!Cesium.defined(cartesian)) {
    hoverInfo.value = null
    return
  }
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
  const lon = Cesium.Math.toDegrees(cartographic.longitude)
  const lat = Cesium.Math.toDegrees(cartographic.latitude)
  const height = cartographic.height
  hoverInfo.value = { lon, lat, height }
}

async function computeViewshed(centerLon, centerLat, pointColor) {
  const groundHeight = await getHeightAtPosition(centerLon, centerLat)
  const totalHeight = groundHeight + observerHeight.value
  const steps = Math.floor(360 / 2)

  const angles = []
  for (let i = 0; i < steps; i++) {
    angles.push(Cesium.Math.toRadians(i * 2))
  }

  const BATCH_SIZE = 10
  for (let i = 0; i < angles.length; i += BATCH_SIZE) {
    const batch = angles.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(angle =>
      raycastAndDraw(centerLon, centerLat, totalHeight, angle, pointColor)
    ))
  }
}

async function raycastAndDraw(originLon, originLat, originHeight, angle, pointColor) {
  const step = stepSize.value
  const cosLat = Math.cos(Cesium.Math.toRadians(originLat))
  const visColor = Cesium.Color.fromCssColorString(pointColor || '#4ade80').withAlpha(0.5)
  const hidColor = Cesium.Color.RED.withAlpha(0.3)

  const samplePoints = []
  const numSteps = Math.floor(maxDistance.value / step)
  for (let i = 1; i <= numSteps; i++) {
    const dist = i * step
    const dLat = (dist / 111000) * Math.cos(angle)
    const dLon = (dist / (111000 * cosLat)) * Math.sin(angle)
    samplePoints.push({
      lon: originLon + dLon,
      lat: originLat + dLat,
      dist,
    })
  }

  if (samplePoints.length === 0) return

  const cartographics = samplePoints.map(p => Cesium.Cartographic.fromDegrees(p.lon, p.lat, 0))
  const results = await Cesium.sampleTerrain(viewer.terrainProvider, 12, cartographics)

  function drawSegment(endLon, endLat, visible) {
    const color = visible ? visColor : hidColor
    const entity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([segStartLon, segStartLat, endLon, endLat]),
        width: 2,
        material: color,
        clampToGround: true,
      },
    })
    viewshedEntities.push(entity)
  }

  let maxElevationAngle = -Infinity
  let prevVisible = true
  let segStartLon = originLon
  let segStartLat = originLat

  for (let i = 0; i < samplePoints.length; i++) {
    const terrainH = results[i].height || 0
    const dist = samplePoints[i].dist
    const elevationAngle = Math.atan2(terrainH - originHeight, dist)
    const visible = elevationAngle > maxElevationAngle

    if (visible) {
      maxElevationAngle = elevationAngle
    }

    if (visible !== prevVisible) {
      drawSegment(samplePoints[i].lon, samplePoints[i].lat, prevVisible)
      if (showOcclusionWalls.value && prevVisible && !visible) {
        addOcclusionWall(samplePoints[i].lon, samplePoints[i].lat, dist, angle, terrainH, maxElevationAngle, originHeight, cosLat)
      }
      segStartLon = samplePoints[i].lon
      segStartLat = samplePoints[i].lat
      prevVisible = visible
    }
  }

  const lastPoint = samplePoints[samplePoints.length - 1]
  drawSegment(lastPoint.lon, lastPoint.lat, prevVisible)
}

function addOcclusionWall(lon, lat, dist, rayAngle, terrainH, maxElevAngle, originHeight, cosLat) {
  const losH = originHeight + Math.tan(maxElevAngle) * dist
  if (losH <= terrainH + 2) return

  const halfWidth = stepSize.value * 0.8
  const perp = rayAngle + Math.PI / 2
  const dLatHalf = (halfWidth / 111000) * Math.cos(perp)
  const dLonHalf = (halfWidth / (111000 * cosLat)) * Math.sin(perp)

  wallEntities.push(viewer.entities.add({
    wall: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        lon - dLonHalf, lat - dLatHalf,
        lon + dLonHalf, lat + dLatHalf,
      ]),
      minimumHeights: [terrainH, terrainH],
      maximumHeights: [losH, losH],
      material: Cesium.Color.LIGHTGRAY.withAlpha(0.25),
      outline: true,
      outlineColor: Cesium.Color.GRAY.withAlpha(0.4),
    },
  }))
}

// ==================== 火点探测模拟 ====================
async function isPointVisibleFrom(fromLon, fromLat, fromHeight, toLon, toLat, toHeightAboveGround) {
  const dLat = (toLat - fromLat) * 111000
  const dLon = (toLon - fromLon) * 111000 * Math.cos(Cesium.Math.toRadians((fromLat + toLat) / 2))
  const totalDist = Math.sqrt(dLat * dLat + dLon * dLon)
  const sampleCount = Math.max(10, Math.floor(totalDist / 100))

  const samplePoints = []
  for (let i = 1; i <= sampleCount; i++) {
    const t = i / sampleCount
    samplePoints.push(Cesium.Cartographic.fromDegrees(
      fromLon + (toLon - fromLon) * t,
      fromLat + (toLat - fromLat) * t,
      0
    ))
  }

  const toCartographic = Cesium.Cartographic.fromDegrees(toLon, toLat, 0)
  const allCartographics = [...samplePoints, toCartographic]
  const results = await Cesium.sampleTerrain(viewer.terrainProvider, 12, allCartographics)
  const toGroundH = results[results.length - 1].height || 0
  const toTotalH = toGroundH + toHeightAboveGround

  for (let i = 0; i < sampleCount; i++) {
    const t = (i + 1) / sampleCount
    const terrainH = results[i].height || 0
    const losH = fromHeight + (toTotalH - fromHeight) * t
    if (terrainH > losH) return false
  }
  return true
}

async function runFirePointSimulation(towerPoints) {
  firePointEntities.forEach(e => viewer.entities.remove(e))
  firePointEntities = []

  if (towerPoints.length === 0) return

  const heights = []
  for (const p of towerPoints) {
    const gnd = await getHeightAtPosition(p.lon, p.lat)
    heights.push(gnd + observerHeight.value)
  }

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
  for (const p of towerPoints) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat)
    minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon)
  }
  const margin = maxDistance.value / 111000
  minLat -= margin; maxLat += margin
  const cosMid = Math.cos(Cesium.Math.toRadians((minLat + maxLat) / 2))
  minLon -= margin / cosMid
  maxLon += margin / cosMid

  const count = firePointCount.value
  let detected = 0, missed = 0

  const firePoints = []
  for (let i = 0; i < count; i++) {
    firePoints.push({
      lon: minLon + Math.random() * (maxLon - minLon),
      lat: minLat + Math.random() * (maxLat - minLat),
    })
  }

  for (const fp of firePoints) {
    let visible = false
    for (let i = 0; i < towerPoints.length; i++) {
      if (await isPointVisibleFrom(towerPoints[i].lon, towerPoints[i].lat, heights[i], fp.lon, fp.lat, smokeHeight.value)) {
        visible = true
        break
      }
    }

    const color = visible
      ? Cesium.Color.LIME.withAlpha(0.9)
      : Cesium.Color.RED.withAlpha(0.8)
    const label = visible ? '✓' : '✗'

    firePointEntities.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(fp.lon, fp.lat),
      point: {
        pixelSize: 8,
        color,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: label,
        font: '12px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    }))

    if (visible) detected++; else missed++
  }

  viewshedStats.value = {
    ...viewshedStats.value,
    fireTotal: count,
    fireDetected: detected,
    fireMissed: missed,
  }
}

// ==================== 点对点通视分析 ====================
async function computeLineOfSight() {
  losEntities.forEach(e => viewer.entities.remove(e))
  losEntities = []
  losResult.value = null

  const obs = activeObserverPoint.value
  const tgt = targetPoint.value
  if (!obs || !tgt) return

  const obsGround = await getHeightAtPosition(obs.lon, obs.lat)
  const tgtGround = await getHeightAtPosition(tgt.lon, tgt.lat)
  const obsHeight = obsGround + observerHeight.value
  const tgtHeight = tgtGround + targetHeight.value

  const dLat = (tgt.lat - obs.lat) * 111000
  const dLon = (tgt.lon - obs.lon) * 111000 * Math.cos(Cesium.Math.toRadians((obs.lat + tgt.lat) / 2))
  const totalDist = Math.sqrt(dLat * dLat + dLon * dLon)

  const sampleCount = Math.max(20, Math.floor(totalDist / 100))
  const samplePoints = []
  for (let i = 1; i <= sampleCount; i++) {
    const t = i / sampleCount
    samplePoints.push({
      lon: obs.lon + (tgt.lon - obs.lon) * t,
      lat: obs.lat + (tgt.lat - obs.lat) * t,
      t,
    })
  }

  const cartographics = samplePoints.map(p => Cesium.Cartographic.fromDegrees(p.lon, p.lat, 0))
  const results = await Cesium.sampleTerrain(viewer.terrainProvider, 12, cartographics)

  let blocked = false
  let blockDist = 0
  let blockLon = 0, blockLat = 0

  for (let i = 0; i < samplePoints.length; i++) {
    const terrainH = results[i].height || 0
    const t = samplePoints[i].t
    const losH = obsHeight + (tgtHeight - obsHeight) * t

    if (terrainH > losH) {
      blocked = true
      blockDist = totalDist * t
      blockLon = samplePoints[i].lon
      blockLat = samplePoints[i].lat
      break
    }
  }

  losResult.value = {
    visible: !blocked,
    blockDist,
    totalDist,
  }

  // 绘制通视线
  const lineColor = blocked ? Cesium.Color.RED.withAlpha(0.8) : Cesium.Color.GREEN.withAlpha(0.8)
  const lineWidth = blocked ? 3 : 4

  if (blocked) {
    // 可见段：绿色
    losEntities.push(viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([obs.lon, obs.lat, blockLon, blockLat]),
        width: 4,
        material: Cesium.Color.GREEN.withAlpha(0.8),
        clampToGround: true,
      },
    }))
    // 遮挡段：红色虚线
    losEntities.push(viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([blockLon, blockLat, tgt.lon, tgt.lat]),
        width: 3,
        material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.RED.withAlpha(0.6), dashLength: 8 }),
        clampToGround: true,
      },
    }))
    // 遮挡点标记
    losEntities.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(blockLon, blockLat),
      point: {
        pixelSize: 8,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: '遮挡点',
        font: '11px sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, -16),
        showBackground: true,
        backgroundColor: Cesium.Color.RED,
      },
    }))
  } else {
    // 全程可见：绿色粗线
    losEntities.push(viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([obs.lon, obs.lat, tgt.lon, tgt.lat]),
        width: 4,
        material: Cesium.Color.GREEN.withAlpha(0.8),
        clampToGround: true,
      },
    }))
  }

  // 飞到能看全两点的视角
  const midLon = (obs.lon + tgt.lon) / 2
  const midLat = (obs.lat + tgt.lat) / 2
  const camDist = Math.max(totalDist * 1.5, 5000)
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(midLon, midLat, camDist),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
    duration: 1.5,
  })
}

function flyToPoint(lon, lat) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 15000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
    duration: 2,
  })
}

function flyToActiveObserver() {
  const p = activeObserverPoint.value
  if (!p) return
  const groundH = p.groundHeight || 0
  const eyeHeight = groundH + observerHeight.value
  const pos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, eyeHeight)

  viewer.camera.flyTo({
    destination: pos,
    orientation: { heading: viewer.camera.heading, pitch: Cesium.Math.toRadians(0), roll: 0 },
    duration: 2.0,
    complete: () => {
      removeLockCamera()
      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(pos)
      viewer.camera.lookAtTransform(transform)
      viewer.scene.globe.maximumScreenSpaceError = 0.5
      const sc = viewer.scene.screenSpaceCameraController
      sc.enableZoom = false
      sc.enableTilt = false
      sc.enableTranslate = false
      sc.enableLook = true
      sc.minimumPitch = Cesium.Math.toRadians(0)
      sc.maximumPitch = Cesium.Math.toRadians(0)
    },
  })
}

function removeLockCamera() {
  if (lockCameraListener) {
    lockCameraListener()
    lockCameraListener = null
  }
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
  viewer.scene.globe.maximumScreenSpaceError = 2.0
  const sc = viewer.scene.screenSpaceCameraController
  sc.enableZoom = true
  sc.enableTilt = true
  sc.enableTranslate = true
  sc.enableLook = true
  sc.minimumPitch = Cesium.Math.toRadians(-90)
  sc.maximumPitch = Cesium.Math.toRadians(-0.5)
  sc.minimumZoomDistance = 100
  sc.maximumZoomDistance = Infinity
}

function resetCameraConstraints() {
  removeLockCamera()
}

function handleKeyDown(e) {
  if (e.key === 'f' || e.key === 'F') {
    if (!activeObserverPoint.value) return
    e.preventDefault()
    flyToActiveObserver()
  }
  if (e.key === 'Escape') {
    removeLockCamera()
    if (activeObserverPoint.value) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(activeObserverPoint.value.lon, activeObserverPoint.value.lat, 5000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
        duration: 1.5,
      })
    }
  }
}

function syncWatchtowerMarkers() {
  const v = viewerStore.viewer
  if (!v) return
  watchtowerMarkers.forEach(m => {
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

function clearWatchtowerMarkers() {
  watchtowerMarkers.forEach(m => m.el.remove())
  watchtowerMarkers = []
  if (_watchtowerSyncHandler) { _watchtowerSyncHandler(); _watchtowerSyncHandler = null }
}

onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return
  viewer.scene.setTerrain(
    new Cesium.Terrain(
      Cesium.CesiumTerrainProvider.fromIonAssetId(1),
    ),
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
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(117.10, 36.25, 20000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
    })
  }

  hoverHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  hoverHandler.setInputAction(handleMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  document.addEventListener('keydown', handleKeyDown)

  if (store.watchtowers && store.watchtowers.length > 0) {
    store.watchtowers.forEach((t, idx) => {
      const el = document.createElement('div')
      el.className = 'village-marker'
      el.innerHTML = '<img src="./icons/observation-tower.svg" class="village-icon" alt="" /><span class="village-label">' + (t.name || '') + '</span>'
      viewer.container.appendChild(el)
      watchtowerMarkers.push({ el, position: Cesium.Cartesian3.fromDegrees(t.lng ?? t.lon, t.lat) })
      observerPoints.value.push({
        lon: t.lng ?? t.lon,
        lat: t.lat,
        name: t.name,
        groundHeight: t.groundHeight ?? t.elevation ?? 0,
        color: COLORS[idx % COLORS.length],
      })
    })
  }
  if (store.hazards && store.hazards.length > 0) {
    store.hazards.forEach(v => {
      const el = document.createElement('div')
      el.className = 'village-marker'
      el.innerHTML = '<img src="./icons/village.svg" class="village-icon" alt="" /><span class="village-label">' + (v.name || '') + '</span>'
      viewer.container.appendChild(el)
      watchtowerMarkers.push({ el, position: Cesium.Cartesian3.fromDegrees(v.lng ?? v.lon, v.lat) })
    })
  }
  if (watchtowerMarkers.length > 0) {
    _watchtowerSyncHandler = viewer.scene.postRender.addEventListener(syncWatchtowerMarkers)
  }
})

onBeforeUnmount(() => {
  if (clickHandler) clickHandler.destroy()
  if (hoverHandler) hoverHandler.destroy()
  if (chartInstance) chartInstance.dispose()
  document.removeEventListener('keydown', handleKeyDown)
  clearAnalysis()
  clearWatchtowerMarkers()
  clickHandler = null
  hoverHandler = null
  chartInstance = null
  viewer = null
})
</script>

<style scoped>
.viewshed-page {
  position: relative;
  width: 100%;
  height: 100%;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: transparent;
  color: #3d3929;
  overflow: hidden;
  pointer-events: none;
}

.collapse-toggle {
  position: absolute;
  left: 296px;
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

.viewshed-panel {
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: 290px;
  z-index: 100;
  pointer-events: auto;
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
.viewshed-panel.collapsed {
  left: -290px;
  box-shadow: none;
}
.viewshed-panel.collapsed ~ .collapse-toggle {
  left: 12px;
}
.viewshed-panel::-webkit-scrollbar { width: 4px; }
.viewshed-panel::-webkit-scrollbar-thumb { background: rgba(45, 138, 78, 0.2); border-radius: 2px; }

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
.panel-header .hint.coords {
  font-size: 10px;
  color: #9b8e7a;
  margin-top: 2px;
  font-family: 'Consolas', 'Courier New', monospace;
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
  border: 1px solid rgba(45, 138, 78, 0.08);
}

.panel h3 {
  font-size: 12px;
  color: #2d8a4e;
  margin-bottom: 2px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
}

.panel h4 {
  font-size: 11px;
  color: #2d8a4e;
  margin: 0 0 4px;
}
.collapsible { cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center; }
.collapsible:hover { color: #1a6a3a; }
.collapse-arrow { font-size: 10px; opacity: 0.5; }
.legend-compact { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 11px; }
.legend-compact span { color: #5a4e3c; }

.hint {
  font-size: 10px;
  color: #8b7e6a;
  margin: 0;
}

.control-group {
  margin-bottom: 8px;
}
.control-group:last-child {
  margin-bottom: 0;
}

.control-group label {
  font-size: 11px;
  color: #6b5e4a;
  display: block;
  margin-bottom: 2px;
  font-weight: 500;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #5a4e3c !important;
  font-size: 11px;
}
.checkbox-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #2d8a4e;
  cursor: pointer;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.slider-row input[type="range"] {
  flex: 1;
  accent-color: #f59e0b;
  height: 4px;
}

.value {
  font-size: 11px;
  color: #f59e0b;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.preset-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.btn-group {
  display: flex;
  gap: 4px;
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
  flex: 1;
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
.preset-btn.btn-danger {
  background: rgba(231, 76, 60, 0.08);
  border-color: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}
.preset-btn.btn-danger:hover {
  background: rgba(231, 76, 60, 0.15);
}
.preset-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.label {
  font-size: 11px;
  color: #8b7e6a;
  display: block;
  font-weight: 500;
}

.info p {
  font-size: 12px;
  margin: 4px 0;
  color: #5a4e3c;
}

.point-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 200px;
  overflow-y: auto;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid transparent;
  transition: all 0.2s;
  font-size: 11px;
}
.point-item:hover { background: rgba(45, 138, 78, 0.06); }
.point-item.active { border-color: #2d8a4e; background: rgba(45, 138, 78, 0.08); }

.point-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}

.point-name {
  color: #3d3929;
  font-weight: 500;
  min-width: 40px;
}

.point-coord {
  color: #8b7e6a;
  font-size: 10px;
  flex: 1;
  text-align: right;
}

.btn-del {
  background: none; border: none; color: #e74c3c;
  font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1;
}
.btn-del:hover { color: #c0392b; }

.style-toggle {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.style-toggle button {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid rgba(45, 138, 78, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.4);
  color: #6b5e4a;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  font-weight: 500;
}
.style-toggle button:hover {
  border-color: #2d8a4e;
  color: #2d8a4e;
}
.style-toggle button.active {
  border-color: #2d8a4e;
  color: #fff;
  background: #2d8a4e;
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

.los-result {
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(45, 138, 78, 0.1);
}
.los-result.visible {
  border-color: #2d8a4e;
  background: rgba(45, 138, 78, 0.08);
}
.los-result:not(.visible) {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.06);
}

.los-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.los-text {
  font-size: 12px;
  color: #5a4e3c;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.los-text strong {
  font-size: 14px;
}
.los-result.visible .los-text strong {
  color: #2d8a4e;
}
.los-result:not(.visible) .los-text strong {
  color: #e74c3c;
}

.hover-panel {
  background: rgba(254, 252, 245, 0.7) !important;
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