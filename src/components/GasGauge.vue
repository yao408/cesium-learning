<template>
  <div class="gas-container"
       :class="{ 'clickable': !!sensorId }"
       @click="handleClick"
       @dblclick="handleDblClick">
    <!-- 标题 -->
    <div class="gas-title">{{ title }}</div>

    <!-- 八角玻璃容器 -->
    <div class="gas-glass-card">
      <!-- 雾气层 - 根据预设状态显示 -->
      <div
        class="fog-layer"
        :style="{
          opacity: currentFog.opacity,
          background: currentFog.gradient,
          height: currentFog.height + '%'
        }"
      >
        <!-- 雾气粒子效果 -->
        <div class="fog-particles">
          <span v-for="i in currentFog.particles" :key="i" class="particle"></span>
        </div>
      </div>

      <!-- 数值显示（始终在最上层）-->
      <div class="center-value">
        <span class="value-number">{{ displayValue }}</span>
        <span class="value-unit">{{ unit }}</span>
      </div>
    </div>

    <!-- 状态指示 -->
    <div class="gas-status" :class="statusClass">{{ statusText }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  title: { type: String, default: '气体' },
  value: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 5000 },
  unit: { type: String, default: 'PPM' },
  warningThreshold: { type: Number, default: 2000 },
  dangerThreshold: { type: Number, default: 3500 },
  sensorId: { type: String, default: '' }
})

const emit = defineEmits(['click', 'dblclick'])
const currentValue = ref(props.value)

/* 点击事件处理 */
function handleClick() {
  if (props.sensorId) {
    emit('click', props.sensorId)
  }
}

/* 双击事件处理 */
function handleDblClick() {
  if (props.sensorId) {
    emit('dblclick', props.sensorId)
  }
}

/* 监听外部传入的 value 变化，实时更新显示 */
watch(() => props.value, (newVal) => {
  currentValue.value = newVal
}, { immediate: true })

/* 预设的雾气效果配置（增强可见度）*/
const fogPresets = {
  empty: {
    opacity: 1,
    height: 10,
    gradient: `linear-gradient(to top,
      rgba(180, 230, 255, 0.6) 0%,
      rgba(200, 240, 255, 0.4) 50%,
      rgba(230, 248, 255, 0.2) 80%,
      rgba(255, 255, 255, 0.05) 100%
    )`,
    particles: 10
  },
  low: {
    opacity: 1,
    height: 30,
    gradient: `linear-gradient(to top,
      rgba(120, 210, 255, 0.75) 0%,
      rgba(160, 235, 255, 0.55) 30%,
      rgba(200, 245, 255, 0.35) 60%,
      rgba(240, 250, 255, 0.15) 90%,
      rgba(255, 255, 255, 0.05) 100%
    )`,
    particles: 16
  },
  medium: {
    opacity: 1,
    height: 55,
    gradient: `linear-gradient(to top,
      rgba(80, 190, 255, 0.85) 0%,
      rgba(130, 225, 255, 0.7) 25%,
      rgba(175, 242, 255, 0.5) 50%,
      rgba(215, 250, 255, 0.3) 75%,
      rgba(245, 253, 255, 0.12) 95%,
      rgba(255, 255, 255, 0.03) 100%
    )`,
    particles: 22
  },
  warning: {
    opacity: 1,
    height: 75,
    gradient: `linear-gradient(to top,
      rgba(255, 180, 50, 0.9) 0%,
      rgba(255, 205, 100, 0.75) 20%,
      rgba(255, 228, 150, 0.55) 45%,
      rgba(255, 245, 200, 0.35) 70%,
      rgba(255, 252, 230, 0.15) 90%,
      rgba(255, 255, 255, 0.05) 100%
    )`,
    particles: 28
  },
  danger: {
    opacity: 1,
    height: 92,
    gradient: `linear-gradient(to top,
      rgba(255, 80, 80, 0.92) 0%,
      rgba(255, 120, 120, 0.82) 15%,
      rgba(255, 160, 160, 0.65) 35%,
      rgba(255, 195, 195, 0.45) 55%,
      rgba(255, 225, 225, 0.28) 75%,
      rgba(255, 245, 245, 0.12) 90%,
      rgba(255, 255, 255, 0.04) 100%
    )`,
    particles: 34
  }
}

/* 根据值选择预设状态 */
const currentFog = computed(() => {
  const val = currentValue.value
  const ratio = val / props.max

  if (ratio <= 0.05) return fogPresets.empty       /* 接近0或很低 */
  if (ratio <= 0.3) return fogPresets.low           /* 低浓度 */
  if (ratio <= 0.6) return fogPresets.medium        /* 中等浓度 */
  if (val >= props.warningThreshold && val < props.dangerThreshold) return fogPresets.warning  /* 警告 */
  if (val >= props.dangerThreshold) return fogPresets.danger   /* 危险 */

  return fogPresets.medium  /* 默认中等 */
})

/* 显示值（如果为0则显示一个测试值）*/
const displayValue = computed(() => {
  if (currentValue.value === 0 || currentValue.value === undefined) {
    return '---'
  }
  return currentValue.value
})

const statusText = computed(() => {
  const val = currentValue.value
  if (val >= props.dangerThreshold) return '危险'
  if (val >= props.warningThreshold) return '警告'
  if (val === 0) return '待机'
  return '正常'
})

const statusClass = computed(() => {
  const val = currentValue.value
  if (val >= props.dangerThreshold) return 'danger'
  if (val >= props.warningThreshold) return 'warning'
  if (val === 0) return 'standby'
  return 'normal'
})
</script>

<style scoped>
.gas-container {
  position: relative;
  width: 110px;
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  cursor: default;
  padding-top: 2px;
}

