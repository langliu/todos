import { internalMutationGeneric, internalQueryGeneric } from 'convex/server'
import { v } from 'convex/values'

const internalQuery = internalQueryGeneric
const internalMutation = internalMutationGeneric

function toSubtaskResponse(subtask: {
  _id: string
  todo_id: string
  title: string
  completed: boolean
  order: number
  created_at: string
  updated_at: string
}) {
  return {
    id: subtask._id,
    todo_id: subtask.todo_id,
    title: subtask.title,
    completed: subtask.completed,
    order: subtask.order,
    created_at: subtask.created_at,
    updated_at: subtask.updated_at,
  }
}

export const listByTodoId = internalQuery({
  args: {
    userId: v.id('users'),
    todoId: v.id('todos'),
  },
  handler: async (ctx, args) => {
    const subtasks = await ctx.db
      .query('subtasks')
      .withIndex('by_todo_id_order', (q) => q.eq('todo_id', args.todoId))
      .collect()

    return subtasks
      .filter((subtask) => subtask.user_id === args.userId)
      .sort((a, b) => a.order - b.order)
      .map(toSubtaskResponse)
  },
})

export const createSubtask = internalMutation({
  args: {
    userId: v.id('users'),
    todoId: v.id('todos'),
    title: v.string(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId)
    if (!todo || todo.user_id !== args.userId) {
      throw new Error('任务不存在')
    }

    const now = new Date().toISOString()
    const id = await ctx.db.insert('subtasks', {
      user_id: args.userId,
      todo_id: args.todoId,
      title: args.title,
      completed: false,
      order: args.order ?? 0,
      created_at: now,
      updated_at: now,
    })

    const subtask = await ctx.db.get(id)
    if (!subtask) {
      throw new Error('创建子任务失败')
    }

    return toSubtaskResponse(subtask)
  },
})

export const updateSubtask = internalMutation({
  args: {
    userId: v.id('users'),
    id: v.id('subtasks'),
    title: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subtask = await ctx.db.get(args.id)
    if (!subtask || subtask.user_id !== args.userId) {
      throw new Error('子任务不存在')
    }

    await ctx.db.patch(args.id, {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.completed !== undefined ? { completed: args.completed } : {}),
      ...(args.order !== undefined ? { order: args.order } : {}),
      updated_at: new Date().toISOString(),
    })

    const updated = await ctx.db.get(args.id)
    if (!updated) {
      throw new Error('子任务不存在')
    }

    return toSubtaskResponse(updated)
  },
})

export const deleteSubtask = internalMutation({
  args: {
    userId: v.id('users'),
    id: v.id('subtasks'),
  },
  handler: async (ctx, args) => {
    const subtask = await ctx.db.get(args.id)
    if (!subtask || subtask.user_id !== args.userId) {
      throw new Error('子任务不存在')
    }

    await ctx.db.delete(args.id)
  },
})

export const reorderSubtasks = internalMutation({
  args: {
    userId: v.id('users'),
    todoId: v.id('todos'),
    subtasks: v.array(
      v.object({
        id: v.id('subtasks'),
        order: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId)
    if (!todo || todo.user_id !== args.userId) {
      throw new Error('任务不存在')
    }

    const now = new Date().toISOString()
    await Promise.all(
      args.subtasks.map(async (item) => {
        const subtask = await ctx.db.get(item.id)
        if (!subtask || subtask.user_id !== args.userId || subtask.todo_id !== args.todoId) {
          return
        }

        await ctx.db.patch(item.id, {
          order: item.order,
          updated_at: now,
        })
      }),
    )
  },
})

export const toggleSubtaskCompleted = internalMutation({
  args: {
    userId: v.id('users'),
    id: v.id('subtasks'),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const subtask = await ctx.db.get(args.id)
    if (!subtask || subtask.user_id !== args.userId) {
      throw new Error('子任务不存在')
    }

    await ctx.db.patch(args.id, {
      completed: args.completed,
      updated_at: new Date().toISOString(),
    })

    const updated = await ctx.db.get(args.id)
    if (!updated) {
      throw new Error('子任务不存在')
    }

    return toSubtaskResponse(updated)
  },
})
