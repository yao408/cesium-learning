import { reactive } from 'vue'
import * as Cesium from 'cesium'
import { GPUFloodSim } from '../utils/gpuFloodSim.js'

export function useFloodSimulation() {
  const floodSims = reactive([])
  let floodIdCounter = 0

  function stopFloodSim(entry) {
    entry._stopped = true
    if (entry._timer) clearInterval(entry._timer)
    if (entry._pollTimer) clearTimeout(entry._pollTimer)
    if (entry.sim) {
      entry.sim.stopSimulation()
    }
    entry.stats = entry.sim ? entry.sim.getStats() : null
  }

  function updateFloodPolygon(entry, boundary, viewer) {
    if (!viewer || !boundary || boundary.length < 6) return
    entry.boundary = boundary

    const positions = []
    for (let i = 0; i < boundary.length; i += 2) {
      positions.push(boundary[i], boundary[i + 1])
    }

    if (entry._polyEntity) {
      entry._polyEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(positions)
      )
      entry._polyEntity.polygon.clampToGround = true
      entry._polyEntity.show = true
    } else {
      entry._polyEntity = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(positions)
          ),
          material: Cesium.Color.ROYALBLUE.withAlpha(0.25),
          outline: true,
          outlineColor: Cesium.Color.ROYALBLUE.withAlpha(0.6),
          outlineWidth: 2,
          clampToGround: true,
        },
        show: true,
      })
      entry.entities.push(entry._polyEntity)
    }
  }

  function pollFloodBoundary(entry, viewer) {
    if (entry._pollTimer) clearTimeout(entry._pollTimer)
    entry._pollTimer = setTimeout(() => {
      if (!entry.sim || entry._stopped) return
      const boundary = entry.sim.getFloodBoundary()
      if (boundary && boundary.length >= 6) {
        updateFloodPolygon(entry, boundary, viewer)
      }
      pollFloodBoundary(entry, viewer)
    }, 50)
  }

  async function runFlood(lon, lat, viewer) {
    if (!viewer) return

    const id = ++floodIdCounter

    const sim = new GPUFloodSim(viewer)
    try {
      await sim.init(lon, lat, 0.05)
    } catch (e) {
      console.warn('洪水模拟初始化失败:', e)
      return
    }
    sim.setSourcePoint(lon, lat, 2000)
    sim.setFlowRate('medium')
    sim.startSimulation()

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 15000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 1.5,
    })

    const entry = reactive({ id, sim, boundary: null, stats: null, cardVisible: true, entities: [], _timer: null, _pollTimer: null })
    floodSims.push(entry)

    pollFloodBoundary(entry, viewer)

    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += 1
      if (elapsed >= 30) {
        clearInterval(timer)
        stopFloodSim(entry)
      }
    }, 1000)
    entry._timer = timer
  }

  function closeFlood(entry, viewer) {
    stopFloodSim(entry)
    if (entry.sim) {
      entry.sim.destroy()
    }
    if (viewer) {
      entry.entities.forEach(e => viewer.entities.remove(e))
    }
    const idx = floodSims.indexOf(entry)
    if (idx !== -1) floodSims.splice(idx, 1)
  }

  function closeAllFloods(viewer) {
    floodSims.slice().forEach(entry => closeFlood(entry, viewer))
  }

  return {
    floodSims,
    runFlood,
    closeFlood,
    closeAllFloods,
    stopFloodSim,
  }
}