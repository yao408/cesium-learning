<template>
  <div class="data-page">
    <aside class="side-panel" :class="{ collapsed }">
      <div class="panel-header">
        <h3>📡 多源数据接入</h3>
        <p class="hint">图层加载 · GeoJSON · 3D模型 · 绘制 · 标注</p>
      </div>
      <div v-show="!collapsed" class="panel-body">
        


      <GeoJSONPanel :viewer="viewer" :store="store" :clearAll="clearAll" />

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
          <button @click="drawAOI(store)" class="btn btn-sm">✅ 绘制AOI</button>
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
            <button @click="modelMethods?.clearModel()" class="btn btn-danger btn-sm">清除</button>
          </div>
          <input type="file" ref="modelInput" accept=".gltf,.glb" @change="modelMethods?.onModelFile" style="display:none" />
          <div v-if="modelMethods?.modelLoaded" class="control-group">
            <label>缩放 {{ modelMethods?.modelScale?.toFixed?.(0) }}x</label>
            <input type="range" v-model.number="modelMethods.modelScale" min="1" max="2000" step="10" @input="modelMethods?.updateModelScale()" />
          </div>
        </div>
      </div>

      <div class="panel">
        <h4 class="collapsible" @click="toggleSection('tiles')">🏙️ 3D 瓦片 (3D Tiles) <span class="collapse-arrow">{{ sections.tiles ? '▶' : '▼' }}</span></h4>
        <div v-show="!sections.tiles">
          <div class="btn-row">
            <button @click="tilesMethods?.load()" class="btn btn-sm">
              🏙️ 加载合肥市
            </button>
            <button v-if="tilesMethods?.loaded" @click="tilesMethods?.clear()" class="btn btn-danger btn-sm">清除</button>
          </div>
          <p v-if="tilesMethods?.loaded" class="hint" style="color:#4ade80">已加载 {{ tilesMethods.count }} 个瓦片</p>
          <p v-if="tilesMethods?.error" class="hint" style="color:#e94560">{{ tilesMethods.error }}</p>
        </div>
      </div>

      <div class="panel">
        <h4 class="collapsible" @click="toggleSection('wms')">🗺️ WMS 图层 <span class="collapse-arrow">{{ sections.wms ? '▶' : '▼' }}</span></h4>
        <div v-show="!sections.wms">
          <div class="input-group">
            <input v-model="wmsUrl" placeholder="WMS 服务地址，如：/geoserver/ne/wms" class="input" />
            <input v-model="wmsLayerName" placeholder="图层名称，如：nyc_census_blocks" class="input" />
          </div>
          <div class="coord-row">
            <input v-model.number="wmsBbox[0]" placeholder="minLon" type="number" step="0.1" />
            <input v-model.number="wmsBbox[1]" placeholder="minLat" type="number" step="0.1" />
            <input v-model.number="wmsBbox[2]" placeholder="maxLon" type="number" step="0.1" />
            <input v-model.number="wmsBbox[3]" placeholder="maxLat" type="number" step="0.1" />
          </div>
          <p class="hint">范围示例：-74.5, 40.4, -73.5, 41.0（纽约）</p>
          <div class="btn-row">
            <button @click="addWMSLayer({ url: wmsUrl, layers: wmsLayerName, name: wmsLayerName, bbox: wmsBbox })" class="btn btn-sm" :disabled="wmsLoading">
              {{ wmsLoading ? '加载中...' : '➕ 添加图层' }}
            </button>
            <button @click="clearAllWMSLayers" class="btn btn-danger btn-sm" :disabled="wmsLayers.length === 0">清除全部</button>
          </div>
          <p v-if="wmsError" class="hint" style="color:#e94560">{{ wmsError }}</p>
          <div v-if="wmsLayers.length" class="layer-list">
            <div v-for="layer in wmsLayers" :key="layer.id" class="layer-item">
              <input type="checkbox" v-model="layer.visible" @change="toggleLayerVisibility(layer.id, layer.visible)" />
              <span>{{ layer.name }}</span>
              <button @click="removeWMSLayer(layer.id)" class="btn btn-danger btn-xs">删除</button>
            </div>
          </div>
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
          <button :class="{ active: labelMethods?.labelMode }" @click="labelMethods?.toggleLabelMode()" class="btn btn-sm">点击添加标注</button>
          <button @click="labelMethods?.clearLabels()" class="btn btn-danger btn-sm">清除</button>
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
import { useCityViewshed } from '../composables/useCityViewshed.js'
import { useWMSLayer } from '../composables/useWMSLayer.js'
import GeoJSONPanel from '../components/panels/GeoJSONPanel.vue'
import { useModel } from '../composables/useModel.js'
import { use3DTiles } from '../composables/use3DTiles.js'
import { useLabel } from '../composables/useLabel.js'
import { useAOI } from '../composables/useAOI.js'
import { useEarthquakeScenario } from '../composables/useEarthquakeScenario.js'
import { useDraw } from '../composables/useDraw.js'
import { useGeoDraw } from '../composables/useGeoDraw.js'


