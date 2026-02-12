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
    const subtaskOrders = inputData.subtasks.map((subtask) => subtask.order)

    const { error } = await supabase.rpc('reorder_subtasks_batch', {
      p_todo_id: inputData.todoId,
      p_subtask_ids: subtaskIds,
      p_orders: subtaskOrders,
    })

    if (error) {
      throw new Error(error.message)
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
