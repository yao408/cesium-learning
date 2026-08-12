import * as THREE from 'three'

export function createGround(bw, bd, groundW, groundD) {
  const groundGeo = new THREE.PlaneGeometry(groundW, groundD)
  const groundCanvas = document.createElement('canvas')
  groundCanvas.width = 512; groundCanvas.height = 512
  const gctx = groundCanvas.getContext('2d')

  gctx.fillStyle = '#9aa5ad'
  gctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 3000; i++) {
    const v = 140 + Math.random() * 40
    gctx.fillStyle = `rgb(${v-8},${v+2},${v+12})`
    gctx.fillRect(Math.random()*512, Math.random()*512, 1 + Math.random()*2, 1 + Math.random()*2)
  }
  for (let i = 0; i < 200; i++) {
    const gx = Math.floor(Math.random() * 16) * 32
    const gy = Math.floor(Math.random() * 16) * 32
    const shade = Math.random()
    if (shade > 0.7) {
      gctx.fillStyle = 'rgba(70,80,90,0.08)'
      gctx.fillRect(gx, gy, 32, 32)
    } else if (shade < 0.3) {
      gctx.fillStyle = 'rgba(200,210,220,0.06)'
      gctx.fillRect(gx, gy, 32, 32)
    }
  }

  gctx.strokeStyle = 'rgba(80,90,100,0.25)'
  gctx.lineWidth = 1
  for (let x = 0; x <= 512; x += 64) { gctx.beginPath(); gctx.moveTo(x, 0); gctx.lineTo(x, 512); gctx.stroke() }
  for (let y = 0; y <= 512; y += 64) { gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(512, y); gctx.stroke() }

  const groundTex = new THREE.CanvasTexture(groundCanvas)
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping
  groundTex.repeat.set(4, 3)

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: 0xa8b4bc,
    roughness: 0.92,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -0.02, 0)
  ground.receiveShadow = true
  ground.name = 'ground'
  
  return ground
}