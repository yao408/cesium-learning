<template>
  <div class="chart-wrapper">
    <div class="chart-header">
      <span class="chart-title">地震活动统计</span>
      <span class="chart-subtitle">近30天数据</span>
    </div>
    <div ref="chartRef" class="chart-container"></div>
    <div class="chart-stats">
      <div class="stat-item">
        <span class="stat-value">{{ totalCount }}</span>
        <span class="stat-label">总次数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ maxMagnitude }}</span>
        <span class="stat-label">最大震级</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ avgMagnitude }}</span>
        <span class="stat-label">平均震级</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: {
    type: Array,
    default: () => [
      { magnitude: '3.0-3.9', count: 156, color: '#52c41a' },
      { magnitude: '4.0-4.9', count: 89, color: '#73d13d' },
      { magnitude: '5.0-5.9', count: 45, color: '#faad14' },
      { magnitude: '6.0-6.9', count: 23, color: '#fa8c16' },
      { magnitude: '7.0-7.9', count: 8, color: '#f5222d' },
      { magnitude: '8.0+', count: 2, color: '#cf1322' }
    ]
  }
})

const chartRef = ref(null)
let chart = null

const totalCount = computed(() => props.data.reduce((sum, d) => sum + d.count, 0))
const maxMagnitude = computed(() => {
  const max = Math.max(...props.data.map(d => parseFloat(d.magnitude)))
  return max.toFixed(1)
})
const avgMagnitude = computed(() => {
  const total = props.data.reduce((sum, d) => sum + d.count * parseFloat(d.magnitude), 0)
  return (total / totalCount.value).toFixed(1)
})

function initChart() {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      textStyle: { color: '#333', fontSize: 12 },
      formatter: (params) => {
        const data = params[0]
        return `
          <div style="font-weight:500;margin-bottom:4px">${data.name}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${data.color}"></span>
            <span>次数: ${data.value}</span>
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.map(d => d.magnitude),
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#666',
        fontSize: 11,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed'
        }
      },
      axisLabel: {
        color: '#999',
        fontSize: 11
      }
    },
    series: [{
      type: 'bar',
      data: props.data.map((d, i) => ({
        value: d.count,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: d.color },
            { offset: 1, color: d.color + '80' }
          ]),
          borderRadius: [6, 6, 0, 0]
        }
      })),
      barWidth: '60%',
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.1)'
        }
      },
      animationDuration: 1000,
      animationEasing: 'elasticOut'
    }]
  }
  
  chart.setOption(option)
}

function handleResize() {
  chart?.resize()
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.chart-wrapper {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.chart-subtitle {
  font-size: 11px;
  color: #999;
}

.chart-container {
  width: 100%;
  height: 200px;
}

.chart-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #2d8a4e;
}

.stat-label {
  font-size: 11px;
  color: #999;
}
</style>