.gas-container.clickable {
  cursor: pointer;
}

.gas-container.clickable:hover {
  transform: translateY(-2px);
}

/* 标题 */
.gas-title {
  font-size: 11px;
  font-weight: 600;
  color: #94daff;
  text-shadow: 0 0 5px rgba(148, 210, 255, 0.4);
  letter-spacing: 1px;
  margin-bottom: 4px;
  white-space: nowrap;
}

/* 八角玻璃容器 */
.gas-glass-card {
  position: relative;
  width: 100%;
  height: 75px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(20, 40, 80, 0.35) 0%,
    rgba(15, 30, 60, 0.45) 50%,
    rgba(10, 25, 50, 0.35) 100%
  );
  clip-path: polygon(
    12% 0%, 88% 0%, 100% 12%, 100% 88%, 88% 100%, 12% 100%, 0% 88%, 0% 12%
  );
  overflow: hidden;

  box-shadow:
    0 0 15px rgba(34, 211, 238, 0.18),
    0 0 30px rgba(34, 211, 238, 0.09),
    inset 0 1px 2px rgba(148, 210, 255, 0.3),
    inset 0 -1px 2px rgba(0, 10, 25, 0.2),
    0 2px 6px rgba(0, 0, 0, 0.15);

  border: 1.5px solid rgba(74, 158, 255, 0.4);
}

.gas-container.clickable:hover .gas-glass-card {
  box-shadow:
    0 0 20px rgba(34, 211, 238, 0.28),
    0 0 40px rgba(34, 211, 238, 0.14),
    inset 0 1px 2px rgba(148, 210, 255, 0.45),
    inset 0 -1px 2px rgba(0, 10, 25, 0.22),
    0 3px 9px rgba(0, 0, 0, 0.22);
  border-color: rgba(74, 158, 255, 0.6);
}

/* 雾气层 - 从底部向上填充（增强可见度）*/
.fog-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  /* 轻微流动动画 - 减少模糊以增强可见度 */
  animation: fogFlow 8s ease-in-out infinite;

  /* 添加内发光增强雾感 */
  box-shadow:
    inset 0 2px 15px rgba(255, 255, 255, 0.3),
    inset 0 -5px 20px rgba(100, 180, 255, 0.2);
}

@keyframes fogFlow {
  0%, 100% {
    transform: translateY(0) scale(1);
    filter: blur(3px) brightness(1.05);
  }
  50% {
    transform: translateY(-4px) scale(1.02);
    filter: blur(4px) brightness(1.08);
  }
}

/* 雾气粒子 */
.fog-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  filter: blur(1px);
  box-shadow:
    0 0 6px rgba(255, 255, 255, 0.8),
    0 0 12px rgba(180, 220, 255, 0.6);
  animation: floatParticle 3.5s ease-in-out infinite;
}

/* 为每个粒子随机位置和延迟 */
.particle:nth-child(1)  { left: 10%; top: 20%; animation-delay: 0s; }
.particle:nth-child(2)  { left: 25%; top: 45%; animation-delay: 0.5s; }
.particle:nth-child(3)  { left: 40%; top: 15%; animation-delay: 1s; }
.particle:nth-child(4)  { left: 55%; top: 55%; animation-delay: 1.5s; }
.particle:nth-child(5)  { left: 70%; top: 30%; animation-delay: 2s; }
.particle:nth-child(6)  { left: 85%; top: 50%; animation-delay: 2.5s; }
.particle:nth-child(7)  { left: 15%; top: 70%; animation-delay: 3s; }
.particle:nth-child(8)  { left: 65%; top: 75%; animation-delay: 3.5s; }
.particle:nth-child(9)  { left: 30%; top: 60%; animation-delay: 0.3s; }
.particle:nth-child(10) { left: 80%; top: 25%; animation-delay: 0.8s; }
.particle:nth-child(11) { left: 50%; top: 40%; animation-delay: 1.3s; }
.particle:nth-child(12) { left: 20%; top: 80%; animation-delay: 1.8s; }
.particle:nth-child(13) { left: 75%; top: 65%; animation-delay: 2.3s; }
.particle:nth-child(14) { left: 45%; top: 10%; animation-delay: 2.8s; }
.particle:nth-child(15) { left: 90%; top: 35%; animation-delay: 0.2s; }

@keyframes floatParticle {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translate(6px, -10px) scale(1.3);
    opacity: 1;
  }
}

/* 数值显示 */
.center-value {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  text-align: center;
  pointer-events: none;
}

.value-number {
  font-size: 16px;
  font-weight: 700;
  font-family: 'Arial', sans-serif;
  color: #fff;
  text-shadow:
    0 0 8px rgba(0, 0, 0, 0.8),
    0 0 16px rgba(0, 0, 0, 0.5);
  letter-spacing: -0.5px;
}

.value-unit {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-left: 2px;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.7);
}

/* 状态指示 */
.gas-status {
  position: relative;
  width: fit-content;
  margin: 2px auto 0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  pointer-events: none;
  transition: all 0.3s ease;
}

.gas-status.normal {
  color: #22d3ee;
  background: rgba(34, 211, 238, 0.15);
  border: 1px solid rgba(34, 211, 238, 0.3);
}

.gas-status.standby {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.gas-status.warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  animation: pulse-warning 2s ease-in-out infinite;
}

.gas-status.danger {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  animation: pulse-danger 1s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 0.8; scale: 1; }
  50% { opacity: 1; scale: 1.05; }
}

@keyframes pulse-danger {
  0%, 100% { opacity: 0.8; scale: 1; }
  50% { opacity: 1; scale: 1.1; }
}
</style>