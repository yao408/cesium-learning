<template>
  <aside class="sidebar right-sidebar">
    <div class="panel">
      <h3>📍 实时坐标</h3>
      <div class="info-row"><span>WGS84:</span><code>{{ mouseLat.toFixed(6) }}, {{ mouseLng.toFixed(6) }}</code></div>
      <div class="info-row"><span>GCJ-02:</span><code>{{ gcj02Display }}</code></div>
      <div class="info-row"><span>缩放:</span><code>{{ mapZoom }}</code></div>
      <div class="info-row"><span>中心:</span><code>{{ centerLat.toFixed(4) }}, {{ centerLng.toFixed(4) }}</code></div>
    </div>

    <div class="panel">
      <h3>💡 技术栈</h3>
      <ul class="tech-list">
        <li>🌍 Cesium - 3D WebGIS</li>
        <li>⚡ CesiumJS SampledPositionProperty</li>
        <li>⛰️ Cesium World Terrain</li>
      </ul>
    </div>

    <div class="panel legend">
      <h3>🎨 图例</h3>
      <div><span class="dot blue"></span> 规划路径</div>
      <div><span class="dot green"></span> 传感器 FOV</div>
      <div><span class="dot red"></span> 电子围栏</div>
    </div>
  </aside>
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
.sidebar {
  width: 260px;
  overflow-y: auto;
  padding: 10px;
  background: #16213e;
  border-left: 1px solid #0f3460;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: #0f3460; border-radius: 2px; }
.panel {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #0f3460;
}
.panel h3 {
  font-size: 13px;
  color: #e94560;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #0f3460;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 12px;
}
.info-row span { color: #888; }
.info-row code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  color: #00ff88;
  background: #0f3460;
  padding: 1px 6px;
  border-radius: 3px;
}
.tech-list { list-style: none; font-size: 12px; }
.tech-list li { padding: 3px 0; color: #aaa; }
.legend div { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 2px 0; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.dot.blue { background: #3498db; }
.dot.green { background: #00ff88; }
.dot.red { background: #e74c3c; }
.dot.orange { background: #f39c12; }
</style>