<template>
  <div class="dm-root">
    <div class="dm-back-zone" @click="goBack">
      <div class="dm-back-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span class="dm-back-label">返回</span>
      </div>
    </div>

    <aside class="dm-sidebar">
      <router-link to="/" class="dm-sidebar-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span>返回大屏</span>
      </router-link>
      <div class="dm-sidebar-title">数据管理</div>
      <nav class="dm-sidebar-nav">
        <button
          class="dm-nav-item"
          :class="{ active: activeTab === 'stations' }"
          @click="activeTab = 'stations'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>监测站数据</span>
        </button>
        <button
          class="dm-nav-item"
          :class="{ active: activeTab === 'vehicles' }"
          @click="activeTab = 'vehicles'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <span>车辆数据</span>
        </button>
      </nav>
    </aside>

    <main class="dm-main">
      <header class="dm-topbar">
        <div class="dm-topbar-left">
          <h1 class="dm-topbar-title">{{ activeTab === 'stations' ? '监测站数据管理' : '车辆数据管理' }}</h1>
        </div>
        <div class="dm-topbar-right">
          <span class="dm-count" v-if="activeTab === 'stations'">共 {{ stations.length }} 个站点</span>
          <span class="dm-count" v-if="activeTab === 'vehicles'">共 {{ vehicles.length }} 辆车</span>
          <button class="dm-add-btn" @click="openForm(null)" v-if="activeTab === 'stations'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新增站点
          </button>
          <button class="dm-add-btn" @click="openVehicleForm(null)" v-if="activeTab === 'vehicles'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新增车辆
          </button>
        </div>
      </header>

      <div class="dm-content" v-if="activeTab === 'stations'">
        <div class="dm-card">
          <table class="dm-table" v-if="stations.length">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>类型</th>
                <th>经度</th>
                <th>纬度</th>
                <th>塔高</th>
                <th>海拔</th>
                <th>状态</th>
                <th>描述</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in stations" :key="s.id">
                <td class="id-cell">{{ s.id }}</td>
                <td class="name-cell">{{ s.name }}</td>
                <td>
                  <span class="dm-tag" :class="s.type === '地灾监测点' ? 'hazard' : 'seismic'">
                    {{ s.type || '强震监测站' }}
                  </span>
                </td>
                <td>{{ s.lng.toFixed(4) }}</td>
                <td>{{ s.lat.toFixed(4) }}</td>
                <td>{{ s.height || '-' }} m</td>
                <td>{{ s.groundElevation || '-' }} m</td>
                <td>
                  <span class="dm-status" :class="s.status === 'offline' ? 'off' : 'on'">
                    {{ s.status === 'offline' ? '离线' : '在线' }}
                  </span>
                </td>
                <td class="desc-cell">{{ s.description || '-' }}</td>
                <td class="action-cell">
                  <button class="dm-action edit" @click="openForm(s)">编辑</button>
                  <button class="dm-action del" @click="confirmDelete(s)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="dm-empty" v-else>
            <div class="dm-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <span class="dm-empty-text">暂无监测站数据</span>
            <button class="dm-add-btn" @click="openForm(null)">新增第一个站点</button>
          </div>
        </div>
      </div>

      <div class="dm-content" v-else>
        <div class="dm-card">
          <table class="dm-table" v-if="vehicles.length">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>类型</th>
                <th>速度</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in vehicles" :key="v.id">
                <td class="id-cell">{{ v.id }}</td>
                <td class="name-cell">{{ v.name }}</td>
                <td>
                  <span class="dm-tag" :class="v.type === '救援车' ? 'rescue' : v.type === '指挥车' ? 'command' : 'transport'">
                    {{ v.type || '运输车' }}
                  </span>
                </td>
                <td>{{ v.speed ?? '-' }} km/h</td>
                <td>
                  <span class="dm-status" :class="v.status === '行驶中' ? 'on' : v.status === '到达' ? 'arrived' : 'off'">
                    {{ v.status || '待命' }}
                  </span>
                </td>
                <td class="action-cell">
                  <button class="dm-action edit" @click="openVehicleForm(v)">编辑</button>
                  <button class="dm-action del" @click="confirmDeleteVehicle(v)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="dm-empty" v-else>
            <div class="dm-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <span class="dm-empty-text">暂无车辆数据</span>
            <button class="dm-add-btn" @click="openVehicleForm(null)">新增第一辆车</button>
          </div>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div class="dm-overlay" v-if="formVisible" @click.self="closeForm">
        <div class="dm-modal">
          <div class="dm-modal-header">
            <h3>{{ editingId ? '编辑站点' : '新增站点' }}</h3>
            <button class="dm-modal-close" @click="closeForm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="dm-modal-body">
            <div class="dm-form-row">
              <label class="dm-field">
                <span>站点名称 *</span>
                <input v-model="form.name" placeholder="如：强震监测站-01" />
              </label>
              <label class="dm-field">
                <span>站点类型</span>
                <select v-model="form.type">
                  <option value="强震监测站">强震监测站</option>
                  <option value="地灾监测点">地灾监测点</option>
                </select>
              </label>
            </div>
            <div class="dm-form-row">
              <label class="dm-field">
                <span>经度 *</span>
                <input type="number" v-model.number="form.lng" step="0.0001" placeholder="104.0780" />
              </label>
              <label class="dm-field">
                <span>纬度 *</span>
                <input type="number" v-model.number="form.lat" step="0.0001" placeholder="31.5750" />
              </label>
              <label class="dm-field small">
                <span>塔高(m)</span>
                <input type="number" v-model.number="form.height" step="1" placeholder="55" />
              </label>
              <label class="dm-field small">
                <span>海拔(m)</span>
                <input type="number" v-model.number="form.groundElevation" step="1" placeholder="自动" />
              </label>
              <label class="dm-field small">
                <span>状态</span>
                <select v-model="form.status">
                  <option value="online">在线</option>
                  <option value="offline">离线</option>
                </select>
              </label>
            </div>
            <div class="dm-form-row">
              <label class="dm-field full">
                <span>描述</span>
                <textarea v-model="form.description" rows="2" placeholder="选填"></textarea>
              </label>
            </div>
          </div>
          <div class="dm-modal-footer">
            <button class="dm-btn cancel" @click="closeForm">取消</button>
            <button class="dm-btn primary" @click="saveStation">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div class="dm-overlay" v-if="vehicleFormVisible" @click.self="closeVehicleForm">
        <div class="dm-modal">
          <div class="dm-modal-header">
            <h3>{{ editingVehicleId ? '编辑车辆' : '新增车辆' }}</h3>
            <button class="dm-modal-close" @click="closeVehicleForm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="dm-modal-body">
            <div class="dm-form-row">
              <label class="dm-field">
                <span>车辆名称 *</span>
                <input v-model="vehicleForm.name" placeholder="如：救援车-01" />
              </label>
              <label class="dm-field">
                <span>车辆类型</span>
                <select v-model="vehicleForm.type">
                  <option value="救援车">救援车</option>
                  <option value="运输车">运输车</option>
                  <option value="指挥车">指挥车</option>
                </select>
              </label>
            </div>
            <div class="dm-form-row">
              <label class="dm-field">
                <span>经度 *</span>
                <input type="number" v-model.number="vehicleForm.lng" step="0.0001" placeholder="104.0780" />
              </label>
              <label class="dm-field">
                <span>纬度 *</span>
                <input type="number" v-model.number="vehicleForm.lat" step="0.0001" placeholder="31.5750" />
              </label>
              <label class="dm-field small">
                <span>速度(km/h)</span>
                <input type="number" v-model.number="vehicleForm.speed" step="1" placeholder="60" />
              </label>
              <label class="dm-field small">
                <span>状态</span>
                <select v-model="vehicleForm.status">
                  <option value="待命">待命</option>
                  <option value="行驶中">行驶中</option>
                  <option value="到达">到达</option>
                </select>
              </label>
            </div>
            <div class="dm-form-row">
              <label class="dm-field">
                <span>驾驶员</span>
                <input v-model="vehicleForm.driver" placeholder="选填" />
              </label>
              <label class="dm-field">
                <span>车牌号</span>
                <input v-model="vehicleForm.plateNumber" placeholder="选填" />
              </label>
              <label class="dm-field small">
                <span>载重/人数</span>
                <input v-model="vehicleForm.capacity" placeholder="选填" />
              </label>
            </div>
            <div class="dm-form-row">
              <label class="dm-field full">
                <span>行驶路径 (JSON)</span>
                <textarea v-model="vehicleForm.path" rows="3" placeholder='[[31.57, 104.07], [31.58, 104.08]]'></textarea>
              </label>
            </div>
            <div class="dm-form-row">
              <label class="dm-field full">
                <span>备注</span>
                <textarea v-model="vehicleForm.description" rows="2" placeholder="选填"></textarea>
              </label>
            </div>
          </div>
          <div class="dm-modal-footer">
            <button class="dm-btn cancel" @click="closeVehicleForm">取消</button>
            <button class="dm-btn primary" @click="saveVehicle">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="dm-toast" v-if="toast.visible" :class="toast.type">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const activeTab = ref('stations')
