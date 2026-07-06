<template>
  <div class="coord-badge">
    <span class="coord-label">WGS84</span>
    <span class="coord-value">{{ mouseLat.toFixed(6) }}, {{ mouseLng.toFixed(6) }}</span>
  </div>
</template>

<script>
export default {
  props: {
    mouseLat: Number,
    mouseLng: Number,
    gcj02Display: String,
    mapZoom: Number,
    centerLat: Number,
    centerLng: Number,
  },
}
</script>

<style scoped>
.coord-badge {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(254, 252, 245, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(45, 138, 78, 0.12);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
}
.coord-label {
  color: #2d8a4e;
  font-weight: 600;
  font-size: 10px;
  background: rgba(45, 138, 78, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
}
.coord-value {
  color: #5a4e3c;
}
</style>