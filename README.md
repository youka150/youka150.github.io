# youka — a personal field guide

以“追问为什么”连接 AI、数据分析与屏幕之外的个人兴趣。暖白纸张、深林绿、衬线大字与线性图解；静态文件直接兼容现有 GitHub Pages，没有增加数据库、服务端或运行时 CDN 依赖。

## 开发

```sh
npm ci
npm run build
npm run dev
```

打开终端给出的地址。HTML/CSS 会热更新；修改 `src/main.js` 后需重新 `npm run build`，因为首页加载的是与 GitHub Pages 共用的构建产物。

- `index.html`：完整页面内容、SVG 方法图与个人兴趣叙事。
- `styles.css`：本地字体、排版、响应式和减少动态效果模式。
- `src/main.js`：GSAP / ScrollTrigger、Lenis、项目滚动叙事、个人章节共享元素转场与交互。
- `script.js`、`script.css`、`script.js.LEGAL.txt`：必须一起提交的静态构建产物。
- `scripts/build.mjs`：打包并为 CSS/JS 添加内容版本号。

## 设计与交互

InsightAI 从点击封面进入弹窗改为直接可读的三幕叙事：关系 → 画像 → 洞察。宽屏右侧图解保持在视野中，随左侧章节滚动切换；也可用鼠标或键盘直接选择。手机自然纵向阅读，用标签切换图解，不强制横向滚动。配比滑杆只改变方法图，不调用后端或计算真实用户排名。

原有 Orbit / Soft Form / Field 实验全部移除。新的个人坐标以数据研究、音乐和羽毛球三种兴趣编排：可切换观察背景、调整纯视觉声波节奏、重播球场轨迹。支持 View Transitions 时使用局部共享图形过渡，否则使用渐显。

首次访问的短遮罩是开场设计，不代表加载进度；照片视差、文字显现与图解过渡随系统减少动态效果偏好关闭。音乐没有音频，持续动画仅在对应图形可见、页面在前台时运行。关闭 JavaScript 后项目与三种兴趣的正文仍可阅读。

## 内容依据与展示边界

昵称 youka，以及 AI、数据分析、回归实证研究、追问深层动机、音乐与羽毛球兴趣，沿用上一版已记录的用户资料。没有编造院校、职业、论文、比赛、具体歌曲或成果数字。山湖照片仍是 Unsplash 氛围素材，不是用户个人摄影。

InsightAI 项目能力于 2026-11-05 对照 [community 源码](https://github.com/youka150/community) 核实：

| 主页叙事                                                   | 对应实现                                                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 有向加权网络、PageRank、八维评分、熵权/自定义权重、Louvain | `python/huawei_mining_service/services/network_service.py`；`src/components/huawei-dashboard/AIAnalysisTab.jsx` |
| 行为与可选语义特征融合、PCA、KMeans，语义不可用时回退      | `python/huawei_mining_service/services/clustering_service.py`                                                   |
| 核心群体的语义聚类、产品机会、潜力用户识别                 | `python/huawei_mining_service/services/hotspot_service.py`                                                      |
| 规划、检索、反思补搜、流式报告                             | `src/lib/agents/TrendAgent.js`；`src/app/api/trend-analysis/route.js`                                           |
| 华为/昇腾双社区                                            | `python/huawei_mining_service/app.py` 与两套前端接口                                                            |

所有抽象图解均为方法示意，不是实际系统截图或实时社区数据。没有展示伪造热门话题、人物排名、收益、准确率或运行规模；无需访问本地 PostgreSQL。`localhost:3000` 的真实截图未来可以作为额外素材补充。

摄影来源：[Unsplash 山湖](https://images.unsplash.com/photo-1470770841072-f978cf4d019e)。原有森林素材保留但当前未展示。字体为 Cormorant Garamond、DM Sans、Manrope，遵循 SIL Open Font License，见 `assets/licenses/`。

## 验证

```sh
npm run check
npm run build
# 另一个终端运行 npm run dev；需要系统 Chromium
node scripts/interaction-check.mjs
node scripts/visual-check.mjs
```

浏览器检查支持 `PREVIEW_URL` 与 `CHROMIUM_PATH`。覆盖项目滚动与标签选择、键盘切换、配比、Agent 重播、研究视角、视觉节奏、球场轨迹、手机导航、运行时切换减少动态效果、320–1440px 布局、无 JS 正文、图片加载与运行时错误。截图保存在忽略的 `.test-results/`。

## GitHub Pages

沿用 `main` 分支根目录发布到 [youka150.github.io](https://youka150.github.io/)。构建后提交源码与根目录产物；`.nojekyll` 保持静态资源直接可用。本次未迁移到 Sites 托管。
