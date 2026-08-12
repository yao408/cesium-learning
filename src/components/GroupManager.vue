<template>
  <div class="group-manager" :class="{ expanded: isExpanded }">
    <div class="manager-header" @click="isExpanded = !isExpanded">
      <span class="manager-icon">📦</span>
      <span class="manager-title">Group 管理器</span>
      <span class="group-count">{{ groups.length }}</span>
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
    </div>

    <div v-if="isExpanded" class="manager-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <button @click="refreshGroups" class="tool-btn" title="刷新列表">
          🔄
        </button>
        <button @click="showCreateDialog = true" class="tool-btn primary" title="新建 Group">
          ➕
        </button>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索 Group..."
          class="search-input"
        />
      </div>

      <!-- Group 列表 -->
      <div class="group-list">
        <div
          v-for="group in filteredGroups"
          :key="group.uuid"
          class="group-item"
          :class="{ selected: selectedGroup === group, hidden: !group.visible }"
        >
          <div class="item-header" @click="selectGroup(group)">
            <button
              @click.stop="toggleVisibility(group)"
              class="visibility-btn"
              :title="group.visible ? '隐藏' : '显示'"
            >
              {{ group.visible ? '👁️' : '🚫' }}
            </button>
            <span class="item-name" :title="group.name || '(未命名)'">
              {{ group.name || '(未命名)' }}
            </span>
            <span class="item-children">
              {{ getChildrenCount(group) }} 对象
            </span>
            <button
              @click.stop="expandGroup(group)"
              class="expand-btn"
              :title="expandedGroups.has(group) ? '收起' : '展开'"
            >
              {{ expandedGroups.has(group) ? '▼' : '▶' }}
            </button>
          </div>

          <!-- 子对象列表 -->
          <div v-if="expandedGroups.has(group)" class="children-list">
            <div
              v-for="(child, idx) in group.children"
              :key="child.uuid"
              class="child-item"
              :class="{ hidden: !child.visible }"
            >
              <button
                @click.stop="toggleChildVisibility(child)"
                class="visibility-btn small"
                :title="child.visible ? '隐藏' : '显示'"
              >
                {{ child.visible ? '👁️' : '🚫' }}
              </button>
              <span class="child-type">{{ getTypeIcon(child.type) }}</span>
              <span class="child-name" :title="child.name || child.type">
                {{ child.name || child.type }}{{ idx + 1 }}
              </span>
              <button
                @click.stop="removeChildFromGroup(group, child)"
                class="remove-btn"
                title="从 Group 移除"
              >
                ✕
              </button>
            </div>

            <!-- 添加子对象按钮 -->
            <div class="add-child-section">
              <select v-model="selectedObjectToAdd[group.uuid]" class="object-select">
                <option value="">添加对象到该 Group...</option>
                <option
                  v-for="obj in getAvailableObjects()"
                  :key="obj.uuid"
                  :value="obj.uuid"
                >
                  {{ obj.name || obj.type }}
                </option>
              </select>
              <button
                @click="addChildToGroup(group)"
                class="add-btn"
                :disabled="!selectedObjectToAdd[group.uuid]"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredGroups.length === 0" class="empty-state">
          <p>😢 未找到匹配的 Group</p>
          <p class="hint">{{ searchQuery ? '尝试其他关键词' : '点击 ➕ 创建新 Group' }}</p>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-bar">
        <span>总计: {{ groups.length }} 个 Group</span>
        <span>可见: {{ visibleCount }}</span>
        <span>隐藏: {{ groups.length - visibleCount }}</span>
      </div>
    </div>

    <!-- 新建 Group 对话框 -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
      <div class="dialog">
        <h3>➕ 新建 Group</h3>
        <input
          v-model="newGroupName"
          type="text"
          placeholder="输入 Group 名称..."
          class="dialog-input"
          @keyup.enter="createGroup"
        />
        <div class="dialog-actions">
          <button @click="showCreateDialog = false" class="cancel-btn">取消</button>
          <button @click="createGroup" class="confirm-btn" :disabled="!newGroupName.trim()">
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  scene: { type: Object, required: true }
})

