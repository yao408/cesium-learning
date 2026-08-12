<template>
  <div class="factory-detail-page" :class="{ preview: isPreview, 'theme-dark-screen': currentTheme === 'darkScreen' }">
    <!-- Three.js 容器 -->
    <div ref="threeContainer" class="three-container" :class="{ preview: isPreview }"></div>

    <!-- 顶部标题 -->
    <div class="center-title" v-if="!isPreview">
      <h1 class="platform-title">三维工厂可视化监控</h1>
    </div>
    
    <!-- 左上角工具栏 -->
    <div class="floating-toolbar" v-if="!isPreview">
      <div class="glass-toolbar">
        <!-- 使用ElTooltip改造的工具栏组件（逐步替换中） -->
        <ToolbarWithTooltip
          :currentThemeName="currentThemeName"
          :nextThemeName="nextThemeName"
          :allPanelsVisible="Object.values(panelsVisible).every(v => v)"
          @goBack="goBack"
          @resetCamera="resetCamera"
          @toggleTheme="toggleTheme"
          @toggleAllPanels="toggleAllPanels"
        />

        <!-- 保留原有：传感器管理（暂不改造）-->
        <button class="glass-btn" @click="sensorEditorRef?.togglePicker()" title="传感器">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </button>

        <!-- 保留原有：更多选项（暂不改造）-->
        <div class="glass-more-wrapper">
          <button class="glass-btn glass-more-btn" @click="showMoreMenu = !showMoreMenu" title="更多选项">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
          </button>

          <div class="glass-menu" v-if="showMoreMenu">
            <div class="menu-item" @click="togglePatrol(); showMoreMenu = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              <span>{{ isPatrolActive ? '停止巡检' : '自动巡检' }}</span>
            </div>
            <div class="menu-item" @click="toggleXray(); showMoreMenu = false" :class="{ active: xrayMode }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <span>{{ xrayMode ? '显示全部' : '只看管道' }}</span>
            </div>
            <div class="menu-item" @click="toggleAGVTrail(); showMoreMenu = false" :class="{ active: showAGVTrail }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="6" width="18" height="12" rx="2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
                <path d="M5 11h14M9 6v4M15 6v4"/>
              </svg>
              <span>{{ showAGVTrail ? '隐藏轨迹' : 'AGV巡检' }}</span>
            </div>
            <div class="menu-item" @click="toggleFirstPersonView(); showMoreMenu = false" :class="{ active: isFirstPersonView }" v-if="showAGVTrail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>{{ isFirstPersonView ? '退出视角' : '第一视角' }}</span>
            </div>
            <div class="menu-item" @click="togglePathEditMode(); showMoreMenu = false" :class="{ active: isSettingPathMode }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 17l6-6 4 4 8-8"/>
                <circle cx="21" cy="5" r="2"/>
              </svg>
              <span>{{ isSettingPathMode ? '完成设置' : '设置路径' }}</span>
            </div>
            <div class="menu-item" @click="toggleEditMode(); showMoreMenu = false" :class="{ active: isEditMode }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>{{ isEditMode ? '退出编辑模式' : '进入编辑模式' }}</span>
            </div>
            
            <div class="menu-divider"></div>
            
            <div class="menu-item" @click="removeTreesInsideBuildings(); showMoreMenu = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 8C17 5.24 14.76 3 12 3S7 5.24 7 8c0 3.25 5 10 5 10s5-6.75 5-10z"/>
                <circle cx="12" cy="8" r="2.5"/>
                <line x1="19" y1="19" x2="15" y2="15"/>
                <line x1="3" y1="21" x2="9" y2="15"/>
              </svg>
              <span>移除房间内的树</span>
            </div>

            <div class="menu-item" @click="toggleTrees(); showMoreMenu = false" :class="{ active: treesHidden }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 8C17 5.24 14.76 3 12 3S7 5.24 7 8c0 3.25 5 10 5 10s5-6.75 5-10z"/>
                <circle cx="12" cy="8" r="2.5"/>
              </svg>
              <span>{{ treesHidden ? '显示树木' : '隐藏树木' }}</span>
            </div>

            <div class="menu-item" @click="componentSelectMode = !componentSelectMode; showMoreMenu = false" :class="{ active: componentSelectMode }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
              <span>{{ componentSelectMode ? '关闭组件选择' : '组件选择' }}</span>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- AGV视角切换提示 -->
    <div v-if="showAGVTrail" class="agv-hint" @click="toggleFirstPersonView()">
      <div class="agv-hint-content" :class="{ 'first-person-active': isFirstPersonView }">
        <svg v-if="!isFirstPersonView" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span v-if="!isFirstPersonView">跟随小车</span>
        <span v-else>解除跟随</span>
        <small v-if="!isFirstPersonView">点击切换到第三人称视角</small>
        <small v-else>当前：正在跟随AGV移动</small>
      </div>
    </div>

    <!-- 传感器仪表盘面板 - 八角霓虹边框 -->
    <div class="sensor-gauges-panel" v-show="!isPreview && panelsVisible.sensor">
      <button class="panel-fold-btn sensor-fold" @click="panelsVisible.sensor = false" title="折叠">《</button>
      <!-- 八角霓虹边框 SVG - 尺寸与容器1:1匹配 -->
      <svg class="octagon-neon-svg" viewBox="0 0 320 450" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;">
        <defs>
          <!-- 常驻底色渐变：冷蓝微弱发光 -->
          <linearGradient id="baseNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4a90ff"/>
            <stop offset="50%" stop-color="#42e2f5"/>
            <stop offset="100%" stop-color="#4a90ff"/>
          </linearGradient>
          
          <!-- 高光带外层：宽模糊蓝光 -->
          <linearGradient id="flowOuter" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="transparent"/>
            <stop offset="40%" stop-color="rgba(74,144,255,0)"/>
            <stop offset="48%" stop-color="rgba(74,144,255,0.5)"/>
            <stop offset="50%" stop-color="rgba(66,226,245,0.65)"/>
            <stop offset="52%" stop-color="rgba(74,144,255,0.5)"/>
            <stop offset="60%" stop-color="rgba(74,144,255,0)"/>
            <stop offset="100%" stop-color="transparent"/>
          </linearGradient>

          <!-- 高光带中层：亮蓝线条 -->
          <linearGradient id="flowMid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="transparent"/>
            <stop offset="43%" stop-color="rgba(116,192,255,0)"/>
            <stop offset="48%" stop-color="rgba(116,192,255,0.85)"/>
            <stop offset="50%" stop-color="#a0f0ff"/>
            <stop offset="52%" stop-color="rgba(116,192,255,0.85)"/>
            <stop offset="57%" stop-color="rgba(116,192,255,0)"/>
            <stop offset="100%" stop-color="transparent"/>
          </linearGradient>

          <!-- 高光带核心：冷白高光 -->
          <linearGradient id="flowCore" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="transparent"/>
            <stop offset="46%" stop-color="rgba(210,235,250,0)"/>
            <stop offset="49%" stop-color="#e8f4fc"/>
            <stop offset="50%" stop-color="#ffffff"/>
            <stop offset="51%" stop-color="#e8f4fc"/>
            <stop offset="54%" stop-color="rgba(210,235,250,0)"/>
            <stop offset="100%" stop-color="transparent"/>
          </linearGradient>
        </defs>
        
        <!-- ====== 八角路径定义（12px切角）====== -->
        <path id="octPath"
          d="M 12,0 L 308,0 L 320,12 L 320,438 L 308,450 L 12,450 L 0,438 L 0,12 Z"
          fill="none"/>

        <!-- ====== 第一层：常驻微弱蓝光八角线（静止不动）====== -->

        <!-- 外圈柔光晕 -->
        <use href="#octPath"
             stroke="rgba(74,144,255,0.2)"
             stroke-width="10"
             filter="url(#baseBlur)"
             opacity="0.9"/>

        <!-- 主发光体 -->
        <use href="#octPath"
             stroke="url(#baseNeonGrad)"
             stroke-width="4"
             opacity="0.6"/>

        <!-- 细亮芯线 -->
        <use href="#octPath"
             stroke="rgba(160,240,255,0.45)"
             stroke-width="1.5"/>

        <!-- ====== 第二层：高亮能量光带（沿八角路径移动）====== -->
        
        <!-- 外层：宽模糊蓝光 (7px) -->
        <use href="#octPath"
             stroke="url(#flowOuter)"
             stroke-width="7"
             stroke-dasharray="140 280"
             filter="url(#flowBlurOuter)"
             class="energy-flow-outer"/>
             
        <!-- 中层：亮蓝线条 (4px) -->
        <use href="#octPath"
             stroke="url(#flowMid)"
             stroke-width="4"
             stroke-dasharray="140 280"
             filter="url(#flowBlurMid)"
             class="energy-flow-mid"/>
             
        <!-- 核心：冷白高光 (1.5px) -->
        <use href="#octPath"
             stroke="url(#flowCore)"
             stroke-width="1.5"
             stroke-dasharray="140 280"
             class="energy-flow-core"/>

        <!-- 滤镜定义 -->
        <filter id="baseBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
        <filter id="flowBlurOuter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="flowBlurMid" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </svg>
      <div class="gauges-header">
        <span class="gauges-title">传感器监控</span>
        <div class="gauges-filter">
          <button
            v-for="option in gaugeFilterOptions"
            :key="option.value"
            class="filter-btn"
            :class="{ active: gaugeFilterType === option.value }"
            @click="gaugeFilterType = option.value"
            :title="`${option.label} (${option.count})`"
          >
            {{ option.icon }}
            <span class="filter-count" v-if="option.count > 0">{{ option.count }}</span>
          </button>
        </div>
      </div>

      <div class="gauges-scroll-container" :class="{ 'scrollable': visibleGaugesCount > 4 }">
        <div class="gauges-grid"
             :style="{ gridTemplateColumns: `repeat(${Math.min(visibleGaugesCount, 2)}, 1fr)` }">
          <template v-for="sensor in allSensorsList" :key="sensor.id">
            <!-- 温度传感器：使用竖向温度计组件 -->
            <ThermometerGauge
              v-if="sensor.type === 'temp' || sensor.type === 'temperature'"
              :value="getLiveSensorValue(sensor.id)"
              :title="sensor.name"
              :unit="sensor.unit"
              :min="sensor.min"
              :max="sensor.max"
              :warning-threshold="sensor.warningThreshold || (sensor.max * 0.92)"
              :danger-threshold="sensor.dangerThreshold || (sensor.max * 1.05)"
              :sensor-id="sensor.id"
              class="thermo-in-panel"
              @click="handleGaugeClick"
              @dblclick="handleGaugeDblClick"
              v-show="isSensorTypeVisible(sensor.type)"
            />

            <!-- 湿度传感器：使用圆形湿度计组件 -->
            <HumidityGauge
              v-else-if="sensor.type === 'humidity' || sensor.type === 'hum'"
              :value="getLiveSensorValue(sensor.id)"
              :title="sensor.name"
              :unit="sensor.unit"
              :min="sensor.min"
              :max="sensor.max"
              :warning-threshold="70"
              :danger-threshold="85"
              :sensor-id="sensor.id"
              class="humidity-in-panel"
              @click="handleGaugeClick"
              @dblclick="handleGaugeDblClick"
              v-show="isSensorTypeVisible(sensor.type)"
            />

            <!-- 震动传感器：使用震动波纹组件 -->
            <VibrationGauge
              v-else-if="sensor.type === 'vibration' || sensor.type === 'vib'"
              :value="getLiveSensorValue(sensor.id)"
              :title="sensor.name"
              :unit="sensor.unit"
              :min="sensor.min || 0.5"
              :max="sensor.max || 8.0"
              :warning-threshold="4.5"
              :danger-threshold="6.0"
              :sensor-id="sensor.id"
              class="vibration-in-panel"
              @click="handleGaugeClick"
              @dblclick="handleGaugeDblClick"
              v-show="isSensorTypeVisible(sensor.type)"
            />

            <!-- 气体传感器：使用雾气填充组件 -->
            <GasGauge
              v-else-if="sensor.type === 'gas' || sensor.type === 'air' || sensor.type === 'ppm'"
              :value="getLiveSensorValue(sensor.id)"
              :title="sensor.name"
              :unit="sensor.unit || 'ppm'"
              :min="sensor.min || 10"
              :max="sensor.max || 60"
              :warning-threshold="46"
              :danger-threshold="52"
              :sensor-id="sensor.id"
              class="gas-in-panel"
              @click="handleGaugeClick"
              @dblclick="handleGaugeDblClick"
              v-show="isSensorTypeVisible(sensor.type)"
            />

            <!-- 其他传感器：使用半圆仪表盘组件 -->
            <GaugeChart
              v-else
              :value="getLiveSensorValue(sensor.id)"
              :title="sensor.name"
              :unit="sensor.unit"
              :min="sensor.min"
              :max="sensor.max"
              :color="sensor.color"
              :sensor-id="sensor.id"
              :status="getSensorStatus(sensor.id)"
              @click="handleGaugeClick"
              @dblclick="handleGaugeDblClick"
              v-show="isSensorTypeVisible(sensor.type)"
            />
          </template>
        </div>
      </div>

      <div class="gauges-footer" v-if="visibleGaugesCount > 4">
        <span class="footer-hint">↓ 共 {{ visibleGaugesCount }} 个传感器，可滚动查看 ↓</span>
      </div>
    </div>

    <!-- 实时数据面板 - 从仪表盘左侧滑出 -->
    <div class="realtime-chart-float" v-if="!isPreview">
      <div ref="chartRef" class="realtime-chart-grid"></div>
    </div>

    <!-- 生产概览面板 -->
    <div class="production-overview-panel" v-show="!isPreview && panelsVisible.production">
      <!-- 流光边框 SVG -->
      <svg class="flow-border-svg" viewBox="0 0 320 200" preserveAspectRatio="none">
        <defs>
          <!-- 渐变定义 -->
          <linearGradient id="prodFlowOuter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4a90ff"/>
            <stop offset="50%" stop-color="#42e2f5"/>
            <stop offset="100%" stop-color="#4a90ff"/>
          </linearGradient>
          <linearGradient id="prodFlowMid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#74c0ff"/>
            <stop offset="50%" stop-color="#a0f0ff"/>
            <stop offset="100%" stop-color="#74c0ff"/>
          </linearGradient>
          <linearGradient id="prodFlowCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#e0f7ff"/>
            <stop offset="100%" stop-color="#ffffff"/>
          </linearGradient>

          <!-- 八角路径 -->
          <path id="prodOctPath" d="
            M 10,0
            L 310,0
            L 320,10
            L 320,190
            L 310,200
            L 10,200
            L 0,190
            L 0,10
            Z
          "/>

          <!-- 滤镜 -->
          <filter id="prodBlurOuter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="prodBlurMid" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="1" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <!-- 底层边框 - 完全透明背景 -->
        <use href="#prodOctPath"
             stroke="rgba(74,144,255,0.6)"
             stroke-width="2"
             fill="none"/>

        <!-- 细亮芯线 -->
        <use href="#prodOctPath"
             stroke="rgba(180,215,240,0.45)"
             stroke-width="1.5"
             fill="none"/>

        <!-- ====== 流光能量光带 ====== -->

        <!-- 外层：宽模糊蓝光 -->
        <use href="#prodOctPath"
             stroke="url(#prodFlowOuter)"
             stroke-width="6"
             stroke-dasharray="120 240"
             fill="none"
             filter="url(#prodBlurOuter)"
             class="prod-energy-flow-outer"/>

        <!-- 中层：亮蓝线条 -->
        <use href="#prodOctPath"
             stroke="url(#prodFlowMid)"
             stroke-width="3.5"
             stroke-dasharray="120 240"
             fill="none"
             filter="url(#prodBlurMid)"
             class="prod-energy-flow-mid"/>

        <!-- 核心：冷白高光 -->
        <use href="#prodOctPath"
             stroke="url(#prodFlowCore)"
             stroke-width="1.5"
             stroke-dasharray="120 240"
             fill="none"
             class="prod-energy-flow-core"/>
      </svg>

      <div class="panel-title">
        生产概览
        <button @click="panelsVisible.production = false" class="panel-close-btn" title="收起面板">《</button>
      </div>
      <div class="overview-grid">
        <div class="overview-item">
          <svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="#4a90ff" stroke-width="2">
            <path d="M12 3v18M5 11l7-8 7 8"/>
          </svg>
          <div class="overview-info">
            <span class="overview-label">订单总数</span>
            <span class="overview-value">{{ productionStats.totalOrders }}<span class="overview-unit">单</span></span>
          </div>
        </div>
        <div class="overview-item">
          <svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="#42e2f5" stroke-width="2">
            <rect x="4" y="2" width="16" height="20" rx="2"/>
            <path d="M8 6h8M8 10h8M8 14h4"/>
          </svg>
          <div class="overview-info">
            <span class="overview-label">今日产量</span>
            <span class="overview-value">{{ productionStats.todayOutput }}<span class="overview-unit">件</span></span>
          </div>
        </div>
        <div class="overview-item">
          <svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          <div class="overview-info">
            <span class="overview-label">设备总数</span>
            <span class="overview-value">{{ productionStats.deviceCount }}<span class="overview-unit">台</span></span>
          </div>
        </div>
        <div class="overview-item">
          <svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <path d="M8 12l3 3 5-5"/>
          </svg>
          <div class="overview-info">
            <span class="overview-label">良品率</span>
            <span class="overview-value">{{ productionStats.qualityRate }}<span class="overview-unit">%</span></span>
          </div>
        </div>
        <div class="overview-item">
          <svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <div class="overview-info">
            <span class="overview-label">设备OEE</span>
            <span class="overview-value">{{ productionStats.oeeRate }}<span class="overview-unit">%</span></span>
          </div>
        </div>
        <div class="overview-item">
          <svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <div class="overview-info">
            <span class="overview-label">能耗(kWh)</span>
            <span class="overview-value">{{ productionStats.energyConsumption }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 产量趋势面板 -->
    <div class="trend-panel" v-show="!isPreview && panelsVisible.trend">
      <!-- 简洁蓝色边框 SVG -->
      <svg class="simple-border-svg" viewBox="0 0 320 280" preserveAspectRatio="none">
        <defs>
          <!-- 八角路径 -->
          <path id="trendOctPath" d="
            M 10,0
            L 310,0
            L 320,10
            L 320,270
            L 310,280
            L 10,280
            L 0,270
            L 0,10
            Z
          "/>

          <!-- 折线图渐变填充 -->
          <linearGradient id="chartFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(74,144,255,0.25)"/>
            <stop offset="100%" stop-color="rgba(74,144,255,0)"/>
          </linearGradient>
        </defs>

        <!-- 蓝色八角边框 -->
        <use href="#trendOctPath"
             stroke="#4a90ff"
             stroke-width="2"
             fill="none"/>
      </svg>

      <!-- 面板内容 -->
      <div class="trend-header">
        <span class="trend-title">
          产量趋势
          <button @click="panelsVisible.trend = false" class="panel-close-btn" title="收起面板">《</button>
        </span>
        <div class="trend-tabs">
          <button
            class="trend-tab-btn"
            :class="{ active: trendPeriod === 'today' }"
            @click="trendPeriod = 'today'"
          >今日</button>
          <button
            class="trend-tab-btn"
            :class="{ active: trendPeriod === 'week' }"
            @click="trendPeriod = 'week'"
          >本周</button>
          <button
            class="trend-tab-btn"
            :class="{ active: trendPeriod === 'month' }"
            @click="trendPeriod = 'month'"
          >本月</button>
        </div>
      </div>

      <!-- 折线图容器 -->
      <div class="trend-chart-container">
        <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="trend-chart-svg">
          <!-- 网格线 -->
          <g class="grid-lines">
            <line v-for="i in 5" :key="'h-'+i"
                  :x1="40" :y1="(chartHeight - 30) * i / 5 + 10"
                  :x2="chartWidth - 10" :y2="(chartHeight - 30) * i / 5 + 10"
                  stroke="rgba(74,144,255,0.15)" stroke-width="1"/>
            <line v-for="i in (currentTrendData.labels.length - 1)" :key="'v-'+i"
                  :x1="40 + (chartWidth - 50) * i / (currentTrendData.labels.length - 1)" :y1="10"
                  :x2="40 + (chartWidth - 50) * i / (currentTrendData.labels.length - 1)" :y2="chartHeight - 20"
                  stroke="rgba(74,144,255,0.1)" stroke-width="1"/>
          </g>

          <!-- 填充区域 -->
          <path :d="areaPath" fill="url(#chartFillGradient)" opacity="0.6"/>

          <!-- 平滑曲线 -->
          <path
            :d="smoothPath"
            fill="none"
            stroke="#4a90ff"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <!-- 趋势指标 -->
        <div class="trend-stats">
          <div class="trend-stat-item">
            <span class="stat-label">当前产量</span>
            <span class="stat-value">{{ currentTrendData.currentValue }}<small>件</small></span>
          </div>
          <div class="trend-stat-item up">
            <span class="stat-label">增长率</span>
            <span class="stat-value">+{{ currentTrendData.growthRate }}<small>%</small></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 设备状态统计面板 -->
    <div class="device-status-panel" v-show="!isPreview && panelsVisible.equipment">
      <!-- 简洁蓝色边框 SVG -->
      <svg class="simple-border-svg" viewBox="0 0 320 240" preserveAspectRatio="none">
        <defs>
          <path id="deviceOctPath" d="
            M 10,0
            L 310,0
            L 320,10
            L 320,230
            L 310,240
            L 10,240
            L 0,230
            L 0,10
            Z
          "/>
        </defs>

        <use href="#deviceOctPath"
             stroke="#4a90ff"
             stroke-width="2"
             fill="none"/>
      </svg>

      <div class="device-header">
        <span class="device-title">
          设备状态
          <button @click="panelsVisible.equipment = false" class="panel-close-btn" title="收起面板">《</button>
        </span>
      </div>

      <div class="device-content">
        <div class="donut-chart-container">
          <svg :viewBox="`0 0 ${donutSize} ${donutSize}`" class="donut-svg">
            <g :transform="`translate(${donutSize/2}, ${donutSize/2})`">
              <circle
                v-for="(segment, index) in donutSegments"
                :key="'seg-'+index"
                cx="0" cy="0"
                :r="donutRadius"
                fill="none"
                :stroke="segment.color"
                :stroke-width="donutStrokeWidth"
                :stroke-dasharray="`${segment.length} ${circumference - segment.length}`"
                :stroke-dashoffset="-segment.offset"
                transform="rotate(-90)"
              />
              <circle
                cx="0" cy="0"
                :r="donutRadius - donutStrokeWidth"
                fill="rgba(5,15,30,0.6)"
              />
              <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
                    font-size="22" font-weight="bold" fill="#fff">{{ deviceStats.total }}</text>
              <text x="0" y="20" text-anchor="middle" dominant-baseline="middle"
                    font-size="11" fill="rgba(255,255,255,0.5)">台设备</text>
            </g>
          </svg>
        </div>

        <div class="status-legend">
          <div class="legend-item" v-for="item in deviceStatusList" :key="item.type">
            <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
            <span class="legend-label">{{ item.label }}</span>
            <span class="legend-value" :style="{ color: item.color }">{{ item.count }}<small>台</small></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 传感器类型选择弹窗 -->
    <SensorEditor
      v-if="!isPreview"
      ref="sensorEditorRef"
      :scene="scene"
      :sensor-groups="sensorGroups"
      :all-building-groups="allBuildingGroups"
      :sensor-group-map="sensorGroupMap"
      :create-sensor-model="(type, color) => createSensorModel(type, color)"
      :scene-id="route.params.id || '1'"
      :scene-config="sceneConfig"
      :save-scene-state="saveSceneState"
      :select-building="selectBuilding"
      :is-preview="isPreview.value"
      @sensor-changed="onSensorChanged"
    />

    <!-- Leaflet 二维地图 -->
    <LeafletMap v-show="!isPreview && panelsVisible.map" :factory-info="factoryInfo" :collapsed="panelCollapsed.map" @toggle="panelsVisible.map = false" />


    

    <!-- 页面调试面板（整合FPS、性能、Group管理） -->
    <DebugPanel
      v-if="!isPreview && showDebugPanel"
      :scene="scene"
      :renderer="renderer"
      :composer="composer"
      :outline-pass="outlinePass"
    />

    <!-- 操作提示 -->
    <div class="controls-hint" v-if="!isPreview">
      <span>🖱️ 左键旋转 | 右键平移 | 滚轮缩放 | 单击选中 | 双击查看</span>
      <span v-if="isEditMode" class="edit-mode-hint">✏️ 编辑模式: Ctrl移动 | Shift旋转 | Alt高度</span>
    </div>

    <div v-if="selectedPos && isEditMode" class="coord-panel">
      📐 {{ selectedPos.label }} | X: {{ selectedPos.x.toFixed(1) }} Z: {{ selectedPos.z.toFixed(1) }} | RY: {{ selectedPos.ry.toFixed(3) }}
      <button class="btn-reset-pos" @click="resetBuildingPosition" title="从JSON恢复原始位置">↺ 重置</button>
    </div>

    <!-- 构件信息弹窗 -->
    <div v-if="meshInfo" class="mesh-info-popup" :style="{ left: meshInfoPos.x + 'px', top: meshInfoPos.y + 'px' }">
      <div class="mesh-info-detail" v-for="line in meshInfo.lines" :key="line">{{ line }}</div>
      <button class="mesh-info-close" @click.stop="meshInfo = null">✕</button>
    </div>

    <!-- 建筑信息标签 -->
    <div
      v-if="showBuildingInfoCard && selectedBuildingForView"
      class="build-tip"
      :style="{ left: buildingInfoCardPos.x + 'px', top: buildingInfoCardPos.y + 'px' }"
    >
      <div class="tip-content">
        <div class="tip-title">{{ getBuildingLabel(selectedBuildingForView) }}</div>
        <div class="tip-sensors" v-if="isMainBuilding(selectedBuildingForView)">传感器数量：5</div>
        <button
          v-if="hasInteriorPreset(selectedBuildingForView)"
          class="tip-enter-btn"
          @click.stop="isInteriorView ? exitInteriorView() : enterInteriorView(selectedBuildingForView)"
        >{{ isInteriorView ? '← 退出内部' : '进入内部' }}</button>
      </div>
    </div>

    <!-- 非建筑物体简要标签（自动消失） -->
    <div
      v-if="showBriefLabel"
      class="brief-label"
      :style="{ left: briefLabelPos.x + 'px', top: briefLabelPos.y + 'px' }"
    >
      {{ briefLabel }}
    </div>

    <!-- 路径编辑模式提示 -->
    <div v-if="isSettingPathMode" class="path-edit-mini-bar">
      <span class="mini-info">
        🛤️ 已选 <strong>{{ pathPointCount }}</strong> 个点
        <span v-if="isPathClosed" class="closed-badge">🔄 已闭合</span>
        <span v-else-if="pathPointCount >= 2" class="ready-text">✓ 开放路径</span>
        <span v-else class="wait-text">（至少需要1个点）</span>
      </span>
      <div class="mini-actions">
        <button @click="toggleLoopPath()" class="mini-btn loop-btn" :class="{ active: isPathClosed }" :disabled="pathPointCount < 3" :title="isPathClosed ? '取消闭合' : '闭合回路'">{{ isPathClosed ? '🔗' : '⭕' }}</button>
        <button @click="undoLastPoint()" class="mini-btn" :disabled="pathPointCount === 0" title="撤销上一点">↩</button>
        <button @click="clearCustomPath()" class="mini-btn" title="清除全部">🗑</button>
        <button @click="togglePathEditMode()" class="mini-btn confirm-btn" :disabled="pathPointCount < 2" title="完成路径设置">✓ 完成</button>
        <button @click="togglePathEditMode()" class="mini-btn cancel-btn" title="取消退出">×</button>
      </div>
    </div>

    <!-- Element Plus 组件测试面板（已隐藏，需要时取消注释）-->
    <!-- <ElementPlusTestPanel /> -->

    <div v-if="showClosePathHint && !isPathClosed && pathPointCount >= 3" class="close-path-hint">
      🔄 点击此处闭合回路
    </div>

    <!-- 测试：温度计组件（已集成到面板中，暂时注释）-->
    <!-- <div class="test-thermometer" v-if="!isPreview">
      <ThermometerGauge
        title="温度-1"
        :value="45.8"
        :min="0"
        :max="100"
        unit="℃"
        :warning-threshold="70"
        :danger-threshold="90"
      />
    </div> -->

    <!-- 测试：湿度计组件（已集成到传感器面板，此测试代码已注释）-->
    <!--
    <div class="test-humidity-gauge" v-if="!isPreview">
      <HumidityGauge
        title="湿度"
        :value="68.2"
        :min="0"
        :max="100"
        unit="%RH"
        :warning-threshold="70"
        :danger-threshold="85"
      />
    </div>
    -->
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { getFactoryById } from '../data/factories.js'
import sceneConfig from '../data/scene-config.json'
import { fetchScene } from '../api/sceneApi.js'
import { createSkyTexture, createDarkScreenSkyTexture } from '../composables/useFactoryRenderer.js'
import {
  createWaterPool,
  createGate,
  createFence,
  createVegetation,
  createGreenArea,
  createCargoContainers,
  createFlagPlatform,
  createRestArea,
  createMultipleRestAreas
} from '../composables/useSceneBuilder.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import LeafletMap from './LeafletMap.vue'
import SensorEditor from './SensorEditor.vue'
import mqtt from 'mqtt'
import * as echarts from 'echarts'
import GaugeChart from '../components/GaugeChart.vue'
import ThermometerGauge from '../components/ThermometerGauge.vue'
import HumidityGauge from '../components/HumidityGauge.vue'
import VibrationGauge from '../components/VibrationGauge.vue'
import { buildRailingCache, updateRailingVisibility } from '../utils/railingLOD.js'
import GasGauge from '../components/GasGauge.vue'
import { createMagicRings } from '../utils/magicRings.js'
import { createParkingLot } from '../utils/parkingLot.js'
import { createDataPlatform } from '../utils/dataPlatform.js'
import { createGround } from '../utils/groundCreator.js'
import { createRoads } from '../utils/roadCreator.js'
import { createSensors, loadSensorsFromDatabase, createSensorModel as createSensor, findNearestBuildingLabel } from '../utils/sensorCreator.js'
import { processModelMaterials, setupModelClone, logBuildingTypes } from '../utils/modelProcessor.js'
import { useAGVPathManager } from '../utils/agvPathManager.js'
import { useRealtimeCharts } from '../composables/useRealtimeCharts.js'
import { useSensorManager } from '../composables/useSensorManager.js'
import ElementPlusTestPanel from '../components/ElementPlusTestPanel.vue'
import ToolbarWithTooltip from '../components/ToolbarWithTooltip.vue'
import DebugPanel from '../components/DebugPanel.vue'
import { removeTreesInArea, getTreePositions } from '../utils/treeManager.js'

const route = useRoute()
const router = useRouter()

const props = defineProps({
  mode: { type: String, default: 'full' },
  sceneId: { type: String, default: '' }
})
const isPreview = computed(() => props.mode === 'preview')

const threeContainer = ref(null)

let scene, camera, renderer, controls, animationId
let composer, outlinePass
let ws = null
let patrolCurve = null
let patrolProgress = 0
let isPatrolActive = false
const patrolSpeed = 0.0008
let factoryGroundW = 0
let factoryGroundD = 0
let buildingModel = null
let groundPlane = null
let allBuildingGroups = []
let sensorGroups = []
const sensorGroupMap = {}
let roadWaypoints = []
let roadMeshes = []
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
import { shallowRef } from 'vue'

const agvPathManager = shallowRef(null)

const showAGVTrail = computed(() => agvPathManager.value?.showAGVTrail?.value ?? false)
const isFirstPersonView = computed(() => agvPathManager.value?.isFirstPersonView?.value ?? false)
const isSettingPathMode = computed(() => agvPathManager.value?.isSettingPathMode?.value ?? false)
const customPathPoints = computed(() => agvPathManager.value?.customPathPoints?.value ?? [])
const pathPointCount = computed(() => agvPathManager.value?.pathPointCount?.value ?? 0)
const isPathClosed = computed(() => agvPathManager.value?.isPathClosed?.value ?? false)
const showClosePathHint = computed(() => agvPathManager.value?.showClosePathHint?.value ?? false)

function toggleAGVTrail() { agvPathManager.value?.toggleAGVTrail() }
function onAGVModelClick() { agvPathManager.value?.onAGVModelClick() }
function togglePathEditMode() {
  if (!agvPathManager.value) return

  agvPathManager.value.togglePathEditMode()
}
function addPathPoint(event) { agvPathManager.value?.addPathPoint(event) }
function toggleFirstPersonView() { agvPathManager.value?.toggleFirstPersonView() }
function resetToTopView() { agvPathManager.value?.resetToTopView() }
function toggleLoopPath() { agvPathManager.value?.toggleLoopPath() }
function undoLastPoint() { agvPathManager.value?.undoLastPoint() }
function clearCustomPath() { agvPathManager.value?.clearCustomPath() }
function restoreSavedPath() { agvPathManager.value?.restoreSavedPath() }

let highlightedMesh = null
let selectedBuilding = null
let isDebugMode = false
let isEditMode = false
const componentSelectMode = ref(false)
const treesHidden = ref(false)
let treeGroupRef = null

const sensorHistoryData = ref({})
const chartRef = ref(null)
const visibleChartIds = ref(new Set())

const productionStats = reactive({
  totalOrders: 1320,
  todayOutput: 1128,
  deviceCount: 186,
  qualityRate: 98.6,
  oeeRate: 86.5,
  energyConsumption: 12345
})

// ====== 产量趋势数据生成器 ======
const trendPeriod = ref('today')
const chartWidth = 280
const chartHeight = 140

function generateTrendData() {
  const now = new Date()

  // 今日数据 - 24个采样点 (每小时)
  const todayLabels = []
  const todayValues = []
  let baseToday = 3.2
  for (let i = 6; i <= 18; i++) {
    todayLabels.push(`${String(i).padStart(2, '0')}:00`)
    const noise = (Math.random() - 0.48) * 1.8
    const fluctuation = Math.sin(i * 0.8) * 1.2 + Math.cos(i * 1.5) * 0.8
    baseToday += 0.55 + noise + fluctuation * 0.3
    if (i === 12 || i === 14) baseToday -= 1.2
    todayValues.push(Math.max(2.5, Math.round(baseToday * 10) / 10))
  }

  // 本周数据 - 7天
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const weekValues = []
  let baseWeek = 78
  weekDays.forEach((day, i) => {
    const isWeekend = i >= 5
    const trend = isWeekend ? -3 : 4.5
    const noise = (Math.random() - 0.48) * 12
    const microFluctuation = Math.sin(i * 2.3) * 4 + Math.cos(i * 1.1) * 3
    baseWeek += (trend + noise + microFluctuation) * 0.35
    weekValues.push(Math.max(60, Math.round(baseWeek)))
  })

  // 本月数据 - 30天
  const monthValues = []
  let baseMonth = 108
  for (let i = 1; i <= 30; i++) {
    const dayOfWeek = (now.getDate() - 30 + i + 7) % 7
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const trend = isWeekend ? -2 : 3.2
    const noise = (Math.random() - 0.47) * 18
    const cycleNoise = Math.sin(i * 0.25) * 8 + Math.cos(i * 0.18) * 5
    const randomSpike = Math.random() > 0.92 ? (Math.random() > 0.5 ? 15 : -10) : 0
    baseMonth += (trend + noise * 0.25 + cycleNoise * 0.15 + randomSpike) * 0.38
    monthValues.push(Math.max(85, Math.round(baseMonth)))
  }

  return {
    today: {
      labels: todayLabels,
      values: todayValues,
      currentValue: todayValues[todayValues.length - 1],
      growthRate: ((todayValues[todayValues.length - 1] / todayValues[0] - 1) * 100).toFixed(1)
    },
    week: {
      labels: weekDays,
      values: weekValues,
      currentValue: weekValues[weekValues.length - 1],
      growthRate: ((weekValues[weekValues.length - 1] / weekValues[0] - 1) * 100).toFixed(1)
    },
    month: {
      labels: Array.from({length: 30}, (_, i) => `${i+1}日`),
      values: monthValues,
      currentValue: monthValues[monthValues.length - 1],
      growthRate: ((monthValues[monthValues.length - 1] / monthValues[0] - 1) * 100).toFixed(1)
    }
  }
}

let trendData = generateTrendData()

setInterval(() => {
  trendData = generateTrendData()
}, 30000)

const currentTrendData = computed(() => trendData[trendPeriod.value])

// ====== 设备状态数据 ======
const donutSize = 140
const donutRadius = 55
const donutStrokeWidth = 18
const circumference = 2 * Math.PI * donutRadius

const deviceStats = reactive({
  running: 142,
  idle: 28,
  stopped: 12,
  fault: 4,
  get total() { return this.running + this.idle + this.stopped + this.fault }
})

const deviceStatusList = computed(() => [
  { type: 'running', label: '运行中', count: deviceStats.running, color: '#4a90ff' },
  { type: 'idle', label: '空闲', count: deviceStats.idle, color: '#f59e0b' },
  { type: 'stopped', label: '停机', count: deviceStats.stopped, color: '#6b7280' },
  { type: 'fault', label: '故障', count: deviceStats.fault, color: '#ef4444' }
])

const donutSegments = computed(() => {
  const total = deviceStats.total
  let offset = 0

  return [
    { color: '#4a90ff', value: deviceStats.running },
    { color: '#f59e0b', value: deviceStats.idle },
    { color: '#6b7280', value: deviceStats.stopped },
    { color: '#ef4444', value: deviceStats.fault }
  ].map(segment => {
    const length = (segment.value / total) * circumference
    const seg = {
      ...segment,
      length,
      offset
    }
    offset += length
    return seg
  })
})

const linePoints = computed(() => {
  const data = currentTrendData.value
  if (!data || !data.values.length) return []

  const minVal = Math.min(...data.values)
  const maxVal = Math.max(...data.values)
  const range = maxVal - minVal || 1

  return data.values.map((value, index) => ({
    x: 40 + (chartWidth - 50) * index / (data.values.length - 1),
    y: chartHeight - 20 - ((value - minVal) / range) * (chartHeight - 50)
  }))
})

const smoothPath = computed(() => {
  const points = linePoints.value
  if (points.length < 2) return ''

  let path = `M ${points[0].x},${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  return path
})

const areaPath = computed(() => {
  const points = linePoints.value
  if (points.length < 2) return ''

  const smoothCurve = smoothPath.value
  return `${smoothCurve} L ${points[points.length - 1].x},${chartHeight - 20} L ${points[0].x},${chartHeight - 20} Z`
})

const allSensorsList = ref([
  {
    id: 'SENSOR-T-001',
    name: '温度-1',
    type: 'temp',
    unit: '℃',
    min: 0,
    max: 100,                // ✅ 扩大量程到100，能容纳危险值
    warningThreshold: 69.0,   // ✅ 与新MQTT一致：75*0.92
    dangerThreshold: 78.75,   // ✅ 与新MQTT一致：75*1.05
    color: '#42e2f5'
  },
  { id: 'SENSOR-H-001', name: '湿度-1', type: 'humidity', unit: '%RH', min: 0, max: 100, color: '#42e2f5' },
  { id: 'SENSOR-H-002', name: '湿度-2', type: 'humidity', unit: '%RH', min: 0, max: 100, color: '#42e2f5' },
  { id: 'SENSOR-G-001', name: '气体-1', type: 'gas', unit: 'PPM', min: 0, max: 500, color: '#42e2f5' },
  { id: 'SENSOR-V-001', name: '振动-1', type: 'vibration', unit: 'mm/s', min: 0, max: 10, color: '#42e2f5' }
])

const {
  MAX_HISTORY_POINTS,
  initRealtimeChart,
  updateRealtimeChart,
  disposeAllCharts,
  getChartsCount
} = useRealtimeCharts(chartRef, sensorHistoryData, allSensorsList)

const {
  sensors,
  sensorLiveData,
  gaugeFilterType,
  detailSelectedSensor,
  colorMap,
  gaugeSensors,
  visibleGaugesCount,
  gaugeFilterOptions,
  currentDetailSensor,
  isSensorVisible,
  isSensorTypeVisible,
  getLiveSensorValue,
  getSensorGaugeValue,
  getSensorStatus,
  getGaugeMin,
  getGaugeMax,
  getSensorIcon,
  getSensorTypeLabel,
  getSensorUnit,
  getSensorColor,
  getGaugeGradientStart,
  getGaugeGradientEnd,
  getSensorColorLight,
  getSensorsByType,
  getCountByType,
  getLatestValueByType,
  getAvgValueByType,
  hasAlarmByType,
  hasWarningByType
} = useSensorManager(allSensorsList)

const totalHistoryPoints = computed(() => {
  return Object.values(sensorHistoryData.value).reduce((total, arr) => total + arr.length, 0)
})

function handleGaugeClick(sensorId) {
  console.log('🎯 单击仪表盘，切换折线图:', sensorId)

  if (!sensorId) {
    console.warn('⚠️ sensorId 为空')
    return
  }

  const newSet = new Set(visibleChartIds.value)
  if (newSet.has(sensorId)) {
    newSet.delete(sensorId)
    console.log('  ❌ 隐藏折线图:', sensorId)
  } else {
    newSet.add(sensorId)
    console.log('  ✅ 显示折线图:', sensorId)
  }
  visibleChartIds.value = newSet
}

function handleGaugeDblClick(sensorId) {
  console.log('🎯 双击仪表盘，飞到传感器:', sensorId)

  if (!sensorId) {
    console.warn('⚠️ sensorId 为空')
    return
  }

  ensureControlsEnabled()
  flyToSensor(sensorId)
}

// 已删除：closeDetailChart（详细折线图功能已移除）

function ensureControlsEnabled() {
  if (controls) {
    controls.enabled = true
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = true
    controls.update()
  }
}

// 已删除：initDetailChart和updateDetailChart（详细折线图功能已移除）

// 已删除：详细折线图残留代码（从660行到854行，约195行）（这是旧的updateDetailChart代码，不是小图表的）

function findBuildingGroup(mesh) {
  let current = mesh
  while (current) {
    if (allBuildingGroups.includes(current)) return current
    current = current.parent
  }
  return null
}

function isMainBuilding(group) {
  return group && group.name && group.name.startsWith('building_')
}

function showBriefLabelForGroup(group) {
  const label = getBuildingLabel(group)
  briefLabel.value = label
  const box = new THREE.Box3().setFromObject(group)
  const center = box.getCenter(new THREE.Vector3())
  const tempVec = center.clone()
  tempVec.project(camera)
  briefLabelPos.value = {
    x: (tempVec.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
    y: (-tempVec.y * 0.5 + 0.5) * renderer.domElement.clientHeight
  }
  showBriefLabel.value = true
  if (briefLabelTimer) clearTimeout(briefLabelTimer)
  briefLabelTimer = setTimeout(() => {
    showBriefLabel.value = false
    briefLabelTimer = null
  }, 1500)
}

function selectBuilding(group) {
  deselectBuilding()
  selectedBuilding = group

  outlinePass.selectedObjects = [group]

  let label = group.name || '未命名'
  if (group.name && group.name.startsWith('building_')) {
    const idx = parseInt(group.name.replace('building_', ''))
    label = sceneConfig.buildings[idx]?.label || group.name
  }
  selectedPos.value = { label, x: group.position.x, z: group.position.z, ry: group.rotation.y }
  console.log('🔧 选中建筑，Ctrl+拖动移动，Shift+拖动旋转')
}

function deselectBuilding() {
  outlinePass.selectedObjects = []

  selectedBuilding = null
  selectedPos.value = null
}

function resetBuildingPosition() {
  if (!selectedBuilding) return
  const name = selectedBuilding.name || ''
  const match = name.match(/^building_(\d+)$/)
  if (!match) {
    console.warn('⚠️ 只能重置建筑的位置，当前选中的不是建筑')
    return
  }
  const idx = parseInt(match[1])
  const cfg = sceneConfig.buildings[idx]
  if (!cfg) {
    console.warn('⚠️ JSON中未找到该建筑的配置')
    return
  }
  selectedBuilding.position.x = cfg.x
  selectedBuilding.position.z = cfg.z
  selectedBuilding.rotation.y = cfg.ry
  selectedPos.value = { label: cfg.label, x: cfg.x, z: cfg.z, ry: cfg.ry }
  saveSceneState(true)
  console.log(`↺ ${cfg.label} 已重置到 JSON 位置: X=${cfg.x}, Z=${cfg.z}, RY=${cfg.ry}`)
}

function onSensorChanged() {
  saveSceneState(true)
}

function saveSceneState(silent = false) {
  const state = allBuildingGroups.map((group, i) => ({
    name: group.name || `item_${i}`,
    x: group.position.x,
    y: group.position.y,
    z: group.position.z,
    rx: group.rotation.x,
    ry: group.rotation.y,
    rz: group.rotation.z,
  }))
  localStorage.setItem('factory-scene-layout', JSON.stringify(state))
  
  const restAreas = state.filter(s => s.name && s.name.startsWith('restArea_'))
  if (!silent) {
    fetch('/api/save-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.map(s => ({
        name: s.name, x: Number(s.x.toFixed(1)), z: Number(s.z.toFixed(1)), ry: Number(s.ry.toFixed(3))
      })), null, 2)
    }).then(r => r.json()).then(res => {
      if (res.ok) console.log('✅ 已写入 scene-config.json')
      else console.error('❌ 保存失败', res.error)
    }).catch(e => console.error('❌ 保存失败', e))
    
    console.log(`💾 场景布局已保存 (共${state.length}个对象, ${restAreas.length}个休息区)`)
    if (restAreas.length > 0) {
      restAreas.forEach(ra => {
        console.log(`   🪑 ${ra.name}: (${ra.x.toFixed(1)}, ${ra.z.toFixed(1)})`)
      })
    }
  }
}

function loadSceneState() {
  try {
    const raw = localStorage.getItem('factory-scene-layout')
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return null
}

function clearSceneState() {
  localStorage.removeItem('factory-scene-layout')
}

function parseCoord(expr, bw, bd, gd) {
  if (typeof expr === 'number') return expr
  const replaced = String(expr)
    .replace(/\bbw\b/g, String(bw))
    .replace(/\bbd\b/g, String(bd))
    .replace(/\bgd\b/g, String(gd))
  try {
    return new Function('return ' + replaced)()
  } catch {
    return Number(replaced)
  }
}

window.clearSceneLayout = clearSceneState
const factoryInfo = ref({})
const sensorHistoryMap = reactive({})
const wsConnected = ref(false)
const panelCollapsed = ref({ info: false, sensor: false, map: false })
const meshInfo = ref(null)
const meshInfoPos = ref({ x: 0, y: 0 })
const selectedPos = ref(null)

let clickTimer = null
const CLICK_DELAY = 250
let lastClickedBuilding = null
const selectedBuildingForView = ref(null)
const showBuildingInfoCard = ref(false)
const showBriefLabel = ref(false)
const briefLabel = ref('')
const briefLabelPos = ref({ x: 0, y: 0 })
let briefLabelTimer = null
const buildingInfoCardPos = ref({ x: 0, y: 0 })
let isFlyingToBuilding = false
let flyAnimationId = null
const showMoreMenu = ref(false)
const showDebugPanel = ref(false)
const sensorEditorRef = ref(null)

const panelsVisible = ref({
  production: true,
  trend: true,
  equipment: true,
  sensor: true,
  map: true
})

function toggleAllPanels() {
  const allVisible = Object.values(panelsVisible.value).every(v => v)
  const newState = !allVisible
  Object.keys(panelsVisible.value).forEach(key => {
    panelsVisible.value[key] = newState
  })
}

const sensorTypeIcons = {
  temperature: '🌡️',
  pressure: '⚙️',
  vibration: '📳',
  humidity: '💧',
}

const sensorRanges = {
  temperature: { min: 0, max: 100 },
  pressure: { min: 0, max: 2.5 },
  vibration: { min: 0, max: 10 },
  humidity: { min: 0, max: 100 },
}

let wsClient = null

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//localhost:8081/ws/sensor`
  
  try {
    wsClient = new WebSocket(wsUrl)

    wsClient.onopen = () => {
      wsConnected.value = true
      console.log('✅ WebSocket 已连接到 Spring Boot 后端')
    }

    wsClient.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        sensorLiveData.value[data.sensorId] = data.value

        const idx = sensors.value.findIndex(s => s.sensorId === data.sensorId)
        if (idx >= 0) {
          sensors.value[idx] = { ...data, unit: data.unit || '' }
        } else {
          sensors.value.push({ ...data, unit: data.unit || '' })
          console.log('➕ 新增传感器:', data.sensorId, '(总数:' + sensors.value.length + ')')
        }
        
        sensorGroups.forEach(g => {
          if (g.userData.sensorId === data.sensorId) {
            g.userData.alarmState = data.status
            g.userData.value = data.value
          }
        })
        
        if (sensorGroupMap[data.sensorId]) {
          sensorGroupMap[data.sensorId].userData.alarmState = data.status
          sensorGroupMap[data.sensorId].userData.value = data.value
        }


        const now = new Date()
        const timeStr = now.toLocaleTimeString()
        if (!sensorHistoryMap[data.sensorId]) {
          sensorHistoryMap[data.sensorId] = []
        }
        sensorHistoryMap[data.sensorId].push([timeStr, data.value])
        if (sensorHistoryMap[data.sensorId].length > 60) {
          sensorHistoryMap[data.sensorId].shift()
        }

        
        const icon = data.status === 'alarm' ? '🔴' : data.status === 'warning' ? '🟡' : '🟢'
        console.log(`${icon} ${data.sensorName || data.sensorId}: ${data.value}${data.unit || ''}`)
        
      } catch (e) {
        console.error('WebSocket 数据解析失败:', e, event.data)
      }
    }

    wsClient.onerror = (error) => {
      console.error('❌ WebSocket 错误:', error)
      wsConnected.value = false
    }

    wsClient.onclose = (event) => {
      console.warn('⚠️ WebSocket 连接关闭:', event.code, event.reason)
      wsConnected.value = false
      
      setTimeout(() => {
        if (!wsConnected.value && !wsClient || wsClient.readyState === WebSocket.CLOSED) {
          console.log('🔄 尝试重新连接...')
          connectWebSocket()
        }
      }, 5000)
    }
    
  } catch (e) {
    console.error('❌ WebSocket 连接失败:', e)
    wsConnected.value = false
  }
}

