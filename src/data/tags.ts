import { createServerFn } from '@tanstack/react-start'

import type { Tag } from '@/lib/types'

import { authMiddleware } from '@/lib/auth'
import { convexMutation, convexQuery } from '@/lib/convex'

export type CreateTagInput = {
  name: string
  color?: string
}

export type UpdateTagInput = {
  name?: string
  color?: string
}

type AuthContext = {
  user: {
    id: string
    email: string
  }
  userId: string
}

export async function syncTodoTags(
  userId: string,
  todoId: string,
  tagIds: string[],
): Promise<void> {
  await convexMutation<void>('tags:syncTodoTags', {
    userId,
    todoId,
    tagIds,
  })
}

export const getTags = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Tag[]> => {
    const { userId } = context as AuthContext

    return await convexQuery<Tag[]>('tags:listByUser', {
      userId,
    })
  })

export const createTag = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: CreateTagInput) => input)
  .handler(async ({ context, data }): Promise<Tag> => {
    const { userId } = context as AuthContext

    return await convexMutation<Tag>('tags:createTag', {
      userId,
      name: data.name,
      color: data.color,
    })
  })

export const updateTag = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; data: UpdateTagInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Tag> => {
    const { userId } = context as AuthContext

    return await convexMutation<Tag>('tags:updateTag', {
      userId,
      id: inputData.id,
      name: inputData.data.name,
      color: inputData.data.color,
    })
  })

export const deleteTag = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    const { userId } = context as AuthContext

    await convexMutation<void>('tags:deleteTag', {
      userId,
      id: data.id,
    })
  })

export const getTodoTags = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<Tag[]> => {
    const { userId } = context as AuthContext

    return await convexQuery<Tag[]>('tags:getTodoTags', {
      userId,
      todoId: inputData.todoId,
    })
  })

export const addTagToTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string; tagId: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { userId } = context as AuthContext

    const currentTags = await convexQuery<Tag[]>('tags:getTodoTags', {
      userId,
      todoId: inputData.todoId,
    })

    const nextTagIds = [...new Set([...currentTags.map((tag) => tag.id), inputData.tagId])]
    await syncTodoTags(userId, inputData.todoId, nextTagIds)
  })

export const removeTagFromTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string; tagId: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { userId } = context as AuthContext

    const currentTags = await convexQuery<Tag[]>('tags:getTodoTags', {
      userId,
      todoId: inputData.todoId,
    })

    const nextTagIds = currentTags.map((tag) => tag.id).filter((tagId) => tagId !== inputData.tagId)
    await syncTodoTags(userId, inputData.todoId, nextTagIds)
  })

export const updateTodoTags = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string; tagIds: string[] }) => input)
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { userId } = context as AuthContext
    await syncTodoTags(userId, inputData.todoId, inputData.tagIds)
  })

export const getTagsWithCounts = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<(Tag & { todo_count: number })[]> => {
    const { userId } = context as AuthContext

    return await convexQuery<(Tag & { todo_count: number })[]>('tags:listWithCounts', {
      userId,
    })
  })
