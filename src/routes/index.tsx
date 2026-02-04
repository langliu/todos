import { useState, useEffect, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TodoItem } from '@/components/TodoItem'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AddTodoDialog } from '@/components/AddTodoDialog'
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from '@/data/todos.server'
import { getCurrentUser, signOut } from '@/data/auth.server'
import type { Todo } from '@/lib/supabase'
import {
  Sun,
  Star,
  Calendar,
  Home,
  Search,
  CheckCircle2,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: TodosPage,
  loader: async () => {
    const [todos, user] = await Promise.all([getTodos(), getCurrentUser()])
    return { todos, user }
  },
})

function TodosPage() {
  const { todos: initialTodos, user } = Route.useLoaderData()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedList, setSelectedList] = useState('my-day')

  const { data: todos = initialTodos } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
    initialData: initialTodos,
  })

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const handleToggle = (id: string, completed: boolean) => {
    updateMutation.mutate({ data: { id, data: { completed } } })
  }

  const handleToggleImportant = (id: string, important: boolean) => {
    updateMutation.mutate({ data: { id, data: { important } } })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ data: { id } })
  }

  const filteredTodos = useMemo(() => {
    return todos.filter((todo: Todo) => {
      const matchesSearch = todo.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      switch (selectedList) {
        case 'my-day':
          return matchesSearch && !todo.completed
        case 'important':
          return matchesSearch && todo.important
        case 'planned':
          return matchesSearch && todo.due_date
        case 'tasks':
          return matchesSearch
        default:
          return matchesSearch
      }
    })
  }, [todos, searchQuery, selectedList])

  const myDayTodos = todos.filter((t: Todo) => !t.completed)
  const importantTodos = todos.filter((t: Todo) => t.important && !t.completed)
  const plannedTodos = todos.filter((t: Todo) => t.due_date && !t.completed)
  const allTodos = todos.filter((t: Todo) => !t.completed)

  const getListTitle = () => {
    switch (selectedList) {
      case 'my-day':
        return '我的一天'
      case 'important':
        return '重要'
      case 'planned':
        return '已计划日程'
      case 'tasks':
        return '任务'
      default:
        return '我的一天'
    }
  }

  const getListIcon = () => {
    switch (selectedList) {
      case 'my-day':
        return <Sun className="h-7 w-7" />
      case 'important':
        return <Star className="h-7 w-7" />
      case 'planned':
        return <Calendar className="h-7 w-7" />
      case 'tasks':
        return <Home className="h-7 w-7" />
      default:
        return <Sun className="h-7 w-7" />
    }
  }

  const getListGradient = () => {
    switch (selectedList) {
      case 'my-day':
        return 'from-orange-400 to-amber-400'
      case 'important':
        return 'from-red-500 to-pink-500'
      case 'planned':
        return 'from-blue-500 to-indigo-500'
      case 'tasks':
        return 'from-teal-500 to-emerald-500'
      default:
        return 'from-orange-400 to-amber-400'
    }
  }

  const getEmptyStateMessage = () => {
    switch (selectedList) {
      case 'my-day':
        return {
          title: '专注于你的一天',
          subtitle: '添加任务来开始你的一天',
        }
      case 'important':
        return {
          title: '没有重要任务',
          subtitle: '标记任务为重要以在此查看',
        }
      case 'planned':
        return {
          title: '没有计划的任务',
          subtitle: '为任务设置截止日期以在此查看',
        }
      case 'tasks':
        return {
          title: '开始你的任务清单',
          subtitle: '添加你的第一个任务',
        }
      default:
        return {
          title: '专注于你的一天',
          subtitle: '添加任务来开始你的一天',
        }
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-72 bg-sidebar border-r flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-elevation-2">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">
                To Do
              </h1>
              <p className="text-xs text-muted-foreground">高效任务管理</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem
            icon={<Sun className="h-5 w-5" />}
            label="我的一天"
            count={myDayTodos.length}
            active={selectedList === 'my-day'}
            onClick={() => setSelectedList('my-day')}
            gradient="from-orange-400 to-amber-400"
          />
          <SidebarItem
            icon={<Star className="h-5 w-5" />}
            label="重要"
            count={importantTodos.length}
            active={selectedList === 'important'}
            onClick={() => setSelectedList('important')}
            gradient="from-red-500 to-pink-500"
          />
          <SidebarItem
            icon={<Calendar className="h-5 w-5" />}
            label="已计划日程"
            count={plannedTodos.length}
            active={selectedList === 'planned'}
            onClick={() => setSelectedList('planned')}
            gradient="from-blue-500 to-indigo-500"
          />
          <SidebarItem
            icon={<Home className="h-5 w-5" />}
            label="任务"
            count={allTodos.length}
            active={selectedList === 'tasks'}
            onClick={() => setSelectedList('tasks')}
            gradient="from-teal-500 to-emerald-500"
          />
        </nav>

        {user && (
          <div className="p-4 border-t bg-muted/50">
            <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-sidebar/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm shadow-elevation-1">
                {user.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-20 border-b bg-card/80 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getListGradient()} flex items-center justify-center shadow-elevation-2`}>
              {getListIcon()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {getListTitle()}
              </h1>
              <ClientDate />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AddTodoDialog
              onAdd={(todo) => {
                createMutation.mutate({ data: todo })
              }}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="搜索任务..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-4 text-base rounded-2xl border-2 border-border bg-card shadow-elevation-1 focus:border-primary/30 focus:bg-background transition-all"
              />
            </div>

            <div className="bg-card rounded-3xl border border-border shadow-elevation-2 overflow-hidden">
              {filteredTodos.length === 0 ? (
                <EmptyState
                  icon={getListIcon()}
                  {...getEmptyStateMessage()}
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredTodos.map((todo: Todo, index: number) => (
                    <div
                      key={todo.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <TodoItem
                        todo={todo}
                        onToggle={handleToggle}
                        onToggleImportant={handleToggleImportant}
                        onDelete={handleDelete}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {filteredTodos.length > 0 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                共 {filteredTodos.length} 个任务
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  count: number
  active?: boolean
  onClick: () => void
  gradient: string
}

function SidebarItem({ icon, label, count, active, onClick, gradient }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-primary/10 text-primary shadow-elevation-1'
          : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          active
            ? `bg-gradient-to-br ${gradient} text-white shadow-elevation-1`
            : 'bg-muted/50 text-muted-foreground'
        }`}>
          {icon}
        </div>
        <span>{label}</span>
      </div>
      {count > 0 && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
          active
            ? 'bg-primary/20 text-primary'
            : 'bg-muted/50 text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  subtitle: string
}

function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="text-center py-20 px-8 animate-fade-in">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-muted to-muted/60 mb-6 shadow-elevation-1">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground mb-8">
        {subtitle}
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>点击右上角按钮添加任务</span>
      </div>
    </div>
  )
}

function ClientDate() {
  const [date, setDate] = useState('')

  useEffect(() => {
    setDate(
      new Date().toLocaleDateString('zh-CN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    )
  }, [])

  return (
    <span className="text-sm text-muted-foreground font-medium">
      {date}
    </span>
  )
}
