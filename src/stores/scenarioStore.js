import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

export const useScenarioStore = defineStore('scenario', () => {
  const scenarioName = ref('')
  const aoi = ref(null)
  const hazards = ref([])
  const watchtowers = ref([])
  const blindSpots = ref(null)
  const floodLevel = ref(0)
  const floodSourcePoint = ref(null)
  const floodPolygon = ref([])
  const floodVolume = ref(100)
  const flowSpeed = ref('medium')
  const floodResults = ref(null)
  const earthquakeData = ref([])
  const selectedEarthquake = ref(null)
  const vehiclePaths = ref([])
  const dispatchCenter = ref(null)
  const vehicles = ref([])

  function setAOI(data) {
    aoi.value = data
    if (!scenarioName.value && data?.name) {
      scenarioName.value = data.name
    }
  }

  function setHazards(list) {
    hazards.value = list
  }

  function setWatchtowers(list) {
    watchtowers.value = list
  }

  function addStation(station) {
    watchtowers.value.push(station)
  }

  function removeStation(name) {
    watchtowers.value = watchtowers.value.filter(s => s.name !== name)
  }

  // 从后端加载监测站
  async function loadWatchtowersFromBackend() {
    try {
      const res = await fetch(`${BACKEND}/api/stations`)
      if (!res.ok) throw new Error('Failed to fetch stations')
      const data = await res.json()
      // 转换字段名：后端 lng -> 前端 lng（一致，无需转换）
      watchtowers.value = data.map(s => ({
        id: s.id,
        name: s.name,
        lng: s.lng,
        lat: s.lat,
        height: s.height,
        groundElevation: s.groundElevation,
        type: s.type,
        status: s.status,
        description: s.description,
      }))
      return true
    } catch (e) {
      console.warn('后端监测站加载失败，使用本地数据:', e)
      return false
    }
  }

  function setBlindSpots(data) {
    blindSpots.value = data
  }

  function setFloodLevel(level, source) {
    floodLevel.value = level
    if (source) floodSourcePoint.value = source
  }

  function setFloodParams(volume, speed) {
    floodVolume.value = volume
    flowSpeed.value = speed
  }

  function setFloodPolygon(coords) {
    floodPolygon.value = coords
  }

  function setFloodResults(results) {
    floodResults.value = results
  }

  function setEarthquakeData(data) {
    earthquakeData.value = data
  }

  function setSelectedEarthquake(data) {
    selectedEarthquake.value = data
  }

  function setVehiclePaths(paths) {
    vehiclePaths.value = paths
  }

  function setDispatchCenter(data) {
    dispatchCenter.value = data
  }

  function setVehicles(list) {
    vehicles.value = list
  }

  async function loadVehiclesFromBackend() {
    try {
      const res = await fetch(`${BACKEND}/api/vehicles`)
      if (!res.ok) throw new Error('Failed to fetch vehicles')
      const data = await res.json()
      vehicles.value = data.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        lng: v.lng,
        lat: v.lat,
        speed: v.speed,
        status: v.status,
        path: v.path,
        driver: v.driver,
        capacity: v.capacity,
        plateNumber: v.plateNumber,
        description: v.description,
      }))
      return true
    } catch (e) {
      console.warn('后端车辆加载失败:', e)
      return false
    }
  }

  async function addVehicle(payload) {
    const res = await fetch(`${BACKEND}/api/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to add vehicle')
    const data = await res.json()
    vehicles.value.push(data)
    return data
  }

  async function updateVehicle(id, payload) {
    const res = await fetch(`${BACKEND}/api/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to update vehicle')
    const data = await res.json()
    const idx = vehicles.value.findIndex(v => v.id === id)
    if (idx >= 0) vehicles.value[idx] = data
    return data
  }

  async function deleteVehicle(id) {
    const res = await fetch(`${BACKEND}/api/vehicles/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete vehicle')
    vehicles.value = vehicles.value.filter(v => v.id !== id)
  }

  async function clearAllVehicles() {
    const res = await fetch(`${BACKEND}/api/vehicles`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to clear vehicles')
    vehicles.value = []
  }

  function clearAll() {
    scenarioName.value = ''
    aoi.value = null
    hazards.value = []
    watchtowers.value = []
    blindSpots.value = null
    floodLevel.value = 0
    floodSourcePoint.value = null
    floodPolygon.value = []
    floodVolume.value = 100
    flowSpeed.value = 'medium'
    floodResults.value = null
    earthquakeData.value = []
    selectedEarthquake.value = null
    vehiclePaths.value = []
    dispatchCenter.value = null
    vehicles.value = []
  }

  const moduleStatus = computed(() => ({
    dataImport: !!(aoi.value || hazards.value.length),
    viewshed: !!(watchtowers.value.length),
    flood: !!(floodSourcePoint.value && floodPolygon.value.length > 0),
    earthquake: !!(earthquakeData.value.length),
    dispatch: !!(vehiclePaths.value.length),
  }))

  const activeCount = computed(() =>
    Object.values(moduleStatus.value).filter(Boolean).length
  )

  const hasData = computed(() => activeCount.value > 0)

  return {
    scenarioName,
    aoi,
    hazards,
    watchtowers,
    blindSpots,
    floodLevel,
    floodSourcePoint,
    floodPolygon,
    floodVolume,
    flowSpeed,
    floodResults,
    earthquakeData,
    selectedEarthquake,
    vehiclePaths,
    dispatchCenter,
    vehicles,
    setAOI,
    setHazards,
    setWatchtowers,
    addStation,
    removeStation,
    loadWatchtowersFromBackend,
    setBlindSpots,
    setFloodLevel,
    setFloodPolygon,
    setFloodParams,
    setFloodResults,
    setEarthquakeData,
    setSelectedEarthquake,
    setVehiclePaths,
    setDispatchCenter,
    setVehicles,
    loadVehiclesFromBackend,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    clearAllVehicles,
    clearAll,
    moduleStatus,
    activeCount,
    hasData,
  }
})