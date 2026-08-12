# Cesium + Vue 开发笔记

## 1. 项目配置

### 1.1 vite.config.js
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [vue(), cesium()]
})
```
- `vue()`：处理 .vue 文件
- `cesium()`：处理 Cesium 的 wasm、worker 等资源

### 1.2 安装依赖
```bash
npm install cesium three
```

### 1.3 后端启动（Spring Boot）

**项目路径**：`D:\vue-projects\cesium-learning\backend\learning`

**配置**（`application.yml`）：
- 端口：`8081`
- 数据库：PostgreSQL `localhost:5432/cesium_learning`
- Java 版本：17

**启动命令**：
```powershell
cd D:\vue-projects\cesium-learning\backend\learning
.\mvnw spring-boot:run
```
node mqtt-simulator.js
**前置条件**：
1. PostgreSQL 已启动，数据库 `cesium_learning` 已创建
2. Java 17 已安装
3. 端口 8081 未被占用

**Vite 代理配置**（`vite.config.js`）：
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8081',
      changeOrigin: true,
    }
  }
}
```
- Cesium 需要 `vite-plugin-cesium`
- Three.js 无需额外配置

---

## 2. Vue 3 组合式 API 基础

### 2.1 生命周期钩子
```javascript
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  // 组件挂载完成后执行
  // 可以访问 DOM 元素
})

onUnmounted(() => {
  // 组件卸载前执行
  // 用于清理资源
})
```

### 2.2 ref 响应式引用
```javascript
import { ref } from 'vue'

// 创建响应式数据，初始值为 null
const validationShapes = ref([])

// 必须通过 .value 访问/修改
validationShapes.value.push({ name: '正方形' })  // ✅ 正确
validationShapes.push({ ... })                   // ❌ 错误
```

| 写法 | 含义 |
|------|------|
| `validationShapes` | 整个 ref 对象（Vue 包装） |
| `validationShapes.value` | 真正的数组值 |

**为什么用 `.value`**：Vue 把数据包了一层，必须通过 `.value` 才能访问。

**箭头函数**：
```javascript
// 传统写法
.forEach(function(shape) { ... })

// 箭头函数（简写）
.forEach(shape => { ... })
```

### 2.3 const vs let 的选择
```javascript
const cesiumContainer = ref(null)  // 不需要重新赋值
let viewer = null                   // 需要重新赋值
```
| 声明 | 使用场景 | 原因 |
|------|----------|------|
| `const` | DOM 引用 | 始终指向同一个 ref 对象，只修改 `.value` |
| `let` | Cesium 实例 | 需要从 `null` → `实例` → `null` 多次赋值 |

---

## 3. Cesium 基础

### 3.1 引入样式
```javascript
import 'cesium/Build/Cesium/Widgets/widgets.css'
```
Widgets = Cesium 内置 UI 组件（工具栏、时间轴等）

### 3.2 创建地球
```javascript
const viewer = new Cesium.Viewer('container', {
  terrainProvider: await Cesium.createWorldTerrainAsync()
})
```

#### createWorldTerrainAsync() 详解
| 单词 | 含义 |
|------|------|
| `create` | 创建 |
| `World` | 全球/世界 |
| `Terrain` | 地形/地势 |
| `Async` | 异步（Asynchronous） |

**作用**：加载 Cesium 官方提供的全球高程地形数据（山脉、峡谷等真实地形）

**为什么用异步**：
- 地形数据需要从网络加载，数据量大
- `await` 等待加载完成，不阻塞程序运行

**版本对比**：
| 函数 | 版本 | 状态 |
|------|------|------|
| `createWorldTerrain()` | 旧版本 | ❌ 已废弃 |
| `createWorldTerrainAsync()` | 新版本 | ✅ 推荐使用 |

### 3.3 Viewer 配置项
```javascript
viewer = new Cesium.Viewer(cesiumContainer.value, {
  terrainProvider: await Cesium.createWorldTerrainAsync(),  // 地形数据
  animation: false,           // 左下角动画控制部件
  timeline: false,            // 底部时间轴部件
  baseLayerPicker: false,     // 底图切换按钮
  geocoder: false,            // 搜索按钮
  homeButton: false,          // 主页按钮
  sceneModePicker: false,     // 2D/3D切换按钮
  navigationHelpButton: false,// 帮助按钮
  fullscreenButton: false,    // 全屏按钮
})
```

### 3.4 配置 Token
```javascript
Cesium.Ion.defaultAccessToken = '你的_token_这里'
```
获取方式：
1. 访问 https://cesium.com/ion/
2. 注册/登录账号
3. 进入 `Access Tokens` 页面
4. 复制 Token

### 3.5 常用配置项

#### 颜色与透明度
```javascript
// 基础颜色
Cesium.Color.RED
Cesium.Color.GREEN
Cesium.Color.BLUE

// 带透明度（0-1）
Cesium.Color.BLUE.withAlpha(0.3)  // 30% 不透明
```

#### 高度参考
```javascript
// 贴地：随地形起伏
heightReference: Cesium.HeightReference.CLAMP_TO_GROUND

// 相对地面：固定高度
heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND

// 绝对高度
heightReference: Cesium.HeightReference.NONE
```

#### 标签对齐
```javascript
// 垂直对齐
verticalOrigin: Cesium.VerticalOrigin.TOP     // 顶部对齐，标签在图形上方
verticalOrigin: Cesium.VerticalOrigin.BOTTOM  // 底部对齐，标签在图形下方
verticalOrigin: Cesium.VerticalOrigin.CENTER  // 居中对齐

// 配合 pixelOffset 调整位置
pixelOffset: new Cesium.Cartesian2(0, 20)   // 水平0，垂直向下20像素
pixelOffset: new Cesium.Cartesian2(0, -20)  // 水平0，垂直向上20像素
```

### 3.6 Entity 图形类型

`viewer.entities.add()` 支持多种图形：

| 类型 | 配置项 | 用途 |
|------|--------|------|
| 点 | `point` | 标记位置 |
| 线 | `polyline` | 测量线段、路径 |
| 多边形 | `polygon` | 淹没区、 AOI |
| 椭圆/圆 | `ellipse` | 圆形标记 |
| 矩形 | `rectangle` | 矩形区域 |
| 标签 | `label` | 文字标注 |
| 模型 | `model` | 3D 建筑 |
| 广告牌 | `billboard` | 图标标记 |

```javascript
// 统一格式
viewer.entities.add({
  name: '名称',
  position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
  polygon: { hierarchy: positions, material: Cesium.Color.RED },
  // 或 ellipse: { semiMinorAxis: 50, semiMajorAxis: 50 },
  // 或 polyline: { positions: [start, end], width: 2 },
  label: { text: '标签', font: '14px sans-serif' }
})
```

### 3.7 相机控制

#### 飞行动画
```javascript
// 飞到矩形区域（自动调整视角看全）
viewer.camera.flyTo({
  destination: Cesium.Rectangle.fromDegrees(
    west,   // 西边界（最小经度）
    south,  // 南边界（最小纬度）
    east,   // 东边界（最大经度）
    north   // 北边界（最大纬度）
  ),
  duration: 1.5  // 飞行时间（秒）
})

// 飞到单点
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
  duration: 2
})
```

| 方式 | 适用场景 |
|------|----------|
| `Rectangle` | 看一个区域，自动调整高度 |
| `Cartesian3` | 看一个点，精确控制位置 |

### 3.8 动态 Class 绑定

```vue
<!-- 根据条件动态添加 class -->
<button :class="{ active: currentBaseMap === 'ion' }">Bing</button>
```

| 语法 | 含义 |
|------|------|
| `:class="{ active: 条件 }"` | 条件为 true 时添加 `active` 类 |

**用途**：高亮显示当前选中的按钮/选项。

```vue
<!-- 示例：底图切换按钮 -->
<button 
  :class="{ active: currentBaseMap === 'ion' }" 
  @click="switchBaseMap('ion')">
  Bing卫星
</button>
<button 
  :class="{ active: currentBaseMap === 'gaode' }" 
  @click="switchBaseMap('gaode')">
  高德
</button>
```

### 3.9 图层管理

Cesium 通过 `viewer.imageryLayers` 管理底图图层。

```javascript
// 添加图层
const layer = viewer.imageryLayers.addImageryProvider(
  new Cesium.UrlTemplateImageryProvider({ url: '...' })
)

// 移除图层
viewer.imageryLayers.remove(layer, true)  // 第二个参数：是否销毁资源

// 移除所有图层
viewer.imageryLayers.removeAll()
```

| 方法 | 作用 | 参数 |
|------|------|------|
| `addImageryProvider()` | 添加底图 | ImageryProvider 实例 |
| `remove(layer, destroy)` | 移除指定图层 | layer, 是否销毁 |
| `removeAll()` | 移除所有图层 | 无 |

#### URL 模板参数

`UrlTemplateImageryProvider` 使用模板字符串，Cesium 自动填充参数：

```javascript
new Cesium.UrlTemplateImageryProvider({
  url: 'https://webrd0{s}.is.autonavi.com/.../x={x}&y={y}&z={z}',
  subdomains: ['1', '2', '3', '4']  // {s} 替换为 1-4，分散请求加速
})
```

| 参数 | 含义 | 说明 |
|------|------|------|
| `{s}` | 子域名 | 配合 `subdomains` 分散请求 |
| `{x}` | 瓦片列号 | Cesium 根据相机位置自动计算 |
| `{y}` | 瓦片行号 | Cesium 根据相机位置自动计算 |
| `{z}` | 缩放层级 | Cesium 根据相机位置自动计算 |

**注意**：`{x}{y}{z}` 无需手动设置，Cesium 根据当前视野自动计算并替换。

### 3.10 场景模式切换

Cesium 支持三种场景模式：

```javascript
// 切换到 2D 平面图
viewer.scene.morphTo2D(0)

// 切换到 3D 球体（默认）
viewer.scene.morphTo3D(0)

// 切换到哥伦布视图（2.5D）
viewer.scene.morphToColumbusView(0)
```

| 模式 | 方法 | 说明 |
|------|------|------|
| 2D | `morphTo2D(duration)` | 平面地图，无高度 |
| 3D | `morphTo3D(duration)` | 地球球体，有地形 |
| Columbus | `morphToColumbusView(duration)` | 2.5D，有高度但平面投影 |

| 参数 | 类型 | 说明 |
|------|------|------|
| `duration` | Number | 过渡动画时间（秒），0 表示无动画 |

---

## 4. 坐标系

### 4.1 三种坐标类型

| 类型 | 维度 | 用途 | 示例 |
|------|------|------|------|
| **Cartesian3** | 3D (x, y, z) | 世界空间位置 | 地球表面点 |
| **Cartesian2** | 2D (x, y) | 屏幕像素偏移 | 标签偏移、鼠标位置 |
| **Cartographic** | 经纬度+高度 | 地理坐标 | 116.4°, 39.9°, 0m |

### 4.2 坐标转换

```javascript
// 经纬度 → Cartesian3（世界坐标）
const cartesian = Cesium.Cartesian3.fromDegrees(lon, lat, height)

// Cartesian3 → 经纬度
const carto = Cesium.Cartographic.fromCartesian(cartesian)
const lon = Cesium.Math.toDegrees(carto.longitude)
const lat = Cesium.Math.toDegrees(carto.latitude)

// 屏幕像素偏移（2D）
const offset = new Cesium.Cartesian2(0, -20)  // x=0, y=-20（向上20像素）
```

### 4.3 坐标系对比

| 坐标系 | 表示 | 转换方法 |
|--------|------|----------|
| WGS84 | 经纬度 | `Cartographic` |
| ECEF | Cartesian3(x,y,z) | `Cartesian3.fromDegrees()` |
| 局部 ENU | 东-北-上 | `eastNorthUpToFixedFrame()` |
| 屏幕 | Cartesian2(x,y) | 像素值 |

### 4.4 EPSG 常用编码

| EPSG | 名称 | 用途 | 使用场景 |
|------|------|------|----------|
| 4326 | WGS84 | GPS、国际标准 | 全球定位、Cesium 默认 |
| 4490 | CGCS2000 | 中国测绘标准 | 国内测绘项目 |
| 3857 | Web Mercator | 地图切片投影 | 谷歌/高德/百度地图 |
| 4479 | CGCS2000 3°带 | 高精度测绘 | 国内工程测量 |
| 32650-32659 | UTM 50-59N | 北半球通用横轴墨卡托 | 区域测绘 |

**proj4js 转换示例**：
```javascript
import proj4 from 'proj4'

// 定义坐标系
proj4.defs('EPSG:4490', '+proj=longlat +ellps=GRS80 +no_defs')
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs')

// WGS84 → Web Mercator
const [x, y] = proj4('EPSG:4326', 'EPSG:3857', [116.4, 39.9])

// CGCS2000 → WGS84（平面七参数转换需额外计算）
```

### 4.5 国内偏移坐标系

| 坐标系 | 说明 | 转换方法 |
|--------|------|----------|
| GCJ-02 (火星坐标) | 国测局加密坐标 | `gcj02ToWGS84()` / `wgs84ToGCJ02()` |
| BD-09 (百度坐标) | 百度二次加密 | `bd09ToWGS84()` / `wgs84ToBD09()` |

