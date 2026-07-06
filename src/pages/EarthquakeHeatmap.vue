<template>
  <div class="earthquake-page">
    <aside class="sidebar" :class="{ collapsed }">
      <div class="panel-header">
        <h2>🌋 地震活动监测</h2>
        <p class="subtitle">数据来源：USGS 地震监测</p>
      </div>

      <div v-show="!collapsed" class="panel-body">
      <div class="panel">
        <span class="label">🕐 时间范围</span>
        <select v-model="timeRange" @change="fetchData">
          <option value="hour">过去 1 小时</option>
          <option value="day">过去 24 小时</option>
          <option value="week">过去 7 天</option>
          <option value="month">过去 30 天</option>
        </select>
      </div>

      <div class="panel">
        <span class="label">📊 震级筛选</span>
        <div class="range-row">
          <input type="range" v-model.number="minMag" min="0" max="6" step="0.5" />
          <span>&ge; {{ minMag.toFixed(1) }} 级</span>
        </div>
      </div>

      <div class="panel">
        <span class="label">🎨 底图风格</span>
        <select v-model="mapStyle" @change="switchStyle">
          <option value="ion">Bing 卫星</option>
          <option value="gaode">高德地图</option>
        </select>
      </div>

      <div class="panel">
        <span class="label">🎬 播放模式</span>
        <button @click="togglePlayback" class="preset-btn" :class="{ active: playbackMode }" style="width:100%">
          {{ playbackMode ? '⏸️ 时间回放中' : '▶️ 时间回放' }}
        </button>
        <div v-if="playbackMode" class="playback-controls">
          <button @click="togglePlay" class="play-btn">
            {{ playing ? '⏸️' : '▶️' }}
          </button>
          <div class="speed-row">
            <span>速度</span>
            <input type="range" v-model.number="playSpeed" min="0.5" max="10" step="0.5" />
            <span>{{ playSpeed.toFixed(1) }}x</span>
          </div>
        </div>
      </div>

      <div class="stats">
        <p>📡 共 <strong>{{ quakes.length }}</strong> 条地震记录</p>
        <p v-if="quakes.length">🔺 最大震级: <strong>{{ maxMag.toFixed(1) }}</strong></p>
        <p v-if="quakes.length">📍 最近: <strong>{{ latestPlace }}</strong></p>
        <p v-if="playbackMode && currentTimeLabel">🕐 {{ currentTimeLabel }}</p>
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as Cesium from 'cesium'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { useViewerStore } from '../stores/viewerStore.js'

const store = useScenarioStore()
const viewerStore = useViewerStore()

const collapsed = ref(false)
const timeRange = ref('week')
const minMag = ref(2.5)
const mapStyle = ref('gaode')
const quakes = ref([])
const playbackMode = ref(false)
const playing = ref(false)
const playSpeed = ref(2)
const currentTimeLabel = ref('')

let viewer = null
let currentBaseLayer = null
let quakeEntities = []
let playbackTimer = null
let playbackIndex = 0
let sortedQuakes = []

const maxMag = computed(() => {
  if (!quakes.value.length) return 0
  return Math.max(...quakes.value.map(q => q.mag))
})

const latestPlace = computed(() => {
  if (!quakes.value.length) return '-'
  const sorted = [...quakes.value].sort((a, b) => b.time - a.time)
  return sorted[0].place || '未知'
})

function getStartTime() {
  const now = new Date()
  const offsets = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 }
  return new Date(now.getTime() - offsets[timeRange.value]).toISOString()
}

