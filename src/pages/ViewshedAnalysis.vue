<template>
  <div class="viewshed-page">
    <aside class="viewshed-panel">
      <div class="panel">
        <h3>👁️ 通视分析</h3>
        <p class="hint">360°扇区分析 | 点对点可视判断</p>
      </div>

      <div class="panel">
        <span class="label">分析模式</span>
        <div class="style-toggle" style="margin-top:4px">
          <button @click="analysisMode='viewshed'" :class="{ active: analysisMode==='viewshed' }">📡 360° 扇区</button>
          <button @click="analysisMode='los'" :class="{ active: analysisMode==='los' }">🎯 点对点</button>
        </div>
      </div>

      <div class="panel">
        <div class="control-group">
          <label>观察点高度 (高于地面)</label>
          <div class="slider-row">
            <input type="range" v-model.number="observerHeight" min="0" max="200" step="5" />
            <span class="value">{{ observerHeight }} m</span>
          </div>
        </div>
        <div class="control-group" v-if="analysisMode==='viewshed'">
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
        </div>
        <!-- 目标点高度 -->
        <div class="control-group" v-if="analysisMode==='los' && targetPoint">
          <label>目标点高度 (高于地面)</label>
          <div class="slider-row">
            <input type="range" v-model.number="targetHeight" min="0" max="200" step="5" />
            <span class="value">{{ targetHeight }} m</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <span class="label">操作</span>
        <div class="btn-group">
          <button @click="togglePickObserver" class="preset-btn" :class="{ active: pickObserver }">
            {{ pickObserver ? '🖱️ 选观察点中...' : '📍 观察点' }}
          </button>
          <button v-if="analysisMode==='los'" @click="togglePickTarget" class="preset-btn" :class="{ active: pickTarget }"
            :disabled="!observerPoint">
            {{ pickTarget ? '🖱️ 选目标点中...' : '🎯 目标点' }}
          </button>
          <button @click="clearAnalysis" class="preset-btn btn-danger">🗑️ 清空</button>
        </div>
        <button @click="runAnalysis" class="preset-btn" style="margin-top:6px;width:100%" :disabled="!observerPoint">
          🔄 分析
        </button>
        <button @click="flyToObserver" class="preset-btn" style="margin-top:4px;width:100%" :disabled="!observerPoint">
          👁️ 锁定观察点视角
        </button>
        <button @click="removeLockCamera" class="preset-btn" style="margin-top:4px;width:100%">
          🔓 解锁视角
        </button>
        <p v-if="observerPoint" class="hint" style="margin-top:8px">
          👁️ 观察点: {{ observerPoint.name || `经度${observerPoint.lon.toFixed(2)} 纬度${observerPoint.lat.toFixed(2)}` }}
        </p>
        <p v-if="observerPoint" class="hint">观察高度: {{ observerHeight }}m | 地面海拔: {{ observerPoint.groundHeight?.toFixed(1) || '--' }} m</p>
        <p v-if="targetPoint" class="hint" style="margin-top:4px">
          🎯 目标点: {{ targetPoint.name || `经度${targetPoint.lon.toFixed(2)} 纬度${targetPoint.lat.toFixed(2)}` }}
        </p>
        <p v-if="targetPoint" class="hint">目标高度: {{ targetHeight }}m | 地面海拔: {{ targetPoint.groundHeight?.toFixed(1) || '--' }} m</p>
        <!-- 点对点结果 -->
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
        <span class="label">快速预置</span>
        <div class="preset-btns">
          <button v-for="p in mountainPresets" :key="p.name" @click="addPresetPoint(p)" class="preset-btn">
            {{ p.name }}
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="info">
          <p>🟢 绿色 = 可见</p>
          <p>🔴 红色 = 被山挡住</p>
          <p>🔵 蓝点 = 观察点</p>
          <p v-if="analysisMode==='los'">🟡 黄点 = 目标点</p>
          <p v-if="analysisMode==='viewshed'">💡 先点预置点，再点🔄分析</p>
          <p v-if="analysisMode==='los'">💡 先选观察点，再选目标点，点🔄分析</p>
        </div>
      </div>

      <div class="panel hover-panel" v-if="hoverInfo">
        <span class="label">🖱️ 鼠标位置</span>
        <p class="hint">经度 {{ hoverInfo.lon.toFixed(5) }} &nbsp; 纬度 {{ hoverInfo.lat.toFixed(5) }}</p>
        <p class="hint">海拔 {{ hoverInfo.height.toFixed(1) }} m</p>
      </div>

      <div class="panel" v-if="viewshedStats">
        <h4>📊 分析统计</h4>
        <div ref="chartRef" style="width: 100%; height: 180px"></div>
        <p class="hint" style="text-align:center; margin: 4px 0 0 0">
          总射线: {{ viewshedStats.totalRays }} | 可见 {{ viewshedStats.visibleDist }}km | 不可见 {{ viewshedStats.invisibleDist }}km
        </p>
      </div>
    </aside>

    <div class="map-area">
      <div ref="cesiumContainer" class="cesium-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as Cesium from 'cesium'
