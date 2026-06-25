<template>
  <div id="app">
    <header class="toolbar">
      <div class="toolbar-left">
        <h1>🌍 Cesium 3D 数字孪生平台</h1>
        <span class="badge">Cesium + Vue3</span>
      </div>
      <div class="toolbar-right">
        <button @click="toggleViewMode" class="btn btn-sm">
          {{ is3DMode ? '🗺️ 2D' : '🌍 3D' }}
        </button>
        <button v-if="isSimulating" @click="toggleCameraLock" class="btn btn-sm">
          {{ cameraLocked ? '🔓 解锁' : '🔒 锁定' }}
        </button>
        <button @click="flyToBeijing" class="btn btn-sm">📍 北京</button>
        <button @click="flyToShanghai" class="btn btn-sm">📍 上海</button>
        <span class="time">{{ systemTime }}</span>
      </div>
    </header>

    <div class="main-container">
      <ControlPanel
        :activeLayer="activeLayer"
        :drawingMode="drawingMode"
        :routeMode="routeMode"
        :routeStart="routeStart"
        :routeEnd="routeEnd"
        :routeOptions="routeOptions"
        :selectedRoute="selectedRoute"
        :userPath="userPath"
        :isSimulating="isSimulating"
        :isPaused="isPaused"
        :vehicleSpeed="vehicleSpeed"
        :vehicleProgress="vehicleProgress"
        :currentSegment="currentSegment"
        :measureMode="measureMode"
        :measureResult="measureResult"
        :is3DMode="is3DMode"
        :vehicleSlots="vehicleSlots"
        :activeSlotId="activeSlotId"
        @switchBaseLayer="switchBaseLayer"
        @startDrawing="startDrawing"
        @finishDrawing="finishDrawing"
        @clearUserPath="clearUserPath"
        @startSimulation="startSimulation"
        @pauseSimulation="pauseSimulation"
        @stopSimulation="stopSimulation"
        @update:vehicleSpeed="v => vehicleSpeed = v"
        @startMeasure="startMeasure"
        @clearMeasure="clearMeasure"
        @toggleViewMode="toggleViewMode"
        @startRoutePlanning="startRoutePlanning"
        @cancelRoutePlanning="cancelRoutePlanning"
        @selectRoute="selectRoute"
        @confirmRoute="confirmRoute"
        @addVehicle="addVehicleSlot"
        @removeVehicle="removeVehicleSlot"
        @switchVehicle="switchVehicleSlot"
        @updatePathColor="updatePathColor"
        @updatePathWidth="updatePathWidth"
        @updatePathOpacity="updatePathOpacity"
        @updatePathStyle="updatePathStyle"
        @updatePathOutlineWidth="updatePathOutlineWidth"
        @updatePathOutlineOpacity="updatePathOutlineOpacity"
      />

      <div id="map">
        <div ref="cesiumContainer" class="cesium-container"></div>
        <MapOverlay
          :showAlert="showAlert"
          :alertType="alertType"
          :alertMessage="alertMessage"
          :currentZone="currentZone"
          :roadCondition="roadCondition"
          :roadConditionText="roadConditionText"
        />
      </div>

      <InfoPanel
        :mouseLat="mouseLat"
        :mouseLng="mouseLng"
        :gcj02Display="gcj02Display"
        :mapZoom="mapZoom"
        :centerLat="centerLat"
        :centerLng="centerLng"
      />
    </div>

    <footer class="status-bar">
      <span>🟢 系统就绪</span>
      <span v-if="isSimulating">🚗 模拟中 | 速度: {{ vehicleSpeed }} km/h</span>
      <span v-if="measureMode">📏 测量模式: {{ measureMode === 'distance' ? '测距' : '测面积' }}</span>
      <span>© 2026 WebGIS Demo | Cesium 3D</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import * as Cesium from 'cesium'
import ControlPanel from './components/ControlPanel.vue'
import InfoPanel from './components/InfoPanel.vue'
import MapOverlay from './components/MapOverlay.vue'
import { wgs84ToGCJ02, destinationPoint, calcBearing, calcHeading, haversineDistance, calcPolygonArea } from './utils/geo.js'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesiumContainer = ref(null)
let viewer = null
let vehicleEntity = null
let osmBuildings = null
let drawingEntities = []
let measureEntities = []
let positionProperty = null
let mouseHandler = null
let clickHandler = null
let drawHandler = null
let clockTimer = null
let alertTimer = null

