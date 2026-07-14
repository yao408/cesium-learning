import * as Cesium from 'cesium'

/**
 * 火点探测模拟（独立模块，通过参数接收通视计算函数和 AOI 范围）
 * 在 AOI 区域内随机生成火点，逐个检测是否被瞭望塔可见
 * @returns {{ runFirePointSimulation }}
 */
export function useFireSimulation() {
  /**
   * 在 AOI 区域内随机生成火点，检测可见性
   * @param {Cesium.Viewer} viewer
   * @param {Object} opts
   * @param {Array<{lon:number, lat:number}>} opts.towerPoints - 瞭望塔坐标数组
   * @param {number} opts.observerHeight - 瞭望塔离地高度（米）
   * @param {number} opts.maxDistance - 最大探测距离（米），超出此距离的火点直接判定为不可见
   * @param {number} opts.firePointCount - 模拟火点数量
   * @param {number} opts.smokeHeight - 烟雾离地高度（米）
   * @param {{minLat:number, maxLat:number, minLng:number, maxLng:number}} opts.aoi - 火点生成范围（AOI 区域）
   * @param {Array} opts.firePointEntities - 火点实体数组（输出，函数会 push 进去）
   * @param {Function} opts.getHeightAtPosition - 地形高度查询函数 (viewer, lon, lat) => Promise<number>
   * @param {Function} opts.isPointVisibleFrom - 通视判断函数 (viewer, fromLon, fromLat, fromH, toLon, toLat, toH) => Promise<boolean>
   * @returns {Promise<{stats: {fireTotal:number, fireDetected:number, fireMissed:number}}>}
   */
  async function runFirePointSimulation(viewer, opts) {
    const { towerPoints, observerHeight, maxDistance, firePointCount, smokeHeight, firePointEntities, aoi, getHeightAtPosition, isPointVisibleFrom, addFireMarker, firePoints } = opts

    // 计算每个瞭望塔的绝对高度（地面 + 塔高）
    const heights = []
    for (const p of towerPoints) {
      const gnd = await getHeightAtPosition(viewer, p.lon, p.lat)
      heights.push(gnd + observerHeight + 2.1)
    }

    // 火点坐标：优先使用传入的固定坐标，否则随机生成
    const { minLat, maxLat, minLng, maxLng } = aoi
    let points
    if (firePoints && firePoints.length > 0) {
      points = firePoints
    } else {
      points = []
      for (let i = 0; i < firePointCount; i++) {
        points.push({
          lon: minLng + Math.random() * (maxLng - minLng),
          lat: minLat + Math.random() * (maxLat - minLat),
        })
      }
    }

    // 逐个检测火点可见性（先距离过滤，再地形遮挡判断）
    let detected = 0, missed = 0
    const updatedMarkers = []
    for (let idx = 0; idx < points.length; idx++) {
      const fp = points[idx]
      let visible = false
      for (let i = 0; i < towerPoints.length; i++) {
        // 1. 距离过滤：超出探测半径直接不可见
        const dLat = (fp.lat - towerPoints[i].lat) * 111000
        const dLon = (fp.lon - towerPoints[i].lon) * 111000 * Math.cos(Cesium.Math.toRadians((fp.lat + towerPoints[i].lat) / 2))
        if (Math.sqrt(dLat * dLat + dLon * dLon) > maxDistance) continue
        // 2. 地形遮挡判断
        if (await isPointVisibleFrom(viewer, towerPoints[i].lon, towerPoints[i].lat, heights[i], fp.lon, fp.lat, smokeHeight)) {
          visible = true
          break
        }
      }

      const label = visible ? '✓' : '✗'

      // 优先复用已有标记（只更新标签文字，避免闪烁）
      const existing = firePointEntities && firePointEntities[idx]
      if (existing && existing.el) {
        const labelEl = existing.el.querySelector('.village-label')
        if (labelEl) labelEl.textContent = label
        updatedMarkers.push(existing)
      } else if (addFireMarker) {
        updatedMarkers.push(addFireMarker(fp.lon, fp.lat, label))
      } else {
        updatedMarkers.push(viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(fp.lon, fp.lat),
          point: { pixelSize: 8, color: visible ? Cesium.Color.LIME.withAlpha(0.9) : Cesium.Color.RED.withAlpha(0.8), outlineColor: Cesium.Color.WHITE, outlineWidth: 1, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
          label: { text: label, font: '12px sans-serif', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL, pixelOffset: new Cesium.Cartesian2(0, -12), heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
        }))
      }

      if (visible) detected++; else missed++
    }

    return { stats: { fireTotal: points.length, fireDetected: detected, fireMissed: missed }, firePoints: points, markers: updatedMarkers }
  }

  return { runFirePointSimulation }
}