import * as echarts from 'echarts'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesiumContainer = ref(null)
const observerHeight = ref(5)
const maxDistance = ref(5000)
const stepSize = ref(100)
const analysisMode = ref('viewshed')
const pickObserver = ref(false)
const pickTarget = ref(false)
const observerPoint = ref(null)
const targetPoint = ref(null)
const targetHeight = ref(0)
const losResult = ref(null)
const hoverInfo = ref(null)
const viewshedStats = ref(null)
const chartRef = ref(null)

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
let observerEntity = null
let targetEntity = null
let viewshedEntities = []
let losEntities = []
let lockCameraListener = null

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
      itemStyle: { borderRadius: 4, borderColor: '#1a1a2e', borderWidth: 3 },
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
  if (observerEntity) { viewer.entities.remove(observerEntity); observerEntity = null }
  if (targetEntity) { viewer.entities.remove(targetEntity); targetEntity = null }
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities = []
  losEntities.forEach(e => viewer.entities.remove(e))
  losEntities = []
  observerPoint.value = null
  targetPoint.value = null
  losResult.value = null
  viewshedStats.value = null
  if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  cancelPick()
  resetCameraConstraints()
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
    observerPoint.value = {
      lon: info.lon, lat: info.lat,
      name: `经度${info.lon.toFixed(2)} 纬度${info.lat.toFixed(2)}`,
      groundHeight: info.groundH,
    }
    createObserverMarker(info.lon, info.lat)
    pickObserver.value = false
    clickHandler.destroy()
    clickHandler = null
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function togglePickTarget() {
  if (pickTarget.value) { cancelPick(); return }
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
  clearAnalysis()
  const groundH = await getHeightAtPosition(preset.lon, preset.lat)
  observerPoint.value = { ...preset, groundHeight: groundH }
  createObserverMarker(preset.lon, preset.lat)
  flyToPoint(preset.lon, preset.lat)
}

function runAnalysis() {
  if (!observerPoint.value) return
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
  const p = observerPoint.value
  computeViewshed(p.lon, p.lat)
}

function createObserverMarker(lon, lat) {
  if (observerEntity) viewer.entities.remove(observerEntity)
  const groundH = observerPoint.value?.groundHeight || 0
  observerEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, groundH),
    point: {
      pixelSize: 12,
      color: Cesium.Color.DODGERBLUE,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.NONE,
    },
    label: {
      text: '观察点',
      font: '12px sans-serif',
      pixelOffset: new Cesium.Cartesian2(0, -20),
      showBackground: true,
      backgroundColor: Cesium.Color.DODGERBLUE,
    },
  })
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
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat, 0)
  const result = await Cesium.sampleTerrain(viewer.terrainProvider, 12, [cartographic])
  return result[0].height || 0
}

