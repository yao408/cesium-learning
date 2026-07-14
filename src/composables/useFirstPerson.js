import { ref } from 'vue'
import * as Cesium from 'cesium'

/**
 * 第一视角 composable
 *
 * 站在地面上的任意点，人眼高度 1.6m + 0.5m 安全余量
 * 按住拖拽左右 = 转头，上下 = 低头/抬头（-90° ~ 0°）
 * 方向键 ← → 备用
 * Esc 退出
 *
 * @example
 * const { isFirstPerson, enterFirstPerson, exitFirstPerson } = useFirstPerson()
 * enterFirstPerson(viewer, { lon: 120, lat: 30, groundHeight: 100 })
 * // 可选：指定初始朝向
 * enterFirstPerson(viewer, { lon: 120, lat: 30, groundHeight: 100 }, { heading: Math.PI / 4 })
 */
export function useFirstPerson() {
  const isFirstPerson = ref(false)
  let _handler = null
  let _keydownHandler = null

  function enterFirstPerson(viewer, point, options = {}) {
    const { lon, lat, groundHeight } = point
    const { heading, eyeHeightOffset = 0 } = options

    if (!viewer || !lon || !lat) return

    const cartographic = Cesium.Cartographic.fromDegrees(lon, lat)
    Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic]).then((sampled) => {
      const groundH = sampled[0]?.height ?? (groundHeight || 0)
      const eyeHeight = groundH + 1.6 + 0.5 + eyeHeightOffset

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, eyeHeight),
        orientation: {
          heading: heading !== undefined ? heading : viewer.camera.heading,
          pitch: Cesium.Math.toRadians(0),
          roll: 0,
        },
        duration: 0.5,
        complete: () => {
          viewer.scene.globe.maximumScreenSpaceError = 0.5
          const sc = viewer.scene.screenSpaceCameraController
          Object.assign(sc, {
            enableZoom: false,
            enableTilt: false,
            enableTranslate: false,
            enableLook: false,
            enableRotate: false,
            minimumPitch: Cesium.Math.toRadians(-90),
            maximumPitch: Cesium.Math.toRadians(0),
          })
          isFirstPerson.value = true

          let lastX = null
          let lastY = null
          let dragging = false
          _handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
          _handler.setInputAction((move) => {
            if (!dragging) return
            if (lastX === null) {
              lastX = move.endPosition.x; lastY = move.endPosition.y; return
            }
            const dx = move.endPosition.x - lastX
            const dy = move.endPosition.y - lastY
            lastX = move.endPosition.x
            lastY = move.endPosition.y
            const sensitivity = 0.005
            const newHeading = viewer.camera.heading - dx * sensitivity
            const newPitch = Cesium.Math.clamp(
              viewer.camera.pitch - dy * sensitivity,
              Cesium.Math.toRadians(-90),
              Cesium.Math.toRadians(0),
            )
            viewer.camera.setView({ orientation: { heading: newHeading, pitch: newPitch, roll: 0 } })
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
          _handler.setInputAction((move) => {
            dragging = true
            lastX = move.position.x
            lastY = move.position.y
          }, Cesium.ScreenSpaceEventType.LEFT_DOWN)
          _handler.setInputAction(() => {
            dragging = false
            lastX = null
            lastY = null
          }, Cesium.ScreenSpaceEventType.LEFT_UP)

          // 方向键 & Esc
          _keydownHandler = (e) => {
            if (e.key === 'ArrowLeft') {
              viewer.camera.setView({
                orientation: {
                  heading: viewer.camera.heading + Cesium.Math.toRadians(2),
                  pitch: viewer.camera.pitch,
                  roll: 0,
                },
              })
              e.preventDefault()
            } else if (e.key === 'ArrowRight') {
              viewer.camera.setView({
                orientation: {
                  heading: viewer.camera.heading - Cesium.Math.toRadians(2),
                  pitch: viewer.camera.pitch,
                  roll: 0,
                },
              })
              e.preventDefault()
            } else if (e.key === 'Escape') {
              exitFirstPerson(viewer)
              e.preventDefault()
            }
          }
          document.addEventListener('keydown', _keydownHandler)
        },
    })
  })
  }

  function exitFirstPerson(viewer) {
    if (!viewer) return
    isFirstPerson.value = false
    if (_handler) { _handler.destroy(); _handler = null }
    if (_keydownHandler) { document.removeEventListener('keydown', _keydownHandler); _keydownHandler = null }
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    viewer.scene.globe.maximumScreenSpaceError = 2.0
    const sc = viewer.scene.screenSpaceCameraController
    Object.assign(sc, {
      enableZoom: true,
      enableTilt: true,
      enableTranslate: true,
      enableLook: true,
      minimumPitch: Cesium.Math.toRadians(-90),
      maximumPitch: Cesium.Math.toRadians(-0.5),
      minimumZoomDistance: 100,
      maximumZoomDistance: Infinity,
    })
  }

  return { isFirstPerson, enterFirstPerson, exitFirstPerson }
}