async function fetchData() {
  try {
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${getStartTime()}`
    const res = await fetch(url)
    const data = await res.json()
    quakes.value = data.features.map(f => ({
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      mag: f.properties.mag,
      depth: f.geometry.coordinates[2],
      place: f.properties.place,
      time: f.properties.time
    }))
    store.setEarthquakeData(quakes.value)
    updateQuakes()
  } catch (e) {
    console.error('地震数据获取失败:', e)
  }
}

function magToColor(mag) {
  if (mag < 2) return Cesium.Color.fromCssColorString('rgba(33,102,172,0.6)')
  if (mag < 3) return Cesium.Color.fromCssColorString('rgba(103,169,207,0.7)')
  if (mag < 4) return Cesium.Color.fromCssColorString('rgba(209,229,92,0.7)')
  if (mag < 5) return Cesium.Color.fromCssColorString('rgba(253,219,102,0.8)')
  if (mag < 6) return Cesium.Color.fromCssColorString('rgba(239,138,52,0.85)')
  return Cesium.Color.fromCssColorString('rgba(215,48,39,0.9)')
}

function clearQuakeEntities() {
  if (viewer) {
    quakeEntities.forEach(e => viewer.entities.remove(e))
  }
  quakeEntities = []
}

function updateQuakes() {
  if (!viewer) return
  clearQuakeEntities()
  const filtered = playbackMode.value ? sortedQuakes.slice(0, playbackIndex) : quakes.value
  const display = filtered.filter(q => q.mag >= minMag.value)
  display.forEach(q => {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(q.lon, q.lat),
      ellipse: {
        semiMinorAxis: Math.max(5000, q.mag * 15000),
        semiMajorAxis: Math.max(5000, q.mag * 15000),
        material: magToColor(q.mag),
        height: 0,
      },
      label: {
        text: q.mag >= 4 ? `M${q.mag.toFixed(1)}` : '',
        font: '11px sans-serif',
        fillColor: Cesium.Color.WHITE,
        style: Cesium.LabelStyle.FILL,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, 0),
      },
    })
    quakeEntities.push(entity)
  })
}

function switchStyle() {
  if (!viewer) return
  if (currentBaseLayer) {
    viewer.imageryLayers.remove(currentBaseLayer, true)
    currentBaseLayer = null
  }
  if (mapStyle.value === 'gaode') {
    currentBaseLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        subdomains: ['1', '2', '3', '4'],
        minimumLevel: 3,
        maximumLevel: 18,
      }),
      0
    )
  }
}

watch(minMag, updateQuakes)

function togglePlayback() {
  playbackMode.value = !playbackMode.value
  if (playbackMode.value) {
    startPlayback()
  } else {
    stopPlayback()
    updateQuakes()
  }
}

function togglePlay() {
  playing.value = !playing.value
  if (playing.value) runPlaybackTick()
  else clearTimeout(playbackTimer)
}

function startPlayback() {
  stopPlayback()
  sortedQuakes = [...quakes.value].sort((a, b) => a.time - b.time)
  playbackIndex = 0
  playing.value = true
  clearQuakeEntities()
  runPlaybackTick()
}

function stopPlayback() {
  playing.value = false
  clearTimeout(playbackTimer)
  playbackTimer = null
}

function runPlaybackTick() {
  if (!playing.value || !playbackMode.value) return
  const batchSize = Math.max(1, Math.floor(playSpeed.value * 5))
  playbackIndex = Math.min(playbackIndex + batchSize, sortedQuakes.length)
  if (playbackIndex > 0 && playbackIndex <= sortedQuakes.length) {
    currentTimeLabel.value = formatTime(sortedQuakes[playbackIndex - 1].time)
  }
  updateQuakes()
  if (playbackIndex < sortedQuakes.length) {
    playbackTimer = setTimeout(runPlaybackTick, 100)
  } else {
    playing.value = false
    currentTimeLabel.value = '回放完成'
  }
}

function formatTime(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  viewer = viewerStore.viewer
  if (!viewer) return
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 12000000),
  })
  switchStyle()
  fetchData()
})

onBeforeUnmount(() => {
  stopPlayback()
  clearQuakeEntities()
  if (viewer && currentBaseLayer) {
    viewer.imageryLayers.remove(currentBaseLayer, true)
    currentBaseLayer = null
  }
  viewer = null
})
</script>

<style scoped>
.earthquake-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: transparent;
}
.sidebar {
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: 280px;
  z-index: 100;
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
.sidebar.collapsed { left: -280px; box-shadow: none; }
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: rgba(45, 138, 78, 0.2); border-radius: 2px; }

.panel-header {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
  flex-shrink: 0;
}
.panel-header h2 { font-size: 14px; color: #2d8a4e; margin: 0 0 2px; font-weight: 700; }
.subtitle { font-size: 10px; color: #8b7e6a; margin: 1px 0; }

.panel-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}
.panel {
  display: flex; flex-direction: column; gap: 6px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid rgba(45, 138, 78, 0.08);
}
.label { font-size: 12px; color: #6b5e4a; font-weight: 500; }
select {
  padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(45, 138, 78, 0.2);
  background: rgba(255, 255, 255, 0.5); color: #3d3929; font-size: 12px; cursor: pointer;
}
.range-row {
  display: flex; align-items: center; gap: 8px; font-size: 12px; color: #5a4e3c;
}
.range-row input[type="range"] { flex: 1; accent-color: #f59e0b; }
.stats {
  margin-top: auto; padding: 10px; background: rgba(45, 138, 78, 0.06);
  border-radius: 8px; font-size: 12px; color: #6b5e4a; line-height: 1.8;
  border: 1px solid rgba(45, 138, 78, 0.08);
}
.stats strong { color: #e74c3c; }
.map-area { position: absolute; inset: 0; z-index: 0; }
.preset-btn {
  padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(45, 138, 78, 0.2);
  background: rgba(45, 138, 78, 0.06); color: #3d3929; font-size: 13px;
  cursor: pointer; transition: all 0.2s; font-weight: 500;
}
.preset-btn:hover { background: rgba(245, 158, 11, 0.08); border-color: #f59e0b; }
.preset-btn.active { background: #2d8a4e; border-color: #2d8a4e; color: #fff; }
.playback-controls {
  display: flex; align-items: center; gap: 10px; margin-top: 4px;
}
.play-btn {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(45, 138, 78, 0.2);
  background: rgba(45, 138, 78, 0.06); color: #2d8a4e; font-size: 16px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.play-btn:hover { background: rgba(45, 138, 78, 0.12); }
.speed-row {
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8b7e6a; flex: 1;
}
.speed-row input[type="range"] { flex: 1; accent-color: #f59e0b; }
.collapse-toggle {
  position: absolute;
  left: 292px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 101;
  width: 24px;
  height: 48px;
  border-radius: 0 8px 8px 0;
  border: 1px solid rgba(45, 138, 78, 0.12);
  border-left: none;
  background: rgba(254, 252, 245, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 12px;
  cursor: pointer;
  color: #6b5e4a;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.collapse-toggle:hover {
  background: rgba(254, 252, 245, 0.95);
  color: #1a6b35;
}
</style>