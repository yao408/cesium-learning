import { ref } from 'vue'
import * as Cesium from 'cesium'

export function useGeoDraw(viewer, geoSize, clearDraw, clearLabels) {
  const geoMode = ref('')
  let geoEntities = []
  let geoHandler = null

  // 清除所有绘制的几何体
  function clearGeoDraw() {
    geoEntities.forEach(e => viewer.entities.remove(e))
    geoEntities = []
    geoMode.value = ''
    if (geoHandler) { geoHandler.destroy(); geoHandler = null }
  }

  // 开始绘制几何体
  function startGeoDraw(type) {
    clearGeoDraw()
    clearDraw()
    clearLabels()
    geoMode.value = type
    geoHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    geoHandler.setInputAction((click) => {
      const cartesian = viewer.scene.pickPosition(click.position)
      if (!cartesian) return
      placeGeometry(type, cartesian)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  // 放置几何体
  function placeGeometry(type, position) {
    if (type === 'box') {
      const entity = viewer.entities.add({
        position: position,
        box: {
          dimensions: new Cesium.Cartesian3(geoSize.value, geoSize.value, geoSize.value),
          material: Cesium.Color.fromRandom({ alpha: 0.7 }),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
        },
      })
      geoEntities.push(entity)
    }
    if (type === 'cylinder') {
      const entity = viewer.entities.add({
        position: position,
        cylinder: {
          length: geoSize.value,
          topRadius: geoSize.value * 0.3,
          bottomRadius: geoSize.value * 0.3,
          material: Cesium.Color.fromRandom({ alpha: 0.7 }),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
        },
      })
      geoEntities.push(entity)
    }
    if (type === 'sphere') {
      const entity = viewer.entities.add({
        position: position,
        ellipsoid: {
          radii: new Cesium.Cartesian3(geoSize.value * 0.5, geoSize.value * 0.5, geoSize.value * 0.5),
          material: Cesium.Color.fromRandom({ alpha: 0.7 }),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
        },
      })
      geoEntities.push(entity)
    }
    if (type === 'wall') {
      const half = geoSize.value * 0.5
      const cartographic = Cesium.Cartographic.fromCartesian(position)
      const lon = cartographic.longitude
      const lat = cartographic.latitude
      const dLon = half / (111000 * Math.cos(lat))
      const dLat = half / 111000
      const h = geoSize.value
      const corners = [
        Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon + dLon), Cesium.Math.toDegrees(lat + dLat)),
        Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon + dLon), Cesium.Math.toDegrees(lat - dLat)),
        Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon - dLon), Cesium.Math.toDegrees(lat - dLat)),
        Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon - dLon), Cesium.Math.toDegrees(lat + dLat)),
        Cesium.Cartographic.fromDegrees(Cesium.Math.toDegrees(lon + dLon), Cesium.Math.toDegrees(lat + dLat)),
      ]
      Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, corners).then((sampled) => {
        const entity = viewer.entities.add({
          wall: {
            positions: Cesium.Cartesian3.fromRadiansArrayHeights(
              sampled.flatMap((c) => [c.longitude, c.latitude, 0]),
            ),
            maximumHeights: sampled.map((c) => c.height + h),
            minimumHeights: sampled.map((c) => c.height),
            material: Cesium.Color.fromRandom({ alpha: 0.5 }),
            outline: true,
            outlineColor: Cesium.Color.WHITE,
          },
        })
        geoEntities.push(entity)
      })
    }
  }

  // 将经纬度转换为弧度
  function lonLatToRadians(center, offsetLon, offsetLat) {
    const cartographic = Cesium.Cartographic.fromCartesian(center)
    const dLon = Cesium.Math.toRadians(offsetLon / (111000 * Math.cos(cartographic.latitude)))
    const dLat = Cesium.Math.toRadians(offsetLat / 111000)
    return [
      cartographic.longitude + dLon, cartographic.latitude + dLat, 0,
    ]
  }

  return {
    geoMode,
    clearGeoDraw,
    startGeoDraw,
  }
}