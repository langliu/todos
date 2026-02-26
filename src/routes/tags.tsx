import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react'
import { useState } from 'react'

import type { Tag } from '@/lib/types'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTagsWithCounts, createTag, updateTag, deleteTag } from '@/data/tags'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/tags')({
  component: TagsPage,
})

const PRESET_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

function TagsPage() {
  const { data: tags = [] } = useQuery({
    queryKey: ['tags-with-counts'],
    queryFn: getTagsWithCounts,
  })
  const queryClient = useQueryClient()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<(Tag & { todo_count: number }) | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<string | null>(null)

  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)

  const [editTagName, setEditTagName] = useState('')
  const [editTagColor, setEditTagColor] = useState(PRESET_COLORS[0])
  const [isEditing, setIsEditing] = useState(false)

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setNewTagName('')
      setNewTagColor(PRESET_COLORS[0])
      setIsCreateDialogOpen(false)
    },
  })

  const updateTagMutation = useMutation({
    mutationFn: updateTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setIsEditDialogOpen(false)
      setEditingTag(null)
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['todoTags'] })
    },
  })

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setIsCreating(true)
    createTagMutation.mutate(
      { data: { name: newTagName.trim(), color: newTagColor } },
      {
        onSettled: () => setIsCreating(false),
      },
    )
  }

  const handleEditTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTag || !editTagName.trim()) return

    setIsEditing(true)
    updateTagMutation.mutate(
      { data: { id: editingTag.id, data: { name: editTagName.trim(), color: editTagColor } } },
      {
        onSettled: () => setIsEditing(false),
      },
    )
  }

  const openEditDialog = (tag: Tag & { todo_count: number }) => {
    setEditingTag(tag)
    setEditTagName(tag.name)
    setEditTagColor(tag.color)
    setIsEditDialogOpen(true)
  }

  const handleDeleteTag = (tagId: string) => {
    setTagToDelete(tagId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTag = () => {
    if (tagToDelete) {
      deleteTagMutation.mutate({ data: { id: tagToDelete } })
      setDeleteDialogOpen(false)
      setTagToDelete(null)
    }
  }

  return (
    <div className='from-background to-muted/30 min-h-screen bg-linear-to-br p-4 md:p-8'>
      <div className='mx-auto max-w-4xl pt-4 md:pt-8'>
        <div className='mb-8 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link
              to='/'
              aria-label='返回首页'
              className='hover:bg-accent/50 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors'
            >
              <ArrowLeft className='h-5 w-5' />
            </Link>
            <div className='flex items-center gap-3'>
              <div className='from-primary to-secondary shadow-elevation-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br'>
                <TagIcon className='h-6 w-6 text-white' />
              </div>
              <div>
                <h1 className='text-foreground text-2xl font-bold tracking-tight'>标签管理</h1>
                <p className='text-muted-foreground text-sm'>管理您的任务标签</p>
              </div>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger
              render={
                <Button className='h-11 gap-2 rounded-2xl px-6'>
                  <Plus className='h-4 w-4' />
                  <span className='font-semibold'>创建标签</span>
                </Button>
              }
            />
            <DialogContent className='overflow-hidden rounded-3xl p-0 sm:max-w-md'>
              <DialogHeader className='border-b p-6 pb-4'>
                <DialogTitle className='text-xl font-bold'>创建新标签</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateTag} className='space-y-5 p-6'>
                <div className='space-y-2'>
                  <Label htmlFor='tagName' className='text-sm font-medium'>
                    标签名称 <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='tagName'
                    placeholder='输入标签名称...'
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className='h-11 rounded-2xl px-4 text-base'
                    autoFocus
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-sm font-medium'>选择颜色</Label>
                  <div className='flex flex-wrap gap-2'>
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type='button'
                        onClick={() => setNewTagColor(color)}
                        className={cn(
                          'h-8 w-8 rounded-full transition-all',
                          newTagColor === color
                            ? 'ring-ring scale-110 ring-2 ring-offset-2'
                            : 'hover:scale-110',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className='pt-2'>
                  <Button
                    type='submit'
                    disabled={!newTagName.trim() || isCreating}
                    className='h-11 w-full rounded-2xl font-semibold'
                  >
                    {isCreating ? '创建中...' : '创建标签'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {tags.length === 0 ? (
          <Card className='border-border/60 shadow-elevation-2 overflow-hidden border-2'>
            <CardContent className='p-12 text-center'>
              <div className='from-muted to-muted/60 shadow-elevation-1 mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br'>
                <TagIcon className='text-muted-foreground h-10 w-10' />
              </div>
              <h3 className='text-foreground mb-2 text-xl font-semibold'>还没有标签</h3>
              <p className='text-muted-foreground mb-8'>创建第一个标签来开始组织您的任务</p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className='h-11 gap-2 rounded-2xl px-6'
              >
                <Plus className='h-4 w-4' />
                创建第一个标签
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-4'>
            {tags.map((tag: Tag & { todo_count: number }) => (
              <Card
                key={tag.id}
                className='border-border/60 shadow-elevation-2 hover:border-border overflow-hidden border-2 transition-all'
              >
                <CardContent className='p-5'>
                  <div className='flex items-center gap-4'>
                    <div
                      className='shadow-elevation-1 flex h-12 w-12 items-center justify-center rounded-xl'
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      <TagIcon className='h-6 w-6' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <h3
                        className='text-foreground truncate font-semibold'
                        style={{ color: tag.color }}
                      >
                        {tag.name}
                      </h3>
                      <p className='text-muted-foreground mt-0.5 text-sm'>
                        {tag.todo_count} 个任务
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => openEditDialog(tag)}
                        className='hover:bg-primary/10 h-9 w-9 rounded-xl'
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDeleteTag(tag.id)}
                        className='hover:bg-destructive/10 hover:text-destructive h-9 w-9 rounded-xl'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className='overflow-hidden rounded-3xl p-0 sm:max-w-md'>
            <DialogHeader className='border-b p-6 pb-4'>
              <DialogTitle className='text-xl font-bold'>编辑标签</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleEditTag} className='space-y-5 p-6'>
              <div className='space-y-2'>
                <Label htmlFor='editTagName' className='text-sm font-medium'>
                  标签名称 <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='editTagName'
                  placeholder='输入标签名称...'
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  className='h-11 rounded-2xl px-4 text-base'
                  autoFocus
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-sm font-medium'>选择颜色</Label>
                <div className='flex flex-wrap gap-2'>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type='button'
                      onClick={() => setEditTagColor(color)}
                      className={cn(
                        'h-8 w-8 rounded-full transition-all',
                        editTagColor === color
                          ? 'ring-ring scale-110 ring-2 ring-offset-2'
                          : 'hover:scale-110',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className='flex gap-3 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsEditDialogOpen(false)}
                  className='h-11 flex-1 rounded-2xl font-medium'
                >
                  取消
                </Button>
                <Button
                  type='submit'
                  disabled={!editTagName.trim() || isEditing}
                  className='h-11 flex-1 rounded-2xl font-semibold'
                >
                  {isEditing ? '保存中...' : '保存'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className='rounded-3xl'>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-xl font-bold'>删除标签</AlertDialogTitle>
              <AlertDialogDescription className='text-base'>
                确定要删除这个标签吗？这将同时删除所有与该标签关联的任务标签。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className='gap-3 pt-2'>
              <AlertDialogCancel className='h-11 rounded-2xl px-6 font-medium'>
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTag}
                className='bg-destructive hover:bg-destructive/90 h-11 rounded-2xl px-6 font-semibold'
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
