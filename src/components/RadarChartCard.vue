<template>
  <div class="radar-chart-card">
    <div class="card-header">
      <h3 class="card-title">车间运行综合评估</h3>
      <span class="update-time">更新于 {{ updateTime }}</span>
    </div>

    <div class="chart-container" ref="chartRef"></div>

    <div class="dimension-legend">
      <div
        v-for="(item, index) in dimensions"
        :key="index"
        class="legend-item"
        :class="{ 'warning': item.value < 70, 'good': item.value >= 85 }"
      >
        <span class="legend-label">{{ item.name }}</span>
        <span class="legend-value">{{ item.value }}%</span>
        <div class="value-bar">
          <div
            class="value-fill"
            :style="{ width: item.value + '%', background: getBarColor(item.value) }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref(null)
let chartInstance = null
const updateTime = ref('')

const dimensions = ref([
  { name: '产能达成', value: 87 },
  { name: '良品指标', value: 92 },
  { name: '设备效率', value: 78 },
  { name: '能耗管控', value: 73 },
  { name: '在岗人力', value: 95 },
  { name: '安全考核', value: 88 }
])

function getBarColor(value) {
  if (value >= 85) return 'linear-gradient(90deg, #10b981, #34d399)'
  if (value >= 70) return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  return 'linear-gradient(90deg, #ef4444, #f87171)'
}

function initChart() {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  const option = {
    backgroundColor: 'transparent',
    radar: {
      indicator: [
        { name: '产能达成', max: 100 },
        { name: '良品指标', max: 100 },
        { name: '设备效率', max: 100 },
        { name: '能耗管控', max: 100 },
        { name: '在岗人力', max: 100 },
        { name: '安全考核', max: 100 }
      ],
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: 'rgba(200, 220, 255, 0.9)',
        fontSize: 11,
        fontWeight: 500,
        padding: [3, 5]
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(200, 220, 255, 0.15)'
        }
      },
      splitArea: {
        areaStyle: {
          color: [
            'rgba(96, 156, 255, 0.04)',
            'rgba(96, 156, 255, 0.08)',
            'rgba(96, 156, 255, 0.12)',
            'rgba(96, 156, 255, 0.16)'
          ]
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(200, 220, 255, 0.2)'
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [87, 92, 78, 73, 95, 88],
        name: '当前状态',
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: '#609cff',
          shadowColor: 'rgba(96, 156, 255, 0.5)',
          shadowBlur: 8
        },
        areaStyle: {
          color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
            { offset: 0, color: 'rgba(96, 156, 255, 0.35)' },
            { offset: 1, color: 'rgba(96, 156, 255, 0.08)' }
          ])
        },
        itemStyle: {
          color: '#609cff',
          borderColor: '#fff',
          borderWidth: 2
        }
      }]
    }],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(10px)',
      borderColor: 'rgba(255, 255, 255, 0.25)',
      borderWidth: 1,
      textStyle: {
        color: 'rgba(200, 220, 255, 0.95)',
        fontSize: 12
      },
      formatter: function(params) {
        const data = params.data
        let html = '<div style="font-weight:600;margin-bottom:8px;">当前状态</div>'
        const names = ['产能达成', '良品指标', '设备效率', '能耗管控', '在岗人力', '安全考核']
        data.value.forEach((val, idx) => {
          const status = val >= 85 ? '✅' : val >= 70 ? '⚠️' : '❌'
          html += `<div style="margin:3px 0;">${status} ${names[idx]}：<b>${val}%</b></div>`
        })
        return html
      }
    }
  }

  chartInstance.setOption(option)
}

function updateTimeStr() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  updateTime.value = `${h}:${m}:${s}`
}

let resizeTimer = null
function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    chartInstance?.resize()
  }, 100)
}

let updateTimer = null
onMounted(() => {
  initChart()
  updateTimeStr()
  updateTimer = setInterval(updateTimeStr, 1000)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (updateTimer) clearInterval(updateTimer)
  if (resizeTimer) clearTimeout(resizeTimer)
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.radar-chart-card {
  width: 320px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  padding: 18px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: rgba(220, 230, 255, 0.95);
  letter-spacing: 1px;
}

.update-time {
  font-size: 11px;
  color: rgba(150, 170, 200, 0.7);
  font-family: 'Courier New', monospace;
}

.chart-container {
  width: 100%;
  height: 240px;
  margin-bottom: 16px;
}

.dimension-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: grid;
  grid-template-columns: 70px 40px 1fr;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  transition: all 0.3s ease;
}

.legend-item.warning {
  opacity: 0.75;
}

.legend-item.good {
  opacity: 1;
}

.legend-label {
  font-size: 12px;
  color: rgba(200, 220, 255, 0.85);
  font-weight: 500;
}

.legend-value {
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 220, 255, 0.95);
  text-align: right;
  font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
}

.value-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.value-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 0 6px rgba(96, 156, 255, 0.3);
}
</style>