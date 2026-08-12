<template>
  <div
    class="humidity-gauge-container"
    :class="{ 'clickable': !!sensorId }"
    @click="handleClick"
    @dblclick="handleDblClick"
  >
    <!-- 标题 - 在最上方 -->
    <div class="gauge-title">{{ title }}</div>

    <!-- 外层发光圆 - 固定尺寸正圆 -->
    <div class="gauge-outer-ring">
      <!-- 主表盘 -->
      <div ref="gaugeRef" class="gauge-chart"></div>

      <!-- 玻璃高光层 -->
      <div class="glass-overlay"></div>

      <!-- 数值显示 -->
      <div class="center-value">
        <span class="value-number">{{ currentValue }}</span>
        <span class="value-unit">{{ unit }}</span>
      </div>
    </div>

    <!-- 状态指示 - 在圆环下方（标题下方）-->
    <div class="gauge-status" :class="statusClass">{{ statusText }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  title: { type: String, default: '湿度' },
  value: { type: Number, default: 55 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '%RH' },
  warningThreshold: { type: Number, default: 70 },
  dangerThreshold: { type: Number, default: 85 },
  sensorId: { type: String, default: '' }
})

const emit = defineEmits(['click', 'dblclick'])

const gaugeRef = ref(null)
let chartInstance = null
const currentValue = ref(props.value)

// 状态计算
const statusClass = computed(() => {
  if (currentValue.value >= props.dangerThreshold) return 'danger'
  if (currentValue.value >= props.warningThreshold) return 'warning'
  return 'normal'
})

const statusText = computed(() => {
  if (currentValue.value >= props.dangerThreshold) return '过湿'
  if (currentValue.value >= props.warningThreshold) return '偏高'
  return '正常'
})

// 获取当前状态的渐变色
const getGaugeColors = () => {
  const val = currentValue.value

  if (val >= props.dangerThreshold) {
    // 危险：红色系 - ECharts标准对象格式
    return [
      { offset: 0, color: '#991b1b' },
      { offset: 0.5, color: '#dc2626' },
      { offset: 1, color: '#fca5a5' }
    ]
  } else if (val >= props.warningThreshold) {
    // 警告：橙色系
    return [
      { offset: 0, color: '#92400e' },
      { offset: 0.5, color: '#f59e0b' },
      { offset: 1, color: '#fde68a' }
    ]
  } else {
    // 正常：青蓝色系
    return [
      { offset: 0, color: '#164e63' },   /* 深青 */
      { offset: 0.5, color: '#22d3ee' },  /* 亮青 */
      { offset: 1, color: '#a5f3fc' }     /* 浅青（高光）*/
    ]
  }
}

// 获取指针和中心点颜色
const getPointerColor = () => {
  const val = currentValue.value
  if (val >= props.dangerThreshold) return '#fca5a5'
  if (val >= props.warningThreshold) return '#fde68a'
  return '#a5f3fc'
}