**转换算法来源**：
- GCJ-02：国家测绘局加密算法（公开逆向）
- BD-09：百度在 GCJ-02 基础上再次加密

---

## 5. 核心功能

### 5.1 通视分析
- 原理：射线采样地形高度
- 实现：CPU 采样 / GPU Shader

### 5.2 测量工具
| 类型 | 快速方法 | 精确方法 |
|------|---------|---------|
| 距离 | Haversine | EllipsoidGeodesic |
| 面积 | Shoelace | 三角剖分 |

### 5.3 性能优化
- Primitive 替代 Entity
- 动态 LOD
- 数据缓存

---

## 6. 地图服务

| 服务 | 返回 | 用途 |
|------|------|------|
| WMS | 图片 | 显示地图 |
| WFS | 矢量数据 | 查询要素 |
| WMTS | 瓦片 | 快速加载 |
| XYZ | 瓦片 | 简化版 WMTS |

---

## 7. 响应式

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```
- `width=device-width`：自适应屏幕宽度
- 配合 CSS：`width: 100%` / `@media`

Cesium 全屏：
```css
#cesiumContainer {
  width: 100vw;
  height: 100vh;
}
```

---

## 8. 代码规范

### 8.1 注释类型
| 颜色 | 注释类型 | 示例 |
|------|----------|------|
| 绿色 | 普通单行注释 | `// 这是普通注释` |
| 白色/灰色 | 文档注释（JSDoc） | `/** 这是文档注释 */` |

```javascript
// 普通注释（绿色）
const a = 1

/**
 * 文档注释（白色）
 * 用于函数、类的详细说明
 */
function foo() {}
```

### 8.2 导入语法
```javascript
// 导入 Vue 的多个函数
import { ref, onMounted, onUnmounted } from 'vue'

// 导入整个 Cesium 库
import * as Cesium from 'cesium'
// 使用时：Cesium.Viewer、Cesium.Ion
```

---

## 9. 常见问题

### 9.1 createWorldTerrain is not a function
**原因**：新版本 Cesium 改为异步函数
**解决**：
```javascript
// 旧版本（报错）
terrainProvider: Cesium.createWorldTerrain()

// 新版本（正确）
terrainProvider: await Cesium.createWorldTerrainAsync()
```

### 9.2 组件完整示例
```vue
<template>
  <div id="cesiumContainer" ref="cesiumContainer"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

const cesiumContainer = ref(null)
let viewer = null

onMounted(async () => {
  Cesium.Ion.defaultAccessToken = '你的_token'
  
  viewer = new Cesium.Viewer(cesiumContainer.value, {
    terrainProvider: await Cesium.createWorldTerrainAsync(),
    animation: false,
    timeline: false,
  })
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100vh;
}
</style>
```

---

## 10. 组件通信与状态管理

### 10.1 父子组件通信

#### 父传子：Props
```vue
<!-- 父组件 -->
<template>
  <MeasureTool :viewer="viewer" />
</template>

<!-- 子组件 MeasureTool.vue -->
<script setup>
const props = defineProps({
  viewer: {
    type: Object,
    required: true
  }
})
</script>
```

#### 子传父：defineExpose
```vue
<!-- 子组件 CesiumViewer.vue -->
<script setup>
const viewer = ref(null)
// 暴露给父组件
defineExpose({ viewer })
</script>

<!-- 父组件 -->
<template>
  <CesiumViewer ref="viewerRef" />
</template>

<script setup>
const viewerRef = ref(null)
// 通过 viewerRef.value.viewer 访问
</script>
```

### 10.2 响应式数据传递问题

**问题**：用 `let` 声明的 viewer 不是响应式的，父组件无法感知变化

**解决**：使用 `ref` 声明
```javascript
// ❌ 非响应式
let viewer = null

// ✅ 响应式
const viewer = ref(null)
viewer.value = new Cesium.Viewer(...)
```

### 10.3 条件渲染等待异步初始化

```vue
<template>
  <!-- 等待 viewer 准备好再渲染 -->
  <MeasureTool v-if="viewerRef?.viewer" :viewer="viewerRef.viewer" />
  
  <!-- 或用 setTimeout 等待 -->
  <MeasureTool v-if="ready" :viewer="viewerRef?.viewer" />
</template>

<script setup>
const ready = ref(false)
onMounted(() => {
  setTimeout(() => {
    ready.value = true
  }, 2000)
})
</script>
```

---

## 11. 测量工具组件开发

### 11.1 组件结构
```
MeasureTool.vue
├── template
│   ├── 按钮组（距离测量、面积测量、清除）
│   └── 结果显示区域
├── script
│   ├── props: 接收 viewer
│   ├── activeTool: 当前激活的工具
│   ├── result: 测量结果
│   └── 方法: toggleTool, clearAll
└── style
    └── 固定定位、按钮样式、结果展示
```

### 11.2 UI 交互逻辑
```javascript
// 切换工具
function toggleTool(tool) {
  if (activeTool.value === tool) {
    activeTool.value = null  // 取消激活
  } else {
    activeTool.value = tool  // 激活新工具
  }
}

// 按钮高亮样式
<button :class="{ active: activeTool === 'distance' }">
```

---

## 12. 开发心得

### 12.1 AI 辅助 vs 手动实践
| 方式 | 优点 | 缺点 |
|------|------|------|
| 全用 AI | 快速出代码 | 学不到深层知识 |
| 手动实践 | 理解每个细节 | 耗时、容易出错 |
| AI + 手动 | 效率 + 理解 | 最佳实践 |

### 12.2 调试技巧
- 浏览器控制台查看 Vue 警告
- 使用 `console.log` 追踪数据流
- 逐步验证每个功能点
- 先实现 UI，再添加逻辑

### 12.3 代码组织原则
- 单一职责：一个组件只做一件事
-  props 向下传递，事件向上传递
- 复杂状态用 Pinia 管理
- 异步数据注意加载状态

---

## 13. JavaScript 基础

### 13.1 数组操作

```javascript
// push：往数组末尾添加元素
const shapes = []
shapes.push({ name: '正方形', type: 'area' })  // 添加一个
shapes.push({ name: '圆', type: 'area' })       // 再添加一个
// 结果：[{正方形}, {圆}]
```

| 方法 | 作用 | 示例 |
|------|------|------|
| `push()` | 末尾添加 | `arr.push(item)` |
| `pop()` | 末尾删除 | `arr.pop()` |
| `unshift()` | 开头添加 | `arr.unshift(item)` |
| `shift()` | 开头删除 | `arr.shift()` |

### 13.2 JS 语法 vs Cesium API

| 代码 | 类型 | 来源 |
|------|------|------|
| `shapes.push({...})` | JavaScript | JS 原生 |
| `[].map()` | JavaScript | JS 原生 |
| `Cesium.Cartesian3.fromDegrees()` | Cesium API | Cesium 库 |
| `viewer.entities.add()` | Cesium API | Cesium 库 |

**区分方法**：
- 以 `Cesium.` 开头 → Cesium API
- 以 `viewer.` 开头 → Cesium 实例方法
- 其他 → JavaScript 语法

### 13.3 定时器

```javascript
// setTimeout：延迟执行一次
setTimeout(runValidation, 500)  // 500ms 后执行 runValidation

// setInterval：定时重复执行
const timer = setInterval(() => {
  console.log('每秒执行一次')
}, 1000)

// 清除定时器
clearTimeout(timer)   // 清除 setTimeout
clearInterval(timer)  // 清除 setInterval
```

| 方法 | 作用 | 使用场景 |
|------|------|----------|
| `setTimeout` | 延迟执行一次 | 等动画完成后再操作 |
| `setInterval` | 定时重复执行 | 轮询更新、倒计时 |

---

## 14. Vue 响应式陷阱与调试技巧

### 14.1 案例：按钮状态显示异常

**现象**：
- 控制台打印 `loading: false`
- 但按钮显示"加载中..."（应该是"加载合肥市"）

**代码**：
```vue
<template>
  <button :disabled="tilesMethods?.loading">
    {{ tilesMethods?.loading ? '加载中...' : '🏙️ 加载合肥市' }}
  </button>
</template>

<script setup>
const tilesMethods = use3DTiles(viewer, clearCityViewshed)
console.log(tilesMethods.loading.value)  // 输出: false
</script>
```

**原因**：
Vue 的响应式系统在某些情况下（如 Composable 返回的对象嵌套 ref）可能丢失追踪。
虽然 `loading` 是 `ref(false)`，但模板中的 `tilesMethods?.loading` 可能没有正确解包。

**通俗解释**：
就像你明明把灯关了（`loading = false`），但开关和灯之间的线路接触不良，灯还是亮着（显示"加载中"）。

**解决**：
```vue
<template>
  <!-- 方法1：不使用动态文字，固定显示 -->
  <button @click="tilesMethods?.load()">
    🏙️ 加载合肥市
  </button>
  
  <!-- 方法2：如果一定要显示状态，用独立变量 -->
  <button :disabled="isLoading">
    {{ isLoading ? '加载中...' : '🏙️ 加载合肥市' }}
  </button>
</template>

<script setup>
const tilesMethods = use3DTiles(viewer, clearCityViewshed)
const isLoading = ref(false)

async function load() {
  isLoading.value = true
  await tilesMethods.load()
  isLoading.value = false
}
</script>
```

### 14.2 案例：KeepAlive 缓存导致状态不重置

**现象**：
- 切换页面后再回来，3D Tiles 面板还是展开状态
- 或者按钮还是显示"加载中"

**原因**：
Vue 的 `KeepAlive` 组件会缓存组件状态，包括 `ref` 和 `reactive` 的值。

**解决**：
```javascript
import { onActivated } from 'vue'

// 组件被激活时（从缓存恢复）重置状态
onActivated(() => {
  // 重置面板折叠状态
  Object.keys(sections).forEach(key => sections[key] = false)
  
  // 重置加载状态
  loading.value = false
  loaded.value = false
})
```

**通俗解释**：
KeepAlive 就像浏览器的"后退"功能，页面内容被保存在内存里。回来时不是重新创建，而是从内存恢复。所以之前的状态（比如"加载中"）还在。

### 14.3 案例：事件监听器添加时机错误

**现象**：
- 瓦片加载完成，但计数一直是 0

**错误代码**：
```javascript
// 错误：先添加到场景，再监听事件
tileset = await Cesium3DTileset.fromUrl(url)
viewer.scene.primitives.add(tileset)  // ← 瓦片开始加载
tileset.tileLoad.addEventListener(() => {
  count.value++  // ← 监听晚了，前面的瓦片没计数
})
```

**正确代码**：
```javascript
// 正确：先监听事件，再添加到场景
tileset = await Cesium3DTileset.fromUrl(url)
tileset.tileLoad.addEventListener(() => {
  count.value++  // ← 先监听，所有瓦片都能计数
})
viewer.scene.primitives.add(tileset)  // ← 再加载
```

**通俗解释**：
就像你要数进教室的人数，但你在大家都坐好后才开始数（漏了前面的人）。应该在教室门口就准备好，进来一个数一个。

### 14.4 调试 checklist

| 检查项 | 方法 |
|--------|------|
 响应式值是否正确 | `console.log(ref.value)` |
 模板是否正确绑定 | 在模板中加 `{{ debug: refValue }}` |
 组件是否被缓存 | 检查 `KeepAlive` 配置 |
 事件监听时机 | 确保在操作前添加监听器 |
 浏览器缓存 | 强制刷新 `Ctrl + F5` |

### 14.5 最佳实践

1. **简单优先**：不要过度使用响应式，简单场景用普通变量
2. **状态集中**：把状态放在组件内部，不要分散到多个 Composable
3. **避免嵌套 ref**：`ref({ loading: ref(false) })` 容易出问题
4. **及时清理**：组件卸载时清除事件监听、定时器
5. **验证假设**：每个 `?.` 都要确认对象一定存在

---

## 15. WebSocket 实时通信（传感器数据可视化）

### 15.1 架构对比：MQTT vs WebSocket

| 特性 | MQTT | WebSocket |
|------|------|-----------|
| **协议层** | 应用层协议 | 全双工通信协议 |
| **服务器** | 需要 Broker（如 EMQX） | Spring Boot 内置支持 |
| **适用场景** | IoT 设备、海量传感器 | Web 实时推送、聊天 |
| **复杂度** | 需要额外依赖（mqtt.js） | 浏览器原生支持 |

### 15.2 项目中的选择

**本项目最终采用：WebSocket**

原因：
1. ✅ Spring Boot 已内置 WebSocket 支持
2. ✅ 后端已有 `SensorSimulator.java` 模拟数据
3. ✅ 无需额外的 MQTT Broker 服务
4. ✅ 前端无需安装 mqtt 依赖包

### 15.3 后端实现（Spring Boot）

#### 15.3.1 WebSocket 配置
```java
// 文件: backend/learning/src/main/java/com/cesium/learning/config/WebSocketConfig.java

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 注册传感器 WebSocket 端点
        registry.addHandler(sensorWebSocketHandler, "/ws/sensor")
                .setAllowedOrigins("*");  // 允许跨域
    }
}
```

