import * as THREE from 'three'

export function analyzeRailings(scene) {
  const railingStats = {
    total: 0,
    types: new Map(),
    byBuilding: new Map(),
    positions: [],
    geometryDetails: []
  }

  scene.traverse((child) => {
    if (!child.isMesh || !child.name.includes('IfcRailing')) return

    railingStats.total++

    const name = child.name
    const baseName = extractBaseName(name)
    const building = findBuildingName(child)

    if (name) {
      railingStats.positions.push({
        name,
        baseName,
        building,
        position: child.position.clone(),
        worldPosition: new THREE.Vector3()
      })

      child.getWorldPosition(railingStats.positions[railingStats.positions.length - 1].worldPosition)
    }

    if (baseName) {
      if (!railingStats.types.has(baseName)) {
        railingStats.types.set(baseName, { count: 0, samples: [] })
      }
      const typeInfo = railingStats.types.get(baseName)
      typeInfo.count++
      if (typeInfo.samples.length < 3) {
        typeInfo.samples.push({
          name,
          position: child.position.clone(),
          triangles: countTriangles(child.geometry)
        })
      }
    }

    if (building) {
      if (!railingStats.byBuilding.has(building)) {
        railingStats.byBuilding.set(building, { count: 0, types: new Set() })
      }
      const buildingInfo = railingStats.byBuilding.get(building)
      buildingInfo.count++
      buildingInfo.types.add(baseName)
    }

    if (railingStats.geometryDetails.length < 20) {
      railingStats.geometryDetails.push({
        name,
        vertices: child.geometry.attributes.position?.count || 0,
        triangles: countTriangles(child.geometry),
        hasUV: !!child.geometry.attributes.uv,
        hasNormal: !!child.geometry.attributes.normal,
        materialType: child.material?.type || 'unknown'
      })
    }
  })

  return formatAnalysisResult(railingStats)
}

function extractBaseName(fullName) {
  if (!fullName) return 'unknown'
  const match = fullName.match(/(IfcRailing[^0-9]*)/)
  return match ? match[1] : fullName.replace(/\d+$/, '')
}

function findBuildingName(mesh) {
  let parent = mesh.parent
  let depth = 0
  while (parent && depth < 10) {
    if (parent.name && (
      parent.name.includes('building') ||
      parent.name.includes('Building') ||
      parent.name.includes('ifcBuilding') ||
      parent.name.includes('建筑') ||
      /_\d{6}$/.test(parent.name)
    )) {
      return parent.name
    }
    parent = parent.parent
    depth++
  }
  return '未识别建筑'
}

function countTriangles(geometry) {
  if (!geometry.index) {
    return Math.floor((geometry.attributes.position?.count || 0) / 3)
  }
  return Math.floor(geometry.index.count / 3)
}

function formatAnalysisResult(stats) {
  const result = {
    summary: {},
    typeList: [],
    buildingList: [],
    topConsumers: [],
    recommendations: []
  }

  result.summary = {
    totalRailings: stats.total,
    totalTypes: stats.types.size,
    totalBuildings: stats.byBuilding.size,
    estimatedTriangles: stats.geometryDetails.reduce((sum, g) => sum + g.triangles, 0) * (stats.total / stats.geometryDetails.length || 1),
    memoryEstimate: estimateMemory(stats)
  }

  result.typeList = Array.from(stats.types.entries())
    .map(([name, info]) => ({
      name,
      count: info.count,
      percentage: ((info.count / stats.total) * 100).toFixed(1) + '%',
      avgTriangles: Math.round(info.samples.reduce((sum, s) => sum + s.triangles, 0) / info.samples.length || 0),
      sampleNames: info.samples.map(s => s.name).slice(0, 2),
      totalTriangles: info.count * Math.round(info.samples.reduce((sum, s) => sum + s.triangles, 0) / info.samples.length || 0)
    }))
    .sort((a, b) => b.count - a.count)

  result.buildingList = Array.from(stats.byBuilding.entries())
    .map(([name, info]) => ({
      name,
      count: info.count,
      typeCount: info.types.size,
      typeNames: Array.from(info.types).slice(0, 3)
    }))
    .sort((a, b) => b.count - a.count)

  result.topConsumers = stats.geometryDetails
    .sort((a, b) => b.triangles - a.triangles)
    .slice(0, 10)

  const maxSingleType = result.typeList[0]
  if (maxSingleType && maxSingleType.count > 100) {
    result.recommendations.push({
      priority: 'high',
      type: 'merge',
      target: maxSingleType.name,
      reason: `该类型有 ${maxSingleType.count} 个实例，合并后可减少 ${maxSingleType.count - 1} 次 Draw Call`,
      estimatedGain: `预计提升 ${(maxSingleType.count * 0.5).toFixed(0)} FPS`
    })
  }

  if (result.summary.estimatedTriangles > 1000000) {
    result.recommendations.push({
      priority: 'high',
      type: 'lod',
      target: '所有栏杆',
      reason: `总面数超过 ${(result.summary.estimatedTriangles / 10000).toFixed(0)} 万，建议使用 LOD 动态降级`,
      estimatedGain: '远处视角可提升 10-15 FPS'
    })
  }

  if (stats.types.size > 5) {
    result.recommendations.push({
      priority: 'medium',
      type: 'group_by_material',
      target: `${stats.types.size} 种类型`,
      reason: '类型较多，建议按材质/外观分组后分别合并',
      estimatedGain: '保持视觉效果同时优化性能'
    })
  }

  result.rawData = {
    samplePositions: stats.positions.slice(0, 50),
    geometryDetails: stats.geometryDetails
  }

  return result
}

function estimateMemory(stats) {
  const avgVertices = stats.geometryDetails.reduce((sum, g) => sum + g.vertices, 0) / (stats.geometryDetails.length || 1)
  const bytesPerVertex = 12 + (8) + (12)
  const totalMB = (avgVertices * stats.total * bytesPerVertex) / (1024 * 1024)
  
  if (totalMB > 1024) {
    return (totalMB / 1024).toFixed(1) + ' GB'
  } else if (totalMB > 1) {
    return totalMB.toFixed(1) + ' MB'
  } else {
    return (totalMB * 1024).toFixed(0) + ' KB'
  }
}

export function getRailingMergePlan(scene) {
  const analysis = analyzeRailings(scene)
  
  const mergeGroups = []

  analysis.typeList.forEach(type => {
    if (type.count >= 5) {
      mergeGroups.push({
        groupName: `${type.name}_merged`,
        sourceType: type.name,
        objectCount: type.count,
        estimatedTrianglesBefore: type.totalTriangles,
        estimatedTrianglesAfter: type.avgTriangles * 2,
        reduction: ((1 - (type.avgTriangles * 2) / type.totalTriangles) * 100).toFixed(1) + '%',
        priority: type.count > 200 ? 'critical' : type.count > 50 ? 'high' : 'medium',
        strategy: type.count > 500 ? 'merge_by_region' : 'merge_all'
      })
    }
  })

  return {
    analysis,
    mergeGroups: mergeGroups.sort((a, b) => b.objectCount - a.objectCount),
    executionOrder: mergeGroups.sort((a, b) => b.objectCount - a.objectCount).map(g => g.groupName),
    summary: {
      groupsToCreate: mergeGroups.length,
      totalObjectsToMerge: mergeGroups.reduce((sum, g) => sum + g.objectCount, 0),
      estimatedDrawCallReduction: mergeGroups.reduce((sum, g) => sum + g.objectCount - 1, 0),
      estimatedFpsGain: Math.min(25, mergeGroups.reduce((sum, g) => sum + g.objectCount * 0.03, 0))
    }
  }
}