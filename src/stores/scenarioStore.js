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
  const earthquakeData = ref([])
  const vehiclePaths = ref([])

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

  function setEarthquakeData(data) {
    earthquakeData.value = data
  }

  function setVehiclePaths(paths) {
    vehiclePaths.value = paths
  }

  function clearAll() {
    scenarioName.value = ''
    aoi.value = null
    hazards.value = []
    watchtowers.value = []
    blindSpots.value = null
    floodLevel.value = 0
    floodSourcePoint.value = null
    earthquakeData.value = []
    vehiclePaths.value = []
  }

  const moduleStatus = computed(() => ({
    dataImport: !!(aoi.value || hazards.value.length),
    viewshed: !!(watchtowers.value.length),
    flood: !!(floodSourcePoint.value && floodLevel.value > 0),
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
    earthquakeData,
    vehiclePaths,
    setAOI,
    setHazards,
    setWatchtowers,
    setBlindSpots,
    setFloodLevel,
    setEarthquakeData,
    setVehiclePaths,
    clearAll,
    moduleStatus,
    activeCount,
    hasData,
  }
})