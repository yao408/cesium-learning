import { nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

export function useRealtimeCharts(chartRef, sensorHistoryData, allSensorsList) {
  const MAX_HISTORY_POINTS = 30

  let realtimeCharts = {}

  function initRealtimeChart(visibleIds) {
    if (!chartRef.value) {
      console.warn('⚠️ chartRef 不存在')
      return
    }
    try {
      const idSet = visibleIds && visibleIds.size > 0 ? visibleIds : new Set()
      const existingIds = new Set(Object.keys(realtimeCharts))

      if (idSet.size === 0) {
        console.log('📊 没有需要显示的图表，清空全部')
        chartRef.value.innerHTML = ''
        disposeAllCharts()
        return
      }

      const toAdd = [...idSet].filter(id => !existingIds.has(id))
      const toRemove = [...existingIds].filter(id => !idSet.has(id))

      console.log(`📊 增量更新: +${toAdd.length}个 -${toRemove.length}个`)

      toRemove.forEach(id => {
        const chart = realtimeCharts[id]
        try { chart?.dispose() } catch (e) {}
        delete realtimeCharts[id]
        const container = document.getElementById(`mini-chart-${id}`)
        if (container) container.remove()
        console.log(`  🗑️ 移除: ${id}`)
      })

      toAdd.forEach(id => {
        const sensor = allSensorsList.value.find(s => s.id === id)
        if (!sensor) return
        const container = document.createElement('div')
        container.className = 'realtime-mini-chart'
        container.id = `mini-chart-${id}`
        container.style.width = '280px'
        container.style.height = '180px'
        container.style.display = 'block'
        container.style.position = 'relative'
        container.style.overflow = 'hidden'
        container.style.background = 'transparent'
        container.style.border = '1px solid rgba(59,130,246,0.2)'
        container.style.borderRadius = '8px'
        container.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(59,130,246,0.08) inset'
        container.style.transition = 'all 0.3s ease'
        container.style.setProperty('--sensor-color', sensor.color)
        chartRef.value.appendChild(container)
        console.log(`  ✅ 新增容器: ${sensor.name}`)

        setTimeout(() => {
          if (!document.contains(container)) return
          initSingleChart(container, sensor)
        }, 150)
      })
    } catch (e) {
      console.error('❌ 实时图表网格初始化失败:', e.message)
    }
  }

  function initSingleChart(container, sensor) {
    try {
      const cw = container?.offsetWidth ?? 0
      const ch = container?.offsetHeight ?? 0
      const style = container ? window.getComputedStyle(container) : null
      console.log(`🔍 initSingleChart ${sensor.name}: offsetW=${cw} offsetH=${ch} | display=${style?.display} | document.contains=${document.contains(container)}`)
      if (!container || !container.offsetWidth || !container.offsetHeight) {
        console.error(`❌ ${sensor.name} 容器无效`)
        return
      }

      const chart = echarts.init(container)
      realtimeCharts[sensor.id] = chart
      updateSingleSensorChart(sensor)
      window.addEventListener('resize', () => { chart?.resize() })
      console.log(`  📈 ${sensor.name} 图表初始化完成`)
    } catch (e) {
      console.error(`❌ 传感器 ${sensor.name} 图表创建失败:`, e.message)
    }
  }

  function updateSingleSensorChart(sensor) {
    try {
      const chart = realtimeCharts[sensor.id]
      if (!chart) return

      const history = sensorHistoryData.value[sensor.id] || []
      const sensorDefaults = {
        '温度-1': { base: 55, range: 3 },
        '湿度-1': { base: 30, range: 5 },
        '湿度-2': { base: 50, range: 4 },
        '气体-1': { base: 28, range: 6 },
        '振动-1': { base: 3, range: 1 }
      }
      const config = sensorDefaults[sensor.name] || { base: 50, range: 5 }

      let realData = history.map(h => h.value)
      if (realData.length < MAX_HISTORY_POINTS) {
        const needFill = MAX_HISTORY_POINTS - realData.length
        for (let i = needFill - 1; i >= 0; i--) {
          const variation = (Math.sin(i * 0.5) * 0.7 + Math.random() * 0.6 - 0.3) * config.range
          realData.unshift(Number((config.base + variation).toFixed(1)))
        }
      }
      realData = realData.slice(-MAX_HISTORY_POINTS)

      const allValues = realData.filter(v => v !== null && v !== undefined)
      let yAxisMin = sensor.min
      let yAxisMax = sensor.max

      if (allValues.length > 0) {
        const dataMin = Math.min(...allValues)
        const dataMax = Math.max(...allValues)
        let range = dataMax - dataMin || 1

        const sensorRange = sensor.max - sensor.min || 1
        if (range < sensorRange * 0.05) {
          range = sensorRange * 0.1
          const center = (dataMin + dataMax) / 2
          yAxisMin = center - range / 2
          yAxisMax = center + range / 2
        } else {
          yAxisMin = dataMin - range * 0.1
          yAxisMax = dataMax + range * 0.1
        }

        const safeMargin = sensorRange * 0.5
        yAxisMin = Math.max(sensor.min - safeMargin, yAxisMin)
        yAxisMax = Math.min(sensor.max + safeMargin, yAxisMax)
      }

      chart.setOption({
        backgroundColor: 'transparent',

        title: {
          text: `${sensor.name}`,
          left: 'center',
          top: 2,
          textStyle: {
            color: '#94a3b8',
            fontSize: 11,
            fontWeight: '500',
            textShadowColor: 'rgba(59, 130, 246, 0.3)',
            textShadowBlur: 4
          }
        },

        grid: { top: 28, right: 8, bottom: 22, left: 35, containLabel: false },

        xAxis: {
          type: 'category',
          data: Array.from({ length: MAX_HISTORY_POINTS }, (_, i) => i + 1),
          show: false,
          boundaryGap: false,
        },

        yAxis: {
          type: 'value',
          min: yAxisMin,
          max: yAxisMax,
          axisLabel: {
            color: '#64748b',
            fontSize: 9,
            fontWeight: 'normal',
            formatter: (val) => Number.isInteger(val) ? val : val.toFixed(1)
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(56, 189, 248, 0.08)',
              type: 'solid',
              width: 1
            }
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: 'rgba(56, 189, 248, 0.15)',
              width: 1
            }
          },
          axisTick: {
            show: true,
            lineStyle: {
              color: 'rgba(56, 189, 248, 0.2)',
              width: 1
            }
          }
        },

        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 23, 42, 0.98)',
          borderColor: sensor.color,
          borderWidth: 1,
          textStyle: { color: '#e2e8f0', fontSize: 10 },
          formatter: function(params) {
            if (!params || !params.length) return ''
            const value = params[0].value
            const trend = realData.length > 1
              ? (value > realData[realData.length - 2] ? ' ↗' : ' ↘')
              : ''
            return `<div style="font-weight:bold;color:${sensor.color}">${sensor.name}${trend}</div>` +
                   `<div style="margin-top:4px;font-size:12px"><b>${value}</b> ${sensor.unit}</div>`
          }
        },

        series: [{
          name: sensor.name,
          type: 'line',
          smooth: true,
          symbol: 'none',

          lineStyle: {
            width: 2,
            color: sensor.color,
            shadowColor: sensor.color,
            shadowBlur: 8,
            shadowOffsetY: 0
          },

          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: sensor.color + '40' },
              { offset: 0.5, color: sensor.color + '15' },
              { offset: 1, color: sensor.color + '02' }
            ])
          },

          data: realData
        }],

        animation: true,
        animationDuration: 300,
        animationEasing: 'cubicOut'
      })
    } catch (error) {
      console.error(`❌ 更新 ${sensor.name} 图表失败:`, error.message)
    }
  }

  function updateRealtimeChart() {
    if (!Object.keys(realtimeCharts).length) return
    const filteredSensors = realtimeFilterType.value === 'all'
      ? allSensorsList.value
      : allSensorsList.value.filter(s => s.type === realtimeFilterType.value)

    filteredSensors.forEach(sensor => {
      updateSingleSensorChart(sensor)
    })
  }

  function disposeAllCharts() {
    Object.values(realtimeCharts).forEach(chart => {
      try { chart?.dispose() } catch (e) {}
    })
    realtimeCharts = {}
  }

  function getChartsCount() {
    return Object.keys(realtimeCharts).length
  }

  onBeforeUnmount(() => {
    disposeAllCharts()
  })

  return {
    MAX_HISTORY_POINTS,
    initRealtimeChart,
    updateRealtimeChart,
    disposeAllCharts,
    getChartsCount
  }
}