import { ref, watch } from 'vue'
import * as Cesium from 'cesium'
import { useViewerStore } from '../stores/viewerStore.js'
import { useScenarioStore } from '../stores/scenarioStore.js'
import { haversineDistance } from '../utils/geo.js'

export function useVehicleSimulation() {
  const viewerStore = useViewerStore()
  const store = useScenarioStore()

  let viewer = null
  let postRenderHandler = null
  let hoverHandler = null
  let nextSlotId = 1
  let trackInfoElement = null

  // ==================== 响应式状态 ====================
  const vehicleSlots = ref([])
  const activeSlotId = ref(0)
  const isSimulating = ref(false)
  const isPaused = ref(false)
  const vehicleSpeed = ref(100)
  const vehicleProgress = ref(0)
  const currentSegment = ref('')
  const cameraLocked = ref(true)
  const userPath = ref([])
  const routeMode = ref(false)
  const routeStart = ref(null)
  const routeEnd = ref(null)
  const routeOptions = ref([])
  const selectedRoute = ref(0)

  // ==================== SVG 标记图标 ====================
  function createMarkerIcon(bgColor) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
      <defs>
        <filter id="s">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.5"/>
        </filter>
      </defs>
      <g filter="url(#s)">
        <path d="M32 8C20 8 12 17 12 28c0 6 3 17 20 44 17-27 20-38 20-44C52 17 44 8 32 8z" fill="${bgColor}" fill-opacity="0.55" stroke="${bgColor}" stroke-opacity="0.7" stroke-width="1.5"/>
        <circle cx="32" cy="26" r="6" fill="${bgColor}" fill-opacity="0.85"/>
      </g>
    </svg>`
    return 'data:image/svg+xml,' + encodeURIComponent(svg)
  }

  // ==================== 路径计算 ====================
  function calcTotalDistance(path) {
    let d = 0
    for (let i = 1; i < path.length; i++) {
      d += haversineDistance(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
    }
    return d
  }

  function getActivePath() {
    if (userPath.value.length >= 2) return userPath.value
    return [[31.129, 104.386], [31.129, 104.418]]
  }

  function updateCurrentSegment() {
    const path = getActivePath()
    const total = calcTotalDistance(path)
    const target = (vehicleProgress.value / 100) * total
    let acc = 0
    for (let i = 1; i < path.length; i++) {
      const seg = haversineDistance(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
      if (acc + seg >= target) {
        currentSegment.value = `P${i} → P${i + 1} (${seg.toFixed(0)}m)`
        return
      }
      acc += seg
    }
    currentSegment.value = ''
  }

  function calcRemainingDistance(slot) {
    if (!slot || !slot.path || slot.path.length < 2) return '--'
    const total = calcTotalDistance(slot.path)
    const remaining = total * (1 - vehicleProgress.value / 100)
    if (remaining > 1000) return (remaining / 1000).toFixed(1) + ' km'
    return remaining.toFixed(0) + ' m'
  }

  // ==================== 路径可视化 ====================
  function clearSlotPathVisuals(slot) {
    const prefix = `slot-${slot.id}-path-`
    const toRemove = []
    viewer.entities.values.forEach(e => {
      if (e.id && typeof e.id === 'string' && e.id.startsWith(prefix)) toRemove.push(e)
    })
    toRemove.forEach(e => viewer.entities.remove(e))
    slot.pathGlow = null
    slot.pathStartMarker = null
  }

  function drawSlotPath(slot) {
    if (!viewer || slot.path.length < 2) return
    try {
      const positions = Cesium.Cartesian3.fromDegreesArray(slot.path.flatMap(([lat, lng]) => [lng, lat]))
      if (!Cesium.defined(positions) || positions.length < 2) return
      clearSlotPathVisuals(slot)

      let slotColor
      try {
        slotColor = Cesium.Color.fromCssColorString(slot.color)
      } catch (e) {
        slotColor = Cesium.Color.fromCssColorString('#38bdf8')
      }

      slot.pathGlass = viewer.entities.add({
        id: `slot-${slot.id}-path-glass`,
        corridor: {
          positions,
          width: 18,
          material: slotColor.withAlpha(0.15),
          clampToGround: true,
          zIndex: 0,
        },
      })

      slot.pathGlow = viewer.entities.add({
        id: `slot-${slot.id}-path-glow`,
        polyline: {
          positions,
          width: 6,
          material: slotColor.withAlpha(0.8),
          clampToGround: true,
          zIndex: 1,
        },
      })

      const iconUrl = createMarkerIcon(slot.color)
      const startPos = positions[0]
      slot.pathStartMarker = viewer.entities.add({
        id: `slot-${slot.id}-path-marker`,
        position: startPos,
        billboard: {
          image: iconUrl,
          width: 32,
          height: 40,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    } catch (e) {
      console.warn('drawSlotPath error:', e)
    }
  }

  function drawPathLine() {
    vehicleSlots.value.forEach(slot => drawSlotPath(slot))
  }

  // ==================== 车辆槽位管理 ====================
  function initDefaultSlot() {
    if (vehicleSlots.value.length === 0) {
      const defaultPath = getActivePath()
      vehicleSlots.value.push({
        id: nextSlotId, name: '卡车 1', color: '#e74c3c',
        path: defaultPath, entity: null, positionProperty: null, heading: 0, progress: 0,
        pathGlow: null, pathGlass: null, pathRim: null, pathStartMarker: null,
        pathWidth: 8, pathOpacity: 0.4,
      })
      activeSlotId.value = nextSlotId
      nextSlotId++
    }
  }

  function addVehicleSlot() {
    const idx = vehicleSlots.value.length
    const colors = ['#e74c3c', '#f39c12', '#27ae60', '#e67e22', '#8e44ad']
    const color = colors[idx % colors.length]
    const slot = {
      id: nextSlotId, name: `卡车 ${idx + 1}`, color,
      path: [], entity: null, positionProperty: null, heading: 0, progress: 0,
      pathGlow: null, pathGlass: null, pathRim: null, pathStartMarker: null,
      pathWidth: 8, pathOpacity: 0.4,
    }
    vehicleSlots.value.push(slot)
    activeSlotId.value = nextSlotId
    userPath.value = []
    nextSlotId++
  }

  function removeVehicleSlot(id) {
    const idx = vehicleSlots.value.findIndex(s => s.id === id)
    if (idx < 0 || vehicleSlots.value.length <= 1) return
    const slot = vehicleSlots.value[idx]
    if (slot.entity) viewer.entities.remove(slot.entity)
    if (slot.pathGlow) { viewer.entities.remove(slot.pathGlow); slot.pathGlow = null }
    if (slot.pathGlass) { viewer.entities.remove(slot.pathGlass); slot.pathGlass = null }
    if (slot.pathRim) { viewer.entities.remove(slot.pathRim); slot.pathRim = null }
    if (slot.pathStartMarker) { viewer.entities.remove(slot.pathStartMarker); slot.pathStartMarker = null }
    vehicleSlots.value.splice(idx, 1)
    if (activeSlotId.value === id) {
      const newActive = vehicleSlots.value[0]
      activeSlotId.value = newActive.id
      userPath.value = [...newActive.path]
    }
  }

  function switchVehicleSlot(id) {
    const current = vehicleSlots.value.find(s => s.id === activeSlotId.value)
    if (current) { current.path = [...userPath.value] }
    activeSlotId.value = id
    const slot = vehicleSlots.value.find(s => s.id === id)
    if (slot) { userPath.value = [...slot.path] }
    drawPathLine()
    if (isSimulating.value && slot && slot.positionProperty) {
      const pos = slot.positionProperty.getValue(viewer.clock.currentTime)
      if (Cesium.defined(pos)) {
        const c = Cesium.Cartographic.fromCartesian(pos)
        cameraLocked.value = true
        viewer.camera.flyTo(getVehicleCameraDest(
          Cesium.Math.toDegrees(c.longitude),
          Cesium.Math.toDegrees(c.latitude),
          c.height,
          slot.heading
        ))
      }
    }
  }

  function updatePathColor(color) {
    const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
    if (slot) { slot.color = color; drawSlotPath(slot) }
  }
  function updatePathWidth(width) {
    const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
    if (slot) { slot.pathWidth = width; drawSlotPath(slot) }
  }
  function updatePathOpacity(opacity) {
    const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
    if (slot) { slot.pathOpacity = opacity; drawSlotPath(slot) }
  }

  // ==================== 相机跟随 ====================
  function getVehicleCameraDest(lng, lat, height, heading) {
    const cameraHeight = 1500
    const pitch = Cesium.Math.toRadians(-70)
    const offset = cameraHeight * Math.tan(Cesium.Math.toRadians(20))
    const hdg = Cesium.Math.toRadians(heading)
    const dLat = -offset * Math.cos(hdg) / 111320
    const dLng = -offset * Math.sin(hdg) / (111320 * Math.cos(Cesium.Math.toRadians(lat)))
    return {
      destination: Cesium.Cartesian3.fromDegrees(lng + dLng, lat + dLat, height + cameraHeight),
      orientation: { heading, pitch, roll: 0 },
    }
  }

  function toggleCameraLock() {
    cameraLocked.value = !cameraLocked.value
    if (cameraLocked.value) {
      const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
      if (slot && slot.positionProperty) {
        const pos = slot.positionProperty.getValue(viewer.clock.currentTime)
        if (Cesium.defined(pos)) {
          const c = Cesium.Cartographic.fromCartesian(pos)
          viewer.camera.flyTo(getVehicleCameraDest(
            Cesium.Math.toDegrees(c.longitude),
            Cesium.Math.toDegrees(c.latitude),
            c.height,
            slot.heading
          ))
        }
      }
    } else {
      const slotsWithPath = vehicleSlots.value.filter(s => s.path.length >= 2)
      if (slotsWithPath.length > 1) {
        const west = Math.min(...slotsWithPath.map(s => s.path[0][1]))
        const south = Math.min(...slotsWithPath.map(s => s.path[0][0]))
        const east = Math.max(...slotsWithPath.map(s => s.path[0][1]))
        const north = Math.max(...slotsWithPath.map(s => s.path[0][0]))
        const pad = 0.5
        const rect = Cesium.Rectangle.fromDegrees(west - pad, south - pad, east + pad, north + pad)
        viewer.camera.flyTo({ destination: rect, duration: 1.5 })
      }
    }
  }

  // ==================== SampledPositionProperty ====================
  async function buildPositionProperty(path) {
    const prop = new Cesium.SampledPositionProperty()
    const totalDist = calcTotalDistance(path)
    const REF_TIME = 120
    prop.setInterpolationOptions({
      interpolationDegree: 1,
      interpolationAlgorithm: Cesium.LinearApproximation,
    })
    const carts = path.map(([lat, lng]) => Cesium.Cartographic.fromDegrees(lng, lat))
    let heights
    try {
      heights = (await Promise.race([
        Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, carts),
        new Promise((_, reject) => setTimeout(() => reject(new Error('terrain timeout')), 3000))
      ])).map(c => c.height)
    } catch (e) {
      heights = path.map(() => 500)
    }
    let acc = 0
    const startTime = Cesium.JulianDate.fromDate(new Date(2024, 0, 1, 0, 0, 0))
    prop.addSample(startTime, Cesium.Cartesian3.fromDegrees(path[0][1], path[0][0], heights[0] + 10))
    for (let i = 1; i < path.length; i++) {
      const segDist = haversineDistance(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
      acc += segDist
      const time = (acc / totalDist) * REF_TIME
      const julianDate = Cesium.JulianDate.addSeconds(startTime, time, new Cesium.JulianDate())
      prop.addSample(julianDate, Cesium.Cartesian3.fromDegrees(path[i][1], path[i][0], heights[i] + 10))
    }
    return { prop, startTime, totalTime: REF_TIME }
  }

  // ==================== 模拟控制 ====================
  async function startSimulation() {
    if (isPaused.value) {
      isPaused.value = false
      isSimulating.value = true
      return
    }
    const slotsWithPath = vehicleSlots.value.filter(s => s.path.length >= 2)
    if (slotsWithPath.length === 0) return

    if (isSimulating.value) {
      const newSlots = slotsWithPath.filter(s => !s.positionProperty)
      if (newSlots.length === 0) return
      const currentTime = viewer.clock.currentTime
      let maxNewTime = 0
      const builds = newSlots.map(async (slot) => {
        const { prop, startTime, totalTime } = await buildPositionProperty(slot.path)
        const offset = Cesium.JulianDate.secondsDifference(currentTime, startTime)
        const samples = []
        const sampleCount = slot.path.length
        for (let i = 0; i < sampleCount; i++) {
          const t = Cesium.JulianDate.addSeconds(startTime, (i / (sampleCount - 1)) * totalTime, new Cesium.JulianDate())
          const shifted = Cesium.JulianDate.addSeconds(t, offset, new Cesium.JulianDate())
          samples.push({ time: shifted, idx: i })
        }
        const shiftedProp = new Cesium.SampledPositionProperty()
        shiftedProp.setInterpolationOptions({
          interpolationDegree: 1,
          interpolationAlgorithm: Cesium.LinearApproximation,
        })
        const carts = slot.path.map(([lat, lng]) => Cesium.Cartographic.fromDegrees(lng, lat))
        let heights
        try {
          heights = (await Promise.race([
            Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, carts),
            new Promise((_, reject) => setTimeout(() => reject(new Error('terrain timeout')), 3000))
          ])).map(c => c.height)
        } catch (e) {
          heights = slot.path.map(() => 500)
        }
        for (const s of samples) {
          const p = slot.path[s.idx]
          shiftedProp.addSample(s.time, Cesium.Cartesian3.fromDegrees(p[1], p[0], heights[s.idx] + 10))
        }
        shiftedProp.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD
        shiftedProp.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD
        slot.positionProperty = shiftedProp
        if (totalTime > maxNewTime) maxNewTime = totalTime
        return { slot, prop: shiftedProp, totalTime }
      })
      await Promise.all(builds)
      const currentDuration = Cesium.JulianDate.secondsDifference(viewer.clock.stopTime, viewer.clock.startTime)
      if (maxNewTime > currentDuration) {
        viewer.clock.stopTime = Cesium.JulianDate.addSeconds(viewer.clock.startTime, maxNewTime, new Cesium.JulianDate())
      }
      newSlots.forEach(slot => {
        if (slot.entity) viewer.entities.remove(slot.entity)
        slot.entity = viewer.entities.add({
          name: slot.name,
          position: slot.positionProperty,
          orientation: new Cesium.VelocityOrientationProperty(slot.positionProperty),
          model: {
            uri: 'https://cdn.jsdelivr.net/gh/CesiumGS/cesium@main/Apps/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb',
            scale: 40,
            minimumPixelSize: 64,
          },
        })
      })
      drawPathLine()
      return
    }

    vehicleProgress.value = 0
    isSimulating.value = true

    let maxTotalTime = 0
    let globalStartTime = null
    const builds = slotsWithPath.map(async (slot) => {
      const { prop, startTime, totalTime } = await buildPositionProperty(slot.path)
      prop.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD
      prop.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD
      slot.positionProperty = prop
      if (totalTime > maxTotalTime) maxTotalTime = totalTime
      if (!globalStartTime) globalStartTime = startTime
      return { slot, prop, startTime, totalTime }
    })
    await Promise.all(builds)

    viewer.clock.startTime = globalStartTime.clone()
    viewer.clock.stopTime = Cesium.JulianDate.addSeconds(globalStartTime, maxTotalTime, new Cesium.JulianDate())
    viewer.clock.currentTime = globalStartTime.clone()
    viewer.clock.multiplier = vehicleSpeed.value / 60
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP

    slotsWithPath.forEach(slot => {
      if (slot.entity) viewer.entities.remove(slot.entity)
      slot.entity = viewer.entities.add({
        name: slot.name,
        position: slot.positionProperty,
        orientation: new Cesium.VelocityOrientationProperty(slot.positionProperty),
        model: {
          uri: 'https://cdn.jsdelivr.net/gh/CesiumGS/cesium@main/Apps/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb',
          scale: 40,
          minimumPixelSize: 64,
        },
      })
    })

    viewer.clock.shouldAnimate = true
  }

  function pauseSimulation() {
    isPaused.value = true
    isSimulating.value = false
  }

  function stopSimulation() {
    isSimulating.value = false
    isPaused.value = false
    if (viewer) viewer.clock.shouldAnimate = false
    vehicleSlots.value.forEach(slot => {
      if (slot.entity) { viewer.entities.remove(slot.entity); slot.entity = null }
      slot.positionProperty = null
      slot.heading = 0
      slot.progress = 0
    })
    drawPathLine()
  }

  // ==================== 每帧更新 ====================
  function onPostRender() {
    if (!isSimulating.value || !viewer) return
    const activeSlot = vehicleSlots.value.find(s => s.id === activeSlotId.value)

    try {
      const current = viewer.clock.currentTime
      const stop = viewer.clock.stopTime
      if (Cesium.JulianDate.lessThan(current, stop)) {
        viewer.clock.currentTime = Cesium.JulianDate.addSeconds(
          current, viewer.clock.multiplier / 60, new Cesium.JulianDate()
        )
      } else {
        viewer.clock.currentTime = viewer.clock.startTime.clone()
      }

      const start = Cesium.JulianDate.toDate(viewer.clock.startTime).getTime()
      const stopMs = Cesium.JulianDate.toDate(viewer.clock.stopTime).getTime()
      const cur = Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime()
      vehicleProgress.value = ((cur - start) / (stopMs - start)) * 100

      if (!activeSlot || !activeSlot.positionProperty) return
      activeSlot.progress = vehicleProgress.value

      const pos = activeSlot.positionProperty.getValue(viewer.clock.currentTime)
      if (Cesium.defined(pos)) {
        const cartographic = Cesium.Cartographic.fromCartesian(pos)
        const lat = Cesium.Math.toDegrees(cartographic.latitude)
        const lng = Cesium.Math.toDegrees(cartographic.longitude)

        updateCurrentSegment()

        if (cameraLocked.value) {
          const dest = getVehicleCameraDest(lng, lat, cartographic.height, activeSlot.heading)
          viewer.camera.setView(dest)
        }
      }
    } catch (e) { /* ignore */ }
  }

  // ==================== 路径规划（带后端缓存） ====================
  const BACKEND = 'http://localhost:8080/api'

  async function fetchOSRMRoutes(start, end, via) {
    const waypoints = via
      ? `${start.lng},${start.lat};${via.lng},${via.lat};${end.lng},${end.lat}`
      : `${start.lng},${start.lat};${end.lng},${end.lat}`

    // 1. 先查后端缓存
    try {
      const cacheRes = await fetch(
        `${BACKEND}/route?fromLng=${start.lng}&fromLat=${start.lat}&toLng=${end.lng}&toLat=${end.lat}`
      )
      const cacheData = await cacheRes.json()
      if (cacheData.path && cacheData.path.length > 1 && !cacheData.fallback) {
        console.log('路径缓存命中')
        return [{
          distance: cacheData.distanceKm * 1000,
          duration: cacheData.durationMin * 60,
          path: cacheData.path,
        }]
      }
    } catch (e) {
      // 后端不可用，直接降级到 OSRM
    }

    // 2. 缓存未命中，调 OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&alternatives=true&steps=true`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes) throw new Error('OSRM 无可用路线')
      const routes = data.routes.map(r => ({
        distance: r.distance,
        duration: r.duration,
        path: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      }))

      // 3. 回存到后端缓存（异步，不阻塞返回）
      const best = routes[0]
      fetch(`${BACKEND}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLng: start.lng, startLat: start.lat,
          endLng: end.lng, endLat: end.lat,
          path: best.path,
          distanceKm: Math.round(best.distance / 100) / 10,
          durationMin: Math.round(best.duration / 6) / 10,
        }),
      }).catch(() => {})

      return routes
    } catch (e) {
      console.warn('OSRM 路径规划失败:', e.message)
      return []
    }
  }

  function startRoutePlanning() {
    routeMode.value = true
    routeStart.value = null
    routeEnd.value = null
    routeOptions.value = []
    selectedRoute.value = 0
    const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
    if (slot) clearSlotPathVisuals(slot)
  }

  function cancelRoutePlanning() {
    routeMode.value = false
    routeStart.value = null
    routeEnd.value = null
    routeOptions.value = []
    selectedRoute.value = 0
  }

  function selectRoute(index) {
    selectedRoute.value = index
    const route = routeOptions.value[index]
    if (route) {
      userPath.value = route.path
      drawPathLine()
    }
  }

  function confirmRoute() {
    const route = routeOptions.value[selectedRoute.value]
    if (!route) return
    userPath.value = route.path
    store.setVehiclePaths(route.path)
    routeMode.value = false
    routeStart.value = null
    routeEnd.value = null
    routeOptions.value = []
    selectedRoute.value = 0
    drawPathLine()
  }

  function clearUserPath() {
    stopSimulation()
    routeMode.value = false
    routeStart.value = null
    routeEnd.value = null
    routeOptions.value = []
    selectedRoute.value = 0
    userPath.value = []
    vehicleSlots.value.forEach(slot => {
      slot.path = []
      clearSlotPathVisuals(slot)
    })
    vehicleProgress.value = 0
  }

  // ==================== 洪水绕行 ====================
  function isPointInFlood(lat, lng) {
    const poly = store.floodPolygon
    if (poly && poly.length >= 6) {
      let inside = false
      for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
        const xi = poly[i], yi = poly[i + 1]
        const xj = poly[j], yj = poly[j + 1]
        if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
          inside = !inside
        }
      }
      return inside
    }
    if (!store.floodSourcePoint || store.floodLevel <= 0) return false
    const { lon, lat: fLat } = store.floodSourcePoint
    const radius = store.floodLevel / 15000
    const dLat = lat - fLat
    const dLon = lng - lon
    return Math.sqrt(dLat * dLat + dLon * dLon) < radius
  }

  function getFloodDetour(path) {
    const poly = store.floodPolygon
    if (poly && poly.length >= 6) {
      for (let i = 0; i < path.length - 1; i++) {
        const [lat1, lng1] = path[i]
        const [lat2, lng2] = path[i + 1]
        const steps = 4
        let hit = false, hitLat = 0, hitLng = 0
        for (let s = 0; s <= steps; s++) {
          const t = s / steps
          const slat = lat1 + (lat2 - lat1) * t
          const slng = lng1 + (lng2 - lng1) * t
          if (isPointInFlood(slat, slng)) {
            hit = true; hitLat = slat; hitLng = slng; break
          }
        }
        if (hit) {
          let nearestDist = Infinity, nearestLng = 0, nearestLat = 0
          for (let k = 0; k < poly.length; k += 2) {
            const d = (poly[k] - hitLng) ** 2 + (poly[k + 1] - hitLat) ** 2
            if (d < nearestDist) { nearestDist = d; nearestLng = poly[k]; nearestLat = poly[k + 1] }
          }
          const dx = nearestLng - hitLng, dy = nearestLat - hitLat
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
          return { lat: nearestLat + (dy / dist) * 0.05, lng: nearestLng + (dx / dist) * 0.05 }
        }
      }
      return null
    }
    if (!store.floodSourcePoint || store.floodLevel <= 0) return null
    const fc = store.floodSourcePoint
    const radius = store.floodLevel / 15000
    for (let i = 0; i < path.length - 1; i++) {
      const [lat1, lng1] = path[i]
      const [lat2, lng2] = path[i + 1]
      if (isPointInFlood(lat1, lng1) || isPointInFlood(lat2, lng2)) {
        const midLat = (lat1 + lat2) / 2
        const midLng = (lng1 + lng2) / 2
        const dx = midLng - fc.lon
        const dy = midLat - fc.lat
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
        return { lat: midLat + (dy / dist) * radius * 1.8, lng: midLng + (dx / dist) * radius * 1.8 }
      }
    }
    return null
  }

  function pathIntersectsFlood(path) {
    const poly = store.floodPolygon
    if (!poly || poly.length < 6) return false
    for (let i = 0; i < path.length - 1; i++) {
      const [lat1, lng1] = path[i]
      const [lat2, lng2] = path[i + 1]
      for (let s = 0; s <= 4; s++) {
        const t = s / 4
        if (isPointInFlood(lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t)) return true
      }
    }
    return false
  }

  // ==================== 自动加载调度场景 ====================
  async function autoLoadDispatchScenario() {
    if (!store.dispatchCenter) return

    const dc = store.dispatchCenter
    const dcLat = dc.lat
    const dcLng = dc.lng

    const allCities = [
      { name: '成都', lat: 30.57, lng: 104.07 },
      { name: '康定', lat: 30.05, lng: 101.96 },
      { name: '雅安', lat: 29.98, lng: 103.01 },
      { name: '乐山', lat: 29.58, lng: 103.76 },
      { name: '西昌', lat: 27.90, lng: 102.26 },
      { name: '宜宾', lat: 28.77, lng: 104.62 },
      { name: '绵阳', lat: 31.47, lng: 104.68 },
      { name: '德阳', lat: 31.13, lng: 104.40 },
      { name: '眉山', lat: 30.08, lng: 103.85 },
      { name: '自贡', lat: 29.35, lng: 104.78 },
      { name: '泸州', lat: 28.87, lng: 105.44 },
      { name: '广元', lat: 32.44, lng: 105.82 },
      { name: '遂宁', lat: 30.53, lng: 105.57 },
      { name: '内江', lat: 29.59, lng: 105.06 },
      { name: '南充', lat: 30.80, lng: 106.08 },
      { name: '攀枝花', lat: 26.58, lng: 101.72 },
      { name: '昆明', lat: 25.04, lng: 102.71 },
      { name: '贵阳', lat: 26.65, lng: 106.63 },
      { name: '重庆', lat: 29.56, lng: 106.55 },
      { name: '拉萨', lat: 29.65, lng: 91.13 },
      { name: '兰州', lat: 36.06, lng: 103.83 },
      { name: '西安', lat: 34.26, lng: 108.94 },
      { name: '武汉', lat: 30.59, lng: 114.31 },
      { name: '长沙', lat: 28.23, lng: 112.94 },
    ]

    const ranked = allCities
      .map(c => ({ ...c, dist: haversineDistance(dcLat, dcLng, c.lat, c.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)

    const palette = ['#e74c3c', '#f39c12', '#27ae60']
    const supplyCities = ranked.map((c, i) => ({ ...c, color: palette[i] }))

    vehicleSlots.value.forEach(s => {
      if (s.entity) viewer.entities.remove(s.entity)
      if (s.pathGlow) { viewer.entities.remove(s.pathGlow); s.pathGlow = null }
      if (s.pathGlass) { viewer.entities.remove(s.pathGlass); s.pathGlass = null }
      if (s.pathRim) { viewer.entities.remove(s.pathRim); s.pathRim = null }
      if (s.pathStartMarker) { viewer.entities.remove(s.pathStartMarker); s.pathStartMarker = null }
    })
    vehicleSlots.value = []

    for (const city of supplyCities) {
      const routes = await fetchOSRMRoutes(
        { lat: city.lat, lng: city.lng },
        { lat: dcLat, lng: dcLng }
      )
      const safeRoute = routes.find(r => !pathIntersectsFlood(r.path))
      let path
      if (safeRoute) {
        path = safeRoute.path
      } else {
        path = routes.length > 0 ? routes[0].path : [[city.lat, city.lng], [dcLat, dcLng]]
        const detour = getFloodDetour(path)
        if (detour) {
          const retry = await fetchOSRMRoutes(
            { lat: city.lat, lng: city.lng },
            { lat: dcLat, lng: dcLng },
            detour
          )
          const retrySafe = retry.find(r => !pathIntersectsFlood(r.path))
          if (retrySafe) path = retrySafe.path
          else if (retry.length > 0) path = retry[0].path
        }
      }

      const slot = {
        id: nextSlotId, name: `${city.name} → 指挥中心`, color: city.color,
        path, entity: null, positionProperty: null, heading: 0, progress: 0,
        pathGlow: null, pathGlass: null, pathRim: null, pathStartMarker: null,
        pathWidth: 8, pathOpacity: 0.4,
      }
      vehicleSlots.value.push(slot)
      nextSlotId++
    }

    activeSlotId.value = vehicleSlots.value[0]?.id || 0
    userPath.value = [...(vehicleSlots.value[0]?.path || [])]
    vehicleSlots.value.forEach(s => drawSlotPath(s))
  }

  // ==================== 生命周期 ====================
  function setup(v) {
    viewer = v
    if (!viewer) return

    viewer.scene.globe.enableLighting = false
    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.clock.shouldAnimate = false
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP

    trackInfoElement = document.createElement('div')
    Object.assign(trackInfoElement.style, {
      display: 'none',
      position: 'absolute',
      transform: 'translate(-50%, -120%)',
      padding: '10px 14px',
      borderRadius: '8px',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#e2e8f0',
      fontSize: '12px',
      fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif",
      pointerEvents: 'none',
      zIndex: '9999',
      whiteSpace: 'nowrap',
      textAlign: 'left',
    })
    viewer.container.appendChild(trackInfoElement)

    postRenderHandler = viewer.scene.postRender.addEventListener(onPostRender)

    if (hoverHandler) {
      hoverHandler.destroy()
      hoverHandler = null
    }
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    handler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.endPosition)
      if (Cesium.defined(picked) && picked.id) {
        const slot = vehicleSlots.value.find(s =>
          s.entity === picked.id || s.name === picked.id.name
        )
        if (slot && trackInfoElement) {
          trackInfoElement.style.left = movement.endPosition.x + 'px'
          trackInfoElement.style.top = movement.endPosition.y + 'px'
          trackInfoElement.style.display = 'block'
          const remainDist = calcRemainingDistance(slot)
          let coordText = '--'
          if (slot.positionProperty && viewer) {
            const pos = slot.positionProperty.getValue(viewer.clock.currentTime)
            if (Cesium.defined(pos)) {
              const c = Cesium.Cartographic.fromCartesian(pos)
              coordText = `${Cesium.Math.toDegrees(c.longitude).toFixed(4)}°, ${Cesium.Math.toDegrees(c.latitude).toFixed(4)}°`
            }
          }
          trackInfoElement.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:4px;">
              <div style="color:#94a3b8;font-size:11px;margin-bottom:2px;">${slot.name}</div>
              <div style="display:flex;gap:12px;">
                <span style="color:#94a3b8;">速度</span>
                <span style="color:#38bdf8;font-weight:600;">${vehicleSpeed.value} km/h</span>
              </div>
              <div style="display:flex;gap:12px;">
                <span style="color:#94a3b8;">进度</span>
                <span style="color:#4ade80;font-weight:600;">${slot.progress ? slot.progress.toFixed(1) : '0.0'}%</span>
              </div>
              <div style="display:flex;gap:12px;">
                <span style="color:#94a3b8;">剩余</span>
                <span style="color:#fbbf24;font-weight:600;">${remainDist}</span>
              </div>
              <div style="display:flex;gap:12px;">
                <span style="color:#94a3b8;">坐标</span>
                <span style="color:#e2e8f0;">${coordText}</span>
              </div>
            </div>
          `
          return
        }
      }
      if (trackInfoElement) trackInfoElement.style.display = 'none'
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    hoverHandler = handler

    initDefaultSlot()
    drawPathLine()
    return autoLoadDispatchScenario()
  }

  function teardown() {
    stopSimulation()
    if (postRenderHandler && viewer) {
      viewer.scene.postRender.removeEventListener(postRenderHandler)
      postRenderHandler = null
    }
    if (hoverHandler) {
      hoverHandler.destroy()
      hoverHandler = null
    }
    if (trackInfoElement && trackInfoElement.parentNode) {
      trackInfoElement.parentNode.removeChild(trackInfoElement)
      trackInfoElement = null
    }
    viewer = null
  }

  watch(vehicleSpeed, (v) => {
    if (viewer && isSimulating.value) viewer.clock.multiplier = v / 60
  })

  watch(userPath, (val) => {
    const slot = vehicleSlots.value.find(s => s.id === activeSlotId.value)
    if (slot) slot.path = [...val]
    drawPathLine()
  }, { deep: true })

  function setVehiclePanelVisible(visible) {
    if (trackInfoElement) {
      trackInfoElement._visible = visible
      if (!visible) trackInfoElement.style.display = 'none'
    }
  }

  return {
    vehicleSlots, activeSlotId,
    isSimulating, isPaused, vehicleSpeed, vehicleProgress, currentSegment,
    cameraLocked, userPath,
    routeMode, routeStart, routeEnd, routeOptions, selectedRoute,
    initDefaultSlot, addVehicleSlot, removeVehicleSlot, switchVehicleSlot,
    updatePathColor, updatePathWidth, updatePathOpacity,
    startSimulation, pauseSimulation, stopSimulation,
    fetchOSRMRoutes, startRoutePlanning, cancelRoutePlanning, selectRoute, confirmRoute,
    clearUserPath, drawPathLine, drawSlotPath,
    isPointInFlood, getFloodDetour,
    autoLoadDispatchScenario,
    toggleCameraLock,
    setVehiclePanelVisible,
    setup, teardown,
  }
}