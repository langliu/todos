import { internalMutationGeneric, internalQueryGeneric } from 'convex/server'
import { v } from 'convex/values'

const internalQuery = internalQueryGeneric
const internalMutation = internalMutationGeneric

type TodoListType = 'my-day' | 'important' | 'planned' | 'tasks'

type TodoAttachmentResponse = {
  storage_id: string
  name: string
  content_type: string | null
  size: number
  url: string | null
}

type TodoResponse = {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  important: boolean
  due_date: string | null
  reminder_minutes_before: number | null
  attachments: TodoAttachmentResponse[]
  created_at: string
  updated_at: string
}

type TodoListItemResponse = TodoResponse & {
  tags: Array<{
    id: string
    user_id: string
    name: string
    color: string
    created_at: string
    updated_at: string
  }>
  subtask_count: number
  subtask_completed_count: number
}

type TodoListInput = {
  searchQuery?: string
  list?: TodoListType
  tagId?: string | null
  limit?: number
  offset?: number
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

async function toTodo(
  ctx: any,
  todo: {
    _id: string
    user_id: string
    title: string
    description: string | null
    completed: boolean
    important: boolean
    due_date: string | null
    reminder_minutes_before: number | null
    attachments?: Array<{
      storage_id: string
      name: string
      content_type: string | null
      size: number
    }>
    created_at: string
    updated_at: string
  },
): Promise<TodoResponse> {
  const attachments = Array.isArray(todo.attachments) ? todo.attachments : []
  const resolvedAttachments = await Promise.all(
    attachments.map(async (attachment): Promise<TodoAttachmentResponse> => {
      const url = await ctx.storage.getUrl(attachment.storage_id).catch(() => null)
      return {
        storage_id: attachment.storage_id,
        name: attachment.name,
        content_type: attachment.content_type ?? null,
        size: attachment.size,
        url,
      }
    }),
  )

  return {
    id: todo._id,
    user_id: todo.user_id,
    title: todo.title,
    description: todo.description,
    completed: todo.completed,
    important: todo.important,
    due_date: todo.due_date,
    reminder_minutes_before: todo.reminder_minutes_before,
    attachments: resolvedAttachments,
    created_at: todo.created_at,
    updated_at: todo.updated_at,
  }
}

async function loadTodoTags(
  ctx: any,
  userId: string,
  todoIds: string[],
): Promise<Map<string, TodoListItemResponse['tags']>> {
  if (todoIds.length === 0) {
    return new Map<string, TodoListItemResponse['tags']>()
  }

  const userTags = await ctx.db
    .query('tags')
    .withIndex('by_user_id', (q: any) => q.eq('user_id', userId))
    .collect()

  const tagById = new Map<string, TodoListItemResponse['tags'][number]>(
    userTags.map((tag: any): [string, TodoListItemResponse['tags'][number]] => [
      String(tag._id),
      {
        id: tag._id,
        user_id: tag.user_id,
        name: tag.name,
        color: tag.color,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
      },
    ]),
  )

  const mappingsByTodo = await Promise.all(
    todoIds.map(async (todoId) => ({
      todoId,
      mappings: await ctx.db
        .query('todo_tags')
        .withIndex('by_todo_id', (q: any) => q.eq('todo_id', todoId as any))
        .collect(),
    })),
  )

  const grouped = new Map<string, TodoListItemResponse['tags']>()
  for (const item of mappingsByTodo) {
    const tags: TodoListItemResponse['tags'] = []
    for (const mapping of item.mappings) {
      if (mapping.user_id !== userId) {
        continue
      }

      const tag = tagById.get(String(mapping.tag_id))
      if (!tag) {
        continue
      }
      tags.push(tag)
    }
    grouped.set(String(item.todoId), tags)
  }

  return grouped
}

async function loadSubtaskCounts(
  ctx: any,
  userId: string,
  todoIds: string[],
): Promise<Map<string, { total: number; completed: number }>> {
  if (todoIds.length === 0) {
    return new Map<string, { total: number; completed: number }>()
  }

  const counts = new Map<string, { total: number; completed: number }>()
  await Promise.all(
    todoIds.map(async (todoId) => {
      const subtasks = await ctx.db
        .query('subtasks')
        .withIndex('by_todo_id', (q: any) => q.eq('todo_id', todoId as any))
        .collect()

      const summary = subtasks.reduce(
        (acc: { total: number; completed: number }, subtask: any) => {
          if (subtask.user_id !== userId) {
            return acc
          }

          acc.total += 1
          if (subtask.completed) {
            acc.completed += 1
          }
          return acc
        },
        { total: 0, completed: 0 },
      )

      counts.set(String(todoId), summary)
    }),
  )

  for (const todoId of todoIds) {
    const key = String(todoId)
    if (!counts.has(key)) {
      counts.set(key, { total: 0, completed: 0 })
    }
  }

  return counts
}

async function syncTodoTags(
  ctx: any,
  userId: string,
  todoId: string,
  tagIds: string[],
): Promise<void> {
  const targetTagIds = [...new Set(tagIds.map((tagId) => String(tagId)))]

  const existingMappings = await ctx.db
    .query('todo_tags')
    .withIndex('by_todo_id', (q: any) => q.eq('todo_id', todoId))
    .collect()

  const userMappings = existingMappings.filter((mapping: any) => mapping.user_id === userId)
  const existingTagIds = new Set(userMappings.map((mapping: any) => String(mapping.tag_id)))
  const targetSet = new Set(targetTagIds)

  await Promise.all(
    userMappings
      .filter((mapping: any) => !targetSet.has(String(mapping.tag_id)))
      .map((mapping: any) => ctx.db.delete(mapping._id)),
  )

  for (const tagId of targetTagIds) {
    if (existingTagIds.has(tagId)) {
      continue
    }

    const tag = await ctx.db.get(tagId as any)
    if (!tag || tag.user_id !== userId) {
      continue
    }

    await ctx.db.insert('todo_tags', {
      user_id: userId,
      todo_id: todoId,
      tag_id: tagId as any,
      created_at: new Date().toISOString(),
    })
  }
}

function matchesTodoList(
  todo: { completed: boolean; important: boolean; due_date: string | null },
  list: TodoListType,
): boolean {
  switch (list) {
    case 'my-day':
      return !todo.completed
    case 'important':
      return !todo.completed && todo.important
    case 'planned':
      return !todo.completed && Boolean(todo.due_date)
    case 'tasks':
      return !todo.completed
    default:
      return true
  }
}

async function calculateTodoCounts(
  ctx: any,
  userId: string,
): Promise<{ myDay: number; important: number; planned: number; tasks: number }> {
  let tasks = 0
  let myDay = 0
  let important = 0
  let planned = 0

  for await (const todo of ctx.db
    .query('todos')
    .withIndex('by_user_id_created_at', (q: any) => q.eq('user_id', userId))
    .order('desc')) {
    if (!todo.completed) {
      tasks += 1
      myDay += 1
      if (todo.important) {
        important += 1
      }
      if (todo.due_date) {
        planned += 1
      }
    }
  }

  return {
    myDay,
    important,
    planned,
    tasks,
  }
}

async function queryTodoList(
  ctx: any,
  userId: string,
  input?: TodoListInput,
): Promise<TodoListItemResponse[]> {
  const list = input?.list ?? 'my-day'
  const searchQuery = input?.searchQuery?.trim().toLowerCase()
  const tagId = input?.tagId ?? null
  const offset = Math.max(0, input?.offset ?? 0)
  const limit =
    typeof input?.limit === 'number' && Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(Math.floor(input.limit), 200)
      : undefined

  let allowedTodoIds: Set<string> | null = null
  if (tagId) {
    const mappings = await ctx.db
      .query('todo_tags')
      .withIndex('by_tag_id', (q: any) => q.eq('tag_id', tagId as any))
      .collect()
    allowedTodoIds = new Set(
      mappings
        .filter((mapping: any) => mapping.user_id === userId)
        .map((mapping: any) => String(mapping.todo_id)),
    )
  }

  const matchesFilters = (todo: any): boolean => {
    if (allowedTodoIds && !allowedTodoIds.has(String(todo._id))) {
      return false
    }
    if (!matchesTodoList(todo, list)) {
      return false
    }
    if (searchQuery && !todo.title.toLowerCase().includes(searchQuery)) {
      return false
    }
    return true
  }

  const results: any[] = []
  let matchedCount = 0
  const importanceOrder: boolean[] = list === 'important' ? [true] : [true, false]

  for (const importantValue of importanceOrder) {
    const query = ctx.db
      .query('todos')
      .withIndex('by_user_id_important_created_at', (q: any) =>
        q.eq('user_id', userId).eq('important', importantValue),
      )
      .order('desc')

    for await (const todo of query) {
      if (!matchesFilters(todo)) {
        continue
      }

      matchedCount += 1
      if (matchedCount <= offset) {
        continue
      }

      results.push(todo)
      if (limit !== undefined && results.length >= limit) {
        break
      }
    }

    if (limit !== undefined && results.length >= limit) {
      break
    }
  }

  const todoIds = results.map((todo: any) => todo._id)
  const [tagsByTodoId, subtaskCountsByTodoId] = await Promise.all([
    loadTodoTags(ctx, userId, todoIds),
    loadSubtaskCounts(ctx, userId, todoIds),
  ])

  return await Promise.all(
    results.map(async (todo: any) => {
      const base = await toTodo(ctx, todo)
      const tags = tagsByTodoId.get(String(todo._id)) ?? []
      const counts = subtaskCountsByTodoId.get(String(todo._id)) ?? { total: 0, completed: 0 }

      return {
        ...base,
        tags,
        subtask_count: counts.total,
        subtask_completed_count: counts.completed,
      }
    }),
  )
}

export const listTodos = internalQuery({
  args: {
    userId: v.id('users'),
    searchQuery: v.optional(v.string()),
    list: v.optional(
      v.union(
        v.literal('my-day'),
        v.literal('important'),
        v.literal('planned'),
        v.literal('tasks'),
      ),
    ),
    tagId: v.optional(v.union(v.id('tags'), v.null())),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await queryTodoList(ctx, args.userId, {
      searchQuery: args.searchQuery,
      list: args.list,
      tagId: args.tagId ?? null,
      limit: args.limit,
      offset: args.offset,
    })
  },
})

export const getListCounts = internalQuery({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return await calculateTodoCounts(ctx, args.userId)
  },
})

