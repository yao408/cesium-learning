<template>
  <div>
    <div class="form-group">
      <label>服务类型</label>
      <select v-model="serviceType" class="input">
        <option value="wms">WMS</option>
        <option value="wfs">WFS</option>
      </select>
    </div>
    <div class="form-group">
      <label>服务地址</label>
      <input v-model="url" placeholder="https://..." class="input" />
    </div>
    <div class="form-group">
      <label>图层名称</label>
      <input v-model="layerName" placeholder="图层名" class="input" />
    </div>
    <button class="import-btn" @click="addService">添加服务</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const serviceType = ref('wms')
const url = ref('')
const layerName = ref('')

function addService() {
  if (!url.value) {
    alert('请输入服务地址')
    return
  }
  alert(`${serviceType.value.toUpperCase()} 服务添加功能待实现`)
}
</script>

<style scoped>
.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.input {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 12px;
  width: 100%;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.import-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  width: 100%;
}

.import-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>