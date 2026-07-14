<template>
  <div class="data-page">
    <aside class="side-panel" :class="{ collapsed }">
      <div class="panel-header">
        <h3>📡 多源数据接入</h3>
        <p class="hint">图层加载 · GeoJSON · 3D模型 · 绘制 · 标注</p>
      </div>
      <div v-show="!collapsed" class="panel-body">
        <div class="btn-row" style="margin-top:6px">
          <button :class="{ active: is2D }" @click="switchTo2D" class="btn btn-sm">📐 2D</button>
          <button :class="{ active: !is2D }" @click="switchTo3D" class="btn btn-sm">🌍 3D</button>
        </div>

      <div class="panel">
        <h4>🗺️ 底图切换</h4>
        <div class="btn-row">
          <button :class="{ active: currentBaseMap === 'ion' }" @click="switchBaseMap('ion')" class="btn btn-sm">Bing卫星</button>
          <button :class="{ active: currentBaseMap === 'gaode' }" @click="switchBaseMap('gaode')" class="btn btn-sm">高德</button>
        </div>
      </div>

      <div class="panel">
        <h4>📍 GeoJSON</h4>
        <div class="btn-row">
          <button @click="triggerFileInput('geojson')" class="btn btn-sm">📁 本地文件</button>
          <button @click="clearGeoJSON" class="btn btn-danger btn-sm">清除</button>
        </div>
        <input type="file" ref="geojsonInput" accept=".json,.geojson" @change="onGeoJSONFile" style="display:none" />
        <p v-if="geojsonCount" class="hint">已加载 {{ geojsonCount }} 个实体</p>
        <p v-if="pickedFeature" class="hint" style="color:#e94560">选中: {{ pickedFeature }}</p>
      </div>

      <div class="panel">
        <h4>📐 坐标画AOI</h4>
        <div class="coord-row">
          <span>北纬</span><input v-model="aoi.maxLat" type="number" step="0.01" />
          <span>东经</span><input v-model="aoi.maxLng" type="number" step="0.01" />
        </div>
        <div class="coord-row">
          <span>南纬</span><input v-model="aoi.minLat" type="number" step="0.01" />
          <span>西经</span><input v-model="aoi.minLng" type="number" step="0.01" />
        </div>
        <div class="btn-row" style="margin-top:4px">
          <button @click="drawAOI" class="btn btn-sm">✅ 绘制AOI</button>
          <button @click="clearAOI" class="btn btn-danger btn-sm">清除</button>
        </div>
        <p class="hint">点击地震监测中的地震点自动生成周边场景</p>
        <div class="control-group" style="margin-top: 6px;">
          <label>村庄半径 {{ villageRadius }}km</label>
          <input type="range" v-model.number="villageRadius" min="5" max="100" step="5" />
        </div>
        <p v-if="noDataWarning" class="hint" style="color:#e94560">{{ noDataWarning }}</p>
      </div>

      <div class="panel">
        <h4 class="collapsible" @click="toggleSection('model')">🏗️ 3D 模型 (glTF) <span class="collapse-arrow">{{ sections.model ? '▶' : '▼' }}</span></h4>
        <div v-show="!sections.model">
          <div class="btn-row">
            <button @click="triggerFileInput('model')" class="btn btn-sm">📁 本地文件</button>
            <button @click="clearModel" class="btn btn-danger btn-sm">清除</button>
          </div>
          <input type="file" ref="modelInput" accept=".gltf,.glb" @change="onModelFile" style="display:none" />
          <div v-if="modelLoaded" class="control-group">
            <label>缩放 {{ modelScale.toFixed(0) }}x</label>
            <input type="range" v-model.number="modelScale" min="1" max="2000" step="10" @input="updateModelScale" />
          </div>
        </div>
      </div>

      <div class="panel">
        <h4 class="collapsible" @click="toggleSection('tiles')">🏙️ 3D 瓦片 (3D Tiles) <span class="collapse-arrow">{{ sections.tiles ? '▶' : '▼' }}</span></h4>
        <div v-show="!sections.tiles">
          <div class="btn-row">
            <button :disabled="tilesetLoading" @click="loadHefeiTileset" class="btn btn-sm">
              {{ tilesetLoading ? '加载中...' : '🏙️ 加载合肥市' }}
            </button>
            <button v-if="hefeiTileset" @click="clearHefeiTileset" class="btn btn-danger btn-sm">清除</button>
          </div>
          <p v-if="tilesetLoaded" class="hint" style="color:#4ade80">已加载 {{ tileCount }} 个瓦片</p>
          <p v-if="tilesetError" class="hint" style="color:#e94560">{{ tilesetError }}</p>
        </div>
      </div>

      <div class="panel">
        <h4 class="collapsible" @click="toggleSection('cityViewshed')">🔭 城市通视分析 <span class="collapse-arrow">{{ sections.cityViewshed ? '▶' : '▼' }}</span></h4>
        <div v-show="!sections.cityViewshed">
          <p class="hint" style="margin-bottom:6px">需先加载 3D 瓦片，再在地图上点击放置观察点</p>
          <div class="btn-row">
            <button @click="toggleCityPick" class="btn btn-sm" :class="{ active: cityViewshed.picking }">
              {{ cityViewshed.picking ? '🖱️ 选点中...' : '+ 放置观察点' }}
            </button>
            <button @click="clearCityViewshed" class="btn btn-danger btn-sm" :disabled="cityViewshed.points.length === 0">清空</button>
          </div>
          <div v-if="cityViewshed.points.length" class="point-list">
            <div v-for="(p, i) in cityViewshed.points" :key="i" class="point-item">
              <span class="point-dot" :style="{ background: '#4ade80' }"></span>
              <span>{{ p.name }}</span>
              <span class="point-coord">{{ p.lon.toFixed(4) }}, {{ p.lat.toFixed(4) }}</span>
            </div>
          </div>
          <div v-if="cityViewshed.points.length" class="control-group" style="margin-top:6px">
            <label>塔高 {{ cityViewshed.observerHeight }}m</label>
            <input type="range" v-model.number="cityViewshed.observerHeight" min="5" max="200" step="5" />
            <label>最大距离 {{ cityViewshed.maxDistance }}m</label>
            <input type="range" v-model.number="cityViewshed.maxDistance" min="500" max="10000" step="100" />
            <label>水平视角 {{ cityViewshed.fovH }}°</label>
            <input type="range" v-model.number="cityViewshed.fovH" min="30" max="120" step="5" />
            <label>垂直视角 {{ cityViewshed.fovV }}°</label>
            <input type="range" v-model.number="cityViewshed.fovV" min="10" max="90" step="5" />
            <label>水平朝向 {{ cityViewshed.heading }}°</label>
            <input type="range" v-model.number="cityViewshed.heading" min="0" max="360" step="1" />
            <label>俯仰角 {{ cityViewshed.pitch }}°</label>
            <input type="range" v-model.number="cityViewshed.pitch" min="-90" max="90" step="1" />
            <p class="hint" style="margin:2px 0 0 0; font-size:10px">拖动滑块精细调节，或开启拖拽模式直接在画面上操作</p>
          </div>
          <div class="btn-row" style="margin-top:4px" v-if="cityViewshed.points.length">
            <button @click="toggleFrustumEdit" class="btn btn-sm" :class="{ active: frustumEditing }">
              {{ frustumEditing ? '👆 拖拽中...' : '✋ 拖拽调节视场' }}
            </button>
            <button @click="runCityViewshed" class="btn btn-sm" :disabled="cityViewshed.loading">
              {{ cityViewshed.loading ? '分析中...' : '🎨 开始分析' }}
            </button>
            <button @click="clearGPUViewshed" class="btn btn-danger btn-sm">🧹 清除结果</button>
          </div>
          <p v-if="!cityViewshed.points.length && !cityViewshed.picking" class="hint">点击「放置观察点」后在地图上点击</p>
        </div>
      </div>

      <div class="panel">
        <h4 class="collapsible" @click="toggleSection('geo')">🧊 绘制几何体 <span class="collapse-arrow">{{ sections.geo ? '▶' : '▼' }}</span></h4>
        <div v-show="!sections.geo">
          <div class="btn-row">
            <button :class="{ active: geoMode === 'box' }" @click="startGeoDraw('box')" class="btn btn-sm">盒子</button>
            <button :class="{ active: geoMode === 'cylinder' }" @click="startGeoDraw('cylinder')" class="btn btn-sm">圆柱</button>
            <button :class="{ active: geoMode === 'sphere' }" @click="startGeoDraw('sphere')" class="btn btn-sm">球体</button>
            <button :class="{ active: geoMode === 'wall' }" @click="startGeoDraw('wall')" class="btn btn-sm">墙体</button>
          </div>
          <div v-if="geoMode" class="control-group">
            <label>尺寸 {{ geoSize.toFixed(0) }}m</label>
            <input type="range" v-model.number="geoSize" min="10" max="500" step="10" />
          </div>
          <button v-if="geoMode" @click="clearGeoDraw" class="btn btn-danger btn-sm" style="margin-top:4px">取消</button>
          <p v-if="geoMode" class="hint">点击地图放置几何体</p>
        </div>
      </div>

      <div class="panel">
        <h4 class="collapsible" @click="toggleSection('draw')">✏️ 绘制 <span class="collapse-arrow">{{ sections.draw ? '▶' : '▼' }}</span></h4>
        <div v-show="!sections.draw">
          <div class="btn-row">
            <button :class="{ active: drawMode === 'point' }" @click="startDraw('point')" class="btn btn-sm">点</button>
            <button :class="{ active: drawMode === 'line' }" @click="startDraw('line')" class="btn btn-sm">线</button>
            <button :class="{ active: drawMode === 'polygon' }" @click="startDraw('polygon')" class="btn btn-sm">面</button>
            <button @click="clearDraw" class="btn btn-danger btn-sm">清除</button>
          </div>
          <p class="hint">左键添加点，右键完成绘制</p>
          <div v-if="drawInfoList.length" class="draw-info">
            <div v-for="(info, i) in drawInfoList" :key="i" class="draw-item">
              <span class="draw-type">{{ info.type === 'point' ? '📍' : info.type === 'line' ? '📏' : '⬠' }} {{ info.type }}</span>
              <span class="draw-coords" :title="info.coords">{{ info.coords }}</span>
              <button @click="exportDrawItem(i)" class="btn btn-xs">导出</button>
            </div>
            <button @click="exportAllDraw" class="btn btn-sm" style="margin-top:4px">导出全部 GeoJSON</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <h4>📌 标注</h4>
        <div class="btn-row">
          <button :class="{ active: labelMode }" @click="toggleLabelMode" class="btn btn-sm">点击添加标注</button>
          <button @click="clearLabels" class="btn btn-danger btn-sm">清除</button>
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
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as Cesium from 'cesium'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useViewerStore } from '../stores/viewerStore.js'
import { useSiteMarkers } from '../composables/useSiteMarkers.js'
import { useViewshedGPU } from '../composables/useViewshedGPU.js'
import { useTerrainQuery } from '../composables/useTerrainQuery.js'
import { haversineDistance, gcj02ToWGS84 } from '../utils/geo.js'

