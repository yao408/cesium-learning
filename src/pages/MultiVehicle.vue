<template>
    <div class="multi-vehicle-page">
  
      <div class="main-container">
        <ControlPanel
          :activeLayer="activeLayer"
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
          :vehicleSlots="vehicleSlots"
          :activeSlotId="activeSlotId"
          @switchBaseLayer="switchBaseLayer"
          @clearUserPath="clearUserPath"
          @startSimulation="startSimulation"
          @pauseSimulation="pauseSimulation"
          @stopSimulation="stopSimulation"
          @update:vehicleSpeed="v => vehicleSpeed = v"
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
          :mouseLat="mouseLat"
          :mouseLng="mouseLng"
        />
  
        <div id="map">
          <div class="map-area"></div>
          <div v-if="showInfoPanel" class="info-panel">
            <p>WGS84 {{ mouseLng.toFixed(5) }}, {{ mouseLat.toFixed(5) }}</p>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
  import * as Cesium from 'cesium'
  import ControlPanel from '../components/ControlPanel.vue'
import MapOverlay from '../components/MapOverlay.vue'
  import { wgs84ToGCJ02, destinationPoint, calcBearing, calcHeading, haversineDistance, calcPolygonArea } from '../utils/geo.js'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useViewerStore } from '../stores/viewerStore.js'

  const store = useScenarioStore()
  const viewerStore = useViewerStore()
  
  let viewer = null
  let vehicleEntity = null
  let routeMarkerEntities = []
  let positionProperty = null
  let mouseHandler = null
  let clickHandler = null
  let cameraMoveEndListener = null
  let drawHandler = null
  let drawingEntities = []
  let _drawingMarkers = []
  let alertTimer = null
let siteMarkers = []
let _siteSyncHandler = null
  
  // ==================== 车辆槽位管理 ====================
  
  const activeLayer = ref('satellite')
  const routeMode = ref(false)      // 路径规划模式：选起点→终点→自动获取真实道路
  const drawingMode = ref(false)    // 手动绘制路径模式
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
  const cameraMode = ref('bird') // 'bird' 俯视
  const cameraLocked = ref(true)  // true=自动跟车，false=手动控制
  const showAlert = ref(false)
  const alertType = ref('info')
  const alertMessage = ref('')
  const roadBlocks = ref([])
  const blockedRouteSegments = ref([])
  let roadBlockPrimitives = []
  let blockedRoutePrimitives = []
  
  let vehicleHeading = 0
  
  // 多车管理
  const vehicleSlots = ref([])
  const activeSlotId = ref(0)
  const showInfoPanel = ref(false)
  let nextSlotId = 1
  
  function initDefaultSlot() {
    if (vehicleSlots.value.length === 0) {
      vehicleSlots.value.push({ id: nextSlotId, name: '卡车 1', color: '#e74c3c', path: [], entity: null, positionProperty: null, heading: 0, progress: 0, pathCorridor: null, pathGround: null, pathStartMarker: null, pathWidth: 6, pathOpacity: 0.7, pathStyle: 'solid', pathOutlineWidth: 2, pathOutlineOpacity: 0.9, pathOutlineEntity: null })
      activeSlotId.value = nextSlotId
      nextSlotId++
    }
  }

  function isPointInFlood(lat, lng) {
  if (!store.floodSourcePoint || store.floodLevel <= 0) return false
  const { lon, lat: fLat } = store.floodSourcePoint
  const radius = store.floodLevel / 15000
  const dLat = lat - fLat
  const dLon = lng - lon
  return Math.sqrt(dLat * dLat + dLon * dLon) < radius
}

function getFloodDetour(path) {
  if (!store.floodSourcePoint || store.floodLevel <= 0) return null
  const fc = store.floodSourcePoint
  const radius = store.floodLevel / 15000
  for (let i = 0; i < path.length - 1; i++) {
    const [lat1, lng1] = path[i]
    const [lat2, lng2] = path[i + 1]
    if (isPointInFlood(lat1, lng1) || isPointInFlood(lat2, lng2)) {
      const midLat = (lat1 + lat2) / 2
      const midLng = (lng1 + lng2) / 2
      const dx = midLng - fc.lon
      const dy = midLat - fc.lat
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
      return { lat: midLat + (dy / dist) * radius * 1.8, lng: midLng + (dx / dist) * radius * 1.8 }
    }
  }
  return null
}