function connectMQTT() {
  connectWebSocket()
}

function valueColor(sensor) {
  if (sensor.status === 'alarm') return '#ef4444'
  if (sensor.status === 'warning') return '#f59e0b'
  return '#22c55e'
}

function barColor(sensor) {
  if (sensor.status === 'alarm') return 'linear-gradient(90deg, #f59e0b, #ef4444)'
  if (sensor.status === 'warning') return 'linear-gradient(90deg, #22c55e, #f59e0b)'
  return 'linear-gradient(90deg, #3b82f6, #22c55e)'
}




function barPercent(sensor) {
  const range = sensorRanges[sensor.sensorType]
  if (!range) return 50
  return Math.min(100, Math.max(0, (sensor.value - range.min) / (range.max - range.min) * 100))
}

function statusLabel(status) {
  if (status === 'alarm') return '⚠ 报警'
  if (status === 'warning') return '▲ 预警'
  return '● 正常'
}

watch(sensorLiveData, (newData) => {
  Object.keys(newData).forEach(sensorId => {
    if (!sensorHistoryData.value[sensorId]) {
      sensorHistoryData.value[sensorId] = []
    }
    const record = { time: Date.now(), value: parseFloat(newData[sensorId].toFixed(2)) }
    sensorHistoryData.value[sensorId].push(record)
    if (sensorHistoryData.value[sensorId].length > MAX_HISTORY_POINTS) {
      sensorHistoryData.value[sensorId].shift()
    }
  })
}, { deep: true })