const isExpanded = ref(false)
const searchQuery = ref('')
const showCreateDialog = ref(false)
const newGroupName = ref('')
const selectedGroup = ref(null)
const expandedGroups = new Set()
const selectedObjectToAdd = ref({})

const groups = ref([])

const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) return groups.value

  const query = searchQuery.value.toLowerCase()
  return groups.value.filter(group =>
    (group.name && group.name.toLowerCase().includes(query)) ||
    group.type.toLowerCase().includes(query) ||
    group.children.some(child =>
      (child.name && child.name.toLowerCase().includes(query)) ||
      child.type.toLowerCase().includes(query)
    )
  )
})

const visibleCount = computed(() => {
  return groups.value.filter(g => g.visible).length
})

function refreshGroups() {
  if (!props.scene) return

  groups.value = []
  props.scene.traverse((child) => {
    if (child.isGroup && child !== props.scene) {
      groups.value.push(child)
    }
  })

  console.log(`📦 已刷新 Group 列表，共 ${groups.value.length} 个`)
}

function selectGroup(group) {
  selectedGroup.value = group

  if (props.scene) {
    const outlinePass = props.scene?.outlinePass
    if (outlinePass) {
      outlinePass.selectedObjects = [group]
    }
  }

  console.log('✅ 已选中 Group:', group.name || group.uuid)
}

function toggleVisibility(group) {
  group.visible = !group.visible
  console.log(`${group.visible ? '👁️ 显示' : '🚫 隐藏'} Group:`, group.name || group.uuid)
}

function expandGroup(group) {
  if (expandedGroups.has(group)) {
    expandedGroups.delete(group)
  } else {
    expandedGroups.add(group)
  }
}

function getChildrenCount(group) {
  return group.children.length
}

function getTypeIcon(type) {
  const icons = {
    'Mesh': '🔷',
    'Group': '📦',
    'Light': '💡',
    'Camera': '📷',
    'Points': '⭐',
    'Line': '📏',
    'Sprite': '🎨',
    'Bone': '🦴'
  }
  return icons[type] || '❓'
}

function toggleChildVisibility(child) {
  child.visible = !child.visible
  console.log(`${child.visible ? '👁️ 显示' : '🚫 隐藏'} 对象:`, child.name || child.type)
}

function removeChildFromGroup(group, child) {
  group.remove(child)
  props.scene.add(child)

  console.log('✕ 已从 Group 移除:', child.name || child.type, '←', group.name || 'Group')
}

function getAvailableObjects() {
  if (!props.scene) return []

  const available = []
  props.scene.traverse((child) => {
    if (
      child.isMesh ||
      child.isLight ||
      child.isSprite ||
      child.isPoints
    ) {
      if (!child.parent || child.parent === props.scene || !child.parent.isGroup) {
        available.push(child)
      }
    }
  })

  return available
}

function addChildToGroup(group) {
  const objectUuid = selectedObjectToAdd.value[group.uuid]
  if (!objectUuid) return

  let objectToAdd = null
  props.scene.traverse((child) => {
    if (child.uuid === objectUuid) {
      objectToAdd = child
    }
  })

  if (objectToAdd && group) {
    if (objectToAdd.parent) {
      objectToAdd.parent.remove(objectToAdd)
    }

    group.add(objectToAdd)
    console.log('➕ 已添加到 Group:', objectToAdd.name || objectToAdd.type, '→', group.name || 'Group')

    selectedObjectToAdd.value[group.uuid] = ''
  }
}

function createGroup() {
  if (!newGroupName.value.trim()) return

  const newGroup = new THREE.Group()
  newGroup.name = newGroupName.value.trim()

  props.scene.add(newGroup)
  refreshGroups()

  console.log('✅ 已创建新 Group:', newGroup.name)

  newGroupName.value = ''
  showCreateDialog.value = false
}

onMounted(() => {
  refreshGroups()
})
</script>

