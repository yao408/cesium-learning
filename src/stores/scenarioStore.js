import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
    setAOI,
    setHazards,
    setWatchtowers,
    setBlindSpots,
    setFloodLevel,
    setFloodPolygon,
    setFloodParams,
    setFloodResults,
    setEarthquakeData,
    setSelectedEarthquake,
    setVehiclePaths,
    setDispatchCenter,
    clearAll,
    moduleStatus,
    activeCount,
    hasData,
  }
})