#### 15.3.2 传感器模拟器
```java
// 文件: SensorSimulator.java
@Service
public class SensorSimulator {

    @Scheduled(fixedRate = 2000)  // 每2秒推送一次温度数据
    public void pushTemperatureSensor() {
        double delta = (random.nextDouble() - 0.5) * 3.0;
        temperature = clamp(temperature + delta, 55, 85);
        
        String status = temperature >= 80 ? "warning" : "normal";
        
        Map<String, Object> data = new HashMap<>();
        data.put("sensorId", "SENSOR-T-001");
        data.put("sensorType", "temperature");
        data.put("sensorName", "1号厂房·电机温度传感器");
        data.put("value", Math.round(temperature * 10.0) / 10.0);
        data.put("unit", "℃");
        data.put("status", status);
        data.put("timestamp", Instant.now().toString());
        
        handler.broadcast(data);  // 推送给所有连接的客户端
    }
    
    // 其他传感器: pressure, vibration, humidity...
}
```

**模拟的4种传感器**：

| 传感器ID | 类型 | 名称 | 单位 | 范围 | 阈值 |
|----------|------|------|------|------|------|
| SENSOR-T-001 | temperature | 电机温度传感器 | ℃ | 55~85 | ≥80 warning |
| SENSOR-P-001 | pressure | 管道压力传感器 | MPa | 0.8~2.0 | ≥1.8 warning |
| SENSOR-V-001 | vibration | 电机振动传感器 | mm/s | 0.5~8.0 | ≥6.0 warning |
| SENSOR-H-001 | humidity | 环境湿度传感器 | %RH | 30~90 | ≥80 warning |

#### 15.3.3 数据库表结构（PostgreSQL）

**sensor 表**：
```sql
CREATE TABLE sensor (
    sensor_id VARCHAR(255) PRIMARY KEY,
    scene_id VARCHAR(255),
    building_label VARCHAR(255),  -- 所属建筑（如"主厂房"）
    sensor_type VARCHAR(255),     -- 类型（temp/humidity/gas/vibration）
    x DOUBLE PRECISION,           -- 3D坐标 X
    y DOUBLE PRECISION,           -- 3D坐标 Y
    z DOUBLE PRECISION,           -- 3D坐标 Z
    ry DOUBLE PRECISION,          -- 旋转角度
    created_at TIMESTAMP DEFAULT NOW()
);
```

**sensor_reading 表**（历史数据）：
```sql
CREATE TABLE sensor_reading (
    id BIGSERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) DEFAULT 'normal',  -- normal/warning/alarm
    timestamp TIMESTAMP NOT NULL,
    
    INDEX idx_reading_sensor (sensor_id),
    INDEX idx_reading_timestamp (timestamp)
);
```

### 15.4 前端实现（Vue 3 + Three.js）

#### 15.4.1 连接WebSocket
```javascript
// FactoryDetail.vue
let wsClient = null;

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8081/ws/sensor`;
    
    wsClient = new WebSocket(wsUrl);

    wsClient.onopen = () => {
        console.log('✅ WebSocket 已连接到 Spring Boot 后端');
        wsConnected.value = true;
    };

    wsClient.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateSensorUI(data);  // 更新UI和图表
    };

    wsClient.onclose = () => {
        console.warn('⚠️ WebSocket 断开');
        wsConnected.value = false;
        setTimeout(() => connectWebSocket(), 5000);  // 自动重连
    };
}
```

#### 15.4.2 处理接收的数据
```javascript
function updateSensorUI(data) {
    // 1. 更新传感器列表
    const idx = sensors.value.findIndex(s => s.sensorId === data.sensorId);
    if (idx >= 0) {
        sensors.value[idx] = { ...data };
    } else {
        sensors.value.push({ ...data });
    }
    
    // 2. 更新3D模型的状态（颜色变化表示告警）
    if (sensorGroupMap[data.sensorId]) {
        sensorGroupMap[data.sensorId].userData.alarmState = data.status;
        sensorGroupMap[data.sensorId].userData.value = data.value;
    }
    
    // 3. 更新温度曲线图（ECharts）
    if (data.sensorType === 'temp' || data.sensorType === 'temperature') {
        const now = new Date();
        tempHistory.value.push([now.toLocaleTimeString(), data.value]);
        if (tempHistory.value.length > 60) tempHistory.value.shift();  // 只保留最近60个点
        
        tempChart.setOption({
            xAxis: { data: tempHistory.value.map(d => d[0]) },
            series: [{ data: tempHistory.value.map(d => d[1]) }]
        });
    }
}
```

### 15.5 启动步骤

#### 步骤1：启动数据库
```bash
# 确保 PostgreSQL 正在运行
# 数据库名: cesium_learning
# 用户名/密码: postgres / your_password
```

#### 步骤2：启动Spring Boot后端
```bash
cd D:\vue-projects\cesium-learning\backend\learning
.\mvnw spring-boot:run

# 输出:
#   Tomcat started on port(s): 8081 (http)
#   Started LearningApplication in x.xxx seconds
```

#### 步骤3：启动前端开发服务器
```bash
cd D:\vue-projects\cesium-learning
npm run dev

