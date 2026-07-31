// useDraw.js
import { ref } from 'vue'
import * as Cesium from 'cesium'

export function useDraw(viewer, store, clearLabels) {
  let drawEntities = []
  let drawPoints = []
  const drawMode = ref('')
  const drawInfoList = ref([])
  let drawHandler = null

  function clearDraw() {
    drawEntities.forEach(e => viewer.entities.remove(e))
    drawEntities = []
    drawPoints = []
    drawMode.value = ''
    drawInfoList.value = []
    if (drawHandler) { drawHandler.destroy(); drawHandler = null }
  }

  function startDraw(type) {
    clearDraw()
    if (clearLabels) clearLabels()
    drawMode.value = type
    drawPoints = []
    drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    drawHandler.setInputAction((click) => {
      const cartesian = viewer.scene.pickPosition(click.position)
      if (!cartesian) return
      drawPoints.push(cartesian)
      const point = viewer.entities.add({
        position: cartesian,
        point: { pixelSize: 6, color: Cesium.Color.DODGERBLUE, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
      })
      drawEntities.push(point)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    drawHandler.setInputAction(() => {
      if (drawPoints.length < 1) return
      finishDraw()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }

  function finishDraw() {
    drawEntities.forEach(e => viewer.entities.remove(e))
    drawEntities = []

    const coords = drawPoints.map(p => {
      const c = Cesium.Cartographic.fromCartesian(p)
      return [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)]
    })

    if (drawMode.value === 'point' && drawPoints.length > 0) {
      drawPoints.forEach((p, i) => {
        const entity = viewer.entities.add({ position: p, point: { pixelSize: 10, color: Cesium.Color.DODGERBLUE, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND } })
        drawEntities.push(entity)
        drawInfoList.value.push({
          type: 'point',
          coords: `[${coords[i][0].toFixed(6)}, ${coords[i][1].toFixed(6)}]`,
          geojson: { type: 'Point', coordinates: coords[i] },
        })
      })
    }
    if (drawMode.value === 'line' && drawPoints.length >= 2) {
      const entity = viewer.entities.add({ polyline: { positions: drawPoints, width: 3, material: Cesium.Color.DODGERBLUE, clampToGround: true } })
      drawEntities.push(entity)
      drawInfoList.value.push({
        type: 'line',
        coords: `${coords.length} 个点`,
        geojson: { type: 'LineString', coordinates: coords },
      })
    }
    if (drawMode.value === 'polygon' && drawPoints.length >= 3) {
      const entity = viewer.entities.add({ polygon: { hierarchy: new Cesium.PolygonHierarchy(drawPoints), material: Cesium.Color.DODGERBLUE.withAlpha(0.3), outline: true, outlineColor: Cesium.Color.DODGERBLUE, clampToGround: true } })
      drawEntities.push(entity)
      drawInfoList.value.push({
        type: 'polygon',
        coords: `${coords.length} 个顶点`,
        geojson: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
      })
    }
    drawPoints = []
    drawMode.value = ''
    store.setHazards(drawInfoList.value.map(d => ({ type: d.type, coords: d.coords })))
    if (drawHandler) { drawHandler.destroy(); drawHandler = null }
  }

  function exportDrawItem(index) {
    const item = drawInfoList.value[index]
    if (!item) return
    const blob = new Blob([JSON.stringify(item.geojson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.type}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportAllDraw() {
    const features = drawInfoList.value.map((item, i) => ({
      type: 'Feature',
      id: i,
      properties: { drawType: item.type },
      geometry: item.geojson,
    }))
    const collection = { type: 'FeatureCollection', features }
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `draw_features_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    drawMode,
    drawInfoList,
    clearDraw,
    startDraw,
    finishDraw,
    exportDrawItem,
    exportAllDraw,
  }
}