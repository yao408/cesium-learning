<template>
  <div
    class="thermometer-container"
    :class="{ 'clickable': !!sensorId }"
    @click="handleClick"
    @dblclick="handleDblClick"
  >
    <!-- 可点击提示图标 -->
    <div class="click-hint" v-if="sensorId">🎯</div>

    <!-- 顶部标题 -->
    <div class="thermo-title">{{ title }}</div>

    <!-- 温度计主体 -->
    <div class="thermometer-body">
      <!-- 多层立体管体系统 -->
    <div class="thermo-tube">
      <!-- 第3层：内凹液柱容器 -->
      <div class="thermo-inner-tube">
        <!-- ECharts 容器 - 放在凹槽中 -->
        <div ref="chartRef" class="thermo-chart"></div>
      </div>

      <!-- 右侧刻度线 - 用绝对定位放在管体右边 -->
      <div class="thermo-scale">
        <div v-for="(mark, index) in scaleMarks" :key="index"
             class="scale-line-wrapper"
             :class="{ 'major-mark': mark.isMajor, 'minor-mark': !mark.isMajor }"
             :style="{ top: mark.position + '%' }">
          <div class="scale-line"></div>
        </div>
      </div>
    </div>
    </div>

    <!-- 底部数值显示 -->
    <div class="thermo-value">
      <span class="value-number">{{ currentValue }}</span>
      <span class="value-unit">{{ unit }}</span>
    </div>

    <!-- 状态指示器 -->
    <div class="thermo-status" :class="statusClass">
      {{ statusText }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  title: { type: String, default: '温度' },
  value: { type: Number, default: 25 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '℃' },
  warningThreshold: { type: Number, default: 70 },
  dangerThreshold: { type: Number, default: 90 },
  sensorId: { type: String, default: '' }       // 传感器ID，用于点击交互
})

const emit = defineEmits(['click', 'dblclick'])

// 点击处理 - 通知父组件
function handleClick(event) {
  event.stopPropagation()
  if (props.sensorId) {
    console.log('🌡️ ThermometerGauge 点击:', props.sensorId)
    emit('click', props.sensorId)
  }
}

// 双击处理 - 通知父组件（飞到传感器位置）
function handleDblClick(event) {
  event.stopPropagation()
  if (props.sensorId) {
    console.log('🌡️ ThermometerGauge 双击:', props.sensorId)
    emit('dblclick', props.sensorId)
  }
}

const chartRef = ref(null)
const glowRef = ref(null)
let chartInstance = null
const currentValue = ref(props.value)

// 液柱高度百分比（用于光效定位）
const liquidHeightPercent = computed(() => {
  // 计算当前值在min-max范围内的百分比
  const range = props.max - props.min
  const percent = ((currentValue.value - props.min) / range) * 100
  // 限制在5%-98%之间（避免完全空或满）
  return Math.max(5, Math.min(98, percent))
})

// 根据温度状态返回对应的液柱渐变色
const getLiquidGradient = () => {
  const temp = currentValue.value

  if (temp >= props.dangerThreshold) {
    // 危险状态：红色系
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: '#991b1b' },     // 底部：深红色
      { offset: 0.25, color: '#b91c1c' },   // 下1/4：中红
      { offset: 0.5, color: '#dc2626' },    // 中间：亮红
      { offset: 0.75, color: '#ef4444' },   // 上1/4：浅红
      { offset: 0.9, color: '#f87171' },    // 近顶：亮红
      { offset: 1, color: '#fca5a5' }       // 顶部：最亮（高光点）
    ], false)
  } else if (temp >= props.warningThreshold) {
    // 警告状态：橙色系
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: '#92400e' },     // 底部：深橙色
      { offset: 0.25, color: '#b45309' },   // 下1/4：中橙
      { offset: 0.5, color: '#f59e0b' },    // 中间：明亮橙
      { offset: 0.75, color: '#fbbf24' },   // 上1/4：浅橙
      { offset: 0.9, color: '#fcd34d' },    // 近顶：亮橙
      { offset: 1, color: '#fde68a' }       // 顶部：最亮（高光点）
    ], false)
  } else {
    // 正常状态：蓝色系（默认）
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: '#195fb8' },     // 底部：深蓝色
      { offset: 0.25, color: '#2288cc' },   // 下1/4：中深蓝
      { offset: 0.5, color: '#2da8e0' },    // 中间：明亮蓝
      { offset: 0.75, color: '#40c4f5' },   // 上1/4：浅蓝
      { offset: 0.9, color: '#54d8ff' },    // 近顶：亮蓝色
      { offset: 1, color: '#7ae3ff' }       // 顶部：最亮（高光点）
    ], false)
  }
}

