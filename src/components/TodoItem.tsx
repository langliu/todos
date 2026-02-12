import { useQuery } from '@tanstack/react-query'
import {
  Star,
  Trash2,
  Calendar,
  GripVertical,
  Pencil,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'

import type { Tag, Todo } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
    <article className='group border-border/75 bg-card/65 shadow-elevation-1 hover:border-primary/20 hover:shadow-elevation-2 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5'>
      <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5'>
        <div className='text-muted-foreground/60 hidden shrink-0 transition-opacity sm:block sm:opacity-0 sm:group-hover:opacity-100'>
          <GripVertical className='h-4 w-4' />
        </div>

        <div className='flex items-start gap-3 sm:contents'>
          <div className='shrink-0 pt-0.5 sm:pt-0'>
            <Checkbox
              checked={todo.completed}
              onCheckedChange={(checked) => onToggle(todo.id, checked as boolean)}
              className='border-muted-foreground/45 data-[state=checked]:border-primary data-[state=checked]:bg-primary h-5.5 w-5.5 rounded-full border-2 shadow-sm transition-all'
            />
          </div>

          <div className='min-w-0 flex-1 py-0.5 sm:py-1'>
            <p
              className={`truncate text-[0.97rem] leading-6 font-medium transition-all duration-200 ${
                todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
              }`}
            >
              {todo.title}
            </p>
            {todo.description && (
              <p
                className={`mt-1 truncate text-sm transition-all duration-200 ${
                  todo.completed ? 'text-muted-foreground/50' : 'text-muted-foreground'
                }`}
              >
                {todo.description}
              </p>
            )}
            {todo.due_date && (
              <div
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                  todo.completed
                    ? 'text-muted-foreground/45'
                    : overdue
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-muted/55 text-muted-foreground'
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
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='flex items-center justify-between gap-3 sm:ml-auto sm:justify-end'>
          {hasSubtasks ? (
            <button
              type='button'
              onClick={() => setIsExpanded(!isExpanded)}
              className='border-border/80 bg-muted/35 text-muted-foreground hover:border-primary/35 hover:text-primary focus-visible:ring-primary/60 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none'
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
          ) : !isExpanded ? (
            <button
              type='button'
              onClick={() => setIsExpanded(true)}
              className='border-border/80 text-muted-foreground hover:border-primary/35 hover:text-primary focus-visible:ring-primary/60 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none'
            >
              + 添加子任务
            </button>
          ) : (
            <span className='hidden sm:block' />
          )}

          <div className='flex items-center gap-1.5 opacity-100 transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100'>
            <Button
              variant='ghost'
              size='icon'
              className={`focus-visible:ring-primary/60 h-9 w-9 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                todo.important
                  ? 'bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25'
                  : 'text-muted-foreground hover:bg-yellow-500/15 hover:text-yellow-500'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleImportant(todo.id, !todo.important)
              }}
            >
              <Star
                className={`h-4 w-4 transition-transform duration-200 ${
                  todo.important ? 'scale-110 fill-current' : ''
                }`}
              />
            </Button>

            <Button
              variant='ghost'
              size='icon'
              className='text-muted-foreground hover:bg-primary/15 hover:text-primary focus-visible:ring-primary/60 h-9 w-9 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none'
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
              className='text-muted-foreground hover:bg-destructive/15 hover:text-destructive focus-visible:ring-destructive/70 h-9 w-9 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none'
              onClick={(e) => {
                e.stopPropagation()
                onDelete(todo.id)
              }}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className='border-border/65 border-t px-4 pt-2 pb-3 sm:px-5'>
          <Suspense
            fallback={<div className='text-muted-foreground py-2 text-xs'>加载子任务中...</div>}
          >
            <LazySubtaskList todoId={todo.id} subtasks={subtasks} />
          </Suspense>
        </div>
      )}
    </article>
  )
}