watch(
  () => ({ ...sensorHistoryData.value }),
  () => {
    if (getChartsCount() > 0) {
      updateRealtimeChart()
    }
  },
  { deep: true }
)

watch(visibleChartIds, (newIds) => {
  console.log('📊 折线图可见集合变化:', [...newIds])
  nextTick(() => {
    initRealtimeChart(newIds)
  })
}, { deep: true })

// 已删除：watch(selectedSensorForChart)和watch(sensorHistoryData)（详细折线图相关监听已移除）

onMounted(async () => {
  const factoryId = props.sceneId || route.params.id
  let info = getFactoryById(factoryId)

  // 静态数据里没有，尝试从后端数据库加载
  if (!info) {
    try {
      const scene = await fetchScene(factoryId)
      if (scene) {
        info = {
          id: scene.id,
          name: scene.name,
          type: scene.type,
          position: { lat: scene.lat, lng: scene.lng },
          description: scene.description || '',
        }
      }
    } catch (e) {
      console.error('从后端加载场景失败:', e)
    }
  }

  if (!info) {
    console.error('工厂/场景不存在:', factoryId)
    return
  }

  factoryInfo.value = info
  initThreeJS()
  connectMQTT()

  restoreSavedPath()

  window.addEventListener('scene-theme-change', handleThemeChange)

  nextTick(() => {
    setTimeout(() => {
      if (typeof autoGenerateRoadNetwork === 'function') {
        autoGenerateRoadNetwork()
        console.log('🛣️ 路网已自动生成')
      }
      setInitialTechCamera()
      console.log('📷 相机已设置为科技风视角')

      applyThemeToScene(themes.darkScreen)
      scene.background = createDarkScreenSkyTexture()
      console.log('🎨 初始主题已应用: 暗色大屏')

      if (sensors.value.length > 0) {
        console.log('📡 传感器已就绪:', sensors.value.length, '个')
      }

      setTimeout(() => {
        ensureControlsEnabled()
        console.log('✅ 控制器已激活，可以交互')

        if (chartRef.value) {
          initRealtimeChart(new Set())
          console.log('📈 实时数据图表已初始化')
        }
      }, 2500)
    }, 2000)
  })
})

function flyToSensor(sensorId, retryCount = 0) {
  if (!controls || !camera) {
    console.warn('⚠️ 控制器或相机未就绪')
    if (retryCount < 3) {
      setTimeout(() => flyToSensor(sensorId, retryCount + 1), 200)
    }
    return
  }

  ensureControlsEnabled()

  const s = sensorGroupMap[sensorId]
  if (!s) {
    console.warn('⚠️ 未找到传感器:', sensorId)
    return
  }

  try {
    const forward = new THREE.Vector3(0, 0, 1)
    forward.applyQuaternion(s.quaternion)
    const camPos = s.position.clone()
      .add(forward.multiplyScalar(3))
      .add(new THREE.Vector3(0, 1.5, 0))

    controls.target.copy(s.position)
    camera.position.copy(camPos)
    controls.enabled = true
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = true
    controls.update()

    renderer.domElement.focus()

    console.log('✈️ 飞到传感器:', sensorId, '位置:', s.position.toArray().map(v => v.toFixed(1)))
  } catch (e) {
    console.error('❌ 飞行失败:', e)
    if (retryCount < 2) {
      setTimeout(() => flyToSensor(sensorId, retryCount + 1), 300)
    }
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

onBeforeUnmount(() => {
  window.removeEventListener('scene-theme-change', handleThemeChange)

  if (typeof mqttClient !== 'undefined' && mqttClient) { mqttClient.end(); mqttClient = null }
  if (animationId) cancelAnimationFrame(animationId)
  if (composer) { composer.dispose(); composer = null }
  if (renderer) {
    renderer.dispose()
    threeContainer.value?.removeChild(renderer.domElement)
  }
})

function initThreeJS() {
  const container = threeContainer.value
  const width = container.clientWidth
  const height = container.clientHeight

  scene = new THREE.Scene()
  scene.background = createSkyTexture()

  camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 2000)
  camera.position.set(1.5, 25.6, -112.0)

  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false,
    depth: true
  })
  const dpr = window.devicePixelRatio || 1
  renderer.setPixelRatio(Math.min(dpr, 3))
  renderer.setSize(width, height)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.5
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  outlinePass = new OutlinePass(new THREE.Vector2(container.clientWidth, container.clientHeight), scene, camera)
  outlinePass.edgeStrength = 4.0
  outlinePass.edgeGlow = 0.8
  outlinePass.edgeThickness = 2.0
  outlinePass.pulsePeriod = 1.5
  outlinePass.usePatternTexture = false
  outlinePass.visibleEdgeColor.set('#4ec8ff')
  outlinePass.hiddenEdgeColor.set('#2a8fb8')
  composer.addPass(outlinePass)

  const fxaaPass = new ShaderPass(FXAAShader)
  const pixelRatio = renderer.getPixelRatio()
  fxaaPass.uniforms['resolution'].value.set(1 / (container.clientWidth * pixelRatio), 1 / (container.clientHeight * pixelRatio))
  composer.addPass(fxaaPass)

  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  renderer.domElement.addEventListener('click', onRouteClick)

  renderer.domElement.addEventListener('mousedown', (event) => {
    if (!selectedBuilding) return
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    if (isSettingPathMode.value) {
      pathModeMouseDownPos = { x: event.clientX, y: event.clientY }
      isPathModeDragging = false
    }

    if (isEditMode && (event.ctrlKey || event.metaKey)) {
      isDragging = true
      controls.enabled = false
      raycaster.setFromCamera(mouse, camera)
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const hitPoint = new THREE.Vector3()
      raycaster.ray.intersectPlane(groundPlane, hitPoint)
      if (hitPoint) {
        dragStartPos.copy(hitPoint)
        dragStartBuildingPos.copy(selectedBuilding.position)
      }
      event.preventDefault()
    }

    if (event.shiftKey) {
      isRotating = true
      prevMouseX = event.clientX
      controls.enabled = false
      event.preventDefault()
    }

    if (event.altKey) {
      isAltDragging = true
      prevMouseY = event.clientY
      controls.enabled = false
      event.preventDefault()
    }
  })

  renderer.domElement.addEventListener('mousemove', (event) => {
    if (!selectedBuilding) return
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    if (isSettingPathMode.value && pathModeMouseDownPos) {
      const deltaX = event.clientX - pathModeMouseDownPos.x
      const deltaY = event.clientY - pathModeMouseDownPos.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      if (distance > 5) {
        isPathModeDragging = true
      }
      
      if (customPathPoints.value.length >= 3 && !isPathClosed.value && !isPathModeDragging) {
        raycaster.setFromCamera(mouse, camera)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const hitPoint = new THREE.Vector3()
        
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          const startPoint = customPathPoints.value[0]
          const distToStart = hitPoint.distanceTo(startPoint)
          
          showClosePathHint.value = distToStart < 3.0
        }
      }
    }

    if (isDragging && !isSettingPathMode.value) {
      raycaster.setFromCamera(mouse, camera)
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const hitPoint = new THREE.Vector3()
      raycaster.ray.intersectPlane(groundPlane, hitPoint)
      if (hitPoint) {
        const delta = new THREE.Vector3().subVectors(hitPoint, dragStartPos)
        selectedBuilding.position.x = Math.max(-300, Math.min(300, dragStartBuildingPos.x + delta.x))
        selectedBuilding.position.z = Math.max(-300, Math.min(300, dragStartBuildingPos.z + delta.z))
      }
    }

    if (isRotating) {
      const delta = event.clientX - prevMouseX
      selectedBuilding.rotation.y += delta * 0.005
      prevMouseX = event.clientX
    }

    if (isAltDragging) {
      const delta = event.clientY - prevMouseY
      selectedBuilding.position.y -= delta * 0.05
      prevMouseY = event.clientY
    }
  })

  renderer.domElement.addEventListener('mouseup', () => {
    if (isDragging || isRotating || isAltDragging) {
      isDragging = false
      isRotating = false
      isAltDragging = false
      controls.enabled = true
      saveSceneState(true)
    }
    
    if (isSettingPathMode.value) {
      pathModeMouseDownPos = null
      setTimeout(() => {
        isPathModeDragging = false
      }, 100)
    }
  })

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 3, 0)
  controls.maxPolarAngle = Math.PI / 2 + 0.4

  agvPathManager.value = useAGVPathManager(scene, camera, renderer, controls, raycaster, mouse)

  controls.addEventListener('start', () => {
    if (isFloatingMode) {
      isFloatingMode = false
      console.log('⏸️ 用户操作，已停止浮动')
    }
  })

  setupLights()

  loadBuildingGLB(scene)

  initAGVTrailSystem()

  animate()
}

let baseCameraPosition = new THREE.Vector3(38.18, 146.28, -164.93)
let floatTime = 0
let isFloatingMode = true
const floatSpeed = 0.001
const floatAmplitudeY = 3.5
const floatAmplitudeXZ = 0.8
const rotateSpeed = 0.0002
const rotateAmplitude = 0.03

let agvModel = null
let trailRenderer = null
let agvPathPoints = []
let agvPathProgress = 0
const agvSpeed = 0.0005

let persistentTrailLine = null
let persistentTrailPoints = []
const MAX_PERSISTENT_POINTS = 1000

let originalCameraPosition = null
let originalCameraTarget = null