// 根据温度状态返回对应的阴影颜色
const getShadowColor = () => {
  const temp = currentValue.value

  if (temp >= props.dangerThreshold) {
    return 'rgba(239, 68, 68, 0.55)'   // 红色阴影
  } else if (temp >= props.warningThreshold) {
    return 'rgba(245, 158, 11, 0.50)'  // 橙色阴影
  } else {
    return 'rgba(84, 216, 255, 0.45)'   // 蓝色阴影（默认）
  }
}

// 计算状态
const statusClass = computed(() => {
  if (currentValue.value >= props.dangerThreshold) return 'danger'
  if (currentValue.value >= props.warningThreshold) return 'warning'
  return 'normal'
})

const statusText = computed(() => {
  if (currentValue.value >= props.dangerThreshold) return '危险'
  if (currentValue.value >= props.warningThreshold) return '警告'
  return '正常'
})

// 刻度标记
const scaleMarks = computed(() => {
  const marks = []
  // 生成5个刻度，并标记主/次
  const positions = [
    { percent: 0, isMajor: true },
    { percent: 25, isMajor: false },
    { percent: 50, isMajor: true },
    { percent: 75, isMajor: false },
    { percent: 100, isMajor: true }
  ]

  positions.forEach(({ percent, isMajor }) => {
    const val = props.min + (percent / 100) * (props.max - props.min)
    marks.push({
      value: Math.round(val),
      position: percent,
      isMajor: isMajor
    })
  })

  return marks
})

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return

  const option = {
    backgroundColor: 'transparent',

    grid: {
      top: 0,         /* 顶部不留白 */
      bottom: 0,      /* 底部不留白 */
      left: 0,        /* 左边不留白 - 关键！*/
      right: 0,       /* 右边不留白 - 关键！*/
      containLabel: false
    },

    xAxis: {
      show: false,
      type: 'category',
      data: ['temp']
    },

    yAxis: {
      show: false,
      min: props.min,
      max: props.max
    },

    series: [{
      type: 'bar',
      data: [currentValue.value],

      barWidth: 18,  /* 等于ECharts容器宽度，完全填满 */

      itemStyle: {
        // 动态渐变色：根据温度状态自动切换颜色
        color: getLiquidGradient(),

        // 仅底部圆角（液面在顶部是平的）
        borderRadius: [0, 0, 9, 9],  /* barWidth/2 */

        // 动态阴影颜色：跟随液柱颜色变化
        shadowColor: getShadowColor(),
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 0
      },

      // 动画效果
      animation: true,
      animationDuration: 800,
      animationEasing: 'elasticOut'
    }]
  }

  chartInstance.setOption(option, true)
}

// 监听值变化
watch(() => props.value, (newVal) => {
  currentValue.value = newVal
  if (chartInstance && !chartInstance.isDisposed()) {
    updateChart()
  }
}, { immediate: false })

// 响应式调整
const handleResize = () => {
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance?.resize()
  }
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)

  // 注意：不再使用模拟数据
  // 组件完全依赖 props.value 接收外部数据（WebSocket/MQTT）
  // 数据流：MQTT → useSensorManager → FactoryDetail → props.value → ThermometerGauge
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)

  // 安全销毁ECharts实例
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.dispose()
  }
  chartInstance = null
})
</script>

<style scoped>
.thermometer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 6px;  /* 增加上下padding，减少左右padding */
  background: transparent !important;
  border: none !important;
  width: 72px;   /* 收窄：从90px → 72px，更修长 */
  position: relative;

  /* 八角矩形裁剪 - 更细长的横向 */
  clip-path: polygon(
    6px 0, calc(100% - 6px) 0,
    100% 6px, 100% calc(100% - 6px),
    calc(100% - 6px) 100%, 6px 100%,
    0 calc(100% - 6px), 0 6px
  );

  /* 蓝色边框效果（用伪元素实现） */
}

/* 八角矩形边框 */
.thermometer-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  border: 1.5px solid rgba(74, 144, 255, 0.6);
  clip-path: polygon(
    6px 0, calc(100% - 6px) 0,
    100% 6px, 100% calc(100% - 6px),
    calc(100% - 6px) 100%, 6px 100%,
    0 calc(100% - 6px), 0 6px
  );
  pointer-events: none;
  z-index: 0;
}

