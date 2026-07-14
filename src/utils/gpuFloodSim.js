import * as Cesium from 'cesium'

// ==================== WebGL 着色器定义 ====================

// 全屏四边形顶点着色器
// 将 [-1,1] 的顶点坐标映射到屏幕，同时生成 [0,1] 的纹理坐标
// 用于所有 GPU 模拟 pass（水流扩散、水位更新等）
const QUAD_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
  }
`

// 出流量计算着色器 (Pass 1/2)
// 对每个像素，比较当前像素的"地形+水位"与四个邻居的"地形+水位"
// 如果当前像素的总高度更高，水会流向邻居
// 输出 RGBA 四通道分别记录向 左/右/下/上 的出流量
// 每个方向最多流出当前像素水量的 25%（防止一次流干）
const OUTFLOW_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D u_terrain;    // 地形高度纹理
  uniform sampler2D u_water;      // 当前水位纹理
  uniform float u_flowRate;       // 流速系数（low/medium/high）
  uniform float u_texelSize;      // 像素间距 = 1/纹理尺寸
  varying vec2 v_texCoord;

  void main() {
    // 当前像素的地形和水位
    float tC = texture2D(u_terrain, v_texCoord).r;
    float wC = texture2D(u_water, v_texCoord).r;
    float totalC = tC + wC;

    vec4 outflow = vec4(0.0);

    // 四个邻居的纹理坐标
    vec2 uvL = v_texCoord + vec2(-u_texelSize, 0.0);
    vec2 uvR = v_texCoord + vec2(u_texelSize, 0.0);
    vec2 uvB = v_texCoord + vec2(0.0, -u_texelSize);
    vec2 uvT = v_texCoord + vec2(0.0, u_texelSize);

    // 边界 clamp，防止越界
    uvL = clamp(uvL, vec2(0.0), vec2(1.0));
    uvR = clamp(uvR, vec2(0.0), vec2(1.0));
    uvB = clamp(uvB, vec2(0.0), vec2(1.0));
    uvT = clamp(uvT, vec2(0.0), vec2(1.0));

    // 左邻居：当前总高度 > 左邻居总高度 → 水向左流
    float tL = texture2D(u_terrain, uvL).r;
    float wL = texture2D(u_water, uvL).r;
    float dL = totalC - (tL + wL);
    if (dL > 0.0) outflow.r = min(dL * u_flowRate, wC * 0.25);

    // 右邻居
    float tR = texture2D(u_terrain, uvR).r;
    float wR = texture2D(u_water, uvR).r;
    float dR = totalC - (tR + wR);
    if (dR > 0.0) outflow.g = min(dR * u_flowRate, wC * 0.25);

    // 下邻居
    float tB = texture2D(u_terrain, uvB).r;
    float wB = texture2D(u_water, uvB).r;
    float dB = totalC - (tB + wB);
    if (dB > 0.0) outflow.b = min(dB * u_flowRate, wC * 0.25);

    // 上邻居
    float tT = texture2D(u_terrain, uvT).r;
    float wT = texture2D(u_water, uvT).r;
    float dT = totalC - (tT + wT);
    if (dT > 0.0) outflow.a = min(dT * u_flowRate, wC * 0.25);

    gl_FragColor = outflow;
  }
`

