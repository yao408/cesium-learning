<template>
  <div class="gas-test-page">
    <h2 class="test-title">气体传感器 - 雾气填充效果测试</h2>

    <div class="test-grid">
      <!-- 1. 待机/空状态 -->
      <div class="test-item">
        <p class="test-label">待机状态（值=0）</p>
        <GasGauge
          title="气体-空"
          :value="0"
          unit="PPM"
          :min="0"
          :max="5000"
          :warning-threshold="2000"
          :danger-threshold="3500"
        />
      </div>

      <!-- 2. 低浓度 -->
      <div class="test-item">
        <p class="test-label">低浓度（500 PPM）</p>
        <GasGauge
          title="气体-低"
          :value="500"
          unit="PPM"
          :min="0"
          :max="5000"
          :warning-threshold="2000"
          :danger-threshold="3500"
        />
      </div>

      <!-- 3. 中等浓度 -->
      <div class="test-item">
        <p class="test-label">中等浓度（1500 PPM）</p>
        <GasGauge
          title="气体-中"
          :value="1500"
          unit="PPM"
          :min="0"
          :max="5000"
          :warning-threshold="2000"
          :danger-threshold="3500"
        />
      </div>

      <!-- 4. 警告状态 -->
      <div class="test-item">
        <p class="test-label">警告状态（2500 PPM）</p>
        <GasGauge
          title="气体-警"
          :value="2500"
          unit="PPM"
          :min="0"
          :max="5000"
          :warning-threshold="2000"
          :danger-threshold="3500"
        />
      </div>

      <!-- 5. 危险状态 -->
      <div class="test-item">
        <p class="test-label">危险状态（4000 PPM）</p>
        <GasGauge
          title="气体-危"
          :value="4000"
          unit="PPM"
          :min="0"
          :max="5000"
          :warning-threshold="2000"
          :danger-threshold="3500"
        />
      </div>

      <!-- 6. 模拟MQTT数据范围（10-60 PPM）-->
      <div class="test-item">
        <p class="test-label">MQTT数据（25 PPM）</p>
        <GasGauge
          title="气体-MQTT"
          :value="25"
          unit="ppm"
          :min="10"
          :max="60"
          :warning-threshold="50"
          :danger-threshold="55"
        />
      </div>

      <!-- 7. MQTT接近阈值 -->
      <div class="test-item">
        <p class="test-label">MQTT接近阈值（48 PPM）</p>
        <GasGauge
          title="气体-接近"
          :value="48"
          unit="ppm"
          :min="10"
          :max="60"
          :warning-threshold="50"
          :danger-threshold="55"
        />
      </div>

      <!-- 8. MQTT超阈值 -->
      <div class="test-item">
        <p class="test-label">MQTT超阈值（52 PPM）</p>
        <GasGauge
          title="气体-超限"
          :value="52"
          unit="ppm"
          :min="10"
          :max="60"
          :warning-threshold="50"
          :danger-threshold="55"
        />
      </div>
    </div>

    <!-- 说明文档 -->
    <div class="docs-section">
      <h3>📋 预设状态说明</h3>
      <table class="docs-table">
        <thead>
          <tr>
            <th>状态</th>
            <th>值范围</th>
            <th>雾气高度</th>
            <th>透明度</th>
            <th>颜色</th>
            <th>粒子数</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge standby">待机</span></td>
            <td>= 0 或 接近0</td>
            <td>10%</td>
            <td>0.2</td>
            <td>淡蓝白</td>
            <td>8个</td>
          </tr>
          <tr>
            <td><span class="badge normal">低浓度</span></td>
            <td>&lt; 30%</td>
            <td>30%</td>
            <td>0.35</td>
            <td>浅蓝</td>
            <td>14个</td>
          </tr>
          <tr>
            <td><span class="badge normal">中等</span></td>
            <td>30% ~ 60%</td>
            <td>55%</td>
            <td>0.55</td>
            <td>中蓝</td>
            <td>20个</td>
          </tr>
          <tr>
            <td><span class="badge warning">警告</span></td>
            <td>≥ 警告阈值</td>
            <td>75%</td>
            <td>0.7</td>
            <td>橙黄</td>
            <td>26个</td>
          </tr>
          <tr>
            <td><span class="badge danger">危险</span></td>
            <td>≥ 危险阈值</td>
            <td>92%</td>
            <td>0.88</td>
            <td>红色</td>
            <td>32个</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import GasGauge from './GasGauge.vue'
</script>

<style scoped>
.gas-test-page {
  padding: 40px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
}

.test-title {
  text-align: center;
  color: #e2e8f0;
  font-size: 28px;
  margin-bottom: 40px;
  text-shadow: 0 2px 10px rgba(34, 211, 238, 0.3);
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto 50px;
}

.test-item {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(74, 158, 255, 0.2);
  transition: all 0.3s ease;
}

.test-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(34, 211, 238, 0.2);
  border-color: rgba(74, 158, 255, 0.4);
}

.test-label {
  text-align: center;
  color: #94daff;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.docs-section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(74, 158, 255, 0.2);
}

.docs-section h3 {
  color: #22d3ee;
  margin-bottom: 20px;
  font-size: 20px;
}

.docs-table {
  width: 100%;
  border-collapse: collapse;
  color: #cbd5e1;
}

.docs-table th,
.docs-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.docs-table th {
  background: rgba(34, 211, 238, 0.1);
  color: #22d3ee;
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge.standby {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.badge.normal {
  color: #22d3ee;
  background: rgba(34, 211, 238, 0.15);
  border: 1px solid rgba(34, 211, 238, 0.3);
}

.badge.warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.badge.danger {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
</style>