const stations = ref([])
const vehicles = ref([])
const formVisible = ref(false)
const editingId = ref(null)
const vehicleFormVisible = ref(false)
const editingVehicleId = ref(null)

const BACKEND = import.meta.env.VITE_BACKEND || 'http://localhost:8080'

const form = reactive({
  name: '',
  type: '强震监测站',
  lng: null,
  lat: null,
  height: null,
  status: 'online',
  description: '',
})

const toast = reactive({ visible: false, message: '', type: 'success' })

const vehicleForm = reactive({
  name: '',
  type: '救援车',
  lng: null,
  lat: null,
  speed: null,
  status: '待命',
  path: '',
  driver: '',
  capacity: '',
  plateNumber: '',
  description: '',
})

function showToast(msg, type = 'success') {
  toast.message = msg
  toast.type = type
  toast.visible = true
  setTimeout(() => { toast.visible = false }, 2500)
}

function goBack() {
  router.push('/')
}

async function loadStations() {
  try {
    const res = await fetch(`${BACKEND}/api/stations`)
    stations.value = await res.json()
  } catch {
    showToast('无法连接后端，请确认服务已启动', 'error')
  }
}

function openForm(station) {
  if (station) {
    editingId.value = station.id
    Object.assign(form, {
      name: station.name,
      type: station.type || '强震监测站',
      lng: station.lng,
      lat: station.lat,
      height: station.height,
      groundElevation: station.groundElevation,
      status: station.status || 'online',
      description: station.description || '',
    })
  } else {
    editingId.value = null
    Object.assign(form, {
      name: '',
      type: '强震监测站',
      lng: null,
      lat: null,
      height: null,
      groundElevation: null,
      status: 'online',
      description: '',
    })
  }
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
  editingId.value = null
}

