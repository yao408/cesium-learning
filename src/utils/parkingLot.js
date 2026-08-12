import * as THREE from 'three'

export function createVehicle(type) {
  const group = new THREE.Group()
  group.name = type
  if (type === 'car') {
    const bodyGeo = new THREE.BoxGeometry(2.2, 0.9, 4.8)
    const bodyColor = [0xcc3333, 0x3366cc, 0xeeeeee, 0x222222, 0x338833, 0xffaa00][Math.floor(Math.random() * 6)]
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.3, roughness: 0.4 }))
    body.position.y = 0.7; body.castShadow = true; group.add(body)
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.55, 2.4)
    const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshStandardMaterial({ color: 0x88bbee, metalness: 0.6, roughness: 0.2, opacity: 0.55, transparent: true }))
    cabin.position.y = 1.3; cabin.position.z = -0.3; cabin.castShadow = true; group.add(cabin)
    ;[1.1, -1.1].forEach((wx) => { ;[1.3, -1.3].forEach((wz) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }))
      w.rotation.z = Math.PI / 2; w.position.set(wx, 0.3, wz); w.castShadow = true; group.add(w)
    }) })
  } else if (type === 'truck') {
    const bodyGeo = new THREE.BoxGeometry(2.8, 1.1, 7)
    const bodyColor = [0xdddddd, 0x3366aa, 0xcc8833, 0xeeeeee][Math.floor(Math.random() * 4)]
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.3, roughness: 0.4 }))
    body.position.y = 0.9; body.castShadow = true; group.add(body)
    const cabinGeo = new THREE.BoxGeometry(2.5, 1.8, 2.5)
    const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.3, roughness: 0.4 }))
    cabin.position.set(0, 1.9, -2.5); cabin.castShadow = true; group.add(cabin)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.6, roughness: 0.2, opacity: 0.5, transparent: true }))
    windshield.position.set(0, 1.9, -1.3); group.add(windshield)
    ;[1.3, -1.3].forEach((wx) => { ;[2.5, 0.5, -1.5, -2.5].forEach((wz) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }))
      w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz); w.castShadow = true; group.add(w)
    }) })
  } else if (type === 'heavy') {
    const bodyGeo = new THREE.BoxGeometry(3.2, 1.4, 9)
    const bodyColor = [0xcc4400, 0x335577, 0x999999, 0x886633][Math.floor(Math.random() * 4)]
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.3, roughness: 0.4 }))
    body.position.y = 1.1; body.castShadow = true; group.add(body)
    const cabinGeo = new THREE.BoxGeometry(2.8, 2.2, 3)
    const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.3, roughness: 0.4 }))
    cabin.position.set(0, 2.5, -3.2); cabin.castShadow = true; group.add(cabin)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.6, roughness: 0.2, opacity: 0.5, transparent: true }))
    windshield.position.set(0, 2.5, -1.8); group.add(windshield)
    ;[1.5, -1.5].forEach((wx) => { ;[3.5, 1.5, -1.5, -3.5].forEach((wz) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }))
      w.rotation.z = Math.PI / 2; w.position.set(wx, 0.45, wz); w.castShadow = true; group.add(w)
    }) })
  }
  return group
}

export function createParkingLot(pl, parseCoord, bw, bd, groundW, groundD) {
  const px = parseCoord(pl.x, bw, bd, groundD)
  const pz = parseCoord(pl.z, bw, bd, groundD)
  const spotW = 4
  const spotD = 7
  const padW = pl.cols * spotW + 3
  const padD = 3 + pl.rows * spotD + 3
  const padGeo = new THREE.PlaneGeometry(padW, padD)
  const padMat = new THREE.MeshStandardMaterial({ color: 0xc8c0b4, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: 0.5, polygonOffsetUnits: 0.5 })
  const pad = new THREE.Mesh(padGeo, padMat)
  pad.rotation.x = -Math.PI / 2
  pad.position.set(0, -0.005, 0)
  pad.receiveShadow = true
  pad.name = 'parkingLot'

  const parkingGroup = new THREE.Group()
  parkingGroup.name = 'parkingLot'
  parkingGroup.position.set(px, 0, pz)
  parkingGroup.add(pad)

  const vehicleTypes = ['car', 'car', 'car', 'car', 'truck', 'truck', 'heavy']
  for (let c = 0; c < pl.cols; c++) {
    const cx = -padW / 2 + 2 + c * spotW
    for (let r = 0; r < pl.rows; r++) {
      const cz = -padD / 2 + 2.5 + r * spotD
      const lineGeo = new THREE.PlaneGeometry(0.12, spotD - 1)
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 })
      const lineL = new THREE.Mesh(lineGeo, lineMat)
      lineL.rotation.x = -Math.PI / 2
      lineL.position.set(cx - spotW / 2 + 0.3, -0.003, cz)
      lineL.name = 'parkingLine'
      parkingGroup.add(lineL)
      const lineR = new THREE.Mesh(lineGeo, lineMat)
      lineR.rotation.x = -Math.PI / 2
      lineR.position.set(cx + spotW / 2 - 0.3, -0.003, cz)
      lineR.name = 'parkingLine'
      parkingGroup.add(lineR)
      const backLine = new THREE.Mesh(new THREE.PlaneGeometry(spotW - 1, 0.12), lineMat)
      backLine.rotation.x = -Math.PI / 2
      backLine.position.set(cx, -0.003, cz - spotD / 2 + 0.5)
      backLine.name = 'parkingLine'
      parkingGroup.add(backLine)

      if (Math.random() > 0.25) {
        const vType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]
        const vehicle = createVehicle(vType)
        vehicle.position.set(cx, 0, cz - 0.5)
        vehicle.rotation.y = Math.PI + (Math.random() - 0.5) * 0.08
        parkingGroup.add(vehicle)
      }
    }
  }
  
  console.log('🅿️ 停车场已添加')
  return parkingGroup
}