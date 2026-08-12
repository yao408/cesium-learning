import * as THREE from 'three'

async function createRoadTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 512
  const ctx = canvas.getContext('2d')
  
  ctx.fillStyle = '#2a2a2a'
  ctx.fillRect(0, 0, 512, 512)
  
  for (let i = 0; i < 2000; i++) {
    const v = 35 + Math.random() * 20
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.fillRect(Math.random()*512, Math.random()*512, 1+Math.random()*2, 1+Math.random()*2)
  }
  
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 2
  ctx.setLineDash([40, 20])
  ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 512); ctx.stroke()
  
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  ctx.setLineDash([60, 40])
  ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 512); ctx.stroke()
  
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

export async function createRoads(scene, sceneConfig, parseCoord, bw, bd, groundW, groundD, allBuildingGroups, loadSceneState) {
  const roadTex = await createRoadTexture()
  const roadW = 8
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.8,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: 0.3,
    polygonOffsetUnits: 0.3,
  })
  
  sceneConfig.roads.forEach((roadCfg, ri) => {
    const rx = parseCoord(roadCfg.x, bw, bd, groundD)
    const rz = parseCoord(roadCfg.z, bw, bd, groundD)
    const isVertical = roadCfg.type === 'vertical'
    const roadLen = isVertical ? groundD * 0.9 : groundW * 0.7

    const roadGroup = new THREE.Group()
    roadGroup.name = `road-${roadCfg.type}-${ri}`
    roadGroup.position.set(rx, isVertical ? -0.009 : -0.011, rz)
    roadGroup.userData = { roadCfg, roadW, roadLen, isVertical }

    const roadGeo = new THREE.PlaneGeometry(isVertical ? roadW : roadLen, isVertical ? roadLen : roadW)
    const road = new THREE.Mesh(roadGeo, roadMat.clone())
    road.rotation.x = -Math.PI / 2
    road.receiveShadow = true
    road.name = 'roadSurface'
    roadGroup.add(road)

    if (roadCfg.lamps && isVertical) {
      const lampCount = 8
      const lampSpacing = roadLen / (lampCount + 1)
      for (let i = 0; i < lampCount; i++) {
        const z = -roadLen / 2 + lampSpacing * (i + 1)
        ;[-roadW / 2 - 1, roadW / 2 + 1].forEach((off) => {
          const lx = off
          const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 5, 8)
          const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 })
          const pole = new THREE.Mesh(poleGeo, poleMat)
          pole.position.set(lx, 2.5, z)
          pole.castShadow = true
          pole.receiveShadow = true
          pole.name = 'lampPole'
          roadGroup.add(pole)

          const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8)
          const arm = new THREE.Mesh(armGeo, poleMat)
          arm.rotation.z = Math.PI / 2
          arm.position.set(off > 0 ? -0.6 : 0.6, 0, 0)
          pole.add(arm)

          const bulbGeo = new THREE.SphereGeometry(0.25, 8, 8)
          const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xfffbe6,
            emissive: 0xfffbe6,
            emissiveIntensity: 0.5,
          })
          const bulb = new THREE.Mesh(bulbGeo, bulbMat)
          bulb.position.set(off > 0 ? -1.4 : 1.4, 0, 0)
          pole.add(bulb)
        })
      }
    }

    scene.add(roadGroup)
    allBuildingGroups.push(roadGroup)
  })

  const savedForRoads = loadSceneState()
  if (savedForRoads) {
    savedForRoads.forEach((s) => {
      const group = allBuildingGroups.find(g => g.name === s.name)
      if (group && group.name.startsWith('road-')) {
        group.position.x = s.x
        group.position.z = s.z
        group.rotation.x = s.rx || 0
        group.rotation.y = s.ry || 0
        group.rotation.z = s.rz || 0
      }
    })
  }
}