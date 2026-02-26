# Vercel 部署指南（TanStack Start + Convex）

## 目标

通过 Vercel 的 Git 自动部署，在每次推送代码时同时完成：

- 前端构建发布
- Convex 函数部署
- Preview 与 Production 环境隔离

## 前置条件

1. 已有可运行的 Convex 项目。
2. 已有 Vercel 账号并可访问仓库。
3. 项目根目录包含 `package.json`，并可执行 `bun run build`。

## 一、在 Convex 生成 Deploy Key

在 Convex Dashboard -> Project Settings 中生成两类 key：

1. `Production Deploy Key`
2. `Preview Deploy Key`

## 二、在 Vercel 导入项目

1. 打开 Vercel 新建项目并连接仓库。
2. 若项目不在仓库根目录，设置 `Root Directory`。
3. 在 Build & Development Settings 中配置：

- Install Command
  `bun install --frozen-lockfile`

- Build Command
  `npx convex deploy --cmd "bun run build" --cmd-url-env-var-name VITE_CONVEX_URL`

- Output Directory
  留空（SSR 项目无需填写）

## 三、配置环境变量（Vercel）

在 Vercel -> Project -> Settings -> Environment Variables 中添加：

1. `CONVEX_DEPLOY_KEY`（Environment: `Production`）
   - 值：Production Deploy Key
2. `CONVEX_DEPLOY_KEY`（Environment: `Preview`）
   - 值：Preview Deploy Key

不要在 Vercel 手动固定 `VITE_CONVEX_URL`。由 `convex deploy --cmd` 在构建时自动注入，避免 Preview/Production 混用。

## 四、可选：Preview 初始化数据

如果每个 Preview 需要自动初始化数据，可将 Build Command 改为：

`npx convex deploy --cmd "bun run build" --cmd-url-env-var-name VITE_CONVEX_URL --preview-run "<functionName>"`

其中 `<functionName>` 是你定义的 Convex 初始化函数名。

## 五、部署与验收

### 生产验收

1. 推送到生产分支（如 `main`）。
2. Vercel 构建日志应出现 `convex deploy` 成功信息。
3. 访问生产域名，验证登录/注册/Todo CRUD 功能正常。

### 预览验收

1. 创建 PR 触发 Preview Deployment。
2. Convex Dashboard 应出现对应分支的 preview deployment。
3. Preview 写入的数据不应影响生产数据。

## 六、常见问题排查

1. 构建时报缺少 key
   - 检查 `CONVEX_DEPLOY_KEY` 是否已配置且作用域正确。
2. Preview 连到了生产后端
   - 检查是否误配置固定 `VITE_CONVEX_URL`。
3. Convex 函数未更新
   - 确认 Build Command 使用的是 `npx convex deploy --cmd ...`，而不是仅 `bun run build`。

## 七、说明

当前项目本地开发可继续使用：

- `bun run convex:dev:local:init`
- `bun run convex:dev:local`

线上发布仍以 Vercel Build Command 的 `convex deploy` 为准。
