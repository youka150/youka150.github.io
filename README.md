# youka.github.io

Youka 的个人手记，记录开发者社区分析项目 Community、回归实证研究、音乐与羽毛球。首页沿用山湖摄影、暖纸色和衬线标题，静态文件由 GitHub Pages 提供。

## 本地开发与构建

```sh
npm ci
npm run build
npm run dev
```

- `index.html`：语义化页面结构、项目叙事与个人兴趣切面。
- `styles.css` 定义全站排版、导航、全屏山湖封面、个人简介与响应式布局。
- `src/main.js` 管理项目和手记中的图解、参数和键盘交互。项目页和手记的专属样式位于 `project.css` 与 `interests.css`。
- `src/pointer.js` 与 `pointer.css` 提供照片取景、触点水纹与链接悬停反馈。能完整放下图文的宽屏按滚动位置切换三种方法。较窄或较矮的屏幕按顺序显示三幕，目录链接可直接跳到对应图文。
- `src/journal.js` 控制山湖封面的滚动推近、水纹转场、手记照片的视差和配乐选曲。三则手记可自然滚动阅读，也可在图形内横扫查看相邻图解。在球场内从发球点向右短划可发球。
- `src/field-network.js` 参考历史提交 `5255bcb` 的首页网络绘制简介旁的点线图。移动指针可牵引节点，点击、轻触或用键盘激活「泛起涟漪」可触发水纹。
- `src/terrain.js` 绘制全站背景等高线。桌面指针会拨动等高线并留下逐渐消散的波纹。触屏与减少动态效果模式使用静态底图。
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

图中使用示例数据。每幕都有对应的文字、图解与源码入口。琴弦动画只在可见时运行，系统的减少动态效果偏好会同步生效。禁用 JavaScript 后，仍可阅读三个项目章节与三则手记。

## 手记配乐

两首曲目由 Kevin MacLeod (Incompetech) 创作，采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。站内文件为完整曲目，重新编码为 96 kbps MP3。播放器按需加载，访客点击播放后才会出声。

- [Meditation Impromptu 01](https://www.incompetech.com/music/royalty-free/index.html?isrc=USUAN1100163)
- [Windswept](https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100757)

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
