<template>
  <div class="data-page">
    <aside class="side-panel">
      <div class="panel">
        <h3>🧰 工具箱</h3>
        <p class="hint">图层加载 · GeoJSON · 3D模型 · 绘制 · 标注</p>
        <div class="btn-row" style="margin-top:6px">
          <button :class="{ active: is2D }" @click="switchTo2D" class="btn btn-sm">📐 2D</button>
          <button :class="{ active: !is2D }" @click="switchTo3D" class="btn btn-sm">🌍 3D</button>
        </div>
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
        <h4>🏗️ 3D 模型 (glTF)</h4>
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

      <div class="panel">
        <h4>🧊 绘制几何体</h4>
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

      <div class="panel">
        <h4>✏️ 绘制</h4>
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

      <div class="panel">
        <h4>📌 标注</h4>
        <div class="btn-row">
          <button :class="{ active: labelMode }" @click="toggleLabelMode" class="btn btn-sm">点击添加标注</button>
          <button @click="clearLabels" class="btn btn-danger btn-sm">清除</button>
        </div>
      </div>

      <div class="panel">
        <h4>🌐 后端API</h4>
        <input v-model="apiUrl" class="url-input" placeholder="GeoJSON API 地址" />
        <div class="btn-row" style="margin-top:4px">
          <button @click="loadApiGeoJSON" class="btn btn-sm" :disabled="!apiUrl || apiLoading">{{ apiLoading ? '加载中...' : '加载' }}</button>
          <button @click="clearApiGeoJSON" class="btn btn-danger btn-sm">清除</button>
        </div>
        <p v-if="apiCount" class="hint">已加载 {{ apiCount }} 个实体</p>
        <p v-if="apiError" class="hint" style="color:#e94560">{{ apiError }}</p>
      </div>

      <div class="panel">
        <h4>🗺️ GeoServer WMS</h4>
        <input v-model="wmsUrl" class="url-input" placeholder="WMS地址，如 /geoserver/wms" />
        <input v-model="wmsLayer" class="url-input" style="margin-top:4px" placeholder="图层名，如 topp:states" />
        <div class="btn-row" style="margin-top:4px">
          <button @click="loadWMS" class="btn btn-sm" :disabled="!wmsUrl || !wmsLayer">加载</button>
          <button @click="clearWMS" class="btn btn-danger btn-sm">清除</button>
        </div>
        <p v-if="wmsLoaded" class="hint">WMS: {{ wmsLayer }}</p>
      </div>

      <div class="panel">
        <h4>📡 GeoServer WFS</h4>
        <input v-model="wfsUrl" class="url-input" placeholder="WFS地址，如 /geoserver/wfs" />
        <input v-model="wfsType" class="url-input" style="margin-top:4px" placeholder="要素类型，如 topp:states" />
        <div class="btn-row" style="margin-top:4px">
          <button @click="loadWFS" class="btn btn-sm" :disabled="!wfsUrl || !wfsType || wfsLoading">{{ wfsLoading ? '加载中...' : '加载' }}</button>
          <button @click="clearWFS" class="btn btn-danger btn-sm">清除</button>
        </div>
        <p v-if="wfsCount" class="hint">已加载 {{ wfsCount }} 个要素</p>
        <p v-if="wfsError" class="hint" style="color:#e94560">{{ wfsError }}</p>
      </div>
    </aside>

    <div class="map-area">
      <div ref="cesiumContainer" class="cesium-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as Cesium from 'cesium'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

const cesiumContainer = ref(null)
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

const apiUrl = ref('')
const apiLoading = ref(false)
const apiCount = ref(0)
const apiError = ref('')
const wmsUrl = ref('')
const wmsLayer = ref('')
const wmsLoaded = ref(false)
const wfsUrl = ref('')
const wfsType = ref('')
const wfsLoading = ref(false)
const wfsCount = ref(0)
const wfsError = ref('')

let viewer = null
let geojsonDataSource = null
let modelEntity = null
let drawHandler = null
let drawPoints = []
let drawEntities = []
let labelHandler = null
let labelEntities = []
let geoHandler = null
let geoEntities = []
let currentBaseLayer = null
let apiDataSource = null
let wmsLayerRef = null
let wfsDataSource = null

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
  pickedFeature.value = ''
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
    viewer.flyTo(geojsonDataSource)
  } catch (e) {
    console.error('GeoJSON 加载失败:', e)
  } finally {
    loadingGeoJSON.value = false
    e.target.value = ''
  }
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

async function loadApiGeoJSON() {
  if (!apiUrl.value) return
  apiLoading.value = true
  apiError.value = ''
  clearApiGeoJSON()
  try {
    const res = await fetch(apiUrl.value)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const geoJSON = await res.json()
    const colorMap = ['#e94560', '#0f3460', '#16213e', '#533483', '#3d7ea6', '#2d6a4f', '#e76f51', '#2a9d8f']
    apiDataSource = await Cesium.GeoJsonDataSource.load(geoJSON, {
      stroke: Cesium.Color.WHITE,
      strokeWidth: 1,
    })
    apiDataSource.entities.values.forEach((entity, i) => {
      if (entity.polygon) {
        entity.polygon.material = Cesium.Color.fromCssColorString(colorMap[i % colorMap.length]).withAlpha(0.5)
        entity.polygon.outline = true
        entity.polygon.outlineColor = Cesium.Color.WHITE
        entity.polygon.outlineWidth = 1
      }
    })
    viewer.dataSources.add(apiDataSource)
    apiCount.value = apiDataSource.entities.values.length
    viewer.flyTo(apiDataSource)
  } catch (e) {
    apiError.value = `加载失败: ${e.message}`
  } finally {
    apiLoading.value = false
  }
}