// 初始化图表
const initChart = () => {
  if (!gaugeRef.value) return
  
  chartInstance = echarts.init(gaugeRef.value, null, { renderer: 'canvas' })
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return

  const option = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      center: ['50%', '52%'],       // ✅ 稍微偏下，给底部状态留空间
      radius: '92%',               // ✅ 增大到92%，贴合外圈！
      startAngle: 225,             // ✅ 起始角度（270度弧形）
      endAngle: -45,               // ✅ 结束角度（270度 = 225 - (-45)）

      // ✨ 进度条（实际值）- 亮色填充！
      progress: {
        show: true,
        width: 5,
        roundCap: true,
        itemStyle: {
          color: (() => {
            try {
              const colors = getGaugeColors()
              return new echarts.graphic.LinearGradient(0, 0, 1, 0, colors || [])
            } catch (e) {
              // 安全回退：默认青蓝色
              return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#164e63' },
                { offset: 1, color: '#22d3ee' }
              ])
            }
          })()
        }
      },
      
      // 主刻度圆环 - 连接所有刻度线的圆弧轨道！
      axisLine: {
        lineStyle: {
          width: 3,   /* 圆弧宽度：3px（比进度条5px细一点）*/
          color: [
            [1, new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: 'rgba(100, 160, 220, 0.35)' },    // ✅ 提高可见度：连接圆弧
              { offset: 0.5, color: 'rgba(130, 185, 240, 0.3)' },
              { offset: 1, color: 'rgba(100, 160, 220, 0.35)' }
            ])]
          ],
          shadowColor: 'rgba(120, 180, 255, 0.2)',  /* ✅ 添加柔和光晕 */
          shadowBlur: 4,
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      },
      
      // 进度条（实际值）
      pointer: {
        icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
        length: '60%',
        width: 8,
        itemStyle: {
          color: getPointerColor(),
          shadowColor: getPointerColor().replace(')', ', 0.8)').replace('rgb', 'rgba'),
          shadowBlur: 12,
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      },
      
      // 中心轴点
      anchor: {
        show: true,
        size: 16,
        itemStyle: {
          color: '#fff',
          shadowColor: getPointerColor(),
          shadowBlur: 15,
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      },
      
      // 主刻度线 - 缩短！
      axisTick: {
        show: true,
        splitNumber: 5,
        length: 4,     /* ✅ 缩短：8px → 4px */
        lineStyle: {
          color: 'rgba(148, 210, 255, 0.5)',
          width: 1.2,   /* 稍微细一点 */
          shadowColor: 'rgba(100, 180, 255, 0.3)',
          shadowBlur: 2
        }
      },

      // 次刻度线 - 更短！
      minorTick: {
        show: true,
        splitNumber: 4,
        length: 2,     /* ✅ 缩短：4px → 2px */
        lineStyle: {
          color: 'rgba(148, 210, 255, 0.3)',  /* 更淡 */
          width: 0.8    /* 更细 */
        }
      },
      
      // 刻度值标签（隐藏数字）
      axisLabel: {
        show: false  // ✅ 不显示10、20、30等数字
      },
      
      // 分隔线（主刻度位置）- 缩短！
      splitLine: {
        show: true,
        length: 5,     /* ✅ 缩短：14px → 5px */
        lineStyle: {
          color: 'rgba(148, 210, 255, 0.45)',  /* 稍微淡一点 */
          width: 1.5,   /* 细一点 */
          shadowColor: 'rgba(100, 200, 255, 0.3)',
          shadowBlur: 3
        }
      },
      
      // 当前值显示（由HTML覆盖，这里隐藏）
      detail: {
        show: false
      },
      
      data: [{
        value: currentValue.value,
        name: '',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, getGaugeColors())
        },
        title: {
          offsetCenter: [0, '-25%']
        }
      }]
    }]
  }
  
  chartInstance.setOption(option, true)
}

// 点击事件
function handleClick(event) {
  event.stopPropagation()
  if (props.sensorId) {
    console.log('💧 HumidityGauge 点击:', props.sensorId)
    emit('click', props.sensorId)
  }
}

// 双击事件
function handleDblClick(event) {
  event.stopPropagation()
  if (props.sensorId) {
    console.log('💧 HumidityGauge 双击:', props.sensorId)
    emit('dblclick', props.sensorId)
  }
}

// 监听值变化
watch(() => props.value, (newVal) => {
  currentValue.value = newVal
  if (chartInstance && !chartInstance.isDisposed()) {
    updateChart()
  }
}, { immediate: false })

/* 窗口resize处理 */
const handleResize = () => {
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.resize()
  }
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.dispose()
  }
  chartInstance = null
})
</script>

<style scoped>
.humidity-gauge-container {
  position: relative;
  width: 110px;    /* ✅ 放大：90px → 110px */
  height: 140px;   /* ✅ 放大：115px → 140px */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  cursor: default;
  transition: all 0.3s ease;
  background: transparent !important;
  padding-top: 3px;
}

.humidity-gauge-container.clickable {
  cursor: pointer;
}

.humidity-gauge-container.clickable:hover {
  transform: translateY(-3px);
}

