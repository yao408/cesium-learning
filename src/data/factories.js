// 工厂/厂房数据配置 - 修改这个文件即可更换工厂信息
export const factories = [
  {
    id: 'facility-1',
    name: 'A区厂房',
    type: '生产车间',
    position: { lat: 31.129, lng: 104.386 },
    description: '主要生产区域，包含3条生产线',
    modelConfig: {
      grid: { cols: 3, rows: 3, cellSize: 9, roadWidth: 1.2 },
      buildings: [
        { name: '原料仓库', width: 5, depth: 4, wallHeight: 7, roofHeight: 0.4, roofOverhang: 0.4, col: 0, row: 0 },
        { name: '总部大楼', width: 3.5, depth: 3.5, wallHeight: 14, roofHeight: 0.8, roofOverhang: 0.6, col: 1, row: 0, isHQ: true },
        { name: '质检中心', width: 4, depth: 4, wallHeight: 10, roofHeight: 0.5, roofOverhang: 0.5, col: 2, row: 0 },
        { name: '一号车间', width: 7, depth: 3.5, wallHeight: 10, roofHeight: 0.5, roofOverhang: 0.5, col: 0, row: 2 },
        { name: '二号车间', width: 7, depth: 3.5, wallHeight: 10, roofHeight: 0.5, roofOverhang: 0.5, col: 2, row: 2 },
      ],
    }
  },
  {
    id: 'facility-2',
    name: 'B区厂房',
    type: '装配车间',
    position: { lat: 31.230, lng: 104.500 },
    description: '产品装配与检测区域',
    modelConfig: {
      grid: { cols: 3, rows: 3, cellSize: 9, roadWidth: 1.2 },
      buildings: [
        { name: '原料仓库', width: 5, depth: 5, wallHeight: 7, roofHeight: 0.4, roofOverhang: 0.4, col: 0, row: 0 },
        { name: '总部大楼', width: 3.5, depth: 3.5, wallHeight: 12, roofHeight: 0.7, roofOverhang: 0.6, col: 1, row: 0, isHQ: true },
        { name: '成品仓库', width: 5, depth: 5, wallHeight: 7, roofHeight: 0.4, roofOverhang: 0.4, col: 2, row: 0 },
        { name: '装配一车间', width: 7, depth: 4, wallHeight: 10, roofHeight: 0.5, roofOverhang: 0.5, col: 0, row: 2 },
        { name: '装配二车间', width: 7, depth: 4, wallHeight: 10, roofHeight: 0.5, roofOverhang: 0.5, col: 2, row: 2 },
      ],
    }
  },
  {
    id: 'facility-3',
    name: 'C区厂房',
    type: '仓储中心',
    position: { lat: 31.050, lng: 104.600 },
    description: '原材料与成品仓储',
    modelConfig: {
      grid: { cols: 3, rows: 3, cellSize: 9, roadWidth: 1.2 },
      buildings: [
        { name: '办公楼', width: 4, depth: 4, wallHeight: 12, roofHeight: 0.6, roofOverhang: 0.5, col: 0, row: 0 },
        { name: '总部大楼', width: 3.5, depth: 3.5, wallHeight: 14, roofHeight: 0.8, roofOverhang: 0.6, col: 1, row: 0, isHQ: true },
        { name: '三号仓库', width: 5, depth: 5, wallHeight: 7, roofHeight: 0.4, roofOverhang: 0.4, col: 2, row: 0 },
        { name: '一号仓库', width: 7, depth: 4, wallHeight: 8, roofHeight: 0.5, roofOverhang: 0.5, col: 0, row: 2 },
        { name: '二号仓库', width: 7, depth: 4, wallHeight: 8, roofHeight: 0.5, roofOverhang: 0.5, col: 2, row: 2 },
        { name: '储罐区', col: 0, row: 1, isTank: true, tanks: [
          { radius: 0.7, height: 4, offsetX: -1.5, offsetZ: 0 },
          { radius: 0.7, height: 4, offsetX: 1.5, offsetZ: 0 },
        ]},
        { name: '储罐区', col: 2, row: 1, isTank: true, tanks: [
          { radius: 0.7, height: 4, offsetX: -1.5, offsetZ: 0 },
          { radius: 0.7, height: 4, offsetX: 1.5, offsetZ: 0 },
        ]},
      ],
    }
  }
]

// 根据ID获取工厂信息
export function getFactoryById(id) {
  return factories.find(f => f.id === id)
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