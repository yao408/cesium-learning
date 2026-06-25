<template>
  <div>
    <transition name="alert-pop">
      <div v-if="showAlert" :class="['map-alert', 'map-alert-' + alertType]">
        {{ alertMessage }}
      </div>
    </transition>
    <div v-if="currentZone || roadCondition !== '畅通'" class="map-status-bar">
      <span v-if="currentZone" class="status-tag status-geofence">{{ currentZone }}</span>
      <span class="status-tag" :class="'status-' + roadCondition">{{ roadConditionText }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    showAlert: Boolean,
    alertType: String,
    alertMessage: String,
    currentZone: String,
    roadCondition: String,
    roadConditionText: String,
  },
}
</script>

<style scoped>
.map-alert {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 14px 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  pointer-events: none;
  white-space: nowrap;
}
.map-alert-danger  { background: #e74c3c; }
.map-alert-info    { background: #2ecc71; }
.map-alert-warning { background: #f39c12; }
.map-status-bar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 10px;
}
.status-tag {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  white-space: nowrap;
}
.status-geofence { background: rgba(243, 156, 18, 0.85); }
.status-缓行 { background: rgba(243, 156, 18, 0.85); }
.status-拥堵 { background: rgba(231, 76, 60, 0.85); }
.alert-pop-enter-active { animation: alertIn 0.3s ease; }
.alert-pop-leave-active { animation: alertOut 0.3s ease; }
@keyframes alertIn  { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes alertOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }
</style>