import * as THREE from 'three'

export function createWaterPool(bw, bd, groundW, groundD, config) {
  const poolW = bw * 0.8
  const poolD = bd * 0.5
  let poolX = bw * 0.8
  let poolZ = groundD * -0.25

  if (config && config.x !== undefined && config.z !== undefined) {
    poolX = config.x
    poolZ = config.z
  }

  const wallH = 0.6
  const wallT = 0.15

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.3 })
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3388cc,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
    emissive: 0x112244,
    emissiveIntensity: 0.3,
  })

  const waterGroup = new THREE.Group()
  waterGroup.name = 'waterPool'

  waterGroup.position.set(poolX, 0, poolZ)

  const wallGeoLong = new THREE.BoxGeometry(poolW + wallT * 2, wallH, wallT)
  const wallGeoShort = new THREE.BoxGeometry(wallT, wallH, poolD)

  const wallTop = new THREE.Mesh(wallGeoLong, wallMat)
  wallTop.position.set(0, wallH / 2, -poolD / 2)
  waterGroup.add(wallTop)

  const wallBottom = new THREE.Mesh(wallGeoLong, wallMat)
  wallBottom.position.set(0, wallH / 2, poolD / 2)
  waterGroup.add(wallBottom)

  const wallLeft = new THREE.Mesh(wallGeoShort, wallMat)
  wallLeft.position.set(-poolW / 2, wallH / 2, 0)
  waterGroup.add(wallLeft)

  const wallRight = new THREE.Mesh(wallGeoShort, wallMat)
  wallRight.position.set(poolW / 2, wallH / 2, 0)
  waterGroup.add(wallRight)

  const waterGeo = new THREE.PlaneGeometry(poolW, poolD)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.set(0, 0.05, 0)
  water.name = 'waterSurface'
  water.receiveShadow = true
  waterGroup.add(water)

  waterGroup.userData = { water, poolW, poolD, poolX, poolZ }
  waterGroup.name = 'waterPool'

  function addLadder(lx, lz, facingZ) {
    const ladderMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.9 })
    const ladderW = 0.5
    const ladderH = wallH + 0.9
    const railR = 0.03
    const rungCount = 5
    const rungR = 0.02

    const ladderGrp = new THREE.Group()
    ladderGrp.position.set(lx, 0, lz)

    const railGeo = new THREE.CylinderGeometry(railR, railR, ladderH, 8)
    const railL = new THREE.Mesh(railGeo, ladderMat)
    railL.position.set(-ladderW / 2, ladderH / 2, 0)
    ladderGrp.add(railL)
    const railR2 = new THREE.Mesh(railGeo, ladderMat)
    railR2.position.set(ladderW / 2, ladderH / 2, 0)
    ladderGrp.add(railR2)

    for (let i = 0; i < rungCount; i++) {
      const rungY = 0.1 + (ladderH - 0.2) * i / (rungCount - 1)
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(rungR, rungR, ladderW, 8), ladderMat)
      rung.rotation.z = Math.PI / 2
      rung.position.set(0, rungY, 0)
      ladderGrp.add(rung)
    }

    if (facingZ) {
      ladderGrp.rotation.y = Math.PI / 2
    }

    waterGroup.add(ladderGrp)
  }

  addLadder(-poolW / 2 + 0.15, 0, false)
  addLadder(poolW / 2 - 0.15, 0, false)
  addLadder(0, -poolD / 2 + 0.15, true)
  addLadder(0, poolD / 2 - 0.15, true)

  return waterGroup
}

