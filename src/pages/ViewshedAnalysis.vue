<template>
  <div class="viewshed-page">
    <aside class="viewshed-panel" :class="{ collapsed }">
      <div class="panel-header">
        <h3>🔭 监测站选址</h3>
        <p class="hint">瞭望塔通视覆盖 · 盲区识别</p>
        <p class="hint coords" v-if="hoverInfo">经度 {{ hoverInfo.lon.toFixed(5) }} &nbsp; 纬度 {{ hoverInfo.lat.toFixed(5) }} &nbsp; 海拔 {{ hoverInfo.height.toFixed(1) }}m</p>
      </div>

      <div v-show="!collapsed" class="panel-body">

      <div class="panel">
        <span class="label">分析模式</span>
        <div class="style-toggle" style="margin-top:2px">
          <button @click="analysisMode='viewshed'" :class="{ active: analysisMode==='viewshed' }">📡 360° 扇区</button>
          <button @click="analysisMode='los'" :class="{ active: analysisMode==='los' }">🎯 点对点</button>
        </div>
      </div>

      <div class="panel" v-if="analysisMode==='viewshed'">
        <span class="label">可视化模式</span>
        <div class="style-toggle" style="margin-top:2px">
          <button @click="visualMode='lines'; recomputeViewshed()" :class="{ active: visualMode==='lines' }">📏 线条</button>
          <button @click="visualMode='face'; runGPUAll()" :class="{ active: visualMode==='face' }">🎨 面着色</button>
        </div>
      </div>

      <div class="panel">
        <div class="control-group">
          <label>瞭望塔高度 (高于地面 · 规范≥15m)</label>
          <div class="slider-row">
            <input type="range" v-model.number="observerHeight" min="5" max="80" step="5" />
            <span class="value">{{ observerHeight }} m</span>
          </div>
        </div>
        <div class="control-group" v-if="analysisMode!=='los'">
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
          <div class="checkbox-label" style="margin-top:2px">
            <input type="checkbox" v-model="showFirePoints" />
            火点探测模拟
          </div>
          <div v-if="showFirePoints" style="margin-top:6px">
            <label>火点数量</label>
            <div class="slider-row">
              <input type="range" v-model.number="firePointCount" min="5" max="30" step="5" />
              <span class="value">{{ firePointCount }}</span>
            </div>
            <button @click="firePointPositions = null" class="preset-btn" style="margin-top:4px;width:100%;font-size:12px" :disabled="firePointPositions === null">🎲 重新生成火点</button>
            <label>烟柱高度</label>
            <div class="slider-row">
              <input type="range" v-model.number="smokeHeight" min="10" max="150" step="5" />
              <span class="value">{{ smokeHeight }} m</span>
            </div>
          </div>
        </div>
        <div class="control-group" v-if="analysisMode==='los' && targetPoint">
          <label>目标点高度 (高于地面)</label>
          <div class="slider-row">
            <input type="range" v-model.number="targetHeight" min="0" max="200" step="5" />
            <span class="value">{{ targetHeight }} m</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <span class="label">{{ analysisMode==='los' ? '观测点 & 目标点' : '瞭望塔点位 (' + observerPoints.length + ')' }}</span>
        <div class="btn-group" style="margin-bottom:6px">
          <button @click="togglePickObserver" class="preset-btn" :class="{ active: pickObserver }">
            {{ pickObserver ? '🖱️ 选点中...' : (analysisMode==='los' ? '+ 观测点' : '+ 添加瞭望塔') }}
          </button>
          <button v-if="analysisMode==='los'" @click="togglePickTarget" class="preset-btn" :class="{ active: pickTarget }">
            {{ pickTarget ? '🖱️ 选点中...' : '+ 目标点' }}
          </button>
          <button @click="toggleMeasure" class="preset-btn" :class="{ active: measureMode }">
            {{ measureMode ? '📏 测距中...' : '📏 测距' }}
          </button>
          <button @click="clearAllPoints" class="preset-btn btn-danger" :disabled="observerPoints.length===0">清空</button>
        </div>
        <!-- 手动输入坐标 -->
        <div v-if="analysisMode==='los'" class="manual-coords">
          <div class="coord-row">
            <span class="coord-label">观测点</span>
            <input type="number" v-model.number="manualObsLon" placeholder="经度" step="0.00001" class="coord-input" />
            <input type="number" v-model.number="manualObsLat" placeholder="纬度" step="0.00001" class="coord-input" />
            <input type="number" v-model.number="manualObsHeight" placeholder="海拔(m)" step="0.1" class="coord-input coord-input-sm" />
          </div>
          <div class="coord-row">
            <span class="coord-label">目标点</span>
            <input type="number" v-model.number="manualTgtLon" placeholder="经度" step="0.00001" class="coord-input" />
            <input type="number" v-model.number="manualTgtLat" placeholder="纬度" step="0.00001" class="coord-input" />
            <input type="number" v-model.number="manualTgtHeight" placeholder="海拔(m)" step="0.1" class="coord-input coord-input-sm" />
          </div>
          <button @click="applyManualCoords" class="preset-btn" style="width:100%;margin-top:4px">📌 应用坐标</button>
        </div>
        <p v-if="measureResult" class="hint" style="color:#fbbf24;margin-top:2px">{{ measureResult }}</p>
        <div v-if="observerPoints.length" class="point-list">
          <div v-for="(p, i) in observerPoints" :key="i"
            :class="['point-item', { active: activeObserverIdx === i }]"
            @click="activeObserverIdx = i">
            <span class="point-dot" :style="{ background: p.color }"></span>
            <span class="point-name">{{ p.name || `塔${i+1}` }}</span>
            <span class="point-coord">{{ p.lat.toFixed(3) }}, {{ p.lon.toFixed(3) }}</span>
            <button @click.stop="removeObserverPoint(i)" class="btn-del">×</button>
          </div>
        </div>
        <p v-if="!observerPoints.length" class="hint">点击地图添加瞭望塔候选点</p>
        <button @click="runAnalysis" class="preset-btn" style="margin-top:6px;width:100%" :disabled="!canRunAnalysis || loading">
          {{ loading ? '⏳ 分析中...' : '🔄 分析' }}
        </button>
        <button @click="enterFirstPerson" class="preset-btn" style="margin-top:4px;width:100%" :disabled="activeObserverPoint===null">
          👁️ 锁定瞭望塔视角
        </button>
        <button @click="toggleVerify" class="preset-btn" style="margin-top:4px;width:100%" :class="{ active: verifyMode }" :disabled="!activeObserverPoint">
          {{ verifyMode ? '🎯 点击地图验证...' : '🎯 验证点' }}
        </button>
        <p v-if="verifyResult" class="hint" :style="{ color: verifyResult.visible ? '#4ade80' : '#ef4444', marginTop: '4px' }">
          {{ verifyResult.visible ? '✅ 可见' : '❌ 被遮挡' }}
          <span v-if="!verifyResult.visible"> | 遮挡距 {{ verifyResult.blockDist?.toFixed(0) }}m</span>
          | 距离 {{ verifyResult.totalDist?.toFixed(0) }}m
          <br>📍 {{ verifyResult.lon?.toFixed(4) }}, {{ verifyResult.lat?.toFixed(4) }} | 海拔 {{ verifyResult.groundH?.toFixed(1) }}m
        </p>
        <button @click="removeLockCamera" class="preset-btn" style="margin-top:4px;width:100%">
          🔓 解锁视角
        </button>
        <p v-if="activeObserverPoint" class="hint" style="margin-top:2px">
          👁️ 当前塔: {{ activeObserverPoint.name || `经度${activeObserverPoint.lon.toFixed(2)} 纬度${activeObserverPoint.lat.toFixed(2)}` }}
        </p>
        <p v-if="activeObserverPoint" class="hint">塔高: {{ observerHeight }}m | 地面海拔: {{ activeObserverPoint.groundHeight?.toFixed(1) || '--' }} m</p>
        <p v-if="targetPoint" class="hint" style="margin-top:4px">
          🎯 目标点: {{ targetPoint.name || `经度${targetPoint.lon.toFixed(2)} 纬度${targetPoint.lat.toFixed(2)}` }}
        </p>
        <p v-if="targetPoint" class="hint">目标高度: {{ targetHeight }}m | 地面海拔: {{ targetPoint.groundHeight?.toFixed(1) || '--' }} m</p>
        <div v-if="losResult" class="los-result" :class="{ visible: losResult.visible }">
          <div class="los-icon">{{ losResult.visible ? '✅' : '❌' }}</div>
          <div class="los-text">
            <strong>{{ losResult.visible ? '可见！' : '被遮挡' }}</strong>
            <span v-if="!losResult.visible">遮挡位置距观察点 {{ losResult.blockDist?.toFixed(0) }} m</span>
            <span>两点距离 {{ losResult.totalDist?.toFixed(0) }} m</span>
          </div>
        </div>
      </div>

      

      <div class="panel">
        <div class="info legend-compact">
          <span>🟢 可见</span>
          <span>🔴 遮挡</span>
          <span v-if="analysisMode==='viewshed' && showFirePoints">🟩 可探测</span>
          <span v-if="analysisMode==='viewshed' && showFirePoints">🟥 漏报</span>
          <span v-if="analysisMode==='los'">🟡 目标</span>
        </div>
      </div>

      <div class="panel" v-if="viewshedStats">
        <h4>📊 分析统计</h4>
        <div ref="chartRef" style="width: 100%; height: 180px"></div>
        <p class="hint" style="text-align:center; margin: 4px 0 0 0">
          总射线: {{ viewshedStats.totalRays }} | 可见 {{ viewshedStats.visibleDist }}km | 不可见 {{ viewshedStats.invisibleDist }}km
        </p>
        <p v-if="viewshedStats.fireTotal" class="hint" style="text-align:center; margin: 4px 0 0 0">
          🔥 火点: {{ viewshedStats.fireTotal }} | 可探测 {{ viewshedStats.fireDetected }} | 漏报 {{ viewshedStats.fireMissed }}
        </p>
      </div>

      <div v-if="store.blindSpots" class="panel" style="background: rgba(245, 158, 11, 0.06); border-left: 3px solid #f59e0b;">
        <h4 style="margin: 0 0 4px; font-size: 12px; color: #92400e;">🔭 盲区分析</h4>
        <div style="display: flex; gap: 12px; font-size: 11px;">
          <span>可见: <strong style="color: #2d8a4e;">{{ store.blindSpots.visibleKm }}km</strong></span>
          <span>盲区: <strong style="color: #e74c3c;">{{ store.blindSpots.invisibleKm }}km</strong></span>
          <span>瞭望塔: <strong>{{ (store.watchtowers || []).length }}座</strong></span>
        </div>
        <div v-if="blindVillageList.length" style="margin-top: 6px; font-size: 11px;">
          <span style="color: #e74c3c;">⚠️ 盲区村庄: </span>
          <span v-for="(v, i) in blindVillageList" :key="v">{{ v }}{{ i < blindVillageList.length - 1 ? '、' : '' }}</span>
        </div>
        <p v-else style="margin-top: 4px; font-size: 11px; color: #2d8a4e;">✅ 所有村庄均在瞭望塔覆盖范围内</p>
      </div>
    </div>
    </aside>
    <button class="collapse-toggle" @click="collapsed = !collapsed" :title="collapsed ? '展开面板' : '收起面板'">
      {{ collapsed ? '▶' : '◀' }}
    </button>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, onDeactivated, nextTick } from 'vue'
