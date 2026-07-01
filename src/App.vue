<template>
  <div id="app">
    <nav class="top-nav">
      <router-link to="/multi-vehicle" class="nav-link">🚗 多车模拟</router-link>
      <router-link to="/flood" class="nav-link">🌊 洪水模拟</router-link>
      <router-link to="/viewshed" class="nav-link">👁️ 通视分析</router-link>
      <router-link to="/data-import" class="nav-link">📦 数据加载</router-link>
    </nav>
    <div class="router-view"><router-view /></div>
  </div>
</template>

<script setup>
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
#app { display: flex; flex-direction: column; height: 100vh; font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #1a1a2e; color: #e0e0e0; }
.top-nav {
  display: flex; gap: 4px; padding: 10px 20px;
  background: linear-gradient(135deg, #16213e, #0f3460);
  border-bottom: 1px solid #0f3460; flex-shrink: 0; z-index: 1000;
}
.nav-link {
  padding: 8px 20px; border-radius: 6px; color: #aaa; text-decoration: none;
  font-size: 14px; font-weight: 500; transition: all 0.2s;
}
.nav-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
.nav-link.router-link-active { color: #fff; background: #e94560; }
.router-view { flex: 1; overflow: hidden; }
</style>