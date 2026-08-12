import * as THREE from 'three'

export function createSkyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, '#0f172a')
  grad.addColorStop(0.4, '#1e293b')
  grad.addColorStop(1, '#334155')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  return new THREE.CanvasTexture(canvas)
}

export function createDarkScreenSkyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  const grad = ctx.createRadialGradient(256, 200, 50, 256, 400, 500)
  grad.addColorStop(0, '#0a1628')
  grad.addColorStop(0.5, '#060d18')
  grad.addColorStop(1, '#020408')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  return new THREE.CanvasTexture(canvas)
}

export function createGrassTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#5a7040'
  ctx.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = 65 + Math.random() * 35
    const g = 95 + Math.random() * 35
    const b = 35 + Math.random() * 25
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }

  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(110, 90, 60, ${Math.random() * 0.25})`
    ctx.beginPath()
    ctx.arc(Math.random() * 512, Math.random() * 512, 3 + Math.random() * 10, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(6, 6)
  return tex
}

export function createTree(x, z, scale) {
  const group = new THREE.Group()
  const s = scale || 1

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4c3b, roughness: 0.85, metalness: 0.02 })
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.8 * s, 8), trunkMat)
  trunk.position.y = 0.9 * s
  trunk.castShadow = true
  group.add(trunk)

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d5a2b, roughness: 0.75, metalness: 0.02 })

  const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 1.4 * s, 8), leafMat)
  cone1.position.y = 2.0 * s
  cone1.castShadow = true
  group.add(cone1)

  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.65 * s, 1.1 * s, 8), leafMat)
  cone2.position.y = 2.8 * s
  cone2.castShadow = true
  group.add(cone2)

  const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.4 * s, 0.8 * s, 8), leafMat)
  cone3.position.y = 3.4 * s
  cone3.castShadow = true
  group.add(cone3)

  group.position.set(x, 0, z)
  return group
}

export function buildBuilding(scene, cfg) {
  if (!cfg || !cfg.buildings) return

  const grid = cfg.grid || { cols: 3, rows: 3, cellSize: 9, roadWidth: 1.2 }
  const { cols, rows, cellSize, roadWidth } = grid
  const spacing = cellSize + roadWidth
  const totalW = cols * cellSize + (cols - 1) * roadWidth
  const halfTotal = totalW / 2

  function cellCenter(col, row) {
    return {
      x: (col - (cols - 1) / 2) * spacing,
      z: (row - (rows - 1) / 2) * spacing,
    }
  }

  const grassTex = createGrassTexture()
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9, metalness: 0.02 })
  const groundSize = Math.max(totalW + 6, 30)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), grassMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  ground.receiveShadow = true
  scene.add(ground)

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.92, metalness: 0.03 })
  for (let i = 0; i < cols - 1; i++) {
    const cx = -halfTotal + cellSize + roadWidth / 2 + i * spacing
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, totalW), roadMat)
    roadV.rotation.x = -Math.PI / 2
    roadV.position.set(cx, 0.005, 0)
    roadV.receiveShadow = true
    scene.add(roadV)
  }
  for (let i = 0; i < rows - 1; i++) {
    const cz = -halfTotal + cellSize + roadWidth / 2 + i * spacing
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(totalW, roadWidth), roadMat)
    roadH.rotation.x = -Math.PI / 2
    roadH.position.set(0, 0.005, cz)
    roadH.receiveShadow = true
    scene.add(roadH)
  }

  const occupiedCells = new Set()
  cfg.buildings.forEach(b => {
    occupiedCells.add(`${b.col},${b.row}`)
  })

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupiedCells.has(`${c},${r}`)) continue
      const pos = cellCenter(c, r)
      const treeCount = 3 + Math.floor(Math.random() * 4)
      for (let t = 0; t < treeCount; t++) {
        const tx = pos.x + (Math.random() - 0.5) * (cellSize - 1.5)
        const tz = pos.z + (Math.random() - 0.5) * (cellSize - 1.5)
        const ts = 0.6 + Math.random() * 0.8
        const tree = createTree(tx, tz, ts)
        scene.add(tree)
      }
    }
  }

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.55, metalness: 0.04 })
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a5a70, roughness: 0.35, metalness: 0.25 })
  const hqRoofMat = new THREE.MeshStandardMaterial({ color: 0x2a4050, roughness: 0.3, metalness: 0.35 })
  const hqWallMat = new THREE.MeshStandardMaterial({ color: 0xf0ece6, roughness: 0.45, metalness: 0.06 })
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xb0b0aa, roughness: 0.88, metalness: 0.03 })
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5c, roughness: 0.2, metalness: 0.6 })
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.4 })
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.6, metalness: 0.2 })

  const foundationH = 0.15

  cfg.buildings.forEach(b => {
    const pos = cellCenter(b.col, b.row)
    const offsetX = pos.x
    const offsetZ = pos.z

    if (b.isTank) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(cellSize - 0.8, cellSize - 0.8), concreteMat)
      pad.rotation.x = -Math.PI / 2
      pad.position.set(offsetX, 0.003, offsetZ)
      pad.receiveShadow = true
      scene.add(pad)

      if (b.tanks) {
        const tankMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 })
        b.tanks.forEach(t => {
          const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(t.radius, t.radius, t.height, 32),
            tankMat
          )
          tank.position.set(offsetX + t.offsetX, foundationH + t.height / 2, offsetZ + t.offsetZ)
          tank.castShadow = true
          scene.add(tank)
        })
      }
      return
    }

    const { width, depth, wallHeight, roofHeight, roofOverhang, isHQ } = b
    const wallY = foundationH + wallHeight / 2
    const roofY = foundationH + wallHeight + roofHeight / 2

    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 1.2, depth + 1.2),
      concreteMat
    )
    pad.rotation.x = -Math.PI / 2
    pad.position.set(offsetX, 0.003, offsetZ)
    pad.receiveShadow = true
    scene.add(pad)

    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, foundationH, depth + 0.2),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.1 })
    )
    foundation.position.set(offsetX, foundationH / 2, offsetZ)
    foundation.receiveShadow = true
    scene.add(foundation)

    const wMat = isHQ ? hqWallMat : wallMat
    const walls = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), wMat)
    walls.position.set(offsetX, wallY, offsetZ)
    walls.castShadow = true
    walls.receiveShadow = true
    scene.add(walls)

    const panelLineMat = new THREE.MeshStandardMaterial({ color: 0xd5d0c6, roughness: 0.6, metalness: 0.04 })
    const panelLineCount = Math.floor(wallHeight / 0.6)
    for (let i = 0; i < panelLineCount; i++) {
      const lineY = foundationH + 0.3 + i * 0.6
      const line = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.015, 0.02), panelLineMat)
      line.position.set(offsetX, lineY, offsetZ + depth / 2)
      scene.add(line)
    }

    const rMat = isHQ ? hqRoofMat : roofMat
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + roofOverhang * 2, roofHeight, depth + roofOverhang * 2),
      rMat
    )
    roof.position.set(offsetX, roofY, offsetZ)
    roof.castShadow = true
    scene.add(roof)

    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(width + roofOverhang * 2 + 0.3, 0.12, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x2a4050, roughness: 0.2, metalness: 0.5 })
    )
    ridge.position.set(offsetX, roofY + roofHeight / 2 + 0.06, offsetZ)
    ridge.castShadow = true
    scene.add(ridge)

    const floorCount = Math.max(1, Math.round(wallHeight / 3.5))
    const winCols = Math.max(2, Math.round(width / 1.8))
    const winRows = floorCount
    const rowH = wallHeight / (floorCount + 0.5)
    const winW = 0.45
    const winH = 0.55
    const startY = foundationH + rowH * 0.5
    const gapX = (width - winW * winCols) / (winCols + 1)
    const gapY = rowH

    for (let r = 0; r < winRows; r++) {
      for (let c = 0; c < winCols; c++) {
        const wx = offsetX - width / 2 + gapX + winW / 2 + c * (winW + gapX)
        const wy = startY + r * gapY + winH / 2

        const frame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.06, winH + 0.06, 0.04), frameMat)
        frame.position.set(wx, wy, offsetZ + depth / 2 + 0.01)
        scene.add(frame)

        const win = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.02), winMat)
        win.position.set(wx, wy, offsetZ + depth / 2 + 0.03)
        scene.add(win)
      }
    }

    const doorW = 0.8
    const doorH = 2.2
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.05), doorMat)
    door.position.set(offsetX, foundationH + doorH / 2, offsetZ + depth / 2 + 0.02)
    if (!isHQ) scene.add(door)
  })
}