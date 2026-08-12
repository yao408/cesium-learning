import mqtt from 'mqtt'

const BACKEND_URL = 'http://localhost:8081'

const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
  clientId: 'sensor-simulator-' + Math.random().toString(16).slice(2, 10),
  clean: true,
})

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function randomDelta(range) {
  return (Math.random() - 0.5) * range
}

const sensorStates = {}

const typeConfig = {
  temp:        { init: 72.0, delta: 8.0, min: 50, max: 95, threshold: 75.0, unit: '℃',    icon: '🌡️', label: '温度', interval: 2000 },
  humidity:    { init: 55.0, delta: 4.0, min: 30, max: 90, threshold: 80.0, unit: '%RH',  icon: '💧', label: '湿度', interval: 5000 },
  pressure:    { init: 1.2,  delta: 0.2, min: 0.8, max: 2.2, threshold: 1.8,  unit: 'MPa',  icon: '⚙️', label: '压力', interval: 3000 },
  vibration:   { init: 2.5,  delta: 1.0, min: 0.5, max: 8.0, threshold: 6.0,  unit: 'mm/s', icon: '📳', label: '振动', interval: 2500 },
  gas:         { init: 25.0, delta: 5.0, min: 10, max: 60, threshold: 50.0, unit: 'ppm',  icon: '💨', label: '气体', interval: 4000 },
  temperature: { init: 72.0, delta: 8.0, min: 50, max: 95, threshold: 75.0, unit: '℃',    icon: '🌡️', label: '温度', interval: 2000 },
}

async function fetchSensors() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/sensors`)
    if (res.ok) {
      const sensors = await res.json()
      if (sensors && sensors.length > 0) {
        console.log(`✅ 从后端获取到 ${sensors.length} 个传感器`)
        return sensors
      }
    }
  } catch (e) {
    console.log('⚠️ 无法连接后端:', e.message)
  }

  console.log('📋 使用默认传感器列表')
  return [
    { sensorId: 'SENSOR-T-001', sensorType: 'temp' },
    { sensorId: 'SENSOR-P-001', sensorType: 'pressure' },
    { sensorId: 'SENSOR-V-001', sensorType: 'vibration' },
    { sensorId: 'SENSOR-H-001', sensorType: 'humidity' },
  ]
}

function startSensor(sensor) {
  const { sensorId, sensorType, sensorName, x, y, z, buildingLabel } = sensor
  const config = typeConfig[sensorType]
  if (!config) {
    console.warn(`⚠️ 未知传感器类型: ${sensorType}，跳过 ${sensorId}`)
    return
  }

  if (!sensorStates[sensorId]) {
    sensorStates[sensorId] = config.init
  }

  const name = sensorName || `${sensorId}`
  const interval = config.interval + Math.floor(Math.random() * 500)

  console.log(`  ${config.icon} ${sensorId} (${config.label}) - 每${(interval / 1000).toFixed(1)}秒`)

  setInterval(() => {
    try {
      let value = sensorStates[sensorId]
      value += randomDelta(config.delta)
      value = clamp(value, config.min, config.max)
      sensorStates[sensorId] = value

      const status = value >= config.threshold * 1.05 ? 'alarm'
        : value >= config.threshold * 0.92 ? 'warning'
        : 'normal'

      const payload = JSON.stringify({
        sensorId,
        sensorType: sensorType === 'temperature' ? 'temperature' : sensorType,
        sensorName: name,
        position: { x: x || 0, y: y || 0, z: z || 0 },
        value: Math.round(value * 10) / 10,
        unit: config.unit,
        alarmThreshold: config.threshold,
        status,
        buildingLabel: buildingLabel || null,
        timestamp: new Date().toISOString(),
      })

      client.publish(`factory/sensor/${sensorId}/data`, payload)

      const icon = status === 'alarm' ? '🔴' : status === 'warning' ? '🟡' : '🟢'
      console.log(`${icon} ${sensorId} | ${value.toFixed(1)}${config.unit} | ${status}`)
    } catch (e) {
      console.error(`❌ ${sensorId} 发送失败:`, e.message)
    }
  }, interval)
}

client.on('connect', async () => {
  console.log('✅ MQTT模拟器已连接到 broker.emqx.io')
  console.log('📡 正在获取传感器列表...\n')

  const sensors = await fetchSensors()
  console.log(`\n📊 共 ${sensors.length} 个传感器，开始模拟:\n`)

  sensors.forEach(startSensor)

  console.log('\n📨 Topic格式: factory/sensor/{sensorId}/data')
  console.log('💾 数据会自动存储到数据库并推送给前端')
  console.log('🔄 在后端添加/删除传感器后，重启模拟器即可生效\n')
})

client.on('error', (error) => {
  console.error('❌ MQTT连接错误:', error.message)
})

client.on('close', () => {
  console.warn('⚠️ MQTT连接已关闭，尝试重新连接...')
  setTimeout(() => {
    client.reconnect()
  }, 5000)
})