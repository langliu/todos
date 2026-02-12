import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Sun,
  Star,
  Calendar,
  Home,
  Search,
  CheckCircle2,
  BellRing,
  LogOut,
  User,
  Sparkles,
  Settings,
  Tag as TagIcon,
} from 'lucide-react'
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { TodoListType, UpdateTodoInput } from '@/data/todos.server'
import type { Todo } from '@/lib/supabase'

import { TodoItem } from '@/components/TodoItem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signOut } from '@/data/auth.server'
import { getTags } from '@/data/tags.server'
import {
  getTodoListCounts,
  getDueTodoReminders,
  getTodosPageData,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  TODOS_PAGE_SIZE,
} from '@/data/todos.server'
import { formatReminderDescription } from '@/lib/todo-reminder'

const LazyAddTodoDialog = lazy(async () => {
  const module = await import('@/components/AddTodoDialog')
  return { default: module.AddTodoDialog }
})

const LazyEditTodoDialog = lazy(async () => {
  const module = await import('@/components/EditTodoDialog')
  return { default: module.EditTodoDialog }
})

const REMINDER_STORAGE_KEY = 'todo-reminder-notified-v1'

export const Route = createFileRoute('/')({
  component: TodosPage,
  loader: async () => await getTodosPageData(),
})

