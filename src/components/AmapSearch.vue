<template>
  <div class="amap-search" :class="{ expanded: expanded }">
    <div class="amap-search-wrap" @click="expand">
      <svg class="amap-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref="inputRef"
        v-model="keyword"
        type="text"
        placeholder="搜索地点..."
        @input="onInput"
        @keydown.enter.prevent="onEnter"
        @focus="focused = true"
        @blur="onBlur"
      />
      <span v-if="keyword && expanded" class="amap-search-clear" @mousedown.prevent="clear">✕</span>
    </div>
    <div class="amap-results" v-if="results.length && focused && expanded">
      <div
        v-for="(r, i) in results"
        :key="i"
        class="amap-result-item"
        :class="{ active: i === activeIndex }"
        @mousedown.prevent="select(r)"
      >
        <span class="amap-ri-name">{{ r.name }}</span>
        <span class="amap-ri-addr">{{ r.district }}{{ r.address }}</span>
        <span class="amap-ri-coord" v-if="r.wgsLat != null">{{ r.wgsLat.toFixed(4) }}, {{ r.wgsLng.toFixed(4) }}</span>
        <span class="amap-ri-hint" v-else>点击搜索</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import * as Cesium from 'cesium'
import { gcj02ToWGS84 } from '../utils/geo.js'

const props = defineProps({
  viewer: { type: Object, default: null },
})

const emit = defineEmits(['fly-to'])

const keyword = ref('')
const results = ref([])
const focused = ref(false)
const expanded = ref(false)
const inputRef = ref(null)
const activeIndex = ref(-1)
let timer = null

function expand() {
  if (!expanded.value) {
    expanded.value = true
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
}

function onBlur() {
  setTimeout(() => {
    focused.value = false
    if (!keyword.value.trim()) {
      expanded.value = false
      results.value = []
    }
  }, 150)
}

function onInput() {
  clearTimeout(timer)
  activeIndex.value = -1
  if (!keyword.value.trim()) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    try {
      const key = import.meta.env.VITE_AMAP_KEY
      if (!key) { results.value = []; return }
      const res = await fetch(
        `https://restapi.amap.com/v3/assistant/inputtips?key=${key}&keywords=${encodeURIComponent(keyword.value.trim())}&city=&citylimit=false`
      )
      const data = await res.json()
      if (data.status === '1' && data.tips) {
        results.value = data.tips.slice(0, 6).map(t => {
          if (typeof t.location === 'string' && t.location !== '0,0') {
            const [lng, lat] = t.location.split(',').map(Number)
            const wgs = gcj02ToWGS84(lat, lng)
            return { ...t, wgsLat: wgs.lat, wgsLng: wgs.lng }
          }
          return { ...t, wgsLat: null, wgsLng: null }
        })
      } else {
        results.value = []
      }
    } catch (e) {
      console.error('高德 inputtips 请求失败:', e)
      results.value = []
    }
  }, 300)
}

function select(r) {
  if (r.wgsLat == null || r.wgsLng == null) {
    keyword.value = r.name
    searchAndFly(r.name)
    return
  }
  fly(r.wgsLng, r.wgsLat, 3000)
  keyword.value = r.name
  results.value = []
  focused.value = false
}

function onEnter() {
  if (results.value.length) {
    select(results.value[0])
  } else {
    searchAndFly(keyword.value.trim())
  }
}

async function searchAndFly(kw) {
  if (!kw) return
  const key = import.meta.env.VITE_AMAP_KEY
  if (!key) return
  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/place/text?key=${key}&keywords=${encodeURIComponent(kw)}&city=&citylimit=false&offset=1`
    )
    const data = await res.json()
    if (data.status === '1' && data.pois && data.pois.length) {
      const p = data.pois[0]
      const [lng, lat] = p.location.split(',').map(Number)
      const wgs = gcj02ToWGS84(lat, lng)
      fly(wgs.lng, wgs.lat, 3000)
      keyword.value = p.name
      results.value = []
      focused.value = false
    }
  } catch (e) {
    console.error('高德 place 请求失败:', e)
  }
}

function fly(lng, lat, height) {
  if (props.viewer) {
    props.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
      duration: 1.5,
    })
  }
  emit('fly-to', { lng, lat, height })
}

function clear() {
  keyword.value = ''
  results.value = []
  activeIndex.value = -1
}
</script>

<style scoped>
.amap-search {
  position: absolute;
  top: 16px;
  right: 16px;
  left: auto;
  transform: none;
  z-index: 80;
  pointer-events: auto;
}

.amap-search-wrap {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 0;
  height: 40px;
  width: 40px;
  transition: width 0.25s, border-color 0.2s, padding 0.25s, background 0.25s;
  cursor: pointer;
  overflow: hidden;
}

.amap-search.expanded .amap-search-wrap {
  width: 320px;
  padding: 0 12px;
  border-radius: 10px;
  cursor: default;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
}

.amap-search-wrap:focus-within {
  border-color: rgba(59, 130, 246, 0.6);
}

.amap-search-icon {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
  margin: 0 auto;
  transition: margin 0.25s;
}

.amap-search.expanded .amap-search-icon {
  margin: 0 8px 0 0;
}

.amap-search-wrap input {
  width: 0;
  flex: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #e2e8f0;
  font-size: 14px;
  min-width: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.amap-search.expanded .amap-search-wrap input {
  width: auto;
  flex: 1;
  opacity: 1;
}

.amap-search-wrap input::placeholder {
  color: #64748b;
}

.amap-search-clear {
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
  padding: 4px;
  flex-shrink: 0;
}

.amap-search-clear:hover {
  color: #e2e8f0;
}

.amap-results {
  margin-top: 4px;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  overflow: hidden;
  max-height: 260px;
  overflow-y: auto;
  width: 320px;
}

.amap-result-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid rgba(148, 163, 184, 0.06);
  transition: background 0.15s;
}

.amap-result-item:last-child {
  border-bottom: none;
}

.amap-result-item:hover,
.amap-result-item.active {
  background: rgba(59, 130, 246, 0.15);
}

.amap-ri-name {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
}

.amap-ri-addr {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amap-ri-coord {
  color: #4b9cd3;
  font-size: 11px;
  font-family: 'Consolas', monospace;
}

.amap-ri-hint {
  color: #94a3b8;
  font-size: 11px;
  font-style: italic;
}
</style>