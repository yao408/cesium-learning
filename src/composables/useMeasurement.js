/**
 * 图形测量
 * 
 * 功能：
 * - 点：坐标、高程
 * - 线：长度（快速/精确）
 * - 面：面积（快速/精确）、周长
 * - 3D：高度、角度、体积
 * - 实时测量结果显示
 */

import { ref, computed } from 'vue'
import * as Cesium from 'cesium'
import { 
  getGroundDistanceFast, 
  getGroundDistanceAccurate, 
  getGroundDistanceCesium,
  getSpaceDistance,
  getPolygonAreaFast, 
  getPolygonAreaAccurate,
  getPolygonAreaCesium,
  measureAngle,
  getBoxVolume,
  getCylinderVolume,
  getSphereVolume,
  getTerrainHeight
} from '../utils/measureTools.js'

export function useMeasurement(viewer) {
  // 测量结果
  const measureResult = ref(null)
  const measuring = ref(false)
  
  // ==================== 距离测量 ====================
  
  /**
   * 测量线段长度
   * @param {Array} positions - Cartesian3 数组
   * @param {boolean} accurate - 是否使用精确计算
   * @returns {number} 长度（米）
   */
  function measureLineLength(positions, accurate = false) {
    if (!positions || positions.length < 2) return 0
    
    let total = 0
    
    for (let i = 0; i < positions.length - 1; i++) {
      const p1 = positions[i]
      const p2 = positions[i + 1]
      
      if (accurate) {
        // 精确：椭球距离
        const carto1 = Cesium.Cartographic.fromCartesian(p1)
        const carto2 = Cesium.Cartographic.fromCartesian(p2)
        total += getGroundDistanceAccurate(
          Cesium.Math.toDegrees(carto1.latitude),
          Cesium.Math.toDegrees(carto1.longitude),
          Cesium.Math.toDegrees(carto2.latitude),
          Cesium.Math.toDegrees(carto2.longitude)
        )
      } else {
        // 快速：haversine
        const carto1 = Cesium.Cartographic.fromCartesian(p1)
        const carto2 = Cesium.Cartographic.fromCartesian(p2)
        total += getGroundDistanceFast(
          Cesium.Math.toDegrees(carto1.latitude),
          Cesium.Math.toDegrees(carto1.longitude),
          Cesium.Math.toDegrees(carto2.latitude),
          Cesium.Math.toDegrees(carto2.longitude)
        )
      }
    }
    
    return total
  }
  
  /**
   * 使用 Cesium 内置方法测量距离
   * @param {Array} positions - Cartesian3 数组
   * @returns {number} 长度（米）
   */
  function measureLineLengthCesium(positions) {
    if (!positions || positions.length < 2) return 0
    
    let total = 0
    
    for (let i = 0; i < positions.length - 1; i++) {
      const carto1 = Cesium.Cartographic.fromCartesian(positions[i])
      const carto2 = Cesium.Cartographic.fromCartesian(positions[i + 1])
      total += getGroundDistanceCesium(carto1, carto2)
    }
    
    return total
  }
  
  /**
   * 测量 3D 空间距离
   * @param {Array} positions - Cartesian3 数组
   * @returns {number} 长度（米）
   */
  function measure3DLength(positions) {
    if (!positions || positions.length < 2) return 0
    
    let total = 0
    for (let i = 0; i < positions.length - 1; i++) {
      total += getSpaceDistance(positions[i], positions[i + 1])
    }
    return total
  }
  
  // ==================== 面积测量 ====================
  
  /**
   * 测量多边形面积
   * @param {Array} positions - Cartesian3 数组
   * @param {boolean} accurate - 是否使用精确计算
   * @returns {number} 面积（平方米）
   */
  function measurePolygonArea(positions, accurate = false) {
    if (!positions || positions.length < 3) return 0
    
    if (accurate) {
      return getPolygonAreaAccurate(positions)
    } else {
      const pts = positions.map(p => {
        const carto = Cesium.Cartographic.fromCartesian(p)
        return {
          lat: Cesium.Math.toDegrees(carto.latitude),
          lng: Cesium.Math.toDegrees(carto.longitude)
        }
      })
      return getPolygonAreaFast(pts)
    }
  }
  
  /**
   * 使用 Cesium 内置方法测量面积
   * @param {Array} positions - Cartesian3 数组
   * @returns {number} 面积（平方米）
   */
  function measurePolygonAreaCesium(positions) {
    if (!positions || positions.length < 3) return 0
    return getPolygonAreaCesium(positions)
  }
  
  /**
   * 测量多边形周长
   * @param {Array} positions - Cartesian3 数组
   * @param {boolean} accurate - 是否精确
   * @returns {number} 周长（米）
   */
  function measurePerimeter(positions, accurate = false) {
    if (!positions || positions.length < 2) return 0
    
    // 闭合多边形
    const closedPositions = [...positions, positions[0]]
    return measureLineLength(closedPositions, accurate)
  }
  
  // ==================== 高度测量 ====================
  
  /**
   * 测量 3D 高度
   * @param {Cesium.Cartesian3} bottom - 底部点
   * @param {Cesium.Cartesian3} top - 顶部点
   * @returns {number} 高度（米）
   */
  function measureHeight(bottom, top) {
    return getSpaceDistance(bottom, top)
  }
  
  /**
   * 测量点的高程
   * @param {Cesium.Cartesian3} position 
   * @returns {number} 高程（米）
   */
  function measureElevation(position) {
    const carto = Cesium.Cartographic.fromCartesian(position)
    return carto.height
  }
  
  /**
   * 异步查询地形高度
   * @param {number} lon - 经度
   * @param {number} lat - 纬度
   * @returns {Promise<number>} 地形高度（米）
   */
  async function queryTerrainHeight(lon, lat) {
    return await getTerrainHeight(viewer, lon, lat)
  }
  
  // ==================== 角度测量 ====================
  
  /**
   * 测量两条线的夹角
   * @param {Cesium.Cartesian3} center - 顶点
   * @param {Cesium.Cartesian3} p1 - 第一条线端点
   * @param {Cesium.Cartesian3} p2 - 第二条线端点
   * @returns {number} 角度（度）
   */
  function measureLineAngle(center, p1, p2) {
    return measureAngle(center, p1, p2)
  }
  
  /**
   * 测量方位角
   * @param {Cesium.Cartesian3} from - 起点
   * @param {Cesium.Cartesian3} to - 终点
   * @returns {number} 方位角（度，北为 0）
   */
  function measureAzimuth(from, to) {
    const carto1 = Cesium.Cartographic.fromCartesian(from)
    const carto2 = Cesium.Cartographic.fromCartesian(to)
    
    const lat1 = Cesium.Math.toRadians(carto1.latitude)
    const lat2 = Cesium.Math.toRadians(carto2.latitude)
    const dLon = Cesium.Math.toRadians(carto2.longitude - carto1.longitude)
    
    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    
    let azimuth = Math.atan2(y, x) * 180 / Math.PI
    if (azimuth < 0) azimuth += 360
    
    return azimuth
  }
  
  // ==================== 体积测量 ====================
  
  /**
   * 测量立方体体积
   * @param {number} width - 宽（米）
   * @param {number} height - 高（米）
   * @param {number} depth - 深（米）
   * @returns {number} 体积（立方米）
   */
  function measureBoxVolume(width, height, depth) {
    return getBoxVolume(width, height, depth)
  }
  
  /**
   * 测量圆柱体积
   * @param {number} radius - 半径（米）
   * @param {number} height - 高（米）
   * @returns {number} 体积（立方米）
   */
  function measureCylinderVolume(radius, height) {
    return getCylinderVolume(radius, height)
  }
  
  /**
   * 测量球体体积
   * @param {number} radius - 半径（米）
   * @returns {number} 体积（立方米）
   */
  function measureSphereVolume(radius) {
    return getSphereVolume(radius)
  }
  
  // ==================== 坐标转换 ====================
  
  /**
   * Cartesian3 转经纬度高程
   * @param {Cesium.Cartesian3} position 
   * @returns {Object} {lon, lat, height}
   */
  function cartesianToDegrees(position) {
    const carto = Cesium.Cartographic.fromCartesian(position)
    return {
      lon: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
      height: carto.height
    }
  }
  
  /**
   * 经纬度高程转 Cartesian3
   * @param {number} lon 
   * @param {number} lat 
   * @param {number} height 
   * @returns {Cesium.Cartesian3}
   */
  function degreesToCartesian(lon, lat, height = 0) {
    return Cesium.Cartesian3.fromDegrees(lon, lat, height)
  }
  
  // ==================== 实时测量 ====================
  
  /**
   * 开始实时测量模式
   * 鼠标移动时显示测量结果
   */
  function startRealtimeMeasurement(options = {}) {
    const { 
      type = 'distance',  // distance | area | height
      accurate = false,
      onUpdate = null     // 更新回调
    } = options
    
    measuring.value = true
    const positions = []
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    
    // 点击添加点
    handler.setInputAction((click) => {
      const cartesian = viewer.scene.pickPosition(click.position) ||
                       viewer.camera.pickEllipsoid(click.position)
      
      if (cartesian) {
        positions.push(cartesian)
        updateMeasureResult()
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    // 移动时更新
    handler.setInputAction((move) => {
      if (positions.length > 0) {
        const cartesian = viewer.scene.pickPosition(move.endPosition) ||
                         viewer.camera.pickEllipsoid(move.endPosition)
        
        if (cartesian) {
          const tempPositions = [...positions, cartesian]
          const result = calculateMeasureResult(tempPositions, type, accurate)
          measureResult.value = result
          
          if (onUpdate) onUpdate(result)
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    
    // 双击完成
    handler.setInputAction(() => {
      measuring.value = false
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    
    function updateMeasureResult() {
      const result = calculateMeasureResult(positions, type, accurate)
      measureResult.value = result
      if (onUpdate) onUpdate(result)
    }
    
    return {
      stop: () => {
        measuring.value = false
        handler.destroy()
      },
      getPositions: () => positions
    }
  }
  
  /**
   * 计算测量结果
   */
  function calculateMeasureResult(positions, type, accurate) {
    switch (type) {
      case 'distance':
        return {
          type: 'distance',
          value: measureLineLength(positions, accurate),
          unit: 'm',
          formatted: formatDistance(measureLineLength(positions, accurate))
        }
      
      case 'area':
        if (positions.length < 3) return null
        return {
          type: 'area',
          value: measurePolygonArea(positions, accurate),
          unit: 'm²',
          formatted: formatArea(measurePolygonArea(positions, accurate))
        }
      
      case 'height':
        if (positions.length < 2) return null
        return {
          type: 'height',
          value: measureHeight(positions[0], positions[1]),
          unit: 'm',
          formatted: formatDistance(measureHeight(positions[0], positions[1]))
        }
      
      default:
        return null
    }
  }
  
  // ==================== 格式化 ====================
  
  /**
   * 格式化距离显示
   */
  function formatDistance(meters) {
    if (meters < 1000) {
      return `${meters.toFixed(1)} m`
    } else if (meters < 100000) {
      return `${(meters / 1000).toFixed(2)} km`
    } else {
      return `${(meters / 1000).toFixed(1)} km`
    }
  }
  
  /**
   * 格式化面积显示
   */
  function formatArea(squareMeters) {
    if (squareMeters < 10000) {
      return `${squareMeters.toFixed(0)} m²`
    } else if (squareMeters < 1000000) {
      return `${(squareMeters / 10000).toFixed(2)} 公顷`
    } else {
      return `${(squareMeters / 1000000).toFixed(2)} km²`
    }
  }
  
  /**
   * 格式化角度显示
   */
  function formatAngle(degrees) {
    return `${degrees.toFixed(1)}°`
  }
  
  // ==================== 返回值 ====================
  
  return {
    // 状态
    measureResult,
    measuring,
    
    // 距离
    measureLineLength,
    measureLineLengthCesium,
    measure3DLength,
    
    // 面积
    measurePolygonArea,
    measurePolygonAreaCesium,
    measurePerimeter,
    
    // 高度
    measureHeight,
    measureElevation,
    queryTerrainHeight,
    
    // 角度
    measureLineAngle,
    measureAzimuth,
    
    // 体积
    measureBoxVolume,
    measureCylinderVolume,
    measureSphereVolume,
    
    // 坐标
    cartesianToDegrees,
    degreesToCartesian,
    
    // 实时测量
    startRealtimeMeasurement,
    
    // 格式化
    formatDistance,
    formatArea,
    formatAngle
  }
}