const store = useScenarioStore()
const viewerStore = useViewerStore()
const { addVillageDot, addWatchtower, clearAll } = useSiteMarkers()

const collapsed = ref(false)
const sections = reactive({ model: true, geo: true, draw: true, tiles: true, cityViewshed: true })
function toggleSection(key) { sections[key] = !sections[key] }
const is2D = ref(false)
const currentBaseMap = ref('ion')
const loadingGeoJSON = ref(false)
const noDataWarning = ref('')
const villageRadius = ref(30)
const loadingModel = ref(false)
const geojsonCount = ref(0)
const pickedFeature = ref('')
const modelLoaded = ref(false)
const modelScale = ref(100)
const tilesetLoading = ref(false)
const tilesetLoaded = ref(false)
const tileCount = ref(0)
const tilesetError = ref('')
let hefeiTileset = null
// 城市通视分析状态
const cityViewshed = reactive({
  observerHeight: 20,
  maxDistance: 1500,
  fovH: 90,
  fovV: 60,
  heading: 0,
  pitch: -30,
  picking: false,
  points: [],
  loading: false,
})
let cityClickHandler = null
let cityViewshedEntities = []
let cityFrustumEntities = []
let frustumEditHandler = null
const frustumEditing = ref(false)
const { runGPUViewshed, clearGPUViewshed } = useViewshedGPU()
const { getPickInfo, getHeightAtPosition } = useTerrainQuery()
const drawMode = ref('')
const labelMode = ref(false)
const geoMode = ref('')
const geoSize = ref(100)
const drawInfoList = ref([])
const geojsonInput = ref(null)
const modelInput = ref(null)

