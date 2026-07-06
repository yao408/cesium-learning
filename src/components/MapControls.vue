<template>
  <div class="map-controls">
    <div class="compass" :style="{ transform: `rotate(${heading}deg)` }" @click="resetNorth" title="指北 · 点击复位">
      <svg viewBox="0 0 100 100" class="compass-star">
        <polygon points="50,5 65,50 50,55 35,50" fill="#333" />
      </svg>
    </div>
    <div class="scale-bar">
      <div class="scale-ruler" :style="{ width: scaleBarWidth + 'px' }">
        <div class="ruler-tick tall"></div>
        <div class="ruler-tick short"></div>
        <div class="ruler-tick tiny"></div>
        <div class="ruler-tick short"></div>
        <div class="ruler-tick tiny"></div>
        <div class="ruler-tick short"></div>
        <div class="ruler-tick tiny"></div>
        <div class="ruler-tick short"></div>
        <div class="ruler-tick tall"></div>
        <div class="ruler-line"></div>
      </div>
      <span class="scale-label">{{ scaleLabel }}</span>
    </div>
  </div>
</template>

<script>
import * as Cesium from 'cesium'
import { useViewerStore } from '../stores/viewerStore.js'

export default {
  data() {
    return { heading: 0, scaleLabel: '', scaleBarWidth: 100 }
  },
  computed: {
    viewer() { return useViewerStore().viewer },
  },
  methods: {
    update() {
      if (!this.viewer) return
      const camera = this.viewer.camera
      this.heading = -Cesium.Math.toDegrees(camera.heading)

      const canvas = this.viewer.scene.canvas
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return

      let dist
      const center = new Cesium.Cartesian2(w / 2, h / 2)
      const ray = camera.getPickRay(center)
      if (ray) {
        const groundPos = this.viewer.scene.globe.pick(ray, this.viewer.scene)
        if (Cesium.defined(groundPos)) {
          dist = Cesium.Cartesian3.distance(camera.position, groundPos)
        }
      }
      if (!dist || dist <= 0) {
        const carto = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(camera.position)
        dist = carto.height
      }
      if (!dist || dist <= 0) { this.scaleLabel = ''; return }

      const fov = camera.frustum.fov || Cesium.Math.toRadians(60)
      const pixelPerMeter = h / (2 * dist * Math.tan(fov / 2))
      const nice = [1, 2, 5, 10, 20, 50, 100, 150, 200, 250, 300, 400, 500, 750,
        1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500,
        10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000,
        100000, 150000, 200000, 250000, 300000, 400000, 500000]
      let niceVal = 0
      for (let i = 0; i < nice.length; i++) {
        const px = nice[i] * pixelPerMeter
        if (px >= 60 && px <= 150) { niceVal = nice[i]; this.scaleBarWidth = Math.round(px); break }
        if (px > 150) { niceVal = nice[i]; this.scaleBarWidth = Math.round(px); break }
      }
      if (!niceVal) { niceVal = nice[nice.length - 1]; this.scaleBarWidth = Math.round(niceVal * pixelPerMeter) }
      if (niceVal >= 1000) this.scaleLabel = (niceVal / 1000).toFixed(niceVal % 1000 === 0 ? 0 : 1) + ' km'
      else this.scaleLabel = niceVal + ' m'
    },
    resetNorth() {
      if (!this.viewer) return
      this.viewer.camera.flyTo({
        destination: this.viewer.camera.position,
        orientation: { heading: 0, pitch: this.viewer.camera.pitch, roll: 0 },
        duration: 0.5,
      })
    },
  },
  mounted() {
    const store = useViewerStore()
    if (store.viewer) {
      store.viewer.camera.changed.addEventListener(this.update)
      this.update()
    }
  },
  beforeUnmount() {
    const store = useViewerStore()
    if (store.viewer) {
      store.viewer.camera.changed.removeEventListener(this.update)
    }
  },
}
</script>

<style scoped>
.map-controls {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
}
.map-controls > * { pointer-events: auto; }

.compass {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
  background: rgba(255,255,255,0.45);
  border-radius: 50%;
  padding: 2px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
.compass:hover { filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3)); }
.compass-star {
  width: 100%;
  height: 100%;
}

.scale-bar {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
  background: rgba(255,255,255,0.45);
  padding: 6px 8px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  transform: scale(0.85);
  transform-origin: right bottom;
}
.scale-ruler {
  position: relative;
  height: 14px;
}
.ruler-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1.5px;
  background: #333;
}
.ruler-tick {
  position: absolute;
  bottom: 0;
  width: 1.5px;
  background: #333;
}
.ruler-tick.tall  { height: 14px; }
.ruler-tick.short { height: 9px; }
.ruler-tick.tiny  { height: 5px; }
.ruler-tick:nth-child(1)  { left: 0%; }
.ruler-tick:nth-child(2)  { left: 12.5%; }
.ruler-tick:nth-child(3)  { left: 25%; }
.ruler-tick:nth-child(4)  { left: 37.5%; }
.ruler-tick:nth-child(5)  { left: 50%; }
.ruler-tick:nth-child(6)  { left: 62.5%; }
.ruler-tick:nth-child(7)  { left: 75%; }
.ruler-tick:nth-child(8)  { left: 87.5%; }
.ruler-tick:nth-child(9)  { left: 100%; }
.scale-label {
  font-size: 12px;
  color: #333;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-weight: 500;
  letter-spacing: 0.3px;
}
</style>