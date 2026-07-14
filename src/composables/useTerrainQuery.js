import * as Cesium from 'cesium'

/**
 * 地形查询工具（通用，所有页面均可使用）
 * @returns {{ getHeightAtPosition, getHeightsAtPositions, getPickInfo, clearCache }}
 */
export function useTerrainQuery() {
  let _heightCache = null

  function clearCache() {
    _heightCache = null
  }

  /**
   * 获取指定经纬度的地形高度（带缓存，避免重复请求）
   * @param {Cesium.Viewer} viewer
   * @param {number} lon
   * @param {number} lat
   * @returns {Promise<number>} 地形高度（米）
   */
  async function getHeightAtPosition(viewer, lon, lat) {
    const key = `${lon.toFixed(5)},${lat.toFixed(5)}`
    if (_heightCache && _heightCache.has(key)) {
      return _heightCache.get(key)
    }
    const cartographic = Cesium.Cartographic.fromDegrees(lon, lat, 0)
    const result = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic])
    const h = result[0].height || 0
    if (!_heightCache) _heightCache = new Map()
    _heightCache.set(key, h)
    return h
  }

  /**
   * 批量获取多个经纬度的地形高度（一次 API 请求，带缓存）
   * @param {Cesium.Viewer} viewer
   * @param {Array<{lon:number, lat:number}>} positions - 经纬度数组
   * @returns {Promise<number[]>} 地形高度数组（米）
   */
  async function getHeightsAtPositions(viewer, positions) {
    // 先检查缓存，只查询未缓存的点
    const uncached = []
    const uncachedIdx = []
    const results = []
    for (let i = 0; i < positions.length; i++) {
      const key = `${positions[i].lon.toFixed(5)},${positions[i].lat.toFixed(5)}`
      if (_heightCache && _heightCache.has(key)) {
        results[i] = _heightCache.get(key)
      } else {
        uncached.push(positions[i])
        uncachedIdx.push(i)
      }
    }
    if (uncached.length > 0) {
      const cartographics = uncached.map(p => Cesium.Cartographic.fromDegrees(p.lon, p.lat, 0))
      const sampled = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartographics)
      if (!_heightCache) _heightCache = new Map()
      for (let i = 0; i < uncached.length; i++) {
        const h = sampled[i].height || 0
        const key = `${uncached[i].lon.toFixed(5)},${uncached[i].lat.toFixed(5)}`
        _heightCache.set(key, h)
        results[uncachedIdx[i]] = h
      }
    }
    return results
  }

  /**
   * 从鼠标点击事件中提取经纬度和地面高度
   * @param {Cesium.Viewer} viewer
   * @param {Object} click - Cesium 点击事件对象
   * @returns {Promise<{lon:number, lat:number, groundH:number}|null>}
   */
  async function getPickInfo(viewer, click) {
    let cartesian = viewer.scene.pickPosition(click.position)
    if (!Cesium.defined(cartesian)) {
      const ray = viewer.camera.getPickRay(click.position)
      if (Cesium.defined(ray)) {
        try { cartesian = viewer.scene.globe.pick(ray, viewer.scene) } catch (e) {}
      }
    }
    if (!Cesium.defined(cartesian)) return null
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    const lon = Cesium.Math.toDegrees(cartographic.longitude)
    const lat = Cesium.Math.toDegrees(cartographic.latitude)
    const groundH = await getHeightAtPosition(viewer, lon, lat)
    return { lon, lat, groundH }
  }

  return { getHeightAtPosition, getHeightsAtPositions, getPickInfo, clearCache }
}