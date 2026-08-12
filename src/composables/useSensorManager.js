import { ref, computed } from 'vue'

export function useSensorManager(allSensorsList) {

  const sensors = ref([])
  const sensorLiveData = ref({})
  const gaugeFilterType = ref('all')
  const selectedSensorType = ref('temp')
  const detailSelectedSensor = ref('')

  const colorMap = {
    'temp': '#e8795e',
    'temperature': '#e8795e',
    'humidity': '#6baed6',
    'gas': '#74c69d',
    'pressure': '#74c69d',
    'vibration': '#d4a853'
  }

  const sensorTypesList = [
    { type: 'temp', label: '温度', icon: '🌡️', unit: '℃' },
    { type: 'humidity', label: '湿度', icon: '💧', unit: '%RH' },
    { type: 'gas', label: '气体', icon: '💨', unit: 'PPM' },
    { type: 'pressure', label: '压力', icon: '🔵', unit: 'MPa' },
    { type: 'vibration', label: '振动', icon: '📳', unit: 'mm/s' }
  ]

  function isSensorTypeVisible(type) {
    if (gaugeFilterType.value === 'all') return true
    if (!type) return false

    const typeMap = {
      'temp': 'temp',
      'temperature': 'temp',
      'humidity': 'humidity',
      'gas': 'gas',
      'pressure': 'pressure',
      'vibration': 'vibration'
    }

    const normalizedType = typeMap[type.toLowerCase()] || type.toLowerCase()
    const normalizedFilter = typeMap[gaugeFilterType.value.toLowerCase()] || gaugeFilterType.value.toLowerCase()

    return normalizedType === normalizedFilter
  }

  const gaugeSensors = computed(() => {
    return allSensorsList.value.filter(s => isSensorTypeVisible(s.type))
  })

  const visibleGaugesCount = computed(() => {
    return gaugeSensors.value.length
  })

  const gaugeFilterOptions = computed(() => {
    const typeCountMap = {}
    allSensorsList.value.forEach(sensor => {
      const type = sensor.type
      typeCountMap[type] = (typeCountMap[type] || 0) + 1
    })

    return [
      { value: 'all', label: '全部', icon: '📊', count: allSensorsList.value.length },
      ...sensorTypesList.map(type => ({
        value: type.type,
        label: type.label,
        icon: type.icon,
        count: typeCountMap[type.type] || 0
      }))
    ]
  })

  const currentDetailSensor = computed(() => {
    if (!detailSelectedSensor.value) return null
    return sensors.value.find(s => s.sensorId === detailSelectedSensor.value)
  })

  function isSensorVisible(sensor) {
    if (gaugeFilterType.value === 'all') return true

    const typeMap = {
      'temp': ['temp', 'temperature', 'Temperature', 'TEMP'],
      'humidity': ['humidity', 'humid', 'Humidity', 'HUMIDITY', 'HUM'],
      'gas': ['gas', 'Gas', 'GAS', 'gaseous', 'air'],
      'pressure': ['pressure', 'press', 'Pressure', 'PRESSURE', 'PRES'],
      'vibration': ['vibration', 'vibr', 'Vibration', 'VIBRATION', 'VIB']
    }

    const matchTypes = typeMap[gaugeFilterType.value] || [gaugeFilterType.value]
    const st = (sensor.sensorType || '').toLowerCase()

    return matchTypes.some(t =>
      t.toLowerCase() === st ||
      sensor.sensorType === t
    )
  }

  function getLiveSensorValue(sensorId) {
    if (sensorLiveData.value[sensorId] !== undefined) {
      return sensorLiveData.value[sensorId]
    }

    const liveSensor = sensors.value.find(s => s.sensorId === sensorId)
    if (liveSensor && liveSensor.value !== undefined) {
      return liveSensor.value
    }

    return 0
  }

  function getSensorGaugeValue(sensor) {
    return sensor.value || 0
  }

  function getSensorStatus(sensorId) {
    const liveSensor = sensors.value.find(s => s.sensorId === sensorId)
    return liveSensor?.status || 'normal'
  }

  function getGaugeMin() {
    return 0
  }

  function getGaugeMax(sensor) {
    const st = (sensor.sensorType || '').toLowerCase()

    if (st.includes('humid')) return 100
    if (st.includes('gas')) return 500
    if (st.includes('press')) return 2
    if (st.includes('vibr')) return 10

    return 80
  }

  function getSensorIcon(sensorType) {
    const map = { temp: '🌡️', temperature: '🌡️', humidity: '💧', pressure: '⚙️', vibration: '📳', gas: '💨' }
    return map[sensorType] || '📡'
  }

  function getSensorTypeLabel(sensorType) {
    const map = { temp: '温度', temperature: '温度', humidity: '湿度', pressure: '压力', vibration: '振动', gas: '气体' }
    return map[sensorType] || sensorType || '传感器'
  }

  function getSensorUnit(sensorType) {
    const map = { temp: '℃', temperature: '℃', humidity: '%RH', pressure: 'MPa', vibration: 'mm/s', gas: 'ppm' }
    return map[sensorType] || ''
  }

  function getSensorColor(sensorType) {
    const map = { temp: '#ff6633', temperature: '#ff6633', humidity: '#3399ff', pressure: '#f59e0b', vibration: '#cc44cc', gas: '#10b981' }
    return map[sensorType] || '#ff6633'
  }

  function getGaugeGradientStart(sensor) {
    const colorMap = {
      temp: { start: '#a855f7', end: '#6366f1' },
      temperature: { start: '#a855f7', end: '#6366f1' },
      humidity: { start: '#06b6d4', end: '#0ea5e9' },
      pressure: { start: '#f97316', end: '#fb923c' },
      vibration: { start: '#ec4899', end: '#f472b6' },
      gas: { start: '#10b981', end: '#34d399' }
    }
    return colorMap[sensor.sensorType]?.start || '#a855f7'
  }

  function getGaugeGradientEnd(sensor) {
    const colorMap = {
      temp: { start: '#a855f7', end: '#6366f1' },
      temperature: { start: '#a855f7', end: '#6366f1' },
      humidity: { start: '#06b6d4', end: '#0ea5e9' },
      pressure: { start: '#f97316', end: '#fb923c' },
      vibration: { start: '#ec4899', end: '#f472b6' },
      gas: { start: '#10b981', end: '#34d399' }
    }
    return colorMap[sensor.sensorType]?.end || '#6366f1'
  }

  function getSensorColorLight(sensorType) {
    const map = {
      temp: '#c084fc',
      temperature: '#c084fc',
      humidity: '#22d3ee',
      pressure: '#fbbf24',
      vibration: '#f472b6',
      gas: '#34d399'
    }
    return map[sensorType] || '#3b82f6'
  }

  function getSensorsByType(type) {
    const typeMap = {
      'temp': ['temp', 'temperature', 'Temperature', 'TEMP'],
      'humidity': ['humidity', 'humid', 'Humidity', 'HUMIDITY', 'HUM'],
      'gas': ['gas', 'Gas', 'GAS', 'gaseous', 'air'],
      'pressure': ['pressure', 'press', 'Pressure', 'PRESSURE', 'PRES'],
      'vibration': ['vibration', 'vibr', 'Vibration', 'VIBRATION', 'VIB']
    }

    const matchTypes = typeMap[type] || [type]

    return sensors.value.filter(s =>
      matchTypes.includes(s.sensorType) ||
      matchTypes.includes(s.type) ||
      s.sensorType?.toLowerCase() === type.toLowerCase()
    )
  }

  function getCountByType(type) {
    return getSensorsByType(type).length
  }

  function getLatestValueByType(type) {
    const sensorsOfType = getSensorsByType(type)
    if (sensorsOfType.length === 0) return '--'
    return sensorsOfType[0].value
  }

  function getAvgValueByType(type) {
    const sensorsOfType = getSensorsByType(type)
    if (sensorsOfType.length === 0) return 0
    const sum = sensorsOfType.reduce((acc, s) => acc + parseFloat(s.value || 0), 0)
    return Math.round(sum / sensorsOfType.length)
  }

  function hasAlarmByType(type) {
    return getSensorsByType(type).some(s => s.status === 'alarm')
  }

  function hasWarningByType(type) {
    return getSensorsByType(type).some(s => s.status === 'warning')
  }

  function selectSensorType(type) {
    selectedSensorType.value = type
    const sensorsOfType = getSensorsByType(type)
    if (sensorsOfType.length > 0) {
      detailSelectedSensor.value = sensorsOfType[0].sensorId
    } else {
      detailSelectedSensor.value = ''
    }
  }

  return {
    sensors,
    sensorLiveData,
    gaugeFilterType,
    selectedSensorType,
    detailSelectedSensor,
    colorMap,
    sensorTypesList,
    gaugeSensors,
    visibleGaugesCount,
    gaugeFilterOptions,
    currentDetailSensor,
    isSensorVisible,
    isSensorTypeVisible,
    getLiveSensorValue,
    getSensorGaugeValue,
    getSensorStatus,
    getGaugeMin,
    getGaugeMax,
    getSensorIcon,
    getSensorTypeLabel,
    getSensorUnit,
    getSensorColor,
    getGaugeGradientStart,
    getGaugeGradientEnd,
    getSensorColorLight,
    getSensorsByType,
    getCountByType,
    getLatestValueByType,
    getAvgValueByType,
    hasAlarmByType,
    hasWarningByType,
    selectSensorType
  }
}