async function saveStation() {
  if (!form.name || form.lng == null || form.lat == null) {
    showToast('请填写名称、经度和纬度', 'error')
    return
  }
  const payload = {
    name: form.name,
    type: form.type,
    lng: form.lng,
    lat: form.lat,
    height: form.height,
    groundElevation: form.groundElevation,
    status: form.status,
    description: form.description,
  }
  try {
    if (editingId.value) {
      await fetch(`${BACKEND}/api/stations/${editingId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showToast('站点已更新')
    } else {
      await fetch(`${BACKEND}/api/stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showToast('站点已新增')
    }
    closeForm()
    await loadStations()
  } catch {
    showToast('操作失败，请检查网络', 'error')
  }
}

async function confirmDelete(station) {
  if (!confirm(`确定删除「${station.name}」吗？此操作不可恢复。`)) return
  try {
    await fetch(`${BACKEND}/api/stations/${station.id}`, { method: 'DELETE' })
    showToast('站点已删除')
    await loadStations()
  } catch {
    showToast('删除失败，请检查网络', 'error')
  }
}

async function loadVehicles() {
  try {
    const res = await fetch(`${BACKEND}/api/vehicles`)
    vehicles.value = await res.json()
  } catch {
    showToast('无法获取车辆数据', 'error')
  }
}

function openVehicleForm(vehicle) {
  if (vehicle) {
    editingVehicleId.value = vehicle.id
    Object.assign(vehicleForm, {
      name: vehicle.name,
      type: vehicle.type || '救援车',
      lng: vehicle.lng,
      lat: vehicle.lat,
      speed: vehicle.speed,
      status: vehicle.status || '待命',
      path: vehicle.path || '',
      driver: vehicle.driver || '',
      capacity: vehicle.capacity || '',
      plateNumber: vehicle.plateNumber || '',
      description: vehicle.description || '',
    })
  } else {
    editingVehicleId.value = null
    Object.assign(vehicleForm, {
      name: '',
      type: '救援车',
      lng: null,
      lat: null,
      speed: null,
      status: '待命',
      path: '',
      driver: '',
      capacity: '',
      plateNumber: '',
      description: '',
    })
  }
  vehicleFormVisible.value = true
}

function closeVehicleForm() {
  vehicleFormVisible.value = false
  editingVehicleId.value = null
}

async function saveVehicle() {
  if (!vehicleForm.name || vehicleForm.lng == null || vehicleForm.lat == null) {
    showToast('请填写名称、经度和纬度', 'error')
    return
  }
  const payload = {
    name: vehicleForm.name,
    type: vehicleForm.type,
    lng: vehicleForm.lng,
    lat: vehicleForm.lat,
    speed: vehicleForm.speed,
    status: vehicleForm.status,
    path: vehicleForm.path,
    driver: vehicleForm.driver,
    capacity: vehicleForm.capacity,
    plateNumber: vehicleForm.plateNumber,
    description: vehicleForm.description,
  }
  try {
    if (editingVehicleId.value) {
      await fetch(`${BACKEND}/api/vehicles/${editingVehicleId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showToast('车辆已更新')
    } else {
      await fetch(`${BACKEND}/api/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showToast('车辆已新增')
    }
    closeVehicleForm()
    await loadVehicles()
  } catch {
    showToast('操作失败，请检查网络', 'error')
  }
}

async function confirmDeleteVehicle(vehicle) {
  if (!confirm(`确定删除「${vehicle.name}」吗？`)) return
  try {
    await fetch(`${BACKEND}/api/vehicles/${vehicle.id}`, { method: 'DELETE' })
    showToast('车辆已删除')
    await loadVehicles()
  } catch {
    showToast('删除失败', 'error')
  }
}

onMounted(() => {
  loadStations()
  loadVehicles()
})
</script>

<style scoped>
.dm-root {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #1e293b;
}

.dm-back-zone {
  position: fixed;
  left: 0;
  top: 0;
  width: 48px;
  height: 100vh;
  z-index: 9999;
  cursor: pointer;
}

.dm-back-btn {
  position: absolute;
  left: -46px;
  top: 50%;
  transform: translateY(-50%);
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #475569;
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  white-space: nowrap;
}

.dm-back-label {
  font-size: 13px;
  font-weight: 500;
  opacity: 0;
  transition: opacity 0.2s;
}

.dm-back-zone:hover .dm-back-btn {
  left: 8px;
  width: 80px;
  border-radius: 23px;
}

.dm-back-zone:hover .dm-back-label {
  opacity: 1;
}

.dm-back-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  color: #22c55e;
}

.dm-sidebar {
  width: 220px;
  min-width: 220px;
  background: #ffffff;
  border-right: 1px solid #e8ecf1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.dm-sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 20px 16px;
  font-size: 14px;
  color: #22c55e;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s;
  text-decoration: none;
}

.dm-sidebar-logo:hover {
  color: #16a34a;
  background: #f8fafc;
}

.dm-sidebar-title {
  padding: 0 20px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #94a3b8;
}

.dm-sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 0 12px;
  gap: 2px;
}

