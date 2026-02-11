import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Card, CardContent } from '@/components/ui/card'
import { getTagsWithCounts, createTag, updateTag, deleteTag } from '@/data/tags.server'
import type { Tag } from '@/lib/supabase'
import { ArrowLeft, Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react'
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
    <div className='min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 md:p-8'>
      <div className='max-w-4xl mx-auto pt-4 md:pt-8'>
        <div className='flex items-center justify-between mb-8'>
          <div className='flex items-center gap-4'>
            <Link
              to='/'
              aria-label='返回首页'
              className='h-10 w-10 rounded-xl hover:bg-accent/50 transition-colors inline-flex items-center justify-center'
            >
              <ArrowLeft className='h-5 w-5' />
            </Link>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-elevation-2'>
                <TagIcon className='h-6 w-6 text-white' />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-foreground tracking-tight'>标签管理</h1>
                <p className='text-sm text-muted-foreground'>管理您的任务标签</p>
              </div>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger
              render={
                <Button className='gap-2 h-11 px-6 rounded-2xl'>
                  <Plus className='h-4 w-4' />
                  <span className='font-semibold'>创建标签</span>
                </Button>
              }
            />
            <DialogContent className='sm:max-w-md rounded-3xl p-0 overflow-hidden'>
              <DialogHeader className='p-6 pb-4 border-b'>
                <DialogTitle className='text-xl font-bold'>创建新标签</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateTag} className='p-6 space-y-5'>
                <div className='space-y-2'>
                  <Label htmlFor='tagName' className='text-sm font-medium'>
                    标签名称 <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='tagName'
                    placeholder='输入标签名称...'
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className='h-11 px-4 text-base rounded-2xl'
                    autoFocus
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='text-sm font-medium'>选择颜色</Label>
                  <div className='flex gap-2 flex-wrap'>
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type='button'
                        onClick={() => setNewTagColor(color)}
                        className={cn(
                          'w-8 h-8 rounded-full transition-all',
                          newTagColor === color
                            ? 'ring-2 ring-offset-2 ring-ring scale-110'
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
                    className='w-full h-11 rounded-2xl font-semibold'
                  >
                    {isCreating ? '创建中...' : '创建标签'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {tags.length === 0 ? (
          <Card className='border-2 border-border/60 shadow-elevation-2 overflow-hidden'>
            <CardContent className='p-12 text-center'>
              <div className='inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-muted to-muted/60 mb-6 shadow-elevation-1'>
                <TagIcon className='h-10 w-10 text-muted-foreground' />
              </div>
              <h3 className='text-xl font-semibold text-foreground mb-2'>还没有标签</h3>
              <p className='text-muted-foreground mb-8'>创建第一个标签来开始组织您的任务</p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className='gap-2 h-11 px-6 rounded-2xl'
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
                className='border-2 border-border/60 shadow-elevation-2 overflow-hidden hover:border-border transition-all'
              >
                <CardContent className='p-5'>
                  <div className='flex items-center gap-4'>
                    <div
                      className='w-12 h-12 rounded-xl flex items-center justify-center shadow-elevation-1'
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      <TagIcon className='h-6 w-6' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3
                        className='font-semibold text-foreground truncate'
                        style={{ color: tag.color }}
                      >
                        {tag.name}
                      </h3>
                      <p className='text-sm text-muted-foreground mt-0.5'>
                        {tag.todo_count} 个任务
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => openEditDialog(tag)}
                        className='h-9 w-9 rounded-xl hover:bg-primary/10'
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDeleteTag(tag.id)}
                        className='h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive'
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
          <DialogContent className='sm:max-w-md rounded-3xl p-0 overflow-hidden'>
            <DialogHeader className='p-6 pb-4 border-b'>
              <DialogTitle className='text-xl font-bold'>编辑标签</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleEditTag} className='p-6 space-y-5'>
              <div className='space-y-2'>
                <Label htmlFor='editTagName' className='text-sm font-medium'>
                  标签名称 <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='editTagName'
                  placeholder='输入标签名称...'
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  className='h-11 px-4 text-base rounded-2xl'
                  autoFocus
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-sm font-medium'>选择颜色</Label>
                <div className='flex gap-2 flex-wrap'>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type='button'
                      onClick={() => setEditTagColor(color)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        editTagColor === color
                          ? 'ring-2 ring-offset-2 ring-ring scale-110'
                          : 'hover:scale-110',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className='pt-2 flex gap-3'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsEditDialogOpen(false)}
                  className='flex-1 h-11 rounded-2xl font-medium'
                >
                  取消
                </Button>
                <Button
                  type='submit'
                  disabled={!editTagName.trim() || isEditing}
                  className='flex-1 h-11 rounded-2xl font-semibold'
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
              <AlertDialogCancel className='h-11 px-6 rounded-2xl font-medium'>
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTag}
                className='h-11 px-6 rounded-2xl font-semibold bg-destructive hover:bg-destructive/90'
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
