import * as THREE from 'three'

const railingData = []
let railingCacheBuilt = false

function findBuildingName(mesh) {
  let current = mesh.parent
  while (current) {
    if (current.userData && current.userData.label) {
      return current.userData.label
    }
    if (current.name && current.name.startsWith('building_')) {
      return current.userData?.label || current.name
    }
    current = current.parent
  }
  return null
}

export function buildRailingCache(scene, keyword = 'IfcRailing', excludeBuildings = []) {
  railingData.length = 0
  let removed = 0

  scene.traverse((child) => {
    if (child.isMesh && child.name.includes(keyword)) {
      const buildingName = findBuildingName(child)
      if (buildingName && excludeBuildings.some(name => buildingName.includes(name))) {
        child.visible = false
        removed++
        return
      }
      railingData.push({
        mesh: child,
        box: new THREE.Box3().setFromObject(child)
      })
    }
  })

  railingCacheBuilt = true
  console.log(`🔍 栏杆缓存: ${railingData.length} 个, 已隐藏 ${removed} 个 (${excludeBuildings.join(', ')})`)
}

export function updateRailingVisibility(camera, maxDistance = 30) {
  if (!railingCacheBuilt) return

  let visibleCount = 0
  let hiddenCount = 0

  for (const item of railingData) {
    const distance = item.box.distanceToPoint(camera.position)
    const shouldShow = distance < maxDistance
    if (item.mesh.visible !== shouldShow) {
      item.mesh.visible = shouldShow
    }
    if (shouldShow) visibleCount++
    else hiddenCount++
  }

  return { visible: visibleCount, hidden: hiddenCount }
}