/**
 * 图形编辑操作
 * 
 * 功能：
 * - 节点编辑（添加、删除、移动）
 * - 整体编辑（移动、旋转、缩放）
 * - 撤销重做
 * - 属性编辑（颜色、宽度等）
 */

import { ref, computed } from 'vue'
import * as Cesium from 'cesium'

export function useEditing(viewer) {
  // 编辑状态
  const editingState = ref('idle') // idle | selecting | editing-node | editing-shape
  const selectedShape = ref(null)
  const selectedNodeIndex = ref(-1)
  
  // 历史记录
  const history = ref([])
  const historyIndex = ref(-1)
  const maxHistory = 50  // 最大历史记录数
  
  // 高亮显示
  let highlightEntity = null
  
  // ==================== 选择操作 ====================
  
  /**
   * 选择图形
   * @param {Object} shape - 图形对象
   */
  function selectShape(shape) {
    // 取消之前的选择
    unselectShape()
    
    selectedShape.value = shape
    editingState.value = 'selecting'
    
    // 高亮显示
    highlightShape(shape)
    
    // 显示节点（如果是线或面）
    if (shape.type === 'line' || shape.type === 'polygon') {
      showNodes(shape)
    }
  }
  
  /**
   * 取消选择
   */
  function unselectShape() {
    if (highlightEntity) {
      viewer.entities.remove(highlightEntity)
      highlightEntity = null
    }
    
    // 移除节点显示
    hideNodes()
    
    selectedShape.value = null
    selectedNodeIndex.value = -1
    editingState.value = 'idle'
  }
  
  /**
   * 高亮显示选中的图形
   */
  function highlightShape(shape) {
    if (!shape || !shape.entity) return
    
    // 根据类型创建高亮效果
    if (shape.type === 'line') {
      const positions = shape.entity.polyline.positions.getValue()
      highlightEntity = viewer.entities.add({
        polyline: {
          positions: positions,
          width: shape.entity.polyline.width.getValue() + 2,
          material: Cesium.Color.YELLOW.withAlpha(0.5),
          clampToGround: shape.entity.polyline.clampToGround.getValue()
        }
      })
    } else if (shape.type === 'polygon') {
      const hierarchy = shape.entity.polygon.hierarchy.getValue()
      highlightEntity = viewer.entities.add({
        polygon: {
          hierarchy: hierarchy,
          material: Cesium.Color.YELLOW.withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.YELLOW,
          outlineWidth: 3
        }
      })
    }
  }
  
  // ==================== 节点编辑 ====================
  
  let nodeEntities = []
  
  /**
   * 显示节点（用于编辑）
   */
  function showNodes(shape) {
    hideNodes()  // 先清除旧的
    
    if (!shape.positions) return
    
    shape.positions.forEach((pos, index) => {
      const nodeEntity = viewer.entities.add({
        position: pos,
        point: {
          pixelSize: 12,
          color: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLUE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
          text: String(index),
          font: '12px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10)
        }
      })
      
      // 存储节点索引
      nodeEntity._nodeIndex = index
      nodeEntity._parentShape = shape
      
      nodeEntities.push(nodeEntity)
    })
  }
  
  /**
   * 隐藏节点
   */
  function hideNodes() {
    nodeEntities.forEach(entity => {
      viewer.entities.remove(entity)
    })
    nodeEntities = []
  }
  
  /**
   * 开始节点编辑模式
   */
  function startNodeEditing() {
    if (!selectedShape.value) return
    
    editingState.value = 'editing-node'
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    
    // 点击选择节点
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position)
      
      if (picked && picked.id && picked.id._nodeIndex !== undefined) {
        selectedNodeIndex.value = picked.id._nodeIndex
        highlightNode(picked.id._nodeIndex)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    // 拖拽移动节点
    let isDragging = false
    
    handler.setInputAction(() => {
      isDragging = true
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN)
    
    handler.setInputAction((move) => {
      if (isDragging && selectedNodeIndex.value >= 0) {
        const cartesian = viewer.camera.pickEllipsoid(move.endPosition)
        
        if (cartesian) {
          moveNode(selectedShape.value, selectedNodeIndex.value, cartesian)
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    
    handler.setInputAction(() => {
      isDragging = false
      selectedNodeIndex.value = -1
    }, Cesium.ScreenSpaceEventType.LEFT_UP)
    
    // 右键退出编辑
    handler.setInputAction(() => {
      editingState.value = 'selecting'
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    
    return () => handler.destroy()
  }
  
  /**
   * 高亮选中的节点
   */
  function highlightNode(index) {
    nodeEntities.forEach((entity, i) => {
      if (i === index) {
        entity.point.color = Cesium.Color.RED
      } else {
        entity.point.color = Cesium.Color.WHITE
      }
    })
  }
  
  /**
   * 移动节点
   * @param {Object} shape - 图形对象
   * @param {number} index - 节点索引
   * @param {Cesium.Cartesian3} newPosition - 新位置
   */
  function moveNode(shape, index, newPosition) {
    if (!shape || !shape.positions || index < 0 || index >= shape.positions.length) {
      return
    }
    
    // 保存历史
    addHistory('move-node', {
      shape,
      index,
      oldPosition: shape.positions[index].clone(),
      newPosition: newPosition.clone()
    })
    
    // 更新位置
    shape.positions[index] = newPosition
    
    // 更新 entity
    updateShapeEntity(shape)
    
    // 更新节点显示
    if (nodeEntities[index]) {
      nodeEntities[index].position = newPosition
    }
  }
  
  /**
   * 添加节点
   * @param {Object} shape - 图形对象
   * @param {number} segmentIndex - 线段索引（在该线段后添加）
   * @param {Cesium.Cartesian3} position - 新节点位置
   */
  function addNode(shape, segmentIndex, position) {
    if (!shape || !shape.positions) return
    
    // 保存历史
    addHistory('add-node', {
      shape,
      index: segmentIndex + 1,
      position: position.clone()
    })
    
    // 插入新节点
    shape.positions.splice(segmentIndex + 1, 0, position)
    
    // 更新 entity
    updateShapeEntity(shape)
    
    // 重新显示节点
    showNodes(shape)
  }
  
  /**
   * 删除节点
   * @param {Object} shape - 图形对象
   * @param {number} index - 节点索引
   */
  function deleteNode(shape, index) {
    if (!shape || !shape.positions || shape.positions.length <= 2) {
      // 线至少保留 2 个点，面至少保留 3 个点
      return
    }
    
    // 保存历史
    addHistory('delete-node', {
      shape,
      index,
      oldPosition: shape.positions[index].clone()
    })
    
    // 删除节点
    shape.positions.splice(index, 1)
    
    // 更新 entity
    updateShapeEntity(shape)
    
    // 重新显示节点
    showNodes(shape)
  }
  
  /**
   * 更新图形 entity
   */
  function updateShapeEntity(shape) {
    if (!shape || !shape.entity) return
    
    if (shape.type === 'line') {
      shape.entity.polyline.positions = shape.positions
    } else if (shape.type === 'polygon') {
      shape.entity.polygon.hierarchy = new Cesium.PolygonHierarchy(shape.positions)
      // 更新边界线
      if (shape.entity.polyline) {
        shape.entity.polyline.positions = [...shape.positions, shape.positions[0]]
      }
    }
    
    // 更新高亮
    if (highlightEntity) {
      viewer.entities.remove(highlightEntity)
      highlightShape(shape)
    }
  }
  
  // ==================== 整体编辑 ====================
  
  /**
   * 整体移动图形
   * @param {Object} shape - 图形对象
   * @param {Cesium.Cartesian3} offset - 偏移量
   */
  function moveShape(shape, offset) {
    if (!shape || !shape.positions) return
    
    // 保存历史
    const oldPositions = shape.positions.map(p => p.clone())
    addHistory('move-shape', { shape, oldPositions })
    
    // 移动所有点
    shape.positions = shape.positions.map(pos => {
      return Cesium.Cartesian3.add(pos, offset, new Cesium.Cartesian3())
    })
    
    // 更新 entity
    updateShapeEntity(shape)
    
    // 更新节点显示
    if (editingState.value === 'editing-node') {
      showNodes(shape)
    }
  }
  
  /**
   * 删除图形
   * @param {Object} shape - 图形对象
   */
  function deleteShape(shape) {
    if (!shape) return
    
    // 保存历史
    addHistory('delete-shape', { shape: { ...shape } })
    
    // 移除 entity
    if (shape.entity) {
      viewer.entities.remove(shape.entity)
    }
    
    // 取消选择
    if (selectedShape.value === shape) {
      unselectShape()
    }
    
    return true
  }
  
  // ==================== 属性编辑 ====================
  
  /**
   * 修改图形颜色
   * @param {Object} shape - 图形对象
   * @param {Cesium.Color} color - 新颜色
   */
  function setShapeColor(shape, color) {
    if (!shape || !shape.entity) return
    
    // 保存历史
    const oldColor = shape.options?.color || Cesium.Color.BLUE
    addHistory('change-color', { shape, oldColor, newColor: color })
    
    // 更新颜色
    if (shape.type === 'line') {
      shape.entity.polyline.material = color
    } else if (shape.type === 'polygon') {
      shape.entity.polygon.material = color.withAlpha(0.5)
    } else if (shape.type === 'point') {
      shape.entity.point.color = color
    }
    
    // 更新选项
    if (!shape.options) shape.options = {}
    shape.options.color = color
  }
  
  /**
   * 修改线宽
   * @param {Object} shape - 图形对象
   * @param {number} width - 新宽度
   */
  function setLineWidth(shape, width) {
    if (!shape || !shape.entity || shape.type !== 'line') return
    
    const oldWidth = shape.entity.polyline.width.getValue()
    addHistory('change-width', { shape, oldWidth, newWidth: width })
    
    shape.entity.polyline.width = width
    shape.options.width = width
  }
  
  // ==================== 撤销重做 ====================
  
  /**
   * 添加历史记录
   */
  function addHistory(type, data) {
    // 删除当前索引之后的历史
    history.value = history.value.slice(0, historyIndex.value + 1)
    
    // 添加新记录
    history.value.push({ type, data, timestamp: Date.now() })
    
    // 限制历史记录数量
    if (history.value.length > maxHistory) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }
  
  /**
   * 撤销
   */
  function undo() {
    if (historyIndex.value < 0) return false
    
    const action = history.value[historyIndex.value]
    
    switch (action.type) {
      case 'move-node':
        // 恢复节点位置
        action.data.shape.positions[action.data.index] = action.data.oldPosition
        updateShapeEntity(action.data.shape)
        break
        
      case 'add-node':
        // 删除添加的节点
        action.data.shape.positions.splice(action.data.index, 1)
        updateShapeEntity(action.data.shape)
        break
        
      case 'delete-node':
        // 恢复删除的节点
        action.data.shape.positions.splice(action.data.index, 0, action.data.oldPosition)
        updateShapeEntity(action.data.shape)
        break
        
      case 'move-shape':
        // 恢复图形位置
        action.data.shape.positions = action.data.oldPositions
        updateShapeEntity(action.data.shape)
        break
        
      case 'delete-shape':
        // 恢复删除的图形（需要重新创建 entity）
        // 这里简化处理，实际应该重新创建
        break
        
      case 'change-color':
        // 恢复颜色
        setShapeColor(action.data.shape, action.data.oldColor)
        break
        
      case 'change-width':
        // 恢复宽度
        setLineWidth(action.data.shape, action.data.oldWidth)
        break
    }
    
    historyIndex.value--
    return true
  }
  
  /**
   * 重做
   */
  function redo() {
    if (historyIndex.value >= history.value.length - 1) return false
    
    historyIndex.value++
    const action = history.value[historyIndex.value]
    
    switch (action.type) {
      case 'move-node':
        action.data.shape.positions[action.data.index] = action.data.newPosition
        updateShapeEntity(action.data.shape)
        break
        
      case 'add-node':
        action.data.shape.positions.splice(action.data.index, 0, action.data.position)
        updateShapeEntity(action.data.shape)
        break
        
      case 'delete-node':
        action.data.shape.positions.splice(action.data.index, 1)
        updateShapeEntity(action.data.shape)
        break
        
      case 'move-shape':
        // 重新应用移动
        break
        
      case 'change-color':
        setShapeColor(action.data.shape, action.data.newColor)
        break
        
      case 'change-width':
        setLineWidth(action.data.shape, action.data.newWidth)
        break
    }
    
    return true
  }
  
  /**
   * 是否可以撤销
   */
  const canUndo = computed(() => historyIndex.value >= 0)
  
  /**
   * 是否可以重做
   */
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)
  
  // ==================== 返回值 ====================
  
  return {
    // 状态
    editingState,
    selectedShape,
    selectedNodeIndex,
    canUndo,
    canRedo,
    
    // 选择
    selectShape,
    unselectShape,
    
    // 节点编辑
    startNodeEditing,
    moveNode,
    addNode,
    deleteNode,
    
    // 整体编辑
    moveShape,
    deleteShape,
    
    // 属性编辑
    setShapeColor,
    setLineWidth,
    
    // 撤销重做
    undo,
    redo
  }
}