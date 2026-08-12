<template>
  <div class="eq-dash-chart" :class="{ collapsed: isCollapsed }">
    <div class="eqdc-header" @click="isCollapsed = !isCollapsed">
      <span class="eqdc-title">地震活动概览</span>
      <div class="eqdc-tags">
        <span class="eqdc-tag global">全球</span>
        <span class="eqdc-tag mag">≥ M3.0</span>
      </div>
      <span class="eqdc-collapse">{{ isCollapsed ? '▸' : '▾' }}</span>
    </div>
    <div class="eqdc-body" v-show="!isCollapsed">
      <div ref="chartRef" class="eqdc-canvas"></div>
      <div class="eqdc-footer">
        <div class="eqdc-stat">
          <span class="eqdc-stat-val">{{ totalCount }}</span>
          <span class="eqdc-stat-label">总次数</span>
        </div>
        <div class="eqdc-stat">
          <span class="eqdc-stat-val">{{ maxMag.toFixed(1) }}</span>
          <span class="eqdc-stat-label">最大震级</span>
        </div>
        <div class="eqdc-stat">
          <span class="eqdc-stat-val">{{ avgMag.toFixed(1) }}</span>
          <span class="eqdc-stat-label">平均震级</span>
        </div>
        <div class="eqdc-stat">
          <span class="eqdc-stat-val">{{ deepCount }}</span>
          <span class="eqdc-stat-label">深源(&gt;100km)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useScenarioStore } from '../../stores/scenarioStore.js'

const store = useScenarioStore()
const isCollapsed = ref(false)
const chartRef = ref(null)
let chart = null

const filteredData = computed(() => (store.earthquakeData || []).filter(q => q.mag >= 3.0))

const totalCount = computed(() => filteredData.value.length)
const maxMag = computed(() => {
  if (!filteredData.value.length) return 0
  return Math.max(...filteredData.value.map(q => q.mag))
})
const avgMag = computed(() => {
  if (!filteredData.value.length) return 0
  return filteredData.value.reduce((s, q) => s + q.mag, 0) / filteredData.value.length
})
const deepCount = computed(() => {
  if (!filteredData.value.length) return 0
  return filteredData.value.filter(q => q.depth > 100).length
})

function depthToColor(depth) {
  if (depth < 30) return 'rgb(200,160,120)'
  if (depth < 70) return 'rgb(175,130,90)'
  if (depth < 150) return 'rgb(150,100,60)'
  return 'rgb(125,65,35)'
}