export const getDueTodoReminders = internalQuery({
  args: {
    userId: v.id('users'),
    lookbackSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackSeconds =
      typeof args.lookbackSeconds === 'number' && Number.isFinite(args.lookbackSeconds)
        ? Math.max(60, Math.min(Math.floor(args.lookbackSeconds), 3600))
        : 300

    const now = Date.now()
    const lookbackMs = lookbackSeconds * 1000

    const reminders: Array<{
      id: string
      title: string
      due_date: string
      reminder_minutes_before: number
      remind_at: string
      remind_at_ms: number
    }> = []

    for await (const todo of ctx.db
      .query('todos')
      .withIndex('by_user_id_created_at', (q: any) => q.eq('user_id', args.userId))
      .order('desc')) {
      if (todo.completed || !todo.due_date || todo.reminder_minutes_before === null) {
        continue
      }

      const dueDateMs = new Date(todo.due_date as string).getTime()
      const reminderMinutesBefore = Number(todo.reminder_minutes_before ?? 0)
      const remindAtMs = dueDateMs - reminderMinutesBefore * 60_000
      if (remindAtMs > now || now - remindAtMs > lookbackMs) {
        continue
      }

      reminders.push({
        id: String(todo._id),
        title: todo.title,
        due_date: todo.due_date as string,
        reminder_minutes_before: reminderMinutesBefore,
        remind_at: new Date(remindAtMs).toISOString(),
        remind_at_ms: remindAtMs,
      })
    }

    return reminders
      .sort((a, b) => a.remind_at_ms - b.remind_at_ms)
      .map(({ remind_at_ms, ...item }) => item)
  },
})

