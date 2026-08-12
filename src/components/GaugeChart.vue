<template>
  <!-- 
    gauge-wrapper：仪表盘的外层容器
    - 每个 gauge-wrapper 就是一个传感器仪表盘卡片
    - clickable 样式：当传入了 sensorId 时，鼠标悬停会有上浮动画，提示可点击
  -->
  <div
    class="gauge-wrapper"
    :class="{ clickable: !!sensorId }"
    @click="handleClick"
    @dblclick="handleDblClick"
  >
    <!-- ECharts 会渲染到这个 div 里，画出半圆仪表盘 -->
    <div ref="gaugeRef" class="gauge-chart"></div>
    <!-- 可点击时右上角显示 🎯 图标，提示用户点击可以飞到传感器位置 -->
    <div class="click-hint" v-if="sensorId">🎯</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

// ==================== 外部传入的 props ====================
const props = defineProps({
  value:    { type: Number, default: 0 },       // 传感器当前数值
  title:    { type: String, default: '' },       // 传感器名称，显示在仪表盘下方
  unit:     { type: String, default: '' },       // 单位，如 ℃、%RH
  min:      { type: Number, default: 0 },        // 仪表盘最小值
  max:      { type: Number, default: 100 },      // 仪表盘最大值
  color:    { type: String, default: '#4a90ff' },// 正常状态下的主题色
  sensorId: { type: String, default: '' },       // 传感器 ID，传入后仪表盘可点击
  status:   { type: String, default: 'normal' }  // 报警状态：normal / warning / alarm
})

const emit = defineEmits(['click', 'dblclick'])

// ==================== 内部状态 ====================
const gaugeRef = ref(null)    // 模板中 ECharts 要挂载的 DOM 元素
let chart = null              // ECharts 实例，初始化后赋值
let isDestroyed = false       // 组件是否已销毁，防止销毁后还操作 chart

// ==================== 点击处理 ====================
// 点击仪表盘 → 通知父组件，父组件会调用 flyToSensor 飞到传感器位置
function handleClick(event) {
  event.stopPropagation()
  if (props.sensorId && !isDestroyed) {
    console.log('🎯 GaugeChart 点击:', props.sensorId)
    emit('click', props.sensorId)
  }
}

function handleDblClick(event) {
  event.stopPropagation()
  if (props.sensorId && !isDestroyed) {
    console.log('🎯 GaugeChart 双击:', props.sensorId)
    emit('dblclick', props.sensorId)
  }
}

// ==================== ECharts 配置 ====================
// 根据报警状态（正常/警告/报警）返回不同的颜色配置
function getOption() {
  const isAlarm = props.status === 'alarm'
  const isWarning = props.status === 'warning'

  // 进度条颜色：报警=红色渐变，警告=黄色渐变，正常=主题色渐变
  const progressColor = isAlarm
    ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: '#ff4444' },
        { offset: 1, color: '#dc2626' }
      ])
    : isWarning
      ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#facc15' },
          { offset: 1, color: '#f59e0b' }
        ])
      : new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: `${props.color}cc` },
          { offset: 1, color: props.color }
        ])

  // 数值颜色、单位颜色、标题颜色、背景轨道颜色：都跟着报警状态变
  const valueColor = isAlarm ? '#ff4444' : isWarning ? '#facc15' : '#e2e8f0'
  const unitColor = isAlarm ? '#ff8888' : isWarning ? '#fde68a' : '#cbd5e1'
  const titleColor = isAlarm ? '#ff8888' : isWarning ? '#fde68a' : '#cbd5e1'
  const trackColor = isAlarm ? 'rgba(255,68,68,0.18)' : isWarning ? 'rgba(250,204,21,0.18)' : `${props.color}25`

  return {
    series: [
      // 装饰光环：外层淡色光晕，跟随主题色
      {
        type: 'gauge',
        radius: '93%',
        center: ['50%', '60%'],
        startAngle: 200,
        endAngle: -20,
        min: 0, max: 100,
        pointer: { show: false },
        detail: { show: false },
        title: { show: false },
        progress: { show: false },
        axisLine: {
          lineStyle: {
            width: 16,
            color: [[1, `${props.color}12`]]
          }
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value: 100 }]
      },
      // 主仪表盘
      {
      type: 'gauge',           // ECharts 仪表盘类型
      startAngle: 200,         // 起始角度 200°（左下）
      endAngle: -20,           // 结束角度 -20°（右下），形成 220° 的半圆弧
      min: props.min,
      max: props.max,
      center: ['50%', '60%'],  // 圆心位置：水平居中，垂直偏下
      radius: '88%',           // 半径占容器 88%

      // 指针：彩色小圆点 + 发光
      pointer: {
        show: true,
        length: '52%',
        width: 6,
        icon: 'circle',
        itemStyle: {
          color: progressColor,
          shadowBlur: 6,
          shadowColor: isAlarm ? 'rgba(255,68,68,0.5)' : isWarning ? 'rgba(250,204,21,0.5)' : `${props.color}80`,
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      },

      // 进度条：细线 + 发光，不堆满颜色
      progress: {
        show: true,
        width: 1,
        roundCap: true,
        itemStyle: {
          color: progressColor,
          shadowBlur: 8,
          shadowColor: isAlarm ? 'rgba(255,68,68,0.4)' : isWarning ? 'rgba(250,204,21,0.4)' : `${props.color}66`,
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      },

      // 背景轨道：细线，半透明
      axisLine: {
        lineStyle: {
          width: 4,
          color: [[1, trackColor]]
        }
      },

      // 刻度线：半透明主题色，有层次感
      splitLine: {
        show: true,
        length: 8,
        lineStyle: {
          width: 1,
          color: `${props.color}20`
        }
      },
      // 小刻度：更细更淡
      axisTick: {
        show: true,
        length: 4,
        lineStyle: {
          width: 0.5,
          color: `${props.color}25`
        }
      },
      axisLabel: { show: false },

      // 中心数值显示：大数字 + 小单位
      detail: {
        valueAnimation: true,   // 数值变化时动画过渡
        fontSize: 18,
        fontWeight: 'bold',
        offsetCenter: [0, '40%'],  // 位置偏移
        color: valueColor,
        formatter: function(val) {
          return `{value|${val}}{unit|${props.unit}}`  // 富文本：大数值 + 小单位
        },
        rich: {
          value: { fontSize: 19, fontWeight: 'bold', fontFamily: 'Arial, sans-serif' },
          unit: { fontSize: 10, padding: [1, 0, 0, 3], fontWeight: 'normal', color: unitColor }
        }
      },

      // 标题：传感器名称，显示在仪表盘下方
      title: {
        show: true,
        offsetCenter: [0, '68%'],
        fontSize: 11,
        fontWeight: '500',
        color: titleColor
      },

      data: [{ value: props.value, name: props.title }]
    }],
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'   // 缓出动画
  }
}

