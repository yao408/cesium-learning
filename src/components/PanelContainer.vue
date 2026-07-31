<template>
  <div class="panel-container" v-if="activeTool">
    <div class="panel-header">
      <span class="panel-title">{{ title }}</span>
      <button class="close-btn" @click="close">✕</button>
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activeTool: String
})

const emit = defineEmits(['close'])

const title = computed(() => {
  const titles = {
    data: '数据导入',
    viewshed: '通视分析',
    measure: '测量工具',
    draw: '绘制工具',
    layers: '图层管理'
  }
  return titles[props.activeTool] || ''
})

function close() {
  emit('close')
}
</script>

<style scoped>
.panel-container {
  position: absolute;
  right: 12px;
  top: 80px;
  bottom: 12px;
  width: 300px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
</style>