function createAGVModel() {
  const agvGroup = new THREE.Group()

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a4a6a,
    metalness: 0.7,
    roughness: 0.3
  })

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x4ec8ff,
    emissive: 0x4ec8ff,
    emissiveIntensity: 0.5,
    metalness: 0.9,
    roughness: 0.1
  })

  const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 3.5)
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.y = 0.5
  body.castShadow = true
  agvGroup.add(body)

  const topGeometry = new THREE.BoxGeometry(1.6, 0.4, 2.8)
  const top = new THREE.Mesh(topGeometry, bodyMaterial)
  top.position.y = 1.05
  top.castShadow = true
  agvGroup.add(top)

  const stripeGeometry = new THREE.BoxGeometry(1.62, 0.08, 2.82)
  const stripe = new THREE.Mesh(stripeGeometry, accentMaterial)
  stripe.position.y = 1.09
  agvGroup.add(stripe)

  const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16)
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })

  const wheelPositions = [
    [-0.9, 0.35, 1.2],
    [0.9, 0.35, 1.2],
    [-0.9, 0.35, -1.2],
    [0.9, 0.35, -1.2]
  ]

  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
    wheel.position.set(...pos)
    wheel.rotation.z = Math.PI / 2
    wheel.castShadow = true
    agvGroup.add(wheel)
  })

  const lightGeometry = new THREE.SphereGeometry(0.15, 16, 16)
  const frontLightMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 2
  })
  const rearLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3333,
    emissive: 0xff3333,
    emissiveIntensity: 1.5
  })

  const frontLightL = new THREE.Mesh(lightGeometry, frontLightMaterial)
  frontLightL.position.set(-0.6, 0.55, 1.76)
  agvGroup.add(frontLightL)

  const frontLightR = new THREE.Mesh(lightGeometry, frontLightMaterial)
  frontLightR.position.set(0.6, 0.55, 1.76)
  agvGroup.add(frontLightR)

  const rearLightL = new THREE.Mesh(lightGeometry, rearLightMaterial)
  rearLightL.position.set(-0.6, 0.55, -1.76)
  agvGroup.add(rearLightL)

  const rearLightR = new THREE.Mesh(lightGeometry, rearLightMaterial)
  rearLightR.position.set(0.6, 0.55, -1.76)
  agvGroup.add(rearLightR)

  const antennaGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8)
  const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 })
  const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial)
  antenna.position.set(0, 1.55, -0.8)
  agvGroup.add(antenna)

  const antennaTipGeometry = new THREE.SphereGeometry(0.08, 16, 16)
  const antennaTipMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1
  })
  const antennaTip = new THREE.Mesh(antennaTipGeometry, antennaTipMaterial)
  antennaTip.position.set(0, 1.87, -0.8)
  agvGroup.add(antennaTip)

  const pointLight = new THREE.PointLight(0x4ec8ff, 1.5, 8)
  pointLight.position.set(0, 1.2, 0)
  agvGroup.add(pointLight)

  return agvGroup
}

class TrailRenderer {
  constructor(scene, options = {}) {
    this.maxPoints = options.maxPoints || 120
    this.scene = scene
    this.positions = []

    this.geometry = new THREE.BufferGeometry()
    
    this.positionAttribute = new THREE.Float32BufferAttribute(this.maxPoints * 3, 3)
    this.alphaAttribute = new THREE.Float32BufferAttribute(this.maxPoints, 1)
    
    this.geometry.setAttribute('position', this.positionAttribute)
    this.geometry.setAttribute('alpha', this.alphaAttribute)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(options.color || 0x4ec8ff) },
        glowIntensity: { value: options.glowIntensity || 1.5 },
        time: { value: 0 }
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 8.0 * alpha + 4.0;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float glowIntensity;
        uniform float time;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float glow = exp(-dist * 3.0) * glowIntensity;
          float pulse = sin(time * 4.0 + vAlpha * 12.0) * 0.15 + 0.85;
          
          vec3 finalColor = color * glow * pulse;
          float finalAlpha = vAlpha * (glow * 0.7 + 0.25);
          
          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.points = new THREE.Points(this.geometry, this.material)
    scene.add(this.points)
  }

  addPosition(position) {
    this.positions.push(position.clone())
    
    if (this.positions.length > this.maxPoints) {
      this.positions.shift()
    }
    
    this.updateGeometry()
  }

  updateGeometry(time = 0) {
    for (let i = 0; i < this.maxPoints; i++) {
      if (i < this.positions.length) {
        const p = this.positions[i]
        this.positionAttribute.setXYZ(i, p.x, p.y, p.z)
        
        const alpha = (i / (this.positions.length - 1))
        this.alphaAttribute.setX(i, Math.pow(alpha, 0.4))
      } else {
        this.positionAttribute.setXYZ(i, 0, -100, 0)
        this.alphaAttribute.setX(i, 0)
      }
    }
    
    this.positionAttribute.needsUpdate = true
    this.alphaAttribute.needsUpdate = true
    
    this.material.uniforms.time.value = time
  }

  clear() {
    this.positions = []
    this.updateGeometry()
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.scene.remove(this.points)
  }
}

let agvCurve = null

function createAGVPathFromRoad() {
  if (roadWaypoints && roadWaypoints.length > 0) {
    console.log(`🛣️ 使用真实道路路径 (${roadWaypoints.length} 个路径点)`)
    agvCurve = new THREE.CatmullRomCurve3(
      roadWaypoints.map(p => new THREE.Vector3(p.x, p.y + 0.15, p.z)),
      false,
      'catmullrom',
      0.5
    )
    return agvCurve.getPoints(200)
  } else {
    console.warn('⚠️ 未找到道路数据，使用默认矩形路径')
    return [
      new THREE.Vector3(-30, 0.15, -40),
      new THREE.Vector3(-30, 0.15, 20),
      new THREE.Vector3(-10, 0.15, 20),
      new THREE.Vector3(-10, 0.15, -20),
      new THREE.Vector3(10, 0.15, -20),
      new THREE.Vector3(10, 0.15, 20),
      new THREE.Vector3(30, 0.15, 20),
      new THREE.Vector3(30, 0.15, -40),
      new THREE.Vector3(-30, 0.15, -40)
    ]
  }
}

function getPointOnPath(progress) {
  if (agvCurve) {
    return agvCurve.getPointAt(progress % 1)
  }
  const points = createAGVPathFromRoad()
  const totalSegments = points.length - 1
  const segmentProgress = progress * totalSegments
  const currentSegment = Math.floor(segmentProgress)
  const segmentT = segmentProgress - currentSegment

  const startIndex = Math.floor(segmentProgress) % totalSegments
  const endIndex = (startIndex + 1) % points.length

  const startPoint = points[startIndex]
  const endPoint = points[endIndex]

  const t = segmentT < 0.5 
    ? 2 * segmentT * segmentT 
    : 1 - Math.pow(-2 * segmentT + 2, 2) / 2

  return new THREE.Vector3().lerpVectors(startPoint, endPoint, t)
}

function getTangentOnPath(progress) {
  if (agvCurve) {
    return agvCurve.getTangentAt(progress % 1)
  }
  const delta = 0.001
  const p1 = getPointOnPath((progress - delta) % 1)
  const p2 = getPointOnPath((progress + delta) % 1)
  return new THREE.Vector3().subVectors(p2, p1).normalize()
}

function initAGVTrailSystem() {
  agvModel = createAGVModel()
  agvModel.visible = false
  scene.add(agvModel)

  trailRenderer = new TrailRenderer(scene, {
    maxPoints: 300,
    color: 0x4ec8ff,
    glowIntensity: 5.0
  })
  trailRenderer.points.visible = false

  const persistentTrailGeometry = new THREE.BufferGeometry()
  
  const persistentMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(0x4ec8ff) }
    },
    vertexShader: `
      attribute float lineProgress;
      varying float vProgress;
      
      void main() {
        vProgress = lineProgress;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      varying float vProgress;
      
      void main() {
        float pulse = sin(vProgress * 20.0 - time * 5.0) * 0.3 + 0.7;
        float glow = smoothstep(0.0, 1.0, vProgress) * 0.8 + 0.2;
        
        vec3 finalColor = color * glow * pulse * 1.8;
        float alpha = glow * (0.6 + pulse * 0.4);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  persistentTrailLine = new THREE.Line(persistentTrailGeometry, persistentMaterial)
  persistentTrailLine.visible = false
  scene.add(persistentTrailLine)
  
  console.log('✅ 蓝色光带轨迹已创建')

  if (roadWaypoints && roadWaypoints.length > 0) {
    createAGVPathFromRoad()
    const startPos = getPointOnPath(0)
    agvModel.position.copy(startPos)
    console.log('✅ AGV轨迹系统初始化完成（使用真实道路，默认隐藏）')
  } else {
    console.log('⚠️ 道路尚未生成，等待道路数据...')
    agvModel.position.set(0, 0.15, 0)
  }
}

function updateAGVAndTrail(deltaTime) {
  if (!agvModel || !trailRenderer || !showAGVTrail.value) return

  if (!agvCurve && roadWaypoints.length > 0) {
    createAGVPathFromRoad()
  }

  let direction = 1
  
  if (isPathClosed.value || !agvCurve) {
    agvPathProgress += agvSpeed * deltaTime * 60
    
    if (agvPathProgress >= 1) {
      agvPathProgress -= 1
    }
  } else {
    agvPathProgress += agvSpeed * deltaTime * 60 * direction
    
    if (agvPathProgress >= 1) {
      agvPathProgress = 1
      direction = -1
    } else if (agvPathProgress <= 0) {
      agvPathProgress = 0
      direction = 1
    }
  }

  const currentPos = getPointOnPath(agvPathProgress)
  agvModel.position.copy(currentPos)

  const tangent = getTangentOnPath(agvPathProgress)
  if (tangent.length() > 0.001) {
    const angle = Math.atan2(tangent.x, tangent.z)
    agvModel.rotation.y = angle
  }

  trailRenderer.addPosition(agvModel.position.clone())

  const currentTime = performance.now() / 1000
  trailRenderer.updateGeometry(currentTime)

  if (showAGVTrail.value && persistentTrailLine) {
    persistentTrailPoints.push(agvModel.position.clone())
    
    if (persistentTrailPoints.length > MAX_PERSISTENT_POINTS) {
      persistentTrailPoints.shift()
    }
    
    if (persistentTrailPoints.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(persistentTrailPoints, false, 'centripetal', 0.5)
      const tubeGeometry = new THREE.TubeGeometry(curve, Math.min(persistentTrailPoints.length * 4, 500), 0.15, 8, false)
      
      if (persistentTrailLine.geometry) {
        persistentTrailLine.geometry.dispose()
      }
      
      persistentTrailLine.geometry = tubeGeometry
      
      const progressAttr = new Float32Array(tubeGeometry.attributes.position.count)
      for (let i = 0; i < progressAttr.length; i++) {
        progressAttr[i] = i / (progressAttr.length - 1)
      }
      tubeGeometry.setAttribute('lineProgress', new THREE.BufferAttribute(progressAttr, 1))
      
      persistentTrailLine.material.uniforms.time.value = performance.now() / 1000
      persistentTrailLine.visible = true
    }
  }

  if (isFirstPersonView.value && agvModel) {
    const tangent = getTangentOnPath(agvPathProgress)
    
    if (tangent.length() > 0) {
      const lookAtPoint = agvModel.position.clone().add(
        tangent.clone().multiplyScalar(5)
      )
      lookAtPoint.y += 0.8
      
      const backwardOffset = tangent.clone().multiplyScalar(-12)
      const targetCameraPos = agvModel.position.clone()
        .add(backwardOffset)
        .add(new THREE.Vector3(0, 3.5, 0))
      
      camera.position.copy(targetCameraPos)
      controls.target.copy(lookAtPoint)
      controls.update()
    }
  }
}

function setInitialTechCamera() {
  if (!camera || !controls) return

  camera.position.copy(baseCameraPosition)
  controls.target.set(0, 2, 0)
  controls.update()

  console.log('📷 科技风相机已设置（柔和浮动模式）')
}

function handleThemeChange(event) {
  const { theme, config } = event.detail
  console.log(`🎨 切换主题: ${config.name}`)
  applyThemeToScene(config)
  if (scene) {
    if (theme === 'darkScreen') {
      scene.background = createDarkScreenSkyTexture()
    } else {
      scene.background = createSkyTexture()
    }
  }
}

function applyThemeToScene(config) {
  if (!scene) {
    console.warn('⚠️ 场景未初始化，无法应用主题')
    return
  }

  console.log(`🎨 开始应用主题: ${config.name}`)

  let buildingCount = 0

  scene.traverse((child) => {
    if (!child.isMesh) return

    const isBuilding = child.name?.startsWith('building_') || child.userData?.isBuilding || allBuildingGroups.includes(child.parent)

    if (isBuilding) {
      buildingCount++

      if (config.building.restoreOriginal) {
        if (child.material.color && child.userData.originalColor !== undefined) {
          child.material.color.setHex(child.userData.originalColor)
        }
        if (child.material.emissive) {
          if (config.building.emissive) {
            child.material.emissive.setStyle(config.building.emissive)
            child.material.emissiveIntensity = config.building.emissiveIntensity || 0
          } else {
            child.material.emissive.setHex(0x000000)
            child.material.emissiveIntensity = 0
          }
        }
        if (child.material.metalness !== undefined) {
          child.material.metalness = 0.1
          child.material.roughness = 0.7
        }
        child.material.needsUpdate = true
        return
      }

      try {
        if (config.building.forceColor && child.material.color) {
          child.material.color.setStyle(config.building.forceColor)
        }
        if (child.material.emissive) {
          child.material.emissive.setStyle(config.building.emissive)
          child.material.emissiveIntensity = config.building.emissiveIntensity
        }
        if (child.material.metalness !== undefined) {
          child.material.metalness = config.building.metalness
          child.material.roughness = config.building.roughness
        }
        child.material.needsUpdate = true
      } catch (e) {
        console.error('❌ 更新建筑材质失败:', e, child.name)
      }
    }
  })

  console.log(`✅ 主题应用完成! 建筑材质已更新（道路和地面保持原始颜色）`)

  updateLighting(config.lighting)
}

function updateMaterial(material, props) {
  if (!material) return
  Object.keys(props).forEach(key => {
    if (material[key] !== undefined) {
      if (key === 'color' || key === 'emissive') {
        material[key].setStyle(props[key])
      } else {
        material[key] = props[key]
      }
    }
  })
  material.needsUpdate = true
}

function updateLighting(lightingConfig) {
  if (!scene) return
  
  scene.traverse((child) => {
    if (child.isAmbientLight) {
      child.intensity = lightingConfig.ambientIntensity
    }
    if (child.isDirectionalLight && child.name !== 'rimLight') {
      child.intensity = lightingConfig.directionalIntensity
    }
  })
}

const themeRef = ref('darkScreen')

const themes = {
  tech: {
    name: '彩色科技风',
    building: {
      restoreOriginal: true
    },
    ground: {
      color: '#0a1628',
      opacity: 0.9,
      transparent: true
    },
    road: {
      mainColor: '#1a2332',
      glowColor: '#00ffff',
      glowIntensity: 0.08
    },
    lighting: {
      ambientIntensity: 0.25,
      directionalIntensity: 1.0
    }
  },
  white: {
    name: '白模科技风',
    building: {
      forceColor: '#f8f9fa',
      emissive: '#000000',
      emissiveIntensity: 0,
      metalness: 0.05,
      roughness: 0.65
    },
    ground: {
      color: '#e9ecef',
      opacity: 1.0,
      transparent: false
    },
    road: {
      mainColor: '#adb5bd',
      glowColor: '#000000',
      glowIntensity: 0
    },
    lighting: {
      ambientIntensity: 0.6,
      directionalIntensity: 0.7
    }
  },
  darkScreen: {
    name: '暗色大屏',
    building: {
      restoreOriginal: true,
      emissive: '#1a3a5c',
      emissiveIntensity: 0.15
    },
    ground: {
      color: '#0a0f1a',
      opacity: 0.95,
      transparent: true
    },
    road: {
      mainColor: '#0d1520',
      glowColor: '#1a3a5c',
      glowIntensity: 0.06
    },
    lighting: {
      ambientIntensity: 0.35,
      directionalIntensity: 0.9
    }
  }
}

function switchTheme(newTheme) {
  if (!themes[newTheme]) return
  themeRef.value = newTheme
  
  window.dispatchEvent(new CustomEvent('scene-theme-change', { 
    detail: { theme: newTheme, config: themes[newTheme] }
  }))
}

const xrayMode = ref(false)

function toggleXray() {
  xrayMode.value = !xrayMode.value
  console.log(`🔧 管道展示模式: ${xrayMode.value ? '开启' : '关闭'}`)

  if (xrayMode.value) {
    showOnlyPipes()
  } else {
    restoreAllObjects()
  }
}


function showOnlyPipes() {
  if (!selectedBuilding) {
    console.warn('⚠️ 请先点击选择一个建筑，再查看它的管道')
    xrayMode.value = false
    return
  }

  let pipeCount = 0
  let hiddenCount = 0

  const group = selectedBuilding
  group.traverse((child) => {
    if (!child.isMesh || !child.material) return

    const name = (child.name || '').toLowerCase()

    const isPipe = name.includes('ifcflowsegment') ||
                   name.includes('pipe') ||
                   name.includes('pipeline') ||
                   name.includes('conduit')

    if (isPipe) {
      child.visible = true
      pipeCount++
    } else {
      child.visible = false
      hiddenCount++
    }
  })

  console.log(`✨ 管道展示: ${group.name || '未命名建筑'}`)
  console.log(`   🔧 管道: ${pipeCount}个 (实体+原色)`)
  console.log(`   🏗️ 其他构件: ${hiddenCount}个 (已隐藏)`)
}

function restoreAllObjects() {
  if (!selectedBuilding) {
    const currentConfig = themes[themeRef.value]
    applyThemeToScene(currentConfig)
    return
  }

  const group = selectedBuilding
  group.traverse((child) => {
    if (child.isMesh) {
      child.visible = true
    }
  })

  console.log(`🚪 ${group.name || '建筑'} 管道展示已关闭，所有构件恢复`)
}

const currentTheme = computed(() => themeRef.value)
const currentThemeName = computed(() => themes[themeRef.value]?.name || '')
const themeOrder = ['tech', 'white', 'darkScreen']
const nextThemeName = computed(() => {
  const idx = themeOrder.indexOf(themeRef.value)
  const next = themeOrder[(idx + 1) % themeOrder.length]
  return themes[next]?.name || ''
})

function toggleTheme() {
  const idx = themeOrder.indexOf(themeRef.value)
  const next = themeOrder[(idx + 1) % themeOrder.length]
  switchTheme(next)
}

function updateCameraFloat(deltaTime) {
  if (!camera || !controls || !isFloatingMode) return

  floatTime += deltaTime

  const offsetY = Math.sin(floatTime * floatSpeed * 1000) * floatAmplitudeY
  const offsetXZ = Math.sin(floatTime * floatSpeed * 800) * floatAmplitudeXZ
  const targetRotateY = Math.sin(floatTime * rotateSpeed * 1000) * rotateAmplitude

  camera.position.x = baseCameraPosition.x + offsetXZ
  camera.position.y = baseCameraPosition.y + offsetY
  camera.position.z = baseCameraPosition.z - offsetXZ * 0.6

  const currentTargetX = Math.sin(targetRotateY) * 1.5
  controls.target.x = currentTargetX
  controls.target.y = 2 + Math.sin(floatTime * floatSpeed * 1100) * 0.5

  controls.update()
}

function createRoadTexture() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 2048
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(0, 0, 512, 2048)

    ctx.fillStyle = '#444444'
    ctx.fillRect(10, 0, 492, 2048)

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 6
    ctx.setLineDash([60, 40])
    ctx.beginPath()
    ctx.moveTo(256, 0)
    ctx.lineTo(256, 2048)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(20, 0)
    ctx.lineTo(20, 2048)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(492, 0)
    ctx.lineTo(492, 2048)
    ctx.stroke()

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    resolve(texture)
  })
}
function setupLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)

  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.0)
  sunLight.position.set(30, 40, 20)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 4096
  sunLight.shadow.mapSize.height = 4096
  sunLight.shadow.camera.left = -50
  sunLight.shadow.camera.right = 50
  sunLight.shadow.camera.top = 50
  sunLight.shadow.camera.bottom = -50
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 200
  sunLight.shadow.bias = -0.0001
  scene.add(sunLight)

  const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3)
  fillLight.position.set(-10, 8, -5)
  scene.add(fillLight)
}

function loadBuildingGLB(scene) {
  const loader = new GLTFLoader()

  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  loader.setDRACOLoader(dracoLoader)

  loader.load(
    '/building2.glb',
    (gltf) => {
      const model = gltf.scene
      const box = new THREE.Box3().setFromObject(model)
      const bottomY = box.min.y

      const bw = box.max.x - box.min.x
      const bd = box.max.z - box.min.z
      const gw = sceneConfig.ground.widthMul
      const gd = sceneConfig.ground.depthMul
      const groundW = bw * gw
      const groundD = bd * gd
      factoryGroundW = groundW
      factoryGroundD = groundD

      const ground = createGround(bw, bd, groundW, groundD)
      scene.add(ground)
      groundPlane = ground

      createRoads(scene, sceneConfig, parseCoord, bw, bd, groundW, groundD, allBuildingGroups, loadSceneState).then(() => {
        const pl = sceneConfig.parkingLot
        if (pl) {
          const parkingGroup = createParkingLot(pl, parseCoord, bw, bd, groundW, groundD)
          scene.add(parkingGroup)
          allBuildingGroups.push(parkingGroup)
        }

        const waterPool = createWaterPool(bw, bd, groundW, groundD, sceneConfig.waterPool)
        scene.add(waterPool)
        allBuildingGroups.push(waterPool)

        const gate = createGate(bw, bd, groundW, groundD)
        scene.add(gate)
        allBuildingGroups.push(gate)

        const cargoContainers = createCargoContainers(bw, bd, groundW, groundD, sceneConfig.cargoContainers)
        scene.add(cargoContainers)
        allBuildingGroups.push(cargoContainers)

        const flagPlatform = createFlagPlatform(bw, bd, groundW, groundD)
        scene.add(flagPlatform)
        allBuildingGroups.push(flagPlatform)

        const greenArea = createGreenArea(bw, bd, groundW, groundD, sceneConfig.greenArea)
        scene.add(greenArea)
        allBuildingGroups.push(greenArea)
      })

      processModelMaterials(model)

      scene.add(model)
      buildingModel = model
      model.name = 'building_0'
      allBuildingGroups.push(model)

      const defaultTargetX = 0
      const defaultTargetZ = 0

      createDataPlatform(scene, new THREE.Vector3(defaultTargetX, -6.5, defaultTargetZ))

      window.magicRingsEffect = createMagicRings(scene, new THREE.Vector3(defaultTargetX, -6.2, defaultTargetZ), {
        ringCount: 8,
        baseRadius: 25,
        maxRadius: 85,
        color: new THREE.Color(0x00e5ff),
        secondaryColor: new THREE.Color(0x80f0ff),
        accentColor: new THREE.Color(0xffffff),
        animationSpeed: 0.6,
        opacity: 0.9,
        glowIntensity: 2.0,
        tubeThickness: 0.15
      })

      sceneConfig.buildings.forEach((bCfg, i) => {
        const modelPath = bCfg.modelPath || '/building2.glb'
        if (modelPath === '/building2.glb') {
          if (i === 0) {
            model.position.set(parseCoord(bCfg.x, bw, bd, groundD), -bottomY, parseCoord(bCfg.z, bw, bd, groundD))
            model.rotation.y = bCfg.ry
            model.name = `building_${i}`
            model.userData.label = bCfg.label
            model.userData.buildingIndex = i
            return
          }
          const clone = model.clone()
          setupModelClone(clone, bCfg, i, parseCoord, bw, bd, groundD)
          clone.position.y = -bottomY
          scene.add(clone)
          allBuildingGroups.push(clone)
        } else {
          loader.load(modelPath, (gltf) => {
            const m = gltf.scene
            const mBox = new THREE.Box3().setFromObject(m)
            const bY = mBox.min.y
            setupModelClone(m, bCfg, i, parseCoord, bw, bd, groundD)
            m.position.y = -bY
            processModelMaterials(m)
            scene.add(m)
            allBuildingGroups.push(m)

            const saved = loadSceneState()
            if (saved) {
              const entry = saved.find(s => s.name === m.name)
              if (entry) {
                m.position.x = entry.x
                m.position.z = entry.z
                m.rotation.y = entry.ry
              }
            }
          })
        }
      })

      const savedState = loadSceneState()
      const jsonConfiguredObjects = ['waterPool', 'greenArea', 'cargoContainers']
      if (savedState) {
        savedState.forEach((s) => {
          if (jsonConfiguredObjects.includes(s.name)) {
            return
          }
          const group = allBuildingGroups.find(g => g.name === s.name)
          if (group) {
            group.position.x = s.x
            group.position.z = s.z
            group.rotation.x = s.rx || 0
            group.rotation.y = s.ry || 0
            group.rotation.z = s.rz || 0
          }
        })
      }

      createSensorModel = createSensor

      createSensors(scene, sceneConfig, box, sensorGroups, sensorGroupMap)
      allBuildingGroups.push(...sensorGroups)

      loadSensorsFromDatabase(scene, sensorGroups, createSensor, (pos) => findNearestBuildingLabel(pos, sceneConfig), sceneConfig).then(() => {
        const savedForSensors = loadSceneState()
        if (savedForSensors) {
          const sensorEntries = savedForSensors.filter(s => s.name && (s.name.startsWith('sensor_') || s.name.startsWith('SENSOR-')))
          sensorEntries.forEach((s) => {
            const group = allBuildingGroups.find(g => g.name === s.name)
            if (group) {
              group.position.x = s.x
              group.position.y = s.y
              group.position.z = s.z
              group.rotation.x = s.rx || 0
              group.rotation.y = s.ry || 0
              group.rotation.z = s.rz || 0
            }
          })
        }
      })

      window.addEventListener('keydown', (e) => {
        if ((e.key === 'v' || e.key === 'V') && showAGVTrail.value) {
          toggleFirstPersonView()
        }
        
        if (e.key === 'Escape' && isFirstPersonView) {
          toggleFirstPersonView()
        }
        
        if (e.key === 'p' || e.key === 'P') {
          const groundW = sceneConfig.ground.widthMul * 100
          const groundD = sceneConfig.ground.depthMul * 100
          const maxDim = Math.max(groundW, groundD)

          console.log('%c🎨 科技风视角参数（调整好后复制给开发者）', 'background: #00ffff; color: #000; font-size: 14px; padding: 5px; border-radius: 3px;')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log(`📐 场景尺寸: 地面宽度=${groundW.toFixed(1)}, 深度=${groundD.toFixed(1)}, 最大维度=${maxDim.toFixed(1)}`)
          console.log(`📷 相机位置: camera.position.set(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`)
          console.log(`🎯 注视目标: controls.target.set(${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)})`)
          console.log(`📊 相对比例: X=${(camera.position.x / maxDim).toFixed(3)}, Y=${(camera.position.y / maxDim).toFixed(3)}, Z=${(camera.position.z / maxDim).toFixed(3)}`)
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log('%c✂️ 复制以下代码块：', 'color: #00ff00; font-weight: bold;')
          console.log(`camera.position.set(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`)
          console.log(`controls.target.set(${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)})`)
          console.log(`// 相对比例参数（用于setInitialTechCamera）：`)
          console.log(`// X系数: ${(camera.position.x / maxDim).toFixed(3)}, Y系数: ${(camera.position.y / maxDim).toFixed(3)}, Z系数: ${(camera.position.z / maxDim).toFixed(3)}`)
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        }

        if (e.key === 'v' || e.key === 'V') {
          if (selectedBuildingForView) {
            const buildingName = selectedBuildingForView.userData?.label || selectedBuildingForView.name || selectedBuildingForView.userData?.name || `building-${Object.keys(buildingViewPresets).length + 1}`
            saveCurrentView(buildingName)
            console.log('\n💡 提示: 下次双击该建筑将自动使用此视角！')
          } else if (selectedBuilding) {
            const buildingName = selectedBuilding.userData?.label || selectedBuilding.name || selectedBuilding.userData?.name || `building-${Object.keys(buildingViewPresets).length + 1}`
            saveCurrentView(buildingName)
            console.log('\n💡 提示: 下次双击该建筑将自动使用此视角！')
          } else {
            console.warn('⚠️ 请先选中一个建筑（单击或G键），然后调整到满意的角度，再按V保存')
            console.log('   📝 操作步骤:')
            console.log('      1. 单击一个建筑选中它')
            console.log('      2. 旋转/缩放相机到你满意的位置')
            console.log('      3. 按V键保存当前视角')
          }
        }

        if (e.key === 'g' || e.key === 'G') {
          if (selectedBuilding) {
            deselectBuilding()
          } else if (buildingModel) {
            selectBuilding(buildingModel)
          }
        }
        if (e.key === 'Escape') {
          if (sensorEditorRef.value?.isPlacingSensor) {
            sensorEditorRef.value.isPlacingSensor = false
            console.log('🚫 退出传感器放置模式')
            return
          }
          if (showBuildingInfoCard.value) {
            closeBuildingInfoCard()
            return
          }
          deselectBuilding()
        }
        if (e.key === 'd' || e.key === 'D') {
          isDebugMode = !isDebugMode
          console.log(`🔍 调试模式: ${isDebugMode ? '✅ 开启' : '❌ 关闭'}`)
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
          e.preventDefault()
          saveSceneState()
          console.log('💾 场景布局已手动保存')
        }
        if (e.key === 'Delete' && selectedBuilding && selectedBuilding.name && (selectedBuilding.name.startsWith('sensor_') || selectedBuilding.name.startsWith('SENSOR-'))) {
          scene.remove(selectedBuilding)
          const idx = allBuildingGroups.indexOf(selectedBuilding)
          if (idx >= 0) allBuildingGroups.splice(idx, 1)
          const sIdx = sensorGroups.indexOf(selectedBuilding)
          if (sIdx >= 0) sensorGroups.splice(sIdx, 1)
          deselectBuilding()
          saveSceneState(true)
          console.log('🗑️ 传感器已删除')
        }
        if (e.key === 'Delete' && selectedBuilding && selectedBuilding.name === 'road') {
          scene.remove(selectedBuilding)
          const rIdx = roadMeshes.indexOf(selectedBuilding)
          if (rIdx >= 0) roadMeshes.splice(rIdx, 1)
          const aIdx = allBuildingGroups.indexOf(selectedBuilding)
          if (aIdx >= 0) allBuildingGroups.splice(aIdx, 1)
          deselectBuilding()
          saveSceneState(true)
          console.log('🗑️ 道路已删除')
        }
        if (e.key === 'Delete' && selectedBuilding && selectedBuilding.name && selectedBuilding.name.startsWith('restArea_')) {
          scene.remove(selectedBuilding)
          const raIdx = allBuildingGroups.indexOf(selectedBuilding)
          if (raIdx >= 0) allBuildingGroups.splice(raIdx, 1)
          deselectBuilding()
          saveSceneState(true)
          console.log(`🗑️ 休息区 ${selectedBuilding.name} 已删除`)
        }
        if (e.key === '1') { sensorGroups.forEach(g => { g.userData.alarmState = 'normal' }); console.log('🟢 正常') }
        if (e.key === '2') { sensorGroups.forEach(g => { g.userData.alarmState = 'warning' }); console.log('🟡 警告') }
        if (e.key === '3') { sensorGroups.forEach(g => { g.userData.alarmState = 'alarm' }); console.log('🔴 报警') }
        if (e.key === 'f' || e.key === 'F') {
          if (sensorGroups.length > 0) {
            const s = sensorGroups[0]
            const forward = new THREE.Vector3(0, 0, 1)
            forward.applyQuaternion(s.quaternion)
            controls.target.copy(s.position)
            camera.position.copy(s.position.clone().add(forward.multiplyScalar(3)).add(new THREE.Vector3(0, 1.5, 0)))
            controls.update()
          }
        }
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault()
          if (e.repeat) return
          const editor = sensorEditorRef.value
          if (!editor) return
          const types = ['temp', 'humidity', 'gas', 'vibration']
          if (!editor.isPlacingSensor) {
            editor.isPlacingSensor = true
            editor.placingSensorType = types[0]
          } else {
            const idx = types.indexOf(editor.placingSensorType)
            if (idx >= 0 && idx < types.length - 1) {
              editor.placingSensorType = types[idx + 1]
            } else {
              editor.isPlacingSensor = false
              console.log('🚫 退出传感器放置模式')
              return
            }
          }
          const typeNames = { temp: '温度', humidity: '湿度', gas: '气体', vibration: '振动' }
          console.log(`📡 传感器放置模式: ${typeNames[editor.placingSensorType]} | 点击任意位置放置 | 再按T切换类型 | 循环4次后退出`)
        }
      })
    },
    (progress) => {
      const percent = progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0
      console.log(`GLB加载进度: ${percent}%`)
    },
    (error) => {
      console.error('GLB模型加载失败:', error)
    }
  )
  
  setTimeout(() => {
    const existingRestAreas = scene.children.filter(child => 
      child.name && child.name.startsWith('restArea_')
    )
    
    if (existingRestAreas.length === 0) {
      const restAreas = createMultipleRestAreas(sceneConfig)
      restAreas.forEach(area => {
        scene.add(area)
        allBuildingGroups.push(area)
      })
      
      setTimeout(() => {
        saveSceneState(true)
        console.log('💾 已根据JSON配置保存休息区位置到localStorage')
      }, 500)
    } else {
      console.log(`🪑 场景中已有 ${existingRestAreas.length} 个休息区，跳过创建`)
    }
  }, 1000)

  setTimeout(() => {
    console.log('🚀 开始构建栏杆缓存...')
    buildRailingCache(scene, 'IfcRailing', ['办公楼'])
  }, 2000)
}

