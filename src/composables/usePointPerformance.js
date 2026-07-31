import { ref } from 'vue'
import * as Cesium from 'cesium'

export function usePointPerformance() {
  const isRunning = ref(false)
  const mode = ref('none')
  const fps = ref(0)
  const pointCount = ref(1000)
  let entities = []
  let primitive = null
  let fpsFrameCount = 0
  let fpsLastTime = performance.now()
  let postRenderHandler = null

  const CENTER_LON = 104.08
  const CENTER_LAT = 31.57

  function generatePoints(count) {
    const points = []
    for (let i = 0; i < count; i++) {
      points.push({
        lon: CENTER_LON + (Math.random() - 0.5) * 0.8,
        lat: CENTER_LAT + (Math.random() - 0.5) * 0.6,
      })
    }
    return points
  }

  function startFPSMonitor(viewer) {
    fpsFrameCount = 0
    fpsLastTime = performance.now()
    postRenderHandler = viewer.scene.postRender.addEventListener(() => {
      fpsFrameCount++
      const now = performance.now()
      if (now - fpsLastTime >= 1000) {
        fps.value = fpsFrameCount
        fpsFrameCount = 0
        fpsLastTime = now
      }
    })
  }

  function stopFPSMonitor(viewer) {
    if (postRenderHandler && viewer) {
      viewer.scene.postRender.removeEventListener(postRenderHandler)
      postRenderHandler = null
    }
  }

  function clearPoints(viewer) {
    entities.forEach((e) => viewer.entities.remove(e))
    entities = []
    if (primitive) {
      viewer.scene.primitives.remove(primitive)
      primitive = null
    }
  }

  function runEntitiesMode(viewer) {
    clearPoints(viewer)
    mode.value = 'entities'
    isRunning.value = true
    startFPSMonitor(viewer)

    const points = generatePoints(pointCount.value)
    points.forEach((p) => {
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat),
        point: {
          pixelSize: 8,
          color: Cesium.Color.fromCssColorString('#ef4444'),
        },
      })
      entities.push(entity)
    })
  }

  function runPrimitiveMode(viewer) {
    clearPoints(viewer)
    mode.value = 'primitive'
    isRunning.value = true
    startFPSMonitor(viewer)

    const points = generatePoints(pointCount.value)
    const collection = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection()
    )
    points.forEach((p) => {
      collection.add({
        position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat),
        pixelSize: 8,
        color: Cesium.Color.fromCssColorString('#4ade80'),
      })
    })
    primitive = collection
  }

  function stop(viewer) {
    clearPoints(viewer)
    stopFPSMonitor(viewer)
    isRunning.value = false
    mode.value = 'none'
    fps.value = 0
  }

  return { isRunning, mode, fps, pointCount, runEntitiesMode, runPrimitiveMode, stop }
}