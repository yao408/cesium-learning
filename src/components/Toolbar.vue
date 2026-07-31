<template>
  <div class="toolbar">
    <button 
      class="tool-btn" 
      :class="{ active: activeTool === 'data' }"
      @click="toggleTool('data')"
      title="导入本地数据"
    >
      ➕
    </button>

    <button 
      class="tool-btn" 
      :class="{ active: activeTool === 'link' }"
      @click="toggleTool('link')"
      title="导入网络服务"
    >
      🔗
    </button>

    <button 
      class="tool-btn" 
      :class="{ active: activeTool === 'viewshed' }"
      @click="toggleTool('viewshed')"
      title="通视分析"
    >
      🔭
    </button>

    <button 
      class="tool-btn" 
      :class="{ active: activeTool === 'measure' }"
      @click="toggleTool('measure')"
      title="测量工具"
    >
      📐
    </button>

    <button 
      class="tool-btn" 
      :class="{ active: activeTool === 'draw' }"
      @click="toggleTool('draw')"
      title="绘制工具"
    >
      ✏️
    </button>

    <button 
      class="tool-btn" 
      :class="{ active: activeTool === 'layers' }"
      @click="toggleTool('layers')"
      title="图层管理"
    >
      📋
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['select-tool'])

const activeTool = ref('')

function toggleTool(tool) {
  if (activeTool.value === tool) {
    activeTool.value = ''
    emit('select-tool', '')
  } else {
    activeTool.value = tool
    emit('select-tool', tool)
  }
}
</script>

<style scoped>
.toolbar {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 28px;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  z-index: 1000;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 24px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.tool-btn.active {
  background: rgba(45, 138, 78, 0.7);
  color: #fff;
}
</style>