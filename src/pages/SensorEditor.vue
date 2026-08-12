<template>
  <div class="sensor-type-picker" v-if="!isPreview && showPicker">
    <div class="picker-header">选择传感器类型</div>
    <div class="picker-options">
      <div class="picker-option" @click="startPlaceSensor('temp')">
        <span class="picker-icon">🌡️</span>
        <span>温度</span>
      </div>
      <div class="picker-option" @click="startPlaceSensor('humidity')">
        <span class="picker-icon">💧</span>
        <span>湿度</span>
      </div>
      <div class="picker-option" @click="startPlaceSensor('gas')">
        <span class="picker-icon">💨</span>
        <span>气体</span>
      </div>
      <div class="picker-option" @click="startPlaceSensor('vibration')">
        <span class="picker-icon">📳</span>
        <span>振动</span>
      </div>
    </div>
    <button class="picker-close" @click="showPicker = false">✕</button>
  </div>

  <div class="sensor-editor-panel" v-if="!isPreview && showEditor">
    <div class="editor-header">
      <span>📡 传感器编辑</span>
      <button class="editor-close" @click="closeEditor">✕</button>
    </div>
    <div class="editor-body">
      <div class="editor-item">
        <label>ID</label>
        <input type="text" v-model="editingSensorId" class="editor-input" placeholder="如：SENSOR-T-001" />
      </div>
      <div class="editor-item">
        <label>类型</label>
        <select v-model="editingSensorType" class="editor-input">
          <option value="temp">🌡️ 温度</option>
          <option value="humidity">💧 湿度</option>
          <option value="gas">💨 气体</option>
          <option value="vibration">📳 振动</option>
        </select>
      </div>
      <div class="editor-item">
        <label>所属建筑</label>
        <input v-model="editingSensorBuilding" placeholder="如：办公楼B" class="editor-input" />
      </div>
      <div class="editor-item">
        <label>X / Y / Z</label>
        <div class="editor-xyz">
          <input type="number" v-model.number="editingSensorPos.x" step="0.1" class="editor-xyz-input" />
          <input type="number" v-model.number="editingSensorPos.y" step="0.1" class="editor-xyz-input" />
          <input type="number" v-model.number="editingSensorPos.z" step="0.1" class="editor-xyz-input" />
        </div>
      </div>
      <div class="editor-item">
        <label>旋转 Rx / Ry / Rz</label>
        <div class="editor-xyz">
          <input type="number" v-model.number="editingSensorPos.rx" step="0.01" class="editor-xyz-input" />
          <input type="number" v-model.number="editingSensorPos.ry" step="0.01" class="editor-xyz-input" />
          <input type="number" v-model.number="editingSensorPos.rz" step="0.01" class="editor-xyz-input" />
        </div>
      </div>
    </div>
    <div class="editor-footer">
      <button class="editor-btn-save" @click="confirmSaveSensor">确认保存</button>
      <button class="editor-btn-delete" @click="confirmDeleteSensor">删除</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  scene: { type: Object, required: true },
  sensorGroups: { type: Array, required: true },
  allBuildingGroups: { type: Array, required: true },
  sensorGroupMap: { type: Object, required: true },
  createSensorModel: { type: Function, required: true },
  sceneId: { type: String, required: true },
  sceneConfig: { type: Object, required: true },
  saveSceneState: { type: Function, required: true },
  selectBuilding: { type: Function, required: true },
  isPreview: { type: Boolean, default: false },
})

const emit = defineEmits(['sensor-changed'])

const showPicker = ref(false)
const showEditor = ref(false)
const editingSensor = ref(null)
const editingSensorId = ref('')
const editingSensorPos = ref({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 })
const editingSensorType = ref('temp')
const editingSensorBuilding = ref('')
const isPlacingSensor = ref(false)
const placingSensorType = ref('temp')

let sensorIdCounter = 5

function togglePicker() {
  showPicker.value = !showPicker.value
}

function startPlaceSensor(type) {
  showPicker.value = false
  isPlacingSensor.value = true
  placingSensorType.value = type
  const typeNames = { temp: '温度', humidity: '湿度', gas: '气体', vibration: '振动' }
  console.log(`📡 进入放置模式: ${typeNames[type]} | 点击场景放置 | 按 Esc 取消`)
}

function placeSensor(point, buildingLabel) {
  const sensorColors = { temp: 0xff6633, humidity: 0x3399ff, gas: 0xffcc00, vibration: 0xcc44cc }
  const typeAbbr = { temp: 'T', humidity: 'H', gas: 'G', vibration: 'V', pressure: 'P' }
  const abbr = typeAbbr[placingSensorType.value] || 'X'

  const existingIds = props.allBuildingGroups
    .filter(g => g.name && (g.name.startsWith('sensor_') || g.name.startsWith('SENSOR-')))
    .map(g => g.userData.sensorId || '')
  let nextNum = 1
  while (existingIds.includes(`SENSOR-${abbr}-${String(nextNum).padStart(3, '0')}`)) nextNum++
  const newId = `SENSOR-${abbr}-${String(nextNum).padStart(3, '0')}`

  const s = props.createSensorModel(placingSensorType.value, sensorColors[placingSensorType.value])
  s.name = `sensor_${newId}`
  s.position.copy(point)
  s.scale.set(1.0, 1.0, 1.0)
  s.userData.sensorType = placingSensorType.value
  s.userData.sensorId = newId
  s.userData.value = 0
  s.userData.buildingLabel = buildingLabel || ''

  props.scene.add(s)
  props.allBuildingGroups.push(s)
  props.sensorGroups.push(s)
  props.sensorGroupMap[newId] = s
  props.selectBuilding(s)
  props.saveSceneState(true)
  isPlacingSensor.value = false
  openEditor(s)
}

