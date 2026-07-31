// ==================== 城市通视分析 ====================
function showFrustumPreview() {
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