# 输出:
#   VITE ready in xxx ms
#   ➜  Local: http://localhost:5173/
```

#### 步骤4：打开浏览器访问
```
http://localhost:5173/
```

**控制台应该显示**：
```
✅ WebSocket 已连接到 Spring Boot 后端
🟢 SENSOR-T-001: 68.5℃
🟢 SENSOR-H-001: 55.2%RH
🟢 SENSOR-P-001: 1.25MPa
🟢 SENSOR-V-001: 2.8mm/s
...（每2-5秒更新一次）
```

### 15.6 数据格式说明

后端发送的JSON格式：
```json
{
  "sensorId": "SENSOR-T-001",
  "sensorType": "temperature",
  "sensorName": "1号厂房·电机温度传感器",
  "position": {
    "x": 15.0,
    "y": 8.0,
    "z": -20.0
  },
  "value": 68.5,
  "unit": "℃",
  "alarmThreshold": 85.0,
  "status": "normal",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

| 字段 | 说明 | 示例值 |
|------|------|--------|
| sensorId | 传感器唯一ID | SENSOR-T-001 |
| sensorType | 传感器类型 | temperature / humidity / pressure / vibration |
| sensorName | 显示名称 | 1号厂房·电机温度传感器 |
| position | 3D坐标 | {x: 15, y: 8, z: -20} |
| value | 当前数值 | 68.5 |
| unit | 单位 | ℃ / %RH / MPa / mm/s |
| alarmThreshold | 告警阈值 | 85.0 |
| status | 状态 | normal / warning / alarm |
| timestamp | 时间戳 | ISO格式字符串 |

### 15.7 常见问题

#### Q1: WebSocket连接失败？
**检查清单**：
1. ✅ Spring Boot是否启动？（访问 http://localhost:8081 看是否响应）
2. ✅ 端口是否正确？（应该是8081，不是5173）
3. ✅ CORS配置？后端已设置 `setAllowedOrigins("*")`
4. ✅ 防火墙是否拦截？

#### Q2: 收不到数据？
**可能原因**：
1. ❌ 前端还在用MQTT而不是WebSocket → 需要修改代码
2. ❌ SensorSimulator没有运行 → 检查Spring Boot日志
3. ❌ 订阅的主题不对 → WebSocket不需要订阅主题

#### Q3: 如何添加新的传感器？
1. 在数据库 `sensor` 表插入记录
2. 在 `SensorSimulator.java` 添加新的 `@Scheduled` 方法
3. 前端会自动接收并显示

---

## 16. Three.js 场景增强功能

### 16.1 休息区系统

#### 创建休息区
```javascript
function createRestArea(posX = 0, posZ = 0) {
    const restGroup = new THREE.Group();
    restAreaCounter++;
    restGroup.name = `restArea_${restAreaCounter}`;
    
    // 木质平台
    const platformGeo = new THREE.BoxGeometry(10, 0.15, 5);
    const platformMat = new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        roughness: 0.85
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, groundY + 0.075, 0);
    restGroup.add(platform);
    
    // 白色长椅（两侧各一组）
    for (let side = -1; side <= 1; side += 2) {
        // 椅腿、座椅、靠背...
    }
    
    // 人字形顶棚 + 立柱
    // 绿色树木装饰
    
    scene.add(restGroup);
    return restGroup;
}
```

#### 从JSON加载位置
```javascript
// scene-config.json
{
    "restAreas": [
        { "name": "休息区1", "x": 133.8, "z": 32.4, "ry": 1.655 },
        { "name": "休息区2", "x": -51.7, "z": 37.7, "ry": -1.530 }
    ]
}

// 加载代码
sceneConfig.restAreas.forEach((ra, i) => {
    const restGroup = createRestArea(ra.x, ra.z);
    if (ra.ry !== undefined) restGroup.rotation.y = ra.ry;
});
```

### 16.2 地面纹理生成（冷工业风水泥地）

```javascript
const canvas = document.createElement('canvas');
canvas.width = 512; canvas.height = 512;
const ctx = canvas.getContext('2d');

// 基础颜色：冷灰色
ctx.fillStyle = '#9aa5ad';
ctx.fillRect(0, 0, 512, 512);

// 添加颗粒纹理（3000个随机点）
for (let i = 0; i < 3000; i++) {
    const v = 140 + Math.random() * 40;
    ctx.fillStyle = `rgb(${v-8},${v+2},${v+12})`;
    ctx.fillRect(
        Math.random() * 512,
        Math.random() * 512,
        1 + Math.random() * 2,
        1 + Math.random() * 2
    );
}

// 添加网格线（接缝效果）
ctx.strokeStyle = 'rgba(100,110,120,0.3)';
ctx.lineWidth = 1;
for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i*64, 0); ctx.lineTo(i*64, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*64); ctx.lineTo(512, i*64); ctx.stroke();
}

const texture = new THREE.CanvasTexture(canvas);
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(4, 3);  // 平铺次数

const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xa8b4bc,
    roughness: 0.92,
    metalness: 0.05
});
```

### 16.3 自动路网生成

#### 外围环路（圆角矩形）
```javascript
function autoGenerateRoadNetwork() {
    // 1. 计算所有建筑的包围盒
    let minX=Infinity, maxX=-Infinity, minZ=Infinity, maxZ=-Infinity;
    buildings.forEach(b => {
        const box = new THREE.Box3().setFromObject(b);
        minX = Math.min(minX, box.min.x);
        maxX = Math.max(maxX, box.max.x);
        minZ = Math.min(minZ, box.min.z);
        maxZ = Math.max(maxZ, box.max.z);
    });
    
    // 2. 添加边距（避免贴着建筑）
    const margin = 10;
    minX -= margin; maxX += margin; minZ -= margin; maxZ += margin;
    
    // 3. 生成圆角矩形的环路点
    const r = Math.min(maxX - minX, maxZ - minZ) * 0.08;  // 圆角半径
    const loopPoints = [];
    // ... 生成四个角 + 四条边的点
    
    roadWaypoints = [...loopPoints];
    buildRoadMesh();  // 使用 CatmullRomCurve3 绘制曲线道路
}
```

#### 建筑小路
```javascript
buildings.forEach(b => {
    const box = new THREE.Box3().setFromObject(b);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // 根据建筑尺寸计算小路大小
    const size = new THREE.Vector3();
    box.getSize(size);
    const padX = size.x * 0.35 + 6;  // 边距
    const padZ = size.z * 0.35 + 6;
    
    // 生成围绕建筑的小路
    const smallLoop = [
        [center.x - padX, center.z - padZ],
        [center.x + padX, center.z - padZ],
        [center.x + padX, center.z + padZ],
        [center.x - padX, center.z + padZ]
    ];
    
    roadWaypoints = [...smallLoop];
    buildSmallRoadMesh();  // 更窄的道路材质
});
```

### 16.4 树木放置策略

限制树木在安全区域内（不跑到大路上）：
```javascript
function addTreesToRoad(roadGroup, innerRect) {
    const treePositions = [];
    
    // 在小路内侧随机生成树木
    for (let i = 0; i < treeCount; i++) {
        let tx = centerX + (Math.random() - 0.5) * innerRect.width;
        let tz = centerZ + (Math.random() - 0.5) * innerRect.height;
        
        // 钳制到安全区域（小路内侧矩形）
        tx = Math.max(innerRect.left, Math.min(innerRect.right, tx));
        tz = Math.max(innerRect.bottom, Math.min(innerRect.top, tz));
        
        createTree(tx, tz);  // 创建树干 + 树冠
    }
}
```

---

## 17. 开发经验总结

### 17.1 技术选型决策

| 功能 | 选择方案 | 原因 |
|------|----------|------|
| 实时数据推送 | WebSocket（非MQTT） | Spring Boot内置支持，无需额外Broker |
| 3D渲染 | Three.js（非Cesium） | 工厂场景更适合Three.js，性能更好 |
| 图表可视化 | ECharts | 功能丰富，与Vue集成好 |
| 数据存储 | PostgreSQL + JPA | Spring Boot标准方案，成熟稳定 |
| 前端构建 | Vite | 快速热更新，开发体验好 |

### 17.2 性能优化技巧

1. **对象池模式**：复用道路、路灯等频繁创建的对象
2. **LOD（细节层次）**：远处的建筑降低多边形数量
3. **实例化渲染**：大量相同物体（树木、路灯）用InstancedMesh
4. **纹理图集**：合并多张小图为一张大图，减少draw call
5. **视锥体剔除**：只渲染视野内的物体

### 17.3 调试工具推荐

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| Vue DevTools | 调试Vue组件状态 | Chrome扩展 |
| three.js Inspector | 查看3D场景树 | Chrome扩展 |
| pgAdmin 4 | 管理PostgreSQL数据库 | 官网下载 |
| Postman | 测试REST API | 官网下载 |

### 17.4 常见错误及解决方案

#### 错误1：z-fighting（深度冲突）
**现象**：道路和地面闪烁
**解决**：
```javascript
// 提升道路高度
mesh.position.y = groundY + 0.08;  // 不是0.05

// 或启用多边形偏移
material.polygonOffset = true;
material.polygonOffsetFactor = 2;
material.polygonOffsetUnits = 1;
```

#### 错误2：WebSocket自动重连导致无限循环
**现象**：控制台疯狂打印"尝试重新连接"
**解决**：
```javascript
wsClient.onclose = () => {
    // 先检查当前连接状态再重连
    if (!wsClient || wsClient.readyState === WebSocket.CLOSED) {
        setTimeout(() => connectWebSocket(), 5000);
    }
};
```

#### 错误3：localStorage数据污染
**现象**：刷新页面后出现重复的休息区/道路
**解决**：
```javascript
// 创建前先清理旧的同类对象
const oldItems = savedState.filter(item => 
    !item.name || !item.name.startsWith('restArea_')
);
localStorage.setItem('key', JSON.stringify(oldItems));
```

---

## 18. 完整MQTT数据流实现

### 18.1 架构总览（完整版）

```
┌──────────────────┐     MQTT发布      ┌─────────────────┐     订阅      ┌──────────────────┐
│  mqtt-simulator  │ ───────────────▶ │  MQTT Broker    │ ◀─────────── │  Spring Boot      │
│  (模拟传感器)    │   factory/sensor/ │  (emqx.io:1883) │              │  (MQTT Client)    │
│                  │   {id}/data       │                 │              │                   │
└──────────────────┘                    └─────────────────┘              └────────┬─────────┘
                                                                              │
                                                                              │ 处理+存储
                                                                              ▼
                                                                    ┌──────────────────┐
                                                                    │ PostgreSQL DB    │
                                                                    │ sensor_reading表 │
                                                                    └──────────────────┘
                                                                              │
                                                                              │ WebSocket推送
                                                                              ▼
                                                                    ┌──────────────────┐
                                                                    │ Vue 前端         │
                                                                    │ 实时可视化        │
                                                                    └──────────────────┘
```

### 18.2 组件说明

#### 1️⃣ mqtt-simulator.js（模拟传感器）
**作用**：模拟真实IoT设备，定时发送传感器数据到MQTT Broker

**文件位置**：`D:\vue-projects\cesium-learning\mqtt-simulator.js`

**功能**：
- 连接到公共MQTT Broker (`broker.emqx.io:8084`)
- 模拟4种传感器（温度、压力、振动、湿度）
- 每2-5秒发布一次数据
- Topic格式：`factory/sensor/{SENSOR_ID}/data`

**启动命令**：
```bash
node mqtt-simulator.js
```

**输出示例**：
```
✅ MQTT模拟器已连接到 broker.emqx.io
📡 开始发布传感器数据...

🟢 温度 | 68.5℃ | normal
🟢 压力 | 1.25MPa | normal
🟢 振动 | 2.8mm/s | normal
🟢 湿度 | 55.2%RH | normal
🟡 温度 | 81.2℃ | warning  ← 超过阈值
...
```

#### 2️⃣ MQTT Broker（消息中间件）
**作用**：接收传感器消息，转发给订阅者

**本项目使用**：公共Broker `broker.emqx.io`
- 地址：`wss://broker.emqx.io:8084/mqtt`（WebSocket方式）
- 无需账号密码
- 免费用于测试

**生产环境建议**：
- 自建Mosquitto或EMQX
- 启用认证和加密
- 配置集群保证高可用

#### 3️⃣ Spring Boot后端（MQTT Client + 数据处理）

**新增文件**：

##### MqttConfig.java - MQTT配置
```java
// 文件: backend/learning/src/main/java/com/cesium/learning/config/MqttConfig.java

@Configuration
public class MqttConfig {
    
    @Value("${mqtt.broker.url:tcp://broker.emqx.io:1883}")
    private String brokerUrl;
    
    @Bean
    public MqttClient mqttClient() throws MqttException {
        // 1. 创建MQTT客户端
        MqttClient client = new MqttClient(brokerUrl, "spring-boot-backend");
        
        // 2. 设置回调函数（接收消息时触发）
        client.setCallback(new MqttCallback() {
            @Override
            public void messageArrived(String topic, MqttMessage message) {
                String payload = new String(message.getPayload());
                // 处理接收到的传感器数据
                mqttMessageService.handleSensorData(topic, payload);
            }
        });
        
        // 3. 连接并订阅主题
        client.connect();
        client.subscribe("factory/sensor/#");  // # 通配符匹配所有子主题
        
        return client;
    }
}
```

##### MqttMessageService.java - 消息处理服务
```java
// 文件: backend/learning/src/main/java/com/cesium/learning/service/MqttMessageService.java

@Service
public class MqttMessageService {

    @Autowired
    private SensorReadingRepo sensorReadingRepo;  // 数据库访问层
    
    @Autowired
    private SensorWebSocketHandler webSocketHandler;  // WebSocket推送
    
    public void handleSensorData(String topic, String payload) {
        // 1. 解析JSON数据
        JsonNode json = objectMapper.readTree(payload);
        
        // 2. 提取字段
        String sensorId = json.get("sensorId").asText();
        double value = json.get("value").asDouble();
        
        // 3. 判断告警状态
        String status = determineStatus(value, threshold);
        
        // 4. 存入数据库（每条消息都保存！）
        SensorReading reading = SensorReading.builder()
            .sensorId(sensorId)
            .value(value)
            .status(status)
            .timestamp(LocalDateTime.now())
            .build();
        sensorReadingRepo.save(reading);  // 💾 持久化存储
        
        // 5. 通过WebSocket实时推送给前端
        String wsMessage = buildWebSocketMessage(...);
        webSocketHandler.broadcast(wsMessage);  // 📤 推送
    }
    
    private String determineStatus(double value, double threshold) {
        if (value >= threshold * 1.1) return "alarm";     // 🔴 告警
        if (value >= threshold * 0.9) return "warning";   // ⚠️ 预警
        return "normal";                                   // 🟢 正常
    }
}
```

#### 4️⃣ 数据库存储（PostgreSQL）

**sensor_reading 表结构**：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键，自增 |
| sensor_id | VARCHAR(255) | 传感器ID（外键） |
| value | DOUBLE PRECISION | 测量值 |
| status | VARCHAR(50) | 状态（normal/warning/alarm） |
| timestamp | TIMESTAMP | 记录时间 |

**数据示例**：
```sql
SELECT * FROM sensor_reading ORDER BY timestamp DESC LIMIT 10;

-- 输出:
-- id | sensor_id      | value | status  | timestamp
-- ----+----------------+-------+---------+---------------------------
-- 1001 | SENSOR-T-001  | 68.5  | normal  | 2026-02-07 13:57:34
-- 1000 | SENSOR-P-001  | 1.25  | normal  | 2026-02-07 13:57:33
-- 999  | SENSOR-V-001  | 2.8   | normal  | 2026-02-07 13:57:32
-- 998  | SENSOR-H-001  | 55.2  | normal  | 2026-02-07 13:57:30
-- ...（每条MQTT消息都会生成一条记录）
```

### 18.3 完整启动步骤

#### 步骤1：启动数据库
```bash
# 确保PostgreSQL正在运行
# 数据库名: cesium_learning
# 默认端口: 5432
```

#### 步骤2：启动Spring Boot后端
```bash
cd D:\vue-projects\cesium-learning\backend\learning
.\mvnw spring-boot:run
```

**预期日志**：
```
✅ MQTT 已连接到 Broker: tcp://broker.emqx.io:1883
📡 已订阅主题: factory/sensor/# 
Tomcat started on port(s): 8081 (http)
Started LearningApplication in x.xxx seconds
```

#### 步骤3：启动MQTT模拟器
```bash
cd D:\vue-projects\cesium-learning
node mqtt-simulator.js
```

**预期日志**：
```
✅ MQTT模拟器已连接到 broker.emqx.io
📡 开始发布传感器数据...

🟢 温度 | 68.5℃ | normal
🟢 压力 | 1.25MPa | normal
🟢 振动 | 2.8mm/s | normal
🟢 湿度 | 55.2%RH | normal
...（持续输出）
```

#### 步骤4：启动前端
```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173/`

#### 步骤5：验证完整流程

**检查点1 - 后端日志**：
```
📩 收到MQTT消息 | Topic: factory/sensor/SENSOR-T-001/data | Payload: {...}
💾 传感器数据已存储 | ID: SENSOR-T-001 | 值: 68.5℃ | 状态: normal
```

**检查点2 - 数据库查询**：
```sql
-- 在pgAdmin中执行
SELECT COUNT(*) FROM sensor_reading;  -- 应该看到数字在不断增加
```

**检查点3 - 前端控制台**：
```
✅ WebSocket 已连接到 Spring Boot 后端
🟢 SENSOR-T-001: 68.5℃
🟢 SENSOR-H-001: 55.2%RH
...（每2-5秒更新）
```

**检查点4 - 可视化界面**：
- ✅ 左侧面板显示4个传感器的实时数值
- ✅ 温度曲线图动态更新
- ✅ 3D场景中的传感器根据状态变色

### 18.4 数据流详解

#### 单条数据的完整生命周期

```
时间轴: T=0s          T=0.01s         T=0.05s         T=0.1s
         │               │               │               │
         ▼               ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ 模拟器    │   │ Broker   │   │ 后端     │   │ 前端     │
   │ 发布消息  │──▶│ 转发消息  │──▶│ 存储+推送 │──▶│ 显示     │
   └──────────┘   └──────────┘   └──────────┘   └──────────┘
   
   Payload:
   {              
     sensorId: 'SENSOR-T-001',
     value: 68.5,           
     unit: '℃',            
     status: 'normal'       
   }
```

### 18.5 告警机制

#### 告警判断逻辑
```java
private String determineStatus(double value, double threshold) {
    // alarmThreshold = 85 (温度阈值)
    
    if (value >= 85 * 1.1) return "alarm";     // ≥93.5 → 🔴 红色告警
    if (value >= 85 * 0.9) return "warning";   // ≥76.5 → 🟡 黄色预警
    return "normal";                             // <76.5 → 🟢 绿色正常
}
```

#### 告警数据处理
- **所有数据都存入数据库**（包括正常、预警、告警）
- **status字段标记状态**：便于后续查询统计
- **前端根据status显示不同颜色**

#### 查询告警记录
```sql
-- 查询最近1小时的所有告警记录
SELECT * FROM sensor_reading 
WHERE status IN ('warning', 'alarm') 
AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- 统计各状态的记录数
SELECT status, COUNT(*) as count 
FROM sensor_reading 
GROUP BY status;
-- 输出:
-- status  | count
----------+-------
-- normal  | 1200
-- warning | 45
-- alarm   | 3
```

### 18.6 扩展：添加新传感器

#### 方法1：修改mqtt-simulator.js
```javascript
// 在mqtt-simulator.js中添加新的setInterval
setInterval(() => {
  const gasValue = Math.random() * 100;  // 0-100% LEL
  
  client.publish('factory/sensor/SENSOR-G-001/data', JSON.stringify({
    sensorId: 'SENSOR-G-001',
    sensorType: 'gas',
    sensorName: '气体浓度传感器',
    value: gasValue,
    unit: '%LEL',
    alarmThreshold: 25.0,  // 25%LEL为危险值
    status: gasValue >= 27.5 ? 'alarm' : gasValue >= 22.5 ? 'warning' : 'normal',
    timestamp: new Date().toISOString(),
  }))
}, 4000)
```

#### 方法2：数据库插入sensor记录
```sql
INSERT INTO sensor (sensor_id, scene_id, building_label, sensor_type, x, y, z, ry)
VALUES (
  'SENSOR-G-001',
  'scene-1785737250960',
  '主厂房',
  'gas',
  20.0,
  1.5,
  10.0,
  0.0
);
```

后端会自动：
1. 接收MQTT消息
2. 存入sensor_reading表
3. 推送给前端显示

### 18.7 性能优化建议

#### 数据库优化
```sql
-- 为常用查询创建索引
CREATE INDEX idx_reading_sensor_time ON sensor_reading(sensor_id, timestamp DESC);

-- 定期清理旧数据（保留最近7天）
DELETE FROM sensor_reading WHERE timestamp < NOW() - INTERVAL '7 days';
```

#### 批量插入优化
如果传感器数量多（>100个），考虑批量插入：
```java
List<SensorReading> readings = new ArrayList<>();
readings.add(reading1);
readings.add(reading2);
sensorReadingRepo.saveAll(readings);  // 一次性保存多条
```

#### WebSocket消息压缩
对于高频更新的传感器，可以合并消息：
```java
// 不是每条MQTT消息都推送，而是每500ms批量推送一次
@Scheduled(fixedRate = 500)
public void batchPushToWebSocket() {
    List<String> messages = messageQueue.drain();
    webSocketHandler.broadcast(JSON.stringify(messages));
}
```

---

## 19. 故障排查指南

### 19.1 常见问题及解决方案

#### ❌ 问题1：Spring Boot无法连接MQTT Broker
**症状**：
```
❌ MQTT 连接失败: Connection lost
```

**解决方案**：
1. **检查网络**：确保能访问 `broker.emqx.io`
2. **换用本地Broker**：安装Mosquitto
   ```bash
   # Windows (Chocolatey)
   choco install mosquitto
   
   # 启动服务
   mosquitto -v
   
   # 修改application.yml
   mqtt.broker.url=tcp://localhost:1883
   ```
3. **检查防火墙**：允许1883/8883端口

#### ❌ 问题2：模拟器发布消息但后端收不到
**可能原因**：
1. **Topic不匹配**
   - 模拟器发布：`factory/sensor/SENSOR-T-001/data`
   - 后端订阅：`factory/sensor/#`
   - ✅ 应该能匹配

2. **QoS级别不同**
   - 模拟器默认QoS=0
   - 后端订阅QoS=1
   - **解决**：统一QoS级别

3. **Broker未正确转发**
   - 在EMQX Dashboard查看消息流量

**调试方法**：
```javascript
// 在mqtt-simulator.js中添加确认回调
client.publish(topic, payload, { qos: 1 }, (err) => {
  if (err) console.error('❌ 发布失败:', err)
  else console.log('✅ 消息已发布:', topic)
})
```

#### ❌ 问题3：数据存入数据库但前端不更新
**检查清单**：
1. ✅ WebSocket是否连接？（浏览器控制台查看）
2. ✅ 后端是否调用 `webSocketHandler.broadcast()`？
3. ✅ 前端 `wsClient.onmessage` 是否触发？
4. ✅ ECharts图表是否初始化？

**调试代码**：
```javascript
// 前端添加详细日志
wsClient.onmessage = (event) => {
  console.log('📨 收到WebSocket消息:', event.data);  // 添加这行
  const data = JSON.parse(event.data);
  // ...
}
```

#### ❌ 问题4：数据库写入失败
**症状**：
```
❌ 处理MQTT消息失败 | Error: ...
```

**常见原因**：
1. **数据库连接断开** → 检查PostgreSQL是否运行
2. **字段类型不匹配** → value是DOUBLE但传了字符串
3. **表不存在** → 运行SQL创建表

**解决**：
```bash
# 重启PostgreSQL服务
net start postgresql-x64-17

# 或者在pgAdmin中手动执行建表语句
```

### 19.2 日志分析技巧

#### 关键日志关键词
| 关键词 | 含义 | 正常频率 |
|--------|------|---------|
| `收到MQTT消息` | 后端成功接收 | 每秒多次 |
| `传感器数据已存储` | 数据库写入成功 | 每秒多次 |
| `MQTT 连接丢失` | Broker断开 | 不应该出现 |
| `WebSocket 连接关闭` | 前端断开 | 刷新页面时有 |

#### 日志过滤命令
```bash
# 只看MQTT相关日志
grep "MQTT" logs/application.log

# 只看错误
grep "❌" logs/application.log

# 统计消息量
grep "传感器数据已存储" logs/application.log | wc -l
```

---

**文档版本**: v3.0  
**最后更新**: 2026-02-07  
**作者**: AI助手 + 用户共同编写

---

## 12. ECharts 传感器可视化

### 12.1 ECharts 仪表盘组件（GaugeChart.vue）

**文件路径**：`src/components/GaugeChart.vue`

#### 核心功能
- 半圆形指针式仪表盘（220°弧形）
- 浅蓝色玻璃质感风格（Glassmorphism）
- 实时数据更新与平滑动画
- 响应式自适应容器大小
- 组件销毁时自动释放资源

#### 使用示例
```vue
<template>
  <GaugeChart
    :value="currentTemp"
    title="温度"
    unit="℃"
    :min="-20"
    :max="60"
    color="#4a90ff"
  />
</template>

<script setup>
import GaugeChart from './components/GaugeChart.vue'
</script>
```

#### Props 属性
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| value | Number | 0 | 当前显示的数值 |
| title | String | '' | 仪表盘标题 |
| unit | String | '' | 单位（如 ℃、%、MPa） |
| min | Number | 0 | 最小刻度值 |
| max | Number | 100 | 最大刻度值 |
| color | String | '#4a90ff' | 主题颜色 |

### 12.2 ECharts 配置详解

#### 半圆仪表盘核心配置
```javascript
option = {
  series: [{
    type: 'gauge',
    startAngle: 200,      // 起始角度（9点钟方向偏右20°）
    endAngle: -20,        // 结束角度（3点钟方向偏左20°）
    min: 0,              // 最小值
    max: 100,            // 最大值
    center: ['50%', '60%'], // 圆心位置（相对于容器）
    radius: '90%',       // 半径占比

    // 指针样式
    pointer: {
      show: true,
      length: '60%',     // 指针长度（占半径百分比）
      width: 2.5,        // 指针粗细
      itemStyle: {
        color: props.color  // 指针颜色
      }
    },

    // 进度条（当前值的填充区域）
    progress: {
      show: true,
      width: 8,          // 进度条宽度
      roundCap: true,    // 圆角端点
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: `${props.color}44` },  // 渐变起点（透明）
          { offset: 1, color: props.color }           // 渐变终点（实色）
        ])
      }
    },

    // 轴线背景
    axisLine: {
      lineStyle: {
        width: 8,
        color: [[1, `${props.color}18`]]  // 轴线颜色（极淡）
      }
    },

    // 刻度线
    splitLine: {
      show: true,
      length: 6,         // 刻度线长度
      lineStyle: {
        color: `${props.color}35`,  // 刻度线颜色
        width: 1
      }
    },

    // 刻度数字
    axisLabel: {
      show: true,
      distance: 14,      // 数字距离轴线的距离
      fontSize: 9,
      color: `${props.color}88`,
      formatter: '{value}'
    },

    // 数值详情（中心大字）
    detail: {
      valueAnimation: true,   // 数值变化时动画过渡
      fontSize: 18,
      fontWeight: 'bold',
      offsetCenter: [0, '45%'], // 位置偏移
      color: props.color,
      formatter: function(val) {
        return `{value|${val}}{unit|${props.unit}}`  // 富文本格式
      },
      rich: {
        value: { fontSize: 19, fontWeight: 'bold' },
        unit: { fontSize: 10, padding: [0, 0, 0, 2] }
      }
    },

    // 标题（底部文字）
    title: {
      show: true,
      offsetCenter: [0, '85%'],
      fontSize: 11,
      color: `${props.color}99`
    },

    // 数据数组
    data: [{
      value: props.value,  // 当前值
      name: props.title     // 标题
    }]
  }],
  animation: true,
  animationDuration: 800,    // 动画时长
  animationEasing: 'cubicOut' // 缓动函数
}
```

### 12.3 Vue 组件最佳实践

#### 1️⃣ DOM 就绪检查（关键！）
```javascript
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

async function initChart() {
  await nextTick()  // ✅ 等待 Vue 更新 DOM
  
  if (gaugeRef.value && !chart) {
    try {
      chart = echarts.init(gaugeRef.value)
      chart.setOption(getOption())
      
      window.addEventListener('resize', handleResize)
    } catch (e) {
      console.error('❌ 仪表盘初始化失败:', e)
    }
  }
}

onMounted(() => {
  initChart()
})
```

**为什么需要 `nextTick()`？**
- Vue 的响应式更新是异步的
- `onMounted` 时模板中的 ref 可能还未绑定到真实 DOM
- 不等待会导致 ECharts 找不到容器元素，初始化失败

#### 2️⃣ 资源管理（防止内存泄漏）
```javascript
function handleResize() {
  if (chart) {
    chart.resize()  // 窗口大小变化时自动调整
  }
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)  // 移除事件监听
  
  if (chart) {
    chart.dispose()  // 销毁 ECharts 实例
    chart = null
  }
})
```

#### 3️⃣ 数据更新优化（局部刷新）
```javascript
watch(() => props.value, (newVal) => {
  if (chart) {
    // ✅ 只更新数据，不重绘整个图表
    chart.setOption({
      series: [{
        data: [{ value: newVal }]
      }]
    })
  }
}, { immediate: false })
```

**优势：**
- 性能高（不重新渲染整个图表）
- 动画平滑（ECharts 自动插值过渡）
- 避免闪烁

### 12.4 玻璃质感 CSS 样式（Glassmorphism）

```css
.gauge-wrapper {
  /* 背景：极淡蓝色半透明 */
  background: rgba(74, 144, 255, 0.06);
  
  /* 模糊效果 */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px); /* Safari 兼容 */
  
  /* 边框：半透明白蓝 */
  border: 1px solid rgba(74, 144, 255, 0.2);
  
  /* 圆角 */
  border-radius: 12px;
  
  /* 内边距 */
  padding: 10px;
  
  /* 多层阴影 */
  box-shadow:
    0 4px 16px rgba(74, 144, 255, 0.08),      /* 外阴影（柔和扩散） */
    inset 0 1px 0 rgba(255, 255, 255, 0.2);    /* 内发光（顶部高光）*/
}
```

**透明度参考表：**
| 用途 | 透明度 | 示例 |
|------|--------|------|
| 背景底色 | 5% ~ 8% | `rgba(74, 144, 255, 0.06)` |
| 边框线条 | 15% ~ 25% | `rgba(74, 144, 255, 0.2)` |
| 文字主色 | 80% ~ 100% | `#4a90ff` 或 `rgba(74, 144, 255, 0.9)` |
| 文字辅助 | 50% ~ 70% | `rgba(74, 144, 255, 0.6)` |
| 阴影扩散 | 8% ~ 15% | `rgba(74, 144, 255, 0.1)` |
| 内发光 | 15% ~ 30% | `rgba(255, 255, 255, 0.2)` |

### 12.5 传感器面板设计模式

#### 功能需求
1. **动态数量** - 显示所有传感器，每个一个仪表盘
2. **类型筛选** - 可切换查看全部/仅温度/仅湿度等
3. **滚动支持** - 传感器过多时可滚动浏览
4. **实时更新** - 数据变化时平滑动画过渡

#### 实现架构

```javascript
// 1️⃣ 筛选状态
const gaugeFilterType = ref('all')  // 'all' | 'temp' | 'humidity' | ...

// 2️⃣ 计算属性：过滤后的传感器列表
const gaugeSensors = computed(() => {
  let filtered = sensors.value  // 默认全部
  
  if (gaugeFilterType.value !== 'all') {
    filtered = getSensorsByType(gaugeFilterType.value)  // 按类型过滤
  }
  
  return filtered.map(sensor => ({
    id: sensor.sensorId,
    name: sensor.name || sensor.sensorId,
    value: sensor.value || 0,      // 来自 WebSocket 的真实数据
    unit: sensor.unit,
    color: getColorByType(sensor.sensorType),
    status: sensor.status
  }))
})

// 3️⃣ 筛选选项（带计数）
const gaugeFilterOptions = computed(() => [
  { value: 'all', label: '全部', icon: '📊', count: sensors.value.length },
  ...sensorTypesList.map(type => ({
    value: type.type,
    label: type.label,
    icon: type.icon,
    count: getSensorsByType(type.type).length
  }))
])
```

#### 模板结构
```vue
<div class="sensor-gauges-panel">
  <!-- 头部：标题 + 筛选按钮 -->
  <div class="gauges-header">
    <span class="gauges-title">📡 传感器监控</span>
    <div class="gauges-filter">
      <button
        v-for="option in gaugeFilterOptions"
        :key="option.value"
        :class="{ active: gaugeFilterType === option.value }"
        @click="gaugeFilterType = option.value"
      >
        {{ option.icon }}
        <span class="filter-count">{{ option.count }}</span>
      </button>
    </div>
  </div>

  <!-- 可滚动容器 -->
  <div class="gauges-scroll-container" :class="{ scrollable: gaugeSensors.length > 4 }">
    <div class="gauges-grid">
      <GaugeChart v-for="s in gaugeSensors" :key="s.id" ... />
    </div>
  </div>

  <!-- 提示信息 -->
  <div class="gauges-footer" v-if="gaugeSensors.length > 4">
    <span>↓ 共 {{ gaugeSensors.length }} 个传感器，可滚动 ↓</span>
  </div>
</div>
```

#### 滚动条美化
```css
.gauges-scroll-container::-webkit-scrollbar {
  width: 4px;  /* 细滚动条 */
}

.gauges-scroll-container::-webkit-scrollbar-track {
  background: rgba(74, 144, 255, 0.05);  /* 轨道淡色 */
}

.gauges-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(74, 144, 255, 0.25);  /* 滑块半透明 */
  border-radius: 2px;
}

.gauges-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(74, 144, 255, 0.4);   /* 悬停加深 */
}
```

### 12.6 响应式布局策略

#### 断点设计
| 屏幕宽度 | 位置 | 布局 | 最大高度 |
|---------|------|------|---------|
| **> 1400px** | 右上角（top: 280px, right: 20px） | 固定宽度320px，2列网格 | 400px |
| **1200~1400px** | 右上角（稍窄） | 宽度290px | 350px |
| **768~1200px** | 底部居中 | 自适应宽度，auto-fill网格 | 280px |
| **< 768px** | 底部全宽 | 左右贴边10px，2列固定 | 240px |

#### 关键CSS
```css
/* 大屏：右侧固定 */
@media (min-width: 1201px) {
  .sensor-gauges-panel {
    position: fixed;
    top: 280px;
    right: 20px;
    width: 320px;
  }
}

/* 中屏：底部居中 */
@media (max-width: 1200px) {
  .sensor-gauges-panel {
    top: auto;
    bottom: 15px;
    left: 50%;
    transform: translateX(-50%);
    width: auto;
    max-width: 600px;
  }

  .gauges-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
```

### 12.7 性能优化建议

#### 1️⃣ 减少不必要的重渲染
```javascript
// ❌ 错误：每次都重建整个配置对象
watch(() => props.value, () => {
  chart.setOption(getOption())  // 重新创建整个option对象
})

// ✅ 正确：只更新变化的字段
watch(() => props.value, (val) => {
  chart.setOption({
    series: [{ data: [{ value: val }] }]  // 只更新data
  })
})
```

#### 2️⃣ 防抖处理（高频数据场景）
```javascript
import { debounce } from 'lodash-es'

const debouncedUpdate = debounce((value) => {
  chart.setOption({ series: [{ data: [{ value }] }] })
}, 300)

watch(() => props.value, (val) => {
  debouncedUpdate(val)
})
```

#### 3️⃣ 虚拟滚动（超多传感器时）
如果传感器超过50个，考虑使用虚拟滚动库：
- [vue-virtual-scroller](https://github.com/Akryum/vue-virtual-scroller)
- [tanstack-virtual](https://tanstack.com/virtual/latest)

### 12.8 常见问题排查

#### 问题1：仪表盘显示空白
**原因**：DOM未就绪时就初始化 ECharts
**解决**：
```javascript
onMounted(async () => {
  await nextTick()  // 必须等待
  initChart()
})
```

#### 问题2：数值不更新
**原因**：watch 未触发或 ECharts 实例丢失
**检查点**：
1. props.value 是否真的变化了？
2. chart 实例是否被 dispose 了？
3. 是否用了 `{ immediate: false }`？

#### 问题3：内存泄漏
**原因**：组件销毁时未清理资源
**解决**：
```javascript
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
```

#### 问题4：滚动条太丑
**解决**：使用自定义滚动条样式（见12.5节）

---

## 13. 开发经验总结

### 13.1 数据流设计原则

**推荐模式：**
```
WebSocket/MQTT → sensors.value (响应式数组) → computed 过滤 → 组件 Props → ECharts 渲染
```

**优势：**
- 单一数据源（sensors.value）
- 响应式自动更新
- 易于调试和扩展
- 支持多种视图（列表、图表、地图标记等）

### 13.2 组件复用性 checklist

开发可复用组件时确保：

- [ ] Props 定义清晰且有默认值
- [ ] 支持响应式 resize
- [ ] 正确的生命周期管理（mounted/unmounted）
- [ ] 错误边界处理（try-catch）
- [ ] 无外部依赖（自包含）
- [ ] 样式可通过 props 或 CSS 变量定制
- [ ] 有明确的类型定义（TypeScript 更佳）

### 13.3 调试技巧

**1. 查看 ECharts 实例状态**
```javascript
console.log('图表实例:', chart)
console.log('当前配置:', chart?.getOption())
console.log('容器尺寸:', gaugeRef.value?.getBoundingClientRect())
```

**2. 监听数据变化**
```javascript
watch(() => props.value, (newVal, oldVal) => {
  console.log('数值变化:', oldVal, '→', newVal)
}, { immediate: true })
```

**3. 检查计算属性**
```javascript
watch(gaugeSensors, (newList) => {
  console.log('传感器列表更新:', newList.length, '个')
}, { deep: true })
```

---

## 20. ECharts 多独立小图表方案

### 20.1 场景背景

**问题**：多个传感器的数据范围差异大（温度0-80℃、湿度0-100%、气体0-500ppm），放在同一个折线图中：
- ❌ Y轴无法适配所有数据
- ❌ 不同传感器数据更新频率不同导致X轴跳动
- ❌ 折线重叠难以区分

**解决方案**：每个传感器一个独立的ECharts实例，排列成网格布局。

### 20.2 核心架构

#### 20.2.1 布局结构（CSS Grid）

```html
<!-- 容器 -->
<div ref="chartRef" class="realtime-chart-grid"></div>
```

```css
.realtime-chart-grid {
  width: 100%;
  height: 400px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);  /* 3列 */
  grid-template-rows: repeat(2, 1fr);      /* 2行 */
  gap: 10px;                                /* 间距 */
}

.realtime-mini-chart {
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}
```

**布局效果**：
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   温度-1     │  │   湿度-1     │  │   湿度-2     │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│   气体-1     │  │   振动-1     │
└──────────────┘  └──────────────┘
```

#### 20.2.2 多实例管理

```javascript
// 单一实例（旧方案）
let realtimeChart = null

// 多实例字典（新方案）
let realtimeCharts = {}  // { sensorId: chartInstance }
```

### 20.3 动态创建DOM和初始化

#### 20.3.1 创建容器并延迟初始化

```javascript
function initRealtimeChart() {
  if (!chartRef.value) return
  
  // 清空旧内容
  chartRef.value.innerHTML = ''
  
  const filteredSensors = realtimeFilterType.value === 'all'
    ? allSensorsList.value
    : allSensorsList.value.filter(s => s.type === realtimeFilterType.value)

  filteredSensors.forEach((sensor, index) => {
    // 动态创建DOM容器
    const container = document.createElement('div')
    container.className = 'realtime-mini-chart'
    container.id = `mini-chart-${sensor.id}`
    chartRef.value.appendChild(container)

    // 关键：延迟初始化，确保DOM渲染完成
    const delay = 150 + (index * 100)  // 基础150ms + 每个额外100ms
    
    setTimeout(() => {
      try {
        // 再次检查容器是否有效
        if (!container || !container.offsetWidth || !container.offsetHeight) {
          console.warn(`⚠️ ${sensor.name} 容器未准备好，重试...`)
          setTimeout(() => initSingleChart(container, sensor), 200)
          return
        }
        
        initSingleChart(container, sensor)
      } catch (e) {
        console.error(`❌ ${sensor.name} 图表初始化失败:`, e.message)
      }
    }, delay)
  })
}
```

#### 20.3.2 独立初始化函数

```javascript
function initSingleChart(container, sensor) {
  // 双重保险：检查容器有效性
  if (!container || !container.offsetWidth || !container.offsetHeight) {
    console.error(`❌ ${sensor.name} 容器无效`)
    return
  }

  // 创建独立的ECharts实例
  const chart = echarts.init(container)
  
  // 存储到字典
  realtimeCharts[sensor.id] = chart
  
  // 更新该传感器的数据
  updateSingleSensorChart(sensor)
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => chart?.resize())
}
```

### 20.4 独立数据更新机制

#### 20.4.1 单传感器更新函数

```javascript
function updateSingleSensorChart(sensor) {
  try {
    const chart = realtimeCharts[sensor.id]
    if (!chart || realtimePaused.value) return

    // 获取该传感器的历史数据
    const history = sensorHistoryData.value[sensor.id] || []
    
    // 预填充机制：如果数据不足，用模拟数据补齐
    let realData = history.map(h => h.value)
    
    if (realData.length < MAX_HISTORY_POINTS) {
      const needFill = MAX_HISTORY_POINTS - realData.length
      for (let i = needFill - 1; i >= 0; i--) {
        // 使用正弦波+随机数生成自然波动
        const variation = (Math.sin(i * 0.5) * 0.7 + Math.random() * 0.6 - 0.3) * config.range
        realData.unshift(Number((config.base + variation).toFixed(1)))
      }
    }
    
    // 只保留最近的数据点
    realData = realData.slice(-MAX_HISTORY_POINTS)

    // 根据实际数据动态调整Y轴范围
    const allValues = realData.filter(v => v !== null && v !== undefined)
    let yAxisMin = sensor.min
    let yAxisMax = sensor.max

    if (allValues.length > 0) {
      const dataMin = Math.min(...allValues)
      const dataMax = Math.max(...allValues)
      const range = dataMax - dataMin || 1
      yAxisMin = Math.max(sensor.min, dataMin - range * 0.2)
      yAxisMax = Math.min(sensor.max, dataMax + range * 0.2)
    }

    // 设置该传感器的专属配置
    chart.setOption({
      backgroundColor: 'transparent',
      
      // 标题显示传感器名称
      title: {
        text: `${sensor.name}`,
        left: 'center',
        top: 2,
        textStyle: { color: '#e2e8f0', fontSize: 11 }
      },
      
      // 网格布局（内边距）
      grid: { top: 28, right: 8, bottom: 22, left: 35 },
      
      // X轴隐藏（因为每个图表时间线不同）
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false,
      },
      
      // Y轴根据传感器类型自动调整
      yAxis: {
        type: 'value',
        min: yAxisMin,
        max: yAxisMax,
        axisLabel: {
          color: '#e2e8f0',  // 亮白色数字
          fontSize: 10,
          formatter: (val) => Number.isInteger(val) ? val : val.toFixed(1)
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisTick: { show: true, lineStyle: { color: 'rgba(255,255,255,0.3)' } }
      },
      
      // 只有一个series（当前传感器）
      series: [{
        name: sensor.name,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: sensor.color },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: sensor.color + '33' },
            { offset: 1, color: sensor.color + '05' }
          ])
        },
        data: realData
      }]
    })
  } catch (error) {
    console.error(`❌ 更新 ${sensor.name} 图表失败:`, error.message)
    // 错误不会影响其他传感器！
  }
}
```

#### 20.4.2 批量更新所有图表

```javascript
function updateRealtimeChart() {
  // 检查是否有已初始化的图表
  if (!Object.keys(realtimeCharts).length) return
  
  const filteredSensors = realtimeFilterType.value === 'all'
    ? allSensorsList.value
    : allSensorsList.value.filter(s => s.type === realtimeFilterType.value)

  // 遍历更新每个传感器
  filteredSensors.forEach(sensor => {
    updateSingleSensorChart(sensor)
  })
}
```

### 20.5 Watch监听数据变化

```javascript
// 监听历史数据和筛选条件的变化
watch(
  () => ({ ...sensorHistoryData.value, filterType: realtimeFilterType.value }),
  () => {
    // 必须检查新变量名！
    if (
      realtimePanelExpanded.value && 
      Object.keys(realtimeCharts).length > 0 &&  // ✅ 不是 realtimeChart
      !realtimePaused.value
    ) {
      updateRealtimeChart()
    }
  },
  { deep: true }
)
```

**常见错误**：
```javascript
// ❌ 错误：还在使用旧的变量名
if (realtimePanelExpanded.value && realtimeChart && !realtimePaused.value) {
  updateRealtimeChart()
}

