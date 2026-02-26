import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import type { Subtask } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createSubtask,
  deleteSubtask,
  updateSubtask,
  toggleSubtaskCompleted,
  reorderSubtasks,
} from '@/data/subtasks'

import { SubtaskItem } from './SubtaskItem'

interface SubtaskListProps {
  todoId: string
  subtasks: Subtask[]
  readOnly?: boolean
}

export function SubtaskList({ todoId, subtasks, readOnly = false }: SubtaskListProps) {
  const queryClient = useQueryClient()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const subtasksQueryKey: ['subtasks', string] = ['subtasks', todoId]

  const createSubtaskMutation = useMutation({
    mutationFn: createSubtask,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: subtasksQueryKey })

      const previousSubtasks = queryClient.getQueryData<Subtask[]>(subtasksQueryKey) || []
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const now = new Date().toISOString()
      const optimisticSubtask: Subtask = {
        id: tempId,
        todo_id: todoId,
        title: variables.data.data.title,
        completed: false,
        order: variables.data.data.order || previousSubtasks.length,
        created_at: now,
        updated_at: now,
      }

      queryClient.setQueryData<Subtask[]>(subtasksQueryKey, [
        ...previousSubtasks,
        optimisticSubtask,
      ])

      return { previousSubtasks, tempId }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      queryClient.setQueryData(subtasksQueryKey, context.previousSubtasks)
    },
    onSuccess: (createdSubtask, _variables, context) => {
      queryClient.setQueryData<Subtask[]>(subtasksQueryKey, (currentSubtasks = []) => {
        const replacedSubtasks = currentSubtasks.map((subtask) =>
          subtask.id === context?.tempId ? createdSubtask : subtask,
        )
        const hasCreatedSubtask = replacedSubtasks.some(
          (subtask) => subtask.id === createdSubtask.id,
        )
        return hasCreatedSubtask ? replacedSubtasks : [...replacedSubtasks, createdSubtask]
      })
    },
  })

  const updateSubtaskMutation = useMutation({
    mutationFn: updateSubtask,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: subtasksQueryKey })

      const previousSubtasks = queryClient.getQueryData<Subtask[]>(subtasksQueryKey) || []

      queryClient.setQueryData<Subtask[]>(subtasksQueryKey, (currentSubtasks = []) =>
        currentSubtasks.map((subtask) =>
          subtask.id === variables.data.id ? { ...subtask, ...variables.data.data } : subtask,
        ),
      )

      return { previousSubtasks }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      queryClient.setQueryData(subtasksQueryKey, context.previousSubtasks)
    },
    onSuccess: (updatedSubtask) => {
      queryClient.setQueryData<Subtask[]>(subtasksQueryKey, (currentSubtasks = []) =>
        currentSubtasks.map((subtask) =>
          subtask.id === updatedSubtask.id ? updatedSubtask : subtask,
        ),
      )
    },
  })

  const deleteSubtaskMutation = useMutation({
    mutationFn: deleteSubtask,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: subtasksQueryKey })

      const previousSubtasks = queryClient.getQueryData<Subtask[]>(subtasksQueryKey) || []

      queryClient.setQueryData<Subtask[]>(subtasksQueryKey, (currentSubtasks = []) =>
        currentSubtasks.filter((subtask) => subtask.id !== variables.data.id),
      )

      return { previousSubtasks }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      queryClient.setQueryData(subtasksQueryKey, context.previousSubtasks)
    },
  })

  const toggleSubtaskMutation = useMutation({
    mutationFn: toggleSubtaskCompleted,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: subtasksQueryKey })

      const previousSubtasks = queryClient.getQueryData<Subtask[]>(subtasksQueryKey) || []

      queryClient.setQueryData<Subtask[]>(subtasksQueryKey, (currentSubtasks = []) =>
        currentSubtasks.map((subtask) =>
          subtask.id === variables.data.id
            ? { ...subtask, completed: variables.data.completed }
            : subtask,
        ),
      )

      return { previousSubtasks }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      queryClient.setQueryData(subtasksQueryKey, context.previousSubtasks)
    },
    onSuccess: (updatedSubtask) => {
      queryClient.setQueryData<Subtask[]>(subtasksQueryKey, (currentSubtasks = []) =>
        currentSubtasks.map((subtask) =>
          subtask.id === updatedSubtask.id ? updatedSubtask : subtask,
        ),
      )
    },
  })

  const reorderSubtasksMutation = useMutation({
    mutationFn: reorderSubtasks,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: subtasksQueryKey })

      const previousSubtasks = queryClient.getQueryData<Subtask[]>(subtasksQueryKey) || []
      const orderMap = new Map(
        variables.data.subtasks.map((subtask) => [subtask.id, subtask.order]),
      )

      queryClient.setQueryData<Subtask[]>(subtasksQueryKey, (currentSubtasks = []) =>
        currentSubtasks
          .map((subtask) => {
            const nextOrder = orderMap.get(subtask.id)
            return nextOrder === undefined ? subtask : { ...subtask, order: nextOrder }
          })
          .sort((a, b) => a.order - b.order),
      )

      return { previousSubtasks }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      queryClient.setQueryData(subtasksQueryKey, context.previousSubtasks)
    },
  })

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return
    if (!newSubtaskTitle.trim()) return

    createSubtaskMutation.mutate({
      data: {
        todoId,
        data: {
          title: newSubtaskTitle.trim(),
          order: subtasks.length,
        },
      },
    })

    setNewSubtaskTitle('')
  }

  const handleToggleSubtask = (id: string, completed: boolean) => {
    toggleSubtaskMutation.mutate({
      data: { id, completed },
    })
  }

  const handleDeleteSubtask = (id: string) => {
    deleteSubtaskMutation.mutate({ data: { id } })
  }

  const handleEditStart = (id: string, title: string) => {
    if (readOnly) return
    setEditingSubtaskId(id)
    setEditValue(title)
  }

  const handleEditSave = () => {
    if (!editingSubtaskId || !editValue.trim()) return

    updateSubtaskMutation.mutate(
      {
        data: {
          id: editingSubtaskId,
          data: { title: editValue.trim() },
        },
      },
      {
        onSuccess: () => {
          setEditingSubtaskId(null)
          setEditValue('')
        },
      },
    )
  }

  const handleEditCancel = () => {
    setEditingSubtaskId(null)
    setEditValue('')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return

    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = subtasks.findIndex((s) => s.id === active.id)
      const newIndex = subtasks.findIndex((s) => s.id === over.id)

      const reorderedSubtasks = arrayMove(subtasks, oldIndex, newIndex)

      reorderSubtasksMutation.mutate({
        data: {
          todoId,
          subtasks: reorderedSubtasks.map((s, index) => ({
            id: s.id,
            order: index,
          })),
        },
      })
    }
  }

  const completedCount = subtasks.filter((s) => s.completed).length
  const totalCount = subtasks.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className='space-y-3'>
      {totalCount > 0 && (
        <div className='flex items-center gap-3'>
          <div className='bg-muted h-2 flex-1 overflow-hidden rounded-full'>
            <div
              className='from-primary to-secondary h-full rounded-full bg-gradient-to-r transition-all duration-300'
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className='text-muted-foreground shrink-0 text-xs font-medium'>
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className='space-y-2'>
            {subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                isEditing={editingSubtaskId === subtask.id}
                editValue={editValue}
                onToggle={handleToggleSubtask}
                onDelete={handleDeleteSubtask}
                onEditStart={handleEditStart}
                onEditChange={setEditValue}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!readOnly && (
        <form onSubmit={handleAddSubtask} className='flex gap-2'>
          <Input
            placeholder='添加子任务...'
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            className='border-border bg-card focus:border-primary/30 h-10 flex-1 rounded-xl border-2 px-4 text-sm'
          />
          <Button
            type='submit'
            disabled={!newSubtaskTitle.trim()}
            className='h-10 gap-2 rounded-xl px-4'
          >
            <Plus className='h-4 w-4' />
          </Button>
        </form>
      )}
    </div>
  )
}
