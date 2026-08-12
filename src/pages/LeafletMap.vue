<template>
  <div class="minimap-panel">
    <button class="panel-fold-btn map-fold" @click="$emit('toggle')" title="折叠">《</button>
    <!-- 八角霓虹边框 SVG -->
    <svg class="octagon-neon-svg" viewBox="0 0 320 380" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;">
      <defs>
        <!-- 常驻底色渐变：冷蓝微弱发光 -->
        <linearGradient id="mapBaseNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4a90ff"/>
          <stop offset="50%" stop-color="#42e2f5"/>
          <stop offset="100%" stop-color="#4a90ff"/>
        </linearGradient>

        <!-- 高光带外层：宽模糊蓝光 -->
        <linearGradient id="mapFlowOuter" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent"/>
          <stop offset="40%" stop-color="rgba(74,144,255,0)"/>
          <stop offset="48%" stop-color="rgba(74,144,255,0.5)"/>
          <stop offset="50%" stop-color="rgba(66,226,245,0.65)"/>
          <stop offset="52%" stop-color="rgba(74,144,255,0.5)"/>
          <stop offset="60%" stop-color="rgba(74,144,255,0)"/>
          <stop offset="100%" stop-color="transparent"/>
        </linearGradient>

        <!-- 高光带中层：亮蓝线条 -->
        <linearGradient id="mapFlowMid" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent"/>
          <stop offset="43%" stop-color="rgba(116,192,255,0)"/>
          <stop offset="48%" stop-color="rgba(116,192,255,0.85)"/>
          <stop offset="50%" stop-color="#a0f0ff"/>
          <stop offset="52%" stop-color="rgba(116,192,255,0.85)"/>
          <stop offset="57%" stop-color="rgba(116,192,255,0)"/>
          <stop offset="100%" stop-color="transparent"/>
        </linearGradient>

        <!-- 高光带核心：白/青色极细高光 -->
        <linearGradient id="mapFlowCore" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent"/>
          <stop offset="46%" stop-color="rgba(210,235,250,0)"/>
          <stop offset="49%" stop-color="rgba(230,245,255,0.9)"/>
          <stop offset="50%" stop-color="#ffffff"/>
          <stop offset="51%" stop-color="rgba(230,245,255,0.9)"/>
          <stop offset="54%" stop-color="rgba(210,235,250,0)"/>
          <stop offset="100%" stop-color="transparent"/>
        </linearGradient>

        <!-- 发光滤镜 -->
        <filter id="mapNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur1"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- 外层粗底色 -->
      <polygon points="14,0,306,0,320,14,320,366,306,380,14,380,0,366,0,14"
               fill="none"
               stroke="url(#mapBaseNeonGrad)"
               stroke-width="3"
               opacity="0.6"/>

      <!-- 中层流光 -->
      <polygon points="14,0,306,0,320,14,320,366,306,380,14,380,0,366,0,14"
               fill="none"
               stroke="url(#mapFlowOuter)"
               stroke-width="6"
               filter="url(#mapNeonGlow)"
               class="energy-flow-outer"/>

      <!-- 内层亮线 -->
      <polygon points="14,0,306,0,320,14,320,366,306,380,14,380,0,366,0,14"
               fill="none"
               stroke="url(#mapFlowMid)"
               stroke-width="2"
               class="energy-flow-mid"/>

      <!-- 核心高光线 -->
      <polygon points="14,0,306,0,320,14,320,366,306,380,14,380,0,366,0,14"
               fill="none"
               stroke="url(#mapFlowCore)"
               stroke-width="1"
               class="energy-flow-core"/>
    </svg>

    <div class="minimap-content">
      <div class="minimap-header">
        <span class="minimap-title">场景-1 生产车间</span>
      </div>

      <div class="minimap-map-container">
        <div ref="mapContainer" class="leaflet-map-container">
          <div class="leaflet-map-overlay"></div>
        </div>
      </div>

      <div class="minimap-info">
        <div class="datetime-row">
          <span class="date-text">{{ currentDate }}</span>
          <span class="weekday-text">{{ currentWeekday }}</span>
          <span class="time-text">{{ currentTime }}</span>
        </div>

        <div class="weather-row">
          <div class="weather-item">
            <span class="weather-label">天气</span>
            <span class="weather-value">{{ weather.type }}</span>
          </div>
          <div class="weather-item">
            <span class="weather-label">最高温</span>
            <span class="weather-value">{{ weather.maxTemp }}°C</span>
          </div>
          <div class="weather-item">
            <span class="weather-label">最低温</span>
            <span class="weather-value">{{ weather.minTemp }}°C</span>
          </div>
          <div class="weather-item">
            <span class="weather-label">湿度</span>
            <span class="weather-value">{{ weather.humidity }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  factoryInfo: { type: Object, required: true },
  collapsed: { type: Boolean, default: false }
})

const mapContainer = ref(null)
const currentDate = ref('')
const currentWeekday = ref('')
const currentTime = ref('')
const weather = reactive({
  type: '晴',
  maxTemp: 24,
  minTemp: 24,
  humidity: 58
})

