import { createServerFn } from '@tanstack/react-start'
import type { Todo } from '@/lib/supabase'
import { authMiddleware } from '@/lib/auth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
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

export const getTodos = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Todo[]> => {
    const { supabase, userId } = context as AuthContext

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('important', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
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

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', data.id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(error.message)
    }
  })
