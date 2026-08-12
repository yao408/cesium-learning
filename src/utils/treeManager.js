import * as THREE from 'three'

export function removeTreesInArea(scene, areaBounds) {
  const treeGroup = scene.getObjectByName('roadTrees')
  if (!treeGroup) {
    console.warn('⚠️ 未找到树木组 (roadTrees)')
    return { removed: 0, message: '未找到树木' }
  }

  let removedCount = 0
  const treesToRemove = []

  treeGroup.children.forEach((child, index) => {
    if (child.isMesh && child.geometry.type === 'CylinderGeometry') {
      const pos = child.position
      const inArea = pos.x >= areaBounds.minX &&
                     pos.x <= areaBounds.maxX &&
                     pos.z >= areaBounds.minZ &&
                     pos.z <= areaBounds.maxZ

      if (inArea) {
        treesToRemove.push(index)
        removedCount++
      }
    }
  })

  for (let i = treesToRemove.length - 1; i >= 0; i--) {
    const trunkIndex = treesToRemove[i]
    const trunk = treeGroup.children[trunkIndex]
    const trunkPos = trunk.position.clone()

    for (let j = treeGroup.children.length - 1; j >= 0; j--) {
      const child = treeGroup.children[j]
      if (child.position.distanceTo(trunkPos) < 2) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
        treeGroup.remove(child)
      }
    }
  }

  return {
    removed: removedCount,
    message: `已移除 ${removedCount} 棵树`,
    remaining: Math.floor(treeGroup.children.length / 3)
  }
}

export function getTreePositions(scene) {
  const treeGroup = scene.getObjectByName('roadTrees')
  if (!treeGroup) return []

  const positions = []
  treeGroup.children.forEach(child => {
    if (child.isMesh && child.geometry.type === 'CylinderGeometry') {
      positions.push({
        x: parseFloat(child.position.x.toFixed(1)),
        y: parseFloat(child.position.y.toFixed(1)),
        z: parseFloat(child.position.z.toFixed(1))
      })
    }
  })

  return positions
}