let lastFrameTime = performance.now()

function animate() {
  animationId = requestAnimationFrame(animate)

  const currentTime = performance.now()
  const deltaTime = (currentTime - lastFrameTime) / 1000
  lastFrameTime = currentTime

  if (!isPatrolActive) {
    updateCameraFloat(deltaTime)
  }

  if (isPatrolActive && patrolCurve) {
    patrolProgress += patrolSpeed
    if (patrolProgress >= 1) {
      patrolProgress = 0
    }

    const point = patrolCurve.getPoint(patrolProgress)
    camera.position.copy(point)
    controls.target.set(0, 5, 0)
  }

  controls.update()

  updateAGVAndTrail(deltaTime)

  checkRailingVisibility()

  if (showBuildingInfoCard.value && selectedBuildingForView.value) {
    updateBuildingInfoCardPosition(selectedBuildingForView.value)
  }

  if (selectedBuilding && selectedPos.value) {
    selectedPos.value = { label: selectedPos.value.label, x: selectedBuilding.position.x, z: selectedBuilding.position.z, ry: selectedBuilding.rotation.y }
  }

  const now = performance.now() / 1000
  sensorGroups.forEach(group => {
    const ud = group.userData
    if (!ud.alarmState) return
    const led = ud.ledRef
    const glow = ud.glowRef
    const light = ud.lightRef
    if (!led || !glow) return

    if (ud.alarmState === 'normal') {
      led.material.color.set(0x00ff44)
      led.material.emissive.set(0x00ff44)
      led.material.emissiveIntensity = 1.5
      const pulse = 0.6 + 0.4 * Math.sin(now * Math.PI * 2)
      glow.material.color.set(0x00ff44)
      glow.material.emissive.set(0x00ff44)
      glow.material.emissiveIntensity = 1.0 + 0.6 * (0.5 + 0.5 * Math.sin(now * Math.PI * 2))
      if (light) { light.color.set(0x00ff44); light.intensity = 3 + 2 * (0.5 + 0.5 * Math.sin(now * Math.PI * 2)) }
    } else if (ud.alarmState === 'warning') {
      led.material.color.set(0xff8800)
      led.material.emissive.set(0xff8800)
      led.material.emissiveIntensity = 1.5
      const pulse = 0.6 + 0.4 * Math.sin(now * Math.PI * 2.5)
      glow.material.color.set(0xff8800)
      glow.material.emissive.set(0xff8800)
      glow.material.emissiveIntensity = 1.0 + 0.6 * (0.5 + 0.5 * Math.sin(now * Math.PI * 2.5))
      if (light) { light.color.set(0xff8800); light.intensity = 3 + 2 * (0.5 + 0.5 * Math.sin(now * Math.PI * 2.5)) }
    } else if (ud.alarmState === 'alarm') {
      led.material.color.set(0xff0000)
      led.material.emissive.set(0xff0000)
      led.material.emissiveIntensity = 1.8
      const pulse = 0.6 + 0.4 * Math.sin(now * Math.PI * 5)
      glow.material.color.set(0xff0000)
      glow.material.emissive.set(0xff0000)
      glow.material.emissiveIntensity = 1.0 + 0.8 * (0.5 + 0.5 * Math.sin(now * Math.PI * 5))
      if (light) { light.color.set(0xff0000); light.intensity = 4 + 3 * (0.5 + 0.5 * Math.sin(now * Math.PI * 5)) }
    }
  })

  const waterPool = scene.getObjectByName('waterPool')
  if (waterPool && waterPool.userData.water) {
    const w = waterPool.userData.water
    w.material.opacity = 0.5 + 0.08 * Math.sin(now * 1.5)
    w.position.y = 0.05 + 0.01 * Math.sin(now * 2.0)
  }

  // 国旗飘动
  const flagPlatform = allBuildingGroups.find(g => g.name === 'flagPlatform')
  if (flagPlatform && flagPlatform.userData.flagGroup) {
    const fg = flagPlatform.userData.flagGroup
    fg.children.forEach((child, i) => {
      child.position.z = 0.01 + 0.03 * Math.sin(now * 3 + i * 0.8)
    })
  }

  composer.render()
}

let lastRailingCheck = 0
function checkRailingVisibility() {
  const now = performance.now()
  if (now - lastRailingCheck < 500) return
  lastRailingCheck = now
  updateRailingVisibility(camera, 30)
}

function goBack() {
  router.back()
}

function togglePanel(panel) {
  panelCollapsed.value[panel] = !panelCollapsed.value[panel]
}

function resetCamera() {
  if (camera && controls) {
    isFloatingMode = true
    floatTime = 0

    camera.position.copy(baseCameraPosition)
    controls.target.set(0, 2, 0)
    controls.update()

    console.log('🏠 已重置视角并恢复浮动展示')
  }
}

function togglePatrol() {
  isPatrolActive = !isPatrolActive
  if (isPatrolActive) {
    const halfW = factoryGroundW / 2 - 5
    const halfD = factoryGroundD / 2 - 5
    const patrolHeight = 22

    const waypoints = [
      new THREE.Vector3(halfW, patrolHeight, halfD),
      new THREE.Vector3(-halfW, patrolHeight, halfD),
      new THREE.Vector3(-halfW, patrolHeight, -halfD),
      new THREE.Vector3(halfW, patrolHeight, -halfD),
      new THREE.Vector3(halfW, patrolHeight, halfD),
    ]

    patrolCurve = new THREE.CatmullRomCurve3(waypoints, true, 'catmullrom', 0.5)
    patrolProgress = 0

    controls.enableRotate = false
    controls.enableZoom = false
    controls.enablePan = false

    console.log('🚁 开始空中巡检')
    console.log(`📐 巡检范围: ${factoryGroundW.toFixed(1)} × ${factoryGroundD.toFixed(1)} 米`)
    console.log(`📍 巡检高度: ${patrolHeight} 米`)
  } else {
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = true
    console.log('⏹️ 停止巡检')
  }
}

function buildRoadMesh() {
  const savedWaypoints = [...roadWaypoints]
  clearRoadPreview()
  const pts = savedWaypoints.map(p => new THREE.Vector3(p.x, p.y + 0.05, p.z))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 1.0)
  const samples = 300
  const halfWidth = 4
  const vertices = []
  const uvs = []
  const indices = []

  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const pt = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    const left = pt.clone().add(perp.clone().multiplyScalar(halfWidth))
    const right = pt.clone().add(perp.clone().multiplyScalar(-halfWidth))
    vertices.push(left.x, left.y, left.z)
    vertices.push(right.x, right.y, right.z)
    uvs.push(0, t * 50)
    uvs.push(1, t * 50)
  }

  for (let i = 0; i < samples; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1
    indices.push(a, b, c)
    indices.push(b, d, c)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 2048
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(0, 0, 512, 2048)

  ctx.fillStyle = '#444444'
  ctx.fillRect(10, 0, 492, 2048)

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 6
  ctx.setLineDash([60, 40])
  ctx.beginPath()
  ctx.moveTo(256, 0)
  ctx.lineTo(256, 2048)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(20, 0)
  ctx.lineTo(20, 2048)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(492, 0)
  ctx.lineTo(492, 2048)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace

  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1.0,
    polygonOffsetUnits: 1.0,
  })
  const road = new THREE.Mesh(geo, mat)
  road.name = 'road'
  road.receiveShadow = true
  scene.add(road)
  roadMeshes.push(road)
  allBuildingGroups.push(road)

  const lampCount = Math.floor(curve.getLength() / 20)
  const lampGroup = new THREE.Group()
  lampGroup.name = 'roadLamps'
  road.add(lampGroup)
  for (let i = 0; i < lampCount; i++) {
    const t = (i + 0.5) / lampCount
    const pt = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    ;[halfWidth + 1.5, -halfWidth - 1.5].forEach((off) => {
      const poleX = pt.x + perp.x * off
      const poleZ = pt.z + perp.z * off
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 5, 8)
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 })
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.set(poleX, pt.y + 2.5, poleZ)
      pole.castShadow = true
      pole.receiveShadow = true
      lampGroup.add(pole)

      const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8)
      const arm = new THREE.Mesh(armGeo, poleMat)
      arm.rotation.z = Math.PI / 2
      arm.position.set(off > 0 ? -0.6 : 0.6, 0, 0)
      pole.add(arm)

      const bulbGeo = new THREE.SphereGeometry(0.25, 8, 8)
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfffbe6,
        emissive: 0xfffbe6,
        emissiveIntensity: 0.5,
      })
      const bulb = new THREE.Mesh(bulbGeo, bulbMat)
      bulb.position.set(off > 0 ? -1.4 : 1.4, 0, 0)
      pole.add(bulb)
    })
  }

  saveSceneState(true)
  console.log('🛣️ 道路已生成')
}

