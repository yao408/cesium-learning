import * as Cesium from 'cesium'

const QUAD_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
  }
`

const OUTFLOW_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D u_terrain;
  uniform sampler2D u_water;
  uniform float u_flowRate;
  uniform float u_texelSize;
  varying vec2 v_texCoord;

  void main() {
    float tC = texture2D(u_terrain, v_texCoord).r;
    float wC = texture2D(u_water, v_texCoord).r;
    float totalC = tC + wC;

    vec4 outflow = vec4(0.0);

    vec2 uvL = v_texCoord + vec2(-u_texelSize, 0.0);
    vec2 uvR = v_texCoord + vec2(u_texelSize, 0.0);
    vec2 uvB = v_texCoord + vec2(0.0, -u_texelSize);
    vec2 uvT = v_texCoord + vec2(0.0, u_texelSize);

    uvL = clamp(uvL, vec2(0.0), vec2(1.0));
    uvR = clamp(uvR, vec2(0.0), vec2(1.0));
    uvB = clamp(uvB, vec2(0.0), vec2(1.0));
    uvT = clamp(uvT, vec2(0.0), vec2(1.0));

    float tL = texture2D(u_terrain, uvL).r;
    float wL = texture2D(u_water, uvL).r;
    float dL = totalC - (tL + wL);
    if (dL > 0.0) outflow.r = min(dL * u_flowRate, wC * 0.25);

    float tR = texture2D(u_terrain, uvR).r;
    float wR = texture2D(u_water, uvR).r;
    float dR = totalC - (tR + wR);
    if (dR > 0.0) outflow.g = min(dR * u_flowRate, wC * 0.25);

    float tB = texture2D(u_terrain, uvB).r;
    float wB = texture2D(u_water, uvB).r;
    float dB = totalC - (tB + wB);
    if (dB > 0.0) outflow.b = min(dB * u_flowRate, wC * 0.25);

    float tT = texture2D(u_terrain, uvT).r;
    float wT = texture2D(u_water, uvT).r;
    float dT = totalC - (tT + wT);
    if (dT > 0.0) outflow.a = min(dT * u_flowRate, wC * 0.25);

    gl_FragColor = outflow;
  }
`

const WATER_UPDATE_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D u_water;
  uniform sampler2D u_outflow;
  uniform float u_texelSize;
  varying vec2 v_texCoord;

  void main() {
    float wC = texture2D(u_water, v_texCoord).r;

    float outL = texture2D(u_outflow, v_texCoord).r;
    float outR = texture2D(u_outflow, v_texCoord).g;
    float outB = texture2D(u_outflow, v_texCoord).b;
    float outT = texture2D(u_outflow, v_texCoord).a;

    vec2 uvL = v_texCoord + vec2(-u_texelSize, 0.0);
    vec2 uvR = v_texCoord + vec2(u_texelSize, 0.0);
    vec2 uvB = v_texCoord + vec2(0.0, -u_texelSize);
    vec2 uvT = v_texCoord + vec2(0.0, u_texelSize);

    uvL = clamp(uvL, vec2(0.0), vec2(1.0));
    uvR = clamp(uvR, vec2(0.0), vec2(1.0));
    uvB = clamp(uvB, vec2(0.0), vec2(1.0));
    uvT = clamp(uvT, vec2(0.0), vec2(1.0));

    float inR = texture2D(u_outflow, uvL).g;
    float inL = texture2D(u_outflow, uvR).r;
    float inT = texture2D(u_outflow, uvB).a;
    float inB = texture2D(u_outflow, uvT).b;

    float outflow = outL + outR + outB + outT;
    float inflow = inL + inR + inB + inT;

    float newWater = wC + inflow - outflow;
    newWater = max(newWater, 0.0);

    gl_FragColor = vec4(newWater, 0.0, 0.0, 1.0);
  }
`
const RENDER_VERTEX_SHADER = `
  varying vec2 v_st;
  varying vec3 v_position3D;
  void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
    vec3 pos = vsInput.attributes.positionMC;
    float waterHeight = texture2D(u_gpu_water, vsInput.attributes.st).r;
    float h = 5.0 + waterHeight;
    vec3 normal = normalize(pos);
    vsOutput.positionMC = pos + normal * h;
    v_st = vsInput.attributes.st;
    v_position3D = vsOutput.positionMC;
  }
