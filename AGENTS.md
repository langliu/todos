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

## 项目结构

```
src/
├── components/       # React 组件
│   └── ui/         # shadcn/ui 基础 UI 组件
├── data/            # 数据工具和服务器函数
├── lib/             # 工具库和配置
│   ├── auth.ts      # 认证配置
│   └── supabase.ts # Supabase 客户端和类型
├── routes/          # TanStack Router 基于文件的路由
│   ├── __root.tsx   # 根布局
│   ├── index.tsx    # 主页
│   └── auth/        # 认证路由
├── router.tsx       # 路由器配置
├── routeTree.gen.ts # 自动生成 - 请勿编辑
└── styles.css       # 全局样式
```

## 导入顺序

```typescript
import fs from 'node:fs' // 1. Node 内置模块
import { useState } from 'react' // 2. React
import { createFileRoute } from '@tanstack/react-router' // 3. TanStack
import { someLib } from 'third-party' // 4. 第三方库
import { getData } from '@/data/utils' // 5. 路径别名 (@/)
import Header from '../components/Header' // 6. 相对导入
import './styles.css' // 7. CSS (最后)
```

**路径别名**: 使用 `@/` 进行 src 相对导入: `import { x } from '@/data/file'`

## TypeScript 指南

- 严格模式已启用 - 无隐式 any、未使用的局部变量/参数
- 函数参数需要显式类型
- 明显的类型使用类型推断
- 使用 `export type` 导出类型

## React 组件

```typescript
import { Link } from '@tanstack/react-router'
import './Header.css'

export default function Header() {  // 函数声明，不是箭头函数
  return <header className="header">{/* ... */}</header>
}
```

## TanStack Router 路由

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/path')({
  component: RouteComponent,
  loader: async () => await fetchData(),  // 可选
  ssr: 'data-only',                        // 可选: 'data-only' | false
})

function RouteComponent() {
  const data = Route.useLoaderData()
  return <div>{/* ... */}</div>
}
```

## 服务器函数

```typescript
import { createServerFn } from '@tanstack/react-start'

const getData = createServerFn({ method: 'GET' }).handler(async () => await fetchFromDB())

const createItem = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateItemInput) => data)
  .handler(async ({ data }) => result)
```

## API 路由

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/endpoint')({
  server: {
    handlers: {
      GET: () => json({ data: 'value' }),
    },
  },
})
```

## TanStack Query 使用

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// 查询数据
const { data: todos = [] } = useQuery({
  queryKey: ['todos'],
  queryFn: getTodos,
  initialData: initialTodos,
})

// 变更数据（创建、更新、删除）
const createMutation = useMutation({
  mutationFn: createTodo,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

## shadcn/ui 组件使用

### Dialog 对话框

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// 避免按钮嵌套：使用 render 属性
<Dialog>
  <DialogTrigger
    render={
      <Button>打开对话框</Button>
    }
  />
  <DialogContent>
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
    </DialogHeader>
    {/* 内容 */}
  </DialogContent>
</Dialog>
```

### Popover 弹出框

```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// 避免按钮嵌套：使用 render 属性
<Popover>
  <PopoverTrigger
    render={
      <Button variant="outline">打开弹出框</Button>
    }
  />
  <PopoverContent>
    {/* 内容 */}
  </PopoverContent>
</Popover>
```

### Calendar 日历

```typescript
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  initialFocus
  className="rounded-2xl"
/>
```

## 命名约定

| 类型                | 约定          | 示例                      |
| ------------------- | ------------- | ------------------------- |
| 组件 (Components)   | PascalCase    | `Header`, `TodoList`       |
| 函数/变量           | camelCase     | `getTodos`, `isLoading`   |
| CSS 类名           | kebab-case    | `nav-item`, `App-header`   |
| 组件文件           | PascalCase.tsx| `Header.tsx`, `TodoItem.tsx` |
| 路由文件           | kebab-case.tsx| `start.server-funcs.tsx` |
| 数据/工具文件       | kebab-case.ts | `demo.punk-songs.ts`      |

## CSS 样式

- 纯 CSS 文件，与组件协同放置
- 导入: `import './Header.css'`
- 使用 rem 单位，语义化类名

```css
.header {
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
}
```

## 错误处理

```typescript
// 为异步操作提供回退
async function readData() {
  return JSON.parse(await fs.promises.readFile(FILE, 'utf-8').catch(() => '[]'))
}
```

## 自动生成的文件

**请勿编辑**: `src/routeTree.gen.ts` - 由 TanStack Router 自动生成

## 测试

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />)
    expect(screen.getByText('text')).toBeInTheDocument()
  })
})
```

文件命名: `*.test.tsx` 或 `*.spec.tsx`

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

## 数据类型定义

在 `lib/supabase.ts` 中定义主要类型，并在 `data/` 目录的服务器函数中定义输入/输出类型：

```typescript
// lib/supabase.ts
export type Todo = {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  important: boolean
  due_date: string | null
  created_at: string
  updated_at: string
}

// data/todos.server.ts
export type CreateTodoInput = {
  title: string
  description?: string
  due_date?: string
  important?: boolean
}

export type UpdateTodoInput = {
  title?: string
  description?: string
  completed?: boolean
  important?: boolean
  due_date?: string
}
```

## Supabase 集成

### 客户端使用

```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

### 服务器函数认证

```typescript
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/auth'

export const getTodos = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    // 使用认证后的 supabase 客户端
  })
```
