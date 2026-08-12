import { ref, reactive } from 'vue'

export function useStationManagement() {
  const stationFormVisible = ref(false)
  const editingStationId = ref(null)
  const stationFormData = reactive({
    name: '',
    type: '强震监测站',
    lng: 104.07,
    lat: 31.57,
    height: 50,
    status: 'online',
    description: ''
  })

  function openStationForm(station = null) {
    if (station) {
      editingStationId.value = station.id
      stationFormData.name = station.name
      stationFormData.type = station.type || '强震监测站'
      stationFormData.lng = station.lng
      stationFormData.lat = station.lat
      stationFormData.height = station.height || 50
      stationFormData.status = station.status || 'online'
      stationFormData.description = station.description || ''
    } else {
      editingStationId.value = null
      stationFormData.name = ''
      stationFormData.type = '强震监测站'
      stationFormData.lng = 104.07
      stationFormData.lat = 31.57
      stationFormData.height = 50
      stationFormData.status = 'online'
      stationFormData.description = ''
    }
    stationFormVisible.value = true
  }

  function resetStationForm() {
    stationFormVisible.value = false
    editingStationId.value = null
  }

  async function saveStation(store, redrawCallback) {
    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
    const payload = {
      name: stationFormData.name,
      type: stationFormData.type,
      lng: stationFormData.lng,
      lat: stationFormData.lat,
      height: stationFormData.height,
      status: stationFormData.status,
      description: stationFormData.description
    }
    try {
      const url = editingStationId.value
        ? `${BACKEND}/api/stations/${editingStationId.value}`
        : `${BACKEND}/api/stations`
      const method = editingStationId.value ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('保存失败')
      await store.loadWatchtowersFromBackend()
      resetStationForm()
      if (redrawCallback) redrawCallback()
    } catch (e) {
      console.error('保存站点失败:', e)
      alert('保存失败，请检查后端是否启动')
    }
  }

  async function deleteStation(station, store, redrawCallback) {
    if (!confirm(`确定删除站点 "${station.name}" 吗？`)) return
    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
    try {
      const res = await fetch(`${BACKEND}/api/stations/${station.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      await store.loadWatchtowersFromBackend()
      if (redrawCallback) redrawCallback()
    } catch (e) {
      console.error('删除站点失败:', e)
      alert('删除失败，请检查后端是否启动')
    }
  }

  return {
    stationFormVisible,
    editingStationId,
    stationFormData,
    openStationForm,
    resetStationForm,
    saveStation,
    deleteStation,
  }
}