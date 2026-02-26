import { internalMutationGeneric, internalQueryGeneric } from 'convex/server'
import { v } from 'convex/values'

const internalQuery = internalQueryGeneric
const internalMutation = internalMutationGeneric

function uniqueTagIds(tagIds: string[]): string[] {
  return [...new Set(tagIds)]
}

export const listByUser = internalQuery({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query('tags')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.userId))
      .collect()

    return tags
      .map((tag) => ({
        id: tag._id,
        user_id: tag.user_id,
        name: tag.name,
        color: tag.color,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  },
})

export const listWithCounts = internalQuery({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query('tags')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.userId))
      .collect()

    const mappings = await ctx.db
      .query('todo_tags')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.userId))
      .collect()
    const countByTagId = new Map<string, number>()
    for (const mapping of mappings) {
      const key = String(mapping.tag_id)
      countByTagId.set(key, (countByTagId.get(key) ?? 0) + 1)
    }

    const withCounts = tags.map((tag) => ({
      id: tag._id,
      user_id: tag.user_id,
      name: tag.name,
      color: tag.color,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
      todo_count: countByTagId.get(String(tag._id)) ?? 0,
    }))

    return withCounts.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  },
})

export const createTag = internalMutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    const id = await ctx.db.insert('tags', {
      user_id: args.userId,
      name: args.name,
      color: args.color ?? '#3b82f6',
      created_at: now,
      updated_at: now,
    })

    const tag = await ctx.db.get(id)
    if (!tag) {
      throw new Error('创建标签失败')
    }

    return {
      id: tag._id,
      user_id: tag.user_id,
      name: tag.name,
      color: tag.color,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    }
  },
})

export const updateTag = internalMutation({
  args: {
    userId: v.id('users'),
    id: v.id('tags'),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.id)
    if (!tag || tag.user_id !== args.userId) {
      throw new Error('标签不存在')
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.color !== undefined ? { color: args.color } : {}),
      updated_at: new Date().toISOString(),
    })

    const updatedTag = await ctx.db.get(args.id)
    if (!updatedTag) {
      throw new Error('标签不存在')
    }

    return {
      id: updatedTag._id,
      user_id: updatedTag.user_id,
      name: updatedTag.name,
      color: updatedTag.color,
      created_at: updatedTag.created_at,
      updated_at: updatedTag.updated_at,
    }
  },
})

export const deleteTag = internalMutation({
  args: {
    userId: v.id('users'),
    id: v.id('tags'),
  },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.id)
    if (!tag || tag.user_id !== args.userId) {
      throw new Error('标签不存在')
    }

    const mappings = await ctx.db
      .query('todo_tags')
      .withIndex('by_tag_id', (q) => q.eq('tag_id', args.id))
      .collect()

    await Promise.all(
      mappings
        .filter((mapping) => mapping.user_id === args.userId)
        .map((mapping) => ctx.db.delete(mapping._id)),
    )

    await ctx.db.delete(args.id)
  },
})

export const getTodoTags = internalQuery({
  args: {
    userId: v.id('users'),
    todoId: v.id('todos'),
  },
  handler: async (ctx, args) => {
    const mappings = await ctx.db
      .query('todo_tags')
      .withIndex('by_todo_id', (q) => q.eq('todo_id', args.todoId))
      .collect()

    const tags = await Promise.all(
      mappings
        .filter((mapping) => mapping.user_id === args.userId)
        .map(async (mapping) => await ctx.db.get(mapping.tag_id)),
    )

    return tags
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
      .map((tag) => ({
        id: tag._id,
        user_id: tag.user_id,
        name: tag.name,
        color: tag.color,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  },
})

export const syncTodoTags = internalMutation({
  args: {
    userId: v.id('users'),
    todoId: v.id('todos'),
    tagIds: v.array(v.id('tags')),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId)
    if (!todo || todo.user_id !== args.userId) {
      throw new Error('任务不存在')
    }

    const targetTagIds = uniqueTagIds(args.tagIds.map((tagId) => String(tagId)))

    const existingMappings = await ctx.db
      .query('todo_tags')
      .withIndex('by_todo_id', (q) => q.eq('todo_id', args.todoId))
      .collect()

    const userMappings = existingMappings.filter((mapping) => mapping.user_id === args.userId)
    const existingTagIds = new Set(userMappings.map((mapping) => String(mapping.tag_id)))
    const targetSet = new Set(targetTagIds)

    await Promise.all(
      userMappings
        .filter((mapping) => !targetSet.has(String(mapping.tag_id)))
        .map((mapping) => ctx.db.delete(mapping._id)),
    )

    for (const tagId of targetTagIds) {
      if (existingTagIds.has(tagId)) {
        continue
      }

      const tag = await ctx.db.get(tagId as any)
      if (!tag || tag.user_id !== args.userId) {
        continue
      }

      await ctx.db.insert('todo_tags', {
        user_id: args.userId,
        todo_id: args.todoId,
        tag_id: tagId as any,
        created_at: new Date().toISOString(),
      })
    }
  },
})
