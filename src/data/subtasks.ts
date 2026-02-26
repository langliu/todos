import { createServerFn } from '@tanstack/react-start'

import type { Subtask } from '@/lib/types'

import { authMiddleware } from '@/lib/auth'
import { convexMutation, convexQuery } from '@/lib/convex'

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
  user: {
    id: string
    email: string
  }
  userId: string
}

export const getSubtasks = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<Subtask[]> => {
    const { userId } = context as AuthContext

    return await convexQuery<Subtask[]>('subtasks:listByTodoId', {
      userId,
      todoId: inputData.todoId,
    })
  })

export const createSubtask = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string; data: CreateSubtaskInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Subtask> => {
    const { userId } = context as AuthContext

    return await convexMutation<Subtask>('subtasks:createSubtask', {
      userId,
      todoId: inputData.todoId,
      title: inputData.data.title,
      order: inputData.data.order,
    })
  })

export const updateSubtask = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; data: UpdateSubtaskInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Subtask> => {
    const { userId } = context as AuthContext

    return await convexMutation<Subtask>('subtasks:updateSubtask', {
      userId,
      id: inputData.id,
      title: inputData.data.title,
      completed: inputData.data.completed,
      order: inputData.data.order,
    })
  })

export const deleteSubtask = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { userId } = context as AuthContext

    await convexMutation<void>('subtasks:deleteSubtask', {
      userId,
      id: inputData.id,
    })
  })

export const reorderSubtasks = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (input: { todoId: string; subtasks: Array<{ id: string; order: number }> }) => input,
  )
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { userId } = context as AuthContext

    if (inputData.subtasks.length === 0) {
      return
    }

    await convexMutation<void>('subtasks:reorderSubtasks', {
      userId,
      todoId: inputData.todoId,
      subtasks: inputData.subtasks,
    })
  })

export const toggleSubtaskCompleted = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; completed: boolean }) => input)
  .handler(async ({ context, data: inputData }): Promise<Subtask> => {
    const { userId } = context as AuthContext

    return await convexMutation<Subtask>('subtasks:toggleSubtaskCompleted', {
      userId,
      id: inputData.id,
      completed: inputData.completed,
    })
  })