// ✅ 正确：使用新的变量名
if (realtimePanelExpanded.value && Object.keys(realtimeCharts).length > 0 && !realtimePaused.value) {
  updateRealtimeChart()
}
```

### 20.6 清理与销毁

#### 20.6.1 清除数据时销毁所有图表

```javascript
function clearHistoryData() {
  // 清空历史数据
  Object.keys(sensorHistoryData.value).forEach(key => {
    sensorHistoryData.value[key] = []
  })
  
  // 销毁所有图表实例
  Object.values(realtimeCharts).forEach(chart => {
    if (chart) chart.dispose()
  })
  realtimeCharts = {}
}
```

#### 20.6.2 组件卸载时清理

```javascript
onUnmounted(() => {
  // 销毁所有图表实例
  Object.values(realtimeCharts).forEach(chart => {
    try { chart?.dispose() } catch (e) {}
  })
  realtimeCharts = {}
})
```

#### 20.6.3 切换筛选条件时重新初始化

```javascript
watch(realtimeFilterType, () => {
  // 先销毁旧的
  Object.values(realtimeCharts).forEach(chart => {
    try { chart?.dispose() } catch (e) {}
  })
  realtimeCharts = {}
  
  // 再重新创建
  nextTick(() => {
    initRealtimeChart()
  })
})
```

### 20.7 关键技术点总结

| 问题 | 解决方案 |
|------|----------|
| **Y轴不统一** | 每个图表独立的yAxis配置 |
| **X轴跳动** | 隐藏X轴，或使用固定序号 |
| **数据更新频率不同** | 各图表独立更新，互不影响 |
| **第一个图表消失** | 延迟初始化(150ms+) + 容器尺寸检查 + 重试机制 |
| **一个出错全部消失** | try-catch包裹每个图表的更新逻辑 |
| **变量名混淆** | 统一使用`realtimeCharts`（字典），废弃`realtimeChart`（单例） |

### 20.8 性能优化建议

1. **限制数据点数量**：`MAX_HISTORY_POINTS = 30`（避免内存溢出）
2. **延迟初始化**：基础150ms + index*100ms（确保DOM渲染完成）
3. **错误隔离**：每个图表try-catch（防止单点故障扩散）
4. **按需渲染**：只渲染当前筛选类型的传感器图表
5. **动画优化**：`animationDuration: 300`（不要太长）

---

## 21. UI/UX 设计原则与用户反馈处理

### 21.1 核心原则

#### 21.1.1 保持界面简洁

**错误示例**：
- ❌ 添加复杂的弹窗遮挡三维场景
- ❌ 左侧图表容器占用大量屏幕空间
- ❌ 过多的动画效果分散注意力

**正确做法**：
- ✅ 双击仪表盘直接飞到传感器位置（一步到位）
- ✅ 图表放在可收起的侧边面板中
- ✅ 交互方式简单直观

#### 21.1.2 遵循用户习惯

| 用户期望 | 实现方式 |
|----------|----------|
| 双击查看详情 | `dblclick` 事件触发飞行 |
| 点击选中 | `click` 事件高亮显示 |
| 拖动旋转 | OrbitControls 默认行为 |
| 滚轮缩放 | OrbitControls 默认行为 |

### 21.2 事件冲突解决方案

#### 21.2.1 click vs dblclick 冲突

**问题**：单击和双击会同时触发，导致功能混乱。

**解决方案**：
```javascript
let clickTimer = null
let lastClickTime = 0