export const getTodosPageData = internalQuery({
  args: {
    userId: v.id('users'),
    pageSize: v.number(),
  },
  handler: async (ctx, args) => {
    const [todos, tags, counts] = await Promise.all([
      queryTodoList(ctx, args.userId, { list: 'my-day', limit: args.pageSize, offset: 0 }),
      ctx.db
        .query('tags')
        .withIndex('by_user_id', (q: any) => q.eq('user_id', args.userId))
        .collect(),
      calculateTodoCounts(ctx, args.userId),
    ])

    return {
      todos,
      tags: tags
        .map((tag: any) => ({
          id: tag._id,
          user_id: tag.user_id,
          name: tag.name,
          color: tag.color,
          created_at: tag.created_at,
          updated_at: tag.updated_at,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-CN')),
      counts,
    }
  },
})

export const createTodo = internalMutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    due_date: v.optional(v.string()),
    important: v.optional(v.boolean()),
    reminder_minutes_before: v.optional(v.union(v.number(), v.null())),
    attachments: v.optional(
      v.array(
        v.object({
          storage_id: v.id('_storage'),
          name: v.string(),
          content_type: v.optional(v.union(v.string(), v.null())),
          size: v.number(),
        }),
      ),
    ),
    tagIds: v.optional(v.array(v.id('tags'))),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    const reminderMinutesBefore = normalizeReminderMinutes(args.reminder_minutes_before)

    const id = await ctx.db.insert('todos', {
      user_id: args.userId,
      title: args.title,
      description: args.description ?? null,
      completed: false,
      important: args.important ?? false,
      due_date: args.due_date ?? null,
      reminder_minutes_before:
        args.due_date && reminderMinutesBefore !== undefined ? reminderMinutesBefore : null,
      attachments:
        args.attachments?.map((attachment) => ({
          storage_id: attachment.storage_id,
          name: attachment.name,
          content_type: attachment.content_type ?? null,
          size: attachment.size,
        })) ?? [],
      created_at: now,
      updated_at: now,
    })

    if (args.tagIds && args.tagIds.length > 0) {
      await syncTodoTags(ctx, args.userId, id, args.tagIds)
    }

    const todo = await ctx.db.get(id)
    if (!todo) {
      throw new Error('创建任务失败')
    }

    return await toTodo(ctx, todo)
  },
})

