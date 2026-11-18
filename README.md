# youka.github.io

Youka 的个人主页——围绕 AI 应用、开发者社区数据挖掘（[Community](https://github.com/youka150/community)）与回归实证分析构建的交互式个人空间。采用清透暖瓷与深海墨青视觉体系，结合原生 HTML5 Canvas 物理交互、GSAP / ScrollTrigger 与 Lenis 平滑滚动，直接发布于 GitHub Pages，无外部运行时 CDN 依赖。

## 本地开发与构建

```sh
npm ci
npm run build
npm run dev
```

- `index.html`：语义化页面结构、项目叙事与个人兴趣切面。
- `styles.css`：设计令牌、响应式布局、毛玻璃导航与无障碍样式。
- `src/main.js`：六组交互引擎（Hero 信号涟漪画布、有向加权影响力网络、PCA + KMeans 行为×语义融合投影、多步反思趋势 Agent 推演、辛普森悖论分层回归、谐波弦线与羽毛球场轨迹模拟）。
- `script.js`、`script.css`、`script.js.LEGAL.txt`：提交至仓库根目录供 GitHub Pages 直接加载的构建产物。
- `scripts/build.mjs`：通过 esbuild 打包并为静态资源写入内容哈希版本号。

> 修改 `src/main.js` 后请运行 `npm run build` 更新根目录 `script.js` 及 `index.html` 中的资源哈希。

## 交互模块与对应工程依据

代表项目 **Community（华为与昇腾开发者社区数据分析平台）** 的三幕交互演示均对照 [youka150/community](https://github.com/youka150/community) 源码设计：

| 交互场景 | 演示机制 | 对应仓库源码 |
| --- | --- | --- |
| 01 关系网络 | 有向加权图、Louvain 社群着色、网络拓扑与内容质量权重实时重排 | `python/huawei_mining_service/services/network_service.py`、`scoring.py` |
| 02 融合画像 | 对比纯活跃频次视图与 384 维多语言句向量经 PCA + KMeans 融合后的群体分离 | `python/huawei_mining_service/services/clustering_service.py`、`bertopic_service.py` |
| 03 趋势 Agent | 维度拆解 → 多源检索 → Reflection 证据自检补搜 → SSE 流式输出 | `src/lib/agents/TrendAgent.js`、`hotspot_service.py` |

页面中的所有 Canvas 图形均为算法与概念交互示意，不连接后端数据库，也不展示虚构的实时业务数字。所有持续动画均通过 `IntersectionObserver`、`visibilitychange` 与 `prefers-reduced-motion` 按需启停；禁用 JavaScript 时全部正文仍可正常阅读。

## 自动化验证

```sh
npm run check
npm run build
# 启动预览服务后运行 Playwright 交互与多视口测试
node scripts/interaction-check.mjs
node scripts/visual-check.mjs
```

字体许可（Cormorant Garamond、DM Sans、Manrope，SIL Open Font License）位于 `assets/licenses/`。
