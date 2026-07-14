<template>
  <aside class="sidebar left-sidebar" :class="{ collapsed }">
    <div class="panel-header">
      <h3>🚑 应急物资调度</h3>
    </div>
    <div v-show="!collapsed" class="panel-body">
    <div class="panel">
      <h3>🗺️ 底图切换</h3>
      <div class="btn-group">
        <button :class="{ active: activeLayer === 'amap' }" @click="$emit('switchBaseLayer', 'amap')">街道</button>
        <button :class="{ active: activeLayer === 'satellite' }" @click="$emit('switchBaseLayer', 'satellite')">卫星</button>
      </div>
    </div>

    <div class="panel">
      <h3>🚗 车队管理</h3>
      <div class="vehicle-list">
        <div
          v-for="slot in vehicleSlots"
          :key="slot.id"
          :class="['vehicle-slot', { active: slot.id === activeSlotId }]"
          @click="$emit('switchVehicle', slot.id)"
        >
          <span class="vehicle-dot" :style="{ background: slot.color }"></span>
          <span class="vehicle-name">{{ slot.name }}</span>
          <span class="vehicle-path-count" v-if="slot.path.length">({{ slot.path.length }}点)</span>
          <button
            v-if="vehicleSlots.length > 1"
            @click.stop="$emit('removeVehicle', slot.id)"
            class="btn-remove-vehicle"
          >×</button>
        </div>
        <button @click="$emit('addVehicle')" class="btn btn-sm">+ 添加车辆</button>
      </div>
    </div>

    <div class="panel">
      <h3>🚗 路径规划</h3>
      <div class="layer-btns">
        <button v-if="!routeMode" @click="$emit('startRoutePlanning')" class="btn btn-sm btn-primary">
          🛣️ 智能选路
        </button>
        <button v-if="routeMode" @click="$emit('cancelRoutePlanning')" class="btn btn-sm btn-danger">
          ❌ 取消
        </button>
        <button @click="$emit('clearUserPath')" class="btn btn-sm btn-danger" :disabled="!userPath.length">
          🗑️ 清除
        </button>
      </div>
      <div v-if="routeMode && !routeStart" class="drawing-hint">🟢 点击地图设置起点</div>
      <div v-if="routeMode && routeStart && !routeEnd" class="drawing-hint">🔴 点击地图设置终点</div>
      <div v-if="routeMode && routeOptions.length > 0" class="route-list">
        <div class="route-label">找到 {{ routeOptions.length }} 条路线：</div>
        <div
          v-for="(r, i) in routeOptions"
          :key="i"
          :class="['route-item', { active: selectedRoute === i }]"
          @click="$emit('selectRoute', i)"
        >
          🛣️ 路线{{ i + 1 }} | {{ (r.distance / 1000).toFixed(1) }}km | {{ (r.duration / 60).toFixed(0) }}分钟
        </div>
        <button @click="$emit('confirmRoute')" class="btn btn-sm btn-primary" style="margin-top: 6px; width: 100%">
          ✅ 确认此路线
        </button>
      </div>
      <div v-if="userPath.length" class="sub-controls">
        <div class="path-info">路径点: {{ userPath.length }} 个</div>
        <div class="path-style-box">
          <div class="path-style-title">🎨 路径样式</div>
          <label>颜色: <input type="color" :value="activeSlot ? activeSlot.color : '#38bdf8'" @input="$emit('updatePathColor', $event.target.value)" class="color-picker"></label>
          <label>线宽: {{ activeSlot ? activeSlot.pathWidth : 8 }}px
            <input type="range" :value="activeSlot ? activeSlot.pathWidth : 8" min="1" max="20" @input="$emit('updatePathWidth', Number($event.target.value))">
          </label>
          <label>透明度: {{ ((activeSlot ? activeSlot.pathOpacity : 0.4) * 100).toFixed(0) }}%
            <input type="range" :value="activeSlot ? activeSlot.pathOpacity : 0.4" min="0.1" max="1" step="0.05" @input="$emit('updatePathOpacity', Number($event.target.value))">
          </label>
        </div>
        <button
          v-if="isSimulating"
          @click="$emit('pauseSimulation')"
          class="btn btn-primary"
        >⏸ 暂停</button>
        <button
          v-if="isSimulating && activeSlot && activeSlot.path.length >= 2 && !activeSlot.positionProperty"
          @click="$emit('startSimulation')"
          class="btn btn-primary"
        >🚗 加入模拟</button>
        <button
          v-if="isPaused"
          @click="$emit('startSimulation')"
          class="btn btn-primary"
        >▶ 继续</button>
        <button
          v-if="!isSimulating && !isPaused"
          @click="$emit('startSimulation')"
          class="btn btn-primary"
        >▶ 启动模拟</button>
        <button
          v-if="isSimulating || isPaused"
          @click="$emit('stopSimulation')"
          class="btn btn-danger"
        >⏹ 停止</button>
        <label>速度: {{ vehicleSpeed }} km/h</label>
        <input type="range" :value="vehicleSpeed" min="10" max="80" step="5" @input="$emit('update:vehicleSpeed', Number($event.target.value))">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: vehicleProgress + '%' }"></div>
        </div>
        <div class="path-info" v-if="currentSegment">{{ currentSegment }}</div>
      </div>
    </div>

  </div>
    <div class="coord-line" v-show="!collapsed">
      <span class="coord-label">WGS84</span>
      <span class="coord-value">{{ mouseLat.toFixed(6) }}, {{ mouseLng.toFixed(6) }}</span>
    </div>
  </aside>
  <button class="collapse-toggle" @click="collapsed = !collapsed" :title="collapsed ? '展开面板' : '收起面板'">
    {{ collapsed ? '▶' : '◀' }}
  </button>