// ==================== 初始化 ECharts ====================
function init() {
  // 已销毁 / DOM 还没挂载 / 已经初始化过 → 跳过
  if (isDestroyed || !gaugeRef.value || chart) return

  try {
    // 检查 DOM 是否已有尺寸，没有则延迟重试
    const rect = gaugeRef.value.getBoundingClientRect()
    if (!rect.width || !rect.height) {
      setTimeout(init, 100)
      return
    }

    // 创建 ECharts 实例，绑定到 DOM
    chart = echarts.init(gaugeRef.value, null, { renderer: 'canvas' })
    chart.setOption(getOption())
  } catch (e) {
    console.warn('GaugeChart init error:', e.message)
    setTimeout(init, 200)  // 出错后重试
  }
}

// ==================== 更新数值 ====================
function update() {
  if (isDestroyed || !chart) return
  try {
    chart.setOption({
      series: [
        {},
        { data: [{ value: props.value, name: props.title }] }
      ]
    })
  } catch (e) { /* ignore */ }
}

// ==================== 销毁 ====================
function destroy() {
  isDestroyed = true
  if (chart) {
    try { chart.dispose() } catch (e) { /* ignore */ }
    chart = null
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  isDestroyed = false
  nextTick(() => { init() })  // 等 DOM 渲染完再初始化
})

// 监听 value 变化 → 更新指针
watch(() => props.value, () => { update() }, { immediate: false })

// 监听 status 变化 → 重新生成配置（切换报警颜色）
watch(() => props.status, () => {
  if (chart && !isDestroyed) {
    chart.setOption(getOption(), true)
  }
}, { immediate: false })

onUnmounted(() => { destroy() })
</script>

<style scoped>
/*
  gauge-wrapper：仪表盘外层容器
  - 每个仪表盘卡片的外框
  - 透明背景，无边框，圆角 10px
  - 当传入 sensorId 时，添加 clickable 类 → 鼠标悬停上浮 + 显示 🎯
*/
.gauge-wrapper {
  background: transparent;
  border: none;
  border-radius: 0px;
  padding: 5px;
  position: relative;
  cursor: default;
  transition: all 0.25s ease;
}

/* 可点击的仪表盘：鼠标变手型 */
.gauge-wrapper.clickable {
  cursor: pointer;
}

/* 悬停效果：蓝色背景微亮 + 微微上浮 2px */
.gauge-wrapper.clickable:hover {
  background: rgba(74, 144, 255, 0.2);
  border-radius: 12px;
  transform: translateY(-2px);
}

/* 点击时回到原位 */
.gauge-wrapper.clickable:active {
  transform: translateY(0);
}

/* ECharts 渲染区域，高度 115px */
.gauge-chart {
  width: 100%;
  height: 115px;
}

/* 🎯 图标：默认隐藏，悬停时显示，提示用户可点击飞到传感器 */
.click-hint {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.gauge-wrapper.clickable:hover .click-hint {
  opacity: 1;
}
</style>