.dm-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}

.dm-nav-item:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.dm-nav-item.active {
  background: #eaf7ee;
  color: #22c55e;
  font-weight: 500;
}

.dm-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dm-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e8ecf1;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  flex-shrink: 0;
}

.dm-topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dm-topbar-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  transition: all 0.2s;
  background: #f8fafc;
}

.dm-topbar-back:hover {
  background: #eaf7ee;
  color: #22c55e;
}

.dm-topbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.dm-topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dm-count {
  font-size: 13px;
  color: #94a3b8;
}

.dm-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: #22c55e;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.dm-add-btn:hover {
  background: #16a34a;
  box-shadow: 0 2px 8px rgba(34,197,94,0.25);
}

.dm-content {
  flex: 1;
  padding: 24px 32px;
  overflow: auto;
}

.dm-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  border: 1px solid #e8ecf1;
  overflow: hidden;
}

.dm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.dm-table th {
  padding: 14px 18px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #fafbfc;
  border-bottom: 1px solid #e8ecf1;
  white-space: nowrap;
}

.dm-table td {
  padding: 14px 18px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}

.dm-table tbody tr { transition: background 0.15s; }
.dm-table tbody tr:hover { background: #f8fafc; }

.id-cell {
  color: #94a3b8;
  font-size: 13px;
}

.name-cell {
  font-weight: 500;
  color: #1e293b;
}

.desc-cell {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #94a3b8;
}

.dm-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.dm-tag.seismic {
  background: #eef2ff;
  color: #6366f1;
}

.dm-tag.hazard {
  background: #fef3c7;
  color: #d97706;
}

.dm-tag.rescue {
  background: #fee2e2;
  color: #dc2626;
}

.dm-tag.command {
  background: #ede9fe;
  color: #7c3aed;
}

.dm-tag.transport {
  background: #dbeafe;
  color: #2563eb;
}

.dm-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.dm-status::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dm-status.on {
  color: #16a34a;
}

.dm-status.on::before {
  background: #22c55e;
}

.dm-status.off {
  color: #dc2626;
}

.dm-status.off::before {
  background: #ef4444;
}

.dm-status.arrived {
  color: #0891b2;
}

.dm-status.arrived::before {
  background: #06b6d4;
}

.action-cell {
  white-space: nowrap;
}

.dm-action {
  padding: 5px 14px;
  margin-right: 6px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  font-weight: 500;
}

.dm-action.edit {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #bfdbfe;
}

.dm-action.edit:hover {
  background: #dbeafe;
}

.dm-action.del {
  background: #fef2f2;
  color: #ef4444;
  border-color: #fecaca;
}

.dm-action.del:hover {
  background: #fee2e2;
}

.dm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
  color: #94a3b8;
  font-size: 14px;
}