const activeLayer = ref('amap')
const measureMode = ref(null)
const drawingMode = ref(false)
const routeMode = ref(false)      // 路径规划模式：选起点→终点→自动获取真实道路
const routeStart = ref(null)      // 起点 { lat, lng }
const routeEnd = ref(null)        // 终点 { lat, lng }
const routeOptions = ref([])      // OSRM返回的多条路线
const selectedRoute = ref(0)      // 当前选中的路线索引
const userPath = ref([])
const isSimulating = ref(false)
const isPaused = ref(false)
const vehicleSpeed = ref(30)
const vehicleProgress = ref(0)
const currentSegment = ref('')
const mouseLat = ref(0)
const mouseLng = ref(0)
const mouseGCJ02 = ref({ lat: 0, lng: 0 })
const mapZoom = ref(13)
const centerLat = ref(39.9042)
const centerLng = ref(116.4074)
const measureResult = ref('')
const systemTime = ref('')
const is3DMode = ref(true)
const cameraMode = ref('bird') // 'bird' 俯视
const cameraLocked = ref(true)  // true=自动跟车，false=手动控制
const showAlert = ref(false)
const alertType = ref('info')
const alertMessage = ref('')
const currentZone = ref('')
const roadCondition = ref('畅通')

let vehicleHeading = 0

// 多车管理
const vehicleSlots = ref([])
const activeSlotId = ref(0)
let nextSlotId = 1

function initDefaultSlot() {
  if (vehicleSlots.value.length === 0) {
    vehicleSlots.value.push({ id: nextSlotId, name: '卡车 1', color: '#e74c3c', path: [], entity: null, positionProperty: null, heading: 0, progress: 0, pathCorridor: null, pathGround: null, pathStartMarker: null, pathWidth: 6, pathOpacity: 0.7, pathStyle: 'solid', pathOutlineWidth: 2, pathOutlineOpacity: 0.9, pathOutlineEntity: null })
    activeSlotId.value = nextSlotId
    nextSlotId++
  }
}

function addVehicleSlot() {
  const idx = vehicleSlots.value.length
  const hue = (idx * 137.5) % 360
  const color = `hsl(${hue}, 70%, 55%)`
  const slot = { id: nextSlotId, name: `卡车 ${idx + 1}`, color, path: [], entity: null, positionProperty: null, heading: 0, progress: 0, pathCorridor: null, pathGround: null, pathStartMarker: null, pathWidth: 4, pathOpacity: 0.7, pathStyle: 'solid', pathOutlineWidth: 2, pathOutlineOpacity: 0.9, pathOutlineEntity: null }
  vehicleSlots.value.push(slot)
  activeSlotId.value = nextSlotId
  userPath.value = []
  nextSlotId++
}

function removeVehicleSlot(id) {
  const idx = vehicleSlots.value.findIndex(s => s.id === id)
  if (idx < 0 || vehicleSlots.value.length <= 1) return
  const slot = vehicleSlots.value[idx]
  if (slot.entity) viewer.entities.remove(slot.entity)
  if (slot.pathCorridor) { viewer.entities.remove(slot.pathCorridor); slot.pathCorridor = null }
  if (slot.pathGround) { viewer.entities.remove(slot.pathGround); slot.pathGround = null }
  if (slot.pathOutlineEntity) { viewer.entities.remove(slot.pathOutlineEntity); slot.pathOutlineEntity = null }
  if (slot.pathStartMarker) { viewer.entities.remove(slot.pathStartMarker); slot.pathStartMarker = null }
  vehicleSlots.value.splice(idx, 1)
  if (activeSlotId.value === id) {
    const newActive = vehicleSlots.value[0]
    activeSlotId.value = newActive.id
    userPath.value = [...newActive.path]
  }
}

function updatePathColor(color) {
  const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (slot) { slot.color = color; drawSlotPath(slot) }
}
function updatePathWidth(width) {
  const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (slot) { slot.pathWidth = width; drawSlotPath(slot) }
}
function updatePathOpacity(opacity) {
  const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (slot) { slot.pathOpacity = opacity; drawSlotPath(slot) }
}
function updatePathStyle(style) {
  const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (slot) { slot.pathStyle = style; drawSlotPath(slot) }
}
function updatePathOutlineWidth(width) {
  const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (slot) { slot.pathOutlineWidth = width; drawSlotPath(slot) }
}
function updatePathOutlineOpacity(opacity) {
  const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (slot) { slot.pathOutlineOpacity = opacity; drawSlotPath(slot) }
}

function switchVehicleSlot(id) {
  const current = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (current) { current.path = [...userPath.value] }
  activeSlotId.value = id
  const slot = vehicleSlots.value.find(s => s.id === id)
  if (slot) { userPath.value = [...slot.path] }
  drawPathLine()
  if (isSimulating.value && slot && slot.positionProperty) {
    const pos = slot.positionProperty.getValue(viewer.clock.currentTime)
    if (Cesium.defined(pos)) {
      const c = Cesium.Cartographic.fromCartesian(pos)
      cameraLocked.value = true
      viewer.camera.flyTo(getVehicleCameraDest(Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude), c.height, slot.heading))
    }
  }
}
let _drawingMarkers = []
let _measureMarkers = []