async function getPickInfo(click) {
  const ray = viewer.camera.getPickRay(click.position)
  if (!Cesium.defined(ray)) return null
  let cartesian
  try { cartesian = viewer.scene.globe.pick(ray, viewer.scene) } catch (e) {}
  if (!Cesium.defined(cartesian)) {
    cartesian = viewer.scene.pickPosition(click.position)
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

async function computeViewshed(centerLon, centerLat) {
  const groundHeight = await getHeightAtPosition(centerLon, centerLat)
  const totalHeight = groundHeight + observerHeight.value
  const steps = Math.floor(360 / 2)

  for (let i = 0; i < steps; i++) {
    const angle = Cesium.Math.toRadians(i * 2)
    await raycastAndDraw(centerLon, centerLat, totalHeight, angle)
  }

  let totalDist = 0
  let visibleDist = 0
  viewshedEntities.forEach(e => {
    const c = e.polyline?.material?.color?.getValue()
    const isVisible = c && c.red === 0 && c.green > 0.5
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
  await nextTick()
  updateChart()
}

async function raycastAndDraw(originLon, originLat, originHeight, angle) {
  const step = stepSize.value
  let maxElevationAngle = -Infinity
  let prevVisible = true
  let segStartLon = originLon
  let segStartLat = originLat
  const cosLat = Math.cos(Cesium.Math.toRadians(originLat))

  function drawSegment(endLon, endLat, visible) {
    const color = visible ? Cesium.Color.GREEN.withAlpha(0.6) : Cesium.Color.RED.withAlpha(0.6)
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

  for (let dist = step; dist <= maxDistance.value; dist += step) {
    const dLat = (dist / 111000) * Math.cos(angle)
    const dLon = (dist / (111000 * cosLat)) * Math.sin(angle)
    const checkLon = originLon + dLon
    const checkLat = originLat + dLat

    const terrainH = await getHeightAtPosition(checkLon, checkLat)
    const elevationAngle = Math.atan2(terrainH - originHeight, dist)
    const visible = elevationAngle > maxElevationAngle

    if (visible) {
      maxElevationAngle = elevationAngle
    }

    if (visible !== prevVisible) {
      drawSegment(checkLon, checkLat, prevVisible)
      segStartLon = checkLon
      segStartLat = checkLat
      prevVisible = visible
    }
  }

  const endDist = maxDistance.value
  const endDlat = (endDist / 111000) * Math.cos(angle)
  const endDlon = (endDist / (111000 * cosLat)) * Math.sin(angle)
  drawSegment(originLon + endDlon, originLat + endDlat, prevVisible)
}

// ==================== 点对点通视分析 ====================
async function computeLineOfSight() {
  losEntities.forEach(e => viewer.entities.remove(e))
  losEntities = []
  losResult.value = null

  const obs = observerPoint.value
  const tgt = targetPoint.value

  const obsGround = await getHeightAtPosition(obs.lon, obs.lat)
  const tgtGround = await getHeightAtPosition(tgt.lon, tgt.lat)
  const obsHeight = obsGround + observerHeight.value
  const tgtHeight = tgtGround + targetHeight.value

  // 计算两点距离
  const dLat = (tgt.lat - obs.lat) * 111000
  const dLon = (tgt.lon - obs.lon) * 111000 * Math.cos(Cesium.Math.toRadians((obs.lat + tgt.lat) / 2))
  const totalDist = Math.sqrt(dLat * dLat + dLon * dLon)

  // 沿路径采样，检查地形是否遮挡
  const sampleCount = Math.max(20, Math.floor(totalDist / 100))
  let blocked = false
  let blockDist = 0
  let blockLon = 0, blockLat = 0

  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount
    const checkLon = obs.lon + (tgt.lon - obs.lon) * t
    const checkLat = obs.lat + (tgt.lat - obs.lat) * t
    const terrainH = await getHeightAtPosition(checkLon, checkLat)

    // 线性插值计算该位置的视线高度
    const losH = obsHeight + (tgtHeight - obsHeight) * t

    if (terrainH > losH) {
      blocked = true
      blockDist = totalDist * t
      blockLon = checkLon
      blockLat = checkLat
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

function flyToObserver() {
  const p = observerPoint.value
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
    if (!observerPoint.value) return
    e.preventDefault()
    flyToObserver()
  }
  if (e.key === 'Escape') {
    removeLockCamera()
    if (observerPoint.value) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(observerPoint.value.lon, observerPoint.value.lat, 5000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
        duration: 1.5,
      })
    }
  }
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
  viewer.imageryLayers.removeAll()
  viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
    url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    subdomains: ['1', '2', '3', '4'],
    minimumLevel: 3,
    maximumLevel: 18,
  }))

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(117.10, 36.25, 20000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
  })

  hoverHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  hoverHandler.setInputAction(handleMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  if (clickHandler) clickHandler.destroy()
  if (hoverHandler) hoverHandler.destroy()
  if (chartInstance) chartInstance.dispose()
  document.removeEventListener('keydown', handleKeyDown)
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

.los-result {
  margin-top: 8px;
  padding: 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a2e;
  border: 1px solid #0f3460;
}

.los-result.visible {
  border-color: #2ecc71;
  background: rgba(46, 204, 113, 0.1);
}

.los-result:not(.visible) {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

.los-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.los-text {
  font-size: 12px;
  color: #ccc;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.los-text strong {
  font-size: 14px;
}

.los-result.visible .los-text strong {
  color: #2ecc71;
}

.los-result:not(.visible) .los-text strong {
  color: #e74c3c;
}
</style>