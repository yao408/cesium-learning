<template>
  <div class="layer-manager">
    <button class="layer-toggle" @click="showPanel = !showPanel" title="图层管理">
      ☰
    </button>
    
    <div v-if="showPanel" class="layer-panel">
      <div class="panel-header">
        <span>图层管理</span>
        <button class="close-btn" @click="showPanel = false">✕</button>
      </div>
      
      <div class="panel-section-title">业务图层</div>
      <div class="layer-list">
        <div v-for="layer in bizLayers" :key="layer.key" class="layer-item biz-item" @click="toggleBizLayer(layer)">
          <span class="toggle-dot" :class="{ on: layerVisible[layer.key] }" :style="layerVisible[layer.key] ? { background: layer.color } : {}"></span>
          <span class="layer-name">{{ layer.label }}</span>
        </div>
      </div>
      
      <div class="panel-section-title">Cesium 图层</div>
      <div class="layer-list">
        <div v-for="layer in cesiumLayers" :key="layer.id" class="layer-item">
          <input 
            type="checkbox" 
            v-model="layer.show" 
            @change="toggleCesiumLayer(layer)"
          />
          <span class="layer-name">{{ layer.name }}</span>
          <button class="delete-btn" @click="removeLayer(layer)">🗑️</button>
        </div>
      </div>
      
      <div v-if="cesiumLayers.length === 0 && bizLayers.length === 0" class="empty-tip">
        暂无图层
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as Cesium from 'cesium'
import { useLayerVisibility } from '../composables/useLayerVisibility.js'

const props = defineProps({
  viewer: Object
})

const { layerVisible, layers: bizLayers, toggleLayer } = useLayerVisibility()
const showPanel = ref(false)
const cesiumLayers = ref([])

function toggleBizLayer(layer) {
  toggleLayer(layer)
  // 同步控制 Cesium entity 显隐
  if (!props.viewer) return
  // 业务图层控制已在 Dashboard 的 toggleLayer 中处理
  // 这里只需要触发 reactive 更新即可
}

function updateCesiumLayers() {
  if (!props.viewer) return
  
  const newLayers = []
  
  const imageryLayers = props.viewer.imageryLayers
  for (let i = 0; i < imageryLayers.length; i++) {
    const layer = imageryLayers.get(i)
    newLayers.push({
      id: `imagery-${i}`,
      name: layer.name || `影像图层 ${i + 1}`,
      show: layer.show,
      type: 'imagery',
      index: i
    })
  }
  
  const entities = props.viewer.entities.values
  if (entities.length > 0) {
    newLayers.push({
      id: 'entities',
      name: `Entity 图层 (${entities.length})`,
      show: true,
      type: 'entity'
    })
  }
  
  const primitives = props.viewer.scene.primitives
  for (let i = 0; i < primitives.length; i++) {
    const primitive = primitives.get(i)
    if (primitive instanceof Cesium.Cesium3DTileset) {
      newLayers.push({
        id: `tiles-${i}`,
        name: primitive.name || `3D Tiles ${i + 1}`,
        show: primitive.show,
        type: 'tiles',
        index: i
      })
    }
  }
  
  cesiumLayers.value = newLayers
}

function toggleCesiumLayer(layer) {
  if (!props.viewer) return
  
  if (layer.type === 'imagery') {
    const imageryLayer = props.viewer.imageryLayers.get(layer.index)
    if (imageryLayer) imageryLayer.show = layer.show
  } else if (layer.type === 'entity') {
    props.viewer.entities.values.forEach(e => { e.show = layer.show })
  } else if (layer.type === 'tiles') {
    const primitive = props.viewer.scene.primitives.get(layer.index)
    if (primitive) primitive.show = layer.show
  }
}

function removeLayer(layer) {
  if (!props.viewer) return
  
  if (layer.type === 'imagery') {
    const imageryLayer = props.viewer.imageryLayers.get(layer.index)
    if (imageryLayer) props.viewer.imageryLayers.remove(imageryLayer)
  } else if (layer.type === 'entity') {
    props.viewer.entities.removeAll()
  } else if (layer.type === 'tiles') {
    const primitive = props.viewer.scene.primitives.get(layer.index)
    if (primitive) props.viewer.scene.primitives.remove(primitive)
  }
  
  updateCesiumLayers()
}

onMounted(() => {
  updateCesiumLayers()
  setInterval(updateCesiumLayers, 2000)
})
</script>

<style scoped>
.layer-manager {
  position: relative;
  z-index: 1000;
}

.layer-toggle {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  transition: all 0.2s;
}

.layer-toggle:hover {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.layer-panel {
  position: absolute;
  right: 0;
  top: 48px;
  width: 220px;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.close-btn {
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}

.close-btn:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.08);
}

.panel-section-title {
  padding: 8px 14px 4px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.layer-list {
  max-height: 200px;
  overflow-y: auto;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  transition: background 0.15s;
}

.layer-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.biz-item {
  cursor: pointer;
  gap: 10px;
}

.layer-item input[type="checkbox"] {
  margin-right: 8px;
  accent-color: #2d8a4e;
}

.layer-name {
  flex: 1;
}

.delete-btn {
  border: none;
  background: none;
  cursor: pointer;
  opacity: 0.5;
  font-size: 12px;
}

.delete-btn:hover {
  opacity: 1;
}

.toggle-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
  transition: all 0.2s;
}

.toggle-dot.on {
  box-shadow: 0 0 6px currentColor;
}

.empty-tip {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}
</style>