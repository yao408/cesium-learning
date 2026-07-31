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