function autoGenerateRoadNetwork() {
  clearRoad()
  const buildings = allBuildingGroups.filter(g => g.name && g.name.startsWith('building_'))
  if (buildings.length === 0) {
    console.log('⚠️ 未找到建筑，无法生成路网')
    return
  }
  const buildingBoxes = []
  buildings.forEach(b => {
    const box = new THREE.Box3().setFromObject(b)
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size = new THREE.Vector3()
    box.getSize(size)
    buildingBoxes.push({ group: b, box, center, size })
  })

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  buildingBoxes.forEach(b => {
    minX = Math.min(minX, b.box.min.x)
    maxX = Math.max(maxX, b.box.max.x)
    minZ = Math.min(minZ, b.box.min.z)
    maxZ = Math.max(maxZ, b.box.max.z)
  })

  const margin = 7
  minX -= margin; maxX += margin; minZ -= margin; maxZ += margin
  const w = maxX - minX, d = maxZ - minZ
  const r = Math.min(w, d) * 0.1

  const loopPoints = []
  const corners = [
    { cx: minX + r, cz: minZ + r, startAngle: Math.PI, endAngle: Math.PI * 1.5 },
    { cx: maxX - r, cz: minZ + r, startAngle: Math.PI * 1.5, endAngle: Math.PI * 2 },
    { cx: maxX - r, cz: maxZ - r, startAngle: 0, endAngle: Math.PI * 0.5 },
    { cx: minX + r, cz: maxZ - r, startAngle: Math.PI * 0.5, endAngle: Math.PI },
  ]
  const segmentsPerCorner = 12

  for (let i = 0; i < 4; i++) {
    const prevCorner = corners[(i + 3) % 4]
    const currCorner = corners[i]
    if (i === 0) {
      loopPoints.push(new THREE.Vector3(minX, 0, minZ + r))
    } else if (i === 1) {
      loopPoints.push(new THREE.Vector3(maxX - r, 0, minZ))
    } else if (i === 2) {
      loopPoints.push(new THREE.Vector3(maxX, 0, maxZ - r))
    } else {
      loopPoints.push(new THREE.Vector3(minX + r, 0, maxZ))
    }

    for (let j = 1; j <= segmentsPerCorner; j++) {
      const t = j / segmentsPerCorner
      const angle = currCorner.startAngle + (currCorner.endAngle - currCorner.startAngle) * t
      const px = currCorner.cx + Math.cos(angle) * r
      const pz = currCorner.cz + Math.sin(angle) * r
      loopPoints.push(new THREE.Vector3(px, 0, pz))
    }

    if (i === 0) {
      loopPoints.push(new THREE.Vector3(minX + r, 0, minZ))
    } else if (i === 1) {
      loopPoints.push(new THREE.Vector3(maxX, 0, minZ + r))
    } else if (i === 2) {
      loopPoints.push(new THREE.Vector3(maxX - r, 0, maxZ))
    } else {
      loopPoints.push(new THREE.Vector3(minX, 0, maxZ - r))
    }
  }

  loopPoints.push(new THREE.Vector3(minX, 0, minZ + r))
  for (let j = 1; j <= segmentsPerCorner; j++) {
    const t = j / segmentsPerCorner
    const angle = corners[0].startAngle + (corners[0].endAngle - corners[0].startAngle) * t
    const px = corners[0].cx + Math.cos(angle) * r
    const pz = corners[0].cz + Math.sin(angle) * r
    loopPoints.push(new THREE.Vector3(px, 0, pz))
  }
  loopPoints.push(new THREE.Vector3(minX + r, 0, minZ))

  roadWaypoints = [...loopPoints]
  buildRoadMesh()

  buildings.forEach(b => {
    const box = new THREE.Box3().setFromObject(b)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)

    const padX = size.x * 0.35 + 6
    const padZ = size.z * 0.35 + 6
    let bMinX = center.x - padX, bMaxX = center.x + padX
    let bMinZ = center.z - padZ, bMaxZ = center.z + padZ

    const bw = bMaxX - bMinX, bd = bMaxZ - bMinZ
    const br = Math.min(bw, bd) * 0.15

    const smallLoop = []
    const sCorners = [
      { cx: bMinX + br, cz: bMinZ + br, a1: Math.PI, a2: Math.PI * 1.5 },
      { cx: bMaxX - br, cz: bMinZ + br, a1: Math.PI * 1.5, a2: Math.PI * 2 },
      { cx: bMaxX - br, cz: bMaxZ - br, a1: 0, a2: Math.PI * 0.5 },
      { cx: bMinX + br, cz: bMaxZ - br, a1: Math.PI * 0.5, a2: Math.PI },
    ]
    const spc = 8

    for (let i = 0; i < 4; i++) {
      if (i === 0) smallLoop.push(new THREE.Vector3(bMinX, 0, bMinZ + br))
      else if (i === 1) smallLoop.push(new THREE.Vector3(bMaxX - br, 0, bMinZ))
      else if (i === 2) smallLoop.push(new THREE.Vector3(bMaxX, 0, bMaxZ - br))
      else smallLoop.push(new THREE.Vector3(bMinX + br, 0, bMaxZ))

      for (let j = 1; j <= spc; j++) {
        const t = j / spc
        const ang = sCorners[i].a1 + (sCorners[i].a2 - sCorners[i].a1) * t
        smallLoop.push(new THREE.Vector3(
          sCorners[i].cx + Math.cos(ang) * br,
          0,
          sCorners[i].cz + Math.sin(ang) * br
        ))
      }

      if (i === 0) smallLoop.push(new THREE.Vector3(bMinX + br, 0, bMinZ))
      else if (i === 1) smallLoop.push(new THREE.Vector3(bMaxX, 0, bMinZ + br))
      else if (i === 2) smallLoop.push(new THREE.Vector3(bMaxX - br, 0, bMaxZ))
      else smallLoop.push(new THREE.Vector3(bMinX, 0, bMaxZ - br))
    }

    smallLoop.push(new THREE.Vector3(bMinX, 0, bMinZ + br))
    for (let j = 1; j <= spc; j++) {
      const t = j / spc
      const ang = sCorners[0].a1 + (sCorners[0].a2 - sCorners[0].a1) * t
      smallLoop.push(new THREE.Vector3(
        sCorners[0].cx + Math.cos(ang) * br,
        0,
        sCorners[0].cz + Math.sin(ang) * br
      ))
    }
    smallLoop.push(new THREE.Vector3(bMinX + br, 0, bMinZ))

    roadWaypoints = [...smallLoop]
    buildSmallRoadMesh()
  })
  console.log('🔧 自动路网已生成：外围环路 + 建筑小环路')
}