function buildDailyData() {
  const data = (store.earthquakeData || []).filter(q => q.mag >= 3.0)
  if (!data.length) return []

  const dayMs = 86400000
  const times = data.map(q => q.time).sort((a, b) => a - b)
  const start = times[0]
  const end = times[times.length - 1]
  const days = Math.ceil((end - start) / dayMs) + 1

  const dailyMap = {}
  for (let i = 0; i < days; i++) {
    const key = new Date(start + i * dayMs).toISOString().slice(5, 10)
    dailyMap[key] = { count: 0, quakes: [] }
  }

  data.forEach(q => {
    const key = new Date(q.time).toISOString().slice(5, 10)
    if (dailyMap[key]) {
      dailyMap[key].count++
      dailyMap[key].quakes.push(q)
    }
  })

  return Object.entries(dailyMap).map(([date, val]) => ({
    date,
    count: val.count,
    quakes: val.quakes,
  }))
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, null, { devicePixelRatio: 2 })

  const daily = buildDailyData()
  const dates = daily.map(d => d.date)
  const counts = daily.map(d => d.count)

  const scatterData = daily.flatMap(d =>
    d.quakes.map(q => [
      new Date(q.time).toISOString().slice(5, 10),
      q.mag,
      q.depth,
      q.mag > 5 ? q.place : '',
    ])
  )

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const date = params[0]?.axisValue || ''
        let html = `<div style="font-weight:600;margin-bottom:4px;color:#e2e8f0">${date}</div>`
        params.forEach(p => {
          if (p.seriesName === '次数') {
            html += `<div style="margin:1px 0;color:#cbd5e1">${p.seriesName}: <b style="color:#f1f5f9">${p.value}</b></div>`
          }
        })
        return html
      },
    },
    legend: {
      data: ['次数', '事件'],
      bottom: 0,
      textStyle: { color: '#e2e8f0', fontSize: 11, fontWeight: 500 },
      itemWidth: 10,
      itemHeight: 6,
      itemGap: 20,
    },
    grid: {
      left: 12,
      right: 16,
      top: 12,
      bottom: 28,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#e2e8f0',
        fontSize: 10,
        fontWeight: 500,
        interval: 4,
      },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '次',
        nameTextStyle: { color: '#e2e8f0', fontSize: 10, fontWeight: 500 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#e2e8f0', fontSize: 10, fontWeight: 500 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      {
        type: 'value',
        name: 'M',
        min: 0,
        max: Math.max(10, Math.ceil(maxMag.value) + 1),
        nameTextStyle: { color: '#e2e8f0', fontSize: 10, fontWeight: 500 },
        splitLine: { show: false },
        axisLabel: { color: '#e2e8f0', fontSize: 10, fontWeight: 500 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    series: [
      {
        name: '次数',
        type: 'bar',
        data: counts,
        barWidth: 8,
        itemStyle: {
          borderRadius: [2, 2, 0, 0],
          color: 'rgba(59, 130, 246, 0.85)',
        },
        emphasis: {
          itemStyle: { color: 'rgba(59, 130, 246, 1)' },
        },
      },
      {
        name: '事件',
        type: 'scatter',
        yAxisIndex: 1,
        data: scatterData,
        symbolSize: (val) => Math.max(4, Math.min(val[1] * 4, 14)),
        itemStyle: {
          color: (params) => {
            const depth = params.data[2] || 0
            return depthToColor(depth)
          },
          opacity: 1,
          borderColor: 'rgba(255,255,255,0.3)',
          borderWidth: 0.5,
        },
        emphasis: {
          scale: 1.3,
        },
        z: 2,
      },
    ],
    animationDuration: 400,
    animationEasing: 'linear',
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

watch(() => store.earthquakeData, () => {
  if (chart) {
    const daily = buildDailyData()
    const counts = daily.map(d => d.count)
    const scatterData = daily.flatMap(d =>
      d.quakes.map(q => [
        new Date(q.time).toISOString().slice(5, 10),
        q.mag,
        q.depth,
        q.mag > 5 ? q.place : '',
      ])
    )
    chart.setOption({
      xAxis: { data: daily.map(d => d.date) },
      series: [
        { data: counts },
        { data: scatterData },
      ],
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.eq-dash-chart {
  background: transparent;
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s;
}

.eq-dash-chart.collapsed {
  border-color: rgba(59, 130, 246, 0.12);
}

.eqdc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid rgba(59, 130, 246, 0.12);
}

.eqdc-header:hover {
  background: rgba(59, 130, 246, 0.04);
}

.eqdc-title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  flex: 1;
}

.eqdc-tags {
  display: flex;
  gap: 6px;
}

.eqdc-tag {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 2px;
  font-weight: 500;
  line-height: 1.4;
}

.eqdc-tag.global {
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.eqdc-tag.mag {
  background: rgba(245, 158, 11, 0.1);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.eqdc-collapse {
  font-size: 11px;
  color: #475569;
  transition: transform 0.2s;
}

.eqdc-body {
  padding: 10px 6px 6px;
}

.eqdc-canvas {
  width: 100%;
  height: 280px;
}

.eqdc-footer {
  display: flex;
  justify-content: space-around;
  padding: 6px 0 2px;
  border-top: 1px solid rgba(59, 130, 246, 0.1);
  margin-top: 2px;
}

.eqdc-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.eqdc-stat-val {
  font-size: 17px;
  font-weight: 700;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
}

.eqdc-stat-label {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>