function handleClick(sensorId) {
  const now = Date.now()
  
  // 判断是单击还是双击
  if (now - lastClickTime < 300) {
    // 双击：飞到传感器
    clearTimeout(clickTimer)
    flyToSensor(sensorId)
  } else {
    // 单击：延迟执行，等待可能的第二次点击
    clickTimer = setTimeout(() => {
      // 单击逻辑（如高亮）
      highlightSensor(sensorId)
    }, 300)
  }
  
  lastClickTime = now
}
```

#### 21.2.2 路径编辑模式 vs 场景交互

**问题**：路径编辑模式下，点击场景添加路径点，但同时也触发了建筑选择。

**解决方案**：
```javascript
function onRouteClick(event) {
  // 优先处理路径编辑模式
  if (isSettingPathMode.value) {
    addPathPoint(event)
    return  // 阻止后续处理
  }
  
  // 其他模式下的点击逻辑
  selectBuilding(event)
}
```

### 21.3 功能分离原则

#### 21.3.1 避免"多功能"按钮

**错误设计**：
```javascript
// ❌ 一个按钮做太多事情
function handleGaugeClick(sensorId) {
  showDetailChart(sensorId)   // 显示图表
  showFlyButton(sensorId)     // 显示飞行按钮
  highlightSensor(sensorId)   // 高亮传感器
}
```

**正确设计**：
```javascript
// ✅ 每个功能独立清晰
function handleGaugeClick(sensorId) {
  // 直接飞到传感器，简单明了
  ensureControlsEnabled()
  flyToSensor(sensorId)
}

