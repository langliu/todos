import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

import { createServerFn } from '@tanstack/react-start'

import type { Tag, Todo } from '@/lib/supabase'

import { authMiddleware } from '@/lib/auth'

import { updateTodoTags } from './tags.server'

export type CreateTodoInput = {
  title: string
  description?: string
  due_date?: string
  important?: boolean
  tagIds?: string[]
}

export type UpdateTodoInput = {
  title?: string
  description?: string
  completed?: boolean
  important?: boolean
  due_date?: string
  tagIds?: string[]
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

type CompletedSubtaskCountRow = {
  todo_id: string
  completed_count: number | string | null
}

export const getTodos = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TodoListItem[]> => {
    const { supabase, userId } = context as AuthContext

    const { data: todosData, error: todosError } = await supabase
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
        created_at: row.created_at,
        updated_at: row.updated_at,
        tags,
        subtask_count: subtaskCount,
        subtask_completed_count: subtaskCompletedCount,
      }
    })
  })

export const createTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: CreateTodoInput) => input)
  .handler(async ({ context, data }): Promise<Todo> => {
    const { supabase, userId } = context as AuthContext

    const { data: todo, error } = await supabase
      .from('todos')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        important: data.important || false,
        due_date: data.due_date || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (data.tagIds && data.tagIds.length > 0) {
      await updateTodoTags({
        data: {
          todoId: todo.id,
          tagIds: data.tagIds,
        },
      })
    }

    return todo
  })

export const updateTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; data: UpdateTodoInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Todo> => {
    const { supabase, userId } = context as AuthContext

    const { tagIds, ...todoData } = inputData.data

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
      await updateTodoTags({
        data: {
          todoId: inputData.id,
          tagIds,
        },
      })
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
