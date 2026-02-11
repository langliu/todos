import { createServerFn } from '@tanstack/react-start'
import type { Tag } from '@/lib/supabase'
import { authMiddleware } from '@/lib/auth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export type CreateTagInput = {
  name: string
  color?: string
}

export type UpdateTagInput = {
  name?: string
  color?: string
}

type AuthContext = {
  user: User
  userId: string
  supabase: SupabaseClient
}

type TodoTagQueryRow = {
  tags: Tag | Tag[] | null
}

type TagWithCountQueryRow = Tag & {
  todo_tags?: Array<{ count: number | null }> | null
}

export const getTags = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Tag[]> => {
    const { supabase, userId } = context as AuthContext

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  })

export const createTag = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: CreateTagInput) => input)
  .handler(async ({ context, data }): Promise<Tag> => {
    const { supabase, userId } = context as AuthContext

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        user_id: userId,
        name: data.name,
        color: data.color || '#3b82f6',
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return tag
  })

export const updateTag = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; data: UpdateTagInput }) => input)
  .handler(async ({ context, data: inputData }): Promise<Tag> => {
    const { supabase, userId } = context as AuthContext

    const { data: tag, error } = await supabase
      .from('tags')
      .update(inputData.data)
      .eq('id', inputData.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return tag
  })

export const deleteTag = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    const { supabase, userId } = context as AuthContext

    const { error } = await supabase.from('tags').delete().eq('id', data.id).eq('user_id', userId)

    if (error) {
      throw new Error(error.message)
    }
  })

export const getTodoTags = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<Tag[]> => {
    const { supabase } = context as AuthContext

    const { data, error } = await supabase
      .from('todo_tags')
      .select('tags(*)')
      .eq('todo_id', inputData.todoId)

    if (error) {
      throw new Error(error.message)
    }

    return ((data || []) as TodoTagQueryRow[]).flatMap((item) => {
      if (!item.tags) {
        return []
      }

      return Array.isArray(item.tags) ? item.tags : [item.tags]
    })
  })

export const addTagToTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string; tagId: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { supabase } = context as AuthContext

    const { error } = await supabase.from('todo_tags').insert({
      todo_id: inputData.todoId,
      tag_id: inputData.tagId,
    })

    if (error) {
      throw new Error(error.message)
    }
  })

export const removeTagFromTodo = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string; tagId: string }) => input)
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { supabase } = context as AuthContext

    const { error } = await supabase
      .from('todo_tags')
      .delete()
      .eq('todo_id', inputData.todoId)
      .eq('tag_id', inputData.tagId)

    if (error) {
      throw new Error(error.message)
    }
  })

export const updateTodoTags = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((input: { todoId: string; tagIds: string[] }) => input)
  .handler(async ({ context, data: inputData }): Promise<void> => {
    const { supabase } = context as AuthContext

    const { error: deleteError } = await supabase
      .from('todo_tags')
      .delete()
      .eq('todo_id', inputData.todoId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    if (inputData.tagIds.length > 0) {
      const { error: insertError } = await supabase.from('todo_tags').insert(
        inputData.tagIds.map((tagId) => ({
          todo_id: inputData.todoId,
          tag_id: tagId,
        })),
      )

      if (insertError) {
        throw new Error(insertError.message)
      }
    }
  })

export const getTagsWithCounts = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<(Tag & { todo_count: number })[]> => {
    const { supabase, userId } = context as AuthContext

    const { data, error } = await supabase
      .from('tags')
      .select(`
        *,
        todo_tags(count)
      `)
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return ((data || []) as TagWithCountQueryRow[]).map((tag) => ({
      ...tag,
      todo_count: tag.todo_tags?.[0]?.count || 0,
    }))
  })