.dm-empty-icon {
  margin-bottom: 4px;
}

.dm-empty-text {
  font-size: 14px;
  color: #94a3b8;
}

.dm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.dm-modal {
  background: #fff;
  border-radius: 16px;
  width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.15);
}

.dm-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 28px;
  border-bottom: 1px solid #e8ecf1;
}

.dm-modal-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
}

.dm-modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 50%;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.dm-modal-close:hover {
  background: #fee2e2;
  color: #ef4444;
}

.dm-modal-body {
  padding: 28px;
}

.dm-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 28px;
  border-top: 1px solid #e8ecf1;
}

.dm-form-row {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
}

.dm-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.dm-field.small {
  flex: 0.55;
}

.dm-field.full {
  flex: 1;
}

.dm-field span {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.dm-field input,
.dm-field select,
.dm-field textarea {
  padding: 10px 13px;
  border: 1px solid #d1dbe6;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
  background: #fff;
  transition: all 0.2s;
  font-family: inherit;
}

.dm-field input:focus,
.dm-field select:focus,
.dm-field textarea:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

.dm-btn {
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  font-weight: 500;
  transition: all 0.2s;
}

.dm-btn.cancel {
  background: #f1f5f9;
  color: #64748b;
}

.dm-btn.cancel:hover {
  background: #e2e8f0;
}

.dm-btn.primary {
  background: #22c55e;
  color: #fff;
}

.dm-btn.primary:hover {
  background: #16a34a;
}

.dm-toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 28px;
  border-radius: 10px;
  font-size: 14px;
  z-index: 99999;
  font-weight: 500;
}

.dm-toast.success {
  background: #22c55e;
  color: #fff;
}

.dm-toast.error {
  background: #ef4444;
  color: #fff;
}
</style>