import { createServerFn } from '@tanstack/react-start'

import type { Tag, Todo } from '@/lib/types'

import { authMiddleware } from '@/lib/auth'
import { convexMutation, convexQuery } from '@/lib/convex'

export type CreateTodoInput = {
  title: string
  description?: string
  due_date?: string
  important?: boolean
  reminder_minutes_before?: number | null
  tagIds?: string[]
}

export type UpdateTodoInput = {
  title?: string
  description?: string | null
  completed?: boolean
  important?: boolean
  due_date?: string | null
  reminder_minutes_before?: number | null
  tagIds?: string[]
}

export type TodoListType = 'my-day' | 'important' | 'planned' | 'tasks'

export const TODOS_PAGE_SIZE = 50

export type GetTodosInput = {
  searchQuery?: string
  list?: TodoListType
  tagId?: string | null
  limit?: number
  offset?: number
}

type AuthContext = {
  user: {
    id: string
    email: string
  }
  userId: string
}

export type TodoListItem = Todo & {
  tags: Tag[]
  subtask_count: number
  subtask_completed_count: number
}

export type TodoPageUser = {
  id: string
  email: string | null
}

export type TodoListCounts = {
  myDay: number
  important: number
  planned: number
  tasks: number
}

export type TodosPageData = {
  todos: TodoListItem[]
  tags: Tag[]
  counts: TodoListCounts
  user: TodoPageUser
}

export type DueTodoReminder = Pick<
  Todo,
  'id' | 'title' | 'due_date' | 'reminder_minutes_before'
> & {
  remind_at: string
}

type ListCountsQueryResult = {
  myDay: number
  important: number
  planned: number
  tasks: number
}

type TodosPageQueryResult = {
  todos: TodoListItem[]
  tags: Tag[]
  counts: ListCountsQueryResult
}

function normalizeReminderMinutes(value: number | null | undefined): number | null | undefined {
  if (value === null || value === undefined) {
    return value
  }
  if (!Number.isFinite(value)) {
    throw new Error('提醒时间不合法')
  }
  return Math.max(0, Math.floor(value))
}

export const getTodos = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input?: GetTodosInput) => input)
  .handler(async ({ context, data }): Promise<TodoListItem[]> => {
    const { userId } = context as AuthContext

    return await convexQuery<TodoListItem[]>('todos:listTodos', {
      userId,
      searchQuery: data?.searchQuery,
      list: data?.list,
      tagId: data?.tagId,
      limit: data?.limit,
      offset: data?.offset,
    })
  })

export const getTodoListCounts = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TodoListCounts> => {
    const { userId } = context as AuthContext
    const counts = await convexQuery<ListCountsQueryResult>('todos:getListCounts', {
      userId,
    })

    return {
      myDay: counts.myDay,
      tasks: counts.tasks,
      important: counts.important,
      planned: counts.planned,
    }
  })

export const getDueTodoReminders = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input?: { lookbackSeconds?: number }) => input)
  .handler(async ({ context, data }): Promise<DueTodoReminder[]> => {
    const { userId } = context as AuthContext
    const lookbackSeconds =
      typeof data?.lookbackSeconds === 'number' && Number.isFinite(data.lookbackSeconds)
        ? Math.max(60, Math.min(Math.floor(data.lookbackSeconds), 3600))
        : 300

    return await convexQuery<DueTodoReminder[]>('todos:getDueTodoReminders', {
      userId,
      lookbackSeconds,
    })
  })

export const getTodosPageData = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TodosPageData> => {
    const { userId, user } = context as AuthContext

    const pageData = await convexQuery<TodosPageQueryResult>('todos:getTodosPageData', {
      userId,
      pageSize: TODOS_PAGE_SIZE,
    })

    return {
      todos: pageData.todos,
      tags: pageData.tags,
      counts: {
        myDay: pageData.counts.myDay,
        important: pageData.counts.important,
        planned: pageData.counts.planned,
        tasks: pageData.counts.tasks,
      },
      user: {
        id: user.id,
        email: user.email ?? null,
      },
    }
  })

export const createTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: CreateTodoInput) => input)
  .handler(async ({ context, data }): Promise<Todo> => {
    const { userId } = context as AuthContext
    const reminderMinutesBefore = normalizeReminderMinutes(data.reminder_minutes_before)

    return await convexMutation<Todo>('todos:createTodo', {
      userId,
      title: data.title,
      description: data.description,
      important: data.important || false,
      due_date: data.due_date,
      reminder_minutes_before:
        data.due_date && reminderMinutesBefore !== undefined ? reminderMinutesBefore : null,
      tagIds: data.tagIds,
    })
  })

export const updateTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; data: UpdateTodoInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Todo> => {
    const { userId } = context as AuthContext

    const { tagIds, ...todoData } = inputData.data
    const normalizedReminderMinutes = normalizeReminderMinutes(todoData.reminder_minutes_before)
    if (todoData.reminder_minutes_before !== undefined) {
      todoData.reminder_minutes_before = normalizedReminderMinutes
    }
    if (todoData.due_date === null) {
      todoData.reminder_minutes_before = null
    }

    return await convexMutation<Todo>('todos:updateTodo', {
      userId,
      id: inputData.id,
      title: todoData.title,
      description: todoData.description,
      completed: todoData.completed,
      important: todoData.important,
      due_date: todoData.due_date,
      reminder_minutes_before: todoData.reminder_minutes_before,
      tagIds,
    })
  })

export const deleteTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    const { userId } = context as AuthContext

    await convexMutation<void>('todos:deleteTodo', {
      userId,
      id: data.id,
    })
  })