/* 外层发光圆 - 放大版（100×100）*/
.gauge-outer-ring {
  position: relative;
  width: 100px;   /* ✅ 放大：80px → 100px */
  height: 100px;  /* ✅ 放大：80px → 100px */
  border-radius: 50%;
  background: transparent !important;

  /* 柔和发光边框 */
  box-shadow:
    0 0 8px rgba(34, 211, 238, 0.15),
    0 0 16px rgba(34, 211, 238, 0.08),

    /* 内层边缘高光 */
    inset 0 1px 2px rgba(148, 210, 255, 0.25),
    inset 0 -1px 2px rgba(0, 10, 25, 0.18),

    /* 轻微深度阴影 */
    0 1px 3px rgba(0, 0, 0, 0.12);

  /* 边框 */
  border: 1.5px solid rgba(74, 158, 255, 0.45);

  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

/* 悬停时增强发光 */
.humidity-gauge-container.clickable:hover .gauge-outer-ring {
  box-shadow:
    0 0 25px rgba(34, 211, 238, 0.35),
    0 0 50px rgba(34, 211, 238, 0.22),
    0 0 75px rgba(34, 211, 238, 0.12),
    inset 0 1px 2px rgba(148, 210, 255, 0.6),
    inset 0 -1px 2px rgba(0, 10, 25, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: rgba(74, 158, 255, 0.7);
}

/* 图表容器 */
.gauge-chart {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}

/* ✨ 玻璃高光层 - 实现玻璃质感 */
.glass-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  z-index: 3;   /* 在ECharts之上，数值之下 */
  pointer-events: none;

  /* 玻璃渐变 - 模拟玻璃反光和折射 */
  background:
    /* 顶部高光（主光源）*/
    radial-gradient(
      ellipse 120% 60% at 50% 15%,
      rgba(255, 255, 255, 0.25) 0%,
      rgba(255, 255, 255, 0.1) 30%,
      transparent 70%
    ),

    /* 左上角斜向反光 */
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(255, 255, 255, 0.05) 40%,
      transparent 60%
    ),

    /* 底部边缘光 */
    radial-gradient(
      ellipse 80% 40% at 50% 90%,
      rgba(148, 210, 255, 0.12) 0%,
      transparent 70%
    );

  /* 玻璃边框高光 */
  box-shadow:
    /* 内部顶部高光 */
    inset 0 2px 4px rgba(255, 255, 255, 0.25),

    /* 内部底部暗角 */
    inset 0 -2px 6px rgba(0, 20, 50, 0.15),

    /* 玻璃表面微光 */
    0 1px 3px rgba(148, 210, 255, 0.2);

  /* 玻璃边缘 */
  border: 1px solid rgba(255, 255, 255, 0.18);
}

/* 数值显示 - 放大版 */
.center-value {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  text-align: center;
  pointer-events: none;
}

.value-number {
  font-size: 16px;   /* ✅ 放大：13px → 16px */
  font-weight: 700;
  font-family: 'Arial', sans-serif;
  background: linear-gradient(180deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 4px rgba(34, 211, 238, 0.35));
}

.value-unit {
  font-size: 11px;   /* ✅ 放大：9px → 11px */
  font-weight: 600;
  color: rgba(148, 210, 255, 0.8);
  margin-left: 2px;
}

/* 标题 - 在最上方 */
.gauge-title {
  position: relative;
  top: 0;
  font-size: 12px;
  font-weight: 600;
  color: #94daff;
  text-shadow: 0 0 6px rgba(148, 210, 255, 0.4);
  letter-spacing: 1.5px;
  z-index: 10;
  pointer-events: none;
  white-space: nowrap;
  margin-bottom: 3px;
}

/* 状态指示 - 在圆环和标题下方（文档流中）*/
.gauge-status {
  position: relative;    /* ✅ 改为相对定位，脱离圆环 */
  width: fit-content;    /* 自适应宽度 */
  margin: 2px auto 0;   /* 居中显示，上边距2px */
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;       /* 稍微放大一点 */
  font-weight: 600;
  z-index: 10;
  pointer-events: none;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.gauge-status.normal {
  color: #22d3ee;
  background: rgba(34, 211, 238, 0.15);
  border: 1px solid rgba(34, 211, 238, 0.35);
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.2);
}

.gauge-status.warning {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.35);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.3);
  animation: pulse-warning 2s ease-in-out infinite;
}

.gauge-status.danger {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.35);
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.4);
  animation: pulse-danger 1s ease-in-out infinite;
}

/* 警告脉冲动画 */
@keyframes pulse-warning {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.3);
  }
  50% {
    opacity: 0.75;
    box-shadow: 0 0 18px rgba(251, 191, 36, 0.5);
  }
}

/* 危险快速闪烁 */
@keyframes pulse-danger {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 14px rgba(248, 113, 113, 0.4);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 22px rgba(248, 113, 113, 0.7);
  }
}

/* 点击提示图标 */
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

.humidity-gauge-container.clickable:hover .click-hint {
  opacity: 1;
}
</style>