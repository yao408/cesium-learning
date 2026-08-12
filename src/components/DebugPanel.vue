<template>
  <div class="debug-panel" :class="{ expanded: isExpanded }">
    <div class="panel-header" @click="togglePanel">
      <span class="panel-icon">🔧</span>
      <span class="panel-title">页面调试</span>
      <span class="fps-display" :class="fpsClass">{{ currentFps }} FPS</span>
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
    </div>

    <transition name="slide-down">
      <div v-if="isExpanded" class="panel-body">
        <!-- 选项卡切换 -->
        <div class="tab-bar">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="switchTab(tab.id)"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
          >
            {{ tab.icon }} {{ tab.name }}
          </button>
        </div>

        <!-- 选项卡内容区域 -->
        <div class="tab-container">
          <!-- FPS 计数器选项卡 -->
          <div v-show="activeTab === 'fps'" class="tab-content fps-tab">
            <FPSCounter />
          </div>

          <!-- 性能诊断选项卡 -->
          <div v-show="activeTab === 'performance'" class="tab-content performance-tab">
            <PerformancePanel
              :scene="scene"
              :renderer="renderer"
              :composer="composer"
              :outline-pass="outlinePass"
            />
          </div>

          <!-- Group 管理器选项卡 -->
          <div v-show="activeTab === 'group'" class="tab-content group-tab">
            <GroupManager :scene="scene" />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import FPSCounter from './fpscounter.vue'
import PerformancePanel from './performancepanel.vue'
import GroupManager from './GroupManager.vue'

const props = defineProps({
  scene: { type: Object, required: true },
  renderer: { type: Object, default: null },
  composer: { type: Object, default: null },
  outlinePass: { type: Object, default: null }
})

const isExpanded = ref(false)
const activeTab = ref('fps')
const currentFps = ref(60)

const tabs = [
  { id: 'fps', name: '帧率', icon: '📊' },
  { id: 'performance', name: '性能', icon: '⚡' },
  { id: 'group', name: 'Group', icon: '📦' }
]

const fpsClass = computed(() => {
  if (currentFps.value < 15) return 'danger'
  if (currentFps.value < 30) return 'warning'
  return 'good'
})

let frameCount = 0
let lastTime = performance.now()
let fpsAnimationId = null

function updateFps() {
  frameCount++
  const currentTime = performance.now()
  const delta = currentTime - lastTime

  if (delta >= 1000) {
    currentFps.value = Math.round(frameCount * 1000 / delta)
    frameCount = 0
    lastTime = currentTime
  }

  fpsAnimationId = requestAnimationFrame(updateFps)
}

function togglePanel() {
  isExpanded.value = !isExpanded.value
}

function switchTab(tabId) {
  activeTab.value = tabId
}

function closePanel() {
  isExpanded.value = false
}

onMounted(() => {
  fpsAnimationId = requestAnimationFrame(updateFps)
})

onUnmounted(() => {
  if (fpsAnimationId) cancelAnimationFrame(fpsAnimationId)
})
</script>

<style scoped>
.debug-panel {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  background: rgba(10, 25, 50, 0.96);
  border: 1px solid rgba(74, 144, 255, 0.35);
  backdrop-filter: blur(20px);
  border-radius: 10px;
  min-width: 400px;
  max-width: 450px;
  font-size: 12px;
  color: #e2e8f0;
  box-shadow:
    0 12px 40px rgba(0, 10, 30, 0.8),
    0 0 0 1px rgba(74, 144, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

/* 标题栏 */
.panel-header {
  padding: 14px 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  user-select: none;
  background: linear-gradient(135deg, rgba(74, 144, 255, 0.12), rgba(59, 130, 246, 0.05));
  border-bottom: 1px solid rgba(74, 144, 255, 0.2);
  transition: all 0.25s ease;
}

.panel-header:hover {
  background: linear-gradient(135deg, rgba(74, 144, 255, 0.2), rgba(74, 144, 255, 0.08));
}

.panel-icon {
  font-size: 20px;
  line-height: 1;
}

.panel-title {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: #60a5fa;
  text-shadow: 0 0 12px rgba(96, 165, 250, 0.4);
  letter-spacing: 0.3px;
}

/* FPS 显示 - 固定在标题栏右侧 */
.fps-display {
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.25);
  min-width: 70px;
  text-align: center;
  transition: all 0.3s ease;
}

.fps-display.warning {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.25);
}

.fps-display.danger {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.25);
  animation: pulse-danger 1s ease-in-out infinite;
}

@keyframes pulse-danger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.toggle-icon {
  font-size: 11px;
  color: #94a3b8;
  transition: transform 0.3s ease;
}

/* 面板主体 - 向下展开 */
.panel-body {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
  animation: slideDown 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: calc(100vh - 200px);
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 选项卡栏 */
.tab-bar {
  display: flex;
  gap: 8px;
  padding: 12px 16px 10px;
  border-bottom: 1px solid rgba(74, 144, 255, 0.12);
  background: rgba(0, 0, 0, 0.15);
}

.tab-btn {
  flex: 1;
  padding: 9px 14px;
  border: 1px solid rgba(74, 144, 255, 0.18);
  background: rgba(74, 144, 255, 0.04);
  color: #94a3b8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  text-align: center;
}

.tab-btn:hover {
  background: rgba(74, 144, 255, 0.1);
  color: #cbd5e1;
  border-color: rgba(74, 144, 255, 0.32);
  transform: translateY(-1px);
}

.tab-btn.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-color: transparent;
  box-shadow: 0 3px 12px rgba(59, 130, 246, 0.4);
  font-weight: 600;
}

/* 选项卡内容容器 */
.tab-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: rgba(0, 0, 0, 0.1);
}

.tab-content {
  width: 100%;
  min-height: 300px;
}

</style>