import * as Cesium from 'cesium'
import * as echarts from 'echarts'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useViewerStore } from '../stores/viewerStore.js'
import { useSiteMarkers } from '../composables/useSiteMarkers.js'
import { useCameraInit } from '../composables/useCameraInit.js'
import { useTerrainQuery } from '../composables/useTerrainQuery.js'
import { useViewshedAnalysis } from '../composables/useViewshedAnalysis.js'
import { useViewshedGPU } from '../composables/useViewshedGPU.js'
import { useFireSimulation } from '../composables/useFireSimulation.js'
import { useFirstPerson } from '../composables/useFirstPerson.js'
import { haversineDistance } from '../utils/geo.js'

const store = useScenarioStore()
const viewerStore = useViewerStore()
const { addWatchtower, addCircleMarker, addFireMarker, removeMarker, clearAll, loadWatchtowers, loadVillages } = useSiteMarkers()
const { flyToAOI } = useCameraInit()
const { getPickInfo, getHeightAtPosition } = useTerrainQuery()
const { isPointVisibleFrom, computeViewshed, computeLineOfSight } = useViewshedAnalysis()
const { runGPUViewshed, clearGPUViewshed } = useViewshedGPU()
const { runFirePointSimulation } = useFireSimulation()
const { isFirstPerson, enterFirstPerson: fpEnter, exitFirstPerson: fpExit } = useFirstPerson()

