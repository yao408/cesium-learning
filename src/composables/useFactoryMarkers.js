import { ref } from 'vue'
import * as Cesium from 'cesium'
import { factories } from '../data/factories.js'

export function useFactoryMarkers() {
  const showFactoryPanel = ref(false)
  const selectedFactory = ref(null)
  const factoryEntities = []

  let factoryClickHandler = null

  function drawFactoryMarkers(viewer, vehicleSlots, createGlowMarkerIcon) {
    clearFactoryMarkers(viewer)
    if (!viewer) return

    const slots = vehicleSlots.value
    if (!slots || slots.length === 0) return

    const factoryColors = ['#e74c3c', '#f39c12', '#27ae60']

    slots.forEach((slot, i) => {
      const factory = factories[i]
      if (!factory || !slot.path || slot.path.length === 0) return

      const startPoint = slot.path[0]
      const lat = startPoint[0]
      const lng = startPoint[1]
      const markerColor = slot.color || factoryColors[i] || '#f59e0b'

      const iconCanvas = createGlowMarkerIcon(markerColor, 'tower')
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
        billboard: {
          image: iconCanvas,
          width: 52,
          height: 52,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(500, 1.5, 500000, 0.5),
        },
        label: {
          text: factory.name,
          font: '14px "Microsoft YaHei", sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 8),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 500000, 0.4),
        },
        properties: {
          factoryId: factory.id,
          factoryName: factory.name,
          posLat: lat,
          posLng: lng,
        }
      })
      factoryEntities.push(entity)
    })
  }

  function clearFactoryMarkers(viewer) {
    if (!viewer) return
    factoryEntities.forEach(e => viewer.entities.remove(e))
    factoryEntities.length = 0
  }

  function onMapLeftClick(position, viewer) {
    if (!viewer || !viewer.scene) return

    const pickedList = viewer.scene.drillPick(position)
    for (const picked of pickedList) {
      if (!Cesium.defined(picked.id)) continue
      const entity = picked.id
      if (entity.properties && entity.properties.factoryId) {
        const factoryId = entity.properties.factoryId.getValue()
        const factory = factories.find(f => f.id === factoryId)
        if (factory) {
          const mergedFactory = {
            ...factory,
            position: {
              lat: entity.properties.posLat.getValue(),
              lng: entity.properties.posLng.getValue(),
            }
          }
          openFactoryPanel(mergedFactory)
          return
        }
      }
    }
  }

  function openFactoryPanel(factory) {
    selectedFactory.value = factory
    showFactoryPanel.value = true
  }

  function closeFactoryPanel() {
    showFactoryPanel.value = false
    selectedFactory.value = null
  }

  function gotoFactoryDetail(router) {
    if (selectedFactory.value) {
      router.push(`/factory/${selectedFactory.value.id}`)
    }
  }

  function setupFactoryClick(viewer) {
    teardownFactoryClick()
    factoryClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    factoryClickHandler.setInputAction(
      (click) => onMapLeftClick(click.position, viewer),
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    )
  }

  function teardownFactoryClick() {
    if (factoryClickHandler) {
      factoryClickHandler.destroy()
      factoryClickHandler = null
    }
  }

  return {
    showFactoryPanel,
    selectedFactory,
    factoryEntities,
    drawFactoryMarkers,
    clearFactoryMarkers,
    onMapLeftClick,
    openFactoryPanel,
    closeFactoryPanel,
    gotoFactoryDetail,
    setupFactoryClick,
    teardownFactoryClick,
  }
}