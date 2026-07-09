import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import * as Cesium from 'cesium'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

export const useViewerStore = defineStore('viewer', () => {
  const viewer = shallowRef(null)
  const ready = ref(false)

  function init(containerEl) {
    if (viewer.value) return

    viewer.value = new Cesium.Viewer(containerEl, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      infoBox: false,
      selectionIndicator: false,
      sceneMode: Cesium.SceneMode.SCENE3D,
    })

    const v = viewer.value
    v.scene.backgroundColor = Cesium.Color.fromCssColorString('#3d5a4a')
    v.scene.globe.baseColor = Cesium.Color.fromCssColorString('#4d6a5a')
    v.scene.skyBox.show = false
    v.scene.skyAtmosphere.show = false
    v.scene.globe.depthTestAgainstTerrain = true
    v.scene.screenSpaceCameraController.minimumZoomDistance = 100
    v.scene.postProcessStages.fxaa.enabled = false

    v.scene.setTerrain(
      new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromIonAssetId(1))
    )

    v.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(108, 35, 15000000),
    })

    ready.value = true
  }

  function destroy() {
    if (viewer.value) {
      viewer.value.destroy()
      viewer.value = null
    }
    ready.value = false
  }

  return { viewer, ready, init, destroy }
})