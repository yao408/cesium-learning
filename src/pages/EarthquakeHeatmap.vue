<template>
  <div class="earthquake-page">
    <aside class="sidebar" :class="{ collapsed }">
      <div class="panel-header">
        <h2>🌋 地震活动监测</h2>
        <p class="subtitle">数据来源：USGS 地震监测</p>
      </div>

      <div v-show="!collapsed" class="panel-body">
      <div class="panel">
        <span class="label">🕐 时间范围</span>
        <select v-model="timeRange" @change="fetchData">
          <option value="hour">过去 1 小时</option>
          <option value="day">过去 24 小时</option>
          <option value="week">过去 7 天</option>
          <option value="month">过去 30 天</option>
        </select>
      </div>

      <div class="panel">
        <span class="label">📊 震级筛选</span>
        <div class="range-row">
          <input type="range" v-model.number="minMag" min="0" max="6" step="0.5" />
          <span>&ge; {{ minMag.toFixed(1) }} 级</span>
        </div>
      </div>

      <div class="panel">
        <span class="label">🎨 底图风格</span>
        <select v-model="mapStyle" @change="switchStyle">
          <option value="ion">Bing 卫星</option>
          <option value="gaode">高德地图</option>
        </select>
      </div>

      <div class="stats">
        <p>📡 共 <strong>{{ quakes.length }}</strong> 条地震记录</p>
        <p v-if="quakes.length">🔺 最大震级: <strong>{{ maxMag.toFixed(1) }}</strong></p>
        <p v-if="quakes.length">📍 最近: <strong>{{ latestPlace }}</strong></p>
        <div v-if="selectedQuake" class="selected-info">
          <p>✅ 已选中震中</p>
          <p>{{ selectedQuake.lat.toFixed(4) }}°N, {{ selectedQuake.lon.toFixed(4) }}°E</p>
          <p class="hint">已联动数据接入模块</p>
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as Cesium from 'cesium'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useViewerStore } from '../stores/viewerStore.js'

const store = useScenarioStore()
const viewerStore = useViewerStore()

const collapsed = ref(false)
const timeRange = ref('week')
const minMag = ref(2.5)
const mapStyle = ref('gaode')
const quakes = ref([])

let viewer = null
let currentBaseLayer = null
let quakeEntities = []
let clusterEntities = []
let glowEntities = []
let clickHandler = null
let selectedEntity = null
let _pulseEntity = null
let selectedQuake = ref(null)
let cameraMoveHandler = null
let lastCameraHeight = 0
let lastScaleHeight = 0
let hoverHandler = null
let hoveredEntity = null
let scaleHandler = null
let tooltipEl = null

const maxMag = computed(() => {
  if (!quakes.value.length) return 0
  return Math.max(...quakes.value.map(q => q.mag))
})

const latestPlace = computed(() => {
  if (!quakes.value.length) return '-'
  const sorted = [...quakes.value].sort((a, b) => b.time - a.time)
  return sorted[0].place || '未知'
})

function getStartTime() {
  const now = new Date()
  const offsets = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 }
  return new Date(now.getTime() - offsets[timeRange.value]).toISOString()
}

