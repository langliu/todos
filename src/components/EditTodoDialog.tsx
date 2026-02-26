import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Sparkles, Calendar as CalendarIcon, BellRing } from 'lucide-react'
import { useState, useEffect } from 'react'

import type { Todo } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { getTags, createTag, getTodoTags } from '@/data/tags'
import { TODO_REMINDER_OPTIONS } from '@/lib/todo-reminder'
import { cn } from '@/lib/utils'

import { TagSelector } from './TagSelector'

interface EditTodoDialogProps {
  todo: Todo
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (
    id: string,
    data: Partial<Omit<Todo, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
      tagIds?: string[]
    },
  ) => void
}

export function EditTodoDialog({ todo, open, onOpenChange, onUpdate }: EditTodoDialogProps) {
  const [title, setTitle] = useState(todo.title)
  const [description, setDescription] = useState(todo.description || '')
  const [dueDate, setDueDate] = useState<Date | undefined>(
    todo.due_date ? new Date(todo.due_date) : undefined,
  )
  const [important, setImportant] = useState(todo.important)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(
    todo.reminder_minutes_before,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  })

  const { data: todoTags = [] } = useQuery({
    queryKey: ['todoTags', todo.id],
    queryFn: () => getTodoTags({ data: { todoId: todo.id } }),
    enabled: open,
  })

  const queryClient = useQueryClient()

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  useEffect(() => {
    if (open) {
      setTitle(todo.title)
      setDescription(todo.description || '')
      setDueDate(todo.due_date ? new Date(todo.due_date) : undefined)
      setImportant(todo.important)
      setReminderMinutesBefore(todo.reminder_minutes_before)
    }
  }, [open, todo])

  useEffect(() => {
    setSelectedTagIds(todoTags.map((tag) => tag.id))
  }, [todoTags])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)

    onUpdate(todo.id, {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate ? dueDate.toISOString() : null,
      important,
      reminder_minutes_before: dueDate ? reminderMinutesBefore : null,
      tagIds: selectedTagIds,
    })

    setIsSubmitting(false)
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen)
      setCalendarOpen(false)
    }
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    )
  }

  const handleCreateTag = (name: string, color: string) => {
    createTagMutation.mutate(
      { data: { name, color } },
      {
        onSuccess: (tag) => {
          setSelectedTagIds((prev) => [...prev, tag.id])
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='shadow-elevation-4 data-open:slide-in-from-right-full data-closed:slide-out-to-right-full data-open:zoom-in-100 data-closed:zoom-out-100 fixed top-0 right-0 left-auto z-50 flex h-dvh w-full max-w-3xl translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-l p-0 sm:rounded-l-3xl sm:rounded-r-none lg:max-w-208'>
        <DialogHeader className='from-muted/60 border-b bg-linear-to-br to-transparent p-6 pb-4'>
          <div className='flex items-center gap-3'>
            <div className='from-primary to-secondary shadow-elevation-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br'>
              <Sparkles className='h-5 w-5 text-white' />
            </div>
            <DialogTitle className='text-xl font-bold'>编辑任务</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col'>
          <div className='min-h-0 flex-1 space-y-5 overflow-y-auto p-6'>
            <div className='space-y-2'>
              <Label htmlFor='title' className='text-foreground text-sm font-semibold'>
                任务标题 <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='title'
                placeholder='输入任务标题...'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='border-border bg-card shadow-elevation-1 focus:border-primary/30 focus:bg-background h-12 rounded-2xl border-2 px-4 text-base transition-all'
                autoFocus
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description' className='text-foreground text-sm font-semibold'>
                描述 <span className='text-muted-foreground font-normal'>（可选）</span>
              </Label>
              <Textarea
                id='description'
                placeholder='添加任务描述...'
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                className='border-border bg-card shadow-elevation-1 focus:border-primary/30 focus:bg-background min-h-25 resize-none rounded-2xl border-2 px-4 py-3 transition-all'
              />
            </div>

            <div className='space-y-2'>
              <Label
                htmlFor='dueDate'
                className='text-foreground flex items-center gap-2 text-sm font-semibold'
              >
                <CalendarIcon className='text-muted-foreground h-4 w-4' />
                截止日期 <span className='text-muted-foreground font-normal'>（可选）</span>
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      id='dueDate'
                      type='button'
                      variant='outline'
                      className={cn(
                        'border-border bg-card shadow-elevation-1 hover:bg-muted/40 focus:border-primary/30 h-12 w-full justify-start rounded-2xl border-2 px-4 text-left font-normal transition-all',
                        !dueDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className='mr-3 h-4 w-4' />
                      {dueDate ? format(dueDate, 'yyyy年M月d日', { locale: zhCN }) : '选择日期'}
                    </Button>
                  }
                />
                <PopoverContent
                  className='shadow-elevation-3 w-full min-w-[320px] rounded-2xl p-3'
                  align='start'
                >
                  <div className='w-full'>
                    <Calendar
                      mode='single'
                      locale={zhCN}
                      selected={dueDate}
                      onSelect={(date) => {
                        setDueDate(date)
                        setCalendarOpen(false)
                      }}
                      initialFocus
                      className='w-full rounded-2xl'
                    />
                    <div className='mt-3 flex justify-end'>
                      <Button
                        type='button'
                        variant='ghost'
                        className='h-8 rounded-lg px-3 text-xs'
                        onClick={() => {
                          setDueDate(undefined)
                          setReminderMinutesBefore(null)
                          setCalendarOpen(false)
                        }}
                      >
                        清除日期
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className='space-y-2'>
              <Label className='text-foreground flex items-center gap-2 text-sm font-semibold'>
                <BellRing className='text-muted-foreground h-4 w-4' />
                提醒时间 <span className='text-muted-foreground font-normal'>（可选）</span>
              </Label>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {TODO_REMINDER_OPTIONS.map((option) => {
                  const isActive = reminderMinutesBefore === option.value
                  const disabled = !dueDate && option.value !== null
                  return (
                    <button
                      key={option.label}
                      type='button'
                      disabled={disabled}
                      onClick={() => setReminderMinutesBefore(option.value)}
                      className={cn(
                        'border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-primary focus-visible:ring-primary/60 h-10 rounded-xl border text-xs font-medium transition-all focus-visible:ring-2 focus-visible:outline-none',
                        isActive && 'border-primary/45 bg-primary/15 text-primary',
                        disabled && 'cursor-not-allowed opacity-45',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              {!dueDate && <p className='text-muted-foreground text-xs'>请先选择截止日期</p>}
            </div>

            <div className='bg-muted/60 flex items-center gap-3 rounded-2xl p-4'>
              <button
                type='button'
                onClick={() => setImportant(!important)}
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                  important
                    ? 'shadow-elevation-1 border-yellow-500 bg-yellow-500'
                    : 'border-muted-foreground/30 hover:border-yellow-500',
                )}
              >
                {important && (
                  <svg className='h-3.5 w-3.5 text-white' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                )}
              </button>
              <Label
                htmlFor='important'
                className='flex-1 cursor-pointer text-sm font-medium'
                onClick={() => setImportant(!important)}
              >
                标记为重要
              </Label>
            </div>

            <TagSelector
              tags={tags}
              selectedTagIds={selectedTagIds}
              onToggleTag={handleToggleTag}
              onCreateTag={handleCreateTag}
            />
          </div>

          <DialogFooter className='border-border bg-background gap-3 border-t px-6 py-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              className='h-11 rounded-2xl px-6 font-medium'
            >
              取消
            </Button>
            <Button
              type='submit'
              disabled={!title.trim() || isSubmitting}
              className='from-primary to-secondary shadow-elevation-2 h-11 rounded-2xl bg-linear-to-r px-8 font-semibold transition-all hover:opacity-90 disabled:opacity-50'
            >
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
