# AGENTS.md - AI 编码规范

> AI 助手在此 TanStack Start 应用程序中工作的指南。

## 沟通语言

**重要**: 所有 AI 助手必须使用中文进行所有沟通、回复和解释。这包括：

- 与用户的所有消息
- 代码解释和注释
- 文档和描述
- 错误消息和调试信息

只有技术术语（例如 React、TypeScript、TanStack）应保持英文。

## 技术栈

- **运行时**: Bun | **框架**: TanStack Start + Router | **UI**: React 19
- **语言**: TypeScript (严格模式) | **构建**: Vite 7 | **测试**: Vitest | **样式**: CSS + Tailwind
- **数据库**: Supabase (包括认证)
- **状态管理**: TanStack Query | **组件库**: shadcn/ui (基于 Base UI)
- **图标**: Lucide React | **日期处理**: date-fns

## 命令

```bash
bun install                              # 安装依赖
bun --bun run dev                        # 开发服务器 (端口 3000)
bun --bun run build                      # 生产构建
bun --bun run test                       # 运行所有测试
bun --bun run test src/path/file.test.tsx  # 运行单个测试
bun --bun run test -t "pattern"          # 按名称运行测试
bun --bun vitest                         # 监视模式
bun tsc --noEmit                         # 类型检查
```

## 自动生成的文件

**请勿编辑**: `src/routeTree.gen.ts` - 由 TanStack Router 自动生成

## Git Commit 规范

使用 Conventional Commits 规范，提交消息格式如下：

```text
<类型>(<范围>): <描述>

[可选的正文]

[可选的脚注]
```

### 类型（Type）

| 类型       | 描述                       | 示例                                |
| ---------- | -------------------------- | ----------------------------------- |
| `feat`     | 新功能                     | feat: 添加设置页面和修改密码功能    |
| `fix`      | 修复 Bug                   | fix: 修复退出登录后无法重定向的问题 |
| `docs`     | 文档变更                   | docs: 更新 README 使用说明          |
| `style`    | 代码格式调整（不影响逻辑） | style: 统一代码缩进格式             |
| `refactor` | 重构代码                   | refactor: 重构认证中间件逻辑        |
| `perf`     | 性能优化                   | perf: 优化组件渲染性能              |
| `test`     | 测试相关                   | test: 添加用户认证测试用例          |
| `chore`    | 构建/工具链相关            | chore: 更新依赖包版本               |

### 范围（Scope）

可选的，用于指定 commit 影响的范围：

- `auth`: 认证相关
- `ui`: UI 组件
- `api`: API 接口
- `db`: 数据库
- `router`: 路由
- `server`: 服务器函数
- `style`: 样式

### 示例

```bash
feat(auth): 添加设置页面和修改密码功能

- 创建 /settings 路由
- 添加修改密码服务器函数
- 在侧边栏添加设置按钮

fix(auth): 修复退出登录后无法重定向的问题

- 使用 useMutation 包装 signOut
- 成功后清除缓存并跳转到登录页

docs: 更新项目 README

- 添加环境变量配置说明
- 更新部署指南

style: 统一代码格式

- 使用 Prettier 格式化所有文件
```

## 组件最佳实践

### 避免按钮嵌套

在使用 DialogTrigger 或 PopoverTrigger 时，必须使用 `render` 属性而不是嵌套子元素，以避免 HTML 规范违规：

```typescript
// ❌ 错误：会导致按钮嵌套
<DialogTrigger>
  <Button>打开</Button>
</DialogTrigger>

// ✅ 正确：使用 render 属性
<DialogTrigger
  render={<Button>打开</Button>}
/>
```

### 组件状态管理

对于需要编辑功能的组件，使用受控模式：

```typescript
const [editingItem, setEditingItem] = useState<Todo | null>(null)

const handleEdit = (item: Todo) => {
  setEditingItem(item)
}

const handleUpdate = (id: string, data: UpdateTodoInput) => {
  updateMutation.mutate({ data: { id, data } })
  setEditingItem(null)
}
```

## Git 提交策略

**重要**: AI 助手必须遵守以下 Git 提交规则：

- 🚫 **禁止自动提交**: 除非用户明确要求（如用户说"请提交"、"git commit"、"生成commit信息"等），AI 助手不得主动执行任何 git commit 操作
- ✅ **允许的操作**: AI 可以执行 `git status`、`git diff`、`git log` 等只读命令来分析代码状态
- ✅ **响应提交请求**: 当用户明确要求提交时，AI 必须按照上述 Conventional Commits 规范生成规范的提交信息
- ⚠️ **谨慎推送**: `git push` 操作需要用户明确授权，AI 不得自行决定推送

### 提交流程

1. **用户要求提交**: AI 按规范生成提交信息并执行 `git commit`
2. **用户未要求**: AI 完成代码任务后，停止工作，不执行任何提交操作
3. **检查代码质量**: 提交前建议运行类型检查和测试（如果可用）

## 格式化

- 在每次代码变更后执行 `bun fmt` 进行代码格式化
