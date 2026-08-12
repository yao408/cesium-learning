<template>
  <div class="mvp-overlay" @click.self="$emit('close')">
    <div class="mvp-modal">
      <div class="mvp-header">
        <h3>多车模拟调度</h3>
        <button class="mvp-close" @click="$emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="mvp-epicenter-bar">
        <span class="mvp-epi-label">震中</span>
        <span class="mvp-epi-name">{{ epicenter.place }}</span>
        <span class="mvp-epi-coord">{{ epicenter.lat?.toFixed(4) }}, {{ epicenter.lon?.toFixed(4) }}</span>
      </div>

      <div class="mvp-toolbar">
        <button class="mvp-btn mvp-btn-outline" @click="searchCities" :disabled="searching">
          {{ searching ? '搜索中...' : '搜索附近城市' }}
        </button>
        <button class="mvp-btn mvp-btn-outline" @click="addCustomRow">
          + 手动添加起点
        </button>
        <span class="mvp-count" v-if="vehicleRows.length">共 {{ vehicleRows.length }} 辆车</span>
        <span class="mvp-error" v-if="error">{{ error }}</span>
      </div>

      <div class="mvp-table-wrap">
        <table class="mvp-table" v-if="vehicleRows.length">
          <thead>
            <tr>
              <th style="width:32px">#</th>
              <th style="width:130px">车辆名称</th>
              <th style="width:80px">类型</th>
              <th>起点</th>
              <th style="width:80px">速度</th>
              <th style="width:100px">路线</th>
              <th style="width:40px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in vehicleRows" :key="i" :class="{ 'mvp-row-custom': row._custom }">
              <td class="mvp-td-idx">{{ i + 1 }}</td>
              <td>
                <input v-model="row._vehicleName" type="text" class="mvp-input" placeholder="救援车" />
              </td>
              <td>
                <select v-model="row._vehicleType" class="mvp-select">
                  <option value="救援车">救援车</option>
                  <option value="运输车">运输车</option>
                  <option value="指挥车">指挥车</option>
                  <option value="消防车">消防车</option>
                  <option value="救护车">救护车</option>
                </select>
              </td>
              <td>
                <div class="mvp-start-cell">
                  <template v-if="row._custom">
                    <input v-model.number="row._customLon" type="number" step="0.0001" class="mvp-input mvp-input-sm" placeholder="经度" />
                    <input v-model.number="row._customLat" type="number" step="0.0001" class="mvp-input mvp-input-sm" placeholder="纬度" />
                  </template>
                  <template v-else>
                    <span class="mvp-city-name">{{ row.name }}</span>
                    <span class="mvp-city-dist">{{ row.district }}</span>
                  </template>
                </div>
              </td>
              <td>
                <div class="mvp-speed-cell">
                  <input v-model.number="row._speed" type="number" min="20" max="200" step="10" class="mvp-input mvp-input-xs" />
                  <span class="mvp-unit">km/h</span>
                </div>
              </td>
              <td>
                <div class="mvp-route-cell">
                  <template v-if="row._routeLoading">获取中...</template>
                  <template v-else-if="row._route">
                    <span class="mvp-route-ok">{{ (row._route.distance / 1000).toFixed(0) }}km</span>
                    <span class="mvp-route-time">{{ Math.round(row._route.duration / 60) }}min</span>
                  </template>
                  <template v-else-if="row._routeError">
                    <span class="mvp-route-err">失败</span>
                  </template>
                  <button class="mvp-btn-link" @click="getRouteForRow(i)" :disabled="row._routeLoading">
                    {{ row._route ? '刷新' : '获取' }}
                  </button>
                </div>
              </td>
              <td>
                <button class="mvp-btn-del" @click="removeRow(i)" title="移除">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="mvp-empty" v-else-if="!searching">
          <span>点击"搜索附近城市"获取周边城市作为起点，或手动添加起点</span>
        </div>
      </div>

      <div class="mvp-footer" v-if="vehicleRows.length">
        <button class="mvp-btn mvp-btn-primary" @click="createFleet" :disabled="creating">
          {{ creating ? '创建中...' : '创建救援车队' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useScenarioStore } from '../../stores/scenarioStore.js'
import { useMultiVehicleSimulation } from '../../composables/useMultiVehicleSimulation.js'

const emit = defineEmits(['close', 'create-fleet'])

const store = useScenarioStore()
const { searchNearbyCities, pickSurroundingCities, getDrivingRoute } = useMultiVehicleSimulation()

const searching = ref(false)
const creating = ref(false)
const error = ref('')
const vehicleRows = ref([])

const COLORS = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6']

const epicenter = computed(() => {
  const eq = store.selectedEarthquake
  if (eq) {
    return {
      ...eq,
      place: eq.place || `${eq.lat?.toFixed(4)}, ${eq.lon?.toFixed(4)}`,
    }
  }
  return { lon: 104.0694, lat: 31.5685, place: '四川省德阳市绵竹市清平镇' }
})

function getRowRoute(row) {
  const from = row._custom
    ? { lon: row._customLon, lat: row._customLat }
    : { lon: row.lon, lat: row.lat }
  return getDrivingRoute(from, { lon: epicenter.value.lon, lat: epicenter.value.lat })
}

async function getRouteForRow(idx) {
  const row = vehicleRows.value[idx]
  if (!row) return
  row._routeLoading = true
  row._routeError = false
  try {
    const route = await getRowRoute(row)
    row._route = route || null
    if (!route) row._routeError = true
  } catch {
    row._routeError = true
  } finally {
    row._routeLoading = false
  }
}

async function searchCities() {
  searching.value = true
  error.value = ''

  try {
    const cities = await searchNearbyCities(epicenter.value)
    if (!cities.length) {
      error.value = '未找到附近城市'
      return
    }
    const picked = pickSurroundingCities(cities, epicenter.value, 3)
    const newRows = picked.map((c, i) => ({
      ...c,
      _vehicleName: `救援车 ${i + 1}`,
      _vehicleType: '救援车',
      _color: COLORS[i % COLORS.length],
      _speed: 80,
      _custom: false,
      _route: null,
      _routeLoading: false,
      _routeError: false,
    }))
    vehicleRows.value = newRows

    for (let i = 0; i < vehicleRows.value.length; i++) {
      getRouteForRow(i)
    }
  } catch (e) {
    error.value = '搜索失败: ' + (e.message || '未知错误')
  } finally {
    searching.value = false
  }
}

function addCustomRow() {
  vehicleRows.value.push({
    _vehicleName: `自定义车辆 ${vehicleRows.value.length + 1}`,
    _vehicleType: '救援车',
    _color: COLORS[vehicleRows.value.length % COLORS.length],
    _speed: 80,
    _custom: true,
    _customLon: epicenter.value.lon + (Math.random() - 0.5) * 0.2,
    _customLat: epicenter.value.lat + (Math.random() - 0.5) * 0.2,
    name: '',
    district: '',
    _route: null,
    _routeLoading: false,
    _routeError: false,
  })
}

function removeRow(idx) {
  vehicleRows.value.splice(idx, 1)
}

async function createFleet() {
  creating.value = true
  const vehiclePaths = []

  for (let i = 0; i < vehicleRows.value.length; i++) {
    const row = vehicleRows.value[i]

    if (!row._route) {
      await getRouteForRow(i)
    }

    const from = row._custom
      ? { lat: row._customLat, lon: row._customLon }
      : { lat: row.lat, lon: row.lon }

    if (row._route) {
      vehiclePaths.push({
        name: row._vehicleName || (row._custom ? `自定义-${i + 1}` : row.name),
        type: row._vehicleType,
        city: row._custom ? '自定义起点' : row.name,
        district: row._custom ? '' : (row.district || ''),
        color: row._color,
        speed: row._speed,
        from,
        to: { lat: epicenter.value.lat, lon: epicenter.value.lon },
        path: row._route.points,
        distance: row._route.distance,
        duration: row._route.duration,
      })
    }
  }

  if (!vehiclePaths.length) {
    error.value = '请先获取路线'
    creating.value = false
    return
  }

  emit('create-fleet', vehiclePaths)
  creating.value = false
}

onMounted(() => {
  searchCities()
})
</script>

<style scoped>
.mvp-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: auto;
}

