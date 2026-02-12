import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
  Settings,
  Tag as TagIcon,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

import type { TodoListItem, UpdateTodoInput } from '@/data/todos.server'
import type { Todo } from '@/lib/supabase'

import { TodoItem } from '@/components/TodoItem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCurrentUser, signOut } from '@/data/auth.server'
import { getTags } from '@/data/tags.server'
import { getTodos, createTodo, updateTodo, deleteTodo } from '@/data/todos.server'

const LazyAddTodoDialog = lazy(async () => {
  const module = await import('@/components/AddTodoDialog')
  return { default: module.AddTodoDialog }
})

const LazyEditTodoDialog = lazy(async () => {
  const module = await import('@/components/EditTodoDialog')
  return { default: module.EditTodoDialog }
})

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
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedList, setSelectedList] = useState('my-day')
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [todos, setTodos] = useState<TodoListItem[]>(initialTodos)

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  })

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: (result, variables) => {
      const selectedTags = tags.filter((tag) => variables.data.tagIds?.includes(tag.id))
      setTodos((prev) => [
        {
          ...result,
          tags: selectedTags,
          subtask_count: 0,
          subtask_completed_count: 0,
        },
        ...prev,
      ])
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateTodo,
    onSuccess: (result, variables) => {
      setTodos((prev) =>
        prev.map((todo) => {
          if (todo.id !== variables.data.id) {
            return todo
          }

          const nextTagIds = variables.data.data.tagIds
          const nextTags =
            nextTagIds === undefined ? todo.tags : tags.filter((tag) => nextTagIds.includes(tag.id))

          return {
            ...todo,
            ...result,
            tags: nextTags,
          }
        }),
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: (_result, variables) => {
      setTodos((prev) => prev.filter((todo) => todo.id !== variables.data.id))
    },
  })

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear()
      navigate({ to: '/auth/login' })
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

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo)
  }

  const handleUpdate = (
    id: string,
    data: Partial<Omit<Todo, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
      tagIds?: string[]
    },
  ) => {
    const updateData: UpdateTodoInput = {
      ...data,
      description: data.description || undefined,
      due_date: data.due_date || undefined,
    }
    updateMutation.mutate({
      data: { id, data: updateData },
    })
    setEditingTodo(null)
  }

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const matchesSearch = todo.title.toLowerCase().includes(searchQuery.toLowerCase())

      if (selectedTagId) {
        const hasTag = todo.tags.some((tag) => tag.id === selectedTagId)
        if (!hasTag) return false
      }

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
  }, [todos, searchQuery, selectedList, selectedTagId])

  const listCounts = useMemo(() => {
    let myDay = 0
    let important = 0
    let planned = 0
    let tasks = 0

    for (const todo of todos) {
      if (todo.completed) {
        continue
      }

      tasks += 1
      myDay += 1

      if (todo.important) {
        important += 1
      }

      if (todo.due_date) {
        planned += 1
      }
    }

    return {
      myDay,
      important,
      planned,
      tasks,
    }
  }, [todos])
  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === selectedTagId) || null,
    [selectedTagId, tags],
  )

  const getListTitle = () => {
    if (selectedTag) {
      return `标签: ${selectedTag.name}`
    }
    if (selectedTagId) {
      return '标签'
    }
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
    if (selectedTagId) {
      return <TagIcon className='h-7 w-7' />
    }
    switch (selectedList) {
      case 'my-day':
        return <Sun className='h-7 w-7' />
      case 'important':
        return <Star className='h-7 w-7' />
      case 'planned':
        return <Calendar className='h-7 w-7' />
      case 'tasks':
        return <Home className='h-7 w-7' />
      default:
        return <Sun className='h-7 w-7' />
    }
  }

  const getListGradientClass = () => {
    if (selectedTag) {
      return ''
    }
    if (selectedTagId) {
      return 'from-gray-400 to-gray-500'
    }
    switch (selectedList) {
      case 'my-day':
        return 'from-orange-400 to-amber-400'
      case 'important':
        return 'from-red-500 to-pink-500'
      case 'planned':
        return 'from-blue-500 to-indigo-500'
      case 'tasks':
        return 'from-violet-500 to-fuchsia-500'
      default:
        return 'from-orange-400 to-amber-400'
    }
  }

  const getListGradientStyle = (): React.CSSProperties | undefined => {
    if (!selectedTag) {
      return undefined
    }

    return {
      backgroundImage: `linear-gradient(135deg, ${selectedTag.color}, ${selectedTag.color}cc)`,
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
    <div className='bg-background relative flex h-screen overflow-hidden'>
      <div aria-hidden className='pointer-events-none absolute inset-0'>
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.14),transparent_56%)]' />
        <div className='absolute inset-0 bg-[linear-gradient(165deg,rgba(15,23,42,0.2)_0%,rgba(2,6,23,0)_44%)]' />
      </div>

      <aside className='border-sidebar-border/80 bg-sidebar/85 z-10 hidden w-72 shrink-0 border-r backdrop-blur-xl md:flex md:flex-col'>
        <div className='border-sidebar-border/80 flex h-20 items-center border-b px-6'>
          <div className='flex items-center gap-3'>
            <div className='from-primary to-secondary shadow-elevation-2 flex h-11 w-11 items-center justify-center  rounded-2xl bg-linear-to-br ring-1 ring-white/15'>
              <CheckCircle2 className='h-5 w-5 text-white' />
            </div>
            <div>
              <h1 className='text-sidebar-foreground text-xl font-bold tracking-tight'>To Do</h1>
              <p className='text-muted-foreground/90 text-xs'>高效任务管理</p>
            </div>
          </div>
        </div>

        <nav className='flex-1 space-y-1 p-4'>
          <SidebarItem
            icon={<Sun className='h-5 w-5' />}
            label='我的一天'
            count={listCounts.myDay}
            active={selectedList === 'my-day' && !selectedTagId}
            onClick={() => {
              setSelectedList('my-day')
              setSelectedTagId(null)
            }}
            gradient='from-orange-400 to-amber-400'
          />
          <SidebarItem
            icon={<Star className='h-5 w-5' />}
            label='重要'
            count={listCounts.important}
            active={selectedList === 'important' && !selectedTagId}
            onClick={() => {
              setSelectedList('important')
              setSelectedTagId(null)
            }}
            gradient='from-red-500 to-pink-500'
          />
          <SidebarItem
            icon={<Calendar className='h-5 w-5' />}
            label='已计划日程'
            count={listCounts.planned}
            active={selectedList === 'planned' && !selectedTagId}
            onClick={() => {
              setSelectedList('planned')
              setSelectedTagId(null)
            }}
            gradient='from-blue-500 to-indigo-500'
          />
          <SidebarItem
            icon={<Home className='h-5 w-5' />}
            label='任务'
            count={listCounts.tasks}
            active={selectedList === 'tasks' && !selectedTagId}
            onClick={() => {
              setSelectedList('tasks')
              setSelectedTagId(null)
            }}
            gradient='from-violet-500 to-fuchsia-500'
          />

          {tags.length > 0 && (
            <div className='border-border/60 border-t pt-4'>
              <p className='text-muted-foreground px-4 py-2 text-xs font-semibold tracking-wider uppercase'>
                标签
              </p>
              <div className='space-y-1'>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type='button'
                    onClick={() => {
                      setSelectedTagId(tag.id)
                      setSelectedList('tasks')
                    }}
                    className={`focus-visible:ring-primary/60 flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                      selectedTagId === tag.id
                        ? 'bg-primary/15 text-primary shadow-elevation-1'
                        : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                        selectedTagId === tag.id
                          ? 'shadow-elevation-1 bg-linear-to-br ring-1 ring-white/20'
                          : 'bg-muted/55 text-muted-foreground'
                      }`}
                      style={{
                        backgroundColor: selectedTagId === tag.id ? tag.color : undefined,
                        color: selectedTagId === tag.id ? 'white' : tag.color,
                      }}
                    >
                      <TagIcon className='h-4 w-4' />
                    </div>
                    <span className='flex-1 truncate text-left'>{tag.name}</span>
                  </button>
                ))}
                <Link
                  to='/tags'
                  className='text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground focus-visible:ring-primary/60 flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none'
                >
                  <div className='bg-muted/55 text-muted-foreground flex h-9 w-9 items-center justify-center rounded-xl'>
                    <Settings className='h-4 w-4' />
                  </div>
                  <span className='flex-1 text-left'>管理标签</span>
                </Link>
              </div>
            </div>
          )}
        </nav>

        {user && (
          <div className='border-sidebar-border/80 bg-muted/35 border-t p-4'>
            <div className='border-border/70 bg-sidebar/60 flex items-center gap-3 rounded-2xl border px-3 py-3'>
              <div className='from-primary to-secondary shadow-elevation-1 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br text-sm font-semibold text-white ring-1 ring-white/20'>
                {user.email?.charAt(0).toUpperCase() || <User className='h-4 w-4' />}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-sidebar-foreground truncate text-sm font-medium'>{user.email}</p>
              </div>
              <Link
                to='/settings'
                aria-label='打开设置'
                className='hover:bg-primary/15 hover:text-primary focus-visible:ring-primary/60 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none'
              >
                <Settings className='h-4 w-4' />
              </Link>
              <Button
                variant='ghost'
                size='icon'
                className='hover:bg-destructive/15 hover:text-destructive focus-visible:ring-destructive/70 h-9 w-9 shrink-0 rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none'
                onClick={() => signOutMutation.mutate({ data: undefined })}
                disabled={signOutMutation.isPending}
              >
                <LogOut className='h-4 w-4' />
              </Button>
            </div>
          </div>
        )}
      </aside>

      <main className='z-10 flex min-w-0 flex-1 flex-col bg-transparent'>
        <header className='border-border/70 bg-background/70 sticky top-0 z-10 flex h-20 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-6 md:px-8'>
          <div className='flex items-center gap-4'>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br text-white ${getListGradientClass()} shadow-elevation-2 ring-1 ring-white/25`}
              style={getListGradientStyle()}
            >
              {getListIcon()}
            </div>
            <div>
              <h1 className='text-foreground text-2xl font-bold tracking-tight'>
                {getListTitle()}
              </h1>
              <ClientDate />
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Suspense
              fallback={
                <Button
                  className='from-primary to-secondary shadow-elevation-2 h-11 rounded-2xl bg-linear-to-r px-6 font-semibold transition-all'
                  disabled
                >
                  添加任务
                </Button>
              }
            >
              <LazyAddTodoDialog
                onAdd={(todo) => {
                  createMutation.mutate({ data: todo })
                }}
              />
            </Suspense>
          </div>
        </header>

        <div className='flex-1 overflow-auto px-4 py-5 sm:px-6 md:px-8'>
          <div className='mx-auto max-w-5xl space-y-5 sm:space-y-6'>
            <div className='md:hidden'>
              <div className='flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                <MobileListChip
                  label='我的一天'
                  active={selectedList === 'my-day' && !selectedTagId}
                  onClick={() => {
                    setSelectedList('my-day')
                    setSelectedTagId(null)
                  }}
                />
                <MobileListChip
                  label='重要'
                  active={selectedList === 'important' && !selectedTagId}
                  onClick={() => {
                    setSelectedList('important')
                    setSelectedTagId(null)
                  }}
                />
                <MobileListChip
                  label='已计划'
                  active={selectedList === 'planned' && !selectedTagId}
                  onClick={() => {
                    setSelectedList('planned')
                    setSelectedTagId(null)
                  }}
                />
                <MobileListChip
                  label='任务'
                  active={selectedList === 'tasks' && !selectedTagId}
                  onClick={() => {
                    setSelectedList('tasks')
                    setSelectedTagId(null)
                  }}
                />
                {tags.map((tag) => (
                  <MobileListChip
                    key={tag.id}
                    label={tag.name}
                    active={selectedTagId === tag.id}
                    color={tag.color}
                    onClick={() => {
                      setSelectedTagId(tag.id)
                      setSelectedList('tasks')
                    }}
                  />
                ))}
              </div>
            </div>

            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2' />
              <Input
                placeholder='搜索任务...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='border-border/75 bg-card/70 shadow-elevation-1 focus:border-primary/40 focus:bg-background/85 focus-visible:ring-primary/40 h-12 rounded-2xl border pr-4 pl-12 text-base backdrop-blur-sm transition-all focus-visible:ring-2'
              />
            </div>

            <div className='border-border/75 bg-card/70 shadow-elevation-3 overflow-hidden rounded-3xl border p-3 backdrop-blur-sm sm:p-4'>
              {filteredTodos.length === 0 ? (
                <EmptyState icon={getListIcon()} {...getEmptyStateMessage()} />
              ) : (
                <div className='space-y-3'>
                  {filteredTodos.map((todo, index: number) => (
                    <div
                      key={todo.id}
                      className='animate-slide-up'
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <TodoItem
                        todo={todo}
                        tags={todo.tags}
                        subtaskCount={todo.subtask_count}
                        subtaskCompletedCount={todo.subtask_completed_count}
                        onToggle={handleToggle}
                        onToggleImportant={handleToggleImportant}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {filteredTodos.length > 0 && (
              <p className='text-muted-foreground py-2 text-center text-sm'>
                共 {filteredTodos.length} 个任务
              </p>
            )}
          </div>
        </div>
      </main>

      {editingTodo && (
        <Suspense fallback={null}>
          <LazyEditTodoDialog
            todo={editingTodo}
            open={!!editingTodo}
            onOpenChange={(open) => !open && setEditingTodo(null)}
            onUpdate={handleUpdate}
          />
        </Suspense>
      )}
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
      type='button'
      onClick={onClick}
      className={`group focus-visible:ring-primary/60 flex w-full cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
        active
          ? 'from-primary/16 via-primary/12 to-secondary/12 text-sidebar-foreground shadow-elevation-1 ring-primary/20 bg-linear-to-r ring-1'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground'
      }`}
    >
      <div className='flex items-center gap-3'>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            active
              ? `bg-linear-to-br ${gradient} shadow-elevation-1 text-white ring-1 ring-white/20`
              : 'bg-sidebar-accent/80 text-sidebar-foreground/70 ring-sidebar-border/70 group-hover:bg-primary/12 group-hover:text-primary/85 ring-1'
          }`}
        >
          {icon}
        </div>
        <span>{label}</span>
      </div>
      {count > 0 && (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
            active
              ? 'bg-primary/15 text-primary ring-primary/25 ring-1'
              : 'bg-sidebar-accent/70 text-sidebar-foreground/65 ring-sidebar-border/70 ring-1'
          }`}
        >
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
    <div className='animate-fade-in px-8 py-20 text-center'>
      <div className='from-muted to-muted/60 shadow-elevation-1 mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br'>
        {icon}
      </div>
      <h3 className='text-foreground mb-2 text-xl font-semibold'>{title}</h3>
      <p className='text-muted-foreground mb-8'>{subtitle}</p>
      <div className='text-muted-foreground flex items-center justify-center gap-2 text-sm'>
        <Sparkles className='text-primary h-4 w-4' />
        <span>点击右上角按钮添加任务</span>
      </div>
    </div>
  )
}

interface MobileListChipProps {
  label: string
  active?: boolean
  color?: string
  onClick: () => void
}

function MobileListChip({ label, active, color, onClick }: MobileListChipProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`focus-visible:ring-primary/60 cursor-pointer rounded-2xl border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
        active
          ? 'border-primary/40 bg-primary/20 text-primary shadow-elevation-1'
          : 'border-border/75 bg-card/55 text-muted-foreground'
      }`}
      style={
        active && color
          ? {
              borderColor: `${color}66`,
              color,
              backgroundColor: `${color}22`,
            }
          : undefined
      }
    >
      {label}
    </button>
  )
}

function ClientDate() {
  const [date, setDate] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDate(
      new Date().toLocaleDateString('zh-CN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    )
  }, [])

  return <span className='text-muted-foreground text-sm font-medium'>{mounted ? date : ''}</span>
}