function closeEditor() {
  showEditor.value = false
  editingSensor.value = null
}

async function confirmSaveSensor() {
  if (!editingSensor.value) return
  const sensorName = editingSensor.value
  const newSensorId = editingSensorId.value || sensorName.replace('sensor_', '')
  const group = props.sensorGroups.find(g => g.name === sensorName)
  if (group) {
    group.position.set(editingSensorPos.value.x, editingSensorPos.value.y, editingSensorPos.value.z)
    group.rotation.set(editingSensorPos.value.rx, editingSensorPos.value.ry, editingSensorPos.value.rz)
    group.userData.sensorType = editingSensorType.value
    const oldSensorId = group.userData.sensorId
    group.userData.sensorId = newSensorId
    if (oldSensorId && oldSensorId !== newSensorId) {
      delete props.sensorGroupMap[oldSensorId]
    }
    props.sensorGroupMap[newSensorId] = group
  }
  const body = {
    sensorId: newSensorId,
    sceneId: props.sceneId,
    sensorType: editingSensorType.value,
    buildingLabel: editingSensorBuilding.value || null,
    x: editingSensorPos.value.x,
    y: editingSensorPos.value.y,
    z: editingSensorPos.value.z,
    rx: editingSensorPos.value.rx,
    ry: editingSensorPos.value.ry,
    rz: editingSensorPos.value.rz,
  }
  try {
    const res = await fetch('/api/sensors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      props.saveSceneState(true)
      console.log('✅ 传感器已保存到数据库:', newSensorId)
    } else {
      console.error('❌ 保存失败', await res.text())
    }
  } catch (e) {
    console.error('❌ 保存异常', e)
  }
  showEditor.value = false
  editingSensor.value = null
  emit('sensor-changed')
}

async function confirmDeleteSensor() {
  if (!editingSensor.value) return
  const sensorId = editingSensor.value
  const idx = props.sensorGroups.findIndex(g => g.name === sensorId)
  if (idx >= 0) {
    const group = props.sensorGroups[idx]
    props.scene.remove(group)
    props.sensorGroups.splice(idx, 1)
    const allIdx = props.allBuildingGroups.findIndex(g => g.name === sensorId)
    if (allIdx >= 0) props.allBuildingGroups.splice(allIdx, 1)
  }
  try {
    await fetch(`/api/sensors/${sensorId}`, { method: 'DELETE' })
    console.log('🗑️ 传感器已从数据库删除:', sensorId)
  } catch (e) {
    console.error('❌ 删除异常', e)
  }
  props.saveSceneState(true)
  showEditor.value = false
  editingSensor.value = null
  emit('sensor-changed')
}

function openEditor(sensorGroup) {
  editingSensor.value = sensorGroup.name
  editingSensorId.value = sensorGroup.userData.sensorId || sensorGroup.name.replace('sensor_', '')
  editingSensorType.value = sensorGroup.userData.sensorType || 'temp'
  editingSensorBuilding.value = sensorGroup.userData.buildingLabel || ''
  editingSensorPos.value = {
    x: parseFloat(sensorGroup.position.x.toFixed(1)),
    y: parseFloat(sensorGroup.position.y.toFixed(1)),
    z: parseFloat(sensorGroup.position.z.toFixed(1)),
    rx: parseFloat(sensorGroup.rotation.x.toFixed(2)),
    ry: parseFloat(sensorGroup.rotation.y.toFixed(2)),
    rz: parseFloat(sensorGroup.rotation.z.toFixed(2)),
  }
  showEditor.value = true
}

defineExpose({
  isPlacingSensor,
  placingSensorType,
  togglePicker,
  placeSensor,
  openEditor,
})
</script>

<style scoped>
.sensor-type-picker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(30, 58, 138, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 165, 250, 0.4);
  border-radius: 16px;
  padding: 24px;
  z-index: 200;
  min-width: 280px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.picker-header {
  font-size: 18px;
  font-weight: 600;
  color: #93c5fd;
  margin-bottom: 16px;
  text-align: center;
}

.picker-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.picker-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 18px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  transition: all 0.2s;
  font-size: 14px;
}

.picker-option:hover {
  background: rgba(96, 165, 250, 0.2);
  border-color: rgba(96, 165, 250, 0.5);
  transform: scale(1.05);
}

.picker-icon {
  font-size: 24px;
}

.picker-close {
  margin-top: 16px;
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.picker-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
}

.sensor-editor-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(30, 58, 138, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 165, 250, 0.4);
  border-radius: 16px;
  padding: 24px;
  z-index: 200;
  min-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
  color: #93c5fd;
}

.editor-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.editor-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.editor-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.editor-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editor-item label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.editor-input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.editor-input:focus {
  border-color: rgba(96, 165, 250, 0.5);
}

.editor-input[readonly] {
  opacity: 0.6;
}

.editor-xyz {
  display: flex;
  gap: 8px;
}

.editor-xyz-input {
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  text-align: center;
  transition: border-color 0.2s;
}

.editor-xyz-input:focus {
  border-color: rgba(96, 165, 250, 0.5);
}

.editor-footer {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.editor-btn-save {
  flex: 1;
  padding: 10px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  color: #4ade80;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.editor-btn-save:hover {
  background: rgba(34, 197, 94, 0.35);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
}

.editor-btn-delete {
  flex: 1;
  padding: 10px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #f87171;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.editor-btn-delete:hover {
  background: rgba(239, 68, 68, 0.35);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
}
</style>