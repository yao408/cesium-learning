<template>
  <div class="dashboard">
    <div class="top-toolbar">
      <AmapSearch :viewer="viewerStore.viewer" />
      <div class="toolbar-divider"></div>
      <div
        v-for="mod in modules"
        :key="mod.id"
        class="toolbar-mod"
        :class="{ active: mod.enabled }"
        @click="toggleModule(mod.id)"
        :title="mod.name"
      >
        <svg v-if="mod.id === 'station'" viewBox="0 0 24 24" class="toolbar-mod-icon" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="2"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/>
          <line x1="8" y1="4" x2="8" y2="20"/>
          <line x1="16" y1="4" x2="16" y2="20"/>
        </svg>
        <svg v-else-if="mod.id === 'flood'" viewBox="0 0 24 24" class="toolbar-mod-icon" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M2 12c3-3 4 3 6 0s4-3 6 0 4 3 6 0"/>
          <path d="M2 17c3-3 4 3 6 0s4-3 6 0 4 3 6 0"/>
        </svg>
        <svg v-else-if="mod.id === 'earthquake'" viewBox="0 0 24 24" class="toolbar-mod-icon" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="12" r="7"/>
          <circle cx="12" cy="12" r="11" stroke-width="1" opacity="0.5"/>
        </svg>
        <svg v-else-if="mod.id === 'multiVehicle'" viewBox="0 0 24 24" class="toolbar-mod-icon" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="8" width="14" height="8" rx="1"/>
          <rect x="15" y="6" width="8" height="10" rx="1"/>
          <circle cx="5" cy="18" r="2" fill="currentColor" stroke="none"/>
          <circle cx="17" cy="18" r="2" fill="currentColor" stroke="none"/>
        </svg>
        <svg v-else-if="mod.id === 'scene'" viewBox="0 0 24 24" class="toolbar-mod-icon" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="1"/>
          <line x1="12" y1="4" x2="12" y2="10"/>
          <polyline points="9,7 12,10 15,7"/>
          <rect x="9" y="14" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none"/>
          <rect x="12.5" y="14" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none"/>
          <rect x="9" y="17.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none"/>
          <rect x="12.5" y="17.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none"/>
        </svg>
      </div>
      <div class="toolbar-divider"></div>
      <LayerManager :viewer="viewerStore.viewer" />
      <div class="toolbar-divider"></div>
      <div class="toolbar-btn compass-btn" :style="{ transform: `rotate(${compassHeading}deg)` }" @click="resetNorth" title="指北 · 点击复位">
        <svg viewBox="0 0 100 100" class="compass-icon">
          <polygon points="50,5 62,50 50,55 38,50" fill="#cbd5e1" />
        </svg>
      </div>
    </div>

    <div class="center-title">
      <h1 class="platform-title">灾害应急可视化平台</h1>
    </div>

    <div class="left-panel">
      <div class="epicenter-card">
        <div class="epicenter-card-header">
          <span class="epicenter-card-icon">📍</span>
          <span class="epicenter-card-title">震中信息</span>
        </div>
        <div class="epicenter-card-body">
          <div class="epicenter-info-row">
            <span class="epicenter-info-label">位置</span>
            <span class="epicenter-info-value">{{ epicenterInfo.place }}</span>
          </div>
          <div class="epicenter-info-row">
            <span class="epicenter-info-label">震级</span>
            <span class="epicenter-info-value">M{{ epicenterInfo.mag }}</span>
          </div>
          <div class="epicenter-info-row">
            <span class="epicenter-info-label">深度</span>
            <span class="epicenter-info-value">{{ epicenterInfo.depth }}</span>
          </div>
          <div class="epicenter-info-row">
            <span class="epicenter-info-label">坐标</span>
            <span class="epicenter-info-value">{{ epicenterInfo.lon }} {{ epicenterInfo.lat }}</span>
          </div>
          <div class="epicenter-info-row">
            <span class="epicenter-info-label">时间</span>
            <span class="epicenter-info-value">{{ epicenterInfo.time }}</span>
          </div>
          <button class="epicenter-switch-btn" @click="triggerDispatch">🎯 切换至震中</button>
        </div>
      </div>

      <div class="impact-grid">
        <div class="impact-card">
          <div class="impact-value">{{ earthquakeSummary.magnitude }}</div>
          <div class="impact-label">震级</div>
        </div>
        <div class="impact-card">
          <div class="impact-value">{{ earthquakeSummary.intensity }}</div>
          <div class="impact-label">烈度</div>
        </div>
        <div class="impact-card">
          <div class="impact-value">{{ earthquakeSummary.depth }}</div>
          <div class="impact-label">深度</div>
        </div>
      </div>
      <div class="mini-chart-wrap">
      </div>
      <div class="station-select-card" v-if="selectedStation">
        <div class="station-select-header" @click="stationCardCollapsed = !stationCardCollapsed">
          <span class="station-select-icon">📡</span>
          <span class="station-select-title">已选监测站</span>
          <span class="station-select-collapse-arrow">{{ stationCardCollapsed ? '▶' : '▼' }}</span>
          <span class="station-select-close" @click.stop="selectedStation = null">✕</span>
        </div>
        <div class="station-select-body" v-if="!stationCardCollapsed">
          <div class="station-select-name">{{ selectedStation.name }}</div>
          <div class="station-select-row">
            <span class="ss-label">坐标</span>
            <span class="ss-value">{{ selectedStation.lng?.toFixed(4) }}, {{ selectedStation.lat?.toFixed(4) }}</span>
          </div>
          <div class="station-select-row">
            <span class="ss-label">海拔</span>
            <span class="ss-value">{{ selectedStation.height || '--' }} m</span>
          </div>
          <div class="station-select-row">
            <span class="ss-label">类型</span>
            <span class="ss-value">{{ selectedStation.type || '--' }}</span>
          </div>
          <div class="station-select-row">
            <span class="ss-label">状态</span>
            <span class="ss-value" :class="{ 'ss-online': selectedStation.status === 'online' }">{{ selectedStation.status || '--' }}</span>
          </div>
          <div class="station-select-actions">
            <button class="ss-btn ss-btn-delete" @click="deleteSelectedStation">删除此站</button>
          </div>
        </div>
      </div>
    </div>

    <div class="station-mode-toast" v-if="stationModeHint" :class="{ fading: stationModeHintFading }">
      <span>💡 点击<strong>蓝色光球</strong>选中监测站，点击<strong>地图空白处</strong>添加新站</span>
    </div>

    <div class="station-mode-toast" v-if="sceneModeHint" :class="{ fading: sceneModeHintFading }">
      <span>💡 点击地图空白处添加<strong>新场景</strong>，也可点击已有场景进行查看</span>
    </div>

    <Teleport to="body">
      <div class="station-dialog-overlay" v-if="showStationNameDialog" @click.self="cancelAddStation">
        <div class="station-dialog">
          <div class="station-dialog-header">
            <span class="station-dialog-icon">📡</span>
            <span>添加监测站</span>
          </div>
          <div class="station-dialog-body">
            <div class="station-dialog-pos">
              坐标：{{ pendingStationLon.toFixed(4) }}, {{ pendingStationLat.toFixed(4) }}
            </div>
            <input
              ref="stationNameInput"
              v-model="newStationName"
              class="station-dialog-input"
              placeholder="输入监测站名称"
              @keyup.enter="confirmAddStation"
              @keyup.escape="cancelAddStation"
            />
          </div>
          <div class="station-dialog-footer">
            <button class="sd-btn sd-btn-cancel" @click="cancelAddStation">取消</button>
            <button class="sd-btn sd-btn-confirm" @click="confirmAddStation">确认添加</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div class="station-dialog-overlay" v-if="showSceneDialog" @click.self="cancelAddScene">
        <div class="station-dialog">
          <div class="station-dialog-header">
            <span class="station-dialog-icon">🏗️</span>
            <span>添加场景</span>
          </div>
          <div class="station-dialog-body">
            <div class="station-dialog-pos">
              坐标：{{ pendingSceneLon.toFixed(4) }}, {{ pendingSceneLat.toFixed(4) }}
            </div>
            <div class="station-dialog-field">
              <label class="sd-label">场景类型</label>
              <select v-model="newSceneType" class="station-dialog-input sd-select">
                <option v-for="t in sceneTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <input
              v-model="newSceneName"
              class="station-dialog-input"
              placeholder="输入场景名称"
              @keyup.enter="confirmAddScene"
              @keyup.escape="cancelAddScene"
            />
          </div>
          <div class="station-dialog-footer">
            <button class="sd-btn sd-btn-cancel" @click="cancelAddScene">取消</button>
            <button class="sd-btn sd-btn-confirm" @click="confirmAddScene">确认添加</button>
          </div>
        </div>
      </div>
    </Teleport>

    <div
      class="right-panel vehicle-panel"
      :class="{ visible: showVehiclePanel, dragging: isDraggingPanel }"
      :style="vehiclePanelStyle"
    >
      <div class="panel-header" @mousedown="onPanelDragStart">
        <span class="panel-title">🚑 救援车辆</span>
        <div class="panel-header-actions">
          <span class="drag-hint" v-if="!isDraggingPanel">⋮⋮</span>
          <button class="panel-close-btn" @click.stop="showVehiclePanel = false" title="关闭">✕</button>
        </div>
      </div>
      <div class="vehicle-list">
        <div
          v-for="slot in vehicleSlots"
          :key="slot.id"
          class="vehicle-card"
          :class="{ active: slot.id === activeSlotId }"
          @click="handleTrackVehicle(slot)"
        >
          <div class="vehicle-color" :style="{ background: slot.color, color: slot.color }"></div>
          <div class="vehicle-info">
            <div class="vehicle-name">{{ slot.name }}</div>
            <div class="vehicle-stats">
              <span>{{ vehicleSpeed }} km/h</span>
              <span class="stat-sep">·</span>
              <span>{{ slot.progress ? slot.progress.toFixed(1) : '0.0' }}%</span>
            </div>
          </div>
          <div class="vehicle-track-icon" v-if="slot.id === activeSlotId && cameraLocked">👁</div>
        </div>
      </div>
      <div class="speed-control">
        <span class="speed-label">速度</span>
        <input type="range" min="10" max="200" :value="vehicleSpeed" @input="vehicleSpeed = Number($event.target.value)" />
        <span class="speed-value">{{ vehicleSpeed }} km/h</span>
      </div>
      <button class="sim-btn" @click="startSimulation()" :disabled="isSimulating">
        {{ isSimulating ? '🔵 模拟中...' : '▶ 启动救援' }}
      </button>
    </div>

    <div class="right-panel summary-panel" :class="{ visible: showStationPanel }">
      <div class="panel-header">
        <span class="panel-title">📡 监测网络</span>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">在线站点</span>
          <span class="summary-value">{{ watchtowers.length }} 个</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">覆盖范围</span>
          <span class="summary-value">{{ stationSummary.coverage }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">平均间距</span>
          <span class="summary-value">{{ stationSummary.avgDist }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">最近震中</span>
          <span class="summary-value">{{ stationSummary.nearestEpicenter }}</span>
        </div>
      </div>
    </div>

    <div class="right-panel summary-panel" :class="{ visible: showStationPanel }">
      <div class="panel-header">
        <span class="panel-title">💥 地震影响</span>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">震级</span>
          <span class="summary-value">{{ earthquakeSummary.magnitude }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">震源深度</span>
          <span class="summary-value">{{ earthquakeSummary.depth }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">烈度</span>
          <span class="summary-value">{{ earthquakeSummary.intensity }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">受影响村庄</span>
          <span class="summary-value">{{ earthquakeSummary.villages }}</span>
        </div>
      </div>
    </div>

    <div class="right-panel flood-panel" :class="{ visible: showFloodPanel || floodSims.length > 0 }">
      <div class="panel-header">
        <span class="panel-title">🌊 洪水模拟</span>
      </div>
      <div class="panel-empty" v-if="floodSims.length === 0">
        💡 右键点击地图任意位置<br>即可触发洪水模拟
      </div>
      <div class="flood-list" v-else>
        <div class="flood-card" v-for="entry in floodSims" :key="entry.id">
          <div class="flood-card-header">
            <span class="flood-card-title">水源 #{{ entry.id }}</span>
            <span class="flood-card-status" v-if="entry.stats">已完成</span>
            <span class="flood-card-status running" v-else>模拟中...</span>
            <button class="flood-card-close" @click="closeFloodWrapper(entry)">✕</button>
          </div>
          <div class="flood-card-body" v-if="entry.stats">
            <div class="flood-stat-row">
              <span class="flood-stat-label">淹没面积</span>
              <span class="flood-stat-value">{{ entry.stats.flooded }} km²</span>
            </div>
            <div class="flood-stat-row">
              <span class="flood-stat-label">淹没比例</span>
              <span class="flood-stat-value">{{ entry.stats.floodedPct }}%</span>
            </div>
            <div class="flood-stat-row">
              <span class="flood-stat-label">模拟范围</span>
              <span class="flood-stat-value">{{ entry.stats.total }} km²</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工厂预览面板 -->
    <div class="right-panel factory-preview-panel" :class="{ visible: showFactoryPanel }" @click.self="closeFactoryPanel">
      <div class="factory-preview-three">
        <div class="fp-close-btn" @click="closeFactoryPanel">✕</div>
        <FactoryDetail v-if="showFactoryPanel && selectedFactory" mode="preview" :sceneId="selectedFactory?.id" />
      </div>
      <div class="factory-preview-actions">
        <button class="fp-btn detail" @click="gotoFactoryDetailWrapper">查看详情 →</button>
      </div>
    </div>

    <div class="tip-bar" v-if="showTipBar">
      <span class="tip-text">{{ tips[tipIndex] }}</span>
    </div>

    <div
      class="context-menu"
      v-if="ctxMenu.show"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
    >
      <div class="ctx-item" v-if="ctxMenu.onStation" @click="runViewshed">
        <span>🔭</span> 360° 通视分析
      </div>
      <div class="ctx-item" @click="runFloodWrapper">
        <span>🌊</span> 洪水模拟
      </div>
      <div class="ctx-item danger" v-if="activeViewshedStations.size > 0 || floodSims.length > 0" @click="closeAllAnalysis">
        <span>✕</span> 关闭分析
      </div>
    </div>
  </div>

  <EarthquakeDashboardChart v-if="isModuleActive('earthquake')" class="dashboard-eq-chart" />

  <div class="data-entry-btn" @click="goToDataManagement" title="数据管理">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  </div>

  <div class="sim-toggle-btn" :class="{ active: isSimulating }" @click="toggleSimulation" :title="isSimulating ? '暂停车辆模拟' : '启动车辆模拟'">
    <span class="sim-btn-icon">{{ isSimulating ? '⏸' : '▶' }}</span>
  </div>

  <EarthquakeHeatmap v-if="isModuleActive('earthquake')" />

  <MultiVehiclePanel
    v-if="isModuleActive('multiVehicle')"
    @close="toggleModule('multiVehicle')"
    @create-fleet="onMultiVehicleFleet"
  />


</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, reactive, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as Cesium from 'cesium'
import { useViewerStore } from '../stores/viewerStore.js'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useSiteMarkers } from '../composables/useSiteMarkers.js'
import { useCameraInit } from '../composables/useCameraInit.js'
import { useVehicleSimulation } from '../composables/useVehicleSimulation.js'
import { useViewshedAnalysis } from '../composables/useViewshedAnalysis.js'
import { useFloodSimulation } from '../composables/useFloodSimulation.js'
import { useStationManagement } from '../composables/useStationManagement.js'
import { useFactoryMarkers } from '../composables/useFactoryMarkers.js'
import { calcPolygonArea } from '../utils/geo.js'
import { usePointPerformance } from '../composables/usePointPerformance.js'
import { useLayerVisibility } from '../composables/useLayerVisibility.js'
import { useModuleRegistry } from '../composables/useModuleRegistry.js'
import { registerScene } from '../data/factories.js'
import { createScene, fetchScenes } from '../api/sceneApi.js'
import EarthquakeHeatmap from '../pages/EarthquakeHeatmap.vue'
import EarthquakeDashboardChart from '../components/panels/EarthquakeDashboardChart.vue'
import AmapSearch from '../components/AmapSearch.vue'
import LayerManager from '../components/LayerManager.vue'
import MultiVehiclePanel from '../components/panels/MultiVehiclePanel.vue'
import FactoryDetail from './FactoryDetail.vue'

defineOptions({ name: 'Dashboard' })

const viewerStore = useViewerStore()
const store = useScenarioStore()
const { clearAll, loadWatchtowers, addVillageDot, markers } = useSiteMarkers()
const { flyToAOI } = useCameraInit()
const { modules, showModulePanel, toggleModule, isModuleActive } = useModuleRegistry()

const compassHeading = ref(0)
let compassTimer = null
function resetNorth() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  viewer.camera.flyTo({
    destination: viewer.camera.position,
    orientation: { heading: 0, pitch: viewer.camera.pitch, roll: viewer.camera.roll },
    duration: 0.5,
  })
}

const { layerVisible, layers } = useLayerVisibility()
const { vehicleSlots, activeSlotId, vehicleSpeed, cameraLocked, isSimulating, isPaused, setup: setupVehicles, teardown: teardownVehicles, startSimulation, pauseSimulation, stopSimulation, setVehiclePanelVisible, toggleCameraLock, switchVehicleSlot, addVehicleSlot, removeVehicleSlot, drawSlotPath, drawPathLine, autoLoadDispatchScenario } = useVehicleSimulation()
const { isRunning: perfRunning, mode: perfMode, fps: perfFps, runEntitiesMode, runPrimitiveMode, stop: stopPerf } = usePointPerformance()
const { floodSims, runFlood, closeFlood, closeAllFloods, stopFloodSim } = useFloodSimulation()
const { stationFormVisible, editingStationId, stationFormData, openStationForm, resetStationForm, saveStation: saveStationFn, deleteStation: deleteStationFn } = useStationManagement()
const { showFactoryPanel, selectedFactory, factoryEntities, drawFactoryMarkers: drawFactoryMarkersFn, clearFactoryMarkers: clearFactoryMarkersFn, onMapLeftClick, openFactoryPanel, closeFactoryPanel, gotoFactoryDetail, setupFactoryClick, teardownFactoryClick } = useFactoryMarkers()


const demoData = {
  epicenter: { lon: 104.0694, lat: 31.5685, mag: 6.5, depth: 10, time: '2008-05-12T14:28:00', place: '四川省德阳市绵竹市清平镇' },
  aoi: { minLng: 103.60, maxLng: 105.00, minLat: 31.00, maxLat: 32.10 },
  name: '德阳市绵竹市',
}

const hasImportedData = computed(() => !!(store.aoi || store.earthquakeData?.length))

const aoi = computed(() => store.aoi || demoData.aoi)
const watchtowers = computed(() => store.watchtowers)
const earthquakeList = computed(() => {
  if (store.selectedEarthquake) return [store.selectedEarthquake]
  return [demoData.epicenter]
})

const aoiEntities = []
const floodEntity = ref(null)
const epicenterEntities = []
let deyangBoundaryDS = null
const cityBoundaryDSList = []
let pulseHandler = null
let tipTimer = null
const showTipBar = ref(false)
const showVehiclePanel = ref(false)
const vehiclePanelPos = ref({ x: 0, y: 0 })
const isDraggingPanel = ref(false)
const vehiclePanelStyle = computed(() => {
  if (!showVehiclePanel.value) return {}
  const baseRight = 16 - vehiclePanelPos.value.x
  const isEqActive = isModuleActive('earthquake')
  const right = isEqActive ? baseRight + 396 : baseRight
  return { right: `${right}px`, top: `${64 + vehiclePanelPos.value.y}px` }
})
let dragStartX = 0
let dragStartY = 0
let panelStartX = 0
let panelStartY = 0
const selectedStation = ref(null)
const stationCardCollapsed = ref(false)
let stationClickHandler = null
let stationSelectHandler = null
const stationModeHint = ref(false)
const stationModeHintFading = ref(false)
const showStationNameDialog = ref(false)
const pendingStationLon = ref(0)
const pendingStationLat = ref(0)
const newStationName = ref('')
let stationHintTimer = null

// ========== 场景管理 ==========
const showSceneDialog = ref(false)
const pendingSceneLon = ref(0)
const pendingSceneLat = ref(0)
const newSceneName = ref('')
const newSceneType = ref('factory')
const sceneTypes = [
  { value: 'factory', label: '工厂' },
]
let sceneClickHandler = null
let sceneHintTimer = null
const sceneModeHint = ref(false)
const sceneModeHintFading = ref(false)
const sceneEntities = []
const sceneList = ref([])

async function loadScenesFromDB(viewer) {
  try {
    const dbScenes = await fetchScenes()
    for (const s of dbScenes) {
      // 跳过 id 为 facility-1/2/3 的预设工厂（已在 drawFactoryMarkers 中渲染）
      if (s.id && s.id.startsWith('facility-')) continue
      // 跳过已注册的
      if (sceneList.value.find(x => x.id === s.id)) continue

      const sceneData = {
        id: s.id,
        name: s.name,
        type: s.type,
        position: { lat: s.lat, lng: s.lng },
        description: s.description || '',
        lat: s.lat,
        lng: s.lng,
        modelConfig: s.modelConfig || defaultModelConfig(),
      }
      sceneList.value.push(sceneData)
      registerScene(sceneData)

      const iconCanvas = createGlowMarkerIcon('#f59e0b', 'tower')
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.lng, s.lat, 0),
        billboard: {
          image: iconCanvas,
          width: 52, height: 52,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 500000, 0.5),
        },
        label: {
          text: s.name,
          font: '14px "Microsoft YaHei", sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 8),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 500000, 0.4),
        },
        properties: sceneData,
        name: 'scene-' + s.id,
      })
      entity._sceneId = s.id
      sceneEntities.push(entity)
    }
  } catch (e) {
    console.warn('从后端加载场景失败:', e.message)
  }
}