const aoi = reactive({
  minLat: 29.3, maxLat: 29.9, minLng: 101.8, maxLng: 102.4
})
let aoiEntities = []
let viewer = null

function drawAOI() {
  if (!viewer) return
  clearAOI()
  const { minLat, maxLat, minLng, maxLng } = aoi
  const cornerRatio = 0.15
  const dLon = (maxLng - minLng) * cornerRatio
  const dLat = (maxLat - minLat) * cornerRatio
  const color = Cesium.Color.fromCssColorString('#64b5f6').withAlpha(0.9)

  const corners = [
    [[minLng, maxLat], [minLng + dLon, maxLat]],
    [[minLng, maxLat], [minLng, maxLat - dLat]],
    [[maxLng, maxLat], [maxLng - dLon, maxLat]],
    [[maxLng, maxLat], [maxLng, maxLat - dLat]],
    [[minLng, minLat], [minLng + dLon, minLat]],
    [[minLng, minLat], [minLng, minLat + dLat]],
    [[maxLng, minLat], [maxLng - dLon, minLat]],
    [[maxLng, minLat], [maxLng, minLat + dLat]],
  ]
  corners.forEach(([start, end]) => {
    const entity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([...start, ...end]),
        width: 2,
        material: color,
        clampToGround: true,
      },
    })
    aoiEntities.push(entity)
  })

  const fill = viewer.entities.add({
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
      material: Cesium.Color.fromCssColorString('#64b5f6').withAlpha(0.06),
      fill: true,
      outline: false,
    },
  })
  aoiEntities.push(fill)

  store.setAOI({ minLat, maxLat, minLng, maxLng })
  viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
    duration: 1.5,
  })
}

function clearAOI() {
  aoiEntities.forEach(e => viewer.entities.remove(e))
  aoiEntities = []
}
let geojsonDataSource = null
let dynamicScenarioEntities = []  
let modelEntity = null
let drawHandler = null
let drawPoints = []
let drawEntities = []
let labelHandler = null
let labelEntities = []
let geoHandler = null
let geoEntities = []
let currentBaseLayer = null

function getViewer() { return viewerStore.viewer }

function switchBaseMap(type) {
  currentBaseMap.value = type
  if (currentBaseLayer) {
    viewer.imageryLayers.remove(currentBaseLayer, true)
    currentBaseLayer = null
  }
  if (type === 'gaode') {
    currentBaseLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        subdomains: ['1', '2', '3', '4'],
      }),
    )
  }
  // 'ion' = 默认Bing底图，只删掉高德图层，不碰默认层
}

function switchTo2D() { is2D.value = true; viewer.scene.morphTo2D(0) }
function switchTo3D() { is2D.value = false; viewer.scene.morphTo3D(0) }

function clearGeoJSON() {
  if (geojsonDataSource) { viewer.dataSources.remove(geojsonDataSource); geojsonDataSource = null }
  geojsonCount.value = 0
  dynamicScenarioEntities.forEach(entity => viewer.entities.remove(entity))
  dynamicScenarioEntities = []
  pickedFeature.value = ''
  clearAll()
}

function clearModel() {
  if (modelEntity) { viewer.entities.remove(modelEntity); modelEntity = null }
  modelLoaded.value = false
}

async function loadHefeiTileset() {
  tilesetLoading.value = true
  tilesetError.value = ''
  try {
    hefeiTileset = await Cesium.Cesium3DTileset.fromUrl('/tiles/hefei/tileset.json', {
      maximumScreenSpaceError: 16,
    })
    viewer.scene.primitives.add(hefeiTileset)
    tilesetLoaded.value = true
    try {
      viewer.zoomTo(hefeiTileset, new Cesium.HeadingPitchRange(0, -0.5, 5000))
    } catch {
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(117.2272, 31.8206, 5000) })
    }
    hefeiTileset.tileLoad.addEventListener(() => {
      tileCount.value++
    })
  } catch (e) {
    tilesetError.value = '加载失败: ' + e.message
    console.error('3D Tiles 加载失败:', e)
  } finally {
    tilesetLoading.value = false
  }
}

function clearHefeiTileset() {
  if (hefeiTileset) {
    viewer.scene.primitives.remove(hefeiTileset)
    hefeiTileset = null
    tilesetLoaded.value = false
    tileCount.value = 0
  }
  clearCityViewshed()
}