function buildSmallRoadMesh() {
  const savedWaypoints = [...roadWaypoints]
  clearRoadPreview()
  const pts = savedWaypoints.map(p => new THREE.Vector3(p.x, p.y + 0.06, p.z))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 1.0)
  const samples = 150
  const halfWidth = 1.5
  const vertices = []
  const uvs = []
  const indices = []

  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const pt = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    vertices.push(pt.x + perp.x * halfWidth, pt.y, pt.z + perp.z * halfWidth)
    vertices.push(pt.x - perp.x * halfWidth, pt.y, pt.z - perp.z * halfWidth)
    uvs.push(0, t * 20); uvs.push(1, t * 20)
  }
  for (let i = 0; i < samples; i++) {
    const a = i*2, b = i*2+1, c = (i+1)*2, d = (i+1)*2+1
    indices.push(a,b,c, b,d,c)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 1024
  const ctx = canvas.getContext('2d')

  const curbW = 8
  ctx.fillStyle = '#6a6458'
  ctx.fillRect(0, 0, 256, curbW)
  ctx.fillRect(0, 1024 - curbW, 256, curbW)
  ctx.fillRect(0, 0, curbW, 1024)
  ctx.fillRect(256 - curbW, 0, curbW, 1024)

  ctx.fillStyle = '#c9b896'
  ctx.fillRect(curbW, curbW, 256 - curbW * 2, 1024 - curbW * 2)

  const brickW = 24, brickH = 12
  const gap = 2
  const colors = ['#d4c4a8', '#cfbfa0', '#cab894', '#d0c09c', '#c5b58c']
  for (let by = curbW; by < 1024 - curbW; by += brickH + gap) {
    const offset = ((by - curbW) / (brickH + gap)) % 2 === 0 ? 0 : brickW / 2 + gap / 2
    for (let bx = curbW + offset; bx < 256 - curbW - brickW; bx += brickW + gap) {
      const c = colors[Math.floor(Math.random() * colors.length)]
      ctx.fillStyle = c
      ctx.fillRect(bx, by, brickW, brickH)
      const shade = Math.random() > 0.5 ? 8 : -8
      ctx.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},0.06)`
      ctx.fillRect(bx, by, brickW, brickH / 2)
    }
  }

  ctx.strokeStyle = '#9a8b70'
  ctx.lineWidth = gap
  for (let y = curbW; y <= 1024 - curbW; y += brickH + gap) {
    ctx.beginPath(); ctx.moveTo(curbW, y); ctx.lineTo(256 - curbW, y); ctx.stroke()
  }
  const rowH = brickH + gap
  for (let row = 0; row <= (1024 - curbW * 2) / rowH; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2 + gap / 2
    const y = curbW + row * rowH
    for (let x = curbW + offset; x <= 256 - curbW; x += brickW + gap) {
      if (x > curbW && x < 256 - curbW) {
        ctx.beginPath(); ctx.moveTo(x, curbW); ctx.lineTo(x, 1024 - curbW); ctx.stroke()
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping

  const mat = new THREE.MeshStandardMaterial({
    map: texture, roughness: 0.7, metalness: 0.05,
    color: 0xffffff, side: THREE.DoubleSide,
  })
  const road = new THREE.Mesh(geo, mat)
  road.name = 'smallRoad'
  road.receiveShadow = true
  scene.add(road)
  roadMeshes.push(road)
  allBuildingGroups.push(road)

  const lampCount = Math.floor(curve.getLength() / 25)
  for (let i = 1; i < lampCount; i++) {
    const t = i / lampCount
    const pt = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t).normalize()
    const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    ;[halfWidth + 0.8, -halfWidth - 0.8].forEach(off => {
      const px = pt.x + perp.x * off, pz = pt.z + perp.z * off
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 })
      )
      pole.position.set(px, pt.y + 0.9, pz)
      pole.castShadow = true
      road.add(pole)
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffdd99, emissiveIntensity: 0.5 })
      )
      bulb.position.set(px, pt.y + 1.85, pz)
      road.add(bulb)
    })
  }

  const curveLen = curve.getLength()
  const startPt = curve.getPointAt(0)
  const endPt = curve.getPointAt(1 - 1e-6)
  const groundY = startPt.y - 0.06

  let minX = Math.min(startPt.x, endPt.x), maxX = Math.max(startPt.x, endPt.x)
  let minZ = Math.min(startPt.z, endPt.z), maxZ = Math.max(startPt.z, endPt.z)
  for (let t = 0.05; t < 0.95; t += 0.05) {
    const p = curve.getPointAt(t)
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
    if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z
  }
  const padX = halfWidth + 2, padZ = halfWidth + 2

  const centerX = (minX + maxX) / 2
  const centerZ = (minZ + maxZ) / 2
  const innerMinX = minX + halfWidth * 2
  const innerMaxX = maxX - halfWidth * 2
  const innerMinZ = minZ + halfWidth * 2
  const innerMaxZ = maxZ - halfWidth * 2

  const spots = [
    { x: centerX, z: minZ + halfWidth * 1.5 },
    { x: centerX, z: maxZ - halfWidth * 1.5 },
    { x: minX + halfWidth * 1.5, z: centerZ },
    { x: maxX - halfWidth * 1.5, z: centerZ },
  ]
  const treeGroup = new THREE.Group()
  treeGroup.name = 'roadTrees'
  treeGroupRef = treeGroup
  road.add(treeGroup)
  let treeIdx = 0
  spots.forEach(spot => {
    for (let i = 0; i < 2; i++) {
      const ox = (i === 0 ? -1.8 : 1.8), oz = (i === 0 ? -1.8 : 1.8)
      let tx = spot.x + (spot.z < centerZ ? oz : -oz)
      let tz = spot.z + (spot.x < centerX ? ox : -ox)
      tx = Math.max(innerMinX, Math.min(innerMaxX, tx))
      tz = Math.max(innerMinZ, Math.min(innerMaxZ, tz))

      const trunkH = 1.5 + Math.random() * 0.8
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, trunkH, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 })
      )
      trunk.position.set(tx, groundY + trunkH / 2, tz)
      trunk.castShadow = true
      treeGroup.add(trunk)

      const canopyColors = [0x2d5a27, 0x3a6b34, 0x4a7d42, 0x228b22]
      const canopyColor = canopyColors[treeIdx % canopyColors.length]
      const canopyR = 1.2 + (treeIdx % 3) * 0.35
      const canopyY = groundY + trunkH + canopyR * 0.5
      const layers = 2 + (treeIdx % 2)
      for (let l = 0; l < layers; l++) {
        const layerR = canopyR * (1 - l * 0.28)
        const layerY = canopyY + l * canopyR * 0.45
        const canopy = new THREE.Mesh(
          new THREE.ConeGeometry(layerR, canopyR * 1.1, 7),
          new THREE.MeshStandardMaterial({ 
            color: l === 0 ? canopyColor : 0x2a5525,
            roughness: 0.85 
          })
        )
        canopy.position.set(tx, layerY, tz)
        canopy.castShadow = true
        treeGroup.add(canopy)
      }
      treeIdx++
    }
  })

  saveSceneState(true)
}

function clearRoad() {
  clearRoadPreview()
  roadMeshes.forEach(m => {
    scene.remove(m)
    const idx = allBuildingGroups.indexOf(m)
    if (idx >= 0) allBuildingGroups.splice(idx, 1)
  })
  roadMeshes = []
}

function clearRoadPreview() {
  roadWaypoints = []
}

function parseComponentInfo(name, ifcType, mesh) {
  const box = new THREE.Box3().setFromObject(mesh)
  const size = new THREE.Vector3()
  box.getSize(size)
  const w = size.x.toFixed(2)
  const h = size.y.toFixed(2)
  const d = size.z.toFixed(2)

  const cleaned = name
    .replace(/^Ifc\w+/, '')
    .replace(/\d{5,}$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const typeMap = {
    IfcSlab: '楼板',
    IfcWall: '墙体',
    IfcWallStandardCase: '墙体',
    IfcDoor: '门',
    IfcWindow: '窗户',
    IfcBeam: '梁',
    IfcColumn: '柱',
    IfcStairFlight: '楼梯段',
    IfcRailing: '栏杆',
    IfcBuildingElementProxy: '构件',
    IfcRoof: '屋顶',
  }
  const typeName = typeMap[ifcType] || ifcType

  const lines = []
  lines.push(`📋 ${typeName}${cleaned ? ' · ' + cleaned : ''}`)
  lines.push(`📐 ${w} × ${d} × ${h} m (长×宽×高)`)

  return { lines, typeName }
}

function highlightMesh(mesh) {
  unhighlightMesh()
  if (!mesh || !mesh.material) return

  let obj = mesh
  while (obj) {
    if (obj.name === 'ground' || obj.name === 'groundPlane') {
      console.log('🚫 忽略地面高亮')
      return
    }
    obj = obj.parent
  }

  highlightedMesh = mesh
  mesh.userData._origMaterial = mesh.material
  mesh.material = mesh.material.clone()
  mesh.material.emissive = new THREE.Color(0x3b82f6)
  mesh.material.emissiveIntensity = 0.5
  mesh.material.needsUpdate = true
}

function unhighlightMesh() {
  if (!highlightedMesh) return
  if (highlightedMesh.userData._origMaterial) {
    highlightedMesh.material.dispose()
    highlightedMesh.material = highlightedMesh.userData._origMaterial
    highlightedMesh.userData._origMaterial = null
  }
  highlightedMesh = null
}

let isRotating = false
let isDragging = false
let isAltDragging = false
let prevMouseX = 0
let prevMouseY = 0
let dragStartPos = new THREE.Vector3()
let dragStartBuildingPos = new THREE.Vector3()
let createSensorModel = null

function onRouteClick(event) {
  if (!buildingModel) return
  
  if (isSettingPathMode.value) {
    addPathPoint(event)
    return
  }

  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = []
  
  if (agvModel && showAGVTrail.value) {
    raycaster.intersectObject(agvModel, true).forEach(hit => {
      hit.objectType = 'agv'
      intersects.push(hit)
    })
  }
  
  allBuildingGroups.forEach(group => {
    raycaster.intersectObject(group, true).forEach(hit => intersects.push(hit))
  })
  sensorGroups.forEach(group => {
    raycaster.intersectObject(group, true).forEach(hit => intersects.push(hit))
  })
  if (groundPlane) {
    raycaster.intersectObject(groundPlane).forEach(hit => intersects.push(hit))
  }
  intersects.sort((a, b) => a.distance - b.distance)

  if (intersects.length > 0 && intersects[0].objectType === 'agv') {
    onAGVModelClick()
    return
  }

  if (sensorEditorRef.value?.isPlacingSensor && intersects.length > 0) {
    const point = intersects[0].point
    let buildingLabel = ''
    for (const hit of intersects) {
      let cur = hit.object
      while (cur) {
        if (cur.name && cur.name.startsWith('building_')) {
          const idx = parseInt(cur.name.replace('building_', ''))
          buildingLabel = sceneConfig.buildings[idx]?.label || ''
          break
        }
        cur = cur.parent
      }
      if (buildingLabel) break
    }
    sensorEditorRef.value.placeSensor(point, buildingLabel)
    return
  }

  if (event.ctrlKey || event.metaKey) {
    if (intersects.length > 0) {
      let sensorGroup = null
      let restAreaGroup = null
      for (const hit of intersects) {
        let cur = hit.object
        while (cur) {
          if (cur.name && (cur.name.startsWith('sensor_') || cur.name.startsWith('SENSOR-'))) {
            sensorGroup = cur
            break
          }
          if (cur.name && cur.name.startsWith('restArea_')) {
            restAreaGroup = cur
            break
          }
          cur = cur.parent
        }
        if (sensorGroup || restAreaGroup) break
      }
      if (sensorGroup) {
        selectBuilding(sensorGroup)
        meshInfo.value = null
        unhighlightMesh()
        console.log(`🪑 已选中: ${sensorGroup.name}`)
      } else if (restAreaGroup) {
        selectBuilding(restAreaGroup)
        meshInfo.value = null
        unhighlightMesh()
        console.log(`🪑 已选中休息区: ${restAreaGroup.name} | 位置: (${restAreaGroup.position.x.toFixed(1)}, ${restAreaGroup.position.z.toFixed(1)})`)
      } else {
        const buildingGroup = findBuildingGroup(intersects[0].object)
        if (buildingGroup) {
          handleBuildingClick(buildingGroup, event)
        }
      }
    } else {
      deselectBuilding()
      if (showBuildingInfoCard.value) {
        closeBuildingInfoCard()
      }
    }
    return
  }

  if (!isPatrolActive && intersects.length > 0) {
    if (isPreview.value) return

    const obj = intersects[0].object

    if (componentSelectMode.value || isDebugMode) {
      const name = obj.name || '未命名'

      if (name === 'ground' || name === 'groundPlane' || !obj.isMesh) {
        meshInfo.value = null
        unhighlightMesh()
        return
      }
      const tris = obj.geometry?.index
        ? Math.floor(obj.geometry.index.count / 3)
        : Math.floor((obj.geometry.attributes?.position?.count || 0) / 3)

      const path = []
      let cur = obj
      while (cur) {
        path.unshift(cur.name || cur.type || '(anonymous)')
        cur = cur.parent
      }
      const fullPath = path.join(' → ')

      meshInfo.value = {
        name,
        ifcType: '🔍 组件选择',
        lines: [
          `🔺 ${tris.toLocaleString()} 面`,
          `📐 路径: ${fullPath}`
        ]
      }
      updateMeshInfoPosition(obj)
      highlightMesh(obj)
      console.log(`🔍 选中组件: ${name} | ${tris.toLocaleString()} 面 | 路径: ${fullPath}`)
      return
    }

    const clickedBuildingGroup = findBuildingGroup(obj)
    if (clickedBuildingGroup) {
      handleBuildingClick(clickedBuildingGroup, event)
      return
    }

    let parentGroup = obj
    while (parentGroup && !(parentGroup.name && (parentGroup.name.startsWith('sensor_') || parentGroup.name.startsWith('SENSOR-')))) {
      parentGroup = parentGroup.parent
    }
    if (parentGroup && parentGroup.name && (parentGroup.name.startsWith('sensor_') || parentGroup.name.startsWith('SENSOR-'))) {
      selectBuilding(parentGroup)
      sensorEditorRef.value?.openEditor(parentGroup)
      return
    }
    const name = obj.name || '未命名'
    if (name === 'ground' || name === 'groundPlane' || name === 'floor') {
      meshInfo.value = null
      return
    }
    let ifcType = name.match(/^(Ifc[a-zA-Z]+)/)?.[1] || ''
    if (!ifcType) {
      let p = obj.parent
      while (p && p !== scene) {
        ifcType = (p.name || '').match(/^(Ifc[a-zA-Z]+)/)?.[1] || ''
        if (ifcType) break
        p = p.parent
      }
    }
    if (!ifcType) ifcType = '未知类型'
    const info = parseComponentInfo(name, ifcType, obj)
    meshInfo.value = { name, ifcType, ...info }
    updateMeshInfoPosition(obj)
    highlightMesh(obj)
    return
  }

  meshInfo.value = null
  unhighlightMesh()

  if (showBuildingInfoCard.value) {
    closeBuildingInfoCard()
  }
}

function handleBuildingClick(buildingGroup, event) {
  if (!isMainBuilding(buildingGroup)) {
    showBriefLabelForGroup(buildingGroup)
    return
  }

  if (clickTimer && lastClickedBuilding === buildingGroup) {
    clearTimeout(clickTimer)
    clickTimer = null
    lastClickedBuilding = null
    handleDoubleClickBuilding(buildingGroup)
  } else {
    if (clickTimer) {
      clearTimeout(clickTimer)
    }
    clickTimer = setTimeout(() => {
      clickTimer = null
      lastClickedBuilding = null
      handleSingleClickBuilding(buildingGroup)
    }, CLICK_DELAY)
    lastClickedBuilding = buildingGroup
  }
}

function handleSingleClickBuilding(buildingGroup) {
  if (!isMainBuilding(buildingGroup)) {
    showBriefLabelForGroup(buildingGroup)
    return
  }
  selectBuilding(buildingGroup)
  selectedBuildingForView.value = buildingGroup
  showBuildingInfoCard.value = true
  updateBuildingInfoCardPosition(buildingGroup)
  console.log('🖱️ 单击选中建筑:', buildingGroup.name || '未命名')
}

function handleDoubleClickBuilding(buildingGroup) {
  if (isFlyingToBuilding) return

  selectBuilding(buildingGroup)
  selectedBuildingForView.value = buildingGroup

  flyToBuilding(buildingGroup)

  console.log('🎯 双击飞向建筑:', buildingGroup.name || '未命名')
}

const buildingViewPresets = {
  '主厂房': {
    position: { x: 14.9, y: 26.2, z: -103.2 },
    target: { x: 7.5, y: 6.5, z: -41.3 }
  },
  '车间B': {
    position: { x: 75.1, y: 29.2, z: -27.9 },
    target: { x: 67.5, y: 6.5, z: 36.6 }
  },
  '办公楼B': {
    position: { x: -14.2, y: 9.6, z: 3.1 },
    target: { x: -21.3, y: 6.2, z: 29 }
  },
  '办公楼': {
    position: { x: -18.1, y: 7.3, z: -3.9 },
    target: { x: -44.3, y: 6.2, z: -6.6 }
  },
  '积压站': {
    position: { x: -112.4, y: 13.9, z: 13.9 },
    target: { x: -107.9, y: 7.3, z: -28.8 }
  },
  '积压站B': {
    position: { x: 141, y: 16.7, z: -119.4 },
    target: { x: 0, y: 2.3, z: 0 }
  }
}

const interiorViewPresets = {
  '积压站': {
    position: { x: -79.79, y: 3.19, z: -28.67 },
    target: { x: -107.90, y: 7.30, z: -28.80 }
  }
}

const isInteriorView = ref(false)
const savedExteriorView = ref(null)

function saveCurrentView(buildingName) {
  const viewData = {
    position: {
      x: parseFloat(camera.position.x.toFixed(1)),
      y: parseFloat(camera.position.y.toFixed(1)),
      z: parseFloat(camera.position.z.toFixed(1))
    },
    target: {
      x: parseFloat(controls.target.x.toFixed(1)),
      y: parseFloat(controls.target.y.toFixed(1)),
      z: parseFloat(controls.target.z.toFixed(1))
    }
  }

  buildingViewPresets[buildingName] = viewData

  console.log('\n📸 视角已保存:')
  console.log(`【${buildingName}】`)
  console.log(`  📍 相机位置: (${viewData.position.x}, ${viewData.position.y}, ${viewData.position.z})`)
  console.log(`  👀 观看目标: (${viewData.target.x}, ${viewData.target.y}, ${viewData.target.z})`)
  console.log('\n📋 复制这段JSON配置:')
  console.log(JSON.stringify(viewData, null, 2))

  return viewData
}

function flyToBuilding(buildingGroup) {
  isFlyingToBuilding = true

  if (flyAnimationId) {
    cancelAnimationFrame(flyAnimationId)
    flyAnimationId = null
  }

  const box = new THREE.Box3().setFromObject(buildingGroup)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  const maxDim = Math.max(size.x, size.y, size.z)

  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()

  let endPos, endTarget

  const buildingName = buildingGroup.userData?.label || buildingGroup.name || buildingGroup.userData?.name || 'unknown'

  console.log('🔍 查找建筑预设:')
  console.log(`   .userData.label = "${buildingGroup.userData?.label}"`)
  console.log(`   .name = "${buildingGroup.name}"`)
  console.log(`   .userData.name = "${buildingGroup.userData?.name}"`)
  console.log(`   最终使用: "${buildingName}"`)
  console.log(`   可用预设列表:`, Object.keys(buildingViewPresets))

  if (buildingViewPresets[buildingName]) {
    const preset = buildingViewPresets[buildingName]
    endPos = new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z)
    endTarget = new THREE.Vector3(preset.target.x, preset.target.y, preset.target.z)
    console.log(`✅ 使用预设视角: ${buildingName}`)
  } else {
    let frontDirection = new THREE.Vector3(0, 0, -1)

    if (buildingGroup.rotation) {
      const euler = new THREE.Euler(
        buildingGroup.rotation.x,
        buildingGroup.rotation.y,
        buildingGroup.rotation.z,
        'XYZ'
      )
      frontDirection.applyEuler(euler)
    }

    const viewDistance = maxDim * 2.5
    const elevationAngle = Math.PI / 6

    const horizontalDist = viewDistance * Math.cos(elevationAngle)
    const verticalDist = viewDistance * Math.sin(elevationAngle)

    endPos = center.clone()
    endPos.add(frontDirection.multiplyScalar(horizontalDist))
    endPos.y += verticalDist + center.y
    endTarget = center.clone()

    console.log(`⚠️ 无预设视角，使用自动计算: ${buildingName}`)
    console.log('   💡 提示: 按 V 键可保存当前视角作为该建筑的预设')
  }

  const duration = 2000
  const startTime = performance.now()

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  console.log('🎬 开始飞行动画:')
  console.log(`   起点: (${startPos.x.toFixed(1)}, ${startPos.y.toFixed(1)}, ${startPos.z.toFixed(1)})`)
  console.log(`   终点: (${endPos.x.toFixed(1)}, ${endPos.y.toFixed(1)}, ${endPos.z.toFixed(1)})`)

  function animateFly() {
    const elapsed = performance.now() - startTime
    let progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeInOutCubic(progress)

    camera.position.lerpVectors(startPos, endPos, easedProgress)
    controls.target.lerpVectors(startTarget, endTarget, easedProgress)
    controls.update()

    if (progress < 1) {
      flyAnimationId = requestAnimationFrame(animateFly)
    } else {
      isFlyingToBuilding = false
      flyAnimationId = null
      showBuildingInfoCard.value = true
      updateBuildingInfoCardPosition(buildingGroup)
      console.log('✈️ 飞行完成，显示建筑信息卡片')
    }
  }

  flyAnimationId = requestAnimationFrame(animateFly)
}

function hasInteriorPreset(buildingGroup) {
  const name = buildingGroup.userData?.label || buildingGroup.name || ''
  return !!interiorViewPresets[name]
}

function enterInteriorView(buildingGroup) {
  const name = buildingGroup.userData?.label || buildingGroup.name || ''
  const interior = interiorViewPresets[name]
  if (!interior) return

  savedExteriorView.value = {
    position: camera.position.clone(),
    target: controls.target.clone()
  }

  isInteriorView.value = true

  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()
  const endPos = new THREE.Vector3(interior.position.x, interior.position.y, interior.position.z)
  const endTarget = new THREE.Vector3(interior.target.x, interior.target.y, interior.target.z)

  const duration = 1500
  const startTime = performance.now()

  function animateEnter() {
    const elapsed = performance.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    camera.position.lerpVectors(startPos, endPos, eased)
    controls.target.lerpVectors(startTarget, endTarget, eased)
    controls.update()

    if (t < 1) {
      requestAnimationFrame(animateEnter)
    } else {
      console.log('🏠 已进入建筑内部:', name)
    }
  }

  animateEnter()
}

function exitInteriorView() {
  if (!savedExteriorView.value) return

  isInteriorView.value = false

  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()
  const endPos = savedExteriorView.value.position
  const endTarget = savedExteriorView.value.target

  const duration = 1000
  const startTime = performance.now()

  function animateExit() {
    const elapsed = performance.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    camera.position.lerpVectors(startPos, endPos, eased)
    controls.target.lerpVectors(startTarget, endTarget, eased)
    controls.update()

    if (t < 1) {
      requestAnimationFrame(animateExit)
    } else {
      savedExteriorView.value = null
      console.log('← 已退出建筑内部')
    }
  }

  animateExit()
}

function updateBuildingInfoCardPosition(buildingGroup) {
  if (!buildingGroup) return

  const box = new THREE.Box3().setFromObject(buildingGroup)
  const center = box.getCenter(new THREE.Vector3())

  const tempVec = center.clone()
  tempVec.project(camera)

  const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth
  const y = (-tempVec.y * 0.5 + 0.5) * window.innerHeight

  const cardWidth = 140
  const cardHeight = 60

  buildingInfoCardPos.value = {
    x: x - cardWidth / 2,
    y: y - cardHeight - 20
  }
}

function updateMeshInfoPosition(mesh) {
  if (!mesh) return

  const box = new THREE.Box3().setFromObject(mesh)
  const center = box.getCenter(new THREE.Vector3())

  const tempVec = center.clone()
  tempVec.project(camera)

  const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth
  const y = (-tempVec.y * 0.5 + 0.5) * window.innerHeight

  meshInfoPos.value = {
    x: Math.max(10, Math.min(window.innerWidth - 330, x - 100)),
    y: Math.max(10, y - 60)
  }
}

function getBuildingLabel(buildingGroup) {
  if (!buildingGroup) return '未命名'
  if (buildingGroup.name && buildingGroup.name.startsWith('building_')) {
    const idx = parseInt(buildingGroup.name.replace('building_', ''))
    return sceneConfig.buildings[idx]?.label || buildingGroup.name
  }
  return buildingGroup.name || '未命名'
}

function getBuildingType(buildingGroup) {
  if (!buildingGroup) return '未知类型'
  if (buildingGroup.name && buildingGroup.name.startsWith('building_')) {
    const idx = parseInt(buildingGroup.name.replace('building_', ''))
    return sceneConfig.buildings[idx]?.type || '建筑'
  }
  return '建筑'
}

function getBuildingPosition(buildingGroup) {
  if (!buildingGroup) return '-'
  const pos = buildingGroup.position
  return `(${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`
}

function getBuildingSensorCount(buildingGroup) {
  if (!buildingGroup || !sensorGroups) return 0

  const buildingLabel = getBuildingLabel(buildingGroup)
  let count = 0

  sensorGroups.forEach(sensor => {
    if (sensor.userData && sensor.userData.buildingLabel === buildingLabel) {
      count++
    }
  })

  return count
}

function closeBuildingInfoCard() {
  showBuildingInfoCard.value = false
  selectedBuildingForView.value = null
  deselectBuilding()
}

function resetCameraAndClose() {
  closeBuildingInfoCard()
  resetCamera()
}

function toggleEditMode() {
  isEditMode = !isEditMode

  if (isEditMode) {
    console.log('✏️ 编辑模式已开启 - 可以拖动建筑')
    console.log('   操作说明: Ctrl+拖动移动 | Shift+拖动旋转 | Alt+上下调整高度')
  } else {
    console.log('🔒 编辑模式已关闭')
    deselectBuilding()
  }
}

function removeTreesInsideBuildings() {
  const buildings = [
    { name: '积压站', minX: -95, maxX: -83, minZ: -29, maxZ: -19 },
    { name: '积压站B', minX: 124, maxX: 134, minZ: -41, maxZ: -30 },
    { name: '主厂房', minX: -12, maxX: 8, minZ: -8, maxZ: 3 },
    { name: '车间B', minX: 57, maxX: 78, minZ: 63, maxZ: 81 },
    { name: '办公楼', minX: -60, maxX: -48, minZ: -17, maxZ: -6 },
    { name: '办公楼B', minX: -32, maxX: -20, minZ: 33, maxZ: 44 }
  ]

  let totalRemoved = 0
  buildings.forEach(building => {
    const result = removeTreesInArea(scene, building)
    totalRemoved += result.removed
    if (result.removed > 0) {
      console.log(`🌳 ${building.name}: ${result.message}`)
    }
  })

  if (totalRemoved > 0) {
    alert(`✅ 已移除 ${totalRemoved} 棵侵入建筑的树！\n\n详情请查看控制台日志`)
  } else {
    alert('ℹ️ 没有发现侵入建筑内部的树木')
  }

  saveSceneState(true)
}

function toggleTrees() {
  treesHidden.value = !treesHidden.value
  const show = !treesHidden.value

  let found = 0

  scene.traverse(obj => {
    if (obj.name === 'roadTrees' && obj.isGroup) {
      obj.traverse(child => {
        if (child.isMesh) {
          child.visible = show
          found++
        }
      })
    }
  })

  console.log(`🌳 树木已${treesHidden.value ? '隐藏' : '显示'} (${found}个mesh)`)
}
</script>

<style scoped>
.factory-detail-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0f172a 100%);
  z-index: 1000;
}

.factory-detail-page.preview {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: auto;
  border-radius: 8px;
  overflow: hidden;
}

.factory-detail-page.theme-dark-screen {
  background: radial-gradient(ellipse at center, #0a1628 0%, #060d18 40%, #020408 100%);
}

.factory-detail-page.theme-dark-screen::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  box-shadow: inset 0 0 200px 60px rgba(10, 22, 40, 0.6);
  border-radius: 0;
}

.factory-detail-page.theme-dark-screen .three-container {
  filter: brightness(0.9) contrast(1.05);
}

.three-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.three-container.preview {
  position: relative;
  inset: auto;
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

/* ---------- 顶部标题 ---------- */
.platform-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 3px;
  text-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
  margin: 0;
  white-space: nowrap;
  padding: 10px 28px;
  position: relative;
  z-index: 1;
}

.center-title {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.center-title::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.35) 0%,
    rgba(59, 130, 246, 0.1) 50%,
    rgba(59, 130, 246, 0.2) 100%
  );
  clip-path: polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%);
  border-top: 2px solid rgba(59, 130, 246, 0.6);
  z-index: -1;
}

.center-title::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(59, 130, 246, 0.15) 100%
  );
  clip-path: polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%);
  border-top: 1px solid rgba(59, 130, 246, 0.25);
  z-index: -1;
}

/* ---------- 浮动工具栏（左上角）---------- */
.floating-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
}

/* ---------- 迷你信息面板 ---------- */
.info-panel-mini {
  position: absolute;
  top: 80px;
  left: 20px;
  width: auto;
  min-width: 200px;
  background: rgba(143, 180, 208, 0.25);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 14px 18px;
  border: 1px solid rgba(74, 107, 138, 0.25);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  z-index: 90;
}

.panel-header-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0;
  flex-wrap: wrap;
}

.panel-header-mini h2 {
  font-size: 15px;
  color: #1e3a5c;
  margin: 0;
  font-weight: 600;
}

.panel-header-mini .factory-type {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(74, 107, 138, 0.2);
  color: #2a6b8a;
  border-radius: 6px;
  font-weight: 500;
}

.info-panel-mini.collapsed .panel-body {
  display: none;
}

.info-panel-mini .panel-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(74, 107, 138, 0.2);
}

.info-panel-mini .description {
  font-size: 12px;
  color: rgba(30, 58, 92, 0.7);
  margin-bottom: 8px;
  line-height: 1.5;
}

.info-panel-mini .position-info {
  font-size: 11px;
  color: rgba(30, 58, 92, 0.65);
}

.info-panel-mini .label {
  font-weight: 500;
  color: rgba(30, 58, 92, 0.75);
}

.info-panel-mini .value {
  font-family: monospace;
  color: #2a6b8a;
}

.info-panel-mini .btn-fold {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(30, 58, 92, 0.5);
  cursor: pointer;
  font-size: 13px;
  padding: 4px 8px;
  transition: all 0.2s ease;
}

.info-panel-mini .btn-fold:hover {
  color: #2a6b8a;
  transform: scale(1.05);
}

.panel-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.25);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.btn-fold {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-fold:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.collapsed .panel-body,
.collapsed .panel-footer,
.collapsed .sensor-list {
  display: none;
}

.info-panel.collapsed,
.sensor-panel.collapsed {
  padding-bottom: 8px;
}

.panel-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #e2e8f0;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}

.factory-type {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(59, 130, 246, 0.25);
  color: #93c5fd;
  border-radius: 20px;
  font-size: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.panel-body {
  margin-bottom: 16px;
}

.description {
  margin: 0 0 12px 0;
  color: #94a3b8;
  line-height: 1.6;
  font-size: 14px;
}

.position-info {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.position-info .label {
  color: #64748b;
}

.position-info .value {
  color: #93c5fd;
  font-family: monospace;
}

.floating-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
}

.glass-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  position: relative;
}

.glass-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  position: relative;
  overflow: hidden;
}

.glass-btn svg {
  width: 20px;
  height: 20px;
  stroke: rgba(226, 232, 240, 0.85);
  transition: all 0.25s ease;
}

.glass-btn .theme-label {
  font-size: 10px;
  color: rgba(226, 232, 240, 0.85);
  margin-left: 4px;
  white-space: nowrap;
}

.theme-toggle-btn {
  width: auto !important;
  border-radius: 22px !important;
  padding: 0 12px !important;
}

.glass-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
  transform: translateY(-2px);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.15),
    0 0 20px rgba(255, 255, 255, 0.05);
}

.glass-btn:hover svg {
  stroke: #ffffff;
  transform: scale(1.1);
}

.glass-btn:active {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.15);
}

.glass-more-wrapper {
  position: relative;
}

.glass-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 180px;
  background: rgba(143, 180, 208, 0.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(74, 107, 138, 0.3);
  border-radius: 14px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.15) inset;
  padding: 8px;
  z-index: 1000;
  animation: menuSlideIn 0.2s ease-out;
}

@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.menu-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(74, 144, 255, 0.3), transparent);
  margin: 8px 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(30, 58, 92, 0.85);
  font-size: 13.5px;
  font-weight: 400;
}

.menu-item:hover {
  background: rgba(74, 107, 138, 0.2);
  color: #1e3a5c;
  transform: translateX(3px);
}

.menu-item.active {
  background: rgba(74, 143, 168, 0.35);
  color: #2a6b8a;
}

.menu-item svg {
  width: 18px;
  height: 18px;
  stroke: rgba(74, 107, 138, 0.8);
  flex-shrink: 0;
}

.menu-item:hover svg {
  stroke: #2a6b8a;
}

.menu-item.active svg {
  stroke: #4a6b8a;
}

.controls-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: rgba(30, 58, 138, 0.3);
  backdrop-filter: blur(8px);
  color: #93c5fd;
  border-radius: 20px;
  font-size: 13px;
  z-index: 10;
  border: 1px solid rgba(59, 130, 246, 0.25);
  pointer-events: none;
}

.coord-panel {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  color: #ffcc00;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  z-index: 10;
  border: 1px solid rgba(255, 204, 0, 0.4);
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-reset-pos {
  padding: 3px 10px;
  background: rgba(74, 144, 255, 0.25);
  border: 1px solid rgba(74, 144, 255, 0.5);
  color: #4a90ff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
  transition: all 0.2s;
}
.btn-reset-pos:hover {
  background: rgba(74, 144, 255, 0.5);
  color: #fff;
}

.mesh-info-popup {
  position: absolute;
  z-index: 100;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 10px;
  padding: 12px 16px;
  max-width: 320px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  cursor: default;
  user-select: text;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- 建筑信息卡片 ---------- */
/* ---------- 建筑信息提示卡片 ---------- */
.build-tip {
  position: absolute;
  width: 140px;
  padding: 10px 16px 14px;
  background: rgba(8, 22, 44, 0.82);
  border: 1px solid #4ec8ff;
  color: #fff;
  border-radius: 4px;
  /* 立体倾斜效果 */
  transform: perspective(320px) rotateX(6deg);
  transform-origin: center bottom;
  box-shadow:
    0 0 12px rgba(78, 200, 255, 0.25),
    0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 150;
  animation: tipFadeIn 0.25s ease-out;
  user-select: none;
}

/* 底部尖角三角（::after伪元素）- 漫画对话框/Word标注样式 */
.build-tip::after {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -10px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 12px solid rgba(8, 22, 44, 0.82);
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

@keyframes tipFadeIn {
  from {
    opacity: 0;
    transform: perspective(320px) rotateX(6deg) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: perspective(320px) rotateX(6deg) translateY(0);
  }
}

.tip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.tip-title {
  font-size: 14px;
  font-weight: 600;
  color: #e0f4ff;
  letter-spacing: 0.5px;
  text-align: center;
}

.tip-sensors {
  font-size: 11px;
  color: #4ec8ff;
  font-weight: 500;
  letter-spacing: 0.3px;
  text-align: center;
  opacity: 0.85;
}

.tip-enter-btn {
  margin-top: 6px;
  padding: 5px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #00a8ff, #0077cc);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.2s;
}

.tip-enter-btn:hover {
  background: linear-gradient(135deg, #00c8ff, #0099ee);
  box-shadow: 0 0 12px rgba(0, 168, 255, 0.5);
  transform: scale(1.05);
}

.brief-label {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.75);
  color: #ccc;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 100;
  animation: briefFadeIn 0.2s ease-out;
}

@keyframes briefFadeIn {
  from { opacity: 0; transform: translate(-50%, -50%) translateY(-8px); }
  to { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
}

.building-card-body {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.info-label {
  font-size: 12px;
  color: rgba(30, 58, 92, 0.65);
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #1e3a5c;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

.status-normal {
  color: #059669 !important;
}

.building-card-footer {
  padding: 12px 18px 14px;
  border-top: 1px solid rgba(74, 107, 138, 0.25);
}

.card-action-btn {
  width: 100%;
  padding: 8px 16px;
  background: rgba(74, 107, 138, 0.2);
  color: #1e3a5c;
  border: 1px solid rgba(74, 107, 138, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.25s ease;
}

.card-action-btn:hover {
  background: rgba(74, 107, 138, 0.35);
  border-color: rgba(74, 107, 138, 0.45);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.mesh-info-header {
  display: none;
}

.mesh-info-detail {
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.9;
  padding-right: 20px;
}

.mesh-info-close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  line-height: 1;
}

/* ---------- 编辑模式 ---------- */
.edit-mode-active {
  background: rgba(251, 191, 36, 0.25) !important;
  border-color: rgba(245, 158, 11, 0.5) !important;
}

.edit-mode-active svg {
  stroke: #f59e0b !important;
}

.edit-mode-hint {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  background: rgba(251, 191, 36, 0.2);
  backdrop-filter: blur(8px);
  color: #f59e0b;
  border-radius: 8px;
  font-size: 12px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  animation: pulse 2s infinite;
  z-index: 95;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.mesh-info-close:hover {
  color: #e2e8f0;
}

/* ---------- 原有传感器面板（保留兼容） ---------- */
.sensor-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 260px;
  max-height: 280px;
  overflow-y: auto;
  background: rgba(10, 25, 60, 0.55);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 0;
  padding: 12px;
  border: 1px solid rgba(0, 150, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 150, 255, 0.12), 0 0 50px rgba(0, 100, 255, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: 10;
}

.sensor-panel::-webkit-scrollbar { width: 4px; }
.sensor-panel::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.2); border-radius: 2px; }

.sensor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.sensor-header h3 {
  margin: 0;
  font-size: 15px;
  color: #e2e8f0;
  text-shadow: 0 0 6px rgba(59, 130, 246, 0.2);
}

.ws-status {
  font-size: 11px;
  color: #ef4444;
  transition: color 0.3s;
}

.ws-status.connected {
  color: #22c55e;
}

.sensor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sensor-card {
  cursor: pointer;
  background: rgba(30, 58, 138, 0.25);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  transition: all 0.2s;
}
.sensor-card:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.sensor-card.warning {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.08);
}

.sensor-card.alarm {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.1);
  animation: alarm-pulse 1.5s ease-in-out infinite;
}

@keyframes alarm-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 12px 2px rgba(239, 68, 68, 0.5); }
}

.sensor-name {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.sensor-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.sensor-value {
  font-size: 28px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  color: #22c55e;
  transition: color 0.5s;
}

.sensor-unit {
  font-size: 13px;
  color: #64748b;
}

.sensor-bar-bg {
  height: 4px;
  background: rgba(59, 130, 246, 0.12);
  border-radius: 2px;
  margin-bottom: 8px;
  overflow: hidden;
}

.sensor-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease, background 0.5s;
}

.sensor-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sensor-id {
  font-size: 10px;
  color: #475569;
}
.btn-fly {
  background: rgba(59, 130, 246, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.5);
  color: #93c5fd;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-fly:hover {
  background: rgba(59, 130, 246, 0.5);
  color: #fff;
}

.sensor-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.sensor-status.normal {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}

.sensor-status.warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.sensor-status.alarm {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

/* 雷达图触发按钮样式 */
.radar-trigger-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(96, 156, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-trigger-btn:hover {
  color: #60a5fa;
  transform: rotate(90deg) scale(1.15);
  text-shadow: 0 0 12px rgba(96, 156, 255, 0.6);
}

@keyframes fadeInSlideDown {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sensor-gauges-panel {
  position: fixed;
  top: 280px;
  right: 20px;
  z-index: 100;
  background: transparent !important;
  background-color: transparent !important;
  padding: 14px;
  width: 320px;
  height: 450px;
  max-height: calc(100vh - 300px);
  display: flex;
  flex-direction: column;
  /* 八角切角 */
  clip-path: polygon(
    12px 0, calc(100% - 12px) 0,
    100% 12px, 100% calc(100% - 12px),
    calc(100% - 12px) 100%, 12px 100%,
    0 calc(100% - 12px), 0 12px
  );
}

/* 能量光带动画 - stroke-dashoffset 循环移动 */
.energy-flow-outer {
  animation: energyFlow 7s linear infinite;
}
.energy-flow-mid {
  animation: energyFlow 7s linear infinite;
}
.energy-flow-core {
  animation: energyFlow 7s linear infinite;
}

@keyframes energyFlow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -420; }
}

/* 移除伪元素边框，改用 SVG */

.gauges-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  padding-left: 28px;
  border-bottom: 1px solid rgba(74, 144, 255, 0.15);
}

.gauges-title {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.5px;
}

.gauges-filter {
  display: flex;
  gap: 2px;
}

.filter-btn {
  padding: 2px 5px;
  font-size: 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: rgba(74, 144, 255, 0.6);
}

.filter-btn:hover {
  background: rgba(74, 144, 255, 0.08);
  color: rgba(74, 144, 255, 0.9);
  border-color: rgba(74, 144, 255, 0.2);
}

.filter-btn.active {
  background: rgba(74, 144, 255, 0.12);
  color: #4a90ff;
  border-color: rgba(74, 144, 255, 0.4);
  font-weight: 600;
}

.filter-count {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 14px;
  height: 14px;
  font-size: 9px;
  font-weight: bold;
  background: #4a90ff;
  color: white;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.gauges-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  padding-right: 4px;
}

.gauges-scroll-container.scrollable {
  max-height: 400px;
}

.gauges-scroll-container::-webkit-scrollbar {
  width: 4px;
}

.gauges-scroll-container::-webkit-scrollbar-track {
  background: rgba(74, 144, 255, 0.05);
  border-radius: 2px;
}

.gauges-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(74, 144, 255, 0.25);
  border-radius: 2px;
}

.gauges-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(74, 144, 255, 0.4);
}

.gauges-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding-bottom: 4px;
}

/* 温度计组件在面板中的适配样式 - 调窄 */
.thermo-in-panel {
  width: 75%;       /* ✅ 调窄：不是100%，只占75% */
  max-width: 80px;  /* ✅ 最大宽度限制：80px */
  min-height: 130px; /* 稍微降低高度 */
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 4px 2px;   /* 左右留边距，防止遮挡 */
}

/* 湿度计组件在面板中 - 固定小尺寸，简单布局 */
.humidity-in-panel {
  width: auto;       /* 自动宽度 */
  height: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1px 3px;  /* 小边距即可 */
}

/* 震动波纹组件在面板中的适配（测试）*/
.vibration-in-panel {
  width: auto;
  min-height: 140px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2px 4px;
}

.gas-in-panel {
  width: auto;
  min-height: 140px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2px 4px;
}

.gauges-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.footer-hint {
  font-size: 11px;
  color: #e2e8f0;
  animation: scrollHint 2s ease-in-out infinite;
}

@keyframes scrollHint {
  0%, 100% { opacity: 0.6; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(2px); }
}

.realtime-chart-float {
  position: fixed;
  left: 50%;
  bottom: 30px;
  transform: translateX(-50%);
  z-index: 90;
}

.realtime-chart-grid {
  display: flex;
  flex-wrap: wrap-reverse;      /* 关键：从底部开始往上堆叠行 */
  gap: 15px;
  justify-content: center;      /* 每行居中 */
  align-items: flex-end;        /* 底部对齐，统一高度 */
  max-width: calc(100vw - 40px);
}

.realtime-mini-chart {
  width: 280px;
  height: 180px !important;  /* 强制统一高度 */
  display: block;
  background: transparent;
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 6px;
  transition: all 0.25s ease;
}

.realtime-mini-chart:hover {
  border-color: rgba(59, 130, 246, 0.7);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.15);
}

.production-overview-panel {
  position: fixed;
  left: 20px;
  top: 70px;
  width: 320px;
  background: none !important;
  background-color: transparent !important;
  padding: 0;
  z-index: 85;
  overflow: visible;
}

/* SVG 边框定位 */
.flow-border-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}

/* ====== 生产概览流光动画 ====== */
.prod-energy-flow-outer {
  animation: prodEnergyFlow 6s linear infinite;
}
.prod-energy-flow-mid {
  animation: prodEnergyFlow 6s linear infinite;
}
.prod-energy-flow-core {
  animation: prodEnergyFlow 6s linear infinite;
}

@keyframes prodEnergyFlow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -360; }
}

/* ====== 产量趋势面板样式 ====== */
.trend-panel {
  position: fixed;
  left: 20px;
  top: 235px;
  width: 320px;
  background: none !important;
  background-color: transparent !important;
  padding: 0;
  z-index: 84;
  overflow: visible;
}

.simple-border-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 12px 8px 12px;
  position: relative;
  z-index: 1;
}

.trend-title {
  font-size: 15px;
  font-weight: 600;
  color: #4a90ff;
  letter-spacing: 4px;
}

.trend-tabs {
  display: flex;
  gap: 6px;
}

.trend-tab-btn {
  font-size: 11px;
  padding: 3px 10px;
  border: 1px solid rgba(74,144,255,0.3);
  border-radius: 4px;
  background: rgba(74,144,255,0.08);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.25s ease;
}

.trend-tab-btn:hover {
  background: rgba(74,144,255,0.15);
  color: #fff;
}

.trend-tab-btn.active {
  background: rgba(74,144,255,0.25);
  border-color: #4a90ff;
  color: #4a90ff;
  font-weight: 600;
}

.trend-chart-container {
  padding: 0 12px 12px 12px;
  position: relative;
  z-index: 1;
}

.trend-chart-svg {
  width: 100%;
  height: auto;
  display: block;
}

.trend-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(74,144,255,0.2);
}

.trend-stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.stat-value small {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  margin-left: 2px;
  font-weight: normal;
}

.trend-stat-item.up .stat-value {
  color: #10b981;
}

/* ====== 设备状态面板样式 ====== */
.device-status-panel {
  position: fixed;
  left: 20px;
  top: 500px;
  width: 320px;
  background: none !important;
  background-color: transparent !important;
  padding: 0;
  z-index: 83;
  overflow: visible;
}

.device-header {
  padding: 12px 12px 8px 12px;
  position: relative;
  z-index: 1;
}

.device-title {
  font-size: 15px;
  font-weight: 600;
  color: #4a90ff;
  letter-spacing: 4px;
}

.device-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 16px 14px 16px;
  position: relative;
  z-index: 1;
}

.donut-chart-container {
  flex-shrink: 0;
  width: 140px;
  height: 140px;
}

.donut-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 8px rgba(74,144,255,0.3));
}

.status-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(74,144,255,0.06);
  border-radius: 4px;
  transition: all 0.25s ease;
}

.legend-item:hover {
  background: rgba(74,144,255,0.12);
  transform: translateX(4px);
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.legend-label {
  flex: 1;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}

.legend-value {
  font-size: 15px;
  font-weight: bold;
}

.legend-value small {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  margin-left: 2px;
  font-weight: normal;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #4a90ff;
  text-align: center;
  letter-spacing: 4px;
  padding: 14px 12px 8px 12px;
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.panel-close-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: rgba(74, 144, 255, 0.7);
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -2px;
}

.panel-close-btn:hover {
  color: #4ec8ff;
  transform: translateY(-50%) scale(1.2) translateX(-2px);
  text-shadow: 0 0 8px rgba(78, 200, 255, 0.6);
}

.panel-fold-btn {
  position: absolute;
  z-index: 20;
  background: transparent;
  border: none;
  color: rgba(74, 144, 255, 0.7);
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -2px;
}

.panel-fold-btn:hover {
  color: #4ec8ff;
  transform: scale(1.15);
  text-shadow: 0 0 8px rgba(78, 200, 255, 0.6);
}

.sensor-fold {
  top: 14px;
  left: 8px;
}

.map-fold {
  top: 8px;
  left: 8px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 0 12px 12px 12px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: rgba(74, 144, 255, 0.08);
  border-radius: 4px;
  transition: all 0.25s ease;
}

.overview-item:hover {
  background: rgba(74, 144, 255, 0.15);
}

.overview-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.overview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.overview-value {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
}

.overview-unit {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 2px;
}

@media (max-width: 1400px) {
  .sensor-gauges-panel {
    width: 290px;
    right: 15px;
  }

  .gauges-scroll-container.scrollable {
    max-height: 350px;
  }
}

@media (max-width: 1200px) {
  .sensor-gauges-panel {
    top: auto;
    bottom: 15px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: auto;
    max-width: 600px;
    max-height: 280px;
  }

  .gauges-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }

  .gauges-scroll-container.scrollable {
    max-height: 200px;
  }
}

@media (max-width: 768px) {
  .sensor-gauges-panel {
    bottom: 10px;
    left: 10px;
    right: 10px;
    transform: none;
    width: auto;
    max-height: 240px;
    padding: 12px;
  }

  .gauges-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .gauges-header {
    margin-bottom: 10px;
  }

  .filter-btn {
    padding: 2px 4px;
    font-size: 11px;
  }
}

.path-edit-mini-bar {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid #f59e0b;
  border-radius: 25px;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 2000;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateX(-50%) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.mini-info {
  font-size: 14px;
  color: #e2e8f0;
  white-space: nowrap;
}

.mini-info strong {
  color: #f59e0b;
  font-size: 18px;
  margin: 0 4px;
}

.ready-text {
  color: #10b981;
  font-weight: 500;
}

.wait-text {
  color: #94a3b8;
  font-size: 13px;
}

.mini-actions {
  display: flex;
  gap: 6px;
  margin-left: 10px;
  padding-left: 16px;
  border-left: 1px solid rgba(148, 163, 184, 0.3);
}

.mini-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.6);
  color: #e2e8f0;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.mini-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background: rgba(51, 65, 85, 0.8);
}

.mini-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.confirm-btn {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
  color: #10b981;
  width: auto;
  padding: 0 12px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 13px;
}

.confirm-btn:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.3);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.cancel-btn {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

.cancel-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

.loop-btn {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: #3b82f6;
}

.loop-btn.active {
  background: rgba(59, 130, 246, 0.4);
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.loop-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background: rgba(59, 130, 246, 0.25);
}

.closed-badge {
  color: #3b82f6;
  font-weight: 600;
  margin-left: 8px;
}

.close-path-hint {
  position: fixed;
  pointer-events: none;
  padding: 8px 16px;
  background: rgba(59, 130, 246, 0.95);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
  z-index: 2001;
  animation: hintPulse 1s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1); 
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.05); 
  }
}

.agv-hint {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  cursor: pointer;
  animation: fadeInUp 0.3s ease-out;
}

.agv-hint-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.9);
  border: 2px solid #4ec8ff;
  border-radius: 12px;
  color: #4ec8ff;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(78, 200, 255, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.agv-hint-content:hover {
  background: rgba(78, 200, 255, 0.15);
  border-color: #6fd8ff;
  box-shadow: 0 6px 30px rgba(78, 200, 255, 0.5);
  transform: translateY(-2px);
}

.agv-hint-content svg {
  flex-shrink: 0;
}

.agv-hint-content small {
  opacity: 0.7;
  font-size: 12px;
  margin-left: 5px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.agv-hint-content.first-person-active {
  border-color: #10b981;
  color: #10b981;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
}

.agv-hint-content.first-person-active:hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: #34d399;
  box-shadow: 0 6px 30px rgba(16, 185, 129, 0.5);
}

/* 测试：温度计组件定位 */
.test-thermometer {
  position: fixed;
  right: 365px;  /* 在传感器面板左边（加宽以显示刻度）*/
  top: 280px;
  width: 84px;   /* 再加宽：78+6=84px，确保刻度可见 */
  z-index: 95;
}

/* 测试：湿度计组件定位 */
.test-humidity-gauge {
  position: fixed;
  right: 500px;  /* 在温度计右边一点 */
  top: 240px;
  width: 165px;  /* 调整宽度适应新布局 */
  z-index: 95;
}

</style>

<style>
.realtime-mini-chart {
  margin-bottom: 10px;
}

.realtime-mini-chart:last-child {
  margin-bottom: 0;
}

.realtime-mini-chart::before {
  content: '';
  position: absolute;
  top: 0;
  left: 15px;
  right: 15px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--sensor-color, #3b82f6), transparent);
  z-index: 2;
  opacity: 0.8;
  border-radius: 0 0 2px 2px;
}

.realtime-mini-chart::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-top: 1px solid var(--sensor-color, #3b82f6);
  border-right: 1px solid var(--sensor-color, #3b82f6);
  z-index: 2;
  opacity: 0.5;
}

.realtime-mini-chart:hover {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.5) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 16px rgba(59, 130, 246, 0.12), 0 0 0 1px rgba(59, 130, 246, 0.12) inset !important;
}

.realtime-mini-chart:hover::before {
  opacity: 1;
}

.realtime-mini-chart:hover::after {
  opacity: 0.8;
}
</style>