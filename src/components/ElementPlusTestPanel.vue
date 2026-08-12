<template>
  <div class="element-plus-test-panel">
    <h3 class="panel-title">🔵 圆形按钮 + ElTooltip 测试</h3>

    <div class="buttons-row">
      <!-- 返回地图 -->
      <el-tooltip content="返回地图" placement="bottom-end" :show-after="200">
        <button class="glass-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      </el-tooltip>

      <!-- 重置视角 -->
      <el-tooltip content="重置视角" placement="bottom-end" :show-after="200">
        <button class="glass-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>
          </svg>
        </button>
      </el-tooltip>

      <!-- 传感器管理 -->
      <el-tooltip content="传感器管理" placement="bottom-end" :show-after="200">
        <button class="glass-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </button>
      </el-tooltip>

      <!-- 面板控制 -->
      <el-tooltip content="面板控制" placement="bottom-end" :show-after="200">
        <button class="glass-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
        </button>
      </el-tooltip>

      <!-- 更多选项 -->
      <el-tooltip content="更多选项" placement="bottom-end" :show-after="200">
        <button class="glass-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </el-tooltip>
    </div>

    <div class="info-text">
      <p>✨ 所有按钮：提示向右下角弹出 (bottom-end)</p>
      <p>🎯 不会遮挡其他按钮，互不干扰</p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.element-plus-test-panel {
  position: fixed;
  top: 100px;
  left: 20px;
  z-index: 9999;
  padding: 20px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.panel-title {
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.buttons-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.glass-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(200, 220, 255, 0.95);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 4px 15px rgba(30, 80, 180, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}

.glass-btn::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  transform: rotate(45deg);
}

.glass-btn:hover {
  transform: translateY(-2px) scale(1.05);
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow:
    0 6px 20px rgba(30, 80, 180, 0.35),
    0 0 15px rgba(80, 150, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15);
}

.glass-btn:hover::before {
  opacity: 1;
}

.glass-btn:active {
  transform: translateY(-1px) scale(1.02);
  box-shadow:
    0 4px 15px rgba(30, 80, 180, 0.4),
    inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.glass-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.info-text {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.info-text p {
  margin: 8px 0;
  color: rgba(200, 220, 255, 0.8);
  font-size: 13px;
  line-height: 1.5;
}
</style>