// ==================== 城市通视分析 ====================
function showFrustumPreview() {
  hideFrustumPreview()
  if (!cityViewshed.points.length) return

  const p = cityViewshed.points[cityViewshed.points.length - 1]
  const pitchLayers = 6
  const headingSteps = 48

  const makeStripPositions = (layer, pitchLayers, halfFovH, headingCenter, pMin, pMax, R, enuToFixed) => {
    const p1 = pMin + layer * (pMax - pMin) / (pitchLayers - 1)
    const p2 = pMin + (layer + 1) * (pMax - pMin) / (pitchLayers - 1)
    const cp1 = Math.cos(p1), sp1 = Math.sin(p1)
    const cp2 = Math.cos(p2), sp2 = Math.sin(p2)
    const positions = []
    for (let j = 0; j <= headingSteps; j++) {
      const h = headingCenter - halfFovH + j * (2 * halfFovH) / headingSteps
      const enu = new Cesium.Cartesian3(R * cp1 * Math.sin(h), R * cp1 * Math.cos(h), R * sp1)
      positions.push(Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3()))
    }
    for (let j = headingSteps; j >= 0; j--) {
      const h = headingCenter - halfFovH + j * (2 * halfFovH) / headingSteps
      const enu = new Cesium.Cartesian3(R * cp2 * Math.sin(h), R * cp2 * Math.cos(h), R * sp2)
      positions.push(Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3()))
    }
    return positions
  }

  for (let layer = 0; layer < pitchLayers - 1; layer++) {
    const entity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          const totalH = p.groundHeight + cityViewshed.observerHeight + 2.1
          const viewPos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, totalH)
          const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(viewPos)
          const halfFovH = Cesium.Math.toRadians(cityViewshed.fovH * 0.5)
          const halfFovV = Cesium.Math.toRadians(cityViewshed.fovV * 0.5)
          const headingCenter = Cesium.Math.toRadians(cityViewshed.heading)
          const pitchCenter = Cesium.Math.toRadians(cityViewshed.pitch)
          const pMin = Math.max(pitchCenter - halfFovV, Cesium.Math.toRadians(-90))
          const pMax = pitchCenter + halfFovV
          const R = cityViewshed.maxDistance
          return new Cesium.PolygonHierarchy(
            makeStripPositions(layer, pitchLayers, halfFovH, headingCenter, pMin, pMax, R, enuToFixed)
          )
        }, false),
        material: Cesium.Color.DODGERBLUE.withAlpha(0.15),
        perPositionHeight: true,
      },
      id: `cityFrustumStrip_${layer}`,
    })
    cityFrustumEntities.push(entity)
  }

  const outlineEntity = viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const totalH = p.groundHeight + cityViewshed.observerHeight + 2.1
        const viewPos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, totalH)
        const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(viewPos)
        const halfFovH = Cesium.Math.toRadians(cityViewshed.fovH * 0.5)
        const halfFovV = Cesium.Math.toRadians(cityViewshed.fovV * 0.5)
        const headingCenter = Cesium.Math.toRadians(cityViewshed.heading)
        const pitchCenter = Cesium.Math.toRadians(cityViewshed.pitch)
        const pMin = Math.max(pitchCenter - halfFovV, Cesium.Math.toRadians(-90))
        const pMax = pitchCenter + halfFovV
        const R = cityViewshed.maxDistance
        const hMin = headingCenter - halfFovH, hMax = headingCenter + halfFovH
        const positions = []
        const N = 48
        const toWorld = (h, p) => {
          const enu = new Cesium.Cartesian3(R * Math.cos(p) * Math.sin(h), R * Math.cos(p) * Math.cos(h), R * Math.sin(p))
          return Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3())
        }
        for (let i = 0; i <= N; i++) positions.push(toWorld(hMin + i * (hMax - hMin) / N, pMax))
        for (let i = 0; i <= N; i++) positions.push(toWorld(hMax, pMax - i * (pMax - pMin) / N))
        for (let i = 0; i <= N; i++) positions.push(toWorld(hMax - i * (hMax - hMin) / N, pMin))
        for (let i = 0; i <= N; i++) positions.push(toWorld(hMin, pMin + i * (pMax - pMin) / N))
        return positions
      }, false),
      width: 2,
      material: Cesium.Color.DODGERBLUE.withAlpha(0.65),
      clampToGround: false,
    },
    id: 'cityFrustumOutline',
  })
  cityFrustumEntities.push(outlineEntity)

  const spokeEntity = viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const totalH = p.groundHeight + cityViewshed.observerHeight + 2.1
        const viewPos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, totalH)
        const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(viewPos)
        const halfFovH = Cesium.Math.toRadians(cityViewshed.fovH * 0.5)
        const halfFovV = Cesium.Math.toRadians(cityViewshed.fovV * 0.5)
        const headingCenter = Cesium.Math.toRadians(cityViewshed.heading)
        const pitchCenter = Cesium.Math.toRadians(cityViewshed.pitch)
        const pMin = Math.max(pitchCenter - halfFovV, Cesium.Math.toRadians(-90))
        const pMax = pitchCenter + halfFovV
        const R = cityViewshed.maxDistance
        const hMin = headingCenter - halfFovH, hMax = headingCenter + halfFovH
        const toWorld = (h, p) => {
          const enu = new Cesium.Cartesian3(R * Math.cos(p) * Math.sin(h), R * Math.cos(p) * Math.cos(h), R * Math.sin(p))
          return Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3())
        }
        const positions = []
        const spokes = 12
        for (let k = 0; k < spokes; k++) {
          const t = k / spokes
          const h = hMin + t * (hMax - hMin)
          positions.push(viewPos, toWorld(h, pMax))
          positions.push(viewPos, toWorld(hMax, pMax - t * (pMax - pMin)))
          positions.push(viewPos, toWorld(hMax - t * (hMax - hMin), pMin))
          positions.push(viewPos, toWorld(hMin, pMin + t * (pMax - pMin)))
        }
        return positions
      }, false),
      width: 1,
      material: Cesium.Color.WHITE.withAlpha(0.25),
      clampToGround: false,
    },
    id: 'cityFrustumSpokes',
  })
  cityFrustumEntities.push(spokeEntity)
}

function hideFrustumPreview() {
  cityFrustumEntities.forEach(e => viewer.entities.remove(e))
  cityFrustumEntities = []
}

