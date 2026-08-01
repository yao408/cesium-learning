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
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import * as Cesium from 'cesium'
import ControlPanel from '../components/ControlPanel.vue'
import MapOverlay from '../components/MapOverlay.vue'
import { useViewerStore } from '../stores/viewerStore.js'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useSiteMarkers } from '../composables/useSiteMarkers.js'
import { useCameraInit } from '../composables/useCameraInit.js'
import { useVehicleSimulation } from '../composables/useVehicleSimulation.js'
import { getFactoryPositions } from '../data/factories.js'

const router = useRouter()
const store = useScenarioStore()
const viewerStore = useViewerStore()
const { clearAll, loadWatchtowers, loadVillages } = useSiteMarkers()
const { flyToAOI } = useCameraInit()
const {
  vehicleSlots, activeSlotId,
  isSimulating, isPaused, vehicleSpeed, vehicleProgress, currentSegment,
  cameraLocked, userPath,
  routeMode, routeStart, routeEnd, routeOptions, selectedRoute,
  addVehicleSlot, removeVehicleSlot, switchVehicleSlot,
  updatePathColor, updatePathWidth, updatePathOpacity,
  startSimulation, pauseSimulation, stopSimulation,
  fetchOSRMRoutes, startRoutePlanning, cancelRoutePlanning, selectRoute, confirmRoute,
  clearUserPath, drawPathLine, drawSlotPath,
  setup: setupVehicles, teardown: teardownVehicles,
} = useVehicleSimulation()

let viewer = null
let mouseHandler = null
let clickHandler = null
let cameraMoveEndListener = null
let drawingEntities = []
let alertTimer = null

const activeLayer = ref('satellite')
const drawingMode = ref(false)
const mouseLat = ref(0)
const mouseLng = ref(0)
const mapZoom = ref(13)
const centerLat = ref(39.9042)
const centerLng = ref(116.4074)
const showAlert = ref(false)
const alertType = ref('info')
const alertMessage = ref('')
const showInfoPanel = ref(false)

function showPopupAlert(msg, type) {
  const priority = { danger: 3, warning: 2, info: 1 }
  if (showAlert.value && priority[type] < priority[alertType.value]) return
  if (showAlert.value && alertTimer) { clearTimeout(alertTimer); alertTimer = null }
  alertMessage.value = msg; alertType.value = type; showAlert.value = true
  alertTimer = setTimeout(() => { showAlert.value = false; alertTimer = null }, 3000)
}

function handleMapClick(position) {
  // 先检查是否点击了工厂标记
  if (handleFactoryClick({ position })) return

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
    drawingEntities.push(e)
    drawPathLine()
    return
  }
}

// ==================== 工厂标记 ====================
let factoryEntities = []

function loadFactoryMarkers() {
  if (!viewer) return
  
  // 清除已有标记
  factoryEntities.forEach(e => viewer.entities.remove(e))
  factoryEntities = []
  
  const factories = getFactoryPositions()
  factories.forEach(factory => {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(factory.position.lng, factory.position.lat, 0),
      billboard: {
        image: '/icons/home.svg',
        width: 32,
        height: 32,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      // 自定义属性
      properties: {
        factoryId: factory.id,
        factoryName: factory.name,
      }
    })
    factoryEntities.push(entity)
  })
}

function handleFactoryClick(click) {
  if (!viewer || !viewer.scene) return false
  const pickedObject = viewer.scene.pick(click.position)
  if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
    const entity = pickedObject.id
    if (entity.properties && entity.properties.factoryId) {
      const factoryId = entity.properties.factoryId.getValue()
      router.push(`/factory/${factoryId}`)
      return true
    }
  }
  return false
}

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

function switchBaseLayer(type) {
  activeLayer.value = type
  if (!viewer) return
  viewer.imageryLayers.removeAll()
  let provider = null
  if (type === 'amap') {
    provider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      minimumLevel: 3,
      maximumLevel: 18,
    })
  } else if (type === 'satellite') {
    provider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      minimumLevel: 3,
      maximumLevel: 18,
    })
  }
  if (provider) {
    viewer.imageryLayers.addImageryProvider(provider)
  }
}

function updateClickHandler() {
  if (!clickHandler) return
  clickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
  // 总是设置点击事件，处理工厂标记点击和路径绘制
  clickHandler.setInputAction((click) => { handleMapClick(click.position) }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return

  viewer.scene.globe.enableLighting = false
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.globe.maximumScreenSpaceError = 1.5
  viewer.scene.globe.showGroundAtmosphere = true
  viewer.shadows = true
  viewer.scene.msaaSamples = 4

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

  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50
  viewer.scene.renderError.addEventListener(() => {
    console.warn('Cesium render error - check corridor/groundPrimitive entities')
  })

  flyToAOI(viewer, { lon: 108, lat: 35, height: 15000000 })

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

  const canvas = viewer.scene.canvas
  canvas.addEventListener('mousedown', () => { cameraLocked.value = false })
  canvas.addEventListener('wheel', () => { cameraLocked.value = false })
  canvas.addEventListener('touchstart', () => { cameraLocked.value = false })

  setupVehicles(viewer)

  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  updateClickHandler()

  loadWatchtowers(store.watchtowers)
  loadVillages(store.hazards)
  
  // 加载工厂标记
  loadFactoryMarkers()
})

onBeforeUnmount(() => {
  teardownVehicles()
  if (mouseHandler) mouseHandler.destroy()
  viewer.entities.values
    .filter(e => e.name === '洪水淹没范围')
    .forEach(e => viewer.entities.remove(e))
  // 清理工厂标记
  factoryEntities.forEach(e => viewer.entities.remove(e))
  factoryEntities = []
  if (viewer) {
    if (cameraMoveEndListener) viewer.camera.moveEnd.removeEventListener(cameraMoveEndListener)
  }
  mouseHandler = null
  clearAll()
  viewer = null
})
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