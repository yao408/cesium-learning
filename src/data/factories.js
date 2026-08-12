// 工厂/厂房数据配置 - 修改这个文件即可更换工厂信息
export const factories = [
  {
    id: 'facility-1',
    name: 'A区厂房',
    type: '生产车间',
    position: { lat: 31.129, lng: 104.386 },
    description: '主要生产区域，包含3条生产线',
  },
  {
    id: 'facility-2',
    name: 'B区厂房',
    type: '装配车间',
    position: { lat: 31.230, lng: 104.500 },
    description: '产品装配与检测区域',
  },
  {
    id: 'facility-3',
    name: 'C区厂房',
    type: '仓储中心',
    position: { lat: 31.050, lng: 104.600 },
    description: '原材料与成品仓储',
  }
]

// 动态场景注册表（用户在地图上添加的场景）
const sceneRegistry = new Map()

export function registerScene(sceneData) {
  sceneRegistry.set(sceneData.id, sceneData)
}

export function getSceneById(id) {
  return sceneRegistry.get(id)
}

// 根据ID获取工厂或场景信息
export function getFactoryById(id) {
  return factories.find(f => f.id === id) || sceneRegistry.get(id)
}

// 获取所有工厂位置（用于在地图上显示）
export function getFactoryPositions() {
  return factories.map(f => ({
    id: f.id,
    name: f.name,
    type: f.type,
    position: f.position
  }))
}