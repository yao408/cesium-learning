export function processModelMaterials(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
      if (child.material) {
        if (child.material.color) {
          child.userData.originalColor = child.material.color.getHex()
        }
        const name = (child.name || '').toLowerCase()
        const isWall = name.includes('wall') || name.includes('ifcwall')
        const isBehind = name.includes('beam') || name.includes('ifcbeam') || name.includes('column') || name.includes('ifccolumn') || name.includes('stair') || name.includes('ifcstair') || name.includes('railing') || name.includes('ifcrailing')
        const isSurface = name.includes('slab') || name.includes('ifcslab') || name.includes('pipe') || name.includes('ifcpipe') || name.includes('ifcflow') || name.includes('duct')
        child.renderOrder = isWall ? 0 : (isBehind ? 2 : 1)
        
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => {
            const cm = m.clone()
            cm.depthWrite = !isBehind
            cm.depthTest = true
            if (isSurface) { cm.polygonOffset = true; cm.polygonOffsetFactor = -1; cm.polygonOffsetUnits = -1 }
            cm.needsUpdate = true
            return cm
          })
        } else {
          child.material = child.material.clone()
          child.material.depthWrite = !isBehind
          child.material.depthTest = true
          if (isSurface) { child.material.polygonOffset = true; child.material.polygonOffsetFactor = -1; child.material.polygonOffsetUnits = -1 }
          child.material.needsUpdate = true
        }
      }
    }
  })
}

export function setupModelClone(clone, bCfg, i, parseCoord, bw, bd, groundD) {
  clone.name = `building_${i}`
  clone.position.set(parseCoord(bCfg.x, bw, bd, groundD), 0, parseCoord(bCfg.z, bw, bd, groundD))
  clone.rotation.y = bCfg.ry
  clone.traverse((child) => { 
    if (child.isMesh) { 
      child.castShadow = true; 
      child.receiveShadow = true; 
      if (child.material?.color && child.userData.originalColor === undefined) { 
        child.userData.originalColor = child.material.color.getHex() 
      } 
    } 
  })
  clone.userData.label = bCfg.label
  clone.userData.buildingIndex = i
}

export function logBuildingTypes(model, label) {
  const types = new Set()
  model.traverse(c => {
    if (c.isMesh && c.name) {
      const ifcType = c.name.match(/^Ifc[a-zA-Z]+/)?.[0]
      if (ifcType) types.add(ifcType)
    }
    let p = c.parent
    while (p && p !== model) {
      const pt = (p.name || '').match(/^Ifc[a-zA-Z]+/)?.[0]
      if (pt) types.add(pt)
      p = p.parent
    }
  })
}