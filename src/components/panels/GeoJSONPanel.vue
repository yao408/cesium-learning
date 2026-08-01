<template>
  <div>
    <input 
      type="file" 
      ref="fileInput" 
      accept=".json,.geojson,.gltf,.glb" 
      @change="onFileSelected" 
      style="display:none" 
    />
    <button class="import-btn" @click="triggerFileInput">📁 导入文件</button>
    <p class="hint">支持 GeoJSON、GLTF、GLB</p>
    <p v-if="geojsonMethods?.geojsonCount" class="hint">
      已加载 {{ geojsonMethods.geojsonCount }} 个实体
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGeoJSON } from '../../composables/useGeoJSON.js'

const props = defineProps({
  viewer: Object,
  store: Object,
  clearAll: Function
})

const fileInput = ref(null)
let geojsonMethods = null

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  const ext = file.name.toLowerCase().split('.').pop()
  
  if (ext === 'json' || ext === 'geojson') {
    geojsonMethods?.onGeoJSONFile(event)
  } else if (ext === 'gltf' || ext === 'glb') {
    alert('3D 模型加载功能待实现')
  } else {
    alert('不支持的文件格式')
  }
  
  event.target.value = ''
}

onMounted(() => {
  if (!props.viewer) return
  geojsonMethods = useGeoJSON(props.viewer, props.store, props.clearAll)
  geojsonMethods.setupGeoJSONClick()
})
</script>

<style scoped>
.import-btn {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  background: rgba(254, 252, 245, 0.88);
  color: #333;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  width: 100%;
  margin-bottom: 8px;
}

.import-btn:hover {
  background: rgba(254, 252, 245, 1);
  color: #2d8a4e;
}

.hint {
  margin: 8px 0 0 0;
  font-size: 11px;
  color: #999;
}
</style>