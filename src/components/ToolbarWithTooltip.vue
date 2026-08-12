<template>
  <div class="toolbar-with-tooltip">
    <!-- 按钮1: 返回地图 -->
    <el-tooltip content="返回地图" placement="bottom-end" :show-after="150" :hide-after="1200">
      <button class="glass-btn" @click="$emit('goBack')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
    </el-tooltip>

    <!-- 按钮2: 重置视角 -->
    <el-tooltip content="重置视角" placement="bottom-end" :show-after="150" :hide-after="1200">
      <button class="glass-btn" @click="$emit('resetCamera')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
        </svg>
      </button>
    </el-tooltip>

    <!-- 按钮3: 主题切换 -->
    <el-tooltip :content="'切换到' + nextThemeName" placement="bottom-end" :show-after="150" :hide-after="1200">
      <button class="glass-btn theme-toggle-btn" @click="$emit('toggleTheme')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <span class="theme-label">{{ currentThemeName }}</span>
      </button>
    </el-tooltip>

    <!-- 按钮4: 面板控制 -->
    <el-tooltip :content="allPanelsVisible ? '隐藏所有面板' : '显示所有面板'" placement="bottom-end" :show-after="150" :hide-after="1200">
      <button
        class="glass-btn"
        :class="{ 'panels-visible': allPanelsVisible }"
        @click="$emit('toggleAllPanels')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </button>
    </el-tooltip>
  </div>
</template>

<script setup>
defineProps({
  currentThemeName: String,
  nextThemeName: String,
  allPanelsVisible: Boolean
})

defineEmits(['goBack', 'resetCamera', 'toggleTheme', 'toggleAllPanels'])
</script>

<style scoped>
.toolbar-with-tooltip {
  display: flex;
  gap: 8px;
  align-items: center;
}

.glass-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: rgba(200, 220, 255, 0.95);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  position: relative;
  overflow: hidden;
}

.glass-btn:hover {
  transform: translateY(-2px) scale(1.05);
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow:
    0 6px 20px rgba(30, 80, 180, 0.35),
    0 0 15px rgba(80, 150, 255, 0.25);
}

.glass-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.theme-toggle-btn {
  width: auto;
  padding: 0 16px;
  border-radius: 22px;
  gap: 6px;
}

.theme-label {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}
</style>