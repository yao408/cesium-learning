import { ref } from 'vue'
import * as Cesium from 'cesium'

export function useGeoJSON(viewer, store, clearAll) {
  const geojsonCount = ref(0)
  const pickedFeature = ref('')
  const loadingGeoJSON = ref(false)
  let geojsonDataSource = null
  let dynamicScenarioEntities = []

  async function onGeoJSONFile(e) {
    const file = e.target.files[0]
    if (!file) return
    loadingGeoJSON.value = true
    clearGeoJSON()
    try {
      const text = await file.text()
      const geoJSON = JSON.parse(text)
      geojsonDataSource = await Cesium.GeoJsonDataSource.load(geoJSON, {
        stroke: Cesium.Color.WHITE,
        strokeWidth: 1,
      })
      viewer.dataSources.add(geojsonDataSource)
      const entities = geojsonDataSource.entities.values
      const colorMap = ['#e94560', '#0f3460', '#16213e', '#533483', '#3d7ea6', '#2d6a4f', '#e76f51', '#2a9d8f']
      entities.forEach((entity, i) => {
        if (entity.polygon) {
          entity.polygon.material = Cesium.Color.fromCssColorString(colorMap[i % colorMap.length]).withAlpha(0.5)
          entity.polygon.outline = true
          entity.polygon.outlineColor = Cesium.Color.WHITE
          entity.polygon.outlineWidth = 1
        }
      })
      geojsonCount.value = entities.length
      store.setAOI({ name: file.name.replace(/\.[^/.]+$/, ''), type: 'geojson', entities: entities.length })
      viewer.flyTo(geojsonDataSource)
    } catch (e) {
      console.error('GeoJSON 加载失败:', e)
    } finally {
      loadingGeoJSON.value = false
      e.target.value = ''
    }
  }

  function clearGeoJSON() {
    if (geojsonDataSource) { viewer.dataSources.remove(geojsonDataSource); geojsonDataSource = null }
    geojsonCount.value = 0
    dynamicScenarioEntities.forEach(entity => viewer.entities.remove(entity))
    dynamicScenarioEntities = []
    pickedFeature.value = ''
    clearAll()
  }

  function setupGeoJSONClick() {
    if (!viewer) return
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((click) => {
      if (!viewer) return
      const picked = viewer.scene.pick(click.position)
      if (picked && picked.id && picked.id.name) {
        pickedFeature.value = picked.id.name
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  return {
    geojsonCount,
    pickedFeature,
    loadingGeoJSON,
    onGeoJSONFile,
    clearGeoJSON,
    setupGeoJSONClick
  }
}