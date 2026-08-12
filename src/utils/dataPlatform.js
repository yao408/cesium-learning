import * as THREE from 'three'

export function createDataPlatform(scene, position = new THREE.Vector3(0, -6.5, 0), options = {}) {
  const config = {
    baseSize: options.baseSize || 100,
    height: options.height || 4,
    tiers: options.tiers || 3,
    primaryColor: options.primaryColor || new THREE.Color(0x00d4ff),
    secondaryColor: options.secondaryColor || new THREE.Color(0x0066aa),
    glowColor: options.glowColor || new THREE.Color(0x00ffff),
    opacity: options.opacity || 0.85,
    ...options
  }

  const platformGroup = new THREE.Group()
  platformGroup.name = 'dataPlatform'
  scene.add(platformGroup)

  createBasePlatform(platformGroup, config)
  createTieredSteps(platformGroup, config)
  createGlowRim(platformGroup, config)
  createGridLines(platformGroup, config)
  createFloatingParticles(platformGroup, config)
  createEdgeLightBeams(platformGroup, config)

  platformGroup.position.copy(position)

  const clock = new THREE.Clock()

  function animate() {
    requestAnimationFrame(animate)
    const elapsed = clock.getElapsedTime()

    updateAnimations(platformGroup, elapsed, config)
  }

  animate()

  return {
    group: platformGroup,
    setPosition: (pos) => { platformGroup.position.copy(pos) },
    dispose: () => {
      scene.remove(platformGroup)
      platformGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
  }
}

function createBasePlatform(group, config) {
  const geometry = new THREE.CylinderGeometry(
    config.baseSize / 2,
    config.baseSize * 0.65 / 2,
    config.height,
    64,
    1,
    false
  )

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;
    uniform vec3 uGlowColor;
    uniform float uOpacity;

    void main() {
      float heightFactor = smoothstep(0.0, 1.0, vPosition.y / ${config.height.toFixed(1)});

      vec3 baseColor = mix(uSecondaryColor, uPrimaryColor, heightFactor);

      float gridX = abs(sin(vUv.x * 80.0));
      float gridY = abs(sin(vUv.y * 40.0));
      float grid = max(
        smoothstep(0.95, 1.0, gridX),
        smoothstep(0.95, 1.0, gridY)
      );

      float pulse = sin(uTime * 2.0 + vUv.x * 10.0) * 0.5 + 0.5;
      pulse *= sin(uTime * 1.5 + vUv.y * 8.0) * 0.5 + 0.5;

      float edgeFade = 1.0 - pow(heightFactor, 3.0);

      float scanLine = sin(vUv.y * 200.0 - uTime * 3.0) * 0.5 + 0.5;
      scanLine = smoothstep(0.7, 1.0, scanLine);

      vec3 finalColor = baseColor;
      finalColor += grid * uGlowColor * 0.4;
      finalColor += pulse * uGlowColor * 0.15;
      finalColor += scanLine * uGlowColor * 0.25 * edgeFade;

      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      finalColor += fresnel * uGlowColor * 0.3;

      float alpha = uOpacity * (0.7 + heightFactor * 0.3);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPrimaryColor: { value: config.primaryColor },
      uSecondaryColor: { value: config.secondaryColor },
      uGlowColor: { value: config.glowColor },
      uOpacity: { value: config.opacity * 0.9 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'basePlatform'
  group.add(mesh)
}

function createTieredSteps(group, config) {
  for (let i = 0; i < config.tiers; i++) {
    const tierProgress = (i + 1) / (config.tiers + 1)
    const tierRadius = config.baseSize * (0.4 + tierProgress * 0.35) / 2
    const tierHeight = config.height * 0.15 * (1 + i * 0.2)
    const yOffset = -config.height * 0.4 + i * (config.height * 0.25)

    const geometry = new THREE.CylinderGeometry(
      tierRadius,
      tierRadius * 0.95,
      tierHeight,
      48,
      1,
      true
    )

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTierIndex: { value: i },
        uColor: { value: config.glowColor.clone() },
        uOpacity: { value: config.opacity * (0.4 + i * 0.15) }
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uTierIndex;

        void main() {
          vUv = uv;
          vec3 pos = position;

          float wave = sin(pos.x * 0.3 + uTime * (1.5 + uTierIndex * 0.5)) * 0.03;
          wave += cos(pos.z * 0.3 + uTime * 1.2) * 0.02;
          pos.y += wave;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uTierIndex;
        uniform vec3 uColor;
        uniform float uOpacity;

        void main() {
          float flow = fract(vUv.x * 20.0 - uTime * (0.8 + uTierIndex * 0.3));
          flow = smoothstep(0.0, 0.2, flow) * smoothstep(1.0, 0.8, flow);

          float ringPattern = sin(vUv.x * 60.0 + uTierIndex * 10.0) * 0.5 + 0.5;
          ringPattern = step(0.4, ringPattern);

          float alpha = uOpacity * flow * ringPattern;

          float glow = pow(flow, 2.0) * 1.5;
          vec3 finalColor = uColor * (1.0 + glow);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = yOffset
    mesh.name = `tier_${i}`
    group.add(mesh)
  }
}

function createGlowRim(group, config) {
  const rimRadius = config.baseSize / 2

  const geometry = new THREE.TorusGeometry(rimRadius, 0.08, 16, 128)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: config.glowColor },
      uOpacity: { value: config.opacity }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;

      void main() {
        float flow = fract(vUv.x * 8.0 - uTime * 0.5);
        flow = smoothstep(0.0, 0.3, flow) * smoothstep(1.0, 0.7, flow);

        float pulse = sin(uTime * 3.0 + vUv.x * 20.0) * 0.5 + 0.5;

        float alpha = uOpacity * flow * (0.7 + pulse * 0.3);

        float core = pow(flow, 1.5) * 2.0;
        vec3 color = uColor * (1.0 + core);

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = config.height * 0.48
  mesh.rotation.x = Math.PI / 2
  mesh.name = 'glowRim'
  group.add(mesh)
}

function createGridLines(group, config) {
  const gridSize = config.baseSize * 0.8
  const divisions = 40

  const geometry = new THREE.BufferGeometry()
  const positions = []
  const halfSize = gridSize / 2
  const step = gridSize / divisions

  for (let i = 0; i <= divisions; i++) {
    const pos = -halfSize + i * step

    positions.push(-halfSize, 0, pos, halfSize, 0, pos)
    positions.push(pos, 0, -halfSize, pos, 0, halfSize)
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: config.glowColor },
      uOpacity: { value: config.opacity * 0.5 }
    },
    vertexShader: `
      varying float vDist;
      uniform float uTime;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        vDist = length(position.xz) / 50.0;

        float pulse = sin(uTime * 2.0 + length(position.xz) * 0.2) * 0.5 + 0.5;
        gl_PointSize = (2.0 + pulse * 2.0) * (300.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying float vDist;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        float alpha = uOpacity * (1.0 - vDist * 0.5);
        alpha *= 1.0 - smoothstep(0.2, 0.5, dist);

        float core = 1.0 - smoothstep(0.0, 0.15, dist);
        vec3 color = uColor * (1.0 + core);

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const lines = new THREE.Points(geometry, material)
  lines.position.y = config.height * 0.51
  lines.name = 'gridLines'
  group.add(lines)
}

function createFloatingParticles(group, config) {
  const particleCount = 300
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const phases = new Float32Array(particleCount)

  const radius = config.baseSize * 0.45

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * radius

    positions[i * 3] = Math.cos(angle) * r
    positions[i * 3 + 1] = (Math.random() - 0.3) * config.height
    positions[i * 3 + 2] = Math.sin(angle) * r

    const colorMix = Math.random()
    const color = new THREE.Color().lerpColors(config.glowColor, new THREE.Color(0xffffff), colorMix)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    sizes[i] = 0.3 + Math.random() * 0.6
    phases[i] = Math.random() * Math.PI * 2
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: config.opacity * 0.8 }
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;

      varying vec3 vColor;
      varying float vAlpha;

      uniform float uTime;

      void main() {
        vColor = aColor;

        vec3 pos = position;
        float rise = sin(uTime * 0.8 + aPhase) * 2.0;
        pos.y += rise;
        pos.y = max(pos.y, -${config.height.toFixed(1)} * 0.3);

        pos.x += sin(uTime * 0.5 + aPhase * 2.0) * 0.5;
        pos.z += cos(uTime * 0.6 + aPhase * 2.0) * 0.5;

        vAlpha = 0.4 + sin(uTime * 1.5 + aPhase) * 0.3;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float sizeAttenuation = 350.0 / -mvPosition.z;
        gl_PointSize = aSize * sizeAttenuation * (1.0 + sin(uTime * 2.5 + aPhase) * 0.3);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        float core = 1.0 - smoothstep(0.0, 0.12, dist);
        core = pow(core, 1.5);

        float glow = 1.0 - smoothstep(0.0, 0.45, dist);
        glow = pow(glow, 2.0);

        float alpha = vAlpha * (core * 1.0 + glow * 0.5);

        vec3 finalColor = vColor * (1.0 + core * 2.0);
        finalColor += vec3(core * 1.0);

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const particles = new THREE.Points(geometry, material)
  particles.name = 'floatingParticles'
  group.add(particles)
}

function createEdgeLightBeams(group, config) {
  const beamCount = 12
  const beamRadius = config.baseSize * 0.42

  for (let i = 0; i < beamCount; i++) {
    const angle = (i / beamCount) * Math.PI * 2

    const geometry = new THREE.CylinderGeometry(0.05, 0.15, config.height * 0.8, 8, 1, true)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAngle: { value: angle },
        uColor: { value: config.glowColor },
        uOpacity: { value: config.opacity * 0.6 }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;

        void main() {
          float flow = fract(vUv.y * 3.0 - uTime * 1.5);
          flow = smoothstep(0.0, 0.2, flow) * smoothstep(1.0, 0.8, flow);

          float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

          float alpha = uOpacity * flow * edgeFade;

          float intensity = pow(flow, 1.5) * 2.0;
          vec3 color = uColor * (1.0 + intensity);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    const beam = new THREE.Mesh(geometry, material)
    beam.position.x = Math.cos(angle) * beamRadius
    beam.position.z = Math.sin(angle) * beamRadius
    beam.position.y = -config.height * 0.1
    beam.name = `lightBeam_${i}`
    group.add(beam)
  }
}

function updateAnimations(group, elapsed, config) {
  group.traverse((child) => {
    if (child.material && child.material.uniforms && child.material.uniforms.uTime) {
      child.material.uniforms.uTime.value = elapsed
    }
  })

  const particles = group.getObjectByName('floatingParticles')
  if (particles) {
    particles.rotation.y = elapsed * 0.05
  }
}