const store = useScenarioStore()// 场景存储
const viewerStore = useViewerStore()// 视图存储
const { addVillageDot, addWatchtower, clearAll } = useSiteMarkers()// 站点标注

const collapsed = ref(false)// 面板是否收起
// 面板是否展开
const sections = reactive({ model: true, geo: true, draw: true, tiles: true, wms: true, cityViewshed: true, measureValidation: true })
function toggleSection(key) { sections[key] = !sections[key] }// 切换面板展开状态
const noDataWarning = ref('')// 无数据提示
const villageRadius = ref(30)// 村庄半径


// // 城市通视分析
// cityViewshed: 状态对象（观察点列表、塔高、视角等参数）
// frustumEditing: 是否处于拖拽调节视场模式
// toggleFrustumEdit: 切换拖拽编辑模式
// toggleCityPick: 切换地图选点模式
// clearCityViewshed: 清空观察点和分析结果
// runCityViewshed: 执行通视分析计算    
const {
  cityViewshed,
  frustumEditing,
  toggleFrustumEdit,
  toggleCityPick,
  clearCityViewshed,
  runCityViewshed,
} = useCityViewshed()

// 几何体绘制
const geoSize = ref(100)// 几何体大小

// WMS 图层  响应式变量
const wmsUrl = ref('')
const wmsLayerName = ref('')
const wmsBbox = ref([-74.5, 40.4, -73.5, 41.0])
const wmsLayers = ref([])
const wmsLoading = ref(false)
const wmsError = ref('')
let addWMSLayer, removeWMSLayer, toggleLayerVisibility, clearAllWMSLayers

// 3D模型
let modelMethods = null

// 3D Tiles
const tilesMethods = use3DTiles(viewerStore.viewer, clearCityViewshed)

// 标注
let labelMethods = null

const modelInput = ref(null)

function triggerFileInput(type) {
  if (type === 'model') modelInput.value?.click()
}

// 在 setup 中
const { aoi, drawAOI, clearAOI } = useAOI()
onMounted(() => {
  // 等 viewer 准备好后再绘制
  if (viewerStore.viewer && store.aoi) {
    Object.assign(aoi, store.aoi)
    drawAOI(store)
  }
})


let viewer = null

let currentBaseLayer = null

function getViewer() { return viewerStore.viewer }

const { generateScenarioFromEarthquake } = useEarthquakeScenario()

// 等 viewer 准备好后再初始化 useDraw
let drawMode = ref('')
let drawInfoList = ref([])
let clearDraw, startDraw, finishDraw, exportDrawItem, exportAllDraw

// 几何体绘制
let geoMode = ref('')
let clearGeoDraw, startGeoDraw

onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return
  
  // 初始化 useModel
  modelMethods = useModel(viewer)
  
  // 初始化 useLabel（先初始化，因为 useDraw 需要 clearLabels）
  labelMethods = useLabel(viewer, clearDraw)
  
  // 初始化 useDraw
  const drawMethods = useDraw(viewer, store, labelMethods.clearLabels)
  drawMode.value = drawMethods.drawMode.value
  drawInfoList.value = drawMethods.drawInfoList.value
  clearDraw = drawMethods.clearDraw
  startDraw = drawMethods.startDraw
  finishDraw = drawMethods.finishDraw
  exportDrawItem = drawMethods.exportDrawItem
  exportAllDraw = drawMethods.exportAllDraw
  
  // 初始化 useGeoDraw
  const geoDrawMethods = useGeoDraw(viewer, geoSize, clearDraw, labelMethods.clearLabels)
  geoMode.value = geoDrawMethods.geoMode.value
  clearGeoDraw = geoDrawMethods.clearGeoDraw
  startGeoDraw = geoDrawMethods.startGeoDraw

  // 初始化 useWMSLayer
  const wmsMethods = useWMSLayer(viewer)
  watch(wmsMethods.wmsLayers, (newVal) => {
    wmsLayers.value = newVal
  }, { deep: true })
  watch(wmsMethods.loading, (newVal) => {
    wmsLoading.value = newVal
  })
  watch(wmsMethods.error, (newVal) => {
    wmsError.value = newVal
  })
  addWMSLayer = wmsMethods.addWMSLayer
  removeWMSLayer = wmsMethods.removeWMSLayer
  toggleLayerVisibility = wmsMethods.toggleLayerVisibility
  clearAllWMSLayers = wmsMethods.clearAllWMSLayers
  
  if (store.aoi) {
    Object.assign(aoi, store.aoi)
    drawAOI(store)
  }
  else {
    viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(108, 35, 15000000) })
  }
  geojsonMethods.setupGeoJSONClick()
})

watch(() => store.selectedEarthquake, (eq) => {
  if (!eq || !viewerStore.viewer) return
  viewer = viewerStore.viewer
  const { lon, lat } = eq
  aoi.minLat = +(lat - 0.5).toFixed(4)
  aoi.maxLat = +(lat + 0.5).toFixed(4)
  aoi.minLng = +(lon - 0.5).toFixed(4)
  aoi.maxLng = +(lon + 0.5).toFixed(4)
  drawAOI(store)
  nextTick(() => generateScenarioFromEarthquake(lon, lat, {
    viewer,
    villageRadius: villageRadius.value,
    store,
    addVillageDot,
    addWatchtower,
    clearAll,
    setWarning: (v) => noDataWarning.value = v
  }))
}, { immediate: true })



onBeforeUnmount(() => {
  labelMethods?.clearLabels()
  clearCityViewshed()
  clearAll()
  tilesMethods?.clear()
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

/* WMS 图层样式 */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.input-group .input {
  padding: 6px 10px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #2a2a2a;
  color: #fff;
  font-size: 12px;
}
.input-group .input::placeholder {
  color: #888;
}
.layer-list {
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
}
.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: #2a2a2a;
  border-radius: 4px;
  margin-bottom: 4px;
}
.layer-item input[type="checkbox"] {
  cursor: pointer;
}
.layer-item span {
  flex: 1;
  font-size: 12px;
  color: #fff;
}
.btn-xs {
  padding: 2px 6px;
  font-size: 10px;
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

/* 测量验证样式 */
.validation-results {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid;
}

.result-item.passed {
  background: rgba(82, 196, 26, 0.1);
  border-color: rgba(82, 196, 26, 0.3);
}

.result-item.failed {
  background: rgba(255, 77, 79, 0.1);
  border-color: rgba(255, 77, 79, 0.3);
}

.result-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.result-detail {
  color: #666;
  font-size: 11px;
}

.summary {
  margin-top: 10px;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
}

.summary.passed {
  background: rgba(82, 196, 26, 0.15);
  color: #52c41a;
  border: 1px solid rgba(82, 196, 26, 0.3);
}

.summary.failed {
  background: rgba(255, 77, 79, 0.15);
  color: #ff4d4f;
  border: 1px solid rgba(255, 77, 79, 0.3);
}

/* 测量结果行 */
.measure-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 3px 0;
  font-size: 11px;
}

.measure-row .label {
  color: #888;
  min-width: 65px;
}

.measure-row .error {
  font-size: 10px;
}

.measure-row .error.good {
  color: #52c41a;
}

.measure-row .error.bad {
  color: #ff4d4f;
}
</style>