function flyToObservationPoint() {
  if (!cityViewshed.points.length) return
  const p = cityViewshed.points[cityViewshed.points.length - 1]
  const totalH = p.groundHeight + cityViewshed.observerHeight + 2.1
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, totalH),
    orientation: {
      heading: Cesium.Math.toRadians(cityViewshed.heading),
      pitch: Cesium.Math.toRadians(cityViewshed.pitch),
      roll: 0,
    },
  })
}

function toggleFrustumEdit() {
  frustumEditing.value = !frustumEditing.value
  const sc = viewer.scene.screenSpaceCameraController
  if (frustumEditing.value) {
    sc.enableRotate = false
    sc.enableZoom = false
    frustumEditHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    let isDragging = false
    let lastMouse = { x: 0, y: 0 }
    frustumEditHandler.setInputAction((movement) => {
      isDragging = true
      lastMouse = { x: movement.position.x, y: movement.position.y }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN)
    frustumEditHandler.setInputAction((movement) => {
      if (!isDragging) return
      const dx = movement.endPosition.x - lastMouse.x
      const dy = movement.endPosition.y - lastMouse.y
      lastMouse = { x: movement.endPosition.x, y: movement.endPosition.y }
      cityViewshed.heading = (cityViewshed.heading + dx * 0.3 + 360) % 360
      cityViewshed.pitch = Math.max(-90, Math.min(90, cityViewshed.pitch + dy * 0.3))
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    frustumEditHandler.setInputAction(() => {
      isDragging = false
    }, Cesium.ScreenSpaceEventType.LEFT_UP)
    frustumEditHandler.setInputAction((movement) => {
      cityViewshed.maxDistance = Math.max(200, Math.min(10000, cityViewshed.maxDistance - Math.sign(movement) * 200))
    }, Cesium.ScreenSpaceEventType.WHEEL)
  } else {
    sc.enableRotate = true
    sc.enableZoom = true
    if (frustumEditHandler) {
      frustumEditHandler.destroy()
      frustumEditHandler = null
    }
  }
}

function toggleCityPick() {
  if (cityViewshed.picking) {
    cancelCityPick()
    return
  }
  cityViewshed.picking = true
  cityClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  cityClickHandler.setInputAction(async (click) => {
    const info = await getPickInfo(viewer, click)
    if (!info) return
    const idx = cityViewshed.points.length
    cityViewshed.points.push({
      lon: info.lon, lat: info.lat,
      name: `观察点${idx + 1}`,
      groundHeight: info.groundH,
    })
    cityViewshed.heading = Cesium.Math.toDegrees(viewer.camera.heading)
    cityViewshed.pitch = Cesium.Math.toDegrees(viewer.camera.pitch)
    // 放置绿色标记
    cityViewshedEntities.push(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(info.lon, info.lat, info.groundH + cityViewshed.observerHeight),
      point: { pixelSize: 10, color: Cesium.Color.fromCssColorString('#4ade80'), disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: `观察点${idx + 1}`, font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -16), fillColor: Cesium.Color.WHITE, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    }))
    cancelCityPick()
    showFrustumPreview()
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function cancelCityPick() {
  cityViewshed.picking = false
  if (cityClickHandler) {
    cityClickHandler.destroy()
    cityClickHandler = null
  }
}

function clearCityViewshed() {
  cancelCityPick()
  if (frustumEditing.value) toggleFrustumEdit()
  hideFrustumPreview()
  cityViewshed.points = []
  clearGPUViewshed()
  cityViewshedEntities.forEach(e => viewer.entities.remove(e))
  cityViewshedEntities = []
}

async function runCityViewshed() {
  cityViewshed.loading = true
  hideFrustumPreview()
  clearGPUViewshed()
  try {
    for (const p of cityViewshed.points) {
      runGPUViewshed(viewer, {
        centerLon: p.lon,
        centerLat: p.lat,
        observerHeight: cityViewshed.observerHeight,
        maxDistance: cityViewshed.maxDistance,
        fovH: cityViewshed.fovH,
        fovV: cityViewshed.fovV,
        heading: cityViewshed.heading,
        pitch: cityViewshed.pitch,
      })
    }
  } finally {
    cityViewshed.loading = false
  }
}

function triggerFileInput(type) {
  if (type === 'geojson') geojsonInput.value.click()
  if (type === 'model') modelInput.value.click()
}

async function onGeoJSONFile(e) {
  const file = e.target.files[0]
  if (!file) return
  loadingGeoJSON.value = true
  clearGeoJSON()
  try {
    const text = await file.text()
    const geoJSON = JSON.parse(text)
    geojsonDataSource = await Cesium.GeoJsonDataSource.load(geoJSON, {
      stroke: Cesium.Color.WHITE,
      strokeWidth: 1,
    })
    viewer.dataSources.add(geojsonDataSource)
    const entities = geojsonDataSource.entities.values
    const colorMap = ['#e94560', '#0f3460', '#16213e', '#533483', '#3d7ea6', '#2d6a4f', '#e76f51', '#2a9d8f']
    entities.forEach((entity, i) => {
      if (entity.polygon) {
        entity.polygon.material = Cesium.Color.fromCssColorString(colorMap[i % colorMap.length]).withAlpha(0.5)
        entity.polygon.outline = true
        entity.polygon.outlineColor = Cesium.Color.WHITE
        entity.polygon.outlineWidth = 1
      }
    })
    geojsonCount.value = entities.length
    store.setAOI({ name: file.name.replace(/\.[^/.]+$/, ''), type: 'geojson', entities: entities.length })
    viewer.flyTo(geojsonDataSource)
  } catch (e) {
    console.error('GeoJSON 加载失败:', e)
  } finally {
    loadingGeoJSON.value = false
    e.target.value = ''
  }
}

async function fetchDistrict(centerLat, centerLon) {
  const key = import.meta.env.VITE_AMAP_KEY
  if (!key) return []

  let adcode = ''
  try {
    const regeoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${centerLon},${centerLat}&extensions=base`
    const regeoRes = await fetch(regeoUrl)
    const regeoData = await regeoRes.json()
    if (regeoData.status === '1' && regeoData.regeocode) {
      adcode = regeoData.regeocode.addressComponent.adcode
    }
  } catch (e) {
    console.warn('逆地理编码失败:', e.message)
  }

  if (!adcode) return []

  let townships = []
  try {
    const distUrl = `https://restapi.amap.com/v3/config/district?key=${key}&keywords=${adcode}&subdistrict=2&extensions=base`
    const distRes = await fetch(distUrl)
    const distData = await distRes.json()
    if (distData.status === '1' && distData.districts.length > 0) {
      const county = distData.districts[0]
      if (county.districts) {
        townships = county.districts
      }
    }
  } catch (e) {
    console.warn('行政区划查询失败:', e.message)
  }

  const results = []
  townships.forEach(t => {
    if (!t.center) return
    const [gcjLng, gcjLat] = t.center.split(',').map(Number)
    const wgs = gcj02ToWGS84(gcjLat, gcjLng)
    const dist = haversineDistance(centerLat, centerLon, wgs.lat, wgs.lng) / 1000
    results.push({
      name: t.name,
      lat: wgs.lat,
      lon: wgs.lng,
      dist,
      type: t.level === 'street' ? 'town' : 'village',
      displayName: t.name,
    })
  })

  return results.sort((a, b) => a.dist - b.dist)
}

async function generateScenarioFromEarthquake(centerLon, centerLat) {
  if (!viewer) return
  clearGeoJSON()
  loadingGeoJSON.value = true
  noDataWarning.value = ''

  const places = await fetchDistrict(centerLat, centerLon)
  const villages = []
  const watchtowers = []

  const dam = { name: '堰塞坝', lng: centerLon + 0.05, lat: centerLat - 0.1, height: 45 }
  const dispatchCenter = { name: '指挥中心', lng: centerLon, lat: centerLat, population: 80000 }

  // 按半径筛选村庄
  const radiusKm = villageRadius.value
  const nearby = places.filter(p => p.dist <= radiusKm)

  if (nearby.length === 0) {
    noDataWarning.value = `⚠️ ${radiusKm}km 内未找到乡镇数据，请扩大半径`
  } else {
    noDataWarning.value = ''
  }

  clearAll()
  nearby.forEach((p, idx) => {
    addVillageDot(p.lon, p.lat, p.displayName || p.name)
    villages.push({ name: p.displayName || p.name, lng: p.lon, lat: p.lat, population: 1000 + idx * 500, elevation: 1200 + idx * 100 })
  })

  // 指挥中心设在最近的乡镇
  const townPlaces = nearby.filter(p => p.type === 'town')
  if (townPlaces.length > 0) {
    dispatchCenter.name = townPlaces[0].name
    dispatchCenter.lng = townPlaces[0].lon
    dispatchCenter.lat = townPlaces[0].lat
  }

  const towerDefs = [
    { name: '瞭望塔1号', lng: centerLon - 0.05, lat: centerLat + 0.12, height: 25, elevation: 2400 },
    { name: '瞭望塔2号', lng: centerLon + 0.1, lat: centerLat - 0.08, height: 30, elevation: 2600 },
  ]
  towerDefs.forEach(t => {
    addWatchtower(t.lng, t.lat, t.name)
    watchtowers.push({ name: t.name, lng: t.lng, lat: t.lat, height: t.height, elevation: t.elevation })
  })

  geojsonCount.value = nearby.length
  store.setHazards(villages)
  store.setWatchtowers(watchtowers)
  store.setFloodLevel(0, dam)
  store.setDispatchCenter(dispatchCenter)

  loadingGeoJSON.value = false
}

async function onModelFile(e) {
  const file = e.target.files[0]
  if (!file) return
  loadingModel.value = true
  clearModel()
  try {
    const url = URL.createObjectURL(file)
    const position = Cesium.Cartesian3.fromDegrees(116.397, 39.908, 0)
    modelEntity = viewer.entities.add({
      name: file.name,
      position: position,
      model: {
        uri: url,
        scale: modelScale.value,
        minimumPixelSize: 100,
        maximumScale: 20000,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    })
    modelLoaded.value = true
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 200), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 }, duration: 2 })
  } catch (e) {
    console.error('模型加载失败:', e)
  } finally {
    loadingModel.value = false
    e.target.value = ''
  }
}

function clearDraw() {
  drawEntities.forEach(e => viewer.entities.remove(e))
  drawEntities = []
  drawPoints = []
  drawMode.value = ''
  drawInfoList.value = []
  if (drawHandler) { drawHandler.destroy(); drawHandler = null }
}

function clearLabels() {
  labelEntities.forEach(e => viewer.entities.remove(e))
  labelEntities = []
  labelMode.value = false
  if (labelHandler) { labelHandler.destroy(); labelHandler = null }
}

function clearGeoDraw() {
  geoEntities.forEach(e => viewer.entities.remove(e))
  geoEntities = []
  geoMode.value = ''
  if (geoHandler) { geoHandler.destroy(); geoHandler = null }
}

function startGeoDraw(type) {
  clearGeoDraw()
  clearDraw()
  clearLabels()
  geoMode.value = type
  geoHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  geoHandler.setInputAction((click) => {
    const cartesian = viewer.scene.pickPosition(click.position)
    if (!cartesian) return
    placeGeometry(type, cartesian)
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function placeGeometry(type, position) {
  if (type === 'box') {
    const entity = viewer.entities.add({
      position: position,
      box: {
        dimensions: new Cesium.Cartesian3(geoSize.value, geoSize.value, geoSize.value),
        material: Cesium.Color.fromRandom({ alpha: 0.7 }),
        outline: true,
        outlineColor: Cesium.Color.WHITE,
      },
    })
    geoEntities.push(entity)
  }
  if (type === 'cylinder') {
    const entity = viewer.entities.add({
      position: position,
      cylinder: {
        length: geoSize.value,
        topRadius: geoSize.value * 0.3,
        bottomRadius: geoSize.value * 0.3,
        material: Cesium.Color.fromRandom({ alpha: 0.7 }),
        outline: true,
        outlineColor: Cesium.Color.WHITE,
      },
    })
    geoEntities.push(entity)
  }
  if (type === 'sphere') {
    const entity = viewer.entities.add({
      position: position,
      ellipsoid: {
        radii: new Cesium.Cartesian3(geoSize.value * 0.5, geoSize.value * 0.5, geoSize.value * 0.5),
        material: Cesium.Color.fromRandom({ alpha: 0.7 }),
        outline: true,
        outlineColor: Cesium.Color.WHITE,
      },
    })
    geoEntities.push(entity)
  }
  if (type === 'wall') {
    const half = geoSize.value * 0.5
    const cartographic = Cesium.Cartographic.fromCartesian(position)
    const lon = cartographic.longitude
    const lat = cartographic.latitude
    const dLon = half / (111000 * Math.cos(lat))
    const dLat = half / 111000
    const h = geoSize.value
    const corners = [
      Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon + dLon), Cesium.Math.toDegrees(lat + dLat)),
      Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon + dLon), Cesium.Math.toDegrees(lat - dLat)),
      Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon - dLon), Cesium.Math.toDegrees(lat - dLat)),
      Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon - dLon), Cesium.Math.toDegrees(lat + dLat)),
      Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon + dLon), Cesium.Math.toDegrees(lat + dLat)),
    ]
    Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, corners).then((sampled) => {
      const entity = viewer.entities.add({
        wall: {
          positions: Cesium.Cartesian3.fromRadiansArrayHeights(
            sampled.flatMap((c) => [c.longitude, c.latitude, 0]),
          ),
          maximumHeights: sampled.map((c) => c.height + h),
          minimumHeights: sampled.map((c) => c.height),
          material: Cesium.Color.fromRandom({ alpha: 0.5 }),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
        },
      })
      geoEntities.push(entity)
    })
  }
}

