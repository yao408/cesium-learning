<template>
  <div class="earthquake-page">
    <aside class="sidebar">
      <h2>🌍 全球地震热力图</h2>
      <p class="subtitle">数据来源：USGS 地震监测</p>

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
        <span class="label">🔥 热力强度</span>
        <div class="range-row">
          <input type="range" v-model.number="heatIntensity" min="0.5" max="3" step="0.1" />
          <span>{{ heatIntensity.toFixed(1) }}</span>
        </div>
      </div>

      <div class="panel">
        <span class="label">🎨 底图风格</span>
        <select v-model="mapStyle" @change="switchStyle">
          <option value="streets">街道（标准）</option>
          <option value="outdoors">户外地形</option>
          <option value="light">亮色简约</option>
          <option value="dark">暗色系</option>
          <option value="satellite">纯卫星图</option>
          <option value="satellite-streets">卫星+道路</option>
          <option value="nav-day">导航（白天）</option>
          <option value="nav-night">导航（夜间）</option>
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
    </aside>

    <div class="map-area">
      <div ref="mapContainer" class="map-container"></div>
      <div v-if="playbackMode" class="timeline-bar">
        <div class="timeline-progress" :style="{ width: timelinePercent + '%' }"></div>
        <div class="timeline-info">
          <span>{{ playbackStartLabel }}</span>
          <span>{{ playbackEndLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

const mapContainer = ref(null)
const timeRange = ref('week')
const minMag = ref(2.5)
const heatIntensity = ref(1.0)
const mapStyle = ref('dark')
const quakes = ref([])
const playbackMode = ref(false)
const playing = ref(false)
const playSpeed = ref(2)
const currentTimeLabel = ref('')
const timelinePercent = ref(0)
const playbackStartLabel = ref('')
const playbackEndLabel = ref('')

let map = null
let heatLayerId = null
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

function getUSGSQuery(timeRange) {
  const map = { hour: 'hour', day: 'day', week: 'week', month: 'month' }
  return `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${map[timeRange]}.geojson`
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
    updateHeatmap()
  } catch (e) {
    console.error('地震数据获取失败:', e)
  }
}

function getStartTime() {
  const now = new Date()
  const offsets = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 }
  return new Date(now.getTime() - offsets[timeRange.value]).toISOString()
}

const styleUrls = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  'satellite-streets': 'mapbox://styles/mapbox/satellite-streets-v12',
  'nav-day': 'mapbox://styles/mapbox/navigation-day-v1',
  'nav-night': 'mapbox://styles/mapbox/navigation-night-v1'
}

function switchStyle() {
  if (!map) return
  map.setStyle(styleUrls[mapStyle.value])
  map.once('style.load', () => {
    if (map.getSource('mapbox-dem')) {
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
    } else {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
    }

    const layers = map.getStyle().layers
    let labelLayerId
    for (const layer of layers) {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        labelLayerId = layer.id
        break
      }
    }

    if (!map.getLayer('3d-buildings')) {
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 10,
        paint: {
          'fill-extrusion-color': '#3a3a5c',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6
        }
      }, labelLayerId)
    }

    updateHeatmap()
  })
}

function updateHeatmap() {
  if (!map || !map.isStyleLoaded()) return

  const filtered = quakes.value.filter(q => q.mag >= minMag.value)

  if (heatLayerId) {
    map.removeLayer(heatLayerId)
    if (map.getSource('earthquakes')) {
      map.removeSource('earthquakes')
    }
  }

  if (!filtered.length) return

  const geojson = {
    type: 'FeatureCollection',
    features: filtered.map(q => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [q.lon, q.lat] },
      properties: { mag: q.mag, depth: q.depth }
    }))
  }

  map.addSource('earthquakes', { type: 'geojson', data: geojson })
  heatLayerId = 'earthquake-heat'

  map.addLayer({
    id: heatLayerId,
    type: 'heatmap',
    source: 'earthquakes',
    paint: {
      'heatmap-weight': ['*', ['get', 'mag'], heatIntensity.value],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.1, 'rgb(103,169,207)',
        0.3, 'rgb(209,229,92)',
        0.5, 'rgb(253,219,102)',
        0.7, 'rgb(239,138,52)',
        0.9, 'rgb(215,48,39)'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 10, 9, 40],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 9, 0.6]
    }
  })
}

watch(minMag, updateHeatmap)
watch(heatIntensity, updateHeatmap)

function togglePlayback() {
  playbackMode.value = !playbackMode.value
  if (playbackMode.value) {
    startPlayback()
  } else {
    stopPlayback()
    updateHeatmap()
  }
}

function togglePlay() {
  playing.value = !playing.value
  if (playing.value) {
    runPlaybackTick()
  } else {
    clearTimeout(playbackTimer)
  }
}

