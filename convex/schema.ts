import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    email: v.string(),
    password_hash: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  }).index('by_email', ['email']),

  sessions: defineTable({
    user_id: v.id('users'),
    token_hash: v.string(),
    expires_at: v.number(),
    created_at: v.string(),
  })
    .index('by_token_hash', ['token_hash'])
    .index('by_user_id', ['user_id']),

  todos: defineTable({
    user_id: v.id('users'),
    title: v.string(),
    description: v.union(v.string(), v.null()),
    completed: v.boolean(),
    important: v.boolean(),
    due_date: v.union(v.string(), v.null()),
    reminder_minutes_before: v.union(v.number(), v.null()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_user_id', ['user_id'])
    .index('by_user_id_created_at', ['user_id', 'created_at'])
    .index('by_user_id_important_created_at', ['user_id', 'important', 'created_at']),

  tags: defineTable({
    user_id: v.id('users'),
    name: v.string(),
    color: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_user_id', ['user_id'])
    .index('by_user_id_name', ['user_id', 'name']),

  todo_tags: defineTable({
    user_id: v.id('users'),
    todo_id: v.id('todos'),
    tag_id: v.id('tags'),
    created_at: v.string(),
  })
    .index('by_user_id', ['user_id'])
    .index('by_todo_id', ['todo_id'])
    .index('by_tag_id', ['tag_id'])
    .index('by_todo_id_tag_id', ['todo_id', 'tag_id']),

  subtasks: defineTable({
    user_id: v.id('users'),
    todo_id: v.id('todos'),
    title: v.string(),
    completed: v.boolean(),
    order: v.number(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_todo_id', ['todo_id'])
    .index('by_user_id_todo_id', ['user_id', 'todo_id'])
    .index('by_todo_id_order', ['todo_id', 'order']),
})
