import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Sparkles, Calendar as CalendarIcon } from 'lucide-react'
import type { Todo } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface EditTodoDialogProps {
  todo: Todo
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (
    id: string,
    data: Partial<Omit<Todo, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
  ) => void
}

export function EditTodoDialog({ todo, open, onOpenChange, onUpdate }: EditTodoDialogProps) {
  const [title, setTitle] = useState(todo.title)
  const [description, setDescription] = useState(todo.description || '')
  const [dueDate, setDueDate] = useState<Date | undefined>(
    todo.due_date ? new Date(todo.due_date) : undefined,
  )
  const [important, setImportant] = useState(todo.important)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(todo.title)
      setDescription(todo.description || '')
      setDueDate(todo.due_date ? new Date(todo.due_date) : undefined)
      setImportant(todo.important)
    }
  }, [open, todo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)

    onUpdate(todo.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate ? dueDate.toISOString() : null,
      important,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-125 rounded-3xl p-0 overflow-hidden shadow-elevation-4'>
        <DialogHeader className='p-6 pb-4 border-b bg-linear-to-br from-muted/60 to-transparent'>
          <div className='flex items-center gap-3'>
            <div className='w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-secondary flex items-center justify-center shadow-elevation-2'>
              <Sparkles className='h-5 w-5 text-white' />
            </div>
            <DialogTitle className='text-xl font-bold'>编辑任务</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='p-6 space-y-5'>
          <div className='space-y-2'>
            <Label htmlFor='title' className='text-sm font-semibold text-foreground'>
              任务标题 <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='title'
              placeholder='输入任务标题...'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='h-12 px-4 text-base rounded-2xl border-2 border-border bg-card shadow-elevation-1 focus:border-primary/30 focus:bg-background transition-all'
              autoFocus
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description' className='text-sm font-semibold text-foreground'>
              描述 <span className='text-muted-foreground font-normal'>（可选）</span>
            </Label>
            <Textarea
              id='description'
              placeholder='添加任务描述...'
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              className='min-h-25 px-4 py-3 rounded-2xl border-2 border-border bg-card shadow-elevation-1 focus:border-primary/30 focus:bg-background transition-all resize-none'
            />
          </div>

          <div className='space-y-2'>
            <Label
              htmlFor='dueDate'
              className='text-sm font-semibold text-foreground flex items-center gap-2'
            >
              <CalendarIcon className='h-4 w-4 text-muted-foreground' />
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
                      'w-full h-12 px-4 rounded-2xl border-2 border-border bg-card shadow-elevation-1 justify-start text-left font-normal hover:bg-muted/40 focus:border-primary/30 transition-all',
                      !dueDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className='mr-3 h-4 w-4' />
                    {dueDate ? format(dueDate, 'yyyy年M月d日', { locale: zhCN }) : '选择日期'}
                  </Button>
                }
              />
              <PopoverContent
                className='w-full min-w-[320px] p-3 rounded-2xl shadow-elevation-3'
                align='start'
              >
                <div className='w-full'>
                  <Calendar
                    mode='single'
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date)
                      setCalendarOpen(false)
                    }}
                    initialFocus
                    className='rounded-2xl w-full'
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className='flex items-center gap-3 p-4 rounded-2xl bg-muted/60'>
            <button
              type='button'
              onClick={() => setImportant(!important)}
              className={cn(
                'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                important
                  ? 'bg-yellow-500 border-yellow-500 shadow-elevation-1'
                  : 'border-muted-foreground/30 hover:border-yellow-500',
              )}
            >
              {important && (
                <svg className='w-3.5 h-3.5 text-white' fill='currentColor' viewBox='0 0 20 20'>
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
              className='text-sm font-medium cursor-pointer flex-1'
              onClick={() => setImportant(!important)}
            >
              标记为重要
            </Label>
          </div>

          <DialogFooter className='gap-3 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              className='h-11 px-6 rounded-2xl font-medium'
            >
              取消
            </Button>
            <Button
              type='submit'
              disabled={!title.trim() || isSubmitting}
              className='h-11 px-8 rounded-2xl bg-linear-to-r from-primary to-secondary hover:opacity-90 transition-all shadow-elevation-2 disabled:opacity-50 font-semibold'
            >
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
