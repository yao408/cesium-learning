<template>
  <div class="bigscreen">
    <div class="panel-left">
      <div class="panel-header">
        <h1 class="platform-title">灾害应急可视化大屏</h1>
      </div>
      <div class="info-card">
        <div class="card-header">
          <span class="card-icon">📍</span>
          <span class="card-title">震中信息</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">位置</span>
            <span class="info-value">{{ epicenterInfo.place }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">震级</span>
            <span class="info-value danger">M{{ epicenterInfo.mag }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">深度</span>
            <span class="info-value">{{ epicenterInfo.depth }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">时间</span>
            <span class="info-value">{{ epicenterInfo.time }}</span>
          </div>
        </div>
      </div>
      <div class="info-card">
        <div class="card-header">
          <span class="card-icon">🚛</span>
          <span class="card-title">救援车辆</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">路线数</span>
            <span class="info-value">{{ vehicleInfo.active }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">剩余距离</span>
            <span class="info-value">{{ vehicleInfo.remaining }}</span>
          </div>
        </div>
      </div>
      <div class="info-card">
        <div class="card-header">
          <span class="card-icon">👁️</span>
          <span class="card-title">通视分析</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">瞭望塔 → 指挥中心</span>
            <span class="info-value">{{ viewshedInfo.visible }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">距离</span>
            <span class="info-value">{{ viewshedInfo.distance }}</span>
          </div>
        </div>
      </div>
      <div class="info-card">
        <div class="card-header">
          <span class="card-icon">🌊</span>
          <span class="card-title">洪水模拟</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">淹没面积</span>
            <span class="info-value">{{ floodInfo.area }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最大水深</span>
            <span class="info-value">{{ floodInfo.maxDepth }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-right">
      <div class="legend-card">
        <div class="card-header">
          <span class="card-icon">🎨</span>
          <span class="card-title">图例</span>
        </div>
        <div class="legend-items">
          <div class="legend-item">
            <span class="legend-dot" style="background:#dc2626;box-shadow:0 0 8px #dc2626"></span>
            <span>震中光柱</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background:#e74c3c;box-shadow:0 0 8px #e74c3c"></span>
            <span>救援路线 1</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background:#f39c12;box-shadow:0 0 8px #f39c12"></span>
            <span>救援路线 2</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background:#27ae60;box-shadow:0 0 8px #27ae60"></span>
            <span>救援路线 3</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background:#3b82f6;box-shadow:0 0 8px #3b82f6"></span>
            <span>通视线</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background:rgba(59,130,246,0.5);box-shadow:0 0 8px #3b82f6"></span>
            <span>洪水淹没区</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as Cesium from 'cesium'
import { useViewerStore } from '../stores/viewerStore.js'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useVehicleSimulation } from '../composables/useVehicleSimulation.js'
import { useViewshedAnalysis } from '../composables/useViewshedAnalysis.js'
import { GPUFloodSim } from '../utils/gpuFloodSim.js'

const viewerStore = useViewerStore()
const scenarioStore = useScenarioStore()
let darkLayer = null
let savedImageryLayers = []
const epicenterEntities = []
const losEntities = []
let floodSim = null
let floodBoundaryEntities = []
const floodInfo = ref({ area: '--', maxDepth: '--' })
const viewshedInfo = ref({ visible: '--', distance: '--' })
const vehicleInfo = ref({ active: '--', remaining: '--' })

const epicenterInfo = {
  lon: 104.0694, lat: 31.5685, mag: 6.5, depth: '10 km',
  time: '2008-05-12 14:28:00', place: '四川省德阳市绵竹市清平镇',
}

onMounted(async () => {
  const viewer = viewerStore.viewer
  if (!viewer) return

  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0e17')
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0f172a')
  viewer.scene.skyBox.show = false
  viewer.scene.skyAtmosphere.show = false

  savedImageryLayers = [...viewer.imageryLayers._layers]
  viewer.imageryLayers.removeAll()

  darkLayer = viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`,
      maximumLevel: 19,
    })
  )

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(104.0694, 31.5685, 80000),
    orientation: { heading: 0, pitch: -0.5, roll: 0 },
  })

  drawEpicenter()
  drawDemoMarkers()
  await loadVehiclePaths()
  loadViewshed()
  loadFloodSim()
})

let pulseHandler = null

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
  } else {
    ctx.beginPath()
    ctx.arc(cx, cy, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.shadowBlur = 0
    ctx.stroke()
  }

  return canvas
}

function drawDemoMarkers() {
  const viewer = viewerStore.viewer
  if (!viewer) return

  const markers = [
    { lon: 104.0694, lat: 31.5685, color: '#3b82f6', shape: 'diamond', label: '指挥中心' },
    { lon: 104.08, lat: 31.56, color: '#38bdf8', shape: 'circle', label: '监测站 A' },
    { lon: 104.05, lat: 31.575, color: '#818cf8', shape: 'hexagon', label: '监测站 B' },
  ]

  const cartographics = markers.map(m => Cesium.Cartographic.fromDegrees(m.lon, m.lat))
  Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartographics).then((samples) => {
    markers.forEach((m, i) => {
      const groundH = samples[i]?.height ?? 0
      const iconCanvas = createGlowMarkerIcon(m.color, m.shape)

      viewer.entities.add({
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
        label: {
          text: m.label,
          font: '11px "PingFang SC", "Microsoft YaHei", sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#e0e7ff'),
          outlineColor: Cesium.Color.fromCssColorString('#0f172a'),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -28),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        name: `标记-${m.label}`,
      })
    })
  })
}

function drawEpicenter() {
  const viewer = viewerStore.viewer
  if (!viewer) return

  const ep = epicenterInfo
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

// ==================== 车辆路径 ====================
async function loadVehiclePaths() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  scenarioStore.setDispatchCenter({ lat: 31.5685, lng: 104.0694, name: '震中指挥中心' })
  const vehicleSim = useVehicleSimulation()
  vehicleSim.setup(viewer)
  await vehicleSim.autoLoadDispatchScenario()
  const slots = vehicleSim.vehicleSlots.value
  if (slots.length > 0) {
    vehicleInfo.value.active = `${slots.length} 条路线`
    vehicleInfo.value.remaining = '计算中...'
  }
}

// ==================== 通视分析 ====================
async function loadViewshed() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  const { computeLineOfSight } = useViewshedAnalysis()
  try {
    const result = await computeLineOfSight(viewer, {
      observerPoint: { lon: 104.08, lat: 31.56 },
      targetPoint: { lon: 104.0694, lat: 31.5685 },
      observerHeight: 50,
      targetHeight: 10,
      losEntities,
      pointColor: '#3b82f6',
    })
    viewshedInfo.value.visible = result.result.visible ? '✅ 可见' : '❌ 遮挡'
    viewshedInfo.value.distance = (result.result.totalDist / 1000).toFixed(1) + ' km'
  } catch (e) {
    console.warn('通视分析失败:', e)
  }
}

// ==================== 洪水模拟 ====================
async function loadFloodSim() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  floodSim = new GPUFloodSim(viewer)
  try {
    await floodSim.init(104.0694, 31.5685, 0.05)
    floodSim.setSourcePoint(104.0694, 31.5685, 800000)
    floodSim.setFlowRate(0.3)
    floodSim.startSimulation()
    setTimeout(() => {
      if (!floodSim) return
      const boundary = floodSim.getFloodBoundary()
      if (boundary && boundary.length > 0) {
        drawFloodBoundary(boundary)
      }
      const stats = floodSim.getStats()
      if (stats) {
        floodInfo.value.area = (stats.flooded || 0) + ' km²'
        floodInfo.value.maxDepth = '模拟中'
      }
      floodSim.stopSimulation()
    }, 8000)
  } catch (e) {
    console.warn('洪水模拟启动失败:', e)
  }
}

function drawFloodBoundary(boundary) {
  const viewer = viewerStore.viewer
  if (!viewer || !boundary.length) return
  floodBoundaryEntities.forEach(e => viewer.entities.remove(e))
  floodBoundaryEntities = []
  const entity = viewer.entities.add({
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(boundary),
      material: Cesium.Color.fromCssColorString('#3b82f6').withAlpha(0.25),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#60a5fa').withAlpha(0.6),
      outlineWidth: 2,
      clampToGround: true,
    },
    name: '洪水淹没区',
  })
  floodBoundaryEntities.push(entity)
}

onBeforeUnmount(() => {
  const viewer = viewerStore.viewer
  if (!viewer) return

  epicenterEntities.forEach(e => viewer.entities.remove(e))
  epicenterEntities.length = 0

  losEntities.forEach(e => viewer.entities.remove(e))
  losEntities.length = 0

  floodBoundaryEntities.forEach(e => viewer.entities.remove(e))
  floodBoundaryEntities = []

  if (floodSim) {
    floodSim.stopSimulation()
    floodSim.destroy()
    floodSim = null
  }

  viewer.imageryLayers.removeAll()
  savedImageryLayers.forEach(layer => viewer.imageryLayers.add(layer))
  savedImageryLayers = []

  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#3d5a4a')
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#4d6a5a')
})
</script>

<style scoped>
.bigscreen {
  position: fixed; inset: 0; z-index: 10;
  pointer-events: none;
}

.panel-left {
  position: absolute; left: 24px; top: 24px;
  width: 280px; pointer-events: auto;
  display: flex; flex-direction: column; gap: 16px;
}

.panel-right {
  position: absolute; right: 24px; top: 24px;
  pointer-events: auto;
}

.panel-header {
  margin-bottom: 4px;
}

.platform-title {
  font-size: 20px; font-weight: 700;
  color: rgba(255,255,255,0.9);
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(59,130,246,0.3);
}

.info-card, .legend-card {
  background: rgba(20, 30, 55, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.card-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.card-icon { font-size: 14px; }

.card-title {
  font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,0.8);
  letter-spacing: 1px;
}

.info-row {
  display: flex; justify-content: space-between;
  padding: 6px 0;
}

.info-label {
  font-size: 12px; color: rgba(255,255,255,0.4);
}

.info-value {
  font-size: 12px; color: rgba(255,255,255,0.75);
  font-weight: 500;
}

.info-value.danger { color: #f87171; }
.info-value.success { color: #4ade80; }

.legend-items {
  display: flex; flex-direction: column; gap: 10px;
}

.legend-item {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: rgba(255,255,255,0.7);
}

.legend-dot {
  width: 10px; height: 10px; border-radius: 50%;
}
</style>