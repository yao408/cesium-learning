<template>
  <aside class="sidebar left-sidebar">
    <div class="panel">
      <h3>🗺️ 底图切换</h3>
      <div class="layer-btns">
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
          <label>颜色: <input type="color" :value="activeSlot ? activeSlot.color : '#e74c3c'" @input="$emit('updatePathColor', $event.target.value)" class="color-picker"></label>
          <div class="style-toggle">
            <button :class="{ active: !activeSlot || activeSlot.pathStyle === 'solid' }" @click="$emit('updatePathStyle', 'solid')">实心</button>
            <button :class="{ active: activeSlot && activeSlot.pathStyle === 'outline' }" @click="$emit('updatePathStyle', 'outline')">镂空</button>
          </div>
          <template v-if="activeSlot && activeSlot.pathStyle === 'outline'">
            <label>内芯宽: {{ activeSlot ? activeSlot.pathWidth : 6 }}px
              <input type="range" :value="activeSlot ? activeSlot.pathWidth : 6" min="2" max="30" @input="$emit('updatePathWidth', Number($event.target.value))">
            </label>
            <label>内芯透明: {{ ((activeSlot ? activeSlot.pathOpacity : 0.7) * 100).toFixed(0) }}%
              <input type="range" :value="activeSlot ? activeSlot.pathOpacity : 0.7" min="0.1" max="1" step="0.05" @input="$emit('updatePathOpacity', Number($event.target.value))">
            </label>
            <label>外框宽: {{ activeSlot ? activeSlot.pathOutlineWidth : 2 }}px
              <input type="range" :value="activeSlot ? activeSlot.pathOutlineWidth : 2" min="0" max="10" @input="$emit('updatePathOutlineWidth', Number($event.target.value))">
            </label>
            <label>外框透明: {{ ((activeSlot ? activeSlot.pathOutlineOpacity : 0.9) * 100).toFixed(0) }}%
              <input type="range" :value="activeSlot ? activeSlot.pathOutlineOpacity : 0.9" min="0.1" max="1" step="0.05" @input="$emit('updatePathOutlineOpacity', Number($event.target.value))">
            </label>
          </template>
          <template v-if="!activeSlot || activeSlot.pathStyle === 'solid'">
            <label>线宽: {{ activeSlot ? activeSlot.pathWidth : 4 }}px
              <input type="range" :value="activeSlot ? activeSlot.pathWidth : 4" min="1" max="20" @input="$emit('updatePathWidth', Number($event.target.value))">
            </label>
            <label>透明度: {{ ((activeSlot ? activeSlot.pathOpacity : 0.7) * 100).toFixed(0) }}%
              <input type="range" :value="activeSlot ? activeSlot.pathOpacity : 0.7" min="0.1" max="1" step="0.05" @input="$emit('updatePathOpacity', Number($event.target.value))">
            </label>
          </template>
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

    <div class="panel">
      <h3>📏 测量工具</h3>
      <button :class="{ active: measureMode === 'distance' }" @click="$emit('startMeasure', 'distance')" class="btn btn-sm">📐 测距</button>
      <button :class="{ active: measureMode === 'area' }" @click="$emit('startMeasure', 'area')" class="btn btn-sm">📏 测面积</button>
      <button @click="$emit('clearMeasure')" class="btn btn-sm btn-danger">清除</button>
      <div v-if="measureResult" class="measure-result">{{ measureResult }}</div>
    </div>
  </aside>
</template>

