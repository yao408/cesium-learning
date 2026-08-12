<template>
  <div class="fps-counter" :class="{ 'fps-warning': fps < 30, 'fps-danger': fps < 15 }">
    <span class="fps-label">FPS</span>
    <span class="fps-value">{{ fps }}</span>
    <span v-if="fps < 30" class="fps-status">
      {{ fps < 15 ? '⚠️ 卡顿' : '⚡ 较慢' }}
    </span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const fps = ref(60)
let frameCount = 0
let lastTime = performance.now()
let animationId = null

function updateFPS() {
  frameCount++
  const currentTime = performance.now()

  if (currentTime - lastTime >= 1000) {
    fps.value = Math.round(frameCount * 1000 / (currentTime - lastTime))
    frameCount = 0
    lastTime = currentTime
  }

  animationId = requestAnimationFrame(updateFPS)
}

onMounted(() => {
  animationId = requestAnimationFrame(updateFPS)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.fps-counter {
  background: rgba(0, 20, 40, 0.6);
  border: 1px solid rgba(74, 144, 255, 0.25);
  padding: 16px 20px;
  border-radius: 8px;
  font-family: 'Consolas', monospace;
  font-size: 32px;
  color: #60a5fa;
  text-align: center;
  backdrop-filter: blur(10px);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.fps-label {
  color: #93c5fd;
  font-weight: 600;
  font-size: 11px;
}

.fps-value {
  font-size: 16px;
  font-weight: bold;
  min-width: 28px;
  text-align: center;
}

.fps-status {
  font-size: 11px;
  margin-left: 4px;
}

.fps-warning .fps-counter {
  border-color: rgba(251, 191, 36, 0.5);
}

.fps-warning .fps-value {
  color: #fbbf24;
}

.fps-danger .fps-counter {
  border-color: rgba(239, 68, 68, 0.5);
  animation: pulse 1s ease-in-out infinite;
}

.fps-danger .fps-value {
  color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>