function getBlockDetour(path) {
  const blocks = roadBlocks.value.length > 0 ? roadBlocks.value : getDefaultRoadBlocks()
  if (blocks.length === 0) return null
  for (let i = 0; i < path.length; i++) {
    const [lat, lng] = path[i]
    for (const block of blocks) {
      for (const coord of block.coords) {
        const dist = haversineDistance(lat, lng, coord[1], coord[0]) / 1000
        if (dist < 0.5) {
          const dx = lng - coord[0]
          const dy = lat - coord[1]
          const d = Math.sqrt(dx * dx + dy * dy) || 0.0001
          return { lat: lat + (dy / d) * 0.02, lng: lng + (dx / d) * 0.02 }
        }
      }
    }
  }
  return null
}

async function autoLoadDispatchScenario() {
  if (!store.dispatchCenter || !store.hazards || store.hazards.length < 4) return

  const dc = store.dispatchCenter
  const dcLat = dc.lat
  const dcLng = dc.lng
  const hazards = store.hazards

  const supplyCities = [
    { name: '康定', lat: 30.05, lng: 101.96, color: '#e74c3c' },
    { name: '雅安', lat: 29.98, lng: 103.01, color: '#f39c12' },
    { name: '成都', lat: 30.57, lng: 104.07, color: '#27ae60' },
  ]

  // 清除旧 slot
  vehicleSlots.value.forEach(s => {
    if (s.entity) viewer.entities.remove(s.entity)
    if (s.pathCorridor) { viewer.entities.remove(s.pathCorridor); s.pathCorridor = null }
    if (s.pathGround) { viewer.entities.remove(s.pathGround); s.pathGround = null }
    if (s.pathOutlineEntity) { viewer.entities.remove(s.pathOutlineEntity); s.pathOutlineEntity = null }
    if (s.pathStartMarker) { viewer.entities.remove(s.pathStartMarker); s.pathStartMarker = null }
  })
  vehicleSlots.value = []

  // 3 条城际物资路线 —— 用 OSRM 真实道路
  for (const city of supplyCities) {
    const routes = await fetchOSRMRoutes(
      { lat: city.lat, lng: city.lng },
      { lat: dcLat, lng: dcLng }
    )
    let path = routes.length > 0 ? routes[0].path : [[city.lat, city.lng], [dcLat, dcLng]]

    // 洪水绕行
    const detour = getBlockDetour(path) || getFloodDetour(path)
    if (detour) {
      const retry = await fetchOSRMRoutes(
        { lat: city.lat, lng: city.lng },
        { lat: dcLat, lng: dcLng },
        detour
      )
      if (retry.length > 0) path = retry[0].path
    }

    const slot = {
      id: nextSlotId, name: `${city.name} → 指挥中心`, color: city.color,
      path, entity: null, positionProperty: null, heading: 0, progress: 0,
      pathCorridor: null, pathGround: null, pathStartMarker: null,
      pathWidth: 5, pathOpacity: 0.7, pathStyle: 'solid',
      pathOutlineWidth: 2, pathOutlineOpacity: 0.9, pathOutlineEntity: null,
    }
    vehicleSlots.value.push(slot)
    nextSlotId++
  }

  // 西线配送：指挥中心 → 村庄1 → 村庄2
  const westVillages = hazards.slice(0, 2)
  if (westVillages.length >= 2) {
    const routes = await fetchOSRMRoutes(
      { lat: dcLat, lng: dcLng },
      { lat: westVillages[1].lat, lng: westVillages[1].lng }
    )
    let path = routes.length > 0 ? routes[0].path : [[dcLat, dcLng], [westVillages[1].lat, westVillages[1].lng]]
    const detour = getBlockDetour(path) || getFloodDetour(path)
    if (detour) {
      const retry = await fetchOSRMRoutes(
        { lat: dcLat, lng: dcLng },
        { lat: westVillages[1].lat, lng: westVillages[1].lng },
        detour
      )
      if (retry.length > 0) path = retry[0].path
    }
    const slot = {
      id: nextSlotId, name: '西线配送', color: '#8e44ad',
      path, entity: null, positionProperty: null, heading: 0, progress: 0,
      pathCorridor: null, pathGround: null, pathStartMarker: null,
      pathWidth: 4, pathOpacity: 0.6, pathStyle: 'solid',
      pathOutlineWidth: 1, pathOutlineOpacity: 0.8, pathOutlineEntity: null,
    }
    vehicleSlots.value.push(slot)
    nextSlotId++
  }

  // 东线配送：指挥中心 → 村庄3 → 村庄4
  const eastVillages = hazards.slice(2, 4)
  if (eastVillages.length >= 2) {
    const routes = await fetchOSRMRoutes(
      { lat: dcLat, lng: dcLng },
      { lat: eastVillages[1].lat, lng: eastVillages[1].lng }
    )
    let path = routes.length > 0 ? routes[0].path : [[dcLat, dcLng], [eastVillages[1].lat, eastVillages[1].lng]]
    const detour = getBlockDetour(path) || getFloodDetour(path)
    if (detour) {
      const retry = await fetchOSRMRoutes(
        { lat: dcLat, lng: dcLng },
        { lat: eastVillages[1].lat, lng: eastVillages[1].lng },
        detour
      )
      if (retry.length > 0) path = retry[0].path
    }
    const slot = {
      id: nextSlotId, name: '东线配送', color: '#e67e22',
      path, entity: null, positionProperty: null, heading: 0, progress: 0,
      pathCorridor: null, pathGround: null, pathStartMarker: null,
      pathWidth: 4, pathOpacity: 0.6, pathStyle: 'solid',
      pathOutlineWidth: 1, pathOutlineOpacity: 0.8, pathOutlineEntity: null,
    }
    vehicleSlots.value.push(slot)
    nextSlotId++
  }

  activeSlotId.value = vehicleSlots.value[0]?.id || 0
  userPath.value = [...(vehicleSlots.value[0]?.path || [])]
  vehicleSlots.value.forEach(s => drawSlotPath(s))
}
  function addVehicleSlot() {
    const idx = vehicleSlots.value.length
    const colors = ['#1e3a8a', '#2563eb', '#0f172a', '#1e40af', '#3b82f6']
    const color = colors[idx % colors.length]
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
  
  
  const gcj02Display = computed(() => {
    const g = mouseGCJ02.value
    return `${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}`
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

  // ==================== 初始化 ====================
  onMounted(() => {
    viewer = viewerStore.viewer
    if (!viewer) return

    viewer.scene.globe.enableLighting = false
    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.scene.globe.maximumScreenSpaceError = 1.5
    viewer.scene.globe.showGroundAtmosphere = true
    viewer.shadows = true
    viewer.scene.msaaSamples = 4
    // 读取洪水数据，画浅蓝色透明多边形
    if (store.floodPolygon && store.floodPolygon.length > 0) {
  viewer.entities.add({
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(store.floodPolygon),
      material: Cesium.Color.fromCssColorString('#3380ff').withAlpha(0.5),
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
      viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(coords),
          material: Cesium.Color.fromCssColorString('#3380ff').withAlpha(0.5),
          clampToGround: true,
          zIndex: 10,
        },
        name: '洪水淹没范围',
      })
    }
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(102.2, 29.9),
      billboard: {
        image: '/icons/marker.svg',
        width: 32,
        height: 32,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      name: '测试标记',
    })

    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50
    viewer.scene.renderError.addEventListener(() => {
      console.warn('Cesium render error - check corridor/groundPrimitive entities')
    })

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
      viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(108, 35, 15000000) })
    }

    viewer.scene.screenSpaceCameraController.tiltEventTypes = [
      Cesium.CameraEventType.RIGHT_DRAG,
      Cesium.CameraEventType.PINCH,
      { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL },
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
      let cartesian = viewer.scene.pickPosition(movement.endPosition)
      if (!Cesium.defined(cartesian)) {
        cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid)
      }
      if (Cesium.defined(cartesian)) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        mouseLat.value = Cesium.Math.toDegrees(cartographic.latitude)
        mouseLng.value = Cesium.Math.toDegrees(cartographic.longitude)
        mouseGCJ02.value = wgs84ToGCJ02(mouseLat.value, mouseLng.value)
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  
    cameraMoveEndListener = () => {
      if (!viewer) return
      const cartographic = viewer.camera.positionCartographic
      if (Cesium.defined(cartographic)) {
        centerLat.value = Cesium.Math.toDegrees(cartographic.latitude)
        centerLng.value = Cesium.Math.toDegrees(cartographic.longitude)
        mapZoom.value = Math.round(viewer.camera.computeViewRectangle() ? 13 : 10)
      }
    }
    viewer.camera.moveEnd.addEventListener(cameraMoveEndListener)
  
    viewer.scene.postRender.addEventListener(onPostRender)
  
    // 用户手动操作相机时自动解锁，不再自动恢复锁定
    const canvas = viewer.scene.canvas
    canvas.addEventListener('mousedown', () => { cameraLocked.value = false })
    canvas.addEventListener('wheel', () => { cameraLocked.value = false })
    canvas.addEventListener('touchstart', () => { cameraLocked.value = false })
    drawPathLine()
    initDefaultSlot()
    drawRoadBlocks()
    autoLoadDispatchScenario() 
    clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

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
    stopSimulation()
    if (mouseHandler) mouseHandler.destroy()
    clearRoadBlocks()
    clearBlockedRoute()
    // 清理洪水实体
    viewer.entities.values
    .filter(e => e.name === '洪水淹没范围')
    .forEach(e => viewer.entities.remove(e))
    if (viewer) {
      viewer.scene.postRender.removeEventListener(onPostRender)
      if (cameraMoveEndListener) viewer.camera.moveEnd.removeEventListener(cameraMoveEndListener)
    }
    mouseHandler = null
    clearSiteMarkers()
    viewer = null
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
      vehicleProgress.value = ((cur - start) / (stopMs - start)) * 100

      if (!activeSlot || !activeSlot.positionProperty) return
      positionProperty = activeSlot.positionProperty
      vehicleEntity = activeSlot.entity
      activeSlot.progress = vehicleProgress.value
  
      const pos = activeSlot.positionProperty.getValue(viewer.clock.currentTime)
      if (Cesium.defined(pos)) {
        const cartographic = Cesium.Cartographic.fromCartesian(pos)
        const lat = Cesium.Math.toDegrees(cartographic.latitude)
        const lng = Cesium.Math.toDegrees(cartographic.longitude)
        updateCurrentSegment()
  
        if (cameraLocked.value) {
          const dest = getVehicleCameraDest(lng, lat, cartographic.height, activeSlot.heading)
          viewer.camera.setView(dest)
        }
      }
    } catch (e) { /* ignore */ }
  }
  
  // ==================== SVG 矢量标记图标（栅格底图最佳选择）====================
  function createMarkerIcon(bgColor) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
      <defs>
        <radialGradient id="g" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </radialGradient>
        <filter id="s">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
        </filter>
      </defs>
      <g filter="url(#s)">
        <path d="M12 24C12 12 22 4 32 4s20 8 20 20c0 8-5 20-20 38-15-18-20-30-20-38z" fill="${bgColor}" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
      </g>
      <circle cx="32" cy="24" r="20" fill="url(#g)"/>
      <circle cx="32" cy="24" r="6" fill="#fff"/>
    </svg>`
    return 'data:image/svg+xml,' + encodeURIComponent(svg)
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
      // 图钉标记
      const iconUrl = createMarkerIcon(slot.color)
      slot.pathStartMarker = viewer.entities.add({
        id: `slot-${slot.id}-path-marker`,
        position: positions[0],
        billboard: {
          image: iconUrl,
          width: 64,
          height: 80,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    } catch (e) {
      console.warn('drawSlotPath error:', e)
    }
  }
  
  function drawPathLine() {
    vehicleSlots.value.forEach(slot => drawSlotPath(slot))
  }

  function getDefaultRoadBlocks() {
    if (!store.aoi) return []
    const { minLat, maxLat, minLng, maxLng } = store.aoi
    const midLat = (minLat + maxLat) / 2
    const midLng = (minLng + maxLng) / 2
    const range = Math.max(maxLat - minLat, maxLng - minLng)
    const factor = range * 0.15
    return [
      {
        name: '省道S211塌方段',
        coords: [
          [midLng - factor * 0.3, midLat + factor * 0.1],
          [midLng - factor * 0.1, midLat + factor * 0.25],
          [midLng + factor * 0.05, midLat + factor * 0.35],
        ],
      },
      {
        name: '大渡河桥损毁',
        coords: [
          [midLng + factor * 0.1, midLat - factor * 0.05],
          [midLng + factor * 0.25, midLat - factor * 0.15],
        ],
      },
      {
        name: '乡道Y012滑坡',
        coords: [
          [midLng - factor * 0.2, midLat - factor * 0.2],
          [midLng - factor * 0.1, midLat - factor * 0.35],
          [midLng - factor * 0.05, midLat - factor * 0.45],
        ],
      },
    ]
  }

  function drawRoadBlocks() {
    clearRoadBlocks()
    if (!viewer) return
    let blocks = roadBlocks.value
    if (blocks.length === 0) {
      blocks = getDefaultRoadBlocks()
      roadBlocks.value = blocks
    }
    blocks.forEach((block) => {
      const positions = Cesium.Cartesian3.fromDegreesArray(block.coords.flat())
      const instances = block.coords.map((_, i) => {
        if (i === block.coords.length - 1) return null
        const seg = [block.coords[i][0], block.coords[i][1], block.coords[i + 1][0], block.coords[i + 1][1]]
        return new Cesium.GeometryInstance({
          geometry: new Cesium.GroundPolylineGeometry({
            positions: Cesium.Cartesian3.fromDegreesArray(seg),
            width: 5,
          }),
        })
      }).filter(Boolean)
      instances.forEach(inst => {
        const prim = new Cesium.GroundPolylinePrimitive({
          geometryInstances: [inst],
          appearance: new Cesium.PolylineMaterialAppearance({
            material: Cesium.Material.fromType('PolylineDash', {
              color: Cesium.Color.fromCssColorString('#dc2626'),
              dashLength: 16,
            }),
          }),
        })
        viewer.scene.primitives.add(prim)
        roadBlockPrimitives.push(prim)
      })
    })
  }

  function clearRoadBlocks() {
    roadBlockPrimitives.forEach(p => viewer.scene.primitives.remove(p))
    roadBlockPrimitives = []
  }

  function clearBlockedRoute() {
    blockedRoutePrimitives.forEach(p => viewer.scene.primitives.remove(p))
    blockedRoutePrimitives = []
    blockedRouteSegments.value = []
  }

  function isPointNearBlock(lat, lng, thresholdKm = 0.5) {
    const blocks = roadBlocks.value.length > 0 ? roadBlocks.value : getDefaultRoadBlocks()
    for (const block of blocks) {
      for (const coord of block.coords) {
        const dist = haversineDistance(lat, lng, coord[1], coord[0]) / 1000
        if (dist < thresholdKm) return true
      }
    }
    return false
  }

  function checkRouteBlocked(path) {
    const blocks = roadBlocks.value.length > 0 ? roadBlocks.value : getDefaultRoadBlocks()
    const blockedSegments = []
    let inBlock = false
    let blockStart = null
    let blockName = ''
    for (let i = 0; i < path.length; i++) {
      const [lat, lng] = path[i]
      const near = isPointNearBlock(lat, lng, 0.5)
      if (near && !inBlock) {
        inBlock = true
        blockStart = i
        const block = blocks.find(b => b.coords.some(c => haversineDistance(lat, lng, c[1], c[0]) / 1000 < 0.5))
        blockName = block ? block.name : '阻断路段'
      } else if (!near && inBlock) {
        blockedSegments.push({ start: blockStart, end: i - 1, name: blockName })
        inBlock = false
        blockStart = null
      }
    }
    if (inBlock) {
      blockedSegments.push({ start: blockStart, end: path.length - 1, name: blockName })
    }
    blockedRouteSegments.value = blockedSegments
    return blockedSegments
  }

  function drawBlockedRouteMarkers(path) {
    clearBlockedRoute()
    const blocked = checkRouteBlocked(path)
    blocked.forEach(seg => {
      const segPath = path.slice(seg.start, seg.end + 1)
      if (segPath.length < 2) return
      const gcjPath = segPath.map(([lat, lng]) => wgs84ToGCJ02(lat, lng))
      const positions = Cesium.Cartesian3.fromDegreesArray(gcjPath.flatMap(({ lat, lng }) => [lng, lat]))
      const inst = new Cesium.GeometryInstance({
        geometry: new Cesium.GroundPolylineGeometry({ positions, width: 6 }),
      })
      const prim = new Cesium.GroundPolylinePrimitive({
        geometryInstances: [inst],
        appearance: new Cesium.PolylineMaterialAppearance({
          material: Cesium.Material.fromType('PolylineDash', {
            color: Cesium.Color.fromCssColorString('#dc2626'),
            dashLength: 12,
          }),
        }),
      })
      viewer.scene.primitives.add(prim)
      blockedRoutePrimitives.push(prim)
    })
  }
  
  async function buildPositionProperty(path) {
    const prop = new Cesium.SampledPositionProperty()
    const totalDist = calcTotalDistance(path)
    const REF_TIME = 120
    prop.setInterpolationOptions({ interpolationDegree: 1, interpolationAlgorithm: Cesium.LinearApproximation })
    // 转 GCJ-02（高德路径规划 API 需要）
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

    if (isSimulating.value) {
      // 模拟已在运行：只添加新车，不重启
      const newSlots = slotsWithPath.filter(s => !s.positionProperty)
      if (newSlots.length === 0) {
        showPopupAlert('所有有路径的车已在模拟中', 'info')
        return
      }
      const currentTime = viewer.clock.currentTime
      let maxNewTime = 0
      const builds = newSlots.map(async (slot) => {
        const { prop, startTime, totalTime } = await buildPositionProperty(slot.path)
        // 偏移到当前时钟时间，让新车从当前位置开始
        const offset = Cesium.JulianDate.secondsDifference(currentTime, startTime)
        const samples = []
        const sampleCount = slot.path.length
        for (let i = 0; i < sampleCount; i++) {
          const t = Cesium.JulianDate.addSeconds(startTime, (i / (sampleCount - 1)) * totalTime, new Cesium.JulianDate())
          const shifted = Cesium.JulianDate.addSeconds(t, offset, new Cesium.JulianDate())
          samples.push({ time: shifted, idx: i })
        }
        const shiftedProp = new Cesium.SampledPositionProperty()
        shiftedProp.setInterpolationOptions({ interpolationDegree: 1, interpolationAlgorithm: Cesium.LinearApproximation })
        const gcjPath = slot.path.map(([lat, lng]) => wgs84ToGCJ02(lat, lng))
        const carts = gcjPath.map(({ lat, lng }) => Cesium.Cartographic.fromDegrees(lng, lat))
        let heights
        try { heights = (await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, carts)).map((c) => c.height) }
        catch (e) { heights = gcjPath.map(() => 0) }
        for (const s of samples) {
          const p = gcjPath[s.idx]
          shiftedProp.addSample(s.time, Cesium.Cartesian3.fromDegrees(p.lng, p.lat, heights[s.idx] + 10))
        }
        shiftedProp.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD
        shiftedProp.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD
        slot.positionProperty = shiftedProp
        if (totalTime > maxNewTime) maxNewTime = totalTime
        return { slot, prop: shiftedProp, totalTime }
      })
      await Promise.all(builds)
      const currentDuration = Cesium.JulianDate.secondsDifference(viewer.clock.stopTime, viewer.clock.startTime)
      if (maxNewTime > currentDuration) {
        viewer.clock.stopTime = Cesium.JulianDate.addSeconds(viewer.clock.startTime, maxNewTime, new Cesium.JulianDate())
      }
      newSlots.forEach(slot => {
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
      drawPathLine()
      showPopupAlert(`🚗 已加入 ${newSlots.length} 辆新车`, 'info')
      return
    }

    // 首次启动模拟
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
  
  // ==================== 路径清理 ====================
  function clearUserPath() {
    stopSimulation()
    routeMode.value = false
    routeStart.value = null
    routeEnd.value = null
    routeOptions.value = []
    selectedRoute.value = 0
    userPath.value = []
    vehicleSlots.value.forEach(slot => {
      slot.path = []
      clearSlotPathVisuals(slot)
    })
    vehicleProgress.value = 0
  }
  
  // ==================== OSRM 路径规划 ====================
  async function fetchOSRMRoutes(start, end, via) {
  const waypoints = via
    ? `${start.lng},${start.lat};${via.lng},${via.lat};${end.lng},${end.lat}`
    : `${start.lng},${start.lat};${end.lng},${end.lat}`
  const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&alternatives=true&steps=true`
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
    routeMode.value = true
    routeStart.value = null
    routeEnd.value = null
    routeOptions.value = []
    selectedRoute.value = 0
    updateClickHandler()
    const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
    if (slot) clearSlotPathVisuals(slot)
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
      drawBlockedRouteMarkers(route.path)
    }
  }
  
  function confirmRoute() {
    const route = routeOptions.value[selectedRoute.value]
    if (!route) return
    userPath.value = route.path
    store.setVehiclePaths(route.path)
    routeMode.value = false
    routeStart.value = null
    routeEnd.value = null
    routeOptions.value = []
    selectedRoute.value = 0
    updateClickHandler()
    drawPathLine()
    drawBlockedRouteMarkers(route.path)
    const blocked = checkRouteBlocked(route.path)
    if (blocked.length > 0) {
      showPopupAlert(`⚠️ ${blocked.length} 处路段阻断: ${blocked.map(b => b.name).join('、')}`, 'warning')
    } else {
      showPopupAlert(`✅ 已选择路线 ${((route.distance || 0) / 1000).toFixed(1)}km`, 'info')
    }
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
            image: createMarkerIcon('#1e3a8a'),
            width: 64,
            height: 80,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        drawingEntities.push(e)
        showPopupAlert('🖱️ 点击地图设置终点', 'info')
      } else if (!routeEnd.value) {
        routeEnd.value = { lat, lng }
        const e = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          billboard: {
            image: createMarkerIcon('#0f172a'),
            width: 64,
            height: 80,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
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
    }
    if (provider) {
      viewer.imageryLayers.addImageryProvider(provider)
    }
  }

  // 动态注册/注销点击事件
  function updateClickHandler() {
    if (!clickHandler) return
    clickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    if (drawingMode.value || routeMode.value) {
      clickHandler.setInputAction((click) => { handleMapClick(click.position) }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }
  }
  </script>
  
  <style scoped>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .multi-vehicle-page { display: flex; flex-direction: column; height: 100%; font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; background: transparent; color: #2a3d40; pointer-events: none; }
  .main-container { display: flex; flex: 1; overflow: hidden; position: relative; }
  #map { flex: 1; min-width: 0; z-index: 1; position: relative; pointer-events: none; }
  .cesium-container { width: 100%; height: 100%; }
  .cesium-container :deep(.cesium-viewer),
  .cesium-container :deep(.cesium-widget),
  .cesium-container :deep(.cesium-viewer canvas) {
    width: 100% !important;
    height: 100% !important;
    touch-action: none;
  }
  .btn { padding: 6px 14px; border: 1px solid rgba(45, 138, 78, 0.2); border-radius: 4px; background: rgba(45, 138, 78, 0.08); color: #2a3d40; cursor: pointer; font-size: 12px; transition: all 0.2s; }
  .btn:hover { border-color: #e94560; }
  .btn-sm { padding: 4px 10px; font-size: 11px; }
  @media (max-width: 700px) { .main-container { flex-direction: column; } #map { height: 400px; flex: none; } }
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