async function addSceneAt(lon, lat, name, type) {
  const viewer = viewerStore.viewer
  if (!viewer) return
  const sceneData = {
    id: 'scene-' + Date.now(),
    name,
    type: type === 'factory' ? '生产车间' : '仓库',
    position: { lat, lng: lon },
    description: type === 'factory' ? '生产车间·三维场景' : '仓库·三维场景',
    lng: lon,
    lat,
    modelConfig: defaultModelConfig(),
  }
  sceneList.value.push(sceneData)
  registerScene(sceneData)

  // 同步到后端数据库
  try {
    await createScene({
      id: sceneData.id,
      name: sceneData.name,
      type: sceneData.type,
      lat: sceneData.lat,
      lng: sceneData.lng,
      description: sceneData.description,
      modelConfig: sceneData.modelConfig,
    })
  } catch (e) {
    console.warn('场景同步到后端失败:', e.message)
  }
  const iconCanvas = createGlowMarkerIcon('#f59e0b', 'tower')
  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
    billboard: {
      image: iconCanvas,
      width: 52,
      height: 52,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 500000, 0.5),
    },
    label: {
      text: name,
      font: '14px "Microsoft YaHei", sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      pixelOffset: new Cesium.Cartesian2(0, 8),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 500000, 0.4),
    },
    properties: sceneData,
    name: 'scene-' + sceneData.id,
  })
  sceneEntities.push(entity)
}

