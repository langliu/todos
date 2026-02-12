import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

import { createServerFn } from '@tanstack/react-start'

import type { Tag, Todo } from '@/lib/supabase'

import { authMiddleware } from '@/lib/auth'

import { syncTodoTags } from './tags.server'

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
  user: User
  userId: string
  supabase: SupabaseClient
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

type CompletedSubtaskCountRow = {
  todo_id: string
  completed_count: number | string | null
}

type TodoTagIdRow = {
  todo_id: string
}

type TodoListCountsRpcRow = {
  my_day: number | string | null
  important: number | string | null
  planned: number | string | null
  tasks: number | string | null
}

type DueTodoReminderRpcRow = {
  id: string
  title: string
  due_date: string | null
  reminder_minutes_before: number | string | null
  remind_at: string | null
}

async function queryTodoList(
  supabase: SupabaseClient,
  userId: string,
  input?: GetTodosInput,
): Promise<TodoListItem[]> {
  const list = input?.list ?? 'my-day'
  const searchQuery = input?.searchQuery?.trim()
  const tagId = input?.tagId || null
  const offset = Math.max(0, input?.offset ?? 0)
  const limit =
    typeof input?.limit === 'number' && Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(Math.floor(input.limit), 200)
      : undefined

  let filteredTodoIds: string[] | null = null
  if (tagId) {
    const { data: todoTagRows, error: todoTagError } = await supabase
      .from('todo_tags')
      .select('todo_id')
      .eq('tag_id', tagId)

    if (todoTagError) {
      throw new Error(todoTagError.message)
    }

    filteredTodoIds = [
      ...new Set(((todoTagRows || []) as TodoTagIdRow[]).map((row) => row.todo_id)),
    ]
    if (filteredTodoIds.length === 0) {
      return []
    }
  }

  let query = supabase
    .from('todos')
    .select(`
        *,
        todo_tags (
          tags (*)
        ),
        subtasks(count)
      `)
    .eq('user_id', userId)
    .order('important', { ascending: false })
    .order('created_at', { ascending: false })

  if (filteredTodoIds) {
    query = query.in('id', filteredTodoIds)
  }

  if (searchQuery) {
    query = query.ilike('title', `%${searchQuery}%`)
  }

  switch (list) {
    case 'my-day':
      query = query.eq('completed', false)
      break
    case 'important':
      query = query.eq('important', true)
      break
    case 'planned':
      query = query.not('due_date', 'is', null)
      break
    case 'tasks':
      break
    default:
      break
  }

  if (limit !== undefined) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data: todosData, error: todosError } = await query

  if (todosError) {
    throw new Error(todosError.message)
  }

  type TodoQueryRow = Todo & {
    todo_tags?: Array<{ tags: Tag | null }> | null
    subtasks?: Array<{ count: number | null }> | null
  }

  const todoRows = (todosData || []) as TodoQueryRow[]
  const todoIds = todoRows.map((row) => row.id)

  const completedCountByTodoId = new Map<string, number>()
  if (todoIds.length > 0) {
    const { data: completedRows, error: completedError } = await supabase.rpc(
      'get_completed_subtask_counts',
      {
        p_todo_ids: todoIds,
      },
    )

    if (completedError) {
      throw new Error(completedError.message)
    }

    for (const row of (completedRows || []) as CompletedSubtaskCountRow[]) {
      completedCountByTodoId.set(row.todo_id, Number(row.completed_count || 0))
    }
  }

  return todoRows.map((row) => {
    const tags = (row.todo_tags || [])
      .map((item) => item.tags)
      .filter((tag): tag is Tag => Boolean(tag))

    const subtaskCount = row.subtasks?.[0]?.count || 0
    const subtaskCompletedCount = completedCountByTodoId.get(row.id) || 0

    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      description: row.description,
      completed: row.completed,
      important: row.important,
      due_date: row.due_date,
      reminder_minutes_before: row.reminder_minutes_before,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags,
      subtask_count: subtaskCount,
      subtask_completed_count: subtaskCompletedCount,
    }
  })
}