// 水位更新着色器 (Pass 2/2)
// 读取当前像素的流出量 + 四个邻居流入本像素的量
// 新水位 = 当前水位 + 流入 - 流出（最低为 0）
const WATER_UPDATE_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D u_water;      // 当前水位纹理
  uniform sampler2D u_outflow;    // 出流量纹理（上一个 pass 的输出）
  uniform float u_texelSize;      // 像素间距
  varying vec2 v_texCoord;

  void main() {
    float wC = texture2D(u_water, v_texCoord).r;

    // 当前像素向四个方向的出流量
    float outL = texture2D(u_outflow, v_texCoord).r;
    float outR = texture2D(u_outflow, v_texCoord).g;
    float outB = texture2D(u_outflow, v_texCoord).b;
    float outT = texture2D(u_outflow, v_texCoord).a;

    // 四个邻居的纹理坐标
    vec2 uvL = v_texCoord + vec2(-u_texelSize, 0.0);
    vec2 uvR = v_texCoord + vec2(u_texelSize, 0.0);
    vec2 uvB = v_texCoord + vec2(0.0, -u_texelSize);
    vec2 uvT = v_texCoord + vec2(0.0, u_texelSize);

    uvL = clamp(uvL, vec2(0.0), vec2(1.0));
    uvR = clamp(uvR, vec2(0.0), vec2(1.0));
    uvB = clamp(uvB, vec2(0.0), vec2(1.0));
    uvT = clamp(uvT, vec2(0.0), vec2(1.0));

    // 从邻居的出流量中取"指向本像素"的分量作为本像素的流入
    // 左邻居的右出流 → 本像素的流入
    float inR = texture2D(u_outflow, uvL).g;
    // 右邻居的左出流 → 本像素的流入
    float inL = texture2D(u_outflow, uvR).r;
    // 下邻居的上出流 → 本像素的流入
    float inT = texture2D(u_outflow, uvB).a;
    // 上邻居的下出流 → 本像素的流入
    float inB = texture2D(u_outflow, uvT).b;

    float outflow = outL + outR + outB + outT;
    float inflow = inL + inR + inB + inT;

    float newWater = wC + inflow - outflow;
    newWater = max(newWater, 0.0);

    gl_FragColor = vec4(newWater, 0.0, 0.0, 1.0);
  }
`

// 地形解码着色器：将 RGBA8 编码的地形数据解码为 float 高程值
// 编码方式：height × 1000 → 4 字节整数 → RGBA 四通道
// 精度：1mm，足够覆盖 0~4000km 范围
const TERRAIN_DECODE_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D u_encodedTerrain;
  varying vec2 v_texCoord;

  void main() {
    vec4 c = texture2D(u_encodedTerrain, v_texCoord);
    float r = floor(c.r * 255.0 + 0.5);
    float g = floor(c.g * 255.0 + 0.5);
    float b = floor(c.b * 255.0 + 0.5);
    float intVal = r + g * 256.0 + b * 65536.0;
    float height = intVal / 1000.0;
    gl_FragColor = vec4(height, 0.0, 0.0, 1.0);
  }
`

// 水源初始化着色器：在指定纹理坐标处渲染圆形 falloff 的水量
// 替代 texSubImage2D + FLOAT 上传（在 Edge 上静默失败）
const INIT_WATER_FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 u_sourcePoint;
  uniform float u_waterAmount;
  uniform float u_radius;
  varying vec2 v_texCoord;

  void main() {
    float dist = distance(v_texCoord, u_sourcePoint);
    float falloff = 1.0 - dist / u_radius;
    falloff = max(0.0, falloff);
    float water = u_waterAmount * falloff;
    gl_FragColor = vec4(water, 0.0, 0.0, 1.0);
  }
