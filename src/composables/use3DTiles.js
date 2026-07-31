import { ref } from 'vue'
import * as Cesium from 'cesium'

export function use3DTiles(viewer, clearCityViewshed) {
  const loading = ref(false)
  const loaded = ref(false)
  const count = ref(0)
  const error = ref('')
  let tileset = null

  async function load() {
    if (loading.value || loaded.value) return
    
    loading.value = true
    error.value = ''
    count.value = 0
    
    try {
      tileset = await Cesium.Cesium3DTileset.fromUrl('/tiles/hefei/tileset.json', {
        maximumScreenSpaceError: 16,
      })
      
      tileset.tileLoad.addEventListener(() => {
        count.value++
      })
      
      viewer.scene.primitives.add(tileset)
      loaded.value = true
      
      viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0, -0.5, 5000))
        .catch(() => {
          viewer.camera.flyTo({ 
            destination: Cesium.Cartesian3.fromDegrees(117.2272, 31.8206, 5000) 
          })
        })
    } catch (e) {
      error.value = '加载失败: ' + e.message
      console.error('3D Tiles 加载失败:', e)
    } finally {
      loading.value = false
    }
  }

  function clear() {
    if (tileset) {
      viewer.scene.primitives.remove(tileset)
      tileset = null
    }
    loaded.value = false
    loading.value = false
    count.value = 0
    error.value = ''
    clearCityViewshed()
  }

  return {
    loading,
    loaded,
    count,
    error,
    load,
    clear
  }
}