export function createGate(bw, bd, groundW, groundD) {
  const gateX = bw * -1.2
  const gateZ = -groundD * 0.45

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.9 })
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.4, metalness: 0.2 })

  const gateGroup = new THREE.Group()
  gateGroup.name = 'gate'

  const pillarH = 5
  const pillarW = 0.5
  const pillarGeo = new THREE.BoxGeometry(pillarW, pillarH, pillarW)

  const leftPillar = new THREE.Mesh(pillarGeo, metalMat)
  leftPillar.position.set(gateX - 3.5, pillarH / 2, gateZ)
  leftPillar.castShadow = true
  gateGroup.add(leftPillar)

  const rightPillar = new THREE.Mesh(pillarGeo, metalMat)
  rightPillar.position.set(gateX + 3.5, pillarH / 2, gateZ)
  rightPillar.castShadow = true
  gateGroup.add(rightPillar)

  const beamGeo = new THREE.BoxGeometry(8, 0.3, 0.5)
  const beam = new THREE.Mesh(beamGeo, metalMat)
  beam.position.set(gateX, pillarH - 0.2, gateZ)
  beam.castShadow = true
  gateGroup.add(beam)

  const signGeo = new THREE.BoxGeometry(5, 0.8, 0.15)
  const sign = new THREE.Mesh(signGeo, accentMat)
  sign.position.set(gateX, pillarH - 0.5, gateZ + 0.3)
  gateGroup.add(sign)

  const signTextGeo = new THREE.PlaneGeometry(4.5, 0.5)
  const signCanvas = document.createElement('canvas')
  signCanvas.width = 512
  signCanvas.height = 64
  const ctx = signCanvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('XX 制造有限公司', 256, 42)
  const signTex = new THREE.CanvasTexture(signCanvas)
  const signTextMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true })
  const signText = new THREE.Mesh(signTextGeo, signTextMat)
  signText.position.set(gateX, pillarH - 0.5, gateZ + 0.38)
  gateGroup.add(signText)

  const guardGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5)
  const guardHouse = new THREE.Mesh(guardGeo, metalMat)
  guardHouse.position.set(gateX + 5, 1.25, gateZ)
  guardHouse.castShadow = true
  gateGroup.add(guardHouse)

  const roofGeo = new THREE.ConeGeometry(1.8, 0.6, 4)
  const roof = new THREE.Mesh(roofGeo, accentMat)
  roof.position.set(gateX + 5, 2.8, gateZ)
  roof.rotation.y = Math.PI / 4
  gateGroup.add(roof)

  return gateGroup
}

export function createFence(bw, bd, groundW, groundD) {
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.8 })
  const postH = 2.5
  const postW = 0.15
  const postGeo = new THREE.CylinderGeometry(postW, postW, postH, 6)

  const fenceGroup = new THREE.Group()
  fenceGroup.name = 'fence'

  const halfW = groundW / 2
  const halfD = groundD / 2
  const spacing = 3

  function addPost(x, z) {
    const post = new THREE.Mesh(postGeo, fenceMat)
    post.position.set(x, postH / 2, z)
    post.castShadow = true
    fenceGroup.add(post)
  }

  function addBars(x1, z1, x2, z2) {
    const dx = x2 - x1
    const dz = z2 - z1
    const len = Math.sqrt(dx * dx + dz * dz)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), fenceMat)
    bar.position.set((x1 + x2) / 2, postH * 0.7, (z1 + z2) / 2)
    bar.rotation.y = Math.atan2(dx, dz)
    fenceGroup.add(bar)
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), fenceMat)
    bar2.position.set((x1 + x2) / 2, postH * 0.5, (z1 + z2) / 2)
    bar2.rotation.y = Math.atan2(dx, dz)
    fenceGroup.add(bar2)
  }

  const sides = [
    { start: -halfW, end: halfW, z: -halfD, dir: 'x' },
    { start: -halfW, end: halfW, z: halfD, dir: 'x' },
    { start: -halfD, end: halfD, x: -halfW, dir: 'z' },
    { start: -halfD, end: halfD, x: halfW, dir: 'z' },
  ]

  sides.forEach(side => {
    if (side.dir === 'x') {
      for (let x = side.start; x <= side.end; x += spacing) {
        addPost(x, side.z)
      }
      addBars(side.start, side.z, side.end, side.z)
    } else {
      for (let z = side.start; z <= side.end; z += spacing) {
        addPost(side.x, z)
      }
      addBars(side.x, side.start, side.x, side.end)
    }
  })

  const gateX = bw * -1.2
  const gateZ = -halfD
  fenceGroup.children.forEach(child => {
    if (child.isMesh && child.geometry.type === 'CylinderGeometry') {
      const px = child.position.x
      const pz = child.position.z
      if (Math.abs(pz - gateZ) < 0.5 && Math.abs(px - gateX) < 5) {
        child.visible = false
      }
    }
  })

  return fenceGroup
}

