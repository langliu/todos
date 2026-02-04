import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Star, Trash2, Calendar, GripVertical } from 'lucide-react'
import type { Todo } from '@/lib/supabase'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, completed: boolean) => void
  onToggleImportant: (id: string, important: boolean) => void
  onDelete: (id: string) => void
}

export function TodoItem({
  todo,
  onToggle,
  onToggleImportant,
  onDelete,
}: TodoItemProps) {
  return (
    <div className="group flex items-center gap-3 p-4 bg-card hover:bg-muted/50 transition-all duration-200 cursor-pointer">
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-shrink-0">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={(checked) => onToggle(todo.id, checked as boolean)}
          className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
        />
      </div>

      <div className="flex-1 min-w-0 py-1">
        <p
          className={`font-medium truncate transition-all duration-200 ${
            todo.completed
              ? 'line-through text-muted-foreground'
              : 'text-foreground'
          }`}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p className={`text-sm truncate mt-0.5 transition-all duration-200 ${
            todo.completed ? 'text-muted-foreground/60' : 'text-muted-foreground'
          }`}>
            {todo.description}
          </p>
        )}
        {todo.due_date && (
          <div className={`flex items-center gap-1.5 mt-1.5 text-xs transition-all duration-200 ${
            todo.completed
              ? 'text-muted-foreground/50'
              : new Date(todo.due_date) < new Date()
                ? 'text-destructive'
                : 'text-muted-foreground'
          }`}>
            <Calendar className="h-3 w-3" />
            <span>{new Date(todo.due_date).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
            })}</span>
            {new Date(todo.due_date) < new Date() && !todo.completed && (
              <span className="text-destructive font-medium ml-1">已逾期</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-lg transition-all duration-200 ${
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
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(todo.id)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
