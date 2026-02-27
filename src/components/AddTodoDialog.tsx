import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Plus,
  Sparkles,
  Calendar as CalendarIcon,
  BellRing,
  Paperclip,
  Loader2,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'

import type { CreateTodoInput, TodoAttachmentInput } from '@/data/todos'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { getTags, createTag } from '@/data/tags'
import { generateTodoAttachmentUploadUrl } from '@/data/todos'
import { TODO_REMINDER_OPTIONS } from '@/lib/todo-reminder'
import { cn } from '@/lib/utils'

import { TagSelector } from './TagSelector'

interface AddTodoDialogProps {
  onAdd: (todo: CreateTodoInput) => void
  trigger?: React.ReactNode
}

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function AddTodoDialog({ onAdd, trigger }: AddTodoDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [important, setImportant] = useState(false)
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  })

  const queryClient = useQueryClient()

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  const uploadAttachment = async (file: File): Promise<TodoAttachmentInput> => {
    const uploadUrl = await generateTodoAttachmentUploadUrl()
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error('上传失败')
    }

    const payload = (await response.json()) as { storageId?: string }
    if (!payload.storageId) {
      throw new Error('上传响应无效')
    }

    return {
      storage_id: payload.storageId,
      name: file.name,
      content_type: file.type || null,
      size: file.size,
    }
  }

  const handleSelectAttachments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (selectedFiles.length === 0) {
      return
    }

    setAttachmentError(null)

    const remainingSlots = MAX_ATTACHMENTS - pendingAttachments.length
    if (remainingSlots <= 0) {
      setAttachmentError(`最多可添加 ${MAX_ATTACHMENTS} 个附件`)
      return
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots)
    if (filesToAdd.length < selectedFiles.length) {
      setAttachmentError(`最多可添加 ${MAX_ATTACHMENTS} 个附件`)
    }

    const oversized = filesToAdd.find((file) => file.size > MAX_ATTACHMENT_SIZE)
    if (oversized) {
      setAttachmentError(`文件“${oversized.name}”超过 10MB 限制`)
      return
    }

    setPendingAttachments((prev) => [...prev, ...filesToAdd])
  }

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isUploadingAttachments) return

    setIsSubmitting(true)
    setAttachmentError(null)

    let uploadedAttachments: TodoAttachmentInput[] = []
    if (pendingAttachments.length > 0) {
      setIsUploadingAttachments(true)
      try {
        uploadedAttachments = await Promise.all(pendingAttachments.map(uploadAttachment))
      } catch {
        setAttachmentError('附件上传失败，请稍后重试')
        setIsSubmitting(false)
        setIsUploadingAttachments(false)
        return
      }
      setIsUploadingAttachments(false)
    }

    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate ? dueDate.toISOString() : undefined,
      important,
      reminder_minutes_before: dueDate ? reminderMinutesBefore : null,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      tagIds: selectedTagIds,
    })

    setTitle('')
    setDescription('')
    setDueDate(undefined)
    setImportant(false)
    setReminderMinutesBefore(null)
    setSelectedTagIds([])
    setPendingAttachments([])
    setAttachmentError(null)
    setIsSubmitting(false)
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTitle('')
      setDescription('')
      setDueDate(undefined)
      setImportant(false)
      setReminderMinutesBefore(null)
      setSelectedTagIds([])
      setPendingAttachments([])
      setAttachmentError(null)
      setCalendarOpen(false)
      setIsUploadingAttachments(false)
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
      {trigger ? (
        <DialogTrigger render={<>{trigger}</>} />
      ) : (
        <DialogTrigger
          render={
            <Button className='from-primary to-secondary shadow-elevation-2 hover:shadow-elevation-3 h-11 gap-2 rounded-2xl bg-linear-to-r px-6 transition-all hover:opacity-90'>
              <Plus className='h-4 w-4' />
              <span className='font-semibold'>添加任务</span>
            </Button>
          }
        />
      )}
      <DialogContent className='shadow-elevation-4 data-open:slide-in-from-right-full data-closed:slide-out-to-right-full data-open:zoom-in-100 data-closed:zoom-out-100 fixed top-0 right-0 left-auto z-50 flex h-dvh w-full max-w-3xl translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-l p-0 sm:rounded-l-3xl sm:rounded-r-none lg:max-w-208'>
        <DialogHeader className='from-muted/60 border-b bg-linear-to-br to-transparent p-6 pb-4'>
          <div className='flex items-center gap-3'>
            <div className='from-primary to-secondary shadow-elevation-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br'>
              <Sparkles className='h-5 w-5 text-white' />
            </div>
            <DialogTitle className='text-xl font-bold'>新建任务</DialogTitle>
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

            <div className='space-y-3'>
              <Label className='text-foreground flex items-center gap-2 text-sm font-semibold'>
                <Paperclip className='text-muted-foreground h-4 w-4' />
                附件 <span className='text-muted-foreground font-normal'>（可选）</span>
              </Label>

              <input
                ref={attachmentInputRef}
                type='file'
                multiple
                className='hidden'
                onChange={handleSelectAttachments}
              />

              <Button
                type='button'
                variant='outline'
                onClick={() => attachmentInputRef.current?.click()}
                className='h-10 rounded-xl px-4'
                disabled={pendingAttachments.length >= MAX_ATTACHMENTS || isUploadingAttachments}
              >
                <Paperclip className='mr-2 h-4 w-4' />
                添加附件
              </Button>

              {attachmentError && <p className='text-destructive text-xs'>{attachmentError}</p>}

              {pendingAttachments.length > 0 && (
                <div className='space-y-2'>
                  {pendingAttachments.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className='border-border/70 bg-card/60 flex items-center justify-between rounded-xl border px-3 py-2'
                    >
                      <div className='min-w-0'>
                        <p className='text-foreground truncate text-sm font-medium'>{file.name}</p>
                        <p className='text-muted-foreground text-xs'>{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        aria-label={`移除附件 ${file.name}`}
                        className='text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg'
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
              disabled={!title.trim() || isSubmitting || isUploadingAttachments}
              className='from-primary to-secondary shadow-elevation-2 h-11 rounded-2xl bg-linear-to-r px-8 font-semibold transition-all hover:opacity-90 disabled:opacity-50'
            >
              {(isSubmitting || isUploadingAttachments) && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              {isUploadingAttachments ? '上传附件中...' : isSubmitting ? '添加中...' : '添加任务'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
