<!--
  绘制管理器组件
  
  功能：
  - 提供绘制工具栏（点、线、面、圆、3D）
  - 集成测量功能
  - 集成编辑功能
  - 显示测量结果
-->

<template>
  <div class="drawing-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-section">
        <span class="section-title">2D 绘制</span>
        <button 
          :class="['tool-btn', { active: currentTool === 'point' }]"
          @click="startDraw('point')"
          title="绘制点"
        >
          📍 点
        </button>
        <button 
          :class="['tool-btn', { active: currentTool === 'line' }]"
          @click="startDraw('line')"
          title="绘制线"
        >
          📏 线
        </button>
        <button 
          :class="['tool-btn', { active: currentTool === 'polygon' }]"
          @click="startDraw('polygon')"
          title="绘制面"
        >
          ⬡ 面
        </button>
        <button 
          :class="['tool-btn', { active: currentTool === 'circle' }]"
          @click="startDraw('circle')"
          title="绘制圆"
        >
          ⭕ 圆
        </button>
      </div>
      
      <div class="toolbar-section">
        <span class="section-title">3D 绘制</span>
        <button 
          :class="['tool-btn', { active: currentTool === '3dline' }]"
          @click="startDraw('3dline')"
          title="绘制 3D 线"
        >
          ╱ 3D线
        </button>
        <button 
          :class="['tool-btn', { active: currentTool === 'extruded' }]"
          @click="startDraw('extruded')"
          title="绘制拉伸面"
        >
          ▲ 拉伸面
        </button>
      </div>
      
      <div class="toolbar-section">
        <span class="section-title">测量</span>
        <button 
          :class="['tool-btn', { active: currentTool === 'measure-distance' }]"
          @click="startMeasure('distance')"
          title="测量距离"
        >
          📏 距离
        </button>
        <button 
          :class="['tool-btn', { active: currentTool === 'measure-area' }]"
          @click="startMeasure('area')"
          title="测量面积"
        >
          ⬡ 面积
        </button>
        <button 
          :class="['tool-btn', { active: currentTool === 'measure-height' }]"
          @click="startMeasure('height')"
          title="测量高度"
        >
          ⇅ 高度
        </button>
      </div>
      
      <div class="toolbar-section">
        <span class="section-title">编辑</span>
        <button 
          class="tool-btn"
          @click="startEdit"
          :disabled="!selectedShape"
          title="编辑节点"
        >
          ✏️ 编辑
        </button>
        <button 
          class="tool-btn"
          @click="undo"
          :disabled="!canUndo"
          title="撤销"
        >
          ↩️ 撤销
        </button>
        <button 
          class="tool-btn"
          @click="redo"
          :disabled="!canRedo"
          title="重做"
        >
          ↪️ 重做
        </button>
        <button 
          class="tool-btn danger"
          @click="clearAll"
          title="清空所有"
        >
          🗑️ 清空
        </button>
      </div>
    </div>
    
    <!-- 测量结果面板 -->
    <div v-if="measureResult" class="measure-panel">
      <div class="measure-header">
        <span>测量结果</span>
        <button class="close-btn" @click="clearMeasureResult">×</button>
      </div>
      <div class="measure-content">
        <div class="measure-item">
          <span class="label">类型：</span>
          <span class="value">{{ measureResult.type === 'distance' ? '距离' : measureResult.type === 'area' ? '面积' : '高度' }}</span>
        </div>
        <div class="measure-item">
          <span class="label">数值：</span>
          <span class="value highlight">{{ measureResult.formatted }}</span>
        </div>
        <div v-if="measureResult.type === 'area'" class="measure-item">
          <span class="label">周长：</span>
          <span class="value">{{ perimeterFormatted }}</span>
        </div>
      </div>
    </div>
    
    <!-- 选中图形信息 -->
    <div v-if="selectedShape" class="shape-info">
      <div class="info-header">
        <span>图形信息</span>
        <button class="close-btn" @click="unselectShape">×</button>
      </div>
      <div class="info-content">
        <div class="info-item">
          <span class="label">类型：</span>
          <span class="value">{{ shapeTypeText }}</span>
        </div>
        <div class="info-item">
          <span class="label">节点数：</span>
          <span class="value">{{ selectedShape.positions?.length || 1 }}</span>
        </div>
        <div class="info-actions">
          <button class="action-btn" @click="deleteSelectedShape">删除</button>
          <button class="action-btn" @click="changeColor">改颜色</button>
        </div>
      </div>
    </div>
    
    <!-- 提示信息 -->
    <div class="tooltip" v-if="tooltipText">
      {{ tooltipText }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import { useDrawing } from '../../composables/useDrawing.js'
import { useMeasurement } from '../../composables/useMeasurement.js'
import { useEditing } from '../../composables/useEditing.js'

const props = defineProps({
  viewer: {
    type: Object,
    required: true
  }
})

// 当前工具
const currentTool = ref(null)
const tooltipText = ref('')

// 初始化 composables
const drawing = useDrawing(props.viewer)
const measurement = useMeasurement(props.viewer)
const editing = useEditing(props.viewer)

// 选中图形
const selectedShape = computed(() => editing.selectedShape.value)

// 测量结果
const measureResult = computed(() => measurement.measureResult.value)

// 是否可以撤销/重做
const canUndo = computed(() => editing.canUndo.value)
const canRedo = computed(() => editing.canRedo.value)

// 周长格式化
const perimeterFormatted = computed(() => {
  if (!selectedShape.value || !selectedShape.value.positions) return ''
  const perimeter = measurement.measurePerimeter(selectedShape.value.positions)
  return measurement.formatDistance(perimeter)
})

// 图形类型文本
const shapeTypeText = computed(() => {
  const typeMap = {
    'point': '点',
    'line': '线',
    'polygon': '面',
    'circle': '圆',
    '3dline': '3D 线',
    'extrudedPolygon': '拉伸面'
  }
  return typeMap[selectedShape.value?.type] || '未知'
})

// 开始绘制
function startDraw(type) {
  currentTool.value = type
  
  // 清除之前的绘制
  drawing.drawingState.value = 'idle'
  
  switch (type) {
    case 'point':
      tooltipText.value = '点击地图绘制点，右键取消'
      drawing.startDrawPoint()
      break
    case 'line':
      tooltipText.value = '点击添加点，双击完成，右键取消'
      drawing.startDrawLine()
      break
    case 'polygon':
      tooltipText.value = '点击添加点，双击完成，右键取消'
      drawing.startDrawPolygon()
      break
    case 'circle':
      tooltipText.value = '点击确定圆心，移动调整半径，双击完成'
      drawing.startDrawCircle()
      break
    case '3dline':
      tooltipText.value = '点击添加 3D 点，双击完成，右键取消'
      drawing.startDraw3DLine()
      break
    case 'extruded':
      tooltipText.value = '点击添加点，双击完成，右键取消'
      drawing.startDrawExtrudedPolygon()
      break
  }
  
  // 3秒后清除提示
  setTimeout(() => {
    tooltipText.value = ''
  }, 3000)
}

// 开始测量
function startMeasure(type) {
  currentTool.value = `measure-${type}`
  
  const typeText = type === 'distance' ? '距离' : type === 'area' ? '面积' : '高度'
  tooltipText.value = `测量${typeText}：点击开始，移动查看，双击完成`
  
  measurement.startRealtimeMeasurement({
    type,
    accurate: false,
    onUpdate: (result) => {
      console.log('测量结果：', result)
    }
  })
  
  setTimeout(() => {
    tooltipText.value = ''
  }, 3000)
}

// 开始编辑
function startEdit() {
  if (!selectedShape.value) return
  tooltipText.value = '拖拽节点调整形状，右键退出编辑'
  editing.startNodeEditing()
  
  setTimeout(() => {
    tooltipText.value = ''
  }, 3000)
}

// 撤销
function undo() {
  editing.undo()
}

// 重做
function redo() {
  editing.redo()
}

// 清空所有
function clearAll() {
  if (confirm('确定要清空所有图形吗？')) {
    drawing.clearAllShapes()
    editing.unselectShape()
  }
}

// 清除测量结果
function clearMeasureResult() {
  measurement.measureResult.value = null
}

// 取消选择
function unselectShape() {
  editing.unselectShape()
}

// 删除选中的图形
function deleteSelectedShape() {
  if (selectedShape.value) {
    drawing.deleteShape(selectedShape.value)
    editing.unselectShape()
  }
}

// 改变颜色
function changeColor() {
  if (!selectedShape.value) return
  
  const colors = [
    Cesium.Color.RED,
    Cesium.Color.GREEN,
    Cesium.Color.BLUE,
    Cesium.Color.YELLOW,
    Cesium.Color.CYAN,
    Cesium.Color.MAGENTA,
    Cesium.Color.ORANGE,
    Cesium.Color.PURPLE
  ]
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  editing.setShapeColor(selectedShape.value, randomColor)
}

// 点击选择图形
let clickHandler = null

onMounted(() => {
  clickHandler = new Cesium.ScreenSpaceEventHandler(props.viewer.canvas)
  
  clickHandler.setInputAction((click) => {
    const picked = props.viewer.scene.pick(click.position)
    
    if (picked && picked.id) {
      // 查找对应的 shape
      const shape = drawing.drawnShapes.value.find(s => s.entity === picked.id)
      if (shape) {
        editing.selectShape(shape)
      }
    } else {
      editing.unselectShape()
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
})

onUnmounted(() => {
  if (clickHandler) {
    clickHandler.destroy()
  }
})
</script>

<style scoped>
.drawing-manager {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 200px;
}

.toolbar-section {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.toolbar-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  width: 100%;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 600;
}

.tool-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}

.tool-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.danger:hover {
  background: #ff4d4f;
  color: white;
  border-color: #ff4d4f;
}

.measure-panel,
.shape-info {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

.measure-header,
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.measure-content,
.info-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.measure-item,
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #666;
  font-size: 13px;
}

.value {
  color: #333;
  font-size: 13px;
  font-weight: 500;
}

.value.highlight {
  color: #1890ff;
  font-size: 16px;
  font-weight: 600;
}

.info-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f0f0f0;
}

.tooltip {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>