export const updateTodo = internalMutation({
  args: {
    userId: v.id('users'),
    id: v.id('todos'),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    completed: v.optional(v.boolean()),
    important: v.optional(v.boolean()),
    due_date: v.optional(v.union(v.string(), v.null())),
    reminder_minutes_before: v.optional(v.union(v.number(), v.null())),
    tagIds: v.optional(v.array(v.id('tags'))),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id)
    if (!todo || todo.user_id !== args.userId) {
      throw new Error('任务不存在')
    }

    const normalizedReminderMinutes = normalizeReminderMinutes(args.reminder_minutes_before)
    const dueDate = args.due_date !== undefined ? args.due_date : todo.due_date

    await ctx.db.patch(args.id, {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.completed !== undefined ? { completed: args.completed } : {}),
      ...(args.important !== undefined ? { important: args.important } : {}),
      ...(args.due_date !== undefined ? { due_date: args.due_date } : {}),
      ...(args.reminder_minutes_before !== undefined
        ? { reminder_minutes_before: normalizedReminderMinutes }
        : {}),
      ...(dueDate === null ? { reminder_minutes_before: null } : {}),
      updated_at: new Date().toISOString(),
    })

    if (args.tagIds !== undefined) {
      await syncTodoTags(ctx, args.userId, args.id, args.tagIds)
    }

    const updatedTodo = await ctx.db.get(args.id)
    if (!updatedTodo) {
      throw new Error('任务不存在')
    }

    return await toTodo(ctx, updatedTodo)
  },
})

export const generateAttachmentUploadUrl = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('用户不存在')
    }

    return await ctx.storage.generateUploadUrl()
  },
})

export const deleteTodo = internalMutation({
  args: {
    userId: v.id('users'),
    id: v.id('todos'),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id)
    if (!todo || todo.user_id !== args.userId) {
      throw new Error('任务不存在')
    }
    const attachments = Array.isArray(todo.attachments) ? todo.attachments : []

    const [mappings, subtasks] = await Promise.all([
      ctx.db
        .query('todo_tags')
        .withIndex('by_todo_id', (q: any) => q.eq('todo_id', args.id))
        .collect(),
      ctx.db
        .query('subtasks')
        .withIndex('by_todo_id', (q: any) => q.eq('todo_id', args.id))
        .collect(),
    ])

    await Promise.all([
      ...mappings
        .filter((mapping: any) => mapping.user_id === args.userId)
        .map((mapping: any) => ctx.db.delete(mapping._id)),
      ...subtasks
        .filter((subtask: any) => subtask.user_id === args.userId)
        .map((subtask: any) => ctx.db.delete(subtask._id)),
      ...attachments.map((attachment: any) =>
        ctx.storage.delete(attachment.storage_id).catch(() => undefined),
      ),
    ])

    await ctx.db.delete(args.id)
  },
})