`

// Cesium 自定义渲染顶点着色器（未启用）
// 作用：将地球表面顶点沿法线方向抬高，抬高量 = 5 + 水位高度
// 这样水面会根据水位值在 3D 球面上起伏
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

// Cesium 自定义渲染片元着色器（未启用，return 截断了）
// 根据水位高度给水面着色：浅水→浅蓝，深水→深蓝，无水→透明
// 注意：第 163 行有 return，所以下面水色逻辑实际未执行，目前渲染为纯红色
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
    this.gl = null                    // WebGL 上下文，延迟获取
    this.isWebGL2 = false             // 是否 WebGL 2.0 环境
    this.gridSize = 256               // 模拟网格分辨率（256x256）

    // 纹理对象：地形 + 水位（双缓冲A/B）+ 出流量（双缓冲A/B）
    this.terrainTexture = null
    this.waterTextureA = null
    this.waterTextureB = null
    this.outflowTextureA = null
    this.outflowTextureB = null

    // 帧缓冲对象：出流FBO + 水位FBO
    this.outflowFBO = null
    this.waterFBO = null

    // 着色器程序
    this.outflowProgram = null
    this.waterUpdateProgram = null
    this.terrainDecodeProgram = null  // 地形解码着色器程序
    this.initWaterProgram = null      // 水源初始化着色器程序
    this.quadBuffer = null            // 全屏四边形顶点缓冲
    this.quadVAO = null               // VAO（WebGL 2）或 VAO 扩展
    this.vaoExt = null                // OES_vertex_array_object 扩展

    this.renderPrimitive = null       // Cesium CustomShader 渲染图元（未启用）
    this._imageryLayer = null         // 当前 Cesium 影像图层
    this._lastBlobUrl = null          // 上一个 blob URL（用于回收）

    // 双缓冲切换标志
    this.useBufferA = true
    this._outflowRead = null          // 当前读取的出流纹理
    this._outflowWrite = null         // 当前写入的出流纹理
    this._waterRead = null            // 当前读取的水位纹理
    this._waterWrite = null           // 当前写入的水位纹理
    this._cachedBoundary = []         // 缓存的洪水边界多边形坐标
    this.initialized = false          // 是否已完成 init
    this.sourceSet = false            // 是否已设置水源点
    this.simulationArea = null        // 模拟区域 {lonMin, lonMax, latMin, latMax, dLon, dLat}
    this.terrainData = null           // CPU 端地形数据备份
    this.waterData = null             // CPU 端水位数据备份

    this._preRenderListener = null    // Cesium preRender 事件监听器
    this._waterLevel = 0              // 当前平均水位
    this._stepCount = 0               // 模拟步数计数器
    this.flowRate = 0.1               // 默认流速系数
    this._glFormat = null             // WebGL 1/2 兼容的纹理格式
    this._glInternalFormat = null     // WebGL 1/2 兼容的内部格式
  }

  // 获取 WebGL 上下文（延迟初始化，首次调用时从 Cesium 场景中获取）
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

  // 编译单个着色器，失败时抛出异常
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

  // 编译着色器程序（顶点 + 片元），失败时抛出异常
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

  // 创建 WebGL 纹理：WebGL2 用 RGBA32F，WebGL1 用 RGBA+FLOAT 扩展
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

  // 创建帧缓冲对象（FBO），绑定颜色纹理，检查完整性
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

  // 创建全屏四边形（两个三角形覆盖 [-1,1] 范围），含顶点坐标和纹理坐标
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

  // 绘制全屏四边形到指定 FBO，自动设置 uniform（纹理/数组/数字/布尔）
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

  // 初始化模拟：采样地形 → 创建纹理/FBO → 编译着色器 → 标记 ready
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

    // 将 Float32Array 高程值编码为 RGBA8 Uint8Array（绕过 Edge FLOAT 上传 bug）
    // 编码：height × 1000 → 4 字节整数 → RGBA
    const encodedTerrain = new Uint8Array(totalPixels * 4)
    for (let i = 0; i < sampled.length; i++) {
      const intVal = Math.round(sampled[i].height * 1000)
      const off = i * 4
      encodedTerrain[off] = intVal & 0xFF
      encodedTerrain[off + 1] = (intVal >> 8) & 0xFF
      encodedTerrain[off + 2] = (intVal >> 16) & 0xFF
      encodedTerrain[off + 3] = 255
    }

    // 绕过 Edge WebGL texImage2D 所有非 Image 数据源静默失败 bug：
    // 唯一可靠路径：Canvas → DataURL → Image.onload → texImage2D(Image)
    const terrainCanvas = document.createElement('canvas')
    terrainCanvas.width = size
    terrainCanvas.height = size
    const ctx = terrainCanvas.getContext('2d')
    const imageData = ctx.createImageData(size, size)
    imageData.data.set(encodedTerrain)
    ctx.putImageData(imageData, 0, 0)

    const terrainImg = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('地形编码图像加载失败'))
      img.src = terrainCanvas.toDataURL()
    })

    // 必须先创建 quad，后续手动绘制依赖它
    const quad = this._createQuad(gl)
    this.quadBuffer = quad.buffer
    this.quadVAO = quad.vao

    const encodedTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, encodedTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, terrainImg)

    // 创建浮点纹理作为解码目标
    this.terrainTexture = this._createTexture(gl, size, size, null, 4)

    // 编译解码着色器，将 RGBA8 编码纹理 → 浮点纹理
    this.terrainDecodeProgram = this._compileProgram(gl, QUAD_VERTEX_SHADER, TERRAIN_DECODE_FRAGMENT_SHADER)

    // 创建临时 FBO，渲染解码到浮点纹理
    const decodeFBO = this._createFBO(gl, this.terrainTexture)

    const savedViewport = gl.getParameter(gl.VIEWPORT)
    const savedFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING)
    const savedProgram = gl.getParameter(gl.CURRENT_PROGRAM)
    gl.viewport(0, 0, size, size)

    // 在地形解码 FBO 上渲染解码着色器
    gl.bindFramebuffer(gl.FRAMEBUFFER, decodeFBO)
    gl.useProgram(this.terrainDecodeProgram)

    if (this.isWebGL2 && this.quadVAO) {
      gl.bindVertexArray(this.quadVAO)
    }

    const texLoc = gl.getUniformLocation(this.terrainDecodeProgram, 'u_encodedTerrain')
    if (texLoc !== null) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, encodedTex)
      gl.uniform1i(texLoc, 0)
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if (this.isWebGL2 && this.quadVAO) {
      gl.bindVertexArray(null)
    }

    gl.viewport(savedViewport[0], savedViewport[1], savedViewport[2], savedViewport[3])
    gl.bindFramebuffer(gl.FRAMEBUFFER, savedFBO)
    gl.useProgram(savedProgram)

    // 清理临时资源
    gl.deleteFramebuffer(decodeFBO)
    gl.deleteTexture(encodedTex)

    const waterArr = new Float32Array(totalPixels * 4)
    this.waterData = waterArr

    this.waterTextureA = this._createTexture(gl, size, size, null, 4)
    this.waterTextureB = this._createTexture(gl, size, size, null, 4)

    const outflowArr = new Float32Array(totalPixels * 4)
    this.outflowTextureA = this._createTexture(gl, size, size, null, 4)
    this.outflowTextureB = this._createTexture(gl, size, size, null, 4)

    this.outflowFBO = this._createFBO(gl, this.outflowTextureB)
    this.waterFBO = this._createFBO(gl, this.waterTextureB)

    this.outflowProgram = this._compileProgram(gl, QUAD_VERTEX_SHADER, OUTFLOW_FRAGMENT_SHADER)
    this.waterUpdateProgram = this._compileProgram(gl, QUAD_VERTEX_SHADER, WATER_UPDATE_FRAGMENT_SHADER)
    this.initWaterProgram = this._compileProgram(gl, QUAD_VERTEX_SHADER, INIT_WATER_FRAGMENT_SHADER)
    this.solidColorProgram = this._compileProgram(
      gl,
      'attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }',
      'void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }'
    )

    

    this.initialized = true
  }

  // 设置水源点：在指定经纬度放置初始水量，以圆形 falloff 扩散
  // 将水位数据写入 GPU 纹理（双缓冲都写），然后更新 Cesium 显示
  setSourcePoint(lon, lat, waterAmount) {
    if (!this.initialized || !this.simulationArea) return

    const { lonMin, latMin, dLon, dLat } = this.simulationArea
    const srcI = Math.round((lon - lonMin) / dLon)
    const srcJ = Math.round((lat - latMin) / dLat)
    const si = Math.max(0, Math.min(this.gridSize, srcI))
    const sj = Math.max(0, Math.min(this.gridSize, srcJ))

    this.sourcePoint = [si / this.gridSize, 1.0 - sj / this.gridSize]

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

    // 使用着色器渲染水源到水位纹理（替代 texSubImage2D + FLOAT，Edge 上静默失败）
    const savedViewport = gl.getParameter(gl.VIEWPORT)
    const savedFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING)
    const savedProgram = gl.getParameter(gl.CURRENT_PROGRAM)
    gl.viewport(0, 0, size, size)

    const initFBO_A = this._createFBO(gl, this.waterTextureA)
    this._drawQuad(gl, this.initWaterProgram, initFBO_A, {
      u_sourcePoint: this.sourcePoint,
      u_waterAmount: waterAmount,
      u_radius: radius / size,
    })
    gl.deleteFramebuffer(initFBO_A)

    const initFBO_B = this._createFBO(gl, this.waterTextureB)
    this._drawQuad(gl, this.initWaterProgram, initFBO_B, {
      u_sourcePoint: this.sourcePoint,
      u_waterAmount: waterAmount,
      u_radius: radius / size,
    })
    gl.deleteFramebuffer(initFBO_B)

    gl.viewport(savedViewport[0], savedViewport[1], savedViewport[2], savedViewport[3])
    gl.bindFramebuffer(gl.FRAMEBUFFER, savedFBO)
    gl.useProgram(savedProgram)

    this.useBufferA = true
    this._outflowRead = this.outflowTextureA
    this._outflowWrite = this.outflowTextureB
    this._waterRead = this.waterTextureA
    this._waterWrite = this.waterTextureB
    this.sourceSet = true
    this._stepCount = 0

    this._updateCesiumTexture()

  }

  // 设置流速系数（0.01 ~ 1.0）
  setFlowRate(rate) {
    this.flowRate = Math.max(0.01, Math.min(1.0, rate))
  }

  // 执行一帧 GPU 模拟：Pass 1 计算出流量 → 交换出流缓冲 → Pass 2 更新水位 → 交换水位缓冲
  // 每 3 帧回读一次纹理更新 Cesium 显示
  simulateStep(deltaTime) {
    if (!this.initialized || !this.sourceSet) return

    const gl = this._getGL()
    const size = this.gridSize + 1
    const texelSize = 1.0 / size
    const flowRate = this.flowRate || 0.1

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
  }

  // 将 RGBA 像素数据编码为 BMP 文件（BGR 格式，带文件头）
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

  // 从 GPU 回读水位纹理 → 生成 canvas 图像 → 通过 SingleTileImageryProvider 叠加到 Cesium 地图
  // 同时提取洪水边界多边形
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

      this._computeBoundaryFromData(floatData, size, gl)

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const imageData = ctx.createImageData(size, size)

      const t = this._stepCount * 0.03
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = y * size + x
          const val = floatData[i * 4]
          if (val > 0.0001) {
            const ci = (y * size + x) * 4
            const ripple = 1.0 + 0.06 * Math.sin(x * 0.35 + t * 1.7) * Math.cos(y * 0.35 + t * 1.3)
            imageData.data[ci] = Math.min(255, 140 * ripple)
            imageData.data[ci + 1] = Math.min(255, 210 * ripple)
            imageData.data[ci + 2] = Math.min(255, 255 * ripple)
            const edgeAlpha = Math.min(1.0, (val - 0.0001) / 0.001)
            const waterAlpha = 0.4 / (1 + val * 0.2)
            imageData.data[ci + 3] = Math.floor(edgeAlpha * waterAlpha * 255)
          }
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
        ),
        tilingScheme: new Cesium.GeographicTilingScheme()
      })

      const newLayer = this.viewer.imageryLayers.addImageryProvider(provider)
      newLayer.alpha = 0.5
      newLayer.hasAlphaChannel = true

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

  // 从浮点水位数据中提取洪水边界：阈值 > 0.0001 的二值网格 → marchingSquares 等值线
  _computeBoundaryFromData(floatData, size, gl) {
    if (!this.sourcePoint) return
    const { lonMin, latMin, lonMax, latMax } = this.simulationArea

    const threshold = 0.0001
    const grid = []
    for (let y = 0; y < size; y++) {
      grid[y] = []
      for (let x = 0; x < size; x++) {
        const val = floatData[(y * size + x) * 4]
        grid[y][x] = val > threshold
      }
    }

    const contours = marchingSquares(grid, threshold, size, size)
    if (contours.length === 0) {
      this._cachedBoundary = []
      return
    }

    let maxContour = contours[0]
    for (const c of contours) {
      if (c.length > maxContour.length) {
        maxContour = c
      }
    }

    const toLon = (px) => lonMin + (px / size) * (lonMax - lonMin)
    const toLat = (py) => latMax - (py / size) * (latMax - latMin)
    const coords = []
    for (const [x, y] of maxContour) {
      coords.push(toLon(x), toLat(y))
    }

    this._cachedBoundary = coords
  }

  // 从 GPU 回读水位数据并用 marchingSquares 提取边界（getFloodBoundary 的 fallback）
  _readPixelsAndExtract() {
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
  
    const { lonMin, latMin, lonMax, latMax } = this.simulationArea

    const threshold = 0.0001
    const grid = []
    for (let y = 0; y < size; y++) {
      grid[y] = []
      for (let x = 0; x < size; x++) {
        const val = floatData[(y * size + x) * 4]
        grid[y][x] = val > threshold
      }
    }

    const contours = marchingSquares(grid, threshold, size, size)
    if (contours.length === 0) {
      return []
    }

    let maxContour = contours[0]
    for (const c of contours) {
      if (c.length > maxContour.length) {
        maxContour = c
      }
    }

    const toLon = (px) => lonMin + (px / size) * (lonMax - lonMin)
    const toLat = (py) => latMax - (py / size) * (latMax - latMin)
    const coords = []
    for (const [x, y] of maxContour) {
      coords.push(toLon(x), toLat(y))
    }

    console.log('getFloodBoundary 提取完成, 轮廓点数:', coords.length / 2, '轮廓数:', contours.length)
    return coords
  }

  // 获取洪水淹没范围多边形（经纬度坐标数组），优先返回缓存，否则回读 GPU
  getFloodBoundary() {
    if (this._cachedBoundary.length >= 6) {
      return this._cachedBoundary
    }
    return this._readPixelsAndExtract()
  }

  // 开始模拟：注册 Cesium preRender 事件，每帧调用 simulateStep
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

  // 停止模拟：移除 preRender 事件监听
  stopSimulation() {
    if (this._preRenderListener) {
      this._preRenderListener()
      this._preRenderListener = null
    }
  }

  // 销毁：停止模拟 + 清理 Cesium 图层 + 释放所有 WebGL 资源
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
      if (this.terrainDecodeProgram) gl.deleteProgram(this.terrainDecodeProgram)
      if (this.initWaterProgram) gl.deleteProgram(this.initWaterProgram)
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

function marchingSquares(grid, threshold, w, h) {
  const segments = {}
  const key = (x, y) => x + ',' + y

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = grid[y][x] ? 1 : 0
      const tr = grid[y][x + 1] ? 1 : 0
      const br = grid[y + 1][x + 1] ? 1 : 0
      const bl = grid[y + 1][x] ? 1 : 0
      const idx = tl | (tr << 1) | (br << 2) | (bl << 3)
      if (idx === 0 || idx === 15) continue

      const mx = x + 0.5
      const my = y + 0.5

      const edges = {
        top: [mx, y],
        right: [x + 1, my],
        bottom: [mx, y + 1],
        left: [x, my],
      }

      const segs = []
      switch (idx) {
        case 1: case 14: segs.push([edges.left, edges.top]); break
        case 2: case 13: segs.push([edges.top, edges.right]); break
        case 3: case 12: segs.push([edges.left, edges.right]); break
        case 4: case 11: segs.push([edges.bottom, edges.right]); break
        case 5: segs.push([edges.left, edges.top]); segs.push([edges.bottom, edges.right]); break
        case 6: case 9:  segs.push([edges.top, edges.bottom]); break
        case 7: case 8:  segs.push([edges.left, edges.bottom]); break
        case 10: segs.push([edges.top, edges.right]); segs.push([edges.bottom, edges.left]); break
      }

      for (const [a, b] of segs) {
        const ka = key(a[0], a[1])
        const kb = key(b[0], b[1])
        if (!segments[ka]) segments[ka] = []
        segments[ka].push(kb)
        if (!segments[kb]) segments[kb] = []
        segments[kb].push(ka)
      }
    }
  }

  const visited = new Set()
  const contours = []
  for (const startKey of Object.keys(segments)) {
    if (visited.has(startKey)) continue
    const contour = []
    const stack = [startKey]
    while (stack.length > 0) {
      const cur = stack.pop()
      if (visited.has(cur)) continue
      visited.add(cur)
      const [cx, cy] = cur.split(',').map(Number)
      contour.push([cx, cy])
      for (const n of segments[cur] || []) {
        if (!visited.has(n)) stack.push(n)
      }
    }
    if (contour.length >= 6) {
      contours.push(contour)
    }
  }

  return contours
}