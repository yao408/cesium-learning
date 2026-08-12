import * as THREE from 'three'

export function createMagicRings(scene, position = new THREE.Vector3(0, 0, 0), options = {}) {
  const config = {
    ringCount: options.ringCount || 6,
    baseRadius: options.baseRadius || 15,
    maxRadius: options.maxRadius || 45,
    color: options.color || new THREE.Color(0x00d4ff),
    secondaryColor: options.secondaryColor || new THREE.Color(0x4dc9ff),
    accentColor: options.accentColor || new THREE.Color(0xffffff),
    animationSpeed: options.animationSpeed || 1.0,
    opacity: options.opacity || 0.6,
    glowIntensity: options.glowIntensity || 1.5,
    tubeThickness: options.tubeThickness || 0.08,
    ...options
  }

  const ringsGroup = new THREE.Group()
  ringsGroup.name = 'magicRings'
  scene.add(ringsGroup)

  const clock = new THREE.Clock()
  const ringMeshes = []
  const particleSystems = []

  for (let i = 0; i < config.ringCount; i++) {
    const progress = i / (config.ringCount - 1)
    const radius = config.baseRadius + (config.maxRadius - config.baseRadius) * progress

    const ring = createSingleRing(radius, i, config, clock)
    ringsGroup.add(ring.mesh)
    ringMeshes.push(ring)

    const particles = createRingParticles(radius, i, config, clock)
    ringsGroup.add(particles.system)
    particleSystems.push(particles)
  }

  ringsGroup.position.copy(position)

  function animate() {
    requestAnimationFrame(animate)
    const elapsed = clock.getElapsedTime()

    ringMeshes.forEach((ring, index) => {
      ring.update(elapsed)
      ring.mesh.position.y = Math.sin(elapsed * 0.4 + index * 1.0) * 0.25
      ring.mesh.rotation.z += Math.sin(elapsed * 0.3 + index * 2.0) * 0.0008
    })

    particleSystems.forEach((ps, index) => {
      ps.update(elapsed)
      ps.system.position.y = Math.sin(elapsed * 0.4 + index * 1.0) * 0.25
    })
  }

  animate()

  return {
    group: ringsGroup,
    setPosition: (pos) => { ringsGroup.position.copy(pos) },
    dispose: () => {
      scene.remove(ringsGroup)
      ringMeshes.forEach(ring => {
        ring.mesh.geometry.dispose()
        if (Array.isArray(ring.mesh.material)) {
          ring.mesh.material.forEach(m => m.dispose())
        } else {
          ring.mesh.material.dispose()
        }
      })
      particleSystems.forEach(ps => {
        ps.system.geometry.dispose()
        ps.system.material.dispose()
      })
    }
  }
}