const gcj02Display = computed(() => {
  const g = mouseGCJ02.value
  return `${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}`
})
const roadConditionText = computed(() => {
  const map = { '畅通': '🟢 畅通', '缓行': '🟡 缓行', '拥堵': '🔴 拥堵' }
  return map[roadCondition.value] || ''
})
const trajectoryPath = computed(() => [
  [39.9078, 116.3565], [39.9075, 116.3650], [39.9070, 116.3740],
  [39.9055, 116.3830], [39.9045, 116.3910], [39.9042, 116.3974],
  [39.9050, 116.4050], [39.9065, 116.4120], [39.9075, 116.4200],
  [39.9080, 116.4280], [39.9085, 116.4350],
])

function getActivePath() { return userPath.value.length >= 2 ? userPath.value : trajectoryPath.value }

function showPopupAlert(msg, type) {
  const priority = { danger: 3, warning: 2, info: 1 }
  if (showAlert.value && priority[type] < priority[alertType.value]) return
  if (showAlert.value && alertTimer) { clearTimeout(alertTimer); alertTimer = null }
  alertMessage.value = msg; alertType.value = type; showAlert.value = true
  alertTimer = setTimeout(() => { showAlert.value = false; alertTimer = null }, 3000)
}

// ==================== 初始化 ====================
onMounted(() => {
  viewer = new Cesium.Viewer(cesiumContainer.value, {
    imageryProvider: new Cesium.UrlTemplateImageryProvider({
      url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      subdomains: ['1', '2', '3', '4'],
      minimumLevel: 3,
      maximumLevel: 18,
    }),
    terrain: undefined,
    animation: false, timeline: false, baseLayerPicker: false,
    fullscreenButton: false, geocoder: false, homeButton: false,
    sceneModePicker: false, navigationHelpButton: false,
    infoBox: false, selectionIndicator: false,
  })
  viewer.scene.globe.enableLighting = true
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.globe.maximumScreenSpaceError = 1.5
  viewer.scene.globe.showGroundAtmosphere = true
  viewer.shadows = true
  viewer.scene.msaaSamples = 4
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50
  viewer.scene.renderError.addEventListener(() => {
    console.warn('Cesium render error - check corridor/groundPrimitive entities')
  })

  // 触摸板双指缩放：用原生事件接管，灵敏度可控
  viewer.scene.screenSpaceCameraController.tiltEventTypes = [
    Cesium.CameraEventType.PINCH,
    Cesium.CameraEventType.MIDDLE_DRAG,
  ]
  viewer.scene.canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      viewer.camera.zoomIn(-e.deltaY / 3)
    }
  }, { passive: false })
  viewer.clock.shouldAnimate = false
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP

  mouseHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  mouseHandler.setInputAction((movement) => {
    const cartesian = viewer.scene.pickPosition(movement.endPosition)
    if (Cesium.defined(cartesian)) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
      mouseLat.value = Cesium.Math.toDegrees(cartographic.latitude)
      mouseLng.value = Cesium.Math.toDegrees(cartographic.longitude)
      mouseGCJ02.value = wgs84ToGCJ02(mouseLat.value, mouseLng.value)
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  viewer.camera.moveEnd.addEventListener(() => {
    const cartographic = viewer.camera.positionCartographic
    if (Cesium.defined(cartographic)) {
      centerLat.value = Cesium.Math.toDegrees(cartographic.latitude)
      centerLng.value = Cesium.Math.toDegrees(cartographic.longitude)
      mapZoom.value = Math.round(viewer.camera.computeViewRectangle() ? 13 : 10)
    }
  })

  viewer.scene.postRender.addEventListener(onPostRender)

  // 用户手动操作相机时自动解锁，不再自动恢复锁定
  const canvas = viewer.scene.canvas
  canvas.addEventListener('mousedown', () => { cameraLocked.value = false })
  canvas.addEventListener('wheel', () => { cameraLocked.value = false })
  canvas.addEventListener('touchstart', () => { cameraLocked.value = false })
  drawPathLine()
  initDefaultSlot()
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  clockTimer = setInterval(() => { systemTime.value = new Date().toLocaleTimeString('zh-CN') }, 1000)
  flyToBeijing()
})

onBeforeUnmount(() => {
  stopSimulation()
  if (clockTimer) clearInterval(clockTimer)
  if (mouseHandler) mouseHandler.destroy()
  if (viewer) viewer.destroy()
})