/* 可点击状态：鼠标变手型 */
.thermometer-container.clickable {
  cursor: pointer;
}

/* 悬停效果：背景微亮 + 微上浮 */
.thermometer-container.clickable:hover {
  background: rgba(74, 144, 255, 0.15) !important;
  transform: translateY(-2px);
  transition: all 0.25s ease;
}

/* 点击时回到原位 */
.thermometer-container.clickable:active {
  transform: translateY(0);
}

/* 🎯 点击提示图标 - 参考GaugeChart */
.click-hint {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
  z-index: 20;
}

.thermometer-container.clickable:hover .click-hint {
  opacity: 1;
}

/* 标题样式 */
.thermo-title {
  font-size: 11px;
  font-weight: 600;
  color: #4a90ff;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
  text-align: center;
  position: relative;
  z-index: 1;
}

/* 温度计主体 */
.thermometer-body {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  position: relative;
  z-index: 1;
}

/* ====== 多层立体管体系统 ====== */

/* 外层管体 - 最外圈装饰边框（加宽以容纳刻度）*/
.thermo-tube {
  position: relative;
  width: 38px;      /* 加宽：30+8=38px，为右侧刻度留空间 */
  height: 125px;    /* 整体高度 */
  background: transparent;
  border: none;
  overflow: visible;  /* 允许显示所有子元素 */
}

/* 第1层：外玻璃管 - 浅色高光边框（居中） */
.thermo-tube::before {
  content: '';
  position: absolute;
  top: 0;
  left: 4px;        /* 左移4px，使玻璃管居中于38px宽度内 */
  width: 30px;       /* 玻璃管实际宽度 */
  height: 100%;
  background: linear-gradient(135deg,
    rgba(180, 195, 210, 0.25) 0%,
    rgba(140, 160, 175, 0.15) 50%,
    rgba(200, 215, 225, 0.3) 100%
  );
  border: 1.5px solid rgba(210, 220, 230, 0.6);  /* 细灰白边框 */
  border-radius: 15px;
  box-shadow:
    0 2px 8px rgba(0, 20, 40, 0.4),        /* 外部投影 */
    inset 0 1px 2px rgba(255, 255, 255, 0.15);  /* 内侧高光 */
  pointer-events: none;
  z-index: 1;
}

/* 第2层：中层暗槽 - 营造深度感（跟随L1） */
.thermo-tube::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 7px;        /* 4+3=7px，跟随L1 */
  right: 7px;       /* 对称 */
  bottom: 3px;
  background: linear-gradient(180deg,
    rgba(8, 18, 35, 0.7) 0%,
    rgba(15, 28, 48, 0.6) 50%,
    rgba(5, 12, 25, 0.75) 100%
  );
  border: 1px solid rgba(60, 80, 100, 0.3);
  border-radius: 12px;
  box-shadow:
    inset 0 2px 6px rgba(0, 10, 25, 0.7),   /* 内凹阴影 - 关键！*/
    inset 0 -1px 3px rgba(100, 130, 160, 0.15),  /* 底部微光 */
    0 1px 2px rgba(0, 0, 0, 0.2);           /* 微弱外部阴影 */
  pointer-events: none;
  z-index: 2;
}

/* 第3层：内凹液柱容器 - 浅色系（包含ECharts）*/
.thermo-inner-tube {
  position: absolute;
  top: 5px;
  left: 9px;        /* 居中于30px玻璃管：(30-18)/2 = 6, 6+3=9 */
  width: 20px;       /* 加宽以容纳ECharts */
  bottom: 5px;
  background: linear-gradient(180deg,
    rgba(180, 200, 220, 0.25) 0%,      /* 顶部：很浅的蓝灰色 */
    rgba(150, 175, 200, 0.2) 50%,       /* 中间：浅灰蓝 */
    rgba(120, 150, 185, 0.3) 100%       /* 底部：稍深但仍然浅 */
  );
  border-radius: 9px;
  box-shadow:
    inset 0 1px 3px rgba(80, 110, 140, 0.25),   /* 轻微内凹 */
    inset 0 -1px 2px rgba(200, 220, 240, 0.15);  /* 底部微光 */
  border: 1px solid rgba(100, 130, 165, 0.25);
  overflow: visible;     /* 允许溢出显示完整柱子 */
  z-index: 3;

  /* 用flex让ECharts容器水平居中 */
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

/* 液柱流动光效层 - 跟随液柱高度动态定位 */
.thermo-liquid-glow {
  position: absolute;
  left: 2px;
  right: 2px;
  bottom: 3px;              /* 从底部开始 */

  /* 高度由JS动态计算 = 当前液柱高度 */
  height: var(--liquid-height, 80%);   /* CSS变量，JS动态更新 */

  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(122, 227, 255, 0.15) 20%,     /* 顶部过渡 */
    rgba(84, 216, 255, 0.25) 40%,      /* 上部高光区 ⭐*/
    rgba(255, 255, 255, 0.18) 55%,     /* 中间反光点 ⭐⭐*/
    rgba(84, 216, 255, 0.20) 70%,      /* 下部过渡 */
    rgba(30, 100, 180, 0.10) 90%,      /* 底部深色 */
    transparent 100%
  );
  background-size: 100% 200%;
  border-radius: 0 0 8px 8px;          /* 匹配液柱底部圆角 */
  pointer-events: none;
  z-index: 6;                          /* 在液柱上方 */
  mix-blend-mode: overlay;
  overflow: hidden;

  /* 动画：光带在液柱体内上下浮动 */
  animation: liquidGlowFlow 2.5s ease-in-out infinite;
}