function defaultModelConfig() {
  return {
    grid: { cols: 3, rows: 3, cellSize: 9, roadWidth: 1.2 },
    buildings: [
      { name: '原料仓库', width: 5, depth: 4, wallHeight: 7, roofHeight: 0.4, roofOverhang: 0.4, col: 0, row: 0 },
      { name: '总部大楼', width: 3.5, depth: 3.5, wallHeight: 14, roofHeight: 0.8, roofOverhang: 0.6, col: 1, row: 0, isHQ: true },
      { name: '质检中心', width: 4, depth: 4, wallHeight: 10, roofHeight: 0.5, roofOverhang: 0.5, col: 2, row: 0 },
      { name: '一号车间', width: 7, depth: 3.5, wallHeight: 10, roofHeight: 0.5, roofOverhang: 0.5, col: 0, row: 2 },
      { name: '二号车间', width: 7, depth: 3.5, wallHeight: 10, roofHeight: 0.5, roofOverhang: 0.5, col: 2, row: 2 },
    ],
  }
}

function confirmAddScene() {
  const name = newSceneName.value.trim()
  if (name) {
    addSceneAt(pendingSceneLon.value, pendingSceneLat.value, name, newSceneType.value)
  }
  showSceneDialog.value = false
}

function cancelAddScene() {
  showSceneDialog.value = false
}

