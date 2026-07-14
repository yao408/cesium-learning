/**
 * useSiteMarkers.js
 * 
 * 可复用的 DOM 标记 Composable，用于在 Cesium 3D 地图上叠加村庄和瞭望塔的 SVG 图标。
 * 
 * 核心原理：
 * - 不使用 Cesium 的 Billboard（避免裂纹/模糊问题），而是直接用 DOM 元素叠加在 viewer 容器上
 * - 通过 Cesium 的 postRender 事件，每帧将 3D 地理坐标映射为屏幕像素坐标
 * - 每个标记是一个 div（class="village-marker"），内含 img（SVG 图标）+ span（文字标签）
 * 
 * 被以下页面复用：DataImport / ViewshedAnalysis / FloodSim / MultiVehicle
 */
import { ref } from 'vue'
import * as Cesium from 'cesium'
import { useViewerStore } from '../stores/viewerStore.js'

/**
 * 创建并管理 Cesium 地图上的 DOM 标记（村庄/瞭望塔图标）
 * @returns {Object} { markers, addVillage, addWatchtower, removeMarker, clearAll, loadWatchtowers, loadVillages }
 */
export function useSiteMarkers() {
  const viewerStore = useViewerStore()
  const markers = ref([])
  let _syncHandler = null

  // 创建标记的 DOM 结构：div.village-marker > img.village-icon + span.village-label
  function createMarkerEl(iconPath, label, iconClass) {
    const el = document.createElement('div')
    el.className = 'village-marker'
    const cls = iconClass ? ' class="village-icon ' + iconClass + '"' : ' class="village-icon"'
    el.innerHTML = '<img src="' + iconPath + '"' + cls + ' alt="" /><span class="village-label">' + (label || '') + '</span>'
    return el
  }

  // 内部通用方法：在指定经纬度创建 DOM 标记，挂载到 viewer.container，首次自动启动同步
  function addMarker(lon, lat, iconPath, label, height, iconClass) {
    const v = viewerStore.viewer
    if (!v) return null
    const el = createMarkerEl(iconPath, label, iconClass)
    v.container.appendChild(el)
    const marker = { el, position: Cesium.Cartesian3.fromDegrees(lon, lat, height || 0) }
    markers.value.push(marker)
    if (!_syncHandler) startSync()
    return marker
  }

  // 添加村庄标记（village.svg 图标 + 文字标签）
  function addVillage(lon, lat, name) {
    return addMarker(lon, lat, './icons/village.svg', name)
  }

  // 添加村庄圆点（无图标无文字，hover 显示名称）
  function addVillageDot(lon, lat, name) {
    const v = viewerStore.viewer
    if (!v) return null
    const el = document.createElement('div')
    el.className = 'village-dot'
    el.title = name
    const dot = document.createElement('div')
    dot.className = 'village-dot-inner'
    el.appendChild(dot)
    // Hover 显示名称标签
    const tip = document.createElement('span')
    tip.className = 'village-dot-tip'
    tip.textContent = name
    el.appendChild(tip)

    el.addEventListener('mouseenter', () => { tip.style.display = 'block' })
    el.addEventListener('mouseleave', () => { tip.style.display = 'none' })

    el.dataset.type = 'village'

    v.container.appendChild(el)
    const marker = { el, position: Cesium.Cartesian3.fromDegrees(lon, lat, 0) }
    markers.value.push(marker)
    if (!_syncHandler) startSync()
    return marker
  }

  // 添加瞭望塔标记（observation-tower.svg 图标）
  function addWatchtower(lon, lat, name, height, index) {
    const marker = addMarker(lon, lat, './icons/observation-tower.svg', name, height)
    if (marker && index != null) {
      marker.el.dataset.stationIndex = index
      marker.el.dataset.stationName = name
      marker.el.dataset.stationLat = lat
      marker.el.dataset.stationLng = lon
      marker.el.dataset.stationHeight = height || 0
    }
    return marker
  }

  // 添加圆形标记（circle.svg 图标，用于目标点/遮挡点）
  function addCircleMarker(lon, lat, label, height) {
    return addMarker(lon, lat, './icons/circle.svg', label, height, 'village-icon-black')
  }

  // 添加火点标记（fire-station.svg 图标）
  function addFireMarker(lon, lat, label, height) {
    return addMarker(lon, lat, './icons/fire-station.svg', label, height, 'village-icon-black')
  }

  // 添加水源标记（water.svg 图标）
  function addWaterMarker(lon, lat, label, height) {
    return addMarker(lon, lat, './icons/water.svg', label, height, 'village-icon-black')
  }

  // 移除单个标记：从 DOM 删除 + 从 markers 数组剔除
  function removeMarker(marker) {
    const idx = markers.value.indexOf(marker)
    if (idx >= 0) {
      marker.el.remove()
      markers.value.splice(idx, 1)
    }
  }

  // postRender 回调：每帧将 3D 地理坐标映射为屏幕像素坐标，更新 DOM 的 left/top
  function sync() {
    const v = viewerStore.viewer
    // viewer 未就绪时跳过
    if (!v) return
    markers.value.forEach(m => {
      // 3D 地理坐标 → 屏幕像素坐标
      const sp = v.scene.cartesianToCanvasCoordinates(m.position)
      if (sp) {
        // 点位在屏幕可见范围内，更新 DOM 位置
        m.el.style.left = sp.x + 'px'
        m.el.style.top = sp.y + 'px'
        m.el.style.display = 'flex'
      } else {
        // 点位在地球背面或超出屏幕，隐藏
        m.el.style.display = 'none'
      }
    })
  }

  // 启动 postRender 回调
  function startSync() {
    if (_syncHandler) return
    const v = viewerStore.viewer
    if (!v) return
    _syncHandler = v.scene.postRender.addEventListener(sync)
  }

  // 清空所有 DOM 标记 + 解除 postRender 监听（onBeforeUnmount 时必须调用）
  function clearAll() {
    markers.value.forEach(m => m.el.remove())
    markers.value = []
    if (_syncHandler) { _syncHandler(); _syncHandler = null }
  }

  // 从数组批量加载瞭望塔标记（towers: [{ lng/lon, lat, name }]）
  function loadWatchtowers(towers) {
    if (!towers || !towers.length) return
    towers.forEach((t, idx) => {
      addWatchtower(t.lng ?? t.lon, t.lat, t.name, t.height, idx)
    })
  }

  // 从数组批量加载村庄标记（villages: [{ lng/lon, lat, name }]）
  function loadVillages(villages) {
    if (!villages || !villages.length) return
    villages.forEach(v => {
      addVillageDot(v.lng ?? v.lon, v.lat, v.name)
    })
  }

  return { markers, addVillage, addVillageDot, addWatchtower, addCircleMarker, addFireMarker, addWaterMarker, removeMarker, clearAll, loadWatchtowers, loadVillages }
}