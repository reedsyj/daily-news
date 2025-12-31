**概览**
- HMATC Insider Daily 是面向智能座舱、自动驾驶与 AI 资讯的智能聚合与互动平台，提供高价值内容筛选、收藏与评论互动。
- 数据来源由 Gemini 2.5 Flash 联网检索后生成摘要与价值分析，并按评分与发布时间排序展示。
- 前端以暗色风格、响应式布局呈现，支持桌面与移动端。

**适用对象**
- 需要快速获取智能汽车与 AI 领域高价值资讯的研发、产品、算法、市场等岗位。
- 需要在组织内进行轻量互动、收藏和消息提醒的用户。

**运行与访问**
- 本地运行需设置 `API_KEY` 到 `.env.local` 后启动开发服务器。
- 访问地址 `http://localhost:5173`，首次进入可匿名浏览资讯，登录后可收藏与评论。
- 参考项目根 `README.md` 的“快速开始”和“构建生产版本”步骤。

**首屏与导航**
- 顶部导航栏显示项目名、最近更新时间、刷新按钮、视图切换与用户区。
- 未登录时显示 `Login` 按钮；登录后显示头像、用户名、通知铃铛与登出按钮。
- 视图切换：`动态流` 与 `我的收藏` 两个视图可在导航处切换。
- 代码参考：`hmatc-insider-daily-带收藏/components/Navbar.tsx:52-66`、`hmatc-insider-daily-带收藏/components/Navbar.tsx:77-95`。

**登录与注册**
- 点击导航右侧 `Login` 打开认证弹窗。
- 登录模式：输入“用户名或工号”与“密码”；注册模式：输入“工号 + 用户名 + 密码”。
- 注册成功自动登录；登录错误会在弹窗内提示。
- 代码参考：`hmatc-insider-daily-带收藏/components/AuthModal.tsx:69-82`、`hmatc-insider-daily-带收藏/components/AuthModal.tsx:108-175`、`hmatc-insider-daily-带收藏/services/mockBackend.ts:20-68`。

**浏览资讯**
- 主页以网格卡片展示资讯，包含：类别、发布时间、来源、中文标题、摘要、价值分析与星级评分。
- 点击卡片右下角“评论”展开评论区；点击“Read Source”在新窗口打开原文链接。
- 顶部筛选标签支持按类别查看：`All Feeds`、`Smart Cabin`、`Autonomous Driving`、`AI News`。
- 代码参考：`hmatc-insider-daily-带收藏/App.tsx:141-157`、`hmatc-insider-daily-带收藏/components/NewsCard.tsx:132-169`。

**刷新与排序**
- 点击导航刷新按钮拉取最新数据，拉取期间按钮旋转指示。
- 排序规则：先按评分降序，其次按发布时间降序。
- 最近更新时间显示在导航栏。
- 代码参考：`hmatc-insider-daily-带收藏/App.tsx:33-64`、`hmatc-insider-daily-带收藏/components/Navbar.tsx:64-75`。

**收藏夹**
- 在新闻卡片右下角点击书签图标收藏或取消收藏；收藏后图标高亮。
- 导航处切换到 `我的收藏` 查看仅属于当前用户的收藏列表。
- 清除浏览器缓存会清空收藏数据（本地存储）。
- 代码参考：`hmatc-insider-daily-带收藏/components/NewsCard.tsx:181-189`、`hmatc-insider-daily-带收藏/services/mockBackend.ts:197-234`、`hmatc-insider-daily-带收藏/App.tsx:94-106`。

**评论互动**
- 展开评论区后可查看所有评论、发布新评论与回复他人。
- 支持 `@用户名` 或 `@工号` 提及，被提及用户会收到通知；回复父评论也会通知对方。
- 仅作者本人可删除自己的评论，删除需确认。
- 未登录时点击“登录 / 注册”进入认证流程。
- 代码参考：`hmatc-insider-daily-带收藏/components/Comments.tsx:84-107`、`hmatc-insider-daily-带收藏/services/mockBackend.ts:129-180`、`hmatc-insider-daily-带收藏/components/Comments.tsx:133-142`。

**通知中心**
- 登录用户右上角显示铃铛，收到新通知时出现红色未读提示。
- 点击铃铛展开下拉列表，显示“被提及”与“被回复”的通知；点击条目可标记为已读。
- 系统每 10 秒自动轮询通知以模拟实时推送。
- 代码参考：`hmatc-insider-daily-带收藏/components/Navbar.tsx:30-45`、`hmatc-insider-daily-带收藏/components/Navbar.tsx:97-143`。

**时间显示规则**
- 当天：显示“X 分钟前”或“X 小时前”；昨天：显示“昨天”；更早：显示“MM-DD”。
- 对于源数据为当天的字符串，会合成一个“今天内的随机时间”以体现近期性。
- 代码参考：`hmatc-insider-daily-带收藏/components/NewsCard.tsx:77-130`、`hmatc-insider-daily-带收藏/services/geminiService.ts:124-148`。

**AI 聚合与类别**
- 系统为三类资讯生成标题、摘要、价值分析与评分：`COCKPIT`、`DRIVING`、`AI`。
- 每类最多展示 15 条近 7 天内的资讯，优先 GitHub Trending、36Kr、CNET、Engadget 等来源。
- 代码参考：`hmatc-insider-daily-带收藏/services/geminiService.ts:8-20`、`hmatc-insider-daily-带收藏/services/geminiService.ts:22-81`、`hmatc-insider-daily-带收藏/services/geminiService.ts:124-168`。

**空状态与引导**
- 收藏视图无内容时提供“Browse Feed”返回动态流。
- 动态流为空时提供“Refresh Data”引导刷新。
- 代码参考：`hmatc-insider-daily-带收藏/App.tsx:187-213`。

**隐私与数据**
- 用户、评论、通知与收藏均存储于浏览器 `LocalStorage`，仅本机可见。
- 清除浏览器数据会丢失上述信息；生产环境建议接入后端与数据库。
- 代码参考：`d:/hmatc-news-gemini/README.md:174-183`、`hmatc-insider-daily-带收藏/services/mockBackend.ts:3-9`。

**常见问题**
- 无法收藏或评论：请先登录；登录后导航将显示头像与通知。
- 没有任何资讯：点击导航刷新或检查本地网络。
- 通知不更新：等待轮询或点击铃铛查看，并尝试刷新。
- 数据丢失：确认是否清除了浏览器缓存或更换了设备。

**浏览器与设备兼容**
- 建议使用最新版本的 Chrome 或 Edge；Firefox 88+、Safari 14+。
- 移动端界面采用响应式设计，支持手势滚动与触控操作。

**快捷操作建议**
- 在评论区输入 `@用户名` 或 `@工号` 触发提及提醒。
- 使用顶部标签快速过滤类别；使用导航切换到收藏视图。
- 觉得内容有价值时优先收藏，后续可从“我的收藏”快速回看。

**版本信息**
- 前端：React + TypeScript + Vite；图标系统：Lucide。
- AI：Gemini 2.5 Flash（带 Google Search 工具），仅用于学习演示。

