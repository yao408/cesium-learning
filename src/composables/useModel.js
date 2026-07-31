import { ref } from 'vue'
import * as Cesium from 'cesium'

export function useModel(viewer) {
  const modelLoaded = ref(false)
  const modelScale = ref(100)
  const loadingModel = ref(false)
  let modelEntity = null

  async function onModelFile(e) {
    const file = e.target.files[0]
    if (!file) return
    loadingModel.value = true
    clearModel()
    try {
      const url = URL.createObjectURL(file)
      const position = Cesium.Cartesian3.fromDegrees(116.397, 39.908, 0)
      modelEntity = viewer.entities.add({
        name: file.name,
        position: position,
        model: {
          uri: url,
          scale: modelScale.value,
          minimumPixelSize: 100,
          maximumScale: 20000,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
      modelLoaded.value = true
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 200), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 }, duration: 2 })
    } catch (e) {
      console.error('模型加载失败:', e)
    } finally {
      loadingModel.value = false
      e.target.value = ''
    }
  }

  function clearModel() {
    if (modelEntity) { viewer.entities.remove(modelEntity); modelEntity = null }
    modelLoaded.value = false
  }

  function updateModelScale() {
    if (modelEntity && modelEntity.model) modelEntity.model.scale = modelScale.value
  }

  return {
    modelLoaded,
    modelScale,
    loadingModel,
    onModelFile,
    clearModel,
    updateModelScale
  }
}