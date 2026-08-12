import { ref, computed } from 'vue'

const modules = ref([
  { id: 'station', name: '监测站管理', icon: '📡', enabled: false, composable: null },
  { id: 'flood', name: '洪水模拟', icon: '🌊', enabled: false, composable: null },
  { id: 'earthquake', name: '地震点可视化', icon: '🌋', enabled: false, composable: null },
  { id: 'multiVehicle', name: '多车模拟', icon: '🚛', enabled: false, composable: null },
  { id: 'scene', name: '添加场景', icon: '🏗️', enabled: false, composable: null },
])

export function useModuleRegistry() {
  const showModulePanel = ref(false)

  const activeModules = computed(() => modules.value.filter(m => m.enabled))

  function toggleModule(id) {
    const m = modules.value.find(x => x.id === id)
    if (!m) return
    m.enabled = !m.enabled
  }

  function isModuleActive(id) {
    return modules.value.find(x => x.id === id)?.enabled ?? false
  }

  function registerModule(id, composable) {
    const m = modules.value.find(x => x.id === id)
    if (m) m.composable = composable
  }

  return {
    modules,
    showModulePanel,
    activeModules,
    toggleModule,
    isModuleActive,
    registerModule,
  }
}