export function createVegetation(bw, bd, groundW, groundD) {
  const halfW = groundW / 2 - 4
  const halfD = groundD / 2 - 4
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 })
  const leafColors = [0x3a7d2c, 0x4a8d3c, 0x2d6b1e, 0x5a9d4c, 0x3d8d2e]

  function addTree(x, z, scale) {
    const s = scale || 0.7 + Math.random() * 0.8
    const group = new THREE.Group()

    const trunkH = 2.5 * s
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, trunkH, 6), trunkMat)
    trunk.position.y = trunkH / 2
    trunk.castShadow = true
    group.add(trunk)

    const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)]
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.7 })

    const levels = [{ y: trunkH * 0.65, r: 0.9 * s, h: 1.4 * s }, { y: trunkH * 0.9, r: 0.6 * s, h: 1.1 * s }, { y: trunkH * 1.1, r: 0.35 * s, h: 0.8 * s }]
    levels.forEach(l => {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(l.r, l.h, 7), leafMat)
      leaf.position.y = l.y
      leaf.castShadow = true
      group.add(leaf)
    })

    group.position.set(x, 0, z)
    group.name = 'tree'
    return group
  }

  const vegGroup = new THREE.Group()
  vegGroup.name = 'vegetation'

  for (let i = 0; i < 30; i++) {
    const edge = Math.floor(Math.random() * 4)
    let x, z
    if (edge === 0) { x = -halfW + Math.random() * groundW; z = -halfD }
    else if (edge === 1) { x = -halfW + Math.random() * groundW; z = halfD }
    else if (edge === 2) { x = -halfW; z = -halfD + Math.random() * groundD }
    else { x = halfW; z = -halfD + Math.random() * groundD }
    vegGroup.add(addTree(x, z))
  }

  const gateX = bw * -1.2
  const gateZ = -groundD * 0.45
  for (let i = 0; i < 4; i++) {
    vegGroup.add(addTree(gateX + (i - 1.5) * 3, gateZ + 2 + Math.random() * 3, 0.8 + Math.random() * 0.4))
  }

  for (let i = 0; i < 15; i++) {
    const x = -halfW + 8 + Math.random() * (groundW - 16)
    const z = -halfD + 8 + Math.random() * (groundD - 16)
    vegGroup.add(addTree(x, z, 0.5 + Math.random() * 0.5))
  }

  return vegGroup
}

export function createGreenArea(bw, bd, groundW, groundD, config) {
  let posX = bw * -0.6
  let posZ = groundD * -0.05

  if (config && config.x !== undefined && config.z !== undefined) {
    posX = config.x
    posZ = config.z
  }

  const greenMat = new THREE.MeshStandardMaterial({ color: 0x4a8c3f, roughness: 0.9, metalness: 0 })
  const greenArea = new THREE.Mesh(new THREE.BoxGeometry(15, 0.05, 12), greenMat)
  greenArea.position.set(posX, 0.025, posZ)
  greenArea.receiveShadow = true
  greenArea.name = 'greenArea'
  return greenArea
}

export function createCargoContainers(bw, bd, groundW, groundD, config) {
  const containerColors = [0xcc3333, 0x3366cc, 0x338833, 0xcc8833, 0x6666aa, 0x888888, 0xdd6644, 0x4477aa]
  const containerMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6 })

  const cargoYard = new THREE.Group()
  cargoYard.name = 'cargoContainers'

  const yardWidth = 25
  const yardDepth = 22

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.9,
    metalness: 0.1
  })
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(yardWidth, 0.12, yardDepth),
    groundMat
  )
  ground.position.y = 0.06
  ground.receiveShadow = true
  ground.name = 'cargoGround'
  cargoYard.add(ground)

  function addSingleContainer(localX, localZ, localRotY, colorIdx, scale = 1) {
    const s = scale
    const containerGroup = new THREE.Group()

    const bodyGeo = new THREE.BoxGeometry(2.4 * s, 2.6 * s, 6 * s)
    const body = new THREE.Mesh(bodyGeo, containerMat(containerColors[colorIdx % containerColors.length]))
    body.position.y = 1.3 * s
    body.castShadow = true
    body.receiveShadow = true
    containerGroup.add(body)

    const ridgeCount = 5
    for (let i = 0; i < ridgeCount; i++) {
      const ridgeGeo = new THREE.BoxGeometry(0.08 * s, 0.06 * s, 5.8 * s)
      const ridge = new THREE.Mesh(ridgeGeo, containerMat(0x333333))
      ridge.position.set(-1.15 * s + i * 0.55 * s, 2.6 * s, 0)
      containerGroup.add(ridge)
    }

    const doorGeo = new THREE.BoxGeometry(2.2 * s, 2.2 * s, 0.05 * s)
    const door = new THREE.Mesh(doorGeo, containerMat(0x555555))
    door.position.set(0, 1.3 * s, 3 * s)
    containerGroup.add(door)

    containerGroup.position.set(localX, 0, localZ)
    containerGroup.rotation.y = localRotY
    cargoYard.add(containerGroup)
  }

  addSingleContainer(-5, -6, 0.3, 0)
  addSingleContainer(-5, 0, 0.3, 2)
  addSingleContainer(-5, 6, 0.3, 4)
  addSingleContainer(0, -3, 0.3, 1, 0.85)
  addSingleContainer(5, -6, -0.5, 3)
  addSingleContainer(5, 0, -0.5, 5)
  addSingleContainer(5, 6, -0.5, 6)
  addSingleContainer(0, 3, -0.5, 7, 0.85)

  let yardX = bw * 0.1
  let yardZ = groundD * 0.2

  if (config && config.x !== undefined && config.z !== undefined) {
    yardX = config.x
    yardZ = config.z
  }

  cargoYard.position.set(yardX, 0, yardZ)

  return cargoYard
}

