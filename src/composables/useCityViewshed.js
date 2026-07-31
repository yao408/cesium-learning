import { reactive, ref } from 'vue'
import * as Cesium from 'cesium'
import { useViewerStore } from '../stores/viewerStore.js'
import { useViewshedGPU } from './useViewshedGPU.js'
import { useTerrainQuery } from './useTerrainQuery.js'

export function useCityViewshed() {
  const viewerStore = useViewerStore()
  const { runGPUViewshed, clearGPUViewshed } = useViewshedGPU()
  const { getPickInfo } = useTerrainQuery()

  // 城市通视分析状态
  const cityViewshed = reactive({
    observerHeight: 20,
    maxDistance: 1500,
    fovH: 90,
    fovV: 60,
    heading: 0,
    pitch: -30,
    picking: false,
    points: [],
    loading: false,
  })

  let cityClickHandler = null
  let cityViewshedEntities = []
  let cityFrustumEntities = []
  let frustumEditHandler = null
  const frustumEditing = ref(false)

  function getViewer() {
    return viewerStore.viewer
  }

  function showFrustumPreview() {
    const viewer = getViewer()
    if (!viewer) return

    hideFrustumPreview()
    if (!cityViewshed.points.length) return

    const p = cityViewshed.points[cityViewshed.points.length - 1]
    const pitchLayers = 6
    const headingSteps = 48

    const makeStripPositions = (layer, pitchLayers, halfFovH, headingCenter, pMin, pMax, R, enuToFixed) => {
      const p1 = pMin + layer * (pMax - pMin) / (pitchLayers - 1)
      const p2 = pMin + (layer + 1) * (pMax - pMin) / (pitchLayers - 1)
      const cp1 = Math.cos(p1), sp1 = Math.sin(p1)
      const cp2 = Math.cos(p2), sp2 = Math.sin(p2)
      const positions = []
      for (let j = 0; j <= headingSteps; j++) {
        const h = headingCenter - halfFovH + j * (2 * halfFovH) / headingSteps
        const enu = new Cesium.Cartesian3(R * cp1 * Math.sin(h), R * cp1 * Math.cos(h), R * sp1)
        positions.push(Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3()))
      }
      for (let j = headingSteps; j >= 0; j--) {
        const h = headingCenter - halfFovH + j * (2 * halfFovH) / headingSteps
        const enu = new Cesium.Cartesian3(R * cp2 * Math.sin(h), R * cp2 * Math.cos(h), R * sp2)
        positions.push(Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3()))
      }
      return positions
    }

    for (let layer = 0; layer < pitchLayers - 1; layer++) {
      const entity = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.CallbackProperty(() => {
            const totalH = p.groundHeight + cityViewshed.observerHeight + 2.1
            const viewPos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, totalH)
            const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(viewPos)
            const halfFovH = Cesium.Math.toRadians(cityViewshed.fovH * 0.5)
            const halfFovV = Cesium.Math.toRadians(cityViewshed.fovV * 0.5)
            const headingCenter = Cesium.Math.toRadians(cityViewshed.heading)
            const pitchCenter = Cesium.Math.toRadians(cityViewshed.pitch)
            const pMin = Math.max(pitchCenter - halfFovV, Cesium.Math.toRadians(-90))
            const pMax = pitchCenter + halfFovV
            const R = cityViewshed.maxDistance
            return new Cesium.PolygonHierarchy(
              makeStripPositions(layer, pitchLayers, halfFovH, headingCenter, pMin, pMax, R, enuToFixed)
            )
          }, false),
          material: Cesium.Color.DODGERBLUE.withAlpha(0.15),
          perPositionHeight: true,
        },
        id: `cityFrustumStrip_${layer}`,
      })
      cityFrustumEntities.push(entity)
    }

    const outlineEntity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const totalH = p.groundHeight + cityViewshed.observerHeight + 2.1
          const viewPos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, totalH)
          const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(viewPos)
          const halfFovH = Cesium.Math.toRadians(cityViewshed.fovH * 0.5)
          const halfFovV = Cesium.Math.toRadians(cityViewshed.fovV * 0.5)
          const headingCenter = Cesium.Math.toRadians(cityViewshed.heading)
          const pitchCenter = Cesium.Math.toRadians(cityViewshed.pitch)
          const pMin = Math.max(pitchCenter - halfFovV, Cesium.Math.toRadians(-90))
          const pMax = pitchCenter + halfFovV
          const R = cityViewshed.maxDistance
          const hMin = headingCenter - halfFovH, hMax = headingCenter + halfFovH
          const positions = []
          const N = 48
          const toWorld = (h, p) => {
            const enu = new Cesium.Cartesian3(R * Math.cos(p) * Math.sin(h), R * Math.cos(p) * Math.cos(h), R * Math.sin(p))
            return Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3())
          }
          for (let i = 0; i <= N; i++) positions.push(toWorld(hMin + i * (hMax - hMin) / N, pMax))
          for (let i = 0; i <= N; i++) positions.push(toWorld(hMax, pMax - i * (pMax - pMin) / N))
          for (let i = 0; i <= N; i++) positions.push(toWorld(hMax - i * (hMax - hMin) / N, pMin))
          for (let i = 0; i <= N; i++) positions.push(toWorld(hMin, pMin + i * (pMax - pMin) / N))
          return positions
        }, false),
        width: 2,
        material: Cesium.Color.DODGERBLUE.withAlpha(0.65),
        clampToGround: false,
      },
      id: 'cityFrustumOutline',
    })
    cityFrustumEntities.push(outlineEntity)

    const spokeEntity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const totalH = p.groundHeight + cityViewshed.observerHeight + 2.1
          const viewPos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, totalH)
          const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(viewPos)
          const halfFovH = Cesium.Math.toRadians(cityViewshed.fovH * 0.5)
          const halfFovV = Cesium.Math.toRadians(cityViewshed.fovV * 0.5)
          const headingCenter = Cesium.Math.toRadians(cityViewshed.heading)
          const pitchCenter = Cesium.Math.toRadians(cityViewshed.pitch)
          const pMin = Math.max(pitchCenter - halfFovV, Cesium.Math.toRadians(-90))
          const pMax = pitchCenter + halfFovV
          const R = cityViewshed.maxDistance
          const hMin = headingCenter - halfFovH, hMax = headingCenter + halfFovH
          const toWorld = (h, p) => {
            const enu = new Cesium.Cartesian3(R * Math.cos(p) * Math.sin(h), R * Math.cos(p) * Math.cos(h), R * Math.sin(p))
            return Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3())
          }
          const positions = []
          const spokes = 12
          for (let k = 0; k < spokes; k++) {
            const t = k / spokes
            const h = hMin + t * (hMax - hMin)
            positions.push(viewPos, toWorld(h, pMax))
            positions.push(viewPos, toWorld(hMax, pMax - t * (pMax - pMin)))
            positions.push(viewPos, toWorld(hMax - t * (hMax - hMin), pMin))
            positions.push(viewPos, toWorld(hMin, pMin + t * (pMax - pMin)))
          }
          return positions
        }, false),
        width: 1,
        material: Cesium.Color.WHITE.withAlpha(0.25),
        clampToGround: false,
      },
      id: 'cityFrustumSpokes',
    })
    cityFrustumEntities.push(spokeEntity)
  }

  function hideFrustumPreview() {
    const viewer = getViewer()
    if (!viewer) return
    cityFrustumEntities.forEach(e => viewer.entities.remove(e))
    cityFrustumEntities = []
  }

  function flyToObservationPoint() {
    const viewer = getViewer()
    if (!viewer) return
    if (!cityViewshed.points.length) return
    const p = cityViewshed.points[cityViewshed.points.length - 1]
    const totalH = p.groundHeight + cityViewshed.observerHeight + 2.1
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, totalH),
      orientation: {
        heading: Cesium.Math.toRadians(cityViewshed.heading),
        pitch: Cesium.Math.toRadians(cityViewshed.pitch),
        roll: 0,
      },
    })
  }

  function toggleFrustumEdit() {
    const viewer = getViewer()
    if (!viewer) return

    frustumEditing.value = !frustumEditing.value
    const sc = viewer.scene.screenSpaceCameraController
    if (frustumEditing.value) {
      sc.enableRotate = false
      sc.enableZoom = false
      frustumEditHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      let isDragging = false
      let lastMouse = { x: 0, y: 0 }
      frustumEditHandler.setInputAction((movement) => {
        isDragging = true
        lastMouse = { x: movement.position.x, y: movement.position.y }
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN)
      frustumEditHandler.setInputAction((movement) => {
        if (!isDragging) return
        const dx = movement.endPosition.x - lastMouse.x
        const dy = movement.endPosition.y - lastMouse.y
        lastMouse = { x: movement.endPosition.x, y: movement.endPosition.y }
        cityViewshed.heading = (cityViewshed.heading + dx * 0.3 + 360) % 360
        cityViewshed.pitch = Math.max(-90, Math.min(90, cityViewshed.pitch + dy * 0.3))
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
      frustumEditHandler.setInputAction(() => {
        isDragging = false
      }, Cesium.ScreenSpaceEventType.LEFT_UP)
      frustumEditHandler.setInputAction((movement) => {
        cityViewshed.maxDistance = Math.max(200, Math.min(10000, cityViewshed.maxDistance - Math.sign(movement) * 200))
      }, Cesium.ScreenSpaceEventType.WHEEL)
    } else {
      sc.enableRotate = true
      sc.enableZoom = true
      if (frustumEditHandler) {
        frustumEditHandler.destroy()
        frustumEditHandler = null
      }
    }
  }

  function toggleCityPick() {
    const viewer = getViewer()
    if (!viewer) return

    if (cityViewshed.picking) {
      cancelCityPick()
      return
    }
    cityViewshed.picking = true
    cityClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    cityClickHandler.setInputAction(async (click) => {
      const info = await getPickInfo(viewer, click)
      if (!info) return
      const idx = cityViewshed.points.length
      cityViewshed.points.push({
        lon: info.lon, lat: info.lat,
        name: `观察点${idx + 1}`,
        groundHeight: info.groundH,
      })
      cityViewshed.heading = Cesium.Math.toDegrees(viewer.camera.heading)
      cityViewshed.pitch = Cesium.Math.toDegrees(viewer.camera.pitch)
      // 放置绿色标记
      cityViewshedEntities.push(viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(info.lon, info.lat, info.groundH + cityViewshed.observerHeight),
        point: { pixelSize: 10, color: Cesium.Color.fromCssColorString('#4ade80'), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: `观察点${idx + 1}`, font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -16), fillColor: Cesium.Color.WHITE, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      }))
      cancelCityPick()
      showFrustumPreview()
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  function cancelCityPick() {
    cityViewshed.picking = false
    if (cityClickHandler) {
      cityClickHandler.destroy()
      cityClickHandler = null
    }
  }

  function clearCityViewshed() {
    const viewer = getViewer()
    if (!viewer) return

    cancelCityPick()
    if (frustumEditing.value) toggleFrustumEdit()
    hideFrustumPreview()
    cityViewshed.points = []
    clearGPUViewshed()
    cityViewshedEntities.forEach(e => viewer.entities.remove(e))
    cityViewshedEntities = []
  }

  async function runCityViewshed() {
    const viewer = getViewer()
    if (!viewer) return

    cityViewshed.loading = true
    hideFrustumPreview()
    clearGPUViewshed()
    try {
      for (const p of cityViewshed.points) {
        runGPUViewshed(viewer, {
          centerLon: p.lon,
          centerLat: p.lat,
          observerHeight: cityViewshed.observerHeight,
          maxDistance: cityViewshed.maxDistance,
          fovH: cityViewshed.fovH,
          fovV: cityViewshed.fovV,
          heading: cityViewshed.heading,
          pitch: cityViewshed.pitch,
        })
      }
    } finally {
      cityViewshed.loading = false
    }
  }

  return {
    cityViewshed,
    frustumEditing,
    showFrustumPreview,
    hideFrustumPreview,
    flyToObservationPoint,
    toggleFrustumEdit,
    toggleCityPick,
    cancelCityPick,
    clearCityViewshed,
    runCityViewshed,
  }
}