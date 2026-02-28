import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, X } from 'lucide-react'

import type { Subtask } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface SubtaskItemProps {
  subtask: Subtask
  isEditing: boolean
  editValue: string
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEditStart: (id: string, title: string) => void
  onEditChange: (value: string) => void
  onEditSave: () => void
  onEditCancel: () => void
}

export function SubtaskItem({
  subtask,
  isEditing,
  editValue,
  onToggle,
  onDelete,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: SubtaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: subtask.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='bg-muted/30 group hover:bg-muted/50 flex items-center gap-3 rounded-xl p-3 transition-all'
    >
      <button
        type='button'
        {...attributes}
        {...listeners}
        className='text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
      >
        <GripVertical className='h-4 w-4 cursor-grab' />
      </button>

      <Checkbox
        checked={subtask.completed}
        onCheckedChange={(checked) => onToggle(subtask.id, checked as boolean)}
        className='border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4.5 w-4.5 shrink-0 rounded-full border-2 transition-all'
      />

      {isEditing ? (
        <div className='flex flex-1 items-center gap-2'>
          <input
            type='text'
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onEditSave()
              } else if (e.key === 'Escape') {
                onEditCancel()
              }
            }}
            className='bg-background border-border focus:border-primary/50 flex-1 rounded-lg border-2 px-3 py-1.5 text-sm focus:outline-none'
            autoFocus
          />
          <Button
            type='button'
            size='icon'
            variant='ghost'
            onClick={onEditSave}
            className='hover:bg-primary/10 h-8 w-8 rounded-lg'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      ) : (
        <div
          className='min-w-0 flex-1 cursor-pointer text-sm'
          onClick={() => onEditStart(subtask.id, subtask.title)}
        >
          <p
            className={`truncate transition-all duration-200 ${
              subtask.completed ? 'text-muted-foreground line-through' : 'text-foreground'
            }`}
          >
            {subtask.title}
          </p>
        </div>
      )}

      <Button
        type='button'
        variant='ghost'
        size='icon'
        onClick={() => onDelete(subtask.id)}
        className='hover:bg-destructive/10 hover:text-destructive h-8 w-8 shrink-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100'
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  )
}