export function createFlagPlatform(bw, bd, groundW, groundD) {
  const group = new THREE.Group()
  group.name = 'flagPlatform'

  const baseMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.1 })
  const stepSizes = [
    { w: 4, h: 0.3, d: 3 },
    { w: 3.2, h: 0.3, d: 2.4 },
    { w: 2.4, h: 0.3, d: 1.8 },
  ]
  stepSizes.forEach((s, i) => {
    const geo = new THREE.BoxGeometry(s.w, s.h, s.d)
    const mesh = new THREE.Mesh(geo, baseMat)
    mesh.position.y = s.h / 2 + i * 0.3
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  })

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.8 })
  const pillarPositions = [
    [-1.2, 0.9], [1.2, 0.9], [-1.2, -0.9], [1.2, -0.9],
    [0, 0.9], [0, -0.9], [-1.2, 0], [1.2, 0],
  ]
  pillarPositions.forEach(([px, pz]) => {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8)
    const pillar = new THREE.Mesh(geo, pillarMat)
    pillar.position.set(px, 0.9 + 0.6, pz)
    pillar.castShadow = true
    group.add(pillar)
  })

  const railMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.8 })
  const railDefs = [
    { x: 0, z: 0.9, w: 2.4 },
    { x: 0, z: -0.9, w: 2.4 },
    { x: -1.2, z: 0, w: 1.8 },
    { x: 1.2, z: 0, w: 1.8 },
  ]
  railDefs.forEach(r => {
    const geo = new THREE.BoxGeometry(r.w, 0.06, 0.06)
    const rail = new THREE.Mesh(geo, railMat)
    rail.position.set(r.x, 0.9 + 1.2, r.z)
    group.add(rail)
  })

  const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.9 })
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 18, 16)
  const pole = new THREE.Mesh(poleGeo, poleMat)
  pole.position.y = 0.9 + 9
  pole.castShadow = true
  group.add(pole)

  const ballGeo = new THREE.SphereGeometry(0.25, 16, 16)
  const ball = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 1 }))
  ball.position.y = 0.9 + 18 + 0.25
  group.add(ball)

  const flagGroup = new THREE.Group()
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xde2910, roughness: 0.6, side: THREE.DoubleSide })
  const flagGeo = new THREE.PlaneGeometry(3, 2)
  const flag = new THREE.Mesh(flagGeo, flagMat)
  flag.position.set(1.5, 0, 0)
  flag.castShadow = true
  flagGroup.add(flag)

  const starMat = new THREE.MeshStandardMaterial({ color: 0xffde00, roughness: 0.3, emissive: 0xffde00, emissiveIntensity: 0.3, side: THREE.DoubleSide })
  const bigStarGeo = new THREE.PlaneGeometry(0.6, 0.6)
  const bigStar = new THREE.Mesh(bigStarGeo, starMat)
  bigStar.position.set(0.6, 0.5, 0.01)
  flagGroup.add(bigStar)

  const smallStarPositions = [
    [1.1, 0.9], [1.3, 0.6], [1.3, 0.2], [1.1, -0.1]
  ]
  smallStarPositions.forEach(([sx, sy]) => {
    const geo = new THREE.PlaneGeometry(0.25, 0.25)
    const star = new THREE.Mesh(geo, starMat)
    star.position.set(sx, sy, 0.01)
    flagGroup.add(star)
  })

  flagGroup.position.set(0, 0.9 + 18 - 1, 0)
  group.add(flagGroup)

  group.userData = { flagGroup }

  return group
}