const observerHeight = ref(1)
const maxDistance = ref(5000)
const stepSize = ref(50)
const analysisMode = ref('viewshed')
const visualMode = ref('lines')
const pickObserver = ref(false)
const pickTarget = ref(false)
const observerPoints = ref([])
const activeObserverIdx = ref(0)
const losObserver = ref(null) // 点对点模式的独立观测点
const targetPoint = ref(null)
const targetHeight = ref(0)
const losResult = ref(null)
const hoverInfo = ref(null)
const viewshedStats = ref(null)
const chartRef = ref(null)
const collapsed = ref(false)

const loading = ref(false)
const showFirePoints = ref(false)
const firePointCount = ref(15)
const firePointPositions = ref(null) // 固定火点坐标，null 表示下次分析时重新随机生成
const smokeHeight = ref(50)
const nextTowerId = ref(1) // 全局递增编号，删除不回收
const measureMode = ref(false)
const measurePoints = ref([]) // [{lon, lat, groundHeight, marker}]
const measureResult = ref('')
const manualObsLon = ref(117.107)
const manualObsLat = ref(36.244)
const manualObsHeight = ref(893.5)
const manualTgtLon = ref(117.10090)
const manualTgtLat = ref(36.24777)
const manualTgtHeight = ref(987.7)
const verifyMode = ref(false)
const verifyResult = ref(null)

const COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#34d399', '#f87171']


let viewer = null
let clickHandler = null
let hoverHandler = null
let chartInstance = null
let lastHoverTime = 0
let observerEntities = []
let targetMarker = null
let viewshedEntities = []
let domeEntities = []
let firePointEntities = []
let losEntities = []
let lockCameraListener = null

const activeObserverPoint = computed(() => {
  if (analysisMode.value === 'los') return losObserver.value
  if (observerPoints.value.length === 0) return null
  return observerPoints.value[activeObserverIdx.value] || null
})

const canRunAnalysis = computed(() => {
  if (analysisMode.value === 'los') return activeObserverPoint.value && targetPoint.value
  return activeObserverPoint.value
})

const blindVillageList = computed(() => {
  const villages = store.hazards || []
  const towers = store.watchtowers || []
  if (!towers.length) return []
  return villages.filter(v => {
    const vLon = v.lng ?? v.lon
    const vLat = v.lat
    if (vLon == null || vLat == null) return false
    return towers.every(t => {
      const tLon = t.lng ?? t.lon
      const tLat = t.lat
      if (tLon == null || tLat == null) return true
      return haversineDistance(vLat, vLon, tLat, tLon) > 5000
    })
  }).map(v => v.name || '未命名')
})

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
      itemStyle: { borderRadius: 4, borderColor: 'rgba(254,252,245,0.9)', borderWidth: 3 },
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
  loading.value = false
  clearGPUViewshed()
  domeEntities.forEach(e => viewer.entities.remove(e))
  domeEntities = []
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities = []
  firePointEntities.forEach(e => {
    if (e.el) removeMarker(e)
    else viewer.entities.remove(e)
  })
  firePointEntities = []
  losEntities.forEach(e => {
    if (e.el) removeMarker(e)
    else viewer.entities.remove(e)
  })
  losEntities = []
  if (targetMarker) { removeMarker(targetMarker); targetMarker = null }
  losObserver.value = null
  targetPoint.value = null
  losResult.value = null
  viewshedStats.value = null
  if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  cancelPick()
  resetCameraConstraints()
}

function clearAllPoints() {
  clearAnalysis()
  observerEntities.forEach(m => { removeMarker(m) })
  observerEntities = []
  observerPoints.value = []
  activeObserverIdx.value = 0
  firePointPositions.value = null
}

function removeObserverPoint(idx) {
  if (observerEntities[idx]) {
    removeMarker(observerEntities[idx])
    observerEntities.splice(idx, 1)
  }
  observerPoints.value.splice(idx, 1)
  if (activeObserverIdx.value >= observerPoints.value.length) {
    activeObserverIdx.value = Math.max(0, observerPoints.value.length - 1)
  }
  // 删除后：有剩余塔则自动重新分析，没有则清空
  if (observerPoints.value.length > 0) {
    recomputeViewshed()
  } else {
    clearAnalysis()
  }
}

function cancelPick() {
  pickObserver.value = false
  pickTarget.value = false
  measureMode.value = false
  verifyMode.value = false
  measurePoints.value.forEach(p => { if (p.marker) removeMarker(p.marker) })
  measurePoints.value = []
  if (clickHandler) { clickHandler.destroy(); clickHandler = null }
}