function TodosPage() {
  const {
    todos: initialTodos,
    tags: initialTags,
    counts: initialCounts,
    user,
  } = Route.useLoaderData()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery.trim())
  const [selectedList, setSelectedList] = useState<TodoListType>('my-day')
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default')
  const todoListScrollRef = useRef<HTMLDivElement | null>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
  const notifiedReminderKeysRef = useRef<Set<string>>(new Set())
  const todosQueryKey = ['todos', selectedList, deferredSearchQuery, selectedTagId] as const
  const tagsQueryKey = ['tags'] as const
  const countsQueryKey = ['todo-list-counts'] as const
  const remindersQueryKey = ['due-todo-reminders'] as const
  const useInitialTodosData = selectedList === 'my-day' && !selectedTagId && !deferredSearchQuery
  const hasNotificationApi = isClient && typeof window !== 'undefined' && 'Notification' in window

  const {
    data: todosPagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: isTodosPending,
  } = useInfiniteQuery({
    queryKey: todosQueryKey,
    queryFn: async ({ pageParam }) =>
      await getTodos({
        data: {
          list: selectedList,
          searchQuery: deferredSearchQuery || undefined,
          tagId: selectedTagId,
          limit: TODOS_PAGE_SIZE,
          offset: pageParam as number,
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < TODOS_PAGE_SIZE) {
        return undefined
      }

      return allPages.length * TODOS_PAGE_SIZE
    },
    initialData: useInitialTodosData
      ? {
          pages: [initialTodos],
          pageParams: [0],
        }
      : undefined,
    placeholderData: (previousData) => previousData,
  })
  const todos = useMemo(() => todosPagesData?.pages.flat() || [], [todosPagesData])

  useEffect(() => {
    setIsClient(true)
    if (typeof window === 'undefined') {
      return
    }

    try {
      const rawKeys = localStorage.getItem(REMINDER_STORAGE_KEY)
      if (rawKeys) {
        const keys = JSON.parse(rawKeys) as string[]
        notifiedReminderKeysRef.current = new Set(keys)
      }
    } catch {
      notifiedReminderKeysRef.current = new Set()
    }

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    const root = todoListScrollRef.current
    const target = loadMoreSentinelRef.current

    if (!root || !target || !hasNextPage) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry?.isIntersecting || isFetchingNextPage) {
          return
        }
        void fetchNextPage()
      },
      {
        root,
        rootMargin: '240px 0px',
        threshold: 0.01,
      },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, todos.length])

  const { data: tags = [] } = useQuery({
    queryKey: tagsQueryKey,
    queryFn: getTags,
    initialData: initialTags,
  })

  const { data: listCounts = initialCounts } = useQuery({
    queryKey: countsQueryKey,
    queryFn: getTodoListCounts,
    initialData: initialCounts,
  })

  const { data: dueReminders = [] } = useQuery({
    queryKey: remindersQueryKey,
    queryFn: async () =>
      await getDueTodoReminders({
        data: {
          lookbackSeconds: 600,
        },
      }),
    enabled: isClient,
    staleTime: 0,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (!isClient || dueReminders.length === 0) {
      return
    }

    let hasNewReminder = false
    for (const reminder of dueReminders) {
      if (!reminder.due_date) {
        continue
      }

      const reminderKey = `${reminder.id}:${reminder.remind_at}`
      if (notifiedReminderKeysRef.current.has(reminderKey)) {
        continue
      }

      hasNewReminder = true
      notifiedReminderKeysRef.current.add(reminderKey)
      const description = formatReminderDescription(
        reminder.due_date,
        reminder.reminder_minutes_before,
      )

      toast.info(`任务提醒：${reminder.title}`, {
        description,
        duration: 8000,
      })

      if (notificationPermission === 'granted' && 'Notification' in window) {
        try {
          new Notification('任务提醒', {
            body: `${reminder.title}\n${description}`,
            tag: reminderKey,
          })
        } catch {
          // 忽略浏览器不支持的通知参数错误
        }
      }
    }

    if (!hasNewReminder) {
      return
    }

    const latestReminderKeys = Array.from(notifiedReminderKeysRef.current).slice(-300)
    notifiedReminderKeysRef.current = new Set(latestReminderKeys)
    try {
      localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(latestReminderKeys))
    } catch {
      // 忽略隐私模式下的存储异常
    }
  }, [dueReminders, isClient, notificationPermission])

  const handleEnableNotifications = async () => {
    if (!hasNotificationApi) {
      toast.error('当前浏览器不支持系统通知')
      return
    }

    if (notificationPermission === 'denied') {
      toast.error('通知权限已禁用，请在浏览器设置中手动开启')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    if (permission === 'granted') {
      toast.success('提醒通知已开启')
      return
    }
    toast.error('未开启系统通知，将仅在页面内提示')
  }

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo-list-counts'] })
      void queryClient.invalidateQueries({ queryKey: remindersQueryKey })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateTodo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo-list-counts'] })
      void queryClient.invalidateQueries({ queryKey: remindersQueryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo-list-counts'] })
      void queryClient.invalidateQueries({ queryKey: remindersQueryKey })
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
    }
    if ('description' in data) {
      updateData.description = data.description ?? null
    }
    if ('due_date' in data) {
      updateData.due_date = data.due_date ?? null
    }
    if ('reminder_minutes_before' in data) {
      updateData.reminder_minutes_before = data.reminder_minutes_before ?? null
    }
    updateMutation.mutate({
      data: { id, data: updateData },
    })
    setEditingTodo(null)
  }

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

      <main className='z-10 flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent'>
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
            {hasNotificationApi && notificationPermission !== 'granted' && (
              <Button
                variant='outline'
                onClick={() => void handleEnableNotifications()}
                className='border-primary/30 text-primary hover:bg-primary/10 h-11 gap-2 rounded-2xl px-4'
              >
                <BellRing className='h-4 w-4' />
                开启提醒
              </Button>
            )}
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

        <div className='flex min-h-0 flex-1 overflow-hidden px-4 py-5 sm:px-6 md:px-8'>
          <div className='mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-5 overflow-hidden sm:gap-6'>
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

            <div className='bg-background/65 sticky top-0 z-10 -mx-1 flex-none rounded-2xl px-1 py-0.5 backdrop-blur-sm'>
              <Search className='text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2' />
              <Input
                placeholder='搜索任务...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='border-border/75 bg-card/70 shadow-elevation-1 focus:border-primary/40 focus:bg-background/85 focus-visible:ring-primary/40 h-12 rounded-2xl border pr-4 pl-12 text-base backdrop-blur-sm transition-all focus-visible:ring-2'
              />
            </div>

            <div className='flex min-h-0 flex-1 flex-col gap-4'>
              <div className='border-border/75 bg-card/70 shadow-elevation-3 flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border p-3 backdrop-blur-sm sm:p-4'>
                {isTodosPending ? (
                  <div className='text-muted-foreground py-16 text-center text-sm'>
                    加载任务中...
                  </div>
                ) : todos.length === 0 ? (
                  <EmptyState icon={getListIcon()} {...getEmptyStateMessage()} />
                ) : (
                  <div ref={todoListScrollRef} className='min-h-0 flex-1 overflow-y-auto pr-1'>
                    <div className='space-y-3'>
                      {todos.map((todo, index: number) => (
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
                    {hasNextPage && <div ref={loadMoreSentinelRef} className='h-1 w-full' />}

                    {hasNextPage && (
                      <div className='mt-4 flex justify-center'>
                        <Button
                          variant='outline'
                          onClick={() => void fetchNextPage()}
                          disabled={isFetchingNextPage}
                          className='rounded-xl'
                        >
                          {isFetchingNextPage ? '加载中...' : '加载更多'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {todos.length > 0 && (
                <p className='text-muted-foreground flex-none py-1 text-center text-sm'>
                  {hasNextPage ? `已显示 ${todos.length} 个任务` : `共 ${todos.length} 个任务`}
                </p>
              )}
            </div>
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
