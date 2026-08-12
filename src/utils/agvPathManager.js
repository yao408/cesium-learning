import { ref, computed } from 'vue'
import * as THREE from 'three'

export function useAGVPathManager(scene, camera, renderer, controls, raycaster, mouse) {
  const showAGVTrail = ref(false)
  const isFirstPersonView = ref(false)
  const isSettingPathMode = ref(false)
  let agvModel = null
  let trailRenderer = null
  let persistentTrailLine = null
  let persistentTrailPoints = []
  let agvCurve = null
  let agvPathProgress = 0

  const customPathPoints = ref([])
  const pathPointCount = computed(() => customPathPoints.value.length)
  const isPathClosed = ref(false)
  const showClosePathHint = ref(false)
  const isPathConfirmed = ref(false)

  let pathPreviewLine = null
  let pathPointMarkers = []
  let pathModeMouseDownPos = null
  let isPathModeDragging = false
  let originalCameraPosition = null
  let originalCameraTarget = null

  function setAGVModel(model) {
    agvModel = model
  }

  function setTrailRenderer(renderer) {
    trailRenderer = renderer
  }

  function setPersistentTrailLine(line) {
    persistentTrailLine = line
  }

  function getAGVCurve() {
    return agvCurve
  }

  function getPointOnPath(progress) {
    if (!agvCurve) return new THREE.Vector3(0, 0, 0)
    return agvCurve.getPointAt(progress % 1)
  }

  function toggleAGVTrail() {
    showAGVTrail.value = !showAGVTrail.value

    if (agvModel) {
      agvModel.visible = showAGVTrail.value
    }

    if (trailRenderer) {
      trailRenderer.points.visible = showAGVTrail.value
    }

    if (persistentTrailLine) {
      persistentTrailLine.visible = showAGVTrail.value && persistentTrailPoints.length > 0
    }
  }

  function onAGVModelClick() {
    if (!showAGVTrail.value || !agvModel) return
    
    if (isFirstPersonView.value) {
      resetToTopView()
    } else {
      toggleFirstPersonView()
    }
  }

  function togglePathEditMode() {
    isSettingPathMode.value = !isSettingPathMode.value

    if (isSettingPathMode.value) {
      isPathConfirmed.value = false
      restorePathMarkers()
      
      if (pathPreviewLine && customPathPoints.value.length >= 2) {
        pathPreviewLine.material.color.setHex(0xffaa00)
        pathPreviewLine.material.opacity = 0.8
      }
      
      if (!pathPreviewLine) {
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0xffaa00,
          linewidth: 2,
          transparent: true,
          opacity: 0.8
        })
        const lineGeometry = new THREE.BufferGeometry()
        pathPreviewLine = new THREE.Line(lineGeometry, lineMaterial)
        scene.add(pathPreviewLine)
      }
      
      pathPreviewLine.visible = true
    } else {
      if (customPathPoints.value.length >= 2) {
        applyCustomPathToAGV()
      }
      
      minimizePathMarkers()
      if (pathPreviewLine) {
        if (customPathPoints.value.length >= 2) {
          pathPreviewLine.visible = true
          pathPreviewLine.material.color.setHex(0x10b981)
          pathPreviewLine.material.opacity = 0.6
        } else {
          pathPreviewLine.visible = false
        }
      }
      
      isPathConfirmed.value = true
      showClosePathHint.value = false
    }
  }

  function addPathPoint(event) {
    if (!isSettingPathMode.value) return
    
    if (isPathModeDragging) {
      return
    }
    
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    raycaster.setFromCamera(mouse, camera)
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hitPoint = new THREE.Vector3()
    
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      hitPoint.y = 0.15
      
      if (customPathPoints.value.length >= 3 && !isPathClosed.value) {
        const startPoint = customPathPoints.value[0]
        const distanceToStart = hitPoint.distanceTo(startPoint)
        
        if (distanceToStart < 2.0) {
          isPathClosed.value = true
          showClosePathHint.value = false
          updatePathPreview()
          applyCustomPathToAGV()
          return
        }
      }
      
      customPathPoints.value.push(hitPoint.clone())
      
      addPathMarker(hitPoint.clone(), customPathPoints.value.length)
      updatePathPreview()
      
      if (customPathPoints.value.length >= 2) {
        applyCustomPathToAGV()
      }
    }
  }

  function addPathMarker(position, index) {
    const markerGeometry = new THREE.SphereGeometry(0.4, 16, 16)
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: index === 1 ? 0x00ff00 : (index === customPathPoints.value.length ? 0xff0000 : 0xffaa00),
      transparent: true,
      opacity: 0.9
    })
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    marker.position.copy(position)
    scene.add(marker)
    pathPointMarkers.push(marker)
    
    const ringGeometry = new THREE.RingGeometry(0.5, 0.7, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(position)
    ring.rotation.x = -Math.PI / 2
    scene.add(ring)
    pathPointMarkers.push(ring)
  }

  function updatePathPreview() {
    if (!pathPreviewLine || customPathPoints.value.length < 2) return
    
    let points = customPathPoints.value.map(p => p.clone())
    
    if (isPathClosed.value && customPathPoints.value.length >= 3) {
      points.push(customPathPoints.value[0].clone())
    }
    
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    const curvePoints = curve.getPoints(100)
    
    pathPreviewLine.geometry.setFromPoints(curvePoints)
    pathPreviewLine.geometry.attributes.position.needsUpdate = true
  }

  function applyCustomPathToAGV() {
    if (customPathPoints.value.length < 2) return
    
    let curvePoints = customPathPoints.value.map(p => p.clone())
    
    if (isPathClosed.value && customPathPoints.value.length >= 3) {
      curvePoints.push(customPathPoints.value[0].clone())
    }
    
    agvCurve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5)
    
    isPathConfirmed.value = true
    savePathToStorage()
    
    agvPathProgress = 0
    
    const startPos = getPointOnPath(0)
    if (agvModel) {
      agvModel.position.copy(startPos)
    }
    
    if (trailRenderer) {
      trailRenderer.clear()
    }

    if (persistentTrailLine) {
      persistentTrailPoints = []
      if (persistentTrailLine.geometry) {
        persistentTrailLine.geometry.dispose()
        persistentTrailLine.geometry = new THREE.BufferGeometry()
      }
      persistentTrailLine.visible = false
    }
  }

  function clearPathMarkers() {
    pathPointMarkers.forEach(marker => {
      scene.remove(marker)
      if (marker.geometry) marker.geometry.dispose()
      if (marker.material) marker.material.dispose()
    })
    pathPointMarkers = []
  }

  function minimizePathMarkers() {
    pathPointMarkers.forEach(marker => {
      if (marker.geometry && marker.geometry.type === 'SphereGeometry') {
        marker.scale.set(0.3, 0.3, 0.3)
        if (marker.material) {
          marker.material.opacity = 0.4
        }
      } else if (marker.geometry && marker.geometry.type === 'RingGeometry') {
        marker.visible = false
      }
    })
  }

  function restorePathMarkers() {
    pathPointMarkers.forEach(marker => {
      if (marker.geometry && marker.geometry.type === 'SphereGeometry') {
        marker.scale.set(1, 1, 1)
        if (marker.material) {
          marker.material.opacity = 0.9
        }
      } else if (marker.geometry && marker.geometry.type === 'RingGeometry') {
        marker.visible = true
      }
    })
  }

  function clearCustomPath() {
    customPathPoints.value = []
    isPathClosed.value = false
    showClosePathHint.value = false
    isPathConfirmed.value = false
    clearPathMarkers()
    if (pathPreviewLine && pathPreviewLine.geometry) {
      pathPreviewLine.geometry.dispose()
      pathPreviewLine.geometry = new THREE.BufferGeometry()
      pathPreviewLine.visible = false
    }
    
    localStorage.removeItem('agv_custom_path')
  }

  function savePathToStorage() {
    if (customPathPoints.value.length < 2) return
    
    const pathData = {
      points: customPathPoints.value.map(p => ({ x: p.x, y: p.y, z: p.z })),
      isClosed: isPathClosed.value,
      timestamp: Date.now()
    }
    
    localStorage.setItem('agv_custom_path', JSON.stringify(pathData))
  }

  function restoreSavedPath() {
    const saved = localStorage.getItem('agv_custom_path')
    if (!saved) return
    
    try {
      const pathData = JSON.parse(saved)
      
      customPathPoints.value = pathData.points.map(p => 
        new THREE.Vector3(p.x, p.y, p.z)
      )
      isPathClosed.value = pathData.isClosed || false
      
      setTimeout(() => {
        if (!pathPreviewLine) {
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x10b981,
            linewidth: 3,
            transparent: true,
            opacity: 0.6
          })
          pathPreviewLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial)
          scene.add(pathPreviewLine)
        }
        
        updatePathPreview()
        applyCustomPathToAGV()
        
        isPathConfirmed.value = true
        
        minimizePathMarkers()
        
      }, 1000)
      
    } catch (e) {
      console.error('恢复路径失败:', e)
      localStorage.removeItem('agv_custom_path')
    }
  }

  function toggleFirstPersonView() {
    isFirstPersonView.value = !isFirstPersonView.value
    
    if (isFirstPersonView.value) {
      originalCameraPosition = camera.position.clone()
      originalCameraTarget = controls.target.clone()
      
      controls.enabled = false
      
    } else {
      if (originalCameraPosition && originalCameraTarget) {
        camera.position.copy(originalCameraPosition)
        controls.target.copy(originalCameraTarget)
        controls.update()
      }
      
      controls.enabled = true
    }
  }

  function resetToTopView() {
    isFirstPersonView.value = false
    
    if (originalCameraPosition && originalCameraTarget) {
      camera.position.copy(originalCameraPosition)
      controls.target.copy(originalCameraTarget)
      controls.update()
    }
    
    controls.enabled = true
  }

  function toggleLoopPath() {
    if (customPathPoints.value.length < 3) return
    
    isPathClosed.value = !isPathClosed.value
    
    updatePathPreview()
    applyCustomPathToAGV()
  }

  function undoLastPoint() {
    if (customPathPoints.value.length === 0) return

    customPathPoints.value.pop()

    if (customPathPoints.value.length < 3) {
      isPathClosed.value = false
    }

    showClosePathHint.value = false
    clearPathMarkers()
    
    const lastMarkerIndex = (pathPointMarkers.length / 2 - 1) * 2
    if (lastMarkerIndex >= 0 && lastMarkerIndex < pathPointMarkers.length - 1) {
      const marker = pathPointMarkers[lastMarkerIndex]
      const ring = pathPointMarkers[lastMarkerIndex + 1]
      
      scene.remove(marker)
      if (marker.geometry) marker.geometry.dispose()
      if (marker.material) marker.material.dispose()
      
      scene.remove(ring)
      if (ring.geometry) ring.geometry.dispose()
      if (ring.material) ring.material.dispose()
      
      pathPointMarkers.splice(lastMarkerIndex, 2)
    }
    
    updatePathPreview()
    
    if (customPathPoints.value.length >= 2) {
      applyCustomPathToAGV()
    }
  }

  return {
    showAGVTrail,
    isFirstPersonView,
    isSettingPathMode,
    customPathPoints,
    pathPointCount,
    isPathClosed,
    showClosePathHint,
    isPathConfirmed,
    setAGVModel,
    setTrailRenderer,
    setPersistentTrailLine,
    getAGVCurve,
    getPointOnPath,
    toggleAGVTrail,
    onAGVModelClick,
    togglePathEditMode,
    addPathPoint,
    addPathMarker,
    updatePathPreview,
    applyCustomPathToAGV,
    clearPathMarkers,
    minimizePathMarkers,
    restorePathMarkers,
    clearCustomPath,
    savePathToStorage,
    restoreSavedPath,
    toggleFirstPersonView,
    resetToTopView,
    toggleLoopPath,
    undoLastPoint
  }
}