<template>
  <div class="radar-chart-panel" v-if="visible">
    <svg class="octagon-neon-svg" viewBox="0 0 240 240" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;">
      <defs>
        <linearGradient id="radarFlowOuter" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent"/>
          <stop offset="40%" stop-color="rgba(74,144,255,0)"/>
          <stop offset="48%" stop-color="rgba(74,144,255,0.5)"/>
          <stop offset="50%" stop-color="rgba(66,226,245,0.65)"/>
          <stop offset="52%" stop-color="rgba(74,144,255,0.5)"/>
          <stop offset="60%" stop-color="rgba(74,144,255,0)"/>
          <stop offset="100%" stop-color="transparent"/>
        </linearGradient>

        <linearGradient id="radarFlowMid" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent"/>
          <stop offset="43%" stop-color="rgba(116,192,255,0)"/>
          <stop offset="48%" stop-color="rgba(116,192,255,0.85)"/>
          <stop offset="50%" stop-color="#a0f0ff"/>
          <stop offset="52%" stop-color="rgba(116,192,255,0.85)"/>
          <stop offset="57%" stop-color="rgba(116,192,255,0)"/>
          <stop offset="100%" stop-color="transparent"/>
        </linearGradient>

        <linearGradient id="radarFlowCore" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent"/>
          <stop offset="46%" stop-color="rgba(210,235,250,0)"/>
          <stop offset="49%" stop-color="#e8f4fc"/>
          <stop offset="50%" stop-color="#ffffff"/>
          <stop offset="51%" stop-color="#e8f4fc"/>
          <stop offset="54%" stop-color="rgba(210,235,250,0)"/>
          <stop offset="100%" stop-color="transparent"/>
        </linearGradient>

        <filter id="radarBlurOuter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="radarBlurMid" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        <path id="radarOctPath"
          d="M 8,0 L 232,0 L 240,8 L 240,232 L 232,240 L 8,240 L 0,232 L 0,8 Z"
          fill="none"/>
      </defs>

      <use href="#radarOctPath"
           stroke="rgba(74,144,255,0.5)"
           stroke-width="2"
           fill="none"/>

      <use href="#radarOctPath"
           stroke="rgba(180,215,240,0.35)"
           stroke-width="1.5"
           fill="none"/>

      <use href="#radarOctPath"
           stroke="url(#radarFlowOuter)"
           stroke-width="5"
           stroke-dasharray="96 192"
           fill="none"
           filter="url(#radarBlurOuter)"
           class="radar-energy-flow-outer"/>

      <use href="#radarOctPath"
           stroke="url(#radarFlowMid)"
           stroke-width="3"
           stroke-dasharray="96 192"
           fill="none"
           filter="url(#radarBlurMid)"
           class="radar-energy-flow-mid"/>

      <use href="#radarOctPath"
           stroke="url(#radarFlowCore)"
           stroke-width="1.2"
           stroke-dasharray="96 192"
           fill="none"
           class="radar-energy-flow-core"/>
    </svg>

    <button @click="$emit('close')" class="close-btn">《</button>

    <div class="chart-container" ref="chartRef"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  productionStats: {
    type: Object,
    required: true
  },
  deviceStats: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

const chartRef = ref(null)
let chartInstance = null

const radarData = computed(() => {
  const { totalOrders, todayOutput, qualityRate, oeeRate, energyConsumption } = props.productionStats
  const { running, fault, total: deviceTotal } = props.deviceStats

  return [
    { name: '产能达成', value: Number(((todayOutput / totalOrders) * 100).toFixed(1)) },
    { name: '良品指标', value: Number(qualityRate.toFixed(1)) },
    { name: '设备效率', value: Number(oeeRate.toFixed(1)) },
    { name: '能耗管控', value: calculateEnergyScore(energyConsumption) },
    { name: '设备利用', value: Number(((running / deviceTotal) * 100).toFixed(1)) },
    { name: '运行稳定', value: Number(((1 - fault / deviceTotal) * 100).toFixed(1)) }
  ]
})

function calculateEnergyScore(energy) {
  const baseScore = 85
  const efficiency = Math.max(0, Math.min(100, baseScore - (energy / 200)))
  return Number(efficiency.toFixed(1))
}

function initChart() {
  if (!chartRef.value || !props.visible) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const option = {
    backgroundColor: 'transparent',
    radar: {
      indicator: radarData.value.map(item => ({ name: item.name, max: 100 })),
      shape: 'polygon',
      splitNumber: 4,
      radius: '75%',
      center: ['50%', '50%'],
      axisName: {
        color: 'rgba(220, 230, 255, 0.9)',
        fontSize: 10,
        fontWeight: 500,
        padding: [2, 3]
      },
      splitLine: { lineStyle: { color: 'rgba(200, 220, 255, 0.15)' } },
      splitArea: {
        areaStyle: {
          color: [
            'rgba(96, 156, 255, 0.03)',
            'rgba(96, 156, 255, 0.06)',
            'rgba(96, 156, 255, 0.09)',
            'rgba(96, 156, 255, 0.12)'
          ]
        }
      },
      axisLine: { lineStyle: { color: 'rgba(200, 220, 255, 0.2)' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: radarData.value.map(item => item.value),
        name: '当前状态',
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: 2,
          color: '#609cff',
          shadowColor: 'rgba(96, 156, 255, 0.5)',
          shadowBlur: 8
        },
        areaStyle: {
          color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
            { offset: 0, color: 'rgba(96, 156, 255, 0.4)' },
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
      backgroundColor: 'rgba(10, 20, 35, 0.92)',
      borderColor: 'rgba(96, 156, 255, 0.5)',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: function(params) {
        const data = params.data
        let html = '<div style="font-weight:600;margin-bottom:8px;color:#609cff;">车间综合评估</div>'
        radarData.value.forEach((item, idx) => {
          const status = item.value >= 90 ? '✅' : item.value >= 75 ? '🟡' : '🔴'
          html += `<div style="margin:4px 0;display:flex;justify-content:space-between;gap:16px;">
                    <span>${status} ${item.name}</span>
                    <strong>${data.value[idx]}%</strong></div>`
        })
        return html
      }
    }
  }

  chartInstance.setOption(option, true)
}

let resizeTimer = null
function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { chartInstance?.resize() }, 100)
}

watch(() => props.visible, (newVal) => {
  if (newVal) setTimeout(() => initChart(), 50)
}, { immediate: true })

onMounted(() => window.addEventListener('resize', handleResize))
onBeforeUnmount(() => {
  if (resizeTimer) clearTimeout(resizeTimer)
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.radar-chart-panel {
  position: fixed;
  top: 70px;
  left: 360px;
  z-index: 999;
  background: transparent !important;
  background-color: transparent !important;
  padding: 6px;
  width: 240px;
  height: 240px;
  clip-path: polygon(
    8px 0, calc(100% - 8px) 0,
    100% 8px, 100% calc(100% - 8px),
    calc(100% - 8px) 100%, 8px 100%,
    0 calc(100% - 8px), 0 8px
  );
  animation: fadeInScale 0.25s ease-out;
}

@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.radar-energy-flow-outer,
.radar-energy-flow-mid,
.radar-energy-flow-core {
  animation: radarEnergyFlow 6s linear infinite;
}

@keyframes radarEnergyFlow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -288; }
}

.close-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: rgba(150, 180, 220, 0.7);
  font-size: 12px;
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #609cff;
  transform: scale(1.15);
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>