function createSingleRing(radius, index, config, clock) {
  const segments = 180
  const tubeRadius = config.tubeThickness * (1 + (Math.random() - 0.5) * 0.4)
  const geometry = new THREE.TorusGeometry(radius, tubeRadius, 24, segments)

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uIndex;

    void main() {
      vUv = uv;
      vPosition = position;

      vec3 pos = position;
      float wave = sin(pos.x * 0.5 + uTime * (1.0 + uIndex * 0.2)) * 0.08;
      wave += sin(pos.z * 0.7 + uTime * 0.8) * 0.06;
      pos.y += wave;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `

  const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uIndex;
    uniform float uOpacity;
    uniform float uGlowIntensity;
    uniform vec3 uColor;
    uniform vec3 uSecondaryColor;
    uniform vec3 uAccentColor;

    void main() {
      float alpha = uOpacity;

      float pulse = sin(uTime * (1.2 + uIndex * 0.25) + uIndex * 1.5) * 0.5 + 0.5;
      alpha *= 0.7 + pulse * 0.3;

      float flow = fract(vUv.x * 4.0 - uTime * 0.35 * (1.0 + uIndex * 0.12));
      flow = smoothstep(0.0, 0.25, flow) * smoothstep(1.0, 0.75, flow);
      flow = pow(flow, 0.8);

      float gapPattern = sin(vUv.x * 50.0 + uIndex * 2.5) * 0.5 + 0.5;
      gapPattern = step(0.32, gapPattern);

      float dashPattern = sin(vUv.x * 120.0 + uTime * 2.0 + uIndex * 3.0) * 0.5 + 0.5;
      dashPattern = smoothstep(0.4, 0.6, dashPattern);

      alpha *= flow * gapPattern * (0.7 + dashPattern * 0.3);

      vec3 baseColor = mix(uColor, uSecondaryColor, sin(vUv.x * 6.28 + uTime * 0.8) * 0.5 + 0.5);

      float highlight = smoothstep(0.45, 0.5, flow) * smoothstep(0.55, 0.5, flow);
      baseColor = mix(baseColor, uAccentColor, highlight * 0.8);

      float coreGlow = pow(flow, 1.5) * uGlowIntensity;
      baseColor += coreGlow * uColor * 1.2;

      float outerGlow = pow(flow, 3.0) * uGlowIntensity * 0.6;
      baseColor += outerGlow * uSecondaryColor * 0.8;

      baseColor *= (1.0 + pulse * 0.15);

      gl_FragColor = vec4(baseColor, alpha);
    }
  `

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIndex: { value: index },
      uOpacity: { value: config.opacity * (1 - index * 0.08) },
      uGlowIntensity: { value: config.glowIntensity },
      uColor: { value: config.color.clone() },
      uSecondaryColor: { value: config.secondaryColor.clone() },
      uAccentColor: { value: config.accentColor.clone() }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.rotation.z = (Math.random() - 0.5) * 0.15

  return {
    mesh,
    update(time) {
      material.uniforms.uTime.value = time * config.animationSpeed
    }
  }
}

function createRingParticles(radius, index, config, clock) {
  const particleCount = 120 + Math.floor(Math.random() * 80)
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const phases = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
    const radiusVariation = radius + (Math.random() - 0.5) * 4

    positions[i * 3] = Math.cos(angle) * radiusVariation
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8
    positions[i * 3 + 2] = Math.sin(angle) * radiusVariation

    let colorMix = Math.random()
    if (Math.random() > 0.7) {
      colorMix = Math.random() > 0.5 ? 1 : 0
    }
    const color = new THREE.Color().lerpColors(config.color, config.accentColor || config.secondaryColor, colorMix)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    sizes[i] = 0.25 + Math.random() * 0.45
    phases[i] = Math.random() * Math.PI * 2
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

  const vertexShader = `
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;

    varying vec3 vColor;
    varying float vAlpha;

    uniform float uTime;
    uniform float uIndex;

    void main() {
      vColor = aColor;

      vec3 pos = position;

      float angle = atan(pos.z, pos.x);
      float currentRadius = length(pos.xz);

      float wobble = sin(angle * 8.0 + uTime * (2.0 + uIndex * 0.5) + aPhase) * 0.4;
      pos.y += wobble;

      float radialPulse = sin(uTime * 1.5 + aPhase) * 0.3;
      pos.x *= 1.0 + radialPulse * 0.02;
      pos.z *= 1.0 + radialPulse * 0.02;

      vAlpha = 0.4 + sin(uTime * 2.0 + aPhase) * 0.3;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      float sizeAttenuation = 300.0 / -mvPosition.z;
      gl_PointSize = aSize * sizeAttenuation * (1.0 + sin(uTime * 3.0 + aPhase) * 0.2);
    }
  `

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      float alpha = vAlpha;

      float core = 1.0 - smoothstep(0.0, 0.12, dist);
      core = pow(core, 1.5);

      float glow = 1.0 - smoothstep(0.0, 0.45, dist);
      glow = pow(glow, 2.0);

      alpha *= (core * 1.0 + glow * 0.6);

      vec3 finalColor = vColor * (1.0 + core * 1.8);
      finalColor += vec3(core * 0.9);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIndex: { value: index },
      uGlowIntensity: { value: config.glowIntensity || 1.5 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const system = new THREE.Points(geometry, material)

  return {
    system,
    update(time) {
      material.uniforms.uTime.value = time * config.animationSpeed
    }
  }
}