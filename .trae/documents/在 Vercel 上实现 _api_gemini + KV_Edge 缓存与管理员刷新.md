## 填写 ADMIN\_EMPLOYEE\_ID / ADMIN\_USERNAME 的位置

* 本地开发：在子项目目录 `hmatc-insider-daily-带收藏/.env.local` 中加入：

  * `ADMIN_EMPLOYEE_ID=你的管理员工号`

  * `ADMIN_USERNAME=你的管理员用户名`

* Vercel 部署：在你的 Vercel 项目里依次设置 → `Settings → Environment Variables`，新增同名变量：

  * `ADMIN_EMPLOYEE_ID`、`ADMIN_USERNAME`（建议分别在 `Production` 与 `Preview` 环境都设置）

  * 保存后重新部署，让变量生效于构建与服务端函数。

* 生效范围：

  * 前端：Vite 在构建时将上述变量注入 `process.env.ADMIN_*`（已保留注入），用于“刷新按钮门禁”。

  * 服务端：`/api/*` 函数的 `process.env.ADMIN_*` 用于管理员校验（刷新与写缓存）。

## 方案要点（简版）

* 读缓存：`GET /api/news?category=...` 面向所有用户，仅读取 KV/Edge Config，不触发模型。

* 管理员刷新：`POST /api/refresh`（或保留 `POST /api/gemini`），服务端校验 `ADMIN_*`，拉取模型后写入缓存。

* 缓存介质：内容用 `Vercel KV`，只读配置（如 TTL）可放 `Edge Config`；TTL 建议 12–24 小时。

* 前端调用：普通用户用 `GET /api/news`；管理员刷新后再拉取一次 `GET /api/news` 更新 UI。

## 下一步实施（待你确认后执行）

1. 在 Vercel 设置 `ADMIN_EMPLOYEE_ID`、`ADMIN_USERNAME`，并确认你希望的 TTL。
2. 新增 `/api/news`（读缓存）与 `/api/refresh`（管理员刷新写缓存）。
3. 接入 `@vercel/kv`（必要）与 `@vercel/edge-config`（可选）。
4. 调整前端调用与状态提示（读缓存 + 成功刷新后提示并重拉）。
5. 加入限流与审计日志，完善错误回退（读旧缓存）。

请确认：

* 变量是否已在 Vercel 设置；

* 缓存 TTL（如 12h/24h）；

* 刷新路由命名采用 `POST /api/refresh` 还是继续使用 `POST /api/gemini`。