async function fetchData() {
  try {
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${getStartTime()}`
    const res = await fetch(url)
    const data = await res.json()
    quakes.value = data.features.map(f => ({
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      mag: f.properties.mag,
      depth: f.geometry.coordinates[2],
      place: f.properties.place,
      time: f.properties.time
    }))
    store.setEarthquakeData(quakes.value)
  updateQuakes()
  initClickHandler()
  } catch (e) {
    console.error('地震数据获取失败:', e)
  }
}

function magToColor(mag) {
  if (mag < 2) return Cesium.Color.fromCssColorString('rgba(33,102,172,1)')
  if (mag < 3) return Cesium.Color.fromCssColorString('rgba(103,169,207,1)')
  if (mag < 4) return Cesium.Color.fromCssColorString('rgba(209,229,92,1)')
  if (mag < 5) return Cesium.Color.fromCssColorString('rgba(253,219,102,1)')
  if (mag < 6) return Cesium.Color.fromCssColorString('rgba(239,138,52,1)')
  return Cesium.Color.fromCssColorString('rgba(215,48,39,1)')
}

function magToCssColor(mag) {
  const c = magToColor(mag)
  return `rgba(${Math.round(c.red*255)},${Math.round(c.green*255)},${Math.round(c.blue*255)},1)`
}

function clearQuakeEntities() {
  if (viewer) {
    quakeEntities.forEach(e => viewer.entities.remove(e))
    clusterEntities.forEach(e => viewer.entities.remove(e))
    glowEntities.forEach(e => viewer.entities.remove(e))
  }
  quakeEntities = []
  clusterEntities = []
  glowEntities = []
}

function getGridCell(lon, lat, cellSize) {
  return {
    col: Math.floor(lon / cellSize),
    row: Math.floor(lat / cellSize),
  }
}

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function pointInPolygon(lon, lat, polygon) {
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

function findNearest(lon, lat, items, getLng, getLat) {
  if (!items || !items.length) return null
  let best = null
  let bestDist = Infinity
  items.forEach(item => {
    const d = haversineKm(lon, lat, getLng(item), getLat(item))
    if (d < bestDist) { bestDist = d; best = item }
  })
  return best ? { item: best, dist: bestDist } : null
}

function clusterQuakes(quakes, cellSize) {
  const groups = {}
  quakes.forEach(q => {
    const key = `${getGridCell(q.lon, q.lat, cellSize).col}_${getGridCell(q.lon, q.lat, cellSize).row}`
    if (!groups[key]) groups[key] = []
    groups[key].push(q)
  })
  return Object.values(groups).filter(g => g.length > 0)
}

function buildClusterEntities(filtered) {
  if (!viewer) return
  clusterEntities.forEach(e => viewer.entities.remove(e))
  clusterEntities = []

  const cellSize = lastCameraHeight > 500000 ? 2 : 0.5
  const groups = clusterQuakes(filtered, cellSize)

  groups.forEach((group, idx) => {
    const maxMagVal = Math.max(...group.map(q => q.mag))
    const avgLon = group.reduce((s, q) => s + q.lon, 0) / group.length
    const avgLat = group.reduce((s, q) => s + q.lat, 0) / group.length
    const cylHeight = 80000
    const radius = 30000
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(avgLon, avgLat, cylHeight / 2),
      cylinder: {
        length: cylHeight,
        topRadius: radius,
        bottomRadius: radius,
        material: magToColor(maxMagVal),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      show: false,
    })
    entity._quakeData = { lon: avgLon, lat: avgLat, mag: maxMagVal, depth: group[0].depth, place: group[0].place, time: group[0].time }
    clusterEntities.push(entity)
  })
}

function buildIndividualEntities(filtered) {
  if (!viewer) return
  quakeEntities.forEach(e => viewer.entities.remove(e))
  quakeEntities = []

  filtered.forEach(q => {
    const cylHeight = 25000
    const radius = 1000
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(q.lon, q.lat, cylHeight / 2),
      cylinder: {
        length: cylHeight,
        topRadius: radius,
        bottomRadius: radius,
        material: magToColor(q.mag),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      show: false,
    })
    entity._quakeData = { lon: q.lon, lat: q.lat, mag: q.mag, depth: q.depth, place: q.place, time: q.time }
    entity._baseColor = magToColor(q.mag).clone()
    quakeEntities.push(entity)
  })
}

function syncShowByCamera() {
  if (!viewer) return
  const h = viewer.camera.positionCartographic.height
  const isCluster = h > 160000
  clusterEntities.forEach(e => { e.show = isCluster })
  quakeEntities.forEach(e => { e.show = !isCluster })
}

function startPulse(entity) {
  if (!entity || !entity._baseColor || !viewer) return
  stopPulse()
  const r = entity._baseColor.red
  const g = entity._baseColor.green
  const b = entity._baseColor.blue
  const pos = entity.position.getValue(viewer.clock.currentTime)
  const colorProp = new Cesium.CallbackProperty(function (time) {
    const t = time.secondsOfDay * 3
    const pulse = 0.5 + 0.5 * Math.sin(t)
    return new Cesium.Color(r, g, b, 0.35 + 0.65 * pulse)
  }, false)
  _pulseEntity = viewer.entities.add({
    position: pos,
    cylinder: {
      length: 25000,
      topRadius: 1200,
      bottomRadius: 1200,
      material: new Cesium.ColorMaterialProperty(colorProp),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    show: true,
  })
  _pulseEntity._pulseColorProp = colorProp
}

function stopPulse() {
  if (_pulseEntity) {
    viewer.entities.remove(_pulseEntity)
    _pulseEntity = null
  }
}

function syncCylinderScale() {
  return
}

function updateQuakes() {
  if (!viewer) return
  const display = quakes.value.filter(q => q.mag >= minMag.value)
  buildClusterEntities(display)
  buildIndividualEntities(display)
  syncShowByCamera()
  syncCylinderScale()
}

function switchStyle() {
  if (!viewer) return
  if (currentBaseLayer) {
    viewer.imageryLayers.remove(currentBaseLayer, true)
    currentBaseLayer = null
  }
  if (mapStyle.value === 'gaode') {
    currentBaseLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        subdomains: ['1', '2', '3', '4'],
        minimumLevel: 3,
        maximumLevel: 18,
      }),
      0
    )
  }
}

watch(minMag, updateQuakes)

function initClickHandler() {
  if (!viewer) return
  if (clickHandler) return
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
  clickHandler.setInputAction(async (click) => {
    const picked = viewer.scene.pick(click.position)
    if (!Cesium.defined(picked) || !picked.id) return
    const entity = picked.id
    const cartographic = Cesium.Cartographic.fromCartesian(entity.position.getValue(
      viewer.clock.currentTime
    ))
    const lon = Cesium.Math.toDegrees(cartographic.longitude)
    const lat = Cesium.Math.toDegrees(cartographic.latitude)
    selectedQuake.value = { lon, lat }
    selectedEntity = entity
    startPulse(entity)
    store.setSelectedEarthquake({ lon, lat })
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function showTooltip(data, screenPos) {
  const village = findNearest(data.lon, data.lat, store.hazards || [],
    h => h.lng !== undefined ? h.lng : h.coords?.[0],
    h => h.lat !== undefined ? h.lat : h.coords?.[1])
  const tower = findNearest(data.lon, data.lat, store.watchtowers || [],
    t => t.lng, t => t.lat)
  let dispatchDist = '—'
  if (store.dispatchCenter) {
    const d = haversineKm(data.lon, data.lat, store.dispatchCenter.lng, store.dispatchCenter.lat)
    dispatchDist = d < 1 ? '<1km' : `${Math.round(d)}km`
  }
  let inFlood = '—'
  if (store.floodPolygon && store.floodPolygon.length > 0) {
    inFlood = pointInPolygon(data.lon, data.lat, store.floodPolygon) ? '是' : '否'
  }
  const timeStr = data.time ? new Date(data.time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.className = 'quake-tooltip'
    tooltipEl.innerHTML = '<div class="tooltip-header"><span class="mag-badge"></span><span class="depth"></span></div>' +
      '<div class="tooltip-row place"></div><div class="tooltip-row time"></div>' +
      '<div class="tooltip-divider"></div>' +
      '<div class="tooltip-row village"></div><div class="tooltip-row tower"></div>' +
      '<div class="tooltip-row dispatch"></div><div class="tooltip-row flood"></div>'
    viewer.container.appendChild(tooltipEl)
  }
  const el = tooltipEl
  el.style.left = (screenPos.x + 15) + 'px'
  el.style.top = (screenPos.y - 10) + 'px'
  el.style.display = 'block'
  el.querySelector('.mag-badge').style.background = magToCssColor(data.mag)
  el.querySelector('.mag-badge').textContent = 'M' + data.mag.toFixed(1)
  el.querySelector('.depth').textContent = '深度 ' + (data.depth ? Math.round(data.depth) : '—') + 'km'
  el.querySelector('.place').textContent = '📍 ' + (data.place || '—')
  el.querySelector('.time').textContent = '🕐 ' + timeStr
  el.querySelector('.village').textContent = '🏘️ 最近村庄 ' + (village ? `${village.item.name || ''} ${Math.round(village.dist)}km` : '—')
  el.querySelector('.tower').textContent = '🗼 最近瞭望塔 ' + (tower ? `${tower.item.name || ''} ${Math.round(tower.dist)}km` : '—')
  el.querySelector('.dispatch').textContent = '🏢 距指挥中心 ' + dispatchDist
  const flood = el.querySelector('.flood')
  flood.textContent = '⚠️ 位于洪水区 ' + inFlood
  flood.className = 'tooltip-row flood' + (inFlood === '是' ? ' flood-danger' : '')
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none'
}

function initHoverHandler() {
  if (!viewer) return
  if (hoverHandler) return
  hoverHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
  hoverHandler.setInputAction((movement) => {
    const picked = viewer.scene.pick(movement.endPosition)
    if (Cesium.defined(picked) && picked.id && picked.id._quakeData) {
      if (hoveredEntity !== picked.id) {
        hoveredEntity = picked.id
        showTooltip(picked.id._quakeData, movement.endPosition)
      }
    } else {
      hideTooltip()
      hoveredEntity = null
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
}

onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return
  if (store.aoi) {
    const { minLat, maxLat, minLng, maxLng } = store.aoi
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
      duration: 1,
    })
  } else {
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 12000000),
    })
  }
  switchStyle()
  fetchData()
  initHoverHandler()

  if (!cameraMoveHandler) {
    cameraMoveHandler = viewer.scene.postRender.addEventListener(() => {
      const h = viewer.camera.positionCartographic.height
      const wasCluster = lastCameraHeight > 160000
      const isCluster = h > 160000
      if (wasCluster !== isCluster) {
        syncShowByCamera()
      }
      const wasCoarse = lastCameraHeight > 500000
      const isCoarse = h > 500000
      if (wasCoarse !== isCoarse) {
        const display = quakes.value.filter(q => q.mag >= minMag.value)
        buildClusterEntities(display)
        syncShowByCamera()
      }
      lastCameraHeight = h
      if (Math.abs(h - lastScaleHeight) > 100) {
        syncCylinderScale()
        lastScaleHeight = h
      }
    })
  }

  if (!scaleHandler) {
    scaleHandler = viewer.camera.moveEnd.addEventListener(syncCylinderScale)
    syncCylinderScale()
  }
})

onBeforeUnmount(() => {
  stopPulse()
  selectedEntity = null
  clearQuakeEntities()
  if (clickHandler) { clickHandler.destroy(); clickHandler = null }
  if (cameraMoveHandler) { cameraMoveHandler(); cameraMoveHandler = null }
  if (scaleHandler) { scaleHandler(); scaleHandler = null }
})
</script>

<style scoped>
.earthquake-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.sidebar {
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: 280px;
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
.sidebar.collapsed { left: -280px; box-shadow: none; }
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: rgba(45, 138, 78, 0.2); border-radius: 2px; }

.panel-header {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
  flex-shrink: 0;
}
.panel-header h2 { font-size: 14px; color: #2d8a4e; margin: 0 0 2px; font-weight: 700; }
.subtitle { font-size: 10px; color: #8b7e6a; margin: 1px 0; }

.panel-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}
.panel {
  display: flex; flex-direction: column; gap: 6px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid rgba(45, 138, 78, 0.08);
}
.label { font-size: 12px; color: #6b5e4a; font-weight: 500; }
select {
  padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(45, 138, 78, 0.2);
  background: rgba(255, 255, 255, 0.5); color: #3d3929; font-size: 12px; cursor: pointer;
}
.range-row {
  display: flex; align-items: center; gap: 8px; font-size: 12px; color: #5a4e3c;
}
.range-row input[type="range"] { flex: 1; accent-color: #f59e0b; }
.stats {
  margin-top: auto; padding: 10px; background: rgba(45, 138, 78, 0.06);
  border-radius: 8px; font-size: 12px; color: #6b5e4a; line-height: 1.8;
  border: 1px solid rgba(45, 138, 78, 0.08);
}
.stats strong { color: #e74c3c; }
.selected-info {
  margin-top: 6px; padding: 6px 8px;
  background: rgba(45, 138, 78, 0.1); border-radius: 6px;
  border: 1px solid rgba(45, 138, 78, 0.2);
}
.selected-info p { color: #2d8a4e; font-weight: 600; }
.selected-info .hint { font-size: 10px; color: #8b7e6a; font-weight: 400; }
.map-area { position: absolute; inset: 0; z-index: 0;pointer-events: none; }
.preset-btn {
  padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(45, 138, 78, 0.2);
  background: rgba(45, 138, 78, 0.06); color: #3d3929; font-size: 13px;
  cursor: pointer; transition: all 0.2s; font-weight: 500;
}
.preset-btn:hover { background: rgba(245, 158, 11, 0.08); border-color: #f59e0b; }
.preset-btn.active { background: #2d8a4e; border-color: #2d8a4e; color: #fff; }
.collapse-toggle {
  position: absolute;
  left: 292px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 101;
  pointer-events: auto;
  width: 24px;
  height: 48px;
  border-radius: 0 8px 8px 0;
  border: 1px solid rgba(45, 138, 78, 0.12);
  border-left: none;
  background: rgba(254, 252, 245, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 12px;
  cursor: pointer;
  color: #6b5e4a;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.collapse-toggle:hover {
  background: rgba(254, 252, 245, 0.95);
  color: #1a6b35;
}
</style>

<style>
.quake-tooltip {
  position: absolute;
  z-index: 200;
  pointer-events: none;
  min-width: 200px;
  padding: 10px 12px;
  background: rgba(30, 30, 30, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  font-size: 12px;
  line-height: 1.6;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.quake-tooltip .tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.quake-tooltip .mag-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
.quake-tooltip .depth {
  font-size: 11px;
  color: #aaa;
}
.quake-tooltip .tooltip-row {
  font-size: 11px;
  color: #ccc;
  margin-top: 2px;
}
.quake-tooltip .tooltip-divider {
  margin: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.quake-tooltip .flood-danger {
  color: #ef4444;
  font-weight: 600;
}
</style>