function toggleMeasure() {
  if (measureMode.value) {
    // 关闭测距模式
    measureMode.value = false
    measurePoints.value.forEach(p => { if (p.marker) removeMarker(p.marker) })
    measurePoints.value = []
    measureResult.value = ''
    if (clickHandler) { clickHandler.destroy(); clickHandler = null }
    return
  }
  cancelPick()
  measureMode.value = true
  measurePoints.value = []
  measureResult.value = ''
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  clickHandler.setInputAction(async (click) => {
    const info = await getPickInfo(viewer, click)
    if (!info) return
    const marker = addCircleMarker(info.lon, info.lat, `P${measurePoints.value.length + 1}`, info.groundH)
    measurePoints.value.push({ lon: info.lon, lat: info.lat, groundHeight: info.groundH, marker })
    if (measurePoints.value.length === 2) {
      const p1 = measurePoints.value[0]
      const p2 = measurePoints.value[1]
      const dist = haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon)
      const eleDiff = Math.abs(p2.groundHeight - p1.groundHeight)
      measureResult.value = `📏 两点距离: ${dist.toFixed(1)} m | 高度差: ${eleDiff.toFixed(1)} m | 采样步长: ${stepSize.value} m → ${Math.floor(dist / stepSize.value)} 个采样点`
      measureMode.value = false
      clickHandler.destroy()
      clickHandler = null
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function toggleVerify() {
  if (verifyMode.value) {
    verifyMode.value = false
    if (clickHandler) { clickHandler.destroy(); clickHandler = null }
    return
  }
  if (!activeObserverPoint.value) return
  cancelPick()
  verifyMode.value = true
  verifyResult.value = null
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  clickHandler.setInputAction(async (click) => {
    const info = await getPickInfo(viewer, click)
    if (!info) return
    verifyMode.value = false
    clickHandler.destroy()
    clickHandler = null
    const obs = activeObserverPoint.value
    const losEntities = []
    const result = await computeLineOfSight(viewer, {
      observerPoint: obs,
      targetPoint: { lon: info.lon, lat: info.lat, groundHeight: info.groundH },
      observerHeight: observerHeight.value,
      targetHeight: 0,
      stepSize: stepSize.value,
      losEntities,
    })
    verifyResult.value = { ...result.result, lon: info.lon, lat: info.lat, groundH: info.groundH }
    losEntities.forEach(e => {
      if (e.el) removeMarker(e)
      else viewer.entities.remove(e)
    })
    if (result.result.visible) {
      const marker = addCircleMarker(info.lon, info.lat, '✅可见', info.groundH)
      setTimeout(() => removeMarker(marker), 3000)
    } else {
      const marker = addCircleMarker(info.lon, info.lat, '❌遮挡', info.groundH)
      setTimeout(() => removeMarker(marker), 3000)
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function applyManualCoords() {
  if (manualObsLon.value == null || manualObsLat.value == null) return
  cancelPick()
  if (losObserver.value) {
    if (losObserver.value.marker) removeMarker(losObserver.value.marker)
  }
  losObserver.value = {
    lon: manualObsLon.value,
    lat: manualObsLat.value,
    name: `经度${manualObsLon.value.toFixed(4)} 纬度${manualObsLat.value.toFixed(4)}`,
    groundHeight: manualObsHeight.value ?? 0,
    color: '#4ade80',
  }
  createObserverMarker(losObserver.value, 0)
  if (manualTgtLon.value != null && manualTgtLat.value != null) {
    if (targetMarker) { removeMarker(targetMarker); targetMarker = null }
    targetPoint.value = {
      lon: manualTgtLon.value,
      lat: manualTgtLat.value,
      name: `经度${manualTgtLon.value.toFixed(4)} 纬度${manualTgtLat.value.toFixed(4)}`,
      groundHeight: manualTgtHeight.value ?? 0,
    }
    createTargetMarker(manualTgtLon.value, manualTgtLat.value)
  }
}

function togglePickObserver() {
  if (pickObserver.value) { cancelPick(); return }
  cancelPick()
  pickObserver.value = true
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  clickHandler.setInputAction(async (click) => {
    const info = await getPickInfo(viewer, click)
    if (!info) return
    if (analysisMode.value === 'los') {
      // 点对点模式：设置独立观测点，不加入瞭望塔列表
      const newPoint = {
        lon: info.lon, lat: info.lat,
        name: '观测点',
        groundHeight: info.groundH,
        color: '#4ade80',
      }
      losObserver.value = newPoint
      createObserverMarker(newPoint, 0)
    } else {
      const idx = observerPoints.value.length
      const id = nextTowerId.value++
      const colorIdx = (id - 1) % COLORS.length
      const newPoint = {
        lon: info.lon, lat: info.lat,
        name: `瞭望塔${id}`,
        groundHeight: info.groundH,
        color: COLORS[colorIdx],
      }
      observerPoints.value.push(newPoint)
      activeObserverIdx.value = idx
      createObserverMarker(newPoint, idx)
    }
    pickObserver.value = false
    clickHandler.destroy()
    clickHandler = null
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function togglePickTarget() {
  if (pickTarget.value) { cancelPick(); return }
  if (!activeObserverPoint.value) return
  cancelPick()
  pickTarget.value = true
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  clickHandler.setInputAction(async (click) => {
    const info = await getPickInfo(viewer, click)
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



async function runAnalysis() {
  if (!activeObserverPoint.value) return
  store.setWatchtowers(observerPoints.value.map(p => ({ lon: p.lon, lat: p.lat, name: p.name, groundHeight: p.groundHeight })))
  if (analysisMode.value === 'viewshed') {
    recomputeViewshed()
  } else {
    if (!targetPoint.value) return
    losEntities.forEach(e => {
      if (e.el) removeMarker(e)
      else viewer.entities.remove(e)
    })
    losEntities = []
    losResult.value = null
    const losResultData = await computeLineOfSight(viewer, {
      observerPoint: activeObserverPoint.value,
      targetPoint: targetPoint.value,
      observerHeight: observerHeight.value,
      targetHeight: targetHeight.value,
      stepSize: stepSize.value,
      losEntities,
      addCircleMarker,
    })
    losResult.value = losResultData.result
    // 进入第一视角，站在观测点看向目标点
    const obs = activeObserverPoint.value
    const tgt = targetPoint.value
    const headingPos = Cesium.Cartesian3.fromDegrees(tgt.lon, tgt.lat, 0)
    const origin = Cesium.Cartesian3.fromDegrees(obs.lon, obs.lat, 0)
    const dir = Cesium.Cartesian3.subtract(headingPos, origin, new Cesium.Cartesian3())
    const h = Math.atan2(dir.x, dir.y)
    fpEnter(viewer, { lon: obs.lon, lat: obs.lat, groundHeight: obs.groundHeight }, { heading: h })
  }
}

function recomputeViewshed() {
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities = []
  domeEntities.forEach(e => viewer.entities.remove(e))
  domeEntities = []
  clearGPUViewshed()

  const points = observerPoints.value
  if (points.length === 0) return

  if (visualMode.value === 'face') {
    runGPUAll()
    return
  }
  runAllViewsheds(points)
}

function addDome(p) {
  const r = maxDistance.value
  const pos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.groundHeight || 0)
  const dome = viewer.entities.add({
    position: pos,
    ellipsoid: {
      radii: new Cesium.Cartesian3(r, r, r),
      material: new Cesium.Color(0.2, 0.6, 1.0, 0.06),
      outline: true,
      outlineColor: new Cesium.Color(0.3, 0.7, 1.0, 0.35),
      outlineWidth: 2,
      slicePartitions: 96,
      stackPartitions: 48,
    },
  })
  domeEntities.push(dome)
  const groundCircle = viewer.entities.add({
    position: pos,
    ellipse: {
      semiMajorAxis: r,
      semiMinorAxis: r,
      material: Cesium.Color.TRANSPARENT,
      outline: true,
      outlineColor: new Cesium.Color(0.4, 0.8, 1.0, 0.5),
      outlineWidth: 2,
    },
  })
  groundCircle.clampToGround = true
}

async function runGPUAll() {
  clearGPUViewshed()
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities = []
  const points = observerPoints.value
  loading.value = true
  try {
    points.forEach(p => {
      runGPUViewshed(viewer, {
        centerLon: p.lon, centerLat: p.lat,
        observerHeight: observerHeight.value,
        maxDistance: maxDistance.value,
      })
    })
    points.forEach(p => addDome(p))
  } finally {
    loading.value = false
  }
}

async function runAllViewsheds(points) {
  loading.value = true
  try {
    await Promise.all(points.map(p => computeViewshed(viewer, {
      centerLon: p.lon, centerLat: p.lat,
      observerHeight: observerHeight.value, maxDistance: maxDistance.value, stepSize: stepSize.value,
      pointColor: p.color,
      viewshedEntities, targetHeight: 0,
    })))
    points.forEach(p => addDome(p))
    if (showFirePoints.value && store.aoi) {
      const fireResult = await runFirePointSimulation(viewer, {
        towerPoints: points, observerHeight: observerHeight.value,
        maxDistance: maxDistance.value, firePointCount: firePointCount.value, smokeHeight: smokeHeight.value,
        aoi: store.aoi, firePointEntities,
        getHeightAtPosition, isPointVisibleFrom,
        addFireMarker,
        firePoints: firePointPositions.value,
      })
      firePointEntities = fireResult.markers
      if (!firePointPositions.value) {
        firePointPositions.value = fireResult.firePoints
      }
      viewshedStats.value = { ...viewshedStats.value, ...fireResult.stats }
    }
  } finally {
    loading.value = false
  }

  let totalDist = 0
  let visibleDist = 0
  viewshedEntities.forEach(e => {
    const c = e.polyline?.material?.color?.getValue()
    const isVisible = c && c.red < 0.3 && c.green > 0.5
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
  store.setBlindSpots({ invisibleKm: Math.round((totalDist - visibleDist) / 1000), visibleKm: Math.round(visibleDist / 1000) })
  await nextTick()
  updateChart()
}

function createObserverMarker(point, idx) {
  if (observerEntities[idx]) {
    removeMarker(observerEntities[idx])
  }
  const marker = addWatchtower(point.lon, point.lat, point.name || '', point.groundHeight || 0)
  observerEntities[idx] = marker
}

function createTargetMarker(lon, lat) {
  if (targetMarker) { removeMarker(targetMarker); targetMarker = null }
  const groundH = targetPoint.value?.groundHeight || 0
  targetMarker = addCircleMarker(lon, lat, '目标', groundH)
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

function flyToActiveObserver() {
  const p = activeObserverPoint.value
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
  if (isFirstPerson.value) fpExit(viewer)
}

function enterFirstPerson() {
  const p = activeObserverPoint.value
  if (!p) return
  removeLockCamera()
  // 瞭望塔模式：加上塔高，站在塔顶看
  const offset = analysisMode.value === 'viewshed' ? observerHeight.value : 0
  fpEnter(viewer, { lon: p.lon, lat: p.lat, groundHeight: p.groundHeight }, { eyeHeightOffset: offset })
}

function handleKeyDown(e) {
  if (e.key === 'f' || e.key === 'F') {
    if (!activeObserverPoint.value) return
    e.preventDefault()
    flyToActiveObserver()
  }
  if (e.key === 'Escape') {
    removeLockCamera()
    if (activeObserverPoint.value) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(activeObserverPoint.value.lon, activeObserverPoint.value.lat, 5000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
        duration: 1.5,
      })
    }
  }
}

onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return
  viewer.scene.setTerrain(
    new Cesium.Terrain(
      Cesium.CesiumTerrainProvider.fromIonAssetId(1),
    ),
  )
  flyToAOI(viewer, { lon: 117.10, lat: 36.25, height: 20000 })

  hoverHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  hoverHandler.setInputAction(handleMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  document.addEventListener('keydown', handleKeyDown)

  if (store.watchtowers && store.watchtowers.length > 0) {
    store.watchtowers.forEach((t, idx) => {
      addWatchtower(t.lng ?? t.lon, t.lat, t.name)
      observerPoints.value.push({
        lon: t.lng ?? t.lon,
        lat: t.lat,
        name: t.name,
        groundHeight: t.groundHeight ?? t.elevation ?? 0,
        color: COLORS[idx % COLORS.length],
      })
      // 同步全局编号，确保新加的不与已有重复
      const numFromName = parseInt(t.name?.replace(/[^0-9]/g, ''), 10)
      if (numFromName >= nextTowerId.value) nextTowerId.value = numFromName + 1
    })
  }
  loadVillages(store.hazards)
})

onBeforeUnmount(() => {
  if (isFirstPerson.value) fpExit(viewer)
  if (clickHandler) clickHandler.destroy()
  if (hoverHandler) hoverHandler.destroy()
  if (chartInstance) chartInstance.dispose()
  document.removeEventListener('keydown', handleKeyDown)
  clearAnalysis()
  clearAll()
  clickHandler = null
  hoverHandler = null
  chartInstance = null
  viewer = null
})

onDeactivated(() => {
  clearAnalysis()
})
</script>

<style scoped>
.viewshed-page {
  position: relative;
  width: 100%;
  height: 100%;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: transparent;
  color: #3d3929;
  overflow: hidden;
  pointer-events: none;
}

.collapse-toggle {
  position: absolute;
  left: 296px;
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
  color: #2d8a4e;
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

.viewshed-panel {
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: 290px;
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
.viewshed-panel.collapsed {
  left: -290px;
  box-shadow: none;
}
.viewshed-panel.collapsed ~ .collapse-toggle {
  left: 12px;
}
.viewshed-panel::-webkit-scrollbar { width: 4px; }
.viewshed-panel::-webkit-scrollbar-thumb { background: rgba(45, 138, 78, 0.2); border-radius: 2px; }

.panel-header {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
  flex-shrink: 0;
}
.panel-header h3 {
  font-size: 14px;
  color: #2d8a4e;
  margin: 0 0 2px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.panel-header .hint {
  font-size: 10px;
  color: #8b7e6a;
  margin: 1px 0;
}
.panel-header .hint.coords {
  font-size: 10px;
  color: #9b8e7a;
  margin-top: 2px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.panel-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}

.panel {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid rgba(45, 138, 78, 0.08);
}

.panel h3 {
  font-size: 12px;
  color: #2d8a4e;
  margin-bottom: 2px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
}

.panel h4 {
  font-size: 11px;
  color: #2d8a4e;
  margin: 0 0 4px;
}
.collapsible { cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center; }
.collapsible:hover { color: #1a6a3a; }
.collapse-arrow { font-size: 10px; opacity: 0.5; }
.legend-compact { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 11px; }
.legend-compact span { color: #5a4e3c; }

.hint {
  font-size: 10px;
  color: #8b7e6a;
  margin: 0;
}

.control-group {
  margin-bottom: 8px;
}
.control-group:last-child {
  margin-bottom: 0;
}

.control-group label {
  font-size: 11px;
  color: #6b5e4a;
  display: block;
  margin-bottom: 2px;
  font-weight: 500;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #5a4e3c !important;
  font-size: 11px;
}
.checkbox-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #2d8a4e;
  cursor: pointer;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.slider-row input[type="range"] {
  flex: 1;
  accent-color: #f59e0b;
  height: 4px;
}

.value {
  font-size: 11px;
  color: #f59e0b;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.preset-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.btn-group {
  display: flex;
  gap: 4px;
}

.manual-coords {
  margin-bottom: 6px;
}
.coord-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
.coord-label {
  font-size: 11px;
  color: #8b7355;
  width: 42px;
  flex-shrink: 0;
}
.coord-input {
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  border: 1px solid rgba(45, 138, 78, 0.2);
  border-radius: 4px;
  background: rgba(255,255,255,0.8);
  color: #3d3929;
  font-size: 11px;
  outline: none;
}
.coord-input:focus {
  border-color: #f59e0b;
}
.coord-input-sm {
  flex: 0.6;
}

.preset-btn {
  padding: 4px 10px;
  border: 1px solid rgba(45, 138, 78, 0.2);
  border-radius: 6px;
  background: rgba(45, 138, 78, 0.06);
  color: #3d3929;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  flex: 1;
  font-weight: 500;
}
.preset-btn:hover {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}
.preset-btn.active {
  background: #2d8a4e;
  border-color: #2d8a4e;
  color: #fff;
}
.preset-btn.btn-danger {
  background: rgba(231, 76, 60, 0.08);
  border-color: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}
.preset-btn.btn-danger:hover {
  background: rgba(231, 76, 60, 0.15);
}
.preset-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.label {
  font-size: 11px;
  color: #8b7e6a;
  display: block;
  font-weight: 500;
}

.info p {
  font-size: 12px;
  margin: 4px 0;
  color: #5a4e3c;
}

.point-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 200px;
  overflow-y: auto;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid transparent;
  transition: all 0.2s;
  font-size: 11px;
}
.point-item:hover { background: rgba(45, 138, 78, 0.06); }
.point-item.active { border-color: #2d8a4e; background: rgba(45, 138, 78, 0.08); }

.point-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}

.point-name {
  color: #3d3929;
  font-weight: 500;
  min-width: 40px;
}

.point-coord {
  color: #8b7e6a;
  font-size: 10px;
  flex: 1;
  text-align: right;
}

.btn-del {
  background: none; border: none; color: #e74c3c;
  font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1;
}
.btn-del:hover { color: #c0392b; }

.style-toggle {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.style-toggle button {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid rgba(45, 138, 78, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.4);
  color: #6b5e4a;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  font-weight: 500;
}
.style-toggle button:hover {
  border-color: #2d8a4e;
  color: #2d8a4e;
}
.style-toggle button.active {
  border-color: #2d8a4e;
  color: #fff;
  background: #2d8a4e;
}

.map-area {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.cesium-container {
  width: 100%;
  height: 100%;
}

.los-result {
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(45, 138, 78, 0.1);
}
.los-result.visible {
  border-color: #2d8a4e;
  background: rgba(45, 138, 78, 0.08);
}
.los-result:not(.visible) {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.06);
}

.los-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.los-text {
  font-size: 12px;
  color: #5a4e3c;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.los-text strong {
  font-size: 14px;
}
.los-result.visible .los-text strong {
  color: #2d8a4e;
}
.los-result:not(.visible) .los-text strong {
  color: #e74c3c;
}

.hover-panel {
  background: rgba(254, 252, 245, 0.7) !important;
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
.village-icon-black {
  filter: brightness(0) drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}
.village-label {
  color: #fff;
  font-size: 12px;
  font-family: 'Microsoft YaHei', sans-serif;
  text-shadow: 0 0 4px #000, 0 0 4px #000;
  white-space: nowrap;
}
</style>