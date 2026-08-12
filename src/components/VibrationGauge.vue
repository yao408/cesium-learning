<template>
  <div class="vibration-container"
       :class="{ 'clickable': !!sensorId }"
       @click="handleClick"
       @dblclick="handleDblClick">
    <!-- 标题 -->
    <div class="vib-title">{{ title }}</div>

    <!-- 八角玻璃卡片 -->
    <div class="vib-glass-card">
      <!-- SVG 波纹动画 - 超高频直上直下锯齿波（自然随机振幅）-->
      <svg class="wave-svg" viewBox="0 0 200 80" preserveAspectRatio="none">
        <!-- 主波纹（高低错落的尖峰）-->
        <path
          class="wave-path wave-1"
          :stroke="getWaveColor"
          d="
            M 0,40
            L 25,40
            L 27,15 L 29,68 L 31,5 L 33,75 L 35,20 L 37,62
            L 39,8 L 41,70 L 43,12 L 45,58 L 47,3 L 49,76
            L 51,18 L 53,64 L 55,10 L 57,66 L 59,22 L 61,55
            L 63,6 L 65,72 L 67,14 L 69,60 L 71,8 L 73,68
            L 75,16 L 77,63 L 79,5 L 81,74 L 83,25 L 85,52
            L 87,9 L 89,70 L 91,18 L 93,56 L 95,4 L 96,78
            L 98,20 L 100,62 L 102,11 L 104,65 L 106,23 L 108,54
            L 110,7 L 112,73 L 114,13 L 116,59 L 118,8 L 120,67
            L 122,17 L 124,64 L 126,6 L 128,75 L 130,24 L 132,53
            L 134,10 L 136,69 L 138,19 L 140,57 L 142,3 L 144,77
            L 146,21 L 148,61 L 150,12 L 152,63 L 154,26 L 156,51
            L 158,8 L 160,71 L 162,15 L 164,58 L 166,9 L 168,66
            L 170,18 L 172,62 L 174,5 L 176,73 L 178,28 L 180,50
            L 182,35 L 190,40 L 200,40
          "
          fill="none"
        />

        <!-- 副波纹（镜像相位 + 高低错落）-->
        <path
          class="wave-path wave-2"
          :stroke="getWaveColor"
          d="
            M 0,40
            L 25,40
            L 27,65 L 29,12 L 31,75 L 33,5 L 35,58 L 37,18
            L 39,72 L 41,10 L 43,68 L 45,22 L 47,77 L 49,4
            L 51,62 L 53,16 L 55,70 L 57,14 L 59,55 L 61,25
            L 63,74 L 65,8 L 67,66 L 69,20 L 71,60 L 73,12
            L 75,64 L 77,17 L 79,75 L 81,6 L 83,55 L 85,28
            L 87,70 L 89,10 L 91,62 L 93,24 L 95,76 L 97,4
            L 99,60 L 101,19 L 103,69 L 105,13 L 107,57 L 109,27
            L 111,73 L 113,9 L 115,67 L 117,21 L 119,60 L 121,13
            L 123,64 L 125,16 L 127,74 L 129,6 L 131,56 L 133,27
            L 135,71 L 137,11 L 139,63 L 141,23 L 143,77 L 145,3
            L 147,59 L 149,19 L 151,68 L 153,12 L 155,54 L 157,29
            L 159,72 L 161,9 L 163,62 L 165,22 L 167,60 L 169,14
            L 171,63 L 173,18 L 175,75 L 177,7 L 179,52 L 181,30
            L 183,45 L 190,40 L 200,40
          "
          fill="none"
        />
      </svg>

      <!-- 流动光效 -->
      <div class="flowing-light"></div>
    </div>

    <!-- 数值显示 -->
    <div class="vib-value">
      <span class="value-number">{{ currentValue }}</span>
      <span class="value-unit">{{ unit }}</span>
    </div>

    <!-- 状态指示 -->
    <div class="vib-status" :class="statusClass">{{ statusText }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  title: { type: String, default: '震动' },
  value: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  unit: { type: String, default: 'mm/s' },
  warningThreshold: { type: Number, default: 70 },
  dangerThreshold: { type: Number, default: 85 },
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

const statusText = computed(() => {
  const val = currentValue.value
  if (val >= props.dangerThreshold) return '危险'
  if (val >= props.warningThreshold) return '警告'
  return '正常'
})

const statusClass = computed(() => {
  const val = currentValue.value
  if (val >= props.dangerThreshold) return 'danger'
  if (val >= props.warningThreshold) return 'warning'
  return 'normal'
})

/* 根据状态返回波纹颜色 */
const getWaveColor = computed(() => {
  const val = currentValue.value
  if (val >= props.dangerThreshold) return '#ef4444'
  if (val >= props.warningThreshold) return '#f59e0b'
  return '#22d3ee'
})
</script>

<style scoped>
.vibration-container {
  position: relative;
  width: 110px;
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  cursor: default;
  background: transparent !important;
  padding-top: 2px;
}

.vibration-container.clickable {
  cursor: pointer;
}

.vibration-container.clickable:hover {
  transform: translateY(-2px);
}

/* 标题 */
.vib-title {
  font-size: 11px;
  font-weight: 600;
  color: #94daff;
  text-shadow: 0 0 5px rgba(148, 210, 255, 0.4);
  letter-spacing: 1px;
  margin-bottom: 4px;
  white-space: nowrap;
}

/* 八角玻璃卡片 */
.vib-glass-card {
  position: relative;
  width: 100%;
  height: 70px;  /* 固定高度 */
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(20, 40, 80, 0.45) 0%,
    rgba(15, 30, 60, 0.55) 50%,
    rgba(10, 25, 50, 0.45) 100%
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

/* SVG 波纹容器 */
.wave-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}

/* 波纹路径样式 - 细线条优雅版 */
.wave-path {
  stroke-width: 1.8;        /* 细线条 */
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 4px currentColor);  /* 发光效果 */
}

