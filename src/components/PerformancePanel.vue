<template>
  <div class="performance-panel" :class="{ expanded: isExpanded }">
    <div class="panel-header" @click="isExpanded = !isExpanded">
      <span class="panel-icon">⚡</span>
      <span class="panel-title">性能监控</span>
      <span class="fps-badge" :class="fpsClass">{{ fps }} FPS</span>
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
    </div>

    <div v-if="isExpanded" class="panel-content">
      <!-- 场景统计 -->
      <div class="stat-section">
        <h4>📊 场景对象</h4>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-label">三角面</span>
            <span class="stat-value">{{ stats.triangles.toLocaleString() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">网格数</span>
            <span class="stat-value">{{ stats.meshes }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">树木</span>
            <span class="stat-value">{{ stats.trees }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">灯光</span>
            <span class="stat-value">{{ stats.lights }}</span>
          </div>
        </div>
      </div>

      <!-- 性能瓶颈 -->
      <div class="bottleneck-section">
        <h4>🔍 性能瓶颈分析</h4>
        <div class="bottleneck-list">
          <div class="bottleneck-item critical">
            <span class="bottleneck-icon">🔴</span>
            <span class="bottleneck-name">阴影贴图: {{ shadowSize }}×{{ shadowSize }}</span>
            <button @click="toggleShadow" class="action-btn">
              {{ shadowEnabled ? '关闭' : '开启' }}
            </button>
          </div>
          <div class="bottleneck-item warning">
            <span class="bottleneck-icon">🟡</span>
            <span class="bottleneck-name">OutlinePass 边缘发光</span>
            <button @click="toggleOutline" class="action-btn">
              {{ outlineEnabled ? '关闭' : '开启' }}
            </button>
          </div>
          <div class="bottleneck-item info">
            <span class="bottleneck-icon">🔵</span>
            <span class="bottleneck-name">FXAA 抗锯齿</span>
            <button @click="toggleFXAA" class="action-btn">
              {{ fxaaEnabled ? '关闭' : '开启' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 快速优化 -->
      <div class="optimize-section">
        <h4>🚀 一键优化</h4>
        <div class="optimize-buttons">
          <button @click="optimizeForPerformance" class="optimize-btn primary">
            ⚡ 极速模式 (推荐)
          </button>
          <button @click="resetToDefault" class="optimize-btn secondary">
            ↺ 恢复默认
          </button>
        </div>
        <p class="optimize-hint">点击"极速模式"可立即提升至 30+ FPS</p>
      </div>

      <!-- 帧时间图表 -->
      <div class="chart-section">
        <h4>📈 帧时间趋势</h4>
        <div class="mini-chart">
          <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" preserveAspectRatio="none">
            <polyline
              :points="chartPoints"
              fill="none"
              :stroke="fpsColor"
              stroke-width="2"
            />
          </svg>
          <div class="chart-labels">
            <span>{{ fpsHistory[0] || 0 }}ms</span>
            <span>{{ fpsHistory[Math.floor(fpsHistory.length/2)] || 0 }}ms</span>
            <span>{{ fpsHistory[fpsHistory.length-1] || 0 }}ms</span>
          </div>
        </div>
      </div>

      <!-- 详细分析 -->
      <div class="analysis-section">
        <h4>🔬 详细分析</h4>
        <button @click="showDetailedAnalysis = !showDetailedAnalysis" class="toggle-analysis-btn">
          {{ showDetailedAnalysis ? '收起分析' : '展开详细分析' }}
        </button>

        <div v-if="showDetailedAnalysis" class="detailed-content">
          <!-- ⚠️ 重要提示 -->
          <div style="
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #000;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
            animation: pulse 2s infinite;
          ">
            👇 向下滚动一点，找到「栏杆优化分析」按钮 👇
          </div>

          <!-- 栏杆专项分析 (放在最显眼的位置) -->
          <div class="railing-analysis" style="
            background: rgba(251, 191, 36, 0.15);
            border: 3px solid #fbbf24;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
          ">
            <h5 style="
              color: #f59e0b;
              font-size: 18px;
              margin-bottom: 15px;
              text-align: center;
              text-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
            ">🚶‍♂️ ⭐ 栏杆优化分析 ⭐</h5>

            <button @click="analyzeRailings" class="analysis-btn" :disabled="isAnalyzingRailings" style="
              width: 100%;
              padding: 16px;
              background: linear-gradient(135deg, #f59e0b, #d97706);
              border: 3px solid #fbbf24;
              color: white;
              border-radius: 10px;
              cursor: pointer;
              font-size: 16px;
              font-weight: bold;
              box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
              transition: all 0.3s ease;
            " @mouseenter="$event.target.style.transform = 'scale(1.05)'" @mouseleave="$event.target.style.transform = 'scale(1)'">
              {{ isAnalyzingRailings ? '⏳ 分析中...' : '🔍 开始分析栏杆（点击这里！）' }}
            </button>

            <div v-if="railingAnalysisResult && !isAnalyzingRailings" class="railing-result">
              <!-- 概览 -->
              <div class="railing-summary">
                <div class="summary-item">
                  <span class="sum-label">总数量</span>
                  <span class="sum-value highlight">{{ railingAnalysisResult.summary.totalRailings }}</span>
                </div>
                <div class="summary-item">
                  <span class="sum-label">类型数</span>
                  <span class="sum-value">{{ railingAnalysisResult.summary.totalTypes }}</span>
                </div>
                <div class="summary-item">
                  <span class="sum-label">分布建筑</span>
                  <span class="sum-value">{{ railingAnalysisResult.summary.totalBuildings }}</span>
                </div>
                <div class="summary-item">
                  <span class="sum-label">预估面数</span>
                  <span class="sum-value warning">{{ formatNumber(railingAnalysisResult.summary.estimatedTriangles) }}</span>
                </div>
              </div>

              <!-- 类型列表 -->
              <div class="railing-types">
                <h6>📋 栏杆类型列表（按数量排序）</h6>
                <div class="type-list">
                  <div v-for="(type, idx) in railingAnalysisResult.typeList" :key="idx" class="type-item">
                    <span class="type-rank">#{{ idx + 1 }}</span>
                    <div class="type-info">
                      <span class="type-name" :title="type.name">{{ type.name }}</span>
                      <span class="type-stats">
                        <strong>{{ type.count }}</strong> 个
                        ({{ type.percentage }})
                        · 均 {{ formatNumber(type.avgTriangles) }} 面
                      </span>
                    </div>
                    <span class="type-total">{{ formatNumber(type.totalTriangles) }} 面</span>
                  </div>
                </div>
              </div>

              <!-- 建筑分布 -->
              <div class="building-dist">
                <h6>🏢 建筑分布</h6>
                <div class="building-list">
                  <div v-for="(bld, idx) in railingAnalysisResult.buildingList.slice(0, 8)" :key="idx" class="building-item">
                    <span class="bld-name" :title="bld.name">{{ bld.name }}</span>
                    <span class="bld-count">{{ bld.count }} 个栏杆</span>
                    <span class="bld-types">{{ bld.typeCount }} 种类型</span>
                  </div>
                </div>
              </div>

              <!-- 优化建议 -->
              <div class="optimization-plan">
                <h6>💡 优化建议</h6>
                <div class="plan-list">
                  <div v-for="(rec, idx) in railingAnalysisResult.recommendations" :key="idx" class="plan-item" :class="rec.priority">
                    <span class="priority-badge">{{ rec.priority === 'high' ? '🔴 高优先' : rec.priority === 'medium' ? '🟡 中优先' : '🟢 低优先' }}</span>
                    <div class="plan-content">
                      <strong>{{ rec.type.toUpperCase() }}: {{ rec.target }}</strong>
                      <p>{{ rec.reason }}</p>
                      <span class="gain">✨ {{ rec.estimatedGain }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 执行按钮 -->
              <div class="execute-section">
                <button @click="showMergePlan = !showMergePlan" class="plan-btn">
                  📝 {{ showMergePlan ? '隐藏' : '查看' }}合并方案
                </button>
                <button @click="executeRailingOptimization" class="execute-btn" :disabled="isOptimizing">
                  {{ isOptimizing ? '⏳ 优化中...' : '🚀 执行栏杆合并' }}
                </button>
              </div>

              <!-- 合并方案详情 -->
              <div v-if="showMergePlan && mergePlan" class="merge-plan-detail">
                <h6>📊 合并执行计划</h6>
                <div class="plan-overview">
                  <div class="overview-item">
                    <span>创建分组数</span>
                    <strong>{{ mergePlan.summary.groupsToCreate }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>合并对象总数</span>
                    <strong>{{ mergePlan.summary.totalObjectsToMerge }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>减少 Draw Call</span>
                    <strong class="highlight">{{ mergePlan.summary.estimatedDrawCallReduction }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>预计帧率提升</span>
                    <strong class="success">+{{ mergePlan.summary.estimatedFpsGain.toFixed(0) }} FPS</strong>
                  </div>
                </div>
                <div class="merge-groups-list">
                  <div v-for="(group, idx) in mergePlan.mergeGroups.slice(0, 10)" :key="idx" class="merge-group-item">
                    <span class="group-priority" :class="group.priority">{{ group.priority }}</span>
                    <span class="group-name">{{ group.groupName }}</span>
                    <span class="group-count">{{ group.objectCount }} 个</span>
                    <span class="group-reduction">↓ {{ group.reduction }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 对象分类统计 -->
          <div class="category-stats">
            <h5>📦 对象分类</h5>
            <div class="category-grid">
              <div v-for="(cat, idx) in objectCategories" :key="idx" class="category-item">
                <span class="cat-icon">{{ cat.icon }}</span>
                <span class="cat-name">{{ cat.name }}</span>
                <span class="cat-count">{{ cat.count }}</span>
                <span class="cat-percent">({{ cat.percent }}%)</span>
              </div>
            </div>
          </div>

          <!-- Top 10 最占资源对象 -->
          <div class="top-objects">
            <h5>⚠️ Top 10 最占资源对象</h5>
            <div class="top-list">
              <div v-for="(obj, idx) in topHeavyObjects" :key="idx" class="top-item" :class="getSeverityClass(obj.triangles)">
                <span class="rank">#{{ idx + 1 }}</span>
                <span class="obj-name" :title="obj.name">{{ obj.name }}</span>
                <span class="obj-tris">{{ formatNumber(obj.triangles) }} 面</span>
                <span class="obj-type">{{ obj.type }}</span>
              </div>
            </div>
          </div>

          <!-- 性能问题诊断 -->
          <div class="diagnosis">
            <h5>🩺 问题诊断</h5>
            <div class="diagnosis-list">
              <div v-for="(issue, idx) in performanceIssues" :key="idx" class="diagnosis-item" :class="issue.severity">
                <span class="issue-icon">{{ issue.icon }}</span>
                <div class="issue-content">
                  <span class="issue-title">{{ issue.title }}</span>
                  <p class="issue-desc">{{ issue.description }}</p>
                  <button @click="applyFix(issue.fix)" class="fix-btn">一键修复</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 栏杆专项分析 (提前到更显眼的位置) -->
          <div class="railing-analysis">
            <h5>🚶‍♂️ 栏杆优化分析</h5>
            <button @click="analyzeRailings" class="analysis-btn" :disabled="isAnalyzingRailings">
              {{ isAnalyzingRailings ? '⏳ 分析中...' : '🔍 开始分析栏杆' }}
            </button>

            <div v-if="railingAnalysisResult && !isAnalyzingRailings" class="railing-result">
              <!-- 概览 -->
              <div class="railing-summary">
                <div class="summary-item">
                  <span class="sum-label">总数量</span>
                  <span class="sum-value highlight">{{ railingAnalysisResult.summary.totalRailings }}</span>
                </div>
                <div class="summary-item">
                  <span class="sum-label">类型数</span>
                  <span class="sum-value">{{ railingAnalysisResult.summary.totalTypes }}</span>
                </div>
                <div class="summary-item">
                  <span class="sum-label">分布建筑</span>
                  <span class="sum-value">{{ railingAnalysisResult.summary.totalBuildings }}</span>
                </div>
                <div class="summary-item">
                  <span class="sum-label">预估面数</span>
                  <span class="sum-value warning">{{ formatNumber(railingAnalysisResult.summary.estimatedTriangles) }}</span>
                </div>
              </div>

              <!-- 类型列表 -->
              <div class="railing-types">
                <h6>📋 栏杆类型列表（按数量排序）</h6>
                <div class="type-list">
                  <div v-for="(type, idx) in railingAnalysisResult.typeList" :key="idx" class="type-item">
                    <span class="type-rank">#{{ idx + 1 }}</span>
                    <div class="type-info">
                      <span class="type-name" :title="type.name">{{ type.name }}</span>
                      <span class="type-stats">
                        <strong>{{ type.count }}</strong> 个
                        ({{ type.percentage }})
                        · 均 {{ formatNumber(type.avgTriangles) }} 面
                      </span>
                    </div>
                    <span class="type-total">{{ formatNumber(type.totalTriangles) }} 面</span>
                  </div>
                </div>
              </div>

              <!-- 建筑分布 -->
              <div class="building-dist">
                <h6>🏢 建筑分布</h6>
                <div class="building-list">
                  <div v-for="(bld, idx) in railingAnalysisResult.buildingList.slice(0, 8)" :key="idx" class="building-item">
                    <span class="bld-name" :title="bld.name">{{ bld.name }}</span>
                    <span class="bld-count">{{ bld.count }} 个栏杆</span>
                    <span class="bld-types">{{ bld.typeCount }} 种类型</span>
                  </div>
                </div>
              </div>

              <!-- 优化建议 -->
              <div class="optimization-plan">
                <h6>💡 优化建议</h6>
                <div class="plan-list">
                  <div v-for="(rec, idx) in railingAnalysisResult.recommendations" :key="idx" class="plan-item" :class="rec.priority">
                    <span class="priority-badge">{{ rec.priority === 'high' ? '🔴 高优先' : rec.priority === 'medium' ? '🟡 中优先' : '🟢 低优先' }}</span>
                    <div class="plan-content">
                      <strong>{{ rec.type.toUpperCase() }}: {{ rec.target }}</strong>
                      <p>{{ rec.reason }}</p>
                      <span class="gain">✨ {{ rec.estimatedGain }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 执行按钮 -->
              <div class="execute-section">
                <button @click="showMergePlan = !showMergePlan" class="plan-btn">
                  📝 {{ showMergePlan ? '隐藏' : '查看' }}合并方案
                </button>
                <button @click="executeRailingOptimization" class="execute-btn" :disabled="isOptimizing">
                  {{ isOptimizing ? '⏳ 优化中...' : '🚀 执行栏杆合并' }}
                </button>
              </div>

              <!-- 合并方案详情 -->
              <div v-if="showMergePlan && mergePlan" class="merge-plan-detail">
                <h6>📊 合并执行计划</h6>
                <div class="plan-overview">
                  <div class="overview-item">
                    <span>创建分组数</span>
                    <strong>{{ mergePlan.summary.groupsToCreate }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>合并对象总数</span>
                    <strong>{{ mergePlan.summary.totalObjectsToMerge }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>减少 Draw Call</span>
                    <strong class="highlight">{{ mergePlan.summary.estimatedDrawCallReduction }}</strong>
                  </div>
                  <div class="overview-item">
                    <span>预计帧率提升</span>
                    <strong class="success">+{{ mergePlan.summary.estimatedFpsGain.toFixed(0) }} FPS</strong>
                  </div>
                </div>
                <div class="merge-groups-list">
                  <div v-for="(group, idx) in mergePlan.mergeGroups.slice(0, 10)" :key="idx" class="merge-group-item">
                    <span class="group-priority" :class="group.priority">{{ group.priority }}</span>
                    <span class="group-name">{{ group.groupName }}</span>
                    <span class="group-count">{{ group.objectCount }} 个</span>
                    <span class="group-reduction">↓ {{ group.reduction }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 内存使用 -->
          <div class="memory-info">
            <h5>💾 内存估算</h5>
            <div class="memory-grid">
              <div class="memory-item">
                <span class="mem-label">几何体内存</span>
                <span class="mem-value">{{ formatMemory(estimatedMemory.geometry) }}</span>
              </div>
              <div class="memory-item">
                <span class="mem-label">纹理内存</span>
                <span class="mem-value">{{ formatMemory(estimatedMemory.textures) }}</span>
              </div>
              <div class="memory-item">
                <span class="mem-label">总估算</span>
                <span class="mem-value total">{{ formatMemory(estimatedMemory.total) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { analyzeRailings as analyzeRailingsUtil, getRailingMergePlan } from '../utils/railingAnalyzer.js'

const props = defineProps({
  scene: { type: Object, required: true },
  renderer: { type: Object, required: true },
  composer: { type: Object, required: true },
  outlinePass: { type: Object, required: true }
})

const isExpanded = ref(false)
const fps = ref(60)
const fpsHistory = ref([])
const chartWidth = 200
const chartHeight = 60
const maxHistoryPoints = 50
const showDetailedAnalysis = ref(false)

const shadowEnabled = ref(true)
const outlineEnabled = ref(true)
const fxaaEnabled = ref(true)

const isAnalyzingRailings = ref(false)
const railingAnalysisResult = ref(null)
const showMergePlan = ref(false)
const mergePlan = ref(null)
const isOptimizing = ref(false)

let frameCount = 0
let lastTime = performance.now()
let animationId = null

const stats = computed(() => {
  let triangles = 0
  let meshes = 0
  let trees = 0
  let lights = 0

  if (props.scene) {
    props.scene.traverse((child) => {
      if (child.isMesh) {
        meshes++
        if (child.geometry) {
          const geo = child.geometry
          if (geo.index) {
            triangles += geo.index.count / 3
          } else if (geo.attributes.position) {
            triangles += geo.attributes.position.count / 3
          }
        }
      }
      if (child.isLight) lights++
    })

    const treeGroup = props.scene.getObjectByName('roadTrees')
    if (treeGroup) {
      trees = Math.floor(treeGroup.children.length / 3)
    }
  }

  return { triangles: Math.round(triangles), meshes, trees, lights }
})

const objectCategories = computed(() => {
  const categories = {
    buildings: { name: '建筑模型', icon: '🏢', count: 0, triangles: 0 },
    trees: { name: '树木', icon: '🌲', count: 0, triangles: 0 },
    grounds: { name: '地面/道路', icon: '🛣️', count: 0, triangles: 0 },
    vehicles: { name: '车辆/AGV', icon: '🚗', count: 0, triangles: 0 },
    sensors: { name: '传感器', icon: '📡', count: 0, triangles: 0 },
    lights: { name: '灯光', icon: '💡', count: 0, triangles: 0 },
    other: { name: '其他', icon: '📦', count: 0, triangles: 0 }
  }

  if (!props.scene) return []

  props.scene.traverse((child) => {
    if (!child.isMesh) return

    const triCount = getTriangleCount(child)
    const name = (child.name || '').toLowerCase()
    const parentName = (child.parent?.name || '').toLowerCase()

    if (name.includes('building') || name.includes('wall') || name.includes('floor') || parentName.includes('building')) {
      categories.buildings.count++
      categories.buildings.triangles += triCount
    } else if (name.includes('tree') || parentName.includes('tree')) {
      categories.trees.count++
      categories.trees.triangles += triCount
    } else if (name.includes('ground') || name.includes('road') || name.includes('parking')) {
      categories.grounds.count++
      categories.grounds.triangles += triCount
    } else if (name.includes('agv') || name.includes('car') || name.includes('vehicle')) {
      categories.vehicles.count++
      categories.vehicles.triangles += triCount
    } else if (name.includes('sensor') || name.includes('temp') || name.includes('humidity')) {
      categories.sensors.count++
      categories.sensors.triangles += triCount
    } else {
      categories.other.count++
      categories.other.triangles += triCount
    }
  })

  const totalTris = Object.values(categories).reduce((sum, cat) => sum + cat.triangles, 0)

  return Object.entries(categories).map(([key, cat]) => ({
    ...key,
    ...cat,
    percent: totalTris > 0 ? ((cat.triangles / totalTris) * 100).toFixed(1) : 0
  }))
})

const topHeavyObjects = computed(() => {
  if (!props.scene) return []

  const objects = []
  props.scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      objects.push({
        name: child.name || child.type,
        type: child.type,
        triangles: getTriangleCount(child),
        uuid: child.uuid
      })
    }
  })

  return objects
    .sort((a, b) => b.triangles - a.triangles)
    .slice(0, 10)
})

const performanceIssues = computed(() => {
  const issues = []
  const { triangles, meshes, trees, lights } = stats.value

  if (triangles > 2000000) {
    issues.push({
      severity: 'critical',
      icon: '🔴',
      title: '三角面数严重超标',
      description: `当前 ${formatNumber(triangles)} 面，建议控制在 50万以内。这是性能低的主要原因！`,
      fix: 'reduceTriangles'
    })
  }

  if (meshes > 500) {
    issues.push({
      severity: 'critical',
      icon: '🔴',
      title: `网格数量过多 (${meshes}个)`,
      description: `正常场景应 < 500个，当前是 ${Math.round(meshes/500)} 倍！每个 Mesh 都会产生 Draw Call。`,
      fix: 'mergeMeshes'
    })
  }

  if (trees > 150) {
    issues.push({
      severity: 'warning',
      icon: '🟡',
      title: `树木数量过多 (${trees}棵)`,
      description: `${trees}棵树 × 每棵多个 Mesh = ${trees * 3}+ 个对象。建议使用合并或实例化渲染。`,
      fix: 'optimizeTrees'
    })
  }

  if (lights > 8) {
    issues.push({
      severity: 'warning',
      icon: '🟡',
      title: `灯光数量偏多 (${lights}个)`,
      description: `建议动态灯光 ≤ 4个，静态灯光 ≤ 8个。多余灯光会显著降低性能。`,
      fix: 'optimizeLights'
    })
  }

  if (shadowEnabled.value && shadowSize.value > 1024) {
    issues.push({
      severity: 'info',
      icon: '🔵',
      title: '阴影贴图分辨率过高',
      description: `当前 ${shadowSize.value}×${shadowSize.value}，建议降到 512×512 或 1024×1024。`,
      fix: 'toggleShadow'
    })
  }

  if (outlineEnabled.value) {
    issues.push({
      severity: 'info',
      icon: '🔵',
      title: 'OutlinePass 开启中',
      description: '边缘发光效果会增加额外的渲染 Pass，对性能有一定影响。',
      fix: 'toggleOutline'
    })
  }

  return issues
})

const estimatedMemory = computed(() => {
  let geometryBytes = 0
  let textureBytes = 0

  if (props.scene) {
    props.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geo = child.geometry
        geometryBytes += geo.attributes.position?.array?.byteLength || 0
        geometryBytes += geo.attributes.normal?.array?.byteLength || 0
        geometryBytes += geo.attributes.uv?.array?.byteLength || 0
        if (geo.index) {
          geometryBytes += geo.index.array.byteLength
        }

        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            textureBytes += estimateTextureMemory(mat)
          })
        } else {
          textureBytes += estimateTextureMemory(child.material)
        }
      }
    })
  }

  return {
    geometry: geometryBytes,
    textures: textureBytes,
    total: geometryBytes + textureBytes
  }
})

const shadowSize = computed(() => {
  if (!props.scene) return 0
  for (let child of props.scene.children) {
    if (child.isDirectionalLight && child.castShadow) {
      return child.shadow.mapSize.width
    }
  }
  return 0
})

const fpsClass = computed(() => {
  if (fps.value < 15) return 'danger'
  if (fps.value < 30) return 'warning'
  return 'good'
})

const fpsColor = computed(() => {
  if (fps.value < 15) return '#ef4444'
  if (fps.value < 30) return '#fbbf24'
  return '#22c55e'
})

const chartPoints = computed(() => {
  if (fpsHistory.value.length < 2) return ''
  const maxVal = Math.max(...fpsHistory.value, 33)
  return fpsHistory.value
    .map((val, idx) => {
      const x = (idx / (maxHistoryPoints - 1)) * chartWidth
      const y = chartHeight - (val / maxVal) * chartHeight * 0.9
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

function updateFPS() {
  frameCount++
  const currentTime = performance.now()
  const delta = currentTime - lastTime

  if (delta >= 1000) {
    const currentFPS = Math.round(frameCount * 1000 / delta)
    fps.value = currentFPS
    frameCount = 0
    lastTime = currentTime

    fpsHistory.value.push(Math.round(delta / frameCount || delta))
    if (fpsHistory.value.length > maxHistoryPoints) {
      fpsHistory.value.shift()
    }
  }

  animationId = requestAnimationFrame(updateFPS)
}

function toggleShadow() {
  shadowEnabled.value = !shadowEnabled.value
  if (!props.scene) return

  props.scene.traverse((child) => {
    if (child.isDirectionalLight) {
      child.castShadow = shadowEnabled.value
    }
  })
  props.renderer.shadowMap.enabled = shadowEnabled.value
}

function toggleOutline() {
  outlineEnabled.value = !outlineEnabled.value
  if (props.outlinePass && props.composer.passes) {
    const idx = props.composer.passes.indexOf(props.outlinePass)
    if (idx > -1) {
      if (outlineEnabled.value) {
        if (!props.composer.passes.includes(props.outlinePass)) {
          props.composer.passes.splice(1, 0, props.outlinePass)
        }
      } else {
        props.composer.passes.splice(idx, 1)
      }
    }
  }
}

function toggleFXAA() {
  fxaaEnabled.value = !fxaaEnabled.value
  if (!props.composer) return

  const fxaaPass = props.composer.passes.find(
    pass => pass.uniforms && pass.uniforms.resolution
  )
  if (fxaaPass) {
    const idx = props.composer.passes.indexOf(fxaaPass)
    if (fxaaEnabled.value) {
      if (idx === -1) {
        props.composer.addPass(fxaaPass)
      }
    } else {
      if (idx > -1) {
        props.composer.passes.splice(idx, 1)
      }
    }
  }
}

function optimizeForPerformance() {
  if (!shadowEnabled.value) toggleShadow()
  if (outlineEnabled.value) toggleOutline()
  if (fxaaEnabled.value) toggleFXAA()

  if (props.scene) {
    props.scene.traverse((child) => {
      if (child.isDirectionalLight && child.castShadow) {
        child.shadow.mapSize.width = 1024
        child.shadow.mapSize.height = 1024
      }
    })
  }
}

function resetToDefault() {
  if (!shadowEnabled.value) toggleShadow()
  if (!outlineEnabled.value) toggleOutline()
  if (!fxaaEnabled.value) toggleFXAA()

  if (props.scene) {
    props.scene.traverse((child) => {
      if (child.isDirectionalLight && child.castShadow) {
        child.shadow.mapSize.width = 4096
        child.shadow.mapSize.height = 4096
      }
    })
  }
}

function getTriangleCount(mesh) {
  if (!mesh.geometry) return 0
  const geo = mesh.geometry
  if (geo.index) {
    return geo.index.count / 3
  } else if (geo.attributes.position) {
    return geo.attributes.position.count / 3
  }
  return 0
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return Math.round(num).toString()
}

function formatMemory(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  } else if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + ' KB'
  }
  return bytes + ' B'
}

function estimateTextureMemory(material) {
  let bytes = 0
  if (!material) return bytes

  const textures = [
    material.map,
    material.normalMap,
    material.aoMap,
    material.emissiveMap,
    material.roughnessMap,
    material.metalnessMap
  ].filter(Boolean)

  textures.forEach(tex => {
    if (tex && tex.image) {
      const { width, height } = tex.image
      bytes += width * height * 4
    }
  })

  return bytes
}

function getSeverityClass(triangles) {
  if (triangles > 50000) return 'critical'
  if (triangles > 10000) return 'warning'
  return ''
}

function applyFix(fixType) {
  switch (fixType) {
    case 'reduceTriangles':
      console.log('💡 提示：需要手动优化模型或使用简化版GLB')
      alert('三角面数优化建议：\n\n1. 使用 Blender 降低模型面数\n2. 导入时启用 simplify 选项\n3. 对远处物体使用低模')
      break
    case 'mergeMeshes':
      optimizeForPerformance()
      break
    case 'optimizeTrees':
      console.log('💡 提示：树木优化需要单独处理')
      alert('树木优化方案：\n\n1. 合并所有树为一个 Mesh（推荐）\n2. 使用 InstancedMesh 批量渲染\n3. 减少单棵树的几何复杂度')
      break
    case 'optimizeLights':
      props.scene.traverse((child, index) => {
        if (child.isLight && index > 8) {
          child.intensity *= 0.5
        }
      })
      break
    case 'toggleShadow':
      toggleShadow()
      break
    case 'toggleOutline':
      toggleOutline()
      break
  }
}

async function analyzeRailings() {
  if (!props.scene) return

  isAnalyzingRailings.value = true

  await new Promise(resolve => setTimeout(resolve, 100))

  try {
    const result = analyzeRailingsUtil(props.scene)
    railingAnalysisResult.value = result
    mergePlan.value = null
    showMergePlan.value = false

    console.log('🚶‍♂️ 栏杆分析完成:', result)
  } catch (error) {
    console.error('❌ 栏杆分析失败:', error)
    alert('栏杆分析失败，请查看控制台错误信息')
  } finally {
    isAnalyzingRailings.value = false
  }
}

async function executeRailingOptimization() {
  if (!props.scene || !railingAnalysisResult.value) return

  isOptimizing.value = true

  try {
    const plan = getRailingMergePlan(props.scene)

    mergePlan.value = plan
    showMergePlan.value = true

    let mergedCount = 0
    let removedCount = 0

    plan.mergeGroups.forEach(group => {
      const meshesToMerge = []

      props.scene.traverse((child) => {
        if (child.isMesh && child.name.includes(group.sourceType)) {
          meshesToMerge.push(child)
        }
      })

      if (meshesToMerge.length >= 2) {
        try {
          const geometries = []
          const materials = new Set()

          meshesToMerge.forEach(mesh => {
            mesh.updateWorldMatrix(true, true)
            geometries.push(mesh.geometry.clone())
            if (mesh.material) {
              materials.add(mesh.material)
            }
          })

          const mergedGeometry = mergeGeometries(geometries, meshesToMerge)

          const materialArray = Array.from(materials)
          const mergedMaterial = materialArray.length === 1 ? materialArray[0] : materialArray

          const mergedMesh = new THREE.Mesh(mergedGeometry, mergedMaterial)
          mergedMesh.name = group.groupName
          mergedMesh.castShadow = true
          mergedMesh.receiveShadow = true

          const box = new THREE.Box3()
          meshesToMerge.forEach(mesh => {
            box.expandByObject(mesh)
          })
          mergedMesh.position.copy(box.getCenter(new THREE.Vector3()))

          props.scene.add(mergedMesh)

          meshesToMerge.forEach(mesh => {
            if (mesh.parent) {
              mesh.parent.remove(mesh)
            }
            if (mesh.geometry) mesh.geometry.dispose()
            removedCount++
          })

          mergedCount++
          console.log(`✅ 已合并: ${group.groupName} (${meshesToMerge.length} 个对象)`)
        } catch (mergeError) {
          console.warn(`⚠️ 合并失败 ${group.groupName}:`, mergeError.message)
        }
      }
    })

    railingAnalysisResult.value = analyzeRailingsUtil(props.scene)

    alert(`✅ 栏杆优化完成！\n\n📊 统计：\n• 创建合并组: ${mergedCount}\n• 移除原始对象: ${removedCount}\n• 预计帧率提升: +${plan.summary.estimatedFpsGain.toFixed(0)} FPS\n\n💡 刷新页面可恢复原状`)

    console.log('🎉 栏杆优化完成:', { mergedCount, removedCount })
  } catch (error) {
    console.error('❌ 栏杆优化失败:', error)
    alert('栏杆优化失败: ' + error.message)
  } finally {
    isOptimizing.value = false
  }
}

function mergeGeometries(geometries, meshes) {
  let totalVertices = 0
  let totalIndices = 0

  geometries.forEach(geo => {
    totalVertices += geo.attributes.position.count
    if (geo.index) {
      totalIndices += geo.index.count
    }
  })

  const positions = new Float32Array(totalVertices * 3)
  const normals = new Float32Array(totalVertices * 3)
  const uvs = geometries[0].attributes.uv ? new Float32Array(totalVertices * 2) : null
  const indices = totalIndices > 0 ? new Uint32Array(totalIndices) : null

  let vertexOffset = 0
  let indexOffset = 0
  let indexValueOffset = 0

  geometries.forEach((geo, i) => {
    const mesh = meshes[i]
    mesh.updateWorldMatrix(true, true)
    const matrix = mesh.matrixWorld

    const posAttr = geo.attributes.position
    const normAttr = geo.attributes.normal
    const uvAttr = geo.attributes.uv

    for (let j = 0; j < posAttr.count; j++) {
      const vertex = new THREE.Vector3(
        posAttr.getX(j),
        posAttr.getY(j),
        posAttr.getZ(j)
      )
      vertex.applyMatrix4(matrix)

      positions[vertexOffset * 3] = vertex.x
      positions[vertexOffset * 3 + 1] = vertex.y
      positions[vertexOffset * 3 + 2] = vertex.z

      if (normAttr) {
        const normal = new THREE.Vector3(
          normAttr.getX(j),
          normAttr.getY(j),
          normAttr.getZ(j)
        )
        normal.transformDirection(matrix)

        normals[vertexOffset * 3] = normal.x
        normals[vertexOffset * 3 + 1] = normal.y
        normals[vertexOffset * 3 + 2] = normal.z
      }

      if (uvs && uvAttr) {
        uvs[vertexOffset * 2] = uvAttr.getX(j)
        uvs[vertexOffset * 2 + 1] = uvAttr.getY(j)
      }

      vertexOffset++
    }

    if (geo.index && indices) {
      for (let k = 0; k < geo.index.count; k++) {
        indices[indexOffset++] = geo.index.getX(k) + indexValueOffset
      }
    }

    indexValueOffset += posAttr.count
  })

  const mergedGeometry = new THREE.BufferGeometry()
  mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

  if (uvs) {
    mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  }

  if (indices) {
    mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
  }

  return mergedGeometry
}

onMounted(() => {
  animationId = requestAnimationFrame(updateFPS)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped>
.performance-panel {
  background: transparent;
  border: none;
  backdrop-filter: none;
  border-radius: 0;
  width: 100%;
  font-size: 12px;
  color: #cbd5e1;
  box-shadow: none;
}

.panel-header {
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  transition: background 0.2s;
}

.panel-header:hover {
  background: rgba(74, 144, 255, 0.08);
}

.panel-icon {
  font-size: 16px;
}

.panel-title {
  flex: 1;
  font-weight: 600;
  font-size: 13px;
  color: #e2e8f0;
}

.fps-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 13px;
  font-family: 'Consolas', monospace;
}

.fps-badge.good {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.fps-badge.warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.fps-badge.danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  animation: pulse 1s ease-in-out infinite;
}

.toggle-icon {
  font-size: 10px;
  color: #94a3b8;
}

.panel-content {
  padding: 0 14px 14px;
  border-top: 1px solid rgba(74, 144, 255, 0.15);
}

.stat-section,
.bottleneck-section,
.optimize-section,
.chart-section {
  margin-top: 12px;
}

h4 {
  margin: 0 0 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
}

.stat-label {
  color: #94a3b8;
  font-size: 11px;
}

.stat-value {
  font-weight: 600;
  color: #60a5fa;
  font-family: 'Consolas', monospace;
}

.bottleneck-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bottleneck-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 11.5px;
}

.bottleneck-icon {
  font-size: 14px;
}

.bottleneck-name {
  flex: 1;
}

.action-btn {
  padding: 3px 10px;
  border: 1px solid rgba(74, 144, 255, 0.3);
  background: rgba(74, 144, 255, 0.08);
  color: #60a5fa;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(74, 144, 255, 0.18);
  border-color: rgba(74, 144, 255, 0.5);
}

.optimize-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.optimize-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.optimize-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.optimize-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.optimize-btn.secondary {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.optimize-btn.secondary:hover {
  background: rgba(148, 163, 184, 0.25);
}

.optimize-hint {
  margin: 0;
  font-size: 10.5px;
  color: #64748b;
  text-align: center;
}

.mini-chart {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  padding: 8px;
  position: relative;
}

.mini-chart svg {
  width: 100%;
  height: 60px;
  display: block;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: #64748b;
  font-family: 'Consolas', monospace;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 详细分析样式 */
.analysis-section {
  margin-top: 12px;
}

.toggle-analysis-btn {
  width: 100%;
  padding: 8px;
  border: 1px solid rgba(74, 144, 255, 0.2);
  background: rgba(74, 144, 255, 0.08);
  color: #60a5fa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 11.5px;
  font-weight: 500;
}

.toggle-analysis-btn:hover {
  background: rgba(74, 144, 255, 0.15);
  border-color: rgba(74, 144, 255, 0.35);
}

.detailed-content {
  margin-top: 12px;
  animation: expandDown 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes expandDown {
  from {
    opacity: 0;
    max-height: 0;
    overflow: hidden;
  }
  to {
    opacity: 1;
    max-height: 2000px;
    overflow: visible;
  }
}

.category-stats,
.top-objects,
.diagnosis,
.memory-info {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(74, 144, 255, 0.1);
}

h5 {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.category-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item {
  display: grid;
  grid-template-columns: 20px 70px 50px 60px;
  align-items: center;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  font-size: 11px;
}

.cat-icon {
  font-size: 13px;
}

.cat-name {
  color: #cbd5e1;
}

.cat-count {
  text-align: right;
  font-weight: 600;
  color: #e2e8f0;
  font-family: 'Consolas', monospace;
}

.cat-percent {
  text-align: right;
  color: #64748b;
  font-size: 10px;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 200px;
  overflow-y: auto;
}

.top-item {
  display: grid;
  grid-template-columns: 28px 1fr 65px 45px;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  font-size: 11px;
  border-left: 2px solid transparent;
  transition: all 0.2s;
}

.top-item.critical {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.top-item.warning {
  border-left-color: #fbbf24;
  background: rgba(251, 191, 36, 0.06);
}

.rank {
  font-weight: bold;
  color: #64748b;
  font-family: 'Consolas', monospace;
}

.obj-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #cbd5e1;
}

.obj-tris {
  text-align: right;
  font-weight: 600;
  color: #fbbf24;
  font-family: 'Consolas', monospace;
  font-size: 10.5px;
}

.obj-type {
  text-align: right;
  color: #64748b;
  font-size: 9.5px;
}

.diagnosis-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diagnosis-item {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  border-left: 3px solid transparent;
}

.diagnosis-item.critical {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.diagnosis-item.warning {
  border-left-color: #fbbf24;
  background: rgba(251, 191, 36, 0.06);
}

.diagnosis-item.info {
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.issue-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.issue-content {
  flex: 1;
  min-width: 0;
}

.issue-title {
  display: block;
  font-weight: 600;
  font-size: 11.5px;
  color: #e2e8f0;
  margin-bottom: 3px;
}

.issue-desc {
  margin: 0 0 6px;
  font-size: 10.5px;
  color: #94a3b8;
  line-height: 1.4;
}

.fix-btn {
  padding: 3px 10px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s;
  white-space: nowrap;
}

.fix-btn:hover {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.5);
}

.memory-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.memory-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  gap: 4px;
}

.mem-label {
  font-size: 9.5px;
  color: #64748b;
  text-transform: uppercase;
}

.mem-value {
  font-size: 12px;
  font-weight: bold;
  color: #22c55e;
  font-family: 'Consolas', monospace;
}

.mem-value.total {
  color: #60a5fa;
  font-size: 13px;
}

/* 栏杆分析样式 */
.railing-analysis {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(74, 144, 255, 0.12);
}

.railing-analysis h5 {
  margin-bottom: 10px;
  color: #60a5fa;
}

.analysis-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, rgba(74, 144, 255, 0.15), rgba(59, 130, 246, 0.08));
  border: 1px solid rgba(74, 144, 255, 0.3);
  color: #60a5fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 12.5px;
  font-weight: 600;
}

.analysis-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(74, 144, 255, 0.25), rgba(59, 130, 246, 0.15));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.analysis-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.railing-result {
  margin-top: 14px;
  animation: expandDown 0.4s ease;
}

.railing-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  margin-bottom: 14px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.sum-label {
  font-size: 11px;
  color: #94a3b8;
}

.sum-value {
  font-size: 18px;
  font-weight: bold;
  color: #e2e8f0;
}

.sum-value.highlight {
  color: #fbbf24;
  font-size: 22px;
}

.sum-value.warning {
  color: #f87171;
}

.railing-types,
.building-dist,
.optimization-plan {
  margin-bottom: 14px;
}

.railing-types h6,
.building-dist h6,
.optimization-plan h6 {
  font-size: 12px;
  color: #cbd5e1;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(74, 144, 255, 0.1);
}

.type-list,
.building-list,
.plan-list {
  max-height: 200px;
  overflow-y: auto;
}

.type-item,
.building-item,
.plan-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  margin-bottom: 5px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  font-size: 11.5px;
  transition: all 0.2s ease;
}

.type-item:hover,
.building-item:hover,
.plan-item:hover {
  background: rgba(74, 144, 255, 0.08);
  transform: translateX(3px);
}

.type-rank {
  font-weight: bold;
  color: #60a5fa;
  min-width: 22px;
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-name {
  display: block;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-stats {
  font-size: 10.5px;
  color: #94a3b8;
}

.type-total {
  font-weight: bold;
  color: #fbbf24;
  white-space: nowrap;
}

.building-item {
  justify-content: space-between;
}

.bld-name {
  flex: 1;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bld-count,
.bld-types {
  color: #94a3b8;
  font-size: 11px;
  white-space: nowrap;
}

.plan-item {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 10px 12px;
}

.plan-item.high {
  border-left: 3px solid #ef4444;
}

.plan-item.medium {
  border-left: 3px solid #fbbf24;
}

.plan-item.low {
  border-left: 3px solid #22c55e;
}

.priority-badge {
  font-size: 11px;
  font-weight: 600;
}

.plan-content strong {
  color: #e2e8f0;
  font-size: 12px;
}

.plan-content p {
  font-size: 11px;
  color: #94a3b8;
  margin: 4px 0;
  line-height: 1.4;
}

.gain {
  display: inline-block;
  padding: 3px 8px;
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-top: 4px;
}

.execute-section {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(74, 144, 255, 0.12);
}

.plan-btn,
.execute-btn {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid rgba(74, 144, 255, 0.25);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 12px;
  font-weight: 600;
}

.plan-btn {
  background: rgba(74, 144, 255, 0.08);
  color: #60a5fa;
}

.plan-btn:hover {
  background: rgba(74, 144, 255, 0.16);
  transform: translateY(-1px);
}

.execute-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-color: transparent;
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.35);
}

.execute-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 16px rgba(59, 130, 246, 0.45);
}

.execute-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.merge-plan-detail {
  margin-top: 14px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  animation: fadeIn 0.3s ease;
}

.merge-plan-detail h6 {
  color: #60a5fa;
  margin-bottom: 12px;
  font-size: 13px;
}

.plan-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  background: rgba(74, 144, 255, 0.06);
  border-radius: 5px;
}

.overview-item span {
  font-size: 11px;
  color: #94a3b8;
}

.overview-item strong {
  font-size: 17px;
  color: #e2e8f0;
}

.overview-item strong.highlight {
  color: #fbbf24;
}

.overview-item strong.success {
  color: #22c55e;
}

.merge-groups-list {
  max-height: 180px;
  overflow-y: auto;
}

.merge-group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 5px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 11.5px;
}

.group-priority {
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.group-priority.critical {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.group-priority.high {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.group-priority.medium {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.group-name {
  flex: 1;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-count {
  color: #94a3b8;
}

.group-reduction {
  color: #22c55e;
  font-weight: bold;
  white-space: nowrap;
}
</style>