function getVehicleCameraDest(lng, lat, height, heading) {
  const cameraHeight = 1500
  const pitch = Cesium.Math.toRadians(-70)
  const offset = cameraHeight * Math.tan(Cesium.Math.toRadians(20))
  const hdg = Cesium.Math.toRadians(heading)
  const dLat = -offset * Math.cos(hdg) / 111320
  const dLng = -offset * Math.sin(hdg) / (111320 * Math.cos(Cesium.Math.toRadians(lat)))
  return {
    destination: Cesium.Cartesian3.fromDegrees(lng + dLng, lat + dLat, height + cameraHeight),
    orientation: { heading, pitch, roll: 0 },
  }
}

function onPostRender() {
  if (!isSimulating.value || !viewer) return
  const activeSlot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (!activeSlot || !activeSlot.positionProperty) return
  positionProperty = activeSlot.positionProperty
  vehicleEntity = activeSlot.entity
  try {
    const current = viewer.clock.currentTime
    const stop = viewer.clock.stopTime
    if (Cesium.JulianDate.lessThan(current, stop)) {
      viewer.clock.currentTime = Cesium.JulianDate.addSeconds(
        current, viewer.clock.multiplier / 60, new Cesium.JulianDate()
      )
    } else {
      viewer.clock.currentTime = viewer.clock.startTime.clone()
    }

    const start = Cesium.JulianDate.toDate(viewer.clock.startTime).getTime()
    const stopMs = Cesium.JulianDate.toDate(viewer.clock.stopTime).getTime()
    const cur = Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime()
    vehicleProgress.value = activeSlot.progress = ((cur - start) / (stopMs - start)) * 100

    const pos = activeSlot.positionProperty.getValue(viewer.clock.currentTime)
    if (Cesium.defined(pos)) {
      const cartographic = Cesium.Cartographic.fromCartesian(pos)
      const lat = Cesium.Math.toDegrees(cartographic.latitude)
      const lng = Cesium.Math.toDegrees(cartographic.longitude)
      updateRoadCondition()
      updateCurrentSegment()

      if (cameraLocked.value) {
        const dest = getVehicleCameraDest(lng, lat, cartographic.height, activeSlot.heading)
        viewer.camera.setView(dest)
      }
    }
  } catch (e) { /* ignore */ }
}

// ==================== 现代化标记图标 ====================
function createMarkerIcon(text, bgColor, textColor = '#fff') {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  // 阴影
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  // 圆形背景
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2)
  ctx.fillStyle = bgColor
  ctx.fill()
  // 白色边框
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  // 文字
  ctx.fillStyle = textColor
  ctx.font = 'bold 22px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2)
  return canvas.toDataURL()
}

// ==================== 轨迹线 + SampledPositionProperty ====================
function clearSlotPathVisuals(slot) {
  const prefix = `slot-${slot.id}-path-`
  const toRemove = []
  viewer.entities.values.forEach(e => {
    if (e.id && typeof e.id === 'string' && e.id.startsWith(prefix)) toRemove.push(e)
  })
  toRemove.forEach(e => viewer.entities.remove(e))
  slot.pathCorridor = null
  slot.pathGround = null
  slot.pathOutlineEntity = null
  slot.pathStartMarker = null
}

function drawSlotPath(slot) {
  if (slot.path.length < 2) return
  try {
    const gcjPath = slot.path.map(([lat, lng]) => wgs84ToGCJ02(lat, lng))
    const positions = Cesium.Cartesian3.fromDegreesArray(gcjPath.flatMap(({ lat, lng }) => [lng, lat]))
    if (!Cesium.defined(positions) || positions.length < 2) return
    clearSlotPathVisuals(slot)
    let slotColor
    try { slotColor = Cesium.Color.fromCssColorString(slot.color) } catch (e) { slotColor = Cesium.Color.RED }
    if (is3DMode.value) {
      slot.pathCorridor = viewer.entities.add({
        id: `slot-${slot.id}-path-corridor`,
        corridor: {
          positions,
          width: 18,
          material: slotColor.withAlpha((slot.pathOpacity || 0.7) * 0.5),
          height: 3,
          clampToGround: true,
        },
      })
    }
    if (slot.pathStyle === 'outline') {
      const bodyWidth = slot.pathWidth || 6
      const outlineWidth = slot.pathOutlineWidth || 2
      const bodyOpacity = slot.pathOpacity ?? 0.7
      const outlineOpacity = slot.pathOutlineOpacity ?? 0.9
      if (bodyWidth > 0) {
        slot.pathGround = viewer.entities.add({
          id: `slot-${slot.id}-path-body`,
          polyline: {
            positions,
            width: bodyWidth,
            material: slotColor.withAlpha(bodyOpacity),
            clampToGround: true,
            zIndex: 1,
          },
        })
      }
      if (outlineWidth > 0) {
        slot.pathOutlineEntity = viewer.entities.add({
          id: `slot-${slot.id}-path-outline`,
          polyline: {
            positions,
            width: outlineWidth,
            material: slotColor.withAlpha(outlineOpacity),
            clampToGround: true,
            zIndex: 2,
          },
        })
      }
    } else {
      slot.pathGround = viewer.entities.add({
        id: `slot-${slot.id}-path-solid`,
        polyline: {
          positions,
          width: slot.pathWidth || 4,
          material: slotColor.withAlpha(slot.pathOpacity || 0.7),
          clampToGround: true,
          zIndex: 0,
        },
      })
    }
    const iconUrl = createMarkerIcon(slot.name.replace('卡车 ', 'S'), slot.color)
    slot.pathStartMarker = viewer.entities.add({
      id: `slot-${slot.id}-path-marker`,
      position: positions[0],
      billboard: {
        image: iconUrl,
        width: 40,
        height: 40,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        eyeOffset: new Cesium.Cartesian3(0, 0, 20),
        pixelOffset: new Cesium.Cartesian2(0, -10),
      },
    })
  } catch (e) {
    console.warn('drawSlotPath error:', e)
  }
}