`

const RENDER_FRAGMENT_SHADER = `
  varying vec2 v_st;
  varying vec3 v_position3D;
  void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
    material.diffuse = vec3(1.0, 0.0, 0.0);
    material.alpha = 1.0;
    return;
    float waterHeight = texture2D(u_gpu_water, v_st).r;
    if (waterHeight <= 0.001) {
      material.diffuse = vec3(0.0);
      material.alpha = 0.0;
    } else {
      float depth = clamp(waterHeight / 200.0, 0.0, 1.0);
      material.diffuse = mix(vec3(0.2, 0.5, 1.0), vec3(0.0, 0.3, 0.8), depth);
      material.alpha = 0.65;
    }
  }
`
export class GPUFloodSim {
  constructor(viewer) {
    this.viewer = viewer
    this.scene = viewer.scene
    this.gl = null
    this.isWebGL2 = false
    this.gridSize = 256

    this.terrainTexture = null
    this.waterTextureA = null
    this.waterTextureB = null
    this.outflowTextureA = null
    this.outflowTextureB = null

    this.outflowFBO = null
    this.waterFBO = null

    this.outflowProgram = null
    this.waterUpdateProgram = null
    this.quadBuffer = null
    this.quadVAO = null
    this.vaoExt = null

    this.renderPrimitive = null
    this._imageryLayer = null
    this._lastBlobUrl = null

    this.useBufferA = true
    this._outflowRead = null
    this._outflowWrite = null
    this._waterRead = null
    this._waterWrite = null
    this.initialized = false
    this.sourceSet = false
    this.simulationArea = null
    this.terrainData = null
    this.waterData = null

    this._preRenderListener = null
    this._waterLevel = 0
    this._stepCount = 0
    this._glFormat = null
    this._glInternalFormat = null
  }

  _getGL() {
    if (!this.gl) {
      this.gl = this.scene.context._gl
      this.isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && this.gl instanceof WebGL2RenderingContext
      this._glFormat = this.isWebGL2 ? this.gl.RED : this.gl.LUMINANCE
      this._glInternalFormat = this.isWebGL2 ? this.gl.R32F : this.gl.LUMINANCE
      this.vaoExt = this.isWebGL2 ? null : this.gl.getExtension('OES_vertex_array_object')
    }
    return this.gl
  }

  _compileShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error('Shader compile error: ' + info)
    }
    return shader
  }

  _compileProgram(gl, vertSrc, fragSrc) {
    const vert = this._compileShader(gl, gl.VERTEX_SHADER, vertSrc)
    const frag = this._compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
    const program = gl.createProgram()
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error('Program link error: ' + info)
    }
    gl.deleteShader(vert)
    gl.deleteShader(frag)
    return program
  }

  _createTexture(gl, width, height, data, channels) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const floatExt = gl.getExtension('OES_texture_float')
    const useFloat = !!floatExt || this.isWebGL2

    const internalFormat = this.isWebGL2 ? gl.RGBA32F : gl.RGBA
    const format = gl.RGBA
    const type = useFloat ? gl.FLOAT : gl.UNSIGNED_BYTE

    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data || null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    return tex
  }

  _createFBO(gl, colorTexture) {
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Framebuffer incomplete: ' + status)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return fbo
  }

  _createQuad(gl) {
    const vertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
       1, -1, 1, 0,
       1,  1, 1, 1,
      -1,  1, 0, 1,
    ])
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    let vao = null
    if (this.isWebGL2) {
      vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8)
      gl.bindVertexArray(null)
    } else if (this.vaoExt) {
      vao = this.vaoExt.createVertexArrayOES()
      this.vaoExt.bindVertexArrayOES(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8)
      this.vaoExt.bindVertexArrayOES(null)
    }

    return { buffer, vao }
  }

  _drawQuad(gl, program, framebuffer, uniforms) {
    if (this.isWebGL2 && this.quadVAO) {
      gl.bindVertexArray(this.quadVAO)
    } else if (this.vaoExt && this.quadVAO) {
      this.vaoExt.bindVertexArrayOES(this.quadVAO)
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.useProgram(program)

    let texUnit = 0
    if (uniforms) {
      for (const [name, value] of Object.entries(uniforms)) {
        const loc = gl.getUniformLocation(program, name)
        if (loc === null) continue
        if (value instanceof WebGLTexture) {
          gl.activeTexture(gl.TEXTURE0 + texUnit)
          gl.bindTexture(gl.TEXTURE_2D, value)
          gl.uniform1i(loc, texUnit)
          texUnit++
        } else if (Array.isArray(value)) {
          if (value.length === 1) {
            gl.uniform1f(loc, value[0])
          } else if (value.length === 2) {
            gl.uniform2f(loc, value[0], value[1])
          } else if (value.length === 3) {
            gl.uniform3f(loc, value[0], value[1], value[2])
          } else if (value.length === 4) {
            gl.uniform4f(loc, value[0], value[1], value[2], value[3])
          }
        } else if (typeof value === 'number') {
          gl.uniform1f(loc, value)
        } else if (typeof value === 'boolean') {
          gl.uniform1i(loc, value ? 1 : 0)
        }
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if (this.isWebGL2) {
      gl.bindVertexArray(null)
    } else if (this.vaoExt) {
      this.vaoExt.bindVertexArrayOES(null)
    }
  }

  async init(sourceLon, sourceLat, halfSize) {
    const gl = this._getGL()

    const floatExt = gl.getExtension('OES_texture_float')
    if (!floatExt && !this.isWebGL2) {
      throw new Error('OES_texture_float not supported')
    }

    const lonMin = sourceLon - halfSize
    const lonMax = sourceLon + halfSize
    const latMin = sourceLat - halfSize
    const latMax = sourceLat + halfSize
    const dLon = (lonMax - lonMin) / this.gridSize
    const dLat = (latMax - latMin) / this.gridSize

    this.simulationArea = { lonMin, lonMax, latMin, latMax, dLon, dLat }
    this.textureWidth = this.gridSize + 1
    this.textureHeight = this.gridSize + 1

    const cartographics = []
    for (let j = 0; j <= this.gridSize; j++) {
      for (let i = 0; i <= this.gridSize; i++) {
        cartographics.push(Cesium.Cartographic.fromDegrees(lonMin + i * dLon, latMin + j * dLat))
      }
    }

    let sampled
    try {
      sampled = await Cesium.sampleTerrainMostDetailed(this.viewer.terrainProvider, cartographics)
    } catch {
      throw new Error('Terrain sampling failed')
    }
    if (!sampled || sampled.length === 0) {
      throw new Error('No terrain data')
    }

    const size = this.gridSize + 1
    const totalPixels = size * size

    const terrainArr = new Float32Array(totalPixels * 4)
    for (let idx = 0; idx < sampled.length; idx++) {
      terrainArr[idx * 4] = sampled[idx].height
    }
    this.terrainData = terrainArr

    this.terrainTexture = this._createTexture(gl, size, size, terrainArr, 4)

    const waterArr = new Float32Array(totalPixels * 4)
    this.waterData = waterArr

    this.waterTextureA = this._createTexture(gl, size, size, waterArr, 4)
    this.waterTextureB = this._createTexture(gl, size, size, waterArr, 4)

    const outflowArr = new Float32Array(totalPixels * 4)
    this.outflowTextureA = this._createTexture(gl, size, size, outflowArr, 4)
    this.outflowTextureB = this._createTexture(gl, size, size, outflowArr, 4)

    this.outflowFBO = this._createFBO(gl, this.outflowTextureB)
    this.waterFBO = this._createFBO(gl, this.waterTextureB)

    this.outflowProgram = this._compileProgram(gl, QUAD_VERTEX_SHADER, OUTFLOW_FRAGMENT_SHADER)
    this.waterUpdateProgram = this._compileProgram(gl, QUAD_VERTEX_SHADER, WATER_UPDATE_FRAGMENT_SHADER)
    this.solidColorProgram = this._compileProgram(
      gl,
      'attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }',
      'void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }'
    )

    const quad = this._createQuad(gl)
    this.quadBuffer = quad.buffer
    this.quadVAO = quad.vao

    

    this.initialized = true
  }

  setSourcePoint(lon, lat, waterAmount) {
    if (!this.initialized || !this.simulationArea) return

    const { lonMin, latMin, dLon, dLat } = this.simulationArea
    const srcI = Math.round((lon - lonMin) / dLon)
    const srcJ = Math.round((lat - latMin) / dLat)
    const si = Math.max(0, Math.min(this.gridSize, srcI))
    const sj = Math.max(0, Math.min(this.gridSize, srcJ))

    const size = this.gridSize + 1
    const waterArr = this.waterData
    for (let i = 0; i < size * size; i++) {
      waterArr[i * 4] = 0
    }

    const radius = 20
    for (let di = -radius; di <= radius; di++) {
      for (let dj = -radius; dj <= radius; dj++) {
        const ni = si + di
        const nj = sj + dj
        if (ni < 0 || ni > this.gridSize || nj < 0 || nj > this.gridSize) continue
        const dist = Math.sqrt(di * di + dj * dj)
        if (dist <= radius) {
          const idx = (nj * size + ni) * 4
          const falloff = 1.0 - dist / (radius + 1)
          waterArr[idx] = waterAmount * falloff
        }
      }
    }

    const gl = this._getGL()
    gl.bindTexture(gl.TEXTURE_2D, this.waterTextureA)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size, size, gl.RGBA, gl.FLOAT, waterArr)
    gl.bindTexture(gl.TEXTURE_2D, this.waterTextureB)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size, size, gl.RGBA, gl.FLOAT, waterArr)
    gl.bindTexture(gl.TEXTURE_2D, null)

    this.useBufferA = true
    this._outflowRead = this.outflowTextureA
    this._outflowWrite = this.outflowTextureB
    this._waterRead = this.waterTextureA
    this._waterWrite = this.waterTextureB
    this.sourceSet = true
    this._stepCount = 0

    this._updateCesiumTexture()

  
  
  }

  simulateStep(deltaTime) {
    if (!this.initialized || !this.sourceSet) return

    if (!this._loggedUniforms) {
      console.log('=== Uniforms 检查 (仅一次) ===')
      console.log('u_water texture:', this._waterRead)
      console.log('u_outflow texture:', this._outflowRead)
      console.log('u_cellSize:', 1.0 / this.textureWidth, 1.0 / this.textureHeight)
      console.log('u_timeStep:', this.timeStep || 0.016)
      console.log('u_sourcePoint:', this.sourcePoint || [0.5, 0.5])
      this._loggedUniforms = true
    }

    const gl = this._getGL()
    const size = this.gridSize + 1
    const texelSize = 1.0 / size
    const flowRate = 0.1

    const savedViewport = gl.getParameter(gl.VIEWPORT)
    const savedFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING)
    const savedProgram = gl.getParameter(gl.CURRENT_PROGRAM)

    gl.viewport(0, 0, size, size)

    this._drawQuad(
      gl,
      this.outflowProgram,
      this.outflowFBO,
      {
        u_terrain: this.terrainTexture,
        u_water: this._waterRead,
        u_flowRate: flowRate,
        u_texelSize: texelSize,
      }
    )

    const outflowSwap = this.outflowTextureA
    this.outflowTextureA = this.outflowTextureB
    this.outflowTextureB = outflowSwap
    this.outflowFBO = this._createFBO(gl, this.outflowTextureB)
    this._outflowRead = this.outflowTextureA
    this._outflowWrite = this.outflowTextureB

    this._drawQuad(
      gl,
      this.waterUpdateProgram,
      this.waterFBO,
      {
        u_water: this._waterRead,
        u_outflow: this._outflowRead,
        u_texelSize: texelSize,
        u_sourcePoint: this.sourcePoint || [0.5, 0.5],
      }
    )

    const waterSwap = this.waterTextureA
    this.waterTextureA = this.waterTextureB
    this.waterTextureB = waterSwap
    this.waterFBO = this._createFBO(gl, this.waterTextureB)
    this._waterRead = this.waterTextureA
    this._waterWrite = this.waterTextureB

    gl.viewport(savedViewport[0], savedViewport[1], savedViewport[2], savedViewport[3])
    gl.bindFramebuffer(gl.FRAMEBUFFER, savedFBO)
    gl.useProgram(savedProgram)

    this._stepCount++

    if (this._stepCount % 3 === 0 && this._stepCount > 0) {
      this._updateCesiumTexture()
    }
    //console.log('纹理写入完成，目标纹理 ID:', this._waterRead)
  }

  _createBMP(rgbaData, width, height) {
    const rowSize = width * 4
    const fileSize = 54 + rowSize * height
    const buffer = new ArrayBuffer(fileSize)
    const view = new DataView(buffer)

    view.setUint16(0, 0x4D42, true)
    view.setUint32(2, fileSize, true)
    view.setUint32(10, 54, true)
    view.setUint32(14, 40, true)
    view.setInt32(18, width, true)
    view.setInt32(22, -height, true)
    view.setUint16(26, 1, true)
    view.setUint16(28, 32, true)
    view.setUint32(30, 0, true)
    view.setUint32(34, rowSize * height, true)

    const pixels = new Uint8Array(buffer, 54)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4
        const dstIdx = (y * width + x) * 4
        pixels[dstIdx] = rgbaData[srcIdx + 2]
        pixels[dstIdx + 1] = rgbaData[srcIdx + 1]
        pixels[dstIdx + 2] = rgbaData[srcIdx]
        pixels[dstIdx + 3] = rgbaData[srcIdx + 3]
      }
    }

    return new Blob([buffer], { type: 'image/bmp' })
  }

_updateCesiumTexture() {
    try {
      const gl = this._getGL()
      const size = this.gridSize + 1
      const totalPixels = size * size

      const tempFBO = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, tempFBO)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._waterRead, 0)

      const floatData = new Float32Array(totalPixels * 4)
      gl.readPixels(0, 0, size, size, gl.RGBA, gl.FLOAT, floatData)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.deleteFramebuffer(tempFBO)

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const imageData = ctx.createImageData(size, size)

      for (let i = 0; i < totalPixels; i++) {
        const val = floatData[i * 4]
        if (val > 0.0001) {
          imageData.data[i * 4] = 140
          imageData.data[i * 4 + 1] = 210
          imageData.data[i * 4 + 2] = 255
          const edgeAlpha = Math.min(1.0, (val - 0.0001) / 0.001)
          const waterAlpha = 0.4 / (1 + val * 0.2)
          imageData.data[i * 4 + 3] = Math.floor(edgeAlpha * waterAlpha * 255)
        }
      }

      ctx.putImageData(imageData, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')

      const provider = new Cesium.SingleTileImageryProvider({
        url: dataUrl,
        tileWidth: size,
        tileHeight: size,
        rectangle: Cesium.Rectangle.fromDegrees(
          this.simulationArea.lonMin,
          this.simulationArea.latMin,
          this.simulationArea.lonMax,
          this.simulationArea.latMax
        )
      })

      const newLayer = this.viewer.imageryLayers.addImageryProvider(provider)
      newLayer.alpha = 0.5

      const oldLayer = this._imageryLayer
      this._imageryLayer = newLayer

      if (oldLayer) {
        setTimeout(() => {
          this.viewer.imageryLayers.remove(oldLayer)
        }, 500)
      }
    } catch (e) {
      console.warn('_updateCesiumTexture error:', e)
    }
  }

  startSimulation() {
    if (this._preRenderListener) return

    const scene = this.scene
    let lastTime = performance.now()

    this._preRenderListener = scene.preRender.addEventListener(() => {
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      try {
        this.simulateStep(dt)
      } catch (e) {
        console.warn('simulateStep error:', e)
      }
    })
  }

  stopSimulation() {
    if (this._preRenderListener) {
      this._preRenderListener()
      this._preRenderListener = null
    }
  }

  destroy() {
    this.stopSimulation()

    if (this._imageryLayer) {
      this.viewer.imageryLayers.remove(this._imageryLayer)
      this._imageryLayer = null
    }
    if (this._lastBlobUrl) {
      URL.revokeObjectURL(this._lastBlobUrl)
      this._lastBlobUrl = null
    }

    if (this.renderPrimitive) {
      this.scene.primitives.remove(this.renderPrimitive)
      this.renderPrimitive = null
    }

    const gl = this._getGL()
    if (gl) {
      if (this.terrainTexture) gl.deleteTexture(this.terrainTexture)
      if (this.waterTextureA) gl.deleteTexture(this.waterTextureA)
      if (this.waterTextureB) gl.deleteTexture(this.waterTextureB)
      if (this.outflowTextureA) gl.deleteTexture(this.outflowTextureA)
      if (this.outflowTextureB) gl.deleteTexture(this.outflowTextureB)
      if (this.outflowFBO) gl.deleteFramebuffer(this.outflowFBO)
      if (this.waterFBO) gl.deleteFramebuffer(this.waterFBO)
      if (this.outflowProgram) gl.deleteProgram(this.outflowProgram)
      if (this.waterUpdateProgram) gl.deleteProgram(this.waterUpdateProgram)
      if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer)
      if (this.quadVAO) {
        if (this.vaoExt) this.vaoExt.deleteVertexArrayOES(this.quadVAO)
        else if (this.isWebGL2) gl.deleteVertexArray(this.quadVAO)
      }
    }

    this.initialized = false
  }

  readWaterHeights() {
    if (!this.initialized) return null
    return this.waterData
  }

  getStats() {
    if (!this.waterData) return null
    const size = this.gridSize + 1
    let floodedCount = 0
    const total = size * size
    for (let i = 0; i < total; i++) {
      if (this.waterData[i * 4] > 0.001) floodedCount++
    }
    const pct = Math.round((floodedCount / total) * 100)
    const areaKm2 = Math.round(
      ((this.simulationArea.lonMax - this.simulationArea.lonMin) * 111000 *
        Math.cos(Cesium.Math.toRadians((this.simulationArea.latMin + this.simulationArea.latMax) / 2))) *
      ((this.simulationArea.latMax - this.simulationArea.latMin) * 111000) / 1e6
    )
    return {
      flooded: Math.round(areaKm2 * pct / 100),
      safe: areaKm2 - Math.round(areaKm2 * pct / 100),
      total: areaKm2,
      floodedPct: pct,
    }
  }

}