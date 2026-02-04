import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Star, Trash2, Calendar, GripVertical, Pencil } from 'lucide-react'
import type { Todo } from '@/lib/supabase'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, completed: boolean) => void
  onToggleImportant: (id: string, important: boolean) => void
  onDelete: (id: string) => void
  onEdit: (todo: Todo) => void
}

function isOverdue(dueDate: string): boolean {
  const due = new Date(dueDate)
  const today = new Date()
  const dueDateOnly = due.getFullYear() * 10000 + (due.getMonth() + 1) * 100 + due.getDate()
  const todayDateOnly = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return dueDateOnly < todayDateOnly
}

export function TodoItem({ todo, onToggle, onToggleImportant, onDelete, onEdit }: TodoItemProps) {
  const overdue = todo.due_date ? isOverdue(todo.due_date) : false

  return (
    <div className='group flex items-center gap-4 p-5 bg-card hover:bg-muted/40 transition-all duration-200 cursor-pointer'>
      <div className='shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground'>
        <GripVertical className='h-4 w-4' />
      </div>

      <div className='shrink-0'>
        <Checkbox
          checked={todo.completed}
          onCheckedChange={(checked) => onToggle(todo.id, checked as boolean)}
          className='h-5.5 w-5.5 rounded-full border-2 border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all shadow-sm'
        />
      </div>

      <div className='flex-1 min-w-0 py-1.5'>
        <p
          className={`font-medium truncate transition-all duration-200 ${
            todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p
            className={`text-sm truncate mt-1 transition-all duration-200 ${
              todo.completed ? 'text-muted-foreground/50' : 'text-muted-foreground'
            }`}
          >
            {todo.description}
          </p>
        )}
        {todo.due_date && (
          <div
            className={`flex items-center gap-1.5 mt-2 text-xs font-medium transition-all duration-200 ${
              todo.completed
                ? 'text-muted-foreground/40'
                : overdue
                  ? 'text-destructive bg-destructive/10 px-2 py-0.5 rounded-full inline-flex'
                  : 'text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full inline-flex'
            }`}
          >
            <Calendar className='h-3 w-3' />
            <span>
              {new Date(todo.due_date).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {overdue && !todo.completed && <span className='ml-1'>已逾期</span>}
          </div>
        )}
      </div>

      <div className='flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200'>
        <Button
          variant='ghost'
          size='icon'
          className={`h-9 w-9 rounded-xl transition-all duration-200 ${
            todo.important
              ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'
              : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleImportant(todo.id, !todo.important)
          }}
        >
          <Star
            className={`h-4 w-4 transition-transform duration-200 ${
              todo.important ? 'fill-current scale-110' : ''
            }`}
          />
        </Button>

        <Button
          variant='ghost'
          size='icon'
          className='h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200'
          onClick={(e) => {
            e.stopPropagation()
            onEdit(todo)
          }}
        >
          <Pencil className='h-4 w-4' />
        </Button>

        <Button
          variant='ghost'
          size='icon'
          className='h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200'
          onClick={(e) => {
            e.stopPropagation()
            onDelete(todo.id)
          }}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