function drawPathLine() {
  vehicleSlots.value.forEach(slot => drawSlotPath(slot))
}

async function buildPositionProperty(path) {
  const prop = new Cesium.SampledPositionProperty()
  const totalDist = calcTotalDistance(path)
  const REF_TIME = 120
  prop.setInterpolationOptions({ interpolationDegree: 1, interpolationAlgorithm: Cesium.LinearApproximation })
  // 转 GCJ-02 与高德底图对齐
  const gcjPath = path.map(([lat, lng]) => wgs84ToGCJ02(lat, lng))
  const carts = gcjPath.map(({ lat, lng }) => Cesium.Cartographic.fromDegrees(lng, lat))
  let heights
  try { heights = (await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, carts)).map((c) => c.height) }
  catch (e) { heights = gcjPath.map(() => 0) }
  let acc = 0
  const startTime = Cesium.JulianDate.fromDate(new Date(2024, 0, 1, 0, 0, 0))
  prop.addSample(startTime, Cesium.Cartesian3.fromDegrees(gcjPath[0].lng, gcjPath[0].lat, heights[0] + 10))
  for (let i = 1; i < gcjPath.length; i++) {
    const segDist = haversineDistance(gcjPath[i - 1].lat, gcjPath[i - 1].lng, gcjPath[i].lat, gcjPath[i].lng)
    acc += segDist
    const time = (acc / totalDist) * REF_TIME
    const julianDate = Cesium.JulianDate.addSeconds(startTime, time, new Cesium.JulianDate())
    prop.addSample(julianDate, Cesium.Cartesian3.fromDegrees(gcjPath[i].lng, gcjPath[i].lat, heights[i] + 10))
  }
  return { prop, startTime, totalTime: REF_TIME }
}

function calcTotalDistance(path) {
  let d = 0
  for (let i = 1; i < path.length; i++) d += haversineDistance(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
  return d
}

function toggleCameraLock() {
  cameraLocked.value = !cameraLocked.value
  if (cameraLocked.value) {
    const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
    if (slot && slot.positionProperty) {
      const pos = slot.positionProperty.getValue(viewer.clock.currentTime)
      if (Cesium.defined(pos)) {
        const c = Cesium.Cartographic.fromCartesian(pos)
        viewer.camera.flyTo(getVehicleCameraDest(Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude), c.height, slot.heading))
      }
    }
  } else {
    const slotsWithPath = vehicleSlots.value.filter(s => s.path.length >= 2)
    if (slotsWithPath.length > 1) {
      const west = Math.min(...slotsWithPath.map(s => s.path[0][1]))
      const south = Math.min(...slotsWithPath.map(s => s.path[0][0]))
      const east = Math.max(...slotsWithPath.map(s => s.path[0][1]))
      const north = Math.max(...slotsWithPath.map(s => s.path[0][0]))
      const pad = 3
      const rect = Cesium.Rectangle.fromDegrees(west - pad, south - pad, east + pad, north + pad)
      viewer.camera.flyTo({ destination: rect, duration: 1.5 })
    }
  }
}