let restAreaCounter = 0

export function createRestArea(posX = 0, posZ = 0) {
  const restGroup = new THREE.Group()
  restAreaCounter++
  restGroup.name = `restArea_${restAreaCounter}`
  const groundY = -0.02

  const platformGeo = new THREE.BoxGeometry(10, 0.15, 5)
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85 })
  const platform = new THREE.Mesh(platformGeo, platformMat)
  platform.position.set(0, groundY + 0.075, 0)
  platform.receiveShadow = true
  platform.castShadow = true
  restGroup.add(platform)

  for (let side = -1; side <= 1; side += 2) {
    const benchGroup = new THREE.Group()

    for (let leg = -1; leg <= 1; leg += 2) {
      const legGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08)
      const legMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.3, roughness: 0.5 })
      const benchLeg = new THREE.Mesh(legGeo, legMat)
      benchLeg.position.set(leg * 1.6, groundY + 0.2, side * 1.3)
      benchLeg.castShadow = true
      benchGroup.add(benchLeg)

      const seatGeo = new THREE.BoxGeometry(3.4, 0.06, 0.45)
      const seatMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 })
      const seat = new THREE.Mesh(seatGeo, seatMat)
      seat.position.set(0, groundY + 0.43, side * 1.3)
      seat.castShadow = true
      benchGroup.add(seat)

      const backGeo = new THREE.BoxGeometry(3.4, 0.45, 0.05)
      const back = new THREE.Mesh(backGeo, seatMat)
      back.position.set(0, groundY + 0.68, side * 1.53)
      back.rotation.x = -0.12
      back.castShadow = true
      benchGroup.add(back)
    }
    restGroup.add(benchGroup)
  }

  for (let poleIdx = -1; poleIdx <= 1; poleIdx += 2) {
    const poleH = 2.4
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, poleH, 8)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 })
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.set(poleIdx * 4, groundY + poleH / 2, 0)
    pole.castShadow = true
    restGroup.add(pole)

    const roofW = 9.5, roofD = 4.5
    const roofShape = new THREE.Shape()
    roofShape.moveTo(-roofW / 2, 0)
    roofShape.lineTo(0, 1.2)
    roofShape.lineTo(roofW / 2, 0)
    roofShape.closePath()
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: roofD, bevelEnabled: false })
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xe8e0d5,
      roughness: 0.9,
      side: THREE.DoubleSide
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.rotation.x = Math.PI / 2
    roof.position.set(0, groundY + poleH, -roofD / 2)
    roof.castShadow = true
    roof.receiveShadow = true
    restGroup.add(roof)
  }

  const treePositions = [
    { x: -6, z: 0 }, { x: 6, z: 0 },
    { x: 0, z: -4 },
  ]
  treePositions.forEach((pos, idx) => {
    const tH = 2 + Math.random() * 0.6
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.22, tH, 7),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
    )
    trunk.position.set(pos.x, groundY + tH / 2, pos.z)
    trunk.castShadow = true
    restGroup.add(trunk)

    const cR = 1.5 + (idx % 2) * 0.4
    const canopyColors = [0x2e7d32, 0x388e3c, 0x43a047]
    for (let layer = 0; layer < 3; layer++) {
      const lR = cR * (1 - layer * 0.25)
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(lR, cR * 0.9, 8),
        new THREE.MeshStandardMaterial({ color: canopyColors[layer], roughness: 0.85 })
      )
      canopy.position.set(pos.x, groundY + tH + cR * 0.4 + layer * cR * 0.35, pos.z)
      canopy.castShadow = true
      restGroup.add(canopy)
    }
  })

  restGroup.position.set(posX, 0, posZ)
  return restGroup
}

export function createMultipleRestAreas(sceneConfig) {
  if (!sceneConfig.restAreas || sceneConfig.restAreas.length === 0) {
    console.log('⚠️ JSON中没有休息区配置，使用默认位置')
    return [createRestArea(0, 0)]
  }

  const areas = []
  sceneConfig.restAreas.forEach(config => {
    const area = createRestArea(config.x || 0, config.z || 0)
    if (config.ry !== undefined) {
      area.rotation.y = config.ry
    }
    areas.push(area)
  })

  return areas
}