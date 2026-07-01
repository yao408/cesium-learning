<template>
  <div>
    <transition name="alert-pop">
      <div v-if="showAlert" :class="['map-alert', 'map-alert-' + alertType]">
        {{ alertMessage }}
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  props: {
    showAlert: Boolean,
    alertType: String,
    alertMessage: String,
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
.alert-pop-enter-active { animation: alertIn 0.3s ease; }
.alert-pop-leave-active { animation: alertOut 0.3s ease; }
@keyframes alertIn  { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes alertOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }
</style>