// ==================== 模拟控制 ====================
async function startSimulation() {
  if (isPaused.value) {
    isPaused.value = false
    isSimulating.value = true
    return
  }
  const slotsWithPath = vehicleSlots.value.filter(s => s.path.length >= 2)
  if (slotsWithPath.length === 0) { showPopupAlert('请先为至少一辆车设置路径', 'warning'); return }
  vehicleProgress.value = 0
  isSimulating.value = true

  let maxTotalTime = 0
  let globalStartTime = null
  const builds = slotsWithPath.map(async (slot) => {
    const { prop, startTime, totalTime } = await buildPositionProperty(slot.path)
    prop.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD
    prop.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD
    slot.positionProperty = prop
    if (totalTime > maxTotalTime) maxTotalTime = totalTime
    if (!globalStartTime) globalStartTime = startTime
    return { slot, prop, startTime, totalTime }
  })
  await Promise.all(builds)

  viewer.clock.startTime = globalStartTime.clone()
  viewer.clock.stopTime = Cesium.JulianDate.addSeconds(globalStartTime, maxTotalTime, new Cesium.JulianDate())
  viewer.clock.currentTime = globalStartTime.clone()
  viewer.clock.multiplier = vehicleSpeed.value / 60
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP

  slotsWithPath.forEach(slot => {
    if (slot.entity) viewer.entities.remove(slot.entity)
    slot.entity = viewer.entities.add({
      position: slot.positionProperty,
      orientation: new Cesium.VelocityOrientationProperty(slot.positionProperty),
      model: {
        uri: 'https://cdn.jsdelivr.net/gh/CesiumGS/cesium@main/Apps/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb',
        scale: 80,
        minimumPixelSize: 64,
      },
      ellipsoid: {
        radii: new Cesium.Cartesian3(12, 6, 4),
        material: Cesium.Color.fromCssColorString(slot.color).withAlpha(1.0),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#ff9100'),
        outlineWidth: 2,
      },
    })
  })

  const activeSlot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (activeSlot && activeSlot.positionProperty) {
    positionProperty = activeSlot.positionProperty
    vehicleEntity = activeSlot.entity
  }
  drawPathLine()
  // 全景视角：多车时显示全局，不锁定跟车；单车直接跟车
  if (slotsWithPath.length > 1) {
    const west = Math.min(...slotsWithPath.map(s => s.path[0][1]))
    const south = Math.min(...slotsWithPath.map(s => s.path[0][0]))
    const east = Math.max(...slotsWithPath.map(s => s.path[0][1]))
    const north = Math.max(...slotsWithPath.map(s => s.path[0][0]))
    const pad = 3
    const rect = Cesium.Rectangle.fromDegrees(west - pad, south - pad, east + pad, north + pad)
    viewer.camera.flyTo({ destination: rect, duration: 1.5 })
    cameraLocked.value = false
  } else {
    const p = slotsWithPath[0].path[0]
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(p[1], p[0], 1500), duration: 1.0 })
    cameraLocked.value = true
  }
  viewer.clock.shouldAnimate = false
}

function pauseSimulation() {
  isPaused.value = true
  isSimulating.value = false
}

function stopSimulation() {
  isSimulating.value = false
  isPaused.value = false
  currentZone.value = ''
  roadCondition.value = '畅通'
  if (viewer) viewer.clock.shouldAnimate = false
  vehicleSlots.value.forEach(slot => {
    if (slot.entity) { viewer.entities.remove(slot.entity); slot.entity = null }
    slot.positionProperty = null
    slot.heading = 0
    slot.progress = 0
  })
  vehicleEntity = null
  positionProperty = null
  drawPathLine()
}

watch(vehicleSpeed, (v) => { if (viewer && isSimulating.value) viewer.clock.multiplier = v / 60 })
watch(userPath, (val) => {
  const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
  if (slot) slot.path = [...val]
  drawPathLine()
}, { deep: true })

function updateRoadCondition() {
  roadCondition.value = '畅通'
}

function updateCurrentSegment() {
  const path = getActivePath()
  const total = calcTotalDistance(path)
  const target = (vehicleProgress.value / 100) * total
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    const seg = haversineDistance(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
    if (acc + seg >= target) { currentSegment.value = `P${i} → P${i + 1} (${seg.toFixed(0)}m)`; return }
    acc += seg
  }
  currentSegment.value = ''
}

// ==================== 路径绘制 ====================
function startDrawing() {
  if (measureMode.value) clearMeasure()
  drawingMode.value = true
  updateClickHandler()
  showPopupAlert('🖱️ 点击地图添加路径点', 'info')
}

function finishDrawing() {
  drawingMode.value = false
  updateClickHandler()
  if (userPath.value.length < 2) { showPopupAlert('至少需要2个路径点', 'warning'); return }
  showPopupAlert(`✅ 路径已保存，共 ${userPath.value.length} 个点`, 'info')
  drawPathLine()
}

function clearUserPath() {
  stopSimulation()
  drawingMode.value = false
  routeMode.value = false
  routeStart.value = null
  routeEnd.value = null
  routeOptions.value = []
  selectedRoute.value = 0
  userPath.value = []
  drawingEntities.forEach((e) => viewer.entities.remove(e))
  drawingEntities = []
  _drawingMarkers = []
  vehicleSlots.value.forEach(slot => clearSlotPathVisuals(slot))
  vehicleProgress.value = 0
  drawPathLine()
}

