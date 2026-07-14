import * as Cesium from 'cesium'
import { useScenarioStore } from '../stores/scenarioStore.js'

// 根据 store 中的 AOI 或地震点自动定位相机，3 个页面共用
export function useCameraInit() {
  const store = useScenarioStore()

  // 相机定位：AOI 优先 → 地震点次之 → 默认视角兜底
  // viewer: Cesium.Viewer 实例
  // defaultView: { lon, lat, height } 页面自定义默认视角
  function flyToAOI(viewer, defaultView = { lon: 108, lat: 35, height: 15000000 }) {
    // 优先级1：有 AOI 范围，飞到 AOI
    if (store.aoi) {
      const { minLat, maxLat, minLng, maxLng } = store.aoi
      viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(minLng, minLat, maxLng, maxLat),
        duration: 1,
      })
      return
    }
    // 优先级2：有选中地震点，飞到地震点周边
    if (store.selectedEarthquake) {
      const { lon, lat } = store.selectedEarthquake
      viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(lon - 0.3, lat - 0.3, lon + 0.3, lat + 0.3),
        duration: 1,
      })
      return
    }
    // 优先级3：无数据，使用页面默认视角
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(defaultView.lon, defaultView.lat, defaultView.height),
    })
  }

  return { flyToAOI }
}