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
      
      <div class="layer-list">
        <div v-for="layer in layers" :key="layer.id" class="layer-item">
          <input 
            type="checkbox" 
            v-model="layer.show" 
            @change="toggleLayer(layer)"
          />
          <span class="layer-name">{{ layer.name }}</span>
          <button class="delete-btn" @click="removeLayer(layer)">🗑️</button>
        </div>
      </div>
      
      <div v-if="layers.length === 0" class="empty-tip">
        暂无图层
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as Cesium from 'cesium'

const props = defineProps({
  viewer: Object
})

const showPanel = ref(false)
const layers = ref([])

// 从 viewer 获取图层列表
function updateLayers() {
  if (!props.viewer) return
  
  const newLayers = []
  
  // 影像图层
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
  
  // Entity 图层
  const entities = props.viewer.entities.values
  if (entities.length > 0) {
    newLayers.push({
      id: 'entities',
      name: `Entity 图层 (${entities.length})`,
      show: true,
      type: 'entity'
    })
  }
  
  // 3D Tiles
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
  
  layers.value = newLayers
}

function toggleLayer(layer) {
  if (!props.viewer) return
  
  if (layer.type === 'imagery') {
    const imageryLayer = props.viewer.imageryLayers.get(layer.index)
    if (imageryLayer) {
      imageryLayer.show = layer.show
    }
  } else if (layer.type === 'entity') {
    props.viewer.entities.values.forEach(e => {
      e.show = layer.show
    })
  } else if (layer.type === 'tiles') {
    const primitive = props.viewer.scene.primitives.get(layer.index)
    if (primitive) {
      primitive.show = layer.show
    }
  }
}

function removeLayer(layer) {
  if (!props.viewer) return
  
  if (layer.type === 'imagery') {
    const imageryLayer = props.viewer.imageryLayers.get(layer.index)
    if (imageryLayer) {
      props.viewer.imageryLayers.remove(imageryLayer)
    }
  } else if (layer.type === 'entity') {
    props.viewer.entities.removeAll()
  } else if (layer.type === 'tiles') {
    const primitive = props.viewer.scene.primitives.get(layer.index)
    if (primitive) {
      props.viewer.scene.primitives.remove(primitive)
    }
  }
  
  updateLayers()
}

onMounted(() => {
  updateLayers()
  // 定时更新图层列表
  setInterval(updateLayers, 2000)
})
</script>

<style scoped>
.layer-manager {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 1000;
}

.layer-toggle {
  width: 36px;
  height: 36px;
  border: 1px solid #d9d9d9;
  background: rgba(254, 252, 245, 0.88);
  color: #333;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-toggle:hover {
  background: rgba(254, 252, 245, 1);
  border-color: #2d8a4e;
  color: #2d8a4e;
}

.layer-panel {
  position: absolute;
  right: 0;
  top: 44px;
  width: 220px;
  background: rgba(254, 252, 245, 0.95);
  border: 1px solid #d9d9d9;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e8e8e8;
  font-size: 13px;
  font-weight: 500;
}

.close-btn {
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
  font-size: 12px;
}

.close-btn:hover {
  color: #333;
}

.layer-list {
  max-height: 300px;
  overflow-y: auto;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
}

.layer-item:hover {
  background: #f5f5f5;
}

.layer-item input[type="checkbox"] {
  margin-right: 8px;
}

.layer-name {
  flex: 1;
  color: #333;
}

.delete-btn {
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
}

.delete-btn:hover {
  color: #ff4d4f;
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>