// ==================== OSRM 路径规划 ====================
async function fetchOSRMRoutes(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes) throw new Error('OSRM 无可用路线')
    return data.routes.map((r) => ({
      distance: r.distance,
      duration: r.duration,
      path: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    }))
  } catch (e) {
    showPopupAlert('⚠️ 路径规划失败: ' + e.message, 'warning')
    return []
  }
}

function startRoutePlanning() {
  if (measureMode.value) clearMeasure()
  routeMode.value = true
  routeStart.value = null
  routeEnd.value = null
  routeOptions.value = []
  selectedRoute.value = 0
  updateClickHandler()
  vehicleSlots.value.forEach(slot => clearSlotPathVisuals(slot))
  showPopupAlert('🖱️ 点击地图设置起点', 'info')
}

function cancelRoutePlanning() {
  routeMode.value = false
  routeStart.value = null
  routeEnd.value = null
  routeOptions.value = []
  selectedRoute.value = 0
  updateClickHandler()
}

function selectRoute(index) {
  selectedRoute.value = index
  const route = routeOptions.value[index]
  if (route) {
    userPath.value = route.path
    drawPathLine()
  }
}

function confirmRoute() {
  const route = routeOptions.value[selectedRoute.value]
  if (!route) return
  userPath.value = route.path
  routeMode.value = false
  routeStart.value = null
  routeEnd.value = null
  routeOptions.value = []
  selectedRoute.value = 0
  updateClickHandler()
  drawPathLine()
  showPopupAlert(`✅ 已选择路线 ${((route.distance || 0) / 1000).toFixed(1)}km`, 'info')
}

function handleMapClick(position) {
  let cartesian = viewer.scene.pickPosition(position)
  if (!Cesium.defined(cartesian)) {
    cartesian = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
  }
  if (!Cesium.defined(cartesian)) return
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
  const lat = Cesium.Math.toDegrees(cartographic.latitude)
  const lng = Cesium.Math.toDegrees(cartographic.longitude)

  if (routeMode.value) {
    if (!routeStart.value) {
      routeStart.value = { lat, lng }
      const e = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
        billboard: {
          image: createMarkerIcon('起', '#4CAF50'),
          width: 40,
          height: 40,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          eyeOffset: new Cesium.Cartesian3(0, 0, 20),
          pixelOffset: new Cesium.Cartesian2(0, -10),
        },
      })
      drawingEntities.push(e)
      showPopupAlert('🖱️ 点击地图设置终点', 'info')
    } else if (!routeEnd.value) {
      routeEnd.value = { lat, lng }
      const e = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
        billboard: {
          image: createMarkerIcon('终', '#F44336'),
          width: 40,
          height: 40,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          eyeOffset: new Cesium.Cartesian3(0, 0, 20),
          pixelOffset: new Cesium.Cartesian2(0, -10),
        },
      })
      drawingEntities.push(e)
      showPopupAlert('🔄 正在规划路线...', 'info')
      fetchOSRMRoutes(routeStart.value, routeEnd.value).then((routes) => {
        routeOptions.value = routes
        if (routes.length > 0) {
          selectRoute(0)
          showPopupAlert(`✅ 找到 ${routes.length} 条路线，点击切换`, 'info')
        }
      })
    }
    return
  }

  if (drawingMode.value) {
    userPath.value.push([lat, lng])
    const idx = userPath.value.length
    const e = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      point: { pixelSize: 10, color: Cesium.Color.fromCssColorString('#3498db'), outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
      label: { text: `P${idx}`, font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -16), showBackground: true, backgroundColor: Cesium.Color.fromCssColorString('#3498db') },
    })
    drawingEntities.push(e); _drawingMarkers.push(e)
    drawPathLine()
    return
  }

  if (measureMode.value) {
    const idx = _measureMarkers.length + 1
    const e = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      point: { pixelSize: 10, color: Cesium.Color.fromCssColorString('#e74c3c'), outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
      label: { text: String(idx), font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -16), showBackground: true, backgroundColor: Cesium.Color.fromCssColorString('#e74c3c') },
    })
    measureEntities.push(e); _measureMarkers.push(e)
    updateMeasureResult()
  }
}

function updateMeasureResult() {
  if (_measureMarkers.length < 2) { measureResult.value = ''; return }
  const pts = _measureMarkers.map((m) => {
    const c = Cesium.Cartographic.fromCartesian(m.position.getValue(Cesium.JulianDate.now()))
    return { lat: Cesium.Math.toDegrees(c.latitude), lng: Cesium.Math.toDegrees(c.longitude) }
  })
  if (measureMode.value === 'distance') {
    let total = 0
    for (let i = 1; i < pts.length; i++) total += haversineDistance(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng)
    measureResult.value = total < 1000 ? `${total.toFixed(1)} 米` : `${(total / 1000).toFixed(2)} 公里`
  }
  if (measureMode.value === 'area' && _measureMarkers.length >= 3) {
    const area = calcPolygonArea(pts)
    measureResult.value = area < 1000000 ? `${area.toFixed(1)} m²` : `${(area / 1000000).toFixed(2)} km²`
  }
}