// 图表功能单独放在侧边面板
function toggleRealtimePanel() {
  realtimePanelExpanded.value = !realtimePanelExpanded.value
}
```

### 21.4 代码清理最佳实践

#### 21.4.1 删除无用代码的检查清单

当删除一个功能时，需要清理：

| 检查项 | 示例 |
|--------|------|
| **HTML模板** | `<div v-if="showLeftCharts">` |
| **CSS样式** | `.left-charts-container { ... }` |
| **JavaScript变量** | `const showLeftCharts = ref(false)` |
| **JavaScript函数** | `function initLeftCharts() { ... }` |
| **watch监听器** | `watch(showLeftCharts, ...)` |
| **事件监听** | `window.addEventListener('resize', ...)` |

#### 21.4.2 使用搜索工具彻底清理

```bash
# 搜索所有相关代码
grep -rn "leftCharts" src/
grep -rn "detail-chart" src/
grep -rn "showLeftCharts" src/
```

**确保删除干净**：
1. 变量声明
2. 函数定义
3. 函数调用
4. watch监听
5. CSS样式
6. HTML模板
7. 注释说明

### 21.5 响应用户反馈的正确姿势

#### 21.5.1 快速响应

**用户说**："丑死了，谁允许你做这个的，删掉这个"

**正确反应**：
1. ✅ 立即道歉（不要辩解）
2. ✅ 快速定位并删除相关代码
3. ✅ 确认没有残留
4. ✅ 验证功能正常

**错误反应**：
- ❌ "这个设计其实挺好的..."
- ❌ "等一下让我解释一下..."
- ❌ 慢吞吞地查找代码

#### 21.5.2 记录教训

每次遇到用户强烈反馈，记录到文档中：

```markdown
### 21.5.3 失败案例库

**案例1：左侧折线图布局**
- **时间**：2026-01-09
- **需求**：将折线图移至左侧竖着摆放
- **实现**：添加了`.left-charts-container`和弹窗
- **用户反馈**："丑死了，太恶心了"
- **原因**：遮挡了三维场景，不符合用户使用习惯
- **教训**：保持界面简洁，不要过度设计
- **解决**：恢复原始的双击飞到传感器功能
```

### 21.6 性能与体验平衡

#### 21.6.1 动画适度原则

| 效果 | 推荐时长 | 说明 |
|------|----------|------|
| 按钮hover | 0.2s | 即时反馈 |
| 面板滑出 | 0.3s | 平滑但不拖沓 |
| 相机飞行 | 1-2s | 给用户适应时间 |
| 数据更新 | 0.3s | 可见变化过程 |

**过度动画的危害**：
- ❌ 用户等待时间过长
- ❌ 分散注意力
- ❌ 降低操作效率
- ❌ 引起视觉疲劳

#### 21.6.2 图层管理

```javascript
// z-index 层级规划
const Z_INDEX = {
  background: 0,        // 背景
  scene3d: 10,          // 三维场景
  toolbar: 20,          // 工具栏
  sensorPanel: 30,      // 传感器面板
  realtimePanel: 40,     // 实时数据面板
  modal: 999,           // 弹窗（慎用）
  loading: 1000         // 加载遮罩
}
```

**原则**：弹窗层级最高，但要少用！

### 21.7 调试技巧

#### 21.7.1 检查语法错误

```javascript
// 使用 VS Code 诊断功能
GetDiagnostics({ uri: 'file:///path/to/file.vue' })

// 或运行 lint 检查
npm run lint
```

#### 21.7.2 搜索残留代码

```javascript
// 在文件中搜索关键词
Grep({
  pattern: 'left-charts|detail-chart',
  path: 'src/pages/FactoryDetail.vue',
  output_mode: 'content',
  n: true  // 显示行号
})
```

---

## 22. 开发效率提升技巧

### 22.1 批量操作工具

#### 22.2.1 并行搜索

```javascript
// 同时搜索多个关键词，减少工具调用次数
Grep({ pattern: 'pattern1', ... })
Grep({ pattern: 'pattern2', ... })
Grep({ pattern: 'pattern3', ... })
```

#### 22.2.2 批量读取文件

```javascript
// 一次调用读取多个区域
Read({ file_path: 'file.vue', offset: 100, limit: 100 })
Read({ file_path: 'file.vue', offset: 500, limit: 50 })
Read({ file_path: 'file.vue', offset: 5690, limit: 200 })
```

### 22.2 代码复用模式

#### 22.2.1 清理函数模板

```javascript
/**
 * 彻底删除某功能的完整流程
 * @param {string} featureName - 功能名称
 * @param {string[]} keywords - 相关关键词列表
 */
function cleanupFeature(featureName, keywords) {
  console.log(`🧹 开始清理: ${featureName}`)
  
  // 1. 搜索所有相关代码
  keywords.forEach(keyword => {
    const results = Grep({ pattern: keyword, n: true })
    console.log(`找到 ${results.length} 处 "${keyword}"`)
  })
  
  // 2. 逐一删除（HTML → JS → CSS）
  // 3. 验证无残留
  // 4. 检查语法错误
  
  console.log(`✅ 清理完成: ${featureName}`)
}
```

### 22.3 文档维护建议

#### 22.3.1 定期整理知识

**频率**：每完成一个重要功能或修复一个重要bug后

**内容**：
1. 问题背景
2. 解决方案
3. 关键代码
4. 经验教训
5. 避坑指南

#### 22.3.2 分类编号

使用清晰的章节结构：
```markdown
## X. 大类标题
### X.X 子类标题
#### X.X.X 具体知识点
```

**好处**：
- 方便快速查找
- 避免重复内容
- 便于维护更新

---

## 23. SVG 高级可视化技巧

### 23.1 流光边框动画实现

#### 23.1.1 核心原理
使用 SVG `<use>` 元素 + CSS `stroke-dashoffset` 动画实现流光效果：

```html
<svg class="flow-border-svg" viewBox="0 0 320 200">
  <defs>
    <!-- 渐变定义 -->
    <linearGradient id="flowOuter" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a90ff"/>
      <stop offset="50%" stop-color="#42e2f5"/>
      <stop offset="100%" stop-color="#4a90ff"/>
    </linearGradient>

    <!-- 八角路径 -->
    <path id="octPath" d="M 10,0 L 310,0 L 320,10 L 320,190 L 310,200 L 10,200 L 0,190 L 0,10 Z"/>

    <!-- 模糊滤镜 -->
    <filter id="blurOuter" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- 三层流光带 -->
  <use href="#octPath" stroke="url(#flowOuter)" stroke-width="6"
       stroke-dasharray="120 240" filter="url(#blurOuter)" class="flow-outer"/>
  <use href="#octPath" stroke="url(#flowMid)" stroke-width="3.5"
       stroke-dasharray="120 240" filter="url(#blurMid)" class="flow-mid"/>
  <use href="#octPath" stroke="url(#flowCore)" stroke-width="1.5"
       stroke-dasharray="120 240" class="flow-core"/>