</template>

<script>
export default {
  emits: [
    'switchBaseLayer', 'clearUserPath',
    'startSimulation', 'pauseSimulation', 'stopSimulation', 'update:vehicleSpeed',
    'startRoutePlanning', 'cancelRoutePlanning', 'selectRoute', 'confirmRoute',
    'addVehicle', 'removeVehicle', 'switchVehicle',
    'updatePathColor', 'updatePathWidth', 'updatePathOpacity',
  ],
  computed: {
    activeSlot() {
      return (this.vehicleSlots || []).find(s => s.id === this.activeSlotId) || null
    },
  },
  data() {
    return { collapsed: false }
  },
  props: {
    activeLayer: String,
    routeMode: Boolean,
    routeStart: Object,
    routeEnd: Object,
    routeOptions: Array,
    selectedRoute: Number,
    userPath: Array,
    isSimulating: Boolean,
    isPaused: Boolean,
    vehicleSpeed: Number,
    vehicleProgress: Number,
    currentSegment: String,
    mouseLat: Number,
    mouseLng: Number,
    vehicleSlots: Array,
    activeSlotId: Number,
    vehicleStats: Array,
  },
}
</script>

<style scoped>
.sidebar {
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: 260px;
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
.sidebar.collapsed {
  left: -260px;
  box-shadow: none;
}
.sidebar.collapsed ~ .collapse-toggle {
  left: 12px;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: rgba(45, 138, 78, 0.2); border-radius: 2px; }

.panel-header {
  padding: 12px 14px 8px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
  flex-shrink: 0;
}
.panel-header h3 {
  font-size: 14px;
  color: #2d8a4e;
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.3px;
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
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(45, 138, 78, 0.1);
}
.layer-btns { display: flex; gap: 4px; }
.btn-group {
  display: flex; gap: 4px;
}
.btn-group button {
  flex: 1;
  padding: 6px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border: 1px solid rgba(45, 138, 78, 0.15);
  border-radius: 6px;
  background: rgba(45, 138, 78, 0.06);
  color: #6b5e4a;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.btn-group button:hover {
  background: rgba(245, 158, 11, 0.08);
  color: #3d3929;
  transform: translateY(-1px);
}
.btn-group button.active {
  background: #2d8a4e;
  color: #fff;
  border-color: #2d8a4e;
  box-shadow: 0 2px 12px rgba(45, 138, 78, 0.35);
}
.layer-btns button {
  flex: 1;
  padding: 6px 8px;
  font-size: 12px;
  border: 1px solid rgba(45, 138, 78, 0.15);
  border-radius: 6px;
  background: rgba(45, 138, 78, 0.06);
  color: #6b5e4a;
  cursor: pointer;
  transition: all 0.2s;
}
.layer-btns button:hover { border-color: #f59e0b; color: #3d3929; }
.layer-btns button.active { background: #2d8a4e; color: #fff; border-color: #2d8a4e; }
.btn {
  padding: 6px 14px;
  border: 1px solid rgba(45, 138, 78, 0.2);
  border-radius: 6px;
  background: rgba(45, 138, 78, 0.06);
  color: #3d3929;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  font-weight: 500;
}
.btn:hover { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.btn-primary { background: #2d8a4e; border-color: #2d8a4e; color: #fff; }
.btn-primary:hover { background: #1a6b35; }
.btn-sm { padding: 4px 10px; font-size: 11px; }
.btn-danger { color: #e74c3c; }
.btn-danger:hover { background: #e74c3c; color: #fff; border-color: #e74c3c; }
.toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; padding: 4px 0; color: #5a4e3c; }
.toggle input[type='checkbox'] { accent-color: #2d8a4e; }
.sub-controls {
  margin-top: 8px;
  padding: 8px;
  background: rgba(45, 138, 78, 0.06);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  border: 1px solid rgba(45, 138, 78, 0.08);
}
.sub-controls input[type='range'] { width: 100%; accent-color: #f59e0b; }
.drawing-hint {
  font-size: 12px;
  color: #2d8a4e;
  text-align: center;
  padding: 6px;
  background: rgba(45, 138, 78, 0.08);
  border-radius: 4px;
  margin: 6px 0;
  animation: pulse 1.2s infinite;
}
.path-info { font-size: 12px; color: #2d8a4e; text-align: center; margin-bottom: 4px; font-weight: 600; }
.path-style-box {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 4px;
  border: 1px solid rgba(45, 138, 78, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.path-style-box label { font-size: 11px; color: #6b5e4a; display: flex; align-items: center; gap: 6px; }
.path-style-box input[type='range'] { flex: 1; accent-color: #f59e0b; }
.path-style-box .color-picker { width: 28px; height: 22px; border: 1px solid rgba(45, 138, 78, 0.2); border-radius: 3px; cursor: pointer; background: transparent; padding: 0; }
.path-style-title { font-size: 11px; color: #2d8a4e; font-weight: 600; margin-bottom: 2px; }
.style-toggle { display: flex; gap: 4px; }
.style-toggle button {
  flex: 1;
  padding: 3px 8px;
  font-size: 11px;
  border: 1px solid rgba(45, 138, 78, 0.15);
  border-radius: 4px;
  background: rgba(45, 138, 78, 0.06);
  color: #6b5e4a;
  cursor: pointer;
  transition: all 0.2s;
}
.style-toggle button:hover { border-color: #f59e0b; color: #3d3929; }
.style-toggle button.active { background: #2d8a4e; color: #fff; border-color: #2d8a4e; }
.progress-bar { width: 100%; height: 6px; background: rgba(45, 138, 78, 0.1); border-radius: 3px; overflow: hidden; }
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2d8a4e, #f59e0b);
  border-radius: 3px;
  transition: width 0.1s linear;
}
.alerts { margin-top: 6px; }
.alert-item {
  font-size: 11px;
  color: #e74c3c;
  padding: 3px 6px;
  background: rgba(231, 76, 60, 0.08);
  border-radius: 3px;
  margin-bottom: 3px;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.route-list {
  margin-top: 8px;
  padding: 8px;
  background: rgba(45, 138, 78, 0.06);
  border-radius: 6px;
  border: 1px solid rgba(45, 138, 78, 0.08);
}
.route-label {
  font-size: 12px;
  color: #2d8a4e;
  margin-bottom: 6px;
  font-weight: 600;
}
.route-item {
  padding: 6px 8px;
  font-size: 12px;
  color: #5a4e3c;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 3px;
  transition: all 0.2s;
}
.route-item:hover { background: rgba(45, 138, 78, 0.08); color: #3d3929; }
.route-item.active { background: #2d8a4e; color: #fff; }

.vehicle-list { display: flex; flex-direction: column; gap: 4px; }
.vehicle-slot {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  border-radius: 6px; cursor: pointer; background: rgba(255, 255, 255, 0.4); transition: all 0.2s;
  border: 1px solid transparent;
}
.vehicle-slot:hover { background: rgba(45, 138, 78, 0.06); }
.vehicle-slot.active { border-color: #2d8a4e; background: rgba(45, 138, 78, 0.08); }
.vehicle-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.vehicle-name { font-size: 13px; color: #3d3929; flex: 1; }
.vehicle-path-count { font-size: 11px; color: #8b7e6a; }
.btn-remove-vehicle {
  background: none; border: none; color: #e74c3c; font-size: 16px;
  cursor: pointer; padding: 0 4px; line-height: 1;
}
.btn-remove-vehicle:hover { color: #c0392b; }
.collapse-toggle {
  position: absolute;
  left: 272px;
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
.coord-line {
  flex-shrink: 0;
  padding: 6px 14px;
  border-top: 1px solid rgba(45, 138, 78, 0.1);
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 10px;
}
.coord-line .coord-label {
  color: #2d8a4e;
  font-weight: 600;
  font-size: 10px;
  background: rgba(45, 138, 78, 0.08);
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.coord-line .coord-value {
  color: #5a4e3c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>