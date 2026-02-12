import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

import { createServerFn } from '@tanstack/react-start'

import type { Subtask } from '@/lib/supabase'

import { authMiddleware } from '@/lib/auth'

export type CreateSubtaskInput = {
  title: string
  order?: number
}

export type UpdateSubtaskInput = {
  title?: string
  completed?: boolean
  order?: number
}

type AuthContext = {
  user: User
  userId: string
  supabase: SupabaseClient
}

export const getSubtasks = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<Subtask[]> => {
    const { supabase } = context as AuthContext

    const { data, error } = await supabase
      .from('subtasks')
      .select('*')
      .eq('todo_id', inputData.todoId)
      .order('order', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  })

export const createSubtask = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string; data: CreateSubtaskInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Subtask> => {
    const { supabase } = context as AuthContext

    const { data: subtask, error } = await supabase
      .from('subtasks')
      .insert({
        todo_id: inputData.todoId,
        title: inputData.data.title,
        order: inputData.data.order || 0,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return subtask
  })

export const updateSubtask = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; data: UpdateSubtaskInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Subtask> => {
    const { supabase } = context as AuthContext

    const { data: subtask, error } = await supabase
      .from('subtasks')
      .update(inputData.data)
      .eq('id', inputData.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return subtask
  })

export const deleteSubtask = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { supabase } = context as AuthContext

    const { error } = await supabase.from('subtasks').delete().eq('id', inputData.id)

    if (error) {
      throw new Error(error.message)
    }
  })

export const reorderSubtasks = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (input: { todoId: string; subtasks: Array<{ id: string; order: number }> }) => input,
  )
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { supabase } = context as AuthContext

    if (inputData.subtasks.length === 0) {
      return
    }

    const subtaskIds = inputData.subtasks.map((subtask) => subtask.id)

    const { count, error: countError } = await supabase
      .from('subtasks')
      .select('id', { count: 'exact', head: true })
      .eq('todo_id', inputData.todoId)
      .in('id', subtaskIds)

    if (countError) {
      throw new Error(countError.message)
    }

    if (count !== subtaskIds.length) {
      throw new Error('子任务列表已发生变化，请刷新后重试')
    }

    const results = await Promise.all(
      inputData.subtasks.map(({ id, order }) =>
        supabase.from('subtasks').update({ order }).eq('id', id).eq('todo_id', inputData.todoId),
      ),
    )

    const failedResult = results.find((result) => result.error)
    if (failedResult?.error) {
      throw new Error(failedResult.error.message)
    }
  })

export const toggleSubtaskCompleted = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; completed: boolean }) => input)
  .handler(async ({ context, data: inputData }): Promise<Subtask> => {
    const { supabase } = context as AuthContext

    const { data: subtask, error } = await supabase
      .from('subtasks')
      .update({ completed: inputData.completed })
      .eq('id', inputData.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return subtask
  })