async function addStationAt(lon, lat, stationName) {
  const viewer = viewerStore.viewer
  if (!viewer) return
  const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
  let height = 0
  try {
    const positions = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [
      Cesium.Cartographic.fromDegrees(lon, lat)
    ])
    height = positions[0].height
  } catch (e) { /* ignore */ }
  const stationData = {
    name: stationName,
    lng: lon,
    lat: lat,
    height: Math.round(height),
    type: '综合监测站',
    status: 'online',
  }
  try {
    const res = await fetch(`${BACKEND}/api/stations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stationData),
    })
    if (res.ok) {
      const saved = await res.json()
      stationData.id = saved.id
    }
  } catch (e) {
    console.warn('添加监测站到后端失败:', e)
  }
  store.addStation(stationData)
  const pos = Cesium.Cartesian3.fromDegrees(lon, lat, height)
  const iconCanvas = createGlowMarkerIcon('#38bdf8', 'circle')
  const entity = viewer.entities.add({
    position: pos,
    billboard: {
      image: iconCanvas,
      width: 48,
      height: 48,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 500000, 0.5),
    },
    name: '监测站-' + stationName,
  })
  watchtowerBillboardEntities.push(entity)
  const pulseEntity = viewer.entities.add({
    position: pos,
    billboard: {
      image: watchtowerPulseCanvas,
      width: 80,
      height: 80,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(500, 2.0, 500000, 0.6),
    },
    name: '监测站脉冲-' + stationName,
  })
  watchtowerPulseEntities.push(pulseEntity)
  selectedStation.value = { ...stationData, lng: lon, lat: lat, height: Math.round(height) }
}

async function deleteSelectedStation() {
  if (!selectedStation.value) return
  const viewer = viewerStore.viewer
  const name = selectedStation.value.name
  const id = selectedStation.value.id
  if (!confirm(`确定要删除监测站 "${name}" 吗？`)) return
  const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
  if (id) {
    try {
      await fetch(`${BACKEND}/api/stations/${id}`, { method: 'DELETE' })
    } catch (e) {
      console.warn('删除监测站后端失败:', e)
    }
  }
  if (viewer) {
    const toRemove = viewer.entities.values.filter(e =>
      e.name === '监测站-' + name || e.name === '监测站脉冲-' + name
    )
    toRemove.forEach(e => viewer.entities.remove(e))
  }
  watchtowerBillboardEntities = watchtowerBillboardEntities.filter(e => e.name !== '监测站-' + name)
  watchtowerPulseEntities = watchtowerPulseEntities.filter(e => e.name !== '监测站脉冲-' + name)
  store.removeStation(name)
  selectedStation.value = null
}

function confirmAddStation() {
  const name = newStationName.value.trim()
  if (name) {
    addStationAt(pendingStationLon.value, pendingStationLat.value, name)
  }
  showStationNameDialog.value = false
}

function cancelAddStation() {
  showStationNameDialog.value = false
}

watch(showStationNameDialog, async (val) => {
  if (val) {
    await nextTick()
    const el = document.querySelector('.station-dialog-input')
    if (el) el.focus()
  }
})

function onPanelDragStart(e) {
  if (e.target.closest('button, input, .vehicle-card')) return
  isDraggingPanel.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  panelStartX = vehiclePanelPos.value.x
  panelStartY = vehiclePanelPos.value.y
  document.addEventListener('mousemove', onPanelDragMove)
  document.addEventListener('mouseup', onPanelDragEnd)
  e.preventDefault()
}

function onPanelDragMove(e) {
  if (!isDraggingPanel.value) return
  vehiclePanelPos.value = {
    x: panelStartX + (e.clientX - dragStartX),
    y: panelStartY + (e.clientY - dragStartY),
  }
}

function onPanelDragEnd() {
  isDraggingPanel.value = false
  document.removeEventListener('mousemove', onPanelDragMove)
  document.removeEventListener('mouseup', onPanelDragEnd)
}
const showStationPanel = ref(false)
const showFloodPanel = ref(false)
const showStationManage = ref(false)
const router = useRouter()

const goToDataManagement = () => {
  router.push('/data-management')
}

function togglePanel(panel) {
  if (panel === 'vehicle') showVehiclePanel.value = !showVehiclePanel.value
  if (panel === 'station') showStationPanel.value = !showStationPanel.value
  if (panel === 'flood') showFloodPanel.value = !showFloodPanel.value
  if (panel === 'stationManage') showStationManage.value = !showStationManage.value
}

function toggleSimulation() {
  if (isSimulating.value) {
    pauseSimulation()
  } else {
    startSimulation()
  }
}

const tipIndex = ref(0)
const tips = [
  '🖱️ 右键点击地图任意位置 → 触发洪水模拟',
  '🖱️ 右键点击监测站标记 → 通视分析',
]
const viewshedEntities = []
const activeViewshedStations = reactive(new Set())
const ctxMenu = reactive({ show: false, x: 0, y: 0, stationIdx: null, onStation: false, clickLon: 0, clickLat: 0 })

const epicenterInfo = computed(() => {
  const eq = store.selectedEarthquake || demoData.epicenter
  const mag = eq.magnitude || eq.mag || '?'
  const depth = eq.depth != null ? eq.depth + ' km' : '?'
  const place = eq.place || '德阳市'
  const timeStr = eq.time ? new Date(eq.time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '2008-05-12 14:28'
  const lon = eq.lon != null ? eq.lon.toFixed(4) + '°E' : '?'
  const lat = eq.lat != null ? eq.lat.toFixed(4) + '°N' : '?'
  return { mag, depth, place, time: timeStr, lon, lat }
})
const maxMagnitude = computed(() => {
  return Math.max(...earthquakeList.value.map(e => e.magnitude || 0))
})

const epicenter = computed(() => {
  let max = earthquakeList.value[0]
  for (const q of earthquakeList.value) {
    if ((q.magnitude || 0) > (max.magnitude || 0)) max = q
  }
  return { lon: max.lon, lat: max.lat, mag: max.magnitude || 0 }
})

const areaDisplay = computed(() => {
  const a = aoi.value
  if (!a) return '--'
  const { minLat, maxLat, minLng, maxLng } = a
  const corners = [
    { lat: minLat, lng: minLng },
    { lat: maxLat, lng: minLng },
    { lat: maxLat, lng: maxLng },
    { lat: minLat, lng: maxLng },
  ]
  const areaM2 = calcPolygonArea(corners)
  if (areaM2 > 1e6) return (areaM2 / 1e6).toFixed(0) + ' km²'
  return (areaM2 / 1e4).toFixed(1) + ' 公顷'
})

const miniChartData = computed(() => {
  const eq = store.selectedEarthquake || demoData.epicenter
  const mag = eq.magnitude || eq.mag || 6.5
  return [
    { magnitude: '3.0-3.9', count: Math.round(mag * 8), color: '#52c41a' },
    { magnitude: '4.0-4.9', count: Math.round(mag * 6), color: '#73d13d' },
    { magnitude: '5.0-5.9', count: Math.round(mag * 4), color: '#faad14' },
    { magnitude: '6.0-6.9', count: Math.round(mag * 2), color: '#fa8c16' },
    { magnitude: '7.0+', count: Math.round(mag), color: '#f5222d' },
  ]
})

const scenarioName = computed(() => store.scenarioName || demoData.name)

const stationSummary = computed(() => {
  const towers = watchtowers.value
  if (!towers.length) return { coverage: '--', avgDist: '--', nearestEpicenter: '--' }
  let totalDist = 0
  let pairs = 0
  for (let i = 0; i < towers.length; i++) {
    for (let j = i + 1; j < towers.length; j++) {
      totalDist += getDistance(towers[i].lat, towers[i].lng, towers[j].lat, towers[j].lng)
      pairs++
    }
  }
  const avgDist = pairs > 0 ? (totalDist / pairs).toFixed(1) + ' km' : '--'
  const coverage = (towers.length * 100).toFixed(0) + ' km²'
  const ep = demoData.epicenter
  let minDist = Infinity
  towers.forEach(t => {
    const d = getDistance(t.lat, t.lng, ep.lat, ep.lon)
    if (d < minDist) minDist = d
  })
  const nearestEpicenter = minDist < Infinity ? minDist.toFixed(1) + ' km' : '--'
  return { coverage, avgDist, nearestEpicenter }
})

const earthquakeSummary = computed(() => {
  const eq = store.selectedEarthquake || demoData.epicenter
  const mag = eq.magnitude || eq.mag || 7.8
  const depth = eq.depth != null ? eq.depth : 12
  let intensity = 'Ⅸ'
  if (mag < 5) intensity = 'Ⅵ'
  else if (mag < 6) intensity = 'Ⅶ'
  else if (mag < 7) intensity = 'Ⅷ'
  else if (mag < 8) intensity = 'Ⅸ'
  else intensity = 'Ⅹ'
  return {
    magnitude: mag.toFixed(1) + ' 级',
    depth: depth + ' km',
    intensity: intensity + ' 度',
    villages: '15 个',
  }
})

function saveStation() {
  saveStationFn(store, drawWatchtowerBillboards)
}

function deleteStation(station) {
  deleteStationFn(station, store, drawWatchtowerBillboards)
}

function triggerDispatch() {
  const ep = earthquakeList.value[0]
  if (!ep) return
  const viewer = viewerStore.viewer
  if (!viewer) return

  showTipBar.value = true
  if (!tipTimer) {
    tipTimer = setInterval(() => {
      tipIndex.value = (tipIndex.value + 1) % tips.length
    }, 30000)
  }

  cameraLocked.value = false
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(103.851397, 30.904505, 30826),
    orientation: {
      heading: Cesium.Math.toRadians(28.4),
      pitch: Cesium.Math.toRadians(-25.7),
      roll: Cesium.Math.toRadians(360.0),
    },
    duration: 0.5,
  })

  drawEpicenter()

  store.setDispatchCenter({ lng: ep.lon, lat: ep.lat, name: '指挥中心' })

  drawWatchtowerBillboards()

  drawDeyangBoundary()

  autoLoadDispatchScenario()
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function flyToStation(station) {
  const viewer = viewerStore.viewer
  if (!viewer) return
  flyToAOI(viewer, { lon: station.lng, lat: station.lat, height: 3000 })
}

function handleTrackVehicle(slot) {
  switchVehicleSlot(slot.id)
  if (!cameraLocked.value) {
    toggleCameraLock()
  }
}

async function onMultiVehicleFleet(vehiclePaths) {
  stopSimulation()
  await store.clearAllVehicles().catch(() => {})

  while (vehicleSlots.value.length > 0) {
    removeVehicleSlot(vehicleSlots.value[0].id)
  }

  vehiclePaths.forEach((p, i) => {
    addVehicleSlot()
    const slot = vehicleSlots.value[vehicleSlots.value.length - 1]
    slot.name = `🚛 ${p.city}`
    slot.color = p.color || ['#e74c3c', '#f39c12', '#27ae60'][i % 3]
    slot.path = p.path
    slot.pathWidth = 8
    slot.pathOpacity = 0.4
    drawSlotPath(slot)

    store.addVehicle({
      name: p.name,
      type: p.type,
      lng: p.from.lon,
      lat: p.from.lat,
      speed: p.speed,
      status: '待命',
      path: JSON.stringify(p.path),
    }).catch(e => console.warn('上传车辆到后端失败:', e))
  })

  showVehiclePanel.value = true
  setVehiclePanelVisible(true)
}

// ==================== 通视分析（右键触发） ====================
function onMapRightClick(e) {
  const viewer = viewerStore.viewer
  if (!viewer) return

  const pickedObj = viewer.scene.pick(e)
  if (pickedObj && pickedObj.id && pickedObj.id.name) {
    const name = pickedObj.id.name
    const isStation = name.startsWith('监测站-') && !name.startsWith('监测站脉冲-')
    const isPulse = name.startsWith('监测站脉冲-')
    if (isStation || isPulse) {
      e.preventDefault()
      const stationName = name.replace(isPulse ? '监测站脉冲-' : '监测站-', '')
      const idx = watchtowers.value.findIndex(t => t.name === stationName)
      if (idx !== -1) {
        ctxMenu.stationIdx = idx
        ctxMenu.onStation = true
        ctxMenu.x = e.clientX
        ctxMenu.y = e.clientY
        ctxMenu.show = true
        return
      }
    }
  }

  const marker = e.target.closest('.village-marker')
  if (marker && marker.dataset.stationIndex) {
    e.preventDefault()
    ctxMenu.stationIdx = Number(marker.dataset.stationIndex)
    ctxMenu.onStation = true
    ctxMenu.x = e.clientX
    ctxMenu.y = e.clientY
    ctxMenu.show = true
    return
  }
  if (marker) return
  e.preventDefault()
  const cartesian = viewer.scene.pickPosition(e)
  if (cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    ctxMenu.clickLon = Cesium.Math.toDegrees(cartographic.longitude)
    ctxMenu.clickLat = Cesium.Math.toDegrees(cartographic.latitude)
    ctxMenu.onStation = false
    ctxMenu.stationIdx = null
    ctxMenu.x = e.clientX
    ctxMenu.y = e.clientY
    ctxMenu.show = true
  }
}

function hideContextMenu() {
  ctxMenu.show = false
}

async function runViewshed() {
  hideContextMenu()
  const idx = ctxMenu.stationIdx
  if (idx == null) return
  const station = watchtowers.value[idx]
  if (!station) return
  const viewer = viewerStore.viewer
  if (!viewer) return

  if (activeViewshedStations.has(idx)) return

  const { computeViewshed } = useViewshedAnalysis()
  await computeViewshed(viewer, {
    centerLon: station.lng ?? station.lon,
    centerLat: station.lat,
    observerHeight: station.height || 50,
    maxDistance: 5000,
    stepSize: 100,
    pointColor: '#4ade80',
    viewshedEntities,
    rayCount: 36,
  })

  activeViewshedStations.add(idx)
}

function closeViewshed() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  viewshedEntities.forEach(e => viewer.entities.remove(e))
  viewshedEntities.length = 0
  activeViewshedStations.clear()
}

function closeAllAnalysis() {
  closeViewshed()
  closeAllFloods(viewerStore.viewer)
  hideContextMenu()
}

async function runFloodWrapper() {
  hideContextMenu()
  await runFlood(ctxMenu.clickLon, ctxMenu.clickLat, viewerStore.viewer)
}

function closeFloodWrapper(entry) {
  closeFlood(entry, viewerStore.viewer)
}

function closeAllFloodsWrapper() {
  closeAllFloods(viewerStore.viewer)
}

function drawAOI() {
  const a = aoi.value
  if (!a) return
  clearAOI()
  const viewer = viewerStore.viewer
  if (!viewer) return
  const { minLat, maxLat, minLng, maxLng } = a
  const rect = viewer.entities.add({
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
      material: Cesium.Color.fromCssColorString('#4ade80').withAlpha(0.12),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#4ade80'),
      outlineWidth: 2,
      clampToGround: true,
    },
    name: '研究区',
  })
  aoiEntities.push(rect)
}

function drawFlood() {
  clearFlood()
  const viewer = viewerStore.viewer
  if (!viewer) return
  if (store.floodPolygon && store.floodPolygon.length > 0) {
    floodEntity.value = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(store.floodPolygon),
        material: Cesium.Color.fromCssColorString('#3380ff').withAlpha(0.35),
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
    floodEntity.value = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(coords),
        material: Cesium.Color.fromCssColorString('#3380ff').withAlpha(0.35),
        clampToGround: true,
        zIndex: 10,
      },
      name: '洪水淹没范围',
    })
  }
}

function clearAOI() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  aoiEntities.forEach(e => viewer.entities.remove(e))
  aoiEntities.length = 0
}

function clearFlood() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  if (floodEntity.value) {
    viewer.entities.remove(floodEntity.value)
    floodEntity.value = null
  }
}

function drawEpicenter() {
  clearEpicenter()
  const ep = epicenter.value
  if (!ep) return
  const viewer = viewerStore.viewer
  if (!viewer) return

  const ringCount = 4
  const pulseCanvas = document.createElement('canvas')
  pulseCanvas.width = 256
  pulseCanvas.height = 256
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

  // 查询地形高度后放置光柱
  const tp = viewer.terrainProvider
  const placePillar = () => {
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
    }).catch(() => {
      const groundH = 0
      pulseBillboard.position = Cesium.Cartesian3.fromDegrees(ep.lon, ep.lat, groundH + 5)
      const pillarH = 2000
      const pillar = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(ep.lon, ep.lat, groundH + pillarH / 2),
        cylinder: { length: pillarH, topRadius: 100, bottomRadius: 100, material: Cesium.Color.fromCssColorString('#dc2626').withAlpha(0.12), outline: true, outlineColor: Cesium.Color.fromCssColorString('#dc2626').withAlpha(0.25), outlineWidth: 1 },
        name: '震中光柱',
      })
      epicenterEntities.push(pillar)
    })
  }
  if (tp && tp.readyPromise) {
    tp.readyPromise.then(placePillar)
  } else {
    placePillar()
  }

  if (pulseHandler) {
    viewer.scene.postRender.removeEventListener(pulseHandler)
  }
  pulseHandler = viewer.scene.postRender.addEventListener(() => {
    const t = Date.now() / 1000
    pulseCtx.clearRect(0, 0, 256, 256)

    for (let i = 0; i < ringCount; i++) {
      const phase = (i / ringCount) * 2.8
      const cycleT = (t + phase) % 2.8
      const progress = cycleT / 2.8
      const radius = 15 + progress * 115
      const alpha = Math.max(0, 1 - progress)

      pulseCtx.beginPath()
      pulseCtx.arc(128, 128, radius, 0, 2 * Math.PI)
      pulseCtx.strokeStyle = `rgba(220, 38, 38, ${alpha * 0.95})`
      pulseCtx.lineWidth = 6
      pulseCtx.stroke()

      pulseCtx.beginPath()
      pulseCtx.arc(128, 128, radius, 0, 2 * Math.PI)
      pulseCtx.strokeStyle = `rgba(248, 60, 60, ${alpha * 0.6})`
      pulseCtx.lineWidth = 2
      pulseCtx.stroke()
    }

    pulseCtx.beginPath()
    pulseCtx.arc(128, 128, 10, 0, 2 * Math.PI)
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

let epicenterMarkerEntity = null

// 绘制震中菱形标记，采样地形高度后贴地 5 米
function drawEpicenterMarker() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  clearEpicenterMarker()

  const m = { lon: 104.0694, lat: 31.5685, color: '#3b82f6', shape: 'diamond' }

  const iconCanvas = createGlowMarkerIcon(m.color, m.shape)
  const cartographic = Cesium.Cartographic.fromDegrees(m.lon, m.lat)
  const tp = viewer.terrainProvider
  const placeMarker = (groundH) => {
    epicenterMarkerEntity = viewer.entities.add({
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
      name: '标记-震中',
    })
  }
  if (tp && tp.readyPromise) {
    tp.readyPromise.then(() => {
      Cesium.sampleTerrainMostDetailed(tp, [cartographic]).then((samples) => {
        placeMarker(samples[0]?.height ?? 0)
      })
    })
  } else {
    placeMarker(0)
  }
}

function clearEpicenterMarker() {
  const viewer = viewerStore.viewer
  if (viewer && epicenterMarkerEntity) {
    viewer.entities.remove(epicenterMarkerEntity)
    epicenterMarkerEntity = null
  }
}

let watchtowerBillboardEntities = []

let watchtowerPulseEntities = []
let watchtowerPulseCanvas = null
let watchtowerPulseHandler = null

// 绘制瞭望塔圆形发光标记 + 蓝色脉冲光环
function drawWatchtowerBillboards() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  clearWatchtowerBillboards()

  const towers = watchtowers.value
  if (!towers || !towers.length) return

  watchtowerPulseCanvas = document.createElement('canvas')
  watchtowerPulseCanvas.width = 256
  watchtowerPulseCanvas.height = 256

  towers.forEach(t => {
    const iconCanvas = createGlowMarkerIcon('#38bdf8', 'circle')
    const towerTop = (t.groundElevation || 0) + (t.height || 0)
    const pos = Cesium.Cartesian3.fromDegrees(t.lng ?? t.lon, t.lat, towerTop || 800)

    const entity = viewer.entities.add({
      position: pos,
      billboard: {
        image: iconCanvas,
        width: 48,
        height: 48,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 500000, 0.5),
      },
      name: `监测站-${t.name}`,
    })
    watchtowerBillboardEntities.push(entity)

    const pulseEntity = viewer.entities.add({
      position: pos,
      billboard: {
        image: watchtowerPulseCanvas,
        width: 80,
        height: 80,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 2.0, 500000, 0.6),
      },
      name: `监测站脉冲-${t.name}`,
    })
    watchtowerPulseEntities.push(pulseEntity)
  })

  startWatchtowerPulse()

  sampleAndSaveGroundElevations(towers)
}

// 蓝色脉冲光环动画，单圈扩散
function startWatchtowerPulse() {
  const viewer = viewerStore.viewer
  if (!viewer || !watchtowerPulseCanvas) return
  if (watchtowerPulseHandler) {
    viewer.scene.postRender.removeEventListener(watchtowerPulseHandler)
  }

  const ctx = watchtowerPulseCanvas.getContext('2d')

  watchtowerPulseHandler = viewer.scene.postRender.addEventListener(() => {
    const t = Date.now() / 1000
    ctx.clearRect(0, 0, 256, 256)

    const cycleT = t % 2.0
    const progress = cycleT / 2.0
    const radius = 20 + progress * 90
    const alpha = Math.max(0, 1 - progress)

    ctx.beginPath()
    ctx.arc(128, 128, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.6})`
    ctx.lineWidth = 3
    ctx.stroke()

    const img = new Image()
    img.src = watchtowerPulseCanvas.toDataURL('image/png')
    watchtowerPulseEntities.forEach(e => {
      e.billboard.image = img
    })
  })
}

