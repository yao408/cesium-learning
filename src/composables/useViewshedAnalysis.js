import * as Cesium from 'cesium'
import { haversineDistance } from '../utils/geo.js'
import { useTerrainQuery } from './useTerrainQuery.js'

export function useViewshedAnalysis() {
  const { getHeightAtPosition, getHeightsAtPositions } = useTerrainQuery()

  /**
   * 判断目标点是否对观察点可见（采样视线上的地形）
   * @param {Cesium.Viewer} viewer
   * @param {number} fromLon - 观察点经度
   * @param {number} fromLat - 观察点纬度
   * @param {number} fromHeight - 观察点绝对高度（地面+塔高）
   * @param {number} toLon - 目标点经度
   * @param {number} toLat - 目标点纬度
   * @param {number} toHeightAboveGround - 目标点离地高度
   * @returns {Promise<boolean>} 是否可见
   */
  async function isPointVisibleFrom(viewer, fromLon, fromLat, fromHeight, toLon, toLat, toHeightAboveGround) {
    // 计算两点间直线距离（米）
    const totalDist = haversineDistance(fromLat, fromLon, toLat, toLon)
    const sampleCount = Math.max(10, Math.floor(totalDist / 100)) // 每100m采样一次

    // 沿视线方向生成采样点
    const samplePoints = []
    for (let i = 1; i <= sampleCount; i++) {
      const t = i / sampleCount // 0~1，表示从起点到终点的比例
      samplePoints.push(Cesium.Cartographic.fromDegrees(
        fromLon + (toLon - fromLon) * t,
        fromLat + (toLat - fromLat) * t,
        0
      ))
    }

    // 批量查询所有采样点 + 目标点的地形高度
    const allPositions = [
      ...samplePoints.map(p => ({ lon: Cesium.Math.toDegrees(p.longitude), lat: Cesium.Math.toDegrees(p.latitude) })),
      { lon: toLon, lat: toLat },
    ]
    const results = await getHeightsAtPositions(viewer, allPositions)
    const toGroundH = results[results.length - 1]                          // 目标点地面高度
    const toTotalH = toGroundH + toHeightAboveGround                       // 目标点绝对高度（地面+烟柱）

    // 逐个采样点检查：视线是否被地形遮挡
    for (let i = 0; i < sampleCount; i++) {
      const t = (i + 1) / sampleCount
      const terrainH = results[i] || 0                             // 该采样点的地形高度
      const losH = fromHeight + (toTotalH - fromHeight) * t         // 该采样点处视线的高度（线性插值）
      if (terrainH > losH) return false                             // 地形高于视线 → 被遮挡
    }
    return true // 所有采样点视线均高于地形 → 可见
  }

  // ==================== 内部辅助：单条射线采样 ====================
  /**
   * 从观察点沿指定角度发射射线，采样地形并绘制可见/遮挡段
   * @param {Cesium.Viewer} viewer
   * @param {Object} opts
   * @param {number} opts.originLon - 观察点经度
   * @param {number} opts.originLat - 观察点纬度
   * @param {number} opts.originHeight - 观察点绝对高度
   * @param {number} opts.angle - 射线角度（弧度）
   * @param {number} opts.stepSize - 采样步长（米）
   * @param {number} opts.maxDistance - 最大探测距离（米）
   * @param {string} opts.pointColor - 可见段颜色（CSS 字符串）
   * @param {Array} opts.viewshedEntities - 通视线实体数组（输出）
   */
  async function raycastAndDraw(viewer, opts) {
    const { originLon, originLat, originHeight, angle, stepSize, maxDistance, pointColor, viewshedEntities, targetHeight = 10 } = opts
    const cosLat = Math.cos(Cesium.Math.toRadians(originLat))
    const visColor = Cesium.Color.fromCssColorString(pointColor || '#4ade80').withAlpha(0.7)
    const hidColor = Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.5)

    // 生成采样点
    const samplePoints = []
    const numSteps = Math.floor(maxDistance / stepSize)
    for (let i = 1; i <= numSteps; i++) {
      const dist = i * stepSize
      const dLat = (dist / 111000) * Math.cos(angle)
      const dLon = (dist / (111000 * cosLat)) * Math.sin(angle)
      samplePoints.push({ lon: originLon + dLon, lat: originLat + dLat, dist })
    }
    if (samplePoints.length === 0) return

    // 批量查询地形高度
    const results = await getHeightsAtPositions(viewer, samplePoints.map(p => ({ lon: p.lon, lat: p.lat })))

    // 严格逐点判断：
    // 对于每个点i，检查前面所有点0~i-1中，是否有任何点地形高于从起点到i的视线
    // 如果有 → 被挡住了 → 不可见
    // 如果没有 → 可见
    const visibleFlags = []
    for (let i = 0; i < samplePoints.length; i++) {
      const dist = samplePoints[i].dist
      const terrainH = results[i] || 0
      let blocked = false
      for (let j = 0; j < i; j++) {
        const distJ = samplePoints[j].dist
        const terrainHj = results[j] || 0
        const losHj = originHeight + (terrainH + targetHeight - originHeight) * (distJ / dist)
        if (terrainHj > losHj + 0.01) {
          blocked = true
          break
        }
      }
      visibleFlags.push(!blocked)
    }

    // 绘制线段（单条线，不叠加）
    function drawSegment(endLon, endLat, visible) {
      viewshedEntities.push(viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([segStartLon, segStartLat, endLon, endLat]),
          width: 3,
          material: visible ? visColor : hidColor,
          clampToGround: true,
        },
      }))
    }

    let prevVisible = visibleFlags[0]
    let segStartLon = originLon
    let segStartLat = originLat

    for (let i = 1; i < samplePoints.length; i++) {
      const visible = visibleFlags[i]
      if (visible !== prevVisible) {
        const p = samplePoints[i]
        drawSegment(p.lon, p.lat, prevVisible)
        segStartLon = p.lon
        segStartLat = p.lat
        prevVisible = visible
      }
    }

    const lastPoint = samplePoints[samplePoints.length - 1]
    drawSegment(lastPoint.lon, lastPoint.lat, prevVisible)
  }

  // ==================== 公开：单瞭望塔全向通视分析 ====================
  /**
   * 对单个瞭望塔执行 360° 扇形通视分析
   * @param {Cesium.Viewer} viewer
   * @param {Object} opts
   * @param {number} opts.centerLon
   * @param {number} opts.centerLat
   * @param {number} opts.observerHeight - 瞭望塔离地高度
   * @param {number} opts.maxDistance - 最大探测距离
   * @param {number} opts.stepSize - 采样步长
   * @param {string} opts.pointColor - 可见段颜色
   * @param {Array} opts.viewshedEntities - 通视线实体数组（输出）
   */
  async function computeViewshed(viewer, opts) {
    const { centerLon, centerLat, observerHeight, maxDistance, stepSize, pointColor, viewshedEntities, targetHeight = 10, groundHeight: manualGround, rayCount = 36 } = opts
    const groundHeight = manualGround ?? (await getHeightAtPosition(viewer, centerLon, centerLat))
    const totalHeight = groundHeight + observerHeight + 2.1
    const angleStep = 360 / rayCount
    const steps = rayCount

    const angles = []
    for (let i = 0; i < steps; i++) {
      angles.push(Cesium.Math.toRadians(i * angleStep))
    }

    const BATCH_SIZE = 10
    for (let i = 0; i < angles.length; i += BATCH_SIZE) {
      const batch = angles.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(angle =>
        raycastAndDraw(viewer, {
          originLon: centerLon, originLat: centerLat, originHeight: totalHeight, angle,
          stepSize, maxDistance, pointColor, viewshedEntities, targetHeight,
        })
      ))
    }
  }

  // ==================== 公开：两点间通视计算 ====================
  /**
   * 计算观察点到目标点的通视情况
   * @param {Cesium.Viewer} viewer
   * @param {Object} opts
   * @param {{lon:number, lat:number}} opts.observerPoint
   * @param {{lon:number, lat:number}} opts.targetPoint
   * @param {number} opts.observerHeight - 观察点离地高度
   * @param {number} opts.targetHeight - 目标点离地高度
   * @param {Array} opts.losEntities - 通视线实体数组（输出）
   * @returns {Promise<{result: {visible:boolean, blockDist:number, totalDist:number}, cameraTarget: {midLon:number, midLat:number, camDist:number}}>}
   */
  async function computeLineOfSight(viewer, opts) {
    const { observerPoint, targetPoint, observerHeight, targetHeight, losEntities, addCircleMarker, pointColor, stepSize = 100 } = opts
    const obs = observerPoint
    const tgt = targetPoint

    const obsGround = obs.groundHeight ?? (await getHeightAtPosition(viewer, obs.lon, obs.lat))
    const tgtGround = tgt.groundHeight ?? (await getHeightAtPosition(viewer, tgt.lon, tgt.lat))
    const obsH = obsGround + observerHeight + 2.1
    const tgtH = tgtGround + targetHeight

    const totalDist = haversineDistance(obs.lat, obs.lon, tgt.lat, tgt.lon)

    const sampleCount = Math.max(20, Math.floor(totalDist / stepSize))
    const samplePoints = []
    for (let i = 1; i <= sampleCount; i++) {
      const t = i / sampleCount
      samplePoints.push({
        lon: obs.lon + (tgt.lon - obs.lon) * t,
        lat: obs.lat + (tgt.lat - obs.lat) * t,
        t,
      })
    }

    const results = await getHeightsAtPositions(viewer, samplePoints.map(p => ({ lon: p.lon, lat: p.lat })))

    let blocked = false
    let blockDist = 0
    let blockLon = 0
    let blockLat = 0
    let blockIdx = -1

    for (let i = 0; i < samplePoints.length; i++) {
      const terrainH = results[i] || 0
      const t = samplePoints[i].t
      const losH = obsH + (tgtH - obsH) * t
      if (terrainH > losH) {
        blocked = true
        blockDist = totalDist * t
        blockLon = samplePoints[i].lon
        blockLat = samplePoints[i].lat
        blockIdx = i
        break
      }
    }

    // 绘制通视线（推入传入的实体数组）
    if (blocked) {
      losEntities.push(viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([obs.lon, obs.lat, blockLon, blockLat]),
          width: 2,
          material: Cesium.Color.fromCssColorString(pointColor || '#4ade80').withAlpha(0.3),
          clampToGround: true,
        },
      }))
      losEntities.push(viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([blockLon, blockLat, tgt.lon, tgt.lat]),
          width: 5,
          material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.2), dashLength: 8 }),
          clampToGround: true,
        },
      }))
      if (addCircleMarker) {
        losEntities.push(addCircleMarker(blockLon, blockLat, '遮挡', results[blockIdx] || 0))
      } else {
        losEntities.push(viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(blockLon, blockLat),
          point: {
            pixelSize: 8,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: '遮挡点',
            font: '11px sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -16),
            fillColor: Cesium.Color.RED,
            style: Cesium.LabelStyle.FILL,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }))
      }
    } else {
      losEntities.push(viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([obs.lon, obs.lat, tgt.lon, tgt.lat]),
          width: 2,
          material: Cesium.Color.fromCssColorString(pointColor || '#4ade80').withAlpha(0.3),
          clampToGround: true,
        },
      }))
    }

    // 返回分析结果 + 建议的相机视角
    const midLon = (obs.lon + tgt.lon) / 2
    const midLat = (obs.lat + tgt.lat) / 2
    const camDist = Math.max(totalDist * 0.8, 800)

    return {
      result: { visible: !blocked, blockDist, totalDist },
      cameraTarget: { midLon, midLat, camDist },
    }
  }

  return {
    isPointVisibleFrom,
    computeViewshed,
    computeLineOfSight,
  }
}