<script>
export default {
  emits: [
    'switchBaseLayer', 'clearUserPath',
    'startSimulation', 'pauseSimulation', 'stopSimulation', 'update:vehicleSpeed',
    'startMeasure', 'clearMeasure',
    'startRoutePlanning', 'cancelRoutePlanning', 'selectRoute', 'confirmRoute',
    'addVehicle', 'removeVehicle', 'switchVehicle',
    'updatePathColor', 'updatePathWidth', 'updatePathOpacity', 'updatePathStyle', 'updatePathOutlineWidth', 'updatePathOutlineOpacity',
  ],
  computed: {
    activeSlot() {
      return (this.vehicleSlots || []).find(s => s.id === this.activeSlotId) || null
    },
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
    measureMode: String,
    measureResult: String,
    vehicleSlots: Array,
    activeSlotId: Number,
    vehicleStats: Array,
  },
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  overflow-y: auto;
  padding: 10px;
  background: #16213e;
  border-right: 1px solid #0f3460;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: #0f3460; border-radius: 2px; }
.panel {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #0f3460;
}
.panel h3 {
  font-size: 13px;
  color: #e94560;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #0f3460;
}
.layer-btns { display: flex; gap: 4px; }
.layer-btns button {
  flex: 1;
  padding: 6px 8px;
  font-size: 12px;
  border: 1px solid #0f3460;
  border-radius: 4px;
  background: #16213e;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}
.layer-btns button:hover { border-color: #e94560; color: #e0e0e0; }
.layer-btns button.active { background: #e94560; color: #fff; border-color: #e94560; }
.btn {
  padding: 6px 14px;
  border: 1px solid #0f3460;
  border-radius: 4px;
  background: #16213e;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.btn:hover { border-color: #e94560; }
.btn-primary { background: #e94560; border-color: #e94560; }
.btn-primary:hover { background: #c73a52; }
.btn-sm { padding: 4px 10px; font-size: 11px; }
.btn-danger { color: #e74c3c; }
.btn-danger:hover { background: #e74c3c; color: #fff; border-color: #e74c3c; }
.toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; padding: 4px 0; }
.toggle input[type='checkbox'] { accent-color: #e94560; }
.sub-controls {
  margin-top: 8px;
  padding: 8px;
  background: #0f3460;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.sub-controls input[type='range'] { width: 100%; accent-color: #e94560; }
.drawing-hint {
  font-size: 12px;
  color: #00ff88;
  text-align: center;
  padding: 6px;
  background: rgba(0,255,136,0.08);
  border-radius: 4px;
  margin: 6px 0;
  animation: pulse 1.2s infinite;
}
.path-info { font-size: 12px; color: #3498db; text-align: center; margin-bottom: 4px; font-weight: 600; }
.path-style-box {
  background: #16213e;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 4px;
  border: 1px solid #0f3460;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.path-style-box label { font-size: 11px; color: #aaa; display: flex; align-items: center; gap: 6px; }
.path-style-box input[type='range'] { flex: 1; accent-color: #e94560; }
.path-style-box .color-picker { width: 28px; height: 22px; border: 1px solid #0f3460; border-radius: 3px; cursor: pointer; background: transparent; padding: 0; }
.path-style-title { font-size: 11px; color: #e94560; font-weight: 600; margin-bottom: 2px; }
.style-toggle { display: flex; gap: 4px; }
.style-toggle button {
  flex: 1;
  padding: 3px 8px;
  font-size: 11px;
  border: 1px solid #0f3460;
  border-radius: 3px;
  background: #16213e;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}
.style-toggle button:hover { border-color: #e94560; color: #e0e0e0; }
.style-toggle button.active { background: #e94560; color: #fff; border-color: #e94560; }
.progress-bar { width: 100%; height: 6px; background: #16213e; border-radius: 3px; overflow: hidden; }
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e94560, #00ff88);
  border-radius: 3px;
  transition: width 0.1s linear;
}
.alerts { margin-top: 6px; }
.alert-item {
  font-size: 11px;
  color: #e74c3c;
  padding: 3px 6px;
  background: rgba(231, 76, 60, 0.1);
  border-radius: 3px;
  margin-bottom: 3px;
}
.measure-result {
  margin-top: 6px;
  padding: 4px 8px;
  background: #0f3460;
  border-radius: 4px;
  font-size: 12px;
  color: #00ff88;
  font-weight: 600;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.route-list {
  margin-top: 8px;
  padding: 8px;
  background: #0f3460;
  border-radius: 6px;
}
.route-label {
  font-size: 12px;
  color: #00ff88;
  margin-bottom: 6px;
  font-weight: 600;
}
.route-item {
  padding: 6px 8px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 3px;
  transition: all 0.2s;
}
.route-item:hover { background: #16213e; color: #fff; }
.route-item.active { background: #e94560; color: #fff; }

.vehicle-list { display: flex; flex-direction: column; gap: 4px; }
.vehicle-slot {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  border-radius: 4px; cursor: pointer; background: #1a1a2e; transition: all 0.2s;
  border: 1px solid transparent;
}
.vehicle-slot:hover { background: #16213e; }
.vehicle-slot.active { border-color: #e94560; background: #16213e; }
.vehicle-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.vehicle-name { font-size: 13px; color: #e0e0e0; flex: 1; }
.vehicle-path-count { font-size: 11px; color: #888; }
.btn-remove-vehicle {
  background: none; border: none; color: #e94560; font-size: 16px;
  cursor: pointer; padding: 0 4px; line-height: 1;
}
.btn-remove-vehicle:hover { color: #ff6b6b; }
</style>