let leafletMap = null
let initialized = false
let datetimeTimer = null

function updateDateTime() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  currentDate.value = `${year}-${month}-${day}`

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentWeekday.value = weekdays[now.getDay()]

  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
}

watch(
  () => props.factoryInfo?.position,
  (pos) => {
    if (!pos || initialized) return
    const container = mapContainer.value
    if (!container) return

    initialized = true
    leafletMap = L.map(container, {
      attributionControl: false,
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
    }).setView([pos.lat, pos.lng], 15)

    const amapLayer = L.tileLayer(
      'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      { maxZoom: 18, subdomains: '1234' }
    )
    amapLayer.addTo(leafletMap)

    const overlay = container.querySelector('.leaflet-map-overlay')
    if (!overlay) {
      const div = document.createElement('div')
      div.className = 'leaflet-map-overlay'
      container.appendChild(div)
    }

    L.marker([pos.lat, pos.lng])
      .addTo(leafletMap)
      .bindPopup(`<b>${props.factoryInfo.name}</b><br>${props.factoryInfo.type}`)
      .openPopup()
  },
  { immediate: true }
)

onMounted(() => {
  updateDateTime()
  datetimeTimer = setInterval(updateDateTime, 1000)
})

onBeforeUnmount(() => {
  if (datetimeTimer) {
    clearInterval(datetimeTimer)
    datetimeTimer = null
  }

  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }
})
</script>

<style scoped>
.minimap-panel {
  position: fixed;
  top: 15px;
  right: 20px;
  z-index: 101;
  background: transparent !important;
  background-color: transparent !important;
  padding: 8px;
  width: 280px;
  display: flex;
  flex-direction: column;
  clip-path: polygon(
    12px 0, calc(100% - 12px) 0,
    100% 12px, 100% calc(100% - 12px),
    calc(100% - 12px) 100%, 12px 100%,
    0 calc(100% - 12px), 0 12px
  );
}

.minimap-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.minimap-header {
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(74, 144, 255, 0.2);
}

.minimap-title {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(74, 144, 255, 0.5);
}

.minimap-map-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 0;
}

.leaflet-map-container {
  width: 130px;
  height: 130px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 0 20px rgba(0, 150, 255, 0.25),
    inset 0 0 15px rgba(0, 200, 255, 0.08);
  border: 2px solid rgba(0, 180, 255, 0.4);
}

.leaflet-map-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background: rgba(20, 60, 180, 0.12) !important;
  border-radius: 8px;
}

.minimap-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 3px;
  border-top: 1px solid rgba(74, 144, 255, 0.15);
}

.datetime-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #42e2f5;
  text-shadow: 0 0 8px rgba(66, 226, 245, 0.4);
}

.date-text,
.weekday-text,
.time-text {
  letter-spacing: 0.5px;
}

.weather-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
}

.weather-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 3px 2px;
  background: rgba(74, 144, 255, 0.06);
  border-radius: 4px;
  border: 1px solid rgba(74, 144, 255, 0.12);
}

.weather-label {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 400;
}

.weather-value {
  font-size: 11px;
  color: #00d4ff;
  font-weight: 600;
  text-shadow: 0 0 6px rgba(0, 212, 255, 0.4);
}

/* 能量光带动画 */
.energy-flow-outer {
  animation: energyFlow 7s linear infinite;
}
.energy-flow-mid {
  animation: energyFlow 7s linear infinite;
}
.energy-flow-core {
  animation: energyFlow 7s linear infinite;
}

@keyframes energyFlow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -420; }
}

:deep(.leaflet-popup-content-wrapper) {
  background: rgba(10, 25, 60, 0.85) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: 6px !important;
  border: 1px solid rgba(0, 150, 255, 0.3) !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
  padding: 0 !important;
}

:deep(.leaflet-popup-content) {
  margin: 6px 10px !important;
  font-size: 11px !important;
  color: #a0c8e8 !important;
  line-height: 1.3 !important;
}

:deep(.leaflet-popup-content b) {
  color: #7ec8f8 !important;
  font-size: 11px !important;
}

:deep(.leaflet-popup-tip) {
  background: rgba(10, 25, 60, 0.85) !important;
}

:deep(.leaflet-popup-close-button) {
  display: none !important;
}

@media (max-width: 1400px) {
  .minimap-panel {
    width: 260px;
    right: 15px;
  }

  .leaflet-map-container {
    width: 120px;
    height: 120px;
  }
}

@media (max-width: 1200px) {
  .minimap-panel {
    top: 20px;
    right: 15px;
    bottom: auto;
  }
}

.panel-fold-btn {
  position: absolute;
  z-index: 20;
  background: transparent;
  border: none;
  color: rgba(74, 144, 255, 0.7);
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -2px;
}

.panel-fold-btn:hover {
  color: #4ec8ff;
  transform: scale(1.15);
  text-shadow: 0 0 8px rgba(78, 200, 255, 0.6);
}

.map-fold {
  top: 8px;
  left: 8px;
}
</style>