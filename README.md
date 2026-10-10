# youka — a personal space

自然人文风个人主页：暖白纸张、苔绿、风景摄影与衬线排版。以静态文件直接兼容 GitHub Pages，无服务端、无运行时 CDN 依赖。

## 本地开发

```sh
npm ci
npm run build
npm run dev
```

打开终端打印的本地地址。修改 `src/main.js` 后重新运行 `npm run build`；HTML/CSS 修改会自动刷新。

- `index.html`：个人信息、项目与页面结构。
- `styles.css`：响应式布局与视觉系统。
- `src/main.js`：GSAP / ScrollTrigger、Lenis、共享元素转场、移动菜单与交互实验。
- `script.js`、`script.css`、`script.js.LEGAL.txt`：构建产物，需要和页面一起提交。
- `assets/`：本地图片、WOFF2 字体与字体许可。

## 动效与降级

首次访问显示短暂遮罩开场（每个会话一次，不代表网络加载进度）；照片视差、文字显现、滚动驱动横向展台和照片交叠。桌面宽屏启用固定展台，手机、较矮窗口及减少动态效果模式使用原生横向滑动。支持 View Transitions 的浏览器使用共享海报转场，其余浏览器直接展开原生 dialog。

实验详情有可操作的滑杆、重置、Escape 关闭及焦点返回。减少动态效果偏好关闭入场、平滑滚动和滚动动画。无 JavaScript 时页面正文仍可阅读。

## 资料状态

已使用用户提供的昵称 youka，以及 AI、羽毛球、音乐、数据分析、回归实证研究、探索深层动机等兴趣与方向。

Community 对应用户的本科毕业设计 **InsightAI 2026：社区用户建模与创意洞察智能分析系统**。项目名称、双社区支持、功能、技术栈与方法依据用户上传的《毕业设计系统介绍文档》整理。主页提供可展开的完整项目故事、方法折叠面板与架构流程；展示界面是依据文档重绘的示意，不是实际截图，也不包含真实运行数据。文档中的未来上线计划和预期收益没有作为已完成成果展示。当前联系入口为此仓库拥有者的 GitHub，未虚构邮箱。

摄影为 Unsplash 氛围素材，不是用户个人拍摄：

- 山湖：`https://images.unsplash.com/photo-1470770841072-f978cf4d019e`
- 森林：`https://images.unsplash.com/photo-1441974231531-c6227db76b6e`

字体：Cormorant Garamond、DM Sans、Manrope，遵循 SIL Open Font License；许可证见 `assets/licenses/`。

## 验证

```sh
npm run check
npm run build
# 先启动本地开发服务器；需要系统已安装 Chromium
node scripts/interaction-check.mjs
```

测试接受 `CHROMIUM_PATH` 和 `PREVIEW_URL` 环境变量，覆盖桌面锚点、详情转场、滑杆/重置、关闭后的焦点恢复、手机菜单、三个实验、减少动态效果、320–1440px 布局与无 JavaScript 页面。

## GitHub Pages

仓库根目录即网站，GitHub Pages 从 `main` 分支根目录发布到 https://youka150.github.io/。提交前运行 `npm run build` 保持构建产物同步；构建会更新样式和脚本的内容版本标识，避免旧资源缓存。`.nojekyll` 让 Pages 直接提供静态文件。