/* 主波纹动画（向上波动）*/
.wave-1 {
  animation: waveMoveUp 2s ease-in-out infinite;
}

/* 副波纹动画（向下波动，相位差）*/
.wave-2 {
  animation: waveMoveDown 2s ease-in-out infinite;
  opacity: 0.6;  /* 稍微透明 */
}

@keyframes waveMoveUp {
  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-15px);  /* 向左移动 */
  }
}

@keyframes waveMoveDown {
  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(15px);  /* 向右移动 */
  }
}

.vibration-container.clickable:hover .vib-glass-card {
  box-shadow:
    0 0 20px rgba(34, 211, 238, 0.28),
    0 0 40px rgba(34, 211, 238, 0.14),
    inset 0 1px 2px rgba(148, 210, 255, 0.45),
    inset 0 -1px 2px rgba(0, 10, 25, 0.22),
    0 3px 9px rgba(0, 0, 0, 0.22);
  border-color: rgba(74, 158, 255, 0.6);
}

/* 流动光带动画 */
.flowing-light {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.06) 20%,
    rgba(148, 210, 255, 0.12) 50%,
    rgba(255, 255, 255, 0.06) 80%,
    transparent 100%
  );
  z-index: 3;
  pointer-events: none;
  animation: flowLight 3s ease-in-out infinite;
}

@keyframes flowLight {
  0% {
    left: -60%;
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    left: 160%;
    opacity: 0;
  }
}

/* 数值显示 */
.vib-value {
  position: relative;
  margin-top: 4px;
  text-align: center;
  pointer-events: none;
}

.value-number {
  font-size: 16px;
  font-weight: 700;
  font-family: 'Arial', sans-serif;
  background: linear-gradient(180deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 4px rgba(34, 211, 238, 0.35));
}

.value-unit {
  font-size: 10px;
  font-weight: 600;
  color: rgba(148, 210, 255, 0.8);
  margin-left: 2px;
}

/* 状态指示 */
.vib-status {
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

.vib-status.normal {
  color: #22d3ee;
  background: rgba(34, 211, 238, 0.15);
  border: 1px solid rgba(34, 211, 238, 0.3);
}

.vib-status.warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  animation: pulse-warning 2s ease-in-out infinite;
}

.vib-status.danger {
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