function startPlayback() {
  stopPlayback()
  sortedQuakes = [...quakes.value].sort((a, b) => a.time - b.time)
  playbackIndex = 0
  timelinePercent.value = 0

  if (sortedQuakes.length > 0) {
    playbackStartLabel.value = formatTime(sortedQuakes[0].time)
    playbackEndLabel.value = formatTime(sortedQuakes[sortedQuakes.length - 1].time)
  }

  playing.value = true
  if (map && map.getSource('earthquakes')) {
    map.getSource('earthquakes').setData({ type: 'FeatureCollection', features: [] })
  }
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
  const end = Math.min(playbackIndex + batchSize, sortedQuakes.length)
  const batch = sortedQuakes.slice(playbackIndex, end)

  playbackIndex = end
  timelinePercent.value = sortedQuakes.length > 0 ? (playbackIndex / sortedQuakes.length) * 100 : 0

  if (batch.length > 0) {
    const last = batch[batch.length - 1]
    currentTimeLabel.value = formatTime(last.time)

    const existingFeatures = []
    if (map && map.getSource('earthquakes')) {
      const data = map.getSource('earthquakes')._data
      if (data && data.features) {
        existingFeatures.push(...data.features)
      }
    }

    const newFeatures = batch.filter(q => q.mag >= minMag.value).map(q => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [q.lon, q.lat] },
      properties: { mag: q.mag, depth: q.depth }
    }))

    const allFeatures = [...existingFeatures, ...newFeatures]
    if (map && map.getSource('earthquakes')) {
      map.getSource('earthquakes').setData({
        type: 'FeatureCollection',
        features: allFeatures
      })
    }
  }

  if (playbackIndex < sortedQuakes.length) {
    playbackTimer = setTimeout(runPlaybackTick, 100)
  } else {
    playing.value = false
    currentTimeLabel.value = '回放完成 🎉'
  }
}

function formatTime(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: styleUrls.dark,
    center: [116.4, 39.9],
    zoom: 4,
    pitch: 45,
    attributionControl: false
  })

  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

  map.on('load', () => {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14
    })
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })

    const layers = map.getStyle().layers
    let labelLayerId
    for (const layer of layers) {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        labelLayerId = layer.id
        break
      }
    }

    map.addLayer({
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 10,
      paint: {
        'fill-extrusion-color': '#3a3a5c',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.6
      }
    }, labelLayerId)

    fetchData()
  })
})

onBeforeUnmount(() => {
  stopPlayback()
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.earthquake-page {
  display: flex; height: 100%; overflow: hidden;
}
.sidebar {
  width: 280px; flex-shrink: 0; padding: 20px 16px;
  background: rgba(22, 33, 62, 0.95); overflow-y: auto;
  display: flex; flex-direction: column; gap: 16px;
  border-right: 1px solid #0f3460;
}
.sidebar h2 { font-size: 18px; color: #fff; margin: 0; }
.subtitle { font-size: 12px; color: #888; margin: 0; }
.panel {
  display: flex; flex-direction: column; gap: 6px;
}
.label { font-size: 13px; color: #aaa; }
select {
  padding: 8px 10px; border-radius: 6px; border: 1px solid #2a2a4a;
  background: #1a1a2e; color: #e0e0e0; font-size: 13px; cursor: pointer;
}
.range-row {
  display: flex; align-items: center; gap: 10px; font-size: 13px; color: #ccc;
}
.range-row input[type="range"] { flex: 1; accent-color: #e94560; }
.stats {
  margin-top: auto; padding: 12px; background: rgba(255,255,255,0.04);
  border-radius: 8px; font-size: 13px; color: #aaa; line-height: 1.8;
}
.stats strong { color: #e94560; }
.map-area { flex: 1; position: relative; }
.map-container { width: 100%; height: 100%; }
.preset-btn {
  padding: 8px 12px; border-radius: 6px; border: 1px solid #2a2a4a;
  background: rgba(255,255,255,0.06); color: #ccc; font-size: 13px;
  cursor: pointer; transition: all 0.2s;
}
.preset-btn:hover { background: rgba(255,255,255,0.12); }
.preset-btn.active { background: #e94560; border-color: #e94560; color: #fff; }
.playback-controls {
  display: flex; align-items: center; gap: 10px; margin-top: 4px;
}
.play-btn {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid #2a2a4a;
  background: rgba(255,255,255,0.08); color: #fff; font-size: 16px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.play-btn:hover { background: rgba(255,255,255,0.16); }
.speed-row {
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888; flex: 1;
}
.speed-row input[type="range"] { flex: 1; accent-color: #e94560; }
.timeline-bar {
  position: absolute; bottom: 20px; left: 20px; right: 20px; height: 6px;
  background: rgba(255,255,255,0.1); border-radius: 3px; overflow: visible;
}
.timeline-progress {
  height: 100%; background: linear-gradient(90deg, #e94560, #ff6b6b);
  border-radius: 3px; transition: width 0.1s linear;
}
.timeline-info {
  display: flex; justify-content: space-between; font-size: 11px; color: #888;
  margin-top: 4px;
}
</style>