async function sampleAndSaveGroundElevations(towers) {
  const viewer = viewerStore.viewer
  if (!viewer) return

  const needSample = towers.filter(t => !t.groundElevation || t.groundElevation === 0)
  if (!needSample.length) return

  const cartographics = needSample.map(t => Cesium.Cartographic.fromDegrees(t.lng ?? t.lon, t.lat))
  const tp = viewer.terrainProvider
  const doSample = async () => {
    try {
      const samples = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartographics)
      const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
      for (let i = 0; i < needSample.length; i++) {
        const groundH = samples[i]?.height
        if (groundH && groundH > 0) {
          const t = needSample[i]
          t.groundElevation = Math.round(groundH)
          fetch(`${BACKEND}/api/stations/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...t, groundElevation: t.groundElevation }),
          }).catch(() => {})
        }
      }
    } catch (e) {
      console.warn('地形采样失败:', e)
    }
  }
  if (tp && tp.readyPromise) {
    tp.readyPromise.then(doSample)
  } else {
    doSample()
  }
}

function clearWatchtowerBillboards() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  watchtowerBillboardEntities.forEach(e => viewer.entities.remove(e))
  watchtowerBillboardEntities = []
  watchtowerPulseEntities.forEach(e => viewer.entities.remove(e))
  watchtowerPulseEntities = []
  if (watchtowerPulseHandler && viewer) {
    viewer.scene.postRender.removeEventListener(watchtowerPulseHandler)
    watchtowerPulseHandler = null
  }
  watchtowerPulseCanvas = null
}

// 创建发光标记图标 Canvas，支持 diamond / circle / hexagon 三种形状
function createGlowMarkerIcon(color, shape) {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const cx = size / 2
  const cy = size / 2

  const glowGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, 28)
  glowGrad.addColorStop(0, color + 'cc')
  glowGrad.addColorStop(0.2, color + '44')
  glowGrad.addColorStop(0.5, color + '11')
  glowGrad.addColorStop(1, color + '00')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.shadowColor = color
  ctx.shadowBlur = 8

  if (shape === 'diamond') {
    ctx.beginPath()
    ctx.moveTo(cx, cy - 6)
    ctx.lineTo(cx + 5, cy)
    ctx.lineTo(cx, cy + 6)
    ctx.lineTo(cx - 5, cy)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 0.8
    ctx.shadowBlur = 0
    ctx.stroke()
  } else if (shape === 'hexagon') {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6
      const r = 5.5
      i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
        : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.shadowBlur = 0
    ctx.stroke()
  } else if (shape === 'tower') {
    ctx.lineWidth = 1
    ctx.shadowBlur = 8
    ctx.strokeStyle = color
    ctx.fillStyle = color

    const baseY = cy + 6
    const bodyTop = cy - 2
    const roofPeak = cy - 9

    ctx.beginPath()
    ctx.moveTo(cx - 2.5, bodyTop)
    ctx.lineTo(cx - 2.5, baseY)
    ctx.lineTo(cx + 2.5, baseY)
    ctx.lineTo(cx + 2.5, bodyTop)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - 4.5, bodyTop)
    ctx.lineTo(cx, roofPeak)
    ctx.lineTo(cx + 4.5, bodyTop)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - 4, baseY)
    ctx.lineTo(cx - 4, baseY + 2.5)
    ctx.lineTo(cx + 4, baseY + 2.5)
    ctx.lineTo(cx + 4, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.strokeStyle = color
    ctx.lineWidth = 0.8
    ctx.setLineDash([1, 1])
    const arcCX = cx
    const arcCY = roofPeak
    ;[5, 7, 9].forEach(r => {
      ctx.beginPath()
      ctx.arc(arcCX, arcCY, r, Math.PI, 0, false)
      ctx.stroke()
    })
    ctx.setLineDash([])
  } else {
    ctx.clearRect(0, 0, size, size)
    ctx.shadowBlur = 0

    const tightGlow = ctx.createRadialGradient(cx, cy, 3, cx, cy, 8)
    tightGlow.addColorStop(0, color + '66')
    tightGlow.addColorStop(1, color + '00')
    ctx.fillStyle = tightGlow
    ctx.fillRect(0, 0, size, size)

    ctx.beginPath()
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.strokeStyle = color + '55'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx - 1, cy - 1, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fill()
  }

  return canvas
}

async function drawDeyangBoundary() {
  clearDeyangBoundary()
  const viewer = viewerStore.viewer
  if (!viewer) return
  try {
    const ds = await Cesium.GeoJsonDataSource.load('/deyang_boundary.json', {
      stroke: Cesium.Color.fromCssColorString('#f59e0b'),
      fill: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.08),
      strokeWidth: 2,
      clampToGround: true,
    })
    deyangBoundaryDS = ds
    viewer.dataSources.add(ds)
  } catch (e) {
    console.warn('德阳边界加载失败:', e)
  }
}

function clearDeyangBoundary() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  if (deyangBoundaryDS) {
    viewer.dataSources.remove(deyangBoundaryDS, true)
    deyangBoundaryDS = null
  }
}

async function drawCityBoundaries() {
  clearCityBoundaries()
  const viewer = viewerStore.viewer
  if (!viewer) return
  const cityFiles = [
    { file: '/chengdu_boundary.json', color: '#94a3b8' },
    { file: '/mianyang_boundary.json', color: '#94a3b8' },
    { file: '/aba_boundary.json', color: '#94a3b8' },
  ]
  for (const city of cityFiles) {
    try {
      const ds = await Cesium.GeoJsonDataSource.load(city.file, {
        stroke: Cesium.Color.fromCssColorString(city.color),
        fill: Cesium.Color.fromCssColorString(city.color).withAlpha(0.25),
        strokeWidth: 2,
        clampToGround: true,
      })
      cityBoundaryDSList.push(ds)
      viewer.dataSources.add(ds)
    } catch (e) {
      console.warn(`${city.file} 加载失败:`, e)
    }
  }
}

function clearCityBoundaries() {
  const viewer = viewerStore.viewer
  if (!viewer) return
  cityBoundaryDSList.forEach(ds => viewer.dataSources.remove(ds, true))
  cityBoundaryDSList.length = 0
}

watch(() => store.selectedEarthquake, (val) => {
  if (val) {
    drawEpicenter()
    const viewer = viewerStore.viewer
    if (viewer) {
      flyToAOI(viewer, { lon: val.lon, lat: val.lat, height: 60000 })
    }
  }
})

watch(() => isModuleActive('station'), (active) => {
  const viewer = viewerStore.viewer
  if (!viewer) return
  if (active) {
    if (stationClickHandler) stationClickHandler.destroy()
    stationClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    stationClickHandler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position)
      if (Cesium.defined(picked) && picked.id && picked.id.name) {
        const name = picked.id.name
        if (name.startsWith('监测站-') || name.startsWith('scene-')) return
      }
      const cartesian = viewer.scene.pickPosition(click.position)
        || viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid)
      if (Cesium.defined(cartesian)) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        pendingStationLon.value = Cesium.Math.toDegrees(cartographic.longitude)
        pendingStationLat.value = Cesium.Math.toDegrees(cartographic.latitude)
        newStationName.value = '监测站-' + (watchtowers.value.length + 1)
        showStationNameDialog.value = true
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    stationModeHint.value = true
    stationModeHintFading.value = false
    clearTimeout(stationHintTimer)
    stationHintTimer = setTimeout(() => {
      stationModeHintFading.value = true
      setTimeout(() => { stationModeHint.value = false }, 500)
    }, 6000)
  } else {
    if (stationClickHandler) {
      stationClickHandler.destroy()
      stationClickHandler = null
    }
    stationModeHint.value = false
    stationModeHintFading.value = false
    clearTimeout(stationHintTimer)
  }
})

// 场景图标点击事件（永久绑定，不依赖模块开关）
function bindSceneClickHandler(viewer) {
  if (sceneClickHandler) sceneClickHandler.destroy()
  sceneClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
  sceneClickHandler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position)
    if (Cesium.defined(picked) && picked.id && picked.id.name) {
      const name = picked.id.name
      if (name.startsWith('scene-')) {
        const entity = picked.id
        if (entity.properties) {
          const props = entity.properties
          // Cesium PropertyBag 需要 getValue(time)，普通对象直接取值
          const getProp = (key) => {
            const v = props[key]
            if (v && typeof v.getValue === 'function') {
              return v.getValue(Cesium.JulianDate.now())
            }
            return v
          }
          const sceneInfo = {
            id: getProp('id'),
            name: getProp('name'),
            type: getProp('type'),
            position: {
              lat: getProp('lat'),
              lng: getProp('lng'),
            },
            modelConfig: getProp('modelConfig'),
          }
          openFactoryPanel(sceneInfo)
          return
        }
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

// 添加场景模式：点击空白处创建新场景
watch(() => isModuleActive('scene'), (active) => {
  const viewer = viewerStore.viewer
  if (!viewer) return
  if (active) {
    if (sceneClickHandler) sceneClickHandler.destroy()
    sceneClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    sceneClickHandler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position)
      if (Cesium.defined(picked) && picked.id && picked.id.name) {
        const name = picked.id.name
        if (name.startsWith('scene-') || name.startsWith('监测站-')) return
      }
      if (Cesium.defined(picked) && picked.id && picked.id.properties) {
        const props = picked.id.properties
        if (props.factoryId) return
      }
      const cartesian = viewer.scene.pickPosition(click.position)
        || viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid)
      if (Cesium.defined(cartesian)) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        pendingSceneLon.value = Cesium.Math.toDegrees(cartographic.longitude)
        pendingSceneLat.value = Cesium.Math.toDegrees(cartographic.latitude)
        newSceneName.value = '场景-' + (sceneList.value.length + 1)
        newSceneType.value = 'factory'
        showSceneDialog.value = true
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    sceneModeHint.value = true
    sceneModeHintFading.value = false
    clearTimeout(sceneHintTimer)
    sceneHintTimer = setTimeout(() => {
      sceneModeHintFading.value = true
      setTimeout(() => { sceneModeHint.value = false }, 500)
    }, 6000)
  } else {
    // 退出添加模式时，恢复场景图标点击事件
    bindSceneClickHandler(viewer)
    sceneModeHint.value = false
    sceneModeHintFading.value = false
    clearTimeout(sceneHintTimer)
  }
})

function drawFactoryMarkers() {
  drawFactoryMarkersFn(viewerStore.viewer, vehicleSlots, createGlowMarkerIcon)
}

function clearFactoryMarkers() {
  clearFactoryMarkersFn(viewerStore.viewer)
}

function onMapLeftClickWrapper(position) {
  onMapLeftClick(position, viewerStore.viewer)
}

function gotoFactoryDetailWrapper() {
  gotoFactoryDetail(router)
}

onMounted(async () => {
  const viewer = viewerStore.viewer
  if (!viewer) return

  compassTimer = setInterval(() => {
    if (viewerStore.viewer) {
      compassHeading.value = -Cesium.Math.toDegrees(viewerStore.viewer.camera.heading)
    }
  }, 100)

  // 调试：在控制台输入 __dumpCamera() 打印当前相机参数
  window.__dumpCamera = () => {
    const c = viewer.camera
    const cartographic = Cesium.Cartographic.fromCartesian(c.position)
    const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)
    const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)
    const height = Math.round(cartographic.height)
    const heading = Cesium.Math.toDegrees(c.heading).toFixed(1)
    const pitch = Cesium.Math.toDegrees(c.pitch).toFixed(1)
    const roll = Cesium.Math.toDegrees(c.roll).toFixed(1)
    console.log(`destination: Cesium.Cartesian3.fromDegrees(${lon}, ${lat}, ${height}),`)
    console.log(`orientation: { heading: Cesium.Math.toRadians(${heading}), pitch: Cesium.Math.toRadians(${pitch}), roll: Cesium.Math.toRadians(${roll}) },`)
  }

  viewer.scene.globe.enableLighting = false
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50

  viewer.container.addEventListener('contextmenu', onMapRightClick)
  setupFactoryClick(viewer)

  stationSelectHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
  stationSelectHandler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position)
    if (!Cesium.defined(picked) || !picked.id || !picked.id.name) return
    const name = picked.id.name
    if (name.startsWith('监测站-') && !name.startsWith('监测站脉冲-')) {
      const stationName = name.replace('监测站-', '')
      const idx = watchtowers.value.findIndex(t => t.name === stationName)
      if (idx !== -1) {
        selectedStation.value = { ...watchtowers.value[idx] }
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  document.addEventListener('click', hideContextMenu)

  // 从后端加载监测站（如果后端不可用，会保持 store 中的空数组或默认值）
  await store.loadWatchtowersFromBackend()

  await setupVehicles(viewer)
  viewer.clock.shouldAnimate = true

  triggerDispatch()

  drawFlood()
  drawCityBoundaries()
  drawEpicenterMarker()
  drawFactoryMarkers()

  // 从后端加载用户创建的场景（刷新后恢复）
  await loadScenesFromDB(viewer)

  // 绑定场景图标点击事件（永久生效）
  bindSceneClickHandler(viewer)

})

onBeforeUnmount(() => {
  clearInterval(tipTimer)
  clearInterval(compassTimer)
  const viewer = viewerStore.viewer
  if (viewer) {
    viewer.container.removeEventListener('contextmenu', onMapRightClick)
  }
  if (stationSelectHandler) {
    stationSelectHandler.destroy()
    stationSelectHandler = null
  }
  if (stationClickHandler) {
    stationClickHandler.destroy()
    stationClickHandler = null
  }
  teardownFactoryClick()
  document.removeEventListener('click', hideContextMenu)
  closeViewshed()
  closeFactoryPanel()
  clearFactoryMarkers()
  closeAllFloods(viewer)
  teardownVehicles()
  stopPerf(viewer)
  clearFlood()
  clearEpicenter()
  clearEpicenterMarker()
  clearWatchtowerBillboards()
  clearDeyangBoundary()
  clearCityBoundaries()
  clearAll()
  watchtowers.value.forEach(s => {
    if (s._coverageEntities) {
      s._coverageEntities.forEach(e => viewerStore.viewer?.entities.remove(e))
      s._coverageEntities = []
    }
  })
})
</script>

<style scoped>
.dashboard {
  position: relative;
  min-height: 100vh;
  pointer-events: none;
}

.top-toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 0;
  z-index: 80;
  pointer-events: auto;
}

.top-toolbar :deep(.amap-search) {
  position: static;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: rgba(148, 163, 184, 0.25);
  margin: 0 6px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.9);
}

.toolbar-btn:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.5);
}

.toolbar-btn-icon {
  font-size: 18px;
  line-height: 1;
}

.compass-btn {
  padding: 6px;
}

.compass-icon {
  width: 100%;
  height: 100%;
}

.left-panel {
  position: absolute;
  left: 16px;
  top: 100px;
  width: 300px;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: auto;
}

.panel-header {
  padding: 0 4px;
}

.platform-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 3px;
  text-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
  margin: 0;
  white-space: nowrap;
  padding: 10px 28px;
  position: relative;
  z-index: 1;
}

.center-title {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 10;
}

/* 梯形底板 */
.center-title::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  height: 44px;
  background: linear-gradient(
    180deg,
    rgba(59, 130, 246, 0.35) 0%,
    rgba(59, 130, 246, 0.1) 50%,
    rgba(59, 130, 246, 0.2) 100%
  );
  clip-path: polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%);
  border-top: 2px solid rgba(59, 130, 246, 0.6);
}

/* 弧形光带 */
.center-title::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 520px;
  height: 60px;
  border-radius: 50% 50% 0 0;
  border-top: 1px solid rgba(59, 130, 246, 0.25);
  background: radial-gradient(
    ellipse at 50% 100%,
    rgba(59, 130, 246, 0.15) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.epicenter-card {
  background: rgba(30, 58, 138, 0.35);
  border: 1px solid rgba(59, 130, 246, 0.45);
  border-radius: 4px;
  padding: 0;
  margin-bottom: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
}

.epicenter-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  border-top: 2px solid rgba(59, 130, 246, 0.85);
  border-left: 2px solid rgba(59, 130, 246, 0.85);
  pointer-events: none;
}

.epicenter-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-top: 2px solid rgba(59, 130, 246, 0.85);
  border-right: 2px solid rgba(59, 130, 246, 0.85);
  pointer-events: none;
}

.epicenter-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.25);
}

.epicenter-card-icon {
  font-size: 14px;
  filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.7));
}

.epicenter-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #e0f2fe;
  letter-spacing: 0.5px;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}

.epicenter-card-body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.epicenter-card-body::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 6px;
  height: 6px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.7);
  border-left: 2px solid rgba(59, 130, 246, 0.7);
  pointer-events: none;
}

.epicenter-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.epicenter-info-label {
  color: #93c5fd;
  flex-shrink: 0;
  text-shadow: 0 0 4px rgba(59, 130, 246, 0.3);
}

.epicenter-info-value {
  color: #ffffff;
  text-align: right;
  font-weight: 600;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.2);
}

.epicenter-switch-btn {
  width: 100%;
  margin-top: 4px;
  padding: 7px 0;
  font-size: 12px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  color: #bfdbfe;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.epicenter-switch-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 6px;
  height: 6px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.7);
  border-right: 2px solid rgba(59, 130, 246, 0.7);
  pointer-events: none;
}

.epicenter-switch-btn:hover {
  background: rgba(59, 130, 246, 0.22);
  color: #ffffff;
}

.impact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.impact-card {
  background: rgba(30, 58, 138, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  padding: 10px 8px;
  text-align: center;
  transition: all 0.2s;
}

.impact-card:hover {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(30, 58, 138, 0.4);
}

.impact-value {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

.impact-label {
  font-size: 11px;
  color: #93c5fd;
  margin-top: 2px;
}

.mini-chart-wrap {
  margin-bottom: 10px;
}

.station-select-card {
  background: rgba(30, 58, 138, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.station-select-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.1);
}

.station-select-icon {
  font-size: 13px;
}

.station-select-title {
  font-size: 12px;
  font-weight: 600;
  color: #e0f2fe;
  flex: 1;
}

.station-select-close {
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 4px;
}

.station-select-close:hover {
  color: #fff;
}

.station-select-collapse-arrow {
  font-size: 10px;
  color: #64748b;
  margin-right: 4px;
  transition: transform 0.2s;
}

.station-select-header {
  cursor: pointer;
  user-select: none;
}

.station-select-header:hover .station-select-title {
  color: #fff;
}

.station-select-body {
  padding: 10px;
}

.station-select-name {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 8px;
}

.station-select-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 3px 0;
}

.ss-label {
  color: #93c5fd;
}

.ss-value {
  color: #ffffff;
  font-weight: 500;
}

.ss-online {
  color: #4ade80 !important;
}

.station-select-actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(59, 130, 246, 0.15);
}

.ss-btn {
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
}

.ss-btn-delete {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.ss-btn-delete:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.station-mode-toast {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  background: rgba(30, 58, 138, 0.9);
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 20px;
  padding: 8px 20px;
  pointer-events: none;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.3);
  animation: toastIn 0.4s ease;
  transition: opacity 0.5s ease;
}

.station-mode-toast.fading {
  opacity: 0;
}

.station-mode-toast span {
  font-size: 13px;
  color: #e0f2fe;
  white-space: nowrap;
}

.station-mode-toast strong {
  color: #60a5fa;
  text-shadow: 0 0 8px rgba(96, 165, 250, 0.6);
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ========== 添加监测站弹窗 ========== */
.station-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlayIn 0.2s ease;
}

.station-dialog {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.85));
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px;
  width: 380px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.1);
  animation: dialogIn 0.25s ease;
}

.station-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  font-size: 15px;
  font-weight: 600;
  color: #e0f2fe;
}

.station-dialog-icon {
  font-size: 18px;
}

.station-dialog-body {
  padding: 16px 20px;
}

.station-dialog-pos {
  font-size: 12px;
  color: #93c5fd;
  margin-bottom: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.station-dialog-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.station-dialog-input:focus {
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
}

.station-dialog-input::placeholder {
  color: rgba(148, 163, 184, 0.5);
}

.station-dialog-field {
  margin-bottom: 12px;
}

.sd-label {
  display: block;
  font-size: 12px;
  color: #93c5fd;
  margin-bottom: 6px;
}

.sd-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2393c5fd' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  cursor: pointer;
}

.sd-select option {
  background: #0f172a;
  color: #e0f2fe;
}

.station-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px 16px;
}

.sd-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
}

.sd-btn-cancel {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.25);
  color: #94a3b8;
}

.sd-btn-cancel:hover {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.sd-btn-confirm {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: #bfdbfe;
}

.sd-btn-confirm:hover {
  background: rgba(59, 130, 246, 0.35);
  color: #fff;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes dialogIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.tip-bar {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  background: rgba(30, 58, 138, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 20px;
  padding: 8px 20px;
  transition: opacity 0.5s;
}

.tip-text {
  font-size: 12px;
  color: #93c5fd;
  white-space: nowrap;
}

.panel-empty {
  text-align: center;
  padding: 24px 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.6;
}

.right-panel {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 280px;
  max-height: calc(100vh - 60px);
  background: rgba(30, 58, 138, 0.25);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  transform: translateX(calc(100% + 32px));
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
  z-index: 20;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.1);
}

.right-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  border-top: 2px solid rgba(59, 130, 246, 0.85);
  border-left: 2px solid rgba(59, 130, 246, 0.85);
  pointer-events: none;
  z-index: 1;
}

.right-panel::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-top: 2px solid rgba(59, 130, 246, 0.85);
  border-right: 2px solid rgba(59, 130, 246, 0.85);
  pointer-events: none;
  z-index: 1;
}

.right-panel.visible {
  transform: translateX(0);
  opacity: 1;
}

.vehicle-panel {
  top: 64px;
  z-index: 60;
  max-height: calc(100vh - 60px);
}

.vehicle-panel.dragging {
  opacity: 0.9;
  transition: none;
}

.vehicle-panel .panel-header {
  cursor: grab;
  user-select: none;
}

.vehicle-panel .panel-header:active {
  cursor: grabbing;
}

.drag-hint {
  font-size: 16px;
  color: rgba(147, 197, 253, 0.35);
  letter-spacing: 2px;
  cursor: grab;
}

/* ========== 摘要面板 ========== */
.summary-panel {
  top: 16px;
  max-height: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.summary-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
}

.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

/* ========== 洪水面板 ========== */
.flood-panel {
  top: 16px;
  max-height: 260px;
}

.flood-list {
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
}

.right-panel .panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  position: relative;
  z-index: 1;
}

.right-panel .panel-header::before {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 6px;
  height: 6px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.7);
  border-left: 2px solid rgba(59, 130, 246, 0.7);
  pointer-events: none;
}

.right-panel .panel-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  right: 0;
  width: 6px;
  height: 6px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.7);
  border-right: 2px solid rgba(59, 130, 246, 0.7);
  pointer-events: none;
}

.right-panel .panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #e0f2fe;
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-close-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  color: #93c5fd;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  line-height: 1;
}

.panel-close-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.vehicle-list {
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.vehicle-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  background: rgba(30, 58, 138, 0.2);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.vehicle-card:hover {
  background: rgba(30, 58, 138, 0.35);
  border-color: rgba(59, 130, 246, 0.4);
}

.vehicle-card.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(96, 165, 250, 0.5);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.15);
}

.vehicle-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.vehicle-info {
  flex: 1;
  min-width: 0;
}

.vehicle-name {
  font-size: 12px;
  color: #e0f2fe;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vehicle-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #93c5fd;
  margin-top: 2px;
}

.stat-sep {
  color: rgba(147, 197, 253, 0.4);
}

.vehicle-track-icon {
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.7;
}

/* ========== 速度控制 ========== */

.speed-control {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(59, 130, 246, 0.15);
  background: rgba(30, 58, 138, 0.15);
}

.speed-label {
  font-size: 11px;
  color: #93c5fd;
  flex-shrink: 0;
}

.speed-control input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.speed-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

.speed-value {
  font-size: 11px;
  color: #93c5fd;
  flex-shrink: 0;
  min-width: 50px;
  text-align: right;
}

.sim-btn {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid rgba(96, 165, 250, 0.4);
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.sim-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(96, 165, 250, 0.6);
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.2);
}

.sim-btn:disabled {
  opacity: 0.5;
  cursor: default;
  color: #64748b;
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.1);
}

.context-menu {
  position: fixed;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 8px;
  padding: 4px;
  min-width: 160px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.ctx-item:hover {
  background: rgba(59, 130, 246, 0.2);
}

.ctx-item.danger {
  color: #f87171;
}

.ctx-item.danger:hover {
  background: rgba(248, 113, 113, 0.15);
}

.flood-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 12px;
}

.flood-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 6px;
}

.flood-card-title {
  flex: 1;
  font-weight: 500;
}

.flood-card-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.flood-card-status.running {
  background: rgba(250, 204, 21, 0.15);
  color: #facc15;
  animation: pulse-text 1s ease-in-out infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.flood-card-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  line-height: 1;
}

.flood-card-close:hover {
  color: rgba(255, 255, 255, 0.8);
}

.flood-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flood-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.flood-stat-label {
  color: rgba(255, 255, 255, 0.45);
}

.flood-stat-value {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}
</style>

<style>
.village-marker {
  position: absolute;
  pointer-events: auto;
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
  opacity: 0;
  color: #fff;
  font-size: 12px;
  font-family: 'Microsoft YaHei', sans-serif;
  text-shadow: 0 0 4px #000, 0 0 4px #000;
  white-space: nowrap;
}
.village-marker:hover .village-label {
  opacity: 1;
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

/* ========== 监测站管理面板 ========== */
.station-manage-panel {
  top: 16px;
  max-height: calc(100vh - 60px);
  width: 320px;
}

.station-manage-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

.station-add-btn {
  padding: 10px 16px;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  color: #4ade80;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.station-add-btn:hover {
  background: rgba(74, 222, 128, 0.25);
}

.station-manage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.station-manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.station-manage-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.station-manage-row.editing {
  border-color: rgba(74, 222, 128, 0.4);
  background: rgba(74, 222, 128, 0.08);
}

.station-row-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  cursor: pointer;
}

.station-row-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.station-row-color.seismic {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.station-row-color.hazard {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
}

.station-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.station-row-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.station-row-type {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.station-row-actions {
  display: flex;
  gap: 6px;
}

.station-action-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.station-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.station-action-btn.edit:hover {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.station-action-btn.del:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.station-form {
  padding: 16px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.station-form-title {
  font-size: 14px;
  font-weight: 600;
  color: #4ade80;
  margin-bottom: 4px;
}

.station-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.station-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  grid-column: span 2;
}

.station-field.half {
  grid-column: span 1;
}

.station-field.full {
  grid-column: span 2;
}

.station-field span {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.station-field input,
.station-field select,
.station-field textarea {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

.station-field input:focus,
.station-field select:focus,
.station-field textarea:focus {
  border-color: rgba(74, 222, 128, 0.4);
  background: rgba(255, 255, 255, 0.08);
}

.station-field textarea {
  resize: vertical;
  min-height: 60px;
}

.station-form-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.station-form-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.station-form-btn.cancel {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

.station-form-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.12);
}

.station-form-btn.save {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.station-form-btn.save:hover {
  background: rgba(74, 222, 128, 0.25);
}

.panel-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.panel-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.manage-btn {
  border: 1px solid rgba(74, 222, 128, 0.2);
}

.manage-btn.active {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.4);
}

.data-entry-btn {
  position: fixed;
  bottom: 28px;
  right: 16px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  z-index: 999;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
}

.data-entry-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
  transform: scale(1.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.dashboard-eq-chart {
  position: fixed;
  right: 16px;
  top: 60px;
  width: 380px;
  z-index: 998;
  pointer-events: auto;
}

.sim-toggle-btn {
  position: fixed;
  bottom: 28px;
  right: 72px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 999;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
}

.sim-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.sim-toggle-btn.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.3);
}

.sim-toggle-btn.active .sim-btn-icon {
  color: #38bdf8;
}

.sim-btn-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.3s;
}

/* ========== 工厂预览面板 ========== */
.factory-preview-panel {
  top: 80px !important;
  max-height: calc(100vh - 120px);
  width: 260px;
  padding: 0;
}

.fp-close-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 10;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
  transition: background 0.2s;
  pointer-events: auto;
}
.fp-close-btn:hover {
  background: rgba(220, 38, 38, 0.8);
}

.factory-preview-three {
  width: 100%;
  height: 200px;
  flex-shrink: 0;
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px 12px 0 0;
  overflow: hidden;
  position: relative;
}

.factory-preview-three canvas {
  display: block;
}

.factory-preview-actions {
  padding: 10px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.fp-btn {
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.fp-btn.detail {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.fp-btn.detail:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.25);
}

.toolbar-mod {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.85);
  margin-left: 4px;
}

.toolbar-mod:first-child {
  margin-left: 0;
}

.toolbar-mod:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.5);
}

.toolbar-mod.active {
  border-color: rgba(96, 165, 250, 0.5);
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.25);
}

.toolbar-mod-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

</style>