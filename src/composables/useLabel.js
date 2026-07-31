import { ref } from 'vue'
import * as Cesium from 'cesium'

export function useLabel(viewer, clearDraw) {
  const labelMode = ref(false)
  let labelHandler = null
  let labelEntities = []

  function clearLabels() {
    labelEntities.forEach(e => viewer.entities.remove(e))
    labelEntities = []
    labelMode.value = false
    if (labelHandler) { labelHandler.destroy(); labelHandler = null }
  }

  function toggleLabelMode() {
    labelMode.value = !labelMode.value
    if (labelMode.value) {
      clearDraw()
      labelHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      labelHandler.setInputAction((click) => {
        const cartesian = viewer.scene.pickPosition(click.position)
        if (!cartesian) return
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)
        const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)
        const label = prompt('输入标注文字:', `经度${lon} 纬度${lat}`)
        if (!label) return
        const entity = viewer.entities.add({
          position: cartesian,
          label: { text: label, font: '14px sans-serif', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -10) },
        })
        labelEntities.push(entity)
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    } else if (labelHandler) {
      labelHandler.destroy()
      labelHandler = null
    }
  }

  return {
    labelMode,
    clearLabels,
    toggleLabelMode
  }
}