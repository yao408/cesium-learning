import * as Cesium from 'cesium'

export function useViewshedGPU() {
  let gpuAnalysis = null

  class GPUViewshed {
    constructor(viewer, viewPosition, visualRange, visibleColor, invisibleColor, fovH = 360, fovV = 90, heading, pitch) {
      this.viewer = viewer
      this.viewPosition = viewPosition
      this.visualRange = visualRange
      this.visibleColor = visibleColor
      this.invisibleColor = invisibleColor
      this.fovH = fovH
      this.fovV = fovV
      this.heading = heading
      this.pitch = pitch
      this._create()
      this._postRenderCallback = () => this._updateLightCamera()
      this.viewer.scene.postRender.addEventListener(this._postRenderCallback)
    }

    _create() {
      this._createLightCamera()
      this._createShadowMap()
      this._createPostStage()
      this._createFrustumVisual()
    }

    _createLightCamera() {
      this.lightCamera = new Cesium.Camera(this.viewer.scene)
      this._updateLightCamera()
      this.lightCamera.frustum.near = 0.001 * this.visualRange
      this.lightCamera.frustum.far = this.visualRange
      this.lightCamera.frustum.fov = Cesium.Math.toRadians(this.fovV)
      this.lightCamera.frustum.aspectRatio = 1.0
    }

    _updateLightCamera() {
      this.lightCamera.position = this.viewPosition
      const finalHeading = this.heading != null ? this.heading : Cesium.Math.toDegrees(this.viewer.camera.heading)
      const finalPitch = this.pitch != null ? this.pitch : Cesium.Math.toDegrees(this.viewer.camera.pitch)
      this.lightCamera.setView({
        destination: this.viewPosition,
        orientation: {
          heading: Cesium.Math.toRadians(finalHeading),
          pitch: Cesium.Math.toRadians(finalPitch),
          roll: 0,
        },
      })
    }

    _createShadowMap() {
      this._originalShadowMap = this.viewer.scene.shadowMap
      this._originalShadowMode = this.viewer.scene.globe.shadows
      this.shadowMap = new Cesium.ShadowMap({
        context: this.viewer.scene.context,
        lightCamera: this.lightCamera,
        enabled: true,
        isPointLight: true,
        pointLightRadius: this.visualRange,
        cascadesEnabled: false,
        size: 2048,
        softShadows: true,
        normalOffset: false,
        fromLightSource: false,
      })
      this.viewer.scene.shadowMap = this.shadowMap
      this.viewer.scene.globe.shadows = Cesium.ShadowMode.ENABLED
      this.viewer.scene.globe.depthTestAgainstTerrain = true
    }

    _createPostStage() {
      const self = this
      const vc = self.visibleColor
      const ic = self.invisibleColor

      const fs = `
        uniform sampler2D colorTexture;
        uniform sampler2D depthTexture;
        in vec2 v_textureCoordinates;
        uniform mat4 camera_projection_matrix;
        uniform mat4 camera_view_matrix;
        uniform float far;
        uniform samplerCube shadowMap_textureCube;
        uniform mat4 shadowMap_matrix;
        uniform vec4 shadowMap_lightPositionEC;
        uniform vec4 shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness;
        uniform vec4 shadowMap_texelSizeDepthBiasAndNormalShadingSmooth;
        uniform float fullSphere;

        struct zx_shadowParameters {
          vec3 texCoords;
          float depthBias;
          float depth;
          float nDotL;
          vec2 texelStepSize;
          float normalShadingSmooth;
          float darkness;
        };

        vec3 uvwadd(vec3 uvw, vec2 tar) {
          return vec3(uvw.xy + tar, uvw.z);
        }

        float czm_shadowVisibility(samplerCube shadowMap, zx_shadowParameters sp) {
          float depth = sp.depth - sp.depthBias;
          vec3 uvw = sp.texCoords;
          vec2 tss = sp.texelStepSize;
          float radius = 1.0;
          float dx0 = -tss.x * radius, dy0 = -tss.y * radius;
          float dx1 = tss.x * radius, dy1 = tss.y * radius;

          float visibility = czm_shadowDepthCompare(shadowMap, uvw, depth);
          if (visibility == 1.0) return 1.0;
          visibility = czm_shadowDepthCompare(shadowMap, uvwadd(uvw, vec2(dx0, dy0)), depth) +
            czm_shadowDepthCompare(shadowMap, uvwadd(uvw, vec2(0.0, dy0)), depth) +
            czm_shadowDepthCompare(shadowMap, uvwadd(uvw, vec2(dx1, dy0)), depth) +
            czm_shadowDepthCompare(shadowMap, uvwadd(uvw, vec2(dx0, 0.0)), depth) +
            czm_shadowDepthCompare(shadowMap, uvwadd(uvw, vec2(dx1, 0.0)), depth) +
            czm_shadowDepthCompare(shadowMap, uvwadd(uvw, vec2(0.0, dy1)), depth) +
            czm_shadowDepthCompare(shadowMap, uvwadd(uvw, vec2(dx0, dy1)), depth) +
            czm_shadowDepthCompare(shadowMap, uvwadd(uvw, vec2(dx1, dy1)), depth);
          return visibility >= 3.0 ? 1.0 : 0.0;
        }

        vec4 toEye(in vec2 uv, in float depth) {
          vec2 xy = vec2(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
          vec4 pos = czm_inverseProjection * vec4(xy, depth, 1.0);
          return pos / pos.w;
        }

        float getDepth(in vec4 d) {
          float z = czm_reverseLogDepth(czm_unpackDepth(d));
          float n = czm_depthRange.near, f = czm_depthRange.far;
          return (2.0 * z - n - f) / (f - n);
        }

        float shadow(in vec4 positionEC) {
          zx_shadowParameters sp;
          sp.texelStepSize = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.xy;
          sp.depthBias = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z;
          sp.normalShadingSmooth = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.w;
          sp.darkness = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.w;
          vec3 dirEC = positionEC.xyz - shadowMap_lightPositionEC.xyz;
          float dist = length(dirEC);
          float radius = shadowMap_lightPositionEC.w;
          if (dist > radius) return 2.0;
          vec3 dirWC = czm_inverseViewRotation * normalize(dirEC);
          sp.depth = dist / radius - 0.0003;
          sp.nDotL = clamp(dot(vec3(1.0), -normalize(dirEC)), 0.0, 1.0);
          sp.texCoords = dirWC;
          return czm_shadowVisibility(shadowMap_textureCube, sp);
        }

        bool inFrustum(in vec4 v) {
          v /= v.w;
          return all(greaterThanEqual(v.xyz, vec3(-1.0))) && all(lessThanEqual(v.xyz, vec3(1.0)));
        }

        out vec4 fragColor;
        void main() {
          fragColor = texture(colorTexture, v_textureCoordinates);
          float depth = getDepth(texture(depthTexture, v_textureCoordinates));
          vec4 viewPos = toEye(v_textureCoordinates, depth);
          vec4 worldPos = czm_inverseView * viewPos;
          vec4 vcPos = camera_view_matrix * worldPos;
          float near = 0.001 * far;
          float dis = length(vcPos.xyz);
          if (dis > near && dis < far) {
            if (fullSphere > 0.5 || inFrustum(camera_projection_matrix * vcPos)) {
              float vis = shadow(viewPos);
              if (vis >= 0.3) {
                fragColor = mix(fragColor, vec4(${vc.red.toFixed(1)}, ${vc.green.toFixed(1)}, ${vc.blue.toFixed(1)}, ${vc.alpha.toFixed(1)}), 0.45);
              } else {
                fragColor = mix(fragColor, vec4(${ic.red.toFixed(1)}, ${ic.green.toFixed(1)}, ${ic.blue.toFixed(1)}, ${ic.alpha.toFixed(1)}), 0.45);
              }
            }
          }
        }`

      this.postStage = new Cesium.PostProcessStage({
        fragmentShader: fs,
        uniforms: {
          camera_projection_matrix: () => self.lightCamera.frustum.projectionMatrix,
          camera_view_matrix: () => self.lightCamera.viewMatrix,
          far: () => self.visualRange,
          fullSphere: () => self.fovH >= 360 ? 1.0 : 0.0,
          shadowMap_textureCube: () => {
            self.shadowMap.update(Reflect.get(self.viewer.scene, '_frameState'))
            return Reflect.get(self.shadowMap, '_shadowMapTexture')
          },
          shadowMap_matrix: () => {
            self.shadowMap.update(Reflect.get(self.viewer.scene, '_frameState'))
            return Reflect.get(self.shadowMap, '_shadowMapMatrix')
          },
          shadowMap_lightPositionEC: () => {
            self.shadowMap.update(Reflect.get(self.viewer.scene, '_frameState'))
            return Reflect.get(self.shadowMap, '_lightPositionEC')
          },
          shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: () => {
            self.shadowMap.update(Reflect.get(self.viewer.scene, '_frameState'))
            const bias = self.shadowMap._pointBias
            return Cesium.Cartesian4.fromElements(
              bias.normalOffsetScale, self.shadowMap._distance,
              self.shadowMap.maximumDistance, 0.0, new Cesium.Cartesian4()
            )
          },
          shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: () => {
            self.shadowMap.update(Reflect.get(self.viewer.scene, '_frameState'))
            const bias = self.shadowMap._pointBias
            const texelStepSize = new Cesium.Cartesian2(
              1.0 / self.shadowMap._textureSize.x, 1.0 / self.shadowMap._textureSize.y
            )
            return Cesium.Cartesian4.fromElements(
              texelStepSize.x, texelStepSize.y,
              bias.depthBias, bias.normalShadingSmooth, new Cesium.Cartesian4()
            )
          },
        },
      })
      this.viewer.scene.postProcessStages.add(this.postStage)
    }

    _createFrustumVisual() {
      const halfFovH = Cesium.Math.toRadians(this.fovH * 0.5)
      const halfFovV = Cesium.Math.toRadians(this.fovV * 0.5)
      const headingCenter = Cesium.Math.toRadians(
        this.heading != null ? this.heading : Cesium.Math.toDegrees(this.viewer.camera.heading)
      )
      const pitchCenter = Cesium.Math.toRadians(
        this.pitch != null ? this.pitch : Cesium.Math.toDegrees(this.viewer.camera.pitch)
      )
      const R = this.visualRange
      const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(this.viewPosition)
      const pitchLayers = 6
      const headingSteps = 48

      const pMin = Math.max(pitchCenter - halfFovV, Cesium.Math.toRadians(-90))
      const pMax = pitchCenter + halfFovV
      const hMin = headingCenter - halfFovH, hMax = headingCenter + halfFovH

      this._frustumEntities = []

      for (let layer = 0; layer < pitchLayers - 1; layer++) {
        const p1 = pMin + layer * (pMax - pMin) / (pitchLayers - 1)
        const p2 = pMin + (layer + 1) * (pMax - pMin) / (pitchLayers - 1)
        const cp1 = Math.cos(p1), sp1 = Math.sin(p1)
        const cp2 = Math.cos(p2), sp2 = Math.sin(p2)
        const positions = []
        for (let j = 0; j <= headingSteps; j++) {
          const h = headingCenter - halfFovH + j * (2 * halfFovH) / headingSteps
          const enu = new Cesium.Cartesian3(R * cp1 * Math.sin(h), R * cp1 * Math.cos(h), R * sp1)
          positions.push(Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3()))
        }
        for (let j = headingSteps; j >= 0; j--) {
          const h = headingCenter - halfFovH + j * (2 * halfFovH) / headingSteps
          const enu = new Cesium.Cartesian3(R * cp2 * Math.sin(h), R * cp2 * Math.cos(h), R * sp2)
          positions.push(Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3()))
        }
        const entity = this.viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(positions),
            material: Cesium.Color.DODGERBLUE.withAlpha(0.15),
            perPositionHeight: true,
          },
          id: `cityViewshedFrustum_strip_${layer}`,
        })
        this._frustumEntities.push(entity)
      }

      const outlinePositions = []
      const N = 48
      const toWorld = (h, p) => {
        const enu = new Cesium.Cartesian3(R * Math.cos(p) * Math.sin(h), R * Math.cos(p) * Math.cos(h), R * Math.sin(p))
        return Cesium.Matrix4.multiplyByPoint(enuToFixed, enu, new Cesium.Cartesian3())
      }
      for (let i = 0; i <= N; i++) outlinePositions.push(toWorld(hMin + i * (hMax - hMin) / N, pMax))
      for (let i = 0; i <= N; i++) outlinePositions.push(toWorld(hMax, pMax - i * (pMax - pMin) / N))
      for (let i = 0; i <= N; i++) outlinePositions.push(toWorld(hMax - i * (hMax - hMin) / N, pMin))
      for (let i = 0; i <= N; i++) outlinePositions.push(toWorld(hMin, pMin + i * (pMax - pMin) / N))
      this._frustumEntities.push(
        this.viewer.entities.add({
          polyline: {
            positions: outlinePositions,
            width: 2,
            material: Cesium.Color.DODGERBLUE.withAlpha(0.65),
            clampToGround: false,
          },
          id: 'cityViewshedFrustum_outline',
        })
      )

      const spokePositions = []
      const spokes = 12
      for (let k = 0; k < spokes; k++) {
        const t = k / spokes
        const h = hMin + t * (hMax - hMin)
        spokePositions.push(this.viewPosition, toWorld(h, pMax))
        spokePositions.push(this.viewPosition, toWorld(hMax, pMax - t * (pMax - pMin)))
        spokePositions.push(this.viewPosition, toWorld(hMax - t * (hMax - hMin), pMin))
        spokePositions.push(this.viewPosition, toWorld(hMin, pMin + t * (pMax - pMin)))
      }
      this._frustumEntities.push(
        this.viewer.entities.add({
          polyline: {
            positions: spokePositions,
            width: 1,
            material: Cesium.Color.WHITE.withAlpha(0.25),
            clampToGround: false,
          },
          id: 'cityViewshedFrustum_spokes',
        })
      )
    }

    destroy() {
      if (this.postStage) {
        this.viewer.scene.postProcessStages.remove(this.postStage)
        this.postStage = null
      }
      if (this._frustumEntities) {
        this._frustumEntities.forEach(e => this.viewer.entities.remove(e))
        this._frustumEntities = null
      }
      if (this._postRenderCallback) {
        this.viewer.scene.postRender.removeEventListener(this._postRenderCallback)
        this._postRenderCallback = null
      }
      this.viewer.scene.shadowMap = this._originalShadowMap || null
      this.viewer.scene.globe.shadows = this._originalShadowMode ?? Cesium.ShadowMode.RECEIVE_ONLY
      this.shadowMap = null
      this.lightCamera = null
    }
  }

  async function runGPUViewshed(viewer, options) {
    if (gpuAnalysis) {
      gpuAnalysis.destroy()
      gpuAnalysis = null
    }
    const { centerLon, centerLat, groundHeight, observerHeight, maxDistance, fovH, fovV, heading, pitch } = options
    let finalGroundH = groundHeight
    if (finalGroundH == null) {
      try {
        const h = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [
          Cesium.Cartographic.fromDegrees(centerLon, centerLat),
        ])
        finalGroundH = h[0]?.height ?? 0
      } catch (e) {
        finalGroundH = 0
      }
    }
    const totalH = finalGroundH + (observerHeight || 0) + 2.1
    const viewPos = Cesium.Cartesian3.fromDegrees(centerLon, centerLat, totalH)

    gpuAnalysis = new GPUViewshed(
      viewer, viewPos, maxDistance || 5000,
      Cesium.Color.GREEN.withAlpha(0.45),
      Cesium.Color.RED.withAlpha(0.45),
      fovH != null ? fovH : 360,
fovV != null ? fovV : 90,
      heading,
      pitch,
    )
  }

  function clearGPUViewshed() {
    if (gpuAnalysis) {
      gpuAnalysis.destroy()
      gpuAnalysis = null
    }
  }

  return { runGPUViewshed, clearGPUViewshed }
}