function startMeasure(type) {
  if (measureMode.value === type) { clearMeasure(); return }
  clearMeasure()
  measureMode.value = type
  updateClickHandler()
  measureResult.value = ''
}

function clearMeasure() {
  measureMode.value = null
  updateClickHandler()
  measureResult.value = ''
  measureEntities.forEach((e) => viewer.entities.remove(e))
  measureEntities = []
  _measureMarkers = []
}

// ==================== 底图切换 ====================
function switchBaseLayer(type) {
  activeLayer.value = type
  if (!viewer) return
  viewer.imageryLayers.removeAll()
  let provider = null
  if (type === 'amap') {
    provider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      subdomains: ['1', '2', '3', '4'],
      minimumLevel: 3,
      maximumLevel: 18,
    })
  } else if (type === 'satellite') {
    provider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      subdomains: ['1', '2', '3', '4'],
      minimumLevel: 3,
      maximumLevel: 18,
    })
  } else if (type === 'terrain') {
    provider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      subdomains: ['1', '2', '3', '4'],
      minimumLevel: 3,
      maximumLevel: 18,
    })
  }
  if (provider) {
    viewer.imageryLayers.addImageryProvider(provider)
  }
  // 3D 建筑仅在「地形」模式下加载
  if (type === 'terrain') {
    if (!osmBuildings) {
      Cesium.createOsmBuildingsAsync().then(b => {
        osmBuildings = b
        // WGS84 → GCJ-02 纠偏：以北京为中心计算偏移量
        const wgs = Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 0)
        const gcj = wgs84ToGCJ02(39.9042, 116.4074)
        const gcjPos = Cesium.Cartesian3.fromDegrees(gcj.lng, gcj.lat, 0)
        const offset = Cesium.Cartesian3.subtract(gcjPos, wgs, new Cesium.Cartesian3())
        b.modelMatrix = Cesium.Matrix4.fromTranslation(offset)
        viewer.scene.primitives.add(b)
      }).catch(() => {})
    }
  } else {
    if (osmBuildings) { viewer.scene.primitives.remove(osmBuildings); osmBuildings = null }
  }
}

// ==================== 2D/3D 切换 ====================
function toggleViewMode() {
  if (!viewer) return
  if (is3DMode.value) {
    viewer.scene.morphTo2D(1.0)
    is3DMode.value = false
  } else {
    viewer.scene.morphTo3D(1.0)
    is3DMode.value = true
  }
}

// ==================== 飞行 ====================
function flyToBeijing() {
  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 8000), duration: 1.5 })
}
function flyToShanghai() {
  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(121.4737, 31.2304, 8000), duration: 2 })
}

// 动态注册/注销点击事件
function updateClickHandler() {
  if (!clickHandler) return
  clickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
  if (drawingMode.value || measureMode.value || routeMode.value) {
    clickHandler.setInputAction((click) => { handleMapClick(click.position) }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }
}
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }
#app { display: flex; flex-direction: column; height: 100vh; font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #1a1a2e; color: #e0e0e0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 20px; background: linear-gradient(135deg, #16213e, #0f3460); border-bottom: 1px solid #0f3460; z-index: 1000; flex-shrink: 0; }
.toolbar-left { display: flex; align-items: center; gap: 12px; }
.toolbar-left h1 { font-size: 18px; font-weight: 600; color: #e94560; }
.badge { background: #e94560; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.toolbar-right { display: flex; align-items: center; gap: 10px; }
.time { font-size: 13px; color: #888; font-variant-numeric: tabular-nums; }
.main-container { display: flex; flex: 1; overflow: hidden; }
#map { flex: 1; min-width: 0; z-index: 1; position: relative; }
.cesium-container { width: 100%; height: 100%; }
.cesium-container :deep(.cesium-viewer),
.cesium-container :deep(.cesium-widget),
.cesium-container :deep(.cesium-viewer canvas) {
  width: 100% !important;
  height: 100% !important;
  touch-action: none;
}
.status-bar { display: flex; justify-content: space-between; align-items: center; padding: 4px 20px; background: #0f3460; font-size: 11px; color: #888; flex-shrink: 0; border-top: 1px solid #16213e; }
.btn { padding: 6px 14px; border: 1px solid #0f3460; border-radius: 4px; background: #16213e; color: #e0e0e0; cursor: pointer; font-size: 12px; transition: all 0.2s; }
.btn:hover { border-color: #e94560; }
.btn-sm { padding: 4px 10px; font-size: 11px; }
@media (max-width: 700px) { .main-container { flex-direction: column; } #map { height: 400px; flex: none; } }
</style>