</svg>
```

```css
.flow-outer { animation: energyFlow 6s linear infinite; }
@keyframes energyFlow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -360; }
}
```

#### 23.1.2 关键参数说明

| 参数 | 作用 | 推荐值 |
|------|------|--------|
| `stroke-dasharray` | 虚线段长度+间隔 | `120 240` (1:2比例) |
| `stroke-dashoffset` | 起始偏移量（动画驱动） | 0 → -360 |
| `animation-duration` | 流动一圈的时间 | 4-8秒 |
| `stdDeviation` | 模糊程度 | 外层2-3，中层1-1.5 |

#### 23.1.3 性能优化建议

- ✅ 使用 `pointer-events: none` 让SVG不拦截鼠标事件
- ✅ 使用 `z-index: -1` 将边框放在背景层
- ✅ 滤镜范围设置 `-30%` 到 `160%` 避免裁切
- ❌ 避免过多层叠（最多3层）

---

### 23.2 八角矩形边框（clip-path）

#### 23.2.1 CSS 实现
```css
.octagon-panel {
  clip-path: polygon(
    10px 0, calc(100% - 10px) 0,
    100% 10px, 100% calc(100% - 10px),
    calc(100% - 10px) 100%, 10px 100%,
    0 calc(100% - 10px), 0 10px
  );
}
```

#### 23.2.2 SVG 实现（更灵活）
```html
<path d="M 10,0 L 310,0 L 320,10 L 320,190 L 310,200 L 10,200 L 0,190 L 0,10 Z"/>
```

**优势**：可以单独控制每条边的样式、颜色、宽度

---

### 23.3 Catmull-Rom 贝塞尔曲线平滑算法

#### 23.3.1 应用场景
折线图数据点之间的平滑过渡，避免生硬的尖角。

#### 23.3.2 实现代码
```javascript
const smoothPath = computed(() => {
  const points = linePoints.value  // [{x,y}, ...]
  if (points.length < 2) return ''

  let path = `M ${points[0].x},${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    // 计算贝塞尔控制点（基于相邻点的斜率）
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  return path
})
```

#### 23.3.3 参数调整

| 参数 | 作用 | 效果 |
|------|------|------|
| `/6` | 控制点距离 | 越小曲线越平滑，越大越尖锐 |
| 相邻点数量 | 参考范围 | 至少使用前后各1个点 |

---

### 23.4 真实时序数据生成器（带毛刺感）

#### 23.4.1 设计原则
模拟真实工厂生产数据的特征：
- **稳步向上**：基础趋势为正增长
- **自然波动**：多层噪声叠加
- **周期性**：正弦波模拟设备/人员节律
- **特殊事件**：午休、周末、月末冲刺等

#### 23.4.2 噪声模型公式
```javascript
function generateValue(base, index, options = {}) {
  // 1. 基础趋势（线性增长）
  const trend = options.trend || 0.5

  // 2. 高斯随机噪声（主要毛刺来源）
  const noise = (Math.random() - 0.48) * options.noiseRange

  // 3. 周期性波动（正弦+余弦叠加）
  const cycleNoise = Math.sin(index * 0.25) * options.cycleAmp +
                     Math.cos(index * 0.18) * options.cycleB

  // 4. 随机尖峰（低概率大波动）
  const spike = Math.random() > 0.92 ?
    (Math.random() > 0.5 ? 15 : -10) : 0

  // 综合计算
  base += (trend + noise * 0.25 + cycleNoise * 0.15 + spike) * 0.38

  return Math.max(options.minValue || 0, Math.round(base))
}
```

#### 23.4.3 不同时间维度的参数配置

| 维度 | trend | noiseRange | cycleAmp | 特殊事件 |
|------|-------|------------|----------|----------|
| **今日（小时）** | 0.55 | 1.8 | 1.2 | 12:00/14:00 -1.2 |
| **本周（天）** | 工作日+4.5 / 周末-3 | 12 | 4 | 无 |
| **本月（天）** | 工作日+3.2 / 周末-2 | 18 | 8 | 8%概率 ±15 |

#### 23.4.4 数据质量检查标准
- ✅ 单步增幅 < 15%（避免剧烈跳变）
- ✅ 整体斜率 15-25°（平缓上升）
- ✅ 波动频率：每5-7个点出现1次回调
- ❌ 避免直线（必须有多层噪声）

---

### 23.5 SVG 环形图（Donut Chart）

#### 23.5.1 核心原理
使用 `<circle>` 的 `stroke-dasharray` 和 `stroke-dashoffset` 实现分段：

```javascript
// 参数定义
const radius = 55
const strokeWidth = 18
const circumference = 2 * Math.PI * radius  // ≈ 345.58

// 分段计算
const segments = [
  { color: '#4a90ff', value: 142 },  // 运行中
  { color: '#f59e0b', value: 28 },   // 空闲
  { color: '#6b7280', value: 12 },   // 停机
  { color: '#ef4444', value: 4 }     // 故障
].map((seg, i, arr) => {
  const total = arr.reduce((sum, s) => sum + s.value, 0)
  let offset = arr.slice(0, i).reduce((sum, s) =>
    sum + (s.value / total) * circumference, 0
  )
  return {
    ...seg,
    length: (seg.value / total) * circumference,
    offset  // 累计偏移量
  }
})
```

#### 23.5.2 SVG 模板
```html
<svg :viewBox="`0 0 ${size} ${size}`">
  <g :transform="`translate(${size/2}, ${size/2})`">
    <!-- 各个扇形段 -->
    <circle v-for="(seg, i) in segments" :key="i"
            cx="0" cy="0" :r="radius"
            fill="none" :stroke="seg.color"
            :stroke-width="strokeWidth"
            :stroke-dasharray="`${seg.length} ${circumference - seg.length}`"
            :stroke-dashoffset="-seg.offset"
            transform="rotate(-90)" />
    <!-- 中心填充圆 -->
    <circle cx="0" cy="0" :r="radius - strokeWidth"
            fill="rgba(5,15,30,0.6)" />
    <!-- 中心文字 -->
    <text x="0" y="0" text-anchor="middle">{{ total }}</text>
  </g>
</svg>
```

#### 23.5.3 视觉增强技巧
- **发光效果**: `filter: drop-shadow(0 2px 8px rgba(74,144,255,0.3))`
- **颜色指示器**: 图例圆点加 `box-shadow: 0 0 6px currentColor`
- **Hover交互**: `transform: translateX(4px)` + 背景加深

---

### 23.6 固定定位面板布局最佳实践

#### 23.6.1 多面板垂直排列
```css
.panel-1 { position: fixed; top: 70px; z-index: 85; }
.panel-2 { position: fixed; top: 235px; z-index: 84; }
.panel-3 { position: fixed; top: 500px; z-index: 83; }
```

**关键要点**：
- ✅ **统一左对距**: 所有面板 `left: 20px`
- ✅ **统一宽度**: 所有面板 `width: 320px`
- ✅ **递减层级**: 从上到下 `z-index` 递减
- ✅ **间距计算**: 上方面板top + 高度 + 安全间距（≥40px）

#### 23.6.2 透明背景处理
```css
.panel {
  background: none !important;
  background-color: transparent !important;
  overflow: visible;  /* 允许阴影溢出 */
}
```

#### 23.6.3 响应式适配
```css
@media (max-height: 800px) {
  .panel-3 { top: auto; bottom: 20px; }  /* 屏幕不够高时贴底 */
}

---

## 24. Three.js 性能优化与诊断

### 24.1 性能问题诊断

#### 24.1.1 关键性能指标

| 指标 | 正常范围 | 警告阈值 | 危险阈值 |
|------|---------|---------|---------|
| **三角面数** | < 500,000 | 500K - 2M | > 2,000,000 |
| **网格数 (Mesh)** | < 500 | 500 - 1000 | > 1000 |
| **Draw Call** | < 100 | 100 - 300 | > 300 |
| **帧率 (FPS)** | ≥ 45 | 30-45 | < 30 |
| **内存占用** | < 200MB | 200-500MB | > 500MB |

#### 24.1.2 常见性能瓶颈

**1. 三角面数过多（最常见）**
```javascript
// 统计三角面数
function countTriangles(scene) {
  let triangles = 0
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry
      if (geo.index) {
        triangles += geo.index.count / 3
      } else if (geo.attributes.position) {
        triangles += geo.attributes.position.count / 3
      }
    }
  })
  return Math.round(triangles)
}
```

**2. 网格数量过多**
- **原因**: 每个独立对象都是单独的 Mesh
- **影响**: 每个 Mesh 产生一次 Draw Call
- **解决**: 合并相同材质的 Mesh

**3. 树木/重复对象过多**
```javascript
// 问题：200棵树 × 每棵3个Mesh = 600+ 个对象
// 解决方案：
// 方案1: 合并为一个 BufferGeometry
// 方案2: 使用 InstancedMesh 批量渲染
const geometry = new TreeGeometry()
const material = new TreeMaterial()
const mesh = new THREE.InstancedMesh(geometry, material, treeCount)
```

### 24.2 对象分类统计

#### 24.2.1 场景对象分类方法

```javascript
function categorizeSceneObjects(scene) {
  const categories = {
    buildings: { name: '建筑模型', icon: '🏢', count: 0, triangles: 0 },
    trees: { name: '树木', icon: '🌲', count: 0, triangles: 0 },
    grounds: { name: '地面/道路', icon: '🛣️', count: 0, triangles: 0 },
    vehicles: { name: '车辆/AGV', icon: '🚗', count: 0, triangles: 0 },
    sensors: { name: '传感器', icon: '📡', count: 0, triangles: 0 },
    lights: { name: '灯光', icon: '💡', count: 0, triangles: 0 },
    other: { name: '其他', icon: '📦', count: 0, triangles: 0 }
  }

  scene.traverse((child) => {
    if (!child.isMesh) return
    const triCount = getTriangleCount(child)
    const name = (child.name || '').toLowerCase()

    if (name.includes('building') || name.includes('wall')) {
      categories.buildings.count++
      categories.buildings.triangles += triCount
    } else if (name.includes('tree')) {
      categories.trees.count++
      categories.trees.triangles += triCount
    }
    // ... 其他分类逻辑
  })

  return Object.values(categories)
}
```

### 24.3 内存使用估算

#### 24.3.1 几何体内存计算

```javascript
function estimateGeometryMemory(mesh) {
  let bytes = 0
  const geo = mesh.geometry
  
  bytes += geo.attributes.position?.array?.byteLength || 0  // 顶点数据
  bytes += geo.attributes.normal?.array?.byteLength || 0   // 法线数据
  bytes += geo.attributes.uv?.array?.byteLength || 0       // UV坐标
  if (geo.index) {
    bytes += geo.index.array.byteLength  // 索引数据
  }
  
  return bytes
}
```

#### 24.3.2 纹理内存估算

```javascript
function estimateTextureMemory(material) {
  let bytes = 0
  const textures = [
    material.map,           // 漫反射贴图
    material.normalMap,     // 法线贴图
    material.aoMap,         // 环境光遮蔽
    material.emissiveMap,   // 自发光贴图
  ].filter(Boolean)

  textures.forEach(tex => {
    if (tex?.image) {
      const { width, height } = tex.image
      bytes += width * height * 4  // RGBA = 4字节/像素
    }
  })

  return bytes
}
```

**常见纹理尺寸对应内存：**

| 分辨率 | 内存占用（RGBA） |
|--------|----------------|
| 512×512 | 1 MB |
| 1024×1024 | 4 MB |
| 2048×2048 | 16 MB |
| 4096×4096 | 64 MB |

### 24.4 优化策略

#### 24.4.1 优化优先级排序（按效果）

| 优化项 | 预期提升 | 实施难度 | 推荐度 |
|--------|---------|---------|--------|
| **合并网格** | +10-20 FPS | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **降低阴影分辨率** | +5-10 FPS | ⭐ | ⭐⭐⭐⭐⭐ |
| **关闭后处理效果** | +5-8 FPS | ⭐ | ⭐⭐⭐⭐⭐ |
| **简化树木模型** | +5-12 FPS | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **使用 LOD** | +5-15 FPS | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **InstancedMesh** | +8-15 FPS | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

#### 24.4.2 网格合并示例

```javascript
function mergeMeshesByName(scene, namePattern) {
  const meshesToMerge = []
  
  scene.traverse((child) => {
    if (child.isMesh && 
        child.name.toLowerCase().includes(namePattern)) {
      meshesToMerge.push(child)
    }
  })

  if (meshesToMerge.length === 0) return null

  // 创建合并后的几何体
  const geometries = meshesToMerge.map(m => m.geometry)
  const mergedGeometry = mergeGeometries(geometries)

  // 使用第一个mesh的材质
  const material = meshesToMerge[0].material.clone()
  const mergedMesh = new THREE.Mesh(mergedGeometry, material)

  // 移除原始mesh，添加合并后的mesh
  meshesToMerge.forEach(m => {
    m.parent.remove(m)
    m.geometry.dispose()
  })

  scene.add(mergedMesh)
  return mergedMesh
}
```

#### 24.4.3 阴影优化

```javascript
// 降低阴影贴图分辨率
sunLight.shadow.mapSize.set(512, 512)  // 从 4096 降到 512

// 调整阴影相机范围
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 100
sunLight.shadow.camera.left = -50
sunLight.shadow.camera.right = 50
sunLight.shadow.camera.top = 50
sunLight.shadow.camera.bottom = -50

// 启用阴影地图偏移防止阴影 acne
sunLight.shadow.bias = -0.0001
```

#### 24.4.4 后处理优化

```javascript
// OutlinePass 边缘发光（消耗大）
outlinePass.enabled = false  // 可提升 3-5 FPS

// FXAA 抗锯齿（消耗中等）
fxaaPass.enabled = false  // 可提升 2-3 FPS

// Bloom 发光效果（消耗大）
bloomPass.enabled = false  // 可提升 3-5 FPS
```

### 24.5 性能监控面板实现

#### 24.5.1 FPS 计数器组件

```vue
<template>
  <div class="fps-counter" :class="fpsClass">
    {{ fps }} FPS
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const fps = ref(60)
let frameCount = 0
let lastTime = performance.now()
let animationId = null

function updateFPS() {
  frameCount++
  const currentTime = performance.now()
  const delta = currentTime - lastTime

  if (delta >= 1000) {
    fps.value = Math.round(frameCount * 1000 / delta)
    frameCount = 0
    lastTime = currentTime
  }

  animationId = requestAnimationFrame(updateFPS)
}

onMounted(() => { animationId = requestAnimationFrame(updateFPS) })
onUnmounted(() => { if (animationId) cancelAnimationFrame(animationId) })
</script>
```

#### 24.5.2 详细分析功能要点

**Top 10 最占资源对象：**
```javascript
const topHeavyObjects = computed(() => {
  const objects = []
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      objects.push({
        name: child.name || child.type,
        triangles: getTriangleCount(child),
        type: child.type
      })
    }
  })
  
  return objects
    .sort((a, b) => b.triangles - a.triangles)
    .slice(0, 10)
})
```

**自动诊断问题：**
```javascript
const performanceIssues = computed(() => {
  const issues = []
  
  if (triangles > 2000000) {
    issues.push({
      severity: 'critical',
      title: '三角面数严重超标',
      description: `当前 ${formatNumber(triangles)} 面`,
      fix: 'reduceTriangles'
    })
  }
  
  if (meshes > 500) {
    issues.push({
      severity: 'critical',
      title: `网格数量过多 (${meshes}个)`,
      fix: 'mergeMeshes'
    })
  }
  
  return issues
})
```

### 24.6 实战案例：368万面场景优化

#### 24.6.1 问题诊断

**初始状态：**
- 三角面数：**3,680,000**
- 网格数：**7,198**
- 帧率：**~20 FPS**

**问题分析：**
1. ✅ **三角面数严重超标**（正常应 < 50万）
2. ✅ **网格数量爆炸**（正常应 < 500）
3. ❓ 可能原因：建筑模型未优化、树木过多、重复几何体

#### 24.6.2 优化方案

**阶段1：快速修复（立即生效）**
```javascript
// 1. 关闭所有后处理效果
toggleOutline()  // +3-5 FPS
toggleFXAA()     // +2-3 FPS

// 2. 降低阴影质量
sunLight.shadow.mapSize.set(512, 512)  // +5-8 FPS

// 预期结果：20 → 30-35 FPS
```

**阶段2：树木优化（需要编码）**
```javascript
// 方案A：合并所有树为单个 Mesh（推荐）
mergeAllTrees()

// 方案B：使用 InstancedMesh
convertTreesToInstanced()

// 预期结果：35 → 42-48 FPS
```

**阶段3：模型降级（长期方案）**
```javascript
// 1. 在 Blender 中简化建筑模型
// 2. 使用 LOD 动态切换精度
// 3. 远处物体使用低模

// 预期结果：48 → 55-60 FPS
```

#### 24.6.3 优化效果预期

| 阶段 | 操作 | FPS 提升 | 最终 FPS |
|------|------|---------|---------|
| 初始 | - | - | ~20 |
| 阶段1 | 关闭特效+降低阴影 | +10-15 | 30-35 |
| 阶段2 | 合并树木 | +7-13 | 42-48 |
| 阶段3 | 模型降级+LOD | +8-12 | 55-60 |

---