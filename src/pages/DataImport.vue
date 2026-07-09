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

const store = useScenarioStore()
const viewerStore = useViewerStore()

const collapsed = ref(false)
const sections = reactive({ model: true, geo: true, draw: true })
function toggleSection(key) { sections[key] = !sections[key] }
const is2D = ref(false)
const currentBaseMap = ref('ion')
const loadingGeoJSON = ref(false)
const loadingModel = ref(false)
const geojsonCount = ref(0)
const pickedFeature = ref('')
const modelLoaded = ref(false)
const modelScale = ref(100)
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
let villageMarkers = []
let _villageSyncHandler = null
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
  clearVillageMarkers()
}

function clearModel() {
  if (modelEntity) { viewer.entities.remove(modelEntity); modelEntity = null }
  modelLoaded.value = false
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

async function fetchNearbyPlaces(lat, lon) {
  const query = `[out:json];(node[place~"village|hamlet|town"](around:50000,${lat},${lon}););out;`
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const data = await res.json()
    return (data.elements || []).map(e => ({
      name: e.tags['name:zh'] || e.tags.name || '未知',
      lat: e.lat,
      lon: e.lon,
      type: e.tags.place || 'village',
    }))
  } catch (e) {
    console.warn('Overpass API 查询失败，使用本地生成的村庄数据:', e.message)
    return []
  } finally {
    clearTimeout(timeout)
  }
}

function createVillageMarker(lon, lat, name) {
  const v = viewerStore.viewer
  if (!v) return null
  const el = document.createElement('div')
  el.className = 'village-marker'
  el.innerHTML = `
    <img src="./icons/village.svg" class="village-icon" alt="" />
    <span class="village-label">${name}</span>
  `
  v.container.appendChild(el)
  return { el, name, position: Cesium.Cartesian3.fromDegrees(lon, lat) }
}

function syncVillageMarkers() {
  const v = viewerStore.viewer
  if (!v) return
  villageMarkers.forEach(m => {
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

function clearVillageMarkers() {
  villageMarkers.forEach(m => m.el.remove())
  villageMarkers = []
  if (_villageSyncHandler) { _villageSyncHandler(); _villageSyncHandler = null }
}

async function generateScenarioFromEarthquake(centerLon, centerLat) {
  if (!viewer) return
  clearGeoJSON()
  loadingGeoJSON.value = true

  const places = await fetchNearbyPlaces(centerLat, centerLon)
  const villages = []
  const watchtowers = []
  const entities = []

  const dam = { name: '堰塞坝', lng: centerLon + 0.05, lat: centerLat - 0.1, height: 45 }
  const dispatchCenter = { name: '县城', lng: centerLon + 0.15, lat: centerLat + 0.12, population: 80000 }

  let villagePlaces = places.filter(p => p.type === 'village' || p.type === 'hamlet')
  const townPlaces = places.filter(p => p.type === 'town')

  if (villagePlaces.length === 0) {
    const offsets = [
      { dLon: -0.08, dLat: 0.05, name: '上河村' },
      { dLon: 0.06, dLat: 0.08, name: '下河村' },
      { dLon: -0.04, dLat: -0.07, name: '东山村' },
      { dLon: 0.09, dLat: -0.04, name: '西坪村' },
      { dLon: -0.1, dLat: -0.02, name: '南沟村' },
      { dLon: 0.03, dLat: 0.12, name: '北岭村' },
    ]
    villagePlaces = offsets.map(o => ({ lon: centerLon + o.dLon, lat: centerLat + o.dLat, name: o.name }))
  }

  const displayVillages = villagePlaces.slice(0, 6)
  clearVillageMarkers()
  displayVillages.forEach((p, idx) => {
    const marker = createVillageMarker(p.lon, p.lat, p.name)
    if (marker) villageMarkers.push(marker)
    villages.push({ name: p.name, lng: p.lon, lat: p.lat, population: 1000 + idx * 500, elevation: 1200 + idx * 100 })
  })
  if (!_villageSyncHandler) {
    _villageSyncHandler = viewerStore.viewer.scene.postRender.addEventListener(syncVillageMarkers)
  }

  if (townPlaces.length > 0) {
    const town = townPlaces[0]
    dispatchCenter.name = town.name
    dispatchCenter.lng = town.lon
    dispatchCenter.lat = town.lat
  }

  const towerDefs = [
    { name: '瞭望塔1号', lng: centerLon - 0.05, lat: centerLat + 0.12, height: 25, elevation: 2400 },
    { name: '瞭望塔2号', lng: centerLon + 0.1, lat: centerLat - 0.08, height: 30, elevation: 2600 },
  ]
  towerDefs.forEach(t => {
    const marker = createVillageMarker(t.lng, t.lat, t.name)
    if (!marker) return
    marker.el.querySelector('.village-icon').src = './icons/observation-tower.svg'
    villageMarkers.push(marker)
    watchtowers.push({ name: t.name, lng: t.lng, lat: t.lat, height: t.height, elevation: t.elevation })
  })

  const dashMaterial = new Cesium.PolylineDashMaterialProperty({
    color: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.8),
    dashLength: 16,
    dashPattern: 0xFF00,
  })
  displayVillages.forEach(p => {
    const lineEntity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([centerLon, centerLat, p.lon, p.lat]),
        width: 2,
        material: dashMaterial,
        clampToGround: true,
      },
      properties: { type: 'road', name: '疏散路线' },
    })
    dynamicScenarioEntities.push(lineEntity)
  })

  geojsonCount.value = dynamicScenarioEntities.length
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
  clearVillageMarkers()
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
</style>