function clearApiGeoJSON() {
  if (apiDataSource) { viewer.dataSources.remove(apiDataSource); apiDataSource = null }
  apiCount.value = 0
  apiError.value = ''
}

function loadWMS() {
  if (!wmsUrl.value || !wmsLayer.value) return
  clearWMS()
  wmsLayerRef = viewer.imageryLayers.addImageryProvider(
    new Cesium.WebMapServiceImageryProvider({
      url: wmsUrl.value,
      layers: wmsLayer.value,
      parameters: { transparent: true, format: 'image/png' },
    }),
  )
  wmsLoaded.value = true
}

function clearWMS() {
  if (wmsLayerRef) { viewer.imageryLayers.remove(wmsLayerRef); wmsLayerRef = null }
  wmsLoaded.value = false
}

async function loadWFS() {
  if (!wfsUrl.value || !wfsType.value) return
  wfsLoading.value = true
  wfsError.value = ''
  clearWFS()
  try {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: wfsType.value,
      outputFormat: 'application/json',
    })
    const url = `${wfsUrl.value}?${params}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const geoJSON = await res.json()
    const colorMap = ['#e94560', '#0f3460', '#16213e', '#533483', '#3d7ea6', '#2d6a4f', '#e76f51', '#2a9d8f']
    wfsDataSource = await Cesium.GeoJsonDataSource.load(geoJSON, {
      stroke: Cesium.Color.WHITE,
      strokeWidth: 1,
    })
    wfsDataSource.entities.values.forEach((entity, i) => {
      if (entity.polygon) {
        entity.polygon.material = Cesium.Color.fromCssColorString(colorMap[i % colorMap.length]).withAlpha(0.5)
        entity.polygon.outline = true
        entity.polygon.outlineColor = Cesium.Color.WHITE
        entity.polygon.outlineWidth = 1
      }
    })
    viewer.dataSources.add(wfsDataSource)
    wfsCount.value = wfsDataSource.entities.values.length
    viewer.flyTo(wfsDataSource)
  } catch (e) {
    wfsError.value = `加载失败: ${e.message}`
  } finally {
    wfsLoading.value = false
  }
}

function clearWFS() {
  if (wfsDataSource) { viewer.dataSources.remove(wfsDataSource); wfsDataSource = null }
  wfsCount.value = 0
  wfsError.value = ''
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
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position)
    if (picked && picked.id && picked.id.name) {
      pickedFeature.value = picked.id.name
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

onMounted(() => {
  viewer = new Cesium.Viewer(cesiumContainer.value, {
    animation: false, timeline: false,
    baseLayerPicker: false, fullscreenButton: false, geocoder: false,
    homeButton: false, sceneModePicker: false, navigationHelpButton: false,
    infoBox: false, selectionIndicator: false,
  })
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100
  viewer.scene.setTerrain(new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromIonAssetId(1)))
  viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(108, 35, 15000000) })
  setupGeoJSONClick()
})

onBeforeUnmount(() => {
  if (drawHandler) drawHandler.destroy()
  if (labelHandler) labelHandler.destroy()
  if (viewer) viewer.destroy()
})
</script>

<style scoped>
.data-page { display: flex; height: 100%; overflow: hidden; }
.side-panel {
  width: 280px; background: #16213e; padding: 10px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
  border-right: 1px solid #0f3460;
}
.panel { background: #1a1a2e; border-radius: 8px; padding: 10px; }
.panel h3 { font-size: 15px; margin-bottom: 2px; color: #e94560; }
.panel h4 { font-size: 12px; margin-bottom: 6px; color: #ccc; }
.hint { font-size: 11px; color: #888; margin-top: 3px; line-height: 1.4; }
.btn-row { display: flex; gap: 4px; margin-bottom: 4px; flex-wrap: wrap; }
.btn {
  padding: 6px 10px; border: none; border-radius: 5px;
  background: #0f3460; color: #e0e0e0; cursor: pointer; font-size: 11px;
  transition: all 0.2s; flex: 1; min-width: 50px;
}
.btn:hover:not(:disabled) { background: #1a5080; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { flex: 0; padding: 5px 10px; }
.btn.active { background: #e94560; color: #fff; }
.btn.active:hover { background: #e94560; }
.btn-danger { background: #3d1a2e; flex: 0; }
.btn-danger:hover { background: #5a2a40; }
.control-group { margin-top: 4px; }
.control-group label { font-size: 10px; color: #999; display: block; margin-bottom: 2px; }
.control-group input[type=range] { width: 100%; accent-color: #e94560; }
.draw-info { margin-top: 4px; max-height: 200px; overflow-y: auto; }
.draw-item { display: flex; align-items: center; gap: 4px; padding: 3px 0; border-bottom: 1px solid #0f3460; font-size: 10px; }
.draw-type { color: #e94560; flex-shrink: 0; text-transform: uppercase; }
.draw-coords { color: #999; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-xs { padding: 2px 6px; font-size: 10px; border: none; border-radius: 3px; background: #0f3460; color: #e0e0e0; cursor: pointer; }
.btn-xs:hover { background: #1a5080; }
.url-input { width: 100%; padding: 5px 8px; border: 1px solid #0f3460; border-radius: 4px; background: #1a1a2e; color: #e0e0e0; font-size: 11px; box-sizing: border-box; }
.url-input::placeholder { color: #555; }
.map-area { flex: 1; position: relative; }
.cesium-container { width: 100%; height: 100%; }
</style>