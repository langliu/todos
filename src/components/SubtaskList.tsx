import { useState } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SubtaskItem } from './SubtaskItem'
import {
  createSubtask,
  deleteSubtask,
  updateSubtask,
  toggleSubtaskCompleted,
  reorderSubtasks,
} from '@/data/subtasks.server'
import type { Subtask } from '@/lib/supabase'

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

  const createSubtaskMutation = useMutation({
    mutationFn: createSubtask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', todoId] })
    },
  })

  const updateSubtaskMutation = useMutation({
    mutationFn: updateSubtask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', todoId] })
    },
  })

  const deleteSubtaskMutation = useMutation({
    mutationFn: deleteSubtask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', todoId] })
    },
  })

  const toggleSubtaskMutation = useMutation({
    mutationFn: toggleSubtaskCompleted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', todoId] })
    },
  })

  const reorderSubtasksMutation = useMutation({
    mutationFn: reorderSubtasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', todoId] })
    },
  })

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault()
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
      }
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
    <div className="space-y-3">
      {totalCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={subtasks.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
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
        <form onSubmit={handleAddSubtask} className="flex gap-2">
          <Input
            placeholder="添加子任务..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            className="flex-1 h-10 px-4 text-sm rounded-xl border-2 border-border bg-card focus:border-primary/30"
          />
          <Button
            type="submit"
            disabled={!newSubtaskTitle.trim()}
            className="h-10 px-4 rounded-xl gap-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  )
}