async function queryUserTags(supabase: SupabaseClient, userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

async function queryTodoListCounts(supabase: SupabaseClient): Promise<TodoListCounts> {
  const { data, error } = await supabase.rpc('get_todo_list_counts')
  if (error) {
    throw new Error(error.message)
  }

  const row = ((data || [])[0] || null) as TodoListCountsRpcRow | null
  const tasks = Number(row?.tasks || 0)
  return {
    myDay: Number(row?.my_day || tasks),
    tasks,
    important: Number(row?.important || 0),
    planned: Number(row?.planned || 0),
  }
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
    const { supabase, userId } = context as AuthContext
    return queryTodoList(supabase, userId, data)
  })

export const getTodoListCounts = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TodoListCounts> => {
    const { supabase } = context as AuthContext
    return queryTodoListCounts(supabase)
  })

export const getDueTodoReminders = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input?: { lookbackSeconds?: number }) => input)
  .handler(async ({ context, data }): Promise<DueTodoReminder[]> => {
    const { supabase } = context as AuthContext
    const lookbackSeconds =
      typeof data?.lookbackSeconds === 'number' && Number.isFinite(data.lookbackSeconds)
        ? Math.max(60, Math.min(Math.floor(data.lookbackSeconds), 3600))
        : 300

    const { data: reminderRows, error } = await supabase.rpc('get_due_todo_reminders', {
      p_lookback_seconds: lookbackSeconds,
    })

    if (error) {
      throw new Error(error.message)
    }

    return ((reminderRows || []) as DueTodoReminderRpcRow[])
      .filter((row) => row.due_date && row.remind_at)
      .map((row) => ({
        id: row.id,
        title: row.title,
        due_date: row.due_date as string,
        reminder_minutes_before: Number(row.reminder_minutes_before || 0),
        remind_at: row.remind_at as string,
      }))
  })

export const getTodosPageData = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TodosPageData> => {
    const { supabase, userId, user } = context as AuthContext
    const [todos, tags, counts] = await Promise.all([
      queryTodoList(supabase, userId, { list: 'my-day', limit: TODOS_PAGE_SIZE, offset: 0 }),
      queryUserTags(supabase, userId),
      queryTodoListCounts(supabase),
    ])

    return {
      todos,
      tags,
      counts,
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
    const { supabase, userId } = context as AuthContext
    const reminderMinutesBefore = normalizeReminderMinutes(data.reminder_minutes_before)

    const { data: todo, error } = await supabase
      .from('todos')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        important: data.important || false,
        due_date: data.due_date || null,
        reminder_minutes_before:
          data.due_date && reminderMinutesBefore !== undefined ? reminderMinutesBefore : null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (data.tagIds && data.tagIds.length > 0) {
      await syncTodoTags(supabase, todo.id, data.tagIds)
    }

    return todo
  })

export const updateTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; data: UpdateTodoInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Todo> => {
    const { supabase, userId } = context as AuthContext

    const { tagIds, ...todoData } = inputData.data
    const normalizedReminderMinutes = normalizeReminderMinutes(todoData.reminder_minutes_before)
    if (todoData.reminder_minutes_before !== undefined) {
      todoData.reminder_minutes_before = normalizedReminderMinutes
    }
    if (todoData.due_date === null) {
      todoData.reminder_minutes_before = null
    }

    const { data: todo, error } = await supabase
      .from('todos')
      .update(todoData)
      .eq('id', inputData.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (tagIds !== undefined) {
      await syncTodoTags(supabase, inputData.id, tagIds)
    }

    return todo
  })

export const deleteTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    const { supabase, userId } = context as AuthContext

    const { error } = await supabase.from('todos').delete().eq('id', data.id).eq('user_id', userId)

    if (error) {
      throw new Error(error.message)
    }
  })
