import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { GripVertical, Trash2, X } from 'lucide-react'
import type { Subtask } from '@/lib/supabase'

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
      className='flex items-center gap-3 p-3 bg-muted/30 rounded-xl group hover:bg-muted/50 transition-all'
    >
      <button
        {...attributes}
        {...listeners}
        className='shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground'
      >
        <GripVertical className='h-4 w-4 cursor-grab' />
      </button>

      <Checkbox
        checked={subtask.completed}
        onCheckedChange={(checked) => onToggle(subtask.id, checked as boolean)}
        className='shrink-0 h-4.5 w-4.5 rounded-full border-2 border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all'
      />

      {isEditing ? (
        <div className='flex-1 flex items-center gap-2'>
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
            className='flex-1 bg-background border-2 border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50'
            autoFocus
          />
          <Button
            size='icon'
            variant='ghost'
            onClick={onEditSave}
            className='h-8 w-8 rounded-lg hover:bg-primary/10'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      ) : (
        <div
          className='flex-1 min-w-0 text-sm cursor-pointer'
          onClick={() => onEditStart(subtask.id, subtask.title)}
        >
          <p
            className={`truncate transition-all duration-200 ${
              subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}
          >
            {subtask.title}
          </p>
        </div>
      )}

      <Button
        variant='ghost'
        size='icon'
        onClick={() => onDelete(subtask.id)}
        className='shrink-0 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive'
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  )
}