.mvp-modal {
  width: 720px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.mvp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  flex-shrink: 0;
}

.mvp-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
}

.mvp-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}

.mvp-close:hover {
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.4);
}

.mvp-epicenter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(239, 68, 68, 0.06);
  border-bottom: 1px solid rgba(239, 68, 68, 0.1);
  flex-shrink: 0;
}

.mvp-epi-label {
  font-size: 11px;
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 500;
}

.mvp-epi-name {
  font-size: 13px;
  color: #fca5a5;
  font-weight: 500;
}

.mvp-epi-coord {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
  margin-left: auto;
}

.mvp-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  flex-shrink: 0;
}

.mvp-count {
  font-size: 12px;
  color: #94a3b8;
  margin-left: auto;
}

.mvp-error {
  color: #f87171;
  font-size: 12px;
}

.mvp-table-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
}

.mvp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.mvp-table th {
  text-align: left;
  padding: 8px 6px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  position: sticky;
  top: 0;
  background: rgba(15, 23, 42, 0.95);
  z-index: 1;
}

.mvp-table td {
  padding: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.06);
  vertical-align: middle;
}

.mvp-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.mvp-row-custom {
  background: rgba(59, 130, 246, 0.04);
}

.mvp-row-custom:hover {
  background: rgba(59, 130, 246, 0.08) !important;
}

.mvp-td-idx {
  color: #64748b;
  font-size: 12px;
  text-align: center;
}

.mvp-input {
  width: 100%;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.mvp-input:focus {
  border-color: rgba(59, 130, 246, 0.5);
}

.mvp-input-sm {
  width: 80px;
  font-size: 12px;
}

.mvp-input-xs {
  width: 52px;
  font-size: 12px;
  text-align: center;
}

.mvp-select {
  width: 100%;
  padding: 5px 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.mvp-select:focus {
  border-color: rgba(59, 130, 246, 0.5);
}

.mvp-select option {
  background: #1e293b;
  color: #e2e8f0;
}

.mvp-start-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}

.mvp-city-name {
  color: #e2e8f0;
  font-size: 13px;
}

.mvp-city-dist {
  color: #64748b;
  font-size: 11px;
  margin-left: 6px;
}

.mvp-speed-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mvp-unit {
  font-size: 11px;
  color: #64748b;
}

.mvp-route-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.mvp-route-ok {
  color: #4ade80;
  font-weight: 500;
}

.mvp-route-time {
  color: #64748b;
}

.mvp-route-err {
  color: #f87171;
}

.mvp-btn {
  padding: 6px 14px;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.mvp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mvp-btn-outline {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #94a3b8;
}

.mvp-btn-outline:hover:not(:disabled) {
  border-color: rgba(148, 163, 184, 0.5);
  color: #e2e8f0;
}

.mvp-btn-primary {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #60a5fa;
  font-size: 14px;
  padding: 10px 24px;
  width: 100%;
}

.mvp-btn-primary:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.25);
}

.mvp-btn-link {
  background: none;
  border: none;
  color: #60a5fa;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.mvp-btn-link:hover {
  color: #93c5fd;
}

.mvp-btn-del {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.mvp-btn-del:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.mvp-empty {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  font-size: 13px;
}

.mvp-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  flex-shrink: 0;
}
</style>