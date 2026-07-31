import { reactive } from 'vue'
import * as Cesium from 'cesium'
import { useViewerStore } from '../stores/viewerStore.js'

const aoi = reactive({
  minLat: 29.3, maxLat: 29.9, minLng: 101.8, maxLng: 102.4
})
let aoiEntities = []

export function useAOI() {
  const viewerStore = useViewerStore()
  
  function drawAOI(store) {
    const viewer = viewerStore.viewer
    if (!viewer) return
    
    clearAOI()
    
    const { minLat, maxLat, minLng, maxLng } = aoi
    const cornerRatio = 0.15
    const dLon = (maxLng - minLng) * cornerRatio
    const dLat = (maxLat - minLat) * cornerRatio
    const color = Cesium.Color.fromCssColorString('#64b5f6').withAlpha(0.9)

    const corners = [
      [[minLng, maxLat], [minLng + dLon, maxLat]],
      [[minLng, maxLat], [minLng, maxLat - dLat]],
      [[maxLng, maxLat], [maxLng - dLon, maxLat]],
      [[maxLng, maxLat], [maxLng, maxLat - dLat]],
      [[minLng, minLat], [minLng + dLon, minLat]],
      [[minLng, minLat], [minLng, minLat + dLat]],
      [[maxLng, minLat], [maxLng - dLon, minLat]],
      [[maxLng, minLat], [maxLng, minLat + dLat]],
    ]
    
    corners.forEach(([start, end]) => {
      const entity = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([...start, ...end]),
          width: 2,
          material: color,
          clampToGround: true,
        },
      })
      aoiEntities.push(entity)
    })

    const fill = viewer.entities.add({
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
        material: Cesium.Color.fromCssColorString('#64b5f6').withAlpha(0.06),
        fill: true,
        outline: false,
      },
    })
    aoiEntities.push(fill)

    store.setAOI({ minLat, maxLat, minLng, maxLng })
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
      duration: 1.5,
    })
  }

  function clearAOI() {
    const viewer = viewerStore.viewer
    aoiEntities.forEach(e => viewer.entities.remove(e))
    aoiEntities = []
  }

  return { aoi, drawAOI, clearAOI }
}