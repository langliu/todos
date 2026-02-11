import { lazy, Suspense, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Star,
  Trash2,
  Calendar,
  GripVertical,
  Pencil,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { Tag, Todo } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { getSubtasks } from '@/data/subtasks.server'
import { TagBadge } from './TagBadge'

const LazySubtaskList = lazy(async () => {
  const module = await import('./SubtaskList')
  return { default: module.SubtaskList }
})

interface TodoItemProps {
  todo: Todo
  tags: Tag[]
  subtaskCount: number
  subtaskCompletedCount: number
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

export function TodoItem({
  todo,
  tags,
  subtaskCount,
  subtaskCompletedCount,
  onToggle,
  onToggleImportant,
  onDelete,
  onEdit,
}: TodoItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const overdue = todo.due_date ? isOverdue(todo.due_date) : false
  const { data: loadedSubtasks } = useQuery({
    queryKey: ['subtasks', todo.id],
    queryFn: () => getSubtasks({ data: { todoId: todo.id } }),
    enabled: isExpanded,
  })

  const subtasks = loadedSubtasks || []
  const hasLoadedSubtasks = loadedSubtasks !== undefined
  const completedSubtasks = hasLoadedSubtasks
    ? subtasks.filter((subtask) => subtask.completed).length
    : subtaskCompletedCount
  const totalSubtasks = hasLoadedSubtasks ? subtasks.length : subtaskCount
  const hasSubtasks = totalSubtasks > 0

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
        {tags.length > 0 && (
          <div className='flex flex-wrap gap-1.5 mt-2'>
            {tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </div>

      {hasSubtasks ? (
        <div className='mr-auto'>
          <button
            type='button'
            onClick={() => setIsExpanded(!isExpanded)}
            className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors'
          >
            {isExpanded ? (
              <ChevronDown className='h-3.5 w-3.5' />
            ) : (
              <ChevronRight className='h-3.5 w-3.5' />
            )}
            <span>
              {completedSubtasks}/{totalSubtasks} 子任务
            </span>
          </button>
        </div>
      ) : !isExpanded ? (
        <button
          type='button'
          onClick={() => setIsExpanded(true)}
          className='mr-auto text-xs font-medium text-muted-foreground hover:text-primary transition-colors'
        >
          + 添加子任务
        </button>
      ) : null}

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

      {isExpanded && (
        <div className='ml-10 mr-12 mt-3 mb-1'>
          <Suspense
            fallback={<div className='py-2 text-xs text-muted-foreground'>加载子任务中...</div>}
          >
            <LazySubtaskList todoId={todo.id} subtasks={subtasks} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