function lonLatToRadians(center, offsetLon, offsetLat) {
  const cartographic = Cesium.Cartographic.fromCartesian(center)
  const dLon = Cesium.Math.toRadians(offsetLon / (111000 * Math.cos(cartographic.latitude)))
  const dLat = Cesium.Math.toRadians(offsetLat / 111000)
  return [
    cartographic.longitude + dLon, cartographic.latitude + dLat, 0,
  ]
}

function updateModelScale() {
  if (modelEntity && modelEntity.model) modelEntity.model.scale = modelScale.value
}

function startDraw(type) {
  clearDraw()
  clearLabels()
  drawMode.value = type
  drawPoints = []
  drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  drawHandler.setInputAction((click) => {
    const cartesian = viewer.scene.pickPosition(click.position)
    if (!cartesian) return
    drawPoints.push(cartesian)
    const point = viewer.entities.add({
      position: cartesian,
      point: { pixelSize: 6, color: Cesium.Color.DODGERBLUE, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
    })
    drawEntities.push(point)
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  drawHandler.setInputAction(() => {
    if (drawPoints.length < 1) return
    finishDraw()
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

function finishDraw() {
  drawEntities.forEach(e => viewer.entities.remove(e))
  drawEntities = []

  const coords = drawPoints.map(p => {
    const c = Cesium.Cartographic.fromCartesian(p)
    return [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)]
  })

  if (drawMode.value === 'point' && drawPoints.length > 0) {
    drawPoints.forEach((p, i) => {
      const entity = viewer.entities.add({ position: p, point: { pixelSize: 10, color: Cesium.Color.DODGERBLUE, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND } })
      drawEntities.push(entity)
      drawInfoList.value.push({
        type: 'point',
        coords: `[${coords[i][0].toFixed(6)}, ${coords[i][1].toFixed(6)}]`,
        geojson: { type: 'Point', coordinates: coords[i] },
      })
    })
  }
  if (drawMode.value === 'line' && drawPoints.length >= 2) {
    const entity = viewer.entities.add({ polyline: { positions: drawPoints, width: 3, material: Cesium.Color.DODGERBLUE, clampToGround: true } })
    drawEntities.push(entity)
    drawInfoList.value.push({
      type: 'line',
      coords: `${coords.length} 个点`,
      geojson: { type: 'LineString', coordinates: coords },
    })
  }
  if (drawMode.value === 'polygon' && drawPoints.length >= 3) {
    const entity = viewer.entities.add({ polygon: { hierarchy: new Cesium.PolygonHierarchy(drawPoints), material: Cesium.Color.DODGERBLUE.withAlpha(0.3), outline: true, outlineColor: Cesium.Color.DODGERBLUE, clampToGround: true } })
    drawEntities.push(entity)
    drawInfoList.value.push({
      type: 'polygon',
      coords: `${coords.length} 个顶点`,
      geojson: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
    })
  }
  drawPoints = []
  drawMode.value = ''
  store.setHazards(drawInfoList.value.map(d => ({ type: d.type, coords: d.coords })))
  if (drawHandler) { drawHandler.destroy(); drawHandler = null }
}

function exportDrawItem(index) {
  const item = drawInfoList.value[index]
  if (!item) return
  const blob = new Blob([JSON.stringify(item.geojson, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${item.type}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportAllDraw() {
  const features = drawInfoList.value.map((item, i) => ({
    type: 'Feature',
    id: i,
    properties: { drawType: item.type },
    geometry: item.geojson,
  }))
  const collection = { type: 'FeatureCollection', features }
  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `draw_features_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function toggleLabelMode() {
  labelMode.value = !labelMode.value
  if (labelMode.value) {
    clearDraw()
    labelHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    labelHandler.setInputAction((click) => {
      const cartesian = viewer.scene.pickPosition(click.position)
      if (!cartesian) return
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
      const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)
      const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)
      const label = prompt('输入标注文字:', `经度${lon} 纬度${lat}`)
      if (!label) return
      const entity = viewer.entities.add({
        position: cartesian,
        label: { text: label, font: '14px sans-serif', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -10) },
      })
      labelEntities.push(entity)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  } else if (labelHandler) {
    labelHandler.destroy()
    labelHandler = null
  }
}

function setupGeoJSONClick() {
  if (!viewer) return  
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction((click) => {
    if (!viewer) return     
    const picked = viewer.scene.pick(click.position)
    if (picked && picked.id && picked.id.name) {
      pickedFeature.value = picked.id.name
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

watch(() => store.selectedEarthquake, (eq) => {
  if (!eq || !viewerStore.viewer) return
  viewer = viewerStore.viewer   
  const { lon, lat } = eq
  aoi.minLat = +(lat - 0.5).toFixed(4)
  aoi.maxLat = +(lat + 0.5).toFixed(4)
  aoi.minLng = +(lon - 0.5).toFixed(4)
  aoi.maxLng = +(lon + 0.5).toFixed(4)
  drawAOI()
  nextTick(() => generateScenarioFromEarthquake(lon, lat))
}, { immediate: true })



onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return
  if (store.aoi) {                   // ← 新增，把泸定AOI降级
    Object.assign(aoi, store.aoi)
    drawAOI()
  }
  else {
    viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(108, 35, 15000000) })
  }
  setupGeoJSONClick()
})

onBeforeUnmount(() => {
  if (drawHandler) drawHandler.destroy()
  if (labelHandler) labelHandler.destroy()
  drawHandler = null
  labelHandler = null
  clearCityViewshed()
  clearAll()
  clearHefeiTileset()
  viewer = null
})
</script>

<style scoped>
.data-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}
.side-panel {
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
.side-panel.collapsed {
  left: -280px;
  box-shadow: none;
}
.side-panel.collapsed ~ .collapse-toggle {
  left: 12px;
}
.side-panel::-webkit-scrollbar { width: 4px; }
.side-panel::-webkit-scrollbar-thumb { background: rgba(45, 138, 78, 0.2); border-radius: 2px; }

.panel-header {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
  flex-shrink: 0;
}
.panel-header h3 {
  font-size: 14px;
  color: #3a9db0;
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
.panel { background: rgba(255, 255, 255, 0.5); border-radius: 8px; padding: 10px; border: 1px solid rgba(45, 138, 78, 0.08); }
.panel h3 { font-size: 14px; margin-bottom: 2px; color: #3a9db0; }
.panel h4 { font-size: 11px; margin-bottom: 4px; color: #5a4e3c; }
.collapsible { cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center; }
.collapsible:hover { color: #2d8a4e; }
.collapse-arrow { font-size: 10px; opacity: 0.5; }
.hint { font-size: 11px; color: #8b7e6a; margin-top: 3px; line-height: 1.4; }
.btn-row { display: flex; gap: 4px; margin-bottom: 4px; flex-wrap: wrap; }
.coord-row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; font-size: 11px; color: #6b5e4a; }
.coord-row input { width: 60px; padding: 3px 4px; border: 1px solid rgba(45,138,78,0.2); border-radius: 4px; background: rgba(255,255,255,0.5); color: #3d3929; font-size: 11px; text-align: center; }
.btn {
  padding: 6px 10px; border: none; border-radius: 6px;
  background: rgba(45, 138, 78, 0.1); color: #3d3929; cursor: pointer; font-size: 11px;
  transition: all 0.2s; flex: 1; min-width: 50px; font-weight: 500;
}
.btn:hover:not(:disabled) { background: rgba(45, 138, 78, 0.18); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { flex: 0; padding: 5px 10px; }
.btn.active { background: #3a9db0; color: #fff; }
.btn.active:hover { background: #1a6b35; }
.btn-danger { background: rgba(231, 76, 60, 0.08); flex: 0; color: #e74c3c; }
.btn-danger:hover { background: rgba(231, 76, 60, 0.15); }
.control-group { margin-top: 4px; }
.control-group label { font-size: 10px; color: #8b7e6a; display: block; margin-bottom: 2px; }
.control-group input[type=range] { width: 100%; accent-color: #f59e0b; }
.point-list { margin-top: 6px; }
.point-item { display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: rgba(255,255,255,0.3); border-radius: 4px; margin-bottom: 3px; font-size: 11px; color: #444; }
.point-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.point-coord { margin-left: auto; color: #8b7e6a; font-family: monospace; }
.draw-info { margin-top: 4px; max-height: 200px; overflow-y: auto; }
.draw-item { display: flex; align-items: center; gap: 4px; padding: 3px 0; border-bottom: 1px solid rgba(45, 138, 78, 0.08); font-size: 10px; }
.draw-type { color: #3a9db0; flex-shrink: 0; text-transform: uppercase; }
.draw-coords { color: #8b7e6a; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-xs { padding: 2px 6px; font-size: 10px; border: none; border-radius: 3px; background: rgba(45, 138, 78, 0.1); color: #3d3929; cursor: pointer; }
.btn-xs:hover { background: rgba(45, 138, 78, 0.18); }
.url-input { width: 100%; padding: 5px 8px; border: 1px solid rgba(45, 138, 78, 0.2); border-radius: 4px; background: rgba(255, 255, 255, 0.5); color: #3d3929; font-size: 11px; box-sizing: border-box; }
.url-input::placeholder { color: #b0a590; }
.collapse-toggle {
  position: absolute;
  left: 292px;
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
  color: #3a9db0;
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
.map-area {
  position: absolute; inset: 0; z-index: 0;
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
</style>