<style scoped>
.group-manager {
  background: transparent;
  border: none;
  backdrop-filter: none;
  border-radius: 0;
  width: 100%;
  font-size: 12px;
  color: #cbd5e1;
  box-shadow: none;
  display: flex;
  flex-direction: column;
}

.manager-header {
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(74, 144, 255, 0.15);
}

.manager-header:hover {
  background: rgba(74, 144, 255, 0.08);
}

.manager-icon {
  font-size: 16px;
}

.manager-title {
  flex: 1;
  font-weight: 600;
  font-size: 13px;
  color: #e2e8f0;
}

.group-count {
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
  font-family: 'Consolas', monospace;
}

.toggle-icon {
  font-size: 10px;
  color: #94a3b8;
}

.manager-content {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}

.toolbar {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  align-items: center;
}

.tool-btn {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(74, 144, 255, 0.25);
  background: rgba(74, 144, 255, 0.08);
  color: #60a5fa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  background: rgba(74, 144, 255, 0.18);
  transform: translateY(-1px);
}

.tool-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-color: transparent;
  color: white;
}

.search-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid rgba(74, 144, 255, 0.2);
  background: rgba(0, 0, 0, 0.3);
  color: #e2e8f0;
  border-radius: 4px;
  font-size: 11.5px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-item {
  border: 1px solid rgba(74, 144, 255, 0.12);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  overflow: hidden;
}

.group-item:hover {
  border-color: rgba(74, 144, 255, 0.3);
  background: rgba(74, 144, 255, 0.05);
}

.group-item.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
}

.group-item.hidden {
  opacity: 0.5;
}

.item-header {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.visibility-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  opacity: 0.7;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
}

.visibility-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}

.visibility-btn.small {
  width: 18px;
  height: 18px;
  font-size: 11px;
}

.item-name {
  flex: 1;
  font-weight: 500;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-children {
  font-size: 10.5px;
  color: #94a3b8;
  padding: 0 8px;
}

.expand-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 9px;
  transition: all 0.2s;
}

.expand-btn:hover {
  color: #60a5fa;
}

.children-list {
  border-top: 1px solid rgba(74, 144, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  padding: 6px;
  display:游离;
  flex-direction: column;
  gap: 3px;
}

.child-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
  font-size: 11px;
  transition: all 0.2s;
}

.child-item:hover {
  background: rgba(74, 144, 255, 0.08);
}

.child-item.hidden {
  opacity: 0.45;
  text-decoration: line-through;
}

.child-type {
  font-size: 13px;
}

.child-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #cbd5e1;
}

.remove-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  font-size: 11px;
  opacity: 0;
  transition: all 0.2s;
  border-radius: 3px;
}

.child-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.15);
}

.add-child-section {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed rgba(74, 144, 255, 0.2);
}

.object-select {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid rgba(74, 144, 255, 0.2);
  background: rgba(0, 0, 0, 0.3);
  color: #e2e8f0;
  border-radius: 3px;
  font-size: 10.5px;
  outline: none;
}

.add-btn {
  padding: 4px 10px;
  border: 1px solid rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10.5px;
  font-weight: 600;
  transition: all 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.2);
}

.add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 24px 16px;
  color: #94a3b8;
}

.empty-state p {
  margin: 4px 0;
}

.empty-state .hint {
  font-size: 11px;
  color: #64748b;
}

.stats-bar {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(74, 144, 255, 0.15);
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: #64748b;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(74, 144, 255, 0.3);
  border-radius: 8px;
  padding: 20px;
  min-width: 320px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}

.dialog h3 {
  margin: 0 0 14px;
  font-size: 15px;
  color: #e2e8f0;
}

.dialog-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(74, 144, 255, 0.25);
  background: rgba(0, 0, 0, 0.4);
  color: #e2e8f0;
  border-radius: 5px;
  font-size: 13px;
  outline: none;
  margin-bottom: 14px;
  box-sizing: border-box;
}

.dialog-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 600;
  transition: all 0.2s;
}

.cancel-btn {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.cancel-btn:hover {
  background: rgba(148, 163, 184, 0.25);
}

.confirm-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>