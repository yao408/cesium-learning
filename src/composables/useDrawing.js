/**
 * 图形绘制核心逻辑
 * 
 * 功能：
 * - 点、线、面、圆的绘制
 * - 绘制状态管理（开始、进行中、完成）
 * - 与 Cesium 实体联动
 * - 支持 2D 和 3D 绘制
 */

import { ref, computed } from 'vue'
import * as Cesium from 'cesium'

export function useDrawing(viewer) {
  // 绘制状态
  const drawingState = ref('idle') // idle | drawing | editing
  const currentShape = ref(null)   // point | line | polygon | circle | rectangle
  const currentEntity = ref(null)  // 当前绘制的 Cesium 实体
  const tempPositions = ref([])    // 临时坐标点
  
  // 所有绘制的图形
  const drawnShapes = ref([])
  
  // 历史记录（用于撤销重做）
  const history = ref([])
  const historyIndex = ref(-1)
  
  // ==================== 2D 绘制 ====================
  
  /**
   * 开始绘制点
   */
  function startDrawPoint(options = {}) {
    const { color = Cesium.Color.RED, pixelSize = 10, clampToGround = true } = options
    
    drawingState.value = 'drawing'
    currentShape.value = 'point'
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    
    handler.setInputAction((click) => {
      let cartesian
      
      if (clampToGround) {
        // 贴地
        const ray = viewer.camera.getPickRay(click.position)
        cartesian = viewer.scene.globe.pick(ray, viewer.scene)
      } else {
        // 椭球面
        cartesian = viewer.camera.pickEllipsoid(click.position)
      }
      
      if (cartesian) {
        const entity = viewer.entities.add({
          position: cartesian,
          point: {
            pixelSize: pixelSize,
            color: color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: clampToGround 
              ? Cesium.HeightReference.CLAMP_TO_GROUND 
              : Cesium.HeightReference.NONE
          }
        })
        
        const shape = { 
          type: 'point', 
          entity,
          position: cartesian,
          options
        }
        
        drawnShapes.value.push(shape)
        addHistory('add', shape)
        
        drawingState.value = 'idle'
        handler.destroy()
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    // 右键取消
    handler.setInputAction(() => {
      drawingState.value = 'idle'
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    
    return () => handler.destroy()
  }
  
  /**
   * 开始绘制线
   */
  function startDrawLine(options = {}) {
    const { 
      color = Cesium.Color.BLUE, 
      width = 3, 
      clampToGround = true,
      showDistance = false 
    } = options
    
    drawingState.value = 'drawing'
    currentShape.value = 'line'
    tempPositions.value = []
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    
    // 左键添加点
    handler.setInputAction((click) => {
      let cartesian
      
      if (clampToGround) {
        const ray = viewer.camera.getPickRay(click.position)
        cartesian = viewer.scene.globe.pick(ray, viewer.scene)
      } else {
        cartesian = viewer.camera.pickEllipsoid(click.position)
      }
      
      if (cartesian) {
        tempPositions.value.push(cartesian)
        updateTempLine({ color, width, clampToGround })
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    // 移动时更新临时线
    handler.setInputAction((move) => {
      if (tempPositions.value.length > 0) {
        let cartesian
        
        if (clampToGround) {
          const ray = viewer.camera.getPickRay(move.endPosition)
          cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        } else {
          cartesian = viewer.camera.pickEllipsoid(move.endPosition)
        }
        
        if (cartesian) {
          updateTempLine({ 
            color, 
            width, 
            clampToGround,
            positions: [...tempPositions.value, cartesian] 
          })
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    
    // 双击完成
    handler.setInputAction(() => {
      finishDrawLine({ color, width, clampToGround, showDistance })
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    
    // 右键取消
    handler.setInputAction(() => {
      if (currentEntity.value) {
        viewer.entities.remove(currentEntity.value)
        currentEntity.value = null
      }
      drawingState.value = 'idle'
      tempPositions.value = []
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    
    return () => handler.destroy()
  }
  
  /**
   * 开始绘制面
   */
  function startDrawPolygon(options = {}) {
    const { 
      color = Cesium.Color.CYAN, 
      outlineColor = Cesium.Color.BLUE,
      alpha = 0.5,
      clampToGround = true 
    } = options
    
    drawingState.value = 'drawing'
    currentShape.value = 'polygon'
    tempPositions.value = []
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    
    // 左键添加点
    handler.setInputAction((click) => {
      let cartesian
      
      if (clampToGround) {
        const ray = viewer.camera.getPickRay(click.position)
        cartesian = viewer.scene.globe.pick(ray, viewer.scene)
      } else {
        cartesian = viewer.camera.pickEllipsoid(click.position)
      }
      
      if (cartesian) {
        tempPositions.value.push(cartesian)
        updateTempPolygon({ color, outlineColor, alpha, clampToGround })
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    // 移动时更新临时面
    handler.setInputAction((move) => {
      if (tempPositions.value.length > 0) {
        let cartesian
        
        if (clampToGround) {
          const ray = viewer.camera.getPickRay(move.endPosition)
          cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        } else {
          cartesian = viewer.camera.pickEllipsoid(move.endPosition)
        }
        
        if (cartesian) {
          updateTempPolygon({ 
            color, 
            outlineColor, 
            alpha, 
            clampToGround,
            positions: [...tempPositions.value, cartesian] 
          })
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    
    // 双击完成
    handler.setInputAction(() => {
      finishDrawPolygon({ color, outlineColor, alpha, clampToGround })
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    
    // 右键取消
    handler.setInputAction(() => {
      if (currentEntity.value) {
        viewer.entities.remove(currentEntity.value)
        currentEntity.value = null
      }
      drawingState.value = 'idle'
      tempPositions.value = []
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    
    return () => handler.destroy()
  }
  
  /**
   * 开始绘制圆
   */
  function startDrawCircle(options = {}) {
    const { 
      color = Cesium.Color.YELLOW, 
      outlineColor = Cesium.Color.ORANGE,
      alpha = 0.3,
      clampToGround = true 
    } = options
    
    drawingState.value = 'drawing'
    currentShape.value = 'circle'
    
    let center = null
    let radiusEntity = null
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    
    // 第一次点击：确定圆心
    handler.setInputAction((click) => {
      let cartesian
      
      if (clampToGround) {
        const ray = viewer.camera.getPickRay(click.position)
        cartesian = viewer.scene.globe.pick(ray, viewer.scene)
      } else {
        cartesian = viewer.camera.pickEllipsoid(click.position)
      }
      
      if (cartesian && !center) {
        center = cartesian
        
        // 添加圆心标记
        viewer.entities.add({
          position: center,
          point: {
            pixelSize: 8,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          }
        })
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    // 移动时更新圆
    handler.setInputAction((move) => {
      if (center) {
        let cartesian
        
        if (clampToGround) {
          const ray = viewer.camera.getPickRay(move.endPosition)
          cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        } else {
          cartesian = viewer.camera.pickEllipsoid(move.endPosition)
        }
        
        if (cartesian) {
          const radius = Cesium.Cartesian3.distance(center, cartesian)
          
          if (radiusEntity) {
            viewer.entities.remove(radiusEntity)
          }
          
          radiusEntity = viewer.entities.add({
            position: center,
            ellipse: {
              semiMinorAxis: radius,
              semiMajorAxis: radius,
              material: color.withAlpha(alpha),
              outline: true,
              outlineColor: outlineColor,
              heightReference: clampToGround 
                ? Cesium.HeightReference.CLAMP_TO_GROUND 
                : Cesium.HeightReference.NONE
            }
          })
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    
    // 第二次点击：确定半径，完成绘制
    handler.setInputAction(() => {
      if (center && radiusEntity) {
        const shape = {
          type: 'circle',
          entity: radiusEntity,
          center,
          radius: radiusEntity.ellipse.semiMajorAxis.getValue(),
          options
        }
        
        drawnShapes.value.push(shape)
        addHistory('add', shape)
        
        drawingState.value = 'idle'
        center = null
        handler.destroy()
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    
    return () => handler.destroy()
  }
  
  // ==================== 3D 绘制 ====================
  
  /**
   * 开始绘制 3D 线（空中）
   */
  function startDraw3DLine(options = {}) {
    const { color = Cesium.Color.GREEN, width = 3 } = options
    
    drawingState.value = 'drawing'
    currentShape.value = '3dline'
    tempPositions.value = []
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    
    handler.setInputAction((click) => {
      // 3D 线不贴地，可以设置高度
      const cartesian = viewer.scene.pickPosition(click.position)
      
      if (cartesian) {
        tempPositions.value.push(cartesian)
        updateTempLine({ color, width, clampToGround: false })
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    handler.setInputAction((move) => {
      if (tempPositions.value.length > 0) {
        const cartesian = viewer.scene.pickPosition(move.endPosition)
        
        if (cartesian) {
          updateTempLine({ 
            color, 
            width, 
            clampToGround: false,
            positions: [...tempPositions.value, cartesian] 
          })
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    
    handler.setInputAction(() => {
      finishDrawLine({ color, width, clampToGround: false })
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    
    return () => handler.destroy()
  }
  
  /**
   * 开始绘制 3D 面（拉伸）
   */
  function startDrawExtrudedPolygon(options = {}) {
    const { 
      color = Cesium.Color.PURPLE, 
      outlineColor = Cesium.Color.WHITE,
      extrudedHeight = 100,  // 拉伸高度
      alpha = 0.6
    } = options
    
    drawingState.value = 'drawing'
    currentShape.value = 'extrudedPolygon'
    tempPositions.value = []
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    
    handler.setInputAction((click) => {
      const cartesian = viewer.scene.pickPosition(click.position)
      
      if (cartesian) {
        tempPositions.value.push(cartesian)
        updateTempExtrudedPolygon({ color, outlineColor, extrudedHeight, alpha })
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    handler.setInputAction((move) => {
      if (tempPositions.value.length > 0) {
        const cartesian = viewer.scene.pickPosition(move.endPosition)
        
        if (cartesian) {
          updateTempExtrudedPolygon({ 
            color, 
            outlineColor, 
            extrudedHeight, 
            alpha,
            positions: [...tempPositions.value, cartesian] 
          })
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    
    handler.setInputAction(() => {
      finishDrawExtrudedPolygon({ color, outlineColor, extrudedHeight, alpha })
      handler.destroy()
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    
    return () => handler.destroy()
  }
  
  // ==================== 编辑操作 ====================
  
  /**
   * 删除图形
   */
  function deleteShape(shape) {
    if (shape.entity) {
      viewer.entities.remove(shape.entity)
    }
    drawnShapes.value = drawnShapes.value.filter(s => s !== shape)
    addHistory('delete', shape)
  }
  
  /**
   * 清空所有图形
   */
  function clearAllShapes() {
    drawnShapes.value.forEach(shape => {
      if (shape.entity) {
        viewer.entities.remove(shape.entity)
      }
    })
    drawnShapes.value = []
    history.value = []
    historyIndex.value = -1
  }
  
  /**
   * 撤销
   */
  function undo() {
    if (historyIndex.value >= 0) {
      const action = history.value[historyIndex.value]
      
      if (action.type === 'add') {
        // 撤销添加 = 删除
        if (action.shape.entity) {
          viewer.entities.remove(action.shape.entity)
        }
        drawnShapes.value = drawnShapes.value.filter(s => s !== action.shape)
      } else if (action.type === 'delete') {
        // 撤销删除 = 添加回来
        // 需要重新创建 entity
      }
      
      historyIndex.value--
    }
  }
  
  /**
   * 重做
   */
  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      const action = history.value[historyIndex.value]
      
      if (action.type === 'add') {
        // 重做添加
        // 需要重新创建 entity
      }
    }
  }
  
  // ==================== 辅助函数 ====================
  
  function updateTempLine({ color, width, clampToGround, positions = tempPositions.value }) {
    if (currentEntity.value) {
      viewer.entities.remove(currentEntity.value)
    }
    
    if (positions.length >= 2) {
      currentEntity.value = viewer.entities.add({
        polyline: {
          positions: positions,
          width: width,
          material: color,
          clampToGround: clampToGround
        }
      })
    }
  }
  
  function updateTempPolygon({ color, outlineColor, alpha, clampToGround, positions = tempPositions.value }) {
    if (currentEntity.value) {
      viewer.entities.remove(currentEntity.value)
    }
    
    if (positions.length >= 3) {
      currentEntity.value = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: color.withAlpha(alpha),
          outline: true,
          outlineColor: outlineColor,
          heightReference: clampToGround 
            ? Cesium.HeightReference.CLAMP_TO_GROUND 
            : Cesium.HeightReference.NONE
        }
      })
    }
  }
  
  function updateTempExtrudedPolygon({ color, outlineColor, extrudedHeight, alpha, positions = tempPositions.value }) {
    if (currentEntity.value) {
      viewer.entities.remove(currentEntity.value)
    }
    
    if (positions.length >= 3) {
      currentEntity.value = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: color.withAlpha(alpha),
          outline: true,
          outlineColor: outlineColor,
          extrudedHeight: extrudedHeight,  // 拉伸高度
          closeTop: true,
          closeBottom: true
        }
      })
    }
  }
  
  function finishDrawLine({ color, width, clampToGround, showDistance }) {
    if (tempPositions.value.length >= 2) {
      const entity = viewer.entities.add({
        polyline: {
          positions: tempPositions.value,
          width: width,
          material: color,
          clampToGround: clampToGround
        }
      })
      
      const shape = {
        type: 'line',
        entity,
        positions: [...tempPositions.value],
        options: { color, width, clampToGround, showDistance }
      }
      
      drawnShapes.value.push(shape)
      addHistory('add', shape)
    }
    
    drawingState.value = 'idle'
    currentShape.value = null
    currentEntity.value = null
    tempPositions.value = []
  }
  
  function finishDrawPolygon({ color, outlineColor, alpha, clampToGround }) {
    if (tempPositions.value.length >= 3) {
      // 闭合多边形
      const closedPositions = [...tempPositions.value, tempPositions.value[0]]
      
      const entity = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(tempPositions.value),
          material: color.withAlpha(alpha),
          outline: true,
          outlineColor: outlineColor,
          heightReference: clampToGround 
            ? Cesium.HeightReference.CLAMP_TO_GROUND 
            : Cesium.HeightReference.NONE
        },
        polyline: {
          positions: closedPositions,
          width: 2,
          material: outlineColor
        }
      })
      
      const shape = {
        type: 'polygon',
        entity,
        positions: [...tempPositions.value],
        options: { color, outlineColor, alpha, clampToGround }
      }
      
      drawnShapes.value.push(shape)
      addHistory('add', shape)
    }
    
    drawingState.value = 'idle'
    currentShape.value = null
    currentEntity.value = null
    tempPositions.value = []
  }
  
  function finishDrawExtrudedPolygon({ color, outlineColor, extrudedHeight, alpha }) {
    if (tempPositions.value.length >= 3) {
      const entity = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(tempPositions.value),
          material: color.withAlpha(alpha),
          outline: true,
          outlineColor: outlineColor,
          extrudedHeight: extrudedHeight,
          closeTop: true,
          closeBottom: true
        }
      })
      
      const shape = {
        type: 'extrudedPolygon',
        entity,
        positions: [...tempPositions.value],
        extrudedHeight,
        options: { color, outlineColor, extrudedHeight, alpha }
      }
      
      drawnShapes.value.push(shape)
      addHistory('add', shape)
    }
    
    drawingState.value = 'idle'
    currentShape.value = null
    currentEntity.value = null
    tempPositions.value = []
  }
  
  function addHistory(type, shape) {
    // 删除当前索引之后的历史
    history.value = history.value.slice(0, historyIndex.value + 1)
    
    history.value.push({ type, shape })
    historyIndex.value++
  }
  
  // ==================== 返回值 ====================
  
  return {
    // 状态
    drawingState,
    currentShape,
    drawnShapes,
    
    // 2D 绘制
    startDrawPoint,
    startDrawLine,
    startDrawPolygon,
    startDrawCircle,
    
    // 3D 绘制
    startDraw3DLine,
    startDrawExtrudedPolygon,
    
    // 编辑
    deleteShape,
    clearAllShapes,
    undo,
    redo
  }
}