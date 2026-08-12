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
      baseLayer: false,
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

    // 地形暂时禁用（Cesium World Terrain 也消耗 Ion 额度）
    // v.scene.setTerrain(
    //   new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromIonAssetId(1))
    // )

    const tiandituKey = import.meta.env.VITE_TIANDITU_KEY
    if (tiandituKey) {
      v.imageryLayers.addImageryProvider(
        new Cesium.WebMapTileServiceImageryProvider({
          url: `http://t0.tianditu.gov.cn/cia_w/wmts?tk=${tiandituKey}`,
          layer: 'cia',
          style: 'default',
          format: 'tiles',
          tileMatrixSetID: 'w',
          maximumLevel: 18,
          enablePickFeatures: false,
        })
      )
    }

    v.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(104.07, 31.57, 80000),
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