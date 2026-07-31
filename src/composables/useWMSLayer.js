import { ref } from 'vue'
import * as Cesium from 'cesium'

export function useWMSLayer(viewer) {
  const wmsLayers = ref([])
  const loading = ref(false)
  const error = ref('')

  /**
   * 添加 WMS 图层
   * @param {Object} options
   * @param {string} options.url - WMS 服务地址
   * @param {string} options.layers - 图层名称
   * @param {string} options.name - 显示名称
   * @param {boolean} options.transparent - 是否透明
   * @param {string} options.format - 图片格式 (image/png, image/jpeg)
   * @param {string} options.crs - 坐标系 (EPSG:4326, EPSG:3857)
   * @param {Array} options.bbox - 图层范围 [minLon, minLat, maxLon, maxLat]
   * @param {boolean} options.flyTo - 是否飞行到图层范围
   */
  function addWMSLayer(options) {
    if (!viewer) {
      error.value = 'Viewer 未初始化'
      return null
    }

    loading.value = true
    error.value = ''

    try {
      const {
        url,
        layers,
        name = layers,
        transparent = true,
        format = 'image/png',
        crs = 'EPSG:4326',
        bbox = null,
        flyTo = true
      } = options

      // 创建 WMS 图层
      // 如果 url 是相对路径 /geoserver，使用代理
      const finalUrl = url.startsWith('/geoserver') ? url : url
      
      // 计算图层范围
      let rectangle = null
      if (bbox && bbox.length === 4) {
        rectangle = Cesium.Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3])
      }
      
      const wmsProvider = new Cesium.WebMapServiceImageryProvider({
        url: finalUrl,
        layers: layers,
        parameters: {
          service: 'WMS',
          version: '1.1.1',
          request: 'GetMap',
          styles: '',
          format: format,
          transparent: transparent,
          srs: crs
        },
        rectangle: rectangle
      })

      // 添加到 Cesium
      const imageryLayer = viewer.imageryLayers.addImageryProvider(wmsProvider)
      
      // 设置图层在底图之上
      viewer.imageryLayers.raiseToTop(imageryLayer)
      
      // 保存图层信息
      const layerInfo = {
        id: Date.now().toString(),
        name: name,
        url: url,
        layers: layers,
        imageryLayer: imageryLayer,
        visible: true,
        opacity: 1.0,
        bbox: bbox
      }
      
      wmsLayers.value.push(layerInfo)
      
      // 飞行到图层范围
      if (flyTo && bbox && bbox.length === 4) {
        viewer.camera.flyTo({
          destination: Cesium.Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]),
          duration: 2
        })
      }
      
      loading.value = false
      
      return layerInfo
    } catch (e) {
      error.value = '添加 WMS 图层失败: ' + e.message
      loading.value = false
      console.error('添加 WMS 图层失败:', e)
      return null
    }
  }

  /**
   * 移除 WMS 图层
   * @param {string} layerId - 图层 ID
   */
  function removeWMSLayer(layerId) {
    const index = wmsLayers.value.findIndex(l => l.id === layerId)
    if (index === -1) return

    const layer = wmsLayers.value[index]
    if (layer.imageryLayer && viewer) {
      viewer.imageryLayers.remove(layer.imageryLayer)
    }
    
    wmsLayers.value.splice(index, 1)
  }

  /**
   * 切换图层可见性
   * @param {string} layerId - 图层 ID
   * @param {boolean} visible - 是否可见
   */
  function toggleLayerVisibility(layerId, visible) {
    const layer = wmsLayers.value.find(l => l.id === layerId)
    if (layer && layer.imageryLayer) {
      layer.imageryLayer.show = visible
      layer.visible = visible
    }
  }

  /**
   * 设置图层透明度
   * @param {string} layerId - 图层 ID
   * @param {number} opacity - 透明度 (0-1)
   */
  function setLayerOpacity(layerId, opacity) {
    const layer = wmsLayers.value.find(l => l.id === layerId)
    if (layer && layer.imageryLayer) {
      layer.imageryLayer.alpha = opacity
      layer.opacity = opacity
    }
  }

  /**
   * 清空所有 WMS 图层
   */
  function clearAllWMSLayers() {
    wmsLayers.value.forEach(layer => {
      if (layer.imageryLayer && viewer) {
        viewer.imageryLayers.remove(layer.imageryLayer)
      }
    })
    wmsLayers.value = []
  }

  /**
   * 获取 WMS 图层列表（用于 GetCapabilities）
   * @param {string} url - WMS 服务地址
   */
  async function getWMSCapabilities(url) {
    try {
      const capabilitiesUrl = url + (url.includes('?') ? '&' : '?') + 
        'service=WMS&version=1.1.1&request=GetCapabilities'
      
      const response = await fetch(capabilitiesUrl)
      const text = await response.text()
      
      // 简单解析 XML 获取图层列表
      const parser = new DOMParser()
      const xml = parser.parseFromString(text, 'text/xml')
      
      const layerElements = xml.querySelectorAll('Layer > Name')
      const layers = Array.from(layerElements).map(el => ({
        name: el.textContent,
        title: el.parentElement.querySelector('Title')?.textContent || el.textContent
      }))
      
      return layers
    } catch (e) {
      console.error('获取 WMS 图层列表失败:', e)
      return []
    }
  }

  return {
    wmsLayers,
    loading,
    error,
    addWMSLayer,
    removeWMSLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    clearAllWMSLayers,
    getWMSCapabilities
  }
}