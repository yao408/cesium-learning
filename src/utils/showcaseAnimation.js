import * as THREE from 'three'

export function startShowcaseAnimation(camera, controls, options = {}) {
  const config = {
    duration: options.duration || 12,
    onStart: options.onStart || (() => {}),
    onComplete: options.onComplete || (() => {}),
    onCancel: options.onCancel || (() => {}),
  }

  console.log('🎬 初始化展示动画 - 球面坐标版')

  const TARGET_POINT = new THREE.Vector3(0, 0, 0)

  const START_DISTANCE = 20
  const END_DISTANCE = 200
  const START_HEIGHT_OFFSET = 8
  const END_HEIGHT_OFFSET = 70
  const TOTAL_ROTATION = Math.PI * 6

  console.log(`⚙️ 动画配置:`)
  console.log(`   目标点: (${TARGET_POINT.x}, ${TARGET_POINT.y}, ${TARGET_POINT.z})`)
  console.log(`   距离: ${START_DISTANCE}m → ${END_DISTANCE}m (拉远揭示,${((END_DISTANCE/START_DISTANCE)*100).toFixed(0)}倍距离)`)
  console.log(`   高度: ${(START_HEIGHT_OFFSET + TARGET_POINT.y)}m → ${(END_HEIGHT_OFFSET + TARGET_POINT.y)}m (升高俯视)`)
  console.log(`   旋转: 1080° (${TOTAL_ROTATION / (Math.PI * 2)}圈)`)
  console.log(`   时长: ${config.duration}秒`)

  console.log('🔒 动画开始 - 完全接管相机控制')

  const originalControlsEnabled = controls.enabled
  controls.enabled = false

  let animationState = {
    isPlaying: true,
    startTime: null,
    animationId: null,
    originalTarget: controls.target.clone(),
    originalPosition: camera.position.clone()
  }

  console.log(`📊 初始相机状态:`)
  console.log(`   位置: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`)
  console.log(`   目标: (${controls.target.x.toFixed(1)}, ${controls.target.y.toFixed(1)}, ${controls.target.z.toFixed(1)})`)
  console.log(`   OrbitControls启用状态: ${originalControlsEnabled}`)

  controls.target.copy(TARGET_POINT)

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function animate(timestamp) {
    if (!animationState.isPlaying) return

    if (!animationState.startTime) {
      animationState.startTime = timestamp
    }

    const elapsed = (timestamp - animationState.startTime) / 1000
    let rawProgress = Math.min(elapsed / config.duration, 1.0)
    const progress = easeInOutCubic(rawProgress)

    const currentTheta = progress * TOTAL_ROTATION
    const currentDist = START_DISTANCE + (END_DISTANCE - START_DISTANCE) * progress
    const heightOffset = START_HEIGHT_OFFSET + (END_HEIGHT_OFFSET - START_HEIGHT_OFFSET) * progress

    const targetX = TARGET_POINT.x + currentDist * Math.sin(currentTheta)
    const targetZ = TARGET_POINT.z + currentDist * Math.cos(currentTheta)
    const targetY = TARGET_POINT.y + heightOffset

    camera.position.set(targetX, targetY, targetZ)
    camera.lookAt(TARGET_POINT.x, TARGET_POINT.y, TARGET_POINT.z)

    const actualX = camera.position.x
    const actualY = camera.position.y
    const actualZ = camera.position.z

    const angleDegrees = (currentTheta * 180 / Math.PI).toFixed(0)
    const distChanged = Math.abs(actualX - targetX) > 0.1 || Math.abs(actualY - targetY) > 0.1 || Math.abs(actualZ - targetZ) > 0.1

    if (rawProgress % 1 < 0.05 || distChanged) {
      console.log(`🎬 ${(progress * 100).toFixed(1)}% | 🔄 ${angleDegrees}° | 📏 ${currentDist.toFixed(0)}m`)
      console.log(`   设置: (${targetX.toFixed(1)}, ${targetY.toFixed(1)}, ${targetZ.toFixed(1)})`)
      console.log(`   实际: (${actualX.toFixed(1)}, ${actualY.toFixed(1)}, ${actualZ.toFixed(1)}) ${distChanged ? '⚠️ 不一致!' : '✓'}`)
    }

    if (rawProgress >= 1.0) {
      stopAnimation()
      config.onComplete()
      return
    }

    animationState.animationId = requestAnimationFrame(animate)
  }

  function stopAnimation() {
    animationState.isPlaying = false

    if (animationState.animationId) {
      cancelAnimationFrame(animationState.animationId)
      animationState.animationId = null
    }

    controls.enabled = originalControlsEnabled
    controls.target.copy(TARGET_POINT)
    controls.update()

    console.log(`🔓 动画结束 - 恢复OrbitControls`)
    console.log(`   最终相机位置: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`)
    console.log(`   最终注视点: (${controls.target.x.toFixed(1)}, ${controls.target.y.toFixed(1)}, ${controls.target.z.toFixed(1)})`)
    console.log(`   OrbitControls已重新启用: ${controls.enabled}`)
  }

  animationState.animationId = requestAnimationFrame(animate)

  return {
    stop() {
      stopAnimation()
      config.onCancel()
    },

    get isPlaying() {
      return animationState.isPlaying
    },

    get progress() {
      if (!animationState.startTime) return 0
      const elapsed = (performance.now() - animationState.startTime) / 1000
      return Math.min(elapsed / config.duration, 1.0)
    }
  }
}