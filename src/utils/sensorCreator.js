import * as THREE from 'three'

const sensorColors = { temp: 0xff6633, humidity: 0x3399ff, gas: 0xffcc00, vibration: 0xcc44cc }

export function createSensorModel(label, color) {
  const group = new THREE.Group()
  group.name = `sensor_${label}`

  const s = 1.0

  const bracketGeo = new THREE.BoxGeometry(s * 0.25, s * 0.45, s * 0.12)
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.95, roughness: 0.15 })
  const bracket = new THREE.Mesh(bracketGeo, bracketMat)
  bracket.position.z = s * 0.22
  bracket.castShadow = true
  group.add(bracket)

  const bodyGeo = new THREE.BoxGeometry(s * 0.75, s * 0.5, s * 0.3)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.35 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.name = 'sensorBody'
  body.castShadow = true
  group.add(body)

  const glowGeo = new THREE.BoxGeometry(s * 0.5, s * 0.25, s * 0.04)
  const glowMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.6, metalness: 0, roughness: 0.4, transparent: true, opacity: 0.9 })
  const glowPanel = new THREE.Mesh(glowGeo, glowMat)
  glowPanel.name = 'sensorGlow'
  glowPanel.position.set(0, s * 0.05, s * 0.15)
  group.add(glowPanel)

  const light = new THREE.PointLight(color, 3, 10, 1)
  light.name = 'sensorLight'
  light.position.set(0, s * 0.05, s * 0.05)
  group.add(light)

  const ledGeo = new THREE.SphereGeometry(s * 0.05, 8, 8)
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.2 })
  const led = new THREE.Mesh(ledGeo, ledMat)
  led.name = 'sensorLed'
  led.position.set(s * 0.2, s * 0.2, s * 0.17)
  group.add(led)

  const grillGeo = new THREE.PlaneGeometry(s * 0.5, s * 0.025)
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.3, roughness: 0.8 })
  for (let i = 0; i < 3; i++) {
    const grill = new THREE.Mesh(grillGeo, grillMat)
    grill.position.set(0, -s * 0.1 + i * s * 0.065, s * 0.17)
    group.add(grill)
  }

  const labelGeo = new THREE.PlaneGeometry(s * 0.25, s * 0.06)
  const labelMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.1, roughness: 0.7 })
  const labelPlane = new THREE.Mesh(labelGeo, labelMat)
  labelPlane.position.set(0, -s * 0.21, s * 0.17)
  group.add(labelPlane)

  group.userData.alarmState = 'normal'
  group.userData.glowColor = color
  group.userData.alarmTimer = 0
  group.userData.bodyRef = body
  group.userData.glowRef = glowPanel
  group.userData.ledRef = led
  group.userData.lightRef = light
  group.userData.screenRef = glowPanel

  return group
}

export function findNearestBuildingLabel(position, sceneConfig) {
  let nearestLabel = ''
  let minDist = Infinity
  sceneConfig.buildings.forEach((bCfg) => {
    const dist = Math.sqrt(
      Math.pow(position.x - bCfg.x, 2) +
      Math.pow(position.z - bCfg.z, 2)
    )
    if (dist < minDist) {
      minDist = dist
      nearestLabel = bCfg.label
    }
  })
  return minDist < 30 ? nearestLabel : ''
}

export function createSensors(scene, sceneConfig, box, sensorGroups, sensorGroupMap) {
  const sensorDefs = (sceneConfig.sensors || []).map(s => ({ ...s, offsetX: s.x, offsetZ: s.z }))
  
  sensorDefs.forEach((def, idx) => {
    const s = createSensorModel(def.type, sensorColors[def.type])
    s.name = `sensor_${def.id}`
    s.position.set(
      (box.max.x + box.min.x) / 2 + def.offsetX,
      box.max.y + 2,
      (box.max.z + box.min.z) / 2 + def.offsetZ
    )
    s.scale.set(1.0, 1.0, 1.0)
    s.userData.sensorType = def.type
    s.userData.sensorId = def.id
    s.userData.value = 0
    s.userData.buildingLabel = findNearestBuildingLabel(s.position, sceneConfig)
    scene.add(s)
    sensorGroups.push(s)
    sensorGroupMap[def.id] = s
  })
}

export async function loadSensorsFromDatabase(scene, sensorGroups, createSensorModel, findNearestBuildingLabel, sceneConfig) {
  try {
    const response = await fetch('/api/sensors')
    if (response.ok) {
      const dbSensors = await response.json()
      if (dbSensors && dbSensors.length > 0) {
        dbSensors.forEach((dbSensor) => {
          const existingIdx = sensorGroups.findIndex(g => g.name === dbSensor.sensorId || g.userData.sensorId === dbSensor.sensorId)
          if (existingIdx < 0) {
            const colorMap = { temp: 0xff6633, humidity: 0x3399ff, gas: 0xffcc00, vibration: 0xcc44cc, pressure: 0x9966ff, temperature: 0xff6633 }
            const sensorColor = colorMap[dbSensor.sensorType] || 0xffffff
            const s = createSensorModel(dbSensor.sensorType, sensorColor)
            s.name = dbSensor.sensorId
            s.position.set(dbSensor.x || 0, dbSensor.y || 0, dbSensor.z || 0)
            s.rotation.set(dbSensor.rx || 0, dbSensor.ry || 0, dbSensor.rz || 0)
            s.scale.set(1.0, 1.0, 1.0)
            s.userData.sensorType = dbSensor.sensorType
            s.userData.sensorId = dbSensor.sensorId
            s.userData.value = 0
            s.userData.buildingLabel = findNearestBuildingLabel(s.position, sceneConfig)
            scene.add(s)
            sensorGroups.push(s)
          }
        })
      }
    }
  } catch (error) {
    console.error('加载传感器失败:', error)
  }
}