/* 液柱本体内流动动画 - 像液体内部的气泡/波纹 */
@keyframes liquidGlowFlow {
  0% {
    background-position: 0% 85%;       /* 光带靠近底部 */
    opacity: 0.8;
  }
  35% {
    background-position: 0% 15%;       /* 光带上升到上部 */
    opacity: 1;
  }
  65% {
    background-position: 0% 15%;       /* 在上部停留片刻 */
    opacity: 1;
  }
  100% {
    background-position: 0% 85%;       /* 回落到底部 */
    opacity: 0.8;
  }
}

/* ECharts容器 - 让它自然居中 */
.thermo-chart {
  width: 18px !important;     /* 接近内层宽度 */
  height: 113px !important;

  /* 不再强制设置left/top，让flex布局控制位置 */
  position: relative;         /* 改为相对定位 */
  top: auto !important;
  left: auto !important;
  z-index: 4;

  /* 微调垂直位置 */
  margin: 0 auto;
}

/* 刻度线 - 隐藏（太小了看不清）*/
/* 刻度线容器 - 右侧（绝对定位每根线）*/
.thermo-scale {
  position: absolute;
  left: 32px;            /* 在L1玻璃管右边 (4+30-2=32) */
  top: 10px;             /* 管体顶部留白 */
  bottom: 10px;          /* 管体底部留白 */
  width: 6px;            /* 刻度区域宽度 */
  z-index: 10;
}

/* 单个刻度线包装器 - 用百分比定位 */
.scale-line-wrapper {
  position: absolute;
  left: 0;
  width: 100%;
  height: 0;             /* 高度为0，由线条决定 */
  transform: translateY(-50%);  /* 垂直居中 */
}

/* 主刻度样式（0%, 50%, 100%）- 长且粗 */
.major-mark .scale-line {
  width: 6px;            /* 较长 */
  height: 2px;           /* 较粗 */
  background: rgba(210, 225, 240, 0.9);    /* 更亮 */
  border-radius: 1px;
  box-shadow:
    0 0 4px rgba(180, 200, 220, 0.7),
    0 0 2px rgba(255, 255, 255, 0.5);
}

/* 次刻度样式（25%, 75%）- 短且细 */
.minor-mark .scale-line {
  width: 4px;            /* 较短 */
  height: 1px;           /* 较细 */
  background: rgba(190, 205, 220, 0.65);   /* 稍暗 */
  border-radius: 0.5px;
  box-shadow:
    0 0 2px rgba(170, 190, 210, 0.4);
}

/* 底部数值 - 缩小版 */
.thermo-value {
  margin-top: 6px;
  display: flex;
  align-items: baseline;
  gap: 1px;
  position: relative;
  z-index: 1;
}

.value-number {
  font-size: 16px;
  font-weight: bold;
  color: #54d8ff;
  text-shadow: 0 0 6px rgba(84, 216, 255, 0.4);
  font-family: 'Courier New', monospace;
}

.value-unit {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
}

/* 状态指示 - 缩小版 */
.thermo-status {
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}

.thermo-status.normal {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.thermo-status.warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  animation: pulse-warning 2s ease-in-out infinite;
}

.thermo-status.danger {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  animation: pulse-danger 1s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes pulse-danger {
  0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
  50% { opacity: 0.7; box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
}
</style>