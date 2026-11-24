# youka.github.io

Youka 的个人手记，记录开发者社区分析项目 Community、回归实证研究、音乐与羽毛球。首页沿用山湖摄影、暖纸色和衬线标题，静态文件由 GitHub Pages 提供。

## 本地开发与构建

```sh
npm ci
npm run build
npm run dev
```

- `index.html`：语义化页面结构、项目叙事与个人兴趣切面。
- `styles.css` 定义全站排版、导航、山湖首图及响应式布局。
- `src/main.js` 管理项目和手记中的图解、参数和键盘交互。项目页和手记的专属样式位于 `project.css` 与 `interests.css`。
- `src/pointer.js` 与 `pointer.css` 提供照片取景与链接悬停反馈。原生锚点负责页面内导航。能完整放下图文的宽屏按滚动位置切换三种方法，点击标签也能直接定位。
- `src/journal.js` 控制首次开场、滚动视差、手记照片的分段滑动、悬停预览与共用指示线。手记里的研究笔记、唱片和羽毛球照片为生成的情境配图。
- `script.js`、`script.css`、`script.js.LEGAL.txt`：提交至仓库根目录供 GitHub Pages 直接加载的构建产物。
- `scripts/build.mjs`：通过 esbuild 打包并为静态资源写入内容哈希版本号。

修改样式或交互源码后运行 `npm run build`，以刷新根目录的静态产物和资源哈希。

## 交互模块与对应工程依据

代表项目 **Community（华为与昇腾开发者社区数据分析平台）** 的三幕交互演示均对照 [youka150/community](https://github.com/youka150/community) 源码设计：

| 交互场景 | 演示机制 | 对应仓库源码 |
| --- | --- | --- |
| 01 关系网络 | 有向加权图、Louvain 社群着色、网络拓扑与内容质量权重实时重排 | `python/huawei_mining_service/services/network_service.py`、`scoring.py` |
| 02 融合画像 | 对比纯活跃频次视图与 384 维多语言句向量经 PCA + KMeans 融合后的群体分离 | `python/huawei_mining_service/services/clustering_service.py`、`bertopic_service.py` |
| 03 趋势 Agent | 维度拆解 → 多源检索 → Reflection 证据自检补搜 → SSE 流式输出 | `src/lib/agents/TrendAgent.js`、`hotspot_service.py` |

图中使用示例数据。项目的文字、图解、源码入口随所选方法一起切换。琴弦动画只在可见时运行，系统的减少动态效果偏好会同步生效。禁用 JavaScript 后，仍可阅读三个项目章节与三则手记。

## 自动化验证

```sh
npm run check
npm run build
# 启动预览服务后运行 Playwright 交互与多视口测试
node scripts/interaction-check.mjs
node scripts/visual-check.mjs
node scripts/motion-check.mjs
```

字体许可（Cormorant Garamond、DM Sans、Manrope，SIL Open Font License）位于 `assets/licenses/`。
